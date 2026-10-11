"""Build 1304 — the Community home's calendar and Partner A/R (layout A, finishes the home).

Pick A's order: pipeline, then Next 30 Days and Partner A/R side by side (stacked on
a phone), then Waiting on you, then the doors. Both cards are Retail's, fed the
Community jobs:
  * Next 30 Days — Retail's 30-day grid (renderOps), counting appointments booked
    on Community jobs. The card opens the Schedule Board, as Retail's does.
  * Partner A/R — what is still owed on Invoiced Community jobs, using Retail's own
    jobFinance().balance (CR-AUD-004: owed, not gross) when a contract or estimate
    carries the value, else the job's bid — how Community jobs are usually priced, grouped by the partner who
    pays (Community bills the partner, not the homeowner). Habitat sorts first.
    "over 30 days" is aged from t_Invoiced, Retail's clock. The card is a 975 door
    onto All estimates filtered to Invoiced. Production does not get this card —
    partner money is not theirs, the standing permission rule.
signature() now also changes when appointments, a job's stage, or a Work Type
change, so a pipeline move or a new appointment repaints the home.

Usage: python3 patch_1304.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

A = """var homePane = '<div data-pane="home" class="' + (pane === 'home' ? 'on' : '') + '">' +
'<div class="cc-srch"><input type="search" id="cr-ch2-search" placeholder="Name, address, partner, work type\\u2026" value="' + esc(query) + '"></div>' +
pipeCard +"""
B = """/* 1304: Next 30 Days — Retail's 30-day grid, counting appointments on Community jobs. */
var ccIds = {}; d.all.forEach(function(pr){ ccIds[pr.id] = 1; });
var ccByDay = {}, ccBooked = 0;
(window.cacheAppts || []).forEach(function(a){
if(a && a.appt_date && ccIds[a.project_id]) ccByDay[a.appt_date] = (ccByDay[a.appt_date] || 0) + 1;
});
var c0 = new Date(); c0.setHours(0,0,0,0);
var calG = ['S','M','T','W','T','F','S'].map(function(x){ return '<i>' + x + '</i>'; }).join('');
var ci, cLast = c0;
for(ci = 0; ci < c0.getDay(); ci++) calG += '<span></span>';
for(ci = 0; ci < 30; ci++){
var cd = new Date(c0.getFullYear(), c0.getMonth(), c0.getDate() + ci);
var ckey = cd.getFullYear() + '-' + String(cd.getMonth()+1).padStart(2,'0') + '-' + String(cd.getDate()).padStart(2,'0');
var cn = ccByDay[ckey] || 0; ccBooked += cn;
calG += '<span class="' + (ci === 0 ? 't' : '') + (cn ? ' j' : '') + '"' + (cn ? ' title="' + cn + ' booked"' : '') + '>' + cd.getDate() + '</span>';
cLast = cd;
}
var cMo = function(x){ return x.toLocaleDateString('en-US', { month:'short', day:'numeric' }); };
var calCard = '<button type="button" class="cc-cal30" data-go="calendar" aria-label="Next 30 Days \\u2014 open the Schedule Board">' +
'<span class="cc-pipek">Next 30 Days <small>' + ccBooked + ' booked</small></span>' +
'<span class="cc-calg">' + calG + '</span>' +
'<span class="cc-caln">' + cMo(c0) + ' \\u2013 ' + cMo(cLast) + ' \\u00b7 tap for the Schedule Board</span></button>';

/* 1304: Partner A/R — owed on Invoiced Community jobs, by the partner who pays. */
var arCard = '';
if(role !== 'prod'){
var arBy = {}, arTot = 0, arN = 0, arOld = 0;
d.all.forEach(function(pr){
if(normStage(pr.stage) !== 'Invoiced') return;
var owe = 0;
/* jobFinance is the number when a contract or estimate carries one; a Community
   job priced only by its bid (the usual shape) owes its bid. */
try{ var jf = (typeof window.jobFinance === 'function') ? window.jobFinance(pr) : null;
owe = (jf && jf.value > 0) ? (jf.balance || 0) : (bidAmt(pr) || 0); }catch(_1304){ owe = bidAmt(pr) || 0; }
if(!(owe > 0)) return;
var c = ck(pr) || {}, invAt = c.t_Invoiced || c.stage_since;
if(invAt && (Date.now() - new Date(invAt).getTime()) > 30 * 86400000) arOld++;
var pn = partnerOf(pr);
arBy[pn] = (arBy[pn] || 0) + owe; arTot += owe; arN++;
});
var arNames = Object.keys(arBy).sort(function(a, b){
var ha = /habitat/i.test(a), hb = /habitat/i.test(b);
if(ha !== hb) return ha ? -1 : 1;
return arBy[b] - arBy[a];
});
doors['ar'] = { sets:{ stage: stageLabels(['Invoiced']) }, pane:'bids', fold:'allbids' };
arCard = (arN ? '<button type="button" class="cc-ar" data-ccar="1">' : '<div class="cc-ar is-zero">') +
'<span class="cc-pipek">Partner A/R <small>' + arN + ' invoice' + (arN === 1 ? '' : 's') + '</small></span>' +
'<b class="cc-arbig">' + usd(arTot) + '</b>' +
(arN
? arNames.slice(0, 3).map(function(n){ return '<span class="cc-arrow">' + pName(n) + ' \\u00b7 ' + usd(arBy[n]) + '</span>'; }).join('') +
  (arOld ? '<span class="cc-arold">' + arOld + ' over 30 days</span>' : '')
: '<span class="cc-arrow">nothing outstanding</span>') +
(arN ? '</button>' : '</div>');
}
var opsRow = '<div class="cc-ops">' + calCard + arCard + '</div>';

var homePane = '<div data-pane="home" class="' + (pane === 'home' ? 'on' : '') + '">' +
'<div class="cc-srch"><input type="search" id="cr-ch2-search" placeholder="Name, address, partner, work type\\u2026" value="' + esc(query) + '"></div>' +
pipeCard + opsRow +"""
src = pl.sub(src, A, B)

A = """host.querySelectorAll('[data-cctarp]').forEach(function(el){
el.onclick = function(){ applyDoor(doors['tarponly']); };
});"""
B = A + """
/* 1304: the Partner A/R card */
host.querySelectorAll('[data-ccar]').forEach(function(el){
el.onclick = function(){ applyDoor(doors['ar']); };
});"""
src = pl.sub(src, A, B)

# repaint when appointments, a stage or a work type change
A = """d.sched.length, d.inv.length, d.all.length,
(window.cacheProjects || []).length].join('|');"""
B = """d.sched.length, d.inv.length, d.all.length,
(window.cacheProjects || []).length,
/* 1304: the pipeline, the Tarp Only tile and the calendar read these */
(window.cacheAppts || []).length,
d.all.map(function(pr){ return normStage(pr.stage) + (wtOf(pr) === 'Tarp Only' ? 't' : ''); }).join(',')].join('|');"""
src = pl.sub(src, A, B)

A = """#cr-ch2 .cc-tarponly:focus-visible{outline:2px solid var(--ccm-ac,#34D399);outline-offset:2px}
</style>"""
B = """#cr-ch2 .cc-tarponly:focus-visible{outline:2px solid var(--ccm-ac,#34D399);outline-offset:2px}

/* ── 1304: Next 30 Days and Partner A/R, side by side; stacked on a phone ── */
#cr-ch2 .cc-ops{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 8px;align-items:stretch}
@media (max-width:640px){#cr-ch2 .cc-ops{grid-template-columns:1fr}}
#cr-ch2 .cc-cal30,#cr-ch2 .cc-ar{display:flex;flex-direction:column;gap:6px;width:100%;text-align:left;color:inherit;
  background:var(--ccm-card,#161918);border:1px solid var(--ccm-line,#2a2f2c);border-radius:11px;
  padding:10px 12px;min-height:44px;cursor:pointer;font:inherit}
#cr-ch2 .cc-ar.is-zero{cursor:default}
#cr-ch2 .cc-cal30:focus-visible,#cr-ch2 .cc-ar:focus-visible{outline:2px solid var(--ccm-ac,#34D399);outline-offset:2px}
#cr-ch2 .cc-pipek small{font:600 13px 'Segoe UI',Arial,sans-serif;color:var(--ccm-dim,#828c86);margin-left:6px}
#cr-ch2 .cc-calg{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}
#cr-ch2 .cc-calg i{font:600 11px 'Segoe UI',Arial,sans-serif;font-style:normal;color:var(--ccm-dim,#828c86)}
#cr-ch2 .cc-calg span{font:600 13px 'Segoe UI',Arial,sans-serif;color:var(--ccm-ink,#f2f4f3);padding:4px 0;border-radius:6px}
#cr-ch2 .cc-calg span.t{background:var(--ccm-ac,#34D399);color:#06281b}
#cr-ch2 .cc-calg span.j{box-shadow:inset 0 -3px 0 var(--ccm-ac,#34D399)}
#cr-ch2 .cc-caln,#cr-ch2 .cc-arrow,#cr-ch2 .cc-arold{font:400 13px 'Segoe UI',Arial,sans-serif;color:var(--ccm-dim,#828c86)}
#cr-ch2 .cc-arbig{font:800 22px 'Segoe UI',Arial,sans-serif;color:var(--ccm-ink,#f2f4f3)}
#cr-ch2 .cc-arold{color:#ff9a9a;font-weight:700}
:root[data-theme="rb-light"] #cr-ch2 .cc-arold{color:#8f1620}
:root[data-theme="rb-light"] #cr-ch2 .cc-calg span.t{background:#047857;color:#fff}
:root[data-theme="rb-light"] #cr-ch2 .cc-calg span.j{box-shadow:inset 0 -3px 0 #047857}
</style>"""
src = pl.sub(src, A, B)

A = ">v2026-10-11 build 1303<button"
B = ">v2026-10-11 build 1304<button"
src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1304, d: '2026-10-11', t: 'Community home: the next 30 days and what partners owe',
    s: 'Under the Community pipeline are the two cards from the Retail home. Next 30 Days shows the appointments booked on Community jobs and opens the Schedule Board. Partner A/R shows what is still owed on invoiced Community jobs, by the partner who pays, Habitat first, with how many are over 30 days; a tap opens those invoices. Production does not see the money card.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
