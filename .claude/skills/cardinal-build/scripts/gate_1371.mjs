/* gate_1371 — the invoiced dates too (Theo: "Fix the invoiced dates too").
 *   A  Invoices & Payments ages a migrated job with only import-noon stamps and no invoice doc from its own start
 *      (150 days → 31+), not "2 days"
 *   B  a real sent invoice still ages from its sent date; a normal job from its real t_Invoiced
 *   C  Reports' stage date skips an import-noon stamp
 * Arg: [index.html] -> negative control (1370: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
const ago = d => new Date(Date.now() - d * 86400000).toISOString();
const day = d => ago(d).slice(0, 10);
const P = (id, ckx) => ({ id, name: 'Client ' + id, stage: 'Invoiced', address: '1 Main St', phone: '', email: '',
  checklist: JSON.stringify(Object.assign({ lead: { claim_type: 'retail' } }, ckx || {})), created_at: '2026-06-01T12:00:00Z', updated_at: new Date().toISOString() });
const IMP = '2026-10-16', NOON = IMP + 'T12:00:00Z';
const PP = (id, ckx, created) => ({ id, name: 'Client ' + id, stage: 'Invoiced', address: '1 Main St', phone: '', email: '', sales_rep: 'rep@cardinalrenovations.net',
  checklist: JSON.stringify(Object.assign({ lead: { claim_type: 'retail' } }, ckx)), created_at: created, updated_at: new Date().toISOString() });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [PP('mig', { acculynx_import: IMP, t_Invoiced: NOON, stage_since: NOON, manual_value: 8000 }, ago(150)),
             PP('nrm', { t_Invoiced: ago(20), stage_since: ago(20), manual_value: 6000 }, ago(60)),
             PP('snt', { t_Invoiced: ago(3), stage_since: ago(3), manual_value: 4000 }, ago(90))],
  inspection_reports: [{ id: 'isnt', project_id: 'snt', title: 'Invoice — Client snt', total: 4000, html: '<p>i</p>', status: 'sent', sent_at: ago(40), created_at: ago(41), updated_at: ago(40) }],
  collections: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
async function boot(as, light){
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
  await page.addInitScript(([seed, as, light]) => {
    window.__SEED__ = JSON.parse(JSON.stringify(seed)); if (as) window.__AS__ = { email: as, name: 'Curtis' };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.evaluate(() => { try { window.CardinalHeader.goHome(); } catch (_) {} });
  await page.waitForTimeout(1200); await settle(page);
  return { ctx, page };
}



{
  const { ctx, page } = await boot();
  const r = await page.evaluate(() => { const A = window.CardinalAR; if (!A || !A.age) return null; const P = id => window.cacheProjects.find(p => p.id === id);
    const out = {}; ['mig', 'nrm', 'snt'].forEach(id => { const a = A.age(P(id)); out[id] = { age: a, bucket: A.bucketOf ? A.bucketOf(a) : null }; });
    try { const d = rptStageDate(P('mig'), 'Invoiced'); out.rpt = d ? d.toISOString() : null; } catch (e) { out.rpt = 'ERR ' + e.message; }
    return out; });
  ok(r && r.mig.age >= 149 && r.mig.age <= 151, 'A: a migrated job with no real invoice date ages from its start (150 days), not 2', JSON.stringify(r && r.mig));
  ok(r && r.nrm.age >= 19 && r.nrm.age <= 21, 'B: a normal job still ages from its real invoiced date (20)', JSON.stringify(r && r.nrm));
  ok(r && r.snt.age >= 39 && r.snt.age <= 41, 'B: a sent invoice still ages from its sent date (40)', JSON.stringify(r && r.snt));
  ok(r && r.rpt === null, 'C: Reports skip the import-noon invoiced stamp', JSON.stringify(r && r.rpt));
  await ctx.close();
}
await browser.close();
console.log(fail ? 'GATE 1371 RED — ' + fail + ' failing' : 'GATE 1371 GREEN (' + pass + ')');
process.exit(fail ? 1 : 0);
