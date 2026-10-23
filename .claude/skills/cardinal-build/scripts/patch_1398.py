"""Build 1398 — honest messages, readable Team page (23 Oct 2026, audit follow-ups).
1. Signing an estimate in person said "accepted — it can be invoiced now" whether or not the estimate row
   was accepted. A rep signing an estimate somebody else wrote updates 0 rows under estimates RLS
   (est_update is is_full_access() OR created_by = my_email()), and crAcceptEstimateForDoc returns false.
   The message follows the result now; the admin "needs approval" email is unchanged.
2. A tag notification sent at night said "Notified X — email" when the email was only scheduled for
   7:00 am (1352 quiet hours). It says when.
3. Team Directory (a light page in both themes): email 3.45:1, "no number" 2.26:1, the count 4.27:1 ->
   #5f6670 / #6b6b6b / #5a5a5a; the edit buttons 40px -> 44px.
4. A new estimate's title placeholder read "Estimate — Jane Smith" on a real client."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)
one("""      await crAcceptEstimateForDoc(current.id);   /* 1340: signed = accepted, so it can be invoiced */""",
    """      var _acc = await crAcceptEstimateForDoc(current.id);   /* 1340: signed = accepted, so it can be invoiced */""")
one("""      crTell('Estimate signed and accepted \\u2014 it can be invoiced now. It also appears in Approvals, to generate the contract.');""",
"""      /* 1398: a rep signing an estimate someone else wrote is refused by estimates RLS — say so, not "accepted" */
      crTell(_acc ? 'Estimate signed and accepted \\u2014 it can be invoiced now. It also appears in Approvals, to generate the contract.'
                  : 'Estimate signed. It appears in Approvals \\u2014 the office marks it accepted and generates the contract.');""")
one("""    if(res.mailed > 0) how.push('email');""",
"""    /* 1398: at night the email is scheduled for 7:00 am (1352), not sent */
    var _qd = res.quiet_detail || {};
    if(res.mailed > 0) how.push(res.quiet && _qd.mail_scheduled ? 'email at 7:00 am' : 'email');""")
one("""#teamView .tmem{font-size:13px;color:#8a8a8a;overflow-wrap:anywhere;}""", """#teamView .tmem{font-size:13px;color:#5f6670;overflow-wrap:anywhere;}   /* 1398: #8a8a8a was 3.45:1 */""")
one("""#teamView .tmph.tmno{color:#b0aca6;font-size:13px;font-weight:600;}""", """#teamView .tmph.tmno{color:#6b6b6b;font-size:13px;font-weight:600;}   /* 1398: #b0aca6 was 2.26:1 */""")
one(""".tmsub{margin:0 0 16px;font:600 15px 'Segoe UI',Arial,sans-serif;color:#6b6b6b;}""", """.tmsub{margin:0 0 16px;font:600 15px 'Segoe UI',Arial,sans-serif;color:#5a5a5a;}""")
one("""#teamView .tmib{width:40px;height:40px;""", """#teamView .tmib{width:44px;height:44px;""")
one("""placeholder="Estimate — Jane Smith" />""", """placeholder="Estimate title" />""")
one(">v2026-10-23 build 1397<", ">v2026-10-23 build 1398<")
one("""  { b: 1397, d:'2026-10-23',""",
"""  { b: 1398, d:'2026-10-23', t:'Messages that say what happened', s:'Signing an estimate in person only says \\u201caccepted \\u2014 it can be invoiced\\u201d when it really was; when the office has to accept it, it says that instead. A tag notification sent at night says the email goes out at 7:00 am. The Team Directory\\u2019s emails, \\u201cno number\\u201d and head count are easier to read, and its edit buttons are bigger.' },
  { b: 1397, d:'2026-10-23',""")
pl.write_atomic(path, s)
print('ok 1398')
