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
import contextlib, importlib.util, io, json, os, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('fa', os.path.join(HERE, 'fetch_acculynx.py'))
fa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fa)

FAILS = []


def check(name, cond, detail=''):
    print(('  PASS  ' if cond else '  FAIL  ') + name + (('  — ' + detail) if detail else ''))
    if not cond:
        FAILS.append(name)


def job(i):
    return {'id': 'J%s' % i, 'jobNumber': 'N-%s' % i}


def envelope(all_items, params):
    """Model the REAL API, not the implementation's assumption.

    Measured against the live account 13 Aug 2026: `pageStartIndex` is a
    record offset, and any OTHER parameter name is silently ignored — the
    server answers 200 and hands back page one. Reading the offset from any
    other key here is what let the shipped fetch ship with the wrong spelling
    (`recordStartIndex`) and still go green: the stub had been written to
    agree with the code instead of with AccuLynx, so the two were wrong
    together and no assertion could tell.
    """
    size = params.get('pageSize', 10)
    start = params.get('pageStartIndex', 0)      # deliberately the ONLY offset
    return {'count': len(all_items), 'pageSize': size, 'pageStartIndex': start,
            'items': all_items[start:start + size]}


# ── 1 · the union sweep: unassigned jobs must not be missed ─────────────────
print('1 · both assignment sweeps, unioned by id')

CALLS = []


def get_union(path, key, params=None, tries=5, optional=False):
    CALLS.append((path, dict(params or {})))
    if path == '/jobs':
        m = params.get('milestones')
        if params.get('assignment') == 'unassigned':
            # POST-created/unassigned jobs: invisible to the default sweep.
            items = [job('U1')] if m == 'closed' else []
        else:
            items = [job('A'), job('B')] if m == 'closed' else []
        return envelope(items, params)
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

# ── 1b · paging must actually ADVANCE, across more than one page ────────────
# Scenarios 1 and 5 both fit their whole result in a single page (2 items, and
# the code asks for 100), so neither one ever exercises the offset — which is
# how a wrong offset parameter stayed green. This forces three pages.
print('1b · paging advances, and only on pageStartIndex')
PAGED = [job(str(i)) for i in range(5)]


def get_paged(path, key, params=None, tries=5, optional=False):
    if path == '/jobs':
        if params.get('assignment') == 'unassigned':
            return envelope([], params)
        return envelope(PAGED if params.get('milestones') == 'closed' else [], params)
    return None


fa.get = get_paged
_page = fa.PAGE_SIZE
fa.PAGE_SIZE = 2                      # 5 items over 3 pages
try:
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        seen = fa.list_job_ids('k', ['closed'])
except SystemExit:
    seen = {}                         # forward-progress assertion fired
finally:
    fa.PAGE_SIZE = _page
check('all 5 jobs collected across 3 pages', len(seen) == 5, str(sorted(seen)))
check('none lost to a stalled offset', 'J4' in seen,
      'wrong offset param -> server returns page one forever -> abort or truncation')

# ── 2 · NEGATIVE CONTROL: a page that never advances must abort ─────────────
print('2 · negative control: repeating page aborts instead of looping')


def get_stuck(path, key, params=None, tries=5, optional=False):
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


def get_enrich(path, key, params=None, tries=5, optional=False):
    CALLS.append((path, dict(params or {})))
    if path.endswith('/contacts') and '/jobs/' in path:
        return {'items': [{'isPrimary': True, 'contact': {'id': 'C9'}}]}
    if path == '/contacts/C9':
        return {'id': 'C9', 'firstName': 'Pat', 'lastName': 'Doe'}
    if path.endswith('/milestone-history'):
        return {'items': [{'name': 'Lead', 'date': '2024-01-01T00:00:00Z'}]}
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

# ── 3b · representative refs get resolved to real users ─────────────────────
# /jobs/{id}/representatives returns `user` as a bare {id,_link} ref — the same
# unexpanded-ref trap as /contacts above. Unresolved, the push finds no rep
# email and silently assigns the ENTIRE imported client base to the admin.
print('3b · rep {id,_link} refs are resolved to users with emails')


def get_reps(path, key, params=None, tries=5, optional=False):
    if path == '/users':
        return {'count': 2, 'items': [
            {'id': 'U1', 'email': 'nick@cardinalrenovations.net',
             'firstName': 'Nick', 'lastName': 'Hey'},
            {'id': 'U2', 'email': 'joan@cardinalrenovations.net',
             'firstName': 'Joan', 'lastName': 'Hunt'}]}
    if path.endswith('/representatives'):
        return {'items': [{'type': 'CompanyRepresentative',
                           'user': {'id': 'U1', '_link': 'https://…/users/U1'}}]}
    if path.endswith('/representatives/sales-owner'):
        return {'type': 'SalesOwner', 'user': {'id': 'U2', '_link': 'https://…/users/U2'}}
    return None


fa.get = get_reps
users = fa.fetch_users('k')
check('users map built from /users', len(users) == 2 and 'U1' in users)
rec2 = fa.enrich('k', 'J2', [0, 0], None, users)
check('rep ref -> real email (not a bare {id,_link})',
      rec2['representatives'][0]['user'].get('email') == 'nick@cardinalrenovations.net',
      json.dumps(rec2['representatives'][0]['user']))
check('sales_owner ref resolved too',
      (rec2['sales_owner'] or {}).get('user', {}).get('email')
      == 'joan@cardinalrenovations.net')

# an id the map does not know must be left ALONE, not blanked
fa.get = lambda path, key, params=None, tries=5, optional=False: (
    {'items': [{'type': 'CompanyRepresentative', 'user': {'id': 'UNKNOWN'}}]}
    if path.endswith('/representatives') else None)
rec3 = fa.enrich('k', 'J3', [0, 0], None, users)
check('an unknown user id is left untouched, never blanked',
      rec3['representatives'][0]['user'] == {'id': 'UNKNOWN'})

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


def get_main(path, key, params=None, tries=5, optional=False):
    if path == '/jobs':
        if params.get('assignment') == 'unassigned':
            return envelope([], params)
        items = [job('1'), job('2')] if params.get('milestones') == 'closed' else []
        return envelope(items, params)
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
