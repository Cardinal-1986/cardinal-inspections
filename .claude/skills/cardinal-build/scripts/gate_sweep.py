#!/usr/bin/env python3
"""gate_sweep.py — run a RANGE of per-build gates and report a table.

Why this exists (build 975): `gate_971.mjs` went red at build 972 and stayed red
through 973 and 974 without anyone noticing, because nothing re-ran it. Both
causes were harness gaps, not app defects — 972 gave threadHtml new arms that
read a symbol the shim did not define, and 974 moved the price ladder into the
main block so the gate's stub page no longer had it. A gate nobody re-runs is a
gate that quietly stops being one.

Two sweeps, and the second is the one that matters:

  GREEN sweep    every gate in the range, against the working artifact.
                 Catches a later build breaking an earlier gate.
  CONTROL sweep  every gate in the range, against the artifact of the build
                 BEFORE it, materialised from git. A gate that cannot be seen
                 to fail proves nothing (BUG_CLASSES: "a check that cannot fail
                 is worse than no check"), and a gate that CRASHES instead of
                 reporting red proves nothing either (BUG_CLASSES 37) — a crash
                 is reported here as CRASH, never as a pass and never as a red.

Control artifacts come from `git show <sha>:<file>`, where <sha> is the commit
whose subject names that build. Nothing is written into the repo.

Usage:
  python3 gate_sweep.py --from 967 --to 975
  python3 gate_sweep.py --from 967 --to 975 --controls
  python3 gate_sweep.py --from 967 --to 975 --controls --timeout 240
"""
import argparse
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))

OK, BAD, WARN, DIM = '\033[32m', '\033[31m', '\033[33m', '\033[2m'
END = '\033[0m'
if not sys.stdout.isatty():
    OK = BAD = WARN = DIM = END = ''

GATE_RE = re.compile(r'^gate_(\d+)\.mjs$')
# a gate names the artifact it defaults to in its own FILE= line
DEFAULT_FILE_RE = re.compile(r"process\.argv\[2\]\s*\|\|\s*join\(HERE,\s*'([^']+)'\)")


def gates_in_range(lo, hi):
    found = []
    for name in sorted(os.listdir(HERE)):
        m = GATE_RE.match(name)
        if m and lo <= int(m.group(1)) <= hi:
            found.append((int(m.group(1)), os.path.join(HERE, name)))
    return sorted(found)


def artifact_for(gate_path):
    """Which file does this gate gate? Read it, do not assume index.html."""
    src = open(gate_path, encoding='utf-8').read()
    m = DEFAULT_FILE_RE.search(src)
    rel = m.group(1) if m else '../../../../index.html'
    return os.path.basename(rel)          # 'index.html' | 'supplement.html'


def commit_for_build(n):
    """The commit whose subject names build n. Case-insensitive: this repo's
    build log is inconsistent about `Build` vs `build`, and so are subjects."""
    out = subprocess.run(
        ['git', 'log', '--format=%H|%s', '-400'],
        cwd=REPO, capture_output=True, text=True).stdout
    pat = re.compile(r'\bbuild\s+' + str(n) + r'\b', re.I)
    for line in out.splitlines():
        sha, _, subj = line.partition('|')
        if pat.search(subj):
            return sha, subj
    return None, None


def materialise(sha, filename, tmpdir):
    dst = os.path.join(tmpdir, f'{filename}.{sha[:8]}')
    r = subprocess.run(['git', 'show', f'{sha}:{filename}'],
                       cwd=REPO, capture_output=True)
    if r.returncode != 0:
        return None
    with open(dst, 'wb') as f:
        f.write(r.stdout)
    return dst


def run_gate(gate, target, label, timeout):
    """Returns (state, tail). state is GREEN | RED | CRASH | TIMEOUT.

    A crash is NOT a red. BUG_CLASSES 37: a control that dies before printing a
    line has proved nothing, and reading it as 'not green' is how five sessions
    lost a round."""
    cmd = ['node', gate] + ([target, label] if target else [])
    try:
        p = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True,
                           timeout=timeout)
    except subprocess.TimeoutExpired:
        return 'TIMEOUT', f'no verdict within {timeout}s'
    out = (p.stdout or '') + (p.stderr or '')
    lines = [l for l in out.strip().splitlines() if l.strip()]
    last = lines[-1].strip() if lines else '(no output)'
    if last == 'GREEN':
        return 'GREEN', ''
    if last == 'RED':
        fails = [l.strip() for l in lines if l.strip().startswith('FAIL')]
        return 'RED', f'{len(fails)} named failure(s)'
    # neither verdict printed: it died before reporting
    return 'CRASH', last[:150]


def selftest(timeout):
    """Prove this script can FAIL, three ways. `next_build.py --self-test` and
    `gate_ship.py --selftest` set the precedent: a tool that has never been seen
    to report a problem is not evidence of anything."""
    ok = True

    # 1. a control that is GREEN must be reported as a problem, not a pass.
    #    Point a gate at the very artifact it was written for: it will pass, and
    #    a passing control means the gate proves nothing.
    gates = gates_in_range(0, 10**9)
    if not gates:
        print('selftest: no gates found'); return 1
    n, path = gates[-1]
    art = artifact_for(path)
    state, _ = run_gate(path, os.path.join(REPO, art), 'SELFTEST', timeout)
    print(f'  1 gate_{n} against its OWN artifact -> {state}'
          f'   (a control must be RED; GREEN here means the gate cannot fail)')
    ok &= (state == 'GREEN')          # it SHOULD pass, which the sweep flags as bad
    if state != 'GREEN':
        print(f'    unexpected: got {state}, so this check proved nothing')

    # 2. a gate that dies before printing a verdict is CRASH, never RED.
    with tempfile.TemporaryDirectory() as d:
        junk = os.path.join(d, 'not-an-app.html')
        open(junk, 'w').write('<!doctype html><html><body></body></html>')
        cstate, note = run_gate(path, junk, 'SELFTEST', timeout)
        print(f'  2 gate_{n} against an EMPTY page -> {cstate}   {note[:60]}')
        ok &= cstate in ('CRASH', 'RED', 'TIMEOUT')
        if cstate == 'GREEN':
            print('    FAIL: a gate went green against an empty page')
            ok = False

    # 3. the artifact sniffer must not assume index.html
    supp = [g for g in gates if artifact_for(g[1]) == 'supplement.html']
    print(f'  3 gates sniffed as gating supplement.html: '
          f'{[n for n, _ in supp] or "(none)"}')
    ok &= bool(supp)
    if not supp:
        print('    FAIL: expected at least gate_968 to name supplement.html')

    print('\nselftest ' + ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--selftest', action='store_true',
                    help='prove this script can report a problem')
    ap.add_argument('--from', dest='lo', type=int)
    ap.add_argument('--to', dest='hi', type=int)
    ap.add_argument('--controls', action='store_true',
                    help='also run each gate against the previous build, from git')
    ap.add_argument('--timeout', type=int, default=200)
    a = ap.parse_args()

    if a.selftest:
        return selftest(a.timeout)
    if a.lo is None or a.hi is None:
        ap.error('--from and --to are required unless --selftest')

    gates = gates_in_range(a.lo, a.hi)
    if not gates:
        print(f'no gate_NNN.mjs in {a.lo}..{a.hi}')
        return 1

    print(f'gate_sweep  builds {a.lo}-{a.hi}  ({len(gates)} gates)  repo={REPO}\n')
    hdr = f'{"gate":<10}{"artifact":<17}{"on HEAD":<10}'
    if a.controls:
        hdr += f'{"on prev":<10}control'
    print(hdr)
    print('-' * (len(hdr) + 24))

    bad = 0
    tmp = tempfile.mkdtemp(prefix='gate_sweep_')
    for n, path in gates:
        art = artifact_for(path)
        state, note = run_gate(path, None, None, a.timeout)
        colour = OK if state == 'GREEN' else BAD
        row = f'gate_{n:<5}{art:<17}{colour}{state:<10}{END}'

        if a.controls:
            sha, subj = commit_for_build(n - 1)
            if not sha:
                row += f'{WARN}{"n/a":<10}{END}{DIM}no commit names build {n-1}{END}'
            else:
                ctrl = materialise(sha, art, tmp)
                if not ctrl:
                    row += f'{WARN}{"n/a":<10}{END}{DIM}{art} absent at {sha[:8]}{END}'
                else:
                    cstate, cnote = run_gate(path, ctrl, f'CTRL-{n-1}', a.timeout)
                    # RED is the PASS condition for a control
                    ccol = OK if cstate == 'RED' else BAD
                    row += f'{ccol}{cstate:<10}{END}{DIM}{sha[:8]} {cnote}{END}'
                    if cstate != 'RED':
                        bad += 1
        print(row)
        if state != 'GREEN':
            bad += 1
            if note:
                print(f'          {DIM}{note}{END}')

    print()
    if bad:
        print(f'{BAD}{bad} problem(s).{END} A gate red on HEAD is a regression; a control '
              f'that is GREEN, CRASH or TIMEOUT proves nothing and must be repaired.')
    else:
        print(f'{OK}All gates green on HEAD and red on their own control.{END}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
