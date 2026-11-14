#!/usr/bin/env node
/* gate_1468 — the Job Menu in the order a job runs: Sell / Build / Close.
 *
 *   A  three headings (Sell, Build, Close), in that order, each followed by its tiles in job order
 *   B  the headings are readable: ≥ 11 px and ≥ 4.5:1, dark and light
 *   C  every visible tile has its own icon (Change order, Owner review, Install photos borrowed one)
 *   D  no tile was lost: the same 18 data-jm keys as before, for Theo
 *   E  the Files page says a signed contract goes in Contracts
 *
 *   node gate_1468.mjs [index.html]      must be RED on build 1467
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
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const CTR = `window.__ctr = function(el){
  function rgb(s){ var m = String(s).match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var a = m[1].split(',').map(parseFloat); return { r:a[0], g:a[1], b:a[2], a: a.length > 3 ? a[3] : 1 }; }
  function lum(c){ return [c.r, c.g, c.b].map(function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce(function(s, v, i){ return s + v * [.2126, .7152, .0722][i]; }, 0); }
  var fg = rgb(getComputedStyle(el).color), bg = null, e = el;
  while(e && e.nodeType === 1){ var c = rgb(getComputedStyle(e).backgroundColor); if(c && c.a > .9){ bg = c; break; } e = e.parentElement; }
  if(!bg) bg = rgb(getComputedStyle(document.body).backgroundColor) || { r:0, g:0, b:0 };
  var L1 = lum(fg), L2 = lum(bg); return Math.round((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05) * 100) / 100; };`;
const WANT = { Sell: ['inspections', 'measure', 'estimates', 'contracts', 'appts'], Build: ['materials', 'workorders', 'changeorder', 'checklists', 'install'], Close: ['punch', 'docs'] };
for (const light of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP); await p.addInitScript(CTR);
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); }); await wait(1500);
  const r = await p.evaluate(() => {
    const m = document.querySelector('#acxMount .ja-menu'); if (!m) return null;
    const seq = []; let cur = null;
    m.querySelectorAll('.jasect, .jabox').forEach(e => { if (e.classList.contains('jasect')) { cur = { h: e.textContent.trim(), keys: [] }; seq.push(cur); } else if (cur) cur.keys.push(e.getAttribute('data-jm')); });
    const heads = [...m.querySelectorAll('.jasect')].map(e => ({ t: e.textContent.trim(), px: parseFloat(getComputedStyle(e).fontSize), c: window.__ctr(e) }));
    const tiles = [...m.querySelectorAll('.jabox')].filter(e => e.getClientRects().length);
    const icons = tiles.map(t => { const pth = t.querySelector('svg path'); return pth ? pth.getAttribute('d') : ''; });
    const dup = icons.filter((d, i) => d && icons.indexOf(d) !== i).length;
    return { seq, heads, keys: tiles.map(t => t.getAttribute('data-jm')), dup };
  });
  const tag = light ? 'light' : 'dark';
  if (!light) {
    const order = r && r.seq.map(x => x.h);
    const inOrder = !!r && Object.keys(WANT).every(h => { const sec = r.seq.find(x => x.h.toLowerCase() === h.toLowerCase()); if (!sec) return false; let at = -1; return WANT[h].every(k => { const i = sec.keys.indexOf(k); const okk = i > at; at = i; return okk; }); });
    ok(!!r && JSON.stringify(order.map(x => x.toLowerCase())) === '["sell","build","close"]' && inOrder, 'A  Sell / Build / Close, each in job order', r && r.seq);
    ok(!!r && r.dup === 0, 'C  every visible tile has its own icon', r && r.dup);
    const need = ['comms', 'album', 'tasks', 'inspections', 'measure', 'estimates', 'contracts', 'appts', 'walk', 'colorstudio', 'materials', 'workorders', 'changeorder', 'checklists', 'install', 'punch', 'docs', 'ownerreview'];
    ok(!!r && need.every(k => r.keys.includes(k)) && r.keys.length === need.length, 'D  all 18 tiles are still there for Theo', r && r.keys);
    const e = await p.evaluate(async () => { const t = document.querySelector('#acxMount .ja-menu [data-jm="docs"]'); if (t) t.click(); await new Promise(r => setTimeout(r, 1000)); return document.body.innerText; });
    ok(/A signed contract goes in Contracts/.test(e), 'E  Files says a signed contract goes in Contracts');
  }
  ok(!!r && r.heads.length === 3 && r.heads.every(h => h.px >= 11 && h.c >= 4.5), 'B  ' + tag + ': the headings are ≥ 11 px and ≥ 4.5:1', r && r.heads);
  await ctx.close();
}
await browser.close();
console.log(`GATE 1468 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
