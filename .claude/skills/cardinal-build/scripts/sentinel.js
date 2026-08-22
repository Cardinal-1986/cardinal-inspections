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

import { readFileSync, existsSync } from 'fs';
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
const EXPECT = ['INK', 'COLLAPSE', 'OVERLAP', 'OVERFLOW', 'DEAD', 'OVERRIDDEN', 'FLOOR', 'CONTAIN', 'UNWIRED'];
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
   which is the worst failure mode a gate can have. */
const DEADLINE = setTimeout(() => {
  console.log('SENTINEL TIMEOUT — treat as UNKNOWN, not as clean');
  process.exit(2);
}, 240000);

const findings = [];
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
async function sweep(HTML, findings) {
  const add = f => findings.push(f);
  let ran = 0;
  for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
    await page.route('**/*', async r => {
      const u = r.request().url();
      if (u.startsWith('https://sentinel.test/'))
        return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
      /* A 1x1 PNG for every image so a lazy or signed photograph still
         produces a real box. An empty body makes every <img> collapse to
         zero and COLLAPSE would then fire on the whole page. */
      if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u) || /image/i.test(r.request().headers().accept || ''))
        return r.fulfill({ status: 200, contentType: 'image/png',
          body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
      return r.fulfill({ status: 200, body: '' });
    });
    if (SETUP_JS) await page.addInitScript(SETUP_JS);
    if (theme !== 'default')
      await page.addInitScript(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});`);
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
    if (on('INK'))
      for (const f of res.ink.slice(0, 25))
        add({ id: 'INK', where: at,
              key: `${f.el}|${f.fg}|${f.bg}|${f.floor}`,
              detail: `${f.ratio}:1 (floor ${f.floor}) ${f.el} "${f.text}" ${f.fg} on ${f.bg}` });

    if (on('COLLAPSE'))
      for (const f of res.collapse.slice(0, 15))
        add({ id: 'COLLAPSE', where: at, detail: `${f.el} is ${f.box} but holds ${f.child} at ${f.childBox}` });

    if (on('OVERLAP'))
      for (const f of res.overlap.slice(0, 15))
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
      for (const f of res.dead.slice(0, 20))
        add({ id: f.outranked ? 'OVERRIDDEN' : 'DEAD', where: at,
              detail: `${f.selector} { ${f.prop}: ${f.declared} } never wins on any of the ${f.matched} element(s) it matches` });

    /* FLOOR — the touch-target floor beaten by a module's own min-*. To
       OVERRIDDEN this is the cascade working, which is exactly why it has
       its own id: the cr-touch44-styles sheet is the one place where losing
       to higher specificity IS the defect (the #payView shape, build 944). */
    if (on('FLOOR'))
      for (const f of (res.floor || []).slice(0, 20))
        add({ id: 'FLOOR', where: at,
              key: `${f.selector}|${f.prop}|${f.el}`,
              detail: `${f.selector} floors ${f.prop}:44px but ${f.el} computes ${f.computed}px${f.winner ? ' — beaten by ' + f.winner : ''}` });

    if (on('CONTAIN') && (res.contain || []).length)
      for (const f of res.contain.slice(0, 20))
        add({ id: 'CONTAIN', where: at,
              key: `${f.el}|${f.behavior}`,
              detail: `${f.el} sets overscroll-behavior ${f.behavior} but has no scrollport (overflow ${f.overflow}) — on iOS this can swallow the swipe` });

    /* 989: CLIPPED — a hidden-scrollbar scroller that is overflowing RIGHT NOW.
       Distinct from OVERFLOW, which watches the page: a strip like this scrolls
       INSTEAD of breaking the page, so the document width never moves and
       OVERFLOW cannot see it. .cr-cth-tabs (984) was the first of 30 such
       scrollers anyone measured, and it was hiding a tab. */
    if (on('CLIPPED') && (res.clipped || []).length)
      for (const f of res.clipped.slice(0, 20))
        add({ id: 'CLIPPED', where: at,
              key: `${f.el}`,
              detail: `${f.el} hides ${f.over}px with no scrollbar (${f.bar})` +
                      (f.hidden && f.hidden.length ? ` — off the edge: ${f.hidden.join(', ')}` : '') });

    /* UNWIRED needs CDP — the page cannot list its own listeners. */
    if (on('UNWIRED') && res.unwired.length) {
      const cdp = await ctx.newCDPSession(page);
      for (const cand of res.unwired.slice(0, 120)) {
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
    }   /* states */
    await ctx.close();
  }
  }
  return ran;
}

const ran = await sweep(APP, findings);

/* The previous build, through the same probe. A finding present in BOTH is
   carried debt, not something this build did. */
const priorKeys = new Set();
let priorRan = 0;
if (SINCE) {
  const before = [];
  priorRan = await sweep(readFileSync(SINCE, 'utf8'), before);
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
for (const r of all) r.carried = priorKeys.has(keyOf(r));
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
  console.log(rows.length
    ? `SENTINEL — ${rows.length} NEW finding(s) across ${ran} render(s): ${summary}${debt}`
    : `SENTINEL CLEAN — ${ran} render(s), nothing new${debt}`);
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
  console.log(bad ? `SELFTEST RED — ${bad} check(s) cannot be trusted`
                  : `SELFTEST GREEN — all ${EXPECT.length} checks fire, and neither look-alike is misreported`);
  process.exit(bad ? 1 : 0);
}
process.exit(rows.length ? 1 : 0);
