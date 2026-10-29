"""Build 1424 — estimates and invoicing after judges 2 and 5 of Theo's audit panel (29 Oct 2026). Step 2 of 2: the
stamp and the CHANGELOG. Step 1 is patch_1424_estinv.py (the surgery); patch_1424_gates.py brings six gates that
pinned the old mechanism up to the contract they protect.

    python3 patch_1424_estinv.py index.html && python3 patch_1424.py index.html
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:80])
    return s.replace(a, b, 1)
s = one(s, ">v2026-10-29 build 1423<", ">v2026-10-29 build 1424<")
s = one(s, """  { b: 1423, d:'2026-10-29',""",
"""  { b: 1424, d:'2026-10-29', t:'Estimates start from the job\\u2019s measurements; invoices say what is really owed', s:'Estimates now start from the job\\u2019s own measurements \\u2014 the roof squares, eaves and ridges from Roofr or Hover fill the lines, and each line says where its number came from. The line arrows and \\u00d7 are thumb-sized, a removed line comes back with Undo, and closing with unsaved work offers Save and close first. A published estimate shows once on the client page, and printed estimates show the total once, at the end. Invoices say Overdue, Draft, Partly paid or Paid in full instead of Deposit Paid for everything, carry Cardinal\\u2019s address and phone and say where to mail a check. Recording a payment shows a green confirmation, and a Community job priced by its contract shows its real value and balance.' },
  { b: 1423, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1424')
