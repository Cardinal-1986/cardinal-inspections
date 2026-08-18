/*
 * Build 898 gate (delivery half) — the daily digest pings Owner Console reminders.
 * Mocks fetch (Supabase reads + Resend send), invokes the REAL exported handler,
 * and proves: a due-today reminder and an overdue one-time reminder land in the
 * admin email; an overdue REPEATING reminder does not (it only pings on its day);
 * the subject names the reminders; and the response counts them. Runs with no
 * appointments/estimates, so the email exists ONLY because a reminder is due —
 * proving reminders alone defeat the "nothing today" early return.
 * Negative control: pointed at digest_v897.js it has no reminders path -> RED.
 */
import { pathToFileURL } from 'url';
const DIGEST = process.argv[2] || '/home/user/cardinal-inspections/api/digest.js';

function daytonDate(offsetDays) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
const TODAY = daytonDate(0), YESTERDAY = daytonDate(-1), THREE_AGO = daytonDate(-3);

// what the PostgREST query (notify=true & done_at null & remind_on<=today) would return:
const REMINDER_ROWS = [
  { text: 'Deposit the checks', remind_on: TODAY, repeat: 'weekly' },      // due today -> IN
  { text: 'File the LLC report', remind_on: YESTERDAY, repeat: 'none' },   // overdue one-time -> IN
  { text: 'Old weekly thing', remind_on: THREE_AGO, repeat: 'weekly' }     // overdue repeating -> OUT
];

const sent = [];
global.fetch = async (url, opts) => {
  url = String(url);
  if (url.includes('/rest/v1/appointments')) return jsonRes([]);
  if (url.includes('/rest/v1/estimates')) return jsonRes([]);
  if (url.includes('/rest/v1/owner_reminders')) return jsonRes(REMINDER_ROWS);
  if (url.includes('/rest/v1/projects')) return jsonRes([]);
  if (url.includes('api.resend.com/emails')) { sent.push(JSON.parse(opts.body)); return jsonRes({ id: 'x' }); }
  return jsonRes([]);
};
function jsonRes(o) { return { ok: true, status: 200, json: async () => o, text: async () => JSON.stringify(o) }; }

process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-srk';
process.env.RESEND_API_KEY = 'test-resend';
delete process.env.CRON_SECRET;

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 240) : '')); } };
console.log(`artifact : ${DIGEST}`);

const res = { code: 0, body: null, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };
try {
  const mod = await import(pathToFileURL(DIGEST).href + '?t=' + Date.now());
  await mod.default({ headers: {} }, res);

  ok('handler responded 200', res.code === 200, res.code);
  const adminEmails = sent.filter(m => /reminder/i.test(m.subject) || /Reminders<\/b>/.test(m.html));
  ok('at least one email went out despite no appointments/estimates', sent.length >= 1, { count: sent.length });
  const html = sent.map(m => m.html).join('\n---\n');
  ok('due-today reminder is in the email', /Deposit the checks/.test(html));
  ok('overdue one-time reminder is in the email', /File the LLC report/.test(html));
  ok('overdue REPEATING reminder is NOT in the email', !/Old weekly thing/.test(html));
  ok('a subject names the reminders', sent.some(m => /reminder/i.test(m.subject)), sent.map(m => m.subject));
  ok('response counts reminders (2)', res.body && res.body.reminders === 2, res.body);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e && e.stack || e).slice(0, 400)); fail++; }
process.exit(fail === 0 ? 0 : 1);
