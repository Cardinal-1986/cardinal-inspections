"""Build 1351 — the client page stops showing the same money three times (Theo: "do all").
Theo's screenshot showed Balance due three times (money strip, invoice card "--", Payments card), Job total
twice, a Payment Information row opening the pre-1349 page, and a hole in the wide-screen layout.
Retail only — Community (1264) and Insurance have their own versions of this band and are untouched.
1. Retail: the money strip (Job Value / % ring / Balance due) is gone; the Payments card carries the numbers
   and now a "% paid" bar.
2. The invoice card is status + actions only (no balance, no bar, no "$x paid of $y") — the "--" goes with it.
3. Retail: the Payment Information row is gone. Before removing it, its data was checked (16 Oct): only two
   jobs have rows there. Their Labor rows are the same checks recorded in Crews (same amounts, <=4 days
   apart). What only the old sheet had — two material receipts on one job, one customer payment on another —
   now shows in the Payments card, marked OLD SHEET, read-only. Crew duplicates are skipped (same cents
   within 7 days of a crew payment). The old page itself is kept (Community and Insurance still open it).
4. Retail: the invoice card and the Payments card travel as one stack, so on a wide screen they sit together
   in the left column above the Job Menu instead of leaving a hole."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# ---- 1, 3, 4: renderAcxOverview ----
one("""  /* ---- money strip ---- */
  html += '<div class="dbmoney">' +""",
"""  /* 1351: retail no longer shows the strip, the old Payment Information row, or the invoice + Payments cards
     apart — the Payments card is the one place the job's money is read. Community / Insurance unchanged. */
  var _rt1351 = (_ct !== 'insurance' && _ct !== 'community');
  /* ---- money strip ---- */
  if(!_rt1351) html += '<div class="dbmoney">' +""")
one("""  /* 1108: the rep-facing Invoices & Payments block, right under the money strip. */
  html += (window.CardinalAR && window.CardinalAR.jobBlock) ? window.CardinalAR.jobBlock(pr, fin) : '';
  /* 1349: every payment on the job, in and out, right under the invoice card */
  html += (window.CardinalJobPay && window.CardinalJobPay.html) ? window.CardinalJobPay.html(pr, fin) : '';""",
"""  /* 1108: the rep-facing Invoices & Payments block, right under the money strip. */
  if(_rt1351) html += '<div class="crji-stack">';
  html += (window.CardinalAR && window.CardinalAR.jobBlock) ? window.CardinalAR.jobBlock(pr, fin) : '';
  /* 1349: every payment on the job, in and out, right under the invoice card */
  html += (window.CardinalJobPay && window.CardinalJobPay.html) ? window.CardinalJobPay.html(pr, fin) : '';
  if(_rt1351) html += '</div>';""")
one("""  html += '<div class="dbrow" id="dbPayRow"><span class="dbic1">$</span> Payment Information<span class="dbgo">&#8250;</span></div>' +
    '<div class="dbrow" id="dbMoneyRow">""",
"""  html += (_rt1351 ? '' : '<div class="dbrow" id="dbPayRow"><span class="dbic1">$</span> Payment Information<span class="dbgo">&#8250;</span></div>') +
    '<div class="dbrow" id="dbMoneyRow">""")

# ---- 2: the invoice card is status + actions ----
one("""    return '<div class="crji-card v2" role="region" aria-label="Invoice">'
      + '<div class="crji-row"><span class="crji-ttl">' + title + ' ' + pill(st) + '</span>'
      +   '<span class="crji-amt ' + (isPaid ? 'paid' : 'due') + '">' + (isPaid ? 'Paid' : money(bal)) + '</span></div>'
      + '<div class="crji-row crji-sub"><span>' + line2 + '</span><span>' + (isPaid ? '' : 'balance due') + '</span></div>'
      + (total > 0 ? '<div class="crji-bar" role="img" aria-label="' + pct + '% paid"><i style="width:' + pct + '%"></i></div>'
                   + '<div class="crji-sub">' + (paid > 0 ? money(paid) : '$0') + ' paid of ' + money(total) + '</div>'   /* 1337: money(0) prints '--' */ : '')
      + '<div class="crji-acts">' + main + more + '</div>'""",
"""    /* 1351: status and actions only. The balance, the bar and "$x paid of $y" live in the Payments card
       right below — this card printed the same balance a third time (and "--" for $0). */
    void bal; void pct;
    return '<div class="crji-card v2" role="region" aria-label="Invoice">'
      + '<div class="crji-row"><span class="crji-ttl">' + title + ' ' + pill(st) + '</span></div>'
      + '<div class="crji-row crji-sub"><span>' + line2 + '</span></div>'
      + '<div class="crji-acts">' + main + more + '</div>'""")

# ---- Payments card: % paid bar, old-sheet rows, stack layout ----
one(""".crjp-card .crjp-err{font-size:13px;color:var(--crji-due,#f08a90);}
""",""".crjp-card .crjp-err{font-size:13px;color:var(--crji-due,#f08a90);}
/* 1351: the % paid bar that used to sit in the money strip */
.crjp-card .crjp-pbar{height:8px;border-radius:99px;background:var(--crjp-seg,#1b1f24);overflow:hidden;margin:10px 0 4px;}
.crjp-card .crjp-pbar i{display:block;height:100%;background:var(--crji-pos,#34d399);border-radius:99px;}
/* 1351: retail — the invoice card and the Payments card travel together (one slot in every layout) */
#projectView #acxMount > .crji-stack > .crji-card{margin:12px 0 4px;}
@media (max-width:560px){ #projectView #acxMount > .crji-stack{ order:3; } }
@media (min-width:561px){ body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .crji-stack{ order:3; } }
@media (min-width:1600px){
  body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .crji-stack,
  body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > #dbMoneyRow{ grid-column:1; }
  body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .crji-stack{ grid-row:span 6; }
  /* the right column backfills beside the stack instead of waiting for the Job Menu's row */
  body:not(.claim-insurance):not(.claim-community) #projectView #acxMount:has(> .crji-stack){ grid-auto-flow:row dense; }
}
""")
one("""    if(office && (costT > 0 || total > 0)){""",
"""    if(total > 0){
      var pp = Math.max(0, Math.min(100, Math.round(paid / total * 100)));
      h += '<div class="crjp-pbar" role="img" aria-label="' + pp + '% paid"><i style="width:' + pp + '%"></i></div>' +
        '<div class="crjp-note" style="margin:0">' + pp + '% paid</div>';
    }
    if(office && (costT > 0 || total > 0)){""")
# old-sheet rows: money in (only when the job has no collections — jobFinance's own rule) ...
one("""    (d.costs || []).forEach(function(c){
      rows.push({ k:'cost', id:c.id, raw:c, tbl:'job_costs', kind: c.kind || 'other',""",
"""    if(!(d.colls || []).length) (d.legacy || []).forEach(function(p, i){
      if(p.dir !== 'in') return;
      rows.push({ k:'in', id:'old-in-' + i, raw:null, title: 'Payment', tag:'OLD SHEET',
        when: jpDay(p.date), entered:'', by:'old payment sheet',
        amt: Number(p.amt) || 0, sortDay: String(p.date || ''), sortAt:'' });
    });
    (d.costs || []).forEach(function(c){
      rows.push({ k:'cost', id:c.id, raw:c, tbl:'job_costs', kind: c.kind || 'other',""")
# ... and costs (office only), skipping the ones that are the same check recorded in Crews
one("""    var crewName = {};
    (d.crews || []).forEach(function(r){ crewName[r.id] = r.name; });""",
"""    (d.legacy || []).forEach(function(p, i){
      if(p.dir !== 'out' && p.dir !== 'exp') return;
      var a = Number(p.amt) || 0;
      var dup = (d.crew || []).some(function(c){ return cents(c.amount) === cents(a) && Math.abs(dayNum(c.paid_on) - dayNum(p.date)) <= 7; });
      if(dup || !a) return;
      var acct = String(p.account || '');
      rows.push({ k:'cost', id:'old-' + i, raw:null, kind: /labor/i.test(acct) ? 'labor' : /material/i.test(acct) ? 'material' : 'other',
        title: acct || (p.dir === 'exp' ? 'Expense' : 'Paid out'), tag:'OLD SHEET',
        when: jpDay(p.date), entered:'', by:'old payment sheet',
        amt: a, sortDay: String(p.date || ''), sortAt:'' });
    });
    var crewName = {};
    (d.crews || []).forEach(function(r){ crewName[r.id] = r.name; });""")
one("""    }).then(function(d){
      cache[pid] = d;""",
"""    }).then(function(d){
      /* 1351: the pre-1349 payment sheet (checklist.payments), read-only, so nothing on it is lost */
      try{
        var prs = (typeof cacheProjects !== 'undefined' && cacheProjects) || [];
        var pr = prs.filter(function(x){ return String(x.id) === String(pid); })[0] || window.currentProject;
        d.legacy = (pr && String(pr.id) === String(pid) && typeof parseCkAll === 'function') ? (parseCkAll(pr).payments || []) : [];
      }catch(_){ d.legacy = []; }
      cache[pid] = d;""")
# a cost row's tag dot: old-sheet rows carry their kind too
one(""" + (r.k === 'cost' ? ' k-' + E(r.kind || 'other') : '') + """,""" + (r.k === 'cost' && r.tag !== 'OLD SHEET' ? ' k-' + E(r.kind || 'other') : '') + """)

one(">v2026-10-16 build 1350<button", ">v2026-10-16 build 1351<button")
one("""  { b: 1350, d:'2026-10-16',""",
"""  { b: 1351, d:'2026-10-16', t:'The job page shows its money once', s:'On a retail job the money now lives in one place, the Payments card: job total, received, balance due and a bar showing how much is paid. The separate Job Value strip and the Payment Information row are gone, and the invoice card shows only where the invoice stands and its buttons. Anything that was only on the old payment sheet now shows in the Payments card, marked Old sheet. On a wide screen the invoice and Payments cards sit together on the left above the Job Menu. Community and insurance jobs are unchanged.' },
  { b: 1350, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('patched', path)
