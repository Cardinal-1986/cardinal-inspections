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
  /shrink: shrink,/.test(SH) && /renditions: \{ full: FULL, disp: DISP \}/.test(SH) &&
  (OCC.match(/function shrink\(/g) || []).length === 0,
  'a second shrink implementation exists');
ok('a missing image toolchain fails loudly rather than uploading raw',
  /if\(!small\) throw new Error\('Image tools unavailable/.test(OCC));
ok('both renditions are written, and the display twin is best-effort',
  /upload\(path, small\.full, \{ contentType:'image\/jpeg', upsert:false \}\)/.test(OCC) &&
  /upload\(dispOf\(path\), small\.disp, \{ contentType:'image\/jpeg', upsert:true \}\)/.test(OCC));
ok('everything is stored as JPEG — HEIC off an iPhone would break on Chrome',
  /'\.jpg'/.test(OCC) && (OCC.match(/contentType:'image\/jpeg'/g) || []).length === 2);
ok('the grid asks for the DISPLAY rendition (the 624 lesson, on a new screen)',
  /p\._src  = map\[dispOf\(p\.storage_path\)\] \|\| map\[p\.storage_path\]/.test(OCC));
/* Pre-630 photos have no -d twin. Without the fallback every existing
   photograph would vanish from the grid — load-bearing, not defensive. */
ok('...and falls back to the original, so pre-630 photos still render',
  /\|\| map\[p\.storage_path\]/.test(OCC) &&
  /OURS = rows\.filter\(function\(p\)\{ return map\[dispOf\(p\.storage_path\)\] \|\| map\[p\.storage_path\]; \}\)/.test(OCC));
ok('both paths are signed in ONE round trip, not two',
  (OCC.match(/await signMany\(want\)/g) || []).length === 1);

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
ok('the display twin is removed alongside the original',
  /remove\(\[row\.storage_path, dispOf\(row\.storage_path\)\]\)/.test(OCC));

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
ok('the view contains its own scroll instead of chaining into the page',
  /#cr-occ\{[\s\S]{0,3000}overscroll-behavior:contain;/.test(CSS));
ok('the lightbox contains its scroll too', /#cr-occ-shot\{[^}]*overscroll-behavior:contain/.test(CSS));

console.log('\n── functional: the shipped dispOf and step bounds ──');
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
  const f = new Function(code + '; return { dispOf, setOurs:function(n){ OURS.length=0; for(var i=0;i<n;i++) OURS.push({}); }, get:function(){return SHOT;}, set:function(v){SHOT=v;}, stepShot };')();

  ok('dispOf inserts -d before the extension',
    f.dispOf('oc-colors/onyx-black/abc.jpg') === 'oc-colors/onyx-black/abc-d.jpg',
    f.dispOf('oc-colors/onyx-black/abc.jpg'));
  ok('dispOf handles a path with no extension rather than mangling it',
    f.dispOf('oc-colors/x/abc') === 'oc-colors/x/abc-d', f.dispOf('oc-colors/x/abc'));
  ok('dispOf on empty is empty, not "-d"', f.dispOf('') === '' && f.dispOf(null) === '');

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
   'stepping back from the first photo does nothing',
   'stepping past the last photo does nothing',
   'stepping forward walks the list']
    .forEach(l => ok(l, false, 'not present in this build: ' + (e && e.message)));
}

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
