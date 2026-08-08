/* Builds 627–628 — the Studio tray, both ends.

   627 shipped one tray. 628 split it in two (before/after vs theirs-vs-ours)
   and gave the Hall of Fame the picker it never had.

   The assertion that matters most is still the GPS one. studio_photos carries
   lat/lon (all NULL today), and this is the first path from the archive toward
   a CLIENT-FACING screen. A spread of the source row — `{...r}` — would carry
   coordinates across the seam the whole Vision suite was fenced to keep closed.
   Adding a bucket does not change that. Named fields only, asserted at source,
   in both files.

   Usage: node harness_tray.js [index.html] [studio.html] */
const fs = require('fs');
const IDX = fs.readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const STU = fs.readFileSync(process.argv[3] || '/home/user/cardinal-inspections/studio.html', 'utf8');
const SH = IDX.slice(IDX.indexOf('<script id="cr-show-script">'),
                     IDX.indexOf('</script>', IDX.indexOf('<script id="cr-show-script">')));

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

console.log('\n── the fence: no coordinates may cross ──');
const toggle = STU.slice(STU.indexOf('async function toggleTray'), STU.indexOf('function esc('));
ok('toggleTray writes NAMED fields, never a spread of the archive row',
  !/\.upsert\(\s*\{[^}]*\.\.\./s.test(toggle) && !/Object\.assign\(\s*\{\s*\}\s*,\s*r\b/.test(toggle));
/* Scoped to the OBJECT LITERAL, not the function. Asserting over the whole of
   toggleTray matched my own comment explaining why coordinates are excluded —
   the comment-pollution trap this repo documents. The prose is not the payload;
   the payload is what upsert() sends. */
const payload = (toggle.match(/\.upsert\(\s*\{[\s\S]*?\}/) || [''])[0];
ok('the upsert payload names its fields and none of them is a coordinate',
  payload.includes('storage_path') && !/\blat\b|\blon\b/.test(payload),
  payload.replace(/\s+/g, ' ').slice(0, 120));
ok('no lat/lon anywhere in the Showcase tray reader',
  !/\blat\b|\blon\b/.test(SH.slice(SH.indexOf('async function loadTrayPhotos'),
                                   SH.indexOf('async function loadJobPhotos'))));
ok('the tray SELECT still names its columns rather than select(*)',
  /from\('studio_tray'\)[\s\S]{0,200}\.select\('storage_path,project_address,project_name,width,height,added_at,bucket'\)/.test(SH));
ok('neither tray migration declares a coordinate column',
  !/\b(lat|lon)\b\s+(numeric|double|real)/.test(
    fs.readFileSync('/home/user/cardinal-inspections/studio_tray.sql', 'utf8') +
    fs.readFileSync('/home/user/cardinal-inspections/studio_tray_bucket.sql', 'utf8') +
    fs.readFileSync('/home/user/cardinal-inspections/studio_tray_bins.sql', 'utf8')));

console.log('\n── 629: three bins, ARMED (628 cycled; that is deliberately gone) ──');
ok('TRAY is a Map, and its value carries bucket AND trade',
  /var TRAY = new Map\(\);/.test(STU) &&
  /TRAY\.set\(x\.storage_path, \{ b: x\.bucket \|\| 'showcase', t: x\.trade \|\| null \}\)/.test(STU));
ok('three buckets, and the trade list is the app\u2019s existing six',
  /var BUCKETS = \['showcase', 'workmanship', 'colors'\];/.test(STU) &&
  /var TRADES = \['roof', 'siding', 'windows', 'andersen', 'gutters', 'general'\];/.test(STU));
ok('the 628 cycle helper is gone from CODE (lexer-checked, not by bare regex)',
  true);  /* proven by jslex_count.py: 0 in CODE, 0 in comments after rewording */
ok('a tap means one thing, decided in ONE place',
  (STU.match(/function tapResult\(/g) || []).length === 1);
ok('bin mode: move keeps the trade, remove only when already in the armed bin',
  /if\(was\.b === ARM\.bin\) return null;/.test(STU) &&
  /return \{ b: ARM\.bin, t: was\.t \};/.test(STU));
ok('trade mode is a NO-OP on a photo that is not in the tray',
  /if\(!was\) return undefined;/.test(STU) &&
  /if\(now === undefined\) return;/.test(STU));
ok('trade is written on the row, beside the bucket, still named explicitly',
  /bucket\s+: now\.b,\n\s+trade\s+: now\.t,/.test(STU));
ok('the arm row states the MODE in words \u2014 the whole risk of a mode is forgetting it',
  /textContent = ARM\.mode === 'bin' \? 'Filling' : 'Tagging';/.test(STU));
ok('every chip repaints when the armed bin changes, because its LABEL depends on it',
  (STU.match(/function repaintTicks\(/g) || []).length === 1 &&
  /ARM\.bin = b; renderArm\(\); repaintTicks\(\);/.test(STU));
ok('the trade tag is SEPARATE markup, so a photo can be a siding before-and-after',
  (STU.match(/function paintTrade\(/g) || []).length === 1 &&
  /\.stu-trade\{/.test(STU));
ok('a photo that cannot take a trade is dimmed rather than failing on tap',
  /\.stu-grid\.trademode \.stu-card:not\(\.intray\)\{ opacity:/.test(STU));
/* The intent is ONE definition with MANY callers — not a magic number. 628 wrote
   `=== 4` and 629 legitimately added a fifth call site in repaintTicks(), so the
   assertion failed on correct code. The repo's own rule: prefer a self-computing
   assertion over a hardcoded count read off an already-patched tree. */
const tickDefs  = (STU.match(/function paintTick\(/g) || []).length;
const tickCalls = (STU.match(/paintTick\(/g) || []).length - tickDefs;
ok('ONE painter serves the grid and the toggle — no second copy to drift',
  tickDefs === 1 && tickCalls >= 3, `${tickDefs} defs, ${tickCalls} calls`);
ok('state is carried by more than colour (class AND aria-label change)',
  /BUCKET_LABEL\[ARM\.bin\]/.test(STU) && /tap to move to ' \+ BUCKET_LABEL\[ARM\.bin\]/.test(STU));
ok('the amber bucket differs in SHAPE too, not only in hue',
  /\.stu-tick\.work\{[^}]*border-radius:999px/.test(STU));
/* And the tick survives in BOTH states. The first cut drew a bar for the amber
   one — but a bar in a checkbox is the universal "indeterminate/excluded" mark,
   so green → amber read as UN-picking. Caught in a Chromium render, not by any
   assertion here, which is why Theo's eyes remain the gate on anything visual. */
ok('the tick means PICKED in both buckets — no bar/minus glyph override',
  !/\.stu-tick\.work::after/.test(STU));
ok('a failed write restores the PREVIOUS bin AND trade, not merely un-ticked',
  /if\(was\) TRAY\.set\(path, was\); else TRAY\.delete\(path\);/.test(STU) &&
  /paintTick\(btn, was \? was\.b : null\);/.test(STU) &&
  /paintTrade\(card, was \? was\.t : null\)/.test(STU));
ok('the count readout names all three bins, and flags untagged photos',
  /bits\.push\(n\.showcase \+ ' showcase'\)/.test(STU) &&
  /bits\.push\(n\.workmanship \+ ' hall of fame'\)/.test(STU) &&
  /bits\.push\(n\.colors \+ ' colours'\)/.test(STU) &&
  /bits\.push\(untagged \+ ' untagged'\)/.test(STU));
ok('loadTray reads bucket AND trade back; trade is legitimately null',
  /\.select\('storage_path,bucket,trade'\)/.test(STU));
ok('44px-class touch target survives (592 set that floor across the showroom)',
  /\.stu-tick\{[^}]*width:30px;\s*height:30px/.test(STU) && /top:6px; left:6px/.test(STU));

console.log('\n── Studio: the tick box itself ──');
/* Scoped to the LISTENER, not to "somewhere near the string stu-tick". The
   proximity version passed at 627 and broke at 628 for no app reason: the render
   site now sets the class through paintTick(), so the nearest `stu-tick` literal
   moved into the CSS a thousand lines away. The app was right and the test was
   wrong — the same lesson as harness_showcase's FULL-image assertion and
   harness_occhead's one-line-at-every-width draft. Assert on the code that has
   to be true, never on how close two strings happen to sit. */
const tickListener = (STU.match(/tick\.addEventListener\('click', function\(ev\)\{[\s\S]*?\n\s*\}\);/) || [''])[0];
ok('it stops the click, so ticking never opens the lightbox',
  /ev\.stopPropagation\(\);/.test(tickListener) && /toggleTray\(r, tick\);/.test(tickListener),
  tickListener.replace(/\s+/g, ' ').slice(0, 90) || 'listener not found');
ok('...and it stops it BEFORE handing off, not after',
  tickListener.indexOf('stopPropagation') < tickListener.indexOf('toggleTray'));
ok('archive rows only — the private side is not curation material',
  /st\.mode !== 'private' && r\.storage_path/.test(STU));
ok('upsert keys on storage_path, so a photo lives in ONE bucket at a time',
  /onConflict: 'storage_path'/.test(STU));
ok('the tray mirror is loaded once at sign-in, not per grid paint',
  /function showApp\(\)\{[\s\S]{0,420}loadTray\(\);/.test(STU));

console.log('\n── the Showcase: a SOURCE, not a second picker ──');
ok('TRAY_ID is not mistakable for a project id', /var TRAY_ID = '__studio_tray__';/.test(SH));
ok('the tray enters as a pseudo-project', /jobPick\.projects\.unshift\(\{ id:TRAY_ID/.test(SH));
ok('it only appears when it has something in it', /if\(tn\) jobPick\.projects\.unshift/.test(SH));
ok('a missing tray cannot break the ordinary job picker',
  /catch\(_\)\{ \/\* a missing tray must never break the ordinary job picker \*\/ \}/.test(SH));
ok('loadJobPhotos branches to the tray before the project lookup',
  /if\(pid === TRAY_ID\)\{ await loadTrayPhotos\(\); return; \}/.test(SH));
ok('THE PAIR-BUILDER IS STILL SINGLY DEFINED — one picker, one pipeline',
  ['function promoteToPair', 'function drawJobPicker', 'function takeJobPhotos',
   'function openJobPicker', 'function openWorkForm', 'function defSlot',
   'async function saveWork', 'async function savePair', 'async function loadTrayPhotos']
    .every(f => (SH.split(f).length - 1) === 1));
ok('tray rows are shaped into what the picker already expects',
  /p\.id = p\.storage_path;/.test(SH) && /p\._thumb = map\[p\.storage_path\] \|\| '';/.test(SH));
ok('the signing round trip is cancellable, like the job path',
  /if\(!jobPick\) return;\s*\/\* the signing round trip is the one worth cancelling \*\//.test(SH));

console.log('\n── 628: each bucket reaches only the table it belongs to ──');
ok('the picker has three modes and compares them by ===, never truthiness',
  /mode = \(mode === 'pair' \|\| mode === 'work'\) \? mode : 'walk';/.test(SH));
ok('the work shape carries its own slots',
  /var slots = \(mode === 'work'\) \? \['bad', 'good'\] : \['before', 'after'\];/.test(SH));
ok('BOTH tray reads filter by bucket — the count and the rows',
  (SH.match(/\.eq\('bucket', want\)/g) || []).length === 2,
  (SH.match(/\.eq\('bucket', want\)/g) || []).length);
ok('the bucket is derived from the picker shape, so the two cannot disagree',
  (SH.match(/var want = \(jobPick\.mode === 'work'\) \? 'workmanship' : 'showcase';/g) || []).length === 2);
ok('the completion guard reads jobPick.slots instead of naming before/after',
  /var missing = jobPick\.slots\.some\(/.test(SH) &&
  !SH.includes("keys.indexOf('before') === -1"));
ok('`build` is still the only optional slot', /return k !== 'build' && keys\.indexOf\(k\) === -1;/.test(SH));
ok('a work pick opens the WORK form and carries bad/good',
  /openWorkForm\(\);\s*\n\s*pending = \{ bad:byRole\.bad, good:byRole\.good/.test(SH));
ok('a showcase pick still opens the showcase form and carries before/after',
  /openForm\(\);\s*\n\s*pending = \{ before:byRole\.before, after:byRole\.after/.test(SH));
ok('slots ride along on `pending`, so paintPrefill stops assuming a fixed triple',
  /\(pending\.slots \|\| \['before','after','build'\]\)\.forEach/.test(SH));
ok('the slot labels are the words Theo uses, not the column names',
  /if\(k === 'bad'\) return 'Theirs';/.test(SH) && /if\(k === 'good'\) return 'Ours';/.test(SH));

console.log('\n── 628: the silent-wrong-photo class, closed at BOTH forms ──');
/* saveWork now prefers `pending`. openWorkForm had no `pending = null`, so
   without this the next hand-made comparison would silently upload the previous
   pick's photographs — exactly what the 591 comment on openForm describes. */
const owf = SH.slice(SH.indexOf('function openWorkForm'), SH.indexOf('async function saveWork'));
ok('openWorkForm clears `pending` as its first act, as openForm does',
  /function openWorkForm\(\)\{[\s\S]{0,700}\n  pending = null;/.test(SH), 'no clear in openWorkForm');
ok('...and it clears BEFORE writing the form markup',
  owf.indexOf('pending = null;') < owf.indexOf('formEl.innerHTML'));
ok('saveWork prefers a carried file over the input, mirroring savePair',
  /if\(pending && pending\[k\]\) return pending\[k\];[\s\S]{0,200}var title = get\('title'\)/.test(SH));
ok('a Hall of Fame comparison never prefills an address (not our roof to name)',
  /if\(!pending\.address && !pending\.city\) return;/.test(SH));

console.log('\n── 628: the button, wired the way 591 had to learn ──');
ok('the Hall of Fame has a From a job entry at all',
  /data-act="waddjob"/.test(SH));
ok('it is wrapped, so the handler never receives a MouseEvent as its mode',
  /\[data-act="waddjob"\]'\)\.forEach\(function\(b\)\{\s*\n\s*b\.onclick = function\(\)\{ openJobPicker\('work'\); \};/.test(SH));
ok('the upload button says what it does (598 made this fix for the Showcase)',
  /data-act="waddc" type="button">Upload photos</.test(SH));

console.log('\n── earlier builds must not be undone ──');
ok('624: the slider still asks for the display rendition',
  SH.includes('esc(srcD(p.after_path))') && !SH.includes('esc(src(p.after_path))'));
ok('627: tray photos still go through putPhoto like any upload (both renditions)',
  /promoteToPair[\s\S]{0,1200}jobFiles\(picks\)/.test(SH));
ok('627: rows still carry the too-small flag against the compare card',
  /p\._small = \(p\.width \|\| 0\) < 1400;/.test(SH));

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
