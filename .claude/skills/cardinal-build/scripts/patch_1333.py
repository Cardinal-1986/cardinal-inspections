"""Build 1333 — every crew can be booked from the dispatch board (Theo, 13 Oct: "when I tried to
show Curtis how to schedule a job and tried to pick Santiago, he can't be selected. Only Beto").

Measured: five roofing crews, all active (Alberto "Beto" Campuzano Rutledge, Daniel Sarceno, Diego
Hernandez, Felipe, Santiago Gutierrez). The Magnet Board (cr-disp, 949) folds a trade's crews with
nothing booked this week behind "N idle roofing crews · tap to show", and when NO crew in the trade
is booked it shows just the first idle one — alphabetically, Alberto. So with a job armed to book,
Beto's row was the only row of day squares to tap. Nothing was missing; it was folded.

Fix: while a job is in the hand (a Needs-a-crew chip armed, or a booked job picked up to move),
every crew of every trade is shown, so any of them can take it. Browsing the week, the quiet crews
still fold as before.
Usage: python3 patch_1333.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
FILE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
s = pl.load(FILE)
def one(old, new):
    global s
    assert s.count(old) == 1, (old[:90], s.count(old))
    s = s.replace(old, new)

one("""        if(showIdle[tr]){ lanes += idle.map(lane).join(''); }""",
"""        /* 1333: a job in the hand shows EVERY crew — booking Santiago must not need a hidden tap first */
        if(showIdle[tr] || armed || mvWo){ lanes += idle.map(lane).join(''); }""")

one(""">v2026-10-13 build 1332<button""", """>v2026-10-13 build 1333<button""")
CL = "{ b: 1332, d:'2026-10-13',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1333, d:'2026-10-13', t:'Every crew can be booked', s:'On the dispatch board, tapping a job that needs a crew now shows every crew\\u2019s row, so any of them can be picked. Before, crews with nothing booked that week were folded away behind \\u201cidle crews \\u00b7 tap to show\\u201d, and only the first one was tappable. Browsing the week, quiet crews still fold to keep the board short.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1333 applied')
