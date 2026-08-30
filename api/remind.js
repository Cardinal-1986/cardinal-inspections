// api/remind.js — automatic invoice payment reminders (AR arc "Build 3", the
// reminders half; the ACH half shipped at 1151). Vercel Cron runs this once a
// day (vercel.json, 15:10 UTC ≈ 11:10am in Dayton) and texts the client of
// every RETAIL job whose invoice is sent and still owed, through the company
// Twilio number — the same Messaging Service as api/notify.js / api/sms-link.js.
//
// Decisions (Theo, 30 Aug 2026 — each picked from rendered options):
//   · RETAIL ONLY. Insurance balances often wait on carrier money, and
//     Community bills the FUNDING PARTNER, not the homeowner — an auto-text to
//     the occupant there duns the wrong party by design. Both are excluded by
//     the same claim_type test crmOf() uses in index.html.
//   · Cadence: first nudge 3 days after the invoice is sent, then every 7
//     days, at most 4 delivered reminders per job.
//   · SMS only. (Twilio is proven live end to end; Resend still sends from the
//     onboarding fallback until the domain is verified — email can join then.)
//   · Copy approved verbatim, amount included; "bank transfer" named before
//     "card" (fee steer — checkout itself is unchanged; most clients pay by
//     check, and a recorded check stops the reminders like any payment).
//
// THE FEATURE IS THE SKIP LIST — the worst thing this route can do is dun a
// client who already paid. A job is skipped when ANY of these holds:
//   not_retail     — insurance / community (see above)
//   muted          — projects.reminders_muted (the AR toggle; also set
//                    automatically when a number replies STOP, Twilio 21610)
//   paid           — balance ≤ 0, same money model as api/pay.js's owedOn():
//                    signed-contract total (else the invoice's own total)
//                    minus every collections row
//   recent_payment — any collections row in the last 3 days (a check just
//                    landed; give the ledger room to settle before nudging)
//   processing     — a Stripe payment for this project is in flight (an ACH
//                    debit takes days and the ledger cannot see it until it
//                    settles — 1151's find). Stripe is ASKED before texting;
//                    on a Stripe error the job is skipped, not texted — the
//                    cost asymmetry favors a day's delay over a wrong nudge.
//   too_soon       — sent < 3 days ago, or the last reminder < 7 days ago
//   capped         — 4 reminders delivered (or 8 attempts incl. failures)
//   no_phone / no_token — nothing usable to text, or no share link minted
//
// Auth is fail-closed, exactly like api/digest.js: CRON_SECRET unset means
// this route refuses EVERYTHING, the cron included. Vercel sends
// `Authorization: Bearer <CRON_SECRET>` automatically once the env var exists.
// `?dry=1` reports eligibility without sending — verify live without texting
// a client.
//
// Needs: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, TWILIO_ACCOUNT_SID,
// TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM.
// Optional: STRIPE_SECRET_KEY (enables the in-flight-payment check).

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const APP_ORIGIN = 'https://app.cardinalroster.com';

const FIRST_DAYS = 3;        // invoice must be this many days sent before nudge 1
const EVERY_DAYS = 7;        // spacing between reminders
const MAX_OK = 4;            // delivered reminders per job, ever
const MAX_ATTEMPTS = 8;      // total attempts incl. failures — a dead number stops consuming the log
const RECENT_PAY_DAYS = 3;   // any payment this recent pauses reminding
const MAX_PER_RUN = 25;      // safety cap per cron run

// E.164 for Twilio — mirrors api/sms-link.js exactly.
function normPhone(p) {
  if (!p) return '';
  var s = String(p).trim();
  if (s.charAt(0) === '+') { var t = s.slice(1).replace(/[^\d]/g, ''); return t ? '+' + t : ''; }
  var d = s.replace(/[^\d]/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return '';
}
function daysSince(iso) {
  if (!iso) return Infinity;
  var t = Date.parse(iso);
  if (!isFinite(t)) return Infinity;
  return (Date.now() - t) / 86400000;
}
// exact cents, the 745 rule — an invoice reminder is money, not a nudge-round number
function money(n) {
  return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function firstNameOf(name) {
  return (String(name || '').trim().split(/\s+/)[0] || 'there').slice(0, 20);
}
// MIRROR of crmOf() in index.html: checklist.lead.claim_type decides the CRM;
// anything that is not insurance/community is retail.
function crmTypeOf(p) {
  var ck = p && p.checklist;
  if (typeof ck === 'string') { try { ck = JSON.parse(ck); } catch (e) { ck = {}; } }
  var t = (((ck || {}).lead) || {}).claim_type || '';
  return (t === 'insurance' || t === 'community') ? t : 'retail';
}

export default async function handler(req, res) {
  // ── fail-closed door, the api/digest.js shape ──────────────────────────
  var secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(401).json({ ok: false, error: 'CRON_SECRET is not configured in Vercel, so the scheduled door is closed.' });
    return;
  }
  var auth = req.headers.authorization || '';
  if (auth !== 'Bearer ' + secret) { res.status(401).json({ ok: false, error: 'Unauthorized' }); return; }

  var srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!srk) { res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not set' }); return; }
  var H = { apikey: srk, Authorization: 'Bearer ' + srk };
  var HW = Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }, H);

  // Twilio config, trimmed once (the 1106 lesson — a pasted newline corrupts the header)
  var twSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  var twTok = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  var twMsgSvc = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
  var twFrom = String(process.env.TWILIO_FROM || '').trim();
  var smsReady = !!(twSid && twTok && (twMsgSvc || twFrom));
  var stripeKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  var q = req.query || {};
  var dry = q.dry === '1' || q.dry === 'true';

  var skipped = { not_retail: 0, muted: 0, paid: 0, recent_payment: 0, processing: 0, too_soon: 0, capped: 0, no_phone: 0, no_token: 0, stripe_error: 0 };

  try {
    // 0) THE MASTER SWITCH (1157) — the AR header's toggle, app_settings key
    //    payment_reminders_enabled. A MISSING row reads as OFF: the feature
    //    arrives dark and Theo turns it on. A failed read refuses to guess.
    //    Dry runs continue either way so the switch can be previewed while off.
    var sw = await fetch(SUPABASE_URL + '/rest/v1/app_settings?key=eq.payment_reminders_enabled&select=value&limit=1', { headers: H });
    if (!sw.ok) { res.status(500).json({ ok: false, error: 'settings read failed (' + sw.status + ')' }); return; }
    var swRows = await sw.json();
    var enabled = !!(Array.isArray(swRows) && swRows.length && swRows[0].value === true);
    if (!enabled && !dry) { res.status(200).json({ ok: true, enabled: false, reason: 'disabled', checked: 0, eligible: 0, sent: 0, skipped: skipped }); return; }

    // 1) every sent, invoice-titled document (newest per project wins, as
    //    invoiceFor() does in the app)
    var ir = await fetch(SUPABASE_URL + '/rest/v1/inspection_reports'
      + '?status=eq.sent&title=ilike.invoice*'
      + '&select=id,project_id,title,total,sent_at,created_at,share_token'
      + '&order=created_at.desc&limit=500', { headers: H });
    if (!ir.ok) { res.status(500).json({ ok: false, error: 'invoice read failed (' + ir.status + ')' }); return; }
    var invRows = await ir.json();
    var invByP = {};
    for (var i = 0; i < invRows.length; i++) {
      var r0 = invRows[i];
      if (r0 && r0.project_id && !invByP[r0.project_id]) invByP[r0.project_id] = r0;
    }
    var pids = Object.keys(invByP);
    if (!pids.length) { res.status(200).json({ ok: true, dry: dry, checked: 0, eligible: 0, sent: 0, skipped: skipped }); return; }
    var inList = 'in.(' + pids.map(encodeURIComponent).join(',') + ')';

    // 2) the jobs, the money already in, every doc (for signed-contract totals),
    //    and the reminder history — four reads, one round trip each
    var reads = await Promise.all([
      fetch(SUPABASE_URL + '/rest/v1/projects?id=' + inList + '&select=id,name,phone,checklist,reminders_muted', { headers: H }),
      fetch(SUPABASE_URL + '/rest/v1/collections?project_id=' + inList + '&select=project_id,amount,collected_at,created_at', { headers: H }),
      fetch(SUPABASE_URL + '/rest/v1/inspection_reports?project_id=' + inList + '&select=project_id,title,total,signed_at', { headers: H }),
      fetch(SUPABASE_URL + '/rest/v1/payment_reminders?project_id=' + inList + '&select=project_id,sent_at,ok&order=sent_at.desc', { headers: H })
    ]);
    for (var ri = 0; ri < reads.length; ri++) {
      if (!reads[ri].ok) { res.status(500).json({ ok: false, error: 'read ' + ri + ' failed (' + reads[ri].status + ')' }); return; }
    }
    var projRows = await reads[0].json();
    var collRows = await reads[1].json();
    var docRows = await reads[2].json();
    var logRows = await reads[3].json();

    var projById = {}; projRows.forEach(function (p) { projById[p.id] = p; });
    var collByP = {}; collRows.forEach(function (c) { (collByP[c.project_id] = collByP[c.project_id] || []).push(c); });
    var docsByP = {}; docRows.forEach(function (d) { (docsByP[d.project_id] = docsByP[d.project_id] || []).push(d); });
    var logByP = {}; logRows.forEach(function (l) { (logByP[l.project_id] = logByP[l.project_id] || []).push(l); });

    // 3) the skip ladder, per job
    var eligible = [];
    for (var pi = 0; pi < pids.length; pi++) {
      var pid = pids[pi];
      var inv = invByP[pid];
      var p = projById[pid];
      if (!p) { skipped.not_retail++; continue; }                 // invisible project row — never text blind
      if (crmTypeOf(p) !== 'retail') { skipped.not_retail++; continue; }
      if (p.reminders_muted) { skipped.muted++; continue; }

      var collected = 0;
      (collByP[pid] || []).forEach(function (c) { collected += Number(c.amount) || 0; });
      var contractTotal = 0;
      (docsByP[pid] || []).forEach(function (d) {
        if (/^contract/i.test(String(d.title || '').trim()) && d.signed_at && Number(d.total) > 0) contractTotal += Number(d.total);
      });
      var jobTotal = contractTotal > 0 ? contractTotal : (Number(inv.total) || 0);
      var balance = jobTotal - collected;
      if (!(balance > 0.005)) { skipped.paid++; continue; }

      var payCut = Date.now() - RECENT_PAY_DAYS * 86400000;
      var recent = (collByP[pid] || []).some(function (c) {
        var t1 = Date.parse(c.created_at || ''), t2 = Date.parse(c.collected_at || '');
        return (isFinite(t1) && t1 >= payCut) || (isFinite(t2) && t2 >= payCut);
      });
      if (recent) { skipped.recent_payment++; continue; }

      if (daysSince(inv.sent_at || inv.created_at) < FIRST_DAYS) { skipped.too_soon++; continue; }
      var lg = logByP[pid] || [];
      var okSends = lg.filter(function (l) { return l.ok !== false; });
      if (okSends.length >= MAX_OK || lg.length >= MAX_ATTEMPTS) { skipped.capped++; continue; }
      if (okSends.length && daysSince(okSends[0].sent_at) < EVERY_DAYS) { skipped.too_soon++; continue; }

      var to = normPhone(p.phone);
      if (!to) { skipped.no_phone++; continue; }
      if (!inv.share_token) { skipped.no_token++; continue; }

      eligible.push({ pid: pid, inv: inv, p: p, to: to, balance: balance });
      if (eligible.length >= MAX_PER_RUN) break;
    }

    if (dry) {
      res.status(200).json({
        ok: true, dry: true, enabled: enabled, checked: pids.length, eligible: eligible.length, sent: 0, skipped: skipped,
        would_text: eligible.map(function (e) { return { project_id: e.pid, name: e.p.name || '', balance: e.balance }; })
      });
      return;
    }
    if (eligible.length && !smsReady) {
      res.status(200).json({ ok: false, reason: 'sms_not_configured', checked: pids.length, eligible: eligible.length, sent: 0, skipped: skipped });
      return;
    }

    // 4) ask Stripe, then text, then log — sequentially; the list is small
    var twUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(twSid) + '/Messages.json';
    var twAuth = 'Basic ' + Buffer.from(twSid + ':' + twTok).toString('base64');
    var sent = 0;

    for (var ei = 0; ei < eligible.length; ei++) {
      var e = eligible[ei];

      // in-flight payment? (an ACH debit is invisible to the ledger until it settles)
      if (stripeKey) {
        try {
          var sq = encodeURIComponent("metadata['project_id']:'" + e.pid + "' AND status:'processing'");
          var sr0 = await fetch('https://api.stripe.com/v1/payment_intents/search?limit=1&query=' + sq,
            { headers: { Authorization: 'Bearer ' + stripeKey } });
          if (!sr0.ok) { skipped.stripe_error++; continue; }
          var sj = await sr0.json();
          if (sj && sj.data && sj.data.length) { skipped.processing++; continue; }
        } catch (se) { skipped.stripe_error++; continue; }
      }

      var link = APP_ORIGIN + '/api/share?t=' + e.inv.share_token;
      // the approved copy, verbatim. Only name and amount vary, both bounded,
      // so the message cannot grow past ~2 segments and can never eat the link.
      var body = 'Hi ' + firstNameOf(e.p.name) + ', it’s Cardinal Roofing & Renovations — a friendly reminder that your invoice has a balance of '
        + money(e.balance) + '. Review and pay securely (bank transfer or card) here: ' + link
        + '. Questions? Just call or text us back.';

      var params = { To: e.to, Body: body };
      if (twMsgSvc) params.MessagingServiceSid = twMsgSvc; else params.From = twFrom;

      var okSend = false, detail = '';
      try {
        var tw = await fetch(twUrl, {
          method: 'POST',
          headers: { Authorization: twAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(params).toString()
        });
        if (tw.ok) { okSend = true; sent++; }
        else {
          var raw = await tw.text(), tc = 0, tm = '';
          try { var tj = JSON.parse(raw); tc = Number(tj.code) || 0; tm = String(tj.message || ''); } catch (_) { }
          detail = 'twilio ' + tw.status + (tc ? ' (' + tc + ')' : '') + (tm ? ' ' + tm.slice(0, 140) : '');
          if (tc === 21610) {
            // STOP — opted out. Mute the job so it is never attempted again.
            detail = 'opted out (21610) — auto-muted';
            try {
              await fetch(SUPABASE_URL + '/rest/v1/projects?id=eq.' + encodeURIComponent(e.pid),
                { method: 'PATCH', headers: HW, body: JSON.stringify({ reminders_muted: true }) });
            } catch (_) { }
          }
        }
      } catch (te) { detail = String((te && te.message) || te).slice(0, 160); }

      // log the attempt — the AR view reads this, and the cadence math above depends on it
      try {
        await fetch(SUPABASE_URL + '/rest/v1/payment_reminders', {
          method: 'POST', headers: HW,
          body: JSON.stringify([{ project_id: e.pid, report_id: e.inv.id, channel: 'sms', sent_to: e.to, ok: okSend, detail: detail || null }])
        });
      } catch (_) { }
    }

    res.status(200).json({ ok: true, dry: false, enabled: true, checked: pids.length, eligible: eligible.length, sent: sent, skipped: skipped });
  } catch (err) {
    res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
}
