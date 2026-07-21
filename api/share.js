// /api/share.js — public read-only view of a document via unguessable token.
// GET /api/share?t=<share_token>  → serves the stored document HTML.
// If the document has a signature block that hasn't been client-signed yet,
// an "Accept & Sign" bar is injected so the client can sign remotely
// (handled by /api/clientsign).
// Requires SUPABASE_SERVICE_ROLE_KEY.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SIGN_RX = /(<div class="line">)(<\/div>\s*<div class="lbl">\s*Client Acceptance)([^<]*)(<\/div>)/;

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

export default async function handler(req, res) {
  const t = (req.query && req.query.t) || '';
  if (!/^[a-f0-9-]{20,60}$/i.test(t)) { res.status(400).send('Invalid link'); return; }
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!srk) { res.status(500).send('Sharing is not configured'); return; }
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/inspection_reports?share_token=eq.${t}&select=html,title&limit=1`,
      { headers: { apikey: srk, Authorization: `Bearer ${srk}` } });
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
    const signable = SIGN_RX.test(html) && !html.includes('data-clientsigned');
    if (signable) {
      const ui = signUi(t);
      html = html.includes('</body>') ? html.replace('</body>', ui + '\n</body>') : html + ui;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Cache-Control', 'private, max-age=0');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('Could not load document.');
  }
}
