/* gate_1392 — the audit's no-decision technical fixes.
 *   A  Payments card: Production sees no Gross profit / Margin / cost bar; the admin does, and with no
 *      costs entered reads "None entered" / "—" rather than "Margin 100.0%"
 *   B  error reporter keeps :line:col when the frame URL carries a query string
 *   C  phone drawer header shows the signed-in user, not "Cardinal"
 *   D  home AR card: nothing owed on this board but money owed elsewhere -> says so
 *   E  activity feed names an invoice an invoice
 *   F  a signed document hides "Mark sent"
 *   G  the Pre-Install Guide prompt no longer calls the non-existent patchProject()
 * Arg: [index.html] -> negative control (1391 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const iso = d => new Date(Date.now() + d * 86400000).toISOString();
const P = (id, stage, type) => ({ id, name: 'Sample Client ' + id, stage, address: '1 Main St', checklist: JSON.stringify({ lead: { claim_type: type } }), created_at: iso(-30), updated_at: iso(-30) });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }, { email: 'rep@cardinalrenovations.net', name: 'Sample Rep', role: 'production' }],
  projects: [P('j1', 'Approved', 'retail'), P('j2', 'Invoiced', 'insurance')],
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
const payCard = page => page.evaluate(async () => {
  try { window.CardinalFrontDoor.close(); } catch (_) {}
  openProject('j1'); await new Promise(r => setTimeout(r, 2500));
  const c = document.querySelector('#projectView .crjp-card');
  return c ? { txt: c.textContent.replace(/\s+/g, ' '), bar: !!c.querySelector('.crjp-cbar') } : null;
});
try {
  /* admin */
  let { ctx, page } = await boot(null);
  const a = await payCard(page);
  ok(a && /Gross profit/.test(a.txt), 'A  admin sees Gross profit', a && a.txt.slice(0, 120));
  ok(a && !/100\.0%/.test(a.txt) && /None entered/.test(a.txt), 'A  no costs -> no "Margin 100.0%", says None entered', a && a.txt.slice(0, 160));
  const r = await page.evaluate(async () => {
    const out = {};
    const nb = document.getElementById('navBtn'); if (nb) nb.click();
    await new Promise(r => setTimeout(r, 500));
    out.drawer = (document.getElementById('crDrawerUser') || {}).textContent || '';
    if (nb) nb.click();
    document.body.dataset.crm = 'retail';
    try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (_) {}
    try { if (typeof renderActivity === 'function') renderActivity(); } catch (_) {}
    await new Promise(r => setTimeout(r, 600));
    out.ar = ((document.getElementById('arWrap') || {}).textContent || '').replace(/\s+/g, ' ');
    out.act = ((document.getElementById('actFeed') || {}).textContent || '').replace(/\s+/g, ' ');
    await openEditor('c1'); await new Promise(r => setTimeout(r, 1200));
    const t = document.getElementById('toggleStatusBtn');
    out.markSent = t ? getComputedStyle(t).display : 'missing';
    return out;
  });
  ok(r.drawer && r.drawer !== 'Cardinal', 'C  drawer header names the user', JSON.stringify(r.drawer));
  ok(/on the others/.test(r.ar), 'D  AR card points at money owed on the other boards', r.ar.slice(0, 140));
  ok(/new invoice/i.test(r.act), 'E  activity feed says "new invoice"', r.act.slice(0, 160));
  ok(r.markSent === 'none', 'F  signed contract hides Mark sent', r.markSent);
  await ctx.close();
  /* production */
  ({ ctx, page } = await boot('rep@cardinalrenovations.net'));
  await page.evaluate(() => { PRODUCTION_EMAILS.push('rep@cardinalrenovations.net'); });
  const p = await payCard(page);
  ok(p && !/Gross profit|Margin/.test(p.txt) && !p.bar, 'A  Production sees no Gross profit / Margin / cost bar', p && p.txt.slice(0, 160));
  ok(p && /Job total/.test(p.txt), 'A  Production still sees the card (job total, received)');
  await ctx.close();
} finally { await browser.close(); }

/* B — stripQuery, extracted from the shipped file and run */
const m = APP_HTML.match(/function stripQuery\(s\)\{[\s\S]*?\n\}/);
const stripQuery = new Function(m[0] + '; return stripQuery;')();
const fr = '    at HTMLImageElement.onload (https://app.cardinalroster.com/?v=3&x=1:43217:12)';
ok(/:43217:12\)$/.test(stripQuery(fr)) && !/v=3/.test(stripQuery(fr)), 'B  stack frame keeps :line:col, drops the query', stripQuery(fr));
ok(stripQuery('url: /path?token=abc') === 'url: /path', 'B  a plain URL still loses its query', stripQuery('url: /path?token=abc'));
/* G */
ok(!/patchProject\(pr\.id/.test(APP_HTML), 'G  guide prompt no longer calls the missing patchProject()');
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
