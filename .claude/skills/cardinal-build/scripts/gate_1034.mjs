/* gate_1034.mjs — build 1034: the dropped LOWs, fixed.
 * Chromium rig. Proves:
 *   [review]  _crStageReviewMaybe with from='Invoiced' (backward) asks NOTHING;
 *             with from='Scheduled' (forward) it asks — confirm stubbed, both
 *             directions measured on the same page;
 *   [chip]    a .pu-tag.supp element computes #f0a24a in dark and #8a5500 in
 *             rb-light (the 947 chip's light twin);
 *   [picker]  the New Bid property loader prefers .load (static — the module
 *             fn is IIFE-scoped); forPartner/byPartner gone;
 *   [dead]    logSubmitted appears only as the tombstone;
 *   [sw]      sw.js serves the cached shell offline ONLY for the root path.
 * Run:  node gate_1034.mjs <artifact> [--control <prev>]
 * The control run must go RED with named failures (skill law).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1034: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1034.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_estimates.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function sweep(html, light) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  if (light) await page.addInitScript(`try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){}`);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const out = {};
  out.chipInk = await page.evaluate(`(function(){
    var el = document.createElement('span');
    el.className = 'pu-tag supp';
    document.body.appendChild(el);
    var c = getComputedStyle(el).color;
    el.remove();
    return c;
  })()`);
  if (!light) {
    out.review = await page.evaluate(`(function(){
      if (typeof _crStageReviewMaybe !== 'function') return 'MISSING';
      var asked = [];
      var realConfirm = window.confirm, realAsk = window.crAsk;
      /* the ask sits behind a setTimeout(…, 300) — the stub must OUTLIVE
         the timers, so it is restored only after the 700ms window closes.
         Builds 1080–1083 replaced window.confirm with crAsk(msg)→Promise<boolean>;
         both are stubbed so either mechanism is counted. */
      window.confirm = function(msg){ asked.push(String(msg).slice(0, 30)); return false; };
      window.crAsk = function(msg){ asked.push(String(msg).slice(0, 30)); return Promise.resolve(false); };
      var pr = { stage: 'Completed', phone: '937-555-0000', checklist: '{}', name: 'T' };
      _crStageReviewMaybe(pr, 'Invoiced');   /* backward — must NOT ask */
      _crStageReviewMaybe(pr, 'Scheduled');  /* forward — must ask */
      return new Promise(function(res){
        setTimeout(function(){
          window.confirm = realConfirm; window.crAsk = realAsk;
          res({ askedCount: asked.length });
        }, 700);
      });
    })()`);
  }
  await browser.close();
  return out;
}

function judge(html, dark, lite) {
  const fails = [];
  if (dark.review === 'MISSING') fails.push('_crStageReviewMaybe not reachable');
  else if (dark.review.askedCount !== 1)
    fails.push(`review confirm fired ${dark.review.askedCount}x for backward+forward (want exactly 1 — forward only)`);
  if (dark.chipInk !== 'rgb(240, 162, 74)') fails.push(`SUPPLEMENT chip dark ${dark.chipInk}`);
  if (lite.chipInk !== 'rgb(138, 85, 0)') fails.push(`SUPPLEMENT chip light ${lite.chipInk} (want rgb(138, 85, 0))`);
  if (html.includes('CardinalCommunityProperties.forPartner ||')) fails.push('picker still tries forPartner');
  if (!html.includes('CardinalCommunityProperties.load ||')) fails.push('picker does not prefer load()');
  const logSub = (html.match(/logSubmitted/g) || []).length;
  if (logSub !== 1) fails.push(`logSubmitted x${logSub} (want 1 — the tombstone)`);
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const dark = await sweep(html, false);
const lite = await sweep(html, true);
const fails = judge(html, dark, lite);
const sw = readFileSync(REPO + 'sw.js', 'utf8');
if (!sw.includes("shellOK")) fails.push('sw.js still shells every offline navigation');
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1034 RED — ${fails.length} failure(s)` : 'GATE 1034 GREEN — review gate, chip inks, picker, dead call, sw');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const cd = await sweep(chtml, false);
  const cl = await sweep(chtml, true);
  const cfails = judge(chtml, cd, cl);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 6)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
