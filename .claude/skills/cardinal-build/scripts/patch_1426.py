"""Build 1426 — client names show in full (29 Oct 2026).

Five judges and the chair, re-measured here at 1425 in Chromium (visible width of the name / its full width):
Clients list on a phone 87/149px ("Sample Ins…"), Clients at 1600 69/149px, the desktop home "Recent leads" row
at 1280 11/122px — one letter. At the largest text size every Clients card's name measured 0px. Both rows were
one nowrap flex line shared by the name and its neighbours (PO, star, portal tag; PO, stage chip, rep), and the
name — the only flexible item — was the one that gave way.

Edited in place (no override layer): the Clients card's name takes its own full line and wraps, with the PO, the
star and the portal tag on the line under it; a Recent leads row keeps at least 150px for the name and lets the
stage and rep drop to a second line when the card is too narrow.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

s = one(s, """.cd-card .nmrow{display:flex;align-items:center;gap:8px;}""",
""".cd-card .nmrow{display:flex;align-items:center;gap:2px 8px;flex-wrap:wrap;}   /* 1426: the name takes its own line */""")
s = one(s, """.cd-name{font-weight:800;font-size:15px;color:var(--cc,#c9a227);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}""",
""".cd-name{font-weight:800;font-size:15px;color:var(--cc,#c9a227);min-width:0;flex:1 1 100%;order:-1;line-height:1.25;overflow-wrap:anywhere;}   /* 1426: was one nowrap line shared with PO, star and tag — 87 of 149px showed on a phone, 0px at the largest text size */""")
s = one(s, """.kplrow{display:flex;align-items:center;gap:9px;background:linear-gradient(180deg,var(--rbe-bg1),var(--rbe-bg2));""",
""".kplrow{display:flex;align-items:center;flex-wrap:wrap;gap:4px 9px;background:linear-gradient(180deg,var(--rbe-bg1),var(--rbe-bg2));""")
s = one(s, """.kplrow .nm{flex:1;min-width:0;font:800 13px""",
""".kplrow .nm{flex:1 1 150px;min-width:150px;font:800 13px""")   # 1426: 11 of 122px showed at 1280

s = one(s, """  #cr-namebar .nb-nm{
    font:800 18px Georgia,'Times New Roman',serif; color:var(--rbe-head,#fff);
    line-height:1.15; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }""", """  #cr-namebar .nb-nm{
    font:800 18px Georgia,'Times New Roman',serif; color:var(--rbe-head,#fff);
    line-height:1.15; overflow-wrap:anywhere;   /* 1426: wraps instead of cutting — 119 of 161px showed */
  }""")

s = one(s, ">v2026-10-29 build 1425<", ">v2026-10-29 build 1426<")
s = one(s, """  { b: 1425, d:'2026-10-29',""",
"""  { b: 1426, d:'2026-10-29', t:'Client names show in full', s:'Client names were cut to a few letters on the Clients list and to a single letter on the home screen\\u2019s Recent leads, and disappeared at the largest text size. The name now gets its own line on a client card, and Recent leads keeps room for it, moving the stage and rep down a line when space runs out.' },
  { b: 1425, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1426')
