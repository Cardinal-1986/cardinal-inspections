#!/usr/bin/env node
/* gate_1461 — Punch: the needs-assigned box shows the oldest three, then "Show all N".
 *
 *   A  with five unassigned items, the box shows three and a "Show all 5" button
 *   B  the button shows all five; again shows three
 *   C  with one unassigned item, there is no button
 *
 *   node gate_1461.mjs [index.html]      must be RED on build 1460
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
async function box(extra) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  if (extra) await p.evaluate(async n => {
    for (let i = 0; i < n; i++) await window.supa.from('punch_items').insert({ id: 'q' + i, project_id: 'p1', title: 'Queue test ' + i, kind: 'punch', priority: 'normal', status: 'open',
      assigned_to: null, created_by: 'theo@cardinalrenovations.net', created_at: '2026-09-0' + (i + 1) + 'T12:00:00Z', scheduled_at: null, photos: [], comments: [], steps: [], visits: [] });
  }, extra);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1000);
  return { p, close: () => ctx.close() };
}
const read = p => p.evaluate(() => ({ cards: document.querySelectorAll('#puQueue .pu-card').length, btn: (document.querySelector('#puQueue [data-puqmore]') || {}).textContent || null,
  head: (document.querySelector('#puQueue .ph2 b') || {}).textContent }));
{
  const { p, close } = await box(4);
  const a = await read(p);
  ok(a.cards === 3 && a.btn === 'Show all 5' && /^5 need/.test(a.head || ''), 'A  five unassigned: three shown and "Show all 5"', a);
  await p.evaluate(() => { const b = document.querySelector('#puQueue [data-puqmore]'); if (b) b.click(); }); await wait(500);
  const b1 = await read(p);
  await p.evaluate(() => { const b = document.querySelector('#puQueue [data-puqmore]'); if (b) b.click(); }); await wait(500);
  const b2 = await read(p);
  ok(b1.cards === 5 && b2.cards === 3, 'B  Show all shows five; again shows three', { b1, b2 });
  await close();
}
{
  const { p, close } = await box(0);
  const c = await read(p);
  ok(c.cards === 1 && c.btn === null, 'C  one unassigned: no button', c);
  await close();
}
await browser.close();
console.log(`GATE 1461 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
