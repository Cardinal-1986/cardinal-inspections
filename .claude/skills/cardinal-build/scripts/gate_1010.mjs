// gate_1010.mjs — proves the "Received" heading no longer opens the legacy
// money-in modal (build 1010 closes 996's missed second door).
//
// It extracts the SHIPPED #paySummary click handler from index.html, mounts the
// real Payment Information section markup in a real Chromium DOM, attaches the
// handler, and dispatches real clicks — so closest() traversal is genuine, not
// hand-mocked. Stubs record which routing function each tap calls.
//
// Contract:
//   Received (data-paysec="in") heading tap  -> payGoLogCollection, NOT openPayRow('in')
//   Paid    (data-paysec="out") heading tap  -> openPayRow('out', null)
//   Expenses(data-paysec="exp") heading tap  -> openPayRow('exp', null)
//   + button (data-payadd="in")              -> payGoLogCollection      (996 still holds)
//   a data-payedit row tap                    -> openPayRow(null, <index>) (edit legacy row)
//   a data-paycontracts row tap               -> openContractPaid
//
// Usage:
//   node gate_1010.mjs                    # working tree index.html  -> GREEN
//   node gate_1010.mjs <path/index.html>  # negative control (build 1009) -> RED
//
// Negative control: against build 1009 the Received heading tap calls
// openPayRow('in') and NOT payGoLogCollection, so assertion [1a]/[1b] fail RED.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/opt/node22/lib/node_modules/x.js');
const { chromium } = require('playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const TARGET = process.argv[2] || path.join(REPO, 'index.html');

// ---- extract the shipped #paySummary click handler body ---------------------
function extractHandlerBody(src) {
  const anchor = "getElementById('paySummary').addEventListener('click', function(e){";
  const at = src.indexOf(anchor);
  if (at === -1) throw new Error('paySummary click handler anchor not found in ' + TARGET);
  // start just after the opening brace of function(e){
  let i = at + anchor.length - 1;            // points at the '{'
  let depth = 0, start = i + 1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { return src.slice(start, i); } }
  }
  throw new Error('could not brace-match the paySummary handler');
}

const src = fs.readFileSync(TARGET, 'utf8');
let body;
try { body = extractHandlerBody(src); }
catch (e) { console.error('FAILED to extract handler: ' + e.message); process.exit(1); }

// Real section markup, matching renderPayments()'s output closely enough that
// closest() resolves the same way it does in the app.
const MARKUP = `
<div id="paySummary">
  <div class="paysec" data-paysec="in">
    <div class="payhead"><span id="in-head-label">Received</span><b>$0</b></div>
    <div class="payrow" data-paycontracts="1"><span id="contracts-row">From signed contracts</span><b>$0</b></div>
    <div class="payrow" data-payedit="0"><span id="edit-row">Payment</span><b>$100</b></div>
    <button class="payadd" id="add-in" data-payadd="in" type="button">+ Log a payment received</button>
  </div>
  <div class="paysec" data-paysec="out">
    <div class="payhead"><span id="out-head-label">Paid</span><b>$0</b></div>
    <button class="payadd" id="add-out" data-payadd="out" type="button">+ Add new row to Paid</button>
  </div>
  <div class="paysec" data-paysec="exp">
    <div class="payhead"><span id="exp-head-label">Additional Job Expenses</span><b>$0</b></div>
    <button class="payadd" id="add-exp" data-payadd="exp" type="button">+ Add new row to Additional Job Expenses</button>
  </div>
</div>`;

const PAGE = `<!doctype html><html><body>${MARKUP}
<script>
  window.__calls = [];
  function rec(fn){ return function(){ window.__calls.push({ fn: fn, args: Array.prototype.slice.call(arguments) }); }; }
  var openPayRow        = rec('openPayRow');
  var payGoLogCollection= rec('payGoLogCollection');
  var openContractPaid  = rec('openContractPaid');
  var payMigrateLegacyIn= rec('payMigrateLegacyIn');
  document.getElementById('paySummary').addEventListener('click', function(e){ ${body} });
  window.__clickAndRead = function(sel){
    window.__calls = [];
    var el = document.querySelector(sel);
    if(!el){ return { error: 'no element ' + sel }; }
    el.click();
    return { calls: window.__calls };
  };
<\/script></body></html>`;

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());
const page = await browser.newPage();
await page.setContent(PAGE, { waitUntil: 'load' });

const click = (sel) => page.evaluate((s) => window.__clickAndRead(s), sel);
const called = (r, fn) => (r.calls || []).some(c => c.fn === fn);
const calledWith = (r, fn, pred) => (r.calls || []).some(c => c.fn === fn && pred(c.args));

// [1] Received heading -> payGoLogCollection, NOT openPayRow('in')
{
  const r = await click('#in-head-label');
  ok(!r.error, `[1] Received heading: ${r.error || ''}`);
  ok(called(r, 'payGoLogCollection'), `[1a] Received heading must call payGoLogCollection; calls=${JSON.stringify(r.calls)}`);
  ok(!calledWith(r, 'openPayRow', a => a[0] === 'in'), `[1b] Received heading must NOT open the legacy dir:in modal; calls=${JSON.stringify(r.calls)}`);
}
// [2] Paid heading -> openPayRow('out', null)
{
  const r = await click('#out-head-label');
  ok(calledWith(r, 'openPayRow', a => a[0] === 'out' && a[1] === null),
     `[2] Paid heading must call openPayRow('out', null); calls=${JSON.stringify(r.calls)}`);
}
// [3] Expenses heading -> openPayRow('exp', null)
{
  const r = await click('#exp-head-label');
  ok(calledWith(r, 'openPayRow', a => a[0] === 'exp' && a[1] === null),
     `[3] Expenses heading must call openPayRow('exp', null); calls=${JSON.stringify(r.calls)}`);
}
// [4] + button data-payadd=in -> payGoLogCollection (996 regression guard)
{
  const r = await click('#add-in');
  ok(called(r, 'payGoLogCollection') && !calledWith(r, 'openPayRow', a => a[0] === 'in'),
     `[4] + Log-payment-received must route to payGoLogCollection; calls=${JSON.stringify(r.calls)}`);
}
// [5] edit row -> openPayRow(null, 0) (editing a legacy row still works)
{
  const r = await click('#edit-row');
  ok(calledWith(r, 'openPayRow', a => a[0] === null && a[1] === 0),
     `[5] edit row must call openPayRow(null, 0); calls=${JSON.stringify(r.calls)}`);
}
// [6] contracts row -> openContractPaid
{
  const r = await click('#contracts-row');
  ok(called(r, 'openContractPaid'), `[6] contracts row must call openContractPaid; calls=${JSON.stringify(r.calls)}`);
}

await browser.close();

if (fails.length) {
  console.error('RED — gate_1010 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1010: Received heading routes to Money In (payGoLogCollection); Paid/Expenses/edit/contracts unchanged.');
