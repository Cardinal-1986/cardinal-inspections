#!/usr/bin/env python3
"""Pre-fill paint_review.tsv from box overlap — `python3 suggest_paint_surface.py --tsv <file>`.

WHY THIS EXISTS
    remap_taxonomy_602.py pass one parks every paint_deterioration box on class
    99 and writes paint_review.tsv, one line per box, for a human to mark 19
    (soffit/fascia) or 20 (siding). On the real dataset that is 128 decisions.

    Paint is a CONDITION, not a location — it peels off whatever surface it is
    on. So the surface is usually already annotated on the same image, and the
    paint box usually sits inside it. That overlap is real evidence.

    Box POSITION is not. "High in the frame means soffit" fails on a two-storey
    elevation, a gable shot from a ladder, or any photograph taken looking up —
    which is most of them. This script does not use position.

WHAT IT WILL NOT DO
    It does not decide. Every suggestion carries the overlap that produced it,
    written as a # comment above the row, and the roofer overrules any of them
    by editing column 3. Where the evidence is weak or split, the row is
    emitted COMMENTED OUT rather than guessed — those boxes stay on class 99,
    the dataset stays untrainable, and the remap says so again on the next run.
    A silent default is the exact failure this whole two-pass design exists to
    prevent; a pre-fill that quietly invents 128 answers would reintroduce it.

    It never writes to the input TSV and never touches a label file.

WHEN TO RUN IT
    After pass one (--apply), which is what creates paint_review.tsv and moves
    the paint boxes to 99. At that point the label files carry NEW indices, so
    the surfaces to compare against are 19 soffit_fascia_damage and 20
    siding_damage.

    python3 remap_taxonomy_602.py --root DS --apply
    python3 suggest_paint_surface.py --tsv DS/paint_review.tsv
    #   read DS/paint_review.suggested.tsv, override anything you disagree with,
    #   uncomment and fill the rows it refused to guess
    python3 remap_taxonomy_602.py --root DS --paint DS/paint_review.suggested.tsv --apply

THE METRIC — the relation runs BOTH ways, and scoring one way missed 95 boxes
    contained = intersection / paint area    the paint sits inside the surface
    covers    = intersection / surface area  the surface sits inside the paint
    score     = max(contained, covers)

    The first version scored `contained` only. On the real dataset that decided
    16 of 128 and refused 95 as "weak" — because the commonest annotation here
    is the OPPOSITE geometry: a whole peeling elevation boxed as one paint
    region with a small siding box inside it. That is ~0.003 contained and 1.0
    covers. Scoring one direction threw the entire case away.

    IoU cannot substitute for either. iou <= contained ALWAYS, since the IoU
    denominator (paint + surface - intersection) is never smaller than paint
    alone — so anything `contained` misses, IoU misses too. It is reported
    for information, never scored on.

    Evidence prints at THREE decimals on purpose. At two, a paint box
    enclosing a small surface box (0.003) and a paint box touching nothing
    (0.000) both printed as 0.00, and those two need opposite answers.

    `covers` is the weaker claim of the two — a paint box spanning a whole
    elevation encloses every surface box on it — so a decision made that way
    is labelled `(via covers)` in the evidence for a closer look.
"""
import argparse, os, sys

SENTINEL = 99
SOFFIT_FASCIA = 19          # NEW index, post-remap
SIDING = 20                 # NEW index, post-remap
NAME = {SOFFIT_FASCIA: 'soffit_fascia', SIDING: 'siding'}


def die(m):
    sys.exit('suggest: ' + m)


def corners(cx, cy, w, h):
    return (cx - w / 2.0, cy - h / 2.0, cx + w / 2.0, cy + h / 2.0)


def inter_area(a, b):
    x0, y0 = max(a[0], b[0]), max(a[1], b[1])
    x1, y1 = min(a[2], b[2]), min(a[3], b[3])
    return max(0.0, x1 - x0) * max(0.0, y1 - y0)


def area(b):
    return max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])


def rank(t):
    """How strongly a surface box relates to the paint box, either direction."""
    return max(t[0], t[1])


def score(paint, surf):
    """(contained, covers, iou) — the relation runs BOTH ways.

    contained = intersection / paint area   : the paint sits inside the surface
    covers    = intersection / surface area : the surface sits inside the paint
    iou       = symmetric, reported only

    Scoring on `contained` alone missed an entire real geometry: a whole
    peeling elevation boxed as one paint region with a small siding box inside
    it scores ~0.003 contained and is refused, even though the surface is
    100% enclosed. IoU does not rescue it either — iou <= contained always
    (the IoU denominator is paint + surface - intersection, never smaller than
    paint alone), so anything `contained` cannot see, IoU cannot see either.
    Only the reverse ratio can.
    """
    i = inter_area(paint, surf)
    pa, sa = area(paint), area(surf)
    contained = i / pa if pa > 0 else 0.0
    covers = i / sa if sa > 0 else 0.0
    union = pa + sa - i
    return contained, covers, (i / union if union > 0 else 0.0)


def read_label(path):
    """-> {line_no: (cls, box)} for every parseable row."""
    out = {}
    with open(path) as fh:
        for ln, raw in enumerate(fh, 1):
            parts = raw.split()
            if len(parts) < 5:
                continue
            try:
                cls = int(parts[0])
                cx, cy, w, h = (float(v) for v in parts[1:5])
            except ValueError:
                continue
            out[ln] = (cls, corners(cx, cy, w, h))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tsv', required=True,
                    help='paint_review.tsv written by remap pass one')
    ap.add_argument('--out', default=None,
                    help='output path (default: <tsv dir>/paint_review.suggested.tsv)')
    ap.add_argument('--root', default=None,
                    help='dataset root for resolving relative paths (default: the tsv dir)')
    ap.add_argument('--min-contain', type=float, default=0.25,
                    help='below this the box is left for a human (default 0.25)')
    ap.add_argument('--margin', type=float, default=0.20,
                    help='winner must beat runner-up by this (default 0.20)')
    args = ap.parse_args()

    if not os.path.exists(args.tsv):
        die('no such file: %s' % args.tsv)
    root = args.root or os.path.dirname(os.path.abspath(args.tsv))
    out_path = args.out or os.path.join(os.path.dirname(os.path.abspath(args.tsv)),
                                        'paint_review.suggested.tsv')
    if os.path.abspath(out_path) == os.path.abspath(args.tsv):
        die('refusing to overwrite the input TSV')

    rows = []
    with open(args.tsv) as fh:
        for raw in fh:
            s = raw.strip()
            if not s or s.startswith('#'):
                continue
            parts = s.split('\t')
            if len(parts) < 2:
                die('not a paint_review row: %r' % s)
            rows.append((parts[0].strip(), int(parts[1])))
    if not rows:
        die('no rows in %s — did pass one run?' % args.tsv)

    cache, out, tally = {}, [], {'19': 0, '20': 0,
                                'no_surface': 0, 'weak': 0, 'split': 0}
    out.append('# paint_review.suggested.tsv — generated by suggest_paint_surface.py')
    out.append('# Column 3 is a SUGGESTION from box overlap, not a decision. Override freely.')
    out.append('# Rows starting with # were NOT guessed: uncomment and fill, or leave them')
    out.append('# and those boxes stay on class %d and the dataset stays untrainable.' % SENTINEL)
    out.append('#')

    for idx, (rel, ln) in enumerate(rows, 1):
        path = rel if os.path.isabs(rel) else os.path.join(root, rel)
        if not os.path.exists(path):
            # try the tsv-relative reading too before giving up
            alt = os.path.join(os.path.dirname(os.path.abspath(args.tsv)), rel)
            path = alt if os.path.exists(alt) else path
        if not os.path.exists(path):
            die('label file not found: %s (pass --root)' % rel)

        if path not in cache:
            cache[path] = read_label(path)
        boxes = cache[path]

        if ln not in boxes:
            die('%s has no row %d — is this TSV stale?' % (rel, ln))
        cls, paint = boxes[ln]
        if cls != SENTINEL:
            die('%s:%d is class %d, expected the %d sentinel. Run pass one first,\n'
                '       and do not run this against a pre-remap dataset.'
                % (rel, ln, cls, SENTINEL))

        best = {}
        for other_ln, (ocls, obox) in boxes.items():
            if other_ln == ln or ocls not in (SOFFIT_FASCIA, SIDING):
                continue
            c, v, i = score(paint, obox)
            # Record the class even at 0.0, so "there is no surface box on this
            # image" stays distinguishable from "there is one and the paint
            # does not touch it". Those are different messages and the second
            # one is the more suspicious of the two.
            prev = best.get(ocls)
            if prev is None or max(c, v) > max(prev[0], prev[1]):
                best[ocls] = (c, v, i)

        ZERO = (0.0, 0.0, 0.0)
        sf = best.get(SOFFIT_FASCIA, ZERO)
        sd = best.get(SIDING, ZERO)
        out.append('# --- %04d  %s line %d' % (idx, rel, ln))
        if not best:
            out.append('#      no soffit_fascia or siding box on this image — your call')
            out.append('#%s\t%d\t' % (rel, ln))
            tally['no_surface'] += 1
            continue

        # Three decimals, not two. A paint box enclosing a small surface box
        # scores ~0.003 contained, and at two decimals that printed as 0.00 —
        # identical to a box that does not touch the surface at all. Those two
        # cases need completely different answers, so they must not look alike.
        for lbl, t in (('soffit_fascia', sf), ('siding', sd)):
            out.append('#      %-13s contained %.3f  covers %.3f  iou %.3f' % ((lbl,) + t))

        win, lose = ((SOFFIT_FASCIA, SIDING) if rank(sf) >= rank(sd)
                     else (SIDING, SOFFIT_FASCIA))
        top, run = rank(best.get(win, ZERO)), rank(best.get(lose, ZERO))
        wt = best.get(win, ZERO)
        via = 'contained' if wt[0] >= wt[1] else 'covers'

        if top < args.min_contain:
            out.append('#      weak: best overlap %.3f < %.3f — your call'
                       % (top, args.min_contain))
            out.append('#%s\t%d\t' % (rel, ln))
            tally['weak'] += 1
        elif top - run < args.margin:
            out.append('#      split: %.3f vs %.3f, inside %.3f margin — your call'
                       % (top, run, args.margin))
            out.append('#%s\t%d\t' % (rel, ln))
            tally['split'] += 1
        else:
            # Say WHICH direction carried it. 'covers' is the weaker claim: a
            # paint box spanning a whole elevation encloses any surface box on
            # it, which relates them but proves less than paint sitting inside
            # a surface. Worth a closer look when skimming.
            out.append('#      -> %d %s   (via %s %.3f)' % (win, NAME[win], via, top))
            out.append('%s\t%d\t%d' % (rel, ln, win))
            tally[str(win)] += 1

    with open(out_path, 'w') as fh:
        fh.write('\n'.join(out) + '\n')

    total = len(rows)
    print('%d paint boxes read from %s' % (total, args.tsv))
    print('  %3d suggested %d soffit_fascia' % (tally['19'], SOFFIT_FASCIA))
    print('  %3d suggested %d siding' % (tally['20'], SIDING))
    left = tally['no_surface'] + tally['weak'] + tally['split']
    print('  %3d left for you:' % left)
    print('        %3d  no soffit_fascia or siding box on the image  (geometry cannot help)'
          % tally['no_surface'])
    print('        %3d  overlap below --min-contain %.3f              (try lowering it)'
          % (tally['weak'], args.min_contain))
    print('        %3d  split inside --margin %.3f                    (genuinely ambiguous)'
          % (tally['split'], args.margin))
    print('\nwrote %s' % out_path)
    print('REVIEW EVERY LINE. The suggestions are overlap arithmetic, not a roofer.')
    if left:
        print('%d rows are commented out and MUST be filled before the dataset trains.'
              % left)
    return 0


if __name__ == '__main__':
    sys.exit(main())
