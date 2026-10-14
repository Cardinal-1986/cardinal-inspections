"""Build 1338 — audit W8 (sms-link sends only our pay link; api/sms-link.js, patched separately)
and R8 (insurance money waiting on the carrier is not homeowner-overdue; closed claims are not
'deductibles due')."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# R8a — A/R: tag carrier-owed rows
one("""      out.push({ pr:pr, inv:inv, fin:fin, st:statusFor(pr, inv, fin), age:ageDays(pr, inv) });
    });
    out.sort(function(a, b){ return b.age - a.age; });""",
"""      /* 1338 (audit R8): an insurance job at Invoiced is waiting on the CARRIER to release
         depreciation. Aging it against the homeowner made it red at 31 days and offered
         Remind, which texts the homeowner for the insurer's money. */
      var carrier = s === 'Invoiced' && (typeof projClaimType === 'function') && projClaimType(pr) === 'insurance';
      out.push({ pr:pr, inv:inv, fin:fin, st:statusFor(pr, inv, fin), age:ageDays(pr, inv), carrier:carrier });
    });
    out.sort(function(a, b){ return b.age - a.age; });""")
one("""    var pr = x.pr, od = x.age > 30, id = esc2(pr.id);""",
"""    var pr = x.pr, od = x.age > 30 && !x.carrier, id = esc2(pr.id);   /* 1338 */""")
one("""    } else if(od){
      go = RB('primary crar-go', 'data-artext', IC_SMS + 'Remind');""",
"""    } else if(x.carrier){   /* 1338: chase the carrier from the job, never text the homeowner */
      go = RB('crar-go', 'data-aropen', 'Open job');
      more.push(RB('', 'data-arpay', IC_CASH + 'Record payment'), RB('', 'data-arcopy', IC_LINK + 'Copy link'));
    } else if(od){
      go = RB('primary crar-go', 'data-artext', IC_SMS + 'Remind');""")
one("""    more.push(RB('', 'data-aropen', 'Open job'));
    return '<div class="crar-row' + (od ? ' od' : '') + '">'""",
"""    if(!x.carrier) more.push(RB('', 'data-aropen', 'Open job'));
    if(x.carrier) bits.push('Waiting on the carrier');
    return '<div class="crar-row' + (od ? ' od' : '') + '">'""")
one("""    list.forEach(function(x){ total += x.fin.balance; if(x.age > 30){ overdue += x.fin.balance; overdueN++; } });""",
"""    list.forEach(function(x){ total += x.fin.balance; if(x.age > 30 && !x.carrier){ overdue += x.fin.balance; overdueN++; } });   /* 1338 */""")
one("""        var buckets = [[], [], []];
        list.forEach(function(x){ buckets[bucketOf(x.age)].push(x); });""",
"""        var buckets = [[], [], []], carrierRows = [];
        list.forEach(function(x){ (x.carrier ? carrierRows : buckets[bucketOf(x.age)]).push(x); });   /* 1338 */""")
one("""        body.innerHTML = readyHtml + html;""",
"""        if(carrierRows.length){
          var csub = 0; carrierRows.forEach(function(x){ csub += x.fin.balance; });
          html += '<div class="crar-grp carrier">'
            + '<div class="crar-grphd"><b>Waiting on the carrier</b><span class="crar-line"></span><span class="crar-sub">' + money(csub) + '</span></div>'
            + carrierRows.map(rowHtml).join('')
            + '</div>';
        }
        body.innerHTML = readyHtml + html;""")

# R8c — claims hub: a closed claim's deductible is not 'due'
one("""if(!c.deductible_waived && Number(c.deductible) > 0){
dedDue += Number(c.deductible); dedCount++;""",
"""if(st !== 'Closed' && !c.deductible_waived && Number(c.deductible) > 0){   /* 1338 (audit R8): Closed is settled */
dedDue += Number(c.deductible); dedCount++;""")

# stamp + changelog
import re
m = re.search(r'>v2026-10-14 build 1337<button', s); assert m
s = s.replace('>v2026-10-14 build 1337<button', '>v2026-10-14 build 1338<button', 1)
one("{ b: 1337, d:'2026-10-14',",
"""{ b: 1338, d:'2026-10-14', t:'Insurance money waits on the carrier, not the homeowner', s:'On Invoices and Payments, an insurance job waiting for the carrier to release depreciation now sits in its own "Waiting on the carrier" group. It is no longer marked overdue at 31 days, it does not count toward the overdue total, and its button opens the job instead of texting the homeowner a reminder for the insurer\\'s money. On the claims hub, a closed claim no longer counts toward deductibles due. The company text only ever sends Cardinal\\'s own pay link.' },
  { b: 1337, d:'2026-10-14',""")
pl.write_atomic(path, s)
print('1338 applied')
