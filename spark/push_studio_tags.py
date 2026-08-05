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

    THE TOKEN LIVES ONE HOUR, AND THIS RUN IS LONGER THAN THAT. Measured on the
    5 Aug run against studio_photos.pushed_at: the first row landed 02:05 UTC,
    the last 03:06 — 61 minutes — and then all ~54,000 remaining photographs
    failed while the script kept running and reported nothing wrong. 6,290 of
    60,503 landed, about 10%. The token was minted once before the loop and
    nothing renewed it.

    So there are now three defences, in order of preference:
      1. refresh proactively at TOKEN_TTL_S, before anything can fail;
      2. if a 401 arrives anyway, sign in again and retry that photograph once;
      3. if STALL_AFTER photographs fail back-to-back, STOP and exit non-zero,
         because a run that cannot land anything should say so rather than
         quietly walk the rest of the list.
    hail_review.py carries defence 2 for the same reason and the same cause.

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

WHAT IS AND IS NOT VERIFIED
    PROVEN, by a live run: the request shapes work. 6,290 rows and their
    browsing copies landed in production on 5 Aug before the token expired.
    That is no longer a theory.

    PROVEN, by test_push_retry.py in this folder: the retry, re-auth, proactive
    refresh and stall-out paths above. It imports THIS file and executes the
    real main() with only the four network/IO leaves stubbed, and it carries a
    negative control — the same expiry scenario with a permanently dead token,
    which must lose photographs. If that control ever passes, the test is
    proving nothing and needs fixing before it is trusted.

    STILL NOT VERIFIED FROM HERE: nothing exercises a real Storage PUT or a
    real PostgREST upsert from this sandbox. Run --limit 5 first and look at
    studio_photos before trusting a big run.
"""
import argparse, base64, json, os, sys, time
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

# Fallback only. The real expiry is read out of the token's own `exp` claim by
# token_expiry() below, so nothing here has to guess. This is what gets used if
# a token ever arrives in a shape that cannot be parsed.
#
# For the record, because it was measured rather than assumed: on the 5 Aug run
# the first row landed 02:05 UTC and the last 03:06 — 61 minutes — so the tokens
# this project gets really do live an hour, not the "few minutes" a truncated
# log suggested.
TOKEN_TTL_S = 45 * 60
# Refresh at 80% of the token's real life. Proportional, not a fixed count:
# "every N photographs" looks equivalent and is not — at 100 photos/min a
# refresh every 200 is a sign-in every two minutes, ~300 over this run, and
# GoTrue rate-limits password grants. Time is the thing that expires, so time
# is what this counts.
TOKEN_REFRESH_AT = 0.80
# If this many photographs fail back-to-back, something systemic is wrong and
# grinding through the remaining tens of thousands helps nobody. The 5 Aug run
# was reported as "running, resumable" while it was in exactly this state.
STALL_AFTER = 25


def token_expiry(token):
    """Seconds this token has left, read from its own `exp` claim.

    A JWT payload is base64url in the middle segment; no signature check is
    needed or wanted here — we are not validating the token, only asking when
    it dies. Returns TOKEN_TTL_S if anything about it is unreadable, so a
    shape change degrades to the old guess instead of crashing a long run."""
    try:
        payload = token.split('.')[1]
        payload += '=' * (-len(payload) % 4)          # restore stripped padding
        exp = json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))['exp']
        return max(0, float(exp) - time.time())
    except Exception:
        return TOKEN_TTL_S


# Supabase reports an expired token DIFFERENTLY depending on which service you
# hit, and that cost a whole run to learn:
#
#   PostgREST  /rest/v1     HTTP 401  {"message":"JWT expired"}
#   Storage    /storage/v1  HTTP 400  {"statusCode":"403", …
#                                      "\"exp\" claim timestamp check failed"}
#
# upload_storage() is called BEFORE upsert_row(), so the 400 is what a long run
# actually hits — the 401 never arrives. The fix shipped in #124 tested
# `e.code == 401`, which is correct for PostgREST and inert here. It passed its
# harness because the harness simulated the 401 I assumed rather than the 400
# production sends.
#
# Match the MESSAGE, not a bare '403' anywhere in the body: a response body can
# carry '403' for unrelated reasons, and substring-matching 'exp' also matches
# "unexpected".
AUTH_MARKERS = ('claim timestamp check failed', 'jwt expired', 'jwt is expired',
                'token is expired', 'invalidjwt', 'invalid jwt')


def is_auth_failure(e):
    """True when an ApiError means 'your token is no longer good'."""
    if e.code in (401, 403):
        return True
    if e.code == 400:                       # Storage's wrapper around a 403
        s = str(e).lower()
        return any(m in s for m in AUTH_MARKERS)
    return False


def die(msg, code=1):
    print('ERROR: ' + msg, file=sys.stderr)
    sys.exit(code)


class ApiError(RuntimeError):
    """An HTTP failure that still knows its status code.

    The first version of this script flattened every urllib.error.HTTPError
    into a bare RuntimeError with the code baked into a string. The loop's
    `except Exception` then counted it and moved on, so a 401 — the one error
    that is recoverable and that a long run is GUARANTEED to hit — was
    indistinguishable from a corrupt JPEG. Keep the code."""

    def __init__(self, msg, code):
        super().__init__(msg)
        self.code = code


# Sign-in failures split into two kinds and they must be handled differently.
#
#   FATAL     400 / 401 / 422 — the credentials are wrong. Retrying cannot fix
#             it and hammering an auth endpoint with a bad password is how an
#             account gets locked. Die, loudly, straight away.
#   TRANSIENT 429 / 5xx / a dropped connection — the credentials are fine and
#             the service is briefly not. Back off and try again.
#
# Before this, EVERY sign-in failure called die() -> sys.exit(1). SystemExit is
# not an Exception, so the push loop's `except Exception` cannot catch it: one
# momentary 429 killed an eight-hour run outright. That matters most on the
# every-N-photographs refresh strategy — a sign-in every two minutes is ~32 an
# hour, right at GoTrue's rate limit for password grants — but this run signs in
# hourly and a single bad moment was still fatal.
AUTH_FATAL = (400, 401, 422)


def get_token(email, password, tries=4):
    req = urllib.request.Request(
        SUPABASE_URL + '/auth/v1/token?grant_type=password',
        data=json.dumps({'email': email, 'password': password}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY},
        method='POST')
    body = None
    for attempt in range(1, tries + 1):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                body = json.loads(r.read().decode('utf-8'))
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode('utf-8', 'replace')[:300]
            if e.code in AUTH_FATAL:
                die('Sign-in failed (%d): %s' % (e.code, detail))
            if attempt == tries:
                die('Sign-in failed (%d) after %d tries: %s' % (e.code, tries, detail))
            wait = 2 ** attempt            # 2s, 4s, 8s
            print('  sign-in got %d, retrying in %ds (%d/%d)' % (e.code, wait, attempt, tries))
            time.sleep(wait)
        except Exception as e:             # URLError, timeout, a dropped socket
            if attempt == tries:
                die('Sign-in failed after %d tries: %s' % (tries, e))
            wait = 2 ** attempt
            print('  sign-in error (%s), retrying in %ds (%d/%d)' % (e, wait, attempt, tries))
            time.sleep(wait)
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
        raise ApiError('storage upload failed (%d): %s' %
                       (e.code, e.read().decode('utf-8', 'replace')[:300]), e.code)


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
        raise ApiError('insert failed (%d): %s' %
                       (e.code, e.read().decode('utf-8', 'replace')[:300]), e.code)
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
    token_refresh_at = time.time() + token_expiry(token) * TOKEN_REFRESH_AT
    print('token good for %d min' % round(token_expiry(token) / 60))
    ok, failed, consecutive, stalled = 0, 0, 0, False

    for i, row in enumerate(todo, 1):
        rid = row.get('id')
        rel_path = row.get('path')
        src = os.path.join(args.root, rel_path) if rel_path else None
        if not src or not os.path.exists(src):
            print('  [%d/%d] SKIP %s — no file at %s' % (i, len(todo), rid, src))
            failed += 1
            consecutive += 1
            if consecutive >= STALL_AFTER:
                stalled = True
                print('  STOPPING: %d in a row failed. Check --root points at the right '
                      'folder.' % consecutive)
                break
            continue

        # Refresh BEFORE the token dies rather than after, on the token's OWN
        # stated lifetime rather than on a guess. Reactive re-auth below is the
        # safety net; this is what stops the net being needed.
        if time.time() >= token_refresh_at:
            left = token_expiry(token)
            print('  refreshing the access token (%d min left on it)' % round(left / 60))
            token = get_token(email, password)
            token_refresh_at = time.time() + token_expiry(token) * TOKEN_REFRESH_AT

        # Resizing is the expensive part and does not depend on the token, so
        # it stays outside the retry — a re-auth must not re-decode the JPEG.
        try:
            thumb, w, h = make_thumb(src)
        except Exception as e:
            failed += 1
            consecutive += 1
            print('  [%d/%d] FAILED %s — could not read image: %s' % (i, len(todo), rid, e))
            continue

        storage_path = 'studio/%s.jpg' % rid
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

        # Both calls sit inside one retry: the upload is idempotent
        # (x-upsert:true) and the insert is an upsert on id, so repeating the
        # pair after a mid-pair 401 costs one wasted PUT and nothing else.
        attempt, err, reauthed = 0, None, False
        while attempt < 3:
            attempt += 1
            try:
                upload_storage(token, storage_path, thumb)
                upsert_row(token, db_row)
                err = None
                break
            except ApiError as e:
                err = e
                # THE 5 AUG FAILURE. The token was minted once before the loop
                # and the run outlived it at exactly 61 minutes; every one of
                # the remaining ~54,000 photographs then failed, was counted as
                # a plain failure, and the script kept going for as long as it
                # was left running. Retrying with the same dead token cannot
                # help — sign in again, then retry. At most once per photo, so
                # a genuine permissions failure cannot become a sign-in storm.
                #
                # is_auth_failure(), NOT `e.code == 401`. Storage answers an
                # expired token with a 400 wrapping a 403, and it is the call
                # that runs first — see the note on AUTH_MARKERS above.
                if is_auth_failure(e) and not reauthed:
                    reauthed = True
                    print('  token rejected (%d) — signing in again' % e.code)
                    token = get_token(email, password)
                    token_refresh_at = time.time() + token_expiry(token) * TOKEN_REFRESH_AT
                    continue
                if e.code in (502, 503, 429):
                    time.sleep(1.5 * attempt)
                    continue
                break
            except Exception as e:
                err = e
                time.sleep(1.5 * attempt)

        if err is not None:
            failed += 1
            consecutive += 1
            print('  [%d/%d] FAILED %s — %s' % (i, len(todo), rid, err))
            if consecutive >= STALL_AFTER:
                stalled = True
                print('  STOPPING: %d in a row failed, last error above. Nothing is '
                      'landing; fix that before re-running.' % consecutive)
                break
            continue

        pushed.add(rid)
        ok += 1
        consecutive = 0
        if i % 25 == 0 or i == len(todo):
            print('  [%d/%d] pushed (%d ok, %d failed so far)' % (i, len(todo), ok, failed))
            json.dump(sorted(pushed), open(state_path, 'w'))

    json.dump(sorted(pushed), open(state_path, 'w'))
    print('done: %d pushed, %d failed, %d total pushed all-time' % (ok, failed, len(pushed)))
    if stalled:
        # A non-zero exit so a wrapper, a cron or a person reading the tail can
        # tell a stalled run from a finished one. The 5 Aug run looked healthy
        # from the outside precisely because it never said otherwise.
        sys.exit(2)


if __name__ == '__main__':
    main()
