#!/usr/bin/env python3
"""audit_scrolllock.py — who locks the page, and can they all let go?

WHY. `document.body.style.overflow` is one global with no reconciler. Any module
may set it to 'hidden' to stop the page scrolling behind an overlay, and every
one of them must put it back. It leaks on any early return or throw between the
lock and the release, and the page then cannot scroll at all — on a phone, on a
roof. BUG_CLASSES records this class as having recurred three times.

CLAUDE.md carried "13 modules / 35 CODE sites" as an invariant and said the
no-14th-writer rule had held for 234 builds. Re-measured 30 Aug at build 1178:
**17 modules / 41 sites.** Nobody repealed the rule; nobody noticed. This script
is what should have been noticing.

WHAT IT CHECKS, and what it deliberately does not.
  Per module it pairs LOCKS (= 'hidden') against RELEASES (= '' or a computed
  value) and reports the balance. An imbalance is not automatically a bug — one
  release can legitimately serve two locks, and a module may release in a
  handler this cannot see — so the output is a REVIEW LIST ordered by risk, not
  a verdict. The one thing it does assert is the roster: a module that appears
  here and is not in the recorded roster is a NEW writer, and that is the thing
  the invariant exists to catch.

⚠ IT COUNTS WITH THE LEXER, NOT A REGEX. Naive comment-stripping answers 15
modules where the lexer answers 17 — measured, in the same hour, on this file.
`/*` inside a string is not a comment, and stripping on that basis eats real
calls. This is the project's own documented trap and it fires on this exact
needle.

Usage:
    python3 audit_scrolllock.py [index.html]     # the review list
    python3 audit_scrolllock.py --roster         # just the module names
    python3 audit_scrolllock.py --selftest       # prove it can fail
Exit: 0 roster unchanged · 1 a NEW writer appeared · 2 usage.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gate_dupes import script_blocks
import jslex_count as JL

NEEDLE = 'document.body.style.overflow'
ROSTER = os.path.join(HERE, 'scrolllock_roster.json')


def code_hits(js):
    """Every NEEDLE occurrence that the LEXER says is real code.

    ⚠ `JL.CODE` is the integer 0, not the string 'code'. The first version of
    this compared against 'code', which is never true, so every hit was
    discarded and the audit reported ZERO writers — a completely clean sheet on
    a file with 41 of them. The selftest caught it on the first run; nothing
    else would have, because "no leaks found" is exactly what a working audit
    of a healthy file would print. Compare against the constant, never a
    guessed spelling of it."""
    spans = JL.lex_spans(js)
    out = []
    for m in re.finditer(re.escape(NEEDLE), js):
        if JL.classify(js, m.start(), spans) == JL.CODE:
            out.append(m.start())
    return out


def kind_at(js, pos):
    """lock / release / read, from the assignment that follows the needle."""
    tail = js[pos + len(NEEDLE): pos + len(NEEDLE) + 60]
    if not re.match(r"\s*=(?!=)", tail):
        return 'read'                      # a comparison, e.g. the block-1 self-heal
    val = tail.split('=', 1)[1]
    if re.match(r"\s*['\"]hidden['\"]", val):
        return 'lock'
    if re.match(r"\s*['\"]{2}|\s*['\"]\s*['\"]", val):
        return 'release'
    return 'computed'                      # a ternary: releases on one branch


def stable_ids(blocks):
    """script_blocks names an un-id'd block `@<character offset>`. That is fine
    for reporting inside one run and USELESS as an identity across builds.

    ⚠ IT COST A FALSE RED THE FIRST TIME THE FILE GREW. Build 1183 added ~1 KB
    of CSS ahead of the main block and the roster went from `@662628` to
    `@664105` — the same block, renamed by arithmetic, reported as "a NEW module
    started writing the global scroll lock" beside "gone: @662628". A standing
    gate that cries wolf on every build that adds a byte is a gate people learn
    to skip, which is exactly how the thing it guards comes back.

    Un-id'd blocks are keyed by their ORDINAL among un-id'd blocks instead, so
    the name only moves if a script block is genuinely added or removed ahead of
    it — which is itself worth a red."""
    out, n = [], 0
    for bid, js in blocks:
        if bid.startswith('@'):
            out.append((f'@unnamed#{n}', js)); n += 1
        else:
            out.append((bid, js))
    return out


def scan(html):
    mods = {}
    for bid, js in stable_ids(script_blocks(html)):
        hits = code_hits(js)
        if not hits:
            continue
        rec = {'lock': 0, 'release': 0, 'computed': 0, 'read': 0, 'sites': len(hits)}
        for p in hits:
            rec[kind_at(js, p)] += 1
        mods[bid] = rec
    return mods


def risk(r):
    """Locks that no release in the same module can answer for."""
    return r['lock'] - (r['release'] + r['computed'])


def main():
    args = sys.argv[1:]
    if '--selftest' in args:
        sys.exit(selftest())
    paths = [a for a in args if not a.startswith('--')]
    path = paths[0] if paths else os.path.join(HERE, '..', '..', '..', '..', 'index.html')
    if not os.path.exists(path):
        print('audit_scrolllock: no such file ' + path); sys.exit(2)
    mods = scan(open(path, encoding='utf8').read())

    if '--roster' in args:
        print('\n'.join(sorted(mods)))
        sys.exit(0)

    total_sites = sum(m['sites'] for m in mods.values())
    print(f'{len(mods)} modules write the global scroll lock · {total_sites} code sites\n')
    print(f'{"module":<26} {"lock":>5} {"rel":>5} {"calc":>5} {"read":>5}   balance')
    print('-' * 68)
    for bid in sorted(mods, key=lambda b: (-risk(mods[b]), b)):
        r = mods[bid]
        d = risk(r)
        flag = '  <-- more locks than releases, READ IT' if d > 0 else ''
        print(f'{bid:<26} {r["lock"]:>5} {r["release"]:>5} {r["computed"]:>5} {r["read"]:>5}   {d:+d}{flag}')

    print('\nA positive balance is a REVIEW ITEM, not a verdict: one release can serve two')
    print('locks, and a release can live in a handler this cannot see. A NEGATIVE balance is')
    print('normal and healthy — modules release defensively on close paths they did not lock.')

    known = []
    if os.path.exists(ROSTER):
        try:
            known = json.load(open(ROSTER))['modules']
        except Exception:
            known = []
    if not known:
        print(f'\nNO ROSTER YET — writing {os.path.basename(ROSTER)} with the current {len(mods)}.')
        json.dump({'note': 'modules writing document.body.style.overflow. A NEW name here is the '
                           'thing the no-new-writer rule exists to catch. See audit_scrolllock.py.',
                   'modules': sorted(mods)}, open(ROSTER, 'w'), indent=2)
        sys.exit(0)

    new = sorted(set(mods) - set(known))
    gone = sorted(set(known) - set(mods))
    for g in gone:
        print(f'  gone: {g} no longer writes the lock (--roster to re-record)')
    if new:
        for n in new:
            print(f'  NEW WRITER: {n} — check BUG_CLASSES before this ships')
        print(f'\nAUDIT RED — {len(new)} module(s) started writing the global scroll lock')
        sys.exit(1)
    print(f'\nAUDIT GREEN — roster unchanged at {len(known)} modules')
    sys.exit(0)


def selftest():
    """The classifier must sort all four shapes, and the roster must go red."""
    bad = []
    js = ("function a(){ document.body.style.overflow = 'hidden'; }\n"
          "function b(){ document.body.style.overflow = ''; }\n"
          "function c(){ document.body.style.overflow = x ? 'hidden' : ''; }\n"
          "if(document.body.style.overflow === 'hidden'){}\n"
          "/* document.body.style.overflow = 'hidden'; a comment, not a lock */\n"
          "var s = \"document.body.style.overflow = 'hidden'\";\n")
    hits = code_hits(js)
    kinds = [kind_at(js, p) for p in hits]
    if kinds.count('lock') != 1:     bad.append(f'lock miscounted: {kinds}')
    if kinds.count('release') != 1:  bad.append(f'release miscounted: {kinds}')
    if kinds.count('computed') != 1: bad.append(f'computed miscounted: {kinds}')
    if kinds.count('read') != 1:     bad.append(f'read miscounted: {kinds}')
    if len(hits) != 4:
        bad.append(f'the lexer let prose through: {len(hits)} code hits, wanted 4 '
                   f'(a bare regex would say 6)')
    if risk({'lock': 3, 'release': 1, 'computed': 0}) != 2:
        bad.append('risk() does not add up')
    if risk({'lock': 1, 'release': 1, 'computed': 0}) != 0:
        bad.append('a balanced module did not read as balanced')
    # the false-red that actually happened: an un-id'd block must keep its name
    # when bytes are inserted ahead of it
    a = stable_ids([('@100', 'x'), ('cr-a-script', 'y'), ('@900', 'z')])
    b = stable_ids([('@412', 'x'), ('cr-a-script', 'y'), ('@1210', 'z')])
    if [n for n, _ in a] != [n for n, _ in b]:
        bad.append(f'un-id\'d block names still drift with file size: {[n for n,_ in a]} vs {[n for n,_ in b]}')
    if [n for n, _ in a] != ['@unnamed#0', 'cr-a-script', '@unnamed#1']:
        bad.append(f'unexpected stable naming: {[n for n,_ in a]}')
    for b in bad:
        print('  MISSORTED ' + b)
    print('SELFTEST ' + ('FAIL' if bad else 'PASS') +
          f' — 4 shapes sorted, 2 decoys ignored, risk() both directions, names stable')
    return 1 if bad else 0


if __name__ == '__main__':
    main()
