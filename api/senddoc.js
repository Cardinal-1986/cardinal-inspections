// /api/senddoc.js — email a report/estimate to the client as an HTML attachment.
// Requires RESEND_API_KEY (and optionally DIGEST_FROM) env vars.
// Caller must be a signed-in team member: the app sends its Supabase access
// token, which we verify before sending anything.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';

import { isStaff } from './_staff.js';
const APP_ORIGIN = 'https://app.cardinalroster.com';
/* D (contracts + client documents judges): a Construction Agreement tells the buyer its Terms and
   Conditions and both Notice of Cancellation copies are "attached" and are "the printed master", then
   names a STAFF menu path (Menu > Company Documents > ...) a homeowner cannot open. The statutory text
   is deliberately never retyped (ORC 1345.23), so what reaches the buyer is the printed master itself:
   the trade's PDF that already ships publicly in docs/ (pages = its Terms and both notices).
   KEEP IN SYNC: this block is byte-identical in api/share.js, api/clientsign.js and api/senddoc.js. */
const MASTERS = {
  roof:   { href: '/docs/Cardinal_Roofing_Contract.pdf', page: 3, pages: '3\u20135', name: 'Roofing Construction Agreement' },
  siding: { href: '/docs/Cardinal_Siding_Contract.pdf', page: 2, pages: '2\u20134', name: 'Siding Construction Agreement' },
  gutter: { href: '/docs/Cardinal_Gutter_Contract.pdf', page: 3, pages: '3\u20135', name: 'Gutter Construction Agreement' }
};
function masterFor(html) {
  const h = String(html || '');
  if (!/Notice of Cancellation/i.test(h)) return null;
  const m = /class="est-title">\s*(ROOFING|SIDING|GUTTER)\s+CONSTRUCTION/i.exec(h) ||
            /Company Documents\s*(?:&#8594;|\u2192)\s*(Roofing|Siding|Gutter)s?\b/i.exec(h);
  if (!m) return null;
  const k = m[1].toLowerCase();
  return MASTERS[k === 'roofing' ? 'roof' : k] || null;
}
const MENU_RX = /<b>\s*(?:&#9776;|\u2630)\s*Menu\s*(?:&#8594;|\u2192)\s*Company Documents\s*(?:&#8594;|\u2192)\s*(?:Roofing|Siding|Gutters)\s*(?:&#8594;|\u2192)\s*([^<]*?\(Master\))\s*<\/b>/g;
function masterLinked(html, master, origin) {
  if (!master) return html;
  const href = (origin || '') + master.href + '#page=' + master.page;
  return String(html).replace(MENU_RX, (all, name) => '<a href="' + href + '" target="_blank" rel="noopener" data-cr-master="1"><b>' +
    name.replace(/\s+/g, ' ') + '</b> (PDF, pages ' + master.pages + ')</a>');
}
/* the agreement's OWN right-to-cancel sentence, quoted as written — never paraphrased */
function cancelLine(html) {
  const m = /<b>\s*(You, the buyer, may cancel this transaction[^<]*?)\s*<\/b>/i.exec(String(html || ''));
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}
/* one value cell of the agreement's Customer Information table; a [placeholder] reads as empty */
function cellText(html, label) {
  const m = new RegExp('<td class="k">' + label + '<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>').exec(String(html || ''));
  if (!m) return '';
  const t = m[1].replace(/<[^>]*>/g, ' ').replace(/&nbsp;|\u00a0/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, ' ').trim();
  return t.charAt(0) === '[' ? '' : t.slice(0, 80);
}
const EMAIL_RX = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[A-Za-z]{2,}$/;
const INIT_RX = /(Initials(?:\s|&nbsp;|\u00a0)*)<span class="ph">\[_*\]<\/span>/g;
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
    if (!isStaff(user && user.email)) { res.status(403).json({ error: 'Cardinal staff only' }); return; }

    // 672: subject / variant / replyTo are ADDITIVE. Both shipped callers send
    // none of them, so each falls back to the exact behaviour that shipped.
    const { to, clientName, title, html, shareUrl, propertyLine,
            subject, variant, replyTo, quantitiesOnly, message } = req.body || {};
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
    /* D: 'Contract — Roofing — X' lost its dashes and left 'Contract  Roofing  X' (double spaces) */
    const safeName = String(title).replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Cardinal Document';
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

    // 1273: the rep may edit the message (Email to client's sheet). Plain text
    // only — escaped, blank lines become paragraphs. The signature, address and
    // view-online link below it are not the rep's to remove. With no message
    // the body is the one that always shipped.
    const msg = (!isCarrier && typeof message === 'string') ? message.trim().slice(0, 5000) : '';
    const msgHtml = msg.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
      .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n      ');
    const sig = `<p style="color:#8a6f66;">— ${esc(user.user_metadata?.full_name || user.email)}<br>
      Cardinal Roofing and Renovations, LLC · 5735 Webster Street, Dayton, OH 45414</p>`;
    const editedBody = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#C8202E;border-bottom:3px solid #C8202E;padding-bottom:6px;">Cardinal Roofing &amp; Renovations</h2>
      ${msgHtml}
      ${shareUrl ? `<p>You can also view it online any time: <a href="${esc(shareUrl)}">${esc(shareUrl)}</a></p>` : ''}
      ${sig}
    </div>`;
    // 1273: the homeowner path takes an edited subject too. One line, 200 chars.
    const subj = (!isCarrier && typeof subject === 'string') ? subject.replace(/[\r\n]+/g, ' ').trim().slice(0, 200) : '';

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

    /* D: an emailed Construction Agreement carries its printed master — the Terms and both Notice of
       Cancellation copies it says are attached — and its menu-path sentence links to it. Homeowner
       path only; best-effort: a failed fetch sends the agreement with the link alone. */
    const master = isCarrier ? null : masterFor(html);
    const sendHtml = master ? masterLinked(html, master, APP_ORIGIN) : html;
    const extra = [];
    if (master) {
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4000);
        const pr = await fetch(APP_ORIGIN + master.href, { signal: ctl.signal });
        clearTimeout(tm);
        if (pr.ok) {
          const buf = Buffer.from(await pr.arrayBuffer());
          if (buf.length > 1000 && buf.length < 8000000 && buf.slice(0, 4).toString('latin1') === '%PDF') {
            extra.push({ filename: master.name + ' - Terms and Notice of Cancellation.pdf', content: buf.toString('base64') });
          }
        }
      } catch (_p) {}
    }
    const masterP = master ? `<p><b>Your Terms and Conditions and both Notice of Cancellation copies</b> ${extra.length ? 'are attached as a PDF, and are' : 'are'} online here:
      <a href="${esc(APP_ORIGIN + master.href + '#page=' + master.page)}">${esc(master.name)} (PDF, pages ${master.pages})</a></p>` : '';
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
        // 1273: now there is one — Email to client lets the rep edit it. It is
        // `subj` (one line, 200 chars); From and reply_to are unchanged.
        subject: (isCarrier && subject) || subj || `${title} — Cardinal Roofing & Renovations`,
        html: isCarrier ? carrierBody : (msgHtml ? editedBody : body).replace(/(\s*)<\/div>\s*$/, (m, sp) => (masterP ? sp + masterP : '') + m),
        attachments: [{ filename: safeName + '.html',
                        content: Buffer.from(sendHtml, 'utf8').toString('base64') }].concat(extra)
      })
    });
    if (!r.ok) { res.status(502).json({ error: 'Email send failed', detail: (await r.text()).slice(0, 300) }); return; }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
