/* gate_728.mjs — a money button cannot be double-tapped into two writes.
   Uses the mock's __MOCK_DELAY__ so the second tap really does land while the
   first save is still in flight (with an instant mock the bug cannot reproduce),
   and __MOCK_FAIL__ to prove the button unlocks after a refused write.
   Usage: node gate_728.mjs [path/to/index.html]   (v727 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const APP_HTML = readFileSync(APP, 'utf8');
const now = new Date().toISOString();

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' },
                  { email: 'nick@cardinalrenovations.net', name: 'Nick Hey', role: 'sales' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Invoiced', sales_rep: 'nick@cardinalrenovations.net',
               checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
               created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  collections: [], commissions: [], draws: [],
  punch_items: [], inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [], appointments: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await browser.newContext({ viewport: { width: 430, height: 900 } })).newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
await page.waitForTimeout(1500);

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d || '' });
const writes = t => page.evaluate(tbl => (window.__WRITES__ || []).filter(x => x.table === tbl && x.op === 'insert').length, t);

async function openMoney(which) {
  await page.evaluate((w) => {
    try { showTab('commissions'); } catch (e) {}
    const t = document.getElementById('tab-commissions'); if (t) t.style.display = 'block';
    if (window.commUi) { window.commUi.collForm = (w === 'coll'); window.commUi.drawForm = (w === 'draw'); }
    try { renderCommissions(); } catch (e) {}
  }, which);
  await page.waitForTimeout(700);
}

// ─────────── 1. the collection button: the one that cascades to a commission
await openMoney('coll');
await page.evaluate(() => { window.__WRITES__ = []; window.__MOCK_DELAY__ = 500; });
await page.fill('#miAmt', '17025.00');
// two taps inside the in-flight window, the way a thumb on a slow link does it
await page.evaluate(() => { const b = document.getElementById('miSave'); b.click(); b.click(); });
await page.waitForTimeout(120);
const midFlight = await page.evaluate(() => {
  const b = document.getElementById('miSave');
  return { disabled: b ? b.disabled : null, label: b ? b.textContent.trim() : null };
});
chk('while saving, the button is disabled', midFlight.disabled === true, JSON.stringify(midFlight));
chk('while saving, it says so', /saving/i.test(midFlight.label || ''), midFlight.label);
await page.waitForTimeout(1400);
const collIns = await writes('collections');
chk('a DOUBLE TAP writes exactly ONE collection', collIns === 1, 'collections inserts = ' + collIns);

// ─────────── 2. a refused write must unlock the button again
await openMoney('coll');
await page.evaluate(() => { window.__WRITES__ = []; window.__MOCK_DELAY__ = 200; window.__MOCK_FAIL__ = 'collections'; });
await page.fill('#miAmt', '999.00');
await page.evaluate(() => { const b = document.getElementById('miSave'); if (b) b.click(); });
await page.waitForTimeout(1200);
const afterFail = await page.evaluate(() => {
  const b = document.getElementById('miSave');
  const m = document.getElementById('miMsg');
  return { disabled: b ? b.disabled : null, label: b ? b.textContent.trim() : null, msg: m ? m.textContent.trim() : '' };
});
chk('after a FAILED save the button unlocks (try/finally)', afterFail.disabled === false, JSON.stringify(afterFail));
chk('after a failed save the label is restored', !/saving/i.test(afterFail.label || ''), afterFail.label);
chk('the failure is reported to the user', /could not save/i.test(afterFail.msg || ''), afterFail.msg);
await page.evaluate(() => { window.__MOCK_FAIL__ = null; });

// ─────────── 3. the draw button
await openMoney('draw');
await page.evaluate(() => { window.__WRITES__ = []; window.__MOCK_DELAY__ = 500; });
await page.fill('#miDrawAmt', '500');
await page.evaluate(() => {
  const s = document.getElementById('miDrawRep');
  if (s && s.options.length > 1) s.value = s.options[1].value;
  const b = document.getElementById('miDrawSave'); b.click(); b.click();
});
await page.waitForTimeout(1500);
const drawIns = await writes('draws');
chk('a DOUBLE TAP writes exactly ONE draw', drawIns === 1, 'draws inserts = ' + drawIns);

// ─────────── 4. the manual commission button
await page.evaluate(() => {
  const t = document.getElementById('tab-commissions'); if (t) t.style.display = 'block';
  if (window.commUi) { window.commUi.collForm = false; window.commUi.drawForm = false; window.commUi.manual = true; }
  try { renderCommissions(); } catch (e) {}
});
await page.waitForTimeout(700);
const hasManual = await page.evaluate(() => !!document.getElementById('cmAdd'));
if (hasManual) {
  await page.evaluate(() => { window.__WRITES__ = []; window.__MOCK_DELAY__ = 500; });
  await page.fill('#cmRep', 'nick@cardinalrenovations.net');
  await page.fill('#cmAmt', '250');
  await page.evaluate(() => { const b = document.getElementById('cmAdd'); b.click(); b.click(); });
  await page.waitForTimeout(1500);
  const cmIns = await writes('commissions');
  chk('a DOUBLE TAP writes exactly ONE manual commission', cmIns === 1, 'commissions inserts = ' + cmIns);
} else {
  chk('manual commission form reachable', false, '#cmAdd not rendered');
}

let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
