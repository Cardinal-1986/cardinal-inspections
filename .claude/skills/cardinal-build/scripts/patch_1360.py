"""Build 1360 — the nightly CompanyCam sync refreshes the project list too (Theo: "Can you run the sync", then
"Yes, refresh nightly"). The code change is api/companycam-sync.js (projectsPass(), shared by the admin button and
the cron). companycam_projects had not been written since 31 Jul because only the button ran that pass, so a job's
CompanyCam search could not find any project made after. This patch is the app stamp + the changelog line only."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)
one(">v2026-10-16 build 1359<button", ">v2026-10-16 build 1360<button")
one("""  { b: 1359, d:'2026-10-16',""",
"""  { b: 1360, d:'2026-10-16', t:'New CompanyCam projects show up by morning', s:'The nightly CompanyCam sync now refreshes the list of CompanyCam projects as well as the photos. That list had stopped updating at the end of July, so a job could not find a CompanyCam project made after that. New projects now show up the next morning.' },
  { b: 1359, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('ok 1360')
