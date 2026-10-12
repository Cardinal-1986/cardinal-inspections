"""Build 1313 — an invoice is a bill, not an estimate (audit M1 + D1, Theo: "yes please
fix invoicing on everything").

The invoice was built by buildEstimate() and kept everything an estimate carries: the
"Client Acceptance" signature line, the property-photo box, Estimate # / Valid Through,
Client Contact twice, the concealed-conditions change-order note, the "This estimate is
valid..." acceptance paragraph and a page title ending "— Estimate". api/share.js sees a
signature line and shows Accept & Sign, so the pay bar was unreachable on every invoice
link. Now:
  1. buildEstimate() gives an INVOICE heading its own header — Bill To, Invoice Date,
     Due: upon receipt, Property Address, Client Contact, Prepared By — and strips the
     photo, the estimate-only notes and the signing block.
  2. api/share.js never treats an invoice as signable (belt and braces for any invoice
     made before this build — there are none in production, measured 11 Oct).
  3. The editor's text button reads "Text pay link" on an invoice and its message says
     "view and pay", not "review and sign".
Usage: python3 patch_1313.py [index.html] [api/share.js]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../')
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html')
SHARE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'api/share.js')
src = pl.load(PATH)

def one(old, new):
    global src
    assert src.count(old) == 1, (old[:80], src.count(old))
    src = src.replace(old, new)

# 1. buildEstimate: the invoice branch, placed just before the 889 work-order branch
A = "  /* 889: a crew WORK ORDER is not an estimate."
one(A, r"""  /* 1313: an INVOICE is a bill, not an estimate. It used to keep the estimate's
     cover photo, Estimate # / Valid Through, a second Client Contact row, the
     concealed-conditions change-order note, the "this estimate is valid" acceptance
     paragraph and the Client Acceptance signature line — and that line made
     api/share.js offer Accept & Sign instead of Pay on every invoice link. */
  if(/\bINVOICE\b/i.test(plain)){
    out = out.replace('<title>Cardinal Roofing &amp; Renovations — Estimate</title>',
                      '<title>Cardinal Roofing &amp; Renovations — Invoice</title>');
    out = out.replace('<div class="cover-photo">PROPERTY PHOTO</div>\n\n', '');
    out = out.replace(/<table class="meta">\s*<tr><td class="k">Prepared For<\/td>[\s\S]*?<\/table>/,
      '<table class="meta">\n' +
      '  <tr><td class="k">Bill To</td><td><span class="ph">[Client name]</span></td>\n' +
      '      <td class="k">Invoice Date</td><td><span class="ph">[Date]</span></td></tr>\n' +
      '  <tr><td class="k">Property Address</td><td><span class="ph">[Street, City, State ZIP]</span></td>\n' +
      '      <td class="k">Due</td><td>Upon receipt</td></tr>\n' +
      '  <tr><td class="k">Client Contact</td><td><span class="ph">[Phone · Email]</span></td>\n' +
      '      <td class="k">Prepared By</td><td><span class="ph">[Rep name &amp; title]</span></td></tr>\n' +
      '</table>');
    out = out.replace(/<[d]iv class="note"><b>Concealed conditions\.<\/b>[\s\S]*?<\/[d]iv>\s*/, '');
    out = out.replace(/<h2 class="sec">Notes<\/h2>\s*<p class="ph">\[Job-specific notes[\s\S]*?<\/p>\s*/, '');
    out = out.replace(/<[d]iv class="note"><b>Acceptance\.<\/b>[\s\S]*?<\/[d]iv>/, '');
    out = out.replace(SIGN_FOOTER, '');
  }
""" + A)

# the invoice body's own Date row now duplicates the header's Invoice Date
one("""    '<td style="padding:4px 0;color:#666;width:110px;">Date</td><td style="font-weight:700;">[INV_DATE]</td></tr>' +""",
    """    '<td></td><td></td></tr>' +""")

# 3. editor text button: label + message on an invoice
one("      wireInvoiceLive(doc, r);   /* 1109: live invoice status/balance/ledger */\n",
    """      wireInvoiceLive(doc, r);   /* 1109: live invoice status/balance/ledger */
      /* 1313: an invoice is paid, not signed — the text button says so */
      (function(){
        var tb = document.getElementById('textSignBtn'); if(!tb) return;
        var inv = /^invoice/i.test(String(r.title || '').trim());
        var bl = tb.querySelector('.bl'); if(bl) bl.textContent = inv ? 'Text pay link' : 'Text to sign';
        tb.title = inv ? 'Text the client a link to view and pay this invoice' : 'Text the client a link to review and sign';
      })();
""")
one("""        ' from Cardinal Roofing & Renovations. You can review and sign it right here: ' + url;""",
    """        ' from Cardinal Roofing & Renovations. ' +
        (/^invoice/i.test(title) ? 'You can view and pay it right here: ' : 'You can review and sign it right here: ') + url;""")

OLD_STAMP = ">v2026-10-11 build 1312<button"
one(OLD_STAMP, ">v2026-10-11 build 1313<button")
one("var CHANGELOG = [", """var CHANGELOG = [
  { b: 1313, d:'2026-10-11', t:'An invoice can be paid', s:'An invoice used to be an estimate with a new title: it still had a signature line, so the link you sent asked the client to Accept & Sign and never showed a Pay button. It also said Estimate #, Valid Through and had an empty photo box. An invoice now has its own header \\u2014 Bill To, Invoice Date, Due upon receipt \\u2014 no signature line, and the link opens with Pay. The text button on an invoice says Text pay link.' },""")
pl.write_atomic(PATH, src)

s = pl.load(SHARE)
old = "    const signable = (SIGN_RX.test(html) || SLOT_RX.test(html)) && !html.includes('data-clientsigned');"
assert s.count(old) == 1
s = s.replace(old, """    // 1313: an invoice is paid, never signed — even one made before invoices lost their
    // signature line. Without this, Accept & Sign took the place of the pay bar.
    const isInvoiceDoc = /^invoice/i.test(String(rows[0].title || '').trim());
    const signable = !isInvoiceDoc && (SIGN_RX.test(html) || SLOT_RX.test(html)) && !html.includes('data-clientsigned');""")
pl.write_atomic(SHARE, s)
print('1313 applied')
