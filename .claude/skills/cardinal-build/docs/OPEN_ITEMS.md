# Cardinal Resource App — Open Items

## 🟢 IN PROGRESS — the manual estimating engine, enhanced (27 Aug 2026)

Theo pasted a generic React/TS/Tailwind "estimating engine" spec; the pushback held —
**stay vanilla, enhance the existing Obsidian engine, keep it a client-price quote tool**
(no cost/markup/margin layer), **light-mode only** (`--est-*`, porcelain, neumorphic number
cells). His batch plan:

- **Batch 1 — ✅ Build 1095.** Editor visual polish + the tokenized light "Cardinal" theme.
- **Batch 2a — ✅ Build 1096.** Per-line **Detailed / Flat** switch (`l.flat`, jsonb, no schema
  change): collapse Qty/Unit on Flat, adaptive keyboard (Enter → new line, Tab → next entry),
  mixed-mode proposal + Community sheet, mobile-compact insets. Retired the global "Qty / unit"
  checkbox. Gated: `harness_estflat1096.js` + `render_estflat1096.mjs` (both green/red controlled).
- **Batch 2b — ✅ Build 1097.** Line-item sections: `section_id`+`sec` per line (jsonb, no
  migration), one shared `window.crEstGroups`, editable title + autocomplete, live subtotal badge,
  ▲/▼ block reorder, collapse, per-section + Line, + Section, per-line move-to-section select;
  proposal + Community sheet print banners + per-section subtotals; single-ungrouped stays flat
  (back-compat). Gated: `harness_estsec1097.js` + `render_estsec1097.mjs` (green/red controlled).
- **Batch 3a — ✅ Build 1098.** Saved assemblies: **6 in-code defaults** (Theo's curated cross-trade
  set — Full Roof/OC Duration, Standing Seam, Siding, Soffit & Fascia, Seamless Gutters, Windows) +
  `estimate_assemblies` table for custom (shared read, author/admin write, `created_by DEFAULT
  my_email()`). + Assembly opens the picker in `'assembly'` mode; per-card input scales on **two
  axes** (`per_sq`×squares, `per_unit`×count for windows), LF/EA base lines keep their starting qty;
  Save as Assembly on a section header names it by the section title. Prices ship at $0. **SQL:
  `estimate_assemblies.sql` — apply before deploy.** Gated: `harness_estasm1098.js` +
  `render_estasm1098.mjs`.
- **Batch 3b — ✅ Build 1099: proposal polish.** `buildDocHtml` — section banners refined in place
  (red left accent + deeper tint, `break-after:avoid`), faint zebra on **item rows only**
  (continuous `_zeb` parity, banners/subtotals never striped), `break-inside:avoid` on the totals
  `tfoot`/deposit/card, and an **Acceptance & Authorization** card (money recap + terms +
  Client/Cardinal signatures; labels `--muted` for ≥4.5:1). **Theo picked option 1 — KEEP both
  deposit displays** (mid-doc Payment Terms box *and* the card recap). Show/hide-subtotals toggle in
  the preview toolbar (`hide-subs` class; preview/print only, published doc keeps subtotals). Gated:
  `render_estdoc1099.mjs` + `harness_estdoc1099.js`. **The manual estimating engine batch is
  complete** (1096 flat toggle, 1097 sections, 1098 assemblies, 1099 proposal polish).

Settled and not to re-litigate: **no dark option** for the builder; **no money/cost/markup** layer
(quote tool); Cardinal red is `#c8202e`, never Tailwind `#DC2626`; the toggle's inactive label uses
`--est-dim #475569` (slate-500 fails 4.5:1 on porcelain).

## 🟢 IN PROGRESS — the Community CRM simplification arc (27 Aug 2026, Theo's 3rd pass)

Theo, third time saying the Community CRM feels like "a lot going on," steered the fix
himself: pull the community/partner STATS out of the working CRM onto their own page,
and cut the home to just the work. Renders confirmed the diagnosis — the Clients tab
alone stacks three slices of the same people (Community clients / By partner / By
stage), and the calm stats page he was picturing ALREADY EXISTS (`CardinalCommunity
Analytics`, `cr-can`) but is buried in the Tools menu.

His picks: **1b** (strip the home to one attention list; Bids/Partners become doors),
**2 = yes** (stats page organized as a card PER PARTNER — Habitat first), a **Tarps
tab** (aging tarps over the existing `tarped_at`, bidder or not), and **B** on naming
(estimate, not bid — award-side kept).

Sequence, one build each:
- ✅ **1091 — the estimate rename.** SHIPPED (merged).
- ✅ **#1 — partner-card stats page (1092).** SHIPPED. cr-can is now a card per
  partner (Habitat first) with open/out-for-pricing/awarded/win-rate + oldest aging
  + tarps-up; summary strip Out-for-pricing/Awarded/Win-rate/Tarps-up; a chart door in
  the tab strip, Analytics removed from Tools. ⚠ Card tap-through to a partner's
  estimates is a deliberate follow-up, not in 1092.
- ⏭ **#2 (1b) — strip the home** to one attention list; Bids/Partners → doors.
  PREVIEW before shipping (his rule; and it reverses the 853 "calendar/tiles/day"
  ordering only for Community, so show it).
- ⏭ **#3 — the Tarps tab.** Aging list over `tarped_at` (already a real field, build
  977). Scope: community tarped clients; non-community tarps are a separate question.

---


---

## ✅ CLOSED — Insurance Clients crowding (build 1086, 26 Aug 2026)

`.cr-ic-chips` measures **10 chips · 4 rows · 194px** at 390px, above the client list —
the same shape build 1085 fixed on All Leads & Jobs.

**Fixed at 1086 with the clamp, NOT 1085's removal.** That screen has **no funnel and no
rail**: those chips are its only filter, so removing them would have removed filtering
outright. It keeps row one and ends with a dashed `+7` that expands to all ten and reads
`Fewer`. **194px → 44px.** Same symptom as Leads, opposite remedy — which is the reason a
sweep reports screens rather than prescribing one patch for all of them.

Two other strips the same sweep flagged are **false alarms, checked, not fixed**:
- **Add project** `#pfSourceChips` — 8 chips / 3 rows. A required radio group; every lead
  source has to be visible. Hiding five behind a tap makes it worse.
- **Photo editor** `.cr-ped-row` — 10 chips / 4 rows / 75px. A toolbar pinned to the bottom
  over the photograph. Nothing is pushed anywhere.

Instrument: `scripts/probe_crowding.mjs` (all 25 sentinel states, any width).

---

## OPEN (narrowed at 1087) — the Insurance header is the only CRM chrome that isn't chrome

Theo sent a screenshot captioned *"Logged in to insurance header"*. Measured before
theorising: it **passes every contrast floor** — white title 5.68:1, the "+" glyph 4.85:1
on `#FFE8E8`. Not a readability defect.

What the five-header comparison render shows instead: retail is a steel gradient, community
`#047857`, production `#181b20`, sales `#1a1310` — **every other CRM head is a dark chrome
surface. Insurance alone pulls `--ct-*`**, which is the Resource Library's *document*
palette, so it is either solid `#CE0E18` or solid `#FFFFFF` depending on `cardinalRLTheme`.
Two identities, and the switch lives in another feature. Wired deliberately at 407.

⚠️ **A designed dark insurance palette already exists in the file and the header does not
use it**: `body[data-crm-head="insurance"]{--bnbg:#1a0e0d;--bnbd:#3d1512;--bnac:#ff8a7a}`
— currently the **bottom nav only**.

✅ **The mismatch half is FIXED at 1087** — that was what Theo was actually reporting
(*"It was the retail crm with insurance header after I signed in"*), and I had inferred a
colour question from the same screenshot. The Landing no longer claims to be in a portal.

✅ **The colour half is CLOSED at 1089.** Theo was shown four rendered headers — now-dark,
now-light, and two options — and picked **option 1**: the header takes the bottom nav's own
`#1a0e0d` / `#ff8a7a`, so the two ends of the insurance screen finally agree. **Dark theme
only**, because insurance is the one head that flips with `cardinalRLTheme` and he was told
in writing that light was unchanged; the new tokens are declared in the siren block alone and
the rule falls back to `--ct-head-*`, so light is untouched by construction — proved by two
byte-identical light-mode renders.

⚠️ **Deliberately NOT done, and it is the obvious next thought:** the bottom nav is
`#1a0e0d` in BOTH themes, so in light mode a white header still sits above a near-black nav.
That mismatch predates this work and was left alone rather than folded in silently. Flattening
insurance to one theme-independent palette — which is what every other CRM head already does —
is a real option and a decision for Theo, not a tidy-up.

---

## ✅ SETTLED 27 Aug 2026 (Theo) — the sentinel runs always, blocks selectively

*"Do that."* — after being shown what it had actually caught, and what it costs.

**Run it on every build that touches a screen. Hold the merge only for colour, theme or
layout builds.** Anything else merges on the other gates; sentinel findings are carried
into the next build. **Not a licence to skip it or to stay quiet about what it found.**

**What he was shown, both columns.** Four real catches in ~156 builds — 939 (a 3.09:1
label of mine, caught before it shipped, on the readability build), 959 (a layout rule
inert on all 30 elements it matched, with every purpose-built assertion green), 1064 (the
photo editor's tool bar at 3.27:1), 1066 (the album's client name at 1.07:1 in light).
**All four were colour/theme/layout builds** — which is the rule. Against that: full
sweeps run ~1 useful finding in 40; four of its own checks have been wrong (1035, 1066 ×2,
1067) and one run miscounted its renders (1081); and it cannot see a loading state or
anything past where its walk stops.

⚠️ **Its record of being RUN is worse than its record of working.** Measured at the time
of the decision: of the 29 build-log entries at or after 1060, **12 mention the sentinel
and 17 do not.** The old rule said every screen build. The new rule is narrower on
blocking precisely so the running half stops being optional.

---

## ✅ CLOSED — the committed VAPID private key (build 1084, 26 Aug 2026)

`api/notify.js` carried a VAPID private key as a literal fallback. **Not dormant** — with
`VAPID_PRIVATE_KEY` unset in Vercel, that literal is what signed production pushes.

**Rotated and removed.** Theo generated a new pair, private half into Vercel
(`cardinal-inspections`, Production), public half committed to `index.html` ×2 and
`api/notify.js` ×1. The fallback is **deleted**; an absent key now returns
`reason:'no_vapid_private'` instead of signing with `''`.

⚠️ **Blast radius was measured, not assumed: 4 subscriptions, 1 person — all Theo's own
devices.** I had warned that "the whole crew re-subscribes"; nobody else had ever
subscribed. Query before costing a decision.

⚠️ **Standing rule, now in `CLAUDE.md`: never reintroduce a secret fallback.** It is not
resilience — it guarantees the value is in the repo AND hides its own absence, so nobody
learns the env var was never set.

⚠️ **A public key cannot come from an env var on this app.** No build step, so
`NEXT_PUBLIC_*` does nothing and `index.html` ships as committed. Private → env, public →
committed. Vercel's own agent suggested otherwise; it was aimed at a Next.js app.

**Left for Theo:** re-enable notifications once per device (Menu → Notifications).

---

## The CSS sediment — measured, and the growth is now gated (26 Aug 2026)

**74 distinct DEAD rules.** Measured with the per-render display cap lifted, zero
truncation. My earlier figures were both wrong: **196** was a capped summary line, **~900**
was a render-multiplied sum I mistook for a defect count. 74 is the real one.

**They are overwhelmingly superseded rules from migrations that SUCCEEDED**, not defects.
Walking Chromium's matched rules: `#cr-hd2-bar #cr-hd2-home{width:34px}` → computes **44px**
(build 1040's tap-target pass); `.jabox{background:#fff}` → computes transparent (the
obsidian rebuild); `.cbx{display:inline-grid}` → computes `grid`. The dead rule is the
*pre-fix* value in each case. **Not one of the 74 corresponds to a bug Theo has reported.**

### ❌ Do NOT run a mass cleanup

Costed and rejected. The risk is not deleting a dead rule — it is that **some overriders are
conditional**. Delete a base rule whose replacement sits behind a media query, a theme or a
CRM gate and the other branch is left with nothing. Per-rule, per-screen verification, with
bytes as the payoff. **20 of the first 44 matched zero elements on the home screen** — they
live on other screens, so any sweep multiplies again.

### ✅ What was done instead: gate the growth

`scripts/gate_stack.mjs` — see the gate inventory in `CLAUDE.md`. It does not touch the
existing sediment; it stops the pile growing, which is the half that compounds.

```bash
node .claude/skills/cardinal-build/scripts/gate_stack.mjs --selftest
node .claude/skills/cardinal-build/scripts/gate_stack.mjs <new.html> --prev <old.html> [--debug]
```

**Standing verdict: manage this debt, do not repay it.** Reach for `@layer` only if a build
ever becomes genuinely hard because of the cascade; never a bundler, which would trade a
slow-growing problem for a new class of failure and break the phone-deploy workflow.

---

## 🛑 DO NOT DELETE `claude/ai-can-build-584` — it is the project's only pre-squash history

*Established 26 Aug 2026, after I recommended deleting it and was wrong.*

**It holds 787 commits. `main` holds 74.** Every PR here is squash-merged, so `main`'s
history is one commit per PR and the commit-by-commit lineage of builds ~1–584 survives
**on that branch and nowhere else**.

**It contains the span `CLAUDE.md` calls "the ONLY gap".** That file states there is no
narrative record anywhere in the doc set for roughly **468–542**. Those commits are on
this branch — 533–554 alone carries the left-nav rebuild (536), dark retail home (535),
literal-yellow Landing (539), the money circle reading the right table (540), the
contracts tab (541), the roofing Construction Agreement (542), the obsidian Activity
Count tiles (544–545) and the whole Crews arc (547–554).

**It also carries `aeac5e5`**, the build-573 tree that `scripts/measure_counts.py` names
in its own header as its negative control and that `CLAUDE.md` cites **four times**. That
commit is **not reachable from `main`** — checked, not assumed
(`git merge-base --is-ancestor aeac5e5 origin/main` → false).

### Why it looks deletable, and why that reading is wrong

It is **unmergeable by construction** — `git merge-base origin/main 7a1d904` returns
**empty**: no common ancestor at all, because main's history was rewritten beneath it. So
every check for "is this branch worth keeping?" that asks *can it merge* answers no, and
the branch's name reads like abandoned feature work. **Both signals point the wrong way.**
It exists to be *read*, not landed.

⚠️ **A sweep of every SHA cited in the doc set found ~75 of them are NOT ancestors of
`main`.** Most stay alive through GitHub's permanent `refs/pull/N/head` refs, but that is
a property of GitHub's retention policy, not of this repo — and it is not something to
bet the measurement baseline on.

### ✅ FIXED 26 Aug — two preservation branches now exist on the remote

**The objects are no longer hanging off a single ref.** Both were pushed and verified:

| ref | sha | what it holds |
|---|---|---|
| `history/pre-squash-584` | `7a1d904` | the full 787-commit lineage, builds ~1–584 |
| `history/build-573-baseline` | `aeac5e5` | the build-573 tree, `measure_counts.py`'s negative control |

```bash
git fetch origin history/build-573-baseline
git show history/build-573-baseline:index.html > /tmp/573.html   # the control tree
```

**`claude/ai-can-build-584` is now redundant** — a second ref covers everything it did.
It can be deleted whenever Theo wants; nothing depends on it any more. Leaving it costs
one confusing name in the branch list, which both this file and `CLAUDE.md` now explain.

### ⚠ The permission matrix, established by control rather than assumed

Tags were the obvious answer and are **blocked**. Diagnosed properly, with a control that
proves what *is* allowed rather than only what isn't:

| operation | result |
|---|---|
| push an **annotated tag** | ❌ HTTP 403 |
| push a **lightweight tag** | ❌ HTTP 403 |
| push a **branch at the identical sha** | ✅ succeeded |
| **delete** any ref | ❌ HTTP 403 |

So the restriction is on `refs/tags/*` and on deletion — **not** on the objects and **not**
on write access generally. *The first two failures alone would have read as "no write
permission"; only the branch control showed the real shape.* ⚠️ **Git reports both
refusals as `Everything up-to-date` after the 403 line** — a phrase that reads like
success. Use `--verbose` and check the exit code; the summary line lies.

⚠️ **Tags remain the better artifact** — immutable, and they do not clutter the branch
list. If Theo wants them, from a shell with his own credentials:

```bash
git tag -a build-573-baseline aeac5e5 -m "The last build-573 tree - measure_counts.py's negative control"
git tag -a history/pre-squash-584 7a1d904 -m "787 commits, builds ~1-584: the pre-squash lineage. Unmergeable by design."
git push origin build-573-baseline history/pre-squash-584
```

### 🧹 One piece of litter I made and cannot clear

Diagnosing the above required pushing a throwaway branch, **`zz-perm-test`** (at
`aeac5e5`). Ref deletion is 403, so **I cannot remove it.** One line from a shell with
full credentials, or one click in the GitHub branch list:

```bash
git push origin --delete zz-perm-test
```

It is harmless — it points at a commit two other refs already hold — but it is untidy and
it is mine.

---

## Layer: 26 Aug 2026 — the app-wide polish pass (Theo: "1-3 then 4-5")

His list, in his order. **ALL FIVE CLOSED: 1, 2 and 4 shipped; 3 and 5 were false positives.**

| # | item | state |
|---|---|---|
| 1 | replace `alert()` / `confirm()` with in-app feedback | ✅ **DONE — 1080 + 1083.** 289 alerts to the toast, 88 confirms to the ask sheet |
| 2 | lift every font size under 11px | ✅ **build 1081.** 519 declarations, both forms |
| 3 | kill the dead white background layer + literal fallbacks on bare `var()` | ❌ **CLOSED — all three parts are FALSE POSITIVES. Do not build it.** See below |
| 4 | distinct icons in the Job Menu | ✅ **build 1082** — plus the ink, which was the bigger defect |
| 5 | chase the 0px `#acxTrBtn` (Trade Type) button | ⚠️ **HALF right — corrected 26 Aug.** It renders **183 × 44** and is tappable, so what Theo saw is closed. But its **44px min-width floor really is dead**, and that is latent, not false. See below |

### ❌ Item 5 — DECIDED 26 Aug 2026: LEAVE THE CSS ALONE

**The button is fine; only a promise about it is false.** `#acxTrBtn` renders **183 × 44**,
`min-height` computes 44px, it is fully tappable. The *width* floor is dead, beaten by
`cr-jobdetails-styles`'s `… .acxjd .acxsel { min-width:0px }` — the deliberate flex
truncation fix that stops labels overflowing.

**Forcing the floor back is the riskier move.** `.acxsel` is a **class** with more than one
user, and `min-width:0` exists for a reason. That trades a hypothetical (some future
shorter label) for a real regression risk on a screen that works. This is the standing
sediment verdict applied to itself: *manage the debt, do not repay it.*

**The one real defect is honesty, not layout:** `cr-touch44-styles` declares
`min-width:44px` for `#acxTrBtn` and it is inert. It reads as enforced. **A comment saying
so is the whole fix** — folded into the next build that touches `index.html` rather than
spending a build number on a comment.

**If the label ever shortens, the sentinel's `FLOOR` check is still pointing at this.**

### ⚠️ How it was originally mis-called — worth keeping



*I closed this flatly as a false positive. The sentinel disagreed, and it was half right.*

**What I said, and it holds:** `#acxTrBtn` renders **183 × 44** on the client screen, at
390/1194/1440. Confirmed twice in Chromium. `min-height` computes **44px**. Nothing Theo
can tap is 0px, so the thing he reported is genuinely closed.

**What I missed:** the sentinel's `FLOOR` check reports `button#acxTrBtn computes 0px`,
and it is **measuring the computed `min-width` property, not the rendered box.** Those are
different claims and I answered the wrong one. Measured:

```
computedMinW: 0px      ← the floor is DEAD
computedMinH: 44px     ← the height floor holds
rect:         183x44   ← what actually paints
```

**What kills it**, from walking Chromium's own matched rules:

| sheet | selector | sets |
|---|---|---|
| `cr-touch44-styles` | `#insToggleBtn, #acxTrBtn` | `min-width:44px` |
| `cr-jobdetails-styles` | `:root body:not(.claim-insurance):not(.claim-community) #projectView .acxjd .acxsel` | **`min-width:0px`** |

The second is far more specific and wins on **retail only** (both `:not()`s exclude the
other two CRMs). `selector_audit.py` finds **only the two touch-44 rules** for `#acxTrBtn`
— it searches by the selector you name, and this rule reaches the button through its
**class**, `.acxsel`. *A selector audit answers "who else writes this selector", not "what
wins on this element". Only a render answers the second.*

⚠️ **`min-width:0` on a flex child is the standard truncation fix** — it is what lets a
label ellipsis instead of overflowing, and it is almost certainly deliberate. So this is
**not** a one-line fix: forcing 44px back could reintroduce the overflow that rule exists
to prevent.

**Verdict: latent, not live. Recorded, not built.** The button is 183px because its own
content is; nothing holds it there if the label shortens or the row squeezes. Wants a
decision from Theo — options, not a patch.

### ❌ Item 3 is a FALSE POSITIVE in all three parts — audited 26 Aug, do NOT build it

**"The dead white background layer" does not exist.** The real inline-white bug — an inline
`background:'#fff'` beating every theme rule regardless of specificity — was **fixed at build
573**, in `styleMounts()` and two other sites, each carrying a comment saying so. Of the three
surviving `style.background='#fff'` writes:

| site | verdict |
|---|---|
| `cr-bpa-script` | **deliberate and fenced.** It has no dark palette to fall back on, so stripping the inline white leaves it with no background at all. CLAUDE.md already says this. **Do not touch.** |
| two checklist "Not completed" pills (main block) | **not a defect** — `#8a6f66` on `#ffffff` computes **4.62:1**, above the 4.5:1 body floor |

**The blanket `var()` fallback sweep is also wrong, and in one family actively harmful.**
2,684 of 4,572 refs (59%) are bare, 633 of them feeding a `background`. But:

- ⚠️ **`--cr-*` must NOT get literal fallbacks.** `--cr-bg` and friends are *deliberately
  re-declared per mount* — `#cr-pricing-mount`, `#cr-claims-mount`, `#cr-adjusters-mount`,
  `#cr-coach-mount`, `#cr-estimates-mount`, each with a `rb-light` twin. A bare reference
  inside one of those mounts resolves correctly by inheritance. Pinning one literal would
  freeze all five modules to one module's colour in one theme. This is the five-modules-one-
  palette structure CLAUDE.md documents.

**What IS real: the `--ct-*` family has no `:root` declaration at all.** Those tokens exist
only under `[data-rltheme="docket"]` and `[data-rltheme="siren"]` — an attribute set by
**JavaScript** on `document.body` at init from `localStorage['cardinalRLTheme'] || 'docket'`.
So ~150 Cardinal Truth backgrounds are contingent on another module's script having run:
exactly the 448–449 shape. Pin the **docket** values, because docket is the documented default:

| token | bare bg refs | fallback (docket) |
|---|---:|---|
| `--ct-surface` | 52 | `#FFFFFF` |
| `--ct-surface-2` | 32 | `#FAF8F7` |
| `--ct-bg` | 22 | `#FAF8F7` |
| `--ct-surface-3` | 19 | `#F3EFEE` |
| `--ct-red-wash` | 16 | `#FDF4F3` |
| `--ct-red-deep` | 12 | `#7E1410` |

That is a ~150-site targeted fix with a real failure mode, not a 633-site blanket sweep.

#### ⚠️ ...and then that third part turned out to be ALREADY FIXED, at build 448 itself

**Stand down. Do not add `--ct-*` fallbacks.** The contingency is real in structure and
**already defended twice**, by the very build this document keeps citing as the reason to add
fallbacks. `cr-lib-script`'s `tick()` carries the record verbatim:

> *448: NEVER remove `data-rltheme` from `<body>`. `cr-instheme` (407) stamps it there
> deliberately so the `--ct-*` tokens resolve app-wide — the insurance shells read
> `var(--ct-bg)` on it. Removing it turned Cardinal Truth and the client list transparent,
> and the retail home ghosted through the fixed overlay. **Re-stamp the stored theme
> instead: same key instheme uses, self-healing if its delayed mount ever loses the boot
> race.**"

So: `cr-instheme` (407) stamps the attribute app-wide, and `tick()` re-stamps it continuously
and is **explicitly self-healing against the boot race** — exactly the window a literal
fallback would have covered. A fallback would be redundant with a live, self-repairing guard,
and would additionally freeze one of the two named themes (`docket`/`siren`) into 150 sites.

**This is the prime doctrine, paid for again:** *things that look missing are usually buried.*
The chain went — "add fallbacks everywhere" → "no, only `--ct-*`, `--cr-*` is per-mount" →
"no, `--ct-*` is already guarded at the source of the bug that motivated the whole idea."
**Three rounds of narrowing, ending at zero.** Grep for the mitigation before writing one.


### ❌ Item 5 is a FALSE POSITIVE — measured in Chromium 26 Aug

`#acxTrBtn` (Trade Type) was flagged at **0px**. Driven to the client profile in a real
Chromium render it measures **183 × 44**, `display:flex`, a real `offsetParent`, no hidden
ancestor, and the `\u2014` placeholder it is designed to show when no trade is picked. It is
also **already wired** (build 795: `acxTrOpen = !acxTrOpen; renderAcxOverview();`) and
**already carries `min-height:44px`** from the earlier tap-target pass.

**The 0px came from measuring it in a state where it was not laid out** — the classic
hidden-element reading. *This is why the item said "NOT confirmed": a flag is not a finding.*

⚠️ One true oddity, deliberately NOT chased: the rule
`#insToggleBtn,#acxTrBtn{min-width:44px;}` computes to `min-width:0px` on the button, so that
half of the rule does not win. **Zero user impact** — the button is 183px wide on its own —
and chasing it would be a fourth false positive in one session. Recorded here so the next
person measuring it knows it was seen and judged, not missed.

### ✅ Item 4 shipped as build 1082 — and the ink was the real defect

Theo picked **B** for the ink and **1 / 1 / 1 / 1** for the glyphs.

⚠️ **The collision he asked about was the smaller half.** Every glyph in the menu computed at
**1.52:1**: `.dbic2` (the 15 drawn icons, 3.0:1 floor) *and* `.dbic1` (the `$` and `%` on the
money rows, which is **TEXT** and held to 4.5:1). Both carried `color:#23507e`, a steel blue
picked for a **white** tile. Now `var(--rbe-ink,#cfd6df)` — an existing pair that flips by
itself. **8.67:1 worst, both floors.**

**Do not re-flag:** `body.claim-insurance .dbrow .dbic1` and `body.claim-insurance .jabox svg`
keep their own red — more specific, deliberately untouched, asserted by `gate_1082`.

**Four new DB_ICONS keys:** `punch`, `checklist`, `walk`, `contract`. **15 distinct glyphs
across 15 tiles.** Build 981's comment saying *"DB_ICONS has no checklist key"* was rewritten
in the same edit — it is no longer true.

### ✅ The confirm sheet shipped as build 1083 — Theo picked option 1

`window.crAsk(msg, opts) -> Promise<boolean>`, a bottom sheet. **88 calls, not 92** (lexer).

**Settled, do not re-litigate:** the buttons say what happens (*Delete photo* / *Keep it*, never
OK/Cancel); destructive is red and sits **above** the safe answer; Escape and a scrim tap always
mean **no**; and it **falls back to `confirm()`** if the sheet cannot be shown — the only
executable `confirm(` left in the file, asserted at exactly 1.

⚠️ **If you ever touch the async conversion, read the build log first.** Two guards nearly
stopped guarding because an async function returns a Promise and a Promise is always truthy —
one of them (`confirmPay`) would have paid a rep regardless of the answer.

`confirm()` returns a boolean and **blocks**, so it cannot be routed the way `alert()`
was. Replacing 92 of them needs a new in-app sheet *and* an async restructure at every
call site. **A new component wants rendered options first** — do not pick a look
unilaterally.

### Settled by the type floor (1081) — do not re-litigate

- **11px is the floor.** Established across 519 declarations. Two deliberate exceptions,
  both pinned by `gate_1081.mjs`: `font-size:0` (the *there is no text here* idiom, exactly
  two sites) and every `pt` size (print documents, 168 of them).
- ⚠️ **Sizes live in TWO declaration forms** and the shorthand is the bigger half —
  `font:600 10.5px …` carried 361 of the 519, `font-size:` only 158. BUG_CLASSES 70.

---

## Layer: 26 Aug 2026 — the document pipeline (SETTLED, builds 1078–1079)

### ✅ SETTLED — Theo picked "1 and 3", verbatim. Do NOT re-litigate.

**Built:** 1078 records a change to a delivered document in `audit_events`; 1079 keeps
the delivered copy in `document_versions`.

**Deliberately NOT built: option 2, refusing the edit.** He did not pick it. It would
stop him fixing a typo on a signed estimate, which is a real thing he does. Do not add
an RLS lock on `html` without a fresh decision from him.

### ⏳ Still needs Theo — two smaller calls that came out of it

- **`on delete cascade` on `document_versions`.** Deleting a document deletes its
  history. `restrict` would break `db.remove()`, which works today. If document deletion
  should become soft instead, that is a separate decision.
- ✅ **`document_versions.sql` is APPLIED** (26 Aug 2026), and verified rather than
  assumed — schema, RLS, both policies, no insert/update policy, security definer, anon
  revoked, and the write path exercised on the real signed estimate (versions 1 and 2,
  158,297 chars each). The two test rows were deleted afterwards: no edit had happened,
  `created_by` was null because the admin connection carries no JWT, and a fabricated row
  in an audit trail is worse than an empty table. **Do not re-run it as pending work.**

### The original recon (kept — the numbers are what justified the shape)

#### how far to take document versioning

**Measured on production, 26 Aug 2026.** This is recon, not a bug report; read the numbers
before deciding how much to build.

| | |
|---|---:|
| rows in `inspection_reports` | **23** |
| …sent | **2** |
| …signed | **1** |
| …with a `share_token` (externally shareable) | **0** |
| …written to AFTER being sent | **1** |
| …written to AFTER being signed | **1** |
| version / history / snapshot tables for documents | **none** |
| triggers on `inspection_reports` | **none** |
| average `html` size / largest | **628 KB / 6.4 MB** |

**`inspection_reports` is the document pipeline for EVERYTHING** — inspection reports, estimates,
contracts and crew work orders all live in it, sorted by `isEstimateTitle` / `isContractTitle` /
`isWorkOrderTitle`. All three sent-or-signed rows are estimates. So this is a money-document
question, not only an inspection-report question.

⚠️ **What is proven and what is not.** There is **one `html` column, overwritten in place**, no
version history and no trigger — that is structural and certain. `updated_at > signed_at` proves
**the row was written to** after signing; it does **not** prove the `html` changed, because the app
writes `updated_at` itself and other columns move too (`status`, `doc_id`, `contract_doc_id`).
**Do not report this as "a signed estimate was altered."** The honest statement is: *nothing
prevents it and nothing would record it.*

**The mechanism to extend already exists — do not invent a second one.** `audit_events`
(`id, at, email, type, detail, project_id`, **172 rows**) already records `estimate_publish` (7),
`estimate_save` (13), `doc` (6) and `review` (3). This is the `IC_SKIP` / `PIPE_SKIP` lesson: grep
for the convention before building a mechanism.

**Three sizes, smallest first:**

1. **Record it.** On a save to a document that carries `sent_at` or `signed_at`, write an
   `audit_events` row naming which fields changed. **No schema change, no migration**, uses the
   table that is already there. Gives you a record; does not prevent anything.
2. **Refuse it.** RLS blocks `update` to `html` when `signed_at is not null`, with an explicit
   "revise" path that clears the signature. Needs SQL. **This is a policy decision about how Theo
   works, not a technical one** — if he legitimately fixes a typo on a signed estimate today, this
   stops him.
3. **Version it.** A snapshot row per publish (`document_versions`: doc id, version, html, who,
   when), and regenerate writes a NEW version rather than overwriting. Needs SQL **and** a home for
   6.4 MB blobs — at that size the html belongs in storage with a path in the row, not in the
   column. The largest build of the three.

**My recommendation: 1 now, 3 when a document is actually shared externally.** `share_token` is
null on all 23 rows, so nothing has ever been handed to a homeowner by link; the exposure today is
internal, and 1 costs a fraction of 3.

### Settled by measurement — do NOT re-litigate

- **The AI never writes a customer document unattended.** `walk_shots` carries `reviewed_by` /
  `reviewed_at` and The Walk's rule is model-proposes-person-confirms. 3 of 23 documents carry a
  `data-ai-summary`, and every one is a draft a person edits in the report editor. The outside
  audit's *"cannot confirm only human-approved findings enter PDFs"* is answered: today there is
  **no unattended path at all.**
- **`studio_findings` already carries provenance** — `source`, `model`, `run_at`, `confidence`. It
  has no approval column, and does not need one until something reads it into a document.

---

## Layer: 26 Aug 2026 — The Walk (build 1076)

### ⏳ NEEDS THEO — should reps be able to run a walk?

`walks_schema.sql` makes **insert, update, delete and every `walk_shots` and
storage write** `is_cardinal_admin()`. So The Walk is Theo and Joan only, at the
database, not just in the UI. Build 1076's Job Menu tile is gated to match —
a tile a rep can tap, landing on a screen with no Start button, backed by a
table that would refuse the row, is BUG_CLASSES 16 with extra steps.

**This is a permission decision and it is Theo's**, the same family as *"Crew
rates is not needed by productions, I write the checks."* Nick, Joey and Jacob
are the ones on roofs.

If the answer is yes, it is small and it is two halves, in this order:

1. **SQL first.** Relax `walks_admin_insert`, `walks_admin_update`,
   `walk_shots_admin_*` and `walk_objects_admin_write` from
   `is_cardinal_admin()` to the ownership rule the rest of the app uses
   (`is_full_access() or created_by = my_email()` is the `estimates` shape).
   Leave **delete** admin-only unless he says otherwise.
2. **Then `amAdmin()`**, in `cr-show-script`, ~11 sites. Not before — a UI that
   can write to a table that refuses is worse than no UI.

**Do not relax the browser gate on its own initiative.** A hidden button is not
a permission and an exposed one is not access.

### Settled — do NOT re-litigate

- **The carried job is module state (`pendingProject`), never a parameter.**
  628's comment on `openJobPicker` is the reason: arg 0 is a MouseEvent where
  this module wires handlers bare.
- **The tile routes on an explicit `act === 'walk'` branch, not the else
  branch.** The Walk is a tab inside `CardinalShowcase`, not a pane on the
  client page; `showTab('walk')` finds nothing.
- **No `hideAllViews()` / `navRestore()` entry.** `open()` already registers
  `showcase`; this is a different tab of a wired view, not a fifteenth view.

### Measured, so nobody re-derives it

- `walks` **0 rows** · `walk_shots` **0 rows** · `walks.project_id` non-null
  **0** — measured 26 Aug 2026, before 1076. If these are still zero a month
  from now, the door was not the problem and the *feature* is the question.
- `projects` has **no `city` column** — `address` is one string.

---

## Layer: 26 Aug 2026 — the report editor (builds 1069, 1070)

### Settled — do NOT re-litigate

- **The drawer is `#navMenu`'s shape, and writes no scroll lock.** Theo picked
  1A ("drawer dark like the toolbar") from rendered options. It must stay the
  14th-writer-free pattern: class toggle, document-click closer,
  `stopPropagation` on the opener.
- **Re-sync fills BLANKS ONLY.** A `.ph` that no longer matches
  `/^\[[^\]]*\]$/` was answered by a person, and a person outranks the
  checklist. This is the property that makes running it unasked safe.
- **Short placeholder labels keep their square brackets.** `fillBlanks()`
  matches `/^\[[^\]]*\]$/` and `compactForPrint()` strips on
  `charAt(0)==='['`. Shorten the contents, never drop the brackets.
- **Only the nine PROPERTY facts leave the browser for the drafter.**
  `CK_REPORT_MAP` is the fence: no name, no address, no phone, no coordinates.
  Do not "complete" `ckFactsFor()` by spreading the checklist object.
- **`#draftBtn` delegates to the in-document button.** One `/api/summarize`
  pipeline per concept; there are exactly two call sites and both send the
  checklist.

### Settled — the Desk's photographs (1071)

- **The model gets 1600px/q85, not the original.** Same rendition The Walk has
  always sent. An original is not more evidence to a vision model; it is the
  same evidence at 10× the bytes.
- **`resize:'contain'` — never `cover`.** Supabase defaults to `cover`, which
  crops. Cropping damage out of an insurance photograph is not a size
  optimisation.
- **The second signing path is structural, not drift.** `createSignedUrls`
  (plural, what the display uses for 200 photographs) has **no** `transform`
  option, and the transform is signed *into* the token — so it cannot be
  appended to a URL. Scoped to the ≤20 being analysed.
- **`photo_index` maps through `photos_used`.** See BUG_CLASSES 67. Do not
  "simplify" it back to a direct index.

### Settled — model provenance (1072)

- **Every AI route returns `via` + `via_primary`.** The pair, not just `via`, so
  no client hardcodes a ladder.
- **The screens speak only on a fallback.** Build 808's rule. Do not "improve"
  this into an always-visible chip.
- **No ladder changes until the bake-off says so.** 1072 reports; it does not
  decide. `gate_1072.mjs` check C enforces this.

### ✅ The accuracy bake-off is BUILT (1073) — and the answer is Theo's to produce

`bakeoff.html` + `api/bakeoff.js` ship. **The instrument exists; the
measurement does not yet.** Theo opens `/bakeoff.html`, signs in, runs 20, and
then we know.

⚠️ **It is a blind PREFERENCE test, not an accuracy measurement, and that was
forced by the data**: `walk_shots` is empty (The Walk has never been used),
`project_photos` has 217 rows and **zero** captions, and only 3 of 23
inspection reports carry the `data-ai-summary` marker. There is no ground truth
to score against short of Theo labelling by hand. Do not describe the output as
accuracy — the results screen deliberately does not.

**Theo's, before a run means anything (1074):**
- **`ANTHROPIC_API_KEY` in Vercel** — `api/librarian.js` has needed it since
  806, so it is probably already set; `/api/ai-status` now says so directly
  under `keys.anthropic.configured`. If it is false, Claude cannot be judged.
- **`MOONSHOT_API_KEY`** if he wants Kimi K3 judged at all. ⚠️ And K3 may still
  refuse a photograph — the repo's own notes give it no vision claim, which is
  why the picker shows that caveat before he starts.

**Still open after it runs:** whichever model wins, changing a ladder is a
separate build. 1072 deliberately changed none, and the ladders are not uniform
(`detect`/`sortphotos`/`supplement` lead with 3.6; `caption`/`analyze`/
`summarize` are pinned to 3.5).

### Open, with the measurement attached

| | |
|---|---|
| **The twelfth toolbar button costs a desktop row.** | Single-row threshold moved 1440px → 1512px (seven widths measured, both builds). It already wrapped at 1194/1280/1366, so this adds one width to a set of three; nothing is hidden, the bar goes 39px → 86px. Only shortening the label to "Draft" buys 1440 back, and "Draft" beside "Save" reads as a document *state*. **Theo's call** — say the word and it becomes "Draft" or "AI draft" in a one-line build. A thirteenth button needs this measured again. |
| **Options 3 and 5 from the report audit are unbuilt.** | 3 = guided fill (walk the rep through the blanks); 5 = photos placing themselves into the right section. Not started, not asked for. |
| **`gate_1069.mjs`'s desktop assertion says "eleven buttons".** | Still passes — it checks that `#edMoreBtn` does not appear on desktop, not the count — but the comment is now off by one. Cosmetic; left alone rather than touched in a build that is not about it. |



---

## Layer: 25 Aug 2026 (evening) — the design audit, and three walker leaks

*Tooling and docs only. No `index.html` change, so no build number.*

### ⚠ THE SENTINEL HAD BEEN MEASURING THE WRONG SCREENS — three leaks, three mechanisms

`sentinel_setup_cardinal.js`'s `closeAll()` let overlays from one state sit over every
state after it. Found by the design audit, then compounded: **the gate written for the
first two leaks found the third.**

| leak | how it hides | states it covered |
|---|---|---|
| `#projModal` / `#ckModal` / `#sigModal` (the nine static modals) | `display` | 12 of 25, from `newproject` on |
| `#navMenu` + `#navBackdrop` | `transform` / `opacity` | every state after `nav` |
| **`#cr-est-picker`** (Add-from-Library sheet) | **`class`** (`.open{display:flex}`) | **15 after `estlibrary`, covering the centre on 13** |

Between them, **most of the walk**. ⚠️ **`closeDrawer()` had never worked**: it removed
CSS classes, but the drawer module derives `open` from `menu.style.display === 'block'`
inside a `sync()` that a MutationObserver re-runs every frame, so the classes returned on
the next frame. This file's own banner recorded the drawer bleed as fixed — the bleed was
real, the remedy could not have worked.

**Fixed at the root**, each with the lever that matches its mechanism (`display` for the
snapshot, `display` for the drawer as its own backdrop-click handler does, `class` for the
picker — writing `display:none` onto a class-shown element is permanent damage). The
build-1014 push nudge is staged out via the app's **own** dismissal key, not by hiding the
element.

**`scripts/gate_setupleak.mjs` is the new standing check.** It keys on **first
appearance** — on screen now, first seen under an earlier state's name — so it needs no
list of ids and no map of what may legitimately be up, and it is mechanism-agnostic.
Seen RED on the pre-fix tree, GREEN at 25/25 after.

⚠️ **Consequence for anything that cites a sentinel run before 25 Aug evening:** findings
on the last twelve-to-fifteen states were measured through an overlay. The *"Cardinal
Truth compositing artifacts"* from the morning run of 25 Aug are the likely example —
`truth` is state 23.

### The design audit — `CR_DESIGN_AUDIT_2026-08-25.md`

New: `audit_design.mjs`, `audit_design_report.py`, `audit_design_shots.mjs`. Nothing in it
is a bug; it measures dispersion, not correctness.

### ⛔ THREE PICKS THEO OWES — do NOT build any of these blind

Each is a real finding whose every fix is an aesthetic or layout decision:

1. ✅ **SHIPPED at build 1065 — Theo said "do what you recommend".** The header tagline
   truncated on every phone screen (`"Single sourc…"`). **Measured:** it needs **247px**;
   the header's middle gets **150px** at 390px, and it fits only at **10px** — below 360px
   at no readable size at all. Shrinking was therefore not an option and wrapping would
   have added a second line to a fixed-height bar. It is now hidden below **438px** (the
   measured threshold), **retail only** — the other CRMs carry a short CRM name there and
   the 416 comment requires it never disappear. `gate_1065.mjs` 5/5, red on 1064.
2. **Four spellings of the system font.** ⚠️ *An earlier revision of the audit had this
   backwards.* On **iPadOS** `'Segoe UI',Arial,sans-serif` (759 sites) falls to **Arial**
   while `-apple-system,…` (35 sites) renders **San Francisco** — two typefaces on the
   same screen, on the primary device. On Windows they converge. Unifying is a
   whole-app font change and wants his eye.
3. **The half-pixel type scale.** 252 sites declare a decimal `font-size`; `12.5px` alone
   is 66 sites and 2,760 rendered elements. Rounding changes rendered sizes app-wide, and
   the direction (up or down) is a choice.

### Fixed in my own instruments, recorded so they are not re-found

- `audit_design.mjs` had a **silent cap** (`break` at 6000 elements, nothing recording it
  fired). Never actually bit — largest single run kept 343 records — but it now reports.
- The comment written for that fix contained **backticks** inside the PROBE template
  literal and broke the file; `node --check` caught it, an `&& echo` had masked it.
- A **closed drawer still has a full-size rect** (`#navMenu` at `translateX(-320px)`), so
  the probe was harvesting an off-canvas menu as visible design. Filtered horizontally
  only — vertically would discard every long page.
- `page.screenshot()` **hangs on this app blaming fonts**; there is no `@font-face` and
  `document.fonts` reports `loaded`/size 0. Playwright's stability wait never settles on a
  continuously repainting page. CDP `Page.captureScreenshot` returns in ~91ms.

---

## Layer: 25 Aug 2026 — builds 1060 and 1061, and the last pending migration

- ✅ **`drop_ai_estimates.sql` is APPLIED (25 Aug, Theo's explicit yes).** It had been
  the ONLY pending migration of the 83 at the repo root — everything else was already
  applied, re-verified against the live database rather than read off a doc. The
  automated apply was declined on 24 Aug because it drops FK constraints on the live
  `contracts` and `insurance_claims` tables; that caution was right, and the check
  after applying is what discharges it: **both columns still exist, `insurance_claims`
  still holds its 5 rows, `estimates` its 18.** A `DROP CONSTRAINT` cannot remove rows,
  so `contracts` reading 0 is its pre-existing state, not damage.
  ⚠️ **Do not run it again — it is deliberately not idempotent**, so a repeat fails
  loudly. The advisor's two orphan-trigger warnings cleared with it.

- ⚠️ **Still open, and only Theo can do them:** public signup OFF and leaked-password
  protection ON, both Supabase Auth dashboard toggles. The advisor confirms
  `auth_leaked_password_protection` is **still disabled** as of 25 Aug.

- ✅ **`placeOrder`'s body shape is FIXED at 1061** — it was a bare object, ABC
  documents an array. Field names taken from ABC's verbatim example, refusals rather
  than defaults on everything that costs money, and it **still is not reachable from
  the UI**. What remains for ordering: ABC's reply with sandbox credentials (email
  sent 25 Aug), a separate `ABC_SB_*` env pair, then a screen that shows the whole
  order back to a human and takes an explicit confirm. `gate_abcorder.mjs`, 13 checks.

- ✅ **The landing screenshot's black slab is FIXED at 1060.** PR **#317** diagnosed it
  correctly on 14 Aug, never landed, and is now **closed as superseded** — it was
  stamped build 809 against a main at 1056, so it could not merge. Do not reopen it.
  The rule is `html[data-mode="light"]:not(:has(#landingView[style*="display: none"]))`,
  and ⚠️ **the scoping is load-bearing**: unscoped it rubber-bands a light overscroll
  over a dark app screen, because `data-mode` outlives the landing. That is 429 in
  reverse. `gate_1060.mjs` goes red on an unscoped tree specifically.

- ✅ **DONE at 1063, and it corrected 1060.** The full-page capture is now the whole
  landing — the document IS `#landingView` (1189px at 390px wide, no internal
  scroller). ⚠️ **1060 shipped inert and this is the correction**: its gate hid every
  sibling of the landing, which manufactures a short document; on a real page
  `#mainView` is 2456px in flow behind it and `body` covers the whole capture. **The
  "black slab" was never a missing background — it is the app's home screen rendered
  dark.** The real defect was that `backToLanding()` did not call `hideAllViews()`
  while `goToLanding()` did, and the two were otherwise byte-identical.
  `backToLanding()` now delegates. Do not re-derive this from PR #317's diagnosis —
  #317 measured the good path.

- ✅ **`next_build.py` answered 1057 when the true next was 1060 — FIXED at 1060.**
  It read `index.html` and `visualizer/index.html` only; 1057/1059 were `supplement.html`
  and 1058 was `api/digest.js`. It now also reads `supplement.html` (via `STAMP_ALT`,
  because that file says `SD_BUILD = 1059`, not `v2026-… build N`) **and the build log**,
  which is the only place a build with no artifact stamp is visible at all. Two new
  `--self-test` cases, both mutation-tested. **Run it before numbering — but if it ever
  disagrees with the build log's newest heading, trust the log.**

## ✅ Manual-estimates audit — PICKED AND BUILT, 23–24 Aug 2026, builds 1025–1030 (PR #482)

Theo's picks, 23 Aug, verbatim: **"1, A, own lane, button, drop it, hide."** All six builds
shipped on `claude/manual-estimates-audit-design-29udyd`: **1025** (A: obsidian finished, white
money) · **1026** (B: lanes learn accepted/declined + thin Declined lane + honest sums + the
safety-net lane) · **1027** (F pick A: client document letterhead + phone reflow) · **1028** (E:
AI assist inside the editor — captions fill empty only, overview appends, cover only when
unstarred; both ⚡ AI doors hidden, code/table dormant) · **1029** (C: save-in-place, exported
save() promise + cr-est-* events, all four satellite close-polls retired, phone action bar) ·
**1030** (D: isEstimateDoc link-first classification, placeholder fix, cr-eaf cruft out,
**manual_estimates DROPPED — applied to production 24 Aug**, `drop_manual_estimates.sql`).
Every build gated (`gate_1025`–`gate_1030.mjs`, each seen RED on its control); all six re-run
GREEN on the final artifact. The plan below is kept for the record:

1. **Build A — finish the obsidian estimates screens** (CSS + 1 inline ink): the Total is 1.98:1
   and the deposit 1.89:1 in BOTH themes (546's conversion missed the totals block); six red
   buttons still hover to pre-migration gold `#e8ba15`; light-mode fails on the lane title /
   Saved-Estimates heading / `#projectView .subnote{color:#fff}` (unscoped — every profile subnote
   is invisible in rb-light) / docTable money on dark rows. **Option previews rendered — Theo
   picks white money (1) or `#f08a90` accent money (2).**
2. **Build B — the lanes tell the truth:** `CRE_LANES` never learned `accepted`/`declined`
   (editor vocabulary) — production's two accepted estimates render under **UNSENT — DRAFTS** and
   the open-pipeline/accepted sums are both wrong. Plus the `state.project_id` (undefined)
   delete-refresh fix.
3. **Build C — editor usability:** Save closes the editor every time behind an alert (live tell:
   5 of 8 drafts are $0 duplicates); no dirty-guard on Cancel; six header actions scroll off a
   phone. Save-in-place + Done + toasts + phone action bar.
4. **Build D — dead weight (SQL first, Theo's calls):** `manual_estimates` (0 rows) still carries
   an any-authenticated `ALL USING(true) WITH CHECK(true)` policy — drop the table or tighten;
   `isEstimateTitle` robustness (the title placeholder teaches "Roof Replacement — Jane Smith",
   which dodges the classifier post-publish). The AI-arm keep/demote/retire question is
   **superseded by Build E**.
5. **Build E — AI assist inside the estimate (Theo's 23 Aug direction: "just estimates, click a
   box for ai and use pictures to supplement the estimate with captions and an overview").**
   One AI action in the editor's Photos section: attached photos without a typed caption get one
   via the EXISTING `/api/caption` (the album's ✨ AI Caption machinery, reused), plus one new
   `overview` mode handed ALL attached photos in one request, drafting a scope paragraph that
   describes the job as the photos collectively show it, into Scope Notes for review — and (Theo, 23 Aug)
   **naming the best cover photo**, applied only when no ☆ cover is set. Fill-not-overwrite,
   review-before-print, no `ai_estimates` write; the separate AI doors/screens/tables retire once
   it lands. Open picks: button vs checkbox trigger (button recommended — visible spend) · AI
   line-item suggestions later (default off) · cleanup depth. Design in full in
   `CR_MANUAL_ESTIMATES_AUDIT_2026-08.md` §5 Build E.
6. **Build F — the client-facing estimate document (Theo's 23 Aug ask).** The published/shared
   estimate has NO phone layout (fixed 8.5in body, no viewport meta — the share link renders
   shrunk-to-unreadable on a homeowner's phone) and a 2021-era dress. Two options rendered in the
   audit artifact, content byte-identical: **A** clean letterhead (hairlines, small-caps labels,
   no black header fill) · **B** = A + a Total/Deposit/Valid-through summary strip. Both carry the
   phone fix. Awaiting A-or-B. Design + share-FIX compatibility notes in the audit doc Build F.

**Shipped with the audit (scripts/docs only):** the sentinel's `--themes rb-light` leg was
structurally broken (attribute set threw at init; every themed CRM sweep was a dark sweep) — fixed
and proven both directions; `sentinel_setup_estimates.js` added so the money screens sweep
populated from now on.

---

## 🔍 Fresh audit, 23 Aug 2026 @ build 1014 (workflow wf_8568b748-3eb) — 17 CONFIRMED, 0 refuted

9 finders (regressions/money/api-security/rls/ui-dead/contrast/offline/datamodel/flows) → dedupe →
adversarial verify (skeptic default-refute). **26 raw → 17 verified → 17 CONFIRMED, 0 refuted**; 9
lows dropped unverified (listed at the bottom). Every finding read against the build-1014 tree and
the live DB. Ranked, with the smallest fix each verifier settled on. **None built yet — awaiting
Theo's pick.**

### ✅ THE HEADLINE — RESOLVED at build 1015. The contract/estimate signing flow is whole again.
All 5 below fixed in build 1015 (index.html + api/clientsign.js + api/share.js), proven by
`gate_1015.mjs` (executes buildEstimate/isEstimateTitle/docKind + the real clientsign handler; RED
×12 against 1014): (1) footer stripped only when the body carries its own slots — Service Contract
keeps its signature line; (2) clientsign writes `signed_at`; (3) `SLOT_RX` makes agreements signable
and clientsign stamps the buyer slot; (4) isEstimateTitle/docKind strip the `EST-` prefix; (5) void
readers check `'void'`. Original detail retained below for the record.

### 🔴 THE HEADLINE (RESOLVED 1015): the contract/estimate signing flow is broken end to end (5 findings)
These interlock — a genuine "reproduce before theorising" cluster. Read together before fixing.
1. **Estimate → Contract makes a contract with NO signature block.** 781's `isDeal` strip
   (`buildEstimate`, index.html:9845–9846) removes the base `SIGN_FOOTER` from every
   AGREEMENT/CONTRACT — but the plain **Service Contract** brings no `data-sig` slots of its own, so
   it ends up with nowhere to sign; the in-person pad silently discards the signature and the share
   link is view-only. **Fix:** strip the footer only when the body carries its own slots —
   `if(isDeal){ if(body.indexOf('data-sig') !== -1) out = out.replace(SIGN_FOOTER,''); … }`.
2. **Remote signing writes none of the state in-person signing writes** (`api/clientsign.js:55`):
   it PATCHes only `{html, updated_at}` — never `inspection_reports.signed_at` — yet it advances the
   project to Approved and emails Curtis. So the SIGNED chip never shows, the estimate never enters
   the Approvals queue, the money worksheet stays locked, but production is already told to order.
   **Fix:** add `signed_at: new Date().toISOString()` to the PATCH body.
3. **Construction Agreements can't be signed remotely at all** (`api/share.js` SIGN_RX vs the
   agreements' `data-sig="buyer"` sigslots): the share/sign APIs only treat a doc as signable when
   `SIGN_RX` matches, which the agreements' slot markup never does. **Fix:** in share.js + clientsign.js
   treat an unfilled `data-sig="buyer"` sigslot (no `data-clientsigned`) as signable and stamp into it.
4. **Published estimate titles fail `isEstimateTitle()`** (index.html:15143): publish titles docs
   `EST-YYYY-NNNN — …`, but the regex needs a leading `estimate`, so a signed estimate never reaches
   `renderApprovals`, the "needs approval" email, the overview counts, or jobFinance's doc leg. Live:
   the one signed estimate doc in production (EST-2026-0896) fails the match. **Fix:** strip a leading
   `EST-\d{4}-\d+ — ` prefix in the one definition; all 15+ call sites inherit it.
5. **Contract void lifecycle checks `'voided'` but the writer writes `'void'`** (LOW, dropped-list
   below) — the third of the same family.

### 🔴 SECURITY — code half RESOLVED at build 1016; ONE operator action still open
✅ **Findings 6 + 7 code fix shipped in build 1016**: all 13 AI/spend routes + senddoc now require
Cardinal-staff identity (`api/_staff.js` isStaff — domain OR the 2 non-domain staff), guard after the
session resolves, proven by `gate_1016.mjs` (RED ×40 against 1014).
⚠️ **STILL OPEN — Theo's action:** disable **public signup** in Supabase Auth (Dashboard →
Authentication → Providers/Settings → turn off "Allow new users to sign up"). Without it a stranger
can still create an account; the routes refuse them now, but signup itself should be closed. Also
add any future non-`@cardinalrenovations.net` teammate to `EXTRA_STAFF` in `api/_staff.js`.

### 🔴 SECURITY (original detail) — needs a policy call from Theo, then a clear code fix
6. **AI/spend routes trust ANY confirmed session, and public signup is enabled** (12 routes:
   analyze/caption/summarize/organize/sortphotos/detect/design/measure/sol/roofr/hover/coach). 1013
   closed anonymous access, but a self-signed-up outsider with a valid session still burns Cardinal's
   paid keys — and **two non-roster accounts already exist** (clarkie022@gmail.com is legit sales;
   the point is the gate is identity-blind). **Fix:** add a roster/domain gate (`@cardinalrenovations.net`
   or `is_cardinal_staff()`) to the shared session helper — AND disable public signup in Supabase
   Auth (operator action; disabling signup alone leaves existing outsider sessions valid, so both
   halves are needed).
7. **`api/senddoc.js` lets any authenticated session email arbitrary HTML to any recipient** from
   Cardinal's sender identity (only `variant:'carrier'` is admin-gated). **Fix:** gate all variants
   on Cardinal-staff identity (same roster check as #6).

### 🟠 HIGH — data/flow correctness
8. ✅ **RESOLVED at build 1017.** Offline checklist edits merged onto a stale SW-cached copy and silently erased the previous
   edit on sync** (`patchProjectCk`, index.html:18987 — 50 call sites: tasks, payments, worksheet,
   contacts, measurements). The TEAM refetch has no `onLine` guard; sw.js serves the cached row.
   **Fix:** skip the refetch when offline (`if(TEAM && !navigator.onLine===false…)`, the idiom
   `pdb.update` already uses at :10708).
9. ✅ **RESOLVED at build 1018.** 28 of 57 projects' lead source is stored only at `checklist.lead.source`, which zero readers
   consume — and 3 writers still produce that shape** (manual-estimate create, community-bid convert,
   +1). 1008 fixed only the New Lead intake. **Fix:** one reader-side normalization in
   `__parseCkAllRaw` (index.html:20444) — if flat `lead_source` is null but `lead.source` exists, lift
   it — which repairs all 28 rows, all 11 readers, and any future nested write in one place.
10. ✅ **RESOLVED — APPLIED to production 23 Aug 2026 on Theo's instruction ("D the sql")** —
    `team_profiles_self_edit.sql`. Team Directory showed non-admins a pencil to edit their own row
    (index.html ~27031), but `team_profiles` had only an admin UPDATE policy — confirm-then-silent-
    failure. Applied: self-row UPDATE policy (`using/with check lower(email)=lower(my_email())`) plus
    the `team_profiles_guard_self` BEFORE UPDATE trigger pinning `role`/`email` for non-admins
    (`is_cardinal_admin()` traced: false for non-admins → pins; true for admins → untouched; NULL in
    a no-JWT/service context → untouched). Verified in pg_policies + pg_trigger after apply.

### 🟠 MEDIUM
11. ✅ **RESOLVED at 1019.** Payment Information's "Received"/"Job Net" excluded collections (`payTotals`, index.html:14342)
    — since 996 all money-in is collections, so this page contradicts Balance Due on any job with a
    collection. **Fix:** mirror jobFinance — `if(collPaid[pr.id]!==undefined) recv = collPaid[pr.id]`
    + a read-only "From Money In" row.
12. ✅ **RESOLVED at 1019.** jobFinance summed contract DOCS but took MAX over the contract TABLE rows
    (index.html:15917 / indexMoney:20629) — a multi-trade job whose contracts live in the table
    under-reports Job Value. **Fix:** make the table leg a SUM too (`ctrSigned[id] = (…||0) + t`).
13. ✅ **RESOLVED at 1020.** Stage-defer committed a superseded move → fired the irreversible
    "APPROVED — order materials" email for a job the user immediately corrected (index.html:11534,
    was 11526). Tap forward then back within 5s (or the phone locks) → Curtis got a phantom order
    email. **Fix:** a same-project supersede now CANCELS like Undo (restore the pending move's true
    `from`, rebase, and if the round-trip lands back at origin save nothing); cross-job supersede +
    pagehide/visibilitychange flush keep committing (the deliberate 1008 fix, left intact). Proven
    by `gate_1020.mjs` (same-job round-trip → 0 setStage; cross-job supersede still commits).
14. ✅ **RESOLVED at 1021.** Offline stage moves synced the row but dropped the Approved/Completed
    team notification silently (setStage — bare fire-and-forget `notifyTeam()`). **Fix:** new
    `_notifyOrQueue` helper queues an `op:'notify'` outbox entry on a network/offline send failure
    (not on a real refusal); the outbox `flush()` gained an `op:'notify'` branch that replays via
    `window.notifyTeam` and never buries a best-effort email. Proven by `gate_1021.mjs` (executes
    both the flush branch and the helper).
15. ✅ **RESOLVED — APPLIED to production 23 Aug 2026 on Theo's instruction ("D the sql")** —
    `photos_upload_prefix_exclusions.sql`. The blanket `photos_upload` INSERT policy (no staff check)
    was OR'd with the dedicated prefix policies, so any authenticated user could upload into the
    admin-only prefixes (showcase/walks/workmanship/owner-vault/materials) and staff-only
    visualizer/. Applied: one `ALTER POLICY` carving those six prefixes out; each is now governed
    only by its own stricter policy. Verified in pg_policies after apply — the `with_check` carries
    all six exclusions and the dedicated policies are untouched. ⚠️ If a non-admin teammate ever
    legitimately needed to upload to one of these prefixes, widen that prefix's OWN policy — do not
    re-blanket `photos_upload`.
16. ✅ **RESOLVED at 1022.** Community Analytics (cr-can), Line Item Library (cr-lil-view) and the
    contract viewer (cr-ce-view) were full-screen views in neither `hideAllViews()` nor
    `navRestore()` — the 941/Suppliers nav-trap class. **Fix:** all three registered — display-lever
    for cr-can, module-`close()` for the two class-shown ones (cr-ce via a wrapper on the bare
    `closeContractEditor` global); history via `__crNav` wraps (cr-can/cr-lil) and
    `wrapNav('openContractEditor')` + navRestore cases. Proven by `gate_1022.mjs` (executes
    hideAllViews and navRestore against a mock DOM).
17. ✅ **RESOLVED at 1023.** Build 966's fill chip (#fillChipBtn, a .btn.dark on #555) failed
    contrast in both states — #e35c63 (2.12:1) / #6cb98f (3.19:1), under the 4.5:1 body floor.
    **Fix:** label is now #ffc2c6 (4.89:1) / #9fdcb4 (4.75:1, the green savedFlash already uses);
    bright borders unchanged. Proven by `gate_1023.mjs` (recomputes the ratios; old ones fail).

### ✅ dropped LOWs — verified and settled at build 1034 (24 Aug; four fixed in code, one in sw.js, two shipped as hand-run SQL, two were already fixed, one is operator-only — leaked-password protection, still off per the advisor). Original list kept below:
### 🟡 dropped LOWs (original list)
Moving Invoiced→Completed pops the review prompt · `manual_estimates` USING(true) write policy ·
Supabase leaked-password protection off · New Bid property picker reads a never-loaded cache
(`forPartner`/`byPartner` don't exist) · dead `CardinalCommunityBid.logSubmitted` reference · 947
SUPPLEMENT tag 2.0:1 in light · SW answers the AI-Field-Manual iframe with the app shell offline ·
one OnHold project missing `stage_since` · contract void checks `'voided'` vs written `'void'`.

**Full detail:** workflow journal `subagents/workflows/wf_8568b748-3eb/journal.jsonl`; matched
records in `scratchpad/audit1014.json`.

---

## 🔍 Fresh audit, 23 Aug 2026 @ build 1007 (workflow wf_202d59de-b67) — CONFIRMED findings

8 finders + adversarial verify. 38 raw → 12 verified CONFIRMED. **Build 1008 fixed the four that were
regressions in today's own builds** (1005 lead-source-wrong-field, 1005 claim-type-dead-check, 1006
stage-defer drop-on-supersede, 1006 stage-defer lost-on-close). The rest, still OPEN, ranked:

### 🔴 CRITICAL — do first
- ✅ **RESOLVED at build 1009 — `api/abc.js` was an open proxy.** No auth gate at all +
  `Access-Control-Allow-Origin: *`. Anonymous callers could `placeOrder` (real orders on Cardinal's
  ABC account), `accounts` (ship-to names/addresses), and `getOrder` (order/invoice history) once
  `ABC_CLIENT_ID/SECRET` are set in Vercel. **Fixed:** every call now requires a signed-in Cardinal
  session (mirrors `companycam.js`'s `requireSession`); the order actions (`placeOrder`, `getOrder`,
  `templates` — none called by index.html) additionally require full access (admin + production);
  the wildcard CORS header is gone (same-origin route, no preflight). The client `api()` wrapper
  (`cr-abc-script`) now signs its request the way `senddoc`/`companycam` do — catalog/pricing/ship-to
  lookup stay open to any signed-in staff so the estimate-from-catalog flow (774) still works. Proven
  by `gate_1009.mjs` (GREEN on the working tree, RED with 4 named failures against build 1008).

### 🟠 HIGH — money correctness (pre-existing)
- ✅ **RESOLVED at build 1010 — 996 money-in had a second door.** Tapping the "Received" section
  *header* (not the + button) opened the legacy `dir:'in'` modal → wrote `checklist.payments`, booked
  no commission, and was invisible to Balance Due on any job with a collection (jobFinance's collPaid
  replace). **Fixed:** the `.payhead` handler now routes `data-paysec === 'in'` to
  `payGoLogCollection()`, exactly as 996 routed the + button; `out`/`exp` headings keep the legacy
  row modal (they are job costs). Editing/migrating existing legacy rows untouched. Proven by
  `gate_1010.mjs` (GREEN working tree; RED against build 1009). (F1 + MONEY-1, both CONFIRMED)
- ✅ **RESOLVED at build 1011 — `jobFinance` doc-store MAX defeated 997's accepted tier.** A bigger
  `Estimate…` inspection_reports doc (any status, no dedupe) was folded in as a flat MAX after
  `estBest`, overriding the accepted estimate → wrong Job Value/Balance Due. **Fixed:** tier-2 skip
  (an accepted estimate is the number — no doc competes) + linked-doc exclusion (`estDocIds`: a doc
  any estimates row points at never counts as a second estimate; only legacy doc-only estimates feed
  the leg, below tier 2). `estTier` promoted from indexMoney-local to global so the leg can read it.
  Measured: 0 of 6 estimate docs carry a total today — no job's value changes. Proven by
  `gate_1011.mjs` (executes the shipped functions; RED ×3 against build 1010). (F3 + MONEY-2)
- ✅ **RESOLVED at build 1012 — contract deposit from newest estimate of any status.**
  `fillContractMoney` picked `rows[0]` of `loadForProject` (created_at DESC) filtered only on deposit
  info, and the editor writes `deposit_pct` (default 30) on every save incl. drafts — so a later draft
  outranked the accepted 0% estimate that set the price. **Fixed:** the deposit now follows 997's tier
  ladder (accepted/signed > sent/approved > draft last-resort, newest within the rung); the explicit
  est→contract row and `deposit_amount`-outranks-pct are unchanged. Measured: today's pick and the
  tiered pick agree on all 10 deposit-bearing jobs — nothing changes now, but two jobs with accepted
  0% estimates were one fresh draft away from a wrong deposit. Proven by `gate_1012.mjs` (executes the
  shipped function; RED ×2 against build 1011). (F6 + MONEY-3, CONFIRMED)

### 🟠 HIGH — other (pre-existing)
- ✅ **RESOLVED at build 1013 — `api/roofr.js` + `api/hover.js` open AI relay.** No session gate;
  spent Gemini+OpenAI quota on caller-supplied text. **Fixed:** both now carry sol.js's session gate,
  run BEFORE the config check (anon learns nothing, spends nothing); the three client call sites now
  send `window.aiHeaders()`. Survey confirms these were the last AI routes without an `authorization`
  check. Proven by `gate_1013.mjs` (drives the shipped handlers; RED ×5 on the pre-fix files).
  (CONFIRMED)
- ✅ **RESOLVED at build 1014 — DB: 5 estimates pointed at deleted documents** ($71,845.99, 4
  status='sent'). `db.remove` (the one delete pipeline) now nulls referring
  `estimates.doc_id`/`contract_doc_id`; publish verifies the doc exists (`db.get` throws → create
  path → write-back re-links, self-healing any future dangle); one-time cleanup
  `estimates_dangling_docids.sql` **applied to production 23 Aug** (0 dangles remain; old values in
  the migration header). (DB-1)

### 🟡 MEDIUM / LOW — all re-verified against the 1013 tree by a 9-agent pass (build 1014)
- ✅ **RESOLVED at 1014 — push reaches only Theo.** Not a code gate on subscribing (both upsert paths
  take any signed-in user) but a door problem: the `nav==='notify'` handler had NO button and Settings
  is admin-hidden. Now: an all-desks "Enable Notifications" burger row + a one-time dismissible nudge
  (only when permission === 'default'). **The team still has to actually tap it** — watch `push_subs`
  grow past theo@.
- ✅ **RESOLVED at 1014 — 1001 pending-supplement amber** (was 2.31:1 in rb-light on the theme-fixed
  dark card; pinned `#e0a13a`, 6.38:1 both themes).
- ❌ **REFUTED (1014 verification) — 1002 iTel `--ct` tokens.** Both references carry literal
  fallbacks (`var(--ct-red,#c8202e)` / `var(--ct-green,#2f7d55)`), and `data-rltheme` is kept on
  `<body>` so `--ct-*` resolve app-wide. The buttons render correctly; false positive. (Optional tidy
  only: `--ct-green` is declared nowhere, so its reference always paints the fallback.)
- ✅ **RESOLVED at 1014 — 1000 `lossAge` UTC off-by-one** (now uses `crDate`, the file's own
  local-midnight parser, same as its neighboring `fmtDate`).
- ✅ **RESOLVED at 1014 — 996 migrate confirm's false "Balance Due does not change."** New
  `payMigrateDrop()` computes the real wsPaid delta; note + confirm state the dollar consequence when
  it applies, keep the original sentence only when true. (F2)
- ⚠️ **OPERATOR ACTION (Theo, ~5 min) — the Google Maps key is still unrestricted** (re-verified: the
  build-840 measurement stands; gating `/api/config` was deliberately rejected — the key is in the
  Maps script src anyway). In Google Cloud Console: Credentials → the browser key → HTTP referrers
  `app.cardinalroster.com/*` (+ showroom/presentation hosts if they need maps); API restrictions:
  Maps JavaScript, Places, Static Maps, **and Geocoding** (Quick Inspection geocodes through it since
  840 — omit it and the pin silently falls back to Nominatim). Verify: a no-Referer Geocoding call
  should answer REQUEST_DENIED.
- ✅ **RESOLVED at 1014 — `design.js`/`coach.js` added to `vercel.json` maxDuration** (60s;
  `ai-status.js` deliberately not — a 10-token health probe).
- ✅ **RESOLVED at 1014 — the 1003 per-job Appointments page's ungated ✕** (rendered on teammates'
  rows the shared-calendar SELECT shows, while RLS silently refused the delete — confirm-then-nothing.
  Now behind `apptCanEdit`, render + handler).


---

## ✅ DONE — the audit follow-up batch, builds 995–1003 (23 Aug 2026)

Shipped from the deep-research suggestions, all with named-control gates:

- **995** — reopening an estimate keeps its real deposit %, clamped 0–100 (was defaulting to 30).
- **996** — money received has one door (`payGoLogCollection`), the one that pays the rep; legacy
  `checklist.payments` in-rows migrate into `collections` (cents-exact).
- **997** — an **accepted/signed** estimate is the number the job shows (`indexMoney` tiering).
- **998** — a build day on the calendar must name its job; `adb.update` added.
- **999** — lead source is a required tap (chips) when a client is created.
- **1000** — a claim shows how long since the date of loss (`lossAge`).
- **1001** — one documented `claimMoney()` for "outstanding": **deductible in, undecided supplements
  out** (Theo's call). Corrected the research's overstated "outstanding skews commission" — commission
  fires on `collections`, never on outstanding.
- **1002** — iTel lab results attach to a **job** (not a claim); `itel_project_link.sql`.
- **1003** — the **shared calendar**: job/drop days visible to everyone assigned to the job, personal
  entries stay private; `appointments_shared_calendar.sql` (RLS, verified in rolled-back txns).

Two SQL migrations ship with this batch and **run before the deploy**: `itel_project_link.sql` and
`appointments_shared_calendar.sql`.


---

## ⚠️ STALENESS SWEEP, 22 Aug 2026 (at build 991) — half of this file's "open" claims were already fixed

Theo asked for this after the horizontal-pan entry turned out to have been fixed at build 950 and to
have outlived its fix by ten days, telling every later session to chase a bug that no longer existed.

**36 claims checked against the artifact by six agents plus a reconciling pass** (which re-verified 12
of the 14 strikes itself rather than trusting the agents' prose):

| verdict | count |
|---|---:|
| **STALE — already fixed** | **18** |
| genuinely still open | 9 |
| a decision waiting on Theo | 9 |
| unknown | 0 |

**The failure mode is not forgetfulness — it is that the summary above a list never gets rewritten
when the list does.** Three of the strikes were contradicted *inside this file*: one heading said
"all three worth doing, none started" over four bullets that already read ✅ DONE; another said the
Community program was open 100 lines below a line saying it was complete; a third was struck by its
own next layer 24 lines down. **When updating an item, re-read the heading above it.**

⚠️ **The sweep also found a LIVE defect the stale note was hiding** — see the client-profile entry:
`.dbic1` and `.dbrow .dbgo` measure **1.52:1 and 1.73:1** on the dark ground build 790 moved them to.
The note said the work was blocked on a ground that had already moved; what it was actually hiding
was a shipped contrast failure.

⚠️ **THE SWEEP'S OWN ACCURACY, stated plainly, because it is the point of the exercise.** The
**strikes hold** — three were spot-checked independently against the artifact and all three passed
(`jaGrid` 0 functional refs; `sortphotos.js` session-only with no role check; the Community-complete
line really is 100 lines above the note calling it open). **The supporting detail did not.** Three
claims were acted on and *all three were wrong*:

- a contrast failure at `.dbic1` / `.dbrow .dbgo` quoting four hex values **that are not in the file**
  (retracted in place below — both skins measure 9.94 and 5.08);
- a Self Check comment "still naming Sales Floor" — **no such comment exists**;
- `reorg()`'s "Flagged for Theo rather than decided here" called stale — it is **not**. The markup
  comment two lines away already records the settled part (*"955: Suppliers lives in DAILY… 953
  moved"*), and `reorg()`'s flag is about a **different, still-live** question: whether an admin gets
  it relocated under Admin.

**So: trust a strike, re-measure a number.** An agent that correctly finds *which* note is stale can
still invent the evidence for it, and a hex value is exactly the kind of detail that reads as
authoritative and costs a build to disprove.

---

---

## ⚡ NEWEST LAYER — 21 Aug 2026, builds 967–982 (the UX audit follow-through)

Source: `CR_UX_AUDIT_2026-08-21.md` / `.csv` — an end-to-end design and ease-of-use audit across
every workflow including Production. 142 deduplicated findings: 4 P0, ~23 P1, 60 P2, 55 P3.

**SHIPPED, struck — do not re-report:**
- **967** offline outbox deleted every write the server refused, then said "All changes synced"
- **968** the Supplement Desk signed a rep out of the **whole CRM, on every device** (one shared
  `storageKey`, and v2's `signOut()` defaults to scope `'global'`)
- **969** Claims / Coach / auto-stage messages painted **under** the bottom bar. ⚠️ A bigger
  z-index is a **silent no-op** — the mounts are stacking contexts; only leaving the mount works
- **970** Publish / → Contract / Mark-as-Sent / Save acted on **another client's estimate**
- **971** the community pipeline could not be advanced from the card (15 of 15 jobs at `Lead`)
- **972** a community job went **silent from the moment it was scheduled**
- **973** partner identity — attaching left the hub saying "No partner recorded"; the New Bid
  picker read the **unmasked** roster
- **974** six definitions of the bid amount, two with opposite precedence; the Bid tab printed
  **$0.00 on every line**; analytics counted every builder-priced bid as $0
- **975** ten dead-end numbers on the hub become doors; the fold you were filtering in used to
  close itself on Apply

- **976** a tarp had no name of its own — it was filed as a Ticket or a Callback. Five blocks
  own the kind (dropdown, card label chain, Type facet, activity feed, chip); the label chain
  ends by calling anything it does not recognise a punch, so a partial add is silent
- **977** a community job doing a **free tarp before any bid** had nowhere to say so — it counted
  as an open bid it had never been. `ck.lead.waitlist_at`, **no new `STAGES` entry** (that
  whitelist is shared with retail and insurance)
- **978** filing a punch-out meant finding the Production board first, and the search never
  matched a **PO number**. Two doors onto the ONE composer (global ＋ menu, ＋ New in the Punch &
  Repairs head) — not a second form; PO now matches bare (`1042`) and hashed (`#1042`)

- **979** Punch & Repairs and the Team Directory were the last two full-screen views the header
  could not name — both fell to `stickyCrm()` and wore whichever portal you had last used. Theo
  picked scope **2** (both screens). ⚠️ The head moved, `data-crm` did not; and `goHome()` needed
  a tool-screen branch in the same build or the gold house would have jumped to retail home

- **980** thirty Community rules declared `font:<weight> <size> inherit` — invalid CSS, so the
  browser discarded weight and size and used its own default. Repaired with longhands. ✅ **The
  other 64 were swept at 983; the file-wide count is now 0**

- **981** item 7 done. The community job menu mirrored a grid retired at 348, so Contracts opened
  Estimates and Appointments opened the Schedule Board; and `#jobMenuSel` / `#woQuick` were visible
  and inert on every community job at every width. ⚠️ ✅ **STRUCK — shipped at 986.** Measured on the tree at 991: `id="jaGrid"` = 0, `getElementById('jaGrid')` = 0; the 6 surviving strings are all comment prose. `gate_986.mjs` exists. *The original note read:* **retiring `#jaGrid`** — 5 of its
  11 references are functional, so it is its own build

- **982** item 6 done. Ten single-theme inks got light values; five new `--ccm-*` pairs; the
  funding-partner cell stopped flooding (BILL TO 2.70 → 7.90:1 dark). **The seven-item Community
  program is complete.**

- **983** ✅ **the other 64 are gone.** 58 stylesheet rules across thirteen blocks (25 of them the
  Showcase, the client-facing surface) plus 6 inline `style=` attributes. ⚠️ Two hid behind
  `var(--lb-sans,inherit)` — valid CSS *only if the token exists*, and `--lb-sans` has 0
  declarations against 2 references, so the fallback was always taken and always dropped.
  ⚠️ 983 also rewrote two `gate_980` assertions that had pinned a file-wide snapshot total and
  therefore went red on correct code

- **984** ✅ the Cardinal Truth tab strip stopped hiding "Closed" on a phone. Theo picked option 4
  (wrap) of four measured. ⚠️ **983 caused 11px of it and 982 caused the rest** — the strip had
  fitted with EXACTLY 0px slack, so any real claim count clipped the last tab silently. The
  `gap:13px` fix that was first proposed was measured and rejected: it buys back only the 983
  regression and still clips at two digits

- ✅ **The CHECK now exists** (tooling, no build number). `sentinel` gained a `CLIPPED` probe: fires
  on a scroller that is overflowing AND hides its bar, names what is off the edge, and is proven by
  three self-test cases (one that must fire, two look-alikes that must not). ⚠️ Its first version
  inferred "no scrollbar" from layout and reported EVERY scroller, because headless Chromium uses
  overlay scrollbars — the self-test caught it; it now reads `scrollbar-width` and the real
  `::-webkit-scrollbar` rule.

✅ **DONE at 993 — the sweep is finished, and it found seven.** The harness was taught to open
them: `sentinel_setup_cardinal.js` gained **ten states** (`leads`, `clientdir`, `photoactivity`,
`album`, `photoeditor`, `lineitems`, `insclients`, `truth`, `claimdetail`, `showcase`). Reach went
**1 of 11 → 10 of 10**. `gate_993.mjs` is the standing proof: reach **derived** from the artifact's
own stylesheets so tomorrow's scroller is covered automatically, plus a **hardcoded ten-name floor**
so the count cannot shrink silently. Negative control on 991: PASS 15 · FAIL 8, exit 1, no crash.

⚠️ **The count in the note below was one short, and the one it missed was clipping 245px.** There
are **eleven** hidden-scrollbar selectors, not ten — `#cr-claims-mount .cr-c-tabs.detail` was never
on the list, and it was hiding Documents, iTel and Record on a phone. Derive the list from
`document.styleSheets`; do not maintain it by hand.

Measured at 390px, then fixed with 984's `flex-wrap:wrap`: `.cr-lil-tabs` **525px** hidden ·
`.cr-ic-chips` **481** · `#cr-pae-tabs` **414** · `.cr-ped-row` **261** (**Undo and Clear**) ·
`.cr-c-tabs.detail` **245** · `.ljchips` **87**, and **94px at 1194px** · `.cr-sh-tabs` **55**
(**the way out of the Showcase**). Clean and left alone: `.pu-tabs`, `.cd-crmbar`, `.cr-cth-tabs`.
`.cr-sf-tabs` was **deleted** — its strip went at build 928 and five orphan rules outlived it.

⚠️ **STILL OPEN — debt the reach exposed, none of it this build's.** The walk went 15 states → 25,
and screens nothing had ever rendered came with findings attached: a plain sweep at 390px reports
**51 (31 INK · 20 DEAD)** across the 25 states. Run through the identical probe against 991,
`--since` says **SENTINEL CLEAN — 50 renders, nothing new, 185 carried** at 390 + 1194px. So **993
introduced none of it** and the seven wrapped strips cost nothing in ink, overlap or collapse — but
185 is now the honest standing number, and it was ~half that when half the app was invisible to the
instrument. Working it down is its own arc.

⚠️ **Three gates are red on `main` and were red before 993 — proved by running them against the 991
artifact and with the pre-993 setup; identical failures in all three configurations.** Reported, not
absorbed:

- **`gate_944`** — two `<input>` controls on the **Crews** screen measure **289×35 and 289×33**
  against the 44px touch floor. A real, shipped defect; 944's own arc, not this one.
- **`gate_951` (6 fails) and `gate_953` (3 fails)** — both assert the left rail has **Insurance**,
  **Production** and **Community** sections. The shipped rail has `Daily · Sell · CRMs · Resources ·
  Admin`. **Either the rail was restructured and both gates were never updated, or the sections were
  lost.** That is a question for Theo before anyone "fixes" either side — the gates encode seven
  Insurance rows and four Production rows that a person may still be looking for.

✅ **`gate_981`'s assertion 9 was the fourth, and it was mine.** Written at 981 it required
`id="jaGrid"` to still be PRESENT, because 5 of the grid's 11 references were functional then. **Build
986 retired the grid properly** and the assertion has been asserting the opposite of the shipped
truth ever since — red on main, unnoticed. Re-measured: **7 occurrences, all seven prose**, zero
functional. Rewritten at 993 to assert the retirement is complete, on the FUNCTIONAL forms rather
than the bare name, and **run red against a tree with the markup re-inserted** so it has been seen to
fail. *Fix the gate when the gate is wrong.*

⚠️ **Also new:** the sentinel's watchdog was a flat 240s and the longer walk went straight through
it. Now budgeted per render with a `--deadline` override. The walk is ~60% longer — the honest price
of measuring ten more surfaces.

*Superseded, kept because its list is still the map:* ~~30 rules declare `overflow-x:auto|scroll`
and **10 hide the scrollbar**. `.cr-cth-tabs` was fixed at 984; the other nine were measured at boot
and **none is reachable** — six are not in the DOM (`.cr-lil-tabs`, `#cr-pae-tabs`, `.cr-ped-row`,
`.cr-sf-tabs`, `.cr-ic-chips`, `.cr-sh-tabs`) and three are present at zero size (`.ljchips`,
`.cd-crmbar`, `.pu-tabs`). They are built on demand behind navigation the harness does not drive.
**The remaining work is teaching the harness to open and populate those nine surfaces — not another
checker.** This is the same blind spot that let `.cr-cth-tabs` clip for months.~~

*Superseded — the original note read:* `.cr-cth-tabs` is the FIRST of this app's **27**
`overflow-x:auto` scrollers anyone has measured for silent clipping, and it was clipping. Every one
of them hides its scrollbar, so a person gets no signal that content is off-screen. The check is
mechanical — for each such element, compare `scrollWidth` to `clientWidth` **with realistic data,
not the fixture's zeroes** — and it belongs in `sentinel` as a new probe rather than in prose (the
BUG_CLASSES header's own rule). Expect more than one hit.

✅ **STRUCK — this heading contradicted its own body.** All four bullets beneath it already read ✅ DONE (985, 986, 987, 988), each confirmed in the artifact. **Only the heading was never rewritten** — which is exactly how a stale note survives: the detail gets updated and the summary above it does not. *Original heading:* ~~STILL OPEN, all three worth doing, none started~~
- ✅ **DONE at 985.** Both adopted `var(--ccm-ac,#34D399)`: 1.81 → 5.15 and 1.71 → 4.89 in light,
  dark unchanged. ⚠️ Both properties moved on `#commsCli` — `-webkit-text-fill-color` paints the
  glyphs and `color` does not, even with `!important` (4-case Chromium control), so a `color`-only
  patch would have shipped inert; `gate_985` proves it by pixel and was run red against exactly that
  naive patch. `.pu-strip .sh b` turned out to already set both properties to the pair — precedent,
  not invention. *Original finding, kept for the record:*

  | site | light | dark |
  |---|---:|---:|
  | `.cr-pcard.community .t{ color:#34D399; }` | **1.81:1** | 8.37:1 |
  | `body[data-crm="community"] #commsView #commsCli{…}` | **1.71:1** | 9.93:1 |

  Their sibling `.viewhead` one line away already does this correctly — `var(--ccm-ac,#34D399)`,
  which flips to `#047857` at 4.89:1 — so the repair is to adopt the token pair, not to invent a
  colour. ⚠️ **Two traps, both of which make a naive fix ship inert or break something:**
  `-webkit-text-fill-color` is the property actually inking `#commsCli`, so **changing `color`
  alone does nothing**; and its `!important` exists to beat an inline `style="color:#9c1822"`, so
  it must stay. ⚠️ There are **18 raw `#34D399` occurrences** outside `var()` fallbacks and most
  are legitimate — the `--ccm-ac` declaration itself, the `--bnac` banner token, `CRM_COLOR` /
  `CRM_ICON`, the `.crm-community` chips and a comment explaining the emerald. **Only these two
  carry body text on a light ground.** Do not sweep the hex.

- ✅ **DONE at 986.** Four functional references removed (markup, writer, boot-time router,
  punch anchor); seven prose mentions kept as history. ⚠️ The router had to go in the SAME edit —
  it dereferenced unguarded at script top level, so removing the markup alone throws at boot.
  ⚠️ **The punch card's position changed** — re-anchored from the grid to `#acxMount`, so it now
  sits near the top of the overview instead of just above `#solCard`. The gate cannot judge that;
  Theo's eyes are the gate. One line to move if he dislikes it.
- ✅ **DONE at 987, and the item was wrong.** "Light half at 3.37 on white" described ONE site;
  there were **five** failures. Fixed four: six pill inks on tint 2.96 → 5.46, claims ink 3.37 →
  6.21, save-status light 3.37 → 6.21, and **estimates in DARK** 3.93 → 5.88 (it had no pair at all
  — one unscoped literal used in both themes). ⚠️ `.cr-chrome-badge` is pinned at `#C87A00`
  per-site, because it is the one place amber is a GROUND under dark ink and deepening takes it to
  2.80. `#8a5500` is build 942's own value, already shipped on `.lock` — no colour invented.
  ⚠️ **`cr-bpa-script` declares ZERO `--cr-*` tokens** — CLAUDE.md's "five modules share this
  palette" does not hold for amber.

- ✅ **DONE at 988, and it was bigger than recorded.** Not one site needing taste — **three** sites
  and **twelve** failing state/theme combinations. `--cr-black` is a SURFACE token that goes
  near-white (`#f2f4f7`) in dark, and three floating pills used it as a GROUND under hardcoded white
  ink: base **1.10** (invisible), `.saving` 2.25, `.saved` 2.07, `.error` 2.78 — all in the DEFAULT
  theme. Fixed with one flipping ink token, `--cr-onsolid`, the shape 982 already shipped as
  `--ccm-onwarn`. Worst case now 6.27. ⚠️ `.cr-chrome-top/.cr-chrome-bottom` carries the identical
  declaration text and is CORRECT — the patch splices per style block so a file-wide sub could not
  touch it.

*Superseded — the original note read:*
`.cr-p-save-status.saving` is white ink on `var(--cr-amber)`: **6.21 in light after 987, but 2.25 in
dark** and unchanged. Fixing it means flipping the INK with the theme — dark ink on the pale
dark-theme amber, white ink on the deep light-theme amber — which is inverted from intuition and
reads oddly. Alternatives are giving the pill a fixed ground, or a different status colour.

**SETTLED, 21 Aug — item 6 is option 1 and item 7 is A1/B1/C1/D1.** Theo picked both. Option 1 is
shipping in two halves: 980 the typography, 981 the colour (`--warn` as a theme pair,
`--ccm-nowfill` declared, the frozen light twins, and `.ct.bill`'s dark flood).

**SETTLED, 21 Aug — do not re-litigate:** the Production-header scope question is answered.
Theo picked **2**: Punch & Repairs *and* the Team Directory. Production/Sales are TOOL screens,
not portals — home from one of them returns to YOUR CRM.

✅ ✅ **STRUCK — shipped at 980+982 (item 6) and 981 (item 7).** Contradicted **100 lines above in the same layer** — line 50 already says *"982 item 6 done… The seven-item Community program is complete."* *Original heading:* ~~OPEN — the Community program, items 6 and 7 of seven~~
- **Item 6 — one design era.** Four redesigns layered rather than replaced: cream dialogs left
  over from the pre-black-card era, hardcoded light-mode literals, a **second green** beside
  `--ccm-acc`, and 7px labels below the legible floor. This is the invariant Theo actually feels
  and the only one of the five still standing.
- **Item 7 — one Job Menu.** A community job's actions live in two places with different
  contents depending on how you arrived.

**OPEN — ONE decision standing with Theo.** ⚠️ *Was "two" — A (the DHRN name) was answered and shipped at 976–978, so only **B** stands and 973's read-resolver is blocked on B alone.* (build 973's read-resolver is blocked on them; ZERO
live rows are affected either way, so there is no urgency and no data at risk):**
- ✅ ✅ **STRUCK — shipped at 976–978.** Answered by Theo verbatim in `dhrn_partner_name.sql`: *"DHRN is fine, but Dayton Home Repair Network is correct as the name."* ⚠️ Stamped APPLIED in the file; **not re-verified against the live DB**, so trust the stamp, not a query. *Original:* **A. The DHRN name drift.** Four jobs carry a partner name that no longer matches the roster
  row. (1) rename the roster row to "Dayton Home Repair Network" — smallest, no code; (2) keep
  "DHRN" and let the four jobs start reading it; (3) add a short-name column.
- **B. A free-typed referral.** What happens to `partner_id` when someone types a funder that is
  not on the roster? (1) clear it; (2) keep the stale id and prefer the stored name; (3) add
  `referred_from_id` and clear `partner_id`. **Recon recommends (3), fallback (1).**

**OFFERED, deliberately not slipped in (974/975):**
- provenance in the hub's dense **All-bids** table — that Amount cell collapses to a flex row
  below 900px and would need a matching rule; the designed slots (card pin, Bid tab total,
  analytics rows) carry it today
- repainting **Analytics** when `loadEst()` lands — one line in that callback. Analytics opened
  in the second before that fetch returns shows zeros until reopened. **That is pre-975 behaviour
  too, so it is not a regression.**

---

## ⚡ NEWEST LAYER — 17 Aug 2026, builds 864–875 (read HANDOFF for the full session)

**Offline-first (864–873) shipped and merged.** The field surfaces all work with no signal now
(reads, punch saves, photos, Team, client/job profile, documents) plus durability (coalescing,
sign-out clear, eviction protection, a four-state sync badge). Chokepoints: `pdb.update`,
`db.update`, the team_profiles save, the punch card. **One pipeline per concept — do not add a
second outbox.**

**SETTLED — offline CREATE is deferred (do NOT re-litigate).** Editing existing records offline is
done. Creating a NEW estimate / community partner offline is not built — the number is
server-generated. Theo chose **"Neither — leave as-is"** on 17 Aug. If revisited, the approach is
**"draft on device → number on sync"**, never a fake placeholder number.

### HEADER AUDIT — 27 Aug 2026, `scripts/audit_headers.mjs` (measured, not read)

Theo: *"can you run audit on the header for all sections"*. Chromium walk of 18 views
× 3 sticky portals × 2 themes. **No build shipped — findings only.**

**H1. TEN screens still follow the last-used portal.** 1104 pinned five shared screens to
the production head; these ten were not in that list and still wear whichever portal you
were last in: **Leads & Jobs, Photos, Reports, Gallery, Company Documents, Resource
Library, Quick Inspection, Quick Insp start, Address check, iTel lab** — plus the
no-view-open state. ⚠ **This is the 754 design working as written, not a regression**, and
754 chose it deliberately. But it is the same experience Theo reported at 1104 ("randomly
change"), on ten screens 1104 did not cover. **A decision, not a bug fix** — pinning them
is one edit to `SHARED_HEAD_1104`, but it would end "the header tells you which portal you
are in" for those screens. Ask before changing.

**H2. Two header inks below floor, on nearly every palette.** Only TWO distinct elements
account for all 15 hits:
- **`#crBanner` caret `▼`** — `#6d747e` at 11px. **3.58:1** on community, **3.80:1** on
  retail/production, **4.00:1** on insurance, floor 4.5. Passes only on rb-light production
  (4.72). It is the same grey on every ground, so it fails or passes by luck of the ground.
- **`#addProjectBtn` glyph `＋`** — the dark glyph on the accent button: **3.79:1** on the
  retail steel, **4.28:1** on community mint, 18px, floor 4.5. ⚠ Borderline by
  classification: an 18px `＋` is arguably a UI graphic (3.0 floor), not body text. Say so
  rather than quoting 3.79 as a flat failure.

**H3. The insurance `siren` sub-theme did not reach the header in any state I could drive.**
`--ct-crmhead-*` (the dark `#1a0e0d` insurance header) is declared **only** under
`[data-rltheme="siren"]`, but every navigated state measured `#FFFFFF` — docket's ground —
because something re-stamps `data-rltheme` back to `docket`. **Not proven to be a defect**:
it may be that docket is simply the live theme. What is proven is that the dark insurance
head is unreachable by the paths this rig drives. Worth one look before anyone "fixes" it.

**Two FALSE POSITIVES, recorded so nobody re-finds them:**
- A **1.01:1 invisible title on the community header** — an artifact of forcing
  `body[data-crm-head]` without letting `build()` rewrite the title, so the RETAIL slogan
  sat on a green ground. `build()` writes `TITLES[kh]`; the app never renders that.
- A **stale header after navigation** — the header module is woken by a `childList`
  observer, so a view shown by raw `style.display` does not re-skin. Through the app's own
  doors (`openSettingsView`, `openMyProfile`, `openTeamView`, `openAuditLog`) it updates
  every time. **Latent fragility, not a live bug**: a future nav path that only toggles
  display would silently leave the previous portal's colours.

⚠ **The rig was wrong twice before it was right, and both faults FLATTERED the app.**
`page.setContent()` gives an opaque origin where `localStorage` throws, so
`CardinalPortal.set()` silently failed, `stickyCrm()` answered `retail` for all three
portals, and the first run reported **"0 drifting screens"** having never varied the portal.
And `#navMenu` is a closed drawer at `translateX(-320px)` — `display:block`,
`visibility:visible` — so a naive filter scored 195 elements nobody can see. The script now
serves over `http://` and **asserts the portal actually changed before reporting a row**.

**OPEN — notification channels are code-complete but need CONFIG (Theo's side, not code):**
- **Email 403** — Resend domain `cardinalrenovations.net` is **"Not Started"**. Verify the domain
  (add its DNS records → Verify) and set `DIGEST_FROM` at that domain in Vercel. No code fix exists.
- ~~**SMS (874) not live**~~ — ✅ **CLOSED 27 Aug 2026, verified on Theo's phone: "Text sent".**
  A2P 10DLC campaign approved; `TWILIO_MESSAGING_SERVICE_SID` (1100) rides it;
  `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` set in **`cardinal-inspections` → Production**.
  ⚠️ **It took builds 1100–1106 and the last one is the lesson: the final blocker was an
  invisible newline pasted into a Vercel env var.** Twilio answers that with the same
  `20003 / Authenticate` as a genuinely wrong key, so two careful re-copies and two redeploys
  changed nothing. 1106 trims all four `TWILIO_*` values on read and, on a 20003, reports each
  credential's *shape* (stray whitespace / type prefix / length — never the value). Same keys,
  no re-entry, working immediately after 1106 deployed.
  **Standing rule: TRIM every credential read from an env var.** A pasted newline is invisible
  in the Vercel UI, survives every re-copy, and produces an auth error indistinguishable from a
  wrong secret.
  ⚠️ **Also settled while chasing this:** `app.cardinalroster.com` is served by the
  **`cardinal-inspections`** Vercel project — proved by env fingerprint via the public
  `/api/ai-status`, not assumed. `cardinal-ap` has an entirely empty env and
  `0d6e4079e367` has no production deployment (404); both build on every push and serve
  nothing. Deleting them is unclaimed tidy-up.
- **Verify with the 875 button:** Phone Notifications → "Send a test alert to myself" reads each
  channel's real status.

*⚠️ **This file is layered, and each layer carries its own date.** The newest material — the live
queue and the two questions standing with Theo — is the **last section**, worked **10 Aug 2026 at
build 691**; the bundle-splitting verdict and the deferred `showroom.html` sit above it at build 627
(8 Aug). The decisions section was worked **5 Aug 2026**. The
long middle of the file was last worked at build **573** · 2 Aug 2026 and knows nothing of 574–627;
everything under "Illustrations in the Resource Library" and beyond is 467–557 era. Read the date on
the section you are in, not the top of the file. For anything not covered here, read the `CHANGELOG`
array in `index.html` — it is the only record that survives work done outside this folder. **Crews
(547–556) is now documented in `FEATURES.md`**, not only in CLAUDE.md.*

---

## ✅ OC Colors — the showroom. 3 decisions SETTLED BY THEO, 7 Aug 2026

*Answered directly by Theo. **Do not re-litigate any of these.***

| # | Question | **Theo's answer** |
|---|---|---|
| 1 | Is the colour wall admin-only, like the CompanyCam picker, or can sales see it? | **"Yes they can see colors."** All signed-in staff — Nick, Joey and Jacob included |
| 2 | Does the colour sheet carry pricing? | **"No pricing on sheets it's not a quote."** |
| 3 | Should the Duration card name IKO, whose equivalent strip is on the back of the shingle? | **"As far as competition goes, doesn't need to be here that's a whole separate thing."** |

**Decision 3 closes the one question 620 left open, and it makes an existing assertion permanent.**
`harness_colors.js` already refuses IKO, GAF, CertainTeed, Malarkey and TAMKO anywhere in the
rendered `#cr-occ` markup — written as a defensive default while the question was open. It is now
**the settled design**, not a placeholder: this screen sells Owens Corning on Owens Corning's own
documented claims, and a competitor's product is a claim Cardinal would have to defend with nothing
in the folder. No code changed, because the code was already right.

⚠️ **"A whole separate thing" is an observation, not a request.** Theo did not ask for a competitor
comparison surface and nobody should build one off that phrase. If it is ever wanted it is its own
feature with its own sourcing problem — and the sourcing is the hard part, not the screen.

**Decision 2 is a structural constraint, not a preference.** A colour sheet with a number on it
becomes a quote the moment it leaves the phone — it would need approval, an audit trail and the
`bidAmt()` chokepoint, and it would stop being something a rep can send from a driveway without
asking. Keeping money off it is what makes decision 1 safe. **The colour-sheet document type must
have no money fields at all**, not merely blank ones, and it stays out of the estimate/contract
document family.

**Decision 1 needed no code.** `oc_colors`, `oc_color_photos` and `oc_color_wall` already read for
`auth.role() = 'authenticated'`. The admin gate people will remember is on `api/companycam.js`
(`role === 'admin'`), and this feature routes around it entirely: Theo's own colour folders land in
the `photos` bucket under `oc-colors/`, which `photos_read` already opens to any signed-in user.
**Do not "fix" the CompanyCam gate for this** — it is a different pipeline with a different reason.

### Shipped 7 Aug (PR #145) — the data half

`oc_colors` 29 rows (20 current · 6 discontinued · 2 new for 2026 · 1 COTY) · `oc_color_photos`
(empty) · `oc_color_wall`. Spellings corrected to OC's own: **Sierra Gray**, **Chateau Green**.

⚠️ **Those 29-row counts are superseded — see the two sections below.** PR #148 added two missing
colours and corrected five statuses; the catalogue is now **31 colours · 30 on the wall · 20
sellable**. Kept as written so the history reads straight.

⚠️ **`hex_verified` is false on all 31 and must stay false until someone samples a real swatch.**
The hex values are approximations eyeballed for the preview mock. A photograph of a roof in
afternoon sun is not the product colour, so importing Theo's folders does NOT verify them. The
table comment says it: do not show a customer an unverified swatch and call it the colour.

The mock's per-colour photo counts were invented to make the preview look alive and are
deliberately absent from the schema rather than loaded as fact.

### ✅ Shipped 7 Aug — PR #148 (schema) and builds 615–620 / PR #149 (the wall)

**PR #148**, six migrations, all applied before merge: `slug` (generated) + `cover_image_path` +
`cover_credit`; `coty_year` with a one-winner-per-year index (2017–2026, no gaps); the two missing
colours (**Williamsburg Gray**, the 2024 COTY, and **Peppercorn**); five colours corrected from
`current` to `discontinued` on Theo's word; and **`hidden`**, which is *not* `status` — discontinued
colours keep their spot on the wall badged, `hidden` removes it. One row hidden: Shasta White.

**Build 615** enabled the Colors tile that had been sitting disabled in `visionHtml()` since 593 —
no new surface. Full detail in `FEATURES.md` and `cardinal_build_log.md`. **The upload UI struck
from this list: it shipped with 615**, `is_staff()`, writing to `oc-colors/<slug>/`.

`oc_color_covers_set.sql` then set `cover_image_path` on **23 of the 30 colours on the wall** — run
twice, the second time for Mountain Pine alone. **Zero sellable colours are on the hex-swatch
fallback**; the seven that are, are all discontinued, and that is the end state, not a backlog.
**The cover work is closed.**

### Still open

- ✅ ~~Oakridge and Supreme specifications~~ — **CLOSED at build 617.** Theo supplied the Supreme
  Product Data Sheet (10013324) and the Oakridge Brochure (10024153); both lines are live with
  sourced spec tables. ⚠️ **Oakridge's wind row is 110/130 and conditional** — 130 only with six
  nails and OC starter along eaves and rakes, per the brochure's own footnote. It renders as a
  caution and the harness asserts it. **Do not collapse it to one number.**
- ✅ ~~The `###` footnote behind "up to 160 MPH."~~ — **CLOSED at build 621.** Theo supplied the
  Owens Corning Sales notice (Sara Fagerman, Mid-South) on 7 Aug. It answered all three
  questions: it is a **warranty** figure, **effective 1 Aug 2026**, conditional on **at least
  four Total Protection Roofing System® components** (Hip & Ridge, OC Underlayment, Starter on
  **both** eaves and rakes, and either Ice & Water Barrier or Ventilation). Duration and FLEX
  ship **130/160** with the condition in a caution block; anything short of the spec is still
  130. All three predicted rendering defects were real and were fixed in the same build.
  ⚠️ **Two things this deliberately does NOT do, both still open if Theo wants them:**
  1. ✅ ~~It does not claim Cardinal installs the full system as standard.~~ **CLOSED at 622.**
     Theo, asked directly: **"Yes we do."** The Duration and FLEX note now leads with it. The
     130 fallback, the OC-grants-the-warranty attribution and the four named components are
     all harness-asserted — they are what keep the claim true and must not be trimmed.
  2. The source is a **sales notice, not the warranty document**. Revised documents were due on
     OwensCorning.com 3 Aug 2026 and the sandbox cannot reach that site. Swap both `source`
     strings when the published document is in hand.

- **The photos.** Theo's 28 hand-sorted iPad folders — *Cardinal's own roofs*, `oc_color_photos`,
  still **empty**. Distinct from the covers, which are Owens Corning's photography, and the reason
  the two render in visibly separate sections. Agreed to start with the top three or four sellers
  at 5–8 shots each rather than all 28 at once.
- ⚠️ **The README inside the cover-image zip names the wrong upload path** —
  `oc-colors/<slug>/cover.jpg`. The live convention is flat: **`oc-colors/covers/<slug>.jpg`**.
- **The colour sheet is NOT a new pipeline.** `api/share.js` already serves stored document HTML
  via an unguessable token (not a signed URL, so it does not expire in an hour like photo links do),
  `api/senddoc.js` emails it, and `@page{size:Letter}` appears 7× for print-to-PDF. A colour sheet
  is another document in that pipeline. **Do not build a PDF generator.**
- **Delivery already exists and is proven.** `ccDeliver()` in `cr-lib-script` (build 482) hands
  files to `navigator.share()`, so Messages/Mail/AirDrop already work for multiple photos, with an
  anchor-download fallback and `AbortError` correctly treated as the user's choice rather than a
  failure. Point it at a colour instead of a project. **A zip was considered and rejected** — there
  is no zip library in the app (`JSZip` 0 hits; the 18 `zip` matches are postcodes and one
  `zipper`), and a zip arrives as an attachment an iPhone client must fight with, where Web Share
  delivers real images inline.
- **OC's colour copy** — normal to use as an authorised dealer, but attribute it. The catalogue's
  descriptions are paraphrased, not lifted.

---

## ✅ CLOSED at build 596 — the detect vocabulary now covers the whole exterior

*Opened 5 Aug 2026, after PR #114. **Read the 5 Aug section of `HANDOFF.md` first** — it carries the
distillation finding this depends on.*

**The defect.** `walks_schema.sql:53` allows a walk trade of
`('roof','siding','windows','andersen','gutters','general')`. `index.html:57402` passes that trade to
`/api/detect`. **`DEFECTS` in `api/detect.js` is roof-only.** So every siding, window, gutter and
Andersen finding is coerced to `'other'` — **294 of 959 collected boxes, 30.7%**, the largest measured
leak in the label pipeline.

**Latent, not live** — `walks` and `walk_shots` are both **0 rows** as of 5 Aug. Nobody has run a walk
yet. It breaks the first time someone does.

**SHIPPED at build 596 (PR #116), same night.** Theo settled the method — *"using the clusters"* —
and the clusters answered it: **no seventh trade needed.** `DEFECTS` is now 33 keys, taken verbatim
and **in order** from `exterior_vocab.py` on the Spark, so `DEFECT_KEYS` is index-aligned with the
trained model's classes 0-32 and `other` stays at index 16. The prompt is neutral + trade-aware.
Verified in production on the first collection batch: **`raw_defect` is quiet** and exterior classes
arrive under their own names.

**If `raw_defect` ever starts appearing at volume again, that is a 34th class asking to exist** —
and unlike last time you will have the model's own word for it instead of recovering it from free
text.

**When the clusters land, the change is two sites:** `DEFECTS` in `api/detect.js` and `DEF_LABEL` at
`index.html:57117`. Defects and trades are separate vocabularies — the trade family
(`showcase_pairs`, `EST_TYPES`, `api/sortphotos.js`) only moves if a *trade* is added.

**Related, flagged, needs Theo:** the `/api/detect` prompt is roof-framed throughout — *"assisting a
roofing inspector"*, *"undamaged roofs exist"*, *"do not infer damage from the age or style of the
roof."* Widening `DEFECTS` will not fully help while the prompt still says roof. Changing it alters
live behaviour for reps.

**Do NOT re-open these three** — measured 5 Aug over 1274 photographs, `dropped` was **0 on every
one**, and every drop path in `cleanFindings()` increments that counter: the >12 truncation, the 0.5%
size floor, and the unplaceable-box path have **never fired**. Three of four proposed mechanisms were
wrong. Only the coercion was real.

## 🔴 Modal z-index vs the phone bottom bar — ONE fixed, five unaudited

*Build 597, 5 Aug 2026. **Test in the INSTALLED app, never a browser tab.***

`body.standalone #pwaNav{z-index:9990 !important}` — the 104px phone bottom bar. Any centred modal
with its buttons at the bottom edge and a **lower** z-index gets its footer covered, and it reads to
the user as "scrolling is broken" because there is nothing below to scroll to.

**The rule is scoped to `body.standalone`.** In a browser tab `#pwaNav` computes to **160**, every
modal wins, and the bug is invisible. That is why it survived: it cannot be seen on a desktop.

**Fixed at 597:** `#cr-show-form` 9610 → **9996** (clears `#pwaNav` 9990 and `.cd-crmbar` 9995, stays
under the `.cd-sheet`/`.pu-sheet` tier at 9997/9998 — the existing convention, not a new mechanism).

**NOT audited, all below 9990:**

| | z-index |
|---|---:|
| `#cr-ped` (photo editor) | 9600 |
| `#cr-sp-modal` (supplements) | 9570 |
| `#cr-epub-preview` | 9550 |
| `#cr-est-picker` | 9510 |
| `#cr-lil-editor` | 9410 |

Some are full-screen views where it cannot bite. **That is a guess — nobody has measured them.**
The harness exists: set `body.standalone`, force `#pwaNav` visible, scroll the box to its end, and
`document.elementFromPoint` at the footer button's centre. It returns `DIV#pwaNav` when the bug is
present and the button when it is not. Negative-control by flipping the z-index on the same page.

**Two companions worth checking at the same time**, because they made 597 a trap rather than an
annoyance: does the modal close on **backdrop click or Escape**, and is it registered in
**`hideAllViews()`**? `#cr-show-form` had neither — `closeForm()`'s own comment claimed an "escape
path" that was never wired.

## 🟠 The Studio and the Showcase do not connect

*Diagnosed 5 Aug 2026. Verified, not inferred: **`index.html` references `studio_photos` ZERO
times**, and `studio.html` performs zero writes.*

Two photo worlds, no bridge:

- **Cardinal Studio** browses `studio_photos` — the Spark's 60,503. Own subdomain, own sign-in,
  admin-only. Deliberately read-only ("browse, search, look"; retagging happens on the Spark).
- **The Showroom** presents `showcase_pairs`, and pairs are built **only** two ways: the upload form,
  or "From a job" (`promoteToPair`, which **copies** the bytes).

**So the 60k archive cannot feed the Showroom.** Spot the perfect before shot in Studio and there is
no button — you have to find that same photograph again through the job picker. Not deliberate; the
Showcase predates Studio (3 Aug) and nobody wired them.

**The hard part is already built.** `promoteToPair` copies rather than links, which is exactly what
the privacy boundary needs: `photos/studio/*` is admin-only and Showcase pairs are shown to
homeowners, so a studio photo must be **copied** into the showcase prefix, never referenced.

Preferred shape: **a third source, "From the archive", beside "Upload photos" and "From a job"** —
keeps one screen owning pair-building and lets Studio stay honestly read-only.

**Do it AFTER the push finishes and together with the grid-transform fix.** Building a picker on a
half-loaded table with 20 MB-per-page thumbnails means judging it twice.

## 📌 v4's corpus — the filter decision, recorded so the number can be read

*Settled 5 Aug 2026, after v4 was killed at epoch 25 to avoid training on a mismatched corpus.*

**The question:** v3's 615 boxes were filtered by `build_clean_labels.py` at `conf >= 0.5`, with `other`
dropped and window-caulk `flashing_failed` dropped. B's 664 boxes were appended **unfiltered**. A
v3→v4 change would then be *more data* or *looser data*, with no way to tell which — the same
ambiguity `via` was captured to prevent, one layer down at label-assembly instead of collection.

**Measured, not assumed:**

| | |
|---|---|
| B boxes below `conf 0.5` | **0 (0.0%)** — the confidence half of the filter is a no-op |
| B boxes that are `other` | **28 (4.2%)** — the only real asymmetry |
| B after the v3-equivalent filter | **~617**, against v3's **615** |

**Decision: apply the v3 filter to B**, so the two halves match. Volume-matched at ~617 vs 615 means
any v3→v4 difference is attributable to **which photographs** (storm-scored, native rare-class
labels) rather than to how many boxes or how loose the bar was.

**The one deliberate deviation is the 28 dropped `other` boxes.** v3 dropped `other` too — they were
recovered separately into real exterior classes rather than trained as `other` — so this is
consistency, not loss.

`append_b_labels.py` applies the filter by default and logs every skip counter, and the `MARKER` in
`yolo_labels.txt` still delimits B's section, so the corpus can be trained with and without B
without re-deriving anything.

**When v4's numbers land, write them down beside this.** And remember `box.maps` is per-class
mAP50-95 despite the name, five classes had zero val instances before the split was stratified, and
the per-class mean must reconcile against the reported aggregate — three tables were wrong before
those guards existed.

## 🟠 Cardinal Studio — the grid downloads ~50× the bytes it displays

*Found 5 Aug 2026 while the first real push was running. **Invisible at 120 rows, obvious at
60,503** — which is why the push had to run before anything was built.*

`signBatch()` in `studio.html` calls `createSignedUrls` with **no transform**, `PAGE = 60`, and the
cards are `minmax(190px, 1fr)`. The stored browsing copy averages **341 KB**.

**So every page load pulls 60 × 341 KB ≈ 20.5 MB to render sixty 190-pixel thumbnails**, on every
scroll, on a phone.

- **Do NOT change the push.** 1400px is correct for the detail view — the stored size is right. It is
  the *grid's request* that is wrong.
- Supabase Storage on **Pro** (confirmed: this org is Pro) does transform-on-read. The fix is a
  transform option on the signing call **in the grid path only**, full size when a photo is opened.
- Small, well-understood, and better made against the full archive than guessed at now.

## 🟡 studio_findings.sql is in the repo and NOT applied

`studio_findings.sql` shipped at PR #119 — the join that lets the Studio search for damage rather
than only composition. **Theo runs it in Supabase; it has never been executed.** It must run before
any ingest that fills it.

Why it exists: `studio_photos.tags` comes from `studio_tagger.py`, which has **no vision model** —
`aerial`, `roof`, `siding`, `close-up`, `wide`. The damage labels live in `findings.jsonl` on the
Spark and never reach the table, so the Studio can find *"aerial shots of siding"* and cannot find
*"hail damage"*. `damage_tags` is denormalised into the same `text[]` + GIN shape the page already
filters on, so it needs **no front-end change**.

**Storage projection, measured 5 Aug:** the browsing copies land at ~341 KB each, so the full
archive is **~20.1 GB** — into a 100 GB Pro allowance. Not a blocker; worth knowing before a second
corpus is ever added.

## 🟡 The Spark corpus is not in production

`studio_photos` is **0 rows** as of 5 Aug — the 60,503 tagged photos are on the Spark and have not
been pushed. The Studio browser has nothing in it. Not a bug; the push has not run.

Also still open from 2 Aug and unchanged: **`studio_photos` has no bounding-box column** and
`spark/push_studio_tags.py` never sends one, while Theo's stated output shape is labels + **boxes** +
confidence. Fine for search, not enough for the annotation half of decision 4. Schema **and** ingest
change — cheaper before a 60k pass than after.

## ✅ Contractor Vision Suite — all 7 decisions SETTLED BY THEO, 5 Aug 2026

*Answered directly by Theo. **Do not re-litigate any of these.** The questions come from
`CONTRACTOR_VISION_SUITE.md` on `claude/contractor-vision-suite-bwq21i` (PR #98) — recorded here
because `OPEN_ITEMS.md` is where settled decisions live. **That branch has since MERGED** (PR #106,
build 593), and a parallel session shipped much of the storage half against these answers the same
night — see the build-state note under decision 2 before planning any of this work.*

| # | Question | **Theo's answer** | vs. the recommendation |
|---|---|---|---|
| 1 | Reopen the photo-GPS fence? | **YES, but ADMIN-GATED IN-APP ONLY** — never public; SEO uses city/area | ⚠️ **OVERRIDES** the recommended NO, narrowly |
| 2 | Corpus-scale AI tagging | **(c) Spark pass** — already largely DONE with **YOLO**; output is **labels + boxes + confidence** | matches, and overtaken by events |
| 3 | Hall of Shame sourcing | **Allow the exception** | (none offered — his call) |
| 4 | Photo enhancement | **"I would never alter insurance photos"** | matches |
| 5 | Privacy toggle scope | **No client names on the front end. The photo organizer is his eyes only and needs no masking** | (none offered — his call) |
| 6 | Mirror auto-sync cron | **Wait** | deferred |
| 7 | Remote sign-off for reports | **Yes — can be signed with a link** | matches |

### 1 — the GPS fence reopens, and this reverses a written constraint

The no-coordinates fence is written at **three sites** (`companycam_index.sql:15-18`,
`companycam-sync.js:11-14`, `companycam.js safePhoto()`) and every one says a searchable index does
not need the customer's latitude and longitude. **Theo has decided to reopen it for website/SEO use,
gated by permissions.** That is his call and it is now the standing position.

**"With permissions" was pinned down the same day, and it is narrower than it first sounds:**

> **ADMIN-GATED IN THE APP ONLY.** Coordinates may be stored and shown to Theo and Joan inside the
> app — organising, mapping, clustering jobs. **Nothing carrying a lat/long ever reaches a public
> page.** SEO uses the job's **city/area**, not photo coordinates.

So the *public* half of the original fence still stands. What changes is that the index may now
**carry** coordinates for admin use, where before it refused to store them at all.

**Implementation notes for whoever builds this:**
- The three fence sites (`companycam_index.sql:15-18`, `companycam-sync.js:11-14`,
  `companycam.js safePhoto()`) are **not simply deleted** — `safePhoto()` is the public-facing
  shaper and must keep stripping coordinates. The change is at *storage* and *admin read*, not at
  the public serializer.
- Same shape as the existing `internal:true` refusal, which is already enforced in list + fetch +
  sync. Copy that, do not invent a second mechanism.
- **A public page must never be able to ask for coordinates at all** — not gated, absent.

### 2 — already in flight, on Theo's own hardware

Theo: *"im in the process and tagged all photos almost with Yolo."*

**This overtakes the plan.** The doc proposed a trial-first Spark pass using the `sample_captions`
pattern to justify the spend. That justification is moot — the corpus is nearly tagged already,
**with YOLO, on the Spark, outside this repo.** YOLO appears nowhere in the codebase or the plan; it
is Theo's own pipeline.

**What this changes for the app side:** the work is no longer "run a tagging pass", it is **ingest
the tags Theo already has**.

**The output shape, confirmed by Theo 5 Aug: labels + bounding boxes + confidence, per photo.**

That is the full detection output, and it decides three things at once:
- **Search** takes the labels. **Confidence is load-bearing** — low-confidence tags must be held
  back or flagged for review, never surfaced as fact. This app runs insurance claims; a wrong
  confident-looking tag on a claim photo is worse than no tag.
- **Boxes** are exactly what the drawn-annotation half needs later (`cr-ped-script` already draws).
  Per decision 4 they arrive as **machine-suggested, human-confirmed** — never auto-stamped.
- The `phase` vocabulary (`before|progress|after`) still ships **in its own commit, before any
  writer** — the `normStage` whitelist lesson. Unrecognised values become `'Lead'`-equivalent
  silently, which is how this class corrupts data.

**⚠ Overtaken a second time — the table SHIPPED while this was being written.** A parallel session
merged `studio_photos.sql` at **PR #106 / build 593**, along with `spark/push_studio_tags.py`,
`spark/STUDIO_TAGGING.md` and `studio.html`. The warning that used to sit here — *don't design the
table from invented shapes* — was **honoured, not skipped**: it was built against a documented real
sample (`studio_tags.jsonl`, shape given in `spark/STUDIO_TAGGING.md`). What shipped:

```
id · source · spark_path · storage_path · tags text[] · confidence jsonb
project_address · project_name · captured_at · width · height · tagged_at · pushed_at
```

**But it carries labels and confidence only — there is NO bounding-box column, and
`push_studio_tags.py` never sends one.** Theo's stated output shape is labels + **boxes** +
confidence, so the boxes are dropped at ingest today. That is fine for search, which is all the
Studio browser needs. It is **not** fine for the annotation half of decision 4, which needs boxes to
offer machine-suggested / human-confirmed marks. **Adding them is a schema change AND an ingest
change — do not start the annotation work assuming the data is already there.** Confidence did
survive (`{tag: 0.0-1.0}`), so the load-bearing half above is intact.

### 4 — the altered-evidence rule is now Theo's own words

> **"I would never alter insurance photos."**

Enhancement and auto-annotation are **presentation surfaces only** — never claims, reports or
supplements. Annotations stay machine-*suggested*, human-confirmed.

### 5 — masking is a front-end concern only

Client names and addresses are hidden on **the front end** (anything a customer or the public sees).
The **photo organizer is Theo's own tool** — admin-only by construction — and deliberately needs no
masking or redaction. Do not spend effort privacy-proofing the organizer.

*(The separate CDN-residue item — 11 of 26 sampled photo objects still served anonymously after the
bucket flip — was bundled into this question in the plan doc but is NOT answered by it. It remains
open.)*

### 6 — no cron yet

Mirror auto-sync waits. Search stays manual-press. Do not build the secret-header path or the
incremental mode until he asks.

### 7 — reports get remote sign-off

Align the inspection templates' sign block with `SIGN_RX` ("Client Acceptance") so reports sign from
the share link exactly as estimates and work orders already do. Today inspection templates say
"Client Acknowledgment" — **one word apart**, which is the whole reason reports can only be signed in
person.

---

## 🔴 Open after builds 565–573 (2 Aug 2026)

### ✅ Closed this session — do not re-open

| | |
|---|---|
| Address-autocomplete retry storm (60fps, forever, every screen) | **565** |
| Estimates list returning 400 on every load | **566** |
| Two rAF repaint loops — CRM chip, landing greeting | **567** |
| The landing weather strip, still looping after 567 | **569** |
| The Estimates screen showing nothing despite 12 real rows | **568** |
| Crews / Pricing / Company Docs trapping you on the page | **570** |
| The estimate editor trapping you the same way | **571** |
| The back button walking past five full-screen overlays | **571** |
| Sales Floor / Coach / Production with no menu and a 640px column | **572** |
| Four modules hardcoded light in every theme | **573** |
| `estimates` editable by any signed-in user | **SQL, applied** |

### 🟠 `cr-bpa-script` — the fifth `--cr-*` module, deliberately left

Four of the five modules sharing the `--cr-*` palette were themed at 573. **`cr-bpa-script` was
not**, on purpose: it writes `M.style.background='#fff'` **inline**, and it has **no dark palette to
fall back on**. Stripping the inline white without first giving it the dark/`rb-light` token pair
would leave it with **no background at all**. Do the tokens first, then the inline write — same order
573 used for the other four. The dark palette is already designed and contrast-checked; copy it.

### 🟠 `--cr-muted-2` is below the contrast floor **in light mode, today**

`#a8a8a8` on `#fff` = **2.38:1** against a 4.5 floor. **Pre-existing — 573 did not introduce it**,
and 573 deliberately left the light side byte-identical rather than smuggle in a visible change Theo
had not asked for. The dark twin is 5.40:1. Fixing light is a real visible change to four screens and
wants its own build and Theo's eyes.

### 🔴 Admin Health reports four of its OWN bugs as infrastructure failures

Every one of these is the health check being wrong, not the database. Verified against the live
schema 2 Aug:

| It queries | Reality |
|---|---|
| `audit_events.created_at` | column is **`at`** |
| `audit_events.event_type` | column is **`type`** |
| `team_profiles.id` | **no `id` column** — the PK is `email`, so `checkTable`'s `.select('id')` 400s |
| `payments`, `supplements` | **the tables do not exist**, and are referenced **nowhere** in the app (0 hits) |

**Why the error message is useless:** `checkTable` uses `.select('id', { count:'exact', head:true })`.
A `head:true` response carries **no body**, so PostgREST's reason never reaches `r.error.message` —
which is why a missing *column* is reported as *"Query failed · Fix: Check RLS policies"*. Fix:
`select('*')` instead of `'id'`, and on error re-ask without `head` to get a real reason.

`payments` / `supplements` should come **out** of the `REQUIREMENTS` registry — nothing uses them, so
flagging them makes the whole screen cry wolf. 16 of the 18 registry tables do exist.

### ~~🟡 Production hub revamp — Theo asked, previews first~~ ✅ SHIPPED at 603

> *"Can we possible Revamp the productions page with a nav on the left and maybe reconstruct with
> added relevant info or have it to where its relevant with all productions related hub that also has
> all the punch outs that are new/remaining/closed?"*

**Done at build 603.** Five labelled options were previewed dark/light and phone/desktop as agreed;
Theo cut to 3 and 5, then picked **3 — the job dossier** ("Let's do 3 and wire it to actual client
also"). Shipped as master-detail with the punch buckets and a button through to the client profile.
See the 603 entry in `cardinal_build_log.md` and the Production row in `FEATURES.md`.

**One correction to what this entry claimed, worth keeping.** It said *"the statuses are already in
the data."* **They are not.** `punch_items.status` is binary — `open` | `done` — verified against the
live table. New / Remaining / Closed is **derived** (open and <7 days · open and older · done). It
still needed no migration, so the "wiring, not building" conclusion held, but for a different reason
than the one written here.

**And the screen is empty on the live database today, which is not a bug.** 20 projects — 15 Lead,
4 Prospect, 1 Invoiced — **zero in Approved / Scheduled / Completed**, so `activeJobs()` returns
`[]`. The one existing punch item sits on a **Prospect**, which is why 603 added the off-stage tail;
without it the new screen could not have reached a single real item. **Jobs have to be moved into
those three stages before the board has anything to show.** That is stage hygiene, not software.

### 🟡 Two left rails on the estimate builder — flagged at 560, never answered

On desktop the builder now carries both the app menu (238px) and its own document outline (224px).
Measured: 798px of form at 1280, 958 at 1440. Workable, but it is two rails and Theo has not said
whether he wants it.

### 🟡 572's widths were my pick, not his

`.cr-sf-wrap` and the coach's `.cr-k-app` went 640/760 → **940**; `.cr-pb-wrap` → **1180**. A board
earns width; prose does not — a 1200px measure reads worse than 640. One number each if he wants
different.

### ⛔ Blocked on Theo — Google Maps key

He set `GOOGLE_MAPS_API_KEY` in Vercel on 2 Aug. **I could not verify it** — `app.cardinalroster.com`
is blocked by this environment's egress policy. `/api/config` should report `"configured": true`.

If autocomplete still fails, 565 made the console legible (**one** warning per page load instead of
20,000). `ApiNotActivatedMapError` / `REQUEST_DENIED` almost always means the **legacy Places API**
is not enabled — the app uses `google.maps.places.Autocomplete`, the old widget, not
`PlaceAutocompleteElement`.

---


---

## 🟡 Illustrations in the Resource Library — researched at 534, NOT built, awaiting Theo

*Written 1 Aug 2026 at build 534. **Read this before re-researching any of it** — Theo's
explicit complaint was that a previous session "went in a circle and burned a lot of money by
guessing and it not being true." Every figure below was measured or fetched, and the one thing
that could not be verified is named as such.*

**What Theo wants:** diagrams AND illustrations, specifically **shaded technical illustrations**.
He raised using actual client photos, undecided.

### Settled facts — do not re-derive

- **The diagram engine works.** 33/33 render + 20/20 Chromium assertions on 533. Four forms,
  6 of 26 live entries already use one. It is not broken and never was.
- **There is no image generation in this app.** Both librarian models (`gemini-3.6-flash`,
  `gemini-3.5-flash`) are text-only; nothing in `api/` generates an image. The `MAX_IMAGE_BYTES`
  hits in `analyze.js` / `companycam.js` are image *input*.
  ⚠️ **Superseded 12 Aug, build 761: `api/design.js` now generates images** (the Exterior
  Designer, `gemini-3.1-flash-image` per the vendor table below). True when written; do not
  quote it past 761. The Library-illustration question itself is still open and still
  Spark-recommended.
- **Client photos already exist as a feature** — `~~photos` (build 471), real CompanyCam
  photographs, admin-only, model never receives photo data. Theo may simply not have seen it.
- **The storage half is already built.** `library` bucket + blob upload + signed URL +
  `library_items` row with `kind:'image'` — 5 call sites, `ccFileBlob()` is the pattern.
  A generated image needs **no new storage work**.
- **Cost is not a factor.** 20 entries lack a diagram; at ~$0.067/image that is **~$1.35 one
  time**, stored not regenerated.

### Vendor comparison — settled, do not re-litigate

| | Verdict |
|---|---|
| **Imagen 4** | ❌ **Deprecated, shutdown 17 Aug 2026.** Do not build on it. |
| **`gemini-3.1-flash-image`** (Nano Banana 2) | ✅ Recommended. Existing key, existing host, existing `askGemini()` ladder, ~$0.067/image. |
| **Recraft (direct or via fal)** | ❌ **Wrong tool for shaded technical.** Its advantages — SVG vector, brand style sets, text-in-image — all serve *flat* work. Its style catalogue has no technical/cutaway/schematic option, and **V4 dropped the `style` parameter entirely**. |
| **fal.ai** | ⚠️ Real merit as vendor insurance (Google just killed Imagen 4 with two weeks' notice) and Recraft V4 vector emits native SVG — but a 5th vendor and prepaid credits for ~$0.85 of savings. Revisit only if raster looks wrong beside the SVG diagrams. |

### ⛔ The one unverified thing — needs a key, cannot be closed from the sandbox

**The exact endpoint and response shape for Gemini image generation.** Sources conflict on
`:generateContent` vs a newer `/interactions` path.

An unauthenticated probe was attempted and **the negative control killed it**: a model that
cannot exist (`gemini-9.9-not-a-real-model`) returned the same 403, because auth is checked
*before* model resolution. **Those 403s prove nothing.** Without the control this would have
been reported as "all three image models confirmed" — which is precisely the failure mode Theo
is complaining about. Close it with a probe route (precedent: `api/companycam-status.js`).

Reachability from the build sandbox, measured: `generativelanguage.googleapis.com` **reachable**;
`fal.ai` and `api.openai.com` **blocked by the proxy**. Chromium bypasses the proxy entirely, so
`ai.google.dev` is unreachable by any local tool.

### 🔴 The real risk, and it is not the vendor

Generated technical illustration produces **confident, handsome, wrong detail** — layers in the
wrong order, impossible flashing, invented components. The crew uses this library to work on real
houses. Note the existing diagrams are structurally safe from this: the prompt requires a diagram
to *only restate what the prose already says*, and four data lines can be checked at a glance.
**A picture cannot be verified that way.**

If built, it must have: **(1)** Theo approves before it files — generate → preview → save or
discard; **(2)** prompted schematic, not photoreal; **(3)** illustrations sit *beside* diagrams,
never replacing one.

### ✅ ANSWERED — the DGX Spark is the recommended route, see `DGX_SPARK_ILLUSTRATIONS.md`

Theo confirmed the Spark is **up and running**, and that he has **Tailscale**. That settles it:
generate on the Spark, upload through the Library's existing image path. **No app changes, no
vendor, no key, and the unverified-endpoint blocker above stops mattering.**

Not for *serving* the app — a box in Dayton behind a tunnel is a single point of failure for a
field tool whose crew works at all hours, and the librarian's Gemini → OpenAI fallback has no
equivalent for a self-hosted box. But for *producing* illustrations it wins outright: unlimited
iteration at zero marginal cost, a LoRA for one consistent house style, and customer photos never
leaving the building.

Full setup written up in **`DGX_SPARK_ILLUSTRATIONS.md`** — Tailscale, ComfyUI on port 8188, the
`--listen 0.0.0.0` gotcha that silently breaks remote access, FLUX.1-dev, a prompt recipe, and
the standing rule that **generated illustrations must not carry labels** (text rendering is
unreliable; let the `~~stack`/`~~flow` diagrams carry the words, which are real text and already
accurate).

**Still true and still the reason to be careful:** a generated cutaway is an unverifiable claim
with a picture's authority. Nothing files without Theo looking at it. Do not automate the upload
step away without re-reading that section.

---

## 🟡 Exterior Designer (761, 12 Aug) — deploy steps + follow-ups

Shipped in the build-761 PR. **Before merge: run `design_renders.sql`.** After
deploy, the first Generate press either works or names the real blocker — if it
reports missing models or permissions, POST `{"probe":true}` to `/api/design`
(signed in) and read `imageModels`: an empty list means the Vercel
`GEMINI_API_KEY` has no image models enabled, which is a Google AI Studio /
billing setting, not app code. ~$0.067 per press; a 10–15 image kitchen-table
session is about a dollar. The free tier 503s — expect to want the paid tier.

Follow-ups, none started, none promised:
- **(a) Reference-image colour anchoring** — send the picked colour's
  `oc_color_photos` cover beside the prompt so shingle colour matches the real
  product rather than the model's idea of the name. Do this first if Theo says
  the colours look off.
- **(b) A Designer rail inside the Showcase view** if he wants saved designs in
  the presentation flow — today they live in the Designer's own shared gallery.
- **(c)** The hub tile's pencil icon is dim — it matches the existing Colors
  tile exactly (only `.primary`/`.admin` tiles tint their icons). Cosmetic.

---

## 🔴 Data, not code — audited against the live database 31 July 2026

Read-only audit via the Supabase connector 31 July; the crews section below was added 1 Aug at build 557. **Two items need Theo — both are email addresses, and both carry the same do-not-guess rule.**

### Needs Theo: 5 of 10 active community partners have no `contact_email`

| Partner | Type | Jobs referencing | Contact name on file |
|---|---|---:|---|
| **Kitty Hawk Realty** | property manager | **1 — live** | yes |
| C.G. Egli Inc | general contractor | 0 | no |
| CityWide Development Corporation | nonprofit (prospective) | 0 | yes |
| County Corp | nonprofit (prospective) | 0 | yes |
| James Construction | general contractor | 0 | no |

**Kitty Hawk is the one that matters** — it has a live job, and community bids go to the *funding
partner*, not the homeowner. Sending that bid means typing the address by hand.

**Do NOT guess these.** CLAUDE.md is explicit: *"Never write an unverified email address into
`community_partners`. A bid sent to a guessed address is a lost bid. Ask."* Ask Theo, then write.

### Needs Theo: 10 of 11 crews have no `contact_email` — added 1 Aug 2026, build 557

Same rule, different table. The crew Work Order (build 555) prefills its contact block from
`crews.contact_*` and **renders a visible blank when the address is absent** — it never invents
one. Nothing anywhere in the app writes a crew email; they arrive from Theo or not at all.

**✅ Supplied by Theo and written 1 Aug 2026 — do not re-ask:**

| Crew | Legal name | Trade | Email |
|---|---|---|---|
| Alberto Campuzano Rutledge | Betos Home Improvements | Roofing | `betoshomeimprovements@gmail.com` |

*(`contact_name` on that row was `"Alberto "` with a trailing space, which would have printed that
way on a work order. Trimmed in the same statement.)*

**Still blank — ask, then write:**

| Trade | Crew | Legal name |
|---|---|---|
| Roofing | Daniel Sarceno | Sarceno Construction |
| Roofing | Diego Hernandez | Morelos Construction |
| Roofing | Felipe | Advanced Construction |
| Siding | Jamie & Robin | Pineda Siding |
| Siding | Ronaldo | — |
| Windows | Cameron Deaton | — |
| Windows | DeShawn Vaughn | — |
| Windows | Robert W Deaton | Robert W Deaton |
| Gutters | Francisco Ramirez | Jiminez Gutters |
| General Repairs | Amanda Hoskins | — |

**Do NOT guess these**, and do not derive one from a legal name — `betoshomeimprovements@gmail.com`
happens to match "Betos Home Improvements", and that coincidence is exactly the trap. It was
correct because **Theo supplied it**, not because it was inferable. A work order sent to a guessed
address is a job the crew never hears about.

No app change is needed when one arrives — 555 reads the column live, so writing the row is the
whole task. `update public.crews set contact_email = … where id = …`, one row, verified by name
**and** trade before writing.

### ✅ Invariants that HOLD — do not re-audit without cause

- **`normStage()` whitelist:** 0 of 16 projects carry a stage outside the whitelist. The silent
  everything-becomes-`Lead` corruption this file warns about **is not happening**.
- **`checklist` JSON:** 0 of 16 unparseable.
- **Partner emails already on file:** 0 malformed. Nothing guessed or typo'd has been written.

### ❌ A false positive I nearly filed, recorded so nobody re-files it

The community bid path pre-fills the recipient with `pr.email` — the *project's* address, which on
a community job is the homeowner, i.e. the one party that must never receive the bid. That reads
like a real trap.

**It cannot currently fire: 0 of 10 community jobs have a project email**, so the prompt opens
blank. The code also names the partner and says *"No contact email on file for X — add one under
Partners."* Working as designed. If project emails ever start being filled in on community jobs,
re-check this — it becomes live the moment that count is non-zero.

### Minor: one project has no `stage_since`

**Alton** (Lead, created 17 Jul). One row of 16. Cosmetic unless something sorts on stage age.

*When something ships, strike it here and add a line to `cardinal_build_log.md`.*

### ✅ Shipped 31 July — struck from this list

- **513 — the community outcome form.** §1 below, struck. Four outcomes, no reason field,
  `tarped_at` displayed. Renders as a pane, so the scroll-lock writer count stays at 13.
- **514 — the second clock.** §2 below, struck.
- **515 — the Bill to card had lost its fill and its border.** Pre-existing; `#cr-cc .ct.bill`
  referenced `--goodbg`, a `#cr-ch2` token that does not exist in that scope, so the whole
  `background` declaration was invalid and dropped. Computed `background-image` was **`none`**.
- **516 — the desktop left menu.** Theo's pick: option 2 with option 4's content cap. It
  **mirrors the live `#navMenu`** rather than copying it — nine modules inject into that menu at
  runtime and `cr-menu-script` renames two of its sections — and clicking a row clicks the real
  `.navopt`, so there is one dispatcher. Sections collapsible, state remembered. Desktop ≥1100px.
- **517 — Theo's menu reorganisation.** Sales Floor leads Sell; Objection Coach hidden (it lives
  inside Sales Floor); ABC Supply into Admin; the duplicate Community Partners hidden. Health
  Check was already in Admin. **Open, and Theo's call:** whether ABC Supply should leave the reps'
  Sell section too, and where **Self Check** belongs — it has no section and buckets under *More*.
- **518 — the content cap was far too tight**, my own regression from 516. A flat 1180px left a
  narrow island on a 3440 ultrawide with 1011px dead each side. Now `min(2400px, 92%)`.
- **519 — the dashboard mini calendar removed** (`#calCard`), on Theo's word. Hidden, not deleted:
  `getElementById('calGrid').addEventListener` has no null guard and would throw at boot.

- **487 — list-view document contrast.** NOT the documents list: that surface keeps a white
  `--paper` table and measured 12.63:1, and the prescribed 'tokenise to var(--muted)' would have
  cut it to 6.69:1. The real failure was `#listMount` under `#listView` at >700px — 1.57:1.
  Full reasoning in `cardinal_build_log.md`; the wrong measurement is corrected in `HANDOFF.md`.
- **488 — the updates panel printed raw codes.** 20 CHANGELOG notes carried Python `\U`
  escapes, invalid in JavaScript. New class: `BUG_CLASSES.md` §11.
- **489 — the two unpicked contrast tokens, plus a third the audit missed.**
  `--rbe-empty-fg` 3.45:1→4.54:1 (light) and **4.05:1→4.82:1 (dark — not in the
  original audit, which was scoped to light theme only)**; `--rbe-adm-fg` 4.13:1→4.54:1.
  Dark `--rbe-adm-fg` measured 7.98:1 and was left alone. The dark repair reuses
  `--rbe-mute`'s existing `#9aa0a8` rather than inventing a shade.


> **Everything below was verified against the repo or the database on July 28, not carried
> forward from the previous list.** The prior version of this file listed four items as open
> that were already done — `punch_columns.sql`, the $10,000,000 test client, the repo junk,
> and the profile photos. Repeating a stale to-do list wastes more time than having none.
> **Check before you list.** The Supabase connector answers schema and data questions
> directly; the GitHub API answers "is this file still there."

---

## 0. AI Inspections — the live build queue (31 July 2026)

**486–489 are shipped. The work below is not.**

> **The items below are deliberately NOT numbered, and must not be renumbered again.** They carried build numbers twice this session (487–490, then 489–492) and both were invalidated within hours, because a build number is assigned at **ship time in ship order** — a plan cannot reserve one. Every unplanned fix silently falsified the queue and every cross-reference to it. **Name the work; let the number be whatever it gets when it ships.**

The plan below came out of a 37-agent read-only audit whose findings were each adversarially
refuted. Do not re-audit these surfaces; do re-measure any number before quoting it.

### ⚠ A correction I owe, recorded so nobody repeats it

I told Theo *"a template is a section list plus a trade map — data, not code, so General ships
alongside Roof at no real cost."* **That is false in this app.** There is exactly **one** inspection
report template: `var REPORT_TEMPLATE` (index.html:7508, backtick literal, ~163 KB, closes 7939),
roof-specific, sections 1–10. `GENERAL_TEMPLATE` (8448) is `buildEstimate('REPAIR ESTIMATE', …)` —
a **repair estimate**, not an inspection report. `#gcModal`, the General Checklist, has **zero** file
inputs. Verified, not inferred.

**A General Exterior inspection report is therefore its own build**, comparable in size to the AI sort.

### ✅ SETTLED BY THEO, 31 July — do not re-litigate

**The General Exterior section list, confirmed verbatim.** Author the document to exactly these ten, in this order:

1. Inspection Overview & Property Facts
2. Summary of Findings
3. Exterior Elevations
4. Roof
5. Siding & Trim
6. Windows & Doors
7. Gutters & Drainage
8. Structure & Grounds
9. Recommendations
10. Limitations & Acknowledgment

It mirrors the roof report's shape on purpose — an adjuster recognises it. Theo's own words for why
this template matters: *"We do lots of exterior inspections."* It is also the template his archive
serves best: every trade qualifies, so nothing lands in the set-aside tray.

**The sort route is SIGNED-IN, not admin-only.** The two gates guard different things and are meant to
differ:

| Route | Gate | Why |
|---|---|---|
| `api/companycam.js` (486's picker) | **admin-only** | reaches all 1,437 jobs; can put the wrong client's house in a report that goes out by email and public link |
| the sort route | **signed in** | only ever sees photographs *already in this report*; never touches CompanyCam |

The point of the feature is to take the bottleneck off Theo and Joan, so the crew who shot the roof
can draft the report. RLS already limits Sales to work they created or are assigned. **Cap photos
per sort regardless of the gate** — that is what bounds spend, not the gate.

**Known and accepted:** signed-in means a rep's AI-drafted findings can reach a client without Theo
seeing them first. The confirm-before-send gate covers it — nothing sends until a human clears every
section — but that human is not necessarily Theo. He was told this plainly and chose signed-in.

### The AI sort (roof template only) — the next substantial build

- Copy the skeleton from **`api/organize.js`** — the only route already doing signed-in gate →
  Gemini vision → fence-strip → `JSON.parse` → validate → coerced capped scalars. Take
  `requireSession` **and its caller** (the helper is inert without it).
- **Fix three things while copying, do not carry them forward:** `organize.js:51` reads
  `process.env.GEMINI_API_KEY` **bare** (use `(… || '').trim()`, the majority idiom — a trailing
  newline in the Vercel var gives an opaque Google 400); `organize.js` has **no retry** (take
  `askGemini` from `librarian.js:48–65`, and **move the sleep** — it currently fires after the final
  failure too, burning 1200 ms of billed time); do not copy `librarian.js`'s `sources` sanitiser,
  which is **stranded inside a `catch` and never runs**.
- **⚠ Vocabulary is the biggest correctness risk.** `section` already has an **incompatible** prior
  art: `api/organize.js:8–14` defines sections as numeric **3–8** and **502s** outside that range.
  `severity` exists elsewhere as `crit`/`warn`/`ok`. `trade` overlaps `EST_TYPES` keys
  (index.html:16751). **A fourth vocabulary under a colliding name is the "new mechanism beside an
  existing one" failure.** Pin all three enums in one place and reuse `EST_TYPES` for `trade`.
- **⚠ Section 2 — feed the EXISTING button, do not add a second control.**
  `wireSummaryDraftButton` (17045) already owns that paragraph and mounts with
  `insertAdjacentElement('afterend', …)`. `serializeFrame` (17717) removes it by testing **a single
  node** while stripping the `data-wired` guard unconditionally — **a second `afterend` control
  removes the wrong one and compounds one copy per save/open cycle.** Also `EDITABLE_SELECTOR`
  contains `'[data-cardinal-summary-heading] + p'`, an adjacent-sibling combinator that only matches
  because `lockTemplate` runs before that button mounts; anything inserted afterend earlier silently
  kills contenteditable on that paragraph.
- Cover photo: reuse `.cover-photo` / `wireCoverPhoto` (17110); match its `change` handler exactly.
  The deterministic fallback (earliest wide exterior) is **pure JS**, not a second model call.
- **Unlisted `await` sites, worse than the known ones:** `processAssistPhoto` (17326) and
  `sendAssistNote` (17358) capture `frame.contentDocument` and write post-await with **no**
  revalidation, and `wireReanalyzeButtons`' handler (16985) closes over **elements**, invisible to a
  `contentDocument` grep. Use 486's `_rccGen` token.
- **O(n²):** `placePhotoInSection` re-runs `wirePhotoFrames` + `wireReanalyzeButtons` per photo. For a
  bulk sort, place all then wire once — and call `lockTemplate` once at the end if you do.
- CI note: `.github/workflows/check.yml` has **no `npm ci`**, so its "every API function parses" step
  is **syntax-only** — an undeclared dependency ships permanently dead. Diff every `import` against
  `api/package.json` by hand. Never write `module.exports` even in a comment; check.yml greps text.
- ✅ ✅ **STRUCK — shipped at 490.** `api/sortphotos.js` gates on `requireSession(req,res)` with **no** role check — signed-in, as Theo settled. ⚠️ The doc already records this **51 lines above**, at the line-996 entry. *Original:* **Theo, unresolved:** whether the new route is signed-in or admin-only. Every CompanyCam-touching
  route is admin-only; every "caption the photo I just took" route is merely signed-in. Nothing in
  the repo settles it.
- Harness must assert `placed + setAside == submitted` — **a silent drop is the failure mode** — and
  that every enum the route can emit is in the client whitelist *before* the writer ships
  (`normStage` lesson).

### Shot lists · Save PDF — ⚠ BOTH ARE LARGELY ALREADY BUILT (checked 31 July)

**Prime doctrine, eighth time on this project.** Neither of these is the greenfield build the line
below implies. Read this before starting either.

**Save PDF is DONE.** `#printBtn` is already labelled **`Print / PDF`** and has been since before
the meaningful git history. It injects `#printFix` (`@page size:Letter`, the company footer,
break-inside rules), runs `compactForPrint()`, calls `frame.contentWindow.print()` and then
`restorePrintMarks()`. The browser's own Save-as-PDF destination turns that into a **real vector
PDF** — searchable, not rasterised. `FEATURES.md:141` recorded this the whole time:
*"Download sits beside Print / PDF … Files save as standalone `.html` — not true PDF; a real
`/api/pdf` endpoint is still unbuilt."*

  What is genuinely unbuilt is only the **server-side** `/api/pdf`, and per the note below that is
  justified **only if reports must go out unattended**. That is Theo's call, not an engineering one.
  **Do not build it without asking him.** The client-side story is finished.

**Shot lists mostly exist too.** `QI_SHOTS` (index.html:15297) is a working 12-entry list —
*Ground shots, Down the gutter line, Shingle layers at the edge, Current ventilation, Pipe boots &
penetrations, Chimney flashing, Wall flashing, Step flashing, Valleys, Gutters & downspouts, Decking
from attic, Damage close-ups*. `renderQiChips()` (15495) already renders it as chips that tick with
a ✓ and a running count as photographs are labelled, and clicking one sets the next shot.

  So this item is **not** "build a shot list". It is "surface the existing one somewhere else" —
  most plausibly the report editor, so an inspector can see what is still missing. **Where** is the
  open question and nothing in the repo settles it. Ask Theo before building. When it is built,
  reuse `QI_SHOTS`; do not mint a second list.


- Shot lists: **reuse `QI_SHOTS`, do not add a fifth list.** Duplication is the real risk.
- Save PDF: `downloadReport()` produces **`.html`, not PDF**. Print → Save as PDF already produces a
  proper vector PDF using the template's `@page` rules; any client-side PDF library would be
  **worse** (rasterised, unsearchable). It is a labelled one-tap route through the print path.
  A server-side `/api/pdf` is only justified if reports must go out **unattended** — Theo's call.

---

## 1. SQL

**Nothing pending.** `punch_columns.sql` was run — `punch_items.scheduled_at` (date) and
`punch_items.photos` (jsonb) both exist. Verified by querying `information_schema.columns`.

The Scheduled tab and the five-photo close are live but **untested against real data**:
there are 3 punch items total and none are scheduled. That is a coverage gap, not a bug.

---

## 2. Blocked on someone else (Theo's action, not code)

| Item | State | What unsticks it |
|---|---|---|
| **ABC Supply — wrong host + wrong paths on every data action** | ✅ **RESOLVED, 13 Aug — was never a 401, was never really just "fetch failed" either; the whole `api/abc.js` data layer was pointed at the wrong place.** The chain: 401-stale-note (12 Aug AM) → diagnostic fix shipped so the next failure would be self-explaining → live production retest returned `"Could not reach api.partners.abcsupply.com (ENOTFOUND: …)"` — a DNS failure, not a guess, because the auth host (a *different*, always-correct host) had already proven the credentials and network path were fine. Cross-checked against **9 of ABC's own endpoint reference pages** (`apidocs.abcsupply.com/get-branch/`, `/get-frequent-items/`, `/search-items/`, `/search-item-availability/`, `/price-items/`, `/get-recent-items/`, `/get-order-templates/`, `/search-branches/`, `/get-item-availability/`, `/place-orders/`, `/get-orders/` — 11 pages, all agreeing): the real hosts are **`partners.abcsupply.com`** (production) / **`partners-sb.abcsupply.com`** (sandbox, hyphenated suffix — not `sandbox.partners.*` like every other host in this file). **Separately**, 7 of the file's 9 data paths were also missing their real `/api/{family}/v{n}` prefix (only `frequents`/`recents` happened to already be right) — so a host-only fix would have traded one dead end for a wave of fresh 404s. `priceItems`'s request body was also wrong: real field names are `shipToNumber`/`branchNumber`/`purpose`/`lines[]` (not the invented `items[]`/`unitOfMeasure`/`variation`) — confirmed against ABC's own verbatim example JSON. All fixed, proven with a URL/body-capturing harness across all 9 actions (9/9 green) and negative-controlled against the pre-fix file (9/9 red — same file, same harness). | ✅ **WORKING — a real branch price returned 13 Aug 2026 ($76.00 on 11IWRRGU2).** ABC Supply had never once returned data; it now searches, lists frequent items, and prices. **Working values: Ship-To `2153354-2`, Bill-To `2153354-1`, Branch `106`.** ⚠️ **Both suffixes are the same base account and are NOT interchangeable** — and `2153354-2` is the number that 401'd earlier *as a bill-to*, which made it look invalid. It was in the wrong field. **Before calling an ABC account number wrong, try it in the other box.** Six faults, each hidden behind the one in front: (1) the API host did not exist (`api.partners.abcsupply.com`, ENOTFOUND) — real hosts `partners.abcsupply.com` / `partners-sb.abcsupply.com`; (2) 7 of 9 data paths missing their `/api/{family}/v{n}` prefix; (3) `pageNumber` REQUIRED on frequents/recents though ABC's docs call it optional; (4) `searchItems` sending invented fields (`query`/`page`/`pageSize`) ABC has never accepted, and `priceItems` reading `j.items` when ABC returns `lines[]`/`unitPrice` — the latter would have shown "Branch will price — call them" for every item, **a plausible wrong answer on a money surface**; (5) the error text mangled three ways (double-escaped, cut at 60 chars, in a 120px column) so no refusal could be read; (6) ship-to `0003` an invoice display code, not an identifier. **The through-line: this feature discarded the answer it already had FOUR times** (`e.cause`, `err.detail`, the truncation, the account-field mix-up). Every fix after the first came from reading ABC's own words instead of guessing. | **Nothing outstanding.** `Find my Ship-To` asks ABC for the real ship-to list rather than trusting paperwork — use it per job. Untested only because it needs a real purchase: `placeOrder`/`getOrder`/`templates` paths are pattern-inferred, not doc-verified, and are unreachable from the UI today. ✅ **Phase 2 SHIPPED at build 774** — "+ ABC Supply" is in the estimate editor: search ABC, tap an item, it lands as a line item priced at your branch, with `abc_item` kept on the line as forward wiring for ordering. Reuses the library picker as a second MODE and the same `api()` the Suppliers screen uses. **Remaining: ordering.** `placeOrder`/`getOrder`/`templates` are still pattern-inferred, not doc-verified, unreachable from the UI, and gated behind ABC API Support — see `ABC_ORDER_TESTING_EMAIL.md` (drafted 13 Aug, ✅ **SENT 25 Aug 2026** — do not send it again; the ordering phase now waits on ABC’s reply). `placeOrder`'s body is also still the wrong shape (ABC wants an **array**). |
| **OpenAI quota (429)** | Coach fallback down. Theo says he pays for ChatGPT — **verify that is API credit, not a ChatGPT subscription.** `api/coach.js` calls `api.openai.com/v1/chat/completions` with `OPENAI_API_KEY` and `gpt-4o-mini`; a ChatGPT Plus/Pro plan does **not** fund that. | Check credit at platform.openai.com → Billing, not chatgpt.com |
| **Resend sender domain** | Daily digest 403s | Verify `cardinalrenovations.net` DNS, then swap the from-address in `digest.js` |
| **Gemini key** | **Theo confirmed 31 Jul he is on paid Gemini billing — the "free tier 503s" note was stale and is retired.** Still worth confirming the key exposed in an old session was rotated. | The 503 retry ladder in `librarian.js` stays regardless (cheap insurance), but paid quota is what makes a bulk caption backfill viable at all |
| **GitHub PAT** | Pasted into chat in the 374–388 session | Revoke if not already done: GitHub → Settings → Developer settings → Personal access tokens |
| **Contract PDFs** | Roofing + gutter present but **carry a clause Theo corrected on 12 Aug — see the section at the foot of this file**; siding and windows **missing** | Swap the two revised masters in. Siding/window masters were built July 20 in the *"Digital roofing contract formatting"* chat |
| **Supabase PITR** | Unconfirmed | Confirm point-in-time recovery is on |

### Done — do not re-list
- ~~`punch_columns.sql`~~ — run; both columns verified present
- ~~$10,000,000 test client~~ — deleted; zero rows match
- ~~Repo junk~~ — `api/api/`, `Index.html` (capital I), `cardinal_v389_index.html` and the five stale root docs are all gone
- ~~Profile photos: "everyone shows initials"~~ — 5 of 9 `team_profiles` rows have a photo
- ~~CI false positive~~ — the `module.exports` grep matched a comment in `api/invite.js`; comment reworded, CI green

---

## 3. Verify on device

- Menu → 🩺 **Self Check** on Retail, Claims, Community home, community client
- **Punch (361–368):** home strips per CRM, unified page filters, detail sheet, assignee + priority dropdowns, five-photo close, Scheduled tab
- **Back button (367):** Home → Leads → client → Punch, then Back four times
- **Scroll lock (364):** open a contract, leave via a banner item, confirm the next page scrolls
- **Community (359–364):** desktop width, folds, All bids, bid editing, partner colours
- **CompanyCam panel (479–482), all on the phone, in the installed app:**
  - the ask box is visible while the CompanyCam block is open, and "← Back to chat" returns to it
  - the ⤢ corner button expands a photo **without ticking it**
  - the ✏️ corner button opens the editor **without ticking it**; arrows and circles draw where the
    finger goes at the photo's real resolution
  - **"Save to device" must NOT look like a second "File selected"** — it is a bordered ghost, not
    solid red. This shipped wrong in 481 and was fixed in 482; it is the thing to eyeball first.
  - tick 3 → **⬇ Save to device** → the iOS share sheet offers Photos / Messages / AirDrop, and the
    ticks are **still set** afterwards
  - draw on one → **File it** → it appears in the chosen Library section titled `Marked up — …`
- **483/484, on the phone, in the installed app:**
  - **the library assistant's ask line must clear the home bar.** ⚠️ **No harness can settle this** —
    headless Chromium has no home indicator, so `env(safe-area-inset-bottom)` is 0 there. The gate
    proves the strip is reserved and content clears it, nothing more. **Theo's eyes only.**
  - press **Build index**: `Reading job names…` → `Matched 775 jobs — now the photos…` within
    seconds → the photo counter. Then search a street or "Habitat" **before** the photos finish.

---

## 4. Retail light theme — where it actually stands

**Covered and verified on device:** Estimates · All Leads & Jobs · Home · Photo Activity ·
Team + Production calendars · **client profile (389)** · **standalone Punch page (390)** ·
**Client Directory (391–392)** · **Production board (393)**.

**Audited and needs nothing** — this was four items on the old list and three of them were wrong:
- **Objection Coach** — built light from the start, its own tint palette. Never had a dark version.
- **Team Directory** (`#e8e6e1`) and **Client Portal** (`#f7f2e7`) — light by design.
- **Reports, Photos & Album, Photo album filter, Walkthrough, Cross-links, Pricing catalog, ABC Supply, NACHI content, Adjuster Directory, BPA** — declare no ground of their own, so they inherit `--bg` and already follow the theme. This is what build 386 bought.

**Genuinely remaining:**

| Surface | Ground | Note |
|---|---|---|
| Resource Library | `#14100e` | Own warm-dark palette |
| Self Check | `#12161c` | Diagnostic tool, low traffic |
| Estimate publish | `#3a3a3a` | Small surface |
| Bulk assign | `#4a6fa5` | Blue — likely a header bar, not a ground. Look before assuming. |

**Deliberately staying dark:** the **Photo editor** (`#101010`). You judge photos against it;
a light ground changes how they read. Same reasoning as the calendars.

**Not started and not planned:** Claims and Community. The toggle is retail-scoped.

---

## 5. Build queue (code, unblocked)

0. ~~**Does CompanyCam caption coverage make text search viable?**~~ **ANSWERED, 31 July — no.**
   The full sync indexed 60,485 photos and found **79 with a caption** (0.13%, flat across every
   year). 476 pivoted the search to job names instead: `project_id` is populated on all 60,485
   across 775 jobs, and that is what the photographs actually carry. **Do not re-open the caption
   search.**

   The Gemini follow-on is **still Theo's call and still not built.** 478 ships a **50-photo trial**
   button so he can read real captions before deciding. **Waiting on him to press it and report.**
   Do not run it over all 60,406 without an explicit yes — that sends customers' job photographs to
   a third party.

   **First trial run, 31 July — INVALID, and the reason is recorded so it is not repeated.** 53
   photos captioned, **all one job, one crew, two days** (see `BUG_CLASSES.md` §10). The captions
   were good; the sample was not. 485 rewrote it to one photo from each of 50 different jobs —
   verified at 50 photos / 50 jobs / 5 crews / Apr 2024–Jul 2026. **Waiting on Theo to press it
   again**, then I read the 49 fresh ones back. The old 53 are still in `ai_description` and can be
   binned on his word.

1. **Partner colour as a stored field.** Community partner colours are matched on name, so a new or renamed partner reads neutral. Verified: `partners` has no `color` column. Add one, set it in the Partners directory, have every surface read it. **This is the only open database item.**
2. **Distinguish "no clients" from "couldn't load."** Both render the same empty state, which is why a transient read failure looked like data loss.
3. **Real PDF export.** Downloads are standalone `.html`. A `/api/pdf` endpoint using the ReportLab toolchain that built the contract masters would give true `.pdf`.
4. **Siding + window contract masters** — the moment those PDFs are found; both need the same letter-split as roofing.
5. **ABC ordering** — phases 1 and 2 are done (credentials, response shapes, and "+ ABC Supply" in the estimate editor, build 774). What is left: ✅ **`ABC_ORDER_TESTING_EMAIL.md` was SENT to apisupport@abcsupply.com on 25 Aug 2026**, from `theodorion1986@gmail.com`, verified as a first contact (that mailbox had never corresponded with ABC’s API team). **This step is done — do not send it again.** It is a human loop with unknown latency, so everything below now waits on ABC’s reply, get sandbox order credentials as a **separate** `ABC_SB_*` env pair rather than swapping the working production ones, fix `placeOrder`'s body to the array shape ABC documents, then webhooks to the production board. **Ordering puts materials on a truck — whatever gets built shows the full order back to a human and requires an explicit confirm.**
6. **Old landing markup** — never paints since 309, still in the file for its boot writers. Delete markup and writers together, carefully.
7. **Community activity filter** — enhancement, not a bug.
8. **Backfill for pre-331 typeless clients** — deliberately not done; a backfill has to guess.

---

## 6. Settled — don't re-litigate

- **Header title is 40px, solid `var(--hac)`** (373). Supersedes the fixed-34px decision from 322.
- **Client cards carry no cover photo** (370). `cover_image` still feeds the client profile header.
- **No auto-archive on estimates.** Accepted estimates stay in their lane.
- **No fourth community tab.** Bids / Partners / Clients are the three nouns of the work.
- **Bids are estimates** — same table, same pipeline.
- **One punch pipeline.** `CardinalPunch` is the only data layer.
- **`estimate_line_items` stays unscoped** — it's the shared price book.
- **Retail light theme is tokens, not an override layer.** `--rbe-*` in `:root` + `:root[data-theme="rb-light"]`. **Three sanctioned exceptions**, all where dark and light needed genuinely different designs rather than one design in two palettes: the **calendars** (387), the **brass Client Directory** (391) and the **Production board** (393). In each, the dark original is untouched byte-for-byte.
- **Semantic colours stay fixed in both themes** — milestone circles, status spines, urgency red, CRM badges, the lavender PO, photo captions.
- **The header chrome doesn't follow the page theme.** Dark chrome over a light page is intended.
- **Sales Floor: red is the objection, navy is your answer** (394). Colour carries meaning there; do not spend either colour on decoration.
- **Owens Corning** (Preferred Contractor) throughout, not GAF. TruDefinition Duration is Class 3; FLEX and STORM are Class 4; both qualify for the policy discount. Standard warranty 5-year workmanship; OC upgraded tiers 10-year / transferable.
- **Habitat for Humanity of Greater Dayton** — commercial partnership, logo use permitted.

---

# Added 29 July 2026

*Updated 29 July 2026 — session of 34 merged PRs, `origin/main @ 202e6f3`, app stamped build 427.*

## 1. ~~The outcome form~~ — ✅ SHIPPED at 513, do not re-open

**Built 31 July as builds 513–515**, exactly as `references/outcome_v2.html` draws it.
Full record in `FEATURES.md` §10 and `cardinal_build_log.md`. Everything below is kept
only because the *reasoning* is still worth having; none of it is outstanding.

**The one thing Theo still owes an answer on:** the check-back default. It shipped as
**1 yr preselected**, which is what the approved mock draws — a preselection on a segment
that is always on screen, not a silent default. One token to change if he wants 6 mo or 2 yr.

~~**Status:** design settled with Theo. Nothing shipped.~~ `OnHold` (PR #34) was the
foundation and 513 is what finally writes it.

Reference: `.claude/skills/cardinal-build/references/outcome_v2.html` — **Style 4 layout with Style 2's
flow**, which is what he picked ("4 with 2s flow"). *Path corrected 31 Jul; it previously cited a sandbox-only `/agent/workspace/` path no other program could open.*

### Four outcomes

1. **Awarded**
2. **Still waiting** ← *most common in practice; sits second deliberately*
3. **Referred onward**
4. **Not awarded**

### Decided, and non-negotiable

- **No reason field.** Theo, verbatim: *"Dont need the why we didn't get it."*
  A grant that did not fund this cycle is not a lost sale. PR #33 already
  suppressed the loss-reason prompt for community; do not reintroduce it here.
- **"Still waiting" writes stage `OnHold`** plus a `check_back_at` date.
- **Habitat for Humanity sorts first** in every partner list. They do most of
  Cardinal's community volume and appear in an annual joint TV commercial.

### ⚠ Design correction found during hand-off — read this first

My earlier plan was to add six new fields under `checklist.lead`, including
`awarded_amount`. **That was wrong, and would have created a duplicate.**

The app *already* stores bid amounts in `checklist.bid`:

```js
function bidOf(pr){
  try{
    var ck = window.parseCkAll ? window.parseCkAll(pr) : {};
    return ck.bid || null;
  }catch(e){ return null; }
}
```

`bid.submitted_amount` and `bid.awarded_amount` already exist, and there is
already UI that writes them — `promptForBid(pr, 'awarded')`, wired to
`[data-act="log-awd"]`, with a `.cr-bidstrip` display.

**So the outcome form must read and write `checklist.bid.awarded_amount`, not
invent `checklist.lead.awarded_amount`.** Writing a second field would silently
diverge from the bid strip already on screen.

Revised field list:

| Field | Location | New? |
|---|---|---|
| `awarded_amount` | `checklist.bid` | **exists — reuse** |
| `submitted_amount` | `checklist.bid` | **exists — reuse** |
| `funded_by` | `checklist.lead` | new |
| `referred_to` | `checklist.lead` | new |
| `tarped_at` | `checklist.lead` | new — `tarp` appears **0** times in the codebase today |
| `check_back_at` | `checklist.lead` | new — **0** occurrences today |
| `award_cycle` | `checklist.lead` | new |

Before building, grep for each remaining name. I found one collision by
checking; there may be others.

### Still open

**The check-back default — ✅ ANSWERED 31 July: 1 year.** Asked and confirmed by
Theo. The design's own chips are `3 mo · 6 mo · 1 yr · 2 yr`, so **1 yr is the
pre-selected chip** and the other three stay available per bid. Nothing else in
this item is open.

### Ground truth gathered 31 July — start here, do not re-derive it

**The reference is a visual comp, not markup.** `references/outcome_v2.html` is
204 KB and contains exactly three `data-` attributes, all theming. It shows the
agreed look; it cannot be lifted. This is a build-from-design, and estimating it
as "wire up the mockup" will be wrong.

**The four flows, read off the comp's own labels:**

| Outcome | Fields | Button |
|---|---|---|
| Awarded | Approved amount · Decided · Funded by | *Save outcome* |
| Still waiting | Check back in (chips) · Or pick a date · Grant / cycle we are waiting on | *Park it* |
| Referred onward | Now with · Handed on | *Save outcome* |
| Not awarded | Closed on | *Close it out* |

The comp annotates the waiting panel **"Stops the nagging."** — that is the
−713-day problem in three words, and the reason this item and §2 ship together.

**The functions to reuse, located and read:**

| What | Where | Note |
|---|---|---|
| `lead(pr)` | 43303 | `return (ck(pr) || {}).lead || {};` |
| `bidOf(pr)` | 29355 | reads `checklist.bid` |
| `saveBid(pr, next)` | 29361 | **`async`** — writes via `window.patchProjectCk(pr, {bid:b})`, re-renders the strip, audit-logs |
| `promptForBid(pr, kind)` | 29467 | already writes `submitted_amount` / `awarded_amount` |
| `wireActs(host, pr)` | ~29464 | wires `log-sub` / `log-awd` on `.cr-bidstrip` |
| `chDueBand(pr)` | 43419 | **216 chars** — the whole §2 fix is inside it and the Due column |

**There is no `saveLead`.** The five new `checklist.lead` fields need one, and it
should mirror `saveBid` exactly — same `patchProjectCk` path, same null-stripping,
same audit line — rather than a second write mechanism.

**Beware:** `saveBid` is declared `async function`. Any brace-matched extraction
that searches for `function saveBid(` starts *after* `async ` and yields code
whose `await` is a syntax error. That bit me twice today on other functions.

---

## 2. ~~The second clock~~ — ✅ SHIPPED at 514

`chDueIso(pr)` in `cr-ch2-script` returns `check_back_at` when the stage is `OnHold` and
one is set, else `bid_due_at`, and it feeds `chDueBand`, the deadline sort, the undated
partition and the All-bids Due column — plus the client page facts strip, which relabels
**Due → Check back**. Scoped, not blanket-replaced: the two `bid_due_at` reads inside
`st === 'Lead'` branches are untouched, because a Lead is never `OnHold`.

The reasoning below is kept for the record.

### ~~The second clock — a real bug, currently visible~~

This is the highest-value unshipped fix, and it is a consequence of item 1.

The Community hub has **one** notion of "when is this due", and it needs two.

```js
function chDueBand(pr){
  var dd = days(lead(pr).bid_due_at);      // <-- always the bid deadline
  if(dd == null) return 'No deadline set';
  if(dd < 0) return 'Overdue';
  ...
}
```

`bid_due_at` is *when our bid was due to the partner*. Once a bid is submitted
and waiting on a grant, that date is meaningless — and it goes on aging.

**A 2024 bid currently reads −713 days and sorts as most-urgent forever.**

The fix: when `normStage(pr.stage) === 'OnHold'`, both `chDueBand` and the Due
column must read **`check_back_at`**, not `bid_due_at`. `bid_due_at` is
referenced 8 times in the hub block — scope the change, do not blanket-replace.

This is coupled to item 1 because `check_back_at` does not exist until the
outcome form writes it. Ship them together, outcome form first.

---

## 3. Open bugs

### 3a. Buttons need 4–6 taps — *needs Theo, then a fix*

Theo reported this on his phone. My lead suspect is `#cr-pae-actionbar`: it is
`z-index: 9995`, `pointer-events: auto`, and `display: none` when inactive —
but the changelog for build 214 says this same bar previously blocked taps.

**What is needed:** ask Theo whether the dead taps are near the **top** or the
**bottom** of the screen. That single answer separates the action bar from a
sticky header overlay and saves a lot of guessing. Do not fix this blind.

### 3b. Unreadable text — ✅ RESOLVED BY INTERVENING WORK (re-measured 31 July)

**Both photographed failures now pass. Do not re-fix them.** Re-measured with
`scripts/contrast.py` against the values actually in the file:

| Was reported | Measured now |
|---|---:|
| mint *"Waiting on a decision"* body text — `--ccm-mute` `#9aa39e` on `--ccm-card` `#161918` | **6.83:1** |
| the same card in its `.now` state — `#d8cfc9` on `--ccm-nowfill` fallback `#321a1c` | **10.53:1** |
| `#galTitle` on the "navy" photo-album header | **16.77–17.08:1** |

**There is no navy.** Nothing paints a background behind `#galleryView` except
`body.claim-insurance #galleryView{background:var(--ct-bg,#FAF8F7)}` — near-white. PRs #35/#36
removed the whole-CRM navy backdrop on 29 July, and the `--ccm-*` palette rebuild (#27) replaced the
mint. The item was written before both.

*The tools it names, `contrast_sweep.js` and `resolve_tokens.js`, do not exist in this repo. Use
`scripts/contrast.py` for a pair and `scripts/token_pairs.py` for a sweep.*

---

### 3b-ORIGINAL (kept for provenance only — the finding above supersedes it)

Two contrast failures Theo photographed:

- The mint **"Waiting on a decision"** body text.
- **`#galTitle`** on the navy photo-album header.

Both are single-value fixes. `contrast_sweep.js` and `resolve_tokens.js` will
give you the resolved values and the WCAG ratios. Low risk, visible payoff.

### 3c. 221 blue rules still reachable from Community

Down from 250. The remainder breaks into three groups:

| Group | Count | Recommendation |
|---|---|---|
| Screens unreachable from Community in practice | ~95 | **Leave.** No user impact. |
| The global style block | 69 | **Leave for now.** Ungated — editing them changes Retail and Insurance too. Needs Theo's sign-off on a whole-app change. |
| The punch board, mostly cool greys | 28 | **Judgement call.** Cool greys read as "blue" in a screenshot but are near-neutral in place. Show Theo before touching. |

The blocker is real: those 69 are not community-scoped, so "fix the blue"
becomes "restyle the entire app". That is a product decision, not a patch.

---

## 4. The CDN cache residue — decision needed

The `photos` bucket is private and the origin enforces it, but Cloudflare had
already cached objects with `max-age=31536000` (one year). 11 of 26 sampled
objects still served anonymously *after* the flip.

Three options:

| Option | Effect | Cost |
|---|---|---|
| **Purge the Cloudflare cache** | Immediate; residue gone | Needs Cloudflare access — Theo has it, I do not |
| **Re-path the objects** | New keys, so cached URLs die | Touches 220 storage rows + 235 `projectphotos` rows; needs a migration |
| **Wait it out** | Residue expires within a year | Free; leaves old URLs live until then |

**My recommendation: purge.** It is one action, it is complete, and it costs
nothing. Re-pathing is a lot of risk for the same outcome.

Worth stating plainly: the exposure is limited to URLs someone already had.
Nothing new is being exposed. It is not urgent — but it is not closed either,
and it should not be quietly forgotten.

---

## 5. Blocked on Theo

| Item | What is needed | Why blocked |
|---|---|---|
| Partner bid emails | Real bid-submission addresses for **Habitat (937-965-7684)** and **Kitty Hawk (937-236-5447)** | I will not write an unverified address into `community_partners`. A bid sent to a guessed address is a lost bid. |
| The `photos_upload` policy | Keep, or drop and replace? | His commits are authored `theodorion1986@gmail.com`. Dropping the policy could silently kill *his own* photo upload if he signs in with that Gmail identity. Needs his call. |
| CDN residue | Purge / re-path / wait | §4 — needs Cloudflare access |
| Check-back default | 3mo / 6mo / 1yr / 2yr | §1 — I guessed 1 year |
| Tap dead-zone | Top or bottom of screen? | §3a |
| The 69 global blue rules | Restyle app-wide, or leave? | §3c — affects all three CRMs |

---

## 6. Structural work I would recommend

Not bugs. These are the things that would stop *classes* of bug. Detail in
`BUG_CLASSES.md`.

### 6a. A scroll-lock reconciler — **my top recommendation**

13 modules write one global `document.body.style.overflow`. All 15 lock sites
are balanced against 19 releases, so no module is *missing* a release — the
failure mode is an early return or a throw between lock and release, which is
exactly what PR #37 fixed.

This class has now bitten three times: build 214, PR #17, and PR #37.

A watchdog that clears the lock when no overlay is actually open would end it.
Its overlay list must be **derived from the code**, not guessed — that is why I
did not bolt it onto #37. Budget an hour for the derivation, twenty minutes for
the watchdog.

### 6b. `.maybeSingle()` where zero rows is legal

**Re-measured at 467: 43 `.single()`, and `.maybeSingle()` is now 4 — it was 0 when this was
written, so the migration has started.** `.single()` **throws** on zero rows.
Each one needs classifying: "must exist" stays, "may not exist yet" becomes
`.maybeSingle()`. Do it in small batches, not one sweep.

### 6c. Error handling on async click handlers

36 `async` onclick handlers; most have no `catch`. A rejected promise in a
click handler fails silently — the user taps, nothing happens, no error.
`ccDoAct` (PR #32) is the pattern to copy: `try` / `catch` / `alert` with the
real message.

### 6d. Consider whether this stays one file

**Re-measured at 467: 2.64 MB (2,772,640 bytes), 100 inline script blocks, 101 style
blocks**, no namespacing. Every count in this hand-off needed a lexer to be trustworthy.
That is a symptom, and it has not improved.

I am **not** recommending a rewrite — it works, it ships, and the patch
discipline holds it together. But if the app keeps growing, splitting the
community CRM into its own file with scoped CSS would remove most of the
verification burden. Worth discussing before the next large feature, not
during it.

---

# Added 31 July 2026 — builds 452–467

*`origin/main @ cc0b591`. Everything below was checked against the repo or the database in
this session, not carried forward.*

## Closed since this list was written — do not re-list

- ~~**Repo junk still shipping publicly**~~ — `api/index.html` (2.23 MB, a whole copy of the
  app at build 329), `IMG_1510.png` and `TeamCalendar_Watermark_Mock.png` are **deleted**.
  4.1 MB off the deployment; the tree went 12.56 MB → 8.42 MB. Root `librarian.js` went at 453.
  **`cardinal-landing.PNG` stays** — it looks like a duplicate but it is the live `onerror`
  fallback on the landing page.
- ~~**The library light/dark button**~~ — was one-way since it was added; fixed at 464. It also
  persists now, which it never did.
- ~~**Filed photographs were unusable**~~ — an uploaded image rendered as a row with a camera
  emoji that opened in a new browser tab. Fixed at 467: signed thumbnail in the list, opens in
  the existing zoom viewer.
- ~~**The doc set stopped at 427**~~ — `START_HERE.md`, `OPEN_ITEMS.md` and `FEATURES.md` are
  current at 467; `cardinal_build_log.md` has an entry per build for 452–467; `CLAUDE.md`
  covers 428–451.

## Still open, and honest about it

| Item | State | What unsticks it |
|---|---|---|
| **Library photographs** | The upload path works end to end as of 467, and the `library` bucket is empty | **Source material.** Every photo in the system was taken 21–30 July and **none are captioned** — there are no winter photographs to find. Send them through Ask / File, or import from CompanyCam |
| **CompanyCam import** | `COMPANYCAM_API_KEY` is set in Vercel. **The spec question is settled** — `references/companycam-api.md` now carries the read v1 `Photos → index` reference: `GET app.companycam.com/public_api/v1/photos`, cursor pagination, and server-side `start_date` / `end_date` / `tag_ids` / `project_ids` / `user_ids` filters | **Unblocked.** The probe ran against the live account 31 Jul: `description` **exists** (the caption problem is solved), the key works on **both** v1 and v2 so scopes are fine, and `uris` has **six** types — the three `_annotation` renditions are the crew's marked-up copies and are the better library figure. Left: `include`, the date format, `include_total` — **none block an importer**, dates can be filtered client-side on `captured_at`. No rate-limit headers come back, so be polite by construction |
| **`project_photos` has zero captions** | 236 rows, 216 with `storage_path`, **one** section | Independent of the library and getting worse weekly. `api/caption.js` already exists — worth checking whether it can be pointed at the backlog |
| **The librarian's diagram grammar, in the wild** | Shipped at 466 and gated hard, but the gates cannot prove the **model** uses it well — that needs a live API call the harness blocks | Ask it something with a natural shape after deploy and see whether the diagram matches the prose. A miss is a prompt line, not code |
| **The reported toggle "freeze"** | 464 fixed a one-way toggle. Blocking time measured at **30 ms**, and 95–183 ms at 6× CPU — no freeze reproduced | If it still stalls on the phone it is a **different bug**; needs to know which control and where |
| **Two theme controls on one screen** | A library page shows both the floating ◐ (library skin) and the 🌙 (whole app) | Theo's call which appears where. Flagged, not changed |

## Doc correction

`CLAUDE.md` said zero `project_photos` rows carry `path` or `storage_path`, and the lesson
built on it ("a photo-signing change shipped completely inert"). That was true when written —
**216 of 236 rows now have `storage_path`.** The lesson about testing against real data shapes
still stands; the specific number does not.

---

## 🟡 Light-theme contrast — 2 real failures, 2 false positives, computed 31 July

Arithmetic, not judgment (`scripts/contrast.py`). **Not shipped** — colour changes get previewed
and picked by Theo, per CLAUDE.md. These are ready to apply on a word.

### Real: 2 pairs below the 4.5:1 body-text floor

| Where | Now | Ratio | Proposed | Then |
|---|---|---:|---|---:|
| `.ljempty` / `.cre-empty` — empty-state text, `font:600 12.5px` | `#8a8a8a` on `#ffffff` | **3.45** | `#767676` | 4.54 |
| `.ljadm` — admin badge pill | `#8a6a4a` on `#f2e9e2` | **4.13** | `#826446` | 4.54 |

Both are the **minimum** darkening that clears the floor — same hue, 14% and 5% down. Neither is a
semantic colour, so neither is protected by the "semantic colours stay fixed" rule.

### False positives — do NOT re-file these

- **`--rbe-checkfg` on `--rbe-okbg` = 1.11.** Not a pair. `checkfg` sits on `--rbe-acc`
  (`.ljico .bdg`) and as a `::before` glyph on `.cbx:checked`; `--rbe-okbg` is paired with
  `--rbe-money`. Pairing them was **my** invention, not the app's.
- **Milestone pill, `#ffffff` on `#9a9a9a` = 2.81.** `--rbe-mpill-bg` is only the *fallback*:
  the rule is `background:var(--slc, var(--rbe-mpill-bg))`, and `--slc` is the per-stage colour set
  at runtime. **The real ground is not knowable statically** — this one needs the rendered page.

### Method notes, so this is repeatable

**Pair by name, never by cartesian product.** A first pass compared all 13 ink tokens against all
17 grounds and produced **8** "failures"; matching tokens to the grounds they actually meet cut
that to **4**, and reading the carrying selectors cut it to **2**.

**There are FOUR `rb-light` token blocks** (13 + 13 + 40 + 24 = 92 declarations across 115 selector
groups). A regex that stops at the first one finds a single token and concludes the light theme
barely exists. Build the effective map in **document order, last wins**. Same trap as `.acthead`.

**A recon regex of the form `([^\n{}]+)\{([^{}]*TOKEN[^{}]*)\}` will hang the file.** It did — 120s
timeout, exactly the backtracking CLAUDE.md warns about. Walk back from each hit to the nearest
`{` with `rfind` and bound the window instead.

---

## Settled decisions, imported from the Hyperagent session (filed 31 July)

Theo pulled these from the tool that built 428–467. **Every repo-checkable claim was
re-verified here before filing** — `OnHold` writers **0**, `check_back_at` / `funded_by` /
`referred_to` / `award_cycle` **0**, `tarped_at` **0**, `origin/main @ ec685f0`. All accurate.

### Do not revisit

- **Skill layout is canonical as of PR #41.** `retail_b` lives under `references/`; the root
  copies and the 1-byte `references/retail_b/spec.md` stub are deleted. **Do not restore them**,
  and mind the case trap — `spec.md` and `SPEC.md` are different files to git but collide on a
  case-insensitive disk.
- **Any bundled `app_map.md` saying "Community (Slate & Clay, light)" or calling `crm()` the
  single source of truth is stale.** Take the repo copy. Community is green `--ccm-*`, dark by
  default; `crmNow` recomputes and `skin()` publishes to `body.dataset.crm` — the attribute is the
  only thing CSS can gate on.

### Known broken / half-finished — deltas only

- ~~**The outcome form is still unbuilt end to end**, verified at 472.~~ **Built at 513–515,
  31 July.** All six field names were still at 0 occurrences when the build started, which is
  what let it use them without collision. `chDueBand` now reads `chDueIso()`.

  **⚠ The −713-day bid no longer exists.** Checked against the live database 31 Jul: of 10
  community jobs carrying the `bid_due_at` key, **9 hold an empty string** and exactly one holds a
  real date — `Jacob — Habitat for Humanity`, `2026-07-27`, **−4 days**. Sorting that most-urgent
  is correct behaviour, not the bug.

  **And the empty-string case degrades cleanly**, which the filed note did not say: `days('')`
  short-circuits on `if(!iso) return null`, so `chDueBand` returns **"No deadline set"** and those
  nine group there rather than landing in a bogus band. Nothing to fix in the banding today.

  Do not go hunting the −713 record. Either it was edited away since 29 July or it was never in
  this database. The *shape* of the concern — one field driving urgency, with no
  `check_back_at` — is still real and still waits on the outcome form.
- **§3c's blue count has drifted: 221 → 226 reachable, 5 gated.** New builds add blue faster than
  triage removes it. The three triage groups stand; only the number moved.
- ✅ **Broken pointer FIXED.** `/agent/workspace/outcome_v2.html` was a sandbox-only path no other
  program could open. The real design — **style 4 with style 2's flow, the one Theo picked** — now
  lives at **`.claude/skills/cardinal-build/references/outcome_v2.html`** (202 KB, 2,094 lines).
  That directory is in `.vercelignore`, so it is reachable by any program reading the repo and is
  **not** served publicly. Scanned before filing: no fetch/XHR/WebSocket, no Supabase reference, no
  key-shaped strings, one external host (Google Fonts).
- CHANGELOG's 343–427 gap was never backfilled. **Cosmetic only** since `data-cr-footer` landed —
  every stuck watermark is ≥406 so nobody is shown them. Backfill is optional, not owed.
- External, measured 29 Jul, decisions still pending: Cloudflare edge held **11 of 26** sampled
  photo objects after the bucket flip (max-age one year — purge / re-path / wait is Theo's call);
  the `photos_upload` policy question; real bid emails for **Habitat and Kitty Hawk** (the latter
  matches tonight's own database audit).

---

## 🟡 Palette accessibility — 104 declared pairs below 4.5:1 (measured, NOT shipped)

New tool: `scripts/token_pairs.py`. It scores only pairs **the app itself declares** — rules setting
a colour *and* a background in the same block — so there is no ancestry to guess at. That is the
case where static analysis is trustworthy; it is exactly what the 27-candidate sweep after 487 got
wrong by inferring grounds. `@media print` is excluded and `-webkit-text-fill-color` rules are
skipped rather than scored.

```bash
python3 .claude/skills/cardinal-build/scripts/token_pairs.py index.html
python3 .claude/skills/cardinal-build/scripts/token_pairs.py index.html --floor 3.0
```

**104 pairs below 4.5:1 · 27 below even the 3.0 large-text floor.**

### This is a palette decision, not a bug list — do not "fix" it in one build

The failures cluster, and the clusters are deliberate design:

| Cluster | Measured | Where |
|---|---:|---|
| Amber status pills, `#C87A00` on `#FBEFDA` | **2.96:1** | 7+ sites: claims, adjusters, kind-pills, pricing |
| Green status pills, `#2E7D32` on `#E7F2E7` | **4.46:1** | 7 sites: approved / completed / won / rcv |
| Faint grey empty states on near-white | 1.77–2.96:1 | `.clirow .mini`, `.wsempty`, `.cr-wo-empty`, `.cr-pal-hint`, `#navMenu .navsec`, `.axbtn.ghost` |
| Red action-bar button label, `#1a1a1a` on `#C4180F` | **2.89:1** | `.cr-cm-actionbar button` |
| Header search text, `#c8202e` on `#241c1a` | **2.95:1** | `#cr-hd2-bar #headSearch` |
| White on light teal, `#fff` on `#5eead4` | **1.48:1** | `#cr-sol .ft .go` |

The pill families are **semantic colours** — amber means awaiting, green means approved. CLAUDE.md
protects those, and the 31 July note is explicit that the two tokens fixed at 489 were fair game
*because* they were not semantic. Darkening amber and green across fourteen pills changes the
product's status vocabulary and is Theo's call, not an engineering one.

The **green cluster at 4.46:1 is 0.04 below the floor** — a rounding-level miss. Changing fourteen
pills for that is almost certainly not worth it.

**The empty-state cluster is the strongest candidate for a real build.** It is the same family as
489's `--rbe-empty-fg` (3.45→4.54) — faint grey on near-white, no semantic meaning, minimum
darkening fixes it. Six surfaces, all low-risk.

### Known false positives — do not re-file

- **`.cr-pp-item .box` at 1.00:1** (`#fff` on `#fff`). A checkbox: the colour is for a `::before`
  glyph that only renders when checked, at which point the background changes. Same shape as the
  `--rbe-checkfg` false positive already recorded above.
- **`body` at 1.15:1** (`#1b1b1b` on `#09090C`). The base declaration; every real surface overrides
  it. Not a rendered pairing.

**Nothing here is shipped.** The measurement is done and repeatable, so a future session should
**pick a cluster with Theo and ship that one**, not attempt the list.

---

## Left open by build 522 (the card raise)

1. ~~**The dark ground barely shows the raise.**~~ **He asked again — partly closed at build 546.**
   The note said "if he asks again, the audit is already done", and he did: leads went navy, the
   estimate page and `#reportsView` pipe cards went obsidian, and all three now carry a real hover
   lift. **Giving those cards a darker ground is exactly the move this item described**, taken with
   his instruction rather than unilaterally.
   ⚠️ **RETRACTED, 22 Aug — I published a contrast failure here that DOES NOT EXIST.** The sweep
   reported `.dbic1` and `.dbrow .dbgo` at **1.52:1 / 1.73:1**, quoting ink `#23507e` on a
   `#2e333b`/`#262a31` gradient. **None of those four values is in the file.** Measured on the tree:

   | skin | ink | ground | worst |
   |---|---|---|---:|
   | `docket` | `#7E1410` | `#FFFFFF` → `#FAF8F7` | **9.94 ✅** |
   | `siren` | `#FF3B30` | `#16161B` → `#09090C` | **5.08 ✅** |

   Both pass comfortably. ⚠️ **And the premise was wrong in a second way:** `--ct-red-deep`,
   `--ct-surface` and `--ct-bg` are **not** light/dark theme tokens at all — they are scoped by
   `[data-rltheme="docket"]` and `[data-rltheme="siren"]`, two named *skins*, each pairing its own ink
   with its own ground. **There is nothing to fix here.**

   *How it got published:* I confirmed the two selectors existed and used `var(--ct-red-deep)`, then
   computed ratios **from the hex values the agent supplied** without checking those against the token
   declarations. The arithmetic was right and the inputs were invented. **Verifying that a selector
   exists is not verifying the colour it resolves to.**

   *Original note, kept because its selector list is still the right list:* The client profile was NOT moved and the audit below still
   stands, unchanged: `.ackv div` and `.acxtrs label` carry `#2b2b2b`, `.axnote` `#5c4a42`,
   `.dbrow .dbgo` and `.dbic1` `#23507e` — every one needs a token before that ground moves, or the
   profile goes unreadable. 546 did not touch them.
   The original text, for the record: *on retail's near-black page the `rgba(0,0,0,.8)` drop shadow
   has nothing to cast onto, so the `#d9d9d9` bottom lip carries it alone. A white card cannot lift
   on black the way the dark home card does — home's lift is a light top edge over a darker body.*
2. **Radii were left alone.** Home is 12px; several raised cards are 6–10px. The blocker is `.acxsec`,
   whose first child `.acxhead` is a light strip with square corners — round the parent alone and the
   header pokes out. A radius pass means rounding both, per card. Small, separate build.
3. **Sales Floor and the production board got the raise** (`.cr-sf-today`, `.cr-sf-block`,
   `.cr-pb-job`), geometry only. They are deliberate designs with their own colour semantics and the
   Production board is one of the three sanctioned light-theme exceptions — **if Theo dislikes the
   lift there, remove those three selectors rather than retuning the block.**

---

## ✅ Bundle splitting / Vite — audited 8 Aug 2026, DO NOT RE-REPORT

An outside audit (Kimi, commissioned by Theo) recommended extracting the app into
ES modules and moving onto Vite — *"~1 week of focused work"*. Every claim was
checked against `index.html` at `ec4a406` (build 624). **The architecture
observation is fair; the numbers are not, and the headline recommendation is
aimed at the wrong target by roughly 8×.**

Recorded here because this is an obvious thing for any reader — human or model —
to propose on sight of a 3.6 MB single file, and re-deriving it costs a session.

### What was actually measured

| the audit said | measured |
|---|---|
| "~59,000 lines of inline JavaScript" | **46,009** of 60,934 total (10,063 CSS, 4,862 markup) |
| "3.5MB downloaded", "8–12s on 3G" | raw **3,645,784 B**, but **brotli q11 = 751,440 B (734 KB)**, gzip -9 = 1,097,486 B. Vercel compresses at the edge, so the wire cost is **~5× smaller than the premise** |
| Vite "splits heavy third-party deps into separate files"; "vendor chunks cache for months" | supabase-js, chart.js and papaparse are **already three separate CDN files** and already cache independently. **0** `type=module` scripts. That benefit exists today |
| Showroom is "~400KB"; extracting it alone "cuts your bundle by 30–40%" | `cr-show-script` + `cr-show-styles` = **162,539 B = 4.5%** of the file |
| "crews reverting to paper" | invented — nothing in the repo supports it |
| "8–12s → <1s on LTE" | swaps 3G for LTE mid-sentence |

⚠️ **Quote the raw and the compressed figure together, always.** Splitting them is
how the audit got to a 5× error. Same family as this repo's standing
bytes-vs-characters trap — `len(s)` on the decoded string gives **3,622,512**
where `wc -c` gives **3,645,784**, and a mid-analysis slip between the two happened
during this very audit.

### What the audit missed, and it inverts its own plan

The largest object in the file is a **single unnamed `<script>` of 976,673 bytes —
26.8% of the file on its own**, six times the Showcase it says to extract first.

```
  1. (no id, script)   976,673   26.8%      <- the shell: auth, router, nav, CRM core
  2. (no id, style)    198,709    5.5%
  3. cr-show-script    112,097    3.1%      <- the audit's "extract this first"
  4. cr-cl-script      102,940    2.8%         (the CHANGELOG)
  5. cr-lib-script      76,520    2.1%
  6. cr-estimates-script 47,530   1.3%
  top 12 blocks = 48.2%  ·  the other 212 = 40.5%  ·  median block 4,642 B
```

**That 977 KB block is the part that cannot be lazy-loaded.** Extract every named
module on the audit's list and the biggest single thing in the file still ships on
first paint. Nobody has audited what is inside it — if load time ever becomes a
real problem, that is the honest first question, not a bundler.

### The real finding, which the audit never mentions

**All three CDN scripts are render-blocking** — no `defer`, no `async` — and two
sit in `<head>`. Chart.js blocks parsing on every load of every screen and is
only needed for dashboard charts.

That is the change with a good ratio: no build step, no new files, existing gates
still apply. **It is not free** — deferring changes execution order, so every
parse-time reference to `supabase`, `Chart` and `Papa` must be found first and
sign-in verified in a real browser. Half a day, done properly. **Not yet done —
gated on a measurement (below).**

### The one thing the audit got right, and it deserves credit

**Shared mutable state, rated HIGH, with "fix this before you split anything."**
Verified: `window.currentProject` ×72, `window.currentUser` ×86,
`window.currentPhotos` ×19, and **379 bare `currentProject` references**. That is
genuine coupling and the audit found it honestly.

**Recorded as real but deliberately not chased.** It is not causing a known bug,
and refactoring 379 call sites on spec is churn on an app the crew uses daily.
If a state bug ever appears, start here.

### ✅ CLOSED — Theo, 8 Aug 2026: *"It does not feel slow."*

**That is the end of it.** The owner uses this app daily, on the phone and on an
ultrawide desktop, and reports no load problem. No further work was done and none
is planned. The audit was solving a hypothetical.

**The CDN-defer change was NOT made**, deliberately. It is a real inefficiency and
it stays available (see above) — but shipping a change to a working app that
nobody is complaining about is how regressions get introduced for nothing. **If
load time ever becomes an actual complaint, start there**, not with a bundler.

⚠️ **Do not reopen this on the strength of the file size alone.** That is exactly
what the audit did. A 3.6 MB single file *looks* alarming, compresses to ~750 KB,
and is reported as fine by the person using it.

**The sandbox cannot measure load time — confirmed twice.** The agent proxy
returns **403 to CONNECT** for `app.cardinalroster.com` *and* for the
`*.vercel.app` preview domain. Do not burn a turn retrying; ask Theo or read it
off a desktop browser's Network tab, where the transferred figure is the same.

**Do not open the Vite rewrite.** It trades a working gate ladder
(`check_build.py` parses 106 inline blocks individually, `patch_lib.py` does
exact-match surgery on one artifact, every harness slices blocks out by `id`,
CI asserts the VAPID key in hand-written `sw.js` matches `api/notify.js`) for a
re-architecture estimated at a week by an auditor who thought the file was 59,000
lines of JavaScript.
## 📌 A separate `showroom.html` — a REAL project, deliberately deferred

Theo, 8 Aug 2026, choosing between host-gating the CRM chrome and true
separation: **"Option 1 but remember option 3."** Build 625 shipped Option 1.
This is Option 3, recorded at his explicit request so it is not lost or
re-litigated from scratch.

**The idea:** a `showroom.html` carrying only the presentation surfaces — the
Vision hub, the Showcase, OC Colors, the Studio link — with **no CRM code at
all**. `showroom.cardinalroster.com` would serve it instead of `index.html`.

### For

- A customer-facing tablet **never downloads CRM code**. Build 625 hides the
  chrome; it does not remove it. There is no errant tap that shows a claim or a
  crew payment because the screens are not there.
- **Independent deploys.** A CRM change cannot break the sales tool the night
  before a pitch.
- **Here the load argument is genuinely strong** — and this is the distinction
  worth holding onto. The bundle-splitting audit (see above) was rejected because
  it targeted the 4.5% Showcase. This targets the **977 KB shell**, which is the
  actual mass and the part no lazy-load can defer.
- It matches what Theo already said about Studio: *"if it was back to the
  beginning this would have been a completely separate app."*

### Against — and this is what makes it days, not hours

- **The Showcase (162 KB) and Colors (~60 KB) live inside `index.html`.** Two
  routes, both costly:
  - **Duplicate them** → two copies, every future fix landing twice. This
    violates "one pipeline per concept", the rule that exists *because* four
    features on this project were built twice and lost. **Do not take this
    route.**
  - **Extract them to shared files** → breaks `check_build.py` (it parses inline
    blocks individually), `patch_lib.py`'s exact-match surgery, and every harness
    that slices a module out by `id`. The gate ladder would need rebuilding first.
- Auth gets a third implementation (`index.html`, `studio.html`, and this).
- `sw.js`, push/VAPID and the offline shell all assume one document; CI asserts
  the VAPID key matches `api/notify.js`.

**Why Studio was cheap and this is not:** Studio touches two tables and its
writes are trivial — an `archived_at` flag (614) and the tray upsert/delete
(627). The showroom needs the two biggest presentation modules in the file.

*(Corrected 8 Aug: this said Studio "never writes". It did, at 614, and does
more at 627. The **argument** is unaffected — Studio was cheap because its
surface is small, not because it was read-only — but the claim was false and had
propagated to four places in the doc set. See `CLAUDE.md` → Cardinal Studio.)*

### The trigger to actually do it

Not "someday" — one of these two concrete things:

1. **Wanting independent deploys**, so CRM work cannot destabilise a sales tool.
2. **Putting the tablet in the hands of someone who must never see money
   screens** — a rep, a subcontractor, a hire. Build 625's gate is a curtain,
   not a wall.

Until one of those is true, 625 gives Theo the thing he described — sign in at
showroom, get a presentation front door — at a fraction of the cost.

---

## What build 627 left open — observations, not work

*8 Aug 2026. Both are known and deliberate as shipped. Neither is a bug report;
both are here so the next session does not "discover" them and fix the wrong one.*

### 1. Nothing removes a photo from the tray once its pair is built

Verified: there is **no `studio_tray` delete anywhere in `index.html`** — the
Showcase reads the tray and never prunes it. The only way out is to untick the
photo in Studio.

**This may well be correct.** A tray is a shortlist, and a shortlist that empties
itself as you use it cannot be reviewed, re-cut, or used to build a second pair
from the same site. The alternative — auto-remove on `promoteToPair` — is one
line and would be a silent behaviour change to a feature Theo has not used yet.

⚠️ **Do not pick for him.** If the tray gets unwieldy in practice he will say so,
and the answer might be "clear tray" button, auto-remove, or an "already used"
badge — three different features. Ask before building any of them.

### 2. The tray reads `.limit(300)` with no paging

`loadTrayPhotos()` takes the 300 most recent by `added_at`. At the tray's intended
size — a shortlist of pairs worth showing a customer — this is not reachable.
It is recorded because a limit with no UI to say it was hit is exactly the "silent
cap" this project has been bitten by before: **if it ever does truncate, say so on
screen rather than quietly showing 300.**

### ✅ CLOSED at 628 — the third bucket exists now

~~There is no bucket for "damage vs how we do it".~~ **Shipped at 628.** The tick
in Studio cycles off → Showcase → Hall of Fame, `studio_tray.bucket` records
which, and the Hall of Fame gained the picker it never had. Do not re-file it.

**Still open from 627, and item 1 is still Theo's call — 628 did NOT decide it:**

### Not open, so nobody re-files them

- **The tray badge paints.** `#stuTrayCount` exists in the markup (`studio.html`),
  and `paintTrayCount()` is called on load and on every toggle. Checked.
- **The tray carries no coordinates**, by three independent mechanisms. That is a
  fence, not an omission — see `FEATURES.md` → 627.
- **A work order with no labor lines is still correct** (the 556 permission rule),
  and unrelated to any of the above.

### 📌 Build 630 — the colours bin needs its destination

629 ships a **colours** bin in Studio that collects but consumes nowhere. Two
things make this its own build rather than a footnote:

1. **`oc_color_photos.color_id` is NOT NULL.** Which Owens Corning colour a roof
   is belongs on the Colors page, where the swatches are visible — not in Studio,
   where you are looking at a photograph.
2. ⚠️ **The photo must be COPIED, not referenced.** Colors is visible to **all
   signed-in staff** (Theo, settled: *"Yes they can see colors"*), while
   `photos/studio/*` is admin-only by storage policy. A tray row pointing at an
   archive path renders for Theo and is **broken for Curtis and Nick**. Copy into
   `oc-colors/<slug>/` the way the Showcase copies through `putPhoto()`.

Do not "simplify" this by inserting the archive path directly.

### Asked at 628 and deliberately left unanswered

**Should a Hall of Fame comparison also take a third "during" shot**, the way the
Showcase path does via its optional `build` slot? The machinery is already
generic — `build` is the only slot the completion guard treats as optional, so
adding one is an array entry and a form field. Not assumed either way, because
"theirs vs ours" is a two-sided argument by construction and a third photo may
simply muddy it. **Ask before building it.**

---

## Worked forward to build 633 — 8 Aug 2026

### ✅ Closed by 633 — do not re-file

- ~~The colour grid loads too much~~ — **`THUMB` (640px) shipped.** The tile was
  measured at 269.5 CSS px and was being handed the 1400px `DISP` copy. See
  `FEATURES.md` → 633 for the fallback order, which is load-bearing.
- ~~"White boxes then loads slow"~~ — the tile image now carries the dark ground.
  It was never a fault, only `--occ-card:#FFFFFF` showing through a lazy load.
- ~~`signMany()` keys by array position~~ — keys by the returned path now. It had
  been latent since 630 and 633 is the build that would have triggered it.

### ⚠️ Still Theo's to confirm — three things, all of them one tap each

1. **Does the Archive site button work now?** (632, unmerged as of writing.) The
   check afterwards is `select count(*) from studio_photos where archived_at is
   not null` — it was **0 across 60,503 rows** before, which is how we know the
   click had never once reached the database.
2. **Does the colour page feel light now?** (633.) The Optimise button will
   **reappear** with all 63 photographs to process — that is correct, not a
   regression: at 632 it was hidden because every photo already had its `-d`
   twin, and 633 moved the test to the missing `-t`.
3. **The Feature header after 626**, still unverified by eye.

### 📌 Open, and worth stating plainly

- **The projected page weight after 633 is arithmetic, not a measurement.** What
  is measured is what the page loads *today*: 23.94 MB of display copies on Onyx
  Black, 17.31 MB on Black Sable. The toast reports the real figure the first
  time Optimise runs. Do not quote a predicted number as fact — that is exactly
  the error that produced "40 MB down to 2.4 MB" before 631.
- **Optimising 63 photographs is a real client-side job** — it fetches ~42 MB of
  display copies and re-encodes each one on his iPad. Per-photo progress is
  shown, and nothing is overwritten, so an interrupted run is safe to re-run.
  If it proves painful, the next move is a server-side pass, not a smaller batch.
- **The colours bin from 629 still has no consumer** — that is build 630's entry
  above and it is still open. The copy-not-reference rule in it is the load-bearing
  part.
- **Nothing prunes the Studio tray** once a pair is built.
- **`scripts/next_build.py` under-reports.** It reads the app stamp from
  `origin/main` only and its `ENTRY` regex still expects the **pre-574** changelog
  shape (`{ build:N, note:'…' }`), so it cannot see entries in the current
  `{ b, d, t, s }` form. At 633 it answered "632" while a pushed branch already
  carried 632. It still catches the collision it was written for; it just is not
  the whole answer. Cross-check with the per-branch stamp sweep until it is fixed.

---

## Worked forward to build 634 — 8 Aug 2026

### ✅ Closed by 634

- ~~Community Partners throws for non-privileged users~~ — the masked-row guard.
  **Was live**: 2 of 10 partners confidential, so every rep hit it every time.
- ~~Client error reports render as job-thread notes~~ — `THREAD_SKIP`.

### ✅ 📌 STRUCK — closed at 635, hardened at 712 and 714

⚠️ **The doc's own next layer strikes this 24 lines below** ("closed on Theo's *Close it*"), so this heading has been contradicted in-file the whole time. Edit is now conditional on `p.__masked`, a CONFIDENTIAL chip renders in its place, and the real fence is `openEditor()` refusing to unmask for a non-privileged caller.

*Original heading:* ~~Found and deliberately NOT fixed — read before "finishing" it~~

**`renderProspects()` bypasses the mask.** It calls `getRaw(row.dataset.id)` and
always renders an Edit button, so a partner that was **both `prospective` and
`confidential`** would hand its real name and contacts to a rep.

**It is not exploitable today** — measured: 4 prospective/not-confidential,
2 confidential/not-prospective, **zero overlap**. The trigger is someone ticking
Confidential on a prospect. Left alone because it is a separate change with its
own blast radius and Theo asked for the crash. **If the overlap ever becomes
non-zero, this is a real leak** — the same query is in `cardinal_build_log.md`.

### ⚠️ Still Theo's to confirm

1. **A rep opening Community Partners** — the real test for 634; I cannot sign in as one.
2. Does **Archive site** work (632) — `select count(*) from studio_photos where archived_at is not null`.
3. Does the **colour page feel light** after running Optimise (633) — the button
   reappears with all 63 to do, which is correct.
4. The **Feature header** after 626.

---

## Worked forward to build 635 — 8 Aug 2026

### ✅ Closed by 635 — the item 634 recorded as found-but-unfixed

~~`renderProspects()` bypasses the mask~~ — closed on Theo's "Close it".
⚠️ **And the 634 note was half wrong:** `prospects()` always masked, so the list
was never leaking. Only the Edit button was, via `getRaw()`. Fixed at three
levels: the button is hidden, the CONFIDENTIAL chip explains why, and
`openEditor` refuses to unmask for a non-privileged caller.

**Do not "simplify" the third one away.** It is the fence — the hidden button is
only the UI in front of it, and `openEditor` is the single place `getRaw()` turns
an id into unmasked data.

### ⚠️ Still Theo's to confirm — unchanged from 634

1. **A rep opening Community Partners** (634) and **the prospects list** (635).
   I cannot sign in as one.
2. **Archive site** (632) — `select count(*) from studio_photos where archived_at is not null`.
3. **The colour page after Optimise** (633) — the button reappears with all 63 to do.
4. The **Feature header** after 626.

---

## Worked forward to build 636 — 8 Aug 2026

### ✅ Closed by 636

~~Two maps on every client profile~~ — one Location card, Google map.
⚠️ **Do not "tidy" the card away.** It holds the only rendered address text and
the only `#acxEdit2` pencil, and **Community adopts this exact node** — it has no
Google card of its own.
⚠️ **`qiLoadLeaflet()` and the other Nominatim callers must stay.** A second
Leaflet map elsewhere uses them; a file-wide "remove OSM" sweep would delete a
feature nobody has looked at.

### 📌 Junk claims — Theo's call, not mine

`insurance_claims` holds **4 rows, all created by theo@**. Three are test rows
from July, none attached to a project:

| created | homeowner | address | carrier |
|---|---|---|---|
| 23 Jul | `grdgdfg` | `dfgfdg` | — |
| 24 Jul | *(null)* | *(null)* | — |
| 29 Jul | *(null)* | *(null)* | — |

The fourth (7 Aug, State Farm, Maker Space Solutions, $28,727.17) is the real
one. They render as "Unknown carrier / Unknown homeowner" because the list falls
back when `carrier` and `homeowner_name` are null.

**Offered deletion; awaiting his word.** Do not delete production rows
unprompted. Two separate questions are open behind it: should the claim list
*hide* rows with no carrier and no homeowner, and should New Claim refuse to
insert an empty row in the first place. Both are real, neither was asked for.

### ⚠️ Still Theo's to confirm

1. **A rep opening Community Partners and Prospective Partners** (634, 635).
2. **The Location card** on both an Insurance and a Community job (636) — I
   cannot load a Google static map from the sandbox.
3. **Archive site** (632) · **the colour page after Optimise** (633) · the
   **Feature header** after 626.

---

# Layer: build 650 — 9 Aug 2026 (Money In & Commissions)

## ✅ SETTLED BY THEO, 9 Aug 2026 — do not re-litigate

- **"Pedro Vera" in the spec IS Jerry Vera** — same person, spec used the
  wrong first name. `jerry@cardinalrenovations.net` was already
  `role:'sales'` in `team_profiles` and already in `TEAM_ROSTER`, so he was
  already selectable as a commission rep with no code change needed. Nothing
  to fix — this closes the "same family?" question outright.
- **Kyle Mantia: leave him out.** Not a rep in this system. The roster
  staying silent on him (no `team_profiles` row, no hardcoded email) is
  correct, not a gap — do not add him speculatively.
- **Greg Clark's display name is set** (`clarkie022@gmail.com` → "Greg
  Clark" in `team_profiles`, confirmed live). He now renders by name
  everywhere `rptRepName()` is used, no longer as "clarkie022".

## ✅ The five spec open questions — ALL ANSWERED BY THEO, 9 Aug 2026

*Do not re-ask any of these; do not build the paths he declined.*

1. **Draws: linked to a project, but general advances are allowed too.**
   Theo: "Draws are linked to project. But can it be both in case of
   general?" — Yes, both. Matches what already shipped: `draws.project_id`
   is nullable. The job's Money In tab creates a job-linked draw; the
   Commissions screen's **+ New draw** creates a general one (`project_id:
   null`). No further build needed — already both.
2. **Draw requests: text/call, not in-app.** Theo: "Text/call." Reps do not
   request draws through the app; Theo logs them. Matches what shipped —
   only `isAdminUser()` can log a draw. **Do not build a rep-facing request
   flow.**
3. **No split commissions between two reps, ever.** Theo: "No split
   commissions between 2 reps." `projects.sales_rep` stays a single field;
   no `commission_splits` table. **This is decided, not deferred — do not
   build it if asked again without a new instruction from Theo.** (The
   collapsed "Manual entry…" form on the tab can still add a second
   commission row by hand for a one-off exception, same as it always could.)
4. **Weekly owed-reminder email — BUILT, build 651.** Theo: "Weekly
   reminder once email trigger." `api/commissions-digest.js` (new,
   mirrors `api/digest.js`'s Resend pattern) emails Theo and Joan every
   Friday 11:00 UTC with what each rep is owed minus outstanding draws —
   using the exact same "owed" rule (`pending`/`approved`, never
   `paid`/`void`) the Commissions screen uses, so the two can never
   disagree. Sends nothing when nothing is owed (matches `/api/digest`'s
   own convention). Cron registered in `vercel.json`.
5. **Payment method: tracked, not just date.** Already shipped at 650 — the
   Mark Paid flow on the Commissions screen has a Method select
   (check/ACH/payroll/other) alongside the date.

## ✅ Finance as a collection source — BUILT, build 651

Theo: "Add finance, we use service finance right now but will explore other
financing." `collections.source` gained `'finance'` (alongside insurance/
homeowner/other) plus a free-text `finance_company` column —
`commission_finance_source.sql`, **applied**. Free text, not an enum: one
financing company exists today and Theo has already said he'll add others,
so a `financing_companies` table for one row would be the premature
abstraction this project warns against — adding a second company later
needs no migration. The Log Collection form pre-fills "Service Finance" as
an editable default when Finance is picked (today's normal case costs zero
extra typing); the Money In table shows it as "Finance — Service Finance".

## Needs Theo — commission system (none of it blocks using the feature)

1. **Backfill check:** 26 of 30 projects got a `sales_rep` from the checklist
   assignment (joey 10 · clarkie022 8 · theo 6 · nick 2); 4 have none. All
   editable on the job's Commissions tab until the first collection locks them.
2. **Resend must actually be configured** for the new weekly email to send —
   it reuses the same `RESEND_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` env vars
   `/api/digest` already needs, so if the daily appointment digest is
   arriving, this needs nothing new.
3. **Rep-role rendering is verified by RLS + harness, not by signing in as a
   rep** — the standing sandbox limitation. First Friday run-through is the
   real gate.

---

# Layer: CR Audit — 9 Aug 2026 (docs-only; the report is the source of truth)

**`docs/CR_AUDIT_2026-08.md` supersedes this note** — 23 findings, 6 buried
features, 6 sized insurance gaps, all severity-ranked with evidence and a
per-finding fix sketch. Re-derive its numbers with
`scripts/audit_recount.py` before quoting them at a later build.

Standing corrections this audit adds to the doc set:
- `cr-ih-styles` is **load-bearing** (3.4 KB, styles the live Truth hub) —
  only the `cr-ih-script` stub is deletable. Earlier "8 KB dead styles"
  notes are wrong on both counts.
- `claim_upgrades` is empty but **summed by the `claim_money` view** — not
  droppable on a client-code grep.
- The Truth-hub rail's `render()` **does** wipe the hub's navigation cards
  (verified byte-level) — destinations survive via banner/nav/⌘K only.
- The Admin Health registry monitors `push_subscriptions`, the table build
  611 recorded as never-read — while the real `push_subs` is unmonitored.
  Same registry-repair pass as the documented phantom `payments`/
  `supplements` rows.

Awaiting Theo's picks from the fix menu (presented in chat, mirrored in the
report): the broken-wire batch · money coherence · insurance repair · the
supplement unification shape (his three-filings model) · the media backfill
· health-check truth-telling · the DB hygiene migration · gap features.

---

# Layer: build 653 — 9 Aug 2026 (five audit fixes, shipped)

## ✅ BUILT — the broken-wire batch Theo picked off the fix menu

Five items, verbatim from his list, each closing the audit finding named:

1. **CR-AUD-001** (dead Convert-to-Contract button) — fixed, hyphenated the
   endpoint path everywhere it appeared.
2. **CR-AUD-002** (false Send toast) — fixed, real send through
   `/api/senddoc`. **Also fixed as a dependency, found only by executing
   the handler for real:** the pre-existing `.cr-doc` innerHTML wipe that
   crashed `showOutput()` before Send's handler was ever wired — this one
   was not on Theo's list and was not a named audit finding; it surfaced
   while proving item 2 actually works, and had to be fixed for item 2 to
   be reachable at all. Reproduces on 652; not new in this build.
3. **CR-AUD B1** (invite endpoint, no caller) — fixed, new button beside
   "Add teammate."
4. **CR-AUD-008** (12 MB photo tap) — fixed, `loading="lazy"` +
   admin-only legacy-media migration tool.
5. **CR-AUD-006/014** (invisible $28,727 claim) — fixed, `RAIL` gained
   `OnHold`, the one live record repaired, `linkClaimToProject()` now sets
   `claim_type` going forward.
6. **CR-AUD B2/B4** (buried iTel rows and the smoke-test runner) — fixed,
   both joined the banner `ROUTES` map; a new read-only iTel Lab Results
   view exposes the 28 real rows and says plainly they're not yet linked
   to a claim.

**This closes the "broken-wire batch" line item from the CR Audit's fix
menu.** The remaining fix-menu lines — money coherence (CR-AUD-003/004/
013), insurance repair beyond the OnHold hole (CR-AUD-007/009/015/017),
the supplement unification (CR-AUD-005, Theo's three-filings model, still
unbuilt and still needs his shape first), the media backfill beyond legacy
base64 (broader than CR-AUD-008), health-check truth-telling (CR-AUD-016),
the DB hygiene migration (CR-AUD-021/022), and the sized insurance-lifecycle
gap features (§ the gap analysis in the report) — are all still open and
still need a pick from Theo. Do not build any of them speculatively; each
needs the same "which one, in what shape" answer the audit report asks for.

---

# Layer: builds 654–655 — 9 Aug 2026 (the second audit batch)

## ✅ SETTLED BY THEO, 9 Aug 2026 — three picks, do not re-litigate

1. **Job money = "One number + label"** (CR-AUD-003). One precedence
   everywhere; the profile labels an estimate-sourced value. Built at 654.
2. **Stage labels = "Closed" + "Awaiting Depreciation / Supplements"**
   (CR-AUD-014). The rail's wording wins in every insurance map; OnHold
   gains "On Hold" everywhere. Built at 655.
3. **✅ Supplement unification (CR-AUD-005): the data layer SHIPPED at
   667-668** — the Supplement Desk. Design went to Theo first (9-10 Aug,
   his picks recorded: admin-only, send-on-tap, quantities-only), built on
   his three-filings model. Rows in `insurance_supplements`, trigger mirror
   to the single-slot columns, AI gap analysis citation-locked to Cardinal's
   own templates. **Still open: build 669 (send from the desk) and 670
   (carrier-response reading + PWI/COC completion path).** CR-AUD-017 folds
   into the mirror and is closed with it.

## ✅ BUILT at 654 — money coherence (CR-AUD-003 / 004 / 013)

See the build log and FEATURES.md §654. Two deliberate number changes are
recorded there (estimate-only profiles now priced; contract+manual now
additive app-wide). `rptIsSigned` left as a stage proxy on purpose — with
zero signed contracts live, real-signature keying would zero every report.
**Revisit `rptIsSigned` once contracts actually flow.**

## ✅ CLOSED — the Adam Gunn scope read WORKS (9 Aug, builds 660–664)

It read on the first attempt after 660–663 deployed, and it read **BC-Building
Codes, $1,887.33 RCV / $1,933.72 ACV** — the figures Theo quoted off page 5, to
the cent. `O&L cap` came back *(not found)* rather than invented.

⚠ **Which build fixed it is unknown and must not be claimed.** Only the BC
vocabulary is provably 660's. Whether it parsed because of 661's retry, 662's
duration, or because Gemini was simply healthy that evening cannot be
distinguished — a successful read logs nothing.

**664 then fixed what applying it revealed**: five approved columns never
reached `insurance_claims` (`BUG_CLASSES.md` §18). Gunn's row was repaired by
hand; the SQL is in the build log.

### ✅ SETTLED at 666 (was: Theo's call)

**The review modal pre-ticks any field whose extracted value DIFFERS from what
is stored — including over human-verified data.** That is how an AI misreading
of the adjuster's phone (`636` → `663`, a digit transposition) arrived
pre-approved and was applied. The email changed in the same read and was
CORRECT, so this is one wrong field in seventeen, not an unreliable extractor.

**Theo picked "only tick empty" and it SHIPPED at build 666.** A field that
already holds a value arrives unticked even when the extraction differs; the
difference still shows, the overwrite is opt-in. Do not re-litigate toward
differs-means-ticked — the misread phone digit is the recorded reason.

## ✅ BUILT at 665 — scope history (GAP-2)

Theo's pick for the build after 664, his ordering: data-loss risk first, and
the structural floor for supplements. `scope_reads` (applied, append-only —
NO update policy, deliberate), ONE writer (`logScopeRead`, exported as
`CardinalSolUpload.logRead` for the supplement work to reuse), Settle-pane
history section, backfill seeded 2 rows. GAP-2 is CLOSED. ⚠ For CR-AUD-005:
build on `scope_reads` + `logScopeRead`; do not invent a second trail.

## (historic) The Adam Gunn scope read was not proven (661)

657–661 all touched this path and **not one of them has been shown to read
that document successfully.** What each build actually fixed:

| Build | Fixed | Proven by |
|---|---|---|
| 657 | the 6.4 MB file never reached the route (inline over Vercel's body cap) | it now reaches it — the failures since are the model's, not the transport's |
| 659 | the reply was truncated at 1024 tokens | Theo's error text stopped being cut-off JSON |
| 660 | the prompt did not know "BC — Building Codes" | not yet exercised on the document |
| 661 | the failure named no cause; JSON-mode never retried | the next failure carries its own diagnosis |

**The sandbox cannot run this.** `GEMINI_API_KEY` lives in Vercel env vars and
must stay there — there is no way to call the model from here, so the read is
Theo's to run and his screenshot is the instrument.

**662 added a row to that table**: every AI route was running on the hosting
default duration (10–15s), and 661's retry made the scope read two sequential
model calls. That is now `maxDuration: 60` plus a code guard that refuses a
retry it cannot finish. ⚠ **It is not the outstanding cause** — Theo's
screenshot carried the handler's own sentence, so the handler returned; a
timeout would have shown `HTTP 504`. It was a risk 661 created, found by
checking a claim that was otherwise wrong.

**Ruled out, so nobody re-proposes them** (each has now been suggested at least
once): OCR and layout-aware PDF parsing — `/api/sol` is multimodal, there is no
text-extraction stage to improve · "narrow the prompt off line items" — it has
never asked for line items, 24 summary fields measured · Vercel's 4.5 MB body
limit — 657 routes anything over 3.1 MB through storage · markdown fences —
stripped since before 659, with two further salvage layers since.

**Unmeasured and deliberately untouched**: the prompt is 3,852 characters and
**59% of it is ordinance & law** (2,254 chars added across 658 and 660) for one
field group out of 24. Not a proven cause of anything. Written down because
three builds pushed the same direction; know the shape before adding a fourth.

**663 finished the instrument and the building stops here.** 657 → 663 is seven
builds on a failure never once reproduced in this sandbox. **Do not ship an
eighth before a tail exists.** Pre-flight a preview with `/api/ai-status`: it
says whether `GEMINI_API_KEY` is present in *that* environment and whether
`OPENAI_API_KEY` is set at all (which decides whether 661's fallback repair is
even reachable).

**What to do with the next screenshot**: read the bracketed tail.
`in <few hundred> tok` means the document never reached the model (transport,
not prompt). `out 0 tok` with a large `in` means it ingested and declined.
`blocked X` means a safety stop. `answered in words` is the only one that is
about the prompt. **Do not start rewriting the extraction stack before that
tail says which of the four it is** — and note that OCR / layout-aware PDF
parsing is advice for a text-extraction architecture this route does not use
(see FEATURES.md §661).

## Still open from the audit after 654–655

**CR-AUD-005 is now CLOSED** — the Supplement Desk (667–670) is the one
supplement system: filings live in `insurance_supplements` rows and the claim's
slot columns are a DB trigger recomputing from them, whoever wrote. 017
(supplement bucket vs owedOn) folded into it. Still open:

CR-AUD-016 (health-check registry)
· 017 (supplement bucket vs owedOn — folds into 005's design) · 018
(community draft-estimate fallback) · 019 (inspections tile/tab predicates)
· 020 (small wiring cleanups) · 021 (dead weight deletions) · 022 (DB
advisor batch) · 023 (boot weight) · B3 (CardinalUndo) · the seven direct
checklist writers outside `patchProjectCk` (listed in 655's PR — same
last-write-wins class, follow-up candidate) · the gap features (each needs
Theo's shape).

## The Supplement Desk — what 670 left standing

**Settled, do not re-litigate.** A building-official letter is filed by
JURISDICTION, not by claim (it is reusable — that is the whole point). It is
**evidence beside an RCO citation, never a citation of its own**, because Ohio
has one statewide residential code and the local department administers it. The
jurisdiction match is a **sort hint**: it never filters the list and never ticks
a letter, because the addresses misspell their own city and a neighbouring
official is persuasive where he is not binding.

**Open, in the order they were offered** — ⚠️ *two of these five are struck below (send-from-the-desk shipped at 672, Hover at 674). The remaining three are genuinely open:*
- **Carrier-response reading (the `read_response` mode, still 501).** Upload
  the denial → per-item approve/deny mapped onto the filed row's `items` →
  rebuttal draft → the thread lives on the row. Also the PWI/COC completion
  path (certificate + photos → depreciation release).
- ✅ ✅ **STRUCK — shipped at 672.** `supplement.html` carries `#sendBtn` ("Send to the carrier"), `syncSend()`, `renderForSend()`, `EXHIBIT_TTL`, `recordSend()` and the `sent_at` writeback. ⚠️ The note predicted build **669**, which became something else — grepping for 669 makes it read unbuilt. The doc already says so at line 2454. *Original:* **Send from the desk.** Recipient shown, one explicit tap, exhibits as
  long-lived signed URLs (the `PHOTO_DOC_URL_TTL` shape). Theo's pick was
  "send from the desk"; the Desk currently files, prints and copies.
- **A metal-over-cedar-shake substrate template** for the pack, if the Gunn
  argument recurs. `tear_off` covers it today; a dedicated card would carry the
  attic/skip-sheathing documentation list.
- ✅ ✅ **STRUCK — shipped at 674, extended at 919.** `importMeasFrom()` fetches `/api/hover` and calls `aerialMerge()`, which writes `all.meas`. Verified in the artifact, not just the log. *Original:* **Hover → `checklist.meas`.** `/api/hover` is the SIDING order flow only;
  Roofr's numbers reach `meas`, Hover's do not. Small build if wanted.
- **The register has no browser outside the Desk.** Letters are admin-authored
  and all-staff readable by RLS, but only the Desk renders them. If production
  should carry the jurisdiction's position into the field, that is a read-only
  view in `index.html` — not started, not decided.


## After 671 — what the audit left on the table

**Answered by 671, do not re-open:** the SECURITY DEFINER proposal (rejected as
a false positive, with the test recorded in `supplement_mirror_tiebreak.sql`);
the `.pill.filed` "can never be produced" claim (overstated — two vocabularies,
both now complete).

**Three questions that genuinely need Theo, none of them blocking 672:**
1. **PWI / COC vs quantities-only.** A depreciation-release filing must carry
   the final invoice figure; the Desk's rule is quantities-only, settled three
   times. (1) pwi_coc is exempt, `dollar_flag` suppressed for that type only.
   (2) The amount rides on an attached invoice; the letter stays
   quantities-only. (3) The letter states it and `dollar_flag` still fires so a
   human confirms every time. **Recommend 3** — one rule with one visible
   exception beats two rules. The option is disabled until this is answered,
   and it needs its own build regardless: the Desk is hard-gated on a filed
   carrier scope, which is the wrong precondition for an end-of-job filing.
2. **The supplement rail will read $0 on every Desk filing.** The Desk writes
   no `amount_requested`, so the mirror computes 0 while flipping the status to
   filed. There is no honest source for a number — Gunn's `our_estimate_total`
   and `cost_incurred` are both NULL and `scope_reads.extracted` is NULL.
   (1) Show the ITEM COUNT instead of money wherever a Desk filing appears.
   (2) Add an optional amount field filled by hand. (3) Leave the $0.
   **Recommend 1** — inventing a figure to fill a rail is the confident-wrong-
   number class this project keeps removing.
3. **Who may rewrite a FILED letter?** `insurance_supplements`' update policy is
   full-access-or-own, so Curtis and Scottie — who cannot open the admin-only
   Desk — can update `letter_html` on a filed row, and the mirror fires on
   update. No shipped UI does this. (1) Leave it. (2) Freeze
   `letter_html`/`letter_subject`/`filing_type` once `sent_at` is set, leaving
   status/items free. (3) Narrow the RLS to admin-only. **Recommend 1 now, 2
   the moment a reopen-and-edit path ships.** Not 3 — it would break the
   claims-screen CRUD they legitimately use.

**Recorded, not built:** `insurance_supplements_insert` checks only
`created_by`, not that the claim is visible — a caller outside the Desk could
insert against an invisible claim and the mirror would no-op. Not reachable
from any shipped UI.

**672 SHIPPED** — send from the desk, back-compat proved differentially against
the 671 handler. **Next: 673,
the carrier response: reopen the filing, record decisions per item into
`items[].carrier` (**not** `responses` — the items COMMENT already names that
home), rebut through the existing `mode:'draft'` with an explicit
`letter_kind`. A reduced-quantity approval — the commonest adjuster move — has
nowhere to land today; 673 is the cheap moment to add `approved_qty` beside
`decision`.


## After 672

**Still open, unchanged:** the three questions above (PWI/COC vs
quantities-only; the $0 supplement rail; who may rewrite a filed letter). None
blocked 672; all three still want an answer.

**New, from building the send:**
- **Nothing verifies the letter arrived.** Resend accepting it is not the
  carrier receiving it. No bounce handling, no delivery webhook. `sent_at` means
  *we handed it to the mailer*, and the Desk says exactly that.
- **`EXHIBIT_TTL` is one year.** If a dispute outlives it the photographs in the
  carrier's copy stop resolving. One constant; the archive still re-renders.
  Revisit if a real supplement ever runs that long.
- **673 is next**: reopen the filing, record the carrier's decision per item
  into `items[].carrier` (NOT `responses` — the items COMMENT already names that
  home), and rebut through the existing `mode:'draft'` with an explicit
  `letter_kind`. Add `approved_qty` beside `decision` while the slot is being
  written for the first time — a reduced-quantity approval is the commonest
  adjuster move and today has nowhere to land.


## From the 672 adversarial review — confirmed, deliberately NOT built

- **No recovery if the page dies between send and writeback.** The retry lives
  in a closure on the Send button; a reload or a crash destroys it, and the only
  route back is to file a second supplement — which mails the carrier a second
  letter. The fix is to derive send state from the filings already fetched: let
  an unsent filing be selected to set `S.filedId`, and hard-refuse Send on any
  filing whose `sent_at` is non-null. **673 work** — it needs the filings list
  to become interactive, which 673 is doing anyway for the carrier response.
- **Nothing verifies delivery.** Resend accepting is not the carrier receiving.
  No bounce handling, no delivery webhook. `sent_at` means *handed to the
  mailer*, and the Desk says exactly that.

### Refuted findings — do NOT re-file these

- *"`renderForSend` keys signed URLs by array position, re-introducing the
  build-633 bug."* The code reading is correct; the conclusion is not.
  `createSignedUrls` is contractually 1:1 with its input, so position-keying and
  path-keying are provably equivalent **here**. 633's bug required asking for a
  path the API might not answer for.
- *"The quantities-only rule is never re-checked at the new exit."* True as
  written but mis-scoped — the defect was the mail body's *claim*, not the flag,
  and that is fixed. The flag itself is a draft-time warning by design.
- *"A legacy base64 photograph is silently excluded from the mailed letter."*
  Pre-existing at 668, and 672 is the build that added the only mitigation it
  has ever had (an unresolvable photo is no longer claimed).


## From 673 — the Hover upload files a PDF and nothing else

Uploading a Hover report under **Measurements** stores the PDF as a document.
It does **not** extract anything: `/api/hover` is called only from the siding
material-order import (`index.html:16247`), so nothing writes `checklist.meas`.

**DONE at 674.** Uploading a Hover or Roofr report under Measurements now reads
it and fills `checklist.meas`. Gunn's report is on file — **re-upload it once to
run the extraction over it**, since 674 only reads on upload and does not
backfill documents already filed. A backfill pass over existing `meas_docs`
rows is a small follow-up if more than one job needs it.


## After 674

- **674 reads on UPLOAD only.** Reports already filed (Gunn's Hover, and the
  Bob DeBuilder mockup) are not backfilled. Re-uploading is the one-job answer;
  a sweep over `meas_docs` is a small build if it is ever more than that.
- **Nothing verifies Gemini read Hover's table layout correctly.** The route is
  told to null rather than guess and the merge will not overwrite a field
  measurement, so a bad read costs a re-entry, not a wrong number on a carrier
  letter. Still: check the numbers against the report the first time.
- With measurements on the Gunn job, the Desk's quantities stop being blank —
  the remaining gaps there are **photographs (zero on that job)** and **a
  Brookville building-official letter (none filed)**.

---

## Build 680 — closed, and what it left open

**Closed.** Theo's four questions on the claims screen: the giant white boxes
(`.empty` was two classes wearing one name — **six** surfaces, not one), "Filed"
and "Approved" now say they are dates, `approved_at` has a writer for the first
time (it had **none, ever** — display-only since the module shipped), Cause of
Loss is read off the Scope of Loss, and the Job tab stopped rendering the
Contract tab.

**✅ CLOSED — the horizontal pan was FIXED AT BUILD 950, and this note outlived it by ten days.**
This entry sits in the **10 Aug** layer. Build **950 (20 Aug)** — *"sideways scrolling repaired
everywhere"* — swept all 50 `overflow[-x]:auto` sites off Theo's Punch-page screenshot and found
**four** horizontal scrollers missing `overscroll-behavior-x:contain`: `.pu-tabs`, `.cr-cth-tabs`,
`.cd-crmbar` and `#cr-disp .dspscroll`. Re-verified on main at build 990: **all four still carry
it.** `sentinel`'s `OVERFLOW` probe also reports nothing at 390/1194/1440/2000px, and Theo
confirmed on 22 Aug it has not recurred — he assumed he had misremembered it. **He had not. It was
real, it was fixed, and this note was stale.**

⚠️ **This entry was actively harmful while it stood**: it instructed the next session to go
instrument the whole app for a bug that no longer existed. *A stale "STILL OPEN" costs more than no
note at all, because it looks like evidence.* Kept here rather than deleted so nobody re-opens it
cold from the build log.

**Worth a look while nearby, not yet asked for:**
- `filed_at` is **null on all 5 claims** in the database even though the form has
  always had the input. Now that the label says "Date Filed", it will be
  obvious when it is blank — see whether Theo wants it required at file time.
- The `cause_of_loss` extraction is **unverified against a real scope** — it
  needs one run through Gunn's document with the live key. Expect `hail`; the
  prompt is told to return null rather than guess, so a blank is a safe failure.
- `#cr-ce-view .ce-kv .v.novalue` still has **no emitter**. It was renamed with
  the rest so the trap cannot be walked into, not because anything uses it.

---

## Build 681 — closed, and what it sets up

**Closed.** The Schedule Board reads (heading 1.10 → 19.89:1 dark; day line
2.30 → 8.73:1 light), and the same heading fix carries all **15** `.viewhead`
pages. `CardinalIcons` exists and is proven on one screen.

**AWAITING THEO — the icon set is a sample, not a sweep.** He asked to see it
before it goes app-wide. Build 682 does not start until he has looked at the
Schedule Board.

**For 682, the inventory instrument is `metallicize()`, not a regex.** It walks
the DOM at load and wraps every emoji in `<span class="mic">`. Drive that in a
real browser across every view for a runtime census. **A source grep for
literal UTF-8 emoji will under-report badly** — all 15 `.viewhead` headings use
the HTML-entity form (`&#128197;`), and more is built at runtime.

**Scope Theo settled:** app screens only. Icons where the eye SCANS; in prose,
**delete**. Out of scope until he says otherwise: emails, push notifications,
printed letters, `popup.html`, `drivewaytest.html`, the Showcase. The CHANGELOG
keeps its emoji — historical record.

**Still queued behind this:** the insurance loop (builds 683–684 —
`read_response` is still a 501, `insurance_supplements` still has zero rows),
and the VAPID key rotation, which is waiting on Theo setting the env var.

---

## Build 683 — closed, and two notes

**Closed.** Home client cards dark in both themes (the bare `.stg-*` pastel
collision), gradient names gone from the cards (39 gradient-text sites → 38).

- **The emoji sweep is STARTED, not finished.** 686 did the nav (28 rows,
  `CardinalIcons` 4 → 27 glyphs + `hydrate()`). **533 pictographic emoji
  remain** — measured with comments excluded and with the 0x2300–0x23FF block
  included, which the first inventory missed. Dingbats (156), arrows (154) and
  geometric marks (66) are counted separately and are NOT part of this sweep:
  ✓ ✕ → ☐ are functional UI glyphs. Next largest surfaces: the card/hero button
  rows in `cr-sf` / `cr-ch2` / `cr-cth` / `cr-ci` (they already wrap their emoji
  in `<span class="i">`, so they are the cleanest remaining tranche), the
  ~~weather table in `cr-lr-script`~~ (**gone at 701 — the panel was removed**),
  the command palette's `icon:` field, and the file-type ternaries in
  `cr-lib-script`.
- **`.pcpo` lavender `#c9a2ff` reads 1.99:1 in LIGHT mode** — pre-existing;
  lavender PO is on the semantic frozen list. Needs Theo's pick of a light
  variant (the `.ljpo` precedent uses `--rbe-po1/po2` pairs).
- ~~**Remaining gradient-text sites: 38**~~ — **DONE at 685.** All removed;
  the real count was **37** (the 38th is a comment whose declaration is split
  across a newline). Chromium's parsed-rule walk now reports 0, and
  `render_gradtext.js` is the standing instrument — it goes RED on 684.

---

## Builds 685–703 — what closed, and the live queue (10 Aug 2026)

**Closed this span**, all merged and verified deployed (PRs #198–#207):
gradient text (685), the nav icons (686) and the three Theo rejected (687),
Suppliers (688), the calendar headings + obsidian client cards (689), the
pipeline-stage chips (690) and the Assigned To strip beside them (691).

**Also closed, 692–701:** the emoji sweep across four card/hero surfaces (692),
Sales Floor light mode (693), the light/dark switch put back on the screens
that lost it (694), the Tools dropdown (695), **my 690 regression on the chip
strips (696)**, the sideways-swipe escape on All Leads & Jobs (697), the 27
client-page `.projsec` headings (698), the 15 `.viewhead` page headings and the
`ICO` consolidation (699), **the lavender PO and On Hold colours (700)** and
**the weather panel removal (701)**, **the map address ink (702)** and
**the claim screen's sideways bounce (703)**.
**704** removed a Supplement Desk card that had never rendered since 668.

**⚠ The Supplement Desk's static `.ins-grid` is dead in full — 7 cards left in
place.** `render()` in `cr-cth-script` overwrites `.ins-body`, so nothing in
that grid reaches the DOM. Kept as an accidental fallback if the module ever
fails to run; its content is already stale (Adjuster Directory reads "Coming
soon" and that screen is built). **Theo's call whether the rest goes.**

**⚠ THE INSURANCE LOOP — audited 11 Aug, and it is smaller than recorded.**
The Supplement Desk is **four-fifths built**: analyze ✅ (2 `scope_reads`),
draft ✅, file ✅, send ✅ — and **`read_response` is the only 501**.
**No migration is needed to close it**: `insurance_supplements` already carries
`responses jsonb DEFAULT '[]'`, `responded_at`, `amount_approved`, and its
`status` CHECK already permits `approved` / `partial` / `denied`. The Desk's
filing list already renders an approved amount when one exists.
⚠️ **But the loop has never completed once** — against 5 claims there are
**0 supplements, 0 payments, 0 upgrades**. The front half has never been driven
to the end either, so building the reader against invented fixtures risks the
inert-code failure exactly. **What is needed from Theo: one real supplement
filed on the Gunn claim, and the carrier's reply document.**

**⚠ OPEN, measured, and put to Theo — the sideways-bounce class is app-wide.**
703 fixed the insurance claim screen. **13 other full-screen views carry the
same coercion**: `landingView`, `cr-estimates-mount`, `cr-pricing-mount`,
`payView`, `puDetail`, `tskModal`, `solModal`, `projModal`, `ckModal`,
`gcModal`, `leadModal`, `leadFormModal`, `apptModal`. Each will slide and
rubber-band whenever a child is a pixel too wide.
**This must NOT be swept blind.** Unlike 697's `overscroll-behavior-x:contain`,
which is inert where there is no overflow, `overflow-x:hidden` **clips** — so
every view needs its genuinely-wide child found and given its own scroller
first. Bug class 33 has the drill.

**Also seen while measuring, not fixed, not reported as a bug yet:** the HOME
view has small pre-existing overflows — `.wrap` +10px, `.homecols` / `.homemain`
/ `#kpPunchStrip` / `.pu-strip` / `.sh` +18px each at 393px. They are contained
by `#mainView{overflow:clip}` so nothing slides today, but they are real and
they are what class 33 needs as fuel if that clip is ever relaxed.

**The queue, in Theo's priority order:**

1. **The emoji sweep — 532 remain.** Still first. The nav went at 686, the four
   card/hero surfaces (`cr-sf` / `cr-ch2` / `cr-cth` / `cr-ci`) at 692, and the
   Tools dropdown at 695, the 27 client-page `.projsec` headings at 698 and
   the 15 `.viewhead` page headings at 699.
   The two biggest left are the rest of the static
   `(markup)` (~296) and the anonymous block-1 script (124). ⚠️ **90 distinct
   characters remain in the markup** — that is 90 glyph decisions, so it wants
   splitting into coherent menus/screens rather than one sweep.
   ✅ **SETTLED 10 Aug, Theo, verbatim: "Keep them as emoji."** Asked about the
   four condition dots (🟢🟡🟠🔴) in `ck_ventcond`. An `<option>` cannot contain
   markup, so an SVG is impossible there — the only choices were keep or
   delete, and he chose keep. **The same physics covers all 17 `<option>`
   emoji** (`ck_ventcond`, `apKind`, `apptKind`), so every one of them is
   permanently out of scope and must be left exactly as it is.
   **The exclusion lives in `scripts/emoji_census.py`, not only here**, because
   the instrument is what a later sweep actually reads to pick targets. Do not
   re-open this.
   ⚠️ **Count with `scripts/emoji_census.py`, never a grep.** The old "533"
   missed the JS `\uD83D\uDD28` surrogate-escape form, which is two thirds of
   all hits, and had no bucket for the **46 ® marks on Owens Corning names** —
   those are trademark symbols `OC_BRAND_RULES.md` requires, not stickers.
   ⚠️ **The weather table is NO LONGER a target — the whole panel went at 701**
   on Theo's instruction. Any list that still names `WX_CODES` as the next
   tranche is stale; `cr-lr-script` has no weather code in it.
   **Ship icons with a rendered contact sheet, never a pass count**: 686 was
   195/195 green and shipped three wrong glyphs.
2. ~~**gradient text**~~ — **DONE at 685**, 37 sites, zero floor failures.
3. **The insurance loop** — unchanged. `read_response` is still a 501,
   `insurance_supplements` still has zero rows. Needs Theo, the live key and
   Gunn's document.
4. **VAPID rotation** — still waiting on `VAPID_PRIVATE_KEY` in Vercel. **Do
   not remove the committed literal in `api/notify.js` before the env var is
   live; this repo is public and push breaks silently without a key match.**

**✅ Both open questions are ANSWERED and SHIPPED at 700.** Theo, verbatim:
*"Do whatever you recommend for the lavender in light mode, for the on hold
maybe make it a different color of your choice."*

- **`.pcpo` lavender** is now a token pair — `--pc-po` `#c9a2ff` dark /
  `#6d3fbf` light. It had been 1.79:1. **A pair, not a computed literal**, so it
  cannot drift the way 527's `#f08a90` did.
- **`OnHold` now has an entry in all five stage maps.** Amber on the leads list
  (`LJ_SOLID` `#c8862b`, `LJ_SPINE` `#ff9f43`), teal on the job banner
  (`STAGE_COLORS` `#0F9B8E`). **Deliberately two colours, not one** — the two
  screens use different palettes and amber was already spoken for on the banner.
  Do not "unify" them.

**Parked by Theo, with his words:** the desktop left nav (`cr-lnav-script`)
keeps its OWN 26-icon set, unrelated to `CardinalIcons` — folding them into one
is its own build and changes what his ultrawide looks like, so it wants a
preview. His call on doing it now was **"not now"**; finish the emoji sweep.

**Not chosen, do not re-propose without a reason:** Option A for the filter
strips — one switchable strip covering all seven groups. It was rendered and
shown beside Option C; he picked **C, two fixed strips** (Milestone + Assigned
To), with the other five groups staying behind the funnel.
- **Remaining gradient-text sites: 38** — next sweep targets per the settled
  no-gradients rule; list is in the CLAUDE.md standing note.

---

## The Community CRM — ✅ SETTLED 11 Aug: (a), the black card wins

Theo picked **(a)** on 11 Aug 2026: `#cr-cc` is THE Community client page; the
five hidden first-build surfaces get ported onto it, then the old build and its
~13 KB of CSS get deleted. Full audit: **`CR_COMMUNITY_AUDIT_2026-08.md`** (24
items; the phase roadmap is at its top). His weighting stands: *"This is the
most important CRM because jobs could sit for a while."*

**Phase 1 shipped at build 705** — the payments door (CR-COM-002 closed): the
black card's Job Menu ends with a Payment Information tile straight into
`openPaymentsPage()`, no suspend, no cream flash.

**Phase 2 shipped at build 706** — the Partner & Property section (CR-COM-006
closed, 001/016 partial, stale-write guard at the new call sites).

**Phase 3 shipped at build 707** — the work-order module fixed in both
directions (read + write + delete) and rendered on the card via host mode
(CR-COM-007 closed).

**Phase 4 shipped at build 709 — THE PORT IS COMPLETE.** The cream surfaces
are deleted (001 resolved; 010 fixed by the Recorded line; 020/024 partial —
the six shared-tab suspends remain by necessity, the snowflake is gone; two
body observers retired, census 42). The black card is the only Community
client page.

**004 and 005 shipped at build 710** — the stage flow moves and a parked job
stops lying (measured before/after in the audit doc). **Still open:** Job Menu
missing Documents (003) · money precedence (011/012) · partner identity (008) ·
hub numbers (022).

**711 answered two of Theo's questions in the product:** the partner row's
mystery em-dash (it was awarded money, zero everywhere) now shows nothing
until there is money; and the Clients tab opens first with the hub's existing
filters attached. **"Waiting on you" is still the open one** — it lists only
Prospect/Approved/Completed queues, so with everything at Lead it says
"Nothing waiting on you" while three bids sit past their due date unsent.
Theo declined the fix this round (he picked tab-order only); the change is a
fourth queue, "Send the bid", fed by Lead jobs at or past `bid_due_at`.

**Found by the 710 recon, NOT fixed — each its own item, worst first:**
1. **`#contactedBtn` is a retail button live on community jobs.** It sits in
   `.projhead` (outside `#tab-overview`), so the moment a Job-Menu tile calls
   `suspendForTab()` it is on screen, writing `Prospect` with retail wording,
   no confirm, no relabelling.
2. **The card cannot reach `Completed` or `Closed` at all.** `acxAdvance`
   (10325) is their only producer app-wide and lives on the suspended page;
   `Scheduled` has no `threadHtml` branch, so a job put on the calendar can
   never be taken off it from the card. Same for Reopen.
3. **`isClosed()` marks a partner dormant when their only job is parked**
   (`p.dueCount === 0 && !p.owed`) — and `.pc.closed` has **zero** CSS rules
   anywhere, so the state computes, persists and renders nothing.
4. **The second clock is behind a tap.** `chDueIso()`/`chOnHold()` are correct
   but feed only the All-bids table, which ships collapsed; the KPI tiles and
   every fold read `bid_due_at` directly. Neither hub nor card ever turns an
   **overdue** check-back hot — 30 days past renders like 300 days away.
5. **`award_cycle` is displayed on exactly one surface** (the job's own thread
   event) — not a facet, not a sort, not a column.
6. **"Open bids" is not open bids** — `d.all.length` counts everything
   `projects()` returns, Lost and Closed included (022's core).
7. **Four copies of the community label map** remain (two now complete). The
   insurance precedent (`INS_STAGE_LABEL`, CR-AUD-014 at 655) shares one by
   reference; doing that for community is a small build of its own.
8. `#stageBanner`'s arrows and `#stageSel` are **dead on every CRM** (struck by
   `#tab-overview`'s allow-list / `display:none` in markup) — the prime
   doctrine's trap, two more victims nobody had recorded.

**Photo pipeline residue (708, 11 Aug), small and not scheduled:** `photoDb.add`
still writes the now-meaningless public URL into `data` for new photos (display
prefers `_src`, so it is inert — but it is a dead value shaped like a live
one); and if `attachSignedPhotoUrls` fails wholesale (offline load), storage
photos render dead links again — there is no retry.

**Two follow-ups surfaced by the Phase-2 recon (11 Aug), not yet scheduled:**
- `setPartnerForProject`/`setPropertyForProject` persist by whole-checklist
  read-modify-write from the captured row (`index.html` ~31261/~33611),
  bypassing `patchProjectCk`'s build-655 refetch-merge — a stale capture can
  resurrect old checklist state. Migrating them touches the cream rows too.
- The New Bid property dropdown never renders: `loadPropertiesFor` prefers two
  methods that have never existed on the export and falls to a cold cache, so
  even partners WITH properties get the free-text address input.

---

## Build 712 — partner contacts are Theo's, and what it left for 713 (11 Aug 2026)

**Theo, verbatim:** *"Hide all main contacts for all community partners. Only I
should have the main contact info. Sales reps just put bids on jobs and only
have contacts for homeowners."* Two picks, both settled, **do not re-litigate**:

| Question | **Theo's answer** |
|---|---|
| Who keeps the contacts — the admin pair, or you alone? | **theo@ only.** Joan is treated as everyone else on this screen (`OWNER_EMAILS`, deliberately not `ADMIN_EMAILS`) |
| Hide first, or lock the database first? | **Hide now, lock the database next** — 712 is the hiding, 713 is the RLS |

**⏭️ 713 — the RLS lock, the agreed follow-up and the next build.** Today the
columns still travel to a rep's browser and are stripped in JavaScript; anyone
reading the network tab sees them. The columns must stop leaving Postgres for a
non-owner. **SQL runs BEFORE any dependent app change**, per the house rule.

⚠️ **Three things measured against the live database on 11 Aug, before anyone
designs this. The first revision of this very note got the third one wrong.**

1. **`community_partners_read` is `USING (true)`** — every signed-in user reads
   every row. And **RLS is row-level: it cannot hide a column.** "Column-level
   RLS" does not exist; the tool is a `GRANT`.
2. **A column-level `REVOKE` is silently inert on its own.** Supabase has already
   granted table-wide `SELECT` to `authenticated`, and a column revoke cannot
   subtract from a table-level grant — `information_schema.column_privileges`
   still showed `SELECT` on the revoked column. You must `REVOKE SELECT ON <table>`
   first, **then** `GRANT SELECT (cols)`. Measured on a scratch table, since
   getting this wrong ships a lock that locks nothing.
3. **A revoke does not make the columns arrive as null — it makes the query
   ERROR.** Under a per-column grant, `select *` came back
   `permission denied for table`, while an explicit column list succeeded.
   `load()` uses `.select('*')`, so a revoke alone would **break the partner
   roster outright, for everyone including Theo** (he shares the `authenticated`
   role — a grant cannot single one person out). *An earlier revision of this
   note claimed the app would keep working because the columns would simply be
   null. That was an assumption, and it was wrong.*

**So the shape that actually works is a VIEW**, not a revoke: a view over the
table that returns the four contact columns as `CASE WHEN auth.email() = <owner>
THEN … ELSE NULL END`, with the table's direct grant to `authenticated` removed.
Then `select('*')` keeps working, and a non-owner receives exactly the row shape
`maskPartner()` already produces — which is what makes 712 the compatible client
for it. Two things to settle when building it: the writes (a simple view is
auto-updatable, but not through the computed columns, so Theo's contact edit
needs an INSTEAD OF trigger or a separate grant), and whether the view takes the
name `community_partners` (table renamed beneath it) so no query in the app
changes at all.

**Left standing on purpose, recorded so nobody reads them as oversights:**
1. **A rep can still edit a partner's name and notes, and archive it.**
   Pre-existing, unchanged by 712, and not what Theo asked to close.
2. **`notes` is free text and everyone sees it.** Habitat's note legitimately
   reads "Galen is the bid contact" — the app cannot police prose, and reps need
   the programme rules. If a phone number is typed there it is visible.
3. **`pickPartner`'s rows show the name only** for a non-owner and are left
   without a "held by Theo" line — a chooser row is *supposed* to be a name, and
   a note on every row would be noise. The directory got the line because a
   directory with no contact reads as broken.
4. **CR-COM-014 is untouched and still open**: `cr-nbid`'s `loadPartners()`
   consumes the raw `load()` return, so a *confidential* partner's real name
   still appears in the New Bid payer select. Re-verified at 712 that it renders
   no contact field, so the hiding pass leaves no hole there.

### Build 713 — and the answer to "can reps still see the homeowner?"

**Measured, not reasoned** (`render_712rep.js`, the real black card in Chromium
signed in as nick@, live job shape). For a sales rep on a community job:

| Datum | On the card? | Where it comes from |
|---|---|---|
| Homeowner name | ✅ yes | `checklist.lead.homeowner_name` |
| Homeowner phone | ✅ yes | `checklist.lead.homeowner_phone` |
| **Homeowner email** | ❌ **no — and never was** | see the open item below |
| Job / property address | ✅ yes | `projects.address` |
| Renter (property-manager jobs) | ✅ yes | `checklist.lead.renter_name/_phone` |
| Which partner funds it | ✅ yes | the partner's `name` |
| Galen Curry, his email, his phone | ❌ hidden (712) | `maskPartner()` |
| Habitat's own postal address | ❌ hidden (712) | `maskPartner()` |

Homeowner data lives in `projects.checklist.lead.*` and `projects.address` —
a different table and a different code path from `community_partners`, which is
the only thing 712 touched. The table above is the proof, not the argument.

**⚠️ OPEN, found by that render, deliberately NOT folded into 713: the homeowner
EMAIL is not painted on the black card at all.** It is stored (14 of the 16 live
community jobs have one) and the pin/contacts area shows name and phone only.
This is **pre-existing** — the same render is red for it on the 711 artifact, so
712 did not remove it. It is a real gap for a rep who wants to email a
homeowner, and it is its own small build: decide where it belongs (beside the
phone, as a `mailto:`) and check the retail/insurance cards for the same
omission before shipping, because that block is shared.

**Recorded from Theo, 11 Aug, verbatim:** *"Reps don't send bids I do. Reps just
write the bid."* This confirms 712's send refusal is **correct behaviour, not a
restriction to soften** — a rep writes and saves the bid, and the sending is
Theo's step. Do not "fix" that refusal into a fallback.

### Build 714 — the hardening Theo picked, and what it deliberately does not do

**Settled 11 Aug, do not re-litigate:** app-only hardening, **not** the database
lock. The measured design for the lock stays in the section above so it can be
picked up later without redoing the work — **do not build it on your own
initiative.**

**⚠️ Say what 714 is, accurately.** It stops the app *asking* for a partner's
contact columns unless Theo is signed in. It is **not** a fence: `window.supa`
is a live authenticated client and `community_partners_read` is `USING (true)`,
so a signed-in user who opens devtools can still query the table directly. Theo
accepted that residual explicitly. Anyone who describes 714 as a lock is
overselling it, and the next person will trust it further than it goes.

**Closed by 714, with the evidence:**
- the exported `load()` handing out raw rows, and the raw-`CACHE` `onChange`
  handout (zero consumers, latent) — nothing to hand out now for a non-owner
- the module's cache surviving a user switch on a shared tablet
- a failed load poisoning the roster for the session (no directory, no picker,
  **no community bid could be created at all**)
- `save()` returning every column to Joan / Curtis / Scottie via a bare
  `.select()`
- **the bid-send refusal never firing for the 5 partners with no contact email**,
  which put the HOMEOWNER's address in the send box — live, and reachable today
- the homeowner email missing from the card (now shown when set)
- two jobs reading "Not recorded" while every other screen showed the name

**Still open, unchanged:**
- ✅ ✅ **STRUCK — shipped at 973.** `index.html` carries the fix and names the item in its own comment; the save half refuses to store a masked placeholder. *Original:* **CR-COM-014** — `cr-nbid`'s `loadPartners()` consumes `load()` rather than
  `list()`, so a *confidential* partner's real NAME still shows in the New Bid
  payer select. 714 does not touch it (a name is not a contact column) and it is
  its own item.
- `getRaw()`'s name is now slightly false for a non-owner (the row it returns
  never carried the columns). The comment at its call site still says "the
  UNMASKED row" — true for the owner, misleading otherwise. Worth a rename the
  next time that block is open; not worth a build of its own.
- The **renter** fields are captured by the bid form for property-manager
  partners and are empty on all 16 live jobs, as are all homeowner emails. That
  suggests the form is being skipped or worked around; worth watching before
  anything else is added to it.

---

## Live walkthrough of the retail CRM — 11 Aug 2026, builds 715–720

*Driven on **app.cardinalroster.com** as a signed-in rep (throwaway account, disposable
client, deleted afterwards along with the auth user — nothing left behind). Three
defects found and fixed; the rest is recorded here rather than quietly patched.*

### ✅ Fixed in this pass
- **715** — the PO badge rewrote every client profile ~120×/sec, forever. One-line guard fix.
- **716** — no AI Estimate door on a client profile; and no AI estimate was ever linked to its job.
- **717** — the global page's `Templates` button opened the AI builder; empty-state copy named a
  control (`+ Add project`) that does not exist.

### ✅ All three were fixed at 718–720 (Theo: "All")
1. ~~audit_sessions 403~~ → **718.** It was not a stray 403: the log had never recorded a single
   rep. Proved against production with a temporary non-admin JWT.
2. ~~deprecated Maps autocomplete~~ → **720**, via the data API, because the advertised replacement
   would have swapped the `<input>` out from under seven `.value` readers.
3. ~~two near-identical estimate buttons~~ → **719.** Now `＋ From a template ▾` and
   `📄 Blank estimate`. Wording was not specified; each string appears once and is easy to change.

### 📋 Still open
4. **`ai_estimates` is empty — the AI estimate flow has never been used in production** (0 rows).
   716 makes the job link work, but the feature itself is unproven against real photos and a real
   Gemini response. **Worth one supervised run before it is offered to reps** — this is the only
   item from the walkthrough that code cannot close.
5. **Places API (New) is now a live dependency** (720). It was verified enabled on the Google Cloud
   project on 11 Aug 2026; the legacy widget remains as a fallback, so the field degrades rather
   than breaks. If billing or API enablement ever changes, autocomplete quietly reverts to the old
   service rather than failing — which is the safe direction, but means the deprecation warning
   would return without anyone noticing.

### Rig notes worth keeping
- **Chromium's ClientHello is RST by the egress gateway on passthrough hosts.** Driving the live app
  from this container needs every request carried over Node's fetch stack (`context.route` +
  `route.fetch`), or the app boots into **Local mode** with `window.supabase` missing and none of
  the CDN scripts loaded. `TEAM` is `!!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)` — a
  blocked CDN silently downgrades the whole app to a single-browser toy, which looks like a bug in
  the app and is not.
- **`page.setContent` runs on `about:blank`**, whose opaque origin denies `localStorage`. Any module
  that stores a session (the AI builder does) needs a real origin — route a fake URL and `goto` it.

---

## ✅ SETTLED BY THEO, 11 Aug 2026 (build 727) — the punch tick box stays a ONE-TAP CLOSE

Raised at 725, after the five-photo refusal on the punch DETAIL sheet was made visible (it had been
writing its reason into `#puMsg` at the bottom of the sheet, off-screen on a phone). That surfaced an
inconsistency worth a decision: **the tick box on a punch CARD (`data-putoggle`, on the home/insurance/
community strips and the punch list) closes an item with no photo check at all — only the sheet
enforces `PHOTO_MIN`.** Asked whether the tick box should enforce the five too.

**Theo: "One tap close."** The tick box stays as it is. **Do not add the photo gate to
`data-putoggle`**, and do not "fix" the asymmetry as a bug — it is the intended shape: the sheet is
the considered close (it shows you the photo count as you do it), the tick box is the quick one.
`PHOTO_MIN` on the sheet is unchanged and still enforced.

---

## Loading states (Theo's list, 11 Aug) — where it stands after 728–729

Four items were proposed. Two shipped, one is mostly already built, two are open.

| # | Item | State |
|---|---|---|
| 1 | Splash while the app opens | ✅ **729** — `#crSplash`. See `FEATURES.md` |
| 2 | Buttons show `Saving…` during a write | ✅ **~80% pre-existing** (64 buttons already disable, ~50 already relabel); **728** closed the real gap — the seven money writers, none of which did |
| 3 | Skeleton screens on the dashboard | ⬜ **open, not started.** Ranked third: the data queries return fast; the pain was the document download, which 729 covers |
| 4 | Route transitions between views | ⬜ **open — recommended AGAINST.** Views here are shown by `display` or a class, with `hideAllViews()` in the middle; adding a transition means touching that path for every one of them, for decoration. High blast radius, no correctness gain |

### ✅ SETTLED at 729 — the splash shows no progress bar

Theo's note asked for one, *"even fake progress beats nothing."* Built without it, and
this is the reasoning, so nobody adds one back as a "missing" piece: the app cannot
know when the remaining bytes arrive, so any bar would be an animation timed to a
guess. When the guess is short it sits at 100% while nothing happens — which is the
exact "it's frozen" impression the item was raised to fix. The honest spinner is up
from first paint (608 ms on a weak signal) and lifts the moment the app is ready.
**`gate_729.mjs` asserts no percentage and no `<progress>` is present**, so this stays
decided rather than drifting.

### ⚠️ Two numbers in the original note were wrong — do not re-quote them

- **The file is 1,103,773 bytes Brotli, not 734 KB.**
- **There is no white screen.** The window is a HALF-PAINTED page. A fix aimed at a
  white screen would have been aimed at nothing.

Both were established by serving the real compressed document from a local http server
with `Content-Encoding: br` under CDP throttling. ⚠️ **Do not try to measure this
against the live site from a session container** — the egress gateway RSTs Chromium's
ClientHello, and an earlier attempt was timing Chrome's own error page.

---

## Contracts — what 730 closed, and what it deliberately left

**Closed at 730:** siding and gutter Construction Agreements now exist in the app and
`+ New contract` picks the trade. See `FEATURES.md`.

### ⬜ Still open, found during the 730 audit — none of these were in scope

1. **Two COMPANY_DOCS entries point at files that do not exist.**
   `docs/Cardinal_Window_Contract.pdf` and `docs/Cardinal_Gutter_Contract_Fillable.pdf`
   are referenced in `COMPANY_DOCS` but are **not in `docs/`** — only the roofing,
   siding and gutter masters are. Tapping either is a dead link. Either the two PDFs
   need uploading or the two rows need removing; **that is Theo's call, because the
   files may simply not have been pushed yet.**
2. **There is no WINDOWS contract in the app**, though `COMPANY_DOCS` advertises a
   window master and `EST_TYPES` has two window estimate templates (vinyl and
   Andersen). Adding it is the same shape as 730 — a `WINDOW_AGREEMENT` plus one
   `CONTRACT_TYPES` row — but it needs the print master first (see 1).
3. **`buildEstimate` never replaces `<head><title>`.** Every contract, invoice and
   work order the factory produces says *"Cardinal Roofing & Renovations — Estimate"*
   in the browser tab and in a saved PDF's filename. Pre-existing since the factory
   was written; cosmetic but wrong on three document types.
4. **The shared header block labels a contract "Estimate #" / "Estimate Date" /
   "Valid Through".** Same root cause as 3 — one base template serves estimates and
   agreements. Fixing it means parameterising `ESTIMATE_BASE_RAW`, which touches
   every document type, so it wants its own build.
5. **`api/estimate-to-contract.js` has no gutters, and neither does the table.** Its
   contract-number prefix map is `{roofing:'CRC', siding:'CSC', windows:'CWC'}` and its
   `WARRANTIES` map matches — and **`contracts_template_check` permits only
   `('roofing','siding','windows')`**, verified on the live schema. So the `contracts`
   table cannot hold a gutter contract at all. Widening the CHECK without the API
   branch is half a change, so 732 left both alone. That is the **other** contract
   system, not the client Contracts tab; it has 0 rows today, which is why nobody has
   hit it.
6. **`contracts` has no `signed_at`** — it has `homeowner_signed_at` and
   `contractor_signed_at`. 732 fixed the two health checks that assumed otherwise, but
   **check the column list before writing any new query against this table**; the
   recorded 18 columns are in `gate_732.mjs`, with the SQL that produced them.

### The title-order rule, so it is not "tidied" later

`Contract — <Trade> — <client>` keeps `isContractTitle` and **six** inlined copies of
`/^contract/i` unchanged. Trade-first (`Siding Contract — …`, the way estimates are
titled) would force all seven to grow, and the `insp` bucket in `renderProjectDocs` is
defined by NEGATION — so a missed contract does not error, it files itself under
Inspection Reports. **Do not reorder these titles.**

---

## Left out of 738–741 deliberately — 12 Aug 2026, build 741

Theo's five-item UX list (toasts, empty states, confirmations, form validation) shipped as builds
733–741. Three things were scoped out rather than forgotten:

1. **Two phone fields the 739 normaliser does not reach.** `cr-crew`'s `contact_phone` and
   `cr-cpartners`' `contact_phone` are `type="text"`, and the delegated listener keys on
   `type="tel"`. Email solved the same problem at 740 with `isEmailField()` matching on
   name/`data-f`/`data-field`/`id`; **the phone branch could take the same treatment** — one
   `isPhoneField()` beside it, no new listener. Not done because 741 was already touching six
   modules.
2. **The asterisk is still not one convention.** 741 marked the six unmarked `required` fields and
   left the five pre-existing conventions alone — including cr-sol's amber `#fcd34d` and cr-ci's
   pink `#f08a90` asterisks. **Unifying them is a theming decision and wants Theo's eye**, not a
   validation build's opinion.
3. **`novalidate` was applied to exactly two forms** (`#cpForm`, `#cpropForm`) — the two proven to
   have unreachable messages. **Other native forms were not audited for the same class.** The test
   is cheap: register a `submit` listener and assert it fires (see BUG_CLASSES 33).

**Still standing with Theo from earlier sessions**, unchanged: the two dead `COMPANY_DOCS` links
(`Cardinal_Window_Contract.pdf`, `Cardinal_Gutter_Contract_Fillable.pdf` — both 404); whether the
signing→Approved notification should be gated to Curtis; the permit / municipal-inspection tracker.

---

## 🔴 Theo's action — swap two contract masters (12 Aug 2026, build 750)

**The app does not contain the roofing Terms and Conditions. It points at a PDF.**
`ROOF_AGREEMENT_TERMS` states the terms are *"reproduced verbatim in ☰ Menu → Company
Documents → Roofing → Construction Agreement (Master)"* — that is
`docs/Cardinal_Roofing_Contract.pdf`, which ships publicly. **Every roofing agreement the app
generates incorporates that file by reference**, so until it is replaced the old wording is
the binding wording. Nothing shipped in `index.html` changes this.

Theo's instruction, 12 Aug, verbatim: *"These are always included with a replacement roof"* —
correcting his own earlier "new-only" answer.

| File | Where | State |
|---|---|---|
| `docs/Cardinal_Roofing_Contract.pdf` | p3, clause 8 | ❌ still excludes roof jacks and flashing |
| `docs/Cardinal_Gutter_Contract.pdf` | p3, clause 8 | ❌ **identical clause** — its T&C is a copy of the roofing one |
| `docs/Cardinal_Siding_Contract.pdf` | — | ✅ clean; its clause 8 covers sheathing, framing, fascia and trim and never names jacks or flashing |

⚠️ **The gutter contract carrying the same clause was not known before this session.** Nothing
links the two documents and the app never mentions the gutter T&C, so it is easy to fix the
roofing one and believe the job is done.

**Revised review copies were produced and handed to Theo** (roofing + gutter, page 3 only):
former clause 7 (bond insurance premiums) removed, clause 8 reworded and renumbered to 7, old
9–16 renumbered to 8–15. Verified: clauses 1–6 byte-identical to the original, old 9–16
reproduced verbatim, pages 1/2/4/5 untouched, page count unchanged, new text clears the
signature block by 56pt (roofing) / 70pt (gutter). **The originals in `docs/` were deliberately
NOT overwritten and nothing was committed** — replacing a signed-contract master is Theo's call.

**What unsticks it:** Theo approves the review copies, or edits the originals himself at
`Cardinal Roofing Contracts` on his Desktop; then the two files in `docs/` are replaced. A
matching HTML version of the revised Terms was sent at the same time and says the same thing.

### ⚠️ If these PDFs are ever patched again, read this first

Two ways the first attempts silently damaged a legal document. **Neither was visible at page
size**; both were caught only by a clause-by-clause text compare against the original.

1. **Re-rendering existing text corrupts smart punctuation.** Redrawing clause 9 through
   base-14 Helvetica turned `Company’s` into `Company·s` — U+2019 is not in that encoding.
   **Never re-render clause text that is not changing.** The shipped approach restrikes only
   the clause NUMBER and leaves every original glyph where it is.
2. **`apply_redactions()` deletes any glyph whose box merely INTERSECTS the rectangle.** A
   6.6pt span is ~7.9pt tall on 8.4pt leading, so padding a number's box by 0.5pt reaches into
   the line below — which also starts at x=40. That turned **"MIDNIGHT" into "DNIGHT"** in the
   cancellation clause. Clamp the box bottom to just above the next line's top.

A third, cosmetic: every clause on that page is **justified**. Setting the replacement
ragged-right left one paragraph visibly unlike the fourteen around it — the render caught what
the text compare could not.

---

## 🟠 AccuLynx migration — gates 1–2 RUN, blocked on a stale password (13 Aug 2026)

**The API key works and the records are fetched.** All **166 in-scope jobs** are on local disk
(lead 3 · prospect 81 · approved 41 · completed 8 · invoiced 12 · closed 21; cancelled and dead
left behind per the 11 Aug decision). Nothing has been written to Cardinal.

⛔ **The one blocker: `CARDINAL_PASSWORD` is stale** — Supabase auth returns
`400 invalid_credentials`. The email is right and there is no whitespace/quoting problem. Refresh
it and gates 3 (dry run) → 4 (5-client pilot) → 5 (real run) proceed exactly as the runbook says.

✅ **Files AND notes are a confirmed NO-GO — one gap, one decision (13 Aug).** AccuLynx's API is
upload-and-audit, not read. All six file read routes 404 on every job. And **806 job messages across
156 of the 166 jobs (94%)** are equally unreachable — twelve endpoint spellings tried, all 404, no
v1/v3, no swagger spec. `/jobs/{id}/history` answers (6,191 actions) but records only *that* a note
happened, never the words; `custom_fields` is one `Policy Number` field with zero values.
⚠️ **`lead.notes` is therefore empty on all 166 imports** — `map_job()` reads
`detail.description`/`detail.notes`, neither of which exists here, and unlike the address bug there
is nothing to map from.

### ✅ SETTLED (Theo, 13 Aug): front door only — no scraping, no browser automation
Theo read the terms and ruled it out. Standard SaaS agreements restrict automated bulk extraction,
bypassing what the reporting UI exposes, and unthrottled loops — **and rate-limiting a scraper does
not move it out of that category.** The stronger argument is practical: an extraction that trips
AccuLynx's security flags **locks the account**, destroying the only copy of those 806 messages
mid-migration. ⚠️ **The runbook previously RECOMMENDED a browser-automation pass; that text is now
corrected. Do not propose it again.**

Permitted routes, in order: (1) an **offboarding data-export request** — "we are migrating off, I
need a complete export including job messages and files"; (2) **ask for written permission** to
extract programmatically, since a contractual restriction can be waived by the counterparty, and a
yes makes the fetcher legitimate; (3) ask whether **another API tier** exposes message/file reads;
(4) **AccuLynx's own Reports/CSV exports**, which are sanctioned by definition. If permission is
granted, build it at their documented rate limit, resumable, at a pace that cannot trip a flag.

**Manual fallback, scoped so it is tractable:** live work (Approved+Completed+Invoiced) is 61 jobs /
378 messages; the realistic scope is the **41 Approved jobs = 249 messages, an afternoon**. Prospects
are 81 jobs / 317 messages and mostly never became work. A person reading their own screen is fully
permitted.

⛔ **Do not cancel the AccuLynx subscription until this is settled** — the messages and files exist
nowhere else.

⚠️ **Running the pipeline for real found FIVE faults that would have wrecked the migration**, all
fixed and negative-controlled (PR #281; `BUG_CLASSES.md` 44–45): pagination sent a parameter
AccuLynx silently ignores (`recordStartIndex` → `pageStartIndex`; an unknown parameter returns page
one with HTTP 200) · `pageSize` is capped at 25, not 100 · the site address is `locationAddress`,
so **every client imported blank** — which also silently disabled duplicate detection · rep `user`
fields are unexpanded `{id,_link}` refs, so **every client landed on the admin** · and that
fallback was silent, because the warning keyed off a name that was also empty. Both harnesses were
green throughout: their fixtures were invented rather than observed.

**Dry run after the fixes** (driven through the Supabase connector with all writes stubbed — a
substitute for gate 3, not a replacement): 164 new · **2 real collisions** · 0 unmappable ·
0 warnings · PO 1044–1207 · 7 jobs carrying insurance data.

**Two decisions waiting on Theo:** the 2 collisions (Karrie Johnson 804 E Center St, Dan Thompson
2825 Arden Ave — both already in Cardinal; default is attach, not duplicate), and **two AccuLynx
test records** (`test test`, `Team Test`, both at 5735 Webster Street) that would otherwise import
as clients.

Settled 11 Aug and unchanged: everything imports as **retail** and is sorted to insurance/community
afterwards (insurance data rides along in `lead.insurance`); **Dead/Cancelled stay behind**; a
name+street-number match attaches to the existing record instead of duplicating.

After the records land: **Phase C sorting** over the Supabase connector as reviewed SQL. Gate
sequence and anti-goals live in the runbook; session detail in `HANDOFF.md` (13 Aug section).

## From the 13 Aug retail-lifecycle QA (builds 766-773)

Ranked. Two shipped at 772, two more at 773; the rest are open.

⚠️ **STRUCK — the old item 1 was WRONG, do not rebuild it.** It read "the homeowner signs and the job sits
in Prospect until a human drags it to Approved". The E2E drive (`drive_lifecycle.mjs`, 13 Aug) proved the
opposite with write capture: **all three signing paths already auto-advance** — the in-person pad
(index.html:22607), the contracts-table editor (36132) and the remote share-link (`api/clientsign.js`, which
also emails rep+admin) each move the job to Approved, and the in-app paths buzz Curtis. The invoice email
likewise auto-advances to Invoiced (22511). Anyone re-proposing "wire the signature to the stage" is
describing code that ships today.

1. ~~**Auto-advance Approved → Scheduled when the build day is booked**~~ — **✅ STALE, already built
   at 783 and closed by 998 (verified 23 Aug).** `__apptMayAdvanceStage` advances Approved → Scheduled
   when a `kind:'job'` appointment carrying a `project_id` is booked, wired into the one appointment
   writer (`adb.create`, plus `adb.update` since 998) and reached by 972's "Get on the calendar". The
   historical gap this item describes ("build Aug 20" showing with the stage lagging) was the two job
   appointments being **orphans with no project_id**, so the guard returned early — 998 closed it by
   requiring a job on every build-day booking. Proven in a Chromium spy: it fires ONLY for the Approved
   build day, and stays silent for a drop, an orphan job, a Lead job and a Completed job. Nothing to build.
2. ~~**Split the intake form**~~ — **✅ split done at 782, enforcement completed at 1005.** The `*` on
   First/Last/City/State/Zip was label-only when the E2E was run, but 782 had already split the form
   (essentials up front, the rest behind "More detail") AND made those six + phone-or-email enforce in
   JS. The two starred questions it still let through were **Claim Type** (defaulted to 'unknown' — 17
   of 57 leads had none) and **Lead Source** (26 had none); **1005 enforces both.** Work-type stays
   behind More detail by choice; not a bug.
3. ~~**Stale-estimate line in the daily digest**~~ — **✅ DONE at 784.** "PHASE 3 — the 11:00 digest
   chases estimates": each rep gets their own list (client, amount, days since last touched) for
   anything sent. Already shipping.
4. ~~**One writer for the address**~~ — **✅ DONE at 1004.** It is stored twice: `projects.address`
   (flat) AND `checklist.lead.location.*` (parts). The parts are written only at retail creation and
   never updated on edit, and the **Construction Agreement (542) was the one reader that read them
   unconditionally** — so an edited address showed new on the map and old on the signed contract.
   1004 makes `pr.address` the single authority the contract defers to: the split boxes fill only when
   they reconstruct the current `pr.address`, else the flat address prints on `[STREET]`. Every other
   reader (map, directions, work order, recents) already preferred `pr.address`, so the parts can no
   longer surface a different address anywhere. (Also fixed the latent blank-contract-address for
   profile-created leads, which never had the parts.)
5. **Invoiced is a silent stage** — fold "invoiced and unpaid past 30 days" into the Friday owed email.
6. **Dialog diet** — *in progress, first slice done at 1006.* The E2E counted **11 native dialogs** (4
   confirm / 3 prompt / 4 alert) on one clean lifecycle; worst is invoice create→send: alert, prompt,
   confirm back-to-back. Native dialogs in the installed PWA look like system errors. The toast + undo
   machinery already exists (crToastOk/crToastErr, window.CardinalUndo since 186), so each slice is
   *routing* through it, not new UI.
   - ✅ **1006 — stage-arrow confirms → one tap + 5s Undo (deferred commit).** The forward/back arrows on
     the profile no longer confirm; the move is held for the Undo window so an undone tap never writes and
     never emails the team. ⚠ Note for future slices: `setStage` emails Curtis on Approved/Completed, so a
     one-tap replacement there must DEFER the commit, not commit-then-revert.
   - ⬜ remaining: **alert() → toast** sweep (218 alerts app-wide; the invoice create success/guard are the
     lifecycle ones), and **prompt() → inline field** (the send-email prompt defaulted to the client's
     email; title prompts). Both want their own build; the send-prompt one is visual (preview first).
7. ~~**Remote signature buzz parity**~~ — **✅ DONE at 1007.** `api/clientsign.js` advanced the stage and
   emailed the rep, but never told Curtis to schedule + order materials the way in-person setStage does on
   the move to Approved. clientsign is unauthenticated (share token = credential) so it can't call the
   session-gated `/api/notify`; it now sends the same "schedule + order materials" alert to Curtis + admins
   through the Resend account it already uses. Also made the stage advance forward-only (a job already
   scheduled is no longer pulled back to Approved, and Curtis is only alerted on the real transition).
   ⚠ Email parity only — full push/SMS parity would need a shared notify core (deferred; no precedent for
   `api/_*` shared helpers here, and the reliable channel is email since push_subs is mostly empty).

DONE at 772: emoji removed from the two outbound stage-email subjects; `createContractForCurrent` no longer
returns in silence when no project is loaded.
DONE at 773: `notifyTeam` dedupes its recipient list — the "Job complete" buzz listed an admin rep twice and
`/api/notify` mails the list verbatim, so theo got every buzz double on his own jobs. And the last two emoji
subjects (estimate-approvals `✍️`, chat @-tag `💬`) are plain text.

**Verified NOT a bug** (do not re-report): "Log Collection missing" — `#miCollBtn` is correctly gated on
admin+production; its absence in the harness was the mock session. Also from the E2E: the Production landing
shows box COUNTS, not per-job chips — the chips (`Needs scheduling` → `Materials?` → `Build <day>` →
`1 punch item` → `Ready to invoice`) live one tap deeper in the box panes and all five were seen rendering
in order; and `#pNewContractBtn` only opens the trade flyout — the contract is created by the `[data-ctpl]`
option inside it, so a harness clicking the toggle and expecting a write is testing its own mistake.

---

### Opened at 806 — one action for Theo, one question deferred

**ACTION REQUIRED BEFORE THIS DEPLOYS: set `ANTHROPIC_API_KEY` in Vercel env.** Without it
`/api/librarian` returns a 500 naming the variable, and the Library's assistant stops answering.
`GEMINI_API_KEY` **stays** — `caption.js`, `organize.js`, `analyze.js` and `sol.js` still need it.

**Deferred, deliberately: the other four Gemini routes.** 806 moved the librarian only, because it is
the one route where a wrong answer is expensive — staff act on the code sections it writes. Captioning,
tagging and organising photographs are cheap, high-volume and forgiving; moving them is a cost decision,
not a correctness one, and nobody has asked. **Do not "finish the migration" without a reason.**
`caption.js` carries the same four-rung ladder the librarian just shed — if it is ever moved, that
ladder goes with it.

**Worth measuring after a fortnight of real use:** whether `output_config.effort:'medium'` is the right
setting. It is the latency lever and it is the only knob — `high` if answers get sloppy. Theo's ears and
eyes are that gate, not a harness.

---

### Opened at 807 — the Exterior Visualizer

**Theo's two actions, in order:**

1. **Switch the Spark on** — `spark/VISUALIZER_SETUP.md` §1–4 (ComfyUI + SAM 2 + the inpainting
   graph, then `visualizer_worker.py`). Until this is done, queueing works and nothing renders.
   Jobs sitting at `queued` is the correct behaviour, not a bug.
2. **Optional, later: give it its own Vercel project** scoped to `visualizer/`, then set
   `window.CR_VISUALIZER_URL` (or edit the one line in the hub handler). Only then is the CRM
   absent from that domain at every path. Until then `/visualizer/` on the main project is a
   separate *file* but the same *deployment*.

**Settled and not to be re-litigated:** pre-render before the appointment (Prep queues, Present
only shows what is already made — **no Generate button in Present**); OC roofing from `oc_colors`,
real brands elsewhere from `materials`; a person approves every render before a customer sees it.

**Deliberately still open: why Studio keeps asking for a sign-in.** 807 gave the *new* app its own
`storageKey` and explicit `persistSession`, which is the right shape — but that is a design choice
for a new file, **not a diagnosis of Studio**. Nobody has reproduced Studio's re-login yet. Do not
"fix" Studio by copying 807's client options and claiming the cause; measure it first.

**Not measured yet:** whether the composed roof prompt actually produces a convincing shingle. That
needs the Spark running and Theo's eyes on a real render — it is not something a harness can judge.

**Struck at 808** — "queued with no explanation" is closed. The Visualizer now distinguishes
*never connected* from *asleep* from *just queued*.

**Struck at 809** — item 1 is done. **The Spark is on and rendering.** "Not measured yet: whether
the composed roof prompt produces a convincing shingle" is also closed, by Theo's eyes on three
renders of the same 43 KB photograph: grey smear → texture with the wrong colour → correct. The
prompt leads with colour and takes the first sentence only.

#### Still open after 818 — in the order they will bite

1. **No stale-claim recovery.** A job claimed by a worker that dies stays `running` **forever**.
   A `claimed_at` older than N minutes should return the row to `queued`.

   ⚠️ **Pick N from a measured ceiling — and the 12m13s figure recorded here earlier is NOT one.**
   That render did take 732.8s and come back correct, but an hour later the Spark turned out to
   have had **three workers** polling the same queue since the previous evening, running FLUX
   concurrently on one GPU. I had attributed the 12 minutes to a cold ComfyUI reloading three
   models; GPU contention is at least as likely and probably more so. **It is not a clean
   measurement of anything.** Re-take it with one worker running before sizing any timeout on it.

   What still holds regardless: comparable warm renders are 30–190s, a first render after real
   idle IS genuinely slower, and **a five-minute reclaim could kill a good render and silently
   charge the Spark for a second one.** The reclaim must also say what it did rather than quietly
   re-queueing.

   Build 820 removed the urgency without fixing the underlying gap: a running job now shows a live
   elapsed clock and the banner explains that a long render is normal, so nobody is left guessing.
   The row can still be stranded forever if the worker dies — that part is still open.
2. ~~**Siding has never once been applied by a render.**~~ **Struck 15 Aug** — job `88ebd369`
   applied roof AND siding, from a CompanyCam import, in one render. It also surfaced the colour
   bug below, which is what a first real test is for.

   **NEW, and it needs Theo's eyes on the Spark:** the swatch never reached the pixels. `denoise=1`
   rebuilt each masked region from noise, so colour rested entirely on a prompt that a distilled
   model at cfg 1 largely ignores — Evergreen Mist came back tan. Fixed by `tint()` (a
   luminance-preserving recolour toward the selection's hex, before the diffusion pass) plus
   `denoise` at 0.82. `gate_tint.py` proves the arithmetic; **it cannot prove the render looks
   right.** Restart `visualizer_worker.py` on the Spark and press **Render again** on that job.
   If the roof over- or under-shoots, dial it without editing code:
   `TINT_STRENGTH=0.7 FLUX_DENOISE=0.9 python3 spark/visualizer_worker.py` — higher denoise gives
   the model more freedom and weaker colour; higher tint strength pushes harder toward the swatch.
3. **No render has used a CompanyCam import at full resolution.** 815 fixed the rendition order
   (it had been taking the annotated web copy); the fix is merged and unproven on a real render.
4. **~~Run the sweep.~~ ❌ DECIDED 26 Aug 2026: DO NOT.** Measured, not estimated: **184 unreferenced files, 60 MB** (219 files / 97 MB total under `visualizer/`, 35 referenced, 53 `design_jobs` rows). The "~60 files / ~20 MB" carried here for months was **wrong by 3x**.
   **Still not worth doing.** 60 MB is pennies of Supabase storage against 184 irreversible deletes, and `sweep_visualizer.py` has never been run or validated — an unvalidated instrument pointed at a delete is the worst combination this project has. The orphans are genuinely dead (newest is 19 Aug, nothing in flight); they are just harmlessly dead. **Revisit if visualizer storage passes ~500 MB or storage cost appears on a bill.** ⚠️ The orphan count above came from fuzzy `LIKE` matching of storage paths against `design_jobs.source_path/render_path/preview_path` — good enough to SIZE the problem, **not good enough to delete on**.
   `python3 spark/sweep_visualizer.py` on the Spark is a dry run and prints what it would remove;
   `--apply` removes it. The 24-hour age floor is what protects an import that has not been
   rendered yet — do not lower it to be tidy.
5. **Item 2 above from 807 is still open** — its own Vercel project scoped to `visualizer/`. Until
   then it is a separate *file* on the same *deployment*.

---

## The Visualizer's two engines (822, 15 Aug 2026) — what is open

**Settled, do not re-litigate.** Neither engine wins. Spark is the exact-colour engine and cannot
leave its mask; Gemini is the sharp one and will repaint what it likes. The rep picks per render,
and **Spark is the default** — Theo's own framing applies: a wrong colour gets thrown away, a
quietly repainted siding reaches a customer. Customer photographs may go to Gemini
(Theo, 15 Aug, explicit) for **presentation only** — never claims, inspection reports, supplements
or CompanyCam. The altered-evidence fence is untouched.

### ✅ A PARTIAL RENDER NO LONGER LOOKS LIKE A CLEAN ONE (823, 15 Aug)

A job could finish `done`, upload a render, leave `error` null — and never have
touched a surface the rep picked. `skipped` lived only in a **log line on the
Spark box**. See `BUG_CLASSES.md` **class 46**, which is what this is.

- **`achieved._skipped`** — `{surface: reason}`, two reasons because they tell a
  rep to do different things. No migration: an underscore meta key beside the
  existing `_worker`.
- **"Show what it found"** — the stored masks overlaid, for the *partial* find
  (main roof yes, garage no) that is not a skip and so nothing else reports.
  **The worker has uploaded those masks since the first build; the browser read
  them only to DELETE them.**
- ⚠️ **Absence is UNKNOWN, not "none".** Gemini jobs and pre-`wb-2026-08-15.4`
  workers have no key and are given no claim.
- **Worker must be restarted** for `_skipped` to appear — the browser half is
  live on deploy but has nothing to read until the Spark runs `.4`. Older jobs
  never backfill, by design.

### ✅ `next_build.py` WAS ANSWERING WITH A NUMBER 13 BUILDS IN THE PAST (823)

It parsed `index.html` only. **Builds 810–822 were all spent on
`visualizer/index.html`** while `index.html` sat at 808, so it reported *"next
safe: 810"* — the exact collision it exists to prevent. Stamps now come from
every artifact in `STAMPED`; the self-test stubs `git`, exercises `index_at()`
itself and **fails against the pre-fix version**. It answers **823**.

⚠️ **Adding a new stamped artifact means adding it to `STAMPED`.** A file that
carries a build stamp and is not listed is invisible to the collision check —
which is this bug, exactly.

### ✅ THE ROOF MASK IS FIXED (wb-2026-08-15.5) — restart the worker

`find roof` grounds on **`"shingles"`** and `segment roof` returns per-object masks.
Verified by LOOKING at the sheet, not by a coverage number: the gold covers both roof
planes with clean edges and no bleed. `roof` found the garage band only; `roof of a house`
found the whole building.

**The siding needed no change.** `exclusive()` already subtracts roof from siding — the
gable rendered red because nothing contested it. Fix the roof and the siding follows.

⚠️ **`segment()` no longer takes `images[0]`** — it unions every returned object. That had
to land in the same commit as the flag; without it a found second plane is silently
discarded and renders identically to one never found.

**Windows and gutters have the flag but NOT a verified phrase** — many real objects each,
so per-object masks are motivated, but no sheet backs it. Windows found ONE window at 0.2%
and gutters found something at the far right that is probably not a gutter. Probe them
before trusting either. Siding stays merged (12.6% vs 12.8% — nothing to gain).

### ~~⚠️ THE MASKS ARE WRONG ON A REAL HOUSE~~ (found 15 Aug by 823's overlay, roof half CLOSED)

Theo's Autumn Red render, first real use of "Show what it found": the **roof**
tint covered a band across the garage roof only, and the **upper gable roof read
as siding**. The colours were landing perfectly — on the wrong regions.

**This is the next build, and it is a WORKER change** (`segment()` / `exclusive()`
in `visualizer_worker.py`), not a browser one. 824's solo makes it diagnosable;
it does not fix it.

⚠️ **And it is why `achieved` drift must never be quoted as validation** — that
render scored **drift 7 / drift 3**. See `BUG_CLASSES.md` class 47.

**Open, in the order they matter:**

1. ~~**Nobody has rendered through the Gemini path yet.**~~ — **HALF CLOSED 15 Aug.**
   Theo rendered through it. It failed: **HTTP 200, 8 seconds of real work, then no image and no
   text.** That is not a missing model or a bad key, so **the deployed `GEMINI_API_KEY` DOES have
   image model access** — the standing unknown since 822 is answered.

   **What is still open is why it declined.** 824 added `finishReason` to the error, which was
   being read from the response by nobody; the next attempt will name `IMAGE_SAFETY`,
   `PROHIBITED_CONTENT` or whatever it actually is instead of the bare *"The model returned no
   image"*. If it comes back `IMAGE_SAFETY`, that is a model policy on photographs of real
   property and is **not fixable from here** — it would make Gemini unusable for this product and
   the Spark becomes the only engine.
2. **The composite is unbuilt, and blocked on one number.** Compositing Gemini's pixels back through
   our masks is what turns the DO-NOT-TOUCH list from a request into a constraint. It is only sound
   if the render is registered with the original. `scripts/align_check.py` answers that — it needs
   the original drone frame and one Gemini output **as files**; pasted chat images do not reach
   disk. Verdict RECOMPOSED kills the composite; ALIGNED or SHIFTED green-lights it.
3. **The mask-confirm step** — per-plane masks (`Sam2Segmentation.individual_objects=true`), a
   `review` stage, tap a plane in or out, then paint. This is the Spark's only real weakness and it
   is the fix Theo's own doctrine points at (*AI proposes, a person confirms* — The Walk). It is the
   better spend than the composite if the alignment number comes back bad.

   **⚠️ Build 823 did NOT close this — it closed the half that was free.** The *diagnostic* now
   exists: a surface that was skipped entirely says so (`achieved._skipped`), and **"Show what it
   found"** overlays the stored masks so a partially-found plane is visible. What is still open is
   the *intervention* — 823 lets you SEE that the garage was missed, and gives you no way to
   include it except re-rendering and hoping. Confirm-before-paint also needs a real pause in the
   job, which the queue has no stage for today.

   It is also cheaper than it was: the masks are already uploaded, already selected, and now
   already drawn. The remaining work is per-plane segmentation and a `review` status.

   **⚠️ AND IT IS NOW BLOCKED ON A PROBE, NOT ON A DECISION.** Theo, 15 Aug:
   *"Why can't we do the siding by walls? With clickable circles like hover does it?"* —
   which is this item, and which the schema comment has wanted since day one.

   The root cause is written in the worker already: **Florence2 grounds "house wall" as a
   BOX and SAM 2 fills it**, so the siding mask is a filled rectangle over the elevation.
   `exclusive()` can only claw back where a *competing* mask exists — the roof box caught
   the garage roof and missed the gable, so nothing contested the gable and siding kept it.

   `individual_objects` is **`false` on all four `Sam2Segmentation` nodes**; flipping it is
   one edit. But it splits by **what Florence2 grounded**, not by planes, so if Florence2
   answers with one box the flag changes nothing. **Nobody has looked.**

   `spark/probe_planes.py` answers it — segmentation only, queues nothing, writes nothing,
   runs both ways and counts, and leaves a `_SHEET.png` per surface with each plane tinted
   and numbered. Run it before building any UI:

       /home/cardinal2023/ComfyUI/venv/bin/python3 probe_planes.py --job 80ebeb54

   **✅ IT RAN, 15 Aug, on job 80ebeb54 (1280x720 working frame). The flag is not the
   answer.** Every surface came back as ONE object, merged and split alike — Florence2
   grounds each phrase as a single box, so `individual_objects` has nothing to split.
   Three builds of tap-a-plane UI avoided by ten minutes of probe.

   **The bigger finding is that the ROOF is barely being found at all**, and that is the
   actual cause of the bad render, not a greedy siding mask:

   | phrase | coverage | box (y) | what it actually found |
   |---|---:|---|---|
   | `roof` | 2.0% | 199–289 | the garage band only |
   | `roof of a house` | 12.6% | 117–428 | **the whole building** — byte-identical box to `house wall` |
   | `shingles` | 3.1% split / 1.2% merged | 117–289 | reaches the gable — best so far |

   `exclusive()` already subtracts roof from siding and did; the gable rendered as siding
   because, as far as the pipeline knew, the gable WAS siding. Nothing contested it.

   ⚠️ **The flag IS phrase-dependent** — worth correcting, because it was written off after
   one test. With `roof` it changes nothing; with `shingles` it takes 1.2% to 3.1%.

   ⚠️ **Coverage % cannot tell a good mask from a bad one** — `roof of a house` scored 6x
   better than `roof` and found the whole house. That is BUG_CLASSES 47 again, one level
   out: a number that counts pixels cannot say WHICH pixels. Judge on the sheet.

   **If no phrase lands it, the answer is a different segmenter, not a different word** —
   SAM 2's automatic mode (no text prompt, segment every region, let a person tap the
   ones that are roof) removes Florence2 from plane selection entirely and is much closer
   to what Theo described. Bigger change; the version that actually works.

   ⚠️ **`segment()` takes `images[0]` only.** The moment the flag is flipped for real, the
   worker silently keeps the first mask and discards the rest. That is a one-line change and
   it must land in the same commit as the flag.
4. ~~**Evergreen Mist's swatch hex is probably wrong**~~ — **CLOSED 15 Aug.** Sampled from the 2026
   Color of the Year sheet and applied to production; the whole line followed from OC's own data
   sheets. **The one live half of this item survives and still catches people:** the tray freezes
   the hex **at pick time**, so after any catalog change you must **reload the Visualizer and
   re-pick the colour** or the old value renders. Only affects the Spark engine — Gemini takes
   words, not a hex.
5. **`comboKey()` does not include `engine`.** The same picks on the two engines read as a duplicate,
   which only ever produces a slightly wrong warning ("Rendered before…") — a queued duplicate is
   still correctly refused. Left alone on purpose: three call sites in a file with no test runner,
   for a cosmetic string.

**Still true from before and unchanged:** no stale-claim recovery on the Spark side; ~60 unreferenced
files in `photos/visualizer/` awaiting a sweep; the 12m13s render ceiling is contaminated by three
concurrent workers on one GPU and the clean recolour baseline is ~14s.

---

## The colour catalog — `hex_verified` finally means something (15 Aug 2026)

**Settled by Theo, 15 Aug, and it is the right split:** *"With siding I believe
using gemeni's is good enough. I agree with you on the shingles tho."*

The two fail differently, which is why one is loaded and one is not:

- **Siding is extruded vinyl** — one flat pigment. A named colour is a single
  colour and an estimate lands close. **Mastic Carvedwood is loaded: 24 colours,
  `hex_verified = false`.**
- **Shingles are a granule BLEND** — twenty stone colours averaged by the eye at
  twenty feet. The two available sources disagree by up to **47 of 255**
  (Driftwood `#8A8578` vs `#5E564D`), and Aged Copper is **green in one and
  brown in the other** (`#5E6B5C` vs `#524C44`). That is not calibration drift,
  it is a disagreement about what colour the thing is. **No shingle hex changes
  without a photograph of the physical board.**

**The measurement that makes this the priority:** the render pipeline lands the
requested hex at **drift 2–4 of 255**. The catalog disagrees with itself by up
to 47. **The catalog has been the dominant error term for some time — by roughly
10–20×.** Any further tuning of tint, denoise or prompt is spent on the smaller
half of the problem.

`hex_verified` existed on both `materials` and `oc_colors` and was **false on all
97 rows** — it had never meant anything. It means this now:

| | |
|---|---|
| `false` | estimated. Good enough to browse and to render a concept. |
| `true` | **sampled off the physical chip.** Do not set it for anything that was not. |

**Open:** photograph the OC shingle board flat, in daylight, no flash — the only
thing that resolves the four disagreements above. Nothing else in the pipeline is
waiting on anything.

⚠️ **Availability is not asserted by the catalog.** It holds a palette, not an
order sheet. Which colours a given profile can actually be ordered in is a
supplier question.

⚠️ **Three colour names now exist in two Mastic lines with different hexes** —
Rugged Canyon, Pebblestone Clay, Montana Suede (~33–45 apart). Deliberate:
overwriting the originals would silently change a colour that may already sit
behind a saved render, and `design_renders` does not record which hex built it.

---

## ✅ CLOSED 15 Aug — the shingle swatch board. Do NOT re-raise it.

An earlier entry in this file told you to photograph the physical OC swatch
board. **That advice was mine and it was wrong.** Theo, verbatim:

> "Shingles colors can vary by shingle sample boards quite a bit. It will never
> be spot on. Can we just use OCs pdfs"

and, on what the render is actually for:

> "So with this being just a rendition of a color of a roof on their own house,
> it should look amazing like the oc catalogues because there is no
> imperfections. When these shingles get installed they dont look dead on like
> the catalogues. Which is OK."

He is right, on both counts. A board photographed in a driveway carries its own
lighting, white balance and camera profile; the manufacturer's published sheet
is consistent, is defensible ("that is OC's own colour"), and is what the
customer is looking at anyway. **The reference is the catalogue rendition.**

### The method, settled — copy it for any future sheet

**Sample the LIT granule field: the median of pixels at or above the 60th
percentile of luminance.** The naive mean of a shingle photograph includes the
keyway shadow between courses and lands **20–30 of 255 too dark** — every roof
would render muddy. Verified across both sheets.

**Pair swatches to names by GEOMETRY, never by eye.** The Duration sheet's page
3 is a 3×5 grid of 170×55pt images with the name typeset directly beneath each,
so all 15 paired mechanically. `scripts/pdf_matrix.py` is the positional
extractor. Naming by eye is what put Portsmouth Blue into Carvedwood.

### What this bought, in one morning

| | before | after |
|---|---:|---:|
| `oc_colors` rows | 31 | **34** |
| verified hexes (whole app) | **0 of 97** | **21** |
| Mastic Carvedwood | 10, one of them fictional | 40 with official codes |
| gutter colours | 5 generic | 23, inherited from siding by code |

⚠️ **The catalog was the dominant error term all along, by 10–20×.** The
renderer lands a requested hex at drift 2–4 of 255. Driftwood was **41** out of
255 wrong, on a volume colour, and the pipeline was painting it faithfully.
Three Duration colours (Sand Castle, Slatestone Gray, Colonial Slate) were
absent entirely and could not be offered. **None of this was reachable by tuning
tint, denoise or the prompt.** Before touching the renderer again, ask whether
the catalog is the thing that is wrong.

### Still open

- **13 of 34 `oc_colors` remain estimated**: Black Sable, Bourbon, Storm Cloud,
  Evergreen Mist, Harbor Blue, Mountain Pine, Quarry Gray, Gray Tweed, Slate
  Grey, Shasta White, Aged Cedar, Amber, Desert Tan. Several read as older or
  discontinued names that may appear in no current sheet. Needs the Designer
  two-pager (Black Sable, Bourbon) and an Oakridge/Berkshire sheet.
- **Storm Cloud** is deliberately untouched — its strip straddles a page break
  in the Designer sheet, so the sample is partial. Half-sourced is not sourced.
- **17 Carvedwood colours carry `hex = NULL`** — real colours, no swatch source.
  They render nothing rather than render a guess.
- **`swatch_path` is empty on all rows.** Real shingle texture in the picker is
  still possible; the images would go to Supabase storage behind auth, never to
  this repo (OC's copyrighted photography, public repo), and through the
  `OC_BRAND_RULES` gate first.

⚠️ **Uploaded PDFs do not survive the session.** Each session gets its own
container. The only manufacturer document that outlived the OC Colors session is
`OC_MGM_Guidelines_for_Contractors.pdf`, because it was committed. If a source
document matters, commit it.

### The colour gap, narrowed to FOUR (15 Aug, Theo)

> "Storm Cloud, Harbor Blue, Shasta White, Amber, Desert Tan Discontinued. We
> dont need Oakridge"

**Oakridge is out of scope — do not chase that sheet.**

⚠️ **Those five were ALREADY marked `discontinued` in `oc_colors`, and Shasta
White was already `hidden`.** Nothing needed changing. Recorded because the
obvious move was to write an UPDATE, and the database already knew — check
before "fixing" this class of thing.

The settled rule still holds: **a discontinued colour keeps its badged spot.**
`status` marks it, only `hidden` removes it, and only Shasta White is hidden.

**13 rows are still `hex_verified = false`, but NINE of them are discontinued**
(Aged Cedar, Amber, Bourbon, Desert Tan, Harbor Blue, Quarry Gray, Shasta White,
Slate Grey, Storm Cloud). They cannot be sold, so an estimated hex on them costs
nothing. **Do not spend effort there.**

**The real gap is FOUR — and they are the four that matter most:**

| colour | status | hex today |
|---|---|---|
| **Evergreen Mist** | `coty` — Colour of the Year | `#5D6557` |
| **Black Sable** | current, designer | `#2E3033` |
| **Gray Tweed** | new, designer | `#585A58` |
| **Mountain Pine** | new, designer | `#4F5B4A` |

Neither sheet in hand covers them. Black Sable IS in the Designer collection but
its swatch strip carries no text label (pairing is done by geometry, never by
eye — that rule is not bent for one colour). Evergreen Mist, Gray Tweed and
Mountain Pine are COTY/new and appear in neither the Designer nor the standard
Duration data sheet.

**What to ask for:** the current OC Designer Colors Collection sheet or a COTY
sheet carrying Evergreen Mist, Gray Tweed and Mountain Pine — and any sheet
where Black Sable's swatch is labelled. That is the whole remaining request.

### ✅ THE COLOUR CATALOG IS DONE (15 Aug)

`oc_colors`: **28 of 34 verified. ZERO unverified sellable colours.** The six
still estimated are all `discontinued`, cannot be sold, and appear in no current
OC document. It began the day at **0 of 31**.

⚠️ This section read **"25 of 34 … the nine still estimated"** until 15 Aug.
That was true when it was written and was overtaken three commits later, when
Amber, Storm Cloud and Bourbon came off the Style Board guide. Re-measured
against production: 34 rows, 28 verified, 6 unverified, **0 unverified and not
discontinued.**

Sources, all Owens Corning's own artwork: the Duration data sheet (15), the
Designer data sheet (6), the Style Board Reference Guide (6 — Gray Tweed,
Mountain Pine, Black Sable, then Amber, Storm Cloud, Bourbon), the 2026 COTY
sheet (Evergreen Mist).

**Deliberately NOT churned:** the Style Board guide disagrees with the data
sheets by 10–20 on colours already verified (Driftwood `#615C54` vs `#69645C`,
Onyx Black `#3A3E41` vs `#272C2A`). That is print variation between a
merchandising piece and a product data sheet; the data sheet is the more
canonical document, and rewriting 25 rows to chase it would be motion, not
accuracy.

**Two statistics, and which applies is decided by the IMAGE TYPE, not by taste:**

| source | statistic | why |
|---|---|---|
| flat swatch artwork | **LIT** — median ≥ p60 luminance | keyway shadows between courses are a big share of pixels and drag the mean dark |
| photograph of an installed roof | **MEAN** | the plane is uniformly sunlit, keyways barely resolve, so the mean already is the perceived colour |

Only Evergreen Mist used the roof method, because only it had no swatch.

**Still true, still the rule:** pair swatches to names by GEOMETRY, never by eye,
and LOOK at the crop before sampling it. The Style Board crops first caught the
board's door panel and paint chip — plausible numbers, polluted at both ends.

---

# Layer: 25 Aug 2026, evening — the standing sweep, triaged. NOT started.

The first full sentinel sweep on the repaired walker. `--all`, so this is
**total standing debt, not a regression list**: `14 INK · 46 DEAD · 157
OVERRIDDEN · 1 FLOOR` across 100 renders (25 screens × 2 themes × 2 widths).
Build 1066's fix held — `#galClient` and `.galempty` are gone from it.

**The 157 OVERRIDDEN are overwhelmingly the cascade working** — dark rules
losing to `rb-light` overrides, which is what a theme is. They are collected so
`--since` can flag a *new* rule that never wins (build 481's shape), not because
157 things are wrong.

**One was already excluded as a rig fault:** `span.cvic "🛡"` at 1.02:1 was the
emoji-as-ink class, now BUG_CLASSES 64 and fixed in the probe. *The app-side
residue is real but cosmetic — that shield is the last emoji left after the
686–699 drawn-icon sweep. One occurrence.*

## The 13 real under-floor inks, grouped by ROOT CAUSE

Grouping matters more than the list: three of these are one mistake made three
times, and fixing them as a group is one decision rather than thirteen.

### ✅ A · DONE at build 1067 — themed by CRM instead of by theme, 3 sites

CLAUDE.md's build-527 lesson, live: *scoping by CRM is not scoping by theme.*
Someone authored a readable ink, scoped it to `body.claim-insurance`, and in
**retail light mode** the unscoped fallback wins.

| element | measured | the authored fix that never applies |
|---|---|---|
| `b.db-paid` "$0.00" | **2.4:1** on white | `body.claim-insurance …{color:#46701E}` exists and is dark enough |
| `a.dbmdir` "Directions ↗" | **2.45:1** | `body.claim-insurance …{color:#FF8A80}` — retail gets a default link blue on a dark card |
| `h3` "Job Summary" | **3.51:1** on white | `.ljsummary h3{color:#1c1416}` is authored and **loses** — it is also in the OVERRIDDEN list |

**✅ SHIPPED at 1067**, and it was the right group to take first — the correct
ink already existed in the file in all three cases, so no colour was invented.
Measured after: **5.84 · 7.87 · 5.67**, dark unchanged at **12.71 · 11.61 ·
5.48**. `gate_1067.mjs` is 15/15 and goes red on all six light checks against
1066.

⚠️ **Two numbers on this page were wrong and the build log carries the
correction.** `a.dbmdir` is **2.45:1**, not the 3.77 a throwaway rig printed —
the map tab bar is `rgba(16,18,24,.85)` and must be composited, not read raw.
And `b.db-paid` reads 2.50 at desktop width / 2.40 at phone width, because the
figure is `clamp(14px,4.4vw,19px)` and the *floor* changes with it (19px bold is
large text, floor 3.0). The sentinel's original numbers were the right ones.

### ✅ B · DONE at build 1068 — a single fixed ink with no light twin

| element | measured | ink |
|---|---|---|
| `span.count` "14" | **1.56:1** dark / **2.14:1** light | `#1a1a1a` on both a dark chip and cardinal red |
| `span` "(from client profile)" | **3.18:1** both themes | `#8a8a8a` |
| `div#rvLeftSwitch` | **1.56:1** | `#cfcfcf` on white |
| `span` "no description" | **2.65:1** | `#a89e88` on white |
| `small` "Add carrier, claim #…" | **3.82:1** | `#6b7a90` on `#fdecec` |
| `div.phnote` | **4.24:1** | `#767676` on `#f7f7f7` |
| `div.navempty` | **4.2:1** | `#6b7688`, 1194px only |

`span.count` is the serious one — **1.56:1 is not faint, it is invisible**, and
it is a number the user is meant to read.

### ✅ C · DONE at build 1068 — marginal, done in the same pass

`button "Inspection"` at **4.35:1** against a 4.5 floor. Under by 0.15. Worth
fixing in the same pass, not worth a pass of its own.

## What I recommend, and why it is one build not three

**Do group A alone as the next build.** Three sites, the replacement ink already
written in the file, one root cause, and it lands on the **client profile** —
the screen Theo is on most and the one rebuilt at 788–804. Group B is a bigger
call because several of those inks are shared and need the blast-radius check
(`.viewhead` was one class with 15 users), and C is noise on its own.

✅ **ALL SHIPPED.** Group A at **1067**, groups B and C at **1068**, both on
Theo's explicit instruction. Every under-floor ink the 25 Aug sweep found is
now above its floor in both themes at both widths.

⚠️ **Two corrections this produced, recorded so they are not re-learned:**
three of group B were never light-mode bugs at all — they sit on cream cards and
a dark rail that do not flip, so they took a fixed ink rather than a pair. And
`#cr-pae-tabs button.active .count` was a **ninth** site the sweep never saw,
found by the gate: byte-identical to `.cr-lil-tabs button.active .count`, but
its strip shows no count in the walked state.

## Still Theo's, unchanged

- **`CRON_SECRET` in Vercel** — verified unset live; the daily digest has never
  sent and CompanyCam last synced 31 July. Highest value of anything on this page.
- Two Supabase Auth toggles: public signup **off**, leaked-password protection **on**.
- The font-stack unification and the half-pixel type scale both want his pick and
  a preview deploy — **neither is verifiable in this container**, which has
  neither Segoe UI nor San Francisco installed.
