"""Build 1336 — payment receipts by text AND email (Theo's picks 4C + 4.2B).

- api/receipt.js (new): sendReceipt() texts (Twilio) and emails (Resend) the homeowner on file a receipt —
  amount, method, date, job, and the balance remaining computed by owedOn() (imported from api/pay.js, so a
  receipt can never disagree with the pay link). Carrier checks (source 'insurance') and Community jobs send
  nothing. Each channel is best-effort and the answer says what went and why anything did not.
- api/pay-webhook.js: a NEW online payment (fresh insert only — a redelivered event hits the 409 guard) sends one.
- Record payment (this file): a "Send the homeowner a receipt" tick box, ON by default (4.2B). The collection is
  inserted with .select('id'); when ticked, POST /api/receipt { collection_id } with the rep's session. The toast
  says what happened. A receipt that fails never undoes the recorded payment.
Usage: python3 patch_1336.py [index.html]
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

one("""        '<input type="date" id="crpay-date" class="crpay-in">' +
        '<div class="crpay-foot">' +""",
"""        '<input type="date" id="crpay-date" class="crpay-in">' +
        /* 1336 (4.2B): on by default — the homeowner gets a receipt by text and email */
        '<label class="crpay-rcpt"><input type="checkbox" id="crpay-receipt" checked> Send the homeowner a receipt (text + email)</label>' +
        '<div class="crpay-foot">' +""")

# reset the tick each time the modal opens
one("""    var _sb = q('crpay-save'); if(_sb instanceof HTMLButtonElement){ _sb.disabled = false; _sb.textContent = 'Record payment'; }""",
"""    var _sb = q('crpay-save'); if(_sb instanceof HTMLButtonElement){ _sb.disabled = false; _sb.textContent = 'Record payment'; }
    var _rc = q('crpay-receipt'); if(_rc instanceof HTMLInputElement) _rc.checked = true;   /* 1336 */""")

one("""      return cx.from('collections').insert(row).then(function(r){""",
    """      return cx.from('collections').insert(row).select('id').then(function(r){   /* 1336: the new row's id, for its receipt */""")

one("""    var btn = q('crpay-save'); if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    collectionsInsert(row).then(function(){
      closePayModal();
      crTell('Recorded ' + money(amt) + '. Status updated.');""",
"""    var btn = q('crpay-save'); if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    var _rcpt = q('crpay-receipt'), wantReceipt = !(_rcpt instanceof HTMLInputElement) || _rcpt.checked;   /* 1336 */
    collectionsInsert(row).then(function(r){
      closePayModal();
      crTell('Recorded ' + money(amt) + '. Status updated.' + (wantReceipt ? ' Sending the receipt\\u2026' : ''));
      var _cid = r && r.data && (Array.isArray(r.data) ? (r.data[0] && r.data[0].id) : r.data.id);
      if(wantReceipt && _cid) sendPayReceipt(_cid, amt);""")

# the sender, beside companySms
one("""  /* ---- the offline payment modal (check / cash / bank transfer) ---- */""",
"""  /* 1336 (4C): text + email the homeowner a receipt for a payment just recorded. Never throws into the
     save — the payment is already recorded; this only reports what the receipt did. */
  function sendPayReceipt(collectionId, amt){
    var cx = window.sb || window.supa;
    (cx && cx.auth ? cx.auth.getSession() : Promise.resolve({})).then(function(s){
      var tok = s && s.data && s.data.session ? s.data.session.access_token : '';
      return fetch('/api/receipt', { method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + tok },
        body: JSON.stringify({ collection_id: collectionId }) });
    }).then(function(r){ return r.json().catch(function(){ return {}; }); }).then(function(j){
      var went = [];
      if(j && j.texted) went.push('texted');
      if(j && j.emailed) went.push('emailed');
      var why = (j && j.skipped && j.skipped.length) ? j.skipped.join('; ') : ((j && j.error) || '');
      if(went.length) crTell('Receipt for ' + money(amt) + ' ' + went.join(' and ') + (why ? ' (' + why + ')' : '') + '.');
      else crTell('No receipt sent' + (why ? ': ' + why : '') + '.');
    }).catch(function(){ crTell('The payment is recorded, but the receipt could not be sent.'); });
  }

  /* ---- the offline payment modal (check / cash / bank transfer) ---- */""")

# style for the tick row (inside the modal stylesheet)
one(""".crpay-foot{""", """.crpay-rcpt{display:flex;align-items:center;gap:10px;margin:14px 0 4px;font-size:13px;min-height:44px;cursor:pointer}
.crpay-rcpt input{width:22px;height:22px;margin:0;flex:0 0 auto}
.crpay-foot{""")

one(""">v2026-10-14 build 1335<button""", """>v2026-10-14 build 1336<button""")
CL = "{ b: 1335, d:'2026-10-14',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1336, d:'2026-10-14', t:'Payment receipts by text and email', s:'When a payment is recorded, the homeowner now gets a receipt by text and by email: the amount, how they paid, the date, and the balance left on the job. Record payment has a tick box for it, on by default. Online payments made through the pay link send a receipt automatically. Insurance-company checks and Community jobs do not send one. If the job has no phone or email on file, the message says so.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1336 applied')
