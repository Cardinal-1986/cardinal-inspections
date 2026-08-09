/* Build 638 — an empty claim must not be saveable.

   Theo reproduced how the junk got in: open New Claim, tap save, get a real row
   showing "Unknown Homeowner / Unknown / TBD / FILED", attached to nothing.
   Three of the four rows in insurance_claims arrived exactly that way.

   ⚠️ This EXECUTES the shipped guard condition against the REAL payload shapes
   from production — including the three junk rows — rather than asserting a
   regex matched. A guard can be present and still let the wrong thing through.

   Usage: node harness_claimguard.js [path-to-index.html] */
const fs = require('fs');
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const H = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

console.log('\n── the guard exists, and sits before BOTH writes ──');
const i = H.indexOf('!payload.homeowner_name');
ok('the guard is present', i !== -1);
if (i !== -1) {
  ok('it runs before the UPDATE', i < H.indexOf(".from('insurance_claims').update(payload)"));
  ok('it runs before the INSERT', i < H.indexOf(".from('insurance_claims').insert(payload)"));
  ok('it explains itself rather than failing silently',
    /otherwise this saves as an empty claim\./.test(H));
}
/* The seeding that ALREADY worked must not be disturbed — the 7 Aug claim is
   attached, which proves the profile path was never the bug. */
ok('project seeding is untouched',
  /if \(seedProjectId\) payload\.project_id = seedProjectId;/.test(H));
ok('the claims module still writes no storage — the scope upload is his call',
  !/cr-claims-script[\s\S]{0,60000}storage\.from\(/.test(H.slice(H.indexOf('<script id="cr-claims-script">'),
    H.indexOf('<script id="cr-claims-script">') + 60000)));

console.log('\n── EXECUTED: the shipped condition, against real payload shapes ──');
/* Lift the guard's own source rather than restating it — a restated condition
   tests my copy, not the app's. */
/* Paren-match from the `if (`, do not slice by offset: `i - 4` grabs the `if (`
   itself and `new Function` then chokes on it. Same family as the [^;] trap. */
const cond = (() => {
  const open = H.lastIndexOf('(', i);
  let d = 0;
  for (let k = open; k < H.length; k++) {
    if (H[k] === '(') d++;
    else if (H[k] === ')') { d--; if (!d) return H.slice(open + 1, k); }
  }
  return '';
})();
/* Wrapped: a build WITHOUT the guard must report clean FAILs, not throw. A
   negative control that crashes proves the file differs; one that goes RED
   proves WHICH behaviour is missing. */
let test = null, condErr = null;
try { test = new Function('payload', 'return (' + cond + ');'); }
catch (e) { condErr = e.message; }
console.log('  condition under test: ' + (cond ? cond.replace(/\s+/g, ' ') : '(none in this build)'));

const CASES = [
  /* the three real junk rows, verbatim from production */
  ['24 Jul junk — all null',        {}, true],
  ['29 Jul junk — all null',        {}, true],
  ['23 Jul junk — typed nonsense',  {homeowner_name:'grdgdfg', property_address:'dfgfdg'}, false],
  /* the real claim */
  ['7 Aug real — State Farm',       {homeowner_name:'Maker Space Solutions LLC (Devon)',
                                     property_address:'1630 E 5th St, Dayton, OH 45403-2304',
                                     carrier:'State Farm', claim_number:'3584R158W'}, false],
  /* the partial starts he said actually happen */
  ['carrier only, number pending',  {carrier:'State Farm'}, false],
  ['claim number only',             {claim_number:'3584R158W'}, false],
  ['property only, carrier unknown',{property_address:'9222 Arlington Rd'}, false],
  ['homeowner only',                {homeowner_name:'Adam Gunn'}, false],
  /* empty strings are not identity either */
  ['all blank strings',             {homeowner_name:'', property_address:'', carrier:'', claim_number:''}, true],
];
for (const [label, payload, shouldBlock] of CASES) {
  if (!test) { ok(`${shouldBlock ? 'REFUSED' : 'allowed'}: ${label}`, false,
    'no guard in this build' + (condErr ? ' (' + condErr + ')' : '')); continue; }
  const blocked = !!test(payload);
  ok(`${shouldBlock ? 'REFUSED' : 'allowed'}: ${label}`, blocked === shouldBlock,
    'blocked=' + blocked);
}
/* ⚠️ The 23 Jul row is deliberately ALLOWED. "grdgdfg" is nonsense, but it is
   nonsense a person typed — the guard's job is to stop a BLANK row, not to
   judge what someone meant. Refusing that would need a rule nobody has agreed. */
console.log('\n  note: 23 Jul is allowed on purpose — a typo is not a blank row.');

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
