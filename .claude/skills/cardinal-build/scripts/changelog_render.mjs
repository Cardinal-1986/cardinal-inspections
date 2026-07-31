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

let broken = 0;
for (const e of arr.slice(0, 9)) {
  const note = String(e.note || '');
  /* the emoji slot is whatever precedes the first space */
  const head = note.split(' ')[0];
  const cps = [...head].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase());
  /* An emoji need NOT be astral - "⚡" is a valid BMP lightning bolt and my
     first rule wrongly called it broken. The real signature of the ὍA bug
     is TWO codepoints in the slot: a stray letter followed by the leftover hex
     digit. So: one codepoint, and it is a symbol rather than a letter. */
  const cp = head.codePointAt(0);
  const ok = [...head].length === 1 && cp >= 0x2000 && !/\p{L}|\p{N}/u.test(head);
  if (!ok) broken++;
  console.log('  build ' + String(e.build).padEnd(4) +
    (ok ? '  ok  ' : ' BAD  ') + JSON.stringify(head).padEnd(12) +
    ' ' + cps.join(' '));
  console.log('        ' + note.slice(0, 78) + (note.length > 78 ? '…' : ''));
}
console.log('\n' + (broken ? broken + ' note(s) show a stray character instead of a picture'
                           : 'every recent note leads with a real emoji'));
process.exit(broken ? 1 : 0);
