/* gate_1140.mjs — build 1140: Roof Options (Good / Better / Best).
 *
 * An "Options" button in the estimate toolbar builds one client-facing sheet
 * that shows 2-3 of a client's saved estimates side by side; the homeowner
 * initials the option they want. Reuses the estimate publish rails
 * (window.db.create) — no new table.
 *
 * Proves in Chromium against the real, exported module:
 *   1. buildGbbHtml(3 tiers) -> exactly 3 .gbb-col; the MIDDLE one carries the
 *      "Most chosen" badge and the others do not; every tier's price renders;
 *      3 initial boxes; ROOF OPTIONS header; the client name.
 *   2. monthly on a tier renders a financing line; a blank monthly does NOT;
 *      buildGbbHtml(2 tiers) -> 2 cols, ranks Good & Best, NO badge.
 *   3. the picker (openOptions): overlay opens, loads the project's estimates,
 *      renders 3 rank rows pre-filled cheapest->priciest, and Generate calls
 *      db.create with an html document containing the three columns.
 * Control (1139 tree): RED — buildGbbHtml/openOptions are undefined.
 * Run: node gate_1140.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1140: playwright not found'); process.exit(2); }
const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1140.mjs [index.html]'); process.exit(2); }
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'].map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const html = readFileSync(FILE, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 414, height: 896 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await page.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
  ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
  : r.fulfill({ status: 200, body: '' }));
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);

let r;
try {
  r = await page.evaluate(`(async function(){
  const out = { ok:true, fail:[] };
  const P = window.CardinalEstimatePublish;
  if (!P || typeof P.buildGbbHtml !== 'function' || typeof P.openOptions !== 'function') {
    out.ok = false; out.fail.push('CardinalEstimatePublish.buildGbbHtml/openOptions missing'); return out;
  }
  const project = { id:'p1', name:'Jim Arnett', address:'5282 Split Rail, Dayton OH' };
  function estOf(id, num, title, total, names){
    return { id:id, estimate_number:num, title:title, total:total,
      line_items: names.map(function(n){ return { name:n, qty:1, unit:'EA', unit_price:0, amount:0 }; }) };
  }
  const good   = estOf('e1','EST-1','Oakridge roof',   41800, ['Tear-off & dispose','Oakridge shingles','Ice & water']);
  const better = estOf('e2','EST-2','Duration roof',   46783, ['Tear-off & dispose','Duration shingles','Ridge vent']);
  const best   = estOf('e3','EST-3','Duration STORM',  52140, ['Tear-off & dispose','Duration STORM','Ridge vent']);

  /* ---- 1/2: buildGbbHtml direct, 3 tiers, middle has a monthly ---- */
  const doc3 = P.buildGbbHtml([
    { est:good,   label:'Oakridge',       monthly:'' },
    { est:better, label:'Duration',       monthly:'416' },
    { est:best,   label:'Duration STORM', monthly:'' }
  ], project);
  const d = new DOMParser().parseFromString(doc3, 'text/html');
  const cols = d.querySelectorAll('.gbb-col');
  if (cols.length !== 3) out.fail.push('expected 3 gbb-col, got ' + cols.length);
  const badges = d.querySelectorAll('.gbb-badge');
  if (badges.length !== 1) out.fail.push('expected exactly 1 badge, got ' + badges.length);
  if (cols[1] && !cols[1].querySelector('.gbb-badge')) out.fail.push('middle column is not the badged one');
  if (cols[0] && cols[0].querySelector('.gbb-badge')) out.fail.push('first column wrongly badged');
  const boxes = d.querySelectorAll('.gbb-box');
  if (boxes.length !== 3) out.fail.push('expected 3 initial boxes, got ' + boxes.length);
  if (doc3.indexOf('ROOF OPTIONS') === -1) out.fail.push('no ROOF OPTIONS header');
  if (doc3.indexOf('Jim Arnett') === -1) out.fail.push('client name missing');
  if (doc3.indexOf('$41,800') === -1 || doc3.indexOf('$46,783') === -1 || doc3.indexOf('$52,140') === -1)
    out.fail.push('a tier price is missing from the doc');
  const ranks = Array.from(d.querySelectorAll('.gbb-rank')).map(function(x){ return x.textContent.trim(); });
  if (ranks.join(',') !== 'Good,Better,Best') out.fail.push('ranks not Good,Better,Best: ' + ranks.join(','));
  /* monthly: only the Better tier had one -> exactly one financing line with text */
  const mos = Array.from(d.querySelectorAll('.gbb-mo')).map(function(x){ return x.textContent.trim(); });
  const withMoney = mos.filter(function(t){ return /\\d/.test(t); });
  if (withMoney.length !== 1) out.fail.push('expected exactly 1 financing line, got ' + withMoney.length + ' :: ' + JSON.stringify(mos));
  if (withMoney[0] && withMoney[0].indexOf('416') === -1) out.fail.push('financing line missing the $416 value: ' + withMoney[0]);
  /* bullets are the estimate's own line names */
  if (doc3.indexOf('Oakridge shingles') === -1) out.fail.push('bullets not drawn from line items');

  /* ---- 2 tiers: ranks Good & Best, no badge ---- */
  const doc2 = P.buildGbbHtml([
    { est:good, label:'Oakridge', monthly:'' },
    { est:best, label:'STORM',    monthly:'' }
  ], project);
  const d2 = new DOMParser().parseFromString(doc2, 'text/html');
  if (d2.querySelectorAll('.gbb-col').length !== 2) out.fail.push('2-tier: not 2 cols');
  if (d2.querySelectorAll('.gbb-badge').length !== 0) out.fail.push('2-tier: should have NO badge');
  const r2 = Array.from(d2.querySelectorAll('.gbb-rank')).map(function(x){ return x.textContent.trim(); });
  if (r2.join(',') !== 'Good,Best') out.fail.push('2-tier ranks not Good,Best: ' + r2.join(','));
  if (doc2.indexOf('financed') !== -1) out.fail.push('2-tier: financing line shown with no monthly');

  /* ---- 3: the picker + Generate wiring ---- */
  window.CardinalEstimates.currentProject = function(){ return project; };
  window.CardinalEstimates.loadForProject = function(){ return Promise.resolve([best, good, better]); };
  let created = null;
  window.db = window.db || {};
  window.db.create = function(title, htmlDoc, projName, pid){ created = { title:title, html:htmlDoc, pid:pid }; return Promise.resolve('doc-gbb-1'); };
  window.openEditor = function(){ return true; };  /* swallow the navigation */

  await P.openOptions();
  await new Promise(function(res){ setTimeout(res, 500); });
  const pick = document.getElementById('cr-gbb-pick');
  if (!pick || !pick.classList.contains('open')) { out.fail.push('picker did not open'); }
  else {
    const prows = pick.querySelectorAll('.gbbp-row');
    if (prows.length !== 3) out.fail.push('picker: expected 3 rank rows, got ' + prows.length);
    const sels = Array.from(pick.querySelectorAll('.gbbp-est'));
    const prefill = sels.map(function(s){ return s.value; });
    /* cheapest good(e1) -> Good, best(e3) -> Best */
    if (prefill[0] !== 'e1') out.fail.push('Good not pre-filled with cheapest: ' + prefill[0]);
    if (prefill[2] !== 'e3') out.fail.push('Best not pre-filled with priciest: ' + prefill[2]);
    /* type a monthly on the middle row */
    const mid = pick.querySelectorAll('.gbbp-row')[1].querySelector('.gbbp-monthly');
    if (mid) mid.value = '416';
    pick.querySelector('[data-act="gbbp-go"]').click();
    await new Promise(function(res){ setTimeout(res, 500); });
    if (!created) out.fail.push('Generate did not call db.create');
    else {
      if (created.pid !== 'p1') out.fail.push('db.create wrong project id: ' + created.pid);
      if (String(created.title).indexOf('Roof Options') === -1) out.fail.push('doc title not "Roof Options": ' + created.title);
      const dc = new DOMParser().parseFromString(created.html, 'text/html');
      if (dc.querySelectorAll('.gbb-col').length !== 3) out.fail.push('generated doc: not 3 columns');
      if (created.html.indexOf('416') === -1) out.fail.push('generated doc missing the typed monthly');
    }
    if (pick.classList.contains('open')) out.fail.push('picker did not close after generate');
  }

  out.ok = out.fail.length === 0;
  return out;
})()`);
} catch (e) {
  console.error('gate_1140: harness threw:', String(e).split('\n')[0]);
  await browser.close();
  process.exit(1);
}
await browser.close();

if (errs.length) console.log('  page errors:', errs.slice(0, 4).join(' | '));
if (r && r.ok) {
  console.log('gate_1140 GREEN — Roof Options builds 3/2-tier docs and the picker generates one');
  process.exit(0);
} else {
  console.log('gate_1140 RED');
  (r ? r.fail : ['no result']).forEach(f => console.log('   ✗ ' + f));
  process.exit(1);
}
