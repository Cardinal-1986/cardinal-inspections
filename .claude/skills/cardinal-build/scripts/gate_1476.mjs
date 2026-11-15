#!/usr/bin/env node
/* gate_1476 — Crew Dispatch in Production's look; the desk widths.
 *
 *   A  desk 1440: Dispatch sits under the header and beside the menu (it covered both)
 *   B  Dispatch's crew names are in Production's sans, not capitals, not a typewriter face
 *   C  a crew row says "Nothing booked …" / "Booked all 7 days" (sentence case)
 *   D  3440: Dispatch's column is wider than 1180, and the Full calendar is as wide as home
 *   E  desk 1440: the home month names what is on a day (tomorrow: Mark Diamond); phone keeps the pips
 *
 *   node gate_1476.mjs [index.html]      must be RED on build 1475
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
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 260000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

async function page(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss());
  if (process.env.GATE_NOW) await p.clock.install({ time: new Date(process.env.GATE_NOW) });
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'production').run(); }); await wait(1800);
  return { ctx, p };
}
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); const pad = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

/* E (desk) first, while on the home */
let { ctx, p } = await page(1440, 900);
/* tomorrow by the PAGE's clock, not Node's - they differ under GATE_NOW or a TZ mismatch */
const tk = await p.evaluate('(' + tomorrow.toString() + ')()');
const e1 = await p.evaluate(k => { const c = document.querySelector('#cr-pb .pbmonth .pbday[data-day="' + k + '"]'); if (!c) return null;
  return { names: [...c.querySelectorAll('.cch')].filter(x => x.getClientRects().length).map(x => x.textContent), pips: [...c.querySelectorAll('.pbpip')].filter(x => x.getClientRects().length).length }; }, tk);
ok(!!e1 && e1.names.some(t => /Mark Diamond/.test(t)) && e1.pips === 0, 'E  desk: the home month names tomorrow\'s job', e1);

/* A, B, C */
await p.evaluate(() => { const b = document.querySelector('#cr-pb [data-hub="dispatch"]'); b && b.click(); }); await wait(2400);
const a = await p.evaluate(() => {
  const d = document.getElementById('cr-disp'), r = d.getBoundingClientRect();
  const nav = document.getElementById('cr-lnav'), nr = nav && nav.getClientRects().length ? nav.getBoundingClientRect() : null;
  const hd = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--headh')) || 0;
  const cn = document.querySelector('#cr-disp .crewc .cn'), cs = cn ? getComputedStyle(cn) : null;
  return { open: d.classList.contains('open'), left: Math.round(r.left), top: Math.round(r.top), navRight: nr ? Math.round(nr.right) : null, headh: hd,
    font: cs ? cs.fontFamily : null, tt: cs ? cs.textTransform : null,
    cf: [...document.querySelectorAll('#cr-disp .crewc .cf')].map(x => x.textContent) };
});
ok(a.open && a.navRight != null && a.left >= a.navRight - 1 && a.top > 0, 'A  desk: Dispatch sits beside the menu and under the header', a);
ok(!!a.font && !/mono|Menlo|Consolas/i.test(a.font) && a.tt === 'none', 'B  crew names in the sans, not capitals', { font: a.font, tt: a.tt });
ok(a.cf.length && a.cf.every(t => /^(Nothing booked |Booked all 7 days)/.test(t)), 'C  crew rows in sentence case', a.cf);
await ctx.close();

/* D */
({ ctx, p } = await page(3440, 1440));
const homeW = await p.evaluate(() => Math.round(document.querySelector('#cr-pb .pbwrap.pbhome').getBoundingClientRect().width));
await p.evaluate(() => { const b = document.querySelector('#cr-pb [data-go="cal"]'); b && b.click(); }); await wait(1300);
const calW = await p.evaluate(() => { const w = document.querySelector('#cr-pb .pbwrap.pbcalw'); return w ? Math.round(w.getBoundingClientRect().width) : null; });
await p.evaluate(async () => { await window.CardinalDispatch.open(); }); await wait(2200);
const dW = await p.evaluate(() => { const w = document.querySelector('#cr-disp .dspwrap'); return w ? Math.round(w.getBoundingClientRect().width) : null; });
ok(dW > 1180 && calW != null && Math.abs(calW - homeW) <= 2, 'D  3440: Dispatch uses the width; Full calendar as wide as home', { homeW, calW, dW });
await ctx.close();

/* E (phone) */
({ ctx, p } = await page(390, 844));
const e2 = await p.evaluate(k => { const c = document.querySelector('#cr-pb .pbmonth .pbday[data-day="' + k + '"]'); if (!c) return null;
  return { names: [...c.querySelectorAll('.cch')].filter(x => x.getClientRects().length).length, pips: [...c.querySelectorAll('.pbpip')].filter(x => x.getClientRects().length).length }; }, tk);
ok(!!e2 && e2.names === 0 && e2.pips > 0, 'E  phone: the month keeps its pips, no names', e2);
await ctx.close();

await browser.close();
console.log(`GATE 1476 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
