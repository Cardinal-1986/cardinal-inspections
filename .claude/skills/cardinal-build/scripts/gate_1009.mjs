// gate_1009.mjs — proves api/abc.js is no longer an open proxy (build 1009).
//
// The route spends Cardinal's live ABC credential and, through the order.write
// scope, can place real material orders. It shipped with NO auth and a wildcard
// Access-Control-Allow-Origin. This gate drives the exported handler with mocked
// Supabase auth and asserts the security contract:
//
//   1. anonymous call            -> 401 "Sign in required"
//   2. invalid token             -> 401 "Invalid session"
//   3. signed-in sales, read     -> gate PASSES (not 401/403)
//   4. signed-in sales, order    -> 403 (placeOrder is admin/production only)
//   5. signed-in admin, order    -> gate PASSES (not 403)
//   6. no Access-Control-Allow-Origin header on any response
//
// Usage:
//   node gate_1009.mjs                      # tests the working tree's api/abc.js -> GREEN
//   node gate_1009.mjs <path-to-abc.js>     # negative control: point at build 1008 -> RED
//
// The negative control is the whole point: pointed at 1008's abc.js, assertions
// 1-6 must FAIL with named messages (anon returns 200, wildcard CORS is set),
// proving the gate can see the hole it closed. A gate that has never gone red
// proves nothing.

import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const TARGET = process.argv[2] || path.join(REPO, 'api', 'abc.js');

// ---- test doubles -----------------------------------------------------------

function jsonResp(ok, body) {
  return { ok, status: ok ? 200 : 401, json: async () => body, text: async () => JSON.stringify(body) };
}

// Route Supabase calls; anything else (i.e. an ABC host) must NOT be reached in
// a gate that only exercises auth — reaching one is a test-design failure, so
// throw loudly rather than silently pass.
function installFetch() {
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    const hdr = (opts && opts.headers) || {};
    if (u.includes('/auth/v1/user')) {
      const tok = String(hdr.Authorization || '').replace('Bearer ', '');
      if (tok === 'VALID_ADMIN') return jsonResp(true, { email: 'theo@cardinalrenovations.net' });
      if (tok === 'VALID_SALES') return jsonResp(true, { email: 'nick@cardinalrenovations.net' });
      return jsonResp(false, {}); // 'BAD' or anything else
    }
    if (u.includes('/rest/v1/team_profiles')) {
      if (u.includes(encodeURIComponent('nick@cardinalrenovations.net'))) return jsonResp(true, [{ role: 'sales' }]);
      return jsonResp(true, []);
    }
    throw new Error('unexpected outbound fetch to ' + u);
  };
}

function mockReq(auth, body) {
  const headers = {};
  if (auth) headers.authorization = auth;
  return { method: 'POST', headers, body };
}
function mockRes() {
  const res = { _status: null, _json: null, _headers: {}, _ended: false };
  res.setHeader = (k, v) => { res._headers[String(k).toLowerCase()] = v; };
  res.status = (c) => { res._status = c; return res; };
  res.json = (o) => { res._json = o; return res; };
  res.end = () => { res._ended = true; return res; };
  return res;
}

async function call(handler, auth, body) {
  const req = mockReq(auth, body);
  const res = mockRes();
  await handler(req, res);
  return res;
}

// ---- run --------------------------------------------------------------------

const fails = [];
function ok(cond, msg) { if (!cond) fails.push(msg); }

// Ensure ABC creds are absent so a gate-PASS short-circuits at getToken()
// (NOT_CONFIGURED -> 200 {configured:false}) instead of hitting an ABC host.
delete process.env.ABC_CLIENT_ID;
delete process.env.ABC_CLIENT_SECRET;
// A service key so the DB-role branch actually runs for the sales-rep test.
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

installFetch();

let handler;
try {
  const mod = await import(pathToFileURL(TARGET).href + '?t=' + Date.now());
  handler = mod.default;
} catch (e) {
  console.error('FAILED to import ' + TARGET + ': ' + (e && e.message));
  process.exit(1);
}
if (typeof handler !== 'function') {
  console.error('no default export handler in ' + TARGET);
  process.exit(1);
}

// 1. anonymous -> 401
{
  const r = await call(handler, null, { action: 'searchItems', query: 'shingle' });
  ok(r._status === 401, `[1] anonymous searchItems: expected 401, got ${r._status} (${JSON.stringify(r._json)})`);
}
// 2. invalid token -> 401
{
  const r = await call(handler, 'Bearer BAD', { action: 'searchItems', query: 'shingle' });
  ok(r._status === 401, `[2] invalid-token searchItems: expected 401, got ${r._status} (${JSON.stringify(r._json)})`);
}
// 3. signed-in sales, read action -> gate passes (200 configured:false, NOT 401/403)
{
  const r = await call(handler, 'Bearer VALID_SALES', { action: 'searchItems', query: 'shingle' });
  ok(r._status !== 401 && r._status !== 403,
     `[3] signed-in sales searchItems: gate should PASS, got ${r._status} (${JSON.stringify(r._json)})`);
}
// 4. signed-in sales, order action -> 403
{
  const r = await call(handler, 'Bearer VALID_SALES', { action: 'placeOrder', payload: {} });
  ok(r._status === 403, `[4] sales placeOrder: expected 403, got ${r._status} (${JSON.stringify(r._json)})`);
}
// 5. signed-in admin, order action -> gate passes (NOT 403)
{
  const r = await call(handler, 'Bearer VALID_ADMIN', { action: 'placeOrder', payload: {} });
  ok(r._status !== 403 && r._status !== 401,
     `[5] admin placeOrder: gate should PASS, got ${r._status} (${JSON.stringify(r._json)})`);
}
// 6. no wildcard CORS header on any response
{
  const r = await call(handler, 'Bearer VALID_SALES', { action: 'status' });
  ok(!('access-control-allow-origin' in r._headers),
     `[6] Access-Control-Allow-Origin must not be set, got '${r._headers['access-control-allow-origin']}'`);
}

if (fails.length) {
  console.error('RED — gate_1009 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1009: api/abc.js requires a session; orders are admin/production only; no wildcard CORS.');
