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
import importlib.util, json, os, sys, tempfile, io, contextlib

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


# ── 1 · the 5 Aug failure: the token dies mid-run ───────────────────────────
# Every call carrying tok-1 401s from the 10th call onward, exactly as a
# one-hour expiry behaves. Without the fix this loses every remaining photo.
print('\n1 · token expires mid-run')


def dying_token(calls, token):
    if calls['net'] > 10 and token == 'tok-1':
        raise pst.ApiError('insert failed (401): JWT expired', 401)


state, log, code, calls = run(30, dying_token, ttl=10 ** 9)
check('all 30 photographs landed', len(state) == 30, '%d landed' % len(state))
check('signed in again exactly once', calls['auth'] == 2, '%d sign-ins' % calls['auth'])
check('said so in the log', 'token expired — signing in again' in log)
check('exit code 0', code == 0, 'got %r' % code)

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
