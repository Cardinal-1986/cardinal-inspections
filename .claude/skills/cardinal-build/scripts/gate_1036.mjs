/* gate_1036.mjs — build 1036 (audit F1): board pane changes are visible to
 * the browser back button.
 * Drives the real history on the rig as Curtis:
 *   [T7]  board -> full calendar -> browser BACK  => board still open, HOME pane
 *   [T8]  board -> Needs-ordered list -> BACK     => board still open, HOME pane
 *   [chev] board -> calendar -> board's own chevron -> BACK => board CLOSED
 *          (the chevron popped the pane entry; the next back exits — stack in sync)
 *   [T1'] board -> box list -> job tap -> profile -> BACK => board open on the LIST pane
 * Pane detection: .pbtiles renders on the home pane only.
 * Run:  node gate_1036.mjs <artifact> [--control <prev>]
 * The control must go RED (T7/T8: back exits the board entirely).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1036: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1036.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function boot(browser, html) {
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
  return { ctx, page };
}

const board = `(function(){
  var el = document.getElementById('cr-pb');
  return {
    open : !!(el && el.classList.contains('open')),
    home : !!(el && el.classList.contains('open') && el.querySelector('.pbtiles')),
    st   : (history.state && history.state.app === 'cardinal-nav') ? (history.state.view + ':' + JSON.stringify(history.state.data)) : String(history.state && history.state.v || null)
  };
})()`;

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const out = {};

  /* T7: calendar pane -> browser back */
  {
    const { ctx, page } = await boot(browser, html);
    await page.evaluate(`window.__sentinelStates[0].run()`); await page.waitForTimeout(900);
    await page.click('#cr-pb [data-go="cal"]'); await page.waitForTimeout(500);
    await page.goBack(); await page.waitForTimeout(700);
    out.t7 = await page.evaluate(board);
    await ctx.close();
  }
  /* T8: box list pane -> browser back */
  {
    const { ctx, page } = await boot(browser, html);
    await page.evaluate(`window.__sentinelStates[0].run()`); await page.waitForTimeout(900);
    await page.click('#cr-pb [data-box="needs"]'); await page.waitForTimeout(500);
    await page.goBack(); await page.waitForTimeout(700);
    out.t8 = await page.evaluate(board);
    await ctx.close();
  }
  /* chevron sync: cal -> chevron (pops) -> back exits cleanly */
  {
    const { ctx, page } = await boot(browser, html);
    await page.evaluate(`window.__sentinelStates[0].run()`); await page.waitForTimeout(900);
    await page.click('#cr-pb [data-go="cal"]'); await page.waitForTimeout(500);
    await page.click('#cr-pb [data-back]'); await page.waitForTimeout(700);
    out.chevHome = await page.evaluate(board);
    await page.goBack(); await page.waitForTimeout(700);
    out.chevExit = await page.evaluate(board);
    await ctx.close();
  }
  /* T1': list -> job -> profile -> back returns to the LIST pane */
  {
    const { ctx, page } = await boot(browser, html);
    await page.evaluate(`window.__sentinelStates[0].run()`); await page.waitForTimeout(900);
    await page.click('#cr-pb [data-box="needs"]'); await page.waitForTimeout(500);
    await page.click('#cr-pb [data-job]'); await page.waitForTimeout(900);
    out.profileOpened = await page.evaluate(`(function(){ var pv=document.getElementById('projectView'); return !!(pv && pv.style.display !== 'none'); })()`);
    await page.goBack(); await page.waitForTimeout(900);
    out.t1 = await page.evaluate(board);
    await ctx.close();
  }
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  if (!r.t7.open) fails.push(`T7 calendar->back EXITED the board (state now ${r.t7.st})`);
  else if (!r.t7.home) fails.push(`T7 calendar->back left pane != home (state ${r.t7.st})`);
  if (!r.t8.open) fails.push(`T8 box list->back EXITED the board (state now ${r.t8.st})`);
  else if (!r.t8.home) fails.push(`T8 box list->back left pane != home (state ${r.t8.st})`);
  if (!r.chevHome.open || !r.chevHome.home) fails.push(`chevron from calendar did not land board home (${r.chevHome.st})`);
  if (r.chevExit.open) fails.push(`after chevron, back re-showed the board (stale pane entry: ${r.chevExit.st})`);
  if (!r.profileOpened) fails.push(`T1' job tap did not open the profile (rig fault, proves nothing)`);
  else if (!r.t1.open) fails.push(`T1' profile->back did not return to the board (${r.t1.st})`);
  else if (r.t1.home) fails.push(`T1' profile->back landed board HOME, not the list pane it left (${r.t1.st})`);
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1036 RED — ${fails.length} failure(s)` : 'GATE 1036 GREEN — back matches the chevron on all four drives');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 6)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
