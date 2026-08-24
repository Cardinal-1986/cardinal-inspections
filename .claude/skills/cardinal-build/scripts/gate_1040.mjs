/* gate_1040.mjs — build 1040: production tap targets.
 * Two proofs per control, the app's own 944/418 standard:
 *   CLAIM — the control's tap claim (element box + its ::after pad, read from
 *           used inset values) measures >=44px in both axes. A four-way
 *           elementFromPoint at ±21 would be WRONG here: adjacent controls
 *           (the two week arrows, a chevron over a padded list) legitimately
 *           split contested edges, exactly like keyboard keys.
 *   HIT   — one real elementFromPoint just OUTSIDE the visual box on the
 *           control's free side proves the pad participates in hit-testing.
 *           The offset is chosen per control to sit outside the PREVIOUS
 *           build's pad too, so the control run goes red (the grip already
 *           had a 9px pad — its probe sits at 11px out).
 * Also asserts the VISUAL box is unchanged (the pass promises no visual change),
 * and verifies the audit's two false-positive rows really were already correct:
 * .pu-box (44px pad since 418) and .pkback (44 min since 947).
 * Run:  node gate_1040.mjs <artifact> [--control <index_1039>]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1040: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1040.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/* state, selector, expected visual h (±2), grown?, free side, probe offset px
   outside the visual box (past the PREVIOUS build's pad where one existed) */
const TARGETS = [
  ['prodhome', '#cr-pb .pbchip',        30, true,  'down', 4],
  ['prodcal',  '#cr-pb .pbmon button',  30, true,  'up',   4],
  ['prodbox',  '#cr-pb .pbback',        34, true,  'up',   4],
  ['prodbox',  '#cr-pb .pbact',         32, true,  'down', 4],
  ['dispatch', '#cr-disp .dspback',     34, true,  'up',   4],
  ['dispatch', '#cr-disp .dspwk button',26, true,  'down', 4],
  ['dispatch', '#cr-disp .job .mv',     15, true,  'left', 11],
  ['punchlist','#punchView .pu-box',    22, false, 'left', 4],   /* 418's pad — already 44 */
  ['punchcard','#cr-pk .pkback',        44, false, 'up',   0],   /* 947's min — already 44, no pseudo */
];

const PROBE = `(function(sel, side, off){
  var el = document.querySelector(sel);
  if(!el) return { missing: true };
  el.scrollIntoView({ block:'center', inline:'center' });
  var r = el.getBoundingClientRect();
  var cx = r.left + r.width/2, cy = r.top + r.height/2;
  /* the tap CLAIM: element box grown by the ::after pad's used insets (or its
     explicit width/height). 'auto'/none => no pad. */
  var ps = getComputedStyle(el, '::after');
  var claimW = r.width, claimH = r.height;
  if(ps.content !== 'none'){
    var pw = parseFloat(ps.width), phh = parseFloat(ps.height);
    var t = parseFloat(ps.top), b = parseFloat(ps.bottom), l = parseFloat(ps.left), rr = parseFloat(ps.right);
    if(!isNaN(pw) && ps.width !== 'auto' && pw >= r.width) claimW = pw;
    else if(!isNaN(l) && !isNaN(rr)) claimW = r.width - l - rr;
    if(!isNaN(phh) && ps.height !== 'auto' && phh >= r.height) claimH = phh;
    else if(!isNaN(t) && !isNaN(b)) claimH = r.height - t - b;
  }
  var px = cx, py = cy;
  if(side === 'up') py = r.top - off;
  else if(side === 'down') py = r.bottom + off;
  else if(side === 'left') px = r.left - off;
  else px = r.right + off;
  var h = (off > 0) ? document.elementFromPoint(px, py) : el;
  return {
    w: Math.round(r.width), h: Math.round(r.height),
    claimW: Math.round(claimW), claimH: Math.round(claimH),
    hit: !!(h && (h === el || el.contains(h) || h.contains(el)))
  };
})`;

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.goto('https://sentinel.test/?as=curtis', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const out = {};
  let lastState = null;
  for (const [state, sel, , , side, off] of TARGETS) {
    if (state !== lastState) {
      await page.evaluate(`(function(){
        var s = (window.__sentinelStates || []).filter(function(x){ return x.name === '${state}'; })[0];
        return s ? s.run() : Promise.reject(new Error('state ${state} missing'));
      })()`);
      await page.waitForTimeout(900);
      lastState = state;
    }
    out[sel] = await page.evaluate(`(${PROBE})(${JSON.stringify(sel)}, ${JSON.stringify(side)}, ${off})`);
  }
  await ctx.close();
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  for (const [, sel, wantH, grown, side, off] of TARGETS) {
    const p = r[sel];
    if (!p || p.missing) { fails.push(`${sel} not rendered (rig fault — proves nothing)`); continue; }
    if (Math.abs(p.h - wantH) > 2) fails.push(`${sel} visual height ${p.h} (want ~${wantH} — the look must not move)`);
    if (p.claimW < 44 || p.claimH < 44) fails.push(`${sel} tap claim ${p.claimW}x${p.claimH} (floor 44)${grown ? '' : ' (LEGACY pad regressed!)'}`);
    if (off > 0 && !p.hit) fails.push(`${sel} hit-test missed ${off}px ${side} of the visual box — the pad does not participate`);
  }
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1040 RED — ${fails.length} failure(s)` : 'GATE 1040 GREEN — all 9 claims >=44 and pads hit-test live, visuals unmoved');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 8)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
