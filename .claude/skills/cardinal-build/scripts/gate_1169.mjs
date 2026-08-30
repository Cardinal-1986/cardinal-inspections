/* gate_1169 — the Front Door finished: Cardinal in the header while open, a
 * check on the current portal, book totals on the CRM doors, group divider,
 * eyebrow dot. Optional path arg -> negative control (1168 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(path.join(HERE, 'e2e_mock_supa.js'), 'utf8');
let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 90000);

const ck = t => JSON.stringify({ lead: { claim_type: t } });
const P = (id, name, stage, type) => ({ id, name, stage, address: '', phone: '', email: '',
  checklist: type === null ? '' : ck(type), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [
    P(1, 'R One', 'Lead', 'retail'), P(2, 'R Two', 'Prospect', 'retail'), P(3, 'R Three', 'Closed', 'retail'),
    P(4, 'C One', 'Lead', 'community'), P(5, 'C Two', 'Closed', 'community'),
    P(6, 'I One', 'Lead', 'insurance'), P(7, 'U One', 'Lead', null)
  ],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: []
};
// expected: retail 3 clients, insurance 1 claim, community open 1 (C Two is Closed)

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url();
  const rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.evaluate(() => { try { window.CardinalFrontDoor && window.CardinalFrontDoor.close(); } catch (_) {}
  try { if (typeof hideAllViews === 'function') hideAllViews(); if (typeof showHome === 'function') showHome(); } catch (_) {} });
await page.waitForTimeout(600);

const h1Before = await page.evaluate(() => (document.querySelector('#brandTitle h1') || {}).textContent || '');
await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(500);
const s = await page.evaluate(() => {
  const v = document.getElementById('cr-fd');
  const row = k => v.querySelector('.fdrow[data-fd="' + k + '"]');
  const sub = k => { const r = row(k); const sm = r && r.querySelector('small'); return sm ? sm.textContent : ''; };
  return {
    h1: (document.querySelector('#brandTitle h1') || {}).textContent || '',
    aria: (document.getElementById('brandTitle') || { getAttribute: () => '' }).getAttribute('aria-expanded'),
    chkOn: [...v.querySelectorAll('.fdrow')].filter(r => r.querySelector('.chk')).map(r => r.getAttribute('data-fd')),
    retailSub: sub('retail'), insSub: sub('insurance'), comSub: sub('community'),
    divs: v.querySelectorAll('.fd-div').length,
    dot: !!v.querySelector('.fd-eyebrow .dot')
  };
});
ok(s.h1 === 'Cardinal', 'header reads "Cardinal" while open, got: ' + s.h1);
ok(s.aria === 'true', 'aria-expanded true while open');
ok(s.chkOn.length === 1 && s.chkOn[0] === 'retail', 'check sits on the current portal only, got: ' + s.chkOn.join(','));
ok(/3 clients/.test(s.retailSub), 'retail door says "3 clients", got: ' + s.retailSub);
ok(/1 claim\b/.test(s.insSub), 'insurance door says "1 claim", got: ' + s.insSub);
ok(/1 open/.test(s.comSub), 'community door says "1 open" (Closed excluded), got: ' + s.comSub);
ok(s.divs >= 1, 'group divider present');
ok(s.dot, 'eyebrow dot present');

await page.evaluate(() => window.CardinalFrontDoor.close());
await page.waitForTimeout(400);
const after = await page.evaluate(() => ({
  h1: (document.querySelector('#brandTitle h1') || {}).textContent || '',
  aria: (document.getElementById('brandTitle') || { getAttribute: () => '' }).getAttribute('aria-expanded')
}));
ok(after.h1 === h1Before, 'header restored to "' + h1Before + '" on close, got: ' + after.h1);
ok(after.aria === 'false', 'aria-expanded false after close');
ok(pageErrors.length === 0, 'no page errors: ' + pageErrors.slice(0, 2).join(' | '));
await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
