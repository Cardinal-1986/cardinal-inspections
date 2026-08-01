/* What does the What's New list ACTUALLY show?
 *
 * Not "does it parse" - the broken form parsed perfectly for six builds. This
 * evaluates the real CHANGELOG out of the shipped file and prints the first
 * characters of each recent note, which is where the emoji sits.
 */
import fs from 'fs';
import vm from 'vm';

const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const i = src.indexOf('CHANGELOG = [');
const j = src.indexOf('\n];', i);
if (i === -1 || j === -1) { console.log('CHANGELOG not found'); process.exit(2); }

const arr = vm.runInNewContext(src.slice(i + 'CHANGELOG = '.length, j + 2));
console.log(fs.realpathSync(file).split(/[\\/]/).pop() + ' — ' + arr.length + ' notes\n');

/* Check EVERY note, print only the recent ones. An earlier version checked just
   the first nine and therefore passed a file with five known-broken escapes
   further down — a gate that cannot see the bug it was written for. */
let broken = 0, shown = 0;
for (const e of arr) {
  const note = String(e.note || '');
  /* the emoji slot is whatever precedes the first space */
  const head = note.split(' ')[0];
  const cps = [...head].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase());
  /* Defining "emoji" has now been wrong twice in the STRICT direction, each
     time flagging a note that was perfectly fine:
       - "⚡" U+26A1 is BMP, so requiring an astral codepoint was wrong
       - "◻️" is U+25FB plus U+FE0F, a variation selector — a legitimate
         TWO-codepoint presentation sequence, so requiring one was wrong
     The actual bug signature is narrower than either: a LETTER left in the
     slot, which is what ὍA degrades to (U+1F4D is Greek, then "A").
     So: strip the joiners, then require what remains to carry no letter or
     digit at all. */
  const bare = head.replace(/[︎️‍]/g, '');
  /* And a note with NO emoji at all (build 487 opens with "The") is a style
     choice, not this bug. The degradation signature is specific: a non-ASCII
     character with an ASCII letter or digit fused onto it — which is exactly
     what \\u1F4DA collapses to, U+1F4D plus "A". Nothing else qualifies. */
  const ok = !(/[^\x00-\x7F]/.test(bare) && /[A-Za-z0-9]/.test(bare));
  if (!ok) broken++;
  /* every note is CHECKED; only the recent ones and every failure are PRINTED */
  if (ok && shown >= 9) continue;
  if (ok) shown++;
  console.log('  build ' + String(e.build).padEnd(4) +
    (ok ? '  ok  ' : ' BAD  ') + JSON.stringify(head).padEnd(12) +
    ' ' + cps.join(' '));
  console.log('        ' + note.slice(0, 78) + (note.length > 78 ? '…' : ''));
}
console.log('\n' + (broken ? broken + ' note(s) show a stray character instead of a picture'
                           : 'every recent note leads with a real emoji'));
process.exit(broken ? 1 : 0);
