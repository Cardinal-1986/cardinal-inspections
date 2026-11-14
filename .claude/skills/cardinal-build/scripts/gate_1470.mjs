#!/usr/bin/env node
/* gate_1470 — client page: desktop and the small things.
 *
 *   A  1440 desk: a Text (sms:) link sits beside the phone number in the top bar
 *   B  3440 ultrawide: the client page is wider than 1600px (it capped at 1600)
 *   C  History's header says how many events and when the last one was ("N · 3d ago"), not a count capped at 8
 *   D  dark: the punch flags (URGENT / DAYS LATE / NO ONE ASSIGNED) read ≥ 4.5:1 on the client punch list
 *   E  the appointment ✕ and the Measurements fold rows are ≥ 44px to tap
 *   F  Color Studio says it opens elsewhere (↗)
 *
 *   node gate_1470.mjs [index.html]      must be RED on build 1469
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PW = process.env.PW_CORE || (existsSync('/opt/node22/lib/node_modules/playwright/index.js') ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');
const { chromium } = require(PW);
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(HERE, '../../../../index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, n, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')); c ? pass++ : fail++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const CTR = `window.__ctr = function(el){
  function rgb(s){ var m = String(s).match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var a = m[1].split(',').map(parseFloat); return { r:a[0], g:a[1], b:a[2], a: a.length > 3 ? a[3] : 1 }; }
  function lum(c){ return [c.r, c.g, c.b].map(function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce(function(s, v, i){ return s + v * [.2126, .7152, .0722][i]; }, 0); }
  function mix(top, bot){ return { r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 }; }
  var layers = [], e = el;
  while(e && e.nodeType === 1){ var c = rgb(getComputedStyle(e).backgroundColor); if(c && c.a > 0){ layers.push(c); if(c.a > .9) break; } e = e.parentElement; }
  var g = { r:9, g:9, b:12, a:1 }; for(var i = layers.length - 1; i >= 0; i--) g = mix(layers[i], g);
  var fg = rgb(getComputedStyle(el).color); var L1 = lum(fg), L2 = lum(g);
  return Math.round((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05) * 100) / 100; };`;
async function page(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP); await p.addInitScript(CTR);
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); }); await wait(1500);
  return { p, close: () => ctx.close() };
}
{
  const { p, close } = await page(1440, 900);
  const a = await p.evaluate(() => { const l = [...document.querySelectorAll('#projectView a[href^="sms:"]')].find(e => e.getClientRects().length); return l ? { t: l.textContent.trim(), h: l.getAttribute('href') } : null; });
  ok(!!a && /Text/.test(a.t) && /^sms:/.test(a.h), 'A  1440: a Text link beside the phone number', a);
  await close();
}
{
  const { p, close } = await page(3440, 1440);
  const b = await p.evaluate(() => { const w = [...document.querySelectorAll('#projectView .wrap:not(.masthead)')].find(e => e.getClientRects().length); return w ? Math.round(w.getBoundingClientRect().width) : null; });
  ok(!!b && b > 1700, 'B  3440: the client page is wider than 1600px', b);
  await close();
}
{
  const { p, close } = await page(390, 844);
  const c = await p.evaluate(() => { const e = document.querySelector('#kpHis .kpcnt'); return e ? e.textContent.trim() : null; });
  ok(!!c && /^\d+ · .+/.test(c), 'C  History says how many and when last', c);
  const f = await p.evaluate(() => { const t = document.querySelector('#projectView .ja-menu [data-jm="colorstudio"] .jbl'); return t ? t.textContent.trim() : null; });
  ok(!!f && /↗/.test(f), 'F  Color Studio is marked as opening elsewhere', f);
  await p.evaluate(() => { const t = document.querySelector('#projectView .ja-menu [data-jm="punch"]'); if (t) t.click(); }); await wait(1400);
  const d = await p.evaluate(() => [...document.querySelectorAll('#ppPage .hi')].filter(e => e.getClientRects().length).map(e => ({ t: e.textContent.trim(), c: window.__ctr(e) })));
  ok(d.length > 0 && d.every(x => x.c >= 4.5), 'D  dark: the punch flags read ≥ 4.5:1', d.slice(0, 3));
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); }); await wait(1200);
  await p.evaluate(() => { const t = document.querySelector('#projectView .ja-menu [data-jm="appts"]'); if (t) t.click(); }); await wait(1300);
  const e1 = await p.evaluate(() => { const b = [...document.querySelectorAll('#apMount .tskrow .chipbtn')].find(e => e.getClientRects().length); if (!b) return null; const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); }); await wait(1200);
  await p.evaluate(() => { const t = document.querySelector('#projectView .ja-menu [data-jm="measure"]'); if (t) t.click(); }); await wait(1300);
  const e2 = await p.evaluate(() => [...document.querySelectorAll('#tab-measure .mathead.collhead')].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().height)));
  ok(!!e1 && e1.w >= 44 && e1.h >= 44 && e2.length > 0 && Math.min(...e2) >= 44, 'E  the appointment ✕ and the fold rows are ≥ 44px', { x: e1, folds: e2 });
  await close();
}
await browser.close();
console.log(`GATE 1470 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
