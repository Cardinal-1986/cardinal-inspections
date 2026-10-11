#!/usr/bin/env node
/* gate_1292 — Buttons A, phase 1: one red main action; the rest are outlines.
     A  estimate add row: exactly ONE red-filled button; every other add button has no
        fill and a non-red, non-green outline (both themes)
     B  estimate phone bar: Save Draft / Email outline is not red (both themes)
     C  AR: non-primary buttons have no fill and no shadow (both themes)
     D  shared .chipbtn: Cancel on the new-project form has no fill (both themes)
   Usage: node gate_1292.mjs [index.html] — control: the 1291 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

const go = async (light, state, fn) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  try { await p.evaluate(async (s) => { await window.__sentinelStates.find(x => x.name === s).run(); }, state); } catch (e) {}
  await p.waitForTimeout(1200); const v = await p.evaluate(fn); await ctx.close(); return v; };
const isRed = c => { const m = String(c).match(/\d+(\.\d+)?/g); if (!m) return false; const [r, g, b, a] = m.map(Number); return (a === undefined || a > 0.1) && r > 150 && g < 120 && b < 130; };
const isGreen = c => { const m = String(c).match(/\d+/g); if (!m) return false; const [r, g, b] = m.map(Number); return g > 150 && r < 120; };
const clear = c => /rgba\(0, 0, 0, 0\)|transparent/.test(c);
for (const light of [false, true]) { const th = light ? 'light' : 'dark';
  const e = await go(light, 'estbuilder', () => { const s = k => { const c = getComputedStyle(k); return { t: k.textContent.trim(), bg: c.backgroundColor, bd: c.borderTopColor }; };
    return { add: [...document.querySelectorAll('.cr-est-items-head button')].filter(b => b.getBoundingClientRect().height && /^\+/.test(b.textContent.trim()) && b.closest('.cr-est-items-head').textContent.indexOf('From Library') !== -1).map(s),
      bar: [...document.querySelectorAll('.cr-est-phonebar button:not(.primary)')].map(s) }; });
  const reds = e.add.filter(b => isRed(b.bg)), rest = e.add.filter(b => !isRed(b.bg));
  ok(e.add.length >= 5 && reds.length === 1 && rest.every(b => clear(b.bg) && !isRed(b.bd) && !isGreen(b.bd)), `A  ${th}: one red add button, the rest plain outlines`, JSON.stringify({ n: e.add.length, red: reds.map(b => b.t), bad: rest.filter(b => !clear(b.bg) || isRed(b.bd) || isGreen(b.bd)).map(b => b.t + ' ' + b.bg + ' ' + b.bd) }));
  ok(e.bar.length === 2 && e.bar.every(b => !isRed(b.bd)), `B  ${th}: Save Draft / Email outline is not red`, JSON.stringify(e.bar.map(b => b.bd)));
  const a = await go(light, 'ar', () => [...document.querySelectorAll('#cr-ar-view .crar-btn:not(.primary):not(.ghost)')].filter(b => b.getBoundingClientRect().height).map(b => { const c = getComputedStyle(b); return { t: b.textContent.trim(), bg: c.backgroundColor, sh: c.boxShadow }; }));
  ok(a.length > 0 && a.every(b => clear(b.bg) && b.sh === 'none'), `C  ${th}: AR buttons are outlines`, JSON.stringify(a.slice(0, 3)));
  const c = await go(light, 'newproject', () => [...document.querySelectorAll('.chipbtn')].filter(b => b.getBoundingClientRect().height).map(b => ({ t: b.textContent.trim(), bg: getComputedStyle(b).backgroundColor })));
  ok(c.length > 0 && c.every(b => clear(b.bg)), `D  ${th}: .chipbtn has no fill`, JSON.stringify(c.slice(0, 3)));
}
await browser.close(); console.log(`GATE 1292 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
