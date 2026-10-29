"""Build 1413 — posting a message no longer erases a teammate's (29 Oct 2026, judge #13 of Theo's audit panel).
sendChat() saved through saveCkPatch(), which wrote the WHOLE checklist from the copy loaded when the job was
opened: a note Curtis posted from the roof after Theo opened the job was erased, with every other checklist change
made since (payments, tasks, worksheet). The 655 fix (patchProjectCk: re-read, then merge keys) existed and the chat
never used it, and even it replaced the `comments` key wholesale. The call log and every punch-out message had the
same read-change-write shape on their own lists.
Now: saveCkPatch delegates to patchProjectCk; patchProjectCk and CardinalPunch.update UNION a `comments` array
with the server's (crMergeComments — the lists are append-only, nothing in the app edits or deletes a comment);
the call log goes through patchProjectCk; postComment re-reads before writing."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(P, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)

# 1. the merge helper + patchProjectCk unions comments
s = one(s, """async function patchProjectCk(pr, patch){
  /* 655 (CR-AUD-007):""", """/* 1413: comment lists are APPEND-ONLY (nothing edits or deletes one), so two devices that each
   added a message must both keep theirs: union by who + when + text, oldest first. Where both
   copies hold the same message, the caller's wins (it may carry a flag the caller just set). */
function crMergeComments(server, mine){
  var out = [], seen = {};
  function key(c){ return c ? [c.at || '', c.by || '', c.name || '', c.text || '', c.flag || '', c.kind || ''].join('\\u0001') : ''; }
  (Array.isArray(mine) ? mine : []).forEach(function(c){ var k = key(c); if(k && !seen[k]){ seen[k] = 1; out.push(c); } });
  (Array.isArray(server) ? server : []).forEach(function(c){ var k = key(c); if(k && !seen[k]){ seen[k] = 1; out.push(c); } });
  return out.sort(function(a, b){ return String(a.at || '').localeCompare(String(b.at || '')); });
}
window.crMergeComments = crMergeComments;
async function patchProjectCk(pr, patch){
  /* 655 (CR-AUD-007):""")
s = one(s, """  Object.keys(patch).forEach(function(k){ all[k] = patch[k]; });
  var s = JSON.stringify(all);
  await pdb.update(pr.id, { checklist: s }, patch);   /* 1403: offline, only these keys are replayed */""",
"""  Object.keys(patch).forEach(function(k){
    /* 1413: a message list is merged, never replaced — a teammate's note posted since this copy was read survives */
    if(k === 'comments' && Array.isArray(patch[k]) && Array.isArray(all[k])) all[k] = crMergeComments(all[k], patch[k]);
    else all[k] = patch[k];
  });
  var s = JSON.stringify(all);
  await pdb.update(pr.id, { checklist: s }, patch);   /* 1403: offline, only these keys are replayed */""")

# 2. saveCkPatch delegates (it wrote the whole local checklist)
s = one(s, """async function saveCkPatch(patch){
  if(!currentProject) return;
  var all = parseCkAll(currentProject);
  Object.assign(all, patch);
  var s = JSON.stringify(all);
  await pdb.update(currentProject.id, { checklist: s });
  currentProject.checklist = s;
  var cp = cacheProjects.find(function(x){ return x.id === currentProject.id; });
  if(cp) cp.checklist = s;
}""", """async function saveCkPatch(patch){
  if(!currentProject) return;
  /* 1413: this wrote the WHOLE checklist from the copy loaded when the job was opened, so a save here
     erased everything another device had saved since — the job thread above all. patchProjectCk (655)
     re-reads and merges; it also keeps the cache and currentProject in step, as this did. */
  await patchProjectCk(currentProject, patch);
}""")

# 3. the call log: same whole-record write from the cache
s = one(s, """  var s2 = JSON.stringify(all);
  try{
    await pdb.update(pr.id, { checklist: s2 });
    pr.checklist = s2;
    if(currentProject && currentProject.id === pr.id){ currentProject.checklist = s2; renderOverview(); }""",
"""  try{
    /* 1413: through patchProjectCk — re-read, merge the message in, keep everyone else's */
    await patchProjectCk(pr, { comments: all.comments });
    if(currentProject && currentProject.id === pr.id){ renderOverview(); }""")

# 4. CardinalPunch.update — the one punch write path — unions a comments patch with the server's
s = one(s, """async function update(id, patch){
  var it = _rows.filter(function(x){ return String(x.id) === String(id); })[0];
  if(!it) return { ok:false };
  var before = {};""", """async function update(id, patch){
  var it = _rows.filter(function(x){ return String(x.id) === String(id); })[0];
  if(!it) return { ok:false };
  /* 1413: a punch-out's messages are append-only — merge with the server's list so a crew note and an
     office note sent close together both survive (this replaced the whole list from the card's copy) */
  if(Array.isArray(patch.comments) && typeof window.crMergeComments === 'function' && !_noSignal(null)){
    try{
      var _fr = await window.supa.from('punch_items').select('comments').eq('id', it.id).single();
      if(_fr && !_fr.error && _fr.data && Array.isArray(_fr.data.comments)) patch.comments = window.crMergeComments(_fr.data.comments, patch.comments);
    }catch(_){}
  }
  var before = {};""")

# 5. the punch page's postComment wrote punch_items directly from its copy
s = one(s, """var list = (Array.isArray(it.comments) ? it.comments : []).slice();
list.push(msg);
var r = await window.supa.from('punch_items').update({ comments: list }).eq('id', it.id).select().single();""",
"""var list = (Array.isArray(it.comments) ? it.comments : []).slice();
list.push(msg);
/* 1413: re-read and merge first — the card's copy may be missing a message posted since it loaded */
try{
  var _fr = await window.supa.from('punch_items').select('comments').eq('id', it.id).single();
  if(_fr && !_fr.error && _fr.data && Array.isArray(_fr.data.comments) && typeof window.crMergeComments === 'function') list = window.crMergeComments(_fr.data.comments, list);
}catch(_){}
var r = await window.supa.from('punch_items').update({ comments: list }).eq('id', it.id).select().single();""")

s = one(s, ">v2026-10-29 build 1412<", ">v2026-10-29 build 1413<")
s = one(s, """  { b: 1412, d:'2026-10-29',""",
"""  { b: 1413, d:'2026-10-29', t:'Messages no longer erase each other', s:'If two people posted on the same job or punch-out close together, the second post could erase the first, and saving a job could undo another device\\u2019s changes made since it was opened. Every post and save now reads the latest copy first and keeps everyone\\u2019s messages.' },
  { b: 1412, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1413')
