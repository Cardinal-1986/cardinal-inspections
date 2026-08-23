// gate_1019.mjs — proves the two money-display fixes of build 1019.
//
//  [A] payTotals: Received (recv) mirrors jobFinance's collections rule — when a
//      job has any collection, recv is the collections total, not worksheet+legacy
//      (so the Payment page can't contradict Balance Due). EXECUTES the shipped
//      payTotals with a stubbed jobFinance + global collPaid.
//  [B] indexMoney: the signed-contract TABLE leg SUMS rows (multi-trade), not MAX.
//      EXECUTES the shipped indexMoney and reads the resulting ctrSigned.
//
// Usage:
//   node gate_1019.mjs                 # working tree -> GREEN
//   node gate_1019.mjs <index.html>    # build-1018 copy -> RED

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const INDEX = process.argv[2] || path.join(REPO, 'index.html');
const src = fs.readFileSync(INDEX, 'utf8');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
function slice(anchor, label) {
  const at = src.indexOf(anchor);
  if (at === -1) { fails.push('[extract] ' + label + ' not found'); return null; }
  let i = src.indexOf('{', at), d = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) return src.slice(at, j + 1); }
  }
  fails.push('[extract] ' + label + ' brace'); return null;
}

// ---- [A] payTotals collections mirror -------------------------------------
{
  const body = slice('function payTotals(pr){', 'payTotals');
  if (body) {
    try {
      // stub jobFinance (payTotals calls it) + parseCkAll + global collPaid
      const make = new Function('jobFinance', 'parseCkAll', 'collPaid',
        body + '\nreturn payTotals;');
      const jf = () => ({ contracts: [] });
      const pca = (pr) => JSON.parse(pr.checklist || '{}');
      // job WITH a collection: recv must equal the collections total (500), not
      // the worksheet+legacy sum (payments dir:in = 999 here would be wrong).
      const withColl = make(jf, pca, { P: 500 })({ id: 'P', checklist: JSON.stringify({ payments: [{ dir: 'in', amt: 999 }] }) });
      ok(withColl.recv === 500, `[A] with a collection, recv must be the collections total (500), got ${withColl.recv}`);
      ok(withColl.net === 500, `[A] net must follow recv, got ${withColl.net}`);
      // job with NO collection: recv is the legacy/worksheet figure (unchanged)
      const noColl = make(jf, pca, {})({ id: 'Q', checklist: JSON.stringify({ payments: [{ dir: 'in', amt: 250 }] }) });
      ok(noColl.recv === 250, `[A] with no collection, recv stays the ledger figure (250), got ${noColl.recv}`);
    } catch (e) { fails.push('[A] payTotals exec: ' + e.message); }
  }
}

// ---- [B] indexMoney contract SUM ------------------------------------------
{
  const body = slice('function indexMoney(estimates, contracts){', 'indexMoney');
  if (body) {
    try {
      // indexMoney writes globals estBest/estRows/estTier/estDocIds/ctrSigned;
      // provide them as mutable outer refs and read ctrSigned back.
      const wrap = 'var estBest={},estRows={},estTier={},estDocIds={},ctrSigned={};\n' +
        body + '\nindexMoney(estimates, contracts);\nreturn ctrSigned;';
      const fn = new Function('estimates', 'contracts', wrap);
      const ctr = fn([], [
        { project_id: 'J', total: 10000, homeowner_signed_at: '2026-08-01', voided_at: null },
        { project_id: 'J', total: 8000, homeowner_signed_at: '2026-08-02', voided_at: null },
        { project_id: 'K', total: 5000, homeowner_signed_at: null },   // unsigned — ignored
        { project_id: 'K', total: 3000, homeowner_signed_at: '2026-08-03', voided_at: '2026-08-04' }, // voided — ignored
      ]);
      ok(ctr.J === 18000, `[B] two signed contract-table rows must SUM (10000+8000=18000), got ${ctr.J}`);
      ok((ctr.K || 0) === 0, `[B] unsigned + voided rows must not count, got ${ctr.K}`);
    } catch (e) { fails.push('[B] indexMoney exec: ' + e.message); }
  }
}

if (fails.length) {
  console.error('RED — gate_1019 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1019: payTotals mirrors collections; indexMoney sums signed contract-table rows.');
