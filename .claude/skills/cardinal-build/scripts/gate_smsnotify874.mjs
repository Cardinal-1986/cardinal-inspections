/*
 * Build 874 gate — notify.js sends SMS via Twilio (best-effort, gated on TWILIO_*).
 * Imports the REAL handler (with a throwaway web-push stub under node_modules) and
 * drives it with a recording fetch:
 *   - with TWILIO_* set: a team alert POSTs to Twilio's Messages API for each staff
 *     phone (E.164-normalised from team_profiles), texted counts, env.sms=true
 *   - the Twilio request carries the right To / From / Body
 *   - a junk phone is skipped (never sent), and phones are de-duped
 *   - with TWILIO_* UNSET: no Twilio call, texted:0 (email/push untouched)
 * Pass a path to test a different notify.js (v873 has no SMS -> RED).
 *
 * Usage: node gate_smsnotify874.mjs [path/to/notify.js]
 */
import { pathToFileURL } from 'url';
import { resolve } from 'path';
const TARGET = resolve(process.argv[2] || 'api/notify.js');

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };
console.log('target : ' + TARGET);

function jsonResp(data, okFlag) {
  return { ok: okFlag !== false, status: okFlag === false ? 500 : 200, json: async () => data, text: async () => (typeof data === 'string' ? data : JSON.stringify(data)) };
}
function makeFetch(rec, profiles) {
  return async (url, opts) => {
    url = String(url);
    if (url.includes('/auth/v1/user')) return jsonResp({ email: 'theo@cardinalrenovations.net' });
    if (url.includes('/rest/v1/push_subs')) return jsonResp([]);                 // nobody push-subscribed
    if (url.includes('/rest/v1/team_profiles')) return jsonResp(profiles);
    if (url.includes('api.twilio.com')) { rec.twilio.push({ url, body: (opts && opts.body) || '', auth: (opts && opts.headers && opts.headers.Authorization) || '' }); return { ok: true, status: 201, json: async () => ({}), text: async () => '' }; }
    if (url.includes('api.resend.com')) { rec.resend.push(1); return { ok: true, status: 200, json: async () => ({}), text: async () => '' }; }
    return jsonResp({}, false);
  };
}
function makeRes() { return { _c: 0, _j: null, status(c) { this._c = c; return this; }, json(o) { this._j = o; return this; } }; }
const REQ = () => ({ method: 'POST', headers: { authorization: 'Bearer testtoken' }, body: { to: ['scottie@cardinalrenovations.net'], subject: 'New job assigned', body: 'You have been assigned 88 Oak St.' } });

try {
  const mod = await import(pathToFileURL(TARGET).href + '?t=' + Date.now());
  const handler = mod.default;
  ok('handler imports', typeof handler === 'function');

  // --- with Twilio configured ---
  process.env.TWILIO_ACCOUNT_SID = 'ACtest';
  process.env.TWILIO_AUTH_TOKEN = 'toktest';
  process.env.TWILIO_FROM = '+19375550100';
  delete process.env.RESEND_API_KEY;   // isolate SMS from email
  const rec = { twilio: [], resend: [] };
  // two staff rows: one good phone, one junk (must be skipped), plus a duplicate of the good one
  const profiles = [
    { email: 'scottie@cardinalrenovations.net', phone: '(937) 555-1212' },
    { email: 'nobody@cardinalrenovations.net', phone: '12345' },
    { email: 'dup@cardinalrenovations.net', phone: '937-555-1212' },
  ];
  global.fetch = makeFetch(rec, profiles);
  const res = makeRes();
  await handler(REQ(), res);
  const j = res._j || {};
  ok('response reports texted >= 1', j.texted >= 1, j);
  ok('env.sms is true when configured', j.env && j.env.sms === true, j.env);
  ok('exactly ONE Twilio send (junk skipped, dup de-duped)', rec.twilio.length === 1, rec.twilio.map(t => t.body));
  const body = rec.twilio[0] ? rec.twilio[0].body : '';
  ok('Twilio To is the E.164 phone', /To=%2B19375551212/.test(body), body);
  ok('Twilio From is the configured number', /From=%2B19375550100/.test(body), body);
  ok('Twilio Body carries the alert text', /88\+Oak|88%20Oak/.test(body) || /assigned/i.test(decodeURIComponent(body)), body);
  ok('Twilio auth is HTTP Basic', /^Basic /.test(rec.twilio[0] ? rec.twilio[0].auth : ''), rec.twilio[0] && rec.twilio[0].auth);

  // --- with Twilio NOT configured ---
  delete process.env.TWILIO_ACCOUNT_SID; delete process.env.TWILIO_AUTH_TOKEN; delete process.env.TWILIO_FROM;
  const rec2 = { twilio: [], resend: [] };
  global.fetch = makeFetch(rec2, profiles);
  const res2 = makeRes();
  await handler(REQ(), res2);
  const j2 = res2._j || {};
  ok('no Twilio call when unconfigured', rec2.twilio.length === 0, rec2.twilio.length);
  ok('texted:0 when unconfigured', j2.texted === 0, j2.texted);
  ok('env.sms false when unconfigured', j2.env && j2.env.sms === false, j2.env);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e && e.stack || e).slice(0, 400));
  fail++;
}
process.exit(fail === 0 ? 0 : 1);
