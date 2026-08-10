/* render_navicons.js — build 686 gate, real Chromium with SCRIPTS ON.
   The whole point of this build is a hydrator that runs at load, so a
   scripts-off render would prove nothing. Supabase/CDN are blocked, which is
   fine: hydrate() runs from the inline module, not from the network.

   Usage: node render_navicons.js [index.html]
   Point it at the 685 artifact as the negative control — it must go red.   */
const path = require('path');
const SP = __dirname;
const { chromium } = require(path.join(SP, 'node_modules', 'playwright-core'));
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const NAV = [
  ['[data-new="task"]','clipboard'], ['[data-new="contact"]','person'],
  ['[data-new="lead"]','flag'], ['[data-new="reminder"]','alarm'], ['#navBtn','menu'],
  ['[data-nav="landing"]','home'], ['[data-nav="clients"]','people'],
  ['[data-nav="leads"]','clipboard'], ['[data-nav="board"]','calendar'],
  ['[data-nav="quickinsp"]','bolt'], ['[data-nav="inspections"]','search'],
  ['[data-nav="estimates"]','money'], ['[data-nav="abcsupply"]','brick'],
  ['[data-nav="coach"]','target'], ['[data-nav="cardinaltruth"]','shield'],
  ['[data-nav="reports"]','chart'], ['[data-nav="feed"]','bolt'],
  ['[data-nav="recents"]','clock'], ['[data-nav="pricing"]','tag'],
  ['[data-nav="companydocs"]','folder'], ['[data-nav="crews"]','hardhat'],
  ['[data-nav="pay"]','cash'], ['[data-nav="settings"]','gear'],
  ['[data-set="profile"]','person'], ['[data-set="team"]','people'],
  ['[data-set="notify"]','bell'], ['[data-set="audit"]','eye'],
  ['[data-set="backup"]','save'],
];

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  FAIL ' + m); } };

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await page.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  await page.goto('file://' + FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1200);          // let the inline module run

  // These rows live in menus that are CLOSED at load, and a hidden element has
  // no bounding box — measuring one reports 0px and says nothing. Open the three
  // containers first so the icons are measured in the only state that ships.
  await page.evaluate(() => {
    ['newMenu','navMenu','settingsView'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.setProperty('display', 'block', 'important');
    });
    document.querySelectorAll('#navMenu [style*="display:none"], #settingsView [style*="display:none"]')
      .forEach(el => el.style.setProperty('display', 'block', 'important'));
  });
  await page.waitForTimeout(200);

  const R = await page.evaluate((NAV) => {
    const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}☰-☷]/u;
    const out = { leftover: 0, rows: [], registry: null, hydrateIsFn: null };
    out.registry = (window.CardinalIcons && typeof window.CardinalIcons.names === 'function')
      ? window.CardinalIcons.names() : null;
    out.hydrateIsFn = !!(window.CardinalIcons && typeof window.CardinalIcons.hydrate === 'function');
    // no un-hydrated placeholders may remain anywhere
    out.leftover = document.querySelectorAll('[data-cri]').length;
    for (const [sel, name] of NAV) {
      const el = document.querySelector(sel);
      if (!el) { out.rows.push({ sel, name, missing: true }); continue; }
      const svg = el.querySelector('svg.cri');
      const cs = svg ? getComputedStyle(svg) : null;
      const parent = getComputedStyle(el);
      out.rows.push({
        sel, name,
        hasSvg: !!svg,
        firstChildIsSvg: el.firstElementChild === svg,
        stroke: cs ? cs.stroke : null,
        parentColor: parent.color,
        fill: cs ? cs.fill : null,
        w: svg ? +svg.getBoundingClientRect().width.toFixed(2) : 0,
        // role-gated rows are legitimately display:none (.navopt hidden until
        // permissions allow). They must still HAVE their icon, but they have no
        // box to measure — sizing a hidden element reports 0 and proves nothing.
        hidden: (() => { for (let n = el; n; n = n.parentElement)
                   if (getComputedStyle(n).display === 'none') return true;
                 return false; })(),
        fontPx: parseFloat(parent.fontSize),
        // the label text must still be there, and carry no emoji
        text: (el.textContent || '').trim().slice(0, 40),
        emojiLeft: EMOJI.test(el.textContent || ''),
      });
    }
    return out;
  }, NAV);

  console.log(`\nrender_navicons — ${FILE}\n`);
  console.log('1. the registry and the hydrator');
  ok(R.hydrateIsFn, 'CardinalIcons.hydrate is a function');
  ok(R.registry && R.registry.length >= 27, `registry has >=27 glyphs (got ${R.registry ? R.registry.length : 'null'})`);
  ok(R.leftover === 0, `no un-hydrated placeholders remain (found ${R.leftover})`);

  console.log('2. each nav row: icon drawn, inherits colour, em-sized, emoji gone');
  for (const r of R.rows) {
    if (r.missing) { fail++; console.log(`  FAIL ${r.sel} — element missing`); continue; }
    ok(r.hasSvg, `${r.sel} — an svg.cri was drawn`);
    ok(r.firstChildIsSvg, `${r.sel} — the icon is the first child (before the label)`);
    ok(r.stroke === r.parentColor, `${r.sel} — stroke ${r.stroke} equals the row's colour ${r.parentColor}`);
    ok(r.fill === 'none', `${r.sel} — fill:none (line art, not a filled blob)`);
    if (r.hidden) { console.log(`  note ${r.sel} — role-gated (hidden); icon present, size not scored`); }
    else ok(r.w > 0 && Math.abs(r.w - r.fontPx * 0.92) < 2.5,
       `${r.sel} — sized to the text (${r.w}px vs ${(r.fontPx * 0.92).toFixed(2)}px expected)`);
    ok(!r.emojiLeft, `${r.sel} — no emoji left in the row (${JSON.stringify(r.text)})`);
    ok(r.text.length > 0 || r.sel === '#navBtn', `${r.sel} — the label survived`);
  }

  console.log('3. the page did not throw');
  const real = errs.filter(e => !/Failed to fetch|NetworkError|supabase|ERR_/i.test(e));
  ok(real.length === 0, `no unexpected page errors (${real.slice(0, 2).join(' | ')})`);

  await browser.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
