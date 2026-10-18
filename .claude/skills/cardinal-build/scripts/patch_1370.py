"""Build 1370 — migration stage dates stop counting as this month's work (Theo, 18 Oct: "Fix the migration dates. 1").
Measured on production: all 164 AccuLynx-migrated jobs carry acculynx_import '2026-10-16', and every stage stamp the
import wrote where AccuLynx sent no history is that day at exactly 12:00:00Z — 31 t_Approved, 17 t_Closed,
9 t_Invoiced, 5 t_Completed, 52 t_Prospect, 7 t_Lead (161 stage_since too). The real dates are not stored anywhere,
so they cannot be restored; the 3 closings moved in the app later that day are real and still count.
- crRealStamp(ck, v): null for a migration noon stamp on the import day, else v. One rule, two readers:
  - Activity Count (last 30 days): such a stamp does not count. A lead falls back to created_at (AccuLynx's own date).
  - Owner Console Sales Numbers: a sale dates from its earliest REAL stamp, else the job's created_at — a lower
    bound, so a sale counts in a month or year only when it must have happened in it.
Data is untouched; nothing else reads these stamps differently."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""var __ckCache = new Map();
function parseCkAll(pr){""",
"""/* 1370: the AccuLynx migration stamped every stage it had no history for with the import day at noon UTC
   (acculynx_import '2026-10-16' → 'T12:00:00Z'). That is when the row arrived, not when the job was approved
   or closed, so a reader of "when did this happen" treats it as no date. */
function crRealStamp(ck, v){
  if(!v) return null;
  var imp = ck && ck.acculynx_import;
  if(typeof imp === 'string' && imp && String(v).indexOf(imp + 'T12:00:00') === 0) return null;
  return v;
}
var __ckCache = new Map();
function parseCkAll(pr){""")

one("""    if(inWin(ck.t_Lead || p.created_at)) leads++;
    if(inWin(ck.t_Approved)) approved++;
    if(inWin(ck.t_Completed)) completed++;
    if(inWin(ck.t_Invoiced)) invoiced++;
    if(inWin(ck.t_Closed)) closed++;""",
"""    /* 1370: a migration noon stamp is not this month's work */
    if(inWin(crRealStamp(ck, ck.t_Lead) || p.created_at)) leads++;
    if(inWin(crRealStamp(ck, ck.t_Approved))) approved++;
    if(inWin(crRealStamp(ck, ck.t_Completed))) completed++;
    if(inWin(crRealStamp(ck, ck.t_Invoiced))) invoiced++;
    if(inWin(crRealStamp(ck, ck.t_Closed))) closed++;""")

one("""    ['t_Approved','t_Scheduled','t_Completed','t_Invoiced','t_Closed'].forEach(function(k){ snTake(ck[k]); });""",
"""    /* 1370: a migration noon stamp is not a sale date */
    var snReal = (typeof crRealStamp === 'function') ? crRealStamp : function(_c, v){ return v; };
    ['t_Approved','t_Scheduled','t_Completed','t_Invoiced','t_Closed'].forEach(function(k){ snTake(snReal(ck, ck[k])); });""")
one("""    return isNaN(best) ? (ck.stage_since || p.created_at || null) : new Date(best).toISOString();""",
"""    return isNaN(best) ? (snReal(ck, ck.stage_since) || p.created_at || null) : new Date(best).toISOString();""")

one(">v2026-10-18 build 1369<button", ">v2026-10-18 build 1370<button")
one("""  { b: 1369, d:'2026-10-18',""",
"""  { b: 1370, d:'2026-10-18', t:'Moved-over jobs stop counting as this month', s:'Jobs brought over from AccuLynx were stamped with the day they arrived, 16 October, wherever AccuLynx had no date for when they were approved, invoiced or closed. That made the home screen count 32 approvals and 20 closings in one day. Those arrival stamps no longer count in Activity Count or Sales Numbers. Real changes made in the app still count.' },
  { b: 1369, d:'2026-10-18',""")
pl.write_atomic(path, s)
print('ok 1370')
