/*
 * Build 1197 — the daily digest records a successful send.
 * Mocks fetch (Supabase reads + Resend + the audit write) and invokes the REAL
 * exported handler twice:
 *   1. Resend accepts → exactly one POST to /rest/v1/audit_events with
 *      type 'digest_sent', email null, a bounded detail; response audit:'written'.
 *   2. Resend refuses (403, the unverified-domain case) → NO audit write at all;
 *      response audit:'skipped', emails_sent 0.
 * Negative control: pointed at the 1196 digest.js there is no audit write → RED.
 *
 *   node test_digest1197.mjs [api/digest.js]
 */
import { pathToFileURL } from 'url';
import { dirname, resolve } from 'path';
const HERE = dirname(new URL(import.meta.url).pathname);
const DIGEST = process.argv[2] || resolve(HERE, '../../../../api/digest.js');

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 200) : '')); } };
const jsonRes = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => JSON.stringify(o) });

process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-srk';
process.env.RESEND_API_KEY = 'test-resend';
process.env.CRON_SECRET = 'test-cron';
console.log(`artifact : ${DIGEST}`);

async function run(resendOk) {
  const audits = [], sent = [];
  global.fetch = async (url, opts) => {
    url = String(url);
    if (url.includes('/rest/v1/appointments')) return jsonRes([{ title: 'Roof inspection', appt_date: today, appt_time: '09:00', project_id: 'p1', notes: '', created_by: 'nick@cardinalrenovations.net' }]);
    if (url.includes('/rest/v1/projects')) return jsonRes([{ id: 'p1', name: 'Mark Diamond', address: '7990 Germantown Pike' }]);
    if (url.includes('/rest/v1/audit_events')) { audits.push({ opts, body: JSON.parse(opts.body) }); return jsonRes([], 201); }
    if (url.includes('api.resend.com/emails')) { sent.push(JSON.parse(opts.body)); return resendOk ? jsonRes({ id: 'x' }) : jsonRes({ message: 'domain not verified' }, 403); }
    return jsonRes([]);
  };
  const res = { code: 0, body: null, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };
  const mod = await import(pathToFileURL(DIGEST).href + '?t=' + Date.now() + Math.random());
  await mod.default({ headers: { authorization: 'Bearer test-cron' } }, res);
  return { res, audits, sent };
}

try {
  const a = await run(true);
  ok('accepted send: handler responded 200', a.res.code === 200, a.res.code);
  ok('accepted send: at least one email went to Resend', a.sent.length >= 1, a.sent.length);
  ok('accepted send: exactly one audit_events write', a.audits.length === 1, a.audits.length);
  const w = a.audits[0] || {};
  ok('accepted send: it is a POST with the service headers', w.opts && w.opts.method === 'POST' && w.opts.headers && w.opts.headers.apikey === 'test-srk', w.opts && w.opts.method);
  ok("accepted send: type is 'digest_sent', email null", w.body && w.body.type === 'digest_sent' && w.body.email === null, w.body);
  ok('accepted send: detail names the day and the count, within 300 chars', w.body && typeof w.body.detail === 'string' && w.body.detail.startsWith(today) && /\d+ email/.test(w.body.detail) && w.body.detail.length <= 300, w.body && w.body.detail);
  ok("accepted send: the response reports audit:'written'", a.res.body && a.res.body.audit === 'written', a.res.body && a.res.body.audit);
  ok('accepted send: emails_sent counts the accepted ones', a.res.body && a.res.body.emails_sent === a.sent.length, a.res.body && a.res.body.emails_sent);

  const b = await run(false);
  ok('refused send: handler still responds 200 (the digest never fails on a bad domain)', b.res.code === 200, b.res.code);
  ok('refused send: NO audit_events write', b.audits.length === 0, b.audits.length);
  ok("refused send: the response reports audit:'skipped' and emails_sent 0", b.res.body && b.res.body.audit === 'skipped' && b.res.body.emails_sent === 0, b.res.body && { audit: b.res.body.audit, emails_sent: b.res.body.emails_sent });

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e && e.stack || e).slice(0, 400)); fail++; }
process.exit(fail === 0 ? 0 : 1);
