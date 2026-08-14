/* render_landingground.js -- build 809 gate.

   Proves the landing's ground survives past the first screen in an iPhone
   Full Page capture, and that dark mode did not move.

   Why Chromium and not jsdom: the ground is an !important declaration painting
   a position:fixed box, and the failure is a COMPOSITE -- content taller than
   the box, with body's var(--bg) showing through the difference. jsdom resolves
   neither the fixed box nor the paint, so it cannot see this bug or its fix.

   Usage:  node render_landingground.js [path/to/index.html]
   Point it at the previous build as a negative control -- it must go RED there.
*/
const { chromium } = require('playwright');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const LIGHT_GROUND = [247, 245, 242];   // #f7f5f2
const DARK_GROUND  = [9, 9, 12];        // #09090c
const VIEWPORT_H   = 844;               // one iPhone screen

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = Array.isArray(want)
    ? want.every((v, i) => Math.abs(got[i] - v) <= 2)
    : got === want;
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else    { fail++; console.log(`  FAIL  ${name}\n          got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
}

async function landingCapture(browser, { mode, width }) {
  const ctx = await browser.newContext({ viewport: { width, height: VIEWPORT_H }, deviceScaleFactor: 1 });
  await ctx.route(u => /^https?:/.test(u.href ? u.href : String(u)), r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', () => {});
  await page.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(m => {
    try { localStorage.setItem('cr-mode', m); } catch (_) {}
    document.documentElement.setAttribute('data-mode', m);
  }, mode);
  await page.evaluate(() => {
    document.querySelectorAll('body > div, body > section, body > header, body > nav').forEach(el => {
      if (el.id !== 'landingView') el.style.display = 'none';
    });
    const lv = document.getElementById('landingView');
    if (lv) { lv.style.display = 'block'; lv.removeAttribute('hidden'); }
  });
  await page.waitForTimeout(1200);

  const built = await page.evaluate(() => !!document.querySelector('#landingView .cr-lr'));
  if (!built) { await ctx.close(); throw new Error('landing did not build'); }

  const h = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, document.getElementById('landingView').scrollHeight));

  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height: h, scale: 1 },
  });

  // Sample the ground down the left gutter, where no card ever paints.
  const probes = await page.evaluate(async ({ b64, h }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const px = y => Array.from(g.getImageData(4, Math.min(y, img.height - 1), 1, 1).data).slice(0, 3);
    return { onScreen: px(600), justPast: px(900), midway: px(Math.round((844 + h) / 2)), bottom: px(h - 8) };
  }, { b64: data, h });

  await ctx.close();
  return { contentH: h, probes };
}

(async () => {
  console.log(`render_landingground.js -> ${FILE}\n`);
  const browser = await chromium.launch({ executablePath: CHROME });

  for (const width of [390, 1440]) {
    // ---- LIGHT: the ground must hold all the way down ----
    const light = await landingCapture(browser, { mode: 'light', width });
    console.log(`[light @${width}px] capture ${light.contentH}px tall (one screen = ${VIEWPORT_H}px)`);
    check(`light @${width} ground on screen`,        light.probes.onScreen, LIGHT_GROUND);
    check(`light @${width} ground just past screen`, light.probes.justPast, LIGHT_GROUND);
    check(`light @${width} ground midway down`,      light.probes.midway,   LIGHT_GROUND);
    check(`light @${width} ground at the bottom`,    light.probes.bottom,   LIGHT_GROUND);
    if (light.contentH <= VIEWPORT_H)
      console.log(`  NOTE  capture is only ${light.contentH}px -- past-screen probes are not meaningful`);

    // ---- DARK: must be exactly as it was ----
    const dark = await landingCapture(browser, { mode: 'dark', width });
    check(`dark @${width} ground on screen`,     dark.probes.onScreen, DARK_GROUND);
    check(`dark @${width} ground at the bottom`, dark.probes.bottom,   DARK_GROUND);
  }

  await browser.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
