"""Build 1438 — the Production boxes go four across only where four labels fit.

The board's four boxes (Needs ordered / Ordered / Scheduled / Punch-outs) are 2-up on a
phone and were forced 4-up from 1100px by two desktop twins (body.cr-lnav-on, and the
767 @media twin), whatever the width. Measured as Curtis in Chromium on 1437, a label
is cut (scrollWidth > clientWidth) at:
  Normal   1100 (all four), 1194 (three), 1280 ("Scheduled" 91 > 80)
  Large    every width up to 1440 ("Scheduled" 91 > 76)
  Larger   every width up to 1600 ("Scheduled" 91 > 73)
Sun (1436) already fixed this for itself by going 2x2 below a per-step width; this does
the same for everyone else, and Sun's own higher-specificity rules are unchanged.

E1  the body.cr-lnav-on twin's 4-up declaration is deleted (the rule keeps nothing else)
E2  the 767 @media(min-width:1100px) twin's .pbtiles line is deleted
E3  4-up returns per Text size step at the width where every label fits:
      Normal >= 1366, Large >= 1600, Larger >= 1800
    (a media query sees the unzoomed viewport, so the threshold is per step — the
    reasoning Sun's 1700/1950/2200 rules already record)
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
orig = s
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

TWIN = 'body.cr-lnav-on #cr-pb .pbtiles{ --cr-stack:"desktop twin of the 2-up phone grid, which stays"; grid-template-columns:repeat(4,minmax(0,1fr)); }\n'
# E1 + E3 — the cr-lnav-on twin goes; the width-gated 4-up rules take its place
s = one(s, TWIN, """/* 1438: four across only where four labels fit. Forced 4-up from 1100px, the boxes cut
   "Scheduled" (and at 1100 all four labels) at Normal up to 1280, at Large up to 1440 and
   at Larger up to 1600. A media query sees the unzoomed viewport, so the width is per Text
   size step, as Sun's own 1700/1950/2200 rules record; Sun keeps those, which outrank these. */
@media (min-width:1366px){ :root:not([data-cr-text]) #cr-pb .pbtiles{ --cr-stack:"desktop twin of the 2-up phone grid, which stays"; grid-template-columns:repeat(4,minmax(0,1fr)); } }
@media (min-width:1600px){ :root[data-cr-text="lg"] #cr-pb .pbtiles{ --cr-stack:"desktop twin of the 2-up phone grid, which stays"; grid-template-columns:repeat(4,minmax(0,1fr)); } }
@media (min-width:1800px){ :root[data-cr-text="xl"] #cr-pb .pbtiles{ --cr-stack:"desktop twin of the 2-up phone grid, which stays"; grid-template-columns:repeat(4,minmax(0,1fr)); } }
""")
# E2 — the 767 media twin's tile line goes
s = one(s, """@media (min-width:1100px){
  #cr-pb .pbtiles{ --cr-stack:"desktop twin of the 2-up phone grid, which stays"; grid-template-columns:repeat(4,minmax(0,1fr)); }
  #cr-pb .pbsplit{""", """@media (min-width:1100px){
  /* 1438: the .pbtiles 4-up line moved to the width-gated rules above */
  #cr-pb .pbsplit{""")
assert TWIN not in s and orig.count('repeat(4,minmax(0,1fr)); }') - 2 + 3 == s.count('repeat(4,minmax(0,1fr)); }')
pl.write_atomic(P, s)
print('patch_1438_tiles: 3 edits')
