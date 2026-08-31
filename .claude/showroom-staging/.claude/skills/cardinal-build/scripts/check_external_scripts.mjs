#!/usr/bin/env node
/* check_external_scripts.mjs — external <script src> files get the same syntax
 * coverage as inline blocks.
 *
 * WHY. `check_build.py` and `.github/workflows/check.yml` both find scripts with
 * a pattern that DELIBERATELY skips anything carrying `src=`:
 *
 *     /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g
 *
 * Correct while every module lives inline. But the Showroom relocation
 * (SHOWROOM_EXTRACTION_SPIKE.md) turns Showcase and OC Colors into external
 * files — and the moment it does, they SILENTLY STOP BEING SYNTAX-CHECKED.
 * Not a loud break: a coverage hole that reports green. This project has been
 * bitten by that exact shape repeatedly (gate_1180 crashing unnoticed for
 * builds; gate_a11y green for twenty builds over a screen its walk never
 * visited; five healthy gates read as CRASH by a survey that judged on printed
 * words).
 *
 * ⚠ IT ALSO CATCHES A MISSING FILE, which is the worse failure. A `src` pointing
 * at a file that is not in the repo deploys perfectly and 404s in the browser —
 * the app is simply broken with nothing red anywhere. That is checked FIRST.
 *
 * ⚠ THIS GATE HAS NOTHING TO CHECK TODAY. Measured 31 Aug 2026: all six
 * `<script src>` across the shipped artifacts are CDN, zero local. So until
 * Showcase moves, `--selftest` is the ONLY thing exercising it — which makes
 * the selftest the gate, not a formality. A prophylactic check nobody proves
 * can fail is decoration.
 *
 * ONE IMPLEMENTATION, TWO CALLERS. check_build.py shells out to this, and CI
 * runs it directly. Duplicating the logic in YAML is how the two drift, and
 * "one pipeline per concept" is a rule on this project for a reason.
 *
 * Usage:
 *   node check_external_scripts.mjs index.html studio.html ...
 *   node check_external_scripts.mjs --selftest
 * Exit: 0 all local external scripts present and parsing · 1 a failure · 2 usage.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import os from 'os';
import { createRequire } from 'module';

/* ⚠ PATH RESOLUTION LIVES IN ONE PLACE — script_paths.cjs — and this file used
   to carry its own copy. Two copies is how the checker and the gates come to
   disagree about where `/showcase.js` is, which is precisely the bug that copy
   already produced once (root taken from cwd, so a staged artifact reported a
   present file as MISSING). CommonJS because eight of the ten gates that need
   the same answers cannot `require` an .mjs. */
const require_ = createRequire(import.meta.url);
const P = require_('./script_paths.cjs');
const { ROOT, isRemote, resolveLocal } = P;
export const externalRefs = P.externalRefs;
export { isRemote, resolveLocal };

function parses(file, isModule) {
  /* node --check picks its parser from the extension, so a module must be
     checked as .mjs or `import` is a syntax error and the gate lies. */
  const want = isModule ? '.mjs' : '.js';
  let target = file;
  let tmp = null;
  if (path.extname(file) !== want) {
    tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ces-')), 'x' + want);
    fs.copyFileSync(file, tmp);
    target = tmp;
  }
  try { execFileSync('node', ['--check', target], { stdio: 'pipe' }); return null; }
  catch (e) { return (String(e.stderr || e.message).trim().split('\n').find(l => l.includes('Error')) || 'parse failed').slice(0, 160); }
  finally { if (tmp) fs.rmSync(path.dirname(tmp), { recursive: true, force: true }); }
}

export function checkFile(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const refs = externalRefs(html);
  const local = refs.filter(r => !isRemote(r.src));
  const problems = [];
  for (const r of local) {
    const cands = resolveLocal(r.src, htmlPath);
    const f = cands.find(c => fs.existsSync(c));
    if (!f) { problems.push(`${r.src} -> MISSING (looked in ${cands.map(c => path.relative(ROOT, c)).join(', ')}) — this 404s in the browser and nothing else would catch it`); continue; }
    const err = parses(f, r.isModule);
    if (err) problems.push(`${r.src} -> ${err}`);
  }
  return { total: refs.length, remote: refs.length - local.length, local: local.length, problems };
}

/* ------------------------------------------------------------------ selftest */
function selftest() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ces-self-'));
  const cases = [];
  const mk = (name, files, html) => {
    const dir = path.join(d, name); fs.mkdirSync(dir, { recursive: true });
    for (const [f, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), body);
    const p = path.join(dir, 'page.html'); fs.writeFileSync(p, html); return p;
  };
  const run = (label, p, wantProblems) => {
    const r = checkFile(p);
    const got = r.problems.length;
    const ok = wantProblems ? got > 0 : got === 0;
    cases.push([ok, `${label} — ${got} problem(s)${got ? ': ' + r.problems[0].slice(0, 70) : ''}`]);
  };

  run('a VALID external script passes',
      mk('good', { 'a.js': 'function f(){ return 1; }\n' }, '<script src="a.js"></script>'), false);

  /* the whole point: a syntax error in an external file must go RED */
  run('a SYNTAX ERROR in an external script FAILS',
      mk('bad', { 'a.js': 'function f({ return 1;\n' }, '<script src="a.js"></script>'), true);

  /* the worse failure: deploys fine, 404s in the browser */
  run('a MISSING external file FAILS',
      mk('gone', {}, '<script src="nope.js"></script>'), true);

  /* CDN is somebody else's server — must be skipped, not fetched */
  run('a remote CDN src is SKIPPED, not fetched',
      mk('cdn', {}, '<script src="https://cdn.example.com/x.js"></script>'), false);
  run('a protocol-relative src is SKIPPED',
      mk('pr', {}, '<script src="//cdn.example.com/x.js"></script>'), false);

  /* ⚠ MEASURED, NOT ASSUMED — and my first version of this asserted the
     opposite and went red. On node v22.22.2 `node --check` accepts `import`,
     `export` AND top-level `await` in a plain .js file: module-syntax detection
     means the extension makes NO difference. Verified all four combinations.
     So the .mjs switch in parses() is DEFENSIVE ONLY on this runtime — it costs
     a temp copy and catches nothing today. It is kept for older/stricter node
     and for parity with check_build.py's identical inline switch, but do not
     believe it is catching a module/script mismatch, because it is not. */
  run('a type=module external script parses',
      mk('mod', { 'm.js': 'import x from "./y.js";\nexport default x;\n' },
         '<script type="module" src="m.js"></script>'), false);
  /* ⚠ AND THE ASSERTION IS MEASURED AT RUNTIME, NOT HARDCODED. Whether a plain
     .js accepts `import` is a property of the node running the gate — node 22
     locally, node 20 in CI — and an assertion that hardcodes one runtime's
     answer goes red on the other for no reason at all. So probe THIS node,
     then require the checker to agree with it. (Measured 31 Aug 2026: v22.22.2
     and v20.20.2 both ACCEPT, so the .mjs switch in parses() catches nothing on
     either. It is kept for older/stricter runtimes and for parity with
     check_build.py's identical inline switch — do not believe it is working.) */
  {
    const probeDir = fs.mkdtempSync(path.join(d, 'probe-'));
    const probe = path.join(probeDir, 'p.js');
    fs.writeFileSync(probe, 'import x from "./y.js";\nexport default x;\n');
    let plainJsAcceptsModuleSyntax = true;
    try { execFileSync('node', ['--check', probe], { stdio: 'pipe' }); }
    catch (_) { plainJsAcceptsModuleSyntax = false; }
    run(`module syntax in a NON-module tag: this node (${process.version}) ` +
        (plainJsAcceptsModuleSyntax ? 'ACCEPTS it, so the checker must too'
                                    : 'REJECTS it, so the checker must report it'),
        mk('nomod', { 'm.js': 'import x from "./y.js";\nexport default x;\n' },
           '<script src="m.js"></script>'),
        !plainJsAcceptsModuleSyntax);
  }

  /* the false-RED this file's ROOT comment describes: a site-absolute src is
     served from the DEPLOY root, so it must be looked for at the repo root and
     not under whatever directory the checker happened to be run from. */
  {
    const repo = path.join(d, 'fakerepo');
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'showcase.js'), 'var ok = 1;\n');
    fs.mkdirSync(path.join(repo, 'sub'), { recursive: true });
    const pg = path.join(repo, 'sub', 'page.html');
    fs.writeFileSync(pg, '<script src="/showcase.js"></script>');
    run('a site-absolute src resolves against the REPO ROOT, not the cwd', pg, false);
    const bad = path.join(repo, 'sub', 'broken.html');
    fs.writeFileSync(bad, '<script src="/not-there.js"></script>');
    run('and a site-absolute src with no file anywhere still FAILS', bad, true);
  }

  run('single-quoted src is found',
      mk('sq', {}, "<script src='nope.js'></script>"), true);
  run('a query string is stripped before resolving',
      mk('qs', { 'a.js': 'var x=1;\n' }, '<script src="a.js?v=3"></script>'), false);

  fs.rmSync(d, { recursive: true, force: true });
  let fail = 0;
  for (const [ok, msg] of cases) { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fail++; }
  console.log(`SELFTEST ${fail ? 'FAIL' : 'PASS'} (${cases.length - fail}/${cases.length})`);
  return fail ? 1 : 0;
}

/* ---------------------------------------------------------------------- main */
const args = process.argv.slice(2);
if (args[0] === '--selftest') process.exit(selftest());
if (!args.length) { console.error('usage: check_external_scripts.mjs <file.html> [...] | --selftest'); process.exit(2); }

let bad = 0, checked = 0, skipped = 0;
for (const a of args) {
  if (!fs.existsSync(a)) { console.log(`  – ${a} not present, skipping`); continue; }
  const r = checkFile(a);
  checked += r.local; skipped += r.remote;
  if (r.problems.length) {
    bad += r.problems.length;
    for (const p of r.problems) console.error(`  ✗ ${a}: ${p}`);
  } else {
    console.log(`  ✓ ${a}: ${r.local} local external script(s) OK, ${r.remote} remote skipped`);
  }
}
console.log(bad
  ? `EXTERNAL SCRIPTS RED — ${bad} problem(s) across ${checked} local file(s)`
  : `EXTERNAL SCRIPTS GREEN — ${checked} local external script(s) parse, ${skipped} remote skipped`);
process.exit(bad ? 1 : 0);
