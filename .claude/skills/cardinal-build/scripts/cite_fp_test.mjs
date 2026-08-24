import { readFileSync } from 'fs';
const src = readFileSync(process.argv[2], 'utf8');
const a = src.indexOf('const norm = t =>');
const b = src.indexOf('});', src.indexOf('(letter.replace(/<[^>]*>/g'));
const body = src.slice(a, b + 3);
const PACK_BY_ID = { ice_barrier:{citation:'RCO R905.1.2'} };
const run = (letter) => new Function('letter','items','PACK_BY_ID', body + '\n return cite_flag;')
  (letter, [{pack_id:'ice_barrier'}], PACK_BY_ID);

/* things a REAL supplement letter contains that are not citations */
const FP = [
  ['ISO date',            '<p>Inspected 2026.08.12 with the adjuster.</p>'],
  ['US date dots',        '<p>Loss dated 08.12.2026.</p>'],
  ['claim number',        '<p>Claim 0802889162 refers.</p>'],
  ['phone',               '<p>Call 937.555.0142 with questions.</p>'],
  ['money-ish measure',   '<p>3204.50 sq ft of field shingle across 31.4 squares.</p>'],
  ['version-ish',         '<p>Report v2.1.4 attached.</p>'],
  ['pitch',               '<p>The roof is 6/12 pitch, 184 LF of eave.</p>'],
  ['policy number',       '<p>Policy 1234-5678-90 is in force.</p>'],
];
let flagged = 0;
for (const [name, letter] of FP) {
  const got = run(letter);
  if (got.length) { flagged++; console.log(`FALSE POSITIVE  ${name}: ${JSON.stringify(got)}`); }
  else console.log(`clean           ${name}`);
}
console.log(flagged ? `\n${flagged} false positive(s) — the flag would cry wolf` : '\nno false positives');
