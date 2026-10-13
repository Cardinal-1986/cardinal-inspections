"""Build 1330 — one way to make an estimate, and the old form stops sending blanks (Theo's pick C).

Jacob's "wacky" estimate (12 Oct) was the OLD fill-in form behind "+ From a template": twelve
printed lines, one priced, the other eleven going to the client as [LF] / [qty] / [0.00].
The builder ("Blank estimate") is where the Library lives.

B — the six "From a template" choices open the BUILDER with that trade's standard Library line
    already on it (roofing: Owens Corning Preferred). Gutters opens the Library at Gutters (5" vs
    6" is a choice). No match in the Library -> the Library opens. The old form is no longer made.
A — old-form estimates already made: once ANY line is priced, every line without a quantity and
    a price is dropped from what the client gets — the saved page (share link, email) and the
    printout. The editor still shows them. A form with nothing priced keeps every line, so a
    blank can still be printed to fill in by hand (compactForPrint's long-standing rule).
Usage: python3 patch_1330.py [index.html]
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

# ---- A: the marker, defined once in the main block beside compactForPrint ----
one("""function compactForPrint(d){""",
"""/* 1330: an old-form estimate (#estItems) sends only the lines that carry a quantity AND a price,
   once at least one does. Blanks are read from the TEXT ("[...]" or empty = not filled), as
   ipNum() does, because a typed blank keeps its .ph class. Returns how many rows it marked. */
function crEstNum(td){
  if(!td) return null;
  var t = String(td.textContent || '').trim();
  if(!t || t.charAt(0) === '[') return null;
  var v = Number(t.replace(/[^0-9.\\-]/g, ''));
  return isFinite(v) && v > 0 ? v : null;
}
function crMarkUnpriced(root, attr){
  var t = root && root.querySelector && root.querySelector('#estItems');
  if(!t) return 0;
  var rows = t.querySelectorAll('tr.li'), priced = 0, un = [];
  for(var i = 0; i < rows.length; i++){
    rows[i].removeAttribute(attr);
    if(crEstNum(rows[i].querySelector('td.qty')) && crEstNum(rows[i].querySelector('td.rate'))) priced++;
    else un.push(rows[i]);
  }
  if(!priced) return 0;   /* nothing priced: a blank form to print and fill by hand keeps every line */
  un.forEach(function(r){ r.setAttribute(attr, '1'); });
  return un.length;
}
function compactForPrint(d){
  try{ crMarkUnpriced(d, 'data-emptyrow'); }catch(_cu){}   /* 1330: printFix hides [data-emptyrow] */""")

# restorePrintMarks clears the print-only marks again
one("""function restorePrintMarks(d){
  if(!d) return;""",
"""function restorePrintMarks(d){
  if(!d) return;
  try{ d.querySelectorAll('#estItems tr.li[data-emptyrow]').forEach(function(r){ r.removeAttribute('data-emptyrow'); }); }catch(_cu){}   /* 1330 */""")

# the saved page (share link, email) carries the marks and the rule that hides them
one("""  clone.querySelectorAll('[data-cardinal-live]').forEach(function(el){ el.remove(); });""",
"""  clone.querySelectorAll('[data-cardinal-live]').forEach(function(el){ el.remove(); });
  /* 1330: what the client opens drops the unpriced lines of an old-form estimate */
  try{
    var _cu = clone.querySelector('#crUnpricedCss'); if(_cu) _cu.remove();
    if(crMarkUnpriced(clone, 'data-unpriced')){
      var _hd = clone.querySelector('head');
      if(_hd){
        var _st = doc.createElement('style'); _st.id = 'crUnpricedCss';
        _st.textContent = '#estItems tr[data-unpriced]{display:none !important}';
        _hd.appendChild(_st);
      }
    }
  }catch(_cu2){}""")

# the editor shows every line regardless (a live layer, stripped on save)
one("""      if(doc && doc.body && (doc.body.childElementCount || String(doc.body.textContent || '').trim())) frame.dataset.loadedId = String(r.id);""",
"""      if(doc && doc.body && (doc.body.childElementCount || String(doc.body.textContent || '').trim())) frame.dataset.loadedId = String(r.id);
      /* 1330: the saved page hides unpriced old-form lines from the client; the editor shows them */
      try{
        if(doc && doc.getElementById('estItems') && !doc.getElementById('crUnpricedEdit')){
          var _ue = doc.createElement('style'); _ue.id = 'crUnpricedEdit'; _ue.setAttribute('data-cardinal-live', '1');
          _ue.textContent = '#estItems tr[data-unpriced]{display:table-row !important}';
          (doc.head || doc.documentElement).appendChild(_ue);
        }
      }catch(_ue2){}""")

# ---- B: the builder opens with a trade's standard line ----
one("""refreshSavedList : refreshSavedList,""",
"""refreshSavedList : refreshSavedList,
/* 1330: "+ From a template" opens HERE, with the trade's standard Library line on it */
openWithTrade    : openWithTrade,""")

one("""function buildDefaultTitle(project){""",
"""/* 1330: one way to make an estimate. Each "From a template" choice maps to the Library line a
   rep starts that trade with; the rep adds the rest from the Library as usual. A choice the
   Library cannot answer opens the Library itself, at that trade, rather than guessing. */
var TRADE_START = {
  roof:     { cat:'Roofing', name:/owens corning preferred/i },
  siding:   { cat:'Siding',  name:/vinyl siding/i },
  windows:  { cat:'Windows', name:/replacement vinyl windows/i },
  andersen: { cat:'Windows', name:/andersen/i },
  gutters:  { cat:'Gutters', name:null },
  general:  { cat:'Repair',  name:/repair/i }
};
async function openWithTrade(project, kind){
  var t = TRADE_START[kind] || {};
  var L = window.CardinalLineItems;
  try{ if(L && !L.all().length) await L.load(); }catch(_l){}
  var lib = (L && t.name) ? L.all().filter(function(i){ return i.category === t.cat && t.name.test(i.name || ''); })[0] : null;
  openEditor(project, null);
  if(lib){
    state.lines.push({ _lid:newLineId(), library_id:lib.id, name:lib.name, description:lib.description || '',
      qty:1, unit:lib.unit || '', unit_price:Number(lib.default_price) || 0, amount:Number(lib.default_price) || 0 });
    render();
    autosizeDescs();
  }else{
    openPicker('library');
    if(t.cat){ var si = picker && picker.querySelector('.box-search input'); if(si){ si.value = t.cat; pickerQuery = t.cat; renderPicker(); } }
  }
  return !!lib;
}
function buildDefaultTitle(project){""")

one("""  createEstimateOfKind(opt.getAttribute('data-tpl'));""",
"""  /* 1330: the builder, not the old fill-in form (Theo's pick C). The form stays only as a
     fallback for a page whose builder failed to load. */
  var _k = opt.getAttribute('data-tpl');
  if(window.CardinalEstimates && window.CardinalEstimates.openWithTrade) window.CardinalEstimates.openWithTrade(currentProject, _k);
  else createEstimateOfKind(_k);""")

one(""">v2026-10-12 build 1329<button""", """>v2026-10-13 build 1330<button""")
CL = "{ b: 1329, d:'2026-10-12',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1330, d:'2026-10-13', t:'One way to make an estimate', s:'On a job\\u2019s Estimates page, the From a template choices now open the estimate builder with that trade\\u2019s standard line already on it, priced from the Library \\u2014 roofing starts with the Owens Corning Preferred Roofing System. Add the rest from the Library as usual. Estimates made on the old fill-in form no longer send their empty lines: once any line has a price, the lines without one are left off what the client receives and prints. You still see every line while you edit.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1330 applied')
