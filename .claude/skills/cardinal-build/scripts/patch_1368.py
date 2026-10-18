"""Build 1368 — log a refund, and the commission comes back (invoicing audit M7; Theo, 18 Oct: "1A 2b").
1A: a refund takes the rep's commission back automatically. 2b: Stripe's refund/dispute events stay off, so the
office records a refund by hand.
The ledger could already hold one — the office form accepted a minus amount, and make_commission() writes 10% of
the row, so a -$1,000 row books a -$100 pending commission that nets against the next payout. Nothing said so.
- The office's collection form gets a "This is a refund" box (new entries only): the amount saves as a minus,
  the note starts "Refund", and the toast says how much commission was taken back and from whom.
- commission_clawback.sql (APPLIED first) charges a refund to the rep who earned the job's commission, not the
  job's current rep — an unassigned job would otherwise claw back from nobody."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1. the box, on a new collection only (an edit keeps its own sign)
one("""        '<label style="display:block;margin-top:8px">Notes<input type="text" id="miNotes" ' + inp + ' value="' + woEsc((editing && editing.notes) || '') + '"></label>' +""",
    """        '<label style="display:block;margin-top:8px">Notes<input type="text" id="miNotes" ' + inp + ' value="' + woEsc((editing && editing.notes) || '') + '"></label>' +
        /* 1368: a refund is a minus collection; its commission comes back from the rep who earned it */
        (editing ? '' : '<label class="mi-refund" style="display:flex;align-items:center;gap:10px;margin-top:10px;min-height:44px">' +
          '<input type="checkbox" id="miRefund" style="width:22px;height:22px;margin:0"> This is a refund (money back to the client)</label>' +
          /* Theo, 18 Oct: "a checkbox where the refund may not take out of commission" */
          '<label class="mi-refund" style="display:flex;align-items:center;gap:10px;margin:2px 0 0 32px;min-height:44px">' +
          '<input type="checkbox" id="miKeepComm" style="width:22px;height:22px;margin:0"> Don\u2019t take it out of the rep\u2019s commission</label>') +""")

# 2. save: a refund is negative, says so in its note, and is never "Enter an amount" for a minus typed by hand
one("""  var amt = Number(document.getElementById('miAmt').value.replace(/[$,\\s]/g, ''));
  if(!isFinite(amt) || amt === 0){ if(msg) msg.textContent = 'Enter an amount.'; return; }""",
    """  var amt = Number(document.getElementById('miAmt').value.replace(/[$,\\s]/g, ''));
  if(!isFinite(amt) || amt === 0){ if(msg) msg.textContent = 'Enter an amount.'; return; }
  var _rf = /** @type {HTMLInputElement|null} */ (document.getElementById('miRefund')), refund1368 = !!(_rf && _rf.checked);   /* 1368 */
  if(refund1368) amt = -Math.abs(amt);
  var _kc = /** @type {HTMLInputElement|null} */ (document.getElementById('miKeepComm')), keep1368 = refund1368 && !!(_kc && _kc.checked);""")
one("""    notes: document.getElementById('miNotes').value.trim() || null,
  };
  if(msg) msg.textContent = 'Saving…';""",
    """    notes: document.getElementById('miNotes').value.trim() || null,
  };
  if(refund1368) row.notes = 'Refund' + (row.notes ? ' \\u2014 ' + row.notes : '');
  if(keep1368) row.keep_commission = true;   /* make_commission() books no take-back for this row */
  if(msg) msg.textContent = 'Saving…';""")

# 3. the toast names the take-back
one("""        _extra = ' \\u00b7 ' + fmtMoney(Number(_c.amount) || 0, true) + ' commission for ' +
                 rptRepName(_c.rep_email);""",
    """        _extra = (Number(_c.amount) < 0)
          ? ' \\u00b7 ' + fmtMoney(Math.abs(Number(_c.amount)), true) + ' commission taken back from ' + rptRepName(_c.rep_email)   /* 1368 */
          : ' \\u00b7 ' + fmtMoney(Number(_c.amount) || 0, true) + ' commission for ' + rptRepName(_c.rep_email);""")
one("""window.crToastOk('Collection logged \\u2014 ' + fmtMoney(amt, true) + _extra)""",
    """window.crToastOk((amt < 0 ? 'Refund logged \\u2014 ' + fmtMoney(-amt, true) : 'Collection logged \\u2014 ' + fmtMoney(amt, true)) + (keep1368 ? ' \\u00b7 the rep\\u2019s commission is left as it was' : _extra))""")

one(">v2026-10-18 build 1367<button", ">v2026-10-18 build 1368<button")
one("""  { b: 1367, d:'2026-10-18',""",
"""  { b: 1368, d:'2026-10-18', t:'Refunds take the commission back', s:'When you log a collection there is now a box for a refund. Tick it and the amount comes off the job, the note says Refund, and 10% comes back off the commission of the rep who earned the job, even if the job has been reassigned since. It shows up against their next payout. Tick Don\u2019t take it out of the rep\u2019s commission to leave their commission alone. Stripe refunds are not connected, so log those here too.' },
  { b: 1367, d:'2026-10-18',""")
pl.write_atomic(path, s)
print('ok 1368')
