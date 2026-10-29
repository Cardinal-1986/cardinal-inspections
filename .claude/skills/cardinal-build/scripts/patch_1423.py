"""Build 1423 — inspections after judge 4 of Theo's audit panel (29 Oct 2026). Step 2 of 2: the stamp and the
CHANGELOG. Step 1 is patch_1423_inspections.py, which does all the surgery and leaves both alone.

    python3 patch_1423_inspections.py index.html && python3 patch_1423.py index.html
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:80])
    return s.replace(a, b, 1)
s = one(s, ">v2026-10-29 build 1422<", ">v2026-10-29 build 1423<")
s = one(s, """  { b: 1422, d:'2026-10-29',""",
"""  { b: 1423, d:'2026-10-29', t:'Inspections: real priorities, photos kept, readable on a phone and on paper', s:'Each photo in an AI-written report shows its own priority (no more HIGH on everything), and the high and moderate ones show up in the Summary of Findings. Start without AI keeps your checked photos and stops asking for a title. Quick Inspection\\u2019s buttons are readable, it finds the client from a typed address, and Finish puts your photos into Inspection Photos and offers to start the report with them checked. On a phone the report editor\\u2019s buttons fold away while you scroll and the assistant fits the screen. Printed reports keep the cover on page 1 and the signature lines with their labels, and MODERATE is readable.' },
  { b: 1422, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1423')
