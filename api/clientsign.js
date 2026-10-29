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
/* D: stamp one signature slot (buyer / cobuyer) the way the in-person pad does */
function stampSlot(html, who, sig, nm, date) {
  const slot = new RegExp('<span class="sigslot" data-sig="' + who + '">[\\s\\S]*?<\\/span><\\/span>');
  const dcell = new RegExp('<span class="sigdate" data-sigdate="' + who + '">[\\s\\S]*?<\\/span><\\/span>');
  return html.replace(slot, '<span class="sigslot signed" data-sig="' + who + '" data-clientsigned="1">' +
      '<img src="' + sig + '" alt="' + who + ' signature"></span>')
    .replace(dcell, '<span class="sigdate" data-sigdate="' + who + '">' + date +
      ' \u00b7 signed via secure link by ' + esc(nm) + '</span>');
}
const SIG_OK = (s) => !!s && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s) && s.length <= 300000;
/* D: the SIGNER's own copy. The agreement they just signed says the buyer "has received a completed,
   signed and dated copy", and nothing was ever sent to them. Sent only to the address the signer typed
   on the sheet (prefilled from the agreement's own Email line) — never a guessed one. Best-effort, through
   the Resend account this route already uses: the signature is saved before this runs. Returns
   'sent' | 'failed' | 'none'. */
async function sendSignedCopy(rk, o) {
  if (!rk || !o.to) return 'none';
  try {
    const from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
    const link = APP_ORIGIN + '/api/share?t=' + encodeURIComponent(o.token);
    const first = String(o.name || '').trim().split(/\s+/)[0] || '';
    const what = o.master ? 'your ' + o.master.name : 'your ' + (o.title || 'document');
    const fileBase = String(o.title || 'Cardinal document').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Cardinal document';
    const copyHtml = masterLinked(o.html, o.master, APP_ORIGIN).replace(/(src|href)="\/(?!\/)/g, '$1="' + APP_ORIGIN + '/');
    const attachments = [{ filename: fileBase + ' (signed).html', content: Buffer.from(copyHtml, 'utf8').toString('base64') }];
    let pdf = false;
    if (o.master) {
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch(APP_ORIGIN + o.master.href, { signal: ctl.signal });
        clearTimeout(tm);
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length > 1000 && buf.length < 8000000 && buf.slice(0, 4).toString('latin1') === '%PDF') {
            attachments.push({ filename: o.master.name + ' - Terms and Notice of Cancellation.pdf', content: buf.toString('base64') });
            pdf = true;
          }
        }
      } catch (_p) { /* the link below still reaches it */ }
    }
    const mhref = o.master ? APP_ORIGIN + o.master.href + '#page=' + o.master.page : '';
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rk}` },
      body: JSON.stringify({
        from, to: [o.to], reply_to: o.replyTo,
        subject: `Your signed ${o.master ? o.master.name : 'document'} \u2014 Cardinal Roofing & Renovations`,
        html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#C8202E;border-bottom:3px solid #C8202E;padding-bottom:6px;">Cardinal Roofing &amp; Renovations</h2>
      <p>Hi${first ? ' ' + esc(first) : ''},</p>
      <p>Thank you \u2014 here is ${esc(what)}, signed ${esc(o.date)}. Your signed copy is attached, and you can open it online any time:
      <a href="${esc(link)}">${esc(link)}</a></p>
      ${o.master ? `<p><b>Your Terms and Conditions and both Notice of Cancellation copies</b> ${pdf ? 'are attached as a PDF, and are' : 'are'} online here:
      <a href="${esc(mhref)}">${esc(o.master.name)} (PDF, pages ${o.master.pages})</a></p>` : ''}
      ${o.cancel ? `<p><b>${esc(o.cancel)}</b></p>` : ''}
      <p>Questions? Reply to this email or call 937.576.6753.</p>
      <p style="color:#5c5c5c;">Cardinal Roofing and Renovations, LLC \u00b7 5735 Webster Street, Dayton, OH 45414</p>
    </div>`,
        attachments
      })
    });
    return r.ok ? 'sent' : 'failed';
  } catch (_e) { return 'failed'; }
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!srk) { res.status(500).json({ error: 'Signing is not configured' }); return; }
  const sbHeaders = { apikey: srk, Authorization: `Bearer ${srk}` };

  try {
    const { t, sig, name, role, initials, email, cobuyer } = req.body || {};
    if (!/^[a-f0-9-]{20,60}$/i.test(t || '')) { res.status(400).json({ error: 'Invalid link' }); return; }
    if (!sig || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 300000) {
      res.status(400).json({ error: 'Invalid signature image' }); return;
    }
    const cleanName = String(name || '').trim().slice(0, 80);
    if (!cleanName) { res.status(400).json({ error: 'Name is required' }); return; }
    /* D: the sheet's new fields. All optional, so a page served before this build still signs. */
    const isCo = role === 'cobuyer';
    const ini = String(initials || '').replace(/[^A-Za-z.\- ]/g, '').trim().slice(0, 6);
    const copyTo = String(email || '').trim().slice(0, 120);
    if (copyTo && !EMAIL_RX.test(copyTo)) { res.status(400).json({ error: 'Please check the email address, or leave it blank.' }); return; }
    let coSig = null, coNm = '';
    if (!isCo && cobuyer && typeof cobuyer === 'object') {
      if (!SIG_OK(cobuyer.sig)) { res.status(400).json({ error: 'Invalid co-buyer signature image' }); return; }
      coNm = String(cobuyer.name || '').trim().slice(0, 80);
      if (!coNm) { res.status(400).json({ error: 'The co-buyer\u2019s name is required' }); return; }
      coSig = cobuyer.sig;
    }

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/inspection_reports?share_token=eq.${t}&select=id,title,html,project_id,created_by&limit=1`,
      { headers: sbHeaders });
    if (!r.ok) throw new Error('lookup failed');
    const rows = await r.json();
    if (!rows.length) { res.status(404).json({ error: 'This link is no longer available' }); return; }
    const doc = rows[0];
    const resendKey0 = process.env.RESEND_API_KEY;
    const master = masterFor(doc.html);
    const replyTo = /@cardinalrenovations\.net$/i.test(String(doc.created_by || '')) ? doc.created_by : ADMIN;

    /* D: a NAMED co-buyer who did not sign with the buyer signs later from the same link. Only the
       co-buyer row moves: no signed_at, no stage, no Curtis alert — those were the buyer's. */
    if (isCo) {
      const coName = cellText(doc.html, 'Co-buyer');
      if (!coName || !/class="sigslot" data-sig="cobuyer"/.test(doc.html) || !/class="sigslot signed" data-sig="buyer"/.test(doc.html)) {
        res.status(409).json({ error: 'This document has already been signed.' }); return;
      }
      const coDate = new Date().toLocaleDateString('en-US',
        { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' });
      const coHtml = stampSlot(doc.html, 'cobuyer', sig, cleanName, coDate);
      const upc = await fetch(
        `${SUPABASE_URL}/rest/v1/inspection_reports?id=eq.${doc.id}`,
        { method: 'PATCH',
          headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ html: coHtml, updated_at: new Date().toISOString() }) });
      if (!upc.ok) throw new Error('save failed: ' + (await upc.text()).slice(0, 200));
      const copyC = await sendSignedCopy(resendKey0, { to: copyTo, name: cleanName, title: doc.title, html: coHtml, token: t,
        master, cancel: cancelLine(doc.html), date: coDate, replyTo });
      if (resendKey0) {
        try {
          const from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey0}` },
            body: JSON.stringify({
              from, to: [...new Set([doc.created_by, ...ADMINS].filter(Boolean))],
              subject: `Co-buyer signed: ${doc.title}`,
              html: `<div style="font-family:'Segoe UI',Arial,sans-serif;"><p><b>${esc(doc.title)}</b>: the co-buyer, <b>${esc(cleanName)}</b>, signed via secure link (${coDate}).</p>
                <p>${copyC === 'sent' ? 'A signed copy was emailed to ' + esc(copyTo) + '.' : 'No copy was emailed to the co-buyer \u2014 hand them one.'}</p></div>`
            })
          });
        } catch (_n) {}
      }
      res.status(200).json({ ok: true, copy: copyC }); return;
    }

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
    /* D: the buyer's typed initials go into every "Initials [__]" the agreement left blank, and a
       co-buyer who signed on the same sheet goes into the co-buyer row */
    let nInit = 0;
    if (ini) newHtml = newHtml.replace(INIT_RX, (all, pre) => { nInit++;
      return pre + '<span class="initials" data-clientinit="1" style="font-weight:700;border-bottom:1px solid #1b1b1b;padding:0 4px;">' + esc(ini) + '</span>'; });
    const coSigned = !!(coSig && hasSlot && /class="sigslot" data-sig="cobuyer"/.test(newHtml));
    if (coSigned) newHtml = stampSlot(newHtml, 'cobuyer', coSig, coNm, date);

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

    /* 1340 (Theo: a homeowner's signature counts as accepted). The signer here is always the client.
       A signed estimate page is linked to its estimates row by doc_id (a contract page is
       contract_doc_id, so it never matches); move that row from draft/sent to accepted so the job can
       be invoiced. Best-effort: the signature is already saved. */
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/estimates?doc_id=eq.${doc.id}&status=in.(draft,sent)`,
        { method: 'PATCH',
          headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'accepted', updated_at: new Date().toISOString() }) });
    } catch (_a) {}

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

    // D: the signer's own signed copy, with the printed master (Terms + both notices) when it is an agreement
    const copy = await sendSignedCopy(resendKey0, { to: copyTo, name: cleanName, title: doc.title, html: newHtml, token: t,
      master, cancel: cancelLine(doc.html), date, replyTo });
    const copyLine = copy === 'sent' ? `A signed copy${master ? ', with the Terms and both Notice of Cancellation copies,' : ''} was emailed to the client at ${esc(copyTo)}.`
      : (copyTo ? `The client\u2019s signed copy to ${esc(copyTo)} could not be sent \u2014 send them one.` : 'The client left no email for a signed copy \u2014 give them one.');

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
              ${nInit ? `<p>Initials (${esc(ini)}) added in ${nInit} ${nInit === 1 ? 'place' : 'places'}.</p>` : ''}
              ${coSigned ? `<p>The co-buyer, <b>${esc(coNm)}</b>, signed on the same sheet.</p>` : ''}
              <p>${copyLine}</p>
            </div>`
          })
        });
      } catch (e) {}
    }

    res.status(200).json({ ok: true, copy });
  } catch (err) {
    // 1407: a public signer sees a plain sentence; the database's own text stays in the server log
    console.error('clientsign', err && err.message || err);
    res.status(500).json({ error: 'We could not save your signature. Please try again, or call Cardinal at the number on the document.' });
  }
}
