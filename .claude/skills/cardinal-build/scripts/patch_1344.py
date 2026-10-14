"""Build 1344 — several ACCEPTED estimates on one job add up (Theo, 14 Oct: "3a" — estimates for different
trades add up). Estimates carry no trade, and the jobs with several estimates today are mostly OPTIONS for one
roof (shingle / stone-coated / standing seam), so the line is drawn at ACCEPTED: a homeowner accepts windows AND
siding, never two versions of one roof. Sent/draft estimates still price at the largest. Same rule in all five
places: jobFinance (estBest), api/pay.js, api/share.js, api/remind.js, job_total_for() (SQL)."""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'index.html')
apidir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, 'api')
def one(s, old, new):
    n = s.count(old); assert n == 1, (n, old[:90]); return s.replace(old, new)

s = open(path, encoding='utf-8').read()
s = one(s, """    if(tier > cur){ estTier[e.project_id] = tier; estBest[e.project_id] = t; }
    else if(tier === cur && t > (estBest[e.project_id] || 0)) estBest[e.project_id] = t;""",
"""    if(tier > cur){ estTier[e.project_id] = tier; estBest[e.project_id] = t; }
    /* 1344: ACCEPTED estimates add up (windows + siding); sent ones are options, so the largest */
    else if(tier === cur && tier === 2) estBest[e.project_id] = (estBest[e.project_id] || 0) + t;
    else if(tier === cur && t > (estBest[e.project_id] || 0)) estBest[e.project_id] = t;""")
s = one(s, ">v2026-10-14 build 1343<button", ">v2026-10-14 build 1344<button")
s = one(s, """  { b: 1343, d:'2026-10-14',""",
"""  { b: 1344, d:'2026-10-14', t:'Accepted estimates add up', s:'When a homeowner accepts more than one estimate on a job \\u2014 windows and siding, say \\u2014 the job is now worth all of them together, everywhere: the job card, A/R, invoices and the pay link. Estimates that are only sent or drafted are still treated as options, so the job shows the largest one.' },
  { b: 1343, d:'2026-10-14',""")
pl.write_atomic(path, s)

old_loop = """        if (!e.archived && Number(e.total) > accEst) accEst = Number(e.total);"""
new_loop = """        if (!e.archived && Number(e.total) > 0) accEst += Number(e.total);   // 1344: accepted estimates add up"""
for f in ('pay.js', 'share.js'):
    p = os.path.join(apidir, f); t = open(p, encoding='utf-8').read()
    t = one(t, old_loop, new_loop); pl.write_atomic(p, t)
p = os.path.join(apidir, 'remind.js'); t = open(p, encoding='utf-8').read()
t = one(t, """      if (!e.archived && Number(e.total) > (estByP[e.project_id] || 0)) estByP[e.project_id] = Number(e.total);""",
"""      if (!e.archived && Number(e.total) > 0) estByP[e.project_id] = (estByP[e.project_id] || 0) + Number(e.total);   // 1344: accepted add up""")
pl.write_atomic(p, t)
print('patched', path, apidir)
