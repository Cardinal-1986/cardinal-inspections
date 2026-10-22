"""Build 1384 — one card, one button, one heading (consistency pass, Option A; Theo picked A from the
22 Oct preview). On the five main phone screens (Home, Jobs, client page, Schedule, Invoices & Payments,
dark and light) cards had six corner styles and three paddings, buttons five corner radii, and headings
four weights and several letter-spacings. Now: cards 12px corners and 14px padding, buttons 10px corners
(the --btn-rad token and every rule that won over it), card titles weight 800, normal letter-spacing.

DELETION AT SOURCE, not an override layer: each edit is the declaration Chromium reported as the WINNER
(CSS.getMatchedStylesForNode, scripts/_cons_find.mjs), changed in place. Each is pinned to its byte offset
in the 1383 tree and asserted before it is written, applied from the end of the file backwards.

Deliberately NOT changed: the obsidian Activity tiles (.actbox, a sanctioned exception), the pipeline
segment (.pipebtn), tabs and pills, the serif page titles and greeting (Georgia, their own design), big
money figures (their tight tracking is deliberate), and value text the census caught by size alone
(Job Details values, payment sums) — those are not headings."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
EDITS = [
    (6183757, 'border-radius:9px;', 'border-radius:10px;'),
    (5770425, "font:700 15px/1.3 'Segoe UI',Arial,sans-serif;", "font:800 15px/1.3 'Segoe UI',Arial,sans-serif;"),
    (5770239, 'border-radius:14px;', 'border-radius:12px;'),
    (5770141, 'padding:12px 16px;', 'padding:14px;'),
    (5762476, 'letter-spacing:-.01em;', 'letter-spacing:normal;'),
    (5762178, 'padding:15px 16px;', 'padding:14px;'),
    (5762057, 'border-radius:16px;', 'border-radius:12px;'),
    (5760066, 'border-radius:16px;', 'border-radius:12px;'),
    (5755463, 'padding:15px 17px;', 'padding:14px;'),
    (5755443, 'border-radius:14px;', 'border-radius:12px;'),
    (5751276, 'border-radius:11px;', 'border-radius:10px;'),
    (5732371, 'border-radius:11px;', 'border-radius:10px;'),
    (5686900, 'border-radius:12px;', 'border-radius:10px;'),
    (5380106, 'border-radius:11px;', 'border-radius:10px;'),
    (5379752, 'border-radius:8px;', 'border-radius:10px;'),
    (5375413, 'border-radius:var(--btn-rad,12px);', 'border-radius:var(--btn-rad,10px);'),
    (4889467, 'font-weight:700;', 'font-weight:800;'),
    (4888985, 'border-radius:10px;', 'border-radius:12px;'),
    (4882704, 'border-radius:10px;', 'border-radius:12px;'),
    (4880196, 'border-radius:10px;', 'border-radius:12px;'),
    (4879863, 'font-weight:700;', 'font-weight:800;'),
    (4604888, 'padding:11px 13px;', 'padding:14px;'),
    (4545550, 'border-radius:11px;', 'border-radius:12px;'),
    (4385575, 'letter-spacing:.01em;', 'letter-spacing:normal;'),
    (4385544, 'font-weight:700;', 'font-weight:800;'),
    (4383514, 'border-radius:9px;', 'border-radius:10px;'),
    (175235, 'border-radius:13px;', 'border-radius:12px;'),
    (153342, 'letter-spacing:.05em;', 'letter-spacing:normal;'),
    (150471, 'padding:14px 11px;', 'padding:14px;'),
    (129900, 'letter-spacing:.02em;', 'letter-spacing:normal;'),
    (117072, 'border-radius:8px;', 'border-radius:10px;'),
    (116909, 'letter-spacing:.05em;', 'letter-spacing:normal;'),
    (116808, 'letter-spacing:.03em;', 'letter-spacing:normal;'),
    (99901, 'padding:10px 14px;', 'padding:14px;'),
    (99866, 'border-radius:10px;', 'border-radius:12px;'),
    (97785, 'letter-spacing:.05em;', 'letter-spacing:normal;'),
    (77373, 'padding:12px 14px;', 'padding:14px;'),
    (69909, 'padding:14px 16px;', 'padding:14px;'),
    (29074, 'padding:12px;', 'padding:14px;'),
    (28360, 'border-radius:13px;', 'border-radius:12px;'),
    (15198, 'border-radius:5px;', 'border-radius:10px;'),
    (11035, 'border-radius:var(--btn-rad,12px);', 'border-radius:var(--btn-rad,10px);'),
    (9586, '--btn-rad:12px;', '--btn-rad:10px;'),
    (5144, 'border-radius:8px;', 'border-radius:10px;'),
]
assert EDITS == sorted(EDITS, reverse=True)
for off, old, new in EDITS:
    assert s[off:off + len(old)] == old, (off, old, s[off:off + len(old)])
    s = s[:off] + new + s[off + len(old):]
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)
one(">v2026-10-21 build 1383<button", ">v2026-10-22 build 1384<button")
one("""  { b: 1383, d:'2026-10-21',""",
"""  { b: 1384, d:'2026-10-22', t:'Cards, buttons and headings match', s:'The main screens now use one shape for each thing. Every card has the same rounded corners and the same space inside, every button has the same corners, and card titles are the same weight. Before, the home screen alone had six different card styles and five button shapes. Colors and sizes are unchanged.' },
  { b: 1383, d:'2026-10-21',""")
pl.write_atomic(path, s)
print('ok 1384 (%d edits)' % len(EDITS))
