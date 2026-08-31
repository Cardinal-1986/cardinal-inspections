#!/usr/bin/env python3
"""gate_types.py — the TYPE gate. Standing, not per-build. tsc --checkJs, ratcheted.

WHY. Two live defects in one day were the same shape: a bare name that nothing
in scope defines, called inside a promise chain, throwing as an unhandled
rejection nobody sees. Build 1118 (isCommunityClient — the Estimates tile stuck
at "…") and build 1121 (fileName/extracted — the scope_reads history never once
wrote since 665). tsc's TS2304 "Cannot find name" is a mechanical detector for
exactly that class, and this gate runs it every build.

HOW IT MODELS THE APP. The inline <script> blocks share one global scope at
runtime, so they are checked CONCATENATED, not separately. `window.X = ...`
creates a global readable as bare `X`, so a globals.d.ts is GENERATED from the
artifact's own window-assignments (plus the CDN libs: supabase, Chart, Papa,
google, L) — without it, tsc reports ~400 false TS2304 on crTell/crAsk alone.

THE RATCHET. `types_baseline.json` (committed beside this file) stores the
error count PER TS CODE. A code's count may not grow; falling is reported and
green, with a prompt to --rebaseline so the ratchet tightens. Counts, not
sites: line numbers drift every build, so site-level pinning would be noise.
Known blind spot, accepted: a new error appearing while another of the SAME
code disappears is invisible — the trade for zero drift-churn.

Surviving TS2304s are printed IN FULL every run — that is the ReferenceError
class, and each one deserves eyes even when the count is flat. The 13
grandfathered ones are all the safe `typeof X === 'function'` guard idiom
(runtime-legal on an undeclared name); a bare-call newcomer hides among them
only until this printout is read.

Usage:
    python3 gate_types.py [index.html]     # gate against the baseline
    python3 gate_types.py --rebaseline     # accept current counts
    python3 gate_types.py --selftest       # prove it can fail
Exit: 0 green · 1 red · 2 usage/missing input/tsc absent.
"""
import json, os, re, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gate_dupes import script_blocks
import jslex_count as JL

BASELINE = os.path.join(HERE, 'types_baseline.json')
TSC = shutil.which('tsc')

TSCONFIG = {"compilerOptions": {"allowJs": True, "checkJs": True, "noEmit": True,
    "target": "es2020", "lib": ["es2020", "dom", "dom.iterable"],
    "strict": False, "noImplicitAny": False, "skipLibCheck": True},
    "files": ["globals.d.ts", "app.js"]}

WIN_ASSIGN = re.compile(r'window\.([A-Za-z_$][\w$]*)\s*=[^=]')


def _globals(blocks):
    """Names this artifact really assigns onto window — CODE hits only.

    ⚠ THIS USED TO SCAN THE RAW HTML WITH A BARE REGEX, and a bare regex cannot
    tell code from prose. A comment saying `window.Foo =` therefore INVENTED a
    global, and an invented global is not cosmetic here: this gate exists to
    catch TS2304 "Cannot find name", so a ghost declaration MASKS exactly the
    defect it was written for — a check quietly losing the ability to fail.

    It is not hypothetical. Build 1182 wrote a comment warning the next reader
    not to assign a name onto window; the warning's own text conjured the
    global and moved a real error into a different bucket.

    Measured at 1182 before the change: naive 193 names, lexer 193, zero
    ghosts — so this closed the hole without moving a single count."""
    out = set()
    for _bid, js in blocks:
        spans = JL.lex_spans(js)
        for m in WIN_ASSIGN.finditer(js):
            if JL.classify(js, m.start(), spans) == JL.CODE:
                out.add(m.group(1))
    return out


def build_workdir(html, d):
    blocks = script_blocks(html)
    parts = []
    for bid, js in blocks:
        parts.append(f'// ===== BLOCK {bid} =====')
        parts.append(js)
    open(os.path.join(d, 'app.js'), 'w', encoding='utf8').write('\n'.join(parts))
    names = sorted(_globals(blocks))
    decls = ['// GENERATED from the artifact: every window.X= assignment is a runtime global',
             'interface Window { [k: string]: any; }',
             'declare var supabase: any, Chart: any, Papa: any, google: any, L: any;']
    decls += [f'declare var {n}: any;' for n in names]
    open(os.path.join(d, 'globals.d.ts'), 'w').write('\n'.join(decls))
    with open(os.path.join(d, 'tsconfig.json'), 'w') as fh:
        json.dump(TSCONFIG, fh)
    return len(blocks), len(names)

def run_tsc(d):
    r = subprocess.run([TSC, '-p', 'tsconfig.json'], cwd=d,
                       capture_output=True, text=True, timeout=900)
    lines = (r.stdout + r.stderr).splitlines()
    errs = [l for l in lines if re.search(r'error TS\d+', l)]
    counts = {}
    for l in errs:
        code = re.search(r'error (TS\d+)', l).group(1)
        counts[code] = counts.get(code, 0) + 1
    return counts, errs

def check(html):
    d = tempfile.mkdtemp(prefix='gate_types_')
    try:
        nb, ng = build_workdir(html, d)
        counts, errs = run_tsc(d)
        # coverage floors — a shrunk extraction must be a failure, not a pass
        assert nb >= 100, f'only {nb} blocks extracted — extractor broke'
        assert ng >= 100, f'only {ng} window globals found — generator broke'
        return counts, errs
    finally:
        shutil.rmtree(d, ignore_errors=True)

def selftest():
    """The gate must be seen red before a clean run means anything."""
    if not TSC: print('SELFTEST FAIL (no tsc)'); return 1
    bad = []
    def run_case(name, body, base, want_red):
        d = tempfile.mkdtemp(prefix='gate_types_st_')
        try:
            open(os.path.join(d, 'app.js'), 'w').write(body)
            open(os.path.join(d, 'globals.d.ts'), 'w').write('declare var known: any;')
            with open(os.path.join(d, 'tsconfig.json'), 'w') as fh: json.dump(TSCONFIG, fh)
            counts, _ = run_tsc(d)
            red = any(c > base.get(k, 0) for k, c in counts.items())
            if red != want_red: bad.append(f'{name}: wanted {"RED" if want_red else "green"}, got counts {counts}')
        finally: shutil.rmtree(d, ignore_errors=True)
    run_case('a bare undefined call is TS2304 red', 'missingFn(1);', {}, True)
    run_case('a window-declared global is clean', 'known(1);', {}, False)
    run_case('grandfathered count is green', 'missingFn(1);', {'TS2304': 1}, False)
    run_case('growth past baseline is red', 'aX(1); bX(2);', {'TS2304': 1}, True)
    for b in bad: print('  MISSORTED', b)
    print('SELFTEST', 'FAIL' if bad else 'PASS', f'({4-len(bad)}/4)')
    return 1 if bad else 0

def main():
    if not TSC: print('gate_types: tsc not on PATH'); sys.exit(2)
    args = sys.argv[1:]
    if '--selftest' in args: sys.exit(selftest())
    rebase = '--rebaseline' in args
    paths = [a for a in args if not a.startswith('--')]
    path = paths[0] if paths else os.path.join(HERE, '..', '..', '..', '..', 'index.html')
    if not os.path.exists(path): print(f'gate_types: no such file {path}'); sys.exit(2)
    html = open(path, encoding='utf8').read()
    counts, errs = check(html)

    if rebase:
        with open(BASELINE, 'w') as fh: json.dump(dict(sorted(counts.items())), fh, indent=1)
        print(f'baseline written: {sum(counts.values())} errors across {len(counts)} codes: '
              + ', '.join(f'{k} x{v}' for k, v in sorted(counts.items(), key=lambda x: -x[1])[:6]))
        sys.exit(0)

    if not os.path.exists(BASELINE):
        print('gate_types: no baseline — run --rebaseline once and commit it'); sys.exit(2)
    base = json.load(open(BASELINE))
    reds = [(k, base.get(k, 0), c) for k, c in sorted(counts.items()) if c > base.get(k, 0)]
    improved = [(k, b, counts.get(k, 0)) for k, b in sorted(base.items()) if counts.get(k, 0) < b]

    print('surviving TS2304 (the ReferenceError class — read them, do not just count them):')
    t2304 = [e for e in errs if 'TS2304' in e]
    for e in t2304: print('   ', e.strip()[:150])
    if not t2304: print('    (none)')
    for k, b, c in reds: print(f'  RED  {k}: baseline {b}, now {c} (+{c-b})')
    for k, b, c in improved[:6]: print(f'  better: {k} {b} -> {c} (--rebaseline to lock in)')
    print(f'{sum(counts.values())} errors across {len(counts)} codes · {len(reds)} codes grew · {len(improved)} improved')
    print('GATE TYPES', 'RED — new type errors; fix them or --rebaseline WITH A REASON' if reds else 'GREEN')
    sys.exit(1 if reds else 0)

if __name__ == '__main__':
    main()
