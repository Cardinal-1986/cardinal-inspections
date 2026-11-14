#!/usr/bin/env node
/* gate_1469 — the screens behind the Job Menu match the dark page; one way back; no emoji.
 *
 *   A  dark: the message box, the Appointments form and the Checklists cards are dark (were cream / white)
 *   B  light: the same three are unchanged (cream box, white form, white cards)
 *   C  every one of the six screens has the same "Back to client profile" button, visible
 *   D  no emoji on the Measurements, Orders, Files and Photos screens
 *   E  dark: the Appointments labels and the @name chips read ≥ 4.5:1 on their new ground
 *
 *   node gate_1469.mjs [index.html]      must be RED on build 1468
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
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 300000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const HELP = `window.__rgb = function(s){ var m = String(s).match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var a = m[1].split(',').map(parseFloat); return { r:a[0], g:a[1], b:a[2], a: a.length > 3 ? a[3] : 1 }; };
window.__lum = function(c){ return [c.r, c.g, c.b].map(function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce(function(s, v, i){ return s + v * [.2126, .7152, .0722][i]; }, 0); };
window.__ground = function(el){ var e = el; while(e && e.nodeType === 1){ var c = window.__rgb(getComputedStyle(e).backgroundColor); if(c && c.a > .9) return c; e = e.parentElement; } return window.__rgb(getComputedStyle(document.body).backgroundColor) || { r:0, g:0, b:0 }; };
window.__ctr = function(el){ var L1 = window.__lum(window.__rgb(getComputedStyle(el).color)), L2 = window.__lum(window.__ground(el)); return Math.round((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05) * 100) / 100; };
window.__bgL = function(sel){ var e = document.querySelector(sel); if(!e) return null; var c = window.__rgb(getComputedStyle(e).backgroundColor); return c ? Math.round(window.__lum(c) * 1000) / 1000 : null; };`;
async function session(light) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP); await p.addInitScript(HELP);
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
  const open = async k => { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); }); await wait(1200);
    await p.evaluate(k => { const t = document.querySelector('#projectView .ja-menu [data-jm="' + k + '"]'); if (t) t.click(); }, k); await wait(1200); };
  return { p, open, close: () => ctx.close() };
}
const BOXES = { comms: '#commsView .chatbox', appts: '#apptsView .acxsec', checklists: '#tab-checklists .ckcard, .ckcard' };
{
  const { p, open, close } = await session(false);
  const lum = {}, backs = {}, emoji = {};
  for (const k of ['comms', 'appts', 'checklists', 'docs', 'materials', 'measure', 'album']) {
    await open(k);
    if (BOXES[k]) lum[k] = await p.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length); return e ? window.__bgL(null) || (function(){ var c = window.__rgb(getComputedStyle(e).backgroundColor); return c ? Math.round(window.__lum(c) * 1000) / 1000 : null; })() : null; }, BOXES[k]);
    if (k !== 'album') backs[k] = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.getClientRects().length && /^\s*←\s*Back to client profile\s*$/.test(b.textContent)).length);
    const SCR = { docs: '#docsView', materials: '#tab-materials', measure: '#tab-measure', album: '#galleryView' };
    if (SCR[k]) emoji[k] = await p.evaluate(sel => { const e = document.querySelector(sel); if (!e || !e.getClientRects().length) return 'SCREEN NOT SHOWN'; return (e.innerText.match(/\p{Extended_Pictographic}/gu) || []).filter(c => !'✎✦★☆↗➡®'.includes(c)).join(''); }, SCR[k]);
    if (k === 'appts') {
      const labs = await p.evaluate(() => [...document.querySelectorAll('#apptsView label')].filter(e => e.getClientRects().length).map(window.__ctr));
      ok(labs.length >= 3 && Math.min(...labs) >= 4.5, 'E  dark: Appointments labels ≥ 4.5:1', labs);
    }
    if (k === 'comms') {
      const chips = await p.evaluate(() => [...document.querySelectorAll('#chatTagRow .chipbtn')].filter(e => e.getClientRects().length).map(window.__ctr));
      ok(chips.length > 0 && Math.min(...chips) >= 4.5, 'E  dark: the @name chips ≥ 4.5:1', chips.slice(0, 3));
    }
  }
  ok(Object.values(lum).every(v => v !== null && v < 0.05), 'A  dark: message box, Appointments form and Checklists cards are dark', lum);
  ok(Object.values(backs).every(n => n >= 1), 'C  all six screens have "← Back to client profile"', backs);
  ok(Object.values(emoji).every(s => s === ''), 'D  no emoji on Measurements, Orders, Files, Photos', emoji);
  await close();
}
{
  const { p, open, close } = await session(true);
  const lum = {};
  for (const k of ['comms', 'appts', 'checklists']) { await open(k); lum[k] = await p.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length); if (!e) return null; const c = window.__rgb(getComputedStyle(e).backgroundColor); return c ? Math.round(window.__lum(c) * 1000) / 1000 : null; }, BOXES[k]); }
  ok(Object.values(lum).every(v => v !== null && v > 0.85), 'B  light: the same three stay cream / white', lum);
  await close();
}
await browser.close();
console.log(`GATE 1469 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
