"""Build 1388 — three findings from the 22 Oct estimate-to-payment run (Theo: "All 3").
1. Download named every PDF "Cardinal document": #dlBtn read #docTitle and window.currentDoc, neither of
   which exists. The editor's title field is #reportTitle (titleInput). Now it reads that.
2. The payment box opened as Type = Deposit with Amount = the whole balance — one tap recorded the
   full contract as a deposit. When it opens as a deposit and nothing has been paid yet, Amount is now
   the job's deposit: the estimate's deposit_amount, else its deposit_pct, else DEPOSIT_PCT_DEFAULT,
   of the job value. Tapping Final puts the balance back; tapping Deposit puts the deposit back — only
   while the amount is still the one the box filled in, never over a typed number.
3. "→ Contract" said "The 3-Day Notice is included." The generic contract it makes carries no Notice
   of Cancellation, so the line was false. It now says to use the trade agreement for a home-solicitation
   sale. (The template choice itself is build 1389.)"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""  var t = (document.getElementById('docTitle') && document.getElementById('docTitle').value) ||
          (window.currentDoc && window.currentDoc.title) || 'Cardinal document';""",
"""  /* 1388: #docTitle and window.currentDoc never existed, so every PDF was "Cardinal document".
     The editor's title is #reportTitle (titleInput). */
  var _ti = /** @type {any} */ (titleInput);
  var t = (_ti && String(_ti.value || '').trim()) || 'Cardinal document';""")

one("""    setSeg('crpay-type', (_s === 'Invoiced' || _s === 'Closed' || (_inv && _inv.status === 'sent')) ? 'final' : 'deposit');""",
"""    setSeg('crpay-type', (_s === 'Invoiced' || _s === 'Closed' || (_inv && _inv.status === 'sent')) ? 'final' : 'deposit');
    /* 1388: a deposit is not the whole balance. Opened as a deposit with nothing paid yet, the box
       fills in the job's deposit instead (estimate deposit_amount > deposit_pct > the house rate). */
    _payAuto = { bal: /** @type {any} */ (q('crpay-amt')).value, dep: null, pid: String(pr.id) };
    if(q('crpay-type').getAttribute('data-v') === 'deposit' && !(Number(fin.paid) > 0) && Number(fin.value) > 0) payDeposit(pr, fin);""")

one("""  function closePayModal(){ var m = q('cr-pay-modal'); if(m) m.classList.remove('open'); _payFor = null; }""",
"""  /* 1388: what the box itself filled in, so a tap on Deposit / Final can swap it — never a typed amount */
  var _payAuto = null;
  async function payDeposit(pr, fin){
    var W = /** @type {any} */ (window);
    var pid = String(pr.id), value = Number(fin.value) || 0, pct = Number(W.DEPOSIT_PCT_DEFAULT) || 30, down = null;
    try{
      var rows = (W.CardinalEstimates && typeof W.CardinalEstimates.loadForProject === 'function')
        ? await W.CardinalEstimates.loadForProject(pr.id) : [];
      var depRank = function(e){ var st = String((e && e.status) || '').toLowerCase();
        return /accept|sign|approv|won/.test(st) ? 2 : (/sent|publish/.test(st) ? 1 : 0); };
      var best = /** @type {any} */ (null);
      (rows || []).forEach(function(e){
        if(!e || (e.deposit_pct == null && !(Number(e.deposit_amount) > 0))) return;
        if(!best || depRank(e) > depRank(best)) best = e;
      });
      if(best){
        if(best.deposit_pct != null) pct = Math.max(0, Math.min(100, Number(best.deposit_pct) || 0));
        if(Number(best.deposit_amount) > 0) down = Number(best.deposit_amount);
      }
    }catch(_e){}
    if(down === null) down = value * pct / 100;
    down = Math.min(down, Number(fin.balance) || down);
    if(!(down > 0) || !_payAuto || _payAuto.pid !== pid || _payFor !== pr) return;
    var amt = q('crpay-amt');
    if(!(amt instanceof HTMLInputElement) || amt.value !== _payAuto.bal) return;   /* they already typed */
    _payAuto.dep = (Math.round(down * 100) / 100).toFixed(2);
    if(q('crpay-type').getAttribute('data-v') === 'deposit') amt.value = _payAuto.dep;
  }
  function closePayModal(){ var m = q('cr-pay-modal'); if(m) m.classList.remove('open'); _payFor = null; _payAuto = null; }""")

one("""    if((t = e.target.closest('#crpay-type [data-t]'))){ setSeg('crpay-type', t.getAttribute('data-t')); return; }""",
"""    if((t = e.target.closest('#crpay-type [data-t]'))){
      setSeg('crpay-type', t.getAttribute('data-t'));
      /* 1388: swap between the deposit and the balance — only an amount the box filled in itself */
      var _a = q('crpay-amt');
      if(_payAuto && _a instanceof HTMLInputElement && (_a.value === _payAuto.bal || _a.value === _payAuto.dep)){
        var _v = t.getAttribute('data-t') === 'deposit' ? _payAuto.dep : _payAuto.bal;
        if(_v) _a.value = _v;
      }
      return;
    }""")

one("""'client sign \\u2014 in person or by share link. The 3-Day Notice is included.');""",
"""'client sign \\u2014 in person or by share link.\\n\\n' +
'This is the general Service Contract and it does not carry the Notice of Cancellation. ' +
'For a sale made at the home, use the Roofing, Siding or Gutter Construction Agreement.');""")

one(">v2026-10-22 build 1387<", ">v2026-10-22 build 1388<")
one("""  { b: 1387, d:'2026-10-22',""",
"""  { b: 1388, d:'2026-10-22', t:'Deposit amount, PDF names, contract note', s:'Recording a deposit now starts at the job\\u2019s deposit (from its estimate) instead of the whole balance; tap Final to switch to the balance. A PDF saved with Download is named after the document instead of \\u201cCardinal document\\u201d. And making a contract from an estimate no longer says the 3-Day Notice is included \\u2014 that general contract does not carry it.' },
  { b: 1387, d:'2026-10-22',""")
pl.write_atomic(path, s)
print('ok 1388')
