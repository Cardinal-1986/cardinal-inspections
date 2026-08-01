# Cardinal Resource App — Feature Inventory

**Purpose: a map of what already exists, so nobody — human or AI — builds a second version of something that's already here.**

**Rule: read this before proposing any new feature. If something related exists, extend it.**

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

**Both themes get their own value, and it is not one palette recoloured.** Cardinal red `#c8202e`
is **3.40:1** on the dark rail and fails, so dark uses `#ef6b6b`; a true yellow is **1.6:1** on the
light rail, so light uses amber `#8a6100`. Contrast was measured against the rail, the active card
*and* hover in each theme — the active card counts because these labels stay coloured when their
row is the current page.

Desktop-only comes free: `--lnav-w` is `0px` except inside `@media (min-width:1100px)`.
