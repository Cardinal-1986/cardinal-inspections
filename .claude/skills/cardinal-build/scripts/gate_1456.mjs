#!/usr/bin/env node
/* gate_1456 — Punch & Repairs in obsidian, with the hammer art (the punch audit's group 6, look A).
 *
 *   A  dark: the page carries the hammer art, screen-blended into the ground
 *   B  dark: list rows are obsidian cards (545's sheen, 12px corners)
 *   C  dark: the punch card's sections are obsidian
 *   D  dark: the kind tabs have no coloured cap
 *   E  dark: the Close button is not in capitals
 *   F  light is untouched: no art, no sheen on the rows
 *   G  dark: the client page's punch rows are obsidian
 *
 *   node gate_1456.mjs [index.html]      must be RED on build 1455
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

async function load(light) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1200);
  return { p, close: () => ctx.close() };
}
const LIST = () => {
  const v = document.getElementById('punchView'), k = v && getComputedStyle(v);
  const row = document.querySelector('#puList .pl-row:not(.late):not(.ping)'), rk = row && getComputedStyle(row);
  const tab = document.querySelector('#puTabs .pu-tab.k-punch'), tk = tab && getComputedStyle(tab, '::before');
  return { bgi: k && k.backgroundImage, blend: k && k.backgroundBlendMode, rowBgi: rk && rk.backgroundImage, rowR: rk && rk.borderTopLeftRadius, cap: tk && tk.backgroundColor };
};

{
  const { p, close } = await load(false);
  const l = await p.evaluate(LIST);
  ok(/punch-art-hammer\.jpg/.test(l.bgi || '') && /screen/.test(l.blend || ''), 'A  dark: the hammer art, screen-blended', { bgi: (l.bgi || '').slice(0, 80), blend: l.blend });
  ok(/radial-gradient/.test(l.rowBgi || '') && l.rowR === '12px', 'B  dark: list rows are obsidian cards', { bgi: (l.rowBgi || '').slice(0, 60), r: l.rowR });
  ok(l.cap === 'rgba(0, 0, 0, 0)', 'D  dark: no coloured cap on the kind tabs', l.cap);
  await p.evaluate(() => { const r = document.querySelector('#punchView .pl-row[data-pu="i5"]'); if (r) r.click(); }); await wait(1200);
  const c = await p.evaluate(() => { const s = document.querySelector('#cr-pk .pksec'), b = document.querySelector('#cr-pk .pkclose');
    return { sec: s && getComputedStyle(s).backgroundImage, tt: b && getComputedStyle(b).textTransform }; });
  ok(/radial-gradient/.test(c.sec || ''), 'C  dark: the card sections are obsidian', (c.sec || '').slice(0, 60));
  ok(c.tt === 'none', 'E  dark: the Close button is not in capitals', c.tt);
  await p.evaluate(() => { const b = document.querySelector('#cr-pk [data-act="back"]'); if (b) b.click(); }); await wait(500);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); }); } catch (e) {}
  await wait(1300);
  await p.evaluate(() => { const t = [...document.querySelectorAll('#projectView .jabox')].find(e => /Punch/.test(e.textContent || '') && e.getBoundingClientRect().height > 0); if (t) t.click(); }); await wait(1400);
  const g = await p.evaluate(() => { const r = document.querySelector('#ppPage .pp-row'); return r ? getComputedStyle(r).backgroundImage : null; });
  ok(/radial-gradient/.test(g || ''), 'G  dark: the client page punch rows are obsidian', (g || 'no .pp-row').slice(0, 60));
  await close();
}
{
  const { p, close } = await load(true);
  const l = await p.evaluate(LIST);
  ok(!/punch-art-hammer/.test(l.bgi || '') && !/radial-gradient/.test(l.rowBgi || ''), 'F  light is untouched: no art, no sheen', { bgi: (l.bgi || '').slice(0, 60), row: (l.rowBgi || '').slice(0, 40) });
  await close();
}
await browser.close();
console.log(`GATE 1456 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
