// gate_1011.mjs — proves jobFinance's doc-store leg no longer defeats 997's
// accepted tier (build 1011).
//
// The defect: after estBest (tiered — accepted/signed=2 beats sent=1), jobFinance
// took a flat MAX over every Estimate-titled inspection_reports doc, any status,
// archived rows' published copies included. A bigger stale doc overrode the
// accepted estimate; Job Value, Balance Due, the AR chart, pipeline dollars and
// the invoice all inherit from here.
//
// This gate extracts the SHIPPED indexMoney(), jobFinance(), isEstimateTitle(),
// SENT_EST and ACCEPTED_EST from the artifact and EXECUTES them (no
// re-implementation) against fixture data shaped like production:
//
//   [1] accepted $20k (table) + unlinked doc $35k          -> 20,000  (tier-2 skip)
//   [2] sent     $20k (table) + unlinked doc $35k          -> 35,000  (doc leg's legitimate job survives)
//   [3] no table rows        + unlinked doc $35k           -> 35,000  (legacy doc-only jobs keep working)
//   [4] sent $20k + doc $35k LINKED to an ARCHIVED row      -> 20,000  (published copies never compete)
//   [5] accepted $20k + sent $36k, table only               -> 20,000  (997 regression guard)
//   [6] after indexMoney, the GLOBAL estTier is populated   (guards the var-shadowing trap:
//       leaving `var estTier` inside indexMoney would keep the global empty and
//       silently disable the tier-2 skip)
//
// Usage:
//   node gate_1011.mjs                    # working tree  -> GREEN
//   node gate_1011.mjs <path/index.html>  # negative control (build 1010) -> RED on [1], [4], [6]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const TARGET = process.argv[2] || path.join(REPO, 'index.html');
const src = fs.readFileSync(TARGET, 'utf8');

function extractFn(name) {
  const anchor = 'function ' + name + '(';
  const at = src.indexOf(anchor);
  if (at === -1) throw new Error(anchor + ' not found in ' + TARGET);
  let i = src.indexOf('{', at), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(at, j + 1); }
  }
  throw new Error('could not brace-match ' + name);
}
function extractVar(name) {
  const m = src.match(new RegExp('var ' + name + ' = \\{[^\\n]*\\};'));
  if (!m) throw new Error('var ' + name + ' not found in ' + TARGET);
  return m[0];
}

let fnIndexMoney, fnJobFinance, fnIsEst, vSent, vAccepted;
try {
  fnIndexMoney = extractFn('indexMoney');
  fnJobFinance = extractFn('jobFinance');
  fnIsEst = extractFn('isEstimateTitle');
  vSent = extractVar('SENT_EST');
  vAccepted = extractVar('ACCEPTED_EST');
} catch (e) {
  console.error('FAILED extraction: ' + e.message);   // BUG_CLASSES 37: name the failure, never crash bare
  process.exit(1);
}
// Print what the extractor captured (sizes), per the counting doctrine.
console.log('extracted: indexMoney ' + fnIndexMoney.length + 'ch, jobFinance ' +
            fnJobFinance.length + 'ch, isEstimateTitle ' + fnIsEst.length + 'ch');

// Sandbox: globals the shipped code writes/reads, then the shipped text verbatim.
const sandboxSrc = `
  'use strict';
  var estBest = {}, estRows = {}, estTier = {}, estDocIds = {};
  var ctrSigned = {}, collPaid = {}, cacheRows = [];
  function parseCkAll(pr){ return (pr && pr.__ck) || {}; }
  ${vSent}
  ${vAccepted}
  ${fnIsEst}
  ${fnIndexMoney}
  ${fnJobFinance}
  return {
    indexMoney: indexMoney,
    jobFinance: jobFinance,
    setDocs: function(rows){ cacheRows = rows; },
    tierOf: function(pid){ return estTier[pid] || 0; }
  };
`;
let app;
try { app = new Function(sandboxSrc)(); }
catch (e) { console.error('FAILED to evaluate shipped functions: ' + e.message); process.exit(1); }

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const P = 'job-1';
const proj = { id: P, __ck: {} };
const run = (estimates, docs) => {
  app.indexMoney(estimates, []);          // no signed contracts in any scenario
  app.setDocs(docs);
  return app.jobFinance(proj);
};

// [1] accepted table estimate + bigger UNLINKED doc -> accepted wins
{
  const f = run(
    [{ project_id: P, status: 'accepted', total: 20000, archived: false }],
    [{ id: 'd9', project_id: P, title: 'Estimate — options B', total: 35000 }]
  );
  ok(f.value === 20000, `[1] accepted 20k + unlinked doc 35k: expected value 20000, got ${f.value}`);
}
// [2] sent table estimate + bigger unlinked doc -> doc still counts (tier 1)
{
  const f = run(
    [{ project_id: P, status: 'sent', total: 20000, archived: false }],
    [{ id: 'd9', project_id: P, title: 'Estimate — options B', total: 35000 }]
  );
  ok(f.value === 35000, `[2] sent 20k + unlinked doc 35k: expected value 35000, got ${f.value}`);
}
// [3] doc-only legacy job -> doc supplies the value
{
  const f = run([], [{ id: 'd9', project_id: P, title: 'Estimate — roof', total: 35000 }]);
  ok(f.value === 35000 && f.source === 'estimate',
     `[3] doc-only job: expected 35000/'estimate', got ${f.value}/'${f.source}'`);
}
// [4] doc linked to an ARCHIVED table row never competes
{
  const f = run(
    [{ project_id: P, status: 'sent', total: 20000, archived: false },
     { project_id: P, status: 'sent', total: 35000, archived: true, doc_id: 'd9' }],
    [{ id: 'd9', project_id: P, title: 'Estimate — superseded', total: 35000 }]
  );
  ok(f.value === 20000, `[4] archived row's published doc 35k: expected value 20000, got ${f.value}`);
}
// [5] 997 regression guard — accepted beats bigger sent, table only
{
  const f = run(
    [{ project_id: P, status: 'accepted', total: 20000, archived: false },
     { project_id: P, status: 'sent', total: 36000, archived: false }],
    []
  );
  ok(f.value === 20000, `[5] accepted 20k vs sent 36k (997 tiers): expected 20000, got ${f.value}`);
}
// [6] the GLOBAL estTier is written (var-shadowing guard)
{
  app.indexMoney([{ project_id: P, status: 'accepted', total: 20000, archived: false }], []);
  ok(app.tierOf(P) === 2, `[6] global estTier must be 2 after an accepted estimate, got ${app.tierOf(P)} (a local 'var estTier' inside indexMoney silently disables the tier skip)`);
}

if (fails.length) {
  console.error('RED — gate_1011 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1011: accepted tier beats any doc; published copies never compete; legacy doc-only jobs intact.');
