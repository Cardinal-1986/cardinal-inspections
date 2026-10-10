#!/usr/bin/env node
/* gate_1284 — the top bar in the drawer's style, dark retail (Theo: option B).
     A  dark: the header ground is flat (no gradient, no drop shadow)
     B  dark: the + and search buttons are flat (no gradient, no shadow) and still 44px
     C  dark: the + glyph is white on Cardinal red, ≥4.5:1
     D  light (since 1290): the header ground is flat too
   Usage: node gate_1284.mjs [index.html] — control: the 1283 tree (RED, no crash) */
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
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  const v = await p.evaluate(() => { const g = (s) => { const e = document.querySelector(s); if (!e) return null; const k = getComputedStyle(e), r = e.getBoundingClientRect(); return { bgi: k.backgroundImage, bg: k.backgroundColor, sh: k.boxShadow, c: k.color, w: Math.round(r.width), h: Math.round(r.height) }; };
    return { theme: document.documentElement.getAttribute('data-theme'), head: g('header.site'), plus: g('#addProjectBtn'), lens: g('#cr-hd2-lens') }; });
  await ctx.close(); return v;
};
const d = await probe(false), l = await probe(true);
ok(d.theme !== 'rb-light' && d.head && !/gradient/.test(d.head.bgi) && d.head.sh === 'none', 'A  dark: the header ground is flat', JSON.stringify(d.head && { bgi: d.head.bgi.slice(0, 50), sh: d.head.sh.slice(0, 40) }));
ok(d.plus && d.lens && [d.plus, d.lens].every(b => !/gradient/.test(b.bgi) && b.sh === 'none' && b.h >= 44 && b.w >= 44), 'B  dark: + and search are flat and still 44px', JSON.stringify([d.plus, d.lens].map(b => b && { bgi: b.bgi.slice(0, 20), sh: b.sh.slice(0, 20), w: b.w, h: b.h })));
const pr = d.plus ? ratio(d.plus.c, d.plus.bg) : 0;
ok(pr >= 4.5 && d.plus.bg === 'rgb(200, 32, 46)', 'C  dark: the + glyph is white on Cardinal red, ≥4.5:1', d.plus && `${d.plus.c} on ${d.plus.bg} → ${pr}:1`);
ok(l.theme === 'rb-light' && l.head && !/gradient/.test(l.head.bgi), 'D  light (build 1290): the header ground is flat too', JSON.stringify(l.head && l.head.bgi.slice(0, 60)));
await browser.close();
console.log(`\nGATE 1284 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
