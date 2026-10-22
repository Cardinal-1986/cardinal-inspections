"""Build 1387 — the consistency pass (Option A, build 1384) carried to Production, the estimate builder
and Community (Theo, 22 Oct: "4"). Same rule as 1384: cards 12px corners, 14px padding; rounded buttons
10px; the buttons that ARE tiles (Production's summary tiles, Community's doors and the 30-day / A/R
pair) take the card corner; 15px headings weight 800; normal letter-spacing on labels.
Each edit is the declaration Chromium reported as the WINNER (CSS.getMatchedStylesForNode,
scripts/_cons_find3.mjs), changed in place and pinned to its offset in the 1386 tree.
Deliberately NOT changed: Production's calendar day cells (.pbday) and chips (.pbchip), the pipeline
segment (.pipebtn), the Community pipeline box's inner padding (it holds seven segments), form inputs,
and the Georgia page titles."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
EDITS = [
    (4518803, 'border-radius:9px;', 'border-radius:10px;'),
    (4215098, 'padding:10px 12px;', 'padding:14px;'),
    (4215076, 'border-radius:11px;', 'border-radius:12px;'),
    (4214343, "font:700 15px 'Segoe UI',Arial,sans-serif;", "font:800 15px 'Segoe UI',Arial,sans-serif;"),
    (4212609, 'border-radius:11px;', 'border-radius:12px;'),
    (4211751, 'border-radius:11px;', 'border-radius:12px;'),
    (4210363, 'border-radius:11px;', 'border-radius:12px;'),
    (4209522, "font:700 15px 'Segoe UI',Arial,sans-serif;", "font:800 15px 'Segoe UI',Arial,sans-serif;"),
    (4206339, 'border-radius:9px;', 'border-radius:10px;'),
    (3844985, 'border-radius:8px;', 'border-radius:10px;'),
    (3842270, 'border-radius:11px;', 'border-radius:10px;'),
    (3840116, 'border-radius:13px;', 'border-radius:12px;'),
    (3561917, 'letter-spacing:.02em', 'letter-spacing:normal'),
    (3561376, 'padding:14px 16px;', 'padding:14px;'),
    (3561357, 'border-radius:10px;', 'border-radius:12px;'),
    (3554860, 'border-radius:10px;', 'border-radius:12px;'),
    (3546340, 'border-radius:11px;', 'border-radius:10px;'),
]
assert EDITS == sorted(EDITS, reverse=True)
for off, old, new in EDITS:
    assert s[off:off + len(old)] == old, (off, old, s[off:off + len(old)])
    s = s[:off] + new + s[off + len(old):]
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)
one(">v2026-10-22 build 1386<", ">v2026-10-22 build 1387<")
one("""  { b: 1386, d:'2026-10-22',""",
"""  { b: 1387, d:'2026-10-22', t:'Production, estimates and Community match too', s:'The same shapes as the main screens now on Production, the estimate builder and the Community page: cards with the same rounded corners and space inside, buttons with the same corners, and the same heading weight. Colors, sizes and the Production calendar are unchanged.' },
  { b: 1386, d:'2026-10-22',""")
pl.write_atomic(path, s)
print('ok 1387 (%d edits)' % len(EDITS))
