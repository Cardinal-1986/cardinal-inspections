/* gate_1149 — a signature can only ever land on the document you are looking at.
 *
 * THE INCIDENT (29 Aug 2026): at a client's house, Theo opened a contract, got
 * the wrong one, backed out, tapped "Contract — Roofing", and signed. The
 * signature landed on the FIRST contract. Confirmed in the database: the
 * service contract (0 data-sig slots) carries her signature at 22:20:35; the
 * roofing contract (6 slots) was never touched after creation.
 *
 * Two silent failures lined up, and this gate holds both shut:
 *
 *   1. openEditor(id): `db.get` returns UNDEFINED on an offline cache miss —
 *      no throw, no error. `if(!r) return;` then bailed WITHOUT A WORD, leaving
 *      the previously-loaded document in the frame looking like the one tapped.
 *   2. sigBtn: a legacy 0-slot document skips the "whose signature is this?"
 *      picker entirely and drops the signature into the legacy destination.
 *
 * Run against the previous build as a control -> must go RED.
 */
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '../../../../index.html';
const SRC  = readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

/* pull the SHIPPED openEditor that owns the frame, by the line that loads it */
const anchor = SRC.indexOf('frame.srcdoc = r.html;');
ok(anchor > 0, 'found the document-editor open path (frame.srcdoc = r.html)');
const fnStart = Math.max(SRC.lastIndexOf('\nasync function ', anchor),
                         SRC.lastIndexOf('\nfunction ', anchor));
const openFn = SRC.slice(fnStart, anchor);

/* 1. a cache miss must NOT be silent */
/* ⚠ this used [^\n]{0,200}, which stops at the first newline — it saw only
   "if(!r){" and never reached the showError two lines below, so it failed the
   CORRECT fix. The guard is a BLOCK now; read the block. */
const miss = openFn.match(/if\s*\(\s*!\s*r\s*\)\s*(\{[\s\S]{0,1400}?\n\s{2}\}|[^\n]{0,200})/);
ok(!!miss, 'the !r cache-miss guard is still there to inspect');
ok(!!miss && /showError|crTell|throw|Could not/.test(miss[0]),
   'a cache MISS reports itself instead of returning silently'
   + (miss ? ' — got: ' + miss[0].trim().slice(0, 72) : ''));

/* 2. the frame must record WHICH document it is showing */
ok(/frame\.dataset\.docId\s*=/.test(SRC),
   'the frame stamps the id of the document actually loaded');

/* 3. the signature pad must refuse when it cannot prove what it is signing */
const sigStart = SRC.indexOf("getElementById('sigBtn').addEventListener");
ok(sigStart > 0, 'found the signature button handler');
const sigFn = SRC.slice(sigStart, sigStart + 2400);
ok(/frame\.dataset\.docId/.test(sigFn),
   'the signature button checks the loaded document id before opening the pad');
/* ⚠ this first tested `/return/ && /crTell/` anywhere in a 2400-char window —
   both appear in the untouched handler, so it PASSED on the control and could
   not fail. Tie it to the guard itself: the id comparison and its refusal have
   to be the same statement. */
ok(/docId[\s\S]{0,220}?(crTell|showError)[\s\S]{0,120}?return/.test(sigFn),
   '  · and the id check itself REFUSES with a message (not merely nearby)');

/* 4. a 0-slot legacy document must not silently pick a destination */
/* ⚠ this also passed on the control. The 0-slot fall-through is REAL but it is
   only reachable once the document is proven, so the guard that matters is the
   id check running BEFORE the slots branch. Assert the ORDER, which is the
   thing that actually protects the signature. */
const idAt = sigFn.indexOf('docId'), slotAt = sigFn.indexOf('slots.length');
ok(idAt > 0 && slotAt > 0 && idAt < slotAt,
   'the document-identity check runs BEFORE the signature-slot branch'
   + ` (id@${idAt}, slots@${slotAt})`);

console.log(fail ? `\nRED — ${fail} failed, ${pass} passed` : `\nGREEN — all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
