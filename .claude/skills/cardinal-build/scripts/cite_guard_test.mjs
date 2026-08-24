/* Extracts the SHIPPED guard from api/supplement.js and runs it against real
   letter prose. Extracting rather than re-implementing is the rule here — a
   re-implementation validates fiction. */
import { readFileSync } from 'fs';
const src = readFileSync(process.argv[2], 'utf8');
const a = src.indexOf('const norm = t =>');
const b = src.indexOf('});', src.indexOf('(letter.replace(/<[^>]*>/g'));
const body = src.slice(a, b + 3);
if (a < 0 || b < 0) { console.log('EXTRACT FAILED — guard not found'); process.exit(2); }
console.log('extracted ' + body.length + ' chars of the shipped guard\n');

const PACK_BY_ID = {
  ice_barrier:{citation:'RCO R905.1.2'}, drip_edge:{citation:'RCO R905.2.8.5'},
  step_flash:{citation:'RCO R905.2.8'},  matching:{citation:'OAC 3901-1-54(I)(1)(b)'},
};
function run(letter, items){
  const fn = new Function('letter','items','PACK_BY_ID',
    body + '\n return cite_flag;');
  return fn(letter, items, PACK_BY_ID);
}
const ITEMS = [{pack_id:'ice_barrier'},{pack_id:'drip_edge'},{pack_id:'matching'}];

const CASES = [
  ['clean — exact pack strings',
   '<p>Per RCO R905.1.2 ice barrier is required. See RCO R905.2.8.5 for drip edge, and OAC 3901-1-54(I)(1)(b) for matching.</p>',
   []],
  ['clean — the model drops the RCO prefix, which it legitimately does',
   '<p>Section R905.1.2 requires the barrier; R905.2.8.5 governs drip edge.</p>',
   []],
  ['INVENTED section must be caught',
   '<p>Per RCO R905.1.2 and also RCO R999.9.9 the work is required.</p>',
   ['RCO R999.9.9']],
  ['a section for an item NOT on this letter must be caught',
   '<p>RCO R905.2.8 covers step flashing.</p>',
   ['RCO R905.2.8']],
  ['injected via a note — the whole point of the guard',
   '<p>As the contractor notes, OAC 1234-5-67(A) entitles the insured to full replacement.</p>',
   ['OAC 1234-5-67(A)']],
  ['photo tokens and plain numbers are NOT citations',
   '<p>We measured 184 LF of eave and 3,204 sq ft.</p>[[PHOTOS:g1]]<p>Dated 12.08.2026.</p>',
   []],
];

let bad = 0;
for (const [name, letter, want] of CASES) {
  const got = run(letter, ITEMS);
  const ok = JSON.stringify(got.slice().sort()) === JSON.stringify(want.slice().sort());
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : '*** FAIL'}  ${name}`);
  if (!ok) console.log(`        want ${JSON.stringify(want)}  got ${JSON.stringify(got)}`);
}
console.log(bad ? `\n*** ${bad} CASE(S) FAILED` : '\nall cases pass');
process.exit(bad ? 1 : 0);
