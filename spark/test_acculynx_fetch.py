#!/usr/bin/env python3
"""Functional harness for fetch_acculynx.py — run with `python3 test_acculynx_fetch.py`.

Imports and executes the SHIPPED module with only the network leaf (get)
stubbed — deliberately not a re-implementation of the logic under test.
Never touches the network; safe to run anywhere, takes about a second.

Scenario 2 is the negative control: a paginator that repeats the same page
forever MUST be caught by the forward-progress assertion and abort the run.
If that scenario ever "completes", scenario 1 is proving nothing — the trap
it guards against (the /jobs pagination-unit stall, live-verified elsewhere)
would loop for hours in production.
"""
import contextlib, importlib.util, io, json, os, sys, tempfile, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('fa', os.path.join(HERE, 'fetch_acculynx.py'))
fa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fa)

REAL_GET = fa.get          # kept before any stub replaces it (test 1b needs it)

FAILS = []


def check(name, cond, detail=''):
    print(('  PASS  ' if cond else '  FAIL  ') + name + (('  — ' + detail) if detail else ''))
    if not cond:
        FAILS.append(name)


def job(i):
    return {'id': 'J%s' % i, 'jobNumber': 'N-%s' % i}


# ── 1 · the union sweep: unassigned jobs must not be missed ─────────────────
print('1 · both assignment sweeps, unioned by id')

CALLS = []


def get_union(path, key, params=None, tries=5, optional=False,
              end_of_listing_ok=False):
    CALLS.append((path, dict(params or {})))
    if path == '/jobs':
        m = params.get('milestones')
        if params.get('assignment') == 'unassigned':
            # POST-created/unassigned jobs: invisible to the default sweep.
            items = [job('U1')] if m == 'closed' else []
        else:
            items = [job('A'), job('B')] if m == 'closed' else []
        # Model the REAL contract, not our assumption about it: the live API
        # pages by pageStartIndex and IGNORES any other name. See test 1b.
        start = params.get('pageStartIndex', 0)
        return {'count': len(items), 'items': items if start == 0 else []}
    return None


fa.get = get_union
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    seen = fa.list_job_ids('k', ['closed', 'lead'])
check('default sweep jobs found', 'JA' in seen and 'JB' in seen, str(sorted(seen)))
check('UNASSIGNED job found too (the completeness trap)', 'JU1' in seen)
check('empty milestone contributes nothing', len(seen) == 3)
check('an assignment=unassigned request was actually made',
      any(p.get('assignment') == 'unassigned' for _, p in CALLS))

# ── 1b · CONTRACT CONFORMANCE against the live API's real rules ─────────────
# Added 13 Aug 2026 after the shipped fetch failed on its first real call.
# The original mock honoured recordStartIndex, so it validated our assumption
# instead of the API — green harness, dead-on-arrival export. This mock
# enforces what the live account actually does, measured:
#   · pageSize > 25 on /jobs  → HTTP 400, refused outright
#   · any page parameter but pageStartIndex → IGNORED (page 1, HTTP 200)
#   · pageStartIndex >= count → HTTP 416, not an empty page
# Revert PAGE_SIZE to 100, or the parameter to recordStartIndex, and this
# test goes red. That is the whole point of it.
print('1b · conformance: real page parameter, real size cap, real 416')

TOTAL = 60
ALL_IDS = ['J%d' % i for i in range(TOTAL)]


def live_like(path, key, params=None, tries=5, optional=False,
              end_of_listing_ok=False, omit_count=False):
    if path != '/jobs':
        return None
    size = params.get('pageSize', 10)
    if size > 25:
        fa.die('HTTP 400 on /jobs — Page Size must not be greater than 25.')
    start = params.get('pageStartIndex', 0)      # every other name ignored
    if start >= TOTAL:
        if end_of_listing_ok:
            return None                          # the 416 path
        fa.die('HTTP 416 on /jobs — Page Start Index must be less than '
               'the number of records.')
    window = [{'id': i} for i in ALL_IDS[start:start + size]]
    body = {'items': window}
    if not omit_count:
        body['count'] = TOTAL
    return body


fa.get = live_like
seen, refused = None, False
try:
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        seen = fa.list_job_ids('k', ['closed'])
except SystemExit:
    refused = True          # the mock refused the call the way the API would
check('PAGE_SIZE is within the API ceiling', not refused and fa.PAGE_SIZE <= 25,
      'PAGE_SIZE=%s; /jobs refuses anything over 25 on the FIRST call, so the '
      'export dies before reading one record' % fa.PAGE_SIZE)
check('every record swept under the real page cap (%d)' % TOTAL,
      seen is not None and len(seen) == TOTAL,
      'got %s of %d — a wrong page parameter stalls on the first page'
      % ('nothing (refused)' if seen is None else len(seen), TOTAL))

# The count guard normally stops the sweep before the end. Strip count out and
# the only thing standing between a 166-job export and a fatal 416 is the
# end_of_listing_ok path — so prove that separately.
fa.get = lambda *a, **k: live_like(*a, omit_count=True, **k)
survived = True
try:
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        seen = fa.list_job_ids('k', ['closed'])
except SystemExit:
    survived = False
check('the sweep asks for end-of-listing tolerance (no `count` case)', survived,
      'the tail of every sweep would abort the whole export')

# ⚠ The check above stubs fa.get, so it proves list_job_ids PASSES the flag —
# it cannot prove get() HONOURS it. Removing the 416 branch from get() leaves
# it green. So stub the network leaf itself (urlopen) and exercise the shipped
# get() both ways: the flag must convert a fatal 416 into a clean stop.
fa.get = REAL_GET


def urlopen_416(req, timeout=None):
    raise urllib.error.HTTPError(
        req.full_url, 416, 'Range Not Satisfiable', {},
        io.BytesIO(b'{"title":"Page Start Index must be less than the number '
                   b'of records."}'))


_real_urlopen = fa.urllib.request.urlopen
fa.urllib.request.urlopen = urlopen_416
try:
    tolerated, fatal = None, False
    try:
        with contextlib.redirect_stderr(io.StringIO()):
            tolerated = fa.get('/jobs', 'k', {'pageStartIndex': 999},
                               end_of_listing_ok=True)
    except SystemExit:
        tolerated = 'DIED'
    try:
        with contextlib.redirect_stderr(io.StringIO()):
            fa.get('/jobs', 'k', {'pageStartIndex': 999})
    except SystemExit:
        fatal = True
finally:
    fa.urllib.request.urlopen = _real_urlopen

check('get() turns a flagged 416 into a clean stop', tolerated is None,
      'got %r — the real end-of-listing path is not wired' % (tolerated,))
check('get() still treats an UNflagged 416 as fatal', fatal,
      'without this the check above would pass even if 416 were ignored '
      'everywhere — that is the negative control for it')

# ── 2 · NEGATIVE CONTROL: a page that never advances must abort ─────────────
print('2 · negative control: repeating page aborts instead of looping')


def get_stuck(path, key, params=None, tries=5, optional=False,
              end_of_listing_ok=False):
    if path == '/jobs':
        return {'count': 1000, 'items': [job('X')]}   # same page, every time
    return None


fa.get = get_stuck
died = False
try:
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        fa.list_job_ids('k', ['closed'])
except SystemExit:
    died = True
check('forward-progress assertion fired (SystemExit)', died,
      'a repeating page must abort — in production this loops forever')

# ── 3 · contact enrichment asks for the includes ────────────────────────────
print('3 · /contacts/{id} is fetched with includes=emailAddress,phoneNumber')

CALLS = []


def get_enrich(path, key, params=None, tries=5, optional=False,
               end_of_listing_ok=False):
    CALLS.append((path, dict(params or {})))
    if path.endswith('/contacts') and '/jobs/' in path:
        return {'items': [{'isPrimary': True, 'contact': {'id': 'C9'}}]}
    if path == '/contacts/C9':
        return {'id': 'C9', 'firstName': 'Pat', 'lastName': 'Doe'}
    if path.endswith('/milestone-history'):
        return {'items': [{'name': 'Lead', 'date': '2024-01-01T00:00:00Z'}]}
    # The roster, as /users really answers it: full objects WITH emails.
    if path == '/users':
        return {'count': 1, 'items': [
            {'id': 'U7', 'email': 'Nick@cardinalrenovations.net',
             'firstName': 'Nick', 'lastName': 'Hey'}]}
    # …and representatives, as /representatives really answers it: a REF with
    # no email on it. The whole point of resolve_user().
    if path.endswith('/representatives'):
        return {'items': [{'id': 'R1', 'type': 'CompanyRepresentative',
                           'user': {'id': 'U7', '_link': 'https://…/users/U7'}}]}
    return None


fa.get = get_enrich
rec = fa.enrich('k', 'J1', [0, 0])
inc = [p for path, p in CALLS if path == '/contacts/C9']
check('contact detail fetched', bool(inc))
check('includes param present', inc and
      inc[0].get('includes') == 'emailAddress,phoneNumber',
      'without it, emails/phones come back as {id,_link} refs with no values')
check('milestone history captured', rec['milestone_history'] and
      rec['milestone_history'][0]['name'] == 'Lead')

# ⚠ Reps arrive as {user:{id,_link}} with NO email. push_acculynx.dig_rep()
# reads an email off that node and, finding none, drops the job on the admin —
# silently, for every job. Verified against the live account 13 Aug 2026.
rep_user = ((rec.get('representatives') or [{}])[0] or {}).get('user') or {}
check('rep ref resolved to a real user with an email',
      rep_user.get('email') == 'Nick@cardinalrenovations.net',
      'got %r — every imported job would land on the admin instead of its rep'
      % (rep_user.get('email'),))
check('the roster costs ONE call however many jobs are enriched',
      len([p for p, _ in CALLS if p == '/users']) == 1,
      'user_map() must cache; %d calls seen'
      % len([p for p, _ in CALLS if p == '/users']))

# ── 4 · extract_files digs the plausible shapes ─────────────────────────────
print('4 · extract_files: defensive field mapping')

got = fa.extract_files({'items': [
    {'id': 7, 'fileName': 'roof.jpg', 'contentType': 'IMAGE/JPEG',
     'fileSize': 123, 'uris': [{'type': 'original', 'url': 'https://x/roof.jpg'}]},
    {'documentId': 'D1', 'name': 'contract.pdf', 'mimeType': 'application/pdf',
     'downloadUrl': 'https://x/c.pdf', 'size': 456},
]})
check('uris[] url found', got[0]['url'] == 'https://x/roof.jpg')
check('mime lower-cased', got[0]['mime'] == 'image/jpeg')
check('downloadUrl found', got[1]['url'] == 'https://x/c.pdf')
check('alternate id field found', got[1]['id'] == 'D1')

# ── 5 · main() end-to-end: writes the manifest, resumes clean ───────────────
print('5 · main() with stubs: manifest written, second run skips everything')

d = tempfile.mkdtemp()


def get_main(path, key, params=None, tries=5, optional=False,
             end_of_listing_ok=False):
    if path == '/jobs':
        if params.get('pageStartIndex', 0) > 0:
            return {'count': 2, 'items': []}
        if params.get('assignment') == 'unassigned':
            return {'count': 0, 'items': []}
        items = [job('1'), job('2')] if params.get('milestones') == 'closed' else []
        return {'count': len(items), 'items': items}
    if path.endswith('/milestone-history'):
        return {'items': [{'name': 'Closed', 'date': '2024-06-01T00:00:00Z'}]}
    return None                      # every other sub-resource: job has none


fa.get = get_main
os.environ['ACCULYNX_API_KEY'] = 'test-key'
sys.argv = ['fetch_acculynx.py', '--dest', d, '--milestones', 'closed']
with contextlib.redirect_stdout(io.StringIO()):
    fa.main()
lines = [json.loads(l) for l in open(os.path.join(d, 'jobs.jsonl'), encoding='utf-8')
         if l.strip()]
check('two jobs enriched to jobs.jsonl', len(lines) == 2, str(len(lines)))
check('milestone history stored on each', all(r['milestone_history'] for r in lines))
check('no files dir when no route answered',
      not os.path.exists(os.path.join(d, 'files')))

buf = io.StringIO()
sys.argv = ['fetch_acculynx.py', '--dest', d, '--milestones', 'closed']
with contextlib.redirect_stdout(buf):
    fa.main()
lines2 = [l for l in open(os.path.join(d, 'jobs.jsonl'), encoding='utf-8') if l.strip()]
check('re-run skips both (resume via jobs.jsonl)', len(lines2) == 2,
      '0 new expected; got %d lines total' % len(lines2))
check('re-run reported the resume', '2 already enriched' in buf.getvalue())

print()
if FAILS:
    print('RED — %d failing: %s' % (len(FAILS), ', '.join(FAILS)))
    sys.exit(1)
print('GREEN — every check passed, including the negative control')
