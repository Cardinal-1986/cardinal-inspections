/* harness_lrs1110.js — functional gate for Build 1110 (Labor Rate Schedule).
   Extracts the SHIPPED cr-lrs-script + #cr-lrs-view markup from index.html and
   drives it in jsdom against a mock pricing_items catalog. Proves: exports, the
   admin gate, render + category grouping, rate formatting (money + unit-label
   map, ls = flat/no-unit, note = no rate), edit-mode inputs, harvest read-back,
   and that Save emits the right insert / update / delete ops. Also checks the
   six wiring edits landed in the artifact.
   Negative control: run against the build-1109 tree and the module is absent —
   the block extraction fails and the gate goes RED.
   Usage: node harness_lrs1110.js [path-to-index.html]   (NODE_PATH -> jsdom) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');
let fails = 0;
function ok(c, m){ console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);
const tick = () => new Promise(r => setTimeout(r, 0));

// ── extract the shipped script + the view markup (negative control fires here) ──
const ST = '<script id="cr-lrs-script">';
const s = html.indexOf(ST);
const e = s >= 0 ? html.indexOf('</script>', s) : -1;
const vs = html.indexOf('<div id="cr-lrs-view"');
if(s < 0 || e < 0 || vs < 0 || vs >= s){
  console.log('  ✗ FAIL cr-lrs module not present (negative control)');
  console.log('\nRED — Build 1110 module absent from ' + path.basename(APP));
  process.exit(1);
}
const script = html.slice(s + ST.length, e);
const markup = html.slice(vs, s);   // <div id="cr-lrs-view">…</div> + whitespace

// ── mock catalog + Supabase client ──────────────────────────────────────────
const ROWS = [
  { id:'r1', template:'roofing_labor', category:'Shingle Installation', name:'Shingle install, 2/12 to 8/12 pitch', description:'Dump fees reimbursed at cost', unit:'sq', rate:95, sort_order:110 },
  { id:'r2', template:'roofing_labor', category:'Shingle Installation', name:'Additional layer removal', description:'Per layer', unit:'sq', rate:10, sort_order:130 },
  { id:'r3', template:'roofing_labor', category:'Ventilation and Flashing', name:'Ridge vent cut out', description:null, unit:'lf', rate:2, sort_order:220 },
  { id:'r4', template:'roofing_labor', category:'Chimney Flashing', name:'Small chimney', description:'Perimeter up to 8 LF', unit:'ls', rate:150, sort_order:410 },
  { id:'r5', template:'roofing_labor', category:'Chimney Flashing', name:'Note', description:'Chimney factors considered at assignment.', unit:'note', rate:0, sort_order:490 },
  { id:'r6', template:'roofing_labor', category:'Decking and Wood Replacement', name:'OSB, individually replaced', description:null, unit:'sheet', rate:15, sort_order:510 },
  { id:'r7', template:'roofing_labor', category:'Decking and Wood Replacement', name:'Replace 1x boards', description:null, unit:'lf', rate:2.5, sort_order:540 }
];
const store = { rows: ROWS.map(r => Object.assign({}, r)), inserts: [], updates: [], deletes: [] };
function makeSb(){
  return { from(){
    const b = { _op:null, _payload:null, _filters:[] };
    b.select = function(){ this._op = 'select'; return this; };
    b.eq = function(k, v){ this._filters.push([k, v]); return this; };
    b.order = function(){ return this; };
    b.insert = function(p){ this._op = 'insert'; this._payload = p; return this; };
    b.update = function(p){ this._op = 'update'; this._payload = p; return this; };
    b.delete = function(){ this._op = 'delete'; return this; };
    b.then = function(res, rej){
      if(this._op === 'insert') store.inserts.push(this._payload);
      if(this._op === 'update') store.updates.push({ payload:this._payload, filters:this._filters });
      if(this._op === 'delete') store.deletes.push({ filters:this._filters });
      const out = this._op === 'select' ? { data: store.rows.map(r => Object.assign({}, r)), error:null } : { error:null };
      return Promise.resolve().then(() => res(out));
    };
    return b;
  } };
}

// ── jsdom world ──────────────────────────────────────────────────────────────
const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.document.body.innerHTML = markup;
let ADMIN = true;
let lastTell = '';
w.is_admin = () => ADMIN;
w.esc = str => String(str == null ? '' : str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
w.crTell = m => { lastTell = String(m || ''); };
w.hideAllViews = () => {};
w.navSetView = () => {};
w.showHome = () => {};
w.scrollTo = () => {};
w.sb = makeSb();

try{ w.eval(script); }
catch(err){ console.log('  ✗ FAIL module threw on eval: ' + err.message); console.log('\nRED'); process.exit(1); }

const q = id => w.document.getElementById(id);
const body = () => q('lrs-body');

(async function(){
  // 1. exports
  ok(typeof w.openLRS === 'function', 'window.openLRS exported');
  ok(w.CardinalLRS && typeof w.CardinalLRS.open === 'function' && typeof w.CardinalLRS.close === 'function', 'window.CardinalLRS exports open/close');

  // 2. non-admin is refused (crew rates are admin-only)
  ADMIN = false; lastTell = '';
  w.openLRS();
  await tick();
  ok(/admin/i.test(lastTell), 'non-admin open is refused with an admin-only notice');
  ok(!body().querySelector('.lrs-doc'), 'non-admin sees no document rendered');

  // 3. admin open renders the Exhibit-A document
  ADMIN = true;
  w.openLRS();
  await tick();
  const doc = body().querySelector('.lrs-doc');
  ok(!!doc, 'admin open renders the .lrs-doc');
  ok(/EXHIBIT A/.test(doc.textContent) && /LABOR RATE SCHEDULE/.test(doc.textContent), 'header reads EXHIBIT A | LABOR RATE SCHEDULE');
  ok(q('cr-lrs-view').style.display === 'block', 'the view is shown (display:block)');

  // 4. category grouping — one band per category, in sort order
  const bands = Array.from(body().querySelectorAll('.lrs-band')).map(b => b.textContent.trim());
  ok(bands.length === 4, 'four category bands rendered (' + bands.length + ')');
  ok(bands[0] === 'SHINGLE INSTALLATION' && bands[bands.length - 1] === 'DECKING AND WOOD REPLACEMENT', 'bands are uppercased and in sort order');

  // 5. rate formatting: money, unit-label map, ls (flat/no unit), note (no rate), sheet, fractional
  const H = body().innerHTML;
  ok(/\$95<span class="lrs-u">\s*\/ SQ<\/span>/.test(H) || (/\$95/.test(H) && /\/ SQ/.test(H)), 'sq rate shows "$95 / SQ"');
  ok(/\/ LF/.test(H), 'lf rate shows "/ LF"');
  ok(/\/ sheet/.test(H), 'sheet rate shows "/ sheet"');
  ok(/\$2\.50/.test(H), 'fractional rate shows two decimals ($2.50)');
  // ls row: flat $150, no "/ unit" suffix on that row
  const lsRow = Array.from(body().querySelectorAll('.lrs-row')).find(r => /Small chimney/.test(r.textContent));
  ok(lsRow && /\$150/.test(lsRow.textContent) && !/\//.test(lsRow.querySelector('.lrs-rate').textContent), 'ls (flat) row shows $150 with no unit suffix');
  // note row: rendered as .lrs-note with the text, no rate cell
  const noteEl = body().querySelector('.lrs-note');
  ok(!!noteEl && /Chimney factors/.test(noteEl.textContent) && !noteEl.querySelector('.lrs-rate'), 'note renders as an italic note with no rate');

  // 6. edit mode — inputs appear
  q('lrs-edit').click();
  await tick();
  ok(body().querySelector('input[data-f="rate"]') && body().querySelector('select[data-f="unit"]'), 'Edit renders rate inputs and unit selects');
  ok(body().querySelector('[data-lrs-addrow]') && body().querySelector('#lrs-addcat'), 'Edit shows "+ Add line" and "+ Add category"');
  ok(q('lrs-save').style.display !== 'none' && q('lrs-cancel').style.display !== 'none', 'Save + Cancel appear in edit mode');

  // 7. harvest read-back: change a rate, then verify Save emits an update with the new value.
  //    (In edit mode the name lives in an <input value>, not textContent, so target by data-id.)
  const rateInp = body().querySelector('.lrs-row[data-id="r1"] input[data-f="rate"]');
  ok(!!rateInp, 'the Shingle-install row (r1) has a rate input in edit mode');
  rateInp.value = '105';

  // add a new line, fill its name, so Save emits an insert
  body().querySelector('[data-lrs-addrow]').click();
  await tick();
  const newNameInp = Array.from(body().querySelectorAll('input[data-f="name"]')).find(i => i.value === '');
  ok(!!newNameInp, '"+ Add line" adds a blank editable row');
  newNameInp.value = 'Valley metal';

  // delete an existing row (the lf ridge vent, r3) so Save emits a delete
  const delBtn = body().querySelector('[data-lrs-del="r3"]');
  ok(!!delBtn, 'each editable line has a delete control');
  delBtn.click();
  await tick();

  // 8. Save emits the right ops
  store.inserts.length = 0; store.updates.length = 0; store.deletes.length = 0;
  q('lrs-save').click();
  await tick(); await tick();
  const upd = store.updates.find(u => Number(u.payload.rate) === 105);
  ok(!!upd, 'Save UPDATEs the edited row with its new rate (105)');
  const ins = store.inserts.find(i => i.name === 'Valley metal');
  ok(!!ins && ins.template === 'roofing_labor', 'Save INSERTs the new line under the roofing_labor template');
  ok(store.deletes.some(d => d.filters.some(f => f[0] === 'id' && f[1] === 'r3')), 'Save DELETEs the removed row by id');
  ok(store.inserts.every(i => !('id' in i)) , 'inserts never carry the synthetic client id');

  // 9. blank new lines are skipped on save (no name)
  store.inserts.length = 0;
  q('lrs-edit').click(); await tick();
  body().querySelector('[data-lrs-addrow]').click(); await tick();   // add a blank line, leave it empty
  q('lrs-save').click(); await tick(); await tick();
  ok(store.inserts.every(i => (i.name || '').trim() !== '' || i.unit === 'note'), 'a blank new line is not inserted');

  // 10. wiring edits landed in the artifact
  ok(/data-nav="laborrates"/.test(html), 'nav row present');
  ok(/nav === 'laborrates'/.test(html), 'nav router branch present');
  ok(/getElementById\('cr-lrs-view'\)[\s\S]{0,80}display = 'none'/.test(html), 'registered in hideAllViews');
  ok(/case 'laborrates':/.test(html), 'registered in navRestore');
  ok(/hideOpt\('laborrates'\)/.test(html), 'hidden from non-admins in hideAdminItemsForNonAdmin');
  ok(/--lrs-gold-dk:#8f6b00/.test(html) && /\.lrs-h span\{color:var\(--lrs-gold-dk\)/.test(html), 'title accent uses the 4.9:1 deep gold on white');

  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' failed') : '\nGREEN — all Build 1110 assertions passed');
  process.exit(fails ? 1 : 0);
})();
