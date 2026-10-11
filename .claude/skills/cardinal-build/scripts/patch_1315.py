"""Build 1315 — every send counts as sent; stages only move forward; no double invoices
(invoicing audit W1, W2, W4, W5, W6).

  1. Company SMS, My phone, Email and the A/R list's Text / Email all mark the invoice
     sent (status + sent_at) and move the job to Invoiced, the way the editor's Email to
     client always did. Before, only the editor's Email and Mark sent counted, so an
     invoice texted from the job card stayed Draft: no aging date, never reminded, not on
     the home A/R card. (Copy link does not count — copying is not sending.)
  2. Sending never moves a job BACKWARDS. A job already Invoiced, Closed or Lost stays put.
     Before, re-sending an invoice could pull a Closed job back to Invoiced.
  3. Create invoice: a second tap while the first is still working does nothing (it used to
     make two invoices with the same number); a job paid in full says so instead of making
     a $0 invoice; a job that already has an invoice asks first. A failed pay-link setup
     says so instead of failing silently.
  4. The offline payment form's button resets every time it opens — after one payment the
     next could not be saved without reloading the app.
Usage: python3 patch_1315.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
def one(old, new, n=1):
    global src
    assert src.count(old) == n, (old[:90], src.count(old))
    src = src.replace(old, new)

# ---- cr-ar-script: linkFor(pid, send) + markInvoiceSent ----
one("""  function linkFor(pid){
    var inv = invoiceFor(pid);
    if(!inv) return Promise.reject(new Error('This job has no invoice yet — create one first.'));
    return ensureTokenForRow(inv).then(payUrl);
  }""", """  function linkFor(pid, send){
    var inv = invoiceFor(pid);
    if(!inv) return Promise.reject(new Error('This job has no invoice yet — create one first.'));
    return ensureTokenForRow(inv).then(function(tok){ if(send) markInvoiceSent(pid, inv); return payUrl(tok); });
  }
  /* 1315: sending is sending, whichever button did it. Before, only the editor's Email to
     client and Mark sent wrote status:'sent' and moved the stage, so an invoice texted from
     here stayed Draft — no aging date, never reminded (remind.js reads status=sent), not
     on the home A/R card (Invoiced only). Forward-only: a job already Invoiced, Closed or
     Lost is never pulled back by a re-send. */
  function stageBeforeInvoiced(s){ return ['Invoiced', 'Closed', 'Lost'].indexOf(s) === -1; }
  function markInvoiceSent(pid, inv){
    inv = inv || invoiceFor(pid);
    if(!inv) return Promise.resolve(false);
    var now = new Date().toISOString();
    var w = (inv.status === 'sent' && inv.sent_at) ? Promise.resolve()
      : db.update(inv.id, { status: 'sent', sent_at: inv.sent_at || now }).then(function(){
          inv.status = 'sent'; inv.sent_at = inv.sent_at || now; });
    return w.then(function(){
      var pr = prById(pid);
      if(pr && stageBeforeInvoiced(stg(pr)) && typeof setStage === 'function') return setStage(pid, 'Invoiced');
    }).then(function(){ return true; }).catch(function(err){
      fail(new Error('The link went out, but the invoice could not be marked sent: ' + ((err && err.message) || err)));
      return false;
    });
  }""")
one("""      linkFor(t.getAttribute('data-artext')).then(function(url){""",
    """      linkFor(t.getAttribute('data-artext'), true).then(function(url){""")
one("""      linkFor(t.getAttribute('data-aremail')).then(function(url){""",
    """      linkFor(t.getAttribute('data-aremail'), true).then(function(url){""")
one("""if(px) linkFor(px.id).then(function(url){ location.href = 'sms:?&body='""",
    """if(px) linkFor(px.id, true).then(function(url){ location.href = 'sms:?&body='""")
one("""if(pe) linkFor(pe.id).then(function(url){ location.href = 'mailto:?subject='""",
    """if(pe) linkFor(pe.id, true).then(function(url){ location.href = 'mailto:?subject='""")
one("""        if(j && j.ok) crTell('Texted the pay link to ' + (pr.name || 'the client') + '.');""",
    """        if(j && j.ok){ crTell('Texted the pay link to ' + (pr.name || 'the client') + '.'); markInvoiceSent(pr.id); }   /* 1315 */""")
one("""    status:statusOf, jobBlock:jobBlockHtml, recordPayment:openPayModal, payLink:linkFor
  });""", """    status:statusOf, jobBlock:jobBlockHtml, recordPayment:openPayModal, payLink:linkFor,
    markInvoiceSent:markInvoiceSent   /* 1315 */
  });""")
# pay modal reset
one("""    q('crpay-amt').value = ''; q('crpay-ref').value = '';
    setSeg('crpay-method', 'check'); setSeg('crpay-type', 'deposit');""",
    """    q('crpay-amt').value = ''; q('crpay-ref').value = '';
    /* 1315: the modal is reused, and a successful save left this button disabled and
       reading "Saving…" — the next payment could not be recorded until a reload. */
    var _sb = q('crpay-save'); if(_sb instanceof HTMLButtonElement){ _sb.disabled = false; _sb.textContent = 'Record payment'; }
    setSeg('crpay-method', 'check'); setSeg('crpay-type', 'deposit');""")

# ---- editor: forward-only on Email to client and Mark sent; Text pay link counts ----
one("""    if(pr && row && /^invoice/i.test((row.title || '').trim()) && normStage(pr.stage) !== 'Invoiced'){""",
    """    /* 1315: forward-only — a re-send never pulls a Closed (or Lost) job back to Invoiced */
    if(pr && row && /^invoice/i.test((row.title || '').trim()) && ['Invoiced', 'Closed', 'Lost'].indexOf(normStage(pr.stage)) === -1){""")
one("""      if(trow && trow.project_id && /^invoice/i.test((trow.title || '').trim())){
        try{ await setStage(trow.project_id, 'Invoiced'); }catch(e){}""",
    """      var tpr = trow && cacheProjects.find(function(p){ return p.id === trow.project_id; });
      /* 1315: forward-only, the same rule as Email to client */
      if(trow && trow.project_id && /^invoice/i.test((trow.title || '').trim()) &&
         (!tpr || ['Invoiced', 'Closed', 'Lost'].indexOf(normStage(tpr.stage)) === -1)){
        try{ await setStage(trow.project_id, 'Invoiced'); }catch(e){}""")
one("""      var tel = (proj && proj.phone) ? String(proj.phone).replace(/[^+\\d]/g, '') : '';
      if(tel){
        location.href = 'sms:' + tel + '?&body=' + encodeURIComponent(body);""",
    """      var tel = (proj && proj.phone) ? String(proj.phone).replace(/[^+\\d]/g, '') : '';
      /* 1315: texting an invoice's pay link is sending it */
      if(tel && proj && /^invoice/i.test(title) && window.CardinalAR && CardinalAR.markInvoiceSent){ try{ CardinalAR.markInvoiceSent(proj.id); }catch(_){} }
      if(tel){
        location.href = 'sms:' + tel + '?&body=' + encodeURIComponent(body);""")

# ---- createInvoiceFor: busy guard, paid-in-full, existing invoice, token failure ----
one("""async function createInvoiceFor(pr){
  var fin = jobFinance(pr);
  if(!fin.value || fin.source === 'estimate'){ crTell('Create an invoice after a contract is signed \\u2014 the totals come from the signed contract.'); return; }
  var invCount = cacheRows.filter(function(r){
    return r.project_id === pr.id && /^invoice/i.test((r.title || '').trim());
  }).length;""", """var __invBusy = false;   /* 1315: one Create invoice at a time */
async function createInvoiceFor(pr){
  if(__invBusy) return;
  __invBusy = true;
  try{ await createInvoiceFor1315(pr); } finally { __invBusy = false; }
}
async function createInvoiceFor1315(pr){
  var fin = jobFinance(pr);
  if(!fin.value || fin.source === 'estimate'){ crTell('Create an invoice after a contract is signed \\u2014 the totals come from the signed contract.'); return; }
  /* 1315: a paid job has nothing to bill, and a second invoice should be on purpose */
  if(!(fin.balance > 0.005)){ crTell('This job is paid in full \\u2014 there is nothing to invoice.'); return; }
  var invCount = cacheRows.filter(function(r){
    return r.project_id === pr.id && /^invoice/i.test((r.title || '').trim());
  }).length;
  if(invCount > 0 && !await crAsk('This job already has ' + (invCount === 1 ? 'an invoice' : invCount + ' invoices') +
      '. Make another one for the ' + fmtMoney(fin.balance, true) + ' still owed?')) return;""")
one("""      await db.update(id, { share_token: _itok, total: fin.value });
    }catch(_it){}""", """      await db.update(id, { share_token: _itok, total: fin.value });
    }catch(_it){
      /* 1315: say so — every Send button makes the link again, but the reminder texts skip an invoice without one */
      try{ crTell('Invoice saved, but its pay link could not be set up yet \\u2014 it will be made when you send it.'); }catch(_){}
    }""")

one(">v2026-10-11 build 1314<button", ">v2026-10-11 build 1315<button")
one("var CHANGELOG = [", """var CHANGELOG = [
  { b: 1315, d:'2026-10-11', t:'Every send counts as sent', s:'Texting or emailing an invoice from the job card or the Invoices list now marks it sent and moves the job to Invoiced \\u2014 before, only the editor\\u2019s Email button did, so a texted invoice stayed Draft and was never reminded. Sending never moves a job backwards: a Closed job stays Closed. Create invoice can\\u2019t make two by a double tap, says so when the job is paid in full, and asks before making a second one. The payment form works for a second payment without reloading.' },""")
pl.write_atomic(PATH, src)
print('1315 applied')
