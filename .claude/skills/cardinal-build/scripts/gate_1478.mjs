#!/usr/bin/env node
/* gate_1478 — one Production door in the menu (the sentinel's DUPE after 1475 named both rows "Production").
 *
 *   A  Production portal, phone drawer: exactly one "Production" row is shown, and it is the
 *      section's (data-nav="prodboard"), beside Crew Dispatch and Punch & Repairs
 *   B  ...and it still opens Production
 *   C  Retail: exactly one, and it is Daily's (#cr-nav-production) — gate_955/956's door
 *   D  back to Production after Retail: still one (the hide is not one-shot)
 *   E  desktop rail at 1536 in Production: one "Production" item
 *
 *   node gate_1478.mjs [index.html]      must be RED on build 1477
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
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 180000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

async function boot(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss());
  if (process.env.GATE_NOW) await p.clock.install({ time: new Date(process.env.GATE_NOW) });
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
  return p;
}
/* the rail's own reading of the menu (scrape(): a row counts unless its inline display is none) */
const doors = p => p.evaluate(() => {
  const m = document.getElementById('navMenu'); if (!m) return null;
  let sec = null; const out = [];
  [...m.children].forEach(el => {
    if (el.classList.contains('navsec')) { sec = el.style.display === 'none' ? null : el.textContent.trim(); return; }
    if (!el.classList.contains('navopt') || el.style.display === 'none') return;
    if ((el.textContent || '').trim() === 'Production') out.push({ id: el.id || null, nav: el.getAttribute('data-nav'), sec });
  });
  return out;
});
const openProd = async p => { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'production').run(); }); await wait(1800); };

/* A–D: the phone drawer */
const p = await boot(390, 844);
await openProd(p);
const a = await doors(p);
ok(a && a.length === 1 && a[0].nav === 'prodboard' && a[0].sec === 'Production', 'A  Production portal: one "Production" row, the section\'s', a);
const b = await p.evaluate(async () => {
  try { window.hideAllViews && window.hideAllViews(); } catch (e) {}
  const r = document.querySelector('#navMenu .navopt[data-nav="prodboard"]'); if (r) r.click();
  await new Promise(r => setTimeout(r, 1500));
  return { pb: !!document.querySelector('#cr-pb.open') };
});
ok(b.pb, 'B  that row opens Production', b);
await p.evaluate(() => { try { window.CardinalProduction && window.CardinalProduction.close && window.CardinalProduction.close(); } catch (e) {} try { window.showHome && window.showHome(); } catch (e) {} });
await wait(1200);
await p.evaluate(() => { document.body.dataset.crm = 'retail'; document.body.dataset.crmHead = 'retail'; }); await wait(900);
const c = await doors(p);
ok(c && c.length === 1 && c[0].id === 'cr-nav-production', 'C  Retail: one "Production" row, Daily\'s', c);
await openProd(p);
const d = await doors(p);
ok(d && d.length === 1 && d[0].nav === 'prodboard', 'D  back in Production: still one', d);

/* E: the desktop rail mirrors the menu */
const q = await boot(1536, 900);
await openProd(q);
await wait(800);
const e = await q.evaluate(() => {
  const r = document.getElementById('cr-lnav'); if (!r) return { rail: false };
  const all = [...r.querySelectorAll('*')].filter(x => !x.children.length && (x.textContent || '').trim() === 'Production');
  /* one is the section heading; the rest are rows. A row is SHOWN when it has a box */
  return { rail: true, total: all.length, shown: all.filter(x => x.getClientRects().length).length };
});
ok(e.rail && e.total === 2 && e.shown === 2, 'E  1536 rail in Production: one "Production" row besides its heading, and it is on screen (the section opens on the way in)', e);

await browser.close();
console.log((fail ? 'RED' : 'GATE 1478 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
