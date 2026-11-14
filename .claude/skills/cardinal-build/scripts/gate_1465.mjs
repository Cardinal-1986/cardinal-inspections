#!/usr/bin/env node
/* gate_1465 — client profile fix group 1: the stage menu, unreadable numbers, red $0.
 *
 *   A  the stage menu is styled: dark ground in dark mode, every row ≥ 44 px, Mark Lost is the LAST row
 *   B  Mark Lost + Cancel on the "why" question changes nothing (it used to save Lost first)
 *   C  Mark Lost + a reason shows Lost at once but writes nothing for 5 s (Undo window), then saves Lost + the reason
 *   D  the menu's Advance waits out the same Undo window (it wrote at once)
 *   E  Measurement values read ≥ 4.5:1 on their card in dark AND light (were 1.02:1 in dark)
 *   F  a $0.00 balance on a job with no total is not red
 *   G  light mode: Orders' "Mark ordered" button reads ≥ 4.5:1 on its card (was 1.03:1)
 *
 *   node gate_1465.mjs [index.html]      must be RED on build 1464
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

/* contrast of an element's text against the first opaque ground behind it */
const CONTRAST = `window.__ctr = function(el){
  function rgb(s){ var m = String(s).match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var a = m[1].split(',').map(function(x){ return parseFloat(x); }); return { r:a[0], g:a[1], b:a[2], a: a.length > 3 ? a[3] : 1 }; }
  function lum(c){ return [c.r, c.g, c.b].map(function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce(function(s, v, i){ return s + v * [.2126, .7152, .0722][i]; }, 0); }
  var fg = rgb(getComputedStyle(el).color), bg = null, e = el;
  while(e && e.nodeType === 1){ var c = rgb(getComputedStyle(e).backgroundColor); if(c && c.a > .9){ bg = c; break; } e = e.parentElement; }
  if(!bg) bg = rgb(getComputedStyle(document.body).backgroundColor) || { r:0, g:0, b:0 };
  var L1 = lum(fg), L2 = lum(bg); return Math.round((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05) * 100) / 100;
};`;

async function page(light) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.addInitScript(CONTRAST);
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); });
  await wait(1500);
  return { p, close: () => ctx.close() };
}
/* the mock hands the app its own row objects, so an optimistic pr.stage reads back as "saved". Count the
   real WRITES instead: every projects.update() payload carrying a stage. */
const hookWrites = p => p.evaluate(() => { window.__sw = []; const s = window.supa; const orig = s.from.bind(s);
  s.from = function(t){ const q = orig(t); if(t === 'projects' && q && q.update){ const u = q.update.bind(q); q.update = function(v){ if(v && v.stage) window.__sw.push(v.stage); return u(v); }; } return q; }; });
const writes = p => p.evaluate(() => (window.__sw || []).slice());
const stored = p => p.evaluate(async () => { const r = await window.supa.from('projects').select('*').eq('id', 'p1'); const row = (r.data || [])[0] || {}; let ck = {}; try { ck = JSON.parse(row.checklist || '{}'); } catch (e) {} return { stage: row.stage, reason: ck.loss_reason || null }; });
const openMenu = p => p.evaluate(() => { const b = document.getElementById('msDots'); if (b) b.click(); });
const clickAct = (p, act) => p.evaluate(a => { const b = document.querySelector('#msDrop button[data-act="' + a + '"]'); if (!b) return false; b.click(); return true; }, act);
const shownStage = p => p.evaluate(() => { const b = document.querySelector('#projectView .dbstgmid b'); return b ? b.textContent.trim() : null; });

{ /* A–D, F, E(dark) */
  const { p, close } = await page(false);
  await openMenu(p); await wait(300);
  const a = await p.evaluate(() => {
    const d = document.getElementById('msDrop'); if (!d) return null;
    const bs = [...d.querySelectorAll('button.estopt')];
    return { bg: getComputedStyle(d).backgroundColor, heights: bs.map(b => Math.round(b.getBoundingClientRect().height)), last: bs.length ? bs[bs.length - 1].getAttribute('data-act') : null };
  });
  ok(!!a && a.bg !== 'rgb(255, 255, 255)' && a.heights.length >= 2 && a.heights.every(h => h >= 44) && a.last === 'dead', 'A  the stage menu is styled, rows ≥ 44 px, Mark Lost last', a);

  await p.evaluate(() => { window.prompt = () => null; });
  await clickAct(p, 'dead'); await wait(6200);
  const b = await stored(p);
  ok(b.stage === 'Approved' && (await shownStage(p)) === 'APPROVED', 'B  Mark Lost + Cancel changes nothing', b);

  await p.evaluate(() => { window.prompt = () => '2'; });
  await hookWrites(p);
  await openMenu(p); await wait(250); await clickAct(p, 'dead'); await wait(800);
  const c1 = await writes(p), c1s = await shownStage(p);
  await wait(5600);
  const c2 = await writes(p), c2r = await stored(p);
  const want = await p.evaluate(() => (typeof LOSS_REASONS !== 'undefined' ? LOSS_REASONS[1] : null));
  ok(c1.length === 0 && c1s === 'LOST' && c2.join() === 'Lost' && c2r.reason === want, 'C  Mark Lost: shown at once, written only after the Undo window, with the reason', { writesDuring: c1, shown: c1s, writesAfter: c2, reason: c2r.reason, want });

  /* put it back, then D */
  await p.evaluate(async () => { await window.supa.from('projects').update({ stage: 'Approved' }).eq('id', 'p1'); const pr = (window.cacheProjects || []).find(x => x.id === 'p1'); if (pr) pr.stage = 'Approved'; if (typeof openProject === 'function') openProject('p1'); });
  await wait(1500);
  await hookWrites(p);
  await openMenu(p); await wait(250); await clickAct(p, 'adv'); await wait(900);
  const d1 = await writes(p); await wait(5600); const d2 = await writes(p);
  ok(d1.length === 0 && d2.length >= 1 && d2.every(x => x === 'Scheduled'), 'D  the menu Advance writes only after the Undo window (setStage writes stage twice, by design)', { writesDuring: d1, writesAfter: d2 });

  const f = await p.evaluate(() => { const b = document.querySelector('.crjp-card b.crjp-bal'); if (!b) return null; return { txt: b.textContent.trim(), color: getComputedStyle(b).color, cls: b.className }; });
  ok(!!f && /\$0\.00/.test(f.txt) && !/rgb\(2(0|2|3|4)\d, 1[0-4]\d, 1[0-4]\d\)/.test(f.color) && f.color !== 'rgb(240, 138, 144)', 'F  a $0.00 balance with no job total is not red', f);

  const e = await p.evaluate(async () => {
    const pr = window.currentProject; const ck = JSON.parse(pr.checklist || '{}'); ck.meas = { sq: '32', pitch: '6/12', ridge: '48', eave: '120', src: 'manual' }; pr.checklist = JSON.stringify(ck);
    const t = document.querySelector('#projectView [data-jm="measure"]'); if (t) t.click(); await new Promise(r => setTimeout(r, 900));
    if (typeof renderMeasureTab === 'function') await renderMeasureTab(); await new Promise(r => setTimeout(r, 300));
    const vals = [...document.querySelectorAll('#msValMount .ackv > div')].filter(x => x.textContent.trim()); const labs = [...document.querySelectorAll('#msValMount .ackv > span')].filter(x => x.textContent.trim());
    return { vals: vals.map(window.__ctr), labs: labs.map(window.__ctr) };
  });
  ok(e.vals.length > 0 && Math.min(...e.vals) >= 4.5 && Math.min(...e.labs) >= 4.5, 'E  dark: measurement values and labels ≥ 4.5:1', e);
  await close();
}
{ /* E(light), G */
  const { p, close } = await page(true);
  const e = await p.evaluate(async () => {
    const pr = window.currentProject; const ck = JSON.parse(pr.checklist || '{}'); ck.meas = { sq: '32', pitch: '6/12', src: 'manual' }; pr.checklist = JSON.stringify(ck);
    const t = document.querySelector('#projectView [data-jm="measure"]'); if (t) t.click(); await new Promise(r => setTimeout(r, 900));
    if (typeof renderMeasureTab === 'function') await renderMeasureTab(); await new Promise(r => setTimeout(r, 300));
    return [...document.querySelectorAll('#msValMount .ackv > div, #msValMount .ackv > span')].filter(x => x.textContent.trim()).map(window.__ctr);
  });
  ok(e.length > 0 && Math.min(...e) >= 4.5, 'E  light: measurement values and labels ≥ 4.5:1', e);
  const g = await p.evaluate(async () => {
    if (typeof openProject === 'function') openProject('p1'); await new Promise(r => setTimeout(r, 1200));
    const t = document.querySelector('#projectView [data-jm="materials"]'); if (t) t.click(); await new Promise(r => setTimeout(r, 900));
    if (typeof renderMatOrderState === 'function') renderMatOrderState(); await new Promise(r => setTimeout(r, 300));
    const b = document.querySelector('#matOrderState button[data-matord]'); const lab = document.querySelector('#matOrderState b');
    return b ? { btn: window.__ctr(b), label: lab ? window.__ctr(lab) : null } : null;
  });
  ok(!!g && g.btn >= 4.5 && g.label >= 4.5, 'G  light: Orders "Mark ordered" and its label ≥ 4.5:1', g);
  await close();
}
await browser.close();
console.log(`GATE 1465 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
