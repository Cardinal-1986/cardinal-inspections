/* gate_1322 — Owner Review is admin-only and silent.
 *   A  admin: drawer row + client-page tile   B  flag writes ONE owner_reviews row, opens it, nav key
 *   C  money trail: first estimate + the $1,400 drop in red   D  note saves, resolve saves
 *   E  hideAllViews closes it   F  a sales rep: no row, no tile on his own job, open() does nothing
 * Arg: [index.html] -> negative control (1321: must go RED, not crash). */
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
const REP = 'nick@cardinalrenovations.net';
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }, { email: REP, name: 'Rep', role: 'sales', title: 'Sales' }],
  projects: [P('o1', 'Approved', {}, 'retail')].map(p => Object.assign(p, { sales_rep: REP, created_by: REP })),
  estimates: [{ id: 'e1', project_id: 'o1', title: 'Estimate', total: 14800, subtotal: 14800, discount: 0, created_at: '2026-09-01T12:00:00Z', created_by: REP }],
  inspection_reports: [C('o1', 13400)],
  document_versions: [], collections: [], owner_reviews: [], insurance_claims: [],
  appointments: [], commissions: [], contracts: [], punch_items: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

async function boot(as, light){
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


try {
  let { ctx, page } = await boot(null, false);
  const A = await page.evaluate(async () => {
    document.getElementById('navBtn').click(); await new Promise(r => setTimeout(r, 600));
    /* the drawer folds its sections on a phone, so a row is judged against Invoices & AR beside it */
    const row = document.querySelector('#navMenu .navopt[data-nav="ownerreview"]'), ar = document.querySelector('#navMenu .navopt[data-nav="ar"]');
    const same = !!row && !!ar && row.style.display !== 'none' && getComputedStyle(row).display === getComputedStyle(ar).display;
    document.getElementById('navBtn').click();
    openProject('o1'); await new Promise(r => setTimeout(r, 1200));
    return { row: same, tile: !!document.querySelector('[data-jm="ownerreview"]') };
  });
  ok(A.row && A.tile, 'A  admin: the drawer has Owner Review and the client page has the Owner review tile', JSON.stringify(A));
  const B = await page.evaluate(async () => {
    const t = document.querySelector('[data-jm="ownerreview"]'); if (t) t.click();
    await new Promise(r => setTimeout(r, 2200));
    const v = document.getElementById('cr-orv-view'), txt = v ? v.innerText.replace(/\s+/g, ' ') : '';
    const red = [...document.querySelectorAll('#cr-orv-view .orv-tbl tr.red')].map(r => r.innerText.replace(/\s+/g, ' '));
    const w = (window.__WRITES__ || []).filter(x => x.table === 'owner_reviews');
    return { shown: v && getComputedStyle(v).display === 'block', reason: /Price check/.test(txt), first: /First estimate/.test(txt), red, ins: w.filter(x => x.op === 'insert' && x.payload && x.payload.source === 'manual').length,   /* 1325: opening the review also runs the automatic rules, and this seed IS a $1,400 drop */ nav: history.state && history.state.view };
  });
  ok(B.shown && B.reason && B.ins === 1 && B.nav === 'ownerreview', 'B  flagging from the client page writes one owner_reviews row and opens it', JSON.stringify(B));
  ok(B.first && B.red.some(r => /Drop/.test(r) && /1,400/.test(r)), 'C  the money trail shows the first estimate and the $1,400 drop in red', JSON.stringify(B.red));
  const D = await page.evaluate(async () => {
    const ta = document.getElementById('orvNote'); if (ta) ta.value = 'Ask who changed the price';
    const n = document.querySelector('[data-orv-note]'); if (n) n.click(); await new Promise(r => setTimeout(r, 900));
    const has = /Ask who changed the price/.test((document.getElementById('cr-orv-view') || {}).innerText || '');
    const rs = document.querySelector('[data-orv-resolve]'); if (rs) rs.click(); await new Promise(r => setTimeout(r, 900));
    const up = (window.__WRITES__ || []).filter(x => x.table === 'owner_reviews' && x.op === 'update');
    hideAllViews(); const v = document.getElementById('cr-orv-view');
    return { has, updates: up.length, reopen: !!document.querySelector('[data-orv-reopen]'), closed: !!v && getComputedStyle(v).display === 'none' };
  });
  ok(D.has && D.updates >= 2 && D.reopen, 'D  a note saves and shows; Mark resolved saves and offers Reopen', JSON.stringify(D));
  ok(D.closed, 'E  hideAllViews closes Owner Review');
  await ctx.close();
  ({ ctx, page } = await boot(REP, false));
  const F = await page.evaluate(async () => {
    const row = document.querySelector('#navMenu .navopt[data-nav="ownerreview"]');
    openProject('o1'); await new Promise(r => setTimeout(r, 1200));
    const tile = !!document.querySelector('[data-jm="ownerreview"]');
    try { window.CardinalOwnerReview.open(); } catch (e) {}
    await new Promise(r => setTimeout(r, 600));
    const v = document.getElementById('cr-orv-view');
    const reads = (window.__READS__ || []).filter(x => x && x.table === 'owner_reviews').length;
    return { rowShown: !!row && row.style.display !== 'none', tile, viewShown: v && getComputedStyle(v).display !== 'none', reads };
  });
  ok(!F.rowShown && !F.tile && !F.viewShown, 'F  a sales rep: no drawer row, no tile on his own job, and open() shows nothing', JSON.stringify(F));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1322: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
