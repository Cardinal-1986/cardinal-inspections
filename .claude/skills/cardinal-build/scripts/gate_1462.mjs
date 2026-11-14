#!/usr/bin/env node
/* gate_1462 — the punch card, readable on a roof.
 *
 *   A  Directions / Open job, + Add step and the photo slot names are 13px (were 11)
 *   B  section headings are 12px (were 11)
 *   C  light theme: the On site bar is a light band, and its "On site since" reads at 4.5:1 or better
 *
 *   node gate_1462.mjs [index.html]      must be RED on build 1461
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
async function card(light) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1000);
  await p.evaluate(() => { const r = document.querySelector('#punchView .pl-row[data-pu="i5"]'); if (r) r.click(); }); await wait(1200);
  return { p, close: () => ctx.close() };
}
const fs = (p, sel) => p.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => x.getBoundingClientRect().height > 0); return e ? parseFloat(getComputedStyle(e).fontSize) : null; }, sel);
{
  const { p, close } = await card(false);
  const a = { dir: await fs(p, '#cr-pk .pkbtns .pkbtn'), add: await fs(p, '#cr-pk .pkadd'), slot: await fs(p, '#cr-pk .pkslot .sl') };
  ok(a.dir >= 13 && a.add >= 13 && a.slot >= 13, 'A  the buttons and photo slot names are 13px', a);
  const b = await fs(p, '#cr-pk .pkh');
  ok(b >= 12, 'B  section headings are 12px', b);
  await close();
}
{
  const { p, close } = await card(true);
  const c = await p.evaluate(() => {
    const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const bar = document.querySelector('#cr-pk .pkvis'), on = document.querySelector('#cr-pk .pkvon');
    if (!bar || !on) return { err: 'no bar' };
    const bg = rgb(getComputedStyle(bar).backgroundColor), fg = rgb(getComputedStyle(on).color);
    const a = lum(bg), b = lum(fg);
    return { bg: getComputedStyle(bar).backgroundColor, bgLum: +a.toFixed(2), ratio: +((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2) };
  });
  ok(c.bgLum > .6 && c.ratio >= 4.5, 'C  light: the On site bar is light and reads at 4.5:1', c);
  await close();
}
await browser.close();
console.log(`GATE 1462 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
