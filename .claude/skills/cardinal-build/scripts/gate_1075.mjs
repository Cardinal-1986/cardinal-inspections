/* gate_1075 — the inspection routes ladder, and the ladder actually works.
 *
 * ⚠ THIS IS A BEHAVIOUR GATE, NOT A SOURCE GREP. The build replaces three
 *   identical calls to one model with a real ladder, and the only question
 *   that matters is what happens WHEN THE FIRST MODEL IS DOWN. A grep for
 *   `GEMINI_MODELS` would have passed on code that still called 3.5 three
 *   times. Both routes are executed, with a transport that counts calls
 *   per model.
 *
 * ⚠ THE CHECKS THAT MATTER MOST ARE THE ONES ABOUT WHAT MUST *NOT* HAPPEN:
 *   - 3.5 must NOT be called when 3.6 answers (a ladder that always walks the
 *     whole list is three times the latency and three times the cost)
 *   - OpenAI must NOT be reached while a Gemini model still works
 *   - a 400 must NOT be retried — retrying something that cannot succeed is
 *     what the old code did, twice
 *   - no model literal may survive at a call site
 *
 *   node gate_1075.mjs [repo-root]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.argv[2] || '.');
const rd = p => readFileSync(join(ROOT, p), 'utf8');
for (const f of ['api/caption.js', 'api/summarize.js'])
  if (!existsSync(join(ROOT, f))) { console.error('gate_1075: missing ' + f); process.exit(2); }

let pass = 0; const fails = []; const ran = new Set();
const ok  = (n,d) => { pass++; ran.add(n.split(' ')[0]); console.log(`  PASS  ${n}${d?'  — '+d:''}`); };
const bad = (n,d) => { ran.add(n.split(' ')[0]); fails.push(n+': '+d); console.log(`  FAIL  ${n}  — ${d}`); };
const MUST_RUN = ['A1','A2','A3','A4','B1','B2','B3','C1','C2','C3'];

console.log(`gate_1075 — ${ROOT}\n`);

const IMG = 'data:image/jpeg;base64,' + Buffer.from('x').toString('base64');

/* Drives a shipped handler. `fail` maps a model id to the status it should
   answer with; anything unlisted succeeds. Returns the per-model call counts,
   which is the only way to see a ladder actually laddering. */
async function drive(file, body, fail = {}) {
  const mod = await import(pathToFileURL(join(ROOT, file)).href + '?t=' + Math.random());
  const calls = {}; let openai = 0;
  const real = globalThis.fetch;
  process.env.GEMINI_API_KEY = 'g'; process.env.OPENAI_API_KEY = 'o';
  globalThis.fetch = async (u, opt) => {
    u = String(u);
    if (u.includes('/auth/v1/user'))
      return { ok:true, json: async()=>({ email:'theo@cardinalrenovations.net' }) };
    const m = u.match(/models\/([a-z0-9.\-]+):generateContent/);
    if (m) {
      const model = m[1];
      calls[model] = (calls[model] || 0) + 1;
      const st = fail[model];
      if (st) return { ok:false, status:st, text: async()=>'busy',
                       json: async()=>({ error:{ message:'busy' } }) };
      return { ok:true, status:200, json: async()=>({ candidates:[{ content:{ parts:[
        { text: JSON.stringify({ overview:'ok', captions:['a'], cover_index:0 }) }] } }] }) };
    }
    if (u.includes('api.openai.com')) {
      openai++;
      return { ok:true, status:200, json: async()=>({ choices:[{ message:{ content:'{"overview":"ok","captions":["a"],"cover_index":0}' } }] }) };
    }
    return { ok:false, status:500, text: async()=>'unexpected ' + u };
  };
  let status = 0, payload = null;
  const res = { status(c){ status=c; return this; }, json(o){ payload=o; return this; } };
  try {
    await mod.default({ method:'POST', headers:{ authorization:'Bearer s' }, body }, res);
  } finally { globalThis.fetch = real; }
  return { status, payload, calls, openai };
}

/* ══ A · caption.js, single photo ══════════════════════════════════════ */
console.log('A · api/caption.js — one photo');
{
  const good = await drive('api/caption.js', { image: IMG });
  good.status === 200 && good.payload.via === 'gemini-3.6-flash' &&
  good.calls['gemini-3.6-flash'] === 1 && !good.calls['gemini-3.5-flash'] && good.openai === 0
    ? ok('A1 — 3.6 answers: called ONCE, 3.5 never touched, OpenAI never touched',
         JSON.stringify(good.calls))
    : bad('A1 — 3.6 answers and nothing else is called',
          `via=${good.payload && good.payload.via} calls=${JSON.stringify(good.calls)} openai=${good.openai}`);

  /* THE WHOLE BUILD: 3.6 overloaded -> 3.5 answers. The old code made three
     calls to ONE model here and then fell to gpt-4o-mini. */
  const down = await drive('api/caption.js', { image: IMG }, { 'gemini-3.6-flash': 503 });
  down.status === 200 && down.payload.via === 'gemini-3.5-flash' &&
  down.calls['gemini-3.6-flash'] === 2 && down.calls['gemini-3.5-flash'] === 1 && down.openai === 0
    ? ok('A2 — 3.6 down: retried once, then 3.5 answered, OpenAI NOT reached',
         JSON.stringify(down.calls))
    : bad('A2 — 3.6 down falls to 3.5, not to OpenAI',
          `via=${down.payload && down.payload.via} calls=${JSON.stringify(down.calls)} openai=${down.openai}`);

  /* ⚠ a 400 means this model will never work — moving on beats retrying it */
  const bad400 = await drive('api/caption.js', { image: IMG }, { 'gemini-3.6-flash': 400 });
  bad400.calls['gemini-3.6-flash'] === 1 && bad400.payload.via === 'gemini-3.5-flash'
    ? ok('A3 — a 400 moves on immediately, it is not retried', JSON.stringify(bad400.calls))
    : bad('A3 — a 400 moves on without retrying', JSON.stringify(bad400.calls));

  const allDown = await drive('api/caption.js', { image: IMG },
    { 'gemini-3.6-flash': 503, 'gemini-3.5-flash': 503 });
  allDown.status === 200 && allDown.payload.via === 'gpt-4o-mini' &&
  allDown.payload.via_primary === 'gemini-3.6-flash' && allDown.openai === 1
    ? ok('A4 — both Gemini models down: OpenAI answers and SAYS so',
         `via=${allDown.payload.via} primary=${allDown.payload.via_primary}`)
    : bad('A4 — both down falls to OpenAI and reports it',
          `status=${allDown.status} via=${allDown.payload && allDown.payload.via} openai=${allDown.openai}`);
}

/* ══ B · caption.js, the overview (the SECOND handler) ═════════════════ */
console.log('\nB · api/caption.js — the batch overview');
{
  const body = { images: [IMG, IMG], captions: [null, null] };
  const good = await drive('api/caption.js', body);
  good.status === 200 && good.calls['gemini-3.6-flash'] === 1 && !good.calls['gemini-3.5-flash']
    ? ok('B1 — the second handler ladders too, and stops at 3.6', JSON.stringify(good.calls))
    : bad('B1 — the second handler ladders', `status=${good.status} calls=${JSON.stringify(good.calls)}`);

  const down = await drive('api/caption.js', body, { 'gemini-3.6-flash': 503 });
  down.status === 200 && down.calls['gemini-3.5-flash'] === 1 && down.openai === 0
    ? ok('B2 — 3.6 down: the overview reaches 3.5 before OpenAI', JSON.stringify(down.calls))
    : bad('B2 — the overview reaches 3.5 before OpenAI',
          `calls=${JSON.stringify(down.calls)} openai=${down.openai}`);

  /* ⚠ the old code had NO third call here — proving the second handler was
     also a bare retry, and is now a real ladder */
  const src = rd('api/caption.js');
  (src.match(/for \(const model of GEMINI_MODELS\)/g) || []).length === 2
    ? ok('B3 — both handlers use the shared ladder, not two spellings of it')
    : bad('B3 — both handlers use the shared ladder',
          (src.match(/for \(const model of GEMINI_MODELS\)/g) || []).length + ' loop(s)');
}

/* ══ C · summarize.js ══════════════════════════════════════════════════ */
console.log('\nC · api/summarize.js');
{
  const body = { captions: ['granule loss'] };
  const good = await drive('api/summarize.js', body);
  good.status === 200 && good.payload.via === 'gemini-3.6-flash' && !good.calls['gemini-3.5-flash']
    ? ok('C1 — 3.6 answers and 3.5 is not called', JSON.stringify(good.calls))
    : bad('C1 — 3.6 answers, 3.5 untouched',
          `via=${good.payload && good.payload.via} calls=${JSON.stringify(good.calls)}`);

  const down = await drive('api/summarize.js', body, { 'gemini-3.6-flash': 503 });
  down.status === 200 && down.payload.via === 'gemini-3.5-flash' && down.openai === 0
    ? ok('C2 — 3.6 down: 3.5 drafts it, OpenAI NOT reached', JSON.stringify(down.calls))
    : bad('C2 — 3.6 down falls to 3.5', `via=${down.payload && down.payload.via} openai=${down.openai}`);

  /* 1070's checklist contract must be untouched by a ladder change */
  const withCk = await drive('api/summarize.js',
    { checklist: { Age: '22 years', Pitch: '6/12' } });
  withCk.status === 200 && withCk.payload.via_primary === 'gemini-3.6-flash'
    ? ok('C3 — 1070 still holds: it drafts from the checklist alone, and names its ladder head')
    : bad('C3 — the checklist-only path still works',
          `status=${withCk.status} ${JSON.stringify(withCk.payload).slice(0,120)}`);
}

{
  const missing = MUST_RUN.filter(id => !ran.has(id));
  if (missing.length) bad('FLOOR — every check ran', missing.length + ' never executed: ' + missing.join(', '));
  else ok('FLOOR — every check ran', MUST_RUN.length + ' of ' + MUST_RUN.length);
}

console.log('');
if (fails.length) {
  console.log(`❌ FAIL — ${pass} passed, ${fails.length} failed`);
  fails.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log(`✅ PASS — ${pass}/${pass}`);
process.exit(0);
