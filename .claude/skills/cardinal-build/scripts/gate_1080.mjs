/* Build 1080 gate — 289 browser dialogs became in-app cards, and none of them
 * may go missing.
 *
 * Executes the SHIPPED window.crTell, sliced out of the artifact, in three
 * worlds: the toast present, the toast ABSENT, and the toast THROWING. The
 * fallback is the whole point — a polish change must not turn a message you
 * could not miss into a message that silently vanishes.
 *
 * The discriminating source check is C1: `alert(` in CODE must be exactly 1,
 * and that 1 must be the router's own fallback. Counted with the project's
 * lexer, because a bare regex says 296 and six of those are prose.
 *
 * Optional path argument = negative control.
 */
import fs from 'fs';
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const HTML = fs.readFileSync(FILE, 'utf8');
console.log('gate_1080 on ' + FILE);

let fails = 0, passes = 0;
const ran = new Set();
function ok(name, cond, extra) {
  ran.add(name);
  if (cond) { passes++; console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}
async function step(name, fn) {
  try { await fn(); }
  catch (e) { ran.add(name); fails++; console.log('  FAIL  ' + name + ' section  → threw: ' + (e && e.message)); }
}
function braceSlice(head) {
  const i = HTML.indexOf(head);
  if (i === -1) return null;
  let depth = 0, k = HTML.indexOf('{', i);
  for (;; k++) {
    const c = HTML[k];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return HTML.slice(i, k + 1) + ';'; }
    if (k > HTML.length) return null;
  }
}
const TELL = braceSlice('window.crTell = function(msg, kind){');

const RIG = (mode) => `
window.__calls = [];
${mode === 'gone' ? '' : `
window.crToastOk  = function(m){ ${mode === 'throw' ? "throw new Error('boom');" : ''} window.__calls.push(['ok', m]); return 'OK'; };
window.crToastErr = function(m){ ${mode === 'throw' ? "throw new Error('boom');" : ''} window.__calls.push(['err', m]); return 'ERR'; };
`}
window.alert = function(m){ window.__calls.push(['alert', m]); };
${TELL || '/* crTell MISSING */'}
`;

(async () => {
const browser = await chromium.launch();

console.log('\n── A · it routes ──');
await step('A', async () => {
  ok('A0 crTell sliced', !!TELL, TELL ? TELL.length + ' chars' : 'not found');
  if (!TELL) { ['A1 a plain message is an error card','A2 an ok message is a success card',
                'A3 an empty message says nothing'].forEach(n => ok(n, false, 'no crTell')); return; }
  const p = await browser.newPage();
  await p.setContent('<!doctype html><html><body></body></html>');
  await p.addScriptTag({ content: RIG('normal') });
  const r = await p.evaluate(() => {
    window.__calls = [];
    window.crTell('Pick a client first.');
    window.crTell('Client deleted.', 'ok');
    window.crTell('');
    window.crTell(null);
    window.crTell('   ');
    return window.__calls;
  });
  ok('A1 a plain message is an error card',
     r.some(c => c[0] === 'err' && c[1] === 'Pick a client first.'), JSON.stringify(r));
  ok('A2 an ok message is a success card',
     r.some(c => c[0] === 'ok' && c[1] === 'Client deleted.'), JSON.stringify(r));
  ok('A3 an empty message says nothing', r.length === 2, JSON.stringify(r));
  await p.close();
});

console.log('\n── B · nothing may go missing ──');
await step('B', async () => {
  if (!TELL) { ['B1 with no toast at all it falls back to alert',
                'B2 with a toast that THROWS it falls back to alert'].forEach(n => ok(n, false, 'no crTell')); return; }
  for (const [mode, label] of [['gone', 'B1 with no toast at all it falls back to alert'],
                               ['throw', 'B2 with a toast that THROWS it falls back to alert']]) {
    const p = await browser.newPage();
    await p.setContent('<!doctype html><html><body></body></html>');
    await p.addScriptTag({ content: RIG(mode) });
    const r = await p.evaluate(() => {
      window.__calls = [];
      let threw = null;
      try { window.crTell('Could not save.'); } catch (e) { threw = String(e); }
      return { calls: window.__calls, threw };
    });
    ok(label, !r.threw && r.calls.some(c => c[0] === 'alert' && c[1] === 'Could not save.'),
       JSON.stringify(r));
  }
});

console.log('\n── C · the source, counted with the lexer ──');
await step('C', async () => {
  let code = null;
  try {
    const out = execFileSync('python3',
      ['/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/jslex_count.py', FILE, 'alert('],
      { encoding: 'utf8' });
    const m = out.match(/in CODE\s*:\s*(\d+)/);
    code = m ? parseInt(m[1], 10) : null;
  } catch (e) { /* reported below */ }
  ok('C0 the lexer ran', code !== null, 'could not count');
  ok('C1 exactly one alert( left in CODE', code === 1, 'in CODE: ' + code);
  ok('C2 the one that is left is the router\'s fallback',
     /try\{ alert\(text\); \}catch\(_a\)\{\}/.test(HTML));
  ok('C3 crTell is called where the alerts were',
     (HTML.match(/\bcrTell\(/g) || []).length >= 280,
     'crTell( sites: ' + (HTML.match(/\bcrTell\(/g) || []).length);
  ok('C4 the success messages carry ok',
     (HTML.match(/,\s*'ok'\s*\)/g) || []).length >= 6,
     "'ok' sites: " + (HTML.match(/,\s*'ok'\s*\)/g) || []).length);
  ok('C5 crToast itself is untouched — still one definition',
     (HTML.match(/function crToast\(msg, type\)\{/g) || []).length === 1);
  const defs = (HTML.match(/function\s+(?:crToast|toast)\s*\(/g) || []).length;
  ok('C6 no seventh toast was added', defs === 6, 'toast definitions: ' + defs);
});

await browser.close();

const FLOOR = ['A0','A1','A2','A3','B1','B2','C0','C1','C2','C3','C4','C5','C6'];
const missing = FLOOR.filter(n => ![...ran].some(r => r.startsWith(n + ' ')));
console.log('\n── floor ──');
if (missing.length) { fails += missing.length;
  console.log('  FAIL  ' + missing.length + ' check(s) never ran: ' + missing.join(', ')); }
else console.log('  PASS  all ' + FLOOR.length + ' checks executed');

console.log('\n' + (fails ? 'RED' : 'GREEN') + ' — ' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
})();
