#!/usr/bin/env python3
"""
first_pass.py — read a phone library and say what is in it. Move nothing.

WHY THIS EXISTS
    Theo has ~20,000 photographs and videos across an iPhone and an iPad, years
    deep, most of them worth keeping and plenty not. The plan is to sort them
    into events and people rather than one at a time — but every number in that
    plan is currently a guess. This replaces the guesses.

    It is also the screen the Studio triage flow opens on: a tool that
    reorganises twenty thousand photographs before showing you what it thinks is
    a tool nobody uses twice.

THIS SCRIPT IS READ-ONLY AND OFFLINE
    It opens files, reads headers, and prints. It does not move, rename, delete,
    re-encode or upload anything, and it makes no network call of any kind —
    there is no urllib import in this file, deliberately. The only thing it can
    write is the manifest you explicitly ask for with --manifest.

    That matters more than usual here: this reads a man's family photographs.
    The safe thing and the useful thing are the same thing, so there is no
    reason for it to be able to do anything else.

WHAT IT WORKS OUT
    · photograph or video, and how long a video runs
    · Live Photo pairs — the still and its three-second clip, counted ONCE
    · screenshots, by the absence of a camera in the file
    · exact duplicates, by size then hash
    · when it was taken, from EXIF rather than the filesystem
    · where it was taken, from EXIF GPS
    · which device shot it
    · events: runs of photographs close together in time and place

USAGE
    python3 first_pass.py ~/Pictures/iphone-export
    python3 first_pass.py ~/Pictures/iphone-export --manifest first_pass.jsonl
    python3 first_pass.py ~/Pictures/iphone-export --gap 8 --radius 40

HEIC
    iPhones shoot HEIC. Pillow cannot open it without pillow-heif, so install
    that (pip3 install --user pillow-heif) or export as JPEG. Without it the
    HEICs are still counted and paired — they just arrive with no date, no GPS
    and no device, which makes the whole exercise much less useful. The script
    says so loudly rather than quietly producing a worse answer.
"""
import argparse, hashlib, json, math, os, sys
from collections import defaultdict

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow is needed: pip3 install --user Pillow')

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIC_OK = True
except ImportError:
    HEIC_OK = False

IMG_EXTS = ('.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tif', '.tiff', '.gif')
VID_EXTS = ('.mov', '.mp4', '.m4v', '.avi', '.hevc')

EXIF_DATETIME   = 36867      # DateTimeOriginal
EXIF_DATETIME2  = 306        # DateTime, the fallback
EXIF_MAKE       = 271
EXIF_MODEL      = 272
GPS_IFD         = 0x8825


def log(msg):
    print(msg, flush=True)


# ── metadata ───────────────────────────────────────────────────────────────

def _dms(v):
    """EXIF stores coordinates as three rationals. Returns decimal degrees."""
    try:
        d, m, s = [float(x) for x in v]
        return d + m / 60.0 + s / 3600.0
    except Exception:
        return None


def read_image_meta(path):
    """Date, coordinates and camera from a still. Never raises."""
    out = {'taken': None, 'lat': None, 'lon': None, 'device': None, 'has_camera': False}
    try:
        with Image.open(path) as im:
            out['w'], out['h'] = im.size
            exif = im.getexif()
            if not exif:
                return out

            dt = exif.get(EXIF_DATETIME) or exif.get(EXIF_DATETIME2)
            if dt:
                # '2024:08:14 09:31:02' — the colons in the date are EXIF's own
                out['taken'] = str(dt).replace(':', '-', 2).strip()

            make, model = exif.get(EXIF_MAKE), exif.get(EXIF_MODEL)
            # THE SCREENSHOT TEST. A photograph knows what took it; a screenshot
            # has no camera in the file at all. This is a certainty rather than a
            # heuristic, which is why it can run without asking.
            out['has_camera'] = bool(make or model)
            if model:
                out['device'] = (str(make) + ' ' + str(model)).strip() if make else str(model).strip()

            try:
                gps = exif.get_ifd(GPS_IFD) or {}
            except Exception:
                gps = {}
            if gps:
                lat, lon = _dms(gps.get(2)), _dms(gps.get(4))
                if lat is not None and lon is not None:
                    if str(gps.get(1, 'N')).upper().startswith('S'):
                        lat = -lat
                    if str(gps.get(3, 'E')).upper().startswith('W'):
                        lon = -lon
                    out['lat'], out['lon'] = round(lat, 6), round(lon, 6)
    except Exception:
        pass
    return out


def read_video_duration(path):
    """
    Seconds, by walking MP4/MOV atoms for mvhd. Pure stdlib on purpose — ffprobe
    would be one more thing to install on a box that already has enough, and the
    only number needed here is the length.
    """
    try:
        with open(path, 'rb') as fh:
            end = os.path.getsize(path)
            pos = 0
            while pos < end - 8:
                fh.seek(pos)
                head = fh.read(8)
                if len(head) < 8:
                    return None
                size = int.from_bytes(head[:4], 'big')
                atom = head[4:8]
                if size == 1:                      # 64-bit extended size
                    size = int.from_bytes(fh.read(8), 'big')
                    body = pos + 16
                else:
                    body = pos + 8
                if size < 8:
                    return None
                if atom == b'moov':
                    inner = body
                    while inner < pos + size - 8:
                        fh.seek(inner)
                        ih = fh.read(8)
                        if len(ih) < 8:
                            break
                        isize = int.from_bytes(ih[:4], 'big')
                        if ih[4:8] == b'mvhd':
                            fh.seek(inner + 8)
                            ver = fh.read(1)[0]
                            fh.read(3)             # flags
                            if ver == 1:
                                fh.read(16)        # created, modified (64-bit)
                                scale = int.from_bytes(fh.read(4), 'big')
                                dur   = int.from_bytes(fh.read(8), 'big')
                            else:
                                fh.read(8)         # created, modified (32-bit)
                                scale = int.from_bytes(fh.read(4), 'big')
                                dur   = int.from_bytes(fh.read(4), 'big')
                            return round(dur / scale, 2) if scale else None
                        if isize < 8:
                            break
                        inner += isize
                    return None
                pos += size
    except Exception:
        pass
    return None


# ── events ─────────────────────────────────────────────────────────────────

def km_between(a_lat, a_lon, b_lat, b_lon):
    """Great-circle kilometres. Good enough to tell a holiday from a weekend."""
    r = 6371.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lon - a_lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def cluster_events(items, gap_hours, radius_km):
    """
    A new event starts when the clock jumps or the map does. That is the whole
    premise of the triage flow — 20,000 photographs are ~300 decisions once they
    are grouped, and a holiday is one decision rather than 214.

    Items with no date cannot be placed on a timeline and are left unclustered
    rather than guessed at.
    """
    dated = sorted([i for i in items if i.get('taken')], key=lambda i: i['taken'])
    events, cur = [], None
    for it in dated:
        start_new = cur is None
        if cur is not None:
            hrs = _hours_between(cur['last'], it['taken'])
            if hrs is None or hrs > gap_hours:
                start_new = True
            elif it.get('lat') is not None and cur.get('lat') is not None:
                if km_between(cur['lat'], cur['lon'], it['lat'], it['lon']) > radius_km:
                    start_new = True
        if start_new:
            cur = {'first': it['taken'], 'last': it['taken'], 'n': 0,
                   'lat': it.get('lat'), 'lon': it.get('lon')}
            events.append(cur)
        cur['n'] += 1
        cur['last'] = it['taken']
        if cur.get('lat') is None and it.get('lat') is not None:
            cur['lat'], cur['lon'] = it['lat'], it['lon']
    return events


def _hours_between(a, b):
    """Both are 'YYYY-MM-DD HH:MM:SS'. Returns None if either will not parse."""
    from datetime import datetime
    try:
        fmt = '%Y-%m-%d %H:%M:%S'
        return abs((datetime.strptime(b, fmt) - datetime.strptime(a, fmt)).total_seconds()) / 3600.0
    except Exception:
        return None


# ── the pass ───────────────────────────────────────────────────────────────

def sha(path, cap=0):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        while True:
            b = fh.read(1 << 20)
            if not b:
                break
            h.update(b)
            if cap and fh.tell() >= cap:
                break
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('root', help='a folder of exported photographs and videos')
    ap.add_argument('--manifest', default=None,
                    help='write one JSON object per item here (the only file written)')
    ap.add_argument('--gap', type=float, default=6.0,
                    help='hours of silence that start a new event (default 6)')
    ap.add_argument('--radius', type=float, default=25.0,
                    help='kilometres from an event that start a new one (default 25)')
    ap.add_argument('--pocket', type=float, default=4.0,
                    help='videos shorter than this are pocket clips (default 4s)')
    args = ap.parse_args()

    if not os.path.isdir(args.root):
        sys.exit('Not a folder: ' + args.root)
    if not HEIC_OK:
        log('')
        log('  ⚠  pillow-heif is not installed, so HEIC files cannot be read.')
        log('     They will be counted and paired but arrive with no date, no')
        log('     location and no device, which is most of the point.')
        log('     pip3 install --user pillow-heif')
        log('')

    items, by_stem = [], defaultdict(dict)
    log('Reading %s …' % args.root)

    for dirpath, _dirs, files in os.walk(args.root):
        for name in sorted(files):
            if name.startswith('.'):
                continue
            ext = os.path.splitext(name)[1].lower()
            is_img, is_vid = ext in IMG_EXTS, ext in VID_EXTS
            if not (is_img or is_vid):
                continue

            full = os.path.join(dirpath, name)
            try:
                size = os.path.getsize(full)
            except OSError:
                continue

            it = {'path': os.path.relpath(full, args.root),
                  'kind': 'video' if is_vid else 'photo',
                  'bytes': size, 'taken': None, 'lat': None, 'lon': None,
                  'device': None, 'has_camera': False, 'duration_s': None}

            if is_vid:
                it['duration_s'] = read_video_duration(full)
                # A video carries no EXIF a still parser can read; its date comes
                # from its Live Photo twin when it has one, and otherwise from
                # the filesystem, which is why videos alone cluster poorly.
            else:
                it.update(read_image_meta(full))

            items.append(it)
            # Live Photo pairing is by stem: IMG_1234.HEIC beside IMG_1234.MOV.
            by_stem[os.path.join(dirpath, os.path.splitext(name)[0])][it['kind']] = it

    if not items:
        sys.exit('Nothing readable under ' + args.root)

    # ── Live Photos ────────────────────────────────────────────────────────
    # Two files, ONE photograph. Counted twice and a 20,000-item library reads
    # as 24,000 with every pair looking like a duplicate.
    pairs = 0
    for stem, both in by_stem.items():
        if 'photo' in both and 'video' in both:
            d = both['video'].get('duration_s')
            if d is not None and d <= 5.0:
                pid = 'lp:' + hashlib.sha256(stem.encode()).hexdigest()[:16]
                both['photo']['live_pair_id'] = pid
                both['video']['live_pair_id'] = pid
                both['video']['live_is_clip'] = True
                if both['photo'].get('taken') and not both['video'].get('taken'):
                    both['video']['taken'] = both['photo']['taken']
                pairs += 1

    clips = [i for i in items if i.get('live_is_clip')]
    counted = [i for i in items if not i.get('live_is_clip')]

    # ── screenshots ────────────────────────────────────────────────────────
    shots = [i for i in counted if i['kind'] == 'photo' and not i['has_camera']]

    # ── pocket videos ──────────────────────────────────────────────────────
    pocket = [i for i in counted
              if i['kind'] == 'video' and i.get('duration_s') is not None
              and i['duration_s'] < args.pocket]

    # ── exact duplicates ───────────────────────────────────────────────────
    # Group by size first; only files that collide get hashed. Hashing 20,000
    # files to find a few hundred pairs is the wrong trade.
    dupes, by_size = 0, defaultdict(list)
    for i in counted:
        by_size[i['bytes']].append(i)
    for size, group in by_size.items():
        if len(group) < 2:
            continue
        seen = {}
        for i in group:
            try:
                digest = sha(os.path.join(args.root, i['path']))
            except OSError:
                continue
            if digest in seen:
                i['duplicate_of'] = seen[digest]
                dupes += 1
            else:
                seen[digest] = i['path']

    # ── events ─────────────────────────────────────────────────────────────
    keep = [i for i in counted
            if i not in shots and i not in pocket and 'duplicate_of' not in i]
    events = cluster_events(keep, args.gap, args.radius)

    located = [i for i in counted if i.get('lat') is not None]
    dated   = [i for i in counted if i.get('taken')]
    devices = sorted({i['device'] for i in counted if i.get('device')})

    # ── the report ─────────────────────────────────────────────────────────
    log('')
    log('  %-42s %7d' % ('items on disk', len(items)))
    log('  %-42s %7d' % ('  photographs', sum(1 for i in items if i['kind'] == 'photo')))
    log('  %-42s %7d' % ('  videos', sum(1 for i in items if i['kind'] == 'video')))
    log('')
    log('  %-42s %7d   automatic' % ('Live Photo clips, paired not counted', len(clips)))
    log('  %-42s %7d   automatic' % ('screenshots (no camera in the file)', len(shots)))
    log('  %-42s %7d   automatic' % ('exact duplicates', dupes))
    log('  %-42s %7d   automatic' % ('pocket videos (under %.0fs)' % args.pocket, len(pocket)))
    log('  ' + '-' * 52)
    log('  %-42s %7d   YOUR CALL' % ('left to decide about', len(keep)))
    log('')
    log('  %-42s %7d' % ('events (%.0fh gap, %.0fkm)' % (args.gap, args.radius), len(events)))
    if events:
        big = sorted(events, key=lambda e: -e['n'])[:5]
        for e in big:
            log('      %s → %s   %4d items' % (e['first'][:10], e['last'][:10], e['n']))
    log('')
    log('  %-42s %7d' % ('carry a date', len(dated)))
    log('  %-42s %7d' % ('carry coordinates', len(located)))
    if devices:
        log('  devices: ' + ', '.join(devices[:6]))
    log('')

    if len(keep) and len(events):
        log('  %d items become %d decisions — about %.0f to one.'
            % (len(keep), len(events), len(keep) / float(len(events))))
    if not dated:
        log('  ⚠  NOTHING carries a date, so nothing could be clustered.')
        log('     On an iPhone library that means the HEICs are unreadable —')
        log('     install pillow-heif, or export as JPEG, and run this again.')
    log('')
    log('  Nothing was moved, changed or uploaded.')

    if args.manifest:
        with open(args.manifest, 'w', encoding='utf-8') as out:
            for i in items:
                out.write(json.dumps(i, ensure_ascii=False) + '\n')
        log('  Manifest: %s' % args.manifest)


if __name__ == '__main__':
    main()
