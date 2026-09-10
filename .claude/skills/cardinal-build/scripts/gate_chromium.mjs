#!/usr/bin/env node
/* gate_chromium.mjs — the Chromium gates, in CI, each with a negative control.
 *
 * WHY THE ORIGINAL FOUR WERE OUTSIDE CI. They drive a real browser, and until now the
 * repo had no CI job that installed one. Three of them also hard-coded a browser
 * path inside the sandbox they were written in, and one had self-disabled for
 * months over fixtures that were never committed. So "not covered" understated
 * it: two of the four could not have run anywhere but one machine.
 *
 * ⚠ ALL GATES ARE GREEN ON THE SHIPPED FILE, SO THERE IS NO BASELINE HERE, AND
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
  /* 1198: Retail's portal-specific dark button gradient outranked the generic
     rb-light surface. The negative control removes the winning surface again,
     recreating the navy-currentColor-on-navy control seen on the phone. */
  { name: 'gate_1198.mjs',
    protects: 'Retail light mode gives the menu and search icons a light button surface in the winning rule',
    break: {
      find: '  color:var(--hin,#2B3D4F);\n  background:color-mix(in srgb,var(--hac,#376CA0) 10%,#ffffff);',
      repl: '  color:var(--hin,#2B3D4F);'
    } },
  /* 1199: Maps must not download at boot. The break puts scan() back to
     attaching autocomplete on sight, which fetches the Maps API behind the
     sign-in screen — the assessment's warm-boot finding. */
  { name: 'gate_1199.mjs',
    protects: 'Google Maps loads on the first focus of an address field, never at boot; the money routes fail closed',
    break: { find: 'if(isAddressInput(input)) armAutocomplete(input);',
             repl: 'if(isAddressInput(input)) attachAutocomplete(input);' } },
  /* 1200: an open client profile must stop redrawing its punch count from
     inside a body-observer wake. The break removes the guard, restoring the
     unconditional textContent write that measured 360 records in six seconds
     on one element — an identical-string write still emits a childList
     record, which is the 567/569 class. */
  { name: 'gate_1200.mjs',
    protects: 'an open client profile settles; the Approved/Completed team emails fire only on a forward move',
    break: { find: 'var txt = String(open);\nif(el.textContent !== txt) el.textContent = txt;',
             repl: 'var txt = String(open);\nel.textContent = txt;' } },
  /* 1201: nothing may be called Sent until the document really goes out. The
     break drops the wait, restoring the 1200 behaviour the gate measures
     directly — "marked Sent on the tap" with nothing emailed. Anchor counted
     in 1200 first: 0 there, 1 here (BUG_CLASSES 86). */
  { name: 'gate_1201.mjs',
    protects: 'publishing offers the three real sends, and the estimate is marked Sent only once that document is',
    break: { find: 'if(!await _went) return;', repl: 'if(false) return;' } },
  /* 1202: a review request is recorded only when the rep says it went out. The
     break drops that answer on the floor, restoring the 1201 behaviour the gate
     measures — "answering Not yet records NOTHING" fails, with writes 0 -> 1.
     Anchor counted in 1201 first: 0 there, 1 here. */
  { name: 'gate_1202.mjs',
    protects: 'a review request is recorded on the send, not the tap, and the card waits for a Completed job',
    break: { find: 'if(!_went) return;', repl: 'if(false) return;' } },
  /* 1203: the Leads grid must be able to give way on an iPad. The break puts
     the un-shrinkable minimums back, which is exactly the measured 1202 state:
     the Job Summary at right=1225 on a 1194 screen. Anchor counted in 1202
     first: 0 there, 1 here. */
  { name: 'gate_1203.mjs',
    protects: 'the iPad Leads panel stays on screen, no job-menu label is truncated, Job cost is admin-only',
    break: { find: 'minmax(0,1.05fr) minmax(0,1fr)', repl: 'minmax(300px,1.05fr) minmax(320px,1fr)' } },
  /* 1204: after Publish, the three real sends must be one tap on the phone,
     not two taps deep under "More". The break puts them back behind a hidden
     wrapper, which IS the measured 1203 state: emailDocBtn, textSignBtn and
     shareBtn each rendering 0x0 inside a display:none parent, so the only way
     to send was the drawer. Anchor counted in 1203 first: 0 there, 1 here
     (BUG_CLASSES 86). */
  { name: 'gate_1204.mjs',
    protects: 'the published document offers Email / Text / Share on the bar itself, above "Mark sent", and the way out says Back',
    break: { find: '      <button class="btn dark" id="emailDocBtn" data-cri="mail"><span class="bl">Email to client</span></button>\n      <button class="btn dark" id="textSignBtn" data-cri="chat" title="Text the client a link to review and sign"><span class="bl">Text to sign</span></button>\n      <button class="btn dark" id="shareBtn" data-cri="paperclip"><span class="bl">Share link</span></button>\n      <button class="btn dark" id="edMoreBtn"',
             repl: '      <span id="edSendsBroken" style="display:none;"><button class="btn dark" id="emailDocBtn" data-cri="mail"><span class="bl">Email to client</span></button><button class="btn dark" id="textSignBtn" data-cri="chat" title="Text the client a link to review and sign"><span class="bl">Text to sign</span></button><button class="btn dark" id="shareBtn" data-cri="paperclip"><span class="bl">Share link</span></button></span>\n      <button class="btn dark" id="edMoreBtn"' } },
  /* 1205: the estimate builder's toolbar must clear the 44px floor. The break
     puts the 26px padding back, which IS the measured 1204 state - Close 72x26,
     Preview 88x26, and "-> Contract" 117x26 sitting at right=463 on a 390px
     screen, with the row scrolling 695 wide inside 390.
     Anchor counted in 1204 first: 0 there, 1 here (BUG_CLASSES 86). */
  { name: 'gate_1205.mjs',
    protects: 'every button on the estimate builder toolbar is at least 44px tall and none sits off the right edge at 390px',
    break: { find: 'color:#f08a90;padding:0 14px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;',
             repl: 'color:#f08a90;padding:6px 12px;border-radius:6px;' } },
  /* 1207: the header search must answer while you type. The break removes the
     one listener that makes it live, restoring the measured 1206 behaviour —
     type "Diamond" and NOTHING happens until Return. Anchor counted in 1206
     first: 0 there, 1 here (BUG_CLASSES 86). */
  { name: 'gate_1207.mjs',
    protects: 'the header search shows the top five matching clients as you type, from the same matcher the directory uses',
    break: { find: "i.addEventListener('input', crHsRender);",
             repl: 'void 0;' } },
  /* 1208: the Lead form must take a phone-in. The break pins the address
     guard back on, restoring the measured 1207 behaviour the gate reports in
     the audit's own words — "Required: Street, City, State, Zip", and then
     "Required: State" on the second try. Anchor counted in 1207 first: 0
     there, 1 here (BUG_CLASSES 86). */
  { name: 'gate_1208.mjs',
    protects: 'a lead taken over the phone saves from a name and a number, and an address is required only when a Job Category says there is a job',
    break: { find: 'var _needAddr = !!(_cat instanceof HTMLSelectElement && _cat.value);',
             repl: 'var _needAddr = true;' } },
];

/* ⚠ THE PER-GATE SECONDS ARE HERE BECAUSE I ONCE CANCELLED TWO HEALTHY CI RUNS
   FOR WANT OF THEM. 10 Sep 2026: GitHub's jobs API reported this step
   `in_progress` for the better part of an hour after it had finished, and its
   log endpoint 404s while a job reads as running — so "still going" and
   "finished ages ago" are the same two signals. I read that as an 85-minute
   hang, invented a cause, and cancelled runs 2158 and 2159 by hand. THE
   TIMESTAMPS SAID OTHERWISE and I did not look at them until afterwards: 2158's
   gates step ran 08:37:00 → 08:41:06, four minutes, killed about one minute
   short of finishing. There was no hang. Measured on the very next run, with 14
   gates: 5m18s, worst gate 46s. **Read `started_at`/`completed_at`, never the
   status field.** BUG_CLASSES 90.

   The file-instead-of-pipe below is real hardening and is KEPT, but it is
   precautionary, not a fix for anything observed: with `stdio: 'pipe'`,
   execFileSync blocks reading stdout until every writer closes it, and a gate
   whose watchdog calls `process.exit(3)` without closing Playwright leaves an
   orphaned Chromium holding that inherited pipe — `timeout` kills the child it
   spawned, not the browser behind it. Writing to a temp file removes the pipe,
   so the timeout is real. The gates also close their browser in the watchdog
   now, which is the same hazard closed from the other side. */
function run(script, args) {
  const t0 = Date.now();
  const log = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gate-out-')), 'out.txt');
  const fd = fs.openSync(log, 'w');
  let code;
  try {
    execFileSync(process.execPath, [path.join(HERE, script), ...args],
                 { stdio: ['ignore', fd, fd], timeout: 300000, killSignal: 'SIGKILL' });
    code = 0;
  } catch (e) {
    code = e.status == null ? 'CRASH' : e.status;
  } finally {
    try { fs.closeSync(fd); } catch (_) {}
  }
  let out = '';
  try { out = fs.readFileSync(log, 'utf8'); } catch (_) {}
  try { fs.rmSync(path.dirname(log), { recursive: true, force: true }); } catch (_) {}
  return { code, out, secs: Math.round((Date.now() - t0) / 1000) };
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
  if (pos.code === 0) console.log(`  ok   ${g.name.padEnd(20)} ${String(pos.secs + 's').padStart(5)}  ${lastLine(pos.out)}`);
  else { console.error(`::error::${g.name} FAILED on the shipped artifact after ${pos.secs}s (exit ${pos.code}): ${lastLine(pos.out)}`); bad++; }

  /* NEGATIVE — break what it protects; it must notice. */
  let neg;
  if (g.selftestFlag) {
    /* audit_contrast poisons its own stylesheet and reports whether it caught it,
       so its control is its --selftest: exit 0 means "the regression was seen". */
    neg = run(g.name, [APP, '--selftest']);
    const caught = neg.code === 0 && /SELFTEST PASS/.test(neg.out);
    if (caught) console.log(`  ok     negative (${neg.secs}s): ${lastLine(neg.out)}`);
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
  if (neg.code !== 0) console.log(`  ok     negative (${neg.secs}s): broke ${hits} site(s) of ${JSON.stringify(g.break.find).slice(0, 70)} -> exit ${neg.code}`);
  else { console.error(`::error::${g.name} stayed GREEN on an artifact where ${JSON.stringify(g.break.find)} was broken — it does not protect ${g.protects}`); bad++; }
  fs.rmSync(poisoned, { force: true });
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('');
console.log(bad ? `GATE CHROMIUM RED — ${bad} problem(s)`
                : `GATE CHROMIUM GREEN — all ${GATES.length} pass on the shipped file and all ${GATES.length} go red when what they protect is broken`);
process.exit(bad ? 1 : 0);
