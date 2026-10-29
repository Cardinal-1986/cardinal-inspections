"""Build 1418 — colour after judge 16 of Theo's audit panel (29 Oct 2026). Step 2 of 2: the stamp and the
CHANGELOG. Step 1 is patch_1418_colour.py, which does the surgery and leaves both of these alone.

    python3 patch_1418_colour.py index.html && python3 patch_1418.py index.html
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:80])
    return s.replace(a, b, 1)
assert 'J16 (judge 16, MAJOR 1)' in s, 'run patch_1418_colour.py first'
s = one(s, ">v2026-10-29 build 1417<", ">v2026-10-29 build 1418<")
s = one(s, """  { b: 1417, d:'2026-10-29',""",
"""  { b: 1418, d:'2026-10-29', t:'One colour per portal, and Insurance follows your light/dark setting', s:'Insurance now follows your light/dark setting like the rest of the app, and the one switch changes both \\u2014 no more white Insurance pages in dark mode. Each portal has one colour \\u2014 red Retail, teal Insurance, green Community \\u2014 on the + button, the portal switch and client names. The last white boxes, hard-to-read labels and tiny text on the dark screens are fixed, and the light pipeline is a flat strip instead of glossy balls.' },
  { b: 1417, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1418')
