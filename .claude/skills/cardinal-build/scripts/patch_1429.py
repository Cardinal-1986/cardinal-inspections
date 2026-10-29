"""Build 1429 — forms, documents and small fixes from the round-1 audit (29 Oct 2026). Stamp and CHANGELOG
only; the surgery is patch_1429_forms.py (index.html) and patch_1429_supp.py (supplement.html)."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-10-29 build 1428<", ">v2026-10-29 build 1429<")
s = one(s, """  { b: 1428, d:'2026-10-29',""",
"""  { b: 1429, d:'2026-10-29', t:'Readable contract viewer, lead source, the inspection checklist and small fixes', s:'The contract viewer\\u2019s title is readable in light mode and its buttons are full size. Lead source now shows on the client page whatever the New Lead form saved. The inspection checklist marks every required field, and Save and start report takes you to the first one you missed instead of looking dead. A lead saved with no address no longer shows \\u201c, , OH\\u201d. A punch-out from the home screen asks which job instead of picking the first one. Two questions that said \\u201cOK =\\u201d now name their real buttons, the Activity feed shows dates like Oct 29, 2026, and the last emoji on Quick Inspection, the contract bar and the Supplement card are drawn icons. A printed supplement letter carries Cardinal\\u2019s letterhead, the date and the claim number.' },
  { b: 1428, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1429')
