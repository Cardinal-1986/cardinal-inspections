#!/usr/bin/env python3
"""patch_api_D.py — Builder D's api changes (contracts, remote signing, shared pages).

    python3 patch_api_D.py [SRC_API_DIR] [OUT_API_DIR]        # default: repo api/ -> builderD/api/
    python3 patch_api_D.py --apply                            # write the patched files INTO the repo api/
                                                              # (refuses unless repo files == the base)

Every edit is exact-match with an asserted count (patch_lib.sub). Re-running on the
base reproduces builderD/api/* byte for byte. Touches:
  api/share.js       notice delivery, sign sheet (initials / co-buyer / copy), frozen
                     answers, contract + report phone view, report renumber + orphan h3,
                     report print rules (F's ensurePrintFix), totals print once
  api/clientsign.js  initials, co-buyer, signed copy to the signer (Resend, existing key)
  api/senddoc.js     an emailed agreement carries its printed master; attachment name
  vercel.json        clientsign gets 30s (it now sends one more email and fetches a PDF)
"""
import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/user/cardinal-inspections'
sys.path.insert(0, os.path.join(REPO, '.claude/skills/cardinal-build/scripts'))
import patch_lib as pl  # noqa: E402

args = [a for a in sys.argv[1:] if not a.startswith('--')]
APPLY = '--apply' in sys.argv
SRC = args[0] if args else os.path.join(REPO, 'api')
OUT = args[1] if len(args) > 1 else os.path.join(HERE, 'api')

# ─────────────────────────────────────────────────────────────────────────────
# Shared by all three routes. KEEP IN SYNC — byte-identical in share.js,
# clientsign.js and senddoc.js; gate_D asserts it.
# ─────────────────────────────────────────────────────────────────────────────
MASTER_BLOCK = r"""/* D (contracts + client documents judges): a Construction Agreement tells the buyer its Terms and
   Conditions and both Notice of Cancellation copies are "attached" and are "the printed master", then
   names a STAFF menu path (Menu > Company Documents > ...) a homeowner cannot open. The statutory text
   is deliberately never retyped (ORC 1345.23), so what reaches the buyer is the printed master itself:
   the trade's PDF that already ships publicly in docs/ (pages = its Terms and both notices).
   KEEP IN SYNC: this block is byte-identical in api/share.js, api/clientsign.js and api/senddoc.js. */
const MASTERS = {
  roof:   { href: '/docs/Cardinal_Roofing_Contract.pdf', page: 3, pages: '3\u20135', name: 'Roofing Construction Agreement' },
  siding: { href: '/docs/Cardinal_Siding_Contract.pdf', page: 2, pages: '2\u20134', name: 'Siding Construction Agreement' },
  gutter: { href: '/docs/Cardinal_Gutter_Contract.pdf', page: 3, pages: '3\u20135', name: 'Gutter Construction Agreement' }
};
function masterFor(html) {
  const h = String(html || '');
  if (!/Notice of Cancellation/i.test(h)) return null;
  const m = /class="est-title">\s*(ROOFING|SIDING|GUTTER)\s+CONSTRUCTION/i.exec(h) ||
            /Company Documents\s*(?:&#8594;|\u2192)\s*(Roofing|Siding|Gutter)s?\b/i.exec(h);
  if (!m) return null;
  const k = m[1].toLowerCase();
  return MASTERS[k === 'roofing' ? 'roof' : k] || null;
}
const MENU_RX = /<b>\s*(?:&#9776;|\u2630)\s*Menu\s*(?:&#8594;|\u2192)\s*Company Documents\s*(?:&#8594;|\u2192)\s*(?:Roofing|Siding|Gutters)\s*(?:&#8594;|\u2192)\s*([^<]*?\(Master\))\s*<\/b>/g;
function masterLinked(html, master, origin) {
  if (!master) return html;
  const href = (origin || '') + master.href + '#page=' + master.page;
  return String(html).replace(MENU_RX, (all, name) => '<a href="' + href + '" target="_blank" rel="noopener" data-cr-master="1"><b>' +
    name.replace(/\s+/g, ' ') + '</b> (PDF, pages ' + master.pages + ')</a>');
}
/* the agreement's OWN right-to-cancel sentence, quoted as written — never paraphrased */
function cancelLine(html) {
  const m = /<b>\s*(You, the buyer, may cancel this transaction[^<]*?)\s*<\/b>/i.exec(String(html || ''));
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}
/* one value cell of the agreement's Customer Information table; a [placeholder] reads as empty */
function cellText(html, label) {
  const m = new RegExp('<td class="k">' + label + '<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>').exec(String(html || ''));
  if (!m) return '';
  const t = m[1].replace(/<[^>]*>/g, ' ').replace(/&nbsp;|\u00a0/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, ' ').trim();
  return t.charAt(0) === '[' ? '' : t.slice(0, 80);
}
const EMAIL_RX = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[A-Za-z]{2,}$/;
const INIT_RX = /(Initials(?:\s|&nbsp;|\u00a0)*)<span class="ph">\[_*\]<\/span>/g;
"""

# ─────────────────────────────────────────────────────────────────────────────
# api/share.js
# ─────────────────────────────────────────────────────────────────────────────
SHARE_SIGNUI_OLD_START = 'function signUi(token) {\n'
SHARE_SIGNUI_OLD_END = '\n// ── the payment bar (client-facing)'

SHARE_SIGNUI_NEW = r"""const escH = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* D: the signing sheet. The remote signer used to get ONE box: the agreement's three "Initials [__]"
   stayed blank, a named co-buyer had no way to sign, nothing said a copy was coming, and the
   right-to-cancel notice was nowhere on it. cfg (all optional, so an estimate's sheet is unchanged
   apart from the copy field): mode 'buyer'|'cobuyer', initials (how many slots), coName, email
   (the address the agreement itself carries), master, cancel. */
function signUi(token, cfg) {
  const c = cfg || {};
  const co = c.mode === 'cobuyer';
  const nInit = co ? 0 : Math.max(0, Number(c.initials) || 0);
  const coName = String(c.coName || '');
  const FONT = "'Segoe UI',Arial,sans-serif";
  const inBox = `display:block;width:100%;box-sizing:border-box;margin:4px 0 12px;padding:10px 12px;border:1px solid #c9c2bf;border-radius:8px;font:16px ${FONT};`;
  const lab = `display:block;font:700 13px ${FONT};color:#444;`;
  const note = `margin:-6px 0 12px;color:#5c5c5c;font:13px/1.45 ${FONT};`;
  const btn2 = `border:1px solid #c9c2bf;background:#fff;border-radius:8px;min-height:44px;padding:8px 14px;font:600 13px ${FONT};cursor:pointer;`;
  const pad = (id) => `<canvas id="${id}" width="500" height="160" style="width:100%;border:2px dashed #c9c2bf;border-radius:10px;
      background:#fff;touch-action:none;display:block;"></canvas>`;
  const href = c.master ? c.master.href + '#page=' + c.master.page : '';
  const notice = !c.master ? '' : `
    <div id="csNotice" style="margin:0 0 12px;padding:10px 12px;border:1px solid #efc6ca;border-radius:10px;background:#fff7f7;
      color:#2b2b2b;font:13.5px/1.45 ${FONT};">${c.cancel ? '<b>' + escH(c.cancel) + '</b> ' : ''}<a id="csNoticeLink" href="${escH(href)}"
      target="_blank" rel="noopener" style="color:#9c1822;font-weight:700;">Read the Terms and Conditions and the Notice of Cancellation (PDF)</a></div>`;
  const initials = !nInit ? '' : `
    <label style="${lab}">Your initials
      <input id="csInit" type="text" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" style="${inBox}max-width:9em;">
    </label>
    <div style="${note}">This agreement asks for your initials in ${nInit} ${nInit === 1 ? 'place' : 'places'}. They are added to each one.</div>`;
  const coBlock = (co || !coName) ? '' : `
    <div id="csCoWrap" style="margin-top:16px;padding-top:12px;border-top:1px solid #ece7e3;">
      <div style="font:700 14px ${FONT};color:#2b2b2b;margin-bottom:6px;">Co-buyer: ${escH(coName)}</div>
      <label style="display:flex;align-items:center;gap:10px;min-height:44px;font:600 13.5px ${FONT};color:#444;">
        <input id="csCoLater" type="checkbox" style="width:22px;height:22px;flex:none;"> The co-buyer will sign later from this same link</label>
      <div id="csCoBox">
        <label style="${lab}">Co-buyer&#8217;s full name
          <input id="csCoName" type="text" autocomplete="off" value="${escH(coName)}" style="${inBox}">
        </label>
        ${pad('csCoPad')}
        <div style="margin-top:8px;"><button id="csCoClear" type="button" style="${btn2}">Clear</button></div>
      </div>
    </div>`;
  return `
<div id="csBar" style="position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#C8202E;color:#fff;
  padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;
  font:600 15px ${FONT};box-shadow:0 -4px 14px rgba(0,0,0,.25);">
  <span>${co ? 'Co-buyer: review complete?' : 'Review complete?'}</span>
  <button id="csOpen" style="border:0;border-radius:8px;background:#fff;color:#C8202E;min-height:44px;
    font:800 15px ${FONT};padding:10px 22px;cursor:pointer;">Accept &amp; Sign</button>
</div>
<div id="csOverlay" style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(20,10,8,.65);overflow:auto;">
  <div style="max-width:540px;background:#fff;border-radius:14px;margin:6vh auto;padding:20px 22px;
    font-family:${FONT};">
    <h3 style="margin:0 0 4px;color:#2b2b2b;">${co ? 'Co-buyer: Accept &amp; Sign' : 'Accept &amp; Sign'}</h3>
    <div style="margin:0 0 12px;color:#5c5c5c;font-size:13.5px;line-height:1.45;">By signing you accept this document as presented.
    Sign below with your finger or mouse.</div>${notice}
    <label style="${lab}">Your full name
      <input id="csName" type="text" autocomplete="name" value="${co ? escH(coName) : ''}" style="${inBox}">
    </label>${initials}
    ${pad('csPad')}
    <div style="margin-top:8px;"><button id="csClear" type="button" style="${btn2}">Clear</button></div>${coBlock}
    <label style="${lab}margin-top:14px;">Email my signed copy to
      <input id="csEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" value="${escH(c.email || '')}" style="${inBox}">
    </label>
    <div style="${note}">Leave it blank and this page is your copy &#8212; open this link again any time.</div>
    <div style="margin-top:12px;display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap;">
      <button id="csCancel" type="button" style="${btn2}">Cancel</button>
      <button id="csApply" type="button" style="border:0;background:#C8202E;color:#fff;border-radius:8px;min-height:44px;padding:10px 20px;
        font:800 14px ${FONT};cursor:pointer;">Apply Signature</button>
    </div>
    <div id="csErr" role="alert" style="color:#b01b28;font:600 13px ${FONT};margin-top:8px;"></div>
  </div>
</div>
<script>
(function(){
  var TOKEN=${JSON.stringify(token)},CO=${co ? 'true' : 'false'};
  function $(id){return document.getElementById(id);}
  function mk(id){var c=$(id);if(!c)return null;var x=c.getContext('2d'),dr=false,dn=false;
    function reset(){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
      x.strokeStyle='#1b1b6e';x.lineWidth=2.4;x.lineCap='round';x.lineJoin='round';dr=false;}
    function pos(e){var r=c.getBoundingClientRect();var t=e.touches?e.touches[0]:e;
      return {x:(t.clientX-r.left)*(c.width/r.width),y:(t.clientY-r.top)*(c.height/r.height)};}
    function start(e){e.preventDefault();dn=true;var p=pos(e);x.beginPath();x.moveTo(p.x,p.y);}
    function move(e){if(!dn)return;e.preventDefault();var p=pos(e);x.lineTo(p.x,p.y);x.stroke();dr=true;}
    c.addEventListener('mousedown',start);c.addEventListener('mousemove',move);
    document.addEventListener('mouseup',function(){dn=false;});
    c.addEventListener('touchstart',start,{passive:false});
    c.addEventListener('touchmove',move,{passive:false});
    c.addEventListener('touchend',function(){dn=false;});
    return {reset:reset,drawn:function(){return dr;},png:function(){return c.toDataURL('image/png');}};}
  var pad=mk('csPad'),cop=mk('csCoPad'),ov=$('csOverlay');
  $('csOpen').addEventListener('click',function(){pad.reset();if(cop)cop.reset();ov.style.display='block';});
  $('csCancel').addEventListener('click',function(){ov.style.display='none';});
  $('csClear').addEventListener('click',function(){pad.reset();});
  if($('csCoClear'))$('csCoClear').addEventListener('click',function(){cop.reset();});
  if($('csCoLater'))$('csCoLater').addEventListener('change',function(){$('csCoBox').style.display=this.checked?'none':'block';});
  $('csApply').addEventListener('click',function(){
    var err=$('csErr');
    var name=$('csName').value.trim();
    if(!name){err.textContent='Please enter your full name.';return;}
    var ini=$('csInit')?$('csInit').value.trim():'';
    if($('csInit')&&!/[A-Za-z]/.test(ini)){err.textContent='Please type your initials.';return;}
    if(!pad.drawn()){err.textContent='Please sign in the box above.';return;}
    var cob=null;
    if(cop&&!($('csCoLater')&&$('csCoLater').checked)){
      var cn=$('csCoName').value.trim();
      if(!cn){err.textContent='Please enter the co-buyer\\u2019s full name, or tick \\u201cwill sign later\\u201d.';return;}
      if(!cop.drawn()){err.textContent='The co-buyer signs in the second box, or tick \\u201cwill sign later\\u201d.';return;}
      cob={sig:cop.png(),name:cn};
    }
    var em=$('csEmail')?$('csEmail').value.trim():'';
    if(em&&!/^[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}$/.test(em)){err.textContent='Please check the email address, or leave it blank.';return;}
    var btn=this;btn.disabled=true;btn.textContent='Signing\\u2026';err.textContent='';
    fetch('/api/clientsign',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({t:TOKEN,role:CO?'cobuyer':'buyer',sig:pad.png(),name:name,initials:ini,email:em,cobuyer:cob})})
    .then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
    .then(function(x){
      if(!x.ok){throw new Error((x.d&&x.d.error)||'Could not sign');}
      var sent=!!(x.d&&x.d.copy==='sent');
      var card=document.createElement('div');card.id='csDone';
      card.setAttribute('style','max-width:420px;background:#fff;border-radius:14px;margin:16vh auto;padding:30px;text-align:center;font-family:\\'Segoe UI\\',Arial,sans-serif;');
      card.innerHTML='<div style="font-size:44px;color:#1d6b34;">\\u2713</div>'+
        '<h3 style="margin:6px 0;color:#2b2b2b;">Signed \\u2014 thank you!</h3>'+
        '<div id="csDoneCopy" style="color:#444;font-size:15px;line-height:1.45;margin:10px 0;"></div>'+
        '<div style="color:#5c5c5c;font-size:14px;">Cardinal Roofing &amp; Renovations has been notified.</div>';
      ov.innerHTML='';ov.appendChild(card);
      $('csDoneCopy').textContent=sent?('A signed copy is on its way to '+em+'.'):'This page is your signed copy \\u2014 open this link again any time, or print it.';
      setTimeout(function(){location.reload();},sent?2600:3400);
    })
    .catch(function(e){btn.disabled=false;btn.textContent='Apply Signature';err.textContent=e.message;});
  });
})();
</script>`;
}
"""

# the contract's own phone view + frozen answers (share.js only)
SHARE_CONTRACT_CONSTS = r"""
/* D: a contract on a phone. 1402 served every est-head document at a 900px Letter viewport, so a
   homeowner signing an agreement on a phone read it at ~6px on the glass while the sign bar was zoomed
   2.3x over it. Estimates and invoices keep 1278's Letter page (Theo's ruling for estimates); a
   CONTRACT is served at the phone's own width with the agreement's existing 640px rules switched on,
   and this sheet takes the Letter-only sizes (8.5in body, 10pt type, a two-column spec grid) down to a
   readable phone (and upright-iPad) page. Screen only: print is untouched, and so is anything wider. */
const CONTRACT_PHONE = '<meta name="viewport" content="width=device-width, initial-scale=1"><style id="crContractPhone">' +
  'html{-webkit-text-size-adjust:100%;text-size-adjust:100%}' +
  /* 860, not 640: the Letter body is 8.5in (816px), so an iPad held upright (768) would scroll sideways */
  '@media screen and (max-width:860px){' +
  'body{width:auto !important;max-width:none !important;margin:0 !important;padding:18px 14px 132px !important;font-size:16px !important;line-height:1.55 !important}' +
  '.est-logo{width:190px !important;max-width:62% !important}.est-title{font-size:23px !important;line-height:1.2 !important}.est-sub{font-size:14px !important}' +
  'h2.sec{font-size:19px !important;margin:24px 0 8px !important}' +
  'p,li,.specline,.sopt,.descbox,.note,table.meta,table.facts,table.items,.crsel-ro{font-size:16px !important;line-height:1.55 !important}' +
  '.specnote,.specsub,.dim,.roofdiag figcaption,p[style*="9.5pt"],p[style*="9pt"]{font-size:14px !important}' +
  '.specsec h3{font-size:16px !important}.specgrid{display:block !important}.soptrow{grid-template-columns:1fr !important}' +
  'table.meta,table.meta>tbody{display:block !important;width:100% !important}' +
  'table.meta tr:not([data-emptyblock]){display:grid !important;grid-template-columns:minmax(96px,36%) minmax(0,1fr)}' +
  'table.meta td:not([data-emptyph]):not([data-crspacer]){display:block !important;width:auto !important;padding:8px 10px !important;overflow-wrap:anywhere}' +
  'table.meta td[data-crspacer]{display:none !important}' +
  '.sigslot{min-width:0 !important;max-width:100%}.sigslot img{max-width:100%;height:auto;max-height:56px}' +
  '#crMasterCard{font-size:16px !important}}</style>';
const CONTRACT_FIX = '<style id="crContractFix">' +
  '.ph[data-blankph],.crsel-ro[data-blankph]{background:none !important;border-bottom:1px solid #1b1b1b;border-radius:0 !important;padding:0 !important;display:inline-block;min-width:3.2em}' +
  '.crsel-ro{border-bottom:1px solid #555;padding:0 2px}.cbx{cursor:default}a[data-cr-master]{color:#9c1822}@media print{#crMasterCard{display:none !important}}</style>' +
  '<script id="crContractFixJs">(function(){function run(){var d=document;' +
  /* the signature stamps the STORED document, so an answer the client changed here would never reach it:
     each dropdown shows its chosen answer as text, a blank one as a blank line */
  'd.querySelectorAll("select").forEach(function(s){var o=s.options[s.selectedIndex];var v=(o&&o.value)?(o.textContent||"").trim():"";' +
  'var sp=d.createElement("span");sp.className="crsel-ro";if(v)sp.textContent=v;else{sp.setAttribute("data-blankph","1");sp.textContent="\\u2003\\u2003";}' +
  's.parentNode.replaceChild(sp,s);});' +
  'd.querySelectorAll("[contenteditable]").forEach(function(e){e.removeAttribute("contenteditable");});' +
  /* a field the rep left unfilled is a blank on the form, not the editor's yellow [hint] */
  'd.querySelectorAll(".ph").forEach(function(el){var t=(el.textContent||"").trim();if(t.charAt(0)!=="[")return;' +
  'if(/^(P|DIV|LI)$/.test(el.tagName)){el.setAttribute("data-emptyblock","1");return;}' +
  'el.setAttribute("data-blankph","1");el.textContent="\\u2003\\u2003";});' +
  /* a heading left over nothing (the editor's Notes line) goes; a .note box carries its own bold label */
  'd.querySelectorAll("h2.sec").forEach(function(h){var el=h.nextElementSibling,gone=0,keep=0;' +
  'while(el&&!(el.tagName==="H2"&&el.classList.contains("sec"))){if(el.getAttribute("data-emptyblock"))gone++;' +
  'else if(!(el.classList.contains("note")||/^(restoreVeil|cs|crPay)/.test(el.id||"")||el.tagName==="SCRIPT"||el.tagName==="STYLE")){keep=1;break;}' +
  'el=el.nextElementSibling;}if(gone&&!keep)h.setAttribute("data-emptyblock","1");});' +
  /* 1364's spacer pair in the header (an empty label beside an empty value) is dropped on a phone only */
  'd.querySelectorAll("table.meta td.k").forEach(function(k){var v=k.nextElementSibling;' +
  'if(!(k.textContent||"").replace(/\\u00a0/g," ").trim()&&v&&!(v.textContent||"").replace(/\\u00a0/g," ").trim()){k.setAttribute("data-crspacer","1");v.setAttribute("data-crspacer","1");}});' +
  '}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();})();</scr' + 'ipt>';
/* D (Builder F's note): an inspection report printed from its link gets the print rules the editor's
   ensurePrintFix carries from 1423 -- the cover ends its own page, a signature keeps its label, the findings
   header stays with its rows -- and MODERATE reads dark on amber (white was 2.17:1) on screen and paper.
   Reports saved before 1423 carry none of it. KEEP IN SYNC with ensurePrintFix() in index.html. */
const REPORT_PRINT = '<style id="crReportPrint">.chip.mod{color:#1b1b1b !important}@media print{' +
  '.cover{min-height:0 !important;break-after:page}' +
  '.cover-logo{width:190px !important;margin:0 0 5mm !important}.cover-band{margin-bottom:6mm !important}' +
  '.cover-photo{height:85mm !important}.cover-title{margin:6mm 0 1mm !important}.cover-sub{margin-bottom:5mm !important}' +
  '.cover-meta{padding-top:4mm !important}.cover-meta td{padding:2px 0 !important}' +
  '[data-cardinal-summary-heading] ~ .sign,[data-cardinal-summary-heading] ~ .sign .col{break-inside:avoid}' +
  '[data-cardinal-summary-heading] ~ table.concerns tr:first-child{break-after:avoid}}</style>';
/* D: the printed master, on the page, right above the signatures */
function masterCard(master) {
  const href = master.href + '#page=' + master.page;
  return '<div id="crMasterCard" style="border:1.5px solid #C8202E;border-radius:10px;padding:12px 14px;margin:16px 0;background:#fff7f7;' +
    'font-family:\'Segoe UI\',Arial,sans-serif;color:#1b1b1b;">' +
    '<div style="font-weight:800;font-size:1.05em;">Terms and Conditions &amp; Notice of Cancellation</div>' +
    '<div style="margin-top:4px;line-height:1.45;">Your agreement includes the Terms and Conditions and both Notice of Cancellation copies. Please read them before you sign.</div>' +
    '<a id="crMasterOpen" href="' + href + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px;min-height:44px;line-height:44px;' +
    'padding:0 16px;border-radius:8px;background:#C8202E;color:#ffffff;font-weight:800;text-decoration:none;">Open the Terms &amp; Notice (PDF)</a></div>';
}
function withMasterCard(html, master) {
  const at = html.indexOf('data-sig="buyer"', Math.max(0, html.search(/<body[^>]*>/i)));
  const tbl = at === -1 ? -1 : html.lastIndexOf('<table', at);
  if (tbl === -1) return html;
  return html.slice(0, tbl) + masterCard(master) + '\n' + html.slice(tbl);
}
"""

SHARE_EDITS = [
    # 1. the shared block, after SLOT_RX
    ('const SLOT_RX = /class="sigslot" data-sig="buyer"/;\n',
     'const SLOT_RX = /class="sigslot" data-sig="buyer"/;\n'
     '/* D: an agreement whose buyer has signed (in person or here) but whose NAMED co-buyer has not */\n'
     'const COSLOT_RX = /class="sigslot" data-sig="cobuyer"/;\n'
     'const BUYER_SIGNED_RX = /class="sigslot signed" data-sig="buyer"/;\n' + MASTER_BLOCK + SHARE_CONTRACT_CONSTS),
    # 2. a table's totals print once, after its last row (E's 1424 estimate rule; old estimates and every contract)
    ("      '@media print{.page-break:not(h2){display:none !important}h2.sec{break-after:avoid}' +",
     "      '@media print{.page-break:not(h2){display:none !important}h2.sec{break-after:avoid}table.items tfoot{display:table-row-group}' +"),
    # 3. the editor's "Tap a box to check it" hint is not the client's
    ("'<style id=\"shareFix\">.howto{display:none !important}#restoreVeil{display:none !important}'",
     "'<style id=\"shareFix\">.howto{display:none !important}#restoreVeil{display:none !important}.items-hint{display:none !important}'"),
    # 4. an h3 left standing over a block hidden as empty (the report's Overall Condition Assessment)
    ("      'd.querySelectorAll(\"p, li\").forEach(function(el){if(el.closest(\".fig\"))return;' +\n"
     "      'if(blank(el))el.setAttribute(\"data-emptyblock\",\"1\");});' +\n",
     "      'd.querySelectorAll(\"p, li\").forEach(function(el){if(el.closest(\".fig\"))return;' +\n"
     "      'if(blank(el))el.setAttribute(\"data-emptyblock\",\"1\");});' +\n"
     "      /* D: an h3 whose whole block was hidden as empty is not left standing alone */\n"
     "      'd.querySelectorAll(\"h3\").forEach(function(h){if(h.closest(\".fig\"))return;var el=h.nextElementSibling,saw=0,keep=0;' +\n"
     "      'while(el&&!/^H[23]$/.test(el.tagName)&&!(el.classList&&el.classList.contains(\"page-break\"))){saw=1;' +\n"
     "      'if(!(el.getAttribute(\"data-emptyblock\")||el.getAttribute(\"data-emptyph\")||el.getAttribute(\"data-emptyrow\")||el.getAttribute(\"data-emptyfig\"))){keep=1;break;}' +\n"
     "      'el=el.nextElementSibling;}if(saw&&!keep)h.setAttribute(\"data-emptyblock\",\"1\");});' +\n"),
    # 5. the Contents heading's mark is not a section number (share numbered it 1, so every section read one high)
    ("      'if(!sp||h.getAttribute(\"data-emptysec\"))return;num++;sp.textContent=String(num);});' +\n",
     "      'if(!sp||h.getAttribute(\"data-emptysec\"))return;' +\n"
     "      'if(!/^\\\\s*\\\\d+\\\\s*$/.test(sp.textContent||\"\"))return;' +   /* D: the Contents mark is not a number */\n"
     "      'num++;sp.textContent=String(num);});' +\n"),
]

SHARE_VIEW_OLD = """    let letterView = false;   // 1279: LETTER_UI zooms the bars back up on this page
    /* 1402: any est-head document — invoices (no table.items) and templates whose table carries an id were
       missed, and with no viewport meta a phone laid them out at 980px: a 17px Pay button. */
    if (/class="est-head"/.test(html)) {"""
SHARE_VIEW_NEW = """    let letterView = false;   // 1279: LETTER_UI zooms the bars back up on this page
    const isInvoiceDoc = /^invoice/i.test(String(rows[0].title || '').trim());   // 1313 (moved up for D)
    /* D: a contract — a Construction Agreement, the Service Contract, an uploaded signed one */
    const src0 = String(rows[0].html || '');
    const isContractDoc = !isInvoiceDoc && (/^contract/i.test(String(rows[0].title || '').trim()) || /data-sig="buyer"/.test(src0));
    const master = isContractDoc ? masterFor(src0) : null;
    /* 1402: any est-head document — invoices (no table.items) and templates whose table carries an id were
       missed, and with no viewport meta a phone laid them out at 980px: a 17px Pay button. */
    if (/class="est-head"/.test(html) && !isContractDoc) {"""

SHARE_VIEW2_OLD = """      else html = LV + html;
    }
    // 1313: an invoice is paid, never signed — even one made before invoices lost their
    // signature line. Without this, Accept & Sign took the place of the pay bar.
    const isInvoiceDoc = /^invoice/i.test(String(rows[0].title || '').trim());
    const signable = !isInvoiceDoc && (SIGN_RX.test(html) || SLOT_RX.test(html)) && !html.includes('data-clientsigned');
    if (signable) {
      const ui = signUi(t);"""
SHARE_VIEW2_NEW = """      else html = LV + html;
    } else if (isContractDoc) {
      /* D: the contract at the phone's width (CONTRACT_PHONE), the menu path replaced by the printed
         master, the master card above the signatures, and every answer frozen (CONTRACT_FIX) */
      if (/<meta name="viewport" content="[^"]*">/.test(html)) html = html.replace(/<meta name="viewport" content="[^"]*">/, CONTRACT_PHONE);
      else if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + CONTRACT_PHONE);
      else html = CONTRACT_PHONE + html;
      html = masterLinked(html, master, '');
      if (master) html = withMasterCard(html, master);
      html = html.includes('</head>') ? html.replace('</head>', CONTRACT_FIX + '\\n</head>') : CONTRACT_FIX + html;
    } else if (!/<meta name="viewport"/i.test(html)) {
      /* D: an inspection report carries no viewport meta, so a phone laid it out at 980px and
         autosized its paragraphs to ~20px over ~6px tables; its own 640px rules never fired. */
      const RV = '<meta name="viewport" content="width=device-width, initial-scale=1"><style id="crReportPhone">html{-webkit-text-size-adjust:100%;text-size-adjust:100%}@media screen and (max-width:640px){table{max-width:100%}img{max-width:100%;height:auto}.toc-row .t{white-space:normal !important;min-width:0}}</style>';
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + RV);
      else html = RV + html;
    }
    if (!isContractDoc && /data-cardinal-summary-heading/.test(src0)) {   // D: a report's print rules (REPORT_PRINT)
      html = html.includes('</head>') ? html.replace('</head>', REPORT_PRINT + '\\n</head>') : REPORT_PRINT + html;
    }
    // 1313: an invoice is paid, never signed — even one made before invoices lost their
    // signature line. Without this, Accept & Sign took the place of the pay bar.
    const buyerOpen = !isInvoiceDoc && (SIGN_RX.test(html) || SLOT_RX.test(html)) && !html.includes('data-clientsigned');
    /* D: a co-buyer named on the agreement who has not signed yet signs from the same link */
    const coName = cellText(src0, 'Co-buyer');
    const coOpen = !isInvoiceDoc && !buyerOpen && !!coName && COSLOT_RX.test(src0) && BUYER_SIGNED_RX.test(src0);
    const signable = buyerOpen || coOpen;
    if (signable) {
      const cellEmail = cellText(src0, 'Email');
      const ui = signUi(t, { mode: coOpen ? 'cobuyer' : 'buyer',
        initials: buyerOpen ? (src0.match(INIT_RX) || []).length : 0,
        coName: (coOpen || COSLOT_RX.test(src0)) ? coName : '',
        email: EMAIL_RX.test(cellEmail) ? cellEmail : '', master, cancel: cancelLine(src0) });"""

# ─────────────────────────────────────────────────────────────────────────────
# api/clientsign.js
# ─────────────────────────────────────────────────────────────────────────────
CS_CONSTS_OLD = "const SLOT_DATE_RX = /<span class=\"sigdate\" data-sigdate=\"buyer\">[\\s\\S]*?<\\/span><\\/span>/;\n"
CS_CONSTS_NEW = CS_CONSTS_OLD + r"""const APP_ORIGIN = 'https://app.cardinalroster.com';
""" + MASTER_BLOCK + r"""/* D: stamp one signature slot (buyer / cobuyer) the way the in-person pad does */
function stampSlot(html, who, sig, nm, date) {
  const slot = new RegExp('<span class="sigslot" data-sig="' + who + '">[\\s\\S]*?<\\/span><\\/span>');
  const dcell = new RegExp('<span class="sigdate" data-sigdate="' + who + '">[\\s\\S]*?<\\/span><\\/span>');
  return html.replace(slot, '<span class="sigslot signed" data-sig="' + who + '" data-clientsigned="1">' +
      '<img src="' + sig + '" alt="' + who + ' signature"></span>')
    .replace(dcell, '<span class="sigdate" data-sigdate="' + who + '">' + date +
      ' \u00b7 signed via secure link by ' + esc(nm) + '</span>');
}
const SIG_OK = (s) => !!s && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s) && s.length <= 300000;
/* D: the SIGNER's own copy. The agreement they just signed says the buyer "has received a completed,
   signed and dated copy", and nothing was ever sent to them. Sent only to the address the signer typed
   on the sheet (prefilled from the agreement's own Email line) — never a guessed one. Best-effort, through
   the Resend account this route already uses: the signature is saved before this runs. Returns
   'sent' | 'failed' | 'none'. */
async function sendSignedCopy(rk, o) {
  if (!rk || !o.to) return 'none';
  try {
    const from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
    const link = APP_ORIGIN + '/api/share?t=' + encodeURIComponent(o.token);
    const first = String(o.name || '').trim().split(/\s+/)[0] || '';
    const what = o.master ? 'your ' + o.master.name : 'your ' + (o.title || 'document');
    const fileBase = String(o.title || 'Cardinal document').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Cardinal document';
    const copyHtml = masterLinked(o.html, o.master, APP_ORIGIN).replace(/(src|href)="\/(?!\/)/g, '$1="' + APP_ORIGIN + '/');
    const attachments = [{ filename: fileBase + ' (signed).html', content: Buffer.from(copyHtml, 'utf8').toString('base64') }];
    let pdf = false;
    if (o.master) {
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch(APP_ORIGIN + o.master.href, { signal: ctl.signal });
        clearTimeout(tm);
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length > 1000 && buf.length < 8000000 && buf.slice(0, 4).toString('latin1') === '%PDF') {
            attachments.push({ filename: o.master.name + ' - Terms and Notice of Cancellation.pdf', content: buf.toString('base64') });
            pdf = true;
          }
        }
      } catch (_p) { /* the link below still reaches it */ }
    }
    const mhref = o.master ? APP_ORIGIN + o.master.href + '#page=' + o.master.page : '';
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rk}` },
      body: JSON.stringify({
        from, to: [o.to], reply_to: o.replyTo,
        subject: `Your signed ${o.master ? o.master.name : 'document'} \u2014 Cardinal Roofing & Renovations`,
        html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#C8202E;border-bottom:3px solid #C8202E;padding-bottom:6px;">Cardinal Roofing &amp; Renovations</h2>
      <p>Hi${first ? ' ' + esc(first) : ''},</p>
      <p>Thank you \u2014 here is ${esc(what)}, signed ${esc(o.date)}. Your signed copy is attached, and you can open it online any time:
      <a href="${esc(link)}">${esc(link)}</a></p>
      ${o.master ? `<p><b>Your Terms and Conditions and both Notice of Cancellation copies</b> ${pdf ? 'are attached as a PDF, and are' : 'are'} online here:
      <a href="${esc(mhref)}">${esc(o.master.name)} (PDF, pages ${o.master.pages})</a></p>` : ''}
      ${o.cancel ? `<p><b>${esc(o.cancel)}</b></p>` : ''}
      <p>Questions? Reply to this email or call 937.576.6753.</p>
      <p style="color:#5c5c5c;">Cardinal Roofing and Renovations, LLC \u00b7 5735 Webster Street, Dayton, OH 45414</p>
    </div>`,
        attachments
      })
    });
    return r.ok ? 'sent' : 'failed';
  } catch (_e) { return 'failed'; }
}
"""

CS_BODY_OLD = """    const { t, sig, name } = req.body || {};
    if (!/^[a-f0-9-]{20,60}$/i.test(t || '')) { res.status(400).json({ error: 'Invalid link' }); return; }
    if (!sig || !/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 300000) {
      res.status(400).json({ error: 'Invalid signature image' }); return;
    }
    const cleanName = String(name || '').trim().slice(0, 80);
    if (!cleanName) { res.status(400).json({ error: 'Name is required' }); return; }
"""
CS_BODY_NEW = """    const { t, sig, name, role, initials, email, cobuyer } = req.body || {};
    if (!/^[a-f0-9-]{20,60}$/i.test(t || '')) { res.status(400).json({ error: 'Invalid link' }); return; }
    if (!sig || !/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 300000) {
      res.status(400).json({ error: 'Invalid signature image' }); return;
    }
    const cleanName = String(name || '').trim().slice(0, 80);
    if (!cleanName) { res.status(400).json({ error: 'Name is required' }); return; }
    /* D: the sheet's new fields. All optional, so a page served before this build still signs. */
    const isCo = role === 'cobuyer';
    const ini = String(initials || '').replace(/[^A-Za-z.\\- ]/g, '').trim().slice(0, 6);
    const copyTo = String(email || '').trim().slice(0, 120);
    if (copyTo && !EMAIL_RX.test(copyTo)) { res.status(400).json({ error: 'Please check the email address, or leave it blank.' }); return; }
    let coSig = null, coNm = '';
    if (!isCo && cobuyer && typeof cobuyer === 'object') {
      if (!SIG_OK(cobuyer.sig)) { res.status(400).json({ error: 'Invalid co-buyer signature image' }); return; }
      coNm = String(cobuyer.name || '').trim().slice(0, 80);
      if (!coNm) { res.status(400).json({ error: 'The co-buyer\\u2019s name is required' }); return; }
      coSig = cobuyer.sig;
    }
"""

CS_LOOKUP_OLD = """    const doc = rows[0];

    const hasFooter = SIGN_RX.test(doc.html);"""
CS_LOOKUP_NEW = """    const doc = rows[0];
    const resendKey0 = process.env.RESEND_API_KEY;
    const master = masterFor(doc.html);
    const replyTo = /@cardinalrenovations\\.net$/i.test(String(doc.created_by || '')) ? doc.created_by : ADMIN;

    /* D: a NAMED co-buyer who did not sign with the buyer signs later from the same link. Only the
       co-buyer row moves: no signed_at, no stage, no Curtis alert — those were the buyer's. */
    if (isCo) {
      const coName = cellText(doc.html, 'Co-buyer');
      if (!coName || !/class="sigslot" data-sig="cobuyer"/.test(doc.html) || !/class="sigslot signed" data-sig="buyer"/.test(doc.html)) {
        res.status(409).json({ error: 'This document has already been signed.' }); return;
      }
      const coDate = new Date().toLocaleDateString('en-US',
        { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' });
      const coHtml = stampSlot(doc.html, 'cobuyer', sig, cleanName, coDate);
      const upc = await fetch(
        `${SUPABASE_URL}/rest/v1/inspection_reports?id=eq.${doc.id}`,
        { method: 'PATCH',
          headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ html: coHtml, updated_at: new Date().toISOString() }) });
      if (!upc.ok) throw new Error('save failed: ' + (await upc.text()).slice(0, 200));
      const copyC = await sendSignedCopy(resendKey0, { to: copyTo, name: cleanName, title: doc.title, html: coHtml, token: t,
        master, cancel: cancelLine(doc.html), date: coDate, replyTo });
      if (resendKey0) {
        try {
          const from = process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>';
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey0}` },
            body: JSON.stringify({
              from, to: [...new Set([doc.created_by, ...ADMINS].filter(Boolean))],
              subject: `Co-buyer signed: ${doc.title}`,
              html: `<div style="font-family:'Segoe UI',Arial,sans-serif;"><p><b>${esc(doc.title)}</b>: the co-buyer, <b>${esc(cleanName)}</b>, signed via secure link (${coDate}).</p>
                <p>${copyC === 'sent' ? 'A signed copy was emailed to ' + esc(copyTo) + '.' : 'No copy was emailed to the co-buyer \\u2014 hand them one.'}</p></div>`
            })
          });
        } catch (_n) {}
      }
      res.status(200).json({ ok: true, copy: copyC }); return;
    }

    const hasFooter = SIGN_RX.test(doc.html);"""

CS_STAMP_OLD = """      newHtml = newHtml.replace(SLOT_DATE_RX,
        '<span class="sigdate" data-sigdate="buyer">' + date +
        ' \\u00b7 signed via secure link by ' + esc(cleanName) + '</span>');
    }
"""
CS_STAMP_NEW = """      newHtml = newHtml.replace(SLOT_DATE_RX,
        '<span class="sigdate" data-sigdate="buyer">' + date +
        ' \\u00b7 signed via secure link by ' + esc(cleanName) + '</span>');
    }
    /* D: the buyer's typed initials go into every "Initials [__]" the agreement left blank, and a
       co-buyer who signed on the same sheet goes into the co-buyer row */
    let nInit = 0;
    if (ini) newHtml = newHtml.replace(INIT_RX, (all, pre) => { nInit++;
      return pre + '<span class="initials" data-clientinit="1" style="font-weight:700;border-bottom:1px solid #1b1b1b;padding:0 4px;">' + esc(ini) + '</span>'; });
    const coSigned = !!(coSig && hasSlot && /class="sigslot" data-sig="cobuyer"/.test(newHtml));
    if (coSigned) newHtml = stampSlot(newHtml, 'cobuyer', coSig, coNm, date);
"""

CS_TAIL_OLD = """    // notify the rep + admin (best-effort)
    const resendKey = process.env.RESEND_API_KEY;"""
CS_TAIL_NEW = """    // D: the signer's own signed copy, with the printed master (Terms + both notices) when it is an agreement
    const copy = await sendSignedCopy(resendKey0, { to: copyTo, name: cleanName, title: doc.title, html: newHtml, token: t,
      master, cancel: cancelLine(doc.html), date, replyTo });
    const copyLine = copy === 'sent' ? `A signed copy${master ? ', with the Terms and both Notice of Cancellation copies,' : ''} was emailed to the client at ${esc(copyTo)}.`
      : (copyTo ? `The client\\u2019s signed copy to ${esc(copyTo)} could not be sent \\u2014 send them one.` : 'The client left no email for a signed copy \\u2014 give them one.');

    // notify the rep + admin (best-effort)
    const resendKey = process.env.RESEND_API_KEY;"""

CS_MAIL_OLD = """              <p>The signed copy is saved in Cardinal Client Resources and the client's stage moved to <b>Approved</b>.</p>
            </div>`"""
CS_MAIL_NEW = """              <p>The signed copy is saved in Cardinal Client Resources and the client's stage moved to <b>Approved</b>.</p>
              ${nInit ? `<p>Initials (${esc(ini)}) added in ${nInit} ${nInit === 1 ? 'place' : 'places'}.</p>` : ''}
              ${coSigned ? `<p>The co-buyer, <b>${esc(coNm)}</b>, signed on the same sheet.</p>` : ''}
              <p>${copyLine}</p>
            </div>`"""

CS_OK_OLD = """    res.status(200).json({ ok: true });
  } catch (err) {"""
CS_OK_NEW = """    res.status(200).json({ ok: true, copy });
  } catch (err) {"""

# ─────────────────────────────────────────────────────────────────────────────
# api/senddoc.js
# ─────────────────────────────────────────────────────────────────────────────
SD_IMPORT_OLD = "import { isStaff } from './_staff.js';\n"
SD_IMPORT_NEW = SD_IMPORT_OLD + "const APP_ORIGIN = 'https://app.cardinalroster.com';\n" + MASTER_BLOCK

SD_NAME_OLD = "    const safeName = String(title).replace(/[^\\w\\- ]+/g, '').slice(0, 60) || 'Cardinal Document';\n"
SD_NAME_NEW = ("    /* D: 'Contract — Roofing — X' lost its dashes and left 'Contract  Roofing  X' (double spaces) */\n"
               "    const safeName = String(title).replace(/[^\\w\\- ]+/g, '').replace(/\\s+/g, ' ').trim().slice(0, 60) || 'Cardinal Document';\n")

SD_SEND_OLD = """    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from, to: [to],"""
SD_SEND_NEW = """    /* D: an emailed Construction Agreement carries its printed master — the Terms and both Notice of
       Cancellation copies it says are attached — and its menu-path sentence links to it. Homeowner
       path only; best-effort: a failed fetch sends the agreement with the link alone. */
    const master = isCarrier ? null : masterFor(html);
    const sendHtml = master ? masterLinked(html, master, APP_ORIGIN) : html;
    const extra = [];
    if (master) {
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4000);
        const pr = await fetch(APP_ORIGIN + master.href, { signal: ctl.signal });
        clearTimeout(tm);
        if (pr.ok) {
          const buf = Buffer.from(await pr.arrayBuffer());
          if (buf.length > 1000 && buf.length < 8000000 && buf.slice(0, 4).toString('latin1') === '%PDF') {
            extra.push({ filename: master.name + ' - Terms and Notice of Cancellation.pdf', content: buf.toString('base64') });
          }
        }
      } catch (_p) {}
    }
    const masterP = master ? `<p><b>Your Terms and Conditions and both Notice of Cancellation copies</b> ${extra.length ? 'are attached as a PDF, and are' : 'are'} online here:
      <a href="${esc(APP_ORIGIN + master.href + '#page=' + master.page)}">${esc(master.name)} (PDF, pages ${master.pages})</a></p>` : '';
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from, to: [to],"""

SD_BODY_OLD = """        html: isCarrier ? carrierBody : (msgHtml ? editedBody : body),
        attachments: [{ filename: safeName + '.html',
                        content: Buffer.from(html, 'utf8').toString('base64') }]"""
SD_BODY_NEW = """        html: isCarrier ? carrierBody : (msgHtml ? editedBody : body).replace(/(\\s*)<\\/div>\\s*$/, (m, sp) => (masterP ? sp + masterP : '') + m),
        attachments: [{ filename: safeName + '.html',
                        content: Buffer.from(sendHtml, 'utf8').toString('base64') }].concat(extra)"""


def sha(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def patch_share(src):
    i = src.index(SHARE_SIGNUI_OLD_START)
    j = src.index(SHARE_SIGNUI_OLD_END)
    assert src.count(SHARE_SIGNUI_OLD_START) == 1 and src.count(SHARE_SIGNUI_OLD_END) == 1
    old = src[i:j]
    assert old.rstrip().endswith('</script>`;\n}'), repr(old[-40:])
    assert old.count('function signUi(') == 1
    src = src[:i] + SHARE_SIGNUI_NEW.lstrip('\n') + src[j:]
    for a, b in SHARE_EDITS:
        src = pl.sub(src, a, b)
    src = pl.sub(src, SHARE_VIEW_OLD, SHARE_VIEW_NEW)
    src = pl.sub(src, SHARE_VIEW2_OLD, SHARE_VIEW2_NEW)
    return src


def patch_clientsign(src):
    src = pl.sub(src, CS_CONSTS_OLD, CS_CONSTS_NEW)
    src = pl.sub(src, CS_BODY_OLD, CS_BODY_NEW)
    src = pl.sub(src, CS_LOOKUP_OLD, CS_LOOKUP_NEW)
    src = pl.sub(src, CS_STAMP_OLD, CS_STAMP_NEW)
    src = pl.sub(src, CS_TAIL_OLD, CS_TAIL_NEW)
    src = pl.sub(src, CS_MAIL_OLD, CS_MAIL_NEW)
    src = pl.sub(src, CS_OK_OLD, CS_OK_NEW)
    return src


def patch_senddoc(src):
    src = pl.sub(src, SD_IMPORT_OLD, SD_IMPORT_NEW)
    src = pl.sub(src, SD_NAME_OLD, SD_NAME_NEW)
    src = pl.sub(src, SD_SEND_OLD, SD_SEND_NEW)
    src = pl.sub(src, SD_BODY_OLD, SD_BODY_NEW)
    return src


def patch_vercel(src):
    d = json.loads(src)
    fn = d.setdefault('functions', {})
    assert 'api/clientsign.js' not in fn, 'clientsign already has a functions entry'
    old = '    "api/supplement.js": {\n      "maxDuration": 60\n    }\n'
    new = ('    "api/supplement.js": {\n      "maxDuration": 60\n    },\n'
           '    "api/clientsign.js": {\n      "maxDuration": 30\n    }\n')
    out = pl.sub(src, old, new)
    assert json.loads(out)['functions']['api/clientsign.js'] == {'maxDuration': 30}
    return out


JOBS = [('share.js', patch_share), ('clientsign.js', patch_clientsign), ('senddoc.js', patch_senddoc)]

if __name__ == '__main__':
    outs = {}
    for name, fn in JOBS:
        src = pl.load(os.path.join(SRC, name))
        outs[name] = fn(src)
    vbase = os.path.join(HERE, 'api_base', 'vercel.json')   # vercel.json as of 1422
    vout = patch_vercel(pl.load(vbase))
    # the shared block really is byte-identical in all three
    for name in outs:
        assert outs[name].count(MASTER_BLOCK) == 1, name
    if APPLY:
        for name in outs:
            dst = os.path.join(REPO, 'api', name)
            cur = pl.load(dst)
            ref = pl.load(os.path.join(HERE, 'api_base', name))
            if cur != ref:
                raise SystemExit(f'REFUSED: repo api/{name} is not the 1422 base (someone changed it) — merge by hand')
            pl.write_atomic(dst, outs[name])
            print('applied', dst, sha(outs[name])[:12])
        if pl.load(os.path.join(REPO, 'vercel.json')) != pl.load(vbase):
            raise SystemExit('REFUSED: repo vercel.json is not the 1422 base — add the clientsign entry by hand')
        pl.write_atomic(os.path.join(REPO, 'vercel.json'), vout)
        print('applied', os.path.join(REPO, 'vercel.json'))
    else:
        os.makedirs(OUT, exist_ok=True)
        for name in outs:
            pl.write_atomic(os.path.join(OUT, name), outs[name])
            print('wrote', os.path.join(OUT, name), len(outs[name]), sha(outs[name])[:12])
        pl.write_atomic(os.path.join(OUT, '..', 'vercel.json'), vout)
        print('wrote', os.path.normpath(os.path.join(OUT, '..', 'vercel.json')))
