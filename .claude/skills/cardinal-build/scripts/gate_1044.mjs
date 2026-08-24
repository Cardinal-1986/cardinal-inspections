/* gate_1044.mjs — build 1044: universal search in the command palette.
 * Rig as Theo (admin), real palette drives:
 *   [po]    type "1048"          -> the client holding PO 1048 appears
 *   [claim] type "CLM-77-4412"   -> the injected insurance client appears
 *                                   (a synthetic __SEED__ row carrying
 *                                   checklist.lead.insurance.claim_number —
 *                                   flows through the real boot + search)
 *   [punch] type "storm door"    -> a Punch-outs row appears; clicking it
 *                                   opens the punch CARD (#cr-pk.open)
 * Run:  node gate_1044.mjs <artifact> [--control <prev>]
 * Control must go RED on all three (the palette never knew these fields).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1044: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1044.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const CARDINAL_JS = readFileSync(SKILL + 'sentinel_setup_cardinal.js', 'utf8');
const MOCK_JS = readFileSync(SKILL + 'e2e_mock_supa.js', 'utf8');
/* runs BETWEEN the seed and the mock: extend the seed with an insurance client */
const CLAIM_ROW = `(function(){
  if(!window.__SEED__) return;
  window.__SEED__.projects.push({ id:'pclm', name:'Vera Hollis', address:'71 Quail Run', city:'Dayton',
    state:'OH', zip:'45415', stage:'Prospect', created_by:'theo@cardinalrenovations.net', sales_rep:null,
    checklist: JSON.stringify({ po:1090, lead:{ assigned:[], insurance:{ carrier:'State Farm',
      policy_number:'POL-88-1234', claim_number:'CLM-77-4412', date_of_loss:'2026-08-01' } } }),
    phone:'937-555-0190', email:null, crm:'retail',
    created_at:'2026-08-10T10:00:00Z', updated_at:'2026-08-20T10:00:00Z', stage_since:'2026-08-12T10:00:00Z' });
})();`;
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(CARDINAL_JS);
  await page.addInitScript(CLAIM_ROW);
  await page.addInitScript(MOCK_JS);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);

  const out = {};
  async function query(q) {
    await page.evaluate(`(function(){
      var bg = document.querySelector('.cr-srch-bg'); if(bg) bg.remove();
      var b = document.getElementById('cr-search-btn'); if(b) b.click();
    })()`);
    await page.waitForTimeout(400);
    const has = await page.evaluate(`!!document.querySelector('.cr-srch-inp')`);
    if (!has) return { noPalette: true };
    await page.fill('.cr-srch-inp', q);
    await page.waitForTimeout(500);
    return await page.evaluate(`(function(){
      var rows = [];
      document.querySelectorAll('.cr-srch-row').forEach(function(r){
        rows.push({ t: r.dataset.t, id: r.dataset.id, text: (r.textContent || '').trim().slice(0, 60) });
      });
      return { rows: rows };
    })()`);
  }
  out.po = await query('1048');
  out.claim = await query('CLM-77-4412');
  out.punch = await query('storm door');
  /* click the punch row (if present) and confirm the card opened */
  out.cardOpened = await page.evaluate(`(function(){
    var row = document.querySelector('.cr-srch-row[data-t="k"]');
    if(!row) return 'NOROW';
    row.click();
    return true;
  })()`);
  await page.waitForTimeout(900);
  if (out.cardOpened === true) {
    out.cardOpened = await page.evaluate(`(function(){
      var pk = document.getElementById('cr-pk');
      return !!(pk && pk.classList.contains('open'));
    })()`);
  }
  await ctx.close();
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  if (r.po.noPalette) return ['palette never opened (rig fault — proves nothing)'];
  if (!r.po.rows.some(x => x.t === 'c')) fails.push('PO "1048" found no client');
  if (!r.claim.rows.some(x => x.t === 'c' && /Vera Hollis/.test(x.text))) fails.push('claim number found no client');
  if (!r.punch.rows.some(x => x.t === 'k')) fails.push('"storm door" found no punch-out row');
  else if (r.cardOpened !== true) fails.push(`punch row click did not open the card (${r.cardOpened})`);
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1044 RED — ${fails.length} failure(s)` : 'GATE 1044 GREEN — PO, claim number and punch-outs all resolve and jump');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 4)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
