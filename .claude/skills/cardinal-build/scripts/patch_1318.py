"""Build 1318 — the job's invoice card, Theo's pick 2 (compact, with a paid bar), and the
Record payment form (invoicing audit D3, D5–D10, C1–C3; Theo: "2, 1").

The card:
  * one line: the invoice (or "No invoice yet") and the Balance due, big
  * a paid bar and "$5,000 paid of $14,800"
  * ONE red button — the next thing to do: Create invoice → Send → Record payment →
    nothing red once it is paid — and outline buttons for the rest. Send opens three
    choices (Company text, My phone, Email) instead of three buttons always showing.
  * the words are Total · Paid · Balance due, Create invoice · Send · Record payment
  * every button 44px; outline buttons are outlines (Buttons A), not grey slabs
The Balance due figure in the job's money strip is now a tap that jumps to this card. The
card keeps its place in the order (after the Job Menu — Theo's 1225 pick).
Record payment: the amount starts at the balance; Type picks itself (Final once the job is
invoiced or its invoice has gone out, Deposit before); Card is a method; the date is today
in Dayton, not in UTC (after 8 pm it used to record tomorrow); every button 44px.
The Create invoice message no longer points to a Worksheet that is not on screen.
Usage: python3 patch_1318.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
def one(old, new):
    global src
    assert src.count(old) == 1, (old[:100], src.count(old))
    src = src.replace(old, new)

i = src.index("  function jobBlockHtml(pr, fin){")
j = src.index("  /* re-paint whatever invoice surfaces are on screen after the ledger changes */", i)
old_fn = src[i:j]
assert old_fn.count("'<div class=\"crji-card\">'") == 1
src = src[:i] + r"""  /* 1318 (Theo's pick 2): one line, a paid bar, ONE red button — the next thing to do. */
  function jobBlockHtml(pr, fin){
    if(!pr) return '';
    fin = fin || jobFinance(pr);
    var inv = invoiceFor(pr.id);
    var st  = statusFor(pr, inv, fin);
    var canInvoice = Number(fin.value) > 0 && fin.source !== 'estimate';
    var total = Number(fin.value) || 0, paid = Number(fin.paid) || 0, bal = Number(fin.balance) || 0;
    var isPaid = total > 0 && bal <= 0.005;
    var sent = !!(inv && inv.status === 'sent');
    var pid = esc2(pr.id);
    var pct = total > 0 ? Math.max(0, Math.min(100, Math.round(paid / total * 100))) : 0;
    var title = inv ? ('Invoice' + (inv.title && /#[\w-]+/.test(inv.title) ? ' ' + esc2(inv.title.match(/#[\w-]+/)[0]) : '')) : 'No invoice yet';
    var line2 = isPaid ? ('Paid in full' + (inv && inv.sent_at ? '' : ''))
              : sent ? ('Sent ' + ageDays(pr, inv) + (ageDays(pr, inv) === 1 ? ' day' : ' days') + ' ago')
              : inv ? 'Not sent yet'
              : canInvoice ? 'Finished work is ready to bill' : 'An invoice opens once a contract is signed.';
    var B = function(cls, attr, label){ return '<button class="crji-btn' + (cls ? ' ' + cls : '') + '" type="button" ' + attr + '="' + pid + '">' + label + '</button>'; };
    var main = '', more = '';
    if(!inv){
      if(canInvoice) main = B('primary', 'data-inv-gen', IC_DOC + 'Create invoice');
    }else if(isPaid){
      more = B('', 'data-inv-open', 'Open invoice');
    }else if(!sent){
      main = B('primary', 'data-inv-sendmenu', IC_SMS + 'Send');
      more = B('', 'data-inv-pay', IC_CASH + 'Record payment') + B('', 'data-inv-open', 'Open invoice');
    }else{
      main = B('primary', 'data-inv-pay', IC_CASH + 'Record payment');
      more = B('', 'data-inv-sendmenu', IC_SMS + 'Send again') + B('', 'data-inv-open', 'Open invoice');
    }
    if(!inv && canInvoice && paid < total) more = B('', 'data-inv-pay', IC_CASH + 'Record payment');
    var sendRow = inv ? '<div class="crji-sendrow" data-sendrow="' + pid + '" hidden>'
        + B('', 'data-inv-sms', 'Company text') + B('', 'data-inv-text', 'My phone') + B('', 'data-inv-email', IC_MAIL + 'Email')
        + '</div>' : '';
    return '<div class="crji-card v2" role="region" aria-label="Invoice">'
      + '<div class="crji-row"><span class="crji-ttl">' + title + ' ' + pill(st) + '</span>'
      +   '<span class="crji-amt ' + (isPaid ? 'paid' : 'due') + '">' + (isPaid ? 'Paid' : money(bal)) + '</span></div>'
      + '<div class="crji-row crji-sub"><span>' + line2 + '</span><span>' + (isPaid ? '' : 'balance due') + '</span></div>'
      + (total > 0 ? '<div class="crji-bar" role="img" aria-label="' + pct + '% paid"><i style="width:' + pct + '%"></i></div>'
                   + '<div class="crji-sub">' + money(paid) + ' paid of ' + money(total) + '</div>' : '')
      + '<div class="crji-acts">' + main + more + '</div>'
      + sendRow
      + '</div>';
  }

""" + src[j:]

# Send menu + jump from the money strip
one("""    if((t = e.target.closest('[data-inv-gen]'))){""",
"""    /* 1318: Send opens its three ways; the strip's Balance due jumps to this card */
    var _et = e.target instanceof Element ? e.target : null;
    if(_et && (t = _et.closest('[data-inv-sendmenu]'))){ var sr = document.querySelector('[data-sendrow="' + t.getAttribute('data-inv-sendmenu') + '"]'); if(sr instanceof HTMLElement) sr.hidden = !sr.hidden; return; }
    if(_et && (t = _et.closest('[data-crji-jump]'))){ var cj = document.querySelector('#projectView .crji-card'); if(cj && cj.scrollIntoView) cj.scrollIntoView({ behavior:'smooth', block:'center' }); return; }
    if((t = e.target.closest('[data-inv-gen]'))){""")
one("""    '<span style="text-align:right;"><small>Balance Due</small><b class=\"""",
    """    '<span style="text-align:right;cursor:pointer;" data-crji-jump="1" role="button" tabindex="0" title="Go to the invoice"><small>Balance due</small><b class=\"""")

# CSS: the card's new parts; buttons 44px and outline (Buttons A)
one(""".crji-btn{display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:1px solid var(--crji-line,#262a30);background:var(--crji-btn,#1b1f24);color:var(--crji-btn-ink,#e6e9ee);font-size:13px;font-weight:600;padding:9px 12px;border-radius:10px;box-shadow:0 1px 2px var(--crji-sh1,rgba(0,0,0,.45)),0 4px 10px var(--crji-sh1,rgba(0,0,0,.45));}""",
    """.crji-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;border:1px solid var(--crji-btnline,#3a3d46);background:transparent;color:var(--crji-btn-ink,#e6e9ee);font-size:13px;font-weight:600;padding:9px 14px;min-height:44px;border-radius:10px;box-shadow:none;}   /* 1318: outline, 44px (Buttons A) */
.crji-card.v2 .crji-row{display:flex;justify-content:space-between;align-items:center;gap:10px;}
.crji-card.v2 .crji-ttl{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;}
.crji-card.v2 .crji-amt{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;}
.crji-card.v2 .crji-amt.due{color:var(--crji-due,#f08a90);}
.crji-card.v2 .crji-amt.paid{color:var(--crji-pos,#34d399);}
.crji-card.v2 .crji-sub{font-size:13px;color:var(--crji-sub,#a8b0ba);margin-top:2px;}
.crji-card.v2 .crji-bar{height:8px;border-radius:99px;background:var(--crji-tile,#1b1f24);overflow:hidden;margin:12px 0 6px;}
.crji-card.v2 .crji-bar i{display:block;height:100%;background:var(--crji-pos,#34d399);border-radius:99px;}
.crji-card.v2 .crji-acts{margin-top:12px;}
.crji-card.v2 .crji-acts .crji-btn{flex:1 1 auto;}
.crji-card.v2 .crji-sendrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
.crji-card.v2 .crji-sendrow[hidden]{display:none;}
#dbMoneyCard [data-crji-jump]{min-height:44px;display:flex;flex-direction:column;justify-content:center;}
.crji-card.v2 .crji-sendrow .crji-btn{flex:1 1 30%;}""")
one(""".crji-btn.ghost{background:var(--crji-ghost,#1b1f24);color:var(--crji-ghost-ink,#a8b0ba);box-shadow:none;}""",
    """.crji-btn.ghost{background:transparent;color:var(--crji-ghost-ink,#a8b0ba);box-shadow:none;}""")
one("""#cr-pay-modal .crpay-seg button{border:0;background:transparent;color:var(--crpay-sub,#a8b0ba);font-size:13px;font-weight:600;padding:10px 6px;border-radius:9px;cursor:pointer;}""",
    """#cr-pay-modal .crpay-seg button{border:0;background:transparent;color:var(--crpay-sub,#a8b0ba);font-size:13px;font-weight:600;padding:10px 6px;min-height:44px;border-radius:9px;cursor:pointer;}""")
one("""#cr-pay-modal .crpay-in{width:100%;background:var(--crpay-field,#1b1f24);border:1px solid var(--crpay-line,#262a30);border-radius:10px;padding:11px 12px;font-size:15px;color:var(--crpay-ink,#f2f4f7);outline:none;}""",
    """#cr-pay-modal .crpay-in{width:100%;min-height:44px;background:var(--crpay-field,#1b1f24);border:1px solid var(--crpay-line,#262a30);border-radius:10px;padding:11px 12px;font-size:15px;color:var(--crpay-ink,#f2f4f7);outline:none;}""")

# an outline needs a line you can see: its own token pair
one("""  --crji-btn:#1b1f24; --crji-btn-ink:#e6e9ee;
  --crji-ghost:#1b1f24; --crji-ghost-ink:#a8b0ba;""", """  --crji-btn:#1b1f24; --crji-btn-ink:#e6e9ee; --crji-btnline:#3a3d46;
  --crji-ghost:#1b1f24; --crji-ghost-ink:#a8b0ba;""")
one("""  --crji-btn:#FFFFFF; --crji-btn-ink:#0F172A;
  --crji-ghost:#F8FAFC; --crji-ghost-ink:#475569;""", """  --crji-btn:#FFFFFF; --crji-btn-ink:#0F172A; --crji-btnline:#c9cdd3;
  --crji-ghost:#F8FAFC; --crji-ghost-ink:#475569;""")
# Record payment form
one("""        '<div class="crpay-h">Record a payment</div>' +""", """        '<div class="crpay-h">Record payment</div>' +""")
one("""          '<button type="button" data-m="ach">Bank transfer</button>' +""",
    """          '<button type="button" data-m="ach">Bank</button>' +
          '<button type="button" data-m="card">Card</button>' +""")
one("""    q('crpay-sub').textContent = (pr.name || 'Client') + ' · balance ' + money(fin.balance);
    q('crpay-amt').value = ''; q('crpay-ref').value = '';""",
    """    q('crpay-sub').textContent = (pr.name || 'Client') + ' \\u00b7 balance due ' + money(fin.balance);
    /* 1318: start at the balance \\u2014 the common case is "they paid what they owed" */
    q('crpay-amt').value = (Number(fin.balance) > 0) ? (Math.round(Number(fin.balance) * 100) / 100).toFixed(2) : ''; q('crpay-ref').value = '';""")
one("""    setSeg('crpay-method', 'check'); setSeg('crpay-type', 'deposit');
    q('crpay-date').value = new Date().toISOString().slice(0, 10);""",
    """    /* 1318: Final once the job is invoiced or its invoice has gone out; Deposit before */
    var _inv = invoiceFor(pr.id), _s = stg(pr);
    setSeg('crpay-method', 'check');
    setSeg('crpay-type', (_s === 'Invoiced' || _s === 'Closed' || (_inv && _inv.status === 'sent')) ? 'final' : 'deposit');
    /* 1318: today in Dayton \\u2014 toISOString() is UTC, so after 8 pm it recorded tomorrow */
    var _d = new Date(); q('crpay-date').value = _d.getFullYear() + '-' + String(_d.getMonth() + 1).padStart(2, '0') + '-' + String(_d.getDate()).padStart(2, '0');""")
one("""    var notes = 'Offline ' + (method === 'ach' ? 'bank transfer' : method) + (ref ? ' #' + ref : '') + ' (recorded on-site)';""",
    """    var notes = 'Offline ' + (method === 'ach' ? 'bank transfer' : method === 'card' ? 'card' : method) + (ref ? ' #' + ref : '') + ' (recorded on-site)';""")

# Create invoice message
one("""    crTell('Invoice ' + num + ' created from the signed contract and payments logged in the Worksheet. Email it to the client \\u2014 the job moves to INVOICED automatically when sent.');""",
    """    crTell('Invoice ' + num + ' is ready. Send it from the job\\u2019s invoice card or the editor \\u2014 the job moves to Invoiced when it goes out.');   /* 1318 */""")

one(">v2026-10-11 build 1317<button", ">v2026-10-11 build 1318<button")
one("var CHANGELOG = [", """var CHANGELOG = [
  { b: 1318, d:'2026-10-11', t:'The invoice card, simpler', s:'A job\\u2019s invoice card is one line now \\u2014 the invoice and what is still owed \\u2014 with a bar showing how much is paid, and one red button for the next thing to do: Create invoice, then Send, then Record payment. Send offers Company text, My phone or Email. Tapping Balance due at the top of the job jumps to the card. Record payment starts filled in with the balance, picks Final once the job is invoiced, takes Card, and records today\\u2019s date even late at night.' },""")
pl.write_atomic(PATH, src)
print('1318 applied')
