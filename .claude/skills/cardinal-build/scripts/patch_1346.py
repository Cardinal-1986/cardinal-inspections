"""Build 1346 — deposits can be recorded where you look for them, before the job is Invoiced.
Theo, 14 Oct: "No payment screen for deposits until after pipeline set to invoiced." The job card did offer
Record payment, but only as a secondary button under "Create invoice" with the line "Finished work is ready to
bill"; and Invoices & Payments lists only Invoiced/Closed jobs (arList) and Completed ones (readyList) — a signed
job at Approved or Scheduled, which is when a deposit is taken, was on no list at all.
1. Invoices & Payments gains a "Deposits & progress payments" group: signed (or accepted-estimate) retail and
   insurance jobs at Approved or Scheduled with a balance, Record payment as the one red button. They are NOT
   added to "owed" or "overdue" — nothing is owed yet.
2. The job card, before the work is finished: Record payment is the red button, the line says so, and Create
   invoice moves under it."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""  /* 1316: one bucket set everywhere — 0–14, 15–30, 31+ */
  function bucketOf(age){""",
"""  /* 1346: signed work not yet done — where a deposit or progress payment is recorded. Never "owed". */
  function depositList(){
    var out = [];
    projects().forEach(function(pr){
      var s = stg(pr);
      if(s !== 'Approved' && s !== 'Scheduled') return;
      if((typeof projClaimType === 'function') && projClaimType(pr) === 'community') return;
      var inv = invoiceFor(pr.id);
      if(invSent(inv)) return;
      var fin = jobFinance(pr);
      if(!(Number(fin.balance) > 0.005) || !(Number(fin.value) > 0 && (fin.source !== 'estimate' || !!fin.estAccepted))) return;
      out.push({ pr:pr, inv:inv, fin:fin, st:statusFor(pr, inv, fin), age:0, dep:true });
    });
    return out;
  }
  /* 1316: one bucket set everywhere — 0–14, 15–30, 31+ */
  function bucketOf(age){""")

one("""    if(x.ready) bits.push('Finished &middot; ' + (x.fin && x.fin.source === 'estimate' ? 'accepted estimate' : 'signed contract'));   /* 1337 */
    else if(!x.inv) bits.push('Not invoiced yet');""",
"""    if(x.dep) bits.push(esc2(stg(pr)) + ' &middot; ' + (x.fin && x.fin.source === 'estimate' ? 'accepted estimate' : 'signed contract') + (x.fin.paid > 0 ? '' : ' &middot; no deposit yet'));   /* 1346 */
    else if(x.ready) bits.push('Finished &middot; ' + (x.fin && x.fin.source === 'estimate' ? 'accepted estimate' : 'signed contract'));   /* 1337 */
    else if(!x.inv) bits.push('Not invoiced yet');""")
one("""    var ageTxt = x.ready ? 'Ready' : (x.age + (x.age === 1 ? ' day' : ' days'));
    var go, more = [];
    if(!x.inv){""",
"""    var ageTxt = x.dep ? 'Before work' : x.ready ? 'Ready' : (x.age + (x.age === 1 ? ' day' : ' days'));
    var go, more = [];
    if(x.dep){   /* 1346: a deposit or progress payment — record it */
      go = RB('primary crar-go', 'data-arpay', IC_CASH + 'Record payment');
    } else if(!x.inv){""")

one("""        body.innerHTML = '<div class="crar-empty"><b>All clear.</b><br>No open balances right now.</div>';
      } else if(!list.length){
        body.innerHTML = readyHtml;""",
"""        body.innerHTML = '<div class="crar-empty"><b>All clear.</b><br>No open balances right now.</div>' + depHtml;
      } else if(!list.length){
        body.innerHTML = readyHtml + depHtml;""")
one("""        body.innerHTML = readyHtml + html;
      }
    }
    remWire();""",
"""        body.innerHTML = readyHtml + html + depHtml;
      }
    }
    remWire();""")
one("""    var ready = readyList();
    var readyHtml = '';""",
"""    var ready = readyList();
    /* 1346: deposits & progress payments — listed, never counted as owed */
    var dep = depositList(), depHtml = '';
    if(dep.length){
      var dsub = 0; dep.forEach(function(x){ dsub += x.fin.balance; });
      depHtml = '<div class="crar-grp dep">'
        + '<div class="crar-grphd"><b>Deposits &amp; progress payments</b><span class="crar-line"></span><span class="crar-sub">' + money(dsub) + ' to come</span></div>'
        + dep.map(rowHtml).join('')
        + '</div>';
    }
    var readyHtml = '';""")

one("""              : canInvoice ? 'Finished work is ready to bill' : 'An invoice opens once a contract is signed or the estimate is accepted.';""",
"""              : (canInvoice && _pre) ? (paid > 0 ? 'Signed \\u2014 record progress payments here' : 'Signed \\u2014 record the deposit here')   /* 1346 */
              : canInvoice ? 'Finished work is ready to bill' : 'An invoice opens once a contract is signed or the estimate is accepted.';""")
one("""    var title = inv ? ('Invoice' + (inv.title && /#[\\w-]+/.test(inv.title) ? ' ' + esc2(inv.title.match(/#[\\w-]+/)[0]) : '')) : 'No invoice yet';""",
"""    var title = inv ? ('Invoice' + (inv.title && /#[\\w-]+/.test(inv.title) ? ' ' + esc2(inv.title.match(/#[\\w-]+/)[0]) : '')) : 'No invoice yet';
    /* 1346: before the work is finished, the money that comes in is a deposit or progress payment */
    var _pre = ['Lead', 'Prospect', 'OnHold', 'Approved', 'Scheduled'].indexOf(normStage(pr.stage)) !== -1;""")
one("""    if(!inv && canInvoice && paid < total) more = B('', 'data-inv-pay', IC_CASH + 'Record payment');""",
"""    if(!inv && canInvoice && paid < total) more = B('', 'data-inv-pay', IC_CASH + 'Record payment');
    if(!inv && canInvoice && paid < total && _pre){   /* 1346 */
      main = B('primary', 'data-inv-pay', IC_CASH + 'Record payment');
      more = B('', 'data-inv-gen', IC_DOC + 'Create invoice');
    }""")

one(">v2026-10-14 build 1345<button", ">v2026-10-14 build 1346<button")
one("""  { b: 1345, d:'2026-10-14',""",
"""  { b: 1346, d:'2026-10-14', t:'Record a deposit before the job is invoiced', s:'A signed job now shows Record payment as its main button until the work is finished, so a deposit or a progress payment goes in from the job page without moving the pipeline. Invoices & Payments has a new Deposits & progress payments group listing every signed job at Approved or Scheduled that still has money to come. Those jobs are not counted as owed or overdue.' },
  { b: 1345, d:'2026-10-14',""")
pl.write_atomic(path, s)
print('patched', path)
