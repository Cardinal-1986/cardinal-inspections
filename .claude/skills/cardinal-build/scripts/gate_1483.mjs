/* gate_1483 — the assistant reads a PDF filed on a job (Theo, 21 Nov 2026: "Can you have this ai
   read measurements"). api/assistant.js is imported with a stub SDK, so the real tool loop runs on
   scripted replies, and fetch is a fake Supabase that records every request.

     F1  read_file is offered, takes only file_id, and the rules point the model at it and at
         projects.checklist.meas
     F2  a stored file: the row, then the bytes, both read WITH THE CALLER'S OWN TOKEN (GET, the
         authenticated storage route, job-files); the PDF comes back as a document block whose
         bytes are the file's, with a line naming the file
     F3  an old inline file (a data URL on the row) opens the same way, with no storage call
     F4  refused, each with a plain message and nothing sent to the model: a bad id (no request
         made at all), a row the person cannot see, a record that is not a file, a photo (customer
         photos stay out), another bucket, over 12 MB, bytes that are not a PDF
     F5  the loop: read_file -> the next model request carries a tool_result holding the document;
         the reply comes back; nothing is written server-side
     F6  20 MB a question: a second large PDF in the same question is refused, the first is kept

   Arg: [path to assistant.js] -> negative control (main before 1483 must go RED, not crash). */
import fs from 'fs';
import os from 'os';
import path from 'path';

const SRC = process.argv[2] || '/home/user/cardinal-inspections/api/assistant.js';
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 60000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + String(d).slice(0, 300) : '')); c ? pass++ : fail++; };
console.log('gate_1483 on ' + SRC);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate1483-'));
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
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('Total roof area 2,154 sq ft; pitch 6/12; ridge 41 ft\n'), Buffer.from('%%EOF\n')]);
const BIG = n => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(n)]);
const ID = { stored: '11111111-1111-4111-8111-111111111111', inline: '22222222-2222-4222-8222-222222222222',
  photo: '33333333-3333-4333-8333-333333333333', notfile: '44444444-4444-4444-8444-444444444444',
  hidden: '55555555-5555-4555-8555-555555555555', bucket: '66666666-6666-4666-8666-666666666666',
  huge: '77777777-7777-4777-8777-777777777777', notpdf: '88888888-8888-4888-8888-888888888888',
  big1: '99999999-9999-4999-8999-999999999991', big2: '99999999-9999-4999-8999-999999999992' };
const ROWS = {
  [ID.stored]: { id: ID.stored, title: 'File: Roofr report - test.pdf', project_id: 'p-1', created_at: '2026-11-20T21:06:00Z',
    html: JSON.stringify({ file: 1, name: 'Roofr report - test.pdf', mime: 'application/pdf', size: PDF.length, bucket: 'job-files', path: 'p-1/abc-Roofr_report_-_test.pdf' }) },
  [ID.inline]: { id: ID.inline, title: 'File: Old scope.pdf', project_id: 'p-1', created_at: '2026-08-01T12:00:00Z',
    html: JSON.stringify({ data: 'data:application/pdf;base64,' + PDF.toString('base64'), file: 1, mime: 'application/pdf', name: 'Old scope.pdf', size: PDF.length }) },
  [ID.photo]: { id: ID.photo, title: 'File: front.jpg', project_id: 'p-1', html: JSON.stringify({ file: 1, name: 'front.jpg', mime: 'image/jpeg', size: 1000, bucket: 'job-files', path: 'p-1/x-front.jpg' }) },
  [ID.notfile]: { id: ID.notfile, title: 'Contract — Roof', project_id: 'p-1', html: '<html>…</html>' },
  [ID.bucket]: { id: ID.bucket, title: 'File: vault.pdf', project_id: 'p-1', html: JSON.stringify({ file: 1, name: 'vault.pdf', mime: 'application/pdf', size: 100, bucket: 'owner-vault', path: 'x/vault.pdf' }) },
  [ID.huge]: { id: ID.huge, title: 'File: huge.pdf', project_id: 'p-1', html: JSON.stringify({ file: 1, name: 'huge.pdf', mime: 'application/pdf', size: 40 * 1048576, bucket: 'job-files', path: 'p-1/huge.pdf' }) },
  [ID.notpdf]: { id: ID.notpdf, title: 'File: renamed.pdf', project_id: 'p-1', html: JSON.stringify({ file: 1, name: 'renamed.pdf', mime: 'application/pdf', size: 20, bucket: 'job-files', path: 'p-1/renamed.pdf' }) },
  [ID.big1]: { id: ID.big1, title: 'File: big1.pdf', project_id: 'p-1', html: JSON.stringify({ file: 1, name: 'big1.pdf', mime: 'application/pdf', size: 11 * 1048576, bucket: 'job-files', path: 'p-1/big1.pdf' }) },
  [ID.big2]: { id: ID.big2, title: 'File: big2.pdf', project_id: 'p-1', html: JSON.stringify({ file: 1, name: 'big2.pdf', mime: 'application/pdf', size: 11 * 1048576, bucket: 'job-files', path: 'p-1/big2.pdf' }) },
};
const OBJ = { 'p-1/abc-Roofr_report_-_test.pdf': PDF, 'p-1/renamed.pdf': Buffer.from('PK\u0003\u0004 not a pdf at all'),
  'p-1/big1.pdf': BIG(11 * 1048576 - 9), 'p-1/big2.pdf': BIG(11 * 1048576 - 9) };
const seen = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url), h = opts.headers || {};
  seen.push({ url: u, auth: h.Authorization || h.authorization, method: opts.method || 'GET' });
  const tok = String(h.Authorization || '').replace('Bearer ', '');
  if (u.startsWith(SB + '/auth/v1/user')) {
    const map = { 'tok-theo': 'theo@cardinalrenovations.net', 'tok-joan': 'joan@cardinalrenovations.net' };
    return map[tok] ? { ok: true, status: 200, json: async () => ({ email: map[tok] }) } : { ok: false, status: 401, json: async () => ({}) };
  }
  if (u.startsWith(SB + '/rest/v1/inspection_reports')) {
    const m = /id=eq\.([0-9a-f-]+)/.exec(u); const row = m && ROWS[m[1]];
    return { ok: true, status: 200, text: async () => JSON.stringify(row && m[1] !== ID.hidden ? [row] : []) };
  }
  if (u.startsWith(SB + '/rest/v1/')) return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'p-1', name: 'Test Client', checklist: { meas: {} } }]) };
  if (u.startsWith(SB + '/storage/v1/object/authenticated/job-files/')) {
    const key = decodeURIComponent(u.slice((SB + '/storage/v1/object/authenticated/job-files/').length));
    const b = OBJ[key];
    return b ? { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length) } : { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  }
  return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
};

try {
  const mod = await import('file://' + path.join(api, 'assistant.js'));
  const theo = { owner: true, email: 'theo@cardinalrenovations.net', name: 'Theo' };
  const call = async (tok, body) => { let code = 0, out = null;
    const res = { status(c){ code = c; return this; }, json(b){ out = b; return this; } };
    await mod.default({ method: 'POST', headers: tok ? { authorization: 'Bearer ' + tok } : {}, body }, res); return { code, out }; };

  /* F1 */
  const tools = typeof mod.toolsFor === 'function' ? mod.toolsFor(theo) : [];
  const rf = tools.find(t => t.name === 'read_file');
  const rules = String(mod.RULES || '');
  ok(!!rf && JSON.stringify(rf.input_schema.required) === '["file_id"]' && rf.input_schema.additionalProperties === false && /PDF/.test(rf.description),
     'F1  read_file is offered and takes only file_id', rf ? JSON.stringify(rf.input_schema) : 'missing');
  ok(/read_file/.test(rules) && /checklist/.test(rules) && /meas/.test(rules) && /Never round, estimate or fill in/.test(rules),
     'F1  the rules send the model to read_file and to checklist.meas, and forbid guessed numbers');

  const RF = typeof mod.readFile === 'function' ? mod.readFile : null;
  ok(!!RF, 'F1  readFile is exported for this gate');
  const tryRead = async (id, spent) => { if (!RF) return { err: 'readFile missing', calls: [], missing: true }; seen.length = 0;
    try { const r = await RF(theo, 'tok-theo', { file_id: id }, spent || 0); return { r, calls: seen.slice() }; }
    catch (e) { return { err: String(e && e.message || e), calls: seen.slice() }; } };

  /* F2 */
  const a = await tryRead(ID.stored);
  const doc = a.r && a.r.content.find(b => b.type === 'document');
  const txt = a.r && a.r.content.find(b => b.type === 'text');
  const stCall = a.calls && a.calls.find(c => c.url.includes('/storage/v1/'));
  ok(!!doc && doc.source.type === 'base64' && doc.source.media_type === 'application/pdf' && Buffer.from(doc.source.data, 'base64').equals(PDF) && a.r.bytes === PDF.length,
     'F2  a stored Roofr PDF comes back as a document block carrying the file\'s own bytes', a.err || (doc && doc.source.media_type));
  ok(!!txt && /Roofr report - test\.pdf/.test(txt.text), 'F2  with a line naming the file', txt && txt.text);
  ok(!!(a.calls && a.calls.length === 2 && a.calls.every(c => c.auth === 'Bearer tok-theo' && c.method === 'GET') && stCall && /\/storage\/v1\/object\/authenticated\/job-files\/p-1\/abc-Roofr_report_-_test\.pdf$/.test(stCall.url)),
     'F2  the row and the bytes are both read with Theo\'s own token, GET, from job-files', JSON.stringify(a.calls && a.calls.map(c => [c.url.replace(SB, ''), c.auth])));

  /* F3 */
  const b = await tryRead(ID.inline);
  const bdoc = b.r && b.r.content.find(x => x.type === 'document');
  ok(!!bdoc && Buffer.from(bdoc.source.data, 'base64').equals(PDF) && b.calls.length === 1,
     'F3  an old inline file opens from its data URL, with no storage call', b.err || ('calls ' + b.calls.length));

  /* F4 */
  const bad = await tryRead('1 or 1=1');
  const hid = await tryRead(ID.hidden);
  const nf = await tryRead(ID.notfile);
  const ph = await tryRead(ID.photo);
  const bk = await tryRead(ID.bucket);
  const hg = await tryRead(ID.huge);
  const np = await tryRead(ID.notpdf);
  const refused = [bad, hid, nf, ph, bk, hg, np];
  ok(!!RF && refused.every(x => x.err && !x.r && !x.missing), 'F4  bad id, hidden row, non-file, photo, other bucket, oversize and not-a-PDF are all refused',
     JSON.stringify(refused.map(x => x.err || 'READ')));
  ok(!!RF && !!bad.err && bad.calls.length === 0, 'F4  a bad id makes no request at all', bad.calls && bad.calls.length);
  ok(!!RF && !!ph.err && /not a PDF/i.test(ph.err) && !(ph.calls || []).some(c => c.url.includes('/storage/')), 'F4  a photo is refused before its bytes are fetched (customer photos stay out)', ph.err);
  ok(!!RF && !!bk.err && /job files/.test(bk.err) && !(bk.calls || []).some(c => c.url.includes('/storage/')), 'F4  another bucket is never downloaded', bk.err);
  ok(!!RF && !!hg.err && /12 MB/.test(hg.err) && !(hg.calls || []).some(c => c.url.includes('/storage/')), 'F4  a file over 12 MB is refused from its size, before download', hg.err);

  /* F5 */
  globalThis.__REQS__ = []; seen.length = 0;
  globalThis.__SCRIPT__ = [
    { stop_reason: 'tool_use', usage: {}, content: [{ type: 'tool_use', id: 'r1', name: 'read_file', input: { file_id: ID.stored } }] },
    { stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'Roofr says 21.54 squares at 6/12, ridge 41 ft.' }] } ];
  const r5 = await call('tok-theo', { question: 'Read the Roofr measurements on the repair job' });
  const R = globalThis.__REQS__ || [];
  const tr = (R[1] && R[1].messages || []).flatMap(m => Array.isArray(m.content) ? m.content : []).find(x => x.type === 'tool_result' && x.tool_use_id === 'r1');
  const trDoc = tr && Array.isArray(tr.content) && tr.content.find(x => x.type === 'document');
  ok(r5.code === 200 && /21\.54 squares/.test(r5.out && r5.out.reply || '') && !!trDoc && trDoc.source.media_type === 'application/pdf' && !tr.is_error,
     'F5  the loop hands the model the PDF inside the tool_result and returns its reply', JSON.stringify({ code: r5.code, reply: r5.out && (r5.out.reply || r5.out.error), hasDoc: !!trDoc, isErr: tr && tr.is_error }));
  ok(seen.every(c => c.method === 'GET'), 'F5  nothing is written server-side', JSON.stringify(seen.map(c => c.method)));

  /* F6 */
  globalThis.__REQS__ = []; seen.length = 0;
  globalThis.__SCRIPT__ = [
    { stop_reason: 'tool_use', usage: {}, content: [{ type: 'tool_use', id: 'b1', name: 'read_file', input: { file_id: ID.big1 } }, { type: 'tool_use', id: 'b2', name: 'read_file', input: { file_id: ID.big2 } }] },
    { stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'Read the first one.' }] } ];
  const r6 = await call('tok-theo', { question: 'Read both' });
  const R6 = globalThis.__REQS__ || [];
  const all6 = (R6[1] && R6[1].messages || []).flatMap(m => Array.isArray(m.content) ? m.content : []);
  const t1 = all6.find(x => x.type === 'tool_result' && x.tool_use_id === 'b1');
  const t2 = all6.find(x => x.type === 'tool_result' && x.tool_use_id === 'b2');
  ok(r6.code === 200 && t1 && Array.isArray(t1.content) && t1.content.some(x => x.type === 'document') && t2 && t2.is_error === true && /one question/.test(String(t2.content)),
     'F6  a second 11 MB PDF in the same question is refused (20 MB a question); the first is kept', JSON.stringify({ code: r6.code, t1: t1 && !t1.is_error, t2: t2 && t2.content }));
} catch (e) {
  ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 400));
}

const FLOOR = 14;
if (pass + fail < FLOOR) { console.log(`  FAIL  only ${pass + fail} checks ran (floor ${FLOOR})`); fail++; }
console.log(`\n${fail ? 'GATE 1483 RED' : 'GATE 1483 GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
