#!/usr/bin/env node
/* gate_1297 — the load-the-truck list (Theo's pick 5B).
     A  the punch card shows its Bring list with the loaded count (1 / 3)
     B  ticking a line saves it (truck[i].d flips, with who)
     C  + Add item adds a line through the card's save path
     D  the route page shows one "Load the truck" list for its day, by stop, and a tick there saves
     E  route lines are ≥44px and readable, dark and light
   Seed: gate_1297_seed.js (sentinel seed + truck lists on i5 and on tk1, booked the first working day).
   Usage: node gate_1297.mjs [index.html] — control: the 1296 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'gate_1297_seed.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const boot = async (light) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  p.on('dialog', d => d.type() === 'prompt' ? d.accept('Ladder jacks') : d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await p.waitForTimeout(800); return { ctx, p };
};
const tk = (p, id) => p.evaluate((id) => { const P = window.CardinalPunch; const r = P && P.rows ? P.rows().filter(x => x.id === id)[0] : null; return r && Array.isArray(r.truck) ? r.truck.map(x => (x.d ? '1' : '0') + ':' + x.t + (x.d && x.by ? '@' : '')) : null; }, id).catch(() => null);
for (const light of [false, true]) {
  const th = light ? 'light' : 'dark';
  const { ctx, p } = await boot(light);
  if (!light) {
    try { await p.evaluate(() => window.CardinalPunchCard.open('i5')); await p.waitForTimeout(1200); } catch (e) {}
    const head = await p.evaluate(() => { const e = document.querySelector('#pkSecTruck'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; }).catch(() => '');
    ok(/BRING/i.test(head) && /1\s*\/\s*3 loaded/i.test(head) && /Weatherstrip/.test(head), 'A  the card shows the Bring list and its count', head.slice(0, 120));
    await p.evaluate(() => { const b = document.querySelector('#pkSecTruck [data-truck="1"]'); if (b) b.click(); }).catch(() => {}); await p.waitForTimeout(800);
    const t1 = await tk(p, 'i5');
    ok(t1 && t1[1] === '1:Weatherstrip, 1 roll@', 'B  ticking a line saves it, with who', JSON.stringify(t1));
    await p.evaluate(() => { const b = document.querySelector('#pkSecTruck [data-act="addtruck"]'); if (b) b.click(); }).catch(() => {}); await p.waitForTimeout(900);
    const t2 = await tk(p, 'i5');
    ok(t2 && t2.length === 4 && t2[3] === '0:Ladder jacks', 'C  + Add item adds a line', JSON.stringify(t2));
    try { await p.evaluate(() => window.CardinalPunchCard.close && window.CardinalPunchCard.close()); } catch (e) {}
  }
  let rt = '';
  try { await p.evaluate(() => window.CardinalRoute.open('curtis@cardinalrenovations.net')); await p.waitForTimeout(1500);
    rt = await p.evaluate(() => { const e = document.querySelector('#rtTruck'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; }); } catch (e) {}
  const lines = await p.evaluate(() => [...document.querySelectorAll('#rtTruck .rttk')].map(b => { const k = getComputedStyle(b); let g = null, e = b; while (e) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\(0, 0, 0, 0\)/.test(c)) { g = c; break; } e = e.parentElement; } return { h: Math.round(b.getBoundingClientRect().height), c: k.color, g }; })).catch(() => []);
  if (!light) {
    await p.evaluate(() => { const b = document.querySelector('#rtTruck .rttk:not(.d)'); if (b) b.click(); }).catch(() => {}); await p.waitForTimeout(900);
    const t3 = await tk(p, 'tk1'), after = await p.evaluate(() => { const e = document.querySelector('#rtTruck h2 small'); return e ? e.textContent : ''; }).catch(() => '');
    ok(/Load the truck/.test(rt) && /1 of 2 loaded/.test(rt) && /Roof sealant/.test(rt) && t3 && t3[1] === '1:Roof sealant, 2 tubes@' && after === '2 of 2 loaded',
      'D  the route page lists the day\'s truck by stop, and a tick there saves', JSON.stringify({ rt: rt.slice(0, 110), t3, after }));
  }
  const worst = lines.length ? Math.min(...lines.map(x => ratio(x.c, x.g))) : 0;
  ok(lines.length >= 2 && lines.every(x => x.h >= 44) && worst >= 4.5, `E  ${th}: route truck lines are 44px and readable`, `${lines.length} lines, worst ${worst}:1`);
  await ctx.close();
}
await browser.close(); console.log(`GATE 1297 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
