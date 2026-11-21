"""Build 1483: the Assistant reads PDFs filed on a job (Roofr measurements).
The change is in api/assistant.js (read_file). This file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-16 build 1481<", ">v2026-11-21 build 1483<")
s = one(s, """  { b: 1481, d:'2026-11-16',""",
"""  { b: 1483, d:'2026-11-21', t:'The Assistant reads measurement reports', s:'The Assistant can now open a PDF filed on a job and read it: a Roofr, Hover or EagleView measurement report, an insurance scope, signed paperwork. Ask it for a job\\u2019s measurements and it reads the report itself instead of asking you to type the numbers in. It quotes the numbers as the report gives them and says when something is not in the report. It reads PDFs only, never photos, and only files you could open yourself.' },
  { b: 1481, d:'2026-11-16',""")
pl.write_atomic(P, s)
print('ok 1483')
