/* gate_1074 — 3.7 in the bake-off, and honest slots for Claude and Kimi.
 *
 * gate_1073 already covers the route's auth, SSRF, fan-out and blinding, and
 * its A4 now DERIVES the expected answers from CANDIDATES — so this gate is
 * only what 1074 added. Run both.
 *
 * ⚠ THE CHECK THAT MATTERS MOST IS B1: the vendor→env-var map. The 1073 code
 *   spelled this out as a nested ternary whose final `else` was Anthropic, so
 *   ANY unknown vendor reported the wrong env var. Kimi would have been told
 *   "ANTHROPIC_API_KEY not set" — a diagnostic that lies, which is the same
 *   class as build 504's ai-status reporting 3.5 when it probed 3.6.
 *
 *   node gate_1074.mjs [repo-root]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.argv[2] || '.');
const rd = p => readFileSync(join(ROOT, p), 'utf8');
for (const f of ['api/bakeoff.js', 'api/ai-status.js', 'bakeoff.html'])
  if (!existsSync(join(ROOT, f))) { console.error('gate_1074: missing ' + f); process.exit(2); }

let pass = 0; const fails = []; const ran = new Set();
const ok  = (n,d) => { pass++; ran.add(n.split(' ')[0]); console.log(`  PASS  ${n}${d?'  — '+d:''}`); };
const bad = (n,d) => { ran.add(n.split(' ')[0]); fails.push(n+': '+d); console.log(`  FAIL  ${n}  — ${d}`); };
const MUST_RUN = ['A1','A2','B1','B2','C1','C2','D1'];

console.log(`gate_1074 — ${ROOT}\n`);

async function probe(env = {}) {
  const mod = await import(pathToFileURL(join(ROOT, 'api/bakeoff.js')).href + '?t=' + Math.random());
  const saved = {};
  for (const k of ['GEMINI_API_KEY','OPENAI_API_KEY','ANTHROPIC_API_KEY','MOONSHOT_API_KEY']) {
    saved[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k];
  }
  const real = globalThis.fetch;
  globalThis.fetch = async (u) => {
    u = String(u);
    if (u.includes('/auth/v1/user')) return { ok:true, json: async()=>({ email:'theo@cardinalrenovations.net' }) };
    if (u.includes('is_cardinal_admin')) return { ok:true, json: async()=>true };
    return { ok:false, status:500, text: async()=>'x' };
  };
  let payload = null, status = 0;
  const res = { status(c){ status=c; return this; }, json(o){ payload=o; return this; } };
  try {
    await mod.default({ method:'POST', headers:{ authorization:'Bearer s' }, body:{ mode:'probe' } }, res);
  } finally {
    globalThis.fetch = real;
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  }
  return { status, cands: (payload && payload.candidates) || [] };
}

/* ══ A · the two new candidates ════════════════════════════════════════ */
console.log('A · candidates');
{
  const { cands } = await probe({ GEMINI_API_KEY:'g' });
  const ids = cands.map(c => c.id);
  ids.includes('gemini-3.7-flash') && ids.indexOf('gemini-3.7-flash') < ids.indexOf('gemini-3.6-flash')
    ? ok('A1 — gemini-3.7-flash is a candidate, listed ahead of 3.6', ids.join(', '))
    : bad('A1 — gemini-3.7-flash is a candidate ahead of 3.6', ids.join(', '));

  const k = cands.find(c => c.id === 'kimi-k3');
  k && k.vendor === 'moonshot' && /vision unconfirmed/i.test(k.note || '')
    ? ok('A2 — kimi-k3 is present AND carries its vision caveat', k.note)
    : bad('A2 — kimi-k3 present with a vision caveat', JSON.stringify(k));
}

/* ══ B · the env-var map — the real bug fix ════════════════════════════ */
console.log('\nB · each vendor names its OWN env var');
{
  /* every key absent: each candidate must name the var IT needs */
  const { cands } = await probe({});
  const wrong = cands.filter(c => {
    const want = { google:'GEMINI_API_KEY', openai:'OPENAI_API_KEY',
                   anthropic:'ANTHROPIC_API_KEY', moonshot:'MOONSHOT_API_KEY' }[c.vendor];
    return !c.why || !c.why.startsWith(want);
  });
  wrong.length === 0
    ? ok('B1 — every vendor reports its own missing key', cands.map(c => c.vendor + ':' + c.why.split(' ')[0]).join(' · '))
    : bad('B1 — every vendor reports its own missing key',
          'wrong: ' + wrong.map(c => c.id + ' said ' + c.why).join('; '));

  /* and availability must track the RIGHT key, not any key */
  const { cands: c2 } = await probe({ MOONSHOT_API_KEY:'m' });
  const km = c2.find(c => c.id === 'kimi-k3'), gm = c2.find(c => c.vendor === 'google');
  km && km.available === true && gm && gm.available === false
    ? ok('B2 — a Moonshot key makes ONLY Kimi available')
    : bad('B2 — a Moonshot key makes only Kimi available',
          `kimi=${km && km.available}, google=${gm && gm.available}`);
}

/* ══ C · ai-status answers "can we even test Claude" ═══════════════════ */
console.log('\nC · api/ai-status.js');
{
  const s = rd('api/ai-status.js');
  s.includes('result.keys = {') && /anthropic: \{ configured:/.test(s) && /moonshot:  \{ configured:/.test(s)
    ? ok('C1 — it reports key presence for anthropic and moonshot')
    : bad('C1 — it reports key presence for anthropic and moonshot', 'field missing');

  /* ⚠ presence must NOT masquerade as a live check — build 504's lesson, that
     a diagnostic which overstates what it tested is worse than none */
  /* ⚠ BUG_CLASSES 37, third time this session: on the control tree
     `result.keys = {` does not exist, so [1] is undefined and .split() THREW —
     the gate died here and C2, D1 and the floor never ran. A control that
     crashes reads as "not green" while proving nothing. Tolerate absence. */
  const parts = s.split('result.keys = {');
  const block = parts.length > 1 ? parts[1].split('};')[0] : null;
  block === null
    ? bad('C2 — presence must not masquerade as a live check', 'no result.keys block to inspect')
    : (!/\bok:/.test(block) && /used_by:/.test(block)
        ? ok('C2 — it says `configured`, not `ok`, and names who needs the key')
        : bad('C2 — presence must not masquerade as a live check', 'the block claims ok:'));
}

/* ══ D · the caveat reaches the screen ═════════════════════════════════ */
console.log('\nD · bakeoff.html');
{
  const h = rd('bakeoff.html');
  h.includes("c.note ? '<div class=\"cav\">'") && h.includes('.cav{')
    ? ok('D1 — a candidate\'s caveat is rendered, not just carried')
    : bad('D1 — a candidate caveat is rendered', 'no .cav row or no style for it');
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
