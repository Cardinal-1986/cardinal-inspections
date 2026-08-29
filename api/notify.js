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
    /* 1103: hand the caller's own token back. The SMS phone lookup needs it —
       team_profiles' only SELECT policy is roles={authenticated} using=is_staff(),
       so a query sent with the publishable key arrives as `anon`, matches no
       policy, and RLS returns an EMPTY ARRAY rather than an error. */
    user._token = token;
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

/* 1106: describe a credential's SHAPE without ever revealing it. Twilio answers
   a wrong key and an INVISIBLY wrong key with the same 20003, so "check the
   keys" sent Theo round the same loop twice: he re-copied both, redeployed
   twice, and got the identical error. What the message could not say is that
   nothing here ever trimmed the values — Vercel stores exactly what was
   pasted, and a trailing newline off a phone copy rides straight into the
   Basic auth header. Reported: the two-letter type prefix (AC/MG/SK are public
   type markers, not secrets), the length, and whether it arrived wrapped in
   whitespace. Never a character of the token itself. */
function twShape(raw, wantPrefix, wantLen){
  var s = String(raw == null ? '' : raw), t = s.trim();
  if(!t) return 'not set';
  var bits = [];
  if(s !== t) bits.push('has stray whitespace');
  if(wantPrefix && t.slice(0, 2).toUpperCase() !== wantPrefix)
    bits.push('starts "' + t.slice(0, 2) + '", expected "' + wantPrefix + '"');
  if(wantLen && t.length !== wantLen) bits.push(t.length + ' chars, expected ' + wantLen);
  return bits.length ? bits.join('; ') : 'looks right';
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ ok:false, error:'POST only' }); return; }
  const _caller = await requireSession(req, res);
  if(!_caller) return;
  /* 1106: read and TRIM the Twilio config once, here, and use these everywhere
     below. Two things this fixes at once: a pasted newline no longer corrupts
     the auth header, and the capability report can no longer disagree with the
     send gate — build 1100 widened two of the three sites and left the third,
     which is how the app said "not set up yet" while it was busy sending. One
     source, three readers. */
  var twSidRaw = process.env.TWILIO_ACCOUNT_SID, twTokRaw = process.env.TWILIO_AUTH_TOKEN;
  var twMsgSvcRaw = process.env.TWILIO_MESSAGING_SERVICE_SID, twFromRaw = process.env.TWILIO_FROM;
  var twSid = String(twSidRaw || '').trim(), twTok = String(twTokRaw || '').trim();
  var twMsgSvc = String(twMsgSvcRaw || '').trim(), twFrom = String(twFromRaw || '').trim();
  var twReady = !!(twSid && twTok && (twMsgSvc || twFrom));
  /* 1126: PUSH SETUP DEGRADES PUSH — it does not end the request.
     Until now both arms of this block did `res.status(500)` + `return`, BEFORE
     a single line of the email or SMS work below had run. So an unset
     VAPID_PRIVATE_KEY, or a web-push import that failed on a cold start, took
     out all three channels at once — and the 874 comment further down has said
     "each channel is independent, so a dead one never blocks the others" the
     whole time. It was true of email vs SMS and false of push vs everything.
     ⚠ The failure is still REPORTED, and by the same `reason` strings as before
     (`no_vapid_private`) so the two readers in index.html keep working. What
     changed is that it is now carried to the end as a per-channel error instead
     of being thrown as the route's only answer. */
  let webpush = null, pushReady = false, pushErr = null, pushReason = null;
  try{
    webpush = (await import('web-push')).default;
    /* 1084: there is no hardcoded private key any more. Before 1084 a missing env var
       fell back to a literal committed to the repo — which meant the leaked key was
       what actually signed production pushes, and any future key would leak the same
       way. Absent now means SAY SO: signing with '' throws deep inside web-push with
       a message that does not name the cause. */
    if(!VAPID_PRIVATE){
      pushErr = 'VAPID_PRIVATE_KEY is not set in this environment';
      pushReason = 'no_vapid_private';
    }else{
      webpush.setVapidDetails('mailto:info@cardinalrenovations.net', VAPID_PUBLIC, VAPID_PRIVATE);
      pushReady = true;
    }
  }catch(e){
    pushErr = 'push library unavailable: ' + ((e && e.message) || e);
    pushReason = 'push_unavailable';
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
        /* 1147: same fix as notifyTeam's own strip in index.html — a block END
           is a sentence boundary. Dropping `</p><p>` to '' ran the sentences
           together, so a text read "is marked COMPLETED.Next: do the final
           walk-around". Both strips have to do this: a caller may send `html`
           with no `body`, and then THIS is the one that builds the SMS. */
        .replace(/<\/(?:p|div|li|h[1-6]|tr|blockquote)\s*>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      ).slice(0, 300);
    var url = String(body.url || '/');
    /* 1125: the deep link, resolved HERE rather than trusted from the caller.
       Curtis, via Theo: a punch-out text should be tappable and land on the
       punch-out. Push already carried `url` (sw.js navigates to it) but every
       caller sent '/', and the SMS never carried it at all.
       ⚠ Only a SAME-SITE relative path or hash is accepted. This string ends up
       in a text message, so an absolute URL from a caller would be a link the
       route sends on someone else's behalf. Anything with a scheme, or a
       protocol-relative '//', is dropped back to '/' rather than sent. */
    var absUrl = '';
    try{
      if(/^[/#][^/]/.test(url) || url === '/'){
        var host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
        if(/^[a-z0-9.-]+(:\d+)?$/i.test(host) && url !== '/') absUrl = 'https://' + host + '/' + url.replace(/^\//, '');
      }else{
        url = '/';
      }
    }catch(_){ absUrl = ''; }
    if(!emails.length){
      res.status(200).json({ ok:true, sent:0, failed:0, mailed:0, texted:0, subs:0,
        reason:'no_recipients', push_error: pushErr || undefined,
        env:{ vapid_from_env:VAPID_FROM_ENV,
        resend:!!process.env.RESEND_API_KEY,
        sms:twReady /* 1106: TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM, trimmed, one source */,
        push: pushReady } });
      return;
    }

    var sent = 0, failed = 0, gone = 0, firstErr = null, subs = [];
    /* 1126: the THIRD abort point, and the least obvious of the three. A refused
       or errored push_subs query used to `return` here too — so a Supabase
       hiccup on the SUBSCRIPTION table silently cancelled the email and the
       text as well. It is a push-channel fault and now reads as one. */
    if(pushReady){
    var q = SUPA_URL + '/rest/v1/push_subs?select=email,endpoint,sub&email=in.(' +
      emails.map(function(e){ return '"' + e.replace(/"/g,'') + '"'; }).join(',') + ')';
    var r = await fetch(q, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } });
    var subsRaw = await r.json();
    if(!Array.isArray(subsRaw)){
      /* 612: this returned sent:0 and looked identical to "nobody is
         subscribed". A refused or errored query is a different problem and
         has to say so. */
      pushErr = 'could not read the subscription list: ' +
        String((subsRaw && (subsRaw.message || subsRaw.error)) || 'non-array response').slice(0,120);
      pushReason = 'subs_query_failed';
    }else{
    subs = subsRaw;
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
    }   /* end: subs query returned a usable array */
    }   /* 1126: end `if(pushReady)` — email and SMS below run regardless */

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
    /* 1100: prefer a Messaging Service (TWILIO_MESSAGING_SERVICE_SID) so every text
       rides the approved A2P 10DLC campaign and Twilio picks the registered sender;
       fall back to the bare From number when the service isn't configured, so the
       gate and behaviour are unchanged wherever only TWILIO_FROM is set.
       1106: twSid/twTok/twMsgSvc/twFrom are read and trimmed once at the top of
       the handler now — this block must not re-read process.env, or the two can
       drift apart again. */
    if(twReady && text){
      try{
        var pq = SUPA_URL + '/rest/v1/team_profiles?select=email,phone&email=in.(' +
          emails.map(function(e){ return '"' + e.replace(/"/g, '') + '"'; }).join(',') + ')';
        /* 1103: query as the SIGNED-IN CALLER, not as anon — see requireSession.
           RLS then matches team_profiles_select (is_staff()) and returns the rows.
           No service-role key and no RLS bypass: the person triggering the alert
           is staff, and staff may read the directory. */
        var _tok = (_caller && _caller._token) ? _caller._token : SUPA_KEY;
        var pfr = await fetch(pq, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _tok } });
        var profs = await pfr.json();
        var phones = [];
        if(!Array.isArray(profs)){
          /* a refused or errored lookup used to fall through as "no phones", which
             reads as "add your mobile number" — blaming the user for a server fault. */
          smsErr = 'team directory lookup failed: ' +
            String((profs && (profs.message || profs.error)) || 'non-array response').slice(0, 90);
        }else if(!profs.length){
          smsErr = 'no Team Directory row was readable for the recipient(s) - check staff access';
        }else{
          phones = profs.map(function(p){ return normPhone(p.phone); }).filter(Boolean);
          phones = phones.filter(function(v, i){ return phones.indexOf(v) === i; });   /* de-dupe */
        }
        if(phones.length){
          /* 1125: the link goes in the TEXT — an SMS has no hyperlink, so a
             url that only rides in the JSON is a url nobody can tap. It is
             appended AFTER the message is trimmed, never inside the slice, so
             a long punch-out title can never truncate the link itself. That is
             the whole point of the message. */
          var _tail = absUrl ? ('\n' + absUrl) : '';
          var smsBody = ((title ? title + ': ' : '') + text).slice(0, 320 - _tail.length) + _tail;
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
              else if(!smsErr){
                /* 1105: this dumped raw Twilio JSON truncated at 90 chars, so the
                   screen showed `{"code":20003,"message":"Authenticate","more_info":"https://w`
                   — cut mid-URL and unreadable on a phone. Say what the code MEANS
                   and what to do about it; keep the number so it is still searchable. */
                var raw1105 = await sr.text();
                var tc = 0, tm = '';
                try{ var tj = JSON.parse(raw1105); tc = Number(tj.code) || 0; tm = String(tj.message || ''); }catch(_tp){}
                if(sr.status === 401 || tc === 20003){
                  /* 1106: name WHICH value looks wrong. "Check the keys" is true and
                     useless — it is the same sentence whether the SID is a Messaging
                     Service id, the token is half a paste, or both are perfect and
                     carrying a newline. The shape says which, and reveals nothing. */
                  smsErr = 'Twilio rejected the credentials (20003). Account SID: ' +
                    twShape(twSidRaw, 'AC', 34) + '. Auth token: ' + twShape(twTokRaw, '', 32) +
                    '. Fix in Vercel, then redeploy.';
                }else if(tc === 21606 || tc === 21659 || tc === 21660){
                  smsErr = 'Twilio will not send from that sender (' + tc + '). Check the number is in the Messaging Service sender pool.';
                }else if(tc === 21610){
                  smsErr = 'That number replied STOP and is opted out (21610).';
                }else if(tc === 21211 || tc === 21614){
                  smsErr = 'Twilio rejected the recipient number (' + tc + ') — check the number in the Team Directory.';
                }else{
                  smsErr = 'HTTP ' + sr.status + (tc ? ' (' + tc + ')' : '') + (tm ? ' ' + tm : '');
                }
              }
            }catch(e4){ if(!smsErr) smsErr = String((e4 && e4.message) || e4).slice(0, 120); }
          }));
        }
      }catch(e5){ smsErr = String((e5 && e5.message) || e5).slice(0, 120); }
    }

    /* 612: name the cause, in the order that is actionable.
       1126: a push SETUP failure outranks everything below it — `no_subscriptions`
       was previously reported for an unconfigured push channel, which reads as
       "nobody has enabled notifications" and sends the reader to the wrong fix. */
    var reason = null;
    if(pushReason)                      reason = pushReason;
    else if(!subs.length)               reason = 'no_subscriptions';
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
      /* 1102: this is the report the in-app test button reads, and it was the ONE
         sms capability site build 1100 missed — it still demanded twFrom, so an
         account configured with a Messaging Service (and no bare From number)
         reported "not set up yet" even while the send gate happily sent the text.
         Mirror the send gate exactly: a Messaging Service OR a From number. */
      sms_error: smsErr || undefined,
      /* 1126: push gets the same per-channel error field email and SMS already
         had. Without it a dead push channel reported `subs:0`, and the test
         button read that as "no device enabled here yet — tap Enable
         notifications": a correct-looking sentence blaming the user for a
         missing server env var. */
      push_error: pushErr || undefined,
      env: { vapid_from_env: VAPID_FROM_ENV, resend: !!resendKey, sms: twReady /* 1106: same one source as the send gate */,
             push: pushReady }
    });
  }catch(err){
    res.status(200).json({ ok:false, error: String(err && err.message || err) });
  }
};
