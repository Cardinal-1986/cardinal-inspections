"""Build 1285 — the Team Calendar arrows and the Activity panel in the drawer's style.

Follow-ups 2 and 3 to 1283 (option B). The Team Calendar's month arrows were solid red
bevel buttons; the Activity panel (.actcard) was a #16161B slab with a 30px drop shadow
and a ridge. Arrows go to the same flat panel the search button became at 1284; the
Activity panel to the flat #0F1521 card with the red edge every other home card has.

Dark retail, home only. Usage: python3 patch_1285.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
P = ':root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community)'
CSS = f"""/* ── Build 1285 · Team Calendar arrows + Activity panel, drawer style ────── */
{P} #mainView .teamcal .minical .calnav{{
--cr-stack:"1285 flat month arrows (were red bevels)";
background:#0F1521;border:1px solid #223047;box-shadow:none;color:#c2cbd8;}}
{P} #mainView .teamcal .minical .calnav:hover{{
--cr-stack:"1285 hover for the flat arrows";
background:#141C29;color:#ffffff;}}
{P} #mainView .actcard{{
--cr-stack:"1285 flat Activity panel (was slab + drop shadow + ridge)";
background:#0F1521;border:1px solid #223047;border-left:3px solid #c8202e;box-shadow:none;border-radius:10px;}}

"""
A = "/* ── Build 527 · the Schedule Board ───────────────────────────────────────"
src = pl.sub(src, A, CSS + A)
src = pl.sub(src, '">v2026-10-10 build 1284<button', '">v2026-10-10 build 1285<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1284,",
  "var CHANGELOG = [\n"
  "  { b: 1285, d: '2026-10-10', t: 'Calendar arrows and Activity, flat like the rest',\n"
  "    s: 'The month arrows on the Team Calendar are plain dark squares now instead of red bumps, and the Activity panel on the right is the same flat card with a red edge as the rest of the home screen. Dark mode.' },\n"
  "  { b: 1284,")
pl.write_atomic(PATH, src)
print('patched 1285')
