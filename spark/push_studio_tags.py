#!/usr/bin/env python3
"""
push_studio_tags.py — take Hermes's local tags and land them in the Studio.

WHAT THIS DOES
    Reads studio_tags.jsonl (Hermes's output — see STUDIO_TAGGING.md) and, for
    each row:
      1. Looks up project_address / project_name / captured_at from
         manifest.jsonl when source == 'companycam' — a plain dict lookup by
         id, no hashing, no network, both files already on this disk.
      2. Opens the original file on the Spark, records its real width/height,
         and writes a resized browsing copy (max 1400px, matching the app's
         own DISP convention in cr-show-script's shrink()) to memory.
      3. Uploads that copy to Cardinal's existing `photos` storage bucket
         under studio/<id>.jpg — same bucket showcase/ and walks/ already
         share, new prefix.
      4. Upserts one row into studio_photos.

    Nothing here is a presentation master. The Spark archive already is one;
    this is a small copy good enough to browse and pick from. A full-resolution
    copy only gets made later, at the moment something here is actually
    promoted into a real Showcase pair.

WHY EXIF ORIENTATION IS HANDLED EXPLICITLY
    strip_exif.py in this same folder already hit this: phone photos are
    commonly stored sideways with an EXIF Orientation tag telling a viewer how
    to turn them. A naive resize ignores that tag, and every portrait shot
    would publish rotated. Image.open() + resize() does NOT apply it on its
    own — ImageOps.exif_transpose() has to run first, baking the rotation into
    the actual pixels before the tag is discarded by re-encoding. Skipping
    this would reintroduce a bug this project already paid to fix once.

AUTH
    Same pattern as hail_review.py: sign in as a real admin via Supabase's
    password grant, using the SAME public anon key already hardcoded in
    api/*.js (that one is designed to be public — CLAUDE.md is explicit about
    it). Never a service-role key: that must never leave Vercel's env vars,
    and it must certainly never sit on this machine. Your password is not
    public — environment variable only, never on the command line, never in a
    file that gets committed.

        export CARDINAL_EMAIL='theo@cardinalrenovations.net'
        export CARDINAL_PASSWORD='...'

    Checked directly against production: is_cardinal_admin() reads auth.email()
    off the signed-in session's own token and hardcodes theo@/joan@ in its
    allowlist regardless of team_profiles — so a real sign-in as either
    satisfies studio_photos' RLS with no other setup needed.

USAGE
    # smoke test first — a handful of photos, look at what actually lands
    python3 push_studio_tags.py --dest /data/cardinal/companycam \
        --root /data/cardinal --tags studio_tags.jsonl --limit 10

    # the real run
    python3 push_studio_tags.py --dest /data/cardinal/companycam \
        --root /data/cardinal --tags studio_tags.jsonl

    Resumable: writes <tags>.pushed.json next to --tags, skips ids already
    pushed on the next run. Ctrl-C costs nothing, same as every other script
    in this folder.

REQUIRES PILLOW
    pip3 install --user Pillow — already an accepted dependency in this same
    folder; strip_exif.py requires it too.

WHAT I COULD NOT VERIFY FROM HERE
    This sandbox has no path to the Spark's filesystem, to Supabase Storage
    with real credentials, or to a real studio_tags.jsonl — so this script has
    never made a live call. The auth flow mirrors hail_review.py's
    get_token(), which IS proven against this account. The Storage and
    PostgREST request shapes (headers, upsert semantics) are standard Supabase
    REST, but standard is not the same as tested. Run --limit 5 first and
    check studio_photos afterward before trusting a big run.
"""
import argparse, json, os, sys
import urllib.error, urllib.request

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit('Pillow is needed: pip3 install --user Pillow')

SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co'
# The SAME publishable anon key api/*.js falls back to when the env var is
# unset, and hail_review.py already uses the same way. Designed to be public.
SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ'
DISP_MAX = 1400        # matches cr-show-script's DISP rendition
DISP_QUALITY = 82


def die(msg, code=1):
    print('ERROR: ' + msg, file=sys.stderr)
    sys.exit(code)


def get_token(email, password):
    req = urllib.request.Request(
        SUPABASE_URL + '/auth/v1/token?grant_type=password',
        data=json.dumps({'email': email, 'password': password}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY},
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            body = json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        die('Sign-in failed (%d): %s' % (e.code, e.read().decode('utf-8', 'replace')[:300]))
        return  # unreachable, quiets linters
    tok = body.get('access_token')
    if not tok:
        die('Sign-in returned no access_token — check CARDINAL_EMAIL/CARDINAL_PASSWORD.')
    return tok


def load_jsonl(path):
    out = []
    if not os.path.exists(path):
        return out
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def load_manifest_index(dest):
    """id -> {project_address, project_name, captured_at}, companycam only."""
    idx = {}
    path = os.path.join(dest, 'manifest.jsonl')
    if not os.path.exists(path):
        print('WARNING: no manifest.jsonl at %s — companycam rows push with no address.' % path)
        return idx
    for row in load_jsonl(path):
        idx[str(row.get('id'))] = {
            'project_address': row.get('project_address'),
            'project_name': row.get('project_name'),
            'captured_at': row.get('captured_at'),
        }
    return idx


def make_thumb(src_path):
    """Return (jpeg_bytes, width, height). width/height are the ORIGINAL's,
    not the thumbnail's, so a later 'is this good enough to present' decision
    has real information to work from."""
    img = Image.open(src_path)
    img = ImageOps.exif_transpose(img)   # bake rotation in before the tag is lost
    img = img.convert('RGB')             # drop alpha/CMYK oddities before JPEG encode
    w, h = img.size
    scale = min(1.0, DISP_MAX / float(max(w, h)))
    if scale < 1.0:
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    import io
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=DISP_QUALITY)
    return buf.getvalue(), w, h


def upload_storage(token, path, data):
    req = urllib.request.Request(
        SUPABASE_URL + '/storage/v1/object/photos/' + path,
        data=data,
        headers={
            'Authorization': 'Bearer ' + token,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
        },
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError('storage upload failed (%d): %s' %
                            (e.code, e.read().decode('utf-8', 'replace')[:300]))


def upsert_row(token, row):
    req = urllib.request.Request(
        # on_conflict is explicit rather than relying on PostgREST inferring
        # the primary key — cheap to be certain, impossible to verify live
        # from this sandbox.
        SUPABASE_URL + '/rest/v1/studio_photos?on_conflict=id',
        data=json.dumps(row).encode('utf-8'),
        headers={
            'Authorization': 'Bearer ' + token,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            got = json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        raise RuntimeError('insert failed (%d): %s' %
                            (e.code, e.read().decode('utf-8', 'replace')[:300]))
    # An RLS refusal is a silent empty array, not an error — the same shape
    # savePair() in the app already has to guard against. Check the rows, not
    # just the absence of an exception.
    if not got:
        raise RuntimeError('saved nothing — RLS refused the write (signed in as an admin?)')
    return got[0]


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dest', required=True,
                     help='the CompanyCam archive folder (holds manifest.jsonl)')
    ap.add_argument('--root', required=True,
                     help='the /data/cardinal root — tag record paths are relative to this')
    ap.add_argument('--tags', required=True, help="Hermes's studio_tags.jsonl")
    ap.add_argument('--limit', type=int, default=0,
                     help='stop after N photos (use a small number for a smoke test)')
    args = ap.parse_args()

    email = os.environ.get('CARDINAL_EMAIL')
    password = os.environ.get('CARDINAL_PASSWORD')
    if not email or not password:
        die('Set CARDINAL_EMAIL and CARDINAL_PASSWORD as environment variables first.')

    state_path = args.tags + '.pushed.json'
    pushed = set(json.load(open(state_path))) if os.path.exists(state_path) else set()

    manifest_idx = load_manifest_index(args.dest)
    tag_rows = load_jsonl(args.tags)
    todo = [r for r in tag_rows if r.get('id') not in pushed]
    if args.limit:
        todo = todo[:args.limit]

    print('%d tagged, %d already pushed, %d to do%s' %
          (len(tag_rows), len(pushed), len(todo), ' (limited)' if args.limit else ''))
    if not todo:
        return

    token = get_token(email, password)
    ok, failed = 0, 0

    for i, row in enumerate(todo, 1):
        rid = row.get('id')
        rel_path = row.get('path')
        src = os.path.join(args.root, rel_path) if rel_path else None
        if not src or not os.path.exists(src):
            print('  [%d/%d] SKIP %s — no file at %s' % (i, len(todo), rid, src))
            failed += 1
            continue
        try:
            thumb, w, h = make_thumb(src)
            storage_path = 'studio/%s.jpg' % rid
            upload_storage(token, storage_path, thumb)

            enrich = manifest_idx.get(rid, {}) if row.get('source') == 'companycam' else {}
            db_row = {
                'id': rid,
                'source': row.get('source'),
                'spark_path': rel_path,
                'storage_path': storage_path,
                'tags': row.get('tags') or [],
                'confidence': row.get('confidence'),
                'project_address': enrich.get('project_address'),
                'project_name': enrich.get('project_name'),
                'captured_at': enrich.get('captured_at'),
                'width': w,
                'height': h,
                'tagged_at': row.get('tagged_at'),
            }
            upsert_row(token, db_row)
            pushed.add(rid)
            ok += 1
            if i % 25 == 0 or i == len(todo):
                print('  [%d/%d] pushed (%d ok, %d failed so far)' % (i, len(todo), ok, failed))
                json.dump(sorted(pushed), open(state_path, 'w'))
        except Exception as e:
            failed += 1
            print('  [%d/%d] FAILED %s — %s' % (i, len(todo), rid, e))

    json.dump(sorted(pushed), open(state_path, 'w'))
    print('done: %d pushed, %d failed, %d total pushed all-time' % (ok, failed, len(pushed)))


if __name__ == '__main__':
    main()
