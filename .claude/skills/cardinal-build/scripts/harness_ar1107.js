/* harness_ar1107.js — functional gate for Build 1107 Invoices & AR.
   Runs the SHIPPED cr-ar-script from index.html in jsdom against real data
   shapes. Proves: the derived status engine, aging buckets + KPI math, the
   Sent -> Deposit Paid recalc when a collection lands (verify #1), and the
   pre-filled SMS carrying the /api/share?t=<token> pay link (verify #2).
   Usage: node harness_ar1107.js [path-to-index.html]  (default ../../../.../index.html) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');

let fails = 0;
function ok(cond, msg){ console.log((cond ? '  ✓ ' : '  ✗ FAIL ') + msg); if(!cond) fails++; }

// watchdog — a hung boot must not look like a slow pass
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);

// pull ONLY the shipped module script
const m = html.match(/<script id="cr-ar-script">([\s\S]*?)<\/script>/);
if(!m){ console.log('cr-ar-script not found in artifact'); process.exit(1); }
const scriptText = m[1];

// ---- minimal DOM the module reads (the ids it queries) ----
const dom = new JSDOM(`<!doctype html><html><body>
  <div class="pipecard opscard" id="arCard"><div id="arWrap"></div><div id="arTotal"></div></div>
  <div id="cr-ar-view" style="display:none;">
    <button id="crarClose"></button><button id="crarRefresh"></button>
    <span id="crarKpiOut"></span><span id="crarKpiMonth"></span>
    <span id="crarKpiOver"></span><span id="crarKpiOutSub"></span><span id="crarKpiOverSub"></span>
    <div id="crarBody"></div>
  </div>
</body></html>`, { runScripts: 'outside-only', url: 'https://app.cardinalroster.com/' });
const w = dom.window;

// ---- data fixtures (real shapes) ----
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
function inv(pid, status, age, tok){
  return { id: 'doc-' + pid, project_id: pid, title: 'Invoice — ' + pid,
           status: status, sent_at: status === 'sent' ? daysAgo(age) : null,
           created_at: daysAgo(age + 1), share_token: tok || null, total: 0 };
}
// P1 Sent 3d, P2 Deposit(1 coll) 6d, P3 Partial(2 coll) 21d, P4 Sent 41d overdue,
// P5 Paid-in-full (excluded), P6 Lead no-invoice (excluded)
let FIN = {
  P1: { value: 9200,  paid: 0,     balance: 9200 },
  P2: { value: 14800, paid: 7400,  balance: 7400 },
  P3: { value: 18600, paid: 9300,  balance: 9300 },
  P4: { value: 9400,  paid: 0,     balance: 9400 },
  P5: { value: 12000, paid: 12000, balance: 0 },
  P6: { value: 5000,  paid: 0,     balance: 5000 }
};
w.cacheProjects = [
  { id:'P1', name:'Alder Property', address:'88 Corbin Ave', stage:'Invoiced' },
  { id:'P2', name:'Whitfield Home', address:'214 Maple Ct', stage:'Invoiced' },
  { id:'P3', name:'Novak Home',     address:'1450 Ridgeway Rd', stage:'Invoiced' },
  { id:'P4', name:'Cardwell Home',  address:'903 Hilltop Dr', stage:'Invoiced' },
  { id:'P5', name:'Paid Home',      address:'1 Done St', stage:'Invoiced' },
  { id:'P6', name:'Fresh Lead',     address:'2 New Rd', stage:'Lead' }
];
w.cacheRows = [
  inv('P1','sent',3,'tok-p1'), inv('P2','unsent',6,'tok-p2'),
  inv('P3','unsent',21,'tok-p3'), inv('P4','sent',41,'tok-p4'),
  inv('P5','sent',10,'tok-p5')
];
w.cacheCollections = [
  { project_id:'P2', amount:7400, collected_at: daysAgo(6) },
  { project_id:'P3', amount:4650, collected_at: daysAgo(21) },
  { project_id:'P3', amount:4650, collected_at: daysAgo(10) },  // 2 draws -> Partially Paid
  { project_id:'P5', amount:12000, collected_at: daysAgo(10) }
];

// ---- mocks for app globals the module calls ----
const AGE = { P1:3, P2:6, P3:21, P4:41, P5:10 };  // days since invoiced
w.jobFinance   = pr => Object.assign({ contracts:[], source:'contract' }, FIN[pr.id] || { value:0, paid:0, balance:0 });
w.normStage    = s => s;                          // module calls normStage(pr.stage)
w.parseCkAll   = pr => ({ t_Invoiced: daysAgo(AGE[pr.id] || 0) });  // Invoiced-stage timestamp
w.fmtMoney     = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
w.esc          = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let told = [];
w.crTell       = s => told.push(s);
let updated = [];
w.db           = { update: (id, fields) => { updated.push({ id, fields }); return Promise.resolve(); } };
let navSet = [];
w.navSetView   = (v) => navSet.push(v);
w.hideAllViews = () => {};
w.showHome     = () => {};
let opened = [];
w.openProject  = (id) => opened.push(id);
let madeInv = [];
w.createInvoiceFor = (pr) => madeInv.push(pr.id);
w.reload       = () => { w.__reloaded = true; if(typeof w.renderAR === 'function') w.renderAR(); };
let adminFlag = true;
w.is_admin     = () => adminFlag;
// jsdom's window.location is non-configurable, so shadow it inside the module
// via a wrapper param instead of redefining the global.
w.__locStub = { origin:'https://app.cardinalroster.com', _href:'', get href(){ return this._href; }, set href(v){ this._href = v; } };
const HREF = () => w.__locStub._href;
const RESET_HREF = () => { w.__locStub._href = ''; };

// ---- run the shipped module (with `location` shadowed) ----
try{ w.eval('(function(location){\n' + scriptText + '\n})(this.__locStub);'); }
catch(e){ console.log('module threw on eval: ' + e.message); process.exit(1); }

(async function(){
  // 1. registration
  ok(typeof w.openAR === 'function', 'window.openAR exported');
  ok(typeof w.renderAR === 'function', 'window.renderAR exported');
  ok(w.CardinalAR && typeof w.CardinalAR.list === 'function', 'window.CardinalAR.list exported');

  // 2. the AR set — invoiced + balance>0 only, oldest first
  const list = w.CardinalAR.list();
  ok(list.length === 4, 'arList has 4 owed rows (P5 paid-in-full and P6 lead excluded), got ' + list.length);
  ok(list.map(x => x.pr.id).join(',') === 'P4,P3,P2,P1', 'sorted oldest-first: ' + list.map(x=>x.pr.id).join(','));
  ok(!list.some(x => x.pr.id === 'P5'), 'paid-in-full job is not in AR');
  ok(!list.some(x => x.pr.id === 'P6'), 'un-invoiced lead is not in AR');

  // 3. the status engine
  const byId = {}; list.forEach(x => byId[x.pr.id] = x);
  ok(byId.P1.st.label === 'Sent', 'P1 (nothing collected, doc sent) = Sent');
  ok(byId.P2.st.label === 'Deposit Paid', 'P2 (one draw) = Deposit Paid');
  ok(byId.P3.st.label === 'Partially Paid', 'P3 (two draws) = Partially Paid');
  ok(byId.P4.st.k === 'sent' && byId.P4.age > 30, 'P4 = Sent AND overdue (age ' + byId.P4.age + ')');

  // 4. aging buckets: P4 is 30+, P3 is 15-30, P1/P2 current
  ok(byId.P4.age > 30 && byId.P3.age >= 15 && byId.P3.age <= 30 && byId.P1.age < 15, 'aging buckets place each row correctly');

  // 5. render() KPIs + rows
  w.renderAR();
  const out = w.document.getElementById('crarKpiOut').textContent;
  const over = w.document.getElementById('crarKpiOver').textContent;
  ok(out === '$35,300', 'Total outstanding KPI = $35,300 (9200+7400+9300+9400), got ' + out);
  ok(over === '$9,400', 'Overdue 30+ KPI = $9,400 (P4 only), got ' + over);
  const bodyHtml = w.document.getElementById('crarBody').innerHTML;
  ok(/Deposit Paid/.test(bodyHtml) && /Partially Paid/.test(bodyHtml), 'rendered rows carry the status pills');
  ok(/crar-row od/.test(bodyHtml), 'overdue row gets the red stripe class');

  // 6. VERIFY #1 — a deposit lands on P1 (Sent) -> Deposit Paid, total drops
  FIN.P1 = { value: 9200, paid: 4600, balance: 4600 };
  w.cacheCollections.push({ project_id:'P1', amount:4600, collected_at: daysAgo(0) });
  const after = w.CardinalAR.list();
  const p1b = after.find(x => x.pr.id === 'P1');
  ok(p1b.st.label === 'Deposit Paid', 'after a draw records, P1 moves Sent -> Deposit Paid');
  w.renderAR();
  const out2 = w.document.getElementById('crarKpiOut').textContent;
  ok(out2 === '$30,700', 'Total outstanding recomputed to $30,700 after the $4,600 draw (35,300 - 4,600), got ' + out2);

  // 7. VERIFY #2 — Text link builds a pre-filled sms: with the /api/share?t= link
  RESET_HREF();
  const btn = w.document.querySelector('[data-artext="P2"]');
  ok(!!btn, 'a Text-link button exists on an invoiced row');
  btn.dispatchEvent(new w.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 20));   // let the linkFor promise settle
  ok(HREF().indexOf('sms:?&body=') === 0, 'Text opens a pre-filled SMS, got: ' + HREF().slice(0, 24));
  ok(/api%2Fshare%3Ft%3Dtok-p2/.test(HREF()), 'the SMS carries the hosted pay link /api/share?t=<token>');

  // 8. an un-tokened invoice mints one via db.update before building the link
  updated = []; RESET_HREF();
  w.cacheRows.find(r => r.project_id === 'P3').share_token = null;
  const btn3 = w.document.querySelector('[data-arcopy="P3"]');
  if(btn3){ btn3.dispatchEvent(new w.Event('click', { bubbles: true })); await new Promise(r => setTimeout(r, 20)); }
  ok(updated.some(u => u.fields && u.fields.share_token), 'a missing share_token is minted + persisted via db.update');

  // 9. admin gate
  adminFlag = false;
  told = [];
  w.openAR();
  ok(w.document.getElementById('cr-ar-view').style.display === 'none' && told.length > 0, 'non-admin is refused with a message');
  adminFlag = true;
  w.openAR();
  ok(w.document.getElementById('cr-ar-view').style.display === 'block', 'admin opens the view');
  ok(navSet.indexOf('ar') !== -1, 'opening records nav history (navSetView "ar")');

  // 10. the wiring edits landed in the artifact (not just the module)
  ok(/else if\(nav === 'ar'\)\{ if\(typeof openAR/.test(html), 'nav router has the ar case');
  ok(/case 'ar':\s+if\(typeof openAR/.test(html), 'navRestore has the ar case');
  ok(/var _arv = document\.getElementById\('cr-ar-view'\)/.test(html), 'hideAllViews registers cr-ar-view');
  ok(/data-nav="ar" data-cri="cash lg">Invoices/.test(html), 'the Invoices & AR nav row exists');
  ok(/hideOpt\('ar'\)/.test(html), 'the nav row is admin-gated');
  ok(/cacheCollections = collections \|\| \[\]/.test(html), 'indexCollections populates cacheCollections');

  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' assertion(s) failed') : '\nGREEN — all AR assertions passed');
  process.exit(fails ? 1 : 0);
})();
