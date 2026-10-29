#!/usr/bin/env python3
"""patch_1416_production.py <file> [out] — Build 1416, step 1 of 2. Production fixes from judge 14 (and judge 16's Production rows).

Exact-match surgery on index.html. Every edit asserts its count; an edit that
targets one module is applied to a SLICE of that module's <script>/<style>
block and re-joined, so a string that also exists elsewhere in the file can
never be touched by accident (the 634 trap: a scoped assertion with a global
substitution). Nothing here touches the build stamp or the CHANGELOG.

Writes atomically through patch_lib (in place unless [out] is given).
Re-running on a fresh copy reproduces the output byte for byte.
"""
import re
import sys

sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl  # noqa: E402

SRC_PATH = sys.argv[1]
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 else SRC_PATH
src = pl.load(SRC_PATH)
orig = src


def block(s, kind, bid):
    """(start, end) of the CONTENT of <kind id="bid">…</kind>, asserted unique."""
    opens = [m for m in re.finditer(r'<%s id="%s"[^>]*>' % (kind, re.escape(bid)), s)]
    if len(opens) != 1:
        raise pl.PatchError('block %s#%s found %d times' % (kind, bid, len(opens)))
    a = opens[0].end()
    b = s.find('</%s>' % kind, a)
    if b < 0:
        raise pl.PatchError('block %s#%s never closes' % (kind, bid))
    return a, b


def bsub(s, kind, bid, old, new, count=1):
    """Replace inside ONE block only: slice, assert, patch, re-join."""
    a, b = block(s, kind, bid)
    body = s[a:b]
    n = body.count(old)
    if n != count:
        raise pl.PatchError('%s#%s: expected %d of %r, found %d' % (kind, bid, count, old[:90], n))
    return s[:a] + body.replace(old, new) + s[b:]


def bappend(s, kind, bid, text):
    """Append text at the END of one block (just before its closing tag)."""
    a, b = block(s, kind, bid)
    return s[:b] + text + s[b:]


ST, SC = 'style', 'script'

# ═══════════════════════════════════════════════════════════════════════
# 1. cr-pb-styles — the Production board
# ═══════════════════════════════════════════════════════════════════════
PBS = 'cr-pb-styles'

# MAJOR 1 — the dashboard grid belongs to the HOME pane. It was written on
# .pbwrap, which all three panes share, so the full calendar's .pbsplit was
# auto-placed into the right column and the month sat 573-864px from the
# left edge with its agenda squeezed to 147-245px. Deletion at source: the
# selectors now name the home pane, and nothing out-specifies anything.
OLD_MID = r'''@media (min-width:1100px) and (max-width:1599px){
  #cr-pb .pbwrap{ max-width:1560px; display:grid;
    grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);
    column-gap:28px; row-gap:14px; align-items:start; }
  #cr-pb .pbwrap > *{ grid-column:2; }
  #cr-pb .pbwrap > .pbtop{ grid-column:1 / -1; }
  #cr-pb .pbwrap > .pbsub{ grid-column:1 / -1; }
  #cr-pb .pbwrap > .pbmonth{ grid-column:1; grid-row:3 / span 6; align-self:start; }
}'''
NEW_MID = r'''/* 1416 (judge 14, MAJOR 1): HOME PANE ONLY. These rules used to name .pbwrap,
   which the calendar and list panes wear too — so the full calendar's split was
   auto-placed into column 2 and the month started 573px (1366) to 864px (1920)
   from the board's left edge with its day agenda squeezed to 147-245px. The
   grid now names the pane it was designed for; the other two panes are plain
   columns again. The values are 1043's, verbatim. */
@media (min-width:1100px) and (max-width:1599px){
  #cr-pb .pbwrap.pbhome{ --cr-stack:"1416: 1043's grid, renamed to the pane it serves; the 1180 base column stays for the list pane"; max-width:1560px; display:grid;
    grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);
    column-gap:28px; row-gap:14px; align-items:start; }
  #cr-pb .pbwrap.pbhome > *{ grid-column:2; }
  #cr-pb .pbwrap.pbhome > .pbtop{ grid-column:1 / -1; }
  #cr-pb .pbwrap.pbhome > .pbsub{ grid-column:1 / -1; }
  #cr-pb .pbwrap.pbhome > .pbmonth{ grid-column:1; grid-row:3 / span 6; align-self:start; }
}'''
src = bsub(src, ST, PBS, OLD_MID, NEW_MID)

OLD_WIDE = r'''@media (min-width:1600px){
  #cr-pb .pbwrap{ max-width:2160px; display:grid;
    grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);
    column-gap:36px; row-gap:14px; align-items:start; }
  #cr-pb .pbwrap > *{ grid-column:2; }
  #cr-pb .pbwrap > .pbtop{ grid-column:1 / -1; }
  #cr-pb .pbwrap > .pbsub{ grid-column:1 / -1; }
  #cr-pb .pbwrap > .pbmonth{ grid-column:1; grid-row:3 / span 6; align-self:start; }
}'''
NEW_WIDE = r'''@media (min-width:1600px){
  #cr-pb .pbwrap.pbhome{ --cr-stack:"1416: 904's ultrawide grid, renamed to the pane it serves"; max-width:2160px; display:grid;
    grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);
    column-gap:36px; row-gap:14px; align-items:start; }
  #cr-pb .pbwrap.pbhome > *{ grid-column:2; }
  #cr-pb .pbwrap.pbhome > .pbtop{ grid-column:1 / -1; }
  #cr-pb .pbwrap.pbhome > .pbsub{ grid-column:1 / -1; }
  #cr-pb .pbwrap.pbhome > .pbmonth{ grid-column:1; grid-row:3 / span 6; align-self:start; }
}'''
src = bsub(src, ST, PBS, OLD_WIDE, NEW_WIDE)

# MAJOR 1 — the calendar | day split: the month flexes, the day keeps >=360px.
src = bsub(src, ST, PBS,
    '#cr-pb .pbsplit{ display:grid; grid-template-columns:minmax(0,1.7fr) minmax(0,1fr); gap:22px; align-items:start; }',
    '#cr-pb .pbsplit{ display:grid; grid-template-columns:minmax(0,1fr) minmax(360px,30%); gap:22px; align-items:start; }',
    count=2)

# MINOR 6 — four boxes, four columns. repeat(5) left a fifth of the row empty
# (~100px at 1366) and clipped SCHEDULED; Closed repairs is its own bar below.
src = bsub(src, ST, PBS,
    '#cr-pb .pbtiles{ grid-template-columns:repeat(5,minmax(0,1fr)); }',
    '#cr-pb .pbtiles{ --cr-stack:"desktop twin of the 2-up phone grid, which stays"; grid-template-columns:repeat(4,minmax(0,1fr)); }',
    count=2)

# the calendar pane's own width on a desktop (it no longer borrows the home grid)
src = bsub(src, ST, PBS,
    '  #cr-pb h1{ font-size:30px; }\n}',
    '  #cr-pb h1{ font-size:30px; }\n'
    '  #cr-pb .pbwrap.pbcalw{ --cr-stack:"1416: the calendar pane is wider than a list; the 1180 base stays for the list"; max-width:1560px; }\n}')

# POLISH 14 / judge 16 MINOR 16 — one sans heading, one colour.
src = bsub(src, ST, PBS,
    "#cr-pb h1{\n  margin:0; font:700 26px Georgia,'Times New Roman',serif; letter-spacing:.2px;\n"
    "  color:var(--pb-ink,#eceef0);\n}\n#cr-pb h1 span{ color:var(--pb-acc,#e35c63); }\n",
    "#cr-pb h1{\n  /* 1416 (judge 14 polish 14, judge 16 minor 16): sans, one colour — the serif\n"
    "     \"Pro\" + red \"duction\" was the only heading of its kind on a production screen */\n"
    "  margin:0; font:800 26px -apple-system,'Segoe UI',Roboto,sans-serif; letter-spacing:-.01em;\n"
    "  color:var(--pb-ink,#eceef0);\n}\n")
src = bsub(src, ST, PBS,
    "#cr-pb-modal h3{ margin:0 0 14px; font:700 18px Georgia,serif; }",
    "#cr-pb-modal h3{ margin:0 0 14px; font:800 18px -apple-system,'Segoe UI',Roboto,sans-serif; }   /* 1416: sans */")

# judge 16 MINOR 15 — the back chevron and the + Add / Full calendar chips are a
# VISIBLE 44px now. The 1040 ::after pads that faked it are retired at source.
src = bsub(src, ST, PBS,
    '#cr-pb .pbback{\n  flex:none; width:34px; height:34px; border-radius:10px; cursor:pointer;',
    '#cr-pb .pbback{\n  flex:none; width:44px; height:44px; border-radius:12px; cursor:pointer;   /* 1416: was 34 + a pad */')
src = bsub(src, ST, PBS,
    '#cr-pb .pbback{ position:relative; }\n'
    '#cr-pb .pbback::after{ content:""; position:absolute; inset:-6px; }\n'
    ':is(#cr-pb,#cr-pb-modal) .pbchip{ position:relative; }\n'
    ':is(#cr-pb,#cr-pb-modal) .pbchip::after{ content:""; position:absolute; left:0; right:0; top:-8px; bottom:-8px; }\n',
    '/* 1416 (judge 16 minor 15): the chevron and the chips measured 34x34 and 58x30 as\n'
    '   DRAWN — the pads made them hittable but not findable. Both are a visible 44 now,\n'
    '   so their two pads are deleted rather than left to overlap the next row. */\n')
src = bsub(src, ST, PBS,
    '  padding:5px 9px; text-transform:uppercase; min-height:30px;\n}',
    '  padding:0 13px; text-transform:uppercase; min-height:44px;   /* 1416: a visible 44 */\n}')

# MINOR 6 — a box's sub-line may take two lines instead of an ellipsis
src = bsub(src, ST, PBS,
    "#cr-pb .pbtile .s{\n"
    "  font:500 11px -apple-system,'Segoe UI',Roboto,sans-serif; color:var(--pb-dim,#848c94);\n"
    "  margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;\n}",
    "#cr-pb .pbtile .s{\n"
    "  font:500 11px -apple-system,'Segoe UI',Roboto,sans-serif; color:var(--pb-dim,#848c94);\n"
    "  /* 1416 (judge 14 minor 6): two lines before an ellipsis — \"Dena Whitmore +4\" lost its count in a desktop box */\n"
    "  margin-top:3px; overflow:hidden; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow-wrap:anywhere;\n}")

# MINOR 9 — the day sheet the Today row opens drew its rows in the Add form's
# BUTTON style (uppercase mono, 13px padding, flex:1): "#cr-pb-modal button" was
# written for Cancel / Add it and caught every button 1090 later put in the sheet.
src = bsub(src, ST, PBS,
    "#cr-pb-modal button{\n  flex:1; padding:13px;",
    "/* 1416: the Add form's two buttons, not every button in the modal — the 1090 day\n"
    "   sheet's rows and chips inherited uppercase mono and flex:1 from this */\n"
    "#cr-pb-modal .btns button{\n  flex:1; padding:13px;")

# MINOR 9 — the day's rows show the task, on up to two lines.
src = bsub(src, ST, PBS,
    ':is(#cr-pb,#cr-pb-modal) .pbev .tx{ min-width:0; }\n',
    ':is(#cr-pb,#cr-pb-modal) .pbev .tx{ min-width:0; flex:1 1 auto; }\n')
src = bsub(src, ST, PBS,
    ':is(#cr-pb,#cr-pb-modal) .pbev .tx b{\n'
    "  display:block; font:600 15px -apple-system,'Segoe UI',Roboto,sans-serif;\n"
    '  color:var(--pb-ink,#eceef0); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;\n}',
    ':is(#cr-pb,#cr-pb-modal) .pbev .tx b{\n'
    '  /* 1416 (judge 14 minor 9): two lines, not one ellipsis — "Sample Insurance Job — Ta…"\n'
    '     cut the task off a phone row. The clamp lives on a block box (the 758 rule). */\n'
    "  display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; font:600 15px/1.3 -apple-system,'Segoe UI',Roboto,sans-serif;\n"
    '  color:var(--pb-ink,#eceef0); overflow:hidden; overflow-wrap:anywhere;\n}')

PBS_ADD = r'''
/* ── 1416 · judge 14 (Production) ───────────────────────────────────────
   MINOR 9 — today, above the fold. On a phone the day's agenda sat ~760px
   down, under the month and the boxes. The month stays first (853, Theo's
   concept 2); this one row under the title says what today holds and opens
   the 1090 day sheet — the same sheet a tap on today's date opens. Desktop
   already shows the day beside the month, so it keeps its subtitle there.
   Inks are the board's own tokens: acc 5.11:1 / ink 15.44:1 / hot 6.09:1 on
   --pb-c (dark); 9.12 / 17.61 / 6.17:1 on white. */
#cr-pb .pbtoday{
  display:flex; align-items:center; gap:10px; width:100%; min-height:44px;
  margin:4px 0 2px; padding:0 13px; cursor:pointer; text-align:left;
  background:var(--pb-c,#15171a); border:1px solid var(--pb-line,rgba(230,235,240,.11)); border-radius:12px;
  color:var(--pb-ink,#eceef0); font:600 13px -apple-system,'Segoe UI',Roboto,sans-serif;
}
#cr-pb .pbtoday .k{ flex:none; font:700 11px var(--pb-mono,ui-monospace,Menlo,monospace); letter-spacing:.16em;
  text-transform:uppercase; color:var(--pb-acc,#e35c63); }
#cr-pb .pbtoday .t{ min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#cr-pb .pbtoday .t em{ color:var(--pb-hot,#e07a5f); font-style:normal; font-weight:700; }
#cr-pb .pbtoday .go{ margin-left:auto; flex:none; color:var(--pb-dim,#848c94); font:700 15px var(--pb-mono,ui-monospace,Menlo,monospace); }
@media (max-width:1099px){ #cr-pb .pbhome > .pbsub{ display:none; } }
@media (min-width:1100px){ #cr-pb .pbtoday{ display:none; } }
/* MINOR 11 — "Ordered — Undo". The app's one undo toast (CardinalUndo), sized
   for a thumb: its button is 44px here, its ink #ff8a90 7.70:1 on the toast's
   #1a1a1a (the shared red measures 3.07:1 there), and on the installed phone
   it rides above the tab bar instead of on it. Tagged .pbundo by the board,
   so the other undo site is untouched. */
.cr-undo-toast.pbundo{ --cr-stack:"1416: Production's undo only; the shared toast stays for its other caller"; width:max-content; max-width:calc(100vw - 32px); }   /* left:50% alone shrink-wrapped it to half the screen */
.cr-undo-toast.pbundo .btn{ --cr-stack:"1416: Production's undo only"; min-height:44px; min-width:64px; color:#ff8a90; border-color:#e35c63; }
body.standalone .cr-undo-toast.pbundo{ --cr-stack:"1416: clears the installed tab bar"; bottom:calc(76px + env(safe-area-inset-bottom,0px)); }
'''
src = bappend(src, ST, PBS, PBS_ADD)

# ═══════════════════════════════════════════════════════════════════════
# 2. cr-pb-script
# ═══════════════════════════════════════════════════════════════════════
PB = 'cr-pb-script'

# MINOR 9 — punch rows lead with the task; the job and the person go underneath.
src = bsub(src, SC, PB,
    "      title: (pr && pr.name ? pr.name + ' — ' : '') + (i.title || 'Punch-out'),\n"
    "      sub  : (i.status === 'done' ? 'closed by ' + shortName(i.done_by) : shortName(i.assigned_to)),",
    "      /* 1416 (judge 14 minor 9): the TASK first. \"Sample Insurance Job — Tarp over rear\n"
    "         slope\" ellipsised before it reached the work; the job rides on the second line. */\n"
    "      title: i.title || 'Punch-out',\n"
    "      sub  : (pr && pr.name ? pr.name + ' \\u00b7 ' : '') +\n"
    "             (i.status === 'done' ? 'closed by ' + shortName(i.done_by) : shortName(i.assigned_to)),")

# MINOR 9 — the today row, and the home pane's own class (MAJOR 1)
src = bsub(src, SC, PB,
    "function homeHtml(){\n",
    r"""/* 1416 (judge 14 minor 9): what today holds, in one row under the title — the
   agenda itself is ~760px down a phone, under the month (853's order stands).
   Counts come from eventsFor(), the agenda's own list, so the two can never
   disagree; the tap opens the 1090 day sheet for today. */
function todayHtml(){
  var evs = eventsFor(today()), n = { build:0, drop:0, punch:0, done:0 }, urg = 0, bits = [];
  evs.forEach(function(e){ n[e.cls] = (n[e.cls] || 0) + 1; if(e.tag === 'URGENT') urg++; });
  if(n.build) bits.push(n.build + ' build' + (n.build === 1 ? '' : 's'));
  if(n.drop)  bits.push(n.drop + ' drop' + (n.drop === 1 ? '' : 's'));
  if(n.punch) bits.push(n.punch + ' punch-out' + (n.punch === 1 ? '' : 's'));
  if(n.done)  bits.push(n.done + ' closed');
  /* no aria-label: the visible words ARE the name (axe label-content-name-mismatch) */
  return '<button class="pbtoday" data-today="1" type="button">' +
    '<span class="k">Today</span>' +
    '<span class="t">' + (bits.length ? esc(bits.join(' · ')) : 'Nothing booked') +
      (urg ? ' · <em>' + urg + ' urgent</em>' : '') + '</span>' +
    '<span class="go">›</span></button>';
}
function homeHtml(){
""")
src = bsub(src, SC, PB,
    "  return '<div class=\"pbwrap\">' +\n"
    "    head('Pro<span>duction</span>', 'home') +\n"
    "    '<div class=\"pbsub\">Schedule · Jobs · Punch</div>' +\n"
    "    homeMonthHtml() +",
    "  return '<div class=\"pbwrap pbhome\">' +   /* 1416: the dashboard grid names this pane only */\n"
    "    head('Production', 'home') +             /* 1416: one heading, one colour */\n"
    "    '<div class=\"pbsub\">Schedule · Jobs · Punch</div>' +\n"
    "    todayHtml() +\n"
    "    homeMonthHtml() +")
src = bsub(src, SC, PB,
    "  return '<div class=\"pbwrap\">' +\n    head('Calendar', 'home') +",
    "  return '<div class=\"pbwrap pbcalw\">' +   /* 1416: month | day, not the home grid */\n    head('Calendar', 'home') +")

# POLISH 14 — a list pane's title had to share its row with today's date, and
# "Needs ordered" broke onto two lines beside "THURSDAY, OCT 29" on a phone.
src = bsub(src, SC, PB,
    "      : '<div class=\"pbmon\">' + esc(pbFull(today())) + '</div>') +",
    "      : pane === 'list' ? ''   /* 1416: a list's title gets the whole row */\n"
    "      : '<div class=\"pbmon\">' + esc(pbFull(today())) + '</div>') +")

# POLISH 14 — the list pane said its title twice ("Needs ordered / NEEDS ORDERED")
src = bsub(src, SC, PB,
    "function listPaneHtml(){\n",
    r"""/* 1416 (judge 14 polish 14): the list's subtitle repeated its title. It says
   what is in the list now, from the same boxes() the tiles count. */
function listSub(k, b){
  function pbPlural(x, one, many){ return x + ' ' + (x === 1 ? one : many); }
  if(k === 'needs')   return pbPlural(b.needs.length, 'job', 'jobs') + ' waiting on materials';
  if(k === 'ordered') return pbPlural(b.ordered.length, 'job', 'jobs') + ' with materials on the way';
  if(k === 'sched')   return pbPlural(b.sched.length, 'job', 'jobs') + ' with a build day';
  if(k === 'punch')   return pbPlural(b.open.length, 'open item', 'open items');
  if(k === 'closed')  return 'Closed repairs stay on the client’s history';
  return '';
}
function listPaneHtml(){
""")
src = bsub(src, SC, PB,
    "    '<div class=\"pbsub\">' + esc(BOX_TITLE[listKey] || '') + '</div>' +",
    "    '<div class=\"pbsub\">' + esc(listSub(listKey, b)) + '</div>' +")

# MINOR 9 — wire the today row (an onclick assignment, so wire() stays idempotent)
src = bsub(src, SC, PB,
    "  qAll('[data-add]').forEach(function(b){\n    b.onclick = function(){ openAdd(null); };\n  });\n",
    "  qAll('[data-add]').forEach(function(b){\n    b.onclick = function(){ openAdd(null); };\n  });\n"
    "  /* 1416: the today row opens today's sheet — exactly what tapping today's date does */\n"
    "  qAll('[data-today]').forEach(function(b){\n"
    "    b.onclick = function(){ selDay = today(); render(); openDay(selDay); };\n"
    "  });\n")

# MINOR 11 — Mark ordered offers six seconds of Undo
src = bsub(src, SC, PB,
    "  lastSig = '';                                  /* the checklist changed */\n  render();\n}\n",
    r"""  lastSig = '';                                  /* the checklist changed */
  render();
  /* 1416 (judge 14 minor 11): one tap wrote "ordered" with no confirm and no way
     back short of the client profile. The app's one undo toast (CardinalUndo, the
     pipeline's) offers it for six seconds. The rep's notice above has already
     gone and is not recalled: an undo is for a mis-tap, not a second message. */
  if(window.CardinalUndo && typeof window.CardinalUndo.enqueue === 'function'){
    try{
      window.CardinalUndo.enqueue('Ordered — ' + (pr.name || 'this job'), function(){ unmarkOrdered(pid); }, 6000);
      var _ut = document.querySelector('.cr-undo-toast');
      if(_ut) _ut.classList.add('pbundo');
    }catch(_u){}
  }
}
/* 1416: the Undo. Writes the client profile toggle's own "not ordered" ('' and
   '', 20706), so the two places that set this flag still agree on its shape. */
async function unmarkOrdered(pid){
  var pr = projectFor(pid);
  if(!pr) return;
  try{
    if(typeof window.patchProjectCk === 'function'){
      await window.patchProjectCk(pr, { materials_ordered_at:'', materials_ordered_by:'' });
    }
    if(typeof window.auditLog === 'function'){
      try{ window.auditLog('materials', 'Undid marked ordered', pid); }catch(_){}
    }
  }catch(e){ crTell('Could not undo: ' + (e.message || e)); }
  lastSig = ''; render();
}
""")

# MAJOR 3 — the phone bar's Schedule tab, for Production, opens THIS calendar
src = bsub(src, SC, PB,
    "  close     : close,\n  addFor    :",
    r"""  close     : close,
  /* 1416 (judge 14 MAJOR 3): Production's Schedule. The phone bar's Schedule tab
     opened the retail Schedule Board for Curtis — build days only (one of his
     three items today) under a "Retail" header with Contacts / Leads / Photos.
     His schedule is this calendar: builds, drops and punch-outs, landing on
     today. Opens the board if it is not up; records the pane like the chip does. */
  calendar  : function(){
    if(!el || !el.classList.contains('open')) open();
    try{ if(modal) modal.classList.remove('open'); }catch(_){}
    selDay = today(); calMonth = monthOf(selDay); pane = 'cal'; lastSig = ''; render(); scrollTop();
    if(typeof window.navSetView === 'function'){ try{ window.navSetView('production', { pane:'cal' }); }catch(_){} }
  },
  addFor    :""")

# ═══════════════════════════════════════════════════════════════════════
# 3. cr-pwatab-script — the phone tab bar
# ═══════════════════════════════════════════════════════════════════════
TB = 'cr-pwatab-script'
src = bsub(src, SC, TB,
    "      else if(k === 'sched'){ if(typeof w.openScheduleBoard === 'function') w.openScheduleBoard(); }",
    "      else if(k === 'sched'){ if(!tbProdCal(w) && typeof w.openScheduleBoard === 'function') w.openScheduleBoard(); }")
src = bsub(src, SC, TB,
    "  function tbWhich(){\n    if(tbShown('boardView')) return 'sched';",
    r"""  /* 1416 (judge 14 MAJOR 3): a production account's Schedule is Production's own
     calendar (CardinalProduction.calendar) — the retail Schedule Board showed one
     of Curtis's three items today and repainted the header Retail. Admins and reps
     keep the Schedule Board; a field user has no Schedule tab at all (1317). The
     role test is isProductionUser(), the one body.cr-prod mirrors (1042). */
  function tbProd(){
    try{ var w = /** @type {any} */ (window);
      return typeof w.isProductionUser === 'function' ? !!w.isProductionUser() : document.body.classList.contains('cr-prod'); }
    catch(_){ return false; }
  }
  function tbProdCal(w){
    var P = w.CardinalProduction;
    if(!tbProd() || !P || typeof P.calendar !== 'function') return false;
    P.calendar();
    return true;
  }
  function tbWhich(){
    if(tbProd() && document.querySelector('#cr-pb.open .pbcalw')) return 'sched';
    if(tbShown('boardView')) return 'sched';""")

# ═══════════════════════════════════════════════════════════════════════
# 4. cr-disp-script — Crew Dispatch
# ═══════════════════════════════════════════════════════════════════════
DS = 'cr-disp-script'
src = bsub(src, SC, DS,
    "  function two(n){ return (n<10?'0':'') + n; }\n",
    r"""  function two(n){ return (n<10?'0':'') + n; }
  /* 1416 (judge 14 MAJOR 2): the board is READ-ONLY for a field user. Scottie's
     database role holds SELECT only on crew_work_orders (field_role.sql), yet the
     board armed a Needs-a-crew chip for him, and the day he tapped closed Dispatch,
     reopened the Production board and opened the work-order form UNDER it —
     nothing written, nothing said. He sees every booking; booking is Curtis's. */
  function ro(){ try{ return !!(window.isFieldUser && window.isFieldUser()); }catch(_){ return false; } }
  function roTell(){
    var m = 'Booking is Curtis’s — he puts a crew on each job. This board is yours to read.';
    try{ if(typeof window.crToast === 'function') window.crToast(m); else if(typeof window.crTell === 'function') window.crTell(m, 'ok'); }catch(_){}
  }
""")
src = bsub(src, SC, DS,
    "    var grip = statusPip(w) === 'done' ? '' :",
    "    var grip = (statusPip(w) === 'done' || ro()) ? '' :   /* 1416: a field user moves nothing */")
src = bsub(src, SC, DS,
    "          return '<div class=\"uch' + (String(p.id) === String(armed) ? ' armed' : '') + '\" data-pid=",
    "          return '<div class=\"uch' + (String(p.id) === String(armed) ? ' armed' : '') + (ro() ? ' ro' : '') + '\" data-pid=")
src = bsub(src, SC, DS,
    "        : 'tap to assign') + '</div></div><div class=\"runrow\">'",
    "        : ro() ? 'Booking is Curtis\\u2019s \\u2014 he puts a crew on each of these'\n"
    "        : 'tap to assign') + '</div></div><div class=\"runrow\">'")
# MINOR 10 — the dog tag said FREE while the footer says an empty cell is not free
src = bsub(src, SC, DS,
    "          : '<div class=\"cf\">free ' + (dayStr[free] === todayStr ? 'today'",
    "          : '<div class=\"cf\">None booked ' + (dayStr[free] === todayStr ? 'today'   /* 1416: bookings, not availability */")
src = bsub(src, SC, DS, "'free next 7 days'", "'none booked next 7 days'")
src = bsub(src, SC, DS,
    "'Tap a job to open its client. Tap a <b>Needs-a-crew</b> job, then a day on a crew\\u2019s row, to book that crew \\u2014 the work order opens with both filled in. No dollar figures appear on this board.</p>';",
    "(ro() ? 'This board is read-only for you \\u2014 <b>booking a crew is Curtis\\u2019s</b>. A job\\u2019s address, phone and directions are on its punch card. No dollar figures appear on this board.</p>'\n"
    "        : 'Tap a job to open its client. Tap a <b>Needs-a-crew</b> job, then a day on a crew\\u2019s row, to book that crew \\u2014 the work order opens with both filled in. No dollar figures appear on this board.</p>');")
# MINOR 10 — all seven days named on a phone; a tap pans the board to one
src = bsub(src, SC, DS,
    "    wrap.querySelector('.dspbody').innerHTML =\n      '<div class=\"dspframe\">",
    "    wrap.querySelector('.dspbody').innerHTML = dayStripHtml(days, dayStr, todayStr, sunSet) +\n      '<div class=\"dspframe\">")
src = bsub(src, SC, DS,
    "  function buildShell(){\n",
    r"""  /* 1416 (judge 14 minor 10): a phone shows ~2½ of the seven days. Theo's
     "phone was fine non compressed" (948) stands — the magnets keep their size
     and the board still pans — so this strip names all seven with what is booked
     on each, and a tap pans the board to that day. Hidden where all seven fit. */
  function dayStripHtml(days, dayStr, todayStr, sunSet){
    var D = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    return '<div class="dspdays" role="group" aria-label="Jump to a day">' + days.map(function(d, i){
      var s = dayStr[i], n = 0;
      wos.forEach(function(w){
        if(w.scheduled_on !== s) return;
        var c = crewById(w.crew_id);
        if(filter !== 'All' && (!c || (c.trade || 'General') !== filter)) return;
        n++;
      });
      var lab = n ? n + (n === 1 ? ' job' : ' jobs') : 'none';
      return '<button class="dd' + (s === todayStr ? ' today' : (sunSet[i] ? ' sun' : '')) + (n ? ' has' : '') +
        '" data-dday="' + i + '" type="button">' +   /* the visible day and count are its name */
        '<span class="w">' + D[d.getDay()] + '</span><b>' + d.getDate() + '</b><i>' + lab + '</i></button>';
    }).join('') + '</div>';
  }
  function dayJump(i){
    var sc = el.querySelector('.dspscroll'), hd = el.querySelectorAll('.dcol .c')[i + 1], rail = el.querySelector('.dcol .c.rail');
    if(!sc || !hd) return;
    var off = hd.getBoundingClientRect().left - sc.getBoundingClientRect().left - (rail ? rail.getBoundingClientRect().width : 0);
    try{ sc.scrollTo({ left: Math.max(0, sc.scrollLeft + off), behavior:'smooth' }); }catch(_){ sc.scrollLeft += off; }
  }
  /* 1416 (judge 14 MAJOR 3): Back from Dispatch returns a production account to
     the Production board it came from. close() ends in showHome(), which for
     Curtis is the RETAIL home — stage counts and the receivables figure, the
     1038 exit-room rule. A field user's showHome() already lands on the board
     (1317); admins and reps keep close() exactly. */
  function dspBack(){
    var prod = false;
    try{ prod = typeof window.isProductionUser === 'function' ? !!window.isProductionUser() : document.body.classList.contains('cr-prod'); }catch(_){}
    if(prod && window.CardinalProduction && typeof window.CardinalProduction.open === 'function'){
      if(el) el.classList.remove('open');
      armed = null; armedMove = null;
      window.CardinalProduction.open();
      return;
    }
    close();
  }
  function buildShell(){
""")
src = bsub(src, SC, DS,
    "    el.querySelector('.dspback').addEventListener('click', close);",
    "    el.querySelector('.dspback').addEventListener('click', dspBack);   /* 1416 */")
src = bsub(src, SC, DS,
    "      var idle = e.target.closest('.idle[data-idle]');",
    "      var ddy = (/** @type {Element} */ (e.target)).closest('[data-dday]');   /* 1416: the day strip */\n"
    "      if(ddy){ dayJump(+ddy.getAttribute('data-dday')); return; }\n"
    "      var idle = e.target.closest('.idle[data-idle]');")
src = bsub(src, SC, DS,
    "      if(uch){\n        var upid = uch.getAttribute('data-pid');",
    "      if(uch){\n        if(ro()){ roTell(); return; }   /* 1416: nothing arms for a field user */\n"
    "        var upid = uch.getAttribute('data-pid');")
src = bsub(src, SC, DS,
    "      if(dop){ close(); if(typeof window.openProject === 'function')",
    "      if(dop){ if(!ro()) close(); if(typeof window.openProject === 'function')")
src = bsub(src, SC, DS,
    "      if(dnd){ var npid = dnd.getAttribute('data-dneed'),",
    "      if(dnd && ro()){ roTell(); return; }   /* 1416 */\n"
    "      if(dnd){ var npid = dnd.getAttribute('data-dneed'),")
src = bsub(src, SC, DS,
    "      if(pel && typeof window.openProject === 'function'){ close(); window.openProject(pel.getAttribute('data-pid')); }",
    "      /* 1416: a field user's openProject refuses and says why (1317) — closing first stranded him (the 1400 rule) */\n"
    "      if(pel && typeof window.openProject === 'function'){ if(!ro()) close(); window.openProject(pel.getAttribute('data-pid')); }")

DSS_ADD = r'''
/* ── 1416 · judge 14 (Dispatch) ─────────────────────────────────────────
   MINOR 10 — the day strip. Seven buttons, 48px, on the board's own tokens
   (ink 18+:1, dim 6.70:1 on --disp-card dark; 15+ / 5.9:1 light). Hidden at
   >=1100px, where all seven columns already fit. */
#cr-disp .dspdays{ display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:4px; margin:0 0 10px; }
#cr-disp .dspdays .dd{ min-height:48px; padding:4px 0; border-radius:9px; cursor:pointer; min-width:0;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px;
  background:var(--disp-card,#171a1f); border:1px solid var(--disp-line,#282c34); color:var(--disp-ink,#ffffff);
  font:700 11px var(--disp-mono,monospace); letter-spacing:.04em; }
#cr-disp .dspdays .dd b{ font:800 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif; line-height:1.1; }
#cr-disp .dspdays .dd i{ font-style:normal; font-weight:600; color:var(--disp-dim,#9aa1ac); white-space:nowrap; }
#cr-disp .dspdays .dd.has i{ color:var(--disp-ink,#ffffff); }
#cr-disp .dspdays .dd.today{ border-color:var(--disp-ink,#ffffff); }
@media (min-width:1100px){ #cr-disp .dspdays{ display:none; } }
/* The strip PANS the board, so what names a row has to hold still while the
   days slide under it — the crew tags have done this since 990; the Needs-a-crew
   tray, the trade strips and a folded trade's summary now do too. 46px is the
   frame's own inset (14 + 1 + 8 a side); 50 leaves the rows' 2px margins. */
@media (max-width:1099px){
  #cr-disp .drail, #cr-disp .dband, #cr-disp .dsum{ position:sticky; left:0; max-width:calc(100vw - 50px); }
}
/* MAJOR 2 — a field user's tray chips are information, not controls */
#cr-disp .uch.ro{ --cr-stack:"1416: field user only"; cursor:default; }
'''
src = bappend(src, ST, 'cr-disp-styles', DSS_ADD)

# ═══════════════════════════════════════════════════════════════════════
# 5. cr-crew-script + styles — Crews in Production's context (MAJOR 3)
# ═══════════════════════════════════════════════════════════════════════
src = bsub(src, SC, 'cr-crew-script',
    "  /* This module took no scroll lock, so it releases none — the one global lock\n"
    "     has 13 writers already and does not need a 14th. */\n"
    "  try{ if(typeof window.showHome === 'function') window.showHome(); }catch(_){}\n}",
    "  /* This module took no scroll lock, so it releases none — the one global lock\n"
    "     has 13 writers already and does not need a 14th. */\n"
    "  /* 1416 (judge 14 MAJOR 3): a production account came here from the Production\n"
    "     board and goes back to it — showHome() is the RETAIL home for Curtis (the 1038\n"
    "     exit-room rule). Admins keep showHome() exactly. */\n"
    "  try{\n"
    "    var _prd = typeof window.isProductionUser === 'function' ? !!window.isProductionUser() : document.body.classList.contains('cr-prod');\n"
    "    if(_prd && window.CardinalProduction && typeof window.CardinalProduction.open === 'function'){ window.CardinalProduction.open(); return; }\n"
    "  }catch(_p){}\n"
    "  try{ if(typeof window.showHome === 'function') window.showHome(); }catch(_){}\n}")
CRS_ADD = r'''
/* 1416 (judge 14 MAJOR 3): Crews opened from the Production board kept the
   retail chrome — a "Retail" header and the Contacts / Leads / Photos row —
   over a screen that belongs to no CRM. For production accounts it joins the
   full-screen family the Punch page joined at 1042 (body.cr-prod #punchView):
   over the chrome, its own scroll, below the board (9500) and the punch card
   (9550). The shared header rule pins #crewsView under the header with
   top/z-index !important (cr-hd2's "#cardinalTruthView, …, #crewsView") and the
   left nav offsets it !important (74961) — hence !important here. The safe-area
   and tab-bar clearances are #punchView's own. Admins keep Crews as it was. */
html body.cr-prod #crewsView{ --cr-stack:"1416 production: Crews over the retail chrome, as #punchView (1042)";
  top:0 !important; left:0 !important; z-index:9400 !important; overscroll-behavior:contain;
  padding-top:env(safe-area-inset-top,0px); padding-bottom:calc(96px + env(safe-area-inset-bottom,0px)); }
'''
src = bappend(src, ST, 'cr-crew-styles', CRS_ADD)

# ═══════════════════════════════════════════════════════════════════════
# 6. cr-pk-script + styles — the punch card
# ═══════════════════════════════════════════════════════════════════════
PK = 'cr-pk-script'
src = bsub(src, SC, PK,
    "var lastSig = '', busy = false, outMsg = '';\n",
    "var lastSig = '', busy = false, outMsg = '';\n"
    "var noteFor = -1, noteDraft = '';   /* 1416: the step whose note field is open, and what is typed in it */\n")
src = bsub(src, SC, PK,
    "  dispOpen = false; menuOpen = false;\n  outMsg = '';\n",
    "  dispOpen = false; menuOpen = false;\n  outMsg = '';\n  noteFor = -1; noteDraft = '';   /* 1416 */\n")

# MINOR 7 — a field user's Open job only ever toasted; it is not drawn for him
src = bsub(src, SC, PK,
    "      (pr ? '<button class=\"pkbtn\" data-act=\"job\" type=\"button\">Open job</button>' : '') +",
    "      /* 1416 (judge 14 minor 7): not drawn for a field user — openProject refuses him\n"
    "         (1317) and the button only ever toasted. His job details are this card. */\n"
    "      (pr && !(window.isFieldUser && window.isFieldUser()) ? '<button class=\"pkbtn\" data-act=\"job\" type=\"button\">Open job</button>' : '') +")

# MINOR 8 — the note gate is a field in the card, not window.prompt()
src = bsub(src, SC, PK,
    "      (mgr ? '<button class=\"pkbtn\" data-delstep=\"' + i + '\" type=\"button\" aria-label=\"Remove step\">×</button>' : '') +\n"
    "      '</div>';\n  }).join('');\n  var pick = '';",
    "      (mgr ? '<button class=\"pkbtn\" data-delstep=\"' + i + '\" type=\"button\" aria-label=\"Remove step\">×</button>' : '') +\n"
    "      '</div>' + (noteFor === i && !s.d ? stepNoteHtml(i, s) : '');\n  }).join('');\n  var pick = '';")
src = bsub(src, SC, PK,
    "async function tickStep(i){\n"
    "  var st = steps().slice();\n"
    "  var s = st[i];\n"
    "  if(!s) return;\n"
    "  if(!s.d && s.req && !String(s.note || '').trim()){\n"
    "    /* The note gate: \"found more damage\" gets written down at the moment, not\n"
    "       remembered at the truck. */\n"
    "    var note = prompt('This step needs a note before it can be ticked:\\n\\n' + s.t);\n"
    "    if(note === null) return;\n"
    "    if(!String(note).trim()){ crTell('A note is required to tick this step.'); return; }\n"
    "    s = Object.assign({}, s, { note: String(note).trim() });\n"
    "  }\n",
    r"""/* 1416 (judge 14 minor 8): the note field, under its own step. */
function stepNoteHtml(i, s){
  return '<div class="pkstepnote" data-stepnote="' + i + '">' +
    '<label for="pkStepNote">This step needs a note before it can be ticked</label>' +
    '<textarea id="pkStepNote" data-f="stepnote" rows="3" placeholder="What did you find? e.g. soft decking about a foot in at the gable end">' +
      esc(noteDraft) + '</textarea>' +
    '<div class="pkbtns">' +
      '<button class="pkbtn hot" data-notesave="' + i + '" type="button">Save note &amp; tick</button>' +
      '<button class="pkbtn" data-act="notex" type="button">Cancel</button>' +
    '</div></div>';
}
function focusStepNote(){
  setTimeout(function(){
    var t = el && el.querySelector('[data-f="stepnote"]');
    if(!t) return;
    try{ t.focus(); t.scrollIntoView({ block:'center' }); }catch(_){}
  }, 60);
}
async function tickStep(i, noteText){
  var st = steps().slice();
  var s = st[i];
  if(!s) return;
  if(!s.d && s.req && !String(s.note || '').trim()){
    /* The note gate: "found more damage" gets written down at the moment, not
       remembered at the truck.
       1416 (judge 14 minor 8): written IN the card, under its step — not in a
       window.prompt(), which a phone draws as a system dialog over the job and
       which one stray tap dismisses. The box opens the field; its Save writes
       the note and ticks the step in one save. The gate itself is unchanged:
       an empty note still ticks nothing. */
    if(noteText == null){
      if(noteFor !== i){ noteFor = i; noteDraft = ''; lastSig = ''; render(); }
      focusStepNote();
      return;
    }
    if(!String(noteText).trim()){ crTell('A note is required to tick this step.'); focusStepNote(); return; }
    s = Object.assign({}, s, { note: String(noteText).trim() });
    noteFor = -1; noteDraft = '';
  }
""")
src = bsub(src, SC, PK,
    "  q('[data-delstep]', function(b){ b.onclick = function(){ delStep(Number(b.getAttribute('data-delstep'))); }; });\n",
    "  q('[data-delstep]', function(b){ b.onclick = function(){ delStep(Number(b.getAttribute('data-delstep'))); }; });\n"
    "  /* 1416: the step note field — the draft survives a repaint, Save ticks, Cancel closes */\n"
    "  q('[data-f=\"stepnote\"]', function(t){ t.addEventListener('input', function(){ noteDraft = t.value; }); });\n"
    "  q('[data-notesave]', function(b){ b.onclick = function(){\n"
    "    var t = el.querySelector('[data-f=\"stepnote\"]');\n"
    "    tickStep(Number(b.getAttribute('data-notesave')), t ? t.value : '');\n"
    "  }; });\n"
    "  q('[data-act=\"notex\"]', function(b){ b.onclick = function(){ noteFor = -1; noteDraft = ''; lastSig = ''; render(); }; });\n")

# MINOR 4 — an untagged message says it notified nobody, and how to reach someone
src = bsub(src, SC, PK,
    "  /* Theo's rule, unchanged: only the people a comment TAGS are notified. */\n"
    "  if(names.length && typeof window.notifyTeam === 'function'){\n"
    "    var to = [];",
    "  /* Theo's rule, unchanged: only the people a comment TAGS are notified. */\n"
    "  var told = false;   /* 1416 */\n"
    "  if(names.length && typeof window.notifyTeam === 'function'){\n"
    "    var to = [];")
src = bsub(src, SC, PK,
    "      outMsg = outcomeText(res, to);\n      lastSig = ''; render();\n    }\n  }\n}\n",
    "      outMsg = outcomeText(res, to);\n      told = true;\n      lastSig = ''; render();\n    }\n  }\n"
    "  /* 1416 (judge 14 minor 4): a message with no @tag reached nobody — the rule above,\n"
    "     correctly — and said nothing, so it read as sent to the crew. Words only: who\n"
    "     is notified does not change. */\n"
    "  if(!told){\n"
    "    outMsg = 'Saved on the job \\u2014 nobody was notified. ' +\n"
    "      (me === 'curtis@cardinalrenovations.net' ? 'Tag someone with @ to buzz them.' : 'Tag @Curtis to buzz him.');\n"
    "    lastSig = ''; render();\n"
    "  }\n}\n")

PKS = 'cr-pk-styles'
# POLISH 12 — + Add step / + Add item lost the button's default outset border
src = bsub(src, ST, PKS,
    "#cr-pk .pkadd{\n"
    "  display:flex; gap:8px; align-items:center; width:100%; cursor:pointer; margin-top:4px;\n"
    "  border-top:1px dashed var(--pk-line,rgba(230,235,240,.11)); background:transparent;\n"
    "  padding:11px 0 2px; color:var(--pk-dim,#848c94); min-height:40px;",
    "#cr-pk .pkadd{\n"
    "  /* 1416 (judge 14 polish 12): border-top alone left the button's default 2px\n"
    "     outset border on the other three sides, and 0 side padding */\n"
    "  display:flex; gap:8px; align-items:center; width:100%; cursor:pointer; margin-top:4px;\n"
    "  border:0; border-top:1px dashed var(--pk-line,rgba(230,235,240,.11)); background:transparent;\n"
    "  padding:11px 14px; color:var(--pk-dim,#848c94); min-height:40px;")
PKS_ADD = r'''
/* ── 1416 · judge 14 (the punch card) ───────────────────────────────────
   MINOR 8 — the step × (and the truck list's) measured 32px wide. 44 square. */
#cr-pk .pkck .pkbtn[data-delstep],
#cr-pk .pkck .pkbtn[data-deltruck]{ --cr-stack:"1416: the two row-delete crosses; .pkbtn stays for every other card button"; min-width:44px; min-height:44px; padding:0; justify-content:center; font-size:18px; }
/* MINOR 8 — the step note field, on the card's own tokens (ink 15.44:1 on
   --pk-c2 dark, 17+:1 light; the hot rule is the step's own "note required" ink). */
#cr-pk .pkstepnote{ margin:0 0 10px; padding:10px 11px; border-radius:10px;
  background:var(--pk-c2,#1b1e22); border:1px solid var(--pk-hot,#e07a5f); }
#cr-pk .pkstepnote label{ display:block; margin:0 0 6px; font:600 13px -apple-system,'Segoe UI',Roboto,sans-serif;
  color:var(--pk-ink,#eceef0); }
#cr-pk .pkstepnote textarea{ display:block; width:100%; min-height:72px; padding:9px 10px;
  font:400 15px/1.4 -apple-system,'Segoe UI',Roboto,sans-serif; color:var(--pk-ink,#eceef0); resize:vertical;
  background:var(--pk-g,#0c0d0f); border:1px solid var(--pk-line,rgba(230,235,240,.11)); border-radius:8px; }
:root[data-theme="rb-light"] #cr-pk .pkstepnote textarea{ background:var(--pk-c,#ffffff); }
#cr-pk .pkstepnote .pkbtns{ margin-top:8px; }
'''
src = bappend(src, ST, PKS, PKS_ADD)

# ═══════════════════════════════════════════════════════════════════════
# 7. Punch & Repairs page (cr-punch-styles + its markup)
# ═══════════════════════════════════════════════════════════════════════
PUS = 'cr-punch-styles'
# POLISH 14 — sans, like every other production heading
src = bsub(src, ST, PUS,
    ".pu-title{margin:0;flex:1;font:800 22px Georgia,'Times New Roman',serif;",
    ".pu-title{margin:0;flex:1;font:800 22px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;/* 1416: was Georgia */")
# MINOR 5 — the WHEN cell wraps inside its 168px column instead of printing over CREW
src = bsub(src, ST, PUS,
    "  .pl-wh{flex-direction:column;align-items:flex-start;gap:0;}",
    "  .pl-wh{flex-direction:column;align-items:stretch;gap:0;white-space:normal;}/* 1416 (judge 14 minor 5): \"On site since 6:00 AM · 1h 00m so far\" ran 52px over the CREW avatar at 1280-1536 — it wraps in its own column now */")
# MINOR 5 — and it wraps between its two facts, never inside "1h 00m"
src = bsub(src, SC, 'cr-punch-script',
    "'</b><small>' + esc([w.sub, plOnSite(it)].filter(Boolean).join(' \\u00b7 ')) + '</small></span>' +",
    "'</b><small>' + [w.sub, plOnSite(it)].filter(Boolean).map(function(x){ return '<span class=\"pl-nw\">' + esc(x) + '</span>'; }).join(' \\u00b7 ') + '</small></span>' +   /* 1416: wraps at the dot */")
src = bsub(src, ST, PUS,
    ".pl-wh.warn small{color:var(--pl-late,#f08a90);}",
    ".pl-wh.warn small{color:var(--pl-late,#f08a90);}\n.pl-wh .pl-nw{white-space:nowrap;}/* 1416: \"On site since 6:52 AM\" and \"1h 00m so far\" each stay whole */")
# POLISH 14 — no emoji in the heading (the 759 convention: drawn icons or none)
src = pl.sub(src,
    '<h2 class="pu-title">&#128296; Punch &amp; Repairs</h2>',
    '<h2 class="pu-title">Punch &amp; Repairs</h2>')

# ═══════════════════════════════════════════════════════════════════════
# 8. the main block — the work order document and the editor chip
# ═══════════════════════════════════════════════════════════════════════
# POLISH 13 — the stored work order's <title> said "— Estimate"
src = pl.sub(src,
    "    var title = 'Work Order — ' + crew.trade + ' — ' + (crew.name || 'Crew');\n"
    "    var id = await db.create(title, tpl, pr.name, pr.id);",
    "    var title = 'Work Order — ' + crew.trade + ' — ' + (crew.name || 'Crew');\n"
    "    /* 1416 (judge 14 polish 13): the document is built in buildEstimate()'s shell,\n"
    "       so its <title> — a browser tab, a print header, a shared link — still said\n"
    "       \"— Estimate\". It carries the row's own title now. */\n"
    "    tpl = tpl.replace(/<title>[^<]*<\\/title>/, '<title>' + woEsc(title) + '</title>');\n"
    "    var id = await db.create(title, tpl, pr.name, pr.id);")
# POLISH 13 — the editor chip called Curtis REP
src = pl.sub(src,
    "      if(em){ rc.innerHTML = 'REP \\u00b7 <b>' + esc(rptRepName(em).split(' ')[0]) + '</b>'; rc.style.display = 'inline-flex'; }",
    "      /* 1416 (judge 14 polish 13): Curtis is Production, not a sales rep — the chip\n"
    "         on his work orders said REP. Production accounts read PRODUCTION. */\n"
    "      var _rl1416 = (typeof isProductionUser === 'function' && isProductionUser()) ? 'PRODUCTION' : 'REP';\n"
    "      if(em){ rc.innerHTML = _rl1416 + ' \\u00b7 <b>' + esc(rptRepName(em).split(' ')[0]) + '</b>'; rc.style.display = 'inline-flex'; }")

# ─── self-checks on the result ──────────────────────────────────────────
for must in ['pbwrap pbhome', 'pbwrap pbcalw', 'class="pbtoday"', 'calendar  : function()',
             'function tbProdCal', 'function dayStripHtml', 'function stepNoteHtml',
             'html body.cr-prod #crewsView', 'None booked ', 'nobody was notified']:
    if must not in src:
        raise pl.PatchError('self-check: %r missing' % must)
for gone in ['Pro<span>duction</span>', "#cr-pb h1 span{", '&#128296; Punch &amp; Repairs',
             "var note = prompt('This step needs a note", "font:700 26px Georgia,'Times New Roman',serif; letter-spacing:.2px"]:
    if gone in src:
        raise pl.PatchError('self-check: %r survived' % gone)
# the build stamp and the CHANGELOG are not this patch's to touch
stamp = re.compile(r'v2026-\d\d-\d\d build \d+')
if stamp.findall(src) != stamp.findall(orig):
    raise pl.PatchError('self-check: a build stamp moved')
a0, b0 = block(orig, SC, 'cr-cl-script')
a1, b1 = block(src, SC, 'cr-cl-script')
if orig[a0:b0] != src[a1:b1]:
    raise pl.PatchError('self-check: the CHANGELOG block changed')

pl.write_atomic(OUT_PATH, src)
pl.assert_in(OUT_PATH, 'class="pbtoday"')
print('patch_1416_production: ok — %d -> %d chars, wrote %s' % (len(orig), len(src), OUT_PATH))
