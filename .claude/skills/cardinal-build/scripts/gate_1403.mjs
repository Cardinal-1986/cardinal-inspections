/* gate_1403 — scheduling, notifications, offline.
 *   A  an offline job edit, synced, keeps a teammate's change to another key of the same job
 *   B  appt-remind texts the job's rep about job / drop appointments, never a personal one (Theo, pick 1)
 *   C  the booking alert reaches the rep for a job appointment, not a personal one; all-day promises no hour-before text
 *   D  booking with no signal says so, not "run the migration"
 *   E  the calendar's Next line skips an appointment already over today; local-day helpers
 * Args: [index.html] [api/appt-remind.js] -> negative control (1402 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const AR = process.argv[3] || '/home/user/cardinal-inspections/api/appt-remind.js';
import fs from 'fs';
const SRC = fs.readFileSync(process.env.APPFILE, 'utf8');
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

/* A, C, E — in the app */
{
  const seed = `(function(){ var S=window.__SEED__; S.projects.find(p=>p.id==='R1').stage='Prospect'; })();`;
  const NET = `(function(){ var t=setInterval(function(){ var c=window.sb||window.supa; if(!c||!c.from) return; clearInterval(t);
    var q=c.from('projects'); var P=Object.getPrototypeOf(q); if(P.__p) return; var o=P.then; P.__p=1;
    P.then=function(res,rej){ if(window.__NET_DOWN__){ return Promise.resolve({data:null,error:{message:'TypeError: Failed to fetch'}}).then(res,rej);} return o.call(this,res,rej); }; },20); })();`;
  const down = { v: true };
  const { browser, ctx, page } = await boot('theo', { seed: seed + NET, desktop: true, instr: false, apiDown: down });
  try {
    await ctx.setOffline(true);
    await page.evaluate(async () => { window.__NET_DOWN__ = true; await setStage('R1', 'Approved'); await new Promise(r => setTimeout(r, 800)); });
    await page.evaluate(() => { const p = window.__SEED__.projects.find(p => p.id === 'R1'); const ck = JSON.parse(p.checklist); ck.teammate = 'kept'; p.checklist = JSON.stringify(ck); });
    down.v = false; await ctx.setOffline(false);
    await page.evaluate(() => { window.__NET_DOWN__ = false; window.dispatchEvent(new Event('online')); });
    await page.waitForTimeout(6000);
    const r = await page.evaluate(() => { const p = window.__SEED__.projects.find(p => p.id === 'R1'); const ck = JSON.parse(p.checklist); return { stage: p.stage, teammate: ck.teammate || null }; });
    ok(r.stage === 'Approved' && r.teammate === 'kept', 'A  an offline edit, synced, keeps a teammate’s change to the same job', JSON.stringify(r));

    const c = await page.evaluate(() => {
      const sent = []; const keep = window.notifyTeam;
      window.notifyTeam = (to, subj, html) => { sent.push({ to, html }); return Promise.resolve({ ok: true }); };
      const pr = cacheProjects.find(p => p.id === 'R1');
      __apptNotifyBooked({ kind: 'appt', title: 'Private', appt_date: '2026-10-26', appt_time: '10:00', project_id: 'R1', created_by: 'theo@cardinalrenovations.net' }, false);
      __apptNotifyBooked({ kind: 'job', title: 'Build', appt_date: '2026-10-27', appt_time: null, project_id: 'R1', created_by: 'theo@cardinalrenovations.net' }, false);
      window.notifyTeam = keep;
      return { rep: String(pr.sales_rep || '').toLowerCase(), sent };
    });
    const priv = c.sent[0] || { to: [] }, job = c.sent[1] || { to: [], html: '' };
    ok(c.rep && !priv.to.includes(c.rep) && job.to.includes(c.rep), 'C1 the rep hears about the job appointment, not the personal one', JSON.stringify(c.sent.map(x => x.to)));
    ok(!/hour before/.test(job.html), 'C2 an all-day booking promises no hour-before text', (job.html.match(/You will[^<]*/) || [''])[0]);

    const e = await page.evaluate(() => {
      const n = new Date(); const ds = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      const t = new Date(n.getTime() + 86400000);
      cacheAppts = [{ id: 'x1', title: 'Already over', appt_date: ds(n), appt_time: '00:00' }, { id: 'x2', title: 'Tomorrow', appt_date: ds(t), appt_time: '09:00' }];
      renderUpcoming(); const el = document.getElementById('apptUpcoming'); return el ? el.textContent : 'none';
    });
    ok(/Tomorrow/.test(e) && !/Already over/.test(e), 'E1 the Next line skips one already over today', e);
  } finally { await browser.close(); }
}

/* B — the cron route, stubbed */
{
  process.env.CRON_SECRET = 'x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub'; process.env.TWILIO_ACCOUNT_SID = 'ACtest'; process.env.TWILIO_AUTH_TOKEN = 't'; process.env.TWILIO_FROM = '+19375550000';
  const mod = await import(AR);
  const run = (nowISO, appts) => {
    const sms = [];
    globalThis.fetch = async (url, o = {}) => {
      const u = String(url); const J = x => ({ ok: true, status: 200, json: async () => x, text: async () => JSON.stringify(x) });
      if (u.includes('/rest/v1/appointments?appt_date')) return J(appts);
      if (u.includes('/rest/v1/appointments?id=eq.')) return J([{ id: 1 }]);
      if (u.includes('/rest/v1/projects')) return J([{ id: 'P1', name: 'Sample Client', address: '1 Main St', sales_rep: 'rep@cardinalrenovations.net', checklist: '{}' }]);
      if (u.includes('/rest/v1/team_profiles')) return J([{ email: 'theo@cardinalrenovations.net', phone: '9375550101' }, { email: 'rep@cardinalrenovations.net', phone: '9375550102' }]);
      if (u.includes('twilio')) { const p = new URLSearchParams(o.body); sms.push(p.get('To')); return J({}); }
      return J([]);
    };
    const RD = Date, fixed = new RD(nowISO).getTime();
    globalThis.Date = class extends RD { constructor(...a) { if (a.length === 0) super(fixed); else super(...a); } static now() { return fixed; } };
    return new Promise(res => { const ro = { code: 0, status(c) { this.code = c; return this; }, json(b) { globalThis.Date = RD; res(sms); } };
      mod.default({ headers: { authorization: 'Bearer x' }, query: {} }, ro); });
  };
  const mk = kind => [{ id: 1, title: 'Sample', appt_date: '2026-10-23', appt_time: '14:00:00', project_id: 'P1', kind, created_by: 'theo@cardinalrenovations.net', reminded_for: null }];
  const REP = '+19375550102';
  const privAm = await run('2026-10-23T12:00:00Z', mk('appt')), privPm = await run('2026-10-23T17:00:00Z', mk('appt'));
  const dropAm = await run('2026-10-23T12:00:00Z', mk('drop'));
  ok(!privAm.includes(REP) && !privPm.includes(REP), 'B1 no morning or hour-ahead text to the rep for a personal appointment', JSON.stringify([privAm, privPm]));
  ok(dropAm.includes(REP), 'B2 the rep is still texted about a drop appointment on their job', JSON.stringify(dropAm));
}

/* D, E2 — source */
{
  ok(/No signal \\u2014 this appointment was not saved/.test(SRC), 'D  booking with no signal says there is no signal');
  const i = SRC.indexOf('function daysLeft(iso){'), dl = SRC.slice(i, i + 400);
  ok(/setHours\(0, 0, 0, 0\)/.test(dl) && /Math\.round/.test(dl), 'E2 a document expiring today has 0 days left, not -1');
  ok(!/function todayISO\(\)\{ try\{ return new Date\(\)\.toISOString\(\)\.slice\(0,10\)/.test(SRC), 'E3 the punch map’s Today is the local day');
}

console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
