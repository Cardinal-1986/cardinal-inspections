/*
 * Build 844 gate — re-crewing supersedes the prior same-trade work order.
 * Boots the REAL index.html in Chromium against the recording mock, seeds a project
 * that already has an active roofing WO (crew A) and a siding WO (crew C), then calls
 * the REAL createWorkOrder() to assign a DIFFERENT roofing crew (B). Asserts crew A's
 * roofing WO went 'superseded', crew C's siding WO is untouched, and crew B's WO exists.
 * db.create + openEditor are stubbed so no document work runs; the supersede queries and
 * the insert run for real against the mock.
 *   node gate_844.mjs                          # 844 -> GREEN (A superseded)
 *   node gate_844.mjs /path/to/index_v843.html # 843 -> RED  (A stays active; no supersede)
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
const TAG = FILE.includes('843') ? '843' : '844';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  crews: [
    { id: 'cA', name: 'Roof Crew A', trade: 'Roofing', archived: false },
    { id: 'cB', name: 'Roof Crew B', trade: 'Roofing', archived: false },
    { id: 'cC', name: 'Side Crew C', trade: 'Siding',  archived: false },
  ],
  crew_work_orders: [
    { id: 'w1', crew_id: 'cA', project_id: 'p1', report_id: 'r1', status: 'draft', wo_number: 1001, scheduled_on: null },
    { id: 'w2', crew_id: 'cC', project_id: 'p1', report_id: 'r2', status: 'draft', wo_number: 1002, scheduled_on: null },
  ],
  crew_rates: [], pricing_items: [],
  projects: [{ id: 'p1', name: 'Test Job', address: '1 Test St', stage: 'Scheduled', checklist: {} }],
  inspection_reports: [], appointments: [], estimates: [], punch_items: [], insurance_claims: [],
};

const errs = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 } });
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
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + extra : '')); } };

console.log(`artifact : ${FILE}  (build ${TAG})`);
try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (window.sb || window.supa) && typeof window.createWorkOrder === 'function', { timeout: 20000 });

  const r = await page.evaluate(async () => {
    // stub the document layer + navigation so only the WO-row logic runs
    if (window.db) window.db.create = async () => 'rNEW';
    window.openEditor = () => {};
    window.currentUser = window.currentUser || { email: 'theo@cardinalrenovations.net' };
    const sb = window.sb || window.supa;

    const pr = { id: 'p1', name: 'Test Job' };
    const crewB = { id: 'cB', name: 'Roof Crew B', trade: 'Roofing' };
    try { await window.createWorkOrder(pr, crewB, { scheduled_on: null, scope: 'test' }); }
    catch (e) { return { threw: String(e && e.message || e) }; }

    const all = (await sb.from('crew_work_orders').select('*')).data || [];
    const byId = {}; all.forEach(w => { byId[w.id] = w; });
    return {
      w1: byId.w1 && byId.w1.status,                 // crew A, roofing — expect superseded
      w2: byId.w2 && byId.w2.status,                 // crew C, siding  — expect untouched
      newForB: all.some(w => w.crew_id === 'cB' && w.project_id === 'p1'),
      total: all.length,
    };
  });

  if (r.threw) { ok('createWorkOrder ran without throwing', false, r.threw); }
  else {
    ok('a new work order was created for the reassigned crew (B)', r.newForB, JSON.stringify(r));
    ok('the siding WO (different trade) is untouched', r.w2 === 'draft', r.w2);
    if (TAG === '844')
      ok('the prior roofing WO (crew A) is now SUPERSEDED', r.w1 === 'superseded', r.w1);
    else
      ok('on 843 the prior roofing WO is NOT superseded (neg control)', r.w1 === 'draft', r.w1);
  }

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 3).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 300));
  console.log(errs.length ? 'pageerrors: ' + errs.slice(0, 5).join(' | ') : '');
  fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
