#!/usr/bin/env node
/* gate_1283 — the home screen in the drawer's style (Theo: option B), dark retail.
     A  dark: no Georgia and no monospace text left on the home screen or the brand title
     B  dark: every home card is a flat panel — no gradient, no drop shadow, a red left edge
     C  dark: card headings are white, ≥4.5:1 on the panel
     D  light (since 1290): the light twin — Segoe titles, flat cards
   Usage: node gate_1283.mjs [index.html]  — control: the 1282 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 150000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const probe = async (light) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1400 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  const v = await p.evaluate(() => {
    const odd = [];
    for (const e of document.querySelectorAll('#mainView *, #brandTitle *')) {
      const b = e.getBoundingClientRect(); if (!b.width) continue;
      if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const f = getComputedStyle(e).fontFamily; if (/Georgia|monospace|Courier|Consolas/i.test(f.split(',')[0])) odd.push((e.className || e.tagName) + ':' + f.split(',')[0]);
    }
    const cards = [...document.querySelectorAll('#mainView .pipecard')].filter(e => e.getBoundingClientRect().height > 0).map(e => { const k = getComputedStyle(e); return { grad: /gradient/.test(k.backgroundImage), sh: k.boxShadow, bl: k.borderLeftColor + ' ' + k.borderLeftWidth, bg: k.backgroundColor }; });
    const t = document.querySelector('#mainView .pipetitle'); const tf = t ? getComputedStyle(t) : null;
    return { theme: document.documentElement.getAttribute('data-theme'), odd, cards, title: tf && { f: tf.fontFamily.split(',')[0], c: tf.color } };
  });
  await ctx.close(); return v;
};
const lum = (rgb) => { const m = String(rgb).match(/[\d.]+/g); return m.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return +(((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2)); };
const d = await probe(false), l = await probe(true);
ok(d.theme !== 'rb-light' && d.odd.length === 0, 'A  dark: no Georgia or monospace text left on the home screen', d.odd.slice(0, 6).join(', ') || 'none');
ok(d.cards.length >= 5 && d.cards.every(c => !c.grad && c.sh === 'none' && /rgb\(200, 32, 46\) 3px/.test(c.bl)), 'B  dark: every home card is flat with a red left edge', JSON.stringify(d.cards.slice(0, 2)));
const tr = d.title && d.cards[0] ? ratio(d.title.c, d.cards[0].bg) : 0;
ok(tr >= 4.5, 'C  dark: card headings clear 4.5:1 on the panel', d.title && `${d.title.c} on ${d.cards[0] && d.cards[0].bg} → ${tr}:1`);
ok(l.theme === 'rb-light' && l.title && !/Georgia/.test(l.title.f) && l.cards.length > 0 && l.cards.every(c => !c.grad && c.sh === 'none'), 'D  light (build 1290): Segoe titles and flat cards, like dark', JSON.stringify({ f: l.title && l.title.f, card: l.cards[0] }));
await browser.close();
console.log(`\nGATE 1283 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
