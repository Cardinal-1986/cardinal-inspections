#!/usr/bin/env python3
"""gate_dupes.py — the DUPLICATION gate. Standing, not per-build.

WHY. This app's most expensive recurring bug class is a concept acquiring a
second implementation: `openEditor` is defined FIVE times, `money()` ELEVEN,
three `var LABEL` maps (two byte-identical), two Estimates screens, two punch
pipelines. None of those was a decision — each was a delay-fused bug that
began the day a name quietly gained a definition, and nothing mechanical has
ever watched for that moment. This gate does exactly one thing: it fails when
a function name has MORE definitions than the committed baseline says it may.

WHAT COUNTS AS A DEFINITION (in CODE only — the lexer masks strings, template
literals and comments, per CLAUDE.md's counting doctrine):
    function NAME(            declarations and named expressions
    var/let/const NAME = function        (async included)
    var/let/const NAME = (...) =>        and single-param arrows

THE BASELINE (`dupes_baseline.json`, committed beside this file) stores ONLY
the names already defined 2+ times — the grandfathered duplicates. The rules:
  * a name at 1 definition is not stored; if it reaches 2, it is not in the
    baseline and the gate goes RED — that is the openEditor birth moment.
  * a stored name may not EXCEED its baseline count.
  * a stored name falling BELOW its count is an improvement: reported, still
    green, with a prompt to --rebaseline so the ratchet tightens.
A red here is not always a bug — a new module legitimately carrying its own
scoped helper (the `esc()` idiom) trips it too. That is by design: the gate
converts silent duplication into an explicit decision. Either point the code
at the existing definition, or run --rebaseline and say why in the commit.

Usage:
    python3 gate_dupes.py [index.html]      # gate against the baseline
    python3 gate_dupes.py --rebaseline      # accept current counts
    python3 gate_dupes.py --selftest        # prove it can fail
Exit: 0 green · 1 red · 2 usage/missing input.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from jslex_count import lex_spans, CODE

BASELINE = os.path.join(HERE, 'dupes_baseline.json')

DEF_RES = [
    re.compile(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\('),
    re.compile(r'\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b'),
    re.compile(r'\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^()\n]*\)\s*=>'),
    re.compile(r'\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?[A-Za-z_$][\w$]*\s*=>'),
]

def script_blocks(html):
    """Inline <script> bodies (no src=), with their ids for reporting."""
    out = []
    for m in re.finditer(r'<script\b([^>]*)>', html):
        attrs = m.group(1)
        if re.search(r'\bsrc\s*=', attrs): continue
        ty = re.search(r'type\s*=\s*["\']([^"\']+)', attrs)
        if ty and 'javascript' not in ty.group(1) and ty.group(1) != 'module': continue
        end = html.find('</script>', m.end())
        if end == -1: continue
        mid = re.search(r'id\s*=\s*["\']([^"\']+)', attrs)
        out.append((mid.group(1) if mid else f'@{m.start()}', html[m.end():end]))
    return out

def masked_code(js):
    """js with every non-CODE span blanked, same length — offsets survive."""
    spans = lex_spans(js)
    buf = list(js)
    for a, b, st in spans:
        if st != CODE:
            for i in range(a, b):
                if buf[i] != '\n': buf[i] = ' '
    return ''.join(buf)

def count_defs(html):
    counts, where = {}, {}
    for bid, js in script_blocks(html):
        code = masked_code(js)
        for rx in DEF_RES:
            for m in rx.finditer(code):
                n = m.group(1)
                counts[n] = counts.get(n, 0) + 1
                where.setdefault(n, []).append(bid)
    return counts, where

def selftest():
    """The gate must be seen red before a clean run means anything."""
    mk = lambda body: f'<script>{body}</script>'
    bad = []
    def case(name, html, base, want_red):
        counts, _ = count_defs(html)
        red = bool(judge(counts, base)[0])
        if red != want_red: bad.append(f'{name}: wanted {"RED" if want_red else "green"}, got {"RED" if red else "green"}')
    case('a second definition of a fresh name is RED',
         mk('function foo(){}') + mk('function foo(){}'), {}, True)
    case('growth past baseline is RED',
         mk('function m(){}function m(){}function m(){}'), {'m': 2}, True)
    case('at baseline is green',
         mk('function m(){}') + mk('function m(){}'), {'m': 2}, False)
    case('below baseline is green (improvement)',
         mk('function m(){}'), {'m': 2}, False)
    case('a definition inside a comment does not count',
         mk('function q(){}/* function q(){} */'), {}, False)
    case('a definition inside a template string does not count',
         mk('function q(){}var t=`function q(){}`;'), {}, False)
    case('var NAME = function counts',
         mk('var z=function(){};') + mk('var z=function(){};'), {}, True)
    case('arrow assignment counts',
         mk('const w=(a)=>a;') + mk('const w=x=>x;'), {}, True)
    for b in bad: print('  MISSORTED', b)
    print('SELFTEST', 'FAIL' if bad else 'PASS', f'({8-len(bad)}/8)')
    return 1 if bad else 0

def judge(counts, base):
    reds, improved = [], []
    for n, c in counts.items():
        if c < 2: continue
        b = base.get(n, 1)
        if c > b: reds.append((n, b, c))
    for n, b in base.items():
        c = counts.get(n, 0)
        if c < b: improved.append((n, b, c))
    return reds, improved

def main():
    args = [a for a in sys.argv[1:]]
    if '--selftest' in args: sys.exit(selftest())
    rebase = '--rebaseline' in args
    paths = [a for a in args if not a.startswith('--')]
    path = paths[0] if paths else os.path.join(HERE, '..', '..', '..', '..', 'index.html')
    if not os.path.exists(path):
        print(f'gate_dupes: no such file {path}'); sys.exit(2)
    html = open(path, encoding='utf8').read()
    counts, where = count_defs(html)
    dupes = {n: c for n, c in counts.items() if c >= 2}

    if rebase:
        with open(BASELINE, 'w') as fh:
            json.dump(dict(sorted(dupes.items())), fh, indent=1)
        print(f'baseline written: {len(dupes)} names with 2+ definitions '
              f'(of {len(counts)} total); worst: ' +
              ', '.join(f'{n} x{c}' for n, c in sorted(dupes.items(), key=lambda x: -x[1])[:8]))
        sys.exit(0)

    if not os.path.exists(BASELINE):
        print('gate_dupes: no baseline — run --rebaseline once and commit it'); sys.exit(2)
    base = json.load(open(BASELINE))
    reds, improved = judge(counts, base)

    for n, b, c in sorted(reds):
        blocks = sorted(set(where.get(n, [])))
        print(f'  RED  {n}: {b} definition(s) allowed, now {c} — in ' + ', '.join(blocks[:6]))
    for n, b, c in sorted(improved)[:10]:
        print(f'  better: {n} {b} -> {c} (run --rebaseline to lock it in)')
    print(f'{len(counts)} named definitions scanned · {len(dupes)} names at 2+ · '
          f'{len(reds)} over baseline · {len(improved)} improved')
    print('GATE DUPES', 'RED' if reds else 'GREEN',
          '— a name gained a definition; reuse it or --rebaseline WITH A REASON' if reds else '')
    sys.exit(1 if reds else 0)

if __name__ == '__main__':
    main()
