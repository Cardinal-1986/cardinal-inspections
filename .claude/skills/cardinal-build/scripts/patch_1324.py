"""Build 1324 — the deductible box on every insurance contract (Theo's pick 3A).

An insurance contract now says in writing who pays what, in a box above the signatures:
  INSURANCE & YOUR PART
    Insurance approved (<carrier>)          $RCV           (from the claim)
    Your deductible, payable to Cardinal    $deductible    (from the claim, or typed)
    Upgrades you chose: <what>              $amount        (typed; $0.00 by default)
    Your total out of pocket                deductible + upgrades (worked out)
  Cardinal does not pay, waive or rebate any part of your deductible.  Homeowner initials ____

REQUIRED BEFORE IT LEAVES THE APP. Share link, Text to sign, Email to client and Sign in person
all go through insPartOkToSend() first. On an insurance job's contract:
  - no box yet  -> the box is added with the claim's figures, saved, and the send stops once so
                   the rep checks it (a box nobody has looked at is the old problem in a new place)
  - no deductible typed -> refused, and the box is scrolled into view
  - the claim is marked deductible WAIVED -> refused: the box would print a false sentence
Retail and community contracts, estimates, reports and invoices are waved straight through.
Usage: python3 patch_1324.py [index.html]
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

GUARD = r"""
/* 1324: the deductible box on every insurance contract (Theo's pick 3A), and the rule that
   it is filled before the contract leaves the app. One guard, called by all four ways out:
   Share link, Text to sign, Email to client, Sign in person. Waved through for anything that
   is not a contract on an insurance job. */
function ipMoney(n){ return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
/* A typed blank KEEPS its .ph class in this editor (nothing strips it on input), so a figure
   is read from the TEXT: still "[...]" = not filled. Reading the class would refuse a deductible
   the rep had already typed, forever. */
function ipNum(el){
  if(!el) return null;
  var txt = String(el.textContent || '').trim();
  if(!txt || txt.charAt(0) === '[') return null;
  var raw = txt.replace(/[^0-9.\-]/g, '');
  if(raw === '') return null;
  var v = Number(raw);
  return isNaN(v) ? null : v;
}
function ipBoxHtml(cl){
  var carrier = (cl && cl.carrier) ? esc(cl.carrier) : 'your insurance company';
  var rcv = (cl && Number(cl.approved_rcv) > 0) ? '<span class="fill" data-ip="rcv">' + ipMoney(cl.approved_rcv) + '</span>' : '<span class="ph" data-ip="rcv">[0.00]</span>';
  var ded = (cl && Number(cl.deductible) > 0) ? '<span class="fill" data-ip="ded">' + ipMoney(cl.deductible) + '</span>' : '<span class="ph" data-ip="ded">[0.00]</span>';
  var td = 'padding:6px 4px;border-bottom:1px solid #ddd;vertical-align:top;';
  var ipRow = function(k, v){ return '<tr><td style="' + td + '">' + k + '</td><td style="' + td + 'text-align:right;white-space:nowrap;">' + v + '</td></tr>'; };
  return '<div data-cr-inspart="1" style="border:2px solid #9c1822;border-radius:4px;padding:10px 12px;margin:16px 0;page-break-inside:avoid;break-inside:avoid;">'
    + '<div style="font:800 11pt Arial,sans-serif;letter-spacing:.04em;color:#9c1822;margin:0 0 6px;">INSURANCE &amp; YOUR PART</div>'
    + '<table style="width:100%;border-collapse:collapse;font-size:10.5pt;">'
    + ipRow('Insurance approved (' + carrier + ')', rcv)
    + ipRow('<b>Your deductible</b>, payable to Cardinal', '<b>' + ded + '</b>')
    + ipRow('Upgrades you chose: <span class="ph" data-ip="upgdesc">[none]</span>', '<span class="fill" data-ip="upg">$0.00</span>')
    + ipRow('<b>Your total out of pocket</b>', '<b data-ip="oop">$0.00</b>')
    + '</table>'
    + '<p style="margin:8px 0 0;font-size:10pt;">Cardinal does not pay, waive or rebate any part of your deductible. '
    + 'Homeowner initials: ________</p></div>';
}
function ipRecalc(doc){
  if(!doc) return;
  var box = doc.querySelector('[data-cr-inspart]'); if(!box) return;
  var o = box.querySelector('[data-ip="oop"]'); if(!o) return;
  box.querySelectorAll('[data-ip]').forEach(function(f){
    if(f.classList.contains('ph') && ipNum(f) !== null){ f.classList.remove('ph'); f.classList.add('fill'); }
  });
  var ded = ipNum(box.querySelector('[data-ip="ded"]')), upg = ipNum(box.querySelector('[data-ip="upg"]'));
  o.textContent = ded === null ? '[deductible]' : ipMoney(ded + (upg || 0));
}
function ipShow(box){ try{ box.scrollIntoView({ block:'center' }); }catch(_){} }
async function insPartOkToSend(){
  var t = (/** @type {any} */ (titleInput).value || '').trim();
  if(!isContractTitle(t)) return true;
  var pr = currentDocProject();
  if(!pr) return true;
  var ct = ''; try{ ct = projClaimType(pr); }catch(_){}
  if(ct !== 'insurance') return true;
  var doc = frame && /** @type {any} */ (frame).contentDocument;
  if(!doc || !doc.body) return true;
  var cl = null;
  try{
    if(window.supa){
      var r = await window.supa.from('insurance_claims').select('carrier,approved_rcv,deductible,deductible_waived').eq('project_id', pr.id);
      cl = (r && r.data && r.data[0]) || null;
    }
  }catch(_){}
  if(cl && cl.deductible_waived){
    crTell('This claim is marked deductible WAIVED.\n\nCardinal does not pay, waive or rebate a deductible, and this contract says so above the signatures. Clear the waiver on the claim, then send.');
    return false;
  }
  var box = doc.querySelector('[data-cr-inspart]');
  if(!box){
    var slot = doc.querySelector('[data-sig]');
    var at = (slot && slot.closest('table')) || doc.querySelector('.sign');
    var holder = doc.createElement('div');
    holder.innerHTML = ipBoxHtml(cl);
    box = holder.firstElementChild;
    if(at && at.parentNode) at.parentNode.insertBefore(box, at);
    else (doc.querySelector('.page, .wrap, main') || doc.body).appendChild(box);
    lockTemplate(doc);
    ipRecalc(doc);
    await saveCurrent();
    ipShow(box);
    crTell(ipNum(box.querySelector('[data-ip="ded"]')) === null
      ? 'Insurance contract: the INSURANCE & YOUR PART box is now above the signatures.\n\nType the homeowner’s deductible (and any upgrades they chose), then send again.'
      : 'Insurance contract: the INSURANCE & YOUR PART box is now above the signatures, filled from the claim.\n\nCheck the figures and add any upgrades the homeowner chose, then send again.');
    return false;
  }
  ipRecalc(doc);
  if(ipNum(box.querySelector('[data-ip="ded"]')) === null){
    ipShow(box);
    crTell('Enter the homeowner’s deductible in the INSURANCE & YOUR PART box before this contract goes out.');
    return false;
  }
  return true;
}
"""

one("""async function priceOkToSend(what){""", GUARD.lstrip('\n') + """async function priceOkToSend(what){""")
# keep the worked-out line true on every save, not only at send
one("""  try{ html = serializeFrame(); }""", """  try{ ipRecalc(frame && /** @type {any} */ (frame).contentDocument); }catch(_ip){}   /* 1324 */
  try{ html = serializeFrame(); }""")
# the four ways out
one("""    await saveCurrent();
    var tok = await ensureShareToken();
    var url = shareUrlFor(tok);
    var copied = false;""", """    await saveCurrent();
    if(!await insPartOkToSend()) return;   /* 1324 */
    var tok = await ensureShareToken();
    var url = shareUrlFor(tok);
    var copied = false;""")
one("""      await saveCurrent();
      var proj = currentDocProject();
      var tok = await ensureShareToken();""", """      await saveCurrent();
      if(!await insPartOkToSend()) return;   /* 1324 */
      var proj = currentDocProject();
      var tok = await ensureShareToken();""")
one("""    if(!await priceOkToSend((titleInput.value || '').trim() || 'document')) return;
    /* 1273""", """    if(!await priceOkToSend((titleInput.value || '').trim() || 'document')) return;
    if(!await insPartOkToSend()) return;   /* 1324 */
    /* 1273""")
one("""document.getElementById('sigBtn').addEventListener('click', function(){""",
    """document.getElementById('sigBtn').addEventListener('click', async function(){
  if(!await insPartOkToSend()) return;   /* 1324: the deductible box first, then the pen */""")

# stamp + changelog
one(""">v2026-10-12 build 1323<button""", """>v2026-10-12 build 1324<button""")
CL = "{ b: 1323, d:'2026-10-12',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1324, d:'2026-10-12', t:'Insurance contracts say who pays what', s:'Every contract on an insurance job now carries an INSURANCE & YOUR PART box above the signatures: what the insurance company approved, the homeowner\\u2019s deductible (payable to Cardinal), any upgrades they chose, and their total out of pocket, with the line that Cardinal does not pay, waive or rebate a deductible. It fills itself from the claim. The contract cannot be shared, texted, emailed or signed until the deductible is filled in.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1324 applied')
