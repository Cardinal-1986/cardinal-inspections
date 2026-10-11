"""Build 1297 — the load-the-truck list (Theo's pick 5B, 10 Oct).

  · Each punch-out card gets a "Bring" list: what to load before the truck leaves.
    Anyone can add a line and tick it; a manager can remove one (the steps rule).
  · The person's route page (1254) shows one combined "Load the truck" list for
    the day it is showing, grouped by stop, each line tickable.

Data: punch_items.truck jsonb [{t,d,by,at}] — punch_truck.sql, applied 11 Oct 2026
before this ships. The card writes through save() (the offline outbox); the route
page ticks through CardinalPunch.update, the one punch write path it already uses.

Usage: python3 patch_1297.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# ── card: data + actions next to the steps
A = "async function addStep(){\n  var t = prompt('What is the step?');"
B = r"""/* 1297: the load-the-truck list — same shape and save path as the steps */
function truck(){ return Array.isArray(it && it.truck) ? it.truck : []; }
async function tickTruck(i){
  var tk = truck().slice(), x = tk[i]; if(!x) return;
  tk[i] = Object.assign({}, x, { d: !x.d, by: !x.d ? (myEmail() || null) : null, at: !x.d ? new Date().toISOString() : null });
  await save({ truck: tk });
}
async function addTruck(){
  var t = prompt('What goes on the truck?\n\nFor example: Step flashing, 10 pcs');
  if(!t || !String(t).trim()) return;
  await save({ truck: truck().concat([{ t: String(t).trim().slice(0, 120), d: false, by: null, at: null }]) });
}
async function delTruck(i){
  var tk = truck().slice(); if(!tk[i]) return;
  if(!await crAsk('Take this off the list?\n\n' + (tk[i].t || ''))) return;
  tk.splice(i, 1);
  await save({ truck: tk });
}
function truckHtml(){
  var tk = truck(), mgr = isManager(), done = it.status === 'done';
  if(done && !tk.length) return '';
  var n = tk.filter(function(x){ return x && x.d; }).length;
  var body = tk.map(function(x, i){
    return '<div class="pkck' + (x.d ? ' d' : '') + '">' +
      '<button class="bx" data-truck="' + i + '" type="button" aria-label="' + (x.d ? 'Not loaded' : 'Loaded') + '">' + svg('tick') + '</button>' +
      '<span class="bd"><span class="st">' + esc(x.t || '') + '</span></span>' +
      (mgr ? '<button class="pkbtn" data-deltruck="' + i + '" type="button" aria-label="Remove">×</button>' : '') + '</div>';
  }).join('');
  return '<div class="pksec" id="pkSecTruck" data-cr-1297><div class="pkh">' + svg('list') + 'Bring' +
    (tk.length ? '<span class="rt"><b>' + n + '</b> / ' + tk.length + ' loaded</span>' : '') + '</div>' +
    (body || '<div class="pktk0">Nothing listed yet. Add what to load before the truck leaves.</div>') +
    (done ? '' : '<button class="pkadd" data-act="addtruck" type="button">+ Add item</button>') + '</div>';
}
async function addStep(){
  var t = prompt('What is the step?');"""
src = pl.sub(src, A, B)
src = pl.sub(src, "jobHtml(pr) + cbHtml() + visitHtml() + checklistHtml() + photosHtml()",
                  "jobHtml(pr) + cbHtml() + visitHtml() + checklistHtml() + truckHtml() + photosHtml()")
src = pl.sub(src, "descHtml() + checklistHtml() + photosHtml();", "descHtml() + checklistHtml() + truckHtml() + photosHtml();")
W = "  q('[data-act=\"addstep\"]', function(b){ b.onclick = addStep; });\n"
src = pl.sub(src, W, W + """  /* 1297: the truck list */
  q('[data-truck]', function(b){ b.onclick = function(){ tickTruck(Number(b.getAttribute('data-truck'))); }; });
  q('[data-deltruck]', function(b){ b.onclick = function(){ delTruck(Number(b.getAttribute('data-deltruck'))); }; });
  q('[data-act="addtruck"]', function(b){ b.onclick = addTruck; });
""")
C = "#cr-pk .pkvnone{ color:var(--pk-dim,#9aa2ae); }\n"
src = pl.sub(src, C, C + """/* 1297: the empty Bring list */
#cr-pk .pktk0{ padding:8px 0 4px; font:400 13px 'Segoe UI',Arial,sans-serif; color:var(--pk-dim,#9aa2ae); }
""")

# ── route page: the day's combined list
R = "    h += '<div class=\"rtnote\">Minutes are estimates"
R2 = r"""    /* 1297: load the truck — every stop's Bring list for this day, one place */
    var tkStops = list.filter(function(it){ return Array.isArray(it.truck) && it.truck.length; });
    if(tkStops.length){
      var tkAll = 0, tkOn = 0;
      tkStops.forEach(function(it){ it.truck.forEach(function(x){ tkAll++; if(x && x.d) tkOn++; }); });
      h += '<div class="rttruck" id="rtTruck" data-cr-1297><h2>Load the truck · ' + rtEsc(rtDayWord(day)) + '<small>' + tkOn + ' of ' + tkAll + ' loaded</small></h2>' +
        tkStops.map(function(it){
          var pr = rtProjOf(it.project_id);
          return '<div class="rttk-h">' + rtEsc(pr ? pr.name : 'No client') + (it.scheduled_time ? ' · ' + rtEsc(rtClock(it.scheduled_time)) : '') + '</div>' +
            it.truck.map(function(x, i){
              return '<button type="button" class="rttk' + (x && x.d ? ' d' : '') + '" data-rt="truck" data-v="' + rtEsc(String(it.id)) + ':' + i + '" aria-pressed="' + !!(x && x.d) + '">' +
                '<span class="bx">' + (x && x.d ? '✓' : '') + '</span><span>' + rtEsc((x && x.t) || '') + '</span></button>';
            }).join('');
        }).join('') + '</div>';
    }
    h += '<div class="rtnote">Minutes are estimates"""
src = pl.sub(src, R, R2)
src = pl.sub(src, "  else if(act === 'add') rtAddToDay(v);", "  else if(act === 'add') rtAddToDay(v);\n  else if(act === 'truck') rtTickTruck(v);")
T = "async function rtAddToDay(id){"
src = pl.sub(src, T, r"""/* 1297: tick a truck line from the route page, through the one punch write path */
async function rtTickTruck(v){
  var p = String(v).split(':'), id = p[0], i = Number(p[1]);
  var P = window.CardinalPunch; if(!(P && P.update)) return;
  var it = rtRows().filter(function(x){ return String(x.id) === id; })[0]; if(!it || !Array.isArray(it.truck) || !it.truck[i]) return;
  var cu = /** @type {any} */ (window).currentUser, tk = it.truck.slice(), x = tk[i], me = (cu && cu.email) || null;
  tk[i] = Object.assign({}, x, { d: !x.d, by: !x.d ? me : null, at: !x.d ? new Date().toISOString() : null });
  var r = await P.update(id, { truck: tk });
  if(!(r && r.ok)){ try{ window.crTell('Could not save that tick: ' + ((r && r.error) || 'write refused')); }catch(_){} }
  rtDraw();
}
async function rtAddToDay(id){""")
S = "#cr-route .rtempty{"
src = pl.sub(src, S, """/* 1297: load the truck */
#cr-route .rttruck{ border:1px solid var(--rt-line,rgba(230,235,240,.11)); border-radius:12px; padding:10px 12px; margin:12px 0; }
#cr-route .rttruck h2{ margin:0 0 4px; font:700 15px 'Segoe UI',Arial,sans-serif; color:var(--rt-ink,#eceef0); display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
#cr-route .rttruck h2 small{ font:600 13px 'Segoe UI',Arial,sans-serif; color:var(--rt-mut,#9aa3ab); }
#cr-route .rttk-h{ margin:10px 0 2px; font:700 11px 'Segoe UI',Arial,sans-serif; letter-spacing:.06em; text-transform:uppercase; color:var(--rt-mut,#9aa3ab); }
#cr-route .rttk{ display:flex; align-items:center; gap:10px; width:100%; min-height:44px; padding:0 2px; border:0; border-top:1px solid var(--rt-line,rgba(230,235,240,.11));
  background:transparent; color:var(--rt-ink,#eceef0); font:400 15px 'Segoe UI',Arial,sans-serif; text-align:left; cursor:pointer; }
#cr-route .rttk .bx{ flex:none; width:22px; height:22px; border-radius:6px; border:1.5px solid var(--rt-mut,#9aa3ab); display:grid; place-items:center; font:700 13px 'Segoe UI',Arial,sans-serif; }
#cr-route .rttk.d .bx{ background:#34d399; border-color:#34d399; color:#0c0d0f; }
#cr-route .rttk.d > span:last-child{ color:var(--rt-mut,#9aa3ab); text-decoration:line-through; }
""" + S)

src = pl.sub(src, '">v2026-10-10 build 1296<button', '">v2026-10-10 build 1297<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1296,",
  "var CHANGELOG = [\n"
  "  { b: 1297, d: '2026-10-10', t: 'Load-the-truck list',\n"
  "    s: 'Every punch-out has a Bring list now: what to load before the truck leaves, ticked off as it goes on. Anyone can add a line. On a person\\u2019s day page, every stop\\u2019s list shows in one place under Load the truck, grouped by job, so the morning load is one screen.' },\n"
  "  { b: 1296,")
pl.write_atomic(PATH, src)
print('patched 1297')
