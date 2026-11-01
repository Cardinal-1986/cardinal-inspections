"""Build 1436 — Sun, a third appearance (Theo's T8 C pick, 1 Nov 2026).
The surgery is patch_1436_sun.py (run it first); this file stamps the build and adds the What's New entry.
  Menu -> Appearance: Dark · Light · Sun. Sun = the light theme + data-cr-sun on :root: inks at >= 7:1,
  one weight heavier, one Text size step up. Production and field accounts with no stored choice open in
  Sun; a stored Dark or Light wins. Also fixed for everyone: the day sheet in Light (1.02:1) and Crew
  Dispatch at the larger Text sizes (a tapped day over-scrolled; the Needs a crew tray ran off the edge).
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-01 build 1435<", ">v2026-11-01 build 1436<")
s = one(s, """  { b: 1435, d:'2026-11-01',""",
"""  { b: 1436, d:'2026-11-01', t:'Sun: a third appearance for working outside', s:'Menu \\u2192 Appearance now has a third choice, Sun, for reading the screen outside in daylight: a white background, near-black text, heavier letters, one size larger. Production and field accounts start in Sun unless they have already picked Dark or Light, and anyone can change it in Menu \\u2192 Appearance. Also fixed for everyone: the Production day sheet is readable again in Light, and at the larger text sizes Crew Dispatch no longer jumps past the day you tap or runs off the edge of the screen.' },
  { b: 1435, d:'2026-11-01',""")
pl.write_atomic(P, s)
print('ok 1436')
