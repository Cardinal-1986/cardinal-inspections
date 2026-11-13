#!/usr/bin/env node
/* gate_1457 — Punch: the 5-photo lock off for bosses, for now (PHOTO_LOCK = false).
 *
 *   A  Theo, an open item with no photos and no steps: the Close button is ready ("everything is done")
 *   B  Theo can actually close it: the item is written as done
 *   C  Theo's photo header says "suggested", not "to close"
 *   D  Scottie (crew) on the same item still needs five photos before telling Curtis
 *
 *   node gate_1457.mjs [index.html]      must be RED on build 1456
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

async function card(who) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=' + who, { waitUntil: 'domcontentloaded' });
  await wait(3800);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1000);
  /* i4: open, no photos, no steps */
  try { await p.evaluate(() => { const r = document.querySelector('#punchView .pl-row[data-pu="i4"]'); if (r) r.click(); }); } catch (e) {}
  await wait(1200);
  const v = await p.evaluate(() => {
    const b = [...document.querySelectorAll('#cr-pk .pkclose')].find(e => e.getBoundingClientRect().height > 0);
    const h = document.querySelector('#cr-pk #pkSecPh .pkh .rt');
    return { cls: b && b.className, txt: b && b.textContent, act: b && b.getAttribute('data-act'), head: h && h.textContent };
  });
  return { p, v, close: () => ctx.close() };
}

{
  const { p, v, close } = await card('theo');
  ok(/ready/.test(v.cls || '') && /everything is done/.test(v.txt || ''), 'A  Theo, no photos: Close is ready', v);
  ok(/suggested/.test(v.head || '') && !/to close/.test(v.head || ''), 'C  Theo\'s photo header says suggested', v.head);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#cr-pk .pkclose')].find(e => e.getBoundingClientRect().height > 0); if (b) b.click(); });
  await wait(700);
  await p.evaluate(() => { const g = document.querySelector('.askgo'); if (g && g.offsetParent) g.click(); });
  await wait(1500);
  const w = await p.evaluate(() => (window.__WRITES__ || []).filter(x => x && x.table === 'punch_items').map(x => JSON.stringify(x.payload || {})));
  ok(w.some(x => /"status":"done"/.test(x)), 'B  Theo closes it: written as done', w.slice(-2));
  await close();
}
{
  const { v, close } = await card('scottie');
  ok(!/ready/.test(v.cls || '') && /5 photos/.test(v.txt || ''), 'D  Scottie still needs five photos', v);
  await close();
}
await browser.close();
console.log(`GATE 1457 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
