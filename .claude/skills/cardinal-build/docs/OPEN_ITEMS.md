# Cardinal Resource App — Open Items

*The single live list, last worked at build **467** · 31 July 2026 · `origin/main @ cc0b591`. For anything since, read the `CHANGELOG` array in `index.html` — it is the only record that survives work done outside this folder.*


---

## 🔴 Data, not code — audited against the live database 31 July 2026

Read-only audit via the Supabase connector. **Only one item needs Theo.**

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

> **Everything below was verified against the repo or the database on July 28, not carried
> forward from the previous list.** The prior version of this file listed four items as open
> that were already done — `punch_columns.sql`, the $10,000,000 test client, the repo junk,
> and the profile photos. Repeating a stale to-do list wastes more time than having none.
> **Check before you list.** The Supabase connector answers schema and data questions
> directly; the GitHub API answers "is this file still there."

---

## 0. AI Inspections — the live build queue (31 July 2026)

**486 is built and in PR #51; 487–490 are not.** The plan below came out of a 37-agent read-only
audit whose findings were each adversarially refuted. Do not re-audit these surfaces; do re-measure
any number before quoting it.

### ⚠ A correction I owe, recorded so nobody repeats it

I told Theo *"a template is a section list plus a trade map — data, not code, so General ships
alongside Roof at no real cost."* **That is false in this app.** There is exactly **one** inspection
report template: `var REPORT_TEMPLATE` (index.html:7508, backtick literal, ~163 KB, closes 7939),
roof-specific, sections 1–10. `GENERAL_TEMPLATE` (8448) is `buildEstimate('REPAIR ESTIMATE', …)` —
a **repair estimate**, not an inspection report. `#gcModal`, the General Checklist, has **zero** file
inputs. Verified, not inferred.

**A General Exterior inspection report is therefore its own build (490)**, comparable in size to 487.

### ✅ SETTLED BY THEO, 31 July — do not re-litigate

**490's section list, confirmed verbatim.** Author the document to exactly these ten, in this order:

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

**487's route is SIGNED-IN, not admin-only.** The two gates guard different things and are meant to
differ:

| Route | Gate | Why |
|---|---|---|
| `api/companycam.js` (486's picker) | **admin-only** | reaches all 1,437 jobs; can put the wrong client's house in a report that goes out by email and public link |
| the 487 sort route | **signed in** | only ever sees photographs *already in this report*; never touches CompanyCam |

The point of the feature is to take the bottleneck off Theo and Joan, so the crew who shot the roof
can draft the report. RLS already limits Sales to work they created or are assigned. **Cap photos
per sort regardless of the gate** — that is what bounds spend, not the gate.

**Known and accepted:** signed-in means a rep's AI-drafted findings can reach a client without Theo
seeing them first. The confirm-before-send gate covers it — nothing sends until a human clears every
section — but that human is not necessarily Theo. He was told this plainly and chose signed-in.

### 487 — the AI sort (roof template only)

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
- **Theo, unresolved:** whether the new route is signed-in or admin-only. Every CompanyCam-touching
  route is admin-only; every "caption the photo I just took" route is merely signed-in. Nothing in
  the repo settles it.
- Harness must assert `placed + setAside == submitted` — **a silent drop is the failure mode** — and
  that every enum the route can emit is in the client whitelist *before* the writer ships
  (`normStage` lesson).

### 488 — shot lists · 489 — Save PDF

- 488: **reuse `QI_SHOTS`, do not add a fifth list.** Duplication is the real risk.
- 489: `downloadReport()` produces **`.html`, not PDF**. Print → Save as PDF already produces a
  proper vector PDF using the template's `@page` rules; any client-side PDF library would be
  **worse** (rasterised, unsearchable). 489 is a labelled one-tap route through the print path.
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
| **ABC Supply 401** | App registered, credentials + `ABC_ENV` in Vercel, `api/abc.js` reachable, but ABC's auth rejects the pair on **both** sandbox and production | Clean re-paste of both values using the portal's clipboard icons, redeploy (env changes only reach a **new** deployment). If it persists, email **apisupport@abcsupply.com** |
| **ABC account numbers** | Not entered | Ship-To and Bill-To from an invoice or myABCsupply (Branch # 106 already entered) |
| **OpenAI quota (429)** | Coach fallback down. Theo says he pays for ChatGPT — **verify that is API credit, not a ChatGPT subscription.** `api/coach.js` calls `api.openai.com/v1/chat/completions` with `OPENAI_API_KEY` and `gpt-4o-mini`; a ChatGPT Plus/Pro plan does **not** fund that. | Check credit at platform.openai.com → Billing, not chatgpt.com |
| **Resend sender domain** | Daily digest 403s | Verify `cardinalrenovations.net` DNS, then swap the from-address in `digest.js` |
| **Gemini key** | **Theo confirmed 31 Jul he is on paid Gemini billing — the "free tier 503s" note was stale and is retired.** Still worth confirming the key exposed in an old session was rotated. | The 503 retry ladder in `librarian.js` stays regardless (cheap insurance), but paid quota is what makes a bulk caption backfill viable at all |
| **GitHub PAT** | Pasted into chat in the 374–388 session | Revoke if not already done: GitHub → Settings → Developer settings → Personal access tokens |
| **Contract PDFs** | Roofing + gutter ready; siding and windows **missing** | `docs/` now exists in the repo. Siding/window masters were built July 20 in the *"Digital roofing contract formatting"* chat |
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
5. **ABC phase 2** once credentials work: response-shape tuning → "+ ABC Supply" inside the estimate editor → ordering → webhooks to the production board.
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

## 1. The outcome form — designed, agreed, not built

**Status:** design settled with Theo. Nothing shipped. `OnHold` (PR #34) is the
foundation and is already in place.

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

**The check-back default.** Options are 3 months / 6 months / 1 year / 2 years.
I picked **1 year** as a default. **Theo never actually answered this.** Ask
him — he is the one who said some of these run two years.

---

## 2. The second clock — a real bug, currently visible

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

### 3b. Unreadable text — small, safe, do it soon

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

- **The outcome form is still unbuilt end to end**, verified at 472. Zero writers of `OnHold`;
  `check_back_at`, `funded_by`, `referred_to`, `award_cycle` all at **0** references. `chDueBand`
  does still read only `bid_due_at` — that part stands.

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
