/* gate_1114.mjs — a REAL Chromium render of the seven-card pipeline row and the
   header title. jsdom proved the markup; only an engine can answer the two
   questions this build actually risks:

     1. Retail went from FIVE cards to SEVEN on a 390px phone. Do the labels
        clip to an ellipsis, and does the row overflow its card?
     2. The header title lost its retail-only 17px/nowrap rule and inherits the
        20px one. Does "Retail" still fit the header's middle at 390px — the
        width 1065 hid the old slogan at?

   Also scores every card's ink against the ground it actually composites over,
   in BOTH themes — the recurring class on this project (7 reports), and this
   build changes what those cards print.

   ⚠ Written to go RED on 1113 rather than crash (BUG_CLASSES 37). Every probe
   is guarded; the 1113 control legitimately renders five cards and the slogan,
   and must SAY so, not die.

   usage:  node gate_1114.mjs <file.html>
*/
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

/* WCAG relative luminance / contrast — arithmetic, not judgement */
const lum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgb = s => { const m = /(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : null; };

const probe = () => ({
  cards: [...document.querySelectorAll('#pipeRow .pipebtn')].map(b => {
    const lab = b.querySelector('.plabel');
    const r = b.getBoundingClientRect();
    const cs = lab ? getComputedStyle(lab) : null;
    /* THE GROUND THIS TEXT ACTUALLY COMPOSITES OVER.
       Two rules, and getting either wrong hands back a confident wrong number:
       (a) within one element the background-IMAGE composites over that element's
           own background-color, so collect the stops first, then the colour;
       (b) STOP at the first fully-opaque ground. An ancestor behind an opaque
           one is not visible, and walking past it is how a dark carved cell's
           light ink gets scored against the cream page eleven levels up — which
           is exactly what this gate did on its first run and reported as a
           2.71:1 failure on a passing element. */
    const grounds = [];
    const opaque = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return false;
                          const p = m[1].split(',').map(x => parseFloat(x));
                          return p.length < 4 || p[3] >= 0.999; };
    for (let e = lab; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      const bi = s.backgroundImage || '';
      let blocked = false;
      for (const m of bi.matchAll(/rgba?\([^)]+\)/g)) {
        if (/,\s*0\)$/.test(m[0])) continue;
        grounds.push(m[0]);
        if (opaque(m[0])) blocked = true;
      }
      const bc = s.backgroundColor;
      if (bc && !/rgba\(0, 0, 0, 0\)|transparent/.test(bc)) {
        grounds.push(bc);
        if (opaque(bc)) blocked = true;
      }
      if (blocked) break;
    }
    return {
      stg    : b.getAttribute('data-stg') || '',
      aria   : b.getAttribute('aria-label') || '',
      text   : lab ? (lab.textContent || '') : '(no .plabel)',
      /* ⚠ scrollWidth > clientWidth is VACUOUS here — align-items:center sizes
         the label to its own max-content, so it can never report clipping even
         while it spills over its neighbour. Measure the label against its CELL,
         which is what actually overlaps. */
      clipped: lab ? lab.scrollWidth > lab.clientWidth + 1 : null,
      labW   : lab ? Math.round(lab.getBoundingClientRect().width) : null,
      spill  : lab ? Math.round(lab.getBoundingClientRect().width - r.width) : null,
      fs     : cs ? parseFloat(cs.fontSize) : null,
      ink    : cs ? cs.color : null,
      grounds,
      w      : Math.round(r.width), h: Math.round(r.height)
    };
  }),
  row: (() => {
    const r = document.getElementById('pipeRow');
    if (!r) return null;
    const cs = getComputedStyle(r);
    return { over: r.scrollWidth > r.clientWidth + 1,
             scrollable: /auto|scroll/.test(cs.overflowX),
             ovx: cs.overflowX,
             w: Math.round(r.getBoundingClientRect().width),
             sw: r.scrollWidth, cw: r.clientWidth,
             gap: cs.gap, pad: cs.padding, disp: cs.display,
             kids: [...r.children].map(k => Math.round(k.getBoundingClientRect().width)) };
  })(),
  bodyOver: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  title: (() => {
    const h = document.querySelector('#brandTitle h1');
    const box = document.getElementById('cr-hd2-mid');
    if (!h) return null;
    const r = h.getBoundingClientRect(), br = box ? box.getBoundingClientRect() : null;
    const cs = getComputedStyle(h);
    return {
      text: (h.textContent || '').trim(),
      kids: h.children.length,
      shown: r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
      clipped: h.scrollWidth > h.clientWidth + 1,
      overflowsMid: br ? r.width > br.width + 1 : false,
      fs: parseFloat(cs.fontSize), family: cs.fontFamily
    };
  })()
});

const b = await chromium.launch();

async function run(theme, width) {
  const p = await b.newPage({ viewport: { width, height: 844 } });
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
    await p.addInitScript(readFileSync(S + f, 'utf8'));
  await p.goto(URL_, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  const out = await p.evaluate(probe).catch(e => ({ err: String(e.message || e) }));
  await p.close();
  return out;
}

const tag = t => (t === 'rb-light' ? 'light' : 'dark');

for (const theme of ['dark', 'rb-light']) {
  for (const width of [390, 1194]) {
    const r = await run(theme, width);
    const at = tag(theme) + ' @' + width;
    console.log('\n── ' + at + ' ' + '─'.repeat(46));
    if (r.err) { ok(false, at + ' — probe threw: ' + r.err); continue; }

    ok(r.cards.length === 7, at + ' — seven pipeline cards render (got ' + r.cards.length + ': ' +
       r.cards.map(c => c.text).join(' ') + ')');
    ok(r.cards.map(c => c.text).join(' ') === 'L P A C I Closed On Hold',
       at + ' — the row reads "L P A C I Closed On Hold"');

    const clipped = r.cards.filter(c => c.clipped);
    ok(clipped.length === 0, at + ' — no label truncates to an ellipsis' +
       (clipped.length ? ' (' + clipped.map(c => c.text).join(', ') + ')' : ''));
    const spilling = r.cards.filter(c => c.spill != null && c.spill > 0);
    ok(spilling.length === 0, at + ' — no label is wider than its own card' +
       (spilling.length ? ' (' + spilling.map(c => '"' + c.text + '" ' + c.labW + 'px in ' + c.w + 'px, +' + c.spill).join('; ') + ')' : ''));
    /* ⚠ NOT "it must never scroll". Seven cards cannot fit 340px at a legible
       size, so on a phone the row is a SCROLLER — which is what the base rule
       always was, before 957 tuned the breakpoint for five cards. The bug this
       guards is 957's shape: content overflowing a box whose overflow is
       `visible`, where the labels overlap their neighbours instead. */
    ok(r.row && (!r.row.over || r.row.scrollable),
       at + ' — the row either fits or is a real scrollport (overflow-x:' +
       (r.row ? r.row.ovx : '?') + ', scroll ' + (r.row ? r.row.sw : '?') + ' vs client ' +
       (r.row ? r.row.cw : '?') + ', cards ' + (r.row ? r.row.kids.join('+') : '?') + ')');
    if (width >= 1194)
      ok(r.row && !r.row.over, at + ' — on the desktop the seven cards still fit with no scroll');
    ok(!r.bodyOver, at + ' — the page does not scroll sideways');

    const tiny = r.cards.filter(c => c.fs != null && c.fs < 11);
    ok(tiny.length === 0, at + ' — every label is >= 11px (build 1081 floor)' +
       (tiny.length ? ' — ' + tiny.map(c => c.text + ' ' + c.fs + 'px').join(', ') : ''));

    const collapsed = r.cards.filter(c => c.w < 24 || c.h < 24);
    ok(collapsed.length === 0, at + ' — no card collapsed' +
       (collapsed.length ? ' (' + collapsed.map(c => c.text + ' ' + c.w + 'x' + c.h).join(', ') + ')' : ''));

    /* ink vs. the worst ground it actually composites over */
    let worst = null;
    for (const c of r.cards) {
      const ink = rgb(c.ink); if (!ink) continue;
      for (const g of c.grounds) {
        const gr = rgb(g); if (!gr) continue;
        const v = ratio(ink, gr);
        if (!worst || v < worst.v) worst = { v, label: c.text, ground: g };
      }
    }
    const floor = 4.5;
    ok(worst && worst.v >= floor, at + ' — every card label clears ' + floor + ':1' +
       (worst ? ' (worst ' + worst.v.toFixed(2) + ':1 on "' + worst.label + '" over ' + worst.ground + ')' : ' — no ground read'));

    const t = r.title;
    ok(!!t && t.shown, at + ' — the header title is on screen (1065 used to hide it below 438px)');
    ok(!!t && t.text === 'Retail', at + ' — it reads "Retail" (got ' + JSON.stringify(t && t.text) + ')');
    ok(!!t && t.kids === 0, at + ' — it is plain text, no slogan spans');
    ok(!!t && !t.clipped && !t.overflowsMid, at + ' — it fits the header middle without clipping');
    ok(!!t && !/Typewriter/i.test(t.family), at + ' — it uses the shared face, not the retail typewriter one');
  }
}

await b.close();
console.log('\n' + (fail ? 'RED — ' + fail + ' failed, ' + pass + ' passed'
                         : 'GREEN — all ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
