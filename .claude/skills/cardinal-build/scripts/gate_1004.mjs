/* gate_1004.mjs — one source of truth for the address (the Construction Agreement).

   THE DEFECT. The contract (build 542) filled [STREET]/[CITY]/[STATE]/[ZIP] from
   checklist.lead.location.* unconditionally. That structured copy is written only
   when a lead is created through the retail intake and is NEVER updated when the
   address is edited on the profile (pfSave writes pr.address only), and it does
   not exist at all for profile-created leads. The map, directions and work order
   all use pr.address — so after an edit the map showed the new address while the
   signed contract printed the old one.

   THE FIX. The contract now defers to pr.address: it uses the split boxes only
   when they reconstruct the current pr.address, otherwise it puts pr.address on
   [STREET] and leaves the rest blank. So the contract can never disagree with the
   map.

   This runs the SHIPPED block, extracted from the artifact — not a re-implementation.
   Control: the previous build, where the block fills the boxes from the stale copy.

   Usage: node gate_1004.mjs [path]   Control: node gate_1004.mjs <prev-build> */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const SRC = readFileSync(FILE, 'utf8');

let fails = [], passes = 0;
const need = (n, ok, d) => { if (ok) passes++; else fails.push(n + (d ? ' — ' + d : '')); };

/* extract the shipped address-fill block: from the [BUYER] address section start
   to the collapse() helper that follows it */
const START = SRC.indexOf('var _loc = (parseCkAll(pr).lead || {}).location || {};');
const END = SRC.indexOf('function collapse(key, value){', START);
if (START < 0 || END < 0) { console.log('gate_1004 FAIL — could not locate the address-fill block (START=' + START + ' END=' + END + ')'); process.exit(1); }
const block = SRC.slice(START, END);

let fill;
try {
  // eslint-disable-next-line no-new-func
  fill = new Function('pr', 'put', 'parseCkAll', block);
} catch (e) { console.log('gate_1004 FAIL — block did not compile: ' + e.message); process.exit(1); }

/* run the shipped block for one project shape; the injected put() records the
   filled boxes into the closed-over map, which is what we assert on */
const run = (pr) => {
  const boxes = {};
  const put = (k, v) => { boxes[k] = (v == null ? '' : String(v)); };
  const parseCkAll = (p) => ({ lead: (p && p.__lead) || {} });
  try { fill(pr, put, parseCkAll); } catch (e) { boxes.__err = e.message; }
  return boxes;
};

const STALE = { street: '123 Main St', city: 'Dayton', state: 'OH', zip: '45402' };

// S1 — intake lead, address never edited: parts reconstruct pr.address → structured
const s1 = run({ address: '123 Main St, Dayton, OH 45402', __lead: { location: STALE } });
need('S1 intake unedited: STREET is the structured street', s1['[STREET]'] === '123 Main St', 's1=' + JSON.stringify(s1));
need('S1 intake unedited: CITY filled', s1['[CITY]'] === 'Dayton');
need('S1 intake unedited: ZIP filled', s1['[ZIP]'] === '45402');

// S2 — address edited on the profile: parts are stale → flat wins, no stale split
const s2 = run({ address: '456 New Ave, Kettering, OH 45429', __lead: { location: STALE } });
need('S2 edited: STREET is the CURRENT flat address', s2['[STREET]'] === '456 New Ave, Kettering, OH 45429', 's2=' + JSON.stringify(s2));
need('S2 edited: STREET is NOT the stale street', s2['[STREET]'] !== '123 Main St');
need('S2 edited: CITY blanked (no stale split)', s2['[CITY]'] === '');
need('S2 edited: STATE blanked', s2['[STATE]'] === '');

// S3 — profile-created lead: no location parts at all → flat on STREET
const s3 = run({ address: '789 Oak Blvd, Vandalia, OH 45377', __lead: {} });
need('S3 profile-created: STREET is the flat address (was blank before)', s3['[STREET]'] === '789 Oak Blvd, Vandalia, OH 45377', 's3=' + JSON.stringify(s3));
need('S3 profile-created: CITY blank', s3['[CITY]'] === '');

// S4 — address cleared: flat empty → contract blank, consistent with the map
const s4 = run({ address: '', __lead: { location: STALE } });
need('S4 cleared: STREET blank, not the stale copy', s4['[STREET]'] === '', 's4=' + JSON.stringify(s4));

// S5 — same address, different punctuation/spacing: still recognised as current → structured
const s5 = run({ address: '123 Main St Apt 2 Dayton OH 45402',
                 __lead: { location: { street: '123 Main St', suite: 'Apt 2', city: 'Dayton', state: 'OH', zip: '45402' } } });
need('S5 punctuation-different but same address: structured kept', s5['[CITY]'] === 'Dayton', 's5=' + JSON.stringify(s5));
need('S5: STREET includes the suite', /Apt 2/.test(s5['[STREET]'] || ''));

if (fails.length) { console.log('gate_1004 FAIL  ' + passes + ' pass / ' + fails.length + ' fail'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('gate_1004 PASS  ' + passes + '/' + passes);
