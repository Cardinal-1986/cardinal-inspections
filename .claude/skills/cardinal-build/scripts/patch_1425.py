"""Build 1425 — insurance and community job pages stop redrawing themselves while nobody touches them (29 Oct 2026).

The chair and the judge of the judges both measured it on 1422: an idle insurance job kept the phone 51-77% busy and
a community job 45-67%, against 1.7-5% for retail — 305-427 page changes a second with nobody touching it.
Measured here at 1424 (mutation records in 2 s, idle): I1 545, I2 498, C1 460, R1 22. Three writers, all the
567/569 class (a write that runs on every wake whether or not anything changed):
  1. the insurance and community stage relabellers (cr-insstage / cr-comstage) rename "Advance to Scheduled" to
     the SAME words on every pass — title and textContent assignments queue a mutation even when identical;
  2. the Supplement card (cr-sp) rebuilds its whole innerHTML on every body change, with no check;
  3. the system-health badge (cr-ahc) re-sets its class list and title on every pass — classList.add/remove and
     setAttribute queue a record even when nothing changes — and it rides along with the first two.
Each now writes only when the value differs (the shapes 567 and 569 established). The Supplement card still
re-binds its buttons every pass, which is a property, not a DOM write, so they always open the current claim.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

# 1a. insurance relabeller (indented block)
s = one(s, """    var bk = document.getElementById('dbStgBack');
    if(bk && bk.title){
      var m = bk.title.match(/^Back to (.+)$/);
      if(m && INS_LABEL[m[1]]) bk.title = 'Back to ' + INS_LABEL[m[1]];
    }
    var fw = document.getElementById('dbStgFwd');
    if(fw && fw.title){
      var m2 = fw.title.match(/^Advance to (.+)$/);
      if(m2 && INS_LABEL[m2[1]]) fw.title = 'Advance to ' + INS_LABEL[m2[1]];
    }

    // the ⋮ dropdown
    document.querySelectorAll('#msDrop .estopt').forEach(function(b){
      var t = b.textContent || '';
      var a = t.match(/^Advance to (.+)$/);
      if(a && INS_LABEL[a[1]]){ b.textContent = 'Advance to ' + INS_LABEL[a[1]]; return; }""",
"""    /* 1425: every write below is guarded — "Scheduled" relabels to "Scheduled", and an identical title or
       textContent assignment still queues a mutation, so this block was rewriting the page every frame */
    var bk = document.getElementById('dbStgBack');
    if(bk && bk.title){
      var m = bk.title.match(/^Back to (.+)$/);
      if(m && INS_LABEL[m[1]] && bk.title !== 'Back to ' + INS_LABEL[m[1]]) bk.title = 'Back to ' + INS_LABEL[m[1]];
    }
    var fw = document.getElementById('dbStgFwd');
    if(fw && fw.title){
      var m2 = fw.title.match(/^Advance to (.+)$/);
      if(m2 && INS_LABEL[m2[1]] && fw.title !== 'Advance to ' + INS_LABEL[m2[1]]) fw.title = 'Advance to ' + INS_LABEL[m2[1]];
    }

    // the ⋮ dropdown
    document.querySelectorAll('#msDrop .estopt').forEach(function(b){
      var t = b.textContent || '';
      var a = t.match(/^Advance to (.+)$/);
      if(a && INS_LABEL[a[1]]){ if(t !== 'Advance to ' + INS_LABEL[a[1]]) b.textContent = 'Advance to ' + INS_LABEL[a[1]]; return; }""")

# 1b. community relabeller (unindented block)
s = one(s, """var bk = document.getElementById('dbStgBack');
if(bk && bk.title){
var m = bk.title.match(/^Back to (.+)$/);
if(m && COM_LABEL[m[1]]) bk.title = 'Back to ' + COM_LABEL[m[1]];
}
var fw = document.getElementById('dbStgFwd');
if(fw && fw.title){
var m2 = fw.title.match(/^Advance to (.+)$/);
if(m2 && COM_LABEL[m2[1]]) fw.title = 'Advance to ' + COM_LABEL[m2[1]];
}
document.querySelectorAll('#msDrop .estopt').forEach(function(b){
var t = b.textContent || '';
var a = t.match(/^Advance to (.+)$/);
if(a && COM_LABEL[a[1]]){ b.textContent = 'Advance to ' + COM_LABEL[a[1]]; return; }""",
"""/* 1425: guarded, the insurance block's twin — identical writes were redrawing the page every frame */
var bk = document.getElementById('dbStgBack');
if(bk && bk.title){
var m = bk.title.match(/^Back to (.+)$/);
if(m && COM_LABEL[m[1]] && bk.title !== 'Back to ' + COM_LABEL[m[1]]) bk.title = 'Back to ' + COM_LABEL[m[1]];
}
var fw = document.getElementById('dbStgFwd');
if(fw && fw.title){
var m2 = fw.title.match(/^Advance to (.+)$/);
if(m2 && COM_LABEL[m2[1]] && fw.title !== 'Advance to ' + COM_LABEL[m2[1]]) fw.title = 'Advance to ' + COM_LABEL[m2[1]];
}
document.querySelectorAll('#msDrop .estopt').forEach(function(b){
var t = b.textContent || '';
var a = t.match(/^Advance to (.+)$/);
if(a && COM_LABEL[a[1]]){ if(t !== 'Advance to ' + COM_LABEL[a[1]]) b.textContent = 'Advance to ' + COM_LABEL[a[1]]; return; }""")

# 2. the Supplement card
s = one(s, """host.innerHTML =
'<div class="cr-sp-card">' +
'<div class="cr-sp-hd">' +
'<span class="t">\\uD83D\\uDCC8 Supplement</span>' +
'<span class="pill ' + esc(st) + '">' + (STATUS_LABEL[st] || st) + '</span>' +
'</div>' +
'<div class="cr-sp-bd">' + body + '</div>' +
'</div>';
host.querySelectorAll('[data-act]').forEach(function(b){""",
"""var _html =
'<div class="cr-sp-card">' +
'<div class="cr-sp-hd">' +
'<span class="t">\\uD83D\\uDCC8 Supplement</span>' +
'<span class="pill ' + esc(st) + '">' + (STATUS_LABEL[st] || st) + '</span>' +
'</div>' +
'<div class="cr-sp-bd">' + body + '</div>' +
'</div>';
/* 1425: this ran on every body change and rebuilt the card each time — the card's own write woke the next pass.
   Write only when what it shows changed; the buttons are re-bound every pass (a property, not a DOM write). */
if(__spSig !== pr.id + '|' + _html || !host.firstChild){ host.innerHTML = _html; __spSig = pr.id + '|' + _html; }
host.querySelectorAll('[data-act]').forEach(function(b){""")

s = one(s, """function render(){
var pr = window.currentProject;
var host = document.getElementById('cr-sp-mount');""",
"""var __spSig = '';   /* 1425: what the Supplement card last drew (a fresh host has no child, so it is redrawn) */
function render(){
var pr = window.currentProject;
var host = document.getElementById('cr-sp-mount');""")

# 3. the health badge
s = one(s, """if(!LAST_RESULTS){ b.className = 'btn ghost'; b.classList.remove('show'); return; }
var sev = severityOf(LAST_RESULTS);
b.classList.remove('ok','warn','crit');
b.classList.add(sev);
b.classList.add('show');""",
"""/* 1425: classList.add/remove and setAttribute queue a mutation even when nothing changes, and this runs from a
   body observer — guarded so the badge only writes when its state does */
if(!LAST_RESULTS){ if(b.className !== 'btn ghost') b.className = 'btn ghost'; return; }
var sev = severityOf(LAST_RESULTS);
['ok','warn','crit'].forEach(function(k){ if(k !== sev && b.classList.contains(k)) b.classList.remove(k); });
if(!b.classList.contains(sev)) b.classList.add(sev);
if(!b.classList.contains('show')) b.classList.add('show');""")
s = one(s, """b.setAttribute('title', 'System health: ' + sev.toUpperCase() +
' \\u2014 ' + counts.ok + ' ok, ' + counts.warn + ' warnings, ' +
counts.crit + ' critical');
}""",
"""var _tt = 'System health: ' + sev.toUpperCase() +
' \\u2014 ' + counts.ok + ' ok, ' + counts.warn + ' warnings, ' +
counts.crit + ' critical';
if(b.getAttribute('title') !== _tt) b.setAttribute('title', _tt);   /* 1425 */
}""")

s = one(s, ">v2026-10-29 build 1424<", ">v2026-10-29 build 1425<")
s = one(s, """  { b: 1424, d:'2026-10-29',""",
"""  { b: 1425, d:'2026-10-29', t:'Insurance and community job pages stop working your phone while you read', s:'An insurance or community job left open kept the phone busy redrawing the same words over and over \\u2014 up to three-quarters of its effort with nobody touching it, which drains the battery and heats the phone on a roof. Those pages now sit as still as a retail job.' },
  { b: 1424, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1425')
