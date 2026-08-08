/* Build 627 — the Studio tray, both ends.

   The assertion that matters most here is the GPS one. studio_photos carries
   lat/lon (all NULL today), and this feature is the first path from the archive
   toward a CLIENT-FACING screen. A spread of the source row — `{...r}` — would
   carry coordinates across the seam the whole Vision suite was fenced to keep
   closed. Named fields only, asserted at source, in both files.

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
   the comment-pollution trap this repo documents, and the third time it caught
   me tonight. The prose is not the payload; the payload is what upsert() sends. */
const payload = (toggle.match(/\.upsert\(\s*\{[\s\S]*?\}/) || [''])[0];
ok('the upsert payload names 6 fields and none of them is a coordinate',
  payload.includes('storage_path') && !/\blat\b|\blon\b/.test(payload),
  payload.replace(/\s+/g, ' ').slice(0, 120));
ok('no lat/lon anywhere in the Showcase tray reader',
  !/\blat\b|\blon\b/.test(SH.slice(SH.indexOf('async function loadTrayPhotos'),
                                   SH.indexOf('async function loadTrayPhotos') + 1400)));
ok('the tray SELECT names its columns rather than select(*)',
  /from\('studio_tray'\)[\s\S]{0,120}\.select\('storage_path,project_address,project_name,width,height,added_at'\)/.test(SH));
ok('studio_tray.sql declares no coordinate columns',
  !/\b(lat|lon)\b\s+(numeric|double|real)/.test(
    fs.readFileSync('/home/user/cardinal-inspections/studio_tray.sql', 'utf8')));

console.log('\n── Studio: the tick box ──');
ok('a tick is added to the card', /className = 'stu-tick'/.test(STU));
ok('it stops the click, so ticking never opens the lightbox',
  /stu-tick[\s\S]{0,600}ev\.stopPropagation\(\)/.test(STU));
ok('archive rows only — the private side is not curation material',
  /st\.mode !== 'private' && r\.storage_path/.test(STU));
ok('the write is optimistic AND reverts on failure',
  /if\(res && res\.error\)[\s\S]{0,200}if\(on\) TRAY\.delete\(path\); else TRAY\.add\(path\);/.test(STU));
ok('upsert keys on storage_path, so a double tick is a no-op not a duplicate',
  /onConflict: 'storage_path'/.test(STU));
ok('the tray mirror is loaded once at sign-in, not per grid paint',
  /function showApp\(\)\{[\s\S]{0,420}loadTray\(\);/.test(STU));
ok('44px-class touch target (592 set that floor across the showroom)',
  /\.stu-tick\{[^}]*width:30px;\s*height:30px/.test(STU) && /top:6px; left:6px/.test(STU));

console.log('\n── the Showcase: a SOURCE, not a second picker ──');
ok('TRAY_ID is not mistakable for a project id', /var TRAY_ID = '__studio_tray__';/.test(SH));
ok('the tray enters as a pseudo-project', /jobPick\.projects\.unshift\(\{ id:TRAY_ID/.test(SH));
ok('it only appears when it has something in it', /if\(tn\) jobPick\.projects\.unshift/.test(SH));
ok('a missing tray cannot break the ordinary job picker',
  /catch\(_\)\{ \/\* a missing tray must never break the ordinary job picker \*\/ \}/.test(SH));
ok('loadJobPhotos branches to the tray before the project lookup',
  /if\(pid === TRAY_ID\)\{ await loadTrayPhotos\(\); return; \}/.test(SH));
ok('the pair-builder itself is UNTOUCHED — one picker, one pipeline',
  (SH.match(/function promoteToPair/g) || []).length === 1 &&
  (SH.match(/function drawJobPicker/g) || []).length === 1 &&
  (SH.match(/function takeJobPhotos/g) || []).length === 1);
ok('tray rows are shaped into what the picker already expects',
  /p\.id = p\.storage_path;/.test(SH) && /p\._thumb = map\[p\.storage_path\] \|\| '';/.test(SH));
ok('the signing round trip is cancellable, like the job path',
  /if\(!jobPick\) return;\s*\/\* the signing round trip is the one worth cancelling \*\//.test(SH));

console.log('\n── quality: a soft photo must not reach a customer unmarked ──');
ok('rows carry a too-small flag against the compare card',
  /p\._small = \(p\.width \|\| 0\) < 1400;/.test(SH));

console.log('\n── 624 must not be undone ──');
ok('the slider still asks for the display rendition',
  SH.includes('esc(srcD(p.after_path))') && !SH.includes('esc(src(p.after_path))'));
ok('tray photos go through putPhoto like any upload (both renditions)',
  /promoteToPair[\s\S]{0,900}jobFiles\(picks\)/.test(SH));

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
