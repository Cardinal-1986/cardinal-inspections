/* gate_1007.mjs — a phone-signed contract buzzes Curtis too (remote signature parity).

   THE GAP. api/clientsign.js advances a remotely-signed job to Approved and emails
   the rep+admins a "Document signed" note, but never told Curtis to schedule + order
   materials — the alert the in-person setStage path fires on the move to Approved.
   1007 sends that same alert from clientsign (it can't call the session-gated
   /api/notify, so it uses the Resend account it already uses), and makes the stage
   advance forward-only so a job already scheduled is not pulled back to Approved.

   The gate imports the shipped handler, stubs fetch + env, and drives two shapes.
   Control: the previous clientsign.js (no Curtis alert, unconditional Approved).

   Usage: node gate_1007.mjs [path-to-clientsign.js] */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../api/clientsign.js');
const TMP = join(HERE, '.gate_1007_clientsign.mjs');
writeFileSync(TMP, readFileSync(FILE, 'utf8'));   // .mjs so it loads as ESM anywhere
const { default: handler } = await import(pathToFileURL(TMP).href + '?t=' + FILE.length);

let fails = [], passes = 0;
const need = (n, ok, d) => { if (ok) passes++; else fails.push(n + (d ? ' — ' + d : '')); };

const SIGNABLE = '<div class="line"></div>\n    <div class="lbl">Client Acceptance</div>';
const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

/* run the handler once against a project sitting at `stage`, recording every fetch */
async function run(stage) {
  const calls = [];
  global.fetch = async (url, opts) => {
    const method = (opts && opts.method) || 'GET';
    let body = null; try { body = opts && opts.body ? JSON.parse(opts.body) : null; } catch (_) {}
    calls.push({ url: String(url), method, body });
    if (String(url).includes('/inspection_reports?share_token='))
      return { ok: true, json: async () => [{ id: 'd1', title: 'Roof Contract', html: SIGNABLE, project_id: 'p1', created_by: 'nick@cardinalrenovations.net' }] };
    if (String(url).includes('/projects?id=eq.p1&select='))
      return { ok: true, json: async () => [{ stage, name: 'Test Job', address: '123 Main St' }] };
    return { ok: true, json: async () => ({}), text: async () => '' };
  };
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-srk';
  process.env.RESEND_API_KEY = 'test-resend';
  const req = { method: 'POST', body: { t: 'abcdef0123456789abcd', sig: SIG, name: 'John Homeowner' } };
  let code = null, payload = null;
  const res = { status(c) { code = c; return this; }, json(o) { payload = o; return this; } };
  await handler(req, res);
  return { calls, code, payload };
}

// A — a fresh (Lead) job: advances to Approved AND buzzes Curtis
const a = await run('Lead');
const aApprovePatch = a.calls.find(c => c.method === 'PATCH' && /\/projects\?id=eq\.p1$/.test(c.url) && c.body && c.body.stage === 'Approved');
const aCurtis = a.calls.find(c => c.method === 'POST' && c.url.includes('resend.com') && c.body && /schedule \+ order materials/.test(c.body.subject || ''));
need('A: signing succeeds (200)', a.code === 200, 'code=' + a.code);
need('A: job advanced to Approved', !!aApprovePatch);
need('A: Curtis alerted to schedule + order materials', !!aCurtis, 'no matching Resend email');
need('A: the alert is addressed to Curtis', !!(aCurtis && (aCurtis.body.to || []).includes('curtis@cardinalrenovations.net')), aCurtis ? JSON.stringify(aCurtis.body.to) : 'n/a');

// B — a job already Scheduled: no backward move, no false Curtis buzz
const b = await run('Scheduled');
const bApprovePatch = b.calls.find(c => c.method === 'PATCH' && /\/projects\?id=eq\.p1$/.test(c.url) && c.body && c.body.stage === 'Approved');
const bCurtis = b.calls.find(c => c.method === 'POST' && c.url.includes('resend.com') && c.body && /schedule \+ order materials/.test(c.body.subject || ''));
need('B: signing still succeeds (200)', b.code === 200, 'code=' + b.code);
need('B: already-scheduled job is NOT pulled back to Approved', !bApprovePatch);
need('B: Curtis is NOT buzzed on an already-scheduled job', !bCurtis);

try { (await import('fs')).unlinkSync(TMP); } catch (_) {}
if (fails.length) { console.log('gate_1007 FAIL  ' + passes + ' pass / ' + fails.length + ' fail'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('gate_1007 PASS  ' + passes + '/' + passes);
