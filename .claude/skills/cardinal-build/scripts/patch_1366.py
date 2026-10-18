"""Build 1366 — the payment guard's job total counts invoice extra lines (SQL: job_total_extras.sql, APPLIED first).
index.html carries only the stamp and the changelog line; the change is the database function job_total_for()."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)
one(">v2026-10-18 build 1365<button", ">v2026-10-18 build 1366<button")
one("""  { b: 1365, d:'2026-10-18',""",
"""  { b: 1366, d:'2026-10-18', t:'Payments can cover invoice extra lines', s:'When an invoice has extra lines added, the job total now includes them everywhere, including the check that stops a payment being recorded for more than a job is owed. Before, a rep recording the payment for those extra lines would have been told it was too much. Nobody had hit it yet.' },
  { b: 1365, d:'2026-10-18',""")
pl.write_atomic(path, s)
print('ok 1366')
