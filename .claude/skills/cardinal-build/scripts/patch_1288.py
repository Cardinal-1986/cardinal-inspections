"""Build 1288 — Leads, Punch, AR and Crews cards in the drawer's style (Theo: "merge and go").

Remaining gloss after 1283–1287, measured: the Leads cards (.ljcard) and the Punch page's
hero card (.pu-card) are the --rbe-bg1/bg2 gloss gradient with a drop shadow; the AR
master button and empty-state card, and the Crews cards, carry drop shadows.

The 1286 lesson applied: a surface with its OWN theme token keeps its ground on that
token — only the shadow goes. AR (--est-*) and Crews (--crw-card) therefore lose shadows
only. Punch shares the generic bg1/bg2 gloss, so it gets the flat #0F1521 panel. Leads' own
535-era dark rule (--nv tokens) is edited at source: flat on --nv-card2, no shadow.

Left alone on purpose: Production (its own sanctioned "Cardinal Steel" design) and
Dispatch (crew/lane/day colours carry meaning). Dark retail only.
Usage: python3 patch_1288.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
P = ':root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community)'
CSS = f"""/* ── Build 1288 · Leads, Punch, AR and Crews cards in the drawer's style ───
   Leads/Punch share the generic bg1/bg2 gloss → the flat drawer panel. AR and
   Crews have their own ground tokens → shadow only (1286's lesson). Production
   and Dispatch are left alone on purpose. Dark retail only. */
{P} .pu-hero .pu-card,
{P} #punchView .pu-card{{
--cr-stack:"1288 flat drawer panel (was bg1/bg2 gloss + shadow)";
background:#0F1521;border:1px solid #223047;box-shadow:none;}}
{P} #cr-ar-view .crar-btn:not(.primary),
{P} #cr-ar-view .crar-empty,
{P} #crewsView .crw-card{{
--cr-stack:"1288 shadow off; the ground stays on its own token";
box-shadow:none;}}

"""

# the 535-era dark lead card, edited at source: its ground stays on its own --nv token
OLD = """#leadsView .ljcard{
  background:linear-gradient(180deg,var(--nv-card1,#1A2434),var(--nv-card2,#141C29));
  border:1px solid var(--nv-bd,#223047);
  border-top:2px solid var(--nv-edge,#33496A);
  box-shadow:0 10px 24px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.07);"""
NEW = """#leadsView .ljcard{
  /* 1288: flat, the drawer's style (Theo: option B); ground stays on its --nv token */
  background:var(--nv-card2,#141C29);
  border:1px solid var(--nv-bd,#223047);
  border-top:1px solid var(--nv-bd,#223047);
  box-shadow:none;"""
src = pl.sub(src, OLD, NEW)
OLDH = """#leadsView .ljcard:hover{
    box-shadow:0 20px 40px rgba(0,0,0,.74), inset 0 1px 0 rgba(255,255,255,.13);
    border-top-color:#435C82;"""
NEWH = """#leadsView .ljcard:hover{
    box-shadow:none;background:var(--nv-card1,#1A2434);
    border-top-color:#435C82;"""
src = pl.sub(src, OLDH, NEWH)
A = "/* ── Build 527 · the Schedule Board ───────────────────────────────────────"
src = pl.sub(src, A, CSS + A)
src = pl.sub(src, '">v2026-10-10 build 1287<button', '">v2026-10-10 build 1288<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1287,",
  "var CHANGELOG = [\n"
  "  { b: 1288, d: '2026-10-10', t: 'Flat cards on Leads, Punch, Receivables and Crews',\n"
  "    s: 'The cards on Leads & Jobs and the Punch page are flat dark panels now instead of glossy ones, and Accounts Receivable and Crews lose their drop shadows. Production and the dispatch board keep their own look. Dark mode.' },\n"
  "  { b: 1287,")
pl.write_atomic(PATH, src)
print('patched 1288')
