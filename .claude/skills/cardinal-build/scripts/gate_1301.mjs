#!/usr/bin/env node
/* gate_1301 — Community's stage names come from one map.
     A  window.CC_STAGE_LABEL exists in a real render with all nine stages
     B  the Client Directory's community map IS that object (not a copy)
     C  every remaining fallback copy (COM_LABEL, the two `var LABEL`s) reads the shared
        map first AND, as text, still equals it -- so a fallback can never drift
     D  the Community screens still say the same words (a community job's stage reads
        "Awarded", never raw "Approved")
   Usage: node gate_1301.mjs [index.html]   control: the 1300 tree (A, B, C RED) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const APP = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 180000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const STAGES = ['Lead', 'Prospect', 'OnHold', 'Approved', 'Scheduled', 'Completed', 'Invoiced', 'Closed', 'Lost'];
const parse = seg => Object.fromEntries([...seg.matchAll(/'(\w+)'\s*:\s*'([^']+)'/g)].map(m => [m[1], m[2]]));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
const live = await p.evaluate(() => ({ cc: window.CC_STAGE_LABEL || null })).catch(() => ({ cc: null }));
await browser.close();
const shared = live.cc;
ok(!!shared && STAGES.every(s => typeof shared[s] === 'string' && shared[s]), 'A  window.CC_STAGE_LABEL carries all nine stages', JSON.stringify(shared));

ok(/community:\s*CC_STAGE_LABEL\b/.test(APP), 'B  the Client Directory’s community map is the shared object, not a copy');

const fallbacks = [];
for (const m of APP.matchAll(/var (COM_LABEL|LABEL) = (window\.CC_STAGE_LABEL \|\| )?\{(?:[ \t]*\/\*[^*]*\*\/)?\s*'Lead':\s*'Estimate Requested'/g)) {
  const start = m.index, end = APP.indexOf('};', start);
  fallbacks.push({ name: m[1], readsShared: !!m[2], map: parse(APP.slice(start, end)) });
}
ok(fallbacks.length === 3, 'C  three Community fallback copies found (COM_LABEL + two LABEL)', String(fallbacks.length));
ok(fallbacks.length > 0 && fallbacks.every(f => f.readsShared), 'C  ...and every one reads the shared map first', JSON.stringify(fallbacks.map(f => f.name + ':' + f.readsShared)));
ok(!!shared && fallbacks.length === 3 && fallbacks.every(f => JSON.stringify(f.map) === JSON.stringify(Object.fromEntries(STAGES.map(s => [s, shared[s]])))),
   'C  ...and no fallback has drifted from it', JSON.stringify(fallbacks.map(f => f.map)));
ok(!!shared && shared.Approved === 'Awarded' && shared.Lead === 'Estimate Requested' && shared.Lost === 'Not Awarded',
   'D  the words are unchanged (Awarded, Estimate Requested, Not Awarded)');
console.log(`GATE 1301 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
