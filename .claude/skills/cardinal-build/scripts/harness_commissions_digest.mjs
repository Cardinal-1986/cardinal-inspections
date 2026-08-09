/* Build 651 — the weekly commissions digest, executed for real.

   Imports the SHIPPED api/commissions-digest.js (ESM — api/package.json sets
   "type":"module") with global.fetch replaced by a router that answers the
   three Supabase REST calls from fixtures and records every Resend POST
   without ever reaching the network. No live email is ever sent by this
   harness, deliberately — commission dollar amounts are not a fixture to
   spam a real inbox with.

   Proves: "owed" matches the app's own definition (pending+approved, never
   paid/void — the same rule renderCommissions()/groupOwed() in cr-pay-script
   use); the nothing-owed case sends nothing; both admins (Theo, Joan) each
   get one email; CRON_SECRET and missing-env-var paths refuse correctly;
   the net math (including a rep whose draws exceed their commission).

   Usage: node harness_commissions_digest.mjs [api/commissions-digest.js] */
import { pathToFileURL } from 'node:url';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/api/commissions-digest.js';

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function mkRes() {
  const r = { statusCode: null, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

const COMMISSIONS = [
  { rep_email: 'nick@cardinalrenovations.net', amount: 210, status: 'pending' },
  { rep_email: 'nick@cardinalrenovations.net', amount: 500, status: 'approved' },
  { rep_email: 'nick@cardinalrenovations.net', amount: 900, status: 'paid' },    // must NOT count
  { rep_email: 'nick@cardinalrenovations.net', amount: 50,  status: 'void' },    // must NOT count
  { rep_email: 'joey@cardinalrenovations.net', amount: 840, status: 'pending' },
  { rep_email: 'jacob@cardinalrenovations.net', amount: 0,  status: 'pending' }, // zero-owed rep, excluded
];
const DRAWS = [
  { rep_email: 'nick@cardinalrenovations.net', amount: 1000, status: 'outstanding' }, // exceeds Nick's owed
  { rep_email: 'joey@cardinalrenovations.net', amount: 100,  status: 'outstanding' },
  { rep_email: 'joey@cardinalrenovations.net', amount: 50,   status: 'repaid' },       // must NOT count
];
const TEAM = [
  { email: 'nick@cardinalrenovations.net', name: 'Nick Hey' },
  { email: 'joey@cardinalrenovations.net', name: 'Joseph Lehman' },
];

function fetchRouter(sent) {
  return async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('/rest/v1/commissions')) {
      return { ok: true, json: async () => COMMISSIONS, text: async () => '' };
    }
    if (u.includes('/rest/v1/draws')) {
      return { ok: true, json: async () => DRAWS, text: async () => '' };
    }
    if (u.includes('/rest/v1/team_profiles')) {
      return { ok: true, json: async () => TEAM, text: async () => '' };
    }
    if (u.includes('api.resend.com')) {
      sent.push(JSON.parse(opts.body));
      return { ok: true, text: async () => '' };
    }
    throw new Error('unmocked fetch: ' + u);
  };
}

async function run(envOverrides = {}, reqOverrides = {}) {
  const sent = [];
  const savedFetch = global.fetch;
  const savedEnv = { ...process.env };
  global.fetch = fetchRouter(sent);
  /* assigning JS `undefined` into process.env coerces to the STRING
     "undefined" (a Node quirk, not deletion) — delete the keys instead */
  delete process.env.ADMIN_EMAIL;
  delete process.env.CRON_SECRET;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk-test';
  process.env.RESEND_API_KEY = 'resend-test';
  for (const [k, v] of Object.entries(envOverrides)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  const mod = await import(pathToFileURL(FILE).href + '?t=' + Date.now() + Math.random());
  const res = mkRes();
  await mod.default({ headers: {}, ...reqOverrides }, res);
  global.fetch = savedFetch;
  process.env = savedEnv;
  return { res, sent, groupOwed: mod.groupOwed };
}

(async () => {

console.log('\n── groupOwed(): the exact rule the app uses ──');
{
  const mod = await import(pathToFileURL(FILE).href);
  const { owed, drawn, reps } = mod.groupOwed(COMMISSIONS, DRAWS);
  ok('Nick: pending(210) + approved(500) = 710, paid/void excluded', owed['nick@cardinalrenovations.net'] === 710, owed['nick@cardinalrenovations.net']);
  ok('Joey: 840 owed', owed['joey@cardinalrenovations.net'] === 840);
  ok('Nick draws: only the outstanding one counts (1000), repaid excluded elsewhere', drawn['nick@cardinalrenovations.net'] === 1000);
  ok('Joey draws: outstanding(100) counts, repaid(50) does not', drawn['joey@cardinalrenovations.net'] === 100);
  ok('a rep with 0 owed and 0 draws is excluded from the list', !reps.includes('jacob@cardinalrenovations.net'));
  ok('exactly two reps make the cut', reps.length === 2 && reps.includes('nick@cardinalrenovations.net') && reps.includes('joey@cardinalrenovations.net'));
}

console.log('\n── the live handler, fetch fully mocked, nothing sent to the real network ──');
{
  const { res, sent } = await run({});
  ok('200 OK', res.statusCode === 200, res.statusCode);
  ok('two reps reported owed', res.body.owed_reps === 2, JSON.stringify(res.body));
  ok('total owed = 710 + 840 = 1550', res.body.total_owed === 1550, res.body.total_owed);
  ok('total draws outstanding = 1000 + 100 = 1100', res.body.total_draws === 1100, res.body.total_draws);
  ok('exactly one email per admin — Theo and Joan, nobody else', sent.length === 2 &&
    sent.some(m => m.to[0] === 'theo@cardinalrenovations.net') &&
    sent.some(m => m.to[0] === 'joan@cardinalrenovations.net'),
    sent.map(m => m.to[0]).join(','));
  const body = sent[0].html;
  ok('the email names both reps and their dollar figures', body.includes('Nick Hey') && body.includes('Joseph Lehman') && body.includes('$710.00') && body.includes('$840.00'));
  ok('Nick’s draws exceed his commission — net renders negative, in red', /\$290\.00/.test(body) && /color:#9c1822/.test(body));
  ok('subject line counts reps, not dollars', sent[0].subject.includes('2 reps owed'));
}

console.log('\n── nothing owed: silent, matching /api/digest’s own convention ──');
{
  const savedFetch2 = global.fetch;
  const sent = [];
  global.fetch = async (url) => {
    if (String(url).includes('resend.com')) { sent.push(1); return { ok: true, text: async () => '' }; }
    return { ok: true, json: async () => [], text: async () => '' };
  };
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk-test';
  process.env.RESEND_API_KEY = 'resend-test';
  const mod = await import(pathToFileURL(FILE).href + '?t=' + Date.now() + Math.random());
  const res = mkRes();
  await mod.default({ headers: {} }, res);
  global.fetch = savedFetch2;
  ok('200 with owed_reps: 0', res.statusCode === 200 && res.body.owed_reps === 0, JSON.stringify(res.body));
  ok('no email sent when nothing is owed', sent.length === 0);
}

console.log('\n── auth and configuration guards ──');
{
  const { res, sent } = await run({ CRON_SECRET: 'shh' }, { headers: {} });
  ok('missing bearer token is refused (401), no query even attempted', res.statusCode === 401 && sent.length === 0);
}
{
  const { res } = await run({ CRON_SECRET: 'shh' }, { headers: { authorization: 'Bearer shh' } });
  ok('the correct bearer token is accepted', res.statusCode === 200, res.statusCode);
}
{
  const { res } = await run({ SUPABASE_SERVICE_ROLE_KEY: undefined });
  ok('missing SUPABASE_SERVICE_ROLE_KEY refuses with 500, not a crash', res.statusCode === 500);
}
{
  const { res } = await run({ RESEND_API_KEY: undefined });
  ok('missing RESEND_API_KEY refuses with 500, not a crash', res.statusCode === 500);
}

console.log('\n── wiring in the rest of the file ──');
{
  const fs = await import('node:fs');
  const vercelJson = JSON.parse(fs.readFileSync('/home/user/cardinal-inspections/vercel.json', 'utf8'));
  ok('vercel.json still parses as JSON', true);
  ok('the digest cron survives untouched (daily, unchanged schedule)',
    vercelJson.crons.some(c => c.path === '/api/digest' && c.schedule === '0 11 * * *'));
  ok('the new weekly cron is registered, Friday at 11:00 UTC', vercelJson.crons.some(c =>
    c.path === '/api/commissions-digest' && c.schedule === '0 11 * * 5'));
  ok('exactly two crons — nothing duplicated', vercelJson.crons.length === 2);
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH:', e); process.exit(1); });
