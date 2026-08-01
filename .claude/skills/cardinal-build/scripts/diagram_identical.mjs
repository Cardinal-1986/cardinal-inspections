/* 512 extracted the diagram instructions into a const. Prove the STRING is
 * unchanged - otherwise the extraction quietly undid the 510 spacing fix.
 *
 * Evaluates the real text out of both files and compares byte for byte.
 */
import fs from 'fs';
import vm from 'vm';

const SP = 'C:/Users/kpkor/AppData/Local/Temp/claude/C--Users-kpkor-OneDrive-Desktop-Claude-Code/842cd875-d9a4-4c1f-9fe9-51efb0ba11f0/scratchpad';
const norm = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const before = norm(SP + '/librarian_511.js');
const after = norm('C:/Users/kpkor/OneDrive/Desktop/cardinal-push/api/librarian.js');

/* BEFORE: the block sat inline, ending with " +" */
const bStart = before.indexOf("'You may add ONE simple diagram");
const bMark = before.indexOf("'nothing genuinely benefits from a picture, do not add one.");
const bEnd = before.indexOf('\n', bMark);
const bText = vm.runInNewContext(before.slice(bStart, bEnd).replace(/\s*\+\s*$/, ''));

/* AFTER: the same text is a named const */
const aStart = after.indexOf('const DIAGRAM =');
const aEnd = after.indexOf(";\n", after.indexOf('do not add one.', aStart));
const aText = vm.runInNewContext(after.slice(aStart + 'const DIAGRAM ='.length, aEnd));

console.log('inline block (511) : ' + bText.length + ' chars');
console.log('const DIAGRAM (512): ' + aText.length + ' chars');

if (aText === bText) {
  console.log('\nIDENTICAL — the 510 spacing fix survived the extraction.');
} else {
  console.log('\n*** THE TEXT CHANGED ***');
  for (let i = 0; i < Math.max(aText.length, bText.length); i++) {
    if (aText[i] !== bText[i]) {
      console.log('first difference at ' + i);
      console.log('  511: ' + JSON.stringify(bText.slice(i - 40, i + 40)));
      console.log('  512: ' + JSON.stringify(aText.slice(i - 40, i + 40)));
      break;
    }
  }
  process.exit(1);
}

/* and the 510 fix itself must still be in there */
const rule = aText.includes('A marker must be the FIRST line of its own block');
const spaced = aText.includes('\n~~stack\n') && aText.includes('\n~~bars %\n');
console.log('510 rule present   : ' + rule);
console.log('510 spacing present: ' + spaced);
process.exit(rule && spaced ? 0 : 1);
