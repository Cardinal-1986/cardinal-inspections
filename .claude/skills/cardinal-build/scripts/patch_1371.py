"""Build 1371 — the invoiced dates too (Theo, 18 Oct: "Fix the invoiced dates too").
1370 stopped the AccuLynx import's noon stamps counting in Activity Count and Sales Numbers. Three more readers:
- Invoices & Payments' aging clock (ageDays, 1316): sent_at, else t_Invoiced, else stage_since, else the invoice's
  created_at. The 9 migrated Invoiced/Closed jobs have no invoice document (measured), so every date it found was
  the import noon: they read 2 days old, in the fresh 0–14 group. Now a fake stamp is skipped, and a migrated job
  with no real date ages from its own created_at (AccuLynx's start date: 96–163 days) — an upper bound, so the old
  money sits in 31+ where it belongs instead of looking new.
- Reports' stage dates (rptStageDate): a fake stamp is no date.
- Community's job timeline: "Invoiced on 16 Oct" is not said for a fake stamp."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""    var iso = (inv && inv.sent_at) || ck.t_Invoiced || ck.stage_since || (inv && inv.created_at) || null;""",
"""    /* 1371: the AccuLynx import's noon stamps are not dates (crRealStamp, 1370). A migrated job with no real date
       ages from its own start — an upper bound, so old money is never shown as new. */
    var real = (typeof crRealStamp === 'function') ? crRealStamp : function(_c, v){ return v || null; };
    var iso = (inv && inv.sent_at) || real(ck, ck.t_Invoiced) || real(ck, ck.stage_since) || (inv && inv.created_at)
              || (ck.acculynx_import ? pr.created_at : null) || null;""")

one("""  if(ck['t_' + stg]) return new Date(ck['t_' + stg]);
  if(normStage(pr.stage) === stg && ck.stage_since) return new Date(ck.stage_since);""",
"""  /* 1371: an AccuLynx import noon stamp is no date */
  if(crRealStamp(ck, ck['t_' + stg])) return new Date(ck['t_' + stg]);
  if(normStage(pr.stage) === stg && crRealStamp(ck, ck.stage_since)) return new Date(ck.stage_since);""")

one("""  + (c972.t_Invoiced ? ' on ' + fmtDay(c972.t_Invoiced) : '') + '.',""",
"""  + ((typeof crRealStamp === 'function' ? crRealStamp(c972, c972.t_Invoiced) : c972.t_Invoiced) ? ' on ' + fmtDay(c972.t_Invoiced) : '') + '.',   /* 1371 */""")

one(">v2026-10-18 build 1370<button", ">v2026-10-18 build 1371<button")
one("""  { b: 1370, d:'2026-10-18',""",
"""  { b: 1371, d:'2026-10-18', t:'Old invoices from AccuLynx show their real age', s:'Invoiced jobs brought over from AccuLynx had no invoice date, so Invoices & Payments showed them as invoiced two days ago. They now age from when the job started, which puts that old money in the 31+ days group where it belongs. Reports and the Community job timeline no longer show 16 October for those jobs either.' },
  { b: 1370, d:'2026-10-18',""")
pl.write_atomic(path, s)
print('ok 1371')
