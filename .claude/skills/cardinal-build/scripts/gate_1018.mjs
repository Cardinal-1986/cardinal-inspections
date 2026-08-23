// gate_1018.mjs — proves __parseCkAllRaw lifts a nested lead.source to the flat
// lead_source the reports read (build 1018, audit finding 9).
//
// EXECUTES the shipped __parseCkAllRaw against the four real shapes:
//   nested-only            -> lead_source lifted from lead.source
//   flat present + nested   -> flat wins (divergent rows keep their flat value)
//   flat present, no nested -> unchanged
//   empty-string nested     -> stays blank (falsy, not lifted)
//
// Usage:
//   node gate_1018.mjs                 # working tree -> GREEN
//   node gate_1018.mjs <index.html>    # build-1017 copy -> RED (no lift)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const INDEX = process.argv[2] || path.join(REPO, 'index.html');
const src = fs.readFileSync(INDEX, 'utf8');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

const anchor = 'function __parseCkAllRaw(pr){';
const at = src.indexOf(anchor);
let body = null;
if (at === -1) fails.push('[extract] __parseCkAllRaw not found');
else {
  let i = src.indexOf('{', at), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { body = src.slice(at, j + 1); break; } }
  }
}

if (body) {
  try {
    const f = new Function(body + '\nreturn __parseCkAllRaw;')();
    const parse = (obj) => f({ checklist: JSON.stringify(obj) });

    const nested = parse({ lead: { source: 'Door knock' }, po: 'x' });
    ok(nested.lead_source === 'Door knock', `[1] nested-only lead.source must lift to lead_source, got ${JSON.stringify(nested.lead_source)}`);

    const flatWins = parse({ lead_source: 'Referral', lead: { source: 'Door knock' } });
    ok(flatWins.lead_source === 'Referral', `[2] flat must win over nested, got ${flatWins.lead_source}`);

    const flatOnly = parse({ lead_source: 'Web' });
    ok(flatOnly.lead_source === 'Web', '[3] flat-only must stay');

    const blank = parse({ lead: { source: '' } });
    ok(blank.lead_source == null, `[4] empty-string nested must NOT lift (stays blank), got ${JSON.stringify(blank.lead_source)}`);

    const none = parse({ po: 'x' });
    ok(none.lead_source == null, '[5] no source anywhere -> undefined, unchanged');
  } catch (e) { fails.push('__parseCkAllRaw execution failed: ' + e.message); }
}

if (fails.length) {
  console.error('RED — gate_1018 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1018: nested lead.source lifts to the flat lead_source the reports read; flat wins; blanks stay blank.');
