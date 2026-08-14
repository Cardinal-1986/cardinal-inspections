/* gate_801.mjs — Cardinal Truth: Overview/Active Claims/Supplements/Closed
 * tab strip, and icons on the four metric tiles.
 *
 *   node gate_801.mjs [path/to/index.html]
 *
 *   A. the tab strip renders with the right counts (active/supplements/closed)
 *   B. Active Claims tab -> Insurance Clients, excludes Closed and Lost, keeps
 *      everything else (including OnHold, which is a real active state)
 *   C. Supplements tab -> Insurance Clients, only claims with
 *      supplement_status==='filed' — a claim attribute, not a stage
 *   D. Closed tab -> Insurance Clients, stage==='Closed' only — proves the
 *      pre-existing literal-stage path still works through the new branch
 *   E. each of the 4 metric tiles carries an icon
 *   F. the pipeline rail and chase list (untouched code paths) still render
 *
 * Negative control: run against 800 — the tab strip must not exist at all.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const APP  = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_801 on ' + FILE);

function proj(id, name, stage, addr, ck) {
  return { id, name, stage, address: addr, claim_type: 'insurance',
    email: name.toLowerCase().replace(/\s+/g, '.') + '@example.com', phone: '9375550100',
    checklist: JSON.stringify(ck || { lead: { claim_type: 'insurance' } }),
    created_at: '2026-06-01T10:00:00Z', created_by: 'theo@cardinalrenovations.net' };
}
// 11 insurance projects: 1 denied (Lost), 1 closed, 1 with an active
// supplement, 8 others spread across the remaining stages — so
// active = 11 - 1 - 1 = 9, supplements = 1, closed = 1, and OnHold
// specifically must survive the Active filter (it is a real active state,
// not a terminal one).
const SEED = {
  projects: [
    proj('p1', 'Marcus Webb', 'Lead', '410 Salem Ave'),
    proj('p2', 'Dana Holloway', 'Prospect', '2210 Wayne Ave'),
    proj('p3', 'Renee Castillo', 'Prospect', '77 Xenia Ave'),
    proj('p4', 'Frank Ostrowski', 'Approved', '514 Catalpa Dr'),
    proj('p5', 'Priya Natarajan', 'OnHold', '90 Woodman Dr'),
    proj('p6', 'Council Bluffs Church', 'Scheduled', '1200 Wilmington Pk'),
    proj('p7', 'Terry Boone', 'Completed', '35 Corwin Ave'),
    proj('p8', 'Wanda Griggs', 'Invoiced', '618 Riverside Dr'),
    proj('p9', 'Adebayo Coker', 'Invoiced', '44 Notre Dame Ave'),
    proj('p10', 'Linda Ferraro', 'Closed', '2800 Far Hills Ave'),
    proj('p11', 'Kyle Dunmore', 'Lost', '19 Steele Ave')
  ],
  insurance_claims: [
    { id: 'c3', project_id: 'p3', carrier: 'Nationwide', approved_rcv: 16200, first_scope_rcv: 14000,
      deductible: 0, deductible_waived: true, supplement_status: 'filed', supplement_filed: 4200, supplement_filed_at: '2026-07-23T10:00:00Z' },
    { id: 'c8', project_id: 'p8', carrier: 'Owners Insurance', approved_rcv: 21400, approved_depreciation: 6100, supplement_approved: 1400, deductible: 0, deductible_waived: true },
    { id: 'c9', project_id: 'p9', carrier: 'State Farm', approved_rcv: 11800, approved_depreciation: 3200, deductible: 0, deductible_waived: true }
  ],
  'rpc:supplement_stats': [{ avg_increase_pct: 14.2, total_contract_value: 245000, total_upgrades: 18500 }],
  appointments: [], estimates: [], inspection_reports: [], project_photos: [], punch_items: [],
  team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
};

async function boot(width) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width, height: 900 },
    deviceScaleFactor: 1, isMobile: width <= 700, hasTouch: width <= 700 })).newPage();
  page.on('dialog', d => d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(), rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'font') return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
    if (rt === 'media') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
    if (typeof window.showCardinalTruth === 'function') window.showCardinalTruth();
  });
  await page.waitForTimeout(1800);
  return { browser, page };
}

const P = await boot(402);

console.log('\n--- A. the tab strip and its counts ---');
const A = await P.page.evaluate(() => {
  const tabs = document.querySelectorAll('#cardinalTruthView .cr-cth-tabs button');
  if (!tabs.length) return { none: true };
  const byLabel = {};
  tabs.forEach(b => { byLabel[b.textContent.replace(/\d+$/, '').trim()] = b.textContent; });
  return { none: false, count: tabs.length, texts: Array.from(tabs).map(b => b.textContent.trim()) };
});
ok('the tab strip exists with 4 tabs', !A.none && A.count === 4, JSON.stringify(A));
ok('Active Claims reads 9 (11 total minus 1 denied minus 1 closed)', !A.none && A.texts.some(t => t === 'Active Claims9'), JSON.stringify(A.texts));
ok('Supplements reads 1', !A.none && A.texts.some(t => t === 'Supplements1'), JSON.stringify(A.texts));
ok('Closed reads 1', !A.none && A.texts.some(t => t === 'Closed1'), JSON.stringify(A.texts));

console.log('\n--- B. Active Claims tab: excludes Closed/Lost, keeps OnHold ---');
const B = await P.page.evaluate(async () => {
  const btn = document.querySelector('#cardinalTruthView [data-tab="active"]');
  if (!btn) return { none: true };
  btn.click();
  await new Promise(r => setTimeout(r, 900));
  const rows = Array.from(document.querySelectorAll('#cr-ic-wrap .cr-ic-row')).map(r => r.querySelector('.nm').textContent);
  return { none: false, filterVal: window.icStageFilter, rows };
});
ok('sets the __active__ sentinel and navigates', !B.none && B.filterVal === '__active__', JSON.stringify(B));
ok('9 rows, OnHold present, Closed/Lost absent',
  !B.none && B.rows.length === 9 && B.rows.includes('Priya Natarajan') &&
  !B.rows.includes('Linda Ferraro') && !B.rows.includes('Kyle Dunmore'),
  JSON.stringify(B.rows));

console.log('\n--- C. Supplements tab: claim.supplement_status===\'filed\' only ---');
await P.page.evaluate(() => { if (typeof window.showCardinalTruth === 'function') window.showCardinalTruth(); });
await P.page.waitForTimeout(600);
const C = await P.page.evaluate(async () => {
  const btn = document.querySelector('#cardinalTruthView [data-tab="supplements"]');
  if (!btn) return { none: true };
  btn.click();
  await new Promise(r => setTimeout(r, 900));
  const rows = Array.from(document.querySelectorAll('#cr-ic-wrap .cr-ic-row')).map(r => r.querySelector('.nm').textContent);
  return { none: false, filterVal: window.icStageFilter, rows };
});
ok('sets the __supplements__ sentinel', !C.none && C.filterVal === '__supplements__', JSON.stringify(C));
ok('exactly Renee Castillo (the one filed supplement), not Wanda/Adebayo (Invoiced, no open supplement)',
  !C.none && C.rows.length === 1 && C.rows[0] === 'Renee Castillo', JSON.stringify(C.rows));

console.log('\n--- D. Closed tab: the pre-existing literal-stage path still works ---');
await P.page.evaluate(() => { if (typeof window.showCardinalTruth === 'function') window.showCardinalTruth(); });
await P.page.waitForTimeout(600);
const D = await P.page.evaluate(async () => {
  const btn = document.querySelector('#cardinalTruthView [data-tab="closed"]');
  if (!btn) return { none: true };
  btn.click();
  await new Promise(r => setTimeout(r, 900));
  const rows = Array.from(document.querySelectorAll('#cr-ic-wrap .cr-ic-row')).map(r => r.querySelector('.nm').textContent);
  return { none: false, filterVal: window.icStageFilter, rows };
});
ok('sets a literal stage, not a sentinel', !D.none && D.filterVal === 'Closed', JSON.stringify(D));
ok('exactly Linda Ferraro', !D.none && D.rows.length === 1 && D.rows[0] === 'Linda Ferraro', JSON.stringify(D.rows));

console.log('\n--- E. the four metric tiles carry an icon ---');
await P.page.evaluate(() => { if (typeof window.showCardinalTruth === 'function') window.showCardinalTruth(); });
await P.page.waitForTimeout(600);
const E = await P.page.evaluate(() => {
  const tiles = document.querySelectorAll('#cardinalTruthView .cr-cth-stat');
  return Array.from(tiles).map(t => ({
    label: t.querySelector('.l') ? t.querySelector('.l').textContent : null,
    hasIcon: !!t.querySelector('.ic svg.cri')
  }));
});
ok('4 stat tiles, every one has an icon', E.length === 4 && E.every(t => t.hasIcon), JSON.stringify(E));

console.log('\n--- F. untouched code paths still render (rail + chase list) ---');
const F = await P.page.evaluate(() => ({
  railRows: document.querySelectorAll('#cardinalTruthView .cr-cth-stage').length,
  chaseRows: document.querySelectorAll('#cardinalTruthView .cr-cth-chaserow').length
}));
// RAIL has 9 entries (Lead, Prospect, Approved, OnHold, the synthetic
// 'supplement' row, Scheduled, Completed, Invoiced, Closed) - counted
// directly off the array, not assumed. Not 10; an earlier draft of this
// gate (and this session's own chat commentary) said 10 and was wrong.
ok('all 9 pipeline stages still render', F.railRows === 9, JSON.stringify(F));
ok('chase list still renders (Renee + Wanda + Adebayo all owe or are chasing)', F.chaseRows >= 1, JSON.stringify(F));

await P.browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
