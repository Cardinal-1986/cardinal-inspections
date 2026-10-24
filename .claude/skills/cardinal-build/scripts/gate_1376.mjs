/* gate_1376 — a Community invoice goes to the funding partner, never the occupant (audit W7, Community half).
 *   A  the Send row: a Community invoice has no Company text (it texts the occupant's phone); retail keeps it
 *   B  a Company text tap on a Community invoice (a stale page) says why and calls nothing
 *   C  a new Community invoice prints the partner and NOT the occupant's phone/email; retail prints the client's
 *   D  My phone / Email greet "Hello" on Community, "Hi <first>" on retail (the shipped module source)
 *   E  api/sms-link.js refuses a Community job server-side and never reaches Twilio; a retail job still does
 * Arg: [index.html] [api/sms-link.js] -> negative control (1375 + its sms-link: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const API = process.argv[3] || '/home/user/cardinal-inspections/api/sms-link.js';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
const OCC_PHONE = '9375550142', OCC_MAIL = 'occupant@example.com';
const P = (id, stage, ct) => ({ id, name: (ct === 'community' ? 'Occupant ' : 'Client ') + id, stage, address: '1 Main St',
  phone: ct === 'community' ? OCC_PHONE : '9375550101', email: ct === 'community' ? OCC_MAIL : 'client@example.com',
  checklist: JSON.stringify({ lead: ct === 'community' ? { claim_type: 'community', partner_name: 'Sample Partner' } : { claim_type: 'retail' } }),
  created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const C = (pid) => ({ id: 'c' + pid, project_id: pid, title: 'Contract — ' + pid, total: 9000, signed_at: '2026-09-01T12:00:00Z', html: '<p>x</p>', status: 'signed', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const I = (pid) => ({ id: 'i' + pid, project_id: pid, title: 'Invoice — ' + pid, total: 9000, html: '<p>i</p>', status: 'unsent', share_token: 'aaaaaaaa-bbbb-cccc-dddd-00000000' + pid, created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z' });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('r1', 'Completed', 'retail'), P('m1', 'Completed', 'community'), P('r2', 'Completed', 'retail'), P('m2', 'Completed', 'community')],
  inspection_reports: [C('r1'), I('r1'), C('m1'), I('m1'), C('r2'), C('m2')],
  collections: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const smsCalls = [];
async function boot(){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.includes('/api/sms-link')) { smsCalls.push(url); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
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
  return { ctx, page };
}
const sendRow = (page, id) => page.evaluate(async id => {
  openProject(id); await new Promise(r => setTimeout(r, 1300));
  const sm = document.querySelector('#projectView [data-inv-sendmenu]'); if (sm) sm.click();
  await new Promise(r => setTimeout(r, 200));
  const row = document.querySelector('#projectView [data-sendrow]');
  return row ? { sms: !!row.querySelector('[data-inv-sms]'), text: !!row.querySelector('[data-inv-text]'), email: !!row.querySelector('[data-inv-email]') } : null;
}, id);

try {
  const { ctx, page } = await boot();
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  const rr = await sendRow(page, 'r1'), mr = await sendRow(page, 'm1');
  ok(rr && rr.sms && rr.text && rr.email, 'A: retail invoice keeps Company text, My phone, Email', JSON.stringify(rr));
  ok(mr && !mr.sms && mr.text && mr.email, 'A: Community invoice has no Company text; My phone and Email stay', JSON.stringify(mr));

  // B: a stale Company text button on the Community card
  smsCalls.length = 0;
  const tell = await page.evaluate(async () => {
    openProject('m1'); await new Promise(r => setTimeout(r, 1200));
    const card = document.querySelector('#projectView .crji-card');
    const b = document.createElement('button'); b.setAttribute('data-inv-sms', 'm1'); card.appendChild(b);
    let msg = ''; const orig = window.crTell; window.crTell = function(m){ msg = String(m); try { return orig.apply(this, arguments); } catch (_) {} };
    b.click(); await new Promise(r => setTimeout(r, 900)); window.crTell = orig; return msg;
  });
  ok(/funding partner/i.test(tell) && smsCalls.length === 0, 'B: a stale Company text on Community says why and sends nothing', JSON.stringify({ tell, calls: smsCalls.length }));

  // C: create the invoice and read what it printed
  const made = async id => page.evaluate(async id => {
    const pr = cacheProjects.find(p => p.id === id); await createInvoiceFor(pr); await new Promise(r => setTimeout(r, 900));
    try { closeEditor && closeEditor(); } catch (_) {}
    const row = (window.cacheRows || []).filter(r => r.project_id === id && /^invoice/i.test(r.title || '')).pop();
    return row ? String(row.html || row.content || '') : '';
  }, id);
  const mh = await made('m2'), rh = await made('r2');
  ok(mh.length > 0 && mh.includes('Sample Partner') && !mh.includes(OCC_PHONE) && !mh.includes(OCC_MAIL), 'C: Community invoice names the partner and prints no occupant phone/email',
     JSON.stringify({ len: mh.length, partner: mh.includes('Sample Partner'), phone: mh.includes(OCC_PHONE), mail: mh.includes(OCC_MAIL) }));
  ok(rh.length > 0 && rh.includes('9375550101') && rh.includes('client@example.com'), 'C: retail invoice still prints the client\'s phone and email', JSON.stringify({ len: rh.length }));
  await ctx.close();
} catch (e) { ok(false, 'browser part ran', String(e && e.message || e)); }
await browser.close();

// D: the shipped module — both client-side sends greet through invHello(), which is Hello on Community
{
  const i = APP_HTML.indexOf("'data-inv-text'"), blk = i > 0 ? APP_HTML.slice(i, i + 4000) : '';
  ok(/function invHello\(pr\)\{ return invIsComm\(pr\) \? 'Hello' : 'Hi ' \+ firstName\(pr\); \}/.test(APP_HTML), 'D: invHello() says Hello on Community, Hi <first> otherwise');
  ok(/encodeURIComponent\(invHello\(px\)/.test(APP_HTML) && /encodeURIComponent\(invHello\(pe\)/.test(APP_HTML) && !/encodeURIComponent\('Hi ' \+ firstName\(p[xe]\)/.test(APP_HTML), 'D: My phone and Email both greet through invHello()');
  void blk;
}

// E: the server route, executed with a stubbed fetch
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'g1376-')); const f = path.join(tmp, 'sms-link.mjs'); fs.copyFileSync(API, f);
  try { fs.copyFileSync(path.join(path.dirname(API), '_staff.js'), path.join(tmp, '_staff.js')); } catch (_) {}   // 1407 imports it
  const mod = await import('file://' + f);
  process.env.TWILIO_ACCOUNT_SID = 'ACgate0000000000000000000000000000'; process.env.TWILIO_AUTH_TOKEN = 'gate-token'; process.env.TWILIO_FROM = '+19375550000';
  const run = async (ct) => {
    let twilio = 0; const realFetch = global.fetch;
    global.fetch = async (u) => {
      u = String(u);
      if (u.includes('/auth/v1/user')) return { ok: true, json: async () => ({ email: 'theo@cardinalrenovations.net' }) };
      if (u.includes('/rest/v1/projects')) return { ok: true, json: async () => ([{ id: 'p', name: 'Occupant P', phone: OCC_PHONE, checklist: JSON.stringify({ lead: { claim_type: ct } }) }]) };
      if (u.includes('twilio.com')) { twilio++; return { ok: true, status: 201, json: async () => ({ sid: 'SMgate' }), text: async () => '{}' }; }
      return { ok: true, json: async () => ({}), text: async () => '' };
    };
    let out = null; const res = { status(c) { this.c = c; return this; }, json(j) { out = j; return this; } };
    try { await mod.default({ method: 'POST', headers: { authorization: 'Bearer x', host: 'app.cardinalroster.com' }, body: { project_id: 'p', url: 'https://app.cardinalroster.com/api/share?t=abcdefgh1234' } }, res); }
    finally { global.fetch = realFetch; }
    return { out, twilio };
  };
  const m = await run('community'), r = await run('retail');
  ok(m.out && m.out.ok === false && m.out.reason === 'community' && m.twilio === 0, 'E: sms-link refuses a Community job and never calls Twilio', JSON.stringify(m));
  ok(r.twilio === 1, 'E: a retail job still reaches Twilio', JSON.stringify(r));
}
console.log(fail ? `GATE 1376 RED — ${pass} passed, ${fail} failed` : `GATE 1376 GREEN — ${pass} passed`);
process.exit(fail ? 1 : 0);
