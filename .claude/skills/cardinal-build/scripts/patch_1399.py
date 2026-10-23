"""Build 1399 — a sales rep's day, driven tap by tap (23 Oct 2026 audit, round 3).
1. Job Documents kept only the FIRST file of a multi-file upload ("✓ Added 1 file."): addJobFiles() loops a
   live FileList across awaits and the handler cleared the input straight after the call. Copied first, as
   the scan input already does.
2. An estimate that was emailed stayed Draft. Publish-with-Email opened the email sheet AND, 900 ms later,
   the "send it?" chooser on top; "Not now" then Send marked the document sent and never the estimate — nor
   did any later send from the document. One standing cr-doc-sent listener now marks the estimate whose
   doc_id this is Sent (draft only, .select() so a refusal is not silent), and the chooser is skipped when
   the email sheet is already opening. The chooser path keeps its own write (the listener stands down for it).
3. A builder estimate could not be signed in person: refreshSigBtn looked for .sign / [data-sig] and the
   estimate's block is .ac-sign; the pad also filled the LAST column, which is Cardinal's. Client signature
   shows on it now and the pad fills the Client Acceptance column. The remote share-link path is untouched
   (it matches the same empty line; once signed, it no longer offers).
4. Admin-only menu rows (Invoices & AR, Owner Review, Labor Rate Schedule, Graphs & Reports…) showed to reps
   in the phone drawer: hideOpt() set an inline display:none and the drawer's display:flex !important beat
   it. They carry data-cradmin and a matching !important rule, the data-crhide mechanism.
5. Home "Gone quiet" never listed anything: it read p.stage_since, which is not a column — it is in the checklist.
6. Home Recent leads / Today / Gone quiet could be blank on first load: the first render ran before
   cr-kphome-script defined renderKpHomeRow. The module paints once when it arrives if the data is in.
7. Publish and → Contract opened the new document UNDER the estimate builder (z 150 vs 9500). The builder
   closes first (confirmed, per CLAUDE.md's close() note).
8. "…Construction Agreement created" was a red error toast (crTell with no 'ok')."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1
one("""document.getElementById('jdFileInput').addEventListener('change', function(){
  addJobFiles(this.files); this.value = '';
});""",
"""document.getElementById('jdFileInput').addEventListener('change', function(){
  /* 1399: addJobFiles loops across awaits; clearing the input emptied the live FileList after file one */
  var fl = Array.prototype.slice.call(this.files || []); this.value = '';
  if(fl.length) addJobFiles(fl);
});""")

# 2
one("""document.dispatchEvent(new CustomEvent('cr-est-published', { detail: {
id: est.id, docId: docId, prevStatus: est.status || 'draft', project: projectBefore,
} }));""",
"""document.dispatchEvent(new CustomEvent('cr-est-published', { detail: {
id: est.id, docId: docId, prevStatus: est.status || 'draft', project: projectBefore,
emailNext: !!_emailNext,   /* 1399: the email sheet is already opening — no second "send it?" over it */
} }));""")
one("""if(d.prevStatus !== 'draft') return;
setTimeout(function(){ markSentAfterPublish(d); }, 900);
});""",
"""if(d.prevStatus !== 'draft') return;
if(d.emailNext) return;   /* 1399: the standing cr-doc-sent listener below records that send */
setTimeout(function(){ markSentAfterPublish(d); }, 900);
});
/* 1399: ONE standing listener. However a published estimate's document goes out — Email to client from the
   document, Publish-with-Email, a send days later — the estimate it came from becomes Sent. Draft only, and
   .select() so a refused UPDATE reads as a refusal. The chooser path (markSentAfterPublish) does its own
   write and toast, so this stands down for a document it is waiting on. */
var _essAwaiting = {};
document.addEventListener('cr-doc-sent', function(ev){
var _evd = /** @type {any} */ (ev);
var docId = _evd && _evd.detail && _evd.detail.docId;
if(docId == null || _essAwaiting[String(docId)] || !window.supa) return;
/* only a document that IS an estimate's — an invoice or contract going out is not this */
var _w = /** @type {any} */ (window);
var _row = (_w.cacheRows || []).filter(function(/** @type {any} */ x){ return String(x.id) === String(docId); })[0];
if(!_row || !(typeof _w.isEstimateDoc === 'function' ? _w.isEstimateDoc(_row) : (typeof _w.isEstimateTitle === 'function' && _w.isEstimateTitle(_row.title)))) return;
Promise.resolve(window.supa.from('estimates').update({ status:'sent' })
  .eq('doc_id', docId).eq('status', 'draft').select('id,project_id')).then(function(r){
  if(!r || r.error || !r.data || !r.data.length) return;
  var row = r.data[0];
  toast('Estimate marked Sent');
  try{ document.dispatchEvent(new CustomEvent('cr-est-status', { detail: { id: row.id, status: 'sent' } })); }catch(_){ }
  var pr = (window.cacheProjects || []).filter(function(p){ return String(p.id) === String(row.project_id); })[0];
  try{ if(pr && window.CardinalEstimates && typeof window.CardinalEstimates.refreshSavedList === 'function') window.CardinalEstimates.refreshSavedList(pr.id); }catch(_){}
  try{ if(typeof window.renderOverview === 'function') window.renderOverview(); }catch(_){}
  if(pr) syncStageFor(pr, 'sent');
}, function(){});
});""")
one("""function crAwaitDocSent(docId, ms){
  return new Promise(function(resolve){
    var done = false, t = null;
    function off(v){
      if(done) return;
      done = true;""",
"""function crAwaitDocSent(docId, ms){
  _essAwaiting[String(docId)] = 1;   /* 1399: the standing listener stands down for this one */
  return new Promise(function(resolve){
    var done = false, t = null;
    function off(v){
      if(done) return;
      done = true;
      delete _essAwaiting[String(docId)];""")

# 3
one("""  b.style.display = (doc && (doc.querySelector('.sign') || doc.querySelector('[data-sig]'))) ? 'inline-block' : 'none';""",
    """  /* 1399: a builder estimate's block is .ac-sign */
  b.style.display = (doc && (doc.querySelector('.sign') || doc.querySelector('.ac-sign') || doc.querySelector('[data-sig]'))) ? 'inline-block' : 'none';""")
one("""  var cols = doc ? doc.querySelectorAll('.sign .col') : [];
  if(!cols.length){ sigModal.style.display = 'none'; return; }
  var col = cols[cols.length - 1];""",
"""  var cols = doc ? doc.querySelectorAll('.sign .col, .ac-sign .col') : [];
  if(!cols.length){ sigModal.style.display = 'none'; return; }
  /* 1399: the CLIENT's column — on an estimate the last one is Cardinal's representative */
  var col = Array.prototype.filter.call(cols, function(c){ var l = c.querySelector('.lbl'); return l && /^\\s*client acceptance/i.test(l.textContent || ''); })[0] || cols[cols.length - 1];""")

# 4
one("""function hideOpt(dataNav){
var el = document.querySelector('#navMenu .navopt[data-nav="' + dataNav + '"]');
if(el) el.style.display = 'none';
}""",
"""function hideOpt(dataNav){
var el = document.querySelector('#navMenu .navopt[data-nav="' + dataNav + '"]');
/* 1399: the phone drawer's display:flex !important beat this inline none — the attribute carries it */
if(el){ el.style.display = 'none'; el.setAttribute('data-cradmin', '1'); }
}""")
one("""  body:not(.cr-lnav-on) #navMenu .navopt[data-crhide="1"]{display:none !important;}""",
    """  body:not(.cr-lnav-on) #navMenu .navopt[data-crhide="1"]{display:none !important;}
  body:not(.cr-lnav-on) #navMenu .navopt[data-cradmin="1"]{display:none !important;}   /* 1399: hideOpt's admin-only rows */""")

# 5
one("""      if(!p.stage_since) return;
      var days = Math.floor((nowMs - new Date(p.stage_since).getTime()) / 86400000);""",
"""      /* 1399: stage_since lives in the checklist, not on the row */
      var _ss = p.stage_since || ((typeof parseCkAll === 'function' ? (parseCkAll(p) || {}) : {}).stage_since);
      if(!_ss) return;
      var days = Math.floor((nowMs - new Date(_ss).getTime()) / 86400000);""")

# 6
one("""  if(typeof openProject === 'function') openProject(r.getAttribute('data-proj'));
});
})();
</script>""",
"""  if(typeof openProject === 'function') openProject(r.getAttribute('data-proj'));
});
/* 1399: the first home render can run before this module parses — paint once now if the data is in */
try{ if(typeof cacheLoaded !== 'undefined' && cacheLoaded) window.renderKpHomeRow(); }catch(_){}
})();
</script>""")

# 7
one("""function openDoc(docId){
if(typeof window.openEditor === 'function'){
try{ window.openEditor(docId); return true; }""",
"""/* 1399: the builder (z 9500) sat over the document editor (z 150) — close it first, and confirm */
function crCloseEstBuilder(){
try{ if(window.CardinalEstimates && typeof window.CardinalEstimates.close === 'function') window.CardinalEstimates.close(); }catch(_){}
var v = document.getElementById('cr-est-view'); if(v && v.classList.contains('open')) v.classList.remove('open');
}
/** @type {any} */ (window).crCloseEstBuilder = crCloseEstBuilder;
function openDoc(docId){
if(typeof window.openEditor === 'function'){
crCloseEstBuilder();
try{ window.openEditor(docId); return true; }""")
one("""if(typeof window.openEditor === 'function'){
try{ await window.openEditor(docId); }catch(_){}
}
var _tr = _lastKind""",
"""if(typeof window.openEditor === 'function'){
try{ var _wc = /** @type {any} */ (window); if(typeof _wc.crCloseEstBuilder === 'function') _wc.crCloseEstBuilder(); }catch(_){}   /* 1399 */
try{ await window.openEditor(docId); }catch(_){}
}
var _tr = _lastKind""")
# 8
one("""     : '\\n\\nThis is the general Service Contract and it does not carry the Notice of Cancellation. ' +
       'For a sale made at the home, use the Roofing, Siding or Gutter Construction Agreement.'));""",
"""     : '\\n\\nThis is the general Service Contract and it does not carry the Notice of Cancellation. ' +
       'For a sale made at the home, use the Roofing, Siding or Gutter Construction Agreement.'), 'ok');   /* 1399: a success, not a red error */""")

one(">v2026-10-23 build 1398<", ">v2026-10-23 build 1399<")
one("""  { b: 1398, d:'2026-10-23',""",
"""  { b: 1399, d:'2026-10-23', t:'Fixes from a day as a rep', s:'Uploading several files at once to a job\\u2019s Documents keeps all of them (it kept only the first). Emailing an estimate marks it Sent however you send it. A builder estimate can be signed in person, on the client\\u2019s line. Admin-only menu items no longer show to reps on a phone. Home\\u2019s Gone quiet lists jobs that have sat too long, and the home cards fill in on first load. Publishing an estimate or making a contract opens the document in front of the builder instead of behind it.' },
  { b: 1398, d:'2026-10-23',""")
one("""    if((t = e.target.closest('#crpay-payer [data-p]'))){""", """    if(_et && (t = _et.closest('#crpay-payer [data-p]'))){""")   # 1399: typed like its neighbours (gate_types)
pl.write_atomic(path, s)
print('ok 1399')
