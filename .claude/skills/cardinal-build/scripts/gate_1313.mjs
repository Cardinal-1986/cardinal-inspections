/* gate_1313 — an invoice can be paid.
 *   A  INVOICE_TEMPLATE has no signature line, no Estimate # / Valid Through, no photo box,
 *      no concealed-conditions or acceptance note, and a "— Invoice" title; it has Bill To
 *   B  the estimate and the contract templates still carry their signing blocks (no collateral)
 *   C  the REAL api/share.js, fed the invoice the app now generates, shows the pay bar and no
 *      Accept & Sign
 *   D  ...and an invoice made the OLD way (with the signature line) also gets the pay bar
 * Args: [index.html] [api/share.js] -> negative control (1312 pair: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SHARE = process.argv[3] || '/home/user/cardinal-inspections/api/share.js';
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

async function shareRender(html, title){
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
  globalThis.fetch = async (url) => {
    const u = String(url); const j = b => ({ ok: true, json: async () => b });
    if (u.includes('share_token=eq.')) return j([{ id: 'inv1', project_id: 'j1', project: 'Dana Test', html, title, total: 14800, signed_at: null }]);
    if (u.includes('/collections')) return j([{ amount: 5000 }]);
    if (u.includes('/inspection_reports?project_id')) return j([{ title: 'Contract \u2014 Dana Test', total: 14800, signed_at: '2026-09-01' }]);
    return j([]);
  };
  const mod = await import(SHARE + '?v=' + Math.random());
  let body = ''; const res = { status() { return this; }, setHeader() {}, send(b) { body = b; }, end(b) { body = b || body; } };
  await mod.default({ query: { t: 'aaaaaaaa-bbbb-cccc-dddd-000000000001' }, headers: {} }, res);
  return body;
}
try {
  const { ctx, page } = await boot(null, false);
  const T = await page.evaluate(() => {
    const pr = { id: 'j1', name: 'Dana Test', address: '1 Main St, Dayton OH', phone: '937-555-0101', email: 'd@example.com', checklist: '{}' };
    let inv = (typeof prefillClientInfo === 'function') ? prefillClientInfo(INVOICE_TEMPLATE, pr) : INVOICE_TEMPLATE;
    inv = inv.replace('[INV_NUM]', '#1-1').replace('[INV_DATE]', 'Oct 11, 2026').replace('[INV_TOTAL]', '$14,800.00').replace('[INV_PAID]', '$5,000.00').replace('[INV_DUE]', '$9,800.00');
    return { inv, est: typeof ESTIMATE_TEMPLATE === 'string' ? ESTIMATE_TEMPLATE : '', sign: typeof SIGN_FOOTER === 'string' ? SIGN_FOOTER : '' };
  });
  await ctx.close();
  const I = T.inv; if (process.env.INVDUMP) fs.writeFileSync(process.env.INVDUMP, I);
  ok(I.length > 2000, 'A  the invoice template was read', I.length);
  for (const [bad, why] of [['Client Acceptance', 'no client signature line'], ['Estimate #', 'no Estimate #'], ['Valid Through', 'no Valid Through'],
       ['PROPERTY PHOTO', 'no property-photo box'], ['Concealed conditions', 'no change-order note'], ['This estimate is valid', 'no estimate acceptance paragraph'],
       ['\u2014 Estimate</title>', 'title does not end "— Estimate"']])
    ok(!I.includes(bad), 'A  ' + why);
  ok(I.includes('Bill To') && I.includes('\u2014 Invoice</title>') && I.includes('id="estTotal"') && I.includes('$9,800.00'), 'A  Bill To, an Invoice title and the balance cell are there');
  ok((I.match(/Client Contact/g) || []).length === 1, 'A  Client Contact appears once');
  ok(T.est.includes('Client Acceptance') && T.sign.includes('Client Acceptance'), 'B  the estimate still has its signing block');
  const body = await shareRender(I, 'Invoice \u2014 Dana Test');
  ok(/id="crPayBar"/.test(body) && !/id="csBar"/.test(body), 'C  share page for the new invoice: Pay bar, no Accept & Sign', 'pay ' + /crPayBar/.test(body) + ' sign ' + /csBar/.test(body));
  const bar = body.indexOf('id="crPayBar"') >= 0 ? body.slice(body.indexOf('id="crPayBar"'), body.indexOf('id="crPayBar"') + 3000) : '';
  ok(/9,800\.00/.test(bar), 'C  ...and the pay bar asks for the live balance, $9,800.00 ($14,800 contract \u2212 $5,000 paid)', bar ? (bar.match(/\$[\d,]+\.\d\d/) || ['none'])[0] : 'no bar');
  const oldStyle = I.replace('</body>', T.sign + '\n</body>');
  const body2 = await shareRender(oldStyle, 'Invoice \u2014 Dana Test');
  ok(/id="crPayBar"/.test(body2) && !/id="csBar"/.test(body2), 'D  an old-style invoice (signature line kept) also gets Pay, not Sign');
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.stack).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' \u2014 gate_1313: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
