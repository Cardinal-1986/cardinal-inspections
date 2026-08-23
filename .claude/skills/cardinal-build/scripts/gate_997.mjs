/* gate_997.mjs — an accepted estimate is the number, whatever its size.

   THE DEFECT. indexMoney() took a plain MAX over every live estimate, so a job
   carrying two — the ordinary shape when a homeowner is shown options — kept
   reporting the biggest one as Job Value after the smaller had been accepted.
   Balance Due, the AR chart, pipeline dollars and the invoice all inherit that
   figure, so one wrong precedence moved five surfaces at once.

   ⚠ THIS RUNS THE SHIPPED FUNCTION, not a re-implementation. The text of
   indexMoney is extracted from index.html by brace-matching and executed
   against real row shapes. A harness that re-implements the rule agrees with
   itself and proves nothing — this project has been bitten by that three times.

   Usage: node gate_997.mjs [path]
   Previous build is the negative control and MUST go red with NAMED failures. */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const APP  = readFileSync(FILE, 'utf8');

let fails = [], passes = 0;
const need = (n, ok, d) => { if (ok) passes++; else fails.push(n + (d ? ' — ' + d : '')); };

/* brace-match the shipped function out of the file */
function extract(name) {
  const at = APP.indexOf('function ' + name + '(');
  if (at < 0) return null;
  let i = APP.indexOf('{', at), depth = 0;
  for (let j = i; j < APP.length; j++) {
    if (APP[j] === '{') depth++;
    else if (APP[j] === '}') { depth--; if (!depth) return APP.slice(at, j + 1); }
  }
  return null;
}
const fnText = extract('indexMoney');
need('indexMoney could be extracted from the artifact', !!fnText,
     'brace-matching found no such function — the gate proved nothing');
if (!fnText) { console.log(`PASS ${passes}  FAIL ${fails.length}`); for (const f of fails) console.log('  FAIL ' + f); process.exit(1); }

/* the module vars it writes into, plus the two status maps it reads. SENT_EST
   is taken from the artifact too, so a change to it is not silently masked. */
const sentSrc = (APP.match(/var SENT_EST\s*=\s*\{[^}]*\}/) || [''])[0];
need('SENT_EST could be read from the artifact', !!sentSrc, 'no SENT_EST literal found');
const acceptedSrc = (APP.match(/var ACCEPTED_EST\s*=\s*\{[^}]*\}/) || [''])[0];

const run = (estimates) => {
  const sandbox = { estBest: {}, estRows: {}, ctrSigned: {} };
  const body = `
    ${sentSrc};
    ${acceptedSrc};
    var estBest = {}, estRows = {}, ctrSigned = {};
    ${fnText}
    indexMoney(EST, []);
    return { estBest: estBest, estRows: estRows };
  `;
  // eslint-disable-next-line no-new-func
  return new Function('EST', body)(estimates);
};

const E = (project_id, status, total, archived) => ({ project_id, status, total, archived: !!archived });

/* 1 — THE DEFECT ITSELF: accept the smaller of two live estimates. */
const two = run([E('p1', 'sent', 36654), E('p1', 'accepted', 21451)]);
need('an accepted estimate beats a larger un-accepted one',
     two.estBest.p1 === 21451,
     `Job Value reports ${two.estBest.p1}, but 21451 is the accepted one`);

/* 2 — signed counts as accepted; it is further along, not less. */
const signed = run([E('p2', 'sent', 40000), E('p2', 'signed', 9000)]);
need('a signed estimate also beats a larger sent one', signed.estBest.p2 === 9000,
     `reports ${signed.estBest.p2}, expected 9000`);

/* 3-5 — THE LOOK-ALIKES, which must NOT move. Without these the fix could have
   been "always take the smallest" or "always take the newest" and 1 would
   still pass. */
const none = run([E('p3', 'sent', 21451), E('p3', 'approved', 36654)]);
need('with nothing accepted, the largest still wins', none.estBest.p3 === 36654,
     `reports ${none.estBest.p3}, expected the 36654 max`);

const twoAccepted = run([E('p4', 'accepted', 12000), E('p4', 'accepted', 31000)]);
need('two accepted on one job (roof + siding) still take the larger',
     twoAccepted.estBest.p4 === 31000,
     `reports ${twoAccepted.estBest.p4} — a job can legitimately carry two accepted estimates`);

const archived = run([E('p5', 'accepted', 5000, true), E('p5', 'sent', 18000)]);
need('an ARCHIVED accepted estimate is ignored', archived.estBest.p5 === 18000,
     `reports ${archived.estBest.p5} — archiving must still remove an estimate from the money`);

/* 6 — a draft is not money, accepted-tier or not. */
const draft = run([E('p6', 'draft', 99000), E('p6', 'sent', 7000)]);
need('a draft is still not money', draft.estBest.p6 === 7000,
     `reports ${draft.estBest.p6}, expected the 7000 sent one`);

/* 7 — estRows must still collect every live estimate, accepted or not: the
   saved-estimates list reads it, and narrowing it would empty that screen. */
need('estRows still lists BOTH live estimates', (two.estRows.p1 || []).length === 2,
     `estRows carries ${(two.estRows.p1 || []).length}, expected 2 — the estimates list reads this`);

console.log(`gate_997 — ${FILE}`);
console.log(`  accepted 21451 vs sent 36654 → ${two.estBest.p1}`);
console.log(`  signed 9000 vs sent 40000    → ${signed.estBest.p2}`);
console.log(`  nothing accepted             → ${none.estBest.p3}`);
console.log(`  two accepted                 → ${twoAccepted.estBest.p4}`);
console.log(`  archived accepted            → ${archived.estBest.p5}`);
console.log(`\nPASS ${passes}  FAIL ${fails.length}`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
