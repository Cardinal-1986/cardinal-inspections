"""Build 1402 — what the client sees (23 Oct 2026 audit, round 6: share links, documents, pay).
1. Pay and Accept & Sign were ~17px tall on a phone for invoices and template estimates: share.js zoomed the bars
   back up only when it found the exact text <table class="items">, and those templates carry no viewport meta,
   so a phone laid them out at 980px. Every est-head document (estimate, contract, agreement, invoice) is now
   served at the Letter viewport with the bars zoomed.
2. "Loading…" (the editor's restore veil) printed on every invoice sent without opening the editor. Hidden on
   the share page.
3. An empty contact row ("[Phone · Email]") printed to the funding partner on a Community invoice: the share
   page's empty-placeholder pass ran only for inspection reports. An est-head document's header table drops a
   row that is only an unfilled placeholder.
4. The Community agreement printed the OCCUPANT's email and phone under the partner's name. A Community job no
   longer fills the client contact / [EMAIL] / [PHONE NUMBER] from the occupant (1376's rule, for every template).
5. Printing from the share page dropped the "Terms" heading (h2.sec.page-break hidden with the divider rule),
   and printed the pay / sign bar. Only the dividers hide; the bars do not print.
6. "Invoice # #2005-2": the number no longer carries its own "#".
7. Coming back from a card or bank payment (?paid=1) showed the full balance and a live Pay button for days
   while the payment cleared. That load says thank you instead of offering Pay again.
8. A share link minted where crypto.randomUUID is missing (older iOS) was 't…' base36, which share.js rejects as
   "Invalid link". The fallback is a real v4 UUID."""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
spath = sys.argv[2] if len(sys.argv) > 2 else 'api/share.js'
s = open(path, encoding='utf-8').read()
j = open(spath, encoding='utf-8').read()
def one(old, new, which='s'):
    global s, j
    t = s if which == 's' else j
    n = t.count(old); assert n == 1, (which, n, old[:90]); t = t.replace(old, new)
    if which == 's': s = t
    else: j = t

# ── api/share.js ─────────────────────────────────────────────────────────────
# 1 — every est-head document at the Letter viewport, bars zoomed
one("""    if (/class="est-head"/.test(html) && /<table class="items">/.test(html)) {
      letterView = true;
      html = html.replace(/<meta name="viewport" content="[^"]*">/, '<meta name="viewport" content="width=900"><style>html{-webkit-text-size-adjust:100%;text-size-adjust:100%}</style>');
    }""",
"""    /* 1402: any est-head document — invoices (no table.items) and templates whose table carries an id were
       missed, and with no viewport meta a phone laid them out at 980px: a 17px Pay button. */
    if (/class="est-head"/.test(html)) {
      letterView = true;
      const LV = '<meta name="viewport" content="width=900"><style>html{-webkit-text-size-adjust:100%;text-size-adjust:100%}</style>';
      if (/<meta name="viewport" content="[^"]*">/.test(html)) html = html.replace(/<meta name="viewport" content="[^"]*">/, LV);
      else if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + LV);
      else html = LV + html;
    }""", 'j')
# 2 + 5 — veil hidden; print keeps h2 Terms, hides the bars
one("""    const FIX = '<style id="shareFix">.howto{display:none !important}' + ITEMS_PHONE +""",
"""    const FIX = '<style id="shareFix">.howto{display:none !important}#restoreVeil{display:none !important}' + ITEMS_PHONE +   /* 1402: the editor's veil */""", 'j')
one("""      '@media print{.page-break{display:none !important}h2.sec{break-after:avoid}' +""",
"""      '@media print{.page-break:not(h2){display:none !important}h2.sec{break-after:avoid}' +   /* 1402: the Terms heading is h2.sec.page-break */
      '#crPayBar,#crPaySheet,#csBar,#csOverlay{display:none !important}' +""", 'j')
# 3 — an est-head header row that is only an unfilled placeholder
one("""      'if(!d.querySelector("[data-cardinal-summary-heading]"))return;' +""",
"""      /* 1402: on an estimate / contract / invoice, a header row that is only an unfilled placeholder is dropped */
      /* a row of nothing but placeholders goes; a placeholder beside a real pair blanks its own label and cell */
      'd.querySelectorAll("table.meta tr").forEach(function(tr){var v=tr.querySelectorAll("td:not(.k)");if(!v.length)return;' +
      'var bl=[],full=0;for(var i=0;i<v.length;i++){var c=v[i].cloneNode(true),ph=0;c.querySelectorAll(".ph").forEach(function(p){if((p.textContent||"").trim().charAt(0)==="["){p.remove();ph=1;}});' +
      'if(c.textContent.replace(/\\u00a0/g," ").trim())full=1;else if(ph)bl.push(v[i]);}' +
      'if(!bl.length)return;if(!full){tr.setAttribute("data-emptyblock","1");return;}' +
      'bl.forEach(function(td){var k=td.previousElementSibling;td.textContent="";if(k&&k.classList.contains("k"))k.textContent="";});});' +
      'if(!d.querySelector("[data-cardinal-summary-heading]"))return;' +""", 'j')
# 7 — back from checkout
one("""          if (cents >= 50 && cents <= 10000000) {
            const ui = payUi(t, cents, label, rows[0].project || rows[0].title);""",
"""          if (req.query && req.query.paid === '1') {   /* 1402: back from checkout — the payment is still clearing */
            const ui = paidUi();
            html = html.includes('</body>') ? html.replace('</body>', ui + '\\n</body>') : html + ui;
          } else if (cents >= 50 && cents <= 10000000) {
            const ui = payUi(t, cents, label, rows[0].project || rows[0].title);""", 'j')
one("""// 1199: the honest state when the balance cannot be verified — no amount, no
// button, and the reason. Same shell as payUi so it reads as the same bar.
function unavailableUi() {""",
"""// 1402: the client is back from checkout. A bank payment takes days to clear, so the balance has not moved
// yet — say thank you rather than offer Pay again. Same shell as payUi.
function paidUi() {
  return `
<div id="crPayBar" data-cr-paid="1" style="position:fixed;left:0;right:0;bottom:0;z-index:9999;
  padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));pointer-events:none;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="pointer-events:auto;max-width:520px;margin:0 auto;background:#ffffff;
    border:1px solid #ece7e3;border-radius:18px 18px 14px 14px;
    box-shadow:0 -1px 8px rgba(20,10,8,.05),0 16px 44px rgba(20,10,8,.20);padding:15px 18px 13px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:#2f6b3a;">Thank you</div>
    <div style="font-size:14px;color:#231b18;margin-top:6px;line-height:1.4;">Your payment was received. A bank payment can take a few days to clear, so the balance here may not change right away.</div>
  </div>
</div>`;
}

// 1199: the honest state when the balance cannot be verified — no amount, no
// button, and the reason. Same shell as payUi so it reads as the same bar.
function unavailableUi() {""", 'j')

# ── index.html ───────────────────────────────────────────────────────────────
# 8 — a real UUID when randomUUID is missing
one("""function prefillClientInfo(tpl, pr){""",
"""/* 1402: a share token must read as a UUID (api/share.js checks [a-f0-9-]{20,60}); the old 't…' base36
   fallback, used where crypto.randomUUID is missing (iOS before 15.4), minted links that said "Invalid link". */
function crUuid4(){
  try{ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(_u){}
  var b = new Uint8Array(16);
  try{ crypto.getRandomValues(b); }catch(_g){ for(var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  var h = Array.prototype.map.call(b, function(x){ return (x + 256).toString(16).slice(1); }).join('');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
}
window.crUuid4 = crUuid4;
function prefillClientInfo(tpl, pr){""")
OLD_FB = "('t' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12))"
n = s.count(OLD_FB); assert n == 4, n
s = s.replace(OLD_FB, "window.crUuid4()")
# 4 — Community: no occupant contact under the partner's name
one("""  var recipient = pr.name, homeowner = '';
  try{
    if(typeof projClaimType === 'function' && projClaimType(pr) === 'community'){
      var _cl = parseCkAll(pr).lead || {};""",
"""  var recipient = pr.name, homeowner = '', _comm = false;
  try{
    if(typeof projClaimType === 'function' && projClaimType(pr) === 'community'){
      _comm = true;   /* 1402: pr.phone / pr.email are the occupant's */
      var _cl = parseCkAll(pr).lead || {};""")
one("""  /* shared contact row */
  put('[Phone \\u00b7 Email]', contact);""",
"""  /* shared contact row — 1402: never the occupant's under the partner's name (1376 did this for invoices) */
  if(!_comm) put('[Phone \\u00b7 Email]', contact);""")
one("""  put('[BUYER]', recipient);
  put('[EMAIL]', pr.email);
  put('[PHONE NUMBER]', pr.phone);""",
"""  put('[BUYER]', recipient);
  if(!_comm){ put('[EMAIL]', pr.email); put('[PHONE NUMBER]', pr.phone); }""")
# 6 — invoice number
one("""  var num = '#' + (poOf(pr) || 'INV') + '-' + (invCount + 1);""",
"""  var num = (poOf(pr) || 'INV') + '-' + (invCount + 1);   /* 1402: the label already says "Invoice #" */""")

one(">v2026-10-23 build 1401<", ">v2026-10-23 build 1402<")
one("""  { b: 1401, d:'2026-10-23',""",
"""  { b: 1402, d:'2026-10-23', t:'What the client sees', s:'On a phone, the Pay and Accept & Sign buttons on invoices and estimates are full size again (they could shrink to a sliver). Invoices no longer print a stray \\u201cLoading\\u2026\\u201d. A Community invoice or agreement no longer prints an empty contact line or the occupant\\u2019s email and phone under the partner\\u2019s name. Printing from the client\\u2019s link keeps the Terms heading and leaves the pay bar off the paper. Invoice numbers lose the doubled \\u201c#\\u201d. A client coming back from paying sees a thank-you instead of the Pay button. Share links made on older iPhones open again.' },
  { b: 1401, d:'2026-10-23',""")
pl.write_atomic(path, s)
pl.write_atomic(spath, j)
print('ok 1402')
