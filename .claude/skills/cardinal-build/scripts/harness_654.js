/* Build 654 — money tells one story (CR-AUD-003/004/013), verified against
   the shipped artifact.

   The value functions are EXECUTED, not re-implemented: jobFinance,
   projectValue, indexMoney, isEstimateTitle and SENT_EST are brace-matched
   out of the main block and eval'd in a jsdom window over locked fixture
   caches. AR, the tile dedupe, the invoice guard and the tab note are
   structural (their risk is wiring-shape).

   Usage: node harness_654.js [index.html]
   Point it at the previous build as the negative control — it must go red. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function fnText(name) {
  const m = SRC.match(new RegExp('function ' + name + '\\s*\\([^)]*\\)\\s*\\{'));
  if (!m) return null;
  let depth = 0, started = false, k = m.index;
  for (; k < SRC.length; k++) {
    if (SRC[k] === '{') { depth++; started = true; }
    else if (SRC[k] === '}') { depth--; if (started && depth === 0) break; }
  }
  return SRC.slice(m.index, k + 1);
}

console.log('\n── setup: extract the shipped money core ──');
const pieces = ['jobFinance', 'projectValue', 'indexMoney', 'isEstimateTitle'].map(fnText);
ok('jobFinance/projectValue/indexMoney/isEstimateTitle all extracted', pieces.every(Boolean));
const sentMatch = SRC.match(/var SENT_EST = \{[^}]*\};/);
ok('SENT_EST extracted', !!sentMatch);
const estRowsDecl = SRC.includes('var estRows = {};');
ok('estRows store declared beside estBest', estRowsDecl);

function moneyWin(fix) {
  // fix: { cacheRows, estimates, contracts, checklist-per-project via projects }
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const w = dom.window;
  const boot =
    'var estBest = {}; var estRows = {}; var ctrSigned = {};\n' +
    'var cacheRows = ' + JSON.stringify(fix.cacheRows || []) + ';\n' +
    'function parseCkAll(pr){ try{ return JSON.parse(pr.checklist || "{}") || {}; }catch(e){ return {}; } }\n' +
    sentMatch[0] + '\n' +
    pieces.join('\n') + '\n' +
    'indexMoney(' + JSON.stringify(fix.estimates || []) + ', ' + JSON.stringify(fix.contracts || []) + ');\n' +
    'window.__ = { jobFinance: jobFinance, projectValue: projectValue, estRows: estRows };';
  w.eval(boot);
  return w.__;
}

console.log('\n── the ONE precedence, executed ──');
{
  // 1. signed contract DOC only
  let M = moneyWin({ cacheRows: [{ id: 'd1', project_id: 'p1', title: 'Contract — Roof', signed_at: '2026-08-01', total: 30000 }] });
  let f = M.jobFinance({ id: 'p1', checklist: '{}' });
  ok('signed contract doc: value 30000, source contract', f.value === 30000 && f.source === 'contract', JSON.stringify(f));
  ok('projectValue agrees with the profile', M.projectValue({ id: 'p1', checklist: '{}' }) === 30000);

  // 2. signed contract in the TABLE only
  M = moneyWin({ contracts: [{ project_id: 'p1', total: 25000, homeowner_signed_at: '2026-08-01', voided_at: null }] });
  f = M.jobFinance({ id: 'p1', checklist: '{}' });
  ok('table-signed contract: value 25000, source contract', f.value === 25000 && f.source === 'contract', JSON.stringify(f));

  // 3. contract + manual: additive (the profile\'s long-standing shape, now shared)
  M = moneyWin({ cacheRows: [{ id: 'd1', project_id: 'p1', title: 'Contract — Roof', signed_at: 'x', total: 30000 }] });
  f = M.jobFinance({ id: 'p1', checklist: JSON.stringify({ manual_value: 5000 }) });
  ok('contract + manual is additive: 35000', f.value === 35000 && f.source === 'contract', JSON.stringify(f));
  ok('projectValue now sees the manual extra too (deliberate change, stated in PR)',
    M.projectValue({ id: 'p1', checklist: JSON.stringify({ manual_value: 5000 }) }) === 35000);

  // 4. THE live divergence case: sent estimate, no contract — profile used to say $0
  M = moneyWin({ estimates: [{ project_id: 'p1', total: 36654, status: 'sent', archived: false, doc_id: null }] });
  f = M.jobFinance({ id: 'p1', checklist: '{}' });
  ok('estimate-only job: profile now shows 36654 (was $0 — the audit case)', f.value === 36654, JSON.stringify(f));
  ok('…and says so: source === estimate', f.source === 'estimate');
  ok('list agrees: projectValue 36654', M.projectValue({ id: 'p1', checklist: '{}' }) === 36654);

  // 5. manual 5k vs estimate 20k → estimate wins the max (old projectValue behavior, kept)
  M = moneyWin({ estimates: [{ project_id: 'p1', total: 20000, status: 'sent', archived: false }] });
  f = M.jobFinance({ id: 'p1', checklist: JSON.stringify({ manual_value: 5000 }) });
  ok('max(manual, estimate): estimate 20000 wins, source estimate', f.value === 20000 && f.source === 'estimate', JSON.stringify(f));

  // 6. manual 5k vs estimate 3k → manual wins
  M = moneyWin({ estimates: [{ project_id: 'p1', total: 3000, status: 'sent', archived: false }] });
  f = M.jobFinance({ id: 'p1', checklist: JSON.stringify({ manual_value: 5000 }) });
  ok('max(manual, estimate): manual 5000 wins, source manual', f.value === 5000 && f.source === 'manual', JSON.stringify(f));

  // 7. nothing → 0 / none
  M = moneyWin({});
  f = M.jobFinance({ id: 'p1', checklist: '{}' });
  ok('no money anywhere: 0, source none', f.value === 0 && f.source === 'none', JSON.stringify(f));

  // 8. Theo's recorded order: a stale estimate never overrides a signed contract
  M = moneyWin({
    cacheRows: [{ id: 'd1', project_id: 'p1', title: 'Contract — Roof', signed_at: 'x', total: 30000 }],
    estimates: [{ project_id: 'p1', total: 36654, status: 'sent', archived: false }],
  });
  f = M.jobFinance({ id: 'p1', checklist: '{}' });
  ok('contract 30k beats stale estimate 36k — contract wins outright', f.value === 30000 && f.source === 'contract', JSON.stringify(f));

  // 9. paid clamps to value; balance never negative
  M = moneyWin({ cacheRows: [{ id: 'd1', project_id: 'p1', title: 'Contract', signed_at: 'x', total: 30000 }] });
  f = M.jobFinance({ id: 'p1', checklist: JSON.stringify({ payments: [{ dir: 'in', amt: 40000 }] }) });
  ok('overpayment clamps: paid 30000, balance 0', f.paid === 30000 && f.balance === 0, JSON.stringify(f));

  // 10. drafts and archived rows stay out of estRows AND the money
  M = moneyWin({ estimates: [
    { project_id: 'p1', total: 9000, status: 'draft', archived: false },
    { project_id: 'p1', total: 8000, status: 'sent', archived: true },
    { project_id: 'p1', total: 7000, status: 'sent', archived: false, doc_id: 'dX' },
  ] });
  ok('estRows keeps only sent+unarchived rows', (M.estRows['p1'] || []).length === 1, JSON.stringify(M.estRows));
  f = M.jobFinance({ id: 'p1', checklist: '{}' });
  ok('money ignores the draft and the archived row: 7000', f.value === 7000, f.value);
}

console.log('\n── AR aging (004), structural ──');
{
  const i = SRC.indexOf("if(normStage(p.stage) !== 'Invoiced') return;");
  const arBlock = SRC.slice(i, i + 900);
  ok('AR sums jobFinance(p).balance, not gross projectValue', arBlock.includes('jobFinance(p).balance'));
  ok('fully-paid jobs drop out of the aging chart', arBlock.includes('if(v <= 0) return;'));
  ok('the false caption is gone', !SRC.includes('Totals from Worksheet Invoices'));
  ok('the honest caption is in', SRC.includes('Unpaid balance by days since invoice'));
}

console.log('\n── estimates count (013), structural + executed dedupe ──');
{
  ok('tile counts both stores deduped on doc_id',
    SRC.includes('var estExtra = (estRows[pr.id] || []).filter(function(e){') &&
    SRC.includes('return !(e.doc_id && _dIds[e.doc_id]);'));
  ok('inspections bucket still derives from DOC estimates only (no negative counts)',
    SRC.includes('var insp = docs.length - estDocs.length - contracts;'));
  ok('moneyDb.estimates now fetches doc_id for the dedupe',
    SRC.includes("select('id,project_id,total,status,archived,doc_id')"));
  ok('the estimates tab names table-only rows instead of looking empty',
    SRC.includes('sent estimate' ) && SRC.includes('from the estimate editor'));
  // execute the dedupe expression against a fixture
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(
    'var estRows = { p1: [ { doc_id: "d1", total: 100 }, { doc_id: null, total: 200 }, { doc_id: "dGone", total: 300 } ] };\n' +
    'var pr = { id: "p1" };\n' +
    'var estDocs = [ { id: "d1" } ];\n' +
    'var _dIds = {}; estDocs.forEach(function(r){ _dIds[r.id] = 1; });\n' +
    'window.__n = estDocs.length + (estRows[pr.id] || []).filter(function(e){ return !(e.doc_id && _dIds[e.doc_id]); }).length;');
  ok('dedupe math: 1 doc + (null-doc_id row + orphaned-doc_id row) = 3', w.__n === 3, w.__n);
}

console.log('\n── the invoice path stays contract-conservative ──');
{
  ok('worksheet invoice button refuses estimate-sourced value',
    SRC.includes("var invBtn = (fin.value > 0 && fin.source !== 'estimate')"));
  const ci = fnText('createInvoiceFor') || '';
  ok('createInvoiceFor refuses estimate-sourced value',
    ci.includes("fin.source === 'estimate'"));
}

console.log('\n── provenance labels ──');
{
  ok('profile money strip labels an estimate-sourced value',
    SRC.includes('id="jobValueSrc"') && SRC.includes("'Job Value — from estimate, no contract yet' : 'Job Value'"));
  ok('LJ pane money strip carries the same provenance inline',
    SRC.includes("(fin.source === 'estimate' ? ' — from estimate' : '')"));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
