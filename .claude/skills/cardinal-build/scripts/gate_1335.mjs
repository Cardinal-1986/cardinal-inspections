// gate_1335 — an ACCEPTED estimate can be invoiced; a merely sent one still cannot (Theo's pick 1).
// node gate_1335.mjs [index.html]   (point at build 1334 for the negative control)
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2] || new URL('../../../../index.html', import.meta.url), 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const i = html.indexOf('function crBillable(fin){');
ok(i > 0, 'A  crBillable() exists');
let cb = null;
if (i > 0) { const j = html.indexOf('\n}', i); try { cb = new Function(html.slice(i, j + 2) + '\nreturn crBillable;')(); } catch (e) { ok(false, 'A2 crBillable parses', e.message); } }
if (cb) {
  ok(cb({ value: 1400, source: 'estimate', estAccepted: true }) === true, 'B  accepted estimate ($1,400) → billable');
  ok(cb({ value: 1400, source: 'estimate', estAccepted: false }) === false, 'C  sent-only estimate → NOT billable');
  ok(cb({ value: 9000, source: 'contract' }) === true, 'D  signed contract → billable');
  ok(cb({ value: 0, source: 'estimate', estAccepted: true }) === false, 'E  $0 → not billable');
}
ok(/estAccepted: source === 'estimate' && \(estTier\[pr\.id\] \|\| 0\) >= 2/.test(html), 'F  jobFinance reports estAccepted from the accepted tier (2)');
const ar = html.slice(html.indexOf('<script id="cr-ar-script">'));
const n = (ar.match(/fin\.source !== 'estimate' \|\| !!fin\.estAccepted/g) || []).length;
ok(n >= 2, 'G  the invoice card and the ready-to-bill list use the same rule', n + ' sites');
ok(html.includes('if(!crBillable(fin))'), 'H  createInvoiceFor refuses what crBillable refuses');
ok(html.includes('An invoice opens once a contract is signed or the estimate is accepted.'), 'I  the card hint names both doors');
console.log(fail ? 'RED — gate_1335: ' + fail + ' fail' : 'GREEN — gate_1335: all pass');
process.exit(fail ? 1 : 0);
