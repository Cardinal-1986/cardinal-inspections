/* Build 534 functional gate.
 *
 * Two jobs, and the second matters more than the first:
 *   A. the leak is fixed  - a glued marker now draws
 *   B. NOTHING ELSE MOVED - the 33 assertions that passed on 533 still pass,
 *      byte-for-byte the same expectations, because this build must not change
 *      how a single diagram looks.
 *
 * The renderer is extracted from the PATCHED artifact by anchor, not by line
 * number - 534 shifted every line after 49425 and a fixed range would silently
 * capture the wrong text and then "pass".
 */
const fs = require('fs');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';

function renderer(file) {
  const src = fs.readFileSync(file, 'utf8');
  const START = "  function esc(s){ return String(s == null ? '' : s)\n    .replace(/&/g,'&amp;')";
  const END = "    return '<p class=\"lb-p\">' + lbInline(lines.join('<br>')) + '</p>';\n  }";
  const a = src.indexOf(START);
  const b = src.indexOf(END, a);
  if (a < 0 || b < 0) throw new Error('anchor not found in ' + file);
  const body = src.slice(a, b + END.length);
  // Prove the extractor caught what we think it did, rather than trusting it.
  if (!/function lbRich\(/.test(body)) throw new Error('extract missing lbRich');
  if (!/function lbDiagram\(/.test(body)) throw new Error('extract missing lbDiagram');
  const PRELUDE = `
    var VIEW='resourceLibraryView';
    var document={getElementById:function(){return null;}};
    function ccIsAdmin(){return false;}
    var window={currentUser:{email:'t@e.st'}};
  `;
  const m = new Function(PRELUDE + body +
    '\n; return {lbRich:lbRich, lbDiagram:lbDiagram, has:typeof lbSpaceMarkers==="function"};')();
  return m;
}

const NEW = renderer(SC + '/app/index_v534.html');
const OLD = renderer(SC + '/app/index_v533.html');

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '\n          ' + d : ''))); };

// ── A. the fix ──────────────────────────────────────────────────────────────
console.log('\nA. THE LEAK IS FIXED  (each of these FAILED on 533)');
ok('534 carries the normaliser', NEW.has === true);
ok('533 did not', OLD.has === false);

const GLUED = 'Here is the assembly:\n~~stack\nShingles\nUnderlayment\nDeck';
ok('533 leaked "~~stack" to the reader  [the bug]', OLD.lbRich(GLUED).indexOf('~~stack') > -1);
ok('534 draws it instead', NEW.lbRich(GLUED).indexOf('<svg') > -1);
ok('534 leaks nothing', NEW.lbRich(GLUED).indexOf('~~stack') === -1);
ok('534 keeps the prose above it', NEW.lbRich(GLUED).indexOf('Here is the assembly') > -1);
ok('534 draws all 3 bands', (NEW.lbRich(GLUED).match(/lb-d-band/g) || []).length === 3);

const GF = 'Do it in this order:\n~~flow\nDry in\nEave metal\nField';
ok('glued ~~flow draws', NEW.lbRich(GF).indexOf('<svg') > -1 && NEW.lbRich(GF).indexOf('~~flow') === -1);

// pitch: rule 2 - it reads no data lines, so trailing prose must be split off
const GP = 'A 6/12 is common.\n~~pitch 6/12\nMeasure before ordering.';
const gp = NEW.lbRich(GP);
ok('glued ~~pitch draws (rule 2)', gp.indexOf('<svg') > -1);
ok('  and keeps the text AFTER it', gp.indexOf('Measure before ordering') > -1);
ok('  and computes the multiplier', gp.indexOf(Math.sqrt(1.25).toFixed(4)) > -1);
ok('533 could not do this', OLD.lbRich(GP).indexOf('<svg') === -1);

// bars: rule 3 - a trailing sentence has no "|", and used to null the diagram
const GB = 'Waste varies.\n~~bars %\nSimple gable | 6\nStandard | 12\nUse the higher end when unsure.';
const gb = NEW.lbRich(GB);
ok('glued ~~bars draws (rule 3)', gb.indexOf('<svg') > -1);
ok('  2 bars, not 3 - the sentence is not data', (gb.match(/lb-d-bar/g) || []).length === 2,
   'got ' + (gb.match(/lb-d-bar/g) || []).length);
ok('  the trailing sentence survives as prose', gb.indexOf('Use the higher end') > -1);
ok('533 dropped this diagram entirely', OLD.lbRich(GB).indexOf('<svg') === -1);

// ── B. no-op on correct input: the real regression risk ─────────────────────
console.log('\nB. NOTHING ELSE MOVED  (534 output must equal 533 output)');
const SAME = [
  ['stack', 'Intro.\n\n~~stack\nShingles\nUnderlayment\nIce barrier\nDeck\n\nOutro.'],
  ['flow', 'Intro.\n\n~~flow\nOne\nTwo\nThree\n\nOutro.'],
  ['bars', 'Intro.\n\n~~bars %\nA | 6\nB | 12\nC | 15\n\nOutro.'],
  ['pitch', 'Intro.\n\n~~pitch 6/12\n\nOutro.'],
  ['a table', 'Intro.\n\n| Item | Qty |\n|---|---|\n| Ridge | 4 |\n\nOutro.'],
  ['bullets', '- one\n- two\n- three'],
  ['numbered', '1. one\n2. two'],
  ['a heading', '## Flashing\n\nBody text here.'],
  ['bold + plain prose', 'Some **bold** text.\n\nA second paragraph.'],
  ['no markers at all', 'Just prose.\n\nMore prose.\n\nEven more.'],
];
for (const [name, src] of SAME) {
  ok('identical output: ' + name, NEW.lbRich(src) === OLD.lbRich(src));
}

// ── C. the original 33 still hold ───────────────────────────────────────────
console.log('\nC. THE 533 SUITE, re-run against 534');
let h = NEW.lbRich('A.\n\n~~stack\nAsphalt shingles\nSynthetic underlayment\nIce barrier at the eave\nRoof deck\n\nB.');
ok('stack: 4 bands', (h.match(/class="lb-d-band/g) || []).length === 4);
ok('stack: top marked', h.indexOf('lb-d-top') > -1);
h = NEW.lbRich('A.\n\n~~flow\nOne\nTwo\nThree\n\nB.');
ok('flow: 3 numbers, 2 arrows', (h.match(/class="lb-d-n"/g) || []).length === 3 &&
   (h.match(/class="lb-d-arrow"/g) || []).length === 2);
h = NEW.lbRich('A.\n\n~~bars %\nSimple | 6\nStandard | 12\nComplex | 15\n\nB.');
ok('bars: 3 bars', (h.match(/class="lb-d-bar"/g) || []).length === 3);

ok('malformed bars still returns null', NEW.lbDiagram('bars', '%', ['no pipe']) === null);
ok('one-row stack still returns null', NEW.lbDiagram('stack', '', ['only one']) === null);
ok('>8 rows still returns null', NEW.lbDiagram('stack', '', 'abcdefghi'.split('')) === null);
ok('pitch 0/12 still returns null', NEW.lbDiagram('pitch', '0/12', []) === null);
ok('pitch 99/12 still clamped', NEW.lbDiagram('pitch', '99/12', []) === null);

console.log('\nD. INJECTION — the escape-then-promote contract still holds');
const EVIL = 'Intro.\n~~stack\n<script>alert(1)</scr' + 'ipt>\n<img src=x onerror=alert(2)>\nDeck\n\nEnd.';
h = NEW.lbRich(EVIL);
ok('no live <script>', h.indexOf('<script') === -1);
ok('no live <img>', h.indexOf('<img') === -1);
ok('payload escaped, not dropped', h.indexOf('&lt;script&gt;') > -1);
ok('still drew the diagram', h.indexOf('<svg') > -1);
h = NEW.lbRich('A.\n~~stack\n" onload="alert(1)\nSecond\n\nB.');
ok('quote cannot break an attribute', h.indexOf('onload="alert') === -1);
ok('aria-label is still the fixed app string',
   h.indexOf('aria-label="Layered assembly, listed from the top layer down"') > -1);

// a marker the model invents that we do not support must not be promoted
ok('unknown ~~marker is left as text, not swallowed',
   NEW.lbRich('A.\n\n~~teleport\nx\ny\n\nB.').indexOf('~~teleport') > -1);

console.log('\nE. PATHOLOGICAL INPUT — the normaliser must never throw');
for (const s of ['~~stack', '~~bars', '~~pitch', '~~', '~~bars %\n', '\n\n~~stack\n\n\n',
                 '~~stack\n~~flow\n~~bars %\nA | 1', 'a\n'.repeat(400) + '~~stack\nx\ny']) {
  let threw = false;
  try { NEW.lbRich(s); } catch (e) { threw = true; }
  ok('no throw on ' + JSON.stringify(s.slice(0, 26)), !threw);
}
ok('empty string still returns empty', NEW.lbRich('') === '' && NEW.lbRich(null) === '');

console.log('\n' + '='.repeat(60));
console.log('  ' + pass + ' passed, ' + fail + ' failed');
console.log('='.repeat(60));
process.exit(fail ? 1 : 0);
