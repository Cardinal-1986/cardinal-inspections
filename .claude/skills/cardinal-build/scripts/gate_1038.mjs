/* gate_1038.mjs — build 1038 (audit F3a): the production exit room.
 * Drives the board's own exit (home-pane back control) on the rig:
 *   as CURTIS  (production): exit lands on the LANDING (portal picker) —
 *                            #landingView visible, retail home NOT shown;
 *   as THEO    (admin)     : exit still lands on the retail home — unchanged.
 * Run:  node gate_1038.mjs <artifact> [--control <index_1037>]
 * The control must go RED (Curtis lands on the retail home + its money).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1038: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1038.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const SNAP = `(function(){
  var land = document.getElementById('landingView');
  var main = document.getElementById('mainView');
  var pb = document.getElementById('cr-pb');
  return {
    landing : !!(land && land.style.display === 'block'),
    retail  : !!(main && main.style.display !== 'none'),
    board   : !!(pb && pb.classList.contains('open'))
  };
})()`;

async function exitAs(browser, html, persona) {
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
  await page.goto('https://sentinel.test/' + (persona ? '?as=' + persona : ''), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(`window.__sentinelStates[0].run()`); await page.waitForTimeout(900);
  const opened = await page.evaluate(SNAP);
  await page.click('#cr-pb [data-back]'); await page.waitForTimeout(800);
  const after = await page.evaluate(SNAP);
  await ctx.close();
  return { opened, after };
}

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const out = { curtis: await exitAs(browser, html, 'curtis'), admin: await exitAs(browser, html, null) };
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  if (!r.curtis.opened.board) { fails.push('rig fault: board never opened as Curtis (proves nothing)'); return fails; }
  if (r.curtis.after.board) fails.push('Curtis: exit control did not close the board');
  if (!r.curtis.after.landing) fails.push(`Curtis exit did NOT land on the Landing (landing=${r.curtis.after.landing}, retail=${r.curtis.after.retail})`);
  if (r.curtis.after.retail) fails.push('Curtis exit shows the retail home (the money room)');
  if (!r.admin.opened.board) { fails.push('rig fault: board never opened as admin (proves nothing)'); return fails; }
  if (!r.admin.after.retail) fails.push(`admin exit no longer lands on the retail home (landing=${r.admin.after.landing})`);
  if (r.admin.after.landing) fails.push('admin exit was rerouted to the Landing — the fork over-applied');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1038 RED — ${fails.length} failure(s)` : 'GATE 1038 GREEN — Curtis exits to the Landing, admin exit unchanged');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 4)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
