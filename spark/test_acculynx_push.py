#!/usr/bin/env python3
"""Functional harness for push_acculynx.py — run with `python3 test_acculynx_push.py`.

Imports and executes the SHIPPED module — map_job, the real push loop, the
real retry block — with only the network leaves stubbed (get_token,
rest_get_all, rest_post, rest_delete, storage_upload). Deliberately NOT a
re-implementation; that mistake has made gates on this project pass against
fiction before.

Two negative controls, and they matter more than the green rows:
  · 5b runs the token-expiry scenario with a PERMANENTLY dead token and
    requires that jobs are LOST and the exit code is 2. If it ever passes
    quietly, scenario 5 is proving nothing.
  · 6 requires that an RLS silent-refusal (empty array, no error) is treated
    as a failure — the exact shape that once cost a 60,000-row run.
"""
import argparse, base64, contextlib, importlib.util, io, json, os, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('pa', os.path.join(HERE, 'push_acculynx.py'))
pa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pa)

FAILS = []
ADMIN = 'theo@cardinalrenovations.net'
ROSTER = {'nick@cardinalrenovations.net': 'sales', ADMIN: 'admin'}
# Captured BEFORE any scenario stubs the module — scenario 6 must exercise the
# real function, not whatever stub the previous scenario left behind.
REAL_REST_POST = pa.rest_post


def check(name, cond, detail=''):
    print(('  PASS  ' if cond else '  FAIL  ') + name + (('  — ' + detail) if detail else ''))
    if not cond:
        FAILS.append(name)


def rec_insured():
    """A closed insurance job whose rep IS on the roster."""
    return {
        'id': 'ACX1',
        'job': {'jobNumber': 'N-100', 'createdDate': '2024-05-01T12:00:00Z',
                'modifiedDate': '2025-01-15T12:00:00Z'},
        'detail': {'address': {'streetAddress1': '77 Oak Ave', 'city': 'Dayton',
                               'state': 'OH', 'zipCode': '45402'},
                   'description': 'hail all over the south slope'},
        'contacts': [{'link': {'isPrimary': True,
                               'contact': {'id': 'C1', 'firstName': 'Bob',
                                           'lastName': 'Jones'}},
                      'detail': {'emailAddresses': [{'emailAddress': 'bob@x.com',
                                                     'type': 'home'}],
                                 'phoneNumbers': [
                                     {'phoneNumber': '937-555-1212', 'type': 'mobile'},
                                     {'phoneNumber': '937-555-9999', 'type': 'home'}]}}],
        'milestone_history': [{'name': 'Lead', 'date': '2024-05-01T12:00:00Z'},
                              {'name': 'Approved', 'date': '2024-06-01T12:00:00Z'},
                              {'name': 'Closed', 'date': '2024-08-01T12:00:00Z'}],
        'representatives': [],
        'sales_owner': {'user': {'email': 'Nick@cardinalrenovations.net',
                                 'firstName': 'Nick', 'lastName': 'R'}},
        'insurance': {'insuranceCompanyName': 'State Farm', 'claimNumber': 'CLM-9',
                      'policyNumber': 'POL-4', 'deductible': 1000},
        'adjuster': {'firstName': 'Ann', 'lastName': 'Adj',
                     'phoneNumber': '555-0000', 'emailAddress': 'ann@sf.com'},
        'custom_fields': [], 'files': [],
    }


# ── 1 · map_job: the blessed row shape ──────────────────────────────────────
print('1 · map_job builds the blessed AccuLynx-import row')

m = pa.map_job(rec_insured(), ROSTER, ADMIN, 1044, '2026-08-11T20:00:00Z')
row = m['row']
ck = json.loads(row['checklist'])
lead = ck['lead']
check('stage mapped Closed->Closed', row['stage'] == 'Closed')
check('claim_type is retail EVEN WITH insurance data (the 11 Aug decision)',
      lead['claim_type'] == 'retail')
check('insurance block preserved for the later sort',
      lead.get('insurance', {}).get('carrier') == 'State Farm'
      and lead['insurance'].get('claim_number') == 'CLM-9')
check('checklist is compact JSON (matches JS JSON.stringify)',
      '"claim_type":"retail"' in row['checklist'])
check('po carried as a number', ck['po'] == 1044 and isinstance(ck['po'], int))
check('stage_since = date it entered Closed', ck['stage_since'] == '2024-08-01T12:00:00Z')
check('t_ stamps from milestone history',
      ck.get('t_Lead') == '2024-05-01T12:00:00Z'
      and ck.get('t_Approved') == '2024-06-01T12:00:00Z'
      and ck.get('t_Closed') == '2024-08-01T12:00:00Z')
check('rep on roster -> assigned (case-folded)',
      lead['assigned'] == ['nick@cardinalrenovations.net'])
check('source + job_number + acculynx_id + imported_at all present',
      lead['source'] == 'AccuLynx import' and lead['job_number'] == 'N-100'
      and lead['acculynx_id'] == 'ACX1' and lead['imported_at'] == '2026-08-11T20:00:00Z')
check('columns: name/address/phone/email filled',
      row['name'] == 'Bob Jones' and '77 Oak Ave' in row['address']
      and row['phone'] == '937-555-1212' and row['email'] == 'bob@x.com')
check('second phone -> phone_alt', lead.get('phone_alt') == '937-555-9999')
check('created_at/updated_at explicit from AccuLynx dates',
      row.get('created_at') == '2024-05-01T12:00:00Z'
      and row.get('updated_at') == '2025-01-15T12:00:00Z')
check('location object built', lead['location']['city'] == 'Dayton'
      and lead['location']['zip'] == '45402')

r2 = rec_insured()
r2['sales_owner'] = {'user': {'firstName': 'Sam', 'lastName': 'Stranger',
                              'email': 'sam@oldcompany.com'}}
m2 = pa.map_job(r2, ROSTER, ADMIN, 1, 'b')
l2 = json.loads(m2['row']['checklist'])['lead']
check('unknown rep -> assigned to admin, name kept in former_rep',
      l2['assigned'] == [ADMIN] and l2.get('former_rep') == 'Sam Stranger')

r3 = rec_insured()
r3['milestone_history'] = [{'name': 'Warranty Work', 'date': '2024-05-01T00:00:00Z'}]
m3 = pa.map_job(r3, ROSTER, ADMIN, 1, 'b')
check('unmapped milestone -> Lead, WITH a visible warning',
      m3['row']['stage'] == 'Lead' and any('unmapped' in w for w in m3['warnings']))

r4 = rec_insured()
r4['contacts'], r4['detail'] = [], {}
r4['job'] = {}
raised = False
try:
    pa.map_job(r4, ROSTER, ADMIN, 1, 'b')
except ValueError:
    raised = True
check('no usable name -> refused (ValueError), never a blank client', raised)

# ── 1c · THE REAL WIRE SHAPE, copied from the live account ──────────────────
# The fixture above uses detail.address/streetAddress1 and a pre-filled
# sales_owner.user.email. The live API returns NEITHER: the address arrives as
# detail.locationAddress (street1/state-as-object) and every representative's
# `user` is a bare {id,_link} ref. Both shipped green against the invented
# fixture and then produced, on all 166 real jobs, a BLANK address and an
# admin-assigned rep. These assertions are transcribed from the wire.
print('1c · the shapes the live API actually returns (13 Aug 2026)')


def rec_wire(resolved=False):
    user = ({'id': 'U1', 'firstName': 'Nick', 'lastName': 'Hey',
             'email': 'nick@cardinalrenovations.net'} if resolved
            else {'id': 'U1', '_link': 'https://api.acculynx.com/api/v2/users/U1'})
    return {
        'id': 'ACXW', 'job': {'jobNumber': 'N-1'},
        'detail': {'locationAddress': {
            'street1': '5735 Webster Street', 'street2': '', 'city': 'Dayton',
            'state': {'id': 35, 'name': 'Ohio', 'abbreviation': 'OH'},
            'zipCode': '45414', 'country': {'id': 1, 'abbreviation': 'US'}}},
        'contacts': [{'link': {'isPrimary': True,
                               'contact': {'id': 'C1', 'firstName': 'Loretta',
                                           'lastName': 'Trickler'}},
                      'detail': {}}],
        'milestone_history': [], 'custom_fields': [], 'files': [],
        'representatives': [{'type': 'CompanyRepresentative', 'user': user}],
        'sales_owner': None, 'insurance': {}, 'adjuster': {},
    }


mw = pa.map_job(rec_wire(), ROSTER, ADMIN, 2000, 'b')
lw = json.loads(mw['row']['checklist'])['lead']
_addr = mw['row']['address'] or ''      # or '' so a regression FAILs, not crashes
check('locationAddress -> a real address line',
      '5735 Webster Street' in _addr and 'Dayton' in _addr, repr(_addr))
check('state object flattened to its abbreviation',
      lw['location']['state'] == 'OH' and lw['location']['zip'] == '45414')
check('an UNRESOLVED rep ref warns instead of silently taking the admin',
      lw['assigned'] == [ADMIN] and any('no rep resolved' in w for w in mw['warnings']),
      str(mw['warnings']))

mr = pa.map_job(rec_wire(resolved=True), ROSTER, ADMIN, 2001, 'b')
lr = json.loads(mr['row']['checklist'])['lead']
check('a RESOLVED rep lands on that rep, not the admin',
      lr['assigned'] == ['nick@cardinalrenovations.net'] and not mr['warnings'],
      str(lr['assigned']) + ' ' + str(mr['warnings']))

# ── 2 · collision matching ──────────────────────────────────────────────────
print('2 · find_collision: name AND street number, not name alone')

by_name = {pa.norm_key('Jane Smith'): [('EXIST1', '123 Main St, Dayton, OH 45402')]}
pid, _ = pa.find_collision('Jane  SMITH', '123 Main Street Dayton OH', by_name)
check('same name + same street number -> collision', pid == 'EXIST1')
pid, _ = pa.find_collision('Jane Smith', '900 Elm St, Dayton, OH', by_name)
check('same name, different street number -> NOT a collision (two Smiths exist)',
      pid is None)

# ── fixture for the end-to-end scenarios ────────────────────────────────────

def fixture():
    """src dir: 3 jobs — new-with-files, collision-with-Jane, plain new."""
    d = tempfile.mkdtemp()
    j1 = rec_insured()
    j2 = rec_insured()
    j2['id'], j2['job'] = 'ACX2', {'jobNumber': 'N-200',
                                   'createdDate': '2023-01-01T00:00:00Z'}
    j2['detail'] = {'address': {'streetAddress1': '123 Main St', 'city': 'Dayton',
                                'state': 'OH', 'zipCode': '45402'}}
    j2['contacts'][0]['link']['contact'] = {'id': 'C2', 'firstName': 'Jane',
                                            'lastName': 'Smith'}
    j2['insurance'] = None
    os.makedirs(os.path.join(d, 'files', 'ACX2'), exist_ok=True)
    with open(os.path.join(d, 'files', 'ACX2', 'p1-roof.jpg'), 'wb') as f:
        f.write(b'\xff\xd8\xff\xd9')
    with open(os.path.join(d, 'files', 'ACX2', 'd1-contract.pdf'), 'wb') as f:
        f.write(b'%PDF-1.4 tiny')
    j2['files'] = [
        {'job_id': 'ACX2', 'file_id': 'p1', 'kind': 'photo', 'name': 'roof.jpg',
         'mime': 'image/jpeg', 'size': 4, 'captured_at': '2023-02-01T00:00:00Z',
         'description': 'south slope', 'path': 'files/ACX2/p1-roof.jpg'},
        {'job_id': 'ACX2', 'file_id': 'd1', 'kind': 'doc', 'name': 'contract.pdf',
         'mime': 'application/pdf', 'size': 13, 'captured_at': None,
         'description': '', 'path': 'files/ACX2/d1-contract.pdf'}]
    j3 = rec_insured()
    j3['id'], j3['insurance'], j3['adjuster'] = 'ACX3', None, None
    j3['job'] = {'jobNumber': 'N-300', 'createdDate': '2024-09-01T00:00:00Z'}
    j3['contacts'][0]['link']['contact'] = {'id': 'C3', 'firstName': 'Al',
                                            'lastName': 'New'}
    j3['detail'] = {'address': {'streetAddress1': '9 Pine Ct', 'city': 'Xenia',
                                'state': 'OH', 'zipCode': '45385'}}
    with open(os.path.join(d, 'jobs.jsonl'), 'w', encoding='utf-8') as f:
        for j in (j1, j2, j3):
            f.write(json.dumps(j) + '\n')
    return d


EXISTING = [{'id': 'EXIST1', 'name': 'Jane Smith',
             'address': '123 Main St, Dayton, OH 45402',
             'checklist': json.dumps({'po': 1043, 'lead': {'claim_type': 'retail'}})}]


class Net:
    """The stub surface. Routes rest_get_all by table; records every write."""

    def __init__(self, post_hook=None):
        self.posts, self.uploads, self.auth = [], [], [0]
        self.post_hook = post_hook

    def install(self):
        def get_token(email, password):
            self.auth[0] += 1
            return 'tok-%d' % self.auth[0]

        def rest_get_all(token, table, select, extra=''):
            if table == 'projects' and 'like.' in extra:
                return []
            if table == 'projects':
                return [dict(r) for r in EXISTING]
            if table == 'team_profiles':
                return [{'email': e, 'role': r} for e, r in ROSTER.items()]
            return []          # children lookups

        def rest_post(token, table, payload, params=''):
            if self.post_hook:
                self.post_hook(token, table, payload)
            self.posts.append((table, payload))
            return [{'id': '%s-%d' % (table[:4].upper(), len(self.posts))}]

        def storage_upload(token, path, data, content_type):
            if self.post_hook:
                self.post_hook(token, 'storage', path)
            self.uploads.append((path, content_type))

        pa.get_token = get_token
        pa.rest_get_all = rest_get_all
        pa.rest_post = rest_post
        pa.storage_upload = storage_upload
        pa.STALL_AFTER = 25
        return self


def ns(src, **kw):
    base = dict(src=src, dry_run=False, limit=0, batch=None,
                rollback=None, no_ledger=False)
    base.update(kw)
    return argparse.Namespace(**base)


os.environ['CARDINAL_EMAIL'] = ADMIN
os.environ['CARDINAL_PASSWORD'] = 'x'

# ── 3 · the real push loop, happy path ──────────────────────────────────────
print('3 · push(): 2 new clients, 1 collision-attach, files land, PO sequence')

d = fixture()
net = Net().install()
with contextlib.redirect_stdout(io.StringIO()):
    pa.push(ns(d, batch='2026-08-11T20:00:00Z'), ADMIN, 'x')

proj_posts = [p for t, p in net.posts if t == 'projects']
photo_posts = [p for t, p in net.posts if t == 'project_photos']
doc_posts = [p for t, p in net.posts if t == 'inspection_reports']
audit_posts = [p for t, p in net.posts if t == 'audit_events']
check('exactly 2 projects inserted (the collision made none)', len(proj_posts) == 2,
      str(len(proj_posts)))
pos = sorted(json.loads(p['checklist'])['po'] for p in proj_posts)
check('PO numbers 1044,1045 — collision did not burn one', pos == [1044, 1045], str(pos))
check('photo went to the EXISTING client under projects/EXIST1/acx-*',
      net.uploads and net.uploads[0][0] == 'projects/EXIST1/acx-p1.jpg',
      str(net.uploads))
check('photo row shape: data=public URL, section General, storage_path set',
      photo_posts and photo_posts[0]['project_id'] == 'EXIST1'
      and photo_posts[0]['data'].endswith('/object/public/photos/projects/EXIST1/acx-p1.jpg')
      and photo_posts[0]['section'] == 'General'
      and photo_posts[0]['created_at'] == '2023-02-01T00:00:00Z')
check('doc row: File: title, base64 data URL in html, attached to EXIST1',
      doc_posts and doc_posts[0]['title'] == 'File: contract.pdf'
      and doc_posts[0]['project_id'] == 'EXIST1'
      and json.loads(doc_posts[0]['html'])['data'].startswith('data:application/pdf;base64,')
      and json.loads(doc_posts[0]['html'])['file'] == 1)
check('audit rows: one per new client + one for the attach', len(audit_posts) == 3,
      str(len(audit_posts)))
check('attach audit says attached, not imported',
      any('attached to existing client' in p['detail'] for p in audit_posts))
pushed = json.load(open(os.path.join(d, 'jobs.jsonl.pushed.json')))
check('all 3 jobs recorded as pushed', sorted(pushed) == ['ACX1', 'ACX2', 'ACX3'])
ledgers = [f for f in os.listdir(d) if f.startswith('push_ledger_')]
led = [json.loads(l) for l in open(os.path.join(d, ledgers[0]), encoding='utf-8')]
check('ledger holds every write with the batch stamp',
      len(led) == len(net.posts) + 0 and all(e['batch'] for e in led),
      '%d ledger vs %d posts' % (len(led), len(net.posts)))

# ── 4 · resume: a second run writes nothing ─────────────────────────────────
print('4 · resume via pushed.json')
net2 = Net().install()
with contextlib.redirect_stdout(io.StringIO()):
    pa.push(ns(d, batch='2026-08-11T20:00:00Z'), ADMIN, 'x')
check('second run posts nothing', not net2.posts, str(len(net2.posts)))

# ── 5 · token expiry mid-run: recovered via re-auth ─────────────────────────
print('5 · the 61-minute failure: expired token recovered')

d = fixture()
STORAGE_EXPIRED = pa.ApiError(
    'storage upload failed (400): {"statusCode":"403","error":"InvalidJWT",'
    '"message":"\\"exp\\" claim timestamp check failed"}', 400)


def dies_on_first_token(net):
    def hook(token, table, payload):
        if token == 'tok-1':
            raise STORAGE_EXPIRED
    return hook


net = Net()
net.post_hook = dies_on_first_token(net)
net.install()
with contextlib.redirect_stdout(io.StringIO()):
    pa.push(ns(d, batch='2026-08-11T21:00:00Z'), ADMIN, 'x')
pushed = json.load(open(os.path.join(d, 'jobs.jsonl.pushed.json')))
check('all jobs landed despite the dead first token', len(pushed) == 3, str(pushed))
check('re-auth actually happened (Storage 400-wrapped-403 recognised)',
      net.auth[0] >= 2, 'auth calls: %d' % net.auth[0])

# ── 5b · NEGATIVE CONTROL: permanently dead token MUST lose jobs ────────────
print('5b · negative control: token that never recovers -> jobs lost, exit 2')

d = fixture()
net = Net()
net.post_hook = lambda token, table, payload: (_ for _ in ()).throw(STORAGE_EXPIRED)
net.install()
pa.STALL_AFTER = 2
code = 0
try:
    with contextlib.redirect_stdout(io.StringIO()):
        pa.push(ns(d, batch='2026-08-11T22:00:00Z'), ADMIN, 'x')
except SystemExit as e:
    code = e.code or 0
pa.STALL_AFTER = 25
lost = not os.path.exists(os.path.join(d, 'jobs.jsonl.pushed.json')) or \
    len(json.load(open(os.path.join(d, 'jobs.jsonl.pushed.json')))) == 0
check('jobs were LOST (if this passes quietly, scenario 5 proves nothing)', lost)
check('stall-out exited non-zero (2)', code == 2, 'exit=%r' % code)

# ── 6 · NEGATIVE CONTROL: RLS silent refusal is a failure ───────────────────
print('6 · an empty-array insert answer (RLS refusal) must raise')

raised = False


def _req_empty(url, token, data=None, headers=None, method='GET', timeout=60):
    return 201, b'[]'


_orig = pa._request
pa._request = _req_empty
try:
    REAL_REST_POST('t', 'projects', {'name': 'x'})
except RuntimeError as e:
    raised = 'RLS' in str(e)
pa._request = _orig
check('rest_post refuses the silent empty array', raised)

# ── 7 · dry run: reviews written, NOTHING posted ────────────────────────────
print('7 · dry run writes the review files and never writes to Supabase')

d = fixture()


def boom(*a, **k):
    raise AssertionError('dry run tried to WRITE')


net = Net().install()
pa.rest_post = boom
pa.storage_upload = boom
with contextlib.redirect_stdout(io.StringIO()):
    pa.dry_run(ns(d, dry_run=True), 'tok', ADMIN)
rev = open(os.path.join(d, 'acculynx_review.csv'), encoding='utf-8-sig').read()
col = open(os.path.join(d, 'collisions.csv'), encoding='utf-8-sig').read()
check('review lists all three jobs', rev.count('\n') >= 4)
check('collision reported for Jane Smith', 'Jane Smith' in col and 'EXIST1' in col)
check('insurance flag visible in the review for the sort decision',
      any('yes' in l for l in rev.splitlines() if 'Bob Jones' in l))
check('review marks the collision row', 'collision -> attach' in rev)

print()
if FAILS:
    print('RED — %d failing: %s' % (len(FAILS), ', '.join(FAILS)))
    sys.exit(1)
print('GREEN — every check passed, including both negative controls')
