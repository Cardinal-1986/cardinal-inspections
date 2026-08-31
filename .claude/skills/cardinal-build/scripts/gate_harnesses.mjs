#!/usr/bin/env node
/* gate_harnesses.mjs — run the browser-free harnesses in CI, ratcheted.
 *
 * THE GAP THIS CLOSES. CI pinned `node-version: 20` while `package.json`
 * declares `"engines": { "node": "22.x" }` — CI has been testing on a runtime
 * the app never runs on. And the installed jsdom (30.0.1) declares
 * `"node": "^22.22.2 || ^24.15.0 || >=26.0.0"`: it does not support node 20 AT
 * ALL. On node 20 these harnesses die inside jsdom
 * (`webidl.util.markAsUncloneable is not a function`) before their first
 * assertion. So the alternative — "pin a compatible jsdom" — would mean pinning
 * BACKWARDS to accommodate a CI runtime that production does not use. The job
 * runs node 22 instead, which is what Vercel runs.
 *
 * ⚠ WHY RATCHETED, AND WHY THAT IS NOT A DODGE. Four of these harnesses are RED
 * on main today, for real reasons that predate this gate: assertions that drifted
 * from the app, and one harness still spying `confirm()` after the module moved
 * to `crAsk()`. Running them raw would paint CI red on main from the first
 * commit, and the only ways out would be to bend an assertion or to delete it —
 * both forbidden here, and both worse than the disease. So the KNOWN failures
 * are baselined by NAME, and a NEW one is red the build it lands. Same shape as
 * gate_types / gate_dupes, which this repo already runs.
 *
 * ⚠ A BASELINE IS A DEBT REGISTER, NOT AN EXCUSE. Every baselined failure is
 * printed on every run. It may shrink freely; it may never grow.
 *
 * ⚠ AND A HARNESS THAT STOPS ASSERTING IS RED, NOT QUIET. The failure that
 * makes a suite worthless is not a red test, it is a test that silently stops
 * running — which is exactly what node 20 was doing to all six. A drop in the
 * PASS count is therefore a failure in its own right, independent of the FAIL
 * count, because a crash produces zero of both.
 *
 * Usage:
 *   node gate_harnesses.mjs [index.html] [studio.html]
 *   node gate_harnesses.mjs --selftest      (proves it can go RED)
 *   node gate_harnesses.mjs --rebaseline    (deliberate, prints what moved)
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const P = require_('./script_paths.cjs');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const BASELINE = path.join(HERE, 'harness_baseline.json');

/* Browser-free only. gate_983, gate_1076, harness_occhead and audit_contrast
   drive Chromium through playwright and are NOT covered here — a browser
   install is a separate decision with its own failure modes, and pretending
   otherwise would be a coverage claim this job cannot honour. */
export const HARNESSES = [
  { name: 'harness_showcase.js', args: a => [a.app] },
  { name: 'harness_walk.js',     args: a => [a.app] },
  { name: 'harness_tray.js',     args: a => [a.app, a.studio] },
  { name: 'harness_ourroofs.js', args: a => [a.app] },
  { name: 'harness_colors.js',   args: a => [a.app] },
  { name: 'harness_vision.js',   args: a => [a.app] },
];

/* Four output shapes exist in this repo and scoring on one of them is how a
   healthy gate gets read as dead — that already happened once, to gate_983. */
function tally(out, which) {
  const sum = out.match(/\bpass\s+(\d+)\s+fail\s+(\d+)/i);
  if (sum) return Number(which === 'pass' ? sum[1] : sum[2]);
  const line = out.match(/—\s*(\d+)\s+passed,\s*(\d+)\s+failed/);
  if (line) return Number(which === 'pass' ? line[1] : line[2]);
  const re = which === 'pass' ? /^\s*(?:PASS|ok\s)/gm : /^\s*FAIL/gm;
  return (out.match(re) || []).length;
}
const failNames = out => [...new Set((out.match(/^\s*FAIL\s+(.*)$/gm) || [])
  .map(l => l.replace(/^\s*FAIL\s+/, '').split('  →')[0].trim()))].sort();

export function runOne(h, args, node = process.execPath) {
  let out, code = 0;
  try { out = execFileSync(node, [path.join(HERE, h.name), ...h.args(args)],
                           { encoding: 'utf8', stdio: 'pipe', timeout: 420000 }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); code = e.status == null ? 'CRASH' : e.status; }
  return { passes: tally(out, 'pass'), fails: tally(out, 'fail'), names: failNames(out), code, out };
}

function compare(cur, base) {
  const problems = [];
  for (const [name, c] of Object.entries(cur)) {
    const b = base[name];
    if (!b) { problems.push(`${name}: NOT IN BASELINE — add it deliberately with --rebaseline`); continue; }
    const grew = c.names.filter(n => !b.names.includes(n));
    for (const n of grew) problems.push(`${name}: NEW FAILURE — ${n}`);
    if (c.passes < b.passes)
      problems.push(`${name}: PASS COUNT FELL ${b.passes} -> ${c.passes} — a harness that stops asserting is a failure, not silence`);
    if (c.passes === 0 && c.fails === 0 && b.passes > 0)
      problems.push(`${name}: ASSERTED NOTHING (exit ${c.code}) — it ran no checks at all`);
  }
  for (const name of Object.keys(base)) if (!cur[name]) problems.push(`${name}: in the baseline but was not run`);
  return problems;
}

/* ------------------------------------------------------------------ selftest
 * Proves the runner goes RED. A ratcheted gate never seen to fail is a gate
 * that has quietly baselined everything. */
function selftest() {
  const cases = [];
  const ok = (c, m) => cases.push([!!c, m]);
  const base = {
    a: { passes: 10, fails: 1, names: ['known drift'] },
    b: { passes: 5,  fails: 0, names: [] },
  };
  ok(compare({ a: { passes: 10, fails: 1, names: ['known drift'], code: 1 },
               b: { passes: 5, fails: 0, names: [], code: 0 } }, base).length === 0,
     'an unchanged run is GREEN');
  let p = compare({ a: { passes: 10, fails: 2, names: ['known drift', 'brand new'], code: 1 },
                    b: { passes: 5, fails: 0, names: [], code: 0 } }, base);
  ok(p.length === 1 && /NEW FAILURE — brand new/.test(p[0]), 'a NEW failure is RED and is named');
  p = compare({ a: { passes: 10, fails: 0, names: [], code: 0 },
                b: { passes: 5, fails: 0, names: [], code: 0 } }, base);
  ok(p.length === 0, 'a baselined failure DISAPPEARING is not red — the ratchet only turns one way');
  p = compare({ a: { passes: 0, fails: 0, names: [], code: 'CRASH' },
                b: { passes: 5, fails: 0, names: [], code: 0 } }, base);
  ok(p.some(x => /ASSERTED NOTHING/.test(x)), 'a harness that crashes before asserting is RED, not quiet');
  ok(p.some(x => /PASS COUNT FELL/.test(x)), 'and the pass-count drop is reported too');
  p = compare({ a: { passes: 3, fails: 1, names: ['known drift'], code: 1 },
                b: { passes: 5, fails: 0, names: [], code: 0 } }, base);
  ok(p.some(x => /PASS COUNT FELL 10 -> 3/.test(x)), 'silently running FEWER checks is RED');
  p = compare({ a: { passes: 10, fails: 1, names: ['known drift'], code: 1 } }, base);
  ok(p.some(x => /b: in the baseline but was not run/.test(x)), 'a harness dropped from the run is RED');
  p = compare({ a: { passes: 10, fails: 1, names: ['known drift'], code: 1 },
                b: { passes: 5, fails: 0, names: [], code: 0 },
                c: { passes: 1, fails: 0, names: [], code: 0 } }, base);
  ok(p.some(x => /c: NOT IN BASELINE/.test(x)), 'a harness with no baseline entry is RED, not silently trusted');

  let fail = 0;
  for (const [good, msg] of cases) { console.log(`  ${good ? 'ok  ' : 'FAIL'} ${msg}`); if (!good) fail++; }
  console.log(`SELFTEST ${fail ? 'FAIL' : 'PASS'} (${cases.length - fail}/${cases.length})`);
  return fail ? 1 : 0;
}

/* ---------------------------------------------------------------------- main */
const argv = process.argv.slice(2);
if (argv[0] === '--selftest') process.exit(selftest());

const flags = argv.filter(a => a.startsWith('--'));
const pos = argv.filter(a => !a.startsWith('--'));
const args = { app: pos[0] || path.join(P.ROOT, 'index.html'),
               studio: pos[1] || path.join(P.ROOT, 'studio.html') };

const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  console.error(`::error::gate_harnesses needs node 22+ (running ${process.versions.node}). ` +
                `jsdom 30 declares "^22.22.2 || ^24.15.0 || >=26.0.0" and dies before the first ` +
                `assertion on node 20 — a silent zero, which is worse than a red.`);
  process.exit(2);
}

console.log(`gate_harnesses — node ${process.versions.node} · ${path.relative(P.ROOT, args.app)}\n`);
const cur = {};
for (const h of HARNESSES) {
  const r = runOne(h, args);
  cur[h.name] = { passes: r.passes, fails: r.fails, names: r.names, code: r.code };
  console.log(`  ${h.name.padEnd(22)} ${String(r.passes).padStart(4)}P ${String(r.fails).padStart(3)}F  exit ${r.code}`);
}

if (flags.includes('--rebaseline')) {
  const old = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
  fs.writeFileSync(BASELINE, JSON.stringify(cur, null, 2) + '\n');
  console.log('\nREBASELINED. What moved:');
  for (const [n, c] of Object.entries(cur)) {
    const b = old[n];
    if (!b) { console.log(`   + ${n} (new)`); continue; }
    for (const x of c.names.filter(v => !b.names.includes(v))) console.log(`   + ${n}: ${x}`);
    for (const x of b.names.filter(v => !c.names.includes(v))) console.log(`   - ${n}: ${x}`);
    if (b.passes !== c.passes) console.log(`   ~ ${n}: passes ${b.passes} -> ${c.passes}`);
  }
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('::error::no harness_baseline.json — create it deliberately with --rebaseline');
  process.exit(2);
}
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const problems = compare(cur, base);

const carried = Object.entries(base).flatMap(([n, b]) => b.names.map(x => `${n}: ${x}`));
console.log(`\n${carried.length} baselined failure(s) carried — a debt register, printed every run, never allowed to grow:`);
for (const c of carried) console.log(`   · ${c}`);
const fixed = Object.entries(cur).flatMap(([n, c]) =>
  (base[n] ? base[n].names.filter(x => !c.names.includes(x)) : []).map(x => `${n}: ${x}`));
if (fixed.length) { console.log(`\n${fixed.length} baselined failure(s) NO LONGER FAIL — rebaseline to lock the improvement in:`); for (const f of fixed) console.log(`   ✓ ${f}`); }

if (problems.length) {
  console.log('');
  for (const p of problems) console.error(`::error::${p}`);
  console.log(`\nGATE HARNESSES RED — ${problems.length} problem(s) over baseline`);
  process.exit(1);
}
console.log('\nGATE HARNESSES GREEN — nothing new, nothing stopped asserting');
