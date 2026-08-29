/* gate_1142.mjs — Service Financial plans on Roof Options (1142, catalog 1143).
 *
 * buildGbbHtml(tiers, project, plan) computes each tier's monthly per plan
 * family:
 *   factor  -> total x payment factor   (reduced-interest loans)
 *   equal0  -> total / months           (0% equal payments)
 *   fema    -> amortize over the paying term at the stated rate
 *   samecash / defermin -> NO per-column monthly; promo in the footer.
 *
 * Proves against the real, exported buildGbbHtml, using the shipped catalog
 * ids (window.CardinalEstimatePublish exposes buildGbbHtml + openOptions):
 *   1. a reduced-interest plan (#4212, 9.99% / 60, factor 2.12%) renders each
 *      tier's own total x 2.12%, they DIFFER by price, footer names APR/term/
 *      lender/W.A.C.
 *   2. a 0% equal-payment plan (#3060) renders total / 60.
 *   3. a same-as-cash plan (#2024) shows the promo footer and NO "/mo".
 *   4. a FEMA plan (#4612) renders an amortized "/mo".
 *   5. no plan -> no financing.
 *   6. the picker groups the catalog into <optgroup>s carrying the real ids.
 * Control (1142 tree, placeholder plans): RED — those ids don't exist / the
 * factor math and optgroups aren't there.
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
  function moStr(v){ return '$' + v.toLocaleString('en-US',{maximumFractionDigits:0}) + '/mo'; }
  function amort(P0, apr, n){ var r=(apr/100)/12; return r===0 ? P0/n : P0*r/(1-Math.pow(1+r,-n)); }

  /* ---- 1: reduced-interest factor plan #4212 (9.99% / 60, factor 2.12%) ---- */
  const p4212 = { id:'4212', group:'reduced', kind:'factor', rate:9.99, months:60, factor:2.12, min:1000, max:100000 };
  const doc = P.buildGbbHtml(tiers, project, p4212);
  const expect = tiers.map(t => moStr(t.est.total * 2.12 / 100));
  expect.forEach((m, i) => { if (doc.indexOf(m) === -1) out.fail.push('tier '+i+' missing factor monthly '+m); });
  if (expect[0] === expect[2]) out.fail.push('monthlies do not differ by price');
  if (doc.indexOf('9.99% APR \\u00b7 60 months through Service Financial') === -1 && doc.indexOf('9.99% APR \u00b7 60 months through Service Financial') === -1) out.fail.push('footer missing APR/term/lender');
  if (doc.indexOf('W.A.C.') === -1) out.fail.push('footer missing W.A.C.');

  /* ---- 2: 0% equal-payment plan #3060 -> total / 60 ---- */
  const p3060 = { id:'3060', group:'equal0', kind:'equal0', months:60, min:1000, max:100000 };
  const doc0 = P.buildGbbHtml(tiers, project, p3060);
  if (doc0.indexOf(moStr(46783/60)) === -1) out.fail.push('0% plan: wrong equal monthly');
  if (doc0.indexOf('0% interest') === -1) out.fail.push('0% plan: footer missing');

  /* ---- 3: same-as-cash #2024 -> promo, no per-column monthly ---- */
  const p2024 = { id:'2024', group:'samecash', kind:'samecash', months:24, min:1000, max:100000 };
  const docC = P.buildGbbHtml(tiers, project, p2024);
  if (docC.indexOf('same as cash') === -1) out.fail.push('same-as-cash: promo footer missing');
  if (/class="gbb-mo">or about/.test(docC)) out.fail.push('same-as-cash: should show no per-column monthly');

  /* ---- 4: FEMA #4612 (6 defer, 60 pay, 9.99%) -> amortized /mo ---- */
  const p4612 = { id:'4612', group:'fema', kind:'fema', deferMonths:6, payMonths:60, rate:9.99, months:60, min:500, max:100000 };
  const docF = P.buildGbbHtml(tiers, project, p4612);
  if (docF.indexOf(moStr(amort(46783, 9.99, 60))) === -1) out.fail.push('FEMA: wrong amortized monthly');
  if (docF.indexOf('6 months no payment') === -1) out.fail.push('FEMA: footer missing defer period');

  /* ---- 5: no plan -> no financing ---- */
  const docN = P.buildGbbHtml(tiers, project, null);
  if (docN.indexOf('through Service Financial') !== -1 || /or about \\$/.test(docN)) out.fail.push('no-plan doc still shows financing');

  /* ---- 6: the picker groups the real catalog ---- */
  if (typeof P.openOptions === 'function') {
    window.CardinalEstimates.currentProject = function(){ return project; };
    window.CardinalEstimates.loadForProject = function(){ return Promise.resolve(tiers.map(t=>t.est)); };
    await P.openOptions();
    await new Promise(res => setTimeout(res, 400));
    const sel = document.querySelector('#cr-gbb-pick .gbbp-plan');
    if (!sel) out.fail.push('picker: no financing dropdown');
    else {
      const groups = sel.querySelectorAll('optgroup');
      if (groups.length < 4) out.fail.push('picker: expected >=4 optgroups, got ' + groups.length);
      const vals = Array.from(sel.options).map(o => o.value);
      ['4212','3060','2024','4612','4132'].forEach(id => { if (vals.indexOf(id) === -1) out.fail.push('picker: plan missing #'+id); });
      if (vals.indexOf('') === -1) out.fail.push('picker: no "None" option');
      if (vals.length < 30) out.fail.push('picker: catalog looks short (' + vals.length + ' options)');
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
  console.log('gate_1142 GREEN — factor/0%/same-as-cash/FEMA math and the grouped catalog all wired');
  process.exit(0);
} else {
  console.log('gate_1142 RED');
  (r ? r.fail : ['no result']).forEach(f => console.log('   ✗ ' + f));
  process.exit(1);
}
