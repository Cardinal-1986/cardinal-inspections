#!/usr/bin/env node
/* gate_1458 — Punch health on the home screen.
 *
 *   A  Home carries one Punch & Repairs line under the pipeline: open, late (with the oldest age),
 *      unassigned, closed this week — red-edged when anything is late
 *   B  tapping it opens Punch & Repairs on the Past due view
 *
 *   node gate_1458.mjs [index.html]      must be RED on build 1457
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
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
await p.addInitScript(SETUP);
await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
await wait(5000);
const a = await p.evaluate(() => {
  const b = document.querySelector('#mainView #kpPunchHealth .pu-health');
  const pipe = document.getElementById('pipeRow'); const cal = document.getElementById('cal30Grid');
  const y = e => e ? e.getBoundingClientRect().top + scrollY : null;
  return { txt: b && b.textContent.replace(/\s+/g, ' '), late: !!(b && b.classList.contains('late')), y: y(b), pipeY: y(pipe), calY: y(cal) };
});
ok(!!a.txt && /4 open/.test(a.txt) && /1 late \(oldest \d+d\)/.test(a.txt) && /1 unassigned/.test(a.txt) && /closed this week/.test(a.txt) && a.late && a.y > a.pipeY && a.y < a.calY,
   'A  Home: the punch health line under the pipeline, red-edged when late', a);
await p.evaluate(() => { const b = document.querySelector('#kpPunchHealth .pu-health'); if (b) b.click(); }); await wait(1500);
const b = await p.evaluate(() => ({ shown: (document.getElementById('punchView') || {}).style && document.getElementById('punchView').style.display,
  grp: [...document.querySelectorAll('#puList .pl-grp')].map(x => x.textContent), back: !!document.querySelector('#puList .pl-back') }));
ok(b.shown === 'block' && b.back && b.grp.length === 1 && /^Past due/.test(b.grp[0]), 'B  a tap opens the Past due view', b);
await browser.close();
console.log(`GATE 1458 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
