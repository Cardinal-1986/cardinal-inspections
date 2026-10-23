/* gate_1394 — Record payment asks who paid.
 *   A  Payments card: Production sees no Gross profit / Margin / cost bar; the admin does, and with no
 *      costs entered reads "None entered" / "—" rather than "Margin 100.0%"
 *   B  error reporter keeps :line:col when the frame URL carries a query string
 *   C  phone drawer header shows the signed-in user, not "Cardinal"
 *   D  home AR card: nothing owed on this board but money owed elsewhere -> says so
 *   E  activity feed names an invoice an invoice
 *   F  a signed document hides "Mark sent"
 *   G  the Pre-Install Guide prompt no longer calls the non-existent patchProject()
 * Arg: [index.html] -> negative control (1393 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = "") => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const iso = d => new Date(Date.now() + d * 86400000).toISOString();
const P = (id, stage, type) => ({ id, name: 'Sample Client ' + id, stage, address: '1 Main St', checklist: JSON.stringify({ lead: { claim_type: type } }), created_at: iso(-30), updated_at: iso(-30) });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }, { email: 'rep@cardinalrenovations.net', name: 'Sample Rep', role: 'production' }],
  projects: [P('j1', 'Approved', 'retail'), P('j2', 'Invoiced', 'insurance'), P('j3', 'Approved', 'community')],
  inspection_reports: [
    { id: 'c1', project_id: 'j1', title: 'Contract — Sample Client j1', total: 10000, signed_at: iso(-5), status: 'draft', html: '<p>x</p>', created_at: iso(-6), updated_at: iso(-5) },
    { id: 'c2', project_id: 'j2', title: 'Contract — Sample Client j2', total: 8000, signed_at: iso(-20), status: 'draft', html: '<p>x</p>', created_at: iso(-21), updated_at: iso(-20) },
    { id: 'i2', project_id: 'j2', title: 'Invoice — Sample Client j2', total: 8000, status: 'sent', sent_at: iso(-3), html: '<p>i</p>', share_token: 'aaaaaaaa-bbbb-cccc-dddd-000000000002', created_at: iso(-1), updated_at: iso(-1) }],
  collections: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [], job_costs: [], crew_payments: [], draws: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function boot(as){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
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
  await page.addInitScript(([seed, as]) => { window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: 'Sample Rep' }; }, [SEED, as]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page); await page.waitForTimeout(1500); await settle(page);
  return { ctx, page };
}

const open = (page, id) => page.evaluate(async id => {
  try { window.CardinalFrontDoor.close(); } catch (_) {}
  window.CardinalAR.recordPayment(prById ? prById(id) : null);
}, id);
try {
  const { ctx, page } = await boot(null);
  const r = await page.evaluate(async () => {
    const pr = id => (window.cacheProjects || []).find(p => p.id === id);
    const st = () => { const w = document.getElementById('crpay-paywrap'); const rc = document.getElementById('crpay-receipt');
      return { shown: !!w && !w.hidden, who: (document.getElementById('crpay-payer') || { getAttribute(){ return null; } }).getAttribute('data-v'),
               rcpt: rc ? getComputedStyle(rc.closest('label')).display !== 'none' && rc.checked : null,
               label: (document.querySelector('#crpay-payer [data-p]:not([data-p="homeowner"])') || {}).textContent || '',
               amt: document.getElementById('crpay-amt').value,
               rows: (() => { const m = document.getElementById('crpay-method'); const t = [...m.children].map(b => b.getBoundingClientRect().top); return new Set(t.map(Math.round)).size; })() }; };
    const save = async () => { const n = (window.__WRITES__ || []).length; document.getElementById('crpay-save').click(); await new Promise(r => setTimeout(r, 900));
      try { const y = document.querySelector('[data-crask-yes], .cr-ask-yes'); if (y) { y.click(); await new Promise(r => setTimeout(r, 900)); } } catch (_) {}
      return (window.__WRITES__ || []).slice(n).filter(w => w.table === 'collections').map(w => w.payload && (Array.isArray(w.payload) ? w.payload[0] : w.payload)); };
    const out = {};
    window.CardinalAR.recordPayment(pr('j2')); await new Promise(r => setTimeout(r, 700)); out.ins = st();
    document.querySelector('#crpay-payer [data-p="homeowner"]')?.click(); out.insHome = st();
    document.querySelector('#crpay-payer [data-p="insurance"]')?.click();
    out.insRow = await save();
    window.CardinalAR.recordPayment(pr('j3')); await new Promise(r => setTimeout(r, 700)); out.com = st();
    document.getElementById('crpay-cancel').click();
    window.CardinalAR.recordPayment(pr('j1')); await new Promise(r => setTimeout(r, 900)); out.ret = st();
    out.retRow = await save();
    return out;
  });
  ok(r.ins.shown && r.ins.who === 'insurance' && r.ins.label === 'Insurance', 'A  insurance job asks Paid by, opens on Insurance', JSON.stringify(r.ins));
  ok(r.ins.rcpt === false && r.insHome.rcpt === true, 'A  receipt offered only when the homeowner paid', JSON.stringify([r.ins.rcpt, r.insHome.rcpt]));
  ok(r.insRow[0] && r.insRow[0].source === 'insurance', 'A  the carrier check is recorded as insurance', JSON.stringify(r.insRow));
  ok(r.com.shown && r.com.who === 'partner' && r.com.label === 'Partner', 'B  Community job: Partner / Homeowner, opens on Partner', JSON.stringify(r.com));
  ok(!r.ret.shown && r.ret.rcpt === true, 'C  retail: no question, receipt on', JSON.stringify(r.ret));
  ok(r.retRow[0] && r.retRow[0].source === 'homeowner', 'C  retail payment recorded as homeowner', JSON.stringify(r.retRow));
  ok(r.ret.rows === 1, 'D  four methods sit on one row', 'rows ' + r.ret.rows);
  await ctx.close();
} finally { await browser.close(); }
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
