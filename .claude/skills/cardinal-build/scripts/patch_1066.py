#!/usr/bin/env python3
"""Build 1066 — the Photo Album is readable in light mode.

THE DEFECT, AND WHY NOBODY HAD SEEN IT
  In light mode the Photo Album screen loses its client name and its entire
  explanatory paragraph: both are #fff on #f7f7f7 — 1.07:1. Not marginal.
  Invisible. The screen still shows its buttons and chips, so it reads as a
  screen that simply has less text on it.

  ⚠ THE SENTINEL HAD NEVER SCORED IT. `album` is state 19 of the walk, and
  states 13 onward were being probed through the checklist modal and then the
  estimate-library picker (both fixed earlier today). Twelve-to-fifteen screens
  were measured through an overlay, and this is what was underneath one of them.
  The instrument work is what surfaced this; it was not visible before.

MEASURED, BOTH THEMES, AGAINST THE REAL GROUND
                              dark (#09090C)      light (#f7f7f7)
  #galClient   now             19.89:1  ok          1.07:1  FAIL
               -> --rbe-head   19.89:1  ok         16.89:1  ok
  .subnote     now             19.89:1  ok          1.07:1  FAIL
               -> --rbe-ink    13.58:1  ok         16.89:1  ok
  .galempty    now              5.76:1  ok          3.22:1  FAIL
               -> --rbe-mute    7.55:1  ok          4.97:1  ok

  Every replacement is an EXISTING token pair that already flips by itself
  (--rbe-head #ffffff/#161616, --rbe-ink #cfd6df/#161616,
   --rbe-mute #9aa0a8/#6b6b6b). No colour is invented here. CLAUDE.md is
  explicit that a computed literal is the wrong move: build 527 picked #f08a90
  by arithmetic, got dark right, applied it unconditionally, and broke light at
  2.30:1. A pair cannot drift.

  Each carries a literal fallback (the current dark value), per the palette
  rule — a bare var() went transparent app-wide at 448-449 when another module
  stripped a declaration a second after load.

⚠ ONE OF THE THREE IS AN INLINE STYLE, AND THAT IS WHY IT SURVIVED
  #galClient is `style="color:#fff"` in the static markup. An inline style beats
  every stylesheet rule at any specificity, so no theme block could ever have
  reached it — this is the styleMounts()/cr-coach class CLAUDE.md records, where
  the tokens read correctly and the screen still painted the old colour. It has
  to be fixed in the attribute itself.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = 'index.html'
src = pl.load(SRC)
orig = src

# 1 — the client name. INLINE, so the attribute itself must change.
src = pl.sub(src,
    '<span id="galClient" style="color:#fff;font-size:17px;"></span>',
    '<span id="galClient" style="color:var(--rbe-head,#fff);font-size:17px;"></span>')

# 2 — the screen's explanatory paragraph. Unconditional white, no light twin.
src = pl.sub(src,
    '#galleryView .subnote{color:#fff}',
    '#galleryView .subnote{color:var(--rbe-ink,#fff)}')

# 3 — the empty state. Passes on dark, fails on light.
src = pl.sub(src,
    ".galempty{color:#8a8a8a;font:13.5px 'Segoe UI',Arial,sans-serif;padding:14px 0;}",
    ".galempty{color:var(--rbe-mute,#8a8a8a);font:13.5px 'Segoe UI',Arial,sans-serif;padding:14px 0;}")

# 4 — the app stamp
src = pl.sub(src, 'v2026-08-25 build 1065', 'v2026-08-25 build 1066')

# 5 — the CHANGELOG
src = pl.sub(src, "var CHANGELOG = [\n", """var CHANGELOG = [
  { b:1066, d:'2026-08-25', t:'The Photo Album reads in light mode',
  s:'In light mode the Photo Album lost the client\\u2019s name and the whole paragraph explaining what the screen does \\u2014 both were white on a near-white page, 1.07:1, invisible rather than merely faint. The empty-state line was under the floor too. All three now use the app\\u2019s existing light/dark token pairs, so they flip with the theme instead of being one fixed colour. Dark mode is unchanged or slightly better. This screen had never actually been checked: the sweep that checks contrast was being blocked by a modal left open earlier in its own walk.' },""")

# ── proof of scope ───────────────────────────────────────────────────────
assert src.count('v2026-08-25 build 1066') == 1
assert src.count('v2026-08-25 build 1065') == 0
assert src.count('b:1066') == 1
assert src.count('var(--rbe-head,#fff);font-size:17px') == 1
assert src.count('#galleryView .subnote{color:var(--rbe-ink,#fff)}') == 1
assert src.count('.galempty{color:var(--rbe-mute,#8a8a8a)') == 1
# the OLD values must be gone from these three sites specifically, and the
# self-computing form catches a global replace that ate someone else's #fff
assert src.count('#galleryView .subnote{color:#fff}') == 0
assert src.count('color:#8a8a8a;font:13.5px') == 0
assert orig.count('color:#fff') - src.count('color:#fff') == 2, \
    'exactly two color:#fff sites should have changed'

pl.write_atomic(SRC, src)
pl.assert_in(SRC, '#galleryView .subnote{color:var(--rbe-ink,#fff)}')
print('build 1066 written')
print(f'  {len(orig):,} -> {len(src):,} chars (+{len(src)-len(orig)})')
