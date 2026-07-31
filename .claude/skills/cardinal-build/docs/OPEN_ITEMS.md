# Cardinal Resource App — Open Items

*The single live list. Current at build **467** · 31 July 2026 · `origin/main @ cc0b591`.*
*When something ships, strike it here and add a line to `cardinal_build_log.md`.*

> **Everything below was verified against the repo or the database on July 28, not carried
> forward from the previous list.** The prior version of this file listed four items as open
> that were already done — `punch_columns.sql`, the $10,000,000 test client, the repo junk,
> and the profile photos. Repeating a stale to-do list wastes more time than having none.
> **Check before you list.** The Supabase connector answers schema and data questions
> directly; the GitHub API answers "is this file still there."

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
| **OpenAI quota (429)** | Coach fallback down | Add credit |
| **Resend sender domain** | Daily digest 403s | Verify `cardinalrenovations.net` DNS, then swap the from-address in `digest.js` |
| **Gemini key** | Exposed in an old session, still unrotated; free tier also 503s | Rotate in Google AI Studio → update `GEMINI_API_KEY` in Vercel → attach billing. **This also gates the Scope-of-Loss autofill on new leads (358)** |
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

Reference: `/agent/workspace/outcome_v2.html` — **Style 4 layout with Style 2's
flow**, which is what he picked ("4 with 2s flow").

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
| **CompanyCam import** | `COMPANYCAM_API_KEY` is set in Vercel. What is known about the API is in `references/companycam-api.md` | The **List Photos** doc page. Not known: whether an account-wide `GET /photos` exists, any date filter, or how tags work — `Photo` has no tag field. **Do not guess these.** Note the agent sandbox cannot reach `api.companycam.com`, so it can only be deployed and tested by Theo |
| **`project_photos` has zero captions** | 236 rows, 216 with `storage_path`, **one** section | Independent of the library and getting worse weekly. `api/caption.js` already exists — worth checking whether it can be pointed at the backlog |
| **The librarian's diagram grammar, in the wild** | Shipped at 466 and gated hard, but the gates cannot prove the **model** uses it well — that needs a live API call the harness blocks | Ask it something with a natural shape after deploy and see whether the diagram matches the prose. A miss is a prompt line, not code |
| **The reported toggle "freeze"** | 464 fixed a one-way toggle. Blocking time measured at **30 ms**, and 95–183 ms at 6× CPU — no freeze reproduced | If it still stalls on the phone it is a **different bug**; needs to know which control and where |
| **Two theme controls on one screen** | A library page shows both the floating ◐ (library skin) and the 🌙 (whole app) | Theo's call which appears where. Flagged, not changed |

## Doc correction

`CLAUDE.md` said zero `project_photos` rows carry `path` or `storage_path`, and the lesson
built on it ("a photo-signing change shipped completely inert"). That was true when written —
**216 of 236 rows now have `storage_path`.** The lesson about testing against real data shapes
still stands; the specific number does not.
