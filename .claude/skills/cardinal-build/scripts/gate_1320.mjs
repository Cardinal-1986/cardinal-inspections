/* gate_1320 — the invoice says ONE balance, always the live one (audit D2 / W3).
 *   A  the REAL api/share.js, fed an invoice made before a $5,000 check, shows Balance due
 *      $9,800 — the pay bar's own figure — not the frozen $14,800
 *   B  Paid reads −$5,000 · C  "as of <today>" · D  paid in full says so
 *   E  a failed ledger read keeps the stored figure and says it could not be verified
 *   F  the editor's own writer produces the same summary · G  its card has no 2nd amount
 *   H  owedOn returns total + paid in both twins
 * Args: [index.html] [api/share.js] -> negative control (1319 trio: must go RED, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SHARE = process.argv[3] || '/home/user/cardinal-inspections/api/share.js';
const PAY = (process.argv[3] || '/home/user/cardinal-inspections/api/share.js').replace(/share\.js$/, 'pay.js');
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 170000);
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [], inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
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
    window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: 'Curtis' };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  return { ctx, page };
}

async function shareRender(html, paid, failCollections){
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
  globalThis.fetch = async (url) => {
    const u = String(url); const j = b => ({ ok: true, json: async () => b });
    if (u.includes('share_token=eq.')) return j([{ id: 'inv1', project_id: 'j1', project: 'Dana Test', html, title: 'Invoice — Dana Test', total: 14800, signed_at: null }]);
    if (u.includes('/collections')) return failCollections ? { ok: false, status: 503, json: async () => ({}) } : j(paid ? [{ amount: paid }] : []);
    if (u.includes('/inspection_reports?project_id')) return j([{ title: 'Contract — Dana Test', total: 14800, signed_at: '2026-09-01' }]);
    return j([]);
  };
  const mod = await import(SHARE + '?v=' + Math.random());
  let body = ''; const res = { status() { return this; }, setHeader() {}, send(b) { body = b; }, end(b) { body = b || body; } };
  await mod.default({ query: { t: 'aaaaaaaa-bbbb-cccc-dddd-000000000001' }, headers: {} }, res);
  return body;
}
const cellOf = (h, id) => { const m = new RegExp('id="' + id + '"[^>]*>([\\s\\S]*?)</td>').exec(h); return m ? m[1].replace(/<[^>]+>/g, '').trim() : null; };
try {
  const { ctx, page } = await boot(null, false);
  /* the invoice as the app makes it on the day it is created — nothing paid yet */
  const T = await page.evaluate(() => {
    const pr = { id: 'j1', name: 'Dana Test', address: '1 Main St, Dayton OH', phone: '937-555-0101', email: 'd@example.com', checklist: '{}' };
    let inv = (typeof prefillClientInfo === 'function') ? prefillClientInfo(INVOICE_TEMPLATE, pr) : INVOICE_TEMPLATE;
    inv = inv.replace('[INV_NUM]', '#1-1').replace('[INV_DATE]', 'Oct 1, 2026').replace('[INV_TOTAL]', '$14,800.00').replace('[INV_PAID]', '$0.00').replace('[INV_DUE]', '$14,800.00');
    /* the editor half: the same stale doc, rewritten by the editor's own code */
    let ed = null;
    try {
      const d = document.implementation.createHTMLDocument('inv'); d.documentElement.innerHTML = inv;
      if (typeof invLiveSummary === 'function') invLiveSummary(d, 14800, 5000, 9800);
      ed = { due: (d.getElementById('estTotal') || {}).textContent || '', paid: (d.getElementById('invPaid') || {}).textContent || '', asof: (d.getElementById('invAsOf') || {}).textContent || '' };
    } catch (e) { ed = { err: String(e) }; }
    const src = typeof wireInvoiceLive === 'function' ? wireInvoiceLive.toString() : '';
    return { inv, ed, cardAmt: /cil-amt/.test(src), callsSummary: /invLiveSummary\(doc/.test(src) };
  });
  await ctx.close();
  const A = await shareRender(T.inv, 5000);
  ok(cellOf(A, 'estTotal') === '$9,800.00' && /\$9,800/.test(A.replace(/id="estTotal"[\s\S]*?<\/td>/, '')), 'A  after a $5,000 check the client’s page reads Balance due $9,800.00 — the same figure the pay bar charges', cellOf(A, 'estTotal'));
  ok(!/\$14,800\.00<\/td><\/tr>\s*<\/table>/.test(A) && /−|&#8722;/.test(A) && /5,000\.00/.test(cellOf(A, 'invPaid') || ''), 'B  Paid reads −$5,000.00 and no frozen $14,800 balance is left', cellOf(A, 'invPaid'));
  ok(/as of [A-Z][a-z]{2} \d{1,2}, \d{4}/.test(A), 'C  the balance carries today’s date');
  const P = await shareRender(T.inv, 14800);
  ok(/Paid in full/.test(cellOf(P, 'estTotal') || ''), 'D  paid in full reads "$0.00 · Paid in full"', cellOf(P, 'estTotal'));
  const F = await shareRender(T.inv, 0, true);
  ok(cellOf(F, 'estTotal') === '$14,800.00' && /verif/i.test(F), 'E  an unreadable ledger leaves the stored figure and says it could not be verified', cellOf(F, 'estTotal'));
  ok(T.ed && T.ed.due === '$9,800.00' && /5,000/.test(T.ed.paid) && /as of/.test(T.ed.asof), 'F  the editor writes the same live summary (print and save carry it)', JSON.stringify(T.ed));
  ok(T.callsSummary && !T.cardAmt, 'G  the editor’s card no longer prints a second amount; it calls the summary writer', JSON.stringify({ calls: T.callsSummary, cardAmt: T.cardAmt }));
  const ps = fs.readFileSync(PAY, 'utf8'), ss = fs.readFileSync(SHARE, 'utf8');
  ok(/totalCents: Math\.round\(jobTotal \* 100\), paidCents/.test(ps) && /totalCents: Math\.round\(jobTotal \* 100\), paidCents/.test(ss), 'H  owedOn returns the total and paid in both pay.js and share.js');
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1320: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
