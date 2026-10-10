"""Build 1287 — one typeface across the app in dark retail (follow-up 4 to 1283, option B).

1283 and 1286 took Georgia and ui-monospace off the home screen and the client page by
naming each element. Surveyed the rest (Leads, Client Directory, Estimates, Punch, AR):
every page title is Georgia and their small labels and counts are ui-monospace — and
ui-monospace alone is declared 256 times, mostly inside `font:` shorthands. Naming them
one by one is 256 edits that each have to out-rank their own rule.

So the app's typeface is set ONCE for dark retail: the drawer's sans, with tabular
figures. !important is deliberate and is the reason this is one rule rather than 256: a
`font:` shorthand on the element itself always beats an inherited family. Scope:
- dark retail only (light mode, Claims and Community untouched — light follows later)
- the drawer (#cr-lnav) is EXCLUDED: its section labels are part of the look Theo picked
- SVG text, form controls' own UA fonts and anything inside an iframe (documents,
  reports, estimates) are untouched — those are separate documents or not text
Usage: python3 patch_1287.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
P = ':root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community)'
# the app's own sans stack, exactly — NOT system-ui first. A system-ui fallback is wider
# than Arial on a phone and split "Communication" across two lines in the Job Menu
# (gate_1224 went 2 -> 5 failures on the first try).
SANS = "'Segoe UI',Arial,sans-serif"
CSS = f"""/* ── Build 1287 · one typeface across the app, dark retail (Theo: option B) ─
   Every page title was Georgia and ui-monospace is declared 256 times, mostly in
   `font:` shorthands. One rule instead of 256 out-rankings; !important is why it
   can be one rule. The drawer keeps its own labels (Theo picked that look), and
   svg text is not touched. Dark retail only; light follows. */
{P} :not(svg):not(svg *):not(#cr-lnav):not(#cr-lnav *){{
--cr-stack:"1287 one sans across dark retail; the drawer is excluded";
font-family:{SANS} !important;}}
{P} :is(.pmoney,.jan,.cnt,.n,.c,.gn,.gt,.kpcnt,.cd,.ch){{
--cr-stack:"1287 counts and figures line up";
font-variant-numeric:tabular-nums;}}

"""
A = "/* ── Build 527 · the Schedule Board ───────────────────────────────────────"
src = pl.sub(src, A, CSS + A)
src = pl.sub(src, '">v2026-10-10 build 1286<button', '">v2026-10-10 build 1287<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1286,",
  "var CHANGELOG = [\n"
  "  { b: 1287, d: '2026-10-10', t: 'One typeface across the app',\n"
  "    s: 'Every screen now uses the same plain typeface as the side menu \\u2014 the old storybook page titles and typewriter labels are gone from Leads, the Client Directory, Estimates, Punch, Accounts Receivable and the rest. The side menu keeps its own look. Dark mode first.' },\n"
  "  { b: 1286,")
pl.write_atomic(PATH, src)
print('patched 1287')
