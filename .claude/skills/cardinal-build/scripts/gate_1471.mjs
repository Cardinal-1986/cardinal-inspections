#!/usr/bin/env node
/* gate_1471 — on an ultrawide, a Job Menu section opens BESIDE the client page.
 *
 *   A  3440: Estimates from the Job Menu → the overview stays on the left, Estimates on the right, side by side
 *   B  its "Back to client profile" closes the side: only the overview remains
 *   C  1440: unchanged — Estimates replaces the overview (no split)
 *   D  shrinking a split 3440 window to 1440 drops back to one section (the overview is not left stacked)
 *   E  a Community job never splits (it has its own takeover)
 *
 *   node gate_1471.mjs [index.html]      must be RED on build 1470
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
async function page(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); }); await wait(1500);
  return { p, close: () => ctx.close() };
}
const panes = p => p.evaluate(() => [...document.querySelectorAll('#projectView > .wrap > [id^="tab-"]')].filter(e => e.getClientRects().length && getComputedStyle(e).display !== 'none')
  .map(e => { const r = e.getBoundingClientRect(); return { id: e.id, l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top) }; }));
const tile = (p, k) => p.evaluate(k => { const t = document.querySelector('#projectView .ja-menu [data-jm="' + k + '"]'); if (t) t.click(); window.scrollTo(0, 0); }, k);
{
  const { p, close } = await page(3440, 1440);
  await tile(p, 'estimates'); await wait(1200);
  const a = await panes(p);
  const ov = a.find(x => x.id === 'tab-overview'), es = a.find(x => x.id === 'tab-estimates');
  ok(!!ov && !!es && es.l >= ov.r && Math.abs(es.t - ov.t) < 60, 'A  3440: Estimates opens beside the client page', a);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#tab-estimates button')].find(x => /Back to client profile/.test(x.textContent)); if (b) b.click(); }); await wait(900);
  const b = await panes(p);
  ok(b.length === 1 && b[0].id === 'tab-overview' && !(await p.evaluate(() => document.getElementById('projectView').classList.contains('cr-split'))), 'B  Back to client profile closes the side', b);
  await tile(p, 'estimates'); await wait(900);
  await p.setViewportSize({ width: 1440, height: 900 }); await wait(900);
  const d = await panes(p);
  ok(d.length === 1 && d[0].id === 'tab-estimates', 'D  shrinking to 1440 drops back to one section', d);
  await p.setViewportSize({ width: 3440, height: 1440 }); await wait(600);
  await p.evaluate(() => { if (typeof showTab === 'function') showTab('overview'); document.body.classList.add('claim-community'); }); await wait(300);
  await p.evaluate(() => { if (typeof showTab === 'function') showTab('estimates'); }); await wait(600);
  const e = await p.evaluate(() => document.getElementById('projectView').classList.contains('cr-split'));
  ok(e === false, 'E  a Community job never splits', e);
  await close();
}
{
  const { p, close } = await page(1440, 900);
  await tile(p, 'estimates'); await wait(1200);
  const c = await panes(p);
  ok(c.length === 1 && c[0].id === 'tab-estimates', 'C  1440: Estimates replaces the page, as before', c);
  await close();
}
await browser.close();
console.log(`GATE 1471 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
