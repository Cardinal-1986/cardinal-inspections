/* harness_guide1111.js — functional gate for Build 1111 (Roof Pre-Install Guide).
   Extracts the SHIPPED cr-guide-script and drives it in jsdom against mocks:
   token fill, doc assembly, the roofing gate, the auto-send hook (fire on a roof
   build-day booking), the once-per-job guard, the missing-email capture prompt,
   and the /api/senddoc payload (filled guide, correct recipient, no raw tokens).
   Negative control: run against build 1110 → module absent → RED.
   Usage: node harness_guide1111.js [path-to-index.html]   (NODE_PATH -> jsdom) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');
let fails = 0;
function ok(c, m){ console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);
const tick = () => new Promise(r => setTimeout(r, 0));

const ST = '<script id="cr-guide-script">';
const s = html.indexOf(ST);
const e = s >= 0 ? html.indexOf('</script>', s) : -1;
if(s < 0 || e < 0){
  console.log('  ✗ FAIL cr-guide-script not present (negative control)');
  console.log('\nRED — Build 1111 module absent from ' + path.basename(APP));
  process.exit(1);
}
const script = html.slice(s + ST.length, e);

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts:'outside-only', pretendToBeVisual:true });
const w = dom.window;

// ── mock store + Supabase client ─────────────────────────────────────────────
const TPL_HTML = '<div class="chips"><div class="chip"><div class="v"><span class="cr-gtok" data-tok="install_date">your scheduled date</span></div></div></div>'
  + '<div class="bd"><p>Rep: <span class="cr-gtok" data-tok="rep_name">your sales rep</span> at <span class="cr-gtok" data-tok="rep_phone">(937) 576-6753</span>.</p></div>';
const store = { sent:{}, inserts:[], upserts:[], tpl:{ subject:'Subj', html:TPL_HTML } };
function makeSb(){
  return {
    auth:{ getSession(){ return Promise.resolve({ data:{ session:{ access_token:'tok' } } }); } },
    from(table){
      const b = { _t:table, _filters:[] };
      b.select = function(){ return this; };
      b.eq = function(k, v){ this._filters.push([k, v]); return this; };
      b.maybeSingle = function(){
        const self = this;
        return Promise.resolve().then(function(){
          if(self._t === 'company_templates') return { data: store.tpl, error:null };
          if(self._t === 'client_guide_sends'){
            const pid = (self._filters.find(f => f[0] === 'project_id') || [])[1];
            return { data: store.sent[pid] ? { project_id:pid } : null, error:null };
          }
          return { data:null, error:null };
        });
      };
      b.insert = function(p){
        const self = this;
        return Promise.resolve().then(function(){
          if(self._t === 'client_guide_sends'){ store.inserts.push(p); store.sent[p.project_id] = true; }
          return { error:null };
        });
      };
      b.upsert = function(p){
        return { then(res){ store.upserts.push(p); return Promise.resolve().then(function(){ return res({ error:null }); }); } };
      };
      return b;
    }
  };
}

// ── parent-scope globals the module reads ────────────────────────────────────
let ADMIN = true;
let TRADES = {};                 // project id -> trades array
const toasts = [], tells = [];
const fetches = [];
let PROMPT_RETURN = null;        // window.prompt result
const patchCalls = [];

w.TEAM = true;
w.sb = makeSb();
w.currentUser = { email:'nick@cardinalrenovations.net' };
w.cacheTeam = { 'nick@cardinalrenovations.net': { name:'Nick Hey', phone:'(937) 555-0142' } };
w.cacheProjects = [
  { id:'P1', name:'Daniel Whitfield', address:'128 Maple Ave', email:'daniel@example.com', sales_rep:'nick@cardinalrenovations.net' },
  { id:'P2', name:'Sandra Voss', address:'9 Oak St', email:'sandra@example.com', sales_rep:'nick@cardinalrenovations.net' },
  { id:'P3', name:'No Email', address:'3 Pine Rd', email:'', sales_rep:'nick@cardinalrenovations.net' },
  { id:'P4', name:'Already Sent', address:'5 Elm Ct', email:'al@example.com', sales_rep:'nick@cardinalrenovations.net' }
];
w.ljTrades = pr => TRADES[pr.id] || [];
w.ljAssignedEmail = pr => (pr && pr.sales_rep) || '';
w.rptRepName = email => (w.cacheTeam[email] && w.cacheTeam[email].name) || String(email || '').split('@')[0];
w.is_admin = () => ADMIN;
w.hideAllViews = () => {}; w.navSetView = () => {}; w.showHome = () => {}; w.scrollTo = () => {};
w.crTell = m => tells.push(String(m || ''));
w.crToastOk = m => toasts.push(String(m || ''));
w.patchProject = (id, fields) => { patchCalls.push({ id, fields }); return Promise.resolve(); };
w.prompt = () => PROMPT_RETURN;
w.confirm = () => true;
w.open = () => ({ document:{ open(){}, write(){}, close(){} } });
w.fetch = (url, opts) => {
  fetches.push({ url, body: JSON.parse((opts && opts.body) || '{}') });
  return Promise.resolve({ ok:true, json: () => Promise.resolve({ ok:true }) });
};

try{ w.eval(script); }
catch(err){ console.log('  ✗ FAIL module threw on eval: ' + err.message); console.log('\nRED'); process.exit(1); }

const G = w.CardinalGuide;
function lastFetch(){ return fetches[fetches.length - 1]; }

(async function(){
  // 1. exports
  ok(typeof w.__apptEmailPreInstallGuide === 'function', 'window.__apptEmailPreInstallGuide exported');
  ok(G && typeof G.open === 'function' && typeof G.send === 'function' && typeof G.fill === 'function' && typeof G.doc === 'function', 'CardinalGuide exports open/send/fill/doc');

  // 2. fill(): tokens replaced, empties fall back, no cr-gtok remains
  const filled = G.fill(TPL_HTML, { install_date:'Friday, Aug 21, 2026', rep_name:'Nick Hey', rep_phone:'(937) 555-0142' });
  ok(/Friday, Aug 21, 2026/.test(filled) && /Nick Hey/.test(filled) && /\(937\) 555-0142/.test(filled), 'fill substitutes install_date, rep_name, rep_phone');
  ok(!/cr-gtok/.test(filled), 'no cr-gtok token spans survive fill');
  const filledEmpty = G.fill(TPL_HTML, {});
  ok(/your scheduled date/.test(filledEmpty) && /your Cardinal sales rep/.test(filledEmpty) && !/cr-gtok/.test(filledEmpty), 'missing values fall back gracefully (no empty tokens)');

  // 3. doc(): full document; editable adds a contenteditable region + chip style
  const d1 = G.doc('<div class="bd">x</div>', { client_name:'Daniel Whitfield', property_address:'128 Maple Ave' }, false);
  ok(/^<!doctype html>/i.test(d1) && /Pre-Install Guide/.test(d1) && /Prepared for Daniel Whitfield/.test(d1), 'doc() builds a full letterhead document with the "Prepared for" line');
  const d2 = G.doc('<div class="bd">x</div>', {}, true);
  ok(/class="cr-edit-region" contenteditable="true"/.test(d2) && /\.cr-gtok\{/.test(d2), 'editable doc wraps the body in a contenteditable region + shows token chips');

  // 4. ctxFor(): autofill from job + appointment
  const ctx = G.ctxFor(w.cacheProjects[0], { appt_date:'2026-08-21', kind:'job' });
  ok(ctx.client_name === 'Daniel Whitfield' && ctx.property_address === '128 Maple Ave', 'ctxFor pulls client name + address');
  ok(/2026/.test(ctx.install_date) && /Aug/.test(ctx.install_date), 'ctxFor formats the install date from appt_date');
  ok(ctx.rep_name === 'Nick Hey' && ctx.rep_phone === '(937) 555-0142', 'ctxFor resolves rep name + phone');

  // 5. roofing gate
  ok(G.isNonRoofOnly({ id:'X' }) === false, 'untagged job is NOT non-roof (proceeds)');
  TRADES.X = ['Siding','Windows']; ok(G.isNonRoofOnly({ id:'X' }) === true, 'siding/windows-only job IS non-roof (skips)');
  TRADES.X = ['Roofing','Siding']; ok(G.isNonRoofOnly({ id:'X' }) === false, 'a job that includes Roofing proceeds');
  delete TRADES.X;

  // 6. auto hook: non-job appointment does nothing
  fetches.length = 0;
  w.__apptEmailPreInstallGuide({ kind:'drop', project_id:'P1' }); await tick(); await tick();
  ok(fetches.length === 0, 'a material-drop appointment does not email the guide');

  // 7. auto hook: siding-only job is skipped
  TRADES.P2 = ['Siding'];
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'P2', appt_date:'2026-09-01' }); await tick(); await tick();
  ok(fetches.length === 0, 'a build day for a siding-only job does not email the roof guide');

  // 8. auto hook: roofing job with an email → sends the filled guide via senddoc
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'P1', appt_date:'2026-08-21' });
  await tick(); await tick(); await tick();
  ok(fetches.length === 1 && /\/api\/senddoc$/.test(lastFetch().url), 'a roof build day emails the guide via /api/senddoc');
  const body = lastFetch().body || {};
  ok(body.to === 'daniel@example.com', 'senddoc recipient is the client email on file');
  ok(body.title && /Pre-Install Guide/.test(body.title), 'senddoc carries the guide title');
  ok(/Nick Hey/.test(body.html) && /Aug 21, 2026/.test(body.html) && !/cr-gtok/.test(body.html), 'the emailed html is fully auto-filled (rep + date) with no raw tokens');
  ok(store.inserts.some(i => i.project_id === 'P1' && i.kind === 'preinstall_roof'), 'the send is recorded in client_guide_sends');
  ok(toasts.some(t => /emailed to Daniel/i.test(t)), 'the rep gets a confirmation toast');

  // 9. once-guard: a second booking for the same job does NOT re-send
  fetches.length = 0;
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'P1', appt_date:'2026-08-28' });
  await tick(); await tick(); await tick();
  ok(fetches.length === 0, 'a re-book of an already-sent job does not re-send');

  // 10. missing email → prompt captures it, saves it, and sends
  fetches.length = 0; patchCalls.length = 0; PROMPT_RETURN = 'newclient@example.com';
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'P3', appt_date:'2026-09-10' });
  await tick(); await tick(); await tick(); await tick();
  ok(patchCalls.some(c => c.id === 'P3' && c.fields.email === 'newclient@example.com'), 'a missing email is captured and saved to the job');
  ok(fetches.length === 1 && lastFetch().body.to === 'newclient@example.com', 'after capture, the guide is sent to the new email');

  // 11. missing email + rep cancels the prompt → nothing sent, nothing saved
  fetches.length = 0; patchCalls.length = 0; PROMPT_RETURN = null;
  w.cacheProjects.push({ id:'P5', name:'Cancels', address:'x', email:'', sales_rep:'nick@cardinalrenovations.net' });
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'P5', appt_date:'2026-09-11' });
  await tick(); await tick(); await tick();
  ok(fetches.length === 0 && patchCalls.length === 0, 'cancelling the email prompt sends nothing and saves nothing');

  // 12. manualSend force-sends even when already sent (a deliberate re-send)
  fetches.length = 0;
  G.send(w.cacheProjects[0]);   // P1, already sent
  await tick(); await tick(); await tick();
  ok(fetches.length === 1 && lastFetch().body.to === 'daniel@example.com', 'manual send re-sends past the once-guard');

  // 13. wiring landed in the artifact
  ok(/window\.__apptEmailPreInstallGuide\(fields\)/.test(html), 'create hook wired in adb.create');
  ok(/window\.__apptEmailPreInstallGuide\(merged\)/.test(html), 'update hook wired in adb.update');
  ok(/data-cr-guide-edit/.test(html) && /Roof Pre-Install Guide/.test(html), 'editable master surfaced in Company Documents');
  ok(/data-cr-guide-send/.test(html), 'manual Email-to-client button on the job overview');
  ok(/getElementById\('cr-guide-editor'\)[\s\S]{0,80}display = 'none'/.test(html), 'editor registered in hideAllViews');
  ok(/case 'guideedit':/.test(html), 'editor registered in navRestore');

  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' failed') : '\nGREEN — all Build 1111 assertions passed');
  process.exit(fails ? 1 : 0);
})();
