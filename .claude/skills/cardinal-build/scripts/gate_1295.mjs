#!/usr/bin/env node
/* gate_1295 — the rain flag (Theo's pick 7B).
     A  the TWO copies of the wet rule agree: CardinalWx.flag (index.html) and
        wxFlag (api/punch-buzz.js) on the same 20 days
     B  a wet forecast for today puts "Rain 80%" on the row of the job booked today,
        and a dry one does not
     C  the same job's card shows the chip on its dispatch line
     D  planBuzzes' 3pm Plan names the wet job for that day; with no forecast it adds nothing
     E  the chip is readable on its row, dark and light
   The forecast is seeded through the app's OWN cache key (cr-dispwx), so nothing
   leaves the rig.
   Usage: node gate_1295.mjs [index.html] [api/punch-buzz.js] — control: the 1294 pair (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync, existsSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const API = process.argv[3] || join(HERE, '../../../../api/punch-buzz.js');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
let M = null; try { if (existsSync(API)) M = await import(pathToFileURL(API).href + '?t=' + Date.now()); } catch (e) { console.log('  (could not load api: ' + e.message + ')'); }
const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
const TABLE = {}; [[0, 10], [1, 55], [2, 20], [3, 49], [45, 50], [51, 30], [61, 80], [63, 100], [67, 0], [71, 40], [75, 90], [80, 70], [82, 10], [85, 60], [86, 5], [95, 60], [96, 20], [99, 100], [3, 0], [2, 50]]
  .forEach(([c, p], i) => { TABLE['2026-11-' + ('0' + (i + 1)).slice(-2)] = { c, p }; });
const dayKey = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const run = async (light, wet) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  const today = dayKey(new Date());
  await p.addInitScript(([t, wet, light, table]) => { try { const days = Object.assign({}, table); days[t] = wet ? { c: 61, p: 80 } : { c: 1, p: 5 };
    localStorage.setItem('cr-dispwx', JSON.stringify({ at: Date.now(), days })); if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} }, [today, wet, light, TABLE]);
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await p.waitForTimeout(1200);
  const flags = await p.evaluate((ks) => { const W = window.CardinalWx; return W && W.flag ? ks.map(k => W.flag(k)) : null; }, Object.keys(TABLE)).catch(() => null);
  const row = await p.evaluate(() => { const r = [...document.querySelectorAll('.pl-row')].find(x => /Fix storm door/.test(x.textContent)); if (!r) return null;
    const c = r.querySelector('.pl-flag.rain'); let g = null, e = r; while (e) { const b = getComputedStyle(e).backgroundColor; if (!/rgba\(0, 0, 0, 0\)/.test(b)) { g = b; break; } e = e.parentElement; }
    return { chip: c ? c.textContent : '', ink: c && getComputedStyle(c).color, g }; }).catch(() => null);
  let card = '';
  try { await p.evaluate(() => window.CardinalPunchCard.open('i5')); await p.waitForTimeout(1000); card = await p.evaluate(() => { const b = document.querySelector('#cr-pk .pkfold .pkrain'); return b ? b.textContent : ''; }); } catch (e) {}
  await ctx.close(); return { flags, row, card };
};
const dw = await run(false, true), dd = await run(false, false), lw = await run(true, true);
const apiFlags = M && M.wxFlag ? Object.keys(TABLE).map(k => M.wxFlag(TABLE, k)) : null;
ok(dw.flags && apiFlags && JSON.stringify(dw.flags) === JSON.stringify(apiFlags) && dw.flags.filter(Boolean).length >= 8 && dw.flags.filter(x => !x).length >= 4,
  'A  CardinalWx.flag and wxFlag agree on 20 days (and the set has both wet and dry)', JSON.stringify(dw.flags && apiFlags ? Object.keys(TABLE).map((k, i) => dw.flags[i] !== apiFlags[i] ? k + ' app=' + dw.flags[i] + ' api=' + apiFlags[i] : '').filter(Boolean) : { app: dw.flags, api: apiFlags }));
ok(dw.row && dw.row.chip === 'Rain 80%' && dd.row && dd.row.chip === '', 'B  wet today → "Rain 80%" on the row; dry → no chip', JSON.stringify({ wet: dw.row && dw.row.chip, dry: dd.row && dd.row.chip }));
ok(dw.card === 'Rain 80%', 'C  the card\'s dispatch line shows the chip', JSON.stringify(dw.card));
let plan = null, plain = null;
if (M && M.planBuzzes) {
  const now = new Date('2026-10-13T19:30:00Z');                       /* Tue 3:30pm Dayton; next working day Wed 14 Oct */
  const items = [{ id: 'a', project_id: 'p1', title: 'Fix flashing', kind: 'punch', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', scheduled_at: '2026-10-14' },
                 { id: 'b', project_id: 'p2', title: 'Dry job', kind: 'punch', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', scheduled_at: '2026-10-15' }];
  const projects = [{ id: 'p1', name: 'Mark Diamond' }, { id: 'p2', name: 'Joe Ruiz' }];
  try { plan = (M.planBuzzes(items, projects, now, 'plan', { '2026-10-14': { c: 61, p: 80 } }) || []).find(b => b.slot === 'plan'); } catch (e) { plan = { body: 'threw ' + e.message }; }
  try { plain = (M.planBuzzes(items, projects, now, 'plan') || []).find(b => b.slot === 'plan'); } catch (e) { plain = { body: 'threw ' + e.message }; }
}
ok(plan && /Rain 80% forecast: Mark Diamond\./.test(plan.body) && !/Joe Ruiz/.test(plan.body) && plain && !/forecast/.test(plain.body),
  'D  the 3pm Plan names the wet job; no forecast adds nothing', JSON.stringify({ wet: plan && plan.body, none: plain && plain.body }).slice(0, 260));
for (const [th, r] of [['dark', dw], ['light', lw]]) { const x = r.row && r.row.ink && r.row.g ? ratio(r.row.ink, r.row.g) : 0;
  ok(x >= 4.5, `E  ${th}: the rain chip is readable on its row`, `${x}:1 on ${r.row && r.row.g}`); }
await browser.close(); console.log(`GATE 1295 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
