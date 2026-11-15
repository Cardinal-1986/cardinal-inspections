#!/usr/bin/env node
/* gate_1474 — Production on a phone: today first; a field login gets "My day".
 *
 *   A  phone, Theo: the boxes and today's list sit ABOVE the month grid, and the Today row is hidden
 *   B  phone, Scottie: "My day" is the first thing under the sky, with Directions (a maps link) and Open
 *   C  phone, Scottie: no Needs ordered / Ordered / Scheduled tiles (office work); the Punch tile stays
 *   D  desk (1280), Theo: the landing is still the grid, unchanged
 *
 *   node gate_1474.mjs [index.html]      must be RED on build 1473
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

async function land(who, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss());
  if (process.env.GATE_NOW) await p.clock.install({ time: new Date(process.env.GATE_NOW) });
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=' + who, { waitUntil: 'domcontentloaded' }); await wait(3800);
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'production').run(); }); await wait(1800);
  const r = await p.evaluate(() => {
    const top = sel => { const e = document.querySelector(sel); if (!e || !e.getClientRects().length) return null; return Math.round(e.getBoundingClientRect().top); };
    const home = document.querySelector('#cr-pb .pbhome');
    const row = document.querySelector('#cr-pb .pbmine .pbmrow');
    const dir = row && row.querySelector('a.pbact');
    return {
      display: home ? getComputedStyle(home).display : null,
      sky: top('#cr-pb .pbsky'), mine: top('#cr-pb .pbmine'), tiles: top('#cr-pb .pbtiles'),
      dayRule: top('#cr-pb #pbDayRule'), month: top('#cr-pb .pbmonth'), today: top('#cr-pb .pbtoday'),
      dirHref: dir ? dir.getAttribute('href') : null, open: !!(row && row.querySelector('button[data-item]')),
      boxes: [...document.querySelectorAll('#cr-pb .pbtiles [data-box]')].filter(e => e.getClientRects().length).map(e => e.getAttribute('data-box')),
    };
  });
  await ctx.close();
  return r;
}

const t = await land('theo', 390, 844);
ok(t.tiles != null && t.month != null && t.tiles < t.month && t.dayRule != null && t.dayRule < t.month && t.today == null,
  'A  phone: boxes and today\'s list above the month; the Today row hidden', t);

const s = await land('scottie', 390, 844);
ok(s.mine != null && s.tiles != null && s.mine < s.tiles && /maps/.test(s.dirHref || '') && s.open,
  'B  Scottie: My day first, with Directions and Open', s);
ok(!s.boxes.includes('needs') && !s.boxes.includes('ordered') && !s.boxes.includes('sched') && s.boxes.includes('punch'),
  'C  Scottie: no materials or scheduling tiles; Punch stays', s.boxes);

const d = await land('theo', 1280, 900);
ok(d.display === 'grid' && d.mine == null, 'D  desk: still the grid, no My day for Theo', { display: d.display, mine: d.mine });

await browser.close();
console.log(`GATE 1474 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
