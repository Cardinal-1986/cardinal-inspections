"""Build 1284 — the top bar in the drawer's style (option B, step 1 of the follow-ups).

The retail header in dark was a navy gloss gradient with a drop shadow, and its two
buttons were raised gloss bevels — a sky-blue gradient + and a steel gradient search.
The drawer it sits beside is a flat #0A0E16 well with #223047 hairlines. Header ground
goes to the drawer's well colour (through its own --hbg/--htint tokens, which every
header rule already reads), shadow off, hairline under; buttons flat — the + is a
solid Cardinal red with a white glyph (5.6:1), the search a flat panel.

Dark retail only. Light, Claims, Community, Production and Sales headers untouched.
Usage: python3 patch_1284.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
R = ':root:not([data-theme="rb-light"]) body[data-crm-head="retail"]'
CSS = f"""/* ── Build 1284 · the top bar in the drawer's style (Theo: option B) ──────
   The header was a navy gloss gradient with a drop shadow and two raised gloss
   buttons. The drawer beside it is a flat #0A0E16 well. Dark retail only; the
   header's own tokens carry the ground, so every rule that reads them follows. */
{R} .site{{
--cr-stack:"1284 flat header ground, the drawer's well";
--hbg:#0A0E16;--htint:#0A0E16;--hsf:#0F1521;
box-shadow:none;border-bottom:1px solid #223047;}}
{R} #cr-hd2-bar .cr-ib,
{R} #cr-hd2-bar #cr-hd2-home{{
--cr-stack:"1284 flat header buttons (were gloss bevels)";
background:#0F1521;border:1px solid #223047;box-shadow:none;color:#c2cbd8;}}
{R} #cr-hd2-bar .cr-ib.primary{{
--cr-stack:"1284 flat red + (was sky-blue gloss)";
background:#c8202e;border:1px solid #c8202e;box-shadow:none;color:#ffffff;}}

"""
A = "/* ── Build 527 · the Schedule Board ───────────────────────────────────────"
src = pl.sub(src, A, CSS + A)
src = pl.sub(src, '">v2026-10-10 build 1283<button', '">v2026-10-10 build 1284<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1283,",
  "var CHANGELOG = [\n"
  "  { b: 1284, d: '2026-10-10', t: 'A flat top bar, like the side menu',\n"
  "    s: 'The bar across the top is now the same flat dark as the side menu, without the glossy shine and shadow, and its two buttons are flat too \\u2014 the + is solid Cardinal red and the search is a plain dark square. Dark mode first.' },\n"
  "  { b: 1283,")
pl.write_atomic(PATH, src)
print('patched 1284')
