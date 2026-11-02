"""Build 1440 — phone, field and forms: round-1 leftovers re-checked on 1438.
The surgery is patch_1440_field.py (run it first); this file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-02 build 1439<", ">v2026-11-02 build 1440<")
s = one(s, """  { b: 1439, d:'2026-11-02',""",
"""  { b: 1440, d:'2026-11-02', t:'Phones: Crew Dispatch readable, Lead Source up front, and smaller fixes', s:'On a phone, Crew Dispatch gives the crew name room and stops breaking it mid-word, the open-repairs badge sits inside the crew pill, and the week label fits. Production accounts no longer see a back arrow on Production home that did nothing, and Crew Dispatch spans the row for field accounts. At the larger text sizes the Punch & Repairs tabs wrap instead of cutting off, and a client name keeps its width. New Lead shows Lead Source on the first screen and points at it if it is missing. Punch-out from + New lists every open job. Appointment fields are full size and show readable dates. Tapping an estimate\\u2019s \\u00d7 no longer opens it behind the question, the Ask button no longer covers the end of the Leads list, and the Resource Library\\u2019s buttons stack in one corner.' },
  { b: 1439, d:'2026-11-02',""")
pl.write_atomic(P, s)
print('ok 1440')
