#!/usr/bin/env python3
"""Layout harness for remap_taxonomy_602.label_files — `python3 test_remap_layouts.py`.

WHY THIS EXISTS
    remap_taxonomy_602.py shipped with

        if os.path.basename(dirpath) != 'labels':

    which only ever matches a FLAT labels/*.txt. prepare_yolo.py emits the
    split layout — labels/train/ and labels/val/ — so on the real dataset the
    remap walked 1,149 label files, matched none of them, and died with
    "no labels/*.txt under <root>" on a dataset that was full of them.

    It was verified against a fixture before shipping. The fixture was flat.
    That is the whole bug: the test and the box disagreed about the shape of
    the data, and the test was the one that was wrong.

    So this harness asserts BOTH layouts, and asserts the two directories that
    must stay excluded. A substring test ('labels' in dirpath) fixes the split
    case and quietly starts feeding labels_backup/ and unlabelled/ into a
    destructive rewrite, which is why the fix is a path-COMPONENT match.

    It imports the shipped function rather than restating it — same rule as
    test_push_retry.py.
"""
import os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from remap_taxonomy_602 import label_files

BOX = '19 0.5 0.5 0.1 0.1\n'


def write(path, body=BOX):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as fh:
        fh.write(body)


def found(root):
    return sorted(os.path.relpath(p, root).replace(os.sep, '/')
                  for p in label_files(root))


def check(name, root, expected):
    got = found(root)
    if got != expected:
        print('FAIL  %s\n  expected %r\n  got      %r' % (name, expected, got))
        return False
    print('ok    %s  -> %r' % (name, got))
    return True


def main():
    ok = True
    with tempfile.TemporaryDirectory() as tmp:

        # 1 — the split layout prepare_yolo.py actually produces
        split = os.path.join(tmp, 'split')
        write(os.path.join(split, 'labels', 'train', 'a.txt'))
        write(os.path.join(split, 'labels', 'val', 'b.txt'))
        write(os.path.join(split, 'images', 'train', 'a.jpg'), 'not a label\n')
        ok &= check('split labels/{train,val}', split,
                    ['labels/train/a.txt', 'labels/val/b.txt'])

        # 2 — the flat layout must keep working
        flat = os.path.join(tmp, 'flat')
        write(os.path.join(flat, 'labels', 'c.txt'))
        ok &= check('flat labels/', flat, ['labels/c.txt'])

        # 3 — negative controls. A substring match would sweep both of these
        #     into a rewrite that overwrites label files in place.
        neg = os.path.join(tmp, 'neg')
        write(os.path.join(neg, 'labels_backup', 'x.txt'))
        write(os.path.join(neg, 'unlabelled', 'y.txt'))
        ok &= check('labels_backup/ + unlabelled/ ignored', neg, [])

        # 4 — classes.txt is metadata, never a label file
        meta = os.path.join(tmp, 'meta')
        write(os.path.join(meta, 'labels', 'classes.txt'), 'hail_impact\n')
        write(os.path.join(meta, 'labels', 'real.txt'))
        ok &= check('classes.txt excluded', meta, ['labels/real.txt'])

    print('\n%s' % ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
