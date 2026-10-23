"""Build 1403 (part 2) — Theo picked 1, 23 Oct: "texts follow the calendar". A personal appointment ('appt' /
'team') is private to its creator in the calendar (the shared-calendar RLS policy); the booking alert, the morning
list and the hour-ahead text now follow the same rule — only job / drop appointments reach the job's reps. The
booker and the creator are still told about their own."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
apath = sys.argv[2] if len(sys.argv) > 2 else 'api/appt-remind.js'
s = open(path, encoding='utf-8').read()
a = open(apath, encoding='utf-8').read()
def one(t, old, new):
    n = t.count(old); assert n == 1, (n, old[:90]); return t.replace(old, new)
s = one(s, """    var to = [me, String(f.created_by || '').toLowerCase()];
    if(pr){""",
"""    var to = [me, String(f.created_by || '').toLowerCase()];
    /* 1403 (Theo, pick 1): texts follow the calendar — a personal appointment is private to its creator, so only
       job / drop appointments reach the job's reps */
    if(pr && (f.kind === 'job' || f.kind === 'drop')){""")
s = one(s, "Booking an appointment with no signal says so instead of asking for a database fix.",
"Reps are told about the job and drop-off appointments on their jobs, not your personal ones (the texts now follow the calendar). Booking an appointment with no signal says so instead of asking for a database fix.")
a = one(a, """  var out = [lc(a.created_by)];
  if (pr) {""",
"""  var out = [lc(a.created_by)];
  // 1403 (Theo, pick 1): texts follow the calendar — a personal 'appt' / 'team' row is private to its creator,
  // so only job / drop appointments reach the job's reps
  if (pr && (a.kind === 'job' || a.kind === 'drop')) {""")
pl.write_atomic(path, s)
pl.write_atomic(apath, a)
print('ok 1403b')
