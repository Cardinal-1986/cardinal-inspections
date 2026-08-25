/* gate_1063.mjs — the landing screenshot, both halves.

   Build 1060 gave the CANVAS a light ground and I proved it with a gate whose
   setup hid every sibling of the landing. That MANUFACTURED a short document,
   and on a real page the document is 2664px of #mainView, so body covered the
   whole capture and 1060 changed nothing anyone could see. This gate exists
   because that one lied, so it never touches the DOM to set a screen up: it
   navigates the way the app navigates and reads what it finds.

   Two halves, two different controls:
     A  backToLanding() did not call hideAllViews(), so #mainView stayed in
        flow behind the fixed pane. That was the "black slab" — the app's own
        home screen, not an empty background.
     B  #landingView was position:fixed, so the document was one screen and a
        full-page capture missed the landing's own scrolled content.

   Usage: node gate_1063.mjs [artifact]
   Controls: build 1060 fails 1-2 (A) and 3-4 (B); a tree with A but not B
   fails only 3-4.
*/
import { chromium } from 'playwright';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LIGHT = [247, 245, 242];

let pass = 0, fail = 0;
const check = (n, ok, d) => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n}${d ? '\n          ' + d : ''}`); } };
const near = (got, want) => Array.isArray(got) && want.every((v, i) => Math.abs(got[i] - v) <= 3);

async function land(browser, via) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.route(u => /^https?:/.test(String(u.href || u)), r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', () => {});
  await page.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(v => {
    try { localStorage.setItem('cr-mode', 'light'); } catch (_) {}
    document.documentElement.setAttribute('data-mode', 'light');
    // Navigate the way the APP navigates. No hiding siblings — that is the
    // exact shortcut that made 1060's gate agree with a build that did nothing.
    if (typeof window[v] === 'function') window[v]();
  }, via);
  await page.waitForTimeout(1500);

  const geo = await page.evaluate(v => {
    const mv = document.getElementById('mainView'), lv = document.getElementById('landingView');
    return {
      docH: document.documentElement.scrollHeight,
      mainView: mv ? getComputedStyle(mv).display : 'absent',
      landingPos: lv ? getComputedStyle(lv).position : 'absent',
      landingScrollH: lv ? lv.scrollHeight : 0,
      landingClientH: lv ? lv.clientHeight : 0,
      via: typeof window[v] === 'function',
    };
  }, via);

  let probes = null;
  try {
    const cdp = await page.context().newCDPSession(page);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 390, height: Math.min(geo.docH, 4000), scale: 1 },
    });
    probes = await page.evaluate(async ({ b64, h }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const px = y => Array.from(g.getImageData(4, Math.min(y, img.height - 1), 1, 1).data).slice(0, 3);
      return { mid: px(Math.round(h / 2)), bottom: px(h - 8) };
    }, { b64: data, h: Math.min(geo.docH, 4000) });
  } catch (e) { probes = { error: String(e.message).slice(0, 80) }; }

  await ctx.close();
  return { geo, probes };
}

(async () => {
  console.log(`gate_1063.mjs -> ${FILE}\n`);
  const browser = await chromium.launch({ executablePath: CHROME });

  /* ---- A: backToLanding must put the app away, like goToLanding does ---- */
  const back = await land(browser, 'backToLanding');
  check('1. backToLanding() hides #mainView — the slab was the app, not a background',
        back.geo.mainView === 'none', JSON.stringify(back.geo));
  check('2. and nothing dark is left below the landing on that path',
        near(back.probes.mid, LIGHT) && near(back.probes.bottom, LIGHT), JSON.stringify(back.probes));

  /* ---- B: the landing is a page, so a capture is the whole landing ---- */
  const go = await land(browser, 'goToLanding');
  check('3. the landing is in flow, not a viewport-locked pane',
        go.geo.landingPos === 'relative' || go.geo.landingPos === 'static', 'position is ' + go.geo.landingPos);
  check('4. so the document IS the landing — no internal scroller left behind',
        go.geo.landingScrollH > 844 && go.geo.landingClientH === go.geo.landingScrollH &&
        go.geo.docH === go.geo.landingScrollH,
        JSON.stringify(go.geo));
  check('5. and the capture stays light the whole way down',
        near(go.probes.mid, LIGHT) && near(go.probes.bottom, LIGHT), JSON.stringify(go.probes));

  /* ---- both paths must agree; two doors to one screen is how A survived ---- */
  check('6. both ways in produce the same document — the difference was the bug',
        back.geo.docH === go.geo.docH,
        `backToLanding ${back.geo.docH}px vs goToLanding ${go.geo.docH}px`);

  await browser.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
