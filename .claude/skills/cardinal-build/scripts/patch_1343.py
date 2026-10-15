"""Build 1343 — renaming a document never changes what it is; an uploaded estimate can be corrected.
14 Oct: a signed contract renamed "Linda Lang Exterior Contract" (no leading "Contract") left the Contracts
list and the job's value, because every document kind is read from the FIRST WORD of its title
(isContractTitle, isEstimateTitle, /^invoice/, /^change order/, /^work order/). It looked deleted.
1. db.update keeps the kind: a title edit that drops a contract / estimate / invoice / change order /
   work order prefix gets that prefix back. One chokepoint, every rename path.
2. "Edit estimate" on an UPLOADED estimate (a photo/PDF copy, body[data-cr-upload]) said "No live estimate
   is linked" and stopped. It now asks for the corrected amount and saves it — that total is what the job
   is priced from until a contract is signed."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""      throw new Error('the page is empty, so it was not saved \\u2014 close the document and open it again');
    }""",
"""      throw new Error('the page is empty, so it was not saved \\u2014 close the document and open it again');
    }
    /* 1343: a rename never changes what the document IS (kind is read from the title's first word). */
    if(fields && typeof fields.title === 'string') fields.title = crKeepDocKind(id, fields.title);""")

one("""function crPageIsEmpty(html){""",
"""/* 1343: the kind of a document lives in the first word of its title. A rename that drops it moved a
   signed contract out of Contracts and out of the job's value (14 Oct). Put the prefix back. */
function crKeepDocKind(id, title){
  try{
    var prev = /** @type {any} */ ((cacheRows || []).filter(function(/** @type {any} */ x){ return String(x.id) === String(id); })[0]);
    var was = String((prev && prev.title) || '').trim(), now = String(title || '').trim();
    if(!was || !now) return title;
    var K = /** @type {any} */ ([[/^change order/i, 'Change Order'], [/^work order/i, 'Work Order'], [/^invoice/i, 'Invoice'], [/^contract/i, 'Contract']]);
    for(var i = 0; i < K.length; i++){
      if(K[i][0].test(was) && !K[i][0].test(now)) return K[i][1] + ' \\u2014 ' + now;
    }
    if(typeof isEstimateTitle === 'function' && isEstimateTitle(was) && !isEstimateTitle(now)){
      var num = /^(EST-\\d{4}-\\d+)\\s*\\u2014\\s*/i.exec(was);
      return (num ? num[1] + ' \\u2014 ' : '') + 'Estimate \\u2014 ' + now.replace(/^EST-\\d{4}-\\d+\\s*\\u2014\\s*/i, '');
    }
  }catch(_){}
  return title;
}
function crPageIsEmpty(html){""")

one("""  var pid = cur.project_id;
  if(!pid){
    crTell('This document is not linked to a client, so its estimate cannot be found.');
    return;
  }""",
"""  var pid = cur.project_id;
  if(!pid){
    crTell('This document is not linked to a client, so its estimate cannot be found.');
    return;
  }
  /* 1343: an UPLOADED estimate is a copy of the paper — there is no builder estimate behind it, so the
     only thing to edit is its amount (the job is priced from it until a contract is signed). */
  var _ud = null; try{ _ud = frame && /** @type {any} */ (frame).contentDocument; }catch(_f){}
  if(_ud && _ud.body && _ud.body.hasAttribute('data-cr-upload')){
    var _was = Number(/** @type {any} */ (cur).total) || 0;
    var _ans = window.prompt('This estimate was uploaded as a copy of the paper, so it has no line items to edit.\\n\\nCorrect its amount (what the job is priced from):', _was ? String(_was) : '');
    if(_ans === null) return;
    var _amt = parseFloat(String(_ans).replace(/[^0-9.]/g, ''));
    if(!(_amt > 0)){ crTell('Enter an amount above $0.'); return; }
    try{
      await db.update(cur.id, { total: Math.round(_amt * 100) / 100 });
      /** @type {any} */ (cur).total = Math.round(_amt * 100) / 100;
      try{ if(window.crToastOk) window.crToastOk('Estimate amount saved \\u2014 ' + (typeof fmtMoney === 'function' ? fmtMoney(_amt, true) : '$' + _amt.toFixed(2))); }catch(_t){}
      reload();
    }catch(err){ showError('Could not save the amount: ' + (err.message || err)); }
    return;
  }""")

one(">v2026-10-14 build 1342<button", ">v2026-10-14 build 1343<button")
one("""  { b: 1342, d:'2026-10-14',""",
"""  { b: 1343, d:'2026-10-14', t:'Renaming a contract keeps it a contract', s:'A signed contract that was renamed without the word "Contract" at the start disappeared from the Contracts list and from the job total, so it looked deleted. Renaming any contract, estimate, invoice, change order or work order now keeps what it is. And Edit estimate on an uploaded estimate lets you correct its amount instead of saying no live estimate is linked.' },
  { b: 1342, d:'2026-10-14',""")
pl.write_atomic(path, s)
print('patched', path)
