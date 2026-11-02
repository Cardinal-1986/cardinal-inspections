#!/usr/bin/env python3
"""patch_1442_desktop.py <file> - build 1442, round-1 leftovers: desktop layout (builder A2, made on build 1438).

Items: P09.01 P09.05 P09.06 P09.07 P09.08 P09.10 P09.12 P09.14 P09.15 P06.14,
plus V5's J15.17 sighting (the A/R pills stay pastel in dark).

Every edit is an exact-match literal splice whose anchor occurs ONCE in the whole
file (one() asserts it before anything is written). Applied in order; re-running
on a fresh copy of b1438 reproduces the output byte for byte. Does NOT touch the
app stamp or the CHANGELOG - the integrator does that.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1]
s = pl.load(P)


def one(src, a, b):
    n = src.count(a)
    assert n == 1, 'anchor count %d (want 1): %r' % (n, a[:140])
    return src.replace(a, b, 1)


EDITS = []


def E(label, a, b):
    EDITS.append((label, a, b))


# ════════════════════════════════════════════════════════════════════════════
# P09.01 - the Clients directory's three CRM columns start at ~1280, not 1600.
#   One width rule, used by the render and the resize listener, so the two
#   cannot disagree. Per Text size: a media query (and innerWidth) sees the
#   unzoomed viewport, so the line is 1280 x the root zoom - capped at 1600, so
#   no size gets the columns LATER than it does today.
# ════════════════════════════════════════════════════════════════════════════
E('P09.01 render gate',
  "  if(window.innerWidth >= 1600 && list.length){",
  "  if(cdColsWide() && list.length){")
E('P09.01 resize listener',
  "(function(){ var lastUW = window.innerWidth >= 1600;\n"
  "  window.addEventListener('resize', function(){\n"
  "    var uw = window.innerWidth >= 1600; if(uw === lastUW) return; lastUW = uw;",
  "/* P09.01 (1442): the line came in from 1600 to 1280 - the width where the directory's\n"
  "   list is ~640px, three ~200px columns, every name still on screen (1426 wraps it).\n"
  "   Per Text size the line is 1280 x the root zoom (Large 1472), never later than 1600. */\n"
  "function cdColsWide(){\n"
  "  var z = 1; try{ z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1; }catch(_z){}\n"
  "  return window.innerWidth >= Math.min(1600, 1280 * z);\n"
  "}\n"
  "(function(){ var lastUW = cdColsWide();\n"
  "  window.addEventListener('resize', function(){\n"
  "    var uw = cdColsWide(); if(uw === lastUW) return; lastUW = uw;")
E('P09.01 grid gate + the per-card CRM label',
  "@media (min-width:1600px){\n  #clientsView #cliList.cd-crmcols{",
  "/* P09.01 (1442): 1280, the render's own line (cdColsWide); the class still only exists when\n"
  "   the render put it there. Inside a CRM column the column header names the CRM, so the\n"
  "   card's own CRM tag is dropped there - the flat list below the line keeps it. */\n"
  "@media (min-width:1280px){\n"
  "  #cliList .cd-crmsec .cd-crmtag{ display:none; }\n"
  "  #clientsView #cliList.cd-crmcols{")

# ════════════════════════════════════════════════════════════════════════════
# P09.05 - the retail client profile's two columns (923 / 1227 / 1354 / 1355)
#   start at 1280, in the CSS and in CardinalJobPay.cols(), which must agree:
#   cols() builds the .acx-cols box and the CSS is what shows it.
# ════════════════════════════════════════════════════════════════════════════
E('P09.05 923 grid',
  "  @media (min-width:1600px){\n    body.cr-lnav-on:not(.claim-insurance):not(.claim-community) #projectView .wrap:not(.masthead){ max-width:1600px; }",
  "  /* P09.05 (1442): from 1280, not 1600 - two ~440px columns fit beside the rail there */\n"
  "  @media (min-width:1280px){\n    body.cr-lnav-on:not(.claim-insurance):not(.claim-community) #projectView .wrap:not(.masthead){ max-width:1600px; }")
E('P09.05 923 grid display',
  "  @media (min-width:1600px){\n    body:not(.claim-insurance):not(.claim-community) #projectView #acxMount{ display:grid; }\n  }",
  "  @media (min-width:1280px){\n    body:not(.claim-insurance):not(.claim-community) #projectView #acxMount{ display:grid; }\n  }")
E('P09.05 1354 columns (+ P09.06 insurance)',
  ".acx-cols{ display:none; }\n@media (min-width:1600px){\n"
  "  body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .acx-cols{ display:grid;",
  "/* P09.05 (1442): from 1280 (cols() uses the same line). P09.06 (1442): Insurance too - only\n"
  "   Community stays out, because its client page is its own takeover. */\n"
  ".acx-cols{ display:none; }\n@media (min-width:1280px){\n"
  "  body:not(.claim-community) #projectView #acxMount > .acx-cols{ --cr-stack:\"1354 edited in place (P09.05/P09.06, 1442): the box shows from the line, for Insurance too; its display:none default stays below it\"; display:grid;")
E('P09.06 1354 column stacks for insurance',
  "  body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .acx-cols > .acx-colL, body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .acx-cols > .acx-colR{ display:flex; flex-direction:column; min-width:0; }",
  "  body:not(.claim-community) #projectView #acxMount > .acx-cols > .acx-colL, body:not(.claim-community) #projectView #acxMount > .acx-cols > .acx-colR{ display:flex; flex-direction:column; min-width:0; }")
E('P09.05 1355 slim bar',
  "/* ═══ Build 1355 · the client card is one slim bar on a wide screen (Theo's pick B) ═══ */\n@media (min-width:1600px){",
  "/* ═══ Build 1355 · the client card is one slim bar on a wide screen (Theo's pick B) ═══ */\n"
  "/* P09.05 (1442): from 1280, with the columns it sits above, so the page is never half-applied */\n"
  "@media (min-width:1280px){")
E('P09.05 crji-stack column',
  "@media (min-width:561px){ body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .crji-stack{ order:3; } }\n@media (min-width:1600px){",
  "@media (min-width:561px){ body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .crji-stack{ order:3; } }\n@media (min-width:1280px){")
E('P09.05/P09.06 cols(): the line, insurance, and its money cards',
  "  var LEFT = ['.crji-stack', '#dbMoneyRow', '.ja-menu'];\n"
  "  var STAY = ['.dbstage', '.cr-admin-tog', '#dbConvertIns'];",
  "  /* P09.06 (1442): Insurance joins. Its invoice and Payments cards are bare .crji-card (retail\n"
  "     wraps them in .crji-stack), and its claim strip is a full-width band under the stage bar. */\n"
  "  var LEFT = ['.crji-stack', '.crji-card', '#dbMoneyRow', '.ja-menu'];\n"
  "  var STAY = ['.dbstage', '.cr-claimstrip', '.cr-admin-tog', '#dbConvertIns'];")
E('P09.05/P09.06 cols() gate',
  "    var retail = !(b.classList.contains('claim-insurance') || b.classList.contains('claim-community'));\n"
  "    var wide = !!(window.matchMedia && window.matchMedia('(min-width:1600px)').matches);",
  "    var retail = !b.classList.contains('claim-community');   /* P09.06 (1442): retail AND insurance */\n"
  "    var wide = !!(window.matchMedia && window.matchMedia('(min-width:1280px)').matches);   /* P09.05 (1442): was 1600 */")
E('P09.06 cols(): the box goes under the claim strip',
  "      var stage = mount.querySelector(':scope > .dbstage');",
  "      var stage = mount.querySelector(':scope > .cr-claimstrip') || mount.querySelector(':scope > .dbstage');   /* P09.06 (1442) */")

# ════════════════════════════════════════════════════════════════════════════
# P09.06 - the insurance home (Cardinal Truth) was held to 840px at every width.
#   P06.14 - its stat tiles: the 1240px rule forced three tracks on two tiles.
# ════════════════════════════════════════════════════════════════════════════
E('P09.06 Cardinal Truth widens on desktop',
  "#cardinalTruthView .ins-body.cr-cth{background:var(--ct-bg,#FAF8F7);padding:0}",
  "#cardinalTruthView .ins-body.cr-cth{background:var(--ct-bg,#FAF8F7);padding:0}"
  "@media (min-width:1100px){#cardinalTruthView .ins-body.cr-cth{--cr-stack:\"P09.06 (1442): the hub widens beside the rail; the shared 840px .ins-body column stays for the Library\";max-width:none}}")
E('P09.06 the hub column + P06.14 the stat tiles',
  "@media (min-width:900px){.cr-cth-wrap{max-width:1180px;padding-left:26px;padding-right:26px}",
  "@media (min-width:900px){.cr-cth-wrap{--cr-stack:\"P09.06 (1442) edited in place, 1180 to 1400: the hub column on a desktop; the 580px phone column stays\";max-width:1400px;padding-left:26px;padding-right:26px}")
E('P06.14 no forced three tracks',
  "@media (min-width:1240px){.cr-cth-stats{grid-template-columns:repeat(3,1fr)}}",
  "")
E('P06.14 the tile label may shrink and wrap',
  ".cr-cth-stat .l{font:800 11px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--ct-ink-2)}",
  ".cr-cth-stat .l{font:800 11px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--ct-ink-2);min-width:0;overflow-wrap:anywhere}")

# ════════════════════════════════════════════════════════════════════════════
# P09.07 - the Google Reviews card stayed near-black on the cream insurance
#   profile in light. Keyed on the insurance theme itself (docket = light; Sun
#   is light too), on its own --ct-* tokens, so an insurance page that the user
#   set dark keeps the dark card. Dark is untouched.
# ════════════════════════════════════════════════════════════════════════════
E('P09.07 insurance light rvcard',
  ":root[data-theme=\"rb-light\"] body:not(.claim-insurance):not(.claim-community) #projectView .rvtog{\n  background:#d5d5da;\n}\n</style>",
  ":root[data-theme=\"rb-light\"] body:not(.claim-insurance):not(.claim-community) #projectView .rvtog{\n  background:#d5d5da;\n}\n"
  "/* P09.07 (1442): the same card on the INSURANCE profile in light (docket). Its ground is the\n"
  "   insurance palette's own card, so it follows that page's theme, not the app's. Inks on\n"
  "   white: ink 17.75:1, ink-2 5.61:1, the check #165C2E 8.06:1, copy gold 4.90:1. */\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvcard{\n"
  "  --cr-stack:\"P09.07 insurance light twin; the dark base stays for siren\";\n"
  "  background:var(--ct-surface,#FFFFFF); border:1px solid var(--ct-line,#EAE5E3); box-shadow:none;\n"
  "}\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvcard .rvtop{\n"
  "  --cr-stack:\"P09.07 insurance light twin\"; background:var(--ct-surface-2,#FAF8F7); color:var(--ct-ink,#17181B);\n"
  "}\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvstatus,\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvstatus.none,\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvhint{\n"
  "  --cr-stack:\"P09.07 insurance light twin\"; color:var(--ct-ink-2,#6E6663);\n"
  "}\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvstatus .rvchk{ --cr-stack:\"P09.07 insurance light twin\"; color:var(--ct-do-ink,#165C2E); }\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvbtn.copy{ --cr-stack:\"P09.07 insurance light twin\"; color:#8a6d1f; border-color:#c9b98a; }\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvbtn.copy:active{ background:var(--ct-surface-2,#FAF8F7); }\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvflip{ --cr-stack:\"P09.07 insurance light twin\"; color:var(--ct-ink,#17181B); border-top-color:var(--ct-line,#EAE5E3); }\n"
  "body[data-rltheme=\"docket\"].claim-insurance #projectView .rvtog{ --cr-stack:\"P09.07 insurance light twin\"; background:#d5d5da; }\n"
  "</style>")

# ════════════════════════════════════════════════════════════════════════════
# P09.08 - Invoices & AR and Owner Review covered the left rail at x=0. They join
#   the 572 list (under the header, beside the rail). Their row actions on a
#   desktop are sized to their label; the main one stays solid red (Buttons A).
# ════════════════════════════════════════════════════════════════════════════
E('P09.08 AR + Owner Review beside the rail',
  "/* The 640px columns. Desktop-only: below 1100px --lnav-w is 0 and the class is\n",
  "/* P09.08 (1442): Invoices & AR and Owner Review are the same shape as the five above -\n"
  "   position:fixed; inset:0 at z-index 9500 - and covered the rail at x=0 with the rail\n"
  "   unclickable under them. The same three lines, gated the same way, so the phone keeps\n"
  "   its full-screen page. A rule of their own, so the list above stays byte-identical. */\n"
  "body.cr-lnav-on #cr-ar-view,\n"
  "body.cr-lnav-on #cr-orv-view{\n"
  "  --cr-stack:\"P09.08 beside the rail on a desktop; their own inset:0 stays for the phone\";\n"
  "  top:var(--headh,110px) !important;\n"
  "  left:var(--lnav-w) !important;\n"
  "  z-index:60 !important;\n"
  "}\n\n"
  "/* The 640px columns. Desktop-only: below 1100px --lnav-w is 0 and the class is\n")
E('P09.08 AR row actions sized to their label on a desktop',
  "#cr-ar-view .crar-acts .crar-go{flex:1 1 auto; justify-content:center;}",
  "/* P09.08 (1442): the main action fills the row on a phone/tablet only; beside the rail it is a\n"
  "   label-sized button (it was a 960px red bar). It stays solid red - Buttons A. */\n"
  "@media (max-width:1099px){ #cr-ar-view .crar-acts .crar-go{flex:1 1 auto; justify-content:center;} }")

# ════════════════════════════════════════════════════════════════════════════
# J15.17 (V5's sighting) - the A/R screen's status pills stayed pastel in dark.
#   The app-wide .crar-pill rules already carry the dark set AND the light set
#   (the light values are these, byte for byte), so the dashboard's own copies are
#   deleted rather than out-specified.
# ════════════════════════════════════════════════════════════════════════════
E('J15.17 the AR dashboard pills use the shared pair',
  "/* status pills — semantic hues, dark inks for a 4.5:1 floor on the light tints */\n"
  "#cr-ar-view .crar-pill{display:inline-flex; align-items:center; gap:6px; white-space:nowrap;\n"
  "  padding:3px 10px; border-radius:999px; font-size:13px; font-weight:600; line-height:1.35;}\n"
  "#cr-ar-view .crar-pill::before{content:\"\"; width:7px; height:7px; border-radius:50%; background:currentColor;}\n"
  "#cr-ar-view .crar-pill.draft{color:#475569; background:#EEF2F7;}\n"
  "#cr-ar-view .crar-pill.sent{color:#1D4ED8; background:#E7EFFD;}\n"
  "#cr-ar-view .crar-pill.part{color:#B45309; background:#FDF1E2;}\n"
  "#cr-ar-view .crar-pill.paid{color:#047857; background:#E4F5EE;}\n"
  "#cr-ar-view .crar-pill.over{color:#B91C1C; background:#FCEAEA;}\n",
  "/* status pills: J15.17 (1442) - the dashboard's own pastel copies are gone. They stayed light\n"
  "   in dark; the shared .crar-pill set below (dark tints, light twins byte-identical to these)\n"
  "   now paints the dashboard too. */\n")
E('J15.17 comment',
  "/* status pills, UNSCOPED so they render in the job block too (same values as the\n"
  "   AR view's #cr-ar-view .crar-pill rules; those stay and win inside the dashboard). */",
  "/* status pills, UNSCOPED so they render in the job block AND the AR dashboard (J15.17, 1442:\n"
  "   the dashboard's own pastel copies were deleted - they never went dark). */")
E('J15.17 comment 2',
  "   The AR dashboard's own #cr-ar-view .crar-pill rules are untouched and still win there. */",
  "   Since J15.17 (1442) these are the AR dashboard's pills too. */")

# ════════════════════════════════════════════════════════════════════════════
# P09.12 - hover feedback on the Clients cards, Owner Review rows and the home
#   pipeline. The Leads card's lift is reused (its own selector lists), plus a
#   ground/edge step; hover-capable pointers only, so a phone tap never latches it.
#   The pipeline cells do NOT lift: they sit in a 1px well and a lift would clip
#   their 3px stage edge, so they take the Leads card's ground step instead.
# ════════════════════════════════════════════════════════════════════════════
E('P09.12 lift: transition list',
  "#reportsView .pipecard,\n#reportsView .rptkpi{\n  transition:",
  "#reportsView .pipecard,\n#reportsView .rptkpi,\n#clientsView .cd-card,\n#cr-orv-view button.orv-card{\n  transition:")
E('P09.12 lift: hover list',
  "  #reportsView .pipecard:hover,\n  #reportsView .rptkpi:hover{ transform:translateY(-3px); }",
  "  #reportsView .pipecard:hover,\n  #reportsView .rptkpi:hover,\n  #clientsView .cd-card:hover,\n  #cr-orv-view button.orv-card:hover{ transform:translateY(-3px); }")
E('P09.12 lift: reduced motion (transition)',
  "  #reportsView .pipecard,\n  #reportsView .rptkpi{ transition:none; }",
  "  #reportsView .pipecard,\n  #reportsView .rptkpi,\n  #clientsView .cd-card,\n  #cr-orv-view button.orv-card{ transition:none; }")
E('P09.12 lift: reduced motion (hover)',
  "  #reportsView .pipecard:hover,\n  #reportsView .rptkpi:hover{ transform:none; }",
  "  #reportsView .pipecard:hover,\n  #reportsView .rptkpi:hover,\n  #clientsView .cd-card:hover,\n  #cr-orv-view button.orv-card:hover{ transform:none; }\n}\n"
  "/* P09.12 (1442): the ground/edge step that goes with the lift (and is all a reduced-motion user\n"
  "   gets). Existing values only: the cards' own hairline greys, Owner Review's --orv-dim, the\n"
  "   Leads card's hover navy (#8d97a6 label 5.28:1 on it) and white in light (6.77:1). */\n"
  "@media (hover:hover) and (pointer:fine){\n"
  "  #clientsView .cd-card:hover{ border-color:#4a4d52; }\n"
  "  :root[data-theme=\"rb-light\"] #clientsView .cd-card:hover{ border-color:#cfcfcf; }\n"
  "  #cr-orv-view button.orv-card:hover{ border-color:var(--orv-dim,#a8b0ba); }\n"
  "  :root:not([data-theme=\"rb-light\"]) body:not(.claim-insurance):not(.claim-community) .piperow .pipebtn:hover{ background:var(--nv-card1,#1A2434); }\n"
  "  :root[data-theme=\"rb-light\"] body:not(.claim-insurance):not(.claim-community) .piperow .pipebtn:hover{ background:#ffffff; box-shadow:inset 0 0 0 1px #c9cdd3; }")

# ════════════════════════════════════════════════════════════════════════════
# P09.10 - the Schedule Board grid from 1280 (was 1600), and its chips say whose
#   job it is. Below 1600 the day panel + cockpit go UNDER the calendar, side by
#   side, so the seven day columns keep ~130px; from 1600 the 400px rail is back
#   beside it exactly as before.
# ════════════════════════════════════════════════════════════════════════════
E('P09.10 banner comment',
  "/* 917: Schedule Board — ultrawide (>=1600px) two-week grid + day/cockpit rail.",
  "/* P09.10 (1442): the grid now starts at 1280 (Normal text); below 1600 the rail sits under the calendar.\n"
  "   917: Schedule Board — ultrawide (>=1600px) two-week grid + day/cockpit rail.")
E('P09.10 the grid from 1280 (per Text size)',
  "  #boardView #boardMount{ display:none; }\n  #boardWide{ display:block; }\n}\n",
  "  #boardView #boardMount{ display:none; }\n  #boardWide{ display:block; }\n}\n"
  "/* P09.10 (1442): the grid from 1280 at Normal text, from 1472 at Large or in Sun (both a 1.15 zoom);\n"
  "   Larger keeps the 1600 above. A media query sees the unzoomed viewport (1438's note), so the line\n"
  "   is per Text size step: seven day columns keep ~125px at each. */\n"
  "@media (min-width:1280px){\n"
  "  :root:not([data-cr-text]):not([data-cr-sun]) #boardView .wrap{ --cr-stack:\"P09.10 the grid's width from 1280 (Normal)\"; max-width:2100px; }\n"
  "  :root:not([data-cr-text]):not([data-cr-sun]) #boardView #boardMount{ --cr-stack:\"P09.10 the list gives way to the grid from 1280 (Normal)\"; display:none; }\n"
  "  :root:not([data-cr-text]):not([data-cr-sun]) #boardWide{ --cr-stack:\"P09.10 the grid from 1280 (Normal)\"; display:block; }\n"
  "}\n"
  "@media (min-width:1472px){\n"
  "  :root:is([data-cr-text=\"lg\"]:not([data-cr-sun]),[data-cr-sun]:not([data-cr-text])) #boardView .wrap{ --cr-stack:\"P09.10 the grid's width from 1472 (Large, Sun)\"; max-width:2100px; }\n"
  "  :root:is([data-cr-text=\"lg\"]:not([data-cr-sun]),[data-cr-sun]:not([data-cr-text])) #boardView #boardMount{ --cr-stack:\"P09.10 the list gives way to the grid from 1472 (Large, Sun)\"; display:none; }\n"
  "  :root:is([data-cr-text=\"lg\"]:not([data-cr-sun]),[data-cr-sun]:not([data-cr-text])) #boardWide{ --cr-stack:\"P09.10 the grid from 1472 (Large, Sun)\"; display:block; }\n"
  "}\n")
E('P09.10 the rail beside the calendar only from 1600',
  "#boardWide .sbw-lay{ display:grid; grid-template-columns:minmax(0,1fr) 400px; gap:22px; align-items:start; }",
  "#boardWide .sbw-lay{ display:grid; grid-template-columns:minmax(0,1fr); gap:22px; align-items:start; }\n"
  "@media (min-width:1600px){ #boardWide .sbw-lay{ grid-template-columns:minmax(0,1fr) 400px; } }")
E('P09.10 the rail lays its two cards side by side under the calendar',
  "#boardWide .sbw-rail{ display:flex; flex-direction:column; gap:14px; }",
  "#boardWide .sbw-rail{ display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:14px; align-items:start; }")
E('P09.10 chip: a second line for the client',
  "#boardWide .sbw-ev{ display:flex; align-items:center; gap:6px; min-width:0; font-size:11px; }",
  "#boardWide .sbw-ev{ display:flex; flex-wrap:wrap; align-items:center; gap:0 6px; min-width:0; font-size:11px; }")
E('P09.10 the chip\'s client line (the title keeps the base .btitle flex:1, so it fills line one)',
  "#boardWide .sbw-ev .btitle{ font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }",
  "#boardWide .sbw-ev .btitle{ font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n"
  "#boardWide .sbw-ev .sbw-evc{ flex:0 0 100%; min-width:0; padding-left:13px; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }")
E('P09.10 chip markup: client + title attribute',
  "  function evLine(it){\n    var k=it.kind||'appt';\n"
  "    return '<div class=\"sbw-ev\"><i class=\"sbw-dot '+k+'\"></i><span class=\"btime\">'+tfmt(it.appt_time)+\n"
  "      '</span><span class=\"btitle\">'+esc2(it.title||kmName(k))+'</span></div>';\n  }",
  "  /* P09.10 (1442): the chip said what, never whose - the client's name is its second line now,\n"
  "     and the whole line is the chip's title (the tooltip), so a cut name is still readable. */\n"
  "  function evLine(it){\n    var k=it.kind||'appt';\n"
  "    var pr=it.project_id?projOf(it.project_id):null, nm=pr&&pr.name?String(pr.name):'';\n"
  "    var ttl=it.title||kmName(k), full=tfmt(it.appt_time)+' '+ttl+(nm?' \\u00b7 '+nm:'');\n"
  "    return '<div class=\"sbw-ev\" title=\"'+esc2(full)+'\"><i class=\"sbw-dot '+k+'\"></i><span class=\"btime\">'+tfmt(it.appt_time)+\n"
  "      '</span><span class=\"btitle\">'+esc2(ttl)+'</span>'+(nm?'<span class=\"bcli sbw-evc\">'+esc2(nm)+'</span>':'')+'</div>';\n  }")

# ════════════════════════════════════════════════════════════════════════════
# P09.14 - the home Activity card: several bookings by one person on one day
#   are ONE row ("booked 13 appointments"). Home card only: the full feed and the
#   client History keep every row (History filters per job, so grouping across
#   jobs there would drop a client's own booking).
# ════════════════════════════════════════════════════════════════════════════
E('P09.14 group the bookings',
  "  var ev = buildActivityEvents().slice(0, 14);",
  "  var ev = actGroupBookings(buildActivityEvents()).slice(0, 14);   /* P09.14 (1442) */")
E('P09.14 the grouping helper',
  "function renderActivity(){\n  var mount = document.getElementById('actFeed');",
  "/* P09.14 (1442): 13 of the home card's 14 rows were one person's appointment bookings, which\n"
  "   pushed new clients, invoices and contracts off it. Two or more bookings by the same person\n"
  "   on the same (local) day fold into one row at the newest one's place; a lone booking keeps\n"
  "   its own row and its date line. The list is already newest-first. */\n"
  "function actGroupBookings(ev){\n"
  "  var dayOf = function(t){ var d = new Date(t); return isNaN(d.getTime()) ? String(t).slice(0, 10) : d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };\n"
  "  var groups = {}, out = [];\n"
  "  ev.forEach(function(x){ if(x.label !== 'Appointment:') return; var k = (x.who || '') + '|' + dayOf(x.t); (groups[k] = groups[k] || []).push(x); });\n"
  "  ev.forEach(function(x){\n"
  "    if(x.label !== 'Appointment:'){ out.push(x); return; }\n"
  "    var g = groups[(x.who || '') + '|' + dayOf(x.t)];\n"
  "    if(g.length < 2){ out.push(x); return; }\n"
  "    if(g[0] !== x) return;\n"
  "    var one = g.every(function(y){ return y.cli === x.cli; });\n"
  "    out.push({ t:x.t, ini:x.ini, ico:x.ico, label:'Booked:', who:x.who, cli: one ? x.cli : '', pid: one ? x.pid : null,\n"
  "      detail: g.length + ' appointments' });\n"
  "  });\n"
  "  return out;\n"
  "}\n"
  "function renderActivity(){\n  var mount = document.getElementById('actFeed');")

# ════════════════════════════════════════════════════════════════════════════
# P09.15 - the seven Reports KPI tiles wrapped 5 + 2 and 6 + 1. 1415's answer for
#   the home pipeline, on its own container: seven across when seven fit, else a
#   balanced 4 + 3 whose second row spans the width, and the phone keeps its
#   2-up auto-fit (the rule only starts at 560px of container).
# ════════════════════════════════════════════════════════════════════════════
E('P09.15 the KPI tiles',
  ".rptkpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:14px 0;}",
  ".rptkpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:14px 0;}\n"
  "/* P09.15 (1442): seven tiles wrapped 5 + 2 at 1280 and 6 + 1 at 1440. Seven across needs 1040px\n"
  "   (7 x 140 + 6 gaps); under that and over a phone, a balanced 4 + 3 on twelve tracks. A container\n"
  "   query, so it follows the real width at every Text size, as the home pipeline's does (1415). */\n"
  "#reportsView > .wrap{container-type:inline-size;container-name:rptco;}   /* the page column: its 18px top padding means the containment moves no margin */\n"
  "@container rptco (min-width:560px) and (max-width:1039px){\n"
  "  #rptKpis{--cr-stack:\"P09.15 a balanced 4 + 3; the auto-fit base stays for the phone and for seven across\";grid-template-columns:repeat(12,minmax(0,1fr));}\n"
  "  #rptKpis > .rptkpi{grid-column:span 3;}\n"
  "  #rptKpis > .rptkpi:nth-child(n+5){grid-column:span 4;}\n"
  "}")

for label, a, b in EDITS:
    s = one(s, a, b)

pl.write_atomic(P, s)
print('patch_1442_desktop: %d edits applied to %s' % (len(EDITS), P))
