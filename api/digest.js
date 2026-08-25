// /api/digest.js
// Daily appointment digest for Cardinal Client Resources.
// 1058: also names the insurance claims that are past Cardinal's follow-up
// mark — admin email only, and its CHASE_POLICY is a MIRROR of the one in
// index.html's cr-cth-script. gate_1058.mjs fails if the two disagree.
// Triggered by Vercel Cron (see vercel.json) every morning; can also be
// opened manually at /api/digest to test.
//
// Required Vercel environment variables:
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase → Project Settings → API → service_role
//   RESEND_API_KEY             — resend.com → API Keys
// Optional:
//   DIGEST_FROM   — sender, e.g. "Cardinal <schedule@cardinalrenovations.net>"
//                   (domain must be verified in Resend; default uses Resend's
//                   onboarding sender, which can only deliver to your own email)
//   CRON_SECRET   — REQUIRED. Requests must carry  Authorization: Bearer <secret>
//                   (Vercel Cron sends this automatically when the var exists).
//                   Unset means this route refuses everything, including the
//                   cron — it is fail-closed on purpose, so nothing sends mail
//                   on an open door. Was optional until this build.
//   ADMIN_EMAIL   — defaults to theo@cardinalrenovations.net

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const ADMIN = process.env.ADMIN_EMAIL || 'theo@cardinalrenovations.net';
const ADMINS = [ADMIN, 'joan@cardinalrenovations.net'].filter((v, i, a) => a.indexOf(v) === i);
// 784: how long a sent estimate may sit unanswered before the digest names it.
// Five days = it is raised inside the same week it went out. DIGEST_STALE_DAYS
// overrides without a deploy.
const STALE_DAYS = Number(process.env.DIGEST_STALE_DAYS || 5);

function todayLocal() {
  // Dayton, Ohio local date as YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
function niceDate(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US',
    { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '';
  const [h0, mm] = t.split(':');
  let h = parseInt(h0, 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${mm} ${ap}`;
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function apptHtml(a, projName, withOwner) {
  return `<tr>
    <td style="padding:6px 10px;white-space:nowrap;font-weight:700;color:#9c1822;">${a.appt_time ? fmtTime(a.appt_time) : '—'}</td>
    <td style="padding:6px 10px;">
      <b>${esc(a.title)}</b>
      ${projName ? `<br><span style="color:#666;">Client: ${esc(projName)}</span>` : ''}
      ${a.notes ? `<br><span style="color:#666;">${esc(a.notes)}</span>` : ''}
      ${withOwner && a.created_by ? `<br><span style="color:#8a6f66;">Rep: ${esc(a.created_by)}</span>` : ''}
    </td></tr>`;
}
// 784: money, plainly. No cents — this is a nudge, not an invoice.
function money(n) {
  const v = Number(n) || 0;
  return '$' + Math.round(v).toLocaleString('en-US');
}
function daysSince(iso) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!isFinite(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}
/* ── 1058: the chase clock, MIRRORED from index.html ──────────────────────
   ⚠ THIS IS A SECOND COPY OF CARDINAL'S FOLLOW-UP POLICY. The first lives in
   index.html's cr-cth-script as CHASE_POLICY, and a serverless function cannot
   import from a 5 MB single-page app, so two copies is the only shape
   available. Two copies of one rule is exactly the drift this project keeps
   paying for — so `gate_1058.mjs` parses BOTH files and fails if the numbers
   disagree. Change one, change the other, or the gate goes red.

   The numbers are Cardinal's own follow-up policy and deliberately NOT a
   per-carrier average: production holds two carriers and one approved_at that
   falls on the same day as its first_scope_at, so an average would be fiction.
   See build 1056. */
const CHASE_POLICY = {
  'supplement filed': { first: 14, again: 7 },
  'awaiting release': { first: 21, again: 10 }
};
const CHASE_FALLBACK = { first: 21, again: 10 };
/* Returns null when there is no date to reason about — a made-up zero would
   read as "chased today" and silence a claim nobody has touched. */
function chaseDue(x) {
  if (x.days == null) return null;
  const p = CHASE_POLICY[x.why] || CHASE_FALLBACK;
  const chased = x.chasedAt ? daysSince(x.chasedAt) : null;
  const limit  = chased == null ? p.first : p.again;
  const age    = chased == null ? x.days  : chased;
  return { chased, limit, age, over: age - limit };
}
/* The same two reasons cr-cth-script's chaseList() collects, read off the
   claim rows with their project embedded. */
function chaseList(claims) {
  const out = [];
  for (const c of claims || []) {
    const pr = c.projects || null;
    if (!pr) continue;                       /* an orphan claim chases nobody */
    let ck = {};
    try { ck = typeof pr.checklist === 'string' ? JSON.parse(pr.checklist) : (pr.checklist || {}); } catch (e) {}
    const base = { name: pr.name || 'Unnamed', carrier: c.carrier || 'carrier not recorded',
                   chasedAt: c.last_chased_at || null };
    if (c.supplement_status === 'filed') {
      out.push({ ...base, why: 'supplement filed',
                 days: c.supplement_filed_at ? daysSince(c.supplement_filed_at) : null,
                 amt: Number(c.supplement_filed) || 0 });
    }
    if (pr.stage === 'Invoiced') {
      out.push({ ...base, why: 'awaiting release',
                 days: daysSince(ck.stage_since || pr.updated_at),
                 amt: (Number(c.approved_depreciation) || 0) + (Number(c.supplement_approved) || 0) });
    }
  }
  /* only the ones actually past the policy — the digest is a nudge, not the
     hub. A claim that is merely open is not news. */
  return out
    .map(x => ({ ...x, due: chaseDue(x) }))
    .filter(x => x.due && x.due.over > 0)
    .sort((a, b) => b.due.over - a.due.over);
}
function chaseHtml(list) {
  if (!list.length) return '';
  const total = list.reduce((s, x) => s + (Number(x.amt) || 0), 0);
  const rows = list.map(x => `<tr>
      <td style="padding:6px 10px;white-space:nowrap;font-weight:700;color:#9c1822;">${x.due.over}d</td>
      <td style="padding:6px 10px;">
        <b>${esc(x.name)}</b>
        <span style="color:#666;"> &middot; ${esc(x.carrier)}</span>
        <br><span style="color:#666;">${esc(x.why)}${x.due.chased == null
          ? ', never chased'
          : `, last chased ${x.due.chased}d ago`}${x.amt > 0 ? ' &middot; ' + esc(money(x.amt)) : ''}</span>
      </td></tr>`).join('');
  return `<p style="font-size:15px;margin:22px 0 6px;"><b>Carriers to chase</b>
      <span style="color:#666;font-size:13px;">&mdash; ${list.length} claim${list.length === 1 ? '' : 's'}
      past the follow-up mark${total > 0 ? ', ' + esc(money(total)) + ' waiting' : ''}</span></p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #ddd;">${rows}</table>`;
}
// 784: the estimates that went out and have heard nothing back. `updated_at` is
// the honest clock available — the table has no sent_at column, so this is
// "last touched", and editing an estimate legitimately restarts it.
function staleHtml(list, names) {
  if (!list.length) return '';
  const total = list.reduce((s, e) => s + (Number(e.total) || 0), 0);
  const rows = list.map(e => `<tr>
      <td style="padding:6px 10px;white-space:nowrap;font-weight:700;color:#9c1822;">${daysSince(e.updated_at)}d</td>
      <td style="padding:6px 10px;">
        <b>${esc(names[e.project_id] || 'Client')}</b>
        <span style="color:#666;"> &middot; ${esc(e.estimate_number || 'estimate')}</span>
        ${e.total ? `<br><span style="color:#666;">${esc(money(e.total))}</span>` : ''}
      </td></tr>`).join('');
  return `<p style="font-size:15px;margin:22px 0 6px;"><b>Waiting on an answer</b>
      <span style="color:#666;font-size:13px;">&mdash; ${list.length} estimate${list.length === 1 ? '' : 's'} sent
      over ${STALE_DAYS} days ago, ${esc(money(total))} in total</span></p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #ddd;">${rows}</table>`;
}
// 898: Owner Console reminders opted into the daily ping (notify=true), due today
// or an overdue one-time. Admin-only content; joins nothing, no client data.
function remindersHtml(list) {
  if (!list.length) return '';
  const rows = list.map(r => {
    const when = r.remind_on ? niceDate(r.remind_on) : '';
    const rep = r.repeat && r.repeat !== 'none' ? ` &middot; ${esc(r.repeat)}` : '';
    return `<tr>
      <td style="padding:6px 10px;">
        <b>${esc(r.text)}</b>
        ${when ? `<br><span style="color:#666;">${esc(when)}${rep}</span>` : ''}
      </td></tr>`;
  }).join('');
  return `<p style="font-size:15px;margin:22px 0 6px;"><b>Reminders</b>
      <span style="color:#666;font-size:13px;">&mdash; ${list.length} for today</span></p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #ddd;">${rows}</table>`;
}
function emailBody(heading, rowsHtml, extraHtml) {
  // 784: rowsHtml is empty on a day with nothing booked. An empty <table> reads
  // as a broken email, so say it in words instead.
  const schedule = rowsHtml
    ? `<table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #ddd;">${rowsHtml}</table>`
    : `<p style="color:#666;font-size:14px;margin:4px 0 0;">Nothing on the calendar today.</p>`;
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
    <h2 style="color:#C8202E;border-bottom:3px solid #C8202E;padding-bottom:6px;">Cardinal Client Resources</h2>
    <p style="font-size:15px;"><b>${esc(heading)}</b></p>
    ${schedule}
    ${extraHtml || ''}
    <p style="color:#8a8a8a;font-size:12px;margin-top:14px;">Sent automatically each morning. Manage appointments on the app calendar.</p>
  </div>`;
}
// 784: one place that names the email, so the three cases cannot drift apart.
// No emoji — this is an outbound subject line, same rule as builds 772/773.
function subjectFor(appts, stale, teamWide, rem) {
  const a = appts ? `${appts} appointment${appts === 1 ? '' : 's'} today` : '';
  const s = stale ? `${stale} estimate${stale === 1 ? '' : 's'} waiting` : '';
  const r = rem ? `${rem} reminder${rem === 1 ? '' : 's'}` : '';
  const lead = teamWide ? 'Team schedule' : '';
  const parts = [lead, a, s, r].filter(Boolean);
  return (parts.join(' · ') || 'Nothing today') + ' — Cardinal';
}

/* FAIL-CLOSED, and it did not used to be. The guard here read
       if (secret && req.headers.authorization !== 'Bearer ' + secret)
   which is no guard at all when CRON_SECRET is unset: the route answered
   anybody who knew the URL. api/companycam-sync.js already refused that trade
   in its own comment ("no secret configured means the cron door is refused,
   not opened") because it holds keys \u2014 but THIS route sends mail, and the
   commissions one names what every rep is owed. An unauthenticated stranger
   could not read the reply, but they could make it arrive, over and over.

   Measured on the live site before changing anything: CRON_SECRET was unset,
   so both digests were open at the time of writing.

   The consequence is deliberate and immediate: with no secret configured, the
   digest does not send. That is the correct failure \u2014 a cron that silently
   does nothing beats a public endpoint that emails on demand. Vercel Cron
   sends the header by itself once the variable exists.

   The refusal SAYS WHY, like companycam-sync's does. Nothing is leaked by it,
   and being able to read the reason off the live route is what identified this
   in the first place. */
function cronAuthorised(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return { ok: false, why: 'CRON_SECRET is not configured in Vercel, so the ' +
    'scheduled door is closed. Set it, and give the cron the same value.' };
  if ((req.headers.authorization || '') !== 'Bearer ' + secret) return { ok: false, why: 'Bad cron secret' };
  return { ok: true };
}

export default async function handler(req, res) {
  const cron = cronAuthorised(req);
  if (!cron.ok) {
    res.status(401).json({ error: 'Unauthorized', detail: cron.why });
    return;
  }
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!srk || !resendKey) {
    res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY env var' });
    return;
  }
  const from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
  const sbHeaders = { apikey: srk, Authorization: `Bearer ${srk}` };

  try {
    const today = todayLocal();
    const aRes = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?appt_date=eq.${today}` +
      `&select=title,appt_date,appt_time,project_id,notes,created_by&order=appt_time.asc`,
      { headers: sbHeaders });
    if (!aRes.ok) throw new Error('Supabase appointments query failed: ' + (await aRes.text()).slice(0, 200));
    const appts = await aRes.json();

    // 784: estimates that went out and have heard nothing back. Fetched BEFORE
    // the early return below, because a day with no appointments is exactly the
    // day a rep has time to chase one.
    let stale = [];
    try {
      const eRes = await fetch(
        `${SUPABASE_URL}/rest/v1/estimates?status=eq.sent&archived=eq.false` +
        `&select=estimate_number,project_id,total,created_by,updated_at&order=updated_at.asc`,
        { headers: sbHeaders });
      if (eRes.ok) {
        stale = (await eRes.json()).filter(e => daysSince(e.updated_at) >= STALE_DAYS);
      }
    } catch (e) { /* the schedule half must still send if this query fails */ }

    // 898: Owner Console reminders the owner opted to be pinged about. Due today
    // (any repeat) or an overdue one-time; undated/standing reminders never ping.
    /* 1058: claims with their project embedded — the FK
       insurance_claims_project_id_fkey is what makes the embed legal. */
    let chases = [];
    try {
      const cRes = await fetch(
        `${SUPABASE_URL}/rest/v1/insurance_claims` +
        `?select=id,carrier,supplement_status,supplement_filed,supplement_filed_at,` +
        `last_chased_at,approved_depreciation,supplement_approved,` +
        `projects(id,name,stage,checklist,updated_at)`,
        { headers: sbHeaders });
      if (cRes.ok) chases = chaseList(await cRes.json());
    } catch (e) { /* the digest still sends without this section */ }

    let reminders = [];
    try {
      const remRes = await fetch(
        `${SUPABASE_URL}/rest/v1/owner_reminders?notify=eq.true&done_at=is.null&remind_on=lte.${today}` +
        `&select=text,remind_on,repeat&order=remind_on.asc`,
        { headers: sbHeaders });
      if (remRes.ok) {
        reminders = (await remRes.json()).filter(r => r.remind_on === today || r.repeat === 'none');
      }
    } catch (e) { /* reminders are a bonus; never block the schedule email */ }

    if (!appts.length && !stale.length && !reminders.length) {
      res.status(200).json({ date: today, appointments: 0, stale_estimates: 0, reminders: 0, emails_sent: 0,
        note: 'Nothing scheduled today, nothing waiting on an answer, and no reminders due.' });
      return;
    }

    // resolve client names — for both halves, in one round trip
    const ids = [...new Set(
      appts.map(a => a.project_id).concat(stale.map(e => e.project_id)).filter(Boolean)
    )];
    let names = {};
    if (ids.length) {
      const pRes = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?id=in.(${ids.join(',')})&select=id,name`,
        { headers: sbHeaders });
      if (pRes.ok) (await pRes.json()).forEach(p => { names[p.id] = p.name; });
    }

    // group by rep
    const byRep = {};
    for (const a of appts) {
      const who = a.created_by || ADMIN;
      (byRep[who] = byRep[who] || []).push(a);
    }
    // 784: and the same for estimates, so a rep with no appointments today but
    // three aging estimates still hears about them.
    const staleByRep = {};
    for (const e of stale) {
      const who = e.created_by || ADMIN;
      (staleByRep[who] = staleByRep[who] || []).push(e);
    }

    const sends = [];
    const heading = `Your schedule for ${niceDate(today)}`;
    const reps = [...new Set(Object.keys(byRep).concat(Object.keys(staleByRep)))];
    for (const rep of reps) {
      const list = byRep[rep] || [];
      const mine = staleByRep[rep] || [];
      const rows = list.map(a => apptHtml(a, names[a.project_id], false)).join('');
      sends.push({ to: rep, subject: subjectFor(list.length, mine.length, false),
                   html: emailBody(heading, rows, staleHtml(mine, names)) });
    }
    // admin gets the whole team's day too (when there is more than their own),
    // and always when a reminder is due — reminders only ride on the admin email.
    const allRows = appts.map(a => apptHtml(a, names[a.project_id], true)).join('');
    const remHtml = remindersHtml(reminders);
    for (const adm of ADMINS) {
      /* 1058: `chases.length` joins this guard. Without it, a day with no
         appointments and no reminders sends no admin email at all — and an
         overdue chase would be computed, rendered and dropped in silence. */
      if (!byRep[adm] || Object.keys(byRep).length > 1 || reminders.length || chases.length) {
        sends.push({ to: adm, subject: subjectFor(appts.length, stale.length, true, reminders.length),
                     html: emailBody(`Team schedule for ${niceDate(today)}`, allRows,
                                     remHtml + chaseHtml(chases) + staleHtml(stale, names)) });
      }
    }

    const results = [];
    for (const msg of sends) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html })
      });
      results.push({ to: msg.to, ok: r.ok, detail: r.ok ? undefined : (await r.text()).slice(0, 200) });
    }

    res.status(200).json({ date: today, appointments: appts.length, stale_estimates: stale.length,
      reminders: reminders.length, stale_days: STALE_DAYS, emails_sent: results.filter(x => x.ok).length, results });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
