// gate_1357 — line items on an invoice, editable; EXTRA lines add to the job (Theo picked option 1).
// A: Create invoice writes the estimate's lines (behind the signed contract) into the new invoice — inv_lines,
//    extra_total 0, an ITEMS table in the page — and the job value does not move.
// B: Line items on the invoice card opens the sheet with those lines; adding an EXTRA line and saving writes
//    extra_total, the job total and an ADDED row, and jobFinance() raises the value and the balance.
// C: editable: change the extra's qty → new total; remove it → back to the contract.
// D: a line with a price and no description cannot be saved.
// E: the server rules (pay.js, share.js owedOn; remind.js) add an invoice's extra_total.
// node gate_1357.mjs [index.html]   (1356 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const root = here + '../../../../';
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || root + 'index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);

const r = await p.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const S = window.__SEED__, out = {};
  const pr = S.projects.find(x => x.id === 'p1'); pr.stage = 'Completed';
  const now = new Date().toISOString();
  S.inspection_reports.push({ id: 'ctr-l', title: 'Contract — Roofing — Test', project_id: 'p1', status: 'sent', signed_at: now,
    total: 10000, html: '<html><body><p>x</p></body></html>', created_at: now, updated_at: now, created_by: 'theo@cardinalrenovations.net' });
  S.estimates = (S.estimates || []).filter(e => e.project_id !== 'p1').concat([{ id: 'est-l', project_id: 'p1', status: 'accepted', archived: false,
    total: 10000, contract_doc_id: 'ctr-l', itemized: true,
    line_items: [{ name: 'Tear off', qty: 20, unit_price: 100 }, { name: 'Shingles', qty: 20, unit_price: 400 }] }]);
  S.collections = [{ id: 'k1', project_id: 'p1', collected_at: '2026-10-10', amount: 2000, type: 'deposit', source: 'homeowner', method: 'check', created_by: 'theo@cardinalrenovations.net', created_at: now }];
  await window.reload(); await pause(500);
  window.openProject('p1'); await pause(2200);
  const writes = () => (window.__WRITES__ || []).filter(w => w.table === 'inspection_reports' && w.op === 'update' && w.payload && 'inv_lines' in w.payload).map(w => w.payload);
  const fin = () => window.jobFinance(window.cacheProjects.find(x => x.id === 'p1'));
  out.v0 = fin().value;
  /* A */
  const gen = document.querySelector('#projectView [data-inv-gen]');
  out.gen = !!gen;
  if (!gen) return out;
  gen.click(); await pause(3500);
  const w0 = writes()[0];
  out.seed = w0 ? { n: w0.inv_lines.length, ex: w0.extra_total, d: w0.inv_lines.map(l => l.d + ' ' + l.q + '×' + l.p), items: /id="invLines"/.test(w0.html) && /Tear off/.test(w0.html) && /<!--invlines-->/.test(w0.html), total: w0.total } : null;
  out.v1 = fin().value;
  /* B */
  window.openProject('p1'); await pause(2200);
  const lb = document.querySelector('#projectView [data-inv-lines]');
  out.btn = !!lb;
  if (!lb) return out;
  lb.click(); await pause(1500);
  const sheet = document.getElementById('cr-invl-sheet');
  out.open = !!(sheet && sheet.classList.contains('open'));
  out.rows = sheet ? sheet.querySelectorAll('.il-row').length : 0;
  const set = (sel, v) => { const el = sheet.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  sheet.querySelector('[data-il-add]').click(); await pause(150);
  const n = sheet.querySelectorAll('.il-row').length - 1;
  set('[data-il-d="' + n + '"]', 'Extra sheets of decking'); set('[data-il-q="' + n + '"]', '3'); set('[data-il-p="' + n + '"]', '75');
  sheet.querySelector('[data-il-x="' + n + '"]').click(); await pause(150);
  out.sumTxt = sheet.querySelector('#ilSum').textContent.replace(/\s+/g, ' ');
  document.getElementById('ilSave').click(); await pause(2500);
  const w1 = writes().slice(-1)[0];
  out.save1 = w1 ? { ex: w1.extra_total, total: w1.total, n: w1.inv_lines.length, added: /ADDED/.test(w1.html) && /Extra sheets of decking/.test(w1.html), once: (w1.html.match(/<!--invlines-->/g) || []).length } : null;
  const f2 = fin(); out.v2 = f2.value; out.bal2 = f2.balance;
  out.closed = !sheet.classList.contains('open');
  /* C */
  window.openProject('p1'); await pause(2000);
  document.querySelector('#projectView [data-inv-lines]').click(); await pause(1500);
  out.reRows = sheet.querySelectorAll('.il-row').length;
  const xi = [...sheet.querySelectorAll('[data-il-x]')].findIndex(x => x.getAttribute('aria-pressed') === 'true');
  out.reExtra = xi;
  set('[data-il-q="' + xi + '"]', '4');
  document.getElementById('ilSave').click(); await pause(2500);
  out.save2 = (writes().slice(-1)[0] || {}).extra_total; out.v3 = fin().value;
  window.openProject('p1'); await pause(2000);
  document.querySelector('#projectView [data-inv-lines]').click(); await pause(1500);
  const xi2 = [...sheet.querySelectorAll('[data-il-x]')].findIndex(x => x.getAttribute('aria-pressed') === 'true');
  sheet.querySelector('[data-il-del="' + xi2 + '"]').click(); await pause(150);
  document.getElementById('ilSave').click(); await pause(2500);
  out.save3 = (writes().slice(-1)[0] || {}); out.v4 = fin().value;
  /* D */
  window.openProject('p1'); await pause(2000);
  document.querySelector('#projectView [data-inv-lines]').click(); await pause(1500);
  sheet.querySelector('[data-il-add]').click(); await pause(150);
  const m = sheet.querySelectorAll('.il-row').length - 1;
  set('[data-il-p="' + m + '"]', '50');
  out.blocked = document.getElementById('ilSave').disabled;
  out.why = document.getElementById('ilWhy').textContent;
  return out;
});
ok(r.gen && r.v0 === 10000, 'the job is $10,000 and can be invoiced', JSON.stringify({ gen: r.gen, v0: r.v0 }));
ok(r.seed && r.seed.n === 2 && r.seed.ex === 0 && r.seed.items && r.seed.total === 10000, 'A: a new invoice starts with the estimate\'s two lines, an ITEMS table, no extras', JSON.stringify(r.seed));
ok(r.v1 === 10000, 'A: plain lines never move the money', r.v1);
ok(r.btn && r.open && r.rows === 2, 'B: Line items opens the sheet with the saved lines', JSON.stringify({ btn: r.btn, open: r.open, rows: r.rows }));
ok(/\$10,225\.00/.test(r.sumTxt || ''), 'B: the sheet shows the job total after saving', r.sumTxt);
ok(r.save1 && r.save1.ex === 225 && r.save1.total === 10225 && r.save1.n === 3 && r.save1.added && r.save1.once === 1, 'B: saving writes extra_total $225, the job total and an ADDED row (one ITEMS block)', JSON.stringify(r.save1));
ok(r.v2 === 10225 && r.bal2 === 8225 && r.closed, 'B: the extra raises the job value and the balance', JSON.stringify({ v: r.v2, bal: r.bal2 }));
ok(r.reRows === 3 && r.reExtra === 2 && r.save2 === 300 && r.v3 === 10300, 'C: editable — qty 3 → 4 makes the extra $300', JSON.stringify({ rows: r.reRows, x: r.reExtra, ex: r.save2, v: r.v3 }));
ok(r.save3 && r.save3.extra_total === 0 && r.save3.inv_lines && r.save3.inv_lines.length === 2 && r.v4 === 10000, 'C: removing the extra puts the job back to $10,000', JSON.stringify({ ex: r.save3 && r.save3.extra_total, v: r.v4 }));
ok(r.blocked === true && /description/i.test(r.why || ''), 'D: a priced line with no description cannot be saved', r.why);
await b.close();

/* E — the server keeps the same rule */
for (const f of ['api/pay.js', 'api/share.js']) {
  const t = readFileSync(root + f, 'utf8');
  ok(/select=title,total,signed_at,extra_total/.test(t) && /\/\^invoice\/i\.test\(String\(r\.title \|\| ''\)\.trim\(\)\) && Number\(r\.extra_total\) > 0\) coTotal \+= Number\(r\.extra_total\)/.test(t), 'E: ' + f + ' owedOn adds an invoice\'s extra_total');
}
{
  const t = readFileSync(root + 'api/remind.js', 'utf8');
  ok(/select=project_id,title,total,signed_at,extra_total/.test(t) && /\/\^invoice\/i\.test\(String\(d\.title \|\| ''\)\.trim\(\)\) && Number\(d\.extra_total\) > 0\) coTotal \+= Number\(d\.extra_total\)/.test(t), 'E: api/remind.js adds an invoice\'s extra_total');
}
console.log(fail ? 'GATE 1357 RED — ' + fail + ' failing' : 'GATE 1357 GREEN');
process.exit(fail ? 1 : 0);
