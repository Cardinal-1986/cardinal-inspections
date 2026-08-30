/* gate_1167 — the retail board counts retail.
 * Boots the shipped app in Chromium against the e2e mock, seeded with a mixed
 * book: 3 retail, 1 community, 1 insurance, 2 unfiled. Asserts the pipeline,
 * Most Recent, and See-all count only retail; that search stays unscoped; and
 * that the unfiled clients are announced, reachable, and returnable.
 * Optional path arg -> negative control (1166 counts the whole book, must go RED). */
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
const P = (id, name, stage, type, zip) => ({
  id, name, stage, address: (zip ? '10 Main St, Dayton, OH ' + zip : ''), phone: '', email: '',
  checklist: type === null ? '' : ck(type),
  created_at: '2026-08-' + String(10 + id).padStart(2, '0') + 'T12:00:00Z',
  updated_at: '2026-08-' + String(10 + id).padStart(2, '0') + 'T12:00:00Z'
});
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [
    P(1, 'Retail Lead One', 'Lead', 'retail', '45414'),
    P(2, 'Retail Prospect Two', 'Prospect', 'retail', '45415'),
    P(3, 'Retail Approved Three', 'Approved', 'retail', '45420'),
    P(4, 'Community Bid Person', 'Lead', 'community', '45402'),
    P(5, 'Insurance Claim Person', 'Lead', 'insurance', '45403'),
    P(6, 'Unfiled Client Six', 'Lead', null, '45404'),
    P(7, 'Unfiled Client Seven', 'Prospect', null, '45405')
  ],
  estimates: [], inspection_reports: [], collections: [], commissions: [],
  contracts: [], punch_items: [], appointments: [], insurance_claims: []
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
// land on the home whatever the boot route did, then let renders settle
await page.evaluate(() => { try { window.CardinalFrontDoor && window.CardinalFrontDoor.close(); } catch (_) {}
  try { if (typeof hideAllViews === 'function') hideAllViews(); if (typeof showHome === 'function') showHome(); } catch (_) {} });
await page.waitForTimeout(800);

const state = () => page.evaluate(() => {
  const g = id => document.getElementById(id);
  const pipe = {};
  document.querySelectorAll('#pipeRow .pipebtn').forEach(b => {
    pipe[b.getAttribute('data-stg')] = parseInt(b.querySelector('.pcount').textContent, 10);
  });
  const mount = g('historyMount');
  return {
    pipe,
    note: (g('pipeScopeNote') || {}).textContent || '',
    seeAll: (g('seeAllBtn') || {}).textContent || '',
    count: (g('countLabel') || {}).textContent || '',
    board: mount ? mount.textContent : ''
  };
});

let s = await state();
ok(s.pipe.Lead === 1, 'pipeline Lead should be 1 (retail only), got ' + s.pipe.Lead);
ok(s.pipe.Prospect === 1, 'pipeline Prospect should be 1 (retail only), got ' + s.pipe.Prospect);
ok(s.pipe.Approved === 1, 'pipeline Approved should be 1, got ' + s.pipe.Approved);
ok(/Retail Lead One/.test(s.board), 'retail client on the board');
ok(!/Community Bid Person/.test(s.board), 'community client NOT on the retail board');
ok(!/Insurance Claim Person/.test(s.board), 'insurance client NOT on the retail board');
ok(!/Unfiled Client Six/.test(s.board), 'unfiled client NOT counted into the retail board');
ok(/See all 3 retail clients/.test(s.seeAll), 'see-all says "3 retail clients", got: ' + s.seeAll);
ok(/3 retail projects/.test(s.count), 'count label says "3 retail projects", got: ' + s.count);
ok(/2 clients filed under no CRM/.test(s.note), 'scope note announces the 2 unfiled, got: ' + s.note);

// tap the chip -> Assign Portals opens (1170: the chip routes to the sorter;
// the read-only browse view it opened at 1167 was replaced deliberately)
await page.evaluate(() => { const b = document.querySelector('[data-unsorted-open]'); if (b) b.click(); });
await page.waitForTimeout(600);
const sorter = await page.evaluate(() => {
  const m = document.getElementById('cr-bulk-mount');
  return { shown: !!m && getComputedStyle(m).display !== 'none', text: m ? m.textContent : '' };
});
ok(sorter.shown, 'Assign Portals opens from the pipeline chip');
ok(/Assign Portals/.test(sorter.text), 'the sorter screen renders');
ok(/Unfiled Client Six/.test(sorter.text) && /Unfiled Client Seven/.test(sorter.text), 'both unfiled clients listed in the sorter');
// hideAllViews must clear it (1170 registration)
await page.evaluate(() => { if (typeof hideAllViews === 'function') hideAllViews(); if (typeof showHome === 'function') showHome(); });
await page.waitForTimeout(400);
const cleared = await page.evaluate(() => {
  const m = document.getElementById('cr-bulk-mount');
  return !m || getComputedStyle(m).display === 'none';
});
ok(cleared, 'hideAllViews clears the sorter (no nav trap)');
let s2 = await state();
ok(/Retail Lead One/.test(s2.board), 'home board back after leaving the sorter');

// search stays unscoped — a community client is findable from the retail home
await page.evaluate(() => {
  const sb = document.getElementById('searchBox');
  sb.value = 'Community Bid'; window.searchText = 'Community Bid';
  sb.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(500);
s = await state();
ok(/Community Bid Person/.test(s.board), 'search still finds a community client from the retail home');

ok(pageErrors.length === 0, 'no page errors: ' + pageErrors.slice(0, 2).join(' | '));
await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
