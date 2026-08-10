/* render_ljfit696.js — build 696 gate.

   690 added a horizontal chip row to All Leads & Jobs and, with it, a
   horizontal overflow nobody measured: `.ljcols{grid-template-columns:1fr}`
   means `minmax(auto,1fr)`, and that auto minimum is the item's max-content —
   every chip laid out unwrapped, 869px of it inside a 393px screen. The grid
   track grew to fit and took the card list with it, so job names had room not
   to wrap and ran off the right edge. Theo reported it as "the cards gigantic
   and cut off"; nothing had been resized, the column had.

   What this checks, at every width the app is actually used at:
     1. the DOCUMENT does not scroll sideways;
     2. no CONTAINER on the leads view is wider than the viewport;
     3. the chip rows do scroll internally — the whole point of clamping them;
     4. a long job name WRAPS instead of being clipped.

   Chips scrolled out of view to the right are NOT overflow. A naive
   "right > viewport" sweep flags them and reads as a failure, so descendants
   of a scrollable row are excluded by design.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_ljfit696.js [index.html]
   Point it at 695 as the negative control — .ljresults is 869px there.       */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const LONG = 'Alton James — Habitat for Humanity of Greater Dayton';
const mk = (id, stage, name) => ({
  id: 'p' + id, name: name, address: id + ' Huron Ave Dayton Ohio 46402', stage: stage,
  created_by: 'joey@cardinalrenovations.net', updated_at: '2026-08-01T12:00:00Z',
  created_at: '2026-07-01T12:00:00Z', checklist: JSON.stringify({ po: 1000 + id, priority: 'Normal' })
});
const SEED = [];
const DIST = { Lead: 23, Prospect: 5, OnHold: 1, Approved: 2, Scheduled: 1, Completed: 1, Invoiced: 1 };
let n = 0;
for (const st of Object.keys(DIST)) for (let i = 0; i < DIST[st]; i++)
  SEED.push(mk(++n, st, i === 0 && st === 'Lead' ? LONG : st + ' client ' + (i + 1)));
// five reps, so the Assigned To strip is as wide as it gets in real use
SEED.forEach((p, i) => {
  p.created_by = ['joey@', 'joan@', 'nick@', 'greg@', 'jerry@'][i % 5] + 'cardinalrenovations.net';
});

const WIDTHS = [360, 393, 430, 768, 1194];

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const SRC = fs.readFileSync(FILE, 'utf8');

  for (const W of WIDTHS) {
    const p = await br.newPage({ viewport: { width: W, height: 850 } });
    await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    p.on('pageerror', () => {});
    await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);

    const R = await p.evaluate(({ seed, longName }) => {
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

      const vw = document.documentElement.clientWidth;
      const out = { vw: vw, docScroll: document.documentElement.scrollWidth, over: [], strips: [] };

      // a scrollable row legitimately holds children beyond its right edge
      const scrollers = Array.from(document.querySelectorAll('#leadsView *'))
        .filter(el => { const cs = getComputedStyle(el);
                        return cs.overflowX === 'auto' || cs.overflowX === 'scroll'; });
      const inScroller = el => scrollers.some(s => s !== el && s.contains(el));

      document.querySelectorAll('#leadsView *').forEach(el => {
        if (inScroller(el)) return;
        const r = el.getBoundingClientRect();
        if (!el.getClientRects().length) return;
        if (r.width > vw + 1) out.over.push(
          ((el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className
            ? '.' + el.className.split(' ')[0] : el.tagName)) + ' w=' + Math.round(r.width));
      });

      ['ljStageChips', 'ljRepChips'].forEach(id => {
        const s = document.getElementById(id);
        if (!s) return;
        out.strips.push({ id: id, w: Math.round(s.getBoundingClientRect().width),
                          sw: s.scrollWidth, chips: s.querySelectorAll('.ljchip').length });
      });

      // does a long name wrap, or is it clipped?
      const card = Array.from(document.querySelectorAll('#ljList .ljcard'))
        .find(c => (c.textContent || '').indexOf('Habitat for Humanity of Greater') !== -1);
      if (card) {
        const nm = card.querySelector('.ljnm') || card;
        const r = nm.getBoundingClientRect();
        const cs = getComputedStyle(nm);
        out.name = { right: Math.round(r.right), h: Math.round(r.height),
                     lh: parseFloat(cs.lineHeight) || 0, clipped: r.right > vw + 1,
                     scrollW: nm.scrollWidth, clientW: nm.clientWidth };
      }
      return out;
    }, { seed: SEED, longName: LONG });

    console.log(`\n── ${W}px ──  doc scrollWidth ${R.docScroll} · strips ${JSON.stringify(R.strips)}`);
    ok(R.docScroll <= R.vw, `${W}: the page does not scroll sideways (${R.docScroll} vs ${R.vw})`);
    ok(R.over.length === 0, `${W}: no container is wider than the viewport (${R.over.slice(0, 3).join(', ') || 'none'})`);
    if (R.strips.length) {
      const clamped = R.strips.every(s => s.w <= R.vw + 1);
      ok(clamped, `${W}: every chip strip is clamped to the screen`);
      if (W < 700) {
        const scrolls = R.strips.some(s => s.sw > s.w + 1);
        ok(scrolls, `${W}: the strips scroll internally instead of stretching the page`);
      }
    }
    if (R.name) {
      ok(!R.name.clipped, `${W}: a long job name is not clipped at the edge (right ${R.name.right} vs ${R.vw})`);
      ok(R.name.scrollW <= R.name.clientW + 1,
        `${W}: the name box does not overflow its own text (${R.name.scrollW} vs ${R.name.clientW})`);
    }
    await p.close();
  }

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
