#!/usr/bin/env node
/* gate_1302 — "Tarp Only" is a Work Type, never a stage.
     A  the Retail project form and the lead form offer Tarp Only (real render)
     B  the job card dropdown, the Community job page and the Community New Estimate
        form offer it (their option lists, read from the file)
     C  STAGES is unchanged — nine stages, no Tarp — so normStage cannot learn it
   Usage: node gate_1302.mjs [index.html] — control: the 1301 tree (A, B RED) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 180000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const opts = id => { const s = document.getElementById(id); return s ? [...s.options].map(o => (o.value || o.textContent).trim()) : null; };
  return { pf: opts('pfWorkType'), ld: opts('ldWorkType'), stages: (typeof STAGES !== 'undefined') ? STAGES.slice() : null };
}).catch(e => ({ err: String(e) }));
await browser.close();
ok(Array.isArray(r.pf) && r.pf.includes('Tarp Only'), 'A  the Retail project form offers Tarp Only', JSON.stringify(r.pf));
ok(Array.isArray(r.ld) && r.ld.includes('Tarp Only'), 'A  the lead form offers Tarp Only', JSON.stringify(r.ld));
ok(/acxOpts\(\[[^\]]*'Tarp Only'[^\]]*\], ck\.work_type\)/.test(APP), 'B  the job card dropdown offers it');
ok(/var CC2_WT = \[[^\]]*'Tarp Only'/.test(APP), 'B  the Community job page offers it');
ok(/<option value="Tarp Only">Tarp Only<\/option>/.test(APP), 'B  the Community New Estimate form offers it');
ok(Array.isArray(r.stages) && r.stages.length === 9 && !r.stages.some(s => /tarp/i.test(s)), 'C  STAGES unchanged — Tarp Only is not a stage', JSON.stringify(r.stages));
console.log(`GATE 1302 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
