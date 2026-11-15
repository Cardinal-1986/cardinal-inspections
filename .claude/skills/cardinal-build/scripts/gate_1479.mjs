#!/usr/bin/env node
/* gate_1479 — on a desk, Crew Dispatch stays open under the work-order picker.
 *
 *   A  desk 1536: arm a Needs-a-crew job, tap a crew's day -> the picker is up, it is what a click
 *      lands on, Dispatch is still open behind it, and the crew and day arrived filled in
 *   B  Cancel -> the picker is gone and Dispatch is still the screen (it used to be the home screen)
 *   C  a work order written while the picker was up shows on the board when the picker goes away
 *      (the reload) - the job leaves Needs a crew without leaving the page
 *   D  the second tap on an armed job (the classic door) keeps Dispatch open too
 *   E  phone 390: unchanged - Dispatch closes first, then the picker (9550 would cover a 210 modal)
 *
 *   node gate_1479.mjs [index.html]      must be RED on build 1478
 *   GATE_NOW=2026-11-15T15:00:00 pins the browser's day (the 1472/1477 lesson: prove it on a Sunday too)
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

async function boot(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss());
  if (process.env.GATE_NOW) await p.clock.install({ time: new Date(process.env.GATE_NOW) });
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
  await p.evaluate(async () => { await window.CardinalDispatch.open(); }); await wait(2200);
  return { ctx, p };
}
/* what the screen is, read the same way every time */
const state = p => p.evaluate(() => {
  const m = document.getElementById('tskModal'), d = document.getElementById('cr-disp');
  const shown = !!m && getComputedStyle(m).display !== 'none';
  const hit = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
  const crew = document.getElementById('woCrew'), when = document.getElementById('woWhen');
  return { picker: shown, disp: !!d && d.classList.contains('open'), dispBox: !!d && d.getClientRects().length > 0,
    clickLands: hit ? (hit.closest('#tskModal') ? 'picker' : hit.closest('#cr-disp') ? 'dispatch' : (hit.id || hit.className || hit.tagName)) : null,
    crew: crew ? crew.value : null, when: when ? when.value : null,
    need: [...document.querySelectorAll('#cr-disp .uch[data-pid]')].map(u => u.getAttribute('data-pid')) };
});
/* arm the first Needs-a-crew job, then tap an empty day on the first crew row; returns what was tapped */
const armAndPlace = p => p.evaluate(async () => {
  const u = document.querySelector('#cr-disp .uch[data-pid]'); if (!u) return { err: 'no Needs-a-crew job' };
  const pid = u.getAttribute('data-pid'); u.click();
  await new Promise(r => setTimeout(r, 500));
  const c = [...document.querySelectorAll('#cr-disp .dcell[data-dc]')].find(x => !x.querySelector('.job')); if (!c) return { err: 'no empty crew day', pid };
  const dc = c.getAttribute('data-dc'); c.click();
  return { pid, dc };
});

/* A-D: the desk */
let { ctx, p } = await boot(1536, 900);
const tap = await armAndPlace(p); await wait(1500);
const a = await state(p);
ok(!tap.err && a.picker && a.clickLands === 'picker' && a.disp && a.dispBox && a.crew === (tap.dc || '').split('|')[0] && /^\d{4}-\d\d-\d\d$/.test(a.when || ''),
  'A  desk: the picker is up over Dispatch, crew and day filled in', { tap, a });

await p.evaluate(() => { const b = document.getElementById('woCancel'); b && b.click(); }); await wait(1200);
const b = await state(p);
ok(!b.picker && b.disp && b.clickLands === 'dispatch' && b.need.includes(tap.pid), 'B  Cancel: still on Dispatch, the job still needs a crew', b);

/* C: the picker goes away after a work order was written -> the board reloads */
const tap2 = await armAndPlace(p); await wait(1500);
const c0 = await state(p);
await p.evaluate(async (t) => {
  const sb = window.sb || window.supa, dc = t.dc.split('|');
  await sb.from('crew_work_orders').insert({ id: 'w1479', wo_number: 'WO-1479', crew_id: dc[0], project_id: t.pid, report_id: null, status: 'draft', scheduled_on: document.getElementById('woWhen').value, completed_on: null });
  document.getElementById('tskModal').style.display = 'none';   /* what createWorkOrder does on success */
}, tap2); await wait(1800);
const c = await state(p);
const onBoard = await p.evaluate(pid => [...document.querySelectorAll('#cr-disp .job[data-pid="' + pid + '"]')].length, tap2.pid);
ok(!tap2.err && c0.picker && c.disp && !c.need.includes(tap2.pid) && onBoard >= 1, 'C  the new work order is on the board when the picker goes away', { need: c.need, onBoard });
await ctx.close();

({ ctx, p } = await boot(1536, 900));
const d0 = await p.evaluate(async () => { const q = () => document.querySelector('#cr-disp .uch[data-pid]'); const u = q(); if (!u) return null; const pid = u.getAttribute('data-pid'); u.click();
  await new Promise(r => setTimeout(r, 500)); const u2 = document.querySelector('#cr-disp .uch[data-pid="' + pid + '"]'); u2 && u2.click(); return pid; }); await wait(1500);
const d = await state(p);
ok(!!d0 && d.picker && d.disp && d.clickLands === 'picker', 'D  desk: the second tap on an armed job opens the picker over Dispatch', d);
await ctx.close();

/* E: the phone is unchanged */
({ ctx, p } = await boot(390, 844));
const tap3 = await armAndPlace(p); await wait(1500);
const e = await state(p);
ok(!tap3.err && e.picker && !e.disp && e.clickLands === 'picker', 'E  phone: Dispatch closes first, the picker is on top', { tap3, e: { picker: e.picker, disp: e.disp, clickLands: e.clickLands } });

await browser.close();
console.log((fail ? 'GATE 1479 RED' : 'GATE 1479 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
