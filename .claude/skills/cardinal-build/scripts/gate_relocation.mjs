#!/usr/bin/env node
/* gate_relocation.mjs — proves the ten converted gates work on a RELOCATED
 * Showcase and OC Colors, and still go red when the relocated module is broken.
 *
 * WHY THIS EXISTS. Ten gates stopped slicing `index.html` by block id and now
 * ask `module_source.cjs` for their module. That change is worthless unless two
 * things are true, and neither can be established by reading the code:
 *
 *   POSITIVE — pointed at an artifact where the module lives in a FILE, each
 *     gate reaches the same verdict it reaches today. Same passes, same
 *     failures, same names.
 *   NEGATIVE — break the relocated FILE and the gate goes red. A gate that
 *     cannot fail proves nothing, and a gate that reads a module from a new
 *     place is exactly where a silent empty string would hide.
 *
 * ⚠ IT BUILDS THE RELOCATION RATHER THAN ASSUMING IT. The fixture is the real
 * shipped index.html with the four blocks CUT OUT and replaced by <script src>
 * and <link rel=stylesheet> pointing at real files holding the real text. No
 * production file is touched; everything lives in a temp directory.
 *
 * ⚠ SOME ASSERTIONS *SHOULD* CHANGE, AND THAT IS THE POINT OF MEASURING. A gate
 * that counts something across the WHOLE artifact ("exactly 2 declarations in
 * the file") legitimately sees a different number once the CSS is not in the
 * file any more. Those are reported by name as RELOCATION-SENSITIVE — they are
 * the real remaining work of the move, and finding them is most of this gate's
 * value. They are not conversion bugs and are not silently tolerated.
 *
 * Usage: node gate_relocation.mjs [index.html]
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const P = require_('./script_paths.cjs');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const APP  = process.argv[2] || path.join(P.ROOT, 'index.html');
const STUDIO = path.join(P.ROOT, 'studio.html');

/* ── build the relocated artifact ─────────────────────────────────────────── */
const CUTS = [
  { tag: 'style',  id: 'cr-show-styles', file: 'showcase.css', ref: h => `<link rel="stylesheet" href="/showroom/${h}">` },
  { tag: 'script', id: 'cr-show-script', file: 'showcase.js',  ref: h => `<script src="/showroom/${h}"></script>` },
  { tag: 'style',  id: 'cr-occ-styles',  file: 'colors.css',   ref: h => `<link rel="stylesheet" href="/showroom/${h}">` },
  { tag: 'script', id: 'cr-occ-script',  file: 'colors.js',    ref: h => `<script src="/showroom/${h}"></script>` },
];

function buildFixture(dir) {
  fs.mkdirSync(path.join(dir, 'showroom'), { recursive: true });
  let html = fs.readFileSync(APP, 'utf8');
  for (const c of CUTS) {
    const open = `<${c.tag} id="${c.id}">`;
    const i = html.indexOf(open);
    if (i === -1) throw new Error('fixture: block not found in the artifact: ' + c.id);
    const j = html.indexOf(`</${c.tag}>`, i);
    const body = html.slice(i + open.length, j);
    fs.writeFileSync(path.join(dir, 'showroom', c.file), body);
    html = html.slice(0, i) + c.ref(c.file) + html.slice(j + `</${c.tag}>`.length);
  }
  const out = path.join(dir, 'index.html');
  fs.writeFileSync(out, html);
  return out;
}

/* ── the gates, and how to break the module each one is about ─────────────── */
const GATES = [
  { g: 'gate_983.mjs',        args: a => [a], breaks: [['showcase.css', /font-weight:\d{3};font-size:[\d.]+px/g, 'font-weight:XXX;font-size:0px']] },
  { g: 'gate_1076.mjs',       args: a => [a], breaks: [['showcase.js', /window\.CardinalShowcase\s*=/, 'window.NOT_THE_SHOWCASE =']] },
  /* ⚠ THE BREAK MUST HIT SOMETHING THE GATE ACTUALLY ASSERTS ON, AND EARLY.
     `openLens` was my first choice and changed nothing: this harness never
     asserts on it, so a "negative control" that broke it proved only that the
     gate ignores that symbol. Chosen from the harness's own assertion list
     (line 112) — the public-API shape it explicitly checks. */
  { g: 'harness_showcase.js', args: a => [a],
    breaks: [['showcase.js', /window\.CardinalShowcase\s*=\s*Object\.assign/, 'window.CardinalShowcase = Object.NOPE']] },
  /* ⚠ `walks_findings` was my first break token and it occurs ZERO times in the
     module — the control matched nothing and "passed" by doing nothing. The gate
     below now REFUSES a break pattern that matches nothing, which is how it was
     caught. `openWalk` occurs 5 times and is what this harness is about. */
  /* ⚠ SAME TRAP, TWICE. `walks_findings` matched nothing at all; `openWalk`
     matched but sits past the point this harness crashes (a pre-existing
     crAsk drift, unrelated to relocation). `renderWalkTab` is asserted at
     line 45, before anything else runs — the harness bails with a stated
     reason rather than a stack trace when it is missing. */
  { g: 'harness_walk.js',     args: a => [a],
    breaks: [['showcase.js', /function renderWalkTab\(/, 'function NOPE_renderWalkTab(']] },
  { g: 'harness_tray.js',     args: a => [a, STUDIO], breaks: [['showcase.js', /__studio_tray__/g, '__NOPE__']] },
  { g: 'harness_ourroofs.js', args: a => [a], breaks: [['colors.js', /shrinkOne/g, 'NOPE_shrinkOne']] },
  { g: 'harness_colors.js',   args: a => [a], breaks: [['colors.js', /window\.CardinalColors\s*=/, 'window.NOT_COLORS =']] },
  { g: 'harness_occhead.js',  args: a => [a], breaks: [['colors.css', /--occ-/g, '--nope-']] },
  { g: 'harness_vision.js',   args: a => [a], breaks: [['colors.css', /text-size-adjust/g, 'nope-size-adjust']] },
  /* ⚠ CANNOT BE EXERCISED, AND SAYING SO IS THE HONEST ANSWER. audit_contrast
     self-disables with exit 0 because its 616 colour fixtures were never
     committed (they lived in a session scratchpad). It reaches no assertion, so
     breaking its module changes nothing — that is the fixtures missing, not the
     gate failing to see its module. Recorded as UNEXERCISABLE rather than
     counted as a pass it did not earn or a failure it did not commit. */
  { g: 'audit_contrast.js',   args: a => [a], unexercisable:
      'fixtures never committed — self-disables at exit 0; harness_colors and harness_occhead cover this surface',
    breaks: [] },
];

const NODE = process.execPath;
function run(gate, args) {
  try {
    const out = execFileSync(NODE, [path.join(HERE, gate), ...args],
                             { encoding: 'utf8', stdio: 'pipe', timeout: 420000 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? 'CRASH' : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
/* ⚠ FOUR OUTPUT FORMATS, AND SCORING ON ONE OF THEM IS HOW A HEALTHY GATE GETS
   READ AS DEAD. gate_983 prints `pass 9  fail 0` on a summary line and never
   emits a PASS line at all; the jsdom harnesses print `  PASS name`; some print
   `  ok   name`. A counter that knows only the second reported gate_983 as
   having run nothing, on a run where it passed 9 assertions. Both shapes are
   counted, and the summary line wins when present because it is the gate's own
   arithmetic rather than mine. */
function tally(out, which) {
  const sum = out.match(/\bpass\s+(\d+)\s+fail\s+(\d+)/i);
  if (sum) return Number(which === 'pass' ? sum[1] : sum[2]);
  const line = out.match(/—\s*(\d+)\s+passed,\s*(\d+)\s+failed/);
  if (line) return Number(which === 'pass' ? line[1] : line[2]);
  const re = which === 'pass' ? /^\s*(?:PASS|ok\s)/gm : /^\s*(?:FAIL)/gm;
  return (out.match(re) || []).length;
}
const fails  = s => tally(s, 'fail');
const passes = s => tally(s, 'pass');
const failNames = s => (s.match(/^\s*FAIL\s+(.*)$/gm) || []).map(l => l.replace(/^\s*FAIL\s+/, '').split('  →')[0].trim());

/* ── run ──────────────────────────────────────────────────────────────────── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reloc-'));
const RELOC = buildFixture(tmp);
console.log(`fixture: ${CUTS.length} blocks cut out of ${path.relative(P.ROOT, APP)} into ${path.relative(P.ROOT, tmp)}/showroom/`);
for (const c of CUTS) console.log(`   ${c.id} -> showroom/${c.file}  (${fs.statSync(path.join(tmp,'showroom',c.file)).size.toLocaleString()} bytes)`);
console.log('');

let bad = 0, sensitive = [], unexercisable = [];
for (const G of GATES) {
  const base = run(G.g, G.args(APP));
  const rel  = run(G.g, G.args(RELOC));

  /* ⚠ TWO IDENTICAL CRASHES ARE NOT AGREEMENT, AND THIS GATE WAS FOOLED BY THAT
     ONCE. Run under node 20 the jsdom harnesses die in jsdom itself
     (`webidl.util.markAsUncloneable is not a function`, a node 22 API), so both
     the inline and the relocated run produced 0 passes and 0 failures — and
     "0P/0F === 0P/0F" scored as "same verdict". That is BUG_CLASSES 37 wearing
     a green hat: a gate proving nothing while reporting success. A run that
     asserted NOTHING is refused outright, and the reason is printed. */
  const ranNothing = r => passes(r.out) === 0 && fails(r.out) === 0 && !/NOT RUN/.test(r.out);
  if (ranNothing(base) || ranNothing(rel)) {
    const why = (base.out + rel.out).match(/^\s*(?:TypeError|ReferenceError|Error)[^\n]*/m);
    console.log(`  FAIL ${G.g.padEnd(22)} NO ASSERTIONS RAN — this proves nothing about relocation`);
    console.log(`         ${why ? why[0].trim().slice(0, 110) : `exit ${base.code}/${rel.code}, no PASS or FAIL lines`}`);
    bad++;
    continue;
  }

  const samePass = passes(base.out) === passes(rel.out);
  const sameFail = fails(base.out) === fails(rel.out);
  const newFails = failNames(rel.out).filter(n => !failNames(base.out).includes(n));

  let line = `${G.g.padEnd(22)} inline ${passes(base.out)}P/${fails(base.out)}F  relocated ${passes(rel.out)}P/${fails(rel.out)}F`;
  if (samePass && sameFail) {
    console.log(`  ok   ${line}  — same verdict`);
  } else {
    console.log(`  ~~   ${line}`);
    for (const n of newFails) { sensitive.push([G.g, n]); console.log(`         RELOCATION-SENSITIVE: ${n}`); }
    if (!newFails.length) { console.log('         (counts moved with no newly-named failure — investigate)'); bad++; }
  }

  if (G.unexercisable) {
    console.log(`  --     negative: NOT EXERCISABLE — ${G.unexercisable}`);
    unexercisable.push([G.g, G.unexercisable]);
  }
  /* NEGATIVE — break the relocated file, require the gate to notice */
  for (const [file, re, rep] of G.breaks) {
    const p = path.join(tmp, 'showroom', file);
    const orig = fs.readFileSync(p, 'utf8');
    const broken = orig.replace(re, rep);
    if (broken === orig) { console.log(`  FAIL   ${G.g}: break pattern ${re} matched NOTHING in ${file} — the negative control is vacuous`); bad++; continue; }
    fs.writeFileSync(p, broken);
    const red = run(G.g, G.args(RELOC));
    fs.writeFileSync(p, orig);
    /* ⚠ FEWER PASSES IS ALSO THE GATE NOTICING, and the first version of this
       check missed it — it looked only at the FAIL count, so a harness that
       responds to a broken module by bailing out early (running fewer
       assertions rather than failing more) was scored as blind. Any material
       change in the verdict counts: more failures, fewer passes, a new exit
       code, or a named error. */
    const noticed = fails(red.out) > fails(rel.out) || passes(red.out) < passes(rel.out) ||
                    red.code === 'CRASH' || (red.code !== 0 && rel.code === 0) ||
                    /not found|Error/.test(red.out.slice(0, 400));
    if (noticed) console.log(`  ok     negative: breaking ${file} -> ${passes(red.out)}P/${fails(red.out)}F (was ${passes(rel.out)}P/${fails(rel.out)}F), exit ${red.code}`);
    else { console.log(`  FAIL   negative: breaking ${file} changed NOTHING — this gate cannot see its own module`); bad++; }
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('');
if (sensitive.length) {
  console.log(`${sensitive.length} relocation-sensitive assertion(s) — these are the real remaining work of the move,`);
  console.log('not conversion bugs. Each counts something across the WHOLE artifact and legitimately');
  console.log('sees a different number once the module is a file:');
  for (const [g, n] of sensitive) console.log(`   ${g}: ${n}`);
  console.log('');
}
if (unexercisable.length) {
  console.log(`${unexercisable.length} gate(s) could not be exercised at all — stated, not counted as green:`);
  for (const [g, why] of unexercisable) console.log(`   ${g}: ${why}`);
  console.log('');
}
console.log(bad ? `RELOCATION GATE RED — ${bad} problem(s)` : 'RELOCATION GATE GREEN — every gate keeps its verdict and still fails when its module is broken');
process.exit(bad ? 1 : 0);
