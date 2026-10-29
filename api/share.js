// /api/share.js — public read-only view of a document via unguessable token.
// GET /api/share?t=<share_token>  → serves the stored document HTML.
// If the document has a signature block that hasn't been client-signed yet,
// an "Accept & Sign" bar is injected so the client can sign remotely
// (handled by /api/clientsign).
// Requires SUPABASE_SERVICE_ROLE_KEY.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SIGN_RX = /(<div class="line">)(<\/div>\s*<div class="lbl">\s*Client Acceptance)([^<]*)(<\/div>)/;
/* 1015: the three Construction Agreements carry a Buyer/Co-buyer/Contractor
   sigslot table instead of the Client Acceptance footer, so SIGN_RX never
   matched them and the share page was silently view-only — the app's own
   share dialog promised remote signing it could not deliver. An UNFILLED
   buyer slot is exactly class="sigslot" (the in-person pad rewrites it to
   class="sigslot signed" when filled), so this cannot double-offer signing. */
const SLOT_RX = /class="sigslot" data-sig="buyer"/;
/* D: an agreement whose buyer has signed (in person or here) but whose NAMED co-buyer has not */
const COSLOT_RX = /class="sigslot" data-sig="cobuyer"/;
const BUYER_SIGNED_RX = /class="sigslot signed" data-sig="buyer"/;
/* D (contracts + client documents judges): a Construction Agreement tells the buyer its Terms and
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

const escH = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

// ── the payment bar (client-facing) ─────────────────────────────────────────
// owedOn: what THIS document owes, computed server-side. KEEP IN SYNC with the
// identical copy in api/pay.js, which does the authoritative charge — this copy
// only renders the amount for display.
/* 1199: FAIL CLOSED. Every lookup below used to be optional — `collected`
   started at 0 and only grew when the collections request happened to succeed,
   so one 503 on that request turned an $8,000 balance into a $10,000 checkout:
   a failed read of the payment history was indistinguishable from an empty
   payment history. Now any failed lookup throws LookupFailed, the caller says
   the balance could not be verified, and nobody is offered a number the ledger
   did not confirm. A failed read is never an empty ledger.
   KEEP IN SYNC: this class, readRows and owedOn are byte-identical in
   api/pay.js and api/share.js, and gate_1199 asserts it. */
/* 1377 (W7): is this job an insurance job? An insurance invoice bills the whole job, most of it the carrier's money,
   so it carries no pay link until it bills only the homeowner's part. A failed read answers true: the safe side is
   no pay button, never one that may ask the homeowner for the carrier's money. */
async function isInsuranceJob(sbHeaders, projectId) {
  if (!projectId) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=checklist&limit=1`, { headers: sbHeaders });
    if (!r.ok) return true;
    const row = (await r.json())[0];
    if (!row) return false;
    let ck = {}; try { ck = typeof row.checklist === 'string' ? JSON.parse(row.checklist || '{}') : (row.checklist || {}); } catch (_) {}
    const L = ck.lead || {};
    return String(L.claim_type || '').toLowerCase() === 'insurance' || (!L.claim_type && !!L.insurance);
  } catch (_) { return true; }
}
class LookupFailed extends Error {
  constructor(what) { super('lookup failed: ' + what); this.code = 'LOOKUP_FAILED'; }
}
async function readRows(sbHeaders, what, url) {
  let r;
  try { r = await fetch(url, { headers: sbHeaders }); }
  catch (e) { throw new LookupFailed(what + ' unreachable'); }
  if (!r.ok) throw new LookupFailed(what + ' ' + r.status);
  return r.json();
}
async function owedOn(sbHeaders, rep) {
  const isInvoice = /^invoice/i.test(String(rep.title || '').trim());

  // money already collected on this job — a failed read throws, never reads as $0
  let collected = 0;
  for (const r of await readRows(sbHeaders, 'collections',
      `${SUPABASE_URL}/rest/v1/collections?project_id=eq.${rep.project_id}&select=amount`)) {
    collected += Number(r.amount) || 0;
  }

  if (isInvoice) {
    // balance due = signed-contract total for the job − collected (jobFinance's
    // contracted-job case). Falls back to the invoice's own stored total.
    let contractTotal = 0, coTotal = 0;
    for (const r of await readRows(sbHeaders, 'inspection_reports',
        `${SUPABASE_URL}/rest/v1/inspection_reports?project_id=eq.${rep.project_id}&select=title,total,signed_at,extra_total`)) {
      if (/^contract/i.test(String(r.title || '').trim()) && r.signed_at && Number(r.total) > 0) {
        contractTotal += Number(r.total);
      }
      // 1323: a signed change order adds to the job (jobFinance() does the same)
      if (/^change order/i.test(String(r.title || '').trim()) && r.signed_at && Number(r.total) > 0) coTotal += Number(r.total);
      // 1357: an invoice's EXTRA lines add to the job, like a change order (jobFinance() does the same)
      if (/^invoice/i.test(String(r.title || '').trim()) && Number(r.extra_total) > 0) coTotal += Number(r.extra_total);
    }
    // 1314: the job total is jobFinance()'s, not a narrower one. Signed contract
    // documents OR the contracts table (whichever carries more — never both), plus
    // manual extras; the invoice's own stored total only when neither exists.
    let tableTotal = 0;
    for (const r of await readRows(sbHeaders, 'contracts',
        `${SUPABASE_URL}/rest/v1/contracts?project_id=eq.${rep.project_id}&select=total,homeowner_signed_at,voided_at`)) {
      if (r.homeowner_signed_at && !r.voided_at) tableTotal += Number(r.total) || 0;
    }
    const pj = (await readRows(sbHeaders, 'projects',
        `${SUPABASE_URL}/rest/v1/projects?id=eq.${rep.project_id}&select=checklist&limit=1`))[0];
    let manual = 0;
    try {
      const ck = pj && (typeof pj.checklist === 'string' ? JSON.parse(pj.checklist || '{}') : (pj.checklist || {}));
      manual = Number(ck && ck.manual_value) || 0;
    } catch (_) { manual = 0; }
    const signedTotal = Math.max(contractTotal, tableTotal);
    // 1336: no signed contract -> the job is priced like jobFinance(): the higher of the manual value and the
    // ACCEPTED estimate, plus signed change orders, read live. The invoice's own frozen total is only the last
    // resort, so a change order signed after the invoice still reaches the pay link.
    let accEst = 0;
    if (!(signedTotal > 0)) {
      for (const e of await readRows(sbHeaders, 'estimates',
          `${SUPABASE_URL}/rest/v1/estimates?project_id=eq.${rep.project_id}&status=in.(accepted,signed)&select=total,archived`)) {
        if (!e.archived && Number(e.total) > 0) accEst += Number(e.total);   // 1344: accepted estimates add up
      }
    }
    const base = Math.max(manual, accEst);
    const jobTotal = signedTotal > 0 ? signedTotal + manual + coTotal
                   : (base > 0 ? base + coTotal : (Number(rep.total) || 0));
    return { cents: Math.round((jobTotal - collected) * 100), label: 'Amount due',
             totalCents: Math.round(jobTotal * 100), paidCents: Math.round(collected * 100) };   // 1320: the invoice's summary
  }

  // estimate / contract → the deposit (reachable via either the estimate doc or
  // the contract doc — estimates carries both doc_id and contract_doc_id)
  const est = (await readRows(sbHeaders, 'estimates',
      `${SUPABASE_URL}/rest/v1/estimates?or=(doc_id.eq.${rep.id},contract_doc_id.eq.${rep.id})&select=deposit_amount&limit=1`))[0];
  const deposit = Number(est && est.deposit_amount) || 0;
  return { cents: Math.round((deposit - collected) * 100), label: 'Deposit' };
}

/* 1320: ONE balance on an invoice. The stored SUMMARY was frozen the day the invoice was
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

/* 1279: CARD FEE. Theo's pick — a card pays a 3% processing fee on top, a bank
   (ACH) payment pays none. He was told card-network rules bar surcharging DEBIT
   cards and chose to charge debit too. KEEP IN SYNC: CARD_FEE_PCT and cardFeeCents
   are byte-identical in api/pay.js and api/share.js (share shows both totals). */
const CARD_FEE_PCT = 3;
const cardFeeCents = (cents) => Math.round(cents * CARD_FEE_PCT / 100);

/* 1279: an estimate is served at a 900px Letter viewport (1278), so a phone
   shrinks the page to fit — and every fixed bar on it with it, to ~43%: a pay
   button a thumb can barely hit. Zoom the bars (and the signing sheet) back up
   by 1/scale; the document itself stays the Letter page. */
const LETTER_UI = `<script id="crLetterUi">(function(){
  var IDS = ['crPayBar', 'crPaySheet', 'csBar', 'csOverlay'];   // 1280: + the pay sheet
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

/* 1378 (W7 option 1): what the HOMEOWNER owes on an insurance invoice — "Your total out of pocket" from the
   INSURANCE & YOUR PART box (1324) on the newest signed contract, less what the homeowner has paid (carrier and
   partner money is not theirs). null when no signed contract carries the figure: that invoice goes out by hand
   (1377). A failed read throws LookupFailed. KEEP IN SYNC: byte-identical in api/pay.js and api/share.js, and the
   same rule as crInsPart() in index.html. */
function oopFromHtml(html) {
  const m = /data-ip="oop"[^>]*>\s*([^<]*)</.exec(String(html || ''));
  if (!m) return null;
  const t = m[1].trim();
  if (!t || t.charAt(0) === '[') return null;
  const v = Number(t.replace(/[^0-9.\-]/g, ''));
  return isFinite(v) && v > 0 ? v : null;
}
async function homeOwedOn(sbHeaders, rep) {
  let part = null, at = '';
  for (const r of await readRows(sbHeaders, 'inspection_reports',
      `${SUPABASE_URL}/rest/v1/inspection_reports?project_id=eq.${rep.project_id}&select=title,html,signed_at`)) {
    if (!/^contract/i.test(String(r.title || '').trim()) || !r.signed_at) continue;
    const v = oopFromHtml(r.html);
    if (v !== null && String(r.signed_at) > at) { part = v; at = String(r.signed_at); }
  }
  if (part === null) return null;
  let paid = 0;
  for (const c of await readRows(sbHeaders, 'collections',
      `${SUPABASE_URL}/rest/v1/collections?project_id=eq.${rep.project_id}&select=amount,source`)) {
    const src = String(c.source || '').toLowerCase();
    if (src !== 'insurance' && src !== 'partner') paid += Number(c.amount) || 0;
  }
  return { cents: Math.round((part - paid) * 100), label: 'Your part',
           totalCents: Math.round(part * 100), paidCents: Math.round(paid * 100) };
}

// payUi: a polished, trustworthy pay bar. It links to /api/pay?t=… (which does
// the server-side charge); the amount shown here is display only.
function payUi(token, cents, label, name) {
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
}

// 1402: the client is back from checkout. A bank payment takes days to clear, so the balance has not moved
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
function unavailableUi() {
  return `
<div id="crPayBar" data-cr-unavailable="1" style="position:fixed;left:0;right:0;bottom:0;z-index:9999;
  padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));pointer-events:none;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="pointer-events:auto;max-width:520px;margin:0 auto;background:#ffffff;
    border:1px solid #ece7e3;border-radius:18px 18px 14px 14px;
    box-shadow:0 -1px 8px rgba(20,10,8,.05),0 16px 44px rgba(20,10,8,.20);padding:15px 18px 13px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:#6b5d52;">Balance check unavailable</div>
    <div style="font-size:14px;color:#231b18;margin-top:6px;line-height:1.4;">The amount due on this document could not be verified just now. Please open this link again in a few minutes to pay online.</div>
  </div>
</div>`;
}

export default async function handler(req, res) {
  const t = (req.query && req.query.t) || '';
  if (!/^[a-f0-9-]{20,60}$/i.test(t)) { res.status(400).send('Invalid link'); return; }
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!srk) { res.status(500).send('Sharing is not configured'); return; }
  const sbHeaders = { apikey: srk, Authorization: `Bearer ${srk}` };
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/inspection_reports?share_token=eq.${t}&select=id,project_id,project,html,title,total,signed_at&limit=1`,
      { headers: sbHeaders });
    if (!r.ok) throw new Error('lookup failed');
    const rows = await r.json();
    if (!rows.length) { res.status(404).send('This link is no longer available.'); return; }

    let html = rows[0].html;
    // Client-facing cleanup: hide the editor help panel, unused photo boxes,
    // unfilled placeholders, and empty sections - on screen AND in the client's own print.
    // 1274: the estimate's price table stacks on a phone. Injected here so every
    // estimate already sent reads properly; new ones carry it in their template.
    const ITEMS_PHONE = '@media screen and (max-width:560px){table.items thead{display:none}table.items,table.items tbody,table.items tfoot{display:block;width:100%}table.items tr{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;padding:9px 4px;border-bottom:1px solid var(--hair,#e5e2dc)}table.items td{display:block;width:auto !important;padding:0 !important;border:0 !important}table.items tbody tr>td:first-child{flex:1 1 100%;margin-bottom:3px}table.items td.qty,table.items td.unit,table.items td.rate{font-size:10.5pt;color:#555;text-align:left}table.items td:empty{display:none}table.items td.unit+td.rate:not(:empty):not(:last-child)::before{content:"\\00d7  "}table.items tr>td.rate:last-child{margin-left:auto;font-size:11pt;font-weight:700;color:var(--ink,#1d1d1f)}table.items tr.zeb{background:#f7f6f3}table.items tr.sec-banner{padding:0;border:0}table.items tr.sec-banner>td{flex:1 1 100%;padding:10px 9px 8px !important}table.items tr.sec-sub>td:first-child{flex:1 1 auto;margin:0}table.items tr.sec-sub td.val{margin-left:auto}table.items tfoot tr{border:0;justify-content:flex-end;padding:4px}table.items tfoot td:empty{display:none}table.items tfoot td.val{margin-left:14px}table.items tfoot tr.grand{border-top:2px solid var(--ink,#1d1d1f);padding-top:8px;margin-top:4px}}';
    const FIX = '<style id="shareFix">.howto{display:none !important}#restoreVeil{display:none !important}.items-hint{display:none !important}' + ITEMS_PHONE +   /* 1402: the editor's veil */
      '[data-emptyfig],[data-emptyrow],[data-emptyph],[data-emptyblock],[data-emptysec]{display:none !important}' +
      '@media print{.page-break:not(h2){display:none !important}h2.sec{break-after:avoid}table.items tfoot{display:table-row-group}' +   /* 1402: the Terms heading is h2.sec.page-break */
      '#crPayBar,#crPaySheet,#csBar,#csOverlay{display:none !important}' +
      '.figrow,.fig,tr{break-inside:avoid}' +
      '@page{@bottom-center{content:"5735 Webster St, Dayton OH 45414  \u00b7  937.576.6753  \u00b7  Admin@cardinalrenovations.net";' +
      'font-family:\'Segoe UI\',Arial,sans-serif;font-size:8pt;color:#8a8a8a}}}</style>' +
      '<script>(function(){function run(){var d=document;' +
      'd.querySelectorAll(".fig, .cover-photo").forEach(function(f){' +
      'var fr=f.classList.contains("cover-photo")?f:f.querySelector(".frame");' +
      'if(fr&&!fr.querySelector("img"))f.setAttribute("data-emptyfig","1");});' +
      'd.querySelectorAll(".figrow").forEach(function(r){if(!r.querySelector(".frame img"))r.setAttribute("data-emptyrow","1");});' +
      /* 1402: on an estimate / contract / invoice, a header row that is only an unfilled placeholder is dropped */
      /* a row of nothing but placeholders goes; a placeholder beside a real pair blanks its own label and cell */
      'd.querySelectorAll("table.meta tr").forEach(function(tr){var v=tr.querySelectorAll("td:not(.k)");if(!v.length)return;' +
      'var bl=[],full=0;for(var i=0;i<v.length;i++){var c=v[i].cloneNode(true),ph=0;c.querySelectorAll(".ph").forEach(function(p){if((p.textContent||"").trim().charAt(0)==="["){p.remove();ph=1;}});' +
      'if(c.textContent.replace(/\u00a0/g," ").trim())full=1;else if(ph)bl.push(v[i]);}' +
      'if(!bl.length)return;if(!full){tr.setAttribute("data-emptyblock","1");return;}' +
      'bl.forEach(function(td){var k=td.previousElementSibling;td.textContent="";if(k&&k.classList.contains("k"))k.textContent="";});});' +
      'if(!d.querySelector("[data-cardinal-summary-heading]"))return;' +
      'd.querySelectorAll(".ph").forEach(function(el){if((el.textContent||"").trim().charAt(0)==="[")el.setAttribute("data-emptyph","1");});' +
      'function blank(el){var c=el.cloneNode(true);' +
      'c.querySelectorAll("[data-emptyph],[data-emptyfig],[data-emptyrow],button,input").forEach(function(x){x.remove();});' +
      'return !c.textContent.replace(/\\u00a0/g," ").trim();}' +
      'd.querySelectorAll("p, li").forEach(function(el){if(el.closest(".fig"))return;' +
      'if(blank(el))el.setAttribute("data-emptyblock","1");});' +
      /* D: an h3 whose whole block was hidden as empty is not left standing alone */
      'd.querySelectorAll("h3").forEach(function(h){if(h.closest(".fig"))return;var el=h.nextElementSibling,saw=0,keep=0;' +
      'while(el&&!/^H[23]$/.test(el.tagName)&&!(el.classList&&el.classList.contains("page-break"))){saw=1;' +
      'if(!(el.getAttribute("data-emptyblock")||el.getAttribute("data-emptyph")||el.getAttribute("data-emptyrow")||el.getAttribute("data-emptyfig"))){keep=1;break;}' +
      'el=el.nextElementSibling;}if(saw&&!keep)h.setAttribute("data-emptyblock","1");});' +
      'd.querySelectorAll("tr").forEach(function(tr){if(!tr.querySelector("[data-emptyph]"))return;' +
      'var cells=Array.prototype.filter.call(tr.querySelectorAll("td"),function(td){' +
      'return !td.classList.contains("k")&&!td.classList.contains("n")&&!td.classList.contains("pr");});' +
      'if(!cells.length)return;for(var i=0;i<cells.length;i++){if(!blank(cells[i]))return;}' +
      'tr.setAttribute("data-emptyblock","1");});' +
      'var secs=Array.prototype.slice.call(d.querySelectorAll("h2.sec"));var hiddenTitles=[];' +
      'secs.forEach(function(h){var nodes=[],el=h.nextElementSibling;' +
      'while(el&&!(el.tagName==="H2"&&el.classList.contains("sec"))){nodes.push(el);el=el.nextElementSibling;}' +
      'var has=false;for(var i=0;i<nodes.length;i++){var nd=nodes[i];' +
      'if(nd.classList&&nd.classList.contains("page-break"))continue;' +
      'if(nd.getAttribute("data-emptyblock")||nd.getAttribute("data-emptyrow")||nd.getAttribute("data-emptyfig")||nd.getAttribute("data-emptyph"))continue;' +
      'var c=nd.cloneNode(true);' +
      'c.querySelectorAll("[data-emptyph],[data-emptyblock],[data-emptyrow],[data-emptyfig],button,input").forEach(function(x){x.remove();});' +
      'if(c.querySelector&&c.querySelector("img")){has=true;break;}' +
      'if(c.textContent.replace(/\\u00a0/g," ").trim()){has=true;break;}}' +
      'var hc=h.cloneNode(true);hc.querySelectorAll(".num, button").forEach(function(x){x.remove();});' +
      'if(!has){h.setAttribute("data-emptysec","1");' +
      'nodes.forEach(function(nd){if(nd.setAttribute)nd.setAttribute("data-emptysec","1");});' +
      'var prev=h.previousElementSibling;' +
      'if(prev&&prev.classList&&prev.classList.contains("page-break"))prev.setAttribute("data-emptysec","1");' +
      'hiddenTitles.push(hc.textContent.replace(/\\u00a0/g," ").trim());}});' +
      'var num=0;secs.forEach(function(h){var sp=h.querySelector(".num");' +
      'if(!sp||h.getAttribute("data-emptysec"))return;' +
      'if(!/^\\s*\\d+\\s*$/.test(sp.textContent||""))return;' +   /* D: the Contents mark is not a number */
      'num++;sp.textContent=String(num);});' +
      'var tocNum=0;d.querySelectorAll(".toc-row").forEach(function(row){' +
      'var t=row.querySelector(".t");if(!t)return;' +
      'var title=t.textContent.replace(/\\u00a0/g," ").replace(/^\\s*\\d+\\s*/,"").trim();' +
      'for(var i=0;i<hiddenTitles.length;i++){var ht=hiddenTitles[i];' +
      'if(ht&&(title.indexOf(ht)===0||ht.indexOf(title)===0)){row.setAttribute("data-emptysec","1");return;}}' +
      'tocNum++;t.textContent=t.textContent.replace(/^\\s*\\d+/,String(tocNum));});}' +
      'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();' +
      '})();</scr' + 'ipt>';
    html = html.includes('</head>') ? html.replace('</head>', FIX + '\n</head>') : FIX + html;
    // 1278: an estimate is shown as its Letter page on every screen, the same as
    // paper. Estimates stored before 1278 carry a device-width viewport; serve them
    // at Letter width too, so a client's phone never restacks them — and never
    // enlarges one paragraph of it on its own (text autosizing).
    let letterView = false;   // 1279: LETTER_UI zooms the bars back up on this page
    const isInvoiceDoc = /^invoice/i.test(String(rows[0].title || '').trim());   // 1313 (moved up for D)
    /* D: a contract — a Construction Agreement, the Service Contract, an uploaded signed one */
    const src0 = String(rows[0].html || '');
    const isContractDoc = !isInvoiceDoc && (/^contract/i.test(String(rows[0].title || '').trim()) || /data-sig="buyer"/.test(src0));
    const master = isContractDoc ? masterFor(src0) : null;
    /* 1402: any est-head document — invoices (no table.items) and templates whose table carries an id were
       missed, and with no viewport meta a phone laid them out at 980px: a 17px Pay button. */
    if (/class="est-head"/.test(html) && !isContractDoc) {
      letterView = true;
      const LV = '<meta name="viewport" content="width=900"><style>html{-webkit-text-size-adjust:100%;text-size-adjust:100%}</style>';
      if (/<meta name="viewport" content="[^"]*">/.test(html)) html = html.replace(/<meta name="viewport" content="[^"]*">/, LV);
      else if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + LV);
      else html = LV + html;
    } else if (isContractDoc) {
      /* D: the contract at the phone's width (CONTRACT_PHONE), the menu path replaced by the printed
         master, the master card above the signatures, and every answer frozen (CONTRACT_FIX) */
      if (/<meta name="viewport" content="[^"]*">/.test(html)) html = html.replace(/<meta name="viewport" content="[^"]*">/, CONTRACT_PHONE);
      else if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + CONTRACT_PHONE);
      else html = CONTRACT_PHONE + html;
      html = masterLinked(html, master, '');
      if (master) html = withMasterCard(html, master);
      html = html.includes('</head>') ? html.replace('</head>', CONTRACT_FIX + '\n</head>') : CONTRACT_FIX + html;
    } else if (!/<meta name="viewport"/i.test(html)) {
      /* D: an inspection report carries no viewport meta, so a phone laid it out at 980px and
         autosized its paragraphs to ~20px over ~6px tables; its own 640px rules never fired. */
      const RV = '<meta name="viewport" content="width=device-width, initial-scale=1"><style id="crReportPhone">html{-webkit-text-size-adjust:100%;text-size-adjust:100%}@media screen and (max-width:640px){table{max-width:100%}img{max-width:100%;height:auto}.toc-row .t{white-space:normal !important;min-width:0}}</style>';
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + RV);
      else html = RV + html;
    }
    if (!isContractDoc && /data-cardinal-summary-heading/.test(src0)) {   // D: a report's print rules (REPORT_PRINT)
      html = html.includes('</head>') ? html.replace('</head>', REPORT_PRINT + '\n</head>') : REPORT_PRINT + html;
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
        email: EMAIL_RX.test(cellEmail) ? cellEmail : '', master, cancel: cancelLine(src0) });
      html = html.includes('</body>') ? html.replace('</body>', ui + '\n</body>') : html + ui;
    } else {
      // Not awaiting a signature — offer payment if this document owes something:
      // a deposit on an estimate/contract, or a live balance on an invoice. The
      // bar is best-effort; a lookup hiccup must never block the document itself.
      try {
        // 1377/1378: an insurance invoice bills the homeowner's part; with none on the signed contract, no pay bar
        const insInv = isInvoiceDoc && await isInsuranceJob(sbHeaders, rows[0].project_id);
        const owed = insInv ? await homeOwedOn(sbHeaders, rows[0]) : await owedOn(sbHeaders, rows[0]);
        if (owed) {
          const { cents, label } = owed;
          if (isInvoiceDoc) html = liveInvoiceSummary(html, owed);   /* 1320 */
          if (req.query && req.query.paid === '1') {   /* 1402: back from checkout — the payment is still clearing */
            const ui = paidUi();
            html = html.includes('</body>') ? html.replace('</body>', ui + '\n</body>') : html + ui;
          } else if (cents >= 50 && cents <= 10000000) {
            const ui = payUi(t, cents, label, rows[0].project || rows[0].title);
            html = html.includes('</body>') ? html.replace('</body>', ui + '\n</body>') : html + ui;
          }
        }
      } catch (e) {
        /* leave the document unblocked. 1199: but when the ledger could not be
           READ, say so — a missing pay bar otherwise reads as "nothing due",
           and a correct state with no explanation is its own defect. */
        if (e && e.code === 'LOOKUP_FAILED') {
          const ui = unavailableUi();
          html = html.includes('</body>') ? html.replace('</body>', ui + '\n</body>') : html + ui;
        }
      }
    }
    if (letterView) html = html.includes('</body>') ? html.replace('</body>', LETTER_UI + '\n</body>') : html + LETTER_UI;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Cache-Control', 'private, max-age=0');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('Could not load document.');
  }
}
