/* gate_784.mjs — the daily digest now chases estimates, not just appointments.
 *
 *   node gate_784.mjs [path/to/api/digest.js]
 *
 * Executes the REAL handler with global.fetch stubbed, so every branch runs
 * against composed emails rather than a re-implementation. Nothing leaves the
 * machine: Supabase reads are served from fixtures and Resend is captured.
 *
 * Negative control: point it at the previous digest.js (git show HEAD:api/digest.js
 * > /tmp/digest_prev.js) — there the quiet-day case sends NOTHING and no email
 * mentions an estimate.
 */
import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/api/digest.js';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_784 on ' + FILE);

process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-srk';
process.env.RESEND_API_KEY = 'test-resend';
process.env.CRON_SECRET = '';
process.env.DIGEST_STALE_DAYS = '5';

const iso = d => new Date(Date.now() - d * 86400000).toISOString();
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

/* Fixtures mirror the live shapes: theo owns the aging estimates, nick has a
   fresh one that must NOT be named, and one appointment belongs to nick. */
const FIX = {
  appts: [
    { title: 'Roof inspection', appt_date: today, appt_time: '09:00', project_id: 'p1', notes: null, created_by: 'nick@cardinalrenovations.net' }
  ],
  estimates: [
    { estimate_number: 'EST-2026-0882', project_id: 'p1', total: 1820,  created_by: 'theo@cardinalrenovations.net', updated_at: iso(17) },
    { estimate_number: 'EST-2026-0892', project_id: 'p2', total: 36654, created_by: 'theo@cardinalrenovations.net', updated_at: iso(14) },
    { estimate_number: 'EST-2026-0896', project_id: 'p3', total: 20525, created_by: 'nick@cardinalrenovations.net', updated_at: iso(4) }   /* fresh */
  ],
  projects: [{ id: 'p1', name: 'Hoolihan' }, { id: 'p2', name: 'Ostrowski' }, { id: 'p3', name: 'Vandenberg' }]
};

let SENT = [];
function installFetch({ appts, estimates, estimatesFail }) {
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/rest/v1/appointments')) return { ok: true, json: async () => appts, text: async () => '' };
    if (u.includes('/rest/v1/estimates')) {
      if (estimatesFail) throw new Error('simulated estimates outage');
      return { ok: true, json: async () => estimates, text: async () => '' };
    }
    if (u.includes('/rest/v1/projects')) return { ok: true, json: async () => FIX.projects, text: async () => '' };
    if (u.includes('api.resend.com')) {
      SENT.push(JSON.parse(opts.body));
      return { ok: true, text: async () => '' };
    }
    return { ok: false, json: async () => ({}), text: async () => 'unexpected ' + u };
  };
}
async function run(cfg) {
  SENT = [];
  const mod = await import(pathToFileURL(FILE).href + '?v=' + Math.random());
  installFetch(cfg);
  let out = null;
  const res = { status: () => res, json: o => { out = o; return res; } };
  await mod.default({ headers: {} }, res);
  return { out, sent: SENT.slice() };
}

console.log('\n--- 1. a normal day: schedule AND the chase list ---');
{
  const { out, sent } = await run({ appts: FIX.appts, estimates: FIX.estimates });
  ok('the handler completed', !!out, JSON.stringify(out));
  ok('it counted the stale estimates', out && out.stale_estimates === 2, JSON.stringify(out));
  ok('the 4-day-old estimate is NOT chased', !sent.some(m => /0896/.test(m.html)),
    'threshold is ' + process.env.DIGEST_STALE_DAYS + ' days');
  const theo = sent.find(m => m.to[0].startsWith('theo@'));
  ok('theo is emailed', !!theo);
  ok('...and his email names his two aging estimates', theo && /0882/.test(theo.html) && /0892/.test(theo.html));
  ok('...with the money summed', theo && /\$38,474/.test(theo.html),
    (theo && (theo.html.match(/\$[\d,]+ in total/) || [])[0]) || 'no total');
  ok('...and the oldest age shown in days', theo && /17d/.test(theo.html));
  const nick = sent.find(m => m.to[0].startsWith('nick@'));
  ok('nick still gets his appointment', nick && /Roof inspection/.test(nick.html));
  ok('...and is NOT told about theo\'s estimates', nick && !/0882/.test(nick.html));
  ok('client names are resolved in the chase list', theo && /Hoolihan/.test(theo.html) && /Ostrowski/.test(theo.html));
}

console.log('\n--- 2. the quiet day — the case that used to send nothing ---');
{
  const { out, sent } = await run({ appts: [], estimates: FIX.estimates });
  ok('a day with no appointments still sends', sent.length > 0, 'emails = ' + sent.length);
  ok('the chase list is the reason', sent.some(m => /Waiting on an answer/.test(m.html)));
  ok('and the empty schedule reads as words, not an empty table',
    sent.every(m => /Nothing on the calendar today/.test(m.html) || /Roof inspection/.test(m.html)));
  ok('the subject says what it is', sent.some(m => /estimates? waiting/i.test(m.subject)),
    sent.map(m => m.subject).join(' | '));
}

console.log('\n--- 3. genuinely nothing to say ---');
{
  const { out, sent } = await run({ appts: [], estimates: [] });
  ok('nothing is sent when there is nothing', sent.length === 0, 'emails = ' + sent.length);
  ok('and it says so honestly', out && /nothing waiting/i.test(out.note || ''), JSON.stringify(out));
}

console.log('\n--- 4. the estimates query failing must not kill the schedule ---');
{
  const { out, sent } = await run({ appts: FIX.appts, estimates: [], estimatesFail: true });
  ok('the schedule email still goes out', sent.length > 0, 'emails = ' + sent.length);
  ok('no chase section is invented', !sent.some(m => /Waiting on an answer/.test(m.html)));
}

console.log('\n--- 5. outbound subjects stay plain text ---');
{
  const { sent } = await run({ appts: FIX.appts, estimates: FIX.estimates });
  const emojiish = sent.filter(m => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(m.subject));
  ok('no emoji in any subject line', emojiish.length === 0, JSON.stringify(emojiish.map(m => m.subject)));
  ok('every subject still names the company', sent.every(m => /Cardinal/.test(m.subject)),
    sent.map(m => m.subject).join(' | '));
}

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
