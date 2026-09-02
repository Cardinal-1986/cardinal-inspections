#!/usr/bin/env node
/* gate_chromium.mjs — the four Chromium gates, in CI, each with a negative control.
 *
 * WHY THESE FOUR WERE OUTSIDE CI. They drive a real browser, and until now the
 * repo had no CI job that installed one. Three of them also hard-coded a browser
 * path inside the sandbox they were written in, and one had self-disabled for
 * months over fixtures that were never committed. So "not covered" understated
 * it: two of the four could not have run anywhere but one machine.
 *
 * ⚠ ALL FOUR ARE GREEN ON THE SHIPPED FILE, SO THERE IS NO BASELINE HERE, AND
 * THAT IS DELIBERATE. gate_harnesses carries a debt register because four of its
 * six are legitimately red; these four are not. The honest ratchet is zero, and
 * a baseline file would only be somewhere for a future failure to hide.
 *
 * ⚠ WHICH MAKES THE NEGATIVE CONTROLS THE WHOLE VALUE. Four gates that have only
 * ever been seen to pass prove nothing — this project has shipped a gate
 * incapable of failing more than once. Each gate here is run a second time
 * against a DELIBERATELY BROKEN copy of the artifact, targeting the specific
 * thing that gate exists to protect, and is required to go red.
 *
 * Usage: node gate_chromium.mjs [index.html]
 *        node gate_chromium.mjs --selftest
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const P = require_('./script_paths.cjs');
const HERE = path.dirname(new URL(import.meta.url).pathname);

/* Each break targets what its gate is FOR — not a random corruption. A control
   that breaks something the gate never asserts on passes by doing nothing, and
   that already happened twice while building the relocation gate. */
const GATES = [
  { name: 'gate_983.mjs',
    protects: 'no invalid `font:<weight> <size> inherit` shorthand survives anywhere',
    break: { find: '#cr-occ .occ-title{', repl: '#cr-occ .occ-title{font:700 13px inherit;' } },
  { name: 'gate_1076.mjs',
    protects: "The Walk's job door: openForProject is exported and prefills from the job",
    break: { find: 'openForProject', repl: 'openForNOPE', all: true } },
  { name: 'harness_occhead.js',
    protects: 'the OC line title never breaks inside a word, at five widths x three styles',
    break: { find: 'word-break:keep-all', repl: 'word-break:break-all', all: true } },
  { name: 'audit_contrast.js',
    protects: 'every text node in OC Colors meets its WCAG floor, measured in a real engine',
    selftestFlag: true },
  /* 1197: the Appointment's rail must follow every exit the conductor did not
     choose. The break removes the one call hideAllViews() makes into the
     module, which is exactly the 1196 leak. */
  { name: 'gate_1197.mjs',
    protects: "The Appointment's rail comes down on Back, a notification, a Front Door door — every exit but its own",
    break: { find: 'window.CardinalAppointment.abandon();', repl: 'void 0;' } },
];

function run(script, args) {
  try {
    const out = execFileSync(process.execPath, [path.join(HERE, script), ...args],
                             { encoding: 'utf8', stdio: 'pipe', timeout: 600000 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? 'CRASH' : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
const lastLine = o => (o.trim().split('\n').filter(Boolean).pop() || '').slice(0, 88);

if (process.argv[2] === '--selftest') {
  /* The runner's own logic: a break that matches nothing must be refused, because
     such a "control" passes by doing nothing at all. */
  const app = fs.readFileSync(path.join(P.ROOT, 'index.html'), 'utf8');
  let fail = 0;
  for (const g of GATES) {
    if (!g.break) continue;
    const hit = app.split(g.break.find).length - 1;
    const ok = hit > 0;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${g.name}: break anchor ${JSON.stringify(g.break.find)} occurs ${hit}x in the artifact`);
    if (!ok) fail++;
  }
  console.log(`SELFTEST ${fail ? 'FAIL' : 'PASS'} (${GATES.filter(g => g.break).length - fail}/${GATES.filter(g => g.break).length})`);
  process.exit(fail ? 1 : 0);
}

const APP = process.argv[2] || path.join(P.ROOT, 'index.html');
const STUDIO = path.join(P.ROOT, 'studio.html');
console.log(`gate_chromium — node ${process.versions.node} · ${path.relative(P.ROOT, APP)}`);
console.log(`browser: ${require_('./chromium_launch.cjs').chromiumPath() || '(playwright default)'}\n`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chrom-'));
let bad = 0;

for (const g of GATES) {
  /* POSITIVE — the gate must pass on the shipped artifact. */
  const pos = run(g.name, g.selftestFlag ? [APP] : [APP]);
  if (pos.code === 0) console.log(`  ok   ${g.name.padEnd(20)} ${lastLine(pos.out)}`);
  else { console.error(`::error::${g.name} FAILED on the shipped artifact (exit ${pos.code}): ${lastLine(pos.out)}`); bad++; }

  /* NEGATIVE — break what it protects; it must notice. */
  let neg;
  if (g.selftestFlag) {
    /* audit_contrast poisons its own stylesheet and reports whether it caught it,
       so its control is its --selftest: exit 0 means "the regression was seen". */
    neg = run(g.name, [APP, '--selftest']);
    const caught = neg.code === 0 && /SELFTEST PASS/.test(neg.out);
    if (caught) console.log(`  ok     negative: ${lastLine(neg.out)}`);
    else { console.error(`::error::${g.name}: its own regression control did not fire — ${lastLine(neg.out)}`); bad++; }
    continue;
  }
  const src = fs.readFileSync(APP, 'utf8');
  const hits = src.split(g.break.find).length - 1;
  if (!hits) { console.error(`::error::${g.name}: break anchor ${JSON.stringify(g.break.find)} matched NOTHING — the control would be vacuous`); bad++; continue; }
  const poisoned = path.join(tmp, g.name.replace(/\W/g, '_') + '.html');
  fs.writeFileSync(poisoned, g.break.all ? src.split(g.break.find).join(g.break.repl)
                                         : src.replace(g.break.find, g.break.repl));
  neg = run(g.name, [poisoned]);
  if (neg.code !== 0) console.log(`  ok     negative: broke ${hits} site(s) of ${JSON.stringify(g.break.find)} -> exit ${neg.code}`);
  else { console.error(`::error::${g.name} stayed GREEN on an artifact where ${JSON.stringify(g.break.find)} was broken — it does not protect ${g.protects}`); bad++; }
  fs.rmSync(poisoned, { force: true });
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('');
console.log(bad ? `GATE CHROMIUM RED — ${bad} problem(s)`
                : 'GATE CHROMIUM GREEN — all four pass on the shipped file and all four go red when what they protect is broken');
process.exit(bad ? 1 : 0);
