"""Build 1437 — the Clients bar's portal chips wrap instead of running off both edges.

#cdCrmBar is the phone's only way to filter the Clients directory by portal. It was a
nowrap strip with a HIDDEN scrollbar and justify-content:center. A centred flex row
that overflows spills off BOTH edges, and a scroller cannot scroll to a negative
offset, so the left spill could not be reached at all. Measured at 390 in Chromium
on 1436:
  Normal, fixture counts (1 digit)     fits exactly (390 of 390)
  Normal, 3-digit counts               "All" 7px off the left, unreachable
  Large / Sun                          14px off the left (36 with 3-digit counts)
  Larger                               41px off the left (66 with 3-digit counts)
1435 is identical at Large and Larger; Sun inherits it through its size step and
made it the field accounts' default. Build 993 recorded this bar as clean because
the fixture's single-digit counts were the one case that fitted — the same reason
984 gives for .cr-cth-tabs.

E1  flex-wrap:wrap — 984's and 993's fix for the other eight hidden-scrollbar strips.
    Every chip is already white-space:nowrap; flex:0 0 auto, so a row that fits is
    unchanged and one that does not becomes two centred rows. No media query.
E2  .cd-wrap's bottom clearance 120 -> 160px: the bar is position:fixed over the
    list, and two rows (~81px) on top of the 62px tab bar need 143px, so the last
    client is not left under it. Four chips never make a third row at 390.
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

# E1
s = one(s, ".cd-crmbar{position:fixed;left:0;right:0;bottom:calc(62px + env(safe-area-inset-bottom,0px));display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;",
           ".cd-crmbar{position:fixed;left:0;right:0;bottom:calc(62px + env(safe-area-inset-bottom,0px));display:flex;gap:6px;flex-wrap:wrap;overflow-x:auto;")
s = one(s, ".cd-crmbar::-webkit-scrollbar{display:none;}\n",
""".cd-crmbar::-webkit-scrollbar{display:none;}
/* 1437: .cd-crmbar WRAPS (it was nowrap). Centred and nowrap, an overflowing row spilled off
   both edges and the left spill could not be scrolled to: "All" sat 7px off the left at
   Normal with three-digit counts, 14 at Large and in Sun, 41 at Larger. 984/993's fix. */
""")
# E2
s = one(s, ".cd-wrap{padding-bottom:120px;}",
           ".cd-wrap{padding-bottom:160px;}/* 1437: was 120 — room for the CRM bar's second row (62 tab bar + ~81 two rows) */")
assert 'flex-wrap:wrap;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none' in s and 'flex-wrap:wrap' not in orig.split('.cd-crmbar{',1)[1].split('}',1)[0]
pl.write_atomic(P, s)
print('patch_1437_crmbar: 3 edits')
