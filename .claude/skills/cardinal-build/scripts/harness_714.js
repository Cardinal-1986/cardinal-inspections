/* Gate for build 714 — the PO badge must stop rewriting the client profile every frame.
 *
 * Runs the SHIPPED cr-po-script block (extracted verbatim from the artifact, never
 * re-implemented) in real Chromium against a real profile DOM, and counts childList
 * mutations over a full second of animation frames. Chromium, not jsdom, because the
 * bug IS a requestAnimationFrame + MutationObserver loop.
 *
 * Negative control — MUST go red on the previous build:
 *   node harness714.js index.html            -> PASS
 *   node harness714.js index_prev713.html    -> FAIL
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ART = process.argv[2] || 'index.html';
const WATCHDOG = setTimeout(() => { console.error('GATE TIMEOUT'); process.exit(2); }, 60000);

function extractBlock(src, id) {
  const open = src.indexOf(`<script id="${id}">`);
  if (open === -1) throw new Error(`no <script id="${id}">`);
  const bodyStart = src.indexOf('>', open) + 1;
  const close = src.indexOf('</script>', bodyStart);
  if (close === -1) throw new Error('unterminated script block');
  return src.slice(bodyStart, close);
}

(async () => {
  const src = fs.readFileSync(ART, 'utf8');
  const code = extractBlock(src, 'cr-po-script');
  console.log(`artifact : ${path.basename(ART)}`);
  console.log(`cr-po-script extracted: ${code.length} chars`);
  if (code.length < 500) throw new Error('extractor captured too little — refusing to assert on it');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><body>
      <div id="projectView" style="display:block">
        <div class="clientcard"><h2 id="projName">ZZ Client</h2></div>
      </div>
    </body></html>`);

  // The exact state a loaded profile is in: PO already assigned, so from() returns
  // a number and ensure() is never reached — the branch the guard governs.
  await page.evaluate(() => {
    window.currentProject = { id: 'p1', checklist: JSON.stringify({ po: 1002 }) };
    window.parseCkAll = (p) => { try { return JSON.parse(p.checklist || '{}'); } catch (e) { return {}; } };
  });

  await page.addScriptTag({ content: code });

  const res = await page.evaluate(() => new Promise((resolve) => {
    setTimeout(() => {                       // let it paint the badge once
      let mutations = 0;
      const mo = new MutationObserver((recs) => { mutations += recs.length; });
      mo.observe(document.getElementById('projectView'), { childList: true, subtree: true });
      setTimeout(() => {                     // then watch a full second of frames
        mo.disconnect();
        const b = document.querySelectorAll('.cr-po-badge');
        resolve({
          mutations,
          badgeCount: b.length,
          badgeText: b[0] ? b[0].textContent : '(none)',
        });
      }, 1000);
    }, 400);
  }));

  await browser.close();

  let fails = 0;
  const check = (name, ok, detail) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
    if (!ok) fails++;
  };

  console.log('assertions:');
  check('badge rendered exactly once', res.badgeCount === 1, `found ${res.badgeCount}`);
  check('badge reads "PO 1002"', res.badgeText === 'PO 1002', `got "${res.badgeText}"`);
  check('settles — zero rewrites in 1s of frames', res.mutations === 0,
        `${res.mutations} mutations/sec`);

  clearTimeout(WATCHDOG);
  console.log(fails === 0 ? '\nPASS' : `\nFAIL (${fails})`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { clearTimeout(WATCHDOG); console.error('HARNESS ERROR:', e.message); process.exit(2); });
