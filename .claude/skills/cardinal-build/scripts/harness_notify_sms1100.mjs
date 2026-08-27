/* Build 1100 harness — Twilio Messaging Service SID preference in api/notify.js.
 * Extracts the SHIPPED sender-selection block and executes it in both configs:
 *   - Messaging Service configured  -> MessagingServiceSid used, no From
 *   - only TWILIO_FROM configured    -> From used, no MessagingServiceSid (unchanged)
 * Also checks the gate + capability report widened to (msgSvc || from).
 *
 *   node harness_notify_sms1100.mjs [api/notify.js]
 *
 * Negative control: point it at the pre-1100 notify.js — the block extraction
 * fails (RED, no crash), because the old code inlined `From: twFrom`.
 */
import fs from 'fs';
const path = process.argv[2] || 'api/notify.js';
const src = fs.readFileSync(path, 'utf8');
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };
const guard = (name, fn) => { try { fn(); } catch (e) { console.log('  FAIL ' + name + ' threw: ' + e.message); fails++; } };

/* pull the exact three shipped lines that build the request params */
function block(){
  const a = src.indexOf('var params = { To: to, Body: smsBody };');
  const b = src.indexOf('var form = new URLSearchParams(params).toString();');
  if (a === -1 || b === -1) throw new Error('sender-selection block not found (pre-1100 code?)');
  return src.slice(a, b + 'var form = new URLSearchParams(params).toString();'.length);
}

/* execute the shipped lines with bound inputs; return the encoded form string */
function run(cfg){
  const fn = new Function('to', 'smsBody', 'twMsgSvc', 'twFrom',
    block() + '\nreturn form;');
  return fn('+19375550148', 'Cardinal Roofing: test', cfg.twMsgSvc, cfg.twFrom);
}

guard('sender selection — Messaging Service preferred', function(){
  const form = run({ twMsgSvc: 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', twFrom: '+19370000000' });
  ok(/(^|&)MessagingServiceSid=MG/.test(form), 'MessagingServiceSid is sent when the service is configured');
  ok(!/(^|&)From=/.test(form), 'the bare From is NOT sent alongside the Messaging Service');
  ok(/To=%2B19375550148/.test(form), 'To is still the E.164 recipient');
});

guard('sender selection — falls back to From', function(){
  const form = run({ twMsgSvc: undefined, twFrom: '+19375551234' });
  ok(/(^|&)From=%2B19375551234/.test(form), 'From is used when no Messaging Service is set (behaviour unchanged)');
  ok(!/MessagingServiceSid=/.test(form), 'no MessagingServiceSid leaks in the fallback path');
});

/* ── 1106: ONE source. The 1100/1102 contract ("every site is widened the same
   way") was the best available while four readers each did their own
   process.env lookup — but the reason a site could drift is that a site could
   EXIST. 1106 removes the class instead of policing it: the config is read and
   trimmed once, and every reader consumes that one answer. The assertions below
   are the stronger form of the same contract, and they still go red on the 1100
   regression they were written for. ── */
const envReads = src.split('\n').filter(l => /process\.env\.TWILIO_/.test(l));
ok(envReads.length === 2, 'process.env.TWILIO_* is read on exactly 2 lines, not scattered (found ' + envReads.length + ')');
ok(envReads.every(l => /Raw\s*=/.test(l)), 'both reads land in *Raw vars, so nothing consumes an untrimmed value');
ok(/var twSid = String\(twSidRaw \|\| ''\)\.trim\(\), twTok = String\(twTokRaw \|\| ''\)\.trim\(\);/.test(src),
   'SID and auth token are TRIMMED (a pasted newline is what 20003 looked like)');
ok(/var twMsgSvc = String\(twMsgSvcRaw \|\| ''\)\.trim\(\), twFrom = String\(twFromRaw \|\| ''\)\.trim\(\);/.test(src),
   'the Messaging Service SID and From number are trimmed too');
ok(/var twReady = !!\(twSid && twTok && \(twMsgSvc \|\| twFrom\)\);/.test(src),
   'twReady is the single computed answer, and still accepts a Messaging Service OR a From');
ok(/if\(twReady && text\)\{/.test(src), 'the send gate reads that one answer');
/* THE fix, stated as a contract rather than as "we call .trim()": an untrimmed
   value may be DESCRIBED (twShape reports the stray whitespace) and must never be
   USED. If a *Raw var ever reaches the URL, the auth header or the gate, the
   newline is back and 20003 with it. */
const rawUses = src.split('\n')
  .map((l, i) => ({ n: i + 1, l }))
  .filter(o => /tw(Sid|Tok|MsgSvc|From)Raw/.test(o.l))
  .filter(o => !/^\s*var tw\w+Raw =/.test(o.l) && !/^\s*var tw\w+ = String\(/.test(o.l));
ok(rawUses.every(o => /twShape\(/.test(o.l)),
   'an untrimmed value is only ever DESCRIBED by twShape, never used (offenders: ' +
   rawUses.filter(o => !/twShape\(/.test(o.l)).map(o => 'line ' + o.n).join(', ') + ')');
ok(/Buffer\.from\(twSid \+ ':' \+ twTok\)/.test(src),
   'the Basic auth header is built from the TRIMMED pair');
ok(/encodeURIComponent\(twSid\)/.test(src), 'the Messages URL uses the TRIMMED account SID');
/* the SAME contract as 1102, now checked against the one source: no sms report
   may compute its own idea of whether SMS is configured. */
const smsSites = src.split('\n').filter(l => /\bsms\s*:/.test(l));
ok(smsSites.length >= 3, 'every sms capability report is accounted for (found ' + smsSites.length + ', floor 3)');
ok(smsSites.every(l => /\bsms\s*:\s*twReady\b/.test(l)),
   'EVERY sms capability report is twReady itself — none recomputes, so none can drift');
ok(/sms_error: smsErr \|\| undefined/.test(src),
   'the response names an SMS error of its own instead of burying it in the shared detail field');
ok(src.indexOf('module.exports') === -1, 'stays ESM (no module.exports — CI would fail otherwise)');

/* ── 1103: the phone lookup must run as the SIGNED-IN CALLER, and never fail silently ── */
ok(/user\._token = token;/.test(src), 'requireSession hands the caller token back to the handler');
ok(/const _caller = await requireSession\(req, res\);/.test(src), 'the handler captures the caller');
ok(/var _tok = \(_caller && _caller\._token\) \? _caller\._token : SUPA_KEY;/.test(src),
   'the team_profiles lookup uses the caller token (RLS sees authenticated staff, not anon)');
ok(/Authorization: 'Bearer ' \+ _tok \}/.test(src), 'that token is what the lookup actually sends');
ok(/smsErr = 'team directory lookup failed: '/.test(src),
   'a refused/errored lookup is REPORTED, not swallowed as "no phones"');
ok(/smsErr = 'no Team Directory row was readable/.test(src),
   'an EMPTY lookup (the RLS symptom) is reported instead of blaming the user');
/* the silent path this replaced must be gone */
ok(!/var phones = Array\.isArray\(profs\)/.test(src),
   'the old silent Array.isArray fall-through is gone');

/* ── 1102: the in-app test button must report the OUTCOME, not a capability guess ── */
try {
  const idx = fs.readFileSync(new URL('../../../../index.html', import.meta.url), 'utf8');
  /* ASCII-only anchors on purpose: index.html stores non-ASCII as \u escapes
     (✅, —), so an anchor typed with a literal em-dash or emoji matches
     nothing. That mismatch failed this very check against correct code. */
  const i = idx.indexOf("1102: report the OUTCOME first");
  const blk = i === -1 ? '' : idx.slice(i, i + 900);
  ok(blk !== '', 'the test-alert text branch carries its 1102 note');
  ok(/if\(\(j\.texted \|\| 0\) > 0\) lines\.push\('\\u2705 Text sent'\);/.test(blk),
     'a REAL send is reported first — a stale capability flag can no longer mask it');
  ok(blk.indexOf("else if(j.sms_error)") !== -1, 'a real SMS error is named, not guessed at');
  ok(blk.indexOf("j.texted") < blk.indexOf("!env.sms"), 'outcome is checked BEFORE the capability hint');
} catch (e) { ok(false, 'index.html client report check threw: ' + e.message); }

/* ── 1106: EXECUTE the shipped twShape() against the paste faults we actually hit.
   A regex proving the function exists proves nothing about what it says — and
   what it says is the whole feature, because Theo reads it off a phone. ── */
guard('twShape — executed against real paste faults', function(){
  const a = src.indexOf('function twShape(');
  if (a === -1) throw new Error('twShape not found (pre-1106 code?)');
  const b = src.indexOf('\nexport default async function handler', a);
  if (b === -1) throw new Error('could not bound twShape');
  const twShape = new Function(src.slice(a, b) + '\nreturn twShape;')();

  const GOOD_SID = 'AC' + 'f'.repeat(32);                      /* 34 chars, AC prefix */
  const SECRET   = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';         /* 32 chars, a real token's shape */

  ok(twShape(GOOD_SID, 'AC', 34) === 'looks right', 'a well-formed Account SID reads "looks right"');
  ok(twShape(SECRET, '', 32) === 'looks right', 'a well-formed auth token reads "looks right"');
  ok(twShape(undefined, 'AC', 34) === 'not set', 'an unset variable says "not set", not "looks right"');
  ok(twShape('', 'AC', 34) === 'not set', 'an empty string is "not set" too');

  /* THE BUG THIS BUILD EXISTS FOR: a value that is correct but pasted with a newline. */
  ok(/stray whitespace/.test(twShape(SECRET + '\n', '', 32)),
     'a trailing newline on the auth token is NAMED — the invisible 20003');
  ok(/stray whitespace/.test(twShape(' ' + GOOD_SID + ' ', 'AC', 34)),
     'surrounding spaces on the SID are named too');

  /* the other faults that produce the same 20003 */
  ok(/starts "MG"/.test(twShape('MG' + 'f'.repeat(32), 'AC', 34)),
     'a Messaging Service SID pasted into TWILIO_ACCOUNT_SID is named by prefix');
  ok(/starts "SK"/.test(twShape('SK' + 'f'.repeat(32), 'AC', 34)),
     'an API key SID in TWILIO_ACCOUNT_SID is named by prefix');
  ok(/16 chars, expected 32/.test(twShape(SECRET.slice(0, 16), '', 32)),
     'a half-pasted token reports its real length');

  /* ── the security contract: this string is printed on a phone screen and may
     end up in a screenshot. It must never carry the secret. ── */
  const tokenOut = [twShape(SECRET, '', 32), twShape(SECRET + '\n', '', 32),
                    twShape(SECRET.slice(0, 16), '', 32)].join(' | ');
  let leak = null;
  for (let i = 0; i + 4 <= SECRET.length; i++) {
    const run = SECRET.slice(i, i + 4);
    if (tokenOut.indexOf(run) !== -1) { leak = run; break; }
  }
  ok(leak === null, 'twShape NEVER echoes the auth token (no 4-char run leaked' + (leak ? ', found "' + leak + '"' : '') + ')');

  /* the SID branch may print the 2-letter TYPE marker (AC/MG/SK are public), and
     nothing more of the value. */
  const sidOut = twShape('MG' + 'abcdef01234567890123456789012345', 'AC', 34);
  ok(sidOut.indexOf('abcd') === -1, 'the SID report prints the type prefix only, never the body of the value');
});

/* the 20003 message carries both shapes */
ok(/smsErr = 'Twilio rejected the credentials \(20003\)\. Account SID: ' \+\s*\n?\s*twShape\(twSidRaw, 'AC', 34\)/.test(src),
   'the 20003 message reports the Account SID shape');
ok(/twShape\(twTokRaw, '', 32\)/.test(src), 'the 20003 message reports the auth token shape');

console.log(fails ? ('\nHARNESS RED — ' + fails + ' failure(s)') : '\nHARNESS GREEN — MSID preferred, From fallback intact, every capability site widened, report is outcome-first');
process.exit(fails ? 1 : 0);
