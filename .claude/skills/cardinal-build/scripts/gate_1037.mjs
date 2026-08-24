/* gate_1037.mjs — build 1037 (audit F2): the profile tab back-trap.
 * Drives audit T6 on the rig as Curtis:
 *   board -> Needs-ordered list -> job tap -> profile -> flip two tabs
 *   -> ONE browser back  =>  profile closed, board open (list pane),
 *                            history.state back on view:'production'
 *   and backsUntilOut must be exactly 1 (the trap needed 3+ and never got out).
 * Also proves the flips themselves still work (#tab-contracts visible) so the
 * pass cannot be vacuous.
 * Run:  node gate_1037.mjs <artifact> [--control <index_1036>]
 * Control = the 1036 artifact: flips stack entries there, so back #1 walks a
 * tab instead of leaving — RED.
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1037: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1037.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const SNAP = `(function(){
  var pv = document.getElementById('projectView');
  var pb = document.getElementById('cr-pb');
  return {
    profile : !!(pv && pv.style.display !== 'none'),
    board   : !!(pb && pb.classList.contains('open')),
    st      : (history.state && history.state.app === 'cardinal-nav') ? String(history.state.view)
              : (history.state && history.state.v ? 'legacy:' + history.state.v : 'null')
  };
})()`;

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
  await page.evaluate(`window.__sentinelStates[0].run()`); await page.waitForTimeout(900);
  await page.click('#cr-pb [data-box="needs"]'); await page.waitForTimeout(500);
  await page.click('#cr-pb [data-job]'); await page.waitForTimeout(1000);
  out.opened = await page.evaluate(SNAP);
  /* two real tab flips through the wrapped global (same path as the tab bar) */
  await page.evaluate(`window.showTab('estimates')`); await page.waitForTimeout(300);
  await page.evaluate(`window.showTab('contracts')`); await page.waitForTimeout(300);
  out.flipped = await page.evaluate(`(function(){
    var t = document.getElementById('tab-contracts');
    return !!(t && t.style.display === 'block');
  })()`);
  /* back out — count presses until the profile is gone and the board is back */
  out.backs = 0; out.after1 = null;
  for (let i = 1; i <= 5; i++) {
    await page.goBack(); await page.waitForTimeout(800);
    const s = await page.evaluate(SNAP);
    if (i === 1) out.after1 = s;
    if (!s.profile && s.board) { out.backs = i; break; }
  }
  out.final = await page.evaluate(SNAP);
  await ctx.close();
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  if (!r.opened.profile) { fails.push('rig fault: job tap never opened the profile (proves nothing)'); return fails; }
  if (!r.flipped) { fails.push('rig fault: tab flip did not show #tab-contracts (proves nothing)'); return fails; }
  if (r.backs === 0) fails.push(`WEDGED — 5 backs never left the profile (final state ${r.final.st})`);
  else if (r.backs !== 1) fails.push(`took ${r.backs} backs to leave the profile (want exactly 1; back #1 landed ${JSON.stringify(r.after1)})`);
  if (r.after1 && r.after1.profile) fails.push(`back #1 left the profile visible (state ${r.after1.st})`);
  if (r.backs >= 1 && r.final.st !== 'production') fails.push(`landed on state ${r.final.st}, not production`);
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1037 RED — ${fails.length} failure(s)` : 'GATE 1037 GREEN — one back leaves the profile onto the board, flips intact');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 4)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
