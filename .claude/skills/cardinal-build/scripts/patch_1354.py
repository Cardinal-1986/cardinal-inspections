"""Build 1354 — the job page, readable and in two real columns (Theo picked B from the preview).
Theo, 3:35 am: "the text is almost non readable. Color issue. Yes please clean messy look." Measured on the
job page at 1700px: ~30 text elements in a dim 13px grey (#a8b0ba / #b8bec6 on navy, 6-10:1 — legal, and still
hard at 40 on a wide monitor at night), counts at 11px, review hints at 5.6:1, the Money In arrow at 2.2:1.
1. Readable (retail job page, every width, dark AND light): secondary text goes bright (#d4dbe4 dark /
   #334155 light) and up a size (13 -> 14-15px, counts 11 -> 13px); the red rule under every heading goes.
2. Option B on a wide screen (1600px+, retail): two real columns — left: invoice + Payments, Money In &
   Commissions, the Job Menu; right: the guide row, Location, Job Details, Assigned To, History, Reviews.
   A CSS grid shares row heights between columns (the 1351/1353 holes and jumps); these are two separate
   stacks, so a card growing in one column cannot move anything in the other. CardinalJobPay.cols() moves
   the cards in after every render and on resize, and puts them back below 1600px so the phone and tablet
   orders are untouched. The Admin row and Convert to Insurance stay direct children (their handlers and
   hide rule use `#acxMount > …`)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

R = 'body:not(.claim-insurance):not(.claim-community) #projectView'
D = ':root:not([data-theme="rb-light"]) ' + R
L = ':root[data-theme="rb-light"] ' + R
css = f"""
/* ═══ Build 1354 · the job page, readable (Theo: "the text is almost non readable") ═══
   Retail only; Insurance and Community paint this page from their own palettes. Bright secondary ink in both
   themes (dark #d4dbe4 = 12.5:1 on the cards, light #334155 = 10.3:1 on white), one size up, no red rules. */
{D} .crji-card, {D} .crjp-card{{ --crji-sub:#d4dbe4; }}
{L} .crji-card, {L} .crjp-card{{ --crji-sub:#334155; }}
{R} .crjp-card .crjp-seg button{{ font-size:14px; }}
{R} .crjp-card .crjp-seg button small{{ font-size:12px; }}
{R} .crjp-card .crjp-what small, {R} .crjp-card .crjp-note, {R} .crjp-card .crjp-empty, {R} .crjp-card .crjp-key,
{R} .crji-card.v2 .crji-sub{{ font-size:14px; }}
{D} .rvhint, {D} .rvstatus.none, {D} .dbg-t, {D} .axnote, {D} #projName a.hem, {D} #projMeta .mlbl, {D} #acxMount .acxbody small{{
  --cr-stack:"1354 bright secondary ink on the job page (Theo could not read it)"; color:#d4dbe4; }}
{L} .rvhint, {L} .rvstatus.none, {L} .dbg-t, {L} .axnote, {L} #projName a.hem, {L} #projMeta .mlbl, {L} #acxMount .acxbody small{{
  --cr-stack:"1354 the light twin"; color:#334155; }}
{R} .rvhint, {R} .dbg-t, {R} .axnote{{ --cr-stack:"1354 one size up"; font-size:14px; }}
{R} #projMeta .mlbl{{ --cr-stack:"1354 one size up"; font-size:12px; }}
{R} .jan, {R} #kpHis .kpcnt{{ --cr-stack:"1354 counts were 11px"; font-size:13px; }}
{D} .dbgo, {D} #kpHis .kpcar{{ --cr-stack:"1354 the row arrows were 2.2:1"; color:#c3cbd5; }}
{L} .dbgo, {L} #kpHis .kpcar{{ --cr-stack:"1354 the light twin"; color:#475569; }}
{R} .projsec{{ --cr-stack:"1354 no red rule under every heading (Theo picked the clean look)"; border-bottom-color:transparent; }}
/* ═══ Build 1354 · option B on a wide screen: two real columns ═══ */
.acx-cols{{ display:none; }}
@media (min-width:1600px){{
  {R} #acxMount > .acx-cols{{ display:grid; grid-column:1 / -1; grid-template-columns:minmax(0,1fr) minmax(0,1fr); column-gap:34px; align-items:start; }}
  {R} #acxMount > .acx-cols > .acx-colL, {R} #acxMount > .acx-cols > .acx-colR{{ display:flex; flex-direction:column; min-width:0; }}
  {R} #acxMount > .cr-admin-tog, {R} #acxMount > #dbConvertIns{{ grid-column:1 / -1; }}
}}
"""
one(""".crjp-card .crjp-err{font-size:13px;color:var(--crji-due,#f08a90);}
""", """.crjp-card .crjp-err{font-size:13px;color:var(--crji-due,#f08a90);}
""" + css)
# the stack's own margin rule was written for a direct child of #acxMount
one("#projectView #acxMount > .crji-stack > .crji-card{margin:12px 0 4px;}",
    "#projectView #acxMount .crji-stack > .crji-card{margin:12px 0 4px;}")

one("""  window.CardinalJobPay = Object.assign(window.CardinalJobPay || {}, {
    html: html, refresh:""",
"""  /* 1354: option B on a wide screen. Two real stacks instead of a shared-row grid, so a card growing in one
     column can never move a card in the other. Below 1600px (or off retail) everything goes back exactly
     where it was, in its original order, so the phone and tablet orders never see this. */
  var LEFT = ['.crji-stack', '#dbMoneyRow', '.ja-menu'];
  var STAY = ['.dbstage', '.cr-admin-tog', '#dbConvertIns'];
  function matchesAny(el, list){ for(var i = 0; i < list.length; i++){ try{ if(el.matches(list[i])) return true; }catch(_){} } return false; }
  function cols(){
    var mount = document.getElementById('acxMount');
    if(!mount) return;
    var b = document.body;
    var retail = !(b.classList.contains('claim-insurance') || b.classList.contains('claim-community'));
    var wide = !!(window.matchMedia && window.matchMedia('(min-width:1600px)').matches);
    var box = mount.querySelector(':scope > .acx-cols');
    if(!(retail && wide)){
      if(!box) return;
      var moved = [].slice.call(box.querySelectorAll(':scope > .acx-colL > *, :scope > .acx-colR > *'));
      moved.sort(function(a, c){ return (+a.getAttribute('data-acx-i')) - (+c.getAttribute('data-acx-i')); });
      moved.forEach(function(el){ mount.insertBefore(el, box); });
      box.remove();
      return;
    }
    var kids = [].slice.call(mount.children).filter(function(el){ return el !== box && !matchesAny(el, STAY); });
    if(!kids.length) return;
    if(!box){
      box = document.createElement('div');
      box.className = 'acx-cols';
      box.innerHTML = '<div class="acx-colL"></div><div class="acx-colR"></div>';
      var stage = mount.querySelector(':scope > .dbstage');
      mount.insertBefore(box, stage ? stage.nextSibling : mount.firstChild);
    }
    var all = [].slice.call(mount.children);
    var colL = box.firstChild, colR = box.lastChild;
    /* keep the page's own card order (the CSS `order` 1225/1227 set), not the raw markup order, which puts
       History before Job Details. Read it while the cards are still direct children, where those rules apply. */
    var ord = function(el){ var o = parseInt(getComputedStyle(el).order, 10); return isFinite(o) ? o : 0; };
    kids.forEach(function(el){ el.setAttribute('data-acx-i', String(all.indexOf(el))); el.__acxOrd = ord(el); });
    kids.sort(function(a, c){ return (a.__acxOrd - c.__acxOrd) || ((+a.getAttribute('data-acx-i')) - (+c.getAttribute('data-acx-i'))); });
    kids.forEach(function(el){ (matchesAny(el, LEFT) ? colL : colR).appendChild(el); });
  }

  window.CardinalJobPay = Object.assign(window.CardinalJobPay || {}, {
    cols: cols,
    html: html, refresh:""")

one("""  function run(){ try{ build(); tagOrder(); syncMoneyCard(); }catch(_e){} }""",
"""  function run(){ try{ build(); tagOrder(); syncMoneyCard(); }catch(_e){}
    /* 1354: option B's two columns, after the tagger has done its `:scope >` work */
    try{ if(window.CardinalJobPay && window.CardinalJobPay.cols) window.CardinalJobPay.cols(); }catch(_e){} }""")
one("""    moneyRz = setTimeout(function(){ try{ syncMoneyCard(); }catch(_e){} }, 150);""",
"""    moneyRz = setTimeout(function(){ try{ syncMoneyCard(); }catch(_e){}
      try{ if(window.CardinalJobPay && window.CardinalJobPay.cols) window.CardinalJobPay.cols(); }catch(_e){} }, 150);""")

one(">v2026-10-16 build 1353<button", ">v2026-10-16 build 1354<button")
one("""  { b: 1353, d:'2026-10-16',""",
"""  { b: 1354, d:'2026-10-16', t:'A job page you can read', s:'The grey labels, notes and counts on a job page are brighter and one size bigger, in dark and light mode, and the red lines under every heading are gone. On a wide screen the page is two columns that never push each other around: the money and the Job Menu on the left, the house (location, job details, who is assigned, history, reviews) on the right.' },
  { b: 1353, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('patched', path)
