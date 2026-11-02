"""Build 1439 — documents, contracts and invoices: round-1 leftovers re-checked on 1438.
The surgery is patch_1439_docs.py (run it first, with index.html and api/share.js); this file stamps
the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-01 build 1438<", ">v2026-11-02 build 1439<")
s = one(s, """  { b: 1438, d:'2026-11-01',""",
"""  { b: 1439, d:'2026-11-02', t:'Documents: cleaner emails and prints, and the Contracts tab tidied', s:'An emailed or printed contract no longer carries the yellow fill-in prompts, empty pick boxes or editing hints. The figure numbers in a shared report match its section numbers. A printed invoice is shorter, without the draft status box, and shows $0.00 rather than \\u2212$0.00; Roof Options with up to three choices prints on one page; grey labels on printed documents are darker. After you email a document it shows as Sent. On a phone, Client signature is on the main bar, signing shows one message instead of two, the client document labels have room, and the invoice editor fits the screen. The Contracts tab has one red button, signed contracts no longer offer Mark sent, and Commissions on a phone shows Net instead of Draws. The home Activity Count says it covers all boards.' },
  { b: 1438, d:'2026-11-01',""")
pl.write_atomic(P, s)
print('ok 1439')
