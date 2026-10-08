#!/usr/bin/env python3
"""Build 1262 — Upload a signed contract (Jacob, via Theo — urgent).

Jacob, 8 Oct: "In contracts it only has siding, roofing, gutters. There isn't a
way to upload contracts for windows and hand written agreements especially for
previous customers or active ones. I'm having to manipulate it for current
active ones in order to put A/R."

Why it hurts: Invoices & Payments (and so A/R) open only once a job has a SIGNED
contract with a total — jobFinance() counts `Contract…` documents with signed_at
and total > 0. The app can only BUILD a Roofing, Siding or Gutter agreement, so
a windows job or a paper agreement signed at the kitchen table has no way in,
and the workaround is a fake roofing contract.

The fix is the door, not a fourth template:
  Contracts → "Upload signed contract": pick the trade (Roofing, Siding,
  Gutters, Windows, Other / handwritten), add photos or a PDF of the signed
  paper, type the contract amount and the date it was signed. It saves as an
  ordinary contract document — titled `Contract — <Trade> — <client>` so
  isContractTitle() and jobFinance() count it unchanged — with the pages inside
  it (photos shrunk to 1700px JPEG; PDF pages drawn by the pdf.js the app
  already loads), signed_at and total set. A/R opens like any signed contract.
  It does not move the stage: the 'Contract signed' prompt already offers that,
  and for a past or active customer a forced Approved would move them backwards.

Not done, on purpose: a Windows AGREEMENT TEMPLATE. That is legal text (terms,
the 3-day cancellation notice) and nobody here writes it — and the master
Company Documents points at, docs/Cardinal_Window_Contract.pdf, is not in the
repo. Recorded for Theo.

usage: python3 patch_1262.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. the button, beside "+ New contract", and the note above it
src = pl.sub(src, """      <p class="subnote">Client contracts &#8212; roofing, siding and gutters, each the trade&#8217;s own
      Construction Agreement, prefilled from this profile.""", """      <p class="subnote">Client contracts &#8212; roofing, siding and gutters, each the trade&#8217;s own
      Construction Agreement, prefilled from this profile. Signed on paper, or a windows job?
      <b>Upload signed contract</b> keeps a photo or PDF of it and opens the invoice.""")
src = pl.sub(src, """            <button class="estopt" data-ctpl="gutters">&#127783; Gutter agreement</button>
          </div>
        </span>""", """            <button class="estopt" data-ctpl="gutters">&#127783; Gutter agreement</button>
          </div>
        </span>
        <button class="btn" id="pUploadContractBtn" type="button" style="margin-left:8px;">Upload signed contract</button>""")

# 2. the sheet's styles — the 1258 sheet's fixed dark ground, so both themes read the same
src = pl.sub(src, """#apptCalSheet .no{background:transparent;border:1px solid #3a3e46;color:#eceef0;}
""", """#apptCalSheet .no{background:transparent;border:1px solid #3a3e46;color:#eceef0;}
/* 1262: Upload signed contract — the same fixed dark sheet as 1258 */
#ctUpSheet{position:fixed;left:0;right:0;bottom:0;z-index:9600;display:none;max-height:92vh;overflow:auto;
  padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));background:#16161b;color:#eceef0;
  border-top:1px solid #2a2d33;box-shadow:0 -8px 30px rgba(0,0,0,.4);}
#ctUpSheet.open{display:block;}
#ctUpSheet .q{max-width:560px;margin:0 auto;}
#ctUpSheet b{display:block;font:700 18px 'Segoe UI',Arial,sans-serif;color:#eceef0;}
#ctUpSheet p{margin:4px 0 12px;font:400 15px 'Segoe UI',Arial,sans-serif;color:#b8bec6;}
#ctUpSheet label{display:block;margin:0 0 12px;font:700 13px 'Segoe UI',Arial,sans-serif;color:#b8bec6;}
#ctUpSheet select, #ctUpSheet input{display:block;width:100%;box-sizing:border-box;margin-top:6px;min-height:48px;
  padding:0 12px;border-radius:10px;border:1px solid #3a3e46;background:#0f1014;color:#eceef0;
  font:400 15px 'Segoe UI',Arial,sans-serif;}
#ctUpSheet input[type=file]{padding:12px;}
#ctUpSheet .st{min-height:22px;margin:0 0 10px;font:600 15px 'Segoe UI',Arial,sans-serif;color:#e8b04a;}
#ctUpSheet .row{display:flex;flex-wrap:wrap;gap:10px;}
#ctUpSheet .pri, #ctUpSheet .no{flex:1 1 140px;display:flex;align-items:center;justify-content:center;min-height:48px;
  border-radius:10px;cursor:pointer;font:700 15px 'Segoe UI',Arial,sans-serif;}
#ctUpSheet .pri{background:#c8202e;border:1px solid #c8202e;color:#ffffff;}
#ctUpSheet .pri[disabled]{opacity:.6;cursor:default;}
#ctUpSheet .no{background:transparent;border:1px solid #3a3e46;color:#eceef0;}
""")

# 3. the module
MOD = r'''<script id="cr-ctup-script">
/* 1262: Upload a signed contract — Jacob, via Theo. A windows job or a paper
   agreement had no way to become a signed contract, so A/R could not open
   without faking a roofing agreement. This saves the photos / PDF pages of the
   signed paper as an ordinary `Contract — <Trade> — <client>` document with
   signed_at and total set, which is exactly what jobFinance() counts. */
(function(){
  'use strict';
  var TRADES = [['Roofing','Roofing'], ['Siding','Siding'], ['Gutters','Gutters'], ['Windows','Windows'], ['Other','Other / handwritten']];
  var MAX_PAGES = 15, MAX_HTML = 9 * 1024 * 1024;
  function ctuEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function ctuToday(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function ctuProj(){ try{ return (typeof currentProject !== 'undefined') ? currentProject : null; }catch(_){ return null; } }
  var sheet = null;
  function el(id){ return /** @type {any} */ (document.getElementById(id)); }
  function ctuBuild(){
    if(sheet) return sheet;
    sheet = document.createElement('div');
    sheet.id = 'ctUpSheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Upload signed contract');
    sheet.innerHTML = '<div class="q"><b>Upload signed contract</b>' +
      '<p>A windows job, or an agreement signed on paper. Add photos or a PDF of the signed contract and its amount — it counts like any signed contract, and the invoice opens.</p>' +
      '<label>Trade<select id="ctUpTrade">' + TRADES.map(function(t){ return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Contract amount ($)<input id="ctUpAmt" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 8450"></label>' +
      '<label>Date signed<input id="ctUpDate" type="date"></label>' +
      '<label>Photos or PDF of the signed contract<input id="ctUpFile" type="file" accept="image/*,application/pdf" multiple></label>' +
      '<div class="st" id="ctUpSt" role="status"></div>' +
      '<div class="row"><button type="button" class="pri" id="ctUpGo">Save signed contract</button><button type="button" class="no" id="ctUpNo">Cancel</button></div></div>';
    document.body.appendChild(sheet);
    el('ctUpNo').addEventListener('click', ctuClose);
    el('ctUpGo').addEventListener('click', ctuSave);
    return sheet;
  }
  function ctuOpen(){
    var pr = ctuProj();
    if(!pr){ if(window.crToastErr) window.crToastErr('Open a client first — a contract needs a job to belong to.'); return; }
    ctuBuild();
    var ts = (pr.trade || ((typeof parseCkAll === 'function') ? ((parseCkAll(pr).trades || [])[0]) : '') || '');
    el('ctUpTrade').value = /window/i.test(ts) ? 'Windows' : /siding/i.test(ts) ? 'Siding' : /gutter/i.test(ts) ? 'Gutters' : 'Roofing';
    el('ctUpAmt').value = ''; el('ctUpDate').value = ctuToday(); el('ctUpFile').value = ''; el('ctUpSt').textContent = '';
    el('ctUpGo').disabled = false; el('ctUpGo').textContent = 'Save signed contract';
    sheet.classList.add('open');
  }
  function ctuClose(){ if(sheet) sheet.classList.remove('open'); }
  function shrinkImage(file){
    return new Promise(function(res, rej){
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function(){
        var m = 1700, s = Math.min(1, m / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
        var g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82));
      };
      im.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('Could not read the photo “' + file.name + '”.')); };
      im.src = url;
    });
  }
  async function pdfPages(file){
    var lib = (typeof loadPdfJs === 'function') ? await loadPdfJs() : null;
    if(!lib || !lib.getDocument) throw new Error('The PDF reader would not load — try photos of the pages instead.');
    var buf = await file.arrayBuffer();
    var pdf = await lib.getDocument({ data: buf }).promise;
    var out = [];
    for(var n = 1; n <= Math.min(pdf.numPages, MAX_PAGES); n++){
      var pg = await pdf.getPage(n), v0 = pg.getViewport({ scale: 1 });
      var vp = pg.getViewport({ scale: Math.min(2, 1400 / (v0.width || 1)) });
      var c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      var g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      out.push(c.toDataURL('image/jpeg', 0.8));
    }
    return out;
  }
  async function ctuSave(){
    var pr = ctuProj(); if(!pr) return ctuClose();
    var st = el('ctUpSt'), go = el('ctUpGo');
    var trade = el('ctUpTrade').value || 'Other';
    var label = trade === 'Other' ? 'Handwritten agreement' : trade;
    var amt = parseFloat(String(el('ctUpAmt').value || '').replace(/[^0-9.]/g, ''));
    var day = el('ctUpDate').value;
    var files = Array.prototype.slice.call(el('ctUpFile').files || []);
    if(!(amt > 0)){ st.textContent = 'Enter the contract amount.'; return; }
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day || '')){ st.textContent = 'Pick the date it was signed.'; return; }
    if(!files.length){ st.textContent = 'Add a photo or PDF of the signed contract.'; return; }
    go.disabled = true; go.textContent = 'Saving…';
    try{
      var pages = [];
      for(var i = 0; i < files.length; i++){
        st.textContent = 'Reading ' + (i + 1) + ' of ' + files.length + '…';
        var f = files[i];
        if(/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)) pages = pages.concat(await pdfPages(f));
        else pages.push(await shrinkImage(f));
        if(pages.length > MAX_PAGES) throw new Error('That is more than ' + MAX_PAGES + ' pages — upload the signed pages only.');
      }
      var me = (window.currentUser && window.currentUser.email) || '';
      var money = (typeof fmtMoney === 'function') ? fmtMoney(amt, true) : ('$' + amt.toFixed(2));
      var signedNice = new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
      var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + ctuEsc(label + ' — ' + (pr.name || '')) + '</title>' +
        '<style>body{margin:24px;font:15px \'Segoe UI\',Arial,sans-serif;color:#1b1b1b;background:#fff}' +
        'h1{font-size:22px;margin:0 0 6px}.meta{margin:0 0 18px;color:#444}.meta b{color:#1b1b1b}' +
        'img{display:block;width:100%;max-width:900px;margin:0 auto 18px;border:1px solid #d6d6d6}</style></head><body data-cr-upload="1">' +
        '<h1>Signed agreement — ' + ctuEsc(label) + '</h1>' +
        '<p class="meta"><b>' + ctuEsc(pr.name || 'Client') + '</b>' + (pr.address ? ' · ' + ctuEsc(pr.address) : '') +
        '<br>Contract amount <b>' + ctuEsc(money) + '</b> · signed <b>' + ctuEsc(signedNice) + '</b>' +
        '<br>Uploaded ' + ctuEsc(new Date().toLocaleDateString('en-US')) + (me ? ' by ' + ctuEsc(me) : '') + ' — the signed paper is the contract; this is its copy.</p>' +
        pages.map(function(u, k){ return '<img alt="Signed contract, page ' + (k + 1) + '" src="' + u + '">'; }).join('') +
        '</body></html>';
      if(html.length > MAX_HTML) throw new Error('Those pages are too large together — upload fewer, or photos instead of a big PDF.');
      st.textContent = 'Saving…';
      var id = await db.create('Contract — ' + label + ' — ' + (pr.name || 'Client'), html, pr.name, pr.id);
      await db.update(id, { signed_at: new Date(day + 'T12:00:00').toISOString(), total: Math.round(amt * 100) / 100 });
      if(typeof window.auditLog === 'function'){ try{ window.auditLog('contract', 'Uploaded signed contract (' + label + ', ' + money + ')', pr.id); }catch(_){} }
      try{ await reload(); }catch(_r){}
      try{ if(typeof renderProjectDocs === 'function') renderProjectDocs(); }catch(_d){}
      ctuClose();
      if(window.crToastOk) window.crToastOk('Signed ' + label + ' contract saved — ' + money + '. Invoices & Payments can open now.');
    }catch(err){
      st.textContent = (err && err.message) || String(err);
      go.disabled = false; go.textContent = 'Save signed contract';
    }
  }
  /* wired on the button itself — it is static markup, so it exists by now */
  var upBtn = document.getElementById('pUploadContractBtn');
  if(upBtn) upBtn.addEventListener('click', function(e){ e.preventDefault(); ctuOpen(); });
  window.CardinalContractUpload = Object.assign(window.CardinalContractUpload || {}, { open: ctuOpen, close: ctuClose });
})();
</script>
'''
i = src.rfind('</body>')
assert i > 0
src = src[:i] + MOD + src[i:]

src = pl.sub(src, '>v2026-10-08 build 1261<', '>v2026-10-08 build 1262<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1262, d: '2026-10-08', t: 'Upload a signed contract',
    s: 'Contracts has <b>Upload signed contract</b>: pick the trade (Roofing, Siding, Gutters, <b>Windows</b> or <b>Other / handwritten</b>), add photos or a PDF of the signed paper, type the amount and the date it was signed. It is saved as a real signed contract, so Invoices &amp; Payments and A/R open for windows jobs and paper agreements \\u2014 no more making a roofing contract to get there.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
