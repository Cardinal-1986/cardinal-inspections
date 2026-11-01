"""Build 1435 — Theo's taste calls T1 C and T3 B (picked 1 Nov 2026).
The surgery is patch_1435_reports_forms.py (run it first); this file stamps the build and adds the What's New entry.
  T1 C  Graphs & Reports follows the theme (557's light twin in light); the 2px red left edge and the two
        other decorative red rules on Reports go in both themes; chart ink follows the theme, and a flip
        re-inks drawn charts via the new 'cr-theme' event; the 1415 What's New line is corrected
  T3 B  the eight .projform sheets go dark in dark mode (--sheet-* tokens, one dark-only block); light is
        unchanged; the signature pad stays a white writing surface
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-01 build 1434<", ">v2026-11-01 build 1435<")
s = one(s, """  { b: 1434, d:'2026-11-01',""",
"""  { b: 1435, d:'2026-11-01', t:'Reports follow light mode, and the form sheets go dark in dark mode', s:'Graphs & Reports now follows the theme. In light mode its panels are light, and the chart labels are dark enough to read; switching theme re-colours charts already on screen. The red stripe down the left of each panel is gone in both themes, along with the red rules under the table headings and above the team total; red stays on the selected buttons and in the numbers. A few labels on Reports that were too faint in dark mode now read. In dark mode the form sheets (the profile, Add project and Edit client info, the roofing and GC checklists, the lead forms, appointments and the signature sheet) are dark with light text instead of white. Light mode is unchanged, and the signature pad stays white to write on.' },
  { b: 1434, d:'2026-11-01',""")
pl.write_atomic(P, s)
print('ok 1435')
