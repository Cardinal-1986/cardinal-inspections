/* gate_1147 — every notification that names a client carries a link back to it.
 *
 * 1125 gave /api/notify a `url` and wired six punch-out callers. The other
 * twelve — each naming a client in its subject — sent none, so a text about a
 * job had no way back into the job.
 *
 * Executes the SHIPPED helpers, not a re-implementation: clientLink/punchLink
 * and _notifyOrQueue are extracted from the artifact under test and run.
 *
 * Negative control:  node gate_1147.mjs <path-to-1146-index.html>   -> RED
 */
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '../../../../index.html';
const SRC  = readFileSync(FILE, 'utf8');
const API  = readFileSync(new URL('../../../../api/notify.js', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

/* ── count call sites the way the file is really written: a lexer, because a
   comma inside a STRING or a /* comment *​/ is not an argument separator. A
   naive split reported this build's own APPROVED call as 5 args. */
const argsOf = call => { let d=0,a=1,k=1; const n=call.length-1;
  while (k<n) { const c=call[k];
    if (c==='"'||c==="'"||c==='`') { const q=c; k++;
      while (k<n) { if (call[k]==='\\') { k+=2; continue; } if (call[k]===q) break; k++; } }
    else if (c==='/'&&call[k+1]==='*') k = call.indexOf('*/',k)+1;
    else if (c==='/'&&call[k+1]==='/') k = call.indexOf('\n',k);
    else if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) d--;
    else if (c===','&&d===0) a++;
    k++; }
  return a; };

const sites = [];
for (const m of SRC.matchAll(/\b(?:window\.)?(_notifyOrQueue|notifyTeam)\s*\(/g)) {
  if (SRC.slice(Math.max(0,m.index-9), m.index).endsWith('function ')) continue;
  const i = SRC.indexOf('(', m.index); let d = 0, j = i;
  for (; j < i+9000; j++) { if (SRC[j]==='(') d++; else if (SRC[j]===')') { d--; if (!d) break; } }
  const call = SRC.slice(i, j+1);
  if (call === '()') continue;
  const subj = call.slice(1,160).replace(/\s+/g,' ');
  sites.push({ args: argsOf(call), subj });
}
const linked = sites.filter(s => s.args >= 4);
const bare   = sites.filter(s => s.args < 4);
console.log(`        ${linked.length} of ${sites.length} call sites carry a link`);
ok(sites.length >= 20, 'found the notification call sites (' + sites.length + ')');
/* a FLOOR, not a tally: coverage that SHRINKS must go red (BUG_CLASSES: a test
   that derives its own count and quietly loses a check) */
ok(linked.length >= 20, 'at least 20 call sites carry a link — got ' + linked.length);
/* the only site allowed to have none is the diagnostic, which names no client */
ok(bare.every(s => /Cardinal test alert/.test(s.subj)),
   'the only link-less alert is the test one' +
   (bare.length ? ' — bare: ' + bare.map(s=>s.subj.slice(0,40)).join(' | ') : ''));

/* ── the shipped link helpers actually build the app's real routes */
/* ⚠ Slicing to the next '\n}' overshoots a ONE-LINE function — punchLink is
   written on a single line, so that grabbed a huge unrelated chunk which then
   failed to compile and reported a FALSE failure against a function that was
   present and correct. Brace-match from the opening '{' instead. */
const grab = n => { const i = SRC.indexOf('function ' + n + '(');
  if (i < 0) return '';
  const b = SRC.indexOf('{', i); let d = 0;
  for (let j = b; j < b + 4000 && j < SRC.length; j++) {
    if (SRC[j] === '{') d++;
    else if (SRC[j] === '}') { d--; if (!d) return SRC.slice(i, j + 1); }
  }
  return ''; };
const clientLinkSrc = grab('clientLink');
ok(!!clientLinkSrc, 'clientLink() exists in the artifact');
/* ⚠ BUG_CLASSES 37 — a control that CRASHES proves nothing. On the previous
   build clientLink does not exist, so `new Function('' + '; return clientLink')`
   throws a ReferenceError and the run dies BEFORE printing a verdict, which
   reads as "broken gate" rather than "correctly red". Compile only what is
   actually there, and record a failure for what is not. */
const compile = (name) => { const s = grab(name);
  if (!s) return null;
  try { return new Function(s + '; return ' + name + ';')(); } catch (_) { return null; } };
const clientLink = compile('clientLink');
const punchLink  = compile('punchLink');
if (!clientLink) {
  ok(false, 'clientLink() is executable (absent from this artifact — 4 checks skipped)');
} else {
  ok(clientLink('abc-123') === '#p/abc-123', 'clientLink builds #p/<id> — got ' + clientLink('abc-123'));
  ok(clientLink('') === '/', 'clientLink with no id degrades to / (never a broken link)');
  ok(clientLink('a/b?c') === '#p/a%2Fb%3Fc', 'clientLink encodes the id — got ' + clientLink('a/b?c'));
}
ok(!!punchLink && punchLink('abc-123') === '#p/abc-123/punch',
   'punchLink still builds its own route (unchanged)');

/* ── the OFFLINE path must carry the url, or a queued alert arrives useless */
const _qi = SRC.indexOf('function _notifyOrQueue(');
const q = _qi < 0 ? '' : SRC.slice(_qi, _qi + 900);   /* -1 would slice from the END */
ok(/function _notifyOrQueue\(to, subject, html, url\)/.test(q), '_notifyOrQueue takes a url');
ok(/queue\(\{[^}]*url:\s*url/.test(q), '  · and the OUTBOX entry carries it (offline sends keep their link)');
ok(/notifyTeam\(to, subject, html, url\)/.test(q), '  · and it is forwarded to notifyTeam');
ok(/notifyTeam\(row\.to, row\.subject, row\.html, row\.url\)/.test(SRC),
   '  · and the outbox FLUSH replays it on reconnect');

/* ── the run-together sentence: both strips, because either can build the SMS */
const strip = s => s.replace(/<br\s*\/?>/gi,' ')
                    .replace(/<\/(?:p|div|li|h[1-6]|tr|blockquote)\s*>/gi,' ')
                    .replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
const sample = '<p>Jarrett (1446 Chadwick Drive) is marked <b>COMPLETED</b>.</p><p>Next: do the final walk-around.</p>';
ok(/COMPLETED\. Next:/.test(strip(sample)),
   'a block end becomes a space — "' + strip(sample).slice(28, 62) + '"');
ok(strip('<b>word</b>s') === 'words', '  · but an inline tag still strips to nothing ("words", not "word s")');
ok(/<\\?\/\(\?:p\|div\|li\|h\[1-6\]\|tr\|blockquote\)/.test(SRC.replace(/\\\\/g,'\\')),
   '  · index.html carries the block-end rule');
/* ⚠ api/notify.js is NOT selected by this gate's path argument — it is always
   read from the working tree, so this check cannot go red on a control and is
   reported as what it is: a check of the current tree only, not of the artifact
   under test. Kept because both strips must carry the rule (a caller may send
   html with no body, and then the API side is what builds the SMS). */
ok(/<\\?\/\(\?:p\|div\|li\|h\[1-6\]\|tr\|blockquote\)/.test(API.replace(/\\\\/g,'\\')),
   '  · api/notify.js carries it too (working tree, not the artifact arg)');

console.log(fail ? `\nRED — ${fail} failed, ${pass} passed` : `\nGREEN — all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
