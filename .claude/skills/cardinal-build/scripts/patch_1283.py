"""Build 1283 — the home screen in the drawer's style, option B (Theo: "B").

Theo: "Is there any way to not make the interface look cartooony, maybe look more like the
left side drawer menu?" Previewed A (quiet caps labels) and B (white sentence-case headings,
thin red edge); he picked B.

What made it cartoony, measured in Chromium on the home screen: Georgia serif on every card
title, the greeting and the brand title; ui-monospace on the pipeline money, the 30-day
calendar, the punch tags and the PO chips; and a glossy gradient + drop shadow + glint
line on every card. The drawer has none of that — one sans, flat #0A0E16/#0F1521
panels, #223047 hairlines.

Dark retail only, home screen only (#mainView + the brand title). Light mode, Claims and
Community are untouched. One block, late in the cascade; every rule carries --cr-stack
because it out-ranks the older rules on purpose and those still serve light mode.

Usage: python3 patch_1283.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
P = ':root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community)'
SANS = "'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"
CSS = f"""/* ── Build 1283 · the home screen in the drawer's style (Theo: option B) ──
   Theo: "not make the interface look cartooony, maybe look more like the left
   side drawer menu". Measured: Georgia on every card title, ui-monospace on the
   pipeline money, the 30-day calendar and the punch tags, and a gloss gradient +
   drop shadow + glint line on every card. The drawer uses one sans and flat
   #0F1521 panels on #223047 hairlines; this brings the home screen to it.
   Dark retail, home only. --cr-stack on each: the older rules still serve light. */
{P} #mainView .pipetitle,
{P} #mainView .pipetitle *,
{P} #cr-hd2-mid #brandTitle h1,
{P} #mainView #heroGreeting,
{P} #mainView #heroGreeting .qmark,
{P} #mainView .viewhead,
{P} #mainView .calhead b,
{P} #mainView .pu-strip .sh b,
{P} #mainView .pcini{{
--cr-stack:"1283 one sans like the drawer (was Georgia)";
font-family:{SANS};}}
{P} #mainView .pmoney,
{P} #mainView .cal30 .ch,
{P} #mainView .cal30 .cd,
{P} #mainView .pu-strip .sh .n,
{P} #mainView .pu-tag,
{P} #mainView .pu-st,
{P} #mainView .pu-sched,
{P} #mainView .pcpo{{
--cr-stack:"1283 one sans like the drawer (was ui-monospace)";
font-family:{SANS};font-variant-numeric:tabular-nums;letter-spacing:.02em;}}
{P} #mainView .pipetitle{{
--cr-stack:"1283 white sentence-case card heading";
font-size:15px;font-weight:700;letter-spacing:0;color:var(--rbe-head,#ffffff);}}
{P} #mainView .pipecard{{
--cr-stack:"1283 flat drawer panel (was gloss gradient + drop shadow)";
background:#0F1521;border:1px solid #223047;border-left:3px solid #c8202e;
box-shadow:none;border-radius:10px;}}
{P} #mainView .pipecard::after{{
--cr-stack:"1283 no glint line";display:none;}}
{P} #mainView .rowfil{{
--cr-stack:"1283 no glint divider";display:none;}}
{P} #mainView .pu-card{{
--cr-stack:"1283 flat punch card; its own priority edge stays";
background:#141B27;box-shadow:none;border-top:1px solid #223047;border-bottom:1px solid #223047;border-right:1px solid #223047;}}

"""
A = "/* ── Build 527 · the Schedule Board ───────────────────────────────────────"
src = pl.sub(src, A, CSS + A)
src = pl.sub(src, '">v2026-10-10 build 1282<button', '">v2026-10-10 build 1283<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1282,",
  "var CHANGELOG = [\n"
  "  { b: 1283, d: '2026-10-10', t: 'A cleaner home screen, like the side menu',\n"
  "    s: 'The home screen now looks like the side menu: one plain typeface everywhere instead of the old storybook serif and typewriter lettering, and flat dark cards with a thin red edge instead of glossy ones. Dark mode first; light mode and the other screens follow one at a time.' },\n"
  "  { b: 1282,")
pl.write_atomic(PATH, src)
print('patched 1283')
