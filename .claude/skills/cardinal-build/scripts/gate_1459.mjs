#!/usr/bin/env node
/* gate_1459 — Punch: Tomorrow on a past-due row, and the crew hears when a date moves.
 *
 *   A  Theo: the past-due row has a Tomorrow button; a tap moves it to the next working day
 *   B  …and Curtis (assigned) is buzzed with the new day
 *   C  Scottie (not a scheduler) sees no Tomorrow button
 *   D  on the card, changing the DATE buzzes the assignee
 *
 *   node gate_1459.mjs [index.html]      must be RED on build 1458
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
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 220000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const NEXT = (() => { const d = new Date(); d.setDate(d.getDate() + 1); if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); })();
async function list(who) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=' + who, { waitUntil: 'domcontentloaded' });
  await wait(3800);
  await p.evaluate(() => { window.__BUZZ__ = []; window.notifyTeam = async (to, title) => { window.__BUZZ__.push({ to, title }); return { sent: 1 }; }; });
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1000);
  return { p, close: () => ctx.close() };
}
const writes = p => p.evaluate(() => (window.__WRITES__ || []).filter(w => w && w.table === 'punch_items').map(w => w.payload || {}));
{
  const { p, close } = await list('theo');
  const has = await p.evaluate(() => !!document.querySelector('#puList .pl-row[data-pu="i1"] [data-putomorrow]'));
  await p.evaluate(() => { const b = document.querySelector('#puList [data-putomorrow="i1"]'); if (b) b.click(); }); await wait(1500);
  const w = await writes(p), bz = await p.evaluate(() => window.__BUZZ__);
  ok(has && w.some(x => x.scheduled_at === NEXT), 'A  Theo: Tomorrow moves the late job to the next working day', { has, next: NEXT, w: w.slice(-1) });
  ok(bz.some(x => /curtis/.test(String(x.to)) && /^Moved to /.test(x.title)), 'B  the assignee is buzzed with the new day', bz);
  /* D: the card's date field */
  await p.evaluate(() => { window.__BUZZ__ = []; const r = document.querySelector('#punchView .pl-row[data-pu="i4"]'); if (r) r.click(); }); await wait(1200);
  await p.evaluate(() => { const b = document.querySelector('#cr-pk [data-act="disp"], #cr-pk .pkdisp, #cr-pk [data-act="dispopen"]'); if (b && !document.querySelector('#cr-pk [data-f="when"]')) b.click(); }); await wait(500);
  const d = await p.evaluate(async (NEXT) => {
    const f = document.querySelector('#cr-pk [data-f="when"]'); if (!f) return { err: 'no date field' };
    f.value = NEXT; f.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1500)); return { buzz: window.__BUZZ__ };
  }, NEXT);
  ok(d.buzz && d.buzz.some(x => /scottie/.test(String(x.to)) && /^Moved to /.test(x.title)), 'D  changing the date on the card buzzes the assignee', d);
  await close();
}
{
  const { p, close } = await list('scottie');
  const c = await p.evaluate(() => document.querySelectorAll('#puList [data-putomorrow]').length);
  ok(c === 0, 'C  Scottie sees no Tomorrow button', c);
  await close();
}
await browser.close();
console.log(`GATE 1459 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
