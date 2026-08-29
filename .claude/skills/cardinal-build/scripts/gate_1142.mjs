/* gate_1142.mjs — build 1142: Service Financial plans on Roof Options.
 *
 * A financing-plan dropdown drives buildGbbHtml, which computes each tier's
 * monthly from its OWN total via amortization. Three plans:
 *   9.99% / 120 mo, 6.99% / 60 mo (amortizing), 24 mo no-payment (deferred).
 *
 * Proves against the real, exported buildGbbHtml(tiers, project, plan):
 *   1. an amortizing plan renders each tier's own computed "$X/mo" (matching
 *      the amortization formula), they DIFFER by price, and the footer names
 *      the APR, term, "Service Financial" and "W.A.C.".
 *   2. a deferred plan shows the no-payment promo in the footer and NO "/mo".
 *   3. no plan → no financing line at all.
 *   4. the picker carries the three real plans in its dropdown.
 * Control (1141 tree): RED — buildGbbHtml ignores the plan arg and there is no
 * financing dropdown.
 * Run: node gate_1142.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
if (!chromium) { console.error('gate_1142: playwright not found'); process.exit(2); }
const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1142.mjs [index.html]'); process.exit(2); }
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'].map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const html = readFileSync(FILE, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 414, height: 896 } })).newPage();
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
  if (!P || typeof P.buildGbbHtml !== 'function') { out.ok=false; out.fail.push('buildGbbHtml missing'); return out; }
  const project = { id:'p1', name:'Jim Arnett', address:'5282 Split Rail' };
  function estOf(id, total){ return { id:id, estimate_number:id, title:'Roof '+id, total:total,
    line_items:[{ name:'Tear-off', qty:1, unit:'EA', unit_price:0, amount:0 }] }; }
  const tiers = [ { est:estOf('e1',41800), label:'Oakridge' },
                  { est:estOf('e2',46783), label:'Duration' },
                  { est:estOf('e3',52140), label:'STORM' } ];
  // the app's own math + formatting, replicated to assert an exact string
  function pay(P0, apr, n){ var r=(apr/100)/12; return r===0 ? P0/n : P0*r/(1-Math.pow(1+r,-n)); }
  function moStr(v){ return '$' + v.toLocaleString('en-US',{maximumFractionDigits:0}) + '/mo'; }

  /* ---- 1: amortizing plan (9.99% / 120) ---- */
  const plan999 = { id:'sf-999-120', kind:'amort', apr:9.99, months:120 };
  const doc = P.buildGbbHtml(tiers, project, plan999);
  const expect = tiers.map(t => moStr(pay(t.est.total, 9.99, 120)));
  expect.forEach((m, i) => { if (doc.indexOf(m) === -1) out.fail.push('tier '+i+' missing computed monthly '+m); });
  if (expect[0] === expect[2]) out.fail.push('monthlies do not differ by price');
  if (doc.indexOf('9.99% APR for 120 months through Service Financial') === -1) out.fail.push('footer missing APR/term/lender');
  if (doc.indexOf('W.A.C.') === -1) out.fail.push('footer missing W.A.C.');
  // the cheapest tier's monthly should be less than the priciest
  if (!(pay(41800,9.99,120) < pay(52140,9.99,120))) out.fail.push('math ordering wrong');

  /* ---- 2: deferred plan (24 mo no payment) ---- */
  const planDef = { id:'sf-defer24', kind:'defer', apr:0, months:24 };
  const docD = P.buildGbbHtml(tiers, project, planDef);
  if (docD.indexOf('24 months no payment, no interest through Service Financial') === -1) out.fail.push('deferred: promo footer missing');
  if (/class="gbb-mo">or about/.test(docD)) out.fail.push('deferred: should show no per-column monthly');

  /* ---- 3: no plan -> no financing ---- */
  const docN = P.buildGbbHtml(tiers, project, null);
  if (docN.indexOf('through Service Financial') !== -1 || /or about \\$/.test(docN)) out.fail.push('no-plan doc still shows financing');

  /* ---- 4: the picker carries the three real plans ---- */
  if (typeof P.openOptions === 'function') {
    window.CardinalEstimates.currentProject = function(){ return project; };
    window.CardinalEstimates.loadForProject = function(){ return Promise.resolve(tiers.map(t=>t.est)); };
    await P.openOptions();
    await new Promise(res => setTimeout(res, 400));
    const sel = document.querySelector('#cr-gbb-pick .gbbp-plan');
    if (!sel) out.fail.push('picker: no financing dropdown');
    else {
      const vals = Array.from(sel.options).map(o => o.value);
      ['sf-999-120','sf-699-60','sf-defer24'].forEach(id => { if (vals.indexOf(id) === -1) out.fail.push('picker: plan missing '+id); });
      if (vals.indexOf('') === -1) out.fail.push('picker: no "None" option');
    }
  } else { out.fail.push('openOptions not exported'); }

  out.ok = out.fail.length === 0;
  return out;
})()`);
} catch (e) {
  console.error('gate_1142: harness threw:', String(e).split('\n')[0]);
  await browser.close();
  process.exit(1);
}
await browser.close();

if (r && r.ok) {
  console.log('gate_1142 GREEN — computed monthlies, deferred promo, and the plan dropdown all wired');
  process.exit(0);
} else {
  console.log('gate_1142 RED');
  (r ? r.fail : ['no result']).forEach(f => console.log('   ✗ ' + f));
  process.exit(1);
}
