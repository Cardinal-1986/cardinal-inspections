import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const APP_HTML = readFileSync(APP, 'utf8');

const now = '2026-08-11T12:00:00.000Z';
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Test Job', stage: 'Scheduled', checklist: JSON.stringify({ lead: {} }), created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  inspection_reports: [
    { id: 'WO1', project_id: 'P1', title: 'Work Order — Roofing — Crew A', status: 'unsent', sent_at: null, created_at: now, updated_at: now, created_by: 'theo@cardinalrenovations.net' },
    { id: 'WO2', project_id: 'P1', title: 'Work Order — Siding — Crew B', status: 'unsent', sent_at: null, created_at: now, updated_at: now, created_by: 'theo@cardinalrenovations.net' }
  ],
  crew_work_orders: [
    { report_id: 'WO1', project_id: 'P1', status: 'draft', sent_at: null, sent_via: null, completed_on: null },
    { report_id: 'WO2', project_id: 'P1', status: 'draft', sent_at: null, sent_via: null, completed_on: null }
  ],
  estimates: [], contracts: [], ai_estimates: [], collections: [], commissions: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const checks = [];
function chk(name, cond, detail) { checks.push({ name, pass: !!cond, detail: detail || '' }); }
function lastWrite(t) { return page.evaluate((tbl) => { const w = (window.__WRITES__ || []).filter(x => x.table === tbl); return w.length ? w[w.length - 1] : null; }, t); }

const hasIdx = await page.evaluate(() => typeof indexWorkOrders === 'function');
chk('indexWorkOrders() exists', hasIdx);

// open the project and render the Work Orders tab
await page.evaluate(() => { if (typeof openProject === 'function') openProject('P1'); });
await page.waitForTimeout(1200);
await page.evaluate(() => { try { if (typeof showTab === 'function') showTab('workorders'); } catch (e) {} try { if (typeof renderProjectDocs === 'function') renderProjectDocs(); } catch (e) {} var t = document.getElementById('tab-workorders'); if (t) t.style.display = 'block'; });
await page.waitForTimeout(600);

let woByReportSet = await page.evaluate(() => typeof woByReport !== 'undefined' && !!woByReport['WO1']);
chk('crew_work_orders loaded into woByReport by report_id', woByReportSet);

async function tileHtml() { return await page.evaluate(() => { const m = document.getElementById('woDocsMount'); return m ? m.innerHTML : ''; }); }
let html = await tileHtml();
chk('WO tab renders the two work-order docs', /Work Order/.test(html) && /data-act="wodone"/.test(html), 'wodone present=' + /data-act="wodone"/.test(html));
chk('draft WO shows a "Mark completed" button, not COMPLETED', /Mark completed/.test(html) && !/COMPLETED/.test(html), '');

// ---- Mark completed on WO1 ----
await page.evaluate(() => window.__WRITES__ = []);
const clickedDone = await page.evaluate(() => { const b = document.querySelector('#woDocsMount button[data-act="wodone"][data-id="WO1"]'); if (!b) return false; b.click(); return true; });
chk('WO1 has a Mark-completed control to click', clickedDone);
await page.waitForTimeout(700);
let wDone = await lastWrite('crew_work_orders');
chk('Mark completed writes crew_work_orders {status:completed, completed_on} by report_id',
  wDone && wDone.op === 'update' && wDone.payload.status === 'completed' && !!wDone.payload.completed_on &&
  wDone.filters && wDone.filters.some(f => f.col === 'report_id' && f.val === 'WO1'),
  JSON.stringify(wDone && wDone.payload));
await page.evaluate(() => { try { renderProjectDocs(); } catch (e) {} });
await page.waitForTimeout(300);
html = await tileHtml();
chk('after completing: COMPLETED chip + Reopen on WO1', /COMPLETED/.test(html) && /Reopen/.test(html), '');

// ---- Toggle "Mark sent" on WO2 mirrors dispatch onto its crew row ----
await page.evaluate(() => window.__WRITES__ = []);
const clickedToggle = await page.evaluate(() => { const b = document.querySelector('#woDocsMount button[data-act="toggle"][data-id="WO2"]'); if (!b) return false; b.click(); return true; });
chk('WO2 has a Mark-sent toggle to click', clickedToggle);
await page.waitForTimeout(700);
let wSent = await lastWrite('crew_work_orders');
let wDoc = await page.evaluate(() => { const w = (window.__WRITES__ || []).filter(x => x.table === 'inspection_reports'); return w.length ? w[w.length - 1] : null; });
chk('Mark sent writes inspection_reports {status:sent}', wDoc && wDoc.payload && wDoc.payload.status === 'sent', JSON.stringify(wDoc && wDoc.payload));
chk('Mark sent mirrors crew_work_orders {status:sent, sent_via:link}',
  wSent && wSent.op === 'update' && wSent.payload.status === 'sent' && wSent.payload.sent_via === 'link' &&
  wSent.filters && wSent.filters.some(f => f.col === 'report_id' && f.val === 'WO2'),
  JSON.stringify(wSent && wSent.payload));
await page.evaluate(() => { try { renderProjectDocs(); } catch (e) {} });
await page.waitForTimeout(300);
html = await tileHtml();
chk('after dispatch: WO2 shows DISPATCHED', /DISPATCHED/.test(html), '');

let fails = 0;
console.log('indexWorkOrders present:', hasIdx);
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}${c.detail ? '  (' + c.detail + ')' : ''}`); if (!c.pass) fails++; }
if (errs.length) console.log('PAGE ERRORS:', [...new Set(errs)].slice(0, 8).join(' | '));
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
