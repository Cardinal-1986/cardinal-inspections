/* Build 1098 functional harness — saved assemblies + scaling.
 *
 * Executes the SHIPPED expandAssembly() (the scaling math) and evaluates the
 * SHIPPED EST_ASSEMBLIES presets, then structurally verifies injection, the
 * save/load/delete DB paths, the picker mode, and the wiring. Node, no jsdom.
 *
 *   node harness_estasm1098.js [index.html]
 */
const fs = require('fs');
const path = process.argv[2] || 'index.html';
const src = fs.readFileSync(path, 'utf8');
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };
const guard = (name, fn) => { try { fn(); } catch (e) { console.log('  FAIL ' + name + ' threw: ' + e.message); fails++; } };

function braceExtract(sig){
  const i = src.indexOf(sig);
  if (i === -1) throw new Error('not found: ' + sig);
  let d = 0, started = false, j = i;
  for (; j < src.length; j++){ const ch = src[j];
    if (ch === '{'){ d++; started = true; } else if (ch === '}'){ d--; if (started && d === 0){ j++; break; } } }
  return src.slice(i, j);
}
function bracketArray(afterSig){
  const s = src.indexOf(afterSig); if (s === -1) throw new Error('not found: ' + afterSig);
  const open = src.indexOf('[', s); let d = 0, j = open;
  for (; j < src.length; j++){ const ch = src[j];
    if (ch === '[') d++; else if (ch === ']'){ d--; if (d === 0){ j++; break; } } }
  return src.slice(open, j);
}

/* ── 1. expandAssembly — the scaling math ──────────────────────────────────── */
let expandAssembly;
guard('expandAssembly extract', function(){
  let idc = 0;
  expandAssembly = new Function('newLineId',
    braceExtract('function expandAssembly(a, n){') + '\nreturn expandAssembly;')(function(){ return 'l_' + (idc++); });
});
guard('expandAssembly', function(){
  const a = { name:'Roof', lines:[
    { name:'Tear off',   qty:1, unit:'SQ', unit_price:0, per_sq:1 },     // scales
    { name:'Waste',      qty:1, unit:'SQ', unit_price:0, per_sq:1.1 },   // scales x1.1
    { name:'Ridge vent', qty:0, unit:'',   unit_price:0, flat:true },    // flat, untouched
    { name:'Boots',      qty:3, unit:'EA', unit_price:0 },               // not SQ, keeps qty
  ]};
  const scaled = expandAssembly(a, 32);
  ok(scaled[0].qty === 32, 'SQ line scales to the entered squares (32)');
  ok(Math.abs(scaled[1].qty - 35.2) < 1e-9, 'per_sq 1.1 line scales to 35.2');
  ok(scaled[2].flat === true && scaled[2].qty === 0, 'flat line preserved, qty untouched');
  ok(scaled[3].qty === 3 && scaled[3].unit === 'EA', 'non-SQ line keeps its template qty');
  ok(scaled.every(function(l){ return l.per_sq === undefined; }), 'per_sq is dropped from the estimate line (assembly-only key)');
  ok(scaled.every(function(l){ return typeof l._lid === 'string' && l._lid; }), 'every line gets a fresh _lid');
  ok(scaled.every(function(l){ return l.amount === 0; }), 'amount starts 0 (computed on render)');

  // no squares → template quantities unchanged
  const raw = expandAssembly(a, 0);
  ok(raw[0].qty === 1 && raw[1].qty === 1, 'squares=0 keeps template quantities (optional scaling)');

  // per_unit (e.g. windows) scales by the same numeric input, dropped after
  const w = { name:'Windows', lines:[
    { name:'Extract', qty:1, unit:'EA', unit_price:0, per_unit:1 },
    { name:'Unit',    qty:1, unit:'EA', unit_price:0, per_unit:1 } ]};
  const ws = expandAssembly(w, 5);
  ok(ws[0].qty === 5 && ws[1].qty === 5, 'per_unit lines scale by the entered count (5 windows)');
  ok(ws.every(function(l){ return l.per_unit === undefined; }), 'per_unit is dropped from the estimate line');
  // an LF line with a base quantity is NOT square-scaled — it is a starting qty
  const lf = expandAssembly({ lines:[ { name:'Drip', qty:150, unit:'LF', unit_price:0 } ] }, 32);
  ok(lf[0].qty === 150, 'an LF base line keeps its starting quantity (not scaled by squares)');
});

/* ── 2. EST_ASSEMBLIES presets are well-formed and price-free ───────────────── */
guard('EST_ASSEMBLIES presets', function(){
  const arr = new Function('return ' + bracketArray('var EST_ASSEMBLIES ='))();
  ok(arr.length === 6, 'six default assemblies ship (the curated cross-trade set)');
  ok(arr.every(function(a){ return a._default === true && a.id && a.trade && Array.isArray(a.lines) && a.lines.length; }), 'each preset has id, trade, _default and lines');
  ok(arr.every(function(a){ return a.lines.every(function(l){ return Number(l.unit_price) === 0; }); }), 'every preset line ships at $0 (no invented prices)');
  const trades = arr.map(function(a){ return a.trade; });
  ['Roofing','Siding','Soffit & Fascia','Gutters','Windows'].forEach(function(t){
    ok(trades.indexOf(t) !== -1, 'trade present: ' + t);
  });
  ok(trades.filter(function(t){ return t === 'Roofing'; }).length === 2, 'two Roofing packages (OC Duration + standing seam)');
  // the OC roof package: SQ+per_sq shingle line (10% waste), LF base lines, flat cleanup
  const roof = arr.filter(function(a){ return a.id === 'def-roof-oc'; })[0];
  ok(roof && roof.lines.some(function(l){ return l.unit === 'SQ' && l.per_sq === 1.1; }), 'the OC shingle line carries per_sq 1.1 (10% waste)');
  ok(roof.lines.some(function(l){ return l.unit === 'LF' && l.qty === 150; }), 'LF lines carry sensible base quantities (drip edge 150 LF)');
  ok(roof.lines.some(function(l){ return l.flat === true; }), 'the roof package mixes a flat cleanup line');
  // the window package scales by per_unit on EA lines
  const win = arr.filter(function(a){ return a.id === 'def-window'; })[0];
  ok(win && win.lines.every(function(l){ return l.per_unit != null && l.unit === 'EA'; }), 'the window package scales every line by per_unit (EA)');
});

/* ── 3. injection + section shape ──────────────────────────────────────────── */
ok(src.indexOf('function injectAssembly(a, squares){') !== -1, 'injectAssembly defined');
ok(/var sid = newSecId\(\);[\s\S]{0,220}o\.section_id = sid; o\.sec = name;/.test(src),
   'injectAssembly stamps a fresh section_id + title onto every expanded line');
ok(/state\.lines = state\.lines\.concat\(lines\)/.test(src), 'injectAssembly appends the section to the estimate');
ok(/scrollIntoView\(\{ block:'start', behavior:'smooth' \}\)/.test(src), 'injectAssembly scrolls the new section into view');

/* ── 4. save / load / delete DB paths (shared library, graceful degrade) ────── */
ok(src.indexOf('async function saveSectionAsAssembly(sid){') !== -1, 'saveSectionAsAssembly defined');
ok(/lines\.forEach\(function\(l\)\{ if\(l\.sec\) title = l\.sec; \}\)/.test(src), 'save names the assembly by the section\'s own title');
ok(/if\(!title\.trim\(\)\)\{[\s\S]{0,160}\.sec-title[\s\S]{0,40}focus/.test(src), 'save with no title toasts and focuses the title field (no name modal)');
ok(/window\.supa\.from\('estimate_assemblies'\)\.insert\(payload\)/.test(src), 'save inserts into estimate_assemblies');
ok(/var o = \{ name: l\.name \|\| '', description: l\.description \|\| '', qty:[^}]*unit_price:[^}]*\};[\s\S]{0,60}if\(l\.flat === true\) o\.flat = true;/.test(src),
   'save strips editor-only keys (_lid/section_id/sec/amount), keeps flat');
ok(src.indexOf("window.supa.from('estimate_assemblies').select('id,name,trade,lines')") !== -1, 'loadAssemblies reads the shared library');
ok(/if\(r\.error \|\| !Array\.isArray\(r\.data\)\) return;/.test(src), 'loadAssemblies degrades silently when the table/connection is absent');
ok(/catch\(_e\)\{ \/\* defaults still work \*\/ \}/.test(src), 'loadAssemblies keeps defaults working on any error');
ok(/async function deleteAssembly\(id\)\{[\s\S]{0,120}if\(!a \|\| a\._default\) return;/.test(src), 'deleteAssembly refuses to delete a built-in default');
ok(/await crAsk\([\s\S]{0,120}\.delete\(\)\.eq\('id', id\)/.test(src), 'deleteAssembly confirms, then deletes only that row');

/* ── 5. picker mode + wiring ───────────────────────────────────────────────── */
ok(/pickerMode = \(mode === 'abc'\) \? 'abc' : \(mode === 'assembly' \? 'assembly' : 'library'\);/.test(src), 'openPicker accepts the assembly mode');
ok(/if\(pickerMode === 'assembly'\) loadAssemblies\(\);/.test(src), 'opening the assembly picker refreshes the custom library');
ok(/if\(pickerMode === 'assembly'\)\{ renderAssemblyPicker\(\); return; \}/.test(src), 'renderPicker routes assembly mode to its own renderer');
ok(src.indexOf('function renderAssemblyPicker(){') !== -1, 'renderAssemblyPicker defined');
ok(/a\._default \? \(a\.trade \|\| 'General'\) : 'Saved'/.test(src), 'picker groups defaults by trade, custom under "Saved"');
ok(/\(\(hasSq \|\| hasUnit\) \? '<input type="number" class="asm-sq"[\s\S]{0,80}placeholder="' \+ scaleLbl/.test(src), 'a scaling input appears only when the assembly has SQ or per_unit lines');
ok(/scaleLbl = hasSq \? 'Squares \(optional\)' : \(hasUnit \? 'Windows \(optional\)'/.test(src), 'the input is labelled Squares for roofing/siding, Windows for the window package');
ok(/injectAssembly\(a, sq\);[\s\S]{0,40}closePicker\(\);/.test(src), 'Insert injects (with the card\'s squares) then closes the picker');
ok(src.indexOf('addAsmBtn.onclick = function(){ openPicker(\'assembly\'); }') !== -1, 'the + Assembly button opens the picker');
ok(src.indexOf('sSave.onclick = function(){ saveSectionAsAssembly(sid); }') !== -1, 'the section "Save as Assembly" button is wired');
ok(/\(isGeneral \? '' : '<button type="button" class="sec-saveasm"/.test(src), 'Save as Assembly shows only on a named section (not General Scope)');

/* ── 6. CSS ────────────────────────────────────────────────────────────────── */
ok(src.indexOf('.cr-est-items-head .add-assembly{background:var(--est-red,#c8202e);color:#fff') !== -1, 'CSS: + Assembly is a solid Cardinal-red button');
ok(src.indexOf('#cr-est-picker .asm-card .asm-insert{') !== -1 && src.indexOf('#cr-est-picker .asm-card .asm-sq{') !== -1, 'CSS: assembly card Insert + Squares styled');

console.log(fails ? ('\nHARNESS RED — ' + fails + ' failure(s)') : '\nHARNESS GREEN — scaling math, presets, injection, DB paths, picker & wiring all proven');
process.exit(fails ? 1 : 0);
