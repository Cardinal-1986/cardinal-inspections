/* gate_1347 — the Check Register (Owner Console) and Crews' All Payments + Masonry/Plumbing.
 *   A  owner: the hub shows a Check Register card; the area renders every seeded row,
 *      tab counts are right, Jerry's tab holds only his rows, search and month narrow
 *      the list, the totals strip sums the filtered rows, By person groups them
 *   B  owner: a row opens its detail; Save match writes ONE update to bank_register
 *      carrying the chosen project_id - and nothing is written to collections,
 *      crew_payments or commissions at any point
 *   C  Joan (admin, not owner): no register card, the area refuses, bank_register never read
 *   D  Crews as admin: All Payments lists every crew payment with a total; the crew
 *      filter narrows it; Masonry and Plumbing sections hold their crews
 *   E  Crews as production (Curtis): no All Payments item
 * Arg: [index.html] -> negative control (1346 must go RED, not crash).
 * Env: PW_MODULE (playwright entry), PW_CHROMIUM (browser executable). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)) + path.sep;
const { chromium } = await import(process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
const FILE = process.argv[2] || path.join(HERE, '..', '..', '..', '..', 'index.html');
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);

const R = (id, d, dir, grp, cat, party, amt, extra) => Object.assign({ id, txn_date: d, direction: dir, method: 'check', check_no: String(1000 + id.length), amount: amt,
  party, party_detail: null, memo: null, grp, category: cat, project_id: null, crew_id: null, account_last4: null, bank_ref: 'CHECK', note: null, source: 'test' }, extra || {});
const SEED = () => ({
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin', title: 'Owner' },
                  { email: 'joan@cardinalrenovations.net', name: 'Joan', role: 'admin', title: 'Office' },
                  { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production' }],
  projects: [{ id: 'pA', name: 'Beth Test', stage: 'Lead', address: '1 A St', checklist: '{}', created_at: '2026-01-01T00:00:00Z' },
             { id: 'pB', name: 'Rich Test', stage: 'Lead', address: '2 B St', checklist: '{}', created_at: '2026-01-01T00:00:00Z' }],
  crews: [{ id: 'c1', name: 'Roof Crew', trade: 'Roofing', archived: false }, { id: 'c2', name: 'Stone Guy', trade: 'Masonry', archived: false },
          { id: 'c3', name: 'Pipe Co', trade: 'Plumbing', archived: false }],
  crew_payments: [{ id: 'cp1', crew_id: 'c1', amount: 1000, method: 'check', reference: '#1', paid_on: '2026-09-01', memo: 'roof' },
                  { id: 'cp2', crew_id: 'c2', amount: 2500, method: 'check', reference: '#2', paid_on: '2026-08-01', memo: 'brick' },
                  { id: 'cp3', crew_id: 'c3', amount: 280, method: 'check', reference: '#3', paid_on: '2026-07-01', memo: 'pipe' }],
  bank_register: [
    R('r1', '2026-09-10', 'in', 'received', 'Client payment', 'Beth Test', 4565, { project_id: 'pA' }),
    R('r2', '2026-08-02', 'in', 'received', 'Insurance', 'Safeco', 16210.74),
    R('r3', '2026-07-10', 'out', 'jerry', 'Buyout installment', 'Pedro (Jerry)', 5584),
    R('r4', '2026-07-10', 'out', 'jerry', 'Sales commission', 'Pedro (Jerry)', 2043),
    R('r5', '2026-09-15', 'out', 'people', 'Owner draw', 'Theodore Dorion', 3000),
    R('r6', '2026-09-15', 'out', 'people', 'Production', 'Curtis Hoskins', 1800),
    R('r7', '2026-09-20', 'out', 'subs', 'Crew labor', 'Roof Crew', 1000, { crew_id: 'c1' }),
    R('r8', '2026-09-21', 'out', 'other', 'Supplier', 'ABC Supply', 7694.61, { method: 'ach', check_no: null })
  ],
  owner_tasks: [], owner_items: [], owner_reminders: [], owner_ledger: [], owner_ledger_txns: [], owner_docs: [], crew_docs: [], crew_notes: [],
  collections: [], commissions: [], company_templates: []
});

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  -> ' + d : '')); c ? pass++ : fail++; };

async function boot(as){
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); page.on('dialog', d => d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){};window.Papa={parse:function(){return{data:[]}}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(([seed, as]) => { window.__SEED__ = JSON.parse(JSON.stringify(seed)); if (as) window.__AS__ = { email: as, name: as.split('@')[0] }; }, [SEED(), as]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window.currentUser && window.CardinalOwner), null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  return { ctx, page };
}
const wait = (page, ms) => page.waitForTimeout(ms);

try {
  /* ---------- A + B: the owner ---------- */
  let { ctx, page } = await boot(null);
  await page.evaluate(async () => { await window.CardinalOwner.open(); });
  await wait(page, 1500);
  const hub = await page.evaluate(() => { const c = document.querySelector('#cr-owner [data-area="register"]'); return c ? { t: c.querySelector('.oc-t').textContent, n: c.querySelector('.oc-n').textContent } : null; });
  ok(!!hub && hub.t === 'Check Register' && hub.n === '8', 'A1 owner hub shows the Check Register card with the entry count', JSON.stringify(hub));
  await page.evaluate(() => { const c = document.querySelector('#cr-owner [data-area="register"]'); if (c) c.click(); });
  await wait(page, 1200);
  const A2 = await page.evaluate(() => {
    const r = document.getElementById('cr-reg'); if (!r) return null;
    const tabs = {}; r.querySelectorAll('[data-rgtab]').forEach(b => { tabs[b.getAttribute('data-rgtab')] = +(b.querySelector('small') || {}).textContent; });
    return { rows: r.querySelectorAll('[data-rgrow]').length, tabs, wide: document.getElementById('cr-owner').classList.contains('ow-reg-wide') };
  });
  ok(!!A2 && A2.rows === 8 && A2.wide, 'A2 the register renders all 8 rows on the wide surface', JSON.stringify(A2));
  ok(!!A2 && JSON.stringify(A2.tabs) === JSON.stringify({ all: 8, received: 2, mine: 1, team: 1, sales: 0, jerry: 2, subs: 1, other: 1 }), 'A3 every tab counts the right rows', JSON.stringify(A2 && A2.tabs));
  const A4 = await page.evaluate(async () => {
    const r = document.getElementById('cr-reg'); if (!r) return { parties: [], out: null }; r.querySelector('[data-rgtab="jerry"]').click(); await new Promise(x => setTimeout(x, 200));
    const parties = [...r.querySelectorAll('[data-rgrow] .p')].map(e => e.firstChild.textContent);
    const out = r.querySelector('.rg-k b.out').textContent;
    return { parties, out };
  });
  ok(A4.parties.length === 2 && A4.parties.every(p => /Jerry/.test(p)) && A4.out === '$7,627.00', 'A4 Jerry tab holds only his two rows and the strip totals them', JSON.stringify(A4));
  const A5 = await page.evaluate(async () => {
    const r = document.getElementById('cr-reg'); if (!r) return {}; r.querySelector('[data-rgtab="all"]').click(); await new Promise(x => setTimeout(x, 150));
    const q = r.querySelector('[data-rgf="q"]'); q.focus(); q.value = 'safeco'; q.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(x => setTimeout(x, 150));
    const n1 = r.querySelectorAll('[data-rgrow]').length, inn = r.querySelector('.rg-k b.in').textContent, focus = document.activeElement === q;
    q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
    const m = r.querySelector('[data-rgf="month"]'); m.value = '2026-07'; m.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(x => setTimeout(x, 150));
    const n2 = r.querySelectorAll('[data-rgrow]').length;
    m.value = ''; m.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(x => setTimeout(x, 150));
    r.querySelector('[data-rgview="party"]').click(); await new Promise(x => setTimeout(x, 150));
    const groups = r.querySelectorAll('[data-rgparty]').length;
    r.querySelector('[data-rgview="list"]').click(); await new Promise(x => setTimeout(x, 150));
    return { n1, inn, focus, n2, groups };
  });
  ok(A5.n1 === 1 && A5.inn === '$16,210.74' && A5.focus && A5.n2 === 2 && A5.groups === 7, 'A5 search keeps focus and narrows, month narrows, By person groups 8 rows into 7 names', JSON.stringify(A5));
  const B = await page.evaluate(async () => {
    const r = document.getElementById('cr-reg'); if (!r) return { det: false };
    r.querySelector('[data-rgrow="r2"]').click(); await new Promise(x => setTimeout(x, 150));
    const det = r.querySelector('[data-rgdet="r2"]'); if (!det) return { det: false };
    const sel = det.querySelector('[data-rglinksel]'); sel.value = 'pB';
    det.querySelector('[data-rgsave="r2"]').click(); await new Promise(x => setTimeout(x, 600));
    const w = (window.__WRITES__ || []);
    const reg = w.filter(x => x.table === 'bank_register');
    const bad = w.filter(x => /^(collections|crew_payments|commissions)$/.test(x.table)).length;
    const job = (r.querySelector('[data-rgrow="r2"] .rg-job') || {}).textContent;
    return { det: true, n: reg.length, op: reg[0] && reg[0].op, pid: reg[0] && reg[0].payload && reg[0].payload.project_id, bad, job };
  });
  ok(B.det && B.n === 1 && B.op === 'update' && B.pid === 'pB' && B.bad === 0 && B.job === 'Rich Test', 'B  Save match writes one bank_register update with the chosen job, and nothing else is written', JSON.stringify(B));
  await ctx.close();

  /* ---------- C: Joan ---------- */
  ({ ctx, page } = await boot('joan@cardinalrenovations.net'));
  const C = await page.evaluate(async () => {
    await window.CardinalOwner.open(); await new Promise(x => setTimeout(x, 1200));
    const card = !!document.querySelector('#cr-owner [data-area="register"]');
    await window.CardinalOwner.open('register'); await new Promise(x => setTimeout(x, 800));
    const reg = !!document.getElementById('cr-reg');
    const reads = (window.__READS__ || []).filter(x => x && x.table === 'bank_register').length;
    return { card, reg, reads };
  });
  ok(C.card === false && C.reg === false && C.reads === 0, 'C  Joan (admin, not owner): no card, the area refuses, bank_register is never read', JSON.stringify(C));
  await ctx.close();

  /* ---------- D: Crews as admin ---------- */
  ({ ctx, page } = await boot(null));
  const D = await page.evaluate(async () => {
    await window.CardinalCrews.open(); await new Promise(x => setTimeout(x, 1200));
    const v = document.getElementById('crewsView');
    const secs = [...v.querySelectorAll('.crw-sec span:first-child')].map(e => e.textContent);
    const item = v.querySelector('[data-allpay]'); if (!item) return { item: false, secs };
    item.click(); await new Promise(x => setTimeout(x, 300));
    const rows = v.querySelectorAll('[data-aplist] tbody tr').length;
    const total = (v.querySelector('[data-aplist] b') || {}).textContent;
    const cs = v.querySelector('[data-apf="crew"]'); cs.value = 'c2'; cs.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(x => setTimeout(x, 150));
    const rows2 = v.querySelectorAll('[data-aplist] tbody tr').length;
    const masonry = [...v.querySelectorAll('.crw-item')].some(e => /Stone Guy/.test(e.textContent));
    const plumbing = [...v.querySelectorAll('.crw-item')].some(e => /Pipe Co/.test(e.textContent));
    return { item: true, rows, total, rows2, secs, masonry, plumbing };
  });
  ok(D.item && D.rows === 3 && D.total === '$3,780.00' && D.rows2 === 1, 'D1 All Payments lists every crew payment with a total, and the crew filter narrows it', JSON.stringify(D));
  ok(D.secs && D.secs.indexOf('Masonry') !== -1 && D.secs.indexOf('Plumbing') !== -1 && D.masonry && D.plumbing, 'D2 Masonry and Plumbing sections exist and hold their crews', JSON.stringify(D.secs));
  await ctx.close();

  /* ---------- E: Crews as production ---------- */
  ({ ctx, page } = await boot('curtis@cardinalrenovations.net'));
  const E = await page.evaluate(async () => {
    await window.CardinalCrews.open(); await new Promise(x => setTimeout(x, 1200));
    const v = document.getElementById('crewsView');
    return { allpay: !!(v && v.querySelector('[data-allpay]')), loaded: !!(v && v.querySelector('.crw-nav')) };
  });
  ok(E.loaded && !E.allpay, 'E  production (Curtis) sees Crews without the All Payments item', JSON.stringify(E));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 400)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' - gate_1347: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
