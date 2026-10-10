#!/usr/bin/env python3
"""Build 1275 — Publish catches a line with no name, or a line with no price (Theo, 10 Oct, pick #1).

Jacob's estimate went out with a $5,000 line printed as "Item" — the template
prints the word Item when a line has no name — and the roof write-up on the
next line with no price. Publish now reads the lines first and, if any is
wrong, asks once: "Fix it" (back to the estimate, nothing published) or
"Publish anyway". A clean estimate publishes with no question.

  - a price but no name   → it would print as "Item"
  - words but no price    → its amount prints blank
  - nothing at all        → an empty "Item" row
Priced the same way the document prices it (flat → amount, else qty × unit
price; itemized:false rows count as flat, as buildDocHtml does).

usage: python3 patch_1275.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

src = pl.sub(src, """function pubSet(busy){""", """/* 1275: what would print badly, in words a rep reads. Priced exactly as
   buildDocHtml's rowFor prices a line. */
function estLineProblems(est){
  var lines = (est && Array.isArray(est.line_items)) ? est.line_items : [];
  var out = [];
  lines.forEach(function(l, i){
    if(!l) return;
    var flat = l.flat === true || (est.itemized === false && l.flat == null);
    var amt  = flat ? (Number(l.amount) || 0) : ((Number(l.qty) || 0) * (Number(l.unit_price) || 0));
    var name = String(l.name || '').trim(), words = String(l.description || '').trim();
    var n = 'Line ' + (i + 1);
    var money = (typeof window.fmtMoney === 'function') ? window.fmtMoney(amt) : ('$' + amt.toFixed(2));
    if(!name && !words && !amt) out.push(n + ' is empty \\u2014 it prints as \\u201cItem\\u201d with nothing next to it.');
    else if(!name && amt) out.push(n + ' has a price (' + money + ') but no name \\u2014 it prints as \\u201cItem\\u201d.');
    else if(!amt) out.push(n + ' (\\u201c' + (name || words).slice(0, 40) + '\\u201d) has no price \\u2014 its amount prints blank.');
  });
  return out;
}
function pubSet(busy){""")
src = pl.sub(src, """var docId = await publish(est, projectBefore);""", """/* 1275: a nameless or priceless line is the client's first impression of the
   job. Ask once; "Fix it" publishes nothing. */
var _probs = estLineProblems(est);
if(_probs.length){
  var _ask = (typeof window.crAsk === 'function') ? window.crAsk : function(m){ return Promise.resolve(confirm(m)); };
  var _go = await _ask('Check these lines before the client sees them\\n\\n' + _probs.join(' '), { verb: 'Publish anyway', cancel: 'Fix it', tone: 'plain' });
  if(!_go){ pubSet(false); return; }
}
var docId = await publish(est, projectBefore);""")
src = pl.sub(src, '>v2026-10-09 build 1274<', '>v2026-10-10 build 1275<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1275, d: '2026-10-10', t: 'Publish checks your lines first',
    s: 'Before an estimate is published, the app now looks at every line. A line with a price but no name (it would print as \\u201cItem\\u201d), a line with words but no price, or an empty line \\u2014 it tells you which, and you can <b>Fix it</b> or <b>Publish anyway</b>. A clean estimate publishes with no question.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
