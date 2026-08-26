#!/usr/bin/env python3
"""Build 1071 — the Desk sends every photograph, and the right one.

MEASURED FIRST, ON THE REAL DATABASE. Not inferred:
  1,104 stored photographs · median 312 KB · average 651 KB · 12% over 1 MB
  Per job, newest 20:  12.3 photographs averaging 5.95 MB
  → 46% OF JOBS WITH PHOTOGRAPHS EXCEED THE 6 MB BUDGET.

Nearly half of every Desk analysis has been running on a subset of the job.

THREE DEFECTS, ONE CODE PATH. The third is the one that matters.

1 · THE ROUTE IS FED ORIGINALS
  `readPhotos()` sends `p._src`, the display signed URL — the ORIGINAL bytes.
  A 4,000px photograph is not four thousand pixels of evidence to a vision
  model; it is tiled and resized on arrival. So the size buys nothing and
  spends the whole budget. The app already knows this: The Walk sends
  `AI = { max:1600, q:0.85 }` with a comment saying that still resolves a nail
  head. The Desk simply never used it.

  ⚠ THE TRANSFORM MUST BE SIGNED, NOT APPENDED. I was going to rewrite the URL
    server-side — `/object/sign/` → `/render/image/sign/` plus `?width=`. That
    does not work, and reading the SHIPPED supabase-js is what proved it rather
    than a guess: `createSignedUrl` POSTs `{expiresIn, transform}` and the
    SERVER returns the signed URL, so the transform is inside the token. A
    token signed without one cannot authorise one.
  ⚠ AND `createSignedUrls` (PLURAL) HAS NO `transform` OPTION AT ALL — its only
    options are `download` and `cacheNonce`. That is why this build adds a
    second signing path, which 1059 deliberately avoided: the batch call the
    display uses is structurally incapable of asking for a resize. It is
    scoped to the <=20 photographs actually being sent, per photograph, and the
    200-photograph display call is untouched.
  ⚠ `resize:'contain'`, NOT the default. Supabase defaults to `cover`, which
    CROPS. Cropping evidence out of an insurance photograph to save bytes would
    be a far worse bug than the one being fixed.

2 · THE MESSAGE NAMED THE WRONG CAUSE
  *"skipped 7 (only the newest N are sent)"* blames the COUNT cap. On 46% of
  jobs the real cause was BYTES. A fluent, plausible, wrong explanation — the
  same class as build 1070's stale app stamp, three days apart. The route now
  reports `photos_capped_by: 'count' | 'bytes' | null` and the Desk says which.

3 · ⚠ EVERY FINDING AFTER A SKIPPED PHOTOGRAPH POINTED AT THE WRONG ONE
  This is a live mis-attribution bug and the byte cap is what triggers it.

  The model is told `photo_index` is "which photograph, 0-based" — 0-based into
  what it WAS SHOWN. The client maps that into what it SENT (`newestFirst[idx]`).
  The route's skip is a `continue`, so a photograph dropped MID-LIST shifts
  every later index by one and the two orderings silently diverge.

  Proven by executing the shipped loop, not by reading it (scratchpad
  proof_index.mjs, folded into gate_1071 as check C):

      submitted        A B C D E F G
      model sees       A B C D F G      (C skipped: 4.2 MB)
      photo_index 4 -> model means F, client shows E   ❌
      photo_index 5 -> model means G, client shows F   ❌

  2 of 6 findings attach the wrong photograph — and the Desk's whole point is
  that a human checks the evidence against the claim. Wrong photograph, wrong
  check. 1059's own note says this mapping is load-bearing.

  FIXED BY RETURNING THE TRUTH, not by renumbering: the route reports
  `photos_used`, the submitted indices it actually read, and the client maps
  `photo_index` through it. A skipped photograph can no longer shift anything.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

# ══ api/supplement.js ══════════════════════════════════════════════════════
API = 'api/supplement.js'
api = pl.load(API); api_orig = api

# 1 — the loop records WHICH submitted index it read, and why it stopped.
api = pl.sub(api,
"""      for (const p of want.slice(0, MAX_PHOTOS)) {
        const safe = storageUrlOrNull(p && p.url);
        if (!safe) { photosSkipped++; continue; }
        try {
          const r0 = await fetch(safe);
          if (!r0.ok) { photosSkipped++; continue; }
          const buf = Buffer.from(await r0.arrayBuffer());
          if (!buf.length || photoBytes + buf.length > MAX_PHOTO_BYTES) { photosSkipped++; continue; }
          photoBytes += buf.length;
          photoParts.push({ inline_data: {
            mime_type: /\\.png(\\?|$)/i.test(safe) ? 'image/png' : 'image/jpeg',
            data: buf.toString('base64') } });
          photosRead++;
        } catch (e) { photosSkipped++; }
      }""",
"""      /* ⚠ 1071: photosUsed records WHICH SUBMITTED INDEX each attached
         photograph came from, and it is the fix for a live mis-attribution.
         The model is told photo_index is 0-based into what it was SHOWN; the
         Desk maps that into what it SENT. Every skip below is a `continue`, so
         one photograph dropped MID-LIST shifted every later index by one and
         the two orderings diverged in silence. Returning the truth is the fix;
         renumbering would only move the lie. */
      const photosUsed = [];
      for (let pi = 0; pi < Math.min(want.length, MAX_PHOTOS); pi++) {
        const p = want[pi];
        const safe = storageUrlOrNull(p && p.url);
        if (!safe) { photosSkipped++; continue; }
        try {
          const r0 = await fetch(safe);
          if (!r0.ok) { photosSkipped++; continue; }
          const buf = Buffer.from(await r0.arrayBuffer());
          if (!buf.length) { photosSkipped++; continue; }
          if (photoBytes + buf.length > MAX_PHOTO_BYTES) {
            photosSkipped++; cappedByBytes = true; continue;   /* named, not guessed at */
          }
          photoBytes += buf.length;
          photoParts.push({ inline_data: {
            mime_type: /\\.png(\\?|$)/i.test(safe) ? 'image/png' : 'image/jpeg',
            data: buf.toString('base64') } });
          photosUsed.push(pi);
          photosRead++;
        } catch (e) { photosSkipped++; }
      }""")

# 2 — declare the two new locals beside the ones they belong with
api = pl.sub(api,
    "    let photosRead = 0, photosSkipped = 0, photoBytes = 0;",
    "    let photosRead = 0, photosSkipped = 0, photoBytes = 0;\n"
    "    let photosUsedOut = [], cappedByBytes = false;")

api = pl.sub(api,
    "      const want = Array.isArray(body.photos) ? body.photos : [];\n"
    "      photosSkipped = Math.max(0, want.length - MAX_PHOTOS);",
    "      const want = Array.isArray(body.photos) ? body.photos : [];\n"
    "      photosSkipped = Math.max(0, want.length - MAX_PHOTOS);\n"
    "      const cappedByCount = want.length > MAX_PHOTOS;")

api = pl.sub(api,
    "      if (!photosRead) {\n"
    "        res.status(400).json({ error: 'None of those photographs could be read from storage.' });\n"
    "        return;",
    "      photosUsedOut = photosUsed;\n"
    "      cappedByBytes = cappedByBytes || false;\n"
    "      photoCap = cappedByBytes ? 'bytes' : (cappedByCount ? 'count' : null);\n"
    "      if (!photosRead) {\n"
    "        res.status(400).json({ error: 'None of those photographs could be read from storage.' });\n"
    "        return;")

api = pl.sub(api,
    "    let photosUsedOut = [], cappedByBytes = false;",
    "    let photosUsedOut = [], cappedByBytes = false, photoCap = null;")

# 3 — report all of it. ⚠ photos_used is what makes photo_index trustworthy.
api = pl.sub(api,
    "        photos_read: photosRead,\n        photos_skipped: photosSkipped,",
    "        photos_read: photosRead,\n"
    "        photos_skipped: photosSkipped,\n"
    "        /* 1071: the submitted indices actually attached, in order. The Desk\n"
    "           maps photo_index through this; without it a mid-list skip points\n"
    "           every later finding at the wrong photograph. */\n"
    "        photos_used: photosUsedOut,\n"
    "        photo_bytes: photoBytes,\n"
    "        photos_capped_by: photoCap,")

# ══ supplement.html ════════════════════════════════════════════════════════
SRC = 'supplement.html'
src = pl.load(SRC); orig = src

# 4 — sign the AI copies small. Per photograph, because the batch call cannot.
src = pl.sub(src,
"""/* 1059 — direction B. The photographs, newest first, through the route's own
   SSRF bound. loadPhotos() has already signed every one of them into p._src,
   so there is no second signing path here. */
async function readPhotos(){""",
"""/* 1071: what the MODEL gets — 1600px, quality 85, the same rendition The Walk
   has always sent, whose own comment records that it still resolves a nail
   head. An original is not more evidence to a vision model (it is tiled and
   resized on arrival); it is the same evidence at 10x the bytes, and the bytes
   are the budget. Measured: 46% of jobs with photographs exceeded that budget,
   so nearly half of every analysis ran on a subset of the job.

   ⚠ resize:'contain', NOT the Supabase default. The default is 'cover', which
     CROPS. Cropping damage out of an insurance photograph to save bytes would
     be worse than the bug this fixes. */
var AI_TRANSFORM = { width: 1600, height: 1600, resize: 'contain', quality: 85 };

/* ⚠ A SECOND SIGNING PATH, which 1059 deliberately avoided — and the reason is
   structural, not a change of mind. loadPhotos() signs all 200 in ONE
   createSignedUrls() call, and that batch endpoint HAS NO transform option
   (only download and cacheNonce). Only the singular createSignedUrl carries
   one, and it must: the transform is POSTed and comes back INSIDE the signed
   token, so it cannot be appended to a URL afterwards. Read out of the shipped
   supabase-js, not assumed.

   Scoped to the <=20 photographs actually being sent. The display path is
   untouched. Falls back per photograph to the display URL it already holds, so
   a job still analyses if the transform is refused — and the caller counts the
   fallbacks, because a silent fallback would make this build inert and look
   exactly like a working one. */
async function signSmall(list){
  var out = await Promise.all(list.map(async function(p){
    try{
      var r = await sb.storage.from('photos')
                .createSignedUrl(p.storage_path, 3600, { transform: AI_TRANSFORM });
      if(r && r.data && r.data.signedUrl) return { url: r.data.signedUrl, small: true };
    }catch(_e){}
    return { url: p._src, small: false };
  }));
  return out;
}

/* 1059 — direction B. The photographs, newest first, through the route's own
   SSRF bound. */
async function readPhotos(){""")

src = pl.sub(src,
    "        photos: newestFirst.map(function(p){ return { url: p._src, path: p.storage_path }; }),",
    "        photos: aiUrls.map(function(u, i){\n"
    "          return { url: u.url, path: newestFirst[i].storage_path };\n"
    "        }),")

src = pl.sub(src,
"""  try{
    var r = await fetch('/api/supplement', {
      method: 'POST', headers: await authHeader(),
      body: JSON.stringify({
        mode: 'photos',""",
"""  try{
    var aiUrls = await signSmall(newestFirst);
    var nSmall = aiUrls.filter(function(u){ return u.small; }).length;
    var r = await fetch('/api/supplement', {
      method: 'POST', headers: await authHeader(),
      body: JSON.stringify({
        mode: 'photos',""")

# 5 — map photo_index through the indices the route actually used
src = pl.sub(src,
"""        var idx = (typeof g.photo_index === 'number') ? g.photo_index : -1;
        var ph = (idx >= 0 && idx < newestFirst.length) ? newestFirst[idx] : null;""",
"""        /* ⚠ 1071: photo_index is 0-based into what the MODEL SAW, not into
           what we sent. The route skips a photograph it cannot read or cannot
           afford, so before 1071 one mid-list skip pointed every later finding
           at the wrong photograph — measured at 2 of 6 on a realistic job.
           photos_used maps the model's position back to ours. An older route
           that does not send it falls back to identity, which is exactly what
           the old behaviour was. */
        var used = Array.isArray(j.photos_used) ? j.photos_used : null;
        var idx = (typeof g.photo_index === 'number') ? g.photo_index : -1;
        if(used && idx >= 0) idx = (idx < used.length) ? used[idx] : -1;
        var ph = (idx >= 0 && idx < newestFirst.length) ? newestFirst[idx] : null;""")

# 6 — say which cap bit, and whether the small copies were really used
src = pl.sub(src,
"""    var read = j.photos_read, skip = j.photos_skipped;
    el('analyzeNote').textContent = (read != null)
      ? ('Read ' + read + ' photograph' + (read === 1 ? '' : 's') +
         (skip ? ', skipped ' + skip + ' (only the newest ' + read + ' are sent)' : '') +
         ' — nothing is ticked; check each line.')
      : '';""",
"""    /* ⚠ 1071: name the REAL cause. This line used to say "only the newest N
       are sent" whatever happened, which blamed the count cap — and on 46% of
       jobs the cap that actually bit was the byte budget. A fluent, plausible,
       wrong explanation is worse than none. */
    var read = j.photos_read, skip = j.photos_skipped;
    var why = j.photos_capped_by === 'bytes'
      ? ' (the rest were too large to send together)'
      : (j.photos_capped_by === 'count' ? ' (only the newest 20 are sent)' : '');
    el('analyzeNote').textContent = (read != null)
      ? ('Read ' + read + ' photograph' + (read === 1 ? '' : 's') +
         (skip ? ', skipped ' + skip + why : '') +
         (nSmall < aiUrls.length
            ? ' — ' + (aiUrls.length - nSmall) + ' sent full size'
            : '') +
         ' — nothing is ticked; check each line.')
      : '';""")

# 7 — the Desk's own stamp, all three sites (1055 gave it one; 1070's lesson
#     is that a number bumped beside a stale sentence is not a bumped stamp)
src = pl.sub(src, 'THE SUPPLEMENT DESK · supplement.html · build 1059 (24 Aug 2026)',
                  'THE SUPPLEMENT DESK · supplement.html · build 1071 (26 Aug 2026)')
src = pl.sub(src, '>build 1059</span>', '>build 1071</span>')
src = pl.sub(src, 'var SD_BUILD = 1059;', 'var SD_BUILD = 1071;')

# ── proof of scope ───────────────────────────────────────────────────────
assert src.count('build 1059') == 0 and src.count('1059;') == 0
assert src.count('1071') >= 3
assert src.count('function signSmall(') == 1
assert src.count('AI_TRANSFORM') == 2                 # the const + its one use
assert "resize: 'contain'" in src, 'cover would CROP the evidence'
assert src.count('aiUrls') == 5
# ⚠ anchored on the READ, not the word — the comment beside it names
#   photos_used too, so a bare count says 2 and fails correct code.
#   Third time in two builds; the fix is always the assertion.
# ⚠ the ternary names it TWICE on one line, and the comment beside it a
#   third time. Assert the whole declaration, which is unique and is
#   the thing that actually has to exist.
assert src.count('var used = Array.isArray(j.photos_used) ? j.photos_used : null;') == 1
# the display path must be untouched: still ONE batch signing call, unchanged
assert src.count("createSignedUrls(paths, 3600)") == 1
# ⚠ 'createSignedUrl(' is a SUBSTRING of 'createSignedUrls(' and matches
#   the display batch call too. Assert the distinguishing form.
assert src.count('createSignedUrl(p.storage_path, 3600, { transform: AI_TRANSFORM })') == 1
# the old wrong message is gone, and the new one names a cause
assert src.count("only the newest ' + read + ' are sent") == 0
# the message branches on it twice (bytes, count) — counted, not guessed
assert src.count("j.photos_capped_by === 'bytes'") == 1
assert src.count("j.photos_capped_by === 'count'") == 1

assert api.count('photosUsed.push(pi)') == 1
assert api.count('photos_used: photosUsedOut') == 1
assert api.count('cappedByBytes = true') == 1
assert api.count('module.exports') == 0
# the SSRF bound is untouched — a render URL is still under /storage/v1/
assert api.count('function storageUrlOrNull') == 1
assert api.count("if (!raw.startsWith(STORAGE_PREFIX)) return null;") == 1
assert api.count('const MAX_PHOTOS = 20;') == 1       # count cap unchanged
assert api.count('MAX_PHOTO_BYTES = 6 * 1024 * 1024') == 1   # budget unchanged

pl.write_atomic(API, api)
pl.write_atomic(SRC, src)
pl.assert_in(SRC, "resize: 'contain'")
pl.assert_in(API, 'photos_used: photosUsedOut')
print('build 1071 written')
print(f'  supplement.html   {len(orig):,} -> {len(src):,} chars (+{len(src)-len(orig)})')
print(f'  api/supplement.js {len(api_orig):,} -> {len(api):,} chars (+{len(api)-len(api_orig)})')
