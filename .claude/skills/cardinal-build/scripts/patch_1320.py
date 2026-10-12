"""Build 1320 — the invoice says ONE balance, and it is always the live one (invoicing
audit D2 / W3; Theo: "merge when good then next").

Before: the client's invoice page showed the pay bar's LIVE amount next to a SUMMARY
frozen on the day the invoice was made — after a $5,000 check, "Pay $9,800" sat above
"BALANCE DUE $14,800". In the editor a second "Current Balance Due" card sat on top of
that same frozen table.

Now the SUMMARY is the one box, and it is written from the ledger every time it is
shown:
  * the client's page (api/share.js): Total · Paid · Balance due are rewritten from
    owedOn() — the same server figure the pay bar charges — with "as of <today>".
    Paid in full reads "$0.00 · Paid in full". If the ledger cannot be read, the
    stored figures stay and the existing "could not verify" notice shows.
  * the editor (wireInvoiceLive): the same three cells from jobFinance(); the card
    above it keeps the status pill and the paid-in-full date but no longer prints a
    second amount. Printing from the editor prints the live summary; saving stores it.
  * new invoices say Total / Paid / Balance due (the audit's D3 words) and carry ids
    on the three cells; older ones are found by their old labels.
owedOn() now also returns the total and paid cents — byte-identical in pay.js and
share.js (gate_1199 holds that).
Usage: python3 patch_1320.py [repo root]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../..')
files = {k: pl.load(os.path.join(ROOT, k)) for k in ('index.html', 'api/pay.js', 'api/share.js')}
def one(f, old, new):
    s = files[f]
    assert s.count(old) == 1, (f, old[:90], s.count(old))
    files[f] = s.replace(old, new)

# ── owedOn, both copies ──────────────────────────────────────────────────────────────
for f in ('api/pay.js', 'api/share.js'):
    one(f, "    return { cents: Math.round((jobTotal - collected) * 100), label: 'Amount due' };",
           "    return { cents: Math.round((jobTotal - collected) * 100), label: 'Amount due',\n"
           "             totalCents: Math.round(jobTotal * 100), paidCents: Math.round(collected * 100) };   // 1320: the invoice's summary")

# ── share.js: the client's page writes the live summary ─────────────────────────────
one('api/share.js', "/* 1279: CARD FEE.", r"""/* 1320: ONE balance on an invoice. The stored SUMMARY was frozen the day the invoice was
   made, so after a payment the page said "Pay $9,800" over "BALANCE DUE $14,800". The
   three cells are rewritten here from owedOn() — the figure the pay bar charges. New
   invoices carry ids; older ones are found by their labels. */
const usd = (c) => '$' + (Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function liveInvoiceSummary(html, o) {
  const day = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' });
  const due = o.cents;
  const cell = (re, val) => { html = html.replace(re, (all, open) => open + val + '</td>'); };
  cell(/(<td[^>]*id="invTotal"[^>]*>)[\s\S]*?<\/td>/, usd(o.totalCents));
  cell(/(Contract Price<\/td>\s*<td[^>]*>)[\s\S]*?<\/td>/, usd(o.totalCents));
  cell(/(<td[^>]*id="invPaid"[^>]*>)[\s\S]*?<\/td>/, '&#8722;' + usd(o.paidCents));
  cell(/(Payments Received<\/td>\s*<td[^>]*>)[\s\S]*?<\/td>/, '&#8722;' + usd(o.paidCents));
  cell(/(<td[^>]*id="estTotal"[^>]*>)[\s\S]*?<\/td>/, due <= 0 ? '$0.00 &middot; Paid in full' : usd(due));
  html = html.replace(/(<span id="invAsOf"[^>]*>)[\s\S]*?<\/span>/, (all, open) => open + 'as of ' + day + '</span>');
  return html;
}

/* 1279: CARD FEE.""")
one('api/share.js', """        const { cents, label } = await owedOn(sbHeaders, rows[0]);
        if (cents >= 50 && cents <= 10000000) {""",
"""        const owed = await owedOn(sbHeaders, rows[0]);
        const { cents, label } = owed;
        if (isInvoiceDoc) html = liveInvoiceSummary(html, owed);   /* 1320 */
        if (cents >= 50 && cents <= 10000000) {""")

# ── index.html: the template ────────────────────────────────────────────────────────
one('index.html', """    '<tr><td style="padding:9px 6px;border-bottom:1px solid #ddd;">Contract Price</td>' +
      '<td style="padding:9px 6px;border-bottom:1px solid #ddd;text-align:right;font-weight:700;">[INV_TOTAL]</td></tr>' +
    '<tr><td style="padding:9px 6px;border-bottom:1px solid #ddd;">Payments Received</td>' +
      '<td style="padding:9px 6px;border-bottom:1px solid #ddd;text-align:right;font-weight:700;">&#8722;[INV_PAID]</td></tr>' +
    '<tr><td style="padding:12px 6px;font-weight:800;font-size:16px;">BALANCE DUE</td>' +""",
"""    '<tr><td style="padding:9px 6px;border-bottom:1px solid #ddd;">Total</td>' +
      '<td id="invTotal" style="padding:9px 6px;border-bottom:1px solid #ddd;text-align:right;font-weight:700;">[INV_TOTAL]</td></tr>' +
    '<tr><td style="padding:9px 6px;border-bottom:1px solid #ddd;">Paid</td>' +
      '<td id="invPaid" style="padding:9px 6px;border-bottom:1px solid #ddd;text-align:right;font-weight:700;">&#8722;[INV_PAID]</td></tr>' +
    '<tr><td style="padding:12px 6px;font-weight:800;font-size:16px;">Balance due <span id="invAsOf" style="display:block;font-size:12px;font-weight:400;color:#555;"></span></td>' +""")

# ── index.html: the editor writes the same live summary; the card loses its 2nd amount
one('index.html', """    var estCell = doc.getElementById('estTotal');
    var table = estCell && estCell.closest ? estCell.closest('table') : null;""",
"""    /* 1320: the SUMMARY is the one balance — written live here, so print and save carry it */
    invLiveSummary(doc, billed, paid, bal);
    var estCell = doc.getElementById('estTotal');
    var table = estCell && estCell.closest ? estCell.closest('table') : null;""")
one('index.html', """      card.innerHTML = '<div class="cil-row"><span class="cil-lbl">Current Balance Due</span>'
        + (st ? '<span class="cil-pill ' + st.k + '">' + esc(st.label) + '</span>' : '') + '</div>'
        + '<div class="cil-amt">' + fmtMoney(bal, true) + '</div>'
        + '<div class="cil-meta">Billed ' + fmtMoney(billed, true) + ' &middot; Paid ' + fmtMoney(paid, true) + '</div>';""",
"""      /* 1320: status only — the amount lives once, in the SUMMARY below */
      card.innerHTML = '<div class="cil-row"><span class="cil-lbl">Invoice status</span>'
        + (st ? '<span class="cil-pill ' + st.k + '">' + esc(st.label) + '</span>' : '') + '</div>';""")
one('index.html', "function wireInvoiceLive(doc, r){", r"""/* 1320: Total · Paid · Balance due from the ledger. New invoices carry ids; older ones
   are found by their labels. The same rewrite runs server-side in api/share.js. */
function invLiveSummary(doc, billed, paid, bal){
  try{
    var byLabel = function(re){
      var tds = doc.querySelectorAll('td');
      for(var i = 0; i < tds.length; i++){ if(re.test((tds[i].textContent || '').trim())){ var n = tds[i].nextElementSibling; if(n) return n; } }
      return null;
    };
    var t = doc.getElementById('invTotal') || byLabel(/^Contract Price$/i);
    var p = doc.getElementById('invPaid') || byLabel(/^Payments Received$/i);
    var d = doc.getElementById('estTotal');
    if(t) t.innerHTML = fmtMoney(billed, true);
    if(p) p.innerHTML = '&#8722;' + fmtMoney(paid, true);
    if(d) d.innerHTML = (billed > 0 && bal <= 0.005) ? fmtMoney(0, true) + ' &middot; Paid in full' : fmtMoney(bal, true);
    var a = doc.getElementById('invAsOf');
    if(a) a.textContent = 'as of ' + new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }catch(_){}
}
function wireInvoiceLive(doc, r){""")

one('index.html', """        + '<div class="cil-sub"><span>Balance</span><b>' + fmtMoney(0, true) + '</b></div>'
""", '')   # 1320: the paid card says PAID IN FULL and the date; the $0.00 is the summary's
one('index.html', ">v2026-10-12 build 1319<button", ">v2026-10-12 build 1320<button")
one('index.html', "var CHANGELOG = [", """var CHANGELOG = [
  { b: 1320, d:'2026-10-12', t:'One balance on the invoice', s:'An invoice now shows one balance, and it is always today\\u2019s. When a client opens it, the Total, Paid and Balance due lines are filled in from what has actually been paid \\u2014 the same amount the Pay button charges \\u2014 with the date. A paid invoice says Paid in full. Printing or saving from the editor carries the same live numbers, and the second balance box in the editor is gone.' },""")

for k, v in files.items():
    pl.write_atomic(os.path.join(ROOT, k), v)
print('1320 applied')
