"""Build 1382 — appointment reminders by text (Theo, 21 Oct: "I need all the help remembering I can get").
Before this, booking an appointment told nobody unless it was a build day, and then only Production.
Three reminders now, all to the team, never to a client:
  1. BOOKED / MOVED — the moment an appointment is booked, or its day or time changes, whoever booked
     it and the job's rep get a push, an email and a text (notifyTeam, the one route every alert uses).
  2. MORNING — api/appt-remind.js texts each person their day at 8am (new; vercel.json cron).
  3. HOUR AHEAD — the same route texts each appointment 10–70 minutes before it starts.
This file is the app half (1); the route and the cron are files of their own.
Nothing about saving an appointment changes: the alert is fire-and-forget and can never fail a save."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""var adb = {
  list: async function(){""",
"""/* 1382: booking an appointment (or moving it to a new day or time) is news for the people who have
   to turn up: whoever booked it and the job's rep. Theo: "I need all the help remembering I can get" —
   so the booker is told too, deliberately; the text in their phone is the record. A build day's
   Production buzz stays __apptNotifyProduction's, so Curtis and Scottie are not told twice.
   Fire-and-forget like 1047: an alert can never fail a save. api/appt-remind.js does the rest
   (the 8am day list and the hour-ahead text). */
function __apptTime12(t){
  var m = /^(\\d{1,2}):(\\d{2})/.exec(String(t || ''));
  if(!m) return '';
  var h = Number(m[1]);
  return (h % 12 || 12) + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM');
}
function __apptDay(ds){
  var p = String(ds || '').split('-').map(Number);
  if(p.length !== 3 || !p[0]) return String(ds || '');
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}
function __apptNotifyBooked(f, moved){
  try{
    if(!f || typeof window.notifyTeam !== 'function') return;
    var cu = /** @type {any} */ (window.currentUser) || {};
    var me = String(cu.email || '').toLowerCase();
    var pr = f.project_id ? (window.cacheProjects || []).filter(function(p){ return String(p.id) === String(f.project_id); })[0] : null;
    var to = [me, String(f.created_by || '').toLowerCase()];
    if(pr){
      to.push(String(pr.sales_rep || '').toLowerCase());
      var asg = null;
      try{ asg = ((typeof parseCkAll === 'function' ? parseCkAll(pr) : {}).lead || {}).assigned; }catch(_a){ asg = null; }
      if(Array.isArray(asg)) asg.forEach(function(e){ to.push(String(e || '').toLowerCase()); });
    }
    var prod = (f.kind === 'job' && Array.isArray(window.PRODUCTION_EMAILS))
      ? window.PRODUCTION_EMAILS.map(function(e){ return String(e).toLowerCase(); }) : [];
    to = to.filter(function(e, i){ return /@/.test(e) && to.indexOf(e) === i && prod.indexOf(e) === -1; });
    if(!to.length) return;
    var esc1 = function(x){ return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var when = __apptDay(f.appt_date) + (f.appt_time ? ' at ' + __apptTime12(f.appt_time) : '');
    var what = String(f.title || 'Appointment').trim();
    window.notifyTeam(to,
      (moved ? 'Appointment moved \\u2014 ' : 'Appointment booked \\u2014 ') + what + ', ' + when,
      '<p><b>' + esc1(what) + '</b> \\u2014 ' + esc1(when) + '.</p>' +
      (pr ? '<p>' + esc1(pr.name || '') + (pr.address ? ', ' + esc1(pr.address) : '') + '</p>' : '') +
      '<p>You will get a text that morning and again about an hour before.</p>',
      clientLink(f.project_id))
      .catch(function(){});
  }catch(_e){}
}
var adb = {
  list: async function(){""")

one("""      __apptNotifyProduction(fields);        /* 1047 — fire-and-forget */""",
"""      __apptNotifyProduction(fields);        /* 1047 — fire-and-forget */
      __apptNotifyBooked(fields, false);     /* 1382 — the booker and the rep, fire-and-forget */""")

one("""    if(fields.project_id) __apptNotifyProduction(merged);""",
"""    if(fields.project_id) __apptNotifyProduction(merged);
    /* 1382: a new day or time is a new appointment to remember */
    if(TEAM && (fields.appt_date != null || fields.appt_time != null)) __apptNotifyBooked(merged, true);""")

one(">v2026-10-19 build 1381<button", ">v2026-10-21 build 1382<button")
one("""  { b: 1381, d:'2026-10-19',""",
"""  { b: 1382, d:'2026-10-21', t:'Appointment reminders by text', s:'Setting an appointment now tells the people who have to be there. When you book one, or move it to a new day or time, you and the job\\u2019s rep get a text (plus the usual notification and email) saying what it is, when, and where. On the day, everyone with an appointment gets a text at 8am listing their day, and another about an hour before each appointment starts, with a link for directions. Build days still go to Production as before. Texts only go to the team, never to the client, and none are sent between 9pm and 6am. To get them, your mobile number needs to be in the Team Directory.' },
  { b: 1381, d:'2026-10-19',""")
pl.write_atomic(path, s)
print('ok 1382')
