#!/usr/bin/env node
/* gate_1473 — Production's lists tell the truth.
 *
 *   A  Needs ordered: a job building in 2 days ("Zed Soon") sits ABOVE undated jobs ("Aaron Undated") — it sorted by name
 *   B  that card shows its build day on its own line ("Build …"), not tail-clipped onto the address
 *   C  Needs a date lists an undated job that is already ORDERED (it only listed un-ordered ones)
 *   D  the Punch tile says "past due" (the Punch page's word), and the Closed row says "Punch closed"
 *   E  a Completed job with a past build day is not counted in Scheduled
 *
 *   node gate_1473.mjs [index.html]      must be RED on build 1472
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
const p = await ctx.newPage(); p.on('dialog', d => d.dismiss());
await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
await p.addInitScript(SETUP);
await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
/* plant: Zed (Approved, build in 2 days, not ordered), Aaron (Approved, undated, not ordered),
   Olive (Scheduled, undated, ORDERED), Fin (Completed, build 10 days ago) */
await p.evaluate(() => {
  const key = off => { const d = new Date(); d.setDate(d.getDate() + off); const pad = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const mk = (id, name, stage, ck) => ({ id, name, address: '1 Test St', city: 'Dayton', stage, crm: 'retail', created_by: 'theo@cardinalrenovations.net', checklist: JSON.stringify(ck || {}), created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' });
  window.cacheProjects.push(mk('gz', 'Zed Soon', 'Approved'), mk('ga', 'Aaron Undated', 'Approved'),
    mk('go', 'Olive Ordered', 'Scheduled', { materials_ordered_at: '2026-11-01T10:00:00Z' }), mk('gf', 'Fin Finished', 'Completed'));
  window.cacheAppts.push({ id: 'gaz', project_id: 'gz', kind: 'job', title: 'Build', appt_date: key(2) }, { id: 'gaf', project_id: 'gf', kind: 'job', title: 'Build', appt_date: key(-10) });
});
const openProd = async () => { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'production').run(); }); await wait(1800); };
const click = sel => p.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => x.getClientRects().length); if (!e) return false; e.click(); return true; }, sel);

await openProd();
const home = await p.evaluate(() => ({ sched: (document.querySelector('#cr-pb [data-box="sched"] .v') || {}).textContent, punch: (document.querySelector('#cr-pb [data-box="punch"]') || {}).innerText, closed: (document.querySelector('#cr-pb [data-box="closed"]') || {}).innerText }));
await click('#cr-pb [data-box="needs"]'); await wait(1300);
const needs = await p.evaluate(() => [...document.querySelectorAll('#cr-pb .pbjob')].filter(e => e.getClientRects().length).map(e => ({ n: (e.querySelector('.nm .t') || {}).textContent, bd: (e.querySelector('.bd') || {}).textContent || null })));
const iz = needs.findIndex(x => x.n === 'Zed Soon'), ia = needs.findIndex(x => x.n === 'Aaron Undated');
ok(iz >= 0 && ia >= 0 && iz < ia, 'A  a job building in 2 days sits above undated jobs', needs.map(x => x.n));
const z = needs[iz] || {};
ok(!!z.bd && /^Build \w{3}, \w{3} \d+$/.test(z.bd.trim()), 'B  the build day has its own line', z.bd);

await openProd();
await click('#cr-pb [data-go="cal"]'); await wait(1400);
const nad = await p.evaluate(() => document.body.innerText.includes('Olive Ordered') && /Needs a date/i.test(document.body.innerText));
ok(nad, 'C  Needs a date lists an undated job that is already ordered');

ok(/past due|none past due/i.test(home.punch || '') && /Punch closed/i.test(home.closed || ''), 'D  Punch tile says past due; Closed row says Punch closed', home);
/* Scheduled should count Zed (dated) but not Fin (completed): seed jobs dated via crew/appts + Zed */
const schedIds = await p.evaluate(() => { const s = window.CardinalProduction && window.CardinalProduction.__boxes ? null : null; return null; });
await openProd();
await click('#cr-pb [data-box="sched"]'); await wait(1300);
const sched = await p.evaluate(() => [...document.querySelectorAll('#cr-pb .pbjob .nm .t')].filter(e => e.getClientRects().length).map(e => e.textContent));
ok(sched.includes('Zed Soon') && !sched.includes('Fin Finished'), 'E  Scheduled lists Zed, not the finished job', sched);

await browser.close();
console.log(`GATE 1473 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
