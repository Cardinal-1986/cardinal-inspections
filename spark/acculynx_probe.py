#!/usr/bin/env python3
"""
Day-one probe of Cardinal's AccuLynx account — the go/no-go before the export.

WHY THIS EXISTS
    The migration plan (spark/ACCULYNX_MIGRATION.md) rests on facts that can
    only be proven with a real API key, and this script proves or refutes every
    one of them in about a minute:

      1. The key works at all. AccuLynx sells API access as an add-on
         ("Add-On Features and Integrations"), so a fresh key on the wrong
         plan may be refused outright. Better to learn that in step one.
      2. The pagination unit. /jobs pages by RECORD OFFSET (recordStartIndex);
         /contacts pages by PAGE NUMBER. A production integration stalled on
         exactly this. The probe measures it rather than trusting the docs.
      3. How many jobs are in each milestone — the real numbers behind the
         "skip Dead/Cancelled" decision, and the dry-run's denominator.
      4. THE BIG ONE: whether job documents and photos can be READ. AccuLynx's
         public docs show upload-only file endpoints. If no read route exists,
         the records migration proceeds and the file migration needs a
         fallback. This is the finding the whole file plan hangs on.
      5. Which AccuLynx users map onto Cardinal rep emails.

    ⚠ The default /jobs listing EXCLUDES unassigned jobs and dead leads —
    a live-verified quirk. Every count below sweeps both assignment states.

WHAT IT REFUSES
    It never touches Supabase, never needs a Cardinal login, and never writes
    anything anywhere except acculynx_probe_report.md next to itself (or at
    --report). Read-only GETs against AccuLynx only.

USAGE
    export ACCULYNX_API_KEY='...'      # never commit this, never paste in chat
    python3 acculynx_probe.py
    python3 acculynx_probe.py --report /tmp/acculynx_probe_report.md

    The report contains no secrets (the key is scrubbed from every error) —
    it is safe to hand back to the session that plans the migration.

Standard library only. Nothing to install.
"""

import argparse, json, os, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://api.acculynx.com/api/v2'
UA = 'cardinal-migration-probe/1.0'
# 10 req/s per key is AccuLynx's stated limit; ~8/s is the pace a production
# integration settled on. The probe makes ~40 calls, so this costs seconds.
PACE_S = 0.13

MILESTONES = ['lead', 'prospect', 'approved', 'completed', 'invoiced',
              'closed', 'cancelled', 'dead']

# Candidate read routes for job files. None of these appears in the public
# docs (which show POST-only for files) — that is exactly why each gets tried.
FILE_ROUTES = ['/documents', '/photos', '/photos-videos', '/files',
               '/attachments', '/media']
FILE_INCLUDES = ['documents', 'photos', 'photosVideos', 'files', 'attachments']

_last_call = [0.0]


def die(msg, code=1):
    print('ERROR: ' + msg, file=sys.stderr)
    sys.exit(code)


def scrub(text, key):
    """Never let the API key reach a log line or the report."""
    return text.replace(key, '***') if key and key in text else text


def get(path, key, params=None, timeout=45):
    """One GET. Returns (status, parsed-or-text). Never raises for HTTP errors —
    the probe's whole job is to observe statuses, including the 404s."""
    wait = PACE_S - (time.time() - _last_call[0])
    if wait > 0:
        time.sleep(wait)
    url = API + path
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'Authorization': 'Bearer ' + key,
        'Accept': 'application/json',
        'User-Agent': UA,
    })
    _last_call[0] = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode('utf-8', 'replace')
            try:
                return r.status, json.loads(raw) if raw.strip() else None
            except Exception:
                return r.status, raw[:400]
    except urllib.error.HTTPError as e:
        body = ''
        try:
            body = e.read().decode('utf-8', 'replace')[:400]
        except Exception:
            pass
        return e.code, scrub(body, key)
    except Exception as e:
        return 0, scrub(str(e), key)


def items_of(body):
    """AccuLynx wraps lists as {count,pageSize,pageStartIndex,items[]} — but the
    probe must not die on a shape surprise, so accept the obvious variants."""
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


def jid(job):
    for k in ('id', 'jobId', 'jobID'):
        if isinstance(job, dict) and job.get(k):
            return str(job[k])
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--report', default=os.path.join(
        os.path.dirname(os.path.abspath(__file__)), 'acculynx_probe_report.md'))
    args = ap.parse_args()

    key = os.environ.get('ACCULYNX_API_KEY', '').strip()
    if not key:
        die('ACCULYNX_API_KEY is not set. Generate one in AccuLynx first\n'
            '  (your name, top right → Account Settings → Add-On Features and\n'
            '  Integrations → API Keys → View API Keys in AppConnections →\n'
            '  Manage Connection → New), then:  export ACCULYNX_API_KEY=...')

    L = []          # report lines

    def say(line=''):
        print(line)
        L.append(line)

    say('# AccuLynx probe report')
    say()
    say('_Generated %s by spark/acculynx_probe.py. No secrets below — the key is scrubbed._'
        % time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime()))
    say()

    # ── 1 · does the key work at all ─────────────────────────────────────────
    say('## 1 · Key and account')
    say()
    st, body = get('/users', key, {'pageSize': 50})
    if st in (401, 403):
        say('**REFUSED (%d).** The key was rejected: %s' % (st, body))
        say()
        say('Either the key is wrong, or API access is not enabled on this '
            'AccuLynx plan (it lives under "Add-On Features and Integrations"). '
            'Fix that before anything else — nothing below ran.')
        open(args.report, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
        die('key refused (%d) — report written to %s' % (st, args.report))
    if st != 200:
        say('**UNEXPECTED (%d)** from GET /users: %s' % (st, body))
        open(args.report, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
        die('auth smoke test failed (%d) — report written to %s' % (st, args.report))

    users = items_of(body)
    say('Key accepted. `GET /users` → %d users.' % len(users))
    say()
    say('| AccuLynx user | email | role | status |')
    say('|---|---|---|---|')
    for u in users:
        say('| %s | %s | %s | %s |' % (
            u.get('displayName') or ('%s %s' % (u.get('firstName', ''), u.get('lastName', ''))).strip() or '?',
            u.get('email') or '—', u.get('role') or '—', u.get('status') or '—'))
    say()
    say('_Emails ending in `@cardinalrenovations.net` map straight onto Cardinal '
        'reps; anyone else lands assigned to the admin with their name kept in '
        '`former_rep`. The push dry-run shows the exact mapping._')
    say()

    # ── 2 · envelope + pagination unit ───────────────────────────────────────
    say('## 2 · /jobs envelope and pagination unit')
    say()
    st, page1 = get('/jobs', key, {'pageSize': 2})
    if st != 200:
        say('**GET /jobs failed (%d):** %s' % (st, page1))
        say()
    else:
        total = count_of(page1)
        first = [jid(j) for j in items_of(page1)]
        say('`GET /jobs?pageSize=2` → HTTP 200, count=%s, %d items, envelope keys: %s'
            % (total, len(first), ', '.join(sorted(page1.keys())) if isinstance(page1, dict) else '(list)'))
        st2, page2 = get('/jobs', key, {'pageSize': 2, 'recordStartIndex': 2})
        second = [jid(j) for j in items_of(page2)] if st2 == 200 else []
        if second and first and second[0] not in first:
            say('`recordStartIndex=2` returned different jobs → **/jobs pages by '
                'RECORD OFFSET**, as the plan assumes. Good.')
        elif second and first and second[0] in first:
            say('⚠ `recordStartIndex=2` repeated the first page → the pagination '
                'unit is NOT a record offset here. **Stop and re-check before '
                'fetching** — this is the documented stall trap.')
        else:
            say('Could not compare pages (HTTP %d, %d items) — the account may '
                'simply have <3 jobs in the default listing.' % (st2, len(second)))
    say()

    # ── 3 · per-milestone counts, both assignment sweeps ─────────────────────
    say('## 3 · Job counts per milestone')
    say()
    say('The default listing EXCLUDES unassigned jobs and dead leads, so every '
        'milestone is counted twice: default sweep + `assignment=unassigned`.')
    say()
    say('| milestone | default | unassigned |')
    say('|---|---:|---:|')
    counts = {}
    a_job_id = None          # a job to probe files on, ideally one likely to have them
    for m in MILESTONES:
        st1, b1 = get('/jobs', key, {'pageSize': 1, 'milestones': m})
        c1 = count_of(b1) if st1 == 200 else ('HTTP %d' % st1)
        st2, b2 = get('/jobs', key, {'pageSize': 1, 'milestones': m, 'assignment': 'unassigned'})
        c2 = count_of(b2) if st2 == 200 else ('HTTP %d' % st2)
        counts[m] = (c1, c2)
        say('| %s | %s | %s |' % (m, c1, c2))
        if a_job_id is None and st1 == 200 and m in ('closed', 'invoiced', 'completed'):
            got = items_of(b1)
            if got:
                a_job_id = jid(got[0])
    say()
    in_scope = 0
    for m in ('lead', 'prospect', 'approved', 'completed', 'invoiced', 'closed'):
        for c in counts.get(m, ()):
            if isinstance(c, int):
                in_scope += c
    say('**In scope for the migration (everything except cancelled/dead, both '
        'sweeps): ~%d jobs.** Exact de-duplicated numbers come from the fetch.' % in_scope)
    say()

    # pick any job at all if no closed/invoiced/completed one existed
    if a_job_id is None:
        st, b = get('/jobs', key, {'pageSize': 1})
        got = items_of(b) if st == 200 else []
        a_job_id = jid(got[0]) if got else None

    # ── 4 · THE go/no-go: can files be read? ─────────────────────────────────
    say('## 4 · File read probes (the go/no-go)')
    say()
    if not a_job_id:
        say('No job could be found to probe against — file support is UNPROVEN.')
    else:
        # Probe up to 3 distinct jobs: one job with zero files answering 200-[]
        # must not be mistaken for "the route does not exist".
        probe_ids = [a_job_id]
        st, b = get('/jobs', key, {'pageSize': 3, 'milestones': 'closed,invoiced,completed'})
        for j in items_of(b) if st == 200 else []:
            i = jid(j)
            if i and i not in probe_ids:
                probe_ids.append(i)
        probe_ids = probe_ids[:3]
        say('Probing job ids: %s' % ', '.join('`%s`' % i for i in probe_ids))
        say()
        say('| route | job | HTTP | first 200 chars |')
        say('|---|---|---:|---|')
        hits = []
        for pid in probe_ids:
            for route in FILE_ROUTES:
                st, b = get('/jobs/%s%s' % (pid, route), key, {'pageSize': 5})
                snip = json.dumps(b)[:200] if isinstance(b, (dict, list)) else str(b)[:200]
                say('| GET /jobs/{id}%s | %s | %d | `%s` |'
                    % (route, pid[:8], st, snip.replace('|', '\\|')))
                if st == 200:
                    hits.append((route, pid, b))
            for inc in FILE_INCLUDES:
                st, b = get('/jobs/%s' % pid, key, {'includes': inc})
                if st == 200 and isinstance(b, dict):
                    extra = [k for k in b.keys() if inc.lower() in k.lower()]
                    if extra:
                        say('| GET /jobs/{id}?includes=%s | %s | %d | keys gained: %s |'
                            % (inc, pid[:8], st, ', '.join(extra)))
                        hits.append(('?includes=' + inc, pid, b))
        say()
        if hits:
            say('**✅ GO — at least one read route answered 200.** The fetch '
                'script auto-discovers the same routes; check the item shapes '
                'above for a download URL field before celebrating: a 200 with '
                'an empty list on every probed job is still unproven.')
        else:
            say('**🛑 NO-GO — every candidate returned non-200.** This matches '
                'the public docs (upload-only file endpoints). The records '
                'migration proceeds unaffected; documents and photos need a '
                'fallback — manual download for the jobs that matter, or a '
                'browser-automation pass. Decide that separately.')
    say()

    # ── 5 · one enriched job, shapes on record ───────────────────────────────
    say('## 5 · Sub-resource spot checks (one job)')
    say()
    if a_job_id:
        for route, params in [('/jobs/%s' % a_job_id, {'includes': 'contact'}),
                              ('/jobs/%s/contacts' % a_job_id, None),
                              ('/jobs/%s/milestone-history' % a_job_id, None),
                              ('/jobs/%s/representatives' % a_job_id, None),
                              ('/jobs/%s/insurance' % a_job_id, None),
                              ('/jobs/%s/adjuster' % a_job_id, None)]:
            st, b = get(route, key, params)
            snip = json.dumps(b)[:300] if isinstance(b, (dict, list)) else str(b)[:300]
            say('- `GET %s` → **%d** `%s`' % (route.replace(a_job_id, '{id}'), st,
                                              snip.replace('|', '\\|')))
        say()
        say('_204/404 on insurance or adjuster just means this particular job is '
            'retail — not a fault._')
    say()
    say('---')
    say('Next: hand this file back to the migration session, then run '
        '`fetch_acculynx.py` (see spark/ACCULYNX_MIGRATION.md).')

    open(args.report, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('\nreport written: %s' % args.report)


if __name__ == '__main__':
    main()
