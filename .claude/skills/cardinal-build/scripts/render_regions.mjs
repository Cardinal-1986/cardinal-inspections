// render_regions.mjs — the 825 region picker, clicked for real in Chromium.
//
//   node render_regions.mjs                    # the working tree
//   node render_regions.mjs /tmp/prev.html     # negative control — must go red
//
// WHY A RENDER
//
// The picker is a claim about hit-testing and compositing: circles positioned
// from stored bounding boxes, a tint that has to sit ON the photograph rather
// than over it, and a rule that a region belongs to at most one surface. A
// regex can check none of that. The 823 overlay shipped with `isolation` on
// the wrong element and only a render caught it.
//
// The shipped functions are extracted and executed — no re-implementation.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (_) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e) {
    console.error('render_regions — CANNOT RUN: playwright not resolvable (' + e.message + ')');
    process.exit(2);
  }
}

const FILE = process.argv[2] || 'visualizer/index.html';
const CONTROL = process.argv[2] != null;
const src = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0; const bad = [];
const ok = (n, c, d) => { if (c) { pass++; return; } fail++; bad.push(n + (d ? '  — ' + d : '')); };

// ── every button the markup draws must be wired ──────────────────────────
// 825 shipped #vzFind with no listener. The button drew, "Find surfaces" did
// nothing, and the picker behind it — everything else in this file — was
// reachable only by calling openRegions() directly, which is exactly what
// this harness does. So the harness passed on a feature nobody could open.
// Same shape as the Studio Archive button, BUG_CLASSES 16.
//
// Scoped to buttons OUTSIDE a form: a submit button is wired by its form's
// submit handler, and flagging those is a false red — vzGo and vzCCgo are
// the reason the rule is not simply "every button".
{
  const unwired = [];
  const re = /<button\b[^>]*\bid="(vz[A-Za-z0-9]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = m[1];
    const before = src.slice(0, m.index);
    if (before.lastIndexOf('<form') > before.lastIndexOf('</form>')) continue;
    if (new RegExp("\\$\\('" + id + "'\\)\\.(addEventListener\\(|on\\w+\\s*=)").test(src)) continue;
    unwired.push(id);
  }
  ok('every button outside a form has a listener', unwired.length === 0,
     'nothing listens to: ' + unwired.join(', '));
}

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

// 831: frameOf() joined the list because drawRegions() now asks it what frame
// the boxes are in. Leaving it out is not a soft failure — the harness dies
// with "frameOf is not defined", which is how this list stays honest.
const NEED = ['regionsOf', 'pickFor', 'drawRegionSurfaces', 'surfaceOf', 'tintOf',
              'toggleRegion', 'drawRegions', 'frameW', 'frameH', 'frameOf'];
const fns = {};
NEED.forEach(n => { fns[n] = grab(n); ok(n + '() found', !!fns[n]); });
const SURFACES = grabVar('SURFACES');
ok('SURFACES found', !!SURFACES);
const CSS = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

if (NEED.some(n => !fns[n]) || !SURFACES) {
  report();
} else {
  const W = 400, H = 300;

  const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#000}
  #vzReg{position:relative!important;width:${W}px;height:${H + 200}px}
  #vzReg .cmp{position:relative;height:${H}px}
  #vzReg .wrap{position:absolute;inset:0}
  #vzReg img#vzRegImg{width:100%;height:100%;object-fit:fill}
</style>
<style>${CSS}</style>
<div id="vzReg">
  <div class="rsurf" id="vzRegSurf"></div>
  <div class="cmp"><div class="wrap" id="vzRegWrap">
    <img id="vzRegImg"><div class="rtint" id="vzRegTint"></div>
    <div class="rdots" id="vzRegDots"></div>
  </div></div>
  <div class="feet"><div class="d" id="vzRegSum"></div>
    <button class="btn" id="vzRegOK">Use these</button></div>
</div>
<script>
var $ = function(id){ return document.getElementById(id); };
var esc = function(s){ return String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;'); };
var SURFACES = ${SURFACES};
var regionPick = {}, regionSurf = 'roof', labelledMasks = {};

function solid(r,g,b){
  var c=document.createElement('canvas'); c.width=${W}; c.height=${H};
  var x=c.getContext('2d'); x.fillStyle='rgb('+r+','+g+','+b+')';
  x.fillRect(0,0,${W},${H}); return c.toDataURL();
}
function band(y0,y1){
  var c=document.createElement('canvas'); c.width=${W}; c.height=${H};
  var x=c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,${W},${H});
  x.fillStyle='#fff'; x.fillRect(0,y0,${W},y1-y0); return c.toDataURL();
}
var FAKE = { 'p/r01': band(0,80), 'p/r02': band(120,200) };
function paint(img, path){ img.src = FAKE[path] || solid(48,48,48); }

var regionJob = { source_path:'shot.jpg', masks:{
  r01:{ path:'p/r01', pct:20, box:[0,0,${W},80] },
  r02:{ path:'p/r02', pct:20, box:[0,120,${W},200] }
}};
${NEED.map(n => fns[n]).join('\n')}
document.getElementById('vzRegImg').src = solid(48,48,48);
window.__start = function(){ drawRegionSurfaces(); drawRegions(); };
window.__surf  = function(k){ regionSurf = k; drawRegionSurfaces(); drawRegions(); };
window.__picks = function(){ return JSON.parse(JSON.stringify(regionPick)); };
</script>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 520, height: 620 } });
  await page.setContent(html);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__start());
  await page.waitForTimeout(150);

  const dots = await page.$$('#vzRegDots button');
  ok('a circle per region', dots.length === 2, 'got ' + dots.length);
  ok('the circles are 44px targets', await page.evaluate(() =>
     [...document.querySelectorAll('#vzRegDots button')]
       .every(b => b.getBoundingClientRect().width >= 44), false),
     'a control you cannot hit on an iPad is not a control');

  // Positioned from the stored box, not from mask pixels.
  const pos = await page.evaluate(() => {
    const w = document.getElementById('vzRegWrap').getBoundingClientRect();
    return [...document.querySelectorAll('#vzRegDots button')].map(b => {
      const r = b.getBoundingClientRect();
      return { x: (r.left + r.width / 2 - w.left) / w.width,
               y: (r.top + r.height / 2 - w.top) / w.height };
    });
  });
  ok('the first circle sits over its region', pos[0] && Math.abs(pos[0].y - 40 / 300) < 0.06,
     JSON.stringify(pos[0]));
  ok('the second sits over its own', pos[1] && Math.abs(pos[1].y - 160 / 300) < 0.06,
     JSON.stringify(pos[1]));

  ok('nothing is tinted before anything is labelled',
     await page.$$eval('#vzRegTint div', n => n.length) === 0);
  ok('Use these is disabled with nothing labelled',
     await page.getAttribute('#vzRegOK', 'disabled') !== null);

  const tap = async (i) => {
    try { await page.click('#vzRegDots button[data-region="' + i + '"]', { timeout: 1500 });
          await page.waitForTimeout(100); return true; }
    catch (e) { ok('tapping ' + i + ' works', false, e.name); return false; }
  };

  // — label one region as roof
  const t1 = await tap('r01');
  ok('a tap assigns the region', t1 && JSON.stringify((await page.evaluate(() => window.__picks()))
       ['shot.jpg'] || {}).includes('r01'));
  ok('and it tints', await page.$$eval('#vzRegTint div', n => n.length) === 1);
  ok('the circle reads as pressed', await page.getAttribute('#vzRegDots button[data-region="r01"]', 'aria-pressed') === 'true');
  ok('Use these becomes available',
     await page.getAttribute('#vzRegOK', 'disabled') === null);

  // — the tint must sit ON the photo, not cover it
  const shot = async () => {
    const b64 = (await page.locator('#vzRegWrap').screenshot()).toString('base64');
    return page.evaluate(async d => {
      const im = new Image();
      await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + d; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const at = (px, py) => { const p = x.getImageData(
        Math.round(px * im.width / 400), Math.round(py * im.height / 300), 1, 1).data;
        return [p[0], p[1], p[2]]; };
      /* ⚠ x=60, NOT x=200. Every circle sits at its region's centre, and
         r02's centre is exactly (200,160) — sampling there reads the dot's
         own rgba(9,11,14,.55) and calls an untouched photograph dark. That
         is the third time in this session a harness has measured a control
         instead of the picture, so the points are checked below rather than
         trusted. */
      return { top: at(60, 40), mid: at(60, 100), bot: at(60, 160) };
    }, b64);
  };
  // Prove the sample points are on the photograph and not on a circle.
  const clearOfDots = await page.evaluate(() => {
    const w = document.getElementById('vzRegWrap').getBoundingClientRect();
    const rects = [...document.querySelectorAll('#vzRegDots button')]
      .map(b => b.getBoundingClientRect());
    const hits = (px, py) => {
      const x = w.left + px * w.width / 400, y = w.top + py * w.height / 300;
      return rects.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    };
    return [hits(60, 40), hits(60, 100), hits(60, 160)];
  });
  ok('the sample points miss every circle', clearOfDots.every(h => !h),
     JSON.stringify(clearOfDots));

  const s1 = await shot();
  ok('the labelled region takes the surface tint',
     s1.top[0] > 120 && s1.top[0] > s1.top[2], JSON.stringify(s1.top));
  ok('the rest of the photograph is untouched',
     s1.mid.every(v => Math.abs(v - 48) <= 6) && s1.bot.every(v => Math.abs(v - 48) <= 6),
     JSON.stringify([s1.mid, s1.bot]));

  // — a region belongs to at most one surface: tapping under another MOVES it
  await page.evaluate(() => window.__surf('siding'));
  await page.waitForTimeout(80);
  await tap('r01');
  const moved = await page.evaluate(() => window.__picks());
  ok('re-tapping under another surface MOVES the region',
     (moved['shot.jpg'].siding || []).indexOf('r01') !== -1 &&
     (moved['shot.jpg'].roof || []).indexOf('r01') === -1,
     JSON.stringify(moved['shot.jpg']));
  ok('it is still only tinted once', await page.$$eval('#vzRegTint div', n => n.length) === 1);

  const s2 = await shot();
  ok('and it takes the NEW surface colour',
     s2.top[2] > s2.top[0], JSON.stringify(s2.top) + ' siding is cyan, roof was amber');

  // — tapping under its own surface removes it
  await tap('r01');
  const cleared = await page.evaluate(() => window.__picks());
  ok('tapping again under the same surface removes it',
     ((cleared['shot.jpg'] || {}).siding || []).indexOf('r01') === -1,
     JSON.stringify(cleared['shot.jpg']));
  ok('and the tint goes with it',
     await page.$$eval('#vzRegTint div', n => n.length) === 0);

  // — the surface chips count what is labelled
  await page.evaluate(() => window.__surf('roof'));
  await tap('r01'); await tap('r02');
  ok('the surface chip shows its count',
     /2/.test(await page.textContent('#vzRegSurf button[data-surface="roof"]')),
     await page.textContent('#vzRegSurf button[data-surface="roof"]'));

  await browser.close();
  report();
}

function report() {
  console.log('\nrender_regions — %s%s', FILE, CONTROL ? '   [negative control]' : '');
  console.log('  %d/%d pass', pass, pass + fail);
  if (fail) { console.log('\n  FAILED:'); bad.forEach(b => console.log('    - ' + b)); }
  if (CONTROL) {
    console.log(fail ? '\n  RED, as a control should be.'
                     : '\n  ⚠ the control PASSED — these assertions test nothing.');
    process.exit(fail ? 0 : 1);
  }
  process.exit(fail ? 1 : 0);
}
