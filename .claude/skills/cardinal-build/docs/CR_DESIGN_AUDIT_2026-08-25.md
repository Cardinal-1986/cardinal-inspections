# Design audit — 25 Aug 2026, build 1064

*Visual craft, not correctness. The sentinel already asks "is anything broken"; this asks
"does this read as one product". Nothing here is a contrast failure or a bug — those have
their own instruments and were run this morning.*

**Method.** `scripts/audit_design.mjs` walks the same 25 screens the sentinel walks, in both
themes, at 390 / 1194 / 1440px, and records the **computed** style of every visible element —
**18,896 records**. `scripts/audit_design_report.py` reads that harvest.
`scripts/audit_design_shots.mjs` captures the same walk as PNGs, because counting cannot tell
you whether a screen looks like the app next door.

That instrument answers "what PAINTS". The other half — "what did somebody AUTHOR" — is
`scripts/audit_design_css.py`, added when the figures below turned out to be unreproducible
(see the correction under §0). It carries its own scoping and a `--prev` control.

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

### ⚠ And there was a THIRD leak, found by the gate written for the first two

After the modal fix the gate went green — and then a broader version of it found
**`#cr-est-picker`**, the estimates Add-from-Library sheet:

- absent from the DOM at rest (built on first open), so the rest-snapshot could never see it
- `position:fixed; inset:0; z-index:9510`, 390×844
- opened by the `estlibrary` state and **still on screen for all fifteen states after it**,
  **covering the centre of the screen on thirteen** (`elementFromPoint` at the centre lands
  inside it)

So the walk was measuring twelve states through the checklist modal and then thirteen more
through the estimate picker. **Between them, most of the walk.**

It is CLASS-shown (`.open{display:flex}`), so it must be closed by its class — writing
`display:none` onto a class-shown element is permanent damage, and its own `closePicker()` is
`classList.remove('open')`. The setup now clears `.open` from any `position:fixed` element,
which is this app's convention for a class-shown overlay and covers the next one for free.

⚠️ **This means the first pass of the numbers in this document was itself contaminated** — most
visibly `cr-est-picker` topping the "modules by spread" table with 7,956 records, which is not a
dense module but one that was on screen for fifteen screens.

### ⚠ §0 · The correction, and the ONE thing the contamination actually broke

**The sentence that stood here was "Every figure below is from the re-run on the clean walker."
It was written before that re-run existed.** The figures were from the 18:02 harvest, taken
after the first two leaks were fixed and roughly eighty minutes before the third was found. It
was a claim about work I intended to do, phrased as a measurement. Corrected by actually doing
it — `design_v4`, the clean walk, **18,896 app records against the contaminated 27,032**.

**What the contamination did and did not corrupt is worth more than the numbers themselves:**

| | contaminated | clean | |
|---|---:|---:|---|
| distinct type sizes | 36 | **36** | unchanged |
| distinct weights / families | 7 / 8 | **7 / 8** | unchanged |
| distinct radii / gaps | 25 / 13 | **25 / 13** | unchanged |
| distinct grounds, dark | 113 | **113** | unchanged |
| distinct box-shadows | 51 | **50** | −1 |
| distinct padding combos | 98 | **96** | −2 |
| `800` weight, **uses** | 7,500 | **3,228** | −57% |
| `Segoe UI`, **uses** | 9,610 | **4,654** | −52% |
| radius `0`, **uses** | 2,051 | **995** | −51% |
| painted `<button>`s | 3,018 | **2,220** | −26% |

**Cardinality survived almost untouched; frequency was distorted by up to 57%.** An overlay
leak re-counts the same handful of elements on every screen it covers, so it adds very few new
*values* and enormous numbers of *uses*. That is why the top-6 "modules by spread" table was
right all along — the leak added a fourteenth row, it did not change the other thirteen — and
why the one flatly false sentence in this document was a frequency claim: *"`800` is the
most-used weight in the app."* It is not. `700` is, and always was.

**The rule this earns:** after an overlay leak, re-check every claim of the form "N uses" and
leave the "N distinct" ones alone. The leak inflates the first and is nearly invisible in the
second.

### ⚠ And the stylesheet-side numbers had a different problem: no instrument at all

The counts in this document that do **not** come from the browser walk — font-size sites, font
stacks, breakpoints, `!important`, token declarations — were ad-hoc greps typed at a shell.
Re-deriving them by hand the next day disagreed with five of eight, **and the hand re-derivation
was itself wrong**: it "corrected" 704 whole-px sites to 706, when 704 was right and the new
grep had simply forgotten to strip comments — which are **21% of this file's CSS**.

They are now `scripts/audit_design_css.py`, which states its scoping (markup `<style>` only,
comments stripped, media queries scanned per prelude) and takes `--prev` as a control. Three of
those numbers moved in this revision because the instrument disagreed with the grep, and each
is footnoted where it appears.

**The gate no longer needs a list of what may legitimately be up.** It keys on FIRST
APPEARANCE: an element on screen now that was already on screen under an earlier state's name is
one nobody cleaned up. That is mechanism-agnostic, which matters because the three real leaks
used three different mechanisms — `display` (the static modals), `transform` (`#navMenu` at
`translateX(-320px)`), and `class` (`#cr-est-picker`). A rule keyed on any one would have missed
the other two.

**`scripts/gate_setupleak.mjs` is the new standing check** — every state must hand back the
screen it names. Seen RED on the pre-fix tree, GREEN at 25/25 after. This is the
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

**Weights are lopsided:** `700` is the most-used weight at **4,412** uses, then `800` (3,228)
and `600` (2,362), against **1,242** for `400`. Seven weights in all. Regular text is the
minority — bold and semibold together outnumber it more than seven to one. That is a legitimate
house style, but it is worth naming: when most things are bold, bold has stopped meaning
"important".

### Families — four spellings of one intent

| first family in the stack | uses | modules |
|---|---:|---:|
| `Segoe UI` | 4,654 | 92 |
| `ui-monospace` | 3,212 | 25 |
| `Arial` | 1,866 | 12 |
| `-apple-system` | 1,248 | 13 |
| `American Typewriter` | 288 | **1** |
| `system-ui` | 252 | **1** |
| `Georgia` | 238 | 23 |
| `SF Mono` | 8 | 2 |

`Segoe UI`, `Arial`, `-apple-system` and `system-ui` are four different ways of asking for
"the system font".

⚠️ **CORRECTION — an earlier revision of this section had this exactly backwards.** It said the
four resolve alike on the iPad and diverge on Windows. The opposite is true, and it matters
because it changes which device shows the problem:

| declared stack | sites | on iPadOS | on Windows |
|---|---:|---|---|
| `'Segoe UI',Arial,sans-serif` | **747** in app CSS (**793** counting inline `style=` too) | Segoe UI is not installed → falls to **Arial** | **Segoe UI** |
| `-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif` | **36** | **San Francisco** | falls through to Segoe UI |

So on the iPad — the primary device — **747 sites render Arial and 36 render San Francisco, on
the same screen.** On Windows they converge. The inconsistency is visible on the device it was
claimed to be invisible on.

*(An earlier revision said 759 / 35 from a hand grep whose scoping was never recorded and does
not reproduce. `audit_design_css.py` now prints both the app-CSS figure and the whole-file one,
because the 46-site gap is inline `style=` attributes, which reach the user exactly as a
stylesheet rule does.)*

*Stated as font-stack resolution, not as a render: this container has neither Segoe UI nor San
Francisco installed, so iPadOS fallback cannot be reproduced here. Theo's device is the check.*

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
| distinct painted grounds | **113** | 96 |
| used exactly once | 7 | 6 |
| distinct text colours | **130** | 130 |
| used exactly once | 1 | 1 |

**The long tail is healthy** — almost nothing is used once. This is not chaos; it is a large app
with a lot of semantic colour (stage bands, CRM badges, urgency, status spines), most of which
is fixed in both themes **on purpose** and must not be tokenised.

What the number does say is that there is no small set of card grounds. A card's ground depends
on which module drew it.

### Two global tokens that never learned the second theme

Read from a real render at `:root`, both themes:

| token | declarations in app CSS | used for |
|---|---|---|
| `--bg` | `#09090C` · `#f7f7f7` · `#fff` | ✅ flips correctly |
| `--muted` | **one**, `:root{#5c5c5c}` | **11 `color:` references** |
| `--line` | four — `:root{#d9d9d9}`, `body.viewing-community-hub{#ded3bf}`, `var(--ccm-line)` ×2 | **90 `border*` references** |

⚠️ **CORRECTED, and the correction sharpens the finding.** An earlier revision said 38 and 105.
Those counts included the **generated print documents** — six `<style>` blocks that live inside
`<script>` and build an 11pt paper document as a JS string. Twenty-seven of the 38 `--muted`
references and 21 of the 111 `--line` ones are in there, and those documents **declare their own
`--muted` in their own `:root`**. They are a different token with the same name, in a different
document, on white paper. Counting them here was measuring the wrong thing.

The app-CSS figures are **11** and **90**, and the finding survives at that size:

- `--muted` has **exactly one declaration in the whole app** — no theme twin, no scope variant.
- `--line` **does** vary — but by **CRM** (Community gets `#ded3bf`), never by **theme**.
  That is CLAUDE.md's own build-527 lesson recurring one layer down: *scoping by CRM is not
  scoping by theme.* A token that has learned to tell Community from Retail, and has never
  learned to tell light from dark, is more likely to be a real gap than one nobody has touched.

Today these mostly land on translucent washes whose composited ground I did not score — **so
this is a latent risk, not a proven failure**, and the sentinel's INK check is the instrument
that would prove it either way. The risk is that the next surface to use them on the other
ground fails silently, which is the exact shape of the light-ink-on-dark class that has cost
this project seven builds.

---

## 4 · Geometry

- **25 corner radii**, none used only once. `0` (995), `9` (774), `8` (723), `50` (626),
  `12/12/0/0` (600), `7`, `6`, `10`, `0/0/12/12`, `11`, `18`, `999`…
- **`<button>` alone uses 14 different radii** across 2,220 painted buttons, with **31 padding
  combinations** and **12 type sizes**. A button's shape depends on which module drew it.
- **50 distinct box-shadows.**
- **13 gap values** — but 10px, 8px, 9px, 5px, 6px, 4px, 7px, 11px is a 4–12px range with every
  integer in it. There is no 4- or 8-point rhythm; there is a continuum.
- **23 media breakpoints** at the time of the audit, **24 now** (build 1065 added 437): 380,
  390, 420, 430, 437, 480, 520, 560, 620, 640, 680, 700, 720, 760, 820, 900, 901, 1100, 1240,
  1300, 1400, 1599, 1600, 1900. Four of them (520/560/620/640) are all "small phone" and differ
  by 20–40px. *(An earlier revision said 22: the counting regex used one lazy
  `(?:max|min)-width` alternation per `@media`, which returns only the FIRST width and so lost
  the `1599` in `(min-width:1100px) and (max-width:1599px)`.)*
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

- **`!important` is 1.4% of 28,751 declarations** (413 uses, comments stripped). For a 4.4 MB
  no-framework file patched in place for a thousand builds, that is a low override debt.
- **No radius and no shadow is used exactly once** — there is no single-use decoration.
- The token namespaces are real: **21 prefixes, 417 declared custom properties** — the biggest
  being `--rbe-*` (79), `--ct-*` (53), `--ccm-*` (37) — and the module-scoped ones (`--lc0…5` in
  two modules, `--crw-*` declared nowhere with literal fallbacks) are **deliberate and correct**,
  not collisions.

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
