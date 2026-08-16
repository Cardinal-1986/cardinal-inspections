/*
 * Build 847 render gate — the Crews "Jobs" history tab.
 * Boots the REAL index.html in Chromium against the recording mock, opens the
 * Crews section, selects a crew, and clicks the Jobs tab. Proves:
 *   - the Jobs tab exists and renders one row per work order, newest CREATED first
 *   - each row shows the created date and the right status chip
 *     (Draft / Dispatched / Completed / Superseded); superseded rows read dim
 *   - client names resolve from cacheProjects
 *   - ADMIN: Amount + Paid columns show, per-job Paid sums crew_payments by
 *     work_order_id, Billed excludes superseded, Paid-to-crew = the whole crew total
 *   - NON-ADMIN: the tab and job list still show, but NO money columns/footer
 *   node render_crewjobs847.mjs                          # 847 -> GREEN
 *   node render_crewjobs847.mjs /path/to/index_v846.html # 846 -> RED (no Jobs tab)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('846') ? '846' : '847';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  crews: [
    { id: 'cA', name: 'Betos Home Improvements', legal_name: 'Betos LLC', trade: 'Roofing', archived: false, contact_name: 'Alberto Campuzano' },
    { id: 'cB', name: 'Empty Crew', legal_name: null, trade: 'Siding', archived: false, contact_name: 'Nobody' },
  ],
  crew_docs: [], crew_notes: [], crew_rates: [], pricing_items: [],
  crew_work_orders: [
    { id: 'w4', wo_number: 'WO-1003', crew_id: 'cA', project_id: 'p2', status: 'draft',      amount: 1500, scheduled_on: null,         completed_on: null,          sent_at: null,                     created_at: '2026-08-15T10:00:00Z' },
    { id: 'w2', wo_number: 'WO-1002', crew_id: 'cA', project_id: 'p2', status: 'sent',       amount: 2500, scheduled_on: '2026-08-20', completed_on: null,          sent_at: '2026-08-12T12:00:00Z',   created_at: '2026-08-12T09:00:00Z' },
    { id: 'w1', wo_number: 'WO-1001', crew_id: 'cA', project_id: 'p1', status: 'sent',       amount: 3000, scheduled_on: '2026-08-13', completed_on: '2026-08-14', sent_at: '2026-08-10T12:00:00Z',   created_at: '2026-08-10T09:00:00Z' },
    { id: 'w3', wo_number: 'WO-1000', crew_id: 'cA', project_id: 'p1', status: 'superseded', amount: 2000, scheduled_on: null,         completed_on: null,          sent_at: null,                     created_at: '2026-08-08T09:00:00Z' },
  ],
  crew_payments: [
    { id: 'pay1', crew_id: 'cA', work_order_id: 'w1', project_id: 'p1', amount: 1500, method: 'check', paid_on: '2026-08-15' },
    { id: 'pay2', crew_id: 'cA', work_order_id: 'w1', project_id: 'p1', amount: 1500, method: 'check', paid_on: '2026-08-16' },
    { id: 'pay3', crew_id: 'cA', work_order_id: null, project_id: null, amount: 500,  method: 'cash',  paid_on: '2026-08-16' },
  ],
  projects: [
    { id: 'p1', name: 'Sandra Whitfield', address: '1042 Maple Ave', stage: 'Scheduled', checklist: {} },
    { id: 'p2', name: 'Marcus Cole',      address: '88 Oak St',      stage: 'Approved',   checklist: {} },
  ],
  inspection_reports: [], appointments: [], estimates: [], punch_items: [], insurance_claims: [],
};

const errs = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errs.push(String(e.message || e)));

await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]};},unparse:function(){return"";}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {} }) }); } catch (e) {} });

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };

console.log(`artifact : ${FILE}  (build ${TAG})`);

async function openJobsTab(asEmail) {
  return await page.evaluate(async (email) => {
    if (email) { try { window.currentUser = { email: email }; } catch (e) {} }
    await window.CardinalCrews.open();
    await new Promise(r => setTimeout(r, 150));
    const v = document.getElementById('crewsView');
    const pick = v.querySelector('[data-crew="cA"]');
    if (pick) pick.click();
    await new Promise(r => setTimeout(r, 60));
    const jt = v.querySelector('[data-tab="jobs"]');
    const tabExists = !!jt;
    if (jt) jt.click();
    await new Promise(r => setTimeout(r, 80));
    const table = v.querySelector('.crw-rt');
    const heads = table ? Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim()) : [];
    const bodyRows = table ? Array.from(table.querySelectorAll('tbody tr')).map(tr => ({
      cells: Array.from(tr.children).map(td => td.textContent.trim()),
      dim: /opacity\s*:\s*\.?55/.test(tr.getAttribute('style') || ''),
    })) : [];
    // footer is the last flex div after the table wrap
    const wrap = v.querySelector('.crw-cardbot');
    const footText = wrap ? (wrap.querySelector('div[style*="flex-end"]') || {}).textContent : '';
    return { tabExists, heads, bodyRows, footText: (footText || '').replace(/\s+/g, ' ').trim() };
  }, asEmail);
}

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CardinalCrews && typeof window.CardinalCrews.open === 'function' && (window.sb || window.supa), { timeout: 20000 });

  // ---------- ADMIN (theo) ----------
  const a = await openJobsTab(null);
  ok('[admin] Jobs tab exists', a.tabExists, a);
  ok('[admin] 4 job rows for the crew', a.bodyRows.length === 4, a.bodyRows.map(r => r.cells));
  ok('[admin] newest CREATED first (row1 = Aug 15)', /Aug 15, 2026/.test((a.bodyRows[0] || {cells:[]}).cells[0] || ''), (a.bodyRows[0]||{}).cells);
  ok('[admin] header carries Amount + Paid columns', a.heads.includes('Amount') && a.heads.includes('Paid'), a.heads);
  const statuses = a.bodyRows.map(r => r.cells[3]);
  ok('[admin] status chips present (Draft/Dispatched/Completed/Superseded)',
     statuses.some(s => /Draft/.test(s)) && statuses.some(s => /Dispatched/.test(s)) &&
     statuses.some(s => /Completed/.test(s)) && statuses.some(s => /Superseded/.test(s)), statuses);
  const superRow = a.bodyRows.find(r => /Superseded/.test(r.cells[3]));
  ok('[admin] the superseded row reads dim', !!(superRow && superRow.dim), superRow);
  ok('[admin] client name resolved from cacheProjects', a.bodyRows.some(r => /Sandra Whitfield/.test(r.cells[1])) && a.bodyRows.some(r => /Marcus Cole/.test(r.cells[1])), a.bodyRows.map(r=>r.cells[1]));
  const w1row = a.bodyRows.find(r => /WO-1001/.test(r.cells[2]));
  ok('[admin] the completed job (WO-1001) shows $3,000.00 paid', !!(w1row && /\$3,000\.00/.test(w1row.cells[6] || '')), w1row);
  ok('[admin] footer: Billed excludes superseded ($7,000.00)', /Billed[^$]*\$7,000\.00/.test(a.footText), a.footText);
  ok('[admin] footer: Paid to crew is the whole total ($3,500.00)', /Paid to crew[^$]*\$3,500\.00/.test(a.footText), a.footText);

  // ---------- NON-ADMIN (production: curtis) ----------
  const n = await openJobsTab('curtis@cardinalrenovations.net');
  ok('[prod] Jobs tab still exists', n.tabExists, n);
  ok('[prod] job rows still render', n.bodyRows.length === 4, n.bodyRows.length);
  ok('[prod] NO money columns (Amount/Paid absent)', !n.heads.includes('Amount') && !n.heads.includes('Paid'), n.heads);
  ok('[prod] NO Billed/Paid figures in the footer', !/Billed/.test(n.footText) && !/Paid to crew/.test(n.footText), n.footText);
  ok('[prod] but the job count still shows', /\d+ jobs?/.test(n.footText), n.footText);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 3).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 300));
  console.log(errs.length ? 'pageerrors: ' + errs.slice(0, 5).join(' | ') : '');
  fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
