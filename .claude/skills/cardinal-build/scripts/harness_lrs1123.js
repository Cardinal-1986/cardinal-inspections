/* harness_lrs1123.js — functional gate for Build 1123 (Labor Rate Schedule:
   crew list first, then that crew's own sheet, rates in crew_rates).

   Extracts the SHIPPED cr-lrs-script and drives the real open() → tap a crew →
   edit → save against a mock that answers with production-shaped rows, so the
   trade rule, the crew_rates join and every write are proved on the code that
   ships rather than a re-implementation.

   The money assertions are the point: a roofing crew sees the shared catalog
   lines with ITS OWN rate; a siding crew starts empty; a line with no agreed
   price reads "not set" and never borrows another crew's number; a save writes
   crew_rates and never pricing_items.

   Negative control: build 1122 reads pricing_items and has no crew list → RED.
   Usage: node harness_lrs1123.js [path-to-index.html]   (NODE_PATH -> jsdom) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');
let fails = 0, checks = 0;
function ok(c, m){ checks++; console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);
const tick = () => new Promise(r => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 8; i++) await tick(); };

const ST = '<script id="cr-lrs-script">';
const s0 = html.indexOf(ST);
const mod = s0 < 0 ? '' : html.slice(s0 + ST.length, html.indexOf('</script>', s0));
if(!mod || !/data-lrs-crew/.test(mod) || !/crew_rates/.test(mod)){
  console.log('  ✗ FAIL the crew list / crew_rates code is absent (negative control)');
  console.log('\nRED — Build 1123 LRS code absent from ' + path.basename(APP));
  process.exit(1);
}

/* the view markup, lifted from the artifact so the harness cannot drift from it */
const vs = html.indexOf('<div id="cr-lrs-view"');
const view = html.slice(vs, html.indexOf('<div id="lrs-body"></div>', vs) + '<div id="lrs-body"></div>\n</div>'.length);

const dom = new JSDOM('<!doctype html><html><body>' + view + '</body></html>',
  { runScripts:'outside-only', pretendToBeVisual:true, url:'https://app.cardinalroster.com/' });
const w = dom.window, doc = w.document;

/* ── production-shaped rows ───────────────────────────────────────────── */
const CREWS = [
  { id:'c-santiago', name:'Santiago Gutierrez', trade:'Roofing',         archived:false },
  { id:'c-daniel',   name:'Daniel Sarceno',     trade:'Roofing',         archived:false },
  { id:'c-ronaldo',  name:'Ronaldo',            trade:'Siding',          archived:false },
  { id:'c-amanda',   name:'Amanda Hoskins',     trade:'General Repairs', archived:false },
  { id:'c-cameron',  name:'Cameron Deaton',     trade:'Windows',         archived:true  }
];
const CATALOG = [
  { id:'p1', template:'roofing_labor', category:'Shingle Installation', name:'Tear off and haul', description:'per square', unit:'sq',   rate:45,  sort_order:10 },
  { id:'p2', template:'roofing_labor', category:'Shingle Installation', name:'Install architectural', description:null,     unit:'sq',   rate:95,  sort_order:20 },
  { id:'p3', template:'roofing_labor', category:'Ventilation and Flashing', name:'Ridge vent', description:null,            unit:'lf',   rate:5,   sort_order:30 },
  /* the note row — prose, not a line anyone is paid for */
  { id:'p4', template:'roofing_labor', category:'Chimney Flashing (priced by perimeter)', name:'Note',
    description:'Measured around the base, not the flue.', unit:'note', rate:0, sort_order:40 }
];
/* Santiago carries the seeded catalog rates; Daniel only one; nobody else any */
let RATES = [
  { id:'r1', crew_id:'c-santiago', pricing_item_id:'p1', custom_name:null, custom_unit:null, rate:45 },
  { id:'r2', crew_id:'c-santiago', pricing_item_id:'p2', custom_name:null, custom_unit:null, rate:95 },
  { id:'r3', crew_id:'c-daniel',   pricing_item_id:'p1', custom_name:null, custom_unit:null, rate:38 },
  { id:'r4', crew_id:'c-ronaldo',  pricing_item_id:null, custom_name:'Lap siding, per square', custom_unit:'sq', rate:62 }
];
const writes = [];   /* every table write, in order */

function qb(table){
  const b = { _t:table, _f:{} };
  b.select = function(){ return this; };
  b.order  = function(){ return this; };
  b.eq = function(k, v){ this._f[k] = v; return this; };
  b.insert = function(p){ writes.push({ op:'insert', table:table, payload:p }); return this._done({ error:null }); };
  b.update = function(p){ this._u = p; const self = this;
    return { eq(k, v){ writes.push({ op:'update', table:table, id:v, payload:p }); return Promise.resolve({ error:null }); } }; };
  b.delete = function(){ const self = this;
    return { eq(k, v){ writes.push({ op:'delete', table:table, id:v }); return Promise.resolve({ error:null }); } }; };
  b._done = function(v){ return { then:(r)=>Promise.resolve().then(()=>r(v)) }; };
  b.then = function(res){
    const self = this;
    return Promise.resolve().then(function(){
      if(self._t === 'crews')        return res({ data: CREWS.slice(), error:null });
      if(self._t === 'pricing_items')return res({ data: CATALOG.slice(), error:null });
      if(self._t === 'crew_rates'){
        const cid = self._f.crew_id;
        return res({ data: (cid ? RATES.filter(r => r.crew_id === cid) : RATES).map(r => Object.assign({}, r)), error:null });
      }
      return res({ data: [], error:null });
    });
  };
  return b;
}
let ADMIN = true;
w.sb = { from:qb };
w.is_admin = () => ADMIN;
w.currentUser = { email:'theo@cardinalrenovations.net' };
w.crTell = m => { w.__tell = m; };
w.hideAllViews = () => {};
w.showHome = () => { w.__home = true; };

let threw = '';
try{ w.eval(mod); }catch(err){ threw = err.message; }
ok(!threw, 'the module evaluates clean' + (threw ? ' — ' + threw : ''));
ok(w.CardinalLRS && typeof w.CardinalLRS.open === 'function', 'window.CardinalLRS.open survives the rework');
ok(typeof w.openLRS === 'function', 'window.openLRS survives — the nav router calls it by name');

const $  = s => doc.querySelector(s);
const $$ = s => Array.from(doc.querySelectorAll(s));
const txt = () => ($('#lrs-body') || {}).textContent || '';
const title = () => ($('#cr-lrs-view .lrs-ttl') || {}).textContent || '';

(async function(){
  /* ── screen 1: the crew list ─────────────────────────────────────── */
  await w.CardinalLRS.open();
  await settle();

  ok($('#cr-lrs-view').style.display === 'block', 'the view opens');
  ok(title() === 'Labor Rate Schedule', 'the list is titled for the screen, not a crew');
  const btns = $$('[data-lrs-crew]');
  ok(btns.length === 5, 'every crew is listed, archived included (' + btns.length + ')');
  ok(!$('.lrs-doc'), 'it does NOT open straight onto a document — that was the bug');
  ok(/Roofing/.test(txt()) && /Siding/.test(txt()) && /General Repairs/.test(txt()),
     'crews are grouped by trade');
  ok(/Archived/.test(txt()), 'archived crews are separated, not hidden');

  /* the count chip is what tells you who still needs rates */
  const santiagoBtn = btns.find(b => /Santiago/.test(b.textContent));
  const ronaldoBtn  = btns.find(b => /Ronaldo/.test(b.textContent));
  const amandaBtn   = btns.find(b => /Amanda/.test(b.textContent));
  ok(/2 rates/.test(santiagoBtn.textContent), 'a crew with rates says how many (' + santiagoBtn.textContent.trim() + ')');
  ok(/no rates yet/.test(amandaBtn.textContent), 'a crew with none says so plainly');

  /* the topbar is right for a list */
  ok($('#lrs-edit').style.display === 'none', 'Edit is hidden on the list — there is nothing to edit yet');
  ok($('#lrs-print').style.display === 'none', 'Print is hidden on the list — it is not a document');

  /* ── screen 2: a ROOFING crew ────────────────────────────────────── */
  santiagoBtn.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();

  ok(!!$('.lrs-doc'), 'tapping a crew opens their sheet');
  ok(title() === 'Santiago Gutierrez', 'the topbar names the crew');
  ok(/SANTIAGO GUTIERREZ/.test($('.lrs-h').textContent), 'and so does the document head — not a hardcoded name');
  ok($('#lrs-print').style.display !== 'none', 'Print appears on a sheet');
  ok($('#lrs-edit').style.display !== 'none', 'so does Edit, for an admin');

  const rows = $$('.lrs-row');
  ok(rows.length === 3, 'a roofing crew gets the shared catalog lines (' + rows.length + ' of 3 rate lines)');
  ok($$('.lrs-note').length === 1 && /Measured around the base/.test(txt()),
     'the catalog NOTE renders as a note, not as a rate line');
  ok(!$$('.lrs-note')[0].hasAttribute('data-key'),
     'and it carries no data-key, so a save can never treat it as a blank rate');

  const sheet = txt();
  ok(/\$45/.test(sheet) && /\$95/.test(sheet), "Santiago's own rates render");
  ok(/not set/.test(sheet), 'the line he has no rate for reads "not set"');
  const ridge = rows.find(r => /Ridge vent/.test(r.textContent));
  ok(/not set/.test(ridge.textContent) && !/\$5\b/.test(ridge.textContent),
     'and it does NOT fall back to the catalog price — that is another crew’s money');

  /* ── a second roofing crew sees the same lines, different money ──── */
  $('#lrs-back').dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();
  ok(!$('.lrs-doc') && $$('[data-lrs-crew]').length === 5, 'Back returns to the crew list');

  $$('[data-lrs-crew]').find(b => /Daniel/.test(b.textContent))
    .dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();
  const dan = txt();
  ok($$('.lrs-row').length === 3, 'Daniel sees the same three catalog lines');
  ok(/\$38/.test(dan) && !/\$45/.test(dan), 'at HIS rate, not Santiago’s (38, not 45)');
  ok((dan.match(/not set/g) || []).length === 2, 'and his two unpriced lines both read "not set"');

  /* ── a NON-roofing crew starts empty and owns its lines ──────────── */
  $('#lrs-back').dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();
  $$('[data-lrs-crew]').find(b => /Ronaldo/.test(b.textContent))
    .dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();
  const ron = txt();
  ok(!/Tear off/.test(ron) && !/Ridge vent/.test(ron),
     'a siding crew does NOT inherit the roofing catalog');
  ok(/Lap siding/.test(ron) && /\$62/.test(ron), 'it shows the lines that crew owns');

  $('#lrs-back').dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();
  $$('[data-lrs-crew]').find(b => /Amanda/.test(b.textContent))
    .dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();
  ok(!$$('.lrs-row').length && /No rates set for Amanda/.test(txt()),
     'a crew with nothing gets an empty sheet that says so');

  /* ── editing writes crew_rates, never the catalog ────────────────── */
  $('#lrs-back').dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();
  $$('[data-lrs-crew]').find(b => /Daniel/.test(b.textContent))
    .dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();
  $('#lrs-edit').dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();

  const inputs = $$('.lrs-row [data-f="rate"]');
  ok(inputs.length === 3, 'edit mode gives every rate line an input (' + inputs.length + ')');
  ok(Number(inputs[0].value) === 38, 'the input carries the crew’s current rate');

  inputs[0].value = '41';       /* change an existing override */
  inputs[2].value = '6.25';     /* set one that was blank      */
  writes.length = 0;
  $('#lrs-save').dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await settle();

  ok(writes.length > 0, 'saving writes something');
  ok(writes.every(x => x.table === 'crew_rates'),
     'and EVERY write goes to crew_rates — the shared catalog is never touched ('
     + [...new Set(writes.map(x => x.table))].join(', ') + ')');
  const upd = writes.find(x => x.op === 'update');
  ok(upd && Number(upd.payload.rate) === 41, 'the changed rate is an UPDATE of his existing row');
  const ins = writes.find(x => x.op === 'insert');
  ok(ins && Number(ins.payload.rate) === 6.25 && ins.payload.pricing_item_id === 'p3',
     'the newly-priced line is an INSERT keyed to the catalog item');
  ok(ins && ins.payload.crew_id === 'c-daniel', 'and to THIS crew');
  ok(ins && ins.payload.custom_name == null,
     'with custom_name absent — crew_rates_shape_ck rejects a row carrying both');

  /* ── the non-admin gate ──────────────────────────────────────────── */
  ADMIN = false;
  w.__tell = '';
  await w.CardinalLRS.open();
  await settle();
  ok(/admin-only/i.test(w.__tell || ''), 'a non-admin is refused, and told why');
  ADMIN = true;

  /* ── the artifact itself ─────────────────────────────────────────── */
  ok(/CATALOG_TRADES\s*=\s*\['Roofing'\]/.test(mod),
     'the trade rule is one named list, not scattered conditionals');
  ok(!/from\('pricing_items'\)[\s\S]{0,200}\.(insert|update|delete)\(/.test(mod),
     'the module has no write path to pricing_items at all');
  ok(/@media print[\s\S]*background:#fff !important/.test(html),
     'the print stylesheet still puts the sheet on white paper');
  /* one plain check, not a chain of alternatives — a `||` ladder here passed on
     its weakest branch and told me nothing about the rule I meant to assert */
  ok(/#cr-lrs-view \.lrs-topbar, #cr-lrs-view \.lrs-list\{display:none !important;\}/.test(html),
     'and the crew LIST is excluded from print');

  const FLOOR = 38;
  ok(checks >= FLOOR, 'coverage floor: ' + checks + ' checks ran (>= ' + FLOOR + ')');

  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' of ' + checks + ' failed')
                    : ('\nGREEN — all ' + checks + ' Build 1123 assertions passed'));
  process.exit(fails ? 1 : 0);
})();
