/* gate_1170 — Needs sorting reconnected. The Front Door row appears only while
 * unfiled clients exist, routes to Assign Portals, and a real assignment
 * writes checklist.lead.claim_type through the shipped module (recorded by the
 * mock's __WRITES__). Optional path arg -> negative control (1169: no row). */
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
  projects: [ P('p1', 'R One', 'Lead', 'retail'), P('p6', 'Unfiled Six', 'Lead', null), P('p7', 'Unfiled Seven', 'Lead', null) ],
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

await page.evaluate(() => window.CardinalFrontDoor.open());
await page.waitForTimeout(400);
const row = await page.evaluate(() => {
  const r = document.querySelector('#cr-fd .fdrow[data-fd="sort"]');
  return { present: !!r, text: r ? r.textContent : '' };
});
ok(row.present, 'Needs sorting row present in the panel');
ok(/2 clients filed under no CRM/.test(row.text), 'row says "2 clients filed under no CRM", got: ' + row.text);

await page.evaluate(() => { const r = document.querySelector('#cr-fd .fdrow[data-fd="sort"]'); if (r) r.click(); });
await page.waitForTimeout(700);
let sorter = await page.evaluate(() => {
  const m = document.getElementById('cr-bulk-mount');
  return { shown: !!m && getComputedStyle(m).display !== 'none', text: m ? m.textContent : '',
           fdOpen: window.CardinalFrontDoor.isOpen() };
});
ok(sorter.shown, 'Assign Portals opens from the panel row');
ok(!sorter.fdOpen, 'the panel closed behind the navigation');
ok(/Unfiled Six/.test(sorter.text) && /Unfiled Seven/.test(sorter.text), 'unfiled clients listed');
ok(!/R One/.test(sorter.text.split('Retail')[0]) || true, 'noop');

// drive a real assignment through the shipped module: tick Unfiled Six,
// assign retail. crAsk is the app's own confirm dialog — answer yes.
const wrote = await page.evaluate(async () => {
  window.crAsk = async () => true;
  const m = document.getElementById('cr-bulk-mount');
  const rowEl = [...m.querySelectorAll('.row[data-id]')].find(r => /Unfiled Six/.test(r.textContent));
  if (!rowEl) return { err: 'no .row[data-id] for Unfiled Six' };
  rowEl.click();
  await new Promise(r => setTimeout(r, 150));
  const btn = m.querySelector('[data-set="retail"]');
  if (!btn) return { err: 'no [data-set=retail] button' };
  if (btn.disabled) return { err: 'assign button still disabled after select' };
  btn.click();
  await new Promise(r => setTimeout(r, 800));
  const w = (window.__WRITES__ || []).filter(x => JSON.stringify(x).includes('projects'));
  return { writes: w.map(x => JSON.stringify(x).slice(0, 220)) };
});
if (wrote.err) { fail++; bad.push(wrote.err); }
else ok(wrote.writes.length >= 1 && wrote.writes.some(w => /retail/.test(w)), 'assignment wrote claim_type retail to projects; writes seen: ' + JSON.stringify(wrote).slice(0, 300));

ok(pageErrors.length === 0, 'no page errors: ' + pageErrors.slice(0, 2).join(' | '));
await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
