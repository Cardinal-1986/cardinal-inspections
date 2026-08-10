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

  // 672: the auth round-trip moved INSIDE the try. It is a network call, and
  // outside the try a DNS blip became an unhandled rejection — the caller got
  // a platform 500 with no JSON body and `data.error` undefined.
  try {
    // verify the caller is a signed-in team member
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) { res.status(401).json({ error: 'Not signed in' }); return; }
    const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
    const user = await who.json();

    // 672: subject / variant / replyTo are ADDITIVE. Both shipped callers send
    // none of them, so each falls back to the exact behaviour that shipped.
    const { to, clientName, title, html, shareUrl, propertyLine,
            subject, variant, replyTo, quantitiesOnly } = req.body || {};
    // 672: `to` must be a non-empty STRING. `!to` passes a non-empty ARRAY,
    // which then reaches `to: [to]` below as [[a,b]] — Resend 422s and the
    // caller sees a truncated vendor string instead of its own mistake.
    if (typeof to !== 'string' || !to.trim() || !html || !title) {
      res.status(400).json({ error: 'Missing to/title/html' }); return;
    }

    // 672: the carrier variant is the Supplement Desk speaking, and the Desk is
    // admin-only at its own route. senddoc's own gate is any valid session, and
    // that stays true for the two client-facing callers — a rep legitimately
    // emails a homeowner an estimate. Only the carrier variant is narrowed.
    const isCarrier = variant === 'carrier';
    if (isCarrier) {
      const adm = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_cardinal_admin`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`,
                   'Content-Type': 'application/json' },
        body: '{}'
      });
      const isAdmin = adm.ok ? await adm.json() : false;
      if (isAdmin !== true) {
        res.status(403).json({ error: 'Sending to a carrier is admin-only.' }); return;
      }
    }

    const from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
    const safeName = String(title).replace(/[^\w\- ]+/g, '').slice(0, 60) || 'Cardinal Document';
    const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // 672: a BRANCH, never a replacement. Everything below this line in the
    // homeowner path is byte-for-byte what shipped — both existing callers
    // depend on that wording and neither sends `variant`.
    const carrierBody = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;">
      <p>${esc(propertyLine || '')}</p>
      <p>Please find our supplement request attached, itemised by scope line.</p>
      ${quantitiesOnly === false ? '' : `<p><b>Quantities are stated; pricing is not.</b> We ask that each item be
      priced per your own current line list for this ZIP.</p>`}
      <p>Reply to this email and it reaches the writer directly.</p>
      <p style="color:#555;">— ${esc(user.user_metadata?.full_name || user.email)}<br>
      Cardinal Roofing and Renovations, LLC · 5735 Webster Street, Dayton, OH 45414</p>
    </div>`;

    const body = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#C8202E;border-bottom:3px solid #C8202E;padding-bottom:6px;">Cardinal Roofing &amp; Renovations</h2>
      <p>Hi${clientName ? ' ' + esc(clientName) : ''},</p>
      <p>Please find your <b>${esc(title)}</b> attached. Open the attachment in any web browser to view it,
      and print or save it as a PDF from there.</p>
      ${propertyLine ? `<p>${esc(propertyLine)}</p>` : ''}
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
        // 672: replyTo lets a carrier reply reach a monitored claims mailbox
        // rather than whoever happened to be signed in. Defaults to the sender.
        // GATED on the carrier variant: on the homeowner path reply_to has
        // always been the signed-in sender, and that is an accountability
        // anchor, not an accident. A non-admin must not be able to point a
        // reply off-domain from Cardinal's own From address.
        reply_to: (isCarrier && replyTo) || user.email,
        // 672: subject must NOT fold into `title` — title also drives safeName
        // (the attachment filename) and the homeowner body sentence. Caller 2
        // sends the literal title 'Estimate', so folding would silently rename
        // its attachment.
        // Gated for the same reason. (`title` already reached the subject
        // pre-672, so this half is a smaller delta than it looks — but there
        // is no caller that needs it ungated, so it is not left open.)
        subject: (isCarrier && subject) || `${title} — Cardinal Roofing & Renovations`,
        html: isCarrier ? carrierBody : body,
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
