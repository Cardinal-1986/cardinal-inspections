"""Build 1316 — one A/R list (invoicing audit R3–R7, M9, D4, C4).

Three screens answered "who owes me" three ways: the Invoices & AR list (any CRM, stage
Invoiced or any invoice document, Closed included, Community missing), the home card
(Invoiced only, 4 buckets <30/31-60/61-90/>90, aged from the stage date) and Partner A/R
(Community, bid fallback, over 30 from the stage date). Now one set of rules lives in
cr-ar-script and the other two read it:
  * WHO OWES: a job that is Invoiced or Closed, or whose invoice has been SENT, and still
    has a balance. Lost never counts. A Closed job with money owed is no longer invisible.
  * HOW MUCH: jobFinance, except a Community job priced only by its bid owes its bid less
    what has been paid (jobFinance's value is 0 there, and its paid figure clamps to 0 —
    a $12,000 Habitat job with $6,000 paid read $12,000 on one screen, $0 on another and
    was missing from the third). CardinalAR.owed(pr).
  * HOW OLD: from the date the invoice was sent; else the day the job went Invoiced; else
    the invoice's own date. Never "last edited" — that reset to 0 on any change.
    CardinalAR.age(pr).
  * BUCKETS: 0–14 days, 15–30, 31+ (overdue) — everywhere. The 30+ label said 30 and
    meant 31.
  * READY TO INVOICE: a Completed retail or insurance job with a signed contract (or a
    manual value), money owed and no invoice sent yet — the commonest case, which the list
    could never show, so its own Create invoice button never appeared. First on the list.
  * Overdue first, then 15–30, then current. Partner A/R and the home card read the same list.
Usage: python3 patch_1316.py [index.html]
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

# ---- cr-ar-script: the rules ----
one("""  /* days since the invoice was sent, else since Invoiced stage */
  function ageDays(pr, inv){
    var iso = (inv && inv.sent_at) || null;
    if(!iso){
      var ck = (typeof parseCkAll === 'function') ? parseCkAll(pr) : {};
      iso = ck.t_Invoiced || pr.stage_since || pr.updated_at || null;
    }
    if(!iso) return 0;
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d > 0 ? d : 0;
  }

  /* the AR set: invoiced (or invoice-bearing) jobs that still owe */
  function arList(){
    var out = [];
    projects().forEach(function(pr){
      var inv = invoiceFor(pr.id);
      if(stg(pr) !== 'Invoiced' && !inv) return;
      var fin = jobFinance(pr);
      if(!(Number(fin.balance) > 0.005)) return;
      out.push({ pr:pr, inv:inv, fin:fin, st:statusFor(pr, inv, fin), age:ageDays(pr, inv) });
    });
    out.sort(function(a, b){ return b.age - a.age; });
    return out;
  }
  function bucketOf(age){ return age < 15 ? 0 : (age <= 30 ? 1 : 2); }""",
"""  /* 1316: ONE aging clock for every A/R screen. The invoice's sent date; else the day the job
     went Invoiced; else the invoice's own date. Never updated_at — any edit reset it to 0 —
     and never pr.stage_since, which is not a column (it lives in the checklist). */
  function ageDays(pr, inv){
    var ck = (typeof parseCkAll === 'function') ? parseCkAll(pr) : {};
    var iso = (inv && inv.sent_at) || ck.t_Invoiced || ck.stage_since || (inv && inv.created_at) || null;
    if(!iso) return 0;
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d > 0 ? d : 0;
  }
  /* 1316: what a job owes. jobFinance's number, except a Community job priced only by its bid:
     there jobFinance's value is 0 and its paid figure clamps to 0, so a $12,000 Habitat job
     with $6,000 paid read $12,000 on one screen, $0 on another and was missing from a third.
     It owes its bid less what has been paid. */
  function owed(pr){
    var fin = jobFinance(pr);
    if(Number(fin.value) > 0) return fin;
    var community = (typeof projClaimType === 'function') && projClaimType(pr) === 'community';
    if(!community || typeof window.commBidAmount !== 'function') return fin;
    var est = (typeof estBest !== 'undefined' && estBest) ? (Number(estBest[pr.id]) || 0) : 0;
    var b = Number((window.commBidAmount(pr, { total: est }) || {}).amt) || 0;
    var paid = (typeof collPaid !== 'undefined' && collPaid) ? (Number(collPaid[pr.id]) || 0) : 0;
    return { contracts: fin.contracts, value: b, paid: paid, balance: b - paid,
             pct: b ? Math.round(paid / b * 100) : 0, source: b ? 'bid' : 'none' };
  }
  function invSent(inv){ return !!(inv && inv.status === 'sent'); }
  /* 1316: ONE rule for who owes. Invoiced or Closed, or an invoice that has gone out, with a
     balance. Lost never counts. A Closed job with money owed used to vanish from the home card. */
  function arList(){
    var out = [];
    projects().forEach(function(pr){
      var s = stg(pr);
      if(s === 'Lost') return;
      var inv = invoiceFor(pr.id);
      if(s !== 'Invoiced' && s !== 'Closed' && !invSent(inv)) return;
      var fin = owed(pr);
      if(!(Number(fin.balance) > 0.005)) return;
      out.push({ pr:pr, inv:inv, fin:fin, st:statusFor(pr, inv, fin), age:ageDays(pr, inv) });
    });
    out.sort(function(a, b){ return b.age - a.age; });
    return out;
  }
  /* 1316: finished work nobody has billed — the commonest case, and the list could never show
     it, so its own Create invoice button never appeared. Retail and insurance only: Community
     is billed to the partner from its own page. Estimate-priced jobs are left out because an
     invoice needs contract money (createInvoiceFor refuses them). */
  function readyList(){
    var out = [];
    projects().forEach(function(pr){
      if(stg(pr) !== 'Completed') return;
      if((typeof projClaimType === 'function') && projClaimType(pr) === 'community') return;
      var inv = invoiceFor(pr.id);
      if(invSent(inv)) return;
      var fin = jobFinance(pr);
      if(!(Number(fin.balance) > 0.005) || fin.source === 'estimate') return;
      out.push({ pr:pr, inv:inv, fin:fin, st:statusFor(pr, inv, fin), age:0, ready:true });
    });
    return out;
  }
  /* 1316: one bucket set everywhere — 0–14, 15–30, 31+ */
  function bucketOf(age){ return age < 15 ? 0 : (age <= 30 ? 1 : 2); }
  var BUCKET_LABELS = ['0–14 days', '15–30 days', '31+ days · overdue'];""")

# render: Ready first, then overdue → current
one("""        var buckets = [[], [], []];
        list.forEach(function(x){ buckets[bucketOf(x.age)].push(x); });
        var labels = ['Current &middot; 0&ndash;14 days', '15&ndash;30 days', '30+ days &middot; overdue'];
        var html = '';
        for(var i = 0; i < 3; i++){""",
"""        var buckets = [[], [], []];
        list.forEach(function(x){ buckets[bucketOf(x.age)].push(x); });
        var labels = ['0&ndash;14 days', '15&ndash;30 days', '31+ days &middot; overdue'];
        var html = '';
        /* 1316: the oldest money first — on a phone the 45-day job used to sit ~2,000px down */
        for(var i = 2; i >= 0; i--){""")
one("""    var body = q('crarBody');
    if(body){
      if(!list.length){""",
"""    var body = q('crarBody');
    var ready = readyList();
    var readyHtml = '';
    if(ready.length){
      var rsub = 0; ready.forEach(function(x){ rsub += x.fin.balance; });
      readyHtml = '<div class="crar-grp ready">'
        + '<div class="crar-grphd"><b>Ready to invoice</b><span class="crar-line"></span><span class="crar-sub">' + money(rsub) + '</span></div>'
        + ready.map(rowHtml).join('')
        + '</div>';
    }
    if(body){
      if(!list.length && !ready.length){""")
one("""        body.innerHTML = html;
      }
    }
    remWire();""",
"""        body.innerHTML = readyHtml + html;
      }
    }
    remWire();""")
# the empty-list branch must still show Ready when only Ready exists
one("""      if(!list.length && !ready.length){
        body.innerHTML = '<div class="crar-empty"><b>All clear.</b><br>No open balances right now.</div>';
      } else {""",
"""      if(!list.length && !ready.length){
        body.innerHTML = '<div class="crar-empty"><b>All clear.</b><br>No open balances right now.</div>';
      } else if(!list.length){
        body.innerHTML = readyHtml;
      } else {""")
# rowHtml: a ready row says so; age text
one("""    var note = x.inv ? '' : ' &middot; not yet invoiced';""",
    """    var note = x.ready ? ' &middot; finished, not invoiced yet' : (x.inv ? '' : ' &middot; not yet invoiced');""")
one("""    var ageTxt = od ? (x.age + ' days &middot; overdue')""",
    """    var ageTxt = x.ready ? 'Ready' : od ? (x.age + ' days &middot; overdue')""")
one("""    status:statusOf, jobBlock:jobBlockHtml, recordPayment:openPayModal, payLink:linkFor,""",
    """    status:statusOf, jobBlock:jobBlockHtml, recordPayment:openPayModal, payLink:linkFor,
    owed:owed, age:function(pr){ return ageDays(pr, invoiceFor(pr.id)); }, ready:readyList,
    bucketOf:bucketOf, bucketLabels:BUCKET_LABELS,   /* 1316: the one A/R rule set */""")

# ---- home card: read the same list ----
one("""  var buckets = [
    { lbl:'<30',   min:0,  max:30,       amt:0, col:'#7CB342' },
    { lbl:'31-60', min:31, max:60,       amt:0, col:'#E8B10F' },
    { lbl:'61-90', min:61, max:90,       amt:0, col:'#F08A24' },
    { lbl:'>90',   min:91, max:Infinity, amt:0, col:'#C8202E' }
  ];
  var total = 0;
  var _arBoard = (typeof boardProjects === 'function') ? boardProjects() : cacheProjects;
  var _arRows = [];
  _arBoard.forEach(function(p){
    if(normStage(p.stage) !== 'Invoiced') return;
    var ck = parseCkAll(p);
    var inv = ck.t_Invoiced || ck.stage_since || p.updated_at;
    var days = inv ? Math.floor((Date.now() - new Date(inv).getTime())/86400000) : 0;
    /* 654 (CR-AUD-004): outstanding is what is still OWED — value minus
       payments received — not the gross job value. A half-paid job used to
       read full here and half on its own profile. */
    var v = jobFinance(p).balance;
    if(v <= 0) return;
    total += v;
    _arRows.push({ name: p.name || 'Client', v: v });
    for(var i=0;i<buckets.length;i++){
      if(days >= buckets[i].min && days <= buckets[i].max){ buckets[i].amt += v; break; }
    }
  });""",
"""  /* 1316: the SAME list, clock and buckets as Invoices & AR (CardinalAR.list), for the jobs on
     this board. It used to count Invoiced only, age from the stage date or the last edit,
     and bucket <30 / 31-60 / 61-90 / >90 — so a day-30 job was "<30" here and "15–30" there. */
  var buckets = [
    { lbl:'0–14', amt:0, col:'#7CB342' },
    { lbl:'15–30', amt:0, col:'#E8B10F' },
    { lbl:'31+',    amt:0, col:'#C8202E' }
  ];
  var total = 0;
  var _arBoard = (typeof boardProjects === 'function') ? boardProjects() : cacheProjects;
  var _onBoard = {}; (_arBoard || []).forEach(function(p){ _onBoard[p.id] = 1; });
  var _arRows = [];
  var _arAll = (window.CardinalAR && typeof window.CardinalAR.list === 'function') ? window.CardinalAR.list() : [];
  _arAll.forEach(function(x){
    if(!_onBoard[x.pr.id]) return;
    var v = Number(x.fin.balance) || 0;
    if(v <= 0) return;
    total += v;
    _arRows.push({ name: x.pr.name || 'Client', v: v });
    buckets[window.CardinalAR.bucketOf(x.age)].amt += v;
  });""")

# ---- Community home: Partner A/R reads the same list ----
one("""d.all.forEach(function(pr){
if(normStage(pr.stage) !== 'Invoiced') return;
var owe = 0;
/* jobFinance is the number when a contract or estimate carries one; a Community
   job priced only by its bid (the usual shape) owes its bid. */
try{ var jf = (typeof window.jobFinance === 'function') ? window.jobFinance(pr) : null;
owe = (jf && jf.value > 0) ? (jf.balance || 0) : (bidAmt(pr) || 0); }catch(_1304){ owe = bidAmt(pr) || 0; }
if(!(owe > 0)) return;
var c = ck(pr) || {}, invAt = c.t_Invoiced || c.stage_since;
if(invAt && (Date.now() - new Date(invAt).getTime()) > 30 * 86400000) arOld++;
var pn = partnerOf(pr);""",
"""/* 1316: the same who-owes / how-much / how-old rules as Invoices & AR (CardinalAR.list), so
   a partner's balance reads the same on both screens — and payments now count (a bid-only
   job used to owe its whole bid however much the partner had paid). */
var arMine = {}; d.all.forEach(function(pr){ arMine[pr.id] = 1; });
var arSrc = (window.CardinalAR && typeof window.CardinalAR.list === 'function') ? window.CardinalAR.list() : [];
arSrc.forEach(function(x){
var pr = x.pr;
if(!arMine[pr.id]) return;
var owe = Number(x.fin.balance) || 0;
if(!(owe > 0)) return;
if(x.age > 30) arOld++;
var pn = partnerOf(pr);""")

one(">v2026-10-11 build 1315<button", ">v2026-10-11 build 1316<button")
one("var CHANGELOG = [", """var CHANGELOG = [
  { b: 1316, d:'2026-10-11', t:'One answer to who owes you', s:'Invoices & AR, the home card and Community\\u2019s Partner A/R each counted different jobs, aged them from different dates and grouped them differently. They now share one set of rules: a job owes when it is Invoiced or Closed, or its invoice has gone out, and still has a balance; age runs from the day the invoice was sent; groups are 0\\u201314, 15\\u201330 and 31+ days. The oldest money is at the top. Finished jobs that were never invoiced have their own Ready to invoice group with a Create invoice button. Partner jobs show on Invoices & AR, and payments on them now count.' },""")
pl.write_atomic(PATH, src)
print('1316 applied')
