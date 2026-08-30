/* gate_1168 — AR leads with the money owed; the circles become a 30-day calendar.
 * Seeds two invoiced retail jobs (signed contracts, part-paid) + one invoiced
 * community job + two appointments inside 30 days. Asserts the AR headline is
 * the real board total with per-client rows (community excluded), the axis
 * ceiling no longer leads, the calendar grid marks today and booked days with
 * an honest range/count line, and the card opens the Schedule Board.
 * Optional path arg -> negative control (1167 must go RED). */
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

const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = new Date(); today.setHours(0, 0, 0, 0);
const plus = n => { const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n); return iso(d); };
const ckI = (type, ws) => JSON.stringify({ lead: { claim_type: type }, t_Invoiced: '2026-08-20T12:00:00Z', ws: ws || {} });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [
    { id: 1, name: 'Dan Thompson', stage: 'Invoiced', address: '1 A St, Dayton, OH 45414', phone: '', email: '',
      checklist: ckI('retail', { d1: { paid: 1000 } }), created_at: '2026-08-11T12:00:00Z', updated_at: '2026-08-11T12:00:00Z' },
    { id: 2, name: 'Vandalyn Robinson', stage: 'Invoiced', address: '2 B St, Dayton, OH 45415', phone: '', email: '',
      checklist: ckI('retail'), created_at: '2026-08-12T12:00:00Z', updated_at: '2026-08-12T12:00:00Z' },
    { id: 3, name: 'Community Owed Person', stage: 'Invoiced', address: '3 C St, Dayton, OH 45402', phone: '', email: '',
      checklist: ckI('community'), created_at: '2026-08-13T12:00:00Z', updated_at: '2026-08-13T12:00:00Z' }
  ],
  inspection_reports: [
    { id: 'd1', project_id: 1, project: 'Dan Thompson', title: 'Contract — Roofing — Dan Thompson', signed_at: '2026-08-15T12:00:00Z', total: 12921, created_at: '2026-08-14T12:00:00Z' },
    { id: 'd2', project_id: 2, project: 'Vandalyn Robinson', title: 'Contract — Roofing — Vandalyn Robinson', signed_at: '2026-08-15T12:00:00Z', total: 12550, created_at: '2026-08-14T12:00:00Z' },
    { id: 'd3', project_id: 3, project: 'Community Owed Person', title: 'Contract — Roofing — Community', signed_at: '2026-08-15T12:00:00Z', total: 9999, created_at: '2026-08-14T12:00:00Z' }
  ],
  appointments: [
    { id: 'a1', appt_date: plus(3), title: 'Roof start', project_id: 1 },
    { id: 'a2', appt_date: plus(3), title: 'Walkthrough', project_id: 2 }
  ],
  estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: []
};
// expected retail AR: (12921-1000) + 12550 = 24471

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
await page.waitForTimeout(800);

const s = await page.evaluate(() => {
  const g = id => document.getElementById(id);
  const ar = g('arWrap');
  const big = ar ? ar.querySelector('.arbig') : null;
  const grid = g('cal30Grid');
  return {
    arText: ar ? ar.textContent : '',
    bigLeads: !!(big && ar.firstElementChild === big),
    bigText: big ? big.textContent : '',
    headOld: !!(ar && ar.querySelector('.arhead')),
    cds: grid ? grid.querySelectorAll('.cd').length : 0,
    hasToday: grid ? !!grid.querySelector('.cd.today') : false,
    booked: grid ? [...grid.querySelectorAll('.cd.has')].map(e => e.textContent) : [],
    note: (g('cal30Note') || {}).textContent || '',
    arTotal: (g('arTotal') || {}).textContent || ''
  };
});
ok(s.bigLeads, 'the money-owed headline is the first thing on the AR card');
ok(/\$24,471/.test(s.bigText), 'headline is the real retail total $24,471, got: ' + s.bigText.slice(0, 40));
ok(/outstanding across 2 invoices/.test(s.arText), 'subtitle counts 2 invoices (community excluded)');
ok(/Dan Thompson/.test(s.arText) && /Vandalyn Robinson/.test(s.arText), 'per-client rows present');
ok(!/Community Owed Person/.test(s.arText), 'community invoice not in the retail AR card');
ok(!s.headOld, 'the axis-ceiling .arhead no longer renders');
ok(s.arTotal.trim() === '', 'old duplicate Outstanding line is gone');
ok(s.cds >= 30, 'calendar renders >=30 day cells, got ' + s.cds);
ok(s.hasToday, 'today is ringed');
ok(s.booked.length === 1, 'exactly one booked day marked (2 appts, same day), got ' + s.booked.length);
ok(/2 appointments booked/.test(s.note), 'note says "2 appointments booked", got: ' + s.note);
ok(/[A-Z][a-z]{2} \d+ – [A-Z][a-z]{2} \d+/.test(s.note), 'note carries the real date range');

// the card opens the Schedule Board
await page.evaluate(() => { window.__sbOpened = 0; const o = window.openScheduleBoard; window.openScheduleBoard = function(){ window.__sbOpened++; try { o && o(); } catch (_) {} }; });
const clicked = await page.evaluate(() => { const g = document.getElementById('cal30Grid'); if (!g) return false; g.click(); return true; });
await page.waitForTimeout(400);
const opened = clicked ? await page.evaluate(() => window.__sbOpened) : -1;
ok(opened === 1, 'tapping the calendar card opens the Schedule Board');
ok(pageErrors.length === 0, 'no page errors: ' + pageErrors.slice(0, 2).join(' | '));
await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
