/* Build 661 — a failed scope read says WHICH failure, and tries the other way first.

   Theo's newest failure was my own 659 sentence: "The reader could not turn this
   document into fields." That one sentence is the answer for four unrelated
   causes — the AI refused the document, answered nothing, answered in prose, or
   never received the document at all — and 659 also stopped `detail` reaching
   the screen, so neither of us could tell them apart.

   The route is EXECUTED, not asserted about: api/sol.js's real handler is
   imported and driven with a stubbed fetch that replays each shape, counting
   how many times the model is actually called. The retry is the whole build, so
   the call COUNT is an assertion in its own right — a retry that fires on the
   happy path would double every bill in the app's most expensive route.

   Usage: node harness_661.js [index.html] [api/sol.js]
   Point both at the previous build as the negative control — it must go red. */
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APIF = process.argv[3] || '/home/user/cardinal-inspections/api/sol.js';
const SRC = fs.readFileSync(FILE, 'utf8');
const API = fs.readFileSync(APIF, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* the client's own ceiling — solRead() does .slice(0, 250) before it throws, so
   any server sentence longer than this loses its tail, and the tail is the part
   that carries the diagnosis. */
const CLIENT_SLICE = 250;

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

/* `replies` is consumed one Gemini call at a time, so a test can say "the JSON
   attempt gives nothing, the plain attempt gives the answer" — which is exactly
   the shape the retry exists for. The last entry repeats if it runs out. */
function drive(replies, opts) {
  opts = opts || {};
  const seen = { gemini: 0, openai: 0, cfgs: [], oaBody: null };
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    const u = String(url);
    /* the handler wants a user with an EMAIL, not just an id — a stub returning
       {id} alone reads as an invalid session and every later assertion fails
       for the wrong reason (659 lost six assertions to exactly that). */
    if (u.includes('/auth/v1/user')) {
      return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'theo@cardinalrenovations.net' }) };
    }
    if (u.includes('generativelanguage')) {
      const sent = JSON.parse(init.body);
      seen.cfgs.push(sent.generationConfig || {});
      const i = Math.min(seen.gemini, replies.length - 1);
      seen.gemini++;
      const rep = replies[i] || {};
      return { ok: rep.httpOk !== false, status: rep.httpOk === false ? 503 : 200,
               json: async () => rep.payload };
    }
    if (u.includes('openai.com')) {
      seen.openai++;
      seen.oaBody = JSON.parse(init.body);
      if (!opts.openaiText) return { ok: false, status: 400, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({
        choices: [{ message: { content: opts.openaiText } }] }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const req = { method: 'POST', headers: { authorization: 'Bearer tok' },
    body: { file: 'QUJD', mime: opts.mime || 'application/pdf' } };
  const r = res();
  return handler(req, r).then(() => { global.fetch = realFetch; return { r, seen }; },
                              (e) => { global.fetch = realFetch; throw e; });
}

const GOOD = { payload: { candidates: [{ finishReason: 'STOP', content: { parts: [{
  text: '{"carrier":"Allstate","ord_law":true,"ord_law_basis":"BC-Building Codes","ord_law_rcv":1887.33,"ord_law_acv":1933.72}' }] } }],
  usageMetadata: { promptTokenCount: 48210, candidatesTokenCount: 96 } } };
const EMPTY = { payload: { candidates: [{ finishReason: 'STOP', content: { role: 'model' } }],
  usageMetadata: { promptTokenCount: 48210, candidatesTokenCount: 0 } } };
const PROSE = { payload: { candidates: [{ finishReason: 'STOP', content: { parts: [{
  text: 'I am unable to extract fields from this document.' }] } }],
  usageMetadata: { promptTokenCount: 48210, candidatesTokenCount: 11 } } };

const keyWas = process.env.GEMINI_API_KEY, oaWas = process.env.OPENAI_API_KEY;
process.env.GEMINI_API_KEY = 'test-key';
delete process.env.OPENAI_API_KEY;

console.log('\n── the retry: an unparseable JSON-mode reply is tried the old way ──');
{
  /* THE BUILD. 659 added responseMimeType and the failure changed shape in the
     same build, so json-mode is the suspect — and this is what happens when the
     suspicion is right. */
  const { r, seen } = await drive([EMPTY, GOOD.payload ? GOOD : GOOD]);
  ok('two attempts were made', seen.gemini === 2, seen.gemini);
  ok('the FIRST asked for JSON', seen.cfgs[0] && seen.cfgs[0].responseMimeType === 'application/json',
    JSON.stringify(seen.cfgs[0]));
  ok('the SECOND dropped the JSON constraint (the pre-659 request)',
    seen.cfgs[1] && seen.cfgs[1].responseMimeType === undefined, JSON.stringify(seen.cfgs[1]));
  ok('…and kept 659\'s token budget, so narration is affordable',
    seen.cfgs[1] && seen.cfgs[1].maxOutputTokens === 8192, JSON.stringify(seen.cfgs[1]));
  ok('the retry\'s answer is returned as a success', r.code === 200, JSON.stringify(r.body).slice(0, 140));
  ok('…with the real extracted fields',
    r.body.extracted && r.body.extracted.ord_law_basis === 'BC-Building Codes');
}

console.log('\n── the retry costs nothing when nothing is wrong ──');
{
  const { r, seen } = await drive([GOOD]);
  ok('a clean first answer makes exactly ONE model call', seen.gemini === 1, seen.gemini);
  ok('…and returns 200', r.code === 200 && r.body.extracted.carrier === 'Allstate');
}
{
  /* a truncation is its own answer: without the JSON constraint the model
     narrates, which is what filled the budget in the first place. */
  const MAXT = { payload: { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{
    text: '{\n  "carrier": "Allstate Vehicle and Property Insurance Company",\n  "' }] } }],
    usageMetadata: { promptTokenCount: 48210, candidatesTokenCount: 8192 } } };
  const { r, seen } = await drive([MAXT, GOOD]);
  ok('a truncation is NOT retried (the retry would make it worse)', seen.gemini === 1, seen.gemini);
  ok('…and is still named as running out of room', r.code === 502 && /ran out of room/i.test(r.body.error),
    JSON.stringify(r.body).slice(0, 160));
  ok('…and the half-finished JSON is still not shown', !/policy|carrier/i.test(r.body.error),
    r.body.error);
}

console.log('\n── the four causes stop sharing one sentence ──');
{
  const BLOCKED = { payload: { promptFeedback: { blockReason: 'OTHER' } } };
  const { r } = await drive([BLOCKED]);
  ok('a refused document says it was refused', r.code === 502 && /refused this document/i.test(r.body.error),
    r.body.error);
  ok('…and names the block by its own word', /blocked OTHER/.test(r.body.error), r.body.error);
}
{
  const { r, seen } = await drive([EMPTY]);
  ok('an empty reply says "nothing at all", not "could not turn into fields"',
    r.code === 502 && /nothing at all/i.test(r.body.error), r.body.error);
  ok('…after having tried the other way first', seen.gemini === 2, seen.gemini);
}
{
  const { r } = await drive([PROSE]);
  ok('a prose reply says the reader answered in WORDS',
    r.code === 502 && /in words instead of fields/i.test(r.body.error), r.body.error);
}
{
  /* first attempt silent, retry talks: report the attempt that actually said
     something, because that is the one with a cause in it. */
  const { r } = await drive([EMPTY, PROSE]);
  ok('silent-then-prose is reported as the prose, not as silence',
    /in words instead of fields/i.test(r.body.error), r.body.error);
}
{
  /* valid JSON that is not an object was 659's "unexpected shape" — reported
     AFTER the retry point, so the other way was never tried. */
  const STR = { payload: { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '"unreadable"' }] } }] } };
  const { r, seen } = await drive([STR, GOOD]);
  ok('a non-object JSON reply reaches the retry instead of ending the read', seen.gemini === 2, seen.gemini);
  ok('…and the retry\'s object is returned', r.code === 200 && !!r.body.extracted, JSON.stringify(r.body).slice(0, 120));
}

console.log('\n── the diagnosis a screenshot can carry ──');
{
  const { r } = await drive([EMPTY]);
  const e = r.body.error;
  ok('it names which reader answered', /\bgemini\b/.test(e), e);
  ok('it names why the model stopped', /finish STOP/.test(e), e);
  ok('it reports how much document went IN (the load-bearing number)',
    /in 48210 tok/.test(e), e);
  ok('it reports how much came OUT', /out 0 tok/.test(e), e);
  ok('it reports the reply length', /reply 0 chars/.test(e), e);
  ok('it is a labelled tail, not the 659 raw dump', /\[[^\]]+\]$/.test(e.trim()), e);
}
{
  /* every sentence this route can produce has to survive solRead()'s slice, or
     the diagnosis falls off the end of the very message that carries it. */
  const cases = [];
  cases.push((await drive([EMPTY])).r.body.error);
  cases.push((await drive([PROSE])).r.body.error);
  cases.push((await drive([{ payload: { promptFeedback: { blockReason: 'SAFETY' } } }])).r.body.error);
  cases.push((await drive([{ httpOk: false, payload: { error: { message: 'x'.repeat(800) } } }])).r.body.error);
  ok('every error sentence fits the client\'s 250-char slice',
    cases.every(s => s.length <= CLIENT_SLICE), JSON.stringify(cases.map(s => s.length)));
  ok('…including an 800-char carrier error, whose diagnosis survives the cap',
    /reply 0 chars\]$/.test(cases[3].trim()), cases[3].slice(-60));
}

console.log('\n── the fallback rung can finally open a PDF ──');
{
  process.env.OPENAI_API_KEY = 'oa-test';
  const DOWN = { httpOk: false, payload: { error: { message: 'model overloaded' } } };
  const { r, seen } = await drive([DOWN], { openaiText: '{"carrier":"Allstate"}' });
  ok('a Gemini outage reaches the OpenAI rung', seen.openai >= 1, seen.openai);
  const parts = (((seen.oaBody || {}).messages || [])[0] || {}).content || [];
  const kinds = parts.map(p => p.type);
  ok('a PDF is sent as a FILE part, not an image_url', kinds.includes('file') && !kinds.includes('image_url'),
    JSON.stringify(kinds));
  ok('…carrying the base64 as file_data',
    parts.some(p => p.type === 'file' && p.file && /^data:application\/pdf;base64,/.test(p.file.file_data)),
    JSON.stringify(parts.filter(p => p.type === 'file').map(p => (p.file || {}).file_data || '').map(s => s.slice(0, 40))));
  ok('the rung\'s answer is used', r.code === 200 && r.body.extracted.carrier === 'Allstate',
    JSON.stringify(r.body).slice(0, 120));

  const img = await drive([DOWN], { openaiText: '{"carrier":"X"}', mime: 'image/jpeg' });
  const iparts = (((img.seen.oaBody || {}).messages || [])[0] || {}).content || [];
  ok('an IMAGE still goes as image_url (the working half is not broken)',
    iparts.some(p => p.type === 'image_url') && !iparts.some(p => p.type === 'file'),
    JSON.stringify(iparts.map(p => p.type)));

  /* when the rung answers, the diagnosis must not still say "gemini" */
  const { r: r2 } = await drive([DOWN], { openaiText: 'sorry, I cannot read this' });
  ok('a failure from the OpenAI rung is attributed to OpenAI, not Gemini',
    /\bopenai\b/.test(r2.body.error) && !/\bgemini\b/.test(r2.body.error), r2.body.error);
  delete process.env.OPENAI_API_KEY;
}

if (keyWas === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = keyWas;
if (oaWas !== undefined) process.env.OPENAI_API_KEY = oaWas;

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 661', /v2026-08-09 build 661/.test(SRC));
  ok('the changelog records it', /\{ b:661,/.test(SRC));
  ok('659\'s one-sentence-for-everything is gone from the route',
    !/could not turn this document into fields/i.test(API));
  ok('660\'s BC prompt survives untouched', /BC-Building Codes/.test(API));
  ok('solRead still prefers the sentence over the raw detail (659 stands)',
    SRC.includes("var _msg = (j && j.error) || (j && j.detail) || ('HTTP ' + r.status);"));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
