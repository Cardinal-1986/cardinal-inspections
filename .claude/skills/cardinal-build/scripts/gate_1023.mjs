// gate_1023.mjs — proves the contract "N to fill" chip label clears the 4.5:1
// body-text floor on the ground it actually renders on (build 1023, finding 17;
// measured in Chromium since 1299, when .btn.dark had become an outline).
//
// Reads the TWO shipped facts and computes the ratio itself (self-contained WCAG
// 2.x; no dependency on contrast.py):
//   ground  = the background of .btn.dark (the chip is <button class="btn dark">)
//   label   = refreshFillChip's `btn.style.color = n ? <toFill> : <allFilled>`
// Asserts both states clear 4.5:1, and that the old failing inks are gone.
//
// Usage:
//   node gate_1023.mjs                 # working tree -> GREEN
//   node gate_1023.mjs <index.html>    # build-1022 copy -> RED (2.12:1 / 3.19:1)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const INDEX = process.argv[2] || path.join(REPO, 'index.html');
const src = fs.readFileSync(INDEX, 'utf8');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [R, G, B] = [f(r), f(g), f(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function ratio(a, b) {
  const la = lum(hexToRgb(a)), lb = lum(hexToRgb(b));
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// label: refreshFillChip -> btn.style.color = n ? '<toFill>' : '<allFilled>';
let toFill = null, allFilled = null;
{
  const at = src.indexOf('function refreshFillChip()');
  const seg = at === -1 ? '' : src.slice(at, at + 900);
  const m = seg.match(/btn\.style\.color\s*=\s*n\s*\?\s*'(#[0-9a-fA-F]{3,6})'\s*:\s*'(#[0-9a-fA-F]{3,6})'/);
  if (!m) fails.push('[extract] refreshFillChip label color line not found');
  else { toFill = m[1]; allFilled = m[2]; }
}

/* 1299: the ground is MEASURED, not read off a stylesheet. This gate used to
   regex `.btn.dark{background:#555}` -- and build 1222 (Theo: "Outline back")
   made .btn.dark an outline with a transparent fill, so the chip's real ground
   became the editor toolbar behind it and the regex found nothing. Text
   extraction cannot follow that; a browser can. Rendered in BOTH themes, and the
   ground is the first painted ancestor, the chip itself included. */
const grounds = {};
{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
  const SETUP = fs.readFileSync(path.join(__dirname, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' +
                fs.readFileSync(path.join(__dirname, 'e2e_mock_supa.js'), 'utf8');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
      ? r.fulfill({ status: 200, contentType: 'text/html', body: src }) : r.fulfill({ status: 200, body: '' }));
    if (theme === 'light') await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
    await p.addInitScript(SETUP);
    await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
    grounds[theme] = await p.evaluate(() => {
      try { hideAllViews(); } catch (e) {}
      const v = document.getElementById('editorView'); if (!v) return null;
      v.style.display = 'block';
      const b = document.getElementById('fillChipBtn'); if (!b) return null;
      b.style.display = 'inline-block';
      for (let e = b; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        const m = c.match(/rgba?\(([^)]+)\)/); if (!m) continue;
        const v4 = m[1].split(',').map(Number);
        if (v4.length === 4 && v4[3] < 0.95) continue;   // translucent: keep walking
        return '#' + v4.slice(0, 3).map(x => x.toString(16).padStart(2, '0')).join('');
      }
      return null;
    }).catch(() => null);
    await ctx.close();
  }
  await browser.close();
  for (const t of ['dark', 'light']) if (!grounds[t]) fails.push(`[render] no ground found behind #fillChipBtn (${t})`);
}

if (grounds.dark && grounds.light && toFill && allFilled) for (const [theme, ground] of Object.entries(grounds)) {
  const FLOOR = 4.5;
  const rTo = ratio(toFill, ground), rAll = ratio(allFilled, ground);
  ok(rTo >= FLOOR, `[to-fill · ${theme}] ${toFill} on ${ground} = ${rTo.toFixed(2)}:1, below the ${FLOOR}:1 body floor`);
  ok(rAll >= FLOOR, `[all-filled · ${theme}] ${allFilled} on ${ground} = ${rAll.toFixed(2)}:1, below the ${FLOOR}:1 body floor`);
  // the two old failing inks must be gone from this line
  ok(toFill.toLowerCase() !== '#e35c63', '[regress] to-fill must not be the old #e35c63 (2.12:1)');
  ok(allFilled.toLowerCase() !== '#6cb98f', '[regress] all-filled must not be the old #6cb98f (3.19:1)');
  console.error(`  (measured ${theme}: to-fill ${rTo.toFixed(2)}:1, all-filled ${rAll.toFixed(2)}:1 on ${ground})`);
}

if (fails.length) {
  console.error('RED — gate_1023 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1023: the fill-count chip label clears 4.5:1 on its rendered ground, both states, both themes.');
