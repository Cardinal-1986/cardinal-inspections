/* gate_1316 — one A/R list.
 *   A  Invoices & AR total = every job that owes: Invoiced, Closed, or invoice sent; Lost and
 *      unbilled excluded; a Community bid-only job owes bid − paid  →  $40,000 exactly
 *   B  a finished, never-invoiced job sits in "Ready to invoice" ($14,800) with Create invoice,
 *      and is not in the outstanding total
 *   C  groups run oldest first: Ready, 31+, 15–30, 0–14; a job invoiced 30 days ago is 15–30
 *   D  age runs from the SENT date (an invoice sent 40 days ago, stage moved 3 days ago → 40)
 *   E  the home card, on the retail board, totals the same rules ($34,000) in 0–14 / 15–30 / 31+
 *   F  Community's Partner A/R reads $6,000 for the Habitat job ($12,000 awarded, $6,000 paid)
 * Arg: [index.html] -> negative control (1315: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SHOT = process.env.SHOT || '';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
const ago = d => new Date(Date.now() - d * 86400000).toISOString();
const P = (id, stage, ckx, crm) => ({ id, name: 'Client ' + id, stage, address: '1 Main St', phone: '', email: '',
  checklist: JSON.stringify(Object.assign({ lead: Object.assign({ claim_type: crm || 'retail' }, crm === 'community' ? { partner_name: 'Habitat for Humanity of Greater Dayton' } : {}) }, ckx || {})),
  created_at: '2026-08-01T12:00:00Z', updated_at: new Date().toISOString() });
const C = (pid, total) => ({ id: 'c' + pid, project_id: pid, title: 'Contract — Client ' + pid, total, signed_at: '2026-08-01T12:00:00Z', html: '<p>x</p>', status: 'signed', created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' });
const I = (pid, sentDays) => ({ id: 'i' + pid, project_id: pid, title: 'Invoice — Client ' + pid, total: 1, html: '<p>i</p>', status: 'sent', sent_at: ago(sentDays), share_token: 'aaaaaaaa-bbbb-cccc-dddd-' + ('000000000000' + pid).slice(-12), created_at: ago(sentDays), updated_at: ago(sentDays) });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [
    P('r1', 'Invoiced', { t_Invoiced: ago(40) }), P('r2', 'Completed'), P('r3', 'Closed', { t_Invoiced: ago(70) }),
    P('r4', 'Lost'), P('r5', 'Completed'), P('r6', 'Invoiced', { t_Invoiced: ago(3) }), P('r7', 'Invoiced'),
    P('cm1', 'Invoiced', { t_Invoiced: ago(5), bid: { awarded_amount: 12000, awarded_at: '2026-09-01' } }, 'community')],
  inspection_reports: [C('r1', 20000), I('r1', 40), C('r2', 14800), C('r3', 3000), C('r4', 9000), C('r5', 10000), I('r5', 20),
    C('r6', 4000), I('r6', 40), C('r7', 2000), I('r7', 30)],
  collections: [{ id: 'k1', project_id: 'r1', amount: 5000, collected_at: '2026-09-10', created_at: '2026-09-10T12:00:00Z', type: 'deposit' },
                { id: 'k2', project_id: 'cm1', amount: 6000, collected_at: '2026-09-20', created_at: '2026-09-20T12:00:00Z', type: 'deposit' }],
  appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
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
  await page.evaluate(() => { try { window.CardinalFrontDoor.open(); } catch (_) {} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const r = document.querySelector('#cr-fd .fdrow[data-fd="community"]'); if (r) r.click(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const h = window.CardinalCommunityHub; if (h && h.show) h.show(); });
  await page.waitForTimeout(1200); await settle(page);
  return { ctx, page };
}

async function shot(page, path, h){
  try { const c = await page.context().newCDPSession(page);
    const r = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h || 2400, scale: 1 } });
    fs.writeFileSync(path, Buffer.from(r.data, 'base64')); } catch (e) { console.log('  (screenshot skipped)'); }
}
try {
  let { ctx, page } = await boot(null, false);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.waitForTimeout(600);
  const home = await page.evaluate(() => {
    const was = document.body.dataset.crm; document.body.dataset.crm = 'retail';   /* the rig lands on whichever board it last saw */
    try { if (typeof renderOps === 'function') renderOps(); } catch (e) {}
    const crmWas = was;
    const w = document.getElementById('arWrap');
    return w ? { crmWas, big: (w.querySelector('.arbig') || {}).textContent || '', txt: w.textContent.replace(/\s+/g, ' ') } : null;
  });
  const ar = await page.evaluate(async () => {
    window.CardinalAR.open(); await new Promise(r => setTimeout(r, 900));
    const v = document.getElementById('cr-ar-view');
    const grps = [...v.querySelectorAll('.crar-grp')].map(g => ({ h: (g.querySelector('.crar-grphd b') || {}).textContent || '', sub: (g.querySelector('.crar-sub') || {}).textContent || '',
      rows: [...g.querySelectorAll('.crar-row')].map(r => ({ nm: (r.querySelector('.crar-nm') || {}).textContent || '', mk: !!r.querySelector('[data-armkinv]'), age: (r.querySelector('.crar-age') || {}).textContent || '' })) }));
    return { out: (document.getElementById('crarKpiOut') || {}).textContent || '', grps };
  });
  if (SHOT) await shot(page, SHOT + '_ar.png');
  await ctx.close();
  const names = g => g.rows.map(r => r.nm.replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' '));
  ok(/\$40,000/.test(ar.out), 'A  outstanding = $40,000 (r1 15k + r3 Closed 3k + r5 sent 10k + r6 4k + r7 2k + Habitat 6k)', ar.out);
  const all = ar.grps.flatMap(names);
  ok(!all.includes('Client r4'), 'A  the Lost job is not owed', JSON.stringify(all));
  const rg = ar.grps.find(g => /ready/i.test(g.h));
  ok(rg && names(rg).join() === 'Client r2' && rg.rows[0].mk && /14,800/.test(rg.sub), 'B  Ready to invoice: the finished, unbilled job, $14,800, with Create invoice', JSON.stringify(rg));
  const order = ar.grps.map(g => g.h);
  ok(/ready/i.test(order[0]) && /31\+/.test(order[1]) && /15/.test(order[2]) && /0/.test(order[3] || ''), 'C  oldest first: Ready, 31+, 15–30, 0–14', JSON.stringify(order));
  const g15 = ar.grps.find(g => /^15/.test(g.h));
  ok(g15 && names(g15).includes('Client r7') && names(g15).includes('Client r5'), 'C  a job invoiced 30 days ago is in 15–30 (and the 20-day one too)', JSON.stringify(g15 && names(g15)));
  const g31 = ar.grps.find(g => /31\+/.test(g.h));
  ok(g31 && names(g31).includes('Client r6') && names(g31).includes('Client r3'), 'D  sent 40 days ago, stage moved 3 days ago → 31+; the Closed job is listed too', JSON.stringify(g31 && names(g31)));
  ok(home && /\$34,000/.test(home.big) && /0–14/.test(home.txt) && /31\+/.test(home.txt), 'E  home card on the retail board: $34,000 in 0–14 / 15–30 / 31+', JSON.stringify(home).slice(0, 300));

  ({ ctx, page } = await boot(null, false));
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.evaluate(() => { try { window.CardinalFrontDoor.open(); } catch (_) {} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const r = document.querySelector('#cr-fd .fdrow[data-fd="community"]'); if (r) r.click(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const h = window.CardinalCommunityHub; if (h && h.show) h.show(); });
  await page.waitForTimeout(1500); await settle(page);
  const cc = await page.evaluate(() => { const b = document.querySelector('#cr-ch2 .cc-arbig'); return b ? b.textContent.trim() : null; });
  if (SHOT) await shot(page, SHOT + '_cc.png', 1400);
  await ctx.close();
  ok(cc === '$6,000', 'F  Partner A/R: $6,000 for Habitat ($12,000 awarded − $6,000 paid)', cc);
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.stack).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1316: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
