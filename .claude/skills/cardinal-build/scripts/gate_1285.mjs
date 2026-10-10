#!/usr/bin/env node
/* gate_1285 — Team Calendar arrows + Activity panel in the drawer's style, dark retail.
     A  dark: both month arrows are flat panels (not Cardinal red, no shadow), ≥4.5:1 glyph
     B  dark: the Activity panel is flat (no drop shadow) with the red left edge
     C  light: the arrows are still red and the Activity panel still raised
   Usage: node gate_1285.mjs [index.html] — control: the 1284 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 150000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const lum = (rgb) => { const m = String(rgb).match(/[\d.]+/g); return m.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return +(((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2)); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const probe = async (light) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  const v = await p.evaluate(() => { const g = (e) => { const k = getComputedStyle(e); return { bg: k.backgroundColor, bgi: k.backgroundImage, sh: k.boxShadow, c: k.color, bl: k.borderLeftColor + ' ' + k.borderLeftWidth }; };
    return { theme: document.documentElement.getAttribute('data-theme'), arrows: [...document.querySelectorAll('#mainView .teamcal .minical .calnav')].map(g), act: document.querySelector('#mainView .actcard') && g(document.querySelector('#mainView .actcard')) }; });
  await ctx.close(); return v;
};
const d = await probe(false), l = await probe(true);
ok(d.theme !== 'rb-light' && d.arrows.length === 2 && d.arrows.every(a => a.bg !== 'rgb(200, 32, 46)' && a.sh === 'none' && ratio(a.c, a.bg) >= 4.5), 'A  dark: both month arrows are flat panels with a readable glyph', JSON.stringify(d.arrows.map(a => ({ bg: a.bg, r: ratio(a.c, a.bg) }))));
ok(!!d.act && d.act.sh === 'none' && /rgb\(200, 32, 46\) 3px/.test(d.act.bl), 'B  dark: the Activity panel is flat with the red edge', JSON.stringify(d.act && { sh: d.act.sh.slice(0, 30), bl: d.act.bl }));
ok(l.theme === 'rb-light' && l.arrows.length === 2 && l.arrows.every(a => a.bg !== 'rgb(15, 21, 33)') && !!l.act && l.act.bl.indexOf('3px') === -1, 'C  light: arrows and Activity untouched', JSON.stringify({ a: l.arrows.map(a => a.bg), act: l.act && l.act.bl }));
await browser.close();
console.log(`\nGATE 1285 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
