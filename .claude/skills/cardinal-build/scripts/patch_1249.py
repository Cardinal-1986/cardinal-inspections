#!/usr/bin/env python3
"""Build 1249 — On hold (Theo's pick 3C, 7 Oct 2026).

The punch card (cr-pk-script) gets "Put on hold": a sheet asking WHY it is
waiting (materials · homeowner · weather · adjuster · something else), WHICH
DAY to look at it again — six working days, Sunday skipped, each showing how
busy the assignee already is that day — and a note. Holding writes the five
hold_* columns (punch_hold.sql, applied 7 Oct) and moves scheduled_at to the
look-again day, so on that morning the job is back in Today with 1248's
"Back from hold" flag and on the assignee's day. Status stays 'open'.

On hold, the card says so at the top of its right column with the reason,
the day, the note and who held it, and offers Change / Take off hold.

usage: python3 patch_1249.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../../index.html')
src = pl.load(PATH)

# ── state ──
src = pl.sub(src, '''/* 947: per-open UI state — the dispatch fold and the header menu */
var dispOpen = false, menuOpen = false;''', '''/* 947: per-open UI state — the dispatch fold and the header menu */
var dispOpen = false, menuOpen = false;
/* 1249: the On hold sheet — open flag and the pick in progress */
var holdOpen = false, holdPick = { r:'', d:'', n:'' };
var HOLD_REASONS = [
  { k:'materials', l:'Materials',      s:'Waiting on an order' },
  { k:'homeowner', l:'Homeowner',      s:'Not home, or moving the day' },
  { k:'weather',   l:'Weather',        s:'Rain or wind that day' },
  { k:'adjuster',  l:'Adjuster',       s:'Waiting on insurance' },
  { k:'other',     l:'Something else', s:'Say what in the note' }
];''')

# a pause glyph for the icon set
src = pl.sub(src, '''  flag :'<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  user :''', '''  flag :'<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  pause:'<path d="M9 5v14M15 5v14"/>',
  user :''')

# ── markup: the hold block sits above Close; the sheet rides after the card ──
src = pl.sub(src, '''      msgsHtml() + closeHtml(done) +
    '</div></div></div>';
}''', '''      msgsHtml() + holdHtml(done) + closeHtml(done) +
    '</div></div></div>' + (holdOpen && !done ? holdSheetHtml() : '');
}
/* ── 1249: On hold ── */
function holdToday(){ return dayKey(new Date()); }
function holdOn(){ return !!(it && it.status !== 'done' && it.hold_reason &&
  (!it.hold_until || String(it.hold_until).slice(0, 10) > holdToday())); }
function holdBack(){ return !!(it && it.status !== 'done' && it.hold_reason && it.hold_until &&
  String(it.hold_until).slice(0, 10) <= holdToday()); }
function holdLabel(k){ var r = HOLD_REASONS.filter(function(x){ return x.k === k; })[0]; return r ? r.l : String(k || ''); }
function holdDayLabel(k){
  var p = String(k || '').split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
  if(isNaN(d.getTime())) return '';
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] + ' ' + d.getDate() + ' ' +
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
}
/* six working days from tomorrow, Sunday skipped (940's rule) */
function holdDays(){
  var out = [], d = new Date();
  d.setHours(12, 0, 0, 0);
  while(out.length < 6){
    d.setDate(d.getDate() + 1);
    if(d.getDay() !== 0) out.push(dayKey(d));
  }
  return out;
}
/* how many stops the assignee (or, unassigned, the whole crew) already has that day */
function holdLoad(key){
  var all = (window.CardinalPunch && window.CardinalPunch.rows) ? window.CardinalPunch.rows() : [];
  var who = it.assigned_to || '';
  return all.filter(function(r){
    return r && String(r.id) !== String(it.id) && r.status !== 'done' &&
      String(r.scheduled_at || '').slice(0, 10) === key && (!who || r.assigned_to === who);
  }).length;
}
function holdHtml(done){
  if(done) return '';
  if(holdOn() || holdBack()){
    var back = holdBack();
    return '<div class="pksec pkhold' + (back ? ' back' : '') + '">' +
      '<div class="pkh">' + svg('pause') + (back ? 'Back from hold' : 'On hold') +
        '<span class="rt"><b>' + esc(holdLabel(it.hold_reason)) + '</b></span></div>' +
      '<div class="pkhold-d">' + (it.hold_until ? (back ? 'Was due back ' : 'Look at it again ') + esc(holdDayLabel(String(it.hold_until).slice(0, 10))) : 'No day set') + '</div>' +
      (it.hold_note ? '<div class="pkdesc">' + esc(it.hold_note) + '</div>' : '') +
      (it.hold_by ? '<div class="pknote">Held by ' + esc(nameOf(it.hold_by)) + (it.hold_at ? ' · ' + esc(fmtWhen(it.hold_at)) : '') + '</div>' : '') +
      '<div class="pkbtns" style="margin-top:10px;">' +
        (back ? '' : '<button class="pkbtn" data-act="hold" type="button">Change</button>') +
        '<button class="pkbtn" data-act="unhold" type="button">' + (back ? 'Clear the hold' : 'Take off hold') + '</button>' +
      '</div></div>';
  }
  return '<button class="pkfold pkholdbtn" data-act="hold" type="button">' + svg('pause') +
    '<span class="tx">Put on hold</span><span class="ch">\\u203A</span></button>';
}
function holdSheetHtml(){
  var pr = projectFor(it.project_id);
  var who = it.assigned_to ? nameOf(it.assigned_to) : '';
  var ready = !!(holdPick.r && holdPick.d);
  return '<div class="pkhs" data-act="holdx"><div class="pkhs-p" role="dialog" aria-modal="true" aria-label="Put on hold">' +
    '<div class="pkhs-h"><div><h2>Put on hold</h2><p>' + esc(pr ? (pr.name || '') : '') + ' · ' + esc(it.title || '') + '</p></div>' +
      '<button class="pkhs-x" data-act="holdx" type="button" aria-label="Cancel">×</button></div>' +
    '<div class="pkhs-q">Why is it waiting?</div>' +
    '<div class="pkhs-r">' + HOLD_REASONS.map(function(r){
      return '<button type="button" class="pkhs-t' + (holdPick.r === r.k ? ' on' : '') + '" data-hr="' + r.k + '" aria-pressed="' + (holdPick.r === r.k) + '">' +
        '<b>' + esc(r.l) + '</b><span>' + esc(r.s) + '</span></button>';
    }).join('') + '</div>' +
    '<div class="pkhs-q">Look at it again on</div>' +
    '<div class="pkhs-w">' + holdDays().map(function(k){
      var n = holdLoad(k), lab = holdDayLabel(k).split(' ');
      return '<button type="button" class="pkhs-d' + (holdPick.d === k ? ' on' : '') + '" data-hd="' + k + '" aria-pressed="' + (holdPick.d === k) + '">' +
        '<span>' + lab[0] + '</span><b>' + lab[1] + '</b><small>' + (n ? n + ' stop' + (n === 1 ? '' : 's') : 'free') + '</small></button>';
    }).join('') + '</div>' +
    '<p class="pknote">' + (who ? esc(who) + '\\u2019s days, with how busy each one already is.' : 'How busy the crew already is each day.') + ' Sunday is skipped.</p>' +
    '<div class="pkhs-q">Note</div>' +
    '<textarea class="pkhs-n" data-f="holdnote" rows="2" placeholder="What are we waiting on?">' + esc(holdPick.n) + '</textarea>' +
    '<div class="pkhs-f"><button class="pkbtn" data-act="holdx" type="button">Cancel</button>' +
      '<button class="pkhs-go" data-act="holdgo" type="button"' + (ready ? '' : ' disabled') + '>' + svg('pause') +
        (holdPick.d ? 'Hold until ' + esc(holdDayLabel(holdPick.d)) : 'Pick a reason and a day') + '</button></div>' +
  '</div></div>';
}
async function holdSave(){
  if(!holdPick.r || !holdPick.d) return;
  var t = it.title || '';
  holdOpen = false;
  await save({ hold_reason: holdPick.r, hold_until: holdPick.d, hold_note: (holdPick.n || '').trim() || null,
               hold_by: myEmail() || null, hold_at: new Date().toISOString(),
               /* the look-again day IS the day: on that morning it is back in
                  Today and on the assignee's day, flagged Back from hold */
               scheduled_at: holdPick.d, scheduled_time: null });
  if(typeof window.auditLog === 'function'){
    try{ window.auditLog('punch', 'On hold (' + holdLabel(holdPick.r) + ' until ' + holdPick.d + '): ' + t, it.project_id); }catch(_){}
  }
}
async function holdClear(){
  await save({ hold_reason: null, hold_until: null, hold_note: null, hold_by: null, hold_at: null });
  if(typeof window.auditLog === 'function'){
    try{ window.auditLog('punch', 'Off hold: ' + (it.title || ''), it.project_id); }catch(_){}
  }
}''')

# ── wiring ──
src = pl.sub(src, '''  q('[data-act="dispatch"]', function(b){ b.onclick = function(){ dispOpen = !dispOpen; lastSig = ''; render(); }; });''',
'''  q('[data-act="dispatch"]', function(b){ b.onclick = function(){ dispOpen = !dispOpen; lastSig = ''; render(); }; });
  /* 1249: On hold */
  var holdNote = function(){ var ta = el.querySelector('[data-f="holdnote"]'); if(ta) holdPick.n = ta.value; };
  q('[data-act="hold"]', function(b){ b.onclick = function(){
    holdPick = holdOn() ? { r: it.hold_reason || '', d: String(it.hold_until || '').slice(0, 10), n: it.hold_note || '' }
                        : { r:'', d:'', n:'' };
    if(holdPick.d && holdDays().indexOf(holdPick.d) === -1) holdPick.d = '';
    holdOpen = true; lastSig = ''; render();
  }; });
  q('[data-act="holdx"]', function(b){ b.onclick = function(ev){
    if(b.classList.contains('pkhs') && ev.target !== b) return;   /* the shade closes, the panel does not */
    holdOpen = false; lastSig = ''; render();
  }; });
  q('[data-hr]', function(b){ b.onclick = function(){ holdNote(); holdPick.r = b.getAttribute('data-hr'); lastSig = ''; render(); }; });
  q('[data-hd]', function(b){ b.onclick = function(){ holdNote(); holdPick.d = b.getAttribute('data-hd'); lastSig = ''; render(); }; });
  q('[data-act="holdgo"]', function(b){ b.onclick = function(){ holdNote(); holdSave(); }; });
  q('[data-act="unhold"]', function(b){ b.onclick = holdClear; });''')

# every open starts with the sheet shut
src = pl.sub(src, '''async function open(itemId, opts){''', '''async function open(itemId, opts){
  holdOpen = false; holdPick = { r:'', d:'', n:'' };''')

# ── CSS ──
src = pl.sub(src, '''#cr-pk .pkclose .jump{ text-decoration:underline; text-underline-offset:3px; cursor:pointer; }''',
'''#cr-pk .pkclose .jump{ text-decoration:underline; text-underline-offset:3px; cursor:pointer; }
/* 1249: On hold — the block on the card, and the sheet. Amber is the
   warning colour on this card already (--pk-hot); a held job is a warning,
   not an error. Inks computed for both themes. */
#cr-pk .pkholdbtn{ margin:0 0 10px; }
#cr-pk .pkhold{ border-color:var(--pk-hot,#e07a5f); }
#cr-pk .pkhold .pkh .rt b{ color:var(--pk-hot,#e07a5f); }
#cr-pk .pkhold-d{ font:700 15px -apple-system,'Segoe UI',Roboto,sans-serif; color:var(--pk-ink,#eceef0); margin-bottom:6px; }
#cr-pk .pkhold .pkbtn{ min-height:44px; }
#cr-pk .pkhs{ position:fixed; inset:0; z-index:9560; display:flex; align-items:flex-end; justify-content:center;
  background:rgba(0,0,0,.6); overscroll-behavior:contain; }
#cr-pk .pkhs-p{ width:100%; max-width:560px; max-height:92vh; overflow-y:auto; overscroll-behavior:contain;
  background:var(--pk-c,#15171a); color:var(--pk-ink,#eceef0); border-radius:16px 16px 0 0;
  padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px)); }
@media (min-width:700px){ #cr-pk .pkhs{ align-items:center; } #cr-pk .pkhs-p{ border-radius:16px; } }
#cr-pk .pkhs-h{ display:flex; align-items:flex-start; gap:10px; margin-bottom:8px; }
#cr-pk .pkhs-h > div{ flex:1; min-width:0; }
#cr-pk .pkhs-h h2{ margin:0; font:700 22px -apple-system,'Segoe UI',Roboto,sans-serif; }
#cr-pk .pkhs-h p{ margin:2px 0 0; font-size:13px; color:var(--pk-mut,#9aa3ab); }
#cr-pk .pkhs-x{ flex:none; width:44px; height:44px; border-radius:10px; cursor:pointer; background:transparent;
  border:1px solid var(--pk-line,rgba(230,235,240,.11)); color:var(--pk-mut,#9aa3ab); font:400 22px 'Segoe UI',Arial,sans-serif; }
#cr-pk .pkhs-q{ margin:14px 0 8px; font:600 11px var(--pk-mono,ui-monospace,Menlo,monospace); letter-spacing:.16em;
  text-transform:uppercase; color:var(--pk-dim,#848c94); }
#cr-pk .pkhs-r{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
#cr-pk .pkhs-t{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-height:56px; padding:9px 12px;
  border-radius:12px; cursor:pointer; text-align:left; background:var(--pk-c2,#1b1e22);
  border:1.5px solid var(--pk-line,rgba(230,235,240,.11)); color:var(--pk-ink,#eceef0); }
#cr-pk .pkhs-t b{ font:700 15px -apple-system,'Segoe UI',Roboto,sans-serif; }
#cr-pk .pkhs-t span{ font-size:11px; color:var(--pk-mut,#9aa3ab); }
#cr-pk .pkhs-t.on,#cr-pk .pkhs-d.on{ border-color:var(--pk-ink,#eceef0); background:var(--pk-c3,#22262c); }
#cr-pk .pkhs-w{ display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:6px; }
#cr-pk .pkhs-d{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; min-height:66px;
  padding:6px 2px; border-radius:12px; cursor:pointer; background:var(--pk-c2,#1b1e22);
  border:1.5px solid var(--pk-line,rgba(230,235,240,.11)); color:var(--pk-ink,#eceef0); }
#cr-pk .pkhs-d span,#cr-pk .pkhs-d small{ font-size:11px; color:var(--pk-mut,#9aa3ab); }
#cr-pk .pkhs-d b{ font:700 18px -apple-system,'Segoe UI',Roboto,sans-serif; }
#cr-pk .pkhs-n{ width:100%; box-sizing:border-box; min-height:64px; padding:10px 12px; border-radius:12px; resize:vertical;
  background:var(--pk-c2,#1b1e22); border:1px solid var(--pk-line,rgba(230,235,240,.11)); color:var(--pk-ink,#eceef0);
  font:400 15px -apple-system,'Segoe UI',Roboto,sans-serif; /* phones get 18px from the global anti-zoom rule */ }
#cr-pk .pkhs-f{ display:flex; gap:8px; margin-top:14px; }
#cr-pk .pkhs-f .pkbtn{ min-height:48px; padding:0 16px; }
#cr-pk .pkhs-go{ flex:1; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:48px; border:0;
  border-radius:12px; cursor:pointer; background:var(--pk-accd,#c8202e); color:#fff; font:700 15px -apple-system,'Segoe UI',Roboto,sans-serif; }
#cr-pk .pkhs-go svg{ width:16px; height:16px; }
#cr-pk .pkhs-go[disabled]{ background:var(--pk-c3,#22262c); color:var(--pk-mut,#9aa3ab); cursor:default; }''')

# the Punch List names the reason the way the card does
src = pl.sub(src, '''             sub: 'On hold · ' + String(it.hold_reason) };''',
'''             sub: 'On hold · ' + ({ materials:'materials', homeowner:'homeowner', weather:'weather', adjuster:'adjuster', other:'see note' }[it.hold_reason] || String(it.hold_reason)) };''')

# ── stamp + changelog ──
src = pl.sub(src, '>v2026-10-07 build 1248<', '>v2026-10-07 build 1249<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1249, d: '2026-10-07', t: 'Punch work can go on hold',
    s: 'A punch-out, repair, callback or tarp that can\\u2019t move can now be put on hold from its card. Pick why it\\u2019s waiting \\u2014 materials, the homeowner, weather, the adjuster, or something else \\u2014 and the day to look at it again; each day shows how busy that person already is, and Sunday is skipped. Add a note if it helps. Held work sits under On hold on the Punch List instead of piling up in Past due, and on the day you picked it comes back to Today marked Back from hold.' },
''')

pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
