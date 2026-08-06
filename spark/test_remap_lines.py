#!/usr/bin/env python3
"""Line-stability harness for remap_taxonomy_602.py — `python3 test_remap_lines.py`.

WHY THIS EXISTS
    The two-pass design addresses every paint box by (path, LINE NUMBER):
    pass one writes them into paint_review.tsv, a human fills in a surface, and
    pass two looks each one up again. That only works if line numbers survive
    pass one unchanged.

    They did not. read_boxes() skips blank lines, and the rewrite rebuilt each
    file from boxes alone, so a blank line vanished and every line below it
    shifted up — while the TSV still carried the pre-rewrite numbers. Pass two
    then looked up a line that had moved:

      · best case, the line no longer holds a sentinel, the decision is
        silently discarded and the box stays on 99;
      · worst case, in a file with more than one paint box, the shifted line
        lands on a DIFFERENT sentinel and the roofer's ruling for one box is
        applied to another. Silent mislabelling — the exact failure the whole
        park-on-99 design exists to prevent.

    The fixture below puts two paint boxes on either side of blank lines, so a
    one-line shift crosses them and the wrong-box case is what fails, not just
    the lost-decision case.

Writes only into a temp directory.
"""
import os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REMAP = os.path.join(HERE, 'remap_taxonomy_602.py')

#  ln  content                     role
#   1  19 soffit                   surface
#   2  (blank)                     the shifter
#   3  24 paint  A                 -> the human says 19
#   4  21 siding                   surface
#   5  (blank)                     another shifter
#   6  24 paint  B                 -> the human says 20
FIXTURE = (
    '19 0.50 0.20 0.60 0.20\n'
    '\n'
    '24 0.50 0.20 0.10 0.05\n'
    '21 0.50 0.70 0.60 0.40\n'
    '\n'
    '24 0.50 0.70 0.10 0.05\n'
)
PAINT_A_LINE, PAINT_B_LINE = 3, 6
SENTINEL = 99


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def lines_of(path):
    with open(path) as fh:
        return fh.read().split('\n')


def cls_at(path, ln):
    row = lines_of(path)[ln - 1].split()
    return int(row[0]) if row else None


def main():
    ok = True
    with tempfile.TemporaryDirectory() as ds:
        lab = os.path.join(ds, 'labels', 'train')
        os.makedirs(lab)
        target = os.path.join(lab, 'gaps.txt')
        with open(target, 'w') as fh:
            fh.write(FIXTURE)
        before = lines_of(target)

        rc, log = run([sys.executable, REMAP, '--root', ds, '--apply'])
        if rc != 0:
            print('FAIL  pass one exited %d\n%s' % (rc, log)); return 1

        after = lines_of(target)
        if len(after) != len(before):
            print('FAIL  line count changed: %d -> %d (blank lines dropped)'
                  % (len(before), len(after))); ok = False
        else:
            print('ok    line count stable (%d)' % len(after))

        for ln in (2, 5):
            if after[ln - 1].strip() != '':
                print('FAIL  line %d was blank, now %r' % (ln, after[ln - 1])); ok = False
        if ok:
            print('ok    blank lines preserved at 2 and 5')

        for ln in (PAINT_A_LINE, PAINT_B_LINE):
            got = cls_at(target, ln)
            if got != SENTINEL:
                print('FAIL  line %d should hold the %d sentinel, holds %r'
                      % (ln, SENTINEL, got)); ok = False
        if ok:
            print('ok    both paint boxes still on their original lines (%d, %d)'
                  % (PAINT_A_LINE, PAINT_B_LINE))

        tsv = os.path.join(ds, 'paint_review.tsv')
        claimed = []
        for raw in open(tsv):
            s = raw.strip()
            if s and not s.startswith('#'):
                parts = s.split('\t')
                claimed.append(int(parts[1]))
        if sorted(claimed) != [PAINT_A_LINE, PAINT_B_LINE]:
            print('FAIL  tsv claims lines %r, expected %r'
                  % (sorted(claimed), [PAINT_A_LINE, PAINT_B_LINE])); ok = False
        else:
            print('ok    paint_review.tsv points at the real post-rewrite lines')

        # Pass two: A -> 19 soffit_fascia, B -> 20 siding. If a shift had
        # occurred these would land on each other or on nothing at all.
        decisions = os.path.join(ds, 'decided.tsv')
        rel = os.path.relpath(target, ds)
        with open(decisions, 'w') as fh:
            fh.write('%s\t%d\t19\n%s\t%d\t20\n' % (rel, PAINT_A_LINE, rel, PAINT_B_LINE))

        rc, log = run([sys.executable, REMAP, '--root', ds,
                       '--paint', decisions, '--apply'])
        if rc != 0:
            print('FAIL  pass two exited %d\n%s' % (rc, log)); return 1

        got_a, got_b = cls_at(target, PAINT_A_LINE), cls_at(target, PAINT_B_LINE)
        if (got_a, got_b) != (19, 20):
            print('FAIL  after pass two lines (%d,%d) are (%r,%r), expected (19,20)'
                  % (PAINT_A_LINE, PAINT_B_LINE, got_a, got_b)); ok = False
        else:
            print('ok    pass two resolved each box to its own decision')

        if SENTINEL in (got_a, got_b):
            print('FAIL  a sentinel survived pass two'); ok = False

    print('\n%s' % ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
