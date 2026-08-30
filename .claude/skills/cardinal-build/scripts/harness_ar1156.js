/* harness_ar1156.js — Build 1156: the AR view's reminder line + mute switch.
   Runs the SHIPPED cr-ar-script in jsdom. Proves: every AR row renders a
   reminder slot; remWire() reads payment_reminders + projects.reminders_muted
   DIRECTLY (not from caches) and paints "Reminded ×N · last <date>" /
   "Auto-reminders off"; the Mute button writes projects.reminders_muted via
   the client and repaints; and the artifact carries the stamp, CHANGELOG
   entry and CSS. Negative control: run against the 1155 artifact → RED.
   Usage: node harness_ar1156.js [path-to-index.html] */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');

let fails = 0, checks = 0;
function ok(cond, msg){ checks++; console.log((cond ? '  ✓ ' : '  ✗ FAIL ') + msg); if(!cond) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);

const m = html.match(/<script id="cr-ar-script">([\s\S]*?)<\/script>/);
if(!m){ console.log('cr-ar-script not found'); process.exit(1); }
const scriptText = m[1];

const dom = new JSDOM(`<!doctype html><html><body>
  <div id="arCard"></div>
  <div id="cr-ar-view" style="display:block;">
    <button id="crarClose"></button><button id="crarRefresh"></button>
    <div class="crar-master"><span class="crar-mstate" id="crarMasterState">Checking…</span><button id="crarMaster" disabled>…</button></div>
    <span id="crarKpiOut"></span><span id="crarKpiMonth"></span>
    <span id="crarKpiOver"></span><span id="crarKpiOutSub"></span><span id="crarKpiOverSub"></span>
    <div id="crarBody"></div>
  </div>
</body></html>`, { runScripts: 'outside-only', url: 'https://app.cardinalroster.com/' });
const w = dom.window;

const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
let FIN = { P1: { value: 9200, paid: 0, balance: 9200 }, P2: { value: 7000, paid: 0, balance: 7000 } };
w.cacheProjects = [
  { id: 'P1', name: 'Alder Property', address: '88 Corbin Ave', stage: 'Invoiced' },
  { id: 'P2', name: 'Whitfield Home', address: '214 Maple Ct', stage: 'Invoiced' }
];
w.cacheRows = [
  { id: 'doc-P1', project_id: 'P1', title: 'Invoice — P1', status: 'sent', sent_at: daysAgo(9), created_at: daysAgo(10), share_token: 'tok-p1', total: 9200 },
  { id: 'doc-P2', project_id: 'P2', title: 'Invoice — P2', status: 'sent', sent_at: daysAgo(5), created_at: daysAgo(6), share_token: 'tok-p2', total: 7000 }
];
w.cacheCollections = [];
w.jobFinance = pr => Object.assign({ source: 'contract' }, FIN[pr.id]);
w.normStage = s => s;
w.parseCkAll = () => ({});
w.fmtMoney = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
w.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let told = [];
w.crTell = s => told.push(s);
w.db = { update: () => Promise.resolve() };
w.navSetView = () => {};
w.hideAllViews = () => {};
w.showHome = () => {};
w.is_admin = () => true;
w.__locStub = { origin: 'https://app.cardinalroster.com', _href: '', get href(){ return this._href; }, set href(v){ this._href = v; } };

/* the supabase-client mock remWire and the mute toggle talk to */
const REMLOG = [
  { project_id: 'P1', sent_at: daysAgo(2), ok: true },
  { project_id: 'P1', sent_at: daysAgo(9), ok: true },
  { project_id: 'P1', sent_at: daysAgo(16), ok: false }   /* a failed attempt must NOT count */
];
let MUTED = { P1: false, P2: true };
let MASTER_DB = { present: true, value: true };   /* the 1157 switch row */
let updates = [], upserts = [], queried = [];
w.sb = { from: function(table){
  const q = { t: table, op: 'select' };
  const self = {
    select: function(cols){ q.cols = cols; return self; },
    in: function(col, ids){ q.ids = ids; return self; },
    order: function(){ return self; },
    update: function(fields){ q.op = 'update'; q.fields = fields; return self; },
    upsert: function(row){ q.op = 'upsert'; q.row = row; return self; },
    eq: function(col, v){ q.eq = v; return self; },
    then: function(fn, rej){
      queried.push(q.t + ':' + q.op);
      let out;
      if(q.t === 'payment_reminders') out = { data: REMLOG.slice().sort((a, b) => a.sent_at < b.sent_at ? 1 : -1), error: null };
      else if(q.t === 'projects' && q.op === 'select') out = { data: Object.keys(MUTED).map(id => ({ id, reminders_muted: MUTED[id] })), error: null };
      else if(q.t === 'projects' && q.op === 'update'){ updates.push({ id: q.eq, fields: q.fields }); MUTED[q.eq] = !!q.fields.reminders_muted; out = { data: null, error: null }; }
      else if(q.t === 'app_settings' && q.op === 'select') out = { data: MASTER_DB.present ? [{ value: MASTER_DB.value }] : [], error: null };
      else if(q.t === 'app_settings' && q.op === 'upsert'){ upserts.push(q.row); MASTER_DB = { present: true, value: q.row.value === true }; out = { data: null, error: null }; }
      else out = { data: [], error: null };
      return Promise.resolve(out).then(fn, rej);
    }
  }; return self;
} };

try{ w.eval('(function(location){\n' + scriptText + '\n})(this.__locStub);'); }
catch(e){ console.log('module threw on eval: ' + e.message); console.log('\nRED'); process.exit(1); }

(async function(){
  ok(typeof w.renderAR === 'function', 'module loads and exports renderAR');
  w.renderAR();
  const slots = w.document.querySelectorAll('[data-remfor]');
  ok(slots.length === 2, 'every AR row renders a reminder slot (' + slots.length + ')');

  await new Promise(r => setTimeout(r, 30));   /* let remWire settle */
  ok(queried.indexOf('payment_reminders:select') !== -1, 'remWire reads payment_reminders directly');
  ok(queried.indexOf('projects:select') !== -1, 'remWire reads projects.reminders_muted directly (NOT from caches — the loader does not select it)');

  /* every read below is null-guarded so the NEGATIVE CONTROL (the 1155
     artifact, no slots at all) reports RED with a count instead of crashing —
     BUG_CLASSES 37: a control that dies before printing proves nothing. */
  const s1 = w.document.querySelector('[data-remfor="P1"]');
  ok(!!s1 && /Reminded ×2 · last/.test(s1.textContent), 'P1 shows "Reminded ×2 · last <date>" — the failed attempt is not counted — got ' + JSON.stringify(s1 ? s1.textContent : null));
  const s2 = w.document.querySelector('[data-remfor="P2"]');
  ok(!!s2 && /Auto-reminders off/.test(s2.textContent), 'a muted job reads "Auto-reminders off"');
  const b1 = s1 && s1.querySelector('[data-armute]'), b2 = s2 && s2.querySelector('[data-armute]');
  ok(!!b1 && b1.textContent === 'Mute' && b1.getAttribute('data-on') === '1', 'an active job offers Mute');
  ok(!!b2 && b2.textContent === 'Turn on' && b2.getAttribute('data-on') === '0', 'a muted job offers Turn on');
  ok(!!b1 && b1.className.indexOf('crar-btn') !== -1, 'the toggle reuses .crar-btn (the 44px touch floor holds)');

  /* the toggle writes and repaints */
  told = []; updates = [];
  if(b1) b1.dispatchEvent(new w.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 30));
  ok(updates.length === 1 && updates[0].id === 'P1' && updates[0].fields.reminders_muted === true,
     'Mute writes projects.reminders_muted=true for that job only');
  ok(told.length === 1 && /muted/i.test(told[0]), 'and says so (' + JSON.stringify(told[0] || null) + ')');
  const s1b = w.document.querySelector('[data-remfor="P1"]');
  ok(!!s1b && /Auto-reminders off/.test(s1b.textContent), 'the row repaints as off after muting');

  /* unmute goes the other way */
  updates = [];
  const b1b = s1b && s1b.querySelector('[data-armute]');
  if(b1b) b1b.dispatchEvent(new w.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 30));
  ok(updates.length === 1 && updates[0].fields.reminders_muted === false, 'Turn on writes reminders_muted=false');

  /* ── the 1157 MASTER SWITCH ── */
  const mst = w.document.getElementById('crarMasterState'), mbtn = w.document.getElementById('crarMaster');
  ok(queried.indexOf('app_settings:select') !== -1, 'remWire reads the master switch from app_settings');
  ok(!!mst && /On — unpaid retail invoices/.test(mst.textContent), 'header reads On when the row says true — got ' + JSON.stringify(mst ? mst.textContent : null));
  ok(!!mbtn && mbtn.textContent === 'Turn off' && !mbtn.disabled, 'the button offers Turn off');
  told = []; upserts = [];
  if(mbtn) mbtn.dispatchEvent(new w.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 30));
  ok(upserts.length === 1 && upserts[0].key === 'payment_reminders_enabled' && upserts[0].value === false,
     'Turn off upserts payment_reminders_enabled=false');
  ok(told.length === 1 && /OFF/.test(told[0]), 'and says so (' + JSON.stringify(told[0] || null) + ')');
  const mst2 = w.document.getElementById('crarMasterState');
  ok(!!mst2 && /Off — no reminder texts go out/.test(mst2.textContent), 'header repaints as Off');
  const s1c = w.document.querySelector('[data-remfor="P1"]');
  ok(!!s1c && /Paused — reminders are off company-wide/.test(s1c.textContent),
     'an unmuted row reads "Paused — company-wide" while the switch is off');
  const s2c = w.document.querySelector('[data-remfor="P2"]');
  ok(!!s2c && /Auto-reminders off/.test(s2c.textContent), 'a per-job muted row keeps its own label');
  upserts = [];
  const mbtn2 = w.document.getElementById('crarMaster');
  if(mbtn2) mbtn2.dispatchEvent(new w.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 30));
  ok(upserts.length === 1 && upserts[0].value === true, 'Turn on flips it back');
  const s1d = w.document.querySelector('[data-remfor="P1"]');
  ok(!!s1d && /Reminded ×2 · last/.test(s1d.textContent), 'and the rows return to their own state (P1 has history, so "Reminded ×2") — got ' + JSON.stringify(s1d ? s1d.textContent : null));

  /* the artifact around the module */
  ok(html.indexOf('v2026-08-30 build 1157') !== -1, 'the app stamp reads build 1157');
  ok(/\{ b: 1157, d: '2026-08-30', t: 'Reminders master switch'/.test(html), 'the CHANGELOG carries the 1157 entry');
  ok(html.indexOf('#cr-ar-view .crar-master{') !== -1, 'the master-switch CSS shipped');
  ok(/\{ b: 1156, d: '2026-08-30', t: 'Automatic payment reminders'/.test(html), 'the CHANGELOG carries the 1156 entry');
  ok(html.indexOf('#cr-ar-view .crar-remtx') !== -1, 'the reminder-line CSS shipped in cr-ar-styles');
  ok(html.indexOf('#cr-ar-view .crar-remtx.off') !== -1, 'including the muted (amber) state');

  const FLOOR = 26;
  ok(checks >= FLOOR, 'coverage floor: ' + checks + ' checks ran (>= ' + FLOOR + ')');
  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' of ' + checks + ' failed')
                    : ('\nGREEN — all ' + checks + ' Build 1156 UI assertions passed'));
  process.exit(fails ? 1 : 0);
})();
