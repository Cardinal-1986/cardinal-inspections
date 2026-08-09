// /api/commissions-digest.js
// Weekly commissions summary for Theo — what's owed to each rep right now,
// minus their outstanding draws, so nothing has to be tracked from memory.
// Same shape as /api/digest.js: Vercel Cron, Resend, service-role REST calls.
// Triggered every Friday morning (see vercel.json); can also be opened
// manually to test — it reads and emails, it never writes.
//
// "Owed" matches the app's own definition exactly (commissions.status is
// 'pending' or 'approved' — not 'paid', not 'void'), the same rule
// renderCommissions() and CardinalPay's groupOwed() use, so this email can
// never disagree with what the Commissions screen shows.
//
// Required Vercel environment variables:
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase → Project Settings → API → service_role
//   RESEND_API_KEY             — resend.com → API Keys
// Optional:
//   DIGEST_FROM   — sender, e.g. "Cardinal <schedule@cardinalrenovations.net>"
//   CRON_SECRET   — if set, requests must carry  Authorization: Bearer <secret>
//   ADMIN_EMAIL   — defaults to theo@cardinalrenovations.net

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const ADMIN = process.env.ADMIN_EMAIL || 'theo@cardinalrenovations.net';
const ADMINS = [ADMIN, 'joan@cardinalrenovations.net'].filter((v, i, a) => a.indexOf(v) === i);

function money(n) {
  const v = Number(n);
  if (!isFinite(v)) return '$0.00';
  return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function repRow(name, owed, drawn, net) {
  return `<tr>
    <td style="padding:6px 10px;">${esc(name)}</td>
    <td style="padding:6px 10px;text-align:right;">${money(owed)}</td>
    <td style="padding:6px 10px;text-align:right;color:${drawn ? '#9c1822' : '#999'};">${drawn ? '−' + money(drawn).slice(1) : '—'}</td>
    <td style="padding:6px 10px;text-align:right;font-weight:700;color:${net < 0 ? '#9c1822' : '#1a7a4c'};">${money(net)}</td>
  </tr>`;
}
function emailBody(rowsHtml, totalOwed, totalDraws) {
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
    <h2 style="color:#C8202E;border-bottom:3px solid #C8202E;padding-bottom:6px;">Cardinal — Commissions owed</h2>
    <p style="font-size:15px;">What&#8217;s owed to the team right now, minus outstanding draws.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #ddd;">
      <thead><tr style="background:#f5f0ed;">
        <th style="padding:6px 10px;text-align:left;">Rep</th>
        <th style="padding:6px 10px;text-align:right;">Owed</th>
        <th style="padding:6px 10px;text-align:right;">Draws</th>
        <th style="padding:6px 10px;text-align:right;">Net</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p style="font-size:14px;margin-top:14px;"><b>Total owed: ${money(totalOwed)}</b>${totalDraws ? ` &nbsp;·&nbsp; Draws outstanding: ${money(totalDraws)}` : ''}</p>
    <p style="color:#8a8a8a;font-size:12px;margin-top:14px;">Open Cardinal &#8594; &#9776; Menu &#8594; &#128181; Commissions to pay. Sent automatically every Friday.</p>
  </div>`;
}

// exported so the harness can execute the SHIPPED grouping logic, not a copy
export function groupOwed(commissions, draws) {
  const owed = {}, drawn = {};
  for (const r of commissions) {
    if (r.status !== 'pending' && r.status !== 'approved') continue;
    const v = Number(r.amount); if (!isFinite(v)) continue;
    owed[r.rep_email] = (owed[r.rep_email] || 0) + v;
  }
  for (const d of draws) {
    if (d.status !== 'outstanding') continue;
    const v = Number(d.amount); if (!isFinite(v)) continue;
    drawn[d.rep_email] = (drawn[d.rep_email] || 0) + v;
  }
  const reps = [...new Set([...Object.keys(owed), ...Object.keys(drawn)])]
    .filter(em => (owed[em] || 0) > 0 || (drawn[em] || 0) > 0)
    .sort((a, b) => ((owed[b] || 0) - (drawn[b] || 0)) - ((owed[a] || 0) - (drawn[a] || 0)));
  return { owed, drawn, reps };
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
    const [commRes, drawRes, teamRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/commissions?status=in.(pending,approved)&select=rep_email,amount,status`, { headers: sbHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/draws?status=eq.outstanding&select=rep_email,amount,status`, { headers: sbHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/team_profiles?select=email,name`, { headers: sbHeaders }),
    ]);
    if (!commRes.ok) throw new Error('commissions query failed: ' + (await commRes.text()).slice(0, 200));
    const commissions = await commRes.json();
    const draws = drawRes.ok ? await drawRes.json() : [];
    const names = {};
    if (teamRes.ok) (await teamRes.json()).forEach(p => { if (p.name) names[p.email] = p.name; });

    const { owed, drawn, reps } = groupOwed(commissions, draws);

    if (!reps.length) {
      res.status(200).json({ owed_reps: 0, emails_sent: 0, note: 'Nothing owed this week.' });
      return;
    }

    let totalOwed = 0, totalDraws = 0;
    const rows = reps.map(em => {
      const o = owed[em] || 0, d = drawn[em] || 0;
      totalOwed += o; totalDraws += d;
      return repRow(names[em] || em.split('@')[0], o, d, o - d);
    }).join('');
    const html = emailBody(rows, totalOwed, totalDraws);
    const subject = `\u{1F4B5} ${reps.length} rep${reps.length === 1 ? '' : 's'} owed — Cardinal Commissions`;

    const results = [];
    for (const adm of ADMINS) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from, to: [adm], subject, html })
      });
      results.push({ to: adm, ok: r.ok, detail: r.ok ? undefined : (await r.text()).slice(0, 200) });
    }

    res.status(200).json({ owed_reps: reps.length, total_owed: totalOwed, total_draws: totalDraws,
      emails_sent: results.filter(x => x.ok).length, results });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
