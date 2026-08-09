/* Build 666 — the scope review only pre-ticks EMPTY fields.

   The old rule ticked anything that DIFFERED from what was stored, so an AI
   misreading of a human-verified field arrived pre-approved — which is exactly
   how (330) 636-5816 became 663-5816 on Adam Gunn's live claim. Theo's pick:
   an overwrite is opt-in; filling a blank stays one Apply.

   The shipped row-builder is EXECUTED, not asserted about: the `fields.map`
   lambda's logic is driven through the real source slice with Gunn's exact
   scenario — stored phone vs misread phone, empty O&L vs found figures.

   Usage: node harness_666.js [index.html]
   Point it at the previous build (665) as the negative control — it must go
   red: there the misread phone row comes back CHECKED. */
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* ── extract the SHIPPED row-builder: the fields.map(function(f, i){ … }) ── */
function rowBuilder() {
  const start = SRC.indexOf('var html = fields.map(function(f, i){');
  if (start === -1) return null;
  let d = 0, started = false, k = SRC.indexOf('function(f, i){', start);
  const fnStart = k;
  for (; k < SRC.length; k++) {
    if (SRC[k] === '{') { d++; started = true; }
    else if (SRC[k] === '}') { d--; if (started && d === 0) break; }
  }
  return SRC.slice(fnStart, k + 1);
}

(async function () {

const BUILDER = rowBuilder();
ok('the row-builder lambda was extracted from the artifact', !!BUILDER, BUILDER ? BUILDER.length : 0);

/* run it with the modal's own helpers stubbed to the shipped shapes */
function rowFor(label, path, extractedV, storedV) {
  const sandbox = {
    esc: (s) => String(s == null ? '' : s).replace(/[<>&"']/g,
      c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])),
    fmt: (v) => {
      if (v === null || v === undefined || v === '') return '';
      if (v === true) return 'Yes';
      if (v === false) return 'No';
      return String(v);
    },
    anyExtracted: false, String, Boolean,
  };
  const fn = new Function('sandbox', 'with(sandbox){ return (' + BUILDER + '); }')(sandbox);
  return fn([label, path, extractedV, storedV], 0);
}
const isTicked = (html) => /checked/.test(html);
const hasBox = (html) => /type="checkbox"/.test(html);

console.log('\n── THE BUILD: Gunn\'s exact scenario, row by row ──');
{
  /* the row that caused this build: correct stored phone, AI transposition */
  const phone = rowFor('Adjuster Phone', 'adjuster.phone', '(330) 663-5816', '(330) 636-5816');
  ok('a stored phone + a DIFFERING extraction comes UNTICKED (the build)',
    hasBox(phone) && !isTicked(phone), phone.slice(-120));
  ok('…but the disagreement is still SHOWN, not hidden',
    /was: \(330\) 636-5816/.test(phone) && /\(330\) 663-5816/.test(phone));
  const carrier = rowFor('Carrier', 'carrier', 'Allstate Vehicle and Property Insurance Company', 'Allstate');
  ok('a stored carrier + a longer extraction comes unticked too',
    hasBox(carrier) && !isTicked(carrier));
}
{
  /* empty fields stay one-Apply convenient */
  ok('an EMPTY field with an extraction still comes ticked',
    isTicked(rowFor('O&L RCV', 'ord_law_rcv', 1887.33, null)));
  ok('…including a boolean Yes into an empty tri-state',
    isTicked(rowFor('Ord. & Law', 'ord_law', true, null)));
  ok('…and an empty string counts as empty, not as a value',
    isTicked(rowFor('O&L Called', 'ord_law_basis', 'BC-Building Codes', '')));
}
{
  /* unchanged behaviors, asserted so they cannot silently move */
  ok('identical values stay unticked (as before this build)',
    !isTicked(rowFor('Claim Number', 'claim_number', '0802889162', '0802889162')));
  const nf = rowFor('Deductible', 'deductible', null, 1500);
  ok('"(not found)" rows still get NO checkbox at all',
    !hasBox(nf) && /\(not found\)/.test(nf));
  ok('a stored FALSE is a value, not an empty — a differing Yes comes unticked',
    !isTicked(rowFor('Ord. & Law', 'ord_law', true, false)));
}

console.log('\n── the notes row and the plumbing are untouched ──');
{
  ok('the notes-append row stays always-ticked (it appends, overwrites nothing)',
    SRC.includes('data-solpath="notes_append" data-solval="') &&
    /notes_append" data-solval="' \+\n?\s*esc\(extracted\.summary\) \+ '" checked>/.test(SRC));
  ok('the old differs-means-ticked expression is gone',
    !SRC.includes('var changed = hasNew && fmt(newV) !== fmt(oldV);'));
  ok('the new rule reads as what it means',
    SRC.includes('var tick = hasNew && !oldStr;'));
  ok('…and the comment names the phone number that caused it',
    /636-5816 became 663-5816/.test(SRC));
}

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 666 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 666; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:666,/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
