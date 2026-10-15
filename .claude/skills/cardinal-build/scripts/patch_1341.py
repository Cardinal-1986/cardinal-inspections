"""Build 1341 — the five CONFIRMED findings of the 14 Oct end-to-end audit (Theo: "please do an end to end
audit on all buttons, pages, if a page traps you ..."). Report: scratchpad e2e_audit.md.
1. Tools -> Financing Rates opened a blank page every time: hideAllViews() wrote display:none on #cr-fin,
   which is CLASS-shown (.open), so the inline style always won. Now it removes the class (and releases the
   scroll lock it took).
2. Suppliers' x left a blank page: open() runs hideAllViews() (home hidden) and close() only hid itself.
   close() now goes home, the same as Financing Rates' close().
3. On a phone the Tools dropdown ran a third off the right edge. A menu that would leave the screen is
   shifted back on when it opens.
4. The Ask button sat over Save on the client form. It tucks away while that form is open.
5. A phone Back swipe with the client form or the signature pad open changed the screen BEHIND it and left
   the form up. Back now closes the form and stays on the screen (and Esc does too on a desktop)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1 — Financing Rates: the lever must match how it is shown
one("""  var _fin = document.getElementById('cr-fin');
  if(_fin) _fin.style.display = 'none';   /* 1153 finance rates */""",
"""  var _fin = document.getElementById('cr-fin');
  /* 1341 (audit #1): cr-fin is CLASS-shown (#cr-fin.open{display:flex}), not display-shown. Writing
     display:none here made the inline style beat .open forever, so every open() (which calls this
     first) painted a blank page. Remove the class instead, and release the lock its open() took. */
  if(_fin && _fin.classList.contains('open')){
    _fin.classList.remove('open');
    if(document.body.style.overflow === 'hidden') document.body.style.overflow = '';
  }""")

# 2 — Suppliers x goes home
one("""function close(){ if(el) el.style.display = 'none'; }
/* 774: the estimate editor prices line items through these.""",
"""/* 1341 (audit #2): open() runs hideAllViews(), which hides home, so hiding only this view left a blank
   page under the header. Go home, as Financing Rates' close() does. hideAllViews() hides cr-abc by
   display directly and never calls this, so there is no loop. */
function close(){ if(el) el.style.display = 'none'; if(typeof window.showHome === 'function'){ try{ window.showHome(); }catch(_e){} } }
/* 774: the estimate editor prices line items through these.""")

# 3 — a top-bar dropdown never runs off the screen
one("""    var was = dd.classList.contains('open');
    closeMenus();
    if(!was) dd.classList.add('open');""",
"""    var was = dd.classList.contains('open');
    closeMenus();
    if(!was){ dd.classList.add('open'); fitMenu(dd); }""")
one("""function closeMenus(){
  Array.prototype.forEach.call(B.querySelectorAll('.cbdd.open'), function(x){ x.classList.remove('open'); });
}""",
"""function closeMenus(){
  Array.prototype.forEach.call(B.querySelectorAll('.cbdd.open'), function(x){ x.classList.remove('open'); });
}
/* 1341 (audit #3): the menus hang from their tab's left edge, so on a phone Tools ran a third off the
   right side ("AI Estima…", "Financin…"). Measured on open: slide it back on, 8px from the edge. */
function fitMenu(dd){
  var m = dd.querySelector('.cbmenu'); if(!m) return;
  m.style.left = '';
  var r = m.getBoundingClientRect(), vw = document.documentElement.clientWidth || window.innerWidth;
  var over = r.right - (vw - 8);
  if(over > 0) m.style.left = Math.round(-Math.min(over, Math.max(0, r.left - 8))) + 'px';
}""")

# 4 — the Ask button tucks away while the client form is open
one("""#cr-ai-fab:not(.on){display:none;}""",
"""#cr-ai-fab:not(.on){display:none;}
/* 1341 (audit #4): it sat over the client form's Save on a phone */
#cr-ai-fab.tucked{display:none;}""")
one("""  aiPaintFab(); setInterval(aiPaintFab, 3000);""",
"""  aiPaintFab(); setInterval(aiPaintFab, 3000);
  /* 1341 (audit #4): tuck the button while the client form is up. Watches ONE element's style (not the
     body), and writes only on a change. */
  (function(){
    var pm = document.getElementById('projModal'), f = aiQ('cr-ai-fab');
    if(!pm || !f || !window.MutationObserver) return;
    var was = null;
    function fabTuck(){ var up = getComputedStyle(pm).display !== 'none'; if(up !== was){ was = up; f.classList.toggle('tucked', up); } }
    new MutationObserver(fabTuck).observe(pm, { attributes:true, attributeFilter:['style', 'class'] });
    fabTuck();
  })();""")

# 5 — Back (and Esc) closes the open form instead of changing the screen behind it
one("""  window.addEventListener('popstate', function(e){
    if(e.state && e.state.app === 'cardinal-nav'){
      navRestore(e.state);
    }
  });""",
"""  /* 1341 (audit #5): the client form and the signature pad are not in history, so Back changed the
     screen BEHIND them and left them open over the wrong one. Back now closes the open one through its
     own Cancel and steps forward again, so you stay where you were (the forward pop restores it). */
  function crOpenFormCancel(){
    var pairs = [['projModal', 'pfCancel'], ['sigModal', 'sigCancel']];
    for(var i = 0; i < pairs.length; i++){
      var m = document.getElementById(pairs[i][0]);
      if(m && getComputedStyle(m).display !== 'none') return document.getElementById(pairs[i][1]);
    }
    return null;
  }
  window.addEventListener('popstate', function(e){
    var c = crOpenFormCancel();
    if(c){ try{ c.click(); }catch(_e){} try{ history.forward(); }catch(_e2){} return; }
    if(e.state && e.state.app === 'cardinal-nav'){
      navRestore(e.state);
    }
  });
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape' || e.defaultPrevented) return;
    var c = crOpenFormCancel(); if(c){ e.preventDefault(); c.click(); }
  });""")

assert s.count('>v2026-10-14 build 1340<button') == 1
s = s.replace('>v2026-10-14 build 1340<button', '>v2026-10-14 build 1341<button', 1)
one("{ b: 1340, d:'2026-10-14',",
"""{ b: 1341, d:'2026-10-14', t:'Five fixes from the full app check', s:'Tools \\u2192 Financing Rates opens the rates again instead of a blank page. The \\u00d7 on Suppliers takes you home instead of leaving an empty screen. On a phone, the Tools menu stays on the screen. The Ask button steps out of the way while the client form is open, so Save is fully tappable. And swiping Back while the client form or a signature box is open now closes it and keeps you where you were; Esc does the same on a computer.' },
  { b: 1340, d:'2026-10-14',""")
pl.write_atomic(path, s)
print('1341 applied')
