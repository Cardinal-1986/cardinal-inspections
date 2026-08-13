/* gate_766.mjs — build 766, the data truth.
 *
 * Extracts the SHIPPED blockerFor/schedFor/apptDay/matOrdered text out of
 * index.html and executes it against production data shapes. Not a
 * re-implementation: the functions under test are sliced from the artifact.
 *
 *   node gate_766.mjs [path/to/index.html]
 *
 * Point it at the previous build as a negative control — it must go RED there
 * (schedFor does not exist, and the scheduling chip never clears).
 */
import fs from 'fs';

const FILE = process.argv[2] || 'index.html';
const src = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  — ' + extra : '')); }
};

/* ---- slice a function out of the artifact by brace matching ---- */
function fnText(name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}

console.log('gate_766 on ' + FILE);
console.log('--- the functions exist ---');
const names = ['schedFor', 'apptDay', 'pbDay', 'matOrdered', 'blockerFor'];
const texts = {};
for (const n of names) {
  texts[n] = fnText(n);
  ok('function ' + n + ' present', !!texts[n]);
}
if (names.some(n => !texts[n])) {
  console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  RED (functions missing)');
  process.exit(1);
}

/* ---- build a sandbox with the module's real dependencies stubbed ---- */
const today = new Date(new Date().toDateString());
const dayStr = (offset) => {
  const d = new Date(today.getTime() + offset * 86400000);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

function makeEnv(appts, projects, punch) {
  const win = { cacheAppts: appts, crDate: undefined };
  const harness = `
    var window = __win;
    var items = __punch;
    /* 767 moved the punch lookup behind punchRows()/openPunchFor(); this gate
       slices blockerFor out of the shipped file, so the sandbox has to provide
       the same neighbours the module gives it. */
    function midnight(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
    function today(){ return midnight(new Date()); }
    function punchRows(){ return items; }
    function openPunchFor(pid){
      return punchRows().filter(function(i){
        return String(i.project_id) === String(pid) && i.status === 'open';
      });
    }
    function normStage(s){ return s; }
    function ck(pr){ try { return JSON.parse(pr.checklist || '{}'); } catch(e){ return {}; } }
    ${texts.apptDay}
    ${texts.pbDay}
    ${texts.schedFor}
    ${texts.matOrdered}
    ${texts.blockerFor}
    return { schedFor: schedFor, apptDay: apptDay, matOrdered: matOrdered, blockerFor: blockerFor };
  `;
  // eslint-disable-next-line no-new-func
  return new Function('__win', '__punch', harness)(win, punch);
}

const P = (over = {}) => Object.assign({ id: 'p1', name: 'Test', stage: 'Approved', checklist: '{}' }, over);
const A = (over = {}) => Object.assign({ id: 'a1', project_id: 'p1', kind: 'job', appt_date: dayStr(2) }, over);

console.log('\n--- the scheduling bridge: a real appointment clears the chip ---');
{
  const env = makeEnv([], [], []);
  const r = env.blockerFor(P());
  ok('Approved + no appointment -> Needs scheduling', r && r.tone === 'blocked' && r.text === 'Needs scheduling', JSON.stringify(r));
}
{
  const env = makeEnv([A()], [], []);
  const r = env.blockerFor(P());
  ok('Approved + future job appointment -> no longer blocked', r && r.tone !== 'blocked', JSON.stringify(r));
  ok('   ...and it asks about materials', r && r.text === 'Materials?', JSON.stringify(r));
}
{
  // the exact bug: a job scheduled on the Schedule Board used to read "Needs scheduling" forever
  const env = makeEnv([A()], [], []);
  const r = env.blockerFor(P({ stage: 'Scheduled' }));
  ok('Scheduled + future appointment -> not "Needs scheduling"', r && r.text !== 'Needs scheduling', JSON.stringify(r));
}
{
  const env = makeEnv([A({ appt_date: dayStr(-3) })], [], []);
  const r = env.blockerFor(P({ stage: 'Scheduled' }));
  ok('Scheduled + past appointment -> Should have started (never fired before 766)',
    r && r.tone === 'blocked' && r.text === 'Should have started', JSON.stringify(r));
}
{
  const env = makeEnv([A({ appt_date: dayStr(-3) }), A({ id: 'a2', appt_date: dayStr(5) })], [], []);
  const d = env.schedFor(P());
  ok('past + future appointments -> the NEXT build day wins', d && d >= today, String(d));
}
{
  const env = makeEnv([A({ kind: 'appt' }), A({ id: 'a2', kind: 'team' }), A({ id: 'a3', kind: 'drop' })], [], []);
  const r = env.blockerFor(P());
  ok('only kind "job" counts as a build day (drop/appt/team ignored)',
    r && r.text === 'Needs scheduling', JSON.stringify(r));
}
{
  const env = makeEnv([A({ project_id: 'OTHER' })], [], []);
  const r = env.blockerFor(P());
  ok('another job\'s appointment does not schedule this one', r && r.text === 'Needs scheduling', JSON.stringify(r));
}

console.log('\n--- date handling: a date-only column must not shift a day ---');
{
  const env = makeEnv([], [], []);
  const d = env.apptDay('2026-08-21');
  ok('apptDay("2026-08-21") is local Aug 21, not Aug 20',
    d && d.getFullYear() === 2026 && d.getMonth() === 7 && d.getDate() === 21,
    d ? d.toString() : 'null');
  ok('apptDay(null) is null', env.apptDay(null) === null);
  ok('apptDay(garbage) is null', env.apptDay('not-a-date') === null);
}

console.log('\n--- the materials flag ---');
{
  const env = makeEnv([A()], [], []);
  const before = env.blockerFor(P());
  const after = env.blockerFor(P({ checklist: JSON.stringify({ materials_ordered_at: '2026-08-18T12:00:00Z' }) }));
  ok('unordered reads "Materials?"', before && before.text === 'Materials?', JSON.stringify(before));
  ok('ordered stops asking', after && after.text !== 'Materials?', JSON.stringify(after));
  ok('ordered names the build day', after && /^Build /.test(after.text), JSON.stringify(after));
  ok('matOrdered false on an empty checklist', env.matOrdered(P()) === false);
  ok('matOrdered true once stamped',
    env.matOrdered(P({ checklist: JSON.stringify({ materials_ordered_at: 'x' }) })) === true);
}

console.log('\n--- the untouched rules still hold ---');
{
  const env = makeEnv([], [], [{ project_id: 'p1', status: 'open' }, { project_id: 'p1', status: 'open' }]);
  const r = env.blockerFor(P({ stage: 'Completed' }));
  ok('Completed + open punch -> blocked, counts them', r && r.tone === 'blocked' && r.text === '2 punch items', JSON.stringify(r));
}
{
  const env = makeEnv([], [], []);
  const r = env.blockerFor(P({ stage: 'Completed' }));
  ok('Completed + clean -> Ready to invoice (clear)', r && r.tone === 'clear' && r.text === 'Ready to invoice', JSON.stringify(r));
}
{
  const env = makeEnv([], [], [{ project_id: 'p1', status: 'open' }]);
  const r = env.blockerFor(P({ stage: 'Lead' }));
  ok('off-stage job carrying punch still blocks', r && r.tone === 'blocked' && r.text === '1 open item', JSON.stringify(r));
}
ok('pbDay avoids a third copy of the app\'s fmtDay (name-collision trap)',
  /function pbDay\(d\)\{/.test(src) && (src.match(/function fmtDay\(/g) || []).length === 2,
  'fmtDay copies: ' + (src.match(/function fmtDay\(/g) || []).length);
{
  const env = makeEnv([], [], []);
  ok('a quiet job returns null', env.blockerFor(P({ stage: 'Lead' })) === null);
}
{
  // the checklist fallback must survive — this is additive, not a swap
  const env = makeEnv([], [], []);
  const r = env.blockerFor(P({ checklist: JSON.stringify({ build_date: dayStr(3) }) }));
  ok('legacy checklist.build_date still honoured (additive, not a swap)',
    r && r.text !== 'Needs scheduling', JSON.stringify(r));
}

console.log('\n--- wiring: the flag has a writer, and history has the closes ---');
ok('Materials tab renders the ordered state', /renderMatOrderState\(\)/.test(src));
ok('a Mark ordered control exists', /data-matord="set"/.test(src));
ok('an undo control exists', /data-matord="clear"/.test(src));
ok('the click handler reads data-matord', /getAttribute\('data-matord'\)/.test(src));
ok('the writer stamps who and when', /materials_ordered_at: new Date\(\)\.toISOString\(\)/.test(src));
ok('the Materials-tab writer goes through saveCkPatch', /saveCkPatch\(on/.test(src));
ok('the board writer goes through patchProjectCk (same checklist, one store)', /window\.patchProjectCk\(pr, \{/.test(src));
ok('closed punch-outs are pushed into the activity feed', /Repair closed:/.test(src));
ok('history reads CardinalPunch, not a second query', /window\.CardinalPunch && window\.CardinalPunch\.rows/.test(src));
ok('the feed push is guarded (punch module parses later)', /\}catch\(_\)\{\}\n\s*cacheAppts\.forEach/.test(src));
ok('punch_steps.sql ships with the build', fs.existsSync('punch_steps.sql') || fs.existsSync('../../../../punch_steps.sql'));

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
