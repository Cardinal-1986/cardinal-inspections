"""Build 1444 — the insurance side is called Insurance everywhere.
The surgery is patch_1444_name.py (run it first); this file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-02 build 1443<", ">v2026-11-02 build 1444<")
s = one(s, """  { b: 1443, d:'2026-11-02',""",
"""  { b: 1444, d:'2026-11-02', t:'The insurance side is called Insurance', s:'The insurance side had three names: Cardinal Truth on the Front Door, in the menu and on its own home screen, Insurance in the header, and Claims on the Clients page. It is Insurance everywhere now: the menu row, the Front Door, the home screen heading, the quick-jump list, Self Check and the Clients page columns and chips. Nothing moved and nothing else changed. The Claims button that opens the list of claims keeps its name, because that is the list, not the department.' },
  { b: 1443, d:'2026-11-02',""")
pl.write_atomic(P, s)
print('ok 1444')
