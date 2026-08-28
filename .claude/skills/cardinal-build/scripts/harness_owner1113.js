/* harness_owner1113.js — functional gate for Build 1113 (Owner drawer section +
   Owner Console Strategy area). Extracts the SHIPPED cr-owner-script, drives the
   real open()/render() in jsdom with mocked tables, and proves the Strategy
   section renders (editable Business Plan + Market/Competitors from
   company_templates + a 9-tile KPI scoreboard), the admin Edit → textarea → Save
   round-trip (upsert to company_templates), and the non-admin gate. Also checks
   the drawer "Owner" section wiring in the artifact.
   Negative control: build 1112 has no Strategy code → RED.
   Usage: node harness_owner1113.js [path-to-index.html]   (NODE_PATH -> jsdom) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');
let fails = 0;
function ok(c, m){ console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);
const tick = () => new Promise(r => setTimeout(r, 0));

const ST = '<script id="cr-owner-script">';
const s = html.indexOf(ST);
const e = s >= 0 ? html.indexOf('</script>', s) : -1;
const script = e > s ? html.slice(s + ST.length, e) : '';
if(s < 0 || !/function strategyHTML\(\)/.test(script)){
  console.log('  ✗ FAIL Strategy section not present (negative control)');
  console.log('\nRED — Build 1113 Strategy code absent from ' + path.basename(APP));
  process.exit(1);
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts:'outside-only', pretendToBeVisual:true });
const w = dom.window;

// mock store: two seeded strategy docs + captured upserts
const store = {
  templates: [
    { slug:'owner_biz_plan', subject:'Business Plan — the recurring-revenue play', html:'<p><b>Engine A</b> — Cardinal Care membership. <b>Engine B</b> — retail financing.</p>' },
    { slug:'owner_competitors', subject:'Market & Competitors — Miami Valley', html:'<p>OC Platinum gap. Bone Dry + DryTech are the threats.</p>' }
  ],
  upserts: []
};
let ADMIN = true;
function qb(table){
  const b = { _t:table, _op:'select', _payload:null };
  b.select = function(){ this._op = 'select'; return this; };
  b.order = function(){ return this; };
  b.eq = function(){ return this; };
  b.in = function(){ return this; };
  b.upsert = function(p){ this._op = 'upsert'; this._payload = p; store.upserts.push(p); return this; };
  b.insert = function(p){ this._op = 'insert'; this._payload = p; const self = this;
    return { select(){ return { single(){ return Promise.resolve({ data:Object.assign({ id:'x'+Math.random() }, p), error:null }); } }; } }; };
  b.then = function(res){
    const self = this;
    return Promise.resolve().then(function(){
      let out;
      if(self._t === 'company_templates' && self._op === 'select') out = { data: store.templates.slice(), error:null };
      else if(self._op === 'upsert') out = { error:null };
      else out = { data: [], error:null };
      return res(out);
    });
  };
  return b;
}
w.sb = { from:qb, storage:{ from(){ return { createSignedUrl(){ return Promise.resolve({ data:null, error:null }); } }; } } };
w.currentUser = { email:'theo@cardinalrenovations.net' };
w.isAdminUser = () => ADMIN;
w.crTell = () => {};
w.hideAllViews = () => {};
w.showHome = () => {};

try{ w.eval(script); }
catch(err){ console.log('  ✗ FAIL module threw on eval: ' + err.message); console.log('\nRED'); process.exit(1); }
ok(w.CardinalOwner && typeof w.CardinalOwner.open === 'function', 'CardinalOwner.open exported');

const q = sel => w.document.querySelector(sel);
const qa = sel => Array.from(w.document.querySelectorAll(sel));

(async function(){
  // open the console (paints, loads, repaints)
  await w.CardinalOwner.open();
  await tick(); await tick(); await tick();

  const wrap = q('#cr-owner .ow-wrap');
  ok(!!wrap, 'the console view rendered');

  // 1. Strategy section present with both docs + KPI scoreboard
  const strat = qa('#cr-owner .ow-strat');
  ok(strat.length >= 2, 'two Strategy docs render (Business Plan + Competitors)');
  ok(/Cardinal Care membership/.test(wrap.innerHTML) && /retail financing/.test(wrap.innerHTML), 'the Business Plan content renders from company_templates');
  ok(/Bone Dry \+ DryTech/.test(wrap.innerHTML), 'the Competitor content renders from company_templates');
  ok(qa('#cr-owner .ow-kpi').length === 9, 'the KPI scoreboard shows all nine tiles');
  ok(/Members &amp; MRR/.test(wrap.innerHTML) && /Crew utilization/.test(wrap.innerHTML), 'KPI tiles carry the recurring-revenue metrics');

  // 2. admin sees an Edit button on each doc
  const edits = qa('#cr-owner [data-act="strat-edit"]');
  ok(edits.length === 2, 'admin gets an Edit control on each Strategy doc');

  // 3. Edit → a textarea with the raw content appears
  const bizEdit = edits.find(b => b.getAttribute('data-slug') === 'owner_biz_plan');
  ok(!!bizEdit, 'the Business Plan Edit control carries its slug');
  bizEdit.click();
  await tick();
  const ta = q('#cr-owner #ow-strat-ta');
  ok(!!ta && /Cardinal Care membership/.test(ta.value), 'Edit opens a textarea holding the current content');
  ok(!!q('#cr-owner [data-act="strat-save"]'), 'Save + Cancel appear in edit mode');

  // 4. edit the text and Save → upsert to company_templates
  ta.value = '<p>Rewritten plan: launch Cardinal Care in Q1.</p>';
  store.upserts.length = 0;
  q('#cr-owner [data-act="strat-save"]').click();
  await tick(); await tick(); await tick();
  const up = store.upserts.find(u => u.slug === 'owner_biz_plan');
  ok(!!up && /Rewritten plan/.test(up.html), 'Save upserts the edited Business Plan to company_templates');
  ok(/Rewritten plan/.test(q('#cr-owner .ow-wrap').innerHTML), 'the saved content re-renders in place');
  ok(!q('#cr-owner #ow-strat-ta'), 'the editor closes after saving');

  // 5. non-admin sees the docs but no Edit controls
  ADMIN = false;
  await w.CardinalOwner.reload();
  await tick(); await tick();
  ok(qa('#cr-owner .ow-strat').length >= 2 && qa('#cr-owner [data-act="strat-edit"]').length === 0, 'a non-admin sees the Strategy content but no Edit controls');
  ADMIN = true;

  // 6. wiring in the artifact
  ok(/makeSec\('cr-nav-sec-owner', 'Owner'\)/.test(html), 'the drawer gets its own "Owner" section');
  ok(/insertBefore\(ownerSec, anchor\)/.test(html), 'the Owner section is inserted into the menu');
  ok(/vaultHTML\(\) \+ strategyHTML\(\)/.test(html), 'render() includes the Strategy section');
  ok((script.match(/\['[^']+',/g) || []).length >= 9 && /KPIS = \[/.test(script), 'the KPI scoreboard is defined');

  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' failed') : '\nGREEN — all Build 1113 assertions passed');
  process.exit(fails ? 1 : 0);
})();
