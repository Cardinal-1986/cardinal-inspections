#!/usr/bin/env python3
"""
Pull Cardinal's AccuLynx client base down to local disk, ready for the push.

WHY THIS EXISTS
    Cardinal is leaving AccuLynx. The app already imports AccuLynx clients one
    at a time by photographing the screen (cr-ci-script, build 252); this is
    the bulk version of the same thing: every job, its contacts, its stage
    history, its insurance block and — if the API allows it — its documents
    and photographs, written to a local folder that push_acculynx.py then
    loads into Cardinal's Supabase.

    Fetch and push are SEPARATE ON PURPOSE. This script holds the AccuLynx
    key and never sees a Cardinal credential; the push holds the Cardinal
    login and never sees the AccuLynx key. Each output file is inspectable
    before anything touches production.

THE THREE TRAPS THIS CODE IS SHAPED AROUND (all live-verified elsewhere)
    1. The default /jobs listing EXCLUDES unassigned jobs and dead leads.
       Every milestone is swept twice — default and assignment=unassigned —
       and the results unioned by job id. Skipping this silently under-counts
       the client base, which is the worst possible failure for an export.
    2. /jobs pages by RECORD OFFSET (recordStartIndex). Other endpoints page
       by page number. This script only pages /jobs, asserts forward progress
       on every page, and dies loudly if a page ever repeats.
    3. Contact emails/phones come back as {id,_link} REFS unless you ask for
       ?includes=emailAddress,phoneNumber. Asked for, always.

FILES ARE PROBE-DEPENDENT
    AccuLynx's public docs show upload-only file endpoints. This script tries
    the same candidate read routes the probe does, uses whichever answered,
    and if none did, says so and moves on — the records export is complete
    either way. Only images (jpeg/png/webp/heic/heif) and PDFs are kept,
    because Cardinal's storage bucket accepts exactly those; everything else
    is listed in skipped_files.jsonl instead of silently dropped.

USAGE
    export ACCULYNX_API_KEY='...'      # never commit this, never paste in chat
    python3 fetch_acculynx.py --dest /data/cardinal/acculynx

    # smoke test first — a handful of jobs, look at what actually lands
    python3 fetch_acculynx.py --dest /data/cardinal/acculynx --limit 5

    Resumable: jobs.jsonl is the record of what is already done. Re-run the
    same command after any interruption; enriched jobs are skipped, files
    already on disk are skipped. Ctrl-C costs nothing.

    --milestones lead,prospect,...   which milestones to export. The default
                                     omits cancelled and dead (Theo's call,
                                     11 Aug). Adding dead sweeps it with
                                     assignment=unassigned, as the API needs.
    --no-files                       records only, skip file discovery
    --limit N                        stop after N newly-enriched jobs

Standard library only. Nothing to install.
"""

import argparse, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://api.acculynx.com/api/v2'
UA = 'cardinal-migration-fetch/1.0'
PAGE_SIZE = 100
# 10 req/s per key is the stated limit; ~8/s is the pace a production
# integration settled on after living with 429s.
PACE_S = 0.13
MAX_FILE_BYTES = 25 * 1024 * 1024        # the photos bucket's own cap (25 MiB)

DEFAULT_MILESTONES = 'lead,prospect,approved,completed,invoiced,closed'

# What Cardinal's storage bucket accepts (photos_bucket_pdf.sql): images + PDF.
PHOTO_MIMES = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
               'image/heic': '.heic', 'image/heif': '.heif'}
DOC_MIMES = {'application/pdf': '.pdf'}

FILE_ROUTES = ['/documents', '/photos', '/photos-videos', '/files',
               '/attachments', '/media']

_last_call = [0.0]


def die(msg, code=1):
    print('ERROR: ' + msg, file=sys.stderr)
    sys.exit(code)


def scrub(text, key):
    """Never let the API key reach a log line."""
    return text.replace(key, '***') if key and key in text else text


def throttle():
    wait = PACE_S - (time.time() - _last_call[0])
    if wait > 0:
        time.sleep(wait)
    _last_call[0] = time.time()


def get(path, key, params=None, tries=5, optional=False):
    """GET with the fatal-vs-transient split fetch_companycam.py uses.

    optional=True is for per-job sub-resources: 204/404/405 mean 'this job has
    no such thing' and return None instead of dying. 401 is always fatal (dead
    key). A 403 on a sub-resource is returned as None too — some surfaces are
    tier-gated per endpoint — but counted by the caller, which dies if EVERY
    call comes back 403 (that is a plan problem, not a data shape)."""
    url = API + path
    if params:
        url += '?' + urllib.parse.urlencode(params)
    delay = 2.0
    for attempt in range(tries):
        throttle()
        req = urllib.request.Request(url, headers={
            'Authorization': 'Bearer ' + key,
            'Accept': 'application/json',
            'User-Agent': UA,
        })
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read().decode('utf-8', 'replace')
                if r.status == 204 or not raw.strip():
                    return None
                try:
                    return json.loads(raw)
                except Exception:
                    return None if optional else die('unparseable body on %s' % path)
        except urllib.error.HTTPError as e:
            body = ''
            try:
                body = e.read().decode('utf-8', 'replace')[:300]
            except Exception:
                pass
            if e.code == 401:
                die('AccuLynx refused the key (401). %s' % scrub(body, key))
            if optional and e.code in (204, 403, 404, 405, 410):
                return ('__403__' if e.code == 403 else None)
            if e.code == 403:
                die('AccuLynx answered 403 on %s — API access may not be enabled '
                    'on this plan. %s' % (path, scrub(body, key)))
            if e.code not in (429, 500, 502, 503, 504) or attempt == tries - 1:
                if optional:
                    return None
                die('HTTP %d on %s — %s' % (e.code, path, scrub(body, key)))
        except Exception as e:
            if attempt == tries - 1:
                if optional:
                    return None
                die('network failure on %s — %s' % (path, scrub(str(e), key)))
        time.sleep(delay)
        delay *= 2
    return None


def items_of(body):
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        for k in ('items', 'data', 'results'):
            if isinstance(body.get(k), list):
                return body[k]
    return []


def count_of(body):
    if isinstance(body, dict):
        for k in ('count', 'total', 'totalCount'):
            if isinstance(body.get(k), int):
                return body[k]
    return None


def pick(d, *names, **kw):
    default = kw.get('default')
    if not isinstance(d, dict):
        return default
    for n in names:
        v = d.get(n)
        if v not in (None, ''):
            return v
    return default


def jid(job):
    v = pick(job, 'id', 'jobId', 'jobID')
    return str(v) if v else None


SAFE_RE = re.compile(r'[^\w.\-]+')


def safe_name(s, cap=80):
    return (SAFE_RE.sub('_', s or '').strip('_')[:cap] or 'file')


def list_job_ids(key, milestones):
    """Union of every requested milestone across BOTH assignment sweeps.
    Returns {job_id: listing_object}. Dies if a page ever repeats — that is
    the pagination-unit trap and grinding on would loop forever."""
    seen = {}
    for m in milestones:
        sweeps = [None, 'unassigned']
        # The API's own note: dead leads only come back when unassigned.
        if m == 'dead':
            sweeps = ['unassigned']
        for assignment in sweeps:
            start, prev_first = 0, None
            while True:
                params = {'pageSize': PAGE_SIZE, 'milestones': m,
                          'recordStartIndex': start}
                if assignment:
                    params['assignment'] = assignment
                body = get('/jobs', key, params)
                got = items_of(body)
                if not got:
                    break
                first = jid(got[0])
                if first is not None and first == prev_first:
                    die('pagination is not progressing on /jobs (milestone %s, '
                        'start %d) — the recordStartIndex unit assumption is '
                        'wrong for this account. Stop and re-probe.' % (m, start))
                prev_first = first
                for j in got:
                    i = jid(j)
                    if i:
                        seen.setdefault(i, j)
                start += len(got)
                total = count_of(body)
                if total is not None and start >= total:
                    break
        print('  %-10s → running union %d' % (m, len(seen)))
    return seen


def enrich(key, job_id, f403):
    """Every sub-resource for one job, raw. None where the job has none."""
    def opt(path, params=None):
        r = get(path, key, params, optional=True)
        if r == '__403__':
            f403[0] += 1
            return None
        f403[1] += 1
        return r

    contacts = []
    jc = opt('/jobs/%s/contacts' % job_id)
    for item in items_of(jc):
        c = item.get('contact') if isinstance(item.get('contact'), dict) else item
        cid = pick(c, 'id', 'contactId')
        detail = None
        if cid:
            # Without includes, emails/phones come back as {id,_link} refs.
            detail = opt('/contacts/%s' % cid,
                         {'includes': 'emailAddress,phoneNumber'})
        contacts.append({'link': item, 'detail': detail})

    return {
        'detail': opt('/jobs/%s' % job_id, {'includes': 'contact'}),
        'contacts': contacts,
        'milestone_history': items_of(opt('/jobs/%s/milestone-history' % job_id)),
        'representatives': items_of(opt('/jobs/%s/representatives' % job_id)),
        'sales_owner': opt('/jobs/%s/representatives/sales-owner' % job_id),
        'insurance': opt('/jobs/%s/insurance' % job_id),
        'adjuster': opt('/jobs/%s/adjuster' % job_id),
        'custom_fields': items_of(opt('/jobs/%s/custom-fields' % job_id)),
    }


def discover_file_routes(key, sample_ids):
    """Which of the candidate read routes answer 200 on this account.
    Probes up to 3 jobs so one job with zero files can't hide a working route."""
    live = []
    for pid in sample_ids[:3]:
        for route in FILE_ROUTES:
            if route in live:
                continue
            r = get('/jobs/%s%s' % (pid, route), key, {'pageSize': 5}, optional=True)
            if isinstance(r, (dict, list)):
                live.append(route)
    return live


def extract_files(body):
    """Defensive: the shapes here are UNVERIFIED (no public docs for file
    reads). Pull the obvious fields; keep the raw item so the push can dig."""
    out = []
    for f in items_of(body):
        url = pick(f, 'uri', 'url', 'downloadUrl', 'downloadUri', 'fileUrl',
                   'contentUrl', 'href')
        if not url:
            uris = f.get('uris') if isinstance(f.get('uris'), list) else []
            for u in uris:
                url = pick(u, 'url', 'uri')
                if url:
                    break
        out.append({
            'id': str(pick(f, 'id', 'fileId', 'documentId', 'photoId', default='') or ''),
            'name': pick(f, 'fileName', 'name', 'title', 'originalFileName', default=''),
            'mime': (pick(f, 'contentType', 'mimeType', 'mime', default='') or '').lower(),
            'size': pick(f, 'fileSize', 'size', 'sizeBytes', 'contentLength'),
            'captured_at': pick(f, 'capturedDate', 'createdDate', 'createdAt', 'dateCreated'),
            'description': pick(f, 'description', 'caption', default=''),
            'url': url,
            'raw': f,
        })
    return out


def download(url, path, key, tries=4):
    tmp = path + '.part'
    delay = 2.0
    for attempt in range(tries):
        try:
            throttle()
            # Bearer included: harmless on a pre-signed CDN link, required if
            # the URL is an API route. Either way the bytes come down.
            req = urllib.request.Request(url, headers={
                'User-Agent': UA, 'Authorization': 'Bearer ' + key})
            got = 0
            with urllib.request.urlopen(req, timeout=300) as r, open(tmp, 'wb') as f:
                while True:
                    chunk = r.read(1 << 16)
                    if not chunk:
                        break
                    got += len(chunk)
                    if got > MAX_FILE_BYTES:
                        raise ValueError('over %d bytes' % MAX_FILE_BYTES)
                    f.write(chunk)
            os.replace(tmp, path)      # atomic: a half file never looks complete
            return True
        except Exception:
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except OSError:
                    pass
            if attempt == tries - 1:
                return False
            time.sleep(delay)
            delay *= 2
    return False


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dest', required=True, help='export root, e.g. /data/cardinal/acculynx')
    ap.add_argument('--milestones', default=DEFAULT_MILESTONES,
                    help='comma-separated. Default omits cancelled and dead '
                         '(the 11 Aug decision).')
    ap.add_argument('--no-files', action='store_true', help='records only')
    ap.add_argument('--limit', type=int, default=0,
                    help='stop after N newly-enriched jobs (smoke test)')
    args = ap.parse_args()

    key = os.environ.get('ACCULYNX_API_KEY', '').strip()
    if not key:
        die('ACCULYNX_API_KEY is not set. export it first — never put it in a file.')

    milestones = [m.strip().lower() for m in args.milestones.split(',') if m.strip()]
    bad = [m for m in milestones if m not in
           ('lead', 'prospect', 'approved', 'completed', 'invoiced', 'closed',
            'cancelled', 'dead')]
    if bad:
        die('unknown milestone(s): %s' % ', '.join(bad))

    dest = os.path.abspath(args.dest)
    files_dir = os.path.join(dest, 'files')
    os.makedirs(dest, exist_ok=True)
    jobs_path = os.path.join(dest, 'jobs.jsonl')
    files_path = os.path.join(dest, 'files.jsonl')
    skipped_path = os.path.join(dest, 'skipped_files.jsonl')

    # jobs.jsonl IS the resume record: a line means that job is fully enriched
    # (and its files handled). No separate cursor to get out of sync.
    done = set()
    if os.path.exists(jobs_path):
        with open(jobs_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        done.add(str(json.loads(line).get('id')))
                    except Exception:
                        die('%s has a corrupt line — do not hand-edit it. '
                            'Move it aside and re-run.' % jobs_path)

    print('export  : %s' % dest)
    print('scope   : %s' % ', '.join(milestones))
    print('resuming: %s' % ('yes, %d jobs already done' % len(done) if done else 'no'))

    print('listing jobs (both assignment sweeps per milestone)…')
    listing = list_job_ids(key, milestones)
    todo = [i for i in listing if i not in done]
    print('%d jobs in scope, %d already enriched, %d to do'
          % (len(listing), len(listing) - len(todo), len(todo)))

    file_routes = []
    if not args.no_files:
        sample = (todo or list(listing))[:3]
        file_routes = discover_file_routes(key, sample)
        if file_routes:
            print('file read routes answering 200: %s' % ', '.join(file_routes))
            os.makedirs(files_dir, exist_ok=True)
        else:
            print('NO file read route answered — matching the public docs '
                  '(upload-only). Records continue; documents/photos need the '
                  'fallback path in ACCULYNX_MIGRATION.md.')

    jobs_f = open(jobs_path, 'a', encoding='utf-8')
    files_f = open(files_path, 'a', encoding='utf-8')
    skipped_f = open(skipped_path, 'a', encoding='utf-8')
    f403 = [0, 0]            # [count of 403s, count of sub-calls]
    new = files_got = files_skipped = files_failed = 0
    started = time.time()

    try:
        for n, job_id in enumerate(todo, 1):
            # If sub-resources 403 across the board it is a plan/tier problem,
            # not per-job noise. Stop early rather than write an export of
            # empty shells.
            if f403[1] >= 40 and f403[0] > f403[1] * 0.9:
                die('%d of the first %d sub-resource calls answered 403 — this '
                    'key cannot read job details. Check the API plan before '
                    're-running.' % (f403[0], f403[1]))

            rec = {'id': job_id, 'job': listing[job_id],
                   'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
            rec.update(enrich(key, job_id, f403))

            rec['files'] = []
            for route in file_routes:
                body = get('/jobs/%s%s' % (job_id, route), key,
                           {'pageSize': 200}, optional=True)
                if body == '__403__' or body is None:
                    continue
                for f in extract_files(body):
                    mime = f['mime']
                    kind = ('photo' if mime in PHOTO_MIMES
                            else 'doc' if mime in DOC_MIMES else None)
                    size = f['size'] if isinstance(f['size'], int) else None
                    reason = None
                    if not f['url']:
                        reason = 'no download url in the listing'
                    elif kind is None:
                        reason = 'mime %r not accepted by the photos bucket' % (mime or '?')
                    elif size and size > MAX_FILE_BYTES:
                        reason = 'over the 25 MiB bucket cap (%d bytes)' % size
                    if reason:
                        skipped_f.write(json.dumps({
                            'job_id': job_id, 'route': route, 'id': f['id'],
                            'name': f['name'], 'mime': mime, 'size': size,
                            'reason': reason}, ensure_ascii=False) + '\n')
                        files_skipped += 1
                        continue
                    ext = PHOTO_MIMES.get(mime) or DOC_MIMES.get(mime)
                    fid = f['id'] or safe_name(f['name'], 40) or 'f%d' % files_got
                    out_dir = os.path.join(files_dir, job_id)
                    os.makedirs(out_dir, exist_ok=True)
                    out_file = os.path.join(
                        out_dir, '%s-%s%s' % (fid, safe_name(f['name'], 60), ext))
                    if not (os.path.exists(out_file) and os.path.getsize(out_file) > 0):
                        if not download(f['url'], out_file, key):
                            files_failed += 1
                            skipped_f.write(json.dumps({
                                'job_id': job_id, 'route': route, 'id': f['id'],
                                'name': f['name'], 'mime': mime, 'size': size,
                                'reason': 'download failed'}, ensure_ascii=False) + '\n')
                            continue
                    files_got += 1
                    frec = {'job_id': job_id, 'file_id': fid, 'kind': kind,
                            'name': f['name'], 'mime': mime,
                            'size': os.path.getsize(out_file),
                            'captured_at': f['captured_at'],
                            'description': f['description'],
                            'path': os.path.relpath(out_file, dest)}
                    files_f.write(json.dumps(frec, ensure_ascii=False) + '\n')
                    rec['files'].append(frec)

            jobs_f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            jobs_f.flush(); files_f.flush(); skipped_f.flush()
            new += 1

            if n % 25 == 0 or n == len(todo):
                rate = n / max(1e-6, time.time() - started)
                print('  [%d/%d] enriched · files %d (skipped %d, failed %d) · %.1f jobs/s'
                      % (n, len(todo), files_got, files_skipped, files_failed, rate))
            if args.limit and new >= args.limit:
                print('hit --limit %d, stopping' % args.limit)
                break

    except KeyboardInterrupt:
        print('\nstopped — jobs.jsonl is the record, re-run the same command to carry on')
    finally:
        jobs_f.close(); files_f.close(); skipped_f.close()

    print('\nenriched %d new jobs (%d total on disk) · files %d · skipped %d · failed %d'
          % (new, len(done) + new, files_got, files_skipped, files_failed))
    print('manifest: %s' % jobs_path)
    if not file_routes and not args.no_files:
        print('files   : NONE — no read route on this account (see the probe report)')
    if files_failed:
        print('re-run to retry the %d downloads that failed' % files_failed)


if __name__ == '__main__':
    main()
