// Build 1342 — a document page can never be saved empty. Runs the SHIPPED crPageIsEmpty against real
// shapes, and checks both client-side guards sit where every writer passes.
// Usage: node gate_1342.mjs [index.html]   (point it at 1341 as the negative control: RED)
import fs from 'fs';
const file = process.argv[2] || 'index.html';
const s = fs.readFileSync(file, 'utf8');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); else console.log('  ok  ' + m); };
const i = s.indexOf('function crPageIsEmpty(');
let f = null;
if (i >= 0) {
  let d = 0, j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}' && --d === 0) { j = k + 1; break; } }
  try { f = new Function(s.slice(i, j) + '; return crPageIsEmpty;')(); } catch (e) { fails.push('crPageIsEmpty does not compile: ' + e.message); }
}
ok(!!f, 'crPageIsEmpty is defined');
if (f) {
  ok(f('<!DOCTYPE html>\n<html><head></head><body></body></html>') === true, 'the exact page that wiped EST-2026-0910 is empty');
  ok(f('') === true && f(null) === true, 'nothing at all is empty');
  ok(f('<html><head><style>body{color:red}</style><title>x</title></head><body>\n &nbsp; <div></div></body></html>') === true, 'styles, a title and blank divs are still empty');
  ok(f('<html><body><p>Roof Repair $1,400</p></body></html>') === false, 'a page with words is not empty');
  ok(f('<html><body><img src="x.png"></body></html>') === false, 'a page with only a picture is not empty');
  ok(f('<html><body><table><tr><td></td></tr></table></body></html>') === false, 'a blank form table is not empty');
  ok(f('x'.repeat(1600)) === false, 'a large page skips the test');
}
const upd = s.indexOf("if(fields && ('html' in fields) && crPageIsEmpty(fields.html))");
ok(upd >= 0 && s.slice(upd - 400, upd).includes('update: async function(id, fields){') &&
   s.slice(upd, upd + 600).includes('869: no signal'), 'the documents db.update refuses an empty page before the write and the offline queue');
const ser = s.indexOf('function serializeFrame(');
const serEnd = s.indexOf('\nfunction readEstimateTotal(', ser);
const body = ser >= 0 && serEnd > ser ? s.slice(ser, serEnd) : '';
ok(/if\(crPageIsEmpty\(_out\)\) throw/.test(body) && body.indexOf("[data-cardinal-hint]") < body.indexOf('crPageIsEmpty(_out)'),
   'serializeFrame checks the page AFTER stripping the editing banner');
ok(fs.existsSync('inspection_reports_blank_guard.sql') && /before update of html on public\.inspection_reports/.test(fs.readFileSync('inspection_reports_blank_guard.sql', 'utf8')),
   'the server-side guard ships as SQL');
if (fails.length) { console.log('GATE 1342 RED — ' + fails.length + ' failing'); fails.forEach(m => console.log('  FAIL ' + m)); process.exit(1); }
console.log('GATE 1342 GREEN');
