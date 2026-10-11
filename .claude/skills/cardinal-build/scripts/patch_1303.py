"""Build 1303 — the Community home opens on Retail's pipeline (Theo, 11 Oct: "1 and A").

Theo: "make the pipeline states same as retail but add bid submitted or waiting and
tarp only" -> pick 1 from the preview: Retail's seven buckets (L P A C I Closed On
Hold, Scheduled counted under A), with P reading "Bid Submitted" and On Hold reading
"Waiting"; Tarp Only "is not a stage just standalone", so it is its own tile.

  * The buckets are Retail's PIPE_BUCKETS read live, not a copy, with two words
    overridden — so a change to Retail's pipeline reaches Community too. Same
    .pipebtn/.pcirc markup, so the spheres are Retail's spheres.
  * A tap is one of 975's doors: it opens All estimates filtered to that stage
    (Approved includes Scheduled, as on Retail). Production sees no money, the
    rule the rest of this hub already follows.
  * Tarp Only counts every Community job whose Work Type (1302) is Tarp Only, at
    any stage, and opens Clients filtered to them through a new Work type facet in
    the existing filter (CH_GROUPS) — not a second filter.
Order is pick A: search, pipeline (+ Tarp Only), then Waiting on you, then the doors.
The calendar and Partner A/R are 1304.

Usage: python3 patch_1303.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# 1. the Work type helper beside stageLabels
A = """function stageLabels(keys){
return (keys || []).map(function(k){ return LABEL[k] || k; });
}
var chSheet"""
B = """function stageLabels(keys){
return (keys || []).map(function(k){ return LABEL[k] || k; });
}
/* 1303: a job's Work Type. The job card writes it flat (work_type), the
   Community job page writes both flat and under lead — read both. */
function wtOf(pr){
var c = ck(pr) || {}, l = c.lead || {};
return String(c.work_type || l.work_type || '').trim();
}
var chSheet"""
src = pl.sub(src, A, B)

# 2. the Work type facet, so the Tarp Only tile has somewhere to route
A = """{ key:'waitlist', label:'Waitlist',     get:function(pr){ return chWaiting(pr) ? 'On the waitlist' : 'Not waitlisted'; } }
];"""
B = """{ key:'waitlist', label:'Waitlist',     get:function(pr){ return chWaiting(pr) ? 'On the waitlist' : 'Not waitlisted'; } },
/* 1303: the facet the Tarp Only tile routes through (975's door shape). */
{ key:'wtype',   label:'Work type',     get:function(pr){ return wtOf(pr) || 'Not set'; } }
];"""
src = pl.sub(src, A, B)

# 3. build the pipeline + tile just before the home pane
A = """var homePane = '<div data-pane="home" class="' + (pane === 'home' ? 'on' : '') + '">' +
'<div class="cc-srch"><input type="search" id="cr-ch2-search" placeholder="Name, address, partner, work type\\u2026" value="' + esc(query) + '"></div>' +
'<div class="cc-atop">"""
B = """/* 1303: Retail's pipeline, read live from PIPE_BUCKETS so the two cannot drift,
   with Theo's two Community words. Each bucket is a 975 door onto All estimates. */
var CC_PIPE_WORDS = {
Prospect: { label:'BID SUBMITTED', short:'Bid Submitted', letter:'P', tip:'Bid is in \\u2014 waiting on the partner' },
OnHold:   { label:'WAITING', short:'Waiting', letter:'W', tip:'Waiting on a grant or funding decision' }
};
var ccBuckets = (window.PIPE_BUCKETS || []).map(function(b){
var o = {}, w = CC_PIPE_WORDS[b.key] || {};
Object.keys(b).forEach(function(k){ o[k] = b[k]; });
Object.keys(w).forEach(function(k){ o[k] = w[k]; });
return o;
});
var pipeHtml = ccBuckets.map(function(b){
var keys = b.key === 'Approved' ? ['Approved','Scheduled'] : [b.key];
var inB = d.all.filter(function(pr){ return keys.indexOf(normStage(pr.stage)) !== -1; });
var amt = inB.reduce(function(a,pr){ return a + (bidAmt(pr) || 0); }, 0);
doors['pipe:' + b.key] = { sets:{ stage: stageLabels(keys) }, pane:'bids', fold:'allbids' };
var full = b.label.charAt(0) + b.label.slice(1).toLowerCase();
return '<button type="button" class="pipebtn" data-ccpipe="' + b.key + '" title="' + esc(b.tip || '') + '" aria-label="' + esc(full) + '">' +
'<span class="pcirc ' + b.cls + '">' + (b.letter || b.label.charAt(0)) + '</span>' +
'<span class="plabel">' + esc(b.short || full) + '</span>' +
'<span class="pcount">' + inB.length + '</span>' +
(role === 'prod' ? '' : '<span class="pmoney">' + usd(amt) + '</span>') + '</button>';
}).join('');
var tarpOnly = d.all.filter(function(pr){ return wtOf(pr) === 'Tarp Only'; });
doors['tarponly'] = { sets:{ wtype:['Tarp Only'] }, pane:'clients' };
var pipeCard = ccBuckets.length
? '<div class="cc-pipe"><div class="cc-pipek">Community Pipeline</div><div class="piperow">' + pipeHtml + '</div></div>' +
  (tarpOnly.length
    ? '<button type="button" class="cc-tarponly" data-cctarp="1"><b>' + tarpOnly.length + '</b><span>Tarp Only</span><small>any stage \\u203A</small></button>'
    : '<div class="cc-tarponly is-zero"><b>0</b><span>Tarp Only</span><small>none right now</small></div>')
: '';

var homePane = '<div data-pane="home" class="' + (pane === 'home' ? 'on' : '') + '">' +
'<div class="cc-srch"><input type="search" id="cr-ch2-search" placeholder="Name, address, partner, work type\\u2026" value="' + esc(query) + '"></div>' +
pipeCard +
'<div class="cc-atop">"""
src = pl.sub(src, A, B)

# 4. wire the two new doors beside the KPI doors
A = """host.querySelectorAll('[data-queue]').forEach(function(el){
el.onclick = function(){ applyDoor(doors['q:' + el.getAttribute('data-queue')]); };
});"""
B = """host.querySelectorAll('[data-queue]').forEach(function(el){
el.onclick = function(){ applyDoor(doors['q:' + el.getAttribute('data-queue')]); };
});
/* 1303: the pipeline buckets and the Tarp Only tile */
host.querySelectorAll('[data-ccpipe]').forEach(function(el){
el.onclick = function(){ applyDoor(doors['pipe:' + el.getAttribute('data-ccpipe')]); };
});
host.querySelectorAll('[data-cctarp]').forEach(function(el){
el.onclick = function(){ applyDoor(doors['tarponly']); };
});"""
src = pl.sub(src, A, B)

# 5. styles, beside 1179's home-pane block
A = """#cr-ch2 .cc-door .ar{color:var(--ccm-dim,#828c86);font-size:18px;flex:0 0 auto}
</style>"""
B = """#cr-ch2 .cc-door .ar{color:var(--ccm-dim,#828c86);font-size:18px;flex:0 0 auto}

/* ── 1303: Retail's pipeline on the Community home, and the Tarp Only tile ── */
#cr-ch2 .cc-pipe{background:var(--ccm-card,#161918);border:1px solid var(--ccm-line,#2a2f2c);
  border-radius:11px;padding:10px 8px 8px;margin:10px 0 8px}
#cr-ch2 .cc-pipek{font:700 13px 'Segoe UI',Arial,sans-serif;color:var(--ccm-ink,#f2f4f3);margin:0 4px 8px}
/* Seven buckets do not fit one row of a phone once two of them are words, so
   the row is a grid: four then three on a phone (the preview Theo picked), all
   seven in one row from 700px. */
#cr-ch2 .cc-pipe .piperow{--cr-stack:"1303: Community fits all seven buckets on screen as a grid rather than a sideways scroll";
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;overflow:visible;padding:0}
@media (min-width:700px){#cr-ch2 .cc-pipe .piperow{grid-template-columns:repeat(7,minmax(0,1fr))}}
#cr-ch2 .cc-pipe .pipebtn{--cr-stack:"1303: a grid cell, not a fixed-width scroller cell";min-width:0;max-width:none}
#cr-ch2 .pipebtn .plabel{--cr-stack:"1303: two Community words are longer than Retail's letters, so they wrap instead of clipping";
  white-space:normal;overflow:visible;text-transform:none;letter-spacing:0;line-height:1.15;color:var(--ccm-ink,#f2f4f3)}
#cr-ch2 .pipebtn .pcount{--cr-stack:"1303: Community card ink, both themes";color:var(--ccm-ink,#f2f4f3)}
#cr-ch2 .pipebtn .pmoney{--cr-stack:"1303: Community card ink, both themes";color:var(--ccm-dim,#828c86)}
#cr-ch2 .cc-tarponly{display:flex;align-items:baseline;gap:8px;width:100%;text-align:left;
  background:var(--ccm-card,#161918);border:1px solid var(--ccm-line,#2a2f2c);border-left:3px solid #5B6B8C;
  border-radius:11px;padding:10px 12px;min-height:44px;margin:0 0 8px;color:inherit;cursor:pointer}
#cr-ch2 .cc-tarponly.is-zero{cursor:default}
#cr-ch2 .cc-tarponly b{font:800 20px 'Segoe UI',Arial,sans-serif;color:var(--ccm-ink,#f2f4f3)}
#cr-ch2 .cc-tarponly span{font:700 15px 'Segoe UI',Arial,sans-serif;color:var(--ccm-ink,#f2f4f3)}
#cr-ch2 .cc-tarponly small{margin-left:auto;font:600 13px 'Segoe UI',Arial,sans-serif;color:var(--ccm-dim,#828c86)}
#cr-ch2 .cc-tarponly:focus-visible{outline:2px solid var(--ccm-ac,#34D399);outline-offset:2px}
</style>"""
src = pl.sub(src, A, B)

A = ">v2026-10-11 build 1302<button"
B = ">v2026-10-11 build 1303<button"
src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1303, d: '2026-10-11', t: 'Community opens on the pipeline, with Tarp Only beside it',
    s: 'The Community home now starts with the same pipeline as Retail \\u2014 L, Bid Submitted, A, C, I, Closed, Waiting \\u2014 with the count and dollars in each, and a tap opens those jobs. Under it, a Tarp Only tile counts every job marked Tarp Only at any stage. What is waiting on you and the Clients, Estimates and Partners doors follow, as before.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
