#!/usr/bin/env node
/* gate_1475 — Production: the way back, and one name.
 *
 *   A  Open job from Production: the header still says Production (it said Retail)
 *   B  ...and Home goes back to Production
 *   C  the same client opened later from elsewhere is retail again (the hand-off does not stick)
 *   D  Crews from Production: header Production, "‹ Production" at the top, and it returns to Production
 *   E  the menu says Production (not Production Board); + Add reads "+ Punch item"
 *   F  the empty Scheduled list does not send you to the Schedule Board
 *
 *   node gate_1475.mjs [index.html]      must be RED on build 1474
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
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
await p.addInitScript(SETUP);
await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
const openProd = async () => { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'production').run(); }); await wait(1800); };
const head = () => p.evaluate(() => ({ head: document.body.dataset.crmHead || null, crm: document.body.dataset.crm || null, pb: !!document.querySelector('#cr-pb.open'),
  proj: (() => { const e = document.getElementById('projectView'); return !!(e && e.getClientRects().length); })() }));

/* A, B */
await openProd();
await p.evaluate(() => { const b = document.querySelector('#cr-pb [data-box="needs"]'); b && b.click(); }); await wait(1200);
const pid = await p.evaluate(() => { const b = document.querySelector('#cr-pb [data-job]'); if (!b) return null; const id = b.getAttribute('data-job'); b.click(); return id; });
await wait(2400);
const a = await head();
ok(!!pid && a.proj && a.head === 'production', 'A  Open job keeps the Production header', { pid, ...a });
await p.evaluate(() => { window.CardinalHeader.goHome(); }); await wait(2000);   /* the bottom bar Home and every "take me home" call this (756) */
const b = await head();
ok(b.pb && !b.proj, 'B  Home goes back to Production', b);

/* C: the same client from elsewhere */
await p.evaluate(id => { if (window.hideAllViews) try { window.hideAllViews(); } catch (e) {} if (window.openProject) window.openProject(id); }, pid); await wait(2400);
const c = await head();
ok(c.proj && c.head !== 'production', 'C  the same client opened elsewhere is not Production', c);

/* D: Crews */
await openProd();
await p.evaluate(() => { const b = document.querySelector('#cr-pb [data-hub="crews"]'); b && b.click(); }); await wait(2400);
const d1 = await p.evaluate(() => { const bk = document.querySelector('#crewsView [data-act="close"]'); return { head: document.body.dataset.crmHead, back: bk ? bk.textContent.trim() : null }; });
await p.evaluate(() => { const bk = document.querySelector('#crewsView [data-act="close"]'); bk && bk.click(); }); await wait(2000);
const d2 = await head();
ok(d1.head === 'production' && /Production/.test(d1.back || '') && d2.pb, 'D  Crews from Production: Production header, ‹ Production, and back to Production', { d1, back: d2.pb });

/* E */
await openProd();
const e = await p.evaluate(() => ({
  nav: [...document.querySelectorAll('[data-nav="prodboard"], [data-go="prodboard"]')].map(x => x.textContent.trim()),
  add: [...document.querySelectorAll('#cr-pb [data-add]')].map(x => x.textContent.trim())
}));
ok(e.nav.length && e.nav.every(t => t === 'Production') && e.add.length && e.add.every(t => t === '+ Punch item'), 'E  one name; + Punch item', e);

/* F: empty the Scheduled list and read its message */
await p.evaluate(() => { (window.cacheAppts || []).length = 0; });
await p.evaluate(async () => { const supa = window.supa; });
const f = await p.evaluate(() => {
  const s = [...document.querySelectorAll('script')].map(x => x.textContent).find(t => t.includes('No job has a build day')) || '';
  const m = s.match(/No job has a build day[^']*/); return m ? m[0] : null;
});
ok(!!f && !/Schedule Board/.test(f), 'F  the empty Scheduled message does not point at the Schedule Board', f);

ok(errs.length === 0, 'no page errors', errs);
await browser.close();
console.log(`GATE 1475 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
