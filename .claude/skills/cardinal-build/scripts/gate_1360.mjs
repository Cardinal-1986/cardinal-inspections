// gate_1360 — the nightly CompanyCam cron also refreshes the PROJECT list (it froze on 31 Jul: only the admin button
// ran the projects pass). Runs the shipped api/companycam-sync.js handler against a stubbed network.
// A: cron GET (right secret) writes the project pages to companycam_projects and still does the photo top-up.
// B: a CompanyCam refusal on the project list never hides the top-up's result (still 200, error reported).
// C: the admin "projects" button path behaves as before.
// D: a wrong cron secret is refused before anything is fetched.
// node gate_1360.mjs [api/companycam-sync.js]   (1359's file = RED)
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
const here = new URL('.', import.meta.url).pathname;
const SRC = process.argv[2] || here + '../../../../api/companycam-sync.js';
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const dir = mkdtempSync(join(tmpdir(), 'g1360-'));
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
copyFileSync(SRC, join(dir, 'h.js'));
process.env.COMPANYCAM_API_KEY = 'cc-test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-test'; process.env.CRON_SECRET = 'cron-test';
const { default: handler } = await import(join(dir, 'h.js'));
let calls = [], projFail = false;
globalThis.fetch = async (url, opt) => {
  const u = String(url); const m = (opt && opt.method) || 'GET';
  calls.push(m + ' ' + u.replace(/\?.*$/, '') + (m === 'POST' && /companycam_projects/.test(u) ? ' n=' + JSON.parse(opt.body).length : ''));
  const J = (b, s) => ({ ok: (s || 200) < 300, status: s || 200, json: async () => b, text: async () => JSON.stringify(b), headers: { get: () => null } });
  if (/companycam\.com.*\/projects/.test(u)) {
    if (projFail) return J({ message: 'nope' }, 503);
    const page2 = /after=c2/.test(u);
    return J({ data: page2 ? [{ id: 3, name: 'C', address: { street_address_1: '3 Elm', city: 'Dayton' }, created_at: 1760000000 }]
                         : [{ id: 1, name: 'A', address: '1 Oak' }, { id: 2, name: 'B', address: null }],
               meta: page2 ? { has_next: false } : { has_next: true, next_cursor: 'c2' } });
  }
  if (/companycam\.com/.test(u)) return J({ data: [], meta: { has_next: false } });
  if (/\/auth\/v1\/user/.test(u)) return J({ email: 'theo@cardinalrenovations.net' });
  if (/\/rpc\//.test(u)) return J(0);
  return J([]);
};
const run = async (req) => { let code = 0, body = null; const res = { status(c) { code = c; return this; }, json(b) { body = b; return this; }, setHeader() {} }; await handler(req, res); return { code, body }; };
/* A */
calls = [];
const a = await run({ method: 'GET', headers: { authorization: 'Bearer cron-test' }, query: {} });
const wrote = calls.filter(c => /POST .*companycam_projects n=/.test(c));
ok(a.code === 200 && wrote.length === 2 && /n=2/.test(wrote[0]) && /n=1/.test(wrote[1]), 'A: the nightly cron writes both project pages', JSON.stringify({ code: a.code, wrote }));
ok(a.body && a.body.projects_pass && a.body.projects_pass.projects === 3, 'A: and reports the project count', JSON.stringify(a.body && a.body.projects_pass));
ok(calls.some(c => /companycam\.com.*photos/.test(c)) && a.body && 'new_photos' in a.body, 'A: the photo top-up still runs', JSON.stringify(Object.keys(a.body || {})));
/* B */
projFail = true; calls = [];
const bb = await run({ method: 'GET', headers: { authorization: 'Bearer cron-test' }, query: {} });
ok(bb.code === 200 && bb.body && 'new_photos' in bb.body && bb.body.projects_pass && /refused/.test(bb.body.projects_pass.error || ''), 'B: a refused project list never hides the top-up', JSON.stringify({ code: bb.code, pp: bb.body && bb.body.projects_pass }));
projFail = false;
/* C */
calls = [];
const c = await run({ method: 'POST', headers: { authorization: 'Bearer user-token' }, body: { action: 'projects' }, query: {} });
ok(c.code === 200 && c.body && c.body.projects === 3 && c.body.done === true, 'C: the admin projects button still works', JSON.stringify({ code: c.code, body: c.body }));
/* D */
calls = [];
const d = await run({ method: 'GET', headers: { authorization: 'Bearer wrong' }, query: {} });
ok(d.code === 401 && !calls.some(x => /companycam\.com/.test(x)), 'D: a wrong cron secret is refused before CompanyCam is called', d.code);
console.log(fail ? 'GATE 1360 RED — ' + fail + ' failing' : 'GATE 1360 GREEN');
process.exit(fail ? 1 : 0);
