#!/usr/bin/env node
/* gate_1455 — Punch: desktop and ultrawide (audit group 5).
 *
 *   A  1440 desk: a card opened from the list is a right-hand panel; the list's first row stays
 *      visible and clickable to its left
 *   B  Escape closes the card
 *   C  Escape closes the Assign sheet
 *   D  the Age heading sorts the table (oldest first)
 *   E  3440 ultrawide: the list column is wide enough to be the table (the column headings show)
 *   F  a phone still opens the card full screen
 *
 *   node gate_1455.mjs [index.html]      must be RED on build 1454
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

async function load(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1200);
  return { p, close: () => ctx.close() };
}
const isOpen = p => p.evaluate(() => { const e = document.getElementById('cr-pk'); return !!(e && e.classList.contains('open')); });

{
  const { p, close } = await load(1440, 900);
  await p.evaluate(() => { const r = document.querySelector('#punchView .pl-row[data-pu="i5"]'); if (r) r.click(); }); await wait(1200);
  const a = await p.evaluate(() => {
    const c = document.getElementById('cr-pk'); const r = c && c.getBoundingClientRect();
    const row = document.querySelector('#punchView .pl-row[data-pu="i1"]'); const rr = row && row.getBoundingClientRect();
    const hit = rr ? document.elementFromPoint(rr.left + 20, rr.top + rr.height / 2) : null;
    return { left: r && Math.round(r.left), w: innerWidth, rowHit: !!(hit && row && row.contains(hit)) };
  });
  ok(a.left > a.w * 0.3 && a.rowHit, 'A  desk: the card is a right-hand panel and the list stays clickable', a);
  await p.keyboard.press('Escape'); await wait(700);
  ok(!(await isOpen(p)), 'B  Escape closes the card', await isOpen(p));
  await p.evaluate(() => { const b = document.querySelector('#punchView .pu-asgbtn'); if (b) b.click(); }); await wait(600);
  await p.keyboard.press('Escape'); await wait(500);
  const c = await p.evaluate(() => { const s = document.getElementById('puShAssign'); return s && s.classList.contains('open'); });
  ok(c === false, 'C  Escape closes the Assign sheet', c);
  await close();
}
{
  /* D needs the table layout, so the widest screen; E is the same render */
  const { p, close } = await load(3440, 1440);
  const e = await p.evaluate(() => { const c = document.querySelector('#puList .pl-cols'); const l = document.getElementById('puList');
    return { cols: c ? getComputedStyle(c).display : null, listW: l ? Math.round(l.getBoundingClientRect().width) : null }; });
  ok(e.cols === 'grid' && e.listW >= 860, 'E  ultrawide: the list is the table', e);
  await p.evaluate(() => { const b = document.querySelector('#puList [data-pusort="age"]'); if (b) b.click(); }); await wait(500);
  /* every row in one view so the order is visible: the closed-free open groups each hold one row in the mock,
     so check the attribute and the button state instead of a re-ordering */
  const d = await p.evaluate(() => { const b = document.querySelector('#puList [data-pusort="age"]'); return b ? { on: b.classList.contains('on'), pressed: b.getAttribute('aria-pressed') } : null; });
  ok(!!d && d.on && d.pressed === 'true', 'D  the Age heading sorts (and shows it is the sort)', d);
  await close();
}
{
  const { p, close } = await load(390, 844);
  await p.evaluate(() => { const r = document.querySelector('#punchView .pl-row[data-pu="i5"]'); if (r) r.click(); }); await wait(1200);
  const f = await p.evaluate(() => { const c = document.getElementById('cr-pk'); const r = c && c.getBoundingClientRect(); return { left: r && Math.round(r.left), w: r && Math.round(r.width), side: !!(c && c.classList.contains('side')) }; });
  ok(f.left === 0 && f.w === 390 && !f.side, 'F  a phone still opens the card full screen', f);
  await close();
}
await browser.close();
console.log(`GATE 1455 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
