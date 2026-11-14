#!/usr/bin/env node
/* gate_1463 — "+ New" says what happened; the form is named; placeholders readable.
 *
 *   A  every control in the + New form has a name (aria-label)
 *   B  after Add it, Punch & Repairs says "Added — needs assigned" and rings the new item, even
 *      though the waiting box only shows three
 *   C  the search box's hint text reads at 4.5:1 or better (dark)
 *
 *   node gate_1463.mjs [index.html]      must be RED on build 1462
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
await wait(3800);
/* three more waiting items, so the box is capped and the new one would land past the first three */
await p.evaluate(async () => { for (let i = 0; i < 3; i++) await window.supa.from('punch_items').insert({ id: 'w' + i, project_id: 'p1', title: 'Older ' + i, kind: 'punch', priority: 'normal', status: 'open',
  assigned_to: null, created_by: 'theo@cardinalrenovations.net', created_at: '2026-09-0' + (i + 1) + 'T12:00:00Z', scheduled_at: null, photos: [], comments: [], steps: [], visits: [] }); });
try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
await wait(1000);
const c = await p.evaluate(() => {
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const i = document.getElementById('puSearch'); if (!i) return null;
  let n = i, bg = null; while (n && !bg) { const b = rgb(getComputedStyle(n).backgroundColor); if (b.length >= 3 && (b[3] === undefined || b[3] > .9)) bg = b; n = n.parentElement; }
  const fg = rgb(getComputedStyle(i, '::placeholder').color); const a = lum(bg || [0, 0, 0]), b = lum(fg);
  return +((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2);
});
ok(c !== null && c >= 4.5, 'C  the search hint reads at 4.5:1 or better', c);
await p.evaluate(() => { const b = document.getElementById('puNewBtn'); if (b) b.click(); }); await wait(900);
const a = await p.evaluate(() => [...document.querySelectorAll('#cr-pb-modal .sheet input, #cr-pb-modal .sheet select, #cr-pb-modal .sheet textarea')].map(e => ({ f: e.getAttribute('data-f'), name: e.getAttribute('aria-label') || '' })));
ok(a.length >= 5 && a.every(x => x.name), 'A  every + New control has a name', a);
const b = await p.evaluate(async () => {
  const m = document.getElementById('cr-pb-modal'); if (!m) return { err: 'no sheet' };
  const t = m.querySelector('[data-f="title"]'); t.value = 'Gate 1463 new item';
  const pj = m.querySelector('[data-f="project"]'); const o = [...pj.options].find(x => x.value); if (o) pj.value = o.value;
  m.querySelector('[data-act="save"]').click();
  await new Promise(r => setTimeout(r, 2000));
  const note = (document.querySelector('#puQueue .pu-note') || {}).textContent || '';
  const fl = document.querySelector('#punchView .pu-flash');
  return { note, flashed: fl ? fl.textContent.replace(/\s+/g, ' ').slice(0, 60) : null, cards: document.querySelectorAll('#puQueue .pu-card').length };
});
ok(/^Added/.test(b.note || '') && /needs assigned/.test(b.note || '') && /Gate 1463 new item/.test(b.flashed || ''), 'B  "+ New" says Added and rings the new item', b);
await browser.close();
console.log(`GATE 1463 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
