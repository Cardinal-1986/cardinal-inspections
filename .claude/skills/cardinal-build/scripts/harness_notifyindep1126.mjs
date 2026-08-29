/* harness_notifyindep1126.mjs — Build 1126: the three notification channels are
   genuinely independent.

   Theo, after 1125 shipped the punch-out deep link: the link rides in the SMS,
   and the SMS rode on a route that returned 500 and sent NOTHING — no push, no
   email, no text — if `web-push` failed to import or VAPID_PRIVATE_KEY was
   unset. api/notify.js has carried the comment "each channel is independent, so
   a dead one never blocks the others" since 874. It was true of email vs SMS and
   false of push vs both.

   THREE abort points did it, and the third is the one nobody would guess:
     1. the web-push import throwing            -> res.500 + return
     2. VAPID_PRIVATE_KEY unset                 -> res.500 + return
     3. the push_subs QUERY returning non-array -> res.200 + return
   Each one cancelled the email and the text on its way out.

   This drives the SHIPPED handler with fetch stubbed and asserts on the ACTUAL
   outbound requests — Resend's POST and Twilio's form body — because "the route
   returned ok:true" is not the same claim as "a text was sent".

   ⚠ VAPID_PRIVATE is a module-level const read at import time, so each case
   re-imports the module with a cache-busting query. Setting the env after the
   import proves nothing.

   Negative control: point it at the pre-1126 route -> RED, 12 of 19, and it
   reports red rather than crashing (BUG_CLASSES 37).
   ⚠ WRITE THE CONTROL FILE INSIDE THE REPO. Node resolves `web-push` by walking
   up from the FILE's own directory, so a control copied to /tmp cannot find it,
   dies in the import arm, and fails 17 of 19 — five of them for that reason and
   not for the behaviour under test. It looks like a stronger control and is a
   worthless one: on the honest control the three "all healthy" checks PASS,
   which is what proves this build regressed nothing.
   Usage: node harness_notifyindep1126.mjs [path/to/notify.js]
*/
import path from 'path';

const FILE = process.argv[2] || 'api/notify.js';
const ABS  = FILE.startsWith('/') ? FILE : path.resolve(process.cwd(), FILE);
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if (!c) fails++; };

const realFetch = globalThis.fetch;
let bust = 0;

/* Drive the shipped handler once. `opts.subsBroken` makes the push_subs query
   answer a PostgREST error object instead of an array. */
async function call(opts){
  const o = opts || {};
  const sent = [];
  globalThis.fetch = async function(url, init){
    const u = String(url); sent.push({ url:u, init:init || {} });
    if (u.indexOf('/auth/v1/user') !== -1)
      return { ok:true, json: async () => ({ email:'theo@cardinalrenovations.net' }) };
    if (u.indexOf('push_subs') !== -1)
      return { ok:true, json: async () => o.subsBroken
        ? { message:'permission denied for table push_subs' }
        : [{ email:'curtis@cardinalrenovations.net', endpoint:'https://fcm/x', sub:{ endpoint:'https://fcm/x' } }] };
    if (u.indexOf('team_profiles') !== -1)
      return { ok:true, json: async () => [{ email:'curtis@cardinalrenovations.net', phone:'937-555-0142' }] };
    if (u.indexOf('api.resend.com') !== -1) return { ok:true, text: async () => '', json: async () => ({ id:'e1' }) };
    if (u.indexOf('api.twilio.com') !== -1) return { ok:true, text: async () => '', json: async () => ({ sid:'SM1' }) };
    return { ok:true, json: async () => ({}), text: async () => '' };
  };

  /* env is read at MODULE SCOPE for VAPID — set it before importing */
  if (o.vapid === false) { delete process.env.VAPID_PRIVATE_KEY; delete process.env.VAPID_PRIVATE; }
  else { process.env.VAPID_PRIVATE_KEY = 'k'.repeat(43); }
  process.env.RESEND_API_KEY = o.resend === false ? '' : 're_test';
  if (o.resend === false) delete process.env.RESEND_API_KEY;
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN  = '0'.repeat(32);
  process.env.TWILIO_FROM        = '+19375550100';

  let handler, importErr = null;
  try { handler = (await import('file://' + ABS + '?v=' + (++bust))).default; }
  catch (e) { importErr = String((e && e.message) || e); }
  if (importErr) { globalThis.fetch = realFetch; return { importErr }; }

  let out = null, status = 200;
  const res = { status(s){ status = s; return this; }, json(v){ out = v; return this; } };
  try{
    await handler({ method:'POST', headers:{ authorization:'Bearer tok', host:'app.cardinalroster.com' },
      body: { emails:['curtis@cardinalrenovations.net'], title:'New punch-out',
              body:'Theo filed a punch-out at Jarrett Chenalt', url:'#p/abc-123/punch' } }, res);
  }catch(e){ out = { threw: String((e && e.message) || e) }; }
  globalThis.fetch = realFetch;

  const mail = sent.find(x => x.url.indexOf('api.resend.com') !== -1);
  const tw   = sent.find(x => x.url.indexOf('api.twilio.com') !== -1);
  return { out, status,
           mailed: !!mail,
           sms: tw ? new URLSearchParams(tw.init.body).get('Body') : null };
}

console.log('driving ' + FILE + '\n');

/* ── 1. push is UNCONFIGURED — the case that took the whole route down ─── */
const a = await call({ vapid:false });
if (a.importErr){ console.log('  ✗ FAIL could not import the route — ' + a.importErr);
  console.log('\nRED — route did not load'); process.exit(1); }
ok(a.status === 200, 'no VAPID key: the route answers 200, not a 500 that cancels everything (got ' + a.status + ')');
ok(a.mailed === true,  'NO VAPID KEY -> THE EMAIL STILL GOES OUT');
ok(a.sms != null,      'NO VAPID KEY -> THE TEXT STILL GOES OUT');
ok(!!(a.sms && a.sms.indexOf('https://app.cardinalroster.com/#p/abc-123/punch') !== -1),
   '  · and it still carries 1125’s punch-out link');
ok(a.out && a.out.reason === 'no_vapid_private',
   'the push failure is still NAMED, by the same reason string as before (' + (a.out && a.out.reason) + ')');
ok(!!(a.out && a.out.push_error),
   '  · and push_error says what a person must fix — ' + JSON.stringify(a.out && a.out.push_error));
ok(a.out && a.out.env && a.out.env.push === false,
   '  · env.push reports the channel as down, so "off" is distinguishable from "nobody subscribed"');
ok(a.out && a.out.ok === true, 'ok:true, because two of three channels really did deliver');

/* ── 2. the push_subs QUERY fails — the third, least obvious abort ─────── */
const b = await call({ subsBroken:true });
ok(b.mailed === true, 'BROKEN push_subs QUERY -> the email still goes out');
ok(b.sms != null,     'BROKEN push_subs QUERY -> the text still goes out');
ok(b.out && b.out.reason === 'subs_query_failed',
   '  · still reported as subs_query_failed (' + (b.out && b.out.reason) + ')');

/* ── 3. everything healthy: nothing regressed ─────────────────────────── */
const c = await call({});
ok(c.mailed === true, 'all healthy: email sent');
ok(c.sms != null,     'all healthy: text sent');
ok(c.out && c.out.subs === 1, '  · the subscription list is still read (subs=' + (c.out && c.out.subs) + ')');
ok(c.out && c.out.env && c.out.env.push === true, '  · env.push reports the channel up');
ok(!(c.out && c.out.push_error), '  · and no push_error is invented when nothing is wrong');

/* ── 4. email off, push off: the TEXT alone must still survive ─────────── */
const d = await call({ vapid:false, resend:false });
ok(d.sms != null, 'push AND email both down -> the text STILL goes out (full independence)');
ok(d.out && d.out.ok === true, '  · and the route reports ok, because a text is a delivery');

const FLOOR = 16;
ok(checks >= FLOOR, 'coverage floor: ' + checks + ' checks ran (>= ' + FLOOR + ')');
console.log(fails ? ('\nRED — ' + fails + ' of ' + checks + ' failed')
                  : ('\nGREEN — all ' + checks + ' Build 1126 assertions passed'));
process.exit(fails ? 1 : 0);
