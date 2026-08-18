/*
 * Build 901 gate — a rep is notified when a lead is assigned to them.
 * Extracts the TWO shipped notify blocks from index.html (the new-lead-create block
 * keyed on __la, and the reassign block keyed on __rme) and EXECUTES each real source
 * fragment under scenarios, spying on notifyTeam:
 *   - assign to another rep  -> notifyTeam called once, with that rep as the recipient
 *   - self-assignment        -> notifyTeam NOT called
 * v900 has neither block -> extraction fails -> RED.
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

function runCreate(block, assigned, meEmail) {
  const calls = [];
  const win = { currentUser: { email: meEmail }, notifyTeam: (to, subject, body) => { calls.push({ to, subject, body }); } };
  // locals the block references: assigned, window, esc, rptRepName, first, last, addr
  const fn = new Function('assigned', 'window', 'esc', 'rptRepName', 'first', 'last', 'addr', block);
  fn(assigned, win, esc, rptRepName, 'Karen', 'Duffy', '123 Main St');
  return calls;
}
function runReassign(block, asgValue, meEmail) {
  const calls = [];
  const win = { currentUser: { email: meEmail }, notifyTeam: (to, subject, body) => { calls.push({ to, subject, body }); } };
  const fn = new Function('asg', 'pr', 'window', 'esc', 'rptRepName', block);
  fn({ value: asgValue }, { name: 'Karen Duffy', address: '123 Main St' }, win, esc, rptRepName);
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

  // REASSIGN: self-assignment -> no ping
  const r2 = runReassign(reassignBlk, 'theo@cardinalrenovations.net', 'theo@cardinalrenovations.net');
  ok('reassigned to self -> notifyTeam NOT called', r2.length === 0, r2);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e && e.stack || e).slice(0, 400)); fail++; }
process.exit(fail === 0 ? 0 : 1);
