// gate_823.mjs — a surface the render did not change must say so.
//
// The functions under test are EXTRACTED FROM THE FILE and executed. A gate
// that re-implements the logic it checks proves only that two of my drafts
// agree.
//
//   node gate_823.mjs                     # the working tree
//   node gate_823.mjs /tmp/prev.html      # negative control — must go red
//
// WHAT THIS IS GUARDING
//
// Before 823 a job could finish `done`, upload a render, leave `error` null,
// and never have touched a surface the rep picked. The only record was a log
// line on the Spark box. The screen showed an unqualified success.
//
// The assertions that matter most are the three NEGATIVE ones — the cases
// where the answer is "we do not know" and the screen must therefore say
// nothing. A Gemini job never segments and an old worker never wrote the key;
// turning either absence into "nothing was skipped" would replace a silent
// omission with a confident false claim, which is worse.

import fs from 'node:fs';

const FILE = process.argv[2] || 'visualizer/index.html';
const CONTROL = process.argv[2] != null;
const src = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0; const bad = [];
const ok = (n, c, d) => { if (c) { pass++; return; } fail++; bad.push(n + (d ? '  — ' + d : '')); };

/* Brace-match a named function out of the file. 100 KB with braces inside
   strings and comments everywhere, so a regex to the closing brace is not an
   option — CLAUDE.md's "recon regexes need bounds". */
function grab(name) {
  const at = src.indexOf('function ' + name + '(');
  if (at < 0) return null;
  const open = src.indexOf('{', at);
  let depth = 0, i = open, inStr = null, inCmt = null;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inCmt === '/*') { if (c === '*' && n === '/') { inCmt = null; i++; } continue; }
    if (inCmt === '//') { if (c === '\n') inCmt = null; continue; }
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '/' && n === '*') { inCmt = '/*'; i++; continue; }
    if (c === '/' && n === '/') { inCmt = '//'; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (!depth) return src.slice(at, i + 1); }
  }
  return null;
}

/* Pull a top-level `var NAME = <literal>;` out of the file and evaluate it, so
   the tables under test are the SHIPPED ones. */
function grabVar(name) {
  const m = new RegExp('var\\s+' + name + '\\s*=\\s*([\\[{])').exec(src);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  const closer = m[1] === '[' ? ']' : '}';
  let depth = 0, inStr = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === m[1]) depth++;
    else if (c === closer) { depth--; if (!depth) return src.slice(open, i + 1); }
  }
  return null;
}

// ── notChanged() ─────────────────────────────────────────────────────────
const SURFACES_SRC = grabVar('SURFACES');
const SKIP_WHY_SRC = grabVar('SKIP_WHY');
const body = grab('notChanged');

ok('SURFACES found', !!SURFACES_SRC);
ok('SKIP_WHY found', !!SKIP_WHY_SRC);
ok('notChanged() found', !!body);

if (SURFACES_SRC && SKIP_WHY_SRC && body) {
  const run = (j) => new Function('j',
    'var SURFACES = ' + SURFACES_SRC + ';' +
    'var SKIP_WHY = ' + SKIP_WHY_SRC + ';' +
    body + '; return notChanged(j);')(j);

  const job = (achieved) => ({ id: 'j1', status: 'done', achieved });

  // — the positive case
  const one = run(job({ _worker: 'wb-2026-08-15.4 recolour', _skipped: { siding: 'not_found' } }));
  ok('a skipped surface is reported', one.length === 1, 'got ' + one.length);
  ok('it carries the human LABEL, not the key',
     one[0] && one[0].label === 'Siding', JSON.stringify(one[0]));
  ok('it carries a sentence, not the enum',
     one[0] && /could not find it in this photograph/.test(one[0].why),
     JSON.stringify(one[0] && one[0].why));
  ok('no_hex gets its own distinct sentence', (() => {
    const r = run(job({ _skipped: { trim: 'no_hex' } }));
    return r.length === 1 && /no colour value/.test(r[0].why) &&
           !/could not find/.test(r[0].why);
  })(), 'the two reasons tell a rep to do different things');

  // — the three cases where the honest answer is silence
  ok('a GEMINI job reports nothing',
     run(job({ _engine: 'gemini', _model: 'gemini-3.1-flash-image' })).length === 0,
     'Gemini never segments, so it can never have "not found" a surface');
  ok('an OLD worker reports nothing',
     run(job({ _worker: 'wb-2026-08-15.3 recolour' })).length === 0,
     'absent _skipped means UNKNOWN, never "nothing was skipped"');
  ok('a null achieved reports nothing', run(job(null)).length === 0);
  ok('a job with no achieved key at all reports nothing',
     run({ id: 'j2', status: 'done' }).length === 0);
  ok('a malformed _skipped does not throw', (() => {
    try { return run(job({ _skipped: 'siding' })).length === 0; }
    catch (_) { return false; }
  })(), 'a string is not a map; it must be ignored, not crash the card');

  // — multiples, and an unknown code
  const two = run(job({ _skipped: { siding: 'not_found', trim: 'no_hex' } }));
  ok('two skips are both reported', two.length === 2, 'got ' + two.length);
  ok('an UNKNOWN reason degrades to the code, not to silence', (() => {
    const r = run(job({ _skipped: { roof: 'some_future_reason' } }));
    return r.length === 1 && r[0].why === 'some_future_reason';
  })(), 'a worker ahead of this file must still be able to say a surface was skipped');
  ok('an unknown SURFACE degrades to its key', (() => {
    const r = run(job({ _skipped: { chimney: 'not_found' } }));
    return r.length === 1 && r[0].label === 'chimney';
  })());
}

// ── the contract with the worker ─────────────────────────────────────────
{
  const worker = fs.readFileSync('spark/visualizer_worker.py', 'utf8');

  /* The codes come from skip_reason()'s RETURNS, not from the assignment site
     — an earlier draft of this gate matched `skipped[surface] = "..."` and
     went red the moment the logic was pulled into a function, which is the
     right failure but for the wrong reason. spark/test_skip_reason.py proves
     separately that these returns and SKIP_REASON's keys are the same set, so
     checking the returns here chains the two halves together. */
  const fn = /def skip_reason\([\s\S]*?\n\ndef /.exec(worker);
  ok('skip_reason() found in the worker', !!fn);
  const codes = fn ? [...fn[0].matchAll(/return\s+"([a-z_]+)"/g)].map(m => m[1]) : [];
  ok('the worker returns at least two distinct reasons', new Set(codes).size >= 2,
     JSON.stringify(codes));
  ok('every reason the worker returns has a sentence here',
     codes.length > 0 && codes.every(c => new RegExp('\\b' + c + '\\s*:').test(SKIP_WHY_SRC || '')),
     'worker returns ' + JSON.stringify(codes));
  ok('the worker persists them onto the row',
     /achieved\["_skipped"\]\s*=/.test(worker),
     'without this the browser half reads a key nothing ever writes');
}

// ── wiring, read off the file ────────────────────────────────────────────
ok('achieved is actually SELECTED', /select\('[^']*\bachieved\b[^']*'\)/.test(src),
   'the whole feature is inert if the column never arrives');
ok('masks still ride along', /select\('[^']*\bmasks\b[^']*'\)/.test(src));
ok('the card shows a partial success', /class="warn"/.test(src));
ok('the card warning is NOT the red error class',
   !/notChanged\(j\)[\s\S]{0,200}class="err"/.test(src),
   'amber means the render worked and one surface did not change');
ok('the box has a skip row', /id="vzSkip"/.test(src));
ok('the box has the overlay host', /id="vzFound"/.test(src));
ok('the overlay control exists and starts hidden',
   /id="vzFoundBtn"[^>]*class="btn hide"/.test(src) ||
   /class="btn hide"[^>]*id="vzFoundBtn"/.test(src),
   'a job with no masks must not offer a button that opens an empty overlay');
ok('the control is wired', /\$\('vzFoundBtn'\)\.addEventListener\('click', toggleFound\)/.test(src),
   'BUG_CLASSES 16 — a control that renders but is never wired');
ok('closing resets the overlay', /function closeBox\(\)[\s\S]{0,400}foundOn = false/.test(src),
   'left on, it reappears over the next house');
ok('openBox draws both', /function openBox\([\s\S]{0,900}drawSkip\(jobOf\(r\)\)[\s\S]{0,120}drawFound\(jobOf\(r\)\)/.test(src));

// ── the overlay does not read pixels ─────────────────────────────────────
{
  const df = grab('drawFound') || '';
  ok('drawFound() found', !!df);
  ok('no canvas in the overlay path',
     !/getContext|getImageData|toBlob|toDataURL/.test(df),
     'the masks are cross-origin signed URLs; reading them taints the canvas');
  ok('the tint comes from SURFACES, not a literal per call',
     /s\.tint/.test(df));
  ok('surfaces with no mask are not drawn',
     /filter\(function\(k\)\{ return masks\[k\]; \}\)/.test(df));
}

// ── the blend sandwich is present and complete ───────────────────────────
ok('the layer screens over the photo', /\.found \.flay\{[^}]*mix-blend-mode:screen/.test(src));
ok('the mask multiplies inside the layer', /\.found \.flay img\{[^}]*mix-blend-mode:multiply/.test(src));
/* ⚠ This assertion originally demanded `isolation:isolate` on .found, which is
   where I first put it and is WRONG — isolation stops a group blending with
   its backdrop, and the backdrop is the photograph. Chromium measured the
   unfound band at rgb(9,9,9) instead of rgb(48,48,48). It is asserted in both
   directions now, because the wrong placement is the intuitive one and will be
   "corrected" back by someone reading the CSS without running render_found. */
ok('the wrapper isolates', /\.cmp \.wrap\{[^}]*isolation:isolate/.test(src),
   'the blend must be contained to the image stack, not reach the page behind the dialog');
ok('the overlay host does NOT isolate', !/\.found\{[^}]*isolation:isolate/.test(src),
   'isolating .found cuts the layers off from the photograph they are meant to tint');
ok('the overlay does not eat clicks', /\.found\{[^}]*pointer-events:none/.test(src),
   'the wipe slider lives underneath it');

// ── 824: the legend is a control ─────────────────────────────────────────
// Five masks at once could not answer the only question the overlay is opened
// to ask — WHICH mask is wrong — because screened tints compound and overlap
// is exactly where the eye is least reliable.
{
  const df = grab('drawFound') || '';
  const as = grab('applySolo');
  const sf = grab('soloFound');
  ok('applySolo() exists', !!as);
  ok('soloFound() exists', !!sf);
  ok('the legend builds BUTTONS, not spans',
     /createElement\('button'\)/.test(df) && !/<span><i style/.test(df),
     'a caption cannot be tapped');
  ok('each layer is tagged with its surface', /lay\.dataset\.surface = k/.test(df),
     'what solo hides everything else by');
  ok('soloing the same chip twice returns to all',
     sf && /foundSolo === key\) \? null : key/.test(sf),
     'a solo with no way out reads as the overlay having broken');
  ok('the note says how to leave solo', as && /tap it again for all/.test(as));
  ok('drawFound resets solo', /foundSolo = null;\s*\/\* 824/.test(src),
     'solo is per-render, like foundOn');
  ok('closeBox resets solo',
     /function closeBox\(\)[\s\S]{0,500}foundSolo = null/.test(src));

  ok('a hidden layer is REMOVED from the composite, not faded',
     /\.found \.flay\.off\{[^}]*display:none/.test(src),
     'a faded layer still screens over the one you are reading');
  ok('the legend opts back INTO pointer events',
     /\.found \.fkey\{[^}]*pointer-events:auto/.test(src),
     'BUG_CLASSES 16 — .found is pointer-events:none so the wipe stays draggable');
  ok('the chips meet the 44px floor',
     /\.found \.fkey button\{[^}]*min-height:44px/.test(src),
     'the 592 precedent');
  ok('the pressed state is visible, not only announced',
     /\.fkey button\[aria-pressed="true"\]\{/.test(src));
}

// ── build label ──────────────────────────────────────────────────────────
{
  const m = /v2026-\d\d-\d\d build (\d+)/.exec(src);
  ok('the build label is present', !!m);
  ok('the build label is above 822', m && Number(m[1]) > 822, m && m[1]);
}

// ── report ───────────────────────────────────────────────────────────────
console.log('\ngate_823 — %s%s', FILE, CONTROL ? '   [negative control]' : '');
console.log('  %d/%d pass', pass, pass + fail);
if (fail) { console.log('\n  FAILED:'); bad.forEach(b => console.log('    - ' + b)); }
if (CONTROL) {
  console.log(fail ? '\n  RED, as a control should be.'
                   : '\n  ⚠ the control PASSED — these assertions test nothing.');
  process.exit(fail ? 0 : 1);
}
process.exit(fail ? 1 : 0);
