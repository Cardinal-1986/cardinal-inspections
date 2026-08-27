/* Vercel serverless: fan out a team alert as web-push AND email.
 *
 * 611: this was push-only, and notifyTeam() in index.html has always posted
 * {to, subject, html} while this read {emails, title, body, url} — so its
 * seven call sites hit the `if(!emails.length)` early return and answered
 * {ok:true, sent:0}. Both halves are fixed: the payload is normalised here
 * so either shape works, and email now actually goes out through the same
 * Resend account api/digest.js has been using for the daily schedule.
 *
 * Email is best-effort and never blocks push: no RESEND_API_KEY simply means
 * mailed:0, which is the previous behaviour rather than a failure. */
const SUPA_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPA_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';
const VAPID_PUBLIC = 'BMSHf0GA9pwE6xzqOYb4vlLE4pMs9sdP9ZuxXzgZXLR2UaXYVD-9-4o6zDjr5XHOa5runSWlKSNDaEWPfmo07uU';
/* 612: whether the private key came from the environment or from the literal
   below is the single most useful fact when push silently fails — a fallback
   that no longer pairs with VAPID_PUBLIC makes every send 401/403. Reported
   as a BOOLEAN. The value is never returned, logged or echoed. */
const VAPID_FROM_ENV = !!(process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE);
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE || '';

/* 642: this route had NO session check. It touched `req` exactly twice —
   req.method and req.body — while notifyTeam() in index.html has always sent an
   Authorization header the route then ignored. Anyone who knew the path could
   POST to it. That was merely noisy while the route was push-only; 611 added
   Resend email and passes `to: emails` straight through from the body, which
   turned it into an open relay able to send mail FROM Cardinal's account to any
   address. Same gate as organize.js / analyze.js / caption.js / librarian.js.
   Do not remove it to "make a script work" — give the script a session. */
async function requireSession(req, res){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if(!token){ res.status(401).json({ ok:false, error:'Sign in required' }); return null; }
  try{
    const who = await fetch(SUPA_URL + '/auth/v1/user', {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token }
    });
    if(!who.ok){ res.status(401).json({ ok:false, error:'Invalid session' }); return null; }
    const user = await who.json();
    if(!user || !user.email){ res.status(401).json({ ok:false, error:'Invalid session' }); return null; }
    return user;
  }catch(e){
    res.status(401).json({ ok:false, error:'Could not verify session' });
    return null;
  }
}

/* 874: staff phone -> E.164 for Twilio. team_profiles.phone is free-form
   ("(937) 555-1212", "937-555-1212", "+19375551212"). Best-effort: anything we
   cannot make sense of returns '' and is SKIPPED rather than sent to a bad
   number — a text to a malformed number is a wasted send, not a delivery. We
   never guess a country code for an unknown shape. */
function normPhone(p){
  if(!p) return '';
  var s = String(p).trim();
  if(s.charAt(0) === '+'){ var t = s.slice(1).replace(/[^\d]/g, ''); return t ? '+' + t : ''; }
  var d = s.replace(/[^\d]/g, '');
  if(d.length === 10) return '+1' + d;             /* US 10-digit */
  if(d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return '';
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ ok:false, error:'POST only' }); return; }
  if(!(await requireSession(req, res))) return;
  let webpush;
  try{
    webpush = (await import('web-push')).default;
    /* 1084: there is no hardcoded private key any more. Before 1084 a missing env var
       fell back to a literal committed to the repo — which meant the leaked key was
       what actually signed production pushes, and any future key would leak the same
       way. Absent now means SAY SO: signing with '' throws deep inside web-push with
       a message that does not name the cause. */
    if(!VAPID_PRIVATE){
      res.status(500).json({ ok:false, error:'VAPID_PRIVATE_KEY is not set in this environment',
        reason:'no_vapid_private', env:{ vapid_from_env:false } });
      return;
    }
    webpush.setVapidDetails('mailto:info@cardinalrenovations.net', VAPID_PUBLIC, VAPID_PRIVATE);
  }catch(e){
    res.status(500).json({ ok:false, error: 'push library unavailable: ' + (e.message || e) });
    return;
  }
  try{
    var body = req.body || {};
    /* Accept `emails` (the push caller) or `to` (notifyTeam), array or a
       comma/semicolon list. A recipient list that silently reads as empty is
       what made this route look healthy for months. */
    var emails = Array.isArray(body.emails) ? body.emails.filter(Boolean)
               : Array.isArray(body.to)     ? body.to.filter(Boolean)
               : body.to                    ? String(body.to).split(/[,;]\s*/).filter(Boolean)
               : [];
    var html = body.html ? String(body.html) : '';
    var title = String(body.title || body.subject || 'Cardinal Resource').slice(0, 120);
    var text = String(body.body || html
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      ).slice(0, 300);
    var url = String(body.url || '/');
    if(!emails.length){
      res.status(200).json({ ok:true, sent:0, failed:0, mailed:0, texted:0, subs:0,
        reason:'no_recipients', env:{ vapid_from_env:VAPID_FROM_ENV,
        resend:!!process.env.RESEND_API_KEY,
        sms:!!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM)) } });
      return;
    }

    var q = SUPA_URL + '/rest/v1/push_subs?select=email,endpoint,sub&email=in.(' +
      emails.map(function(e){ return '"' + e.replace(/"/g,'') + '"'; }).join(',') + ')';
    var r = await fetch(q, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } });
    var subs = await r.json();
    if(!Array.isArray(subs)){
      /* 612: this returned sent:0 and looked identical to "nobody is
         subscribed". A refused or errored query is a different problem and
         has to say so. */
      res.status(200).json({ ok:false, sent:0, failed:0, mailed:0, texted:0, subs:0,
        reason:'subs_query_failed',
        detail:String((subs && (subs.message || subs.error)) || 'non-array response').slice(0,140),
        env:{ vapid_from_env:VAPID_FROM_ENV, resend:!!process.env.RESEND_API_KEY,
        sms:!!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM)) } });
      return;
    }

    var sent = 0, failed = 0, gone = 0, firstErr = null;
    await Promise.all(subs.map(async function(row){
      try{
        await webpush.sendNotification(row.sub, JSON.stringify({ title:title, body:text, url:url }));
        sent++;
      }catch(err){
        var code = err && err.statusCode;
        if(code === 404 || code === 410){
          /* the subscription is dead — expected, not a failure */
          gone++;
          try{
            await fetch(SUPA_URL + '/rest/v1/push_subs?endpoint=eq.' + encodeURIComponent(row.endpoint),
              { method:'DELETE', headers:{ apikey: SUPA_KEY, Authorization:'Bearer ' + SUPA_KEY } });
          }catch(e2){}
        } else {
          /* 612: everything else used to vanish here. 401/403 is the one that
             matters — it means the signature did not verify, i.e. the private
             key in the environment does not pair with VAPID_PUBLIC. */
          failed++;
          if(!firstErr) firstErr = { status: code || 0,
            msg: String((err && err.message) || err).slice(0, 140) };
        }
      }
    }));

    /* Email, best-effort. A phone that never registered is the common case —
       Theo's was the ONLY row in push_subs, and stale — so an alert that can
       only reach a subscribed device is an alert that mostly does not arrive. */
    var mailed = 0, mailErr = null;
    var resendKey = process.env.RESEND_API_KEY;
    if(resendKey && (html || text)){
      var from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
      try{
        var mr = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + resendKey },
          body: JSON.stringify({
            from: from, to: emails, subject: title,
            html: html || ('<p>' + text.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</p>')
          })
        });
        if(mr.ok) mailed = emails.length;
        else mailErr = 'HTTP ' + mr.status + ' ' + (await mr.text()).slice(0, 90);
      }catch(e3){ mailErr = String((e3 && e3.message) || e3).slice(0, 120); }
    }

    /* 874: SMS via Twilio, best-effort and gated on TWILIO_* exactly like email
       is gated on RESEND_API_KEY — no keys simply means texted:0, never a failure.
       Recipient phones come from team_profiles (the Team Directory), matched to
       the same recipient emails. A push, an email and a text can all fire for one
       alert; each channel is independent, so a dead one never blocks the others. */
    var texted = 0, smsErr = null;
    var twSid = process.env.TWILIO_ACCOUNT_SID, twTok = process.env.TWILIO_AUTH_TOKEN, twFrom = process.env.TWILIO_FROM;
    /* 1100: prefer a Messaging Service (TWILIO_MESSAGING_SERVICE_SID) so every text
       rides the approved A2P 10DLC campaign and Twilio picks the registered sender;
       fall back to the bare From number when the service isn't configured, so the
       gate and behaviour are unchanged wherever only TWILIO_FROM is set. */
    var twMsgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID;
    if(twSid && twTok && (twMsgSvc || twFrom) && text){
      try{
        var pq = SUPA_URL + '/rest/v1/team_profiles?select=email,phone&email=in.(' +
          emails.map(function(e){ return '"' + e.replace(/"/g, '') + '"'; }).join(',') + ')';
        var pfr = await fetch(pq, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } });
        var profs = await pfr.json();
        var phones = Array.isArray(profs)
          ? profs.map(function(p){ return normPhone(p.phone); }).filter(Boolean)
          : [];
        phones = phones.filter(function(v, i){ return phones.indexOf(v) === i; });   /* de-dupe */
        if(phones.length){
          var smsBody = ((title ? title + ': ' : '') + text).slice(0, 320);
          var twUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(twSid) + '/Messages.json';
          var twAuth = 'Basic ' + Buffer.from(twSid + ':' + twTok).toString('base64');
          await Promise.all(phones.map(async function(to){
            try{
              var params = { To: to, Body: smsBody };
              if(twMsgSvc) params.MessagingServiceSid = twMsgSvc; else params.From = twFrom;
              var form = new URLSearchParams(params).toString();
              var sr = await fetch(twUrl, { method: 'POST',
                headers: { Authorization: twAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form });
              if(sr.ok) texted++;
              else if(!smsErr) smsErr = 'HTTP ' + sr.status + ' ' + (await sr.text()).slice(0, 90);
            }catch(e4){ if(!smsErr) smsErr = String((e4 && e4.message) || e4).slice(0, 120); }
          }));
        }
      }catch(e5){ smsErr = String((e5 && e5.message) || e5).slice(0, 120); }
    }

    /* 612: name the cause, in the order that is actionable. */
    var reason = null;
    if(!subs.length)                    reason = 'no_subscriptions';
    else if(sent === 0 && failed > 0)   reason = (firstErr && (firstErr.status === 401 ||
                                                  firstErr.status === 403))
                                                 ? 'vapid_mismatch' : 'push_rejected';
    else if(sent === 0 && gone > 0)     reason = 'subscriptions_expired';
    if(sent === 0 && mailed === 0 && !resendKey) reason = reason || 'resend_missing';
    if(sent === 0 && mailed === 0 && mailErr)    reason = reason || 'email_failed';

    res.status(200).json({
      ok: (sent > 0 || mailed > 0 || texted > 0),
      sent: sent, failed: failed, gone: gone, mailed: mailed, texted: texted, subs: subs.length,
      reason: reason,
      detail: firstErr ? (firstErr.status ? ('HTTP ' + firstErr.status + ' ' + firstErr.msg)
                                          : firstErr.msg)
            : (mailErr || smsErr || undefined),
      /* presence only — never the values */
      env: { vapid_from_env: VAPID_FROM_ENV, resend: !!resendKey, sms: !!(twSid && twTok && twFrom) }
    });
  }catch(err){
    res.status(200).json({ ok:false, error: String(err && err.message || err) });
  }
};
