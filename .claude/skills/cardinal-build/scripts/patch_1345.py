"""Build 1345 — deleting a document moves it to a Trash; it can be restored for 30 days (Theo, 14 Oct: "2a").
Five signed/priced documents on one job were deleted in three minutes and nothing could bring them back: a
DELETE on inspection_reports also cascades its document_versions away. Now:
1. db.remove (the ONE delete pipeline, 524) calls trash_document(p_doc) — document_trash.sql — which copies the
   row and its saved versions into document_trash and then deletes it, with the reports_delete permission.
   If the Trash is not set up it REFUSES to delete (never falls back to a hard delete).
   The estimates.doc_id clears are dropped: a restored document keeps its estimate link, and a dangling doc_id
   already self-heals on publish (1014).
2. Every "cannot be undone" confirm on a document says where it goes instead.
3. A "Trash" line under Contracts and Estimates on the client page lists that job's deleted documents
   (last 30 days) with Restore — restore_document(p_id) puts the row and its versions back under the same id."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""  remove: async function(id){
    if(TEAM){
      var r = await sb.from(TABLE).delete().eq('id', id);
      if(r.error) throw r.error;
      /* 1014 (audit DB-1): deleting a document never cleared the estimates rows""",
"""  remove: async function(id){
    if(TEAM){
      /* 1345: a delete goes to the Trash (document_trash.sql) — restorable for 30 days, saved versions
         included. Never a hard delete: if the Trash is not set up, nothing is deleted. */
      var tr = await sb.rpc('trash_document', { p_doc: id });
      if(tr.error){
        var _tm = String(tr.error.code || '') + ' ' + String(tr.error.message || '');
        if(/PGRST202|42883|could not find the function/i.test(_tm)) throw new Error('the Trash is not set up yet, so nothing was deleted');
        throw tr.error;
      }
      return;
      /* 1014 (audit DB-1): deleting a document never cleared the estimates rows""")

one("""      if(await crAsk('Delete "' + ((r2 && r2.title) || 'Untitled inspection') + '"? This removes it for the whole team and cannot be undone.')){""",
"""      if(await crAsk('Move "' + ((r2 && r2.title) || 'Untitled inspection') + '" to the Trash? It leaves this job for everyone, and it can be restored from the Trash under Contracts for 30 days.')){""")
one("""    if(!await crAsk('Delete this file for everyone?')) return;""",
"""    if(!await crAsk('Move this file to the Trash? It can be restored from the Trash under Contracts for 30 days.')) return;""")

one("""  var cm = document.getElementById('contractDocsMount');
  if(cm) cm.innerHTML = ctrs.length ? docTable(ctrs)
    : '<div class="empty"><b>No contracts yet.</b><br>Use <b>+ New contract</b>, or approve the job from the pipeline to auto-create one.</div>';
}""",
"""  var cm = document.getElementById('contractDocsMount');
  if(cm) cm.innerHTML = ctrs.length ? docTable(ctrs)
    : '<div class="empty"><b>No contracts yet.</b><br>Use <b>+ New contract</b>, or approve the job from the pipeline to auto-create one.</div>';
  try{ crRenderTrash(); }catch(_t){}   /* 1345 */
}
/* 1345: this job's Trash — documents deleted in the last 30 days, each with Restore. Drawn under Contracts
   and under Estimates. Silent when the Trash is empty or not set up. */
var _crTrashSeq = 0;
function crRenderTrash(){
  var pr = currentProject, seq = ++_crTrashSeq;
  var mounts = document.querySelectorAll('.cr-trash-mount');
  if(!mounts.length) return;
  mounts.forEach(function(m){ m.innerHTML = ''; });
  if(!pr || !TEAM || !sb || typeof sb.from !== 'function') return;
  var since = new Date(Date.now() - 30 * 86400000).toISOString();
  Promise.resolve(sb.from('document_trash').select('id,title,deleted_by,deleted_at').eq('project_id', pr.id)
    .gte('deleted_at', since).order('deleted_at', { ascending: false })).then(function(r){
    if(seq !== _crTrashSeq || !r || r.error || !r.data || !r.data.length) return;
    var rows = r.data.map(function(t){
      var nm = String(t.title || 'Untitled').replace(/^file:\\s*/i, '');
      var when = new Date(t.deleted_at), left = Math.max(0, 30 - Math.floor((Date.now() - when.getTime()) / 86400000));
      return '<div class="tskrow" style="display:flex;align-items:center;gap:10px;">' +
        '<span style="flex:1;min-width:0;"><b style="display:block;overflow:hidden;text-overflow:ellipsis;">' + esc(nm) + '</b>' +
        '<small>Deleted ' + esc(when.toLocaleDateString('en-US', { month:'short', day:'numeric' })) +
        (t.deleted_by ? ' by ' + esc((typeof rptRepName === 'function' && rptRepName(t.deleted_by)) || t.deleted_by) : '') +
        ' \\u00b7 ' + left + ' day' + (left === 1 ? '' : 's') + ' left</small></span>' +
        '<button class="btn" type="button" data-trash-restore="' + esc(t.id) + '" style="min-height:44px;">Restore</button></div>';
    }).join('');
    var html = '<details class="cr-trash" style="margin-top:12px;"><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:700;">Trash (' +
      r.data.length + ') \\u2014 deleted in the last 30 days</summary>' + rows + '</details>';
    document.querySelectorAll('.cr-trash-mount').forEach(function(m){ m.innerHTML = html; });
  }, function(){});
}
document.addEventListener('click', async function(e){
  var _et = /** @type {any} */ (e.target);
  var b = _et && _et.closest ? _et.closest('[data-trash-restore]') : null;
  if(!b) return;
  b.disabled = true; b.textContent = 'Restoring\\u2026';
  try{
    var r = await sb.rpc('restore_document', { p_id: b.getAttribute('data-trash-restore') });
    if(r.error) throw r.error;
    try{ if(window.crToastOk) window.crToastOk('Restored \\u2014 it is back on this job.'); }catch(_){}
    await reload();
    try{ renderProjectDocs(); }catch(_r){}
  }catch(err){
    b.disabled = false; b.textContent = 'Restore';
    showError('Could not restore: ' + (err.message || err));
  }
});""")

one("""      <div id="contractDocsMount"><div class="loading">Loading…</div></div>""",
"""      <div id="contractDocsMount"><div class="loading">Loading…</div></div>
      <div class="cr-trash-mount"></div>""")
one("""      <div id="estDocsMount"><div class="loading">Loading…</div></div>""",
"""      <div id="estDocsMount"><div class="loading">Loading…</div></div>
      <div class="cr-trash-mount"></div>""")

one(">v2026-10-14 build 1344<button", ">v2026-10-14 build 1345<button")
one("""  { b: 1344, d:'2026-10-14',""",
"""  { b: 1345, d:'2026-10-14', t:'Deleted documents go to a Trash', s:'Deleting an estimate, contract, invoice, report or file no longer erases it. It goes to the Trash for 30 days \\u2014 open Contracts or Estimates on the client\\u2019s page and tap Trash to see what was deleted, by whom, and Restore it. A restored document comes back exactly as it was, with its saved versions.' },
  { b: 1344, d:'2026-10-14',""")
pl.write_atomic(path, s)
print('patched', path)
