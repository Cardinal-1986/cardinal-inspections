"""Build 1417 — team messages after judge 13 of Theo's audit panel (29 Oct 2026). Step 2 of 2: the stamp and the
CHANGELOG. Step 1 is patch_1417_comms.py, which does the surgery and leaves both of these alone.

    python3 patch_1417_comms.py index.html && python3 patch_1417.py index.html
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:80])
    return s.replace(a, b, 1)
assert 'function commsPollArm(' in s, 'run patch_1417_comms.py first'
s = one(s, ">v2026-10-29 build 1416<", ">v2026-10-29 build 1417<")
s = one(s, """  { b: 1416, d:'2026-10-29',""",
"""  { b: 1417, d:'2026-10-29', t:'Job messages update by themselves, and tags buzz only the person you mean', s:'A job\\u2019s message thread now updates on its own while it is open, so a note sent from the roof shows up without leaving the screen. On insurance jobs your \\u201cI chased the carrier\\u201d notes appear in the thread. @J no longer buzzes four people \\u2014 the box tells you who will be notified before you hit Send. Pasted links can be tapped, and a tag alert opens straight to the thread.' },
  { b: 1416, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1417')
