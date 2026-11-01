"""patch_1435_reports_forms.py — build 1435: Theo's taste calls T1 C and T3 B (1 Nov 2026, "T1 C · ... · T3 B").

    python3 patch_1435_reports_forms.py <in.html> <out.html>

Byte-reproducible: every edit is an exact-match splice with an asserted occurrence count, applied in
order; a failed assert aborts before anything is written. No stamp bump and no new CHANGELOG entry (the
lead does both). The one CHANGELOG edit is the correction of 1415's wording Theo asked for.

ITEM 1 · T1 C — Graphs & Reports
  1a  the Reports cards follow the theme: every #reportsView card/ink rule reads var(--rpt-x, <its dark
      value>) and ONE light block on #reportsView defines the --rpt-* tokens with 557's twin (the recipe
      .actbox and .pcard already ship). Dark resolves to exactly what shipped.
  1b  the 2px #ff2740 left edge (546 "1 Hairline") is deleted in both themes, so the left side takes the
      card's own 1px hairline; the two other decorative reds on Reports go the same way (the 2px red rule
      under the Reps/Production table headers and above the reviews "Whole team" row).
  1c  rptChart()'s ink is read from the stylesheet (--rpt-chart-ink / --rpt-chart-grid, light only) and a
      theme flip re-inks the charts already drawn (no chart rebuilt, one update('none') each). The theme
      module announces a flip with a document CustomEvent 'cr-theme' (the file's 'cr-*' convention),
      fired on the edge only.
  1d  measured defects on Reports fixed while there: the dark filter placeholders (3.95:1), the review
      counts' #a86a00 (3.08:1 on the card), the profit/loss and empty-state inline inks.
  1e  the 1415 CHANGELOG line is corrected: only the Reports STAT TILES lost their red cap at 1415.

ITEM 3 · T3 B — the eight .projform sheets go dark in DARK mode
  3a  ONE dark-only token block on .projform (--sheet-*, from the app's --rbe-* dark panel family), plus
      the sheet's ink, color-scheme, its heading, and the fields' ground/ink/placeholder (those were the
      browser's own Field/FieldText — no rule existed to edit).
  3b  every rule that colours a sheet is edited in place to read var(--sheet-x, <its light value>), so
      light (and everything outside a sheet) falls back to exactly what shipped.
  3c  the 1299 '.projform .chipbtn' dark rules (paper ink on a white sheet in dark) are deleted: the
      sheet is dark now, so the app's own dark outline chip applies.
  3d  inline literals inside the sheets (markup and the JS that writes them) read the same tokens.
"""
import sys, re
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

IN, OUT = sys.argv[1], sys.argv[2]
s = pl.load(IN)
ORIG = s


def one(s, a, b, n=1):
    c = s.count(a)
    assert c == n, (c, n, a[:120])
    return s.replace(a, b)


def in_slice(s, start, end, a, b, n=1):
    """replace inside s[start_anchor : end_anchor] only (both anchors unique); the scoped-assertion rule"""
    i = s.index(start); assert s.count(start) == 1, start[:80]
    j = s.index(end, i); assert s.count(end) == 1, end[:80]
    blk = s[i:j]
    assert blk.count(a) == n, (blk.count(a), n, a[:100])
    return s[:i] + blk.replace(a, b) + s[j:]


# ═══════════════════════════════ ITEM 1 · T1 C — REPORTS ═══════════════════════════════

# 1a/1b — section 6 of cr-nvl-styles: the pipe cards
s = one(s, """/* ══ 6 · REPORTS — obsidian pipe cards, hairline neon red ══════════════════
   #reportsView ONLY. The 8 .pipecards in #mainView keep 535's navy — "leave the
   home screen alone".

   Theo picked option 1 of two red treatments: "1 Hairline" — a 2px neon edge
   with NO glow. The glow version read as a highlighter laid on a black card.  */
#reportsView .pipecard{
  background:var(--obs-face);
  border:1px solid var(--obs-bd,#24242c);
  border-top:1px solid #34353f;
  border-bottom:1px solid #050507;
  border-left:2px solid #ff2740;
  box-shadow:var(--obs-lift);
  color:var(--obs-ink,#e6e8ec);
}
@media (hover:hover){ #reportsView .pipecard:hover{box-shadow:var(--obs-hover);} }
#reportsView .pipetitle{color:#ffffff;}
#reportsView .pipecard .subnote,
#reportsView .pipecard small{color:var(--obs-mute,#9aa0a8);}
""", """/* ══ 6 · REPORTS — the obsidian pipe cards, and their light twin ═════════════
   #reportsView ONLY. The 8 .pipecards in #mainView keep 535's navy — "leave the
   home screen alone".

   T1 C (1 Nov 2026, Theo: "T1 C") reverses two of 546's calls; the new answer
   is the settled one.
   · THE PANELS FOLLOW THE THEME. "Obsidian is black in both modes" is retired
     for Reports. Dark is 545's obsidian, untouched. Light is 557's twin — the
     one .actbox and .pcard already ship: a white-to-#eceef2 radial, a #e2e2e2
     hairline, and a real drop shadow doing the lift. Every rule below reads
     var(--rpt-x, <its dark value>) and the --rpt-* tokens are declared ONCE, in
     the light block at the end of this section — so dark resolves to exactly
     what shipped and there is no override layer.
   · NO RED EDGE. 546's "1 Hairline" (a 2px neon-red left border) is deleted
     in both themes: the left side now takes the card's own 1px hairline from
     the border shorthand. With the 2px red rule under the table headers and
     over the reviews total gone too, no decorative red is left on Reports —
     what 1415 started with the stat-tile caps. Red stays on the selected range
     and tab pills (buttons) and on the data itself.                         */
#reportsView .pipecard{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";
  background:var(--rpt-face,var(--obs-face));
  border:1px solid var(--rpt-bd,var(--obs-bd,#24242c));
  border-top:1px solid var(--rpt-bd,#34353f);
  border-bottom:1px solid var(--rpt-bd,#050507);
  box-shadow:var(--rpt-lift,var(--obs-lift));
  color:var(--rpt-ink,var(--obs-ink,#e6e8ec));
}
@media (hover:hover){ #reportsView .pipecard:hover{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";box-shadow:var(--rpt-hover,var(--obs-hover));} }
#reportsView .pipetitle{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rbe-head,#ffffff);}   /* T1 C: the heading pair, #ffffff / #161616 — it flips by itself */
#reportsView .pipecard .subnote,
#reportsView .pipecard small{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-mute,var(--obs-mute,#9aa0a8));}
""")

s = one(s, """#reportsView .rpttable th{color:#9aa0a8;}
#reportsView .rpttable td{color:#dfe2e8;border-bottom:1px solid #22232b;}
#reportsView .rpttable tr:nth-child(even) td{background:rgba(255,255,255,.035);}
#reportsView .rptconv{color:#b9bec7;}
""", """#reportsView .rpttable th{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-mute,#9aa0a8);border-bottom-color:var(--rpt-bd,#34353f);}   /* T1 C: the 2px header rule was var(--red) — decoration, so neutral */
#reportsView .rpttable td{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-ink,#dfe2e8);border-bottom:1px solid var(--rpt-bd,#22232b);}
#reportsView .rpttable tr:nth-child(even) td{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";background:var(--rpt-stripe,rgba(255,255,255,.035));}
#reportsView .rptconv{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-mute,#b9bec7);}
""")

# 1a — the KPI tiles, and the light token block that closes the section
s = one(s, """#reportsView .rptkpi{
  background:var(--obs-face);
  border:1px solid var(--obs-bd,#24242c);
  border-top:1px solid var(--obs-hair,#2f3038);   /* 1415: was a 5px red cap on every tile */
  border-bottom:1px solid #050507;
  box-shadow:var(--obs-lift);
}
""", """#reportsView .rptkpi{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";
  background:var(--rpt-face,var(--obs-face));
  border:1px solid var(--rpt-bd,var(--obs-bd,#24242c));
  border-top:1px solid var(--rpt-bd,var(--obs-hair,#2f3038));   /* 1415: was a 5px red cap on every tile */
  border-bottom:1px solid var(--rpt-bd,#050507);
  box-shadow:var(--rpt-lift,var(--obs-lift));
}
""")
s = one(s, """#reportsView .rptkpi span{color:#ffffff;}          /* the labels, per Theo */
#reportsView .rptkpi b{color:#b9bec7;}             /* default: grey, 7.33:1 */
#reportsView .rptkpi b.k-money{color:#4fc98a;}     /* money — 6.55:1 */
#reportsView .rptkpi b.k-new{color:#E8C21E;}       /* new / upcoming — 7.92:1 */
#reportsView .rptkpi b.k-won{color:#3d9970;}       /* approved + closed — 3.90:1 */
#reportsView .rptkpi b.k-rate{color:#b9bec7;}      /* rates + durations — 7.33:1 */
#reportsView .rptkpi small{color:var(--obs-mute,#9aa0a8);}
#reportsView .rptkpi small.up{color:#4fc98a;}
#reportsView .rptkpi small.down{color:#f0a3a9;}
</style>""", """#reportsView .rptkpi span{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rbe-head,#ffffff);}      /* the labels, per Theo */
#reportsView .rptkpi b{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-mute,#b9bec7);}         /* default: grey, 7.33:1 */
#reportsView .rptkpi b.k-money{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-money,#4fc98a);} /* money — 6.55:1 */
#reportsView .rptkpi b.k-new{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-new,#E8C21E);}     /* new / upcoming — 7.92:1 */
#reportsView .rptkpi b.k-won{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-won,#3d9970);}     /* approved + closed — 3.90:1 */
#reportsView .rptkpi b.k-rate{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-mute,#b9bec7);}   /* rates + durations — 7.33:1 */
#reportsView .rptkpi small{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-mute,var(--obs-mute,#9aa0a8));}
#reportsView .rptkpi small.up{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-money,#4fc98a);}
#reportsView .rptkpi small.down{--cr-stack:"T1 C edited in place: out-ranks the shared base, as since 546";color:var(--rpt-down,#f0a3a9);}

/* ── T1 C · the light twin, as tokens ──────────────────────────────────────
   557's recipe, value for value: the same radial inverted (sheen origin
   22% -10%), a #e2e2e2 hairline on all four sides, and a drop shadow doing the
   lift the inset highlight does in dark. The hover shadow keeps dark's ratio
   (roughly double the lift). Inks are colours the file already uses, each
   scored against #eceef2 — the twin's DARKEST stop, the worst case for dark
   ink — and, where a table row is striped, against the stripe laid over it:
   titles and labels --rbe-head #161616, grey #5f6670 (557's label grey, 4.65:1
   on a striped row), money #1f6b4a and new #8a5500 (the light twins .jdrc
   already uses: the preview's #2e7d32 and #8a6100 read 4.11 and 4.45:1 on a
   striped row of the profit and reviews tables), won #2F7D4A (the 20px tiles
   only), down #a11020. The chart ink is a token too, because a canvas cannot
   read CSS: rptChart() reads these two. */
:root[data-theme="rb-light"] #reportsView{
  --rpt-face:radial-gradient(120% 90% at 22% -10%,#ffffff 0%,#f7f7f9 45%,#eceef2 100%);
  --rpt-bd:#e2e2e2;
  --rpt-lift:0 6px 14px rgba(16,18,24,.10), 0 1px 2px rgba(16,18,24,.06), 0 1px 0 rgba(255,255,255,.9) inset;
  --rpt-hover:0 12px 26px rgba(16,18,24,.16), 0 2px 4px rgba(16,18,24,.08), 0 1px 0 rgba(255,255,255,.9) inset;
  --rpt-ink:#161616;
  --rpt-mute:#5f6670;
  --rpt-stripe:rgba(16,18,24,.035);
  --rpt-money:#1f6b4a;
  --rpt-new:#8a5500;
  --rpt-won:#2F7D4A;
  --rpt-down:#a11020;
  --rpt-chart-ink:#5f6670;
  --rpt-chart-grid:rgba(16,18,24,.10);
}
</style>""")

# 1d — the dark filter placeholders (#757575 on #15151b = 3.95:1). Light keeps the browser's grey (4.61:1).
s = one(s, """:root:not([data-theme="rb-light"]) .rptfilters select,
:root:not([data-theme="rb-light"]) .rptfilters input{background:#15151b;border-color:#2a2a32;color:#cfd6df;}
""", """:root:not([data-theme="rb-light"]) .rptfilters select,
:root:not([data-theme="rb-light"]) .rptfilters input{background:#15151b;border-color:#2a2a32;color:#cfd6df;}
:root:not([data-theme="rb-light"]) .rptfilters input::placeholder{color:#9aa0a8;}   /* T1 C: the browser's #757575 read 3.95:1 here; 6.84:1 */
""")

# 1c — rptChart(): the ink comes from the stylesheet, and a theme flip re-inks what is drawn
s = one(s, """  /* 546: the reports cards are obsidian now. Chart.js defaults its tick and
     legend ink to #666, which is 2.5:1 on that ground - and was already failing
     on 535's navy card before this build. NOT themed, deliberately: the card is
     black in both modes, so the ink has to be too. Set here rather than per
     chart because `new Chart(` appears exactly once in this file, which makes
     this reach the reports charts and nothing else. */
    Chart.defaults.color = '#b9bec7';
    Chart.defaults.borderColor = 'rgba(255,255,255,.10)';
    rptCharts[id] = new Chart(el.getContext('2d'), cfg);""", """  /* 546: Chart.js defaults its tick and legend ink to #666, which is 2.5:1 on
     the obsidian card. Set here rather than per chart because `new Chart(`
     appears exactly once in this file, which makes this reach the reports
     charts and nothing else.
     T1 C: the card follows the theme now, so the ink does too - read from the
     stylesheet by rptChartInk(), never re-decided here. */
    var _ink = rptChartInk();
    Chart.defaults.color = _ink.ink;
    Chart.defaults.borderColor = _ink.grid;
    rptCharts[id] = new Chart(el.getContext('2d'), cfg);""")
s = one(s, """function rptRepName(email){
  if(!email) return 'Unknown';""", """/* T1 C (1 Nov 2026): the chart ink is a stylesheet token, because a canvas cannot
   read CSS. --rpt-chart-ink / --rpt-chart-grid are declared ONLY by the light twin
   on #reportsView, so dark has no token and keeps 546's pinned obsidian values -
   the palette lives in one place, not in two languages. */
function rptChartInk(){
  var v = document.getElementById('reportsView');
  var cs = v ? getComputedStyle(v) : null;
  return { ink: (cs && cs.getPropertyValue('--rpt-chart-ink').trim()) || '#b9bec7',
           grid: (cs && cs.getPropertyValue('--rpt-chart-grid').trim()) || 'rgba(255,255,255,.10)' };
}
/* A theme flip RE-INKS the charts already drawn: no renderReports(), and no
   chart is built again. Chart.js caches each scale's resolved colours, so new defaults reach
   only the legend (measured in Chromium) - the ticks and grid are written per
   chart, then one update('none') repaints without animating. The flip arrives
   as 'cr-theme', which cr-rbtheme-toggle fires on the edge only. */
function rptReink(){
  if(typeof Chart === 'undefined' || !Chart.defaults) return;
  var k = rptChartInk();
  Chart.defaults.color = k.ink;
  Chart.defaults.borderColor = k.grid;
  Object.keys(rptCharts).forEach(function(id){
    var c = rptCharts[id];
    try{
      var o = c.options; o.color = k.ink;
      Object.keys(o.scales || {}).forEach(function(n){ o.scales[n].ticks.color = k.ink; o.scales[n].grid.color = k.grid; });
      c.update('none');
    }catch(e){}
  });
}
document.addEventListener('cr-theme', rptReink);
function rptRepName(email){
  if(!email) return 'Unknown';""")

# 1b/1d — the inline inks the Reps and Production tabs write
RS, RE = "function renderRptReps(projs, from, to){", "/* reports UI wiring */"
s = in_slice(s, RS, RE, """'<td style="color:#a86a00;font-weight:800;">'""",
             """'<td style="color:var(--rpt-new,#E8C21E);font-weight:800;">'""", n=2)   # 3.08:1 on the card; the k-new pair
s = in_slice(s, RS, RE, """'<tr style="border-top:2px solid #C8202E;">""",
             """'<tr style="border-top:2px solid var(--rpt-bd,#34353f);">""")          # decorative red rule -> the card's hairline
s = in_slice(s, RS, RE, """color:#8a7a72;padding:6px 0;""", """color:var(--rpt-mute,#9aa0a8);padding:6px 0;""")
s = in_slice(s, RS, RE, """color:#7a8a72;\">\\u2705 Nothing stale""", """color:var(--rpt-mute,#9aa0a8);\">\\u2705 Nothing stale""")
s = in_slice(s, RS, RE, """(pf >= 0 ? '#2e7d32' : '#C8202E')""", """(pf >= 0 ? 'var(--rpt-money,#4fc98a)' : 'var(--rpt-down,#f0a3a9)')""")

# 1c — the theme module says when the app theme MOVES
s = one(s, """function apply(){
if(isLight()) document.documentElement.setAttribute('data-theme','rb-light');
else document.documentElement.removeAttribute('data-theme');
var btn = document.getElementById('cr-dark-toggle');""", """var lastTheme = null;
function apply(){
if(isLight()) document.documentElement.setAttribute('data-theme','rb-light');
else document.documentElement.removeAttribute('data-theme');
/* T1 C (1 Nov 2026): announce a flip, for what CSS cannot reach - the Reports
   charts are canvas. Fired on the EDGE only: apply() rides the 1s sweep below,
   and an event every second would be 567/569's loop in a new coat. */
var th = document.documentElement.getAttribute('data-theme') || '';
if(lastTheme !== null && th !== lastTheme){ try{ document.dispatchEvent(new CustomEvent('cr-theme', { detail:{ theme: th || 'dark' } })); }catch(e){} }
lastTheme = th;
var btn = document.getElementById('cr-dark-toggle');""")

# 1e — the 1415 What's New line said Reports cards lost the red stripe; only the stat tiles did
s = one(s, "s:'Home and Reports cards lose the red stripe \\u2014 red is kept for buttons, today and money owed.",
           "s:'Home cards and the stat tiles on Reports lose the red stripe \\u2014 red is kept for buttons, today and money owed.")


# ═══════════════════════════════ ITEM 3 · T3 B — THE FORM SHEETS ═══════════════════════════════

# 3a/3b — .projform itself, its labels, selects and inputs; then the dark token block beside them
s = one(s, """.projform{max-width:430px;margin:9vh auto 0;background:#fff;border-radius:12px;padding:22px 24px;
  box-shadow:0 12px 40px rgba(0,0,0,.35);}
.projform label{display:block;font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#555;margin:10px 0 0;}
.projform select{width:100%;box-sizing:border-box;margin-top:4px;padding:9px 11px;border:1px solid #c9c2bf;border-radius:7px;font:15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;background:#fff;}
.projform input{width:100%;box-sizing:border-box;margin-top:4px;padding:9px 11px;border:1px solid #c9c2bf;
  border-radius:7px;font:15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;}
""", """.projform{max-width:430px;margin:9vh auto 0;background:var(--sheet-bg,#fff);border-radius:12px;padding:22px 24px;
  box-shadow:var(--sheet-shadow,0 12px 40px rgba(0,0,0,.35));}
.projform label{display:block;font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-mute,#555);margin:10px 0 0;}
.projform select{width:100%;margin-top:4px;padding:9px 11px;border:1px solid var(--sheet-fieldbd,#c9c2bf);border-radius:7px;font:15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;background:var(--sheet-field,#fff);}
.projform input{width:100%;margin-top:4px;padding:9px 11px;border:1px solid var(--sheet-fieldbd,#c9c2bf);
  border-radius:7px;font:15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;}
/* T3 B: box-sizing left both rules above — the app's global *{box-sizing:border-box} (line ~172) already sets it */
""")
s = one(s, """.projform .ckinline label{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;}
""", """.projform .ckinline label{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;}
/* ── T3 B (1 Nov 2026, Theo: "T3 B") — the eight sheets go dark in DARK mode ──
   Profile, Add project, Roofing checklist, GC, Lead, New Lead, Appointment and
   Signature. This REVERSES 6 Oct's "Forms 1" (a white paper sheet in both
   themes); the new answer is the settled one. Light mode is unchanged.

   HOW, so the next person does not add a layer on top: every rule that colours
   a sheet reads var(--sheet-x, <its light value>), and the --sheet-* tokens are
   declared ONLY here, on .projform, ONLY in dark. In light — and anywhere that
   is not inside a sheet — each var() falls back to exactly what shipped. The
   values are the app's own dark panel family: the sheet is --rbe-panel, its
   fields the recessed --rbe-panel2, its cream/beige sub-panels and chips
   --rbe-bg2, lines --rbe-line2/3. Two legacy tokens are re-declared for the
   sheet's subtree, because rules and inline styles inside it read them by
   name: --line (hairlines) and --muted (.subnote).
   Red words are #ff7b82, the dark "red words" ink .chipbtn.danger has carried
   since 1292: #e35c63 is 4.10:1 on the bg2 chips, under the 4.5 floor.

   NOT here, on purpose: the estimate builder's paper document (1217 "dark
   chrome, paper document") is not a .projform and stays paper; printed and
   shared documents do not change. The signature PAD stays white in both themes
   — it is a writing surface, and the stroke is drawn dark on a light ground.  */
:root:not([data-theme="rb-light"]) .projform{
  --sheet-bg:var(--rbe-panel,#16161B);
  --sheet-field:var(--rbe-panel2,#101015);
  --sheet-tint:var(--rbe-bg2,#262a31);
  --sheet-fieldbd:var(--rbe-line3,#3a3a44);
  --sheet-ink:var(--rbe-ink,#cfd6df);
  --sheet-head:var(--rbe-head,#ffffff);
  --sheet-mute:var(--rbe-mute,#b8bec6);
  --sheet-hint:var(--rbe-mute2,#9aa0a8);
  --sheet-red:#ff7b82;
  --sheet-redtint:var(--rbe-redtint,#3a2226);
  --sheet-redbd:var(--rbe-del-bd,#6e3129);
  --sheet-good:#4fc98a;
  --sheet-amber:#f0a24a;
  --sheet-ambertint:var(--rbe-ambertint,#3a2e1c);
  --sheet-bluetint:var(--rbe-bluetint,#1c2a3a);
  --sheet-blue:var(--rbe-acc,#8fb4d8);
  --sheet-shadow:0 0 0 1px var(--rbe-panelbd,#24242c), 0 12px 40px rgba(0,0,0,.6);
  --line:var(--rbe-line2,#2b2b33);
  --muted:var(--rbe-mute,#b8bec6);
  color:var(--sheet-ink);
  color-scheme:dark;   /* the browser's own parts follow: the time/date picker icons, select arrows, native checkboxes */
}
:root:not([data-theme="rb-light"]) .projform h3{color:var(--sheet-head);}
/* The fields' ground, ink and placeholder were the browser's own Field /
   FieldText — no rule set them, so there is nothing to edit; the dark sheet
   names them. Checkboxes and radios keep their own look. */
:root:not([data-theme="rb-light"]) .projform input:not([type=checkbox]):not([type=radio]),
:root:not([data-theme="rb-light"]) .projform textarea{background-color:var(--sheet-field);}
:root:not([data-theme="rb-light"]) .projform input,
:root:not([data-theme="rb-light"]) .projform textarea,
:root:not([data-theme="rb-light"]) .projform select{color:var(--sheet-ink);}
:root:not([data-theme="rb-light"]) .projform input::placeholder,
:root:not([data-theme="rb-light"]) .projform textarea::placeholder{color:var(--sheet-hint);}
""")
s = one(s, """.tradegrid label{display:flex;align-items:center;gap:8px;min-width:0;
  font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#2b2b2b;cursor:pointer;}""",
           """.tradegrid label{display:flex;align-items:center;gap:8px;min-width:0;
  font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-ink,#2b2b2b);cursor:pointer;}""")
s = one(s, """.ckhead{font:800 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--red-dk);border-bottom:2px solid var(--red);""",
           """.ckhead{font:800 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-red,var(--red-dk));border-bottom:2px solid var(--red);""")
s = one(s, """.ckinline{display:flex;gap:14px;flex-wrap:wrap;font:600 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#444;margin-top:6px;}""",
           """.ckinline{display:flex;gap:14px;flex-wrap:wrap;font:600 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-ink,#444);margin-top:6px;}""")
s = one(s, """.ckclient{font:15px/1.6 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#444;background:#f8f5f4;border:1px solid var(--line);""",
           """.ckclient{font:15px/1.6 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-ink,#444);background:var(--sheet-tint,#f8f5f4);border:1px solid var(--line);""")

# the appointment rows (1258 / 1260 / 1433)
s = one(s, """.apptrow .tm{font-weight:800;color:var(--red-dk);white-space:nowrap;min-width:64px;}""",
           """.apptrow .tm{font-weight:800;color:var(--sheet-red,var(--red-dk));white-space:nowrap;min-width:64px;}""")
s = one(s, """.apptrow .bd small{display:block;color:#5f6670;}   /* 1433: #8a8a8a was 3.45:1 on the white sheet; 5.80:1 */""",
           """.apptrow .bd small{display:block;color:var(--sheet-mute,#5f6670);}   /* 1433: #8a8a8a was 3.45:1 on the white sheet; 5.80:1. T3 B: 9.63:1 on the dark sheet */""")
s = one(s, """/* 1258: Add to calendar — the row button and its sheet (fixed colours: the sheet
   sits over the appointment modal's own dark wash in both themes) */
.apptrow .apptcal{flex:none;min-height:44px;padding:0 12px;border-radius:8px;cursor:pointer;
  border:1px solid #9aa4b2;background:#ffffff;color:#1e2b4a;font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;}""",
           """/* 1258: Add to calendar — the row button and its sheet (#apptCalSheet keeps fixed
   colours: it sits over the appointment modal's own dark wash in both themes).
   T3 B: the ROW button follows the day sheet, which is dark in dark mode now. */
.apptrow .apptcal{flex:none;min-height:44px;padding:0 12px;border-radius:8px;cursor:pointer;
  border:1px solid var(--sheet-fieldbd,#9aa4b2);background:var(--sheet-field,#ffffff);color:var(--sheet-ink,#1e2b4a);font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;}""")
s = one(s, """.apptrow .del{border:0;background:none;color:#5f6670;font-size:15px;cursor:pointer;min-width:44px;min-height:44px;}   /* 1433: #b3a49d was 2.41:1; a 44px tap area */""",
           """.apptrow .del{border:0;background:none;color:var(--sheet-mute,#5f6670);font-size:15px;cursor:pointer;min-width:44px;min-height:44px;}   /* 1433: #b3a49d was 2.41:1; a 44px tap area. T3 B: 9.63:1 dark */""")
s = one(s, """/* 1260: Edit, and the row it is editing. The day sheet is the white form sheet
   in both themes (Forms 1), so a fixed ink like 1258's Add to calendar. */
.apptrow .apptedit{flex:none;min-height:44px;padding:0 14px;border-radius:8px;cursor:pointer;
  border:1px solid #9aa4b2;background:#ffffff;color:#1e2b4a;font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;}""",
           """/* 1260: Edit, and the row it is editing. Same ink as 1258's Add to calendar —
   white paper in light; T3 B: the dark sheet's field and ink in dark. */
.apptrow .apptedit{flex:none;min-height:44px;padding:0 14px;border-radius:8px;cursor:pointer;
  border:1px solid var(--sheet-fieldbd,#9aa4b2);background:var(--sheet-field,#ffffff);color:var(--sheet-ink,#1e2b4a);font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;}""")

# the New Lead form's boxes, notes, suggestions and claim-type chips
s = one(s, """.ldbox{border:1px solid var(--line);border-radius:10px;background:#fcfaf9;padding:12px 14px;margin:0 0 12px;}""",
           """.ldbox{border:1px solid var(--line);border-radius:10px;background:var(--sheet-field,#fcfaf9);padding:12px 14px;margin:0 0 12px;}""")
s = one(s, """.ldhead{font:800 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--red-dk);border-bottom:2px solid var(--red);""",
           """.ldhead{font:800 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-red,var(--red-dk));border-bottom:2px solid var(--red);""")
s = one(s, """  color:#5c4a42;}
.ldnote b{color:#7d5200;}
.ldreq{float:right;font:600 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#6b5f59;}""",
           """  color:var(--sheet-mute,#5c4a42);}
.ldnote b{color:var(--sheet-amber,#7d5200);}
.ldreq{float:right;font:600 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-mute,#6b5f59);}""")
s = one(s, """#ldNoContactWrap{display:none;margin-top:10px;padding:9px 11px;border:1px solid #e0b4b8;
  border-radius:8px;background:#fdf4f4;font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#8f1620;}""",
           """#ldNoContactWrap{display:none;margin-top:10px;padding:9px 11px;border:1px solid var(--sheet-redbd,#e0b4b8);
  border-radius:8px;background:var(--sheet-redtint,#fdf4f4);font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-red,#8f1620);}""")
s = one(s, """.ldsugg{position:absolute;left:0;right:0;top:100%;z-index:40;background:#fff;border:1px solid #c9c2bf;""",
           """.ldsugg{position:absolute;left:0;right:0;top:100%;z-index:40;background:var(--sheet-field,#fff);border:1px solid var(--sheet-fieldbd,#c9c2bf);""")
s = one(s, """.ldsugg div{padding:9px 12px;font:13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#333;cursor:pointer;}
.ldsugg div:hover{background:#f7efec;}""",
           """.ldsugg div{padding:9px 12px;font:13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-ink,#333);cursor:pointer;}
.ldsugg div:hover{background:var(--sheet-tint,#f7efec);}""")
s = one(s, """  border:1px solid var(--line);border-radius:22px;background:#fff;cursor:pointer;
  font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#3b2f2a;transition:all .12s;}
.ldctopt:hover{border-color:var(--red-dk);}""",
           """  border:1px solid var(--line);border-radius:22px;background:var(--sheet-field,#fff);cursor:pointer;
  font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#3b2f2a;transition:all .12s;}
.ldctopt:hover{border-color:var(--sheet-red,var(--red-dk));}""")
s = one(s, """.ldctopt.ldctselect{background:#fdf1f0;border-color:var(--red);color:var(--red-dk);}""",
           """.ldctopt.ldctselect{background:var(--sheet-redtint,#fdf1f0);border-color:var(--red);color:var(--sheet-red,var(--red-dk));}""")

# the trade rows and the lead-source / claim chips
s = one(s, """.projform label.tradeopt{display:flex;align-items:center;gap:8px;margin:0;
  font:600 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#2b2b2b;min-height:44px;""",
           """.projform label.tradeopt{display:flex;align-items:center;gap:8px;margin:0;
  font:600 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-ink,#2b2b2b);min-height:44px;""")
s = one(s, """  background:#f0e8d0;border:1px solid #d9cfb2;color:#5a5344;
  font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;white-space:nowrap;min-height:44px;""",
           """  background:var(--sheet-tint,#f0e8d0);border:1px solid var(--sheet-fieldbd,#d9cfb2);color:var(--sheet-ink,#5a5344);
  font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;white-space:nowrap;min-height:44px;""")
s = one(s, """.tradeopt{display:flex;align-items:center;gap:7px;font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#2b2b2b;cursor:pointer;}""",
           """.tradeopt{display:flex;align-items:center;gap:7px;font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-ink,#2b2b2b);cursor:pointer;}""")

# 3c — the 1299 paper-ink chips on the white sheet in dark: deleted, the sheet is dark now
s = one(s, """/* 1299: a chip on the WHITE form sheet keeps paper ink. The sheet is white in both
   themes (Forms 1), so the dark rule above — light ink on a transparent chip since
   1292 — read 1.22:1 there. Outline style is unchanged: no fill, a hairline, ink. */
:root:not([data-theme="rb-light"]) .projform .chipbtn{--cr-stack:"1299 the form sheet is white in dark too (Forms 1); 1292's light chip ink is for dark grounds";color:#2b2b2b;border-color:#c9c2b8;background:transparent;}
:root:not([data-theme="rb-light"]) .projform .chipbtn:hover{border-color:var(--red);color:#9c1822;}
:root:not([data-theme="rb-light"]) .projform .chipbtn.danger{color:#c8202e;border-color:transparent;}
""", """/* 1299 kept paper ink on chips inside the WHITE form sheet in dark (Forms 1).
   T3 B (1 Nov 2026): the sheet is dark in dark mode now, so those three rules are
   deleted and the dark outline chip above applies inside the sheet as well. */
""")

# cr-lac: the mailing/billing toggle inside the New Lead form
s = one(s, """#cr-lac-toggle{display:block;width:100%;margin:10px 0 2px;padding:9px 12px;background:#f4f2f1;border:1px dashed #d9cfaf;border-radius:8px;color:#8f1620;""",
           """#cr-lac-toggle{display:block;width:100%;margin:10px 0 2px;padding:9px 12px;background:var(--sheet-tint,#f4f2f1);border:1px dashed var(--sheet-fieldbd,#d9cfaf);border-radius:8px;color:var(--sheet-red,#8f1620);""")
s = one(s, """#cr-lac-toggle:hover{background:#f5efd8;border-color:#c8202e}#cr-lac-toggle .chev{float:right;color:#6b5f59;font-weight:800}""",
           """#cr-lac-toggle:hover{background:var(--sheet-tint,#f5efd8);border-color:#c8202e}#cr-lac-toggle .chev{float:right;color:var(--sheet-mute,#6b5f59);font-weight:800}""")
s = one(s, """#cr-lac-note{font:600 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#6b6b6b;margin:2px 0 8px}""",
           """#cr-lac-note{font:600 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--sheet-mute,#6b6b6b);margin:2px 0 8px}""")

# the ridge: .ldbox is tuned as a white "paper" card (a #fff 2px top bevel, 522's paper family). Inside a dark
# sheet it takes the dark family instead — a theme twin, so the paper rule stays and the twin says why.
FAM_END = '.rptkpi{--rbe-ridge-t:#ffffff;--rbe-ridge-b:#d9d9d9;--rbe-ridge-hl:rgba(255,255,255,.9);}'
s = one(s, FAM_END, FAM_END + """
/* T3 B: the New Lead sheet is dark in dark mode, so its .ldbox takes the dark ridge
   family (the .cr-sf-today line below) instead of the paper bevel above. */
:root:not([data-theme="rb-light"]) .projform .ldbox{--cr-stack:"T3 B theme twin: the paper tuning stays for light and every other paper card";--rbe-ridge-t:#454552;--rbe-ridge-b:#050507;--rbe-ridge-hl:rgba(255,255,255,.09);}""")

# 3d — inline literals in the sheets' markup
PV, PE = '<div id="profileView" style="display:none;">', '<!-- ============ ADD / EDIT PROJECT MODAL ============ -->'
s = in_slice(s, PV, PE, '<input type="email" id="upEmail" disabled style="background:#f3f0ee;color:#5f5f5f;">',
             '<input type="email" id="upEmail" disabled style="background:var(--sheet-tint,#f3f0ee);color:var(--sheet-mute,#5f5f5f);">')
s = in_slice(s, PV, PE, "sans-serif;color:#2e7d32;\"></span>", "sans-serif;color:var(--sheet-good,#2e7d32);\"></span>")
s = in_slice(s, PV, PE, "sans-serif;background:#fff8e1;", "sans-serif;background:var(--sheet-ambertint,#fff8e1);")
s = in_slice(s, PV, PE, "margin-top:9px;color:#555;", "margin-top:9px;color:var(--sheet-mute,#555);", n=2)
ERR = "style=\"color:var(--red);font:12.5px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;margin-top:8px;\""
for eid in ['upError', 'pfError', 'ckError', 'gcError', 'ldError', 'apptError']:
    s = one(s, '<div id="%s" %s>' % (eid, ERR),
               '<div id="%s" %s>' % (eid, ERR.replace('color:var(--red);', 'color:var(--sheet-red,var(--red));')))
s = one(s, '<label style="margin-top:12px;font-weight:700;">Claim Type <span style="color:var(--red);">*</span></label>',
           '<label style="margin-top:12px;font-weight:700;">Claim Type <span style="color:var(--sheet-red,var(--red));">*</span></label>')
s = one(s, '<div class="ldbox" id="ldInsBox" style="display:none;border-left:3px solid #4a6fa5;background:#f2f4f8;">\n        <div class="ldhead" style="color:#2d4468;">',
           '<div class="ldbox" id="ldInsBox" style="display:none;border-left:3px solid #4a6fa5;background:var(--sheet-bluetint,#f2f4f8);">\n        <div class="ldhead" style="color:var(--sheet-blue,#2d4468);">')
s = one(s, '<small id="ldScopeNote" style="display:block;color:#8a6f66;margin-top:3px;">',
           '<small id="ldScopeNote" style="display:block;color:var(--sheet-mute,#8a6f66);margin-top:3px;">')
TA = "padding:9px 11px;border:1px solid #c9c2bf;border-radius:7px;font:14px"
s = one(s, TA, "padding:9px 11px;border:1px solid var(--sheet-fieldbd,#c9c2bf);border-radius:7px;font:14px", n=4)   # ck/gc/ldIns/ld notes

# 3d — the JS that writes inline inks into a sheet
s = one(s, "' <span style=\"color:#5c5c5c;\">(from client profile)</span>'",
           "' <span style=\"color:var(--sheet-mute,#5c5c5c);\">(from client profile)</span>'", n=2)   # ckClientLine, gcClientLine
US, UE = 'function updatePushUI(){', "/* collapsible sections */\ndocument.getElementById('actToggle')"
s = in_slice(s, US, UE, "st.style.color = '#2e7d32';", "st.style.color = 'var(--sheet-good,#2e7d32)';", n=2)
s = in_slice(s, US, UE, "st.style.color = '#555';", "st.style.color = 'var(--sheet-mute,#555)';", n=2)
s = in_slice(s, US, UE, "st.style.color = '#C8202E';", "st.style.color = 'var(--sheet-red,#C8202E)';", n=3)
s = in_slice(s, US, UE, "st.style.color = (j.ok ? '#2e7d32' : '#8a5a00');",
             "st.style.color = (j.ok ? 'var(--sheet-good,#2e7d32)' : 'var(--sheet-amber,#8a5a00)');")


# ── invariants on the artifact, self-computing where possible ───────────────────────────────
assert '#ff2740' not in s.split('<style id="cr-nvl-styles">', 1)[1].split('</style>', 1)[0], 'red edge still in cr-nvl-styles'
assert s.count('--sheet-bg:') == 1 and s.count('--rpt-face:') == 1
# every --sheet-* / --rpt-* DECLARATION sits in its one block
for name, sel in (('--sheet-', ':root:not([data-theme="rb-light"]) .projform{'), ('--rpt-', ':root[data-theme="rb-light"] #reportsView{')):
    i = s.index(sel); j = s.index('}', i)
    decl = [m.start() for m in re.finditer(r'(?<![\w-])' + re.escape(name) + r'[a-z0-9-]+\s*:', s)]
    assert decl and all(i < d < j for d in decl), (name, len(decl))
assert s.count("projform .chipbtn{--cr-stack") == ORIG.count("projform .chipbtn{--cr-stack") - 1
assert s.count('new Chart(') == ORIG.count('new Chart(')   # no chart construction added (546's own comment names it once)
assert s.count('Home and Reports cards lose the red stripe') == 0

pl.write_atomic(OUT, s)
print('patch_1435_reports_forms ok —', len(ORIG), '->', len(s), 'chars')
