"""Build 1352 — quiet hours for team alerts (Theo, 16 Oct: "Can you silence the notifications to others so i dont
wake them up between 9pm-7am everyday?").
api/notify.js is the one chokepoint every team alert goes through (push, email, text). Between 9:00 pm and
7:00 am Dayton time (America/New_York, so daylight saving moves with it), for every recipient OTHER than the
person who triggered the alert:
  - push is not sent (it is what lights a phone up; it cannot be scheduled);
  - the email is scheduled for 7:00 am (Resend scheduled_at);
  - the text is scheduled for 7:00 am (Twilio SendAt + ScheduleType=fixed, which needs the Messaging Service;
    without one the text is skipped and the reply says so). Twilio needs SendAt >= 15 min ahead, so a text
    queued at 6:50 goes at 7:06.
The person who triggered it still gets theirs right away. The timed routes (morning digest 7am, payment
reminders 11:10am, punch buzz 7am-6pm) already only send in the daytime and are not touched.
Plus the app stamp + CHANGELOG entry."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))
app = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'index.html')
api = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, 'api', 'notify.js')
s = open(api, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""function normPhone(p){""",
"""/* 1352: QUIET HOURS. 9:00 pm – 7:00 am in Dayton, every day. Exported for the gate. */
const QUIET_TZ = 'America/New_York';
function etParts(d){
  const p = new Intl.DateTimeFormat('en-US', { timeZone: QUIET_TZ, hourCycle: 'h23', year: 'numeric',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d);
  const g = t => Number((p.find(x => x.type === t) || {}).value);
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour'), mi: g('minute') };
}
export function isQuietHours(d){ const h = etParts(d).h; return h >= 21 || h < 7; }
/* the next 7:00 am in Dayton, as a real instant (EDT is UTC-4, EST is UTC-5: try both, keep the one that reads 7:00) */
export function quietSendAt(d){
  const p = etParts(d);
  let y = p.y, m = p.m, day = p.d;
  if(p.h >= 7){ const t = new Date(Date.UTC(y, m - 1, day) + 86400000); y = t.getUTCFullYear(); m = t.getUTCMonth() + 1; day = t.getUTCDate(); }
  let at = new Date(Date.UTC(y, m - 1, day, 11, 0));
  for(const off of [4, 5]){
    const c = new Date(Date.UTC(y, m - 1, day, 7 + off, 0)), q = etParts(c);
    if(q.h === 7 && q.mi === 0 && q.d === day){ at = c; break; }
  }
  /* Twilio refuses a SendAt under 15 minutes away; Resend has no floor, but one time for both keeps them together */
  const floor = new Date(d.getTime() + 16 * 60000);
  return at < floor ? floor : at;
}

function normPhone(p){""")

one("""    var sent = 0, failed = 0, gone = 0, firstErr = null, subs = [];""",
"""    /* 1352: quiet hours — who gets it now and who gets it at 7:00 am */
    var _me1352 = String((_caller && _caller.email) || '').toLowerCase();
    var _now1352 = new Date();
    /* NOTIFY_QUIET_HOURS=off in Vercel turns it off without a deploy (and the older timing-blind gates set it) */
    var quiet = !/^(off|0|false|no)$/i.test(String(process.env.NOTIFY_QUIET_HOURS || '').trim()) && isQuietHours(_now1352);
    var sendAt = quiet ? quietSendAt(_now1352) : null;
    var isHeld = function(em){ return quiet && String(em || '').toLowerCase() !== _me1352; };
    var held = emails.filter(isHeld).length, pushHeld = 0, smsHeldSkipped = 0, mailScheduled = 0, textScheduled = 0;
    var sent = 0, failed = 0, gone = 0, firstErr = null, subs = [];""")

one("""    await Promise.all(subs.map(async function(row){
      try{
        await webpush.sendNotification(""",
"""    await Promise.all(subs.map(async function(row){
      /* 1352: a push cannot be scheduled and it is what wakes a phone — at night it is simply not sent to others */
      if(isHeld(row.email)){ pushHeld++; return; }
      try{
        await webpush.sendNotification(""")

one("""      try{
        var mr = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + resendKey },
          body: JSON.stringify({
            from: from, to: emails, subject: title,
            html: mailHtml
          })
        });
        if(mr.ok) mailed = emails.length;
        else mailErr = 'HTTP ' + mr.status + ' ' + (await mr.text()).slice(0, 90);
      }catch(e3){ mailErr = String((e3 && e3.message) || e3).slice(0, 120); }""",
"""      /* 1352: at night everyone but the sender gets it at 7:00 am (Resend scheduled_at) */
      var mailGroups = [{ to: emails.filter(function(e){ return !isHeld(e); }), at: null },
                        { to: emails.filter(isHeld), at: sendAt }];
      for(var mg = 0; mg < mailGroups.length; mg++){
        var grp = mailGroups[mg];
        if(!grp.to.length) continue;
        try{
          var mailBody = { from: from, to: grp.to, subject: title, html: mailHtml };
          if(grp.at) mailBody.scheduled_at = grp.at.toISOString();
          var mr = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + resendKey },
            body: JSON.stringify(mailBody)
          });
          if(mr.ok){ mailed += grp.to.length; if(grp.at) mailScheduled += grp.to.length; }
          else if(!mailErr) mailErr = 'HTTP ' + mr.status + ' ' + (await mr.text()).slice(0, 90);
        }catch(e3){ if(!mailErr) mailErr = String((e3 && e3.message) || e3).slice(0, 120); }
      }""")

one("""          phones = profs.map(function(p){ return normPhone(p.phone); }).filter(Boolean);
          phones = phones.filter(function(v, i){ return phones.indexOf(v) === i; });   /* de-dupe */""",
"""          phones = profs.map(function(p){ return normPhone(p.phone); }).filter(Boolean);
          phones = phones.filter(function(v, i){ return phones.indexOf(v) === i; });   /* de-dupe */
          /* 1352: which numbers belong to someone asleep. A number shared with the sender is never held. */
          var heldPhones = {};
          profs.forEach(function(p){ var n = normPhone(p.phone); if(n && isHeld(p.email)) heldPhones[n] = true; });
          profs.forEach(function(p){ var n = normPhone(p.phone); if(n && !isHeld(p.email)) delete heldPhones[n]; });""")

one("""            try{
              var params = { To: to, Body: smsBody };
              if(twMsgSvc) params.MessagingServiceSid = twMsgSvc; else params.From = twFrom;""",
"""            try{
              var params = { To: to, Body: smsBody };
              if(twMsgSvc) params.MessagingServiceSid = twMsgSvc; else params.From = twFrom;
              /* 1352: schedule a sleeper's text for 7:00 am. Twilio schedules only through a Messaging Service. */
              if(heldPhones[to]){
                if(!twMsgSvc){ smsHeldSkipped++; return; }
                params.SendAt = sendAt.toISOString();
                params.ScheduleType = 'fixed';
              }""")
one("""              if(sr.ok) texted++;""",
"""              if(sr.ok){ texted++; if(heldPhones[to]) textScheduled++; }""")

one("""      push_error: pushErr || undefined,
      env: {""",
"""      push_error: pushErr || undefined,
      /* 1352: what quiet hours did with this alert */
      quiet: quiet || undefined,
      held: quiet ? held : undefined,
      send_at: sendAt ? sendAt.toISOString() : undefined,
      quiet_detail: quiet ? { push_held: pushHeld, mail_scheduled: mailScheduled, text_scheduled: textScheduled,
                              text_skipped_no_service: smsHeldSkipped } : undefined,
      env: {""")
pl.write_atomic(api, s)

a = open(app, encoding='utf-8').read()
def one_a(old, new):
    global a
    n = a.count(old); assert n == 1, (n, old[:90]); a = a.replace(old, new)
one_a(">v2026-10-16 build 1351<button", ">v2026-10-16 build 1352<button")
one_a("""  { b: 1351, d:'2026-10-16',""",
"""  { b: 1352, d:'2026-10-16', t:'Quiet hours: nothing wakes the team at night', s:'Between 9 pm and 7 am, alerts to the rest of the team wait. Texts and emails are delivered at 7 am, and phone notifications are not sent at night. Whoever sets off the alert still gets their own copy right away. The morning digest, payment reminders and punch-out reminders already run only in the daytime.' },
  { b: 1351, d:'2026-10-16',""")
pl.write_atomic(app, a)
print('patched', app, api)
