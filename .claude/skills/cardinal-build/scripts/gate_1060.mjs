/* gate_1060.mjs -- build 1060.

   Build 1060 gives the CANVAS a light ground so a full-page screenshot of the
   landing stops ending in a black slab. render_landingground.js proves that
   half. This gate proves the OTHER half, which is the half that nearly
   shipped a regression:

   `data-mode` is the LANDING theme and it outlives the landing. An unscoped
   `html[data-mode="light"]{background:#f7f5f2}` therefore paints the canvas
   light on every APP screen too -- and with the app in its dark default,
   body's #09090c covers the content but the rubber-band overscroll goes
   light. That is build 429's bug in reverse.

   So the rule is scoped to the landing actually being up. If that scoping
   ever stops matching, check 1 goes red (the slab is back). If the scoping
   ever stops CONSTRAINING, checks 2-3 go red (the leak is back). Neither can
   fail silently.

   Usage: node gate_1060.mjs [path/to/index.html]
   Controls: build 1056 fails check 1; an unscoped tree fails checks 2-3.
*/
import { chromium } from 'playwright';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LIGHT = 'rgb(247, 245, 242)';
const DARK  = 'rgb(9, 9, 12)';

let pass = 0, fail = 0;
const check = (name, got, want) => {
  if (got === want) { pass++; console.log(`  PASS  ${name}  (${got})`); }
  else { fail++; console.log(`  FAIL  ${name}\n          got ${got}\n          want ${want}`); }
};

async function canvasIn(browser, { mode, theme, landing }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(u => /^https?:/.test(String(u.href || u)), r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', () => {});
  await page.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([m, t, up]) => {
    try { localStorage.setItem('cr-mode', m); } catch (_) {}
    document.documentElement.setAttribute('data-mode', m);
    if (t === 'rb-light') document.documentElement.setAttribute('data-theme', 'rb-light');
    else document.documentElement.removeAttribute('data-theme');
    const lv = document.getElementById('landingView');
    if (lv) lv.style.display = up ? 'block' : 'none';
  }, [mode, theme, landing]);
  await page.waitForTimeout(900);
  // BUG_CLASSES 37: never let a missing element throw before a line is printed.
  const got = await page.evaluate(() => {
    const lv = document.getElementById('landingView');
    if (!lv) return 'NO-LANDINGVIEW';
    return getComputedStyle(document.documentElement).backgroundColor;
  });
  await ctx.close();
  return got;
}

const src = await (await import('node:fs/promises')).readFile(FILE, 'utf8');

(async () => {
  console.log(`gate_1060.mjs -> ${FILE}\n`);
  const browser = await chromium.launch({ executablePath: CHROME });

  check('1. landing up, light mode -> canvas is light (the slab is fixed)',
        await canvasIn(browser, { mode: 'light', theme: 'dark', landing: true }), LIGHT);

  check('2. landing hidden, light mode, dark app -> canvas stays dark (no light overscroll)',
        await canvasIn(browser, { mode: 'light', theme: 'dark', landing: false }), DARK);

  check('3. landing hidden, dark mode, dark app -> canvas dark, as before',
        await canvasIn(browser, { mode: 'dark', theme: 'dark', landing: false }), DARK);

  check('4. landing up, dark mode -> canvas dark, dark mode untouched',
        await canvasIn(browser, { mode: 'dark', theme: 'dark', landing: true }), DARK);

  await browser.close();

  check('5. the canvas rule is declared exactly once',
        String(src.split('html[data-mode="light"]:not(:has(#landingView').length - 1), '1');

  check('6. the original pane rule survives untouched',
        String(src.split('html[data-mode="light"] #landingView{background:#f7f5f2 !important}').length - 1), '1');

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
