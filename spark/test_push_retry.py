#!/usr/bin/env python3
"""Functional harness for push_studio_tags.py — run it with `python3 test_push_retry.py`.

Imports and executes the SHIPPED module — main(), the real loop, the real retry
block — with only the four network/IO leaves stubbed (get_token, make_thumb,
upload_storage, upsert_row). It is deliberately NOT a re-implementation of the
logic under test; that is the mistake that made an earlier gate on this project
report green against code it had itself written.

Needs Pillow (push_studio_tags imports it) but never decodes a real image, and
never touches the network. Safe to run anywhere, takes about a second.

Scenario 1b is the negative control and matters more than the rest: it runs the
same token-expiry scenario with a permanently dead token and requires that
photographs are LOST. If it ever passes, scenario 1 is proving nothing.
"""
import base64, contextlib, importlib.util, io, json, os, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('pst', os.path.join(HERE, 'push_studio_tags.py'))
pst = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pst)

FAILS = []


def fixture(n):
    """A temp --root/--tags pair with n real files on disk."""
    d = tempfile.mkdtemp()
    os.makedirs(os.path.join(d, 'cc'), exist_ok=True)
    rows = []
    for i in range(n):
        rel = 'cc/p%04d.jpg' % i
        with open(os.path.join(d, rel), 'wb') as f:
            f.write(b'\xff\xd8\xff\xd9')
        rows.append({'id': 'cc:%04d' % i, 'path': rel, 'source': 'companycam',
                     'tags': ['roof'], 'confidence': 0.9, 'tagged_at': '2026-08-05T00:00:00Z'})
    tags = os.path.join(d, 'studio_tags.jsonl')
    with open(tags, 'w') as f:
        for r in rows:
            f.write(json.dumps(r) + '\n')
    return d, tags


def run(n, on_call, ttl=None, stall=None, token_stub=None):
    """Execute the real main() against stubs. Returns (state, log, exit_code)."""
    d, tags = fixture(n)
    calls = {'auth': 0, 'net': 0}

    def get_token(email, password):
        calls['auth'] += 1
        # token_stub lets a caller hand back a token that is ALREADY dead,
        # which is what the negative control needs.
        return token_stub if token_stub else 'tok-%d' % calls['auth']

    def make_thumb(src):
        return b'jpegbytes', 800, 600

    def net(token, *a, **k):
        calls['net'] += 1
        on_call(calls, token)          # raises ApiError to simulate failures

    pst.get_token, pst.make_thumb = get_token, make_thumb
    pst.upload_storage = net
    pst.upsert_row = lambda token, row: net(token)
    if ttl is not None:
        pst.TOKEN_TTL_S = ttl
    if stall is not None:
        pst.STALL_AFTER = stall

    os.environ['CARDINAL_EMAIL'] = 'theo@cardinalrenovations.net'
    os.environ['CARDINAL_PASSWORD'] = 'x'
    sys.argv = ['push_studio_tags.py', '--dest', d, '--root', d, '--tags', tags]

    buf, code = io.StringIO(), 0
    try:
        with contextlib.redirect_stdout(buf):
            pst.main()
    except SystemExit as e:
        code = e.code or 0
    state = json.load(open(tags + '.pushed.json')) if os.path.exists(tags + '.pushed.json') else []
    return state, buf.getvalue(), code, calls


def check(name, cond, detail=''):
    print(('  PASS  ' if cond else '  FAIL  ') + name + (('  — ' + detail) if detail else ''))
    if not cond:
        FAILS.append(name)


# ── 0 · the error SHAPES, straight from production ──────────────────────────
# This block exists because the first version of this harness invented its own
# error shape. It simulated a clean 401 — which is what PostgREST sends and
# what I assumed — and passed, while the real run was dying on a Storage 400
# and the fix never fired. Pin the real strings.
print('0 · recognising what Supabase actually sends')

# Verbatim from the 5 Aug run: Storage wraps a 403 inside an HTTP 400.
STORAGE_EXPIRED = pst.ApiError(
    'storage upload failed (400): {"statusCode":"403","error":"InvalidJWT",'
    '"message":"\\"exp\\" claim timestamp check failed"}', 400)
POSTGREST_EXPIRED = pst.ApiError('insert failed (401): JWT expired', 401)
# Must NOT be read as an auth failure — a 400 that is genuinely a bad request.
BAD_REQUEST = pst.ApiError(
    'insert failed (400): {"message":"invalid input syntax for type integer"}', 400)
# The trap in matching loosely: 'exp' is a substring of "unexpected", and a
# bare '403' can appear in any body. Neither of these is an auth failure.
UNEXPECTED = pst.ApiError(
    'insert failed (400): {"message":"unexpected end of JSON input"}', 400)
BODY_HAS_403 = pst.ApiError(
    'insert failed (400): {"message":"row 403 violates check constraint"}', 400)

check('Storage 400-wrapping-403 IS an auth failure', pst.is_auth_failure(STORAGE_EXPIRED))
check('PostgREST 401 IS an auth failure', pst.is_auth_failure(POSTGREST_EXPIRED))
check('a real bad request is NOT', not pst.is_auth_failure(BAD_REQUEST))
check('"unexpected" does not match on "exp"', not pst.is_auth_failure(UNEXPECTED))
check('"403" elsewhere in a body does not match', not pst.is_auth_failure(BODY_HAS_403))

# token_expiry reads the token's own exp claim. Build one the way GoTrue does.
_payload = base64.urlsafe_b64encode(
    json.dumps({'exp': int(time.time()) + 3600}).encode()).decode().rstrip('=')
check('reads exp out of a real-shaped JWT',
      3500 < pst.token_expiry('header.' + _payload + '.sig') <= 3600,
      '%d s' % pst.token_expiry('header.' + _payload + '.sig'))
check('unparseable token falls back, does not crash',
      pst.token_expiry('not-a-jwt') == pst.TOKEN_TTL_S)


# ── 0a · a transient sign-in failure must not kill the run ──────────────────
# get_token() used to die() on ANY HTTPError, and SystemExit is not an
# Exception, so the push loop could not catch it: one momentary 429 ended an
# eight-hour job. Bad credentials must still be fatal — retrying a wrong
# password is how an account gets locked.
print('\n0a · sign-in retries transient failures, dies on bad credentials')


def _fake_urlopen(seq):
    """Hand back queued outcomes: an int raises that HTTP status, a dict is a body."""
    calls = {'n': 0}

    class _Resp:
        def __init__(self, payload): self.payload = payload
        def read(self): return json.dumps(self.payload).encode()
        def __enter__(self): return self
        def __exit__(self, *a): return False

    def opener(req, timeout=None):
        calls['n'] += 1
        nxt = seq[min(calls['n'] - 1, len(seq) - 1)]
        if isinstance(nxt, int):
            raise pst.urllib.error.HTTPError('u', nxt, 'err', {}, io.BytesIO(b'{"m":"x"}'))
        return _Resp(nxt)
    return opener, calls


_real_urlopen, _real_sleep = pst.urllib.request.urlopen, pst.time.sleep
pst.time.sleep = lambda s: None                      # no real backoff in tests

# 429 twice, then success -> must recover and return the token
opener, calls = _fake_urlopen([429, 429, {'access_token': 'tok-ok'}])
pst.urllib.request.urlopen = opener
with contextlib.redirect_stdout(io.StringIO()):
    got = pst.get_token('a@b.c', 'pw')
check('recovers from two 429s', got == 'tok-ok', 'got %r after %d calls' % (got, calls['n']))

# 401 -> fatal immediately, and must NOT retry
opener, calls = _fake_urlopen([401])
pst.urllib.request.urlopen = opener
_exited = None
try:
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        pst.get_token('a@b.c', 'wrong')
except SystemExit as e:
    _exited = e.code
check('bad credentials are fatal', _exited == 1, 'exit %r' % _exited)
check('and are NOT retried', calls['n'] == 1, '%d sign-in attempts' % calls['n'])

# 503 forever -> gives up rather than looping, still fatal
opener, calls = _fake_urlopen([503])
pst.urllib.request.urlopen = opener
_exited = None
try:
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        pst.get_token('a@b.c', 'pw', tries=4)
except SystemExit as e:
    _exited = e.code
check('a permanent 503 gives up after its tries', _exited == 1 and calls['n'] == 4,
      'exit %r after %d attempts' % (_exited, calls['n']))

pst.urllib.request.urlopen, pst.time.sleep = _real_urlopen, _real_sleep


# ── 1 · the 5 Aug failure: the token dies mid-run ───────────────────────────
# Uses the STORAGE shape, because upload_storage() is the call that runs first
# and is therefore what a long run actually hits. Under the old `e.code == 401`
# test this scenario fails.
print('\n1 · token expires mid-run (Storage 400/403, the real shape)')


def dying_token(calls, token):
    if calls['net'] > 10 and token == 'tok-1':
        raise pst.ApiError(
            'storage upload failed (400): {"statusCode":"403","error":"InvalidJWT",'
            '"message":"\\"exp\\" claim timestamp check failed"}', 400)


state, log, code, calls = run(30, dying_token, ttl=10 ** 9)
check('all 30 photographs landed', len(state) == 30, '%d landed' % len(state))
check('signed in again exactly once', calls['auth'] == 2, '%d sign-ins' % calls['auth'])
check('said so in the log', 'signing in again' in log)
check('exit code 0', code == 0, 'got %r' % code)

# The PostgREST half of the same failure, so both services stay covered.
print('\n1a · same run, PostgREST 401 instead')


def dying_token_401(calls, token):
    if calls['net'] > 10 and token == 'tok-1':
        raise pst.ApiError('insert failed (401): JWT expired', 401)


state, log, code, calls = run(30, dying_token_401, ttl=10 ** 9)
check('all 30 landed on a 401 too', len(state) == 30, '%d landed' % len(state))
check('one sign-in', calls['auth'] == 2, '%d sign-ins' % calls['auth'])

# Regression guard: prove the harness can actually SEE the old bug. If the
# retry block is ever removed this scenario must fail, not quietly pass.
print('\n1b · negative control — the re-auth is what saved it')
# Same scenario, but every sign-in hands back the SAME dead token, so the
# recovery path cannot work. If this still lands 30, scenario 1 proved nothing.
state2, log2, code2, calls2 = run(30, dying_token, ttl=10 ** 9, token_stub='tok-1')
# 5, not 10: each photograph makes TWO network calls (upload then upsert), so
# the 11th call — the first to fail — falls inside photograph 6.
check('with a permanently dead token, photographs are LOST', len(state2) == 5,
      '%d landed, 5 expected (30 without the bug)' % len(state2))
check('and the run stops instead of grinding', 'STOPPING' in log2)
check('with a non-zero exit', code2 == 2, 'got %r' % code2)

# ── 2 · nothing is landing at all ───────────────────────────────────────────
print('\n2 · systemic failure stops the run instead of grinding')


def always_500(calls, token):
    raise pst.ApiError('insert failed (500): boom', 500)


state, log, code, calls = run(200, always_500, ttl=10 ** 9, stall=25)
check('stopped early, did not walk all 200', 'STOPPING' in log)
check('stopped at the threshold', calls['net'] <= 25 * 3 + 3,
      '%d network calls' % calls['net'])
check('exit code 2, not a silent success', code == 2, 'got %r' % code)
check('nothing recorded as pushed', state == [], '%d recorded' % len(state))

# ── 3 · proactive refresh fires before expiry ───────────────────────────────
print('\n3 · token refreshed before it can expire')
state, log, code, calls = run(5, lambda c, t: None, ttl=0)
check('all 5 landed', len(state) == 5)
check('refreshed rather than waiting to fail', 'refreshing the access token' in log)
check('never had to recover from a 401', 'token expired' not in log)

# ── 4 · a transient 503 is retried, not counted as a loss ───────────────────
print('\n4 · transient 503 retried')
seen = {'n': 0}


def flaky(calls, token):
    seen['n'] += 1
    if seen['n'] == 3:
        raise pst.ApiError('storage upload failed (503): unavailable', 503)


state, log, code, calls = run(6, flaky, ttl=10 ** 9)
check('all 6 landed despite a 503', len(state) == 6, '%d landed' % len(state))
check('exit code 0', code == 0)

print('\n' + ('ALL GREEN' if not FAILS else 'RED: ' + ', '.join(FAILS)))
sys.exit(1 if FAILS else 0)
