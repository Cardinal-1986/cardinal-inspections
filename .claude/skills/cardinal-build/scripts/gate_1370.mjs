/* gate_1370 — the AccuLynx import stamped stages with no history as the import day at 12:00:00Z; those are not dates.
 *   A  Activity Count: a migrated job approved / invoiced / closed "on" the import noon counts 0; a real app stamp
 *      the same day (16:12) still counts; a non-migrated job approved this week counts
 *   B  a migrated lead with a noon t_Lead counts by its created_at (AccuLynx's own date): old → not a new lead
 *   C  the shared rule drops only an import-noon stamp on a migrated job; Sales Numbers reads it for stamps and stage_since
 * Arg: [index.html] -> negative control (1369: must go RED). */
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
const PP = (id, stage, ckx, created) => ({ id, name: 'Client ' + id, stage, address: '1 Main St', phone: '', email: '', sales_rep: 'rep@cardinalrenovations.net',
  checklist: JSON.stringify(Object.assign({ lead: { claim_type: 'retail' } }, ckx)), created_at: created || '2026-03-01T12:00:00Z', updated_at: new Date().toISOString() });
const C = (pid, total) => ({ id: 'c' + pid, project_id: pid, title: 'Contract — Client ' + pid, total, signed_at: null, html: '<p>x</p>', status: 'draft', created_at: '2026-03-01T12:00:00Z', updated_at: '2026-03-01T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
                  { email: 'rep@cardinalrenovations.net', name: 'Sample Rep', role: 'sales' }],
  projects: [
    PP('mA', 'Closed', { acculynx_import: IMP, t_Lead: NOON, t_Approved: NOON, t_Invoiced: NOON, t_Closed: NOON, stage_since: NOON, manual_value: 9000 }),   // all fake
    PP('mB', 'Closed', { acculynx_import: IMP, t_Approved: NOON, t_Closed: IMP + 'T16:12:04.681Z', stage_since: IMP + 'T16:12:04.681Z', manual_value: 7000 }), // closed for real in the app
    PP('nC', 'Approved', { t_Lead: ago(10), t_Approved: ago(3), stage_since: ago(3), manual_value: 5000 }, ago(10))   // a normal job
  ],
  collections: [], inspection_reports: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
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
  const t = await page.evaluate(() => { const o = {}; document.querySelectorAll('#actStrip .actbox').forEach(b => { o[b.querySelector('span').textContent.replace(/\s+/g, ' ').trim()] = b.querySelector('b').firstChild.textContent.trim(); }); return o; });
  ok(t['JobsApproved'] === '1', 'A: approved counts only the real one (the import-noon approvals do not)', JSON.stringify(t));
  ok(t['JobsInvoiced'] === '0', 'A: an import-noon invoice does not count', JSON.stringify(t));
  ok(t['JobsClosed'] === '1', 'A: the closing moved in the app at 16:12 still counts; the noon one does not', JSON.stringify(t));
  ok(t['NewLeads'] === '1', 'B: a migrated lead stamped at the import noon counts by its own old created date (not new)', JSON.stringify(t));
  const r = await page.evaluate(() => { if (typeof crRealStamp !== 'function') return null;
    const ck = { acculynx_import: '2026-10-16' };
    return { noon: crRealStamp(ck, '2026-10-16T12:00:00Z'), real: crRealStamp(ck, '2026-10-16T16:12:04.681Z'), other: crRealStamp({}, '2026-10-16T12:00:00Z'), none: crRealStamp(ck, null) }; });
  ok(r && r.noon === null && r.real === '2026-10-16T16:12:04.681Z' && r.other === '2026-10-16T12:00:00Z' && r.none === null,
     'C: crRealStamp drops only an import-noon stamp on a migrated job', JSON.stringify(r));
  const src = await page.evaluate(() => [...document.scripts].map(x => x.textContent).join('\n'));
  ok(/function snSoldAt[\s\S]{0,600}snTake\(snReal\(ck, ck\[k\]\)\)[\s\S]{0,300}snReal\(ck, ck\.stage_since\)/.test(src), 'C: Sales Numbers dates a sale through the same rule (stamps and stage_since)');
  await ctx.close();
}
await browser.close();
console.log(fail ? 'GATE 1370 RED — ' + fail + ' failing' : 'GATE 1370 GREEN (' + pass + ')');
process.exit(fail ? 1 : 0);
