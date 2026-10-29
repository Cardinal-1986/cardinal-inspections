"""Build 1427 — contracts sent by link: the Notice of Cancellation, a signed copy, initials, a co-buyer,
a readable phone page, and a check for blanks before sending (29 Oct 2026). Stamp and CHANGELOG only;
the surgery is patch_1427_contracts.py (index.html) and patch_1427_api.py (api/share.js, clientsign.js,
senddoc.js, vercel.json)."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-10-29 build 1426<", ">v2026-10-29 build 1427<")
s = one(s, """  { b: 1426, d:'2026-10-29',""",
"""  { b: 1427, d:'2026-10-29', t:'Contracts sent by link: notices, a signed copy, initials and a co-buyer', s:'A contract sent by link now reads at normal size on a phone instead of tiny print. It links straight to the Terms and Conditions and both Notice of Cancellation copies, on the page, in the signing box and in the email, instead of pointing at a staff menu the homeowner cannot open. When the homeowner signs they type their initials, which go into every Initials box, and a named co-buyer can sign in the same box or later from the same link. The homeowner can have the signed copy emailed to them with the Terms and Notices attached, and the rep\\u2019s email says whether it went. Answers show as plain text and blank fields as blank lines. On a contract with blanks, Text to sign, Share link, Email to client and signing in person now ask once and list the blanks: Fill them, or send anyway. Uploading a signed contract now tells Curtis and the office; it does not move the stage. Inspection report links read on a phone, and their section numbers match the Contents again.' },
  { b: 1426, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1427')
