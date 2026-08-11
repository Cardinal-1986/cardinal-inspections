/* Build 705 — the payments door on the black Community card (CR-COM-002).

   Executes the SHIPPED syncJobMenu (sliced from the artifact, brace-matched,
   run via new Function) against a jsdom document. Not a re-implementation.

   What must hold:
     · the Job Menu ends with one extra tile, data-jm="pay", labelled exactly
       "Payment Information" (the cream row's words — vocabulary must not fork)
     · tapping it calls window.openPaymentsPage and does NOT suspendForTab —
       openPaymentsPage swaps the whole view, so suspending would flash cream
     · the mirrored numeric tiles keep their exact old behaviour, suspend
       whitelist included
     · a missing openPaymentsPage does not throw

   Negative control: run against the 704 artifact — the pay tile is absent and
   this goes red.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_705.js [index.html] */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (label, cond, note) => {
  if (cond) { pass++; console.log('  PASS ' + label); }
  else { fail++; console.log('  FAIL ' + label + (note !== undefined ? '  → ' + note : '')); }
};

/* ── slice the shipped code: var jmTries … end of syncJobMenu ── */
const start = SRC.indexOf('var jmTries = 0;');
ok('shipped anchor `var jmTries = 0;` found', start !== -1);
const fnAt = SRC.indexOf('function syncJobMenu()', start);
ok('shipped syncJobMenu follows it', fnAt !== -1 && fnAt - start < 200, String(fnAt - start));
let i = SRC.indexOf('{', fnAt), depth = 0, end = -1;
for (; i < SRC.length; i++) {
  const c = SRC[i];
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (!depth) { end = i + 1; break; } }
}
ok('syncJobMenu brace-matched', end !== -1);
const code = SRC.slice(start, end);
console.log('  (sliced ' + code.length + ' chars of shipped code)');

/* ── a document shaped like the app's: jaGrid tiles + the black card's jm ── */
const dom = new JSDOM(
  '<div id="jaGrid">' +
  '<div class="jatile" data-ja="docs"><span>Documents</span><span class="jn">3</span></div>' +
  '<div class="jatile" data-ja="photos"><span>Photos</span><span class="jn zero">0</span></div>' +
  '<div class="jatile"><span>Notes</span></div>' +
  '</div><div id="cr-cc-jm"></div>');
const doc = dom.window.document;

const calls = { suspend: 0, pay: 0, boxClicks: [] };
doc.querySelectorAll('#jaGrid .jatile').forEach((b, idx) => {
  b.addEventListener('click', () => calls.boxClicks.push(idx));
});
const winMock = { openPaymentsPage: () => { calls.pay++; } };
const escFn = s => String(s).replace(/[&<>"']/g,
  m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const syncJobMenu = new Function('document', 'window', 'esc', 'suspendForTab', 'setTimeout',
  '"use strict";\n' + code + '\nreturn syncJobMenu;')(
  doc, winMock, escFn, () => { calls.suspend++; }, () => {});

syncJobMenu();

/* ── the tile ── */
const jm = doc.getElementById('cr-cc-jm');
const tiles = jm.querySelectorAll('.cc-jmb');
ok('Job Menu renders 3 mirrored tiles + the payments tile', tiles.length === 4, tiles.length);
const payTile = jm.querySelector('[data-jm="pay"]');
ok('the payments tile exists and is LAST', payTile && tiles[tiles.length - 1] === payTile);
ok('its label is exactly the cream row’s: "Payment Information"',
  payTile && payTile.querySelector('.l') &&
  payTile.querySelector('.l').textContent === 'Payment Information',
  payTile && payTile.textContent);
/* the shipped HTML has NO whitespace between the label and count spans, so
   textContent is 'Documents3' — the first draft asserted 'Documents 3' */
ok('mirrored tiles kept their labels and counts',
  tiles[0] && tiles[0].textContent.trim() === 'Documents3' &&
  tiles[1] && !!tiles[1].querySelector('.n.z'));

/* ── the tap: straight to payments, no suspend, no cream flash ── */
payTile && payTile.dispatchEvent(new dom.window.Event('click'));
/* onclick property handlers need the property invoked under jsdom+new Function: */
if (payTile && calls.pay === 0 && typeof payTile.onclick === 'function') payTile.onclick();
ok('tapping it calls openPaymentsPage exactly once', calls.pay === 1, calls.pay);
ok('tapping it does NOT suspendForTab (no black→cream flash)', calls.suspend === 0, calls.suspend);
ok('tapping it clicks no jaGrid tile underneath', calls.boxClicks.length === 0, calls.boxClicks.join(','));

/* ── the old tiles behave byte-for-byte as before ── */
tiles[0] && tiles[0].onclick && tiles[0].onclick();          /* data-ja="docs" → suspends */
ok('a docs tile still suspends then clicks through', calls.suspend === 1 && calls.boxClicks.join(',') === '0',
  'suspend=' + calls.suspend + ' clicks=' + calls.boxClicks.join(','));
tiles[1] && tiles[1].onclick && tiles[1].onclick();          /* data-ja="photos" → whitelisted */
ok('a photos tile still clicks through WITHOUT suspending', calls.suspend === 1 && calls.boxClicks.join(',') === '0,1',
  'suspend=' + calls.suspend + ' clicks=' + calls.boxClicks.join(','));
tiles[2] && tiles[2].onclick && tiles[2].onclick();          /* no data-ja → no suspend */
ok('a tile with no data-ja still clicks through without suspending',
  calls.suspend === 1 && calls.boxClicks.join(',') === '0,1,2');

/* ── a missing global must not throw (guarded typeof) ── */
delete winMock.openPaymentsPage;
let threw = false;
try { payTile && payTile.onclick && payTile.onclick(); } catch (e) { threw = true; }
ok('a missing window.openPaymentsPage is a no-op, not a throw', !threw && calls.pay === 1);

console.log('\nHARNESS 705: ' + (fail ? 'RED (' + fail + ' failed)' : 'GREEN') +
  '  (' + pass + ' passed, ' + fail + ' failed)  on ' + path.basename(FILE));
process.exit(fail ? 1 : 0);
