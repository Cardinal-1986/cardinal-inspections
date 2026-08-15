// render_found.mjs — does the "show what it found" overlay actually composite?
//
//   NODE_PATH=/opt/node22/lib/node_modules node render_found.mjs
//   NODE_PATH=... node render_found.mjs /tmp/prev.html      # control, must go red
//
// WHY A RENDER AND NOT AN ASSERTION
//
// gate_823.mjs can prove the DOM is built and the CSS text is present. It
// cannot prove the picture is right, and this overlay is a claim about
// composited pixels: a stack of `mix-blend-mode:multiply` inside
// `mix-blend-mode:screen` inside `isolation:isolate`. Every one of those three
// can be present and the result still be a uniform wash — CLAUDE.md records
// two separate builds where a stylesheet parsed, balanced, passed its marker
// and its negative control, and painted the wrong thing.
//
// So this loads the SHIPPED stylesheet and executes the SHIPPED drawFound()
// in Chromium, then reads pixels back out with getImageData — which is legal
// here precisely because every image is generated in-page on a canvas and is
// therefore same-origin. In the app the masks are cross-origin signed URLs and
// this read would be illegal, which is exactly why drawFound() itself touches
// no pixel data.

import fs from 'node:fs';
import { createRequire } from 'node:module';

/* ESM does not honour NODE_PATH, and playwright is installed globally here
   rather than in the repo. createRequire walks the CommonJS paths, which do.
   A missing playwright must be a LOUD non-zero exit, never a silent skip — a
   harness that quietly does nothing reports the same "no failures" as one
   that ran and passed. */
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (_) {
  try {
    ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
  } catch (e) {
    console.error('render_found — CANNOT RUN: playwright not resolvable (' + e.message + ')');
    process.exit(2);
  }
}

const FILE = process.argv[2] || 'visualizer/index.html';
const CONTROL = process.argv[2] != null;
const src = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0; const bad = [];
const ok = (n, c, d) => { if (c) { pass++; return; } fail++; bad.push(n + (d ? '  — ' + d : '')); };

function grab(name) {
  const at = src.indexOf('function ' + name + '(');
  if (at < 0) return null;
  const open = src.indexOf('{', at);
  let depth = 0, inStr = null, inCmt = null;
  for (let i = open; i < src.length; i++) {
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

const drawFound = grab('drawFound');
const SURFACES = grabVar('SURFACES');
const CSS = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

ok('drawFound() extracted', !!drawFound);
ok('SURFACES extracted', !!SURFACES);
ok('stylesheet extracted', CSS.length > 2000, CSS.length + ' chars');

if (!drawFound || !SURFACES) {
  report();
} else {
  const W = 200, H = 150, BASE = 0x30;      // the "photograph": flat #303030

  const page_html = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;background:#000}
  /* Pin the stage so pixel coordinates are predictable. The real .cmp is
     flex:1 inside a dialog; here it is exactly the image box. */
  #stage{position:relative;width:${W}px;height:${H}px}
  /* .cmp is flex:1 in the real dialog and its only child is absolutely
     positioned, so on its own it computes to HEIGHT ZERO and the harness
     samples the page behind it — which is how the first run of this file
     reported a uniform #08090B and looked like a broken blend. Give it the
     size the dialog would. */
  #stage .cmp{position:absolute;inset:0}
</style>
<style>${CSS}</style>
<div id="stage"><div class="cmp"><div class="wrap" id="vzWrap"
     style="position:absolute;inset:0">
  <img id="vzBefore" style="position:absolute;inset:0;width:100%;height:100%">
  <div class="after" id="vzAfter"><img id="vzAfterImg"></div>
  <div class="found hide" id="vzFound" aria-hidden="true"></div>
</div></div></div>
<button id="vzFoundBtn" class="btn hide" aria-pressed="false">Show what it found</button>
<script>
var $ = function(id){ return document.getElementById(id); };
var esc = function(s){ return String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;'); };
var SURFACES = ${SURFACES};
var foundOn = false;

/* Same-origin images, made here. Nothing crosses the network. */
function solid(r,g,b){
  var c = document.createElement('canvas'); c.width=${W}; c.height=${H};
  var x = c.getContext('2d');
  x.fillStyle = 'rgb('+r+','+g+','+b+')'; x.fillRect(0,0,${W},${H});
  return c.toDataURL();
}
function band(y0,y1){
  var c = document.createElement('canvas'); c.width=${W}; c.height=${H};
  var x = c.getContext('2d');
  x.fillStyle='#000'; x.fillRect(0,0,${W},${H});
  x.fillStyle='#fff'; x.fillRect(0,y0,${W},y1-y0);   // white = the found region
  return c.toDataURL();
}
var FAKE = { 'm/roof': band(0,50), 'm/siding': band(100,150) };
function paint(img, path){ img.src = FAKE[path] || solid(${BASE},${BASE},${BASE}); }

${drawFound}

document.getElementById('vzBefore').src = solid(${BASE},${BASE},${BASE});
window.__draw = function(job){ drawFound(job); };
window.__show = function(){ $('vzFound').classList.remove('hide'); };
</script>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 320, height: 260 } });
  await page.setContent(page_html);
  await page.waitForTimeout(120);

  const JOB = { id: 'j1', masks: { roof: 'm/roof', siding: 'm/siding' } };
  await page.evaluate(j => window.__draw(j), JOB);
  await page.waitForTimeout(150);

  // ── the control appears, and the overlay starts OFF ────────────────────
  ok('the button is offered when masks exist',
     !(await page.getAttribute('#vzFoundBtn', 'class')).includes('hide'));
  ok('the overlay starts hidden',
     (await page.getAttribute('#vzFound', 'class')).includes('hide'),
     'it must be opt-in — a permanently tinted photograph is not a render');
  ok('one layer per mask, plus the key',
     await page.$$eval('#vzFound .flay', n => n.length) === 2);
  ok('the key names both surfaces',
     /Roof/.test(await page.textContent('#vzFound .fkey')) &&
     /Siding/.test(await page.textContent('#vzFound .fkey')));

  /* Read the composited pixel at a point, by screenshotting the stage and
     decoding it in-page. Screenshot -> canvas is the only way to see what the
     BLEND produced; getComputedStyle reports the declared colour, which is
     the trap CLAUDE.md names (`background-color` is not the background). */
  const shot = async () => {
    const b64 = (await page.locator('#stage').screenshot()).toString('base64');
    return page.evaluate(async (d) => {
      const im = new Image();
      await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + d; });
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const x = c.getContext('2d');
      x.drawImage(im, 0, 0);
      const at = (px, py) => {
        const p = x.getImageData(Math.round(px * im.width / 200),
                                 Math.round(py * im.height / 150), 1, 1).data;
        return [p[0], p[1], p[2]];
      };
      /* ⚠ The siding sample is at x=185, not x=100. The legend chip is
         `left:12px;bottom:12px` and at this stage size it covers the middle
         of the siding band — sampling at (100,125) reads the legend's own
         rgba(5,6,7,.82) and reports a perfectly good cyan as near-black.
         That cost a wrong diagnosis once already, so the sample points are
         checked against the legend's real rect below rather than eyeballed. */
      return { roof: at(100, 25), mid: at(100, 75), siding: at(185, 128) };
    }, b64);
  };

  /* Prove the sample points are actually on the picture and not on the
     legend. A harness that samples the wrong pixel is worse than no harness:
     it produces a confident number about something it never looked at. */
  const clear = await page.evaluate(() => {
    const w = document.getElementById('vzWrap').getBoundingClientRect();
    const k = document.querySelector('#vzFound .fkey');
    if (!k) return null;
    const r = k.getBoundingClientRect();
    const hits = (px, py) => {
      const x = w.left + px * w.width / 200, y = w.top + py * w.height / 150;
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    return { roof: hits(100, 25), mid: hits(100, 75), siding: hits(185, 128) };
  });
  ok('the sample points miss the legend chip',
     clear && !clear.roof && !clear.mid && !clear.siding,
     JSON.stringify(clear));

  const off = await shot();
  const near = (v, t, tol) => Math.abs(v - t) <= tol;
  ok('with the overlay off the photograph is untouched',
     off.roof.every(v => near(v, 0x30, 3)) && off.siding.every(v => near(v, 0x30, 3)),
     JSON.stringify(off));

  await page.evaluate(() => window.__show());
  await page.waitForTimeout(150);
  const on = await shot();

  // ── the region OUTSIDE every mask must not move ────────────────────────
  // This is the assertion that fails if the sandwich degenerates to a wash.
  ok('the unfound middle band is unchanged',
     on.mid.every(v => near(v, 0x30, 4)),
     JSON.stringify(on.mid) + ' should still be ~48,48,48');

  // ── each found region takes ITS OWN tint ───────────────────────────────
  ok('the roof region turns amber',
     on.roof[0] > on.roof[1] && on.roof[1] > on.roof[2] && on.roof[0] > 120,
     JSON.stringify(on.roof) + ' should be R>G>B and clearly lifted');
  ok('the siding region turns cyan',
     on.siding[2] > on.siding[0] && on.siding[1] > on.siding[0] && on.siding[2] > 120,
     JSON.stringify(on.siding) + ' should be B>R and clearly lifted');
  ok('the two surfaces are told apart',
     Math.abs(on.roof[0] - on.siding[0]) > 40,
     'roof R ' + on.roof[0] + ' vs siding R ' + on.siding[0]);

  // ── a job with no masks offers nothing ─────────────────────────────────
  await page.evaluate(() => window.__draw({ id: 'j2' }));
  await page.waitForTimeout(80);
  ok('no masks hides the control',
     (await page.getAttribute('#vzFoundBtn', 'class')).includes('hide'),
     'a Gemini render never segments; the button would open an empty overlay');
  ok('no masks draws no layers',
     await page.$$eval('#vzFound .flay', n => n.length) === 0);

  const out = '/tmp/claude-0/-home-user-cardinal-inspections/1df73da0-9ab0-51de-9322-6c62456856c9/scratchpad/found_overlay.png';
  await page.evaluate(j => window.__draw(j), JOB);
  await page.evaluate(() => window.__show());
  await page.waitForTimeout(150);
  await page.locator('#stage').screenshot({ path: out });
  console.log('  wrote ' + out);

  await browser.close();
  report();
}

function report() {
  console.log('\nrender_found — %s%s', FILE, CONTROL ? '   [negative control]' : '');
  console.log('  %d/%d pass', pass, pass + fail);
  if (fail) { console.log('\n  FAILED:'); bad.forEach(b => console.log('    - ' + b)); }
  if (CONTROL) {
    console.log(fail ? '\n  RED, as a control should be.'
                     : '\n  ⚠ the control PASSED — these assertions test nothing.');
    process.exit(fail ? 0 : 1);
  }
  process.exit(fail ? 1 : 0);
}
