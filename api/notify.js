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
const VAPID_PUBLIC = 'BI-nCdPXgT_WzKQA34jhHsX3dYQephRPLDKy7xr__Jyl1WergJWPlliAvbIldjztrds65MPkT5xI0TvDTg-Q_2k';
/* 612: whether the private key came from the environment or from the literal
   below is the single most useful fact when push silently fails — a fallback
   that no longer pairs with VAPID_PUBLIC makes every send 401/403. Reported
   as a BOOLEAN. The value is never returned, logged or echoed. */
const VAPID_FROM_ENV = !!(process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE);
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE ||
  'vtIkMaIEJxS2yUNI0wgulFiFxze4w3dfcRXFzsG-3qU';

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ ok:false, error:'POST only' }); return; }
  let webpush;
  try{
    webpush = (await import('web-push')).default;
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
      res.status(200).json({ ok:true, sent:0, failed:0, mailed:0, subs:0,
        reason:'no_recipients', env:{ vapid_from_env:VAPID_FROM_ENV,
        resend:!!process.env.RESEND_API_KEY } });
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
      res.status(200).json({ ok:false, sent:0, failed:0, mailed:0, subs:0,
        reason:'subs_query_failed',
        detail:String((subs && (subs.message || subs.error)) || 'non-array response').slice(0,140),
        env:{ vapid_from_env:VAPID_FROM_ENV, resend:!!process.env.RESEND_API_KEY } });
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
      ok: (sent > 0 || mailed > 0),
      sent: sent, failed: failed, gone: gone, mailed: mailed, subs: subs.length,
      reason: reason,
      detail: firstErr ? (firstErr.status ? ('HTTP ' + firstErr.status + ' ' + firstErr.msg)
                                          : firstErr.msg)
            : (mailErr || undefined),
      /* presence only — never the values */
      env: { vapid_from_env: VAPID_FROM_ENV, resend: !!resendKey }
    });
  }catch(err){
    res.status(200).json({ ok:false, error: String(err && err.message || err) });
  }
};
