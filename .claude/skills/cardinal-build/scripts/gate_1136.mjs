/* gate_1136.mjs — build 1136: the estimate document is readable across the table.
 *
 * A live client could not read the estimate on an iPad or on paper — the
 * document's working text ran 8.5–10.5pt with table headers at 6.8–7.5pt.
 * 1136 raised every working size one step inside buildDocHtml (display sizes
 * 13/19/24pt untouched).
 *
 * Method: drive the REAL preview — editor on a multi-line fixture, the real
 * Preview button, the iframe's srcdoc — then load that document alone and
 * measure COMPUTED sizes (pt resolves to px at 4/3):
 *   body/descriptions ≥ 13.3px (10pt) · table headers ≥ 11.3px (8.5pt)
 *   the 24pt title still 32px (display sizes untouched)
 * and print it to PDF, reporting the page count so growth is a number.
 * Control (1135 tree): RED — headers at 6.8pt (9.07px).
 * Run: node gate_1136.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1136: playwright not found'); process.exit(2); }
const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1136.mjs [index.html]'); process.exit(2); }
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'].map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const html = readFileSync(FILE, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await page.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
  ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
  : r.fulfill({ status: 200, body: '' }));
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);

const DESC = 'Remove existing layers of shingles and dispose of them. Inspect wood decking for damage; replace each 4x8 sheet of OSB as needed. Install the new system with proper intake and exhaust, all soft metals replaced, ice and water guard along all eaves and valleys.';
const srcdoc = await page.evaluate(`(async function(){
  if (typeof openProject === 'function') openProject('p1');
  await new Promise(res => setTimeout(res, 600));
  const lines = [];
  for (let k = 0; k < 10; k++) lines.push({ name: 'Line ' + (k+1) + ' — roofing scope item', qty: 1,
    unit: 'EA', unit_price: 0, amount: 4000 + k, flat: true, description: ${JSON.stringify(DESC)} });
  const row = { id:'est-p', project_id:'p1', archived:false, status:'draft',
    estimate_number:'EST-2026-0907', title:'Roof replacement', itemized:false, line_items: lines,
    subtotal:40045, discount:0, total:40045, deposit_pct:30, deposit_amount:12013.5, photos:[] };
  window.CardinalEstimates.openEditor('p1', row);
  await new Promise(res => setTimeout(res, 900));
  const pv = document.getElementById('cr-epub-preview-btn');
  if (!pv) return 'RIG:no preview button';
  pv.click();
  for (let t = 0; t < 20; t++) {
    await new Promise(res => setTimeout(res, 300));
    const f = document.querySelector('[data-slot="pv-frame"]');
    if (f && f.srcdoc && f.srcdoc.length > 2000) return f.srcdoc;
  }
  return 'RIG:no srcdoc';
})()`);
if (typeof srcdoc !== 'string' || srcdoc.startsWith('RIG:')) {
  console.log('  FAIL rig fault — proves nothing: ' + srcdoc);
  await browser.close(); process.exit(1);
}
const doc = await ctx.newPage();
await doc.setContent(srcdoc, { waitUntil: 'domcontentloaded' });
const m = await doc.evaluate(() => {
  const px = el => el ? parseFloat(getComputedStyle(el).fontSize) : null;
  const items = document.querySelector('table.items td');
  const th = document.querySelector('table.items th');
  const title = document.querySelector('h1') || document.body.firstElementChild;
  const all = [...document.querySelectorAll('body *')]
    .filter(el => el.textContent.trim() && !el.children.length);
  const smallest = Math.min(...all.map(el => parseFloat(getComputedStyle(el).fontSize)));
  return { body: px(document.body), itemsTd: px(items), itemsTh: px(th),
           titlePx: px(title), smallest: Math.round(smallest * 100) / 100 };
});
const pdf = await doc.pdf({ format: 'Letter' });
const pages = (pdf.toString('latin1').match(/\/Type[\s]*\/Page[^s]/g) || []).length;
await browser.close();

const fails = [];
if (m.body < 13.3) fails.push(`body ${m.body}px — under 10pt`);
if (m.itemsTd !== null && m.itemsTd < 13.3) fails.push(`items cell ${m.itemsTd}px — under 10pt`);
if (m.itemsTh !== null && m.itemsTh < 11.3) fails.push(`items header ${m.itemsTh}px — under 8.5pt`);
if (m.smallest < 11.3) fails.push(`smallest rendered text ${m.smallest}px — under 8.5pt`);
if (errs.length) fails.push('page errors: ' + errs.slice(0, 2).join(' | '));
for (const f of fails) console.log('  FAIL ' + f);
console.log('  detail: ' + JSON.stringify(m) + '  pdfPages=' + pages);
console.log(fails.length ? `GATE 1136 RED — ${fails.length} failure(s)` : 'GATE 1136 GREEN — 4 floors hold');
process.exit(fails.length ? 1 : 0);
