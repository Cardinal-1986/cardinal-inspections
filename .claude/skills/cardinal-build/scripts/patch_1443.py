"""Build 1443 — accessibility and sheets: round-1 leftovers re-checked on 1438.
The surgery is patch_1443_a11y.py (run it first); this file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-02 build 1442<", ">v2026-11-02 build 1443<")
s = one(s, """  { b: 1442, d:'2026-11-02',""",
"""  { b: 1443, d:'2026-11-02', t:'Easier to tap, easier to read, and the keyboard works', s:'Small controls that were hard to hit on a phone now have a full-size tap area: Open full claim (and tapping the claim card itself opens the claim), the partner buttons, + Add on a punch card, the stage menu, Remember me, Forgot password, the punch search and the document title. The Back chip in the document editor is a real button. Faded numbers that were hard to read, such as out-of-month days on the Production calendar, Community zero counts and the Clients bar counts, are now a solid readable grey. On a desktop with a keyboard, the top bar and the home and Clients cards can be reached with Tab and opened with Enter, and Tab stays inside a form or the estimate builder instead of wandering to the page behind it. Unlabelled search boxes, sort menus and calendar arrows now say what they are for screen readers. Escape closes the Ask sheet and Self Check, and Back closes the Ask sheet without leaving the page. On a desktop the top bar is 3 pixels taller so every item in it is a full 44 pixels.' },
  { b: 1442, d:'2026-11-02',""")
pl.write_atomic(P, s)
print('ok 1443')
