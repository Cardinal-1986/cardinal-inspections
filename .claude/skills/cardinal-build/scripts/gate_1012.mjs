// gate_1012.mjs — proves fillContractMoney reads the deposit from the same tier
// the price comes from (build 1012), not from the newest deposit-bearing
// estimate of any status.
//
// The defect (F6 + MONEY-3): rows[0] of loadForProject (created_at DESC,
// non-archived, drafts included) filtered only on "has deposit info". The editor
// stamps deposit_pct (default 30) on every save, so a fresh draft outranked the
// accepted 0% estimate that set the contract's price.
//
// Extracts the SHIPPED fillContractMoney, DEPOSIT_PCT_DEFAULT, SENT_EST and
// ACCEPTED_EST and EXECUTES them against a template fixture + mocked
// CardinalEstimates.loadForProject (rows given newest-first, as the real query
// orders):
//
//   [1] accepted 0%  + newer draft 30%          -> 0%   (the headline)
//   [2] draft-only job, typed 20%                -> 20%  (draft last-resort survives)
//   [3] no estimates                             -> 30%  (house default)
//   [4] sent 30%     + newer draft 10%           -> 30%  (tier beats recency)
//   [5] explicit est row passed (est→contract)   -> that row, regardless of list
//   [6] deposit_amount 5000 on price 20000       -> down $5,000.00, pct prints 25%
//
// Usage:
//   node gate_1012.mjs                    # working tree  -> GREEN
//   node gate_1012.mjs <path/index.html>  # negative control (build 1011) -> RED on [1], [4]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const TARGET = process.argv[2] || path.join(REPO, 'index.html');
const src = fs.readFileSync(TARGET, 'utf8');

function extractFn(name, kw) {
  const anchor = (kw || 'async function ') + name + '(';
  const at = src.indexOf(anchor);
  if (at === -1) throw new Error(anchor + ' not found');
  let i = src.indexOf('{', at), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(at, j + 1); }
  }
  throw new Error('could not brace-match ' + name);
}
function extractVar(name) {
  const m = src.match(new RegExp('var ' + name + ' = [^\\n]*;'));
  if (!m) throw new Error('var ' + name + ' not found');
  return m[0];
}

let fnFill, vDefault, vSent, vAccepted;
try {
  fnFill = extractFn('fillContractMoney');
  vDefault = extractVar('DEPOSIT_PCT_DEFAULT');
  vSent = extractVar('SENT_EST');
  vAccepted = extractVar('ACCEPTED_EST');
} catch (e) { console.error('FAILED extraction: ' + e.message); process.exit(1); }
console.log('extracted: fillContractMoney ' + fnFill.length + 'ch');

const sandboxSrc = `
  var window = { CardinalEstimates: { loadForProject: async function(){ return __rows; } } };
  var __rows = [];
  ${vDefault}
  ${vSent}
  ${vAccepted}
  ${fnFill}
  return {
    setRows: function(r){ __rows = r; },
    fill: fillContractMoney
  };
`;
let app;
try { app = new Function(sandboxSrc)(); }
catch (e) { console.error('FAILED to evaluate shipped function: ' + e.message); process.exit(1); }

const TPL = 'Deposit (50%) x Final balance (50%) ' +
  '<span class="ph" data-cprice="1">[0.00]</span> ' +
  '<span class="ph">[0.00]</span> ' +
  '<span class="ph">[0.00]</span>';
const PR = { id: 'job-1' };

async function depOf(rowsNewestFirst, price, est) {
  app.setRows(rowsNewestFirst);
  const out = await app.fill(TPL, PR, price, est);
  const pct = (out.match(/data-cpct="dep">([\d.]+)%/) || [])[1];
  const down = (out.match(/data-cmoney="down">\$([\d,.]+)/) || [])[1];
  return { pct: pct != null ? Number(pct) : null, down: down || null };
}

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// [1] accepted 0% + NEWER draft 30% (draft listed first = newest)
{
  const r = await depOf([
    { status: 'draft',    deposit_pct: 30, deposit_amount: 0 },
    { status: 'accepted', deposit_pct: 0,  deposit_amount: 0 },
  ], 10000);
  ok(r.pct === 0, `[1] accepted 0% vs newer draft 30%: expected dep 0%, got ${r.pct}%`);
}
// [2] draft-only job with a typed 20%
{
  const r = await depOf([{ status: 'draft', deposit_pct: 20, deposit_amount: 0 }], 10000);
  ok(r.pct === 20, `[2] draft-only 20%: expected 20%, got ${r.pct}%`);
}
// [3] no estimates -> house default 30
{
  const r = await depOf([], 10000);
  ok(r.pct === 30, `[3] no estimates: expected default 30%, got ${r.pct}%`);
}
// [4] sent 30% + NEWER draft 10% -> tier beats recency
{
  const r = await depOf([
    { status: 'draft', deposit_pct: 10, deposit_amount: 0 },
    { status: 'sent',  deposit_pct: 30, deposit_amount: 0 },
  ], 10000);
  ok(r.pct === 30, `[4] sent 30% vs newer draft 10%: expected 30%, got ${r.pct}%`);
}
// [5] explicit est row (estimate→contract path) governs, list ignored
{
  const r = await depOf([
    { status: 'accepted', deposit_pct: 0, deposit_amount: 0 },
  ], 10000, { status: 'draft', deposit_pct: 15, deposit_amount: 0 });
  ok(r.pct === 15, `[5] explicit est 15%: expected 15%, got ${r.pct}%`);
}
// [6] explicit dollar deposit outranks pct; printed % stays honest
{
  const r = await depOf([{ status: 'accepted', deposit_pct: 0, deposit_amount: 5000 }], 20000);
  ok(r.down === '5,000.00' && r.pct === 25,
     `[6] deposit_amount 5000/price 20000: expected $5,000.00 @ 25%, got $${r.down} @ ${r.pct}%`);
}

if (fails.length) {
  console.error('RED — gate_1012 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1012: deposit follows the price tier (accepted > sent > draft); explicit row and dollar deposit unchanged.');
