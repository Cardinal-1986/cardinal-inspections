# CR UX Audit — End-to-End Design & Ease-of-Use, Every Workflow

**21 Aug 2026 · audited at build 965 (`828ed01`, `origin/main`) · live DB `yipslubcptjoarblzbpl` (read-only — this audit changed nothing)**

**Commissioned by Theo, verbatim:** *"Can you run an end to end audit on design and ease of use for the Cardinal app. Run through every workflow including productions. My biggest issue is the community crm. It's the third time I changed it. It just doesn't feel right to me. More importantly if you have suggestions of additional features or revamping features or anything else please give suggestions after running the audits."*

**Method.** Fourteen parallel audit lenses over the shipped build-965 tree — global navigation/IA, retail client, money pipeline, insurance, Community ×3 (workflow + data, visual design, redesign history), Production, sales/owner tools, the presentation suite, the visual system, interaction states, feature gaps, and a fresh-eyes learnability pass — each seeded from the doc set so nothing already recorded (CR-AUD, CR-COM, the E2E validation) was re-discovered. Several claims were proven by executing shipped code or computing contrast ratios; live-DB checks were read-only aggregates. The lenses produced 170 raw findings; deduplicated to **142**; then **every finding this document headlines was re-verified by a dedicated adversarial pass** — twelve independent verifiers, each instructed to refute, re-deriving anchors, counts and ratios from the shipped file. **The pass returned 36 CONFIRMED · 2 CORRECTED · 0 REFUTED across 38 headline claims**; verdicts are marked inline and both corrections are folded into the text. Full deduplicated log: `CR_UX_AUDIT_2026-08-21.csv` beside this file.

**Live-data baseline at audit time:** 55 projects · **15 community jobs, all at stage `Lead`** (was 16/16 on 10 Aug — one deleted, none advanced) · collections **0** · commissions **0** · draws **0** · crew_payments **0** (twelve days after 650–652 shipped) · showcase_pairs **1** · workmanship_pairs **1** · walks **0** · community_contacts **0** · community_properties **0** · 17 of 55 projects have no CRM classification.

---

## ✅ STATUS — nine builds shipped against this audit, 21 Aug 2026 (added after the report was written)

**This document is a snapshot at build 965 and is deliberately not rewritten.** What follows is
the only status layer; the live record is `cardinal_build_log.md`, and `OPEN_ITEMS.md` carries the
dated strike list.

| Build | Item | Gate control on the previous build |
|---|---|---|
| **967** | offline outbox deleted every refused write, then said "All changes synced" | the row gone from IndexedDB, chip painting `#123322` |
| **968** | the Supplement Desk signed a rep out of the **whole CRM, every device** | `signOut called 1x`, `session present=false` |
| **969** | Claims/Coach/auto-stage messages painted **under** the bottom bar | `pwaNav` measured as the element composited on top |
| **970** | Publish / → Contract / Save acted on **another client's** estimate | `pickEstimate` returning `e-OTHER-newest` |
| **971** | Community program **item 1** — unfreeze the pipeline | a hand-typed \$14,330 bid reading *"Bid needs pricing"* |
| **972** | Community program **item 2** — finish the stage story | `generic or missing: ["Scheduled","Invoiced","Closed","Lost"]` |
| **973** | Community program **item 3** — one partner identity *(writer half)* | the hub answering `"No partner recorded"` for a partner just attached |
| **974** | Community program **item 4** — one amount | `card=18425 (builder)  hub=14330` — one job |
| **975** | Community program **item 5** — hub numbers become doors | `tile=3px .k=3px .v=3px` — three nested cards per tile |

**Open from the program: item 6 (one design era) and item 7 (one Job Menu).**

⚠️ **Two of this report's Community recommendations were CORRECTED during the build**, and the
corrections matter more than the originals:

- **Item 4's $0 bid lines.** The report says the Bid tab "reads a field the builder never writes",
  which is right — but the obvious repair is also wrong. **14 of the 18 live estimate rows are
  non-itemized**, and on those `unit_price` is 0 while `amount` carries the money (on one row the
  two disagree, and `amount` is the truth). Swapping the field name would have shipped a *new*
  wrong number. 974 uses the rule the shipped estimate document already uses.
- **Item 5 had an unstated prerequisite.** No hub number could become a door until fold state
  survived a render: the All-bids filter bar lives **inside** the All-bids fold, and `render()`
  destroyed the DOM class holding it open — so tapping Apply closed the table being filtered.

⚠️ **And the report's own suggested fix for the Claims toasts (969) was wrong.** "Raise the
toast's z-index" is a **silent no-op** for two of the three: they are appended into a mount that is
`position:fixed` at `z-index:60 !important`, which is a stacking context, so no z-index on a
descendant escapes it. Recon caught it before a line was written.

**Item 3 is half-shipped on purpose.** The read-resolver needs two decisions that are Theo's, and
zero live rows are affected by either: what to do about the four DHRN name-drifted rows, and what
happens to `partner_id` when someone free-types a referral. Both are recorded in `OPEN_ITEMS.md`
as numbered options.

---

**Item ids here are `CR-UX-***`.** They deliberately do not reuse CR-AUD/CR-COM numbers; where an item is a still-open CR-COM item re-verified at 965, the old id is cited.

---

## Executive summary

The app at 965 is in the best mechanical shape it has ever been. The 938–944 readability/touch arc, the 924–956 menu rebuild, the offline program (864–873), Production's hub-to-Magnet-Board arc, and the money-precedence unification (654/721/781) are all real, verified, and hold up under adversarial reading. The strengths section below is not politeness — large parts of this app are now genuinely well-made.

The exposure clusters in five places:

1. **Community still doesn't feel right because none of the redesigns changed the model.** Four redesigns (Frost 271–315, Slate & Clay 351–364, the green two-party pass 427–441, the black-card port 700–714) changed identity, layout and chrome. Five things survived every one of them, and all five are re-confirmed live at 965: partner identity split across three storage shapes; a retail stage machine whose story stops mid-job; a hub of counters that aren't doors; two opposite amount-precedence rules on the two surfaces Theo compares; and a Job Menu mirrored from a dead retail grid whose tiles suspend out to retail-skinned chrome. **The pipeline has never moved: 15/15 community jobs sit at Lead today.** The full verdict and a numbered fix program are in the next section.
2. **Three trust bugs on surfaces where trust is the product:** the offline outbox silently deletes any queued write the server refuses and then flashes green "All changes synced"; the Supplement Desk signs non-admins out of the entire CRM (shared Supabase session + `signOut()` on the admin check) and has no way back to the app; and the Claims CRM's save/delete/error toasts paint *behind* the installed app's bottom nav — invisible on the phones the team actually uses.
3. **A wrong-client publish is possible from the standalone Estimates screen** — the Publish/→ Contract/Mark-Sent satellites read `window.currentProject`, which that screen never sets, and the fallback picks the wrong project's newest estimate.
4. **The most-glanced pixels fail their floors:** the profile stage banner paints white on stage colours at 1.96–2.85:1 on most stages (named and deferred at 939, never picked up); the estimate editor's own Total and Deposit render ~1.5–2.0:1 on the obsidian skin; Tasks/Job Documents/Appointments rows sit at 1.40:1 on dark retail.
5. **The build muscle is ahead of the adoption muscle.** Money In/commissions, the Vision suite's stock, walks, claim depth features, code letters — built, wired, and at zero rows. The highest-leverage next work is closing loops on rails that exist (the morning email that says what is waiting on you, log-the-check prompts, client SMS once A2P clears, stocking the Showroom) rather than new modules.

**Counts: 142 deduplicated findings — 4 P0 · 23 P1-class · 60 P2 · 55 P3 · headline items adversarially verified.** Strengths and the ranked suggestions list are at the end.

---

## The Community verdict — why the third redesign still doesn't feel right

*(This section merges the three Community lenses: a fresh workflow walk at 965, a design critique against the app's best surfaces, and a full reconstruction of every Community-touching arc in the build log. The 10 Aug audit's still-open items were each re-verified against 965.)*

### The diagnosis, stated once

**Four redesigns changed paint and placement; none changed the record underneath.** The identity literally went full circle — green (179–180) → Frost ice-blue (299) → Slate & Clay light (359) → green dark (433) → black card (705) — while five structural things survived every pass. Each is re-confirmed in the shipped 965 file, not quoted from the old audit:

| # | The invariant | Where it bites today |
|---|---|---|
| 1 | **Partner identity has three storage shapes** (`partner_id` vs `partner_name` vs a bare `partner` string the hub never reads) and the writers disagree with the readers | Attach Habitat via the card's own Partner section → the hub says "No partner recorded". 4 live jobs name-drifted, 2 orphaned. The bid-email guardrail keys on `partner_id` only, so exactly the wrong jobs skip it |
| 2 | **The lifecycle is retail's stage machine wearing renames, and the story stops mid-job** | No thread card for Scheduled/Invoiced/Closed/Lost; "Get on the calendar" touches no calendar; "Invoice the partner" is a bare stage flip and the real invoice generator refuses every community job (its gate is signed-contract-or-manual-value, and 0 of 15 have either) |
| 3 | **The hub is counters, not doors** | "Open bids" counts every community job ever (no stage filter — it reads 15 until a job is deleted); the "Waiting on you" rows look tappable and have no handler |
| 4 | **"The amount" has no single source** | Hub `bidAmt()` prefers the hand-typed number; the card prefers the estimate — opposite precedence on the two surfaces Theo compares side by side; analytics uses a third rule; the Bid tab prints **$0 on every line** under a correct total |
| 5 | **The seam to retail is still the architecture** | The Job Menu is mirrored from the retired `#jaGrid` (9 tiles against the live grid's 13 — no Documents door, and Documents is the screen that emails the bid); 6 of 9 tiles suspend out to retail-skinned chrome behind a pill labelled "Back to bid view" that matches nothing on screen |

**And the record starves the screens.** 15/15 jobs at Lead, 0 properties, 0 community_contacts, 0 appointments, 0 community invoices — the journey Theo described (partner invites → priced → won → runs → billed) has never once run past its first stage in production data. Two code mechanisms largely explain the freeze, and both are new findings this pass (CR-UX-001/002 below): the submit door only exists if a *builder* estimate exists (13 of 15 live jobs are priced by a typed amount instead — they are only ever offered "Price it"), and everything after Awarded is a dead end.

The quotes tell the same story from Theo's side. Every complaint before 11 Aug is about what a screen shows ("it just feels messy and somewhat confusing"); every instruction after is about who a fact belongs to ("Only I should have the main contact info"; "I don't know who Samantha is but Galen Curry, Frank Gorman and Jim are the habitat contacts"). **Theo has been steering toward the data model in his own words — the redesigns kept answering with screens.**

What the port DID fix, verified still holding at 965 — recorded so nobody re-does it: one client page (the cream build is gone), the payments door, Partner & Property section, work orders in host mode, the Recorded submitted/awarded line, consistent stage vocabulary (Bid Requested / Bid Submitted / Awaiting Funding everywhere), the parked-job second clock, and 710's parked-money repair. The bones are good. **A fifth visual redesign would fail exactly like the first four.**

### The fix program — numbered, one build each, in dependency order

*(Every item is small and enumerable; none is a restyle. 1–5 are the model; 6–7 are the paint that's genuinely wrong. Strike numbers to descope.)*

1. **Unfreeze the pipeline.** Key the Lead card's submit affordance on ANY recorded price — builder estimate OR typed `bid_amount` OR logged `submitted_amount` — and make "Log submitted" offer the stage move it already stamps the date for. This single build unblocks the 13 frozen live jobs.
2. **Finish the story.** `threadHtml` branches for all nine stages: Scheduled → "Mark build complete" + a real date action that writes an appointment (the button already says "Get on the calendar" — make it true); Invoiced → balance + a door to Payment Information; Closed/Lost → quiet done-states. Plus a **community invoice**: a partner-billed invoice document from the accepted bid amount (partner, PO/grant reference, property, occupant line) on the existing `inspection_reports` chassis — no signed-contract gate, because 0 of 15 community jobs can ever satisfy the retail gate.
3. **One partner identity.** `setPartnerForProject` writes `partner_name` beside `partner_id`; the New Lead form's hardcoded `#ldPartner` list is replaced by the roster picker; a one-time backfill repairs the 4 drifted and 2 orphaned live rows; every display resolves id→roster with name fallback. Closes CR-COM-008 and makes the bid-email guardrail cover every job.
4. **One amount.** One exported resolver (awarded > submitted > estimate total > typed amount) used by hub, card, strip and analytics, each rendering its provenance ("from estimate" / "quoted"). Fix the Bid tab's field names in the same pass (`unit_price`/`amount`, one line — the $0-lines bug). On award, when "Funded by" differs from the billed partner, offer "also make them the bill-to" (the roster id is already captured and currently dropped).
5. **Hub numbers become doors.** "Open bids" = actually-open stages; every KPI and queue row taps through to the filtered list it claims to count (the filter mechanism exists); an overdue check-back turns hot exactly like an overdue bid (the comparator exists — it feeds only the collapsed All-bids table today). Re-offer the "Send the bid" queue — declined at 711 as scope, not as a settled decision, and three live bids sit past their due date.
6. **One design era.** CSS-only: restyle the cream attach/pick/convert dialogs (`.cr-cp-box`/`.cr-cct-box` — still `#fffdf7` Georgia paper from the first build, z-indexed *under* the bottom nav, absent from `hideAllViews()`) to the ccm dark-card idiom; sweep the eight measured light-mode failures (dark literals on flipping grounds, worst 1.07:1 on the timeline's "now" title); retire the second green (`#4a8c5a`, 4.05:1 primary buttons) for the ccm emerald; raise the 7–8px role labels — the payer/occupant/contact distinction the business runs on — to the retail 795 label/value anatomy at 13.5px.
7. **One Job Menu.** Build the community menu from the live grid's manifest instead of mirroring the dead `#jaGrid` (adds Documents/Tasks/Measurements/Notifications/Money-In doors, fixes Contracts routing to Estimates, drops the 450ms polling); relabel the return pill "‹ Back to client"; gate or relabel the retail controls live during a suspend (`#contactedBtn` still says "Contacted → Prospect" on community jobs).

**Pair whichever of these ships first with a one-time data-repair session** (backfill partner ids/names, strip partner suffixes out of `projects.name` at source, create the real properties, advance stages to truth) — the screens can only feel right over a record that is true. And two structural options, priced honestly: a **multi-contact partner editor** writing `community_contacts` (fixes the Habitat three-contacts problem AND gives "Site contact — Held by admin." its first real state; size M), and **extracting Community into its own file** the way the Visualizer left `index.html` (the suspend seam only fully disappears at a real page boundary; size L — worth doing only after 1–5, never instead of them).

---

## Findings log — blockers and P1s (each independently re-verified)

Format: id · severity · verdict from the adversarial pass · evidence · fix sketch. Anchors are strings/selectors, not line numbers.

### Community (the P0s — detailed above, recorded here for the ledger)

**CR-UX-001 — The submit door only exists if a builder estimate does; the pipeline has never moved**
P0 · **adversarially verified: CONFIRMED** · `cr-cc-script` `threadHtml()` Lead branch: `acts: est ? [Mark it submitted, Open the bid] : [Price it]`; `ccDoAct('logsub')` records `submitted_amount` without `setStage`. Live: 15/15 at Lead, 3 past `bid_due_at`, 7 with typed amounts. *Fix: program item 1.*

**CR-UX-002 — Everything after Awarded is a dead end**
P0 · **adversarially verified: CONFIRMED** · `threadHtml()` has no Scheduled/Invoiced/Closed/Lost branch; `ccDoAct('schedule')` = `confirm()` + `setStage`, no appointment; `createInvoiceFor()` refuses estimate-sourced value. *Fix: program item 2.*

**CR-UX-003 — Partner identity: three storage shapes, drifted live rows, a guardrail that skips the wrong jobs**
P0 · **adversarially verified: CONFIRMED, one correction** · `setPartnerForProject` writes `partner_id` only while the hub's `partnerOf()` reads `partner_name` — attach via the card and the hub says "No partner recorded"; the senddoc guardrail keys on `partner_id` alone, so a name-only job falls through to a prompt defaulting to the homeowner's email (confirmed at the exact lines). Correction from the verify pass: the New Lead form's bare `partner` string is not fully dead — the card's `ppSync` and the Lead Details card read it as a display fallback; what holds is that the community HUB never reads it, so a lead created only through the New Lead form still groups under "No partner recorded" there. Still CR-COM-008, 255 builds later. *Fix: program item 3.*

**CR-UX-004 — "The amount" has four definitions and the Bid tab prints $0 lines**
P1 · **adversarially verified: CONFIRMED** · `bidAmt()` vs card `renderInner` opposite precedence; analytics a third rule; `bidHtml()` reads `it.price` where the builder writes `unit_price`/`amount`. Still CR-COM-011/012. *Fix: program item 4.*

**CR-UX-005 — Hub counters aren't doors; "Open bids" can only ever grow**
P1 · confirmed across three lenses · `compute()` `all: projects()` unfiltered; `queue()` rows carry `data-q` with no handler while styled `cursor:pointer`. Still CR-COM-022. *Fix: program item 5.*

**CR-UX-006 — The community dialog layer is the first build's cream paper, under the bottom nav, and survives navigation**
P1 · **adversarially verified: CONFIRMED** · `.cr-cp-box` `#fffdf7` Georgia + green `#3d7a4c`; shells z 9500/9600 vs `#pwaNav` 9990 `!important`; absent from `hideAllViews()`. *Fix: program item 6.*

**CR-UX-007 — Light mode on the black card and analytics pane is broken at eight measured points**
P1 · **adversarially verified: CONFIRMED** · dark literals on flipping grounds — `.pin .facts .k` 1.44:1, `--ccm-nowfill` declared nowhere (now-card title ~1.07:1 in light), `cr-can-styles` stats 1.46–2.19:1 on white. The partial-theming-pass class from CLAUDE.md, in reverse. *Fix: program item 6, with a render gate.*

**CR-UX-008 — The Job Menu mirrors the retired grid: 9 doors against 13, Contracts routes to Estimates**
P1 · confirmed · `syncJobMenu()` reads `#jaGrid .jatile`; no Documents/Tasks/Measurements/Notifications/Money-In doors. Still CR-COM-003. *Fix: program item 7.*

**CR-UX-009 — Assignment doesn't stick, and Edit silently reassigns to the editor**
P1 · **adversarially verified: CONFIRMED** · create writes `assigned:[x]`, edit writes `assigned_to`, hub reads `created_by`; the Edit modal pre-fills Assign-To with the current user. Still CR-COM-013, now with a live mis-write path. *Fix: one field, both writers, hub reads it; prefill from stored value or blank.*

### Trust and money (app-wide P1s)

**CR-UX-010 — The offline outbox silently deletes refused writes, then flashes green "All changes synced"**
P1 · **adversarially verified: CONFIRMED** · `cr-outbox-script` `flush()`: non-networkish error → `console.warn` + `del(row.id)`; `badge()` then paints the done state. An RLS refusal, constraint failure, or 401-after-long-offline all classify as refused. Punch photos share the shape (`flushPhotos`). This is the foundation Theo's migration rests on. *Fix: a fifth badge state — red "N changes could not sync — tap to see" — backed by a dead-letter list with Retry/Discard; never silently delete; gate the green flash.*

**CR-UX-011 — The Supplement Desk signs non-admins out of the entire CRM, and has no way back for anyone**
P1 · **adversarially verified: CONFIRMED (both halves)** · `supplement.html` shares the app's default Supabase storageKey; `showApp()` calls `sb.auth.signOut()` (global scope) on a failed `is_cardinal_admin` check; the menu row `data-nav="desk"` is visible to every user in the insurance portal; the Desk's header offers only Theme and Sign out — no link to `/`. *Fix: never signOut a shared session on a role check (show the refusal + a Back link); give the Desk its own storageKey (the `cr-viz-auth` precedent); add "‹ Back to Cardinal" to the header.*

**CR-UX-012 — Claims, Coach and auto-stage toasts paint behind the installed app's bottom nav**
P1 · **adversarially verified: CONFIRMED** · `.cr-c-toast`/`.cr-k-toast` bottom:24px z 300, `.cr-ess-toast` z 9700 — all under `body.standalone #pwaNav` z 9990 and inside its band. A whole CRM's save/delete/error feedback is invisible on the device the team uses. *Fix: route module toasts through the app-wide `crToast`/`window.toast` (already standalone-aware at z 99999), or copy its offset.*

**CR-UX-013 — Publish / → Contract / Mark-as-Sent can act on the WRONG client's estimate**
P1 · **adversarially verified: CONFIRMED** · `cr-epub`/`cr-e2c`/`cr-ess` read `window.currentProject`; `CardinalEstimates.openEditor()` never writes it; the standalone Estimates screen opens saved estimates without touching it; `pickEstimate` falls back to `rows[0]` of the stale project. The correct pattern exists one function above (`openPreview`). *Fix: capture `CardinalEstimates.currentProject() || window.currentProject` in all three; refuse the rows[0] fallback when project ids disagree.*

**CR-UX-014 — The estimate's own Total and Deposit are near-invisible on the obsidian skin**
P1 · **adversarially verified: CONFIRMED** · `.grand-val`/`.deposit .amt` `#8f1620` ≈ 1.5–2.0:1 on the obsidian grounds, both themes; the obsidian override recoloured `.val`/`.grand-lbl` and missed these — the same partial-theming shape 960 fixed one layer down. *Fix: add them to the obsidian inks group.*

**CR-UX-015 — Buyer signature can silently fail to move the job**
P1 · **adversarially verified: CONFIRMED** · `sigApply` buyer branch (`signed_at` write + `setStage('Approved')`) inside `catch(_e){}` with the success toast unconditional — a signed client whose Job Value stays $0 with no error. *Fix: on catch, `showError` naming what didn't happen; the signature PNG itself is already safe.*

**CR-UX-016 — Two scheduling stores never reconcile: a magnet move changes nothing but the Magnet Board**
P1 · **adversarially verified: CONFIRMED** · `rescheduleWorkOrder()` writes `crew_work_orders.scheduled_on` only; hub calendars, Schedule Board, blockers and stage-advance read `appointments` only; the printed Field Ticket keeps the frozen old day. *Fix: on a magnet move, offer to move/create the matching kind-'job' appointment in the same gesture; paint a mismatch chip when the two stores disagree.*

**CR-UX-017 — Work-order dispatch failures are laundered into success**
P1/P2 · **adversarially verified: CONFIRMED** · `createWorkOrder`: the 844 supersede and the `crew_work_orders` insert are in bare catches AND never check `r.error` (supabase returns errors; `.throwOnError` is 0 in this repo) — a refused board-row insert closes the modal and opens the document as if dispatched. *Fix: check `r.error`, surface "document created but not logged to the board: reason", re-offer.*

### Readability and reachability (app-wide P1s)

**CR-UX-018 — The profile stage banner fails its floor on most stages — the defect 939 named and deferred**
P1 · **adversarially verified: CONFIRMED** · `.dbstage{color:#fff}` over `STAGE_COLORS`: Lead 1.96:1, Prospect 2.51, Approved/Scheduled 2.50, Completed 2.85 (3.0 large-text floor); the 11.5px age line fails 4.5 everywhere. `STAGE_INK` — the dark per-stage twin — exists and is unused by the banner. *Fix: one small build; numbered options for Theo since stage colours are semantic.*

**CR-UX-019 — Tasks, Job Documents and Appointments were never themed for dark retail**
P1 · **adversarially verified: CONFIRMED** · `.tskrow{color:#2b2b2b}` with only `.rvsec` and `body.claim-insurance` overrides → 1.40:1 on the default ground; `.subnote` 2.97:1. The 921/942 recipe, one screen over. *Fix: one retail-scoped rbe token block covering all three views.*

**CR-UX-020 — Editing insurance details is thirteen chained browser prompts, and Cancel discards everything**
P1 · **adversarially verified: CONFIRMED** · `openInsuranceEditor()` = 13 sequential `prompt()`s behind the claim panel's ✎ Edit and Convert-to-Insurance; a proper form (`#ldInsBox`) already exists in the New Lead modal. *Fix: reuse the form in a pre-filled sheet with one Save — the single biggest ease-of-use win on the claims path.*

**CR-UX-021 — The follow-up scheduler has been buried since build 348 — the House Rule has no button**
P1 · **adversarially verified: CONFIRMED** · `openFollowUp()` is fully built; its only caller is a click handler on `#contactRow`, which ships `display:none` under the "retired by Keeper (348)" comment. The landing rotates *"The follow-up call is the job."* *Fix: a "Follow up" action on the live profile calling the existing function, with day-chips instead of `prompt()`.*

**CR-UX-022 — Showroom mode leaks drafts and can fire a live AI detect in the customer's hands**
P1 · **adversarially verified: CONFIRMED** · `load()`/`loadWalks()` have no published filter (admin session sees everything, render paths never check); the `[data-shot]` tap runs `runDetect()` ungated by showroom — a customer tapping a "Not checked" shot watches raw unconfirmed AI damage boxes appear, bypassing the human-approves-first order in the customer's presence. *Fix: in showroom filter to published/reviewed and gate `runDetect` on `!showroom` — drawing in the UI the line RLS already draws for non-admins.*

**CR-UX-023 — The Visualizer's Present tab has no hand-across containment**
P1 · **adversarially verified: CONFIRMED** · the compare box always renders the approve toggle; prev/next iterate ALL renders (no approved filter); the header keeps the all-clients project select, Prep tab and Sign out. *Fix: a real presentation state — approved-only stepping, approve hidden, header collapsed, hold-to-exit — reusing the Showcase's proven pattern.*

**CR-UX-024 — Four Quick-jump palette commands are wired to functions that don't exist; two new views miss the back-button belt**
P1/P2 · **adversarially verified: CONFIRMED (both halves)** · palette commands call `showClientsView`/`showLeadsView`/`showBoardView`/`showQuickInsp` (zero definitions; typeof-guarded silent no-ops); `CardinalDispatch.open()` and `CardinalOwner.open()` lack the `navSetView` belt their siblings carry. *Fix: four string edits + two one-line belts; adopt resolve-or-hide in the palette.*

**CR-UX-025 — Back from the Magnet Board or Crews dumps production on the retail home and silently flips the portal**
P1/P2 · **adversarially verified: CONFIRMED** · `close()` → `window.showHome()` → `hookShowHome()` `silentSet('retail')`; the Punch page's back does it right (`history.back()`). *Fix: same treatment for the board and Crews.*

**CR-UX-026 — Money In has zero adoption and the community reminders never leave the app**
P1 (adoption) · confirmed live · collections/commissions/draws/crew_payments all 0 rows twelve days after shipping; the Friday digest fires against nothing; community bids due/overdue and check-backs speak only when the hub is opened. *Fix: the "log this check?" prompt at Invoiced/Closed + deposit records, and the the morning email that says what is waiting on you — see Suggestions 1–2.*

---

## Serious (P2) — compact, by surface

Full detail for every item is in the CSV; verified subset marked ✓.

**Navigation & IA:** non-admins have no drawer door to Settings/My Profile/Enable Notifications while the un-gated banner shows everything ✓ (CR-UX-027); the banner sells the same screens under different names than the drawer — "Track"/"AI Estimates"/"Estimates" are one screen, "Contacts"/"Clients" one directory, "Portal"/"CRM" one concept (CR-UX-028 — a 30-minute rename pass erases most of the first-week tax); banner routes bypass the `crOpen*` wrappers (scroll-lock/cleanup skipped); Self Check floats sectionless for non-admins; "CRMs" section holds exactly one row; Recents is a screen with no door.

**Retail:** the Client Directory's "Assigned To" filter and card rep line still read `created_by` — and so do Reports (stale list, Rep dropdown, leaderboard) and `api/digest.js` grouping ✓ (CR-UX-029; the correct resolver `ljRepLabel`/`ljAssignedEmail` exists since 931); the + New → Contact door bypasses the phone-or-email intake gate ✓ (CR-UX-030); lead intake still geocodes via Photon/OSM after 840 measured Google at 40/42 vs 29/42 on this very database; OnHold is unreachable from the retail profile and `titleCase('ONHOLD')` breaks the relabel on profiles; appointments are delete-only (no edit); Notifications tile duplicates Communication.

**Money pipeline:** one Publish tap = 2–3 blocking native dialogs, one landing over a different screen; the worksheet's "Amount Collected" stays editable on jobs where collections are the source of truth (two disagreeing numbers on one profile); `doc_id`/`contract_doc_id` write-backs still swallow errors (the third site was fixed at 780 — update CLAUDE.md's known-cost note); the editor's action bar hides Save/Publish behind an unannounced sideways scroll on phones; Approvals always generates the ROOFING agreement whatever the trade.

**Insurance:** the claim screen's linked-project card never renders (`client_name` vs `name` — the same typo fixed at 655 in the sibling function) ✓ (CR-UX-031); the menu's Scope-of-Loss intake creates claims that bypass the baseline machinery (no `first_scope_*`, no `scope_reads`, no duplicate check — a later supplement's totals can overwrite the baseline silently); two hand-maintained status vocabularies (claim.status vs insurance-labelled stage) share words and never sync; reading a scope doesn't file the PDF (and only the filing side warns); "Invoice the carrier to release depreciation" has no claim-aware invoice behind it; the Scope of Loss card is the last cream island on the obsidian profile (deferred at 797, still waiting).

**Production:** the hub's "Closed repairs" bar opens The Line on the Active tab; closing a punch never checks the crew out (dangling amber "not checked out" on Closed cards); closing or reopening a punch-out writes direct with no offline route on ANY surface (alert-and-revert — verified; the card's Mark-done delegates to the same direct write) while the card's field edits queue offline — the natural last tap of a repair is the one write that can't survive no-signal; a repair chip on the Magnet Board opens the client profile instead of the punch card (three extra hops); Magnet Board read failures render as a confident empty board ✓; the 958 move grip is 33px effective (under the app's own 44px floor) and the 913 map buttons ~30px; check-out's "tomorrow" carries the stale time against the module's own 882 invariant; weather is on every calendar except the Schedule Board where the date is chosen; the Field Ticket renders at fixed letter width on phones.

**Sales & owner:** nothing tells a rep who to call today (the stale-leads list is admin-only; the digest omits leads; nothing nudges the Unassigned bucket and assignment requires a profile dive); assignment pushes never deep-link (the route and SW already support `url`); Storm Data's reports and pins are dead ends (no open-in-maps, no "clients near here"); the Sell section hides in the insurance portal, taking the objection deck's claim answers out of the menu exactly where claims work happens; two "Reminder" systems share a name and nothing else; `lead_status` is written once at birth and never updated.

**Presentation suite:** the Vision suite is barely reachable from the daily app — **OC Colors has zero in-app doors** (settled as all-staff; a Sales Floor tile is the natural fix), Showroom/Designer vanish below 820px, and none of the rebuilt menus list any of it (CR-UX-032); privacy defaults OFF entering showroom (past customers' street addresses visible on a handed-across tablet); a failed load is indistinguishable from an empty library ("Theo hasn't added any yet" on a DB error, blank cards on a signing failure); a rep already inside the Showcase can't lock the tablet without backing all the way out; one suite, three vocabularies (Showroom/Presentations/Showcase; Hall of Fame/Workmanship; Designer/Exterior Designer/Visualizer); `--vz-mute` 4.26:1 on card grounds; OC chips 36px.

**Interaction states:** OC Colors photo delete is one tap, permanent, never asks (every other photo delete confirms); `pickSigner` overlay at z 240 in the 964/965 region — twenty lines from the field menu that learned the 9994 lesson ✓ (BUG_CLASSES 58 recurring); feedback is split across 271 `alert()` sites + six module toast systems + the one designed `crToast`; the 844 supersede happens with no notice in the create flow; `CardinalUndo` is shipped, polished, and called by nothing; which screens survive offline is invisible (no "viewing only" notice on non-outbox screens); a failed colour-list fetch renders the agreement pickers silently empty at the kitchen table.

**Visual system:** the Text-size lever — the app's one accessibility control — exists only in the phone drawer (unreachable on Theo's ultrawide/iPad-landscape) and its own buttons are 34px; the sentinel walks no Community and no Insurance state, so "zero contrast failures" is a claim about one and a half of three CRMs; the white-popover dialog family (`#newMenu`, `#estMenu`, walk/search/partners boxes) sits undecided beside the 925 CRM-dark drawer; `.cr-xl-card` claim/contract links are hardcoded white on the dark profile (the 876 class surviving in the insurance slot); Quick Inspection resume is unreachable — the only surviving entry deletes the saved session ✓ (CR-UX-033, buried-feature class).

---

## Polish batches (P3) — one line each, full detail in the CSV

Emoji stragglers: ~77 entity-encoded + ~10 literal emoji survive the 676–699 sweep (materials card, estimate menus, lead form radios, admin drawer rows, palette, punch card 📅/🔒, rename ✏️) — one sweep whose grep includes `&#NNNNN;`. · Component federation: 96 section-label variants, 58 border radii, ~40 hand-rolled red primary buttons — declare 3–4 primitives, adopt on touch. · 38% of font-size declarations render under 12px at Normal step. · Punch-family naming drift (Punch-outs / Punch & Repairs / Punch-outs & Repairs / The Line / Closed repairs). · Insurance hub "+" still carries two dead "— soon" items. · "day-2 carry" micro-label at the dispatch decision point. · Retail "Archived" vs "CLOSED" split. · + New → "Task" creates an appointment while profile Tasks is a different concept. · Habitat-first honoured in ~2 of 12 partner lists (the New Bid select — the journey's required first field — is plain alphabetical; one shared comparator fixes all). · The New Bid payer select reads the unmasked partner cache (confidential names, bounded to name+type — one line: consume `list()` not `load()`). · `community_contacts` has no writer; the partner editor still has one contact slot (the Galen/Frank/Jim case). · Reviews section on every community card is permanently dead (`.rvsec` vs the live `.rvcard` ✓). · Partner picker overlay survives navigation (write-guarded, screen not). · A parked partner computes "dormant" and the state renders nothing. · `state.project_id` typo in delete-from-editor. · Library picker's empty state points to a retired menu path. · Rep's Money-In tab says "No collections logged" when RLS is why. · An OnHold profile banner renders raw "ONHOLD" on insurance/community. · Storm reports: no 7-day preset. · No in-app "how do I" layer at all (a per-role first-week card would close it). · FEATURES.md still describes Community two redesigns ago.

---

## What's genuinely good — verified, don't "fix" any of this

- **The nav core (924–956) is the best this app has had**: one live `#navMenu` source scraped by drawer and rail, portal-scoped sections found by row (never heading text), one shared fold store, per-CRM colours computed not eyeballed, and hideAllViews/lever discipline held through every 836–965 view.
- **The New Lead form is a model phone capture flow** — progressive disclosure, phone-or-email with a door-knock escape, Unassigned default explained on-screen, insurance fields only when relevant.
- **Production is the most deliberately built corner**: login lands in the hub (854); the punch card leads with its moment; check-in truth is honest and uniform; the no-money fence held everywhere traced (the board says so on-screen); the Magnet Board is genuinely touch-first.
- **Money truth has one precedence and it holds** (654/721/781): signed contracts outrank estimates, collections are the one paid-ledger, `fillContractMoney` is a real chokepoint, and the 960 catalog picker ships with measured contrast and honest ABC failure states.
- **The claim bridge and scope-reader honesty (646–666)** — write-once baselines, append-only history, pre-tick-only-empty-fields protecting verified data from AI misreads.
- **The offline architecture (864–873) is right** — network-first reads, idempotent outbox, overlay-on-reload, RLS refusals deliberately not treated as network (the one hole is the refused-write drop, CR-UX-010).
- **Failure narration in the Visualizer is best-in-app** — queued vs claimed vs asleep vs long-running, each with a sentence.
- **Empty states teach** ("No client projects yet. Use the ＋ button…"), refusals name people ("Ask Theo or Joan"), results announce consequences ("Contract signed — project moved to APPROVED. Curtis has been notified").
- **The 938–944 readability/touch arc closed the audited screens to zero failures** with instruments proven red on prior builds — the residue in this report is the screens those passes never rendered.

---

## Suggestions — features and revamps, ranked by leverage

*(Each checked against settled decisions — none crosses one. Sizes: S = one build, M = an arc, L = multi-session. 1–4 close loops on rails that already exist; the community program above is assumed.)*

1. **The morning email becomes “Waiting on you” (S).** Add community bids due/overdue, check-backs due, unassigned leads, and 14-day-stale leads beside the existing stale-estimates section in `api/digest.js`. Every signal exists in the DB and speaks only when a screen is opened; the community pipeline sat frozen for months with three bids past due and nothing said so.
2. **Log-the-check prompt (S).** When an admin marks a job Invoiced/Closed or records a deposit, offer to write the `collections` row. Money In has zero rows twelve days in; the commission trigger and Friday digest starve without it. Admin-only, so the no-money-on-Production fence holds.
3. **Client-facing SMS on the existing Twilio rail once A2P clears (M).** Day-before appointment reminders, an "on the way" tap from the Magnet Board, server-sent review asks — with an explicit consent field before any send. The compliance pages (902) are already public; `notify.js` texts staff only today.
4. **Automated review follow-up (S).** The follow-up copy already exists in `reviewMsg(followup)`; nothing ever sends it. Schedule it N days after `review_requested_at` when `review_left_at` is empty.
5. **A community invoice document type (M).** Part of the community program (item 2) but valuable alone: the Invoiced stage currently has no artifact anywhere in the app; the `inspection_reports` chassis gives print/share/remote-acknowledge for free and gives collections a document to reconcile against.
6. **Stock-the-Showroom pipeline (M).** Showcase and Hall of Fame hold ONE pair each against a 60,485-photo archive. A Spark-side batch nominates before/after candidates from `studio_photos` tags into `studio_tray` for human curation through the existing admin paths — the Spark stays offline-only per the fence.
7. **Real job P&L for admins (M).** Reports margin currently reads one hand-typed `checklist.job_cost` (present on 5 of 55 jobs). Assemble money-out from crew work orders/payments and ABC totals. Admin-only per the crew-rates rule.
8. **Estimate templates UI (S/M).** `estimate_templates` exists with 0 rows and no UI. "Save as template / Start from template" beside the 960 catalog cuts the commonest estimate to minutes — or drop the table.
9. **Storm-to-canvass loop (M).** From a Storm Data day/neighbourhood: per-report "Open in Maps" links, a "clients near here" jump into the Leads & Jobs geo filter, and one-tap contact-less door-knock leads stamped with the storm date (the 782 form supports them). Zero new dependencies.
10. **Public "request an inspection" intake (M).** A spam-protected public form on the drivewaytest pattern writing an Unassigned lead — storm-night demand lands in the pipeline instead of voicemail. Today `api/` has no public lead route.
11. **Homeowner status link (M/L).** A read-only share-token page (stage, scheduled day, "what happens next" drawing on the Pop-Up book copy) — a signed client currently hears nothing between signature and the crew's arrival.
12. **Warranty registration tracking (S).** A Completed-stage step recording the OC/SureNail registration + Cardinal's labor term, certificate on the job, digest nudge for unregistered completions. Warranty exists only as Library prose today.

**Smaller, high-value (mostly S):** the 30-minute rename pass (Track→Estimates, Contacts→Clients, one word for Portal/CRM, "Cardinal Truth — Insurance" co-branding) · a "Follow up" chip on the live profile (CR-UX-021) · a "My day" strip for reps (today's appointments + their leads with no future appointment, all from caches already in memory) · one-tap assign on the Unassigned card + digest line "N unassigned / N untouched 7+" · deep-link `url` through `notifyTeam` (route and SW already support it) · a Colors tile on the Sales Floor (implements the settled "yes they can see colors") · missing-contact chips (5/10 partners, 10/11 crews have no email — a dead send path for bids) · "needs sorting" classify chip for the 17 unclassified clients · unify the two rep-draw pipelines before first data arrives · referral capture when lead_source = Referral · a per-role "first week" card under Account (the app has no how-do-I layer at all) · community + insurance states for the sentinel so the instrument covers all three CRMs · Text-size control mirrored into the desktop rail at 44px.

**And an adoption watch instead of new modules:** before the next feature arc, re-run this audit's table counts (collections, walks, claim depth, owner_*, objection_attempts, code_letters). A still-empty table is a findability or workflow problem to fix, not a foundation to build higher on.

---

## Honest limitations

- No lens rendered the app against production data with a real signed-in session; DOM/cascade claims are from shipped code, executed functions, and computed ratios — the adversarial pass re-derived every headline claim, but Theo's screens are still the final gate for anything visual.
- Live-DB checks were read-only aggregates; row counts are the 21 Aug snapshot and will drift.
- Line numbers drift every build; this document cites anchors only. The CSV carries the full per-lens evidence.
- The Community history lens reads the record (build log, changelog, prior audits) and spot-checked load-bearing claims at 965; builds not recorded anywhere cannot be reconstructed (the 468–542 gap remains the only such span).
