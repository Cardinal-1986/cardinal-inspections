# Showroom extraction — the read-only spike

**31 Aug 2026. Read-only: `index.html` was not modified and nothing shipped.**

Theo fired **trigger 1** from `OPEN_ITEMS.md` → *"A separate `showroom.html` — a REAL
project, deliberately deferred"*:

> *"I want the sales presentation experience independently deployable so CRM changes
> cannot destabilize it. Trigger 2 is not currently the primary reason."*

That section, recorded 8 Aug at his own request (**"Option 1 but remember option 3"**),
named the blocker as the **gate ladder**, not the modules. This spike measures whether
that still holds. Method: `tsc --checkJs` on each module in isolation to enumerate
undefined names, the JS lexer for `window.*` and DOM lookups (comments and strings
excluded), and a sweep of `scripts/` for gates that slice modules out by block id.

---

## ⚠ THE HEADLINE IS A CORRECTION TO THE PLAN, NOT TO THE FEASIBILITY

`OPEN_ITEMS.md` framed the non-duplication route as **"extract them to shared files."**
**For trigger 1 that is the wrong answer, and it fails on its own terms.** A file both
apps load re-couples their deploys: change it for the Showroom and the CRM ships it too.
That is precisely what Theo asked to stop.

**The right shape is RELOCATION, not sharing.** The modules *move* to the Showroom; the
CRM's call sites become a link to `showroom.cardinalroster.com`. No duplicate (so "one
pipeline per concept" holds), no shared file (so the deploys are genuinely independent).

The rest of this document measures whether relocation is affordable. It is.

---

## Module 1 — Showcase (`cr-show-styles` + `cr-show-script`)

**172,267 chars — 168 KB, 3.2% of `index.html`.** Script 124,814 / styles 47,453.

### Bare globals (tsc TS2304, isolated compile)

| name | refs |
|---|---:|
| `crAsk` | 5 |

**One.** For a 168 KB module.

### Real CRM dependencies (`window.*`, lexer, CODE hits only)

Fourteen names, of which four are browser built-ins (`crypto`, `performance`,
`matchMedia`, `innerWidth`) and one is its own export. **Ten are real**, and they split:

| group | names | what happens on relocation |
|---|---|---|
| **CRM navigation — vanishes by construction** | `hideAllViews` ×2 · `navSetView` ×2 · `showHome` ×2 · `openReportsView` ×2 | these exist ONLY because Showcase lives inside the CRM. The Showroom substitutes its own navigation; nothing is ported |
| **Ordinary services — must be provided** | `signedPhotoMap` ×8 · `supa` ×1 · `is_admin` ×2 · `aiHeaders` ×1 · `crTell` ×1 · `crAsk` ×5 | a Supabase client, photo-URL signing, a permission check, API headers, a toast, a confirm. Every app needs these |

### DOM anchors it needs from elsewhere

**ZERO.** Showcase creates every element it touches. It is a self-mounting module — the
single best structural answer available, and it means there is no hidden dependency on
CRM markup.

### External call sites — the CRM's side of the seam

Three methods, fifteen calls, concentrated in five places:

| block | calls |
|---|---|
| `cr-appt-script` | `open` ×3, `close` ×2 |
| (main block) | `open` ×3 |
| `cr-lr-script` · `cr-sf-script` · `cr-fd-script` | `open` ×1 each |
| plus | `openForProject` ×4 · `#cr-show` named 17× outside the module |

These are already "open the presentation" moments; handing off to another app there is
honest UX, not a seam a user would feel.

### Gates affected

**Break (slice by block id) — 6 live + 1 historical:** `gate_1076` · `gate_983` ·
`harness_ourroofs` · `harness_showcase` · `harness_tray` · `harness_walk` ·
*(`patch574.py`, a historical patch script — irrelevant)*.

**Survive (drive DOM/API, which does not change) — 10+:** `audit_design` ·
`gate_1161` · `gate_1162` · `render_appt` · `render_fd1164` · `render_walkdoor` ·
`audit_viewports` · `render_showcase` · `render_toggle694` · `sentinel_setup_cardinal`.

---

## Module 2 — OC Colors (`cr-occ-styles` + `cr-occ-script`)

**94,196 chars — 92 KB, 1.7% of `index.html`.** Script 56,237 / styles 37,959.

### Bare globals

| name | refs |
|---|---:|
| `supa` | 3 |
| `crTell` | 3 |

### Real CRM dependencies

| group | names |
|---|---|
| **CRM navigation — vanishes** | `hideAllViews` ×2 · `navPush` ×2 · `showHome` ×2 |
| **Ordinary services** | `report` ×8 · `toast` ×6 · `currentUser` ×2 · `is_admin` ×2 · `supa` ×1 |
| **⚠ CROSS-MODULE** | `window.CardinalShowcase` ×1 |

⚠️ **OC Colors depends on Showcase**, and it is a real dependency, not a stray reference:
`shrinkOne(file, name)` reads `window.CardinalShowcase` to reach the image-shrink
toolchain, guarding with `if(!S || typeof S.shrink !== 'function')`. **This is build
633's deliberate "single place that checks the image toolchain."**

**Consequence: the two modules must move TOGETHER, or the link must be rebuilt.** They
belong in the same app, which is what the Showroom is — so this argues *for* the plan,
not against it. But it removes the option of relocating one and leaving the other.

### DOM anchors it needs from elsewhere

**ZERO** — same as Showcase. Self-mounting.

### External call sites

Four methods, eight calls: `open` ×3 · `close` ×2 · `lines` ×2 · `list` ×1.
`#cr-occ` named 13× outside the module.

### Authentication and data dependencies

| kind | name | refs |
|---|---|---:|
| table | `photos` | 6 |
| table | `oc_color_photos` | 3 |
| table | `oc_colors` | 1 |
| storage bucket | `photos` | 6 |
| auth | `currentUser`, `is_admin` | 2 each |

⚠️ **The permission model is a settled decision and must survive the move.** Theo,
verbatim: **"Yes they can see colors"** — all signed-in staff, *not* admin-only. That
differs from Studio, whose `photos/studio/*` prefix is admin-only, and it is why build
629's note says the colours bin must **COPY** into `oc-colors/<slug>/` rather than
reference `photos/studio/*`. **A Showroom sign-in must therefore be staff-level, not
admin-level, or Colors breaks for the people who use it.**

⚠️ Also inherited: `oc_colors` is **single-theme Blackout by design** (`--occ-*`, 12
names declared once) — do not "complete" it with a light twin in the new app. And
`OC_BRAND_RULES.md` governs every OC mark; the approval gate is Theo's.

### Gates affected

**Break — 5 live + 1 historical:** `audit_contrast` · `harness_colors` ·
`harness_occhead` · `harness_ourroofs` · `harness_vision` · *(`patch_750.py`,
historical)*.

**Survive — 9:** `audit_design` · `gate_1161` · `gate_1162` · `gate_750` · `gate_779` ·
`gate_sheets937` · `render_fd1164` · `render_toggle694` · `sentinel_setup_cardinal`.

⚠️ **`harness_ourroofs` slices BOTH modules** — it is the one gate that spans the seam
and will need the most care.

---

## The blind spot that must be closed FIRST

**`check_build.py` and `.github/workflows/check.yml` both parse inline scripts with**

```js
/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g
```

**They deliberately skip anything carrying a `src`.** So the moment a module becomes an
external file it **silently stops being syntax-checked**. That is not a loud break —
it is a coverage hole that reports green, which this project has been bitten by
repeatedly (`gate_1180` crashing unnoticed; `gate_a11y` green for twenty builds over a
screen its walk never visited).

**Close this before anything moves.**

---

## Estimated relocation sequence

Ordered so that nothing is unprotected at any step. **No step ships production behaviour
until step 5.**

| # | step | risk |
|---|---|---|
| **1** | Teach `check_build.py` **and** CI to parse external `<script src>` files. Prove it by pointing them at a deliberately-broken file and seeing red. | **low** — additive; nothing moves yet |
| **2** | Stand up `showroom.html` (or its own repo/Vercel project) with staff-level Supabase sign-in and its own storage key, following the `visualizer/` precedent — own folder, no CRM code, asserted by a gate like `gate_807`. | low — new file, nothing removed |
| **3** | Provide the six services both modules need: `supa`, `signedPhotoMap`, `is_admin`, `aiHeaders`, `crTell`/`toast`/`report`, `crAsk`. | low — small, standard |
| **4** | Move **Showcase and OC Colors together** (the `shrinkOne` link forbids splitting them). Replace the four navigation dependencies with the Showroom's own. | **medium** — the real work |
| **5** | Replace the CRM's 23 call sites (15 Showcase + 8 Colors) with links; unpick `hideAllViews`, `navRestore`, `__crNav`, `BLACKOUT` and the hub handler — **the five-site retirement checklist from build 807.** | **medium** — this is the shipping step |
| **6** | Repair the 11 gates that slice by block id (6 Showcase, 5 Colors; `harness_ourroofs` counts once but spans both). Each reads a file instead of slicing a block. | low — mechanical, but 11 of them |

**Verdict: days, not weeks — and the `OPEN_ITEMS` blocker was overstated for these two
modules.** It feared coupling that measurement does not find: one bare global for
Showcase, two for Colors, **zero DOM anchors for either**, and small public APIs. What
is real is the gate work (11 files) and the CI blind spot (step 1), which is cheap but
must come first.

**Not measured here, and required before step 5:** The Walk, Why Cardinal, The
Appointment and Proof are also presentation surfaces inside `index.html`. This spike
covers the two modules `OPEN_ITEMS` named as the expensive ones.

⚠️ **Fences any Showroom inherits** — from `CONTRACTOR_VISION_SUITE.md`: The Walk's
order is *AI circles → **a person confirms** → then the client sees*; AI renders are
presentation-only and never reach project photos, claims or CompanyCam
(altered-evidence); the GPS/EXIF exclusion stays closed; **"No pricing on sheets it's
not a quote."**
