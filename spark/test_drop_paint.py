#!/usr/bin/env python3
"""Harness for --drop-paint — `python3 test_drop_paint.py`.

WHY THIS MODE EXISTS
    602 removed paint_deterioration on the reasoning that paint is a condition,
    not a location, so each box should be reassigned to the surface it is
    peeling off — assumed to be soffit/fascia or siding.

    Reviewing the real photographs killed that assumption. The first seven boxes
    were on decking, windows, roofs and leaks, and three that WERE on
    soffit/fascia/siding duplicated a box already annotated there. Not one
    warranted reassignment. paint_deterioration had been used as a junk drawer.

    So the boxes are deleted rather than re-homed, and the human gate — 128
    rulings, a review page, a suggester — disappears with them.

TWO ENTRY STATES, AND THE SECOND IS THE REAL ONE
    A · fresh dataset: paint boxes are still class 24.
    B · already parked: pass one has run, the marker exists and the boxes sit on
        the 99 sentinel. THIS IS WHERE THE LIVE DATASET IS.

    B must work without restoring 473 .pre602 backups first, and must not
    re-shift the indices of everything else — the double-apply bug this script
    already had once. Case B2 below is that assertion.

Writes only into a temp directory.
"""
import os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REMAP = os.path.join(HERE, 'remap_taxonomy_602.py')

SOFFIT, FASCIA, SIDING, PAINT, INTERIOR = 19, 20, 21, 24, 32
SENTINEL = 99

YAML = 'path: /x\ntrain: images/train\nval: images/val\nnc: 33\nnames:\n  - hail_impact\n'


def run(*a):
    p = subprocess.run([sys.executable, REMAP] + list(a), capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def build(ds):
    lab = os.path.join(ds, 'labels', 'train')
    os.makedirs(lab)
    # a.txt — paint sits between two keepers, with a blank line above it
    with open(os.path.join(lab, 'a.txt'), 'w') as fh:
        fh.write('%d 0.5 0.5 0.2 0.2\n\n%d 0.4 0.4 0.1 0.1\n%d 0.3 0.3 0.1 0.1\n'
                 % (SOFFIT, PAINT, INTERIOR))
    # b.txt — paint is the ONLY box; the file must end up empty
    with open(os.path.join(lab, 'b.txt'), 'w') as fh:
        fh.write('%d 0.5 0.5 0.1 0.1\n' % PAINT)
    # c.txt — no paint at all; must be remapped but never emptied
    with open(os.path.join(lab, 'c.txt'), 'w') as fh:
        fh.write('%d 0.5 0.5 0.1 0.1\n' % SIDING)
    with open(os.path.join(ds, 'data.yaml'), 'w') as fh:
        fh.write(YAML)
    return lab


def classes(path):
    out = []
    for raw in open(path):
        if raw.strip():
            out.append(int(raw.split()[0]))
    return out


def check(name, got, want):
    if got != want:
        print('FAIL  %s\n  expected %r\n  got      %r' % (name, want, got))
        return False
    print('ok    %s  -> %r' % (name, got))
    return True


def main():
    ok = True

    # ---- A · fresh dataset, drop in one pass ------------------------------
    with tempfile.TemporaryDirectory() as ds:
        lab = build(ds)
        rc, log = run('--root', ds, '--drop-paint', '--apply')
        if rc != 0:
            print('FAIL  A exited %d\n%s' % (rc, log)); return 1

        ok &= check('A a.txt keeps soffit(19) + interior(32->30), paint gone',
                    classes(os.path.join(lab, 'a.txt')), [19, 30])
        ok &= check('A b.txt emptied', classes(os.path.join(lab, 'b.txt')), [])
        ok &= check('A c.txt siding 21->20', classes(os.path.join(lab, 'c.txt')), [20])

        body = open(os.path.join(lab, 'a.txt')).read().split('\n')
        if body[1].strip() != '':
            print('FAIL  A blank line at 2 was consumed: %r' % body[1]); ok = False
        else:
            print('ok    A blank line preserved through the deletion')

        # Two paint boxes in the fixture: one in a.txt, one in b.txt. c.txt has
        # none. (An earlier revision of this harness asserted 3 and went red
        # against correct code -- count the fixture, do not guess it.)
        if '2 paint boxes DELETED' not in log:
            print('FAIL  A did not report 2 deletions\n%s' % log); ok = False
        else:
            print('ok    A reported the deletions')
        if 'label files now have no boxes' not in log:
            print('FAIL  A did not warn about the emptied file'); ok = False
        else:
            print('ok    A warned about the emptied file')
        if os.path.exists(os.path.join(ds, 'paint_review.tsv')):
            print('FAIL  A wrote a paint_review.tsv; there is nothing to review'); ok = False
        else:
            print('ok    A wrote no paint_review.tsv')
        if 'nc: 31' not in open(os.path.join(ds, 'data.yaml')).read():
            print('FAIL  A left data.yaml un-rewritten'); ok = False
        else:
            print('ok    A rewrote data.yaml to nc: 31')

    # ---- B · already parked, drop the sentinels ---------------------------
    with tempfile.TemporaryDirectory() as ds:
        lab = build(ds)
        rc, log = run('--root', ds, '--apply')                 # pass one: park
        if rc != 0:
            print('FAIL  B pass one exited %d\n%s' % (rc, log)); return 1
        parked = classes(os.path.join(lab, 'a.txt'))
        ok &= check('B pass one parked paint on 99', parked, [19, SENTINEL, 30])

        rc, log = run('--root', ds, '--drop-paint', '--apply')  # drop, no restore
        if rc != 0:
            print('FAIL  B drop exited %d\n%s' % (rc, log)); return 1

        # B2 — THE ASSERTION THAT MATTERS. The keepers must be untouched, not
        # shifted a second time. A double-shift would give [19, 28] here.
        ok &= check('B2 keepers NOT re-shifted after dropping the sentinel',
                    classes(os.path.join(lab, 'a.txt')), [19, 30])
        ok &= check('B c.txt still 20, not shifted again',
                    classes(os.path.join(lab, 'c.txt')), [20])
        if 'nc: 31' not in open(os.path.join(ds, 'data.yaml')).read():
            print('FAIL  B left data.yaml un-rewritten'); ok = False
        else:
            print('ok    B rewrote data.yaml once the sentinels were gone')

    # ---- C · the two modes are mutually exclusive -------------------------
    with tempfile.TemporaryDirectory() as ds:
        build(ds)
        open(os.path.join(ds, 'p.tsv'), 'w').write('labels/train/a.txt\t3\t19\n')
        rc, log = run('--root', ds, '--drop-paint', '--paint',
                      os.path.join(ds, 'p.tsv'), '--apply')
        if rc == 0 or 'opposites' not in log:
            print('FAIL  C allowed --drop-paint with --paint\n%s' % log); ok = False
        else:
            print('ok    C refused --drop-paint together with --paint')

    # ---- D · dry run deletes nothing --------------------------------------
    with tempfile.TemporaryDirectory() as ds:
        lab = build(ds)
        before = open(os.path.join(lab, 'a.txt')).read()
        rc, log = run('--root', ds, '--drop-paint')
        if rc != 0:
            print('FAIL  D exited %d\n%s' % (rc, log)); return 1
        if open(os.path.join(lab, 'a.txt')).read() != before:
            print('FAIL  D dry run modified a label file'); ok = False
        elif 'nothing deleted yet' not in log:
            print('FAIL  D did not say it was a dry run\n%s' % log); ok = False
        else:
            print('ok    D dry run reported but wrote nothing')

    print('\n%s' % ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
