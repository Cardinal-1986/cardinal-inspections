// /api/senddoc.js — email a report/estimate to the client as an HTML attachment.
// Requires RESEND_API_KEY (and optionally DIGEST_FROM) env vars.
// Caller must be a signed-in team member: the app sends its Supabase access
// token, which we verify before sending anything.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) { res.status(500).json({ error: 'RESEND_API_KEY is not configured' }); return; }

  // verify the caller is a signed-in team member
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) { res.status(401).json({ error: 'Not signed in' }); return; }
  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
  const user = await who.json();

  try {
    const { to, clientName, title, html, shareUrl } = req.body || {};
    if (!to || !html || !title) { res.status(400).json({ error: 'Missing to/title/html' }); return; }

    const from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
    const safeName = String(title).replace(/[^\w\- ]+/g, '').slice(0, 60) || 'Cardinal Document';
    const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const body = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#C8202E;border-bottom:3px solid #C8202E;padding-bottom:6px;">Cardinal Roofing &amp; Renovations</h2>
      <p>Hi${clientName ? ' ' + esc(clientName) : ''},</p>
      <p>Please find your <b>${esc(title)}</b> attached. Open the attachment in any web browser to view it,
      and print or save it as a PDF from there.</p>
      ${shareUrl ? `<p>You can also view it online any time: <a href="${esc(shareUrl)}">${esc(shareUrl)}</a></p>` : ''}
      <p>Questions? Just reply to this email.</p>
      <p style="color:#8a6f66;">— ${esc(user.user_metadata?.full_name || user.email)}<br>
      Cardinal Roofing and Renovations, LLC · 5735 Webster Street, Dayton, OH 45414</p>
    </div>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from, to: [to],
        reply_to: user.email,
        subject: `${title} — Cardinal Roofing & Renovations`,
        html: body,
        attachments: [{ filename: safeName + '.html',
                        content: Buffer.from(html, 'utf8').toString('base64') }]
      })
    });
    if (!r.ok) { res.status(502).json({ error: 'Email send failed', detail: (await r.text()).slice(0, 300) }); return; }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
