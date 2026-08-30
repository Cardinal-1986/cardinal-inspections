#!/usr/bin/env node
/* gate_a11y.mjs — the ACCESSIBILITY gate. Standing, not per-build. axe-core, ratcheted.
 *
 * WHY. The sentinel scores what a screen LOOKS like — contrast, collapse,
 * overlap, a dead tap target. It cannot see what a screen MEANS: a button
 * whose only content is an SVG and therefore has no name at all, a form
 * control with no label, a heading level skipped, a landmark missing. Those
 * are the classes the emoji-to-drawn-icon sweep (686–699) created wholesale —
 * every emoji that became an inline <path> took the control's accessible name
 * with it — and nothing in this folder has ever looked for them.
 *
 * It is also the honest version of the "eslint-plugin-jsx-a11y" idea for an
 * app with no JSX and no build step: the rules are the same rules, applied to
 * the rendered document instead of to source that does not exist here.
 *
 * WHAT IT IS NOT. It is not a claim that this app is accessible, and passing
 * it does not mean a screen reader can drive the CRM. axe finds a specific,
 * mechanical subset — roughly a third of WCAG in practice, the part a machine
 * can settle. Everything it stays quiet about is unmeasured, not proven.
 *
 * THE RATCHET, and why this gate can still fail. `a11y_baseline.json` stores
 * the violation-node count PER RULE ID. A rule's count may not GROW; a fall is
 * reported, stays green, and prompts a --rebaseline so the ratchet tightens.
 * So the existing debt blocks nothing — a five-year-old markup base would
 * otherwise make the first run a wall nobody reads — while a NEW violation of
 * any rule is red the build it arrives. Counts, not sites: this app is one
 * 5 MB document whose line numbers move every build, so site-level pinning
 * would be pure churn. Same shape as gate_types.py, deliberately.
 *
 * Known blind spot, accepted and stated: a new violation appearing while
 * another of the SAME rule disappears is invisible. That is the price of zero
 * drift-churn, and it is why every serious/critical violation is PRINTED IN
 * FULL on every run rather than merely counted.
 *
 * ⚠ TWO KINDS OF RULE LIVE IN THE BASELINE, and confusing them will waste a
 * build. PER-CONTROL rules — label, select-name, button-name, image-alt, the
 * aria-* family — count defects, and a +1 on one of those is a real new defect
 * every time. STRUCTURAL rules — region, landmark-one-main, heading-order —
 * count RENDERED CONTENT: `region` is 305 nodes here because almost nothing in
 * this app sits inside a landmark, so it grows when a list grows. The seed in
 * sentinel_setup_cardinal.js is fixed, which is the only reason those counts
 * are stable at all. **Change the seed and the structural rules move without a
 * single line of app code changing.** That is a rebaseline, not a regression —
 * and it is the one case where this gate going red means nothing.
 *
 * HOW IT MODELS THE APP. The same rig the sentinel uses, for the same reason:
 * every defect worth catching lives behind the sign-in, and half of them live
 * inside a panel that does not exist until it is opened. So it reuses
 * sentinel_setup_cardinal.js + e2e_mock_supa.js verbatim (one mock, no second
 * copy to drift) and walks that file's own window.__sentinelStates.
 *
 * ⚠ TRAPS THIS GATE IS BUILT AGAINST, each already paid for elsewhere here:
 *   - BUG_CLASSES 37 — a control that CRASHES instead of reporting red. A
 *     state whose run() throws is recorded as a STATE FAILURE and the walk
 *     carries on; it never takes the run down, and it never passes silently.
 *   - A test that quietly loses coverage and stays green (the 1174 shape). The
 *     walk asserts a FLOOR of states and of axe rules evaluated: a shrunk walk
 *     is a failure, not a smaller number nobody reads.
 *   - A check that cannot fail. --selftest drives axe over one deliberately
 *     broken document and one clean one, and demands red then green. Both
 *     documents live in this file on purpose — a fixture in another file is a
 *     fixture that can drift away from the gate that reads it.
 *
 * Usage:
 *   node gate_a11y.mjs [index.html]          # gate against the baseline
 *   node gate_a11y.mjs --rebaseline          # accept current counts
 *   node gate_a11y.mjs --selftest            # prove it can fail
 *   node gate_a11y.mjs --full                # print every violation, not just serious+
 *   node gate_a11y.mjs --states home,client  # walk a subset
 * Exit: 0 green · 1 red · 2 usage / missing input / axe-core or playwright absent.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const HERE = new URL('.', import.meta.url).pathname;

let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_a11y: playwright not found'); process.exit(2); }

/* axe-core rides in the same gitignored node_modules symlink every other
   harness in this folder uses. Absent is a USAGE failure (exit 2), never a
   quiet pass — an a11y gate that reports green because its engine is missing
   is the worst thing in this file. */
let AXE_SRC;
try { AXE_SRC = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); }
catch (e) {
  console.error('gate_a11y: axe-core not installed.\n' +
                '  npm install axe-core   (into the scripts/node_modules symlink)');
  process.exit(2);
}

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : (argv[i + 1] || d); };
const SELFTEST  = argv.includes('--selftest');
const REBASE    = argv.includes('--rebaseline');
const FULL      = argv.includes('--full');
const JSON_OUT  = argv.includes('--json');
const BASELINE  = HERE + 'a11y_baseline.json';
const VIEWPORT  = (() => { const [w, h] = opt('viewport', '390x844').split('x').map(Number); return { width: w, height: h }; })();
const ONLY_STATES = opt('states', '').split(',').map(s => s.trim()).filter(Boolean);

const SETUP = opt('setup', HERE + 'sentinel_setup_cardinal.js,' + HERE + 'e2e_mock_supa.js');
const SETUP_JS = SETUP.split(',').map(s => s.trim()).filter(Boolean)
  .map(p => { if (!existsSync(p)) { console.error('gate_a11y: --setup file not found: ' + p); process.exit(2); }
              return readFileSync(p, 'utf8'); })
  .join('\n;\n');

/* Coverage floors. A walk that shrinks must be RED, not quietly smaller. */
const MIN_STATES = Number(opt('min-states', 12));
const MIN_RULES  = Number(opt('min-rules', 40));

const DEADLINE_MS = Number(opt('deadline', 0)) * 1000 || 900000;
const DEADLINE = setTimeout(() => {
  console.log('GATE A11Y TIMEOUT after ' + Math.round(DEADLINE_MS / 1000) + 's — treat as UNKNOWN, not as clean');
  process.exit(2);
}, DEADLINE_MS);

/* ── the rig ───────────────────────────────────────────────────────────────
   Identical to the sentinel's, and identical on purpose: a 1x1 PNG for every
   image (an empty body collapses every <img> and axe then scores a page that
   does not exist), everything else fulfilled empty so no network is needed. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function axeOver(browser, html, setupJs, stateFilter) {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  const out = { counts: {}, sites: [], states: 0, attempted: 0, rules: 0, stateFails: [] };
  await page.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('https://gate-a11y.test/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u) || /image/i.test(r.request().headers().accept || ''))
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    return r.fulfill({ status: 200, body: '' });
  });
  if (setupJs) await page.addInitScript(setupJs);
  try {
    await page.goto('https://gate-a11y.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
  } catch (e) {
    out.stateFails.push('could not load: ' + e.message);
    await ctx.close();
    return out;
  }
  await page.addScriptTag({ content: AXE_SRC });

  let names = await page.evaluate(`(window.__sentinelStates || []).map(s => s.name)`).catch(() => []);
  if (stateFilter && stateFilter.length) names = names.filter(n => stateFilter.includes(n));
  const states = names.length ? names : [null];
  out.attempted = states.length;

  for (let si = 0; si < states.length; si++) {
    if (states[si] !== null) {
      /* class 37: a state that throws is a recorded FAILURE, never a crash
         and never a silent skip. */
      try {
        const idx = await page.evaluate(
          `(window.__sentinelStates || []).findIndex(s => s.name === ${JSON.stringify(states[si])})`);
        await page.evaluate(`Promise.resolve(window.__sentinelStates[${idx}].run())`);
        await page.waitForTimeout(350);
      } catch (e) {
        out.stateFails.push(`state "${states[si]}" threw: ` + String(e.message).split('\n')[0]);
        continue;
      }
    }
    let res;
    try {
      res = await page.evaluate(`axe.run(document, {
        resultTypes: ['violations'],
        rules: { 'color-contrast': { enabled: false } }
      }).then(r => ({
        rules: r.violations.length + r.inapplicable.length + r.incomplete.length,
        v: r.violations.map(x => ({
          id: x.id, impact: x.impact, help: x.help, n: x.nodes.length,
          sample: (x.nodes[0] && x.nodes[0].target && String(x.nodes[0].target[0]) || '').slice(0, 90)
        }))
      }))`);
    } catch (e) {
      out.stateFails.push(`axe threw on "${states[si]}": ` + String(e.message).split('\n')[0]);
      continue;
    }
    out.states++;
    out.rules = Math.max(out.rules, res.rules);
    for (const v of res.v) {
      out.counts[v.id] = (out.counts[v.id] || 0) + v.n;
      out.sites.push({ state: states[si] || '(default)', ...v });
    }
  }
  await ctx.close();
  return out;
}

/* ⚠ color-contrast is DISABLED above, and that is a decision, not an
   oversight. The sentinel's INK check already scores every ink on this app
   against its COMPOSITED ground — including gradient stops, which axe cannot
   see and which this project has been burned by twice (the two rig traps in
   CLAUDE.md). Two instruments answering the same question in different
   numbers is how a real failure gets argued about instead of fixed. INK owns
   contrast here; this gate owns names, roles, labels and structure. */

/* THE RATCHET ITSELF, in one place, so the selftest can exercise the SHIPPED
   comparison rather than a re-implementation of it. A selftest that re-writes
   the logic it is testing proves only that two of your own guesses agree. */
function grownRules(counts, base) {
  return Object.keys(counts).filter(id => counts[id] > (base[id] || 0));
}

/* ── selftest: prove it fires, and prove it stays quiet ──────────────────── */
const DIRTY = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>dirty</title></head>
<body>
  <img src="/x.png">
  <button><svg width="20" height="20"><path d="M0 0h20v20H0z"/></svg></button>
  <input type="text">
  <div role="checkbox"></div>
</body></html>`;
const CLEAN = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>clean</title></head>
<body>
  <main>
    <h1>Clean</h1>
    <img src="/x.png" alt="a square">
    <button aria-label="Close">x</button>
    <label for="n">Name</label><input id="n" type="text">
  </main>
</body></html>`;

async function selftest(browser) {
  const bad = [];
  const dirty = await axeOver(browser, DIRTY, '', null);
  const clean = await axeOver(browser, CLEAN, '', null);
  const dn = Object.keys(dirty.counts).length;
  const cn = Object.keys(clean.counts).length;
  if (dn === 0) bad.push('the broken document produced NO violations — axe did not run, or the rules are off');
  for (const want of ['image-alt', 'button-name', 'label']) {
    if (!dirty.counts[want]) bad.push(`the broken document did not trip ${want} (got: ${Object.keys(dirty.counts).join(', ') || 'nothing'})`);
  }
  if (cn !== 0) bad.push('the CLEAN document produced violations — the gate cries wolf: ' + Object.keys(clean.counts).join(', '));
  /* A ratchet that cannot go red is not a ratchet — and one that cannot stay
     green is a ratchet nobody keeps. Both directions, through the same
     function the gate itself runs on. */
  if (grownRules(dirty.counts, {}).length === 0)
    bad.push('growth past an EMPTY baseline did not read as RED — the ratchet cannot fire');
  if (grownRules(dirty.counts, dirty.counts).length !== 0)
    bad.push('a walk identical to its own baseline read as RED — the ratchet cannot stay quiet');
  if (grownRules({ 'image-alt': 2 }, { 'image-alt': 1 }).length !== 1)
    bad.push('a rule going 1 -> 2 did not read as growth');
  for (const b of bad) console.log('  MISSORTED ' + b);
  console.log(`SELFTEST ${bad.length ? 'FAIL' : 'PASS'} — broken doc: ${dn} rule(s) ${Object.keys(dirty.counts).join(', ')} · clean doc: ${cn}`);
  return bad.length ? 1 : 0;
}

/* ── main ──────────────────────────────────────────────────────────────── */
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());

if (SELFTEST) {
  const rc = await selftest(browser);
  await browser.close(); clearTimeout(DEADLINE); process.exit(rc);
}

const paths = argv.filter(a => !a.startsWith('--'));
const TARGET = paths[0] || (HERE + '../../../../index.html');
if (!existsSync(TARGET)) { console.error('gate_a11y: no such file ' + TARGET); process.exit(2); }

const res = await axeOver(browser, readFileSync(TARGET, 'utf8'), SETUP_JS, ONLY_STATES);
await browser.close();

/* Coverage first. A run that walked four screens and found nothing is not a
   green run, it is an incomplete one, and it must not read like success. */
const coverageBad = [];
if (!ONLY_STATES.length && res.states < MIN_STATES)
  coverageBad.push(`only ${res.states} of ${res.attempted} state(s) walked (floor ${MIN_STATES}) — the walk shrank or the setup broke`);
if (res.rules < MIN_RULES)
  coverageBad.push(`axe evaluated only ${res.rules} rule(s) (floor ${MIN_RULES}) — the engine did not fully run`);
for (const f of res.stateFails) coverageBad.push(f);

const total = Object.values(res.counts).reduce((a, b) => a + b, 0);
const ids = Object.keys(res.counts).sort();

if (JSON_OUT) console.log(JSON.stringify({ counts: res.counts, sites: res.sites, states: res.states }, null, 2));

/* Serious and critical are printed IN FULL every run — the ratchet only
   watches for growth, so a standing violation would otherwise never be seen
   again after the build that baselined it. */
const loud = res.sites.filter(s => FULL || s.impact === 'serious' || s.impact === 'critical');
if (loud.length) {
  console.log(FULL ? 'every violation:' : 'serious/critical violations (read them, do not just count them):');
  const seen = new Set();
  for (const s of loud) {
    const k = s.id + '|' + s.sample;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`    [${s.impact}] ${s.id} x${s.n} — ${s.help}`);
    console.log(`        ${s.state}: ${s.sample}`);
  }
}

let base = {};
if (existsSync(BASELINE)) { try { base = JSON.parse(readFileSync(BASELINE, 'utf8')).counts || {}; } catch (e) {} }

if (REBASE) {
  if (coverageBad.length) {
    for (const c of coverageBad) console.log('  COVERAGE ' + c);
    console.log('gate_a11y: REFUSING to rebaseline an incomplete walk — fix the coverage first');
    clearTimeout(DEADLINE); process.exit(2);
  }
  writeFileSync(BASELINE, JSON.stringify({
    note: 'axe-core violation NODES per rule id. A rule may not grow. See gate_a11y.mjs.',
    axe: require('axe-core/package.json').version,
    states: res.states, counts: res.counts,
  }, null, 2) + '\n');
  console.log(`baseline written: ${total} violation node(s) across ${ids.length} rule(s) over ${res.states} state(s)`);
  console.log('  ' + ids.map(i => `${i} x${res.counts[i]}`).join(', '));
  clearTimeout(DEADLINE); process.exit(0);
}

let red = coverageBad.length > 0;
for (const c of coverageBad) console.log('  COVERAGE ' + c);
let fell = 0;
const grownIds = grownRules(res.counts, base);
for (const id of grownIds) {
  const b = base[id] || 0;
  console.log(`  RED  ${id}: baseline ${b}, now ${res.counts[id]} (+${res.counts[id] - b})`);
  red = true;
}
const grew = grownIds.length;
for (const id of Object.keys(base)) {
  const now = res.counts[id] || 0;
  if (now < base[id]) { console.log(`  better: ${id} ${base[id]} -> ${now} (--rebaseline to lock in)`); fell++; }
}

console.log(`${total} violation node(s) across ${ids.length} rule(s) · ${res.states} state(s) · ${grew} rule(s) grew · ${fell} improved`);
if (!existsSync(BASELINE)) console.log('gate_a11y: NO BASELINE YET — run --rebaseline to record the current debt');
console.log(red ? 'GATE A11Y RED — a rule gained violations; fix them or --rebaseline WITH A REASON' : 'GATE A11Y GREEN');
clearTimeout(DEADLINE);
process.exit(red ? 1 : 0);
