#!/usr/bin/env node
/* gate_1294 — time on job (Theo's pick 2B).
     A  window.CardinalPunchTime.sum: closed visits add up; an open visit from TODAY
        counts "so far"; an open visit from an EARLIER day counts NOTHING (forgotten check-out)
     B  the punch card lists each visit and the total (3h 30m + 1h 50m = 5h 20m · 2 visits)
     C  the Punch List row carries the total ("5h 20m on site") and the live one ("so far")
     D  the visit log is readable (≥4.5:1) on its ground, dark and light
   Seed: gate_1294_seed.js (the sentinel seed + two closed visits on i4).
   Usage: node gate_1294.mjs [index.html] — control: the 1293 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'gate_1294_seed.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
const run = async (light) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await p.waitForTimeout(1200);
  const unit = await p.evaluate(() => { const T = window.CardinalPunchTime; if (!T) return null;
    const now = new Date(); const d = x => x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2);
    const y = new Date(now.getTime() - 86400000 * 2);
    const closed = T.sum([{ in: '2026-10-07T12:10:00Z', out: '2026-10-07T15:40:00Z' }, { in: '2026-10-08T12:05:00Z', out: '2026-10-08T13:55:00Z' }]);
    const live = T.sum([{ in: new Date(now.getTime() - 40 * 60000).toISOString(), out: null, day: d(now) }], now);
    const stale = T.sum([{ in: y.toISOString(), out: null, day: d(y) }], now);
    return { closed: T.fmt(closed.ms) + '/' + closed.visits, live: T.fmt(live.live), stale: stale.ms + '/' + stale.stale }; }).catch(() => null);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.pl-row')].map(r => r.textContent.replace(/\s+/g, ' '))).catch(() => []);
  let card = null;
  try { await p.evaluate(() => window.CardinalPunchCard.open('i4')); await p.waitForTimeout(1200);
    card = await p.evaluate(() => { const l = document.querySelector('#cr-pk .pkvlog'); if (!l) return { text: '' };
      const r = l.querySelector('.pkvl'); const k = r && getComputedStyle(r);
      let g = null, e = l; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)/.test(c)) { g = c; break; } e = e.parentElement; }
      return { text: l.innerText.replace(/\s+/g, ' '), ink: k && k.color, tot: getComputedStyle(l.querySelector('.pkvtot')).color, g }; }); } catch (e) {}
  await ctx.close(); return { unit, rows, card };
};
const d = await run(false), l = await run(true);
ok(d.unit && d.unit.closed === '5h 20m/2' && d.unit.live === '40m' && d.unit.stale === '0/true', 'A  the sum: closed visits add, today\'s open counts so far, a forgotten check-out counts nothing', JSON.stringify(d.unit));
ok(d.card && /3h 30m/.test(d.card.text) && /1h 50m/.test(d.card.text) && /Total 5h 20m · 2 visits/.test(d.card.text), 'B  the card lists each visit and the total', d.card && d.card.text.slice(0, 160));
ok(d.rows.some(r => /Soffit vent swap.*5h 20m on site/.test(r)) && d.rows.some(r => /Fix storm door.*so far/.test(r)), 'C  the Punch List rows carry the total and the live time', JSON.stringify(d.rows.map(r => r.slice(-60))));
for (const [th, r] of [['dark', d], ['light', l]]) {
  const a = r.card && r.card.ink && r.card.g ? ratio(r.card.ink, r.card.g) : 0, b = r.card && r.card.tot && r.card.g ? ratio(r.card.tot, r.card.g) : 0;
  ok(a >= 4.5 && b >= 4.5, `D  ${th}: the visit log is readable`, `${a}:1 / total ${b}:1 on ${r.card && r.card.g}`); }
await browser.close(); console.log(`GATE 1294 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
