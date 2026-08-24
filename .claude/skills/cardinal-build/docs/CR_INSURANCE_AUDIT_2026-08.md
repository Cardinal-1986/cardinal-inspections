# Cardinal Truth — end-to-end audit, 24 Aug 2026 (at build 1051 → 1054)

Theo: *"do an extreme audit of the insurance crm. End to end… Check the vocabulary
at the insurance home vs the pipeline terminology. Check features, recommend
anything that you believe is truly helpful… Fix as you go."*

Method: every insurance surface driven in Chromium at **390 / 1194**, in both
insurance themes (`docket` cream, `siren` dark) and both app themes, measuring
contrast against composited grounds, tap-target sizes, sideways overflow and
mid-word wrapping. **21 renders across 7 screens.**

| | before | after |
|---|---:|---:|
| contrast failures | **44** | **0** |
| controls under 44px | **116** | 2 (43.99px, rounding) |

Everything below was fixed in **1052–1054**. What is *not* fixed is in
**Recommendations**, and every recommendation names the measurement behind it.

---

## ⚠ The instrument was wrong four times first — read this before trusting a sweep

The first run reported **24 contrast failures on the Cardinal Truth home**, a
screen that renders perfectly. Each fix made it quieter, which is the direction
that should make you suspicious, not relieved.

| # | fault | what it produced |
|---|---|---|
| 1 | every gradient stop of every ancestor treated as a candidate ground | the insurance cards use the two-layer gradient-**border** idiom (`…padding-box, border-box`); cream text was scored against the red **border**. 24 phantom failures |
| 2 | the page ground appended even after an opaque ancestor was found | the Claims screen is a fixed opaque **dark** overlay and the insurance theme leaves `body` cream behind it — a white title scored **1.04:1** against a body nobody can see |
| 3 | an element's **own** opaque background walked past | the red Upload button's white label scored against the white card behind it: a 5.9:1 button reported as **1:1** |
| 4 | a translucent bar's backdrop kept as a rival candidate | the map bar paints `rgba(16,18,24,.85)`; text sits on the composite `#333439`, not bare cream. A 5.44:1 link read **2.16:1** |

Fault 3 is written down in `CLAUDE.md` already. **Every one was caught by
rendering the screen and looking**, never by reasoning about the code.

After four quieting fixes the probe was worth nothing until it had been seen to
speak: `probe_selftest.mjs` injects three deliberate defects — one of them
*inside* a gradient-border card — and requires all three to be named. It does,
and the clean screen still reports zero.

---

## What was wrong, and what it was

### The root cause of almost all of it: one screen, two palettes

`body.claim-insurance #projectView{background:var(--ct-bg,#FAF8F7);}` re-grounds
the shared client profile from the `--ct-*` family. Its identity block still
paints from `--rbe-*` (retail). **Measured under both insurance themes, the
`--rbe-*` inks are byte-identical** — they do not flip with `--ct-bg`. So on
`docket`, the theme Cardinal ships, dark-theme inks sat on a cream page.

This is the *partial theming pass* trap: the `body.claim-insurance` block already
existed and already themed `.dbmoney`, `.dbrow`, `.jabox`, `.projsec`,
`#leadCard`. Twelve of fourteen elements read correctly, so the two that did not
looked like a design choice rather than a defect.

**The client's own name measured 1.00:1 — `#ffffff` on `#FAF8F7`. Invisible.**

### Two findings that are app-wide, not insurance-only

- **Every stage banner in the app was under the floor.** `.dbstage` grounds on
  `STAGE_COLORS` via an inline style. White on it: **1.96:1 (Lead)** → 4.37:1
  (Closed). Nine of nine under 4.5 for the 11.5px sub-line; seven of nine under
  3.0 for the 19px title. `STAGE_COLORS` is a settled semantic set — **not
  changed**. The app already ships `STAGE_INK` ("the same stages, darkened for a
  light ground"); the banner now grounds on it. Worst case **1.96 → 5.27**.
- **The header title ran under the home button**: 28px of overlap at 360, 13px
  at 390. `left:50%` centres on the bar while the button groups are asymmetric.

### The vocabulary question, answered

**The words are already one vocabulary and were left alone.** Build 655 unified
four competing maps into `INS_STAGE_LABEL`; the Truth rail, the Insurance Clients
chips and the profile stage bar all read it, and both
`window.INS_STAGE_LABEL || {…}` fallbacks were verified byte-consistent with the
canonical map.

**What was wrong is that the two screens disagreed about which stages exist:**

| | Truth home rail | Insurance Clients chips |
|---|---|---|
| Claim Filed (`Lead`) | ✅ row, tappable | ❌ **no chip** |
| Adjuster Pending (`Prospect`) | ✅ row, tappable | ❌ **no chip** |
| On Hold | ✅ row, tappable | ❌ **no chip** |
| Supplement Filed | ✅ row → **cleared the filter** | (`__supplements__` existed, unused) |
| Invoiced | short label | **long label — a 242px chip on a 390px phone** |

Tapping "Claim Filed" — the hub's own most-chased row — opened a correctly
filtered list with **no chip lit, not even "All"**, so nothing on screen said
what you were looking at. All three now have chips, in pipeline order;
"Supplement Filed" applies `__supplements__`; and the strip reads
`insStageLabel(s, true)`, the short twin build 656 added **for this exact strip**
and which was called at only one site in the file — not this one.

---

## Recommendations — measured, not guessed

Ordered by what they are worth. Every claim carries the measurement behind it.

### 1. A claim carries no deadline. None.

`deadline` has **0 code hits** in `index.html` (lexer: 12 in strings, 11 in
comments, 0 in code). There is no `proof_of_loss_due`, no `suit_limitation`, no
supplement window on `insurance_claims` — the schema is otherwise rich
(`date_of_loss`, `cause_of_loss`, `first_scope_rcv` vs `approved_rcv`,
`ord_law_*`).

**And the knowledge is already in the building.** The Resource Library carries a
card tagged `deadline statute of limitations suit limitation clause mechanics
lien 60 days` with a table of them, plus a warning that *"the policy's
suit-limitation clause is not the statute, and it is usually shorter."*

So the app can tell a rep what the deadlines are and cannot tell them that one is
next Tuesday. `lossAge` (build 1000) already computes days since date of loss —
it is the input a deadline needs. **This is the recommendation with real money
and legal exposure behind it.**

### 2. The insurance side sends zero notifications.

All **31** `notify*` call sites are in `cr-pb`, `cr-pk`, `cr-punch`, `cr-pumap`,
`cr-pp` and `cr-outbox` — production, the punch card and the offline queue.
Production got its matrix wired at 1047. **Not one push fires from any insurance
code path.** ("Claim Tips" and "Supplement Templates" are menu labels.)

The arm of the business with the most money sitting in other people's hands is
the one that never tells anybody anything. Four events worth a push: a supplement
passes N days unanswered · a claim reaches Invoiced (depreciation is now
claimable) · an adjuster appointment is booked · a claim is denied.

### 3. A denial is where the work starts, and the app treats it as an ending.

`compute()` does `if(st === 'Lost'){ denied++; return; }` — denied claims are
counted and then drop out of the rail entirely. The only route out of one is the
stage menu's **"Reopen as Lead"**, which throws the claim context away.

Meanwhile the Resource Library carries a full reinspection playbook
(`data-rltags="reinspection re-inspect second look denied supplement"`) and a
card on the appraisal clause. Again: the knowledge is in the building, the
workflow is not. A Denied row on the rail with the reinspection/appeal next step
would put them together.

### 4. The chase list has ages but no thresholds.

`chaseList()` chases exactly two things — `supplement_status === 'filed'` and
`st === 'Invoiced'` — sorted by days. Nothing says *late*. You already compute
per-carrier lift (`first_scope_rcv` → `approved_rcv`) and rank carriers by it;
the same table could carry an expected response time, so "State Farm, 9 days"
reads as fine or overdue instead of just as a number.

### 5. The depreciation-recovery step is invisible.

"Awaiting Depreciation / Supplements" is a stage holding real money, and
recovering RCV needs a completion certificate and final invoice **sent**.
`certificate of completion`, `final invoice` and `recoverable` all have **0 code
hits** — the only occurrences are Library prose in markup. So a claim parked in
that stage because nobody sent the paperwork is indistinguishable from one where
the carrier is slow.

### 6. Not recommended, and why

- **A claims-handler directory.** "Claims Handler" is a single label rendering
  `adj.name` — it is the adjuster relabelled, not a separate person the app
  tracks. There is nothing to build a directory of. *(I nearly recommended this
  and checked first.)*
- **Retuning `--cr-green` / `--cr-blue`.** They are ink *and* background across
  44 sites in five copies of the palette. Two pills miss the floor in light mode
  by 0.04 and 0.53; those two were scoped instead. Retuning the tokens is its
  own job with its own gate, not a rider on an ink pass.

---

## Fixed in this pass

| build | what |
|---|---|
| **1052** | the identity block onto `--ct-*` (9 elements) · the stage banner onto `STAGE_INK` · `.wsempty` · the claims primary button · two pills, light-scoped |
| **1053** | the header collision at ≤430px · "DEDUCTIBLE" wrapping · 18 controls to the 44px floor |
| **1054** | three missing stage chips · "Supplement Filed" routing · the short stage label on the strip |

**Gates:** `gate_1052` (18 named control failures), `gate_1053` (13),
`gate_1054` (9) — each seen RED on its predecessor. `check_build` green on all
three. All ten arc gates 1044–1053 re-run green on the 1054 tree.

⚠ **Two traps worth carrying forward.** `getClientRects()` on a **block** returns
1 however its text wraps — it is the element's box, not the text's, which is how
"DEDUCTIB / LE" hid; measure the text node with a `Range`. And a main-axis
`margin:auto` absorbs **all** free space before `flex-grow` gets any, which is
why the header title would not expand until `#cr-hd2-home`'s auto margin was
dropped inside the media query.
