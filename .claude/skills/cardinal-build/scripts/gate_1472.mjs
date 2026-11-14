#!/usr/bin/env node
/* gate_1472 — Production: one schedule. A crew booked in Crew Dispatch is the job's build day.
 *
 *   A  the Scheduled box counts the job booked only in Dispatch (seed: p1 Mark Diamond, crew work orders, no build-day appointment)
 *   B  tomorrow's day sheet lists "Mark Diamond — build day" with the crew named (Betos Home Improvements)
 *   C  Mark Diamond's card says "Crew: …" and "Move crew", and is not "Needs scheduling"; Kathy May's card offers "Book crew"
 *   D  "Book crew" opens Crew Dispatch with Kathy May in hand; Back returns to Production
 *   E  Dispatch's "Needs a crew" lists a sold (Approved) job with no work order
 *
 *   node gate_1472.mjs [index.html]      must be RED on build 1471
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
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); p.on('dialog', d => d.dismiss());
await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
await p.addInitScript(SETUP);
await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
const openProd = async () => { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'production').run(); }); await wait(1800); };
const click = (sel) => p.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => x.getClientRects().length); if (!e) return false; e.click(); return true; }, sel);

await openProd();
const a = await p.evaluate(() => { const t = document.querySelector('#cr-pb [data-box="sched"]'); return t ? t.innerText.replace(/\s+/g, ' ').trim() : null; });
ok(!!a && /^[1-9]/.test(a), 'A  the Scheduled box counts the job booked in Dispatch', a);

const tk = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); const pad = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); });
await click('#cr-pb .pbday[data-day="' + tk + '"]'); await wait(1300);
const b = await p.evaluate(() => document.body.innerText);
ok(/Mark Diamond — build day/.test(b) && /Crew: Betos[^\n]*, Pineda/i.test(b), 'B  tomorrow lists the build day with the crew named', (b.match(/Mark Diamond[^\n]{0,60}\n?[^\n]{0,60}/) || [''])[0]);

await openProd();
await click('#cr-pb [data-box="needs"]'); await wait(1300);
const c = await p.evaluate(() => [...document.querySelectorAll('#cr-pb .pbjob')].filter(e => e.getClientRects().length).map(e => e.innerText.replace(/\s+/g, ' ').trim()));
const md = c.find(x => /Mark Diamond/.test(x)) || '', km = c.find(x => /Kathy May/.test(x)) || '';
ok(/Crew: /i.test(md) && /Move crew/i.test(md) && !/Needs scheduling/i.test(md) && /Book crew/i.test(km), 'C  cards name the crew; Book crew / Move crew; no false Needs scheduling', { md: md.slice(0, 160), km: km.slice(0, 160) });

const kid = await p.evaluate(() => { const b = [...document.querySelectorAll('#cr-pb [data-book]')].find(x => /Book crew/.test(x.textContent)); if (!b) return null; const id = b.getAttribute('data-book'); b.click(); return id; });
await wait(2200);
const d1 = await p.evaluate(() => { const d = document.getElementById('cr-disp'); const a = document.querySelector('#cr-disp .uch.armed'); return { open: !!(d && d.classList.contains('open')), armed: a ? a.getAttribute('data-pid') : null }; });
await p.evaluate(() => { if (window.CardinalDispatch && window.CardinalDispatch.close) window.CardinalDispatch.close(); }); await wait(1500);
const d2 = await p.evaluate(() => { const e = document.getElementById('cr-pb'); return !!(e && e.classList.contains('open')); });
ok(!!kid && d1.open && String(d1.armed) === String(kid) && d2, 'D  Book crew opens Dispatch with the job in hand; Back returns to Production', { kid, d1, backToProd: d2 });

await p.evaluate(() => { const pr = (window.cacheProjects || []).find(x => x.id === 'p3'); if (pr) pr.stage = 'Approved'; });
await p.evaluate(async () => { if (window.CardinalDispatch) await window.CardinalDispatch.open(); }); await wait(1800);
const e = await p.evaluate(() => [...document.querySelectorAll('#cr-disp .uch')].map(x => x.getAttribute('data-pid')));
ok(e.includes('p3'), 'E  Needs a crew lists a sold (Approved) job with no work order', e);

await browser.close();
console.log(`GATE 1472 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
