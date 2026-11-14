#!/usr/bin/env node
/* gate_1466 — a field login (Scottie) can reach Install photos, and a job with no punch-out is not a dead end.
 *
 *   A  Scottie taps a job being installed (Approved): the field job sheet opens with Directions, Call,
 *      an Install photos row and the job's open punch items
 *   B  its Install photos row opens the Install photos sheet
 *   C  a punch row on the sheet opens that punch card
 *   D  a job past install (Completed) with a punch-out still opens its punch card directly (unchanged)
 *   E  a Lead with no punch-out and no address opens the sheet (not a toast), says so, offers no Install photos
 *
 *   node gate_1466.mjs [index.html]      must be RED on build 1465
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
await p.goto('https://cardinal.test/?as=scottie', { waitUntil: 'domcontentloaded' });
await wait(4000);
const vis = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; }, sel);
const setStage = (id, st) => p.evaluate(([id, st]) => { const pr = (window.cacheProjects || (typeof cacheProjects !== 'undefined' ? cacheProjects : [])).find(x => x.id === id); if (pr) pr.stage = st; }, [id, st]);
const closeAll = () => p.evaluate(() => { document.querySelectorAll('#cr-fjob.open,#cr-inst-sheet.open').forEach(e => e.classList.remove('open')); try { window.CardinalPunchCard && window.CardinalPunchCard.close && window.CardinalPunchCard.close(); } catch (e) {} });
try { await p.evaluate(async () => { if (window.CardinalPunch && window.CardinalPunch.load) await window.CardinalPunch.load(); }); } catch (e) {}

await setStage('p1', 'Approved');
await p.evaluate(() => openProject('p1')); await wait(1200);
const a = await p.evaluate(() => {
  const s = document.querySelector('#cr-fjob.open .fj-box'); if (!s) return null;
  return { name: (s.querySelector('#fjName') || {}).textContent, btns: [...s.querySelectorAll('.fj-btn')].map(b => b.textContent.trim()), inst: !!s.querySelector('[data-fj-inst]'), punch: s.querySelectorAll('[data-fj-punch]').length,
           money: /\$\s?\d|Balance|Payments/.test(s.innerText) };
});
ok(!!a && a.name === 'Mark Diamond' && a.btns.includes('Directions') && a.btns.includes('Call') && a.inst && a.punch >= 1 && !a.money, 'A  a job being installed opens the field job sheet (directions, call, install photos, punch, no money)', a);

await p.evaluate(() => { const b = document.querySelector('#cr-fjob [data-fj-inst]'); if (b) b.click(); }); await wait(900);
ok(await vis('#cr-inst-sheet.open .in-box'), 'B  its Install photos row opens the Install photos sheet');
await closeAll(); await wait(300);

await p.evaluate(() => openProject('p1')); await wait(1000);
const pid = await p.evaluate(() => { const b = document.querySelector('#cr-fjob [data-fj-punch]'); if (!b) return null; const id = b.getAttribute('data-fj-punch'); b.click(); return id; }); await wait(1200);
ok(!!pid && await vis('#cr-pk') && !(await vis('#cr-fjob.open')), 'C  a punch row opens that punch card and closes the sheet', pid);
await closeAll(); await wait(300);

await setStage('p1', 'Completed');
await p.evaluate(() => openProject('p1')); await wait(1200);
ok(await vis('#cr-pk') && !(await vis('#cr-fjob.open')), 'D  a job past install with a punch-out opens its punch card directly');
await closeAll(); await wait(300);

await p.evaluate(() => openProject('p3')); await wait(1000);
const e = await p.evaluate(() => { const s = document.querySelector('#cr-fjob.open .fj-box'); return s ? { txt: s.innerText.replace(/\s+/g, ' ').slice(0, 200), inst: !!s.querySelector('[data-fj-inst]') } : null; });
ok(!!e && /No address on file yet/.test(e.txt) && /Nothing open on this job/.test(e.txt) && !e.inst, 'E  a lead with nothing on it opens the sheet and says so, no Install photos', e);

await browser.close();
console.log(`GATE 1466 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
