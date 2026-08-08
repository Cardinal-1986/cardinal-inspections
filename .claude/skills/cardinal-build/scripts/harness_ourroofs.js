/* Build 630 — "Our roofs in this colour": multi-upload, shrink, delete, lightbox.

   Theo reported six things from the iPad on the Onyx Black page. TWO OF THEM
   SHARE ONE ROOT CAUSE, and that is what this harness mostly guards:

     storage.buckets.photos.file_size_limit = 10 MB, and upload() sent RAW
     camera bytes. The six photos already on that page are 5.37–8.04 MB each,
     so bigger ones were REFUSED ("upload fails") and the survivors made the
     grid ~40 MB to paint ("scrolling locks up").

   The fix is the mechanism that already existed in cr-show-script. If a future
   build re-introduces a raw upload here, or copies shrink() instead of reusing
   it, these assertions are what should go red.

   633 added a THIRD rendition and this harness moved with it. The tile is
   ~270 CSS px and was loading the 1400px DISP copy — five times more image than
   it can show. THUMB (640px) is what the grid asks for now, with a three-level
   fallback so a photo from any era still renders.

   Usage: node harness_ourroofs.js [path-to-index.html] */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const H = fs.readFileSync(FILE, 'utf8');
const blk = (tag, id) => { const i = H.indexOf(`<${tag} id="${id}">`);
  return H.slice(H.indexOf('>', i) + 1, H.indexOf(`</${tag}>`, i)); };
const OCC = blk('script', 'cr-occ-script');
const CSS = blk('style',  'cr-occ-styles');
const SH  = blk('script', 'cr-show-script');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

console.log('\n── the 10 MB refusal, and the 40 MB grid ──');
ok('the raw file is NEVER uploaded — it is shrunk first',
  /await shrinkFor\(list\[i\]\)/.test(OCC) &&
  !/\.upload\(path, file\b/.test(OCC), 'a raw upload survived');
ok('shrink is REUSED from the Showcase, not copied into this module',
  /shrink: shrink,/.test(SH) && /renditions: \{ full: FULL, disp: DISP, thumb: THUMB \}/.test(SH) &&
  (OCC.match(/function shrink\(/g) || []).length === 0,
  'a second shrink implementation exists');
/* 633: the three renditions are declared together in cr-show-script, beside each
   other, so nobody adds a fourth somewhere else. THUMB is 640px because the tile
   is minmax(255px,1fr) — ~270 CSS px, ~540 device px at 2x. */
ok('the tile rendition exists and is sized for a tile, not a compare card',
  /var THUMB = \{ max: 640, q: 0\.80 \}/.test(SH) &&
  /var DISP = \{ max: 1400, q: 0\.82 \}/.test(SH));
ok('a missing image toolchain fails loudly rather than uploading raw',
  /if\(!small\) throw new Error\('Image tools unavailable/.test(OCC));
/* 633: ONE place looks the toolchain up. The optimiser wants the thumbnail
   alone — composing it from shrinkFor() would re-encode a 3840px copy per photo
   only to discard it — so it calls shrinkOne directly rather than growing a
   second availability check beside the first. */
ok('the toolchain is looked up in exactly one place',
  (OCC.match(/window\.CardinalShowcase/g) || []).length === 1 &&
  (OCC.match(/async function shrinkOne\(/g) || []).length === 1);
ok('an upload writes full + thumb, and the thumb is best-effort',
  /upload\(path, small\.full, \{ contentType:'image\/jpeg', upsert:false \}\)/.test(OCC) &&
  /upload\(thumbOf\(path\), small\.thumb, \{ contentType:'image\/jpeg', upsert:true \}\)/.test(OCC));
/* DISP is no longer written on this screen. Nothing here consumes a 1400px
   image, and a rendition no consumer reads is upload time and storage spent on
   nothing. Older photos keep theirs — hence the fallback below. */
ok('a new upload no longer writes the display copy nothing shows',
  !/small\.disp/.test(OCC));
/* The invariant is "EVERY upload in this module writes JPEG", not "there are
   exactly two of them". 630 wrote `=== 2`; 631 added the optimiser's two and the
   correct build failed. That is rule 4 of BUG_CLASSES class 15 — the class I had
   just written — so it now counts uploads and requires each to declare the type. */
const uploads = (OCC.match(/\.upload\(/g) || []).length;
const jpegs   = (OCC.match(/contentType:'image\/jpeg'/g) || []).length;
ok('EVERY upload stores JPEG — HEIC off an iPhone would break on Chrome',
  uploads > 0 && jpegs === uploads && /'\.jpg'/.test(OCC),
  `${uploads} uploads, ${jpegs} declare image/jpeg`);
/* 633, and this is the build. Theo: "Page still feels heavy". The tile is
   ~270 CSS px and was being handed the 1400px DISP copy at 0.65 MB each. */
ok('the grid asks for the TILE rendition, not the compare-card one',
  /p\._src  = t \|\| d \|\| map\[p\.storage_path\]/.test(OCC));
/* THREE eras of photograph share this grid: pre-630 (original only), 630-632
   (original + -d) and 633+ (original + -t). The fallback ORDER is the feature —
   without it every existing photograph vanishes. Load-bearing, not defensive. */
ok('...falling back through the display copy to the original',
  /return map\[thumbOf\(p\.storage_path\)\] \|\| map\[dispOf\(p\.storage_path\)\] \|\| map\[p\.storage_path\];/.test(OCC));
ok('the lightbox still prefers the biggest thing that exists',
  /p\._full = map\[p\.storage_path\] \|\| d \|\| t;/.test(OCC));
ok('all three paths are signed in ONE round trip, not three',
  (OCC.match(/await signMany\(want\)/g) || []).length === 1 &&
  (OCC.match(/want\.push\(/g) || []).length === 3);
/* signMany keyed by ARRAY POSITION from 630 to 632 and got away with it because
   both requested paths usually existed. 633 asks for a third that is absent on
   EVERY photograph the first time it runs; a compacted response would then hand
   each photo its neighbour's picture — silently, and on a client-facing screen. */
ok('the signed map is keyed by the path the API answered for, not by position',
  /out\[d\.path \|\| list\[i\]\] = d\.signedUrl;/.test(OCC) &&
  !/out\[list\[i\]\] = d\.signedUrl;/.test(OCC));

console.log('\n── multi-select ──');
ok('the input accepts many files',
  /accept="image\/\*" multiple/.test(OCC));
ok('every picked file is uploaded, not just the first',
  /upload\(Array\.prototype\.slice\.call\(fi\.files\)\)/.test(OCC) &&
  /for\(var i = 0; i < list\.length; i\+\+\)/.test(OCC));
ok('the input is cleared, so re-picking the same file still fires',
  /fi\.value = '';/.test(OCC));
/* Date.now() collides when several files land in the same millisecond, and
   upsert:false makes that throw. `multiple` would have created this bug on its
   very first use. */
ok('paths are uuids, not Date.now() — multi-select would collide',
  /crypto\.randomUUID\(\)/.test(OCC) && !/Date\.now\(\) \+ '\.'/.test(OCC));
ok('progress is per-file, and the result says what actually happened',
  /'Uploading ' \+ \(i \+ 1\) \+ ' of ' \+ list\.length/.test(OCC) &&
  /could not be added/.test(OCC));
ok('one failure does not abandon the rest of the batch',
  /\}catch\(e\)\{\s*\n\s*failed\+\+;/.test(OCC));

console.log('\n── delete ──');
ok('there is a delete control at all', /class="occ-del"/.test(OCC) && /\.occ-del\{/.test(CSS));
ok('it is admin-gated in the UI (RLS is the real fence)', /var canDel = amAdmin\(\);/.test(OCC));
ok('an RLS refusal is detected by ROW COUNT, not by an error',
  /if\(!del \|\| !del\.data \|\| !del\.data\.length\) throw new Error\('Not allowed/.test(OCC));
/* Row first, object second: an orphaned object costs pennies, a row pointing at
   nothing renders as a hole in the grid. */
ok('the ROW is deleted before the storage object, deliberately',
  OCC.indexOf(".from('oc_color_photos').delete()") < OCC.indexOf("storage.from('photos').remove"));
/* All three, because a photo can have any combination of them depending on the
   build it was uploaded under. Removing a path that does not exist is free. */
ok('every rendition is removed alongside the original',
  /remove\(\s*\[row\.storage_path, dispOf\(row\.storage_path\), thumbOf\(row\.storage_path\)\]\)/.test(OCC));

console.log('\n── full screen, and swiping ──');
/* `openLens` with PARENS — a call. The bare name also appears in this module's
   comment explaining why it is not reused, and matching that made a correct
   build go red. Sixth instance this session; see BUG_CLASSES class 15. */
ok('a lightbox exists and is its own element, not the Showcase’s',
  /#cr-occ-shot\{/.test(CSS) && (OCC.match(/function openShot\(/g) || []).length === 1 &&
  !/openLens\(/.test(OCC), 'openLens is CALLED here');
ok('tapping a photo opens it', /im\.onclick = function\(\)\{ openShot\(/.test(OCC));
ok('swipe needs horizontal INTENT and real distance, so a tap cannot step it',
  /Math\.abs\(dx\) > 45 && Math\.abs\(dx\) > Math\.abs\(dy\) \* 1\.6/.test(OCC));
ok('touch listeners are passive — a non-passive one would fight the scroll',
  (OCC.match(/\{ passive:true \}/g) || []).length === 2);
ok('the backdrop closes it but the photo does not (a mis-tap must not eject you)',
  /if\(ev\.target === el\) closeShot\(\)/.test(OCC));
ok('keyboard works on the desktop — Escape and the arrows',
  /ev\.key === 'Escape'/.test(OCC) && /ev\.key === 'ArrowLeft'/.test(OCC) &&
  /ev\.key === 'ArrowRight'/.test(OCC));
ok('the key listener is REMOVED on close, not left bound forever',
  /document\.removeEventListener\('keydown', onShotKey\)/.test(OCC));
ok('the lightbox shows the FULL image, while the grid shows the small one',
  /el\.querySelector\('img'\)\.src = p\._full \|\| p\._src/.test(OCC));
ok('a lightbox left open cannot survive into the next visit',
  /try\{ closeShot\(\); \}catch\(_\)\{\}/.test(OCC));

console.log('\n── the caption, and the scroll ──');
ok('the caption is a dark bar with pink letters, as asked',
  /#cr-occ \.occ-ours figcaption\{[\s\S]{0,700}background:var\(--occ-head,#231F20\)/.test(CSS) &&
  /color:var\(--occ-pink-on-dark,#F55CB2\)/.test(CSS));
/* --occ-pink-on-dark is 5.48:1 on #231F20. The brand pink #EC008C is 3.84:1 as
   small text and is a FILL/large-type colour under OC's own rules — using it
   here would have honoured the request and failed the floor. */
ok('it uses the measured pink, NOT the brand fill pink',
  !/#cr-occ \.occ-ours figcaption\{[^}]*color:var\(--occ-red/.test(CSS));
/* 633, Theo: "white boxes then loads slow". 623 set --occ-card:#FFFFFF and the
   figure showed through until the image painted, so an ordinary lazy load
   flashed WHITE on a near-black page and read as a fault. */
ok('an unpainted tile is dark, not white',
  /#cr-occ \.occ-ours img\{[\s\S]{0,600}background:var\(--occ-head,#231F20\)\}/.test(CSS));
ok('the view contains its own scroll instead of chaining into the page',
  /#cr-occ\{[\s\S]{0,3000}overscroll-behavior:contain;/.test(CSS));
ok('the lightbox contains its scroll too', /#cr-occ-shot\{[^}]*overscroll-behavior:contain/.test(CSS));

console.log('\n── 631: optimise in place ──');
ok('there is an optimiser, defined once',
  (OCC.match(/async function optimiseOurs\(/g) || []).length === 1);
/* The exact test for "went up before 630" is the missing -d twin — no size
   lookup and no guessing, and it costs nothing because both paths are already
   being signed for the grid. */
ok('it targets photos with no THUMBNAIL, not a guess at size',
  /p\._needsOpt = !t;/.test(OCC) &&
  /OURS\.filter\(function\(p\)\{ return p\._needsOpt && p\._full; \}\)/.test(OCC));
/* ⚠️ THE SAFETY PROPERTY. It never writes the table, so a failure leaves the
   photo exactly as it was. A re-encode that rewrote storage_path could strand
   rows mid-run and leave the grid full of holes. */
ok('it NEVER touches oc_color_photos — a failure cannot orphan a row', (() => {
  const f = OCC.slice(OCC.indexOf('async function optimiseOurs('));
  return !f.slice(0, f.indexOf('/* 630, Theo:')).includes("from('oc_color_photos')");
})());
/* ⚠️ 633 CHANGED THIS DELIBERATELY. 631 re-encoded the ORIGINAL to 3840px and
   gained almost nothing — a drone photo is already about that size, which is
   exactly where "39.9 down to 29 MB" came from. What the page pays for is the
   tile, so 633 writes only the missing thumbnail and never touches the original.
   Brace-matched, not sliced to a landmark: a slice that runs past the function
   sweeps up the neighbours and fails correct code (BUG_CLASSES class 15). */
const optBody = (() => {
  const i = OCC.indexOf('async function optimiseOurs('); if (i === -1) return '';
  let d = 0; const j = OCC.indexOf('{', i);
  for (let k = j; k < OCC.length; k++) {
    if (OCC[k] === '{') d++;
    else if (OCC[k] === '}') { d--; if (!d) return OCC.slice(i, k + 1); }
  }
  return '';
})();
ok('the optimiser was found and brace-matched', optBody.length > 400, optBody.length + ' chars');
ok('it writes the THUMBNAIL and nothing else — the original is untouched',
  /\.upload\(thumbOf\(todo\[i\]\.storage_path\), thumb,[\s\S]{0,90}upsert:true/.test(optBody) &&
  (optBody.match(/\.upload\(/g) || []).length === 1 &&
  !/\.upload\(todo\[i\]\.storage_path/.test(optBody));
/* Re-encoding a 640px thumbnail from a 3840px source downloads 3.42 MB per
   photo on an iPad when a 0.65 MB one is right there and ample. */
ok('it re-encodes FROM the display copy where one exists, not the original',
  /p\._optFrom = d \|\| map\[p\.storage_path\];/.test(OCC) &&
  /var from = todo\[i\]\._optFrom \|\| todo\[i\]\._full;/.test(optBody));
/* shrink() does URL.createObjectURL(file) — a blob: URL, same-origin, canvas
   stays clean. Handing it the remote https URL would taint the canvas and make
   toBlob() throw. Named trap on this project (the CompanyCam picker). */
ok('the bytes are fetched to a BLOB first — the canvas-taint trap',
  /await res\.blob\(\)/.test(OCC) && /new File\(\[blob\]/.test(OCC) &&
  !/shrinkFor\(todo\[i\]\._full\)/.test(OCC));
ok('it reuses the shared shrink rather than growing a second one',
  (OCC.match(/async function shrinkFor\(/g) || []).length === 1 &&
  (OCC.match(/function shrink\(/g) || []).length === 0 &&
  /var thumb = await shrinkOne\(file, 'thumb'\);/.test(optBody));
ok('the button hides itself when there is nothing to fix',
  /b\.hidden = !n;/.test(OCC) && /paintOptBtn\(\)/.test(OCC));
/* 631's toast said "39.9 MB down to 29 MB" — true of the stored originals, and
   it told him nothing about why the page was still slow. Report the number he
   actually feels: what this page loads next time. */
ok('it reports what the PAGE will load, not what the originals weigh',
  /' \\u2014 this page now loads ' \+\s*\n?\s*mb\(after\) \+ ' instead of ' \+ mb\(before\)/.test(OCC));

console.log('\n── functional: the shipped path helpers and step bounds ──');
/* Wrapped so a build WITHOUT these functions reports six clean FAILs instead of
   throwing. A negative control that crashes proves the file differs; one that
   goes RED proves WHICH behaviours are missing. */
try {
  const dom = new JSDOM('<div></div>');
  global.document = dom.window.document;
  const grab = (from, to) => OCC.slice(OCC.indexOf(from), OCC.indexOf(to));
  const code = grab('function dispOf(path){', 'var OURS = [], SHOT = 0;')
             + 'var OURS = [], SHOT = 0;'
             + grab('function stepShot(d){', 'function onShotKey(')
             + 'function paintShot(){}';
  const f = new Function(code + '; return { dispOf, thumbOf, setOurs:function(n){ OURS.length=0; for(var i=0;i<n;i++) OURS.push({}); }, get:function(){return SHOT;}, set:function(v){SHOT=v;}, stepShot };')();

  ok('dispOf inserts -d before the extension',
    f.dispOf('oc-colors/onyx-black/abc.jpg') === 'oc-colors/onyx-black/abc-d.jpg',
    f.dispOf('oc-colors/onyx-black/abc.jpg'));
  ok('dispOf handles a path with no extension rather than mangling it',
    f.dispOf('oc-colors/x/abc') === 'oc-colors/x/abc-d', f.dispOf('oc-colors/x/abc'));
  ok('dispOf on empty is empty, not "-d"', f.dispOf('') === '' && f.dispOf(null) === '');
  /* Both helpers delegate to one sfx(), so they cannot drift into different
     rules for the no-extension case — which is the whole reason for it. */
  ok('thumbOf inserts -t in exactly the same place',
    f.thumbOf('oc-colors/onyx-black/abc.jpg') === 'oc-colors/onyx-black/abc-t.jpg',
    f.thumbOf('oc-colors/onyx-black/abc.jpg'));
  ok('thumbOf handles a path with no extension the same way',
    f.thumbOf('oc-colors/x/abc') === 'oc-colors/x/abc-t', f.thumbOf('oc-colors/x/abc'));
  ok('thumbOf on empty is empty, not "-t"', f.thumbOf('') === '' && f.thumbOf(null) === '');
  ok('the two never collide on the same original',
    f.thumbOf('a/b.jpg') !== f.dispOf('a/b.jpg'));

  f.setOurs(3);
  f.set(0); f.stepShot(-1);
  ok('stepping back from the first photo does nothing', f.get() === 0, f.get());
  f.set(2); f.stepShot(1);
  ok('stepping past the last photo does nothing', f.get() === 2, f.get());
  f.set(0); f.stepShot(1); f.stepShot(1);
  ok('stepping forward walks the list', f.get() === 2, f.get());
} catch (e) {
  ['dispOf inserts -d before the extension',
   'dispOf handles a path with no extension rather than mangling it',
   'dispOf on empty is empty, not "-d"',
   'thumbOf inserts -t in exactly the same place',
   'thumbOf handles a path with no extension the same way',
   'thumbOf on empty is empty, not "-t"',
   'the two never collide on the same original',
   'stepping back from the first photo does nothing',
   'stepping past the last photo does nothing',
   'stepping forward walks the list']
    .forEach(l => ok(l, false, 'not present in this build: ' + (e && e.message)));
}

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
