"""Build 1290 — light mode in the drawer's style (option B, the light twin of 1283–1289).

1283–1289 brought dark retail to the drawer's style and left light mode untouched on
purpose. This is the light twin, in the drawer's own light palette (536 option A, light
half): a #f2f3f5 well, white cards, #dcdee2 hairlines, #161616 ink, the same thin
Cardinal-red left edge. Same scopes, same exclusions:
- one sans everywhere (the drawer and the client-facing presentation screens excluded)
- home: flat white cards with the red edge, no glint, flat punch cards, flat Activity,
  flat Team Calendar arrows
- top bar: flat white ground with a hairline, flat white search, solid red +
- client page: flat white panels (the stage spine, History's red top and the money ring
  keep their meaning; the Invoices card keeps its own ground token)
- Leads / Punch: flat white cards; AR / Crews: shadows off
Light retail only — Claims, Community, Production and Dispatch untouched.
Usage: python3 patch_1290.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
L = ':root[data-theme="rb-light"] body:not(.claim-insurance):not(.claim-community)'
LR = ':root[data-theme="rb-light"] body[data-crm-head="retail"]'
SANS = "'Segoe UI',Arial,sans-serif"
EX = ':not(:is(#cr-why,#cr-occ,#cr-show,#cr-appt)):not(:is(#cr-why,#cr-occ,#cr-show,#cr-appt) *)'
CARD = 'background:#ffffff;border:1px solid #dcdee2;box-shadow:none;'
CSS = f"""/* ── Build 1290 · light mode in the drawer's style (the light twin of 1283–1289) ──
   The drawer's light palette: #f2f3f5 well, white cards, #dcdee2 hairlines, #161616
   ink, the same thin red edge. Same scopes and exclusions as the dark builds. */
{L} :not(svg):not(svg *):not(#cr-lnav):not(#cr-lnav *){EX}{{
--cr-stack:"1290 one sans across light retail; drawer + presentation screens excluded";
font-family:{SANS} !important;}}
{L} #mainView .pipecard,
{L} #mainView .actcard{{
--cr-stack:"1290 flat white card with the red edge (light twin of 1283/1285)";
{CARD}border-left:3px solid #c8202e;border-radius:10px;}}
{L} #mainView .pipecard::after{{--cr-stack:"1290 no glint";display:none;}}
{L} #mainView .rowfil{{--cr-stack:"1290 no glint divider";display:none;}}
{L} #mainView .pipetitle{{
--cr-stack:"1290 sentence-case card heading, light";
font-size:15px;font-weight:700;letter-spacing:0;color:#161616;}}
{L} #mainView .pu-card{{
--cr-stack:"1290 flat punch card; its priority edge stays";
background:#ffffff;box-shadow:none;border-top:1px solid #dcdee2;border-bottom:1px solid #dcdee2;border-right:1px solid #dcdee2;}}
{L} #mainView .teamcal .minical .calnav{{
--cr-stack:"1290 flat month arrows, light";
background:#ffffff;border:1px solid #dcdee2;box-shadow:none;color:#3f3f46;}}
{LR} .site{{
--cr-stack:"1290 flat white header ground";
--hbg:#ffffff;--htint:#ffffff;box-shadow:none;border-bottom:1px solid #dcdee2;}}
{LR} #cr-hd2-bar .cr-ib,
{LR} #cr-hd2-bar #cr-hd2-home{{
--cr-stack:"1290 flat header buttons, light";
background:#ffffff;border:1px solid #dcdee2;box-shadow:none;color:#3f3f46;}}
{LR} #cr-hd2-bar .cr-ib.primary{{
--cr-stack:"1290 solid red +, light";
background:#c8202e;border:1px solid #c8202e;box-shadow:none;color:#ffffff;}}
{L} #projectView .projinfo,
{L} #projectView .projinfo:hover{{
--cr-stack:"1290 flat client card; the stage spine stays";
background:#ffffff;border-top:1px solid #dcdee2;border-right:1px solid #dcdee2;border-bottom:1px solid #dcdee2;box-shadow:none;}}
{L} #projectView .jabox,
{L} #projectView .jabox:hover,
{L} #projectView .jobvalrow,
{L} #projectView .dbmoney,
{L} #projectView .dbrow,
{L} #projectView .acxsec:not(.rvsec),
{L} #projectView .rvcard,
{L} #leadsView .ljcard,
{L} #punchView .pu-card,
{L} .pu-hero .pu-card{{
--cr-stack:"1290 flat white panel (light twin of 1286/1288)";
{CARD}}}
{L} #projectView .jabox:hover{{--cr-stack:"1290 hover lifts the ground";background:#f7f8fa;}}
{L} #projectView .kpsec{{
--cr-stack:"1290 flat History; its red top stays";
background:#ffffff;border-left:1px solid #dcdee2;border-right:1px solid #dcdee2;border-bottom:1px solid #dcdee2;box-shadow:none;}}
{L} #projectView .crji-card,
{L} #cr-ar-view .crar-btn:not(.primary),
{L} #cr-ar-view .crar-empty,
{L} #crewsView .crw-card{{
--cr-stack:"1290 shadow off; the ground stays on its own token";
box-shadow:none;}}

"""
A = "/* ── Build 527 · the Schedule Board ───────────────────────────────────────"
src = pl.sub(src, A, CSS + A)
src = pl.sub(src, '">v2026-10-10 build 1289<button', '">v2026-10-10 build 1290<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1289,",
  "var CHANGELOG = [\n"
  "  { b: 1290, d: '2026-10-10', t: 'Light mode, cleaned up like the side menu',\n"
  "    s: 'Light mode now matches the new dark look: one plain typeface, flat white cards with a thin red edge instead of shiny ones, a flat white top bar with a solid red +, and flat buttons. The screens you show homeowners keep their own look.' },\n"
  "  { b: 1289,")
pl.write_atomic(PATH, src)
print('patched 1290')
