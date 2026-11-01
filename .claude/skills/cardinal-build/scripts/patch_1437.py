"""Build 1437 — the Clients bar's portal chips wrap instead of running off both edges.
The surgery is patch_1437_crmbar.py (run it first); this file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-01 build 1436<", ">v2026-11-01 build 1437<")
s = one(s, """  { b: 1436, d:'2026-11-01',""",
"""  { b: 1437, d:'2026-11-01', t:'Clients: the portal chips never run off the screen', s:'On a phone, the All / Retail / Claims / Community chips at the bottom of Clients could run off both edges of the screen once the counts got big or the text was set larger (and in Sun), and the All chip could not be reached. When they do not fit on one line they now wrap onto a second line, and the list leaves room for it.' },
  { b: 1436, d:'2026-11-01',""")
pl.write_atomic(P, s)
print('ok 1437')
