#!/usr/bin/env node
/* gate_1280 — the pay bar is a slim strip over the estimate, and check is a way to pay.
   Theo: "The payment screen is too large compared to estimate. Also a lot people pay by check."

     A  phone (390×844), estimate served through the SHIPPED share.js: the closed pay bar
        covers ≤ 12% of the screen, and its Pay button is still a ≥44px thumb target
     B  tapping Pay opens a sheet with three ways: bank, card (+3%), check
     C  the check option names the payee, the mailing address and the memo line, and is
        NOT a link (a check writes nothing; it is recorded in the app by hand)
     D  tapping outside the sheet closes it

   Usage: node gate_1280.mjs [api/share.js]   — control: the 1279 share.js (RED, no crash) */
import { createRequire } from 'module';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { tmpdir } from 'os';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const SHARE = process.argv[2] || join(HERE, '../../../../api/share.js');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 120000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const J = (v) => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });

const DOC = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0">'
  + '<div class="est-head" style="display:flex"><b>CARDINAL</b><span>ESTIMATE</span></div><table class="items"><thead><tr><th>Description</th><th>Price</th></tr></thead><tbody><tr><td>Roof</td><td>$15,300</td></tr></tbody></table>'
  + '<div style="height:1400px"></div><div class="line"></div><div class="lbl">Client Acceptance | Date</div><i data-clientsigned="1"></i></body></html>';
const dir = mkdtempSync(join(tmpdir(), 'g1280-')); writeFileSync(join(dir, 'share.mjs'), readFileSync(SHARE, 'utf8'));
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-not-real';
globalThis.fetch = async (u) => { u = String(u);
  if (u.includes('/inspection_reports?share_token')) return J([{ id: 'd1', project_id: 'p1', project: 'Dave McCoy', html: DOC, title: 'Estimate — Dave McCoy', total: 15300, signed_at: null }]);
  if (u.includes('/estimates')) return J([{ deposit_amount: 4590 }]);
  return J([]); };
let served = '';
try { const mod = await import(pathToFileURL(join(dir, 'share.mjs')).href);
  await new Promise(async res => { const r = { setHeader() {}, status() { return this; }, send(b) { served = String(b); res(); }, json(j) { served = JSON.stringify(j); res(); } };
    await mod.default({ method: 'GET', query: { t: '0123456789abcdef0123456789abcdef' }, headers: {} }, r); }); } catch (e) { served = '<p>share threw ' + e.message + '</p>'; }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const pg = await ctx.newPage();
await pg.route('**/*', r => r.request().url().startsWith('https://share.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: served }) : r.fulfill({ status: 200, body: '' }));
await pg.goto('https://share.test/x', { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(700);
const box = (sel) => pg.evaluate((sel) => { const e = document.querySelector(sel); const sc = window.visualViewport ? visualViewport.scale : 1;
  if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
  return { h: Math.round(r.height * sc), w: Math.round(r.width * sc), shown: cs.display !== 'none' && r.height > 0, tag: e.tagName, text: e.textContent.replace(/\s+/g, ' ').trim() }; }, sel);

const bar = await box('#crPayBar > div'), open = await box('#crPayOpen');
ok(!!bar && bar.h <= 844 * 0.12 && !!open && open.h >= 44, 'A  closed pay bar is a slim strip (≤12% of the screen) with a ≥44px Pay button', JSON.stringify({ bar: bar && bar.h, screen: 844, pay: open && open.h }));
try { await pg.click('#crPayOpen', { timeout: 3000 }); } catch (e) {}
await pg.waitForTimeout(150);
const bank = await box('#crPayBank'), card = await box('#crPayCard'), chk = await box('#crPayCheck');
ok(!!(bank && bank.shown && card && card.shown && chk && chk.shown), 'B  Pay opens a sheet with bank, card and check', JSON.stringify({ bank: bank && bank.shown, card: card && card.shown, check: chk && chk.shown }));
ok(!!card && /\$4,727\.70/.test(card.text) && /3% card processing fee/.test(card.text) && !!bank && /\$4,590\.00/.test(bank.text) && /No fee/.test(bank.text), '   · bank $4,590.00 no fee; card $4,727.70 with the 3% fee named', JSON.stringify({ bank: bank && bank.text, card: card && card.text }));
ok(!!chk && chk.tag !== 'A' && /payable to Cardinal Roofing & Renovations, LLC/.test(chk.text) && /5735 Webster Street, Dayton, Ohio 45414/.test(chk.text) && /Dave McCoy on the memo line/.test(chk.text) && /\$4,590\.00/.test(chk.text),
   'C  check: payee, mailing address, the client\'s name on the memo — and not a link', chk && chk.text);
try { await pg.mouse.click(195, 60); } catch (e) {}
await pg.waitForTimeout(150);
const after = await box('#crPaySheet');
ok(!!after && !after.shown, 'D  tapping outside the sheet closes it', JSON.stringify(after && { shown: after.shown }));
await browser.close();
console.log(`\nGATE 1280 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
