/* Build 659 — the scope reader finishes its sentence.

   Theo's three failures all showed the AI's own reply, cut off mid-word, in
   an alert prefixed "Could not read that scope:". The model had read the
   document correctly each time (carrier, policy number, 7,911.67 Deprec,
   13,781.46 ACV were all IN the error text) and was being truncated at
   maxOutputTokens: 1024 because it narrates page by page before emitting
   JSON. Then the raw text came back as `detail`, and the client preferred
   `detail` over `error`.

   The server half is EXECUTED: api/sol.js's handler is loaded and driven
   with a stubbed fetch that replays each failure shape — truncated,
   prose-wrapped, and clean — asserting what the caller is told.

   Usage: node harness_659.js [index.html]
   Point it at the previous build as the negative control — it must go red. */
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = fs.readFileSync(FILE, 'utf8');
const API = fs.readFileSync('/home/user/cardinal-inspections/api/sol.js', 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

(async function () {

console.log('\n── the truncation itself ──');
{
  ok('Gemini is no longer capped at the 1024 that cut Theo off',
    !/maxOutputTokens:\s*1024/.test(API) && /maxOutputTokens:\s*8192/.test(API));
  ok('…and is told to answer in JSON, so it stops narrating',
    /responseMimeType:\s*'application\/json'/.test(API));
  ok('the OpenAI fallback had the SAME ceiling and got the same fix',
    !/max_tokens:\s*1200/.test(API) && /max_tokens:\s*4096/.test(API) &&
    /response_format:\s*\{\s*type:\s*'json_object'\s*\}/.test(API));
}

console.log('\n── the server, executed against each failure shape ──');
{
  /* load the real handler */
  const path = '/home/user/cardinal-inspections/api/sol.js';
  const mod = await import('file://' + path + '?v=' + Date.now());
  const handler = mod.default;
  ok('api/sol.js exports a handler', typeof handler === 'function');

  function res() {
    const r = { code: null, body: null };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    return r;
  }
  const realFetch = global.fetch;
  function drive(geminiPayload) {
    global.fetch = async (url) => {
      const u = String(url);
      /* the handler wants a user with an EMAIL, not just an id — a stub that
         returns {id} alone reads as an invalid session and every later
         assertion fails for the wrong reason. */
      if (u.includes('/auth/v1/user')) return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'theo@cardinalrenovations.net' }) };
      if (u.includes('generativelanguage')) return { ok: true, status: 200, json: async () => geminiPayload };
      if (u.includes('openai.com')) return { ok: false, status: 500, json: async () => ({}) };
      return { ok: false, status: 404, json: async () => ({}) };
    };
    const req = { method: 'POST', headers: { authorization: 'Bearer tok' },
      body: { file: 'QUJD', mime: 'application/pdf' } };
    const r = res();
    return handler(req, r).then(() => r);
  }
  const geminiKeyWas = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';

  // 1. THE ACTUAL FAILURE: truncated mid-JSON, finishReason MAX_TOKENS
  {
    const r = await drive({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{
      text: '{\n  "carrier": "Allstate Vehicle and Property Insurance Company",\n  "policy_number": "000826751113",\n  "' }] } }] });
    ok('a truncated reply is named as running out of room, in words', r.code === 502 &&
      /ran out of room/i.test(r.body.error), JSON.stringify(r.body).slice(0, 160));
    ok('…and the raw half-finished JSON is NOT shown to the user',
      !/policy_number/.test(JSON.stringify(r.body)), JSON.stringify(r.body).slice(0, 160));
    ok('…and it suggests what to do about it', /scope and totals pages/i.test(r.body.error));
  }

  // 2. a model that ignores the JSON instruction and wraps it in prose
  {
    const r = await drive({ candidates: [{ finishReason: 'STOP', content: { parts: [{
      text: 'Here is what I found:\n\n{ "carrier": "Allstate", "totals": { "rcv": 41000 } }\n\nHope that helps.' }] } }] });
    ok('prose-wrapped JSON is salvaged instead of failing', r.code === 200, JSON.stringify(r.body).slice(0, 160));
    ok('…and the salvaged fields are the real ones',
      r.body.extracted && r.body.extracted.carrier === 'Allstate' && r.body.extracted.totals.rcv === 41000);
  }

  // 3. genuinely unreadable — a sentence, not a dump
  {
    const r = await drive({ candidates: [{ finishReason: 'STOP', content: { parts: [{
      text: 'I am sorry, this looks like a photograph of a truck.' }] } }] });
    ok('an unreadable document gets a plain-English sentence', r.code === 502 &&
      /could not turn this document into fields/i.test(r.body.error), JSON.stringify(r.body).slice(0, 160));
  }

  // 4. the happy path still works
  {
    const r = await drive({ candidates: [{ finishReason: 'STOP', content: { parts: [{
      text: '{"carrier":"Allstate","totals":{"rcv":41000,"acv":13781.46,"depreciation":7911.67}}' }] } }] });
    ok('a clean reply still returns extracted fields', r.code === 200 &&
      r.body.extracted.totals.depreciation === 7911.67, JSON.stringify(r.body).slice(0, 160));
  }

  global.fetch = realFetch;
  if (geminiKeyWas === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = geminiKeyWas;
}

console.log('\n── the client stops preferring the raw dump ──');
{
  ok('solRead prefers the server\'s sentence over its detail',
    SRC.includes("var _msg = (j && j.error) || (j && j.detail) || ('HTTP ' + r.status);"));
  ok('the old detail-first line is gone',
    !SRC.includes("String((j && (j.detail || j.error)) || ('HTTP ' + r.status)).slice(0, 250)"));
  ok('the comment no longer claims sol.js returns only `error`',
    SRC.includes('659 FLIPPED THIS LINE') && !SRC.includes('carries only `error`, so it already resolves to the'));
  ok('the flip was NOT propagated to the other routes\' fetch sites (their convention stands)',
    (SRC.match(/data\.detail \|\| data\.error/g) || []).length >= 10,
    (SRC.match(/data\.detail \|\| data\.error/g) || []).length);
  ok('solRead still attaches .status so callers can special-case a 413',
    SRC.includes('err.status = r.status;'));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
