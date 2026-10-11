#!/usr/bin/env node
/* gate_1296 — callback cause + original crew (Theo's pick 1B).
     A  a Callback card has the "Why the callback" section; a punch-out card does not
     B  the original crew fills itself in from the job's crew work order, and is SAVED
     C  tapping a cause saves callback_cause
     D  a crew's Jobs tab lists its callbacks with the cause (Betos: Drip edge · Workmanship)
     E  someone who cannot read crews (RLS → []) sees the stored name, no picker
     F  the cause chips are tap-sized (≥44px) and readable, dark and light
   Seed: gate_1296_seed.js (sentinel seed + cb1 open/no crew, cb2 closed/Betos/workmanship).
   Usage: node gate_1296.mjs [index.html] — control: the 1295 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'gate_1296_seed.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const boot = async (light) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await p.waitForTimeout(800); return { ctx, p };
};
const row = (p, id) => p.evaluate((id) => { const P = window.CardinalPunch; const r = P && P.rows ? P.rows().filter(x => x.id === id)[0] : null; return r ? { cause: r.callback_cause, crew: r.orig_crew_id, name: r.orig_crew_name } : null; }, id).catch(() => null);
for (const light of [false, true]) {
  const th = light ? 'light' : 'dark';
  const { ctx, p } = await boot(light);
  if (!light) {
    try { await p.evaluate(() => window.CardinalPunchCard.open('i4')); await p.waitForTimeout(900); } catch (e) {}
    const onPunch = await p.evaluate(() => !!document.querySelector('#cr-pk .pkcb')).catch(() => null);
    try { await p.evaluate(() => window.CardinalPunchCard.open('cb1')); await p.waitForTimeout(1800); } catch (e) {}
    const onCb = await p.evaluate(() => !!document.querySelector('#cr-pk .pkcb')).catch(() => null);
    ok(onCb === true && onPunch === false, 'A  the section is on a Callback, not on a punch-out', JSON.stringify({ callback: onCb, punch: onPunch }));
    const r1 = await row(p, 'cb1');
    ok(r1 && r1.crew === 'c1' && r1.name === 'Betos Home Improvements', 'B  the crew fills in from the work order and is saved', JSON.stringify(r1));
    await p.evaluate(() => { const b = document.querySelector('#cr-pk [data-cbc="storm"]'); if (b) b.click(); }).catch(() => {}); await p.waitForTimeout(800);
    const r2 = await row(p, 'cb1');
    ok(r2 && r2.cause === 'storm', 'C  tapping Storm saves callback_cause', JSON.stringify(r2));
  } else {
    try { await p.evaluate(() => window.CardinalPunchCard.open('cb1')); await p.waitForTimeout(1800); } catch (e) {}
  }
  const chips = await p.evaluate(() => [...document.querySelectorAll('#cr-pk .pkcbc')].map(b => { const k = getComputedStyle(b); let g = null, e = b; while (e) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\(0, 0, 0, 0\)/.test(c)) { g = c; break; } e = e.parentElement; } return { h: Math.round(b.getBoundingClientRect().height), c: k.color, g }; })).catch(() => []);
  const worst = chips.length ? Math.min(...chips.map(x => ratio(x.c, x.g))) : 0;
  ok(chips.length === 5 && chips.every(x => x.h >= 44) && worst >= 4.5, `F  ${th}: five cause chips, 44px, readable`, `${chips.length} chips, min h ${chips.length ? Math.min(...chips.map(x => x.h)) : 0}, worst ${worst}:1`);
  await ctx.close();
}
/* D: the crew page */
{ const { ctx, p } = await boot(false);
  let txt = '';
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'crews').run(); }); await p.waitForTimeout(1200);
    await p.evaluate(() => { const n = [...document.querySelectorAll('#crewsView *')].find(e => e.children.length === 0 && /Betos Home Improvements/.test(e.textContent)); if (n) n.click(); }); await p.waitForTimeout(600);
    await p.evaluate(() => { const t = document.querySelector('#crewsView [data-tab="jobs"]'); if (t) t.click(); }); await p.waitForTimeout(800);
    txt = await p.evaluate(() => { const h = document.querySelector('#crewsView .crw-cbh'); return h ? h.innerText + ' || ' + h.nextElementSibling.innerText : ''; }); } catch (e) {}
  ok(/Callbacks/.test(txt) && /Drip edge pulled loose/.test(txt) && /Workmanship/.test(txt) && !/Leak at the chimney/.test(txt), 'D  Betos\'s Jobs tab lists its callback with the cause', txt.replace(/\s+/g, ' ').slice(0, 200));
  await ctx.close(); }
/* E: RLS refuses crews → the stored name, no picker */
{ const { ctx, p } = await boot(false);
  let r = null;
  try { await p.evaluate(() => { const S = window.supa, orig = S.from.bind(S);
      S.from = (t) => { if (t !== 'crews' && t !== 'crew_work_orders') return orig(t);
        const empty = { data: [], error: null }; const ch = { select() { return ch; }, eq() { return ch; }, order() { return ch; }, then(res, rej) { return Promise.resolve(empty).then(res, rej); } }; return ch; }; });
    await p.evaluate(() => window.CardinalPunchCard.open('cb2')); await p.waitForTimeout(1500);
    r = await p.evaluate(() => { const e = document.querySelector('#cr-pk .pkcb'); return e ? { sel: !!e.querySelector('select'), name: (e.querySelector('.pkcbname') || {}).textContent || '' } : null; }); } catch (e) {}
  ok(r && r.sel === false && r.name === 'Betos Home Improvements', 'E  no crews access → the stored crew name, no picker', JSON.stringify(r));
  await ctx.close(); }
await browser.close(); console.log(`GATE 1296 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
