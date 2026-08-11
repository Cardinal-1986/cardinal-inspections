import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const APP_HTML = readFileSync(APP, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await browser.newContext()).newPage();
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const result = await page.evaluate(() => {
  const out = { checks: [], hasIndexColl: (typeof indexCollections === 'function') };
  function chk(name, cond, detail) { out.checks.push({ name, pass: !!cond, detail }); }

  // A project priced by manual_value, with a legacy payments[] of $3,000
  const ck = JSON.stringify({ lead: { claim_type: 'retail' }, manual_value: 10000, payments: [{ dir: 'in', amt: 3000 }] });
  const P = { id: 'P-with-coll', name: 'HasColl', stage: 'Invoiced', checklist: ck };
  const Q = { id: 'Q-no-coll', name: 'NoColl', stage: 'Invoiced', checklist: ck };

  // seed the render caches the way reload() would
  if (typeof cacheRows !== 'undefined') window.cacheRows = [];
  if (typeof estBest !== 'undefined') window.estBest = {};
  if (typeof ctrSigned !== 'undefined') window.ctrSigned = {};

  // build collPaid from two collection rows on P only (Q has none)
  if (typeof indexCollections === 'function') {
    indexCollections([{ project_id: 'P-with-coll', amount: 5000 }, { project_id: 'P-with-coll', amount: 1500 }]);
    chk('indexCollections sums per project', typeof collPaid !== 'undefined' && collPaid['P-with-coll'] === 6500, 'collPaid.P=' + (typeof collPaid !== 'undefined' ? collPaid['P-with-coll'] : 'n/a'));
    chk('project without collections is absent from collPaid', typeof collPaid !== 'undefined' && collPaid['Q-no-coll'] === undefined, 'collPaid.Q=' + (typeof collPaid !== 'undefined' ? collPaid['Q-no-coll'] : 'n/a'));
  } else {
    chk('indexCollections exists', false, 'function not defined (pre-patch build)');
  }

  const finP = window.jobFinance(P);
  const finQ = window.jobFinance(Q);
  // P: value from manual (10000); paid must come from collections (6500), NOT legacy 3000
  chk('P value = manual 10000', finP.value === 10000, 'value=' + finP.value);
  chk('P paid = collections 6500 (legacy 3000 ignored)', finP.paid === 6500, 'paid=' + finP.paid);
  chk('P balance = 10000 - 6500 = 3500', finP.balance === 3500, 'balance=' + finP.balance);
  // Q: no collections -> legacy payments 3000 used
  chk('Q paid = legacy 3000 (no collections)', finQ.paid === 3000, 'paid=' + finQ.paid);
  chk('Q balance = 10000 - 3000 = 7000', finQ.balance === 7000, 'balance=' + finQ.balance);
  return out;
});

console.log('indexCollections present:', result.hasIndexColl);
let fails = 0;
for (const c of result.checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name} (${c.detail})`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
