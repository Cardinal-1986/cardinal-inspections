/* harness_inv1108.js — functional gate for Build 1108 (Invoices & Payments in the
   job profile, the offline payment modal, Company SMS). Runs the SHIPPED
   cr-ar-script from index.html in jsdom. Proves the job block per state, the
   offline modal writing a correctly-shaped collections row that steps the status
   forward (Theo's verify #2), the deposit/progress/final type mapping, and the
   Company SMS POST to /api/sms-link.
   Usage: node harness_inv1108.js [path-to-index.html] */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');
let fails = 0;
function ok(c, m){ console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);

const m = html.match(/<script id="cr-ar-script">([\s\S]*?)<\/script>/);
if(!m){ console.log('cr-ar-script not found'); process.exit(1); }
const scriptText = m[1];

const dom = new JSDOM('<!doctype html><html><body><div id="cr-ar-view" style="display:none;"><div id="crarBody"></div></div></body></html>',
  { runScripts: 'outside-only', url: 'https://app.cardinalroster.com/' });
const w = dom.window;

const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
// P2: invoiced, invoice sent, nothing collected. P7: contract, no invoice. P6: no contract.
let FIN = {
  P2: { value: 14800, paid: 0, balance: 14800, source:'contract' },
  P7: { value: 9000,  paid: 0, balance: 9000,  source:'contract' },
  P6: { value: 0,     paid: 0, balance: 0,     source:'none' }
};
w.cacheProjects = [
  { id:'P2', name:'Whitfield Home', address:'214 Maple Ct', stage:'Invoiced', phone:'(937) 555-0100' },
  { id:'P7', name:'Barlow Home',    address:'5 Oak St',     stage:'Approved',  phone:'937-555-0200' },
  { id:'P6', name:'Fresh Lead',     address:'9 New Rd',     stage:'Lead',      phone:'' }
];
w.cacheRows = [
  { id:'doc-P2', project_id:'P2', title:'Invoice — Whitfield', status:'sent', sent_at:daysAgo(4), created_at:daysAgo(5), share_token:'tok-p2', total:14800 }
];
w.cacheCollections = [];

w.jobFinance = pr => Object.assign({ contracts:[] }, FIN[pr.id] || { value:0, paid:0, balance:0, source:'none' });
w.normStage = s => s;
w.parseCkAll = () => ({ t_Invoiced: daysAgo(4) });
w.fmtMoney = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
w.esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let told = [];
w.crTell = s => told.push(s);
w.db = { update: (id, f) => Promise.resolve({ id, f }) };
w.currentUser = { email:'rep@cardinalrenovations.net' };
w.currentProject = null;
let acxRenders = 0; w.renderAcxOverview = () => { acxRenders++; };
let editorOpened = []; w.openEditor = id => editorOpened.push(id);
let invoiceMade = []; w.createInvoiceFor = pr => invoiceMade.push(pr.id);
w.is_admin = () => true;
w.navSetView = () => {};
w.hideAllViews = () => {}; w.showHome = () => {};

// sb: capture inserts and APPLY them to the fixture (so a reload reflects the pay)
let inserted = [];
w.sb = {
  from: function(tbl){ return { insert: function(row){
    inserted.push({ tbl, row });
    if(tbl === 'collections' && row && row.project_id && FIN[row.project_id]){
      w.cacheCollections.push(row);
      FIN[row.project_id].paid += Number(row.amount) || 0;
      FIN[row.project_id].balance = FIN[row.project_id].value - FIN[row.project_id].paid;
    }
    return Promise.resolve({ data:[row], error:null });
  } }; },
  auth: { getSession: function(){ return Promise.resolve({ data:{ session:{ access_token:'tok-abc' } } }); } }
};
w.reload = function(){ return Promise.resolve(); };  // fixture already updated by the insert mock

// capture fetch (Company SMS)
let fetched = [];
w.fetch = function(url, opts){
  fetched.push({ url:String(url), opts:opts || {} });
  return Promise.resolve({ ok:true, json:function(){ return Promise.resolve({ ok:true }); } });
};

w.__loc = { origin:'https://app.cardinalroster.com', _href:'', get href(){ return this._href; }, set href(v){ this._href = v; } };
try{ w.eval('(function(location){\n' + scriptText + '\n})(this.__loc);'); }
catch(e){ console.log('module threw: ' + e.message); process.exit(1); }

(async function(){
  const AR = w.CardinalAR;
  ok(AR && typeof AR.jobBlock === 'function', 'CardinalAR.jobBlock exported');
  ok(typeof AR.recordPayment === 'function' && typeof AR.status === 'function', 'recordPayment + status exported');

  // 1. job block per state
  const p2 = w.cacheProjects[0], p7 = w.cacheProjects[1], p6 = w.cacheProjects[2];
  const b2 = AR.jobBlock(p2, w.jobFinance(p2));
  ok(/crji-card/.test(b2) && /Invoices &amp; Payments/.test(b2), 'job block renders a card with a title');
  ok(/data-inv-sms=/.test(b2) && /data-inv-text=/.test(b2) && /data-inv-email=/.test(b2), 'invoiced job shows all three send options');
  ok(/data-inv-open=/.test(b2) && /data-inv-pay=/.test(b2), 'invoiced job shows Open invoice + Record offline');
  ok(/crar-pill sent/.test(b2), 'status pill is Sent (invoice sent, nothing collected)');
  const b7 = AR.jobBlock(p7, w.jobFinance(p7));
  ok(/data-inv-gen=/.test(b7) && !/data-inv-sms=/.test(b7), 'contract-but-no-invoice job shows Generate invoice, not send');
  ok(/data-inv-pay=/.test(b7), 'contract job can still Record offline');
  const b6 = AR.jobBlock(p6, w.jobFinance(p6));
  ok(/An invoice opens once a contract is signed/.test(b6) && !/data-inv-pay=/.test(b6), 'no-contract job shows the hint and no record button');

  // 2. status before payment
  ok(AR.status(p2).label === 'Sent', 'P2 status starts Sent');

  // 3. VERIFY #2 — offline check steps the status forward
  AR.recordPayment(p2);
  ok(!!w.document.getElementById('cr-pay-modal'), 'the offline payment modal is built');
  w.document.getElementById('crpay-amt').value = '500';
  // default method=check, type=deposit
  w.document.getElementById('crpay-save').dispatchEvent(new w.Event('click', { bubbles:true }));
  await new Promise(r => setTimeout(r, 30));
  const col = inserted.find(x => x.tbl === 'collections');
  ok(!!col, 'a collections row was inserted');
  ok(col && col.row.amount === 500 && col.row.project_id === 'P2', 'row carries the amount + project');
  ok(col && col.row.type === 'deposit' && col.row.method === 'check' && col.row.source === 'homeowner', 'row shape: type deposit, method check, source homeowner');
  ok(col && col.row.created_by === 'rep@cardinalrenovations.net', 'row records who took it');
  ok(AR.status(p2).label === 'Deposit Paid', 'after the $500 check, P2 steps Sent -> Deposit Paid');
  ok(w.document.getElementById('cr-pay-modal').classList.contains('open') === false, 'modal closes on save');

  // 4. type mapping: progress -> other, final -> final
  inserted = [];
  AR.recordPayment(p7);
  w.document.getElementById('crpay-amt').value = '1000';
  w.document.querySelector('#crpay-type [data-t="progress"]').dispatchEvent(new w.Event('click', { bubbles:true }));
  w.document.getElementById('crpay-save').dispatchEvent(new w.Event('click', { bubbles:true }));
  await new Promise(r => setTimeout(r, 30));
  const col2 = inserted.find(x => x.tbl === 'collections');
  ok(col2 && col2.row.type === 'other', 'a Progress draw maps to collections.type = other (the CHECK has no "progress")');

  // 5. Company SMS posts to /api/sms-link with the pay link + auth
  fetched = [];
  w.document.body.innerHTML += b2;  // mount P2's block so the button exists
  const smsBtn = w.document.querySelector('[data-inv-sms="P2"]');
  ok(!!smsBtn, 'a Company SMS button exists on the invoiced job');
  smsBtn.dispatchEvent(new w.Event('click', { bubbles:true }));
  await new Promise(r => setTimeout(r, 40));
  const smsCall = fetched.find(f => f.url.indexOf('/api/sms-link') >= 0);
  ok(!!smsCall, 'Company SMS calls /api/sms-link');
  if(smsCall){
    const body = JSON.parse(smsCall.opts.body || '{}');
    ok(body.project_id === 'P2' && /\/api\/share\?t=tok-p2/.test(body.url || ''), 'the POST carries project_id + the /api/share pay link');
    ok((smsCall.opts.headers || {}).Authorization === 'Bearer tok-abc', 'the POST is authenticated with the session token');
  }

  // 6. wiring landed in the artifact
  ok(/window\.CardinalAR\.jobBlock\(pr, fin\)/.test(html), 'renderAcxOverview mounts the job block');
  ok(/await db\.update\(id, \{ share_token: _itok, total: fin\.value \}\)/.test(html), 'createInvoiceFor mints token + total');
  ok(/data-arpay=/.test(html), 'AR rows gained a Record-payment action');

  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' failed') : '\nGREEN — all Build 1108 assertions passed');
  process.exit(fails ? 1 : 0);
})();
