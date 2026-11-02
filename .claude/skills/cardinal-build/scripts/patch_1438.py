"""Build 1438 — the Production boxes go four across only where their labels fit.
The surgery is patch_1438_tiles.py (run it first); this file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-01 build 1437<", ">v2026-11-01 build 1438<")
s = one(s, """  { b: 1437, d:'2026-11-01',""",
"""  { b: 1438, d:'2026-11-01', t:'Production: the four boxes stop cutting their labels on a laptop', s:'On a laptop-sized screen the Production board squeezed its four boxes (Needs ordered, Ordered, Scheduled, Punch-outs) into one row and cut their labels off, and at the larger text sizes it did that on most desktop screens. The boxes now sit two by two until the screen is wide enough for all four labels, the way Sun already shows them.' },
  { b: 1437, d:'2026-11-01',""")
pl.write_atomic(P, s)
print('ok 1438')
