/* Build 1097 functional harness — line-item sections.
 *
 * Executes the SHIPPED estGroups(), sectionSubtotal() and buildDocHtml()
 * (brace-matched, not re-implemented) against sectioned + ungrouped line sets,
 * then structurally verifies the editor grouping/mutation/wiring, the Community
 * bid sheet grouping, and the section CSS. Node, no jsdom.
 *
 *   node harness_estsec1097.js [index.html]
 */
const fs = require('fs');
const path = process.argv[2] || 'index.html';
const src = fs.readFileSync(path, 'utf8');
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };
const guard = (name, fn) => { try { fn(); } catch (e) { console.log('  FAIL ' + name + ' threw: ' + e.message); fails++; } };

function extract(sig){
  const i = src.indexOf(sig);
  if (i === -1) throw new Error('not found: ' + sig);
  let d = 0, started = false, j = i;
  for (; j < src.length; j++){
    const ch = src[j];
    if (ch === '{'){ d++; started = true; }
    else if (ch === '}'){ d--; if (started && d === 0){ j++; break; } }
  }
  return src.slice(i, j);
}
const esc   = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const money = (n) => '$' + (Number(n)||0).toLocaleString('en-US');
const nl2br = (s) => esc(s).replace(/\n/g,'<br>');
const UNITS = ['', 'SQ', 'LF', 'EA', 'LS'];

/* ── the shared grouping model ─────────────────────────────────────────────── */
let estGroups, sectionSubtotal;
guard('estGroups/sectionSubtotal extract', function(){
  estGroups      = new Function(extract('function estGroups(lines){') + '\nreturn estGroups;')();
  sectionSubtotal= new Function(extract('function sectionSubtotal(gl){') + '\nreturn sectionSubtotal;')();
});

guard('estGroups', function(){
  // all ungrouped → one implicit General Scope group
  const g0 = estGroups([{name:'A'},{name:'B'}]);
  ok(g0.length === 1 && g0[0].id === '' && g0[0].title === 'General Scope' && g0[0].lines.length === 2,
     'ungrouped lines → one General Scope group');
  // two named sections, first-appearance order, correct membership + title
  const lines = [
    { name:'Tear off', section_id:'sc_a', sec:'Tear-Off & Decking' },
    { name:'Shingles', section_id:'sc_b', sec:'Primary Shingles' },
    { name:'Decking',  section_id:'sc_a', sec:'Tear-Off & Decking' },
  ];
  const g = estGroups(lines);
  ok(g.length === 2, 'two section ids → two groups');
  ok(g[0].id === 'sc_a' && g[0].title === 'Tear-Off & Decking' && g[0].lines.length === 2, 'first group is sc_a (2 lines), by first appearance');
  ok(g[1].id === 'sc_b' && g[1].lines.length === 1, 'second group is sc_b (1 line)');
  // mixed: an ungrouped line among named sections gets its own General group
  const gm = estGroups([{name:'X'},{name:'Y',section_id:'sc_a',sec:'Roof'}]);
  ok(gm.length === 2 && gm[0].id === '' && gm[1].id === 'sc_a', 'ungrouped + named → General first, then the section');
});

guard('sectionSubtotal', function(){
  const sum = sectionSubtotal([
    { qty:26, unit_price:345 },        // 8970 detailed
    { flat:true, amount:250 },         // 250 flat
    { flat:true, amount:100, qty:9, unit_price:9 }, // 100 (flat ignores qty×rate)
  ]);
  ok(sum === 8970 + 250 + 100, 'section subtotal mixes detailed(qty×rate) + flat(amount): ' + sum);
});

/* ── the client proposal groups under banners with subtotals ───────────────── */
let buildDocHtml;
guard('buildDocHtml extract', function(){
  buildDocHtml = new Function(
    'cardinalLogo','esc','money','nl2br','docPhotoUrl','fmtDate','window',
    extract('function buildDocHtml(est, project, urls){') + '\nreturn buildDocHtml;'
  )(function(){return '';}, esc, money, nl2br, function(){return '';}, function(x){return String(x);},
    { crEstGroups: estGroups });   // the doc uses the SAME grouping model
});
function itemsTable(html){ const i = html.indexOf('<table class="items">'), j = html.indexOf('</table>', i); return html.slice(i, j); }
guard('buildDocHtml', function(){
  const proj = { name:'Wilburn', address:'3800 Klepinger' };
  const mk = (lines) => ({ line_items:lines, photos:[], subtotal:0, total:0, deposit_amount:0, title:'T', estimate_number:'E', valid_through:'', created_at:'2026-08-27' });

  // single ungrouped → NO section banner (a simple quote stays a plain table)
  const flat = itemsTable(buildDocHtml(mk([{ name:'Roof', qty:26, unit:'SQ', unit_price:345 }]), proj, {}));
  ok(flat.indexOf('sec-banner') === -1 && flat.indexOf('sec-sub') === -1, 'ungrouped proposal has no section banners');

  // two sections → a banner + subtotal per section, correct money
  const doc = itemsTable(buildDocHtml(mk([
    { name:'Tear off', section_id:'sc_a', sec:'Tear-Off & Decking', qty:20, unit:'SQ', unit_price:100 }, // 2000
    { name:'Disposal', section_id:'sc_a', sec:'Tear-Off & Decking', flat:true, amount:500 },              // 500
    { name:'Shingles', section_id:'sc_b', sec:'Primary Shingles', qty:26, unit:'SQ', unit_price:345 },    // 8970
  ]), proj, {}));
  ok((doc.match(/class="sec-banner/g)||[]).length === 2, 'proposal draws a banner per section');
  ok(doc.indexOf('Tear-Off &amp; Decking</td>') !== -1 && doc.indexOf('Primary Shingles</td>') !== -1, 'section titles render (escaped) in the banners');
  ok(doc.indexOf('Tear-Off &amp; Decking subtotal') !== -1, 'a per-section subtotal row is labelled by section');
  ok(doc.indexOf('$2,500') !== -1, 'Tear-Off section subtotal = 2000 + 500 = $2,500');
  ok(doc.indexOf('$8,970') !== -1, 'Primary Shingles section subtotal = $8,970');
  // the section banner spans the full 5-col table (a detailed line is present)
  ok(/sec-banner avoid-break"><td colspan="5"/.test(doc), 'banner spans all 5 columns');
});

/* ── renderLine still renders, and gains a section-move select when grouped ── */
guard('renderLine section select', function(){
  const renderLine = new Function('esc','money','UNITS',
    extract('function renderLine(l, idx, total, secs){') + '\nreturn renderLine;')(esc, money, UNITS);
  const secs = [{id:'', title:'General Scope'},{id:'sc_a', title:'Tear-Off & Decking'}];
  const withSel = renderLine({ _lid:'a', name:'X', qty:1, unit:'', unit_price:0, section_id:'sc_a' }, 0, 1, secs);
  ok(withSel.indexOf('data-secmove') !== -1, 'grouped line renders a move-to-section select');
  ok(/<option value="sc_a"[^>]*selected>Tear-Off &amp; Decking<\/option>/.test(withSel), 'the select marks the line\'s own section selected');
  const noSel = renderLine({ _lid:'b', name:'Y', qty:1, unit:'', unit_price:0 }, 0, 1);   // no secs → back-compat
  ok(noSel.indexOf('data-secmove') === -1, 'ungrouped (flat) line has no section select — simple quote untouched');
});

/* ── editor structure: grouping, mutations, wiring ─────────────────────────── */
ok(src.indexOf('window.crEstGroups = estGroups;') !== -1, 'estGroups is exported as window.crEstGroups (one model, three readers)');
ok(src.indexOf('function renderLinesGrouped(s){') !== -1, 'renderLinesGrouped defined');
ok(/if\(groups\.length === 1 && groups\[0\]\.id === ''\)\{[\s\S]{0,120}renderLine\(l, i, s\.lines\.length\)/.test(src),
   'renderLinesGrouped back-compat: a single ungrouped group renders the flat list (no chrome)');
ok(src.indexOf('function renderSectionHead(') !== -1, 'renderSectionHead defined');
['moveSection','renameSection','addLineToSection','addSection','moveLineToSection'].forEach(function(fn){
  ok(src.indexOf('function ' + fn + '(') !== -1, fn + ' defined');
});
ok(/state\.lines = groups\.reduce\(function\(acc, g\)\{ return acc\.concat\(g\.lines\); \}, \[\]\)/.test(src),
   'moveSection rebuilds the flat array from the reordered groups (keeps sections contiguous)');
ok(/state\.lines\.forEach\(function\(l\)\{ if\(l\.section_id === sid\) l\.sec = title; \}\)/.test(src),
   'renameSection updates the title on every line in the section');
ok(/if\(prev\)\{ if\(prev\.flat === true\) nl\.flat = true; if\(prev\.section_id\)\{ nl\.section_id = prev\.section_id/.test(src),
   'addLineAfter (Enter/Tab spawn) inherits the section above it');

// wiring
ok(src.indexOf("view.querySelectorAll('.cr-est-sechead').forEach") !== -1, 'wire(): section headers are wired');
ok(/data-act="sec-toggle"[\s\S]{0,80}secCollapsed\[sid\] = !secCollapsed\[sid\]/.test(src), 'wire(): collapse toggle flips secCollapsed and re-renders');
ok(/sAdd\.onclick = function\(\)\{ addLineToSection\(sid\); \}/.test(src), 'wire(): section "+ Line" calls addLineToSection');
ok(/addSecBtn\.onclick = function\(\)\{ addSection\(\); \}/.test(src), 'wire(): "+ Section" calls addSection');
ok(/secMove\.onchange = function\(e\)\{ moveLineToSection\(lid, e\.target\.value\); \}/.test(src), 'wire(): the per-line select moves the line to another section');
// refreshTotals repaints the live subtotal badges
ok(/querySelectorAll\('\.cr-est-sechead'\)[\s\S]{0,220}badge\.textContent = money\(sectionSubtotal\(gl\)\)/.test(src),
   'refreshTotals repaints each section subtotal badge live');

/* ── Community bid sheet groups by section ─────────────────────────────────── */
ok(/var g974 = \(typeof window\.crEstGroups === 'function'\) \? window\.crEstGroups\(items\)/.test(src),
   'Community sheet groups its items with the shared model');
ok(src.indexOf("'<div class=\"ln-sec\">' + esc(gr.title) + '<span class=\"s\">' + usd(sub)") !== -1,
   'Community sheet draws a section label row with its subtotal');
ok(/var single974 = g974\.length === 1 && g974\[0\]\.id === ''/.test(src),
   'Community sheet: a single ungrouped list stays flat (no section rows)');

/* ── CSS present ───────────────────────────────────────────────────────────── */
ok(src.indexOf('.cr-est-sechead .sec-title{') !== -1 && src.indexOf('color:var(--est-ink,#0f172a)') !== -1,
   'CSS: section title uses the readable porcelain ink token');
ok(src.indexOf('border-left:3px solid var(--est-red,#c8202e)') !== -1, 'CSS: the section header carries a Cardinal-red accent bar');
ok(src.indexOf('table.items tr.sec-banner td{') !== -1, 'CSS: proposal section-banner styled');
ok(src.indexOf('#cr-cc .sheet .ln-sec{') !== -1, 'CSS: Community section-label styled');

console.log(fails ? ('\nHARNESS RED — ' + fails + ' failure(s)') : '\nHARNESS GREEN — grouping, subtotals, proposal & community banners, mutations & wiring all proven');
process.exit(fails ? 1 : 0);
