/* gate_1398 — messages that say what happened.
 *   A  notifyOutcomeText (extracted, run): a quiet-hours email reads "email at 7:00 am"; a daytime one "email"
 *   B  in-person estimate signing branches on crAcceptEstimateForDoc's result
 *   C  Team Directory inks clear 4.5:1 on the white card
 * Arg: [index.html] -> negative control (1397 must go RED). */
import fs from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const S = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const i = S.indexOf('function notifyOutcomeText(res, to){');
let depth = 0, j = S.indexOf('{', i);
for (let k = j; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (!depth) { j = k + 1; break; } } }
const fn = new Function(S.slice(i, j) + '; return notifyOutcomeText;')();
const night = fn({ mailed: 1, quiet: true, quiet_detail: { mail_scheduled: 1 } }, ['rep@cardinalrenovations.net']);
const day = fn({ mailed: 1 }, ['rep@cardinalrenovations.net']);
ok(/email at 7:00 am/.test(night), 'A  night: the email is named as scheduled', night);
ok(/— email$/.test(day), 'A  day: unchanged', day);
ok(/var _acc = await crAcceptEstimateForDoc\(current\.id\);/.test(S) && /crTell\(_acc \? 'Estimate signed and accepted/.test(S), 'B  the signing message follows the accept result');
const lum = h => { const c = h.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
for (const [sel, re] of [['.tmem', /#teamView \.tmem\{[^}]*color:#([0-9a-f]{6})/i], ['.tmph.tmno', /#teamView \.tmph\.tmno\{[^}]*color:#([0-9a-f]{6})/i]]) {
  const m = S.match(re); const r = m ? cr(m[1], 'ffffff') : 0;
  ok(r >= 4.5, 'C  Team ' + sel + ' ≥ 4.5:1 on white', (m ? '#' + m[1] : 'missing') + ' ' + r.toFixed(2));
}
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
