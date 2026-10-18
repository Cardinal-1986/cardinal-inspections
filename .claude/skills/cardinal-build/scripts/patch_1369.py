"""Build 1369 — Activity Count's Money Collected reads the payments (Theo, 18 Oct: "Is this even accurately working?
The money received should be able to be clicked on").
It read ONLY the old Contract Worksheet log (checklist.ws[*].log), which nothing has written since payments moved to
the collections table (721/1314). So it said $0 however much came in.
- Now: the collections rows (cacheCollections, already loaded by reload()) dated in the last 30 days, refunds netted;
  plus the old worksheet log only on a job with no collections at all — jobFinance()'s own rule (721), so one payment
  is never counted twice.
- An admin can tap the tile: it opens Invoices & Payments. A rep sees the same number on a plain tile (AR is admin only).
The other five tiles were checked, not changed: the AccuLynx migration wrote AccuLynx's own milestone dates
(spark/push_acculynx.py), so they count real dates, not the import day."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""    var ws = ck.ws || {};
    Object.keys(ws).forEach(function(k){
      (ws[k].log || []).forEach(function(en){ if(inWin(en.at)) collected += Number(en.a) || 0; });
    });
  });
  function box(lbl, val){
    return '<div class="actbox"><span>' + lbl + '</span><b>' + val + '</b></div>';
  }""",
"""    /* 1369: the old worksheet log counts only on a job with no collections (jobFinance's rule, 721) */
    if(collPaid[p.id] !== undefined) return;
    var ws = ck.ws || {};
    Object.keys(ws).forEach(function(k){
      (ws[k].log || []).forEach(function(en){ if(inWin(en.at)) collected += Number(en.a) || 0; });
    });
  });
  /* 1369: the money is in collections. This read only the log above, which nothing has written since 1314: $0 always. */
  (cacheCollections || []).forEach(function(c){
    if(inWin(c.collected_at || c.created_at)) collected += Number(c.amount) || 0;
  });
  function box(lbl, val){
    return '<div class="actbox"><span>' + lbl + '</span><b>' + val + '</b></div>';
  }
  var adm1369 = false, w1369 = /** @type {any} */ (window); try{ adm1369 = !!(w1369.is_admin && w1369.is_admin()); }catch(_a){}
  function moneyBox(lbl, val){
    if(!adm1369) return box(lbl, val);
    return '<button type="button" class="actbox actgo" data-actmoney title="Open Invoices &amp; Payments"><span>' + lbl + '</span><b>' + val + '</b></button>';
  }""")
one("""    box('Money<br>Collected', '$' + Math.round(collected).toLocaleString('en-US')) +""",
    """    moneyBox('Money<br>Collected', '$' + Math.round(collected).toLocaleString('en-US')) +""")
one("""    box('Jobs<br>Closed', closed);
}""",
    """    box('Jobs<br>Closed', closed);
  if(el.dataset.crMoney !== '1'){   /* #actStrip is static markup: wire it once */
    el.dataset.crMoney = '1';
    el.addEventListener('click', function(e){
      var t = (e.target instanceof Element) ? e.target.closest('[data-actmoney]') : null;
      var w = /** @type {any} */ (window); if(t && typeof w.openAR === 'function') w.openAR();
    });
  }
}""")

one(""":root[data-theme="rb-light"] .actbox b{color:#C25A18;}""",
    """:root[data-theme="rb-light"] .actbox b{color:#C25A18;}
/* 1369: Money Collected is a door to Invoices & Payments (admins) */
button.actbox{width:100%;margin:0;font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;}
button.actbox:active{transform:scale(.97);}
.actbox.actgo b::after{content:" \\203A";font-weight:700;color:#9aa0a8;}
:root[data-theme="rb-light"] .actbox.actgo b::after{color:#5f6670;}""")

one(">v2026-10-18 build 1368<button", ">v2026-10-18 build 1369<button")
one("""  { b: 1368, d:'2026-10-18',""",
"""  { b: 1369, d:'2026-10-18', t:'Money Collected counts your payments', s:'The Money Collected box on the home screen showed $0 because it only read the old worksheet notes, not the payments you record. It now adds up every payment from the last 30 days, with refunds taken off. Tap it to open Invoices & Payments.' },
  { b: 1368, d:'2026-10-18',""")
pl.write_atomic(path, s)
print('ok 1369')
