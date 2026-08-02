#!/usr/bin/env python3
"""
Pull Cardinal's whole CompanyCam library down to local disk.

WHY THIS EXISTS
    The Supabase mirror (companycam_photos) holds METADATA ONLY — captions,
    dates, job names, addresses, and two CDN links. It holds no image bytes.
    If Cardinal ever stops paying CompanyCam, every one of those links dies and
    the mirror becomes an excellent catalogue of pictures nobody can open.
    This script is the exit insurance: the photographs, on hardware Cardinal owns.

WHY IT TALKS TO THE API AND NOT THE MIRROR
    The mirror stores `thumb_url` and `preview_url` — renditions, not originals.
    Only the CompanyCam API returns the full `uris` array, and only that array
    contains the ORIGINAL. An archive built from the mirror would be an archive
    of web-sized copies. So this pages the API: ~617 pages of 100.

WHAT IT REFUSES
    Photos flagged `internal` in CompanyCam, and anything not active/processed.
    Same refusal as api/companycam.js and api/companycam-sync.js — the archive
    must not become a way around the flag.

USAGE (on the Spark)
    export COMPANYCAM_API_KEY='...'          # never commit this
    python3 fetch_companycam.py --dest /data/cardinal/companycam

    Resumable: re-run the same command after any interruption. It reads
    state.json, skips files already on disk, and carries on.

    --rendition original|web   default original (the archive), web is ~6x smaller
    --with-coords              record each photo's lat/lon in the manifest and
                               roll every job up into jobs.jsonl for mapping.
                               OFF by default, ON when you want it — see below.
    --limit N                  stop after N photos (use 50 for a smoke test)

ABOUT --with-coords
    The no-coordinates rule written in three places in this repo
    (companycam_index.sql, api/companycam-sync.js, api/companycam.js) is about
    the SUPABASE MIRROR — not carrying customers' coordinates into a second
    online system that the whole team queries. This archive is different: it is
    Cardinal's own hardware, and Theo asked for coordinates so finished work can
    be matched to a homeowner's neighbourhood for marketing. That is a different
    decision in a different place, and it is his to make.

    Two things follow, and the second one matters more than it looks:

    1. Knowing a coordinate is not publishing it. Use it to FIND nearby jobs;
       show the street or the neighbourhood, not the pin.
    2. EXIF travels inside the file. Post an original straight from this archive
       and the house's coordinates go with it, whatever the caption says. Run
       strip_exif.py on anything headed for a website or social — that is what
       makes "with consent" actually safe.

Standard library only. Nothing to install.
"""

import argparse, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://api.companycam.com/v2'
API_V1 = 'https://app.companycam.com/public_api/v1'   # the one with a full photo index
PAGE_SIZE = 100
UA = 'cardinal-archive/1.0'


def die(msg, code=1):
    print('ERROR: ' + msg, file=sys.stderr)
    sys.exit(code)


def scrub(text, key):
    """Never let the API key reach a log line. Same rule as api/companycam.js."""
    return text.replace(key, '***') if key and key in text else text


def get(path, key, params=None, tries=5):
    url = API_V1 + path
    if params:
        url += '?' + urllib.parse.urlencode(params)
    delay = 2.0
    for attempt in range(tries):
        req = urllib.request.Request(url, headers={
            'Authorization': 'Bearer ' + key,
            'Accept': 'application/json',
            'User-Agent': UA,
        })
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            body = ''
            try:
                body = e.read().decode('utf-8', 'replace')[:300]
            except Exception:
                pass
            # 429/5xx are worth waiting out; 401/403 never are.
            if e.code in (401, 403):
                die('CompanyCam refused the key (%d). %s' % (e.code, scrub(body, key)))
            if e.code not in (429, 500, 502, 503, 504) or attempt == tries - 1:
                die('HTTP %d on %s — %s' % (e.code, path, scrub(body, key)))
        except Exception as e:
            if attempt == tries - 1:
                die('network failure on %s — %s' % (path, e))
        time.sleep(delay)
        delay *= 2
    die('unreachable')


def usable(p):
    """Byte-for-byte the same refusal as api/companycam-sync.js usable()."""
    if not p or p.get('internal') is True:
        return False
    if p.get('status') and p.get('status') != 'active':
        return False
    if p.get('processing_status') and p.get('processing_status') != 'processed':
        return False
    return True


def pick_uri(photo, order):
    uris = photo.get('uris') or []
    for want in order:
        for u in uris:
            if u and u.get('type') == want and (u.get('url') or u.get('uri')):
                return u.get('url') or u.get('uri')
    return None


SLUG_RE = re.compile(r'[^A-Za-z0-9]+')


def slug(s, cap=60):
    out = SLUG_RE.sub('-', (s or '')).strip('-')
    return (out[:cap].rstrip('-') or 'unknown')


def download(url, path, tries=4):
    tmp = path + '.part'
    delay = 2.0
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=180) as r, open(tmp, 'wb') as f:
                while True:
                    chunk = r.read(1 << 16)
                    if not chunk:
                        break
                    f.write(chunk)
            os.replace(tmp, path)          # atomic: a half file never looks complete
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


def load_projects(key):
    """Job id -> (name, address). Gives every photo a human folder name."""
    out, cursor, page = {}, None, 0
    while page < 60:
        params = {'limit': PAGE_SIZE}
        if cursor:
            params['after'] = cursor
        body = get('/projects', key, params)
        data = body.get('data') or []
        meta = body.get('meta') or {}
        for p in data:
            a = p.get('address') or {}
            line = ', '.join(x for x in [
                a.get('street_address_1'), a.get('city'), a.get('state')
            ] if x)
            out[str(p.get('id'))] = (p.get('name') or '', line)
        page += 1
        if not (meta.get('has_next') and meta.get('next_cursor')) or not data:
            break
        cursor = meta['next_cursor']
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dest', required=True, help='archive root, e.g. /data/cardinal/companycam')
    ap.add_argument('--rendition', default='original', choices=['original', 'web'])
    ap.add_argument('--with-coords', action='store_true')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--restart', action='store_true', help='ignore the saved cursor')
    args = ap.parse_args()

    key = os.environ.get('COMPANYCAM_API_KEY', '').strip()
    if not key:
        die('COMPANYCAM_API_KEY is not set. export it first — never put it in a file.')

    dest = os.path.abspath(args.dest)
    originals = os.path.join(dest, 'originals')
    os.makedirs(originals, exist_ok=True)
    state_path = os.path.join(dest, 'state.json')
    manifest_path = os.path.join(dest, 'manifest.jsonl')

    state = {}
    if os.path.exists(state_path) and not args.restart:
        try:
            state = json.load(open(state_path))
        except Exception:
            state = {}
    cursor = state.get('cursor')
    got = int(state.get('got', 0))
    skipped = int(state.get('skipped', 0))
    failed = int(state.get('failed', 0))
    existing = int(state.get('existing', 0))

    print('archive : %s' % dest)
    print('rendition: %s' % args.rendition)
    print('resuming : %s' % ('yes, from saved cursor' if cursor else 'no, from the beginning'))

    print('reading the job list…')
    projects = load_projects(key)
    print('%d jobs' % len(projects))

    order = ['original', 'web'] if args.rendition == 'original' else ['web', 'original']
    manifest = open(manifest_path, 'a', encoding='utf-8')
    jobs_path = os.path.join(dest, 'jobs.jsonl')
    jobs = {}
    started = time.time()
    total = None

    try:
        while True:
            params = {'limit': PAGE_SIZE}
            if cursor:
                params['after'] = cursor
            if total is None:
                params['include_total'] = 'true'

            body = get('/photos', key, params)
            data = body.get('data') or []
            meta = body.get('meta') or {}
            if isinstance(meta.get('total'), int) and total is None:
                total = meta['total']
                print('account holds %d photos' % total)

            if not data:
                break

            for p in data:
                if not usable(p):
                    skipped += 1
                    continue

                pid = str(p.get('project_id') or 'no-job')
                name, addr = projects.get(pid, ('', ''))
                folder = '%s--%s' % (pid[:8], slug(addr or name))
                out_dir = os.path.join(originals, folder)
                os.makedirs(out_dir, exist_ok=True)

                photo_id = str(p.get('id'))
                out_file = os.path.join(out_dir, photo_id + '.jpg')

                if os.path.exists(out_file) and os.path.getsize(out_file) > 0:
                    existing += 1
                else:
                    url = pick_uri(p, order)
                    if not url:
                        skipped += 1
                        continue
                    if download(url, out_file):
                        got += 1
                    else:
                        failed += 1
                        print('  could not fetch %s' % photo_id)
                        continue

                rec = {
                    'id': photo_id,
                    'project_id': pid,
                    'project_name': name,
                    'project_address': addr,
                    'captured_at': p.get('captured_at'),
                    'creator_name': p.get('creator_name'),
                    'description': p.get('description'),
                    'path': os.path.relpath(out_file, dest),
                }
                if args.with_coords:
                    c = p.get('coordinates') or {}
                    lat, lon = c.get('lat'), c.get('lon')
                    if lat is not None and lon is not None:
                        rec['lat'], rec['lon'] = lat, lon
                        # Roll the job up too: one point per job is what a map
                        # wants, and it is far less duplication than 80 photos
                        # each carrying the same driveway.
                        j = jobs.setdefault(pid, {'project_id': pid, 'name': name,
                                                  'address': addr, 'lat': lat,
                                                  'lon': lon, 'photos': 0})
                        j['photos'] += 1
                manifest.write(json.dumps(rec, ensure_ascii=False) + '\n')

                if args.limit and (got + existing) >= args.limit:
                    print('hit --limit %d, stopping' % args.limit)
                    raise KeyboardInterrupt

            manifest.flush()
            has_next = meta.get('has_next') is True and bool(meta.get('next_cursor'))
            cursor = meta.get('next_cursor') if has_next else None

            done = got + existing + skipped
            rate = done / max(1e-6, time.time() - started)
            tail = (' of %d' % total) if total else ''
            print('  %d%s  · new %d · already here %d · skipped %d · failed %d · %.1f/s'
                  % (done, tail, got, existing, skipped, failed, rate))

            json.dump({'cursor': cursor, 'got': got, 'skipped': skipped,
                       'failed': failed, 'existing': existing},
                      open(state_path, 'w'))
            if not has_next:
                break

    except KeyboardInterrupt:
        print('\nstopped — state saved, re-run the same command to carry on')
    finally:
        manifest.close()
        json.dump({'cursor': cursor, 'got': got, 'skipped': skipped,
                   'failed': failed, 'existing': existing},
                  open(state_path, 'w'))
        if jobs:
            # Rewritten whole each run rather than appended, so a resumed run
            # does not leave two lines for the same job.
            with open(jobs_path, 'w', encoding='utf-8') as jf:
                for j in jobs.values():
                    jf.write(json.dumps(j, ensure_ascii=False) + '\n')

    print('\ndownloaded %d · already had %d · skipped %d (internal or unprocessed) · failed %d'
          % (got, existing, skipped, failed))
    print('manifest: %s' % manifest_path)
    if jobs:
        print('jobs with coordinates: %s (%d jobs)' % (jobs_path, len(jobs)))
    if failed:
        print('re-run to retry the %d that failed' % failed)


if __name__ == '__main__':
    main()
