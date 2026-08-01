/* Build 512 gate — DOES THE CONTROL APPEAR, AND DOES A REAL CLICK REACH IT?
 *
 * Three times tonight a feature passed a rigorous harness and did not work,
 * because the harness asked "does the function work" and never "does the button
 * exist after a real render, and does a tap reach it".
 *
 * So this one:
 *   - runs the REAL openNote() out of the shipped file
 *   - attaches the REAL delegated click handler, sliced out of the file, not
 *     retyped (a retyped one validates fiction)
 *   - dispatches a real click event and lets it bubble
 *   - proves the diagram actually renders through lbRich afterwards
 */
import fs from 'fs';
import vm from 'vm';
import { JSDOM } from 'jsdom';

const APP = process.argv[2] || 'C:/Users/kpkor/OneDrive/Desktop/cardinal-push/index.html';
const app = fs.readFileSync(APP, 'utf8').replace(/\r\n/g, '\n');

let fails = 0;
const ok = (cond, msg) => { if (!cond) fails++; console.log('  ' + (cond ? 'PASS' : 'FAIL') + '  ' + msg); return cond; };

/* keep `async` — searching 'function NAME(' starts after it */
function fnSource(s, name) {
  let at = s.indexOf('async function ' + name + '(');
  if (at === -1) at = s.indexOf('function ' + name + '(');
  if (at === -1) return null;
  let i = s.indexOf('{', at), d = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(at, k + 1); }
  }
  return null;
}

const dom = new JSDOM(`<!doctype html><html><body>
  <div id="rlLibPanel"><div id="rlLibMsgs"></div></div>
</body></html>`);
const w = dom.window;

const ctx = {
  window: w, document: w.document, console,
  Math, JSON, String, Number, Array, Object, RegExp, Promise, Error,
  parseFloat, parseInt, isNaN, isFinite, setTimeout, clearTimeout
};
ctx.globalThis = ctx;
vm.createContext(ctx);

/* ---- load the renderer family + LB_ constants (the lesson from the 510 run:
   an incomplete harness looks exactly like a broken feature) -------------- */
const constRe = /\bvar (LB_[A-Z_]+)\s*=\s*([^;\n]+);/g;
let cm;
while ((cm = constRe.exec(app)) !== null) {
  try { vm.runInContext('var ' + cm[1] + ' = ' + cm[2] + ';', ctx); } catch (e) {}
}
const helpers = ['esc'];
const declRe = /\bfunction (lb[A-Za-z0-9_]*)\s*\(/g;
let dm;
while ((dm = declRe.exec(app)) !== null) if (!helpers.includes(dm[1])) helpers.push(dm[1]);
for (let pass = 0; pass < 2; pass++) {
  for (const n of helpers) {
    const src = fnSource(app, n);
    if (src) { try { vm.runInContext(src, ctx); } catch (e) {} }
  }
}
/* SANITY — refuse to report anything if the renderer cannot draw */
ctx.__p = ['A', 'B', 'C'];
let sane = false;
try { sane = /<svg/.test(vm.runInContext("lbDiagram('stack','',this.__p)", ctx) || ''); } catch (e) {}
if (!sane) { console.log('*** HARNESS INCOMPLETE — lbDiagram cannot draw. Every result below would be a false negative.'); process.exit(2); }
console.log('[sanity] lbDiagram draws directly: YES\n');

/* ---- the closure the real functions expect ----------------------------- */
vm.runInContext(`
  var items = [];
  function lbSources(){ return ''; }
  function openPanel(){ }
  var closePanel = function(){}, ccOpen = function(){}, cancelManual = function(){},
      saveManual = function(){}, ccIsAdmin = function(){ return false; };
  var p = document.getElementById('rlLibPanel');
  var LAST_UPDATE = null;
  window.aiHeaders = function(){ return Promise.resolve({ 'Content-Type':'application/json' }); };
  window.supa = { from: function(t){ return {
    update: function(patch){ return { eq: function(col, v){
      LAST_UPDATE = { table:t, patch:patch, col:col, id:v };
      return Promise.resolve({ error:null });
    } }; } }; } };
`, ctx);

/* the REAL say(), openNote(), drawInto() out of the shipped file */
for (const n of ['say', 'openNote', 'drawInto']) {
  const src = fnSource(app, n);
  if (!src) { console.log('could not extract ' + n); process.exit(2); }
  vm.runInContext(src, ctx);
}
/* the marker regex openNote depends on */
const mk = app.match(/var LB_MARKER = [^\n]+/);
vm.runInContext(mk[0], ctx);

/* the REAL delegated handler, sliced out — not retyped */
/* "p.addEventListener('click', function(e){" is NOT unique in a 3 MB file —
   the first match was a different panel and yielded a 186-char slice. Anchor
   backward from the line under test instead. */
const draw = app.indexOf("var dw = e.target.closest('[data-lb-draw]');");
const at = app.lastIndexOf("p.addEventListener('click', function(e){", draw);
if (at === -1 || draw === -1) { console.log('could not locate the real handler'); process.exit(2); }
const open = app.indexOf('{', app.indexOf('function(e)', at));
let d = 0, end = -1;
for (let k = open; k < app.length; k++) {
  if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) { end = k; break; } }
}
const handlerSrc = app.slice(app.indexOf('function(e){', at), end + 1);
console.log('delegated handler sliced from the file: ' + handlerSrc.length + ' chars');
vm.runInContext('p.addEventListener("click", ' + handlerSrc + ');', ctx);

/* ---- 1. does the control appear? --------------------------------------- */
console.log('\n=== 1. the control ===');
const NO_DIAGRAM = { id:'n1', kind:'note', title:'Step Flashing Replacement', body:'Step flashing is woven in with each course.\n\nIt is not one long piece.' };
const HAS_DIAGRAM = { id:'n2', kind:'note', title:'Parapet Wall Details', body:'The build-up:\n\n~~stack\nCoping\nMembrane\nDeck\n' };
const EMPTY = { id:'n3', kind:'note', title:'Placeholder', body:'' };

function render(it) {
  ctx.__it = it;
  vm.runInContext('items = [this.__it]; document.getElementById("rlLibMsgs").innerHTML = "";', ctx);
  vm.runInContext('openNote(this.__it.id)', ctx);
  return w.document.getElementById('rlLibMsgs');
}

let box = render(NO_DIAGRAM);
const btn = box.querySelector('[data-lb-draw]');
ok(!!btn, 'a note with no diagram shows the button');
ok(btn && btn.matches('button.lb-draw'), 'it is a real <button> carrying the .lb-draw class');
ok(btn && btn.parentElement.classList.contains('lb-m'), 'it is inside the rendered message, not loose in the panel');
ok(btn && btn.getAttribute('data-lb-draw') === 'n1', 'it carries the note id');

ok(!render(HAS_DIAGRAM).querySelector('[data-lb-draw]'), 'a note that ALREADY has a diagram does not offer it again');
ok(!render(EMPTY).querySelector('[data-lb-draw]'), 'a note with no text does not offer it');

/* ---- 2. does a real click reach it? ------------------------------------ */
console.log('\n=== 2. a real click, through the real delegation ===');
box = render(NO_DIAGRAM);
const b = box.querySelector('[data-lb-draw]');
/* drawInto legitimately mutates it.body on success, and NO_DIAGRAM IS that
   object — so keep the original to compare against, or the assertion reads the
   updated text and reports a failure the code did not commit. */
const ORIGINAL_BODY = NO_DIAGRAM.body;

let sent = null;
ctx.fetch = (url, opts) => {
  sent = { url, body: JSON.parse(opts.body) };
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      diagram: '~~stack\nStep flashing\nSidewall\nShingle course',
      caption: 'How the pieces interleave:', reason: ''
    })
  });
};
vm.runInContext('window.fetch = fetch;', ctx);

b.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 30));

ok(!!sent, 'the click reached drawInto and a request went out');
ok(sent && sent.url === '/api/librarian', 'to /api/librarian');
ok(sent && !!sent.body.illustrate, 'as an illustrate request');
ok(sent && sent.body.illustrate.title === NO_DIAGRAM.title, 'carrying the entry title');
ok(sent && sent.body.illustrate.body === ORIGINAL_BODY, 'carrying the entry body verbatim');

/* ---- 3. does it PERSIST, in a shape the renderer can draw? ------------- */
console.log('\n=== 3. what got written ===');
const upd = vm.runInContext('LAST_UPDATE', ctx);
ok(!!upd, 'an update was issued');
ok(upd && upd.table === 'library_items' && upd.col === 'id' && upd.id === 'n1', 'to the right row');

const newBody = upd ? upd.patch.body : '';
ok(newBody.includes(ORIGINAL_BODY.trim()), 'the original text is still there — this ADDS, it does not rewrite');
ok(/\n\n~~stack/.test(newBody), 'the marker starts its own block (the exact thing 510 measured)');

ctx.__b = newBody;
const html = vm.runInContext('lbRich(this.__b)', ctx);
ok(/<svg/.test(html), 'and lbRich actually DRAWS it');
ok(!html.includes('~~'), 'with no ~~ leaking to the reader');

/* ---- 4. "no" is a real answer ----------------------------------------- */
console.log('\n=== 4. an entry that should not be illustrated ===');
box = render({ id:'n4', kind:'note', title:'Xenia — permits go through a private firm', body:'Xenia contracts its plan review out.' });
const b4 = box.querySelector('[data-lb-draw]');
vm.runInContext('LAST_UPDATE = null;', ctx);
ctx.fetch = () => Promise.resolve({ ok:true, json: () => Promise.resolve({
  diagram:'', caption:'', reason:'This is about who issues the permit, not how something is built.' }) });
vm.runInContext('window.fetch = fetch;', ctx);
b4.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 30));

ok(vm.runInContext('LAST_UPDATE', ctx) === null, 'nothing was written');
ok(w.document.getElementById('rlLibMsgs').textContent.includes('who issues the permit'), 'the reason is shown to the user');
ok(b4.disabled === false, 'the button is usable again, not left greyed out');

console.log('\n' + (fails ? '*** ' + fails + ' FAILED ***' : 'ALL PASSED'));
process.exit(fails ? 1 : 0);
