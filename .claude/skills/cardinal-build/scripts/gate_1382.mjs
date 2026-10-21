/* gate_1382 — appointment reminders by text.
 * A (route, api/appt-remind.js, stubbed fetch, a fake Twilio and a fake database):
 *   A1 the 6:50am run texts each person ONE list of their day — booker, the job's rep (sales_rep and
 *      lead.assigned) and, on a build day, Production; never the client; nobody without a number
 *   A2 the same morning run again sends no second list (the audit_events mark)
 *   A3 the 12:50 run texts the 2:00 appointment to its people, with directions, and claims it
 *   A4 a claimed appointment is not texted again; a MOVED one (new time) is
 *   A5 quiet hours: the 10pm run texts nobody; a bad cron secret is refused
 * B (app, Chromium): booking an appointment sends one alert to the booker and the job's rep; moving it
 *   sends "Appointment moved"; a build day leaves Curtis and Scottie to Production's own buzz.
 * Arg: [index.html] -> negative control (1381: B must go RED; A needs the route file and reports it missing). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const ROOT = '/home/user/cardinal-inspections/';
const FILE = process.argv[2] || ROOT + 'index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

// ---------------------------------------------------------------- A: the route
const ROUTE = path.join(ROOT, 'api', 'appt-remind.js');
if (!fs.existsSync(ROUTE) || process.argv[3] === '--no-route') {
  ok(false, 'A: api/appt-remind.js exists', 'missing');
} else {
  const src = fs.readFileSync(ROUTE, 'utf8');
  const load = () => new AsyncFunction('fetch', 'process', src
    .replace(/^export default async function handler/m, 'async function handler') + '\nreturn handler;');
  const DAY = '2026-10-22';
  const mkDb = () => ({
    appointments: [
      { id: 'a1', title: 'Inspection', appt_date: DAY, appt_time: '14:00', project_id: 'p1', kind: 'appt', created_by: 'theo@cardinalrenovations.net', reminded_for: null },
      { id: 'a2', title: 'Build day', appt_date: DAY, appt_time: '08:00', project_id: 'p2', kind: 'job', created_by: 'joan@cardinalrenovations.net', reminded_for: null },
      { id: 'a3', title: 'Call back', appt_date: DAY, appt_time: null, project_id: null, kind: 'appt', created_by: 'nick@cardinalrenovations.net', reminded_for: null }],
    projects: [
      { id: 'p1', name: 'Sample Client', address: '1 Main St, Dayton, OH', sales_rep: 'rep@cardinalrenovations.net', checklist: JSON.stringify({ lead: { assigned: ['joey@cardinalrenovations.net'] } }) },
      { id: 'p2', name: 'Other Client', address: '2 Oak St', sales_rep: null, checklist: '{}' }],
    team_profiles: [
      { email: 'theo@cardinalrenovations.net', phone: '937-555-0001' }, { email: 'rep@cardinalrenovations.net', phone: '(937) 555-0002' },
      { email: 'joey@cardinalrenovations.net', phone: '9375550003' }, { email: 'joan@cardinalrenovations.net', phone: '9375550004' },
      { email: 'curtis@cardinalrenovations.net', phone: '9375550005' }, { email: 'scottie@cardinalrenovations.net', phone: '9375550006' },
      { email: 'nick@cardinalrenovations.net', phone: '' }],
    audit_events: [], texts: [] });
  const fakeFetch = db => async (url, opt = {}) => {
    const u = new URL(url), m = (opt.method || 'GET').toUpperCase(), J = (b, s = 200) => ({ ok: s < 300, status: s, json: async () => b, text: async () => JSON.stringify(b) });
    if (u.host === 'api.twilio.com') { const p = new URLSearchParams(opt.body); db.texts.push({ to: p.get('To'), body: p.get('Body') }); return J({ sid: 'SM1' }, 201); }
    const t = u.pathname.split('/').pop();
    if (t === 'appointments' && m === 'GET') return J(db.appointments.filter(a => a.appt_date === u.searchParams.get('appt_date').replace('eq.', '')));
    if (t === 'appointments' && m === 'PATCH') {
      const id = u.searchParams.get('id').replace('eq.', ''), body = JSON.parse(opt.body), a = db.appointments.find(x => x.id === id);
      if (!a || a.reminded_for === body.reminded_for) return J([]);
      Object.assign(a, body); return J([a]);
    }
    if (t === 'projects') { const ids = u.searchParams.get('id').replace(/^in\.\(|\)$/g, '').split(','); return J(db.projects.filter(p => ids.includes(p.id))); }
    if (t === 'team_profiles') return J(db.team_profiles);
    if (t === 'audit_events' && m === 'GET') { const pre = u.searchParams.get('detail').replace(/^like\./, '').replace(/\*$/, ''); return J(db.audit_events.filter(e => e.type === u.searchParams.get('type').replace('eq.', '') && e.detail.startsWith(pre))); }
    if (t === 'audit_events' && m === 'POST') { db.audit_events.push(JSON.parse(opt.body)); return J(null, 201); }
    return J({ error: 'unexpected ' + m + ' ' + u.pathname }, 404);
  };
  const env = { env: { CRON_SECRET: 's3cret', SUPABASE_SERVICE_ROLE_KEY: 'srk', TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 'tok', TWILIO_MESSAGING_SERVICE_SID: 'MG1' } };
  const mkRes = () => { const r = { code: 0, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
  // the route reads the real clock; pin it by swapping Date for the run (dry runs take ?now=, live runs do not)
  const runAt = async (db, iso, auth = 'Bearer s3cret') => {
    const RealDate = Date, fixed = new RealDate(iso).getTime();
    globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
    try { const h = await load()(fakeFetch(db), env); const res = mkRes(); await h({ query: {}, headers: { authorization: auth } }, res); return res; }
    finally { globalThis.Date = RealDate; }
  };
  const db = mkDb();
  // 6:50am EDT on the 22nd = 10:50 UTC
  const r1 = await runAt(db, DAY + 'T10:50:00Z');
  const byTo = {}; db.texts.forEach(t => { (byTo[t.to] = byTo[t.to] || []).push(t.body); });
  ok(r1.code === 200 && r1.body.morning.due === true, 'A1: the 6:50am run sends the morning list', JSON.stringify(r1.body && r1.body.morning));
  ok(byTo['+19375550001'] && byTo['+19375550001'].length === 1 && /2:00 PM Inspection — Sample Client, 1 Main St/.test(byTo['+19375550001'][0]),
    'A1: the booker gets ONE text naming their appointment', JSON.stringify(byTo['+19375550001']));
  ok(byTo['+19375550002'] && byTo['+19375550003'], 'A1: the job\'s rep (sales_rep) and the assigned rep get it too', Object.keys(byTo).join(','));
  ok(byTo['+19375550005'] && byTo['+19375550006'] && /8:00 AM Build day/.test(byTo['+19375550005'][0]), 'A1: Production gets the build day');
  ok(!byTo['+19375550101'] && Object.keys(byTo).length === 6, 'A1: six team phones, no client, nobody without a number', Object.keys(byTo).length);
  const n1 = db.texts.length;
  const r2 = await runAt(db, DAY + 'T10:50:30Z');
  ok(db.texts.length === n1 && r2.body.morning.due === false, 'A2: a second morning run sends no second list', (db.texts.length - n1) + ' new');
  // 12:50pm EDT = 16:50 UTC: the 2:00 inspection is 70 minutes out
  db.texts.length = 0;
  const r3 = await runAt(db, DAY + 'T16:50:00Z');
  const to3 = db.texts.map(t => t.to).sort();
  ok(r3.body.ahead.texted === 3 && JSON.stringify(to3) === JSON.stringify(['+19375550001', '+19375550002', '+19375550003']),
    'A3: the hour-ahead text goes to the booker and both reps', JSON.stringify(to3));
  ok(db.texts[0] && /coming up at 2:00 PM: Inspection with Sample Client/.test(db.texts[0].body) && /maps\.google\.com\/\?q=1%20Main%20St/.test(db.texts[0].body),
    'A3: it names the time, the client and a directions link', db.texts[0] && db.texts[0].body);
  ok(db.appointments[0].reminded_for === DAY + ' 14:00', 'A3: and claims the appointment', db.appointments[0].reminded_for);
  db.texts.length = 0;
  await runAt(db, DAY + 'T16:55:00Z');
  ok(db.texts.length === 0, 'A4: a claimed appointment is not texted twice', db.texts.length + ' texts');
  db.appointments[0].appt_time = '15:00';   // moved
  await runAt(db, DAY + 'T17:50:00Z');
  ok(db.texts.length === 3 && /3:00 PM/.test(db.texts[0].body), 'A4: moved to 3:00, it is reminded again for the new time', db.texts.length + ' texts');
  db.texts.length = 0;
  const r5 = await runAt(db, DAY + 'T02:10:00Z');   // 10:10pm the night before
  ok(db.texts.length === 0 && r5.body.quiet === true, 'A5: quiet hours text nobody', JSON.stringify({ quiet: r5.body.quiet, texts: db.texts.length }));
  const r6 = await runAt(db, DAY + 'T16:50:00Z', 'Bearer wrong');
  ok(r6.code === 401 && db.texts.length === 0, 'A5: a bad cron secret is refused', 'http ' + r6.code);
}

// ---------------------------------------------------------------- B: the app
const P = (id, rep, asg) => ({ id, name: 'Client ' + id, stage: 'Lead', address: '1 Main St', phone: '9375550101', email: 'c@example.com', sales_rep: rep,
  checklist: JSON.stringify({ lead: { claim_type: 'retail', assigned: asg } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('p1', 'rep@cardinalrenovations.net', ['joey@cardinalrenovations.net'])],
  appointments: [], collections: [], inspection_reports: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.dismiss().catch(() => {}));
  const notes = [];
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/notify')) { try { notes.push(JSON.parse(route.request().postData() || '{}')); } catch (_) {} return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"sent":1}' }); }
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page); await page.waitForTimeout(1500); await settle(page);
  const has = await page.evaluate(() => typeof adb === 'object' && typeof adb.create === 'function');
  ok(has, 'fixture: the appointment data layer is reachable');
  if (has) {
    await page.evaluate(async () => { await adb.create({ title: 'Inspection', appt_date: '2026-10-22', appt_time: '14:00', project_id: 'p1', notes: null, kind: 'appt' }); });
    await page.waitForTimeout(1200);
    const booked = notes.filter(n => /Appointment booked/.test(n.title || ''));
    const to = booked[0] ? (booked[0].emails || []).slice().sort() : [];
    ok(booked.length === 1, 'B: booking sends one "Appointment booked" alert', notes.map(n => n.title).join(' | ') || 'none');
    ok(JSON.stringify(to) === JSON.stringify(['joey@cardinalrenovations.net', 'rep@cardinalrenovations.net', 'theo@cardinalrenovations.net']),
      'B: to the booker and both of the job\'s reps', JSON.stringify(to));
    ok(booked[0] && /Thu, Oct 22 at 2:00 PM/.test(booked[0].title) && /1 Main St/.test(booked[0].body || ''), 'B: it says what, when and where', booked[0] && booked[0].title);
    notes.length = 0;
    const id = await page.evaluate(async () => { const l = await adb.list(); window.cacheAppts = l; const a = l.find(x => x.title === 'Inspection'); return a && a.id; });
    await page.evaluate(async i => { await adb.update(i, { appt_time: '15:00' }); }, id);
    await page.waitForTimeout(1200);
    ok(notes.some(n => /Appointment moved — Inspection, Thu, Oct 22 at 3:00 PM/.test(n.title || '')), 'B: moving it sends "Appointment moved" with the new time', notes.map(n => n.title).join(' | ') || 'none');
    notes.length = 0;
    await page.evaluate(async () => { await adb.update((await adb.list()).find(x => x.title === 'Inspection').id, { notes: 'gate code 1234' }); });
    await page.waitForTimeout(900);
    ok(!notes.some(n => /Appointment (booked|moved)/.test(n.title || '')), 'B: editing only the notes sends nothing', notes.map(n => n.title).join(' | ') || 'none');
    notes.length = 0;
    await page.evaluate(async () => { await adb.create({ title: 'Build day', appt_date: '2026-10-23', appt_time: '08:00', project_id: 'p1', notes: null, kind: 'job' }); });
    await page.waitForTimeout(1200);
    const b2 = notes.filter(n => /Appointment booked/.test(n.title || ''))[0];
    const prod = notes.filter(n => /Build day set/.test(n.title || ''))[0];
    ok(b2 && !(b2.emails || []).some(e => /curtis|scottie/.test(e)) && prod && (prod.emails || []).some(e => /curtis/.test(e)),
      'B: a build day leaves Curtis and Scottie to Production\'s own buzz (no double alert)', JSON.stringify({ booked: b2 && b2.emails, prod: prod && prod.emails }));
  }
  await ctx.close();
} catch (e) { ok(false, 'browser part ran', String(e && e.message || e)); }
await browser.close();
console.log(fail ? `GATE 1382 RED — ${pass} passed, ${fail} failed` : `GATE 1382 GREEN — ${pass} passed`);
process.exit(fail ? 1 : 0);
