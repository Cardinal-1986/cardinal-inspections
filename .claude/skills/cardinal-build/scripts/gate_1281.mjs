#!/usr/bin/env node
/* gate_1281 — the home Approvals card reads on the dark home screen (Theo's photo, 10 Oct).
     A  dark: the heading clears 4.5:1 against the card (was #1c1416 on navy, 1.16:1)
     B  dark: an approval is not a white slab, and its name and detail clear 4.5:1 on it
     C  light: heading, row, name and detail are exactly what they were (#1c1416 / #fff / #1d4f91 / #666)
   Usage: node gate_1281.mjs [index.html]  — control: the 1280 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 150000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const lum = (rgb) => { const m = String(rgb).match(/[\d.]+/g); if (!m) return 0; return m.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return +(((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2)); };
const firstStop = (bgi, bg) => { const m = String(bgi).match(/rgba?\([^)]*\)/g); return m && m.length ? m : [bg]; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const probe = async (light) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const v = await p.evaluate(() => { const c = document.getElementById('approvalsCard'); if (!c) return null; c.style.display = 'block';
    document.getElementById('approvalsList').innerHTML = '<div class="apprrow"><span class="apprbd"><b class="apprcli">Jacob</b><span class="apprdet">EST-2026-0914 — Estimate — Jacob · signed 23h ago · $5,000</span></span><button class="btn">Approve &amp; create contract</button></div>';
    const g = (s) => { const e = document.querySelector(s), k = getComputedStyle(e); return { color: k.color, bg: k.backgroundColor, bgi: k.backgroundImage }; };
    return { theme: document.documentElement.getAttribute('data-theme'), h3: g('#approvalsCard h3'), card: g('#approvalsCard'), row: g('.apprrow'), cli: g('.apprcli'), det: g('.apprdet') }; });
  await ctx.close(); return v;
};
const d = await probe(false), l = await probe(true);
if (!d || !l) { ok(false, 'approvals card found'); }
else {
  const worst = (ink, el) => Math.min(...firstStop(el.bgi, el.bg).filter(c => !/,\s*0\)$/.test(c)).map(c => ratio(ink, c)));
  const h3r = worst(d.h3.color, d.card);
  ok(d.theme !== 'rb-light' && h3r >= 4.5, 'A  dark: the Approvals heading clears 4.5:1 on its card', `${d.h3.color} → ${h3r}:1`);
  const white = d.row.bg === 'rgb(255, 255, 255)' && d.row.bgi === 'none';
  const nr = worst(d.cli.color, d.row), dr = worst(d.det.color, d.row);
  ok(!white && nr >= 4.5 && dr >= 4.5, 'B  dark: the approval row is not a white slab; name and detail clear 4.5:1', JSON.stringify({ row: d.row.bgi === 'none' ? d.row.bg : d.row.bgi.slice(0, 60), name: nr, detail: dr }));
  ok(l.theme === 'rb-light' && l.h3.color === 'rgb(28, 20, 22)' && l.row.bg === 'rgb(255, 255, 255)' && l.cli.color === 'rgb(29, 79, 145)' && l.det.color === 'rgb(102, 102, 102)',
     'C  light: heading, row, name and detail are unchanged', JSON.stringify({ theme: l.theme, h3: l.h3.color, row: l.row.bg, cli: l.cli.color, det: l.det.color }));
}
await browser.close();
console.log(`\nGATE 1281 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
