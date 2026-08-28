#!/usr/bin/env python3
"""run_gates.py — run the per-build gates as one regression suite.

WHY THIS EXISTS. There are 191 `gate_*.mjs` files in this folder and, until now,
no way to run them together. Each was executed exactly twice in its life: green
on the build that added it, red on that build's control. Then never again. So
nothing re-checked an old surface, and a print defect introduced at build 747
survived ~300 builds with every mechanical gate green the whole time.

The gates are already a regression suite. They were just never used as one.

CLASSIFICATION IS THE WHOLE JOB. BUG_CLASSES 37 on this project is "a negative
control that CRASHES instead of reporting red" — a run that dies before printing
anything reads as 'not green' when it actually proves NOTHING. A runner that
folds crashes into either PASS or FAIL inherits that bug at suite scale. So:

    exit 0        PASS      the gate ran and was satisfied
    exit 1        FAIL      the gate ran and found something  <- a real finding
    exit 2        UNKNOWN   the gate refused to run (usage / missing input)
    exit 3        UNKNOWN   the gate's own watchdog fired
    timeout       UNKNOWN   we killed it
    anything else UNKNOWN   it crashed

UNKNOWN is never counted as a pass. A suite that is 100% PASS + 40 UNKNOWN has
told you about 40 gates it could not ask.

CALLING CONVENTION - AND THE BUG THIS SHIPPED WITH.

The first version handed the artifact path to every gate, believing argv[2] meant
the same thing everywhere. It does not. There are at least four conventions:

    argv[2] || <repo>/index.html     most gates: the artifact
    argv[2] || <repo>/api            g960: the API DIRECTORY
    argv[2] || '.'                   g1072: the REPO ROOT
    argv.slice(2), path required     g1025+: exits 2 without one

Handing index.html to the second kind made g960 look for `index.html/digest.js`
and report 3 red; run bare it is 11/11 green. That single wrong assumption
produced a wave of false failures large enough to look like the app was broken.
The runner was the defect - not the app, and not the gates.

So: run each gate with NO argument first and let its own default apply. That
default is correct by construction, because whoever wrote the gate chose what
argv[2] means. Only when a gate exits 2 (refused to run) retry once WITH the
artifact path, which is exactly what the fourth convention needs. The mode used
is recorded per gate, so a convention change surfaces instead of hiding.

SCOPE. This runs `gate_*.mjs` only. The 152 `harness_*` / `render_*` files are
older, more heterogeneous, and several need bespoke setup — they are a separate
job, deliberately not attempted here rather than half-attempted.

Usage:
    python3 run_gates.py                       # all gates against index.html
    python3 run_gates.py --artifact other.html
    python3 run_gates.py --shard 1/4           # for splitting across CI jobs
    python3 run_gates.py --only 1050,1036
    python3 run_gates.py --selftest            # prove the classifier works
"""
import argparse, os, re, signal, subprocess, sys, tempfile, time, json
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))

PASS, FAIL, UNKNOWN = 'PASS', 'FAIL', 'UNKNOWN'

CRASH_FOOTER = re.compile(r'^Node\.js v\d+\.', re.M)

def classify(code, timed_out, out=''):
    """⚠ THE THIRD TRAP, found on the first clean full run: an uncaught exception
       in a gate exits 1 — the SAME code as a gate that ran and found failures.
       Classifying on the exit code alone filed 26 crashed gates as findings.
       A crash proves nothing (BUG_CLASSES 37), so it must be UNKNOWN.

       Node prints a `Node.js vX.Y.Z` footer only when it dies on an uncaught
       exception, so that line is the tell. Gates that self-declare a broken rig
       ('rig fault - proves nothing') are the same case, said out loud."""
    if timed_out:               return UNKNOWN, 'timeout'
    if code == 0:               return PASS,    ''
    if code == 1 and CRASH_FOOTER.search(out or ''):
        return UNKNOWN, 'crashed (uncaught exception)'
    if code == 1 and 'rig fault' in (out or ''):
        return UNKNOWN, 'gate declares its own rig broken'
    if code == 1:               return FAIL,    'gate reported failures'
    if code == 2:               return UNKNOWN, 'gate refused to run (usage/missing input)'
    if code == 3:               return UNKNOWN, "gate's own watchdog fired"
    if code is not None and code < 0:
        return UNKNOWN, f'killed by signal {-code}'
    return UNKNOWN, f'crashed (exit {code})'

def gate_files(only=None):
    out = []
    for n in sorted(os.listdir(HERE)):
        m = re.fullmatch(r'gate_(\d+)\.mjs', n)
        if not m:
            continue
        if only and m.group(1) not in only:
            continue
        out.append((int(m.group(1)), n))
    return [n for _, n in sorted(out)]

def _invoke(name, args, timeout):
    """Run one gate. NEVER use capture_output/PIPE here — see below.

    ⚠ THE SECOND BUG THIS RUNNER SHIPPED WITH: a 55-MINUTE HANG.
    The first version used subprocess.run(capture_output=True, timeout=N). Gates
    that drive Playwright spawn Chromium; when the node process exits or is
    killed, those chrome GRANDCHILDREN inherit the stdout pipe. run() fires its
    timeout, kills node, then blocks forever in the drain that follows, because
    the pipe never reaches EOF while a grandchild holds the write end. Observed
    live: 0 node processes, 2 orphaned chrome, the runner alive and silent for
    55 minutes at exactly 79 of 214.

    A runner that HANGS is worse than one that fails — it looks like it is still
    working, so nobody investigates. Two fixes, both needed:
      1. write output to a FILE, not a pipe: nothing depends on EOF
      2. start_new_session so the gate gets its own process group, and on timeout
         kill the whole GROUP, which takes the browsers with it
    """
    with tempfile.TemporaryFile('w+b') as fh:
        pr = subprocess.Popen(['node', os.path.join(HERE, name)] + args,
                              cwd=REPO, stdout=fh, stderr=subprocess.STDOUT,
                              start_new_session=True)
        timed_out = False
        try:
            pr.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            try:
                os.killpg(os.getpgid(pr.pid), signal.SIGKILL)   # browsers too
            except (ProcessLookupError, PermissionError):
                pr.kill()
            try:
                pr.wait(timeout=15)
            except subprocess.TimeoutExpired:
                pass
        fh.seek(0)
        out = fh.read().decode('utf8', 'replace')
    return (None if timed_out else pr.returncode), out, timed_out

def run_one(name, artifact, timeout):
    t0 = time.time()
    # A gate's own default is correct by construction: whoever wrote it chose
    # what argv[2] means. Only hand a path to a gate that refuses without one.
    mode = 'no-arg'
    code, out, timed_out = _invoke(name, [], timeout)
    if code == 2 and not timed_out:
        mode = 'with-artifact'
        code, out, timed_out = _invoke(name, [artifact], timeout)
    verdict, why = classify(code, timed_out, out)
    tail = [l for l in out.strip().split('\n') if l.strip()][-1:] if out.strip() else []
    return {'gate': name, 'verdict': verdict, 'why': why, 'exit': code, 'mode': mode,
            'secs': round(time.time() - t0, 1), 'tail': (tail[0][:150] if tail else '')}

def selftest():
    """Prove the classifier separates the four outcomes. A runner that has never
       been seen to mis-sort is not trustworthy just because it is quiet."""
    cases = [(0, False, '', PASS), (1, False, 'FAIL x', FAIL),
             (2, False, '', UNKNOWN), (3, False, '', UNKNOWN),
             (7, False, '', UNKNOWN), (None, True, '', UNKNOWN),
             (-9, False, '', UNKNOWN),
             # a crash exits 1 exactly like a real finding - the output separates them
             (1, False, 'TypeError: x\n    at y\nNode.js v22.22.2', UNKNOWN),
             (1, False, 'no claim row rendered (rig fault - proves nothing)', UNKNOWN)]
    bad = [(c, t, want, classify(c, t, o)[0]) for c, t, o, want in cases
           if classify(c, t, o)[0] != want]
    for c, t, want, got in bad:
        print(f'  MISSORTED exit={c} timeout={t}: wanted {want}, got {got}')
    # and prove UNKNOWN is not silently a pass anywhere in the summary maths
    fake = [{'verdict': PASS}, {'verdict': UNKNOWN}, {'verdict': FAIL}]
    npass = sum(1 for r in fake if r['verdict'] == PASS)
    if npass != 1:
        print('  UNKNOWN or FAIL is being counted as a pass'); bad.append(1)
    print('SELFTEST', 'FAIL' if bad else 'PASS')
    return 1 if bad else 0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--artifact', default=os.path.join(REPO, 'index.html'))
    ap.add_argument('--timeout', type=int, default=180)
    ap.add_argument('--jobs', type=int, default=4)
    ap.add_argument('--shard', default=None, help='i/n, 1-based')
    ap.add_argument('--only', default=None, help='comma-separated build numbers')
    ap.add_argument('--json', default=None, help='write full results here')
    ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()

    if a.selftest:
        sys.exit(selftest())

    only = set(x.strip() for x in a.only.split(',')) if a.only else None
    files = gate_files(only)
    if a.shard:
        i, n = (int(x) for x in a.shard.split('/'))
        files = [f for k, f in enumerate(files) if k % n == i - 1]
    if not files:
        print('no gates matched'); sys.exit(2)

    art = os.path.abspath(a.artifact)
    print(f'{len(files)} gate(s) against {art}  ({a.jobs} at a time, {a.timeout}s cap)\n')

    results = []
    with ThreadPoolExecutor(max_workers=a.jobs) as ex:
        for r in ex.map(lambda f: run_one(f, art, a.timeout), files):
            results.append(r)
            mark = {'PASS': '.', 'FAIL': 'F', 'UNKNOWN': '?'}[r['verdict']]
            print(mark, end='', flush=True)
    print('\n')

    fails    = [r for r in results if r['verdict'] == FAIL]
    unknowns = [r for r in results if r['verdict'] == UNKNOWN]
    passes   = [r for r in results if r['verdict'] == PASS]

    if fails:
        print('FAILED — the gate ran and found something:')
        for r in sorted(fails, key=lambda r: r['gate']):
            print(f"  {r['gate']:<20} {r['secs']:>6}s  {r['tail']}")
        print()
    if unknowns:
        print('UNKNOWN — could not be asked, NOT a pass:')
        for r in sorted(unknowns, key=lambda r: r['gate']):
            print(f"  {r['gate']:<20} {r['secs']:>6}s  {r['why']}  {r['tail']}")
        print()

    print(f'{len(passes)} passed · {len(fails)} failed · {len(unknowns)} unknown'
          f'   of {len(results)}')
    if a.json:
        with open(a.json, 'w') as fh: json.dump(results, fh, indent=1)
        print(f'full results: {a.json}')

    # UNKNOWN does not fail the suite on its own — it is a coverage report, not a
    # defect. But it is printed every run so the number can never quietly grow.
    sys.exit(1 if fails else 0)

if __name__ == '__main__':
    main()
