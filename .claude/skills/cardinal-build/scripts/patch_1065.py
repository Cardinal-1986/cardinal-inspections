#!/usr/bin/env python3
"""Build 1065 — the retail header slogan stops truncating on a phone.

THE DEFECT
  The retail header's title is not a name, it is the slogan
  "Single source of truth", set in American Typewriter at 17px with
  white-space:nowrap over #brandTitle h1{overflow:hidden;text-overflow:ellipsis}.
  On a phone it renders as  "Single sourc…  — the first text on every screen in
  the app, visibly cut off. It appeared in all ten phone captures taken for the
  25 Aug design audit.

WHY NOT JUST MAKE IT SMALLER — measured, not assumed
  vw    space for it   it needs   fits at
  320   80px           247px      never (below 9px)
  360   120px          247px      never
  390   150px          247px      10px
  414   174px          247px      12px
  430   190px          247px      13px
  438   247px          247px      17px  ← it fits from here up

  Shrinking is not available: at 390 it would have to drop to 10px, and below
  360 there is no readable size that fits at all. 10px American Typewriter bold
  on a phone held at arm's length is worse than nothing.

  Wrapping was the other candidate and was rejected: two lines of 17px adds
  ~22px to a fixed-height bar, spending vertical space on the screen where it
  is scarcest, to show a slogan.

  So: show it where it fits, and show nothing where it does not. A truncated
  slogan reads as a bug; an absent one reads as a clean toolbar. The burger,
  +, home and search still fill the bar.

THE BREAKPOINT IS 437, AND THAT IS DELIBERATE OVER A TIDIER 479
  The exact threshold measured at 1px resolution is 438px. The app already
  carries 22 media breakpoints and the design audit called that dispersion out,
  so reusing the existing 480 family was tempting — but 479 would hide the
  slogan across 438-479, and an iPhone 16 Pro Max is 440pt wide. Hiding
  something that fits, on a real device, to avoid adding a breakpoint is the
  wrong trade. Exactness wins; the number is measured, not picked.

SCOPED TO RETAIL, AND THAT IS LOAD-BEARING
  #brandTitle also carries the CRM NAME in the other CRMs ("Insurance",
  "Community"), which are short words that fit. The 416-era comment in this
  same stylesheet says the title "must never disappear" and forces it visible
  for exactly that reason. So this hides only body[data-crm-head="retail"],
  where the title is a slogan rather than a name.

  ⚠ It must also out-specify `#cr-hd2-mid #brandTitle{display:block !important}`,
  which lives in a LATER stylesheet (cr-hd6-styles, ~line 59373). Later source
  order wins at equal specificity, so this rule carries 3 ids + an attribute +
  a type selector against that rule's 2 ids. Specificity, not source order, is
  what makes it win — and a real Chromium render proves it, because a rule that
  parses and never applies is this project's build-481 class.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = 'index.html'
src = pl.load(SRC)
orig = src

# ── 1. the rule ──────────────────────────────────────────────────────────
ANCHOR = """body[data-crm-head="retail"] #cr-hd2-bar #cr-hd2-mid #brandTitle h1{
  font-family:'American Typewriter','Courier New',Courier,serif;"""

NEW = """/* 1065: the slogan is shown only where it FITS. Measured at 1px resolution:
   it needs 247px and the header's middle gives it 247px from 438px up, 190px
   at 430, 150px at 390. Shrinking it to fit would mean 10px at 390 and is
   impossible below 360; wrapping would add a second line to a fixed-height bar
   on the screen with the least vertical room. So it is hidden below 438 — a
   truncated slogan ("Single sourc…") reads as a broken app, an absent one
   reads as a clean toolbar.
   RETAIL ONLY: #brandTitle carries the CRM NAME in the other CRMs, which are
   short words that fit, and the 416 comment above forces that title visible
   because it must never disappear.
   The 437 breakpoint is deliberate rather than reusing the existing 480: an
   iPhone 16 Pro Max is 440pt, where the slogan fits, and hiding something that
   fits to save a breakpoint is the wrong trade. */
@media (max-width:437px){
  body[data-crm-head="retail"] #cr-hd2-bar #cr-hd2-mid #brandTitle{display:none !important}
}
body[data-crm-head="retail"] #cr-hd2-bar #cr-hd2-mid #brandTitle h1{
  font-family:'American Typewriter','Courier New',Courier,serif;"""

src = pl.sub(src, ANCHOR, NEW)

# ── 2. the app stamp — the ONLY version string in rendered markup ─────────
src = pl.sub(src, 'v2026-08-25 build 1064', 'v2026-08-25 build 1065')

# ── 3. the CHANGELOG entry, current { b, d, t, s } shape ─────────────────
CL_ANCHOR = "var CHANGELOG = [\n"
ENTRY = """var CHANGELOG = [
  { b:1065, d:'2026-08-25', t:'The header slogan stops being cut off on a phone',
  s:'The retail header read \\u201CSingle sourc\\u2026\\u201D on every screen, because \\u201CSingle source of truth\\u201D needs 247px and a phone header gives it 150px. It could not be shrunk to fit \\u2014 at phone width it would have to drop to 10px, and on a small phone no readable size fits at all. It now shows at full size on anything 438px and wider, and shows nothing below that, where a cut-off slogan looked like a broken app. The other CRMs are untouched: their header carries a short name, not a slogan.' },"""
src = pl.sub(src, CL_ANCHOR, ENTRY)

# ── proof of scope ───────────────────────────────────────────────────────
assert src.count('v2026-08-25 build 1065') == 1, 'app stamp not unique'
assert src.count('v2026-08-25 build 1064') == 0, 'old stamp survived'
assert src.count('@media (max-width:437px)') == 1, 'the new media query is not unique'
assert src.count('b:1065') == 1, 'changelog entry not unique'
# the retail tagline rule itself must be untouched and still single
assert src.count("font-family:'American Typewriter'") == 1, 'tagline rule count changed'
# nothing else moved
assert len(src) > len(orig), 'file did not grow'

pl.write_atomic(SRC, src)
pl.assert_in(SRC, '@media (max-width:437px)')
print('build 1065 written')
print(f'  {len(orig):,} -> {len(src):,} chars (+{len(src)-len(orig)})')
