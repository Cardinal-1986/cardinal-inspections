# CR Community Audit — August 2026

**Commissioned by Theo, 10 Aug 2026, verbatim:** *"Check the entire community
workflow. That's one big section that doesn't feel right at all, I can't point my
finger on it, it just feels messy and somewhat confusing."* And, on capture:
*"This is the most important CRM because jobs could sit for a while."*

**Method.** Five independent audit lenses over the shipped artifact (build-679-era
tree), several findings proven in Chromium or by executing shipped functions in
jsdom, live-DB checks against `yipslubcptjoarblzbpl`. The five lenses produced 51
raw findings; **this document is the deduplicated record — 24 items**. Where
three lenses found the same defect independently, that is triple confirmation,
not three defects; every merge is noted. **All anchor strings re-verified
greppable at build 684** (30/30). Five claims that looked shaky were re-verified
against 684 by a dedicated adversarial pass; their verdicts are marked inline.

**Companion to `CR_AUDIT_2026-08.md`** (the app-wide audit, whose `CR-AUD-***`
numbering this mirrors). Items here are `CR-COM-001…024`; strike them
individually as they close.

---

## The headline — Community was built twice, and the second build hides the first

An older Community lives *on* the ordinary project page: a bid money strip
(Log Submitted / Log Awarded), a Partner attach row, a Property attach row, an
inbound partner Work Orders section, and the Payment Information row. A newer
Community — `#cr-cc`, the black card — replaces the project page wholesale. Its
takeover rule blanks everything the older build made:

```css
#projectView.cr-cc-own>*:not(#cr-cc):not(#dangerZone){display:none !important}
```

anchored in `cr-cc-styles`; applied by `takeOver()` via
`classList.toggle('cr-cc-own', !!on)`. `.wrap` is a direct child of
`#projectView`, so the whole subtree goes. The five older surfaces are **still
built on every render, still styled (~13 KB of CSS across four blocks), still
mutating the DOM — and invisible**. Proven in Chromium: all five compute
`visible` without the class and 0×0 with it.

Nearly everything below is downstream of this duplication: two job menus, five
stage vocabularies, several partner lists that sort differently, four names for
one funder, four screens showing the same 16 jobs under different headings.

**Live DB at audit time:** 16 community jobs, **all stage `Lead`**, 12 with no
bid deadline, 2 with no partner recorded at all, 0 properties,
0 `community_contacts` rows, 0 work orders.

**Why this is the priority CRM (Theo):** community jobs sit for months on grant
timelines. A CRM whose parked-job stage (`OnHold`) is invisible to its own money
math (CR-COM-005) is worst exactly where this CRM lives.

---

## The decision that gates every fix — DO NOT BUILD PAST IT

**Which Community survives?**

- **(a) The black card wins** — port the five hidden surfaces onto `#cr-cc`,
  then delete the old ones and their CSS.
- **(b) The project page wins** — drop the takeover rule; Community becomes a
  skin on the ordinary profile again.

Either is a real build. Choosing without Theo is how the app gets built a third
time. Most items below get *simpler* once (a)/(b) is picked; a session tempted
to fix them piecemeal first should re-read this paragraph.

---

## Blockers

### CR-COM-001 — The takeover rule hides five live community features
*(merges L0F1 + L3F0 + L4F0 — three lenses independently)*
The bid strip, Partner row, Property row, Work Orders section and Payment row are
built, wired and invisible on every community job (see headline). The black card
re-offers **none** of them: its complete action set is
{edithome, live, newbid, open} + {estimate, outcome, schedule, invoice};
`setPartnerForProject` is referenced nowhere in the `cr-cc` block — **you can
read who you are billing and cannot change it.**
Anchors: the takeover rule · `.dbstage` / `.cr-bidstrip` / `.cr-cp-attach` /
`.cr-cprop-attach` / `.cr-wo-section` all inside `#acxMount → .wrap`.

### CR-COM-002 — Billing the partner has no door *(the sharpest consequence of 001)*
*(L0F0; re-verified at 684 by the adversarial pass — see verdict below)*
"Invoice the partner" flips the stage to INVOICED and that is the entire
feature. `openPaymentsPage()` has **exactly one caller** in 3.87 MB — the
`#dbPayRow` click listener — and that row lives inside the hidden subtree. The
last step of the community journey (partner invites → priced → won → runs →
**billed**) has no screen.
**684 verdict:** {{VERDICT_BILLING}}

### CR-COM-003 — The Job Menu mirrors a grid the app retired
*(merges L0F2 + L3F1 + L4F6 — three lenses)*
`syncJobMenu()` mirrors `#jaGrid .jatile` — dead markup the file's own build-609
comment calls "the legacy grid hidden by #tab-overview's display:none rule". The
live menu is `#acxMount`'s `[data-jm]` grid. Community therefore gets **9 tiles
against the app's 13**: Tasks, **Documents**, Measurements, Notifications and
Money In have no entry point — and Documents is the screen that emails the bid
to the funding partner. "Contracts" routes to the Estimates tab because build
652's routing fix landed only on the live grid. Chromium-confirmed.

### CR-COM-004 — "Submit the bid" does not submit, and Bid Submitted is unreachable
*(merges L0F5 + L2F2)*
The green button routes to `CardinalEstimates.openEditor` — the same screen as
"Price it", "Build the bid" and "Open bid" (four labels, one action). Nothing on
the community client page can move a job to `Prospect`/Bid Submitted; the only
setter lives on the **hidden** bid strip (001). Consistent with the DB: **all 16
community jobs sit at `Lead`.**

### CR-COM-005 — OnHold is invisible to Community's money, stages and vocabulary
*(merges L2F0 + L2F6 + L4F5 — Theo's "jobs sit for a while" case)*
Three symptoms, one hole:
- **Money:** the hub's `compute()` and `partners()` branch on
  Lead/Prospect/Approved/Completed/Invoiced — OnHold in none, so a $40k parked
  grant job is in **no tile** ("Out for decision $0 · Awarded $0") and the fold
  logic **scores the parked job as a WIN**.
- **The retail face:** `ORD` and `acxNext()` omit OnHold, so a parked job shows
  raw grey "ONHOLD", no stage arrows — the only offered action is **"Mark
  Lost"**.
- **Vocabulary:** five stage-label maps disagree; the parked stage renders
  "Awaiting Funding", "ON HOLD" or raw "OnHold" depending on screen.
Related closed history: the *insurance* OnHold rail hole was CR-AUD-006/014
(fixed 653/655); the community twin was never touched.

### CR-COM-006 — The Properties module is unreachable
*(merges L0F6 + L4F1)*
Its only caller — the hub tile — passes no argument, and
`openDirectory(partnerId)` alerts `"Open a partner first to see its
properties."` on a missing argument. Every time. No partner row anywhere offers
a properties button, so the advice cannot be followed. The New Bid property
picker is empty on 14 of 16 jobs (0 properties in the DB — nobody has ever been
able to add one).

### CR-COM-007 — Work Orders: an alert, pointing at a hidden section
*(L4F2; the "upload would throw" half was re-verified — see verdict)*
The hub tile alerts "Work orders live on each community job — open a client,
then the Work Orders section." That section is inside the takeover-hidden
subtree (001), so the instruction cannot be followed.
**684 verdict on the upload-throw claim:** {{VERDICT_WO}}

---

## Serious — data integrity

### CR-COM-008 — One partner, three storage shapes, and screens that each read only one
*(merges L0F3 + L1F1 + L4F3 + L4F10; the guardrail symptom is L1F5)*
- `setPartnerForProject` writes **`partner_id` only** — so converting a client
  to Community and attaching Habitat leaves every name-reading screen saying
  "No partner recorded".
- The ordinary **New Lead form** writes a bare **`partner`** string from a
  hardcoded 6-option list that is not the roster — a field no Community screen
  reads. Two live jobs have their funder recorded *only* there, so the facts
  strip shows "BILL TO / —".
- Where **both** id and name exist they drift: 4 live jobs say
  `partner_name='Dayton Home Repair Network'` while their `partner_id` joins to
  a partner renamed `'DHRN'` — four different names for one funder across four
  screens.
- **The bid-email guardrail keys on `partner_id`**, so the jobs most likely to
  be wrong (name-only, bare-`partner`) are exactly the ones it skips — the bid
  email falls back to the homeowner's address on those.

### CR-COM-009 — Recording an award changes who funded it but not who gets billed
*(L4F8)* The outcome step's "Funded by" picker writes `lp.funded_by` only —
never `partner_id`/`partner_name` — so changing the funder at award time leaves
billing pointed at the old partner. Adjacent, **CR-COM-010** *(L2F5)*: the
`awarded_amount` it records is **never displayed again** on any screen; win-rate
math reads it, no human can.

### CR-COM-011 — The same job shows four different dollar figures
*(merges L0F4 + L2F4)* Four modules define "the amount" four ways — hub
`bidAmt()` prefers hand-typed `lead.bid_amount` over the estimate; the client
card prefers the estimate; analytics and the strip differ again. None labels
whose number it is.

### CR-COM-012 — Every line on the Bid tab reads $0
*(L2F1)* The sheet renders `(it.qty || 1) * (it.price || 0)` — but estimate
lines carry `unit_price` and `amount`, not `price`. Line items all print $0
under a correct total.

### CR-COM-013 — Assigning a bid to a rep does not stick
*(L0F7)* Create writes `assigned: [x]` (array); Edit writes `assigned_to: x`
(scalar); readers disagree; the hub's "Assigned to" column actually shows
`created_by`. Re-verified at 684 — and **two further writers of the array shape
exist** (`46538`, `46824` era), so the split is wider than the audit measured.

### CR-COM-014 — The confidential-partner mask has an unmasked door
*(L1F4; post-635 status re-verified — see verdict)* The directory masks
confidential GCs correctly; the audit found the **New Bid payer picker** reads
the raw cache.
**684 verdict:** {{VERDICT_CONFIDENTIAL}}

---

## Serious — the people on the job

### CR-COM-015 — The occupant vocabulary never settles, and one screen contradicts itself
*(merges L1F0 + L4F4 + L1F8)* The person living in the house is "Serving" (pin),
"Homeowner" (contacts card, **which reads a different field and can say "Not
recorded" directly under a filled "Serving" name**), "Work for X" (bid sheet),
"Homeowner" and "Serving" as two columns of the same hub pane. Three roles,
eleven words. And the role labels are set at **7px** against 19–22px names — the
one distinction the business runs on (payer vs occupant vs contact) is the least
legible thing on the card.

### CR-COM-016 — Renter/Tenant is captured on exactly the jobs with no homeowner, then never shown
*(merges L1F3 + L4F7)* The New Bid form correctly demands tenant details for
property-manager partners (Kitty Hawk), saves them — and no screen ever displays
them. The card calls the occupant "Homeowner" on a rental anyway.

### CR-COM-017 — "Site contact — Held by admin." is the only state that can exist
*(L1F2 + the site-contact half of L4F11)* `community_contacts` appears exactly
once in the repo — the read. Nothing writes it, in app, SQL or Spark. 0 rows.
Every community job shows "Held by admin." forever; a crew member reads that as
"the office has the number" when nobody does.

---

## Serious — flow dead ends

### CR-COM-018 — Scheduled is a dead end, and "Get on the calendar" touches no calendar
*(merges L0F11 + L2F3)* The button confirms "Mark this job SCHEDULED?" and sets
the stage — no appointment, nothing on the Schedule Board. Then the card goes
silent: `threadHtml` has branches for Lead/Prospect/OnHold/Approved/Completed
only, so Scheduled (and Invoiced/Closed/Lost) shows no "now" card and no next
step.

### CR-COM-019 — The partner picker survives navigation and writes onto the job you left
*(L3F3)* `position:fixed` at z-index 9500 (under `#pwaNav`'s 9990, so the nav
sits on top of it); `hideAllViews()` never removes it; its Select callback
closes over the project captured at open. Back out, tap Select → the partner is
written onto the **previous** job, silently.

### CR-COM-020 — Leaving Community: polling teardown, a skipped hideAllViews, and a black↔cream flip
*(merges L3F4 + L4F13)* Teardown runs on a polling loop rather than the
navigation contract (ground/footer snap back a beat late); the Photos route
skips `hideAllViews()`; and 6 of the 9 Job-Menu tiles call `suspendForTab()`,
dropping you onto the **cream first-build face** with different labels — the
black↔cream flip Theo can feel but not name.

### CR-COM-021 — After a save, the Location card duplicates
*(L3F2; re-verified at 684 against the 636/679 map work — see verdict)*
`adoptLocation()` records `#acxMount` as home; `renderAcxOverview()` rewrites
that mount's innerHTML; `releaseLoc()` then appends the borrowed card beside the
fresh copy — two Location sections, two `id="dbMap"`, the lower card's buttons
driving the wrong map. Everyday trigger: attaching/changing the partner.
**684 verdict:** {{VERDICT_LOCATION}}

---

## Confusing / polish

### CR-COM-022 — The hub's numbers don't mean what they say
*(merges L0F9 + L2F8 + L4F12)* "Open bids" counts every community job that ever
existed (no stage filter) — it will read 16 forever; the three headline numbers
are the same number; "Due soon" contains every job in the CRM. And the
"Waiting on you" next-action rows *(L0F8)* look identical to the tappable
Partner rows beside them but have no handler.

### CR-COM-023 — Habitat-first holds in exactly one partner list
*(merges L0F10 + L1F7 + L4F9 — the lenses counted 3/4/5 lists; the definitive
census was re-run at 684, see verdict)* The rule ("Habitat sorts first in every
partner list" — CLAUDE.md, load-bearing, the annual TV-commercial partner) is
implemented once, in `ocPartners()` — the *last* picker of the journey. The New
Bid picker — the required first field — sorts Habitat 7th of 10.
**684 census:** {{VERDICT_CENSUS}}

### CR-COM-024 — Small display batch
- Bill-to truncates to "City of" / "Community" (`shortOrg()` word-count rule).
- The Stage cell truncates to the first word: "Bid Requested" and "Bid
  Submitted" both read **"Bid"** (`.split(' ')[0]` against the module's own
  two-word labels).
- The back pill is labelled with a **snowflake** ("❄ Back to bid view",
  U+2744) — also an emoji-sweep site.
- The Reviews section on every community card can only ever say "No reviews
  card on this job."
- The adopted Location card keeps cream-face greens on the black card —
  measured 3.44:1 / 2.5:1, under the floors (ties into the CLAUDE.md
  readability class).

---

## Cross-references

- **Fixed already, 10 Aug (build 679):** the sticky job name, the map
  white-screen crash, the missing way back from a community card. Those were the
  three symptoms Theo could point at; this document is the rest.
- **CR-AUD-018** (community bid falls back to draft estimates) remains open in
  the app-wide audit and compounds CR-COM-011.
- The **Community work-order fence** (inbound partner → Cardinal,
  `cr-wo-script`) is a settled decision — CR-COM-007 is about reachability, not
  about widening that fence.

## Honest limitations

- One lens could not render (no Chromium in its container) and reasoned from an
  ancestor `display:none`; **two other lenses did render the same claims and
  confirmed them**. Nothing in this file rests on the unrendered lens alone.
- Line numbers in the raw findings were 679-era and have drifted; this document
  cites **anchor strings**, all 30 re-verified greppable at build 684.
- The five `{{…}}` verdicts were filled by a dedicated adversarial verification
  pass against build 684 on 10 Aug; each names its own evidence.
