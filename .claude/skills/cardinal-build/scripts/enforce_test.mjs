/* Runs the SHIPPED enforceGaps() — extraction, not re-implementation. */
import { readFileSync } from 'fs';
const src = readFileSync(process.argv[2], 'utf8');
const a = src.indexOf('function enforceGaps(');
const b = src.indexOf('\nfunction ', a + 10);
if (a < 0 || b < 0) { console.log('EXTRACT FAILED'); process.exit(2); }
const body = src.slice(a, b);
const PACK_BY_ID = { step_flash: { id:'step_flash', title:'Step flashing', basis:'code',
  citation:'RCO R905.2.8.3', unit:'LF' } };
const fn = new Function('raw','meas','PACK_BY_ID','measQty',
  body + '\n return enforceGaps(raw, meas);');
const measQty = () => null;
const run = raw => fn(raw, {}, PACK_BY_ID, measQty);

const CASES = [
  ['photo_index survives as a number',
   [{ pack_id:'step_flash', item:'Step flashing', why:'seen', photo_index:2 }],
   g => g.photo_index === 2],
  ['a missing photo_index becomes null, not undefined',
   [{ pack_id:'step_flash', item:'Step flashing', why:'seen' }],
   g => g.photo_index === null],
  ['a STRING photo_index is refused (it is a pointer, not text)',
   [{ pack_id:'step_flash', item:'X', why:'y', photo_index:'2; DROP' }],
   g => g.photo_index === null],
  ['a negative index is refused',
   [{ pack_id:'step_flash', item:'X', why:'y', photo_index:-1 }],
   g => g.photo_index === null],
  ['a fractional index is floored',
   [{ pack_id:'step_flash', item:'X', why:'y', photo_index:3.9 }],
   g => g.photo_index === 3],
  ['an INVENTED citation is still overwritten from the pack',
   [{ pack_id:'step_flash', item:'X', why:'y', citation:'OAC 9999-1-1', basis:'code' }],
   g => g.citation === 'RCO R905.2.8.3'],
  ['an unknown pack_id survives UNCITED, never with the model’s own citation',
   [{ pack_id:'not_a_real_id', item:'X', why:'y', citation:'RCO R1.2.3' }],
   g => g.citation === null && g.pack_id === null && g.basis === 'scope-consistency'],
  ['nothing arrives included',
   [{ pack_id:'step_flash', item:'X', why:'y', included:true }],
   g => g.included === false],
  ['an id is always assigned',
   [{ pack_id:'step_flash', item:'X', why:'y' }],
   g => !!g.id],
];
let bad = 0;
for (const [name, raw, ok] of CASES) {
  let g; try { g = run(raw)[0]; } catch (e) { console.log(`*** THREW  ${name}: ${e.message}`); bad++; continue; }
  if (!g) { console.log(`*** DROPPED  ${name}`); bad++; continue; }
  const pass = ok(g);
  if (!pass) bad++;
  console.log(`${pass ? 'PASS' : '*** FAIL'}  ${name}${pass ? '' : '  -> ' + JSON.stringify({photo_index:g.photo_index, citation:g.citation, pack_id:g.pack_id, basis:g.basis, included:g.included, id:g.id})}`);
}
console.log(bad ? `\n*** ${bad} FAILED` : '\nall cases pass');
process.exit(bad ? 1 : 0);
