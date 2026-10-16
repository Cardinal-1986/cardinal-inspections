// gate_1351 — a retail job shows its money once (Theo: "do all", after a screenshot with Balance due three times).
// Retail: no money strip, no Payment Information row, the invoice card is status + buttons, the Payments card
// carries the balance and a % paid bar, the two cards travel as one stack (left column on a wide screen),
// Money In & Commissions is still reachable, and what only the old payment sheet held shows as OLD SHEET.
// Insurance keeps its strip (fenced). Supersedes gate_796 / gate_797 / gate_1209 for retail.
// node gate_1351.mjs [index.html]   (1350 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const { launchChromium } = require(here + 'chromium_launch.cjs');   /* finds Chromium here and on the CI runner */
const b = await launchChromium(chromium);

async function run(width) {
  const ctx = await b.newContext({ viewport: { width, height: 1000 }, isMobile: width < 600, hasTouch: width < 600 });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const r = await p.evaluate(async () => {
    const pause = ms => new Promise(r => setTimeout(r, ms));
    const S = window.__SEED__, out = {};
    const pr = S.projects.find(x => x.id === 'p1');
    pr.stage = 'Scheduled';
    const ck = JSON.parse(pr.checklist || '{}');
    /* the old sheet: one Labor row that IS a crew payment (must not show twice), one material receipt (must show) */
    ck.payments = [
      { dir: 'out', amt: '5600', date: '2026-10-12', account: 'Labor', method: 'crew check' },
      { dir: 'exp', amt: '87.03', date: '2026-10-13', account: 'Materials', method: 'store' }];
    pr.checklist = JSON.stringify(ck);
    const now = new Date().toISOString();
    S.inspection_reports.push({ id: 'ctr-s', title: 'Contract — Roofing — Test', project_id: 'p1', status: 'sent', signed_at: now,
      total: 14800, html: '<html><body><p>x</p></body></html>', created_at: now, updated_at: now, created_by: 'theo@cardinalrenovations.net' });
    S.collections = [{ id: 'k1', project_id: 'p1', collected_at: '2026-10-10', amount: 5000, type: 'deposit', source: 'homeowner', method: 'check', created_by: 'theo@cardinalrenovations.net', created_at: now }];
    S.crews = (S.crews || []).concat([{ id: 'cw7', name: 'Tear-off Crew' }]);
    S.crew_payments = [{ id: 'cp7', crew_id: 'cw7', project_id: 'p1', amount: 5600, method: 'check', paid_on: '2026-10-14', created_at: now }];
    S.job_costs = [];
    await window.reload(); await pause(500);
    window.openProject('p1'); await pause(2400);
    const pv = document.getElementById('projectView');
    const shown = sel => [...pv.querySelectorAll(sel)].filter(e => e.offsetParent || e.getClientRects().length).length;
    out.strip = shown('.dbmoney'); out.payRow = shown('#dbPayRow'); out.moneyRow = shown('#dbMoneyRow');
    out.moneyCard = !!document.getElementById('dbMoneyCard');
    const stack = pv.querySelector('#acxMount > .crji-stack');
    out.stack = stack ? [...stack.children].map(c => c.className) : null;
    const inv = pv.querySelector('.crji-card:not(.crjp-card)');
    out.invAmt = inv ? !!inv.querySelector('.crji-amt') : null;
    out.invTxt = inv ? inv.textContent.replace(/\s+/g, ' ') : null;
    const pc = pv.querySelector('.crjp-card');
    out.pBal = pc && (pc.querySelector('b.crjp-bal') || {}).textContent;
    out.pBar = pc && (pc.querySelector('.crjp-pbar i') || { style: {} }).style.width;
    out.balLabels = [...pv.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.offsetParent || e.getClientRects().length) && /^\s*Balance due\s*$/i.test(e.textContent)).length;
    const ct = pc && pc.querySelector('[data-crjp-tab="cost"]');
    if (ct) { ct.click(); await pause(200); out.costs = [...pc.querySelectorAll('.crjp-list .crjp-row')].map(x => x.textContent.replace(/\s+/g, ' ')); }
    const jm = pv.querySelector('#acxMount > .ja-menu');
    if (stack && jm) { const a = stack.getBoundingClientRect(), m = jm.getBoundingClientRect(); out.geo = { stackL: Math.round(a.left), menuL: Math.round(m.left), stackTop: Math.round(a.top), menuTop: Math.round(m.top), col: getComputedStyle(stack).gridColumnStart }; }
    /* insurance stays as it was */
    const p2 = S.projects.find(x => x.id === 'p2');
    if (p2) {
      const c2 = JSON.parse(p2.checklist || '{}'); c2.lead = Object.assign({}, c2.lead || {}, { claim_type: 'insurance' }); p2.checklist = JSON.stringify(c2);
      await window.reload(); await pause(400); window.openProject('p2'); await pause(1800);
      out.insStrip = document.querySelectorAll('.dbmoney').length;
    }
    return out;
  });
  await ctx.close();
  return r;
}

for (const w of [390, 1700]) {
  const r = await run(w);
  console.log('— ' + w + 'px');
  ok(r.strip === 0 && !r.moneyCard, 'retail: no Job Value strip', JSON.stringify({ strip: r.strip, card: r.moneyCard }));
  ok(r.payRow === 0, 'retail: no Payment Information row');
  ok(r.moneyRow === 1, 'Money In & Commissions is still reachable');
  ok(r.stack && r.stack.length === 2 && /crji-card v2/.test(r.stack[0]) && /crjp-card/.test(r.stack[1]), 'the invoice card and the Payments card travel as one stack', JSON.stringify(r.stack));
  ok(r.invAmt === false && !/--|balance due|paid of/i.test(r.invTxt || ''), 'the invoice card is status and buttons only (no balance, no "--")', r.invTxt);
  ok(/\$9,800\.00/.test(r.pBal || '') && r.pBar === '34%', 'the Payments card carries the balance and a 34% paid bar', JSON.stringify({ bal: r.pBal, bar: r.pBar }));
  ok(r.balLabels === 1, 'Balance due appears once on the page', r.balLabels);
  ok(r.costs && r.costs.some(x => /Materials/.test(x) && /OLD SHEET/.test(x) && /\$87\.03/.test(x)), 'a receipt only on the old payment sheet shows, marked OLD SHEET', JSON.stringify(r.costs));
  ok(r.costs && r.costs.filter(x => /\$5,600\.00/.test(x)).length === 1, 'an old-sheet labor row that is a crew payment is not counted twice', JSON.stringify(r.costs));
  if (w >= 1600) ok(r.geo && r.geo.col === '1' && Math.abs(r.geo.stackL - r.geo.menuL) < 4 && r.geo.stackTop < r.geo.menuTop, 'wide screen: the stack sits in the left column above the Job Menu', JSON.stringify(r.geo));
  if (r.insStrip !== undefined) ok(r.insStrip >= 1, 'insurance keeps its strip (fenced, unchanged)', r.insStrip);
}
await b.close();
console.log(fail ? 'GATE 1351 RED — ' + fail + ' failing' : 'GATE 1351 GREEN');
process.exit(fail ? 1 : 0);
