/* gate_1072 — every AI answer says which model wrote it, and the screen says so
 * ONLY when it was not the model the route asked for.
 *
 * ⚠ THREE ROUTES ARE EXECUTED, NOT READ. summarize, caption and analyze are run
 *   as shipped against a stubbed transport, on BOTH paths — Gemini answering and
 *   Gemini refusing — because "does it report the fallback" is a question about
 *   behaviour and a source grep cannot answer it. detect and supplement are
 *   asserted on source and LABELLED as such; their handlers need a whole claim
 *   and scope document to reach, and a weaker check named honestly beats a
 *   stronger one I pretend to have.
 *
 * ⚠ THE CHECKS THAT MATTER MOST ARE THE ONES ABOUT WHAT MUST *NOT* HAPPEN:
 *   - the note must be SILENT on the intended path (build 808: a correct banner
 *     nobody needs trains people to ignore the ones they do)
 *   - NO LADDER MAY CHANGE. Which model should lead is the bake-off's call.
 *     This build reports; it does not decide.
 *
 *   node gate_1072.mjs [repo-root]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.argv[2] || '.');
const rd = p => readFileSync(join(ROOT, p), 'utf8');
for (const f of ['api/summarize.js', 'supplement.html', 'index.html'])
  if (!existsSync(join(ROOT, f))) { console.error('gate_1072: missing ' + f); process.exit(2); }

let pass = 0; const fails = []; const ran = new Set();
const ok  = (n,d) => { pass++; ran.add(n.split(' ')[0]); console.log(`  PASS  ${n}${d?'  — '+d:''}`); };
const bad = (n,d) => { ran.add(n.split(' ')[0]); fails.push(n+': '+d); console.log(`  FAIL  ${n}  — ${d}`); };
const MUST_RUN = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','C1','C2','C3','C4'];

console.log(`gate_1072 — ${ROOT}\n`);

/* Run a shipped handler with Gemini either answering or refusing. */
async function callRoute(file, body, { geminiOk = true } = {}) {
  const mod = await import(pathToFileURL(join(ROOT, file)).href + '?t=' + (geminiOk ? 1 : 2));
  let status = 0, payload = null;
  const realFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'stub';
  process.env.OPENAI_API_KEY = 'stub-openai';
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/auth/v1/user'))
      return { ok: true, json: async () => ({ email: 'theo@cardinalrenovations.net' }) };
    if (u.includes('generativelanguage'))
      return geminiOk
        ? { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'answered.' }] } }] }) }
        : { ok: false, status: 503, text: async () => 'high demand',
            /* ⚠ a REAL Gemini 503 carries a JSON body, and analyze.js reads
               j.error.message from it. A stub without .json() makes the route
               throw and answer 500 — which reads exactly like an app bug. It
               is not; it is the rig. (CLAUDE.md: about half of all reds on this
               project were the test's fault.) */
            json: async () => ({ error: { message: 'high demand' } }) };
    if (u.includes('api.openai.com'))
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'answered.' } }] }) };
    return { ok: false, status: 500, text: async () => 'unexpected ' + u };
  };
  const res = { status(c){ status = c; return this; }, json(o){ payload = o; return this; } };
  try {
    await mod.default({ method: 'POST', headers: { authorization: 'Bearer s' }, body }, res);
  } finally { globalThis.fetch = realFetch; }
  return { status, payload };
}

/* ══ A · the routes, executed on BOTH paths ═══════════════════════════════ */
console.log('A · the routes (executed as shipped)');
const IMG = 'data:image/jpeg;base64,' + Buffer.from('x').toString('base64');
const CASES = [
  ['A1', 'api/summarize.js', { captions: ['granule loss'] },        'gemini-3.5-flash'],
  ['A2', 'api/caption.js',   { image: IMG },                        'gemini-3.5-flash'],
  ['A3', 'api/analyze.js',   { image: IMG, prompt: 'what is this' }, 'gemini-3.5-flash'],
];
for (const [id, file, body, primary] of CASES) {
  const name = file.replace('api/', '');
  try {
    const good = await callRoute(file, body, { geminiOk: true });
    const back = await callRoute(file, body, { geminiOk: false });
    const g = good.payload || {}, b = back.payload || {};
    if (good.status !== 200) { bad(`${id} — ${name} reports its model`, `gemini path status ${good.status}: ${JSON.stringify(g).slice(0,120)}`); continue; }
    if (g.via !== primary || g.via_primary !== primary) {
      bad(`${id} — ${name} reports its model`, `gemini path gave via=${g.via} primary=${g.via_primary}`); continue;
    }
    if (back.status !== 200) { bad(`${id} — ${name} reports its model`, `fallback path status ${back.status}`); continue; }
    if (b.via !== 'gpt-4o-mini' || b.via_primary !== primary) {
      bad(`${id} — ${name} reports its model`, `fallback gave via=${b.via} primary=${b.via_primary}`); continue;
    }
    ok(`${id} — ${name} names the model on BOTH paths`,
       `gemini→${g.via} · 503→${b.via} (asked ${b.via_primary})`);
  } catch (e) { bad(`${id} — ${name} reports its model`, String(e.message || e).slice(0, 140)); }
}

/* detect + supplement: SOURCE-asserted, and said so. */
{
  const d = rd('api/detect.js');
  d.includes('via_primary: GEMINI_MODELS[0]') && /via = model;/.test(d)
    ? ok('A4 — detect.js carries the pair (source-asserted, not executed)')
    : bad('A4 — detect.js carries the pair', 'field or assignment missing');
  const p = rd('api/supplement.js');
  p.includes("via = r._via === 'openai' ? 'gpt-4o-mini' : model;")
    ? ok('A5 — supplement.js reports WHICH gemini, not just the vendor (source-asserted)')
    : bad('A5 — supplement.js reports which gemini', "still collapsing to 'gemini'");
  (p.match(/via_primary: GEMINI_MODELS\[0\]/g) || []).length === 2
    ? ok('A6 — supplement.js sends the pair on both diag paths')
    : bad('A6 — supplement.js sends the pair on both diag paths',
          (p.match(/via_primary/g) || []).length + ' via_primary occurrence(s)');
}

/* ══ B · the screens ══════════════════════════════════════════════════════ */
console.log('\nB · the screens (silent on the intended path)');
{
  const H = rd('supplement.html');
  const m = H.match(/function viaNote\(diag\)\{[\s\S]*?\n\}/);
  if (!m) bad('B1 — viaNote exists and is executable', 'could not extract it');
  else {
    const viaNote = new Function('return ' + m[0])();
    const quiet = viaNote({ via: 'gemini-3.6-flash', via_primary: 'gemini-3.6-flash' });
    const loud  = viaNote({ via: 'gpt-4o-mini',      via_primary: 'gemini-3.6-flash' });
    quiet === ''
      ? ok('B1 — SILENT when the intended model answered')
      : bad('B1 — SILENT when the intended model answered', `it said ${JSON.stringify(quiet)}`);
    loud.includes('gpt-4o-mini') && loud.includes('gemini-3.6-flash')
      ? ok('B2 — names both models when it fell back', loud.trim())
      : bad('B2 — names both models when it fell back', JSON.stringify(loud));
    viaNote({}) === '' && viaNote(null) === '' && viaNote({ via: 'x' }) === ''
      ? ok('B3 — an older route that sends neither field says nothing (no "undefined")')
      : bad('B3 — an older route says nothing', 'it emitted text for a partial diag');
  }
}

/* ══ C · what must NOT have changed ═══════════════════════════════════════ */
console.log('\nC · no ladder moved — this build reports, it does not decide');
{
  const want = "GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash']";
  const led = ['api/detect.js', 'api/sortphotos.js', 'api/supplement.js']
    .filter(f => rd(f).includes(want));
  led.length === 3
    ? ok('C1 — the three 3.6-led routes still lead with 3.6', led.map(f=>f.replace('api/','')).join(', '))
    : bad('C1 — the three 3.6-led routes still lead with 3.6', 'led: ' + led.join(', '));

  rd('api/analyze.js').includes("const MODEL = 'gemini-3.5-flash'")
    ? ok('C2 — analyze.js is still pinned to 3.5')
    : bad('C2 — analyze.js is still pinned to 3.5', 'MODEL changed');

  rd('api/summarize.js').includes('models/gemini-3.5-flash')
    ? ok('C3 — summarize.js still calls 3.5')
    : bad('C3 — summarize.js still calls 3.5', 'the URL changed');

  /* the report drafter's flash, and it must be conditional */
  const I = rd('index.html');
  I.includes("savedFlash.textContent = 'drafted by '") &&
  I.includes('data.via !== data.via_primary')
    ? ok('C4 — the report drafter names the model, and only on a fallback')
    : bad('C4 — the report drafter names the model conditionally', 'missing or unconditional');
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
