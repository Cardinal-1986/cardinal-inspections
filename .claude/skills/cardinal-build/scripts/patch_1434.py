"""Build 1434 — five of Theo's taste calls (picked 1 Nov 2026): T2 B, T5 B, T6 B, T9 B, T10 keep #1.
The surgery is patch_1434_taste.py (run it first); this file stamps the build and adds the What's New entry.
  T2  B   the phone menu opens with Daily expanded and the other sections folded, every time, nothing remembered
  T5  B   a signed agreement says so in the editor's own notice bar; the line is never saved, sent or printed
  T6  B   the Production board in the app's one sans typeface, tabular figures on every number
  T9  B   + New has one way to start a client, "New lead"; the Lead form gains Job cost (admins only, as 1203)
  T10 #1  on the desktop the page title is the one portal switcher (pill strip, rail segment, rail row removed)
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-10-30 build 1433<", ">v2026-11-01 build 1434<")
s = one(s, """  { b: 1433, d:'2026-10-30',""",
"""  { b: 1434, d:'2026-11-01', t:'Daily opens with the menu, one New lead, one portal switcher on the desktop', s:'On a phone, the menu now opens with Daily already expanded; the other sections stay folded. When a signed agreement is opened in the editor, a line at the top says so: \\u201cYou\\u2019re editing a signed agreement. Saving keeps the signed one on file as a version.\\u201d That line is never saved, sent or printed. The Production board uses the same typeface as the rest of the app, and its numbers still line up. + New has one way to start a client, New lead, and the lead form gains Job cost for admins. On the desktop, the page title is the one place to switch portal: the pills in the top bar, the switch at the top of the left menu and its Switch portal row are gone.' },
  { b: 1433, d:'2026-10-30',""")
pl.write_atomic(P, s)
print('ok 1434')
