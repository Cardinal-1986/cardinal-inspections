"""Build 1484: a sales rep gets the Assistant, and sees only their own clients.
The surgery is patch_1484_sales.py (run it first). This file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-21 build 1483<", ">v2026-11-21 build 1484<")
s = one(s, """  { b: 1483, d:'2026-11-21',""",
"""  { b: 1484, d:'2026-11-21', t:'The Assistant for a sales rep, on their own jobs only', s:'The Ask button now appears for one sales rep as well as the office. For a rep it works only on the jobs that rep created or is assigned to, plus their own commissions and draws: it cannot see other reps\\u2019 jobs, crews or crew pay, community partners, or company-wide totals, and it says so when asked. A rep can ask it to change their own jobs, appointments, punch-outs and claim notes, still only on Approve; it cannot change money or delete anything. Every other rep is unchanged.' },
  { b: 1483, d:'2026-11-21',""")
pl.write_atomic(P, s)
print('ok 1484')
