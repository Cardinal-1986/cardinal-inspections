// gate_1362 — Sales Numbers in the Owner Console reads the app's OWN numbers.
// A: the hub has a Sales Numbers card showing sold this year.
// B: Sold $ per rep equals jobFinance(p).value summed over that rep's sold jobs (parity with the client page).
// C: a Prospect with a value is NOT sold; a job sold last year is out of "This year" and in "All time".
// D: a migrated client counts in Migrated, not Leads.
// E: a job moved to Unassigned still counts for the rep who had it; a typed name ("Jerry Vera") matches the roster.
// F: Collected is the collections table by date; an undated legacy payment is named in the footnote.
// G: the period chips switch the table.
// node gate_1362.mjs [index.html]   (1361 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
p.on('dialog', d => d.accept());
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const now = new Date(), y = now.getFullYear();
  const thisMonth = new Date(y, now.getMonth(), 1, 12).toISOString();
  const lastYear = new Date(y - 1, 5, 1, 12).toISOString();
  const mk = (id, rep, stage, created, ck) => ({ id, name: 'Gate ' + id, address: '', stage, sales_rep: rep, created_by: 'theo@cardinalrenovations.net',
    created_at: created, updated_at: created, checklist: JSON.stringify(ck) });
  const J = 'jacob@cardinalrenovations.net', T = 'theo@cardinalrenovations.net';
  const projs = [
    mk('g1', J, 'Approved', thisMonth, { manual_value: 10000, t_Approved: thisMonth, lead: { assigned: [J] } }),
    mk('g2', null, 'Invoiced', thisMonth, { manual_value: 5000, t_Invoiced: thisMonth,
      lead: { assigned: [], unassigned_from: { rep: 'nick@cardinalrenovations.net', was_on: T } } }),
    mk('g3', T, 'Prospect', thisMonth, { acculynx_import: true, lead: { source: 'AccuLynx import', assigned: [T] } }),
    mk('g4', T, 'Lead', thisMonth, { lead: { assigned: [T] } }),
    mk('g5', 'Jerry Vera', 'Prospect', thisMonth, { manual_value: 7000, lead: {} }),
    mk('g6', J, 'Closed', lastYear, { manual_value: 3000, t_Approved: lastYear, lead: { assigned: [J] } }),
    mk('g7', T, 'Completed', thisMonth, { manual_value: 2000, t_Completed: thisMonth, ws: { manual: { paid: 500 } }, lead: { assigned: [T] } })
  ];
  window.cacheProjects = projs;
  window.cacheRows = [];
  window.indexCollections([{ project_id: 'g1', amount: 4000, collected_at: thisMonth }, { project_id: 'g6', amount: 3000, collected_at: lastYear }]);
  out.fin = {}; projs.forEach(pr => { try { out.fin[pr.id] = window.jobFinance(pr).value; } catch (e) { out.fin[pr.id] = 'ERR ' + e.message; } });
  if (!window.CardinalOwner) return out;
  window.CardinalOwner.open(); await pause(1500);
  const card = document.querySelector('#cr-owner [data-area="sales"]');
  out.card = card ? card.textContent.replace(/\s+/g, ' ').trim() : null;
  if (!card) return out;
  card.click(); await pause(300);
  const read = () => { const o = {}; document.querySelectorAll('#cr-owner table.ow-sn tbody tr').forEach(tr => {
    const td = [...tr.children].map(x => x.textContent.trim()); o[td[0]] = { leads: +td[1], mig: +td[2], sold: +td[3], soldAmt: td[4], coll: td[5] }; }); return o; };
  out.year = read();
  out.note = (document.querySelector('#cr-owner .ow-note') || {}).textContent || '';
  const chip = per => { const c = document.querySelector('#cr-owner [data-act="sn-period"][data-per="' + per + '"]'); if (c) c.click(); };
  chip('all'); await pause(200); out.all = read();
  chip('month'); await pause(200); out.month = read();
  out.monthOn = (document.querySelector('#cr-owner [data-act="sn-period"].on') || {}).getAttribute ? document.querySelector('#cr-owner [data-act="sn-period"].on').getAttribute('data-per') : null;
  return out;
});
const Y = r.year || {}, A = r.all || {};
ok(r.card && /Sales Numbers/.test(r.card) && /\$17,000/.test(r.card) && /sold this year/.test(r.card), 'A: hub card shows sold this year ($10,000 + $5,000 + $2,000)', r.card);
ok(r.fin && r.fin.g1 === 10000 && Y.Jacob && Y.Jacob.soldAmt === '$10,000' && Y.Jacob.sold === 1, 'B: Jacob Sold $ = jobFinance value of his sold job', JSON.stringify({ fin: r.fin, jacob: Y.Jacob }));
ok(Y.Jerry && Y.Jerry.sold === 0 && Y.Jerry.leads === 1, 'C: a Prospect with a value is not sold (and "Jerry Vera" maps to Jerry)', JSON.stringify(Y.Jerry));
ok(A.Jacob && A.Jacob.sold === 2 && A.Jacob.soldAmt === '$13,000' && Y.Jacob && Y.Jacob.sold === 1, 'C: last year\'s sale is in All time, not This year', JSON.stringify({ all: A.Jacob, year: Y.Jacob }));
ok(Y.Theo && Y.Theo.mig === 1 && Y.Theo.leads === 2, 'D: the migrated client is in Migrated, not Leads (Theo: 2 new + 1 migrated)', JSON.stringify(Y.Theo));
ok(Y.Nick && Y.Nick.sold === 1 && Y.Nick.soldAmt === '$5,000' && !Y.Unassigned, 'E: an unassigned job still counts for the rep who had it', JSON.stringify({ nick: Y.Nick, un: Y.Unassigned }));
ok(Y.Jacob && Y.Jacob.coll === '$4,000' && A.Jacob && A.Jacob.coll === '$7,000', 'F: Collected is the collections table by date', JSON.stringify({ y: Y.Jacob && Y.Jacob.coll, a: A.Jacob && A.Jacob.coll }));
ok(/1 older payment has no date/.test(r.note || ''), 'F: the undated legacy payment is named in the footnote', String(r.note || '').slice(-120));
ok(r.monthOn === 'month' && r.month && r.month.Jacob && r.month.Jacob.sold === 1, 'G: the period chips switch the table', JSON.stringify({ on: r.monthOn, m: r.month && r.month.Jacob }));
await b.close();
console.log(fail ? 'GATE 1362 RED — ' + fail + ' failing' : 'GATE 1362 GREEN');
