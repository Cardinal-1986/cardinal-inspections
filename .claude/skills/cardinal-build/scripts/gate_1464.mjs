#!/usr/bin/env node
/* gate_1464 — the punch search finds more; desk sheets open as a centred dialog.
 *
 *   A  searching "repair" finds the repair (by its kind), and not the punch-outs
 *   B  searching a word that is only in a job's messages finds that job
 *   C  1440 desk: the Assign sheet opens in the middle of the screen, not hanging from the top
 *
 *   node gate_1464.mjs [index.html]      must be RED on build 1463
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
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  await p.evaluate(async () => { await window.supa.from('punch_items').update({ comments: [{ by: 'curtis@cardinalrenovations.net', name: 'Curtis', at: new Date().toISOString(), text: 'bring the marmalade ladder' }] }).eq('id', 'i4'); });
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1000);
  return { p, close: () => ctx.close() };
}
const search = (p, q) => p.evaluate(async q => {
  const i = document.getElementById('puSearch'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
  return [...document.querySelectorAll('#puList .pl-row[data-pu], #puQueue .pu-card[data-pu]')].map(e => e.getAttribute('data-pu'));
}, q);
{
  const { p, close } = await page(390, 844);
  const a = await search(p, 'repair');
  ok(a.includes('i1') && !a.includes('i5') && !a.includes('i4'), 'A  "repair" finds the repair by its kind', a);
  const b = await search(p, 'marmalade');
  ok(b.length === 1 && b[0] === 'i4', 'B  a word only in the messages finds the job', b);
  await close();
}
{
  const { p, close } = await page(1440, 900);
  await p.evaluate(() => { const b = document.querySelector('#punchView .pu-asgbtn'); if (b) b.click(); }); await wait(700);
  const c = await p.evaluate(() => { const pn = document.querySelector('#puShAssign .panel'); if (!pn) return null; const r = pn.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), mid: Math.round((r.top + r.bottom) / 2), vh: innerHeight, w: Math.round(r.width) }; });
  ok(!!c && c.top > 20 && Math.abs(c.mid - c.vh / 2) < 60 && c.w <= 520, 'C  desk: the Assign sheet is a centred dialog', c);
  await close();
}
await browser.close();
console.log(`GATE 1464 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
