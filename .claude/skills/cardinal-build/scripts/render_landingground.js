/* render_landingground.js -- written for build 809, landed with build 1060.

   809 never reached main; the fix it gates shipped at 1060 instead, scoped
   to the landing being on screen (see gate_1060.mjs for why).

   Proves the landing's ground survives past the first screen in an iPhone
   Full Page capture, and that dark mode did not move.

   Why Chromium and not jsdom: the ground is an !important declaration painting
   a position:fixed box, and the failure is a COMPOSITE -- content taller than
   the box, with body's var(--bg) showing through the difference. jsdom resolves
   neither the fixed box nor the paint, so it cannot see this bug or its fix.

   ⚠ WHAT THIS PROVES, AND WHAT IT DOES NOT. Corrected at 1063.
   It goes RED on 1056 (6/6) and GREEN from 1060 on, so it is a real guard for
   the canvas ground. It does NOT discriminate 1060 from 1063, and it never
   did: it walks the goToLanding() path, and on that path 1060 was already
   correct because hideAllViews() had put #mainView away. The defect 1063
   fixed lived on the OTHER path, backToLanding(), which this file never
   visits. gate_1063.mjs walks both and compares them.

   Do not read a green run here as "the landing screenshot is fine". Read it
   as "the canvas still has a light ground in light mode".

   Usage:  node render_landingground.js [path/to/index.html]
   Point it at build 1056 for a control that actually goes RED.
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
  /* ⚠ 1063 — THIS SETUP USED TO HIDE EVERY SIBLING OF THE LANDING, AND THAT IS
     WHY BUILD 1060 SHIPPED INERT. Hiding them manufactures a short document.
     On a real page #mainView is 2456px in flow behind the landing, so body
     covered the whole capture and 1060's canvas ground never showed — the
     gate agreed with a build that changed nothing anyone could see.

     It also set display directly, which is not a path the app has, so the
     body class goToLanding() sets was never applied and the footer it hides
     stayed in the capture: 1371px with a dark strip at the bottom, failing a
     correct build.

     Navigate the way the app navigates and read what you find. */
  await page.evaluate(() => {
    if (typeof goToLanding === 'function') { goToLanding(); return; }
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
