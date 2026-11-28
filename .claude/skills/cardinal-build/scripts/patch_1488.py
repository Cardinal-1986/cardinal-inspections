import sys
sys.path.insert(0, '/Users/cardinal/Library/Application Support/Claude/local-agent-mode-sessions/6faf96fc-b092-4eb3-bb94-9529487cc28c/6141bb56-7dbc-45f6-9b2b-f2e1860be711/rpm/plugin_01TFruGAR5g4rn2KiAVaYtG9/skills/cardinal-build/scripts')
import patch_lib as pl

src = pl.load('index_v1487.html')

# 1) title slot for the Newest | To call toggle
src = pl.sub(src, 'Recent leads</div><div id="kpLeadsList"></div>',
             'Recent leads<span class="kplseg" id="kpLeadSeg"></span></div><div id="kpLeadsList"></div>')

# 2) To call list: same card, second view (1488)
OLD_END = """  }).join('') : '<div class="kpempty">No retail clients yet.</div>';"""
NEW_END = OLD_END + """
  /* 1488: "To call" — the rep's own Leads, oldest untouched first (Theo, 27 Nov: Option A).
     Touched = the later of the stage move (stage_since) and the newest comment; falls back to
     created_at. RLS already limits cacheProjects to what this login may see, so a rep sees only
     their own leads. Lead stage only: Prospect and later already live in Gone quiet. */
  var seg = document.getElementById('kpLeadSeg');
  var kpMode = 'new';
  try{ kpMode = sessionStorage.getItem('kpLeadMode') === 'call' ? 'call' : 'new'; }catch(_){}
  var callRows = (window.cacheProjects || []).filter(function(p){
    return crmOfSafe(p) === 'retail' && normStage(p.stage) === 'Lead';
  }).map(function(p){
    var ck = (typeof parseCkAll === 'function') ? (parseCkAll(p) || {}) : {};
    var t = new Date(p.created_at || 0).getTime() || 0;
    var ss = new Date(p.stage_since || ck.stage_since || 0).getTime() || 0;
    if(ss > t) t = ss;
    (Array.isArray(ck.comments) ? ck.comments : []).forEach(function(c){
      var ct = new Date((c && c.at) || 0).getTime() || 0;
      if(ct > t) t = ct;
    });
    return { p:p, days: t ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : null };
  }).sort(function(a, b){ return (b.days == null ? -1 : b.days) - (a.days == null ? -1 : a.days); });
  if(seg){
    seg.innerHTML = '<button type="button" data-kpm="new"' + (kpMode === 'new' ? ' class="on"' : '') + '>Newest</button>' +
      '<button type="button" data-kpm="call"' + (kpMode === 'call' ? ' class="on"' : '') + '>To call' +
      (callRows.length ? ' \\u00b7 ' + callRows.length : '') + '</button>';
  }
  if(kpMode === 'call'){
    var KP_SHOW = 8;
    lm.innerHTML = callRows.length ? callRows.slice(0, KP_SHOW).map(function(x){
      var p = x.p, po = poOf(p);
      var tel = String(p.phone || '').replace(/[^\\d+]/g, '');
      var town = p.city || '';
      var dc = x.days == null ? '' : (x.days >= 14 ? ' old' : (x.days >= 7 ? ' mid' : ''));
      return '<div class="kplrow kpcallrow" role="button" tabindex="0" data-proj="' + p.id + '">' +
        '<span class="kpcd' + dc + '">' + (x.days == null ? '\\u2013' : x.days) + '<small>days</small></span>' +
        '<span class="kpcm"><span class="nm">' + esc(p.name || 'Unnamed client') + '</span>' +
          (po ? '<span class="po">' + esc(String(po)) + '</span>' : '') +
          (town ? '<span class="kpct">' + esc(town) + '</span>' : '') + '</span>' +
        (tel.length >= 10 ? '<a class="kpcall" href="tel:' + tel + '">Call</a>' : '') +
        '</div>';
    }).join('') + (callRows.length > KP_SHOW ? '<div class="kpempty">+ ' + (callRows.length - KP_SHOW) + ' more \\u00b7 oldest first</div>' : '')
    : '<div class="kpempty">No leads waiting for a call.</div>';
  }"""
src = pl.sub(src, OLD_END, NEW_END)

# 3) toggle + Call link must not open the lead card
OLD_L = """document.addEventListener('click', function(e){
  var r = e.target.closest('.kplrow[data-proj], .kptrow[data-proj], .kpqrow[data-proj]');"""
NEW_L = """document.addEventListener('click', function(e){
  /* 1488: the To call toggle, and the Call link dials without opening the lead */
  var sb = e.target.closest('.kplseg button[data-kpm]');
  if(sb){
    try{ sessionStorage.setItem('kpLeadMode', sb.getAttribute('data-kpm')); }catch(_){}
    window.renderKpHomeRow();
    return;
  }
  if(e.target.closest('a.kpcall')) return;
  var r = e.target.closest('.kplrow[data-proj], .kptrow[data-proj], .kpqrow[data-proj]');"""
src = pl.sub(src, OLD_L, NEW_L)

# 4) styles appended inside the existing cr-kphome-styles block (no second style id)
OLD_S = """  #historyMount .projgrid::-webkit-scrollbar-track{background:rgba(255,255,255,.05);border-radius:999px;}
}
</style>
<script id="cr-kphome-script">"""
NEW_S = """  #historyMount .projgrid::-webkit-scrollbar-track{background:rgba(255,255,255,.05);border-radius:999px;}
}
/* 1488: Recent leads — Newest | To call */
.kplseg{float:right;display:inline-flex;gap:2px;padding:2px;border:1px solid var(--rbe-line2,#2b2b33);border-radius:999px;
  font:600 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
.kplseg button{background:transparent;border:0;color:var(--rbe-mute,#9aa0a8);padding:5px 10px;border-radius:999px;font:inherit;cursor:pointer;min-height:30px;}
.kplseg button.on{background:var(--rbe-line2,#2b2b33);color:var(--rbe-head,#ffffff);}
.kpcallrow{flex-wrap:nowrap;align-items:center;gap:10px;min-height:48px;}
.kpcd{min-width:40px;text-align:center;font-weight:800;font-size:17px;line-height:1;color:var(--rbe-head,#ffffff);}
.kpcd small{display:block;font-size:10px;font-weight:600;color:var(--rbe-mute,#9aa0a8);}
.kpcd.mid{color:#f2a531;}
.kpcd.old{color:#ff5a61;}
.kpcm{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;}
.kpct{flex-basis:100%;font-size:12.5px;color:var(--rbe-mute,#9aa0a8);}
.kpcall{flex:none;background:#2d6a4f;color:#fff;border-radius:999px;padding:8px 14px;font-weight:700;font-size:14px;text-decoration:none;}
</style>
<script id="cr-kphome-script">"""
src = pl.sub(src, OLD_S, NEW_S)

# 5) build label
src = pl.sub(src, 'v2026-11-25 build 1487', 'v2026-11-27 build 1488')

pl.write_atomic('index_v1488.html', src)
pl.assert_in('index_v1488.html', "1488: \"To call\" — the rep's own Leads, oldest untouched first")
print('patched')
