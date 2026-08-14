# Cardinal Resource App — Feature Inventory

**Purpose: a map of what already exists, so nobody — human or AI — builds a second version of something that's already here.**

**Rule: read this before proposing any new feature. If something related exists, extend it.**

*Worked forward to **build 627** on 8 Aug 2026. The body of this file was written at 427 with sections
added through 546; **Crews (547–556), builds 557–573, the Vision suite, Cardinal Studio, the
Production dossier (603), OC Colors (615–623) and builds 624–627 are appended at the very bottom, in
that order.** The `CHANGELOG` array in `index.html` remains authoritative for what shipped and covers
468–542, which still has no narrative entry anywhere.*

*⚠️ **Section stamps outrank the header stamp.** This file grew by appending, so a section written at
427 is still a 427 section no matter what the header says. Trust the date on the section you are
reading, and check `cardinal_build_log.md` — the one doc that never fell behind — when they differ.*

*Written at build 427 · 29 July 2026, with sections added at 456–474. For anything since, read the `CHANGELOG` array in `index.html` — it is the only record that survives work done outside this folder.*

> **Four features were "built" on this project that already existed** and were merely unreachable or plain-looking: manual estimates (dead stub), the photo Attach bar (buried under the nav), the punch-list profile card (mounted to a hidden anchor), and the **Team page** (in the burger menu the whole time — build 373 restyled it rather than adding a second directory). When something appears missing, **first assume it exists and is buried.**

---

## Chrome — header + universal banner

| Piece | Where | Notes |
|---|---|---|
| Header bar: ☰ · gold home · CRM title · 🔍 · ＋ | `cr-hd2` | Title **40px, solid `var(--hac)`** — the same accent as the ＋ button, so it matches per CRM (373). Header search **retired** (372) — hidden in CSS, element kept so its wiring survives |
| **Banner nav** | `cr-banner` | Home · Contacts · Leads · Photos · Track · Reports · Production ▾ · Tools ▾ · **CRM switcher** · square search. Lives **inside `header.site`** (346) so it scrolls with the header. Per-CRM skin via `body[data-crm]`. **Resolve-or-hide routing**: an item hides if its opener doesn't exist — deferred to `DOMContentLoaded` so later modules count |
| CRM switcher | `#cbCrm` | Desktop only. Sets the active chip **and** `body.dataset.crm` immediately, then routes — reading the old value first made it need two clicks (369) |
| Ribbon | `cr-hd2` | Gold home + clock / PO + client name; `body.projopen` swaps clock → client context |
| Bottom bar | `pnc` + relocations | Portal chip · health shield · history ◀ ▶ |

`window.CardinalHeader = { build, skin, crm }` — **`crm` is `crmNow` and recomputes on call.** `skin()` publishes the result to `body.dataset.crm`, which is the DOM mirror everything else reads (6 sites) and the only thing CSS can gate on (`body[data-crm="community"]`). Call `crm()` when you need it fresh before `skin()` has run; read the attribute otherwise.

**Retail surface (retail-B, committed at source in 335):** ground `#202329` at the base, not an override layer. The 21-rule `body[data-crm="retail"]` layer is **deleted**; a light-on-paper `@media print` block ships beside the other 14.

---

## Retail light theme (`rb-light`, 374–388)

**A second theme for Retail only**, layered on the committed dark base — not a replacement for it. Dark remains the default.

- **Switch:** the moon/sun button, bottom-right. `window.CardinalRBTheme { toggle, isLight, setLight }`, persisted in `localStorage` under `cardinal.theme.rb`. Sets `data-theme="rb-light"` on `<html>`. **Visible only when `body.dataset.crm === 'retail'`** — Claims and Community are untouched.
- **Mechanism: CSS custom properties, `--rbe-*`**, defined once in `:root` and again under `:root[data-theme="rb-light"]`. One variable swap drives both themes. **This is not an override layer** — that pattern was deleted at 21 rules in retail-B and must not come back.
- **The palette is red/black**, not gold: `--rbe-acc:#c8202e`, `--rbe-accdk:#6b0f18`, `--rbe-acclt:#d4424c`, ground `#f7f7f7`, panels `#fafafa`.
- **`--bg` is the global page ground** (386). Retail-B's iron `#202329` in dark, `#f7f7f7` in light. Pages whose content doesn't fill the viewport (Photo Activity, empty states) show it directly.

**Covered:** Estimates · All Leads & Jobs · Home (pipeline circles, Work Schedule, Accounts Receivable, Recent Leads, Today, Punch strip, Client Projects cards, activity strip + feed) · Photo Activity · Team + Production calendars.

**Not yet covered:** client profile page · standalone Punch page · Production board · Reports · Contacts/Client Directory · Sales Floor · everything in Claims and Community.

**Colours that stay fixed in both themes — semantic, not decorative.** Do not "finish the job" by tokenizing these:
- Milestone/pipeline circle colours (L·P·A·C·I) and the white letters/digits on them
- Status spines and stage-colour accents (`--sc`, `--stgc`, `--rcn`, `--pc`)
- The **lavender PO** on client cards (a deliberate distinguishing choice, see Clients & projects)
- Urgency red, priority colours, CRM badge colours (retail gold `#c9a227` / insurance teal / **community green** — community moved off blue at 427+)
- The AR chart's amber bars, the Activity Count orange figures
- The lit favourite star
- Photo captions (`.phn`) — they sit on the **photo**, not the page
- The chrome-bar blacks (`--cr-black` in the estimates mount) — white text sits on them

**The calendars are the one deliberate exception to the token rule** (387). Dark mode's cream-on-iron is a real design; light mode gets scoped `:root[data-theme="rb-light"] .teamcal` overrides (Option C, red-tinted paper) and the dark original is untouched.

**The header chrome is independent.** `body .site{--hbg/--hln/--hac/--tgrad}` is per-CRM and does not follow the page theme — dark chrome framing a light page is intended.

---

## Clients & projects

Base directory, profile (`#projectView`), create/delete, portal assignment, `convert_client_type`, recent clients, global search, PO numbers via `nextPo()` / `CardinalPO`, rep filter.

**Column gotcha: the client name column is `name`.**

**Client cards are the Badge layout (370) — no cover photos.** Gold monogram in the old image slot, gradient name, **lavender PO**, address, chip row (stage · rep · docs · last touched), Call / Text. Milestone colour runs as a left rail. Mobile rows near-full width; the desktop **Client Projects gallery scrolls horizontally**, 10 cards per row (365). `cover_image` still feeds the **client profile header** — that feature is untouched.

**Base profile internals — borrowed by other modules, don't rename:**
- **Job Menu** = `.jatile` divs in `#jaGrid`, one delegated listener reading `data-ja`.
- **Location** = `#dbMap.dbmap` inside an `.acxsec` accordion — **now above the Job Menu** with a Map/Satellite pill and a Directions chip (348).
- **Google Reviews** = `.acxsec.rvsec`. Section headings = `h3.projsec`.
- **Punch List card** = `#cr-pp-mount`, after `#jaGrid`.

**The Keeper profile (342 · 348 · 349):** iron hero card with a neon stage spine, gradient PO + name, phone/email tappable on the name row, Switch Primary / Add contact and extra contacts in the hero (the Contacts section is retired), Location as a live map card, and **Payments / Punch / History as opening pills** — History in the Cardinal-red timeline. Insurance keeps its own skin throughout.

**Client Directory** (`cliList`, brass, 341): one directory across all three CRMs, per-CRM milestone filters keyed `crm|storedStage`, CRM bottom bar with counts, admin multi-select delete, favourites preserved. Opts out of the portal pre-filter via `renderClientDirectory.__crPortal = true`.

---

## Punch & Repairs (`cr-punch`, 361 · 366 · 368)

**One shared data layer: `window.CardinalPunch { rows, reload, toggle, update, openCount }`** — one query, one write path, reused by every surface. Never add a second.

- **Per-CRM home strips** — `CardinalPunchStrip.html(crm)` renders that CRM's three most pressing open items with a **See all ›** door. Retail iron, Claims teal, Community light.
- **Unified page** (`#punchView`, banner → Production ▾): every CRM at once, retail iron+gold. Grouped **Urgent → Open → Completed**, CRM tag per card, directory-style sort chip + reverse + two-level filter sheets (CRM · Status · Type · Assigned To) and a desktop filter rail.
- **Active / Scheduled tabs** — an item with a `scheduled_at` moves to Scheduled; closing it returns it to Completed on Active.
- **Detail sheet** — customer (tap to open the profile), tap-to-call phone, address → directions, sales rep, **assignee dropdown** (full roster), **priority dropdown** (Urgent red · Normal orange · Low yellow), created + scheduled dates, notes box, photo strip.
- **Five photos required to close.** Camera or upload, stored in Supabase storage with an inline fallback; the counter reads "n of 5 required" and closing is refused below that.
- Table: `punch_items` (`project_id, title, detail, kind, priority, assigned_to, status, created_by, done_at, done_by, photo_url, scheduled_at, photos`).

---

## Team Directory (`cr-team`, 373)

**Standalone light page — no CRM skin.** Burger → 👥 Team. Crew Board grouped **Admin · Production · Sales** (no counts), black/red/white, 18px names, 17px tap-to-call numbers, call/text/edit per row, search, and **+ Add teammate**.

Reads and writes **`team_profiles`** (`email, name, title, phone, photo`) — the same table behind the punch assignee dropdown and the activity-feed avatars, so a number fixed here is fixed everywhere. Roles derive from `ADMIN_EMAILS` / `PRODUCTION_EMAILS`, then `title`, defaulting to Sales. **Admins add; anyone edits their own row.**

---

## Photo Activity (`cr-photos`, 345)

Global `#photosView` — every photo across every job, newest 200, grouped Today / Yesterday / date with counts, client name on each thumbnail, client search, tap-through to the profile. In the banner as **Photos**.

---

## Home (retail)

Pipeline circles (L·P·A·C·I) with white counts and light stage labels (362) · Work Schedule counters — **Completed blue · Jobs Today lavender · 30 Day Outlook forest green**, white labels (371) · Accounts Receivable · **Recent leads + Today band** (350) · twin calendars with the cardinal art as **red→gold gradient masks** (347) · activity rail with rep avatars via `avatarHtml()` · Client Projects gallery.

---

## Community CRM (green `--ccm-*`, rebuilt 359–364, re-themed 427+)

Light desktop-wide layout replacing a 680px phone layout that had **zero media queries**. Tabs **Bids | Partners | Clients** in the header slate-blue with bold separators.

- **Bids** — KPI strip, full-width **Due soon**, Partners and Waiting-on-you side by side, **All bids collapsed** at the bottom.
- **Partners** — roster grouped by type (community programs / property managers / general contractors).
- **Clients** — client table with by-partner and by-stage tallies, rep profile circles.
- Every panel is a **fold**, open by default (All bids the exception). Cards carry depth and a **slate-gradient border**.
- **Bids are editable** (356) — a pencil on each bid row opens the bid form pre-filled; `CardinalNewBid.edit(id)` opens it from anywhere.
- Partner colour coding by name: Habitat green · Community Action yellow · Dayton Home Repair Network blue · Rebuild pink. **Colour is name-matched, not a stored field** — a new partner reads neutral until that's changed.
- Modules: `cr-ch2` (home), `cr-cc` (client page), `cr-nbid`, `cr-cpartners`, `cr-cprop`, `cr-wo`, `cr-can`.

---

## Insurance CRM (Cardinal Claims)

`cardinal_truth_home` (`cr-cth`), `insurance_clients` (`cr-ic`), `sol_intake` (`cr-sol`, Scope of Loss reader, files to 20 MB), `supplement_panel` (`cr-sp`), `insurance_unify` (`cr-iu`), stage machinery (`cr-insstage`), Adjuster Directory (`cr-adj`). ACV/RCV/depreciation/supplement tracking.

**New insurance leads accept a Scope of Loss (358)** — attach the carrier scope on the lead form; saving opens the new claim and runs the existing reader against it. Optional; without a file the form behaves exactly as before.

---

## Estimates

**Entry point (379):** the burger menu's 💰 **Estimates** and the ⌘K palette both open this page. The duplicate "⚡ AI Estimates" menu entry was retired — AI estimating is the red button inside the page. A legacy flat-table estimates view still exists in `LIST_DEFS` but is now unreachable.

**One merged API since 308** — `Object.assign(window.CardinalEstimates || {}, {...})`. Status lanes since 339: **Unsent → Sent → Accepted**, Status ∩ Rep ∩ Trade filters, ⚑ at 5+ days, **no caps and no auto-archive**, desktop dual-pane with live pipeline sums. `estimate_line_items` is the shared price book. Photo attach via `#cr-pae-actionbar`.

**Document rule:** anything needing share / email / signature / print goes through `window.db.create(title, html, projectName, projectId)` → `inspection_reports`.

**Downloads (363):** `window.CardinalDownload { html, frame, url, safe }`. Download sits beside Print / PDF in the document editor and the contract viewer; document list rows already had one. Files save as standalone `.html` — **not true PDF**; a real `/api/pdf` endpoint is still unbuilt.

---

## Navigation & history

Two routers coexist. The modern one (`cardinal-nav`) tags its states `{app:'cardinal-nav'}`; the legacy hash router **yields on those states** (367) — before that it fell through to `showHome()` and hijacked every Back. Punch, Photos, Community hub and Estimates record history via `wrapNav`. New full-screen views must be registered in **`hideAllViews()`** *and* given a restore case.

`hideAllViews()` also **releases a stuck `body{overflow:hidden}`** (364) — modals set it and navigating away never cleared it, which made whole pages unscrollable.

---

## Resource Library (`rlPage*`, builds 442–484)

**CompanyCam import (468, admin only).** Library assistant → **📸 CompanyCam** → narrow by
tag and date → tick → file. Captions come across as titles; where the crew marked a photo up you
get the marked-up rendition. Photos flagged `internal` in CompanyCam are never shown — the route
refuses them, so no UI bug can leak one. Files through the **existing** `library` bucket +
`library_items` pipeline, so imports render as thumbnails via 467 with nothing added.
Back end `api/companycam.js`; `COMPANYCAM_API_KEY` in Vercel, never in the app.

**469–471 — making the importer actually reachable.** 468 shipped it working but unusable, and
each of these is a regression of mine, named as such: **469** the click delegate was bound to a
node that is replaced on every render, so the buttons were inert; **470** the panel CSS was scoped
to an ancestor the panel does not sit under, so it rendered unstyled; **471** the librarian may
request photos by emitting a `~~photos` block — **the model never receives photo data**, only
writes a search, and `api/companycam.js` refuses anything flagged `internal`.

**472 — caption search.** The v1 API has no text search (eleven parameters, none a query), so the
route pages and matches captions itself. Capped at 8 pages / 800 photos.

**473 — the photo index.** `/api/companycam-status` measured the account at **61,649 photos**, so
472's 800-photo ceiling was **1.3%** of it — a photo from last winter was unfindable however it
was worded. `companycam_index.sql` mirrors the metadata into Postgres; **Build index** in the panel
drives a resumable sync (`api/companycam-sync.js`, six pages a call, cursor returned, ~617 pages /
~7 min / zero Gemini). `api/companycam.js` searches the index when populated and falls back to the
live API when not. Internal photos are **never written to the mirror** — otherwise the index
becomes a way around the flag. RLS: admins read, service role writes, **no write policies at all**.

**476 — the caption search had nothing to search.** The first full sync indexed 60,485 photos and
proved **only 79 carry a caption** — 0.13%, flat across every year. 472 was built over a field this
account does not use. `project_id`, `creator_name` and `captured_at` **are** populated on all
60,485 across **775 jobs**, so `companycam_projects.sql` syncs the job names and the FTS index now
covers caption + project name + project address + creator. Ask for a street or a partner and you
get the pictures. **Measure the data before building the search over it.**

**477 — the counter.** A resumable run that starts over with no cursor must reset its counters too.
It didn't, and the panel read `87,096 of 61,649`.

**478 — the AI caption trial (admin only).** Captioning 60,406 photos means sending customers' job
photographs to a third party. That is **not a decision to make on Theo's behalf**, so the button
does **50** and reads them back. The backfill is deliberately not built.

**479–480 — the panel was a dead end.** The ask box was hidden whenever the CompanyCam block was
open, and there was no way to see a photo bigger than a thumbnail. 480's corner expand button
reuses `window.CardinalResourceImages` and calls **both** `preventDefault()` and
`stopPropagation()` — the tile is a `<label>` wrapping a checkbox.

**481 — ⬇ Save to device.** Tick photos → save them to the phone or the computer. Share sheet first
(Photos / AirDrop / Messages in one step), one spaced anchor click per file otherwise — the shape
the job gallery has used since 216. `ccPicked()` is the single reader of the ticked set, shared with
filing. **The ticks stay set afterwards**, unlike filing, so the same set can then be filed.

**482 — ✏️ Draw on it.** The pencil in a tile's corner opens **`cr-ped-script`, the photo editor
that already existed** for job photos — pen, arrow, circle, text, rotate, undo, six colours. It was
never rebuilt, only reached. `open(p, opts)` gained `opts.onSave` (take the blob, skip the editor's
own Supabase write) and `opts.extra` (one more header button); both default absent, so the
job-photo path is unchanged.

- **The bytes come through `api/companycam.js`, never the CDN.** A cross-origin image **taints** the
  canvas and `toBlob()` then throws `SecurityError` — markup would draw fine and fail only at save.
- **The CompanyCam original is never written to.** Nothing here holds a CompanyCam write scope; the
  editor is handed a copy. The marked-up version is a **new** `library_items` row titled
  `Marked up — …` and sourced `CompanyCam <id> (marked up)`.
- Save goes to the section chosen in **Put them in**; **⬇ Device** goes to 481's share sheet.
- `ccDeliver()` and `ccFileBlob()` are shared with 481 and `ccSave()` — one pipeline each.

> ⚠️ **`cc-` is two namespaces.** Inside `cr-lib-script` it means CompanyCam; elsewhere in the file
> it means Community (`data-cc-editbid`). Grep the block, not the prefix.

> ⚠️ **`annotated` is meaningless.** It is `true` on all 60,485 rows — CompanyCam returns a
> `web_annotation` URI whether or not anyone drew on the photo. Filed, not fixed; no caller depends
> on it.

**483 — the sheet fits the phone.** `#rlLibPanel` is a bottom sheet pinned to the bottom of the
layout viewport, which on an iPhone is under the home indicator, and `.lb-box` reserved nothing —
so the ask row was behind it. Now `padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))`
plus `max-height:88dvh` after the existing `88vh`. **Both conventions were already in this file**
(`.cr-ped-tools`, `.cr-est-body`, `#cr-est-picker .box`); the panel was the exception. The sheet
still meets the bottom edge on purpose — its corners are rounded top-only.

**484 — Build index reads job names FIRST.** Was photos → names; now **names → photos → stamp**.
The names are ~8 pages against 617, so going last meant a seven-minute wait for a fifteen-second
result. New admin-gated `action:'stamp'` runs only the backfill RPC, for photos a run just added.
A failed name pass does **not** stop the photo index; a failed stamp does **not** fail the press;
a failed photo pass still reports, as before.

> ⚠️ **The project pass only fires at the tail of a Build index press.** That is why 476 shipped
> and the database still read `0 jobs` — nobody had pressed the button since. 484 moved it to the
> front, but the rule stands: **nothing in the CompanyCam index updates without a press.**

The panel reports the **uncaptioned count**, which is the honest reason a search comes back empty
and the exact size of any future AI-captioning job.


*Written 30 July 2026 against build 456. Absent from this file until now — the 428–451 span
shipped it with no record outside the in-app changelog. Counts re-measured at build 463.*

A reference library with an AI librarian, mounting into **`#resourceLibraryView` only**, as
a fixed overlay. **31 static `rl-page` divs** (35 in the DOM once NACHI builds its four),
and in the DOM **173 `.rl-card` + 11 `.rl-ddcard`** — 166 written in markup plus the rest
built from in-file NACHI templates, before the database adds any. A bare `class="rl-card`
regex overcounts; some of those hits are inside JS template strings, so the file count and
the DOM count are different questions and neither is wrong.

| Block | What it owns |
|---|---|
| `cr-lib-styles` / `cr-lib-script` | the librarian panel — asks `api/librarian.js`, renders with `lbRich()`. Exports `CardinalLibrary` |
| `cr-rltoc-styles` / `cr-rltoc-script` | the contents modal, **the search index**, and the per-page search boxes. Exports `CardinalRLTOC` |
| `cr-nachi-*` (2 pairs) | NACHI curriculum pages + the admin content manager. Exports `CardinalNachi`, `CardinalNachiContent` |
| `cr-ri-styles` / `cr-ri-script` | image zoom and `figureHtml()`. Exports `CardinalResourceImages` |
| theme toggle | `data-rltheme="docket"` (paper) / `"siren"` (dark), `localStorage['cardinalRLTheme']`. Exports `CardinalRLTheme` |

**Token namespaces — corrected at build 474.** This section previously read "its own token
namespace: `--ct-*`". **`--ct-*` is not the Library's.** It is the **Cardinal Truth / insurance**
palette — first occurrence is `body.claim-insurance .projinfo`, and the names are
`--ct-care-*`, `--ct-act-*`, `--ct-chip-*`. Restyling it because this file said "Library" would
have repainted the claims surface. **105 declarations, 937 references**, re-measured at 474.

The Library's own namespace is **`--lb-*`** — 22 declarations, **79** references (48 at build
451; tonight's builds added the rest). Most carry literal fallbacks, which is the habit CLAUDE.md
holds up as the one to copy while 89% of the file's `var()` refs stay bare.

### Adding a page takes FOUR registrations, not three (463)

A static library page is unreachable, or half-reachable, unless **all four** land. Measured,
not assumed: `rlPageMfg` and `rlPageCode` each occur **exactly 4 times** in the file.

| # | Where | What breaks without it |
|---|---|---|
| 1 | the `<div class="rl-page" id="…" data-rltitle="…">` markup | nothing to show |
| 2 | the `map` in `cr-rltoc-script`'s `data-rlgoto` click handler | the hub box does nothing |
| 3 | `parentOf` in the same block | back walks off the page, or exits the library |
| 4 | **`var TOC` — the hand-maintained hub → page list** | **the page is missing from the contents modal and from global search** |

**Point 4 is the one that gets missed.** Build 453 replaced the hand-typed *card* list with
`buildIndex()`; the *page* list survived it and is still hand-maintained. With 1–3 done and
4 skipped, build 463's page rendered correctly, navigated correctly, and its own page search
box found its cards — while the global search returned **zero** for every term on it. That
is a silent half-failure, and only a search assertion catches it.

`CardinalRLTOC.addSection(hub, page)` / `EXTRA_PAGES` is **not** the substitute. It exists
for pages NACHI builds at runtime, and `renderTOC()` filters extras by `e.hub === hubBlock.hub`
— an extra whose hub name matches nothing is dropped without a word.

### Plates — the figure convention (`figure.rl-fig`)

Four plates ship: **1** rise/run/rafter, **2** ice-barrier extension, **3** balanced
ventilation, **4** roof shapes. Structure is `figure.rl-fig` › `.rl-figh` (`Plate N` chip +
title) › `.rl-figb` (the SVG) › `figcaption`.

**Plates inline their SVG and style it with `.fig-ink` / `.fig-acc` / `.fig-hair` /
`.fig-t*`. They do not use the `rl-i-*` icon sprite, and must not.** A `<use>` reference
builds a shadow tree, and a document rule like `.rl-mark .rl-mark-a{stroke:var(--ct-mark)}`
cannot select into it — only inherited and custom properties cross that boundary. Drawing
Plate 4 through the sprite rendered every shape flat ink with no accent.

`.fig-mask` (463) is a filled occluder for multi-volume drawings, painter's-algorithm style.
Its fill and the tile background are **the same declaration with the same literal fallback**,
so a stripped token cannot leave a mask that no longer matches what it sits on.

### Search — one index, four ranks (453, 455, 456)

`buildIndex()` walks **`.rl-groupsep, .rl-card, .rl-ddcard`** per page and returns
`{el, group, title, cite, tags, body}`. `cardRank()` scores **0 title · 1 citation ·
2 `data-rltags` · 3 body text**; `filterTier()` drops the body tier whenever anything
better matched, so a common word doesn't return the whole library. **Both search surfaces
share it** — the contents modal and the per-page boxes. Do not add a third.

- It indexes **elements, not titles**. Before 453 the modal held a hand-typed array and
  matched an `<h3>` by normalised string, which mapped curly quotes to a double quote —
  three cards with a curly apostrophe were unreachable. `scrollToCardEl(entry)` takes the
  element.
- **`.rl-search` boxes mount on pages with 4+ `.rl-card` and a `.rl-pagehead`** — 17 of
  them — immediately after the page head, re-seated on every mount pass because the NACHI
  module inserts its nav card at the same `head.nextSibling` slot on `rlPageInsp`.
- **`#resourceLibraryView .rl-search{top:0}` lives in `cr-hd2-styles`**, overriding the
  `top:66px` in the library's own block. Not a conflict — that block also hides
  `.ins-header` and pins the view below `--headh`, so 0 is the correct offset.
- **Do & Don't (`rlPagePitfalls`) is `.rl-ddcard`, not `.rl-card`.** Its indexed title
  carries the polarity (`Don't — …`) because `renderTOC()` prints group headings **only
  when there is no query**, so a DON'T would otherwise surface from a search as a bare
  title that reads like advice. It gets no search box of its own by design — filtering one
  column of a two-column layout leaves a heading with nothing under it.
- The flash class `cr-rltoc-flash` is scoped to **both** `.rl-card` and `.rl-ddcard`.
- **A title that repeats within its page is qualified with its group** (457). Three cards
  on `rlPageMfg` are called *Contractor Program & Warranty Tiers* and three *Do-Not-Mix
  Rules* — one each for Owens Corning, GAF and CertainTeed — so a search returned three
  identical rows and picking wrong meant reading GAF's rules on an Owens Corning roof.
  Six rows library-wide; unique titles are left exactly as written.

### Scope fence — stated in the module banner and the API header

The Library files **reference** material: building code, roofing, siding, windows, gutters,
manufacturer specs. It has **no knowledge of projects, clients, inspections, photos or
Company Documents, and must never be pointed at them.** A design constraint, not an
oversight.

`lbRich()` **escapes first, then promotes** a small marker set on the already-escaped
string — tables, headings, bullets, numbered lists, bold. By the time any promotion rule
runs every `<` is `&lt;`, so nothing the API returns can open a tag. No links, no images,
no raw HTML. If you extend it, keep that order and keep the set small.

**`nachi_articles.html_content` is the deliberate exception** — it is rendered raw by
`renderSeriesPage()`, because the content manager is an admin-authored rich-HTML editor
with an HTML-source toggle. `esc()` is applied to title, tags and source around it.
So `figureHtml()`'s unescaped `url` is **not an XSS** — it takes a Supabase signed URL, and
an admin who could exploit it can already type raw HTML into the same editor.

### Known, not fixed

- `rlPageCode` → *Roof Decking / Sheathing* conflates rot-driven decking (a condition item)
  with a code-driven decking upgrade (genuinely Ordinance or Law).
- Sales Floor carries a second `[data-rl]` handler that routes into the library.
- Content gaps measured by probe at build 455: siding and gutter **systems** (only
  measurement pages exist), low-slope/TPO/modified bitumen, and post-sale process
  (punch list, final inspection).

---

## Everything else

**Google Maps (`cr-gmap-*`) — was inert until build 474.** Address autocomplete, the satellite
property image, and the Directions / View-on-Maps buttons. All of it depended on `/api/config`,
**which had never existed** — no `api/config.js`, and `vercel.json` holds only the digest cron.
`loadConfig()` caught the 404, set an empty key, and every consumer short-circuited: `loadMaps()`
threw, `staticMapUrl()` returned `''`, and `insertMap()` bailed before building its block, taking
the two key-free buttons with it. CLAUDE.md recorded only "autocomplete is silently off"; the
module was dead end to end. 474 adds the route and stops `loadConfig()`/`loadMaps()` caching a
*failure* for the life of the tab (30s floor, so a broken route costs no network).
**Needs `GOOGLE_MAPS_API_KEY` in Vercel, referrer-restricted first** — unset means an empty key,
which is exactly today's behaviour. Not verified against production: outbound to the live host is
blocked from the build sandbox.

Photos & Album (`cr-pae`, `cr-ped`, `cr-paf`), Inspections, Documents/contracts (isolated iframes), Production board (`cr-pb`), Sales Floor + Objection Coach (`cr-sf`, `cr-coach`), Scheduling, Client Portal (`cr-portal`), Cross-links (`cr-xlinks`), AccuLynx import (`cr-import`), Adjuster Directory, Recents, Search, CSV, Undo, Offline, Palette, Perf, Errors, Invariants, Self Check (`cr-sc`), Admin health badge (`cr-ahc`), Changelog (`CardinalChangelog`), NACHI content, **Resource Library — see its own section above**, ABC Supply (`cr-abc`).

**Company letterhead (`brand/`) — not an app surface, and deliberately not deployed.** A Word
template Theo writes letters in: `brand/Cardinal_Letterhead.docx`, the rendered `.pdf`, the
generator (`letterhead.js` + `fix_field.py`), the extracted logo, and a README. **Nothing in
`index.html` references it and nothing should** — it is a document, not a screen. `brand/` is in
`.vercelignore` because a blank letterhead is the raw material for forged correspondence. Its logo
and contact details are *copies* of values that live in shipped code (the `cover-logo` data URI in
`index.html`, the address in `api/estimate-to-contract.js`, the print footer in `api/share.js`) —
**those remain the source of truth**, so a phone-number change has to be made there too, not only
here. Rebuild steps are in `brand/README.md`. Not verified against production: outbound to the live
host is blocked from the build sandbox, so "`brand/` 404s" is reasoned from the `.vercelignore`
entry, not proven by request.

**Live back buttons — do not "clean" these:** `galBackBtn`, `commsBackBtn`, `apBackBtn`, `icBackBtn`, `jdBackBtn`, `payBackBtn`, `rlBackBtn`, `tskBackBtn`.

---

## Permissions

```
projects:             full set — sales own-only via created_by
estimates:            est_read = is_full_access() OR project readable · est_write · est_update
punch_items:          punch_read = is_full_access() OR project readable
estimate_line_items:  eli_read (all authenticated — it's the price book) · eli_admin ALL
team_profiles:        readable by the team; admins write anyone, users write their own row
```

`project_assigned_rep()` takes `p.checklist`, **not** `p.id`. `is_cardinal_admin()` is security-definer. Theo + Joan are hardcoded admin fallbacks in SQL and API.

---

## Before you build something new

0. **Patching or replacing?** Say so, with costs.
1. **Search this file.**
2. **Grep the app — for the REAL structure.** A theming class is not the element.
3. **Assume it might already exist and be buried.** Check whether its mount anchor still exists.
4. Extend, don't add. One pipeline per concept — one punch layer, one bid form, one download helper.
5. Share / email / sign / print → `db.create()`.
6. New `window.Cardinal*` export → `Object.assign` merge.
7. **Add a row here when you ship.**

---

# Community CRM — detail as built, 29 July 2026

*Updated 29 July 2026 — session of 34 merged PRs, `origin/main @ 202e6f3`, app stamped build 427.*

## 2. Stages

`STAGES` is the whitelist. Order matters — it drives sorting.

```js
var STAGES = ['Lead','Prospect','OnHold','Approved','Scheduled',
              'Completed','Invoiced','Closed','Lost'];
```

Community renders its own vocabulary via `LABEL`. **Community never shows the
words "Lead" or "Prospect" to a user.**

| Stage value | Community label |
|---|---|
| `Lead` | Bid Requested |
| `Prospect` | Bid Submitted |
| `OnHold` | **Awaiting Funding** |
| `Approved` | Awarded |
| `Scheduled` | Scheduled |
| `Completed` | Build Complete |
| `Invoiced` | Invoiced |
| `Closed` | Closed |
| `Lost` | **Not Awarded** |

Both community `LABEL` maps — hub and client page — are byte-identical, so one
edit covers both. That is intentional; a count of 2 is correct.

`STAGE_ORDER` matches `STAGES` exactly, with `OnHold` after `Prospect` — a held
bid *was* submitted, so it sorts after submission.

### `OnHold` (PR #34)

Added because Theo said: *"Some of these could last 2 years before approval
depending on the grant and funding."*

Visible **only** in Community, via the app's existing per-CRM skip convention:

```js
var IC_SKIP   = { 'Lead':1, 'Prospect':1, 'OnHold':1 };
var PIPE_SKIP = { retail:{ 'OnHold':1 }, insurance:{ 'OnHold':1 } };
```

- `IC_SKIP` keeps it out of the Insurance stage list (existing mechanism).
- `PIPE_SKIP` keeps the board column off Retail and Insurance. New this
  session, deliberately copying `IC_SKIP`'s shape rather than inventing one.
- Board column: `label:'ON HOLD'`, swatch `.pipe-onhold{background:#047857}`,
  tooltip *"Bid in, waiting on a grant or funding decision"*.

**Win rate needs no change.** It computes `decided = won + lost`, so a held bid
is excluded from the percentage rather than counted as a loss. Verified: two
won + one lost = 67%, and adding a held bid leaves it at 67%.

⚠ **Nothing writes `OnHold` yet.** That is correct ordering (see
`BUG_CLASSES.md` §3) — the outcome form will write it.

---

## 3. Loss handling — deliberately different from Retail

Retail and Insurance prompt for a reason from `LOSS_REASONS` when a job is
marked lost. **Community does not.**

Theo, verbatim: *"Dont need the why we didn't get it."* A grant that did not
fund this cycle is not a lost sale, and forcing a reason produces noise.

Gated by `_isCommunityLoss` (PR #33). `LOSS_REASONS` is untouched for the other
two CRMs.

---

## 4. Sort, filter and direction toggle (PR #30)

State:

```js
var chState = { sort:'due', dir:1, sets:{} };
```

### Seven sorts (`CH_SORTS`)

`Bid deadline` (default) · `Homeowner` · `Bill to` · `Bid amount` · `Stage` ·
`Age in stage` · `Address`

`chSorted` **pins undated rows last in both directions** — otherwise reversing
the sort floats "no deadline set" to the top, which is never what you want.

### Six filter groups (`CH_GROUPS`)

| Key | Label | Derives from |
|---|---|---|
| `partner` | Bill to | `partnerOf(pr)` |
| `ptype` | Partner type | `TYPE_LABEL[metaOf(...).type]`, default "Community program" |
| `stage` | Stage | `LABEL[normStage(pr.stage)]` |
| `due` | Bid deadline | `chDueBand` |
| `ho` | **Homeowner** | `homeownerOf(pr) ? 'Recorded' : 'Not recorded'` |
| `rep` | Assigned to | `chRepName` |

`ho` is community-specific and the reason the feature was worth building: 2 of
12 jobs have no homeowner recorded — exactly the ambiguity the two-party header
was meant to remove. This makes those two findable in one tap.

### Due bands (`chDueBand`)

`No deadline set` · `Overdue` · `Due today` · `Due this week` · `Later`

⚠ **Known bug.** Always reads `bid_due_at`, even when a bid is on hold waiting
for a grant. A 2024 bid reads −713 days and sorts most-urgent forever. See
`OPEN_ITEMS.md` §2.

---

## 5. The two-party header and billed-party emphasis

PR #12 named both parties and added the `data-l` attributes. PR #28 used those
attributes to mark **who is being billed** — the thing Theo most needed at a
glance:

```css
.cc-tbl td[data-l="Bill to"]{ background:var(--goodbg);
                              box-shadow:inset 2px 0 0 var(--acc) }
.cc-tbl th.k-bill{ color:var(--acc) }
.cc-idp .k.b{ color:var(--acc) }
```

Keying off an attribute PR #12 had already shipped meant no markup change — the
styling attached to structure that already existed.

Downstream, both parties now appear in the emailed bid (#13) and the inspection
report (#15), and bids route to the **funding partner**, not the homeowner
(#10).

---

## 6. Thread actions (PR #32)

The thread action bar previously used a blind dispatcher: every `[data-act]`
button was wired to the same handler regardless of what it claimed to do —
which is why "Log the outcome" opened the estimate page.

Now explicitly routed, in `ccDoAct(a, pr)`:

| Action | Effect |
|---|---|
| `estimate` / `newbid` / `open` | `CardinalEstimates.openEditor(pr.id)` |
| `won` | confirm, then `setStage(pr.id, 'Approved')` |
| `lost` | `setStage(pr.id, 'Lost')` — no reason prompt in Community |
| `schedule` | confirm, then `setStage(pr.id, 'Scheduled')` |
| `invoice` | confirm, then `setStage(pr.id, 'Invoiced')` |

Prospect offers two buttons rather than one ambiguous action. Confirmations name
the partner: *"Mark this bid AWARDED by Habitat for Humanity?"*

`setStage()` stamps `stage_since` and `t_<stage>`, so the outcome is recorded
rather than just flagged.

**This is the error-handling pattern to copy** — one of the few handlers with a
real `catch`:

```js
}catch(e){
  console.error('[community client] action failed:', e);
  alert('That did not save — ' + (e.message || e));
}
```

---

## 7. Palette (PR #27, #31, #35, #36)

**57 `--ccm-*` token declarations.** Dark is the default at `:root`, with a
`[data-theme="rb-light"]` override. CSS custom properties resolve regardless of
block order, and `:root` tokens inherit to `body`.

| Token | Dark | Role |
|---|---|---|
| `--ccm-ground` | `#0e100f` | page background |
| `--ccm-card` | `#161918` | card surface |
| `--ccm-raise` | `#1e2220` | raised surface |
| `--ccm-ink` | `#f2f4f3` | body text |
| `--ccm-mute` | `#9aa39e` | secondary text |
| `--ccm-dim` | `#7d8781` | tertiary text |
| `--ccm-line` / `--ccm-line2` | `#2a2f2c` / `#232725` | borders |
| `--ccm-ac` | `#34D399` | **the green accent** |
| `--ccm-ac2` | `#6EE7B7` | lighter accent |
| `--ccm-wash` / `--ccm-washln` | `rgba(4,120,87,.18)` / `#047857` | accent wash |
| `--ccm-rd` / `--ccm-rdw` | `#ff6b78` / `rgba(200,32,46,.16)` | danger |
| `--ccm-onac` | `#08240f` dark / `#ffffff` light | on-accent labels |

**Always use a literal fallback** when referencing these from outside the
community stylesheets: `var(--ccm-card,#161918)`. PR #31 tokenised the last 7
hard-coded shadows (`.cc-card` was already tokenised — 7, not 8).

### Blue removal

| Round | Mechanism | Result |
|---|---|---|
| Census | rule-level across 35 stylesheets | 253 total, 3 gated away, **250 reachable** |
| PR #35 | 4 already-community-gated rules, incl. the whole-CRM navy `body[data-crm="community"]{background:#0a1420}` | 250 → 246 |
| PR #36 | 25 rules via `body.cr-cc-open` | 246 → **221** |

`body.cr-cc-open` is toggled in exactly one place — the community client page's
`takeOver()` — making it a safe community-scoped gate.

221 remain, of which 69 are in the global block and cannot be changed without
affecting Retail and Insurance. See `OPEN_ITEMS.md` §3c.

---

## 8. Photos — signed URLs (PRs #22–#26)

The `photos` bucket is **private**. Images are rendered through signed URLs.

**Path derivation (PR #24)** — the fix that made the migration work. No photo
object in the database has `path` or `storage_path`, so the path is derived from
the URL. 215/215 resolved exactly:

```js
function photoPathOf(p){
  if(!p) return null;
  var direct = p.path || p.storage_path;
  if(direct) return String(direct);
  var u = String(p.url || p.data || '');
  if(!u || u.slice(0, 5) === 'data:') return null;
  var m = /\/object\/(?:public|sign)\/photos\/([^?#]+)/.exec(u);
  if(!m) return null;
  try{ return decodeURIComponent(m[1]); }catch(e){ return m[1]; }
}
```

**Global repaint (PR #25)** — a deliberately narrow selector so it cannot touch
data URIs or other buckets:

```js
var imgs = [].slice.call(
  scope.querySelectorAll('img[src*="/object/public/photos/"]'));
```

**`api/estimate.js`** gained `storagePathFromUrl` plus a service-key download,
and now sends inline base64 to the model via `callOpenAI(prompt, photoParts)`.

### 🚫 Never mutate `estimates.photos`

`saveEstimate()` persists those objects **verbatim**. Writing a signed
(expiring) URL back into the array corrupts the record permanently. Sign for
display only, never for storage.

`PHOTO_DOC_URL_TTL = 315360000` (ten years) for photos baked into documents,
since a document may be opened long after it was generated.

---

## 9. Preview scroll guard (PR #37)

`openPreview` became `async` in PR #23, which put a network round-trip between
the user's tap and the body scroll lock. The precondition is now revalidated
**after** the await:

```js
var docUrls = (typeof signedPhotoMap === 'function')
  ? await signedPhotoMap(estimatePhotoPaths(est), PHOTO_DOC_URL_TTL) : null;
function _pvStillOpen(){
  var ed = document.getElementById('cr-est-view');
  return !!(previewEl && previewEl.isConnected &&
            ed && ed.classList.contains('open'));
}
if(!_pvStillOpen()) return;
var html = buildDocHtml(est, project, docUrls);
var frame = previewEl.querySelector('[data-slot="pv-frame"]');
if(!frame) return;
frame.srcdoc = html;
previewEl.classList.add('open');
document.body.style.overflow = 'hidden';
```

`publish()` and `transferPhotosToReport()` also await `signedPhotoMap`, but
neither locks scroll — verified — so the bug was unique to `openPreview`.

---

## 10. The outcome form — SHIPPED at 513 (with 514 and 515)

Was "designed, agreed, not built" from 29 July until **31 July, builds 513–506**.
Reference design: `.claude/skills/cardinal-build/references/outcome_v2.html`
(Style 4 layout, Style 2 flow) — built as drawn.

**Where it lives:** `<script id="cr-cc-script">` (the community client page), rendered
as a **pane inside `#cr-cc`**, not an overlay. No fixed positioning, nothing for
`#pwaNav` (9990) to strand, and **no 14th writer of the global body scroll lock** —
that count stays at 13.

**How you reach it:** the *Waiting on a decision* card (stage `Prospect`) now offers a
single **Record the outcome** button in place of the old Awarded / Not awarded pair.
A parked job (`OnHold`) gets its own thread card that re-enters the same step.

### The four outcomes

| Outcome | Writes | Stage |
|---|---|---|
| **Awarded** | `bid.awarded_amount`, `bid.awarded_at`, `lead.funded_by` | `Approved` |
| **Still waiting** *(second — the most common)* | `lead.check_back_at`, `lead.award_cycle` | `OnHold` |
| **Referred onward** | `lead.referred_to`, `lead.referred_at`, `lead.check_back_at`, and `lead.partner_name` / `partner_id` follow the referral | `OnHold` |
| **Not awarded** | nothing but the tarp date | `Lost` |

`lead.tarped_at` is on all four — tarping happens regardless of how the bid lands —
and is **displayed**, on the parked card and the awarded card. That closes Theo's
*"It is nice to show when the tarp was put up."*

**No reason field**, deliberately. `setStage('Lost')` already skips `LOSS_REASONS` for
community (PR #33, §3 above), so nothing asks and nothing is guessed.

### Things worth not relearning

- **Money reuses `checklist.bid.awarded_amount`** — the field `promptForBid()` writes
  and `.cr-bidstrip` displays. An outcome-only copy under `checklist.lead` would have
  forked the number already on screen.
- **Checklist patch runs BEFORE `setStage`.** `setStage` fires its own
  `patchProjectCk` without awaiting it, and `patchProjectCk` reads `pr.checklist`
  synchronously at call time — so a patch started *after* it races `stage_since` and
  `t_<stage>`. This order cannot lose either write.
- **`mergeCk()` touches only the keys handed to it.** Stripping every empty value the
  way `saveBid()` does would have deleted `bid_due_at` on the nine community jobs that
  hold it as an empty string.
- **The partner pickers read `CardinalCommunityPartners.list()`**, the masked view, and
  sort **Habitat first**. Nothing is hardcoded — the mock's partner names were
  illustrative and are not this account's roster.
- Typing does not re-render (the caret would jump). State lives in `oc`; hand-picking a
  date clears the segment highlight in place.

### 514 — the second clock

`bid_due_at` is when *our* bid was owed to the partner. Once a job is parked on a grant
that date is meaningless and keeps ageing, so the job sorted as the most urgent thing on
the board forever. `chDueIso(pr)` returns `check_back_at` when the stage is `OnHold` and
one is set, otherwise `bid_due_at`, and it feeds **`chDueBand`, the deadline sort, the
undated partition and the All-bids Due column** — plus the client page's facts strip,
which relabels **Due → Check back**. The chip drops `.cc-pill.due` (the red one) for the
neutral one and reads `N d hold`. Sort/filter label is now **Due / check back**.

A *missed* check-back still bands **Overdue** — that is the one thing on a parked job
worth shouting about. `OnHold` with no `check_back_at` keeps the old behaviour.

### 515 — the Bill to card had lost its fill and its border

Found by 513's own structural gate, pre-existing. `#cr-cc .ct.bill` filled with
`var(--goodbg)` — a token declared inside `#cr-ch2` (the hub) and **nowhere else**. In
`#cr-cc` scope the value was invalid, so Chromium dropped the whole `background`
declaration, and the gradient border went with it exactly as that rule's own comment
warns. Computed `background-image` was **`none`** at 503 and is a real gradient at 515.
Now `var(--ccm-wash,rgba(4,120,87,.18))` with a literal, per 448–449.

That card is the community CRM's "who gets the invoice" marker (PR #28), which makes it
the last thing that should render blank.

---

# Retail — the card raise (build 522)

**One block, `<style id="cr-raise-styles">`, last in the file.** Geometry only: it declares no
`color` and no `background` anywhere, and the harness proves 521→522 moved no background or ink on
any probed element.

**Where the raise comes from.** Before 522, exactly **three** rules in the whole file carried the
home card's lift — `.pipecard`, `.actcard`, `section.history`. Everything else in retail was flat
(1px border, no shadow) or on the older, weaker `--rbe-cardshadow`. The recipe, minus its palette
half:

```css
border-top:2px solid var(--rbe-ridge-t);
border-bottom:2px solid var(--rbe-ridge-b);
box-shadow:var(--rbe-ridge-sh),inset 0 1px 0 var(--rbe-ridge-hl);
```

**Shadow follows the page; bevel follows the card.** `--rbe-ridge-sh` is untouched — the drop shadow
lands on the themed page, so the token is already correct in both themes. The two *edge* tokens are
re-declared on the card per ground family, because most retail cards are a hardcoded `#fff` in
**both** themes:

| Family | Cards | Bevel |
|---|---|---|
| **LIGHT** | `.dbmoney` `.dbrow` `.acxsec:not(.rvsec)` `.contactrow` `.locrow` `.ldbox` `.jatile` `.matcard` `.ckcard` `.afrow` `.apprrow` `.wsrow` `.audrow` `.bday` `.chatbox` `.cdoccat` `.cdocrow` `.setrow` `.tmbody` `.rptkpi` `.cr-est-*` | `#ffffff` / `#d9d9d9` / `rgba(255,255,255,.9)` |
| **TOKEN** | `#projectView .projinfo` `.jobvalrow` `.jabox` · `.cre-card` `.pu-card` | `:root` values — same as home |
| **DARK** | `.cr-sf-today` `.cr-sf-block` `.cr-pb-job` | `#454552` / `#050507` / `rgba(255,255,255,.09)` |

**32 selectors**, across client profile, client list, team, documents, reports, settings, estimates,
punch, Sales Floor and the production board.

### Do not "fix" these — they are decisions

- **`#projectView` on three selectors is specificity, not scope.** `cr-keeper-styles` styles
  `.projinfo` / `.jobvalrow` / `.jabox` at (1,3,1); a plain class selector loses to it. `.projinfo:hover`
  is (1,4,1) and needs its own companion rule or it snaps back under the cursor.
- **`.acxsec:not(.rvsec)`** — `.acxsec.rvsec` is the dark red review card with a deliberate red inset.
- **`.tmcard` is not raised, `.tmbody` is.** `#teamView .tmcard` is *deliberately* flat
  (`box-shadow:none;border:0;border-radius:0`) — the Team redesign made it a row inside `.tmbody`.
  `.tmbody` lifts from below only, because `.tmband` is its top edge.
- **`.jatile` and `.bday` are ungated on purpose** so their (0,1,0) stays under the (0,2,0) `:hover`
  rule and the hover lift survives.
- **Radii are untouched.** `.acxsec` holds a light `.acxhead` with square corners as its first child;
  rounding the parent alone leaves the header poking out.
- **`.rptkpi`'s red top cap and `.setrow`'s red left edge stay** — semantic, asserted unchanged.
- **Chips and insets are not cards** and were left alone: `.projcount` `.hstat` `.payhead` `.paynet`
  `.actbox` `.ljab` `.ljfact` `.ljcmsg`. `.solCard` and `.cdsoonpanel` are dashed on purpose.

### Known limit

The raise reads clearly in `rb-light`. On the near-black retail ground it is **subtle** — a black
shadow has almost nothing to cast onto a near-black page, so the `#d9d9d9` bottom lip carries it.
A *white* card cannot lift on black the way the dark home card does; home's lift is a light top edge
over a darker body. Closing that gap means giving the retail cards home's ground — the colour change
that was explicitly ruled out.

---

# Delete an estimate (build 524)

**`window.CardinalEstimates.deleteEstimate(id, opts)`** in `cr-est-script`. One pipeline; two entry
points call it and nothing else deletes an estimate.

| Entry point | Where |
|---|---|
| `✕` on each `.cr-est-saved-row` | the Saved Estimates list on the client profile |
| `Delete` button, `data-act="del"` | the estimate editor header, **only when `s.id` is set** |

`opts`: `{ label, projectId, skipConfirm }`.

### 🚫 The DELETE policy is part of the feature

`public.estimates` had **no DELETE policy** until `estimates_delete_policy.sql`. Under RLS a delete
with no matching policy is a **silent refusal — 204, no error body, row survives**, which the client
cannot distinguish from success. If that policy is ever dropped, the button goes quiet, not broken.

```sql
create policy est_delete on public.estimates for delete to authenticated
  using ( is_full_access() or created_by = my_email() );
```

Admins + production (theo, joan, curtis, scottie) can delete any estimate; a rep can delete their
own; `created_by IS NULL` is admin-only.

### Things worth not relearning

- **`.select('id')` on the delete is load-bearing.** It is the only way to tell a real delete from an
  RLS refusal. Drop it and the UI reports success either way. `del524_harness.js` asserts it.
- **`wire()` must guard `[data-act="del"]`.** Its neighbours dereference `querySelector()` with no
  null check because they are unconditional; this button is not.
- **The row control must `stopPropagation()`** — the whole `.cr-est-saved-row` opens the editor.
- **Deleting the open estimate closes the editor** (`state.id === id → close()`).
- **A published document survives its estimate.** `doc_id` / `contract_doc_id` are not touched.
- `estimates.line_items` is **jsonb on the row** and nothing FKs to `estimates`, so the delete is
  complete with no cascade. `estimate_line_items` is the price book and is unrelated.
- The `archived` column exists and is **dead** — 0 rows use it; only `loadForProject` reads it. If
  Theo ever wants soft-delete instead, that is the column, and this is where it would go.

---

# Landing page weather (build 525)

`wx()` / `wxPaint()` / `wxCached()` in **`cr-lr-script`**, painted into
`<div class="cr-lr-wx" data-slot="wx" hidden>` — the last child of `.cr-lr-head`, i.e. to the right
of the "Cardinal." wordmark. Called from `paint()`.

- **Open-Meteo, no API key.** Deliberate: nothing secret can enter `index.html` this way. Do not
  "upgrade" this to a keyed provider without moving the call into `/api/`.
- Dayton at `39.7589, -84.1916`. Fahrenheit + mph. Cached in `localStorage['cr-wx-dayton']` for
  20 minutes.
- Shows condition, temperature, high/low, wind, and a rain badge **only at ≥20%**. The high/low/wind
  line is hidden under 560px so the panel fits beside the wordmark.

### 🚫 It must always be able to fail silently

The panel ships `hidden` and only un-hides once a response parses into a **numeric** temperature.
Every failure path — network, non-2xx, non-JSON, changed schema, null/string temperature, empty
daily arrays — ends in "leave it hidden", and `wx()` is called inside `try{}catch(_){}`. The landing
must never depend on a third party being up. `wx525_harness.js` asserts all eight paths.

**The live schema is unverified** — the build container's proxy blocks `api.open-meteo.com`. If the
panel never appears in production, that is the first thing to check, and it fails safe by design.

### The wordmark shares its row now

`.cr-lr-head` is a flex row holding `.cr-lr-id` (wordmark + sub) and the weather. `.cr-lr-mark` is
re-clamped to `clamp(28px,8.2vw,58px)` **inside `.cr-lr-head`** — at its original `12vw` it does not
wrap and ran straight under the panel at phone width.

### Also at 525

- `.cr-lr-roof` and `.cr-lr-pair button` are raised (522's recipe). `.cr-lr-minor` stays flat on
  purpose — ghost pills, not cards.
- The light-mode `--racc` accent edge on `.cr-lr-pair button` is restored; a `border-color` shorthand
  in the light override had been eating it.
- **Four light-mode overrides target a parent whose child has its own colour**, so the child never
  changed. The quote body was `#f0e6da` on `#f7f5f2` — **1.13:1**. All four now addressed directly.
  When adding a light-mode override here, override the element that actually declares the colour.

---

## Resource Library — diagrams (`~~stack` `~~flow` `~~bars` `~~pitch`)

Added at build 466, made reliable at **534**. Absent from this file until now.

**The model never emits markup.** It writes DATA lines; `index.html` builds the SVG. That is the
whole security design and the only one compatible with `lbRich()`'s escape-then-promote contract.
Two rules hold it: model text lands only in an SVG `<text>` node, never an attribute (`esc()`
does not escape the single quote); and every number drawn is one *we* parsed and clamped.

| Form | Draws | Notes |
|---|---|---|
| `~~stack` | layered assembly, top layer first | first band gets the accent stroke |
| `~~flow` | ordered steps with arrows | numbered by the app |
| `~~bars <unit>` | `Label \| number` comparison | longest bar scales to full width |
| `~~pitch 6/12` | slope triangle | **the app computes the multiplier**, deliberately — it is the one number a model would plausibly get wrong |

Anything malformed → `lbDiagram()` returns `null`, the marker line is dropped, and the block
falls through to normal rendering. A broken diagram degrades to the list it already was.

**Where things live:** `lbDiagram()` / `lbStack()` / `lbFlow()` / `lbBars()` / `lbPitch()` /
`lbSvg()` / `lbCut()` in `cr-lib-script`; CSS `.lb-d-*` in `cr-lib-styles` (unprefixed, unlike
its `#rlLibPanel`-scoped neighbours — verified winning in Chromium, not assumed).
`lbSpaceMarkers()` (534) normalises marker spacing before the block split — see the build log
for its four rules and for what it deliberately does not fix.

**Two entry points:** inline in a librarian answer, and the **"✎ Add a diagram"** button on an
existing entry (`drawInto()`, build 532) which posts `{illustrate:{title,body}}` and force-wraps
whatever comes back.

**The library cannot generate pictures.** Both models are text-only. `~~photos` (471) is a
different thing entirely — a search over real CompanyCam photographs, admin-only, where the model
never receives photo data. See OPEN_ITEMS before proposing image generation.

---

## Card-title icons (build 537)

Every card heading on the **home screen** and **Graphs & Reports** carries a drawn SVG icon in the
left nav's style — **20 in total**. Colour, weight and the light/dark switch are copied off
`#cr-lnav .lnav-ic`, not invented: solid `var(--rbe-mute,#8b9199)` in dark, `#a3121e` keyline with
`#9a9a9a` secondaries in `rb-light`.

**Where it lives:** `<style id="cr-titleicon-styles">` (last block before `</body>`) plus inline
`<svg class="pti">` in the markup. Each icon ships **both weights** — `<g class="i2">` solid and
`<g class="i5">` keyline — and CSS picks, exactly as the nav does.

**Inline SVG, not `lnavIcon()`.** The titles are static markup and `cr-lnav-script` is desktop-only
(`--lnav-w` is 0 below 1100px), so routing through the nav's emitter would drop every icon on a
phone.

**Seven icons are the nav's own**, copied verbatim from `I2`/`I5` at patch time so they cannot
drift: `graphsreports` ×2, `leadsjobs`, `activityfeed`, `team`, `production`, `inspections`.
**Thirteen are new** and live only in the patch that placed them — `scheduleboard` (a clipboard,
overriding the nav's slab for card titles only), `accountsreceivable`, `today`, `teamcalendar`,
`productioncalendar`, `punch`, `revenue`, `trend`, `loss`, `funnel`, `trophy`, `stale`, `margin`.

**Two rules if you extend this set:**
- **Never copy an `I2` icon that carries `fill="#0d0d10"`.** That is the rail's own background
  painted on as a fake knockout — `recents`, `pricingcatalog`, `salesfloor` and `estimates` all do
  it, and they render as black holes on the navy card. Use `fill-rule="evenodd"` for a real hole.
- **Look at it filled before you ship it.** Three of these passed every structural gate as a slab,
  a slab and a bucket-with-an-arrow. Only the screenshot said so.

`.pipetitle` no longer clips a gradient to text — see the build log for why that was the whole
cause of the blank squares, and note that `.acthead` and `.pu-strip .sh b` **still carry the same
clip** deliberately.

---

## Colour-coded nav labels (build 538)

Three items in the desktop left rail carry their own label colour: **Cardinal Truth** red,
**Community Hub** emerald, **Landing** yellow. Text only — icons and row states are untouched.

**Where it lives:** `<style id="cr-lnav-ink-styles">`, six selectors, all theme-scoped and all
ending at `.lnav-tx`. Plus one attribute in `cr-lnav-script`.

**`data-k` is the hook** — the label's own slug, emitted on every `.lnav-item`, computed with the
same `iconKey(stripEmoji(label))` the icon lookup already uses. **Use it for any future per-item nav
styling.** `data-nav` looks like the obvious hook and is not: Community Hub is added at runtime by
`makeOpt()` with only an `id`, so `data-nav` exists on the static items only.

**Cardinal Truth and Community Hub get their own value per theme, and it is not one palette
recoloured** — cardinal red `#c8202e` is **3.40:1** on the dark rail and fails, so dark uses
`#ef6b6b`. Contrast is measured against the rail, the active card *and* hover in each theme; the
active card counts because these labels stay coloured when their row is the current page.

**Landing is the one sanctioned exemption (539).** It is `#f0c651` in both themes — literal yellow,
on Theo's explicit call after 538 shipped amber `#8a6100` and he was shown the measurement. In light
it is **1.47 / 1.63 / 1.34**, knowingly under the floor, and no yellow clears it (`#ffd700` is
1.26:1). **Do not "fix" it back to amber without asking him.** The gate is narrowed, not disabled:
the patch and the harness both assert the exemption is exactly one entry wide, and the harness fails
if that value ever starts passing.

Desktop-only comes free: `--lnav-w` is `0px` except inside `@media (min-width:1100px)`.

---

## Card lift, two navigators, navy leads, obsidian estimates + reports (build 546)

Theo, across five preview rounds: *"1 on lift and both on navigator … Make the money Green. Crews
Grey Approved a dark green Prospects Orange and Leads Yellow (the numbers) … 1 Hairline. Scope will
be the rest of retail on both dark and light modes leave the home screen alone."*

**Where it lives:** `<style id="cr-nvl-styles">`, the last block in the file, plus nine exact-match
JS edits. Nothing new was invented: the lead cards reuse 535's `--nv-*`, both rails reuse 536's
`#cr-lnav` recipe, the milestone pill reuses 544's `.stagechip.stg-*`, and the obsidian is 545's
`.actbox` recipe. Four shipped decisions applied to four more surfaces.

**The home screen is excluded by construction, not by inspection.** `.pipecard` lives in two
containers — **8 in `#mainView`** (which *is* `renderHome()`) and **12 in `#reportsView`**. Every
pipecard rule in the block is prefixed `#reportsView`, so 535's navy home card is untouched. Counted
per container; do not "finish the job" by dropping the prefix.

### Navigator A — the leads rail (a restyle, no JS)

**The drop-down machinery already existed and had since build 336.** `.ljgroup` / `.ljgroup.closed`,
the `▾`/`▸` caret, the click handler on `.ljgroup > b` and `ljState.open` were all there and rendered
as plain text. 546 gave them 536's recessed channel — black well in dark, grey well in light, lit
ledges for the group headers, and an inset red edge on a ticked option via `:has(.cbx:checked)`
(progressive: where `:has()` is unsupported the filter still works, it just is not highlighted).

### Navigator B — the estimate jump list (`estNavHtml` / `estNavWire` / `estNavRelabel`)

**The one genuinely new component in the build.** A table of contents for a long estimate: three
collapsible sections (Details / Line items / Photos & totals) and one row per line item. Desktop
only (≥901px), the same breakpoint `.ljrail` uses. Built from `state` on every `render()`, so it
cannot drift; `estNavOpen` survives a re-render the way `ljState.open` does for the leads rail.

**`estNavRelabel()` exists because a re-render would destroy the caret.** Typing in a line-item name
patches the matching nav row's text directly instead of re-rendering the row you are typing in.

**The sticky works because a grid item's containing block is its grid *area*** — the area is the full
row height while `align-items:start` keeps the box at content height. Do not "fix" that to
`align-self:stretch`; it removes the travel sticky needs.

### The gradient-clipped name and PO — an accessibility fix, not a taste change

`.ljnm` and `.ljpo` (and `.ljpname` in the detail pane) were `background-clip:text` with a
transparent fill, computing to **3.91:1** and **3.10:1** on the dark card — under the 4.5 floor.
They are now flat: white name (**15.60:1**) and gold PO (**7.21:1**) in dark, near-black and maroon
in light. **Undoing the clip takes three declarations** — `-webkit-text-fill-color:transparent`
survives a plain `color:` and swallows it.

### The milestone pill had an inline background, which is why the JS changed

`ljRenderPane()` emitted `style="background:<solid>;color:<ink>"`. **No stylesheet rule can outrank
an inline declaration**, so reusing 544's palette meant emitting `class="ljmpill stagechip stg-X"`
and stripping `background`/`color` out of `.ljmpill`'s own rule. The pill keeps its 999px radius
because `.ljmpill` sits ~85k characters after `.stagechip` at equal specificity.

### The email button

`ljCardHtml()` rendered its action column only when a phone existed. It now renders on **phone OR
email**, with a third `mailto:` button under the two existing ones (`.ljcta` is already
flex-column, so it aligns by construction). **On today's data this shows on 1 of 18 projects** —
`projects.email` is NULL on 13 and empty on 4. Correct, and nearly inert until the column is filled.

### Reports KPI colours

Theo assigned five colours against a preview carrying labels this app does not have ("Bid out",
"Crews"). Mapped onto the seven real KPIs by what each number **is**, via `k-money` / `k-new` /
`k-won` / `k-rate` classes on the `<b>`:

| Class | Colour | KPIs | Worst-case ratio |
|---|---|---|---:|
| `k-money` | `#4fc98a` | Revenue signed · Avg job size · Open pipeline $ · Backlog value | 6.55:1 |
| `k-new` | `#E8C21E` | New leads · Upcoming appts | 7.92:1 |
| `k-won` | `#3d9970` | Deals signed · Jobs completed · Backlog (approved) | **3.90:1** |
| `k-rate` | `#b9bec7` | Win rate · Avg days to sign | 7.33:1 |

Computed against `#2c2d36`, the **lightest** band of the obsidian gradient and therefore the worst
case; the floor for 20px/800 is 3.0. **Orange is deliberately absent** — it is spent on the Activity
Count tiles and spending it twice would stop it meaning anything.

**`Chart.defaults.color` is now set in `rptChart()`.** Chart.js defaults its tick and legend ink to
`#666`, which is 2.5:1 on obsidian and **was already failing on 535's navy card before this build**.
Not themed, deliberately: the card is black in both modes, so the ink has to be too. Safe because
`new Chart(` appears **exactly once** in the file.

### Obsidian is black in both modes

545's stated precedent, and Theo's pick there. The estimate page's header was **already**
`linear-gradient(120deg,#2c2c2c,#1a1a1a)`, so a dark body finishes a shell that was half-built
rather than inventing a third ground. The corollary 545 wrote down applies too: a theme-independent
surface needs theme-independent inks, so every grey in the block is pinned, not tokenised.

---
---

# Crews — subcontractors and the money that flows to them (builds 547–556)

*Backfilled 2 Aug 2026. This was an entire top-level feature with no entry in this file for 27
builds; CLAUDE.md was its only description.*

**Where it lives:** `<style id="cr-crew-styles">` + `<script id="cr-crew-script">`, mounting into
`#crewsView` — `display:none; position:fixed; inset:0; z-index:156` in the markup. Exports
`window.CardinalCrews` (`open`, `reload`) via `Object.assign`.

**Reached from:** the left nav / burger menu, `nav === 'crews'`.

**Tables:** `crews`, `crew_docs`, `crew_notes`, `crew_rates`, `crew_payments`, `commissions`.
`crews_schema.sql` is **already applied — do not re-run it.**

## What each build added

| Build | |
|---|---|
| **547** | The directory. Crews grouped by trade (Roofing, Siding, Window Installers, Gutters, General Repairs) with a left trade-nav, Profile, a **Compliance vault** (COI, W-9, licences, with expiry dates) and Notes |
| **548** | **Labor Rates.** Price a crew against Cardinal's own catalog and see what you keep per line. Catalog items from `pricing_items` joined to per-crew overrides in `crew_rates`; **`pricing_item_id IS NULL` means a custom row** — a line only that crew does |
| **549** | Rate columns line up — each category had been its own table sizing its own columns |
| **550–553** | Light-mode passes: warm off-white page, white cards with a thin red edge, real lift shadows, matching corner radii, the red edge moved to the top |
| **554** | A **Roofr upload fills the job, not just the page** — squares, pitch, ridge, hip, valley, eave and rake land in `checklist.meas`, and the pitch reaches the Contract |
| **555** | **The crew Work Order** — Cardinal's *own* document, Production → crew, **one per trade** |
| **556** | **Payments and Commissions.** A Payments tab per crew (amount, date, method, check number, running total) and a Commissions tab |

## ⚠ The permission rule — settled by Theo, do not re-litigate

> **"Crew rates is not needed by productions, I write the checks."**

`crew_rates` and `crew_payments` are both `is_cardinal_admin()` in RLS.

**A work order generated by Curtis or Scottie having no labor lines is CORRECT, not a bug** — and it
must not be worded as a failure. A three-way gate exists so that a correct refusal never renders as a
broken screen: the tab strip filters, dispatch falls back, and the renderer refuses on its own.

## ⚠ "Work order" names THREE different documents — grep the block, not the phrase

| Which | Direction | Where | Rule |
|---|---|---|---|
| Partner / property-management → Cardinal | **inbound** | `cr-wo-script`, community-fenced | **Leave alone. Do not widen the fence.** |
| Production → crew | outbound | build 555 | the one described here |
| Sales/admin → Curtis, punch-outs | internal | `punch_items` + `cr-punch-*` | **already built** — the gap is routing and notification, not software |

The 555 work order is **document type three** beside `isEstimateTitle()` / `isContractTitle()`, stored
in `inspection_reports` so it reuses the existing editor and the `@page Letter` print path. It is
filled from the roof inspection, `checklist.meas` and `crew_rates`.

## Invariants

- **`WO_TRADES`, `TRADES` and `MONEY_TABS` all mirror DB constraints** (`crews_trade_ck`, the RLS
  policies). **One grows, all grow** — same rule as `STAGES` / `IC_SKIP` / `PIPE_SKIP`.
- **`commissions.rep_email` is matched by RLS against `auth.email()`.** A typo silently orphans the
  row against nobody, so the address is format-validated and lower-cased before insert. As with
  `community_partners`: **never write an unverified email address.**
- **`--crw-*` is declared nowhere.** All 95 references are `var(--crw-x,#literal)` — the fallbacks
  *are* the palette. Deliberate, and immune to the 448–449 stripped-token class by construction.
- `function money(` is defined **eleven** times across the file; the `cr-crew-script` one takes
  `money(n, cents)`. A file-wide count on it is meaningless.

---

# Builds 557–573 — theming, navigation, and two invisible performance fires

*Backfilled 2 Aug 2026 from the in-app `CHANGELOG`, which is authoritative for what shipped.*

## 557 — Activity Count light twin

`.actbox` shipped obsidian in **both** modes at 545 (Theo's pick, and deliberately theme-independent).
557 added the light twin he later asked for. The inks could not simply carry over: `#E8722A` is
**3.06:1 on white and 2.71:1 on the app's cream — under the 3.0 large-text floor**. The twin uses
`#C25A18` (4.40:1) and `#5f6670` (5.80:1) — *the same orange deepened*, not a swap to red, because a
hue change would make the two themes read as two different components.

**Mechanism differs by necessity:** dark is **highlight-led** (a white sheen inset over a black
radial), light is **shadow-led** (the same radial inverted, a real drop shadow doing the lift) —
an inset highlight is invisible on a white card. Same geometry, same sheen origin, opposite
mechanism, computed inks. The dark rules are untouched byte-for-byte.

## 558–561 — the left menu on every desktop page, and Quick Inspection made readable

**558** — the desktop left menu (`#cr-lnav`, z-index 80) was never failing to mount; full-screen
overlays were covering it. `#crewsView` joined the convention rule, and four views got
`body.cr-lnav-on #… { left:var(--lnav-w) !important }`.

**559** — Quick Inspection was near-black text on a near-black page. The contents now sit in a
recessed **deep-yellow** panel (`#FFD400`, `border-radius:18px`, inset shadow) with the cards inside
it sunk into the page in near-black with white text. **Finish is the only green.**
⚠️ `-webkit-text-fill-color` must be set alongside `color` — it beats `color`, and `.chipbtn` pins
`#2c2c2c`.

**560** — the Estimates *builder* (`#cr-est-view`). It is **created at runtime** and its id does not
end in `View`, so both 558's static scan and its `[id$="View"]` sweep walked straight past it.

**561** — two corrections in one build. 560 fixed the wrong Estimates screen: `#cr-est-view` is the
per-client builder behind "+ New estimate", but the **menu** opens `#cr-estimates-mount`. And 559 had
styled only `#quickInspView`, not `#qiStartView` — the pin-the-property step you actually land on
first. ⚠️ `styleMounts()` writes **inline** `position/inset/z-index` onto the three mounts, so
`!important` is mandatory there, not stylistic.

## 562–563, 574–584 — the AI Field Manual

Fifteen chapters on using AI in this business, plus a printable desk card, filed in the Resource
Library with its own section. **563** fixed an offline bug: opening it no longer replaces what the app
shows when you have no signal.

**Where it lives.** Landing card in `#resourceLibraryView` → `rlPageAIBook` → an iframe on
`/ai-field-manual.html`. **Deliberately not in the TOC** — Theo asked for that explicitly.
`body.rl-at-book` drops `.ins-body`'s 840px cap so the book gets the full pane. The iframe `src` is
set on first open only, so coming back keeps the reader's place.

⚠️ **`ai-field-manual.html` is GENERATED — never hand-edit it.** Edit the authored artifact, then
re-run `.claude/skills/cardinal-build/scripts/wrap_book.py`. It adds the doctype and charset the
artifact host supplies and Vercel does not; without them every em-dash in the book renders `â€"`.

**584 added chapter XV · What AI can build** — the catalogue of buildable things (eight shelves,
five already shipping at Cardinal) with a REAL seven-slide adjuster deck running in the page.
Presents on iPad/desktop; lies flat as readable pages below 700px (Theo: don't present from a
phone). The deck deliberately binds NO keys — the book owns the arrow keys. 583 removed the
Library's floating pills from the book page and restored the header's back arrow (slimmed to just
the arrow on review).

**578 reordered the book** into 16 chapters in four groups — *Using it* (I–IV), *Choosing* (V–IX),
*Building it* (X–XIV), *The wider world* (XV–XVI) — and split the hardware out of "Local vs. cloud"
into **VII · The machines**. Thirteen chapters changed number and ~150 cross-references moved with
them. ⚠️ **Chapters are regenerated from one ORDER list in `scratchpad/reorder.py`, never patched**
— the number appears in seven places per chapter plus the spine and the cover. The harness addresses
chapters by name (`CH.machines`), not by `#/7`.

**VII · The machines is the chapter that answers hardware questions**, and 582 gave it its full
shape: a plain **spec sheet** (six machines, no conclusions), then a section each for the **DGX
Spark**, **Apple**, **AMD** and the **RTX PRO 6000**, a **three-way comparison**, and both stacking
answers — **two Sparks** (memory adds, speed does not; mixture-of-experts is the exception) and
**a Spark + a 5090** (impossible as asked — the Spark is sealed and has no slot). ⚠️ Its figures
are **computed in the patch script and self-checked against rows the book already ships**, so a
drifting method aborts before it can be written.

⚠️ **Chapter VIII also has a "Two Sparks" section.** It agrees with VII's and now points at it.
Grep before writing — the two nearly ended up arguing the same case independently.

**574–577 are all the hardware chapter**, and all of them are corrections:
Apple's withdrawn memory tiers (574), a commands page for the Spark (574), a fair hearing for AMD
(575), weighing the Spark on all six workloads rather than the photo job (576), the same fair
hearing for Apple plus the RTX PRO 6000 (577). Its figures are **computed, not quoted** —
`tok/s = bandwidth × 0.58 ÷ (0.5 × B)`, capacity fits `≥ 1.5 × 0.5 × B` — and the book harness
recomputes every row of the table on each run, so a wrong number fails rather than ships.

**Its own harnesses**, both required before shipping a book change:
`.claude/skills/cardinal-build/harnesses/checkbook.mjs` (372 assertions; pass a book path as argv[2] — an explicit path that does not exist exits 2 rather than silently testing the real book) and
`h562_aibook.js` (42, the Library integration and the served bytes), and
`h581_changelog.js` (25, What's New against the shipped CHANGELOG). `AI_CHEATSHEET.md` mirrors the same content and is `.vercelignore`'d.

## 565 — Discard on an estimate

**The mechanism already existed and was merely unreachable** — the AI-create review screen had used
`status:'discarded'` since it shipped, and the lanes filter on `['draft']`, `['sent','viewed']` and
`['approved','converted']`, so a discarded row falls outside every lane and leaves the list on its
own. Nothing is destroyed. **Admin-only**, matching Theo's rule that money surfaces are his and
Joan's. Delegated once (`M.dataset.creDelWired`) because the lanes re-render constantly.

*At 568 the non-AI branch was repointed at the `estimates` table's own `archived` flag.*

## 568 — the Estimates screen shows your estimates

**The screen had been empty for the best possible reason: it queried two empty tables and never the
full one.**

```
estimates          12 rows   ← real work, invisible since it shipped
manual_estimates    0 rows   ← what the list was built to read
ai_estimates        0 rows   ← what it actually read
```

The list now reads `estimates`, joined to `projects` for the client name through
`estimates_project_id_fkey`. **The status vocabulary already matched the lanes** (live values are
exactly `draft` and `sent`), so nothing was mapped and the lanes are untouched.

**The card click was a dead stub** — `window.openManualEstimate` is **defined nowhere**. Wiring the
query alone would have shipped twelve cards that do nothing. The real target already existed:
`CardinalEstimates.openEditor(project, existing)` takes an optional second argument and rebuilds the
editor from exactly the columns `estimates` has.

⚠️ **`openEditor` is defined FIVE times** (19187, 28766, 31026, 37429, 38841). The exported one is
**38841**.

Notes: the list deliberately does **not** select `line_items` / `photos` / `notes` — one line item's
description in this data is a 3 KB essay and the card renders none of it; the editor re-reads the
full row on open. `total` is coerced with `Number()` because PostgREST sends numeric as a **string**,
and the raw strings sort wrong (`34050.00 > 2560.00 > 1820.00 > 11920.99`).

## 566 · 567 · 569 — three invisible fires

**566** — the list asked `projects` for `client_name` and `estimate`. The table has **neither**, so
every load returned **400**. Removed rather than repaired.

**567 · 569** — two `requestAnimationFrame` repaint loops running at 60fps forever, on every screen:
the CRM chip and the landing greeting, then the landing weather strip. **388 DOM writes/sec, waking
all 50 `document.body` observers every frame.** Nothing looked wrong; it drained battery and made
everything feel half a step slow. See `BUG_CLASSES.md §12` — the guards existed and could never
succeed.

## 570 · 571 · 572 — navigation

**570 · 571** — six full-screen views were missing from `hideAllViews()`, so navigating swapped the
page *underneath* them and left them on top: same screen, no way out but the ×. Crews, the three
mounts, then the estimate editor. **571** also wired the **back button**, which had walked straight
past all of them.

**572** — Sales Floor (`#cr-sf`), the Objections Coach (`#cr-coach-mount`) and the Production board
(`#cr-pb`) kept none of the above and were a **640px column in a 1440px window** (measured: content
at x=400, 400px dead each side). They now keep the left menu and widen on desktop — board **1180**,
card/prose screens **940**. Gated on `body.cr-lnav-on`, so **phones are unchanged**.

See `BUG_CLASSES.md §13` — the close lever must match how each screen is shown.

## 573 — dark mode for the last four light-only modules

**Five module stylesheets share one identical `--cr-*` palette** (18–20 tokens, same values). Four
were themed at 573 — Objections Coach, Pricing Catalog, Company Documents, Adjusters. Sales Floor's
shell is hardcoded *dark* while the coach inside it was hardcoded *white*, which is what "starts
really bright" meant.

Dark values in the base rule, the original light values restored under
`:root[data-theme="rb-light"]` — **light is byte-identical to what shipped**, and the patch asserts
it. Contrast computed for every ink against the ground, the raised surface **and its own tint chip**;
lowest is 4.98:1.

**⚠ Tokens alone did nothing.** Two of the modules paint `M.style.background='#fff'` **inline** in
`open()`, which beats every stylesheet rule. Only a rendered preview caught it.

**`cr-bpa-script` is the fifth module and is deliberately untouched** — it has no dark palette to
fall back on, so stripping its inline white would leave it with no background at all. See
`OPEN_ITEMS.md`.

**The residue split matters:** of 27 hardcoded light colours outside the token rules, **17 are
`color:white` on a coloured ground** (primary buttons, toasts, badges) — semantic, correct in both
themes, left alone. Only the **10 surface backgrounds** were tokenised.

## 574–579 — the Showcase, and The Walk

One module: `<style id="cr-show-styles">` + `<script id="cr-show-script">`, mounted as `#cr-show`,
opened from the **Sales Floor**. Exports `window.CardinalShowcase` (`open` / `close` / `reload`).
Registered in `hideAllViews()` and in the `navRestore` switch as `'showcase'` — shown by a **class**,
so it is closed through its own `close()`, never by writing `display:none`.

**Three tabs and one link.** Showcase · Hall of Fame · The Walk, plus **Inspections ↗**, which is a
link out to `openReportsView()` and must stay one. A fourth tab means somebody rebuilt the reports
list that already exists.

| Build | What |
|---|---|
| **574** | **Showcase** — before/after with a drag divider, phase dock (Final / During the build), privacy toggle that *removes* the address rather than hiding it, admin add/publish/remove. Table `showcase_pairs`, bytes copied into `photos/showcase/`. |
| **575** | **The client release** — `release_on` / `release_by`. No release renders as **In-app only**: fine across the kitchen table, not for publishing. Ticking the box without a name is refused. |
| **576** | **Hall of Fame** — a bad install beside ours with one line on why it matters. Table `workmanship_pairs`, bytes in `photos/workmanship/`. Reads no client record by design. |
| **577** | **Resolution** — `FULL {3840, .92}` for the slider, `DISP {1400, .82}` for the grid. One stored path, two files; the display copy is *derived* (`-d.jpg`), so pairs made before 577 fall back rather than blank. |
| **578** | **The slider follows a mouse.** A native image drag was cancelling the pointer stream after one pixel. `-webkit-user-drag:none` on `.cr-sh-cmp img`. Touch was never affected, which is why it went unseen. |
| **579** | **The Walk** — below. |
| **580** | **The review screen asks before it discards work.** Back and Ask again both used to throw away an unsaved reject/re-classify/nudge with no warning — found by manual audit, not a gate. Guarded by a session-local `dirty` flag, set only by a real decision this visit; asking the AI or reopening an untouched shot still asks nothing. |

### 579 — The Walk

Theo: *"circling damage ai and checking first then presenting to client is a good third tab.
Doesn't need to be a report, so new feature then."* The order in that sentence is the design.

- **`api/detect.js`** (26th function) proposes **located** findings — normalized box fractions on the
  existing `crit`/`warn`/`ok` scale. **Its `DEFECTS` keys are index-aligned with the trained model's
  class indices 0-30 and the order is a contract** — renaming or reordering silently decouples the
  route from the model. **Build 602** narrowed it to **31 classes**: `soffit_damage` + `fascia_damage`
  merged to `soffit_fascia_damage`, `paint_deterioration` deleted outright (it had been used as a
  junk drawer — its boxes were on decking, windows, roofs and leaks). Paint failure is now named in
  both surface descriptions instead. Every index ≤18 is unchanged. It touches no pixels: **circles are an overlay, never burned in**,
  so the stored photograph stays the photograph the camera took.
- **Photographs come from both** a phone (`multiple` file input) and an existing job. **Both COPY
  their bytes into `walks/`.** Measured, not assumed: 183 of 196 `project_photos` rows carry a
  `storage_path` and **13 are inline `data:` URIs with no storage object** — referencing would have
  silently dropped one photo in fifteen. Deleting a job photo also removes the storage object, which
  would blank a walk in front of a client.
- **The review screen** is the point: accept, **nudge** (drag the box, drag the corner), change the
  severity, or reject. **Only accepted findings are written.** `walk_shots.findings` therefore
  *means* "seen by a person", and `reviewed_at IS NULL` means nobody has walked it.
- **Permissions**: admins build, sales and production view — RLS in `walks_schema.sql`, not just the
  UI. A rep sees the walks and the circles and gets no write controls.
- Tables `walks` / `walk_shots`; `walks_schema.sql` is **applied**.

**Two traps worth keeping:** `/api/detect` wants **bare base64**, not the `data:` URL `/api/caption`
takes — copying that call verbatim fails at the model, not the fetch. And moving the selection on
`pointerdown` must toggle classes, **never repaint**: `repaint()` replaces `innerHTML` and would
destroy the element under the finger mid-gesture.

Gates: `harness_walk.js` (67, jsdom, data contracts), `harness_showcase.js` (106),
`harness_detect.js` (39), `render_showcase.js` (36, real Chromium — the only one that can prove a
box lands where its fraction says).

## 584–588 — the Vision Suite's five, all in Blackout

Theo picked all five preview options and one treatment: **Blackout** — true black `#050607`
(the app's only pure-black surfaces), white ink, severity colours as the only chroma, cardinal
red staying on primary buttons. All five live in the existing `cr-show-*` blocks; none adds a
view, a table, or a scroll-lock writer. Builds 583 was left to PR #105 (Library chrome) — a gap
if it never merges, which is normal here.

| Build | What | Where it hangs |
|---|---|---|
| **584** | **Spotlight** — present mode. Full screen, one accepted finding at a time, radial veil lights the damage, story tap-zones. Only `reviewed_at` shots with findings (the 579 contract filters). Address never rendered. **Not admin-gated** — sales presenting is the point. | `Present ▶` on a walk's header · `.presenting` on `#cr-show` |
| **585** | **Chalk** — draw your own marks. Crosshair → dashed chalk box → 17-defect sheet + severity → a finding with `source:'human'`, `confidence:null`. **`source` is now stamped on every finding** and threaded through both field-rebuild sites (`runDetect`, `saveReview`). **Ask again preserves human marks** — replaces only the AI's. | `+ Mark damage` in the review bar |
| **586** | **The Lens** — pinch into any photograph at FULL rendition. Found while proposing: `touch-action:none` had blocked pinch since 574, making 577's 3840px files unreachable. Two-pointer pinch, pan, double-tap; Walk boxes ride inside the world. | tap a Hall of Fame photo · `⤢` on the slider and review stage |
| **587** | **The Release** — share cards. Released pairs (575's fields) get Square/Story/Wide × Classic/Blackout/Kraft, canvas-drawn from `shotBlob()` bytes (never cross-origin → never tainted), **city only, `p.address` never enters `drawCard`** (pinned by assertion), zero EXIF by construction. Unreleased pairs render Share dead with the reason. Admin-only. | `Share…` in the Showcase admin bar |
| **588** | **Curtain Call** — kiosk. Play → drift, self-sweeping wipe (starts on the BEFORE), white-serif placard via `label()` (privacy-masked), next pair. **Any touch hands over the real slider on the pair that was showing.** Every timer in `ccRun`, every continuation checks `isConnected` — the 567/569 class designed against. Auto-start deliberately unshipped. | `▶` beside the pair counter |

**Traps recorded while building, for whoever patches next:**
- Controls inside a gesture surface feed gesture detectors — the Lens `+/−` buttons are guarded
  from the double-tap detector (caught in the preview; 578's class).
- Two harness slices went red for being too broad, not wrong: "HoF reads no client record"
  (fixed at 579-era) and "Walk never draws on the image" (587's legitimate canvas) — **bound the
  slice, assert it captured something**.
- `renderAdmin` teaches now: an unreleased pair shows a dead Share with the reason. Don't
  "clean up" the dead button — the visible refusal *is* the feature.

Gates at 588: `check_build` green per build, each negative-controlled · `harness_walk` 115 ·
`harness_showcase` 123 · `harness_detect` 39 · `render_showcase` **69 in real Chromium** —
including pixel-proofs (Kraft mat measured `232,220,200`), a synthetic two-pointer pinch, the
drawn chalk box landing at its fractions, and the kiosk wipe sampled mid-sweep.

---

## Showroom mode (build 590)

A read-only door into the Showcase you hand across the table. **Entry:** a full-width blackout
row at the bottom of the landing launcher (`.cr-lr-show`, `data-go="showroom"` — inside the
`cr-lr` renderer, *not* the dead `#landQuick` markup near the top of the file). **Offered at
≥820px only**; below that the row does not render and the opener falls back to the ordinary
Showcase, which is phone-shaped and unchanged.

`window.CardinalShowcase.open({ showroom:true })` · `.inShowroom()` reports the flag ·
`close()` and any ordinary `open()` clear it, including the one `navRestore` calls.

**Read-only, in one place plus four:** `amAdmin()` short-circuits to `false`, which kills all 14
of its call sites at once. The review bar, `wireBoxes()`, the per-finding controls and
`releaseBadge()` were **never `amAdmin()`-gated** and carry their own `!showroom` guard — see the
build log. Sales and production keep exactly what they had.

**What stays:** all three tabs, the slider, the phase dock, the Lens, Curtain Call ▶, Present ▶,
privacy mode, and the damage circles (readable, with severity — not draggable, no confidence %,
no "drawn by hand"). **What goes:** the back arrow, the Inspections ↗ out-link, every write
control, and the release badge.

**Exit is a HOLD** — ~900ms on the ✕ with a conic ring painted from the same clock that decides.
A tap does nothing. Releasing early cancels and leaves no rAF running; the tick re-checks
`isConnected` every frame (567/569's class). **It is not a kiosk** — a browser back gesture still
leaves.

Entering the room always starts clean: `tab='showcase'`, `curWalk`/`shots`/`review` reset, so a
tablet never lands mid-review of somebody else's roof.

Verified by `audit_viewports.js` — **194 assertions across phone / iPad portrait / iPad landscape
/ desktop**, including a counted zero for write controls on every tab and screen, the hold timing,
that a tap does *not* exit, and that a damage circle cannot be dragged.

## The Vision hub (build 593)

A dedicated, focused landing for `showroom.cardinalroster.com` — same `index.html`, same sign-in,
same file every CRM user already loads, just a different `#landingView` content branch keyed off
the hostname. Not a separate app, not a separate deploy.

**Entry point:** `build()` in `cr-lr-script` (the landing renderer) branches at the very top, before
building the ordinary ten-destination launcher — `isVisionHost()` checks `location.hostname` for a
`showroom.` prefix, or `?vision=1` in the query string for testing before the real domain exists.
When it matches, `visionHtml()` replaces the launcher entirely: **Presentations** (reuses `wire()`'s
existing `data-go="showroom"` handling untouched — the exact same call the ordinary launcher's
Showroom card already makes, nothing duplicated), **Studio** (admin-only, a plain link to
`/studio.html`, gated on `window.is_admin()` — a UI hint only, `studio_photos`' own RLS is the real
gate, same caveat `amAdmin()` already states for Showroom), and **Colors** (a disabled placeholder
for an Owens Corning presenter — not built yet).

**The one bug that mattered, and the lesson in it:** the first pass rendered `.cr-vh` into the DOM
correctly but it computed `display:none` and was invisible — `cr-lr-styles` carries
`#landingView>*{display:none}` (ID selector, beats any plain class regardless of source order) *and*
a second, narrower `#landingView:not([data-cr-portal-built])>*{display:none}`, both there to keep
the dead `#landQuick`/`#landDash` markup hidden. `.cr-lr` only escapes them via a matching
`#landingView>.cr-lr{display:block}` override plus `build()` setting `lv.dataset.crPortalBuilt='1'`
on every path. The first draft of this feature set neither, having only grepped `crPortalBuilt`'s
JS readers (dead) and missed the CSS attribute-selector reader (very much alive). Found by
`elementFromPoint` at the coordinates a tile should occupy, the same technique that caught build
590's z-index trap — not guessed. Fixed with `#landingView>.cr-vh{display:flex}` and setting the
same dataset flag, mirroring `.cr-lr`'s exact pattern.

**Committed dark**, like Showroom itself — no light-mode twin, deliberately.

Verified: a 20-assertion jsdom harness against the shipped `cr-lr-script` text (hostname matching,
the `?vision=1` override, admin-gating, and proof the Presentations tile drives
`CardinalShowcase.open()` through the *existing* handler rather than a new one) plus real Chromium
screenshots of both the admin and non-admin renders and a regression pass confirming the ordinary
launcher is byte-for-byte unaffected.

---

## Production board — the job dossier (603)

`<style id="cr-pb-styles">` + `<script id="cr-pb-script">` · `#cr-pb` · `window.CardinalProduction`
· burger menu → 🔨 Production, and the banner's Production ▾.

**Master-detail.** The job list is the master; the selected job's dossier is the detail.

| | Desktop (`body.cr-lnav-on`) | Phone |
|---|---|---|
| Panes | both, `360px` + rest, dossier sticky | one at a time, `data-pane` on `.cr-pb-split` |
| Back | hidden — nothing to go back to | `← Jobs` returns to the list |

**The desktop signal is `body.cr-lnav-on`, not a media query** — the same class 572's
`max-width:1180px` rule uses. The desktop rule out-specifies the phone rule 0,3,1 vs 0,3,0;
that contest is proved in Chromium, not assumed (build 481).

**The dossier carries:** portal dot · stage chip · name · address · blocker banner ·
**Open client profile** → `window.openProject(id)` (the *existing* opener; the board already called
it — extended, not rebuilt) · **Call** only where `projects.phone` is really populated ·
**+ Punch item** → the existing `openAdd(projectId)` modal, job pre-selected · then the punch
items under three tabs.

**⚠ New / Remaining / Closed is DERIVED, not stored.** `punch_items.status` is binary
(`open` | `done`) — read off the live table, not assumed. **NEW** = open, `created_at` inside 7 days
· **REMAINING** = open, older · **CLOSED** = done. `NEW_DAYS` is one constant in the module. No
column, no migration. *If you go looking for a `status` value called "new", there isn't one.*

**⚠ The job list has an off-stage tail, and it is load-bearing.** `activeJobs()` only returns
Approved / Scheduled / Completed. `boardJobs()` appends **any project carrying punch items**
regardless of stage, marked `.off` and labelled "Not in production". On the live database *every*
punch item is in that tail — the only row sits on a **Prospect** — so removing it makes the screen
unable to reach a single real item. Do not "tidy" it away.

**⚠ The board is legitimately empty right now.** 20 projects: 15 Lead, 4 Prospect, 1 Invoiced,
**none** Approved/Scheduled/Completed. The empty state says so in words. Not a bug, not a
regression — jobs have to be moved into those stages first.

**MINE** filters the job list to jobs with an open item assigned to `myEmail()` — this replaced the
old global `all / mine / high` punch filter row, which the per-job tabs made redundant. Urgency
still shows per item.

**Theming:** dark values in the block, daylight twins under `:root[data-theme="rb-light"]` in 393's
shape. The Production board is one of the **four sanctioned light/dark exceptions**; all 46 of
393's rules and all 93 original dark `.cr-pb-*` rules are byte-for-byte untouched.

### The punch card on the client profile (`cr-pp-script`) — and why it vanished

`#cr-pp-mount`, inserted as a sibling of `#jaGrid` on the Overview tab. Header `🔨 Punch List`,
open count, an unconditional **+ Add** that calls `CardinalProduction.addFor(projectId)`, and a
fold-out of completed items. Exports `window.CardinalPunchProfile` (`refresh`, `rows`).

**⚠ It is a direct child of `#tab-overview`, which is a hostile place to live.** That tab carries
`#tab-overview > *:not(#acxMount):not(#cr-pp-mount){display:none !important;}` — the AccuLynx
overview rebuild hides everything except the overview mount. Until **604** the punch mount was not
named in that exception, so the card rendered perfectly and invisibly on every retail and insurance
profile, and adding a punch item meant leaving for Production. **If you add another element to this
tab, it must be named in that rule or it will not render, and nothing will tell you.**

Community profiles use a different branch entirely (`#cr-cc-jm` inside `#cr-cc`) and were never
affected — which is why the card "worked" whenever anyone checked it on a community job.

---

## Cardinal Studio — the Private gallery ("Atlas")

**File:** `studio.html` at the repo root — **not** `index.html`. Its own page, its own sign-in, its
own `--stu-*` palette; shares nothing with the CRM but the Supabase project. That split is
deliberate (Theo, 3 Aug: *"if it was back to the beginning this would have been a completely
separate app"*). Reached from the **Vision hub** on `showroom.cardinalroster.com`, admin-gated
there as a UI hint — RLS is the real gate.

Studio already browsed `studio_photos` (the Spark's tagged work archive). It now also browses
**`studio_private`**, the owner-scoped personal sibling, behind a `WORK / PRIVATE` switch.

**Read-only, still.** The file's own header says *browse, search, look* — tagging happens on the
Spark. Atlas adds no writer.

### The safety rule — Private does not exist on the showroom host

`isShowroomHost()` mirrors `index.html`'s `isVisionHost()` **exactly**, including the `?vision=1`
override, because that flag exists to preview the presentation door. On a match the switch is
hidden **and `st.mode` is forced back to `'work'`** — hiding a button is not closing a door. The
switch is `display:none` in the markup and only JS turns it on, so a script failure leaves Private
unreachable rather than exposed. Same reasoning as the Showcase release badge (build 590): a
private fact is for whoever is curating, not whoever is being sold to.

### One rail, three lenses

`TIME | PLACES | PEOPLE` are the same control reading three different columns, so they are one
segmented picker rather than three competing navigations. One `select('captured_at,place,people')`
builds all three facet lists client-side — PostgREST has no `GROUP BY`, and this is the shape
`loadChips()` already used.

**Each accent names a lens**, and none of it is decoration — the Sales Floor discipline:

| token | means | dark | light |
|---|---|---|---|
| `--atl-time` | time | `#8FA3A9` | `#4A6068` |
| `--atl-place` | place | `#3FBF9F` | `#17715A` |
| `--atl-event` | event | `#E8A33D` | `#8A5A12` |
| `--stu-red` | **the Private pill only** | `#C8202E` | unchanged |

Selecting a facet filters the query — `gte`/`lt` on `captured_at` for a month (`is null` for
Undated), `eq('place')`, or `contains('people',[…])`.

**`GRID | EVENTS` is a density, not a second layout.** Events reads `studio_private_events` and
fetches its shots with a single `.in('event_id', …)` — no N+1.

### Light is a theme, not a second design

`:root[data-theme="light"]` twins every `--stu-*` and `--atl-*` token; a head script resolves the
choice **before first paint** (stored, else OS), same shape as `index.html`'s `data-mode`.
`--stu-scrim` / `--stu-overlay` / `--stu-sunk` exist because the header and overlay backgrounds
were hardcoded copies of the ground and had to move with the theme. Contrast computed, not
eyeballed: dark **6.73–16.63:1**, light **4.55–14.40:1**, avatar initials **5.67–8.02:1**.

⚠️ **The bug worth remembering.** `showApp()` sets an inline `appView.style.display='block'`, which
outranks `#appView.priv{display:grid}` at any specificity — the rail rendered full-width and the
main column vanished. **The gate passed it**, because `getComputedStyle` still reports
`grid-template-columns` on a `display:block` element. Only a rendered screenshot caught it, exactly
as with `styleMounts()`'s inline white in `index.html`. The gate now asserts the computed `display`
*and* the real geometry (rail exactly 236px, main >600px, rail at x=0).

⚠️ **Both tables are empty.** `studio_private` and `studio_private_events` are **0 rows** — the
Spark-side pusher does not exist yet. The **Time** lens works the day it runs; **Places** needs
`place` populated and **Events** needs the events table filled, so both render an honest empty
state until then. Nothing here has been verified against a real photograph.

**CI does not gate `studio.html`** — `.github/workflows/check.yml` covers `index.html`, `sw.js` and
`api/*.js` only. This file deploys unchecked.

---

## OC Colors — the shingle-line hub (builds 615–623, 7–8 Aug 2026)

**Where:** `<style id="cr-occ-styles">` + `<script id="cr-occ-script">`, appended before the last
`</body>`. Exports `window.CardinalColors` (`open`). Full-screen `#cr-occ`, `position:fixed;
inset:0`.

**How you get there:** the **Vision hub only** — `showroom.cardinalroster.com`, or any URL with
`?vision=1`. `visionHtml()` in `cr-lr-script` has carried a Colors tile since build 593; it shipped
disabled with a "Soon" badge and 615 turned it into a `<button data-go="colors">` driving the
`wire()` handler that was already there. **There is no entry point from the ordinary app menu**,
and Resources and Vision still have zero cross-references either way.

### 616: it opens on the LINES, not on colours

Three levels — **hub → line → colour** — and the back button steps one at a time, closing only from
the hub. State is two classes on `#cr-occ`: none, `.line`, `.detail`. `.detail` sits on top of
`.line`, so its rules carry an extra class and **out-specify** rather than depend on source order.

| Line | Ships | Holds |
|---|---|---|
| **TruDefinition Duration** | ✅ description + 9-row spec table + a wind caution | the 20 sellable colours, with a **Designer Series** tab |
| **Duration FLEX** | ✅ description + specs + a wind caution | **its own 9-colour palette** (7 sellable) — `FLEX_COLOURS` |
| **Oakridge** | ✅ description + 10-row spec table + a wind caution | no catalogue rows — spec page only |
| **Supreme** | ✅ description + 9-row spec table | no catalogue rows — spec page only |
| **Discontinued** | ✅ description | the 10 dead colours, each naming its closest current replacement **on the card** |

⚠️ **FLEX is NOT made in Duration's full range.** `FLEX_COLOURS` is an explicit nine-slug
list mirroring the FLEX brochure's colour section; Owens Corning's own line comparison
independently says "9 Colors Available Regionally". 616 matched FLEX to Duration's rows on
a misreading of *"the is flex but the color is the same"* — he meant a colour **renders**
the same, not that FLEX comes in all of them — which let a rep pick Merlot on the FLEX page
and order a roof in a colour FLEX is not made in. **If that list grows, the brochure grew:
check the document.** Two of the nine are discontinued and are filtered out of the sellable
page while still appearing on the Discontinued one.

### ✅ 621: Duration and FLEX are 130/160 MPH — the conflict is RESOLVED, do not re-open it

The `"up to 160 MPH###"` on Owens Corning's website sat unexplained for two builds and the
pages stayed at 130, because *"up to"* plus a footnote marker is the same shape as
Oakridge's conditional 110/130 and no document on hand mentioned 160. **Theo supplied the
Owens Corning Sales notice on 7 Aug and it settles all three questions at once:**

- It is a **warranty** figure, not a rating — *"the wind warranty … will increase from 130
  MPH to 160 MPH"* — so it upgrades the existing wind row rather than adding a second one.
- **Effective 1 August 2026**, so it is already live.
- The condition is **at least FOUR Owens Corning Total Protection Roofing System®
  components**: Hip & Ridge, OC Underlayment (Titanium® / RhinoRoof®), Starter shingles on
  **both the eaves and the rakes**, and either an OC Ice & Water Barrier or an OC
  Ventilation product. Anything short of that **still carries 130**.

⚠️ **Duration's second number and Oakridge's are opposite in sales meaning, and the code
now keeps them apart on purpose.** Oakridge's 130 is a **caution** — quote the lower figure
unless the roof was built that way. Duration's 160 is an **upsell** — quote it only when
the full system was actually installed. They render with identical geometry (solid base +
hatched extension), so the wording is the only thing separating them: each line carries its
own `chart.extNote`, and both the jsdom and Chromium harnesses assert that Duration never
prints Oakridge's six-nail condition.

### ✅ 622: Cardinal DOES install the complete system, and the page says so

621 stated the condition and deliberately refused to claim Cardinal met it — that was Theo's
to say. **Asked directly, he said "Yes we do."** So the block under the spec table flipped
from a caution into the strongest line on the page: *Cardinal installs the complete Owens
Corning® system. That is what qualifies this roof for the 160 MPH wind warranty rather
than 130.*

⚠️ **Three things keep that claim true, and all three are harness-asserted. Do not
"tighten" the copy by removing any of them:**

1. **The 130 fallback stays.** *Standard* is not *always* — a component can be substituted
   or declined on a job, and that roof carries 130. Deleting the sentence turns a
   conditional truth into an unconditional statement about a warranty, in front of a
   homeowner.
2. **The warranty stays Owens Corning's to grant.** The copy says *Owens Corning requires…
   and Cardinal installs all four*. Cardinal installs; OC warrants. Never "our warranty".
3. **The four components stay named.** A homeowner reading Hip & Ridge, underlayment,
   starter on the eaves *and* the rakes, and ice-and-water or ventilation is seeing what
   they are paying for. It is the proof of the claim, not decoration.

⚠️ **`noteTitle` is per-line, and this is the second time the same lesson was paid for.**
621 moved the bar caption onto each line because Oakridge's second number is a caution and
Duration's an upsell. The note's *heading* was still one hardcoded string — *"Read this
before quoting the wind number."* — which framed Cardinal's selling point as a warning.
**Anything that reads differently on two lines belongs on the line, not in the renderer.**
Oakridge keeps the caution heading; Supreme has neither.

⚠️ **The source is a sales notice, not the warranty document.** Revised warranty documents
were due on OwensCorning.com 3 Aug 2026; the sandbox cannot reach that site. When Theo can
pull the published document, it should replace the notice in both `source` strings.

**⚠ No spec figure that isn't sourced — enforced at patch time, not intended.** Every number in
`LINES` is quoted from an Owens Corning document Theo supplied, and each page **names its file
underneath the table**: the Duration Beauty Book, the FLEX brochure, the Supreme Data Sheet
(10013324) and the Oakridge Brochure (10024153). `patch617.py` asserts that **any line rendering a
spec table names a source**. Oakridge and Supreme were deliberately held at `ready:false` for two
builds because OC's own site is unreachable from the sandbox and a search returned contractor blogs
and big-box listings — the sourcing Theo already rejected once on Williamsburg Gray.

**⚠⚠ Oakridge's wind number is CONDITIONAL and must never be shown as one figure.** The brochure's
own ‡‡ footnote: *110 MPH is standard with 4-nail application; 130 MPH applies only with 6-nail
application and Owens Corning Starter Shingle along eaves and rakes.* It renders as an `.occ-note2`
caution above the source line, and the harness asserts both its text and that it precedes the
source. A rep quoting 130 on a four-nail roof is stating something false about a warranty.

**Absence is not a claim.** Neither the Oakridge nor the Supreme document mentions SureNail, and
neither states an impact class. Nothing says "no SureNail" — the tables say *"Not stated in the
product brochure"* and quote OC's own wording for what Oakridge *does* have (*"full double layer in
the nailing zone"*).

Oakridge and Supreme have **no rows in `oc_colors`**, so their pages carry specs and no colour grid.
Only add a `match` if colours are actually loaded.

### 618: three presentation styles, above 820px only

`data-style` on `#cr-occ` — **`roofs`** (default), **`compare`**, **`feature`** — switched
from a control in the header and remembered in `localStorage['cr-occ-style']`.

**The phone is untouched and that is a gate, not an intention:** the 430×932 render must
stay pixel-identical across all three styles *and* against the build-617 baseline. Two
leaks were caught only by that diff — an inline `background-image` on the hub tiles, and
the comparison board's markup rendering as unstyled divs. Heroes are now a `--hero` custom
property consumed solely inside the media query, and `.cmp-*` is `display:none` in the
base sheet. **JS stays viewport-independent** — no resize listener anywhere.

⚠️ **A `[data-style]` rule ties with `#cr-occ.line .occ-hub{display:none}` on specificity
and wins on source order.** The hub rules therefore carry `:not(.line):not(.detail)`. Do
not simplify them.

⚠️ **The split is a float, deliberately.** As a grid, the pitch column spanning four rows
fed its height back into those tracks and pushed the first roof 1161px down an 834px
screen. And it grids **`#occBody`**, a wrapper — never `#cr-occ`, which carries an inline
`display:block` from `open()` that beats any stylesheet rule.

**A line's hero is always one of its OWN colours**, including the fallback. Oakridge and
Supreme have no catalogue rows and so no photograph; their wind rating becomes the artwork
rather than borrowing another line's roof. `chart` feeds the bars and is guarded at patch
time against drifting from the sourced `specs` text.

### 620: SureNail is the pitch, and its figures carry their basis

Theo — *"Sure nail strip is what sells the duration compared to competitors."* Duration's blurb
led with a comparison to **Oakridge**, Cardinal's own cheaper line; it now leads with Owens
Corning's own competitive claim — the first and only reinforced nailing zone **on the face** of
the shingle, Triple Layer Protection® where the fabric overlays both layers, and the warranty
point that closes it: *a shingle may not be covered at all if it is not fastened in the right
place.*

`proof` on `LINES` renders `.occ-proof` — **2× nail pull-through, 9× nail blow-through, 2×
delamination** — on **Duration and FLEX only**, the two lines that have SureNail. Oakridge and
Supreme carry none, because neither document mentions it; *absence is not a claim* applies here
too, and the harness asserts it.

⚠️ **`basis` is not optional and must never be dropped.** OC's own qualification: *up to*, against
**competing products with wide, single-layer nailing zones**, nailed in the middle of the
allowable zone. "9× better" alone is a different claim from the one that was tested — the same
discipline as Oakridge's ‡‡ footnote. `source` on both lines names the **SureNail Sell Sheet
(10020692)** for the tested figures.

⚠️ **No competitor is named — SETTLED BY THEO, do not re-litigate.** *"As far as competition goes,
doesn't need to be here that's a whole separate thing."* `harness_colors.js` asserts it: IKO, GAF,
CertainTeed, Malarkey and TAMKO are all checked against the rendered markup. Theo's original framing
*was* a comparison — IKO's equivalent strip is on the **back** of the shingle — and it is a good
sales point that stays off this screen anyway. This surface sells Owens Corning on Owens Corning's
own documented claims; a claim about a named competitor's product is Cardinal's own with nothing in
the folder behind it. The assertion began as a defensive default while the question was open and is
now the settled design. **"A whole separate thing" is an observation, not a request** — nobody
should build a competitor-comparison surface off that phrase.

**617: the collection split is a TAB, not a chip.** Theo — *"Also tab designer series."* A
collection and a shade are different kinds of choice, so `#occTabs` (`All colours · Standard ·
Designer Series`, underline indicator) sits above the shade chips in `#occFilters`. `filters()`
clears both, so a line with no designer rows shows no tab strip rather than a stale one.

**`lineLabel()` exists because the sub-line used to lie.** It was a binary, so the five rows with
`product_line='other'` all read "TruDefinition Duration" — a claim nobody recorded. They now say
"Owens Corning" and stop. Found by rendering, not by a gate.

**Tables:** `oc_colors` (the catalogue), `oc_color_photos` (Cardinal's own installs),
`oc_color_wall` (the view). All read for `authenticated` — **sales can see colours**, settled by
Theo. Writes split: `oc_colors` is `is_cardinal_admin()`, `oc_color_photos` insert is `is_staff()`,
so whoever is on the roof can add a photo but only Theo curates the catalogue.

### The three rules the module exists to keep

**1. `hidden` is not `status`.** The query filters on `hidden`, **never** on `status`. Discontinued
colours keep their spot and are badged, because an owner with an old roof has to find their colour
and a repair has to be matched. Only `hidden` removes a spot. Currently one row: Shasta White.

**2. A cover is Owens Corning's photograph; `oc_color_photos` is ours.** They render in visibly
separate sections, the second labelled *"Cardinal installs, not manufacturer photography."* Those
are two different claims and merging them makes the showroom's whole pitch false. **Never render a
cover inside the "our roofs" section.**

**3. `hex_verified` is false on every row.** A colour with no cover falls back to its hex and the
card says **"Approximate colour — not a verified swatch."** The hexes were sampled from OC's
*printed swatches*, never from a roof photograph — a roof in afternoon sun is not the product
colour. A rep must not hold a tablet against a house and call an eyeballed hex the colour.

### Covers

`cover_image_path` → `oc-colors/covers/<slug>.jpg` in the `photos` bucket, **flat, one folder**.
`slug` is `generated always` from `name`, so there is one derivation and it lives in the database —
**JS must never recompute a slug**, or photos end up filed under a colour that no longer matches.
Signed with `createSignedUrls` for **display only**, never written back into a row.

**23 of the 30 colours have a cover** (`oc_color_covers_set.sql`) — **every sellable
one**. The seven without are all discontinued, which is correct and permanent: a colour nobody can
buy renders its labelled swatch. No new storage policy was added or is wanted — `oc-colors/` sits
under the bucket's general authenticated-read; only `photos/studio/*` is carved out of it.

### The harness is committed — run it before you touch this module

`scripts/harness_colors.js` (jsdom, **93 assertions**, optional path argument) executes the
*shipped* `cr-occ-script` text against real `oc_colors` row shapes. It is where the claims above
are actually enforced: that every line rendering a spec table names its source, that Oakridge's
wind row is never a flat 130, that the SureNail figures can never render without their basis line,
that Oakridge and Supreme carry no proof block at all, that no competitor is named, that FLEX shows
only its nine, and that the wall filters on `hidden` and never on `status`. It cannot see layout or
colour — the 618 styles, the ≥44px targets and the phone pixel baseline are Chromium's job, and
whether any of it sells is Theo's.

### Conventions

**Owens Corning's own palette since 623** — pink `#EC008C`, rich black `#231F20`, white,
sampled from their VentSure RidgeProwler flyer on Theo's pick. It was Blackout like
`#cr-show` until then. Still deliberately outside both app themes.

⚠️ **The pink is THREE values with three jobs, and they are not interchangeable.**
`--occ-red` `#EC008C` is a **fill and large-type** colour only — it is 3.84:1 as small text
on the black and 4.25:1 under small white text, both below floor. `--occ-pink-on-dark`
`#F55CB2` (5.48:1) is small pink text on the black ground; `--occ-pink-deep` `#C4007A`
(5.79:1) is the ground under small white text; `--occ-pink-ink` `#A6006A` (7.42:1) is body
pink on white. Same for the inks: `--occ-panel-ink` / `--occ-panel-dim` are the white-panel
set, and **`--occ-dim` must never touch a white panel** — it is 2.55:1 there.

⚠️ **White is for DATA surfaces, not photo cards.** In `roofs` and `feature` a tile is a
photograph and its ink sits over a scrim, so those keep a dark card; the compare rows, the
colour grid, the proof figures and the wind note are the white ones. `[data-nophoto]` tiles
are white because there is no photo to sit on.

⚠️ **The Pink Panther is not used — but NOT for the reason 615–623 claimed.** Those builds
said Cardinal lacks the licence. **That was wrong**: Owens Corning's guidelines are written
*for contractors* and extend the character to them under an approval process. The real
reason it is absent is that **nothing has been submitted for approval**. See
`OC_BRAND_RULES.md`, which also records that the OC logo must **never be reversed to white**
— red on our black ground is explicitly approved, and a white variant was nearly requested
on the strength of the same wrong assumption.

⚠️ **Any OC or Pink Panther mark needs Owens Corning's approval before launch** —
LMARoofing@owenscorning.com, plus 8 business days at MGM for the character. **That gate is
Theo's to pass; a session can build and stage, never ship on the assumption of approval.**

**Run `scripts/audit_contrast.js` after any colour work here.** It measures every text node
against its real computed background in Chromium and found **25** violations at 623 where
eyes had found two. Its blind spot: it reads `backgroundColor`, so text over a
background-image is measured against the colour beneath the photo.

Blackout was the original design, like `#cr-show` — a client-facing Vision surface, deliberately outside both app themes.
**Every `--occ-*` reference carries a literal fallback**, so the 448–449 stripped-token class cannot
reach it. Registered in `hideAllViews()`, `OVERLAY_IDS` and `PANES`; **display-shown**, so
`display:none` is the close lever. Adds **zero** global scroll-lock writers.

### Not built

**The colour sheet.** Deferred from 615 deliberately. It is a document in the existing
`api/share.js` + `ccDeliver()` pipeline — **no PDF generator**, the `@page{size:Letter}` print path
already exists. Theo, settled: *"No pricing on sheets it's not a quote."* **No money fields at all**,
not blank ones, and it stays outside the estimate/contract document family.

---

## 624–627 — weight, the front door, the header, and the tray (8 Aug 2026)

*Appended 8 Aug 2026 at build 627. Four builds, three of them small; 627 is a feature.*

### 624 — the Showcase asks for the display rendition

`cr-show-script`. The slider and thumbnails were requesting the **FULL** rendition
(`{3840, q0.92}`) to paint a card that **caps at 612 CSS px on every device**. Four call sites moved
`src(` → **`srcD(`** (`{1400, q0.82}`): a twelve-pair Showcase went **8,346 kB → 1,455 kB**.

**No quality trade** — 1400px still covers 612 CSS px at 2× with room over. **`openLens()`
deliberately keeps `src()`**: the pinch-to-full-resolution view reads `data-path` and resolves the
FULL rendition itself, so the one surface that genuinely wants 3840px still gets it.

⚠️ `harness_showcase.js`'s assertion *"the slider uses the FULL image"* encoded **577's** intent,
which 624 reverses on purpose. The test was updated, with 577's reasoning kept in a comment. **When
a gate goes red, first ask whether the test or the app is wrong** — here it was the test.

### 625 — the showroom stops wearing the CRM

`isVisionHost()` (already on `window.CardinalLanding`, extended rather than duplicated) now also
gates **`showMain()`**: on `showroom.*` — or `?vision=1` for testing — the CRM chrome does not render
at all. The header, Add project, the nav wrap, and the backup/audit nav items are all skipped.

Theo's report: *"whenever I log into showroom or the other one, it takes me to the crm homepage."*
Offered three options; he chose **"Option 1 but remember option 3."** Option 3 — a genuinely separate
`showroom.html` — is recorded in `OPEN_ITEMS.md` **with the two triggers that would justify it**.
`harness_vision.js` is 23 assertions, each run twice (with and without `?vision=1`), against the
*shipped* `showMain()` text.

### 626 — the shingle name fits

`#cr-occ .occ-title b` gained `word-break:keep-all` and `font-size:clamp(19px, 2.1vw, 26px)`.

**The lesson is worth more than the fix.** Theo's iPad photo showed the Duration FLEX title stacked
across six lines with the ® marks stranded. Two builds guessed at iOS font-boosting and a third was
about to. **Every prior render had been at 1194px — the one width where the name happens to fit.**
Pointing a harness at **820px** reproduced it instantly in plain Chromium. It was **width-only,
never iOS-only**.

`harness_occhead.js` — 42 assertions, 5 widths × 3 styles — now asserts *no break inside a word at
every width* and *one line at ≥820px*. It deliberately does **not** demand one line at 390px, where
wrapping at a space is ordinary. An earlier draft did, failed six times, and **the test was wrong.**

### 627 — tick photos in Studio, build the pair in the Showcase

**Theo:** *"Any way you could make checkboxes on these photos so they can be transferred to another
section to where I could pick which photos I use for before and afters and bad vs good installs?"*

**The prime doctrine again: the UI he described already existed.** The Showcase pair-builder already
tracked `chosen{}` (which photos are ticked) and `roles{}` (which is before, which is after) — it had
simply never been pointed at the archive. So 627 adds a **tray** and a **source**, and reuses the
picker, the role assignment and the whole create path untouched.

| Half | Where | What |
|---|---|---|
| Studio | `studio.html` | a `.stu-tick` button on every archive card. `ev.stopPropagation()`, so ticking never opens the lightbox. Archive rows only — the Private side is not curation material. Optimistic write that **reverts on failure**, because a tick that looks saved and is not is worse than one that visibly refuses |
| Showcase | `cr-show-script` | the tray enters as a **pseudo-project**, `TRAY_ID = '__studio_tray__'`, unshifted onto the job list only when it has something in it. `loadJobPhotos()` branches to `loadTrayPhotos()` before the project lookup |

`promoteToPair`, `drawJobPicker` and `takeJobPhotos` are each **still defined exactly once** —
asserted, because a second picker was the obvious move and the wrong one.

**Storage:** `studio_tray.sql`, applied before the HTML change. `storage_path` is the primary key, so
a double tick upserts instead of duplicating. Admin-only RLS matching `studio_photos`.

⚠️ **The GPS fence runs straight through this.** `studio_photos` carries `lat`/`lon` — all 60,503
rows NULL today — and the tray is the **first path from the archive toward a client-facing screen**.
`studio_tray` has **no coordinate columns**, and `toggleTray()` **names its six fields explicitly
rather than spreading the row**. Asserted at the schema, at both ends of the code, and by
`harness_tray.js`. **Do not "complete" the row.**

**Quality guard:** the archive averages 1138×1033 and only ~40% clears 1400px, while the compare card
wants 1224 device pixels at 2×. Tray rows carry `_small` so a soft photo is marked **before** it
lands in front of a customer.

**Known, and recorded in `OPEN_ITEMS.md` rather than fixed:** nothing removes a photo from the tray
once its pair is built, and the tray reads `.limit(300)` with no paging.

---

## 628 — two keep buckets, and the Hall of Fame finally gets a picker (8 Aug 2026)

**Theo:** *"1 is the bin for trashing or selecting? Is there a bin for keep for before and after a
bin for damage vs how we do it and a bin for junk?"*

**Three destinations existed; only two were reachable.** The answer to the first half: the Bin is
**trashing** — `setArchived(address, on)` matches `.eq('project_address', address)`, so it archives a
whole SITE, reversibly, with no confirm. It is for pruning, not picking.

| Bucket | Table | Before 628 |
|---|---|---|
| junk | `studio_photos.archived_at` | ✅ the Bin |
| before & after | `showcase_pairs` | ✅ via the tray |
| theirs vs ours | `workmanship_pairs` (built at 576) | ❌ **upload-only — could not see the tray at all** |

### What changed

- **The tick cycles** — off → Showcase (green rounded square) → Hall of Fame (amber circle) → off.
  Theo picked this shape from rendered options over two separate boxes and sort-it-later.
- **`studio_tray.bucket`** — one idempotent ALTER, NOT NULL default `'showcase'`, constrained to
  the two values. `storage_path` stays the primary key, so a photo lives in **one bucket at a time**
  and re-ticking MOVES it.
- **Two pseudo-projects** in the picker instead of one, each offered only to the shape that can
  consume it, so a Hall of Fame pick cannot become a Showcase pair by accident.
- **The Hall of Fame gained "From a job"**, and its upload button now says *Upload photos* — the
  same rename 598 made on the Showcase, for the same reason.

### The doctrine held again: the picker was reused, not rebuilt

`jobPick` was already slot-driven — `slots:['before','after']` is just an array every consumer walks.
The second shape is that array (`['bad','good']`) plus a completion guard that reads
`jobPick.slots` instead of naming before/after. **`promoteToPair`, `drawJobPicker`, `takeJobPhotos`,
`openJobPicker`, `openWorkForm`, `savePair`, `saveWork`, `defSlot` and `loadTrayPhotos` are each
still defined exactly once** — asserted. `defSlot()` labels the new slots **"Theirs" / "Ours"**,
because `bad`/`good` are column names and the wrong words to show mid-pick.

### ⚠ Two traps closed in the same build

**`openWorkForm()` had no `pending = null`.** Harmless while `saveWork` ignored `pending` — but the
moment it started preferring carried files, the next hand-made comparison would have silently
uploaded the *previous* pick's photographs. Exactly what the 591 comment on `openForm` warns about.
Both forms now clear unconditionally.

**A Hall of Fame comparison never prefills an address.** The bad side is somebody else's roof;
naming it is not Cardinal's business.

### The fence is unchanged

`studio_tray` still declares **no coordinate columns**, `toggleTray()` still names its fields rather
than spreading the archive row, and both tray reads filter by a bucket derived from the picker's own
mode so the two cannot disagree. `harness_tray.js` is **48 assertions**, negative-controlled — 24 of
them fail against 627.

### 629 — a third bin, and a trade on every photo

Theo, an hour later: **"Extra bins"** → *"Colors but also would be nice to have by trades as well"* →
on the control, **"Arm a bin, then tap."**

⚠️ **Those are two different kinds of thing, and the schema says so.** **Colours is a BUCKET** (a
destination, like showcase and workmanship — one per photo, `storage_path` is the primary key).
**Trade is a FACET** that cuts across all three: a before/after can be a siding job. As a fourth
bucket it would have forced a roofing before/after to choose between being a before/after and being
roofing. Its six values are the app's **existing** `TRADES`, the same list `workmanship_pairs.trade`
and `crews_trade_ck` already carry — one vocabulary, three tables.

**The 628 cycle is gone.** Right for two bins, wrong for three: undoing a mis-tap cost one tap per
remaining bin. The chip is now a plain in/out toggle against whatever bin is **armed** in a row above
the grid — one tap either way, however many bins exist. `tapResult()` holds the entire meaning of a
tap in one place, including that a photo in a *different* bin **moves** on tap and keeps its trade,
and that trade mode is a **no-op** on a photo not in the tray (there is no row to write on).

Verified by executing the shipped `tapResult` through every state — 11 functional assertions,
including that **every reachable result is a valid row**, so no sequence of taps can hit a DB
constraint. `harness_tray.js` is 57 assertions, negative-controlled.

### 630 — the "Our roofs in this colour" grid, fixed in six places

Theo, from the iPad: multi-select missing · "Upload fails as well" · a duplicate with no way to
delete · open full screen and swipe · the white labels · "Scrolling also locks up".

⚠️ **Two of those were one root cause.** The `photos` bucket refuses anything over **10 MB** and
`upload()` sent **raw camera bytes** — the six photos already on Onyx Black are **5.37–8.04 MB
each**. Bigger ones were refused ("upload fails"); the survivors made the grid **~40 MB to paint**,
which is an iPad locking up while scrolling. `shrink()` and the `FULL`/`DISP` constants were
**exported from `cr-show-script` rather than copied**, uploads now write both renditions as JPEG
(fixing HEIC-on-Chrome too), and the grid asks for the display twin **with a fallback** — pre-630
photos have no twin and would otherwise vanish.

Also: `multiple` on the input with per-file progress and uuid paths (`Date.now()` collides when
several files land in one millisecond, which `multiple` would have triggered immediately) · a
delete button, admin-gated in UI and RLS, deleting the **row before** the storage object · a
lightbox with swipe, arrows and Escape, its own element rather than the Showcase's `openLens` ·
`overscroll-behavior:contain` on the view and the lightbox.

**The caption was a contrast failure, not a preference.** 623 set `--occ-card:#FFFFFF`, so the label
had been `--occ-dim` grey on white — **2.55:1**, which this file's own palette comment already
recorded. It is now `--occ-head` ground with `--occ-pink-on-dark` (**5.48:1**). ⚠️ **Not** the brand
pink `#EC008C`, which is 3.84:1 as small text and is a FILL colour under OC's rules — honouring the
request literally would have failed the floor.

`harness_ourroofs.js` — 38 assertions, negative-controlled (37 fail against 629).

~~**Known and stated:** the six already-uploaded oversized photos stay oversized until re-uploaded.~~
**CLOSED at 631** — see below.

### 631 — Optimise, for the photos that predate 630

630 shrank new uploads but could not reach the ten already there (**40.2 MB, 4.02 MB average, none
with a `-d` twin**). An **Optimise** button on the colour page now re-encodes them **in place**:
fetch the signed URL the grid already signs → the **same `shrink()`** → upload to the **same path**.

**It never writes the table.** `storage_path` is unchanged, so a failure leaves that photo exactly
as it was — a re-encode that rewrote paths could strand rows and hole the grid. Harness-asserted by
slicing the function and checking `oc_color_photos` never appears in it.

Which photos need it is **exact**: a missing `-d` twin *is* the test, and it is free because both
paths are already signed. The button appears only when the count is non-zero, names it, and hides
itself when done. Safe to run twice.

⚠️ **It fetches to a Blob first, and that is load-bearing.** `shrink()` uses
`URL.createObjectURL(file)` — a `blob:` URL, same-origin, canvas stays clean. Pointing it at the
remote `https` signed URL would **taint the canvas and make `toBlob()` throw** (the CompanyCam
picker carries the same warning).

**Theo tapping it is the gate** — the fetch → canvas → re-upload path cannot be exercised in the
build container.

---

⚠️ **The colours bin collects but has nowhere to go yet — that is 630.** `oc_color_photos.color_id`
is NOT NULL, and the choice of *which* colour belongs on the Colors page where the swatches are.
More importantly the photo must be **copied** into `oc-colors/<slug>/`, not referenced in place:
Colors is visible to all signed-in staff while `photos/studio/*` is admin-only, so a referenced
archive path renders for Theo and is broken for Curtis and Nick.

---

⚠️ **A Chromium render caught what no assertion could.** The amber state first drew a **bar** so that
shape would carry the state as well as colour. Every gate was green. The picture showed the mistake:
a bar in a checkbox is the universal *indeterminate / excluded* mark, so green → amber read as
**un-picking** the photo. The tick now means PICKED in both and the **chip shape** carries the pile.
Theo's eyes remain the gate on anything visual.


---

## 632 — the Archive button was never wired, and binning several sites (8 Aug 2026)

**Theo: *"The archive site button does not work."*** It genuinely did nothing, from
**614 until 632** — `archived_at` was NULL on all 60,503 rows.

⚠️ **Two theories were tested and both were WRONG — do not re-chase them.** The rail
address matches `project_address` exactly, and RLS is fine (one `FOR ALL` policy with
`is_cardinal_admin()`; he SELECTs 60,503 rows through it).

**The cause:** `setupMode()` returned inside its `isShowroomHost()` branch **before any
`addEventListener`**. On a `showroom.` host, three controls were drawn and dead —
**Archive site, Restore site, and the lens switcher**. It was invisible because the
button still renders (`paintSiteActions()` reads state, not listeners), site selection is
wired elsewhere (`renderRail()`), and the default lens is already `'site'`.

625's intent is kept — the mode is still forced, the toggle still hidden. Only the early
return went, and it protected nothing: Studio is admin-gated by its own sign-in *and* by
RLS on every host.

**A second, independent defect:** `setArchived()` checked only `res.error`, and a
PostgREST update matching **zero rows succeeds** — so a no-op looked exactly like a
success. It now `.select('id')`s and names what matched nothing.

### Bin several sites

A tick beside each street in the rail, then one **Archive N sites** button. It **reuses
`setArchived()` per address** rather than a second bulk query; `quiet` suppresses the
per-site repaint so it paints once at the end. ⚠️ The tick is a **`<span role="checkbox">`,
not a button** — the rail row is already a `<button>` and a nested one is invalid markup
that engines resolve by dropping one. Ticking `stopPropagation()`s so it does not also
select the site.

`harness_studiobin.js` — **28 assertions**, and the ones that matter **execute** the
shipped `setupMode` under both hostnames and ask the DOM whether a listener attached.
Its negative control reproduces the symptom exactly: on 631, `studio.` wires and
`showroom.` does not.

**Not built, deliberately:** per-photo junk. `archived_at` is already per-row so it needs
no migration — a **Junk** chip in the 629 arm row would do it. Ask before building.

---

## Build 633 — the colour grid loads a tile-sized picture (8 Aug 2026)

Theo: *"Page still feels heavy, white boxes then loads slow."*

### A third rendition

`cr-show-script` now declares **three**, together, so nobody adds a fourth elsewhere:

| | size | for |
|---|---|---|
| `FULL` | 3840px q0.92 | the lightbox, and the Showcase's pinch |
| `DISP` | 1400px q0.82 | the Showcase compare card (612 CSS px) |
| **`THUMB`** | **640px q0.80** | **the Colors grid tile** |

The tile is **269.5 CSS px** — measured in Chromium at his 1194px iPad width, where
the grid resolves to four columns — and it was being handed `DISP`, 4.8× the pixels it
can show at a measured 663 kB average. 640 rather than 800 is a trade stated in the
code: 2.4 device px per CSS px on the iPad, ~1.8 on a phone, full resolution still one
tap away.

**`thumbOf()` and `dispOf()` both delegate to one `sfx(path, tag)`**, so they cannot
drift into different rules for the no-extension case.

⚠️ **The fallback order is the feature.** Three eras of photograph share this grid —
pre-630 (original only), 630–632 (original + `-d`), 633+ (original + `-t`) — so the
grid signs all three paths in one round trip and takes `-t → -d → original`. Remove
the fallback and every existing photograph vanishes.

New uploads write **full + thumb**. `DISP` is deliberately no longer written here.

### Optimise now does the work the page pays for

It targets photos with **no thumbnail** (was: no display twin), re-encodes **from the
display copy** where one exists (663 kB fetched instead of 3.5 MB), and writes **only
the thumbnail — the original is never touched**, so a failed run costs nothing. The
toast reports **what the page will load next time**.

⚠️ 631 re-encoded the original to 3840px, which a drone photo already is — that is
where *"39.9 down to 29mb"* came from.

### The white boxes

623 set `--occ-card:#FFFFFF` and the `<figure>` shows through until the image paints,
so a lazy load flashed **white on a near-black page**. `#cr-occ .occ-ours img` now
carries `background:var(--occ-head,#231F20)`. Confirmed in Chromium: 632 computes
`rgba(0,0,0,0)` over a white figure, 633 computes `rgb(35,31,32)`.

### Two hardenings

- **`shrinkOne(file, name)`** is the single place that checks the image toolchain;
  `window.CardinalShowcase` appears **exactly once** in the module, asserted.
- **`signMany()` keys by the path the API answered for**, not by array position. It
  had keyed positionally since 630; 633 asks for a third path absent on every photo on
  first run, and a compacted response would have handed each photo its neighbour's
  picture.

`harness_ourroofs.js` — **58 assertions**, green on 633, **27 red on 632**.

---

## Build 634 — Community Partners stopped crashing, and errors left the job thread (8 Aug 2026)

Two defects, both visible in one screenshot of job 1002.

### The masked-row crash (`cr-cpartners-script`)

`renderDirectory()` renders Edit/Archive behind `p.__masked ? '' : …` and wired them
unconditionally. `maskIfConfidential()` masks a `confidential` partner for anyone outside
`ADMIN_EMAILS` / `PROD_EMAILS` — so **the sales reps were exactly the people who crashed**,
and with 2 of 10 live partners confidential it fired every time.

⚠️ **The throw was inside a `forEach`**, so the masked row **and every row after it** lost
Edit and Archive while the list still looked normal. `openDirectory` is `async`, hence
`[unhandledrejection]`.

Fixed by copying `renderProspects()` ten lines above — `var b = …; if(b) b.onclick = …`.
Markup unchanged.

⚠️ **The properties `renderDirectory` is deliberately NOT guarded.** Its buttons are
unconditional, so a guard would only turn a future regression into a silently dead button
(**class 16**) instead of a loud crash. Both halves asserted.

### `THREAD_SKIP` (`cr-cc-script`)

`capture()` stamps client errors with whatever project was open, and the Community thread
read `audit_events` with no type filter, rendering `e.detail` as the entry **title**.

```js
var THREAD_SKIP = { client_error:1 };   /* shaped like IC_SKIP / PIPE_SKIP */
```

Applied **at load**, not at render: `events.length` feeds `key()`, so a late filter would
let an incoming error repaint the page. **The project stamp stays and nothing is deleted** —
the Team audit log reads the same table and should keep showing every error. No SQL.

`harness_partners.js` — **23 assertions**; the ones that matter **execute** the shipped
mask/render pair as both an admin and a rep. Negative control on 633: admin passes, **rep
throws** — the reported symptom, reproduced. It also asserts the confidential name stays
out of the DOM, so a "fix" that just rendered the buttons cannot pass.

---

## Build 635 — a confidential partner stays confidential on the prospects list (8 Aug 2026)

⚠️ **Correction to the 634 note:** `prospects()` **always masked** — the list was never
the leak. A confidential prospect has always rendered as "Confidential Partner" with no
contact details.

**The leak was the Edit button.** `renderProspects` rendered it unconditionally and its
handler calls `getRaw()`, the deliberately unmasked lookup. One tap opened the real name,
contact, email, phone, address and notes.

Three parts:

1. **The button is hidden on a masked prospect** — `renderDirectory`'s ternary, copied.
   The `if(b)` guard that handles the absence is **build 634's fix**, used the next build.
2. **The CONFIDENTIAL chip**, same markup as the directory, so the missing button is
   explained rather than mysterious — a silently absent control reads as broken.
3. **`openEditor` refuses to unmask for a non-privileged caller**, and says why. This is
   the fence; 1 and 2 are the UI. `getRaw()` is called on every id `openEditor` receives,
   so without it the mask is only as strong as its callers.

⚠️ **Part 3 is deliberately not the same call as 634's "don't guard the properties
directory".** That rule is about controls, where a guard hides a regression behind a dead
button. This is a confidentiality boundary — and `pickPartner()` already leaked this way
once. Admins are untouched.

`harness_partners.js` — **42 assertions** (was 23). The new section **takes the tap**:
renders the real `renderProspects`, clicks Edit on the confidential row, and reads what
`openEditor` got. Negative control on 634 prints the leaked record. It also asserts the
admin still gets the real row, so breaking editing cannot pass.

---

## Build 636 — one location card on a client profile (8 Aug 2026)

There were **two** maps on every profile, on different stacks: a Google static block
injected by `maybeInsertProfileMap()` into `#projectView`, and the Location card's
**Leaflet** map geocoded through **Nominatim** with Esri satellite tiles — the one that
said *"Could not pin this address."*

The Location card now paints the **Google static map** itself (`dbPaintMap` →
`CardinalMaps.staticMapUrl`), and the floating block is gone. No map library, no tile
server, no geocode round trip. Map/Satellite still switch, via one exported setter
(`window.dbSetMapType`) because the tab handler lives in a separate script block.

⚠️ **Why the card was not simply deleted** — it carries the **only** rendered address
text and the **only** `#acxEdit2` pencil (`#acxEdit1` is never rendered), and
**Community has no Google card**: `adoptLocation()` *moves* this `.acxsec` into
`#cr-cc-loc`. Community therefore gets a working map here for the first time.

⚠️ `qiLoadLeaflet()` survives — a second Leaflet map elsewhere still uses it, with its
own forward and reverse Nominatim lookups. Only this screen stopped.

`harness_location.js` — **24 assertions**; the executed half runs the shipped painter,
reads the DOM, switches the tab and reads again, and covers the no-key case. Negative
control on 635: 16 red.

---

## Increase tracking — the claim bridge (646)

**Where:** `bridgeSolToClaim()`, `paintSolLift()`, `localToday()` in the main block,
beside `applySolExtraction()`; `adjuster.company` in `api/sol.js`; an Adjuster Company
input in the claims module's edit modal.

Reading a Scope of Loss now writes the **claim record**, not just the checklist — which
is what makes every increase figure in the app light up. Before 646 the whole stack
existed and computed NULL because **nothing had ever written `first_scope_rcv`**:
`claim_money` (view) → `lift_pct` / `recovered`, `supplement_stats()` (RPC) →
`avg_increase_pct`, `renderLift()` on the claim, the per-carrier league table, and the
"Avg supplement" tile were all built and all gated on `first_scope_rcv > 0`.

**The model, which is Theo's:** claim number, carrier and adjuster do not change across
supplements; the dollar amount does.

| | set when | overwritten? |
|---|---|---|
| `first_scope_rcv/_acv/_depreciation/_at` | first scope carrying a dollar figure | **never — write-once** |
| `approved_rcv/_acv/_depreciation` | every scope | yes, each time |

So the first scope reads `+0.0%`, and each approved supplement moves the top figure
while the baseline holds. ⚠️ **Make `first_scope_*` writable and every percentage in the
app silently becomes 0, with no error.**

⚠️ **The claim is found by `project_id`, never by `projects.insurance_claim_id`** — that
link is NULL on rows predating `insurance_claim_backfill.sql`, so keying on it inserts a
second claim and strands the payments, supplements and iTels on the empty one.

The bridge writes only the fields the user **ticked** in the review modal — it does not
re-interpret the extraction. It creates the claim when there isn't one (identity from the
project, not the document). It regex-guards `date_of_loss` before a DATE column. It
**surfaces** its own failure rather than swallowing it, because "profile saved, claim
didn't" is exactly the state that then reads $0.

**The % on the job card** is `paintSolLift()`, on the Scope of Loss card. Async, and
deliberately not by making `renderSolCard` async; it carries a stale-paint guard because
the user can change client mid-request. Reads `claim_money`, which is
`security_invoker=on` — a rep sees a lift only for a claim they could already open. Three
states, each pinning **both** colours so it is theme-independent (8.61 / 11.06 / 8.10:1).

**`adjuster_company`** has been rendered by `paneClient()` since the claims module
shipped and had **no input and no extractor** — it could only read "Not set". Both added.

**Gates:** `harness646.mjs` (45 assertions, shipped functions extracted by
brace-matching, negative-controlled on 645) and `render_sollift.js` (Chromium — `#solLift`
is a grandchild of `#tab-overview`, whose `:not()` list has claimed five cards; the same
page proves `#insCard` stays hidden).

---

## Read the scope already on file (647)

**Where:** `sendScopeToReader()` / `readScopeOfLoss()` / `readFiledScope()` in the main
block; the `#solReadBtn` row in `renderSolCard()`.

A Scope of Loss can reach the extractor **two ways** now: picked fresh from the file
dialog, or read out of the document slot it was filed into earlier. Both end in
`sendScopeToReader()` — one core, two doors — and therefore both run through 646's
bridge and set `first_scope_rcv`. Theo: *"Make it to where the first scope uploaded is
the baseline and build from that."*

The slot stores `{file:1,name,mime,size,data:<dataURL>}` in `inspection_reports.html`,
the same shape a job file uses. `readFiledScope()` unwraps the base64 out of the data
URL and posts it. A row that is a real report rather than a stored file is refused
without posting; a failed extraction alerts and opens no modal.

⚠️ **There are FIVE independent `/api/sol` callers in this file** — `sendScopeToReader`
(main), `handleSolUpload` (`cr-claims-fx-script`), `extractFromUrl` (`cr-suf-script`),
`readScope` (`cr-sol-script`), `read` (`cr-ci-script`). 647 stopped the Scope of Loss
card from being a sixth; it did **not** unify the other four. Do not add a sixth.

**Also 647:** `insDocsProject()` — the insurance documents card's writers read the same
`insDocsCtx` its renderer got at 645. Before this, uploading from the claim screen's
Documents tab threw *"No client selected"*, because 645 moved the card somewhere
`currentProject` is null and only fixed the read path.

**And:** `#landingView` takes its ground from `data-mode` (the landing theme) instead of
`var(--bg)` (the app theme). See `BUG_CLASSES.md` class 17 — the two disagreeing put
cream text on a near-white ground at 1.24:1. `body{background:var(--bg)}` is untouched.

**Gates:** `harness647.js` — 21 assertions, the four-way theme matrix in Chromium plus
the shipped reader functions against the real stored payload; negative-controlled on 646
(5 red, including the 1.24:1).

---

## One transport for /api/sol (648)

**Where:** `solRead(payload)` in the main block, exported as
`window.CardinalSolUpload.read`.

Five screens can read a Scope of Loss and each had its own copy of the wire code.
They now share one. **What differs between them is real and was deliberately kept:**

| caller | payload | UI | success |
|---|---|---|---|
| `sendScopeToReader` (main) | `{file,mime}` | alert + button | `openSolReviewModal` |
| `handleSolUpload` (`cr-claims-fx-script`) | `{file,mime}` | rich button | `populateFromSol` |
| `extractFromUrl` (`cr-suf-script`) | `{url}` | none | returns |
| `readScope` (`cr-sol-script`) | `{file,mime}` | `shell()` panel | `review()` |
| `read` (`cr-ci-script`) | `{mode:'client', file\|url}` | `shell()` panel | `review()` |

`solRead()` sends whatever payload it is handed and does not inspect it — three
shapes over one wire. It uses **`window.aiHeaders()`**, the helper that already
existed for signing model-backed `/api` calls (15 other sites), rather than a
second token mechanism.

It throws an `Error` carrying **`.status`**, so a caller can branch without
re-reading the message — `cr-sol-script` uses that to keep its own 413 sentence
("photograph the pages instead"), which only makes sense on that screen.

⚠️ **`window.CardinalSolUpload` is merged, never plainly assigned.** It was a
plain `=` at 44673, *after* three of its callers, so anything added earlier was
discarded silently. Adding to it from an earlier block only works because that
line is now `Object.assign`.

⚠️ **Six hand-rolled `session.access_token` blocks remain** elsewhere in the file
(11 before this build, five of them the SOL readers). They belong to other
features; converting them is a separate build.

**Gates:** `harness648.js` — 33 assertions against the shipped functions, with
`readScope`/`read` wrapped in a closure that redeclares their module vars so the
real code runs; every payload shape asserted separately; negative-controlled on 647.

---

## One thread list — `commsMessages()` (649)

**Where:** main block, beside `commsCount()`.

The Communications thread is `checklist.comments` **plus the legacy
`projects.notes` column** promoted to a pinned first message. That promotion used
to be copied privately inside `renderChat()` and inside `renderLjPane()`, and
`commsCount()` — which paints the job-menu tile — did not know about it at all.
So a client whose only note lived in the old box showed the note on screen and
**"Communication 0"** on the tile. **Eight clients were affected**, including Maker
Space's 1,810-character structural-concern note.

All three now read `commsMessages(pr)`. ⚠️ `legacy:true` appears **exactly once**
in the file and there is a gate asserting it — that assertion is what found the
third copy. Do not re-inline the promotion into a renderer.

⚠️ **`readFiledScope()` must use `db.get(id)`, never `cacheRows`.** `db.list()`
names its columns and deliberately omits `html`, so no row in that cache carries
a stored file — a scope is 6.4 MB of base64. Reading the cache is what made
"Read the scope already on file" claim an intact document was empty (647→649).
`harness649.js` lifts `db.list()`'s real column list from the artifact and
asserts `html` is absent from it, so the fixture cannot drift from production.

---

## Money In & Commissions (650)

**What:** cash-collection commission tracking, replacing memory. One row in
`collections` per check received (deposit / final / supplemental / PWI /
other); a DB trigger auto-creates the 10% commission row for the project's
sales rep. Theo's own jobs create no commission. Draws are loans against
future commission; net payout = owed − outstanding draws. Paid locks.

**Where it lives:**
- **SQL:** `commission_system.sql` (root, **applied 9 Aug 2026**) — extends the
  556 `commissions` table (`collection_id` unique, `rate_pct`, `paid_by`,
  `project_name` denormalised for rep visibility), adds `collections`, `draws`,
  `projects.sales_rep`, and five SECURITY DEFINER triggers. Status vocabulary
  is still `pending/approved/paid/void`; the UI shows `pending` as **Owed**.
  **Do not create a second commissions table, and do not name anything
  `payments`** (a phantom table of that name already haunts the health check).
- **The tab:** `#tab-commissions` → `#commMount`, rendered by
  `renderCommissions()` in the main block (the 556 section, rebuilt in place at
  650 under the banner `/* ══ 650: Money In & Commissions`). Inline forms, no
  modals, no scroll lock. Admin+production log collections; admin logs draws,
  changes the rep (sales-role + Theo only, from `teamEmails()`/`tmRoleOf()`),
  and has a collapsed manual-entry form. Reps read their own rows (RLS).
- **The screen:** `<style id="cr-pay-styles">` + `<script id="cr-pay-script">`
  (last blocks in the file), `#payView` (display-shown, registered in
  `hideAllViews()` + `navRestore('pay')`), `window.CardinalPay`
  (`open`/`reload`/`close`). Menu: 💵 Commissions, after Crews. Admins: owed by
  rep, Pay net / Pay full (pay net marks draws repaid — amounts never mutated),
  Mark All Paid, week's payouts, paid history, CSV via `window.CardinalCsv`.
  Reps: the same screen renders **My Earnings**. Production: a worded refusal.
- **Gate:** `scripts/harness_pay.js` (53 assertions, executes the shipped code
  per role; run with `TZ=America/New_York` — the date-only-string trap is only
  visible in a negative-offset zone).

**Invariants:** the rep select is fed from the live roster — NEVER a typed
email (a typo'd `rep_email` orphans the row against nobody). Commission
amounts are never mutated after creation; deductions are repaid-draw rows.
`sales_rep` locks after the first collection (DB trigger; admin override).
Totals are summed from the rendered rows, never a second query (556's rule).

**Cross-rep visibility — proven live, not just read off the RLS text (9 Aug
2026).** Two fake jobs (one Nick's, one Joey's) were created with real
collections/commissions/draws, then queried under an actual authenticated
session per rep (real JWT claim, `authenticated` role — RLS fully engaged,
not the service-role bypass): each rep saw only their own rows across all
three tables; Theo saw both. All test rows deleted afterward. `commissions`
and `draws` enforce this with `rep_email = auth.email()`; `collections` with
`projects.sales_rep = my_email()`. This is a database boundary, not a UI
one — calling the Supabase client directly bypasses nothing.

### 651 — Finance as a collection source, and Theo's weekly owed email

Two small builds from Theo answering the spec's five open questions directly
(all five are recorded, settled, in `OPEN_ITEMS.md` — do not re-ask):

- **`collections.source` gains `'finance'`**, plus a free-text
  `finance_company` column (`commission_finance_source.sql`, applied). Not
  an enum — Theo: "we use service finance right now but will explore other
  financing," so a `financing_companies` table for one row would be the
  premature abstraction this project warns against. The Log Collection form
  pre-fills "Service Finance" as an editable default when Finance is picked;
  the Money In table shows "Finance — Service Finance". `commSourceLabel()`
  also fixed a pre-existing gap where Source rendered its raw enum value
  (`insurance`) instead of a label (`Insurance`) — Type already did this,
  Source hadn't.
- **`api/commissions-digest.js`** (new, mirrors `api/digest.js`'s Resend
  pattern exactly) emails Theo and Joan every Friday 11:00 UTC: what each
  rep is owed minus outstanding draws. "Owed" is `pending`/`approved`,
  never `paid`/`void` — the exact rule `groupOwed()` in `cr-pay-script`
  uses, exported from the API file too so the harness executes the real
  grouping logic, not a re-implementation. Sends nothing when nothing is
  owed (matches `/api/digest`'s own convention — no weekly "all clear"
  noise). Cron in `vercel.json`, alongside the existing daily one.
- **Gate:** `harness_pay.js` extended (58 assertions total) for the finance
  form/display; new `harness_commissions_digest.mjs` (24 assertions) mocks
  `fetch` entirely and executes the shipped `groupOwed()` + `handler()` —
  no live email is ever sent by the harness. Both negative-controlled
  against 650.

### 652 — the job menu learns Contracts, and the Approvals queue stops losing signatures

- **Contracts tile** on the Keeper job menu (fills the Punch Outs row;
  `data-jm="contracts"` rides the router's else-branch to `showTab`, the 607
  mechanism). The tab itself is unchanged.
- **`renderApprovals()` filter widened**: was Lead/Prospect-only, which
  permanently hid a signed estimate on any job whose stage had been advanced
  by hand first (the Joeseph case). Now any live stage qualifies; exclusions
  are Lost/Closed, `wf_approved`, `manual_value`, and — new — a job already
  carrying a contract document (`isContractTitle`). `approveAndContract()`
  is stage-safe (never writes stage) and prices from `estBest` (the
  estimates table), so a NULL doc total cannot zero the prefill.
- **Gate:** `scripts/harness_approvals.js` (15 assertions, executes the
  shipped function; negative-controlled on 651 — 5 red).
- Still true, unchanged, by design: **signed contracts set the Job Value**;
  signed estimates never do.

### 653 — five fixes picked straight off the CR Audit's finding list

Theo picked all five from the report's fix menu. Each patch is the exact
finding it closes; `docs/CR_AUDIT_2026-08.md` has the full evidence trail.

- **CR-AUD-001, Convert-to-Contract 404.** The functional `fetch` called
  `/api/estimate_to_contract` (underscore); the file on disk is
  `api/estimate-to-contract.js` (hyphen) — a rename where the caller never
  followed. One-line fix in `convertToContract()`, plus the setup-comment
  and the api file's own header, which both still said the old name.
- **CR-AUD-002, the Send toast that sends nothing.** `showOutput()`'s Send
  button used to flip `status:'sent'` and toast success with no mailer
  behind it. Now: resolves a recipient (the linked project's email,
  editable via prompt), builds a standalone HTML document from what's on
  screen (its own inlined module styles — the attachment opens outside the
  app's page context) and hands it to `/api/senddoc`, the same mailer every
  other document-send in this app already uses. The row is marked `sent`
  only after the send succeeds; a failed send re-enables the button and
  toasts the real error instead of a false success.
  **A second, load-bearing bug surfaced only by executing this for real in
  jsdom** (not caught reading the code, not caught by `check_build.py`):
  the pre-existing "Loading…" placeholder replaced `.cr-doc`'s *entire*
  innerHTML — which is also where `data-facts`/`data-items`/`data-totals`/
  `data-deposit`/`data-terms`/`data-ai-note`/`data-scope` live. Opening any
  saved estimate the normal way (`openOne(id)`, no `prefetched`) destroyed
  those nodes and then crashed on a null `.innerHTML` before the function
  ever reached the Send button's wiring — reproduces identically on 652,
  so it predates this build and would have made the new Send handler
  unreachable if left alone. Fixed by re-mounting the template after the
  fetch resolves, before the fields that depend on its structure run.
  Also: `showOutput()`'s select was widened to carry `project_id` — it
  lives on the row, not inside the `estimate` JSON blob, and was being
  silently dropped, which is why Send never had anywhere to default a "to"
  address from.
- **CR-AUD B1, the invite endpoint with no caller.** `api/invite.js`
  already created a real sign-in (not just a directory row) and has sat
  unused. Added as a second, explicit "📧 Invite (creates login)" button
  beside the existing "Add teammate" on the Team page — deliberately not a
  replacement, since a directory-only entry (someone whose login exists
  another way) is still a real case. Admin-gated in the handler itself. A
  random password is generated client-side and shown once to the admin to
  relay by text or call — nothing is emailed automatically, matching how
  this app already hands off draws.
- **CR-AUD-008, the 12 MB photo tap.** `renderGallery()`'s `<img>` now
  carries `loading="lazy"`. Separately, a new admin-only "📸 Migrate Legacy
  Photos" tool (`window.CardinalMediaMigrate`) moves the handful of
  remaining base64 `project_photos.data` and `projects.cover_image` rows
  into storage, one row at a time, never touching a row until its own
  upload succeeds — reuses `photoDb.add()`'s own upload recipe (fetch
  dataURL → blob → `sb.storage.from('photos').upload()` →
  `getPublicUrl()`) under the signed-in admin's own session, so it needs no
  service-role key and no server code.
- **CR-AUD-006/014, the invisible $28,727 claim.** Two causes, both fixed:
  `RAIL` (the insurance rail's bucket list, `cr-cth-script`) had no
  `'OnHold'` entry, so `compute()`'s `byKey[key]` lookup silently dropped
  any OnHold job from the bucket counts — its money still fed the summary
  tiles (a different code path), just not this bucket, which is what made
  it read as *missing* rather than *wrong*. Fixed by adding the RAIL row.
  Root cause upstream: the specific claim's project had `checklist: NULL`,
  so `projClaimType()` returned `'unknown'` and `insuranceProjects()`
  filtered the whole job out before RAIL was ever consulted — repaired
  live for the one affected record (Maker Space Solutions LLC / Devon,
  `bc024ad1…`) and closed at the source: `linkClaimToProject()` now sets
  `checklist.lead.claim_type = 'insurance'` on link if the lead doesn't
  already carry one (merge, not overwrite — `patchProjectCk()` is a
  shallow top-level replace, so the full `lead` object is read, mutated,
  and passed back whole).
- **CR-AUD B2/B4, two buried tools exposed.** `CardinalWalk` (the admin
  smoke-test runner, `cr-walk-script`, previously console-only) and a new
  read-only **iTel Lab Results** view (`window.CardinalItelLab`,
  admin-gated) both joined the banner `ROUTES` map beside `selfcheck`, per
  the audit's own suggested wire-up. The 28 real `itel_lab_reports` rows
  (none linked to a claim yet — the per-claim iTel card reads a different,
  empty table) are now visible instead of unread; the view says plainly
  that they're "not yet linked to a claim" rather than pretending a
  linkage exists. `cr-itellab` is registered in `hideAllViews()` (it is
  class-shown; unregistered would trap navigation).
- **Gate:** `scripts/harness_653.js` — P2, P3 and P5 execute the shipped
  code for real in jsdom (the estimate Send handler driven through
  `window.CardinalEstimates.openOne()` and a real click dispatch; the
  invite handler brace-matched and run directly; `compute()` run via
  `window.CardinalTruthHome.compute()` with a fixture OnHold claim); P1/P4/
  P6 are structural plus a real render of the new iTel view. 45/45.
  Negative control on 652: red on P1 (old endpoint name) and crashes
  identically on the pre-existing `.cr-doc` bug in P2 — confirming that
  bug predates this build rather than being introduced by it.
  `harness_approvals.js` re-run clean (15/15, no regressions). `harness_
  pay.js` re-run 57/58 — the one red is a TZ-dependent self-check inside
  the harness itself (this container's system TZ is UTC, not a
  negative-offset zone the control assumes), not a code regression; the
  actual `commDate()` assertion it sits beside passed.

### 654 — money tells one story (CR-AUD-003/004/013)

**`jobFinance()` is now THE value function; `projectValue()` is a view onto
it** (`return jobFinance(pr).value`). One precedence everywhere: signed
contract (docs total or contracts-table total, whichever is higher — never
both) + manual extras; else max(manual value, best SENT estimate across
the estimates table and estimate docs). The return carries
`source: 'contract'|'manual'|'estimate'|'none'` — the profile money strip
(`#jobValueSrc`) and the LJ pane label estimate-sourced numbers "from
estimate, no contract yet". **Settled and asserted:** a signed contract
wins outright over any estimate (Theo's recorded order, kept); the invoice
path (`createInvoiceFor` + the worksheet button) refuses
`source === 'estimate'` — invoices still require contract money.
`rptIsSigned` deliberately stays a stage proxy (zero signed contracts live;
real-signature keying would zero every report — revisit when contracts
flow). AR aging sums `jobFinance(p).balance` and drops fully-paid jobs.
The Estimates tile counts docs + sent table rows deduped on `doc_id`
(`estRows` store beside `estBest`, filled by `indexMoney()`;
`moneyDb.estimates()` fetches `doc_id`); the estimates tab names
table-only rows instead of looking empty. Gate: `harness_654.js` (31
assertions, money core executed over fixtures; negative-controlled on 653
— 20 red, reproduces the old $0-profile bug live).

### 655 — insurance repair + write safety (CR-AUD-007/009/010/011/012/014/015)

**`insurance_claims` now really has `coverage_type` (text) and `ord_law`
(boolean)** — `insurance_claims_coverage_cols.sql`, applied + backfilled
from checklists. `cr-iu-script`'s `unified()` overlays checklist values
over NULL table values; `shape()` preserves `ord_law === false` ("No").
The boot-path claims load selects **21 named columns** (every raw-cache
consumer inventoried: `shape()`'s 19 + `cr-sp`'s `supplement_notes` +
`cr-ic`'s `supplement_filed_at`) and waits for a session before its first
query — **widen the select if a new consumer reads a new column off
`CardinalInsurance.claim()`**. The Truth-hub rail's Tools box carries all
eight destinations (clients/sol/library/board + supplements/insresources/
adjusters/claims) — the static `data-ctnav` grid is pre-render display
only. `forProject()` keys claim-existence on `insurance_claims.project_id`
(as well as the projects-side pointer). **`INS_STAGE_LABEL` (main block)
is THE insurance stage vocabulary** — `CD_STAGE_LABEL.insurance` and
`IC_LABEL` are references to it; `cr-insstage`/`cr-ic` fall back through
`window.INS_STAGE_LABEL`; change wording in ONE place. Settled by Theo:
Closed = "Closed", Invoiced = "Awaiting Depreciation / Supplements",
OnHold = "On Hold". **`patchProjectCk()` refetches the checklist before
merging** — per-top-level-key last-write-wins now; the seven direct
checklist writers outside it are recorded follow-up. Gate:
`harness_655.js` (42 assertions, three areas executed; negative-controlled
on 654 — 33 red).

### 656 — the claim panel comes out of hiding; the tab strip stops jumping

**`#tab-overview`'s allow-list now has SIX exemptions**: `acxMount`,
`cr-pp-mount`, `solCard`, **`insCard`, `insDocsCard`, `insItelCard`**. The
last three had never been visible — each renderer sets a NORMAL inline
`display:block`, which loses to the rule's `!important`. **`#insCard` is the
only place Coverage Type and Ord. & Law render** (in `renderInsurancePanel()`,
behind the "More details" toggle), which is why they looked missing. iTel had
never rendered once since 406. **Keep this list and
`scripts/render_inscards.js` in step — the harness asserts the exact count,
and it sat RED from 641 to 656 because the fix it specified never shipped.**

**Insurance stage labels have a short twin.** `INS_STAGE_LABEL` is still the
vocabulary; `INS_STAGE_LABEL_SHORT` overrides *only* Invoiced
("Awaiting Depreciation") and both are read through
**`insStageLabel(s, short)`** — a fifth vocabulary cannot appear without going
through that function. Narrow furniture (the insurance client stage-filter
chips) passes `true`; the rail and everything else keep the full wording.
Measured in Chromium: 250px → 165px, strip back to 3 rows at 375–390px.

**The claims detail tab strip is two elements, deliberately.**
`.cr-c-tabwrap` sticks (`position:sticky; top:0`); `.cr-c-tabs.detail` inside
it scrolls (`overflow-x:auto`, `position:static`). **Do not collapse them
back into one** — an element that is both a sticky box and its own scroll
container jumps vertically when scrolled sideways, which is exactly what 656
fixed. Gate: `scripts/render_656.js` (Chromium, 17 assertions; the mount is
its own scroll container, so scroll THE MOUNT, not the window).

### 657 — one size router for the Scope of Loss card; claim fields; honest money

**`routeScopeToReader(file, btn)`** (main block) is the single size-aware door
for the Scope of Loss card. It delegates to `window.CardinalSolUpload.prepare()`
— under MAX_INLINE (3.1 MB) send bytes, over it upload to storage and read via
`extractFromUrl`. `readScopeOfLoss` and `readFiledScope` both go through it;
the latter converts its stored dataURL to a File first. **Anything over ~3.1 MB
posted inline never reaches the reader** (Vercel caps a serverless request body
near 4.5 MB) — that is why a 6.4 MB filed scope looked like a dead button.
⚠️ **There are FIVE `/api/sol` callers and a sixth is forbidden** (647 banner);
this is reuse, and `solRead` remains the one transport (648). `harness_657.js`
asserts `fetch('/api/sol'` stays at exactly one site.

**Two controls mention the Scope of Loss and only one reads it.** The
`#insDocsCard` slot FILES a copy (`uploadInsuranceDoc`); the `#solCard` READS.
Filing a `scope_of_loss` now offers the read immediately and says filing alone
does not update the claim; the slot button reads "File a copy".

**The claims screen shows and edits Coverage Type + Ord. & Law.** `ord_law` is
a **boolean** — `false` must render "No", and the modal select converts
''/yes/no to null/true/false. Writing the string refuses the whole row.

**`money(v)` beside `fmt()` in `cr-claims-script`**: `—` for null/undefined,
`$0` for a real zero. The four Financials cells use it. **Do not "simplify"
`fmt()` into it** — other callers want NULL coerced to 0.

### 658 — ordinance & law is TRI-STATE

**`ord_law` is `true` / `false` / `null` and the third state is load-bearing.**
`null` = not stated and **must never render as "No"** — that was Theo's
complaint and the reason for the build. Three writers used to manufacture
`false` from an absence (an untouched checkbox, a cancelled `confirm()`, a null
extraction applied); all three now preserve null.

- **`insOrdLawFromSelect(v)`** — the ONE `''`/`yes`/`no` → `null`/`true`/`false`
  conversion. Every control uses it (lead form, claim modal). Do not inline
  another.
- **`insOrdLawText(o)`** — the ONE formatter: "Not stated" / "No" / "Yes" /
  "Yes — <basis>, $<limit>". `cr-claims-script` carries a **correct** local twin
  (`ordLawText`) for standalone use — ⚠ its fallback must render `false` as
  "No", never as blank, or `kv()`'s placeholder turns a real No into "Not
  stated".
- **`ord_law_basis` / `ord_law_limit`** record what the document CALLED the
  coverage and its limit, because it goes by many names. `api/sol.js` lists the
  aliases (ordinance or law, law and ordinance, code upgrade, code coverage,
  code compliance, building code, Coverage D) and is told explicitly never to
  use `false` for "not mentioned".
- **A `<select>`, never a checkbox** — a checkbox cannot express "unknown", and
  that is exactly how the false answers got written. If you add an ord_law
  control anywhere, it needs three states.

### 659 — /api/sol answers in JSON, with room

**`maxOutputTokens: 8192` + `responseMimeType: 'application/json'`** on Gemini,
**`max_tokens: 4096` + `response_format: json_object`** on the OpenAI fallback.
⚠ **Keep both rungs in step** — 1024/1200 truncated a five-page scope mid-object
and the failure looked like gibberish, not like a limit.

**`/api/sol` is the ONE route that returns a `detail`** (the raw model reply on
a parse failure), so `solRead()` reads **`error || detail`** — the reverse of the
other ~19 fetch sites, deliberately. Do not "harmonise" it.

Failure modes now speak: `MAX_TOKENS` → "ran out of room, try just the scope and
totals pages"; unparseable → a sentence about the document; prose-wrapped JSON →
salvaged from the outermost `{…}` rather than refused.
Gate: `harness_659.js` — imports the real handler and drives it through every
shape; negative control covers `api/sol.js` too, not only `index.html`.

### 660 — Ordinance & Law is "BC — Building Codes" on a real scope

**On an Xactimate estimate this coverage is a CATEGORY CODE, not prose.** It
prints as `BC-Building Codes` with its own subtotal and often a dedicated
"Summary for BC-Building Codes" page. 658's prose aliases (ordinance or law,
code upgrade…) do not appear on these documents at all. If you touch the
`/api/sol` prompt, **do not drop the BC vocabulary** — it is the one that matches.

**Three amount fields, and they mean different things:**
- `ord_law_rcv` — the category's Item/RCV total: the carrier's full valuation of
  the code work.
- `ord_law_acv` — the same category's ACV/Net total. ⚠ **On Allstate this is
  LARGER than the RCV** because sales tax applies to code items. Never "fix" an
  ACV that exceeds an RCV here, and never collapse the two into one column.
- `ord_law_limit` — the **endorsement cap** (commonly 10% of Coverage A). A cap
  is not a scope amount; it renders labelled "cap".

**Line items are deliberately not stored** (Theo, 9 Aug): the scope PDF stays the
single source for granularity — a second store would drift on every supplement.
Code-driven items (ice & water barrier, upgraded sheathing, EPA Lead-Safe
practices pre-1978) are *evidence* the prompt uses, not rows the app keeps.

Gate: `harness_660.js` — runs the formatter on Gunn's real figures and asserts
the larger ACV renders as-is; negative control covers `api/sol.js` too.

### 661 — when the scope reader fails, it says which failure

**`/api/sol` is a MULTIMODAL route, not a text-extraction pipeline.** The PDF
bytes go to the model as `inline_data` and the model looks at the pages. There
is no `pdf-parse`, no `pdfplumber`, no text layer and no regex over plain text
anywhere in it. **Advice to "add OCR" or "use a layout-aware PDF library"
targets a stack this app does not have** — a flat scan is the case this
architecture handles best, not worst. Recorded here because it has been
proposed once already.

**Four causes stopped sharing one sentence.** 659's single "could not turn this
document into fields" answered for a refused document, an empty reply, a prose
reply and a document that never arrived. There are now three sentences, plus a
short labelled tail on every one of them:

```
[gemini · finish STOP · in 48210 tok · out 0 tok · reply 0 chars]
```

`readerDiag()` builds it. **It is not the 659 raw dump returning** — no model
text, fixed length, screenshot-sized. **`in N tok` is the load-bearing number**:
a 4.8 MB scope should ingest as tens of thousands of tokens, so a few hundred
means the document never reached the model and no prompt work would have helped.

**The retry.** An unparseable JSON-mode reply is re-issued once **without**
`responseMimeType`, at 659's token budget. `askGemini(jsonMode)` is one function
called twice — **do not add a second call site**. ⚠ **A `MAX_TOKENS` reply is
deliberately not retried**: dropping the JSON constraint makes the model narrate,
which is what filled the budget in the first place.

⚠ **`aiFallback()` sends a PDF as a `file` content part, not `image_url`.** Chat
Completions cannot read a PDF handed to it as an image, so from 505 until 661
this rung was decorative on the one route whose whole job is reading a PDF.
Images still go as `image_url` — both halves are asserted.

**Every error sentence must fit 250 characters**, because `solRead()` slices
there; the carrier's own message is capped at 150 before the diagnosis is
appended, so the diagnosis is never the part that falls off. Asserted in
`harness_661.js`.

Gate: `harness_661.js` (39) — imports the real handler and **counts model
calls**: one on success, one on a truncation, two on an unparseable reply.

### 662 — the model-backed routes have a duration, and the retry has a clock

**`vercel.json` now carries a `functions` block.** Before 662 it had none, so
every `/api` route ran on the Vercel default (10s Hobby / 15s Pro) — which a
multimodal read of a multi-page scope does not fit. The twelve routes that hand
a **document or image** to a model get `maxDuration: 60`; `ai-status` and
`coach` call a model but send no document and were deliberately left at default.

⚠ **60 is not arbitrary — it is the highest value valid on EVERY Vercel plan**
(Hobby caps there). Raising it further would deploy on Pro and fail on Hobby.

⚠ **A `functions` pattern that matches no file fails the BUILD, not the
request.** If you rename or delete an `api/*.js`, fix `vercel.json` in the same
commit. `harness_662.js` asserts every key resolves to a file that exists.

**The retry will not start a call it cannot finish.** 661 added a second model
call on the failure path; 662 gates it on
`elapsed() + firstAttemptMs < TIME_BUDGET_MS` (45s of the 60). The test is
"would a second call as long as the first still land inside the budget", because
the first attempt's own duration is the best estimate of the second's. Skipping
is reported in the message as `no 2nd try (time)`.

**This is a code guard, not configuration** — deliberately. If the `vercel.json`
block is ever lost or the plan caps lower, a retry that overruns turns a 502
carrying the diagnosis into a bare platform `HTTP 504`: the retry eating the
message it exists to produce.

**The diagnosis reports elapsed time** (`… · 47.2s]`) — a model that thought for
47 seconds and one that refused in 300 ms are otherwise identical on screen.

**Failure logging**: `console.error('[sol] unreadable reply', …)` fires on the
failure path only, carrying via / finishReason / blockReason / usage / ms and
500 characters of the model's reply. ⚠ **Never the document bytes** — asserted.
A successful read logs nothing.

**What does NOT apply to this route** (asked twice now, recorded once):
OCR, layout-aware PDF parsing, "narrow the prompt away from line items" (it has
never asked for any — 24 summary fields, measured), and Vercel's 4.5 MB request
body limit (657 routes anything over 3.1 MB through storage as `{url}`).

### 663 — `doc N.N MB`, and one place the diagnosis is built

**The tail's field order is load-bearing, not cosmetic.** `doc` prints
immediately before `in` because the two are read as one sentence:

| Tail | Means |
|---|---|
| `doc 4.8 MB · in 48210 tok` | the document arrived and the model ingested it — the fault is downstream |
| `doc 4.8 MB · in 400 tok` | we held the whole file; the model did not take it in |
| `doc 0.0 MB · in 400 tok` | the file never got here — look at the Supabase fetch and the signed URL |

⚠ **If `doc` is small, Vercel's request-body limit is NOT the suspect.** 657
removed it from this path: anything over 3.1 MB goes storage → server fetch →
base64 → Gemini, so the client never posts the bytes at all.

`docBytes` is set on **both** doors — the exact buffer length on the storage
path, derived from base64 length on the inline one.

**`readerDiag` has ONE definition and ONE call site**, through the handler's
local `diag(attempt, note)`. It reached four call sites and seven positional
arguments before this; a new field had to be threaded through all four by hand.
`harness_663` asserts the one-definition-one-call shape — **do not add a second
call site.**

**`solRead()` slices at 400, not 250.** The 250 was right at 659, when `detail`
— raw model output — could still land in that string. It cannot since 661:
every message is a written sentence plus a bounded tail, with the carrier's own
error capped server-side at 150. At 250 the tail was the part being cut.

**Pre-flight for testing a preview deployment**: `/api/ai-status` (optionally
`?model=`) reports whether `GEMINI_API_KEY` is present *in that environment* and
whether `OPENAI_API_KEY` is set at all. A preview without the key fails the read
for a reason that has nothing to do with the scope.

### 664 — the applied scope reaches the claim record

⚠ **`bridgeSolToClaim()`'s `CLAIM_COL` and the review modal's `fields` list GROW
TOGETHER.** Same rule as `STAGES` / `IC_SKIP` / `PIPE_SKIP` and `WO_TRADES` /
`TRADES` / `MONEY_TABS`: one grows, all grow. The map is an **allow-list** — a
path with no entry saves to the client profile and **silently** misses the
claim. That is what happened to `coverage_type` (655) and the five `ord_law`
columns (658, 660): four builds wired them into the modal, the claim edit form,
the formatter and the bounded select, and none into the writer.

**`harness_664.js` now fails on drift**, extracting both lists from the source.
Only three paths may be absent from the map — `date_of_loss`, `rcv`, `acv` — and
each is special-cased by hand immediately below it (a DATE-format guard and the
write-once `first_scope_*` baseline).

**658's tri-state survives the copy**: the skip drops `undefined` / `null` / `''`
but **not** `false`, so a deliberate "No" is recordable and an absence leaves the
column alone.

**Two stores, and they are written by different mechanisms** — worth knowing
before debugging this path:

| Store | How it is written | Keyed by |
|---|---|---|
| `projects.checklist.lead.insurance` | writes the **whole object**, splitting dotted paths into nesting | `{adjuster:{phone}}` |
| `insurance_claims` | the explicit `CLAIM_COL` allow-list | `applied['adjuster.phone']` |

⚠ **A fixture copied from the checklist row is the wrong shape for the writer** —
that nesting is the output. `bridgeSolToClaim` receives dotted paths. This cost
a false red while writing the harness.

### 665 — scope history (`scope_reads`)

**Every APPLIED Scope of Loss read is a row** — `extracted` (the model's
summary fields), `applied` (the ticked subset), money first-class, keyed to
claim + project. Shown newest-first as **section 4 of the claim screen's
Settle pane** (`renderScopeHistory()`).

⚠ **ONE writer: `logScopeRead()`** (main block, beside `bridgeSolToClaim`),
exported as `CardinalSolUpload.logRead`. Do not add a second insert site —
call the helper; `harness_665` asserts exactly one `from('scope_reads').insert`
in the artifact. It is **deliberately non-blocking** (warn, never throw): the
claim write already alerts on failure, and a trail that can veto the thing it
records is the wrong way round.

⚠ **Append-only at the schema: `scope_reads` has NO update policy.** That is
the point of an audit trail — do not "complete" the RLS by adding one.

**Deliberately NOT hooked** (each verified in source; a decision, not an
omission): `readScope` (cr-sol-script — renders, writes nothing),
`handleSolUpload` (cr-claims-fx — form prefill; the write is the human's
claim save), and `cr-ci-script read()` — the **AccuLynx CLIENT importer**
(`mode:'client'`, claim identity, no scope, no money; its rows here would be
noise).

`bridgeSolToClaim` **returns the claim id it wrote** — including on the
no-op path — so the apply chain logs history with no second lookup. Rows
carry no line items, ever: the 660 decision (the PDF is the single source of
granularity) stands.

`scope_reads.sql` is **applied** (9 Aug 2026); backfill seeded one row per
claim with a first scope on record.

### 666 — the scope review pre-ticks only EMPTY fields

`var tick = hasNew && !oldStr;` in `openSolReviewModal`'s row-builder.
**A field that already holds a value arrives UNTICKED even when the
extraction differs** — the difference still shows (`was: …`), the overwrite
is opt-in. This is Theo's settled pick (9 Aug) after an AI-transposed phone
digit arrived pre-approved and got applied over the correct stored number.
Empty fields stay pre-ticked (filling a blank claim is one Apply); identical
values stay unticked; `(not found)` rows get no checkbox; a stored `false`
is a **value**, not an empty; the notes row stays always-ticked because it
appends. Do not restore differs-means-ticked.

### 667–668 — The Supplement Desk (`supplement.html` + `api/supplement.js`)

**The one supplement system (CR-AUD-005 closed at the data layer).** Filings
are `insurance_supplements` rows; the claim's single-slot columns are a
**trigger mirror** (`supp_mirror_to_claim`, `supplement_desk.sql`) that
recomputes from the rows on every insert/update/delete, whoever wrote. ⚠ Do
not write the single-slot columns directly in new code — write rows. The
old cr-sp modal still writes slots directly; its values are overwritten by
the next row change, and that is the intent (rows are the source of truth).

⚠ **THE HONESTY CORE — do not weaken it.** In `api/supplement.js` the model
proposes gaps by `pack_id` ONLY; the citation string is copied server-side
from the PACK (21 entries extracted from the Supplement Templates page). An
invented citation is structurally impossible. `harness_667` pins every pack
citation to the library's own `rl-cite` spans. If you add a pack entry, its
citation must exist on that page first.

⚠ Quantities from measurements are computed **server-side** (`measQty`):
drip edge = eave+rake, ice barrier = eave, ridge vent = ridge, per-square
items = sq. Never let the model do this arithmetic.

⚠ **Quantities-only letters** (Theo): no dollar amounts; `dollar_flag`
warns, never silently edits. **Admin-only** at the ROUTE (403), not just UI.
**Nothing sends itself** — send is build 669's explicit-tap flow.

Letters at rest carry `[[PHOTOS:id]]` tokens; URLs are signed at
print/send only. The Desk is standalone (studio precedent), linked from the
insurance hub. `filing_type` ∈ partial_denial | backend | pwi_coc, NO
default (NULL = legacy/manual). `insurance_supplements.created_by` is NOT
NULL. `read_response` mode answers 501 until build 670.

**669**: the pack gained `repairability` (brittle test / repair-not-feasible,
OAC appearance rule) — the library card grew FIRST, then the pack entry, per
the pin. The Desk loads the claim's latest `itel_lab_reports` row and passes
a one-line summary to analyze; the model references the control number, never
re-derives the report. Hover note: `/api/hover` is the SIDING order flow; its
numbers do NOT reach `checklist.meas` (Roofr's do).

**670 — Code authority (`code_letters`, the Supplement Desk).** Building-official
letters, filed by **jurisdiction rather than claim**, so one letter answers
every future job in that town. Answering Theo's second question is what shaped
it: **Ohio has ONE residential code** — the RCO is adopted statewide and
administered by local departments, so a city/county letter is *never a second
citation*; it is proof of how the state section will be **enforced** at that
address. Hence `rco_sections` on every row (the state sections the letter
stands behind) and `local_amendment` expected NULL.

`holding` is the official's own sentence **verbatim** — the form refuses to
file without it, same reason `itel_lab_reports.status_sentence` is kept whole.
RLS mirrors iTel: any signed-in user reads, `is_cardinal_admin()` writes. Scans
go to `photos/code-letters/`. `insurance_supplements.code_letter_ids uuid[]`
records which letters rode along with a filing (filing-level, not per item).

**No new pack entry** — `tear_off` (RCO R908.3) already IS the cedar-shake
ground; a letter is evidence *beside* a ground. The seam copied is iTel's:
load, show on the card, hand a bounded summary (6 letters max, holdings sliced
to 400) to the analyst. The model may NAME a letter, never quote code from one;
the exhibit phrase is composed server-side and copied verbatim, like the 667
citations.

⚠ **`placeOf()`/`clHere()` SORT the list — they never filter and never tick.**
The addresses misspell their own city (a live row reads `Brookville, OH 45309,
USA, Brookeville, OH 45309`) and a neighbouring official is persuasive where he
is not binding. Statewide letters always mark, and read **"applies here"**, not
"this jurisdiction" — a render caught that overclaim; the assertions could not.

**671 — the Supplement Desk, repaired.** Nine defects in 667–670, found by a
13-agent audit and each re-verified by hand. Behaviour that changed:
`fileSupplement` keeps its button disabled after a successful file and retains
the row id (`S.filedId`); `created_by` is `null`, never `'desk'`;
`substitutePhotoTokens()` is the **single** photo-token substitution, shared by
print and copy, and emits **nothing** for a gap with no photographs;
`codeAppendix()` prints the ticked building-official letters verbatim so the
letter's enclosure claim is true; `pwi_coc` is a **disabled** option until it
has its own build; `explainEmpty()` distinguishes an empty database from a
record refusing.

⚠ **`.pill` is shared by TWO renderers with TWO vocabularies** — `loadClaims`
renders `insurance_claims.supplement_status` (filed/approved/partial/denied),
`loadFilings` renders `insurance_supplements.status`
(submitted/draft/withdrawn/approved/partial/denied). Both sets are now defined.
Do not "unify" them; they are different columns.

⚠ **`supp_mirror_to_claim` orders by `responded_at, filed_at, updated_at, id`.**
The first two are `date`, so they tie on same-day decisions — the last two are
what make the result deterministic. **Do not drop them as redundant.**

⚠ **`is_cardinal_admin()` (the Desk's door) and `is_full_access()` (the claims'
door) are different sets** — `audit@` passes the first and fails the second, and
sees 0 of 5 claims. That is correct behaviour, explained in the page. It is NOT
a reason to make the mirror `SECURITY DEFINER`: `insurance_claims`' SELECT and
UPDATE policies are byte-identical, so anyone who can load a claim can mirror it.

**672 — send from the desk.** The Supplement Desk emails the letter to the
carrier. **No migration** — `sent_at`/`sent_to` existed since 667, unwritten.

`api/senddoc.js` gained three OPTIONAL names — `subject`, `variant`, `replyTo`.
⚠ **Both pre-existing callers must stay byte-identical**, and `harness_672`
proves it *differentially*: their exact payloads run through the old and new
handler and the Resend JSON is compared field by field. ⚠ **Never fold `subject`
into `title`** — `title` also drives the attachment filename (`safeName`) and
the homeowner body sentence, and caller 2 sends the literal `'Estimate'`.
The `is_cardinal_admin` gate fires **only** for `variant:'carrier'`; the two
client-facing callers keep the session-only gate on purpose.

Desk side: `syncSend()` (four states — sent / not filed / no address / ready),
`renderForSend()` (signs exhibits, returns the count that actually **resolved**),
`recordSend()` (separate, so a failed writeback retries **without re-sending**).

⚠ **`EXHIBIT_TTL` is one year, not `PHOTO_DOC_URL_TTL`'s ten.** Deliberate: a
carrier intake address is not a homeowner's own report, and the archive
re-renders from tokens. One constant.

⚠ **The archive is captured at SEND time, not file time** — the letter stays
editable after filing, so file-time capture can differ from what was mailed. It
stores `[[PHOTOS:id]]` tokens, never live signed URLs.

⚠ **Mail leaves before the row is written** — no transaction spans Resend and
Postgres. A writeback failure is loud, names the address, and its retry is a
save. Do not "tidy" it into a catch.

**673 — `openStoredFile(dataUrl, mime, tab, label)`.** The single way to put a
stored file on screen. Decodes to a Blob, `createObjectURL`, navigates a tab.
Consumers: `openJobFile()` and the Measurements report viewer.

⚠ **NEVER put a `data:` PDF in an `<iframe>`** — iOS Safari renders it as one
non-scrolling page. A 31-page Hover report arrived as its cover sheet, and
desktop Chrome scrolled it fine, so it only failed on the device Theo uses.

⚠ **Open the tab INSIDE the tap.** `window.open()` after an `await` is a
non-gesture popup on iOS and is blocked. Callers open the tab synchronously and
pass it in; the helper only navigates it, and closes it on failure. The same
rule is documented at `index.html:31673` (work orders) and `:54780` (library).

⚠ **Uploading a Hover report under Measurements FILES THE PDF AND NOTHING
ELSE.** `/api/hover` is called only from the siding material-order import
(`index.html:16247`). Nothing writes `checklist.meas` from a Hover upload.

**674 — Hover fills the measurements.** `aerialMerge(all, d, source)` is THE
merge for aerial/photo reports into `checklist.meas`; `roofrMerge(all,d)` is a
wrapper for the 554 caller. Doors: the Measurements upload
(`importMeasFrom(pr, source, file)`) and the material-order import.

⚠ **`/api/hover` returns roof AND siding.** Roof keys deliberately match
`/api/roofr`'s so one merge serves both. Siding keys unchanged — the material
order reads exactly what it read before (differentially asserted).

⚠ **The source label names the MIXTURE.** 554 hardcoded `'Field + Roofr'`,
which was a lie as soon as a second importer existed. Never restore that shape:
if the previous source is not ours, the label is `prevSrc + ' + ' + src`.

⚠ **Filing the PDF and reading it are separate, in that order.** A failed read
must never present as a failed upload — the document is already saved.


**674 amended — read against the real Hover report.**
⚠ **`ftIn()` converts feet-and-inches IN CODE.** Hover prints `118' 9"`; a model
asked to convert returns `118.9`, wrong by two inches. Never ask the model for a
converted number — ask for the string as printed. Verified against Hover's own
arithmetic (eaves + rakes = the printed Drip Edge/Perimeter, to the inch).
⚠ **Hover reports Ridges / Hips COMBINED.** `meas.ridgehip` carries it; ridge and
hip stay null. Do not split it — the report gives no basis. The panel shows one
row labelled *(combined, as reported)*.
⚠ **`meas.pitches` keeps the whole pitch table.** On Gunn: 9/12 81.19%, 5/12
15.34%, 2/12 3.46%. The 2/12 area is LOW-SLOPE (RCO R905.1.1, a pack entry) and
the 9/12 area is steep — both are supplement lines the predominant pitch hides.
⚠ **The siding keys name Hover's actual table and column.** A real report offers
four "siding area" totals differing by ~500 ft²; the prompt must say which.

---

### 675 — the insurance hub leads with Insurance Clients

`render()` in the Cardinal Claims hub (`#cardinalTruthView`). Theo's ask,
verbatim: *"The insurance client list is down at the bottom and should be at the
top. Can we swap the chase list for the insurance client button?"*

| | before (674) | after (675) |
|---|---|---|
| directly under the figures | the **chase list**, usually empty | **Insurance Clients**, full width, with the claim count |
| between *This week* and *Tools* | — | the **chase list** |
| in the Tools grid | Insurance Clients (8 tiles) | 7 tiles — the tile MOVED, it was not copied |

⚠ **It is not "the top of the screen" and the PR says so.** The owed figure and
the stat cards still come first; the button is the first thing after them, at
606px on a 390px phone. That is what "swap the chase list for the button" means
geometrically, and overstating it would be a claim no measurement supports.

⚠ **No new component — reuse `.cr-cth-tools`.** Three declarations only:
`.cr-cth-tools.lead{margin-top:14px}`, `.cr-cth-tools.lead{animation-delay:.14s}`
(its entrance is pulled forward now that it sits near the top), and
`.cr-cth-tools button.wide{grid-column:1/-1}`. `wire(host)` binds `[data-go]`
across the whole host, so a moved button needs no rewiring.

⚠ **The page is 87px taller and that is expected.** Seven tiles in a two-column
grid still needs four rows, so removing one freed no height in Tools while the
new full-width row added one. `render_inshub.js` bounds the growth to about one
button row — the assertion that it "did not grow" was mine and was wrong.

⚠ **Render the hub into `#cardinalTruthView > .ins-body.cr-cth`, never a bare
div.** 21 of the hub's rules are scoped to that id, the ground among them. And
wait ~1.4s before screenshotting: the cards enter at `opacity:0` under
`crCthRise` with up to `.68s` of stagger, so an immediate shot is blank and looks
like a rendering fault.

---

### 676 — the app no longer opens on a screen of scattered emoji

Not a feature; a first-paint fix, recorded here because the trap it names will
recur in a 3.86 MB single-file app.

⚠ **Markup near the top + its stylesheet near the bottom = it paints raw for the
whole download.** `#crBanner`'s markup is at line 3305; the stylesheet that lays
it out is at 51368. Anything you add high in the document with styling low in it
is visible, unstyled, for as long as the file takes to arrive.

⚠ **Unstyled emoji show; unstyled text does not.** Emoji are colour glyphs and
paint in their own colours whatever `color` says. That is why the flash was a
scatter of pictures with no words — and why "no text is visible" does not mean
"nothing is visible."

⚠ **Hide it with the CASCADE, not a script.** The head rule sets
`#crBanner{display:none}`; the later `cr-banner-styles` rule has identical
specificity, comes later, and restores `display:flex`. No boot flag, nothing that
can strand the element hidden if boot fails. If you add a hiding rule, put it in
the head block that already exists and let the module's own sheet undo it.

⚠ **Startup speed is a SEPARATE question and was not changed.** `sw.js` serves
navigations network-first, so every launch re-downloads the full document. That
is deliberate (a fresh deploy lands on the very next load). Do not switch it to
stale-while-revalidate as a "performance fix" without Theo — the cost is that the
first launch after a deploy shows the previous build.

**Tools:** `render_bootflash.js` (11 assertions — mid-parse vs loaded cascade,
plus the real throttled first paint; red on 675). `filmstrip.js` /
`filmstrip2.js` in the session scratchpad are the reproduction: serve the
artifact over HTTP, throttle, screenshot from navigation start, hash frames to
find the distinct painted states.

---

### 677 — the app opens from the phone (`sw.js` + the update bar)

Navigations to `/` are **cache-first with a background revalidate**. Measured on
one throttled wire: second launch **4,302 ms → 424 ms**.

⚠ **ONLY `/` is served from cache. Never widen this.** An iframe load IS a
navigation (build 562 learned it the hard way, with `/ai-field-manual.html`
overwriting the shell). The cache key is the literal string `'/'`, so serving any
other path from `caches.match('/')` hands back the app in place of what was
asked for. Every other navigation stays network-first, in its own branch.

⚠ **The staleness is real and must never be silent.** The launch after a deploy
shows the previous build. The worker compares the revalidated copy's
**ETag → Last-Modified → Content-Length** against the cached one and posts
`cr-shell-updated` when it differs; the page shows a bar with one tap to reload.
If you ever remove that message, put something in its place — `CLAUDE.md` records
that a stale app has **twice** been misdiagnosed as "the fix didn't work."

⚠ **Nothing reloads automatically, by decision.** Theo may be mid-estimate.

⚠ **The update bar carries its own inline styling** — it must not depend on a
stylesheet (that is build 676's bug) and must not route through `toast()`, which
is defined six times here with three signatures.

Unchanged and load-bearing: Supabase and `/api/*` never intercepted · CDN
libraries cache-first forever (no lockfile, no test runner) · the offline "No
signal" page · `CACHE` still `cardinal-shell-v1`.

**Tools:** `harness_677.js` (33 — executes the real fetch handler against mocked
caches; red on 676 across 11). `render_launch.js` (5 — installs the worker in
Chromium and times a real second launch).

⚠ **`render_launch.js` throttles at the SERVER, and must keep doing so.** CDP
`Network.emulateNetworkConditions` does **not** throttle fetches issued inside a
service worker, so a CDP-throttled comparison passes on a network-first worker
and proves nothing. It also stamps the outgoing document before navigating,
because an un-awaited `goto()` lets the first sample read the *previous* page.

---

### 678 — the retired welcome screen stops flashing up

The old post-login landing (lightning-bolt cardinal, "Welcome back", four cards)
is still in the markup at ~4040 and is retired by `#landingView>*{display:none}`
in `cr-lr-styles` at ~43270. `showLanding()` is called from a script at ~13277,
so between those two points the retired screen is what the app shows. One rule in
the head block fixes it, exactly as 676 did for the banner nav.

⚠ **Do not delete the dead markup.** Six ids — `landName`, `landDate`,
`landQuick`, `landDash`, `landClaims`, `landLibrary` — are read at ~30 sites,
several inside `showLanding()` itself. Deleting turns a cosmetic flash into a
boot-time `TypeError`. If you ever do remove it, remove the readers first.

⚠ **A marker must name what the build ADDED.** `#landingView>*{display:none}`
already existed in `cr-lr-styles`, so `check_build.py`'s negative control found it
in the previous artifact and refused. Use something unique to the new lines.

⚠ **Never write a literal style tag inside a CSS comment** — the tag-balance gate
counts it and reports a phantom duplicate block. This is written at ~3105 already;
678 tripped it anyway.

**Tools:** `render_bootflash.js` now covers both flash surfaces (15 assertions,
red on 677 for the landing pair).

---

### 679 — the Desk gets a door, the job name stops following you, the map stops crashing

⚠ **`#cardinalTruthView`'s STATIC `.ins-grid` is dead markup.** The hub's
`render()` does `host.innerHTML` on `#cardinalTruthView .ins-body`, which
contains it. **Anything you add to that grid is destroyed on first paint.** New
insurance destinations go in the DYNAMIC Tools grid in `cr-cth-script`, with a
`data-go` and a case in `wire()`. 655 learned this; 668 forgot it and the
Supplement Desk was unreachable for six builds.

⚠ **`setHeaderJobMenu(on)` owns the job identity in the header** — the
`projopen` class AND both `#headCtx` / `#cbCtx`. `openProject()` writes the same
string into both; only this function clears them. If you add a third place the
job name is shown, clear it here too.

⚠ **`showCardinalTruth()`, `showInsuranceClients()` and `showResourceLibrary()`
do NOT call `hideAllViews()`** — they hide siblings by hand. Any teardown that
must happen when leaving a job has to be added to all three explicitly. They now
call `setHeaderJobMenu(false)`.

⚠ **Google Static Maps returns OCEAN for an address it cannot geocode**, not an
error — so a blank blue map means the address is incomplete, not that the map is
broken. `addrLooksIncomplete()` flags an address with no comma and no ZIP; the
note sits BESIDE the map, never instead of it.

⚠ **Never open an external URL with `window.open(…, '_blank')`** — an installed
PWA has no tab to open into and iOS blanks the web view. Use a real
`<a target="_blank" rel="noopener">`, or `location.href` for a same-origin page.

⚠ **A community client card can reach the Community hub** via `.cc-out` →
`CardinalCommunityHub.show()`. `#cr-cc-return` is a DIFFERENT control — it
returns you TO the card after a sub-tab, and is not a way out.

**Tools:** `harness_679.js` (31 — executes `setHeaderJobMenu`, `wireOut` and
`addrLooksIncomplete` against the two real addresses; red on 678 across 17).
`harness_location.js` now carries the map helpers in its sandbox and asserts the
anchor contract. `render_inshub.js` asserts the Tools grid kept every
destination rather than pinning a count.

### 680 — the claims screen answers its own screen (`cr-claims-script` + `api/sol.js`)

**`.empty` is two classes wearing one name, and it always was.** The unscoped
rule in the first `<head>` block is the standalone empty-state **panel**
(`background:var(--paper); border:2px dashed; padding:44px 24px; text-align:
center`) and has **16 legitimate users** — `<div class="empty">No estimates
yet.</div>`. Six other surfaces use `empty` as a **modifier meaning "this field
has no value"**, and the module rules for those only ever set `color` and
`font-style`, so the panel's geometry came through untouched. Renamed to
**`novalue`** at source on all six; the global rule is byte-identical and its 16
users are asserted still working.

| Surface | Selector (now) |
|---|---|
| Claim Details card on a client profile | `.insPanel .insGrid .val.novalue` |
| The claims screen — the one Theo photographed | `#cr-claims-mount .cr-c-info-item .val.novalue` |
| Adjuster directory | `#cr-adjusters-mount .cr-a-info-item .val.novalue` |
| Community partner attach bar | `.cr-cp-attach .val.novalue` |
| Community property attach bar | `.cr-cprop-attach .val.novalue` |
| Contract/estimate viewer — **no emitter today**, renamed so the trap cannot be walked into | `#cr-ce-view .ce-kv .v.novalue` |

⚠️ **`.cr-photo.empty` is NOT one of these and must stay a panel** — an empty
photo slot legitimately wants the dashed box and declares `border-style:dashed`
leaning on the global rule for the rest. `render_emptyclass.js` asserts it
survives, so a "fix" that deleted the global rule goes red.

**Two date labels stopped colliding with the status chip.** `Filed` and
`Approved` are two of the nine `STATUSES` rendered as a chip at the top of the
same pane; they were also the labels on `filed_at` and `approved_at`. Now
**`Date Filed`** and **`Date Approved`**, with placeholders naming what is
absent.

**`approved_at` had no writer, at all, ever.** It occurred **exactly once** in
the artifact — at its display line. No input, no line in the save payload, so a
real `date` column read "Not yet" on every claim permanently. **The same defect
as 646's `adjuster_company`**, one field over. Both halves shipped.

**Cause of Loss now comes off the scope.** `api/sol.js` never asked for it, so
`populateFromSol`'s mapping (`first(ex.cause_of_loss, ex.cause, ex.peril)`,
present since the module shipped) read a key that never arrived. The prompt now
requests it **constrained to the seven tokens `CAUSES` offers** and is told to
return null rather than guess. Whitelist discipline, same as `STAGES`: a value
outside the list matches no option and fills nothing.

**Job and Contract are no longer the same function.** Both panes were
`return renderLinkedStrip();` — every card under both tabs, both blank together.
`renderLinkedStrip(only)` now takes an **optional** filter; the header strip
still calls it bare and still shows all three. Job = the project, Contract = the
estimate and the signed contract, each with its own empty-state sentence.

**Tools:** `render_emptyclass.js` (3 assertions, **Chromium** — finds every
compound `.empty`/`.novalue` selector, rebuilds its ancestor chain and reads the
computed style; scans **both** names so a rename cannot hide a surface from its
own test; red on 679 naming all six). `harness_680.js` (35, all executing shipped
code — `paneClient`, the save-payload builder against a stand-in modal,
`renderLinkedStrip`, `paneJob`/`paneContract`; asserts the sol.js prompt against
`CAUSES` *itself*; red on 679 across 18). `render_claimpane.js` repaired — it
re-implemented `kv()` and probed a hardcoded class, so it reported `null` after
the rename; it now lifts the real `kv()` from the artifact.

### 681 — the Schedule Board reads, and `CardinalIcons` is born

**`.viewhead` is an app-wide class with 15 users**, and its base ink was
`#1c1416` — a near-black for a white page — on this app's near-black default
ground. **1.10:1 in dark.** Build 527 themed this board's *cards* and never
touched the heading. Now `var(--rbe-head,#ffffff)`, the app's own heading token
(`#ffffff` dark / `#161616` light), already used by `.hero-hi` and `.acthead`.
**19.89:1**, and all fifteen pages benefit. Every CRM override still
out-specifies the base rule — verified, not assumed.

Second defect, found only because the rig was fixed to see gradients: 527's
`.bhead` pink `#f08a90` was scoped **by CRM but not by theme**, so it landed on
light mode's white card at **2.30:1**. Dark is byte-identical; light restored.

**`window.CardinalIcons` — `get(name, cls)` → an inline SVG string.** NOT a new
mechanism: the CRM-switcher marks have used `viewBox 0 0 24 24` + `fill:none` +
`stroke="currentColor"` + `stroke-width 1.75` since they shipped. Same
attributes, shared `.cri` class sized in **`em`** (vs `.cr-pmark`'s fixed 14px)
so one class serves a 23px heading and a 12.5px row. Four glyphs so far:
`calendar`, `hammer`, `truck`, `building`.

**The rule for the sweep:** icons where the eye SCANS (headings, list rows,
nav, eyebrows); in **prose** the emoji is **deleted**, not converted.

⚠️ **`metallicize()` (17725) is the inventory instrument for 682**, discovered
here: it walks the DOM at load, wraps every emoji text node in
`<span class="mic">`, and re-runs on mutation. A runtime census beats a static
grep — and it is the only thing that reliably catches the **HTML-entity** form
(`&#128197;`), which is what all 15 `.viewhead` headings actually use.

**Tools:** `render_schedule.js` (27 assertions, Chromium — loads the REAL
document rather than concatenating `<style>` blocks, walks ancestors for the
true ground **including gradient stops**, and asserts contrast, zero surviving
emoji over rendered text, icons drawn, stroke == parent `color`, em-sizing;
**8 red on 680**).

### 683 — the home client cards go dark (`projCardHtml` / `.pcbadge`)

The eight stage pastels are **`.stagechip.stg-*`** now, never bare `.stg-*` —
the bare form painted every home client card pastel in both themes, because
the card wears the same class for its `--stgc` spine (BUG_CLASSES 27 shape;
544's banner predicted it verbatim). Card ground restored to the
`--rbe-bg1/bg2` gradient. `.pcnm` gradient text → `var(--rbe-head)`
(12.71:1). `.pcad`/`.pcmeta` → `--rbe-mute` (2.69 → 4.82:1 dark). Light
Call/Text → `--rbe-accdk` scoped (6.72:1). **Tools:** `render_pcard.js`
(12 assertions, Chromium, alpha-compositing grounds; red ×10 on 682).
⚠ Its grounds() COMPOSITES translucent layers — copy that, not the naive
opaque-rgba version, which false-reds 544's chips at 1.54:1.

### 684 — What's New is everyone's again (`cr-cl-script`)

Build 600's owner-gate reversed at all three sites (menu item, `show()`,
`autoShow()`) — its reason (a stale changelog) has been false since 585.
`show()`/`autoShow()` now require only a signed-in `window.currentUser`. The
box header: gradient + dark-on-red + 🎉 → solid red, white text, no emoji
(both settled rules). The once-per-build popup mechanism (localStorage
last-seen) is unchanged.

### 685 — no gradient-clipped text anywhere (app-wide)

37 sites removed, each to a single solid colour measured against the exact
ground it sits on, in both themes. Families: 8 were already a fade between two
identical stops (`--rbe-head` → `--rbe-head`) and are a provable no-op; 6 client
names follow 683's `.pcnm` precedent to `var(--rbe-head,#ffffff)` (12.71:1 dark
/ 17.34:1 light); 4 PO labels take Theo's approved pick C via a retargeted
`--rbe-po2` (`#d8a94f` dark / `#8f1620` light, 5.87 / 8.73). The rest use their
own declared fallback or their own gradient's best stop.

`.mic`'s `@supports` rule is deleted (inert since 682). `--rbe-po1` is gone —
it had no references left. The login tagline's inline `color:#7a4a3e` was
removed so the card's rule governs; it had been masked by the gradient.

**Do not re-introduce gradient text.** Chromium's parsed-rule count is the
instrument (`render_gradtext.js`); a text regex over the file finds one extra
hit that is a comment.

### 686 — the navigation is drawn, not emoji (`CardinalIcons` + `hydrate`)

The burger menu, the New menu and the Settings rows: 28 rows, each now a line
icon that inherits the row's colour and size. `CardinalIcons` grows 4 → 27 (and to 43 at 692)
glyphs and gains **`hydrate(root)`**, which swaps a `data-cri` attribute for the
drawn glyph once and removes the attribute, so re-running is free. Static markup
therefore uses the same registry as JS-built markup — one icon set, not two.

⚠️ `cr-hd2-script`'s `build()` **rebuilds `#navBtn`** and overwrites its
innerHTML on every load. It now calls `CardinalIcons.get('menu')`. If you
convert a header control and it still shows an emoji, that function is why.

**Scope is deliberate.** Emoji in PROSE are deleted, never converted (the 681
rule); none was touched here. Emails, push, letters, `popup.html`,
`drivewaytest.html`, the Showcase and the CHANGELOG remain out of scope. 533
pictographic emoji remain elsewhere in the app — `scripts/render_navicons.js`
covers this slice and goes RED on 685.

### 687 — the three rejected icons

`hammer` → **`ladder`** (a claw hammer is illegible at 13px — the claw is the
tell and it does not survive one stroke weight; six attempts all read as a
screwdriver or signpost). `building` → **`group`**, three figures, because a
building never reads as a *team* however well drawn — and deliberately distinct
from the two-figure `people` used for Clients. `hardhat` redrawn with two ribs
over the crown; the 686 version's crown box read as a bag handle.

Both are renames, not aliases — one name per glyph. `KIND_META` was the only
caller of each. `hardhat` keeps its name because markup reaches it through the
`data-cri` attribute rather than `get()`.

⚠️ **Ship an icon with a rendered contact sheet.** 686 was 195/195 green and
still shipped three wrong icons. Assertions prove an icon is *drawn, coloured
and sized*; they cannot tell you it is a picture of the wrong object.

### 688 — Suppliers (was ABC Supply)

The menu row is a **category** now: `data-nav="suppliers"`, warehouse icon, and
the sheet is titled Suppliers with **ABC Supply as a card inside it**. A second
yard is a second card, not a second menu row. The ABC integration itself is
unchanged and still switched off until its two keys are set in Vercel.

⚠️ **Two doors lead here** — the main menu row and the Tools dropdown's "Supply"
entry (`.cbi[data-go="abc"]`). Both carry the name; rename both or the feature
grows a second identity.

⚠️ **`cr-lnav` derives its icon key from the button's TEXT** (`iconKey()`
lowercases and strips non-alphanumerics). Renaming a nav label therefore
silently changes which icon the desktop left nav looks up. Move the key in both
of its maps at the same time. This bit 688 and will bite the next rename.

Gate: `scripts/render_suppliers.js` — opens the real sheet and checks the title,
the card, the moved env chip and that all three account fields plus the
catalogue search survived inside the card. Goes RED on 687.

### 689 — readable calendar titles, obsidian client cards

`.pipecard.teamcal .pipetitle span:first-child` had **no theme gate** and pinned
both big calendar titles to `#1c1416`: **1.06:1** on the dark card. Fixed by
dropping only the colour (the rule also carries the title's font).

The client cards (`.pcard`, all of which are also `.pcbadge` — one creator) now
use the **named** obsidian recipe. ⚠️ Obsidian has two behaviours: `#cr-est-view`
/ `#reportsView` are black in both modes (545); `.actbox` has a light twin (557).
The cards follow `.actbox`, per Theo. `.pcini` and `.pcacts a` are raised keys.

⚠️ **`#calCard` is dead markup** (`display:none !important`). The live calendars
are `.pipecard.teamcal` and `.prodcal`.

Gate: `scripts/render_calhead.js` — prints ink, composited ground, ratio **and
the winning rule** for every heading and legend in both themes. RED on 688.

### 690 — pipeline stage chips on All Leads & Jobs

A scrolling chip strip above `Results (n)`: **All** plus one chip per stage that
has rows, each with a count and a dot in that stage's `LJ_SOLID` colour.
Multi-select; **All** clears.

⚠️ **This is NOT a new filter.** It writes `ljState.sets.stage` — the same array
the desktop rail checkboxes and the funnel sheet write, honoured by
`ljMatches()`. Three controls, one source of truth, one `renderLeadsView()`.
**Do not give the strip its own state.**

The funnel icon stays and still owns Assigned To / Job Priority / Job Category.

⚠️ `OnHold` is in `STAGES` but absent from `LJ_SOLID` / `LJ_INK` / `LJ_SPINE`;
everything falls back to `#8a93a1`. Don't "fix" it by inventing a colour — the
stage palette is on the semantic frozen list.

Gate: `scripts/render_stagechips.js` — seeds real project shapes, calls the
shipped render, then clicks the chips and counts cards. RED on 689.

### 691 — Assigned To beside Milestone on All Leads & Jobs

Two labelled chip strips. `ljChipStrip(gkey, mountId, wrapId)` renders either;
one `ljChipClick` serves both and reads its group from the container's `data-g`.
**Adding a third group is two lines of markup and one call** — do not copy the
renderer.

Groups **AND** across each other (Lead + Joan = Joan's leads) and **OR** within
one (Lead + Prospect = both). That is `ljMatches()`'s existing behaviour, not
new logic.

⚠️ A strip with **fewer than two values hides itself**, heading included.
⚠️ Only `stage` carries colour dots — no other group has a palette, and the
stage colours are on the semantic frozen list.

Theo's scope call: Assigned To is the only other group he filters by. The
remaining five (Job Priority, Job Category, Work Type, Trade, Lead Source) stay
behind the funnel **by decision**.

Gate: `scripts/render_stagechips.js`, 54 assertions, expectations self-computed
from the seed. RED 20/54 on 690.


### 692 — drawn icons on the sales, insurance, community and import screens

37 emoji become drawn glyphs across `cr-sf-script` (Sales Floor), `cr-cth-script`
(the insurance hub), `cr-ch2-script` (the community hub) and `cr-ci-script`
(Import from AccuLynx). `CardinalIcons` grows **28 → 43**.

**The fifteen new glyphs:** page, books, pencil, scales, bulb, factory, trophy,
cards, camera, image, paperclip, compass, calculator, houses, funnel. Nine
existing ones are reused (target, home, shield, calendar, person, clipboard,
people, chart, bolt) rather than redrawn.

⚠️ **These call `CardinalIcons.get()` at render time. They do NOT use
`data-cri`.** 686's attribute is swapped by `hydrate()`, which runs once at load
and again on DOMContentLoaded — and these four modules build their panels as
strings when the user opens them, long after that. A `data-cri` written at
render time is never hydrated and the row shows nothing at all. Each module
carries a local `ICO(n)` that wraps `get()` in a try/catch.

**The gate is `render_icons692.js`** (38 assertions, both themes). It opens all
four surfaces through their real exports and checks the glyphs have a non-zero
box and a resolved stroke — structure alone cannot see this, because `ICO()`
swallows its own error and returns `''`, which renders as nothing. It also
asserts no swept emoji survived. Negative control on 691: 26 failures.

⚠️ **Scope the survivor check to the container the module owns.** Checking
`cardinalTruthView` wholesale reports four survivors (📝🏠📎📋) that are
provably absent from `cr-cth-script` — that view also hosts panels from
`cr-cct`, `cr-ctfx` and the static markup, which keep their own emoji.


### 693 — Sales Floor has a light theme (it never did)

`cr-sf-styles` was hardcoded dark: zero `var()` references, zero `rb-light`
rules, so the app-wide switch did nothing to it and both themes rendered
byte-identical. Sixteen `--sf-*` tokens now carry it, dark declared on `#cr-sf`
and light under `:root[data-theme="rb-light"] #cr-sf`, every reference with a
literal fallback.

**Semantics are frozen across both themes** — the module's banner is law here:
red is the objection, navy is your answer. The navy fills (`#1F3A6E` hero,
`#16233b` .you card, `#2C5FA8` spine) and the cardinal rail (`#C8202E`) are the
same bytes in light and dark.

⚠️ **`.cr-sf-cr .you` keeps `color:#f0ede7` as a literal, on purpose.** It is
the one ink of twelve sitting on a coloured ground. Tokenising it puts
`#17181a` on `#16233b`.

**The one inversion:** `--sf-red-tx`. Which red can carry type depends on the
ground — `#e8505c` is 5.30:1 dark / 3.26:1 light, `#C8202E` is 3.28:1 dark /
5.15:1 light. Both reds already belonged to the module.

Gate `render_sflight.js` (11 assertions). Its first two check the themes
DIFFER, which a contrast harness cannot: a module that ignores the switch
passes every contrast check because it is only measured against the ground it
was designed for.

### 694 — the light/dark switch is reachable again

`#cr-dark-toggle` is ONE button with two placements: adopted into the header
search row by `ensureSearchRow()`, or floating bottom-right. It had gone
missing on Sales Floor (and every full-screen view) and on insurance.

| Cause | Detail |
|---|---|
| `crmNow()` | returns `'sales'` / `'production'` on those screens, and `refreshVisibility()` only added `.show` for retail/community |
| the header row | is painted over by every `z-index:9500` full-screen view |
| insurance | 417 gave that row slot to the Docket/Siren control, so the row rule hides the toggle |

`needsFloat()` decides placement **from the page only, never from the button**
— a version that read the button's own computed display oscillated once the
button moved. When it floats, `.afloat` is added and it moves to
`document.body`.

⚠️ **Three facts that only a render establishes:**
- Floating it *in place* does not work. At `z-index:2147483000` inside the
  header it still measures covered — z-index competes only inside the nearest
  stacking context.
- Moving it is not enough. The view is appended to body **after** the button
  moves, so an equal 9500 loses on DOM order. `.afloat{z-index:9550}` — above
  the views, below `#cr-ci`'s 9560 so a modal still covers it.
- `ensureSearchRow()` re-adopts from a body observer and reverses the move
  within a frame. It now skips a button carrying `.afloat`.

**Excluded by name:** `#cr-show` and `#cr-occ`. Both are single-theme
client-facing Blackout by settled decision; a switch that does nothing there
would be a control that lies. Gate `render_toggle694.js` asserts their absence
as firmly as it asserts the others' presence.


### 695 — the Tools dropdown is drawn

All sixteen rows carry a drawn glyph. Thirteen had an emoji entity; four new
glyphs were drawn (`pulse`, `sparkle`, `pin`, `flask`) and nine existing ones
reused. `CardinalIcons` 43 → 47.

`data-cri` is the right mechanism here — static markup, and `hydrate()` runs at
load, before the menu can open.

⚠️ **The DOM has sixteen `.cbi` rows; the source shows fourteen.** `Track` and
`Reports` are written as `class="cbn"` top-level nav and moved into the
dropdown at runtime, with className rewritten to `cbi`. A source-only count
misses them. Their icons were chosen from the app's own `data-go` map
(`track` → `CardinalEstimates.open` → `calculator`, `reports` →
`openReportsView` → `chart`), not from the labels.


### 698 — the client-page section headings are drawn

All 27 `.projsec` headings. `CardinalIcons` 47 → 51 (`contract`, `ruler`,
`box`, `lock` are new; twenty existing glyphs are reused).

⚠️ **Two mechanisms, not interchangeable.** 17 are static markup and use
`data-cri`; **10 are built as strings at render time** — 9 in the main block,
1 in `cr-pp-script` — and must call `CardinalIcons.get()`, because `hydrate()`
runs at load and never sees them.

⚠️ **8 of the 27 never had an emoji.** They were given icons anyway: a family
where nineteen headings carry one and eight do not reads as unfinished.

⚠️ **A source count of `.projsec` disagrees with itself.** `[^<]*` finds 26,
`.*?` finds 27 — the Location heading has a nested `<span>` and a
character-class scan stops short. That same heading is the runtime one.


### 699 — the page headings are drawn, and `ICO` is declared once

All 15 `h2.viewhead`. `CardinalIcons` 51 → 52 (`chat`).

⚠️ **The DOM has fifteen; a source regex finds fourteen.**
`<h2 id="listTitle" class="viewhead">` puts the id before the class. It is
empty in markup and filled from `LIST_DEFS`.

⚠️ **`ICO(n)` is now declared exactly once, at the top of the main block.** It
had six declarations — five leaked to global scope from non-IIFE module blocks,
and the one 698 added to `cr-hd2-script` was private to that IIFE and dead. Nine
runtime `.projsec` headings had been resolving against another module's copy by
accident. Wrap any of those modules in an IIFE and they would start throwing.
Ordering is asserted: `LIST_DEFS` calls `ICO()` at parse time.

**Three mechanisms place an icon in this app**, and a name is not a contract:
`data-cri` in static markup (swapped by `hydrate()` at load), `ICO()` /
`CardinalIcons.get()` in strings built at render time, and one **raw inline
`<svg>`** on the Schedule Board heading, predating `hydrate()` and left alone.


### 700 — the PO number reads in light mode, and On Hold has its own colour

`.pcpo` was `#c9a2ff` in both themes — **1.79:1** on the light client card.
Now a token pair: `--pc-po` `#c9a2ff` dark / `#6d3fbf` light. **A pair, not a
computed literal**, which is the rule 527 established by breaking it.

`OnHold` was in `STAGES` but in none of the five stage colour maps, so it fell
through to Lead's grey and the two were indistinguishable in a list. It now has
an entry in each: `LJ_SOLID` `#c8862b`, `LJ_INK` `#15171b`, `LJ_SPINE`
`#ff9f43`, `STAGE_COLORS` `#0F9B8E`, `STAGE_INK` `#0B5F57`.

⚠️ **Amber on the leads list, teal on the job banner — deliberately two
colours.** Those screens use different palettes and amber was already spoken
for on the banner. Do not "unify" them.


### 701 — the weather panel is gone from the home screen

Theo: *"Get rid of the weather table altogether. It's not needed."* Gone from
`cr-lr-script`: `wx()`, `wxPaint()`, `wxCached()`, the `WX_*` constants, the
`WX_CODES` map, the load-time call and the markup slot (23,983 → 19,410 chars),
plus 18 CSS rules. **It was the home screen's only third-party data call**
(Open-Meteo, keyless) — the landing now fetches nothing.

⚠️ **Any doc that lists the weather table as an emoji-sweep target is stale.**
There is no weather code left in `cr-lr-script`.

**Two things shipped with it, both consequences rather than additions:**

- **The wordmark is back to full size.** `.cr-lr-head .cr-lr-mark` had shrunk it
  to `clamp(28px,8.2vw,58px)` purely to sit beside the panel — its own comment
  said so. Restored to `clamp(38px,12vw,58px)`; measured at 360/393/430/560
  first (182px of text in a 353px box at phone width).
- **The four course rows stack.** `.tt`, `.sb` and `.n` were `<span>`s at
  `display:inline`, so the first screen read *"Quick InspectionWalk the roof"*.
  **Pre-existing — reproduced unchanged on 684**, found while photographing the
  before/after. Two tells that it was never intentional: `margin-top` is set on
  `.sb` and `.n`, which does nothing on an inline box, and the `.cr-lr-pair`
  tiles directly below use `<b>`/`<small>` and stack correctly. Fixed with one
  scoped declaration — `.tt`/`.sb`/`.n` are about as generic as class names get.


### 702 — the address under the map takes its ink from its own card

`.dbaddr` had been reading `var(--rbe-ink)` (the retail app theme, `<html
data-theme>`) while the card behind it, `.acxsec`, is painted from
`var(--ct-surface)` (`<body data-rltheme>`). Two switches that move
independently, so the pair went wrong in both directions — **1.38:1** with the
app dark and the card light, **1.00:1** the other way, which is the same colour
twice.

Each CRM now takes its ink from the palette that paints its own ground:
insurance `var(--ct-ink)`, community a fixed dark ink (its card is `#fffdf7`
in both themes), retail unchanged from 637. Worst of twelve cells: **14.81:1**.

⚠️ **`--ct-*` is declared ONLY under `[data-rltheme]`** — the Resource
Library's theme, a third switch beside the two in `CLAUDE.md`. Anything reading
`--ct-*` follows the RL toggle, not the app one.


### 703 — the insurance claim screen holds still

`styleMounts()` sets `overflow-y:auto` INLINE on the full-screen mounts and
nothing else. CSS forbids `overflow-x:visible` beside a non-visible `overflow-y`,
so **overflow-x is coerced to `auto`** and the whole screen became a sideways
scroller. The Scope History table (386px in a 349px box) then dragged it.

`#cr-claims-mount{overflow-x:hidden}` pins the screen; the four claim tables
each gained a `.cr-c-xscroll` wrapper so the wide one scrolls in its own box.
**Both halves are required** — pinning alone would clip a column of money.

⚠️ **13 other full-screen views still carry the coercion** (`landingView`,
`cr-estimates-mount`, `cr-pricing-mount`, `payView`, `puDetail`, eight modals).
Not swept: `overflow-x:hidden` clips, so each needs its wide child found first.
See bug class 33.


### 704 — the Supplement Desk has exactly one door

**Insurance hub → TOOLS → Supplement Desk**, emitted by `cr-cth-script`'s tools
rail as `data-go="desk"` and handled by `window.location.href =
'/supplement.html'`. It is a standalone page on the SAME origin as the app, so
the Supabase session carries over (unlike `studio.html`, which has its own
subdomain and its own sign-in). Admin-gated three ways: the UI checks
`is_cardinal_admin`, `api/supplement.js` re-checks server-side, and RLS is the
fence.

⚠️ **There used to be a second card and it never worked.** 668 added an
`<a href="/supplement.html">` to the static `.ins-grid` in
`#cardinalTruthView` — which `render()` overwrites, because it writes
`host.innerHTML` and `host` is `.ins-body`, the grid's own parent. The card was
never on screen once. 679 added the working tile; **704 removed the dead one**.
Do not add a link there again.

⚠️ **The whole static `.ins-grid` is dead** — 0 `.ins-card` reach the DOM. It is
kept as an accidental fallback for a total `cr-cth-script` failure, and its
content is already stale.
### The Community client card (`cr-cc`) REPLACES the project page — it does not extend it

Recorded 10 Aug from the Community audit (`CR_COMMUNITY_AUDIT_2026-08.md`): the
takeover rule `#projectView.cr-cc-own>*:not(#cr-cc):not(#dangerZone){display:none
!important}` hides the entire `.wrap` subtree. **RESOLVED at build 709 (Phase 4):** the first-build community surfaces are
DELETED — `cr-comclient` (bid strip + cream skin) wholesale, both attach rows,
the WO cream anchor path. Their capabilities live on the card (705–709). The
shared `.dbstage`/`#dbPayRow` remain for the other CRMs; `cr-comstage`
survives (its label export feeds the estimate-status toast). A 709 measured
correction: the bid strip was never a stage setter — its buttons only wrote
`checklist.bid` amounts; the one card-reachable Bid-Submitted setter is the
estimate-status sync (Sent → Prospect).
**SETTLED 11 Aug: Theo picked (a) — the black card wins.** The surfaces get
ported onto `#cr-cc` phase by phase, then deleted (roadmap at the top of the
audit doc). **Phase 1, build 705:** the black card's Job Menu now ends with a
direct "Payment Information" tile into `openPaymentsPage()` — the first ported
surface. **Phase 2, build 706:** a Partner & Property section (`#cr-cc-pp`,
`ppSync()` in `cr-cc-script`) between Job Menu and Location — funding partner
with masked roster detail + Attach/Change/Clear, the Properties door
(`openDirectory(pid)`, finally called WITH an id), the attached property, and
the renter line on property-manager jobs. Writes go through the existing
`setPartnerForProject`/`setPropertyForProject` pipeline with a stale-write
guard at these call sites. **Phase 3, build 707:** the Work Orders section
lives on the card too — `CardinalWorkOrders.render(host)` host mode, one
pipeline; the module's string-checklist read/write/delete defects are fixed
(parse via `parseCkAll`, persist via `patchProjectCk`, delete record-first by
path). Until Phase 4 the remaining cream surfaces (bid strip, stage row) are
still hidden-but-live underneath.
---

# Estimates — the three doors, and the AI/job link (builds 714–716, 11 Aug 2026)

*Written after a live walkthrough of the retail CRM on app.cardinalroster.com: a
throwaway signed-in account, a disposable client, the whole Lead → Prospect →
estimate path, then everything deleted.*

## Where an estimate can start

| Surface | Control | Opens |
|---|---|---|
| **Client profile** → Estimates tab | `+ New estimate ▾` (`#pNewEstimateBtn` → `#pEstMenu`) | the six trade templates → `createEstimateOfKind()` |
| | `📄 New Estimate` (`#cr-est-new-btn`, injected by `cr-est`) | the v2 unified editor, blank, prefilled with this client |
| | **`⚡ AI Estimate` (`#pAiEstimateBtn`, 715)** | the AI builder **bound to this client** |
| **Global Estimates page** (`#cr-estimates-mount`) | `⚡ AI Estimate` (`[data-act="new-ai"]`) | `showAICreate()`, unbound |
| | `+ New` (`[data-act="new-manual"]`) | `showManualPick()` → client → blank editor |
| | **`Templates` (`[data-act="templates"]`, 716)** | client picker → that client's Estimates tab with the template menu open |

**The six templates are `EST_TYPES`** — roof · siding · windows · andersen ·
gutters · general — and `createEstimateOfKind(kindKey)` is the single creator.
716 deliberately did **not** add a second template picker: it routes to the
existing one. One pipeline, more doors into it.

## ⚠ An AI estimate is only attached to a job if the session was bound (715)

`/api/estimate` has always accepted `project_id` and `client` and stores
`project_id` on the `ai_estimates` row. **The front end never sent them**, so
every AI estimate was born orphaned — which is what left Send with no address to
default to (the gap 653 half-fixed from the other end). `createSession(project)`
records them when the builder is opened from a profile; `generateEstimate()`
sends them. Opened from the global page with no client, both are `null` and the
estimate is unattached exactly as before — that path is unchanged, not fixed.

⚠️ **`cr-estimates-script` has no `esc()` of its own.** It is an IIFE; the two
`esc(` calls in it resolve to the main block's global by luck, and it defines a
local `esc2` in `showManualPick` for exactly that reason. Build anything new in
that module with `textContent`, or give it a local escaper — do not lean on the
global.

⚠️ **`showAICreate` is assigned straight to `.onclick` by `showList`**, so
argument 1 can be a `MouseEvent`. It takes a session id only when handed a real
string (715); before that it fell through to a fresh session via a localStorage
lookup on the key `"[object MouseEvent]"`.

## The PO badge no longer loops (714)

`cr-po`'s `injectOnProfile()` compared `existing.textContent` (`"PO 1002"`)
against the number `from()` returns (`1002`) — never equal, so it removed and
re-appended the badge every animation frame, ~120 mutations/sec on **every open
client profile**, for as long as it was open. Fixed by comparing against
`'PO ' + po`. **Note there are two unrelated `injectOnProfile` functions** — this
one in `cr-po-script`, and another in `cr-est-script` that injects the gold
New Estimate button. A name is not a contract; grep the block.


---

# Builds 717–719 — the audit log, the estimate buttons, and Places (11 Aug 2026)

## The sign-in log (717) — `audit_sessions`

`auditStart()` records who signed in. Read policy is `is_admin()`; INSERT is
`email = auth.jwt() email`; UPDATE is either. **Never ask for the row back.**
`.select('id')` on the insert makes PostgREST need SELECT on the new row, which
a non-admin does not have, and the whole INSERT is refused — silently, because
the call is deliberately `catch`-swallowed so the log can never interrupt anyone.
That is how the table reached 239 rows without a single rep in it.

The id is generated client-side (`auditNewSid()`, `crypto.randomUUID` with a
`getRandomValues` v4 fallback) so the insert needs no RETURNING.

⚠️ **Anything else writing to a table whose SELECT policy is narrower than its
INSERT policy has this bug.** The tell is `.insert(...).select(...)` — check the
read policy before assuming the write lands.

## The three doors into an estimate, renamed (718)

| Surface | Control | Opens |
|---|---|---|
| Client profile → Estimates | **`＋ From a template ▾`** (`#pNewEstimateBtn`) | the six trade templates |
| | **`📄 Blank estimate`** (`#cr-est-new-btn`) | the v2 editor, empty, prefilled with the client |
| | `⚡ AI Estimate` (`#pAiEstimateBtn`, 715) | the AI builder bound to this client |

Nothing selects these by their text; the labels each appear once.

## Address autocomplete (719) — `cr-gmap-script` + `cr-ac-styles`

**Do not "finish" this migration by switching to `PlaceAutocompleteElement`.**
It is a custom element that replaces the `<input>`, and seven `.value` reads plus
the whole address scanner depend on those inputs existing. The data API
(`AutocompleteSuggestion.fetchAutocompleteSuggestions`) is the deliberate choice.

- `attachSuggestions()` is the live path; `attachLegacyAutocomplete()` is reached
  only when `google.maps.places.AutocompleteSuggestion` is absent.
- The dropdown is a single shared `.cr-acbox`, `position:fixed`, z-index 10700.
  Fixed positioning is not decoration: it is what stops a modal's overflow
  clipping it and `#pwaNav` (9990) trapping it.
- ⚠️ **`acSilent` is load-bearing.** `acChoose()` dispatches `input` so the rest
  of the app sees the new address — and this module now listens to that same
  field. Without the flag it reads its own write as typing and re-opens the list
  on the address just picked. Any new programmatic write to an address input
  needs the same guard.
- Requires **Places API (New)** enabled on the Google Cloud project. Verified
  enabled 11 Aug 2026 (`places:autocomplete` → HTTP 200). If that ever changes,
  the fallback keeps the field working.

## The boot splash (729) — `#crSplash` + `<style id="cr-splash-styles">`

The **first two elements inside `<body>`**, and they have to stay there. Anything
further down the file cannot paint until it has been downloaded, and the whole
point is the window before the file has arrived.

- **What it fixes, measured:** on a weak signal (1.6 Mbps / 300 ms) the document's
  first paint is at 608 ms but it is not fully down until 5,713 ms. For those five
  seconds the app is a **half-painted page** — black ground, red rule, one stray
  strip of unstyled text — which reads as crashed. On LTE the whole load is under
  a second and there is nothing to fix. **There was never a white screen.**
- **Ground `#09090C` is measured, not chosen.** `html` and `body` both compute to
  `rgb(9,9,12)` in dark *and* light mode, so the splash is the document's own
  ground. Ring, spin and inks are `#restoreVeil`'s, verbatim, so the hand-off on a
  signed-in load has no seam.
- ⚠️ **Deliberately single-theme. Do not add an `html[data-mode="light"]` block.**
  `#restoreVeil` is dark in both modes and a signed-in load goes splash → veil →
  app. A light splash would put a flash *into* that path to take one out of the
  rarer signed-out path.
- ⚠️ **No progress bar, and this is a decision, not an omission.** We cannot know
  when the remaining bytes arrive. A percentage we cannot measure is a lie, and
  `gate_729.mjs` asserts none is present.
- **It removes itself on every exit from boot**: `showMain()` (after the veil is
  up), `showLogin()` — which is also where the boot IIFE's own `catch` lands —
  `pageshow` from bfcache, and an **8 s backstop**. A splash that cannot be
  dismissed is worse than the half-painted page it hides.
- `window.crSplashDone()` is the single remover, defined once, asserted. It is
  `position:fixed` and **never writes `body.style.overflow`** — still 13 scroll-lock
  writers, not 14.

## Client contracts — three trades, one pipeline (730)

`#tab-contracts` on a client profile. **`+ New contract` is a trade picker**, not a
single button: Roofing, Siding, Gutters. Each builds that trade's own Construction
Agreement, prefilled from the profile.

| | variable | printed heading | spec sections |
|---|---|---|---|
| Roofing | `ROOF_AGREEMENT` (542) | `ROOFING CONSTRUCTION AGREEMENT` | 13 — decking → roof pitch |
| Siding | `SIDING_AGREEMENT` (730) | `SIDING CONSTRUCTION AGREEMENT` | 11 — removal & prep → stories/height |
| Gutters | `GUTTER_AGREEMENT` (730) | `GUTTER CONSTRUCTION AGREEMENT` | 13 — removal & disposal → access & height |

All three are transcribed from the shipped print masters in `docs/`, section for
section. **If a line is not on the paper form it is not in these bodies.**

- **`CONTRACT_TYPES`** mirrors `EST_TYPES` — `{key:{label,tpl}}`. One creation path,
  `createContractForCurrent(tradeKey)`, asserted defined once. The picker is
  `pEstMenu`'s markup and delegation copied, not a second mechanism.
- ⚠️ **The saved title is `Contract — <Trade> — <client>`, and the order matters.**
  Keeping `Contract` first is why **`isContractTitle` (`/^contract/i`) did not have to
  grow** — and neither did the **six** other sites that inline the same regex:
  `jobFinance()`, the worksheet contract-value key, the overview roll-up,
  `sigApply`'s `setStage('Approved')`, and `renderProjectDocs`' `insp` bucket, which
  is defined by **NEGATION** and silently swallows any contract the predicate misses.
  Titling these `Siding Contract — …` the way estimates are titled would have forced
  all seven to change. **Do not "tidy" the title into trade-first order.**
- **`docKind()` is the one place that did grow** — it returned `trade:'—'` for every
  contract, so the Trade column said nothing. It reads the title's **second segment**
  only: a client named "Siding Supply Co" is not a siding job, and contracts written
  before 730 still answer `—`.
- **Each body points at ITS OWN printed master** for the Terms & Conditions and the
  two 3-Day Notice copies. The T&C differ per trade, and the cancellation notice is
  statutory text under ORC 1345.23 — it is deliberately not retyped in the app.
- `approveAndContract` (approving from the pipeline) still issues the **roofing**
  agreement, because approving carries no trade. It just says so in the title now.

⚠️ **Two separate contract systems exist — do not confuse them.** This one is
`inspection_reports` (HTML documents, the client Contracts tab). The **`contracts`
table** is the AI-estimate → contract lifecycle (`contract_number`, `template`, the
`contract` JSONB blob, `doSend`/`doVoid`/signing from 722). It had **0 rows** as of
build 730.

## The app-wide toast (733) — `crToast` + `<style id="cr-toast-styles">`

`window.crToast(msg, type)` · `crToastOk(msg)` · `crToastErr(msg)` — type is
`'ok' | 'err' | 'info'`. Mounts a `#crToasts` stack to `document.body`.

**Why it exists when five toasts already did:** the five (`cr-estimates`,
`cr-claims`, `cr-coach`, `cr-ess`, `cr-bpa`) are all **view-scoped**. There was no
app-wide one, which is why `showError` wrote into `#bannerMount` — a normal-flow div
inside `#mainView`, while `#projectView` is a **sibling** that `hideAllViews()` shows
after setting `mainView.display='none'`. Measured: errors were visible on **home
only**. **The five are untouched and asserted still 5. Do not "unify" them without
cause** — they work, and they are scoped to their own overlays.

- **Errors do NOT auto-dismiss.** They stay until tapped. This is the point of the
  build: a 4-second visible message replacing a 6-second invisible one is not a fix.
  Successes clear at 4s. `gate_733.mjs` asserts both.
- **`textContent`, never `innerHTML`** — these carry Postgres error strings and client
  names. One of the five existing toasts takes HTML; that trap is not copied here.
- **Placement follows `body.standalone`**, which already reserves
  `calc(64px + env(safe-area-inset-bottom))` for `#pwaNav`. The stack clears the same
  amount, and the gate measures the real overlap rather than trusting the arithmetic.
  Desktop (≥900px) moves it to top-right.
- **`showError()` routes through it** and no longer writes `.banner.err` at all — one
  writer, zero readers. `#bannerMount` keeps its other job as the Local-mode host.
- Stack caps at **3**, newest wins.

⚠️ **`.toolbar #savedFlash{display:none}` under 760px** — the editor's "Saved ✓" is
hidden on a phone. That is why `saveCurrent()` now also toasts.


## The collection → commission toast (734)

Logging a check reads back: `Collection logged — $17,025 · $1,703 commission for Nick Hey`.

**Why this is not as simple as it looks:** the commission is created by
`commission_on_collection` (`AFTER INSERT ON collections EXECUTE make_commission()`),
**server-side**. `miSaveColl` inserts with `.select('id').single()` — it never sees
the commission. So the amount and the rep are recovered by **diffing
`commUi.lastComms` across the `await renderCommissions()` that miSaveColl already
did**, not by asking the database again.

- **Zero extra queries, asserted both ways**: the patch checks `from('commissions')`
  is 5 before and 5 after, and `gate_734.mjs` counts one commissions read across
  the save.
- `commUi.lastComms` is set inside `renderCommissions()` beside the existing
  `commUi.hasColls`. **Do not remove it** — it looks unused from that function.
- **Three silent, correct no-commission cases**, each gated: no `sales_rep` on the
  job · RLS hides another rep's commission from this reader · the user was
  **editing** a collection, which fires no trigger. All three fall back to the plain
  collection line. None is an error.
- Rep names go through the existing `rptRepName()`, so it is "Nick Hey", not an email.

⚠️ **`e2e_mock_supa.js` now models this trigger** (`fireTriggers`, 734). A harness
that cannot create the commission out of band cannot test any of the above.
`__MOCK_NO_TRIGGERS__` opts out. Keep the 10% rate in step with `make_commission()`.


## Empty states (736) — the base `.empty` rule

**Sixteen** `class="empty"` states. They already carried their call-to-action wording;
736 fixed how the box renders.

- ⚠️ **The base rule is light-era.** `.empty{background:var(--paper)…}` and `--paper`
  is `#ffffff`, declared once, no dark twin. On the dark default theme that painted a
  **white card on a near-black page** — with perfectly readable text on it (6.69:1),
  which is why no contrast sweep ever caught it. **The inverse of the usual bug.**
- The dark override is scoped `:root:not([data-theme="rb-light"])`, so **light mode is
  byte-identical** and asserted so. Inks are 726's: `--rbe-empty-bd` / `--rbe-mute` /
  `--rbe-head`.
- ⚠️ **`empty` is a BARE class name and four other components use it as a modifier**:
  `.cr-photo.empty`, `.payrow.empty`, `.projinfo .poPfx.empty`, `.insdocrow.empty`.
  The override is (0,3,0) and out-ranks all of them, so **they are excluded by name in
  the selector**. `gate_736.mjs` proves the override does not reach them. **If you add
  a fifth component that carries `.empty` as a modifier, add it to that list.**
- Every other empty state uses a **prefixed** class (`cr-c-empty`, `pay-empty`,
  `crw-empty`, `pu-empty`, …). Those are separate and untouched.
- **The mark is a CSS mask, not an image** — `DB_ICONS`' own `docs` glyph as a
  data-URI on `::before`, taking `currentColor`. One rule, no call-site edits.
  `-webkit-mask` is listed first for iOS.

### Field validation — phone (739) and email (740)

Two builds, **one convention**, created because the app had none: `.invalid`,
`.field-error`, `aria-invalid` and a shake keyframe were each **0 occurrences**
before 739.

- **`<style id="cr-valid-styles">`** — `.cr-bad` (red border + wash, additive so it
  never fights a module's own palette), `@keyframes crShake`, and a
  `prefers-reduced-motion` opt-out.
- **`window.crValid`** — `phone`, `email`, `isEmailField`, `mark`, `shake`.
- **ONE delegated `blur` listener on `document`, with `capture:true`** — `blur` does
  not bubble, which is the whole reason capture is there. It covers **8 tel fields and
  13 email fields living in ten different modules**, several rendered by `innerHTML`,
  so a new field inherits the behaviour without being wired. **740 added a BRANCH to
  739's listener rather than a second listener** — the count of capturing blur handlers
  in the file is still 2 (the other is `cr-gmap`'s autocomplete).

**The rule both halves share: unrecognised input is FLAGGED, NEVER REWRITTEN.**
`937-555-0101 x123`, `+44 20 7946 0958` and `galen@habitat` all keep their text
exactly and get the red border. A formatter that silently eats an extension is worse
than no formatter. Blank is valid in every one of these fields, because they are
genuinely optional and refusing a blank would block real work.

- ⚠️ **`type="email"` was doing nothing.** It only constrains a *native* form submit
  and every one of these saves through a JS handler. **And the browser's own check is
  looser than people assume — `galen@habitat` passes `checkValidity()`.** `gate_740.mjs`
  asserts that, because it is why the handler-side check matters.
- ⚠️ **Four of the 13 email fields are `type="text"`**, identified by name instead:
  `cr-claims` `adjuster_email`, `cr-sol`, `cr-ci`, and `cr-crew` `contact_email`.
  `isEmailField()` matches `/e-?mail$/i` on `name` / `data-field` / `data-f` / `id`,
  and excludes anything with a real non-text type so a checkbox named `no_email` is
  never touched.
- **One definition of "what is an email."** `crValid.email` uses the same
  `/^[^@\s]+@[^@\s]+\.[^@\s]+$/` the money paths have used since the draws form. The
  four working money-path call sites were **deliberately left alone**; only the one
  weak site was upgraded (`cr-bulk`'s Reassign tested `/@/`, so `nick@` passed — and
  `assigned` is matched against that exact string by the sales RLS policy).

**The fence: `community_partners.contact_email` cannot be saved malformed.**
When a community bid is emailed the recipient **defaults to the partner's
`contact_email`**, so a typo there is a bid that goes nowhere. `save()` refuses it and
returns `null`; the form says why instead of showing the generic "Save failed."
`save()` is exported, so the refusal is in `save()` (the fence) and the message in the
form (the UI) — the same split as **635**'s note on `openEditor`.
**It fires only when the key is present and non-empty, so 712 still holds**: a rep
saving a notes change writes normally and never touches the stored contacts, and a
blank address stays legal. Both asserted.

### Required fields (741)

Six fields carrying the `required` attribute had **nothing on screen to say so** —
cr-pricing `sku`/`name`/`rate`, cr-claims `amount`, cr-cpartners `name`, cr-cprop
`address`. They now carry `<span class="cr-req">*</span>`.

- ⚠️ **The asterisk already existed FIVE ways** before this: `<span class="req">*</span>`
  in cr-nbid / cr-sol / cr-ci (in **three different colours** — red, `#fcd34d`,
  `#f08a90`), a literal `" *"` in label text (cr-nachi ×3, `pfName`),
  `placeholder="Name *"` (`qiNpName`), and `placeholder="…(required)"` (cr-estimates).
  **741 added a sixth only for the six unmarked fields and restyled none of the
  others** — cr-sol's amber and cr-ci's pink are module palettes, and changing them is
  a theming decision, not a validation one.
- ⚠️ **`.cr-req`, not `.req`.** `req` is already four meanings, including cr-shim's
  section badge that reads "Required" / "4 min · 8 max".
- ⚠️ **A derived `:has()` rule was the first design and it is wrong.**
  `label:has(+ input[required])::after` suits `<label>SKU</label><input required>`, but
  the other structure here is `<label>Name<input required></label>`, where `::after`
  renders **after the input** and drops a stray asterisk below the box. Two structures,
  so the mark is placed in the label text.

**`crValid.require(el, msg)`** — marks (`.cr-bad`), shakes (`crShake`), focuses, and
returns `false` so a guard is one line. Null-safe: several of these run on screens
where the field may not be rendered. **Six guards use it**: cr-cpartners, cr-cprop,
cr-estimates, cr-cadj, `pfName`, `qiNpName`.

**⚠️ `#cpForm` and `#cpropForm` now carry `novalidate`, and that is a fix.** Both had
`<input required>` on a natively-submitting form, so **the browser blocked first** and
their own "Name is required." / "Address is required." messages had **never rendered
once** — measured in Chromium, `submitFired === false`. The JS guards were already
correct and already refused; they simply were not reached. `gate_741.mjs` asserts both
halves: **the handler runs** *and* **it still writes nothing**, plus that a filled-in
value still saves.

### Searching by phone number (743)

**Seven** search boxes include a client's phone: `renderHome`, `ljMatches`, `cdMatch`,
`renderInsuranceClientsList` (main block) and `cr-search-script` / `cr-ic-script` /
`cr-ch2-script`. Three more (`cr-estimates`, `cr-eaf`, `cr-bpa`) search name+address
only and are **deliberately untouched**.

- ⚠️ **None of the seven ever looked in `checklist.lead.phones`.** 16 of the 34 clients
  in production keep a phone only there, so searching for those people by number had
  never worked at all. `phoneHay(pr)` reaches `lead.phones`, `lead.homeowner_phone` and
  `lead.renter_phone` as well as the `phone` column.
- **The haystack carries every rendering; the query is not normalised.** Digits, dashes,
  dots, spaces and brackets all appear, so the existing `indexOf(q)` matches whatever is
  typed. **The comparison lines were not touched** — which is what makes the change
  strictly additive. It was also the practical choice: those comparison lines are not
  unique in the file (3 copies each), so normalising the query would have meant 14 edits
  with block slicing instead of 7.
- Digit extraction delegates to **`window.crValid.phone`** (739), leading-1 country-code
  rule included, rather than re-deciding what a phone number is.

**The property that matters is "nothing stopped matching."** `gate_743.mjs` fuzzes 161
query strings across 6 clients against the old and new haystacks and fails on a single
lost match — 0 lost, 14 gained. A gate that only checked "more things match" would pass
even if the change broke searching by name.

⚠️ Short numeric queries (`937`, `01`) now match more rows, because the digit forms are
in the haystack. That is a superset of the old behaviour and is intended.

### Money and dates — the formatters (744–745)

**`crDate(v)` (744)** — one safe parser. 30 columns in this database are Postgres
`date` and arrive as a bare `"YYYY-MM-DD"`; `new Date()` treats that as UTC midnight,
so a date-only value rendered **a day early** in any timezone behind UTC. `crDate`
builds *only* a bare date-only string at local midnight and hands everything else to
the native parser, so it is a **drop-in** for `new Date(v)` — it never returns null and
every existing `isNaN` guard behaves identically. 12 formatters use it; **`commDate`,
`cr-cc` `fmtDay`, `cr-show` `fmtDate` and `cr-crew` `daysLeft` were already correct and
are untouched.**

⚠️ **35 `<input type="date">` values must stay `YYYY-MM-DD`** — that is what the HTML
control binds. Never route an input value through a display formatter.

**`fmtMoney(n, cents)` (745)** — the dominant money formatter, 34 call sites.
The default is unchanged: rounded, `--` for zero, which is *deliberate* on tiles and
reports. **Pass `true` wherever the number names a specific amount** — the nine sites
that do are the three invoice tokens, the two `auditLog('money', …)` entries, and the
four messages that report a figure back to the person who entered it.

- ⚠️ **The second argument matches `money(n, cents)` in `cr-crew-script` (build 556)** —
  including putting **the sign outside the symbol** (`-$500.00`, never `$-500.00`).
  Copy the whole of that function's solution, not just the flag.
- ⚠️ **20 money formatters exist and most are fine.** `cr-adj`'s and `cr-hub`'s
  `money(n)` return no dollar sign **on purpose** — all 9 of their call sites write
  `'$' + money(...)`. Adding one would print `$$34,050`. Only `cr-abc`'s `usd()` was
  genuinely wrong.
- **Rounding on a dashboard is a feature.** `$34,050` reads better than `$34,050.00` at
  a glance. The bug was rounding on documents, not rounding at all.

### Company Documents (746)

Five master contract PDFs listed in `COMPANY_DOCS`, served from `docs/`.

- ⚠️ **`COMPANY_DOCS` lists five documents; `docs/` holds three.**
  `Cardinal_Window_Contract.pdf` and `Cardinal_Gutter_Contract_Fillable.pdf` **404 in
  production** (verified with curl, 12 Aug 2026). Those rows now say "Not uploaded yet"
  instead of offering a dead link — **and start working on their own the moment the file
  is added**, because the check is a runtime `HEAD`, not a hardcoded flag.
- ⚠️ **The probe downgrades a row on a definite 404 and nothing else.** A network error,
  an offline PWA or a slow reply leaves the buttons alone. `gate_746.mjs` kills the HEAD
  request for a document that *does* exist and asserts its row is untouched — hiding a
  real contract whenever the iPad drops wifi would be worse than the bug being fixed.
- **Both links open in their own tab.** Download previously had no `target`, and the
  `download` attribute is **not reliable for a PDF on iOS Safari** — the file opens
  instead, replacing the app in place. **An installed PWA has no back button**, so that
  navigation stranded the user until they force-closed the app. Desktop still downloads
  straight to the Downloads folder; the `download` attribute is retained.

### Print — what is already right, and what is not (audited at 746)

**Theo's item 9 asked for four things. One is already done; three are real gaps.**
Nothing here has been changed — the templates are legal documents and want his eye.

- ✅ **"Hides nav, buttons, search bars" — ALREADY DONE.** Measured under print media on
  the estimate editor: **0 of 508** buttons/inputs/nav/header elements paint, and the
  app page's own `innerText` is empty. There are 18 `@media print` blocks and the
  estimate/contract path prints an **isolated iframe** (`frame.contentWindow.print()`),
  which never contained app chrome in the first place.
  ⚠️ Measuring an element's own `display` is not enough — an ancestor with
  `display:none` leaves a descendant reading `block` while painting nothing. Measure the
  **rect**.
- ❌ **"Logo header on every page" — real gap.** 1 `<img>`, no running header; the logo
  is on page 1 only. Rendered and confirmed visually.
- ❌ **"Forces page breaks between sections" — real gap.** **0** `page-break-*` rules in
  the whole 155 KB agreement. Confirmed visually: the Customer Information table splits
  across pages 1→2.
- ❌ **"No grey backgrounds that waste ink" — real.** The `PROPERTY PHOTO` placeholder
  prints as a **459,580 px² solid grey block** when no photo is attached (`.cover-photo`,
  `rgb(241,241,241)`), plus near-black `th` bars (`rgb(27,27,27)`) and grey body inks
  (`#666` ×9, `#9a9a9a` ×2 — 2.85:1 on paper). Note `@media print` already hides *empty
  photo figures* (`.fig:has(.frame:not(:has(img)))`) — **`.cover-photo` is not covered by
  that rule.**

### Print — what 747 changed

**Two skeletons, not one.** `ESTIMATE_BASE_RAW` feeds `buildEstimate()` (the three
Construction Agreements, the Service Contract, the Invoice, and the siding/window/
gutter estimates); the older `ESTIMATE_TEMPLATE_RAW` feeds the **roof estimate** only.
⚠️ **They share the same CSS tail**, so a file-wide anchor matches twice.

- **The property photo is stripped in `buildEstimate`, not removed from the skeleton** —
  gated on the heading text, so an AGREEMENT or CONTRACT drops it and an ESTIMATE keeps
  it. ⚠️ `isContractTitle` / `isEstimateTitle` / `docKind` are **not** reusable here:
  they test a *saved document's* title, not a template heading, and all three are
  declared **after** `buildEstimate`, which runs at parse time.
- **Estimates gained `.cover-photo:not(:has(img))` on print** — the rule
  `REPORT_TEMPLATE` has had all along. An estimate with no photo attached no longer
  prints a **459,580 px²** grey block.
- **The running header is `position:fixed`, and that is the only thing that works.**
  Measured by counting its colour band per page in the PDF: `position:fixed` = 5 of 5
  pages, `<thead>` = 5 of 5. ⚠️ **`@page` margin boxes are not implemented in Chrome or
  Safari**, so `counter(page)` cannot be used — there is deliberately no "page N of M".
  The browser's own print footer supplies page numbers.
  ⚠️ A fixed header sits in the page **content** box, so `body{padding-top}` is required
  or page 2 onward prints text underneath it.
- **The break classes already existed and were used zero times.** 747 applies them:
  Terms gets `page-break`; and under print, `tr{break-inside:avoid}`,
  `thead{display:table-header-group}`, `h2.sec{break-after:avoid}`,
  `.sign{break-inside:avoid}`. **Deliberately not a break after every section** — that
  would turn a 13-row spec sheet into 13 pages.

⚠️ **Pagination outcomes are not directly assertable.** `gate_747`'s first version
modelled pages as `scrollHeight/1056` and flagged "split rows" — but
`break-inside:avoid` does nothing in continuous layout; it only acts while paginating.
That went 2 red against a correct build. Assert **computed style under print media**
(the rule applies) plus **the real PDF** (what actually lands on each page).

---

## Construction Agreements — tick boxes, not "circle one" (748)

The three Construction Agreements (`ROOF_AGREEMENT_BODY`, `SIDING_AGREEMENT_BODY`,
`GUTTER_AGREEMENT_BODY`) carry **76 clickable tick boxes** where they used to carry
**25 `[circle one]` / `[circle all that apply]` text prompts** you could not circle.

**No new mechanism was written.** Everything this uses already shipped:

| Piece | Where it already lived | Since |
|---|---|---|
| `.cbx{cursor:pointer;font-size:13pt;user-select:none;}` | `ESTIMATE_BASE_RAW` — the Agreements' own skeleton | before 748 |
| `wireCheckboxes(doc)` | called from `openEditor`'s frame `onload`, once | before 748 |
| `serializeFrame()` stripping `data-cbx` | the save path, so a reopened doc re-wires | before 748 |
| live examples | `GUTTER_BODY` size boxes, `ANDERSEN_BODY` series boxes | before 748 |

**The three behaviours, all pre-existing in `wireCheckboxes`:**

- `data-group="x"` → **radio.** Ticking one clears every other box in group x.
- no attribute → **independent toggle.** This is "[circle all that apply]" — roof
  flashing locations and extra structures, gutter miters.
- `data-val` → the gutter-size boxes, which also rewrite the description via
  `applyGutterSize()`. **Deliberately not used in any Agreement.**

Group prefixes are per document: `r*` roof, `s*` siding, `g*` gutter.

⚠️ **`.opts` spans (`data-opts="decking|layers|pitch"`) are NOT checkboxes and must
not become them.** They are the `collapse()` auto-fill from the roof inspection, and
its regex `<span class="opts" data-opts="KEY">[^<]*(?:<(?!/span>)[^<]*)*</span>` stops
at the first `</span>` — a box inside one truncates the match and kills the fill.

⚠️ **Every box sits inside a `contenteditable` cell.** `table.meta td:not(.k)` is in
`EDITABLE_SELECTOR`, so `lockTemplate()` puts a caret where the click lands. It works
(`e.preventDefault()`), but it is the reason `gate_748.mjs` drives a real browser and
does a hit-tested mouse click rather than trusting the markup.

⚠️ **A ticked box is plain text (`\u2611`) in the saved HTML** — that is how the state
persists. Nothing writes it to a column; the contract document IS the record.

**Saved contracts written before 748 keep their `[circle one]` text.** Only newly
created ones get boxes.

**Row 10 "Ventilation" was left as plain text**, because it carried no circle prompt
in the template — the only lettered row in the roofing spec sheet without boxes.

---

## The numbered house diagram — roofing agreement only (749)

`ROOF_AGREEMENT_BODY` carries a `<figure class="roofdiag">` directly above the numbered
Project Specifications table. **It is the printed master's own illustration**, extracted
from `docs/Cardinal_Roofing_Contract.pdf` (page 1, image xref 30), not a drawing — so the
contract on the iPad and the one in the truck show the same picture.

| | |
|---|---|
| Source | `docs/Cardinal_Roofing_Contract.pdf` p1, xref 30, PNG 1172×840, placed 218×156 pt |
| Shipped as | greyscale JPEG q84, 760 px wide, 96,877 bytes → **129,195-char data URI** |
| Displayed | `max-width:3.6in`, centred, `break-inside:avoid` |
| Print | 346 px ≈ **211 dpi** |
| Cost | a saved agreement is **281 KB** (the logo alone was already 139,982 chars) |

**The callouts map 1:1 onto the numbered rows below the figure**, which is the whole point
of putting it there: 1 decking · 2 roof deck protection · 3 drip edge / gutter apron ·
4 ice & water barrier (three places) · 5 valley metal · 6 starter shingles · 7 shingles ·
8 flashing · 9 extrusions · 10 ventilation · 11 ridge cap / hip cap. Items 12 (existing
layers) and 13 (roof pitch) are counts rather than places and have no callout on the
master either.

⚠️ **Roofing only, and that is measured.** `Cardinal_Siding_Contract.pdf` and
`Cardinal_Gutter_Contract.pdf` were opened: both carry only the Cardinal logo and the BBB
badge. There is no siding or gutter diagram to port.

⚠️ **The `.roofdiag` CSS lives in `ESTIMATE_BASE_RAW`, so it is present in EVERY priced
document** — same as `.cbx`. That is one skeleton working as designed, not a leak. **Test
for `<figure class="roofdiag">`, never for the bare string `roofdiag`** — the latter went
2 red against a correct build.

⚠️ **It must never become a photo slot.** `wireCoverPhoto()` claims `.cover-photo` and
`wirePhotoFrames()` claims `.fig .frame`, injecting a file input and an upload button.
`.roofdiag` deliberately collides with neither, and sits outside `EDITABLE_SELECTOR` so a
rep cannot type over or delete it.

⚠️ **Sizing is a per-DOCUMENT cost, not a per-file one.** `serializeFrame()` stores the
whole document HTML per saved contract. Measure the logo's existing data URI before
growing this one.

---

## Colour dropdowns on the roofing agreement (750)

Three colour fields on `ROOF_AGREEMENT_BODY` are `<select class="crsel">` instead of
free-text `.ph` boxes: **item 7B shingle colour** (`data-crsel="occ"`) and **item 3A/3B
drip edge + gutter apron** (`data-crsel="trim"`).

| List | Source | Rule |
|---|---|---|
| OC shingle colours | `window.CardinalColors.list()` → the module's existing `oc_colors` query | hidden excluded, `sort_order` kept, discontinued badged |
| Aluminium trim | `TRIM_COLORS` constant | **a starting list, not gospel** — Theo's pick when told none existed |

⚠️ **`oc_colors` still has exactly ONE reader.** The dropdown goes through the OC
module's accessor, not a second query — asserted in `patch_750` and `gate_750`. Add
the accessor, never a parallel `from('oc_colors')`.

⚠️ **A `<select>`'s value is a PROPERTY and does not survive `cloneNode(true)`.**
`serializeFrame()` saves contracts by cloning, so the `change` handler writes the
**`selected` attribute** onto the chosen option and strips it from the rest. Without
that the colour is lost on save and nothing in the DOM shows it was ever picked. Any
future form control added to a document must do the same.

⚠️ **Saved option lists are frozen on purpose.** `wireColorSelects()` fills a select
only when it is empty, so a signed contract keeps the colours it was offered rather
than restating today's catalogue.

⚠️ **`contenteditable="false"` on every select** — they land in editable `<td>`s
(`table.meta td:not(.k)`), the same trap 748 hit.

**Item 5 Valley metal is still free text** — same trim palette, but outside what was
asked for. One line to add if Theo wants it.

---

## The full-screen photo viewer — one viewer, seven callers (751)

`cr-ri-script` owns the only full-screen image overlay in the app. **Do not build a
second one.**

```js
window.CardinalResourceImages.open(src, caption)                 // 6 original callers
window.CardinalResourceImages.open(src, caption, {               // 751
  actionLabel: 'Open client',
  onAction: function(){ openProject(pid); }
})
```

With `opts` it renders a bar: **‹ Back** and **`actionLabel` ›**. Without `opts` the bar
is hidden — which is how the Resource Library, Punch & Repairs and the lightbox keep
working untouched.

⚠️ **The overlay is a SINGLETON.** `ensureZoom()` builds it once; every later `open()`
reuses that node. **Every open must reset the action bar**, or a photo opened from the
gallery leaves its "Open client" button on the next Library figure, pointing at the
wrong client. This is the regression most likely to be reintroduced.

⚠️ **`zoom.onclick = close` — any click on the backdrop closes.** That is deliberate and
six callers rely on it. Anything interactive added inside must `stopPropagation()` and
call `close()` itself, reading any state it needs **before** close clears it.

⚠️ **Photo Activity's grid tap opens the viewer, and falls back to `openProject`** only
when there is no image or no viewer. The old behaviour — jumping straight to the client —
was the bug Theo reported: there was no way to look at the photo.

**Touch targets on this overlay are ≥44px** (close 44×44, Back 78×44, action 121×44),
measured as rendered rects at 390px with touch emulation.

---

## The 44px touch-target floor — `cr-touch44-styles` (752)

**One block, at the very end of `<body>`, is the entire pass.** Every rule carries the
measured before-size from `walk751.mjs`. If a control is under 44px, its fix belongs in
THIS block, with its measurement — never scattered into module stylesheets.

**The mechanism is `min-width`/`min-height`, and that is load-bearing.** The offenders
are sized by id-scoped `width`/`height` rules a class selector cannot out-specify — but
min-* are different properties that never compete in the cascade (used value =
max(width, min-width)). That is why the block wins with plain class selectors and zero
`!important`, and why every module stylesheet stayed byte-identical.

⚠️ **The block must remain the LAST `<style>` in the document** (asserted in
`gate_752`): its same-specificity rules win by order.

⚠️ **`.pu-box` is deliberately absent** — it measures 22×22 but already carries a
44×44 `::after` hit box from `cr-punch2-styles`. **A rect-based audit cannot see
pseudo-element hit areas**; check `getComputedStyle(el,'::after')` before declaring a
small control an offender.

⚠️ **Printed documents are out of scope by construction**: they render in the
`#reportFrame` iframe, a separate document that app CSS cannot reach. The 15px contract
tick boxes print exactly as before.

**Instrument notes** (all cost a red against a correct build): `elementFromPoint`
answers null outside the viewport — scroll first; the seeded harness paints the landing
module over the home strip, so tap-through claims there are dishonest; Playwright's
`screenshot()` hangs "waiting for fonts" under the mock — use CDP
`Page.captureScreenshot`.

Unmeasured module screens (Pricing, Coach, Partners, Showcase, Crews directory) have
their own add-buttons (`.cr-p-tool-btn`, `.cr-k-btn`, `.cr-cp-addbtn`, `.cr-sh-btn`) —
**not covered by this pass**; walk them before extending the census.


---

## Header menus anchor to their buttons (753)

`#navMenu` (burger) and `#newMenu` (+) drop from their button's **left edge** and clamp
on-screen against their real rendered width after `display:block`. Mobile (≤640px)
keeps the sheet rules.

⚠️ **History**: `cr-menu-styles` pinned `#navMenu{left:auto/right:10px !important}` from
the era when the Menu button lived at the RIGHT of the old masthead; cr-hd2 (416) moved
the button left and the pin silently beat the click handler's inline position for ~340
builds (inline `right:1021px`, computed `right:10px` — measured). **Do not re-pin the
menus in CSS** — the handlers own position; the stylesheet owns width/scroll/max-height.

## The header follows your CRM — `data-crm-head` (754)

**Two CRM attributes on `<body>`, different consumers:**

| Attribute | Written by | Means | Consumed by |
|---|---|---|---|
| `data-crm` | `skin()` (view-derived `crmNow()`) | what the PAGE is | page grounds, PIPE_SKIP, module gates, theme-toggle float, footer hide |
| `data-crm-head` | `skin()` (`crmHead()`: view > open client's claim type > sticky portal) | what the HEADER is | all header chrome (.site tokens, bar, ribbon, banner, --bn*), home routing, switcher highlights, left-rail accent, `openLeadForm` default |

**Do not "unify" them.** The single-attribute version was built and measured first:
`body[data-crm=insurance]{background:var(--ct-bg)}` repaints shared screens' grounds and
white headings go unreadable. The split is the feature.

**Two header-located rules deliberately stay on `data-crm`** — the insurance dark-toggle
hide and `body:not([data-crm=insurance]) .cr-ins-theme`: theme controls follow the page
they theme, or shared screens would show two theme buttons.

`CardinalHeader.crmHead()` is exported beside `.crm()`. Migrated selector census: **26
occurrences**, asserted in `gate_754.mjs`.

## Per-CRM banner pills — `paintCrmPills` (755)

The Contacts and Leads pills in `#crBanner` are **slots** (`data-cr-slot="0"/"1"`),
re-labelled and re-routed per `data-crm-head`:

| CRM | slot 0 | slot 1 |
|---|---|---|
| retail (and production/sales) | Contacts → client directory | Leads → Leads & Jobs |
| insurance | Clients → `showInsuranceClients()` | Claims → `crOpenClaims()` (app-level, history-wrapped) |
| community | Partners → hub, partners tab | Bids → hub, bids tab |

Community deep-links go through `CardinalCommunityHub.show()` +
`CardinalCommunityHome.tab(k)` — the hub's own pane mechanism. **Do not add
per-CRM pills as NEW elements** — the swap reuses the two existing spans
precisely to avoid duplicate entrances (the 417 class). New routes live in the
same `ROUTES` map (`insclients`, `claims`, `partners`, `bids`).

`#leadsView`'s subtitle reads "All CRMs" as of 755 — it has no CRM facet and
never had one; the old "Retail only" label was measured false.

## The header outranks the tool screens — `cr-mounthead-styles` (756)

The five module mounts — `#cr-claims-mount`, `#cr-pricing-mount`,
`#cr-estimates-mount`, `#cr-coach-mount`, `#cr-adjusters-mount` — sit **below the
header at every width**, `top:var(--headh) !important; z-index:60 !important`.

⚠️ **`!important` is mandatory**: `styleMounts()` writes
`position:fixed; inset:0; z-index:200` as INLINE styles, which outrank every
non-important declaration.

⚠️ **Do not re-gate this on `body.cr-lnav-on`.** That class is desktop-only, and
gating it there is exactly what hid the header on every phone from 561 to 755
(BUG_CLASSES 41). The desktop rule still exists and still owns
`left:var(--lnav-w)` — that one *is* device-specific and stays gated.

`.cr-pme-exit` (the mounts' floating Home) sits at
`calc(var(--headh,110px) + 10px)`; `--headh` already includes the safe-area
inset, so there is no separate mobile case.

## One home destination — `CardinalHeader.goHome()` (756)

**Every control that means "take me home" calls `goHome()`**, which reads
`crmHead()` and lands on Cardinal Truth / the Community hub / the retail
dashboard. Callers: `#cr-hd2-home` (the gold house), `#cr-home-btn` (floating),
and `crCloseAll()` + `cr-pme`'s own fallback (the tool screens' Home).

**Do not add a fourth copy of the ladder** — before 756 there were two, and the
other two controls just called `showHome()` and landed on retail from every CRM.

Each branch tears down through `hideAllViews()`, so **leaving a tool screen
closes the tool screen**. `showCardinalTruth()`, `showInsuranceClients()` and
`showResourceLibrary()` were converted to call it at 756; `#landingView` is still
hidden by hand because it is deliberately absent from `hideAllViews()`.

## One Home button (757)

`#cr-hd2-home`, the gold house in the header bar, is **the** Home control. It is
present on every screen including all five tool screens (756), and it routes
through `CardinalHeader.goHome()`.

**Retired at source in 757** — do not re-add either:

| Retired | Was | Why it went |
|---|---|---|
| `#cr-home-btn` | floating in `#navWrap` beside the portal chip | one row under the gold house, same job. `cr-hd2-styles` had already declared it `display:none` at 416/417; its module beat that with an inline `display:inline-flex` for ~340 builds |
| `#cr-pme-exit-btn` | floating "Home" on each tool panel | sat just under the gold house once 756 made the header visible there |

**Kept on purpose**: `Escape` closes the open tool screen (cr-pme, not duplicated
anywhere), `crCloseAll()` (two other modules call it), and `cr-home-cleanup`'s
`updateHomeBtn()`, which already no-ops when the button is absent.

Their stylesheets (`cr-home-btn-styles`, `cr-pme-styles`) were deleted with them.
Dead references remain in `cr-print-styles`, `cr-touch44-styles` and
`cr-home-cleanup-styles` — harmless selectors that can never match, left rather
than surgically edit three long minified lines for no behavioural gain.

## Photo Activity is CRM-aware — `phCrm` (759)

Opening Photo Activity preselects the CRM you were standing in
(`CardinalHeader.crmHead()`), and a chip row (`#phCrmChips`, reusing the global
`.ljchips`/`.ljchip`) switches between **All / Retail / Insurance / Community**
with a count on each. The subtitle (`#phScope`) states the active filter.

- `project_photos` has **no CRM column** — the CRM is derived from the joined
  project via `projClaimType()`.
- **An untyped job counts as retail**, matching `crmNow()`/`crmHead()`, so the
  three buckets always sum to the total shown in the All chip.

## `projPhone(pr)` — the one phone resolver (759)

`{ digits, pretty }`. Declared at depth 0 beside `projHomeowner()`, so it is a
genuine global. Order (copied from `phoneHay()`, 743):
`projects.phone → lead.phone → lead.homeowner_phone → lead.renter_phone →
lead.phones[].v`, normalised through `crValid.phone()`.

⚠️ **11 of 34 production projects keep the number ONLY in
`lead.homeowner_phone`** — any feature reading `pr.phone` alone is invisible for
a third of the book. `ck.contacts` is deliberately NOT consulted: it is unused
in production (0 of 34 rows), and `dbSwitchPrimary` promotes a contact **into**
`projects.phone` anyway.

**Only the Production dossier's Call button uses it so far.** Seven other sites
still hand-roll `String(pr.phone||'').replace(...)` — repointing them is a known
follow-up, listed in OPEN_ITEMS.

## The Exterior Designer — `cr-des-styles` / `cr-des-script`, `window.CardinalDesigner` (761)

Theo, 12 Aug: an AI exterior home designer — *"This is a sales resource in front
of clients… I can already do this on gemeni, just want to look more professional
doing it in the vision suite."* Photograph a house, pick materials, and the SAME
photograph comes back wearing them — before/after under a drag slider.

- **Doors**: a Designer tile on the Vision hub (`data-go="designer"`), and a
  `.cr-lr-show` row beside Showroom on the ordinary landing (≥820px gate;
  phones use the hub). Registered in `hideAllViews()` (class-shown, own
  `close()`), `navRestore('designer')`, and the `__crNav` wrap — PLUS `open()`
  records `navSetView('designer')` itself, because the central wrap runs on a
  400ms timer that can fire before the LAST script in a 4.2MB document has
  parsed (measured: same artifact, wrapped on one run and not the next;
  navSetView's double-push guard makes the two paths compose).
- **Surfaces**: roof from `oc_colors` — hidden excluded (the Shasta White rule)
  AND discontinued excluded: the Designer offers what Cardinal can order,
  unlike the Colors wall, which badges history so an old roof can be
  identified. Different jobs, different filters, both deliberate.
  Siding/trim/gutters/windows come from small curated palettes in the module —
  colour suggestions, not product claims.
- **Engine**: `api/design.js` — the first image-GENERATING route in the app
  (the 534-era "no image generation in this app" fact retires here). Signed-in
  gate (a sales tool, deliberately not admin-only), 5MB cap, pinned surface
  vocabulary, server-pinned prompt wrapper (same house, same geometry, only
  the listed surfaces change), ladder `gemini-3.1-flash-image` →
  `gemini-2.5-flash-image` with the settled 1.2s 503 pause, and `{probe:true}`
  listing which image models the deployed key can actually reach — OPEN_ITEMS'
  one unverified thing, closed the way it recommended. No OpenAI fallback on
  purpose (vendor decision settled 1 Aug). ~$0.067/image.
- **The fence** (CONTRACTOR_VISION_SUITE, presentation-only): every render is
  badged AI CONCEPT on screen and BURNED into the saved JPEG (`burnMark()`).
  Saved designs live in `design_renders` + the `designer/` prefix of the photos
  bucket (`design_renders.sql` — all staff read/insert-own, owner-or-admin
  delete) with NO join to project_photos, reports, claims or CompanyCam.
- Gallery is shared team-wide; delete selects the id back (the silent-204
  lesson). `gate_761.mjs`: 18 green · 15 red on the v760 negative control.

### 762 — Studio White, full screen, house first (same session)

Theo's picks off six rendered options: the Designer is now **single-theme
Studio White** (the first LIGHT Vision surface — warm paper, red accents, all
literals), **full-bleed** (the `body.cr-lnav-on` framing rule is deleted; no
header, no left nav, and `cr-des` joined the 694 theme-toggle exclusion list so
the floating switch no longer hovers over it), **house-first** ≥900px (sticky
hero stage ~746px + a 396px picker rail; stacks below 900px), and **showroom
voice** — no "AI" anywhere a client reads: tag `AFTER · CARDINAL DESIGNER`,
badge `DESIGN`, burned mark `CARDINAL DESIGNER · VISUALIZATION`. The images
are still AI-generated and the internal record still says so (`via`, banner,
docs). `gate_762.mjs`: 23 green · 5 red on the v761 control.

## Production + Punch-Outs (builds 766-772) — REPLACED the 393/603 board

| Feature | Where | Notes |
|---|---|---|
| Production screen | `cr-pb-styles` + `cr-pb-script`, `#cr-pb`, `window.CardinalProduction` | Three panes in one view: home / cal / list. Five boxes: Needs ordered · Ordered · Scheduled · Punch-outs · Closed repairs. Back goes up ONE level, never straight Home. |
| Full calendar | the `cal` pane | Month grid, NAMED chips (build/punch/drop/closed), day sheet, "Needs a date" = Curtis's dispatch queue. Absorbs the dashboard's mini production calendar — one calendar per concept. |
| The punch-out card | `cr-pk-styles` + `cr-pk-script`, `#cr-pk`, `window.CardinalPunchCard` | **THE** punch detail screen. Four entry points route here: Production, Punch & Repairs (`openDetail`), the client profile tab, and `CardinalPunchProfile.openItem`. |
| Field SOP checklist | `punch_items.steps` jsonb (`punch_steps.sql`) | Trade templates (roofing/siding/gutters), steps that refuse to tick until a note is written, manager can add/remove/reorder. `template` column records the seed. |
| Guided photo slots | the card | Overview · Close-up · Cleanup · Material · Final. Feeds the existing 5-photo close gate. Remove pip on filled slots. |
| Supplement flag | the card | Files extra scope as its own URGENT item on the same job + notifies the office. **No money fields** — pricing stays in the office tools. |
| Notifications | `notifyAssignee` (cr-pb), `notifyAssigned`/`notifyClosed` (cr-pk) | File/assign notifies the owner; close notifies the office. Never yourself, never for unassigned. Chat stays @-only. |
| Materials ordered | `checklist.materials_ordered_at` + `_by` | Written from the Materials tab (`saveCkPatch`) and from the board's list (`patchProjectCk`). Answers the "Materials?" chip. |
| Closed repairs | `buildActivityEvents()` | A closed punch-out is NOT deleted — it becomes the client's repair history. |

**Roles**: manager card = admins + **Curtis** (Scottie's boss, dispatches the punch-outs). Field mode =
everyone else in production. Field keeps the full messenger, photos, checklist ticking and close; it loses
reassign, the schedule picker, step editing and the urgency toggle.

**Fences held**: no money anywhere on Production · no photo GPS · quick-tick close kept · one calendar per
concept · no new body observer · no 14th scroll-lock writer (the card uses `overscroll-behavior:contain`).

## Build an estimate from ABC Supply's catalog (build 774)

| Feature | Where | Notes |
|---|---|---|
| `+ ABC Supply` | `cr-est-script` items head, beside `+ From Library` and `+ Custom` | A **third source on the SAME picker**, not a second picker. `openPicker(mode)` takes `'library'` or `'abc'`; the sheet retitles, re-placeholders and grows a Search button. |
| Remote search | `abcSearch()` → `CardinalABC.search()` | Runs on **Enter or the button only, never per keystroke** — every press is a paid round trip to ABC. The library half still filters as you type; `oninput` is gated on the mode. |
| Tap to add, priced | `abcPick()` → `CardinalABC.price()` | Lands a line item carrying ABC's branch price, the item number, the description and the stocking UOM. |
| `abc_item` on the line | the pushed line object | The ABC item number rides along so a future purchase order knows what to actually order. Nothing reads it yet — it is deliberate forward wiring, and it is why the seam exists at all. |
| Failure never blocks | `abcPick()` | A price error **still adds the line, at $0**, with ABC's own sentence in an alert. A rep mid-estimate in front of a client types the number off a quote and carries on; an account problem must not strand the estimate. |
| No account set | `abcCfg()` | Says *open Suppliers and set your Ship-To and Branch* instead of returning a 401. One place to configure, named in the message. |

**The seam**: `window.CardinalABC` now exports `search`, `price` and `cfg` (via `Object.assign`, so `open`/`close`
survive). Both wrap the **same `api()`** the Suppliers screen uses — one code path, so tonight's six fixes apply
here for free and a future fix cannot drift between the two.

⚠️ **The contrast trap caught this build too.** `+ ABC Supply` first shipped `#2a6b3c`, which is **3.06:1** on the
editor's dark ground — under the 4.5 floor for 10.5px bold. Fixed the way its own neighbour already does it: base
rule keeps the light-ground green, `cr-nvl-styles` carries the dark twin, exactly as `.add-custom` does
(`#8f1620` → `#f0a3a9`). `#78c98e` was picked by arithmetic at **9.87:1** to match `.add-custom`'s 9.84:1, so the
two buttons read at equal weight. **The contrast check is now IN `gate_774.mjs`**, so it cannot come back quietly.

`gate_774.mjs`: **27 green · 24 red on the 773 control**. The three that pass on the control are deliberate
regression checks (the old `CardinalABC.open` survives, the editor still opens, Library mode still says Library).

## CompanyCam photographs into the Photo Album (build 777)

| Feature | Where | Notes |
|---|---|---|
| `From CompanyCam` button | `#galCcBtn`, album toolbar (`galleryView`) | **Admin-only, set on every `openGalleryMode`** — api/companycam 403s everyone else, and a button that 403s the reps is worse than no button (the rccGate rule). Hidden in Inspection Photos mode. NOT in `enforceAlbumButtons()`'s un-hide list, on purpose. |
| Picker panel | `#galCcPanel` + `cr-galcc-styles`, above the pae tabs | Light card (the `#galXferMenu` precedent), every colour a literal. Opens seeded with `currentProject.address` (name as fallback) and runs the search itself; results from the previous client are cleared by a `galCcFor` project-id check. |
| Search | `galCcFind()` → `/api/companycam {action:'list'}` | The same index-first search the report picker uses (473/496) — address, job name or crew, across all ~60k photos. |
| Foreign-job guard | `galCcForeign()` | Marks picks whose `project_name`/`project_address` don't look like this client's property, and `galCcAdd()` asks before copying them in — these land permanently in a client's album, so the 486 guard was kept, not dropped. |
| Import | `galCcAdd()` → `{action:'fetch'}` per photo → `addGalleryFiles(files, metas)` | **The album's own pipeline, not a second one**: same 1600px canvas re-encode (EXIF/GPS stripped by construction), same `GAL_MAX` room check, same status line, same reload. Sequential fetches (CompanyCam publishes no rate limits — politeness is structural). Crew captions land in `project_photos.caption`, truncated at 500. |
| One-way door | `/api/companycam` unchanged | List + fetch only, internal photos refused server-side, bytes never come from CompanyCam's CDN, CompanyCam is never written to. |
| Reload fix | `photoDb.listByProject` select | **`section` and `caption` are now selected back** — both were written by the 211-era pae module and then dropped on every re-list, so tabs and captions reset on reload. Confirmed against production columns before shipping. |

**Signatures that moved (both optional-param only, all callers unchanged):** `photoDb.add(projectId, dataUrl[, extra])`
spreads `extra` into the insert (and the localStorage row); `addGalleryFiles(files[, metas])` passes `metas[i]` through.
**Fences held:** no new full-screen view (widget inside `galleryView`) · no new `document.body` observer · no 14th
scroll-lock writer · GPS never crosses (re-encode + explicit-field inserts, asserted in `gate_777.mjs`).

## Select all in the CompanyCam picker (build 778)

| Feature | Where | Notes |
|---|---|---|
| `Select all` / `Clear all` | `#galCcAllBtn` → `galCcToggleAll()` | One control, two jobs — it offers the move you have not made. A **partial** tick still offers Select all (finishing is the useful move, not starting over). Hidden when the grid is empty. |
| Cap warning up front | `galCcToggleAll()` | If more are ticked than `GAL_MAX - currentPhotos.length` allows, it says so **before** the Add press rather than after N fetches. |
| The album Back re-renders the overview | `galBackBtn` handler | **The bug Theo hit**: the gallery was the only client sub-page whose close never called `renderOverview()`, so the profile's Photos tile kept whatever number it was painted with on entry. `dbCloseTo()` has always done this for payments/tasks/docs/appointments. |
| Legible AI-caption failures | `inlineAiCaption()`, `paeImageDataUrl()` | Three failure paths (storage read / the API / the save) each name their step and point at the manual route (double-tap to type one). **Instrumentation, not a fix** — the underlying failure is still unidentified. |

## The roofing agreement matches the printed master (build 779)

| Feature | Where | Notes |
|---|---|---|
| Two-column spec sheet | `.specgrid` in `ROOF_AGREEMENT_BODY` + the estimate stylesheet | 13 numbered red-ruled sections plus Extra Structure, in the master's order and column split, with the house cutaway in the right column beside the items it points at. **One column under 640px** — a phone is not a Letter page. |
| A box on every lettered option | `.cbx[data-group="rdk"]` ×6, `[data-group="rvt"]` ×2 | Decking types A–F and the ridge vent's 1/2 printed as plain letters before. Grouped rows stay exclusive; flashing and extra structure stay multi-pick, as on paper. |
| Shingle **Style** dropdown | `data-crsel="style"` → **`CardinalColors.lines()`** (new export) | The OC hub's own `LINES`, filtered to `ready !== false`. A line added to the colour wall reaches the contract with no second edit — the 750 precedent, where the colour dropdown reads `list()`. |
| **Brand** dropdown | `data-crsel="brand"` | `Owens Corning` + `Other (see notes)`. **No competitor is named** (`OC_BRAND_RULES`), and a rep matching an existing roof is not blocked. |
| Quantity dropdowns ×6 | `data-crsel="qty"` | Layers to remove, pipe boots, skylights, box/turtle vents, power vent, turbine — 0 to 13+. |
| Decking prefill | the roofing-checklist prefill in `createReportFrom`'s template pass | **Ticks the matching box** by `data-val`, because 750's `collapse()` regex stops at the first `</span>` and cannot cross nested checkbox markup. Layers and pitch keep `collapse()` — the master leaves both as blank lines anyway. |

## Estimates: the count and the publish prompt (build 780)

| Feature | Where | Notes |
|---|---|---|
| The Estimates tile counts rows | `#dbEstN` in `renderAcxOverview()`, filled from `CardinalEstimates.loadForProject()` | It counted estimate-titled **documents**, so drafts were invisible and two estimates read as **0** while the box listed both. 654 fixed this shape on the legacy `#jaGrid` tile and never reached the one that renders. **Navigation count, not money** — `indexMoney`'s `SENT_EST` filter is untouched, asserted in the gate. |
| The publish prompt tells the truth | `cr-ess-script` publish hook | It promised to "move the pipeline forward" on a job already at Prospect, where `syncStageFor()` correctly does nothing. It now computes the outcome with the same `rank()` guard and says either *"X moves to Prospect"* or *"The pipeline stays at Prospect"*. |
| The Sent write is visible, and audible when refused | same | Toast + `refreshSavedList()` + `renderOverview()`; the UPDATE carries `.select('id,status')` so a refusal is an **error**, not a silent no-op, and says the document was still created. |


## The showroom door renders no CRM (build 805)

| | |
|---|---|
| Where | `showMain()` in the main block; `cr-lr-styles` for the CSS half |
| Trigger | `location.hostname` starts with `showroom.`, or `?vision=1` |
| Effect | `#landingView` (the Vision hub) is the entire screen. `mainView` is not shown, `showLanding()` and `reload()` never run, so **no client data is fetched**. |
| Hardening | `body[data-cr-vision="1"]` + a stylesheet `!important` hides `header.site`, `#pwaNav` and `#navWrap`. An inline `display:none` does **not** hold — five call sites restore it. |
| Untouched | `app.cardinalroster.com`, asserted identical on 804 and 805 by `gate_805.mjs` |

⚠️ **This stops the CRM being SHOWN, not being DOWNLOADED.** A showroom tablet still receives the whole
4.4 MB file. Only a separate `showroom.html` removes the code — `OPEN_ITEMS`' Option 3.

⚠️ **Do not restore the `window.CardinalLanding.isVisionHost()` lookup in `showMain()`.** That object is
defined ~22,000 lines later in the file and is reliably `undefined` when `showMain()` runs on a session
restore. Measured with a probe, not inferred.

---

## Build 806 — the librarian runs on Claude (`api/librarian.js`)

`api/librarian.js` is the Resource Library's assistant. At 806 it moved from Gemini to
**`claude-opus-5`** via `@anthropic-ai/sdk`. **The JSON it hands back to `index.html` is
unchanged, field for field** — that is the contract, and `gate_806.mjs` proves it by running
the old route and the new route against the same model output and diffing what each emits.

**What went away, and why it is not coming back:**

| Removed | Was there because |
|---|---|
| the four-rung ladder — `gemini-3.6-flash` ×2 → `gemini-3.5-flash` ×2 → `gpt-4o-mini` | the free Gemini tier 503'd about one call in four. A second provider quietly answering roofing-code questions is worse than an honest error |
| `OPENAI_API_KEY` | the third rung. **This route no longer reads it.** Other routes still do — `caption.js` has the same ladder |
| "Respond with ONLY raw JSON, no markdown fences" as a *hope*, and the ```-strip behind it | the shape is now enforced by `output_config.format`. The strip was a latent corruption bug: any answer whose `body` legitimately contained a fence would have been mangled before `JSON.parse` |

**What is deliberately unchanged:** the Supabase session gate, the scope fence (reference
material only — no clients, no job paperwork), the `~~photos` exception of 471, the `~~stack` /
`~~flow` / `~~bars` / `~~pitch` diagram vocabulary, the 510 marker-spacing rule, the citation
rules, the `sources` sanitiser of 446/512, and the `belongs:false` refusal path.

**Shape of the request now:** the standing brief (`RULES` + the writing brief, or `RULES` +
`SHAPE`) is the **`system`** block and carries `cache_control:{type:'ephemeral'}`; the volatile
half — the library outline and the actual question — is the **user turn**. Splitting it that way
is what makes the prefix cacheable. `output_config.effort` is **`medium`**: it is the latency
lever, and thinking is the reason to be on this model at all. Raise it to `high` if answers get
sloppy; that is the one knob.

⚠️ **`ANTHROPIC_API_KEY` must be set in Vercel env or this route 500s** with a message naming
the variable. `GEMINI_API_KEY` is still needed by `caption.js` / `organize.js` / `analyze.js` /
`sol.js` and must not be removed.

⚠️ **One narrowing, on a path that has never carried traffic.** Gemini swallowed any mime type;
Claude reads PDFs and photographs. Uploading anything else to the librarian now gets a 400 that
says to save it as a PDF or paste the text. Measured before narrowing: **all 32 `library_items`
rows are `kind='note'`** — 21 written by the AI from a typed question, 11 seeded. **Zero files or
images have ever gone through this route.**

**It was priced before it was switched, on real traffic:** 21 real questions, 5,803 chars in and
2,221 out on average, ≈**$1/month** at the observed rate and $7.25/month at ten questions a day.
Cost was never the constraint. `scripts/librarian_measure.mjs`-style measurement ran the *shipped*
handler with a stubbed transport, so the sizes are what the route really sends, not an estimate.

---

## Build 807 — the Exterior Visualizer (`visualizer/index.html`), and the death of `cr-des`

**The AI Exterior Designer of 761–762 is gone.** Not disabled — removed: `api/design.js`
deleted, its `vercel.json` entry removed, and the `cr-des-styles` + `cr-des-script` blocks cut
whole out of `index.html` along with all five wirings (`hideAllViews()`, the `navRestore()`
case, the `__crNav` wrap, the `BLACKOUT` list, the hub handler). **35,420 characters removed.**
A dead module that still registers in `hideAllViews()` is exactly the buried thing the prime
doctrine warns about.

### It is a SEPARATE APPLICATION, and build 805 is the reason

`visualizer/index.html` contains **no CRM code at all** — asserted, with the same test run
against `index.html` as its control (7/7 markers trip there, 0 here). Build 805 proved a
hostname check inside one big file separates nothing: the code still ships to the tablet and
one missed branch paints the pipeline on a customer-facing domain. There is nothing here to
miss.

It is a **folder** so it can become the root of its own Vercel project. Until that exists it is
served by the main project at **`/visualizer/`**, which is what makes it reachable today. Both
tiles that used to open the old designer (the Vision hub tile and the showroom rail) route
through **one** handler, which now goes to `window.CR_VISUALIZER_URL || '/visualizer/'` — moving
it to its own subdomain is that one line.

### The three screens, and why they are three

| | |
|---|---|
| **Prep** | at the office. Pick the house photograph, pick materials per surface, queue the combinations. |
| **Review** | a person looks at every render before a customer does. `approved` starts **false** and only this screen sets it true — the same rule The Walk runs on. |
| **Present** | at the kitchen table. **Approved renders only**, already made, so a tap is instant. The queue bar is not rendered here at all. |

That split **is** the settled decision "pre-render before the appointment". A Generate button
in Present would undo it.

### Contracts, measured not assumed

- **Roofing is `oc_colors`; everything else is `materials`**, whose `category` CHECK excludes
  roofing so the two catalogs cannot disagree about a shingle. `oc_colors` has **no prompt
  column** — it is the brand reference the Colors hub renders — so the roof prompt is
  **composed in the browser** from the colour's own recorded facts and **frozen into the job**.
  A render can always be traced to the exact words that made it.
- **`source_path` is `project_photos.storage_path`.** Checked before building on it, because
  CLAUDE.md records a photo-signing change that shipped completely inert against this exact
  column: **223 of 223 rows have it**, all under `projects/`.
- **The job row names four fields and only four** — `project_id`, `source_path`, `selections`,
  `created_by`. `created_by` must be the signed-in email or RLS refuses the insert.
- ⚠️ **The GPS fence is asserted here too** — schema, worker, and now the front end. No
  coordinate travels with a job. **Do not "complete" that row.**
- Signed URLs, never public ones, and **never written to a row** — they expire.

### Sign-in

Its own `storageKey: 'cr-viz-auth'`, `persistSession`, `autoRefreshToken`. Studio and the CRM
both use the supabase-js default key (derived from the project ref); on a shared origin three
apps would fight over one session. **This is the answer to Theo's "Studio keeps logging in"
complaint for the new app only — Studio itself is untouched and still asks.**

### Gate

`gate_807.mjs` — **33/33 green**, and **6 red on a mutant** with three planted defects (no
private storage key, Present showing unapproved renders, `created_by` dropped).

⚠️ **Two assertions in it were passing vacuously and are worth knowing about.** The surface
pickers live inside closed `<details>`, so `innerText` returns "" for all of them — the test
meant to prove a hidden colour is never offered was reading an empty string and passing on
anything. And the GPS-fence regex was written `/\b…\b/` inside a **plain regex literal**, where
`\b` is an escaped backslash, not a word boundary; it could never match. Both now read the DOM
and the fence check carries a **self-test that plants a coordinate and requires a catch**.

### Not yet true

**Nothing renders until the Spark is switched on** (`spark/VISUALIZER_SETUP.md` §1–4). Queued
jobs sit at `queued` until then, which is correct behaviour, not a fault. This build could not
be verified end to end and was not claimed to be.


## Build 809 — the landing ground reaches the bottom of a screenshot

**Where:** `<style id="cr-lr-styles">`, one rule beside the existing landing light-mode block.

`#landingView` is a `position:fixed;inset:0;overflow-y:auto` pane (inline, in the markup at ~4325),
so its ground paints **one viewport** while its content is ~1471px. An iPhone Full Page screenshot
captures the **document**, and the difference fell through to `body{background:var(--bg)}` — the
**app** theme token, not the landing's. Light-mode cards on a black slab; invisible in dark mode
because both grounds are `#09090c`.

`html[data-mode="light"]{background:#f7f5f2}` puts the ground on the canvas, which is the only box
that always covers the capture. **Light only** — no dark twin ships, because body's `var(--bg)`
already propagates correctly there and the dark rule measured as a no-op.

**Gate:** `scripts/render_landingground.js` (Chromium — jsdom cannot see an `!important` ground on
a fixed box). 12/12 green on 809, **6 red on 807**, at 390px and 1440px, both themes.

⚠️ The screenshot still ends where the pane's content ends — the page does not scroll, the pane
does. Fixing that means un-fixing the landing, which is a nav change, not a CSS one: nothing hides
`header.site` on the landing today except the landing's own `z-index:150`.
