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

/* gate + capability report both widened to (msgSvc || from) */
ok(/if\(twSid && twTok && \(twMsgSvc \|\| twFrom\) && text\)\{/.test(src),
   'the send gate accepts a Messaging Service OR a From number');
ok(/var twMsgSvc = process\.env\.TWILIO_MESSAGING_SERVICE_SID;/.test(src),
   'twMsgSvc is read from TWILIO_MESSAGING_SERVICE_SID');
/* 1102 — THE ASSERTION THAT FAILED TO CATCH THE REAL BUG, replaced.
   It counted the two widened `process.env.*` reports and asserted exactly 2. That
   passed while a THIRD site (the success-path report the in-app test button actually
   reads, written with local vars `twSid && twTok && twFrom`) still demanded a bare
   From number — so an account on a Messaging Service was told "not set up yet" while
   the send gate was busy sending the text. A count is not a contract: assert the
   CONTRACT over EVERY site, so a site I did not know about cannot hide. */
const smsSites = src.split('\n').filter(l => /\bsms\s*:/.test(l) && /twSid|TWILIO_ACCOUNT_SID/.test(l));
ok(smsSites.length >= 3, 'every sms capability report is accounted for (found ' + smsSites.length + ', floor 3)');
ok(smsSites.every(l => /MESSAGING_SERVICE_SID|twMsgSvc/.test(l)),
   'EVERY sms capability report accepts a Messaging Service — none requires a bare From');
ok(/sms_error: smsErr \|\| undefined/.test(src),
   'the response names an SMS error of its own instead of burying it in the shared detail field');
ok(src.indexOf('module.exports') === -1, 'stays ESM (no module.exports — CI would fail otherwise)');

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

console.log(fails ? ('\nHARNESS RED — ' + fails + ' failure(s)') : '\nHARNESS GREEN — MSID preferred, From fallback intact, every capability site widened, report is outcome-first');
process.exit(fails ? 1 : 0);
