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

function signUi(token) {
  return `
<div id="csBar" style="position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#C8202E;color:#fff;
  padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;
  font:600 15px 'Segoe UI',Arial,sans-serif;box-shadow:0 -4px 14px rgba(0,0,0,.25);">
  <span>Review complete?</span>
  <button id="csOpen" style="border:0;border-radius:8px;background:#fff;color:#C8202E;
    font:800 15px 'Segoe UI',Arial,sans-serif;padding:10px 22px;cursor:pointer;">Accept &amp; Sign</button>
</div>
<div id="csOverlay" style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(20,10,8,.65);overflow:auto;">
  <div style="max-width:540px;background:#fff;border-radius:14px;margin:8vh auto;padding:20px 22px;
    font-family:'Segoe UI',Arial,sans-serif;">
    <h3 style="margin:0 0 4px;color:#2b2b2b;">Accept &amp; Sign</h3>
    <p style="margin:0 0 12px;color:#666;font-size:13.5px;">By signing you accept this document as presented.
    Sign below with your finger or mouse.</p>
    <label style="display:block;font:700 13px 'Segoe UI',Arial,sans-serif;color:#444;">Your full name
      <input id="csName" type="text" autocomplete="name" style="display:block;width:100%;box-sizing:border-box;
        margin:4px 0 12px;padding:10px 12px;border:1px solid #c9c2bf;border-radius:8px;font:15px 'Segoe UI',Arial,sans-serif;">
    </label>
    <canvas id="csPad" width="500" height="160" style="width:100%;border:2px dashed #c9c2bf;border-radius:10px;
      background:#fff;touch-action:none;display:block;"></canvas>
    <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
      <button id="csClear" style="border:1px solid #c9c2bf;background:#fff;border-radius:8px;padding:8px 14px;
        font:600 13px 'Segoe UI',Arial,sans-serif;cursor:pointer;">Clear</button>
      <span>
        <button id="csCancel" style="border:1px solid #c9c2bf;background:#fff;border-radius:8px;padding:8px 14px;
          font:600 13px 'Segoe UI',Arial,sans-serif;cursor:pointer;">Cancel</button>
        <button id="csApply" style="border:0;background:#C8202E;color:#fff;border-radius:8px;padding:10px 20px;
          font:800 14px 'Segoe UI',Arial,sans-serif;cursor:pointer;">Apply Signature</button>
      </span>
    </div>
    <div id="csErr" style="color:#C8202E;font:600 13px 'Segoe UI',Arial,sans-serif;margin-top:8px;"></div>
  </div>
</div>
<script>
(function(){
  var TOKEN=${JSON.stringify(token)};
  var pad=document.getElementById('csPad'),ctx=pad.getContext('2d'),drawn=false,down=false;
  function reset(){ctx.fillStyle='#fff';ctx.fillRect(0,0,pad.width,pad.height);
    ctx.strokeStyle='#1b1b6e';ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';drawn=false;}
  function pos(e){var r=pad.getBoundingClientRect();var t=e.touches?e.touches[0]:e;
    return {x:(t.clientX-r.left)*(pad.width/r.width),y:(t.clientY-r.top)*(pad.height/r.height)};}
  function start(e){e.preventDefault();down=true;var p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);}
  function move(e){if(!down)return;e.preventDefault();var p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();drawn=true;}
  pad.addEventListener('mousedown',start);pad.addEventListener('mousemove',move);
  document.addEventListener('mouseup',function(){down=false;});
  pad.addEventListener('touchstart',start,{passive:false});
  pad.addEventListener('touchmove',move,{passive:false});
  pad.addEventListener('touchend',function(){down=false;});
  var ov=document.getElementById('csOverlay');
  document.getElementById('csOpen').addEventListener('click',function(){reset();ov.style.display='block';});
  document.getElementById('csCancel').addEventListener('click',function(){ov.style.display='none';});
  document.getElementById('csClear').addEventListener('click',reset);
  document.getElementById('csApply').addEventListener('click',function(){
    var err=document.getElementById('csErr');
    var name=document.getElementById('csName').value.trim();
    if(!name){err.textContent='Please enter your full name.';return;}
    if(!drawn){err.textContent='Please sign in the box above.';return;}
    var btn=this;btn.disabled=true;btn.textContent='Signing\\u2026';err.textContent='';
    fetch('/api/clientsign',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({t:TOKEN,sig:pad.toDataURL('image/png'),name:name})})
    .then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
    .then(function(x){
      if(!x.ok){throw new Error((x.d&&x.d.error)||'Could not sign');}
      ov.innerHTML='<div style="max-width:420px;background:#fff;border-radius:14px;margin:16vh auto;padding:30px;'+
        'text-align:center;font-family:\\'Segoe UI\\',Arial,sans-serif;">'+
        '<div style="font-size:44px;color:#1d6b34;">\\u2713</div>'+
        '<h3 style="margin:6px 0;color:#2b2b2b;">Signed \\u2014 thank you!</h3>'+
        '<p style="color:#666;font-size:14px;">Cardinal Roofing &amp; Renovations has been notified.</p></div>';
      setTimeout(function(){location.reload();},1600);
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
async function owedOn(sbHeaders, rep) {
  const isInvoice = /^invoice/i.test(String(rep.title || '').trim());
  let collected = 0;
  const cr = await fetch(
    `${SUPABASE_URL}/rest/v1/collections?project_id=eq.${rep.project_id}&select=amount`,
    { headers: sbHeaders });
  if (cr.ok) for (const r of await cr.json()) collected += Number(r.amount) || 0;
  if (isInvoice) {
    let contractTotal = 0;
    const dr = await fetch(
      `${SUPABASE_URL}/rest/v1/inspection_reports?project_id=eq.${rep.project_id}&select=title,total,signed_at`,
      { headers: sbHeaders });
    if (dr.ok) for (const r of await dr.json()) {
      if (/^contract/i.test(String(r.title || '').trim()) && r.signed_at && Number(r.total) > 0) contractTotal += Number(r.total);
    }
    const jobTotal = contractTotal > 0 ? contractTotal : (Number(rep.total) || 0);
    return { cents: Math.round((jobTotal - collected) * 100), label: 'Amount due' };
  }
  const er = await fetch(
    `${SUPABASE_URL}/rest/v1/estimates?or=(doc_id.eq.${rep.id},contract_doc_id.eq.${rep.id})&select=deposit_amount&limit=1`,
    { headers: sbHeaders });
  const est = er.ok ? (await er.json())[0] : null;
  const deposit = Number(est && est.deposit_amount) || 0;
  return { cents: Math.round((deposit - collected) * 100), label: 'Deposit' };
}

// payUi: a polished, trustworthy pay bar. It links to /api/pay?t=… (which does
// the server-side charge); the amount shown here is display only.
function payUi(token, cents, label, name) {
  const dollars = (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const safeName = String(name || 'Cardinal Roofing & Renovations').replace(/[<>&"]/g, '').slice(0, 64);
  const href = '/api/pay?t=' + encodeURIComponent(token);
  const lock = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="vertical-align:-1px;margin-right:5px;">'
    + '<path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 16 22H8a2.5 2.5 0 0 1-2.5-2.5v-5A2.5 2.5 0 0 1 8 10z" stroke="#8b8f98" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return `
<div id="crPayBar" style="position:fixed;left:0;right:0;bottom:0;z-index:9999;
  padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));pointer-events:none;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="pointer-events:auto;max-width:520px;margin:0 auto;background:#ffffff;
    border:1px solid #ece7e3;border-radius:18px 18px 14px 14px;
    box-shadow:0 -1px 8px rgba(20,10,8,.05),0 16px 44px rgba(20,10,8,.20);padding:15px 18px 13px;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;">
      <div style="min-width:0;">
        <div style="font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:#6b5d52;">${label}</div>
        <div style="font-size:13px;color:#6b645e;margin-top:3px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px;">${safeName}</div>
      </div>
      <div style="font-size:31px;font-weight:800;color:#231b18;letter-spacing:-.015em;white-space:nowrap;line-height:1;">${dollars}</div>
    </div>
    <a href="${href}" style="display:block;margin-top:15px;text-align:center;text-decoration:none;
      background:#C8202E;color:#ffffff;font-size:17px;font-weight:800;letter-spacing:.01em;
      padding:15px 20px;border-radius:12px;box-shadow:0 6px 15px rgba(200,32,46,.30);">Pay ${dollars}</a>
    <div style="text-align:center;margin-top:11px;font-size:11.5px;font-weight:600;color:#6b645e;">
      ${lock}Secure checkout &middot; processed by Stripe</div>
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
    const FIX = '<style id="shareFix">.howto{display:none !important}' +
      '[data-emptyfig],[data-emptyrow],[data-emptyph],[data-emptyblock],[data-emptysec]{display:none !important}' +
      '@media print{.page-break{display:none !important}h2.sec{break-after:avoid}' +
      '.figrow,.fig,tr{break-inside:avoid}' +
      '@page{@bottom-center{content:"5735 Webster St, Dayton OH 45414  \u00b7  937.576.6753  \u00b7  Admin@cardinalrenovations.net";' +
      'font-family:\'Segoe UI\',Arial,sans-serif;font-size:8pt;color:#8a8a8a}}}</style>' +
      '<script>(function(){function run(){var d=document;' +
      'd.querySelectorAll(".fig, .cover-photo").forEach(function(f){' +
      'var fr=f.classList.contains("cover-photo")?f:f.querySelector(".frame");' +
      'if(fr&&!fr.querySelector("img"))f.setAttribute("data-emptyfig","1");});' +
      'd.querySelectorAll(".figrow").forEach(function(r){if(!r.querySelector(".frame img"))r.setAttribute("data-emptyrow","1");});' +
      'if(!d.querySelector("[data-cardinal-summary-heading]"))return;' +
      'd.querySelectorAll(".ph").forEach(function(el){if((el.textContent||"").trim().charAt(0)==="[")el.setAttribute("data-emptyph","1");});' +
      'function blank(el){var c=el.cloneNode(true);' +
      'c.querySelectorAll("[data-emptyph],[data-emptyfig],[data-emptyrow],button,input").forEach(function(x){x.remove();});' +
      'return !c.textContent.replace(/\\u00a0/g," ").trim();}' +
      'd.querySelectorAll("p, li").forEach(function(el){if(el.closest(".fig"))return;' +
      'if(blank(el))el.setAttribute("data-emptyblock","1");});' +
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
      'if(!sp||h.getAttribute("data-emptysec"))return;num++;sp.textContent=String(num);});' +
      'var tocNum=0;d.querySelectorAll(".toc-row").forEach(function(row){' +
      'var t=row.querySelector(".t");if(!t)return;' +
      'var title=t.textContent.replace(/\\u00a0/g," ").replace(/^\\s*\\d+\\s*/,"").trim();' +
      'for(var i=0;i<hiddenTitles.length;i++){var ht=hiddenTitles[i];' +
      'if(ht&&(title.indexOf(ht)===0||ht.indexOf(title)===0)){row.setAttribute("data-emptysec","1");return;}}' +
      'tocNum++;t.textContent=t.textContent.replace(/^\\s*\\d+/,String(tocNum));});}' +
      'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();' +
      '})();</scr' + 'ipt>';
    html = html.includes('</head>') ? html.replace('</head>', FIX + '\n</head>') : FIX + html;
    const signable = (SIGN_RX.test(html) || SLOT_RX.test(html)) && !html.includes('data-clientsigned');
    if (signable) {
      const ui = signUi(t);
      html = html.includes('</body>') ? html.replace('</body>', ui + '\n</body>') : html + ui;
    } else {
      // Not awaiting a signature — offer payment if this document owes something:
      // a deposit on an estimate/contract, or a live balance on an invoice. The
      // bar is best-effort; a lookup hiccup must never block the document itself.
      try {
        const { cents, label } = await owedOn(sbHeaders, rows[0]);
        if (cents >= 50 && cents <= 10000000) {
          const ui = payUi(t, cents, label, rows[0].project || rows[0].title);
          html = html.includes('</body>') ? html.replace('</body>', ui + '\n</body>') : html + ui;
        }
      } catch (e) { /* leave the document unblocked */ }
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Cache-Control', 'private, max-age=0');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('Could not load document.');
  }
}
