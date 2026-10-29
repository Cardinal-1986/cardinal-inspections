/* test_api_1427.mjs — node only, no browser. Imports the three SHIPPED handlers with a stubbed req/res and a
   stubbed fetch (Supabase REST, Resend, the docs/ PDF). usage: node test_api_1427.mjs [api dir] [fixture.html]
   GREEN on builderD/api, RED (named, no crash) on the 1422 api/. The fixture is a real Roofing agreement
   as the app saves it (gate_D builds one live; default: the copy saved beside this file).            */
import fs from 'fs'; import os from 'os'; import path from 'path'; import { pathToFileURL, fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = path.resolve(process.argv[2] || path.join(HERE, '..', '..', '..', '..', 'api'));
const AGR = fs.readFileSync(process.argv[3] || path.join(HERE, 'fixtures', 'roof_agreement_1427.html'), 'utf8');
let pass = 0; const fails = [];
const ok = (c, n, d) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fails.push(n); console.log('  FAIL  ' + n + (d !== undefined ? '  -> ' + String(d).slice(0, 240) : '')); } };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'apiD-'));
for (const f of ['share.js', 'clientsign.js', 'senddoc.js', '_staff.js']) fs.copyFileSync(path.join(API, f), path.join(TMP, f));
fs.writeFileSync(path.join(TMP, 'package.json'), '{"type":"module"}');
const fresh = (n) => import(pathToFileURL(path.join(TMP, n)).href + '?' + Math.random());
const J = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => JSON.stringify(b) });
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(3000, 32)]);
const TOKEN = 'aaaaaaaa-bbbb-cccc-dddd-0000000000d2';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-not-real'; process.env.RESEND_API_KEY = 're_test';
const CO = AGR.replace(/(<td class="k">Co-buyer<\/td><td>)<span class="ph">\[CO-BUYER\]<\/span>/, '$1<span class="fill">Sample Co Buyer</span>');
const SIGNED = CO.replace(/<span class="sigslot" data-sig="buyer">[\s\S]*?<\/span><\/span>/, '<span class="sigslot signed" data-sig="buyer"><img alt="buyer signature"></span>');
const REPORT = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report</title></head><body><h2 class="sec"><span class="num">&#9776;</span>Contents</h2><h3 data-cardinal-summary-heading>Overall</h3><p class="ph">[x]</p></body></html>';
const EST = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div class="est-head"></div><table class="items"></table><div class="line"></div><div class="lbl">Client Acceptance | Date</div></body></html>';

async function share(html, title) {
  globalThis.fetch = async (u) => String(u).includes('share_token') ? J([{ id: 'd1', project_id: 'P1', project: 'Sample', html, title, total: 1, signed_at: null }]) : J([]);
  let out = ''; try { const m = await fresh('share.js'); await m.default({ query: { t: TOKEN }, headers: {} }, { setHeader() {}, status() { return this; }, send(s) { out = String(s); } }); } catch (e) { out = 'THREW ' + e.message; }
  return out;
}
/* share.js */
{
  const c = await share(AGR, 'Contract — Roofing — Sample');
  ok(/<meta name="viewport" content="width=device-width, initial-scale=1"><style id="crContractPhone">/.test(c) && !/content="width=900"/.test(c) && !/crLetterUi/.test(c), 'share  a contract is served at the device width (no Letter zoom)');
  ok(!/Company Documents &#8594; Roofing/.test(c) && /href="\/docs\/Cardinal_Roofing_Contract\.pdf#page=3"/.test(c) && /id="crMasterCard"/.test(c), 'share  the menu path becomes the printed-master link, and the master card is on the page');
  ok(/id="csInit"/.test(c) && /initials in 3 places/.test(c) && /id="csNoticeLink"/.test(c) && /You, the buyer, may cancel this transaction/.test(c), 'share  the sign sheet asks for initials and carries the notice');
  ok(/id="crContractFixJs"/.test(c), 'share  the contract freeze/blank script is injected');
  const co = await share(CO, 'Contract — Roofing — Sample');
  ok(/id="csCoPad"/.test(co) && /Co-buyer: Sample Co Buyer/.test(co), 'share  a named co-buyer gets a second signature box');
  const s = await share(SIGNED, 'Contract — Roofing — Sample');
  ok(/Co-buyer: review complete\?/.test(s) && !/id="csInit"/.test(s), 'share  buyer signed, co-buyer not: the link signs the co-buyer');
  const r = await share(REPORT, 'Roof Inspection — Sample');
  ok(/<meta name="viewport" content="width=device-width, initial-scale=1"><style id="crReportPhone">/.test(r) && /\^\\s\*\\d\+\\s\*\$/.test(r), 'share  a report gets a device-width viewport and the digit-only renumber');
  const e = await share(EST, 'Estimate — Sample');
  ok(/content="width=900"/.test(e) && /crLetterUi/.test(e) && !/crContractPhone/.test(e), 'share  an estimate keeps its 1278 Letter page');
}
/* clientsign.js */
const calls = []; let patch = null;
const csFetch = (doc) => async (u, o) => { u = String(u); const m = (o && o.method) || 'GET'; calls.push({ u, m, body: o && o.body });
  if (u.includes('share_token')) return J([{ id: 'd1', title: 'Contract — Roofing — Sample', html: doc, project_id: 'P1', created_by: 'theo@cardinalrenovations.net' }]);
  if (u.includes('/inspection_reports?id=') && m === 'PATCH') { patch = JSON.parse(o.body); return J({}); }
  if (u.includes('/projects?id=') && m === 'GET') return J([{ stage: 'Prospect', name: 'Sample', address: '1 St' }]);
  if (u.includes('/docs/')) return { ok: true, status: 200, arrayBuffer: async () => PDF };
  return J({ id: 'x' }); };
async function sign(body, doc) { calls.length = 0; patch = null; globalThis.fetch = csFetch(doc);
  const res = { s: 0, j: null, status(c) { this.s = c; return this; }, json(j) { this.j = j; return this; } };
  try { const m = await fresh('clientsign.js'); await m.default({ method: 'POST', body }, res); } catch (e) { res.s = 599; res.j = { error: e.message }; }
  return res; }
const SIG = 'data:image/png;base64,AAAABBBB';
{
  let r = await sign({ t: TOKEN, sig: SIG, name: 'Sample Buyer', initials: 'SB', email: 'buyer@example.com', cobuyer: { sig: SIG, name: 'Sample Co Buyer' } }, CO);
  const h = (patch && patch.html) || '';
  ok(r.s === 200 && (h.match(/data-clientinit="1"[^>]*>SB</g) || []).length === 3, 'clientsign  initials stamped into all 3 Initials boxes', JSON.stringify(r.j));
  ok(/class="sigslot signed" data-sig="cobuyer"/.test(h) && /class="sigslot signed" data-sig="buyer"/.test(h) && patch && patch.signed_at, 'clientsign  buyer and co-buyer both stamped, signed_at written');
  const mails = calls.filter(c => c.u.includes('api.resend.com')).map(c => JSON.parse(c.body));
  const mine = mails.find(x => (x.to || []).join() === 'buyer@example.com');
  ok(r.j && r.j.copy === 'sent' && mine && mine.attachments.length === 2 && /share\?t=/.test(mine.html), 'clientsign  the signer gets a signed copy + the Terms/Notices PDF', mine ? mine.attachments.map(a => a.filename).join(',') : 'none');
  r = await sign({ t: TOKEN, sig: SIG, name: 'Sample Buyer' }, AGR);
  const m2 = calls.filter(c => c.u.includes('api.resend.com')).map(c => JSON.parse(c.body));
  ok(r.s === 200 && !m2.some(x => /Your signed/.test(x.subject || '')) && m2.some(x => /left no email/.test(x.html || '')), 'clientsign  no typed address → no copy to anybody, and the rep is told');
  r = await sign({ t: TOKEN, sig: SIG, name: 'X', email: 'nope' }, AGR);
  ok(r.s === 400, 'clientsign  a malformed address is refused', r.s);
  r = await sign({ t: TOKEN, role: 'cobuyer', sig: SIG, name: 'Sample Co Buyer' }, SIGNED);
  ok(r.s === 200 && patch && !patch.signed_at && !calls.some(c => c.u.includes('/projects?id=') && c.m === 'PATCH'), 'clientsign  a later co-buyer signature moves nothing but its own row');
}
/* senddoc.js */
{
  const sc = []; globalThis.fetch = async (u, o) => { u = String(u); sc.push({ u, body: o && o.body });
    if (u.includes('/auth/v1/user')) return J({ email: 'theo@cardinalrenovations.net', user_metadata: { full_name: 'Theo' } });
    if (u.includes('/docs/')) return { ok: true, status: 200, arrayBuffer: async () => PDF };
    return J({ id: 'e' }); };
  const res = { s: 0, status(c) { this.s = c; return this; }, json(j) { this.j = j; return this; } };
  try { const m = await fresh('senddoc.js'); await m.default({ method: 'POST', headers: { authorization: 'Bearer t' }, body: { to: 'buyer@example.com', title: 'Contract — Roofing — Sample', html: AGR } }, res); } catch (e) { res.s = 599; }
  const mail = sc.filter(c => c.u.includes('api.resend.com')).map(c => JSON.parse(c.body))[0];
  ok(res.s === 200 && mail && mail.attachments.length === 2 && !/  /.test(mail.attachments[0].filename), 'senddoc  an emailed agreement carries the PDF; attachment name has single spaces', mail && mail.attachments.map(a => a.filename).join(','));
}
{
  const blk = (f) => { const s = fs.readFileSync(path.join(API, f), 'utf8'); const i = s.indexOf('/* D (contracts + client documents judges)'); const j = s.indexOf('const INIT_RX', i); return i < 0 || j < 0 ? '' : s.slice(i, s.indexOf('\n', j)); };
  ok(blk('share.js').length > 500 && blk('share.js') === blk('clientsign.js') && blk('clientsign.js') === blk('senddoc.js'), 'sync  the printed-master block is byte-identical in the three routes');
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nTEST API D ${fails.length ? 'RED' : 'GREEN'} — ${pass} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
