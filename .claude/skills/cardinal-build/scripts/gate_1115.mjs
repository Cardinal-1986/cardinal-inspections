/* gate_1115.mjs — a REAL Chromium render of the drawer's bottom bar.

   jsdom proved the markup and the collapse behaviour. Only an engine answers
   the three things this build actually risks:
     1. Does the `lock` glyph PAINT? A data-cri button that never hydrates is a
        44px square of nothing — the "control that renders and does nothing"
        class, in its quietest form.
     2. Is it a 44px tap target, and is its ink above the icon floor on the
        drawer's own ground?
     3. Is the bar one row, with the stamp and the icon on opposite ends and no
        overflow — at a phone width, with the drawer actually open?

   ⚠ Written to go RED on 1114 rather than crash (BUG_CLASSES 37): 1114 has no
   .cr-df-out at all, and every probe is guarded so the control SAYS so.

   usage:  node gate_1115.mjs <file.html>
*/
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const lum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgb = s => {
  s = String(s || '');
  /* ⚠ Chromium hands back TWO forms and they use DIFFERENT SCALES:
     `rgb(13, 18, 32)` is 0-255, and `color(srgb 0.1004 0.1206 0.1476)` is 0-1.
     Parsing the second with a 0-255 reader reads #1a1f26 as very nearly black
     — which on a dark drawer produces a plausible, confident, wrong ratio.
     Caught on this gate's first run: it reported 5.97:1 for an icon whose real
     figure is different, and nothing about the output looked odd. */
  const c = /color\(\s*srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/.exec(s);
  if (c) return [c[1], c[2], c[3]].map(v => Math.round(Math.min(1, Math.max(0, parseFloat(v))) * 255));
  const m = /(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)/.exec(s);
  return m ? [+m[1], +m[2], +m[3]] : null;
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.goto(URL_, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2600);

/* open the drawer the way the burger opens it, and make sign-out visible the
   way showMain() does — both through the app's own elements, not by styling. */
await p.evaluate(() => {
  const so = document.getElementById('signOutBtn');
  if (so) so.style.display = 'block';
  const m = document.getElementById('navMenu');
  if (m) m.style.display = 'block';
});
await p.waitForTimeout(700);

const r = await p.evaluate(() => {
  const opaque = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return false;
                        const q = m[1].split(',').map(x => parseFloat(x));
                        return q.length < 4 || q[3] >= 0.999; };
  const groundOf = el => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      const bi = s.backgroundImage || '';
      const stops = [...bi.matchAll(/rgba?\([^)]+\)/g)].map(m => m[0]).filter(c => !/,\s*0\)$/.test(c));
      const bc = s.backgroundColor;
      const here = stops.concat(!bc || /rgba\(0, 0, 0, 0\)|transparent/.test(bc) ? [] : [bc]);
      if (here.some(opaque)) return here;
      if (here.length) return here;
    }
    return [];
  };
  const foot = document.querySelector('#navMenu [data-cr-footer]');
  const out  = document.getElementById('signOutBtn');
  const menu = document.getElementById('navMenu');
  if (!foot) return { err: 'no footer element' };
  const fr = foot.getBoundingClientRect();
  const svg = out ? out.querySelector('svg') : null;
  const orct = out ? out.getBoundingClientRect() : null;
  const srct = svg ? svg.getBoundingClientRect() : null;
  const fcs = getComputedStyle(foot);
  return {
    footText   : (foot.textContent || '').trim(),
    footChars  : (foot.textContent || '').trim().length,
    footRows   : Math.round(fr.height),
    footDisplay: fcs.display,
    footW      : Math.round(fr.width),
    stampFont  : parseFloat(fcs.fontSize),
    stampInk   : fcs.color,
    stampGround: groundOf(foot),
    outExists  : !!out,
    outShown   : orct ? (orct.width > 0 && orct.height > 0) : false,
    outW       : orct ? Math.round(orct.width) : null,
    outH       : orct ? Math.round(orct.height) : null,
    outRight   : orct ? Math.round(fr.right - orct.right) : null,
    hasSvg     : !!svg,
    svgW       : srct ? Math.round(srct.width) : null,
    svgH       : srct ? Math.round(srct.height) : null,
    svgPaths   : svg ? svg.querySelectorAll('path,rect,circle,line,polyline,polygon').length : 0,
    outInk     : out ? getComputedStyle(out).color : null,
    outGround  : out ? groundOf(out) : [],
    stillCri   : out ? out.hasAttribute('data-cri') : null,
    outText    : out ? (out.textContent || '').trim() : null,
    sameRow    : (orct && fr) ? (orct.top >= fr.top - 1 && orct.bottom <= fr.bottom + 1) : false,
    bodyOver   : document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    menuOver   : menu ? menu.scrollWidth > menu.clientWidth + 1 : null,
    secs       : [...document.querySelectorAll('#navMenu .navsec')]
                   .map(s => s.getAttribute('aria-expanded')),
    hiddenRows : document.querySelectorAll('#navMenu .navopt[data-crhide="1"]').length,
    shownRows  : [...document.querySelectorAll('#navMenu .navopt')]
                   .filter(e => getComputedStyle(e).display !== 'none').length
  };
}).catch(e => ({ err: String(e.message || e) }));

if (r.err) { ok(false, 'probe threw: ' + r.err); }
else {
  ok(!/—|&#8212;/.test(r.footText) && r.footChars <= 40,
     'the footer is one short line, not a paragraph (' + r.footChars + ' chars: "' + r.footText + '")');
  ok(/^v2026-\d\d-\d\d build \d+$/.test(r.footText),
     'and it is exactly the version stamp');
  ok(r.footDisplay === 'flex', 'the bar lays out as a row (display:' + r.footDisplay + ')');
  ok(r.footRows > 0 && r.footRows <= 60,
     'the bar is a single row, ' + r.footRows + 'px tall');

  ok(r.outExists, 'the sign-out control exists');
  ok(r.outShown, 'it is visible once showMain() unhides it');
  ok(r.sameRow, 'it sits on the same row as the stamp');
  ok(r.outRight != null && r.outRight >= 0 && r.outRight <= 20,
     'it is pushed to the right edge of the bar (' + r.outRight + 'px in)');
  ok(r.outW >= 44 && r.outH >= 44,
     'the tap target is at least 44px (' + r.outW + '×' + r.outH + ') — 592/1076 rule');

  ok(r.hasSvg, 'the `lock` glyph HYDRATED into a real <svg>');
  ok(r.svgPaths > 0, 'the glyph has drawn geometry (' + r.svgPaths + ' shapes), not an empty svg');
  ok(r.svgW > 0 && r.svgH > 0, 'and it paints at ' + r.svgW + '×' + r.svgH + 'px');
  ok(r.outText === '', 'it carries no text label — it is an icon (' + JSON.stringify(r.outText) + ')');
  ok(r.stillCri === false, 'data-cri was consumed by hydrate(), not left on the element');

  const ink = rgb(r.outInk);
  let worstIcon = null;
  for (const g of r.outGround) { const gr = rgb(g); if (!gr || !ink) continue;
    const v = ratio(ink, gr); if (!worstIcon || v < worstIcon.v) worstIcon = { v, g }; }
  ok(worstIcon && worstIcon.v >= 3.0,
     'the icon clears the 3.0:1 non-text floor' +
     (worstIcon ? ' (' + worstIcon.v.toFixed(2) + ':1 on ' + worstIcon.g + ')' : ' — no ground read'));

  const sink = rgb(r.stampInk);
  let worstText = null;
  for (const g of r.stampGround) { const gr = rgb(g); if (!gr || !sink) continue;
    const v = ratio(sink, gr); if (!worstText || v < worstText.v) worstText = { v, g }; }
  ok(worstText && worstText.v >= 4.5,
     'the version stamp clears the 4.5:1 body-text floor' +
     (worstText ? ' (' + worstText.v.toFixed(2) + ':1 on ' + worstText.g + ')' : ' — no ground read'));
  ok(r.stampFont >= 11, 'the stamp is >= 11px (' + r.stampFont + 'px) — the 1081 floor');

  ok(!r.bodyOver, 'the page does not scroll sideways');
  ok(r.menuOver === false, 'the drawer itself does not scroll sideways');

  ok(r.secs.length > 0 && r.secs.every(v => v === 'false'),
     'every section renders collapsed (' + r.secs.filter(v => v === 'true').length + ' expanded of ' +
     r.secs.length + ')');
  ok(r.shownRows === 0,
     'so no nav row is on screen until you tap a heading (' + r.shownRows + ' shown, ' +
     r.hiddenRows + ' hidden)');
}

await b.close();
console.log('\n' + (fail ? 'RED — ' + fail + ' failed, ' + pass + ' passed'
                         : 'GREEN — all ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
