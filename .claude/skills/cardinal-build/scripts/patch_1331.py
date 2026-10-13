"""Build 1331 — install-day photos, required to mark a job Completed (Theo's picks 3A + 3.2B, 13 Oct).

Today a job can go Scheduled -> Completed with no install photos at all; McConnel did exactly that.

  - A Job Menu tile, "Install photos", with a done/needed count, opens a sheet of guided slots:
      roofing  : Before · Tear-off · Wood replaced* · Ice & water · Flashing* · Ridge / vents ·
                 Finished roof · Yard + magnet
      siding   : Before · Old siding off · House wrap · Trim & corners · Finished · Yard cleaned
      gutters  : Before · Hangers · Downspouts · Finished
    Repair, warranty and inspection jobs have no set (punch-outs cover those). Trade is read from
    the job's work type / trade fields; anything else is roofing, which is most of the work.
  - * 3.2B: a one-line note is REQUIRED on the two shots that get covered up for good — Wood
    replaced (how many sheets) and Flashing. The other shots save straight away.
  - Photos go where every job photo goes: project_photos via photoDb.add(), section
    "Install · <slot>", the note as the caption. No new table, no SQL.
  - 3A: setStage() refuses a forward move to Completed while any slot is missing. Theo and Joan can
    complete it anyway after saying why; that goes on the job's Owner Review (a manual row) and the
    activity log. Everyone else is told which photos are missing and the sheet opens.
Usage: python3 patch_1331.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
FILE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
s = pl.load(FILE)
def one(old, new):
    global s
    assert s.count(old) == 1, (old[:90], s.count(old))
    s = s.replace(old, new)

# the tile
one("""      jt(dbIc('contract'), 'Change order', (docs.filter(function(r){ return /^change order/i.test((r.title || '').trim()); }).length || ''), 'changeorder') +   /* 1323 */""",
"""      jt(dbIc('contract'), 'Change order', (docs.filter(function(r){ return /^change order/i.test((r.title || '').trim()); }).length || ''), 'changeorder') +   /* 1323 */
      ((window.CardinalInstall && window.CardinalInstall.setFor(pr)) ? jt(dbIc('camera'), 'Install photos', window.CardinalInstall.badge(pr), 'install', 'jmInstallN') : '') +   /* 1331 */""")
one("""      else if(act === 'changeorder'){ if(window.CardinalChangeOrder) window.CardinalChangeOrder.open(pr); }   /* 1323 */""",
"""      else if(act === 'changeorder'){ if(window.CardinalChangeOrder) window.CardinalChangeOrder.open(pr); }   /* 1323 */
      else if(act === 'install'){ if(window.CardinalInstall) window.CardinalInstall.open(pr); }   /* 1331 */""")

# the rule, in the one door every stage change walks through
one("""  var prev = normStage(pr.stage);
  await pdb.update(pr.id, { stage: v });""",
"""  var prev = normStage(pr.stage);
  /* 1331: a job is not Completed until its install photos are in (Theo, 3A). The guard says what is
     missing; Theo and Joan can complete it anyway with a reason, which goes on Owner Review. */
  if(v === 'Completed' && prev !== 'Completed' && ['Invoiced','Closed'].indexOf(prev) === -1 &&
     window.CardinalInstall && window.CardinalInstall.guard){
    var _instOk = false;
    try{ _instOk = await window.CardinalInstall.guard(pr); }catch(_ig){ _instOk = false; }
    if(!_instOk){
      try{ var _ss = /** @type {any} */ (document.getElementById('stageSel')); if(_ss && currentProject && currentProject.id === pr.id) _ss.value = prev; }catch(_is){}
      return false;
    }
  }
  await pdb.update(pr.id, { stage: v });""")

one("""      await window.setStage(c.id, String(vals.stage));""",
"""      /* 1331: setStage() answers false when it refuses (install photos missing) — say so, do not report it done */
      if((await window.setStage(c.id, String(vals.stage))) === false) throw new Error('Not moved: this job\u2019s install photos are not all in yet.');""")

BLOCK = r"""<style id="cr-inst-styles">
/* 1331: the install-photos sheet. Own tokens with literal fallbacks; dark here, light twin below. */
#cr-inst-sheet{
  --in-sheet:#141619; --in-ink:#f2f4f7; --in-dim:#a8b0ba; --in-line:#2a2e35; --in-well:#1b1f24; --in-red:#C8202E;
  --in-due:#f08a90; --in-ok:#34d399;
  position:fixed; inset:0; z-index:12000; display:none;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
}
:root[data-theme="rb-light"] #cr-inst-sheet{
  --in-sheet:#FFFFFF; --in-ink:#0F172A; --in-dim:#475569; --in-line:#E2E8F0; --in-well:#F8FAFC; --in-due:#B91C1C; --in-ok:#047857;
}
#cr-inst-sheet.open{display:block;}
#cr-inst-sheet .in-scrim{position:absolute; inset:0; background:rgba(0,0,0,.62);}
#cr-inst-sheet .in-box{position:absolute; left:0; right:0; bottom:0; max-height:92vh; overflow:auto; box-sizing:border-box;
  background:var(--in-sheet,#141619); color:var(--in-ink,#f2f4f7); border-radius:18px 18px 0 0; padding:16px 16px 24px;
  max-width:560px; margin:0 auto;}
#cr-inst-sheet .in-h{font-size:18px; font-weight:800; margin:0 0 2px;}
#cr-inst-sheet .in-sub{font-size:13px; color:var(--in-dim,#a8b0ba); margin:0 0 12px;}
#cr-inst-sheet .in-grid{display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px;}
#cr-inst-sheet .in-slot{position:relative; aspect-ratio:1; min-height:44px; border-radius:12px; overflow:hidden; cursor:pointer;
  border:1px dashed var(--in-due,#f08a90); background:var(--in-well,#1b1f24); color:var(--in-due,#f08a90);
  display:flex; align-items:flex-end; justify-content:center; padding:4px; font:inherit; font-size:12px; font-weight:700;
  line-height:1.2; text-align:center;}
#cr-inst-sheet .in-slot.ok{border:1px solid var(--in-ok,#34d399); color:var(--in-ink,#f2f4f7);}
#cr-inst-sheet .in-slot img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover;}
#cr-inst-sheet .in-slot.ok span{position:relative; background:rgba(0,0,0,.66); color:#fff; border-radius:6px; padding:2px 5px;}
#cr-inst-sheet .in-pane{margin-top:12px;}
#cr-inst-sheet .in-pane img{display:block; max-width:100%; max-height:240px; border-radius:10px; margin:0 auto 8px;}
#cr-inst-sheet .in-l{display:block; font-size:13px; font-weight:700; color:var(--in-dim,#a8b0ba); margin:8px 0 6px;}
#cr-inst-sheet textarea{width:100%; box-sizing:border-box; font:inherit; font-size:15px; min-height:64px;
  color:var(--in-ink,#f2f4f7); background:var(--in-well,#1b1f24); border:1px solid var(--in-line,#2a2e35); border-radius:10px; padding:10px 12px;}
#cr-inst-sheet .in-btn{display:inline-flex; align-items:center; justify-content:center; min-height:44px; min-width:44px; padding:8px 14px;
  border-radius:10px; border:1px solid var(--in-line,#2a2e35); background:transparent; color:var(--in-ink,#f2f4f7);
  font:inherit; font-size:14px; font-weight:700; cursor:pointer;}
#cr-inst-sheet .in-btn.primary{background:var(--in-red,#C8202E); border-color:var(--in-red,#C8202E); color:#fff;}
#cr-inst-sheet .in-btn[disabled]{opacity:.45; cursor:default;}
#cr-inst-sheet .in-foot{display:flex; gap:8px; margin-top:14px;}
#cr-inst-sheet .in-foot .in-btn{flex:1 1 0;}
#cr-inst-sheet .in-why{font-size:13px; color:var(--in-due,#f08a90); margin-top:8px; min-height:18px;}
</style>
<script id="cr-inst-script">
/* 1331: install-day photos. See patch_1331.py for the why. window.CardinalInstall. */
(function(){
  'use strict';
  var IN_SETS = {
    roof:    [ {l:'Before'}, {l:'Tear-off'}, {l:'Wood replaced', note:'How many sheets? Anything else you saw?'}, {l:'Ice & water'},
               {l:'Flashing', note:'What flashing went in, and where?'}, {l:'Ridge / vents'}, {l:'Finished roof'}, {l:'Yard + magnet'} ],
    siding:  [ {l:'Before'}, {l:'Old siding off'}, {l:'House wrap'}, {l:'Trim & corners'}, {l:'Finished'}, {l:'Yard cleaned'} ],
    gutters: [ {l:'Before'}, {l:'Hangers'}, {l:'Downspouts'}, {l:'Finished'} ]
  };
  var IN_PREFIX = 'Install · ';
  var inFor = null, inRows = [], inPending = null, inBusy = false, inCount = {}, inCounting = {};
  function inQ(id){ return /** @type {any} */ (document.getElementById(id)); }
  function inEsc(s){ return String(s == null ? '' : s).replace(/[<>&"']/g, function(c){ return { '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function inCk(pr){ try{ return (typeof parseCkAll === 'function') ? (parseCkAll(pr) || {}) : JSON.parse(pr.checklist || '{}'); }catch(_){ return {}; } }
  /* which set a job takes: null for repair / warranty / inspection work */
  function inTrade(pr){
    if(!pr) return null;
    var ck = inCk(pr), ld = ck.lead || {};
    var txt = [ck.work_type, ld.work_type, ck.job_category, ld.job_category, ck.trade, ld.trade,
               (ld.trades || []).join ? (ld.trades || []).join(' ') : ld.trades].join(' ').toLowerCase();
    if(/repair|warranty|inspection/.test(txt)) return null;
    if(/siding/.test(txt) && !/roof/.test(txt)) return 'siding';
    if(/gutter/.test(txt) && !/roof/.test(txt)) return 'gutters';
    return 'roof';
  }
  function inSet(pr){ var t = inTrade(pr); return t ? IN_SETS[t] : null; }
  function inHave(rows){
    var have = {};
    (rows || []).forEach(function(r){
      var sec = String(r.section || '');
      if(sec.indexOf(IN_PREFIX) === 0) have[sec.slice(IN_PREFIX.length)] = r;
    });
    return have;
  }
  function inMissing(set, rows){
    var have = inHave(rows);
    return set.filter(function(sl){
      var r = have[sl.l];
      return !r || (sl.note && !String(r.caption || '').trim());
    }).map(function(sl){ return sl.l; });
  }
  async function inLoad(pr){
    var rows = (typeof photoDb !== 'undefined' && photoDb.listByProject) ? await photoDb.listByProject(pr.id) : [];
    return rows || [];
  }
  function inPaintBadge(pr, set, rows){
    var n = set.length - inMissing(set, rows).length;
    inCount[pr.id] = n + '/' + set.length;
    var b = inQ('jmInstallN');
    if(b && window.currentProject && window.currentProject.id === pr.id){
      b.textContent = inCount[pr.id];
      b.classList.toggle('zero', false);
    }
  }
  function inBadge(pr){
    var set = inSet(pr); if(!set) return '';
    if(!inCounting[pr.id]){
      inCounting[pr.id] = true;
      inLoad(pr).then(function(rows){ inPaintBadge(pr, set, rows); }, function(){}).then(function(){ inCounting[pr.id] = false; });
    }
    return inCount[pr.id] || ('0/' + set.length);
  }

  function inEnsure(){
    var m = inQ('cr-inst-sheet'); if(m) return m;
    m = document.createElement('div'); m.id = 'cr-inst-sheet';
    m.innerHTML = '<div class="in-scrim" data-in-close="1"></div><div class="in-box" role="dialog" aria-modal="true" aria-labelledby="inTitle">'
      + '<div class="in-h" id="inTitle">Install photos</div><div class="in-sub" id="inSub"></div>'
      + '<div class="in-grid" id="inGrid"></div>'
      + '<div class="in-pane" id="inPane" hidden><img id="inPrev" alt="The photo you just took">'
      + '<label class="in-l" for="inNote" id="inNoteL"></label><textarea id="inNote"></textarea>'
      + '<div class="in-foot"><button type="button" class="in-btn" id="inRetake">Retake</button>'
      + '<button type="button" class="in-btn primary" id="inSave">Save</button></div></div>'
      + '<div class="in-why" id="inWhy" aria-live="polite"></div>'
      + '<div class="in-foot"><button type="button" class="in-btn" data-in-close="1">Close</button></div>'
      + '<input type="file" id="inFile" accept="image/*" capture="environment" hidden></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      if(e.target.closest('[data-in-close]')){ inClose(); return; }
      var sl = e.target.closest('[data-in-slot]');
      if(sl && !inBusy){ inPending = { i:Number(sl.getAttribute('data-in-slot')) }; inQ('inFile').value = ''; inQ('inFile').click(); }
    });
    inQ('inFile').addEventListener('change', async function(){
      var f = /** @type {any} */ (this).files && /** @type {any} */ (this).files[0]; if(!f || !inPending || !inFor) return;
      try{ inPending.data = await resizeImageFile(f, 1600, 0.82); }catch(_r){ inQ('inWhy').textContent = 'That photo could not be read. Try again.'; return; }
      var sl = inSet(inFor)[inPending.i];
      if(sl && sl.note){
        inQ('inPrev').src = inPending.data;
        inQ('inNoteL').textContent = sl.l + ': ' + sl.note;
        inQ('inNote').value = '';
        inQ('inPane').hidden = false;
        inQ('inNote').focus();
      }else{
        inSave('');
      }
    });
    inQ('inRetake').addEventListener('click', function(){ inQ('inFile').value = ''; inQ('inFile').click(); });
    inQ('inSave').addEventListener('click', function(){
      var t = String(inQ('inNote').value || '').trim();
      if(!t){ inQ('inWhy').textContent = 'Write one line about what you saw before saving.'; return; }
      inSave(t);
    });
    return m;
  }
  async function inSave(note){
    if(!inFor || !inPending || !inPending.data || inBusy) return;
    var sl = inSet(inFor)[inPending.i]; if(!sl) return;
    inBusy = true; inQ('inWhy').textContent = 'Saving…';
    try{
      await photoDb.add(inFor.id, inPending.data, { section:IN_PREFIX + sl.l, caption:note || null });
      inPending = null; inQ('inPane').hidden = true; inQ('inWhy').textContent = '';
      await inRender();
    }catch(e){ inQ('inWhy').textContent = 'Could not save: ' + ((e && e.message) || e); }
    inBusy = false;
  }
  async function inRender(){
    var set = inSet(inFor); if(!set) return;
    try{ inRows = await inLoad(inFor); }catch(_l){ inRows = []; }
    var have = inHave(inRows), miss = inMissing(set, inRows);
    inQ('inSub').textContent = (set.length - miss.length) + ' of ' + set.length + ' · tap a box to take its photo' +
      (miss.length ? '' : ' · all in, the job can be marked Completed');
    inQ('inGrid').innerHTML = set.map(function(sl, i){
      var r = have[sl.l], ok = r && (!sl.note || String(r.caption || '').trim());
      var src = r ? (r._thumb || r._src || r.data || '') : '';   /* attachSignedPhotoUrls() names them _thumb/_src */
      return '<button type="button" class="in-slot' + (ok ? ' ok' : '') + '" data-in-slot="' + i + '" aria-label="' + inEsc(sl.l + (ok ? ', done' : ', missing')) + '">'
        + (ok && src ? '<img alt="" src="' + inEsc(src) + '">' : '') + '<span>' + inEsc(sl.l) + '</span></button>';
    }).join('');
    inPaintBadge(inFor, set, inRows);
  }
  function inOpen(pr){
    if(!pr || !inSet(pr)) return;
    inFor = pr; inPending = null; inEnsure();
    inQ('inPane').hidden = true; inQ('inWhy').textContent = '';
    inQ('cr-inst-sheet').classList.add('open');
    inRender();
  }
  function inClose(){ var m = inQ('cr-inst-sheet'); if(m) m.classList.remove('open'); inPending = null; }

  /* the setStage() rule. Resolves true when the job may be marked Completed. */
  async function inGuard(pr){
    var set = inSet(pr); if(!set) return true;
    var rows;
    try{ rows = await inLoad(pr); }
    catch(_l){ if(typeof crTell === 'function') crTell('Could not check the install photos. Try again with signal.'); return false; }
    var miss = inMissing(set, rows);
    if(!miss.length) return true;
    var admin = (typeof isAdminUser === 'function') && isAdminUser();
    if(!admin){
      /* said INSIDE the sheet, not as a toast: a toast sits over the sheet's Save button on a phone */
      inOpen(pr);
      var w = inQ('inWhy'); if(w) w.textContent = 'Install photos first. Still missing: ' + miss.join(', ') + '.';
      return false;
    }
    var ask = (typeof window.crAsk === 'function') ? window.crAsk : function(){ return Promise.resolve(false); };
    if(!(await ask(miss.length + ' install photo' + (miss.length === 1 ? ' is' : 's are') + ' missing: ' + miss.join(', ') +
        '.\n\nComplete the job anyway? You will be asked why, and it goes on the job’s Owner Review.'))){ inOpen(pr); var w2 = inQ('inWhy'); if(w2) w2.textContent = 'Still missing: ' + miss.join(', ') + '.'; return false; }
    var why = window.prompt('Why complete it without them?', '');
    if(why === null || !String(why).trim()) return false;
    why = String(why).trim();
    try{
      var c = window.sb || window.supa;
      if(c) await c.from('owner_reviews').insert({ project_id:pr.id, client_name:pr.name || null, rep_email:pr.sales_rep || pr.created_by || null,
        source:'manual', reason:('Completed without install photos: ' + why).slice(0, 80), status:'open', notes:[],
        created_by:(/** @type {any} */ (window).currentUser || {}).email || null });
    }catch(_o){}
    try{ if(typeof auditLog === 'function') auditLog('stage', 'Completed without ' + miss.length + ' install photo(s): ' + why, pr.id); }catch(_a){}
    return true;
  }
  window.CardinalInstall = Object.assign(window.CardinalInstall || {}, { open:inOpen, close:inClose, guard:inGuard, badge:inBadge,
    setFor:function(pr){ return !!inSet(pr); }, missing:function(pr){ var set = inSet(pr); return set ? inLoad(pr).then(function(r){ return inMissing(set, r); }) : Promise.resolve([]); } });
})();
</script>
"""
i = s.rfind('</body>')
s = s[:i] + BLOCK + s[i:]

one(""">v2026-10-13 build 1330<button""", """>v2026-10-13 build 1331<button""")
CL = "{ b: 1330, d:'2026-10-13',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1331, d:'2026-10-13', t:'Install photos before a job is Completed', s:'Every roofing job now has an Install photos tile in its Job Menu: eight guided shots from Before to Yard + magnet, with a short set for siding and gutter jobs. Wood replaced and Flashing each ask for one line about what you saw. A job cannot be marked Completed until all of them are in; the app says which are missing and opens the photos. Repairs, warranty and inspection jobs are not affected.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1331 applied')
