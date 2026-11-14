#!/usr/bin/env node
/* gate_1467 — the client page says where the job stands, under the stage bar.
 *
 *   A  the status line sits directly under the stage band — phone, 1440 desk, 2560 wide (it fell to the
 *      bottom of the page in the first render: the Overview orders its cards with CSS `order`)
 *   B  an Approved job with no contract says "No signed contract", and tapping it opens Contracts
 *   C  a future appointment shows as "Next: ..."
 *   D  a signed contract shows "Contract signed" and the Contracts tile says Signed; Orders says To order
 *   E  with a signed $10,000 contract Theo sees "Balance $10,000.00"; a production login (Curtis) sees no balance
 *   F  on a phone it is one row (it scrolls sideways), guarded with overscroll-behavior-x:contain
 *
 *   node gate_1467.mjs [index.html]      must be RED on build 1466
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
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
async function page(w, h, who) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=' + (who || 'theo'), { waitUntil: 'domcontentloaded' });
  await wait(3800);
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); });
  await wait(1500);
  return { p, close: () => ctx.close() };
}
const rerender = p => p.evaluate(async () => { if (typeof renderOverview === 'function') renderOverview(); else if (typeof renderAcxOverview === 'function') renderAcxOverview(); await new Promise(r => setTimeout(r, 900)); window.scrollTo(0, 0); });
const chips = p => p.evaluate(() => [...document.querySelectorAll('#dbStatus .dbst')].map(b => ({ t: b.textContent.trim(), c: b.className })));
const place = p => p.evaluate(() => { const b = document.querySelector('#projectView .dbstage'), s = document.getElementById('dbStatus'); if (!b || !s) return null; const rb = b.getBoundingClientRect(), rs = s.getBoundingClientRect(); return { gap: Math.round(rs.top - rb.bottom), h: Math.round(rs.height), w: Math.round(rs.width) }; });
const addContract = (p, signed, total) => p.evaluate(([signed, total]) => { cacheRows.push({ id: 'gc1467', project_id: 'p1', title: 'Contract — Roofing', created_at: '2026-11-01T10:00:00Z', created_by: 'theo@cardinalrenovations.net', sent_at: '2026-11-01T11:00:00Z', signed_at: signed ? '2026-11-02T12:00:00Z' : null, total: total }); }, [signed, total]);

{ /* phone: A, B, C, D, F */
  const { p, close } = await page(390, 844);
  const a = await place(p);
  ok(!!a && a.gap >= -2 && a.gap <= 24, 'A  phone: the status line sits right under the stage band', a);
  const f = await p.evaluate(() => { const s = document.getElementById('dbStatus'); if (!s) return null; const cs = getComputedStyle(s); return { wrap: cs.flexWrap, ox: cs.overflowX, ob: cs.overscrollBehaviorX, h: Math.round(s.getBoundingClientRect().height) }; });
  ok(!!f && f.wrap === 'nowrap' && /auto|scroll/.test(f.ox) && f.ob === 'contain' && f.h <= 52, 'F  phone: one sideways row, guarded against swipe-back', f);
  const b = await chips(p);
  ok(b.length > 0 && b[0].t === 'No signed contract' && /\bbad\b/.test(b[0].c), 'B  an Approved job with no contract says so, in red', b.slice(0, 2));
  await p.evaluate(() => { const c = document.querySelector('#dbStatus [data-st-go="contracts"]'); if (c) c.click(); }); await wait(1200);
  const bOpen = await p.evaluate(() => /No contracts yet|New contract/.test(document.body.innerText));
  ok(bOpen, 'B  tapping it opens Contracts');
  await p.evaluate(async () => { if (typeof openProject === 'function') openProject('p1'); await new Promise(r => setTimeout(r, 1200)); });
  await p.evaluate(() => { const d = new Date(Date.now() + 3 * 864e5); const pad = n => (n < 10 ? '0' : '') + n; cacheAppts.push({ id: 'ga1467', project_id: 'p1', title: 'Install', appt_date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), appt_time: '09:30:00' }); });
  await rerender(p);
  const c = await chips(p);
  ok(c.some(x => /^Next: .+9:30 am$/.test(x.t)), 'C  a future appointment shows as Next: …', c.map(x => x.t));
  await addContract(p, true, 0); await rerender(p);
  const d = await chips(p);
  const tiles = await p.evaluate(() => ({ con: (document.querySelector('#projectView .ja-menu [data-jm="contracts"] .jan') || {}).textContent, ord: (document.querySelector('#projectView .ja-menu [data-jm="materials"] .jan') || {}).textContent }));
  ok(d.length > 0 && /^Contract signed/.test(d[0].t) && /\bok\b/.test(d[0].c) && tiles.con === 'Signed' && tiles.ord === 'To order', 'D  signed contract: chip + Contracts tile say so; Orders says To order', { chip: d[0], tiles });
  await close();
}
{ /* desk + wide: A */
  for (const [w, h] of [[1440, 900], [2560, 1080]]) {
    const { p, close } = await page(w, h);
    const a = await place(p);
    ok(!!a && a.gap >= -2 && a.gap <= 30 && a.w > w * 0.3, 'A  ' + w + 'px: the status line sits right under the stage band, across the page', a);
    await close();
  }
}
{ /* E: money for Theo, none for Curtis */
  for (const who of ['theo', 'curtis']) {
    const { p, close } = await page(390, 844, who);
    await addContract(p, true, 10000); await rerender(p);
    const e = await chips(p);
    const bal = e.find(x => /^Balance|^Paid in full/.test(x.t));
    if (who === 'theo') ok(!!bal && /^Balance \$10,000(\.00)?$/.test(bal.t), 'E  Theo sees the balance on a signed $10,000 job', e.map(x => x.t));
    else ok(e.length > 0 && !bal, 'E  a production login (Curtis) sees the line but no balance', e.map(x => x.t));
    await close();
  }
}
await browser.close();
console.log(`GATE 1467 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
