// /api/digest.js
// Daily appointment digest for Cardinal Client Resources.
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
//   CRON_SECRET   — if set, requests must carry  Authorization: Bearer <secret>
//                   (Vercel Cron sends this automatically when the var exists)
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

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
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
      if (!byRep[adm] || Object.keys(byRep).length > 1 || reminders.length) {
        sends.push({ to: adm, subject: subjectFor(appts.length, stale.length, true, reminders.length),
                     html: emailBody(`Team schedule for ${niceDate(today)}`, allRows, remHtml + staleHtml(stale, names)) });
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
