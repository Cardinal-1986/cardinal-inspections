// gate_1352 — quiet hours on team alerts (api/notify.js). 9 pm – 7 am Dayton time, everyone but the sender:
// no push, email scheduled for 7:00 am, text scheduled for 7:00 am through the Messaging Service.
// Runs the SHIPPED handler with fetch stubbed (Supabase, Resend, Twilio) and the clock pinned.
// node gate_1352.mjs [api-dir]   (the 1351 api/notify.js = RED)
import { pathToFileURL } from 'url';
import { copyFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
const here = new URL('.', import.meta.url).pathname;
const apiDir = resolve(process.argv[2] || join(here, '../../../../api'));
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };

/* a private copy so each import is fresh and nothing touches the repo */
const work = mkdtempSync(join(tmpdir(), 'g1352-'));
for (const f of ['notify.js', '_staff.js', 'package.json']) copyFileSync(join(apiDir, f), join(work, f));
process.env.TWILIO_ACCOUNT_SID = 'AC' + 'x'.repeat(32); process.env.TWILIO_AUTH_TOKEN = 't'.repeat(32);
process.env.TWILIO_MESSAGING_SERVICE_SID = 'MG' + 'y'.repeat(32); process.env.RESEND_API_KEY = 're_test';
delete process.env.VAPID_PRIVATE_KEY; delete process.env.VAPID_PRIVATE;   /* push off: the gate is about email + SMS timing */
const RealDate = Date;
let pinned = 0;
globalThis.Date = class extends RealDate { constructor(...a){ if (a.length) super(...a); else super(pinned); } static now(){ return pinned; } };
let calls = [];
globalThis.fetch = async (url, opts = {}) => {
  url = String(url); calls.push({ url, opts });
  const J = (o, s = 200) => ({ ok: s < 300, status: s, json: async () => o, text: async () => JSON.stringify(o) });
  if (url.includes('/auth/v1/user')) return J({ email: 'theo@cardinalrenovations.net' });
  if (url.includes('/team_profiles')) return J([{ email: 'theo@cardinalrenovations.net', phone: '937-555-0101' }, { email: 'curtis@cardinalrenovations.net', phone: '937-555-0102' }]);
  if (url.includes('api.resend.com')) return J({ id: 'e1' });
  if (url.includes('api.twilio.com')) return J({ sid: 'SM1' });
  return J([]);
};
const mod = await import(pathToFileURL(join(work, 'notify.js')).href + '?t=' + RealDate.now());
async function send(atIso){
  pinned = new RealDate(atIso).getTime(); calls = [];
  let out = null;
  const res = { status(){ return this; }, json(o){ out = o; return this; } };
  await mod.default({ method: 'POST', headers: { authorization: 'Bearer tok', host: 'app.cardinalroster.com' },
    body: { emails: ['theo@cardinalrenovations.net', 'curtis@cardinalrenovations.net'], title: 'Punch out', body: 'Gutter guard on the north side', url: '/#job' } }, res);
  const mails = calls.filter(c => c.url.includes('resend')).map(c => JSON.parse(c.opts.body));
  const texts = calls.filter(c => c.url.includes('twilio')).map(c => Object.fromEntries(new URLSearchParams(c.opts.body)));
  return { out, mails, texts };
}

ok(typeof mod.isQuietHours === 'function' && typeof mod.quietSendAt === 'function', 'quiet-hour helpers exist');
if (typeof mod.isQuietHours === 'function') {
  /* 01:40 UTC 16 Oct = 9:40 pm EDT (quiet) · 15:00 UTC = 11 am (not) · 11:30 UTC 16 Jan = 6:30 am EST (quiet) */
  ok(mod.isQuietHours(new RealDate('2026-10-17T01:40:00Z')) && !mod.isQuietHours(new RealDate('2026-10-16T15:00:00Z')) && mod.isQuietHours(new RealDate('2027-01-16T11:30:00Z')) && !mod.isQuietHours(new RealDate('2027-01-16T12:00:00Z')),
     '9 pm – 7 am in Dayton, through daylight saving');
  ok(mod.quietSendAt(new RealDate('2026-10-17T01:40:00Z')).toISOString() === '2026-10-17T11:00:00.000Z', '9:40 pm EDT → 7:00 am EDT (11:00 UTC)');
  ok(mod.quietSendAt(new RealDate('2027-01-16T08:00:00Z')).toISOString() === '2027-01-16T12:00:00.000Z', '3:00 am EST → 7:00 am EST (12:00 UTC)');
  ok(mod.quietSendAt(new RealDate('2027-01-16T11:50:00Z')).toISOString() === '2027-01-16T12:06:00.000Z', '6:50 am → 7:06 (Twilio needs 15 minutes)');
}
const day = await send('2026-10-16T15:00:00Z');
ok(day.mails.length === 1 && !day.mails[0].scheduled_at && day.texts.length === 2 && day.texts.every(t => !t.SendAt), 'daytime: one email and both texts go now', JSON.stringify({ m: day.mails.map(m => m.scheduled_at || 'now'), t: day.texts.map(t => t.SendAt || 'now') }));
const night = await send('2026-10-17T03:15:00Z');   /* 11:15 pm EDT */
const later = night.mails.find(m => m.scheduled_at), now = night.mails.find(m => !m.scheduled_at);
ok(now && JSON.stringify(now.to) === '["theo@cardinalrenovations.net"]', 'night: the sender still gets the email now', JSON.stringify(now && now.to));
ok(later && JSON.stringify(later.to) === '["curtis@cardinalrenovations.net"]' && later.scheduled_at === '2026-10-17T11:00:00.000Z', 'night: everyone else gets it at 7:00 am', JSON.stringify(later));
const tCur = night.texts.find(t => t.To === '+19375550102'), tMe = night.texts.find(t => t.To === '+19375550101');
ok(tCur && tCur.SendAt === '2026-10-17T11:00:00.000Z' && tCur.ScheduleType === 'fixed' && tCur.MessagingServiceSid, 'night: their text is scheduled for 7:00 am', JSON.stringify(tCur));
ok(tMe && !tMe.SendAt, 'night: the sender\'s own text goes now', JSON.stringify(tMe));
ok(night.out && night.out.quiet === true && night.out.held === 1 && night.out.send_at === '2026-10-17T11:00:00.000Z', 'the reply says what quiet hours did', JSON.stringify(night.out && { quiet: night.out.quiet, held: night.out.held, at: night.out.send_at, d: night.out.quiet_detail }));
console.log(fail ? 'GATE 1352 RED — ' + fail + ' failing' : 'GATE 1352 GREEN');
process.exit(fail ? 1 : 0);
