"""Build 1420 — Home is Production's hub for a production account (29 Oct 2026).

Found by the 1416 builder, not fixed there. Curtis's bottom-bar Home tab, and the header's gold house, ran
goHome(), whose last branch is showHome() — the RETAIL home, with pipeline stage counts and the Accounts
Receivable dollar figure. 1038, 1165 and 1188 each state the doctrine this broke: a production account backs out
to the Production hub, never to the retail home ("no stats strips or partner money"). Production's own close()
already obeyed it; the Home tab and the house did not.

goHome() now sends a production account to CardinalProduction.open() — from a retail job it fell through to the
retail home, and from an insurance job it opened Cardinal Truth. Everyone else's Home is unchanged. The phone tab bar lights Home while the board is up.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

s = one(s, """if(crm === 'production' || crm === 'sales') crm = stickyCrm();
if(crm === 'insurance' && typeof window.showCardinalTruth === 'function'){ window.showCardinalTruth(); }""",
"""if(crm === 'production' || crm === 'sales') crm = stickyCrm();
/* 1420: a production account's home is its own hub, whatever job it was on (1038/1165/1188: "back out to it,
   never to the retail home" — pipeline counts and AR money). The portal homes below stay everyone else's. */
if(typeof window.isProductionUser === 'function' && window.isProductionUser() &&
   window.CardinalProduction && typeof window.CardinalProduction.open === 'function'){ window.CardinalProduction.open(); return; }
if(crm === 'insurance' && typeof window.showCardinalTruth === 'function'){ window.showCardinalTruth(); }""")

s = one(s, """    if(tbProd() && document.querySelector('#cr-pb.open .pbcalw')) return 'sched';""",
"""    if(tbProd() && document.querySelector('#cr-pb.open .pbcalw')) return 'sched';
    if(tbProd() && document.querySelector('#cr-pb.open')) return 'home';   /* 1420: the board IS a production account's home */""")
s = one(s, """    if(tbShown('leadsView') || tbShown('projectView') || tbShown('clientsView')) return 'jobs';""",
"""    if(tbShown('leadsView') || tbShown('projectView') || tbShown('clientsView') || tbShown('commsView')) return 'jobs';   /* 1420: a job's thread is inside the job */""")

s = one(s, ">v2026-10-29 build 1419<", ">v2026-10-29 build 1420<")
s = one(s, """  { b: 1419, d:'2026-10-29',""",
"""  { b: 1420, d:'2026-10-29', t:'Home takes Production back to the board', s:'For Curtis and Scottie, the Home button at the bottom of the phone and the gold house in the header now open the Production board. They used to land on the retail home, which shows pipeline counts and money owed. Everyone else\\u2019s Home is unchanged.' },
  { b: 1419, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1420')
