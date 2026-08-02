#!/usr/bin/env python3
"""
Strip EXIF — including GPS — from photographs headed for a website or social.

WHY THIS EXISTS
    The archive keeps coordinates on purpose: matching finished work to a
    homeowner's neighbourhood is the point. But EXIF travels INSIDE the file.
    Post an original straight out of the archive and the house's latitude and
    longitude go with it, whatever the caption says and whatever the client
    agreed to. Some platforms strip EXIF on upload; a file served from
    cardinalrenovations.net does not.

    So: coordinates in the archive, none in anything published. Run this on the
    way out. It is the difference between "with the client's consent" and
    "we published where they live."

    (Photos that go through the Cardinal app are already clean — every upload
    path re-encodes through a canvas, which drops EXIF as a side effect. This is
    only for files taken straight off the Spark's disk.)

USAGE
    python3 strip_exif.py IN OUT              # a folder, or a single file
    python3 strip_exif.py IN OUT --max 2048   # also cap the long edge
    python3 strip_exif.py IN OUT --check      # report what carries GPS, write nothing

    Never writes over the input. The archive original is left alone.

REQUIRES
    Pillow.   pip3 install --user Pillow
"""

import argparse, os, sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow is needed: pip3 install --user Pillow')

EXTS = ('.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tif', '.tiff')
GPS_IFD = 0x8825


def has_gps(path):
    """True if the file carries GPS. Returns None if it cannot be read."""
    try:
        with Image.open(path) as im:
            exif = im.getexif()
            if not exif:
                return False
            if GPS_IFD in exif:
                return True
            try:
                return bool(exif.get_ifd(GPS_IFD))
            except Exception:
                return False
    except Exception:
        return None


def clean(src, dst, max_edge=0, quality=92):
    """Re-encode from pixels only. Nothing from the source header survives."""
    with Image.open(src) as im:
        im.load()
        # EXIF orientation is the one tag worth honouring before discarding the
        # rest -- drop it blind and portrait photos come out on their side.
        try:
            from PIL import ImageOps
            im = ImageOps.exif_transpose(im)
        except Exception:
            pass

        if max_edge and max(im.size) > max_edge:
            scale = max_edge / float(max(im.size))
            im = im.resize((max(1, round(im.width * scale)),
                            max(1, round(im.height * scale))), Image.LANCZOS)

        out_png = dst.lower().endswith('.png')
        if not out_png and im.mode not in ('RGB', 'L'):
            im = im.convert('RGB')

        os.makedirs(os.path.dirname(dst) or '.', exist_ok=True)
        # No exif= argument: Pillow writes none unless asked, which is the
        # whole point. Verified below rather than assumed.
        if out_png:
            im.save(dst, 'PNG', optimize=True)
        else:
            im.save(dst, 'JPEG', quality=quality, optimize=True, progressive=True)


def walk(root):
    if os.path.isfile(root):
        yield root
        return
    for base, _dirs, files in os.walk(root):
        for f in sorted(files):
            if f.lower().endswith(EXTS):
                yield os.path.join(base, f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst', nargs='?')
    ap.add_argument('--max', type=int, default=0, help='cap the long edge, e.g. 2048')
    ap.add_argument('--quality', type=int, default=92)
    ap.add_argument('--check', action='store_true', help='report only, write nothing')
    args = ap.parse_args()

    if not args.check and not args.dst:
        sys.exit('need an output path (or pass --check)')
    if not args.check:
        s, d = os.path.abspath(args.src), os.path.abspath(args.dst)
        if d == s or d.startswith(s + os.sep):
            sys.exit('refusing to write inside the source — the archive original stays untouched')

    files = list(walk(args.src))
    if not files:
        sys.exit('no images found under ' + args.src)

    if args.check:
        gps = unreadable = 0
        for f in files:
            r = has_gps(f)
            if r is None:
                unreadable += 1
            elif r:
                gps += 1
                print('GPS  ' + f)
        print('\n%d files · %d carry GPS · %d unreadable' % (len(files), gps, unreadable))
        print('these would leak coordinates if published as-is' if gps else
              'nothing here carries GPS')
        return

    single = os.path.isfile(args.src)
    done = failed = still = 0
    for f in files:
        rel = os.path.basename(f) if single else os.path.relpath(f, args.src)
        out = args.dst if (single and not os.path.isdir(args.dst)) else os.path.join(args.dst, rel)
        if not out.lower().endswith(('.jpg', '.jpeg', '.png')):
            out = os.path.splitext(out)[0] + '.jpg'
        try:
            clean(f, out, args.max, args.quality)
            # Prove it, per file. "Pillow does not write EXIF unless asked" is
            # a claim; a check on the artifact is evidence.
            if has_gps(out):
                still += 1
                print('STILL HAS GPS: ' + out)
            done += 1
        except Exception as e:
            failed += 1
            print('failed %s — %s' % (f, e))

    print('\ncleaned %d · failed %d' % (done, failed))
    if still:
        print('WARNING: %d output files still carry GPS — do not publish these' % still)
    else:
        print('every output verified clear of GPS')


if __name__ == '__main__':
    main()
