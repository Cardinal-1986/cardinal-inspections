/* gate_1046.mjs — build 1046: saved snippets.
 * Rig as Curtis on the punch CARD (a rendered composer, the hard case):
 *   - the .cr-snipbtn renders in the .pkin row;
 *   - clicking it opens the sheet with the 4 seeded defaults;
 *   - clicking the first snippet inserts it into input[data-f="msg"], fires a
 *     REAL input event (listener installed first), and closes the sheet;
 *   - deleting a row persists (3 left in localStorage);
 *   - "+ Add" (prompt stubbed) appends and persists.
 * Also asserts the other two composers carry the button (#chatText row static
 * markup; the punch page's .pp-compose template).
 * Run:  node gate_1046.mjs <artifact> [--control <index_1045>]
 * Control must go RED (no .cr-snipbtn exists anywhere).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1046: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1046.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

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
  await page.addInitScript(`window.prompt = function(){ return 'Gate test snippet'; };`);
  await page.goto('https://sentinel.test/?as=curtis', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(`window.__sentinelStates.filter(s=>s.name==='punchcard')[0].run()`);
  await page.waitForTimeout(900);

  const out = {};
  out.static = await page.evaluate(`(function(){
    return { chat: !!document.querySelector('.chatinput .cr-snipbtn'),
             card: !!document.querySelector('#cr-pk .pkin .cr-snipbtn') };
  })()`);
  if (!out.static.card) { await ctx.close(); await browser.close(); return out; }

  out.flow = await page.evaluate(`(function(){
    var r = { };
    var inp = document.querySelector('#cr-pk .pkin input[data-f="msg"]');
    var gotInput = false;
    inp.addEventListener('input', function(){ gotInput = true; });
    document.querySelector('#cr-pk .pkin .cr-snipbtn').click();
    var rows = document.querySelectorAll('.cr-snips-row .tx');
    r.sheetRows = rows.length;
    if (rows.length){ rows[0].click(); }
    r.inserted = (inp.value || '').indexOf('on the way') !== -1;
    r.inputEventFired = gotInput;
    r.sheetClosed = !document.querySelector('.cr-snips-bg');
    /* delete one, then add one via the stubbed prompt */
    document.querySelector('#cr-pk .pkin .cr-snipbtn').click();
    var rm = document.querySelector('.cr-snips-row .rm');
    if (rm) rm.click();
    var stored = [];
    try{ stored = JSON.parse(localStorage.getItem('cr-snips') || '[]'); }catch(e){}
    r.afterDelete = stored.length;
    var add = document.querySelector('.cr-snips-add');
    if (add) add.click();
    try{ stored = JSON.parse(localStorage.getItem('cr-snips') || '[]'); }catch(e){}
    r.afterAdd = stored.length;
    r.addedText = stored.indexOf('Gate test snippet') !== -1;
    return r;
  })()`);
  /* the punch page's rendered composer carries it too */
  await page.evaluate(`window.__sentinelStates.filter(s=>s.name==='punchlist')[0].run()`);
  await page.waitForTimeout(900);
  out.page = await page.evaluate(`(function(){
    var pv = document.getElementById('punchView');
    return { rendered: !!(pv && pv.querySelector('.pp-compose .cr-snipbtn')),
             composerThere: !!(pv && pv.querySelector('.pp-compose')) };
  })()`);
  await ctx.close();
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  if (!r.static.chat) fails.push('no snippet button beside #chatText');
  if (!r.static.card) { fails.push('no snippet button in the punch card composer'); return fails; }
  const f = r.flow;
  if (f.sheetRows !== 4) fails.push(`sheet showed ${f.sheetRows} defaults (want 4)`);
  if (!f.inserted) fails.push('tapping a snippet did not insert it into the composer');
  if (!f.inputEventFired) fails.push('insert did not fire a real input event');
  if (!f.sheetClosed) fails.push('sheet stayed open after inserting');
  if (f.afterDelete !== 3) fails.push(`delete left ${f.afterDelete} stored (want 3)`);
  if (f.afterAdd !== 4 || !f.addedText) fails.push('add via prompt did not persist');
  if (r.page && r.page.composerThere && !r.page.rendered) fails.push('punch page composer lacks the button');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1046 RED — ${fails.length} failure(s)` : 'GATE 1046 GREEN — insert, event, delete and add all live at the real composers');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 3)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
