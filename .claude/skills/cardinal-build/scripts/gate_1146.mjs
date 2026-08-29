/* gate_1146 — the estimate-line description box must never trap text.
 *
 * Built from the SHIPPED artefact, not a re-implementation: the `.desc-input`
 * CSS rule and the autosize function are extracted from the file under test at
 * run time, so if either drifts this gate drifts with it.
 *
 * The bug: two autosize pipelines disagreed. autosizeDesc (1135) grew the box
 * to fit; autoGrow capped it at 600px and ran LAST, so the cap won. With
 * overflow:hidden on .desc-input the surplus was unreachable by wheel OR touch
 * — 598px of box over 828px of content, 28% of a real scope with no gesture
 * that could reach it. Only the caret could move it.
 *
 * Point it at the previous build as a negative control:
 *     node gate_1146.mjs <path-to-1145-index.html>     -> must go RED
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const FILE = process.argv[2] || '../../../../index.html';
const SRC  = readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const RULE = (SRC.match(/\.cr-est-lineitem \.desc-input\{[^}]*\}/) || [''])[0];
const grab = n => { const i = SRC.indexOf('function ' + n + '(');
  return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n}', i) + 2); };
const autosize = grab('autosizeDesc');
const autogrow = grab('autoGrow');

/* 1. structural: ONE pipeline, and the cap is gone */
ok(!!RULE, '.desc-input rule found in the artifact');
ok(!!autosize, 'autosizeDesc() found in the artifact');
ok(autogrow === '', 'autoGrow() is gone — one pipeline, not two'
   + (autogrow ? ' (still present)' : ''));
/* the cap is what made the text unreachable; assert on the CONTRACT (no 600px
   ceiling anywhere in the surviving sizer) rather than on one line's spelling */
ok(!/Math\.min\s*\(\s*600/.test(autosize), 'the surviving sizer has no 600px ceiling');
ok(/offsetHeight\s*-\s*\w*\.?clientHeight|scrollHeight\s*\+\s*bord/.test(autosize),
   'and it compensates for the border box (measured, not hardcoded)');

/* 2. behavioural: the real question — can a person reach the whole scope? */
const SCOPE = Array.from({ length: 26 }, (_, i) =>
  'Line ' + (i + 1) + ' of a real scope of work: strip existing asphalt shingles, '
  + 'step flashing and underlayment 2-3 feet back around the skylight curb.').join('\n\n');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.setContent(`<!doctype html><meta name=viewport content="width=device-width">
<style>body{margin:0}.cr-est-lineitem{background:#fff;padding:12px 14px}
${RULE}</style>
<div class="cr-est-lineitem"><textarea class="desc-input"></textarea></div>
<script>${autosize}${autogrow}
window.__size = function(t){ var ta=document.querySelector('.desc-input'); ta.value=t;
  autosizeDesc(ta); if(typeof autoGrow==='function') autoGrow(ta); return ta; };
</script>`);

const m = await p.evaluate(t => {
  const ta = window.__size(t);
  return { h: ta.clientHeight, sh: ta.scrollHeight, hidden: ta.scrollHeight - ta.clientHeight,
           overflow: getComputedStyle(ta).overflowY };
}, SCOPE);

console.log(`        box ${m.h}px · content ${m.sh}px · unreachable ${m.hidden}px · overflow-y ${m.overflow}`);
ok(m.sh > 600, 'the test scope really is longer than the old 600px cap (' + m.sh + 'px)');
ok(m.hidden <= 1, 'NOTHING is clipped — the box fits its own content'
   + (m.hidden > 1 ? ' (' + m.hidden + 'px unreachable, ' + Math.round(m.hidden/m.sh*100) + '% of the scope)' : ''));

/* and prove it the way a person would: if anything IS hidden, can they get to it? */
if (m.hidden > 1) {
  await p.hover('.desc-input');
  await p.mouse.wheel(0, 400);
  await p.waitForTimeout(200);
  const st = await p.evaluate(() => document.querySelector('.desc-input').scrollTop);
  ok(st > 0, 'clipped text is at least reachable by a wheel (scrollTop ' + st + ')');
} else {
  ok(true, '  · so there is no inner scroll region to get stuck in at all');
}

/* 3. the resize re-measure — without it a rotation clips it again */
await p.setViewportSize({ width: 300, height: 844 });
await p.waitForTimeout(400);
const after = await p.evaluate(() => { const ta = document.querySelector('.desc-input');
  /* the app re-measures on resize; emulate that single call */
  autosizeDesc(ta); return ta.scrollHeight - ta.clientHeight; });
ok(after <= 1, 'still nothing clipped after a narrower viewport re-wraps the text');
/* ⚠ This first read `/addEventListener\('resize'/ && /autosizeDescs/` over the
   WHOLE file and PASSED on the 1145 control, which has no such wiring at all —
   both strings exist independently in 5 MB of source. A check that cannot fail
   (BUG_CLASSES 81). Scope it: the resize handler must itself reach the sizer,
   within one handler body, not merely coexist with it somewhere in the file. */
const wired = [...SRC.matchAll(/addEventListener\('resize'[\s\S]{0,400}?\}\s*\)/g)]
  .some(x => /autosizeDescs/.test(x[0]));
ok(wired, 'a resize handler actually calls autosizeDescs (a grow-to-fit box is sized for one width)');

await b.close();
console.log(fail ? `\nRED — ${fail} failed, ${pass} passed` : `\nGREEN — all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
