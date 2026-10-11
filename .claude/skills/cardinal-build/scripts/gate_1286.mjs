#!/usr/bin/env node
/* gate_1286 — the client page in the drawer's style, dark retail (Theo: option B).
     A  dark: no Georgia or monospace text on the client page
     B  dark: the client card, money card, Job Menu tiles and section cards are flat
        (no gradient, no drop shadow) — the money ring is exempt, it is a chart
     C  dark: the client card keeps its stage spine (left edge not the hairline)
     D  light (since 1290): the client page is flat too
   Usage: node gate_1286.mjs [index.html] — control: the 1285 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 150000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const SEL = ['.projinfo', '.dbmoney', '.dbrow', '.acxsec:not(.rvsec)', '.jabox', '.kpsec', '.crji-card', '.rvcard'];
const probe = async (light) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); }); } catch (e) {}
  await p.waitForTimeout(1200);
  const v = await p.evaluate((SEL) => { const R = document.getElementById('projectView'); if (!R) return null;
    const odd = []; for (const e of R.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (!r.width) continue; if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const f = getComputedStyle(e).fontFamily.split(',')[0]; if (/Georgia|monospace/i.test(f)) odd.push(String(e.className) + ':' + f); }
    const boxes = []; for (const s of SEL) for (const e of R.querySelectorAll(s)) { if (!e.getBoundingClientRect().height) continue; const k = getComputedStyle(e); boxes.push({ s, grad: /gradient/.test(k.backgroundImage), sh: k.boxShadow !== 'none' }); }
    const pi = R.querySelector('.projinfo'); const pk = pi && getComputedStyle(pi);
    return { theme: document.documentElement.getAttribute('data-theme'), odd, boxes, spine: pk && pk.borderLeftColor + ' ' + pk.borderLeftWidth }; }, SEL);
  await ctx.close(); return v;
};
const d = await probe(false), l = await probe(true);
ok(!!d && d.theme !== 'rb-light' && d.odd.length === 0, 'A  dark: no Georgia or monospace text on the client page', d && (d.odd.slice(0, 5).join(', ') || 'none'));
const bad = d ? d.boxes.filter(b => b.grad || b.sh) : [];
ok(!!d && d.boxes.length >= 15 && bad.length === 0, 'B  dark: client card, money, Job Menu tiles and sections are flat', d && `${d.boxes.length} boxes, ${bad.length} still glossy: ${[...new Set(bad.map(b => b.s))].join(', ')}`);
ok(!!d && d.spine && !/rgb\(34, 48, 71\) 1px/.test(d.spine), 'C  dark: the client card keeps its stage spine', d && d.spine);
ok(!!l && l.theme === 'rb-light' && l.boxes.length > 0 && !l.boxes.some(b => b.grad || b.sh), 'D  light (build 1290): the client page is flat too', l && `${l.boxes.filter(b => b.grad || b.sh).length} raised boxes`);
await browser.close();
console.log(`\nGATE 1286 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
