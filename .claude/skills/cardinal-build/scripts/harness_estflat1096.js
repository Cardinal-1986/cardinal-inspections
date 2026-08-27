/* Build 1096 functional harness — the per-line Detailed / Flat toggle.
 *
 * Executes the SHIPPED computeTotals(), renderLine() and buildDocHtml() —
 * extracted verbatim by brace-match and run against mixed detailed+flat line
 * sets, not a re-implementation. Then structurally verifies the toggle/keyboard
 * wiring, the open-time migration, and the Community bid sheet per-line render.
 * Node, no jsdom.
 *
 *   node harness_estflat1096.js [index.html]
 */
const fs = require('fs');
const path = process.argv[2] || 'index.html';
const src = fs.readFileSync(path, 'utf8');
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };
// run a block; a THROW on an old/mismatched tree is recorded as a failure, not
// an abort (BUG_CLASSES 37 — a negative control that crashes proves nothing).
const guard = (name, fn) => { try { fn(); } catch (e) { console.log('  FAIL ' + name + ' threw: ' + e.message); fails++; } };

/* ── brace-match extractor (same shape as harness_commest1094) ─────────────── */
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

/* ── stubs ─────────────────────────────────────────────────────────────────── */
const esc   = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const money = (n) => '$' + (Number(n)||0).toLocaleString('en-US');
const nl2br = (s) => esc(s).replace(/\n/g,'<br>');
const UNITS = ['', 'SQ', 'LF', 'EA', 'LS'];

/* ─────────────────────────────────────────────────────────────────────────────
   1. computeTotals — the money is per-line
   ───────────────────────────────────────────────────────────────────────────*/
guard('computeTotals', function(){
  const computeTotals = new Function(extract('function computeTotals(s){') + '\nreturn computeTotals;')();
  const s = { discount:0, deposit_pct:30, lines:[
    { qty:26, unit:'SQ', unit_price:345, amount:0 },                 // detailed → 8970
    { flat:true, amount:250, qty:99, unit_price:99 },                // flat → 250 (NOT 9801)
    { qty:2,  unit:'EA', unit_price:125, amount:0 },                 // detailed → 250
  ]};
  const t = computeTotals(s);
  ok(t.subtotal === 8970 + 250 + 250, 'computeTotals sums detailed(qty×rate) + flat(amount): ' + t.subtotal);
  ok(s.lines[0].amount === 8970, 'detailed line amount recomputed to qty×rate (8970)');
  ok(s.lines[1].amount === 250,  'flat line keeps its lump amount (250, ignores qty×rate)');
  ok(t.total === 9470 && Math.round(t.deposit) === 2841, 'total 9470, 30% deposit 2841');

  // all-flat estimate
  const f = computeTotals({ discount:0, deposit_pct:0, lines:[
    { flat:true, amount:1000 }, { flat:true, amount:500 } ]});
  ok(f.subtotal === 1500, 'all-flat subtotal is the sum of lump amounts (1500)');

  // all-detailed estimate (no flat key anywhere) — unchanged behaviour
  const d = computeTotals({ discount:0, deposit_pct:0, lines:[
    { qty:10, unit_price:20 }, { qty:3, unit_price:100 } ]});
  ok(d.subtotal === 200 + 300, 'all-detailed subtotal unchanged (500)');
});

/* ─────────────────────────────────────────────────────────────────────────────
   2. renderLine — the row collapses to a clean lump in Flat mode
   ───────────────────────────────────────────────────────────────────────────*/
guard('renderLine', function(){
  const renderLine = new Function('esc','money','UNITS',
    extract('function renderLine(l, idx, total){') + '\nreturn renderLine;')(esc, money, UNITS);
  const det = renderLine({ _lid:'a', name:'Shingles', description:'OC Duration', qty:26, unit:'SQ', unit_price:345, amount:0 }, 0, 2);
  ok(det.indexOf('data-lf="qty"') !== -1 && det.indexOf('data-lf="unit_price"') !== -1, 'detailed row shows qty + unit price inputs');
  ok(det.indexOf('data-slot="amount"') !== -1, 'detailed row shows the computed amount cell');
  ok(det.indexOf('class="pricing"') !== -1 && det.indexOf('pricing lump') === -1, 'detailed row uses .pricing (not .lump)');
  ok(/data-act="mode-detailed"[^>]*class="on"/.test(det), 'detailed row: Detailed button is active');
  ok(det.indexOf('cr-est-rowmode') !== -1, 'detailed row has the mode toggle');

  const flat = renderLine({ _lid:'b', name:'Permit', description:'City fee', flat:true, amount:250, qty:1, unit:'', unit_price:0 }, 1, 2);
  ok(flat.indexOf('pricing lump') !== -1 && flat.indexOf('data-lf="amount"') !== -1, 'flat row uses .pricing.lump with a single amount input');
  ok(flat.indexOf('data-lf="qty"') === -1 && flat.indexOf('data-lf="unit_price"') === -1, 'flat row hides qty + unit price');
  ok(flat.indexOf('data-slot="amount"') === -1, 'flat row has no computed amount cell (it IS the input)');
  ok(/data-act="mode-flat"[^>]*class="on"/.test(flat), 'flat row: Flat button is active');
  ok((flat.match(/tabindex="-1"/g)||[]).length === 2, 'both mode buttons are tabindex=-1 (Tab skips them)');
});

/* ─────────────────────────────────────────────────────────────────────────────
   3. buildDocHtml — the client proposal prints mixed rows cleanly
   ───────────────────────────────────────────────────────────────────────────*/
function itemsTable(html){
  const i = html.indexOf('<table class="items">'), j = html.indexOf('</table>', i);
  return html.slice(i, j);
}
// just the item rows — the totals rows in <tfoot> legitimately carry a colspan pad
function itemBody(html){
  const t = itemsTable(html);
  const i = t.indexOf('<tbody>'), j = t.indexOf('</tbody>', i);
  return t.slice(i, j);
}
guard('buildDocHtml', function(){
  const buildDocHtml = new Function(
    'cardinalLogo','esc','money','nl2br','docPhotoUrl','fmtDate','window',
    extract('function buildDocHtml(est, project, urls){') + '\nreturn buildDocHtml;'
  )(function(){return '';}, esc, money, nl2br, function(){return '';}, function(x){return String(x);}, {});
  const proj = { name:'Bonita Wilburn', address:'3800 Klepinger Rd' };
  const mk = (lines) => ({ line_items:lines, photos:[], subtotal:0, total:0, deposit_amount:0,
                           title:'T', estimate_number:'E1', valid_through:'', created_at:'2026-08-27' });

  // all-detailed
  const detDoc = buildDocHtml(mk([{ name:'Shingles', qty:26, unit:'SQ', unit_price:345 }]), proj, {});
  ok(itemsTable(detDoc).indexOf('<th>Description</th><th style="text-align:right;">Qty</th>') !== -1, 'all-detailed doc: 5-col header with Qty');
  ok(itemBody(detDoc).indexOf('colspan') === -1, 'all-detailed doc: item rows carry no colspan (only totals do)');

  // all-flat
  const flatHtml = itemsTable(buildDocHtml(mk([{ name:'Permit', flat:true, amount:250 }]), proj, {}));
  ok(flatHtml.indexOf('<tr><th>Description</th><th style="text-align:right;">Amount</th></tr>') !== -1, 'all-flat doc: clean 2-col header (Description | Amount)');
  ok(flatHtml.indexOf('$250') !== -1, 'all-flat doc: the lump amount prints');

  // mixed — the point of the build
  const mixDoc = buildDocHtml(mk([
    { name:'Shingles', qty:26, unit:'SQ', unit_price:345 },   // detailed → 8970
    { name:'Permit', flat:true, amount:250 },                 // flat → clean scope
  ]), proj, {});
  const mixBody = itemBody(mixDoc);
  ok(itemsTable(mixDoc).indexOf('<th>Description</th><th style="text-align:right;">Qty</th>') !== -1, 'mixed doc: 5-col header (a detailed line forces columns)');
  ok(mixBody.indexOf('colspan="3"') !== -1, 'mixed doc: the flat item row spans qty/unit/rate as clean scope');
  ok(mixBody.indexOf('$8,970') !== -1 && mixBody.indexOf('$250') !== -1, 'mixed doc: both amounts print (8,970 detailed, 250 flat)');
  // the flat row must NOT carry a bare "26"/"1 EA" style qty — check the flat <tr> only
  const flatTr = mixBody.slice(mixBody.indexOf('Permit'));
  const flatRow = flatTr.slice(0, flatTr.indexOf('</tr>'));
  ok(flatRow.indexOf('class="qty"') === -1 && flatRow.indexOf('class="unit"') === -1, 'mixed doc: flat row has no qty/unit cells');
});

/* ─────────────────────────────────────────────────────────────────────────────
   4. Structural — toggle + keyboard wiring, migration, retired global control
   ───────────────────────────────────────────────────────────────────────────*/
ok(src.indexOf('function focusLineField(lid, field){') !== -1, 'focusLineField defined');
ok(src.indexOf('function addLineAfter(lid){') !== -1, 'addLineAfter defined');
ok(/state\.lines\.splice\(i \+ 1, 0, nl\)/.test(src), 'addLineAfter splices a new line after the current one');
ok(/if\(prev && prev\.flat === true\) nl\.flat = true;/.test(src), 'addLineAfter: a new line inherits the mode above it');
ok(/focusLineField\(nl\._lid, nl\.flat === true \? 'description' : 'qty'\)/.test(src), 'addLineAfter lands on Description (flat) or Qty (detailed)');

ok(src.indexOf("row.querySelectorAll('[data-act^=\"mode-\"]')") !== -1, 'mode buttons are wired');
ok(/line\.flat = true;/.test(src) && /line\.flat = false;/.test(src), 'toggle sets line.flat both ways');
ok(/focusLineField\(lid, toFlat \? 'amount' : 'qty'\)/.test(src), 'toggle-to-flat auto-focuses the price field');
ok(/if\(line\.amount == null \|\| line\.amount === 0\)\{\s*line\.amount = \(Number\(line\.qty\)/.test(src),
   'toggle-to-flat seeds the lump price from qty×rate so it is not $0');

ok(/var term = row\.querySelector\(line\.flat === true \? '\[data-lf="amount"\]' : '\[data-lf="unit_price"\]'\)/.test(src),
   'keyboard: the terminal money field is the last price cell for the mode');
ok(/if\(e\.key === 'Enter'\)\{ e\.preventDefault\(\); addLineAfter\(lid\); return; \}/.test(src),
   'keyboard: Enter on the terminal field spawns a new line');
ok(/if\(e\.key === 'Tab' && !e\.shiftKey\)\{/.test(src) &&
   /focusLineField\(nx\._lid, nx\.flat === true \? 'description' : 'qty'\)/.test(src),
   'keyboard: Tab walks to the next line entry (Description flat / Qty detailed)');

ok(/if\(existing\.itemized === false && o\.flat == null\) o\.flat = true;/.test(src),
   'migration: an old globally-lump estimate opens as per-line flat, once');

ok(src.indexOf('cr-est-itemchk') === -1, 'the global "Qty / unit" checkbox class is fully retired (markup + both CSS blocks)');
ok(src.indexOf('data-f="itemized"') === -1, 'no global itemized checkbox input survives');
// itemized as a stored field still rides through save() for back-compat
ok(src.indexOf('itemized       : state.itemized !== false,') !== -1, 'currentState still records the legacy itemized flag (back-compat)');

/* ── Community bid sheet: per-line pricing ─────────────────────────────────── */
const commI = src.indexOf('pricing mode is per line now');
const commRegion = commI !== -1 ? src.slice(commI, commI + 900) : '';
ok(commRegion.indexOf('var flat = it.flat === true;') !== -1, 'Community sheet decides pricing per line');
ok(/usd\(flat\s*\?\s*\(Number\(it\.amount\)/.test(commRegion), 'Community sheet: a flat line shows its own amount (not qty×rate=$0)');
ok(/\(flat\s*\?\s*''\s*:\s*'<span class="q">'/.test(commRegion), 'Community sheet: a flat line drops the qty cell');

/* ── CSS: the toggle styling + mobile-compact insets ───────────────────────── */
ok(src.indexOf('.cr-est-lineitem .cr-est-rowmode button.on{background:var(--est-red,#c8202e);color:#fff}') !== -1,
   'CSS: active toggle segment is Cardinal red with white text');
ok(src.indexOf('color:var(--est-dim,#475569)') !== -1, 'CSS: inactive toggle label uses the readable slate-600 token (not the failing slate-500)');
ok(/@media\(max-width:560px\)\{[\s\S]*inset 0 1px 2px rgba\(0,0,0,\.08\)/.test(src),
   'CSS: phones get the compact 4px/8px pad + subtle 1px inset');

console.log(fails ? ('\nHARNESS RED — ' + fails + ' failure(s)') : '\nHARNESS GREEN — per-line detailed/flat math, collapse, proposal, wiring & migration all proven');
process.exit(fails ? 1 : 0);
