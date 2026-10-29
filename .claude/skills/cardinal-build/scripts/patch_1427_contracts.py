#!/usr/bin/env python3
"""patch_D.py — Builder D's index.html changes (contracts / signing).

    python3 patch_D.py <in.html> <out.html>

  1. crBlanksOkToSend(): Text to sign, Share link, Email to client and Client signature ask once
     when a CONTRACT still has blanks, name where they are, and offer Fill them / <verb> anyway.
     Reuses fillBlanks() (the "N to fill" chip's own count) and crAsk's choices; never blocks.
  2. The estimate -> contract message says what really goes with the agreement.
  3. Upload signed contract tells Curtis and the office (through _notifyOrQueue -> notifyTeam) that a
     signed contract is on file while the job is still short of Approved. The STAGE IS NOT MOVED.
  4. On a phone the toast stack moves to the top while crAsk or the Email sheet is open, so "Saved"
     no longer covers the sheet's own buttons.
  5. "Text to sign" reads "Text link" (and the SMS says "view it") on a document the link cannot sign.
  6. ensurePrintFix: table.items tfoot prints once (a contract's CONTRACT PRICE repeated at page breaks).

Exact-match edits, asserted counts, atomic write (patch_lib). Re-running on a fresh copy of the
base reproduces the output byte for byte.
"""
import os, sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl  # noqa: E402

SRC, OUT = sys.argv[1], sys.argv[2]
src = pl.load(SRC)

# ── 1. the pre-send check ───────────────────────────────────────────────────
HELPER_ANCHOR = 'function currentDocRow(){\n  /* 731: this compared a row id against `current`'
HELPER = r"""/* D (contracts judge, 29 Oct): Text to sign, Share link, Email to client and the in-person pad all
   sent a contract with its "N to fill" chip still red -- 40 blanks on a fresh agreement -- and said
   nothing; the client got [n] weeks, [rate] and empty dropdowns. fillBlanks() already knows every
   blank (placeholders, unchosen dropdowns, unticked groups; never a signature), so this asks ONCE,
   names where they are, and lets the rep go straight to the first one. It never blocks: a field can
   legitimately be N/A (the chip's own rule), so "<verb> anyway" is always one tap. */
function crBlankWhere(el){
  try{
    var sec = el.closest && el.closest('.specsec');
    var h3 = sec && sec.querySelector('h3');
    if(h3){
      var t3 = (h3.firstChild && h3.firstChild.nodeType === 3) ? h3.firstChild.textContent : h3.textContent;
      if((t3 || '').trim()) return t3.replace(/\s+/g, ' ').trim();
    }
    var tr = el.closest && el.closest('tr');
    var k = tr && tr.querySelector('td.k');
    if(k && (k.textContent || '').trim()) return k.textContent.replace(/\s+/g, ' ').trim();
    for(var n = el; n && n !== el.ownerDocument.body; n = n.parentElement){
      for(var p = n.previousElementSibling; p; p = p.previousElementSibling){
        if(p.matches && p.matches('h2.sec')) return p.textContent.replace(/\s+/g, ' ').trim();
      }
    }
  }catch(_){}
  return 'the top of the page';
}
async function crBlanksOkToSend(verb){
  var t = (/** @type {any} */ (titleInput).value || '').trim();
  if(!isContractTitle(t)) return true;
  var doc = frame && /** @type {any} */ (frame).contentDocument;
  if(!doc || !doc.body) return true;
  var list = [];
  try{ list = fillBlanks(doc); }catch(_){ return true; }
  if(!list.length) return true;
  var where = [];
  list.forEach(function(el){ var w = crBlankWhere(el); if(where.indexOf(w) === -1) where.push(w); });
  var shown = where.slice(0, 6).join(', ') + (where.length > 6 ? ' and ' + (where.length - 6) + ' more' : '');
  if(typeof window.crAsk !== 'function') return true;
  var pick = await window.crAsk(list.length + (list.length === 1 ? ' blank is' : ' blanks are') + ' still unfilled on this contract.\n\n' +
    'They reach the client blank. Still to fill: ' + shown + '.',
    { choices: [ { id:'fill', label:'Fill them', hint:'Go to the first blank', tone:'primary' }, { id:'go', label: verb + ' anyway' } ], cancel:'Cancel' });
  if(pick === 'go') return true;
  if(pick === 'fill'){ __fillIdx = 0; try{ jumpNextBlank(); }catch(_j){} }
  return false;
}
"""
src = pl.sub(src, HELPER_ANCHOR, HELPER + HELPER_ANCHOR)

src = pl.sub(src,
  "document.getElementById('shareBtn').addEventListener('click', async function(){\n"
  "  try{\n    await saveCurrent();\n    if(!await insPartOkToSend()) return;   /* 1324 */\n",
  "document.getElementById('shareBtn').addEventListener('click', async function(){\n"
  "  try{\n    await saveCurrent();\n    if(!await insPartOkToSend()) return;   /* 1324 */\n"
  "    if(!await crBlanksOkToSend('Share')) return;   /* D */\n")
src = pl.sub(src,
  "  document.getElementById('textSignBtn').addEventListener('click', async function(){\n"
  "    try{\n      await saveCurrent();\n      if(!await insPartOkToSend()) return;   /* 1324 */\n",
  "  document.getElementById('textSignBtn').addEventListener('click', async function(){\n"
  "    try{\n      await saveCurrent();\n      if(!await insPartOkToSend()) return;   /* 1324 */\n"
  "      if(!await crBlanksOkToSend('Text')) return;   /* D */\n")
src = pl.sub(src,
  "    if(!await priceOkToSend((titleInput.value || '').trim() || 'document')) return;\n"
  "    if(!await insPartOkToSend()) return;   /* 1324 */\n",
  "    if(!await priceOkToSend((titleInput.value || '').trim() || 'document')) return;\n"
  "    if(!await insPartOkToSend()) return;   /* 1324 */\n"
  "    if(!await crBlanksOkToSend('Email')) return;   /* D */\n")
src = pl.sub(src,
  "  if(!await insPartOkToSend()) return;   /* 1324: the deductible box first, then the pen */\n",
  "  if(!await insPartOkToSend()) return;   /* 1324: the deductible box first, then the pen */\n"
  "  if(!await crBlanksOkToSend('Sign')) return;   /* D: and the blanks, before a pen touches it */\n")

# ── 2. the estimate -> contract message ─────────────────────────────────────
src = pl.sub(src,
  "(_tr ? ' The Right to Cancel and the printed Notice of Cancellation go with this agreement.'\n",
  "(_tr ? ' Its Terms and Conditions and both Notice of Cancellation copies are the trade\\u2019s printed master: '\n"
  "     + 'the share link and the client\\u2019s signed-copy email carry them. Signing in person, hand the client the printed master.'\n")

# ── 3. Upload signed contract -> tell Curtis and the office ─────────────────
UP_OLD = ("      if(typeof window.auditLog === 'function'){ try{ window.auditLog(isEst ? 'estimate' : 'contract', "
          "(isEst ? 'Uploaded estimate (' : 'Uploaded signed contract (') + label + ', ' + money + ')', pr.id); }catch(_){} }\n")
UP_NEW = UP_OLD + r"""      /* D (contracts judge): an uploaded signed contract never reached Production -- both other signing
         paths alert Curtis. The STAGE IS NOT MOVED here: whether an upload approves the job is Theo's
         call. So Curtis and the office hear that a signed contract is on file while the job is still
         short of Approved. Forward-only, like setStage: a job already Approved or beyond had its alert. */
      var _upTold = false, _upStage = '';
      if(!isEst){
        try{
          _upStage = (typeof normStage === 'function') ? normStage(pr.stage) : String(pr.stage || '');
          var _upFwd = (typeof crStageIsForward === 'function') ? crStageIsForward(_upStage, 'Approved')
                     : (['Approved','Scheduled','Completed','Invoiced','Closed'].indexOf(_upStage) === -1);
          if(_upFwd && typeof _notifyOrQueue === 'function'){
            var _upAdm = (typeof ADMIN_EMAILS !== 'undefined' && Array.isArray(ADMIN_EMAILS)) ? ADMIN_EMAILS
                       : ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net'];
            _notifyOrQueue(['curtis@cardinalrenovations.net'].concat(_upAdm),
              'Signed contract uploaded — not yet Approved: ' + (pr.name || ''),
              '<p><b>' + ctuEsc(pr.name || '') + '</b>' + (pr.address ? ' (' + ctuEsc(pr.address) + ')' : '') +
              ': a signed ' + ctuEsc(label) + ' contract for <b>' + ctuEsc(money) + '</b>, signed ' + ctuEsc(signedNice) +
              ', was uploaded' + (me ? ' by ' + ctuEsc(me) : '') + '.</p>' +
              '<p>The job is still <b>' + ctuEsc(_upStage || 'not Approved') + '</b>, so it is not on the production schedule yet. ' +
              'Move it to <b>Approved</b> when it is ready to build — that sends the usual schedule + order materials alert.</p>',
              (typeof clientLink === 'function') ? clientLink(pr.id) : '/');
            _upTold = true;
          }
        }catch(_n){}
      }
"""
src = pl.sub(src, UP_OLD, UP_NEW)
src = pl.sub(src,
  "        : ('Signed ' + label + ' contract saved — ' + money + '. Invoices & Payments can open now.'));\n",
  "        : ('Signed ' + label + ' contract saved — ' + money + '. Invoices & Payments can open now.' +\n"
  "           (_upTold ? ' Curtis and the office were told; the job stays ' + _upStage + ' until someone moves it to Approved.' : '')));\n")

# ── 5. "Text to sign" only where the link can take a signature ──────────────
SIGNABLE_HELPER = r"""/* D (docs judge; Builder F's note): the editor offered "Text to sign" on every non-invoice, and the SMS
   promised "review and sign it right here" on an inspection report or Roof Options page that has no
   signature to take. Mirrors api/share.js's own test: an unfilled Buyer slot, or a Client Acceptance
   line with nothing on it, and never once data-clientsigned. */
function crDocSignable(doc){
  try{
    if(!doc || !doc.body) return true;
    if(doc.querySelector('[data-clientsigned]')) return false;
    var slot = doc.querySelector('[data-sig="buyer"]');
    if(slot) return !slot.classList.contains('signed');
    return Array.prototype.some.call(doc.querySelectorAll('.lbl'), function(l){
      var ln = l.previousElementSibling;
      return /^\s*Client Acceptance/i.test(l.textContent || '') && !!ln && ln.classList.contains('line') && !ln.querySelector('img');
    });
  }catch(_){ return true; }
}
"""
src = pl.sub(src, HELPER_ANCHOR, SIGNABLE_HELPER + HELPER_ANCHOR)
src = pl.sub(src,
  "        var bl = tb.querySelector('.bl'); if(bl) bl.textContent = inv ? 'Text pay link' : 'Text to sign';\n"
  "        tb.title = inv ? 'Text the client a link to view and pay this invoice' : 'Text the client a link to review and sign';\n",
  "        var sgn = inv ? false : crDocSignable(doc);   /* D: a report is a link, not a signature */\n"
  "        var bl = tb.querySelector('.bl'); if(bl) bl.textContent = inv ? 'Text pay link' : (sgn ? 'Text to sign' : 'Text link');\n"
  "        tb.title = inv ? 'Text the client a link to view and pay this invoice' : (sgn ? 'Text the client a link to review and sign' : 'Text the client a link to view this document');\n")
src = pl.sub(src,
  "        (/^invoice/i.test(title) ? 'You can view and pay it right here: ' : 'You can review and sign it right here: ') + url;\n",
  "        (/^invoice/i.test(title) ? 'You can view and pay it right here: '\n"
  "          : (crDocSignable(frame && /** @type {any} */ (frame).contentDocument) ? 'You can review and sign it right here: ' : 'You can view it right here: ')) + url;\n")

# ── 4. a bottom sheet's buttons are not left under the "Saved" toast ───────
TOAST_OLD = "body.standalone #crToasts{bottom:calc(76px + env(safe-area-inset-bottom));}\n"
TOAST_NEW = TOAST_OLD + (
  "/* D (contracts judge): on a phone every send starts with a save, and the green \"Saved\" toast then sat on\n"
  "   the open sheet's own buttons for ~4s: the Email sheet's Send and Cancel, and each crAsk choice (the\n"
  "   blanks question included). While either sheet is open the stack moves to the top of the screen. */\n"
  "@media (max-width:899px){\n"
  "  body:has(#crAsk.open) #crToasts,body:has(#crEmailSheet.open) #crToasts{--cr-stack:\"D: toasts clear an open bottom sheet\";\n"
  "    bottom:auto;top:calc(12px + env(safe-area-inset-top));}\n"
  "}\n")
src = pl.sub(src, TOAST_OLD, TOAST_NEW)

# ── 6. CONTRACT PRICE prints once (Builder E's 1424 tfoot rule, for every document the editor prints) ──
src = pl.sub(src,
  "    'h2.sec{break-after:avoid;}' +\n    '.figrow,.fig,tr{break-inside:avoid;}' +\n",
  "    'h2.sec{break-after:avoid;}' +\n"
  "    'table.items tfoot{display:table-row-group;}' +   /* D: a contract's CONTRACT PRICE printed at every page break (E did estimates at 1424) */\n"
  "    '.figrow,.fig,tr{break-inside:avoid;}' +\n")

pl.write_atomic(OUT, src)
pl.assert_in(OUT, 'async function crBlanksOkToSend(verb){')
pl.assert_in(OUT, "Signed contract uploaded \u2014 not yet Approved: ")
print('wrote', OUT, len(src))
