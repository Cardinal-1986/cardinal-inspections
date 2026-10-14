// gate_1346 — a deposit can be recorded before the job is Invoiced, from the job card AND from Invoices & Payments.
// node gate_1346.mjs [index.html]   (1345 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const pr = window.__SEED__.projects.find(x => x.id === 'p1');
  window.__SEED__.inspection_reports.push({ id: 'ctr-d', title: 'Contract — Roofing — Test', project_id: 'p1', status: 'sent', signed_at: new Date().toISOString(),
    total: 20000, html: '<html><body><p>x</p></body></html>', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'theo@cardinalrenovations.net' });
  const mainBtn = () => { const c = document.querySelector('#projectView .crji-card'); const m = c && c.querySelector('.crji-btn.primary'); return m ? m.textContent.trim() : null; };
  for (const stg of ['Scheduled', 'Completed']) {
    pr.stage = stg; await window.reload(); await pause(400); window.openProject('p1'); await pause(1300);
    out[stg] = { main: mainBtn(), line: (document.querySelector('#projectView .crji-card .crji-sub') || {}).textContent };
  }
  pr.stage = 'Scheduled'; await window.reload(); await pause(400);
  window.CardinalAR.open(); await pause(1200);
  const grp = document.querySelector('#cr-ar-view .crar-grp.dep');
  out.depGroup = grp ? grp.textContent.replace(/\s+/g, ' ').slice(0, 140) : null;
  out.depBtn = grp ? (grp.querySelector('.crar-go') || {}).textContent : null;
  out.kpi = (document.getElementById('crarKpiOut') || {}).textContent;
  const go = grp && grp.querySelector('[data-arpay]');
  if (go) { go.click(); await pause(700); const m = document.querySelector('#crpay-save'); out.payOpen = !!(m && m.offsetParent); }
  return out;
});
ok(/Record payment/.test(r.Scheduled && r.Scheduled.main || ''), 'Scheduled job: Record payment is the red button on the job card', JSON.stringify(r.Scheduled));
ok(/deposit/i.test(r.Scheduled && r.Scheduled.line || ''), 'the card says to record the deposit there', r.Scheduled && r.Scheduled.line);
ok(/Create invoice/.test(r.Completed && r.Completed.main || ''), 'Completed job: Create invoice stays the red button', JSON.stringify(r.Completed));
ok(r.depGroup && /Deposits & progress payments/.test(r.depGroup), 'Invoices & Payments lists signed Scheduled jobs under Deposits & progress payments', r.depGroup);
ok(/Record payment/.test(r.depBtn || ''), 'its red button is Record payment', r.depBtn);
ok(r.kpi !== '$20,000.00' && !/20,000/.test(r.kpi || ''), 'a deposit-stage job is not counted as owed', r.kpi);
ok(r.payOpen, 'Record payment opens the payment form');
await b.close();
console.log(fail ? 'GATE 1346 RED — ' + fail + ' failing' : 'GATE 1346 GREEN');
process.exit(fail ? 1 : 0);
