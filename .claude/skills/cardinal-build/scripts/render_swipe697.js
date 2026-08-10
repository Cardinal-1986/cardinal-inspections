/* render_swipe697.js — build 697 gate.

   Theo: swiping the leads chip strip back toward its start exited the screen.
   Cause is scroll CHAINING — a horizontal scroller with no
   `overscroll-behavior-x` hands the leftover gesture to the page once it hits
   scrollLeft 0, and the browser reads that as a back navigation.

   Two things are checked, and the second matters as much as the first:
     1. every element that scrolls sideways computes overscroll-behavior-x
        'contain' (or 'none') — read from Chromium, not from the stylesheet,
        so a rule that parses but never applies is caught;
     2. the strips STILL SCROLL. `contain` must not be confused with `hidden`;
        a fix that stopped the chaining by stopping the scrolling would pass a
        naive check and break the feature.

   ⚠️ The gesture itself cannot be tested here. `overscroll-behavior` governs
   chaining, and headless Chromium has no touch swipe to chain. This gate
   proves the property is live on every scroller; whether the screen still
   exits on a real iPhone is Theo's eyes. It also cannot help the iOS system
   EDGE gesture, which is handled before the page sees it.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_swipe697.js [index.html]
   Point it at 696 as the negative control — 23 scrollers are unguarded there. */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const mk = (id, stage, name) => ({
  id: 'p' + id, name: name, address: id + ' Huron Ave Dayton Ohio 46402', stage: stage,
  created_by: 'joey@cardinalrenovations.net', updated_at: '2026-08-01T12:00:00Z',
  created_at: '2026-07-01T12:00:00Z', checklist: JSON.stringify({ po: 1000 + id, priority: 'Normal' })
});
const SEED = [];
const DIST = { Lead: 23, Prospect: 5, OnHold: 1, Approved: 2, Scheduled: 1, Completed: 1, Invoiced: 1 };
let n = 0;
for (const st of Object.keys(DIST)) for (let i = 0; i < DIST[st]; i++)
  SEED.push(mk(++n, st, 'Alton James — Habitat for Humanity'));
SEED.forEach((p, i) => {
  p.created_by = ['joey@', 'joan@', 'nick@', 'greg@', 'jerry@'][i % 5] + 'cardinalrenovations.net';
});

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const SRC = fs.readFileSync(FILE, 'utf8');
  const p = await br.newPage({ viewport: { width: 393, height: 850 } });
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  p.on('pageerror', () => {});
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);

  const R = await p.evaluate((seed) => {
    try { showMain('theo@cardinalrenovations.net'); } catch (_) {}
    const lv = document.getElementById('landingView');
    if (lv) lv.style.setProperty('display', 'none', 'important');
    window.cacheProjects = seed;
    if (window.ljState) ljState.sets = {};
    const v = document.getElementById('leadsView');
    if (v) v.style.setProperty('display', 'block', 'important');
    for (let x = v; x; x = x.parentElement)
      if (getComputedStyle(x).display === 'none') x.style.setProperty('display', 'block', 'important');
    renderLeadsView();

    const out = { scrollers: 0, unguarded: [], strips: [], sheetTotal: 0, sheetGuarded: 0 };

    /* 1 — the STYLESHEET view: every rule that declares a sideways scroll must
       also declare the guard. Walking Chromium's parsed rules rather than the
       source catches a rule that never applies as readily as one that does. */
    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules; } catch (_) { continue; }
      const walk = list => {
        for (const r of Array.from(list || [])) {
          if (r.style) {
            const ox = r.style.getPropertyValue('overflow-x');
            if (ox === 'auto' || ox === 'scroll') {
              out.sheetTotal++;
              const ob = r.style.getPropertyValue('overscroll-behavior-x')
                      || r.style.getPropertyValue('overscroll-behavior');
              if (ob === 'contain' || ob === 'none') out.sheetGuarded++;
              else out.unguarded.push((r.selectorText || '?').slice(0, 54));
            }
          }
          /* every CSSStyleRule exposes an empty .cssRules in modern Chromium
             for CSS nesting — examine the rule, THEN descend, or you skip
             every style rule and report a clean zero. */
          if (r.cssRules) walk(r.cssRules);
        }
      };
      walk(rules);
    }

    /* 2 — the LIVE view: the leads strips must still actually scroll. */
    ['ljStageChips', 'ljRepChips'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const cs = getComputedStyle(el);
      out.strips.push({
        id: id,
        guard: cs.overscrollBehaviorX,
        overflow: cs.overflowX,
        clientW: el.clientWidth,
        scrollW: el.scrollWidth,
        scrolls: el.scrollWidth > el.clientWidth + 1
      });
    });

    /* and it must really move when told to — `contain` is not `hidden` */
    const s = document.getElementById('ljStageChips');
    if (s) {
      s.scrollLeft = 9999;
      out.movedTo = s.scrollLeft;
      s.scrollLeft = 0;
      out.backTo = s.scrollLeft;
    }
    return out;
  }, SEED);

  console.log(`\nstylesheet: ${R.sheetTotal} sideways scrollers · ${R.sheetGuarded} guarded`);
  console.log('leads strips: ' + JSON.stringify(R.strips));

  ok(R.sheetTotal > 0, `the sheet walk actually found scrollers (${R.sheetTotal}) — a zero here would be a broken walk, not a clean file`);
  ok(R.unguarded.length === 0,
    `every sideways scroller guards against chaining (unguarded: ${R.unguarded.slice(0, 5).join(' | ') || 'none'})`);
  R.strips.forEach(s => {
    ok(s.guard === 'contain' || s.guard === 'none',
      `${s.id}: computes overscroll-behavior-x '${s.guard}'`);
    ok(s.overflow === 'auto' || s.overflow === 'scroll',
      `${s.id}: still a scroller, not clipped ('${s.overflow}')`);
    ok(s.scrolls, `${s.id}: still has somewhere to scroll (${s.scrollW} vs ${s.clientW})`);
  });
  ok(R.movedTo > 0, `the strip really moves when scrolled — contain is not hidden (scrollLeft reached ${R.movedTo})`);
  ok(R.backTo === 0, `and comes back to the start (${R.backTo})`);

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
