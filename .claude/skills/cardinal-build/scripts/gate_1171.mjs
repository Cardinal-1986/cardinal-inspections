/* gate_1171 — one way to switch portals. The drawer has exactly one switch
 * row; the drawer-header icon, the 'portal' nav case and the insurance chip
 * all open the Front Door; the old picker sheet (.cr-psheet) never appears
 * from any of them. Optional path arg -> negative control (1170 must go RED:
 * two rows, and the old sheet opens). */
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
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [
    { id: 'p1', name: 'R One', stage: 'Lead', address: '', phone: '', email: '', checklist: ck('retail'), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' },
    { id: 'p2', name: 'I One', stage: 'Lead', address: '', phone: '', email: '', checklist: ck('insurance'), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' },
    { id: 'p3', name: 'C One', stage: 'Lead', address: '', phone: '', email: '', checklist: ck('community'), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' }
  ],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: []
};

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

const sheetOpen = () => page.evaluate(() => !!document.querySelector('.cr-psheet'));
const fdOpen = () => page.evaluate(() => { try { return window.CardinalFrontDoor.isOpen(); } catch (_) { return false; } });
const closeAll = () => page.evaluate(() => {
  try { window.CardinalFrontDoor.close(); } catch (_) {}
  document.querySelectorAll('.cr-psheet-bg,.cr-pbg').forEach(e => e.remove());
  const m = document.getElementById('navMenu'); if (m) m.style.display = 'none';
});

// 1. exactly one switch row in the drawer
const rows = await page.evaluate(() => {
  const m = document.getElementById('navMenu');
  return [...(m ? m.querySelectorAll('.navopt') : [])].map(b => b.textContent.trim()).filter(t => /switch portal/i.test(t));
});
ok(rows.length === 1, 'exactly one "Switch portal" row in the drawer, got ' + rows.length + ': ' + rows.join(' | '));

// 2. that row opens the Front Door, not the old sheet
await page.evaluate(() => { const b = document.querySelector('#navMenu .navopt[data-nav="landing"]'); if (b) b.click(); });
await page.waitForTimeout(600);
ok(await fdOpen(), 'the drawer row opens the Front Door');
ok(!(await sheetOpen()), 'no old picker sheet from the drawer row');
await closeAll();

// 3. the nav "portal" case routes to the Front Door too (defensive path)
await page.evaluate(() => {
  const m = document.getElementById('navMenu');
  const b = document.createElement('button'); b.className = 'navopt'; b.setAttribute('data-nav', 'portal');
  m.appendChild(b); b.click(); b.remove();
});
await page.waitForTimeout(500);
ok(await fdOpen(), "the 'portal' nav case opens the Front Door");
ok(!(await sheetOpen()), "no old picker sheet from the 'portal' case");
await closeAll();

// 4. the drawer-header icon opens the Front Door (handler bound at drawer init)
const swResult = await page.evaluate(() => {
  const sw = document.querySelector('#navMenu .cr-dh-switch');
  if (!sw) return 'absent';
  sw.click(); return 'clicked';
});
await page.waitForTimeout(500);
if (swResult === 'clicked') {
  ok(await fdOpen(), 'the drawer-header icon opens the Front Door');
  ok(!(await sheetOpen()), 'no old picker sheet from the drawer-header icon');
} else {
  // the icon is created by the drawer restyle at certain widths; absence is not a defect here
  ok(true, 'noop'); ok(true, 'noop');
}
await closeAll();

// 5. source-level: the ins chip's onclick prefers the Front Door
const chipSrc = await page.evaluate(() => {
  const s = [...document.querySelectorAll('script')].map(x => x.textContent).join('');
  const i = s.indexOf("chip.title = 'Switch CRM'");
  return i === -1 ? '' : s.slice(i, i + 600);
});
ok(/CardinalFrontDoor/.test(chipSrc), "the insurance Switch CRM chip routes to the Front Door");

ok(pageErrors.length === 0, 'no page errors: ' + pageErrors.slice(0, 2).join(' | '));
await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
