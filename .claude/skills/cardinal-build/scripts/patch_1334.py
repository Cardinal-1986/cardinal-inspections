"""Build 1334 — the change-order photo can come from the phone's library (Jacob, 14 Oct: "Under change
order it won't let me upload a photo just take a picture").

The box says "Take or choose a photo", but the file input carried capture="environment", which on
iPhone and Android opens the camera directly and offers no library. Dropping the attribute gives the
standard picker: Photo Library, Take Photo, Choose File. Nothing else about the change order moves —
a photo is still required before the homeowner signs.
Left camera-only on purpose: the install-photo slots (1331, the record of the install itself) and the
other in-the-moment camera buttons.
Usage: python3 patch_1334.py [index.html]
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

one("""<input type="file" accept="image/*" capture="environment" id="coFile" aria-label="Photo">""",
    """<input type="file" accept="image/*" id="coFile" aria-label="Photo">""")
one(""">v2026-10-13 build 1333<button""", """>v2026-10-14 build 1334<button""")
CL = "{ b: 1333, d:'2026-10-13',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1334, d:'2026-10-14', t:'Change-order photo from your library', s:'The change order\\u2019s photo box now lets you pick a picture you already took, as well as take a new one. Before, it opened the camera only.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1334 applied')
