// /api/clientsign.js — receives a client's signature drawn on the public
// share page and stamps it into the stored document.
// The unguessable share token is the credential.
// Requires SUPABASE_SERVICE_ROLE_KEY; RESEND_API_KEY optional (rep notification).

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const ADMIN = process.env.ADMIN_EMAIL || 'theo@cardinalrenovations.net';
const ADMINS = [ADMIN, 'joan@cardinalrenovations.net'].filter((v, i, a) => a.indexOf(v) === i);
const SIGN_RX = /(<div class="line">)(<\/div>\s*<div class="lbl">\s*Client Acceptance)([^<]*)(<\/div>)/;
/* 1015: the Construction Agreements sign through a Buyer sigslot, not the
   Client Acceptance footer — see api/share.js. An unfilled buyer slot is
   class="sigslot" exactly; the in-person pad rewrites it to "sigslot signed". */
const SLOT_FULL_RX = /<span class="sigslot" data-sig="buyer">[\s\S]*?<\/span><\/span>/;
const SLOT_DATE_RX = /<span class="sigdate" data-sigdate="buyer">[\s\S]*?<\/span><\/span>/;

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!srk) { res.status(500).json({ error: 'Signing is not configured' }); return; }
  const sbHeaders = { apikey: srk, Authorization: `Bearer ${srk}` };

  try {
    const { t, sig, name } = req.body || {};
    if (!/^[a-f0-9-]{20,60}$/i.test(t || '')) { res.status(400).json({ error: 'Invalid link' }); return; }
    if (!sig || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 300000) {
      res.status(400).json({ error: 'Invalid signature image' }); return;
    }
    const cleanName = String(name || '').trim().slice(0, 80);
    if (!cleanName) { res.status(400).json({ error: 'Name is required' }); return; }

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/inspection_reports?share_token=eq.${t}&select=id,title,html,project_id,created_by&limit=1`,
      { headers: sbHeaders });
    if (!r.ok) throw new Error('lookup failed');
    const rows = await r.json();
    if (!rows.length) { res.status(404).json({ error: 'This link is no longer available' }); return; }
    const doc = rows[0];

    const hasFooter = SIGN_RX.test(doc.html);
    const hasSlot = SLOT_FULL_RX.test(doc.html);
    if (doc.html.includes('data-clientsigned') || (!hasFooter && !hasSlot)) {
      res.status(409).json({ error: 'This document has already been signed.' }); return;
    }

    const date = new Date().toLocaleDateString('en-US',
      { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' });
    let newHtml;
    if (hasFooter) {
      newHtml = doc.html.replace(SIGN_RX, function (_, a, b, c, d) {
        return '<div class="line" data-clientsigned="1" style="height:auto;border-bottom:1.5px solid #1b1b1b;">' +
          '<img src="' + sig + '" style="height:44px;display:block;margin-bottom:-6px;" alt="Client signature">' +
          '</div>\n    <div class="lbl">Client Acceptance \u2014 Signed by ' + esc(cleanName) +
          ' \u00b7 ' + date + ' (via secure link)' + d;
      });
    } else {
      /* 1015: stamp the agreement's Buyer slot the way the in-person pad does \u2014
         img into the slot, class "sigslot signed", the date into its date cell.
         Only the BUYER slot: the client on the share link IS the buyer; the
         co-buyer and contractor rows stay untouched, exactly like in person. */
      newHtml = doc.html.replace(SLOT_FULL_RX,
        '<span class="sigslot signed" data-sig="buyer" data-clientsigned="1">' +
        '<img src="' + sig + '" alt="buyer signature"></span>');
      newHtml = newHtml.replace(SLOT_DATE_RX,
        '<span class="sigdate" data-sigdate="buyer">' + date +
        ' \u00b7 signed via secure link by ' + esc(cleanName) + '</span>');
    }

    /* 1015: signed_at was never written on the remote path, so the SIGNED chip,
       the Approvals queue and the money worksheet all treated a remotely-signed
       document as unsigned \u2014 while the stage advance below already told Curtis
       to order materials. The remote signer is always the client (the buyer),
       which is exactly the case the in-person pad writes signed_at for. */
    const up = await fetch(
      `${SUPABASE_URL}/rest/v1/inspection_reports?id=eq.${doc.id}`,
      { method: 'PATCH',
        headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ html: newHtml, signed_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
    if (!up.ok) throw new Error('save failed: ' + (await up.text()).slice(0, 200));

    // advance the pipeline to Approved AND reach the team the way an in-person
    // signature does. 1007: setStage (the in-person path) emails/pushes Curtis
    // "schedule + order materials" on the move to Approved; a remote signature
    // only ever emailed the rep, so Curtis never heard a remotely-signed job was
    // ready to build. clientsign is unauthenticated (the share token is the
    // credential) and so cannot call the session-gated /api/notify — it sends the
    // same alert directly through the Resend account it already uses below.
    if (doc.project_id) {
      try {
        const pr0 = await fetch(
          `${SUPABASE_URL}/rest/v1/projects?id=eq.${doc.project_id}&select=stage,name,address&limit=1`,
          { headers: sbHeaders });
        const projRows = pr0.ok ? await pr0.json() : [];
        const proj = (Array.isArray(projRows) && projRows[0]) || {};
        // forward-only: never pull a job that is already scheduled/built back to
        // Approved, and only buzz Curtis on the real transition.
        const PAST_APPROVED = ['Approved', 'Scheduled', 'Completed', 'Invoiced', 'Closed'];
        const alreadyApproved = PAST_APPROVED.indexOf(String(proj.stage || '')) !== -1;
        if (!alreadyApproved) {
          await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${doc.project_id}`,
            { method: 'PATCH',
              headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
              body: JSON.stringify({ stage: 'Approved', updated_at: new Date().toISOString() }) });
          const rk = process.env.RESEND_API_KEY;
          if (rk) {
            try {
              const from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
              const crew = [...new Set(['curtis@cardinalrenovations.net', ...ADMINS].filter(Boolean))];
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rk}` },
                body: JSON.stringify({
                  from, to: crew,
                  subject: `APPROVED \u2014 schedule + order materials: ${proj.name || doc.title}`,
                  html: `<div style="font-family:'Segoe UI',Arial,sans-serif;">
                    <p><b>${esc(proj.name || doc.title)}</b>${proj.address ? ' (' + esc(proj.address) + ')' : ''} is now <b>APPROVED</b> \u2014 signed by the client via secure link.</p>
                    <p><b>Curtis:</b> please schedule the job and the material drop on the Schedule Board, and order materials (see the client\u2019s Materials tab).</p>
                  </div>`
                })
              });
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    // notify the rep + admin (best-effort)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
        const recipients = [...new Set([doc.created_by, ...ADMINS].filter(Boolean))];
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from, to: recipients,
            subject: `\u270D\uFE0F Signed: ${doc.title}`,
            html: `<div style="font-family:'Segoe UI',Arial,sans-serif;">
              <h2 style="color:#C8202E;">Document signed</h2>
              <p><b>${esc(doc.title)}</b> was just accepted and signed by <b>${esc(cleanName)}</b> (${date}).</p>
              <p>The signed copy is saved in Cardinal Client Resources and the client's stage moved to <b>Approved</b>.</p>
            </div>`
          })
        });
      } catch (e) {}
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
