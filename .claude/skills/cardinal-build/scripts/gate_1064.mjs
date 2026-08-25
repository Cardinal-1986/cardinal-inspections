/* gate_1064.mjs — the photo editor's tool bar reads outdoors.

   The sentinel found two of these; the third (.cr-ped-loading) it never saw,
   because a loading state is not on screen when a walker steps through the
   app. That one came from reading the block. So this gate checks ALL THREE and
   computes the ratio in Chromium against the ground the browser composites —
   not against the value in the stylesheet, which is the trap this project has
   paid for repeatedly.

   Usage: node gate_1064.mjs [artifact]
   Control: build 1063 fails 1-3 at 3.27 / 3.27 / 3.72 : 1.
*/
import { chromium } from 'playwright';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FLOOR = 4.5;   // all three are body-size text: 10.5px, 12px, 13px

let pass = 0, fail = 0;
const check = (n, ok, d) => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n}${d ? '\n          ' + d : ''}`); } };

(async () => {
  console.log(`gate_1064.mjs -> ${FILE}\n`);
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(u => /^https?:/.test(String(u.href || u)), r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', () => {});
  await page.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  /* Build the editor's real markup from its own stylesheet's classes and let
     Chromium composite it. Reading declared hex would prove nothing about what
     paints — an ancestor's ground is what a person actually sees behind text. */
  const out = await page.evaluate((floor) => {
    const sheet = document.getElementById('cr-ped-styles');
    if (!sheet) return { error: 'cr-ped-styles is not in this build' };

    const host = document.createElement('div');
    host.id = 'cr-ped';
    host.style.display = 'flex';
    host.innerHTML =
      '<div class="cr-ped-stage"><div class="cr-ped-loading" data-t="loading">Loading…</div></div>' +
      '<div class="cr-ped-tools">' +
        '<button class="cr-ped-tool ghost" data-t="ghost">↺ Left</button>' +
        '<span class="cr-ped-hint" data-t="hint">1×1</span>' +
      '</div>';
    document.body.appendChild(host);

    const lum = c => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => v / 255);
      const f = x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    // walk up for the first ancestor that actually PAINTS a ground —
    // background-color alone is not the background.
    const ground = el => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) return cs.backgroundColor;
      }
      return 'rgb(255, 255, 255)';
    };

    const rows = [];
    for (const el of host.querySelectorAll('[data-t]')) {
      const ink = getComputedStyle(el).color;
      const bg = ground(el);
      const a = lum(ink), b = lum(bg), hi = Math.max(a, b), lo = Math.min(a, b);
      rows.push({ t: el.dataset.t, ink, bg, ratio: +(((hi + 0.05) / (lo + 0.05)).toFixed(2)) });
    }
    host.remove();
    return { rows };
  }, FLOOR);

  if (out.error) {
    check('0. the photo editor stylesheet exists', false, out.error);
    for (let i = 1; i <= 4; i++) check(`${i}. (not reachable)`, false, 'no stylesheet');
  } else {
    const by = Object.fromEntries(out.rows.map(r => [r.t, r]));
    const one = (key, label) => {
      const r = by[key];
      check(`${label} clears the ${FLOOR}:1 floor`,
            !!r && r.ratio >= FLOOR,
            r ? `${r.ratio}:1 — ${r.ink} on ${r.bg}` : 'element not measured');
    };
    one('ghost',   '1. the rotate buttons ("↺ Left")');
    one('hint',    '2. the size hint ("1×1")');
    one('loading', '3. the loading line — the one the sentinel never saw');

    // the ghost must still read as QUIETER than an active tool, or the fix has
    // flattened a deliberate hierarchy into one weight.
    const active = await page.evaluate(() => {
      const s = document.getElementById('cr-ped-styles').textContent;
      return /\.cr-ped-tool\{[^}]*color:#c9bfa8/.test(s);
    });
    check('4. the active-tool ink is untouched, so the ghost still reads quieter', active,
          'the .cr-ped-tool resting ink changed — hierarchy lost');
  }

  await browser.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
