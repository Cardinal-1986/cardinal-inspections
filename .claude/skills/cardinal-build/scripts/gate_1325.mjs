/* gate_1325 — Owner Review's automatic flags: six rules, all on, each switchable, each fires once.
 *   A  admin opens Owner Review: exactly the six seeded problems are flagged, one row each, with the
 *      right rule key — and the two clean jobs (one WITH a signed change order) are not
 *   B  running again adds nothing
 *   C  Dismiss on an automatic flag sticks: the next run does not bring it back
 *   D  a rule switched off (owner_review_rules) does not fire; the switch in the list writes the table
 *   E  a sales rep: runRules() writes nothing and reads nothing from either table
 * Arg: [index.html] -> negative control (1324: must go RED, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 260000);
const ago = d => new Date(Date.now() - d * 86400000).toISOString();
const REP = 'nick@cardinalrenovations.net';
const P = (id, stage, ct, since) => ({ id, name: 'Client ' + id, stage, address: '1 Main St', phone: '', email: '', sales_rep: REP, created_by: REP,
  checklist: JSON.stringify({ lead: { claim_type: ct || 'retail' }, stage_since: since || ago(2) }), created_at: ago(60), updated_at: ago(1) });
const C = (pid, total, title) => ({ id: 'c' + pid + (title ? 'x' : ''), project_id: pid, title: (title || 'Contract') + ' — Client ' + pid, total, signed_at: ago(40), html: '<p>x</p>', status: 'signed', created_at: ago(40), updated_at: ago(40) });
const base = () => ({
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }, { email: REP, name: 'Rep', role: 'sales', title: 'Sales' }],
  projects: [P('p1', 'Approved'), P('p2', 'Approved', 'insurance'), P('p3', 'Completed', 'insurance', ago(3)), P('p4', 'Scheduled'), P('p4b', 'Scheduled'),
             P('p5', 'Completed', 'retail', ago(30)), P('p6', 'Invoiced'), P('ok', 'Approved')],
  estimates: [{ id: 'e1', project_id: 'p1', title: 'Estimate', total: 14800, created_at: ago(50), created_by: REP }, { id: 'e2', project_id: 'ok', title: 'Estimate', total: 9000, created_at: ago(50), created_by: REP }],
  inspection_reports: [C('p1', 13400), C('p2', 25000), C('p3', 20000), C('p4', 8000), C('p4b', 8000), C('p4b', 900, 'Change Order'), C('p5', 10000), C('ok', 9000)],
  insurance_claims: [{ id: 'k2', project_id: 'p2', carrier: 'X', approved_rcv: 28375, deductible: 1000, deductible_waived: false },
                     { id: 'k3', project_id: 'p3', carrier: 'X', approved_rcv: 20000, deductible: 5000, deductible_waived: false }],
  insurance_payments: [],
  collections: [{ id: 'col3', project_id: 'p3', amount: 15000, collected_at: ago(3).slice(0, 10), created_at: ago(3), type: 'other' },
                { id: 'colp1', project_id: 'p1', amount: 1000, collected_at: ago(3).slice(0, 10), created_at: ago(3), type: 'deposit' }],
  punch_items: [{ id: 'pu4', project_id: 'p4', title: 'Fascia', detail: 'Extend the soffit, build-out on the front gable', status: 'open', kind: 'punch', created_at: ago(5) },
                { id: 'pu4b', project_id: 'p4b', title: 'Fascia', detail: 'Extend the soffit, build-out on the front gable', status: 'open', kind: 'punch', created_at: ago(5) }],
  owner_reviews: [], owner_review_rules: [], document_versions: [], appointments: [], commissions: [], contracts: [] });
const WANT = { p1: 'price_drop', p2: 'below_ins', p3: 'ded_uncollected', p4: 'extra_no_co', p5: 'done_unpaid', p6: 'invoiced_no_price' };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

async function boot(as, light, SEED){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.type() === 'prompt' ? d.accept('Price check') : d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(([seed, as, light]) => {
    window.__SEED__ = JSON.parse(JSON.stringify(seed)); if (as) window.__AS__ = { email: as, name: as.split('@')[0] };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
  await page.waitForTimeout(900);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.waitForTimeout(500); await settle(page);
  return { ctx, page };
}


const autoRows = page => page.evaluate(() => (window.__WRITES__ || []).filter(x => x.table === 'owner_reviews' && x.op === 'insert' && x.payload && x.payload.source === 'auto').map(x => x.payload.project_id + ':' + x.payload.rule));
try {
  let { ctx, page } = await boot(null, false, base());
  await page.evaluate(async () => { try { await window.CardinalOwnerReview.open(); } catch (e) {} await new Promise(r => setTimeout(r, 2500)); });
  const A = await autoRows(page);
  const exp = Object.keys(WANT).map(k => k + ':' + WANT[k]).sort();
  const got = A.slice().sort();
  const shown = await page.evaluate(() => { const v = document.getElementById('cr-orv-view'); return { cards: v ? v.querySelectorAll('[data-orv-open]').length : 0, togs: v ? [...v.querySelectorAll('[data-orv-rule]')].map(b => b.getAttribute('aria-pressed') + ':' + Math.round(b.getBoundingClientRect().height)) : [] }; });
  ok(JSON.stringify(got) === JSON.stringify(exp), 'A  the six seeded problems are each flagged once with the right rule; the clean jobs (one with a signed change order) are not', JSON.stringify({ got, exp }));
  ok(shown.cards >= 6 && shown.togs.length === 6 && shown.togs.every(t => /^true:(4[4-9]|[5-9]\d)$/.test(t)), 'A2 the list shows the flags and six switches, all On, each 44px+', JSON.stringify(shown));
  const B = await page.evaluate(async () => { await (window.CardinalOwnerReview && window.CardinalOwnerReview.runRules ? window.CardinalOwnerReview.runRules() : null); await new Promise(r => setTimeout(r, 800)); return 0; }).then(() => autoRows(page));
  ok(B.length === A.length && A.length > 0, 'B  running the rules again adds nothing', JSON.stringify({ before: A.length, after: B.length }));
  const C = await page.evaluate(async () => {
    const card = [...document.querySelectorAll('#cr-orv-view [data-orv-open]')].find(b => /no price/i.test(b.textContent || ''));
    if (card) card.click(); await new Promise(r => setTimeout(r, 1200));
    const d = document.querySelector('[data-orv-dismiss]'); if (d) d.click(); await new Promise(r => setTimeout(r, 900));
    const up = (window.__WRITES__ || []).filter(x => x.table === 'owner_reviews' && x.op === 'update' && x.payload && x.payload.status === 'dismissed').length;
    /* the dismissed row stays in the table, so a rerun must not insert p6 again */
    await (window.CardinalOwnerReview && window.CardinalOwnerReview.runRules ? window.CardinalOwnerReview.runRules() : null); await new Promise(r => setTimeout(r, 800));
    return { button: !!d, up };
  });
  const C2 = await autoRows(page);
  ok(C.button && C.up === 1 && C2.filter(x => x === 'p6:invoiced_no_price').length === 1, 'C  Dismiss on an automatic flag saves, and the next run does not bring it back', JSON.stringify({ C, p6: C2.filter(x => /^p6:/.test(x)).length }));
  const D1 = await page.evaluate(async () => {
    const back = document.querySelector('[data-orv-list]'); if (back) back.click(); await new Promise(r => setTimeout(r, 600));
    const t = document.querySelector('[data-orv-rule="done_unpaid"]'); if (t) t.click(); await new Promise(r => setTimeout(r, 900));
    const w = (window.__WRITES__ || []).filter(x => x.table === 'owner_review_rules');
    const t2 = document.querySelector('[data-orv-rule="done_unpaid"]');
    return { wrote: w.some(x => x.payload && x.payload.rule === 'done_unpaid' && x.payload.enabled === false), off: !!t2 && t2.getAttribute('aria-pressed') === 'false' && /Off/.test(t2.textContent) };
  });
  await ctx.close();
  const seedOff = base(); seedOff.owner_review_rules = [{ rule: 'invoiced_no_price', enabled: false }];
  ({ ctx, page } = await boot(null, false, seedOff));
  await page.evaluate(async () => { try { await window.CardinalOwnerReview.open(); } catch (e) {} await new Promise(r => setTimeout(r, 2500)); });
  const D2 = await autoRows(page);
  ok(D1.wrote && D1.off && D2.length === 5 && !D2.some(x => /invoiced_no_price/.test(x)), 'D  a rule switched off does not fire, and the switch writes owner_review_rules', JSON.stringify({ D1, D2 }));
  await ctx.close();
  ({ ctx, page } = await boot(REP, false, base()));
  const E = await page.evaluate(async () => {
    let n = null; try { n = await (window.CardinalOwnerReview && window.CardinalOwnerReview.runRules ? window.CardinalOwnerReview.runRules() : null); } catch (e) {}
    await new Promise(r => setTimeout(r, 800));
    const w = (window.__WRITES__ || []).filter(x => /^owner_review/.test(x.table)).length;
    const rd = (window.__READS__ || []).filter(x => x && /^owner_review/.test(x.table)).length;
    return { n, w, rd };
  });
  ok(E.n === 0 && E.w === 0 && E.rd === 0, 'E  a sales rep: the rules write nothing and read nothing', JSON.stringify(E));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1325: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
