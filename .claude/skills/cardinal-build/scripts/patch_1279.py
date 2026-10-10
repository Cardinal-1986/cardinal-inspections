"""Build 1279 — card payments carry a 3% processing fee; bank payments carry none.

Theo picked option 1 ("1 yes debit gets charges also"): two buttons on the pay bar,
"Pay by bank" (no fee) and "Pay by card" (+3%). He was told that card-network rules
bar surcharging DEBIT cards, and chose to charge debit too — recorded, his call.

  api/pay.js        ?m=card → card-only Checkout, principal + a separate fee line;
                    anything else → bank-only (ACH), principal only. The fee is
                    derived server-side like the principal — never from the client.
  api/share.js      the pay bar shows both totals and discloses the fee BEFORE checkout.
  api/pay-webhook.js the ledger records the PRINCIPAL (metadata.principal_cents), not
                    amount_total — otherwise the fee would be credited toward the
                    client's balance. The fee is named in the row's notes.
  index.html        stamp + CHANGELOG.

Usage: python3 patch_1279.py [index.html api_dir]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '../../../..')
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html')
API = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'api')

def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:80], s.count(a))
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

FEE = """/* 1279: CARD FEE. Theo's pick — a card pays a 3% processing fee on top, a bank
   (ACH) payment pays none. He was told card-network rules bar surcharging DEBIT
   cards and chose to charge debit too. KEEP IN SYNC: CARD_FEE_PCT and cardFeeCents
   are byte-identical in api/pay.js and api/share.js (share shows both totals). */
const CARD_FEE_PCT = 3;
const cardFeeCents = (cents) => Math.round(cents * CARD_FEE_PCT / 100);
"""

# ── api/pay.js
edit(os.path.join(API, 'pay.js'), [
 ("const MAX_CENTS = 100000 * 100;          // $100k ceiling — a data-error guard\n",
  "const MAX_CENTS = 100000 * 100;          // $100k ceiling — a data-error guard\n" + FEE),
 ("    const meta = { kind, share_token: t, project_id: rep.project_id || '', report_id: rep.id };",
  "    /* 1279: ?m=card → card only, with the fee as its own line. Anything else\n"
  "       (including a bare link) → bank only, no fee — never a card without its fee. */\n"
  "    const payBy = String((req.query && req.query.m) || '').toLowerCase() === 'card' ? 'card' : 'bank';\n"
  "    const fee = payBy === 'card' ? cardFeeCents(cents) : 0;\n"
  "    const meta = { kind, share_token: t, project_id: rep.project_id || '', report_id: rep.id,\n"
  "                   pay_by: payBy, principal_cents: String(cents), fee_cents: String(fee) };\n"
  "    const items = [{\n"
  "      quantity: 1,\n"
  "      price_data: { currency: 'usd', unit_amount: cents, product_data: { name: `${label} — ${name}` } }\n"
  "    }];\n"
  "    if (fee > 0) items.push({\n"
  "      quantity: 1,\n"
  "      price_data: { currency: 'usd', unit_amount: fee,\n"
  "                    product_data: { name: `Card processing fee (${CARD_FEE_PCT}%)` } }\n"
  "    });"),
 ("      payment_method_types: ['card', 'us_bank_account'],\n"
  "      line_items: [{\n"
  "        quantity: 1,\n"
  "        price_data: {\n"
  "          currency: 'usd',\n"
  "          unit_amount: cents,\n"
  "          product_data: { name: `${label} — ${name}` }\n"
  "        }\n"
  "      }],",
  "      /* 1279: one method per session now — the fee depends on the method, and\n"
  "         Checkout cannot change the total after the client picks one. */\n"
  "      payment_method_types: payBy === 'card' ? ['card'] : ['us_bank_account'],\n"
  "      line_items: items,"),
])

# ── api/pay-webhook.js
edit(os.path.join(API, 'pay-webhook.js'), [
 ("      const amount = (Number(s.amount_total) || 0) / 100;",
  "      /* 1279: a card checkout carries a fee line on top of what was owed. The\n"
  "         ledger records the PRINCIPAL — amount_total would credit the fee\n"
  "         toward the client's balance. Sessions from before 1279 carry no\n"
  "         principal_cents and fall back to amount_total, as before. */\n"
  "      const principal = Number(meta.principal_cents);\n"
  "      const feeCents = Number(meta.fee_cents) || 0;\n"
  "      const amount = (principal > 0 ? principal : (Number(s.amount_total) || 0)) / 100;"),
 ("            notes: paymentNoteFor(method),",
  "            notes: paymentNoteFor(method) + (feeCents > 0\n"
  "              ? ' — plus a $' + (feeCents / 100).toFixed(2) + ' card processing fee, not applied to the balance'\n"
  "              : ''),"),
])

# ── api/share.js — both buttons, fee disclosed before checkout
SH = os.path.join(API, 'share.js')
edit(SH, [
 ("// payUi: a polished, trustworthy pay bar.",
  FEE + "\n// payUi: a polished, trustworthy pay bar."),
 ("  const href = '/api/pay?t=' + encodeURIComponent(token);",
  "  const href = '/api/pay?t=' + encodeURIComponent(token);\n"
  "  const cardCents = cents + cardFeeCents(cents);   // 1279\n"
  "  const cardDollars = (cardCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });"),
 ("""    <a href="${href}" style="display:block;margin-top:15px;text-align:center;text-decoration:none;
      background:#C8202E;color:#ffffff;font-size:17px;font-weight:800;letter-spacing:.01em;
      padding:15px 20px;border-radius:12px;box-shadow:0 6px 15px rgba(200,32,46,.30);">Pay ${dollars}</a>
    <div style="text-align:center;margin-top:11px;font-size:11.5px;font-weight:600;color:#6b645e;">
      ${lock}Secure checkout &middot; processed by Stripe</div>""",
  """    <a id="crPayBank" href="${href}&m=bank" style="display:block;margin-top:15px;text-align:center;text-decoration:none;
      background:#C8202E;color:#ffffff;font-size:17px;font-weight:800;letter-spacing:.01em;
      padding:13px 20px;border-radius:12px;box-shadow:0 6px 15px rgba(200,32,46,.30);">Pay by bank &middot; ${dollars}
      <span style="display:block;font-size:12px;font-weight:600;opacity:.9;margin-top:2px;">No fee</span></a>
    <a id="crPayCard" href="${href}&m=card" style="display:block;margin-top:9px;text-align:center;text-decoration:none;
      background:#ffffff;color:#231b18;border:1.5px solid #d9d0ca;font-size:16px;font-weight:800;
      padding:11px 20px;border-radius:12px;">Pay by card &middot; ${cardDollars}
      <span style="display:block;font-size:12px;font-weight:600;color:#6b645e;margin-top:2px;">Includes a ${CARD_FEE_PCT}% card processing fee</span></a>
    <div style="text-align:center;margin-top:11px;font-size:11.5px;font-weight:600;color:#6b645e;">
      ${lock}Secure checkout &middot; processed by Stripe &middot; card payments, credit or debit, carry a ${CARD_FEE_PCT}% fee</div>"""),
])


# ── api/share.js — 1278 shrinks an estimate page to fit; its fixed bars must not shrink with it
LETTER_UI = """
/* 1279: an estimate is served at a 900px Letter viewport (1278), so a phone
   shrinks the page to fit — and every fixed bar on it with it, to ~43%: a pay
   button a thumb can barely hit. Zoom the bars (and the signing sheet) back up
   by 1/scale; the document itself stays the Letter page. */
const LETTER_UI = `<script id="crLetterUi">(function(){
  var IDS = ['crPayBar', 'csBar', 'csOverlay'];
  function fit(){
    var vv = window.visualViewport, vw = document.documentElement.clientWidth || 0;
    var s = vv && vv.scale ? vv.scale : (screen.width && vw ? screen.width / vw : 1);
    var k = s < 0.98 ? 1 / s : 1;
    IDS.forEach(function(id){ var e = document.getElementById(id); if (e) e.style.zoom = k > 1 ? k.toFixed(3) : ''; });
  }
  fit();
  if (window.visualViewport) visualViewport.addEventListener('resize', fit);
  addEventListener('resize', fit); addEventListener('orientationchange', fit);
})();</script>`;
"""
edit(SH, [
 ("// payUi: a polished, trustworthy pay bar.", LETTER_UI.lstrip('\n') + "\n// payUi: a polished, trustworthy pay bar."),
 ("    if (/class=\"est-head\"/.test(html) && /<table class=\"items\">/.test(html)) {\n",
  "    let letterView = false;   // 1279: LETTER_UI zooms the bars back up on this page\n"
  "    if (/class=\"est-head\"/.test(html) && /<table class=\"items\">/.test(html)) {\n"
  "      letterView = true;\n"),
 ("    res.setHeader('Content-Type', 'text/html; charset=utf-8');\n    res.setHeader('X-Robots-Tag', 'noindex');",
  "    if (letterView) html = html.includes('</body>') ? html.replace('</body>', LETTER_UI + '\\n</body>') : html + LETTER_UI;\n"
  "    res.setHeader('Content-Type', 'text/html; charset=utf-8');\n    res.setHeader('X-Robots-Tag', 'noindex');"),
])

# ── index.html — stamp + CHANGELOG
src = pl.load(PATH)
src = pl.sub(src, '">v2026-10-10 build 1278<button', '">v2026-10-10 build 1279<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1278,",
  "var CHANGELOG = [\n"
  "  { b: 1279, d: '2026-10-10', t: 'Pay by bank, or by card with a 3% fee',\n"
  "    s: 'The pay bar on an estimate, contract or invoice link now has two buttons. Pay by bank costs the client nothing extra. Pay by card adds a 3% card processing fee, shown on the button and on the Stripe receipt before they pay. The job\\u2019s payments record what was owed \\u2014 the fee is noted on the payment and never counts toward the balance.' },\n"
  "  { b: 1278,")
pl.write_atomic(PATH, src)
print('patched 1279')
