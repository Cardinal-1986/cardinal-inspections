#!/usr/bin/env python3
"""Remap a YOLO dataset from the 33-class taxonomy to the 31-class one (build 602).

WHY THIS EXISTS
    val_batch1_pred.jpg on the v4 run came back with one rotted eave boxed three
    and four times over — soffit_damage, fascia_damage and paint_deterioration
    all claiming the same pixels, none of them wrong enough to drop.

    That is not a threshold you can tune. NMS is PER-CLASS: it only suppresses
    overlapping boxes carrying the SAME class. Split one repair across three
    class names and every one of them survives, by design.

    The ground truth was measured and is mostly innocent — only 3 images in 454
    carry a cross-class overlap above 0.5 IoU. The annotations did not teach the
    duplication. The TAXONOMY invited it, and api/detect.js already said so at
    build 596 without anyone noticing: the exterior vocabulary was built from
    what the model actually called 294 flattened boxes, and the clusters were
    'gutter 65, SOFFIT/FASCIA 57, window 42, deck 42'. Soffit and fascia were
    ONE cluster in the data. Splitting them into two classes is what broke it.

WHAT CHANGES
    19 soffit_damage  ┐
                      ├─> 19 soffit_fascia_damage
    20 fascia_damage  ┘
    24 paint_deterioration  -> REMOVED; a condition among locations, so it
                               stacked on every surface. Each box is reassigned
                               to the surface it is peeling off.
    33 -> 31 classes.

    EVERY INDEX <= 18 IS UNCHANGED. The 17 roof classes and `other` (pinned at
    16) keep their exact numbers, so the roof half of the model is untouched by
    the renumbering.

HOW TO RUN
    1.  python3 remap_taxonomy_602.py --root <dataset>            # dry run
    2.  python3 remap_taxonomy_602.py --root <dataset> --apply    # writes
    3.  Fill in paint_review.tsv  (one line per class-24 box: 19 or 20)
    4.  python3 remap_taxonomy_602.py --root <dataset> --paint paint_review.tsv --apply

    Step 2 parks every paint box on class 99 rather than guessing a surface.
    99 is outside nc, so the dataset is NOT trainable until step 4 resolves
    them — deliberately. A silent default is how you end up with 128 boxes on
    the wrong surface and no way to tell; a hard training error is how you
    find out immediately.

    128 is the measured count on the real dataset (1,149 label files, 473 of
    them changing). An earlier revision of this docstring said 36; that number
    came from a fixture and was wrong by 3.5x.
"""
import argparse, os, shutil, sys

OLD_NAMES = [
    'hail_impact', 'wind_lifted', 'missing_shingle', 'granule_loss',
    'cracked_split', 'nail_pop', 'exposed_fastener', 'flashing_failed',
    'flashing_missing', 'pipe_boot', 'chimney', 'valley', 'ridge_cap',
    'ponding_debris', 'decking_sag', 'ice_dam', 'other',
    'gutter_damage', 'downspout_damage', 'soffit_damage', 'fascia_damage',
    'siding_damage', 'masonry_damage', 'vegetation_contact', 'paint_deterioration',
    'window_glass_damage', 'window_seal_failure', 'window_frame_damage',
    'deck_penetration', 'underlayment_exposed', 'hardware_loose',
    'electrical_hazard', 'interior_water_damage',
]

# Must stay byte-identical to api/detect.js DEFECTS and hail_review.py
# DEFECT_KEYS. If these three ever disagree the export is silently wrong.
NEW_NAMES = [
    'hail_impact', 'wind_lifted', 'missing_shingle', 'granule_loss',
    'cracked_split', 'nail_pop', 'exposed_fastener', 'flashing_failed',
    'flashing_missing', 'pipe_boot', 'chimney', 'valley', 'ridge_cap',
    'ponding_debris', 'decking_sag', 'ice_dam', 'other',
    'gutter_damage', 'downspout_damage', 'soffit_fascia_damage',
    'siding_damage', 'masonry_damage', 'vegetation_contact',
    'window_glass_damage', 'window_seal_failure', 'window_frame_damage',
    'deck_penetration', 'underlayment_exposed', 'hardware_loose',
    'electrical_hazard', 'interior_water_damage',
]

PAINT = 24                      # the one class that needs a human

# Pass one parks unresolved paint boxes on a SENTINEL, not on 24. Leaving them
# at 24 would be silently catastrophic: 24 in the NEW list is
# window_seal_failure, so anyone who trained between pass one and pass two
# would turn every peeling soffit into a failed window seal and get no error.
# 99 is outside nc, so training hard-fails instead. Loud beats subtle.
SENTINEL = 99
REMAP = {i: i for i in range(19)}           # 0-18 unchanged, on purpose
REMAP.update({19: 19, 20: 19})              # soffit, fascia -> merged
REMAP.update({21: 20, 22: 21, 23: 22})      # siding, masonry, vegetation
REMAP.update({n: n - 2 for n in range(25, 33)})   # windows..interior, minus paint


def die(m):
    sys.exit('remap: ' + m)


def label_files(root):
    for dirpath, _, names in os.walk(root):
        # A split dataset keeps its labels in labels/train/ and labels/val/,
        # which is what prepare_yolo.py emits. Matching only the LAST path
        # component finds nothing there and the remap dies with "no labels"
        # on a dataset that is full of them. Match any component that is
        # exactly 'labels' — a substring test would also sweep in
        # labels_backup/ and unlabelled/, so it has to be a component match.
        if 'labels' not in dirpath.replace(os.sep, '/').split('/'):
            continue
        for n in sorted(names):
            if n.endswith('.txt') and n != 'classes.txt':
                yield os.path.join(dirpath, n)


def read_boxes(path):
    out = []
    with open(path) as fh:
        for ln, raw in enumerate(fh, 1):
            raw = raw.strip()
            if not raw:
                continue
            parts = raw.split()
            try:
                out.append((int(parts[0]), parts[1:], ln))
            except (ValueError, IndexError):
                die('%s:%d is not a YOLO row: %r' % (path, ln, raw))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True, help='dataset root (contains images/ and labels/)')
    ap.add_argument('--apply', action='store_true', help='actually write (default: dry run)')
    ap.add_argument('--paint', help='TSV of resolved class-24 boxes: path<TAB>line<TAB>19|20')
    args = ap.parse_args()

    if not os.path.isdir(args.root):
        die('no such directory: ' + args.root)

    files = list(label_files(args.root))
    if not files:
        die('no labels/*.txt under ' + args.root)

    # ---- refuse to double-apply -------------------------------------------
    # After a successful run the max class index is <= 30 AND no file has both
    # 19 and 20 meaning soffit/fascia. Cheapest reliable tell: a marker file.
    marker = os.path.join(args.root, '.remapped_602')
    already = os.path.exists(marker)
    if already and not args.paint:
        die('already remapped (%s exists). Re-running would shift indices twice.\n'
            '       To resolve paint boxes, pass --paint <tsv>.' % marker)

    resolved = {}
    if args.paint:
        with open(args.paint) as fh:
            for raw in fh:
                raw = raw.strip()
                if not raw or raw.startswith('#'):
                    continue
                p, ln, cls = raw.split('\t')
                if cls.strip() not in ('19', '20'):
                    die('paint TSV: %r is not 19 or 20' % cls)
                resolved[(p.strip(), int(ln))] = int(cls)
        print('paint decisions loaded: %d' % len(resolved))

    counts, paint_left, changed = {}, [], 0
    for path in files:
        boxes = read_boxes(path)
        # Substitute in place over the ORIGINAL lines rather than rebuilding the
        # file out of boxes alone. read_boxes() skips blank lines, so rebuilding
        # dropped them and every line below shifted up — while paint_review.tsv
        # still carried the PRE-rewrite numbers. Pass two then looked up a line
        # that had moved: the filled-in decision was silently discarded and the
        # box stayed on 99, and in a file with more than one paint box the shift
        # could land the recorded line on a DIFFERENT sentinel and apply the
        # roofer's ruling to the wrong box.
        #
        # (path, line) IS the addressing scheme for the whole two-pass design,
        # so line numbers have to survive pass one byte-stably.
        with open(path) as fh:
            out = fh.read().split('\n')
        dirty = False
        for cls, rest, ln in boxes:
            key = (os.path.relpath(path, args.root), ln)
            if cls == SENTINEL:                    # pass two: resolve or keep
                new = resolved.get(key, SENTINEL)
            elif already:
                new = cls
            elif cls == PAINT:
                new = SENTINEL                     # parked, never guessed
            elif cls in REMAP:
                new = REMAP[cls]
            else:
                die('%s:%d has class %d, outside 0-32' % (path, ln, cls))

            if new == SENTINEL:
                paint_left.append((path, ln))
            if new != cls:
                dirty = True
            counts[new] = counts.get(new, 0) + 1
            out[ln - 1] = ' '.join([str(new)] + rest)

        if dirty:
            changed += 1
            if args.apply:
                bak = path + '.pre602'
                if not os.path.exists(bak):
                    shutil.copyfile(path, bak)
                tmp = path + '.tmp'
                with open(tmp, 'w') as fh:
                    # `out` came from split('\n'), so a file that ended in a
                    # newline already carries a trailing '' and round-trips
                    # exactly. Appending one here would grow the file by a
                    # blank line on every pass.
                    fh.write('\n'.join(out))
                os.replace(tmp, path)

    # ---- report ------------------------------------------------------------
    print('\n%d label files, %d would change' % (len(files), changed))
    print('\nclass distribution after remap:')
    for i, name in enumerate(NEW_NAMES):
        n = counts.get(i, 0)
        flag = '   <-- STARVED' if 0 < n <= 5 else ('   <-- EMPTY' if n == 0 else '')
        print('  %2d  %-24s %5d%s' % (i, name, n, flag))

    still = counts.get(SENTINEL, 0)
    if still:
        tsv = os.path.join(args.root, 'paint_review.tsv')
        print('\n%d paint_deterioration boxes need a surface.' % len(paint_left))
        print('Writing %s — put 19 (soffit/fascia) or 20 (siding) in column 3.' % tsv)
        if args.apply:
            with open(tsv, 'w') as fh:
                fh.write('# path\tline\t19=soffit_fascia  20=siding\n')
                for p, ln in paint_left:
                    fh.write('%s\t%d\t\n' % (os.path.relpath(p, args.root), ln))
        print('THE DATASET IS NOT TRAINABLE UNTIL THESE ARE RESOLVED.')

    # ---- data.yaml ---------------------------------------------------------
    y = os.path.join(args.root, 'data.yaml')
    if os.path.exists(y) and args.apply and not still:
        src = open(y).read()
        if not os.path.exists(y + '.pre602'):
            shutil.copyfile(y, y + '.pre602')
        import re
        src = re.sub(r'^nc:\s*\d+', 'nc: %d' % len(NEW_NAMES), src, flags=re.M)
        src = re.sub(r'^names:.*?(?=^\S|\Z)',
                     'names:\n' + ''.join('  - %s\n' % n for n in NEW_NAMES),
                     src, flags=re.M | re.S)
        open(y, 'w').write(src)
        print('\ndata.yaml -> nc: %d' % len(NEW_NAMES))

    # The marker means "indices in this tree have been shifted", which is true
    # the moment pass one writes — NOT "the migration is finished". Gating it on
    # `not still` was a real bug: pass one always leaves paint pending, so the
    # marker was never written, the double-apply guard never armed, and a second
    # run shifted every index a second time. Caught in test: a siding_damage box
    # (21 -> 20) silently became soffit_fascia_damage (20 -> 19).
    if args.apply and not already:
        open(marker, 'w').write('33 -> 31 at build 602; indices shifted\n')

    print('\n%s' % ('WROTE' if args.apply else 'DRY RUN — nothing written; add --apply'))


if __name__ == '__main__':
    main()
