"""Build 1394 — Record payment says who paid (23 Oct 2026; Theo: "fix it … at your discretion").
savePayModal() hard-coded source:'homeowner'. Since 1378 that tag decides whose money it is, so a
carrier check recorded from the job page marked the homeowner's part paid, left the Claims hub's
carrier-owed too high, and texted the homeowner "Payment received" for the carrier's money.
On an insurance job the modal now asks Paid by: Insurance / Homeowner, and opens on Insurance at the
balance (no deposit pre-fill — 1388's deposit is the homeowner's, not the carrier's). On a Community job:
Partner / Homeowner, opening on Partner. The receipt is offered only when the homeowner paid.
Retail is unchanged (no question, homeowner). Also: the Method row's four buttons sat in a 3-column grid,
leaving Card alone on a second row."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""        '<input type="text" id="crpay-ref" class="crpay-in" placeholder="Check # (optional)">' +""",
"""        '<input type="text" id="crpay-ref" class="crpay-in" placeholder="Check # (optional)">' +
        /* 1394: whose money — shown on insurance and Community jobs only */
        '<div id="crpay-paywrap" hidden><label class="crpay-l">Paid by</label>' +
        '<div class="crpay-seg crpay-seg2" id="crpay-payer" data-v="homeowner">' +
          '<button type="button" data-p="insurance">Insurance</button>' +
          '<button type="button" data-p="homeowner" class="on">Homeowner</button>' +
        '</div></div>' +""")
one("""      b.classList.toggle('on', b.getAttribute('data-m') === v || b.getAttribute('data-t') === v);""",
"""      b.classList.toggle('on', b.getAttribute('data-m') === v || b.getAttribute('data-t') === v || b.getAttribute('data-p') === v);""")
one("""    _payAuto = { bal: /** @type {any} */ (q('crpay-amt')).value, dep: null, pid: String(pr.id) };
    if(q('crpay-type').getAttribute('data-v') === 'deposit' && !(Number(fin.paid) > 0) && Number(fin.value) > 0) payDeposit(pr, fin);""",
"""    _payAuto = { bal: /** @type {any} */ (q('crpay-amt')).value, dep: null, pid: String(pr.id) };
    /* 1394: on an insurance or Community job, ask who paid; it opens on the carrier / the partner */
    var _ct = (typeof projClaimType === 'function') ? projClaimType(pr) : 'retail';
    var _pw = q('crpay-paywrap'), _other = _ct === 'insurance' ? 'insurance' : _ct === 'community' ? 'partner' : null;
    if(_pw){
      _pw.hidden = !_other;
      var _ob = _pw.querySelector('[data-p]:not([data-p="homeowner"])');
      if(_ob && _other){ _ob.setAttribute('data-p', _other); _ob.textContent = _other === 'insurance' ? 'Insurance' : 'Partner'; }
    }
    setSeg('crpay-payer', _other || 'homeowner');
    payerReceipt();
    if(!_other && q('crpay-type').getAttribute('data-v') === 'deposit' && !(Number(fin.paid) > 0) && Number(fin.value) > 0) payDeposit(pr, fin);""")
one("""  function closePayModal(){ var m = q('cr-pay-modal');""",
"""  /* 1394: a receipt is the homeowner's; the carrier and the partner get none */
  function payerReceipt(){
    var who = (q('crpay-payer') && q('crpay-payer').getAttribute('data-v')) || 'homeowner';
    var rc = q('crpay-receipt'), lb = rc && rc.closest ? rc.closest('label') : null;
    if(rc instanceof HTMLInputElement) rc.checked = who === 'homeowner';
    if(lb instanceof HTMLElement) lb.style.display = who === 'homeowner' ? '' : 'none';   /* .crpay-rcpt is display:flex, which beats [hidden] */
  }
  function closePayModal(){ var m = q('cr-pay-modal');""")
one("""                type: typeMap[ptype] || 'other', source: 'homeowner', method: method,""",
"""                type: typeMap[ptype] || 'other', source: payer, method: method,""")
one("""    var typeMap = { deposit:'deposit', progress:'other', final:'final' };
    var me = (window.currentUser && currentUser.email) || '';""",
"""    var typeMap = { deposit:'deposit', progress:'other', final:'final' };
    var payer = (q('crpay-paywrap') && !q('crpay-paywrap').hidden && q('crpay-payer').getAttribute('data-v')) || 'homeowner';   /* 1394 */
    var me = (window.currentUser && currentUser.email) || '';""")
one("""    var _rcpt = q('crpay-receipt'), wantReceipt = !(_rcpt instanceof HTMLInputElement) || _rcpt.checked;   /* 1336 */""",
"""    var _rcpt = q('crpay-receipt'), wantReceipt = payer === 'homeowner' && (!(_rcpt instanceof HTMLInputElement) || _rcpt.checked);   /* 1336; 1394 */""")
one("""    if((t = e.target.closest('#crpay-method [data-m]'))){ setSeg('crpay-method', t.getAttribute('data-m')); return; }""",
"""    if((t = e.target.closest('#crpay-method [data-m]'))){ setSeg('crpay-method', t.getAttribute('data-m')); return; }
    if((t = e.target.closest('#crpay-payer [data-p]'))){ setSeg('crpay-payer', t.getAttribute('data-p')); payerReceipt(); return; }   /* 1394 */""")
one("""#cr-pay-modal .crpay-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:var(--crpay-well,#1b1f24);border-radius:12px;padding:4px;}""",
"""#cr-pay-modal .crpay-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:var(--crpay-well,#1b1f24);border-radius:12px;padding:4px;}
#cr-pay-modal #crpay-method{grid-template-columns:repeat(4,1fr);}   /* 1394: four methods, one row — Card sat alone */
#cr-pay-modal .crpay-seg2{grid-template-columns:repeat(2,1fr);}""")

one(">v2026-10-23 build 1393<", ">v2026-10-23 build 1394<")
one("""  { b: 1393, d:'2026-10-23',""",
"""  { b: 1394, d:'2026-10-23', t:'Record payment asks who paid', s:'On an insurance job, Record payment now asks whether the insurance company or the homeowner paid, and starts on Insurance. A carrier check no longer counts as the homeowner\\u2019s money or texts the homeowner a receipt for it. On a Community job it asks Partner or Homeowner. Retail jobs are unchanged. The four payment methods fit on one row.' },
  { b: 1393, d:'2026-10-23',""")
pl.write_atomic(path, s)
print('ok 1394')
