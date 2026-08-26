#!/usr/bin/env python3
"""Build 1068 — the remaining eight under-floor inks from the 25 Aug sweep.

Ten findings across eight elements (two fail in BOTH themes, so they count
twice). Build 1067 took the three that shared one root cause; these do not
share one, so each is justified on its own line below.

MEASURED IN CHROMIUM, BOTH THEMES, AGAINST THE COMPOSITED GROUND
                                             dark          light
  1 .rvflip  "Flip when their review..."   11.51 ok      1.56 FAIL -> 18.10
  2 "(from client profile)"  x2             3.18 FAIL     3.18 FAIL ->  6.16
  3 #cr-pae-tabs button "INSPECTION"        4.35 FAIL     4.35 FAIL ->  5.46
  4 .cr-lil-tabs button.active .count       1.56 FAIL     2.14 FAIL -> 11.12/8.15
  4b #cr-pae-tabs button.active .count     the SAME rule in a second module,
                                           never swept; same defect, same fix
  5 "no description"                         7.40 ok      2.65 FAIL ->  5.33
  6 .convertins .cvtxt small                 6.44 ok      3.82 FAIL ->  5.85
  7 .phnote (via --rbe-empty-fg)             7.55 ok      4.24 FAIL ->  5.36
  8 .cr-est-nav .navempty                    4.20 FAIL    4.20 FAIL ->  6.40

THREE OF THEM FAIL IN BOTH THEMES, AND THAT IS THE INTERESTING PART
  2, 3 and 8 are NOT light-mode bugs. They sit on surfaces that do not flip at
  all -- two cream light-era cards (#f8f5f4, #f0e8d0) and the estimate nav rail
  (#0a0e16). A theme-pair token would be the wrong instrument for those: there
  is only one ground, so there is only one right ink. They get a fixed value.
  4 also fails in both, for the opposite reason -- near-black text on a chip
  that is dark in one theme and cardinal red in the other. Both grounds are
  dark, so one light ink serves both.

  ⚠ Do not "finish the job" by tokenising 2, 3 or 8. A single declaration site
  per colour on a single-theme surface is the tell that it is deliberate --
  CLAUDE.md says this about OC Colors and the Showcase, and it applies here.

WHAT CHANGES AT THE TOKEN LEVEL, AND WHY THAT IS THE RIGHT LEVEL FOR ONE OF THEM
  7 is `--rbe-empty-fg`, whose LIGHT value (#767676) reads 4.24:1 on the app's
  light page. That token is used by FIVE empty-state rules -- .ljempty,
  .cre-empty, .phnote, .kpempty, .pu-empty -- all of them muted notes on light
  cards. Fixing .phnote alone with an override would leave the other four at
  the same ratio and stack a rule where a value was wrong. #666666 is 5.36:1.
  Its DARK value (#9aa0a8, 7.55:1) is untouched.

  ⚠ Blast radius checked before the edit, not after: 5 rules, all empty-state
  notes, all on light grounds in the light theme. Darkening a light-theme ink
  on a light ground can only raise contrast for all five.

WHERE AN EXISTING PAIR FITS, IT IS USED RATHER THAN A COMPUTED LITERAL
  1 -> var(--rbe-ink,#cfcfcf)   (#cfd6df dark / #161616 light)
  5 -> var(--rbe-mute,#a89e88)  (#9aa0a8 dark / #6b6b6b light)
  Build 527 is why: a computed literal applied unconditionally fixes one theme
  and breaks the other. A pair cannot drift. Each carries the current dark
  value as its literal fallback, per the 448-449 rule.

  ⚠ 5 IS AN INLINE STYLE. Like 1066's #galClient and 1067's .ljsummary h3, no
  stylesheet rule could ever have reached it -- it has to change in the
  attribute itself.

6 GETS THE LIGHT TWIN THAT 1067 TAUGHT
  Retail dark already overrides .convertins .cvtxt small to var(--rbe-mute)
  under :root:not([data-theme="rb-light"]). There was never a light
  counterpart, so light fell through to #6b7a90 -- a blue-grey on a red tint.
  The twin is added beside the dark rule with the identical selector shape, so
  insurance and community are untouched: their .convertins is a different card
  on a different ground and is out of scope for this build.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = 'index.html'
src = pl.load(SRC)
orig = src

# ── 1 · the review switch — an existing PAIR ─────────────────────────────
src = pl.sub(src,
    """  font:600 13px 'Segoe UI',Arial,sans-serif;color:#cfcfcf;cursor:pointer;-webkit-user-select:none;""",
    """  /* 1068: was a flat #cfcfcf — 11.51:1 on the dark card, 1.56:1 on the light
     one. This card DOES flip, so a pair is the right instrument. */
  font:600 13px 'Segoe UI',Arial,sans-serif;color:var(--rbe-ink,#cfcfcf);cursor:pointer;-webkit-user-select:none;""")

# ── 2 · the checklist/gcModal byline — CREAM in both themes, so one ink ──
src = pl.sub(src,
    '<span style="color:#8a8a8a;">(from client profile)</span>',
    '<span style="color:#5c5c5c;">(from client profile)</span>', count=2)

# ── 3 · the photo-editor tab strip — CREAM in both themes ────────────────
src = pl.sub(src,
    "#cr-pae-tabs button{background:#f0e8d0;color:#6b6b6b;",
    "#cr-pae-tabs button{background:#f0e8d0;color:#5c5c5c;")

# ── 4 · the active line-item tab's count badge ───────────────────────────
src = pl.sub(src,
    ".cr-lil-tabs button.active .count{background:rgba(0,0,0,.22);color:#1a1a1a}",
    "/* 1068: near-black on a darkened wash over #c8202e (light) or #3b3b41\n"
    "   (dark) — 2.14:1 and 1.56:1. Its own parent .cr-lil-tabs button.active is\n"
    "   already color:#fff; the badge simply never followed. */\n"
    ".cr-lil-tabs button.active .count{background:rgba(0,0,0,.22);color:#ffffff}")

# ── 4b · THE SAME BADGE, IN A SECOND PLACE ───────────────────────────────
# Found by the GATE, not by the sweep: #cr-pae-tabs carries a byte-identical
# `button.active .count{background:rgba(0,0,0,.22);color:#1a1a1a}`. The sweep
# never flagged it because the photo editor's tab strip shows no count in the
# walked state — the same defect, invisible to the same instrument. Fixing one
# and shipping the other would be knowingly shipping half a fix.
src = pl.sub(src,
    "#cr-pae-tabs button.active .count{background:rgba(0,0,0,.22);color:#1a1a1a}",
    "#cr-pae-tabs button.active .count{background:rgba(0,0,0,.22);color:#ffffff}")

# ── 5 · "no description" — INLINE, so the attribute must change ──────────
src = pl.sub(src,
    '<span style="color:#a89e88;font-style:italic;">no description</span>',
    '<span style="color:var(--rbe-mute,#a89e88);font-style:italic;">no description</span>')

# ── 6 · the light twin the dark override never got ──────────────────────
src = pl.sub(src,
    """:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community) #projectView .convertins .cvtxt small{
  color:var(--rbe-mute)}""",
    """:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community) #projectView .convertins .cvtxt small{
  color:var(--rbe-mute)}
/* 1068: the LIGHT twin. The dark rule above has existed on its own, so light
   fell through to the base #6b7a90 — a blue-grey on the card's #fdecec red
   tint, 3.82:1. Identical selector shape, so insurance and community keep
   their own .convertins entirely. */
:root[data-theme="rb-light"] body:not(.claim-insurance):not(.claim-community) #projectView .convertins .cvtxt small{
  color:#5c5c5c}""")

# ── 7 · the empty-state token's LIGHT value — fixes five rules at once ───
src = pl.sub(src, '--rbe-empty-fg:#767676;', '--rbe-empty-fg:#666666;')

# ── 8 · the estimate nav rail's empty line — one ground, one ink ─────────
src = pl.sub(src,
    "#cr-est-view .cr-est-nav .navempty{color:#6b7688;",
    "#cr-est-view .cr-est-nav .navempty{color:#8b95a8;")

# ── the app stamp ────────────────────────────────────────────────────────
src = pl.sub(src, 'v2026-08-25 build 1067', 'v2026-08-25 build 1068')

# ── CHANGELOG ────────────────────────────────────────────────────────────
src = pl.sub(src, "var CHANGELOG = [\n", """var CHANGELOG = [
  { b:1068, d:'2026-08-25', t:'Eight more bits of faint text, on eight screens',
  s:'The rest of the readability sweep: the review switch on a client, the \\u201Cfrom client profile\\u201D byline on a checklist, the photo editor\\u2019s tab strip, the count badge on the open line-item tab, the \\u201Cno description\\u201D placeholder, the Convert to Insurance caption, every empty-state note in the app, and the estimate side rail\\u2019s empty line. Three of them were faint in BOTH light and dark, not just one \\u2014 they sit on cards that keep the same colour whichever theme is on. The count badge was the worst at 1.6 to 1: near-black on a dark chip.' },""")

# ── proof of scope ───────────────────────────────────────────────────────
assert src.count('v2026-08-25 build 1068') == 1
assert src.count('v2026-08-25 build 1067') == 0
assert src.count('b:1068') == 1
assert src.count('color:var(--rbe-ink,#cfcfcf);cursor:pointer') == 1
assert src.count('<span style="color:#5c5c5c;">(from client profile)</span>') == 2
assert src.count('#cr-pae-tabs button{background:#f0e8d0;color:#5c5c5c;') == 1
assert src.count('.cr-lil-tabs button.active .count{background:rgba(0,0,0,.22);color:#ffffff}') == 1
assert src.count('#cr-pae-tabs button.active .count{background:rgba(0,0,0,.22);color:#ffffff}') == 1
assert src.count('.count{background:rgba(0,0,0,.22);color:#1a1a1a}') == 0, \
    'BOTH active-count badges must move; one of them alone is not a fix'
assert src.count('<span style="color:var(--rbe-mute,#a89e88);font-style:italic;">no description</span>') == 1
assert src.count(':root[data-theme="rb-light"] body:not(.claim-insurance):not(.claim-community) #projectView .convertins .cvtxt small{\n  color:#5c5c5c}') == 1
assert src.count('--rbe-empty-fg:#666666;') == 1
assert src.count('--rbe-empty-fg:#767676;') == 0
assert src.count('#cr-est-view .cr-est-nav .navempty{color:#8b95a8;') == 1

# the OLD values must be gone from these sites and NOWHERE ELSE.
# Self-computing: each shared hex must lose exactly the number of sites touched.
# ⚠ #a89e88 and #cfcfcf are NOT in this table, and the first version of it
# wrongly included #a89e88 and failed a correct patch at a delta of 0. Both are
# RETAINED on purpose as the literal fallback inside var(--rbe-mute,#a89e88) and
# var(--rbe-ink,#cfcfcf) — the 448-449 rule, where a bare var() went transparent
# app-wide because another module stripped a declaration a second after load. A
# replacement that keeps its old value as a fallback cannot show up as a
# deletion; those two are asserted on their exact declaration text instead.
for hexv, n, what in [('#8a8a8a', 2, 'the two (from client profile) inlines'),
                      ('#1a1a1a', 2, 'BOTH active count badges (lil + pae)'),
                      ('#6b7688', 1, 'the nav rail empty line'),
                      ('#767676', 1, 'the empty-state token light value')]:
    d = orig.count(hexv) - src.count(hexv)
    assert d == n, f'expected {hexv} to lose exactly {n} site(s) ({what}), lost {d}'
# #6b6b6b is used by 74 other rules — exactly one may change
assert orig.count('#f0e8d0;color:#6b6b6b') - src.count('#f0e8d0;color:#6b6b6b') == 1
# #cfcfcf keeps its other four users; only the .rvflip declaration moves
assert orig.count('color:#cfcfcf;cursor:pointer') - src.count('color:#cfcfcf;cursor:pointer') == 1
# the DARK values of both pairs must be untouched
assert src.count('--rbe-empty-fg:#9aa0a8') == 1, 'the dark empty-state ink must not move'
# The two fallback-bearing replacements keep their old hex ON PURPOSE. Assert
# that on the DECLARATION, never on the bare hex.
# ⚠ A bare-hex assertion failed here too, and in the OTHER direction: #cfcfcf
# came out one HIGHER than it went in, because the comment added above the rule
# quotes the colour in prose. That is the third time today a scope proof has
# been fooled by a comment the same patch introduced (1067's --rbe-acclt, this
# file's #a89e88, now this). The lesson is not "count more carefully" — it is
# that a hex is not an anchor. Anchor on the declaration.
assert src.count('color:var(--rbe-mute,#a89e88);font-style:italic') == 1
assert src.count('color:var(--rbe-ink,#cfcfcf);cursor:pointer') == 1
assert src.count('color:#a89e88;font-style:italic;">no description') == 0
assert src.count("Arial,sans-serif;color:#cfcfcf;cursor:pointer") == 0

pl.write_atomic(SRC, src)
pl.assert_in(SRC, '.cr-lil-tabs button.active .count{background:rgba(0,0,0,.22);color:#ffffff}')
print('build 1068 written')
print(f'  {len(orig):,} -> {len(src):,} chars (+{len(src)-len(orig)})')
