/* gate_1486 — every note wears its date and time.
   Theo, 23 Nov 2026: "When writing notes can you make a time and date stamp ?"

   Runs the SHIPPED code, sliced out of index.html, in a vm — not a re-implementation:
     S1  noteStamp() prints "Nov 23, 2026 · 4:12 PM" for a saved note time (America/New_York),
         includes the year for an old note, and returns '' for a missing or junk time (never "Invalid Date")
     S2  the job's Communications thread (the real renderChat) stamps each note with the date and time,
         and no note there says "ago" any more
     S3  the job list's preview pane (the real comms expression from renderLjPane) does the same
     S4  the punch card's discussion (the real threadHtml from cr-pp-script) does the same
     S5  timeAgo is untouched and still drives the activity feed (it is not a note)

   Arg: [index.html] -> negative control: main at 1485 must go RED, not crash. */
process.env.TZ = 'America/New_York';
import fs from 'fs';
import vm from 'vm';

const APP = process.argv[2] || 'index.html';
const S = fs.readFileSync(APP, 'utf8').replace(/\r\n/g, '\n');   // a Windows checkout (autocrlf) is CRLF
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + String(d).slice(0, 300) : '')); c ? pass++ : fail++; };
const done = () => { console.log(`\ngate_1486: ${pass} pass, ${fail} fail — ${fail ? 'RED' : 'GREEN'}`); process.exit(fail ? 1 : 0); };
console.log('gate_1486 on ' + APP + '  (TZ ' + process.env.TZ + ')');

function slice(from, to, incl = true, start = 0) {
  const i = S.indexOf(from, start); if (i < 0) throw new Error('anchor not found: ' + from.slice(0, 60));
  const j = S.indexOf(to, i + from.length); if (j < 0) throw new Error('end not found after: ' + from.slice(0, 60));
  return S.slice(i, incl ? j + to.length : j);
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// a note Curtis posted at 4:12 PM Eastern on 23 Nov 2026, and one from last year
const AT = '2026-11-23T21:12:00.000Z', OLD = '2025-03-04T14:05:00.000Z';
const WANT = 'Nov 23, 2026 · 4:12 PM', WANT_OLD = 'Mar 4, 2025 · 9:05 AM';
// sanity: the rig's clock really is Eastern, or every expectation below is meaningless
ok(new Date(AT).getHours() === 16, 'rig  the gate runs on Eastern time', new Date(AT).toString());

const ctx = { esc, console };
vm.createContext(ctx);
let haveStamp = false;
try {
  vm.runInContext(slice('function crDate(v){', '\n}\n'), ctx);
  vm.runInContext(slice('function timeAgo(iso){', '\n}\n'), ctx);
  try { vm.runInContext(slice('function noteStamp(iso){', '\n}\n'), ctx); haveStamp = true; }
  catch (e) { ok(false, 'S1  noteStamp() exists in the shipped file', e.message); }
} catch (e) { ok(false, 'extract crDate / timeAgo', e.message); done(); }

// S1
if (haveStamp) {
  ok(ctx.noteStamp(AT) === WANT, 'S1  a note saved at 21:12Z reads "' + WANT + '"', ctx.noteStamp(AT));
  ok(ctx.noteStamp(OLD) === WANT_OLD, 'S1  an old note carries its year: "' + WANT_OLD + '"', ctx.noteStamp(OLD));
  const blanks = [undefined, null, '', 'not a date'].map(v => ctx.noteStamp(v));
  ok(blanks.every(v => v === ''), 'S1  a missing or junk time prints nothing (never "Invalid Date")', JSON.stringify(blanks));
}

// S2 — the real renderChat
try {
  const chatSrc = slice('function fmtChatText(t){', '\n}\n') + '\n' + slice('var __chatSig = \'\';', '\nasync function sendChat(){', false);
  const thread = { innerHTML: '', scrollHeight: 0, scrollTop: 0, clientHeight: 0 };
  Object.assign(ctx, {
    currentProject: { id: 'p1' }, TEAM: true, currentUser: { email: 'theo@cardinalrenovations.net' },
    commsMessages: () => [
      { by: 'curtis@cardinalrenovations.net', name: 'Curtis', at: AT, text: 'Tarped the back slope @theo' },
      { by: 'theo@cardinalrenovations.net', name: 'Theo', at: OLD, text: 'Old note' },
    ],
    commsClaimNotes: () => [],
    document: { getElementById: id => (id === 'chatThread' ? thread : null) },
  });
  vm.runInContext(chatSrc, ctx);
  vm.runInContext('renderChat()', ctx);
  const h = thread.innerHTML;
  ok(h.includes('<span class="when">' + WANT + '</span>'), 'S2  the job thread stamps the note "' + WANT + '"', h.slice(0, 300));
  ok(h.includes('<span class="when">' + WANT_OLD + '</span>'), 'S2  the job thread stamps last year\'s note with its year', h.slice(0, 300));
  ok(!/<span class="when">[^<]*ago<\/span>/.test(h), 'S2  no note in the job thread says "ago"', (h.match(/<span class="when">[^<]*<\/span>/g) || []).join(' '));
} catch (e) { ok(false, 'S2  the job thread stamps each note', e.message); }

// S3 — the job list's preview pane, its real comms expression
try {
  const body = slice('  var msgs = commsMessages(p);\n  var comms = \'<div class="ljcomms">\'', '\n  var mapInner', false, S.indexOf('function renderLjPane(){'));
  vm.runInContext('function __lj(p){\n' + body + '\nreturn comms;\n}', ctx);
  const h = vm.runInContext('__lj({ id: "p1" })', ctx);
  ok(h.includes('<span class="when">' + WANT + '</span>'), 'S3  the job list preview stamps the note "' + WANT + '"', h.slice(0, 300));
  ok(!/<span class="when">[^<]*ago<\/span>/.test(h), 'S3  no note in the job list preview says "ago"', (h.match(/<span class="when">[^<]*<\/span>/g) || []).join(' '));
} catch (e) { ok(false, 'S3  the job list preview stamps each note', e.message); }

// S4 — the punch card discussion, its real threadHtml + when from cr-pp-script
try {
  const pp = S.indexOf('<script id="cr-pp-script">'); if (pp < 0) throw new Error('cr-pp-script not found');
  const ppCtx = { esc, noteStamp: haveStamp ? ctx.noteStamp : undefined, myEmail: () => 'theo@cardinalrenovations.net' };
  if (!haveStamp) delete ppCtx.noteStamp;
  vm.createContext(ppCtx);
  vm.runInContext(slice('function when(iso){', '\n}\n', true, pp) + '\n' + slice('function threadHtml(it){', '\nreturn out;\n}', true, pp), ppCtx);
  const h = vm.runInContext('threadHtml({ comments: [{ by: "curtis@cardinalrenovations.net", name: "Curtis", at: "' + AT + '", text: "Soft decking at the gable" }] })', ppCtx);
  ok(h.includes('<div class="pp-when">' + WANT + '</div>'), 'S4  the punch card stamps the note "' + WANT + '"', (h.match(/<div class="pp-when">[^<]*<\/div>/g) || []).join(' '));
  const added = vm.runInContext('when("' + AT + '")', ppCtx);
  ok(added === 'Nov 23', 'S4  the punch card\'s own "added" date is unchanged (date only)', added);
} catch (e) { ok(false, 'S4  the punch card stamps each note', e.message); }

// S5 — timeAgo stays for the feeds
try {
  const recent = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  ok(ctx.timeAgo(recent) === '3h ago', 'S5  timeAgo is unchanged ("3h ago")', ctx.timeAgo(recent));
  const feed = S.slice(S.indexOf('function buildActivityEvents(){'));
  ok(/'<span class="tm">' \+ timeAgo\(x\.t\)/.test(feed), 'S5  the activity feed still reads timeAgo');
} catch (e) { ok(false, 'S5  timeAgo is unchanged', e.message); }

done();
