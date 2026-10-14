"""Build 1337 — three things tonight's estimates/invoicing audit found on the invoice card and Record payment,
before Theo shows the team (14 Oct).

1. The invoice card read "-- paid of $1,400" on every job with nothing paid: jobBlockHtml() calls money(), which
   is fmtMoney(n) and prints '--' for 0. Now "$0 paid of $1,400".
2. The A/R "Ready to invoice" row said "Finished · signed contract" for every job — since 1335 a job there may be
   priced by an ACCEPTED estimate instead. It now says which.
3. Record payment took any amount. A slip ($14,000 for $1,400) went into collections — which also drives
   commissions — and the card then hid it by capping paid at the job value ("Paid in Full"). An amount above the
   balance now asks first; the rep can still record an honest overpayment.
Usage: python3 patch_1337.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
FILE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
s = pl.load(FILE)
def one(old, new):
    global s
    assert s.count(old) == 1, (old[:90], s.count(old))
    s = s.replace(old, new)

one("""'<div class="crji-sub">' + money(paid) + ' paid of ' + money(total) + '</div>'""",
    """'<div class="crji-sub">' + (paid > 0 ? money(paid) : '$0') + ' paid of ' + money(total) + '</div>'   /* 1337: money(0) prints '--' */""")

one("""    if(x.ready) bits.push('Finished &middot; signed contract');""",
    """    if(x.ready) bits.push('Finished &middot; ' + (x.fin && x.fin.source === 'estimate' ? 'accepted estimate' : 'signed contract'));   /* 1337 */""")

one("""  function savePayModal(){""", """  var _payOver = false;   /* 1337: set while re-running a confirmed over-balance save */
  function savePayModal(){""")
one("""    var amt = parseFloat(q('crpay-amt').value);
    if(!(amt > 0)){ crTell('Enter an amount.'); return; }""",
"""    var amt = parseFloat(q('crpay-amt').value);
    if(!(amt > 0)){ crTell('Enter an amount.'); return; }
    /* 1337: a typo above the balance would land in collections (and commissions) and then hide behind "Paid in
       Full" — ask before recording more than is owed. An honest overpayment can still go through. */
    var _bal = Number(jobFinance(pr).balance) || 0;
    if(amt > _bal + 0.005 && !_payOver){
      var _btnO = q('crpay-save');
      crAsk('That is ' + money(amt) + ', but the balance is ' + money(Math.max(0, _bal)) + '. Record it anyway?').then(function(yes){
        if(!yes) return;
        _payOver = true;
        try{ savePayModal(); } finally { _payOver = false; }
      });
      return;
    }""")

one(""">v2026-10-14 build 1336<button""", """>v2026-10-14 build 1337<button""")
CL = "{ b: 1336, d:'2026-10-14',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1337, d:'2026-10-14', t:'Invoice card tidy-ups', s:'The invoice card now reads \\u201c$0 paid of\\u201d instead of \\u201c-- paid of\\u201d when nothing has been paid yet. The Ready to invoice list says whether a job is billed from a signed contract or an accepted estimate. Record payment now checks with you before recording more than the balance, so a typo can\\u2019t quietly mark a job paid.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1337 applied')
