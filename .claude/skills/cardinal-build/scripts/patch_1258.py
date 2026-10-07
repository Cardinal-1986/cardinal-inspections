#!/usr/bin/env python3
"""Build 1258 — "Add to calendar" on appointments (Jacob, via Theo — pick B1).

Jacob asked whether appointments can sync to Gmail and iCloud calendars. Theo
picked B1 from three priced options: one tap per appointment, no sign-in, no
server — the feed (B2) and two-way sync (B3) were the bigger builds.

Every appointment row in the calendar's day sheet (#apptList) gets an
"Add to calendar" button. It opens a small sheet:
  * iPhone / Apple Calendar — an .ics file (RFC 5545): a timed appointment is
    one hour from its start, in FLOATING local time (no TZID — the phone's own
    zone, which for Cardinal is Dayton); a build day or delivery with no time
    is an all-day event. Summary = the title (+ the client); location = the
    job address; description = the notes and the client's phone.
  * Google Calendar — Google's own add-event link (calendar.google.com/
    calendar/render?action=TEMPLATE), the same fields. It opens outside the app.
  * Cancel.
One-way: a moved appointment must be added again (B2's feed would fix that).

usage: python3 patch_1258.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# the button on each row (everyone — adding to YOUR calendar edits nothing)
src = pl.sub(src, """      (apptCanEdit(a) ? '<button class="del" title="Delete">\\u2715</button>' : '') +
      '</div>';
  }).join('');
}""", """      '<button type="button" class="apptcal" data-apptcal="' + esc(String(a.id)) + '">Add to calendar</button>' +   /* 1258 */
      (apptCanEdit(a) ? '<button class="del" title="Delete">\\u2715</button>' : '') +
      '</div>';
  }).join('');
}
/* 1258 (B1): "Add to calendar" — an .ics for Apple Calendar, Google's add-event
   link for Google. One-way and one appointment at a time, by Theo's pick. */
function apptCalFields(a){
  var pr = a.project_id ? cacheProjects.find(function(x){ return String(x.id) === String(a.project_id); }) : null;
  var addr = pr ? [pr.address, pr.city, pr.state, pr.zip].filter(Boolean).join(', ') : '';
  var d = String(a.appt_date || '').replace(/-/g, '');
  var t = a.appt_time ? String(a.appt_time).replace(/:/g, '').slice(0, 4) + '00' : '';
  var start = '', end = '';
  if(t){
    var p = String(a.appt_date).split('-'), q = String(a.appt_time).split(':');
    var e = new Date(+p[0], +p[1] - 1, +p[2], +q[0] + 1, +q[1] || 0);
    var pad = function(n){ return ('0' + n).slice(-2); };
    start = d + 'T' + t;
    end = e.getFullYear() + pad(e.getMonth() + 1) + pad(e.getDate()) + 'T' + pad(e.getHours()) + pad(e.getMinutes()) + '00';
  } else {
    var p2 = String(a.appt_date).split('-'), n = new Date(+p2[0], +p2[1] - 1, +p2[2] + 1);
    start = d;
    end = n.getFullYear() + ('0' + (n.getMonth() + 1)).slice(-2) + ('0' + n.getDate()).slice(-2);
  }
  var notes = [a.notes, pr && pr.name ? 'Client: ' + pr.name : '', pr && pr.phone ? 'Phone: ' + pr.phone : ''].filter(Boolean).join('\\n');
  return { id: a.id, title: String(a.title || 'Appointment') + (pr && pr.name ? ' \\u2014 ' + pr.name : ''),
           timed: !!t, start: start, end: end, where: addr, notes: notes };
}
function apptIcs(a){
  var f = apptCalFields(a);
  var x = function(s){ return String(s || '').replace(/\\\\/g, '\\\\\\\\').replace(/;/g, '\\\\;').replace(/,/g, '\\\\,').replace(/\\r?\\n/g, '\\\\n'); };
  var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\\.\\d+/, '');
  var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cardinal Roofing//Resource App//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', 'UID:appt-' + f.id + '@cardinalroster.com', 'DTSTAMP:' + now,
    f.timed ? 'DTSTART:' + f.start : 'DTSTART;VALUE=DATE:' + f.start,
    f.timed ? 'DTEND:' + f.end : 'DTEND;VALUE=DATE:' + f.end,
    'SUMMARY:' + x(f.title)];
  if(f.where) lines.push('LOCATION:' + x(f.where));
  if(f.notes) lines.push('DESCRIPTION:' + x(f.notes));
  lines.push('END:VEVENT', 'END:VCALENDAR');
  /* fold at 75 octets (RFC 5545 \\u00a73.1) */
  return lines.map(function(l){ var o = ''; while(l.length > 74){ o += l.slice(0, 74) + '\\r\\n '; l = l.slice(74); } return o + l; }).join('\\r\\n') + '\\r\\n';
}
function apptGoogleUrl(a){
  var f = apptCalFields(a);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(f.title) + '&dates=' + f.start + '/' + f.end +
    (f.where ? '&location=' + encodeURIComponent(f.where) : '') + (f.notes ? '&details=' + encodeURIComponent(f.notes) : '');
}
function apptCalOpen(id){
  var a = cacheAppts.filter(function(x){ return String(x.id) === String(id); })[0];
  if(!a) return;
  var el = document.getElementById('apptCalSheet');
  if(!el){
    el = document.createElement('div');
    el.id = 'apptCalSheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Add to calendar');
    document.body.appendChild(el);
    el.addEventListener('click', function(ev){
      var b = /** @type {HTMLElement} */ (ev.target).closest('[data-cal]');
      if(!b) return;
      var which = b.getAttribute('data-cal'), cur = cacheAppts.filter(function(x){ return String(x.id) === el.getAttribute('data-id'); })[0];
      if(which === 'apple' && cur){
        var blob = new Blob([apptIcs(cur)], { type: 'text/calendar;charset=utf-8' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'cardinal-appointment.ics';
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(function(){ try{ URL.revokeObjectURL(link.href); }catch(_){} }, 60000);
      }
      /* google: the <a> navigates itself (target=_blank, off-site) */
      el.classList.remove('open');
    });
  }
  el.setAttribute('data-id', String(a.id));
  el.innerHTML = '<div class="q"><b>Add \\u201c' + esc(a.title || 'Appointment') + '\\u201d to your calendar</b>' +
    '<p>' + esc(a.appt_date || '') + (a.appt_time ? ' \\u00b7 ' + fmtApptTime(a.appt_time) : ' \\u00b7 all day') + '. One-way: if it moves, add it again.</p>' +
    '<div class="row"><button type="button" class="pri" data-cal="apple">iPhone / Apple Calendar</button>' +
    '<a class="pri" data-cal="google" target="_blank" rel="noopener" href="' + esc(apptGoogleUrl(a)) + '">Google Calendar</a>' +
    '<button type="button" class="no" data-cal="cancel">Cancel</button></div></div>';
  el.classList.add('open');
}""")

src = pl.sub(src, """document.getElementById('apptList').addEventListener('click', async function(e){
  var att = e.target.closest('[data-apptattach]');""", """document.getElementById('apptList').addEventListener('click', async function(e){
  var cal = (/** @type {HTMLElement} */ (e.target)).closest('[data-apptcal]');
  if(cal){ apptCalOpen(cal.getAttribute('data-apptcal')); return; }   /* 1258 */
  var att = e.target.closest('[data-apptattach]');""")

src = pl.sub(src, """.apptrow .bd small{display:block;color:#8a8a8a;}""", """.apptrow .bd small{display:block;color:#8a8a8a;}
/* 1258: Add to calendar — the row button and its sheet (fixed colours: the sheet
   sits over the appointment modal's own dark wash in both themes) */
.apptrow .apptcal{flex:none;min-height:44px;padding:0 12px;border-radius:8px;cursor:pointer;
  border:1px solid #9aa4b2;background:#ffffff;color:#1e2b4a;font:700 13px 'Segoe UI',Arial,sans-serif;}
#apptCalSheet{position:fixed;left:0;right:0;bottom:0;z-index:9600;display:none;
  padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));background:#16161b;color:#eceef0;
  border-top:1px solid #2a2d33;box-shadow:0 -8px 30px rgba(0,0,0,.4);}
#apptCalSheet.open{display:block;}
#apptCalSheet .q{max-width:560px;margin:0 auto;}
#apptCalSheet b{display:block;font:700 18px 'Segoe UI',Arial,sans-serif;color:#eceef0;}
#apptCalSheet p{margin:4px 0 12px;font:400 15px 'Segoe UI',Arial,sans-serif;color:#b8bec6;}
#apptCalSheet .row{display:flex;flex-wrap:wrap;gap:10px;}
#apptCalSheet .pri, #apptCalSheet .no{flex:1 1 140px;display:flex;align-items:center;justify-content:center;min-height:48px;
  border-radius:10px;cursor:pointer;text-decoration:none;font:700 15px 'Segoe UI',Arial,sans-serif;}
#apptCalSheet .pri{background:#c8202e;border:1px solid #c8202e;color:#ffffff;}
#apptCalSheet .no{background:transparent;border:1px solid #3a3e46;color:#eceef0;}""")

src = pl.sub(src, '>v2026-10-07 build 1257<', '>v2026-10-07 build 1258<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1258, d: '2026-10-07', t: 'Add an appointment to your own calendar',
    s: 'Open a day on the calendar and every appointment has an <b>Add to calendar</b> button. Pick <b>iPhone / Apple Calendar</b> (it hands your phone a calendar file to add) or <b>Google Calendar</b> (it opens Google with the appointment filled in). It carries the time, the client, the job address and the notes; a build day with no time goes in as all day. It is a copy, not a link \\u2014 if the appointment moves, add it again.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
