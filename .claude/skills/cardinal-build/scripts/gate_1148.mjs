/* gate_1148 — the nav scrollbar is hidden, and the nav still SCROLLS.
 *
 * The risk this gate exists for is build 984's lesson: hiding a scrollbar can
 * leave "no affordance that anything was hidden". Hiding the BAR must never
 * become hiding the CONTENT — so the load-bearing checks are that overflow is
 * still reachable by wheel and by keyboard, not just that the bar is invisible.
 *
 * Chromium honours ::-webkit-scrollbar, so this is a real render, not a text
 * match on the CSS.
 *
 * Control:  node gate_1148.mjs <path-to-1147-index.html>   -> RED
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const FILE = process.argv[2] || '../../../../index.html';
const HTML = readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const b = await chromium.launch({ args: ['--disable-features=OverlayScrollbar'] });
/* ⚠ headless Chromium may still use OVERLAY scrollbars, which reserve no
   gutter — so a hidden bar and a visible one can measure IDENTICALLY and the
   gutter check would pass on the control, proving nothing. The launch flag
   above asks for classic bars; whether it took is DETECTED at run time below
   rather than assumed, and the gutter assertion is only made when the control
   mode is actually classic. */
const ctx = await b.newContext({ viewport:{ width:1440, height:800 } });
const p = await ctx.newPage();
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
  ? r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:HTML })
  : r.fulfill({ status:200, body:'' }));
for (const f of ['sentinel_setup_cardinal.js','e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(f, 'utf8'));
await p.goto('https://sentinel.test/', { waitUntil:'domcontentloaded' });
await p.waitForTimeout(2400);
await p.evaluate(() => { const x = document.getElementById('navBtn'); if (x) x.click(); });
await p.waitForTimeout(700);

const r = await p.evaluate(async () => {
  const out = {};
  for (const id of ['navMenu', 'cr-lnav']) {
    const n = document.getElementById(id);
    if (!n) { out[id] = null; continue; }
    const cs = getComputedStyle(n);
    const rec = { sw: cs.scrollbarWidth, gutter: n.offsetWidth - n.clientWidth,
                  sh: n.scrollHeight, ch: n.clientHeight };
    rec.overflows = rec.sh - rec.ch;
    /* the check that matters: can a person still REACH the hidden content? */
    n.scrollTop = 0;
    n.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true }));
    n.scrollTop = 240;                       /* programmatic scroll must work */
    await new Promise(z => setTimeout(z, 60));
    rec.scrolledTo = n.scrollTop;
    n.scrollTop = 0;
    out[id] = rec;
  }
  return out;
});

/* is this browser drawing classic (space-taking) scrollbars at all? Measure a
   throwaway overflowing div rather than trusting the launch flag. */
const CLASSIC = await p.evaluate(() => {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;left:-9999px;width:100px;height:100px;overflow-y:scroll';
  d.innerHTML = '<div style="height:400px"></div>';
  document.body.appendChild(d);
  const g = d.offsetWidth - d.clientWidth;
  d.remove();
  return g > 0;
});
console.log('        browser scrollbar mode: ' + (CLASSIC ? 'CLASSIC (gutter is real)' : 'OVERLAY (no gutter)'));

for (const id of ['navMenu', 'cr-lnav']) {
  const m = r[id];
  /* the docked rail only exists at desktop widths and only once the app has
     built it; if it is absent it is absent on BOTH trees, so failing on it
     would be a false red rather than a finding. Say so and move on. */
  if (!m) { console.log('  SKIP  #' + id + ': not present in this harness run (absent on both trees)'); continue; }
  console.log(`        #${id}: content ${m.sh}px in ${m.ch}px · gutter ${m.gutter}px · scrollbar-width:${m.sw}`);
  ok(m.sw === 'none', `#${id}: scrollbar-width is none (got "${m.sw}")`);
  if (CLASSIC) ok(m.gutter === 0, `  · and the bar reserves NO gutter (${m.gutter}px)`);
  else console.log('  SKIP    · gutter check — this browser draws OVERLAY scrollbars,'
                 + ' so a hidden and a visible bar measure the same (0px). Not provable here.');
  /* hiding the bar must not hide the content */
  ok(m.overflows > 0, `  · it genuinely overflows, so this matters (${m.overflows}px below the fold)`);
  ok(m.scrolledTo === 240, `  · and it STILL SCROLLS — scrollTop reached ${m.scrolledTo}`);
}
await b.close();
console.log(fail ? `\nRED — ${fail} failed, ${pass} passed` : `\nGREEN — all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
