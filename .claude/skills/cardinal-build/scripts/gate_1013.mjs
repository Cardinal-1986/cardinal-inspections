// gate_1013.mjs — proves api/roofr.js and api/hover.js are no longer open AI
// relays (build 1013), and that the client sends the session they now require.
//
// The defect: neither route checked who was asking — anyone who knew the paths
// could POST arbitrary text and bill inference to GEMINI_API_KEY / the OpenAI
// fallback. The exact class closed on summarize/organize/caption, missed here.
//
// Server half: imports both SHIPPED handlers, drives them with mocked Supabase
// auth (GEMINI_API_KEY deleted so a passed gate short-circuits at the config
// check instead of reaching a model):
//   [1] roofr anon           -> 401 "Sign in required"
//   [2] roofr invalid token  -> 401 "Invalid session"
//   [3] roofr valid session  -> gate passes (500 config, NOT 401/403)
//   [4] hover anon           -> 401
//   [5] hover invalid token  -> 401
//   [6] hover valid session  -> gate passes (NOT 401/403)
// Client half (on index.html):
//   [7] every /api/roofr and /api/hover fetch site uses window.aiHeaders()
//       (counts the fetch sites and the aiHeaders sites; both must be 3)
//
// Usage:
//   node gate_1013.mjs                              # working tree -> GREEN
//   node gate_1013.mjs <roofr.js> <hover.js> <index.html>   # negative control
//     (point at build 1012's files -> RED: anon gets 500, client sends no auth)

import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const ROOFR = process.argv[2] || path.join(REPO, 'api', 'roofr.js');
const HOVER = process.argv[3] || path.join(REPO, 'api', 'hover.js');
const INDEX = process.argv[4] || path.join(REPO, 'index.html');

delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

// Route Supabase auth; any other outbound URL in an auth-only gate is a
// test-design failure — throw loudly rather than silently pass.
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('/auth/v1/user')) {
    const tok = String(((opts || {}).headers || {}).Authorization || '').replace('Bearer ', '');
    if (tok === 'VALID') return { ok: true, status: 200, json: async () => ({ email: 'nick@cardinalrenovations.net' }) };
    return { ok: false, status: 401, json: async () => ({}), text: async () => '' };
  }
  throw new Error('unexpected outbound fetch to ' + u);
};

function mockRes() {
  const r = { _status: null, _json: null };
  r.status = (c) => { r._status = c; return r; };
  r.json = (o) => { r._json = o; return r; };
  return r;
}
async function call(handler, auth, body) {
  const headers = {};
  if (auth) headers.authorization = auth;
  const res = mockRes();
  await handler({ method: 'POST', headers, body }, res);
  return res;
}

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

let roofr, hover;
try {
  roofr = (await import(pathToFileURL(ROOFR).href + '?t=' + Date.now())).default;
  hover = (await import(pathToFileURL(HOVER).href + '?t=' + Date.now())).default;
} catch (e) { console.error('FAILED to import handlers: ' + e.message); process.exit(1); }

const BODY = { text: 'x'.repeat(100) };
for (const [name, h, n] of [['roofr', roofr, 1], ['hover', hover, 4]]) {
  {
    const r = await call(h, null, BODY);
    ok(r._status === 401, `[${n}] ${name} anonymous: expected 401, got ${r._status} (${JSON.stringify(r._json)})`);
  }
  {
    const r = await call(h, 'Bearer BAD', BODY);
    ok(r._status === 401, `[${n + 1}] ${name} invalid token: expected 401, got ${r._status}`);
  }
  {
    const r = await call(h, 'Bearer VALID', BODY);
    ok(r._status !== 401 && r._status !== 403,
       `[${n + 2}] ${name} valid session: gate should PASS, got ${r._status} (${JSON.stringify(r._json)})`);
  }
}

// [7] client half — every roofr/hover fetch site carries aiHeaders()
{
  const src = fs.readFileSync(INDEX, 'utf8');
  const sites = [
    src.indexOf("fetch(source === 'Hover' ? '/api/hover' : '/api/roofr'"),
    src.indexOf("var ep = trade === 'siding' ? '/api/hover' : '/api/roofr'"),
    src.lastIndexOf("fetch('/api/roofr', {"),
  ];
  ok(sites.every(i => i > -1), `[7] expected all 3 known call sites present; offsets=${sites}`);
  let withAuth = 0;
  sites.forEach(i => { if (i > -1 && src.slice(i, i + 400).includes('aiHeaders()')) withAuth++; });
  ok(withAuth === 3, `[7] call sites sending aiHeaders(): expected 3/3, got ${withAuth}/3 — an unauthed site gets a 401 from its own server`);
}

if (fails.length) {
  console.error('RED — gate_1013 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1013: roofr + hover require a session; all 3 client call sites send it.');
