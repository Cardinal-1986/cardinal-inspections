"""Build 1355 — the client card is one slim bar on a wide screen (the rest of Theo's pick B).
At 1600px+ on a retail job the client card was 275px tall: name, then PHONE, EMAIL and ADDRESS one per row,
then Switch Primary / Add contact under a rule, with the stage band another 68px under it. Now the card is
one row: PO, name, phone, email, address, Switch Primary · Add contact, then the star and the pencil, and
the stage band is a slim 52px. CSS only, inside the 1600px query and the retail fence; phone (the 791
namebar), tablet, Insurance and Community are untouched. Every link keeps its 44px tap height."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

R = 'body:not(.claim-insurance):not(.claim-community) #projectView'
css = f"""/* ═══ Build 1355 · the client card is one slim bar on a wide screen (Theo's pick B) ═══ */
@media (min-width:1600px){{
  {R} .projinfo{{ --cr-stack:"1355 one slim client bar"; display:flex; flex-wrap:wrap; align-items:center; column-gap:22px; row-gap:0; padding:6px 16px; }}
  {R} .projinfo .poPfx{{ order:1; margin:0; }}
  {R} .projinfo .heroNm{{ order:2; flex:0 1 auto; min-width:0; }}
  {R} #projName .hcontact{{ --cr-stack:"1355 one row"; order:3; flex-direction:row; align-items:center; gap:0 22px; margin:0; }}
  {R} #projName .hph, {R} #projName .hem{{ --cr-stack:"1355 inline, no label"; display:inline-flex; align-items:center; margin:0; font-size:15px; }}
  {R} #projName .hph::before, {R} #projName .hem::before, {R} #projMeta .mlbl{{ --cr-stack:"1355 the bar needs no labels"; display:none; }}
  {R} .projinfo > #projMeta{{ order:4; }}
  {R} #projMeta .mrow{{ --cr-stack:"1355 inline"; display:flex; margin:0; }}
  {R} #projName .hmanage{{ --cr-stack:"1355 inline, no rule"; order:5; flex-basis:auto; margin:0; padding:0; border-top:0; }}
  {R} .projinfo #favStar{{ order:6; margin-left:auto; }}
  {R} .projinfo #projEditBtn{{ order:7; }}
  {R} .projinfo > div:not(.projmeta){{ order:9; }}
  {R} #acxMount > .dbstage{{ --cr-stack:"1355 slim stage band"; padding:4px 6px; }}
  {R} #acxMount > .dbstage .dbstgmid b{{ display:inline; }}
  {R} #acxMount > .dbstage .dbstgmid small{{ display:inline; margin-left:10px; font-size:13px; }}
}}
"""
anchor = "#projectView #acxMount .crji-stack > .crji-card{margin:12px 0 4px;}"
one(anchor, anchor + "\n" + css)
one(">v2026-10-16 build 1354<button", ">v2026-10-16 build 1355<button")
one("""  { b: 1354, d:'2026-10-16',""",
"""  { b: 1355, d:'2026-10-16', t:'The client in one slim bar', s:'On a wide screen the client card at the top of a job is one slim bar: the name, phone, email and address in a row, with the star and the pencil at the end, and the stage band under it is thinner. Phones and tablets look the same as before.' },
  { b: 1354, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('ok 1355')
