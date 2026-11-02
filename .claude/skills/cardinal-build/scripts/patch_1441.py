"""Build 1441 — menus, icons and messages: round-1 leftovers re-checked on 1438.
The surgery is patch_1441_shell.py (run it first); this file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-02 build 1440<", ">v2026-11-02 build 1441<")
s = one(s, """  { b: 1440, d:'2026-11-02',""",
"""  { b: 1441, d:'2026-11-02', t:'Menus: one drawn icon per place, clearer questions, quieter screens', s:'The menu no longer mixes colour emoji with drawn icons, and no two places share the same icon, so Activity Feed, Storm Data and Quick Inspection, or Commissions and Invoices, are told apart at a glance. Leftover emoji are gone from the Resource Library buttons, the + New contract menu, the appointment rows and the day sheet, and day-sheet rows now say whether each is a job, a drop or an appointment. Yes/no questions name what they do (Advance, Delete permanently, Sign out anyway) instead of Continue, and the ones that cannot be undone use the red button. Uploads, imports and texted pay links now show as a success. A rep\\u2019s Tools menu no longer offers Reports and Settings, Self Check sits above the drawer footer and leaves Back where it was, the rail and header buttons use the app\\u2019s own font, and the pressed Text size and Appearance buttons in the menu follow the Community and Production colours.' },
  { b: 1440, d:'2026-11-02',""")
pl.write_atomic(P, s)
print('ok 1441')
