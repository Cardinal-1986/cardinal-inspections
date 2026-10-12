/* gate_1319 — the Invoices list, Theo's pick 1 (rows with the action showing).
 *   A  one line on top ("$X owed", "overdue", "paid this month"), not three tiles
 *   B  every row shows exactly two controls — the next action and a ⋯ — never two red
 *   C  the action follows the job: Create invoice (finished, not billed) · Send (invoice not out)
 *      · Remind (out, 31+ days) · Record payment, outline (out, not overdue)
 *   D  ⋯ opens the rest, with aria-expanded
 *   E  at 390px every control is ≥44px and the actions stay on one line
 * Arg: [index.html] -> negative control (1318: must go RED, not crash). */
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
    P('r8', 'Invoiced', { t_Invoiced: ago(2) })],
  inspection_reports: [C('r1', 20000), I('r1', 40), C('r2', 14800), C('r3', 3000), C('r4', 9000), C('r5', 10000), I('r5', 20),
    C('r6', 4000), I('r6', 40), C('r7', 2000), I('r7', 30), C('r8', 6000), Object.assign(I('r8', 2), { status: 'draft', sent_at: null })],
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
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.waitForTimeout(600); await settle(page);
  return { ctx, page };
}

async function shot(page, path, h){
  try { const c = await page.context().newCDPSession(page);
    const r = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h || 2400, scale: 1 } });
    fs.writeFileSync(path, Buffer.from(r.data, 'base64')); } catch (e) { console.log('  (screenshot skipped)'); }
}

async function readAR(page){
  return page.evaluate(async () => {
    window.CardinalAR.open(); await new Promise(r => setTimeout(r, 900));
    const v = document.getElementById('cr-ar-view');
    const kpi = v.querySelector('.crar-kpi');
    const rows = [...v.querySelectorAll('.crar-row')].map(r => {
      const nm = ((r.querySelector('.crar-nm') || {}).textContent || '').trim().split(/\s+/).slice(0, 2).join(' ');
      const acts = r.querySelector('.crar-acts');
      const vis = acts ? [...acts.querySelectorAll('button')].filter(b => b.getBoundingClientRect().height) : [];
      const prim = vis.filter(b => b.classList.contains('primary'));
      const menu = r.querySelector('[data-armenu]');
      return { nm, nVis: vis.length, nPrim: prim.length, main: vis[0] ? vis[0].textContent.trim() : '', mainPrim: !!(vis[0] && vis[0].classList.contains('primary')),
        more: !!r.querySelector('[data-armore]'), menuHidden: !!(menu && menu.hidden), rem: !!r.querySelector('[data-remfor]'),
        actsH: acts ? Math.round(acts.getBoundingClientRect().height) : 0, minH: vis.length ? Math.min(...vis.map(b => Math.round(b.getBoundingClientRect().height))) : 0 };
    });
    return { kpiTxt: kpi ? kpi.textContent.replace(/\s+/g, ' ').trim() : '', tiles: v.querySelectorAll('.crar-kpi').length, line: !!v.querySelector('.crar-kline #crarKpiOver'), rows };
  });
}
try {
  let { ctx, page } = await boot(null, false);
  const a = await readAR(page);
  if (SHOT) await shot(page, SHOT + '_ar.png', 1600);
  const t = await page.evaluate(async () => {
    const b = document.querySelector('#cr-ar-view [data-armore]'); if (!b) return null;
    const m = document.querySelector('#cr-ar-view [data-armenu="' + b.getAttribute('data-armore') + '"]');
    const before = m.hidden; b.click(); await new Promise(r => setTimeout(r, 150));
    const vis = [...m.querySelectorAll('button')].filter(x => x.getBoundingClientRect().height).map(x => x.textContent.trim());
    return { before, after: m.hidden, exp: b.getAttribute('aria-expanded'), vis };
  });
  if (SHOT) await shot(page, SHOT + '_menu.png', 1600);
  await ctx.close();
  const R = n => a.rows.find(r => r.nm === n) || {};
  ok(a.tiles === 1 && a.line && /owed/.test(a.kpiTxt) && /overdue/.test(a.kpiTxt) && /paid this month/.test(a.kpiTxt) && !/--/.test(a.kpiTxt), 'A  one line on top: "$X owed · $Y overdue · $Z paid this month"', a.kpiTxt + ' · tiles ' + a.tiles);
  ok(a.rows.length >= 5 && a.rows.every(r => r.nVis === 2 && r.nPrim <= 1 && r.more), 'B  every row shows two controls — one action and a ⋯ — and never two red', JSON.stringify(a.rows.map(r => [r.nm, r.nVis, r.nPrim])));
  ok(R('Client r2').mainPrim && /Create invoice/.test(R('Client r2').main) && !R('Client r2').rem, 'C1 finished, not billed → red Create invoice, no reminder strip', JSON.stringify(R('Client r2')));
  ok(R('Client r8').mainPrim && /^Send/.test(R('Client r8').main), 'C2 invoice not out yet → red Send', JSON.stringify(R('Client r8')));
  ok(R('Client r1').mainPrim && /Remind/.test(R('Client r1').main), 'C3 out and 31+ days → red Remind', JSON.stringify(R('Client r1')));
  ok(!R('Client r5').mainPrim && /Record payment/.test(R('Client r5').main), 'C4 out, not overdue → Record payment, outline (nothing urgent)', JSON.stringify(R('Client r5')));
  ok(t && t.before === true && t.after === false && t.exp === 'true' && t.vis.some(x => /Open job/.test(x)), 'D  ⋯ opens the rest (and says so to a screen reader)', JSON.stringify(t));
  ok(a.rows.every(r => r.minH >= 44 && r.actsH < 60), 'E  at 390px every control is ≥44px and the actions stay on one line', JSON.stringify(a.rows.map(r => [r.nm, r.minH, r.actsH])));
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1319: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
