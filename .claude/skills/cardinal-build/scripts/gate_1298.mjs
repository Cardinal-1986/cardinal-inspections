#!/usr/bin/env node
/* gate_1298 — receipts (Theo's pick 3).
     A  the punch card has a Receipts section with Add receipt, and NO dollar figure
     B  Add receipt (camera) saves a "Receipt …" job file — the card's count goes 0 → 1
     C  Payments shows "1 receipt needs an amount"; Add amount 184.20 writes an expense
        row pointing at that file, and the block goes away
     D  Files tags it Needs amount before, Priced after (no dollars in Files)
     E  an expense row with no receipt offers Attach receipt
     F  the Files row's name is readable on the dark ground (the shared .tskrow ink was #2b2b2b, 1.4:1)
   Usage: node gate_1298.mjs [index.html] — control: the 1297 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync, writeFileSync, mkdtempSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url'; import { tmpdir } from 'os';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const IMG = join(mkdtempSync(join(tmpdir(), 'g1298-')), 'r.png');
writeFileSync(IMG, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC', 'base64'));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
p.on('dialog', d => d.type() === 'prompt' ? d.accept('184.20') : d.accept());
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
await p.waitForTimeout(800);
const card = async () => p.evaluate(() => { const e = document.querySelector('#pkSecRcpt'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; }).catch(() => '');
try { await p.evaluate(() => window.CardinalPunchCard.open('i5')); await p.waitForTimeout(1000); } catch (e) {}
const c0 = await card();
ok(/Receipts/i.test(c0) && /add receipt/i.test(c0) && /\b0\b/.test(c0) && !/\$/.test(c0), 'A  Receipts on the card, Add receipt, no dollar figure', c0);
let c1 = '';
try { const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 5000 }), p.evaluate(() => document.querySelector('#cr-pk [data-act="rcpt"]').click())]);
  await fc.setFiles(IMG); await p.waitForTimeout(2000); c1 = await card(); } catch (e) { c1 = 'ERR ' + e.message.slice(0, 80); }
const files = await p.evaluate(() => (window.cacheRows || []).filter(r => /^File:\s*Receipt/i.test(r.title || '')).map(r => ({ id: r.id, t: r.title, pid: r.project_id }))).catch(() => []);
ok(/\b1\b/.test(c1) && files.length === 1 && files[0].pid === 'p1', 'B  Add receipt saves a Receipt job file; the count goes to 1', JSON.stringify({ c1, files }));
try { await p.evaluate(() => window.CardinalPunchCard.close && window.CardinalPunchCard.close()); } catch (e) {}
const docs = async () => p.evaluate(() => { try { window.currentProject = (window.cacheProjects || []).filter(x => x.id === 'p1')[0]; openDocsPage(); } catch (e) { return 'ERR ' + e.message; } const t = [...document.querySelectorAll('#jdMount .jdrc')].map(x => x.textContent); return t.join(','); }).catch(e => 'ERR ' + e.message);
const d0 = await docs();
let pay0 = '', pay1 = '', log = null, attach = 0;
try {
  pay0 = await p.evaluate(() => { openPaymentsPage(); const e = document.querySelector('.payrcpt'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
  await p.evaluate(() => { const b = document.querySelector('.payrcpt [data-rcptamt]'); if (b) b.click(); }); await p.waitForTimeout(1200);
  pay1 = await p.evaluate(() => { const e = document.querySelector('.payrcpt'); return e ? e.innerText : ''; });
  log = await p.evaluate(() => { const pr = (window.cacheProjects || []).filter(x => x.id === 'p1')[0]; const ck = typeof parseCkAll === 'function' ? parseCkAll(pr) : null; return ((ck && ck.payments) || []).map(x => ({ dir: x.dir, amt: x.amt, r: x.receipt || null })); });
  attach = await p.evaluate(() => document.querySelectorAll('#payLog [data-rcptattach]').length);
} catch (e) { pay0 = 'ERR ' + e.message.slice(0, 80); }
const rid = files[0] && files[0].id;
ok(/1 receipt needs an amount/.test(pay0) && pay1 === '' && log && log.some(x => x.dir === 'exp' && x.amt === 184.2 && x.r === rid), 'C  Payments prices the receipt into an expense row pointing at it', JSON.stringify({ pay0: pay0.slice(0, 80), pay1, log }));
const d1 = await docs();
ok(d0 === 'Needs amount' && d1 === 'Priced', 'D  Files: Needs amount → Priced, no dollars', JSON.stringify({ before: d0, after: d1 }));
const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
const ink = await p.evaluate(() => { try { hideAllViews(); openDocsPage(); } catch (e) { return null; } const s = document.querySelector('#jdMount [data-jdopen]'); if (!s) return null;
  let g = null, e = s; while (e) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\(0, 0, 0, 0\)/.test(c)) { g = c; break; } e = e.parentElement; } return { c: getComputedStyle(s).color, g }; }).catch(() => null);
const ir = ink && ink.g ? ratio(ink.c, ink.g) : 0;
ok(ir >= 4.5, 'F  the Files name is readable (dark)', ir + ':1 ' + JSON.stringify(ink));
/* E: a plain expense with no receipt */
let e1 = 0;
try { await p.evaluate(async () => { const pr = (window.cacheProjects || []).filter(x => x.id === 'p1')[0]; const lg = (parseCkAll(pr).payments || []).slice(); lg.push({ dir: 'exp', amt: 65, note: 'dump fee', at: new Date().toISOString() }); await patchProjectCk(pr, { payments: lg }); openPaymentsPage(); });
  await p.waitForTimeout(600); e1 = await p.evaluate(() => document.querySelectorAll('#payLog [data-rcptattach]').length); } catch (e) {}
ok(e1 === 1, 'E  an expense with no receipt offers Attach receipt (and the priced one does not)', JSON.stringify({ attachButtons: e1, beforeExtra: attach }));
await browser.close(); console.log(`GATE 1298 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
