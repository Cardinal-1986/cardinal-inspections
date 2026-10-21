// api/appt-remind.js — appointment reminder TEXTS to the team (build 1382).
// Theo, 21 Oct 2026: "I need all the help remembering I can get." Vercel Cron runs this
// every hour at :50 (vercel.json). Two jobs, both SMS through the company Twilio number —
// the same Messaging Service as api/notify.js / api/remind.js:
//
//   1. THE MORNING TEXT — on the run that lands at 6:50am in Dayton, everyone with an
//      appointment today gets one text listing their day, next to the 7am digest email.
//      One per morning: an audit_events row (type appt_day_text) marks the day as done.
//   2. THE HOUR-AHEAD TEXT — every run texts the appointments that start 10–70 minutes
//      from now, so a 2:00 appointment is reminded at 12:50. Each appointment is CLAIMED
//      before it is texted (appointments.reminded_for set to its own 'date time', only
//      where it still differs), so overlapping runs never double-text, and moving an
//      appointment to a new time earns the new time its own reminder.
//
// WHO GETS IT — staff only, never a client: whoever booked it (created_by), the job's
// rep (projects.sales_rep and checklist.lead.assigned) and, for a build day (kind
// 'job'), Production. Only people in the Team Directory with a usable mobile number.
// QUIET HOURS — nothing is texted before 6am or after 9pm Dayton time.
//
// Auth is fail-closed, the api/digest.js shape: CRON_SECRET unset refuses everything.
// `?dry=1` reports who WOULD be texted, sends nothing and claims nothing.
// `?now=ISO` (dry runs only) pretends it is that time — for checking a morning or an hour
// window without waiting for it.
//
// Needs: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const APP_ORIGIN = 'https://app.cardinalroster.com';
const TZ = 'America/New_York';
// MIRROR of PRODUCTION_EMAILS in index.html — a build day also reminds Production.
const PRODUCTION = ['curtis@cardinalrenovations.net', 'scottie@cardinalrenovations.net'];
const MORNING_HOUR = 6;       // the 6:50am run sends the day's list
const QUIET_FROM = 21, QUIET_TO = 6;
const AHEAD_MIN = 10, AHEAD_MAX = 70;   // minutes ahead the hour-ahead window covers
const MAX_LIST = 6;           // a morning text names at most this many, then "+N more"

// E.164 for Twilio — mirrors api/remind.js exactly.
function normPhone(p) {
  if (!p) return '';
  var s = String(p).trim();
  if (s.charAt(0) === '+') { var t = s.slice(1).replace(/[^\d]/g, ''); return t ? '+' + t : ''; }
  var d = s.replace(/[^\d]/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return '';
}
// Dayton wall clock for an instant: { date:'YYYY-MM-DD', hour, minute }
function localParts(d) {
  var f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  var o = {};
  f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
  return { date: o.year + '-' + o.month + '-' + o.day, hour: Number(o.hour), minute: Number(o.minute) };
}
function minutesOf(t) {
  var m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function fmtTime(t) {
  var m = minutesOf(t);
  if (m == null) return '';
  var h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
  return (h % 12 || 12) + ':' + mm + ' ' + (h >= 12 ? 'PM' : 'AM');
}
function niceDay(ds) {
  var p = ds.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
function parseCk(ck) {
  if (ck && typeof ck === 'object') return ck;
  try { return JSON.parse(ck || '{}') || {}; } catch (e) { return {}; }
}
function lc(e) { return String(e || '').trim().toLowerCase(); }
// everyone an appointment belongs to: booker, the job's rep(s), Production on a build day
function recipientsOf(a, pr) {
  var out = [lc(a.created_by)];
  if (pr) {
    out.push(lc(pr.sales_rep));
    var asg = (parseCk(pr.checklist).lead || {}).assigned;
    if (Array.isArray(asg)) asg.forEach(function (e) { out.push(lc(e)); });
  }
  if (a.kind === 'job') PRODUCTION.forEach(function (e) { out.push(e); });
  return out.filter(function (e, i) { return /@/.test(e) && out.indexOf(e) === i; });
}
function oneLine(s, n) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n); }
// "9:00 AM Inspection — Client, 1 Main St"
function apptLine(a, pr) {
  var bits = [a.appt_time ? fmtTime(a.appt_time) : 'All day', oneLine(a.title || 'Appointment', 60)];
  var who = pr ? oneLine(pr.name, 40) : '';
  var where = pr ? oneLine(pr.address, 60) : '';
  return bits.join(' ') + (who ? ' — ' + who : '') + (where ? ', ' + where : '');
}
function morningText(day, list, byId) {
  var shown = list.slice(0, MAX_LIST).map(function (a) { return '• ' + apptLine(a, byId[a.project_id]); });
  var more = list.length > MAX_LIST ? '\n+' + (list.length - MAX_LIST) + ' more in the app' : '';
  return 'Cardinal — your appointments today (' + niceDay(day) + '):\n' + shown.join('\n') + more +
    '\nCalendar: ' + APP_ORIGIN;
}
function aheadText(a, pr) {
  var where = pr && pr.address ? '\nDirections: https://maps.google.com/?q=' + encodeURIComponent(oneLine(pr.address, 120)) : '';
  return 'Cardinal reminder — coming up at ' + (fmtTime(a.appt_time) || 'soon') + ': ' +
    oneLine(a.title || 'Appointment', 60) + (pr && pr.name ? ' with ' + oneLine(pr.name, 40) : '') +
    (pr && pr.address ? ' at ' + oneLine(pr.address, 60) : '') + '.' + where;
}

export default async function handler(req, res) {
  var secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) {
    res.status(401).json({ ok: false, error: 'CRON_SECRET is not configured in Vercel, so the scheduled door is closed.' });
    return;
  }
  if ((req.headers.authorization || '') !== 'Bearer ' + secret) { res.status(401).json({ ok: false, error: 'Unauthorized' }); return; }

  var srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!srk) { res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not set' }); return; }
  var H = { apikey: srk, Authorization: 'Bearer ' + srk };
  var HJ = Object.assign({ 'Content-Type': 'application/json' }, H);

  var twSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  var twTok = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  var twMsgSvc = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
  var twFrom = String(process.env.TWILIO_FROM || '').trim();
  var smsReady = !!(twSid && twTok && (twMsgSvc || twFrom));

  var q = req.query || {};
  var dry = q.dry === '1' || q.dry === 'true';
  var now = (dry && q.now && isFinite(Date.parse(q.now))) ? new Date(q.now) : new Date();
  var L = localParts(now);
  var nowMin = L.hour * 60 + L.minute;
  var quiet = L.hour >= QUIET_FROM || L.hour < QUIET_TO;

  async function sms(to, body) {
    if (dry) return { ok: true, dry: true };
    var params = { To: to, Body: body };
    if (twMsgSvc) params.MessagingServiceSid = twMsgSvc; else params.From = twFrom;
    try {
      var tw = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(twSid) + '/Messages.json', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(twSid + ':' + twTok).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString()
      });
      if (tw.ok) return { ok: true };
      return { ok: false, detail: 'twilio ' + tw.status + ' ' + (await tw.text()).slice(0, 120) };
    } catch (e) { return { ok: false, detail: String((e && e.message) || e).slice(0, 120) }; }
  }

  try {
    var out = { ok: true, dry: dry, local: L.date + ' ' + String(L.hour).padStart(2, '0') + ':' + String(L.minute).padStart(2, '0'),
      quiet: quiet, morning: { due: false, texted: 0, failed: 0, people: [] }, ahead: { due: 0, texted: 0, failed: 0, skipped: 0, people: [] } };
    if (quiet) { out.note = 'Quiet hours (9pm–6am Dayton): nothing is texted.'; res.status(200).json(out); return; }
    if (!smsReady && !dry) { res.status(200).json(Object.assign(out, { ok: false, reason: 'sms_not_configured' })); return; }

    // today's appointments, then the jobs they belong to, then the team's numbers
    var ar = await fetch(SUPABASE_URL + '/rest/v1/appointments?appt_date=eq.' + L.date +
      '&select=id,title,appt_date,appt_time,project_id,kind,created_by,reminded_for&order=appt_time.asc', { headers: H });
    if (!ar.ok) throw new Error('appointments read failed (' + ar.status + ')');
    var appts = await ar.json();
    if (!appts.length) { out.note = 'No appointments today.'; res.status(200).json(out); return; }

    var pids = appts.map(function (a) { return a.project_id; }).filter(function (v, i, s) { return v && s.indexOf(v) === i; });
    var byId = {};
    if (pids.length) {
      var pr0 = await fetch(SUPABASE_URL + '/rest/v1/projects?id=in.(' + pids.join(',') + ')&select=id,name,address,sales_rep,checklist', { headers: H });
      if (pr0.ok) (await pr0.json()).forEach(function (p) { byId[p.id] = p; });
    }
    var tr = await fetch(SUPABASE_URL + '/rest/v1/team_profiles?select=email,phone', { headers: H });
    if (!tr.ok) throw new Error('team directory read failed (' + tr.status + ')');
    var phoneOf = {};
    (await tr.json()).forEach(function (t) { var n = normPhone(t.phone); if (n && t.email) phoneOf[lc(t.email)] = n; });

    // 1) the morning text
    if (L.hour === MORNING_HOUR) {
      var mk = await fetch(SUPABASE_URL + '/rest/v1/audit_events?type=eq.appt_day_text&detail=like.' + L.date + '*&select=id&limit=1', { headers: H });
      var already = mk.ok ? (await mk.json()).length > 0 : true;   // a failed read refuses to guess: no double send
      if (!already) {
        out.morning.due = true;
        var mine = {};
        appts.forEach(function (a) {
          recipientsOf(a, byId[a.project_id]).forEach(function (e) { (mine[e] = mine[e] || []).push(a); });
        });
        for (var who in mine) {
          var to = phoneOf[who];
          if (!to) continue;
          var r1 = await sms(to, morningText(L.date, mine[who], byId));
          if (r1.ok) { out.morning.texted++; out.morning.people.push(who); } else { out.morning.failed++; }
        }
        if (!dry && out.morning.texted) {
          await fetch(SUPABASE_URL + '/rest/v1/audit_events', { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, HJ),
            body: JSON.stringify({ type: 'appt_day_text', email: null,
              detail: (L.date + ' · ' + out.morning.texted + ' text(s) · ' + out.morning.people.join(', ')).slice(0, 300) }) }).catch(function () {});
        }
      }
    }

    // 2) the hour-ahead text
    for (var i = 0; i < appts.length; i++) {
      var a = appts[i], m = minutesOf(a.appt_time);
      if (m == null) continue;                                  // an all-day item has no "hour before"
      var lead = m - nowMin;
      if (lead < AHEAD_MIN || lead > AHEAD_MAX) continue;
      out.ahead.due++;
      var key = a.appt_date + ' ' + a.appt_time;
      if (a.reminded_for === key) { out.ahead.skipped++; continue; }
      if (!dry) {
        // claim first: only the run whose PATCH returns the row may text it
        var cl = await fetch(SUPABASE_URL + '/rest/v1/appointments?id=eq.' + encodeURIComponent(a.id) +
          '&or=(reminded_for.is.null,reminded_for.neq.' + encodeURIComponent('"' + key + '"') + ')', {
          method: 'PATCH', headers: Object.assign({ Prefer: 'return=representation' }, HJ),
          body: JSON.stringify({ reminded_for: key, reminded_at: new Date().toISOString() }) });
        var got = cl.ok ? await cl.json() : [];
        if (!Array.isArray(got) || !got.length) { out.ahead.skipped++; continue; }
      }
      var pr = byId[a.project_id];
      var body = aheadText(a, pr);
      var rs = recipientsOf(a, pr);
      for (var j = 0; j < rs.length; j++) {
        var ph = phoneOf[rs[j]];
        if (!ph) continue;
        var r2 = await sms(ph, body);
        if (r2.ok) { out.ahead.texted++; out.ahead.people.push(rs[j]); } else { out.ahead.failed++; }
      }
    }
    res.status(200).json(out);
  } catch (err) {
    res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
}
