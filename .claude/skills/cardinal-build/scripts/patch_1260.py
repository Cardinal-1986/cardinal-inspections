#!/usr/bin/env python3
"""Build 1260 — edit an appointment instead of deleting it (Jacob, via Theo).

Jacob, 7 Oct (8:01 PM, forwarded by Theo): "Need a way to edit calendar
instead of deleting the appointment if something needs changed."

The calendar's day sheet (#apptModal) could add and delete, nothing else — a
moved call meant ✕ and retype. Now every row the person may change (the same
apptCanEdit() rule as ✕: its creator or an admin — RLS "appt own or admin
update" says the same) gets an Edit button:

  * the form under the list turns into "Edit appointment", filled with the
    row's What / Type / Time / Client / Notes, plus a Date field (edit only —
    adding still books the open day);
  * Save changes writes ONLY the fields that changed, through adb.update — the
    one appointments write path. ⚠ That matters: adb.update treats a patch that
    carries project_id as "a job was just ATTACHED" and buzzes production and
    offers the Pre-Install Guide (998/1047/1111). Re-sending an unchanged
    client on every edit would re-fire both;
  * a BUILD DAY whose date or time moved tells production through the same
    __apptNotifyProduction() a new one does — a crew showing up on the old
    day is the real cost of a silent move;
  * a moved appointment jumps the sheet to its new day; the toast reminds
    whoever put it on their phone's calendar (1258) to add it again;
  * the same title / job-needs-a-client checks as Add; Cancel edit, Close and
    opening another day all leave edit mode.

usage: python3 patch_1260.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# ── markup: a head we can rename, a Date field, Cancel edit ──
src = pl.sub(src, """    <div class="ckhead" style="margin-top:14px;">&#43; Add appointment</div>
    <label>What *<input type="text" id="apptTitle" placeholder="e.g. Inspection @ 12 Oak St" autocomplete="off"></label>""",
"""    <div class="ckhead" id="apptFormHead" style="margin-top:14px;">&#43; Add appointment</div>
    <label>What *<input type="text" id="apptTitle" placeholder="e.g. Inspection @ 12 Oak St" autocomplete="off"></label>
    <!-- 1260: editing can move an appointment to another day; adding still books the open day -->
    <label id="apptDateLbl" style="display:none;">Date<input type="date" id="apptDate"></label>""")
src = pl.sub(src, """      <button class="chipbtn" id="apptClose">Close</button>
      <button class="btn" id="apptSave">Add</button>""", """      <button class="chipbtn" id="apptEditCancel" type="button" style="display:none;">Cancel edit</button>
      <button class="chipbtn" id="apptClose">Close</button>
      <button class="btn" id="apptSave">Add</button>""")

# ── CSS: the Edit button, the row being edited, actions that wrap on a phone ──
src = pl.sub(src, """.apptrow .del{border:0;background:none;color:#b3a49d;font-size:15px;cursor:pointer;}
.apptrow .del:hover{color:var(--red);}""", """.apptrow .del{border:0;background:none;color:#b3a49d;font-size:15px;cursor:pointer;}
.apptrow .del:hover{color:var(--red);}
/* 1260: Edit, and the row it is editing. The day sheet is the white form sheet
   in both themes (Forms 1), so a fixed ink like 1258's Add to calendar. */
.apptrow .apptedit{flex:none;min-height:44px;padding:0 14px;border-radius:8px;cursor:pointer;
  border:1px solid #9aa4b2;background:#ffffff;color:#1e2b4a;font:700 13px 'Segoe UI',Arial,sans-serif;}
.apptrow .apptact{flex:none;display:flex;align-items:center;gap:8px;margin-left:auto;}
.apptrow.editing{border-color:#c8202e;box-shadow:0 0 0 1px #c8202e inset;}
@media (max-width:520px){
  .apptrow{flex-wrap:wrap;}
  .apptrow .apptact{flex-basis:100%;justify-content:flex-end;}
}""")

# ── the row: Edit beside Add to calendar, all actions in one group ──
src = pl.sub(src, """    return '<div class="apptrow" data-aid="' + a.id + '">' +
      '<span class="tm">' + (a.appt_time ? fmtApptTime(a.appt_time) : '\\u2014') + '</span>' +""",
"""    return '<div class="apptrow' + (apptEditId === String(a.id) ? ' editing' : '') + '" data-aid="' + a.id + '">' +
      '<span class="tm">' + (a.appt_time ? fmtApptTime(a.appt_time) : '\\u2014') + '</span>' +""")
src = pl.sub(src, """      '</span>' +
      ((apptCanEdit(a) && !pr && (a.kind === 'job' || a.kind === 'drop'))
        ? '<button class="chipbtn" data-apptattach="' + a.id + '" ' +
            'style="margin-left:8px;">Attach to a job</button>'
        : '') +
      '<button type="button" class="apptcal" data-apptcal="' + esc(String(a.id)) + '">Add to calendar</button>' +   /* 1258 */
      (apptCanEdit(a) ? '<button class="del" title="Delete">\\u2715</button>' : '') +
      '</div>';""", """      '</span>' +
      '<span class="apptact">' +   /* 1260: one group, so a phone wraps it under the text */
      ((apptCanEdit(a) && !pr && (a.kind === 'job' || a.kind === 'drop'))
        ? '<button class="chipbtn" data-apptattach="' + a.id + '" ' +
            'style="margin-left:8px;">Attach to a job</button>'
        : '') +
      (apptCanEdit(a) ? '<button type="button" class="apptedit" data-apptedit="' + esc(String(a.id)) + '">Edit</button>' : '') +   /* 1260 */
      '<button type="button" class="apptcal" data-apptcal="' + esc(String(a.id)) + '">Add to calendar</button>' +   /* 1258 */
      (apptCanEdit(a) ? '<button class="del" title="Delete">\\u2715</button>' : '') +
      '</span></div>';""")

# ── edit mode ──
src = pl.sub(src, """/* 1258 (B1): "Add to calendar" — an .ics for Apple Calendar, Google's add-event""",
"""/* 1260: edit an appointment in place (Jacob: "edit instead of deleting").
   apptEditId is the row being edited; null means the form adds, as before. */
var apptEditId = null;
function apptEditUi(on){
  var h = document.getElementById('apptFormHead'); if(h) h.textContent = on ? 'Edit appointment' : '\\u002B Add appointment';
  var dl = document.getElementById('apptDateLbl'); if(dl) dl.style.display = on ? '' : 'none';
  var sv = /** @type {HTMLButtonElement} */ (document.getElementById('apptSave')); if(sv){ sv.textContent = on ? 'Save changes' : 'Add'; sv.disabled = false; }
  var cx = document.getElementById('apptEditCancel'); if(cx) cx.style.display = on ? '' : 'none';
  document.getElementById('apptError').textContent = '';
}
function apptEditStart(id){
  var a = cacheAppts.filter(function(x){ return String(x.id) === String(id); })[0];
  if(!a || !apptCanEdit(a)) return;
  apptEditId = String(a.id);
  /** @type {HTMLInputElement} */ (document.getElementById('apptTitle')).value = a.title || '';
  /** @type {HTMLSelectElement} */ (document.getElementById('apptKind')).value = a.kind || 'appt';
  /** @type {HTMLInputElement} */ (document.getElementById('apptTime')).value = a.appt_time ? String(a.appt_time).slice(0, 5) : '';
  /** @type {HTMLSelectElement} */ (document.getElementById('apptClient')).value = a.project_id ? String(a.project_id) : '';
  /** @type {HTMLInputElement} */ (document.getElementById('apptNotes')).value = a.notes || '';
  /** @type {HTMLInputElement} */ (document.getElementById('apptDate')).value = a.appt_date || apptDay || '';
  apptEditUi(true);
  renderApptList();
  try{ document.getElementById('apptFormHead').scrollIntoView({ block:'start', behavior:'smooth' }); }catch(_){}
  try{ document.getElementById('apptTitle').focus({ preventScroll:true }); }catch(_){}
}
/* leave edit mode; a form that was editing is emptied so its values cannot
   leak into the next Add (an Add that was never editing keeps its fields) */
function apptEditReset(){
  var was = !!apptEditId;
  apptEditId = null;
  apptEditUi(false);
  if(was){
    ['apptTitle','apptTime','apptNotes','apptDate'].forEach(function(id){ /** @type {HTMLInputElement} */ (document.getElementById(id)).value = ''; });
    /** @type {HTMLSelectElement} */ (document.getElementById('apptClient')).value = '';
    /** @type {HTMLSelectElement} */ (document.getElementById('apptKind')).value = 'appt';
  }
}
async function apptSaveEdit(){
  var a = cacheAppts.filter(function(x){ return String(x.id) === String(apptEditId); })[0];
  var err = document.getElementById('apptError');
  if(!a){ apptEditReset(); renderApptList(); return; }
  var v = function(id){ return /** @type {HTMLInputElement} */ (document.getElementById(id)).value; };
  var f = { title: v('apptTitle').trim(), appt_date: v('apptDate'), appt_time: v('apptTime') || null,
            project_id: v('apptClient') || null, notes: v('apptNotes').trim() || null, kind: v('apptKind') || 'appt' };
  if(!f.title){ err.textContent = 'Enter what the appointment is.'; return; }
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(f.appt_date)){ err.textContent = 'Pick the date.'; return; }
  if((f.kind === 'job' || f.kind === 'drop') && !f.project_id){   /* 998: the same rule as Add */
    err.textContent = 'Pick the job this ' + (f.kind === 'job' ? 'build day' : 'delivery') +
      ' is for \\u2014 without it the job never reaches Scheduled and no crew can be put on it.';
    return;
  }
  /* ONLY what changed — a patch carrying project_id means "a job was attached"
     to adb.update, which buzzes production and offers the Pre-Install Guide */
  var patch = {};
  if(f.title !== String(a.title || '')) patch.title = f.title;
  if(f.appt_date !== String(a.appt_date || '')) patch.appt_date = f.appt_date;
  if((f.appt_time || '') !== (a.appt_time ? String(a.appt_time).slice(0, 5) : '')) patch.appt_time = f.appt_time;
  if(String(f.project_id || '') !== String(a.project_id || '')) patch.project_id = f.project_id;
  if((f.notes || '') !== String(a.notes || '')) patch.notes = f.notes;
  if(f.kind !== (a.kind || 'appt')) patch.kind = f.kind;
  if(!Object.keys(patch).length){ apptEditReset(); renderApptList(); return; }
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('apptSave'));
  btn.disabled = true; btn.textContent = 'Saving\\u2026';
  try{
    await adb.update(a.id, patch);
  }catch(e){
    btn.disabled = false; btn.textContent = 'Save changes';
    err.textContent = 'Could not save \\u2014 ' + ((e && e.message) || e);
    return;
  }
  var merged = Object.assign({}, a, patch);
  var whenMoved = ('appt_date' in patch) || ('appt_time' in patch);
  /* a build day that MOVED is news for the crew; adb.update only says so when
     a job is attached (project_id in the patch), so say it here otherwise */
  if(whenMoved && !('project_id' in patch) && merged.kind === 'job' && merged.project_id) __apptNotifyProduction(merged);
  cacheAppts = await adb.list().catch(function(){ return cacheAppts; });
  try{ if(boardView.style.display !== 'none') openScheduleBoard(); }catch(_){}
  apptEditReset();
  var moved = ('appt_date' in patch) && patch.appt_date !== apptDay;
  if(moved) openApptDay(patch.appt_date); else renderApptList();
  renderCalendar();
  try{
    if(window.crToastOk){
      var d = String(merged.appt_date).split('-');
      var lbl = new Date(+d[0], +d[1] - 1, +d[2]).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
      window.crToastOk((moved ? 'Moved to ' + lbl : 'Saved') +
        (whenMoved ? ' \\u2014 if it is on your phone\\u2019s calendar, add it again' : ''));
    }
  }catch(_t){}
}
document.getElementById('apptEditCancel').addEventListener('click', function(){ apptEditReset(); renderApptList(); });
/* 1258 (B1): "Add to calendar" — an .ics for Apple Calendar, Google's add-event""")

# the list's click handler: Edit
src = pl.sub(src, """  if(cal){ apptCalOpen(cal.getAttribute('data-apptcal')); return; }   /* 1258 */""",
"""  if(cal){ apptCalOpen(cal.getAttribute('data-apptcal')); return; }   /* 1258 */
  var ed = (/** @type {HTMLElement} */ (e.target)).closest('[data-apptedit]');
  if(ed){ apptEditStart(ed.getAttribute('data-apptedit')); return; }   /* 1260 */""")

# Save: edit mode saves the edit
src = pl.sub(src, """document.getElementById('apptSave').addEventListener('click', async function(){
  var title = document.getElementById('apptTitle').value.trim();""", """document.getElementById('apptSave').addEventListener('click', async function(){
  if(apptEditId){ await apptSaveEdit(); return; }   /* 1260 */
  var title = document.getElementById('apptTitle').value.trim();""")

# leaving: Close, and opening a day, end edit mode
src = pl.sub(src, """document.getElementById('apptClose').addEventListener('click', function(){ apptModal.style.display = 'none'; });""",
"""document.getElementById('apptClose').addEventListener('click', function(){ apptEditReset(); apptModal.style.display = 'none'; });   /* 1260 */""")
src = pl.sub(src, """function openApptDay(ds){
  apptDay = ds;""", """function openApptDay(ds){
  apptEditReset();   /* 1260 */
  apptDay = ds;""")

src = pl.sub(src, '>v2026-10-07 build 1259<', '>v2026-10-07 build 1260<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1260, d: '2026-10-07', t: 'Edit an appointment instead of deleting it',
    s: 'Open a day on the calendar and every appointment you made has an <b>Edit</b> button. It fills the form with that appointment \\u2014 what, type, time, client, notes and the <b>date</b> \\u2014 so you can change one thing and tap <b>Save changes</b>. Move it to another day and the calendar jumps there. If a build day moves, the crew is told. If you had added it to your phone\\u2019s calendar, add it again after a change.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
