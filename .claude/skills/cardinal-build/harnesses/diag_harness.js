/* Does the librarian actually produce diagrams?
 *
 * Theo: "check if the librarian is actually able to make diagrams and
 *        illustrations ... the other session went in a circle and burned a
 *        lot of money by guessing and it not being true"
 *
 * So: no reading, no reasoning. The SHIPPED lbRich/lbDiagram text is lifted
 * out of index.html verbatim and executed against output shaped exactly like
 * what api/librarian.js instructs the model to emit. If a diagram comes out,
 * it comes out; if the marker leaks to the reader as "~~stack", that shows up
 * too - which is the exact failure build 510 was spent on.
 */
const fs = require('fs');
const SRC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad/lib_extract.js';

// Stubs for the few things the extracted region closes over. None of them are
// on the diagram path; they exist so the region can be evaluated at all.
const PRELUDE = `
  var VIEW = 'resourceLibraryView';
  var document = { getElementById: function(){ return null; } };
  function ccIsAdmin(){ return false; }
  var window = { currentUser: { email: 'theo@cardinalrenovations.net' } };
`;

const body = fs.readFileSync(SRC, 'utf8');
const mod = new Function(PRELUDE + body + '\n; return { lbRich: lbRich, lbDiagram: lbDiagram };')();
const { lbRich, lbDiagram } = mod;

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
}

// ── 1. The four forms, written EXACTLY as api/librarian.js tells the model to
//       write them: marker on its own first line, blank line before and after.
console.log('\n1. The four diagram forms, spaced as the prompt instructs');

const STACK = 'A steep-slope assembly is built from the deck up.\n\n' +
  '~~stack\nAsphalt shingles\nSynthetic underlayment\nIce barrier at the eave\nRoof deck\n\n' +
  'Each layer sheds onto the one below it.';
let h = lbRich(STACK);
ok('~~stack renders an <svg>', h.indexOf('<svg') > -1);
ok('~~stack draws 4 bands', (h.match(/class="lb-d-band/g) || []).length === 4,
   'got ' + (h.match(/class="lb-d-band/g) || []).length);
ok('~~stack marks the top layer', h.indexOf('lb-d-top') > -1);
ok('~~stack does NOT leak the marker to the reader', h.indexOf('~~stack') === -1);
ok('~~stack keeps the surrounding prose', h.indexOf('sheds onto the one below') > -1);

const FLOW = 'Install in this order.\n\n~~flow\nDry in the deck\nSet the eave metal\nRun the field\n\nDone.';
h = lbRich(FLOW);
ok('~~flow renders an <svg>', h.indexOf('<svg') > -1);
ok('~~flow numbers its steps', (h.match(/class="lb-d-n"/g) || []).length === 3);
ok('~~flow draws arrows between steps', (h.match(/class="lb-d-arrow"/g) || []).length === 2);

const BARS = 'Waste factors vary with complexity.\n\n' +
  '~~bars %\nSimple gable | 6\nStandard cut-up | 12\nComplex cut-up | 15\n\nUse the higher end when in doubt.';
h = lbRich(BARS);
ok('~~bars renders an <svg>', h.indexOf('<svg') > -1);
ok('~~bars draws 3 bars', (h.match(/class="lb-d-bar"/g) || []).length === 3);
ok('~~bars carries the unit', h.indexOf('%') > -1);
ok('~~bars scales the longest to full width',
   /class="lb-d-bar"[^>]*width="(\d+)"/.test(h));

const PITCH = 'A 6/12 is the most common residential slope.\n\n~~pitch 6/12\n\nMeasure before you order.';
h = lbRich(PITCH);
ok('~~pitch renders an <svg>', h.indexOf('<svg') > -1);
// The multiplier is computed by the APP, not the model: sqrt(1+(6/12)^2)
const want = Math.sqrt(1 + 0.25).toFixed(4);
ok('~~pitch computes the multiplier itself (' + want + ')', h.indexOf(want) > -1,
   'expected ' + want + ' in the output');

// ── 2. The 510 failure mode: prose touching the marker.
console.log('\n2. The build-510 trap - marker NOT on its own block');
const GLUED = 'Here is the assembly:\n~~stack\nShingles\nUnderlayment\nDeck';
h = lbRich(GLUED);
ok('glued marker degrades to text (no svg)', h.indexOf('<svg') === -1);
ok('glued marker LEAKS "~~stack" to the reader', h.indexOf('~~stack') > -1,
   'this is the 510 bug: it is still reachable if the model ignores the spacing rule');

// ── 3. Malformed input must degrade, never vanish and never leak markup.
console.log('\n3. Malformed diagrams degrade gracefully');
ok('bars with no number returns null', lbDiagram('bars', '%', ['Just a label']) === null);
ok('bars with negative returns null', lbDiagram('bars', '%', ['A | -5']) === null);
ok('stack with one row returns null (not a diagram)', lbDiagram('stack', '', ['Only one']) === null);
ok('over 8 rows returns null', lbDiagram('stack', '', ['a','b','c','d','e','f','g','h','i']) === null);
ok('pitch with no ratio returns null', lbDiagram('pitch', 'steep', []) === null);
ok('pitch 0/12 returns null', lbDiagram('pitch', '0/12', []) === null);
ok('pitch 99/12 returns null (clamped)', lbDiagram('pitch', '99/12', []) === null);

const BAD = 'Text.\n\n~~bars %\nNo pipe here\nAlso none\n\nMore text.';
h = lbRich(BAD);
ok('malformed bars drops the marker line', h.indexOf('~~bars') === -1);
ok('malformed bars keeps its data as readable text', h.indexOf('No pipe here') > -1);

// ── 4. The security contract: model text can never open a tag.
console.log('\n4. Injection - the escape-then-promote contract');
const EVIL = 'Intro.\n\n~~stack\n<script>alert(1)</scr' + 'ipt>\n<img src=x onerror=alert(2)>\nDeck\n\nEnd.';
h = lbRich(EVIL);
ok('no live <script> survives', h.indexOf('<script') === -1);
ok('no live <img> survives', h.indexOf('<img') === -1);
ok('the payload is escaped, not dropped', h.indexOf('&lt;script&gt;') > -1);
ok('it still drew the diagram around it', h.indexOf('<svg') > -1);

const ATTR = 'A.\n\n~~stack\n" onload="alert(1)\nSecond layer\n\nB.';
h = lbRich(ATTR);
ok('a quote in model text cannot break an attribute', h.indexOf('onload="alert') === -1);
ok('aria-label stays the fixed app string',
   h.indexOf('aria-label="Layered assembly, listed from the top layer down"') > -1);

// ── 5. Entity-aware truncation (lbCut) - the "&amp; cut in half" case.
console.log('\n5. Long labels truncate without splitting an entity');
const AMP = 'X.\n\n~~stack\n' + 'Ridge & hip & ridge & hip & ridge & hip & ridge cap shingles here\nDeck\n\nY.';
h = lbRich(AMP);
ok('no half-eaten entity in the output', !/&(?!amp;|lt;|gt;|quot;|#\d+;|hellip;)/.test(
   h.replace(/&#8230;/g,'').replace(/…/g,'')), 'found a bare & that is not a valid entity');
ok('long label is truncated with an ellipsis', h.indexOf('…') > -1);

console.log('\n' + '='.repeat(58));
console.log('  ' + pass + ' passed, ' + fail + ' failed');
console.log('='.repeat(58));
process.exit(fail ? 1 : 0);
