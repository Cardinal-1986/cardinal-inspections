"""Build 1430 — navigation and shell fixes from the round-1 audit (29 Oct 2026). Stamp and CHANGELOG only;
the surgery is patch_1430_nav.py."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-10-29 build 1429<", ">v2026-10-29 build 1430<")
s = one(s, """  { b: 1429, d:'2026-10-29',""",
"""  { b: 1430, d:'2026-10-29', t:'Escape and Back close pop-ups, + New works over Production, a tidier menu', s:'Escape and the phone\\u2019s Back button now close the pop-up on top (Record payment, the day sheet, the lead form, the Front Door) instead of moving the page underneath. Tapping a bottom tab or a menu row closes any open pop-up first. + New works over the Production board, Punch & Repairs and Crew Dispatch. The Undo message after a stage move sits above the bottom tabs. Switch portal keeps you where you are, and the Front Door has a close button. The menu counts only what you can see, hides empty headings, and no longer shows reps doors that only say Admin only. A field account tapping a job on the board or Dispatch opens its punch card instead of an error. In light mode the desktop menu shows a different icon for Clients, Leads & Jobs and Estimates.' },
  { b: 1429, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1430')
