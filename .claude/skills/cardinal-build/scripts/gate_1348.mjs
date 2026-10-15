/* gate_1348 - the 2nd TO: only Theo or Joan mark a job Lost.
 *   A  Jacob (sales): setStage(Lost) is refused - returns false, no projects row moves to
 *      Lost, and the job's checklist gains second_to {status:'requested'}; his banner waits
 *   B  Theo: the Owner Console shows a 2nd TO card counting the waiting job; the area lists it,
 *      then a Lost job with no 2nd TO, then an open job idle 30+ days
 *   C  Theo: take it writes second_to.status 'taken' and the job is still not Lost
 *   D  Theo: setStage(Lost) goes through and stamps lost_by
 *   E  Joan can decide; Jacob cannot (canDecide)
 * Arg: [index.html] -> negative control (1347 must go RED, not crash).
 * Env: PW_MODULE, PW_CHROMIUM. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)) + path.sep;
const { chromium } = await import(process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
const FILE = process.argv[2] || path.join(HERE, '..', '..', '..', '..', 'index.html');
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);

const OLD = '2026-08-01T00:00:00Z';
const NOW = new Date().toISOString();
const SEED = () => ({
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin', title: 'Owner' },
                  { email: 'joan@cardinalrenovations.net', name: 'Joan', role: 'admin', title: 'Office' },
                  { email: 'jacob@cardinalrenovations.net', name: 'Jacob', role: 'sales', title: 'Sales' }],
  projects: [
    { id: 'pJ', name: 'Jake Lead', stage: 'Prospect', address: '1 A St', created_by: 'jacob@cardinalrenovations.net', checklist: JSON.stringify({ stage_since: NOW }), created_at: NOW },
    { id: 'pW', name: 'Waiting Job', stage: 'Prospect', address: '2 B St', created_by: 'jacob@cardinalrenovations.net', checklist: JSON.stringify({ stage_since: NOW, second_to: { status: 'requested', by: 'jacob@cardinalrenovations.net', at: NOW, reason: 'Price', note: 'went cold' } }), created_at: NOW },
    { id: 'pL', name: 'Old Lost', stage: 'Lost', address: '3 C St', created_by: 'jacob@cardinalrenovations.net', checklist: JSON.stringify({ loss_reason: 'Ghosted', lost_at: OLD }), created_at: OLD },
    { id: 'pS', name: 'Stale Prospect', stage: 'Prospect', address: '4 D St', created_by: 'joey@cardinalrenovations.net', checklist: JSON.stringify({ stage_since: OLD, t_Prospect: OLD }), created_at: OLD }
  ],
  owner_tasks: [], owner_items: [], owner_reminders: [], owner_ledger: [], owner_ledger_txns: [], owner_docs: [], crew_docs: [], crew_notes: [],
  collections: [], commissions: [], company_templates: [], bank_register: [], crews: [], crew_payments: []
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
  /* ---------- A: Jacob asks ---------- */
  let { ctx, page } = await boot('jacob@cardinalrenovations.net');
  const A = await page.evaluate(async () => {
    window.__WRITES__ = [];
    const out = await window.setStage('pJ', 'Lost');
    await new Promise(x => setTimeout(x, 800));
    const w = window.__WRITES__ || [];
    const lostWrite = w.some(x => x.table === 'projects' && x.payload && x.payload.stage === 'Lost');
    const ckw = w.filter(x => x.table === 'projects' && x.payload && x.payload.checklist).map(x => JSON.parse(x.payload.checklist));
    const sto = ckw.map(c => c.second_to).filter(Boolean).pop() || null;
    const pr = cacheProjects.find(p => p.id === 'pJ');
    const ban = window.CardinalSecondTO ? window.CardinalSecondTO.banner(cacheProjects.find(p => p.id === 'pW')) : '';
    return { out, lostWrite, stage: pr && pr.stage, sto: sto && sto.status, by: sto && sto.by, waits: /Waiting on Theo or Joan/.test(ban), btns: /data-sto="lost"/.test(ban), can: window.CardinalSecondTO ? window.CardinalSecondTO.canDecide() : null };
  });
  ok(A.out === false && !A.lostWrite && A.stage === 'Prospect' && A.sto === 'requested' && A.by === 'jacob@cardinalrenovations.net', 'A  a rep Lost is refused and becomes a 2nd TO request', JSON.stringify(A));
  ok(A.waits && !A.btns && A.can === false, 'E1 the rep sees "waiting", gets no decision buttons, and cannot decide', JSON.stringify(A));
  await ctx.close();

  /* ---------- B, C, D: Theo ---------- */
  ({ ctx, page } = await boot(null));
  const B = await page.evaluate(async () => {
    await window.CardinalOwner.open(); await new Promise(x => setTimeout(x, 1200));
    const c = document.querySelector('#cr-owner [data-area="secondto"]');
    const card = c ? { t: c.querySelector('.oc-t').textContent, n: c.querySelector('.oc-n').textContent } : null;
    if (c) c.click(); await new Promise(x => setTimeout(x, 800));
    const rows = [...document.querySelectorAll('#cr-owner [data-sto-open]')].map(r => r.getAttribute('data-sto-open'));
    return { card, rows };
  });
  ok(!!B.card && B.card.t === '2nd TO' && B.card.n === '1', 'B1 Owner Console shows the 2nd TO card counting the one waiting job', JSON.stringify(B.card));
  ok(B.rows.join(',') === 'pW,pL,pS', 'B2 the area lists the waiting job, then the Lost-without-TO job, then the 30-day-idle job', JSON.stringify(B.rows));
  const C = await page.evaluate(async () => {
    window.__WRITES__ = [];
    await window.CardinalSecondTO.decide('pW', 'take'); await new Promise(x => setTimeout(x, 600));
    const w = window.__WRITES__ || [];
    const ck = w.filter(x => x.table === 'projects' && x.payload && x.payload.checklist).map(x => JSON.parse(x.payload.checklist)).pop() || {};
    return { status: ck.second_to && ck.second_to.status, by: ck.second_to && ck.second_to.decided_by, lost: w.some(x => x.payload && x.payload.stage === 'Lost') };
  });
  ok(C.status === 'taken' && C.by === 'theo@cardinalrenovations.net' && !C.lost, 'C  "take it" records the take and the job stays open', JSON.stringify(C));
  const D = await page.evaluate(async () => {
    window.__WRITES__ = [];
    const out = await window.setStage('pJ', 'Lost'); await new Promise(x => setTimeout(x, 800));
    const w = window.__WRITES__ || [];
    const moved = w.some(x => x.table === 'projects' && x.payload && x.payload.stage === 'Lost');
    const ck = w.filter(x => x.table === 'projects' && x.payload && x.payload.checklist).map(x => JSON.parse(x.payload.checklist)).pop() || {};
    return { out, moved, lost_by: ck.lost_by };
  });
  ok(D.out !== false && D.moved && D.lost_by === 'theo@cardinalrenovations.net', 'D  Theo marks Lost directly and lost_by is stamped', JSON.stringify(D));
  await ctx.close();

  /* ---------- E: Joan ---------- */
  ({ ctx, page } = await boot('joan@cardinalrenovations.net'));
  const E = await page.evaluate(() => ({ can: window.CardinalSecondTO ? window.CardinalSecondTO.canDecide() : null }));
  ok(E.can === true, 'E2 Joan can decide a 2nd TO', JSON.stringify(E));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 400)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' - gate_1348: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
