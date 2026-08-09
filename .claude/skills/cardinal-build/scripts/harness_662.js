/* Build 662 — the retry cannot eat the diagnosis it exists to deliver.

   661 added a second model call on the failure path. `vercel.json` carried NO
   `functions` block, so every /api route ran on the platform default duration
   (10s Hobby / 15s Pro). Two sequential multimodal reads do not fit that, and a
   function killed mid-retry answers a platform 504 — the client then shows
   "HTTP 504" instead of the sentence 661 exists to produce. The retry would
   have eaten its own purpose.

   The clock is FAKED here rather than slept through: Date.now is stubbed and
   each model call advances it by a set number of seconds, so "the first attempt
   took 30 seconds" is an instant test. That is the only way to assert the guard
   without a 60-second harness.

   Usage: node harness_662.js [index.html] [api/sol.js] [vercel.json]
   Point all three at the previous build as the negative control — it must go red. */
const fs = require('fs');
const path = require('path');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APIF = process.argv[3] || '/home/user/cardinal-inspections/api/sol.js';
const VJSF = process.argv[4] || '/home/user/cardinal-inspections/vercel.json';
const SRC = fs.readFileSync(FILE, 'utf8');
const API = fs.readFileSync(APIF, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const CLIENT_SLICE = 250;   /* solRead() slices there before it throws */

/* ⚠ A previous build's harness CRASHED on its own negative control because it
   dereferenced `.body.error` on a run that returned 200 with no error at all —
   and a crash is not a red, it is an absence of information. Every read of the
   response body goes through these. */
const errOf = (r) => String((r && r.body && r.body.error) || '');
const exOf  = (r) => (r && r.body && r.body.extracted) || {};

(async function () {

console.log('\n── the platform is actually given time (vercel.json) ──');
{
  let vj = null;
  try { vj = JSON.parse(fs.readFileSync(VJSF, 'utf8')); } catch (e) {}
  ok('vercel.json is valid JSON', !!vj);
  const fn = (vj && vj.functions) || {};
  ok('a functions block exists at all', Object.keys(fn).length > 0, Object.keys(fn).length);
  ok('api/sol.js — the route under investigation — has a duration',
    !!(fn['api/sol.js'] && fn['api/sol.js'].maxDuration), JSON.stringify(fn['api/sol.js']));
  ok('…and it is 60, the highest value valid on EVERY Vercel plan (Hobby caps there)',
    fn['api/sol.js'] && fn['api/sol.js'].maxDuration === 60, (fn['api/sol.js'] || {}).maxDuration);
  /* a functions pattern that matches no file fails the BUILD, not the request —
     so every key here has to be a real path or the whole deploy dies. */
  const root = path.dirname(path.resolve(VJSF));
  const missing = Object.keys(fn).filter(k => !fs.existsSync(path.join(root, k)));
  ok('every functions key points at a file that exists (a stale one fails the DEPLOY)',
    missing.length === 0, missing.join(', '));
  ok('the crons and the presentation rewrites were not disturbed',
    !!(vj && vj.crons && vj.crons.length === 2 && vj.rewrites && vj.rewrites.length === 2),
    JSON.stringify({ crons: (vj && vj.crons || []).length, rewrites: (vj && vj.rewrites || []).length }));
  ok('the other model+document routes got it too (identical exposure)',
    ['api/analyze.js', 'api/detect.js', 'api/librarian.js', 'api/organize.js']
      .every(k => fn[k] && fn[k].maxDuration === 60), Object.keys(fn).join(' '));
}

let handler = null;
try {
  const mod = await import('file://' + APIF + '?v=' + Date.now());   /* before the clock is faked */
  handler = mod.default;
} catch (e) { console.log('  (import failed: ' + e.message + ')'); }
ok('api/sol.js exports a handler', typeof handler === 'function');

/* ── the fake clock ──────────────────────────────────────────────────────── */
const REAL_NOW = Date.now;
let FAKE = 1700000000000;
Date.now = () => FAKE;

function res() {
  const r = { code: null, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

/* `callMs` is how many milliseconds EACH model call consumes on the fake clock. */
function drive(replies, callMs, opts) {
  opts = opts || {};
  const seen = { gemini: 0, openai: 0, logs: [] };
  const realFetch = global.fetch;
  const realErr = console.error;
  console.error = (...a) => { seen.logs.push(a.join(' ')); };
  global.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'theo@cardinalrenovations.net' }) };
    }
    if (u.includes('generativelanguage')) {
      FAKE += callMs;                       /* the call takes time */
      const i = Math.min(seen.gemini, replies.length - 1);
      seen.gemini++;
      const rep = replies[i] || {};
      return { ok: rep.httpOk !== false, status: rep.httpOk === false ? 503 : 200,
               json: async () => rep.payload };
    }
    if (u.includes('openai.com')) { seen.openai++; return { ok: false, status: 400, json: async () => ({}) }; }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const req = { method: 'POST', headers: { authorization: 'Bearer tok' },
    body: { file: 'QUJDREVGRw', mime: opts.mime || 'application/pdf' } };
  const r = res();
  const done = () => { global.fetch = realFetch; console.error = realErr; };
  return handler(req, r).then(() => { done(); return { r, seen }; }, (e) => { done(); throw e; });
}

const GOOD = { payload: { candidates: [{ finishReason: 'STOP', content: { parts: [{
  text: '{"carrier":"Allstate","ord_law_basis":"BC-Building Codes"}' }] } }],
  usageMetadata: { promptTokenCount: 48210, candidatesTokenCount: 96 } } };
const EMPTY = { payload: { candidates: [{ finishReason: 'STOP', content: { role: 'model' } }],
  usageMetadata: { promptTokenCount: 48210, candidatesTokenCount: 0 } } };
const PROSE = { payload: { candidates: [{ finishReason: 'STOP', content: { parts: [{
  text: 'I am unable to extract fields from this document.' }] } }],
  usageMetadata: { promptTokenCount: 48210, candidatesTokenCount: 11 } } };

const keyWas = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = 'test-key';
delete process.env.OPENAI_API_KEY;

console.log('\n── a retry that fits still runs ──');
{
  const { r, seen } = await drive([EMPTY, GOOD], 5000);
  ok('a 5s first attempt leaves room, so the retry runs', seen.gemini === 2, seen.gemini);
  ok('…and 661\'s fix still lands (the retry\'s answer is returned)',
    r.code === 200 && exOf(r).ord_law_basis === 'BC-Building Codes',
    JSON.stringify(r.body).slice(0, 120));
}
{
  const { seen } = await drive([EMPTY, GOOD], 22000);
  ok('22s + 22s = 44s still fits the 45s budget — the guard is not over-eager',
    seen.gemini === 2, seen.gemini);
}

console.log('\n── THE BUILD: a retry that cannot finish is never started ──');
{
  const { r, seen } = await drive([EMPTY, GOOD], 30000);
  ok('a 30s first attempt means a second would overrun — it is skipped', seen.gemini === 1, seen.gemini);
  ok('…and the caller STILL gets a 502 with the diagnosis, not a platform 504',
    r.code === 502 && /nothing at all/i.test(errOf(r)), JSON.stringify(r.body).slice(0, 160));
  ok('…and the message says the second try was skipped, and why',
    /no 2nd try \(time\)/.test(errOf(r)), errOf(r));
  ok('…and it still fits the client\'s 250-char slice', errOf(r).length <= CLIENT_SLICE,
    errOf(r).length);
}

console.log('\n── the diagnosis learns to tell the time ──');
{
  const { r } = await drive([PROSE], 7500);
  ok('the elapsed time is reported in seconds', /\b15\.0s\b/.test(errOf(r)), errOf(r));
  ok('661\'s numbers all survive beside it',
    /gemini/.test(errOf(r)) && /finish STOP/.test(errOf(r)) &&
    /in 48210 tok/.test(errOf(r)) && /reply 49 chars/.test(errOf(r)), errOf(r));
  const fast = await drive([PROSE], 300);
  ok('an instant refusal and a slow answer no longer look identical',
    /\b0\.6s\b/.test(errOf(fast.r)) && !/\b15\.0s\b/.test(errOf(fast.r)), errOf(fast.r));
}

console.log('\n── the second channel: a log that does not need a screenshot ──');
{
  const { seen } = await drive([PROSE], 4000);
  ok('an unreadable reply is logged server-side', seen.logs.length >= 1, seen.logs.length);
  const line = seen.logs.join('\n');
  ok('…tagged so it can be found in the function log', /\[sol\] unreadable reply/.test(line), line.slice(0, 80));
  ok('…carrying the model\'s own words', /unable to extract fields/.test(line), line.slice(0, 200));
  ok('…and the timing and usage', /"ms":\s*\d+/.test(line) && /promptTokenCount/.test(line), line.slice(0, 200));
  /* the one thing that must never reach a log */
  ok('…and NEVER the document bytes', !/QUJDREVGRw/.test(line), line.slice(0, 200));
  const clean = await drive([GOOD], 4000);
  ok('a successful read logs nothing', clean.seen.logs.length === 0, clean.seen.logs.length);
}

console.log('\n── 661 and 659 still hold ──');
{
  const MAXT = { payload: { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"carrier":"All' }] } }],
    usageMetadata: { promptTokenCount: 48210, candidatesTokenCount: 8192 } } };
  const { r, seen } = await drive([MAXT, GOOD], 3000);
  ok('a truncation is still not retried', seen.gemini === 1, seen.gemini);
  ok('…and still says it ran out of room', /ran out of room/i.test(errOf(r)), errOf(r));
  const one = await drive([GOOD], 3000);
  ok('a clean answer is still one call', one.seen.gemini === 1, one.seen.gemini);
  const blk = await drive([{ payload: { promptFeedback: { blockReason: 'SAFETY' } } }], 3000);
  ok('a blocked document still says so', /refused this document/i.test(errOf(blk.r)), errOf(blk.r));
  const long = await drive([{ httpOk: false, payload: { error: { message: 'x'.repeat(800) } } }], 3000);
  ok('an 800-char carrier error still keeps its diagnosis inside 250 chars',
    errOf(long.r).length <= CLIENT_SLICE && /\ds\]$/.test(errOf(long.r).trim()),
    errOf(long.r).length + ' | ' + errOf(long.r).slice(-40));
}

Date.now = REAL_NOW;
if (keyWas === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = keyWas;

console.log('\n── what shipped is what the artifact says shipped ──');
{
  /* keyed as "at or past", not "equal to" — an equality here is the
     BUG_CLASSES.md §15 assertion that goes red on the next build for no reason.
     harness_661 shipped with that bug and this build fixed it; do not
     reintroduce it. */
  ok('the app stamp is at 662 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 662; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:662,/.test(SRC));
  ok('the budget is a named constant, not a number buried in a condition',
    /TIME_BUDGET_MS\s*=\s*45000/.test(API));
  ok('the guard measures the FIRST call to predict the second',
    /elapsed\(\)\s*\+\s*a\.ms\s*<\s*TIME_BUDGET_MS/.test(API));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
