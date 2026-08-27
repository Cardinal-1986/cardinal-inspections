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
ok((src.match(/process\.env\.TWILIO_MESSAGING_SERVICE_SID \|\| process\.env\.TWILIO_FROM/g) || []).length === 2,
   'both capability reports widened to (MESSAGING_SERVICE_SID || FROM)');
ok(src.indexOf('module.exports') === -1, 'stays ESM (no module.exports — CI would fail otherwise)');

console.log(fails ? ('\nHARNESS RED — ' + fails + ' failure(s)') : '\nHARNESS GREEN — MSID preferred, From fallback intact, gate + capability widened');
process.exit(fails ? 1 : 0);
