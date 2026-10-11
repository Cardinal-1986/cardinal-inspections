#!/usr/bin/env node
/* gate_1300 — a route-page truck tick with no signal is kept, queued, and SAID.
     A  offline (navigator.onLine false, fetch "Load failed"), ticking a route truck
        line keeps the tick on the row
     B  ...the outbox holds the punch_items patch, so it syncs later
     C  ...no "Could not save" error is shown
     D  ...and the route page says it is saved on the phone (the card's 1049 line)
   Seed: gate_1297_seed.js.  Usage: node gate_1300.mjs [index.html] — control: the 1299 tree
   (A–C already pass there, by 1049's outbox; D is the build and must be RED). */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'gate_1297_seed.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 180000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
let r = {};
try {
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); });
  await p.evaluate(() => window.CardinalRoute.open('curtis@cardinalrenovations.net')); await p.waitForTimeout(1500);
  await p.evaluate(() => {
    window.__tells = [];
    const ct = window.crTell; window.crTell = function (m, k) { window.__tells.push({ m: String(m), k: k || '' }); return ct && ct.apply(this, arguments); };
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    const real = window.supa.from.bind(window.supa);
    window.supa.from = t => { if (t !== 'punch_items') return real(t); const q = { update() { return q; }, eq() { return Promise.reject(new TypeError('Load failed')); } }; return q; };
  });
  await p.evaluate(() => { const b = document.querySelector('#rtTruck .rttk:not(.d)'); if (b) b.click(); }); await p.waitForTimeout(1200);
  r = await p.evaluate(async () => {
    const row = window.CardinalPunch.rows().filter(x => x.id === 'tk1')[0];
    const q = await window.CardinalOutbox.patchesFor('punch_items');
    return { tick: row ? row.truck.map(x => x.d ? 1 : 0).join('') : null, queued: (q || []).some(e => e.match && e.match.val === 'tk1' && e.patch && Array.isArray(e.patch.truck)), tells: window.__tells };
  });
} catch (e) { r = { err: String(e.message).slice(0, 90) }; }
ok(r.tick === '11', 'A  offline, the tick stays on the row', JSON.stringify(r.tick || r.err));
ok(r.queued === true, 'B  the outbox holds the patch to sync later');
ok(Array.isArray(r.tells) && !r.tells.some(t => /could not save/i.test(t.m)), 'C  no "Could not save" error', JSON.stringify(r.tells));
ok(Array.isArray(r.tells) && r.tells.some(t => /saved on this phone/i.test(t.m)), 'D  the route page says it is saved on the phone', JSON.stringify(r.tells));
await browser.close(); console.log(`GATE 1300 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
