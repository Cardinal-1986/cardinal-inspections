"""Build 1296 — callback cause + original crew (Theo's pick 1B, 10 Oct).

On a Callback punch-out card: WHY the client called back (Workmanship · Material ·
Storm · Homeowner · Other) and WHICH crew did the original job. The crew is
filled in from the job's crew work order (most recent) and can be changed. Each
crew's Jobs tab under Crews lists its callbacks for the last 12 months.

Needs punch_callback_cause.sql (applied 11 Oct 2026, before this ships).
orig_crew_name is stored beside the id because crews / crew_work_orders are
is_full_access() RLS: a rep opening a callback cannot read crews and must still
see who did the job. The card only offers the picker to someone who can read
crews; everyone else sees the stored name.

Usage: python3 patch_1296.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# ── card state
src = pl.sub(src, "var pingOpen = false;\n", """var pingOpen = false;
/* 1296: the callback's crew list, loaded once per card (crews + this job's work orders) */
var cbData = null;
var CB_CAUSES = [
  { k:'workmanship', l:'Workmanship' }, { k:'material', l:'Material' }, { k:'storm', l:'Storm' },
  { k:'homeowner', l:'Homeowner' }, { k:'other', l:'Other' }
];
""")

# ── card markup + loader, before cardHtml
A = "function cardHtml(){\n  var pr = projectFor(it.project_id);"
B = r"""/* 1296: why the callback, and who did the original job. Shown on callbacks only. */
async function cbLoad(){
  if(!it || it.kind !== 'callback' || (cbData && cbData.id === it.id)) return;
  var id = it.id, pid = it.project_id;
  cbData = { id:id, crews:[], wo:[], ready:false };
  var cx = window.supa || window.sb;
  if(cx){
    try{
      var r = await Promise.all([
        cx.from('crews').select('id,name,trade').eq('archived', false).order('name'),
        cx.from('crew_work_orders').select('crew_id,wo_number,status,created_at').eq('project_id', pid).order('created_at', { ascending:false })
      ]);
      if(!cbData || cbData.id !== id) return;
      cbData.crews = (r[0] && r[0].data) || [];
      cbData.wo = ((r[1] && r[1].data) || []).filter(function(w){ return w && w.crew_id && w.status !== 'superseded'; });
    }catch(_){}
  }
  if(!cbData || cbData.id !== id) return;
  cbData.ready = true;
  /* the work order is a fact: fill the crew in once, from the most recent one */
  if(it && it.id === id && !it.orig_crew_id && cbData.wo.length){
    var c = cbData.crews.filter(function(x){ return x.id === cbData.wo[0].crew_id; })[0];
    if(c){ save({ orig_crew_id: c.id, orig_crew_name: c.name }); return; }
  }
  lastSig = ''; render();
}
function cbHtml(){
  if(it.kind !== 'callback') return '';
  var cause = it.callback_cause || '';
  var chips = CB_CAUSES.map(function(c){
    return '<button type="button" class="pkcbc' + (cause === c.k ? ' on' : '') + '" data-cbc="' + c.k + '" aria-pressed="' + (cause === c.k) + '">' + esc(c.l) + '</button>';
  }).join('');
  var crew;
  if(cbData && cbData.id === it.id && cbData.crews.length){
    var woIds = {}, woNo = {};
    cbData.wo.forEach(function(w){ if(!woIds[w.crew_id]){ woIds[w.crew_id] = 1; woNo[w.crew_id] = w.wo_number; } });
    var cbOpt = function(c){ return '<option value="' + esc(c.id) + '"' + (it.orig_crew_id === c.id ? ' selected' : '') + '>' +
      esc(c.name) + (woNo[c.id] ? ' · ' + esc(woNo[c.id]) : '') + '</option>'; };
    var onJob = cbData.crews.filter(function(c){ return woIds[c.id]; }), rest = cbData.crews.filter(function(c){ return !woIds[c.id]; });
    crew = '<select class="pkcbsel" data-f="cbcrew" aria-label="Original crew"><option value="">' + (it.orig_crew_id ? 'Not recorded' : 'Pick the crew…') + '</option>' +
      (onJob.length ? '<optgroup label="On this job">' + onJob.map(cbOpt).join('') + '</optgroup>' : '') +
      (rest.length ? '<optgroup label="Other crews">' + rest.map(cbOpt).join('') + '</optgroup>' : '') + '</select>';
  }else{
    crew = '<span class="pkcbname">' + esc(it.orig_crew_name || (cbData && !cbData.ready ? 'Loading…' : 'Not recorded')) + '</span>';
  }
  return '<div class="pksec pkcb" data-cr-1296>' +
    '<div class="pkcbk">Why the callback</div><div class="pkcbrow">' + chips + '</div>' +
    '<div class="pkcbk">Original crew</div>' + crew + '</div>';
}
function cardHtml(){
  var pr = projectFor(it.project_id);"""
src = pl.sub(src, A, B)
src = pl.sub(src, "jobHtml(pr) + visitHtml() + checklistHtml()", "jobHtml(pr) + cbHtml() + visitHtml() + checklistHtml()")
src = pl.sub(src, "jobHtml(pr) + disp + visitHtml()", "jobHtml(pr) + cbHtml() + disp + visitHtml()")

# ── wire + load
W = """  q('[data-act="menu"]', function(b){ b.onclick = function(){ menuOpen = !menuOpen; lastSig = ''; render(); }; });"""
W2 = W + """
  /* 1296: callback cause + original crew */
  q('[data-cbc]', function(b){ b.onclick = function(){ save({ callback_cause: b.getAttribute('data-cbc') }); }; });
  q('[data-f="cbcrew"]', function(s){ s.onchange = function(){
    var v = s.value || null, c = v && cbData ? cbData.crews.filter(function(x){ return x.id === v; })[0] : null;
    save({ orig_crew_id: c ? c.id : null, orig_crew_name: c ? c.name : null });
  }; });"""
src = pl.sub(src, W, W2)
R = "  wire();\n  paintPhotos();"
src = pl.sub(src, R, "  wire();\n  if(it.kind === 'callback') cbLoad();   /* 1296 */\n  paintPhotos();")

# ── card CSS
C = "#cr-pk .pkvnone{ color:var(--pk-dim,#9aa2ae); }\n"
src = pl.sub(src, C, C + """/* 1296: the callback cause chips and the crew picker. 44px, the card's own inks. */
#cr-pk .pkcbk{ font:700 11px 'Segoe UI',Arial,sans-serif; letter-spacing:.06em; text-transform:uppercase; color:var(--pk-dim,#9aa2ae); margin:4px 0 6px; }
#cr-pk .pkcbk + .pkcbrow, #cr-pk .pkcbrow + .pkcbk{ margin-top:0; }
#cr-pk .pkcbrow{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
#cr-pk .pkcbc{ min-height:44px; padding:0 14px; border-radius:10px; cursor:pointer; background:transparent;
  border:1px solid var(--pk-line,#252a30); color:var(--pk-ink,#eceef0); font:600 13px 'Segoe UI',Arial,sans-serif; }
#cr-pk .pkcbc.on{ border-color:#f0a24a; color:#f0a24a; font-weight:700; }
:root[data-theme="rb-light"] #cr-pk .pkcbc.on{ border-color:#8a5500; color:#8a5500; }
#cr-pk .pkcbsel{ width:100%; min-height:44px; border-radius:10px; padding:0 10px; background:transparent;
  border:1px solid var(--pk-line,#252a30); color:var(--pk-ink,#eceef0); font:600 15px 'Segoe UI',Arial,sans-serif; }
#cr-pk .pkcbsel option, #cr-pk .pkcbsel optgroup{ color:#111; }
#cr-pk .pkcbname{ display:block; font:600 15px 'Segoe UI',Arial,sans-serif; color:var(--pk-ink,#eceef0); }
""")

# ── Crews: load callbacks with the directory, list them on the Jobs tab
L = "var workorders = [];            /* 847: crew_work_orders — the job history */\n"
src = pl.sub(src, L, L + "var callbacks = [];             /* 1296: callback punch-outs with an original crew */\n")
Q = """    cl.from('crew_work_orders')
      .select('id,wo_number,crew_id,project_id,report_id,status,sent_at,scope,amount,scheduled_on,completed_on,created_at')
      .order('created_at', { ascending:false })
  ]);"""
Q2 = """    cl.from('crew_work_orders')
      .select('id,wo_number,crew_id,project_id,report_id,status,sent_at,scope,amount,scheduled_on,completed_on,created_at')
      .order('created_at', { ascending:false }),
    /* 1296: callbacks charged to a crew. punch_items is readable by everyone this
       screen serves; an error degrades to an empty list like the tables above. */
    cl.from('punch_items').select('id,project_id,title,detail,callback_cause,orig_crew_id,created_at,status')
      .eq('kind', 'callback').not('orig_crew_id', 'is', null).order('created_at', { ascending:false })
  ]);"""
src = pl.sub(src, Q, Q2)
src = pl.sub(src, "  workorders = (res[6].data) || [];\n", "  workorders = (res[6].data) || [];\n  callbacks = (res[7] && res[7].data) || [];\n")
J = """  out += '<div style="display:flex;justify-content:flex-end;align-items:baseline;flex-wrap:wrap;gap:2px;margin:8px 2px 4px">' + foot + '</div>';
  return out;
}"""
J2 = """  out += '<div style="display:flex;justify-content:flex-end;align-items:baseline;flex-wrap:wrap;gap:2px;margin:8px 2px 4px">' + foot + '</div>';
  return out + callbacksHtml(c, mine.length);
}
/* 1296: this crew's callbacks, last 12 months, with the cause. */
var CB_LABEL = { workmanship:'Workmanship', material:'Material', storm:'Storm', homeowner:'Homeowner', other:'Other' };
function callbacksHtml(c, jobs){
  var since = Date.now() - 365 * 86400000;
  var mine = callbacks.filter(function(p){ return p.orig_crew_id === c.id && Date.parse(p.created_at) >= since; });
  var rows = mine.map(function(p){
    var cz = CB_LABEL[p.callback_cause] || 'No cause yet';
    return '<tr><td>' + esc(dstr(p.created_at)) + '</td><td>' + esc(projName(p.project_id) || '\\u2014') + '</td>' +
      '<td>' + esc(p.title || '') + '</td><td class="crw-cb' + (p.callback_cause === 'workmanship' ? ' wk' : '') + '">' + esc(cz) + '</td></tr>';
  }).join('');
  return '<div class="crw-cbh" data-cr-1296>Callbacks <span class="crw-mut">\\u00b7 last 12 months \\u00b7 ' + mine.length +
      (mine.length === 1 ? ' callback' : ' callbacks') + (jobs ? ' on ' + jobs + (jobs === 1 ? ' job' : ' jobs') : '') + '</span></div>' +
    '<div class="crw-rtwrap"><table class="crw-rt"><colgroup><col style="width:18%"><col style="width:30%"><col style="width:32%"><col style="width:20%"></colgroup>' +
    '<thead><tr><th>Opened</th><th>Client</th><th>What</th><th>Cause</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="4" class="crw-mut">No callbacks charged to this crew.</td></tr>') + '</tbody></table></div>';
}"""
src = pl.sub(src, J, J2)
# crews CSS — next to an existing crews rule
S = "<style id=\"cr-crew-styles\">"
src = pl.sub(src, S, S + "\n/* 1296: the callbacks list on a crew's Jobs tab */\n#crewsView .crw-cbh{margin:18px 2px 8px;font:700 15px 'Segoe UI',Arial,sans-serif;color:var(--crw-ink,#eceef0);}\n#crewsView .crw-cb.wk{color:var(--crw-warn,#f0a24a);font-weight:700;}\n:root[data-theme=\"rb-light\"] #crewsView .crw-cb.wk{color:#8a5500;}\n")

src = pl.sub(src, '">v2026-10-10 build 1295<button', '">v2026-10-10 build 1296<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1295,",
  "var CHANGELOG = [\n"
  "  { b: 1296, d: '2026-10-10', t: 'Callback cause and original crew',\n"
  "    s: 'A Callback now says why the client called back, with Workmanship, Material, Storm, Homeowner or Other, and which crew did the original job. The crew fills itself in from the job\\u2019s crew work order, and you can change it. Each crew\\u2019s Jobs tab under Crews lists its callbacks for the last year, with the cause, so you can see who keeps getting called back.' },\n"
  "  { b: 1295,")
pl.write_atomic(PATH, src)
print('patched 1296')
