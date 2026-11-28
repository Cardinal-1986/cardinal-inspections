// offline test of api/crew-invoice.js with a fake Anthropic client (no network, no spend)
import fs from 'fs'; import path from 'path'; import url from 'url';
const dir = path.dirname(url.fileURLToPath(import.meta.url));
const tmp = path.join(dir, 'ci_api'); fs.mkdirSync(tmp, { recursive: true });
fs.writeFileSync(path.join(tmp, '_staff.js'), 'export function isStaff(e){ return /@cardinalrenovations\\.net$/.test(e); }');
let src = fs.readFileSync(process.argv[2] || path.join(dir, '../stage/api/crew-invoice.js'), 'utf8');   // usage: node test_crew_invoice_api.mjs [path/to/api/crew-invoice.js]
src = src.replace("import Anthropic from '@anthropic-ai/sdk';", "import Anthropic from './fake_sdk.js';");
fs.writeFileSync(path.join(tmp, 'crew-invoice.js'), src);
fs.writeFileSync(path.join(tmp, 'fake_sdk.js'), `
export const calls = []; export let mode = { v: 'ok' };
export default class A { constructor(o){ this.o = o;
  const fin = (p, beta) => ({ finalMessage: async () => { calls.push({ p, beta });
    if (mode.v === 'betafail' && beta) { const e = new Error('bad fallbacks'); e.status = 400; throw e; }
    if (mode.v === 'refusal') return { stop_reason: 'refusal', content: [] };
    return { stop_reason: 'end_turn', model: p.model, content: [{ type: 'text', text: JSON.stringify({ crew_name: 'Francisco Gutters', invoice_number: '4411', invoice_date: '2026-11-20', job_address: '8952 Salem Rd', customer_name: null, job_ref: null, lines: [{ description: 'Gutter', qty: 120, unit: 'LF', rate: 8, amount: '960' }], subtotal: 960, tax: null, total: '1,320.00', notes: null }) }] }; } });
  this.messages = { stream: p => fin(p, false) }; this.beta = { messages: { stream: p => fin(p, true) } }; } }`);
process.env.ANTHROPIC_API_KEY = 'test';
let fullAccess = true;
const fetched = [];
globalThis.fetch = async (u, o) => { fetched.push({ u: String(u), o });
  if (String(u).includes('/storage/v1/object/authenticated/crew-docs/')) return String(u).endsWith('missing.pdf') ? { ok: false } : { ok: true, arrayBuffer: async () => new TextEncoder().encode('%PDF-1.4 big').buffer };
  return { ok: true, json: async () => String(u).includes('/auth/v1/user') ? { email: 'theo@cardinalrenovations.net' } : fullAccess }; };
const { default: handler } = await import(url.pathToFileURL(path.join(tmp, 'crew-invoice.js')).href);
const sdk = await import(url.pathToFileURL(path.join(tmp, 'fake_sdk.js')).href);
const run = async (body, hdr = { authorization: 'Bearer t' }) => { let out = {}; const res = { status(c){ out.code = c; return res; }, json(j){ out.j = j; } }; await handler({ method: 'POST', headers: hdr, body }, res); return out; };
let fails = 0; const check = (l, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + l); if (!ok) fails++; };
let r = await run({ file: 'AAAA', mime: 'application/pdf' });
const c = sdk.calls[0];
check('PDF read ok', r.code === 200 && r.j.ok && r.j.invoice.total === 1320 && r.j.invoice.lines[0].amount === 960);
check('Claude Opus 5.5 with fallback + JSON schema', c.beta && c.p.model === 'claude-opus-5-5' && c.p.fallbacks === 'default' && c.p.output_config.format.type === 'json_schema' && c.p.messages[0].content[0].type === 'document');
r = await run({ file: 'AAAA', mime: 'image/jpeg' });
check('photo sent as image block', sdk.calls[1].p.messages[0].content[0].type === 'image' && sdk.calls[1].p.messages[0].content[0].source.media_type === 'image/jpeg');
check('odd file type refused before any AI call', (await run({ file: 'AAAA', mime: 'text/html' })).code === 400 && sdk.calls.length === 2);
sdk.mode.v = 'betafail'; r = await run({ file: 'AAAA', mime: 'image/png' });
check('fallback param refused -> plain call still answers', r.j.ok && sdk.calls.slice(-1)[0].beta === false);
sdk.mode.v = 'refusal'; r = await run({ file: 'AAAA', mime: 'image/png' });
check('refusal -> friendly error, no data', !r.j.ok && /clearer photo/.test(r.j.error));
sdk.mode.v = 'ok'; fullAccess = false; const n = sdk.calls.length; r = await run({ file: 'AAAA', mime: 'image/png' });
check('non-office refused, no AI spend', r.code === 403 && sdk.calls.length === n);
check('no sign-in refused', (await run({ file: 'A', mime: 'image/png' }, {})).code === 401);
sdk.mode.v = 'ok'; fullAccess = true;
r = await run({ storage_path: 'invoices/2026-11/abc12-inv.pdf', mime: 'application/pdf' });
const sf = fetched.filter(x => x.u.includes('/storage/'));
check('1490: PDF read from crew-docs with the user token', r.j.ok && sf.length === 1 && sf[0].o.headers.Authorization === 'Bearer t' && sdk.calls.slice(-1)[0].p.messages[0].content[0].source.data === Buffer.from('%PDF-1.4 big').toString('base64'));
check('1490: path outside invoices/ refused', (await run({ storage_path: '../photos/x.pdf', mime: 'application/pdf' })).code === 400);
check('1490: path mode only for PDFs', (await run({ storage_path: 'invoices/2026-11/a.jpg', mime: 'image/jpeg' })).code === 400);
check('1490: missing saved file -> 404 message', (await run({ storage_path: 'invoices/2026-11/missing.pdf', mime: 'application/pdf' })).code === 404);
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
