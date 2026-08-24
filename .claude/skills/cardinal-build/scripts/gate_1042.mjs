/* gate_1042.mjs — build 1042 (audit F4): the punch page drops the retail
 * chrome for production accounts.
 * Rig, two personas on the punchlist state:
 *   CURTIS: body.cr-prod set, #punchView computes position:fixed, and the
 *           retail nav row (#crBanner) is COVERED — elementFromPoint at the
 *           banner's own center resolves into #punchView, not the banner;
 *           the punch content itself still hit-tests (not a blank shield).
 *   ADMIN : no cr-prod class, #punchView stays in-shell (position static),
 *           the banner still hit-tests — unchanged.
 * Run:  node gate_1042.mjs <artifact> [--control <index_1041>]
 * Control must go RED (Curtis's punch page sits under the retail chrome).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1042: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1042.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const SNAP = `(function(){
  var pv = document.getElementById('punchView');
  var banner = document.getElementById('crBanner');
  var out = {
    prodClass : document.body.classList.contains('cr-prod'),
    pvPos     : pv ? getComputedStyle(pv).position : 'MISSING',
    pvShown   : !!(pv && pv.style.display !== 'none')
  };
  if (banner){
    var r = banner.getBoundingClientRect();
    out.bannerOnScreen = r.width > 0 && r.height > 0;
    if (out.bannerOnScreen){
      var hit = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
      out.bannerCovered = !!(hit && pv && pv.contains(hit));
      out.bannerHit = !!(hit && banner.contains(hit));
    }
  } else { out.bannerOnScreen = false; }
  /* the page itself must still be interactive, not a blank shield */
  if (pv && pv.style.display !== 'none'){
    var pr = pv.getBoundingClientRect();
    var mid = document.elementFromPoint(Math.min(pr.left + pr.width/2, innerWidth-10), Math.min(pr.top + 200, innerHeight-10));
    out.contentHit = !!(mid && pv.contains(mid));
  }
  return out;
})()`;

async function runAs(browser, html, persona) {
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.goto('https://sentinel.test/' + (persona ? '?as=' + persona : ''), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(`window.__sentinelStates.filter(s=>s.name==='punchlist')[0].run()`);
  await page.waitForTimeout(900);
  const snap = await page.evaluate(SNAP);
  await ctx.close();
  return snap;
}

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const out = { curtis: await runAs(browser, html, 'curtis'), admin: await runAs(browser, html, null) };
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  const c = r.curtis, a = r.admin;
  if (!c.pvShown) { fails.push('rig fault: punch view never opened as Curtis (proves nothing)'); return fails; }
  if (!c.prodClass) fails.push('body.cr-prod not set for Curtis');
  if (c.pvPos !== 'fixed') fails.push(`Curtis punch view position=${c.pvPos} (want fixed — full-screen family)`);
  if (c.bannerOnScreen && !c.bannerCovered) fails.push('Curtis: the retail nav row is still exposed above the punch page');
  if (c.contentHit === false) fails.push('Curtis: punch content does not hit-test — the overlay is a blank shield');
  if (!a.pvShown) { fails.push('rig fault: punch view never opened as admin (proves nothing)'); return fails; }
  if (a.prodClass) fails.push('admin got body.cr-prod — the role class over-applied');
  if (a.pvPos === 'fixed') fails.push('admin punch view went full-screen — the treatment must be production-only');
  if (a.bannerOnScreen && !a.bannerHit) fails.push('admin: the nav row stopped hit-testing — admin chrome must be untouched');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1042 RED — ${fails.length} failure(s)` : 'GATE 1042 GREEN — Curtis full-screen with chrome covered, admin untouched');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 4)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
