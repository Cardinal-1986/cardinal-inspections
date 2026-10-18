/* gate_1368.mjs — a refund takes the commission back (invoicing audit M7; Theo "1A 2b").
   A  the new-collection form has a "This is a refund" box (44px row); an edit does not
   B  ticked + 1,000 typed  -> the row saves as -1000, its note starts "Refund"
   C  the commission is -$100 and goes to the rep who EARNED the job, though the job now has no rep
   D  the toast says "Refund logged — $1,000.00 · $100.00 commission taken back from <rep name>"
   E  unticked, a payment is unchanged: +amount, "Collection logged", commission for the job's rep
   F  "Don't take it out of the rep's commission" (Theo): the refund saves, no commission comes back; ignored on a payment
   Usage: node gate_1368.mjs [index.html]   (1367 = RED) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function run(seed, drive) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const page = await ctx.newPage();
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
  await page.addInitScript(s => { window.__SEED__ = s; }, seed);
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
  await page.waitForTimeout(1000);
  const out = await drive(page);
  await ctx.close();
  return out;
}

function seedFor(rep) {
  return {
    team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' },
                    { email: 'rep@cardinalrenovations.net', name: 'Sample Rep', role: 'sales' }],
    projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Invoiced', sales_rep: rep,
                 checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
                 created_by: 'theo@cardinalrenovations.net', updated_at: now }],
    collections: [], commissions: [], draws: [],
    inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [], punch_items: [], appointments: []
  };
}


const open = (edit) => async (page) => page.evaluate((edit) => {
  try { showTab('commissions'); } catch (e) {}
  const t = document.getElementById('tab-commissions'); if (t) t.style.display = 'block';
  if (window.commUi) { window.commUi.collForm = true; window.commUi.editColl = edit || null; }
  try { renderCommissions(); } catch (e) {}
}, edit);
const save = (amount, refund, keep) => async (page) => {
  await open(null)(page); await page.waitForTimeout(800);
  const box = await page.evaluate(() => { const b = document.getElementById('miRefund'); if (!b) return null; const r = b.closest('label').getBoundingClientRect(); const k = document.getElementById('miKeepComm'); return { h: Math.round(r.height), keepH: k ? Math.round(k.closest('label').getBoundingClientRect().height) : 0 }; });
  await page.evaluate(() => { window.__WRITES__ = []; });
  await page.fill('#miAmt', String(amount));
  if (refund) await page.evaluate(() => { const b = document.getElementById('miRefund'); if (b) b.checked = true; });
  if (keep) await page.evaluate(() => { const b = document.getElementById('miKeepComm'); if (b) b.checked = true; });
  await page.evaluate(() => { const b = document.getElementById('miSave'); if (b) b.click(); });
  await page.waitForFunction(() => document.querySelectorAll('#crToasts .crt').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  return page.evaluate((box) => {
    const w = (window.__WRITES__ || []).filter(x => x.table === 'collections' && x.op === 'insert')[0];
    const row = w && (Array.isArray(w.payload) ? w.payload[0] : w.payload);
    return { box, row: row ? { amount: row.amount, notes: row.notes, keep: row.keep_commission } : null,
      toast: [...document.querySelectorAll('#crToasts .crt')].map(e => e.innerText.replace(/\s*×\s*$/, '').replace(/\s+/g, ' ').trim()).join(' | '),
      comms: ((window.__SEED__ && window.__SEED__.commissions) || []).filter(c => c.id !== 'K0').map(c => ({ amt: Number(c.amount), rep: c.rep_email })),
      name: (function(){ try { return rptRepName('rep@cardinalrenovations.net'); } catch (e) { return null; } })() };
  }, box);
};
function seed(rep, earned) {
  return {
    team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' },
                    { email: 'rep@cardinalrenovations.net', name: 'Sample Rep', role: 'sales' }],
    projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Closed', sales_rep: rep,
                 checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_by: 'theo@cardinalrenovations.net', updated_at: now }],
    collections: earned ? [{ id: 'C0', project_id: 'P1', amount: 10000, collected_at: '2026-08-01', type: 'final', created_by: 'theo@cardinalrenovations.net', created_at: now }] : [],
    commissions: earned ? [{ id: 'K0', project_id: 'P1', collection_id: 'C0', rep_email: earned, amount: 1000, status: 'paid', created_at: '2026-08-02T00:00:00Z' }] : [],
    draws: [], inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [], punch_items: [], appointments: []
  };
}
{ /* refund on a job that has since been unassigned */
  const r = await run(seed(null, 'rep@cardinalrenovations.net'), save(1000, true));
  chk('A: the new-collection form has a refund box, a 44px row', r.box && r.box.h >= 44, JSON.stringify(r.box));
  chk('B: ticked, the row saves as -1000', r.row && Number(r.row.amount) === -1000, JSON.stringify(r.row));
  chk('B: its note starts "Refund"', r.row && /^Refund/.test(r.row.notes || ''), JSON.stringify(r.row));
  chk('C: -$100 commission, to the rep who earned the job (job has no rep now)', r.comms.length === 1 && r.comms[0].amt === -100 && r.comms[0].rep === 'rep@cardinalrenovations.net', JSON.stringify(r.comms));
  chk('D: toast says Refund logged and names the take-back', /Refund logged/.test(r.toast) && /1,000\.00/.test(r.toast) && /100\.00 commission taken back from/.test(r.toast) && !!r.name && r.toast.indexOf(r.name) !== -1 && !/-\$/.test(r.toast), r.toast);
}
{ /* Theo: a refund that does NOT come out of the commission */
  const r = await run(seed(null, 'rep@cardinalrenovations.net'), save(1000, true, true));
  chk('F: the form has a "Don\u2019t take it out of the rep\u2019s commission" box, a 44px row', r.box && r.box.keepH >= 44, JSON.stringify(r.box));
  chk('F: ticked, the refund still saves as -1000 and is marked keep_commission', r.row && Number(r.row.amount) === -1000 && r.row.keep === true, JSON.stringify(r.row));
  chk('F: no commission is taken back', r.comms.length === 0, JSON.stringify(r.comms));
  chk('F: the toast says the commission is left alone', /Refund logged/.test(r.toast) && /commission is left as it was/.test(r.toast) && !/taken back/.test(r.toast), r.toast);
}
{ /* the keep box does nothing on an ordinary payment */
  const r = await run(seed('rep@cardinalrenovations.net', null), save(2000, false, true));
  chk('F: on a payment (not a refund) the keep box is ignored', r.row && Number(r.row.amount) === 2000 && !r.row.keep && r.comms.length === 1 && r.comms[0].amt === 200, JSON.stringify({ row: r.row, c: r.comms }));
}
{ /* an ordinary payment is unchanged */
  const r = await run(seed('rep@cardinalrenovations.net', null), save(5000, false));
  chk('E: unticked, the payment saves as +5000', r.row && Number(r.row.amount) === 5000 && !/^Refund/.test(r.row.notes || ''), JSON.stringify(r.row));
  chk('E: +$500 commission for the job rep, toast "Collection logged"', r.comms.length === 1 && r.comms[0].amt === 500 && /Collection logged/.test(r.toast) && /commission for/.test(r.toast), JSON.stringify({ c: r.comms, t: r.toast }));
}
{ /* an edit has no refund box */
  const s = seed('rep@cardinalrenovations.net', 'rep@cardinalrenovations.net');
  const r = await run(s, async (page) => { await open('C0')(page); await page.waitForTimeout(800);
    return page.evaluate(() => ({ form: !!document.getElementById('miAmt'), box: !!document.getElementById('miRefund') })); });
  chk('A: editing a collection shows no refund box', r.form && !r.box, JSON.stringify(r));
}
await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? 'GATE 1368 GREEN' : `GATE 1368 RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
