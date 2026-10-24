"""Build 1407 — staff only, end to end (24 Oct 2026 audit, round 11).
Public signup is on in Supabase Auth, so "signed in" does not mean "Cardinal staff".
1. api/companycam-job.js (CompanyCam photos by address) and api/sms-link.js (texts from the company number)
   checked only for a session. Both now require isStaff (api/_staff.js) before anything else.
2. api/clientsign.js returned the database's raw error text to a public signer; it now says a plain sentence
   and logs the detail server-side.
3. staff_only_rls.sql: one RESTRICTIVE policy per RLS table for the authenticated role — non-staff get nothing,
   every existing rule is unchanged. Applied by hand (Theo), before or after this deploy; neither order breaks
   anything, because every current account is staff.
This script carries only the index.html half (stamp + changelog); the api edits are in the same commit."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(P, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)
s = one(s, ">v2026-10-23 build 1406<", ">v2026-10-24 build 1407<")
s = one(s, """  { b: 1406, d:'2026-10-23',""",
"""  { b: 1407, d:'2026-10-24', t:'Staff-only, behind the scenes', s:'No change on screen. The CompanyCam job link and texting a client from the company number now answer Cardinal staff only, and a client who hits a problem signing a document sees a plain message instead of a technical one.' },
  { b: 1406, d:'2026-10-23',""")
pl.write_atomic(P, s)
print('ok 1407')
