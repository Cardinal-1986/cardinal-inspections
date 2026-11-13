#!/usr/bin/env node
/* gate_1453 — Punch: one vocabulary, honest counts, lateness where people look (audit group 3).
 *
 *   A  the late repair's card: header says Repair (was Ticket) and "N days late — was due …"
 *   B  its Close / Finish button names the kind (repair), not "punch-out"
 *   C  the client page's heading and Job Menu tile read "Punch & Repairs" (were "Punch Outs").
 *      The app header keeps the short "Punch": the full name was cut off on a phone, and the
 *      page heading directly under it says Punch & Repairs.
 *   D  the client page's punch list: "Repair" (was the raw value "ticket") and "N days late"
 *   E  Production's tile: "Punch & Repairs" and "1 late"
 *   F  Closed list: a job filed 17 Aug and done 18 Aug reads "1d to close" (it kept ageing)
 *   G  Production's Closed opens the closed list, not open work
 *   H  the headline follows the kind tab (Callbacks → "0 open")
 *
 *   node gate_1453.mjs [index.html]      must be RED on build 1452
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
const run = async (p, name) => { try { await p.evaluate(async n => { await window.__sentinelStates.find(x => x.name === n).run(); }, name); } catch (e) {} await wait(1300); };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
  ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
  : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
await p.addInitScript(SETUP);
await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
await wait(3800);

/* H on the list (C is checked on the client page, below) */
await run(p, 'punch');
await p.evaluate(() => { const t = document.querySelector('#puTabs [data-putype="callback"]'); if (t) t.click(); }); await wait(600);
const h = await p.evaluate(() => (document.getElementById('puSub') || {}).textContent);
ok(/(^|\D)0 open/.test(h || ''), 'H  the headline follows the kind tab', h);
await p.evaluate(() => { const t = document.querySelector('#puTabs [data-putype="all"]'); if (t) t.click(); }); await wait(500);

/* F: the closed list */
await p.evaluate(() => { const b = document.querySelector('#punchView .pl-more, #punchView [data-pufocus="closed"]'); if (b) b.click(); }); await wait(800);
const f = await p.evaluate(() => { const r = document.querySelector('#puList .pl-row[data-pu="i2"] .pl-age'); return r && r.textContent; });
ok(f === '1d to close', 'F  a closed row shows days to close', f);

/* A, B on the late repair's card */
await run(p, 'punch');
await p.evaluate(() => { const r = document.querySelector('#punchView .pl-row[data-pu="i1"]'); if (r) r.click(); }); await wait(1200);
const a = await p.evaluate(() => ({ key: (document.querySelector('#cr-pk .pkey') || {}).textContent, late: (document.querySelector('#cr-pk .pklate') || {}).textContent,
  btn: [...document.querySelectorAll('#cr-pk .pkclose')].map(b => b.textContent).join(' | ') }));
ok(a.key === 'Repair' && /^\d+ days late — was due /.test(a.late || ''), 'A  the late repair says Repair and how late', a);
ok(/repair/i.test(a.btn || '') && !/punch-out/i.test(a.btn || ''), 'B  its Close / Finish button says repair', a.btn);
await p.evaluate(() => { const b = document.querySelector('#cr-pk [data-act="back"]'); if (b) b.click(); }); await wait(600);

/* D: the client page's punch list */
await run(p, 'client');
await p.evaluate(() => {
  const t = [...document.querySelectorAll('#projectView .jabox')].find(e => /Punch/i.test(e.textContent || '') && e.getBoundingClientRect().height > 0);
  if (t) t.click();
}); await wait(1500);
const d = await p.evaluate(() => { const rows = [...document.querySelectorAll('.pp-row, .cr-pp-item')].map(r => r.textContent.replace(/\s+/g, ' ').trim()); return rows; });
ok(d.some(t => /Repair/.test(t) && /\d+ days late/.test(t)) && !d.some(t => /\bticket\b/i.test(t)), 'D  client page: Repair, and how late', d.slice(0, 3));
const c = await p.evaluate(() => {
  const h = [...document.querySelectorAll('#projectView h3.projsec, #ppPage h3, h3.projsec')].map(x => x.textContent.trim()).filter(t => /Punch/.test(t));
  const tile = [...document.querySelectorAll('#projectView .jabox')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).filter(t => /Punch/.test(t));
  return { h, tile };
});
ok(c.h.length && c.h.every(t => /^Punch & Repairs$/.test(t)) && !c.tile.some(t => /Punch Outs/.test(t)), 'C  client page: the heading and the Job Menu tile say Punch & Repairs', c);

/* E, G on Production */
await run(p, 'production');
const e = await p.evaluate(() => { const t = document.querySelector('[data-box="punch"]'); return t && t.textContent.replace(/\s+/g, ' ').trim(); });
ok(/Punch & Repairs/.test(e || '') && /1 late/.test(e || ''), 'E  Production tile: Punch & Repairs, 1 late', e);
await p.evaluate(() => { const t = document.querySelector('[data-box="closed"]'); if (t) t.click(); }); await wait(1500);
const g = await p.evaluate(() => ({ back: !!document.querySelector('#puList .pl-back'), grp: [...document.querySelectorAll('#puList .pl-grp')].map(x => x.textContent) }));
ok(g.back && g.grp.some(x => /^Closed/.test(x)), 'G  Production Closed opens the closed list', g);

await browser.close();
console.log(`GATE 1453 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
