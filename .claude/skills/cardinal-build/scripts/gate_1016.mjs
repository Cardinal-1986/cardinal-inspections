// gate_1016.mjs — proves the AI/spend + senddoc routes are gated on Cardinal
// staff identity (build 1016), and that the gate locks out nobody on the current
// roster.
//
//  [A] api/_staff.js isStaff(): every one of the 10 live accounts passes; a
//      fabricated outsider, empty and null all fail; check is case-insensitive.
//  [B] all 13 routes import ./_staff.js AND carry an isStaff(...) 403 guard,
//      positioned AFTER the session is resolved (so an outsider with a valid
//      session is refused, not just anonymous callers).
//
// Usage:
//   node gate_1016.mjs                 # working tree -> GREEN
//   node gate_1016.mjs <api-dir>       # e.g. a build-1014 copy -> RED (no _staff.js, no guards)

import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const API = process.argv[2] || path.join(REPO, 'api');

const ROUTES = ['analyze', 'caption', 'summarize', 'organize', 'sortphotos', 'detect',
  'design', 'measure', 'sol', 'roofr', 'hover', 'coach', 'senddoc'];
// The live roster measured 23 Aug 2026 (auth.users ∩ legit): 9 on the domain
// plus these two non-domain accounts. None may be locked out.
const LIVE = ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net',
  'curtis@cardinalrenovations.net', 'scottie@cardinalrenovations.net',
  'nick@cardinalrenovations.net', 'jacob@cardinalrenovations.net', 'jerry@cardinalrenovations.net',
  'audit@cardinalrenovations.net', 'clarkie022@gmail.com', 'theodorion1986@gmail.com'];
const OUTSIDERS = ['attacker@evil.com', 'x@gmail.com', '', null, undefined, 'nope@example.org'];

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// [A] roster logic
let isStaff = null;
try {
  const mod = await import(pathToFileURL(path.join(API, '_staff.js')).href + '?t=' + Date.now());
  isStaff = mod.isStaff;
} catch (e) { fails.push('[A] api/_staff.js not importable: ' + e.message); }
if (typeof isStaff === 'function') {
  for (const e of LIVE) ok(isStaff(e) === true, `[A] live staff must pass: ${e}`);
  for (const e of OUTSIDERS) ok(isStaff(e) === false, `[A] outsider must fail: ${JSON.stringify(e)}`);
  ok(isStaff('THEO@CardinalRenovations.NET') === true, '[A] check must be case-insensitive');
  ok(isStaff('clarkie022@GMAIL.com') === true, '[A] non-domain allowlist must be case-insensitive');
}

// [B] every route imports the helper and guards after the session resolves
for (const r of ROUTES) {
  const p = path.join(API, r + '.js');
  let s = '';
  try { s = fs.readFileSync(p, 'utf8'); } catch (e) { fails.push('[B] cannot read ' + p); continue; }
  ok(/from '\.\/_staff\.js'/.test(s), `[B] ${r}.js must import ./_staff.js`);
  ok(/isStaff\s*\(/.test(s) && /403/.test(s), `[B] ${r}.js must carry an isStaff(...) 403 guard`);
  // the guard must come AFTER the session is RESOLVED (the user object obtained
  // from Supabase), not before — otherwise an outsider with a valid session
  // slips past. Anchor on the resolution call itself, not on later mentions of
  // user.email (senddoc references user.email again inside the email body).
  const resPos = [s.indexOf('await who.json()'), s.indexOf('await userResp.json()')]
    .filter(x => x > -1).sort((a, b) => a - b)[0];
  const gPos = s.indexOf('isStaff(');
  ok(resPos > -1 && gPos > resPos, `[B] ${r}.js isStaff guard must sit after the session is resolved`);
}

if (fails.length) {
  console.error('RED — gate_1016 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1016: 13 AI/spend routes gated on staff identity; all 10 live accounts pass, outsiders refused.');
