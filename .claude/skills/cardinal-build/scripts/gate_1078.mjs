/* Build 1078 gate — a change to a delivered document is written down.
 *
 * Executes the SHIPPED code: `docChangeNote` and `db.update`'s body are sliced
 * out of the artifact by brace-matching and run against stubs. The enclosing
 * <script> block is ~20k lines and cannot be eval'd whole, so the two pieces
 * that carry the behaviour are lifted out instead of re-implemented.
 *
 * The discriminating checks are B1/B2: a naive version logs the SEND and the
 * SIGNATURE as edits-after-delivery, because db.update is how both happen.
 *
 * Optional path argument = negative control. BUG_CLASSES 37: every section is
 * wrapped, and the FLOOR fails the run if a check never executed.
 */
import fs from 'fs';
import { chromium } from 'playwright';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const HTML = fs.readFileSync(FILE, 'utf8');
console.log('gate_1078 on ' + FILE);

let fails = 0, passes = 0;
const ran = new Set();
function ok(name, cond, extra) {
  ran.add(name);
  if (cond) { passes++; console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}
async function step(name, fn) {
  try { await fn(); }
  catch (e) { ran.add(name); fails++; console.log('  FAIL  ' + name + ' section  → threw: ' + (e && e.message)); }
}

function braceSlice(head) {
  const i = HTML.indexOf(head);
  if (i === -1) return null;
  let depth = 0, k = HTML.indexOf('{', i);
  for (;; k++) {
    const c = HTML[k];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return HTML.slice(i, k + 1); }
    if (k > HTML.length) return null;
  }
}
const NOTE_FN = braceSlice('function docChangeNote(id, fields){');
const UPD_FN  = braceSlice('update: async function(id, fields){');
/* ⚠ Build 1079 added two more helpers that db.update calls. Without them the
   sliced update throws a ReferenceError before it reaches the audit, and six of
   this gate's checks went red on a build that had regressed nothing. A gate
   must not break because a later build extended the function it tests: take
   them from the artifact when they are there, stub them when they are not. */
const SNAPR_FN = braceSlice('function docSnapReason(id, fields){');
const SNAP_FN  = braceSlice('function docSnapshot(id, reason){');
const SNAP_RIG = (SNAPR_FN && SNAP_FN)
  ? (SNAPR_FN + '\n' + SNAP_FN)
  : 'function docSnapReason(){ return null; }\nfunction docSnapshot(){ return Promise.resolve(); }';

/* Rebuild just enough scope for the two shipped functions to run. */
const RIG = (rows, cur) => `
window.__audit = [];
window.__wrote = [];
window.__queued = [];
var TEAM = true;
var TABLE = 'inspection_reports';
var cacheRows = ${JSON.stringify(rows)};
var current = ${JSON.stringify(cur)};
var FAIL_WRITE = false;
function auditLog(type, detail, projectId){
  window.__audit.push({ type: type, detail: detail, project_id: projectId });
}
function dbQueueOffline(id, fields){ window.__queued.push({ id: id, fields: fields }); }
window.__snaps = [];
var sb = {
  rpc: function(fn, args){ window.__snaps.push({ fn: fn, args: args }); return Promise.resolve({ data: 1, error: null }); },
  from: function(table){
    var patch = null, match = null;
    var q = {
      update: function(f){ patch = f; return q; },
      eq: function(c, v){ match = v; return q; },
      then: function(res){
        if (FAIL_WRITE) return Promise.resolve({ error: { message: 'refused' } }).then(res);
        window.__wrote.push({ table: table, id: match, fields: patch });
        return Promise.resolve({ data: null, error: null }).then(res);
      }
    };
    return q;
  }
};
${NOTE_FN || '/* docChangeNote MISSING */'}
${SNAP_RIG}
window.__update = ${UPD_FN ? UPD_FN.replace(/^update:\s*/, '') : 'async function(){ throw new Error("update slice missing"); }'};
`;

const SENT   = { id: 'd-sent',   title: 'Estimate — Bob DeBuilder', project_id: 'p1',
                 sent_at: '2026-08-02T15:53:29Z', signed_at: null, status: 'sent' };
const SIGNED = { id: 'd-signed', title: 'EST-2026-0896 — Joeseph', project_id: 'p2',
                 sent_at: null, signed_at: '2026-08-09T15:35:03Z', status: 'unsent' };
const FRESH  = { id: 'd-fresh',  title: 'Estimate — new',          project_id: 'p3',
                 sent_at: null, signed_at: null, status: 'unsent' };

async function run(page, rows, cur, id, fields, opts) {
  return page.evaluate(async ({ id, fields, opts }) => {
    window.__audit = []; window.__wrote = []; window.__queued = []; window.__snaps = [];
    if (opts && opts.failWrite) FAIL_WRITE = true; else FAIL_WRITE = false;
    let threw = null;
    try { await window.__update(id, fields); } catch (e) { threw = String(e && (e.message || e)); }
    return { audit: window.__audit, wrote: window.__wrote, queued: window.__queued,
             snaps: window.__snaps, threw };
  }, { id, fields, opts: opts || {} });
}
async function boot(browser, rows, cur) {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('    [pageerror] ' + String(e).split('\n')[0]));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: RIG(rows, cur) });
  return page;
}

(async () => {
const browser = await chromium.launch();

console.log('\n── A · slices ──');
ok('A1 docChangeNote sliced', !!NOTE_FN, NOTE_FN ? NOTE_FN.length + ' chars' : 'not found');
ok('A2 db.update sliced', !!UPD_FN && UPD_FN.length > 500, UPD_FN ? UPD_FN.length + ' chars' : 'not found');

/* ── B · the discriminating pair: delivery is not an edit ─────────────── */
console.log('\n── B · sending and signing are not edits ──');
await step('B', async () => {
  if (!NOTE_FN) { ok('B1 the SEND itself is not logged', false, 'no docChangeNote');
                  ok('B2 the SIGNATURE itself is not logged', false, 'no docChangeNote'); return; }
  const page = await boot(browser, [FRESH], null);
  const send = await run(page, [FRESH], null, 'd-fresh',
    { status: 'sent', sent_at: '2026-08-26T00:00:00Z' });
  ok('B1 the SEND itself is not logged', send.audit.length === 0, JSON.stringify(send.audit));
  await page.close();

  const p2 = await boot(browser, [SENT], null);
  const sign = await run(p2, [SENT], null, 'd-sent', { signed_at: '2026-08-26T00:00:00Z' });
  ok('B2 the SIGNATURE itself is not logged', sign.audit.length === 0, JSON.stringify(sign.audit));
  await p2.close();
});

/* ── C · an edit AFTER delivery is written down ───────────────────────── */
console.log('\n── C · edits after delivery ──');
await step('C', async () => {
  if (!NOTE_FN) { ['C1 an edit to a SENT document is logged','C2 it is a `doc` event carrying project_id',
                   'C3 a content change says CONTENT','C4 a SIGNED document says SIGNED',
                   'C5 an unsent document logs nothing','C6 the write still happened']
                   .forEach(n => ok(n, false, 'no docChangeNote')); return; }
  const page = await boot(browser, [SENT, SIGNED, FRESH], null);

  const edit = await run(page, null, null, 'd-sent', { html: '<p>changed</p>', total: 9999 });
  ok('C1 an edit to a SENT document is logged', edit.audit.length === 1, JSON.stringify(edit.audit));
  const a = edit.audit[0] || {};
  ok('C2 it is a `doc` event carrying project_id', a.type === 'doc' && a.project_id === 'p1',
     JSON.stringify(a));
  ok('C3 a content change says CONTENT',
     /CONTENT changed/.test(a.detail || '') && /SENT/.test(a.detail || '')
       && /html/.test(a.detail || '') && /Bob DeBuilder/.test(a.detail || ''),
     JSON.stringify(a.detail));
  ok('C6 the write still happened', edit.wrote.length === 1 && edit.wrote[0].id === 'd-sent',
     JSON.stringify(edit.wrote));

  const sg = await run(page, null, null, 'd-signed', { html: '<p>x</p>' });
  ok('C4 a SIGNED document says SIGNED',
     sg.audit.length === 1 && /SIGNED/.test(sg.audit[0].detail) && /signed 2026-08-09/.test(sg.audit[0].detail),
     JSON.stringify(sg.audit));

  const fr = await run(page, null, null, 'd-fresh', { html: '<p>x</p>' });
  ok('C5 an unsent document logs nothing', fr.audit.length === 0, JSON.stringify(fr.audit));
  await page.close();
});

/* ── D · it must not log what did not happen ──────────────────────────── */
console.log('\n── D · honesty ──');
await step('D', async () => {
  if (!NOTE_FN) { ['D1 a refused write logs nothing','D2 an unknown document logs nothing',
                   'D3 a no-op patch logs nothing','D4 the editor’s `current` is used when the list is empty']
                   .forEach(n => ok(n, false, 'no docChangeNote')); return; }
  const page = await boot(browser, [SENT], null);
  const bad = await run(page, null, null, 'd-sent', { html: '<p>x</p>' }, { failWrite: true });
  ok('D1 a refused write logs nothing', bad.audit.length === 0 && !!bad.threw,
     JSON.stringify({ audit: bad.audit, threw: bad.threw }));

  const unknown = await run(page, null, null, 'nope', { html: '<p>x</p>' });
  ok('D2 an unknown document logs nothing', unknown.audit.length === 0, JSON.stringify(unknown.audit));

  const noop = await run(page, null, null, 'd-sent', {});
  ok('D3 a no-op patch logs nothing', noop.audit.length === 0, JSON.stringify(noop.audit));
  await page.close();

  /* The list has not loaded, but the editor is open on the document. */
  const p2 = await boot(browser, [], SENT);
  const viaCurrent = await run(p2, [], SENT, 'd-sent', { html: '<p>x</p>' });
  ok('D4 the editor’s `current` is used when the list is empty',
     viaCurrent.audit.length === 1 && /SENT/.test(viaCurrent.audit[0].detail),
     JSON.stringify(viaCurrent.audit));
  await p2.close();
});

/* ── E · source invariants ─────────────────────────────────────────────── */
console.log('\n── E · invariants ──');
await step('E', async () => {
  ok('E1 auditLog is still defined exactly once',
     (HTML.match(/function auditLog\(type, detail, projectId\)\{/g) || []).length === 1);
  /* ⚠ This first counted audit_events inserts file-wide and asserted "<= 2".
     There are THREE, all of them pre-existing (auditLog, and the error
     reporter's flush + its minimal retry) — the same three on the 1077 control.
     A hardcoded number guessed off nothing failed correct code, which is this
     project's most repeated test fault. Scope it to the two functions this
     build actually touched: neither may reach the table directly. */
  ok('E2 neither new function writes to audit_events directly',
     !!NOTE_FN && !/\.insert\s*\(/.test(NOTE_FN) && !!UPD_FN && !/audit_events/.test(UPD_FN),
     'docChangeNote/update must go through auditLog, not their own insert');
  /* ⚠ This first compared two indexOf results directly, so on a control with
     no _note at all it read -1 < (a real offset) and PASSED — a check that
     cannot fail is worse than no check. Both must be FOUND first. */
  const iNote = HTML.indexOf('var _note = docChangeNote(id, fields);');
  const iWrite = HTML.indexOf("try{ r = await sb.from(TABLE).update(fields).eq('id', id); }");
  ok('E3 the note is computed before the write',
     iNote !== -1 && iWrite !== -1 && iNote < iWrite,
     'note@' + iNote + ' write@' + iWrite);
});

await browser.close();

const FLOOR = ['A1','A2','B1','B2','C1','C2','C3','C4','C5','C6','D1','D2','D3','D4','E1','E2','E3'];
const seen = [...ran];
const missing = FLOOR.filter(n => !seen.some(r => r.startsWith(n + ' ')));
console.log('\n── floor ──');
if (missing.length) { fails += missing.length;
  console.log('  FAIL  ' + missing.length + ' check(s) never ran: ' + missing.join(', ')); }
else console.log('  PASS  all ' + FLOOR.length + ' checks executed');

console.log('\n' + (fails ? 'RED' : 'GREEN') + ' — ' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
})();
