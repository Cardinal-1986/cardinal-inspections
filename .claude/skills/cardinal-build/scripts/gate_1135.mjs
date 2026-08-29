/* gate_1135.mjs — build 1135: estimate line cards open full size.
 *
 * Template descriptions are paragraphs; the .desc-input textarea opened at
 * min-height 38px with overflow:hidden, showing ~1.5 lines with the rest
 * clipped ("starts off squished" — Theo, with screenshot). And the absolutely
 * positioned move/delete buttons sat on top of long item names.
 *
 * Proves in Chromium (real editor, real row): every description's clientHeight
 * covers its scrollHeight (nothing clipped) on open; typing keeps it sized;
 * the name input carries enough right padding to clear the buttons.
 * Control (1134 tree): RED — clipped description, no clearance.
 * Run: node gate_1135.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1135: playwright not found'); process.exit(2); }
const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1135.mjs [index.html]'); process.exit(2); }
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'].map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const html = readFileSync(FILE, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 414, height: 896 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await page.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
  ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
  : r.fulfill({ status: 200, body: '' }));
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);

const LONG = ('Remove existing layers of shingles and dispose of them. Inspect wood decking for damages. '
  + 'If damage is found, replace each 4x8 sheet of OSB. Install a new roofing system with proper intake '
  + 'and exhaust. All soft metals will be replaced, including drip edge, gutter apron, box vents, pipe '
  + 'boots. Ice and water guard will be installed along the perimeter of all eaves and valleys.');

const r = await page.evaluate(`(async function(){
  if (typeof openProject === 'function') openProject('p1');
  await new Promise(res => setTimeout(res, 700));
  const row = { id:'est-l', project_id:'p1', archived:false, status:'draft',
    estimate_number:'EST-2026-0907', title:'Roof replacement', itemized:false,
    line_items:[
      { name:'Ohio Codes & Manufacturer Installation — full compliance line', qty:1, unit:'EA',
        unit_price:0, amount:0, description: ${JSON.stringify(LONG)} },
      { name:'Roofing system', qty:1, unit:'EA', unit_price:0, amount:46783, description:'Short one.' }
    ],
    subtotal:46783, discount:0, total:46783, deposit_pct:0, deposit_amount:0, photos:[] };
  window.CardinalEstimates.openEditor('p1', row);
  await new Promise(res => setTimeout(res, 900));
  const view = document.getElementById('cr-est-view');
  const descs = [...view.querySelectorAll('.desc-input')];
  const name = view.querySelector('.name-input');
  const out = {
    n: descs.length,
    clipped: descs.map(d => ({ sh: d.scrollHeight, ch: d.clientHeight, clip: d.scrollHeight > d.clientHeight + 2 })),
    namePadRight: name ? getComputedStyle(name).paddingRight : 'none',
  };
  /* typing keeps it sized: append two more sentences through the real event */
  const d0 = descs[0];
  d0.value = d0.value + ' Another sentence about flashing. And one more about ventilation baffles at every rafter bay.';
  d0.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(res => setTimeout(res, 200));
  out.afterType = { sh: d0.scrollHeight, ch: d0.clientHeight, clip: d0.scrollHeight > d0.clientHeight + 2 };
  return out;
})()`);
await browser.close();

const fails = [];
if (r.n < 2) fails.push('rig fault — proves nothing: line cards did not render');
else {
  if (r.clipped.some(x => x.clip)) fails.push('a description opens clipped: ' + JSON.stringify(r.clipped));
  if (r.afterType.clip) fails.push('typing outgrew the box: ' + JSON.stringify(r.afterType));
  if (parseFloat(r.namePadRight) < 100) fails.push(`name input clearance ${r.namePadRight} — runs under the move/delete buttons`);
}
if (errs.length) fails.push('page errors: ' + errs.slice(0, 2).join(' | '));
for (const f of fails) console.log('  FAIL ' + f);
console.log('  detail: ' + JSON.stringify(r));
console.log(fails.length ? `GATE 1135 RED — ${fails.length} failure(s)` : 'GATE 1135 GREEN — 4 checks');
process.exit(fails.length ? 1 : 0);
