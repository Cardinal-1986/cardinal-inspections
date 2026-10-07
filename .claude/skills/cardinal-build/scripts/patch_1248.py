#!/usr/bin/env python3
"""Build 1248 — the Punch List, redesigned (Theo's pick 1A, 7 Oct 2026).

Punch & Repairs stops being four state tabs over gradient cards and becomes
one list grouped by WHEN: Past due / Today / Coming up / No date / On hold,
with the four kinds of work (Tarps, Repairs, Callbacks, Punch-outs) as the
tabs. A table where there is room, three-line rows on a phone — one markup,
switched by a container query on #puList, so the 480–560px column beside the
ultrawide map gets the phone rows and the desktop list gets the table.

Kept, byte-for-byte in behaviour: the data layer, the pinned unassigned
queue (945 — the choke point never hides), the Assign sheet, search (with
PO), + New, the funnel filters, the home strips (cardHtml), the card-open
on tap. Retired: the Active/Assigned/Scheduled/Closed tabs, the sort sheet
and the reverse button, and the list's one-tap tick (closing happens in the
card, where the photo and step rules live; the strips keep their tick).

usage: python3 patch_1248.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../../index.html')
src = pl.load(PATH)

# ── 1. markup: search + funnel share a row; tabs become the four kinds ──
OLD_CTL = '''    <div class="pu-srch">&#128269; <input type="search" id="puSearch" placeholder="Search name, address, PO # or item&#8230;" aria-label="Search punch items"></div>
    <div class="pu-ctl"><span class="sl">Sort by</span>
      <button class="pu-chip" id="puSortChip">Urgency</button>
      <div class="right">
        <div class="pu-ico" id="puDirBtn" title="Reverse order">&#8645;</div>
        <div class="pu-ico" id="puFunnel" title="Filters">&#9923;<span class="bdg" id="puBadge">0</span></div>
      </div>
    </div>
    <div class="pu-tabs" id="puTabs">
      <button class="pu-tab on" data-putab="active">Active <span class="n" id="puNActive">0</span></button>
      <button class="pu-tab" data-putab="assigned">Assigned <span class="n" id="puNAssigned">0</span></button>
      <button class="pu-tab" data-putab="scheduled">Scheduled <span class="n" id="puNSched">0</span></button>
      <button class="pu-tab" data-putab="completed">Closed <span class="n" id="puNDone">0</span></button>
    </div>
    <div class="pu-lay">
      <aside class="pu-rail-wrap"><div class="pu-rail" id="puRail"></div>
        <select class="pu-sel" id="puSortSel" style="display:none;"></select>
      </aside>'''
NEW_CTL = '''    <div class="pu-ctl"><div class="pu-srch">&#128269; <input type="search" id="puSearch" placeholder="Client, address, PO # or item" aria-label="Search punch items"></div>
      <button class="pu-ico" id="puFunnel" type="button" title="Filters" aria-label="Filters">&#9923;<span class="bdg" id="puBadge">0</span></button>
    </div>
    <div class="pu-tabs" id="puTabs" role="group" aria-label="Kind of work">
      <button class="pu-tab on" type="button" data-putype="all" aria-pressed="true"><b class="n" id="puNAll">0</b><span>All</span></button>
      <button class="pu-tab k-tarp" type="button" data-putype="tarp" aria-pressed="false"><b class="n" id="puNTarp">0</b><span>Tarps</span></button>
      <button class="pu-tab k-ticket" type="button" data-putype="ticket" aria-pressed="false"><b class="n" id="puNTicket">0</b><span>Repairs</span></button>
      <button class="pu-tab k-callback" type="button" data-putype="callback" aria-pressed="false"><b class="n" id="puNCallback">0</b><span>Callbacks</span></button>
      <button class="pu-tab k-punch" type="button" data-putype="punch" aria-pressed="false"><b class="n" id="puNPunch">0</b><span>Punch-outs</span></button>
    </div>
    <div class="pu-lay">
      <aside class="pu-rail-wrap"><div class="pu-rail" id="puRail"></div></aside>'''
src = pl.sub(src, OLD_CTL, NEW_CTL)

src = pl.sub(src, '''  <div class="pu-sheet" id="puShSort"><div class="panel">
    <div class="ph"><span class="t">Sort by</span><button id="puSortClose">Close</button></div>
    <div id="puSortList"></div>
  </div></div>
''', '')

# ── 2. CSS ──
# the 1247 phone override existed only to squeeze the old four tabs; the new
# five-up grid is sized for a phone from the start
src = pl.sub(src, '''@media (max-width:430px){
  /* .pu-tabs .pu-tab: the base rule sits LATER in this block and would win a
     same-specificity fight by source order */
  /* 1247: the type scale (1242) took these tabs 12 -> 13px and they overflowed the
     phone by 8px once the counts reached two digits. The text stays on the scale;
     the side padding gives the room back. */
  .pu-tabs .pu-tab{padding:10px 4px;font-size:13px;--cr-stack:"the phone fit has always overridden the base .pu-tab rule (945); 1247 only changed its padding";}
  .pu-tabs .pu-tab .n{margin-left:3px;padding:2px 4px;font-size:11px;}
}
''', '')

src = pl.sub(src, '''.pu-srch{display:flex;align-items:center;gap:8px;background:var(--rbe-panel);border:1px solid var(--rbe-line);border-radius:6px;
  padding:8px 12px;margin-bottom:10px;color:var(--rbe-mute);font-size:13px;}''',
'''.pu-srch{display:flex;align-items:center;gap:8px;background:var(--rbe-panel);border:1px solid var(--rbe-line);border-radius:10px;
  padding:0 12px;min-height:44px;flex:1;min-width:0;color:var(--rbe-mute);font-size:13px;}''')

src = pl.sub(src, '''.pu-ctl{display:flex;align-items:center;gap:9px;margin-bottom:12px;flex-wrap:wrap;}
.pu-ctl .sl{font:600 13px 'Segoe UI',Arial,sans-serif;color:var(--rbe-mute);}
.pu-chip{color:var(--rbe-acc);font:700 13px 'Segoe UI',Arial,sans-serif;background:none;border:0;padding:2px 4px;min-height:44px;cursor:pointer;
  text-decoration:underline dashed var(--rbe-gradline);text-decoration-thickness:1px;text-underline-offset:5px;
}
.pu-ico{width:34px;height:34px;border:1px solid var(--rbe-line);''',
'''.pu-ctl{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.pu-ico{width:44px;height:44px;flex:0 0 auto;padding:0;border:1px solid var(--rbe-line);''')

src = pl.sub(src, '''.pu-ctl .right{margin-left:auto;display:flex;gap:8px;}
.pu-lay{display:block;}''', '''.pu-lay{display:block;}''')

src = pl.sub(src, '''@media (min-width:901px){
  .pu-ctl .pu-chip,.pu-ctl .sl,#puFunnel{display:none;}
  .pu-lay{display:grid;grid-template-columns:230px 1fr;gap:14px;align-items:start;}''',
'''@media (min-width:901px){
  #puFunnel,#puTabs{display:none;}
  .pu-lay{display:grid;grid-template-columns:230px 1fr;gap:14px;align-items:start;}''')

src = pl.sub(src, '''  .pu-sel{width:100%;background:var(--rbe-panel);border:1px solid var(--rbe-line);color:var(--rbe-ink);border-radius:9px;padding:8px 10px;
    font:600 13px 'Segoe UI',Arial,sans-serif;margin-bottom:10px;}
  .pu-fg{margin-top:10px;border-top:1px solid var(--rbe-hair);padding-top:8px;}
  .pu-fg .ft{font:800 11px ui-monospace,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--rbe-acc);margin-bottom:7px;}
  .pu-fr{display:flex;align-items:center;gap:8px;padding:5px 2px;color:var(--rbe-ink);font-size:13px;cursor:pointer;}
  .pu-fr .bx{width:15px;height:15px;border:1.4px solid var(--rbe-checkbd);border-radius:4px;display:flex;align-items:center;
    justify-content:center;font-size:11px;color:var(--rbe-checkfg);flex:0 0 auto;}
  .pu-fr.on .bx{background:var(--rbe-ok);border-color:var(--rbe-ok);font-weight:800;}
  .pu-fr .c{margin-left:auto;font:700 11px ui-monospace,Menlo,monospace;color:var(--rbe-mute2);}
}''', '''}''')

OLD_TABS_CSS = '''/* active / scheduled / completed tabs (912) */
.pu-tabs{display:flex;align-items:center;gap:0;border-bottom:1px solid var(--rbe-line);margin:0 0 13px;
  overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.pu-tabs::-webkit-scrollbar{display:none;}
.pu-tab{background:none;border:0;border-bottom:3px solid transparent;padding:10px 15px;cursor:pointer;white-space:nowrap;flex:0 0 auto;
  font:800 15px 'Segoe UI',Arial,sans-serif;color:var(--rbe-mute);margin-bottom:-1px;}
.pu-tab.on{color:var(--rbe-acclt);border-bottom-color:var(--rbe-acc);}
.pu-tab .n{font:700 11px ui-monospace,Menlo,monospace;background:var(--rbe-line);color:var(--rbe-ink);border-radius:999px;
  padding:2px 7px;margin-left:7px;}'''
NEW_TABS_CSS = '''/* 1248: the four kinds of work (1A). Was Active / Assigned / Scheduled / Closed
   (912, 945). Five even cells on a phone, a coloured cap per kind; the desktop
   rail carries the same choice, so the strip hides at 901px and up. The kind
   marks are the validated categorical set (both themes, 3:1 on their ground);
   the inks beside them are text twins that clear 4.5:1. */
#punchView{--pl-tarp:#4f86e8;--pl-ticket:#c4801a;--pl-callback:#9670e0;--pl-punch:#2fa86a;
  --pl-late:#f08a90;--pl-latebg:#1c1013;--pl-live:#6fd39b;--pl-chip:#22262c;}
:root[data-theme="rb-light"] #punchView{--pl-tarp:#2f6fdf;--pl-ticket:#b97606;--pl-callback:#8a5cd6;--pl-punch:#2f9e64;
  --pl-late:#a3151f;--pl-latebg:#fbefef;--pl-live:#1b7d49;--pl-chip:#ebe8e2;}
.pu-tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:0 0 12px;
  overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;}
.pu-tabs::-webkit-scrollbar{display:none;}
.pu-tab{position:relative;overflow:hidden;min-width:0;min-height:58px;padding:6px 2px 4px;border:0;border-radius:12px;cursor:pointer;
  background:var(--pl-chip,#22262c);color:var(--rbe-ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;}
.pu-tab::before{content:'';position:absolute;top:0;left:14px;right:14px;height:3px;border-radius:0 0 3px 3px;background:transparent;}
.pu-tab.k-tarp::before{background:var(--pl-tarp,#4f86e8);}
.pu-tab.k-ticket::before{background:var(--pl-ticket,#c4801a);}
.pu-tab.k-callback::before{background:var(--pl-callback,#9670e0);}
.pu-tab.k-punch::before{background:var(--pl-punch,#2fa86a);}
.pu-tab .n{font:700 18px 'Segoe UI',Arial,sans-serif;font-variant-numeric:tabular-nums;color:inherit;}
.pu-tab span{font:600 11px 'Segoe UI',Arial,sans-serif;color:var(--rbe-mute);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;}
.pu-tab.on{background:var(--rbe-ink);color:var(--rbe-panel2,#101015);}
.pu-tab.on span{color:var(--rbe-panel2,#101015);}
/* 1248: the list. ONE row markup, two layouts, chosen by the width of #puList
   itself — not the window — so the 480–560px column beside the ultrawide map
   (pumap) gets the phone rows and a desktop list gets the table. */
#puList{container-type:inline-size;container-name:pulist;}
.pl-cols{display:none;}
.pl-grp{display:flex;align-items:center;gap:10px;min-height:34px;margin-top:6px;font:700 11px ui-monospace,Menlo,monospace;
  letter-spacing:.14em;text-transform:uppercase;color:var(--rbe-mute);}
.pl-grp::after{content:'';flex:1;height:1px;background:var(--rbe-line);}
.pl-grp.late{color:var(--pl-late,#f08a90);}
.pl-row{display:grid;grid-template-columns:4px auto minmax(0,1fr) auto;column-gap:10px;row-gap:3px;
  grid-template-areas:"stp cl cl age" "stp kd pb pb" "stp wh wh cr";
  padding:10px 12px 10px 0;border-bottom:1px solid var(--rbe-line);cursor:pointer;color:var(--rbe-ink);font-size:15px;}
.pl-row:focus-visible{outline:2px solid var(--rbe-acc);outline-offset:-2px;}
.pl-row.late{background:var(--pl-latebg,#1c1013);}
.pl-row.done{opacity:.7;}
.pl-stp{grid-area:stp;align-self:stretch;width:4px;border-radius:2px;}
.pl-row.u .pl-stp{background:#c8202e;}
.pl-kd{grid-area:kd;display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap;}
.pl-k1{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--rbe-ink);}
.pl-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto;background:var(--rbe-mute);}
.pl-row.k-tarp .pl-dot{background:var(--pl-tarp,#4f86e8);}
.pl-row.k-ticket .pl-dot{background:var(--pl-ticket,#c4801a);}
.pl-row.k-callback .pl-dot{background:var(--pl-callback,#9670e0);}
.pl-row.k-punch .pl-dot{background:var(--pl-punch,#2fa86a);}
.pl-flag{font:700 11px 'Segoe UI',Arial,sans-serif;color:var(--pl-late,#f08a90);white-space:nowrap;}
.pl-cl{grid-area:cl;display:flex;align-items:baseline;gap:8px;min-width:0;}
.pl-cl b{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;color:var(--rbe-head,#ffffff);}
.pl-cl small{font-size:13px;color:var(--rbe-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 0;min-width:0;}
.pl-pb{grid-area:pb;font-size:13px;color:var(--rbe-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;align-self:center;}
.pl-age{grid-area:age;font:600 13px ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;color:var(--rbe-mute);text-align:right;}
.pl-wh{grid-area:wh;display:flex;align-items:baseline;gap:6px;min-width:0;font-size:13px;white-space:nowrap;}
.pl-wh b{font-weight:600;}
.pl-wh small{font-size:13px;color:var(--rbe-mute);overflow:hidden;text-overflow:ellipsis;}
.pl-wh.late small{color:var(--pl-late,#f08a90);font-weight:600;}
.pl-wh.live small{color:var(--pl-live,#6fd39b);font-weight:600;}
.pl-wh.warn small{color:var(--pl-late,#f08a90);}
.pl-cr{grid-area:cr;display:flex;align-items:center;gap:6px;font-size:13px;white-space:nowrap;}
.pl-av{width:26px;height:26px;border-radius:50%;background:var(--pl-chip,#22262c);color:var(--rbe-ink);display:grid;place-items:center;
  font:700 11px ui-monospace,Menlo,monospace;flex:0 0 auto;}
.pl-cr .pl-nm{display:none;}
.pl-more,.pl-back{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:48px;margin-top:14px;padding:0 14px;
  border:1px solid var(--rbe-line);border-radius:12px;background:none;color:var(--rbe-ink);font:600 15px 'Segoe UI',Arial,sans-serif;cursor:pointer;}
.pl-back{justify-content:flex-start;gap:8px;margin:0 0 6px;}
/* 860px of LIST, not window: the table's fixed columns take ~540px, so below
   this the client and the problem would ellipsize to nothing. With the app's
   left nav open a 1280 window gives the list ~716px and the rows; collapse the
   nav or widen the window and the table arrives. */
@container pulist (min-width:860px){
  .pl-cols,.pl-row{grid-template-columns:4px 112px minmax(0,1fr) minmax(0,1.2fr) 48px 168px 120px;column-gap:14px;
    grid-template-areas:"stp kd cl pb age wh cr";align-items:center;}
  .pl-cols{display:grid;min-height:34px;border-bottom:1px solid var(--rbe-line);font:700 11px ui-monospace,Menlo,monospace;
    letter-spacing:.12em;text-transform:uppercase;color:var(--rbe-mute);}
  .pl-row{min-height:56px;padding:6px 0;row-gap:0;}
  .pl-kd{flex-direction:column;align-items:flex-start;gap:2px;}
  .pl-cl{flex-direction:column;align-items:stretch;gap:0;}
  .pl-cl b,.pl-cl small{display:block;}
  .pl-pb{font-size:15px;color:var(--rbe-ink);}
  .pl-age{text-align:left;}
  .pl-wh{flex-direction:column;align-items:flex-start;gap:0;}
  .pl-cr .pl-nm{display:inline;}
}
@media (min-width:901px){
  .pl-ri{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 10px;border:0;border-radius:9px;background:none;
    color:var(--rbe-ink);font:500 15px 'Segoe UI',Arial,sans-serif;text-align:left;cursor:pointer;}
  .pl-ri.on{background:var(--pl-chip,#22262c);font-weight:700;}
  .pl-ri .n{margin-left:auto;font:600 13px ui-monospace,Menlo,monospace;color:var(--rbe-mute);}
  .pl-ri .n.hot{color:var(--pl-late,#f08a90);}
  .pl-sq{width:11px;height:11px;border-radius:3px;flex:0 0 auto;}
  .pl-ri.k-tarp .pl-sq{background:var(--pl-tarp,#4f86e8);}
  .pl-ri.k-ticket .pl-sq{background:var(--pl-ticket,#c4801a);}
  .pl-ri.k-callback .pl-sq{background:var(--pl-callback,#9670e0);}
  .pl-ri.k-punch .pl-sq{background:var(--pl-punch,#2fa86a);}
  .pl-rh{margin:16px 10px 6px;font:700 11px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--rbe-mute);}
}'''
src = pl.sub(src, OLD_TABS_CSS, NEW_TABS_CSS)

# the 944 floor rule for the retired underline tabs — the new cells are 58px
src = pl.sub(src, '''.pu-tab{min-height:44px;}''', '''.pu-tab{min-height:58px;}''')

# ── 3. script: state ──
OLD_STATE = '''var PU = { sort:'urgent', dir:1, sets:{}, q:'', tab:'active' };
var PHOTO_MIN = 5;
var puSheet = { cat:null, pend:[] };
var PU_SORTS = [
  { k:'urgent',  l:'Urgency' },
  { k:'newest',  l:'Newest first' },
  { k:'oldest',  l:'Oldest first' },
  { k:'client',  l:'Client name' }
];'''
NEW_STATE = '''/* 1248: type = the kind tab, view = a "needs attention" focus from the rail
   ('' = every open group, or late / nodate / hold / closed). */
var PU = { sets:{}, q:'', type:'all', view:'' };
var PHOTO_MIN = 5;
var puSheet = { cat:null, pend:[] };'''
src = pl.sub(src, OLD_STATE, NEW_STATE)

# sorted() is retired with the sort sheet — the list orders itself by when
OLD_SORTED = '''function sorted(list){
  var d = PU.dir;
  return list.slice().sort(function(a, b){
    var r = 0;
    if(PU.sort === 'urgent'){
      var av = (a.status === 'done' ? 2 : 0) + (isUrgent(a) ? -1 : 0);
      var bv = (b.status === 'done' ? 2 : 0) + (isUrgent(b) ? -1 : 0);
      r = av - bv || String(b.created_at || '').localeCompare(String(a.created_at || ''));
    } else if(PU.sort === 'newest'){ r = String(b.created_at || '').localeCompare(String(a.created_at || '')); }
    else if(PU.sort === 'oldest'){ r = String(a.created_at || '').localeCompare(String(b.created_at || '')); }
    else {
      var an = (projOf(a.project_id) || {}).name || '';
      var bn = (projOf(b.project_id) || {}).name || '';
      r = an.localeCompare(bn);
    }
    return d * r;
  });
}'''
NEW_SORTED = r'''/* ── 1248: the Punch List (1A) ── */
/* the four kinds, in the order the page shows them. 'ticket' is the stored
   value for a repair — it predates the word, and 64 places read it. */
var PL_KINDS = [
  { k:'tarp',     one:'Tarp',      many:'Tarps' },
  { k:'ticket',   one:'Repair',    many:'Repairs' },
  { k:'callback', one:'Callback',  many:'Callbacks' },
  { k:'punch',    one:'Punch-out', many:'Punch-outs' }
];
var PL_GROUPS = [
  { g:'late',   l:'Past due' },
  { g:'today',  l:'Today' },
  { g:'next',   l:'Coming up' },
  { g:'nodate', l:'No date' },
  { g:'hold',   l:'On hold' }
];
var PL_DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var PL_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function plKind(it){
  var k = kindOf(it);
  return PL_KINDS.filter(function(x){ return x.k === k; })[0] || PL_KINDS[3];
}
function plTypeOk(it){ return PU.type === 'all' || kindOf(it) === PU.type; }
function plDay(it){ return it && it.scheduled_at ? String(it.scheduled_at).slice(0, 10) : ''; }
function plLocalKey(iso){
  var d = new Date(iso); if(isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function plKeyDate(key){
  var p = String(key || '').split('-');
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  return isNaN(d.getTime()) ? null : d;
}
function plDayLabel(key){
  var d = plKeyDate(key);
  return d ? PL_DOW[d.getDay()] + ' ' + d.getDate() + ' ' + PL_MON[d.getMonth()] : '—';
}
function plDaysLate(key){
  var a = plKeyDate(key), b = plKeyDate(puTodayKey());
  return (a && b) ? Math.round((b.getTime() - a.getTime()) / 86400000) : 0;
}
/* On hold is FIELDS, not a status: status stays 'open' (64 places compare it),
   and hold_reason / hold_until arrive with punch_hold.sql (3C). Until then
   these read undefined and nothing is on hold. Once hold_until has passed the
   job rejoins its group and says it is back. */
function plOnHold(it){
  if(!it || it.status === 'done' || !it.hold_reason) return false;
  return !it.hold_until || String(it.hold_until).slice(0, 10) > puTodayKey();
}
function plBackFromHold(it){
  return !!(it && it.status !== 'done' && it.hold_reason && it.hold_until &&
    String(it.hold_until).slice(0, 10) <= puTodayKey());
}
function plGroup(it){
  if(it.status === 'done') return 'closed';
  if(plOnHold(it)) return 'hold';
  if(puOpenVisit(it)) return 'today';          /* on site, however long ago they checked in (940) */
  var d = plDay(it), t = puTodayKey();
  if(!d) return 'nodate';
  if(d < t) return 'late';
  if(d === t) return 'today';
  return 'next';
}
function plName(e){
  if(!e) return '';
  var n = String(e).split('@')[0];
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function plWhen(it){
  var g = plGroup(it), d = plDay(it), o = puOpenVisit(it), n = puDaysOn(it);
  var clock = fmtSchedClock(it.scheduled_time).replace(/^ · /, '');
  if(g === 'closed'){
    return { main: it.done_at ? 'Done ' + plDayLabel(plLocalKey(it.done_at)) : 'Done',
             sub: it.done_by ? 'by ' + plName(it.done_by) : '' };
  }
  if(g === 'hold'){
    return { main: it.hold_until ? 'Back ' + plDayLabel(String(it.hold_until).slice(0, 10)) : 'On hold',
             sub: 'On hold · ' + String(it.hold_reason) };
  }
  if(o){
    return o.day === puTodayKey()
      ? { main:'Today', sub:'On site since ' + puClock(o.in) + (n > 1 ? ' · day ' + n : ''), cls:'live' }
      : { main:'Today', sub:'On site since ' + plDayLabel(o.day) + ' — not checked out', cls:'warn' };
  }
  if(g === 'late'){
    var late = plDaysLate(d);
    return { main: plDayLabel(d), sub: late + ' day' + (late === 1 ? '' : 's') + ' late', cls:'late' };
  }
  if(g === 'today') return { main:'Today', sub: clock || 'Not checked in', cls: clock ? '' : 'warn' };
  if(g === 'next')  return { main: plDayLabel(d), sub: clock };
  return { main:'No date', sub:'Not scheduled' };
}
function plOrder(a, b){
  return (isUrgent(b) ? 1 : 0) - (isUrgent(a) ? 1 : 0) ||
    plDay(a).localeCompare(plDay(b)) ||
    String(a.scheduled_time || '').localeCompare(String(b.scheduled_time || '')) ||
    String(a.created_at || '').localeCompare(String(b.created_at || ''));
}
function plRow(it){
  var pr = projOf(it.project_id), K = plKind(it), w = plWhen(it), g = plGroup(it);
  var urg = isUrgent(it), age = ageDays(it.created_at);
  var supp = String(it.title || '').indexOf('SUPPLEMENT / MATERIAL REQUEST') === 0;
  var who = it.assigned_to;
  return '<div class="pl-row k-' + K.k + (urg ? ' u' : '') + (g === 'late' ? ' late' : '') + (g === 'closed' ? ' done' : '') +
      '" data-pu="' + esc(String(it.id)) + '" data-proj="' + esc(String(it.project_id || '')) + '" role="button" tabindex="0">' +
    '<span class="pl-stp"></span>' +
    '<span class="pl-kd"><span class="pl-k1"><i class="pl-dot"></i>' + K.one + '</span>' +
      (urg ? '<span class="pl-flag">Urgent</span>' : '') +
      (supp ? '<span class="pl-flag">Supplement</span>' : '') +
      (plBackFromHold(it) ? '<span class="pl-flag">Back from hold</span>' : '') + '</span>' +
    '<span class="pl-cl"><b>' + esc(pr ? (pr.name || 'Unknown client') : 'Unknown client') + '</b>' +
      '<small>' + esc((pr && pr.address) || '') + '</small></span>' +
    '<span class="pl-pb">' + esc(it.title || 'Untitled item') + '</span>' +
    '<span class="pl-age">' + (age != null ? age + 'd' : '') + '</span>' +
    '<span class="pl-wh' + (w.cls ? ' ' + w.cls : '') + '"><b>' + esc(w.main) + '</b><small>' + esc(w.sub || '') + '</small></span>' +
    '<span class="pl-cr">' + (who ? '<span class="pl-av">' + esc(plName(who).slice(0, 2).toUpperCase()) + '</span><span class="pl-nm">' + esc(plName(who)) + '</span>'
                              : '<span class="pl-nm">No one</span>') + '</span>' +
  '</div>';
}'''
src = pl.sub(src, OLD_SORTED, NEW_SORTED)

# kind leaves the funnel: the tabs and the rail own it now
src = pl.sub(src, '''  kind:   { label:'Type',    vals:['punch','ticket','callback','tarp'], lab:function(v){ return v; } },
''', '')

# ── render(): the tabs/sort half is replaced; the queue half is kept ──
OLD_R1 = '''function render(){
  var all = rows();
  /* 945: The Line — one pass, every item in exactly one bucket */
  var B = { queue:[], active:[], assigned:[], scheduled:[], completed:[] };
  all.forEach(function(it){ B[bucketOf(it)].push(it); });

  /* the pinned queue — oldest first, above the tabs on every tab */
  var qEl = document.getElementById('puQueue');
  if(qEl){
    var queue = B.queue.filter(match).sort(function(a, b){'''
NEW_R1 = '''function render(){
  var all = rows();
  /* 1248: every open item is in exactly one place — the pinned queue (no one
     on it yet) or one WHEN group below. Closed work has its own view. */
  var open = all.filter(function(it){ return it.status !== 'done'; });
  var inQueue = function(it){ return !it.assigned_to && !plOnHold(it); };
  var plShown = function(it){ return match(it) && plTypeOk(it); };

  /* the pinned queue — oldest first, above the list in every view (945) */
  var qEl = document.getElementById('puQueue');
  if(qEl){
    var queue = open.filter(function(it){ return inQueue(it) && plShown(it); }).sort(function(a, b){'''
src = pl.sub(src, OLD_R1, NEW_R1)

i0 = src.index('''  var na = document.getElementById('puNActive'), nas = document.getElementById('puNAssigned'),''')
i1 = src.index('''  var n = count();
  var bdg = document.getElementById('puBadge');''', i0)
NEW_R2 = r'''  /* the kind counts: open work that passes the funnel and search, queue included */
  var base = open.filter(match);
  var nOf = function(k){ return base.filter(function(it){ return k === 'all' || kindOf(it) === k; }).length; };
  [['all','puNAll'],['tarp','puNTarp'],['ticket','puNTicket'],['callback','puNCallback'],['punch','puNPunch']].forEach(function(p){
    var el = document.getElementById(p[1]); if(el) el.textContent = nOf(p[0]);
  });
  document.querySelectorAll('#puTabs [data-putype]').forEach(function(b){
    var on = b.getAttribute('data-putype') === PU.type;
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  var board = open.filter(function(it){ return !inQueue(it) && plShown(it); });
  var G = { late:[], today:[], next:[], nodate:[], hold:[] };
  board.forEach(function(it){ G[plGroup(it)].push(it); });
  var closed = all.filter(function(it){ return it.status === 'done' && plShown(it); })
    .sort(function(a, b){ return String(b.done_at || '').localeCompare(String(a.done_at || '')); });
  var nQueue = open.filter(function(it){ return inQueue(it) && plShown(it); }).length;

  document.getElementById('puSub').textContent =
    (board.length + nQueue) + ' open · ' + nQueue + ' need assigned · ' + G.late.length + ' past due';

  var cols = '<div class="pl-cols" aria-hidden="true"><span></span><span>Type</span><span>Client</span>' +
    '<span>What’s wrong</span><span>Age</span><span>When</span><span>Crew</span></div>';
  var html = '';
  var listEl = document.getElementById('puList');
  if(PU.view === 'closed'){
    html = '<button type="button" class="pl-back" data-pufocus="">‹ Open work</button>' +
      (closed.length ? '<div class="pl-grp">Closed · ' + closed.length + '</div>' + cols + closed.map(plRow).join('')
                     : '<div class="pu-empty">Nothing closed yet — close an item from its card and it lands here.</div>');
  } else {
    var groups = PL_GROUPS.filter(function(g){ return !PU.view || PU.view === g.g; });
    groups.forEach(function(g){
      var list = G[g.g].slice().sort(plOrder);
      if(list.length) html += '<div class="pl-grp' + (g.g === 'late' ? ' late' : '') + '">' + g.l + ' · ' + list.length + '</div>' + list.map(plRow).join('');
    });
    html = html ? cols + html : '<div class="pu-empty">' +
      (all.length ? (PU.view ? 'Nothing here right now.' : 'Nothing matches — try All, or clear the filters.')
                  : 'No punch work yet. + New adds the first one.') + '</div>';
    if(PU.view) html = '<button type="button" class="pl-back" data-pufocus="">‹ All open work</button>' + html;
    html += '<button type="button" class="pl-more" data-pufocus="closed"><span>Closed</span><span>' + closed.length + ' ›</span></button>';
  }
  listEl.innerHTML = html;

'''
src = src[:i0] + NEW_R2 + src[i1:]

OLD_R3 = '''  document.getElementById('puFTitle').textContent = 'Filters (' + n + ')';
  document.getElementById('puSortChip').textContent =
    (PU_SORTS.filter(function(s){ return s.k === PU.sort; })[0] || PU_SORTS[0]).l;
  document.getElementById('puSortSel').innerHTML = PU_SORTS.map(function(s){
    return '<option value="' + s.k + '"' + (s.k === PU.sort ? ' selected' : '') + '>' + s.l + '</option>';
  }).join('');

  var C = CATS();
  document.getElementById('puRail').innerHTML = Object.keys(C).map(function(k){
    var g = C[k], on = PU.sets[k] || [];
    if(!g.vals.length) return '';
    return '<div class="pu-fg"><div class="ft">' + g.label + '</div>' + g.vals.map(function(v){
      var c = rows().filter(function(it){
        if(k === 'crm') return crmOf(projOf(it.project_id)) === v;
        if(k === 'kind') return kindOf(it) === v;
        if(k === 'who') return (it.assigned_to || 'Unassigned') === v;
        return (it.status === 'done' ? 'Closed' : (isUrgent(it) ? 'Urgent' : 'Open')) === v;
      }).length;
      return '<label class="pu-fr' + (on.indexOf(v) !== -1 ? ' on' : '') + '" data-g="' + k + '" data-v="' + esc(v) + '">' +
        '<span class="bx">' + (on.indexOf(v) !== -1 ? '\\u2713' : '') + '</span>' + esc(g.lab(v)) +
        '<span class="c">' + c + '</span></label>';
    }).join('') + '</div>';
  }).join('');

  document.getElementById('puSortList').innerHTML = PU_SORTS.map(function(s){
    return '<div class="pu-srow' + (s.k === PU.sort ? ' on' : '') + '" data-sort="' + s.k + '">' +
      '<span class="ck">\\u2713</span><span>' + s.l + '</span></div>';
  }).join('');
  document.getElementById('puCatList')'''
NEW_R3 = r'''  document.getElementById('puFTitle').textContent = 'Filters (' + n + ')';

  /* the desktop rail: the kinds, what needs attention, the crew, the CRM */
  var C = CATS();
  var ri = function(attrs, on, label, num, hot){
    return '<button type="button" class="pl-ri' + (on ? ' on' : '') + '" ' + attrs + ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
      label + '<span class="n' + (hot ? ' hot' : '') + '">' + num + '</span></button>';
  };
  var lateOf = function(k){ return base.some(function(it){ return kindOf(it) === k && plGroup(it) === 'late'; }); };
  var rail = ri('data-putype="all"', PU.type === 'all', 'All punch work', nOf('all')) +
    PL_KINDS.map(function(K){
      return ri('data-putype="' + K.k + '"', PU.type === K.k, '<i class="pl-sq"></i>' + K.many, nOf(K.k), lateOf(K.k))
        .replace('class="pl-ri', 'class="pl-ri k-' + K.k);
    }).join('') +
    '<div class="pl-rh">Needs attention</div>' +
    ri('data-pufocus="late"', PU.view === 'late', 'Past due', G.late.length, G.late.length > 0) +
    ri('data-pufocus="nodate"', PU.view === 'nodate', 'No date', G.nodate.length) +
    ri('data-pufocus="hold"', PU.view === 'hold', 'On hold', G.hold.length) +
    ri('data-pufocus="closed"', PU.view === 'closed', 'Closed', closed.length);
  var crewOn = PU.sets.who || [];
  var crew = whoList().filter(function(w){ return w !== 'Unassigned'; });
  if(crew.length) rail += '<div class="pl-rh">Crew</div>' + crew.map(function(w){
    var c = open.filter(function(it){ return it.assigned_to === w; }).length;
    return ri('data-g="who" data-v="' + esc(w) + '"', crewOn.indexOf(w) !== -1,
      '<span class="pl-av">' + esc(plName(w).slice(0, 2).toUpperCase()) + '</span>' + esc(plName(w)), c);
  }).join('');
  var crmOn = PU.sets.crm || [];
  rail += '<div class="pl-rh">CRM</div>' + C.crm.vals.map(function(v){
    var c = open.filter(function(it){ return crmOf(projOf(it.project_id)) === v; }).length;
    return ri('data-g="crm" data-v="' + v + '"', crmOn.indexOf(v) !== -1, esc(C.crm.lab(v)), c);
  }).join('');
  document.getElementById('puRail').innerHTML = rail;

  document.getElementById('puCatList')'''
src = pl.sub(src, OLD_R3, NEW_R3)

# ── handlers ──
src = pl.sub(src, '''  var card = e.target.closest('#puList .pu-card, #puQueue .pu-card, .pu-strip .pu-card');''',
'''  var fo = e.target.closest('#punchView [data-pufocus]');
  if(fo){
    var v = fo.getAttribute('data-pufocus');
    PU.view = (PU.view === v) ? '' : v;
    render();
    var pv = document.getElementById('punchView');
    if(pv && pv.scrollTop > 0) pv.scrollTop = 0; else window.scrollTo(0, 0);
    return;
  }
  var ty = e.target.closest('#punchView [data-putype]');
  if(ty){ PU.type = ty.getAttribute('data-putype'); render(); return; }
  var card = e.target.closest('#puList .pl-row, #puList .pu-card, #puQueue .pu-card, .pu-strip .pu-card');''')

src = pl.sub(src, '''document.getElementById('puTabs').addEventListener('click', function(e){
  var b = e.target.closest('[data-putab]');
  if(!b) return;
  PU.tab = b.getAttribute('data-putab');
  render();
});
''', '''/* 1248: a list row is a button to the keyboard too */
document.getElementById('puList').addEventListener('keydown', function(e){
  if(e.key !== 'Enter' && e.key !== ' ') return;
  var t = /** @type {Element} */ (e.target);
  var r = t && t.closest ? t.closest('.pl-row[data-pu]') : null;
  if(!r) return;
  e.preventDefault(); r.dispatchEvent(new MouseEvent('click', { bubbles:true }));
});
''')

src = pl.sub(src, '''document.getElementById('puSortSel').addEventListener('change', function(){ PU.sort = this.value; render(); });
document.getElementById('puDirBtn').addEventListener('click', function(){
  PU.dir = -PU.dir; this.classList.toggle('on', PU.dir === -1); render();
});
document.getElementById('puSortChip').addEventListener('click', function(){ document.getElementById('puShSort').classList.add('open'); });
document.getElementById('puFunnel')''', '''document.getElementById('puFunnel')''')

src = pl.sub(src, '''document.getElementById('puSortClose').addEventListener('click', function(){ document.getElementById('puShSort').classList.remove('open'); });
''', '')

src = pl.sub(src, '''document.getElementById('puRail').addEventListener('click', function(e){
  var r = e.target.closest('[data-g]'); if(!r) return;''', '''document.getElementById('puRail').addEventListener('click', function(e){
  var r = e.target.closest('[data-g]'); if(!r) return;   /* kinds and focus ride the document handler */''')

src = pl.sub(src, '''document.getElementById('puSortList').addEventListener('click', function(e){
  var r = e.target.closest('[data-sort]'); if(!r) return;
  PU.sort = r.getAttribute('data-sort'); render();
  document.getElementById('puShSort').classList.remove('open');
});
''', '')

# openPunchView: a fresh open starts on All, every open group
src = pl.sub(src, '''  PU.q = ''; document.getElementById('puSearch').value = '';
  if(preset && preset.crm){ PU.sets = { crm:[preset.crm] }; }''', '''  PU.q = ''; document.getElementById('puSearch').value = '';
  PU.type = 'all'; PU.view = '';
  if(preset && preset.crm){ PU.sets = { crm:[preset.crm] }; }''')

# ── 4. the ultrawide map reads list rows by data-pu: teach it the new row ──
src = pl.sub(src, '''    var ids={}; var cards=document.querySelectorAll('#puList .pu-card');''',
                  '''    var ids={}; var cards=document.querySelectorAll('#puList .pl-row, #puList .pu-card');''')
src = pl.sub(src, '''    var cards=document.querySelectorAll('#puList .pu-card');
    for(var i=0;i<cards.length;i++){ cards[i].classList.toggle('pumap-hi', cards[i].dataset.pu===String(id)); }
    var card=document.querySelector('#puList .pu-card[data-pu="'+CSS_escape(id)+'"]');''',
'''    var cards=document.querySelectorAll('#puList .pl-row, #puList .pu-card');
    for(var i=0;i<cards.length;i++){ cards[i].classList.toggle('pumap-hi', cards[i].dataset.pu===String(id)); }
    var card=document.querySelector('#puList [data-pu="'+CSS_escape(id)+'"]');''')
src = pl.sub(src, '''var c=e.target.closest && e.target.closest('.pu-card'); if(c && c.dataset.pu) selectFromList(c.dataset.pu);''',
                  '''var c=e.target.closest && e.target.closest('.pl-row, .pu-card'); if(c && c.dataset.pu) selectFromList(c.dataset.pu);''')
src = pl.sub(src, '''  .pu-card.pumap-hi{ outline:2px solid #e2574a; outline-offset:1px; border-radius:13px; }''',
                  '''  .pu-card.pumap-hi{ outline:2px solid #e2574a; outline-offset:1px; border-radius:13px; }
  .pl-row.pumap-hi{ outline:2px solid #e2574a; outline-offset:-2px; }''')

# ── 5. stamp + changelog ──
src = pl.sub(src, '>v2026-10-07 build 1247<', '>v2026-10-07 build 1248<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1248, d: '2026-10-07', t: 'The Punch List, redesigned',
    s: 'Punch & Repairs is one clean list now, grouped by when: Past due, Today, Coming up, No date and On hold. The tabs across the top are the four kinds of work — Tarps, Repairs, Callbacks and Punch-outs — each with its count. On a computer it reads as a table with the client, what’s wrong, how old it is, when it’s due and who has it; on a phone each job is three short lines. Jobs nobody has yet still sit at the top until someone is assigned. Closed work is one tap away at the bottom. Close a job from its card now, where the photos and steps are — the old tick box on the list is gone.' },
''')

pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
