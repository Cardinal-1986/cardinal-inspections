/* sentinel — the standing check. Runs on EVERY build, on any artifact.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 *
 * This project has ~200 gate scripts and 45 documented bug classes. Almost
 * every one of those gates was written for one build, run twice, and never
 * run again; almost every one of those classes was closed by writing a
 * paragraph. So the same shapes keep coming back — and they come back
 * looking like new bugs, which is what makes them expensive.
 *
 * Theo, 15 Aug 2026: "Can't you make a countermeasure to having to fix things
 * more than twice and knowing it is an error?"
 *
 * This is it. Every check below maps to a class that has ALREADY bitten this
 * project more than twice, and every one of them is a thing a real browser
 * can answer and a human cannot reliably see. Nothing here is a style
 * opinion. Each check is arithmetic or geometry.
 *
 * THE RULE THAT KEEPS IT ALIVE: when a class recurs, it does not get another
 * paragraph — it gets a check in here, or we write down that no mechanical
 * check is possible and why. A class with neither is an open wound.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IT CHECKS, AND WHAT EACH ONE ALREADY COST
 *
 *   INK       text below the contrast floor, scored against the ground the
 *             browser actually composites.  Builds 448, 487, 527, 557, 573,
 *             630, 681 — SEVEN times, every one reported by Theo as "can't
 *             read this", every one invisible to the build gates.
 *
 *   COLLAPSE  a box materially shorter than its own image.  Builds 814 and
 *             816/817, in opposite directions, from the same cause:
 *             aspect-ratio on a grid item does not size the implicit row.
 *             A 362x14 tile holding a 358x168 photograph.
 *
 *   OVERLAP   two siblings whose boxes intersect.  Builds 588/590 (the ⤢/After
 *             collision, found by a screenshot), 814 (tile 1 spanned y 86-255
 *             while tile 7 began at 163).
 *
 *   OVERFLOW  the body scrolls sideways.  Checked per-feature in a dozen
 *             disposable harnesses and in none of them permanently.
 *
 *   DEAD      a CSS rule that parses, balances, and never wins.  Build 481
 *             (.lb-ccfile button.ghost, out-specified by #rlLibPanel) and
 *             build 817 (the mobile .cctile height, lost on source order).
 *             Brace balance, duplicate-id, node --check, marker and negative
 *             control were ALL GREEN both times.
 *
 *   UNWIRED   a control that renders and does nothing.  BUG_CLASSES 16 — the
 *             Studio Archive button was dead from build 614 to 632, drawn on
 *             screen the whole time.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE MEASURING-RIG TRAPS THIS AVOIDS, ALL OF WHICH ALREADY COST A BUILD
 *
 *   1. Concatenating the <style> blocks is NOT the app's CSS. Several are
 *      print stylesheets inside template strings that set :root{--ink:#1b1b1b}
 *      for an 11pt document. Glue them together and a contract template
 *      restyles the app — a rig once scored an invisible heading at 17.61:1.
 *      So: load the real document and let the browser decide.
 *
 *   2. backgroundColor is not the background. Cards here paint gradients,
 *      which are background-IMAGES, so an ancestor walk reading only
 *      backgroundColor sails straight past the card. Every stop counts, and
 *      the score is against the WORST of them.
 *
 *   3. Within one element the background-image composites over THAT element's
 *      own background-color, not its ancestor's. Getting this wrong reads a
 *      dark card's semi-transparent wash as near-white.
 *
 *   4. In modern Chromium every CSSStyleRule exposes an empty .cssRules for
 *      CSS nesting. `if (r.cssRules) { descend; continue; }` therefore skips
 *      every style rule without examining it and reports a clean zero.
 *      Examine the rule, THEN descend.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *   node sentinel.js <file.html>
 *   node sentinel.js <file.html> --themes default,rb-light
 *   node sentinel.js <file.html> --viewports 390x844,1194x834,1440x900
 *   node sentinel.js <file.html> --only INK,DEAD
 *   node sentinel.js <file.html> --json                 machine-readable
 *   node sentinel.js <file.html> --setup <script.js>    page prep (sign-in stub)
 *   node sentinel.js <file.html> --since <prev.html>    what THIS build broke
 *   node sentinel.js <file.html> --since <prev> --all   plus the carried debt
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STATES — a checker that only sees the first screen only checks the first
 * screen. Both of tonight's layout defects lived inside a picker that does
 * not exist until it is opened, and a sweep of the landing page would have
 * reported CLEAN through both of them.
 *
 * The --setup file may declare states, each a page-side function that walks
 * the app somewhere. The sentinel probes after every one:
 *
 *   window.__sentinelStates = [
 *     { name: 'picker', run: async () => { document.getElementById('x').click();
 *                                          await new Promise(r => setTimeout(r, 400)); } },
 *   ];
 *
 * A state that throws is reported, not swallowed — a state that silently
 * failed to open would report the landing page as if it were the picker,
 * which is the same lie as a control that crashes and prints nothing.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * --since IS THE FLAG THAT MAKES THIS SURVIVE
 *
 * A checker that reports the same forty pre-existing findings every build is
 * a checker that gets muted by the third build, and a muted checker is worse
 * than none — it costs the same and catches nothing. --since renders the
 * PREVIOUS artifact through the identical probe and subtracts what was
 * already there, so the report is what changed under your hands.
 *
 * It is also the only honest way to separate two things that look identical
 * to a rule-by-rule check: build 481's newly-written .lb-ccfile button.ghost,
 * which never won a single time and was a real bug — from a base rule that a
 * deliberately more specific rule has overridden since 2024, which is just
 * how the cascade works. Specificity cannot tell them apart. Age can.
 *
 * The carried findings are never silently dropped: the summary always says
 * how many there were, and --all prints them. Hiding debt is how debt grows.
 *
 * Exit 0 clean, 1 with findings, 2 if it could not run — which is NOT the
 * same as clean and must never be read as green.                            */

import { readFileSync, existsSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('sentinel: playwright not found'); process.exit(2); }

/* ── arguments ─────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
function opt(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i === -1 ? dflt : (argv[i + 1] || dflt);
}
const JSON_OUT  = argv.includes('--json');
const VIEWPORTS = opt('viewports', '390x844,1194x834,1440x900,2000x1100')
  .split(',').map(s => { const [w, h] = s.split('x').map(Number); return { w, h }; });
const THEMES = opt('themes', 'default').split(',').map(s => s.trim()).filter(Boolean);
const ONLY   = opt('only', '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
const SETUP  = opt('setup', '');
const SINCE  = opt('since', '');
let   ALL    = argv.includes('--all');

/* --selftest points the sentinel at a page carrying ONE deliberate instance
   of every defect it claims to catch, and fails if any check stays quiet.

   This is not ceremony. TWO of these checks were incapable of firing when
   first written and looked perfectly reasonable in the source: COLLAPSE
   exempted overflow:hidden (so it slept through build 816, the exact bug it
   was written for), and DEAD descended into non-matching @media blocks (so
   it reported build 817's FIX as the defect). Silence from an instrument
   that has never been seen to speak is not evidence of anything. */
const SELFTEST = argv.includes('--selftest');
const EXPECT = ['INK', 'COLLAPSE', 'OVERLAP', 'OVERFLOW', 'DEAD', 'OVERRIDDEN', 'FLOOR', 'CONTAIN', 'UNWIRED', 'DEADTAP', 'DUPE', 'BOOK', 'CONSOLE', 'XSS'];
const on = id => !ONLY.length || ONLY.includes(id);

if (SINCE && !existsSync(SINCE)) {
  console.error('sentinel: --since file not found: ' + SINCE);
  process.exit(2);
}

const TARGET = SELFTEST
  ? new URL('./sentinel_selftest.html', import.meta.url).pathname
  : FILE;
if (SELFTEST) ALL = true;

if (!TARGET || !existsSync(TARGET)) {
  console.error('sentinel: usage: node sentinel.js <file.html> [--themes …] [--viewports …]');
  process.exit(2);
}

/* A hard deadline. A sentinel that hangs reads as a sentinel that passed,
   which is the worst failure mode a gate can have.

   ⚠ 993: this was a FLAT 240s, and ten new states walked straight through it.
   The walk grew 16 states -> 26 when the hidden-scrollbar surfaces were finally
   given openers, and a single-viewport sweep then reported SENTINEL TIMEOUT.
   That is not a false pass — but a standing gate that always answers UNKNOWN
   is a gate nobody runs, so the next person to add a state would have retired
   the instrument without noticing.

   Budgeted per RENDER (one state, one viewport, one theme; --since doubles it,
   because the previous artifact is swept through the identical probe). The
   per-render allowance is deliberately generous: the probe walks every element
   on a 5 MB page for INK, DEAD and CLIPPED, so a slow render is the normal case
   here rather than the alarming one. A genuine hang still trips this — later,
   and against a number that says what it was waiting for. --deadline <seconds>
   overrides. */
const budgetRenders = () => {
  let states = 1;
  try {
    for (const f of SETUP.split(',').map(x => x.trim()).filter(Boolean)) {
      if (!existsSync(f)) continue;
      const m = readFileSync(f, 'utf8').match(/\{\s*name\s*:\s*['"]/g);
      if (m && m.length > states) states = m.length;
    }
  } catch (e) {}
  return states * VIEWPORTS.length * THEMES.length * (SINCE ? 2 : 1);
};
const RENDERS     = budgetRenders();
const DEADLINE_MS = Number(opt('deadline', 0)) * 1000 || Math.max(240000, 60000 + RENDERS * 14000);
const DEADLINE = setTimeout(() => {
  console.log('SENTINEL TIMEOUT after ' + Math.round(DEADLINE_MS / 1000) + 's ' +
              '(budgeted for ' + RENDERS + ' render(s)) — treat as UNKNOWN, not as clean');
  process.exit(2);
}, DEADLINE_MS);

const findings = [];
let attempted = 0;          /* renders the sweep TRIED — see the coverage note in sweep() */
const add = f => findings.push(f);

/* What --since compares, and what the report PRINTS, are deliberately not the
   same string. A finding's detail quotes live page text, and text changes: an
   elapsed clock reads "38s" one build and "9m 1s" the next. Keyed on the
   printed line, a standing defect looks new every time the number ticks — and
   a genuinely new defect on that element becomes impossible to see among the
   ticking. So a check that quotes content supplies its own `key`, built from
   what identifies the DEFECT rather than what the element happens to say. */
const keyOf = f => f.id + '|' + (f.key || f.detail);

/* ── the page-side probe ───────────────────────────────────────────────────
   Everything below runs INSIDE the browser, against the real composited
   page. It is one function so the traps documented above are solved once. */
const PROBE = readFileSync(new URL('./sentinel_probe.js', import.meta.url), 'utf8')
  + '\n;__sentinelProbe()'

/* ── run it ────────────────────────────────────────────────────────────── */
const APP = readFileSync(TARGET, 'utf8');
/* --setup takes a COMMA-SEPARATED list, concatenated in order. The CRM needs
   two: the shared supabase mock (e2e_mock_supa.js, used by every other gate
   in this folder) and the app-specific seed + states. One file would have
   meant a second copy of the mock, and a second copy is a copy that drifts. */
const SETUP_JS = SETUP.split(',').map(s => s.trim()).filter(Boolean)
  .map(p => { if (!existsSync(p)) { console.error('sentinel: --setup file not found: ' + p); process.exit(2); }
              return readFileSync(p, 'utf8'); })
  .join('\n;\n');

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());

/* One sweep over one artifact. --since runs this a second time against the
   previous build through the IDENTICAL probe — same viewports, same themes,
   same setup — because a comparison between two different instruments is not
   a comparison at all. */
/* ⚠ `base` IS NOT OPTIONAL DECORATION — it is what lets this instrument see an
   app whose code is not inline. Until 31 Aug every URL under sentinel.test was
   answered with the artifact HTML, so a page loading <script src="/x.js"> got
   the DOCUMENT back and died on `SyntaxError: Unexpected token '<'`. Cardinal's
   index.html has no external scripts, so nothing ever noticed; the Showroom is
   four files and the sentinel could not see three of them.

   Same blind spot check_external_scripts.mjs was written for, in a second
   instrument. `base` is the directory of the artifact BEING SWEPT — which is
   not always TARGET's, because --since sweeps a different file that may live in
   a different tree. */
async function sweep(HTML, findings, base) {
  const add = f => findings.push(f);
  /* What actually came off disk, so a sweep can say whether it saw the whole app
     or only its shell. Silence here is the failure mode this fix exists for. */
  const served = new Set();
  let ran = 0;
  for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
    /* console.error from APP CODE fails the render. The rig itself aborts
       images, fonts and api calls, and every abort logs a resource error —
       that is the mock's own doing, filtered so the trap cannot cry wolf on
       its own harness. Unfilterable in the selftest, so only the firing
       direction is fixtured there; the filter is proven by every clean sweep
       over the real artifact, whose rig aborts hundreds of loads. */
    const cerrs = [];
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/Failed to load resource|net::ERR|ERR_FAILED|status of \d+|CORS|Access-Control|unknown error occurred when fetching the script|ServiceWorker|serviceworker/i.test(t)) return;
      /* the line above grew on the hostile sweep's first run: the rig aborts
         sw.js, and its registration failure logs a load error in different
         words. Same class — the mock's own abort, not app code. */
      cerrs.push(t.split('\n')[0].slice(0, 160));
    });
    await page.route('**/*', async r => {
      const u = r.request().url();
      if (u.startsWith('https://sentinel.test/')) {
        const rel = decodeURIComponent(new URL(u).pathname).replace(/^\/+/, '').split('?')[0];
        /* The document itself. Anything else is a sibling file to look up. */
        if (rel && base) {
          /* ⚠ Refuse to climb out of the artifact's directory. A page asking for
             ../../etc/passwd is not a page this rig should answer. resolve()
             first — NOT normalize(): `base` comes from dirname(TARGET), so a
             relative `index.html` gives base `.`, and `'showcase.js'` does not
             start with `'./'`, so the guard rejected every sibling and the
             sweep silently went back to serving the document. Found within the
             hour, by the RIG check below — which is the whole reason it prints
             the base directory it looked in. */
          const abs = resolve(base, rel);
          if ((abs === base || abs.startsWith(base + '/')) && existsSync(abs)) {
            let st = null; try { st = statSync(abs); } catch (_) {}
            if (st && st.isFile()) {
              const ct = /\.m?js$/.test(abs)  ? 'text/javascript; charset=utf-8'
                       : /\.css$/.test(abs)   ? 'text/css; charset=utf-8'
                       : /\.json$/.test(abs)  ? 'application/json; charset=utf-8'
                       : /\.html?$/.test(abs) ? 'text/html; charset=utf-8'
                       : 'text/plain; charset=utf-8';
              served.add(rel);
              return r.fulfill({ status: 200, contentType: ct, body: readFileSync(abs) });
            }
          }
        }
        return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
      }
      /* A 1x1 PNG for every image so a lazy or signed photograph still
         produces a real box. An empty body makes every <img> collapse to
         zero and COLLAPSE would then fire on the whole page. */
      if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u) || /image/i.test(r.request().headers().accept || ''))
        return r.fulfill({ status: 200, contentType: 'image/png',
          body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
      return r.fulfill({ status: 200, body: '' });
    });
    /* ⚠ The theme script goes FIRST so setup files can read window.__sentinelTheme.
       And it must not touch document.documentElement directly at init time:
       documentElement is NULL when init scripts run in this Chromium, so the old
       one-liner THREW, the attribute never landed, and every --themes rb-light
       render of the CRM silently swept the DARK theme under a light label —
       doubly so for index.html, whose cr-rbtheme-toggle-script strips a bare
       data-theme at boot unless ITS OWN localStorage key says light (found
       23 Aug 2026, manual-estimates audit; the CRM translation lives in
       sentinel_setup_cardinal.js). */
    if (theme !== 'default')
      await page.addInitScript(
        `window.__sentinelTheme = ${JSON.stringify(theme)};` +
        `(function put(){` +
        `  var r = document.documentElement;` +
        `  if (r) { r.setAttribute('data-theme', ${JSON.stringify(theme)}); return; }` +
        `  new MutationObserver(function(_, o){` +
        `    if (document.documentElement) { o.disconnect(); put(); }` +
        `  }).observe(document, { childList: true });` +
        `})();`);
    if (SETUP_JS) await page.addInitScript(SETUP_JS);
    try {
      await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
    } catch (e) {
      add({ id: 'RUN', where: theme + ' ' + vp.w + 'px', detail: 'could not load: ' + e.message });
      await ctx.close(); continue;
    }

    const stateNames = await page.evaluate(
      `(window.__sentinelStates || []).map(s => s.name)`).catch(() => []);
    const states = stateNames.length ? stateNames : [null];
    /* ⚠ COVERAGE. `ran` counts renders that COMPLETED; a state whose run()
       throws is skipped without incrementing it. Reporting only `ran` means a
       sweep that silently lost four screens prints the same shape as one that
       walked them all — "63 render(s)" reads as success, not as 63 of 75.
       Count what was ATTEMPTED too, and print both. (Found the hard way at
       1081: a mis-ordered --setup emptied the store, four states threw, and
       the run reported CLEAN.) */
    attempted += states.length;

    for (let si = 0; si < states.length; si++) {
    if (states[si] !== null) {
      try {
        await page.evaluate(`Promise.resolve(window.__sentinelStates[${si}].run())`);
        await page.waitForTimeout(350);
      } catch (e) {
        add({ id: 'RUN', where: theme + ' ' + vp.w + 'px',
              detail: `state "${states[si]}" threw: ` + String(e.message).split('\n')[0] });
        continue;
      }
    }

    let res;
    try { res = await page.evaluate(PROBE); }
    catch (e) {
      add({ id: 'RUN', where: theme + ' ' + vp.w + 'px', detail: 'probe threw: ' + String(e.message).split('\n')[0] });
      continue;
    }
    ran++;
    const at = (theme === 'default' ? '' : theme + ' ') + vp.w + 'px'
             + (states[si] ? ' ' + states[si] : '');

    /* ⚠ `key` is what --since compares; `detail` is only what it PRINTS.
       They must differ, and learning that took one build. An INK finding's
       detail quotes the element's text, and text changes — a live elapsed
       clock reads "38s" on one build and "9m 1s" on the next. Keyed on the
       printed string, the same standing defect reads as brand new every time
       the number ticks, and worse, a genuinely new defect on that element
       becomes impossible to distinguish from the ticking. Key on what
       identifies the DEFECT — element, colours, floor — never on content. */
    /* ⚠ EVERY CAP BELOW USED TO BE SILENT — the instrument breaking the
       project's own no-silent-caps rule. A render with 30 INK failures
       printed 25 and dropped five with no trace, and because the number that
       vanished made the sweep SMALLER it read as progress rather than as an
       incomplete run. The bound stays (one broken screen must not flood a
       sweep); losing findings to it is now itself a finding.
       Not gated on on() — every caller is already gated, and a truncation
       notice you can filter away is the bug again. */
    const capped = (list, n, id) => {
      const arr = list || [];
      if (arr.length > n)
        add({ id: 'TRUNCATED', where: at, key: `${id}|${at}`,
              detail: `${id}: ${arr.length} findings on this render, only ${n} listed`
                    + ` \u2014 ${arr.length - n} NOT shown` });
      return arr.slice(0, n);
    };

    if (on('INK'))
      for (const f of capped(res.ink, 25, 'INK'))
        add({ id: 'INK', where: at,
              key: `${f.el}|${f.fg}|${f.bg}|${f.floor}`,
              detail: `${f.ratio}:1 (floor ${f.floor}) ${f.el} "${f.text}" ${f.fg} on ${f.bg}` });

    if (on('COLLAPSE'))
      for (const f of capped(res.collapse, 15, 'COLLAPSE'))
        add({ id: 'COLLAPSE', where: at, detail: `${f.el} is ${f.box} but holds ${f.child} at ${f.childBox}` });

    if (on('OVERLAP'))
      for (const f of capped(res.overlap, 15, 'OVERLAP'))
        add({ id: 'OVERLAP', where: at, detail: `${f.a} and ${f.b} overlap ${f.pct}% inside ${f.container}` });

    if (on('OVERFLOW') && res.overflow > 1)
      add({ id: 'OVERFLOW', where: at, detail: `the body scrolls ${res.overflow}px sideways` });

    /* Two different things wear the same face, and only one is a defect.
       DEAD       — beaten by something NO MORE SPECIFIC than itself. That is
                    a source-order accident and is wrong every time. Build 817.
       OVERRIDDEN — beaten by something deliberately more specific. Normal
                    cascade, and noise on its own — but a rule you wrote in
                    THIS build that never once wins is build 481, so it is
                    still collected and --since decides whether it matters. */
    if (on('DEAD'))
      for (const f of capped(res.dead, 20, 'DEAD'))
        /* ⚠ 26 Aug 2026 (build 1076) — THIS HAD NO KEY, so it fell back to the
           detail string, and the detail carries `f.matched`. Add one element to
           a class and every standing finding on that class is re-keyed and
           reported as NEW: build 1076 added a fifteenth .jabox to the Job Menu
           and five findings that have been true since the tile set was written
           came back as five regressions of that build.

           That is the trap the note twenty lines above already names — "key on
           what identifies the DEFECT, never on content" — and the count IS
           content. The selector, property and declared value identify it; how
           many elements happen to match today does not. */
        add({ id: f.outranked ? 'OVERRIDDEN' : 'DEAD', where: at,
              key: `${f.selector}|${f.prop}|${f.declared}`,
              detail: `${f.selector} { ${f.prop}: ${f.declared} } never wins on any of the ${f.matched} element(s) it matches` });

    /* FLOOR — the touch-target floor beaten by a module's own min-*. To
       OVERRIDDEN this is the cascade working, which is exactly why it has
       its own id: the cr-touch44-styles sheet is the one place where losing
       to higher specificity IS the defect (the #payView shape, build 944). */
    if (on('FLOOR'))
      for (const f of capped(res.floor, 20, 'FLOOR'))
        add({ id: 'FLOOR', where: at,
              key: `${f.selector}|${f.prop}|${f.el}`,
              detail: `${f.selector} floors ${f.prop}:44px but ${f.el} computes ${f.computed}px${f.winner ? ' — beaten by ' + f.winner : ''}` });

    if (on('CONTAIN') && (res.contain || []).length)
      for (const f of capped(res.contain, 20, 'CONTAIN'))
        add({ id: 'CONTAIN', where: at,
              key: `${f.el}|${f.behavior}`,
              detail: `${f.el} sets overscroll-behavior ${f.behavior} but has no scrollport (overflow ${f.overflow}) — on iOS this can swallow the swipe` });

    /* 989: CLIPPED — a hidden-scrollbar scroller that is overflowing RIGHT NOW.
       Distinct from OVERFLOW, which watches the page: a strip like this scrolls
       INSTEAD of breaking the page, so the document width never moves and
       OVERFLOW cannot see it. .cr-cth-tabs (984) was the first of 30 such
       scrollers anyone measured, and it was hiding a tab. */
    if (on('CLIPPED') && (res.clipped || []).length)
      for (const f of capped(res.clipped, 20, 'CLIPPED'))
        add({ id: 'CLIPPED', where: at,
              key: `${f.el}`,
              detail: `${f.el} hides ${f.over}px with no scrollbar (${f.bar})` +
                      (f.hidden && f.hidden.length ? ` — off the edge: ${f.hidden.join(', ')}` : '') });

    /* DEADTAP — BUG_CLASSES 71: styles as pressable, computes
       pointer-events:none. The 1164 header title, found by Theo's finger. */
    if (on('DEADTAP') && (res.deadtap || []).length)
      for (const f of capped(res.deadtap, 20, 'DEADTAP'))
        add({ id: 'DEADTAP', where: at, key: `${f.el}|${f.reason}`,
              detail: `${f.el}${f.label ? ' "' + f.label + '"' : ''} styles as pressable but computes ${f.reason} — no finger can reach it (class 71)` });

    /* DUPE — build 1171: one concept, two doors in one menu. */
    if (on('DUPE') && (res.dupes || []).length)
      for (const f of capped(res.dupes, 20, 'DUPE'))
        add({ id: 'DUPE', where: at, key: `${f.root}|${f.label}`,
              detail: `two controls named "${f.label}" in ${f.root} (${f.a} and ${f.b}) — one concept, two doors` });

    /* BOOK — build 1173: the board must equal the book of the portal the
       body claims, or the dashboard is wearing another portal's numbers. */
    if (on('BOOK') && (res.book || []).length)
      for (const f of capped(res.book, 20, 'BOOK'))
        add({ id: 'BOOK', where: at, key: `book|${f.stage}`,
              detail: `pipeline ${f.stage} shows ${f.got} but the ${f.crm} book holds ${f.exp} — the board is wearing another portal's numbers (1173 class)` });

    /* XSS — the canary flag a hostile-seed string sets if any renderer ever
       let markup through unescaped. One boolean, zero noise. */
    if (on('XSS') && res.xss)
      add({ id: 'XSS', where: at, key: 'xss',
            detail: 'window.__XSS__ is set — a seeded hostile string executed as markup somewhere on this render path' });

    /* UNWIRED needs CDP — the page cannot list its own listeners. */
    if (on('UNWIRED') && res.unwired.length) {
      const cdp = await ctx.newCDPSession(page);
      for (const cand of capped(res.unwired, 120, 'UNWIRED')) {
        try {
          const { result } = await cdp.send('Runtime.evaluate', {
            expression: `document.querySelector('[data-sentinel-id="${cand.id}"]')`,
          });
          if (!result.objectId) continue;
          const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
          const direct = (listeners || []).some(l => l.type === 'click' || l.type === 'pointerup' || l.type === 'touchend');
          if (direct) continue;
          /* No listener of its own is only a fault if nothing above it
             delegates either — this app leans on delegation heavily. */
          const delegated = await page.evaluate(`(() => {
            const el = document.querySelector('[data-sentinel-id="${cand.id}"]');
            if (!el) return false;
            if (el.closest('[data-cr-delegate], form, a, label')) return true;
            /* 950: this app's dispatchers are DOCUMENT-level and key on data-*
               attributes (data-putab, data-puassign-open, ...). A parentElement
               walk can never reach document — document is not an Element — so
               a data-hooked button is presumed delegated. A dead button with
               no data hook still fires (the selftest holds both directions). */
            for (const a of el.attributes) {
              if (a.name.indexOf('data-') === 0 && a.name !== 'data-sentinel-id') return true;
            }
            return false;
          })()`);
          if (delegated) continue;
          let hasAncestorListener = false;
          let handle = await page.evaluateHandle(`document.querySelector('[data-sentinel-id="${cand.id}"]').parentElement`);
          for (let up = 0; up < 6 && handle; up++) {
            const oid = handle._preview ? null : (await handle.jsonValue().catch(() => null), handle);
            const desc = await cdp.send('Runtime.evaluate', {
              expression: `document.querySelector('[data-sentinel-id="${cand.id}"]')${'.parentElement'.repeat(up + 1)}`,
            }).catch(() => ({ result: {} }));
            if (!desc.result || !desc.result.objectId) break;
            const got = await cdp.send('DOMDebugger.getEventListeners', { objectId: desc.result.objectId }).catch(() => ({ listeners: [] }));
            if ((got.listeners || []).some(l => l.type === 'click')) { hasAncestorListener = true; break; }
          }
          if (hasAncestorListener) continue;
          add({ id: 'UNWIRED', where: at, detail: `${cand.el} "${cand.label}" has no click handler, and nothing above it delegates` });
        } catch (e) { /* a control that vanished mid-probe is not a finding */ }
      }
      await cdp.detach().catch(() => {});
    }

    if (errs.length) add({ id: 'PAGEERROR', where: at, detail: errs[0] });
    if (cerrs.length) add({ id: 'CONSOLE', where: at, key: 'console|' + cerrs[0].slice(0, 60), detail: 'console.error: ' + cerrs[0] });
    }   /* states */
    await ctx.close();
  }
  }

  /* ⚠ SAY WHETHER THE WHOLE APP WAS ACTUALLY LOADED. A rig that silently served
     the document in place of a module reports on the shell and calls it the app
     — which is precisely what this rig did until 31 Aug, in complete silence,
     for every multi-file artifact. So enumerate what the HTML asks for and
     require it: a local external script the sweep never served is a rig
     failure, not a clean page, and it is reported as a finding rather than
     printed where nobody reads it. */
  if (base) {
    const wanted = [...HTML.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
      .map(m => m[1])
      .filter(u => !/^(https?:)?\/\//i.test(u) && !/^data:/i.test(u))
      .map(u => u.replace(/^\/+/, '').split('?')[0])
      .filter(Boolean);
    for (const w of new Set(wanted)) {
      if (!served.has(w)) add({ id: 'RIG', where: 'load', key: 'rig|' + w,
        detail: 'external script "' + w + '" was never served from ' + base +
                ' — the sweep saw the shell, not the app' });
    }
  }
  return ran;
}

const ran = await sweep(APP, findings, resolve(dirname(TARGET)));
const attemptedHere = attempted;   /* freeze before the --since sweep adds its own */

/* The previous build, through the same probe. A finding present in BOTH is
   carried debt, not something this build did. */
const priorKeys = new Set();
let priorRan = 0;
if (SINCE) {
  const before = [];
  priorRan = await sweep(readFileSync(SINCE, 'utf8'), before, resolve(dirname(SINCE)));
  for (const f of before) priorKeys.add(keyOf(f));
}

await browser.close();
clearTimeout(DEADLINE);

if (!ran) {
  /* SAY WHY. The first version printed this line alone, which is the same
     silence it was written to prevent: a gate that fails without a reason is
     indistinguishable from a gate that hangs. */
  for (const f of findings) console.log('  ' + f.id.padEnd(9) + ' ' + f.detail + '   [' + f.where + ']');
  if (!findings.length) console.log('  RUN       no probe completed and nothing was reported — check the artifact loads at all');
  console.log('SENTINEL COULD NOT RUN — this is UNKNOWN, not clean');
  process.exit(2);
}
/* ⚠ A --since run that could not render the previous artifact would subtract
   NOTHING and every carried finding would read as new — noisy but safe. The
   reverse, silently treating a failed prior sweep as "nothing was wrong
   before", would suppress real findings. Say so rather than guess. */
if (SINCE && !priorRan) {
  console.log('  NOTE      --since could not render ' + SINCE + ' — nothing subtracted, so every finding below is reported as new');
}

/* ── report ────────────────────────────────────────────────────────────── */
/* One line per DISTINCT finding. The same bad ink at four viewports is one
   defect, not four, and printing it four times buries the other three. */
const seen = new Map();
for (const f of findings) {
  const key = keyOf(f);
  /* Twelve tiles with the same defect are ONE defect. Without this the
     where-list repeats "390px picker" a dozen times and the line is
     unreadable — which is its own way of hiding a finding. */
  if (seen.has(key)) { const g = seen.get(key); if (!g.at.includes(f.where)) g.at.push(f.where); }
  else seen.set(key, { id: f.id, key: f.key, detail: f.detail, at: [f.where] });
}
const all = [...seen.values()];
/* ⚠ A RUN finding is NOT a page defect — it says a screen never opened, so
   the sweep learned nothing about it. Subtracting it as "carried" is the
   worst possible behaviour: the same four states fail on both builds, cancel
   out, and the run reports CLEAN about screens it never rendered. Coverage
   failures are always fresh. (BUG_CLASSES 37, wearing --since as a disguise.) */
for (const r of all) r.carried = r.id !== 'RUN' && priorKeys.has(keyOf(r));
const fresh   = all.filter(r => !r.carried);
const carried = all.filter(r => r.carried);

/* What the exit code means: findings THIS build introduced. Carried debt is
   reported but does not fail the run, or the gate is red forever and stops
   being read — which is how a gate dies. */
/* OVERRIDDEN on its own is just the cascade; it only means something when
   the rule is NEW, so without --since it is suppressed unless --all. */
const rows = (SINCE ? fresh : all).filter(r => r.id !== 'OVERRIDDEN' || SINCE || ALL);

if (JSON_OUT) {
  console.log(JSON.stringify({ file: FILE, since: SINCE || null, ran,
    findings: rows, carried: carried.length }, null, 2));
} else {
  const ORDER = ['RUN', 'PAGEERROR', 'INK', 'COLLAPSE', 'OVERLAP', 'OVERFLOW', 'DEAD', 'OVERRIDDEN', 'FLOOR', 'UNWIRED'];
  const sortRows = a => a.sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id));
  for (const r of sortRows(rows))
    console.log(`  ${r.id.padEnd(9)} ${r.detail}   [${r.at.join(', ')}]`);
  if (SINCE && carried.length) {
    if (ALL) {
      console.log('  ── carried from ' + SINCE + ', not introduced by this build ──');
      for (const r of sortRows(carried))
        console.log(`  ~${r.id.padEnd(8)} ${r.detail}   [${r.at.join(', ')}]`);
    }
  }
  const by = {};
  for (const r of rows) by[r.id] = (by[r.id] || 0) + 1;
  const summary = Object.entries(by).map(([k, v]) => `${v} ${k}`).join(' · ');
  /* The carried count is stated even when clean. A silent zero and a silent
     forty look identical, and only one of them is fine. */
  const debt = SINCE ? ` · ${carried.length} carried from ${SINCE}${carried.length && !ALL ? ' (--all to see)' : ''}` : '';
  /* ⚠ The word INCOMPLETE below is a BACKSTOP and is currently UNREACHABLE —
     say so rather than let someone "test" it and conclude the gate is broken.
     Every path that skips a render (a state that throws, a probe that throws)
     raises a RUN finding first, and RUN is never carried, so a short sweep
     always has at least one fresh finding and takes the other branch. It reads
     "N NEW finding(s) across 21 of 25 render(s) — 4 SKIPPED" instead, which is
     strictly better. Keep the branch: it catches a FUTURE skip path that
     forgets to raise RUN, which is exactly how this hole opened the first time. */
  const cov = attemptedHere && ran < attemptedHere
    ? `${ran} of ${attemptedHere} render(s) — ${attemptedHere - ran} SKIPPED, see RUN above`
    : `${ran} render(s)`;
  console.log(rows.length
    ? `SENTINEL — ${rows.length} NEW finding(s) across ${cov}: ${summary}${debt}`
    : `SENTINEL ${ran < attemptedHere ? 'INCOMPLETE' : 'CLEAN'} — ${cov}, nothing new${debt}`);
}
if (SELFTEST) {
  /* An expected id missing means that check cannot fire at all, and every
     clean report it has ever produced was meaningless. */
  const got = new Set(all.map(r => r.id));
  let bad = 0;
  console.log('');
  for (const id of EXPECT) {
    const ok = got.has(id);
    if (!ok) bad++;
    console.log((ok ? '  PASS  ' : '  FAIL  ') + id +
      (ok ? ' can fire' : ' NEVER FIRED — this check is inert and its silence proves nothing'));
  }
  /* And the discrimination that matters: a rule beaten by something MORE
     specific is the cascade working and must not be called DEAD. */
  /* ⚠ THE GRADIENT-BORDER PAIR — added 25 Aug 2026 after this probe reported
     TEN false INK failures on Cardinal Truth, a screen the build log already
     records as rendering perfectly. paints() harvested every stop of every
     background layer, so a red ring clipped to border-box was scored as the
     ground for text that actually sits on the near-white padding-box fill:
     1.15:1 reported where the true value is 8.61:1.
     Both directions: a plain red gradient with no tighter layer must STILL be
     caught, or the fix would blind the probe to every ordinary gradient card. */
  const gbWrong = all.some(r => /st-gradborder-ink/.test(r.detail));
  console.log((gbWrong ? '  FAIL  ' : '  PASS  ') +
    'a border-box RING is NOT scored as the ground');
  if (gbWrong) bad++;
  const pgFired = all.some(r => /st-plaingrad-ink/.test(r.detail));
  console.log((pgFired ? '  PASS  ' : '  FAIL  ') +
    'but a PLAIN gradient with the same ink STILL is');
  if (!pgFired) bad++;

  /* ⚠ THE OFF-CANVAS PAIR — added 25 Aug 2026 after this probe spent a sweep
     scoring a SHUT nav drawer. #navMenu hides by transform:translateX(-320px),
     not by display, so visible() returned true for it and eight INK failures
     were reported on four screens that render correctly.
     Asserted in BOTH directions: the negative half alone would pass for a
     check that had simply stopped looking at every position:fixed element. */
  /* ⚠ THE EMOJI TRIO — added 25 Aug 2026. A colour emoji's glyph is painted by
     the emoji font, not by `color`, so scoring `color` against the ground
     measures a value that never paints. This rig makes it worse: headless
     Chromium has no emoji font, falls back to a monochrome glyph that DOES
     take `color`, and invents a failure impossible on any device Theo owns.
     Three checks, not two: the over-broad fix ("skip text containing an
     emoji") would silently stop scoring every label that carries one, so a
     mixed string must STILL be reported. */
  const emWrong = all.some(r => /st-em-only/.test(r.el || '') || /st-em-only/.test(r.detail));
  console.log((emWrong ? '  FAIL  ' : '  PASS  ') +
    'an EMOJI-ONLY string is NOT scored as ink');
  if (emWrong) bad++;
  const emWord = all.some(r => /st-emojiword-ink/.test(r.detail));
  console.log((emWord ? '  PASS  ' : '  FAIL  ') +
    'but plain text with the same ink STILL is');
  if (!emWord) bad++;
  const emMixed = all.some(r => /st-emojimix-ink/.test(r.detail));
  console.log((emMixed ? '  PASS  ' : '  FAIL  ') +
    'and so is a sentence that merely CONTAINS an emoji');
  if (!emMixed) bad++;

  /* ⚠ THE TRUNCATION CHECK — added 25 Aug 2026, after eight silent caps were
     found in this reporter. The bound is correct; losing findings to it in
     silence is not. 30 fixtures against a cap of 25 must produce a TRUNCATED
     finding naming the bucket and the number dropped.
     This is the one selftest that proves a check about the CHECKER. */
  const trunc = all.find(r => r.id === 'TRUNCATED' && /INK/.test(r.detail));
  console.log((trunc ? '  PASS  ' : '  FAIL  ') +
    'a cap that drops findings REPORTS the drop' +
    (trunc ? '  \u2014 ' + trunc.detail : ''));
  if (!trunc) bad++;

  const ocWrong = all.some(r => /st-offcanvas-ink/.test(r.detail));
  console.log((ocWrong ? '  FAIL  ' : '  PASS  ') +
    'a SHUT off-canvas fixed panel is NOT scored');
  if (ocWrong) bad++;
  const onFired = all.some(r => /st-onscreen-ink/.test(r.detail));
  console.log((onFired ? '  PASS  ' : '  FAIL  ') +
    'but an ON-SCREEN fixed panel with the same ink STILL is');
  if (!onFired) bad++;

  const wrongly = all.some(r => r.id === 'DEAD' && /over-base/.test(r.detail));
  console.log((wrongly ? '  FAIL  ' : '  PASS  ') +
    'a deliberately overridden rule is NOT reported as DEAD');
  if (wrongly) bad++;
  /* The mobile-first pair, asserted in BOTH directions. One alone would pass
     for a check that had simply gone silent on every media query. */
  const mfWrong = all.some(r => r.id === 'DEAD' && /mf-base/.test(r.detail));
  console.log((mfWrong ? '  FAIL  ' : '  PASS  ') +
    'a base rule beaten by a MATCHING @media rule is NOT reported as DEAD');
  if (mfWrong) bad++;
  /* The FLOOR pair: the pad twin must NOT fire — a 44px ::after pad is the
     .pu-box shape and satisfies the floor invisibly (class 40). The firing
     side is covered by EXPECT above. */
  const floorPadWrong = all.some(r => r.id === 'FLOOR' && /floor-pad/.test(r.detail));
  console.log((floorPadWrong ? '  FAIL  ' : '  PASS  ') +
    'a beaten floor with a 44px ::after pad is NOT reported as FLOOR');
  if (floorPadWrong) bad++;
  const mfMissed = !all.some(r => r.id === 'DEAD' && /mf-loser/.test(r.detail));
  console.log((mfMissed ? '  FAIL  ' : '  PASS  ') +
    'but a @media rule beaten by a later unconditional one STILL is (build 817)');
  if (mfMissed) bad++;
  /* 24 Aug 2026 (audit O5 false positive): display:-webkit-box computes to
     flow-root when the engine implements the standardized line-clamp — the
     clamp WORKS and the declared/computed mismatch is the mapping, not a
     cascade loss. */
  const clampWrong = all.some(r => r.id === 'DEAD' && /clamp-ok/.test(r.detail));
  console.log((clampWrong ? '  FAIL  ' : '  PASS  ') +
    'a working -webkit-box line-clamp (computes flow-root) is NOT reported as DEAD');
  if (clampWrong) bad++;
  /* 957: a scroller that legitimately contains must NOT be reported — the
     check is about the missing scrollport, not the property. */
  const containWrong = all.some(r => r.id === 'CONTAIN' && /#contain-ok/.test(r.detail));
  console.log((containWrong ? '  FAIL  ' : '  PASS  ') +
    'a real scroller that contains is NOT reported as CONTAIN');
  if (containWrong) bad++;
  /* 989: CLIPPED must FIRE on a silent clipper... */
  const clipMissed = !all.some(r => r.id === 'CLIPPED' && /#clip-silent/.test(r.detail));
  console.log((clipMissed ? '  FAIL  ' : '  PASS  ') +
    'a hidden-scrollbar strip that is overflowing IS reported as CLIPPED');
  if (clipMissed) bad++;
  /* ...and must NOT fire on a scroller whose bar is visible (the person can see
     it and swipe — a design choice, not a defect), nor on one that fits. */
  const clipBar = all.some(r => r.id === 'CLIPPED' && /#clip-hasbar/.test(r.detail));
  console.log((clipBar ? '  FAIL  ' : '  PASS  ') +
    'a scroller with a VISIBLE scrollbar is not reported as CLIPPED');
  if (clipBar) bad++;
  const clipFits = all.some(r => r.id === 'CLIPPED' && /#clip-fits/.test(r.detail));
  console.log((clipFits ? '  FAIL  ' : '  PASS  ') +
    'a hidden-scrollbar strip that FITS is not reported as CLIPPED');
  if (clipFits) bad++;
  const inert = all.some(r => r.id === 'UNWIRED' && /#wired/.test(r.detail));
  console.log((inert ? '  FAIL  ' : '  PASS  ') + 'a WIRED button is not reported as unwired');
  if (inert) bad++;
  /* 950: a button reached only through a DOCUMENT-level dispatcher keyed on
     its data-* attribute is wired — the parentElement walk cannot see it. */
  const dataDel = all.some(r => r.id === 'UNWIRED' && /#data-delegated/.test(r.detail));
  console.log((dataDel ? '  FAIL  ' : '  PASS  ') +
    'a data-hooked, document-delegated button is NOT reported as unwired');
  if (dataDel) bad++;
  /* DEADTAP pair: a plain pass-through with no pressable styling must stay
     quiet, and one defect must not print once per inherited descendant. */
  const dtPlain = all.some(r => r.id === 'DEADTAP' && /dt-plain/.test(r.detail));
  console.log((dtPlain ? '  FAIL  ' : '  PASS  ') +
    'a pass-through with no pressable styling is NOT reported as DEADTAP');
  if (dtPlain) bad++;
  const dtInner = all.some(r => r.id === 'DEADTAP' && /dt-inner/.test(r.detail));
  console.log((dtInner ? '  FAIL  ' : '  PASS  ') +
    'a descendant inheriting the dead boundary is NOT reported twice');
  if (dtInner) bad++;
  /* And the idiom the Showroom sweep tripped over: a decorative child of a
     REAL button, opting out of hit-testing so the press lands on the button. */
  const dtDeco = all.some(r => r.id === 'DEADTAP' && /(dt-ring|dt-glyph)/.test(r.detail));
  console.log((dtDeco ? '  FAIL  ' : '  PASS  ') +
    'a decorative child inside a live button is NOT reported as DEADTAP');
  if (dtDeco) bad++;
  /* DUPE pair: two same-name buttons in a NON-menu container are two
     different objects' actions and must stay quiet. */
  const dupeCards = all.some(r => r.id === 'DUPE' && /dupe-cards/.test(r.detail));
  console.log((dupeCards ? '  FAIL  ' : '  PASS  ') +
    'two same-name buttons in a plain list are NOT reported as DUPE');
  if (dupeCards) bad++;
  const dupeSec = all.some(r => r.id === 'DUPE' && /dupe-sec/.test(r.detail));
  console.log((dupeSec ? '  FAIL  ' : '  PASS  ') +
    'a disclosure section header sharing a row name is NOT reported as DUPE');
  if (dupeSec) bad++;
  /* BOOK pair: the matching stage in the same fixture must stay quiet. */
  const bookOk = all.some(r => r.id === 'BOOK' && /Prospect/.test(r.detail));
  console.log((bookOk ? '  FAIL  ' : '  PASS  ') +
    'a pipeline stage that MATCHES its book is NOT reported as BOOK');
  if (bookOk) bad++;
  console.log(bad ? `SELFTEST RED — ${bad} check(s) cannot be trusted`
                  : `SELFTEST GREEN — all ${EXPECT.length} checks fire, and neither look-alike is misreported`);
  process.exit(bad ? 1 : 0);
}
process.exit(rows.length ? 1 : 0);
