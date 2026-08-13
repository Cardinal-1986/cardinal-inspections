/* Build 719 fit check — do the renamed buttons still fit their row?
 *
 * The change is label text only (no CSS), so the question is width, not colour.
 * Measures both buttons in the REAL cascade (whole artifact loaded in Chromium)
 * at Theo's three widths. No screenshot: page.screenshot() blocks on
 * document.fonts.ready, and stubbing the webfont responses does not release it.
 *
 *   node measure_719.js <artifact>
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ART = process.argv[2] || 'index.html';
const WIDTHS = [390, 1194, 1280];   // iPhone · Theo's iPad · desktop
const WATCHDOG = setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 90000);

(async () => {
  const html = fs.readFileSync(ART, 'utf8');
  // Read the gold button's label OUT OF THE ARTIFACT. Hardcoding it made the
  // "before" run report the new label — a rig that reports the answer you
  // expected rather than the one the file contains.
  // Scope to the cr-est module: a bare /btn\.innerHTML = '...'/ matches the FIRST
  // such line in a 3.9MB file, which is a different button ("Copy") entirely.
  const anchor = html.indexOf("btn.id = 'cr-est-new-btn'");
  const mLabel = anchor === -1 ? null
    : html.slice(anchor, anchor + 400).match(/btn\.innerHTML = '([^']*)';/);
  const goldLabel = mLabel
    ? mLabel[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    : '(label not found)';
  console.log(`gold label in artifact: "${goldLabel}"`);
  const browser = await chromium.launch({ headless: true });
  console.log(`artifact: ${path.basename(ART)}`);

  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 700 } });
    await page.route('**/*', (route) =>
      route.request().url().startsWith('http://cardinal.render/')
        ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
        : route.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
    await page.goto('http://cardinal.render/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1200);

    const m = await page.evaluate((goldLabel) => {
      document.querySelectorAll('#loginView, #landingView').forEach(e => {
        e.style.display = 'none'; e.classList.remove('open');
      });
      const pv = document.getElementById('projectView');
      if (pv) pv.style.display = 'block';
      const tab = document.getElementById('tab-estimates');
      if (tab) tab.style.display = 'block';
      const red = document.getElementById('pNewEstimateBtn');
      if (!red) return { err: 'no #pNewEstimateBtn' };
      // cr-est injects the gold button at runtime; add the real element if boot
      // did not get that far, so the pair is measured as it ships.
      let gold = document.getElementById('cr-est-new-btn');
      if (!gold) {
        gold = document.createElement('button');
        gold.id = 'cr-est-new-btn';
        gold.type = 'button';
        gold.textContent = goldLabel;
        red.parentNode.insertBefore(gold, red.nextSibling);
      }
      const rr = red.getBoundingClientRect(), gr = gold.getBoundingClientRect();
      const host = (red.closest('div') || document.body).getBoundingClientRect();
      const cs = getComputedStyle(red);
      return {
        redText: red.textContent.trim(), goldText: gold.textContent.trim(),
        redW: Math.round(rr.width), goldW: Math.round(gr.width),
        pairW: Math.round(rr.width + gr.width),
        hostW: Math.round(host.width),
        wraps: Math.abs(rr.top - gr.top) > 6,
        redFont: cs.fontSize,
        clippedRed: red.scrollWidth > red.clientWidth + 1,
        clippedGold: gold.scrollWidth > gold.clientWidth + 1,
      };
    }, goldLabel);
    await page.close();
    if (m.err) { console.log(`  ${w}px: ${m.err}`); continue; }
    console.log(`  ${String(w).padStart(4)}px  red "${m.redText}" ${m.redW}px · ` +
      `gold "${m.goldText}" ${m.goldW}px · pair ${m.pairW}px in ${m.hostW}px · ` +
      `wraps=${m.wraps} clipped=${m.clippedRed || m.clippedGold}`);
  }
  await browser.close();
  clearTimeout(WATCHDOG);
})().catch((e) => { clearTimeout(WATCHDOG); console.error('ERROR:', e.message); process.exit(2); });
