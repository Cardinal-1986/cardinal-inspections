/* gate_notify_subskey.mjs — the push_subs read sends ONE key in both headers.
 *
 * 21 Nov 2026: /api/notify answered
 *   {"mailed":1,"texted":1,"subs":0,"reason":"subs_query_failed",
 *    "push_error":"could not read the subscription list: Expected 3 parts in JWT; got 1"}
 * on a live send (Theo's alert to Jerry Wamsley), with 19 rows in push_subs. Every team
 * push had stopped while email and text kept going.
 *
 * Cause: the fan-out read sent `apikey: <publishable>` with `Authorization: Bearer <service
 * key>`. SUPABASE_SERVICE_ROLE_KEY is now an opaque secret key, not a JWT. Supabase's
 * gateway only swaps a `Bearer sb_...` value for the role JWT when it is the same key as
 * `apikey`; mixed, it reaches PostgREST as a bearer token and fails JWT parsing. Every other
 * route that uses the service key (remind, digest, companycam-sync, pay-webhook ...) already
 * sends it in BOTH headers; notify.js was the one that mixed them.
 *
 * Asserts, driving the SHIPPED api/notify.js as staff:
 *   A  with the service key set, the push_subs read's apikey IS the service key
 *   B  ... and its Authorization is 'Bearer ' + that same key (gate_1184's check, kept)
 *   C  ... so the two headers carry one key (the gateway's rule)
 *   D  with the service key UNSET, the read falls back to the caller's session token
 *      under the publishable apikey (1184's fallback, unchanged)
 *
 * Usage:
 *   node gate_notify_subskey.mjs              # gates the working tree's api/
 *   node gate_notify_subskey.mjs <api-dir>    # NEGATIVE CONTROL: b1625e5's api/ fails A and C
 *
 * The fake secret key is assembled at runtime so .github/scan_secret.js never sees a
 * key-shaped literal in this file.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.NOTIFY_QUIET_HOURS = 'off';

const srcApi = path.resolve(process.argv[2] || new URL('../../../../api', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (!fs.existsSync(path.join(srcApi, 'notify.js'))) { console.error('gate_notify_subskey: no notify.js under ' + srcApi); process.exit(2); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-subskey-'));
const api = path.join(tmp, 'api');
fs.mkdirSync(path.join(api, 'node_modules', 'web-push'), { recursive: true });
for (const f of ['notify.js', '_staff.js']) fs.copyFileSync(path.join(srcApi, f), path.join(api, f));
fs.writeFileSync(path.join(api, 'package.json'), JSON.stringify({ type: 'module' }));
fs.writeFileSync(path.join(api, 'node_modules/web-push/package.json'), JSON.stringify({ name: 'web-push', version: '0.0.0-stub', main: 'index.js' }));
fs.writeFileSync(path.join(api, 'node_modules/web-push/index.js'), 'module.exports = { setVapidDetails(){}, sendNotification: async () => ({ statusCode: 201 }) };\n');
const API = 'file://' + api.replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '/$1');

const SECRET = ['sb', 'secret', 'gateSentinelNoDots'].join('_');   // opaque, like the real one: no dots, not a JWT
process.env.VAPID_PRIVATE_KEY = 'dummy-private';                   // makes pushReady true

let fail = 0, pass = 0;
function check(label, got, want) {
  const ok = got === want; ok ? pass++ : fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label.padEnd(64) + ' got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want));
}
const seen = [];
global.fetch = async (url, opts = {}) => {
  const u = String(url), h = opts.headers || {};
  seen.push({ url: u, method: opts.method || 'GET', apikey: h.apikey, auth: h.Authorization || h.authorization });
  if (u.includes('/auth/v1/user')) return { ok: true, json: async () => ({ email: 'theo@cardinalrenovations.net' }) };
  if (u.includes('push_subs')) return { ok: true, json: async () => [] };
  if (u.includes('team_profiles')) return { ok: true, json: async () => [] };
  return { ok: true, json: async () => ({}), text: async () => '' };
};
function mockRes() { const r = { code: 0, body: null, headers: {} }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; r.send = b => { r.body = b; return r; }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.end = () => r; return r; }
const body = { emails: ['theo@cardinalrenovations.net'], title: 't', body: 'b' };
const subsRead = () => seen.find(s => s.url.includes('push_subs') && s.method === 'GET');

// ---- service key set (production) ----
process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
seen.length = 0;
await (await import(API + '/notify.js?svc=1')).default({ method: 'POST', headers: { authorization: 'Bearer caller-session-token' }, body }, mockRes());
const a = subsRead() || {};
check('A  push_subs read: apikey is the service key', a.apikey, SECRET);
check('B  push_subs read: Authorization is Bearer + the service key', a.auth, 'Bearer ' + SECRET);
check('C  push_subs read: both headers carry one key', !!a.apikey && a.auth === 'Bearer ' + a.apikey, true);

// ---- service key unset (fallback) ----
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
seen.length = 0;
await (await import(API + '/notify.js?svc=0')).default({ method: 'POST', headers: { authorization: 'Bearer caller-session-token' }, body }, mockRes());
const d = subsRead() || {};
check('D  no service key: read uses the caller session token', d.auth, 'Bearer caller-session-token');
check('D  no service key: apikey is the publishable key', /^sb_publishable_/.test(String(d.apikey || '')), true);

console.log((fail ? 'RED' : 'GREEN') + ' gate_notify_subskey: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
