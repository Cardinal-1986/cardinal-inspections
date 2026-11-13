#!/usr/bin/env node
/* gate_1454 — Punch: the Assign sheet (audit group 4).
 *
 *   A  six working days plus "No day" (was four)
 *   B  with a person picked, each day shows their stops that day ("free" / "N stops")
 *   C  dark: the Assign button's label reaches 4.5:1 (it measured 2.17:1, white on #8fb4d8)
 *   D  the sheet's Close is at least 44px tall (it was 28)
 *   E  a time can be set here and is saved with the day
 *   F  light: the selected day reads at 4.5:1 or better (it measured 3.88:1)
 *
 *   node gate_1454.mjs [index.html]      must be RED on build 1453
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PW = process.env.PW_CORE || (existsSync('/opt/node22/lib/node_modules/playwright/index.js') ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');
const { chromium } = require(PW);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const APP = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(ROOT, 'index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : ''));
  cond ? pass++ : fail++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

/* contrast of an element's text against the first opaque background up its ancestors */
const RATIO = (sel) => {
  const e = document.querySelector(sel); if (!e) return null;
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  let n = e, bg = null;
  while (n && n.nodeType === 1) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > .95)) { bg = c; break; } n = n.parentElement; }
  if (!bg) bg = [255, 255, 255];
  const fg = rgb(getComputedStyle(e).color); const a = lum(fg), b = lum(bg);
  return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100;
};

async function load(light) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1000);
  try { await p.evaluate(() => { const b = document.querySelector('#punchView .pu-asgbtn'); if (b) b.click(); }); } catch (e) {}
  await wait(700);
  return { p, close: () => ctx.close() };
}

{
  const { p, close } = await load(false);
  const a = await p.evaluate(() => document.querySelectorAll('#puAsgDays .pu-dayb').length);
  ok(a === 7, 'A  six working days plus No day', a);
  await p.evaluate(() => { const w = document.querySelector('#puAsgWho [data-asg-who="scottie@cardinalrenovations.net"]'); if (w) w.click(); }); await wait(400);
  const b = await p.evaluate(() => [...document.querySelectorAll('#puAsgDays .pu-dayb .ld')].map(x => x.textContent));
  ok(b.length === 6 && b.every(t => /^(free|\d+ stops?)$/.test(t)), 'B  each day shows the picked person\'s stops', b);
  const c = await p.evaluate(RATIO, '#puAsgGo');
  ok(c !== null && c >= 4.5, 'C  dark: the Assign button reads at 4.5:1 or better', c);
  const d = await p.evaluate(() => { const x = document.getElementById('puAsgClose'); return x ? Math.round(x.getBoundingClientRect().height) : null; });
  ok(d !== null && d >= 44, 'D  the sheet\'s Close is 44px or taller', d);
  /* E: second day + 14:30, then Assign */
  const e = await p.evaluate(async () => {
    const days = document.querySelectorAll('#puAsgDays .pu-dayb'); if (days[1]) days[1].click();
    await new Promise(r => setTimeout(r, 300));
    const day = days[1] && days[1].getAttribute('data-asg-day');
    const t = document.getElementById('puAsgTime'); if (!t) return { err: 'no time field', day };
    t.value = '14:30'; t.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    const go = document.getElementById('puAsgGo'); if (go) go.click();
    await new Promise(r => setTimeout(r, 1200));
    const w = (window.__WRITES__ || []).filter(x => x && x.table === 'punch_items');
    const last = w.length ? (w[w.length - 1].payload || {}) : {};
    return { day, at: last.scheduled_at, time: last.scheduled_time, who: last.assigned_to };
  });
  ok(e.day && e.at === e.day && e.time === '14:30:00' && /scottie/.test(e.who || ''), 'E  a time is saved with the day', e);
  await close();
}
{
  const { p, close } = await load(true);
  await p.evaluate(() => { const d = document.querySelectorAll('#puAsgDays .pu-dayb'); if (d[1]) d[1].click(); }); await wait(400);
  const f = await p.evaluate(RATIO, '#puAsgDays .pu-dayb.sel b');
  ok(f !== null && f >= 4.5, 'F  light: the selected day reads at 4.5:1 or better', f);
  await close();
}
await browser.close();
console.log(`GATE 1454 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
