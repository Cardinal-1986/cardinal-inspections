"""Build 1323 — a change order written and signed on the phone (Theo's pick 2B: photo required).

Install day: the crew finds something, the work changes, the price changes. Before this
build the app promised "a written change order" in every contract and had no way to write
one, so "go ahead, client will pay whatever" was the whole paper trail.

Now, on the client page, Change order:
  1. a photo of what was found (required — the button stays off without one)
  2. the lines and prices, the total adds itself up
  3. who pays: the homeowner, or an insurance supplement (subject to carrier approval)
  4. the homeowner signs on the phone (the app's own signature pad, borrowed through
     window.openSigner like the contracts editor does)
Saved as a signed document "Change Order — <client>" in the job's Documents, with the photo
and the signature in it; the full photo also goes into the job's photos. A signed change
order ADDS TO THE JOB VALUE everywhere the job value is computed — jobFinance() in the app,
owedOn() in api/pay.js and api/share.js (byte-identical, gate_1199), and api/remind.js — so
the invoice, the pay link and the reminders all ask for it.
Usage: python3 patch_1323.py [repo root]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../..')
files = {k: pl.load(os.path.join(ROOT, k)) for k in ('index.html', 'api/pay.js', 'api/share.js', 'api/remind.js')}
def one(f, old, new):
    s = files[f]
    assert s.count(old) == 1, (f, old[:90], s.count(old))
    files[f] = s.replace(old, new)

# ── the job value, app side ────────────────────────────────────────────────────────────
one('index.html', """  (all.payments || []).forEach(function(p){
    if(p.dir === 'in') paid += Number(p.amt) || 0;
  });""", """  /* 1323: a SIGNED change order adds to the job, whatever the job's value came from.
     The same rule runs server-side in owedOn() (pay.js / share.js) and remind.js. */
  var coAdd = 0;
  cacheRows.forEach(function(r){
    if(r.project_id === pr.id && /^change order/i.test((r.title || '').trim()) && r.signed_at && Number(r.total) > 0) coAdd += Number(r.total);
  });
  if(coAdd > 0){ value += coAdd; if(source === 'none') source = 'changeorder'; }
  (all.payments || []).forEach(function(p){
    if(p.dir === 'in') paid += Number(p.amt) || 0;
  });""")
# a change order is not an inspection
one('index.html', "return !isEstimateTitle(tt) && !/^invoice|^contract/i.test(tt) && !isFileDoc(tt);",
                  "return !isEstimateTitle(tt) && !/^invoice|^contract|^change order/i.test(tt) && !isFileDoc(tt);")

# ── the job value, server side (pay.js and share.js stay byte-identical) ─────────────
for f in ('api/pay.js', 'api/share.js'):
    one(f, """    let contractTotal = 0;
    for (const r of await readRows(sbHeaders, 'inspection_reports',""", """    let contractTotal = 0, coTotal = 0;
    for (const r of await readRows(sbHeaders, 'inspection_reports',""")
    one(f, """        contractTotal += Number(r.total);
      }
    }""", """        contractTotal += Number(r.total);
      }
      // 1323: a signed change order adds to the job (jobFinance() does the same)
      if (/^change order/i.test(String(r.title || '').trim()) && r.signed_at && Number(r.total) > 0) coTotal += Number(r.total);
    }""")
    one(f, """    const jobTotal = signedTotal > 0 ? signedTotal + manual
                   : (manual > 0 ? manual : (Number(rep.total) || 0));""", """    const jobTotal = signedTotal > 0 ? signedTotal + manual + coTotal
                   : (manual > 0 ? manual + coTotal : (Number(rep.total) || 0));""")
one('api/remind.js', """      var contractTotal = 0;
      (docsByP[pid] || []).forEach(function (d) {
        if (/^contract/i.test(String(d.title || '').trim()) && d.signed_at && Number(d.total) > 0) contractTotal += Number(d.total);
      });""", """      var contractTotal = 0, coTotal = 0;
      (docsByP[pid] || []).forEach(function (d) {
        if (/^contract/i.test(String(d.title || '').trim()) && d.signed_at && Number(d.total) > 0) contractTotal += Number(d.total);
        // 1323: a signed change order adds to the job (jobFinance() and owedOn() do the same)
        if (/^change order/i.test(String(d.title || '').trim()) && d.signed_at && Number(d.total) > 0) coTotal += Number(d.total);
      });""")
one('api/remind.js', """      var jobTotal = signedTotal > 0 ? signedTotal + manual : (manual > 0 ? manual : (Number(inv.total) || 0));""",
                     """      var jobTotal = signedTotal > 0 ? signedTotal + manual + coTotal : (manual > 0 ? manual + coTotal : (Number(inv.total) || 0));""")

# ── the Job Menu tile + its click ──────────────────────────────────────────────────────
one('index.html', """      jt(dbIc('checklist'), 'Checklists', '', 'checklists') +""",
"""      jt(dbIc('checklist'), 'Checklists', '', 'checklists') +
      jt(dbIc('contract'), 'Change order', (docs.filter(function(r){ return /^change order/i.test((r.title || '').trim()); }).length || ''), 'changeorder') +   /* 1323 */""")
one('index.html', """      else if(act === 'ownerreview'){ if(window.CardinalOwnerReview) window.CardinalOwnerReview.flag(pr); }   /* 1322 */""",
"""      else if(act === 'ownerreview'){ if(window.CardinalOwnerReview) window.CardinalOwnerReview.flag(pr); }   /* 1322 */
      else if(act === 'changeorder'){ if(window.CardinalChangeOrder) window.CardinalChangeOrder.open(pr); }   /* 1323 */""")

BLOCK = r"""<style id="cr-co-styles">
/* 1323: the change-order sheet. Own tokens with literal fallbacks; dark here, light twin below. */
#cr-co-sheet{
  --co-sheet:#141619; --co-ink:#f2f4f7; --co-dim:#a8b0ba; --co-line:#2a2e35; --co-well:#1b1f24; --co-red:#C8202E; --co-due:#f08a90;
  position:fixed; inset:0; z-index:12000; display:none;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
}
:root[data-theme="rb-light"] #cr-co-sheet{
  --co-sheet:#FFFFFF; --co-ink:#0F172A; --co-dim:#475569; --co-line:#E2E8F0; --co-well:#F8FAFC; --co-due:#B91C1C;
}
#cr-co-sheet.open{display:block;}
#cr-co-sheet .co-scrim{position:absolute; inset:0; background:rgba(0,0,0,.62);}
#cr-co-sheet .co-box{position:absolute; left:0; right:0; bottom:0; max-height:92vh; overflow:auto; box-sizing:border-box;
  background:var(--co-sheet,#141619); color:var(--co-ink,#f2f4f7); border-radius:18px 18px 0 0; padding:16px 16px 24px;
  max-width:560px; margin:0 auto;}
#cr-co-sheet .co-h{font-size:18px; font-weight:800; margin:0 0 2px;}
#cr-co-sheet .co-sub{font-size:13px; color:var(--co-dim,#a8b0ba); margin:0 0 12px;}
#cr-co-sheet .co-l{display:block; font-size:13px; font-weight:700; color:var(--co-dim,#a8b0ba); margin:12px 0 6px;}
#cr-co-sheet input, #cr-co-sheet textarea{width:100%; box-sizing:border-box; font:inherit; font-size:15px; min-height:44px;
  color:var(--co-ink,#f2f4f7); background:var(--co-well,#1b1f24); border:1px solid var(--co-line,#2a2e35); border-radius:10px; padding:10px 12px;}
#cr-co-sheet .co-row{display:grid; grid-template-columns:1fr 120px 44px; gap:8px; margin-bottom:8px;}
#cr-co-sheet .co-btn{display:inline-flex; align-items:center; justify-content:center; min-height:44px; min-width:44px; padding:8px 14px;
  border-radius:10px; border:1px solid var(--co-line,#2a2e35); background:transparent; color:var(--co-ink,#f2f4f7);
  font:inherit; font-size:14px; font-weight:700; cursor:pointer;}
#cr-co-sheet .co-btn.primary{background:var(--co-red,#C8202E); border-color:var(--co-red,#C8202E); color:#fff;}
#cr-co-sheet .co-btn[disabled]{opacity:.45; cursor:default;}
#cr-co-sheet .co-photo{display:flex; align-items:center; justify-content:center; min-height:120px; border:1px dashed var(--co-line,#2a2e35);
  border-radius:12px; color:var(--co-dim,#a8b0ba); font-size:14px; cursor:pointer; overflow:hidden; position:relative;}
#cr-co-sheet .co-photo img{max-width:100%; max-height:220px; display:block;}
#cr-co-sheet .co-photo input{position:absolute; inset:0; opacity:0; cursor:pointer;}
#cr-co-sheet .co-seg{display:flex; gap:8px;}
#cr-co-sheet .co-seg .co-btn{flex:1 1 0;}
#cr-co-sheet .co-seg .co-btn.on{border-color:var(--co-red,#C8202E); box-shadow:inset 0 0 0 1px var(--co-red,#C8202E);}
#cr-co-sheet .co-total{display:flex; justify-content:space-between; font-size:18px; font-weight:800; margin:6px 0 2px;}
#cr-co-sheet .co-foot{display:flex; gap:8px; margin-top:16px;}
#cr-co-sheet .co-foot .co-btn{flex:1 1 0;}
#cr-co-sheet .co-why{font-size:13px; color:var(--co-due,#f08a90); margin-top:8px; min-height:18px;}
</style>
<script id="cr-co-script">
/* 1323: change orders. See patch_1323.py for the why. */
(function(){
  'use strict';
  var coFor = null, coLines = [], coPaidBy = 'homeowner', coFile = null, coBusy = false, coArmed = null;
  function coQ(id){ return document.getElementById(id); }
  function coEsc(s){ return String(s == null ? '' : s).replace(/[<>&"']/g, function(c){ return { '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function coUsd(n){ var v = Number(n) || 0; return '$' + v.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
  function coNum(v){ var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? Math.round(n * 100) / 100 : 0; }
  function coTotal(){ return coLines.reduce(function(a, l){ return a + coNum(l.amt); }, 0); }
  function coReady(){ return !!coFile && coTotal() > 0 && coLines.some(function(l){ return String(l.desc || '').trim() && coNum(l.amt) > 0; }); }

  function coEnsure(){
    var m = coQ('cr-co-sheet'); if(m) return m;
    m = document.createElement('div'); m.id = 'cr-co-sheet';
    m.innerHTML = '<div class="co-scrim" data-co-close="1"></div><div class="co-box" role="dialog" aria-modal="true" aria-labelledby="coTitle">'
      + '<div class="co-h" id="coTitle">Change order</div><div class="co-sub" id="coSub"></div>'
      + '<span class="co-l">1 · Photo of what was found (required)</span>'
      + '<label class="co-photo" id="coPhoto"><span id="coPhotoTxt">Take or choose a photo</span><input type="file" accept="image/*" capture="environment" id="coFile" aria-label="Photo"></label>'
      + '<span class="co-l">2 · The work and its price</span><div id="coLines"></div>'
      + '<button class="co-btn" type="button" data-co-add="1">+ Add line</button>'
      + '<div class="co-total"><span>Adds to the job</span><span id="coTot">$0.00</span></div>'
      + '<span class="co-l">3 · Who pays</span><div class="co-seg" id="coPaid">'
      +   '<button class="co-btn" type="button" data-co-paid="homeowner">Homeowner</button>'
      +   '<button class="co-btn" type="button" data-co-paid="insurance">Insurance supplement</button></div>'
      + '<div class="co-why" id="coWhy"></div>'
      + '<div class="co-foot"><button class="co-btn" type="button" data-co-close="1">Cancel</button>'
      +   '<button class="co-btn primary" type="button" id="coSign" disabled>Homeowner signs</button></div>'
      + '</div>';
    document.body.appendChild(m);
    m.addEventListener('click', coClick);
    m.addEventListener('input', coInput);
    m.addEventListener('change', coChange);
    return m;
  }
  function coLinesHtml(){
    return coLines.map(function(l, i){
      return '<div class="co-row"><input data-co-desc="' + i + '" placeholder="What (e.g. soffit build-out, front gable)" aria-label="Work" value="' + coEsc(l.desc) + '">'
        + '<input data-co-amt="' + i + '" inputmode="decimal" placeholder="$" aria-label="Price" value="' + coEsc(l.amt) + '">'
        + '<button class="co-btn" type="button" data-co-del="' + i + '" aria-label="Remove line">×</button></div>';
    }).join('');
  }
  function coPaint(full){
    if(full){ var L = coQ('coLines'); if(L) L.innerHTML = coLinesHtml(); }
    var t = coQ('coTot'); if(t) t.textContent = coUsd(coTotal());
    var seg = coQ('coPaid'); if(seg) seg.querySelectorAll('[data-co-paid]').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-co-paid') === coPaidBy); });
    var s = coQ('coSign'); if(s instanceof HTMLButtonElement) s.disabled = coBusy || !coReady();
    var w = coQ('coWhy'); if(w) w.textContent = coBusy ? 'Saving…' : (!coFile ? 'A photo is required.' : (coTotal() > 0 ? '' : 'Add the work and its price.'));
  }
  function coOpen(pr){
    if(!pr) return;
    var m = coEnsure();
    coFor = pr; coLines = [{ desc:'', amt:'' }]; coPaidBy = 'homeowner'; coFile = null; coBusy = false; coArmed = null;
    var sub = coQ('coSub'); if(sub) sub.textContent = (pr.name || 'Client') + (pr.address ? ' · ' + pr.address : '') + ' — signed here before the work starts.';
    var ph = coQ('coPhoto'); if(ph){ var im = ph.querySelector('img'); if(im) im.remove(); }
    var pt = coQ('coPhotoTxt'); if(pt) pt.style.display = '';
    var fi = coQ('coFile'); if(fi instanceof HTMLInputElement) fi.value = '';
    coPaint(true);
    m.classList.add('open');
  }
  function coClose(){ var m = coQ('cr-co-sheet'); if(m) m.classList.remove('open'); coFor = null; coArmed = null; }
  function coInput(e){
    var el = e.target instanceof HTMLInputElement ? e.target : null; if(!el) return;
    var i = el.getAttribute('data-co-desc'), j = el.getAttribute('data-co-amt');
    if(i !== null && coLines[+i]) coLines[+i].desc = el.value;
    if(j !== null && coLines[+j]) coLines[+j].amt = el.value;
    coPaint(false);
  }
  function coChange(e){
    var el = e.target instanceof HTMLInputElement ? e.target : null;
    if(!el || el.id !== 'coFile') return;
    coFile = (el.files && el.files[0]) || null;
    var ph = coQ('coPhoto'), pt = coQ('coPhotoTxt');
    if(ph){ var old = ph.querySelector('img'); if(old) old.remove(); }
    if(coFile && ph){ var im = document.createElement('img'); im.alt = 'Change order photo'; im.src = URL.createObjectURL(coFile); ph.insertBefore(im, ph.firstChild); if(pt) pt.style.display = 'none'; }
    coPaint(false);
  }
  function coClick(e){
    var el = e.target instanceof Element ? e.target : null; if(!el) return;
    var t;
    if(el.closest('[data-co-close]')){ coClose(); return; }
    if(el.closest('[data-co-add]')){ coLines.push({ desc:'', amt:'' }); coPaint(true); return; }
    if((t = el.closest('[data-co-del]'))){ coLines.splice(+t.getAttribute('data-co-del'), 1); if(!coLines.length) coLines.push({ desc:'', amt:'' }); coPaint(true); return; }
    if((t = el.closest('[data-co-paid]'))){ coPaidBy = t.getAttribute('data-co-paid') || 'homeowner'; coPaint(false); return; }
    if(el.closest('#coSign')){ coSign(); return; }
  }
  function coSign(){
    if(coBusy || !coReady() || !coFor) return;
    if(typeof window.openSigner !== 'function'){ if(typeof crTell === 'function') crTell('The signature pad is not available here.'); return; }
    coArmed = 'co-' + Date.now();
    /* the pad sits under this sheet's layer; lift it while it is open */
    var pad = coQ('sigModal'); if(pad) pad.style.zIndex = '13000';
    window.openSigner({ id:coArmed }, async function(png, armedId){
      if(pad) pad.style.zIndex = '';
      if(armedId !== coArmed || !coFor) return;
      await coSave(png);
    });
  }
  async function coSave(sigPng){
    var pr = coFor; if(!pr || coBusy) return;
    coBusy = true; coPaint(false);
    try{
      var lines = coLines.filter(function(l){ return String(l.desc || '').trim() && coNum(l.amt) > 0; })
        .map(function(l){ return { desc:String(l.desc).trim(), amt:coNum(l.amt) }; });
      var total = Math.round(lines.reduce(function(a, l){ return a + l.amt; }, 0) * 100) / 100;
      var full = await resizeImageFile(coFile, 1600, 0.82);
      var small = await resizeImageFile(coFile, 900, 0.72);
      var who = (window.currentUser && (currentUser.name || currentUser.email)) || '';
      var when = new Date();
      var day = when.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
      var logo = location.origin + (typeof CARDINAL_LOGO_SRC === 'string' ? CARDINAL_LOGO_SRC : '/cardinal-report-logo.png');
      var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>Change Order — ' + coEsc(pr.name || 'Client') + '</title><style>'
        + 'body{font:14px/1.5 Georgia,"Times New Roman",serif;color:#1b1b1b;max-width:760px;margin:24px auto;padding:0 18px;background:#fff}'
        + 'h1{font:800 22px Arial,sans-serif;letter-spacing:.05em;color:#9c1822;margin:14px 0 4px}.mu{color:#555;font-size:13px}'
        + 'table{width:100%;border-collapse:collapse;margin:14px 0}td{padding:9px 4px;border-bottom:1px solid #ddd;vertical-align:top}td.r{text-align:right;white-space:nowrap}'
        + 'tr.tot td{font:800 16px Arial,sans-serif;border-bottom:2px solid #9c1822}.ph img{max-width:100%;border:1px solid #ddd;border-radius:6px}'
        + '.sig{margin-top:18px;border-top:1px solid #1b1b1b;padding-top:6px;font-size:13px}.sig img{height:64px;display:block}'
        + '</style></head><body>'
        + '<img src="' + coEsc(logo) + '" alt="Cardinal Roofing &amp; Renovations" style="height:56px">'
        + '<h1>CHANGE ORDER</h1>'
        + '<div class="mu">' + coEsc(pr.name || '') + (pr.address ? ' · ' + coEsc(pr.address) : '') + ' · ' + coEsc(day) + '</div>'
        + '<table>' + lines.map(function(l){ return '<tr><td>' + coEsc(l.desc) + '</td><td class="r">' + coUsd(l.amt) + '</td></tr>'; }).join('')
        + '<tr class="tot"><td>Added to the contract</td><td class="r">' + coUsd(total) + '</td></tr></table>'
        + '<p><b>Paid by:</b> ' + (coPaidBy === 'insurance' ? 'Insurance supplement (subject to the carrier’s approval; any part not approved is the homeowner’s)' : 'Homeowner') + '</p>'
        + '<p>This change is added to the contract for this job. The price above was agreed before the work began.</p>'
        + '<div class="ph"><img src="' + small + '" alt="What was found"></div>'
        + '<div class="sig"><img src="' + sigPng + '" alt="Homeowner signature">Homeowner · signed ' + coEsc(day) + '</div>'
        + '<p class="mu">Written by ' + coEsc(who) + ' for Cardinal Roofing &amp; Renovations</p>'
        + '</body></html>';
      var id = await db.create('Change Order — ' + (pr.name || 'Client'), html, pr.name, pr.id);
      await db.update(id, { total:total, signed_at:when.toISOString() });
      try{ await photoDb.add(pr.id, full, { section:'Change order', caption:lines.map(function(l){ return l.desc; }).join('; ').slice(0, 200) }); }catch(_p){}
      try{ if(typeof auditLog === 'function') auditLog('money', 'Change order signed ' + coUsd(total) + ' (' + coPaidBy + ')', pr.id); }catch(_a){}
      coBusy = false; coClose();
      try{ if(typeof reload === 'function') await reload(); }catch(_r){}
      try{ if(window.crToastOk) window.crToastOk('Change order signed — ' + coUsd(total) + ' added to the job'); }catch(_t){}
    }catch(err){
      coBusy = false; coPaint(false);
      if(typeof showError === 'function') showError('Could not save the change order: ' + ((err && err.message) || err));
    }
  }
  window.CardinalChangeOrder = Object.assign(window.CardinalChangeOrder || {}, { open:coOpen, close:coClose });
})();
</script>

"""
one('index.html', '<script id="cr-orv-script">', BLOCK + '<script id="cr-orv-script">')

one('index.html', ">v2026-10-12 build 1322<button", ">v2026-10-12 build 1323<button")
one('index.html', "var CHANGELOG = [", """var CHANGELOG = [
  { b: 1323, d:'2026-10-12', t:'Change orders, signed on the spot', s:'When the job changes on install day, open the client and tap Change order: take a photo of what you found, write the work and the price, pick who pays (homeowner or an insurance supplement), and the homeowner signs on your phone. It saves as a signed document in the job\\u2019s Documents, the photo goes in the job\\u2019s photos, and the amount is added to the job \\u2014 so the invoice and the pay link ask for it.' },""")

for k, v in files.items():
    pl.write_atomic(os.path.join(ROOT, k), v)
print('1323 applied')
