"""Build 1319 — the Invoices list, Theo's pick 1 (rows with the action showing; invoicing
audit D3, D8, D12; Theo: "2, 1").

  * one line on top instead of three tiles: "$40,000 owed" and, under it,
    "$22,000 overdue · $5,000 paid this month"
  * each row: the name with its age, one line of what happened ("Paid $5,000 of $20,000 ·
    sent Sep 21"), the balance on the right, ONE red button for the next thing to do, and a
    ⋯ that opens the rest (Copy link, Text link, Email, Record payment, Open job, the
    reminder history and its mute switch)
  * the red button: Create invoice (nothing billed yet) → Send (invoice not out) → Remind
    (out and 31+ days) → Record payment (out, not overdue — outline, nothing urgent)
  * Ready-to-invoice rows carry no reminder strip (there is no invoice to remind about)
  * five buttons per row used to wrap to three lines on a phone; now it is two controls
The ids the KPIs are written to, and every data-ar* hook, are kept, so the money is read
and written by the same code as before.
Usage: python3 patch_1319.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
def one(old, new):
    global src
    assert src.count(old) == 1, (old[:100], src.count(old))
    src = src.replace(old, new)

# ── the KPI strip → one line ────────────────────────────────────────────────────────────
one("""    <div class="crar-kpis">
      <div class="crar-kpi"><span class="crar-k">Total outstanding</span><span class="crar-v" id="crarKpiOut">$0</span><span class="crar-sub" id="crarKpiOutSub">0 jobs owe</span></div>
      <div class="crar-kpi"><span class="crar-k">Paid this month</span><span class="crar-v pos" id="crarKpiMonth">$0</span><span class="crar-sub">card &amp; offline</span></div>
      <div class="crar-kpi alert"><span class="crar-k">Overdue &middot; 31+ days</span><span class="crar-v" id="crarKpiOver">$0</span><span class="crar-sub" id="crarKpiOverSub">nothing overdue</span></div>
    </div>""",
"""    <div class="crar-kpis">
      <div class="crar-kpi"><div class="crar-kbig"><span class="crar-v" id="crarKpiOut">$0</span> <span class="crar-kow">owed</span> <span class="crar-sub" id="crarKpiOutSub">0 jobs owe</span></div>
        <div class="crar-kline"><b class="od" id="crarKpiOver">$0</b> overdue &middot; <b class="pos" id="crarKpiMonth">$0</b> paid this month <span class="crar-sub" id="crarKpiOverSub"></span></div></div>
    </div>""")

# ── CSS, edited where it lives ─────────────────────────────────────────────────────────
one("#cr-ar-view .crar-kpis{display:grid; grid-template-columns:repeat(3,1fr); gap:13px; margin-bottom:8px;}",
    "#cr-ar-view .crar-kpis{margin-bottom:8px;}   /* 1319: one line, not three tiles */")
one("""#cr-ar-view .crar-v.pos{color:var(--crar-pos,#34d399); --cr-stack:"state modifier on .crar-v: a KPI that is money COLLECTED reads green; the base ink must stay for the other two tiles";}
#cr-ar-view .crar-kpi.alert .crar-v{color:var(--crar-alert,#f08a90); --cr-stack:"state modifier on .crar-v: the overdue tile alerts; the base ink must stay for the other two tiles";}
""", """#cr-ar-view .crar-kbig{display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;}
#cr-ar-view .crar-kow{font-size:18px; font-weight:700; color:var(--est-ink);}
#cr-ar-view .crar-kline{font-size:15px; color:var(--est-dim);}
#cr-ar-view .crar-kline b{font-weight:700; font-variant-numeric:tabular-nums;}
#cr-ar-view .crar-kline b.od{color:var(--crar-alert,#f08a90);}
#cr-ar-view .crar-kline b.pos{color:var(--crar-pos,#34d399);}
""")
one("""#cr-ar-view .crar-row{
  display:grid; grid-template-columns:1.35fr .95fr auto; align-items:center; gap:14px;""",
"""#cr-ar-view .crar-row{
  display:block;""")
one("""#cr-ar-view .crar-money{display:flex; gap:16px; justify-content:flex-end;}
#cr-ar-view .crar-col{display:flex; flex-direction:column; align-items:flex-end; gap:2px;}
#cr-ar-view .crar-cl{font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:var(--crar-mist);}
#cr-ar-view .crar-mv{font-size:15px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--est-ink);}
#cr-ar-view .crar-mv.dim{color:var(--crar-mist); font-weight:500;}
#cr-ar-view .crar-mv.pos{color:var(--crar-pos,#34d399);}
#cr-ar-view .crar-mv.bal{font-size:18px; font-weight:800;}
#cr-ar-view .crar-mv.bal.od{color:var(--crar-alert,#f08a90);}
#cr-ar-view .crar-age{font-size:13px; font-weight:600; color:var(--crar-mist); white-space:nowrap;}""",
"""#cr-ar-view .crar-top2{display:flex; justify-content:space-between; align-items:flex-start; gap:12px;}
#cr-ar-view .crar-amt{font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; white-space:nowrap; color:var(--est-ink);}
#cr-ar-view .crar-amt.od{color:var(--crar-alert,#f08a90);}
#cr-ar-view .crar-age{display:inline-flex; padding:2px 9px; border:1px solid var(--est-line); border-radius:999px;
  font-size:13px; font-weight:600; color:var(--crar-mist); white-space:nowrap;}""")
one("""#cr-ar-view .crar-acts{grid-column:1 / -1; display:flex; gap:8px; flex-wrap:wrap;
  border-top:1px dashed var(--est-line); margin-top:2px; padding-top:12px;}""",
"""#cr-ar-view .crar-acts{display:flex; gap:8px; margin-top:12px;}
#cr-ar-view .crar-acts .crar-go{flex:1 1 auto; justify-content:center;}
#cr-ar-view .crar-more{min-width:44px; justify-content:center;}
#cr-ar-view .crar-menu{display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed var(--est-line);}
#cr-ar-view .crar-menu[hidden]{display:none;}
#cr-ar-view .crar-menu .crar-rem{flex-basis:100%;}""")
one("""@media(max-width:640px){
  #cr-ar-view .crar-kpis{grid-template-columns:1fr;}
}
@media(max-width:560px){
  #cr-ar-view .crar-row{grid-template-columns:1fr;}
  #cr-ar-view .crar-money{justify-content:flex-start;}
  #cr-ar-view .crar-age{margin-top:2px;}
}
""", "")

# ── the row ────────────────────────────────────────────────────────────────────────────
i = src.index("  function rowHtml(x){\n    var pr = x.pr, od = x.age > 30;")
j = src.index("  function render(){\n    var view = q('cr-ar-view');", i)
src = src[:i] + r"""  /* 1319 (Theo's pick 1): one red button for the next thing to do, a ⋯ for the rest */
  var IC_MORE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  function shortDate(v){ var d = v ? new Date(v) : null; return (d && !isNaN(d.getTime())) ? d.toLocaleDateString('en-US', { month:'short', day:'numeric' }) : ''; }
  function rowHtml(x){
    var pr = x.pr, od = x.age > 30, id = esc2(pr.id);
    var nm = esc2(pr.name || 'Client');
    var sent = !!(x.inv && x.inv.status === 'sent');
    var RB = function(cls, attr, label){ return '<button class="crar-btn' + (cls ? ' ' + cls : '') + '" type="button" ' + attr + '="' + id + '">' + label + '</button>'; };
    var bits = [];
    if(x.ready) bits.push('Finished &middot; signed contract');
    else if(!x.inv) bits.push('Not invoiced yet');
    if(x.fin.paid > 0) bits.push('Paid ' + money(x.fin.paid) + ' of ' + money(x.fin.value));
    if(x.inv) bits.push(sent ? ('Sent ' + esc2(shortDate(x.inv.sent_at) || (x.age + ' days ago'))) : 'Invoice not sent');
    var ageTxt = x.ready ? 'Ready' : (x.age + (x.age === 1 ? ' day' : ' days'));
    var go, more = [];
    if(!x.inv){
      go = RB('primary crar-go', 'data-armkinv', 'Create invoice');
      more.push(RB('', 'data-arpay', IC_CASH + 'Record payment'));
    } else if(!sent){
      go = RB('primary crar-go', 'data-artext', IC_SMS + 'Send');
      more.push(RB('', 'data-arcopy', IC_LINK + 'Copy link'), RB('', 'data-aremail', IC_MAIL + 'Email'), RB('', 'data-arpay', IC_CASH + 'Record payment'));
    } else if(od){
      go = RB('primary crar-go', 'data-artext', IC_SMS + 'Remind');
      more.push(RB('', 'data-arcopy', IC_LINK + 'Copy link'), RB('', 'data-aremail', IC_MAIL + 'Email'), RB('', 'data-arpay', IC_CASH + 'Record payment'));
    } else {
      go = RB('crar-go', 'data-arpay', IC_CASH + 'Record payment');
      more.push(RB('', 'data-arcopy', IC_LINK + 'Copy link'), RB('', 'data-artext', IC_SMS + 'Text link'), RB('', 'data-aremail', IC_MAIL + 'Email'));
    }
    more.push(RB('', 'data-aropen', 'Open job'));
    return '<div class="crar-row' + (od ? ' od' : '') + '">'
      + '<div class="crar-top2"><div class="crar-who"><div class="crar-nm">' + nm + (x.inv ? ' ' + pill(x.st) : '') + ' <span class="crar-age' + (od ? ' od' : '') + '">' + ageTxt + '</span></div>'
      +   '<div class="crar-addr">' + bits.join(' &middot; ') + '</div></div>'
      +   '<div class="crar-amt' + (od ? ' od' : '') + '">' + money(x.fin.balance) + '</div></div>'
      + '<div class="crar-acts">' + go
      +   '<button class="crar-btn crar-more" type="button" data-armore="' + id + '" aria-expanded="false" aria-label="More for ' + nm + '">' + IC_MORE + '</button></div>'
      + '<div class="crar-menu" data-armenu="' + id + '" hidden>' + more.join('')
      +   (x.inv ? '<div class="crar-rem" data-remfor="' + id + '"></div>' : '') + '</div>'
      + '</div>';
  }

""" + src[j:]

# the ⋯ toggle, in the list's own click delegate
one("""    if((t = e.target.closest('[data-aropen]'))){ if(window.openProject) window.openProject(t.getAttribute('data-aropen')); return; }""",
    """    if(e.target instanceof Element && (t = e.target.closest('[data-armore]'))){   /* 1319 */
      var mn = document.querySelector('#cr-ar-view [data-armenu="' + t.getAttribute('data-armore') + '"]');
      if(mn instanceof HTMLElement){ mn.hidden = !mn.hidden; t.setAttribute('aria-expanded', mn.hidden ? 'false' : 'true'); }
      return;
    }
    if((t = e.target.closest('[data-aropen]'))){ if(window.openProject) window.openProject(t.getAttribute('data-aropen')); return; }""")

# KPI words — money(0) prints "--", which reads badly on the one line
one("""    if(q('crarKpiOut')) q('crarKpiOut').textContent = money(total);
    if(q('crarKpiMonth')) q('crarKpiMonth').textContent = money(paidThisMonth());
    if(q('crarKpiOver')) q('crarKpiOver').textContent = money(overdue);""",
    """    var m0 = function(n){ return Number(n) > 0 ? money(n) : '$0'; };   /* 1319 */
    if(q('crarKpiOut')) q('crarKpiOut').textContent = m0(total);
    if(q('crarKpiMonth')) q('crarKpiMonth').textContent = m0(paidThisMonth());
    if(q('crarKpiOver')) q('crarKpiOver').textContent = m0(overdue);""")
one("""    if(q('crarKpiOverSub')) q('crarKpiOverSub').textContent = overdueN ? (overdueN + (overdueN === 1 ? ' invoice needs a nudge' : ' invoices need a nudge')) : 'nothing overdue';""",
    """    if(q('crarKpiOverSub')) q('crarKpiOverSub').textContent = '';   /* 1319: the one line says it */""")

one(">v2026-10-11 build 1318<button", ">v2026-10-12 build 1319<button")
one("var CHANGELOG = [", """var CHANGELOG = [
  { b: 1319, d:'2026-10-12', t:'The Invoices list, simpler', s:'Invoices now opens on one line \\u2014 what you are owed, what is overdue and what came in this month \\u2014 and every job on it has one red button for the next thing to do (Create invoice, Send, Remind, or Record payment) and a \\u22ef for everything else: copy the link, email it, record a payment, open the job, and the reminder history. The oldest money is still at the top.' },""")
pl.write_atomic(PATH, src)
print('1319 applied')
