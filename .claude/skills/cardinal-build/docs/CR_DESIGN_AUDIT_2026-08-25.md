# Design audit — 25 Aug 2026, build 1064

*Visual craft, not correctness. The sentinel already asks "is anything broken"; this asks
"does this read as one product". Nothing here is a contrast failure or a bug — those have
their own instruments and were run this morning.*

**Method.** `scripts/audit_design.mjs` walks the same 25 screens the sentinel walks, in both
themes, at 390 / 1194 / 1440px, and records the **computed** style of every visible element —
**27,032 records**. `scripts/audit_design_report.py` reads that harvest.
`scripts/audit_design_shots.mjs` captures the same walk as PNGs, because counting cannot tell
you whether a screen looks like the app next door.

The stylesheet was deliberately **not** parsed. Several of the 147 `<style>` blocks are print
templates inside template strings that set `:root{--ink:#1b1b1b}` for an 11pt document; glued
together they restyle the app, and a rig once scored an invisible heading at 17.61:1 that way.

---

## ⚠ Before the findings: the instrument was wrong, and it had been wrong for the sentinel too

**Twelve of the twenty-five sentinel states were never actually swept.** `closeAll()` in
`sentinel_setup_cardinal.js` knew about the drawer and two module views and nothing about the
nine `display:none;position:fixed` overlays in static markup. Measured:

| state | ckModal | projModal | white elements on screen |
|---|---|---|---:|
| newproject | – | **open** | 8 |
| checklist | **open** | **open** | 40 |
| signature | **open** | **open** | 42 |
| … every state through `showcase` (25th) | **open** | **open** | 42–54 |

From state 13 onward every screen was measured with the checklist modal — a white card, forty
light-era elements — sitting over it. That is almost certainly what produced the *"Cardinal
Truth compositing artifacts"* in this morning's sentinel run: `truth` is state 23.

**And the drawer close had never worked either.** `closeDrawer()` removed classes; the drawer
module does not keep an `open` flag, it *derives* one from `menu.style.display === 'block'`
inside a `sync()` that a MutationObserver re-runs every frame. The classes came back on the
next frame. The file's own banner records the drawer bleed as fixed — the bleed was real, the
remedy could not have worked.

Both fixed at the root. The overlay close is a **snapshot**, not a list of ids: before the walk
starts it records every `position:fixed` element the app leaves `display:none` at rest, and
restores exactly those. A list of nine rots the moment a tenth modal ships; a snapshot cannot.

**`scripts/gate_setupleak.mjs` is the new standing check** — every state must hand back the
screen it names. Seen RED at 16 failures on the pre-fix tree, GREEN at 25/25 after. This is the
project's own rule: a class that recurs gets a check, not another paragraph. This one had bitten
twice.

---

## 1 · Type — the clearest finding in the audit

**29 fixed type sizes hold at every width.** Fourteen of them sit between **9px and 15.5px**, in
**half-pixel steps**.

That is not an artifact of the rig — it is literal authorship. Counted in the stylesheets:

| | sites | distinct |
|---|---:|---:|
| `font-size` declared with a **decimal** px | **252** | 11 |
| `font-size` declared in whole px | 704 | 25 |

`12.5px` appears at **66** sites. `12px` appears at 82 and `13px` at 116 — so the app is
actively using 12, 12.5, 13 **and** 13.5 as separate decisions. Same for 10/10.5/11/11.5 and
14/14.5/15/15.5.

**A half-pixel is not a hierarchy step.** At arm's length on a phone nobody can tell 12.5 from
13, so the difference costs authoring effort and buys no legibility. The scale below ~16px is
doing the work of about five steps with fourteen values.

A further **7 values** come and go with the viewport — 16 `clamp()` sites. One decision, many
numbers; correctly *not* counted as scale steps.

**Weights are lopsided:** `800` is the most-used weight in the app at **7,500** uses, against
**2,136** for `400`. Regular text is the minority. That is a legitimate house style, but it is
worth naming: when most things are bold, bold has stopped meaning "important".

### Families — four spellings of one intent

| first family in the stack | uses | modules |
|---|---:|---:|
| `Segoe UI` | 9,610 | 93 |
| `ui-monospace` | 3,212 | 25 |
| `Arial` | 2,088 | 13 |
| `-apple-system` | 1,248 | 13 |
| `American Typewriter` | 432 | **1** |
| `Georgia` | 334 | 23 |
| `system-ui` | 252 | **1** |
| `SF Mono` | 8 | 2 |

`Segoe UI`, `Arial`, `-apple-system` and `system-ui` are four different ways of asking for
"the system font". On the iPad they all resolve to San Francisco and the inconsistency is
invisible; on a Windows desktop they diverge. **This is the kind of thing that only shows up on
the machine you don't test on** — and Theo uses both.

`American Typewriter` is one module: the header tagline.

---

## 2 · The header tagline truncates on every phone screen

`"Single sourc…"` — visible in all ten phone captures. The line is
*"Single source of truth"*, set in `American Typewriter`, and at 390px it never fits.

It is the first text on every screen in the app.

---

## 3 · Colour — the count, and what it does and does not mean

| | dark | light |
|---|---:|---:|
| distinct painted grounds | **113** | 97 |
| used exactly once | 7 | 6 |
| distinct text colours | **131** | 132 |
| used exactly once | 1 | 1 |

**The long tail is healthy** — almost nothing is used once. This is not chaos; it is a large app
with a lot of semantic colour (stage bands, CRM badges, urgency, status spines), most of which
is fixed in both themes **on purpose** and must not be tokenised.

What the number does say is that there is no small set of card grounds. A card's ground depends
on which module drew it.

### Two global tokens that never learned the second theme

Read from a real render at `:root`, both themes:

| token | dark | light | used for |
|---|---|---|---|
| `--bg` | `#09090C` | `#f7f7f7` | ✅ flips correctly |
| `--muted` | `#5c5c5c` | `#5c5c5c` | **38 `color:` references** |
| `--line` | `#d9d9d9` | `#d9d9d9` | **105 `border` references** |

`--muted` and `--line` are named like theme tokens and are single-valued. Today they mostly land
on translucent washes whose composited ground I did not score — **so this is a latent risk, not
a proven failure**, and the sentinel's INK check is the instrument that would prove it either
way. The risk is that the next surface to use them on the other ground fails silently, which is
the exact shape of the light-ink-on-dark class that has cost this project seven builds.

---

## 4 · Geometry

- **25 corner radii**, none used only once. `0` (2,051), `9` (1,446), `8` (723), `50` (626),
  `12/12/0/0` (600), `10`, `7`, `6`, `11`, `18`, `999`…
- **`<button>` alone uses 14 different radii** across 3,018 painted buttons, with **32 padding
  combinations** and **13 type sizes**. A button's shape depends on which module drew it.
- **51 distinct box-shadows.**
- **13 gap values** — but 10px, 8px, 9px, 5px, 6px, 4px, 7px, 11px is a 4–12px range with every
  integer in it. There is no 4- or 8-point rhythm; there is a continuum.
- **22 media breakpoints**: 480, 520, 560, 620, 640, 700, 760, 820, 900, 901, 1100, 1600 and
  ten more. Four of them (520/560/620/640) are all "small phone" and differ by 20–40px.
- **63 z-index values**, 0 → 100001, with clusters at 9500/9600/9700, 10000/10500/10600/10700,
  and 99998/99999/100000/100001.

---

## 5 · Where a build would actually buy something

| module | records | type sizes | radii | grounds |
|---|---:|---:|---:|---:|
| `acxMount` (client profile) | 628 | **16** | 9 | **19** |
| `cr-pb` (production board) | 820 | 17 | 7 | 12 |
| `crewsView` | 450 | 9 | **14** | 13 |
| `cr-disp` (dispatch) | 938 | 11 | 8 | 13 |
| `cr-est-view` | 378 | 12 | 8 | 8 |
| `cr-claims-mount` | 480 | 8 | 6 | 13 |

The **client profile** is the densest: 16 type sizes and 19 grounds on one screen.

---

## 6 · What is already right — copy this, don't rebuild it

**Production (builds 766–772) is the model.** Captured in both themes: same geometry, same
hierarchy, same card radius, one ground per surface, and a light theme that is a real twin
rather than an inversion. Nothing in this audit applies to it.

Also healthy, and worth saying because audits only ever list problems:

- **`!important` is 1.6% of ~26,851 declarations** (427 uses). For a 2.6 MB no-framework file
  patched in place for a thousand builds, that is a low override debt.
- **No radius and no shadow is used exactly once** — there is no single-use decoration.
- The token namespaces are real: 23 prefixes, 439 declared custom properties, and the
  module-scoped ones (`--lc0…5` in two modules, `--crw-*` declared nowhere with literal
  fallbacks) are **deliberate and correct**, not collisions.

---

## 7 · Checked and dropped — these are NOT findings

Reported here so nobody re-finds them:

| looked like | actually |
|---|---|
| Cardinal Truth renders **white in the dark theme** | **Deliberate.** Pixel-identical in both themes; the insurance CRM is a cream surface by design. The build log calls it *"a screen that renders perfectly"* and records four separate instrument faults that made it look broken |
| `--bg` declared twice with different values | Print-scoped. It flips correctly, `#09090C` → `#f7f7f7` |
| The push-notification bar covers content | **Deliberate.** Build 1014, `position:fixed; z-index:170`, dismissible, with a comment explaining the z-index choice |
| `--crw-*` referenced but never declared (12 names) | **Deliberate.** The literal fallbacks *are* the palette — documented |
| `--lc0…--lc5` declared in two modules with different values | Scoped to their own mounts. That is correct scoping |
| 16 un-namespaced tokens "colliding" | Nine survive comment-stripping and scope; of those, most are theme pairs or media-scoped |
| A closed drawer contributing its light-era inks | **My probe's fault.** `#navMenu` sits at `translateX(-320px)` with a full-size rect. Fixed by filtering horizontally-off-canvas elements — vertically would throw away every long page |

---

## Suggested order, if any of this is worth doing

Nothing here is urgent and none of it is broken. In descending value per build:

1. **The type scale.** Collapse 9–15.5px onto whole pixels. 252 decimal sites, mechanical,
   and it is the one finding a person would actually notice.
2. **The header tagline** that truncates on every phone screen — one line.
3. **One system font stack**, written once. Invisible on the iPad, real on the desktop.
4. **Give `--muted` and `--line` a second value** before something new uses them.
5. **Button geometry** — 14 radii and 32 paddings onto a small set.

Items 1, 3 and 5 are sweeps with a mechanical gate and a rendered before/after. Item 2 is a
one-liner. Item 4 is two declarations.

**Theo's eyes remain the gate on all of it.** Every number here is computed; none of it is a
judgement about whether the app looks good.
