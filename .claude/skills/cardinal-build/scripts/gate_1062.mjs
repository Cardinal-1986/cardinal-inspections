/* gate_1062.mjs — the requeue-stale cron.

   Build 1062 gives requeue_stale_design_jobs() its first caller. The function
   itself is old, correct and untouched; the only new thing is the door.

   This gate EXERCISES THE SHIPPED HANDLER — it imports api/requeue-stale.js and
   calls its default export with a stub req/res. It does not re-implement it.

   The check that earns its place is #4: the RPC NAME. A typo there is a 404
   forever, reported only into a Vercel log nobody reads, and the symptom is
   identical to the bug this build fixes — jobs sitting at running. So the name
   in the route is asserted against the name in the SQL that defines it.

   Usage: node gate_1062.mjs [path/to/repo]
   Control: any tree before 1062 has no route — check 1 names the absence and
   the rest report rather than throwing (BUG_CLASSES 37).
*/
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || '/home/user/cardinal-inspections';
const ROUTE = path.join(ROOT, 'api', 'requeue-stale.js');

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n          ' + detail : ''}`); }
};

console.log(`gate_1062.mjs -> ${ROOT}\n`);

const haveRoute = existsSync(ROUTE);
check('1. api/requeue-stale.js exists', haveRoute, haveRoute ? '' : ROUTE + ' is absent');

const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
const cron = (vercel.crons || []).find(c => c.path === '/api/requeue-stale');
check('2. vercel.json schedules it', !!cron,
      'crons: ' + (vercel.crons || []).map(c => c.path).join(', '));
check('3. and hourly, not daily — a daily sweep on a 30-minute window is theatre',
      !!cron && /^\S+ \* \* \* \*$/.test(cron.schedule || ''),
      cron ? 'schedule is ' + cron.schedule : 'no cron');

if (!haveRoute) {
  for (let i = 4; i <= 9; i++) check(`${i}. (not reachable without the route)`, false, 'no route to exercise');
  console.log(`\nRED — ${pass} passed, ${fail} failed`);
  process.exit(1);
}

const src = await readFile(ROUTE, 'utf8');

/* ---- 4. THE RPC NAME, against the SQL that defines it ---- */
const called = (src.match(/rpc\/([A-Za-z0-9_]+)/) || [])[1] || '';
let defined = false;
for (const f of ['design_jobs_engine.sql', 'visualizer_schema.sql']) {
  const p = path.join(ROOT, f);
  if (!existsSync(p)) continue;
  if (new RegExp('create or replace function public\\.' + called + '\\s*\\(').test(await readFile(p, 'utf8'))) {
    defined = true; break;
  }
}
check('4. the RPC it calls is one the SQL actually defines', !!called && defined,
      `route calls "${called || '(none found)'}" — not found as a create-function in the SQL`);

/* ---- 5-7. the shipped handler, exercised ---- */
const mod = await import('file://' + ROUTE + '?v=' + pass);
const handler = mod.default;
const run = async (env, headers) => {
  const saved = { ...process.env };
  for (const k of ['CRON_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'STALE_MINUTES']) delete process.env[k];
  Object.assign(process.env, env);
  let code = null, body = null;
  const res = { status(c) { code = c; return this; }, json(b) { body = b; return this; } };
  try { await handler({ headers: headers || {} }, res); } catch (e) { body = { threw: String(e && e.message) }; }
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, saved);
  return { code, body };
};

let r = await run({}, {});
check('5. no CRON_SECRET -> 401, fail-closed like api/digest.js',
      r.code === 401 && /CRON_SECRET/.test(JSON.stringify(r.body)), JSON.stringify(r));

r = await run({ CRON_SECRET: 's3cret' }, { authorization: 'Bearer wrong' });
check('6. wrong secret -> 401', r.code === 401, JSON.stringify(r));

r = await run({ CRON_SECRET: 's3cret' }, { authorization: 'Bearer s3cret' });
check('7. right secret but no service key -> 500 that NAMES the missing key',
      r.code === 500 && /SUPABASE_SERVICE_ROLE_KEY/.test(JSON.stringify(r.body)), JSON.stringify(r));

/* ---- 8. the policy stays in the SQL ---- */
// The SQL decides gemini-fails / spark-requeues / 3-attempt cap. A second copy
// here is the CHASE_POLICY divergence with a longer fuse.
const decides = /status\s*[:=]\s*['"](failed|queued)['"]/.test(src) || /attempts\s*>=\s*3/.test(src);
check('8. the route does NOT restate the requeue policy — the SQL owns it', !decides,
      'found a status or attempt-cap decision in the route');

/* ---- 9. the staleness floor ---- */
// The slowest honest render measured here was 12m13s. Requeuing good work burns
// an attempt and doubles the load on the box.
const floor = (src.match(/Math\.max\((\d+),/) || [])[1];
check('9. STALE_MINUTES cannot be configured below the longest honest render',
      floor && Number(floor) >= 15, 'floor is ' + (floor || 'absent') + ' minutes; slowest real render was 12m13s');

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
