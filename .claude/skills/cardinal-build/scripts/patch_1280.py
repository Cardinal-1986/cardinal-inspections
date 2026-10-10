"""Build 1280 — the pay bar is a slim strip, and checks are a way to pay.

Theo: "The payment screen is too large compared to estimate. Also a lot people pay by check."

1279's pay card covered a third of a phone over the estimate. Now a slim strip (label,
amount, a Pay button) sits at the bottom; tapping Pay opens a sheet with three ways:
bank (no fee), card (+3%), and CHECK (no fee) — payable to Cardinal Roofing &
Renovations, LLC, handed to the rep or mailed to 5735 Webster Street, with the client's
name on the memo line. A check is recorded in the app by hand, as checks always were;
nothing is written from this page.

Usage: python3 patch_1280.py [index.html] [api/share.js]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '../../../..')
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html')
SHARE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'api/share.js')

sh = open(SHARE, encoding='utf-8').read()
head = 'function payUi(token, cents, label, name) {'
assert sh.count(head) == 1
i = sh.index(head); j = sh.index('{', i); d = 0
while True:
    c = sh[j]
    if c == '{': d += 1
    elif c == '}':
        d -= 1
        if d == 0: break
    j += 1
NEW = r'''function payUi(token, cents, label, name) {
  /* 1280: a slim strip, not a card. 1279's card covered a third of a phone over
     the estimate (Theo: "too large compared to estimate"). The strip carries the
     amount and one Pay button; the three ways to pay open in a sheet on tap. */
  const fmt = (c) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const dollars = fmt(cents);
  const cardDollars = fmt(cents + cardFeeCents(cents));   // 1279
  const safeName = String(name || 'Cardinal Roofing & Renovations').replace(/[<>&"]/g, '').slice(0, 64);
  const href = '/api/pay?t=' + encodeURIComponent(token);
  const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
  const lock = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="vertical-align:-1px;margin-right:5px;">'
    + '<path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 16 22H8a2.5 2.5 0 0 1-2.5-2.5v-5A2.5 2.5 0 0 1 8 10z" stroke="#8b8f98" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const opt = 'display:block;margin-top:9px;text-decoration:none;border-radius:12px;padding:11px 14px;';
  return `
<div id="crPayBar" style="position:fixed;left:0;right:0;bottom:0;z-index:9999;
  padding:0 10px calc(8px + env(safe-area-inset-bottom,0px));pointer-events:none;font-family:${FONT};">
  <div style="pointer-events:auto;max-width:460px;margin:0 auto;background:#ffffff;border:1px solid #ece7e3;
    border-radius:14px;box-shadow:0 6px 20px rgba(20,10,8,.16);padding:6px 6px 6px 14px;
    display:flex;align-items:center;gap:10px;">
    <div style="min-width:0;flex:1;line-height:1.15;">
      <div style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#6b5d52;">${label}</div>
      <div style="font-size:17px;font-weight:800;color:#231b18;white-space:nowrap;">${dollars}</div>
    </div>
    <button id="crPayOpen" type="button" onclick="document.getElementById('crPaySheet').style.display='block'"
      style="border:0;border-radius:10px;background:#C8202E;color:#ffffff;font-family:${FONT};font-size:15px;font-weight:800;
      min-height:44px;padding:0 22px;cursor:pointer;">Pay</button>
  </div>
</div>
<div id="crPaySheet" onclick="if(event.target===this)this.style.display='none'"
  style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(20,10,8,.55);font-family:${FONT};">
  <div style="position:absolute;left:0;right:0;bottom:0;max-width:460px;margin:0 auto;background:#ffffff;
    border-radius:16px 16px 0 0;padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
      <div style="min-width:0;">
        <div style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#6b5d52;">${label}</div>
        <div style="font-size:13px;color:#6b645e;margin-top:2px;">${safeName}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="font-size:22px;font-weight:800;color:#231b18;white-space:nowrap;">${dollars}</div>
        <button id="crPayClose" type="button" aria-label="Close" onclick="document.getElementById('crPaySheet').style.display='none'"
          style="border:0;background:#f4f1ee;color:#4a403a;border-radius:10px;width:44px;height:44px;font-size:20px;line-height:1;cursor:pointer;">&times;</button>
      </div>
    </div>
    <a id="crPayBank" href="${href}&m=bank" style="${opt}background:#C8202E;color:#ffffff;margin-top:12px;">
      <span style="display:block;font-size:16px;font-weight:800;">Pay by bank &middot; ${dollars}</span>
      <span style="display:block;font-size:12px;font-weight:600;opacity:.9;margin-top:2px;">No fee</span></a>
    <a id="crPayCard" href="${href}&m=card" style="${opt}background:#ffffff;color:#231b18;border:1.5px solid #d9d0ca;">
      <span style="display:block;font-size:16px;font-weight:800;">Pay by card &middot; ${cardDollars}</span>
      <span style="display:block;font-size:12px;font-weight:600;color:#6b645e;margin-top:2px;">Includes a ${CARD_FEE_PCT}% card processing fee &middot; credit or debit</span></a>
    <div id="crPayCheck" style="${opt}background:#f8f5f2;color:#231b18;border:1.5px solid #ece7e3;">
      <span style="display:block;font-size:16px;font-weight:800;">Pay by check &middot; ${dollars}</span>
      <span style="display:block;font-size:12.5px;font-weight:500;color:#4a403a;margin-top:4px;line-height:1.4;">
        No fee. Make it payable to <b>Cardinal Roofing &amp; Renovations, LLC</b> and hand it to your Cardinal rep,
        or mail it to 5735 Webster Street, Dayton, Ohio 45414. Please write <b>${safeName}</b> on the memo line.</span></div>
    <div style="text-align:center;margin-top:11px;font-size:11.5px;font-weight:600;color:#6b645e;">
      ${lock}Bank and card checkout is secure &middot; processed by Stripe</div>
  </div>
</div>`;
}'''
sh = sh[:i] + NEW + sh[j+1:]
a = "  var IDS = ['crPayBar', 'csBar', 'csOverlay'];"
assert sh.count(a) == 1
sh = sh.replace(a, "  var IDS = ['crPayBar', 'crPaySheet', 'csBar', 'csOverlay'];   // 1280: + the pay sheet")
open(SHARE, 'w', encoding='utf-8').write(sh)

src = pl.load(PATH)
src = pl.sub(src, '">v2026-10-10 build 1279<button', '">v2026-10-10 build 1280<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1279,",
  "var CHANGELOG = [\n"
  "  { b: 1280, d: '2026-10-10', t: 'A slim pay bar, and pay by check',\n"
  "    s: 'The pay box on an estimate, contract or invoice link was too big next to the document. It is now a slim strip at the bottom with the amount and a Pay button. Tapping Pay shows three ways to pay: by bank (no fee), by card (3% fee), or by check (no fee) \\u2014 payable to Cardinal Roofing & Renovations, LLC, handed to your rep or mailed to 5735 Webster Street, with the client\\u2019s name on the memo line. Record a check in the app the way you always have.' },\n"
  "  { b: 1279,")
pl.write_atomic(PATH, src)
print('patched 1280')
