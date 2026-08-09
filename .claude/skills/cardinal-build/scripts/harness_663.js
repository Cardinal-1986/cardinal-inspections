/* Build 663 — the diagnosis says how big the document WAS.

   The reading guide for 661's tail says: "if `in` reads under 1,000 tokens the
   payload was truncated before reaching the model." That inference cannot be
   drawn from `in` alone. A small ingest is EITHER a document that never arrived
   (the storage fetch came back short) OR one that arrived whole and was not
   read. Different bugs, different code — and one number tells them apart.

   So the load-bearing test here is not "does `doc` appear". It is that TWO runs
   with an IDENTICAL model reply and an IDENTICAL token count produce visibly
   DIFFERENT tails when the document differs. If they read the same, the field
   is decoration.

   Usage: node harness_663.js [index.html] [api/sol.js]
   Point both at the previous build as the negative control — it must go red. */
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APIF = process.argv[3] || '/home/user/cardinal-inspections/api/sol.js';
const SRC = fs.readFileSync(FILE, 'utf8');
const API = fs.readFileSync(APIF, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const errOf = (r) => String((r && r.body && r.body.error) || '');
const exOf  = (r) => (r && r.body && r.body.extracted) || {};
const CLIENT_SLICE = 400;   /* 663 raised it from 250 — see below */

(async function () {

let handler = null;
try {
  const mod = await import('file://' + APIF + '?v=' + Date.now());
  handler = mod.default;
} catch (e) { console.log('  (import failed: ' + e.message + ')'); }
ok('api/sol.js exports a handler', typeof handler === 'function');

function res() {
  const r = { code: null, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

const STORE = 'https://yipslubcptjoarblzbpl.supabase.co/storage/v1/object/sign/photos/scopes/gunn.pdf?token=x';

/* opts.storedBytes → drive the {url} door with a document of that size.
   opts.inlineB64   → drive the {file} door with that base64 payload. */
function drive(replies, opts) {
  opts = opts || {};
  const seen = { gemini: 0, logs: [] };
  const realFetch = global.fetch, realErr = console.error;
  console.error = (...a) => { seen.logs.push(a.join(' ')); };
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'theo@cardinalrenovations.net' }) };
    }
    if (u.startsWith('https://yipslubcptjoarblzbpl.supabase.co/storage/')) {
      const buf = Buffer.alloc(opts.storedBytes || 0, 7);
      return { ok: true, status: 200, headers: { get: () => 'application/pdf' },
               arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    }
    if (u.includes('generativelanguage')) {
      const i = Math.min(seen.gemini, replies.length - 1);
      seen.gemini++;
      const rep = replies[i] || {};
      return { ok: rep.httpOk !== false, status: rep.httpOk === false ? 503 : 200,
               json: async () => rep.payload };
    }
    if (u.includes('openai.com')) return { ok: false, status: 400, json: async () => ({}) };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const body = opts.storedBytes != null ? { url: STORE }
                                        : { file: opts.inlineB64 || 'QUJDREVGRw', mime: 'application/pdf' };
  const req = { method: 'POST', headers: { authorization: 'Bearer tok' }, body };
  const r = res();
  const done = () => { global.fetch = realFetch; console.error = realErr; };
  return handler(req, r).then(() => { done(); return { r, seen }; }, (e) => { done(); throw e; });
}

/* the SAME reply and the SAME token count in both runs — only the document differs */
const SILENT = { payload: { candidates: [{ finishReason: 'STOP', content: { role: 'model' } }],
  usageMetadata: { promptTokenCount: 400, candidatesTokenCount: 0 } } };

const keyWas = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = 'test-key';
delete process.env.OPENAI_API_KEY;

console.log('\n── THE BUILD: the same failure, told apart by the document ──');
{
  const whole   = await drive([SILENT], { storedBytes: 4.8 * 1024 * 1024 });
  const short   = await drive([SILENT], { storedBytes: 900 });
  const eWhole = errOf(whole.r), eShort = errOf(short.r);

  ok('a 4.8 MB document is reported as 4.8 MB', /doc 4\.8 MB/.test(eWhole), eWhole);
  ok('a 900-byte one is reported as 0.0 MB', /doc 0\.0 MB/.test(eShort), eShort);
  /* the load-bearing assertion: identical model behaviour, different finding */
  ok('BOTH runs saw the same reply and the same `in 400 tok`',
    /in 400 tok/.test(eWhole) && /in 400 tok/.test(eShort));
  ok('…and yet the two tails are DIFFERENT — otherwise the field is decoration',
    eWhole !== eShort, JSON.stringify([eWhole.slice(-60), eShort.slice(-60)]));
  ok('…which is exactly the ambiguity 661\'s tail could not resolve',
    /doc 4\.8 MB · in 400 tok/.test(eWhole) && /doc 0\.0 MB · in 400 tok/.test(eShort));
}

console.log('\n── both doors report a size, not just the one ──');
{
  /* the inline door never touches a Buffer, so the size is derived from base64 */
  const big = 'Q'.repeat(4 * 1024 * 1024) + '==';        /* ~3 MB of payload */
  const { r } = await drive([SILENT], { inlineB64: big });
  ok('the inline door derives its size from the base64 length', /doc 3\.0 MB/.test(errOf(r)), errOf(r));
}

console.log('\n── one place the diagnosis is assembled ──');
{
  const defs = (API.match(/function readerDiag\s*\(/g) || []).length;
  const calls = (API.match(/readerDiag\(/g) || []).length - defs;
  ok('readerDiag is defined once', defs === 1, defs);
  ok('…and CALLED from exactly one place, so a new field cannot miss a site',
    calls === 1, calls);
  ok('the four report paths go through the local diag() wrapper',
    (API.match(/\bdiag\(a[,)]/g) || []).length >= 3, (API.match(/\bdiag\(a[,)]/g) || []).length);
}

console.log('\n── the tail stopped being one field from the cliff ──');
{
  ok('the client slice was raised off 250', !SRC.includes('String(_msg).slice(0, 250)'));
  ok('…to 400', SRC.includes('var err = new Error(String(_msg).slice(0, 400));'));
  /* the worst case this route can build: longest sentence + every diag field +
     the skip note. If THAT fits, nothing else can be cut. */
  const worst = await drive([SILENT], { storedBytes: 4.8 * 1024 * 1024 });
  ok('a full diagnosis is comfortably inside the new slice',
    errOf(worst.r).length <= CLIENT_SLICE, errOf(worst.r).length);
  const carrier = await drive([{ httpOk: false, payload: { error: { message: 'x'.repeat(800) } } }],
    { storedBytes: 4.8 * 1024 * 1024 });
  ok('an 800-char carrier error still ends with its diagnosis intact',
    errOf(carrier.r).length <= CLIENT_SLICE && /\]$/.test(errOf(carrier.r).trim()),
    errOf(carrier.r).length + ' | ' + errOf(carrier.r).slice(-70));
}

console.log('\n── the log answers the same question ──');
{
  const { seen } = await drive([{ payload: { candidates: [{ finishReason: 'STOP',
    content: { parts: [{ text: 'I cannot read this.' }] } }] } }], { storedBytes: 4.8 * 1024 * 1024 });
  ok('the server log carries the byte count too', /"docBytes":\s*5033164/.test(seen.logs.join('')),
    seen.logs.join('').slice(0, 200));
}

console.log('\n── 662, 661 and 659 all still hold ──');
{
  const GOOD = { payload: { candidates: [{ finishReason: 'STOP', content: { parts: [{
    text: '{"carrier":"Allstate","ord_law_basis":"BC-Building Codes"}' }] } }],
    usageMetadata: { promptTokenCount: 48210, candidatesTokenCount: 96 } } };
  const one = await drive([GOOD], { storedBytes: 4.8 * 1024 * 1024 });
  ok('a clean read is still ONE model call and a 200',
    one.seen.gemini === 1 && one.r.code === 200 &&
    exOf(one.r).ord_law_basis === 'BC-Building Codes', one.seen.gemini + ' / ' + one.r.code);
  ok('…and logs nothing', one.seen.logs.length === 0, one.seen.logs.length);
  const retry = await drive([SILENT, GOOD], { storedBytes: 4.8 * 1024 * 1024 });
  ok('661\'s retry still runs and still rescues the read',
    retry.seen.gemini === 2 && retry.r.code === 200, retry.seen.gemini + ' / ' + retry.r.code);
  const maxt = await drive([{ payload: { candidates: [{ finishReason: 'MAX_TOKENS',
    content: { parts: [{ text: '{"carrier":"All' }] } }] } }], { storedBytes: 4.8 * 1024 * 1024 });
  ok('a truncation is still named and still not retried',
    maxt.seen.gemini === 1 && /ran out of room/i.test(errOf(maxt.r)), errOf(maxt.r).slice(0, 90));
  ok('662\'s time budget survived the refactor', /TIME_BUDGET_MS\s*=\s*45000/.test(API) &&
    /elapsed\(\)\s*\+\s*a\.ms\s*<\s*TIME_BUDGET_MS/.test(API));
  ok('660\'s BC prompt survived it too', /BC-Building Codes/.test(API));
}

if (keyWas === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = keyWas;

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 663 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 663; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:663,/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
