/* gate_1130.mjs — build 1130: pre-1096 lump-sum estimates render flat, not $0.
 *
 * 1096 made pricing per-line (`flat`), back-filled ONLY in the editor's load
 * path and stored only on save. 13 of 20 live estimates predate it (measured
 * against production), so the Community sheet's lnFor() and cr-epub's
 * buildDocHtml() — which read it.flat alone — drew each of their lines as
 * qty x $0 with a stray qty cell. 1130 applies the editor's rule
 * (itemized:false => every line flat) at both readers, on a clone.
 *
 * Method: pure Node, no browser — both fixes are plain statements over
 * est/items. Each normalization block is SLICED OUT OF THE ARTIFACT and
 * EXECUTED against a production-shaped fixture (the 974-recorded shape:
 * money in `amount`, unit_price 0, no price key). Not a re-implementation —
 * the shipped text runs. Control (the 1129 tree) goes RED: the slices are
 * absent, and absence executes as the old behavior ($0).
 * Run: node gate_1130.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1130.mjs [index.html]'); process.exit(2); }
const html = readFileSync(FILE, 'utf8');

const checks = [];
const need = (n, ok) => checks.push([n, !!ok]);

function region(startMarker, endMarker) {
  const i = html.indexOf(startMarker);
  if (i === -1) return null;
  const j = html.indexOf(endMarker, i);
  return j === -1 ? null : html.slice(i, j);
}
/* slice each reader's head: from where it reads est.line_items to its next
   landmark. The normalization, if present, lives inside these slices. */
const ccHead = region("var items = est.line_items || [];", "/* 974: the line objects");
const epHead = region("var lines   = Array.isArray(est.line_items)", "var photos  =");
need('sheet head sliced from the artifact', ccHead);
need('doc-builder head sliced from the artifact', epHead);

/* fixture: the production shape (974's record), frozen so a mutation THROWS */
const fixture = () => ({ itemized: false, line_items: [Object.freeze(
  { qty: 1, name: 'Complete roof replacement', unit: 'EA', amount: 8500,
    library_id: null, unit_price: 0, description: 'Tear-off and reshingle' })] });

/* execute the SHIPPED slice: feed it `est`, read back its items/lines var.
   On a pre-1130 tree the slice is just the read — the old behavior executes. */
function runSlice(slice, varName) {
  const est = fixture();
  const fn = new Function('est', slice + `\n;return ${varName};`);
  return { est, out: fn(est) };
}
try {
  const cc = runSlice(ccHead || "var items = est.line_items || [];", 'items');
  const l = cc.out[0];
  const rendered = (l.flat === true) ? (Number(l.amount) || 0)
                                     : (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
  need('sheet: a pre-1096 lump-sum line renders $8,500, not $0 (shipped slice executed)', rendered === 8500);
  need('sheet: the qty cell is suppressed (line is flat)', l.flat === true);
  need('sheet: the original frozen row was not mutated', cc.est.line_items[0].flat === undefined);
} catch (e) { need('sheet slice executed without throwing — ' + String(e).slice(0, 80), false); }
try {
  const ep = runSlice(epHead || "var lines = Array.isArray(est.line_items) ? est.line_items : [];", 'lines');
  const l = ep.out[0];
  const rendered = (l.flat === true) ? (Number(l.amount) || 0)
                                     : (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
  need('published doc: the same line prints $8,500, not $0 (shipped slice executed)', rendered === 8500);
  need('published doc: the original frozen row was not mutated', ep.est.line_items[0].flat === undefined);
} catch (e) { need('doc slice executed without throwing — ' + String(e).slice(0, 80), false); }

/* and the editor's own back-compat (1096) must still be there — the rule this
   build copied, not replaced */
need("the editor's 1096 back-compat survives untouched",
     html.includes('existing.itemized === false && o.flat == null'));

const fails = checks.filter(c => !c[1]);
for (const [n, ok] of checks) console.log((ok ? '  ok   ' : '  FAIL ') + n);
console.log(fails.length ? `GATE 1130 RED — ${fails.length} failure(s)` : `GATE 1130 GREEN — ${checks.length} checks`);
process.exit(fails.length ? 1 : 0);
