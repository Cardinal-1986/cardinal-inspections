#!/usr/bin/env python3
"""End-to-end harness for suggest_paint_surface.py — `python3 test_suggest_paint.py`.

Runs the REAL remap and the REAL suggester over a constructed split-layout
dataset, then feeds the suggester's output straight back into the remap's
--paint parser. That last step is the point of the whole harness: the remap
parses its TSV with

    p, ln, cls = raw.split('\\t')

which is exactly three fields and raises an unhandled ValueError on a fourth.
Any evidence the suggester writes therefore has to live in '#' lines, and a
harness that only checked the suggestions would not have caught it.

Five cases, each with a geometry chosen so the right answer is not in doubt:

    A  paint fully inside siding                 -> 20
    B  paint fully inside soffit/fascia          -> 19
    C  no surface box on the image               -> refused
    D  paint straddling both, 0.50 / 0.50        -> refused (split)
    E  surface box present but no overlap        -> refused (weak)

No network, no real photographs; writes only into a temp directory.
"""
import os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REMAP = os.path.join(HERE, 'remap_taxonomy_602.py')
SUGGEST = os.path.join(HERE, 'suggest_paint_surface.py')

# OLD indices — the fixture is pre-remap
SOFFIT, FASCIA, SIDING, PAINT = 19, 20, 21, 24

CASES = {
    # A — paint (0.45..0.55) inside siding (0.20..0.80)
    'a.txt': [(SIDING, .5, .5, .6, .6), (PAINT, .5, .5, .1, .1)],
    # B — paint inside soffit band (0.20..0.80 x 0.10..0.30)
    'b.txt': [(SOFFIT, .5, .2, .6, .2), (PAINT, .5, .2, .1, .05)],
    # C — paint alone
    'c.txt': [(PAINT, .5, .5, .1, .1)],
    # D — paint (0.40..0.60) straddling soffit (left half) and siding (right half)
    'd.txt': [(SOFFIT, .25, .5, .5, 1.0), (SIDING, .75, .5, .5, 1.0),
              (PAINT, .5, .5, .2, .2)],
    # E — siding in one corner, paint in the other, zero intersection
    'e.txt': [(SIDING, .1, .1, .2, .2), (PAINT, .6, .6, .2, .2)],
}


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def main():
    ok = True
    with tempfile.TemporaryDirectory() as ds:
        lab = os.path.join(ds, 'labels', 'train')
        os.makedirs(lab)
        for name, boxes in CASES.items():
            with open(os.path.join(lab, name), 'w') as fh:
                for c, cx, cy, w, h in boxes:
                    fh.write('%d %.6f %.6f %.6f %.6f\n' % (c, cx, cy, w, h))

        rc, log = run([sys.executable, REMAP, '--root', ds, '--apply'])
        if rc != 0:
            print('FAIL  remap pass one exited %d\n%s' % (rc, log)); return 1
        tsv = os.path.join(ds, 'paint_review.tsv')
        if not os.path.exists(tsv):
            print('FAIL  pass one wrote no paint_review.tsv\n%s' % log); return 1
        print('ok    remap pass one wrote paint_review.tsv')

        rc, log = run([sys.executable, SUGGEST, '--tsv', tsv, '--root', ds])
        if rc != 0:
            print('FAIL  suggester exited %d\n%s' % (rc, log)); return 1
        out = os.path.join(ds, 'paint_review.suggested.tsv')
        body = open(out).read()
        print('ok    suggester wrote paint_review.suggested.tsv')

        live = {}
        for line in body.splitlines():
            if not line.strip() or line.startswith('#'):
                continue
            p, ln, cls = line.split('\t')
            live[os.path.basename(p)] = int(cls)

        want = {'a.txt': 20, 'b.txt': 19}
        refused = {'c.txt', 'd.txt', 'e.txt'}
        for f, exp in want.items():
            if live.get(f) != exp:
                print('FAIL  %s suggested %r, expected %d' % (f, live.get(f), exp)); ok = False
            else:
                print('ok    %s -> %d' % (f, exp))
        for f in refused:
            if f in live:
                print('FAIL  %s was guessed (%d); it should have been refused' % (f, live[f])); ok = False
            else:
                print('ok    %s refused, left for a human' % f)

        for msg in ('no soffit_fascia or siding box', 'split:', 'weak:'):
            if msg not in body:
                print('FAIL  evidence line missing: %r' % msg); ok = False
        if ok:
            print('ok    evidence comments present for all three refusal reasons')

        # THE INTEGRATION CHECK — the suggester's own output must survive the
        # remap's 3-field parser. A 4th column here is an unhandled ValueError.
        rc, log = run([sys.executable, REMAP, '--root', ds, '--paint', out, '--apply'])
        if rc != 0:
            print('FAIL  remap rejected the suggested TSV (exit %d)\n%s' % (rc, log)); ok = False
        elif 'paint decisions loaded: 2' not in log:
            print('FAIL  remap did not load 2 decisions\n%s' % log); ok = False
        else:
            print('ok    remap parsed the suggested TSV and loaded 2 decisions')

    print('\n%s' % ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
