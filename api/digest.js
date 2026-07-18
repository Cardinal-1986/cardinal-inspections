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
function emailBody(heading, rowsHtml) {
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
    <h2 style="color:#C8202E;border-bottom:3px solid #C8202E;padding-bottom:6px;">Cardinal Client Resources</h2>
    <p style="font-size:15px;"><b>${esc(heading)}</b></p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #ddd;">${rowsHtml}</table>
    <p style="color:#8a8a8a;font-size:12px;margin-top:14px;">Sent automatically each morning. Manage appointments on the app calendar.</p>
  </div>`;
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

    if (!appts.length) {
      res.status(200).json({ date: today, appointments: 0, emails_sent: 0, note: 'Nothing scheduled today.' });
      return;
    }

    // resolve client names
    const ids = [...new Set(appts.map(a => a.project_id).filter(Boolean))];
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

    const sends = [];
    const heading = `Your schedule for ${niceDate(today)}`;
    for (const [rep, list] of Object.entries(byRep)) {
      const rows = list.map(a => apptHtml(a, names[a.project_id], false)).join('');
      sends.push({ to: rep, subject: `📅 ${list.length} appointment${list.length === 1 ? '' : 's'} today — Cardinal`,
                   html: emailBody(heading, rows) });
    }
    // admin gets the whole team's day too (when there is more than their own)
    const allRows = appts.map(a => apptHtml(a, names[a.project_id], true)).join('');
    for (const adm of ADMINS) {
      if (!byRep[adm] || Object.keys(byRep).length > 1) {
        sends.push({ to: adm, subject: `📅 Team schedule — ${appts.length} appointment${appts.length === 1 ? '' : 's'} today`,
                     html: emailBody(`Team schedule for ${niceDate(today)}`, allRows) });
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

    res.status(200).json({ date: today, appointments: appts.length, emails_sent: results.filter(x => x.ok).length, results });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
