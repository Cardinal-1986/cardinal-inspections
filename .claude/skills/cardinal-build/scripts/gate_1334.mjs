// gate_1334 — the change-order photo input lets the phone offer its library (no capture attribute),
// and the install-photo slots (1331) stay camera-first. Run with a path to the previous build as a
// negative control: node gate_1334.mjs [index.html]
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2] || new URL('../../../../index.html', import.meta.url), 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); if (!c) fail++; };
const co = (html.match(/<input[^>]*id="coFile"[^>]*>/g) || []);
ok(co.length === 1, 'A  exactly one change-order file input', co.length + ' found');
ok(co.length === 1 && !/capture=/.test(co[0]), 'B  change-order input has no capture attribute (library + camera)', co[0]);
ok(co.length === 1 && /accept="image\/\*"/.test(co[0]), 'C  still images only');
const inF = (html.match(/<input[^>]*id="inFile"[^>]*>/g) || [])[0] || '';
ok(/capture="environment"/.test(inF), 'D  install-photo slots stay camera-first (1331)', inF);
console.log(fail ? 'RED — gate_1334: ' + fail + ' fail' : 'GREEN — gate_1334: all pass');
process.exit(fail ? 1 : 0);
