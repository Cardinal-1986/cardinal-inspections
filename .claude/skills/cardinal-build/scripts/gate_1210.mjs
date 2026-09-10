/* gate_1210.mjs — Build 1210: the notification EMAIL carries the deep link.
 *
 *   node gate_1210.mjs [path/to/notify.js]     the build must be GREEN
 *   node gate_1210.mjs <the 1209 notify.js>    the control: RED
 *
 * Theo, 10 Sep: "When assigning a punch-out there used to be a hyperlink that
 * went out to the assignee." The client was never the problem —
 * audit_prod_notify.mjs proved it posts url:"#p/<id>/punch". The route built
 * absUrl and then read it in exactly ONE place, the SMS tail, so an alert read
 * in a mailbox had nothing to tap. This holds the email half.
 *
 * It drives the SHIPPED handler with fetch stubbed and asserts on the ACTUAL
 * Resend POST body, because "the route returned ok:true" is not the claim.
 *
 * ⚠ Deliberately does NOT depend on web-push. That module is absent in the
 * build container, so the push arm reports push_unavailable here and the
 * VAPID-specific reasons only appear in CI. Since 1126 the email runs
 * regardless of the push arm, which is exactly why this gate can be trusted in
 * both places. (harness_notifyindep1126 fails 5 of 19 in this container for
 * that reason, identically on 1209 and 1210 — a container artifact, not a
 * regression. Verified by running it against the control.)
 */
import path from 'path';

const FILE = process.argv[2] || 'api/notify.js';
const ABS  = FILE.startsWith('/') ? FILE : path.resolve(process.cwd(), FILE);
let fails = 0, checks = 0;
const ok = (c, m, x) => { checks++;
  console.log((c ? '  ok   ' : '  FAIL ') + m + (x !== undefined ? '  — ' + x : ''));
  if (!c) fails++; return c; };

const realFetch = globalThis.fetch;
let bust = 0;

async function call(opts){
  const o = opts || {};
  const sent = [];
  globalThis.fetch = async function(url, init){
    const u = String(url); sent.push({ url:u, init:init || {} });
    if (u.indexOf('/auth/v1/user') !== -1)
      return { ok:true, json: async () => ({ email:'theo@cardinalrenovations.net' }) };
    if (u.indexOf('push_subs') !== -1)
      return { ok:true, json: async () => [] };
    if (u.indexOf('team_profiles') !== -1)
      return { ok:true, json: async () => [{ email:'curtis@cardinalrenovations.net', phone:'937-555-0142' }] };
    if (u.indexOf('api.resend.com') !== -1) return { ok:true, text: async () => '', json: async () => ({ id:'e1' }) };
    if (u.indexOf('api.twilio.com') !== -1) return { ok:true, text: async () => '', json: async () => ({ sid:'SM1' }) };
    return { ok:true, json: async () => ({}), text: async () => '' };
  };
  process.env.RESEND_API_KEY     = 're_test';
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN  = '0'.repeat(32);
  process.env.TWILIO_FROM        = '+19375550100';

  let handler, importErr = null;
  try { handler = (await import('file://' + ABS + '?v=' + (++bust))).default; }
  catch (e) { importErr = String((e && e.message) || e); }
  if (importErr) { globalThis.fetch = realFetch; return { importErr }; }

  let out = null, status = 200;
  const res = { status(s){ status = s; return this; }, json(v){ out = v; return this; } };
  const body = { emails:['curtis@cardinalrenovations.net'],
                 title: o.title || 'Assigned to you: Ridge cap loose over garage',
                 body:  o.text  || 'You were assigned a punch-out at Mark Diamond',
                 url:   ('url' in o) ? o.url : '#p/abc-123/punch' };
  if (o.html !== undefined) body.html = o.html;
  else body.html = '<p>You were assigned a punch-out at <b>Mark Diamond</b>:</p>';
  if (o.html === null) delete body.html;
  try{
    await handler({ method:'POST',
      headers:{ authorization:'Bearer tok', host:'app.cardinalroster.com' }, body }, res);
  }catch(e){ out = { threw: String((e && e.message) || e) }; }
  globalThis.fetch = realFetch;

  const mail = sent.find(x => x.url.indexOf('api.resend.com') !== -1);
  const tw   = sent.find(x => x.url.indexOf('api.twilio.com') !== -1);
  let mailHtml = null;
  if (mail) { try { mailHtml = JSON.parse(mail.init.body).html; } catch(_){} }
  return { out, status, mailHtml,
           sms: tw ? new URLSearchParams(tw.init.body).get('Body') : null };
}

console.log('gate_1210 on ' + FILE + '\n');
const LINK = 'https://app.cardinalroster.com/#p/abc-123/punch';

/* ── A. the punch-out alert's EMAIL carries the link ──────────────────── */
console.log('A  the email carries the deep link');
const a = await call({});
if (a.importErr){
  ok(false, 'the route imports', a.importErr);
  console.log('\nGATE 1210 RED — route did not load'); process.exit(1);
}
ok(a.mailHtml != null, 'an email was sent at all');
ok(!!(a.mailHtml && a.mailHtml.indexOf(LINK) !== -1),
   'THE EMAIL HTML CONTAINS THE ABSOLUTE LINK', JSON.stringify(String(a.mailHtml || '').slice(-140)));
ok(!!(a.mailHtml && /<a\s[^>]*href=/i.test(a.mailHtml)),
   '  · as a real <a href>, not bare text');
ok(!!(a.mailHtml && a.mailHtml.indexOf('You were assigned a punch-out') !== -1),
   "  · and the caller's own message is still there, above it");

/* ── B. the SMS is untouched — do not break the channel that worked ───── */
console.log('\nB  the text still carries it (1125, unchanged)');
ok(!!(a.sms && a.sms.indexOf(LINK) !== -1), 'the SMS body still ends with the link',
   JSON.stringify(String(a.sms || '').slice(-80)));

/* ── C. nothing to point at -> no link, no empty anchor ──────────────── */
console.log('\nC  an alert with nowhere to go gets no anchor');
const c = await call({ url: '/' });
ok(c.mailHtml != null, 'the email still goes out');
ok(!!(c.mailHtml && !/<a\s[^>]*href=/i.test(c.mailHtml)),
   'no <a> is added when url is "/" (the test alert names no client)',
   JSON.stringify(String(c.mailHtml || '').slice(-100)));

/* ── D. the href is ESCAPED ──────────────────────────────────────────────
   The same-site test that gates absUrl permits a quote inside the path. The
   caller already controls the whole html body, so this is not a new exposure —
   but an unescaped attribute would be one more place to carry it. */
console.log('\nD  the href cannot break out of its attribute');
const d = await call({ url: '#p/a"onmouseover=alert(1)/punch' });
ok(d.mailHtml != null, 'the email still goes out for an odd path');
if (d.mailHtml && /<a\s[^>]*href=/i.test(d.mailHtml)) {
  ok(d.mailHtml.indexOf('"onmouseover') === -1,
     'the raw quote does not survive into the markup',
     JSON.stringify(d.mailHtml.slice(-160)));
  ok(d.mailHtml.indexOf('&quot;') !== -1, '  · it is escaped as &quot;');
} else {
  ok(true, 'no anchor emitted for that path at all (also safe)');
  ok(true, '  · (nothing to escape)');
}

/* ── E. the plain-text fallback still works when the caller sends no html ─ */
console.log('\nE  a caller that sends no html still gets a body AND the link');
const e = await call({ html: null, text: 'Plain body only' });
ok(!!(e.mailHtml && e.mailHtml.indexOf('Plain body only') !== -1),
   'the text fallback is still wrapped into html');
ok(!!(e.mailHtml && e.mailHtml.indexOf(LINK) !== -1),
   '  · and it carries the link too');

/* coverage floor — a shrinking gate must fail, not go quietly green */
console.log('');
ok(checks >= 12, 'coverage floor: ' + checks + ' checks ran (>= 12)');

console.log('\n' + (fails === 0
  ? `GATE 1210 GREEN — ${checks} checks passed`
  : `GATE 1210 RED — ${fails} of ${checks} failed`));
process.exit(fails === 0 ? 0 : 1);
