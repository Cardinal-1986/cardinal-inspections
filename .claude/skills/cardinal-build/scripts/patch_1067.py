#!/usr/bin/env python3
"""Build 1067 — three inks themed by CRM instead of by theme.

THE ROOT CAUSE, WHICH IS ONE MISTAKE MADE THREE TIMES
  In all three the correct colour was already written, and scoped to the wrong
  axis: `body.claim-insurance`, or `:root:not([data-theme="rb-light"])` with no
  light twin. Retail light mode falls through to a value chosen for a different
  ground. CLAUDE.md names this exactly — *scoping by CRM is not scoping by
  theme* — and build 527 is the precedent it cites.

  No colour is invented here. Every replacement is a value already in the file.

MEASURED IN CHROMIUM, BOTH THEMES, AGAINST THE COMPOSITED GROUND
                                        dark        light
  .dbmdir  "Directions ->"             12.12  ok     2.45  FAIL  -> 12.22 / 7.83
  b.db-paid "$0.00"                    12.71  ok     2.40  FAIL  -> 12.71 / 5.84
  .ljsummary h3 "Job Summary"           5.48  ok     3.51  FAIL  ->  5.48 / 5.67

  ⚠ THE .dbmdir LIGHT NUMBER IS 2.45, NOT THE 3.77 MY FIRST RIG PRINTED.
  The map tab bar is rgba(16,18,24,.85) — NOT opaque. Over the light page it
  composites to #34363b; scoring against the raw rgba flatters it by 1.3
  points. The sentinel composited correctly and my throwaway rig did not.

⚠ AND MY FIRST RIG REPORTED ALL THREE AS PASSING, IN BOTH THEMES
  It set data-theme but not `window.__sentinelTheme`, so
  cr-rbtheme-toggle-script stripped the attribute at boot and the "light" run
  was a second DARK run wearing a light name. sentinel_setup_cardinal.js warns
  about this in a comment. The tell was that a rule scoped
  `:root:not([data-theme="rb-light"])` — dark ONLY — was winning in the
  supposedly-light run. gate_1067.mjs carries a vacuity guard so this cannot
  happen again silently.

SITE 1 — .dbmdir, and the fix the neighbouring comment already prescribes
  The comment above the insurance rule says it outright: "The map tab bar
  paints rgba(16,18,24,.85) and is therefore ALWAYS dark, whichever insurance
  theme is on — so its link must NOT use --ct-red-deep ... A fixed light red is
  correct here precisely because the bar does not flip."
  That reasoning is CRM-independent and was only ever applied inside insurance.
  Retail's base rule uses var(--rbe-acclt), which DOES flip — to #4f7396, a
  dark blue, over a bar that stayed dark. Pinning the token's own DARK value
  (#b9d3ec) is what the comment asks for, and leaves dark byte-identical.

SITE 2 — b.db-paid, and the twin that was never written
  Retail dark restyles the whole money card under
  `:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community)`.
  There is no light twin of that block, so in light the base rules show through.
  For .db-due that is harmless — #C8202E reads 5.67:1 on white. For .db-paid it
  is not: #7CB342 was chosen for a dark ground and reads 2.40:1.
  #46701E is the file's own green for a light ground (insurance docket, where
  its author measured 5.51:1 on cream). On retail white it is 5.84:1 — within
  0.2 of what .db-due already does, so paid and due keep matching weight.

SITE 3 — .ljsummary h3, which needs a PAIR because no single value works
  #e35c63 is 5.48 dark / 3.51 light. #c8202e is 5.67 light / 3.40 dark. This is
  the build-527 shape precisely: pick either one unconditionally and you fix one
  theme by breaking the other. So: dark keeps today's #e35c63, light gets the
  app's own --red.

  ⚠ THE INK IS INLINE, so no stylesheet rule could ever have reached it — and
  `.ljsummary h3{color:#1c1416}` has been sitting there DEAD because of it (the
  sentinel reports it under OVERRIDDEN). Removing the inline colour fixes the
  contrast AND retires the dead rule; both were the same defect.
  Only `color:` leaves the inline. `margin:0 0 6px` stays, so layout does not
  move — the rule says 8px and the inline says 6px.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = 'index.html'
src = pl.load(SRC)
orig = src

# ── SITE 1 ───────────────────────────────────────────────────────────────
src = pl.sub(src,
    """.dbmtabs .dbmdir{margin-left:6px;padding:6px 11px;font:700 10.5px 'Segoe UI',Arial,sans-serif;
  color:var(--rbe-acclt);text-decoration:none;border-left:1px solid var(--rbe-line);}""",
    """/* 1067: PINNED, not tokenised, and that is the point. This link sits on the
   map tab bar, which paints rgba(16,18,24,.85) and stays dark in BOTH themes —
   over the light page it composites to #34363b. var(--rbe-acclt) flips to
   #4f7396 there, a dark blue on a dark bar: 2.45:1. The insurance rule below
   already carries this exact reasoning in its own comment ("a fixed light red
   is correct here precisely because the bar does not flip"); it was simply
   never applied to retail. #b9d3ec is --rbe-acclt's own dark value, so dark is
   unchanged (12.22:1) and light is repaired (7.83:1). */
.dbmtabs .dbmdir{margin-left:6px;padding:6px 11px;font:700 10.5px 'Segoe UI',Arial,sans-serif;
  color:#b9d3ec;text-decoration:none;border-left:1px solid var(--rbe-line);}""")

# ── SITE 2 ───────────────────────────────────────────────────────────────
src = pl.sub(src,
    "#projectView .dbmoney b.db-paid{color:#7CB342}",
    """#projectView .dbmoney b.db-paid{color:#7CB342}
/* 1067: the missing LIGHT twin. Retail dark restyles this card under
   :root:not([data-theme="rb-light"]) and no light counterpart was ever
   written, so light fell through to #7CB342 — a green picked for a dark
   ground, 2.40:1 on white. .db-due survives the same fall-through only
   because its base #C8202E happens to read 5.67:1 on white.
   #46701E is already in this file as the light-ground green (the insurance
   docket rule below); here it is 5.84:1, matching .db-due's weight. Dark is
   untouched: the retail dark rule paints this white and still wins. */
:root[data-theme="rb-light"] body:not(.claim-insurance):not(.claim-community) #projectView .dbmoney b.db-paid{color:#46701E}""")

# ── SITE 3 ───────────────────────────────────────────────────────────────
# the stylesheet pair (dark in the base rule, light twin scoped — the 573 convention)
src = pl.sub(src,
    ".ljsummary h3{font:800 16px Georgia,'Times New Roman',serif;color:#1c1416;margin:0 0 8px;}",
    """/* 1067: a PAIR, because no single value clears both grounds — #e35c63 is
   5.48 dark / 3.51 light, #c8202e is 5.67 light / 3.40 dark. Build 527 is the
   precedent: one computed literal applied unconditionally fixes one theme and
   breaks the other. Dark keeps exactly what shipped.
   This rule was DEAD until now (the sentinel reports it under OVERRIDDEN):
   the renderer wrote color:#e35c63 as an INLINE style, which beats any
   stylesheet rule at any specificity. That inline is removed in the same
   edit — the dead rule and the failing contrast were one defect. */
.ljsummary h3{font:800 16px Georgia,'Times New Roman',serif;color:#e35c63;margin:0 0 8px;}
:root[data-theme="rb-light"] .ljsummary h3{color:#c8202e;}""")

# and the inline that was beating it — colour only, margin stays
src = pl.sub(src,
    '<h3 style="margin:0 0 6px;color:#e35c63;">Job Summary</h3>',
    '<h3 style="margin:0 0 6px;">Job Summary</h3>')

# ── the app stamp ────────────────────────────────────────────────────────
src = pl.sub(src, 'v2026-08-25 build 1066', 'v2026-08-25 build 1067')

# ── CHANGELOG ────────────────────────────────────────────────────────────
src = pl.sub(src, "var CHANGELOG = [\n", """var CHANGELOG = [
  { b:1067, d:'2026-08-25', t:'Three unreadable bits of the client profile in light mode',
  s:'In light mode the paid figure on the money card, the Directions link beside the map, and the Job Summary heading on the leads pane were all painted in colours chosen for the dark theme \\u2014 the paid amount worst of all, pale green on white at 2.4 to 1. Each already had the right colour written somewhere in the app; it had just been attached to the insurance CRM rather than to the light theme, so retail never got it. Dark mode looks exactly as it did before.' },""")

# ── proof of scope ───────────────────────────────────────────────────────
assert src.count('v2026-08-25 build 1067') == 1
assert src.count('v2026-08-25 build 1066') == 0
assert src.count('b:1067') == 1
assert src.count('color:#b9d3ec;text-decoration:none') == 1
assert src.count(':root[data-theme="rb-light"] body:not(.claim-insurance):not(.claim-community) #projectView .dbmoney b.db-paid{color:#46701E}') == 1
assert src.count(':root[data-theme="rb-light"] .ljsummary h3{color:#c8202e;}') == 1
assert src.count('<h3 style="margin:0 0 6px;">Job Summary</h3>') == 1
assert src.count('color:#e35c63;">Job Summary</h3>') == 0
# the deliberate PAIRS that must survive untouched — insurance owns these
assert src.count('body.claim-insurance #projectView .dbmoney b.db-paid{color:#46701E;}') == 1, \
    'the insurance docket green must be untouched'
assert src.count('body[data-rltheme="siren"].claim-insurance #projectView #projectView') == 0
assert src.count('body.claim-insurance #projectView .dbmtabs .dbmdir{color:#FF8A80;}') == 1, \
    "insurance's own pinned red must be untouched"
assert src.count('#projectView .dbmoney b.db-due{color:#C8202E}') == 1, '.db-due untouched'
# Self-computing, and ANCHORED ON THE DECLARATION rather than the token name.
# ⚠ The first version of this assertion counted bare `var(--rbe-acclt)` and
# failed a correct patch at a delta of 0 — because the COMMENT added directly
# above quotes the token in prose, so one reference left the code and one
# arrived in English. That is this file's own documented trap ("comments and
# strings lie in both directions") biting its own scope proof. `color:` as a
# prefix cannot match the prose.
assert orig.count('color:var(--rbe-acclt)') - src.count('color:var(--rbe-acclt)') == 1, \
    f"expected exactly one color:var(--rbe-acclt) removed, got {orig.count('color:var(--rbe-acclt)') - src.count('color:var(--rbe-acclt)')}"
# #1c1416 must have lost exactly one site (the ljsummary rule), not its neighbours
assert orig.count('#1c1416') - src.count('#1c1416') == 1, \
    f"expected exactly one #1c1416 removed, got {orig.count('#1c1416') - src.count('#1c1416')}"

pl.write_atomic(SRC, src)
pl.assert_in(SRC, ':root[data-theme="rb-light"] .ljsummary h3{color:#c8202e;}')
print('build 1067 written')
print(f'  {len(orig):,} -> {len(src):,} chars (+{len(src)-len(orig)})')
