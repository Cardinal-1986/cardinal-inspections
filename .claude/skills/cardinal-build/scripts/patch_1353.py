"""Build 1353 — the wide-screen job page stops jumping when you click (Theo, 3:35 am, with a recording:
"I click one thing and it shifts").
1351 gave the 1600px+ grid `grid-auto-flow: row dense` so the right column would backfill beside the money stack.
Dense packing re-sorts the column every time any card changes height: picking a Job Category opens the Trade
Type chips, Job Details grows, and Assigned To / History / Reviews jump above Location. Removed. The right column
goes back to the plain order 1227 set; the cost is some empty space beside the money cards, which is what Theo
had before 1351 and is the lesser fault (a page that moves under your finger is worse than a gap)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)
one("""  /* the right column backfills beside the stack instead of waiting for the Job Menu's row */
  body:not(.claim-insurance):not(.claim-community) #projectView #acxMount:has(> .crji-stack){ grid-auto-flow:row dense; }
""", """  /* 1353: NO dense packing here — it re-sorted the right column on every height change (a card jumped above
     Location when Job Category opened its Trade Type chips). A gap beside the money cards is the lesser fault. */
""")
one(">v2026-10-16 build 1352<button", ">v2026-10-16 build 1353<button")
one("""  { b: 1352, d:'2026-10-16',""",
"""  { b: 1353, d:'2026-10-16', t:'The job page no longer jumps on a wide screen', s:'On a wide screen, picking a Job Category or anything else that makes a card grow no longer reshuffles the cards on the right. They stay in the same order: Location, Job Details, Assigned To, History, Reviews.' },
  { b: 1352, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('patched', path)
