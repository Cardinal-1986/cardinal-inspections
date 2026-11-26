/* gate_1484 — one sales rep gets the Assistant, fenced to their own jobs (Theo, 21 Nov 2026: "Give
   [a sales rep] access to the ai assistant but make sure he can only see his clients").
   api/assistant.js is imported with a stub SDK so the real tool loop runs on scripted replies, and
   fetch is a fake Supabase that records every request.

     J1  the rep gets in; any other rep is still 403, and the 403 no longer names people
     J2  the rep's tables are exactly the sales list: no crews or crew money, no community partners,
         properties or contacts, no adjusters, reminders, audit history or owner tables; a read of
         any of those is refused before a request is built. Theo and Joan keep their full lists
     J3  the tools as the rep: db_select offers only those tables; propose_changes offers only the
         four writable tables and no delete
     J4  proposals as the rep: a stage move is kept; money, crews, reference lists and any delete
         are dropped with a reason. Joan's money proposal is still kept (unchanged for her)
     J5  the loop as the rep: every read goes out WITH THE REP'S OWN TOKEN (RLS is the fence); the
         system prompt tells the model it sees only the rep's jobs and every total covers only them.
         Theo's prompt does not carry that line
     J6  read_file as the rep: the row and the bytes are fetched with the rep's token
     J7  the browser's Ask-button list and the server's list name exactly the same people

   Args: [assistant.js] [index.html] -> negative control (main at 1483 must go RED, not crash). */
import fs from 'fs';
import os from 'os';
import path from 'path';

const SRC = process.argv[2] || '/home/user/cardinal-inspections/api/assistant.js';
const APP = process.argv[3] || '/home/user/cardinal-inspections/index.html';
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 60000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + String(d).slice(0, 320) : '')); c ? pass++ : fail++; };
console.log('gate_1484 on ' + SRC + ' + ' + APP);

const REP = 'jwamsley@cardinalrenovations.net', OTHER = 'nick@cardinalrenovations.net';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate1484-'));
const api = path.join(tmp, 'api');
fs.mkdirSync(path.join(api, 'node_modules', '@anthropic-ai', 'sdk'), { recursive: true });
fs.copyFileSync(SRC, path.join(api, 'assistant.js'));
fs.writeFileSync(path.join(api, 'package.json'), JSON.stringify({ type: 'module' }));
fs.writeFileSync(path.join(api, 'node_modules/@anthropic-ai/sdk/package.json'), JSON.stringify({ name: '@anthropic-ai/sdk', version: '0.0.0-stub', type: 'module', main: 'index.js' }));
fs.writeFileSync(path.join(api, 'node_modules/@anthropic-ai/sdk/index.js'), `
function stream(p, o){ (globalThis.__REQS__ = globalThis.__REQS__ || []).push(JSON.parse(JSON.stringify(p)));
  const r = (globalThis.__SCRIPT__ || []).shift(); return { finalMessage: async () => { if (!r) throw new Error('script ran out'); return r; } }; }
export default class Anthropic { constructor(){ this.messages = { stream }; this.beta = { messages: { stream } }; } }
`);
process.env.ANTHROPIC_API_KEY = 'dummy';

const SB = 'https://yipslubcptjoarblzbpl.supabase.co';
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('Total roof area 1,980 sq ft; pitch 7/12\n'), Buffer.from('%%EOF\n')]);
const FID = '11111111-1111-4111-8111-111111111111';
const FROW = { id: FID, title: 'File: Roofr report.pdf', project_id: 'p-1', created_at: '2026-11-20T21:06:00Z',
  html: JSON.stringify({ file: 1, name: 'Roofr report.pdf', mime: 'application/pdf', size: PDF.length, bucket: 'job-files', path: 'p-1/abc-Roofr_report.pdf' }) };
const seen = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url), h = opts.headers || {};
  const auth = h.Authorization || h.authorization || '';
  seen.push({ url: u, auth, method: opts.method || 'GET' });
  const tok = String(auth).replace('Bearer ', '');
  if (u.startsWith(SB + '/auth/v1/user')) {
    const map = { 'tok-theo': 'theo@cardinalrenovations.net', 'tok-joan': 'joan@cardinalrenovations.net', 'tok-jerry': REP, 'tok-nick': OTHER };
    return map[tok] ? { ok: true, status: 200, json: async () => ({ email: map[tok] }) } : { ok: false, status: 401, json: async () => ({}) };
  }
  if (u.startsWith(SB + '/rest/v1/inspection_reports') && u.includes(FID)) return { ok: true, status: 200, text: async () => JSON.stringify([FROW]), json: async () => [FROW] };
  if (u.startsWith(SB + '/rest/v1/')) return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'p-1', name: 'Dana Test', stage: 'Approved' }]), json: async () => [{ id: 'p-1' }] };
  if (u.startsWith(SB + '/storage/v1/object/authenticated/job-files/')) return { ok: true, status: 200, arrayBuffer: async () => PDF.buffer.slice(PDF.byteOffset, PDF.byteOffset + PDF.length) };
  return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
};

let mod = {};
try { mod = await import('file://' + path.join(api, 'assistant.js')); } catch (e) { ok(false, 'assistant.js imports', String(e && e.message || e)); }
const call = async (tok, body) => { let code = 0, out = null;
  const res = { status(c){ code = c; return this; }, json(b){ out = b; return this; } };
  await mod.default({ method: 'POST', headers: tok ? { authorization: 'Bearer ' + tok } : {}, body }, res); return { code, out }; };
const PEOPLE = mod.PEOPLE || {};
const rep = Object.assign({ email: REP }, PEOPLE[REP] || { name: 'Rep', owner: false, sales: true });
const theo = Object.assign({ email: 'theo@cardinalrenovations.net' }, PEOPLE['theo@cardinalrenovations.net'] || { owner: true });
const joan = Object.assign({ email: 'joan@cardinalrenovations.net' }, PEOPLE['joan@cardinalrenovations.net'] || { owner: false });
const tablesFor = typeof mod.tablesFor === 'function' ? mod.tablesFor : () => [];
const refuses = (p, t) => { try { mod.selectUrl(p, { table: t }); return false; } catch (e) { return true; } };

const SALES = ['projects', 'appointments', 'estimates', 'inspection_reports', 'document_versions', 'contracts', 'collections',
  'commissions', 'draws', 'insurance_claims', 'insurance_payments', 'insurance_supplements', 'claim_notes', 'claim_upgrades',
  'punch_items', 'project_photos', 'pricing_items', 'materials', 'oc_colors', 'team_profiles'];
const FENCED = ['crews', 'crew_notes', 'crew_work_orders', 'crew_payments', 'crew_rates', 'crew_docs', 'community_partners',
  'community_properties', 'community_contacts', 'carrier_adjusters', 'payment_reminders', 'audit_events', 'owner_reviews', 'owner_ledger'];

try {
  /* J1 */
  globalThis.__SCRIPT__ = [{ stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'hello there' }] }];
  const a = await call('tok-jerry', { question: 'hi' }), b = await call('tok-nick', { question: 'hi' });
  ok(a.code === 200 && /hello/.test(a.out && a.out.reply) && b.code === 403 && !/Theo|Joan/.test(String(b.out && b.out.error)),
     'J1  the rep gets in; another rep is still 403, and the refusal no longer names people', JSON.stringify({ rep: a.code, other: b.code, msg: b.out && b.out.error }));

  /* J2 */
  const rt = tablesFor(rep), all = Object.keys(mod.SCHEMA || {});
  const same = rt.length === SALES.length && SALES.every(t => rt.includes(t));
  const fencedOut = FENCED.filter(t => rt.includes(t) || !refuses(rep, t));
  const theoAll = tablesFor(theo).length === all.length && all.length > 0;
  const joanAll = tablesFor(joan).length === all.filter(t => !/^owner_/.test(t)).length;
  ok(same && !fencedOut.length && theoAll && joanAll && !refuses(rep, 'projects'),
     'J2  the rep reads only the sales tables; crews, community, adjusters, reminders, audit and owner tables are refused; Theo and Joan unchanged',
     JSON.stringify({ rep: rt, leaked: fencedOut, theoAll, joanAll }));

  /* J3 */
  const tools = typeof mod.toolsFor === 'function' ? mod.toolsFor(rep) : [];
  const ds = tools.find(t => t.name === 'db_select'), pc = tools.find(t => t.name === 'propose_changes');
  const dsEnum = ds && ds.input_schema.properties.table.enum || [];
  const pcItem = pc && pc.input_schema.properties.changes.items.properties || {};
  const pcTables = (pcItem.table && pcItem.table.enum) || [], pcActs = (pcItem.action && pcItem.action.enum) || [];
  const W = ['projects', 'appointments', 'punch_items', 'claim_notes'];
  const theoActs = (((typeof mod.toolsFor === 'function' ? mod.toolsFor(theo) : []).find(t => t.name === 'propose_changes') || { input_schema: { properties: { changes: { items: { properties: { action: { enum: [] } } } } } } }).input_schema.properties.changes.items.properties.action.enum);
  ok(dsEnum.length === SALES.length && pcTables.length === W.length && W.every(t => pcTables.includes(t)) && !pcActs.includes('delete') && pcActs.includes('update') && theoActs.includes('delete'),
     'J3  the rep\'s tools: db_select offers only the sales tables; propose_changes only the four writable tables, no delete (Theo keeps delete)',
     JSON.stringify({ ds: dsEnum.length, pcTables, pcActs, theoActs }));

  /* J4 */
  const P = mod.cleanProposals(rep, { summary: 's', changes: [
    { table: 'projects', action: 'update', id: 'p-1', values: { stage: 'Completed' }, label: 'Move Dana' },
    { table: 'collections', action: 'insert', values: { project_id: 'p-1', amount: 2000, type: 'deposit' }, label: 'Deposit' },
    { table: 'appointments', action: 'delete', id: 'ap-1', label: 'Delete appt' },
    { table: 'crews', action: 'update', id: 'c-1', values: { notes: 'x' }, label: 'Crew' },
    { table: 'pricing_items', action: 'update', id: 'pi-1', values: { rate: 1 }, label: 'Price' },
    { table: 'projects', action: 'delete', id: 'p-1', label: 'Delete job' } ] });
  const J = mod.cleanProposals(joan, { summary: 's', changes: [{ table: 'collections', action: 'insert', values: { project_id: 'p-1', amount: 2000, type: 'deposit' }, label: 'Deposit' }] });
  ok(P.changes.length === 1 && P.changes[0].table === 'projects' && P.changes[0].values.stage === 'Completed' && P.dropped.length === 5 && J.changes.length === 1,
     'J4  the rep\'s proposals: a stage move kept; money, crews, the price list and every delete dropped; Joan\'s deposit still kept',
     JSON.stringify({ kept: P.changes.map(c => c.table + ':' + c.action), dropped: P.dropped, joan: J.changes.length }));

  /* J5 */
  globalThis.__REQS__ = []; seen.length = 0;
  globalThis.__SCRIPT__ = [
    { stop_reason: 'tool_use', usage: {}, content: [{ type: 'tool_use', id: 't1', name: 'db_select', input: { table: 'projects' } }] },
    { stop_reason: 'tool_use', usage: {}, content: [{ type: 'tool_use', id: 't2', name: 'db_select', input: { table: 'crews' } }] },
    { stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'You have one job: [Dana Test](job:p-1).' }] } ];
  const r = await call('tok-jerry', { question: 'what jobs do I have' });
  const R = globalThis.__REQS__ || [];
  const reads = seen.filter(x => x.url.includes('/rest/v1/'));
  const sys = R[0] && R[0].system ? R[0].system.map(s => s.text).join('\n') : '';
  const crewRes = (R[2] && R[2].messages || []).flatMap(m => Array.isArray(m.content) ? m.content : []).find(x => x.type === 'tool_result' && x.tool_use_id === 't2');
  globalThis.__REQS__ = [];
  globalThis.__SCRIPT__ = [{ stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'ok' }] }];
  await call('tok-theo', { question: 'hi' });
  const theoSys = (globalThis.__REQS__[0] && globalThis.__REQS__[0].system || []).map(s => s.text).join('\n');
  ok(r.code === 200 && reads.length === 1 && reads[0].auth === 'Bearer tok-jerry' && reads.every(x => x.method === 'GET')
     && !!crewRes && crewRes.is_error && /sales rep/i.test(sys) && /only the jobs/i.test(sys) && /totals?/i.test(sys) && !/sales rep\. You can see only/i.test(theoSys),
     'J5  the loop as the rep: reads go out with the rep\'s own token, a crew read is refused before any request, the prompt says only their jobs; Theo\'s prompt does not',
     JSON.stringify({ code: r.code, reads: reads.map(x => x.auth + ' ' + x.url.split('?')[0].split('/').pop()), crewErr: crewRes && crewRes.content, sysTail: sys.slice(-300) }));

  /* J6 */
  seen.length = 0;
  let f = null; try { f = typeof mod.readFile === 'function' ? await mod.readFile(rep, 'tok-jerry', { file_id: FID }) : null; } catch (e) { f = { err: String(e && e.message || e) }; }
  const fr = seen.filter(x => x.url.startsWith(SB));
  ok(!!f && Array.isArray(f.content) && fr.length === 2 && fr.every(x => x.auth === 'Bearer tok-jerry' && x.method === 'GET') && fr[1].url.includes('/storage/v1/object/authenticated/job-files/'),
     'J6  read_file as the rep: the row and the bytes are fetched with the rep\'s own token (RLS and the job-files policy decide)',
     JSON.stringify({ f: f && (f.err || 'doc'), reqs: fr.map(x => x.auth + ' ' + x.url.slice(SB.length, SB.length + 60)) }));

  /* J7 */
  const html = fs.readFileSync(APP, 'utf8');
  const m = /var AI_PEOPLE = \{([^}]*)\}/.exec(html);
  const browser = m ? (m[1].match(/'([^']+)'\s*:/g) || []).map(x => x.replace(/['\s:]/g, '')).sort() : [];
  const server = Object.keys(PEOPLE).sort();
  ok(browser.length > 0 && browser.join() === server.join() && browser.includes(REP) && !browser.includes(OTHER),
     'J7  the Ask-button list and the server list name exactly the same people, the rep included, other reps not',
     JSON.stringify({ browser, server }));
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 400)); }

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
