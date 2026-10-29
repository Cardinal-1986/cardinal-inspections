"""Build 1416 — Production, after judge 14 of Theo's audit panel (29 Oct 2026). Step 2 of 2: the stamp and the
CHANGELOG. Step 1 is patch_1416_production.py, which does all the surgery and leaves both of these alone.

    python3 patch_1416_production.py index.html && python3 patch_1416.py index.html
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:80])
    return s.replace(a, b, 1)
assert 'class="pbtoday"' in s, 'run patch_1416_production.py first'
s = one(s, ">v2026-10-29 build 1415<", ">v2026-10-29 build 1416<")
s = one(s, """  { b: 1415, d:'2026-10-29',""",
"""  { b: 1416, d:'2026-10-29', t:'Production: the calendar fills the screen, today up top, Dispatch read-only for the field', s:'On your phone the Schedule button opens the Production calendar with every build and punch-out on it, and today\\u2019s work sits right under the title. On a laptop the full calendar fills the screen instead of hiding in a corner. Scottie sees Crew Dispatch read-only \\u2014 booking is Curtis\\u2019s. A message tells you when nobody was notified, step notes are typed right in the card, and Mark ordered can be undone.' },
  { b: 1415, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1416')
