"""Build 1335 — an ACCEPTED estimate can be invoiced (Theo's pick 1, 14 Oct, from Jacob's Karen Frantz job).

Karen Frantz: job Completed, estimate accepted at $1,400, a paper agreement photographed into Files,
and no contract signed inside the app — so the job card said "An invoice opens once a contract is
signed" and there was no Create invoice anywhere. Since 654 an invoice came only from a signed contract.

Now an estimate whose status is accepted (or signed) — estTier 2, the same tier jobFinance already
treats as THE number — opens the invoice path too. The invoice's total is the estimate's own total plus
any signed change order (jobFinance's value), so nobody types an amount. A merely SENT estimate still
cannot be invoiced. Server side needs no change: owedOn() / remind.js already fall back to the
invoice's own stored total when a job has no signed contract and no manual value.
Known limit, recorded: a change order signed AFTER the invoice exists is not in that invoice's stored
total — make the invoice after the change order, or make a second invoice for the balance.
Usage: python3 patch_1335.py [index.html]
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

# jobFinance says whether its estimate is the accepted one, and one helper decides "billable"
one("""  return { contracts: contracts, value: value, paid: paid,
           balance: value - paid, pct: value ? Math.round(paid / value * 100) : 0,
           source: source };
}""",
"""  return { contracts: contracts, value: value, paid: paid,
           balance: value - paid, pct: value ? Math.round(paid / value * 100) : 0,
           source: source,
           /* 1335: the estimate behind an estimate-sourced value is the ACCEPTED one (tier 2) */
           estAccepted: source === 'estimate' && (estTier[pr.id] || 0) >= 2 };
}
/* 1335 (Theo's pick 1): what may be invoiced — a signed contract (or manual / change-order value),
   or an ACCEPTED estimate. A sent-but-not-accepted estimate never opens the invoice path. */
function crBillable(fin){
  return !!fin && Number(fin.value) > 0 && (fin.source !== 'estimate' || !!fin.estAccepted);
}""")

one("""  var invBtn = (fin.value > 0 && fin.source !== 'estimate')""",
    """  var invBtn = crBillable(fin)   /* 1335: or an accepted estimate */""")
one("""  if(!fin.value || fin.source === 'estimate'){ crTell('Create an invoice after a contract is signed \\u2014 the totals come from the signed contract.'); return; }""",
    """  if(!crBillable(fin)){ crTell('Create an invoice after a contract is signed or the estimate is accepted \\u2014 the totals come from that document.'); return; }   /* 1335 */""")
one("""      if(!(Number(fin.balance) > 0.005) || fin.source === 'estimate') return;""",
    """      if(!(Number(fin.balance) > 0.005) || !(Number(fin.value) > 0 && (fin.source !== 'estimate' || !!fin.estAccepted))) return;   /* 1335: crBillable()'s rule — this block also runs standalone, so it is stated here */""")
one("""    var canInvoice = Number(fin.value) > 0 && fin.source !== 'estimate';""",
    """    var canInvoice = Number(fin.value) > 0 && (fin.source !== 'estimate' || !!fin.estAccepted);   /* 1335: crBillable()'s rule — a signed contract or an ACCEPTED estimate */""")
one("""'An invoice opens once a contract is signed.';""",
    """'An invoice opens once a contract is signed or the estimate is accepted.';""")

one(""">v2026-10-14 build 1334<button""", """>v2026-10-14 build 1335<button""")
CL = "{ b: 1334, d:'2026-10-14',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1335, d:'2026-10-14', t:'Invoice from an accepted estimate', s:'A job with an accepted estimate can now be invoiced, even when the agreement was signed on paper instead of in the app. The invoice uses the estimate\\u2019s total plus any signed change order, so no amount is typed in. An estimate that has only been sent, not accepted, still can\\u2019t be invoiced. Tip: sign any change order first, then create the invoice, so it is included.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1335 applied')
