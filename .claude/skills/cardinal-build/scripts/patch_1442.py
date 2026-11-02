"""Build 1442 — desktop layouts: round-1 leftovers re-checked on 1438.
The surgery is patch_1442_desktop.py (run it first); this file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-02 build 1441<", ">v2026-11-02 build 1442<")
s = one(s, """  { b: 1441, d:'2026-11-02',""",
"""  { b: 1442, d:'2026-11-02', t:'Desktop: wider screens get used', s:'On a laptop or desktop the Clients directory shows its three portal columns from 1280 pixels wide instead of 1600, and a client profile splits into two columns there too, so far less scrolling. Insurance profiles get the same two columns, and the Cardinal Truth hub fills the screen beside the menu instead of sitting in a narrow strip. Invoices & AR and Owner Review now sit beside the left menu instead of covering it, and their row buttons are sized to their labels. The Schedule Board shows its month grid from 1280, and every booking on it names the client. Reports lays its seven numbers out evenly, the Activity card on home folds one person\\u2019s same-day bookings into one line, cards lift under the mouse, the Google Reviews card on an insurance profile reads in light mode, and the A/R status pills match the rest of the app in dark mode.' },
  { b: 1441, d:'2026-11-02',""")
pl.write_atomic(P, s)
print('ok 1442')
