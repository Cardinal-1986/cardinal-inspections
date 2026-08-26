/* gate_1073 — the accuracy bake-off: admin-gated, blind, and honest about
 * what it does not prove.
 *
 * ⚠ THE CHECKS THAT MATTER MOST ARE THE ONES ABOUT WHAT MUST *NOT* HAPPEN:
 *   - the route must refuse a signed-out caller, a non-admin, and a foreign URL
 *   - the page must carry NO secret beyond the publishable anon key
 *   - the shuffle must be PER PHOTOGRAPH (one shuffle per run makes position a
 *     tell after two photographs — the blinding would be theatre)
 *   - the model name must NOT be rendered before Reveal
 *   - an unavailable model must be SHOWN with its reason, never hidden, or
 *     "we never tested Claude" quietly becomes "Claude did badly"
 *
 * The route is EXECUTED against a stubbed transport — auth, SSRF and the
 * fan-out are behaviour, and a source grep cannot answer any of them.
 *
 *   node gate_1073.mjs [repo-root]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.argv[2] || '.');
const rd = p => readFileSync(join(ROOT, p), 'utf8');
for (const f of ['api/bakeoff.js', 'bakeoff.html', 'vercel.json', '.vercelignore'])
  if (!existsSync(join(ROOT, f))) { console.error('gate_1073: missing ' + f); process.exit(2); }
const HTML = rd('bakeoff.html');

let pass = 0; const fails = []; const ran = new Set();
const ok  = (n,d) => { pass++; ran.add(n.split(' ')[0]); console.log(`  PASS  ${n}${d?'  — '+d:''}`); };
const bad = (n,d) => { ran.add(n.split(' ')[0]); fails.push(n+': '+d); console.log(`  FAIL  ${n}  — ${d}`); };
const MUST_RUN = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','C1','C2'];

console.log(`gate_1073 — ${ROOT}\n`);

/* Executes the shipped handler. `who` decides what the auth stubs answer. */
async function call(body, { who = 'admin', geminiOk = true } = {}) {
  const mod = await import(pathToFileURL(join(ROOT, 'api/bakeoff.js')).href + '?t=' + Math.random());
  let status = 0, payload = null;
  const real = globalThis.fetch;
  process.env.GEMINI_API_KEY = 'stub-g';
  process.env.OPENAI_API_KEY = 'stub-o';
  delete process.env.ANTHROPIC_API_KEY;          /* deliberately absent — A5 */
  globalThis.fetch = async (u) => {
    u = String(u);
    if (u.includes('/auth/v1/user'))
      return who === 'anon'
        ? { ok: false, status: 401, json: async () => ({}) }
        : { ok: true, json: async () => ({ email: 'theo@cardinalrenovations.net' }) };
    if (u.includes('is_cardinal_admin'))
      return { ok: true, json: async () => who === 'admin' };
    if (u.includes('/storage/v1/'))
      return { ok: true, arrayBuffer: async () => new Uint8Array([1,2,3,4]).buffer };
    if (u.includes('generativelanguage'))
      return geminiOk
        ? { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'G says: cracked boot.' }] } }] }) }
        : { ok: false, status: 503, text: async () => 'busy', json: async () => ({ error:{ message:'busy' } }) };
    if (u.includes('api.openai.com'))
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'O says: lifted ridge.' } }] }) };
    return { ok: false, status: 500, text: async () => 'unexpected ' + u };
  };
  const res = { status(c){ status = c; return this; }, json(o){ payload = o; return this; } };
  try {
    await mod.default({ method: 'POST',
      headers: { authorization: who === 'anon' ? '' : 'Bearer s' }, body }, res);
  } finally { globalThis.fetch = real; }
  return { status, payload };
}

const GOOD_URL = 'https://yipslubcptjoarblzbpl.supabase.co/storage/v1/render/image/sign/photos/a.jpg?token=x';

/* ══ A · the route ═════════════════════════════════════════════════════ */
console.log('A · api/bakeoff.js (executed)');
{
  const anon = await call({ mode: 'probe' }, { who: 'anon' });
  anon.status === 401
    ? ok('A1 — refuses a signed-out caller', '401')
    : bad('A1 — refuses a signed-out caller', 'status ' + anon.status);

  const staff = await call({ mode: 'probe' }, { who: 'staff' });
  staff.status === 403
    ? ok('A2 — refuses a signed-in NON-admin', '403 ' + (staff.payload && staff.payload.error))
    : bad('A2 — refuses a signed-in non-admin', 'status ' + staff.status + ' — it let a rep spend the keys');

  /* ⚠ THE SSRF BOUND. The caller hands us a URL. */
  for (const [label, u] of [['a foreign origin', 'https://evil.example/storage/v1/x.jpg'],
                            ['plain http', 'http://yipslubcptjoarblzbpl.supabase.co/storage/v1/a.jpg'],
                            ['the API, not storage', 'https://yipslubcptjoarblzbpl.supabase.co/rest/v1/projects']]) {
    const r = await call({ mode: 'run', url: u });
    if (r.status !== 400) { bad('A3 — refuses ' + label, 'status ' + r.status); break; }
  }
  if (!fails.some(f => f.startsWith('A3'))) ok('A3 — refuses a foreign origin, plain http, and a non-storage path');

  /* ⚠ I expected 3 here — claude has no key in this rig — and the route
     returned 4. THE ROUTE IS RIGHT AND THE EXPECTATION WAS WRONG: a model it
     was asked for and could not reach comes back as a NAMED FAILURE, not a
     silent omission. Dropping it would make "we could not call Claude"
     indistinguishable from "Claude was not in this run", which is the exact
     ambiguity A5 exists to prevent. Asserting the real contract. */
  const run = await call({ mode: 'run', url: GOOD_URL });
  const a = (run.payload && run.payload.answers) || [];
  const named = a.map(x => x.model);
  const dud = a.find(x => x.model === 'claude-opus-5');
  run.status === 200 && a.length === 4 && new Set(named).size === 4 &&
  dud && dud.ok === false && /ANTHROPIC_API_KEY/.test(dud.text)
    ? ok('A4 — answers for every model asked; an unreachable one is a NAMED failure',
         named.join(', '))
    : bad('A4 — answers for every model asked, unreachable ones named',
          `status ${run.status}, ${a.length} answer(s): ` + JSON.stringify(a.map(x => [x.model, x.ok])));

  /* ⚠ a model whose key is missing must be reported unavailable WITH a reason */
  const probe = await call({ mode: 'probe' });
  const cl = ((probe.payload && probe.payload.candidates) || []).find(c => c.vendor === 'anthropic');
  cl && cl.available === false && /ANTHROPIC_API_KEY/.test(cl.why || '')
    ? ok('A5 — a model with no key is reported unavailable, with the reason', cl.why)
    : bad('A5 — a model with no key is reported unavailable with the reason', JSON.stringify(cl));

  /* one model failing must not sink the others — that is the whole comparison */
  const half = await call({ mode: 'run', url: GOOD_URL }, { geminiOk: false });
  const hs = (half.payload && half.payload.answers) || [];
  half.status === 200 && hs.some(x => x.ok) && hs.some(x => !x.ok)
    ? ok('A6 — one model failing does not sink the run',
         hs.map(x => x.model + (x.ok ? '✓' : '✗')).join(' '))
    : bad('A6 — one model failing does not sink the run', JSON.stringify(hs.map(x => [x.model, x.ok])));
}

/* ══ B · the page ══════════════════════════════════════════════════════ */
console.log('\nB · bakeoff.html');
{
  /* ⚠ NO SECRET. It ships publicly. */
  const leaks = HTML.match(/service_role|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|sk-[A-Za-z0-9]{16,}/g);
  const keys = HTML.match(/sb_publishable_[A-Za-z0-9_]+/g) || [];
  !leaks && keys.length >= 1
    ? ok('B1 — carries the publishable anon key and no other secret')
    : bad('B1 — carries no secret beyond the publishable key', 'LEAKED: ' + (leaks || []).join(', '));

  /* ⚠ THE SHUFFLE MUST BE PER PHOTOGRAPH. Extract shuffled() and prove it
     actually permutes, then prove step() calls it inside the per-shot path. */
  const sm = HTML.match(/function shuffled\(a\)\{[\s\S]*?\n\}/);
  if (!sm) bad('B2 — the shuffle is real and per-photograph', 'could not extract shuffled()');
  else {
    const shuffled = new Function('return ' + sm[0])();
    const src = [0,1,2,3,4,5,6,7,8,9];
    let moved = 0;
    for (let i = 0; i < 60; i++) if (shuffled(src).join() !== src.join()) moved++;
    const inStep = /current = \{ answers: shuffled\(j\.answers \|\| \[\]\) \}/.test(HTML);
    moved > 50 && inStep
      ? ok('B2 — shuffled() really permutes, and is called per photograph', `${moved}/60 permuted`)
      : bad('B2 — shuffle per photograph', `permuted ${moved}/60, called in step: ${inStep}`);
  }

  /* ⚠ THE NAME MUST NOT RENDER BEFORE REVEAL. The .who span is emitted empty
     and hidden; anything that writes a model into the answer card is a leak. */
  const rm = HTML.match(/function render\(\)\{[\s\S]*?\n\}/);
  rm && !/a\.model/.test(rm[0]) && /class="who hide"><\/span>/.test(rm[0])
    ? ok('B3 — the answer card never renders the model name')
    : bad('B3 — the answer card never renders the model name',
          'render() mentions a.model or the who span is not empty/hidden');

  /* ⚠ an unavailable model is SHOWN, disabled, with its reason */
  /c\.available \? '' : ' off'/.test(HTML) && /esc\(c\.why \|\| 'unavailable'\)/.test(HTML)
    ? ok('B4 — an unavailable model is shown disabled with its reason, not hidden')
    : bad('B4 — an unavailable model is shown with its reason', 'it is filtered out or unexplained');
}

/* ══ C · deploy ════════════════════════════════════════════════════════ */
console.log('\nC · deploy');
{
  const v = JSON.parse(rd('vercel.json'));
  v.functions && v.functions['api/bakeoff.js'] && v.functions['api/bakeoff.js'].maxDuration === 60
    ? ok('C1 — /api/bakeoff has maxDuration 60 (four vision calls)')
    : bad('C1 — /api/bakeoff has maxDuration 60', 'missing — it will time out at the default');

  /* the standing discipline: a new root file gets a WRITTEN decision */
  /bakeoff\.html DELIBERATELY SHIPS/.test(rd('.vercelignore'))
    ? ok('C2 — .vercelignore records why bakeoff.html ships')
    : bad('C2 — .vercelignore records the ship decision', 'no paragraph for bakeoff.html');
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
