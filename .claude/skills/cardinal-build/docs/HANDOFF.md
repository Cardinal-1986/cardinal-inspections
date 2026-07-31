# Hand-Off — Session Log

> **Newest session first.** The 29 July log begins below the 31 July section.

---

# Session of 31 July 2026 (evening) — builds 487–509

**`main` is at `f397b52`, app stamp build 503. The branch is pushed and 5 commits
ahead, unmerged.** Open a PR from `claude/487-488-listview-contrast` and merge to get
504–509 live. Nothing is uncommitted; nothing is unpushed.

## What shipped

| | |
|---|---|
| **487** | List view unreadable at desktop width (1.57:1). **Not** the documents list — the handed-off task was wrong; see the correction below |
| **488** | What's New printed raw codes — 20 notes carried **Python** escape syntax, which JavaScript does not have. `BUG_CLASSES.md` §11 |
| **489** | Two unpicked contrast tokens **plus a third the audit missed** — it had only checked light theme |
| **490** | `api/sortphotos.js` + the client whitelist, whitelist shipped **before** the writer |
| **491** | Sort photos — moves every photograph in a report to its section and captions it |
| **492** | The General Exterior report, **derived** from `REPORT_TEMPLATE` (five of its ten sections already were the roof report's) |
| **493** | The app claimed "No client projects yet" whenever a load **failed** |
| **494** | Self Check could leave the whole app unable to scroll |
| **495** | **My bug:** 491's button never appeared — gated before the frame had loaded |
| **496** | CompanyCam search found nothing by address — terms ANDed across separate columns |
| **497** | Remove a photograph from a report |
| **498** | **My bug:** Sort hung silently — 24 photos in one POST against Vercel's 4.5 MB, and no timeout |
| **499** | **My bug:** the route made its model calls one at a time |
| **500** | Sort's timeout 45s to 90s, on measured evidence |
| **501–505** | **Every** Gemini route now falls back to OpenAI — 13 of them, audited not remembered |
| **506** | Search: `2444 Edenhill Ave` returned **0** because the record says "Avenue" |
| **507** | Sort fills the Areas of Concern table |
| **508** | The librarian refused to draw concepts — right fence, wrong catch |
| **509** | Resource Library reachable from every screen |

## Read before touching the environment

**Work only under `C:\Users\kpkor\OneDrive\Desktop\cardinal-push`.** Anything written
elsewhere lands in a sandbox layer Theo's own shell cannot see — a full clone, three
builds and four commits were made at `C:\Users\kpkor\repos\` and simply did not exist
for him. Test with a marker file before building, not after.

**I cannot push and cannot merge.** The GitHub connector is read-only (`403` on
`create_branch`) and git has no credential for `git:https://github.com` — GitHub
Desktop's token is stored separately and git cannot use it. **Theo pushes; Theo
merges.** Do not spend a session working around this; it cost him an hour of his
evening.

**`index.html` is CRLF in the working tree.** Python patching is unaffected (universal
newlines in, CRLF out, normalised to LF on commit). A **JavaScript** harness reads raw
bytes, so a multi-line anchor silently matches nothing — normalise first.

**`node --check` every file in `api/` after touching any route** — `check.yml` has no
`npm ci`, so its parse step cannot catch a bad import.

**Anchors: print `repr()` of the real text before writing one.** Three aborts today
came from copying an anchor out of whitespace-normalised display output. And note that
`saveBid` is `async function` — an extractor searching for `function saveBid(` starts
after `async ` and yields code whose `await` is a syntax error.

## Corrections I owe

**The contrast measurement previously in this file was wrong.** It named the wrong
surface, and its prescription would have taken the documents list from 12.63:1 down to
6.69:1. Corrected in the 483–489 section below.

**I told Theo seven routes had no OpenAI fallback. Three already had one.** I listed
them from memory instead of checking. Audit, do not remember.

**Gemini is not misconfigured; Google's capacity is the problem.** `gemini-3.5-flash`
measured 6–14 seconds and returned 503 about one call in four all evening, while OpenAI
answered in 0.6 s. Probe any model by name:
`https://app.cardinalroster.com/api/ai-status?model=gemini-3.6-flash`

## The lesson this session cost the most

**I gated logic and never delivery.** Three separate failures — an invisible button, a
silent hang, and a dead button afterwards — all passed rigorous harnesses, because the
harnesses asked *does the function work* and never *does the control appear, does the
request fit the platform's limits, does the work fit the function's time budget.*

Before calling a feature done: **check the control renders after a real load; check the
request size against 4.5 MB; check the work against the function timeout.** Those three,
before writing the harness.

## Next

**The community outcome form** — `OPEN_ITEMS.md` §1. Designed, agreed, **not built**,
and the largest remaining item. Its last open question is now answered (**check-back
default: 1 year**), the four flows are transcribed from the comp's own labels, and every
function to reuse is located and read.

It is a **build-from-design**: `references/outcome_v2.html` is a 204 KB visual comp
containing three `data-` attributes, all theming. It cannot be lifted. Estimating it as
"wire up the mockup" will be wrong.

It ships with §2, the second clock, which is a **216-character function** once
`check_back_at` exists.

## Still only Theo

Five partner emails (Kitty Hawk **has a live job**) · `GOOGLE_MAPS_API_KEY`
(**referrer-restrict in Google Cloud first**) · **486 has still never been used on a real
phone with real photographs** · and now: press **Sort photos** on a real report and judge
whether the model's section choices are sensible. **No gate here has ever made a real
Gemini call** — every AI claim in this log is about plumbing, never about answer quality.

---

# Session of 31 July 2026 (daytime) — builds 483–489

**483–486 merged (`main` at `0047bbb`, then `e9fa331` for docs). 487–489 are committed on
`claude/487-488-listview-contrast` and NOT pushed** — see "Waiting on Theo" for why and the one
command that fixes it. PRs #49, #50, #51, #52 merged.

**This session ran from a real local clone on Theo's Windows machine** —
`C:\Users\kpkor\repos\cardinal-inspections`, outside OneDrive, because OneDrive corrupts `.git`.
The mechanical gates run there unchanged: they import only stdlib plus `patch_lib`. `jsdom` lives in
the session scratchpad, never the repo. **No Chromium**, so no computed-style harness — that is the
one instrument this machine lacks.

| | |
|---|---|
| **483** | The librarian sheet was cut off by the iPhone home bar. `padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))` + `max-height:88dvh`. Both conventions were already in this file; the panel was the exception |
| **484** | Build index reads job names **first** (names → photos → stamp). New admin-gated `action:'stamp'`. Measured cause: 60,485 photos, 775 project ids, **zero** project rows — the pass had never been reached |
| **485** | The caption trial was not a sample — 53 photos, **1 job**, two days. `companycam_caption_sample()` (SQL **applied**) returns one photo from each of N different jobs; progress counts **jobs** |
| **486** | **CompanyCam photographs into an inspection report.** Picker in the report editor toolbar. Also fixes a pre-existing bug: captions on runtime-minted figures could not be typed in |
| **487** | The **list view's** documents were dark text on the dark page — `#333` at **1.57:1**, `var(--muted)` at **2.97:1**. Scoped to `#listView` with the retail token pair. **Not the documents list, which was never broken** — see the correction below |
| **488** | The updates panel was printing `U0001F4F8` instead of 📸. 20 `CHANGELOG` notes carried **Python** `\U` escapes, which JavaScript does not have. Repaired as surrogate pairs. `BUG_CLASSES.md` §11 |
| **489** | The two unpicked contrast tokens — **and a third the audit missed**, because that pass was scoped to light theme and `--rbe-empty-fg` fails in **both**. All four pairs now clear 4.5:1 |

## ⚠ Read `OPEN_ITEMS.md §0` before touching AI Inspections

It carries a **37-agent audit** (findings adversarially refuted) covering what are now **489–492**:
which route to copy, the three defects in it *not* to carry forward, the vocabulary collision, the
Section 2 trap, and Theo's two settled decisions. **Do not re-audit those surfaces.**

## ⚠ A correction I owe, in my own words

I told Theo *"a template is a section list plus a trade map — data, not code, so General ships
alongside Roof at no real cost."* **False.** There is exactly one inspection report template
(`REPORT_TEMPLATE`, ~163 KB); `GENERAL_TEMPLATE` is a **repair estimate** and the General Checklist
has **zero** file inputs. A General Exterior report is its own build (**492**, renumbered from 490).
I inferred it from my own mockup instead of checking the app.

## ⚠ The contrast measurement I left here was WRONG. Corrected at 487 — read before trusting it

I wrote, and it is false: *"`td.dates{color:#333}` is 1.48:1 on the dark page… `td.dates small` and
`td.title .ref` use `var(--muted)` and read at 7.10:1. Every tokenised line works; every hardcoded
one fails."*

**It could not have been true.** Those colours sit in the same table cell, so they share one
background — and `#333` is *darker* than `#5c5c5c`. On any dark ground `#333` is worse; on any light
ground it is better. `7.10:1` is unreachable for `#5c5c5c` against anything: pure white caps it at
**6.69:1**.

**It also named the wrong surface.** The documents list (`#estDocsMount` / `#inspDocsMount`) sits
under `#projectView`, where `table.reports` keeps `background:var(--paper)` = `#ffffff` at every
width. `#333` measures **12.63:1** there. **Tokenising it to `var(--muted)` — my own prescription —
would have taken 12.63:1 down to 6.69:1 and shipped a regression labelled a fix**, with every
mechanical gate green.

The real failure was `#listMount` inside `#listView`, where 44310 stripped the table background:
`#333` reads **1.57:1** and `var(--muted)` **2.97:1** over `--bg:#09090C`. **Shipped as 487.**

**Theo is NOT mobile-only** — he corrected this directly: desktop *and* an ultrawide. The doc set
recorded mobile-only, and that is why this survived: `table.reports tr{background:#fff}` inside
`@media (max-width:700px)` makes every row a white card on a phone, hiding it completely.
**Check contrast at desktop width, and measure against the element's own background, not the page
ground.**

## Next

**`OPEN_ITEMS.md` §0, in this order: the AI sort → shot lists → Save PDF → General Exterior.**

**Do not put build numbers back on those.** They carried numbers twice in one session (487–490, then
489–492) and both sets were invalidated within hours, because a number is assigned at **ship time in
ship order** — a plan cannot reserve one. Every unplanned fix falsified the queue and every
cross-reference to it. §0 now names the work instead, and says so.

The AI sort is the next substantial build; everything before it this session was small repair work.
Its audit is done and must not be re-run.

## Waiting on Theo — do not nag

Five partner emails (Kitty Hawk Realty **has a live job**); `GOOGLE_MAPS_API_KEY` (**referrer-restrict
in Google Cloud first**); and **486 has never been used on a real phone with real photographs** —
that verification is still outstanding.

~~Two contrast fixes unpicked~~ — **shipped at 489**, along with the dark-theme half the audit had
missed.

**Also outstanding: 487–489 are committed locally but NOT pushed.** Git on this machine has no
credential for `git:https://github.com` (the one in Credential Manager is an API token for
`api.github.com`), and the GitHub connector here is read-only — `403 Resource not accessible by
integration` on branch creation. One interactive `git push` caches the credential and unblocks every
future session on this machine:

```
cd C:/Users/kpkor/repos/cardinal-inspections
git push -u origin claude/487-488-listview-contrast
```

**The Vercel preview on the resulting PR is the only gate that has seen 487's colour render.** jsdom
cannot resolve `var()` and this machine has no Chromium.

---

# Session of 31 July 2026 (overnight, part two) — builds 475–482

**PR #47 is MERGED** (`main` at `6420f27`, build 474). Everything below is **PR #48**, still open as
a draft on the same branch, `check` green and all three Vercel previews Ready.

## The measurement that reframed the whole session

The full sync ran: **60,485 photos indexed**, +1,164 skipped as internal/inactive, reconciling to
61,649 exactly. **79 of them carry a caption** — 0.13%, flat across every year (10 in 2026, 39 in
2025, 30 in 2024, none before).

**Build 472's caption search was built over a field this account does not use.** That measurement
should have come before the build, not after. Everything from 476 onward follows from it.

`project_id`, `creator_name` and `captured_at` **are** populated on all 60,485, across **775 jobs**.

## What shipped

| | |
|---|---|
| **475** | Milestone pill legibility, option C (Theo's pick). Ink per **stage**, not per theme; two colours nudged. 16/16 pass. Bound to `LJ_SOLID`, never `STAGE_COLORS` — the same two hexes live in both |
| **476** | Photo search reads **job names and addresses**. `companycam_projects.sql` (**applied**) + FTS over caption + name + address + creator |
| **477** | The counter read `87,096 of 61,649`. A resumable run starting with no cursor must reset its counters too |
| **478** | **Try AI captions (50)** — a trial, not the backfill |
| **479** | The ask box was hidden whenever the CompanyCam block was open; "Cancel" → "← Back to chat" |
| **480** | ⤢ Expand — reuses `CardinalResourceImages`, with **both** `preventDefault()` and `stopPropagation()` |
| **481** | ⬇ **Save to device** — share sheet then anchors, the job gallery's shape since 216 |
| **482** | ✏️ **Draw on it** — reaches `cr-ped-script`, the editor that already existed |

## ⚠ SQL is ALREADY APPLIED

`companycam_projects` + the two `companycam_photos` columns + the four-field GIN index +
`companycam_backfill_project_names()` are live on Supabase. Idempotent and additive. **Do not
re-apply or treat as pending.**

## Waiting on Theo — do not nag, do not guess

1. **Merge #48**, then press **Try AI captions (50)** and report what the captions say. I read the
   50 back to him. **The 60,406 backfill is NOT built and must not be** without an explicit yes —
   it sends customers' job photographs to a third party.
2. **Five partner emails**: Kitty Hawk Realty (live job), C.G. Egli, CityWide Development, County
   Corp, James Construction. **Never guess one.**
3. `GOOGLE_MAPS_API_KEY` — **restrict the key in Google Cloud before setting it.**
4. Two contrast fixes unpicked: `--rbe-empty-fg` `#8a8a8a`→`#767676`, `--rbe-adm-fg`
   `#8a6a4a`→`#826446`.
5. **AI-generated images** — he said "not sure yet, show me what it can do". I proposed generated
   *illustrations* rather than altered photographs, because **this app runs insurance claims** and a
   restyled photo of a real roof reaching a supplement is an altered-evidence problem for him.
   **I also cannot verify his Gemini key has image generation at all** — the key is a Vercel env
   var. Nothing built. His call.

## My regressions this session, named

- **481's ghost button never applied.** `.lb-ccfile button.ghost` went in unprefixed; every
  neighbour in `cr-lib-styles` is scoped to `#rlLibPanel`, which out-specifies it. "Save to device"
  rendered **solid red, identical to "File selected."** Every gate was green. Caught by 482's scope
  diff, proven with `getComputedStyle` in Chromium, fixed in 482 before merge. **New bug class,
  `BUG_CLASSES.md` §9.**
- Said the sync was "still running" off a 0.9-second-old timestamp; it had stopped.
- Said a counter fix was "fixed and pushed", which read as deployed when it was in an unmerged PR.

## Where the doctrine paid, again

**The markup tool already existed.** `cr-ped-script` — pen, arrow, circle, text, rotate, undo, six
colours — behind the job-photo modal's "✏️ Edit" since long before this session, and unreachable
from CompanyCam. 482 reached it; it built nothing. **Seventh time on this project.**

## Traps recorded

- **`cc-` is two namespaces.** CompanyCam inside `cr-lib-script`, Community elsewhere
  (`data-cc-editbid`). It failed a negative control as a marker. Grep the block, not the prefix.
- **Canvas tainting.** A CompanyCam CDN URL painted into a canvas makes `toBlob()` throw
  `SecurityError` — markup would draw perfectly and fail only at save. All editor bytes come through
  `api/companycam.js` as base64 and reach the canvas as a `data:` URL.
- **Two anchor aborts**, both caught before any write: `canvasBlob(0.9)` stopped being unique
  because the same patch added a second encoder; `data-cc-edit` is a prefix of `data-cc-editbid`.

## Filed, not fixed

- **`annotated` is `true` on all 60,485 rows.** CompanyCam returns a `web_annotation` URI whether or
  not anyone drew on the photo. No caller depends on it.
- The bottom-bar light/dark glitch Theo reported — **he could not reproduce it and neither could I.**

## Standing harnesses in the session scratchpad

`dl481_harness.js` (29) · `edit482_editor.js` (20, real mouse against the real canvas) ·
`edit482_panel.js` (33) · `edit482_tile.js` (14) · `css482_harness.js` (15, computed CSS in a real
engine — **the only instrument that catches a lost rule**).

---

# Session of 31 July 2026 (overnight) — builds 468–474

**Not merged.** Everything below is on `claude/claude-md-documentation-qbvt85`, open as **PR #47**,
`check` green. `origin/main` has NOT moved. Builds 468–472 were merged earlier; **473, 474 and the
`sw.js` change are still in the PR.**

## What shipped

| | |
|---|---|
| **473** | Searchable index of all **61,649** CompanyCam photos. `companycam_index.sql` + `api/companycam-sync.js` (resumable, six pages a call). `api/companycam.js` searches the index when populated, live API when not |
| **474** | `api/config.js` — the route `index.html` has always fetched and never had. Plus `loadConfig`/`loadMaps` stop caching a *failure* for the life of the tab (30s floor) |
| `sw.js` | Same-origin assets → stale-while-revalidate. **CDN stays frozen deliberately** — floating majors, no test runner |
| docs | `.single()` backlog closed as non-existent · doc headers converted to provenance · live data audit |

## ⚠ SQL is ALREADY APPLIED

`companycam_photos` + `companycam_sync` exist on Supabase — 4 indexes, RLS on, 2 read policies, no
write policies, sync row seeded. **Do not re-apply or treat as pending.** Idempotent and additive.

## Waiting on Theo — do not nag, do not guess

1. **Merge #47**, then tap **Build index** in the CompanyCam panel. The status line then reads
   `61,649 photos indexed · N with no caption`. **That N is the whole point** — it is the exact
   size of any Gemini captioning job, which has been guesswork.
2. **`GOOGLE_MAPS_API_KEY` in Vercel — referrer-restrict it in Google Cloud FIRST.** Until then
   maps stay off, exactly as today. 474 cannot regress anything.
3. **5 of 10 community partners have no `contact_email`** (Kitty Hawk Realty has a live job).
   **Never guess these** — see OPEN_ITEMS.
4. `api/coach.js` calls the **OpenAI** API; a ChatGPT subscription does not fund it. Unverified.

## 🚫 Do NOT build without asking

**The Gemini caption backfill.** It sends customers' job photos to a third party. Theo is on paid
Gemini billing (confirmed 31 Jul), so rate limits are no longer the blocker — the decision is.

## Never verified, and it matters

**No call has ever been made against real CompanyCam data from a build sandbox.** Outbound to
`app.cardinalroster.com` and `*.supabase.co` is blocked by the agent proxy. Every assertion behind
468–474 is against a mock shaped like the measured schema. The measured schema itself came from
Theo running probes.

## My regressions this session, named

**469** click delegate bound to a node replaced on every render (buttons inert) · **470** panel CSS
scoped to an ancestor the panel does not sit under (rendered unstyled) · **471** wrong filter
entirely. 468 shipped working-but-unusable and took three builds to become reachable.

## False positives — recorded so they are not re-chased

- **The `.single()` "43-site backlog"** does not exist. `single()` only sets a header; the client
  throws only under `.throwOnError()`, which appears **0 times** in this repo. All 43 guard.
- **Community bid pre-fills the homeowner's address** — cannot fire, 0 of 10 community jobs have a
  project email. Becomes live if that count is ever non-zero.
- A keyword heuristic flagged **5** unguarded `.single()` sites; reading them showed **all 5** were
  false positives.

## Process lesson, six times over

**Six patch aborts from hardcoding a count** — `count('configPromise = null;')` matches its own
`var` declaration; `count('data-cc-sync')` missed a third site. All caught before a write, none
reached the artifact. **Name the sites or assert the shape; do not count a bare string.**

**Two of two reds were the test's fault** — `loadMaps` "still rejected" because it ends by loading
the real Google script no sandbox can reach; the SW offline fallback "failed" because a mock keyed
`caches.match('/')` on the raw string when the real Cache API resolves it against the origin.

---

**Cardinal Roofing & Renovations LLC — `app.cardinalroster.com`**
Session of 29 July 2026, 02:24 → 21:45 (America/New_York).

`origin/main` moved **`69dfb9f` → `202e6f3`**.
**34 pull requests merged.** PRs #7, #11, #29 were opened and closed without
merging (see §5).

---

## 1. Everything merged, in order

Verified against `git log origin/main`. Times are commit times.

### Foundation — telemetry, auth, routing (03:29 → 04:11)

| PR | Commit | Time | What |
|---|---|---|---|
| — | `150d4df` | 03:34 | **Error capture was silently discarding everything.** The telemetry pipeline swallowed its own payloads, so the app had been reporting nothing. |
| — | `35643e6` | 04:00 | Gated the model-backed API routes; standardised on `gemini-3.5-flash`. |
| — | `a0bb53b` | 04:01 | Removed a stray ungated `api:sol` route. |
| #1 | `37d7c25` | 04:10 | Service-worker offline shell fix. |
| #2 | `6a2b955` | 04:10 | Auth state subscription fix. |
| #3 | `9331248` | 04:10 | `robots.txt`. |
| #4 | `b79d9fd` | 04:10 | Removed stray files from `public/`. |
| #5 | `ad0217c` | 04:11 | Error-reporting pipeline. |
| #6 | `0348929` | 04:11 | Gate model routes. |

### Identity — the red/black/grey theme (04:55 → 05:18)

| PR | Commit | Time | What |
|---|---|---|---|
| #8 | `e5b2d8f` | 04:55 | **Retired the gold palette for red, black and grey.** The app-wide identity change. |
| #9 | `9b1bae7` | 05:18 | Landing page: unstuck scrolling, restored header padding, added the theme icon. |

### Community — the two-party problem (09:37 → 13:26)

This is the session's main thread of work. Community jobs bill a nonprofit for
work on a homeowner's house, and the code assumed one party.

| PR | Commit | Time | What |
|---|---|---|---|
| #10 | `e5c12f3` | 09:37 | **Bids were being emailed to the homeowner instead of the funding partner.** The partner is who pays and who decides. |
| #12 | `424363d` | 10:26 | Name the homeowner served *and* the party billed. Added the `data-l` attributes that PR #28 later keyed its styling off. |
| #13 | `e4e98fa` | 10:35 | The emailed bid now says who it is for and whose house it is. |
| #14 | `65593bf` | 10:51 | Deleted two unreachable renderers from the hub. |
| #15 | `0526945` | 11:00 | The inspection report names both parties. |
| #16 | `23a2b00` | 12:02 | The hub's Tools tiles stopped claiming "Not available yet" for tools that work. |
| #17 | `cfbcada` | 12:14 | **Removed an `overflow-y:auto !important` scroll band-aid.** It outranked the inline `overflow:hidden` every modal sets, so scroll chained into the page beneath. First appearance of the scroll-lock class of bug. |
| #18 | `3c1535d` | 12:40 | A Prospective Partners page, and fixed a validity check that never ran. |
| #19 | `e5ba1ce` | 12:49 | **Publish the estimate you are editing, not the newest one.** |
| #20 | `474ed9d` | 13:18 | General contractors were unselectable, and the picker bypassed masking. |
| #21 | `c3b379e` | 13:26 | **Age open bids against the promised deadline, not our own clock.** First of three copies of a day-early date bug. |

### Photos — public bucket to signed URLs (13:52 → 15:08)

A three-step migration so the storage bucket could be flipped private without
breaking image rendering.

| PR | Commit | Time | What |
|---|---|---|---|
| #22 | `dceb1c4` | 13:52 | Step 1 of 3 — serve in-app photos through signed URLs. |
| #23 | `f2193d9` | 14:19 | Step 2 of 3 — sign photos baked into documents. **This PR was inert; see §4.** It also introduced the scroll regression fixed in #37. |
| #24 | `f6da5f3` | 14:54 | Step 3 of 3 — **derive the storage path from the URL**, which is what made #23 actually work. 215/215 paths resolved exactly. |
| #25 | `422cf2f` | 15:04 | Made the app private-bucket-safe *before* flipping the bucket: a global repaint pass plus service-key download in `api/estimate.js`. |
| #26 | `53e0595` | 15:08 | **Declared `@supabase/supabase-js` as a dependency — two serverless functions had never run.** An undeclared import; the functions failed on cold start, permanently. |

### Community identity — green, and no blue (16:54 → 19:11)

| PR | Commit | Time | What |
|---|---|---|---|
| #27 | `896fd4c` | 16:54 | **One green, zero blue, and both surfaces follow the theme.** The `--ccm-*` palette: 57 token declarations, `:root` dark default with a `[data-theme="rb-light"]` override. |
| #28 | `3a6dc79` | 18:57 | **Mark the party being billed.** Keyed off the `data-l` attributes from #12. |
| #30 | `8fac62a` | 18:59 | **Sort, filter and direction toggle on the bid table** — 7 sorts, 6 filter groups. Also fixed the `days()` day-early bug. |
| #31 | `ad5b83f` | 19:11 | Tokenised the last 7 hard-coded shadows. |

### Community workflow — outcomes and stages (19:36 → 20:34)

| PR | Commit | Time | What |
|---|---|---|---|
| #32 | `4bd71be` | 19:36 | **Routed the thread actions.** Replaced a blind dispatcher with 5 real actions. Also the third copy of the day-early date bug. |
| #33 | `f7c3b4c` | 20:19 | **Stopped asking why a community bid was lost.** Theo: a grant not funding this cycle is not a lost sale. |
| #34 | `51bd483` | 20:34 | **A real `OnHold` stage** for bids waiting on a grant cycle. 8 coordinated edits. |

### Blue removal and the scroll fix (21:15 → 21:32)

| PR | Commit | Time | What |
|---|---|---|---|
| #35 | `65f1a13` | 21:15 | Removed the blue that is genuinely community-scoped — 4 rules, including the whole-CRM navy backdrop. |
| #36 | `c9133df` | 21:22 | De-blued community analytics and the punch panel — 25 more rules via `body.cr-cc-open`. |
| #37 | `202e6f3` | 21:32 | **Stopped `openPreview` locking body scroll on a screen the user had already left.** My own regression from #23. |

---

## 2. What the numbers say now

Measured on `202e6f3`:

| Metric | Value | Note |
|---|---|---|
| Blue/cyan CSS rules reachable from Community | **221** | from 253 total; 3 gated away; 250 → 246 (#35) → 221 (#36) |
| Modules writing the global body scroll lock | **13** | 15 lock sites, 19 release sites, all balanced |
| `normStage` copies | **6** | 1 whitelist + 5 delegates |
| `.single()` calls | **43** | throws on zero rows |
| `.maybeSingle()` calls | **0** | |
| `async` onclick handlers | **36** | most without a `catch` |
| `--ccm-*` token declarations | **57** | |
| `STAGES` | `Lead, Prospect, OnHold, Approved, Scheduled, Completed, Invoiced, Closed, Lost` | |

---

## 3. The photos bucket

`storage.buckets.public` for `photos` was flipped **`true` → `false`**.

- **Origin honours it.** A cache-busted anonymous request returns
  `400 "Bucket not found"`.
- **Theo confirmed photos still render** in the app.
- **But 11 of 26 sampled objects (42%) still served from the Cloudflare edge**
  with `Cache-Control: public, max-age=31536000`. I pulled 5,417 KB
  anonymously *after* the flip. Cloudflare caches independently of the
  bucket's `public` flag, and `max-age` is one year.

**This is not fully closed.** See `OPEN_ITEMS.md` §4.

Rollback, if photos ever break:

```sql
update storage.buckets set public = true where id = 'photos';
```

---

## 4. Where I was wrong

These are all mine, all caught during the session, and all corrected. They are
recorded because the *pattern* matters more than the individual mistakes —
`BUG_CLASSES.md` §4 generalises them.

**PR #23 shipped inert.** I tested document photo-signing against `{path, url}`
fixtures. **Zero** estimate photo objects in the real database have `path` or
`storage_path`. The code was correct and did nothing. I found it by running the
shipped functions against the real object shape, and fixed it in #24 by
deriving the path from the URL. *Test against production shapes, not the
shapes you find convenient.*

**"The flip is one step away" was wrong.** I said the bucket was ready to go
private. Auditing found five more code lineages that read photos, and
`api/estimate.js` was live and would have broken. The flip needed #25 first.

**"Zero blue" covered 2 of 35 stylesheets.** Theo caught this. I had made a
confident claim from a block-level scan. A rule-level census found **250**
reachable blue rules.

**The green emphasis never shipped in #27.** Every preview I sent showed it.
Production did not have it. Theo caught it. It shipped in #28.

**I invented a "C.G. Egli Inc" row** in a preview. No community job bills a
general contractor — the real split is nonprofit 11, property manager 1, GC 0.

**Stage pills showed the wrong vocabulary.** Community renders "Bid Requested"
and "Bid Submitted", not "Lead"/"Prospect". Early previews were wrong.

**Two block-level blue classifiers misfiled the Punch List** as
insurance-only, because its CSS mentions "claim" — while it is the panel Theo
had photographed *on the community page*. Rule-level classification fixed it,
and I validated against all three of his screenshots before editing anything.

**PR #37 was my own regression from #23.** Making `openPreview` async put a
network round-trip between the tap and the scroll lock.

---

## 5. PRs opened and not merged

- **#29** — squash-rebase conflicts. Rebuilt as **#30** with a byte-identical
  blob, so nothing was lost.
- **#7, #11** — closed during the session; superseded by adjacent work. No
  content from either is missing from `main`.

---

## 6. Artifacts produced

Design previews. **`/agent/workspace/` was the Hyperagent sandbox and is not reachable from
anywhere else** — only the agreed outcome design has been recovered into this repo, at
`.claude/skills/cardinal-build/references/outcome_v2.html`. The rest are listed for the record and are **not openable**; ask Theo to re-export if one is
needed:

| File | Purpose |
|---|---|
| `community_identity_v3.html` | green identity, dark + light, against red/black/grey |
| `community_green_noblue.html` | the green-and-no-blue palette Theo approved |
| `community_shipped_previews.html` | desktop + mobile, post-ship verification |
| `billed_party_previews.html` | billed-party emphasis options |
| `sortfilter_previews.html` | sort/filter/toggle, adapted to Community |
| `outcome_five_styles.html` | five outcome-form directions |
| `outcome_v2.html` | Style 4 layout with Style 2's flow — **the agreed design** · ✅ **recovered into `references/`** |
| `cardinal_brief.html` | opening architecture brief |
| `rls_audit.html` | row-level-security audit |

`probe_dark.html` / `probe_light.html` were throwaway token-resolution probes.

---

## 7. State at hand-off

- `origin/main` = **`202e6f3`**, deployed.
- Working clone at `/agent/workspace/clone` was the sandbox's own checkout — **not a path any
  other program can use.** Ignore it.
- All 99 script blocks parse. Tag and brace balance verified.
- No known broken behaviour in Retail or Insurance — every community change
  this session was gated by `body[data-crm="community"]`, `body.cr-cc-open`,
  `IC_SKIP`, or `PIPE_SKIP`.
- `OnHold` exists in the whitelist but **nothing writes it yet**. That is
  deliberate and correct ordering; the outcome form is what will write it.

---

## Carried forward — three false alarms — do not re-flag these

All three were flagged mid-session as "never got the dark treatment," and all three were wrong. This is the counterpart to the prime doctrine (*things that look missing are usually buried*): **not every light-coloured thing on a dark ground is a gap.**

- **`.dashcard`** — the "hardcoded white ribbon." Hidden by `#mainView .dashcard{display:none}` since build 352, single instance, inside `mainView`. **Dead markup**, deliberately kept because deleting markup with boot listeners has broken the app before.
- **`#cr-hd2-ribbon`** — the visible clock/date bar. Part of the **header chrome**, which has its own per-CRM token system (`--hbg` / `--hln` / `--hac` / `--tgrad`) independent of the page theme. Dark chrome framing a light page is the intended design. It stayed correct in every screenshot all night.
- **The calendars** — a deliberate **paper-on-iron** design. Cream cells on the dark ground is *why* they read correctly in dark mode. See §6.

**Ask first: is it (a) hidden, (b) chrome with its own system, or (c) deliberate contrast?** Only then is it a gap.


*Carried forward verbatim from the 374–388 session handoff. Still binding.*

**Also carried forward:** that session's "what's next" list (client profile, standalone
Punch page, Production board, Client Directory) is **obsolete** — all four shipped at
builds 389–393. `OPEN_ITEMS.md` §4 is the current light-theme status; this session's
open list is in the "Added 29 July 2026" section of the same file.
