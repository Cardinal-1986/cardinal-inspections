/* Build 1079 gate — the delivered copy survives, and the ORDER is the design.
 *
 * Executes the shipped docSnapReason / docSnapshot / db.update, sliced out of
 * the artifact. Every operation — the RPC and the table write — lands in ONE
 * ordered list, because "snapshot before the edit, snapshot after the delivery"
 * is the whole point and a gate that only counted calls would pass on a version
 * that copies the NEW html and looks perfectly fine.
 *
 * Also checks document_versions.sql, which ships beside this and must be
 * applied FIRST.
 *
 * Optional path argument = negative control.
 */
import fs from 'fs';
import { chromium } from 'playwright';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const HTML = fs.readFileSync(FILE, 'utf8');
const SQL_PATH = '/home/user/cardinal-inspections/document_versions.sql';
const SQL = fs.existsSync(SQL_PATH) ? fs.readFileSync(SQL_PATH, 'utf8') : '';
console.log('gate_1079 on ' + FILE);

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
const NOTE_FN  = braceSlice('function docChangeNote(id, fields){');
const SNAPR_FN = braceSlice('function docSnapReason(id, fields){');
const SNAP_FN  = braceSlice('function docSnapshot(id, reason){');
const UPD_FN   = braceSlice('update: async function(id, fields){');

const SENT   = { id: 'd-sent',   title: 'Estimate — Bob', project_id: 'p1',
                 sent_at: '2026-08-02T15:53:29Z', signed_at: null, status: 'sent' };
const SIGNED = { id: 'd-signed', title: 'EST-0896',       project_id: 'p2',
                 sent_at: null, signed_at: '2026-08-09T15:35:03Z', status: 'unsent' };
const FRESH  = { id: 'd-fresh',  title: 'draft',          project_id: 'p3',
                 sent_at: null, signed_at: null, status: 'unsent' };

/* ONE ordered list for every operation — that is what makes ordering provable. */
const RIG = (rows, cur) => `
window.__ops = [];
var TEAM = true;
var TABLE = 'inspection_reports';
var cacheRows = ${JSON.stringify(rows)};
var current = ${JSON.stringify(cur)};
var RPC_FAILS = false;
function auditLog(){}
function dbQueueOffline(id, fields){ window.__ops.push({ op:'queue', id:id }); }
var sb = {
  rpc: function(fn, args){
    window.__ops.push({ op:'rpc', fn:fn, doc:args && args.p_doc, reason:args && args.p_reason });
    if (RPC_FAILS) return Promise.reject(new Error('function does not exist'));
    return Promise.resolve({ data: 1, error: null });
  },
  from: function(table){
    var patch = null, match = null;
    var q = {
      update: function(f){ patch = f; return q; },
      eq: function(c, v){ match = v; return q; },
      then: function(res){
        window.__ops.push({ op:'write', id:match, fields:Object.keys(patch || {}) });
        return Promise.resolve({ data:null, error:null }).then(res);
      }
    };
    return q;
  }
};
${NOTE_FN  || 'function docChangeNote(){ return null; }'}
${SNAPR_FN || '/* docSnapReason MISSING */'}
${SNAP_FN  || '/* docSnapshot MISSING */'}
window.__update = ${UPD_FN ? UPD_FN.replace(/^update:\s*/, '') : 'async function(){ throw new Error("update slice missing"); }'};
`;

async function boot(browser, rows, cur) {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('    [pageerror] ' + String(e).split('\n')[0]));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: RIG(rows, cur) });
  return page;
}
async function run(page, id, fields, opts) {
  return page.evaluate(async ({ id, fields, opts }) => {
    window.__ops = [];
    RPC_FAILS = !!(opts && opts.rpcFails);
    let threw = null;
    try { await window.__update(id, fields); } catch (e) { threw = String(e && (e.message || e)); }
    return { ops: window.__ops, threw };
  }, { id, fields, opts: opts || {} });
}
const seq = r => r.ops.map(o => o.op + (o.reason ? ':' + o.reason : '')).join(' → ');

(async () => {
const browser = await chromium.launch();

console.log('\n── A · slices ──');
ok('A1 docSnapReason sliced', !!SNAPR_FN, SNAPR_FN ? SNAPR_FN.length + ' chars' : 'not found');
ok('A2 docSnapshot sliced',  !!SNAP_FN,  SNAP_FN  ? SNAP_FN.length  + ' chars' : 'not found');

console.log('\n── B · the order is the design ──');
await step('B', async () => {
  if (!SNAPR_FN || !SNAP_FN) {
    ['B1 an edit to a delivered document snapshots BEFORE the write',
     'B2 the send snapshots AFTER the write',
     'B3 the signature snapshots AFTER the write'].forEach(n => ok(n, false, 'slices missing'));
    return;
  }
  const page = await boot(browser, [SENT, SIGNED, FRESH], null);

  const edit = await run(page, 'd-sent', { html: '<p>new</p>' });
  ok('B1 an edit to a delivered document snapshots BEFORE the write',
     seq(edit) === 'rpc:before_edit → write'
       && edit.ops[0].fn === 'snapshot_document' && edit.ops[0].doc === 'd-sent',
     seq(edit));

  const send = await run(page, 'd-fresh', { status: 'sent', sent_at: '2026-08-26T00:00:00Z' });
  ok('B2 the send snapshots AFTER the write', seq(send) === 'write → rpc:sent', seq(send));

  const sign = await run(page, 'd-sent', { signed_at: '2026-08-26T00:00:00Z' });
  ok('B3 the signature snapshots AFTER the write', seq(sign) === 'write → rpc:signed', seq(sign));
  await page.close();
});

console.log('\n── C · what must NOT be versioned ──');
await step('C', async () => {
  if (!SNAPR_FN) {
    ['C1 a draft edit keeps no version','C2 a non-content patch keeps no version',
     'C3 clearing sent_at is not a delivery','C4 an unknown document keeps no version']
      .forEach(n => ok(n, false, 'slices missing'));
    return;
  }
  const page = await boot(browser, [SENT, FRESH], null);
  const draft = await run(page, 'd-fresh', { html: '<p>x</p>' });
  ok('C1 a draft edit keeps no version', seq(draft) === 'write', seq(draft));

  const meta = await run(page, 'd-sent', { title: 'renamed' });
  ok('C2 a non-content patch keeps no version', seq(meta) === 'write', seq(meta));

  const unsend = await run(page, 'd-sent', { status: 'unsent', sent_at: null });
  ok('C3 clearing sent_at is not a delivery', !/rpc:sent\b/.test(seq(unsend)), seq(unsend));

  const unknown = await run(page, 'nope', { html: '<p>x</p>' });
  ok('C4 an unknown document keeps no version', seq(unknown) === 'write', seq(unknown));
  await page.close();
});

console.log('\n── D · a missing migration must not break a save ──');
await step('D', async () => {
  if (!SNAP_FN) { ok('D1 a failing RPC still saves', false, 'slices missing'); return; }
  const page = await boot(browser, [SENT], null);
  const r = await run(page, 'd-sent', { html: '<p>x</p>' }, { rpcFails: true });
  ok('D1 a failing RPC still saves',
     !r.threw && r.ops.some(o => o.op === 'write'), JSON.stringify({ seq: seq(r), threw: r.threw }));
  await page.close();
});

console.log('\n── E · the migration ──');
await step('E', async () => {
  ok('E1 document_versions.sql ships', SQL.length > 500, SQL.length + ' chars');
  if (!SQL) { ['E2 no insert or update policy on document_versions',
               'E3 the writer is security definer and checks permission',
               'E4 anon is revoked from the function',
               'E5 the table is RLS-enabled'].forEach(n => ok(n, false, 'no SQL')); return; }
  /* A version the browser could write directly, or edit after, is not evidence. */
  ok('E2 no insert or update policy on document_versions',
     !/create\s+policy\s+\S+\s+on\s+document_versions\s+for\s+(insert|update)/i.test(SQL));
  ok('E3 the writer is security definer and checks permission',
     /security\s+definer/i.test(SQL) && /is_full_access\(\)/.test(SQL)
       && /raise\s+exception[^\n]*not permitted/i.test(SQL));
  ok('E4 anon is revoked from the function',
     /revoke\s+all\s+on\s+function\s+snapshot_document[^;]*from\s+anon/i.test(SQL)
       && /grant\s+execute[^;]*to\s+authenticated/i.test(SQL));
  ok('E5 the table is RLS-enabled',
     /alter\s+table\s+document_versions\s+enable\s+row\s+level\s+security/i.test(SQL));
});

await browser.close();

const FLOOR = ['A1','A2','B1','B2','B3','C1','C2','C3','C4','D1','E1','E2','E3','E4','E5'];
const missing = FLOOR.filter(n => ![...ran].some(r => r.startsWith(n + ' ')));
console.log('\n── floor ──');
if (missing.length) { fails += missing.length;
  console.log('  FAIL  ' + missing.length + ' check(s) never ran: ' + missing.join(', ')); }
else console.log('  PASS  all ' + FLOOR.length + ' checks executed');

console.log('\n' + (fails ? 'RED' : 'GREEN') + ' — ' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
})();
