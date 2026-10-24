/* gate_1407 — staff only (public signup is on, so a session is not staff).
 *   A  api/companycam-job.js refuses a signed-in non-staff account (403) before reading anything
 *   B  api/sms-link.js refuses a signed-in non-staff account and never reaches Twilio
 *   C  a staff account still gets past the staff check on both
 *   D  api/clientsign.js never hands a public signer the database's raw error text
 * Arg: [api dir] -> negative control (the 1406 api/ must go RED). */
import fs from 'fs'; import os from 'os'; import path from 'path';
const DIR = process.argv[2] || '/home/user/cardinal-inspections/api';
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'g1407-'));
for (const f of ['companycam-job.js', 'sms-link.js', 'clientsign.js', '_staff.js']) fs.copyFileSync(path.join(DIR, f), path.join(tmp, f.replace(/\.js$/, '.mjs')));
for (const f of fs.readdirSync(tmp)) { const p = path.join(tmp, f); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/'\.\/_staff\.js'/g, "'./_staff.mjs'")); }
process.env.SUPABASE_SERVICE_ROLE_KEY = 'gate'; process.env.TWILIO_ACCOUNT_SID = 'ACgate'; process.env.TWILIO_AUTH_TOKEN = 't'; process.env.TWILIO_FROM = '+19375550000';
process.env.COMPANYCAM_TOKEN = 'cc'; process.env.COMPANYCAM_API_KEY = 'cc';
let calls = [];
const stub = (email) => async (u) => { u = String(u); calls.push(u);
  if (u.includes('/auth/v1/user')) return { ok: true, json: async () => ({ email }) };
  if (u.includes('/rest/v1/projects')) return { ok: true, json: async () => ([{ id: 'p', name: 'Sample Client', phone: '9375550101', address: '1 Sample St', checklist: '{}' }]) };
  if (u.includes('twilio.com')) return { ok: true, status: 201, json: async () => ({ sid: 'SM' }), text: async () => '{}' };
  return { ok: true, status: 200, json: async () => ([]), text: async () => '' }; };
const run = async (file, email, body) => { calls = []; global.fetch = stub(email);
  const mod = await import('file://' + path.join(tmp, file));
  let code = 200, out = null; const res = { status(c) { code = c; return this; }, json(j) { out = j; return this; }, setHeader() {}, end() {} };
  try { await mod.default({ method: 'POST', headers: { authorization: 'Bearer x', host: 'app.cardinalroster.com' }, body }, res); } catch (e) { out = { threw: e.message }; }
  return { code, out, calls: calls.slice() }; };
const smsBody = { project_id: 'p', url: 'https://app.cardinalroster.com/api/share?t=abcdefgh1234' };
const a = await run('companycam-job.mjs', 'outsider@example.com', { client_id: 'p' });
ok(a.code === 403 && !a.calls.some(u => /rest\/v1|companycam\.com/.test(u)), 'A  companycam-job refuses a non-staff account before any read', a.code + ' ' + a.calls.length + ' calls');
const b = await run('sms-link.mjs', 'outsider@example.com', smsBody);
ok(b.code === 403 && !b.calls.some(u => /twilio/.test(u)), 'B  sms-link refuses a non-staff account and never texts', b.code + ' ' + JSON.stringify(b.out));
const c1 = await run('companycam-job.mjs', 'rep@cardinalrenovations.net', { client_id: 'p' });
const c2 = await run('sms-link.mjs', 'rep@cardinalrenovations.net', smsBody);
ok(c1.code !== 403 && c2.code !== 403 && c2.calls.some(u => /twilio/.test(u)), 'C  staff still get through on both', c1.code + ' / ' + c2.code);
const cs = fs.readFileSync(path.join(DIR, 'clientsign.js'), 'utf8');
ok(!/json\(\{\s*error:\s*err\.message/.test(cs), 'D  clientsign does not return raw error text to the signer');
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
