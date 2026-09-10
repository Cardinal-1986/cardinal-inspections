/*
 * Build 901 gate — a rep is notified when a lead is assigned to them.
 * Extracts the TWO shipped notify blocks from index.html (the new-lead-create block
 * keyed on __la, and the reassign block keyed on __rme) and EXECUTES each real source
 * fragment under scenarios, spying on notifyTeam:
 *   - assign to another rep  -> notifyTeam called once, with that rep as the recipient
 *   - self-assignment        -> notifyTeam NOT called
 * v900 has neither block -> extraction fails -> RED.
 *
 * REPAIRED 10 Sep 2026 (audit item 3). This test was RED 6 of 11 on main from
 * build 1147 until now, and THE APP WAS FINE THROUGHOUT. 1147 added a deep link
 * to both shipped blocks -- `clientLink(pid)` / `clientLink(pr.id)` -- and the
 * sandboxes below never supplied `clientLink`. The ReferenceError was thrown
 * INSIDE the block's own `try{}catch(_){}`, so it was swallowed, notifyTeam was
 * never reached, and the spy honestly reported zero calls. A red test that is
 * wrong about a working app is worse than no test: it trains the reader to skip
 * the colour.
 *
 * Two things changed, and the second is the point. The sandbox now provides
 * `clientLink` and `pid` -- and the spy now captures notifyTeam's FOURTH
 * argument, so the deep link 1147 added is asserted rather than merely
 * tolerated. The bug that broke this test is now the thing it checks.
 */
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 200) : '')); } };
console.log(`artifact : ${FILE}`);

// pull a `try{ ... }catch(_){}` block that contains the given needle
function extractTry(needle) {
  const i = SRC.indexOf(needle);
  if (i === -1) return null;
  const start = SRC.lastIndexOf('try{', i);
  if (start === -1) return null;
  const end = SRC.indexOf('}catch(_){}', i);
  if (end === -1) return null;
  return SRC.slice(start, end + '}catch(_){}'.length);
}

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rptRepName = e => ({ 'theo@cardinalrenovations.net': 'Theo', 'nick@cardinalrenovations.net': 'Nick' }[e] || null);

// the shipped app's own shape (cr-lnav): '#p/' + encodeURIComponent(id)
const clientLink = pid => '#p/' + encodeURIComponent(pid);
const PID = 'abc-123';

// ⚠ the FOURTH argument is the deep link. Dropping it from the spy is what
//   let 1147 land without this test noticing the call signature had grown.
const spy = (calls) => (to, subject, body, url) => { calls.push({ to, subject, body, url }); };

function runCreate(block, assigned, meEmail) {
  const calls = [];
  const win = { currentUser: { email: meEmail }, notifyTeam: spy(calls) };
  // locals the block references: assigned, window, esc, rptRepName, first, last, addr,
  // and since 1147 clientLink + pid
  const fn = new Function('assigned', 'window', 'esc', 'rptRepName', 'first', 'last', 'addr',
                          'clientLink', 'pid', block);
  fn(assigned, win, esc, rptRepName, 'Karen', 'Duffy', '123 Main St', clientLink, PID);
  return calls;
}
function runReassign(block, asgValue, meEmail) {
  const calls = [];
  const win = { currentUser: { email: meEmail }, notifyTeam: spy(calls) };
  const fn = new Function('asg', 'pr', 'window', 'esc', 'rptRepName', 'clientLink', block);
  fn({ value: asgValue }, { id: PID, name: 'Karen Duffy', address: '123 Main St' }, win, esc, rptRepName, clientLink);
  return calls;
}

try {
  const createBlk = extractTry("var __la = (assigned");
  const reassignBlk = extractTry("var __rme = (window.currentUser");
  ok('new-lead notify block is present in the source', !!createBlk);
  ok('reassign notify block is present in the source', !!reassignBlk);
  if (!createBlk || !reassignBlk) { console.log(`\nRED — ${pass} passed, ${fail + 1} failed (block missing)`); process.exit(1); }

  // CREATE: admin assigns to Nick, acting as Theo -> ping Nick
  const c1 = runCreate(createBlk, ['nick@cardinalrenovations.net'], 'theo@cardinalrenovations.net');
  ok('new lead assigned to another rep -> notifyTeam called once', c1.length === 1, c1);
  ok('...addressed to the assigned rep', c1[0] && Array.isArray(c1[0].to) && c1[0].to[0] === 'nick@cardinalrenovations.net', c1[0]);
  ok('...subject names it a new lead', c1[0] && /new lead assigned/i.test(c1[0].subject), c1[0]);
  ok('...and carries the client deep link (1147) as the 4th argument',
     c1[0] && c1[0].url === '#p/' + PID, c1[0] && c1[0].url);

  // CREATE: self-assignment (rep creates their own lead) -> no ping
  const c2 = runCreate(createBlk, ['theo@cardinalrenovations.net'], 'theo@cardinalrenovations.net');
  ok('self-assigned new lead -> notifyTeam NOT called', c2.length === 0, c2);

  // CREATE: no assignee -> no ping
  const c3 = runCreate(createBlk, [''], 'theo@cardinalrenovations.net');
  ok('new lead with no assignee -> notifyTeam NOT called', c3.length === 0, c3);

  // REASSIGN: hand to Nick, acting as Theo -> ping Nick
  const r1 = runReassign(reassignBlk, 'nick@cardinalrenovations.net', 'theo@cardinalrenovations.net');
  ok('reassigned to another rep -> notifyTeam called once', r1.length === 1, r1);
  ok('...addressed to the newly-assigned rep', r1[0] && r1[0].to[0] === 'nick@cardinalrenovations.net', r1[0]);
  ok('...subject says a lead was assigned to you', r1[0] && /assigned to you/i.test(r1[0].subject), r1[0]);
  ok('...and carries the client deep link (1147) as the 4th argument',
     r1[0] && r1[0].url === '#p/' + PID, r1[0] && r1[0].url);

  // REASSIGN: self-assignment -> no ping
  const r2 = runReassign(reassignBlk, 'theo@cardinalrenovations.net', 'theo@cardinalrenovations.net');
  ok('reassigned to self -> notifyTeam NOT called', r2.length === 0, r2);

  /* ⚠ COVERAGE FLOOR. This file lost nothing silently, but its sibling
     test_stale_worker did exactly that: a check count derived from what the
     page happened to contain fell 15 -> 14 and stayed green. Assert the
     minimum set that must exist, so a shrinking test is a failing test. */
  ok('coverage floor: ' + (pass + fail) + ' checks ran (>= 13)', (pass + fail) >= 13);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e && e.stack || e).slice(0, 400)); fail++; }
process.exit(fail === 0 ? 0 : 1);
