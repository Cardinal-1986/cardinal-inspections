#!/usr/bin/env python3
"""rebase_renumber.py — merge main into the current branch and restamp the build.

Written after doing this by hand FIVE times on one PR (967 -> 989 -> 992 -> 994
-> 1006). Main moves faster than a PR waits for review, and each time it passes
the branch the app stamp falls below main's and gate_ship refuses to merge.

The two conflicts are always the same and are always structural:

  1. the app stamp   — keep OURS, restamped to the new number
  2. the CHANGELOG   — the array is DESCENDING, so our entry goes ABOVE main's
                       block. Both sides are kept: it is an append, not a
                       choice.

⚠ THE BUG THIS SCRIPT SHIPPED WITH, on its very first run. The first version
found the shared context row by INTERSECTING THE BUILD NUMBERS on each side.
That is unsound, and the case that breaks it is exactly the case this script
exists for: main had independently used 1006 for "Stage arrows: one tap, with
Undo" while this branch was stamped 1006 for the contract print fix. Same
number, different builds. The intersection called them the same row, DELETED
our entry as a duplicate, and renamed main's build to ours.

So an entry is matched by (number AND title), never by number alone, and OUR
entry is located by --title. A number on both sides with different titles is a
COLLISION and is reported rather than merged.

⚠ The renumber is ANCHORED, never a bare substitution. Every renumber so far has
turned up digit matches that are NOT build citations, and a blind replace would
corrupt the file:

    &#9989;  &#9923;  &#128992;  &#128994;   character entities
    z-index:9994                             a real z-index
    ...84T6994SL9xQ6...                      base64 image blobs

So: the script finds citations by their SHAPE (`build N`, `{ b:N,`, `/* N:`,
`⚠ N CORRECTION`), counts everything else, and asserts the non-citation total is
byte-identical before and after.

Usage:
  python3 rebase_renumber.py --old 1006 --new 1010 \\
        --title 'The printed contract shows all of its own words' [--apply]
Without --apply it prints what it would do and touches nothing.
"""
import argparse, re, subprocess, sys, os

ROOT = subprocess.check_output(['git','rev-parse','--show-toplevel'], text=True).strip()
IDX  = os.path.join(ROOT, 'index.html')

def sh(*a, **k):
    return subprocess.run(a, cwd=ROOT, text=True, capture_output=True, **k)

def entries(block):
    """[(number, title)] for a chunk of CHANGELOG lines."""
    return re.findall(r"\{ b:(\d+), d:'[^']*', t:'([^']*)'", block)

def resolve_conflicts(s, old, new, title):
    """Both conflicts, in file order. Returns (text, notes)."""
    notes = []
    pat = re.compile(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+\n', re.S)

    m = pat.search(s)
    if not m: raise SystemExit('no conflict found — did the merge actually conflict?')
    mine, theirs = m.group(1), m.group(2)
    b_mine  = re.search(r'build (\d+)', mine)
    b_their = re.search(r'build (\d+)', theirs)
    if not (b_mine and b_their): raise SystemExit('first conflict is not the app stamp')
    notes.append(f'stamp: ours {b_mine.group(1)} vs main {b_their.group(1)} -> {new}')
    s = s[:m.start()] + mine.replace('build '+b_mine.group(1), f'build {new}') + '\n' + s[m.end():]

    m = pat.search(s)
    if not m: raise SystemExit('second conflict (CHANGELOG) not found')
    mine, theirs = m.group(1), m.group(2)
    ours_e, theirs_e = entries(mine), entries(theirs)
    if title not in [t for _, t in ours_e]:
        raise SystemExit(f'our entry {title!r} is not on our side of the conflict — check --title')
    if title in [t for _, t in theirs_e]:
        raise SystemExit('main already carries our entry — this branch may already be merged')

    # a number on BOTH sides with DIFFERENT titles is a collision, not context
    for n_o, t_o in ours_e:
        for n_t, t_t in theirs_e:
            if n_o == n_t and t_o != t_t:
                notes.append(f'⚠ COLLISION: build {n_o} is ours ({t_o[:40]!r}) AND '
                             f'main\'s ({t_t[:40]!r}) — renumbering ours to {new}')
    shared = {(n, t) for n, t in ours_e} & {(n, t) for n, t in theirs_e}
    mine_lines = [l for l in mine.split('\n')
                  if not any(f'b:{n},' in l and t in l for n, t in shared)]
    mine_new = re.sub(r'\{ b:\d+,(?=[^}]*%s)' % re.escape(title),
                      '{ b:%d,' % new, '\n'.join(mine_lines), count=1)
    if f'b:{new},' not in mine_new:
        raise SystemExit('our entry was not renumbered — the title anchor did not match')
    notes.append(f'changelog: ours -> {new}; main keeps '
                 f'{sorted({n for n, _ in theirs_e}, key=int)} untouched'
                 + (f'; {len(shared)} shared context row(s) kept once' if shared else ''))
    s = s[:m.start()] + mine_new + '\n' + theirs + '\n' + s[m.end():]

    if '<<<<<<<' in s or '>>>>>>>' in s or '\n=======\n' in s:
        raise SystemExit('conflict markers remain — resolve by hand')
    return s, notes

CITATIONS = [
    (r'⚠ {old} CORRECTION',        '⚠ {new} CORRECTION'),
    (r'/\* {old}: ',               '/* {new}: '),
]

def renumber_citations(s, old, new):
    """Replace build citations by shape. Returns (text, changed, noncitation_count)."""
    def noncit(t):
        # every occurrence of the digits that is NOT one of our citation shapes
        total = len(re.findall(str(old), t))
        cited = len(re.findall(r'⚠ %d CORRECTION' % old, t)) \
              + len(re.findall(r'/\* %d: ' % old, t)) \
              + len(re.findall(r'build %d' % old, t)) \
              + len(re.findall(r'\{ b:%d,' % old, t))
        return total - cited
    before = noncit(s)
    changed = 0
    for pat, rep in CITATIONS:
        p = pat.format(old=old, new=new); r = rep.format(old=old, new=new)
        n = len(re.findall(p, s))
        s = re.sub(p, r, s); changed += n
    after = noncit(s)
    assert after == before, f'non-citation matches changed: {before} -> {after} — ABORT'
    return s, changed, before

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--old', type=int, required=True)
    ap.add_argument('--new', type=int, required=True)
    ap.add_argument('--title', required=True,
                    help="our CHANGELOG entry's exact t:'...' text — the anchor, "
                         'because the build NUMBER is not unique across branches')
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()

    if not a.apply:
        print(f'DRY RUN — would merge origin/main and renumber {a.old} -> {a.new}')
        print('(re-run with --apply)')
        return

    sh('git','fetch','origin','-q')
    r = sh('git','merge','origin/main','--no-edit')
    if 'CONFLICT' not in (r.stdout + r.stderr):
        print('merge produced no conflict — nothing to resolve; check the stamp by hand')
    s = open(IDX, encoding='utf-8').read()
    s, notes = resolve_conflicts(s, a.old, a.new, a.title)
    s, changed, noncit = renumber_citations(s, a.old, a.new)
    open(IDX,'w',encoding='utf-8').write(s)
    for n in notes: print(' ', n)
    print(f'  citations renumbered: {changed}')
    print(f'  non-citation "{a.old}" matches left untouched: {noncit}'
          '  (entities, base64, z-index — asserted unchanged)')
    print(f'\nNow: rename gate_{a.old}.mjs -> gate_{a.new}.mjs, update docs, run the gates.')

if __name__ == '__main__':
    main()

# ⚠ Not handled here, because it needs a human decision: a gate FILENAME
# collision. When main adds its own gate_<old>.mjs, git leaves it as `AA` and
# both files must be kept — main's under its own name, ours renamed. Check
# `git status` for AA entries after running this.
