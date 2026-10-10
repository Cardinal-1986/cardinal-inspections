"""Build 1286 — the client page in the drawer's style (follow-up 4 to 1283, option B).

Measured on the client profile in dark retail: Georgia on the client's name and the
History heading, ui-monospace on the Job Menu counts, and a gloss gradient + drop shadow
on the client card, the money card, every Job Menu tile and every section card. Same
treatment as the home screen: one sans, flat #0F1521 panels on #223047 hairlines, no
shadows. Two things keep their colour because they carry meaning: the stage band
(APPROVED, green) and the client card's stage spine on its left edge; the money ring too.

Dark retail only. Usage: python3 patch_1286.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
P = ':root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community)'
SANS = "'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"
V = '#projectView'
CSS = f"""/* ── Build 1286 · the client page in the drawer's style (Theo: option B) ───
   Measured: Georgia on the client name and History heading, ui-monospace on the
   Job Menu counts, gloss + drop shadow on the client card, the money card, every
   Job Menu tile and section card. The stage band, the stage spine and the money
   ring keep their colour — they carry meaning. Dark retail only. */
{P} {V} #projName .heroNm,
{P} {V} .kpsech .kpst{{
--cr-stack:"1286 one sans like the drawer (was Georgia)";
font-family:{SANS};}}
{P} {V} .jabox .jan,
{P} {V} .kpsech .kpcnt{{
--cr-stack:"1286 one sans like the drawer (was ui-monospace)";
font-family:{SANS};font-variant-numeric:tabular-nums;}}
{P} {V} .projinfo,
{P} {V} .projinfo:hover{{
--cr-stack:"1286 flat client card; its stage spine stays";
background:#0F1521;border-top:1px solid #223047;border-right:1px solid #223047;border-bottom:1px solid #223047;box-shadow:none;}}
{P} {V} .jabox,
{P} {V} .jabox:hover,
{P} {V} .jobvalrow,
{P} {V} .jobvalrow:hover,
{P} {V} .rvcard{{
--cr-stack:"1286 flat drawer panel (was gloss + drop shadow)";
background:#0F1521;border:1px solid #223047;box-shadow:none;}}
{P} {V} .crji-card{{
--cr-stack:"1286 Invoices card: shadow off; its ground stays on its own --crji-card token (gate_1216 guards it)";
border:1px solid #223047;box-shadow:none;}}
{P} {V} .kpsec{{
--cr-stack:"1286 flat History card; its red TOP border is its own marker (797) and stays";
background:#0F1521;border-left:1px solid #223047;border-right:1px solid #223047;border-bottom:1px solid #223047;box-shadow:none;}}
{P} {V} .jabox:hover{{
--cr-stack:"1286 hover lifts the ground, not a shadow";background:#141C29;}}

"""

# the 790 dark card ground, edited at source (it out-ranks a new rule through
# .acxsec:not(.rvsec)); deletion at source beats out-specificity
OLD790 = """#projectView .dbrow{
  background:linear-gradient(180deg,var(--rbe-bg1,#2e333b),var(--rbe-bg2,#262a31));
  border:1px solid var(--rbe-line2,#2b2b33);
  color:var(--rbe-ink,#cfd6df);
}"""
NEW790 = """#projectView .dbrow{
  /* 1286: flat, the drawer's panel (Theo: option B) — was the bg1/bg2 gloss */
  background:#0F1521;
  border:1px solid #223047;box-shadow:none;
  color:var(--rbe-ink,#cfd6df);
}"""
src = pl.sub(src, OLD790, NEW790)
A = "/* ── Build 527 · the Schedule Board ───────────────────────────────────────"
src = pl.sub(src, A, CSS + A)
src = pl.sub(src, '">v2026-10-10 build 1285<button', '">v2026-10-10 build 1286<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1285,",
  "var CHANGELOG = [\n"
  "  { b: 1286, d: '2026-10-10', t: 'A cleaner client page, like the side menu',\n"
  "    s: 'The client page now matches the home screen and the side menu: one plain typeface for the client name and the counts, and flat dark cards instead of glossy grey ones for the client card, the money box, the Job Menu buttons and every section. The green stage bar and the money ring keep their colours. Dark mode.' },\n"
  "  { b: 1285,")
pl.write_atomic(PATH, src)
print('patched 1286')
