/* gate_1045.mjs — build 1045: the Gone-quiet card.
 * Rig as Theo on the retail home, with three injected seed rows:
 *   Quentin Marsh  — Approved, stage_since 40 days ago   -> MUST appear, stale-red
 *   Holdout Grant  — OnHold, 400 days                    -> MUST NOT appear (parks by design)
 *   Vera Insured   — insurance Prospect, 60 days         -> MUST NOT appear (chase list owns it)
 * Clicking the Marsh row must open the client profile. The base seed's own
 * rows are all under the 14-day floor, so nothing else may appear.
 * Run:  node gate_1045.mjs <artifact> [--control <index_1044>]
 * Control must go RED (#kpQuietList does not exist).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1045: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1045.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const CARDINAL_JS = readFileSync(SKILL + 'sentinel_setup_cardinal.js', 'utf8');
const MOCK_JS = readFileSync(SKILL + 'e2e_mock_supa.js', 'utf8');
const STALE_ROWS = `(function(){
  if(!window.__SEED__) return;
  var day = 86400000, now = Date.now();
  function iso(daysAgo){ return new Date(now - daysAgo * day).toISOString(); }
  window.__SEED__.projects.push(
    { id:'pq1', name:'Quentin Marsh', address:'9 Elmhurst Dr', city:'Dayton', state:'OH', zip:'45419',
      stage:'Approved', created_by:'theo@cardinalrenovations.net', sales_rep:null,
      checklist: JSON.stringify({ po:1091, lead:{ assigned:[] } }), phone:'937-555-0161', email:null,
      crm:'retail', created_at: iso(80), updated_at: iso(40), stage_since: iso(40) },
    { id:'pq2', name:'Holdout Grant', address:'12 Patience Ln', city:'Dayton', state:'OH', zip:'45410',
      stage:'OnHold', created_by:'theo@cardinalrenovations.net', sales_rep:null,
      checklist: JSON.stringify({ po:1092, lead:{ assigned:[] } }), phone:null, email:null,
      crm:'retail', created_at: iso(500), updated_at: iso(400), stage_since: iso(400) },
    { id:'pq3', name:'Vera Insured', address:'3 Carrier Ct', city:'Dayton', state:'OH', zip:'45415',
      stage:'Prospect', created_by:'theo@cardinalrenovations.net', sales_rep:null,
      checklist: JSON.stringify({ po:1093, lead:{ assigned:[], insurance:{ carrier:'Allstate', claim_number:'CLM-9' } } }),
      phone:null, email:null, crm:'retail', created_at: iso(90), updated_at: iso(60), stage_since: iso(60) }
  );
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
  await page.addInitScript(STALE_ROWS);
  await page.addInitScript(MOCK_JS);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  /* the kphome row renders through renderActivity (350's wiring), which the
     rig's boot never fires — kpLeadsList is just as empty at rest. Enter
     through the same shipped renderer the app calls; the feature under test
     is the quiet block inside it, the markup, and the delegation. */
  await page.evaluate(`(function(){ if (typeof window.renderKpHomeRow === 'function') window.renderKpHomeRow(); })()`);
  await page.waitForTimeout(300);

  const out = await page.evaluate(`(function(){
    var qm = document.getElementById('kpQuietList');
    if(!qm) return { noCard: true };
    var rows = [];
    qm.querySelectorAll('.kpqrow').forEach(function(r){
      rows.push({ id: r.dataset.proj, stale: r.classList.contains('qstale'),
                  text: (r.textContent || '').trim().slice(0, 60) });
    });
    return { rows: rows, empty: !!qm.querySelector('.kpempty') };
  })()`);
  if (!out.noCard && out.rows.some(r => r.id === 'pq1')) {
    await page.evaluate(`document.querySelector('.kpqrow[data-proj="pq1"]').click()`);
    await page.waitForTimeout(900);
    out.profileOpened = await page.evaluate(`(function(){
      var pv = document.getElementById('projectView');
      return !!(pv && pv.style.display !== 'none');
    })()`);
  }
  await ctx.close();
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  if (r.noCard) return ['#kpQuietList does not exist — no Gone-quiet card'];
  const marsh = r.rows.find(x => x.id === 'pq1');
  if (!marsh) fails.push('the 40-day Approved job did not surface');
  else if (!marsh.stale) fails.push('40 days did not read as stale-red (floor is 30)');
  if (r.rows.some(x => x.id === 'pq2')) fails.push('an OnHold job surfaced — holds park by design and must be excluded');
  if (r.rows.some(x => x.id === 'pq3')) fails.push('an insurance job surfaced — the chase list owns those');
  if (marsh && r.profileOpened !== true) fails.push('tapping the quiet row did not open the client profile');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1045 RED — ${fails.length} failure(s)` : 'GATE 1045 GREEN — quiet jobs surface, exclusions hold, tap opens the client');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 3)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
