#!/usr/bin/env python3
"""Build 1271 — Upload an estimate (Theo, 9 Oct: "Can you have a way to upload estimates").

An estimate written somewhere else — on paper at the table, in Roofr, from a
supplier — had no way onto the job. The door already exists for contracts
(1262, cr-ctup-script): photos or a PDF, an amount, a date, saved as an
ordinary document. This teaches that ONE sheet a second kind instead of
building a second uploader.

  Estimates → "Upload estimate": trade, amount, date, photos/PDF. Saved as
  `Estimate — <Trade> — <client>` so isEstimateTitle() files it under Estimates,
  with total set and NO signed_at. jobFinance() already prices a job from a
  document-only estimate when no contract is signed (its 1011 doc leg), so the
  job value follows with no money code touched. It opens, prints and emails
  like any document; its pages are data: URIs, so 1270's email needs nothing.

usage: python3 patch_1271.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. the button on the Estimates tab, and the empty-state line
src = pl.sub(src, """          </div>
        </span>
        <!-- 1028: the profile's AI-Estimate door""", """          </div>
        </span>
        <button class="btn" id="pUploadEstimateBtn" type="button" style="margin-left:8px;">Upload estimate</button>
        <!-- 1028: the profile's AI-Estimate door""")
src = pl.sub(src, """'<div class="empty"><b>No estimates yet.</b><br>Use <b>\\uFF0B From a template</b> to start from a trade template, or <b>Blank estimate</b> to write your own.</div>'""",
 """'<div class="empty"><b>No estimates yet.</b><br>Use <b>\\uFF0B From a template</b> to start from a trade template, or <b>Upload estimate</b> for one written on paper or in another program.</div>'""")

# 2. the sheet learns a kind
src = pl.sub(src, """  var MAX_PAGES = 15, MAX_HTML = 9 * 1024 * 1024;
  function ctuEsc(""", """  var MAX_PAGES = 15, MAX_HTML = 9 * 1024 * 1024;
  /* 1271: one sheet, two kinds. An uploaded estimate is the same paper-to-document
     step as a signed contract; only the words, the title and signed_at differ. */
  var CTU_KINDS = {
    contract: { head:'Upload signed contract', intro:'A windows job, or an agreement signed on paper. Add photos or a PDF of the signed contract and its amount — it counts like any signed contract, and the invoice opens.',
      amt:'Contract amount', date:'Date signed', file:'Photos or PDF of the signed contract', go:'Save signed contract', noun:'contract' },
    estimate: { head:'Upload estimate', intro:'An estimate written on paper or in another program. Add photos or a PDF of it and its amount — it files under Estimates, prices the job until a contract is signed, and emails like any estimate.',
      amt:'Estimate amount', date:'Estimate date', file:'Photos or PDF of the estimate', go:'Save estimate', noun:'estimate' }
  };
  var ctuKind = 'contract';
  function ctuEsc(""")
src = pl.sub(src, """  function ctuBuild(){
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
    ctuBuild();""", """  function ctuBuild(){
    var K = CTU_KINDS[ctuKind];
    if(!sheet){
      sheet = document.createElement('div');
      sheet.id = 'ctUpSheet';
      sheet.setAttribute('role', 'dialog');
      document.body.appendChild(sheet);
    }
    if(sheet.getAttribute('data-kind') === ctuKind) return sheet;
    sheet.setAttribute('data-kind', ctuKind);
    sheet.setAttribute('aria-label', K.head);
    sheet.innerHTML = '<div class="q"><b>' + K.head + '</b>' +
      '<p>' + K.intro + '</p>' +
      '<label>Trade<select id="ctUpTrade">' + TRADES.map(function(t){ return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>' + K.amt + ' ($)<input id="ctUpAmt" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 8450"></label>' +
      '<label>' + K.date + '<input id="ctUpDate" type="date"></label>' +
      '<label>' + K.file + '<input id="ctUpFile" type="file" accept="image/*,application/pdf" multiple></label>' +
      '<div class="st" id="ctUpSt" role="status"></div>' +
      '<div class="row"><button type="button" class="pri" id="ctUpGo">' + K.go + '</button><button type="button" class="no" id="ctUpNo">Cancel</button></div></div>';
    el('ctUpNo').addEventListener('click', ctuClose);
    el('ctUpGo').addEventListener('click', ctuSave);
    return sheet;
  }
  function ctuOpen(kind){
    ctuKind = (kind === 'estimate') ? 'estimate' : 'contract';
    var pr = ctuProj();
    if(!pr){ if(window.crToastErr) window.crToastErr('Open a client first — ' + (ctuKind === 'estimate' ? 'an estimate' : 'a contract') + ' needs a job to belong to.'); return; }
    ctuBuild();""")
src = pl.sub(src, """    el('ctUpGo').disabled = false; el('ctUpGo').textContent = 'Save signed contract';
    sheet.classList.add('open');""", """    el('ctUpGo').disabled = false; el('ctUpGo').textContent = CTU_KINDS[ctuKind].go;
    sheet.classList.add('open');""")
src = pl.sub(src, """    var pr = ctuProj(); if(!pr) return ctuClose();
    var st = el('ctUpSt'), go = el('ctUpGo');""", """    var pr = ctuProj(); if(!pr) return ctuClose();
    var K = CTU_KINDS[ctuKind], isEst = ctuKind === 'estimate';
    var st = el('ctUpSt'), go = el('ctUpGo');""")
src = pl.sub(src, """    if(!(amt > 0)){ st.textContent = 'Enter the contract amount.'; return; }
    if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(day || '')){ st.textContent = 'Pick the date it was signed.'; return; }
    if(!files.length){ st.textContent = 'Add a photo or PDF of the signed contract.'; return; }""", """    if(!(amt > 0)){ st.textContent = 'Enter the ' + K.noun + ' amount.'; return; }
    if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(day || '')){ st.textContent = isEst ? 'Pick the estimate date.' : 'Pick the date it was signed.'; return; }
    if(!files.length){ st.textContent = isEst ? 'Add a photo or PDF of the estimate.' : 'Add a photo or PDF of the signed contract.'; return; }""")
src = pl.sub(src, """        if(pages.length > MAX_PAGES) throw new Error('That is more than ' + MAX_PAGES + ' pages — upload the signed pages only.');""",
 """        if(pages.length > MAX_PAGES) throw new Error('That is more than ' + MAX_PAGES + ' pages — upload ' + (isEst ? 'the estimate pages' : 'the signed pages') + ' only.');""")
src = pl.sub(src, """        '<h1>Signed agreement — ' + ctuEsc(label) + '</h1>' +
        '<p class="meta"><b>' + ctuEsc(pr.name || 'Client') + '</b>' + (pr.address ? ' · ' + ctuEsc(pr.address) : '') +
        '<br>Contract amount <b>' + ctuEsc(money) + '</b> · signed <b>' + ctuEsc(signedNice) + '</b>' +
        '<br>Uploaded ' + ctuEsc(new Date().toLocaleDateString('en-US')) + (me ? ' by ' + ctuEsc(me) : '') + ' — the signed paper is the contract; this is its copy.</p>' +
        pages.map(function(u, k){ return '<img alt="Signed contract, page ' + (k + 1) + '" src="' + u + '">'; }).join('') +""",
 """        '<h1>' + (isEst ? 'Estimate' : 'Signed agreement') + ' — ' + ctuEsc(label) + '</h1>' +
        '<p class="meta"><b>' + ctuEsc(pr.name || 'Client') + '</b>' + (pr.address ? ' · ' + ctuEsc(pr.address) : '') +
        '<br>' + (isEst ? 'Estimate' : 'Contract') + ' amount <b>' + ctuEsc(money) + '</b> · ' + (isEst ? 'dated' : 'signed') + ' <b>' + ctuEsc(signedNice) + '</b>' +
        '<br>Uploaded ' + ctuEsc(new Date().toLocaleDateString('en-US')) + (me ? ' by ' + ctuEsc(me) : '') + (isEst ? ' — a copy of the original estimate.' : ' — the signed paper is the contract; this is its copy.') + '</p>' +
        pages.map(function(u, k){ return '<img alt="' + (isEst ? 'Estimate' : 'Signed contract') + ', page ' + (k + 1) + '" src="' + u + '">'; }).join('') +""")
src = pl.sub(src, """      var id = await db.create('Contract — ' + label + ' — ' + (pr.name || 'Client'), html, pr.name, pr.id);
      await db.update(id, { signed_at: new Date(day + 'T12:00:00').toISOString(), total: Math.round(amt * 100) / 100 });
      if(typeof window.auditLog === 'function'){ try{ window.auditLog('contract', 'Uploaded signed contract (' + label + ', ' + money + ')', pr.id); }catch(_){} }""",
 """      /* 1271: an estimate is titled so isEstimateTitle() files it, and carries a
         total but never signed_at — jobFinance's document leg prices the job
         from it until a contract is signed. */
      var id = await db.create((isEst ? 'Estimate — ' : 'Contract — ') + label + ' — ' + (pr.name || 'Client'), html, pr.name, pr.id);
      await db.update(id, isEst ? { total: Math.round(amt * 100) / 100 }
        : { signed_at: new Date(day + 'T12:00:00').toISOString(), total: Math.round(amt * 100) / 100 });
      if(typeof window.auditLog === 'function'){ try{ window.auditLog(isEst ? 'estimate' : 'contract', (isEst ? 'Uploaded estimate (' : 'Uploaded signed contract (') + label + ', ' + money + ')', pr.id); }catch(_){} }""")
src = pl.sub(src, """      if(window.crToastOk) window.crToastOk('Signed ' + label + ' contract saved — ' + money + '. Invoices & Payments can open now.');
    }catch(err){
      st.textContent = (err && err.message) || String(err);
      go.disabled = false; go.textContent = 'Save signed contract';
    }""", """      if(window.crToastOk) window.crToastOk(isEst ? (label + ' estimate saved — ' + money + '. It is under Estimates.')
        : ('Signed ' + label + ' contract saved — ' + money + '. Invoices & Payments can open now.'));
    }catch(err){
      st.textContent = (err && err.message) || String(err);
      go.disabled = false; go.textContent = K.go;
    }""")
src = pl.sub(src, """  if(upBtn) upBtn.addEventListener('click', function(e){ e.preventDefault(); ctuOpen(); });
  window.CardinalContractUpload = Object.assign(window.CardinalContractUpload || {}, { open: ctuOpen, close: ctuClose });""",
 """  if(upBtn) upBtn.addEventListener('click', function(e){ e.preventDefault(); ctuOpen('contract'); });
  var upEst = document.getElementById('pUploadEstimateBtn');   /* 1271 */
  if(upEst) upEst.addEventListener('click', function(e){ e.preventDefault(); ctuOpen('estimate'); });
  window.CardinalContractUpload = Object.assign(window.CardinalContractUpload || {}, { open: ctuOpen, close: ctuClose });""")

src = pl.sub(src, '>v2026-10-09 build 1270<', '>v2026-10-09 build 1271<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1271, d: '2026-10-09', t: 'Upload an estimate',
    s: 'Estimates has <b>Upload estimate</b>: an estimate written on paper or in another program comes in as photos or a PDF, with its trade, amount and date. It files under Estimates, the job is priced from it until a contract is signed, and it opens, prints and emails like any estimate.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
