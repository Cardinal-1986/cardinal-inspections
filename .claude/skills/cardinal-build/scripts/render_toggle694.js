/* render_toggle694.js — build 694 gate.

   "Is the light/dark switcher on this page?" is a question only the browser
   can answer. Every CSS rule still says display:flex on the screens where the
   control is gone — it is either painted over by a z-index 9500 view or the
   FAB half is switched off because crmNow() reports 'sales'. So each case is
   checked with elementFromPoint at the button's own centre, and then the
   button is actually CLICKED to prove the move did not break its wiring.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_toggle694.js [index.html]
   Point it at 693 as the negative control: Sales Floor and insurance are
   unreachable there.                                                         */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

// name, how to open it, must the switcher be reachable there?
const CASES = [
  ['app at rest',   "",                                                              true],
  ['Sales Floor',   "window.CardinalSalesFloor.open()",                              true],
  ['Punch board',   "var v=document.getElementById('cr-pb'); if(v)v.classList.add('open')", true],
  ['Crews',         "var v=document.getElementById('crewsView'); if(v)v.style.display='block'", true],
  ['Estimates',     "var v=document.getElementById('cr-est-view'); if(v)v.classList.add('open')", true],
  ['insurance CRM', "document.body.dataset.crm='insurance'",                         true],
  // single-theme by decision — the switch would do nothing, so it must NOT appear
  ['Showcase',      "window.CardinalShowcase&&window.CardinalShowcase.open&&window.CardinalShowcase.open()", false],
  ['OC Colors',     "window.CardinalColors&&window.CardinalColors.open&&window.CardinalColors.open()",       false],
];

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const SRC = fs.readFileSync(FILE, 'utf8');

  for (const [name, openJs, wantReachable] of CASES) {
    const p = await br.newPage({ viewport: { width: 430, height: 900 } });
    await p.route('**', r => { const u = r.request().url();
      return (u.startsWith('file:') || u.startsWith('data:')) ? r.continue() : r.abort(); });
    p.on('pageerror', () => {});
    /* file://, NOT setContent: setContent leaves the page on about:blank, where
       localStorage throws. The toggle stores its choice there and re-reads it
       to decide what to paint, so every click silently did nothing and the
       harness read that as a broken button. The app was fine; the harness had
       no origin. */
    await p.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900);

    const R = await p.evaluate((js) => {
      const out = {};
      try { showMain('theo@cardinalrenovations.net'); } catch (_) {}
      const lv = document.getElementById('landingView');
      if (lv) lv.style.setProperty('display', 'none', 'important');
      if (js) { try { (new Function(js))(); } catch (e) { out.openErr = String(e).slice(0, 70); } }

      /* Start from dark every time. localStorage persists across pages in the
         same context, so without this the second case inherits the first
         case's click and the before/after comparison is meaningless. */
      try { window.CardinalRBTheme.setLight(false); } catch (_) {}
      return out;
    }, openJs);

    /* refreshVisibility() runs on the module's own 1s interval and the views
       mount asynchronously, so a single period can be read mid-race: OC Colors
       measured "reachable" once because the tick landed before #cr-occ was in
       the DOM. Two full periods puts the reading past the settle. */
    await p.waitForTimeout(2500);

    const S = await p.evaluate(() => {
      const b = document.getElementById('cr-dark-toggle');
      if (!b) return { present: false };
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      const vis = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 2;
      let hit = 'not visible';
      if (vis) {
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        hit = (el === b || b.contains(el)) ? 'reachable'
            : 'covered by ' + (el ? (el.id ? '#' + el.id : el.className || el.tagName) : 'nothing');
      }
      const before = document.documentElement.getAttribute('data-theme');
      let clicked = null, after = null;
      if (hit === 'reachable') {
        try { b.click(); clicked = true; after = document.documentElement.getAttribute('data-theme'); }
        catch (e) { clicked = String(e).slice(0, 60); }
      }
      return { present: true, visible: vis, hit: hit, parent: b.parentElement ? (b.parentElement.id || b.parentElement.tagName) : null,
               z: cs.zIndex, pos: cs.position, before: before, after: after, clicked: clicked };
    });

    console.log(`\n── ${name} ──  ${JSON.stringify(S)}`);
    if (R.openErr) console.log('   (open threw: ' + R.openErr + ')');

    ok(S.present, `${name}: the button exists`);
    if (wantReachable) {
      ok(S.hit === 'reachable', `${name}: the switcher is reachable (${S.hit})`);
      if (S.hit === 'reachable') {
        ok(S.before !== S.after,
          `${name}: tapping it actually flips the theme (${S.before} -> ${S.after}) — the move did not break its wiring`);
      }
    } else {
      ok(S.hit !== 'reachable',
        `${name}: single-theme by decision, so NO switcher is offered (${S.hit})`);
    }
    await p.close();
  }

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
