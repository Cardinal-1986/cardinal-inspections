/* gate_1377 — an insurance invoice carries no pay link for now (audit W7 insurance half; Theo "2 then 1").
 *   A  the job card: an insurance invoice's Send row says why, with no send buttons; retail keeps its three
 *   B  the Invoices module's one link maker refuses an insurance job (so Copy / Text / Email / Remind all stop)
 *      and still makes one for retail
 *   C  the editor: Share link on an insurance invoice says why and mints/prompts nothing
 *   D  api/share.js: an insurance invoice shows the document with NO pay bar; a retail invoice still has one
 *   E  api/pay.js: an insurance invoice is refused with no checkout; retail still reaches checkout
 *   F  api/sms-link.js: an insurance job is refused, Twilio never called; retail still texts
 *   G  (1376 gap) the editor's Text on a Community invoice fills in no number (shipped source)
 * Arg: [index.html] [api dir] -> negative control (1376 + its api: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APIDIR = process.argv[3] || '/home/user/cardinal-inspections/api';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

const P = (id, ct) => ({ id, name: 'Client ' + id, stage: 'Completed', address: '1 Main St', phone: '9375550101', email: 'c@example.com',
  checklist: JSON.stringify({ lead: { claim_type: ct } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const C = (pid) => ({ id: 'c' + pid, project_id: pid, title: 'Contract — ' + pid, total: 9000, signed_at: '2026-09-01T12:00:00Z', html: '<p>x</p>', status: 'signed', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const I = (pid) => ({ id: 'i' + pid, project_id: pid, title: 'Invoice — ' + pid, total: 9000, html: '<html><body><p>invoice</p></body></html>', status: 'unsent', share_token: 'aaaaaaaa-bbbb-cccc-dddd-0000000000' + pid, created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z' });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('r1', 'retail'), P('n1', 'insurance')],
  inspection_reports: [C('r1'), I('r1'), C('n1'), I('n1')],
  collections: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const prompts = [];
  page.on('dialog', d => { prompts.push(d.message()); d.dismiss().catch(() => {}); });
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.waitForTimeout(1500); await settle(page);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });

  const row = id => page.evaluate(async id => {
    openProject(id); await new Promise(r => setTimeout(r, 1300));
    const sr = document.querySelector('#projectView [data-sendrow]');
    return sr ? { btns: sr.querySelectorAll('button').length, note: (sr.querySelector('.crji-insnote') || {}).textContent || '' } : null;
  }, id);
  const rr = await row('r1'), nr = await row('n1');
  ok(rr && rr.btns === 3 && !rr.note, 'A: retail invoice keeps its three sends', JSON.stringify(rr));
  /* 1378 (Theo "then 1") moved the decision to the link maker: an insurance invoice shows its sends again, and B-F
     prove that one with no homeowner's part on its contract still sends nothing. Before 1378 this was "no buttons". */
  const _post1378 = /async function crInsPart\(pr\)/.test(APP_HTML);
  ok(nr && (_post1378 ? nr.btns === 3 : (nr.btns === 0 && /by hand/i.test(nr.note))), 'A: insurance invoice Send row (1377: a note; 1378+: the sends, checked by the link maker)', JSON.stringify(nr));

  const link = id => page.evaluate(id => window.CardinalAR.payLink(id).then(u => ({ url: u }), e => ({ err: String(e && e.message || e) })), id);
  const lr = await link('r1'), ln = await link('n1');
  ok(lr.url && /\/api\/share\?t=/.test(lr.url), 'B: retail still gets a pay link', JSON.stringify(lr));
  ok(!ln.url && /by hand/i.test(ln.err || ''), 'B: insurance gets no pay link, and says why', JSON.stringify(ln));

  prompts.length = 0;
  const ed = await page.evaluate(async () => {
    let msg = ''; const orig = window.crTell; window.crTell = function (m) { msg = String(m); try { return orig.apply(this, arguments); } catch (_) {} };
    try { await openEditor('in1'); } catch (_) {}
    await new Promise(r => setTimeout(r, 1500));
    const b = document.getElementById('shareBtn'); if (b) b.click();
    await new Promise(r => setTimeout(r, 1500));
    window.crTell = orig; return msg;
  });
  ok(/by hand/i.test(ed) && prompts.length === 0, 'C: editor Share link on an insurance invoice says why, prompts no link', JSON.stringify({ msg: ed, prompts }));
  await ctx.close();
} catch (e) { ok(false, 'browser part ran', String(e && e.message || e)); }
await browser.close();

/* ---- the server routes, executed with a fake PostgREST ---- */
const procEnv = { SUPABASE_SERVICE_ROLE_KEY: 'srk', STRIPE_SECRET_KEY: 'sk' };
const fakeDb = (ct) => async (url) => {
  url = String(url);
  const J = v => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
  if (url.includes('share_token=eq.')) return J([{ id: 'd1', project_id: 'p1', project: 'Job', title: 'Invoice — Job', total: 9000, html: '<html><body><p>invoice</p></body></html>', signed_at: null }]);
  if (url.includes('/collections')) return J([]);
  if (url.includes('/inspection_reports?project_id')) return J([{ title: 'Contract — Job', total: 9000, signed_at: '2026-09-01' }]);
  if (url.includes('/contracts')) return J([]);
  if (url.includes('/estimates')) return J([]);
  if (url.includes('/projects')) return J([{ checklist: JSON.stringify({ lead: { claim_type: ct } }) }]);
  return J([]);
};
const mkRes = () => { const res = { code: 0, body: '', headers: {} };
  res.status = c => { res.code = c; return res; }; res.send = b => { res.body = String(b ?? ''); return res; };
  res.json = b => { res.body = JSON.stringify(b); return res; }; res.setHeader = (k, v) => { res.headers[k] = v; };
  res.writeHead = (c, h) => { res.code = c; Object.assign(res.headers, h || {}); }; res.end = () => {}; return res; };
const load = (text, params) => new AsyncFunction(...params, text
  .replace(/^import\s+Stripe\s+from\s+'stripe';\s*$/m, '')
  .replace(/^export default async function handler/m, 'async function handler')
  .replace(/^export\s*\{[^}]*\};?.*$/m, '')
  .replace(/^export\s+(async\s+)?function\s+/mg, '$1function ') + '\nreturn handler;');
const TOK = 'abcdef0123456789abcdef01';

// D: share.js
{
  const src = fs.readFileSync(path.join(APIDIR, 'share.js'), 'utf8');
  const run = async ct => { const h = await load(src, ['fetch', 'process'])(fakeDb(ct), { env: procEnv }); const res = mkRes(); await h({ query: { t: TOK }, headers: { host: 'app.test' } }, res); return res; };
  const r = await run('retail'), n = await run('insurance');
  ok(r.code === 200 && r.body.includes('/api/pay?t='), 'D: retail invoice page has the pay bar', 'http ' + r.code);
  ok(n.code === 200 && n.body.includes('invoice') && !n.body.includes('/api/pay?t='), 'D: insurance invoice page shows the document with no pay bar', 'http ' + n.code + ' pay=' + n.body.includes('/api/pay?t='));
}
// E: pay.js
{
  const src = fs.readFileSync(path.join(APIDIR, 'pay.js'), 'utf8'); const made = [];
  class StripeStub { constructor() { this.checkout = { sessions: { create: async o => { made.push(o); return { url: 'https://checkout.test/s' }; } } }; this.paymentIntents = { search: async () => ({ data: [] }) }; } }
  const run = async ct => { made.length = 0; const h = await load(src, ['Stripe', 'fetch', 'process'])(StripeStub, fakeDb(ct), { env: procEnv }); const res = mkRes(); await h({ query: { t: TOK }, headers: { host: 'app.test' } }, res); return { code: res.code, body: res.body, made: made.length }; };
  const r = await run('retail'), n = await run('insurance');
  ok(r.code === 303 && r.made === 1, 'E: retail invoice still reaches checkout', JSON.stringify(r).slice(0, 160));
  ok(n.code === 400 && n.made === 0 && /not paid online/i.test(n.body), 'E: insurance invoice is refused, no checkout made', JSON.stringify(n).slice(0, 200));
}
// F: sms-link.js
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'g1377-')); const f = path.join(tmp, 'sms.mjs'); fs.copyFileSync(path.join(APIDIR, 'sms-link.js'), f); try { fs.copyFileSync(path.join(APIDIR, '_staff.js'), path.join(tmp, '_staff.js')); } catch (_) {}   /* 1407: sms-link imports it */
  const mod = await import('file://' + f);
  process.env.TWILIO_ACCOUNT_SID = 'ACgate0000000000000000000000000000'; process.env.TWILIO_AUTH_TOKEN = 'gate-token'; process.env.TWILIO_FROM = '+19375550000';
  const run = async ct => { let tw = 0; const real = global.fetch;
    global.fetch = async u => { u = String(u);
      if (u.includes('/auth/v1/user')) return { ok: true, json: async () => ({ email: 'theo@cardinalrenovations.net' }) };
      if (u.includes('/rest/v1/projects')) return { ok: true, json: async () => ([{ id: 'p', name: 'Client P', phone: '9375550101', checklist: JSON.stringify({ lead: { claim_type: ct } }) }]) };
      if (u.includes('twilio.com')) { tw++; return { ok: true, status: 201, json: async () => ({ sid: 'SM' }), text: async () => '{}' }; }
      return { ok: true, json: async () => ({}), text: async () => '' }; };
    let out = null; const res = { status() { return this; }, json(j) { out = j; return this; } };
    try { await mod.default({ method: 'POST', headers: { authorization: 'Bearer x', host: 'app.cardinalroster.com' }, body: { project_id: 'p', url: 'https://app.cardinalroster.com/api/share?t=abcdefgh1234' } }, res); }
    finally { global.fetch = real; }
    return { out, tw }; };
  const r = await run('retail'), n = await run('insurance');
  ok(r.tw === 1, 'F: retail still texts', JSON.stringify(r));
  ok(n.tw === 0 && n.out && n.out.reason === 'insurance', 'F: insurance is refused, Twilio never called', JSON.stringify(n));
}
// G: the editor's Text on a Community invoice
ok(/projClaimType\(proj\) === 'community'\)\{ tel = '';/.test(APP_HTML), 'G: editor Text on a Community invoice fills in no number (source)');

console.log(fail ? `GATE 1377 RED — ${pass} passed, ${fail} failed` : `GATE 1377 GREEN — ${pass} passed`);
process.exit(fail ? 1 : 0);
