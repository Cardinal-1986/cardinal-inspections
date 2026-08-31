/* gate_1184.mjs — the containment build's gate.
 *
 * Drives the SHIPPED api/notify.js and api/librarian.js handlers through the full
 * auth ladder: no header -> 401, bad session -> 401, authenticated NON-STAFF -> 403,
 * real staff -> not refused. Also asserts the push_subs fan-out read carries the
 * service-role key and NOT the publishable key (build 1184 moved it, because the
 * old open "team push" RLS policy could not be closed while the route read that
 * table as anon).
 *
 * Usage:
 *   node gate_1184.mjs                 # gates the working tree's api/
 *   node gate_1184.mjs <api-dir>       # NEGATIVE CONTROL, e.g. a pre-1184 checkout
 *
 * Verified RED against HEAD~ (pre-1184): 8 passed, 11 failed — outsiders got 200
 * from notify (Resend fan-out) and 400 from librarian, never 403.
 *
 * Self-contained: web-push and @anthropic-ai/sdk are not installed in this repo
 * (there is no build step and no node_modules), so the gate writes minimal stubs
 * into a temp copy rather than requiring an install.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const srcApi = path.resolve(process.argv[2] || new URL('../../../../api', import.meta.url).pathname);
if (!fs.existsSync(path.join(srcApi, 'notify.js'))) {
  console.error('gate_1184: no notify.js under ' + srcApi);
  process.exit(2);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate1184-'));
const api = path.join(tmp, 'api');
fs.mkdirSync(path.join(api, 'node_modules', '@anthropic-ai', 'sdk'), { recursive: true });
fs.mkdirSync(path.join(api, 'node_modules', 'web-push'), { recursive: true });
for (const f of ['notify.js', 'librarian.js', '_staff.js']) {
  fs.copyFileSync(path.join(srcApi, f), path.join(api, f));
}
fs.writeFileSync(path.join(api, 'package.json'), JSON.stringify({ type: 'module' }));
fs.writeFileSync(path.join(api, 'node_modules/@anthropic-ai/sdk/package.json'),
  JSON.stringify({ name: '@anthropic-ai/sdk', version: '0.0.0-stub', type: 'module', main: 'index.js' }));
fs.writeFileSync(path.join(api, 'node_modules/@anthropic-ai/sdk/index.js'),
  'export default class Anthropic { constructor(){ this.messages = { create: async () => { throw new Error("stub"); } }; } }\n');
fs.writeFileSync(path.join(api, 'node_modules/web-push/package.json'),
  JSON.stringify({ name: 'web-push', version: '0.0.0-stub', main: 'index.js' }));
fs.writeFileSync(path.join(api, 'node_modules/web-push/index.js'),
  'module.exports = { setVapidDetails(){}, sendNotification: async () => ({ statusCode: 201 }) };\n');
const API = pathToImport(api);
function pathToImport(p){ return 'file://' + p; }

const SERVICE_SENTINEL = 'service-role-sentinel-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_SENTINEL;
process.env.VAPID_PRIVATE_KEY = 'dummy-private';   // makes pushReady true
process.env.ANTHROPIC_API_KEY  = 'dummy-anthropic';

let fail = 0, pass = 0;
const seen = [];                       // every outbound fetch this run made

function mockFetch(email){
  return async (url, opts = {}) => {
    const u = String(url);
    seen.push({ url: u, auth: (opts.headers || {}).Authorization || (opts.headers||{}).authorization, method: opts.method || 'GET' });
    if (u.includes('/auth/v1/user')) {
      if (email === null) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => ({ email }) };
    }
    if (u.includes('push_subs'))    return { ok: true, json: async () => [] };   // nobody enrolled
    if (u.includes('team_profiles'))return { ok: true, json: async () => [] };
    return { ok: true, json: async () => ({}), text: async () => '' };
  };
}
function mockRes(){
  const r = { code: 0, body: null, headers: {} };
  r.status = c => { r.code = c; return r; };
  r.json   = b => { r.body = b; return r; };
  r.send   = b => { r.body = b; return r; };
  r.setHeader = (k,v) => { r.headers[k]=v; };
  r.end = () => r;
  return r;
}
function check(label, got, want){
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label.padEnd(58) + ' got=' + got + ' want=' + want);
}

const notify    = (await import(API + '/notify.js')).default;
const librarian = (await import(API + '/librarian.js')).default;

const body = { emails:['theo@cardinalrenovations.net'], title:'t', body:'b' };

// ---------- /api/notify ----------
for (const [label, email, hdr, want] of [
  ['notify  no Authorization header',            'x@y.z',  null,            401],
  ['notify  invalid session',                     null,    'Bearer bad',    401],
  ['notify  authenticated NON-STAFF (outsider)', 'outsider@example.com', 'Bearer ok', 403],
  ['notify  self-signup gmail outsider',         'attacker@gmail.com',   'Bearer ok', 403],
  ['notify  domain-suffix spoof',                'a@cardinalrenovations.net.evil.com','Bearer ok',403],
]) {
  global.fetch = mockFetch(email);
  const res = mockRes();
  await notify({ method:'POST', headers: hdr ? { authorization: hdr } : {}, body }, res);
  check(label, res.code, want);
}

// legitimate staff must NOT be refused
for (const email of ['theo@cardinalrenovations.net','joan@cardinalrenovations.net','clarkie022@gmail.com']) {
  global.fetch = mockFetch(email);
  const res = mockRes();
  seen.length = 0;
  await notify({ method:'POST', headers:{ authorization:'Bearer ok' }, body }, res);
  check('notify  STAFF ' + email + ' not refused', res.code !== 401 && res.code !== 403, true);
  const subsReq = seen.find(s => s.url.includes('push_subs') && s.method === 'GET');
  check('notify  fan-out read used service_role key', !!subsReq && subsReq.auth === 'Bearer ' + SERVICE_SENTINEL, true);
  check('notify  fan-out read did NOT use publishable key', !!subsReq && !/sb_publishable/.test(subsReq.auth), true);
}

// ---------- /api/librarian ----------
for (const [label, email, hdr, want] of [
  ['librarian  no Authorization header',          'x@y.z', null,         401],
  ['librarian  invalid session',                   null,   'Bearer bad', 401],
  ['librarian  authenticated NON-STAFF (outsider)','outsider@example.com','Bearer ok',403],
  ['librarian  self-signup gmail outsider',        'attacker@gmail.com',  'Bearer ok',403],
]) {
  global.fetch = mockFetch(email);
  const res = mockRes();
  await librarian({ method:'POST', headers: hdr ? { authorization: hdr } : {}, body:{ q:'hi' } }, res);
  check(label, res.code, want);
}
global.fetch = mockFetch('theo@cardinalrenovations.net');
{
  const res = mockRes();
  await librarian({ method:'POST', headers:{ authorization:'Bearer ok' }, body:{ q:'hi' } }, res);
  check('librarian  STAFF theo@ not refused', res.code !== 401 && res.code !== 403, true);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
