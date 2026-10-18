/* gate_1367 — invoicing audit D6 + D11.
 *   A  Community's bids table, unfiltered, is "All estimates" with every job counted
 *   B  the Partner A/R tile lands on a table titled "Invoiced jobs" counting only what it shows
 *   C  a pipeline bucket lands titled by its stage(s); Clear goes back to "All estimates"
 *   D  making an invoice says so with the green (ok) message, not the red error kind
 * Arg: [index.html] -> negative control (1366: must go RED, not crash). */
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
    P('cm1', 'Invoiced', { t_Invoiced: ago(5), bid: { awarded_amount: 12000, awarded_at: '2026-09-01' } }, 'community'),
    P('cm2', 'Prospect', { bid: { amount: 8000 } }, 'community'), P('cm3', 'Approved', { bid: { awarded_amount: 9000, awarded_at: '2026-09-02' } }, 'community')],
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


const TITLE = p => p.evaluate(() => { const f = document.querySelector('#cr-ch2 [data-fold="allbids"]'); if (!f) return null;
  const b = f.querySelector('.cc-fh b'), c = f.querySelector('.cc-fh .cc-cnt');
  return { t: b ? b.textContent.trim() : '', n: c ? c.textContent.trim() : '', rows: f.querySelectorAll('tr[data-open]').length }; });
{
  const { ctx, page } = await boot();
  let t = await TITLE(page);
  ok(t && t.t === 'All estimates' && t.n === '3', 'A: unfiltered, the table is All estimates with all 3 Community jobs', JSON.stringify(t));
  const ar = await page.evaluate(() => { const e = document.querySelector('#cr-ch2 [data-ccar]'); if (!e) return false; e.click(); return true; });
  await page.waitForTimeout(700);
  t = await TITLE(page);
  ok(ar && t && /^Invoiced jobs$/.test(t.t) && t.n === String(t.rows) && t.rows === 1, 'B: Partner A/R lands on "Invoiced jobs" counting the 1 it shows', JSON.stringify({ ar, t }));
  const pb = await page.evaluate(() => { const e = [...document.querySelectorAll('#cr-ch2 [data-ccpipe]')].find(x => !/invoic/i.test(x.getAttribute('aria-label') || '')); if (!e) return null; e.click(); return e.getAttribute('aria-label'); });
  await page.waitForTimeout(700);
  t = await TITLE(page);
  ok(pb && t && / jobs$/.test(t.t) && t.t !== 'Invoiced jobs' && t.n === String(t.rows), 'C: a pipeline bucket lands titled by its stage', JSON.stringify({ pb, t }));
  const cleared = await page.evaluate(() => { const f = document.querySelector('#cr-ch2 [data-fold="allbids"]'); const b = document.querySelector('#cr-ch2 [data-ch="clear"]'); if (!b) return false; b.click(); return true; });
  await page.waitForTimeout(700);
  t = await TITLE(page);
  ok(cleared && t && t.t === 'All estimates' && t.n === '3', 'C: Clear goes back to All estimates', JSON.stringify({ cleared, t }));
  await ctx.close();
}
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(async () => {
    const got = []; window.crToastOk = m => { got.push(['ok', m]); return null; }; window.crToastErr = m => { got.push(['err', m]); return null; };
    const pr = (window.cacheProjects || []).find(p => p.id === 'r2'); if (!pr || typeof window.createInvoiceFor !== 'function') return { err: 'no project/fn' };
    try { window.currentProject = pr; await window.createInvoiceFor(pr); } catch (e) { got.push(['threw', e.message]); }
    await new Promise(r => setTimeout(r, 800));
    return { got };
  });
  const ready = (r.got || []).filter(g => /is ready/.test(g[1]));
  ok(ready.length === 1 && ready[0][0] === 'ok', 'D: "Invoice … is ready" is the green ok message', JSON.stringify(r));
  await ctx.close();
}
await browser.close();
console.log(fail ? 'GATE 1367 RED — ' + fail + ' failing' : 'GATE 1367 GREEN (' + pass + ')');
process.exit(fail ? 1 : 0);
