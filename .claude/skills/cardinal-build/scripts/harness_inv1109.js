/* harness_inv1109.js — functional gate for Build 1109 (live status/balance card +
   payment ledger on the invoice document). Extracts the SHIPPED wireInvoiceLive
   from index.html and runs it against a mock invoice document. Proves the balance
   card + status, the PAID IN FULL swap, the payment ledger, the non-invoice skip,
   idempotency, and that every injected node is data-cardinal-live (so
   serializeFrame strips it on save).
   Usage: node harness_inv1109.js [path-to-index.html] */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');
let fails = 0;
function ok(c, m){ console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);

// extract  var INV_LIVE_CSS = ... ;  function wireInvoiceLive(...) { ... }
const a = html.indexOf('var INV_LIVE_CSS = ');
const b = html.indexOf('function serializeFrame(){');
if(a < 0 || b < 0 || b <= a){ console.log('injector block not found'); process.exit(1); }
const block = html.slice(a, b).trim();

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
const w = dom.window;

// parent-scope globals the injector reads
let FIN = { P1: { value:14800, paid:7400, balance:7400, source:'contract' },
            P2: { value:12000, paid:12000, balance:0, source:'contract' } };
w.cacheProjects = [ { id:'P1', name:'Whitfield Home' }, { id:'P2', name:'Barlow Home' } ];
w.jobFinance = pr => Object.assign({ contracts:[] }, FIN[pr.id] || { value:0, paid:0, balance:0 });
w.fmtMoney = (n, cents) => (n < 0 ? '-' : '') + '$' + Math.abs(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
w.esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
w.fmtDay = iso => String(iso || '').slice(0, 10);
w.CardinalAR = { status: pr => (FIN[pr.id].balance <= 0 ? { k:'paid', label:'Paid in Full' } : { k:'part', label:'Deposit Paid' }) };
const D0 = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
w.cacheCollections = [ { project_id:'P1', collected_at:D0, amount:7400, type:'deposit', method:'check', notes:'Offline check #2231 (recorded on-site)' } ];

try{ w.eval(block); }
catch(e){ console.log('injector threw on eval: ' + e.message); process.exit(1); }
ok(typeof w.wireInvoiceLive === 'function', 'wireInvoiceLive extracted + parses');

// a mock invoice document (isolated), mirroring the real INVOICE_BODY summary table
function makeInvoiceDoc(){
  const d = w.document.implementation.createHTMLDocument('inv');
  d.body.innerHTML =
    '<div class="secthead">INVOICE</div>' +
    '<div class="secthead">SUMMARY</div>' +
    '<table><tbody>' +
      '<tr><td>Contract Price</td><td>$14,800.00</td></tr>' +
      '<tr><td>Payments Received</td><td>-$7,400.00</td></tr>' +
      '<tr><td>BALANCE DUE</td><td id="estTotal">$7,400.00</td></tr>' +
    '</tbody></table>' +
    '<p>Please remit the balance due upon receipt.</p>';
  return d;
}

// 1. balance-due card + status + ledger, placed above the SUMMARY table
let doc = makeInvoiceDoc();
w.wireInvoiceLive(doc, { title:'Invoice — Whitfield', project_id:'P1' });
const card = doc.getElementById('cr-inv-live');
ok(!!card, 'a balance card is injected on an invoice');
ok(/Current Balance Due/.test(card.innerHTML) && /\$7,400\.00/.test(card.innerHTML), 'card shows the live Current Balance Due ($7,400.00)');
ok(/Deposit Paid/.test(card.innerHTML), 'card carries the live status pill');
const sums = Array.from(doc.querySelectorAll('.secthead')).filter(e => /summary/i.test(e.textContent));
ok(sums.length && card.compareDocumentPosition(sums[0]) & 4 /* card precedes SUMMARY */, 'card sits above the SUMMARY section');
const ledger = doc.getElementById('cr-inv-ledger');
ok(!!ledger && /Payment History/.test(ledger.innerHTML), 'a Payment History ledger is injected');
ok(/#2231/.test(ledger.innerHTML) && /Check/.test(ledger.innerHTML) && /Deposit/.test(ledger.innerHTML), 'ledger row shows method+ref (Check #2231) and type (Deposit)');
ok(/Total paid/.test(ledger.innerHTML), 'ledger shows a running total');

// 2. every injected node is data-cardinal-live (so serializeFrame strips it)
const live = doc.querySelectorAll('[data-cardinal-live]');
ok(live.length === 3, 'card + ledger + style are all marked data-cardinal-live (' + live.length + ')');
// simulate serializeFrame's strip
const clone = doc.documentElement.cloneNode(true);
clone.querySelectorAll('[data-cardinal-live]').forEach(el => el.remove());
ok(clone.querySelectorAll('[data-cardinal-live]').length === 0 && !/cr-inv-live/.test(clone.outerHTML), 'the strip removes the whole live layer (never saved)');

// 3. PAID IN FULL swap
let doc2 = makeInvoiceDoc();
w.cacheCollections.push({ project_id:'P2', collected_at:D0, amount:12000, type:'final', method:'card', notes:'Online card payment via secure link' });
w.wireInvoiceLive(doc2, { title:'Invoice — Barlow', project_id:'P2' });
const card2 = doc2.getElementById('cr-inv-live');
ok(card2 && /PAID IN FULL/.test(card2.innerHTML) && card2.className === 'paid', 'a fully-paid invoice swaps to a PAID IN FULL badge');
ok(/Paid in full on/.test(card2.innerHTML) && new RegExp(D0).test(card2.innerHTML), 'PAID card shows the final payment date');

// 4. non-invoice doc is left alone
let doc3 = makeInvoiceDoc();
w.wireInvoiceLive(doc3, { title:'Contract — Roofing — Whitfield', project_id:'P1' });
ok(!doc3.getElementById('cr-inv-live') && !doc3.getElementById('cr-inv-ledger'), 'a contract (non-invoice) gets no live layer');

// 5. idempotent — a second call does not duplicate
w.wireInvoiceLive(doc, { title:'Invoice — Whitfield', project_id:'P1' });
ok(doc.querySelectorAll('#cr-inv-live').length === 1 && doc.querySelectorAll('#cr-inv-ledger').length === 1, 're-running does not duplicate the card/ledger');

// 6. print safety + wiring landed in the artifact
ok(/@media print\{[\s\S]*print-color-adjust:exact/.test(html), 'print rules keep the badges exact/crisp');
ok(/wireInvoiceLive\(doc, r\);/.test(html), 'the editor onload calls wireInvoiceLive');
ok(/clone\.querySelectorAll\('\[data-cardinal-live\]'\)\.forEach/.test(html), 'serializeFrame strips the live layer on save');

clearTimeout(wd);
console.log(fails ? ('\nRED — ' + fails + ' failed') : '\nGREEN — all Build 1109 assertions passed');
process.exit(fails ? 1 : 0);
