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
- **Community Analytics (`cr-can`) is a CARD PER PARTNER (1092).** Habitat first (same `/habitat/i` rule as cr-cpartners), each card: open estimates, out-for-pricing, awarded, win rate, oldest-open aging pill, and **tarps up** (Theo's aging-tarp count — `tarped_at` set on an unfinished job). Summary strip: Out for pricing / Awarded / Win rate / Tarps up. Opened by a **chart button in the hub tab strip** (`.cc-analytics`, reuses the existing `data-go="analytics"` handler) — moved out of the Tools list. Every ink is a `--ccm-*` token; `pcolor()` name-matches the four documented partner colours for the 4px card edge only.

---

## Insurance CRM (Cardinal Claims)

`cardinal_truth_home` (`cr-cth`), `insurance_clients` (`cr-ic`), `sol_intake` (`cr-sol`, Scope of Loss reader, files to 20 MB), `supplement_panel` (`cr-sp`), `insurance_unify` (`cr-iu`), stage machinery (`cr-insstage`), Adjuster Directory (`cr-adj`). ACV/RCV/depreciation/supplement tracking.

**New insurance leads accept a Scope of Loss (358)** — attach the carrier scope on the lead form; saving opens the new claim and runs the existing reader against it. Optional; without a file the form behaves exactly as before.

---

## Estimates

**Entry point (379):** the burger menu's 💰 **Estimates** and the ⌘K palette both open this page. The duplicate "⚡ AI Estimates" menu entry was retired — AI estimating is the red button inside the page. A legacy flat-table estimates view still exists in `LIST_DEFS` but is now unreachable.

**One merged API since 308** — `Object.assign(window.CardinalEstimates || {}, {...})`. Status lanes since 339: **Unsent → Sent → Accepted**, Status ∩ Rep ∩ Trade filters, ⚑ at 5+ days, **no caps and no auto-archive**, desktop dual-pane with live pipeline sums. `estimate_line_items` is the shared price book. Photo attach via `#cr-pae-actionbar`.

**Per-line Detailed / Flat (1096).** Each line carries its own `flat` boolean (jsonb, no schema change — `save()`/`currentState()` strip only `_lid`). A **Detailed | Flat** segmented switch (`.cr-est-rowmode`) sits on every line: Detailed multiplies `qty × unit_price`; Flat collapses Qty/Unit away (`renderLine` → `.pricing.lump`) to one description + one lump `amount`. `computeTotals`, `refreshTotals`, `buildDocHtml` (client proposal — a flat line spans qty/unit/rate with `colspan="3"`, clean scope) and the Community bid sheet all decide **per line**. Toggling to Flat seeds the lump from `qty × rate` and focuses the price. Keyboard: **Enter** on the last money field spawns a new line in the same mode; **Tab** walks to the next line's entry (Qty detailed / Description flat). Old globally-lump estimates (`itemized === false`) migrate to per-line flat once on open, guarded. **This retired the old global "Qty / unit" checkbox** — the per-line switch replaces it.

**Line-item sections (1097).** Lines group into titled sections. Each line optionally carries `section_id` + `sec` (jsonb, no migration). `estGroups()` → **`window.crEstGroups`** is the ONE grouping model, read by the editor (`renderLinesGrouped`/`renderSectionHead`), the proposal (`buildDocHtml`) and the Community sheet — grouped by first appearance, ungrouped lines under an implicit **General Scope** (id `''`). **A single ungrouped group renders flat, no banner** — legacy/simple quotes untouched. Editor section header: chevron collapse (`secCollapsed`, UI-only), editable title with `<datalist>` autocomplete, **live subtotal badge** (`refreshTotals` repaints it), ▲/▼ block reorder (`moveSection` rebuilds the flat array, sections stay contiguous), per-section **+ Line** (`addLineToSection`), a **+ Section** button, and a per-line move-to-section `<select>` (`moveLineToSection`). `addLineAfter` inherits the section + mode. Proposal/Community print each section as a banner (`tr.sec-banner`, Cardinal-red divider) + per-section subtotal before the grand total. `--est-*` porcelain tokens.

**Saved assemblies (1098).** An assembly = a named bundle of lines that injects as one titled section. **Hybrid storage:** **6 defaults in-code** (`EST_ASSEMBLIES` — Theo's curated cross-trade set: Full Roof Replacement (OC Duration) + Metal/Standing Seam under Roofing, Composite/Vinyl Siding, Aluminum Fascia & Vented Soffit, Seamless 6" K-Style Gutters, Full-Frame Window Replacement — all $0), custom ones in **`estimate_assemblies`** (`estimate_assemblies.sql` — shared read, author/admin write, `created_by DEFAULT my_email()`). **+ Assembly** opens `#cr-est-picker` in `'assembly'` mode (`renderAssemblyPicker`, grouped by trade); each card carries an optional numeric input → `expandAssembly` scales the field lines by **two axes** (`per_sq` × squares, or `per_unit` × count for windows), leaves LF/EA base lines at their starting qty, keeps flat, drops `per_sq`/`per_unit`; the input is labelled Squares or Windows. `injectAssembly` stamps a fresh `section_id`+title and appends. **Save as Assembly** on a named section header (`saveSectionAsAssembly`) names it by the section title, strips editor keys, inserts. `loadAssemblies`/`deleteAssembly` degrade to defaults-only if the table is absent. Defaults can't be deleted. Gated: `harness_estasm1098.js` + `render_estasm1098.mjs`.

**Proposal polish (1099).** The client-facing estimate (`buildDocHtml` in `cr-epub-script`) reads as a finished proposal. Section banners carry a red left accent + deeper tint (`#f3efe8`) — refined **in place**, one `tr.sec-banner td` rule, not stacked. Faint zebra on **item rows only** (`tr.zeb td{background:#f7f6f3}`): `rowFor(l, zi)` computes the class and a continuous `_zeb` counter threads the section map so banners/subtotals are never striped. Print protection: `tfoot{break-inside:avoid}`, `h2.sec{break-after:avoid}`, `tr.sec-banner{break-after:avoid}`, deposit box + card `avoid-break`. Closes with an **Acceptance & Authorization** card (`acceptBlock`) — money recap (Contract Total / Deposit Due at Signing % / Balance; deposit+balance cells only when a deposit exists), authorization line, Client + Cardinal signatures; labels use `--muted` (≥4.5:1). A **Hide subtotals** toggle in the preview toolbar flips `body.hide-subs` (hides `tr.sec-sub`) for a simpler one-number quote — preview/print only; the published doc keeps subtotals. Gated: `render_estdoc1099.mjs` (shipped `buildDocHtml`, WCAG contrast) + `harness_estdoc1099.js`.

**Roof Options — Good / Better / Best (1140).** An **Options** button in the estimate toolbar (`#cr-gbb-btn`, `cr-epub-script`'s `injectButton`) builds one client-facing sheet showing **two or three of a project's saved estimates side by side** — Good / Better / Best — the middle of three badged "Most chosen", an initial box on each, one signature block. **No new table:** it reads estimates via `CardinalEstimates.loadForProject` (build one, **Duplicate** it — 1138 — change the shingle, save; those are your tiers) and `publishGbb()` writes through the same `window.db.create` rails as a single estimate, opening as a shareable / printable / signable document. `buildGbbHtml(tiers, project)` renders each column from that estimate's **own** line-item names (`gbbBullets`, real scope) + its `total`; a per-tier **monthly** field renders "or about $X/mo financed" + a footer financing note, and is blank-hides (the slot for a Service Finance payment). The picker `#cr-gbb-pick` (`<style id="cr-gbb-styles">`, id-scoped dark, literal colours — 448-449 immune) pre-fills Good/Better/Best cheapest→priciest; one estimate can't fill two tiers. Exported `CardinalEstimatePublish.buildGbbHtml/publishGbb/openOptions`. Gated: `gate_1140.mjs` (Chromium — 3/2-tier structure, badge only on middle-of-three, picker→Generate→`db.create`; control RED on 1139).

**Roof Options financing (1142).** The picker's **Financing plan** dropdown (`.gbbp-plan`) carries Cardinal's three Service Financial programs: 9.99% APR / 120 mo, 6.99% APR / 60 mo (amortizing), and 24 months no payment, no interest (deferred). `GBB_PLANS` + `gbbMonthlyPayment(principal, apr, months)` (standard amortization; 0% → principal/months). `buildGbbHtml(tiers, project, plan)` computes **each tier's monthly from its own total** — an amortizing plan renders "or about $X/mo" per column with `{apr}% APR for {months} months through Service Financial · subject to credit approval (W.A.C.)` in the footer; the deferred plan shows the no-payment promo in the footer with no per-column monthly; None hides financing. A tier's own `monthly` is a legacy fallback used only when no plan is passed (this replaced the 1140 per-tier manual monthly input). **(1143)** the dropdown now carries the full Service Financial catalog (34 plans) grouped into `<optgroup>`s — same-as-cash (2003–2024), 0% equal-payment (3025–3072), deferred-interest (1006–1024), reduced-interest 4xxx, and FEMA — with per-family math: `factor` uses Service Financial's own payment factor (`total × factor%`), `equal0` = `total / months`, `fema` amortizes the paying term, same-as-cash/deferred show a footer promo with no monthly. `gbbPlanLabel`/`gbbPlanFooter`; a tier outside a plan's `[min,max]` shows no monthly. **Dealer fees are not stored (public file).** Gate: `gate_1142.mjs`. Open: no live dealer apply-link yet (needs Theo's Service Financial application URL).

**Financing Rates reference (1153).** A staff-only full-screen reference at **Menu → Selling → Financing Rates** (`#cr-fin`, `window.CardinalFinanceRates`/`showFinanceRates`, `cr-fin-script`+`cr-fin-styles`, Blackout single-theme). Lists the whole Service Financial catalog grouped like the portal, with plan #, program, rate, term, payment factor, loan range; a header **amount box** computes each plan's monthly live (`CardinalEstimatePublish.planMonthly`). Reuses the ONE catalog — `cr-epub-script` exports `plans`/`planGroups`/`planFooter`/`planMonthly`; `gbbPlanMonthly` is the shared math (`tierMonthly` delegates to it). **Dealer fees are admin-only:** `finance_plan_fees` (`finance_plan_fees.sql`, `is_cardinal_admin()` RLS; fee VALUES loaded to Supabase, never committed). The screen shows the gold Dealer-fee column only when the RLS-gated fetch returns rows (admins); reps and the public file get nothing. Registered at all five nav sites (hideAllViews/ROUTES/menu/wrapNav/navRestore). Never customer-facing. Gate: `gate_1153.mjs`.

**One-tap send-for-signature (1141).** A **Text to sign** button on the document toolbar (`#textSignBtn`, beside Email to client) does the whole send in one tap: `saveCurrent()` → `ensureShareToken()` → opens the phone's Messages app via `sms:<digits>?&body=<note + link>` pre-addressed to the client and pre-filled with the secure `/api/share?t=` link (the app's existing sms-deep-link convention). No phone on file → copies the link + prompts. Works on every document type. **The estimate proposal is now actually signable from that link:** `buildDocHtml`'s client acceptance label is `Client Acceptance &nbsp;|&nbsp; Date` (was "Client Signature & Date"), which is the exact form `share.js`'s `SIGN_RX` / `clientsign.js` match to inject Accept & Sign and stamp the signature — the 1027/1099 redesign had silently left it review-only. Gate: `gate_1141.mjs` (SIGN_RX signability + both button branches; control RED on 1140).

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

⚠️ **1091 — Community says "estimate", not "bid" (Theo's call, his third time on
the CRM feeling confusing).** DISPLAY TEXT ONLY: the Bids tab → **Estimates**, New
Bid → **New Estimate**, the client page's Bid tab → **Estimate**, and the two "bid"
rungs of the ladder below. **Award-side labels are deliberately unchanged** — Theo,
verbatim: *"bid awarded is still good"* — so **Awaiting Funding / Awarded / Not
Awarded / Build Complete** stay, as does `OC_AUDIT`'s "Bid awarded" / "Bid not
awarded". **Nothing under the hood moved**: `CardinalNewBid`, `commBidAmount`,
`showBidModal`, `go:'bids'`, `'allbids'`, `tab==='bid'`, `data-cpane="bid"` and
every `crBid*` are untouched — this is the LABEL on the one pipeline, not a fork.
The changelog's historical "bid" mentions were left as-is (history).

| Stage value | Community label |
|---|---|
| `Lead` | Estimate Requested |
| `Prospect` | Estimate Submitted |
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
| **847** | **A Jobs history tab** per crew: every `crew_work_orders` row newest-**created** first — the date it was made (`created_at`), client (from `cacheProjects`), WO number, status chip (Draft/Dispatched/Completed/Superseded, superseded dim), scheduled/done date. Admin-only Amount + per-job Paid columns and Billed/Paid-to-crew totals, behind the same `canSeeRates()` fence as Payments; production sees jobs + dates, not dollars. No schema change. Gate `render_crewjobs847.mjs` (15/15) |

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

⚠️ **`collections` is the ONE door for money received — both entry points now agree.**
On the Payment Information page the "Received" section's + button (996) **and** its
heading tap (1036) both route to `payGoLogCollection()` → this tab; the legacy
`dir:'in'` add modal is unreachable from Received. Money logged the old way books no
commission and, since 721, is ignored by Balance Due whenever any collection exists
(`jobFinance`: `if(collPaid[pr.id] !== undefined) paid = collPaid[pr.id]`). "Paid" /
"Additional Job Expenses" are job costs and keep the legacy row modal. **Do not add a
second money-in writer** — `checklist.payments` `dir:'in'` is legacy-read/migrate only.

⚠️ **Job Value precedence (654 → 997 → 1011), all inside `jobFinance()`:** signed
contract wins outright → else max(manual, best estimate). "Best estimate" is 997's
tiers over the estimates TABLE (accepted/signed = tier 2 beats sent = tier 1; largest
within the tier), and since 1011 the `Estimate…`-titled doc leg respects them: at
tier 2 no doc competes at all, and a doc any estimates row points at via `doc_id`
(`estDocIds`, any status/archived) never counts as a second estimate — only true
legacy document-only estimates still feed the leg. `estTier`/`estDocIds` are globals
filled by `indexMoney()`. **Do not add another estimate-valuing scan anywhere** —
Balance Due, the AR chart, pipeline dollars and the invoice all inherit from here.
Gate: `gate_1011.mjs` (executes the shipped functions; RED ×3 on build 1036).

⚠️ **Contract deposit precedence (781 → 785 → 1012), in `fillContractMoney()` — the ONE
place a contract's money is written:** an explicit `est` row passed in (estimate→contract)
governs outright; else the deposit follows the SAME tier ladder as the price —
accepted/signed, then sent/approved, then draft as a last resort — newest within the
rung (the editor stamps `deposit_pct` 30 on every save, drafts included, so a flat
"newest with deposit info" pick let a throwaway draft set the deposit on a contract
whose accepted estimate says 0%). An explicit `deposit_amount` still outranks the
percentage; `DEPOSIT_PCT_DEFAULT` (30) applies only when no estimate answers.
Gate: `gate_1012.mjs` (executes the shipped function; RED ×2 on build 1011).

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
⚠ **Keep both rungs in step** — 1036/1200 truncated a five-page scope mid-object
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

⚠️ **`/api/abc` is authenticated as of build 1009 — it used to be an open proxy.**
No auth + wildcard CORS shipped originally, so an anonymous internet caller could
spend Cardinal's ABC credential and place real orders. Now every call requires a
signed-in session (the client `api()` wrapper attaches the token like
`senddoc`/`companycam`); the order actions (`placeOrder`/`getOrder`/`templates`)
require full access (admin + production). Catalog/pricing/ship-to lookup stay
open to any signed-in staff. Proven by `gate_1009.mjs`. **Do not remove the
`Authorization` header from the client wrapper or every ABC call 401s.**

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

### ⚠ RETIRED AT 1085 — the two chip strips came off All Leads & Jobs

Theo: *"Get rid of the chips for pipeline and just use the filters?"* Measured against his
own book (57 jobs, 7 stages, 6 reps) the two strips were **16 chips in seven wrapped rows,
361px**, putting the first job card at **y=716 on an 844px phone**. After: **y=309**.

`ljChipStrip`, `ljChipClick`, both listeners, `.ljglbl` and the five `.ljchip-unassigned`
rules are **deleted**, not hidden. The section below is kept as the record of what they did
and why, because two of its warnings still govern live code.

**Still true and still load-bearing:**
- **The filters themselves are untouched.** The funnel (`#ljShFilter`) holds all seven
  groups on a phone; the desktop rail lists every one as a checkbox. `ljMatches()`'s
  AND-across / OR-within behaviour is unchanged.
- **Clicking a pipeline stage still works.** `#pipeRow` on the home dashboard is a
  `.pipebtn` per stage carrying `data-stg`, and its handler calls `openLeadsView(stage)` —
  which is what 690 was actually asked for.
- ⚠️ **`.ljchips` / `.ljchip` / `.ljchip i` / `.ljchip b` are NOT dead.** Photo Activity's
  CRM strip (`#phCrmChips`) builds `.ljchip` buttons, each with an `<i>` dot.
- ⚠️ **`ljGroupCounts` / `ljGroupKeys` are NOT dead** — the rail and the sheet both call
  them, including 931's "Unassigned sorts first".

**Replaced by `#ljActive`** (`ljActiveLine()`): one line naming each applied filter, each
removable, plus Clear all. Hidden entirely when nothing is filtered. No new colour — the
chips are `.ljchip.on` and the label is `--rbe-mute`, both already themed both ways.

**Lost, and named rather than swept:** 931's amber emphasis on the Unassigned bucket. The
ordering survives; the at-a-glance "18 leads nobody owns" does not.

#### 691 — Assigned To beside Milestone on All Leads & Jobs (historical)

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

---

## Build 808 — the Visualizer says why a render is waiting

807 shipped a grey `queued` chip with nothing behind it. Theo queued two renders within ten
minutes of it going live and had to ask me to run SQL to find out why nothing happened. **The
rows were correct** (`attempts 0`, `claimed_by null`, no error — exactly what "the Spark is not
running" looks like); the screen was simply silent about a state it already knew.

`#vzWait`, above the Review list. Three cases, told apart from the job rows themselves:

| condition | what it says |
|---|---|
| queued > 3 min, **no job ever claimed** | the render machine has never connected · nothing is lost · the command to start it |
| queued > 3 min, **`claimed_at` set somewhere** | last picked up on \<date\> — asleep, not absent |
| queued < 3 min, or nothing queued | **nothing** |

The middle row is why `claimed_at` joined the `design_jobs` select. "Never set up" and "set up
but asleep" need different answers, and a banner that cannot tell them apart gives the wrong one
half the time. The third row matters as much: a render queued thirty seconds ago is not a fault,
and a banner that cries wolf gets ignored. **The worker claims within seconds of a poll, so three
minutes is a very safe floor.**

`schedule()` also backs a stalled queue off from **6s to 30s** — no point asking the database ten
times a minute about a queue nothing is listening to.

**Contrast computed, not eyeballed:** 10.25:1 body, 12.81:1 lead, **11.95:1 even if the banner's
own background never paints** (the 448–449 failure mode, checked deliberately).

⚠️ **`contrast.py` scores against WHITE by default and called this ink a 1.67:1 failure.** Wrong
ground — the Visualizer is single-theme Blackout with no light mode. The real pair was computed
and then confirmed in Chromium against the **composited** ground. Do not take that script's bare
output as a verdict on a Blackout surface.

`gate_808.mjs` — **16/16 green, 14 red on the 807 file from `main`** (a real previous build as
the control, not a mutant).

⚠️ **That control crashed on its first run and printed nothing**, which reads exactly like a
quiet pass. `ratio()` assumed two colour strings; on 807 `#vzWait` does not exist, so it threw
`undefined.match` and took the process down — and piping to `tail` masked the exit code.
BUG_CLASSES 37, inside the gate itself. It now returns null and the check fails with "no banner
to measure".

## Builds 809–818 — the Exterior Visualizer becomes usable

Ten builds, one session, all merged and deployed. 807 shipped the queue and 808 explained its
silence; this span is what it took to make a render worth looking at and a screen worth trusting.
Full narrative in `cardinal_build_log.md` under **809–818**.

| What | Where | Note |
|---|---|---|
| **Photograph fitted to FLUX's band** (1280px long edge, multiple of 16) | `spark/visualizer_worker.py` → `fit_for_flux()` | Runs BEFORE `segment()` so masks match the source dims. A 43 KB source is far under the band FLUX.1 Fill holds detail in |
| **Per-job seed** — `seed_for(job_id, surface)`, SHA-256 of the job id | `visualizer_worker.py`, `spark/inpaint_api.json` | Makes "render again" mean something. The KSampler is found by `_meta.title` = `CARDINAL_SAMPLER`; ComfyUI renumbers node ids on edit |
| **Colour-first roof prompt**, first sentence only | `visualizer/index.html` → `roofPrompt()` | `oc_colors.description` carries marketing copy ("top sellers nationally") a diffusion model cannot draw |
| **The spec-book shell** — surface rail · searchable catalog with sticky brand headers · stage · render rail | `visualizer/index.html` | Theo's pick: option 3 as the floor, backfilled with option 1. Only his brands: OC (roof), Mastic / CertainTeed / Exterior Portfolio / Norandex (siding), Andersen / WinCore (windows) |
| **Delete a render** | render-card menu | ⚠️ `design_renders.job_id` is `ON DELETE SET NULL` — **the render row goes first**, or the job delete orphans it into the gallery |
| **Render again** on a finished job | `#vzQueue` | Only correct because 809 varies the seed. A **queued** duplicate is still refused |
| **CompanyCam as a photograph source**, admin-only | `#vzCCBox`, `api/companycam.js` | The tab is unhidden only when the route answers — its visibility IS the permission check. Asks `prefer:'original'`; **EXIF stripped in the browser before upload** |
| **A render must belong to a job** | `sum()` + the queue handler | One photograph made TEN invisible jobs in 13s. The insert is pushed into `jobs` optimistically — the duplicate guard reads that list |
| **The stage agrees with the button** (818) | project-change handler → `clearStage()` | Changing the job clears the photograph — **except a CompanyCam import, which survives**, because it belongs to no job. The empty strip now offers CompanyCam rather than only naming what is missing |
| **Storage sweep** | `spark/sweep_visualizer.py` | Dry run by default; `--min-age-hours` protects an import that has not been rendered yet. Goes through the storage API — a SQL delete removes the index, not the object |

**Not done, and not claimed:** no render has used a CompanyCam import at full resolution; there is **no stale-claim recovery** (a job
claimed by a worker that dies stays `running` forever); ~60 unreferenced files (~20 MB) are still in
`photos/visualizer/` awaiting a sweep run.

### Two engines (822) — `design_jobs.engine`

| Feature | Where | Notes |
|---|---|---|
| **Exact colour \| Sharper**, per render | `#vzEngine`, `var engine` | **Spark is the default deliberately.** A wrong colour is obviously wrong and gets thrown away; a render that quietly repainted the customer's siding is the one that reaches a kitchen table |
| **Spark** — segment, then LAB recolour in the mask | `spark/visualizer_worker.py` | Hit the OC hex at **drift 2–4 of 255** on four consecutive jobs, measured on delivered pixels. **Cannot** paint outside the mask. Free. Weakness: the segmenter can miss a roof plane |
| **Gemini** — one image-to-image press | `api/design.js` | Sharper, ~2s, never misses a plane because it never segments. Weakness is the opposite and is **not fixable from here**: it repaints surfaces it was not asked to touch |
| **The enumerated hold list** | `SURFACE_HOLD` + `ALWAYS_HOLD` | Every unselected surface named, per request. Six always-locked clauses — metal roofs, framing/crop/aspect, window and door counts — each one an observed failure, not a precaution |
| **The engine fence** | `claim_design_job()` | Filters on `engine`, so the worker and the browser cannot race to write the same `render_path`. `requeue_stale` **fails** a stale Gemini job rather than requeuing it |
| **A Gemini job runs in the BROWSER** | `runGemini()` | `/api/design` gates on the caller's own session. Writes the same two storage paths the worker does — the gallery never learns there are two engines |
| **`stalled()` is Spark-only** | `stalled()` | The "wake the Spark" banner is a lie about a job no worker will ever claim |
| **No `achieved` on a Gemini render** | `runGemini()` | It takes words, not a hex. Absent is honest; an invented drift is not |
| **`align_check.py`** | `scripts/` | ALIGNED / SHIFTED / RECOMPOSED + a geometry verdict — whether a generated render can be composited back through our masks. `--selftest`: six pairs, **four must fail** |

⚠️ **Black Sable does not discriminate between the engines.** Near-black is nearly impossible to get
wrong and the Spark scored drift 2 on it too. Judge them on chromatics — Evergreen Mist, Driftwood,
Sedona Canyon.

**Not verified by eye:** the Gemini path has never run against the real key (`POST {"probe":true}`
answers whether it has image models); the enumerated hold list **narrows** the containment failure
and does not close it — a prompt is a request, not a constraint; the composite that would make it
one is unbuilt, pending an alignment number.

### A surface the render did not change (823) — `achieved._skipped` + the mask overlay

| Feature | Where | Notes |
|---|---|---|
| **"Not changed: Siding"** on the job card | `notChanged()` → `drawJobs()` | The render finished `done`, uploaded, no error — and never touched the siding. **The only record was a log line on the Spark box.** Amber, not red: nothing failed |
| **The reason, in the box** | `drawSkip()` → `#vzSkip` | `not_found` → *reshoot that elevation*; `no_hex` → *that swatch carries no colour*. **Two reasons, because they tell a rep to do different things** — the old single list threw that half away |
| **`achieved._skipped`** | `spark/visualizer_worker.py` | `{surface: reason}` beside `_worker`. An underscore meta key, **not a new column** — the convention was already on the row, and it removes a migration that would have had to land before the worker |
| **`skip_reason()`** | worker, module level | Extracted out of `run_job`. Order is load-bearing: **no mask beats no hex**, or a gutter that is not in the photograph gets reported as a swatch problem |
| **"Show what it found"** | `drawFound()` → `#vzFound` | The stored masks, overlaid per surface. Catches the PARTIAL find — main roof yes, garage no — which is not a skip and so nothing else reports it. **The worker has uploaded these since the first build; this file read them only to DELETE them** |
| **No canvas in the overlay** | `drawFound()` | The masks are cross-origin signed URLs; reading their pixels taints it. Two blend modes instead: mask `multiply` inside a tinted layer, layer `screen` over the photograph |
| **`achieved` is read at all** | `refresh()` select | It was never in the select list. The column has existed since the `achieved` migration |

⚠️ **Absence means UNKNOWN, never "nothing was skipped."** A Gemini job never segments; a worker
older than `wb-2026-08-15.4` never wrote the key. Both report **nothing** rather than promising
everything landed — a confident false claim is worse than the silence this build removed.

⚠️ **`isolation:isolate` belongs on `.wrap`, not `.found`.** Isolation stops a group blending with
its backdrop, and the backdrop is the picture. On `.found` the layers screened against transparent
black and covered the photo — Chromium measured **rgb(9,9,9)** where **rgb(48,48,48)** was correct.

⚠️ **The overlay tints are NOT the material colours**, deliberately. Five hues chosen only to be
told apart from each other on a photograph of a house. A Driftwood grey wash over a grey roof
answers nothing.

**Not verified by eye:** the overlay is proven in Chromium against synthetic masks and has never
been over a real house. And this makes a skip *visible* — it does not make the segmenter find more.

### Solo a surface, and an honest Gemini failure (824)

| Feature | Where | Notes |
|---|---|---|
| **Tap a legend chip to solo that mask** | `soloFound()` / `applySolo()` | All five at once cannot say WHICH mask is wrong — screened tints compound, and overlap is where the eye is least reliable. Tap again for all |
| **`.flay.off` is `display:none`** | `.cmp .found .flay.off` | Not an opacity fade. A faded layer still screens over the one you are reading |
| **The legend opts back into pointer events** | `.cmp .found .fkey` | `.found` is `pointer-events:none` so the wipe stays draggable. Without `pointer-events:auto` the chips draw, hover and do nothing — BUG_CLASSES 16 |
| **`finishReason` on the Gemini path** | `pickImagePart()` + `noImageMessage()` | `IMAGE_SAFETY` (with *"common on photographs of real property"*), `PROHIBITED_CONTENT`, `RECITATION`, `MAX_TOKENS`, `SPII`, `BLOCKLIST`. An unknown code degrades to the code; **no candidates** is its own message; a normal `STOP` points at the probe |
| **The model's own words win** | `noImageMessage()` | A text refusal outranks any sentence written here |

**✅ The deployed `GEMINI_API_KEY` HAS image model access.** Settled 15 Aug by Theo's
first Gemini render: HTTP 200 after 8 seconds of real work, then no image and no text.
Not a missing model, not a bad key — the model declined to hand one over.

⚠️ **`achieved` drift is measured INSIDE the mask and validates nothing about the mask.**
A render whose siding mask had taken the upper roof scored **drift 3**. Quote drift only
as *"within the mask"* — see `BUG_CLASSES.md` class 47.

---

## Satellite estimate — `#tab-measure`, `cr-sat-script` + `api/measure.js` (838)

An instant, **advisory** roof size for a client's address, from Google's Solar API.
Lives as its own `matcard` on the Measurements tab, between Measurement Values and Roofr.

| Thing | Where | Note |
|---|---|---|
| The card | `#tab-measure` markup — `#satGo`, `#satMount`, `#satCount` | **Not** `#tab-overview`, so the allow-list trap does not apply. Asserted by `harness_838.js` |
| The module | `<script id="cr-sat-script">`, `window.CardinalSatMeasure.run()` | ~7 KB. **No stylesheet block** — every class it uses already exists and is already themed |
| The route | `api/measure.js` | Signed-in gate (the `/api/librarian` pattern). Geocode → fence → `buildingInsights:findClosest` |
| The key | **`GOOGLE_SOLAR_KEY`** in Vercel | ⚠ A SECOND key. Server-side, no referrer restriction, **Solar API + Geocoding API** enabled. The `/api/config` browser key is referrer-restricted and cannot be used here. Unset → 503 that says so |

**What it returns:** total squares, area ft², facet count, predominant pitch, and the full
per-facet pitch breakdown. `areaMeters2` is the **sloped** surface ("accounting for tilt,
not the ground footprint"), so no pitch multiplier is applied and applying one would
double-count.

**What it deliberately does NOT return: lineal feet.** `buildingInsights` gives a bounding
box per segment, not a polygon, so ridge / hip / valley / eave / rake cannot be derived and
are not guessed. That is most of why a Roofr or Hover report still costs money.

### The fences — do not remove any of these

- **It never writes `checklist.meas`**, and `aerialMerge()` is not called from the module.
  That field feeds the Construction Agreement, the crew work order and the Supplement Desk.
  A $0.01 satellite estimate must not become indistinguishable from a field measurement.
  Asserted at runtime by a write-recording Supabase mock, not only by grep.
- **It persists nothing at all** — no DB write, no cache. Google caps Solar Data caching at
  30 consecutive days; storing nothing means the question cannot arise.
- **The wrong-state fence** (100 miles of Dayton). Measured, not theoretical: of 42 real
  addresses, two geocoded to *San Francisco* and *Oklahoma City* because the row has a
  street with no city. Refusing beats confidently measuring a stranger's roof.
- **Google's `partial_match`, non-HIGH imagery, and unmodelled roof share are surfaced**,
  never swallowed. `wholeRoofStats` "may not include the entire building", so the share of
  footprint Google could not model is reported separately rather than folded into the total.

### Coverage, measured 16 Aug 2026

All 42 `projects` addresses geocoded and point-in-polygon tested against Google's published
coverage GeoJSONs: **27 HIGH · 2 MEDIUM · 0 BASE · 0 uncovered** of the 29 that resolve.
Montgomery County is fully inside the 0.1 m/pixel aerial tier. **Coverage is not the
constraint — address quality is:** 13 of 42 rows do not geocode at all, and several carry
Indiana `464xx` ZIPs where Ohio `454xx` was meant.

### The cross-check

If the job already has squares on file, the panel shows the delta and flags a disagreement
≥25%. A Hover parse that read a siding total as a roof total is the failure `api/hover.js`'s
own header warns about, and nothing was watching for it before this.

---

## Address Check — Settings → `cr-addr-script` (839)

Every client address the app cannot place on a map, with the reason, and a tap to the record.

| Thing | Where |
|---|---|
| Entry | Settings → **Check client addresses** (`data-set="addrcheck"`) |
| View | `#addrCheckView` — an ordinary `.wrap` view modelled on `#auditView`, **registered in `hideAllViews()`** |
| Module | `<script id="cr-addr-script">`, `window.CardinalAddrCheck.open/scan/verify` |
| Remote check | `/api/measure` with **`check_only: true`** — geocode + wrong-state fence, no Solar call |

**Two layers.** Local = `addrLooksIncomplete()`, **the 679 rule, reused not copied** (asserted
`=== 1` app-wide). Remote = the Verify button, one Google geocode per address.

Measured over the 42 real rows: local catches **5**, Verify catches **10 more** it cannot
structurally see. The remote pass is the only thing that finds an address which *looks*
complete — a valid-looking ZIP for the wrong state passes every string test.

### Rules

- **Writes nothing.** It finds records and hands you to the client page; the existing pencil fixes them.
- **A network failure does not flag a record** — the row is left for the next Rescan.
- **RLS scopes it** — admin sees all clients, a rep sees their own. No extra gate.
- **No scroll-lock writer, no body observer, no stylesheet block.**

⚠️ **The app has two geocoders.** The Location card uses **Nominatim**; this screen's Verify
uses **Google**, which is much better at messy input. Expect Verify to report fewer bad
addresses than the 13/42 recorded at 838 — that is the geocoders differing, not a bug.

---

## Quick Inspection geocoding — Google first, Nominatim fallback (840)

`qiGoogleGeo()` + `qiReverseGeocode()` + `qiSearchAddr()`, main block.

| | |
|---|---|
| Reverse (drag the pin → address) | Google `geocode/json?latlng=`, `formatted_address` with a trailing `, USA` stripped |
| Forward (type an address → pin) | Google `geocode/json?address=` + **`components=country:US`** |
| Fallback | Nominatim, unchanged, in both — reproduces the pre-840 address shape exactly |
| Key | the browser key from `/api/config` via `CardinalMaps.loadConfig()` |

**Measured over all 42 `projects` rows before switching: Nominatim 29/42, Google 40/42.**
Google also corrects typed ZIPs (`46417` → `45417`). Its one regression is a win —
`948 Huron` → `ZERO_RESULTS`, where Nominatim answered San Francisco.

`components=country:US` exists because without it `921 Testing Way` → **Test Way, United Kingdom**.

### ⚠ Two things that will silently undo this

1. **Geocoding API must be on the key's API restriction list.** `api/config.js` prescribes
   that list; it named three APIs and not Geocoding until 840. Narrowing it back does not
   error — the pin just falls back to Nominatim and nobody is told. Grep `qiGoogleGeo` first.
2. **The key is not referrer-restricted** (measured 16 Aug: server-side calls with no
   `Referer` returned OK on Geocoding, Places and Static Maps). Restricting it is required
   and overdue — see `api/config.js`'s header.

### Not changed

**The Location card has used Google since 636** — it paints a Static Maps `<img>` and Google
resolves the address inside the URL, so there is no geocode round trip at all. **`upgradeNearbyRow()`
(the Nearby sort) still uses Nominatim** on purpose: it caches geocodes in `localStorage`
permanently and Google's terms cap that at 30 days, so moving it needs an expiry first.

## Crew Dispatch (build 841) — `cr-disp-styles` + `cr-disp-script`, `window.CardinalDispatch`

A full-screen Production view: a **read-only week grid** of every crew's booked work orders.
Rows are crews under **trade bands**; columns are build days (**Mon–Sun**, Sunday shown only when
worked or when today is Sunday). Only crews with work this week show; **idle crews collapse** per
band. Scheduled jobs with no crew sit in a **Needs-a-crew rail** (Habitat first). Tap a job or an
unassigned client → `openProject()`, where the existing **build-555 Work-Order picker** assigns a
crew. **Mono+Red** palette, `--disp-*` tokens both themes; sticky crew column + band labels. **No
money** — the `crew_work_orders` read never selects `amount`. Opens from **Menu → Production → Crew
Dispatch** (`ROUTES.dispatch`, auto-hidden by `resolveHide` if the module is absent). Registered in
`hideAllViews` (class-clear), `navRestore` (`dispatch`), the `__crNav` wrap, and `BLACKOUT`. Gate:
`scripts/render_dispatch841.mjs` (18 assertions, both themes, 840 negative control). Repairs band +
owner lanes and in-grid assign are build 842.

### Crew Dispatch — Repairs band (build 842)
Adds a **Punch-outs & Repairs** band (peer to the trade bands, red label) to the dispatch grid: a lane
per assignee from `punch_items.assigned_to`, **Curtis cyan / Scottie violet** (owner tokens), others
steel, Unassigned last. Scheduled repairs (`scheduled_at`) land on their day as red chips; unscheduled
show a red "N open" backlog badge on the lane. Crew rows stay crew-only. Tap → `openProject()`. Band
class is `dband repband` (renamed from `rep` to free `.rep` for the chip). Gate: `render_dispatch842.mjs`
(25 assertions, both themes, 841 negative control).

### Crew Dispatch — assign in place (build 843)
Tapping a **Needs-a-crew** chip on the dispatch grid opens the build-555 crew picker prefilled for that
job (`openWorkOrderPicker(project)`), instead of routing through the profile. The grid closes first
(the picker modal is z-index 210, below the grid). Backward-compatible — the profile's New-work-order
button still calls `openWorkOrderPicker()` with no args. Gate: `render_dispatch843.mjs` (29 assertions,
both themes, asserts the picker is a real global, 842 negative control).

### Crew Dispatch — re-crewing (build 844)
Reassigning a crew (New work order → a different crew for the same trade) now **supersedes** the prior
work order rather than duplicating it: `createWorkOrder` marks prior active same-trade `crew_work_orders`
rows `superseded` before inserting the new one, and the profile/production read filters superseded out.
The grid already ignored superseded, so it shows only the current crew. SQL first — the status CHECK
constraint was widened to allow `superseded` (`crew_work_orders_add_superseded_status.sql`, applied to
production). Gate: `gate_844.mjs` drives the real `createWorkOrder` with an 843 negative control.

### Work Orders — a button beside the job section dropdown (build 846)
On an open client, `#woQuick` (a ladder-icon **Work Orders** button in `#navWrap`) sits next to the
section dropdown `#jobMenuSel`. It calls the same `showTab('workorders')` the dropdown option does — a
second door to the existing tab, no new pipeline. `setHeaderJobMenu(on)` shows/hides it in lockstep with
the dropdown, so it only appears inside a job. **Phone exception:** the dropdown is hidden on ≤560px by
the client-band rule and the Job Menu has no Work Orders tile, so `#woQuick` (not covered by that rule)
is the phone's only header path to Work Orders. Gate: `render_woquick846.mjs` — 24/24 at 1194px and
390px (hidden→visible, icon hydrated, click opens `#tab-workorders`, no header overflow), RED against 845.


## Offline-first (builds 864–873) — the app works with no signal
A read cache (service-worker `DATA_CACHE`, network-first, logout-cleared) plus a write **outbox**
(`CardinalOutbox` in `cr-outbox-script`, IndexedDB) that each data-layer chokepoint routes to when
offline or on a networkish error. Optimistic in-memory apply + full-value idempotent queue + flush on
reconnect; `reload()`/`db.get()` overlay still-queued edits so a stale offline refresh can't revert them.
Covered surfaces: **reads** (864), **punch saves** (865), **photos** (866), **Team Directory** (867),
**client/job profile** — stage/contact/notes/checklist via `pdb.update` (868), **documents** — reports/
contracts/work orders via `db.update` (869). Durability: **coalescing** of same-target edits (870),
**sign-out clears the outboxes** so nothing crosses accounts (871), **`storage.persist()` + storage-full
warning** (872), and a four-state **sync indicator** — offline / waiting / syncing / "all synced" (873).
Chokepoints are one-per-concept; RLS refusals still surface immediately. **Offline CREATE of new
numbered records (estimates / community partners) is deliberately NOT built** — see the settled decision
in HANDOFF (17 Aug).

## Team alerts by text + a test button (builds 874–875)
`api/notify.js` fans a team alert to **push + email + SMS**, each best-effort and independent.
⚠️ **That sentence was written at 874 and was not true until 1126** — it held for email against SMS,
and not for push against either. Three sites answered a push problem by abandoning the whole request
before the email or SMS work ran: an unset `VAPID_PRIVATE_KEY`, a failed `web-push` import, and a
refused `push_subs` query. All three now degrade push alone. `push_error` + `env.push` report it, the
way `sms_error` + `env.sms` already did. Gate: `harness_notifyindep1126.mjs` (GREEN 19 / RED 12 on
1125). SMS via
Twilio is gated on `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM` (like email on `RESEND_API_KEY`);
recipient phones come from `team_profiles`, E.164-normalised by `normPhone()`, de-duped; the response
reports `texted` + `env.sms` (presence only, no keys). Build 875 adds **"Send a test alert to myself"**
(`#testAlertBtn`, under Phone Notifications) — fires all three channels to the current user ONLY and shows
a per-channel readout, the fastest way to confirm the Resend + Twilio setup end to end. Email/SMS require
their Vercel env vars (and a Verified Resend domain / approved A2P 10DLC) to actually deliver — see HANDOFF.

### The Owner Console (build 895) — `#cr-owner` / `window.CardinalOwner`, ADMIN ONLY

Theo's owner-level dashboard for things outside any one customer. Reached from **Menu → Admin →
Owner Console** (the Admin section only exists for admins; `open()` also refuses a non-admin, and the
two tables are `is_cardinal_admin()` in RLS). Full-screen `#cr-owner` view, display-shown at z-index
9500, registered in `hideAllViews()` / `navRestore` (`case 'owner'`) / the `__crNav` wrap. "Daily
Brief" editorial style Theo picked from three mockups: cream `#f5f2ec`, Georgia serif, cardinal red;
every colour a literal (no tokens), no `body.overflow` writer (overscroll-behavior:contain).

Phase 1 = three modules, `<style id="cr-owner-styles">` + `<script id="cr-owner-script">`:
1. **Today's Top 10** — `owner_tasks` (title/note/done/position). Quick-add, tap to check, × to delete;
   open tasks numbered first, then done (struck).
2. **On the horizon** — the tax/compliance calendar computed from a static JS config each open (never a
   stored row, so it can't go stale): next quarterly estimated tax (1040-ES Apr/Jun/Sep/Jan 15), annual
   return (1040 + Sch C, Apr 15), 1099-NEC to subs (Jan 31), Ohio BWC true-up + sub coverage (Aug 15) —
   each with a countdown, red inside 30 days, amber inside 60. Plus owner-added obligations
   (`owner_items` kind='obligation'). Carries a "confirm exact dates with your accountant" note.
3. **Renewals & Expirations** — `crew_docs` rows carrying an `expires_on` (COI/W-9/license, newest per
   crew+kind, status + countdown) plus owner-added renewals (`owner_items` kind='renewal').

Tables `owner_tasks` / `owner_items` (`owner_console_schema.sql`, applied, `is_cardinal_admin()` RLS).
Gate `render_owner895.mjs` (Chromium, 20 assertions, negative-controlled). **Phase 2 = money + quick
reminders (modules 4-6), not yet built.**

**Build 896** made owner-created entries editable: tap a task, obligation or renewal to edit its title/note (and date, for items) inline — Save/Cancel, Enter/Escape. The tax calendar and crew certificates stay read-only.

**Build 897** added a **Reminders** section (module 5): add a reminder with an optional date and a repeat of none/weekly/monthly/yearly; tap to edit, check to complete a one-time or roll a repeating one to its next date. Table `owner_reminders` (`is_cardinal_admin()`). Modules 4 (Money) and 6 (Vault) remain.

**Build 898** wired reminder delivery: a **Ping me** toggle on a dated reminder includes it in the daily digest email (`api/digest.js`) on the day it's due — due-today (any repeat) or an overdue one-time; undated and overdue-repeating reminders never ping. Rows show "pings you" when on.

**Build 899** added **The Ledger** (module 4): a private admin-only book of money owed and advanced — loans taken (crew/industry/bank), sales draws, money lent — each account with a running balance and a dated payment log, a net-position line, settle/reopen, and inline detail. Tables `owner_ledger` + `owner_ledger_txns` (`is_cardinal_admin()`). Draws are manual, structured to later recoup from commissions.

**Build 900** added **The Vault** (module 6 — the console is now complete): a private, admin-only store for key business documents (EIN letter, insurance, licenses, formation, banking), grouped by category, each with an optional expiry countdown. Upload/open (signed URL)/delete. Files live in `photos` under an admin-only `owner-vault/` prefix (`owner_docs` table is_cardinal_admin(); `owner_vault_storage.sql` carves the prefix out of the general photos read, Studio-style). **All six Owner Console modules shipped (895-900).**

**Build 901 — lead-assignment notifications.** When a lead is assigned to a rep (a new lead created with them on it, or an existing job reassigned to them) they get a notification via `notifyTeam` (push/email/text, per their settings). Rep only; self-assignments are skipped. Wired at the Create Lead form and the client-page reassign dropdown.

**Build 904 — ultrawide layout (Production).** On screens ≥1600px wide, Production becomes a two-column dashboard (calendar left; stats, Closed-repairs banner, Crew Dispatch/Crews cards and the day agenda stacked right) instead of a centered 1180px column. Gated behind a `min-width:1600px` media query — phones, iPads and normal monitors are unchanged. CSS-only (`#cr-pb .pbwrap` grid; right rail selected by direct child to avoid the `.pbday` name collision). First of a set of screens getting the ultrawide treatment.

**Build 906 — the Dispatch Map (Punch & Repairs, ultrawide).** On screens ≥1600px wide, Punch & Repairs shows a live Leaflet map beside the list (module `cr-pumap-styles`/`cr-pumap-script`, `window.CardinalPunchMap`). Every OPEN repair is pinned by its client address, colour-coded by urgency (red/amber/blue), with a By-urgency/By-crew toggle, a top stat strip (Open/Urgent/Unassigned/Today) and a legend. Two-way linked: tap a list row → the map pans to its pin; tap a pin → popup with client/address/urgency/assignee and an **Open** button routing to `CardinalPunchCard.open`. The list's own filters/tabs/search mirror to the pins (the map pins exactly the visible `.pu-card`s via a `#puList` MutationObserver). Reuses `qiLoadLeaflet`, OSM tiles, and the `geo:`+addr localStorage geocode cache (shared with the Nearby row) — nothing new stored. Structural + strictly gated: pane/map built only when `punchView` is visible AND innerWidth≥1600 (MutationObserver on `#punchView` + resize listener + media-gated grid/`body.pumap-on`); below 1600px no pane, list unchanged. No body-observer, no scroll-lock writer, not in `hideAllViews`. Offline/Leaflet-fail → "Map unavailable" note, list still works. Follow-ups planned: Plan-a-Run (route a loop) + assign-from-map, then the map console on Crew Dispatch.

**Build 905 — ultrawide layout (client list).** On screens ≥1600px wide, the Client Directory (`#cliList`) lays its cards out as three CRM columns — **Retail | Claims | Community** side by side — each with its own colored header dot and count, instead of one card stretched ~2600px wide. Unlike 904 this is structural, not CSS-only: `renderClientDirectory` regroups the sorted list into `.cd-crmsec` sections (built from `CD_CRMS`, filtered by `cdCrmOf`) and adds `.cd-crmcols` to `#cliList` **only when `window.innerWidth >= 1600`**; a resize listener re-renders when the 1600px line is crossed while the directory is open. The grid is also gated `@media (min-width:1600px)`. Search, sort, the CRM chips and all filters still work and filter within the columns; filtering to one CRM hides the empty sections. Phones, iPads and normal monitors are byte-for-byte unchanged. Light-theme header inks use each CRM's `colorLight`.

**Build 927 — Storm Data.** A new full-screen tool in the menu (Sell section, so it reaches the mobile drawer AND the desktop rail from one insertion): every hail and wind report near the yard, grouped by the day it fell. Four KPI tiles (hail count, wind damage, gusts, largest hail), a storm-day accordion listing each report with its hail size or gust speed, town, county and distance out, and an optional Leaflet map (hail red, damage amber, gusts steel) via the existing `qiLoadLeaflet`. Search window: 25/60/100 miles × 30 days / 4 months / 1 year. Blocks `cr-storm-styles` + `cr-storm-script`, `window.CardinalStorm`, registered in `hideAllViews()` and `navRestore()` (`case 'storm'`).

**Data source, stated plainly:** `api/storm.js` (new, 30th function) reads **NWS Local Storm Reports** via the Iowa State Mesonet GeoJSON feed, filtered to hail / gust / wind-damage across OH-IN-KY. These are **spotter and gauge reports at POINTS, not an interpolated hail swath** — a true swath is a paid vendor product. They tell you which neighbourhoods were hit and when, not which parcels; the screen's own footer says so. The route is public by design (US government weather data, no key, no session, nothing from Supabase) and cached 30 min. A dead feed returns 502 with the failure named, and the screen prints "Could not reach the weather service" rather than an empty list. If a swath vendor is ever bought, this route is where the second source goes.

Deliberate departures, both in the module banner: **no scroll lock** (there are 13 writers of `document.body.style.overflow` and this is not the 14th — the panel is `position:fixed inset:0` with its own scroller and `overscroll-behavior:contain`), and **no `document.body` MutationObserver** (`#navMenu` is static markup, so the row inserts on the first call behind a bounded 12s retry — the count stays at 45 real observers). Colour is severity here, not the Sales Floor's red/navy rule. Every `--st-*` reference carries a literal fallback; worst contrast is hail red at 4.58:1 on its own darkest card.

**Build 928 — the Sales Floor is a hub.** The six-tab objection strip and the wall of cards are gone. The page is now: today's objection, the **Objection Coach as a full-width hero** (with Practice a drill / Leaderboard / Log a real one beneath it), **eight module tiles** — Door Knocking, Storm Data, Pricing Guide, Talk Tracks, Proof, Showcase, The Pop-Up Roof, Resource Library — and the five Reference pages. Every tile opens a screen that already exists; Storm Data goes to `CardinalStorm.open()` (927) and Pricing Guide to `crOpenPricing()` (the catalog already carries roof, siding, gutters and windows — checked before promising it).

**Door Knocking** (`view='door'`) is the one new page, and it is a pane *of* the Sales Floor rather than a new full-screen view — six things to do in order when you work a street, the three objections you hear at the door, and the knock word for word. Talk Tracks and Proof became panes the same way, so the writing that used to sit under the tabs is intact. **Back goes up one level** — a pane returns to the hub, only the hub's back leaves the screen.

**One deck, not two.** The Coach reads `objections` from Supabase; the Sales Floor had its own hardcoded 13. `sales_floor_objections_928.sql` (**applied**) moved the six that existed only in the file into the table — a new **"At the Door"** category (3 cards, sorted 1–3 so it leads) plus three near-misses the deck lacked. The deck went **27 → 33 across 7 categories**. The in-file lists are now fallbacks for a failed read, never a parallel source: `loadDeck()` reads the table and the table always wins, and `todaysObjection()` rotates the DB deck once it has. There are exactly **two readers of `objections`** in the file — the Coach and the hub — and that is asserted.

**Build 937 — the client signature pad, reachable on every screen.** `#sigModal` was the second
fixed overlay in the file with no `overflow` (595's comment names five siblings and misses this one),
so on any short viewport in the **installed** app — phone landscape measured at 844×390 — Clear,
Cancel and **Apply signature** rendered underneath `#pwaNav` with nothing to scroll. Two lines:
`overflow:auto` to join the siblings, and the `88px + env(safe-area-inset-bottom)` clearance as
**`padding-bottom` on the overlay**, because the card's margin is an inline style a normal
stylesheet declaration cannot beat.

**The gate is the reusable part — `scripts/gate_sheets937.mjs`.** It opens **17 surfaces** through
their real openers (the ten markup modals, `cr-pb-modal`, and `cr-abc` / `cr-storm` / `cr-occ` /
`crewsView` / `cr-estimates-mount` / `cr-sf` / `cr-pb`) across **four viewports**, and asks of every
interactive control: scrolled into view, does a tap at its centre actually land on it?
`elementFromPoint`, not arithmetic. Run it whenever a screen gains a bottom-anchored control —
`node gate_sheets937.mjs [path]`, the path argument being the negative control. It has been seen
red on **two** builds for two different modals (v934 → the 935 add-sheet; v936 → this one).

**Build 938 — the first contrast sweep of the CRM.** Three pieces of text under the 4.5:1 floor,
found by the sentinel and fixed from measured options: the drawer's build stamp (3.39 → 6.39:1), the
banner's selected CRM chip (3.51 → 4.81:1, by darkening the CHIP so every CRM colour survives) and
`Sign out` in the desktop rail (3.40 → 5.50:1, via a new `CRM_INK` map published as `--lnav-ink`).
The chip fix is **dark-mode-scoped on purpose** — in `rb-light` the same change measures 5.67 → 3.18.

**The reusable part is `scripts/sentinel_setup_cardinal.js`.** It signs the sentinel in and walks
twelve screens (home, client, Production, Sales Floor, Storm, OC Colors, Crews, Estimates, the nav,
New Project, the checklist, the signature pad). Run it whenever a screen changes colour:

```
node sentinel.js index.html \
  --setup .../e2e_mock_supa.js,.../sentinel_setup_cardinal.js \
  --since <previous artifact>
```

`--since` is what keeps it usable — it subtracts the carried debt so the report is what *this* build
did. The current baseline is **11 DEAD findings, all triaged as benign** (touch-target residue, one
documented hide-early-restore-later); see the 938 build-log entry before re-triaging any of them.

**Build 939 — Text size (Menu → bottom of the drawer).** Three steps: Normal / Large / Larger, as
`A A A`. Scales the whole app via `zoom` on `:root` (`data-cr-text="lg"|"xl"`, 1.15 / 1.30), stored
in `localStorage['cr-textsize']` and resolved in the same pre-paint script as the theme, so it never
flashes. **Per device — turning it up does not change anyone else's screen.**

Built for Scottie, who could not read the screen. Measured on his production login it was **size, not
contrast**: 47 of 155 rendered text styles sit under 12px, and the file carries **847 font-size
declarations below 12px** (down to 6.5px). `zoom` is the lever precisely because those 847 are px
literals no token can reach. **It matters most in the installed app, where iOS disables pinch-zoom
entirely** — there is no gesture to fall back on.

`window.CardinalTextSize.set('md'|'lg'|'xl')` / `.get()`. Gate: `scripts/gate_textsize939.mjs`
(23 assertions, negative-controlled). ⚠️ **Measure text with `getBoundingClientRect()`, never
`getComputedStyle().fontSize`** — the latter ignores `zoom` and will tell you nothing changed.

**Still open from the same sweep:** the `APPROVED` stage chip is white on green at **2.5:1**
(floor 3). Stage colours are semantic and app-wide — its own build, with a preview.

**Build 940 — Check in / check out on a punch-out.** A strip on the punch card: **Check in** when
you reach the repair, **Check out** when you leave. If the item is not closed, check-out asks *"Back
on this tomorrow?"* and moves `scheduled_at` **only on yes** (next day, skipping Sunday). A repair
spanning more than one calendar day shows **Day N** on the card and on the Production board. An open
check-in from an earlier day is shown in amber — *"not checked out"* — rather than silently assumed.

Stored as `punch_items.visits` jsonb: `{in, out, by, name, day}`, `out:null` while on site, `day` the
**local** calendar day. Written only through `cr-pk-script`'s `save()` chokepoint, so it rides the
offline outbox — a check-in with no signal syncs later. `punch_visits_940.sql` is **applied**.
Board-side count is `pbDays(i)` in `cr-pb-script`, reading the same array — one source, no second
count. Gate: `scripts/gate_visits940.mjs` (15 assertions, negative-controlled).

## The 44px touch floor, completed (build 944 — 20 Aug 2026)

The readability audit's tap-target half. Build 752's `<style id="cr-touch44-styles">` block is
still THE mechanism — one block is the whole pass, `min-*` only, every selector carries its
measured size — and 944 extended it with ~21 grouped floors covering the 67 controls the audit
measured under 44px: the desktop rail (absent from 752's 390px pass — the rail mounts ≥1100px
only), Cardinal Truth's tab strip, Company Docs chips and row buttons, the Clients/Leads/Estimates
select–clear–sort controls, the leads stage-filter **labels** (`.ljopt` — never `.cbx`, which
`#projectView` hides at 1×1), both search bars, the New Lead form fields (`:not()` guards keep the
18×18 checkboxes), the Pricing/Coach/Crews/Suppliers/Estimates toolbars and both modal close X's.

**Two shapes worth knowing before touching any of it:**
- **`#crBanner .cbcrm b` did not grow** — fixed chrome; a 44px `::after` pad at source carries the
  tap (the `.pu-box` shape). `gate_944.mjs` proves it with a real click 9px above the chip.
- **Four modules declared their own sub-44 `min-height`, beating the floor by specificity**
  (BUG_CLASSES 54): `#payView`, `#cr-pk .pkm`, `#cr-storm .stseg` — raised at source. The
  sentinel's **FLOOR** check now reports any recurrence, naming the beating selector.

Deliberately not floored (named in the block): `#projectView .acxjd .acxtrs` inputs — the
job-details card is deliberately dense; Theo's call. Gate: `scripts/gate_944.mjs` (the 22-screen
walk + the pad click proof; red on 943 in both halves).

## Punch & Repairs — The Line (build 945, 20 Aug 2026)

The board's layout: an amber **unassigned queue pinned above the tabs** (oldest first, hot ≥5
days, Assign button for admins+production), then **four tabs with one rule each** — Active
(started or due today, carrying the 940 check-in truth: ON SITE since / stale open check-in /
NOT CHECKED IN / Day N), Assigned (person, no day, ⚠ stuck flag at 3d no activity), Scheduled
(future day), Closed (done, newest first). Dated-but-unassigned stays in the queue.

**The Assign sheet** (`#puShAssign`, the fourth `.pu-sheet`): roster production-first with real
load per person, four workday chips (Sunday skipped) + NO DAY, notify on by default through
`notifyTeam`. Writes ride `CardinalPunch.update`; `CardinalPunch.notifyAssigned` is the one
notify path — the map's pin-assign uses it too now. Buckets derive via row-parameterised
readers (`bucketOf`, `puOpenVisit`, `puDaysOn`) copied from the pbDays shape — never the card's
IIFE-bound helpers. Gate: `scripts/gate_945.mjs` (26 assertions, negative-controlled, red on
944 in both halves). ⚠ `.pu-sheet.open` was born in this build — the sort/filter sheets had
been silently unopenable since 361; do not remove it.

## The punch-out card, tightened (builds 946–947, 20 Aug 2026)

The card is **moment-aware**: once any visit exists, check-in strip → checklist → photos lead
and dispatch folds to one tappable line; before work starts, managers see dispatch open. Close
turns **green (#1b7d49, computed)** only when ready; blocked, its "N photos · M steps left"
pieces jump to the section. Delete lives behind the header ⋯ menu; the supplement flag is a
quiet ⚑ Extra scope chip whose filed rows carry a SUPPLEMENT badge on the board and queue;
@-chips show on message focus; empty description is one line. Five templates (roofing, siding,
gutters, **windows**, **general**). The card's controls meet the 44px floor (ticks and photo ×s
via ::after pads — rect audits must read the pseudo box). 946 pinned the check-in strip's inks
(dark chip in both themes — its Check out label was 1.02:1 in light). Gate:
`scripts/gate_947.mjs` (23 assertions, control red with named failures).

## Crew Dispatch — the Magnet Board (build 948, 20 Aug 2026)

The dispatch grid restyled as the shop wall: **rolling next-7-days window** (starts today;
Sunday always renders, hatched until worked), riveted per-trade strips with chevrons that
**fold a trade to one line** (`data-band` + `foldTrade{}`), dog-tag crew cards (uppercase mono +
punched hole; `own-curtis`/`own-scottie` colours kept), jobs as raised magnets with readable
job + address at every width. ≥1100px fits all seven columns; the phone pans full-size behind
the sticky rail (settled: "non compressed"). Map/Rain/filters/idle/tray behaviour unchanged.
All colours ride `--disp-*` tokens — both themes flip whole. Gate: `scripts/gate_948.mjs`
(18 assertions, seeded crews/WOs incl. the worked-Sunday case, control red with named
failures). Sentinel state: `dispatch`.

## Crew Dispatch — the workflow layer (build 949, 20 Aug 2026)

Three additions to the Magnet Board: **7-day forecast on the day headers** (Open-Meteo, free/
no-key like RainViewer; drawn SVG icons; rain chance ≥30% shown; wet days in the new
`--disp-wx` token pair, computed for both themes; 30-min cache; failed fetch = no icons, board
intact), **free-day chip on every dog tag** ("free today" / "free Thu 21" / "booked all 7",
Sundays skipped per the nextWorkDay rule), and **arm-and-place assign** (tap a Needs-a-crew
chip to arm, tap a day cell on a crew's row → the build-555 Work-Order picker opens with crew
+ day preselected via a new optional `preset` arg on `openWorkOrderPicker`; second tap on the
armed chip = classic picker; the picker stays the one write path — the board writes nothing).
Gate: `scripts/gate_949.mjs` (19 assertions incl. routed Open-Meteo fixture + abort case;
control red 12 named).

## Sideways-scroll containment sweep (build 950, 20 Aug 2026)

BUG_CLASSES 30 swept mechanically across all 50 `overflow[-x]:auto` sites: four horizontal
scrollers lacked `overscroll-behavior-x:contain` and now have it — `.pu-tabs`, `.cr-cth-tabs`,
`.cd-crmbar`, `#cr-disp .dspscroll`. The four Punch tabs also now genuinely fit 390px with
two-digit badges (945's promise, measured broken at 373px/358px). Gate:
`scripts/gate_950.mjs` (fit incl. forced "88" badges, computed containment, board-still-pans;
control red 6 named).

## Insurance tools in the slide-out menu (951)

`#navMenu` carries an **Insurance** section (between Sell and CRMs) with seven rows
mirroring the Cardinal Truth hub's Tools rail: sol / library / supplements / insresources /
adjusters / claimstracker / desk, dispatched in the main block's navopt handler with the
same behaviour as `cr-cth-script wire()`. Present in every portal (Theo's pick: add, don't
swap — Sell untouched). The ORIGINAL "Insurance" heading (Cardinal Truth) sits BELOW the
new one so `renameSec()` still renames it to CRMs — do not reorder them. Rail icons for the
seven labels live in the `I2`/`I5` maps (six added at 951). Schedule Board is deliberately
not repeated in the section. Gate: `gate_951.mjs`.

## The Card Stack desktop menu (952)

The desktop rail (`cr-lnav-styles` + `cr-lnav-script`) renders each menu section as one
of the app's cards: `.lnav-sec` is the card header with a 3.5px `--lnav-strip` across its
top, `.lnav-body` the card body. 288px wide (`--lnav-w`). Per-portal: retail =
brushed-steel strip + steel icons + slate-blue accent (`#3e6ca8` — retail's red is GONE
from the rail); insurance = red end to end (its teal is GONE from the rail — semantic
teal elsewhere untouched); community green; production yellow (themes via
`body.dataset.crmHead`). Maps: `CRM_STRIP`/`CRM_ICON`/`CRM_ICON_LT` beside the existing
four, published as host custom properties. ⚠ `.lnav-sec` must stay
`width:calc(100% - 20px)` — full-width plus margins overflows the band past the card
body. Phone drawer deliberately untouched. Gate: `gate_952.mjs`.

## Portal-aware menu sections (953)

`#navMenu` carries Production (prodboard / dispatch / punch / suppliers — Suppliers moved
OUT of Sell; admins still get it relocated under Admin by reorg) and Community (injected
Hub/Partners/Prospects re-anchored from CRMs + static newbid) sections, 951's pattern.
**Sell hides in the Insurance / Production / Community portals** via `syncSell()` in
cr-menu-script: inline display + `data-cr-sellhid` attribute together — the attribute
because `cr-drawer-styles` paints rows `display:flex !important` (the #tab-overview
class), the inline because the rail's scrape() keys on it. Restore only touches rows
syncSell itself hid. Re-synced by a body attribute observer (data-crm/data-crm-head).
⚠ Emulate portal switches in tests by writing BOTH crm attributes. Gate: `gate_953.mjs`.

## The Insurance tools live in the menu (954)

The Cardinal Truth hub renders **no Tools rail** — retired at 954 after verifying all eight
destinations have menu doors (seven in the menu's Insurance section, Schedule Board under
Daily). ⚠ `.cr-cth-tools.lead` (the Insurance Clients tile, 675) is NOT part of that rail
and stays; `wire()`'s `[data-go]` handlers stay too (the terminal "All claims" button uses
them). The menu's Insurance section **auto-opens on entering the insurance portal** — one
write per switch into `cardinal.lnav.sections`, never re-forced, so a manual collapse
sticks. `syncPortalSections()` (was `syncSell`) hides Sell outside Retail and the Insurance
section inside Retail, tagging rows `data-cr-pohid`. ⚠ That section is located by
`secOfNav('sol')`, never by heading text — `renameSec()` makes the last "Insurance" heading
"CRMs", and a label lookup would hide Cardinal Truth. Gate: `gate_954.mjs`.

## One menu section per portal (955)

`syncPortalSections()` scopes four sections: Sell → retail **and sales** (`crmNow()` returns
`'sales'` for `#cr-sf.open` — 954's `p !== 'retail'` wrongly hid Sell there), Insurance →
not in retail, Production → production only, Community → community only. Sections are found
by a row each owns (`secOfNav('sol' | 'prodboard' | 'newbid')`), never by heading text.
**Suppliers lives in Daily** (955) — never in a portal-scoped section — because every desk
needs the catalog; admins still get it relocated under Admin by `reorg()`. The doors into
each portal never hide: `#cr-nav-production` in Daily, the CRM switcher, Cardinal Truth.
Gate: `gate_955.mjs` (five-portal matrix + a non-admin boot).

## Menu symmetry completed (956)

All four portal sections are now scoped the same way: Sell → retail + sales, Insurance →
insurance, Production → production, Community → community (`syncPortalSections()`, rules
anchored on `secOfNav`). 956 changed only the Insurance rule (`p !== 'insurance'`, was
`p === 'retail'`). ⚠ Gate note: `gate_956.mjs` owns the full five-portal matrix;
`gate_955.mjs`'s matrix was corrected in place at 956 so it does not assert retired
behaviour.

## Scroll containment placement (957)

`#cardinalTruthView` (the fixed pane) and `.pu-sheet .panel` (the sheet's scrolling card)
carry `overscroll-behavior:contain`; their non-scrolling children/backdrops do not.
`#pipeRow` resets containment inside `@media (max-width:900px)`, where it stops being a
scroller. See BUG_CLASSES 56 — containment on a box with no scrollport kills touch
scrolling on iOS while looking perfect in Chromium. Gate: `gate_957.mjs`.

## Crew Dispatch — move a magnet (build 958, 21 Aug 2026)

The Magnet Board could **place** an unassigned job (949) but never **move** a placed one.
Every booked magnet now carries a small grip (drawn SVG, `--disp-dim` — 6.70:1 dark /
6.25:1 light; `--disp-mute` was the obvious pick and fails the 3:1 non-text floor in dark
at 2.88:1). Tap it to pick the job up: `#cr-disp.armmv`, the magnet gets `.moving`, and
every legal day cell gets `.tgt` with the 949 amber dashed outline. Tap the day you want.

**The two landings are different operations on purpose:**

| Landing | What happens | Why |
|---|---|---|
| **Same crew, new day** | `rescheduleWorkOrder(woId, ymd)` — one `scheduled_on` update on the row that already exists | a date change is not a new work order: the WO number, the document and its history stay put |
| **A different crew** | the build-555 picker, `{crew_id, scheduled_on}` preset (the 949 path, untouched) | a new crew has to be given its own paper — that is the 844 supersede path |

**`rescheduleWorkOrder` is the app's FIRST reschedule.** Before 958 `scheduled_on` was
written exactly once, by `createWorkOrder`, and **nothing anywhere could change it** — the
only way to move a job was to issue a second work order, which superseded the first. It
lives beside `createWorkOrder` in the main block (not inside the board) so the Work Orders
tab can reuse it without a second copy, returns `{ok,msg}` rather than throwing or
swallowing, and guards with `.neq('status','superseded').is('completed_on',null)`.
No schema change — `crew_work_orders` RLS is already `is_full_access()` (admins +
production), the same fence the board reads through.

**The trade fence.** Only crews in the moving job's own trade are legal targets.
`createWorkOrder` supersedes *same-trade* rows only (844), so a roofing job landing on a
siding crew would leave the job booked twice. A tap on any other cell simply puts the job
back down.

**Optimistic, but honest.** The magnet moves the instant you tap and **moves back** if the
write is refused, with `showError` saying why — the board never shows a date the database
did not accept. Paging the week while holding a job moves it into next week.

**One thing in the hand.** Arming a move drops an armed tray chip and arming a tray chip
drops a held magnet — otherwise `.arm` and `.armmv` both outline cells that mean different
things.

Gate: `gate_958.mjs` (21 assertions incl. the write's own filters, zero-inserts, the
read-after-write render, the refusal revert, and the trade fence; control red 13 named,
no crash). Sentinel: `dispatch` state clean.

## The forecast on the Production calendar (build 959, 21 Aug 2026)

Curtis schedules from Production, and the forecast only existed on Crew Dispatch. Every day
cell in **both** month grids — the mini calendar on the Production landing and the full
five-week one — now carries its forecast beside the date, and so does the `.pbrule` heading
over the day's agenda. Wet days paint `--pb-wx` (**#6db3f2** dark, 8.02:1 on the day card /
**#155f9e** light, 6.64:1 — computed, both themes). Rain chance shows at ≥30%, the same rule
the Dispatch headers use.

⚠ **The two grids are laid out separately, on purpose — do not "unify" them.**
`#cr-pb .pbcal .pbday .dn` is a flex row (date left, forecast right) for the **full**
calendar; the **mini** grid keeps its pre-existing centred number with the icon inline beside
it. The first version of this was one two-class rule for both, and
`#cr-pb .pbmonth .pbday .dn` (three classes) beat it — **it never won on any of the 30
elements it matched.** The sentinel's `OVERRIDDEN` check found it; `gate_959`'s thirteen
assertions about the icon all stayed green through it, because they were about the span and
not about where it sat. Assertions 14/15 now cover the layout.

### The forecast is now ONE module — `<script id="cr-wx-script">`, `window.CardinalWx`

949 built the fetch, the 30-minute cache and the five drawn icons inside `cr-disp-script`
because Dispatch was the only consumer. Production is the second, and a second copy would
have been two forecasts able to disagree about the same Tuesday. Extracted, and
**`cr-disp-script` now delegates** — `loadWx()` and `wxCell()` are the whole seam, and they
emit byte-identical markup, which is why `gate_949` still passes 19/19 untouched.

| | |
|---|---|
| API | `load(cb)` · `day(ymd)` · `kind(code)` · `icon(kind)` · `wet(ymd)` · `cell(ymd[,minPct])` |
| Cache key | **unchanged** (`cr-dispwx`) so a forecast already on the device carries over |
| Markup | `<span class="wx[ wet]">ICON[<i>NN%</i>]</span>` — each host colours `.wx` in its own scope, so Dispatch keeps `--disp-wx` and Production gets `--pb-wx` with neither knowing about the other |

⚠ **`load(cb)` fires its callback only when a NETWORK fetch lands — never on a cache hit**, and
registers the callback only when a fetch is actually about to happen. Both matter: every caller
renders immediately after calling `load()`, so firing on the cache path would re-enter the
caller's own render from inside it, and registering unconditionally would grow the queue on
every repaint.

⚠ **Open-Meteo returns FOURTEEN days; the calendar shows five weeks.** Days past the window
carry no icon at all — **an empty square means there is no forecast, never that it will be
fine.** Asserted in the gate.

Gate: `gate_959.mjs` (15 assertions incl. the wet/dry inks computed in both themes, the
percentage thresholds, the past-day-14 blank, the full calendar, **one fetch serving both
screens**, the forecast-down case and the layout of both grids; control red 11 named, no crash). `gate_949` and
`gate_958` re-run green as regression checks.

## Cron routes fail closed (21 Aug 2026, no build number)

`api/digest.js` and `api/commissions-digest.js` now use `companycam-sync`'s `cronAuthorised(req)`:
**`CRON_SECRET` is REQUIRED, and unset means the route refuses everything, cron included.** They
previously guarded with `if (secret && …)`, which is no guard when the variable is unset — and it
was unset in production, so both were answering anyone with the URL. `commissions-digest` names
what every rep is owed.

⚠ **Immediate consequence: until `CRON_SECRET` is set in Vercel, the daily digest and the Friday
commissions email do not send.** Deliberate — a cron that does nothing beats a public endpoint
that emails on demand. Vercel Cron sends the header automatically once the variable exists.

The refusal carries a `detail` naming what is wrong (nothing sensitive), the same property that
let the problem be identified from outside in the first place. Three routes in `api/` read
`CRON_SECRET`; that is the whole class, swept. `index.html` untouched, so no build number.

Gate: `gate_960.mjs` (11 assertions, in-process with `fetch` stubbed and counted so "refused"
means nothing left the box; control red 4 named — on the pre-fix copies an anonymous call with
production-shaped env reached Supabase 1× and 3×).

## Add from Library — sections that look different and fold (build 960, 21 Aug 2026)

The estimate line-item picker (`#cr-est-picker`, `cr-est-script`) listed every trade under the
same 10px grey caps on a ground barely apart from the rows, so GUTTERS and ROOFING read as the
same thing. Each `.cat-header` is now a **button** carrying a left stripe, the category name in
**its own colour**, an item **count**, and a **chevron**; items live in a `.cat-body` that
`.cat.closed` hides.

**The colour comes from the category NAME, never from sort position** (`catHue()` — an explicit
map for roofing/siding/gutters/windows/repair/general, a string hash for anything else, both
mod 6). Adding a trade must not repaint the others. The six values are a fixed, measured set —
light on `#f4f2f1` and dark on `#141419`, **all twelve ≥ 5.37:1** — so an unknown category lands
on a vetted colour rather than an invented hue nothing has checked.

- **Fold state persists** in `localStorage['cr-est-libfold']`, keyed by category name.
- ⚠ **A search force-opens every section** — otherwise the query filters items into a section
  folded last week and the sheet reads "no results". And a fold made *during* a search is **not
  recorded**, or a section tidied away mid-search would come back collapsed for good.

⚠ **`cr-nvl-styles` paints this sheet, not `cr-est-styles`.** `selector_audit.py` names it the
winner on `.cat-header`. The structure and the light palette live in `cr-est-styles`; the dark
twins live in `cr-nvl-styles`. Anything colour-bearing added to `cr-est-styles` alone here is a
**silent no-op**.

**Also fixed, found while here, not part of the ask:** `.p-item .price` still rode `#8f1620`,
chosen when this sheet was cream. On the dark sheet that measured **2.16:1** — the recurring
light-ink defect, and this override had themed the name, the description and the empty state but
not the price. Now `#e35c63`, the app's own accent red: **5.59:1** (5.09:1 on hover).

Gate: `render_libpicker960.mjs` (13 assertions in Chromium — computed colours, the 4.5:1 floor
per section, the name→colour map, fold/unfold/persist, search force-open, the not-recorded rule,
the price, and that tapping an item still adds the line; control red 11 named). ⚠ `gate_960.mjs`
is **not** this build — it belongs to the cron fail-closed change, which took no build number.

**The sentinel now sweeps this sheet.** A new `estlibrary` state opens the editor *and* the
picker — opening the editor alone never opened the sheet, which is how a 2.16:1 price survived
every previous sweep.

## The library sheet clears the installed nav (build 961, 21 Aug 2026)

`#cr-est-picker` moved **9510 → 9995**. `body.standalone #pwaNav{z-index:9990 !important}` raises
the installed app's button bar from its authored 160, so the sheet had been painting *underneath*
it since it was written — the bottom ~63px of `.box-list` covered. 9995 clears the nav and stays
**below** the app's alert-level sheets (9996/9997); nothing opens on top of this sheet (ABC mode
renders into this very list, and tapping an item closes it).

⚠ **960 is what made it fatal, not what caused it.** With sections collapsible, a fully folded
list no longer overflows — so it cannot scroll, and the covered rows went from awkward to
unreachable. See **BUG_CLASSES 58**: `sweep_navclear.py` counts **42** full-screen overlays still
below the installed nav.

Gate: `render_libnav961.mjs` (8 assertions at 390×844 with `body.standalone` forced, folded and
open; hit-tests rather than rectangles; control red 5 named — it reports a touch on the last
section landing on `#pwaNav`). `render_libpicker960.mjs` re-run green.

## Bottom-bar clearance, done the app's own way (build 962, 21 Aug 2026)

⚠ **This supersedes 961's mechanism.** 961 raised `#cr-est-picker` to 9995. Builds **595**
(`#projModal`) and **935** (`#cr-pb-modal .sheet`) had already answered this with **clearance**,
and 935 wrote down why: *"Clearance, NOT a bigger z-index … one mechanism per concept is the rule
here. 88px is ITS constant."* 962 reverts the z-index to 9510 and uses the constant.

Four sheets that run flush to the bottom edge now carry
`body.standalone { padding-bottom: calc(88px + env(safe-area-inset-bottom,0px)) }`:

| Surface | Was |
|---|---|
| `#cr-est-picker .box-list` | `env(safe-area-inset-bottom)` only |
| `.cr-psheet` | 30px |
| `.paymodal-bd` | `calc(20px + safe-area)` — its Delete button sat under the bar |
| `.cr-cadj-bd` | `calc(20px + safe-area)` — same |

(`#cr-abc .bd` already had 120px of its own; `#cr-pb-modal .sheet` had 88 from 935.)

**Clearance beats the z-bump on its merits, not just on consistency:** the bar stays visible and
usable, and because the padding makes the scroller taller than its box, **a list too short to
scroll becomes scrollable** — the exact case that stranded the last trade at 960.

Gate: `render_navclear.mjs` (renamed from `render_libnav961.mjs` — it is a class check now).
8 assertions, and **every one now tests the outcome rather than the mechanism**, so it passes
under either and survives the next change of technique. Red on both the 960 tree (a touch on the
last section lands on `#pwaNav`) and the 961 tree (content still ends at 844 with the bar starting
at 781). `render_libpicker960.mjs` re-run 13/13.

**Not done, deliberately:** the full-height panes (`#cr-est-view`, `#cr-show`, `#cr-owner`,
`#cr-ped`, `#cr-can`, `#cr-sc-panel`, `#cr-ce-view`, `#solModal`, `#cr-lil-view`, `#cr-itellab`,
`#cr-epub-preview`). Each needs its own scrolling element identified; padding the wrong box does
nothing. See BUG_CLASSES 58.

## Full-height panes clear the bar (build 963, 21 Aug 2026)

962 did the bottom sheets; this does the panes that fill the screen. Nine surfaces gained
`body.standalone { padding-bottom: calc(88px + env(safe-area-inset-bottom,0px)) }`:

| Surface | Shape | Was |
|---|---|---|
| `#cr-owner`, `#cr-can`, `#cr-sc-panel`, `#cr-ce-view`, `#solModal` | the pane **is** the scroller | none / `4vh` |
| `.cr-lil-list`, `.cr-itellab-body`, `#cr-epub-preview .pv-body` | flex-column pane, the **body** scrolls | none / 24px / 14px |
| `.cr-ped-tools` | **not a scroller** — a toolbar whose swatches sat in the bar's band | 10px |

⚠ **The padding belongs on the box that scrolls.** A `flex-direction:column` pane is not the
scrollport; padding it does nothing. `#cr-est-view` needed nothing at all — its `.cr-est-body`
already carried 150px.

**`#cr-show` is deliberately excluded** — the client-facing Showcase is a presentation surface with
`min-height:100vh` slides and settled design decisions.

Gate: `render_navclear.mjs` assertion 9 — measured on the real element where it exists
(`#solModal`, `.cr-itellab-body`), read from the CSSOM where the module builds it at runtime, and
**which of the two answered is printed on pass as well as fail**, so a CSSOM-only result is never
mistaken for a rendered one. Control red on the 962 tree, naming every pane and its value.

## Siding and gutter agreements get catalog dropdowns (build 964, 21 Aug 2026)

Theo: *"something about them feels and looks off … can't they look like the master roof contract
when filling out?"* Measured first — that feeling has a number behind it:

| | Roofing | Siding | Gutters |
|---|---:|---:|---:|
| dropdowns **before** | 12 | **0** | **0** |
| free-text boxes | 30 | 47 | 44 |
| dropdowns **after** | 12 | **12** | **5** |

Seventeen `.ph` spans became `<select class="crsel">`: siding brand / profile / colour, corner
post, window-and-door trim, soffit, fascia, shutters, the three accessory counts, the gutter
colour on the siding sheet; and on the gutter sheet the gutter colour, downspout colour and
count, fascia wrap colour and stories.

**Four new kinds, one new table reader.** `sbrand` · `sline` · `scolor` · `gcolor` read
`materials` — the same table the Visualizer uses, whose `category` CHECK excludes roofing so the
two catalogues can never disagree about a shingle. **This is that table's first reader inside
`index.html`**; it is fetched once per document and only when a select actually needs filling,
exactly like the `oc_colors` one.

⚠️ **`status` is `'current'`, not `'active'`.** Checked against production before the filter was
written: all 84 siding / 28 gutters / 4 trim rows are `'current'`. Filtering on `'active'` would
have matched nothing and shipped four empty dropdowns that looked like a working build — the
shape of the photo-signing bug CLAUDE.md records.

**84 siding colours are grouped by `manufacturer · product_line` with `<optgroup>`.** A flat list
of 84 is unusable at a kitchen table, and an `<optgroup>` is markup, so it clones on save exactly
like an `<option>` — no new persistence rule.

**Saved contracts are untouched.** `wireColorSelects` fills only an empty select, and documents
saved before 964 carry `.ph` spans rather than selects, so they keep the fields *and the
wording* they were signed with.

Gate: `gate_964.mjs` (9 assertions — the kinds present, one reader, the `current` filter, grouped
siding and gutter lists, de-duplicated brand/line lists, trim and qty undisturbed, the `selected`
attribute surviving a clone, and a pre-filled select left alone; control red 7 named). The
shipped `wireColorSelects` is driven directly against the real row shape rather than a
re-implementation.

**Still free text, deliberately:** the `[yes / no]` fields. Those want checkboxes, not dropdowns —
a separate pass.

## Add a field to a contract by hand (build 965, 21 Aug 2026)

Theo: *"fillable sections? Manually adding text box, checkmarks, dropdowns, signature and initial
lines."* Placement is **at the caret**, his pick from three offered.

**＋ Field** in `.edbtns` opens a sheet: Text box · Checkbox · Dropdown · Signature line ·
Initials line · Remove the field here. A dropdown asks which list — `yesno` (new) · trim · siding ·
gutter · shingle · numbers.

**Almost none of this is new machinery, which is the point.** Fields are wired by CLASS — `.ph` is
already in `EDITABLE_SELECTOR`, `.cbx` is claimed by `wireCheckboxes`, `select[data-crsel]` by
`wireColorSelects` — and **both wire passes already guard against double-binding** (`data-cbx`,
`data-crsel-wired`), so re-running them after an insert is safe by design rather than by luck.

**Two rules, both already paid for here:**

1. **The value lives in the markup.** `serializeFrame()` clones, and `cloneNode(true)` copies
   attributes, not a control's live state. A ticked box is the character `☑`; a chosen option is a
   `selected` **attribute**. Anything inserted obeys the same rule or it saves blank.
2. **It goes only where the document is editable.** The caret is checked against
   `EDITABLE_SELECTOR` first, and **the refusal says why** — a heading, the roof diagram and the
   signature block are all fixed.

⚠️ **`pickSigner` was a WHITELIST and this build had to open it.** `order =
['buyer','cobuyer','contractor']`, filtered against the document — so a signature line added by
hand carried a key the list had never heard of and would have rendered, sat there, and **never
been offered**. That is the `normStage()` shape exactly. It now appends any `[data-sig]` the
document actually contains, the three known ones first so the familiar order does not move, each
extra labelled from its own `data-sig-label`.

Inserted fields carry `data-added="1"` and can be removed again; printed ones refuse, and say so.

Gate: `gate_965.mjs` (12 assertions, driving the **real** editor on a **real** siding agreement:
the fence refuses a heading with a reason, each type lands at the caret, the checkbox is *wired*
and its tick survives a clone, the dropdown is populated and its choice survives a clone, two
signature keys do not collide, `pickSigner` offers them, and remove works only on added fields;
control red 10 named).

⚠️ **The control CRASHED twice before it reported.** First on `window.insertField is not a
function`, then on `caretIn(null)`. BUG_CLASSES 37, twice in one build — guard the **interaction**,
not just the symbol. And assertion 8 passed vacuously at first, because `[].every()` is `true`.

## The fill counter (build 966, 21 Aug 2026)

Theo's option 5. A chip beside **＋ Field** counts what is still blank, red while anything is,
green at zero, and jumps to the next blank when tapped (outlining it in the live document).

**What counts as blank, and why each rule is what it is:**

| Counted | Rule |
|---|---|
| a `.ph` still showing its own bracketed prompt | 275 placeholders ship across the three templates and **every one** is written `[like this]`, so the test is the template's own convention rather than a guess |
| `select[data-crsel]` with `value === ''` | nobody has chosen |
| a `data-group` checkbox **set** with nothing ticked | 28 such sets; they behave as radios |

**Not counted, deliberately:**
- **Signatures.** Filled by the signing flow, not by typing. A rep filling this in before anyone
  has signed must not be told three things are missing — Client signature is its own button.
- **Ungrouped checkboxes.** Gutter guards, the closeout checklist — genuinely optional. Counting
  them would report ten things "missing" on a finished contract, which is how a counter earns
  being ignored.

⚠️ **It counts; it does not block.** A field can legitimately be N/A, and a hard stop on a legal
document is a worse failure than a visible number — it teaches people to work around it. The chip
being red is the part that prevents the mistake.

⚠️ **The highlight is injected into the LIVE document, not shipped in the skeleton**, because a
contract saved before this build carries its own copy of the skeleton CSS and would have no rule
for it. Recounts are delegated on the document (`input`/`change`/`click`, capture, debounced), so
they survive a re-render and cover a field added by hand at 965 with no second registration.

Gate: `gate_966.mjs` (12 assertions on the real editor and a real siding agreement — what it
counts and what it refuses to count, each of the three kinds dropping the count when filled, the
green "All filled" state reached by filling everything, the jump outlining a blank and moving on,
and a hand-added field being counted; control red 11 named).

### Print fidelity on contracts and estimates (1036)

`ensurePrintFix(d)` in the report-editor block is the single place the printed page's furniture is
decided: which editing chrome is dropped, where the page breaks may not fall, the running header
(`@page{@top-left}`) and the address footer (`@page{@bottom-center}`). **Both the Print button
and the Download button call it**, so the `.html` a client is emailed prints the same as the copy
printed in the office. It is injected into the live document rather than shipped in the skeleton,
because a document saved earlier carries its own frozen copy of that skeleton's CSS.

The old `.runhead` element is still in every template and still in every saved document — it is
`display:none` **in print only**. Do not delete it and do not restore it to the printed page; see
BUG_CLASSES 59.

---

# The 21 Aug 2026 audit follow-through — builds 967–975

An end-to-end design and ease-of-use audit ran across every workflow on 21 Aug 2026
(`CR_UX_AUDIT_2026-08-21.md`, 142 deduplicated findings — 4 P0, ~23 P1). These nine builds are
the top of that list. **967–970 are the app-wide P0/P1s; 971–975 are the first five items of the
seven-item Community program**, which exists because Theo's verdict on Community was *"it's the
third time I changed it, it just doesn't feel right"* — four redesigns changed the paint, and
five structural invariants survived every one.

## Offline changes the server refuses (build 967) — `cr-outbox-script`

The outbox retried a queued write, and **deleted it on any failure that was not a network
error** — a refusal, an expired session, a validation error, all silently thrown away, with the
badge then reporting "All changes synced". Refusals are **kept** now, in a fifth badge state
(`stuck`, 9.79:1), and `openPanel()` shows what is stuck, why, and offers Bury for the one you
genuinely want gone. `_justSynced` is `sentSome && !droppedSome`, so the green message means what
it says.

⚠️ **`droppedSome` was never reset per flush in my first cut** — one refusal would have gagged
the green message forever. My own gate assertion caught it before it shipped.

Gate: `gate_967.mjs` (15 assertions, driving the real `CardinalOutbox` through a scriptable
transport; control red 11 named, including `text="All changes synced"`).

## The Supplement Desk stops signing you out (build 968) — `supplement.html`

`index.html`, `studio.html` and `supplement.html` all build their Supabase client with the
**default `storageKey`** against the same project on the same origin, so all three read **one**
stored session. The Desk's admin check called `sb.auth.signOut()`, which in supabase-js v2
defaults to scope `'global'` — **a rep who tapped "Supplement Desk" was signed out of the entire
CRM, on every device.** The refusal is now in-page and touches no session, 671's rule is honoured
(a failed *check* and a *no* are different sentences, and only the failed check offers Try again),
and the Desk finally has a way back to Cardinal.

⚠️ **The menu row is deliberately NOT hidden.** The menu's `isAdmin()` is the hardcoded
theo@/joan@ pair; the Desk's real gate is the database's `is_cardinal_admin()`. Hiding the row on
the weaker test would hide the Desk from a real admin.

Gate: `gate_968.mjs` (12 assertions; the stub Supabase **records** `signOut` instead of performing
it, because "was it called" is the whole question. Control: `signOut called 1x`,
`session present=false`).

## Claims / Coach / auto-stage messages you could not read (build 969)

Three modules' own `toast()` appended **into** `#cr-claims-mount` / `#cr-coach-mount`, which are
`position:fixed` with a pinned `z-index:60` — **a stacking context**. `#pwaNav` is 9990 in the
**root** context. So the obvious fix (a bigger z-index on the toast) is a **silent no-op**; only
leaving the mount works. All three now delegate to the shared `window.toast`, keeping their own
path as a fallback.

⚠️ **The gate's first version could not fail.** It called `window.toast` directly — testing the
channel that already worked — and went green on the control. It now **extracts each module's own
shipped `toast()` by brace-matching and executes it**. Control red 5 named, all naming `pwaNav` as
the element composited on top, plus ink at 2.07:1.

## Publish acts on the estimate you have open (build 970)

Publish, → Contract, Mark-as-Sent and the plain Save all read `window.currentProject`, which
**only `openProject()` sets**. Open a saved estimate from Menu → Estimates and that global still
points at the last client opened — so `pickEstimate()`'s id match failed and `rows[0]` handed back
**a different client's newest estimate**. One shared `estProjectNow()` prefers the open editor's
own project; `pickEstimate` **refuses** rather than substituting; both publish paths guard a null.

⚠️ **The audit found three sites; recon found a fourth** — the plain Save was moving the wrong
client's stage.

Gate: `gate_970.mjs` (11 assertions; control returns `e-OTHER-newest`).

---

# The Community program — builds 971–975 (five of seven)

**The diagnosis, stated once.** Four redesigns changed how Community looked. These five
invariants survived all four, and they are what "doesn't feel right" actually is:

| # | The invariant | Fixed at |
|---|---|---|
| 1 | the retail stage machine's story stops in the middle of a community job | 971, 972 |
| 2 | partner identity lives in three storage shapes and nothing reconciles them | 973 |
| 3 | two opposite amount-precedence rules, six definitions of "the amount" | 974 |
| 4 | the hub is a wall of counters, not a set of doors | 975 |
| 5 | one design era per redesign, layered rather than replaced | **item 6, open** |

Live data at audit time: **15 of 15 community jobs at stage `Lead`**. Not a coincidence — the
pipeline could not be advanced from the card.

## The pipeline unfreezes (build 971) — `cr-cc-script`

`threadHtml`'s Lead arm keyed its buttons on the estimate **object**, so the **7 jobs priced by a
hand-typed `checklist.lead.bid_amount`** were offered only "Price it" and never "Mark it
submitted" — while the one job carrying two **$0.00 draft** estimates got the submit button.
`priceOf(pr)` answers with a **number**, which is the only thing that tells a real price from a
$0.00 draft. Logging an amount now offers the stage move it stamps a date for, and never when the
amount was cleared. The `.alt` secondary-button rule had been inert at equal specificity.

## The stage story finishes (build 972) — `cr-cc-script` + `cr-pb-script`

`threadHtml` had arms for Lead, Prospect, OnHold, Approved and Completed **and nothing else** —
so a community job went **silent from the moment it was scheduled**. Scheduled, Invoiced, Closed
and Lost now have arms; "Get on the calendar" opens the real day sheet prefilled
(`CardinalProduction.schedFor`) instead of writing the stage behind your back.

⚠️ **The gate's floor was too weak at first** — it passed on the control because `threadHtml`
falls back to a generic "Bid requested" card. Tightened so **each stage must name its own state**;
the control then read `generic or missing: ["Scheduled","Invoiced","Closed","Lost"]`.

## One partner identity (build 973) — `cr-cpartners-script` + `cr-nbid-script`

`cr-cpartners` wrote `checklist.lead.partner_id`; the hub's `partnerOf()` reads `partner_name`;
the referral path writes a free-typed name with no id. Attaching a partner on the card left the
hub saying **"No partner recorded"**; clearing one left a **ghost name**. The pair is written and
cleared together now.

⚠️ **A confidential partner is stored by id ONLY** — denormalising its real name into the project
row would leak it into the hub, the search haystack and every print path, which is exactly what
`get()`'s mask exists to prevent. And **the New Bid picker was reading the unmasked roster**
(`load()` rather than `list()`), so a confidential partner's real name was shown to every user and
written into the job.

**Half of this item is deliberately deferred** — the read-resolver needs two decisions from Theo
(the DHRN name drift; what happens to `partner_id` on a free-typed referral). Zero live rows are
affected either way.

## One bid amount (build 974) — main block + `cr-cc` + `cr-ch2` + `cr-can`

**Six definitions**, two with **opposite precedence**: the card preferred the estimate builder and
fell back to the typed figure; the hub's `bidAmt` preferred the typed figure and fell back to the
estimate. One job, two screens, two numbers. Analytics read a seventh answer and counted **every
builder-priced bid as $0** in the win rate.

`commBidAmount(pr, est)` at depth 0 in the main block is the only ladder now: **awarded →
submitted → builder → typed → none**. It takes the estimate row as a **parameter**, because
`liveEstimate()` is per-open-job state and a shared helper that called it would hand the open job's
total to every row of a list.

⚠️ **The Bid tab printed $0.00 on every line** — it multiplied `it.qty * it.price`, and no
production line object carries a `price` key. **The obvious swap to `unit_price` ships a NEW wrong
number**: 14 of the 18 live estimate rows are non-itemized, where `unit_price` is 0 and `amount`
carries the money. It uses the rule the shipped estimate document already uses.

**CR-COM-009 closed**: recording who funded an award now moves the bill-to — guarded, because
`mergeCk` deletes a key set to `''` and an unguarded write on a blank select would have wiped it.

## The numbers become doors (build 975) — `cr-ch2-script` + `cr-ch2-styles`

**Ten dead ends**: five KPI tiles, three "waiting on you" rows, two tally lists — all wearing
`.cc-prow`'s `cursor:pointer`, none of them doing anything. Each is now a door onto exactly the
rows it counted, through one `applyDoor(spec)`, with the number and its destination coming from a
**single declaration** so they cannot drift. A zero-valued tile stays a plain `<div>`.

⚠️ **A prerequisite had to land first.** The All-bids filter bar lives **inside** the All-bids
fold, and fold state was a DOM class `render()` destroyed — **so tapping Apply closed the table
you were filtering.** `folds{}` now outranks the default, the same shape as the existing
`closed{}` + `closedStamp`.

Four adjacent defects went with it: "Open bids" counted every job ever including closed and lost;
`.cc-kpi div` is a **descendant** selector so every tile drew **three nested cards** (measured:
`tile=3px .k=3px .v=3px`); `queue()` dropped its closing `</div>` for `role === 'prod'`; and a
parked job's **overdue check-back could never go red** and never reached Due soon at all.

Gate: `gate_975.mjs` — 13 assertions, and a **real drive**: it seeds an eight-job community book,
opens the hub, **taps the tiles** and reads what the table then shows. Control red 12 named.

**Still open in the program: item 6 (one design era — the cream dialogs, light-mode literals, a
second green and 7px labels left by four layered redesigns) and item 7 (one Job Menu).**

---

# Punch-outs — the tarp kind, the waitlist, and two more doors (builds 976–978)

Three builds off Theo's own working session on the punch screen. Together they close the
free-tarp loop the Community program left dangling: a tarp is now nameable, a job doing one for
free can sit on a waitlist instead of pretending to be an open bid, and either can be filed
without going to find the Production board first.

## Tarp is its own kind of punch-out (build 976)

Punch-outs were **Punch / Ticket / Callback**. A tarp is none of those: it is the thing we go and
do straight away so the house stops taking water, and on a community job it is often done **free,
before anything is bid**.

⚠️ **Five blocks own the kind, and this is the `normStage()` shape.** The card's label chain ENDS
by calling anything it does not recognise a punch, so a kind added to the dropdown and nowhere
else is silently mislabelled everywhere it appears. All five moved together:

| Block | What |
|---|---|
| `cr-pb-script` | the Add-an-item sheet offers **Tarp** |
| `cr-pk-script` | the card's label chain names it, **before** the Punch-Out fallback |
| `cr-punch-script` | `vals:['punch','ticket','callback','tarp']` — the Type facet can pull up every tarp |
| main block | the activity feed says *"Tarp done:"*, not *"Repair closed"* |
| `cr-ppg-styles` | its own chip, distinct in **both** themes |

Gate: `gate_976.mjs` — 11 assertions. Runs the **shipped** label chain (a tarp reads `Tarp`; an
unrecognised kind still falls back to `Punch-Out` — the fence), and measures the chip's ink
against the ground it really composites over, both themes. Control red, 6 named.

## A community job can sit on a waitlist (build 977) — `cr-cc-script` + `cr-ch2-script`

Theo: *"with some of these organizations we help communities by doing tarps for free without
bidding yet so they stay on a waitlist."* There was nowhere to say that — the card kept asking
for a price and the job counted as an **open bid it had never been**.

⚠️ **NO NEW STAGE, and that is the whole design.** `STAGES` is the whitelist `normStage()`
enforces and it is **shared with retail and insurance**; a Community-only `Waitlist` entry would
appear in both other pipelines. The waitlist is `ck.lead.waitlist_at` — a date on the job, read by
`waitlisted(pr)` / `waitDays(pr)`, with `waitlist` / `unwait` acts on the card's Lead arm.

⚠️ **`waitDays()` floors on a local calendar day** and does not use `daysTo()`. `daysTo` rounds,
which is right for a future deadline and wrong for elapsed days: 14 days back read as 15 after
midday. That was my own off-by-one, caught by the gate.

The hub counts them **separately** — `chWaiting(pr)` is checked before `OPENSET[st]`, so a
waitlisted job leaves the open-bid count and its amount leaves the open total — and **Waitlist** is
a KPI tile (`when:!!d.wait`) and a `CH_GROUPS` facet, so the number is a door like the rest of 975.

Gate: `gate_977.mjs` — 11 assertions, control red 7 named.

## Start a punch-out from anywhere, and find one by PO (build 978)

Theo: *"Can you do a plus new punch out and make it to where you can search by name address or
po"*.

**Two doors, not a second form.** `openAdd()`/`saveAdd()` in `cr-pb-script` are the ONE add
pipeline, and they carry the 605 off-stage job tail, the 767 roster sort, the 882
date-without-time invariant and the SQL-before-HTML retry. So 978 adds entry points:

| Door | Where |
|---|---|
| `data-new="punch"` → **Punch-out** | the global ＋ menu, with the `ladder` glyph the nav already uses for this page |
| `#puNewBtn` → **＋ New** | the Punch & Repairs head, beside the title |

Both land on `CardinalProduction.newPunch(pid)`, which **reloads the shared punch layer first**.
That is not defensive padding: the job list is `boardJobs()` — active-stage jobs **plus every job
that already carries an item** — and that second half is silently empty on a cold layer, which is
the 605 defect wearing a new hat.

⚠️ **`newPunch()` sits beside `addFor()` rather than replacing it.** `addFor(pid)` is the
in-context door (a job is already on screen, so its row is in the list by construction);
`newPunch()` is the door from anywhere else. And it is **deliberately not folded into `openAdd()`**
— that would turn a synchronous modal opener into an async one for its three existing callers.

**The third consumer, finally told.** `saveAdd()` refreshed the Production board and the client
profile's Punch Outs tab. Punch & Repairs read the same pipeline and was never notified, so an
item added with the page open stayed hidden until a reload. It now repaints, **guarded on the page
being on screen**.

**PO search.** The box promised *"item, client, address"* and delivered exactly that. The PO
number matched nothing. The hay gains it in the shape the client list and header search already
use — `'#' + po + ' ' + po` — so **1042** and **#1042** both find it; placeholder updated.

⚠️ **A stubbed helper is not a reachable one.** The gate supplies its own `poOf`, so green there
says nothing about the real one resolving from inside `cr-punch-script`. Verified in a live
Chromium render: `typeof poOf === 'function'` → true, `poOf({po:1042})` → 1042. Without that the
PO search could have shipped inert with every assertion green.

Gate: `gate_978.mjs` — 17 assertions. Runs the shipped `match()` over a job with a real PO (bare
hit, hashed hit, **a different PO must MISS**, name/address still match), runs the shipped
`newPunch()` against a recording shim to prove the reload precedes the job list, and measures
＋ New at the 44px touch floor in a real render, both themes. Control red, 11 named.

## The header can name every screen now (build 979) — `crmHead()` + `goHome()`

`crmNow()` names five views. `punchView` and `teamView` were not among them, so both answered
`retail`, fell through to `stickyCrm()`, and wore whichever portal you had last used — the same
page under the Community green (`#047857`), the Insurance white (`#FFFFFF`) or the Retail steel,
decided by where you had been. Both now resolve to `production`.

**Nothing was designed.** `body[data-crm-head="production"] .site`, its `#cr-hd2-ribbon` rule, its
`#cr-hd2-bar` border and `TITLES.production` all already existed for the Production board.

⚠️ **`data-crm` is untouched — the head moved, the PAGE did not.** Punch & Repairs is cross-CRM by
construction (it lists items from all three and carries a CRM filter facet), so a
production-tinted ground would be a lie. This is 754's line: grounds and module gates do not follow
the portal, only the header does.

⚠️ **The check is LAST in `crmHead()`**, after `crmNow()` and after the `projopen` guard — an open
project and a real CRM view both still outrank it.

**`crmHead()` has three other consumers, and one of them would have broken quietly:**

| consumer | effect |
|---|---|
| **`goHome()`** | ⚠️ would have moved the gold house from your CRM's home to **retail home**. Fixed in the same build: `if(crm === 'production' \|\| crm === 'sales') crm = stickyCrm();` — production and sales are TOOL screens, not portals. This also repairs the older wart on the Production board and the Sales Floor |
| **`portalNow()`** → `syncPortalSections()` | the burger menu goes Production-shaped on these screens (Production section unhides; Sell, newbid and sol hide). Coherent — it is what the Production board already does — and the one visible change |
| **`paintCrmPills(k)`** | no `production` set, so it falls to `PILL_HOME` (Contacts / Leads). Neutral, right for a cross-CRM page |

Header ink on the steel ground, computed: `#ffffff` 17.26:1 · `#b9c0c9` 9.41:1 · `#7d8794` 4.74:1
· `#f5a623` 8.52:1. All clear 4.5:1.

Gate: `gate_979.mjs` — 12 assertions, control red 5 named. It **clicks the real gold house** with
the three destinations spied (`goHome` is module-scoped; re-deriving its mapping would test
nothing), and it **builds a copy of its own artifact with the guard removed** to prove that check
can fail — at least four destinations must move without it.

## Community's type actually applies now (build 980) — `cr-cc-styles` + `cr-ch2-styles`

Thirty rules were written `font:<weight> <size> inherit`. **`inherit` is legal only as a whole
value, never as one component of a shorthand**, so Chromium discards the entire declaration —
weight and size with it — and the element renders at whatever it inherits. Inside one card, half
the labels were the designed voice and half were the browser's.

**94 such declarations existed file-wide; 83 of the 88 attributable to a selector were verified
dropped in a real render.** 980 fixed the 30 in Community; **build 983 swept the remaining 64.**
✅ **The file-wide count is now 0** — see the section below.

⚠️ **The repair is longhands, not a family.** `font-weight:700;font-size:13px` says exactly what
the author meant — inherit the family, set weight and size. Choosing a family would invent a
decision nobody made, and longhands also avoid the shorthand's reset of `line-height` /
`font-style` / `font-variant`, which today never happens because the declaration is discarded.
Three rules carried a `/line-height` and got a real `line-height`.

⚠️ **Nothing in the gate ladder can see this class.** It is BUG_CLASSES' *"a rule that parses,
balances and never applies"* — brace balance, `node --check`, duplicate-id, marker and negative
control are all green while the screen is wrong. **The only instrument that settles it is
Chromium's own parsed rules**: read each rule's `style.cssText` and ask whether `font-size` and
`font-weight` are present. ⚠️ Do NOT ask whether the declaration block is *empty* — a real rule
carries other declarations, so only the font line vanishes; that question returns a confident zero.

Gate: `gate_980.mjs` — 10 assertions, control red 7 named. It walks the parsed rules, and
**builds a copy of the artifact with the invalid shorthand put back** to prove that test can fail.

## The rest of the app gets its type back (build 983) — thirteen stylesheets

The other 64. **58 stylesheet rules across thirteen blocks plus 6 inline `style=` attributes** in
JS-generated markup, every one of them `font:<weight> <size> inherit` and every one discarded whole
by the parser. Same defect as 980, same repair, wider blast radius:

| block | rules | | block | rules |
|---|---:|---|---|---:|
| `cr-show-styles` (the Showcase) | 25 | | `cr-sc-styles` | 3 |
| `cr-sf-styles` (Sales Floor) | 7 | | `cr-storm-styles` | 3 |
| `cr-ci-styles` | 4 | | `cr-punch-styles` | 2 |
| `cr-cth-styles` | 4 | | `cr-lib-styles` | 2 |
| `cr-ic-styles` | 3 | | `cr-lnav-styles` | 2 |
| | | | `cr-sol` / `cr-hd2` / `cr-abc` | 1 each |

The Showcase's 25 matter most — it is the **client-facing** presentation surface, the one Theo
opens at a kitchen table, and half its labels were rendering in the browser's default rather than
the designed voice.

⚠️ **`font:700 13px var(--lb-sans,inherit)` is the same bug wearing a wrapper.** Two rules in
`cr-lib-styles` used it. That form is *valid when the token is declared* — the fallback is only
reached if it is not. `--lb-sans` has **0 declarations and 2 references**, so the fallback is always
taken and the declaration is always dropped. Proven in a three-case Chromium control, not argued.
**A `var()` fallback does not validate an invalid value; it only hides it from a grep.**

Gate: `gate_983.mjs` — 9 assertions, control red 5 named. ⚠️ **Its assertion 6 measured adjacency,
not invention, on the first run** — it flagged 26 rules because a `font-family` sat *near* the
converted declaration. Re-aimed at a delta: file-wide `font-family` **277 before, 277 after**.

⚠️ **983 also rewrote two of `gate_980`'s assertions**, which had pinned a file-wide snapshot total
(*"exactly 64 must remain"*). 983 swept those 64 deliberately, so a correct app turned a correct
gate red. Measured across 979 / 982 / 983 the invalid count went 94 → 64 → 0 while **plain
`font:inherit` stayed 27 and valid `font:` stayed 1291 in all three** — so no valid declaration was
ever consumed, and that is the contract those assertions now state. *Assert the contract over a
region, never the number you measured it at.*

## The preview rig (build 980) — `scripts/preview.mjs`

CLAUDE.md's standing instruction to preview visual changes had been unfollowable: **every
screenshot in this harness timed out**, and three attempts blamed fonts and animation.

**Neither was the cause.** The app has zero `@font-face` rules and zero webfont URLs. The harness
answered non-app requests with an empty body and **no content-type**, so an `<img>` never
completed, `readyState` stuck at `interactive`, and `document.fonts.ready` — which cannot resolve
until the document finishes loading — stayed pending forever. Playwright's screenshot waits on
that promise. **Serve by `resourceType()` with a real 1×1 PNG for images: the same shot takes
67ms.**

```
node preview.mjs --before <a.html> --after <b.html> --surface community-card \
                 [--widths 390,1194,1680] [--themes dark,light] [--out dir]
```

Width comes **only** from `setViewportSize` and theme **only** from the `data-theme` attribute the
app's own toggle writes — `@media (max-width:560px)` keys off the browser window, so an iframe
grid would confidently show a phone layout that is really a desktop one. Surfaces are named
recipes in the file; add one rather than passing selectors, so a recipe that lands on the wrong
screen fails once, in there.

⚠️ **Known gap: the `type-specimen` recipe renders blank for `#cr-cc`-rooted selectors.** The hub
half works. Three real harness bugs were fixed on the way — a chain hidden by the app's own rules,
`getComputedStyle` called on a **detached** node (which reports nothing, so the first repair
silently did nothing), and `position:fixed` stacking 28 samples on top of each other — and the
card-rooted half is still open.

## One job menu (build 981) — `cr-cc-script` + the `.ja-menu` tail

The community card's menu was a screen-scrape of `#jaGrid`, **retired at build 348** and painted
out by `#tab-overview` on every profile. Invisible original, so nobody saw the copy go stale:
Contracts opened Estimates, Appointments opened the company Schedule Board, and 9 of 10 labels
carried pre-686 emoji. Driven before/after: **10 → 15 buttons, 0 → 14 drawn icons, 9 → 0 emoji.**

**The real prize was two controls that render, update themselves and do nothing.** `#jobMenuSel`
and `#woQuick` call `showTab`, which reveals `#tab-<x>` inside `.wrap` — hidden by the community
takeover — and neither calls `suspendForTab()`. Inert at 390px *and* 1194px, so it was never the
phone rule. Fixed by wrapping `showTab` at the chokepoint both already use, which also lets the
mirror's dispatch delete its own suspend rule: one place owns "which acts suspend".

⚠️ **ADOPT was tested and REJECTED.** Moving the live `.ja-menu` into the card duplicates four ids
that async count-fills reach by `getElementById` (measured 1 → 2, no self-heal), because the next
`renderOverview()` rebuilds it in place. Keep the mirror; re-point it; re-query at click time.

⚠️ **`#jaGrid` is not deleted** — 5 of its 11 references are functional (markup, writer, router,
`cr-pp-script`'s punch anchor, the old scrape). Retiring it is its own build.

Gate: `gate_981.mjs` — 13 assertions, control red 8 named. ⚠️ **It seeds its own community job**:
the harness has none, so `#cr-cc` never mounts and an unseeded drive passes vacuously against a
retail profile. It asserts the card mounted before believing anything else, and asserts
`wasSuspended` before claiming Overview restored it.

## Community's light theme, finished (build 982) — `cr-ch2-styles`, `cr-cc-styles`, `cr-can-styles`

The second half of item 6 option 1. Five new `--ccm-*` pairs — `--ccm-warn`, `--ccm-warnsolid`,
`--ccm-onwarn`, `--ccm-nowfill`, `--ccm-washfill` — declared in **both** theme blocks, so the
namespace's no-orphans invariant holds (32 names → 37 in each).

⚠️ **`--ccm-warn` light is `#805500`** — the value 981 already shipped, not a second amber. Worst
light ground `--ccm-rdw` #fdecec at **5.71:1**.

⚠️ **Three amber grounds, two behaviours.** A ground that CARRIES TEXT must not flip or its ink
breaks (`--warnsolid`); a ground that carries nothing SHOULD flip to stay visible (the `.ev.now`
marker dot keeps `var(--warn)`: 6.53:1 in light where bright amber is 1.46:1).

⚠️ **`--ccm-nowfill` was referenced once and declared nowhere** — the fallback was the palette.

⚠️ **`.ct.bill`'s two-layer `padding-box` / `border-box` form is load-bearing.** Swap the FILL in the
same shape or the gradient border disappears. Fix it LOCALLY — `--ccm-wash` has 7 references and
only one is this fill.

Gate: `gate_982.mjs` — 10 assertions, control red 7 named, and the control prints the defect
(BILL TO 2.70:1 dark). ⚠️ **It reads a REAL PIXEL**, not a computed composite: two earlier versions
scored the ink against the border gradient (1.00:1 for legible text) and then against the glyph
itself (2.00:1). It walks to the nearest fill-painting ancestor and probes with `elementFromPoint`
for an unobstructed spot. It also reports surfaces the harness did not mount rather than skipping
them silently.

## The hidden-scrollbar strips, reached and unclipped (build 993) — seven `<style>` blocks + the sentinel walk

**Eleven** strips in this app scroll sideways with their scrollbar hidden (`scrollbar-width:none`
and/or `::-webkit-scrollbar{display:none}`). When one is wider than the screen there is no
affordance at all — no bar, no fade, nothing — so a phone user simply cannot tell the rest is there.

Build 984 fixed the first (`.cr-cth-tabs`) and added the sentinel's **CLIPPED** probe. The probe was
correct and had been measuring **one surface out of eleven**, because the other ten are built on
demand behind navigation the walk never drove. *An unmeasured scroller reads in the report exactly
like a clean one.*

**Where they live, and who opens each:**

| strip | screen | opened by |
|---|---|---|
| `.cr-lil-tabs` | Line Item Library | `window.CardinalLineItems.open()` — **admin-only**, on the module's own hardcoded list |
| `#cr-pae-tabs` | Photo Album | `openProject(id)` then `window.openGalleryMode('all')` — **`galMode` must be `'all'`** |
| `.cr-ped-row` ×2 | photo editor toolbar + colour row | `window.CardinalPhotoEditor.open(photo, opts)` |
| `.cr-ic-chips` | Insurance Clients | `window.showInsuranceClients()` — renders one rAF late, behind a style observer |
| `.cr-c-tabs.detail` | Claim Detail | `window.CardinalClaims.openOne(id)` — needs a claim row |
| `.cr-cth-tabs` | Cardinal Truth | `showCardinalTruth()` |
| `.cr-sh-tabs` | the Showcase | `window.CardinalShowcase.open()` — **no argument**; `{showroom:true}` drops a button |
| `.ljchips` ×1 | **Photo Activity (CRM) only since 1085** — the two Leads strips were removed | `window.openPhotosView()` |
| `.cr-ic-chips` ×1 | Insurance Clients — **clamped to one row at 1086** with a `+N` expander. ⚠ It has no funnel and no rail, so these chips ARE the filter: fold it, never delete it | `showInsuranceClients()` |
| `.cd-crmbar` | Client Directory | `openClientsDirectory()` — **absent ≥1100px by design** (`body.cr-lnav-on`) |
| `.pu-tabs` | Punch & Repairs | `await window.openPunchView()` |

⚠️ **Shown by a CLASS, not `display`:** `#cr-lil-view`, `#cr-ped`, `#cr-show`. Writing
`style.display` onto any of them is permanent damage — their open paths never clear an inline style.
⚠️ **`hideAllViews()` does not know about `#cr-lil-view` or `#cr-ped`** — `closeStragglers()` in the
setup file is what dismisses them, and removing it lets either cover every later state.

**Seven were clipping at 390px** and now wrap: `.cr-lil-tabs` (525px hidden, 5 of 8 categories),
`.cr-ic-chips` (481), `#cr-pae-tabs` (414), `.cr-ped-row` (261 — **Undo and Clear**),
`.cr-c-tabs.detail` (245 — Documents, iTel, Record), `.ljchips` (87, and **94 at 1194px**),
`.cr-sh-tabs` (55 — **Inspections ↗, the way out**). Desktop is byte-identical; they already fitted.

⚠️ **`.cr-sf-tabs` was the eleventh and is gone.** The Sales Floor's category tabs went at build 928;
five CSS rules outlived them by 65 builds.

Gate: `gate_993.mjs` — reach **derived** from `document.styleSheets` (so a new scroller is covered
without editing the gate) plus a **hardcoded ten-name floor** (so the count cannot shrink silently),
and a fifth assertion that fails if the floor is ever emptied. Control on 991: PASS 15 · FAIL 8.

### 1003 — the shared calendar

An appointment used to be visible only to whoever booked it (plus the two admins). Build 1003 shares
the two **work** kinds — `job` (build day) and `drop` (material delivery) — with everyone assigned to
that job, while keeping the personal `appt` and `team` kinds private to their creator.

- **RLS** (`appointments_shared_calendar.sql`): a permissive SELECT policy `kind in ('job','drop')
  and project_id is not null and exists(select 1 from projects p where p.id=appointments.project_id)`
  — the EXISTS runs under **projects**' own RLS, so visibility mirrors `projects_select` exactly (full
  access, creator, assigned rep, sales rep) with no duplicated rule. Plus an **own-or-admin** UPDATE
  policy that repairs 998's "Attach to a job" (previously joan-only, so silently refused for Theo and
  the creator).
- **The guard is the KIND, not the project_id.** Five personal `appt` rows carry a project_id;
  visibility keys on kind, so a diary entry never leaks even when it has a project attached.
- **Front end:** `apptCanEdit(a)` (`!TEAM || creator || admin`) gates the delete cross and the
  "Attach to a job" button in `renderApptList()`. A shared day you did not create is **read-only** —
  visible, but no button that would only error server-side. `adb.list()` already relies on RLS, so
  the shared rows appear with no client-query change.
- Verified against the live DB in rolled-back transactions: assigned rep sees the job day (not the
  personal entries), an unassigned rep sees zero rows, the creator/admin can update, a non-owner
  cannot. Gate `gate_1003.mjs` (11 assertions; control on 1002 PASS 6 · FAIL 5).

### 1004 — one source of truth for the address

The address lived in two stores — the flat `projects.address` column (used by the map, directions,
work order, recents, search) and a structured `checklist.lead.location.*` object (street/suite/city/
state/zip). Only retail intake wrote the parts and nothing updated them on edit, so the **Construction
Agreement (542)** — the one reader that read the parts unconditionally — printed the old address after
an edit while the map showed the new one. 1004 makes `pr.address` the single authority: the contract
fills its split boxes only when they reconstruct the current `pr.address` (punctuation/case
normalised), else it prints the flat address on `[STREET]`. Guarantees contract == map; also fixes the
blank contract address for profile-created leads (which never had the parts). `gate_1004.mjs` runs the
shipped fill block against five shapes (control on 1003: PASS 6 · FAIL 6).

### 1005 — the New Lead form enforces its starred questions

The intake form was split into essentials + "More detail" at 782 (which also enforced First/Last/
Street/City/State/Zip and phone-or-email in JS). Two starred questions still saved empty: **Claim
Type** defaulted to 'unknown' (17 of 57 leads had none) and **Lead Source** was optional here despite
999 requiring it on the profile add form (26 had none). 1005 requires both — Claim Type with a plain
refusal (always visible), Lead Source by opening "More detail" and shaking the field when it's the
blocker (the 782 reveal pattern), plus a `*` added to its label. No layout change. `gate_1005.mjs`
(Chromium, drives the real ldSave; control on 1004 PASS 2 · FAIL 5).

### 1036 — stage arrows: one tap, with Undo (dialog diet, slice 1)

The profile's forward/back stage arrows no longer confirm on every tap. A tap moves the job at once and
shows a 5-second Undo toast (window.CardinalUndo, shipped since 186). The transition is DEFERRED for the
window: the target stage shows optimistically (cache-only), and the real commit (setStage / acxAdvance)
runs only when the toast closes — so an undone tap never writes to the record and never fires setStage's
team email (Approved → Curtis "schedule + order materials"; Completed → rep+admins). Gmail Undo-Send
model. `crStageDefer` is the shared helper; `gate_1036.mjs` (source wiring + Chromium mechanism test;
control on 1005 FAIL 4). First slice of the dialog diet; alert→toast and prompt→inline remain.

### 1007 — a phone-signed contract buzzes Curtis too (remote signature parity)

When a client signs a contract from the secure share link, `api/clientsign.js` moves the job to Approved.
In-person signing (setStage) also emails/pushes Curtis "schedule + order materials" on that move; the remote
path only emailed the rep, so production never heard a remotely-signed job was ready. clientsign is
unauthenticated (share token = credential) so it can't call the session-gated /api/notify — it now sends the
same alert to Curtis + admins via the Resend account it already uses. Email parity (not push/SMS — deferred;
reliable channel is email). Also made the stage advance forward-only (no pulling a scheduled job back to
Approved, alert only on the real move). `gate_1007.mjs` (imports the handler, stubs fetch+env; control on
pre-1007 FAIL 3). Backend change; no screen change.

### 1008 — four fixes from the fresh audit (23 Aug)

An 8-finder audit at build 1007 caught four regressions in the day's own builds, fixed here: (1) 1005
Lead Source was written to checklist.lead.source but every report reads checklist.lead_source — the
intake now writes the flat key; (2) 1005 Claim Type refusal was dead (an 'unknown' radio was
pre-checked) — no type is pre-selected on a neutral portal now, so the choice is active and the guard
lives; (3) crStageDefer dropped a superseded move (2nd arrow tap, esp. cross-job) — a superseding tap
now commits the first move, and the target is captured + committed via setStage() directly (race-free);
(4) closing the app in the Undo window lost the move — a pagehide/visibilitychange flush commits it.
gate_1036 rewritten (14 assertions) + gate_1008 (6); controls on 1007 red. The audit's other confirmed
findings (incl. the critical api/abc.js open proxy) are logged in OPEN_ITEMS "Audit 2026-08-23".

### 1025–1030 — the manual-estimates arc (audit builds A–F; Theo: "1, A, own lane, button, drop it, hide")

Six builds from `CR_MANUAL_ESTIMATES_AUDIT_2026-08.md`, one per audit item, each with its own
Chromium gate (`gate_1025.mjs`–`gate_1030.mjs`, every one seen RED on its control):

- **1025 — the obsidian estimates screens, finished (pick 1: white money).** Total/deposit white on
  the black builder (were 1.98:1 dark red); gold hover states retired to zero; template menus dark
  (`#pEstMenu` + `#pContractMenu`); Balance Due de-inlined to `.db-due`; light-mode ink repairs;
  emoji out.
- **1026 — the lanes tell the truth (pick: own thin lane).** The walls knew draft/sent/viewed/
  approved/converted; the editor writes accepted/declined — Accepted lane claims `accepted`, new
  full-width THIN Declined lane (`--rbe-dec-*`), `creLane` fallback → null + a labelled
  UNRECOGNIZED STATUS safety net, discards filtered at load, footer sums honest (open =
  Unsent+Sent; declined prints when non-zero), editor Delete passes the real project id.
- **1027 — the client document, Option A + the phone fix.** `buildDocHtml` wears the serif
  letterhead (red = brand rule / section chips / grand total, no summary strip) + viewport meta +
  two screen media queries; content byte-identical, print untouched; share-wrapper hooks preserved.
- **1028 — AI assists inside the estimate (picks: button; hide the doors).** `api/caption.js`
  estimate-assist mode: ALL photos one request, schema-enforced `{overview, captions[],
  cover_index}`. Ghost button in the Photos head; captions fill ONLY empty boxes, overview APPENDS
  to Scope Notes, cover moves only when unstarred. Both ⚡ AI Estimate doors hidden (code +
  `ai_estimates` dormant); "+ New estimate" is the primary; the admin App Walk re-taught.
- **1029 — save-in-place + the satellite choreography.** Exported `CardinalEstimates.save()`
  promise; `cr-est-saved`/`cr-est-published`/`cr-est-status` events replace all four editor-close
  polls (cr-epub, cr-e2c, cr-ess ×2); cr-ess's body observer retired (45 → 44); Cancel → Close
  with dirty guard; "auto №" hint; phone bottom action bar (theme FAB lifts clear via :has).
- **1030 — classification by link; the dead table gone.** `isEstimateDoc()` classifies published
  estimates by the `doc_id` link first (Documents buckets, both approvals legs, job card);
  placeholder stops teaching the dodging title; cr-eaf's dead `wireStats`/`wireManualRows` out;
  **`manual_estimates` dropped in production** (`drop_manual_estimates.sql`, schema recorded for
  revert, refuses a non-empty table).

### 1032–1034 — the post-merge batch (Theo: "Merge then do 5-7")

- **1032 — the delete-client caption reads in light mode.** Inline dark-era `#a89f9a` (2.42:1 on
  paper) de-inlined to `.danger-note`; light reuses 1025's computed `#6c655e`. The lnav Landing
  yellow — the other audit-appendix ink — is deliberately untouched: 539 records Theo choosing it
  with the measurement in front of him; re-asking is on his reminder list.
- **1033 — the AI-estimate arm deleted, whole.** Both AI views + photo session + transport
  (−36.9 KB), the ai leg of loadList, claims/xlinks/ahc/inv/eaf legs, `api/estimate.js` + its
  vercel.json entry, e2c's ai mode. `drop_ai_estimates.sql` ships (with orphaned trigger-function
  drops) for Theo to run by hand. `gate_1033.mjs`: five sentinel states, zero pageerrors.
- **1034 — the audit's dropped LOWs, verified then fixed.** Forward-only review prompt; the New Bid
  property picker loads for real (`forPartner`/`byPartner` never existed); dead `logSubmitted`
  removed; SUPPLEMENT chip light twin; sw.js shells only the root offline (the manual iframe gets
  the honest offline card). `fix_onhold_stage_since.sql` ships for the one Maker Space row.
  Already fixed elsewhere: manual_estimates (1030), void readers (1015). Operator-only: leaked-
  password protection (advisor-confirmed off).

## Production hub — the audit's batch, items 1–5 (builds 1036–1040, 24 Aug 2026)

The CR_PRODUCTION_AUDIT_2026-08.md plan's first five picks, one build each, every one
Chromium-gated with a red control (gate_1036 … gate_1040), sentinel production-walk clean.

- **1036 — board panes are history states.** `[data-go="cal"]` and the box lists push
  `{view:'production', data:{pane, box}}`; the chevron pops the entry when it is on top;
  `CardinalProduction.restore(data)` (new export) re-panes an open board without the
  hideAllViews/showHome round-trip, and navRestore's production case calls it. Back from a
  profile opened out of a box list returns to that list.
- **1037 — profile tab flips replaceState** (one back leaves the profile from any tab, the entry
  remembers the tab), and `navRestore` holds `__histLock` for its restore window so modern
  restores can never `__histPush` legacy entries — the re-push that wedged the back button on
  the profile (audit T6) and silently shadowed every modern restore path.
- **1038 — production accounts exit to the Landing.** The board's own exit forks on
  `isProductionUser()`: Curtis/Scottie land on the portal picker (no pipeline counts, no A/R
  figure), admin/sales keep the retail home. Only the board's exit control reaches the fork —
  every other close() caller passes `false`.
- **1039 — the ink pass.** Punch-list chip family: full computed light twins (ambers #8a5500,
  reds #8f1620, hot reds #a8221a, insurance #a4140d, community #047857, st.on #23744a) and the
  two dark reds brighten to #ec7076; Check-in rides `--pk-accd`; dispatch gains the
  `--disp-wkend` token pair; board calendar chips build/punch/done clear the floor against
  their composited washes. Grounds pinned by reproducing the audit's ratios first.
- **1040 — the tap-target pass.** Invisible ::after pads to the 44px floor (418/944/947
  pattern, zero visual change): dispatch grip/week arrows/chevron, board chevron, month
  arrows, +Add and Full-calendar chips, Mark-ordered/Open-job. Two audit rows were false
  positives (`.pu-box` padded since 418, `.pkback` 44 since 947) — verified live, left alone.
  ⚠ pads anchor to the padding box: a 1px border costs a pixel per side.

## Production hub — the audit's second batch, items 6–9 (builds 1041–1043, 24 Aug 2026)

- **1041 — the menu footer is one line.** `data-cr-footer` had been prepending every build's
  summary since ~1015 (11.6 KB, 26 builds); it now holds only the current build's line and the
  patch convention is REPLACE (the HTML comment above the div is the contract). History lives in
  the CHANGELOG / What's New, where it always did.
- **1042 — Punch & Repairs is full-screen for production accounts.** `body.cr-prod` (set in
  showMain's 854 branch, toggled) scopes a fixed inset:0 z-9400 treatment on #punchView — the
  retail nav row and desktop rail are covered for Curtis/Scottie, byte-identical for everyone
  else. A punch-out card opened from the page still lands on top (9550 > 9400). No new
  scroll-lock writer.
- **1043 — desktop board: work beside the calendar.** 1100–1599px gets the ultrawide's
  month-left / work-right grid (Theo's pick B from rendered previews; values shipped verbatim).
  Phones and ≥1600 untouched.
- **Item 9 closed with no app change** — the "dead" dispatch name-clamp was the sentinel's DEAD
  check misreading Chromium's `-webkit-box` → `flow-root` line-clamp mapping; the clamp works.
  Fixed in sentinel_probe.js with a negative-controlled selftest case.

## Workflow efficiency — features 1–4 (builds 1044–1047, 24 Aug 2026)

- **1044 — universal search.** The command palette (Ctrl-K / the header magnifier) finds clients
  by PO #, claim # and policy #, and gains a Punch-outs group that jumps straight to the punch
  card. Crews and estimates deliberately out of scope (stated, not forgotten).
- **1045 — "Gone quiet."** Home card ranking active jobs by days-in-stage (14/14/21-day floors,
  red at 30), tap → profile. Lead / OnHold / insurance / Completed+ excluded by design — each
  already has its own home. Resolver note: projClaimType (not cdCrmOf) decides "is insurance".
- **1046 — saved snippets.** Quote-mark button at the three message composers; sheet inserts
  with a real input event; add/delete in place; four seeded defaults; localStorage per device.
- **1047 — notification matrix.** Build day booked → production crew; materials ordered → the
  job's rep; unassigned punch-out → production. All at chokepoints (adb.create/update,
  both materials writers, saveAdd), all fire-and-forget, actor never self-pinged.

## Workflow efficiency — features 5–6 (builds 1048–1049, 24 Aug 2026)

- **1048 — "Where things stand."** Admin-home chip row: approvals · needs-a-build-date · urgent
  punch · carriers to chase · today. Each chip is a door to an existing screen; every count comes
  from that screen's own resolver (`window.crApprovalsPending`, `CardinalProduction.schedFor`,
  `CardinalPunch.rows`, new `CardinalTruthHome.chase`). Hides at zero. **Not** the Owner Console
  (895) — that is owner-level (Top 10, tax/BWC calendar, expirations); this is job flow.
- **1049 — punch work survives no signal.** `punch_items` joins the 865 write outbox: networkish
  failures queue the full-value patch and keep the change, `reload()` overlays pending patches,
  the card says "saved on this phone". Real refusals still fail loudly. ⚠ Both the RETURNED and
  THROWN error shapes are handled — iOS throws (861), and the returned-only first cut would not
  have worked offline at all.

## Two phone fixes (build 1051, 24 Aug 2026)

- **1051A — Job Details trade checkboxes on insurance jobs.** `.acxtrs` is a direct child of a
  `110px 1fr` grid with no placement of its own, so it auto-places into the **label column** and
  the six trade words break mid-word ("Roo fing"). The 788–804 rebuild already gives it
  `grid-column:2 / -1; display:flex; flex-wrap:wrap`, but scoped
  `body:not(.claim-insurance):not(.claim-community)` — so **only insurance and community jobs were
  broken**, which is why it went unseen. Added the twin for those two, same geometry, dark-on-light
  rule colour for the cream pages. 110px → **168px**, labels one line.
- **1051B — the Contract Worksheet on the Payments page.** Seven `.ws*` rules were still light-era
  literals (`background:#fff`, `color:#1b1b1b`), rendering white cards on the black app directly
  below `.paysec` rows themed at 422. Fixed as an **added scoped block** —
  `:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community)` — with the
  base rules untouched, **because the insurance and community Payments pages paint their own cream
  ground and keep these cards light on purpose**. All six new inks 5.47–9.83:1. Light mode
  byte-identical.

## Insurance CRM audit — builds 1052–1054 (24 Aug 2026)

- **1052 — the insurance ink pass.** The client profile is one screen shared by
  three CRMs; its identity block paints `--rbe-*` (retail) while
  `body.claim-insurance` re-grounds the page from `--ct-*`. The retail inks do
  not flip with `--ct-bg`, so on the default insurance theme the **client's own
  name was `#ffffff` on `#FAF8F7` — 1.00:1, invisible**. Nine elements moved onto
  `--ct-*` tokens so they follow the insurance theme by themselves. Two app-wide:
  the **stage banner** grounds on `STAGE_INK` instead of `STAGE_COLORS` (white on
  it was 1.96–4.37:1 on EVERY stage; `STAGE_COLORS` itself is unchanged), and
  `.wsempty`'s base ink. Plus the claims primary button (2.78 → 6.85) and two
  claims pills, light-scoped.
  ⚠ `.dbmdir` is a fixed value ON PURPOSE — its bar never flips. `.db-paid` is a
  declared pair because no single green clears 4.5 on both grounds.
- **1053 — the reach pass.** The header title overlapped the home button by 28px
  at 360 and 13px at 390 (`left:50%` centres on the bar, but the button groups
  are asymmetric); below 430 it joins normal flow. "DEDUCTIBLE" stopped breaking
  mid-word. Eighteen controls raised to the 44px floor in `cr-touch44-styles`,
  worst of them the **17px-tall back links** out of the claim detail and the
  adjuster directory.
- **1054 — the hub and the client list agree.** The Truth rail could filter the
  Insurance Clients list to Lead / Prospect / OnHold, which had **no chips**, so
  the list showed a filtered set with nothing lit. Nine chips now, in pipeline
  order. "Supplement Filed" applies `__supplements__` instead of clearing the
  filter. The chips read `insStageLabel(s, true)` — the short twin build 656
  added for this very strip and which nothing was using (one chip measured 242px
  on a 390px phone).
  **The WORDS were already one vocabulary (655) and were not touched** — both
  `window.INS_STAGE_LABEL || {…}` fallbacks verified byte-consistent.

---

## 1055 — the Supplement Desk's EVIDENCE TABLE (`supplement.html`)

*Overhaul direction A. `index.html` untouched — it stays at 1054.*

Every gap on the "What the scope is missing" step now shows **three evidence
legs** as chips, and the letter will not carry an item that fails the required
two:

| leg | test | required? | chip reads |
|---|---|---|---|
| PHOTO | `g.photos.length > 0` | **yes** | `3 photos` / `no photo` |
| MEASURED | `g.qty` is a positive number | **yes** | `measured` / `your number` / `model count` / `no number` |
| CODE | `g.basis` is `code` or `manufacturer` | **graded** | `code` / `manufacturer` / `no code backing` |

- **`evidence(g)`** is the single source of the rule; **`sendable(g)`** is what
  every consumer counts. Enforced at **three** sites — `syncDraftBtn()`,
  `draft()` and `fileSupplement()` — so the filed record's `reason` names what
  actually went on the letter, not what was ticked.
- **Code backing is graded, not required**, deliberately: a trade-practice item
  has no citation to find and the human decides whether it still belongs.
- A blocked card is bordered, its checkbox disabled, and it carries
  *"Needs a photo and a quantity before it can go on the letter."* **Include
  anyway** arms it and swaps that for an amber *"Included without a photo —
  your call."*
- **`refreshGap(g)`** redraws ONE card in place — on quantity entry, on
  override, on the photo modal closing, and once at wire time. A full
  `renderGaps()` would lose the caret of a number being typed, which is the
  commonest way an item becomes sendable.
- Header line: `5 gaps found · 3 ready to send`, and the number tracks overrides
  live.
- ⚠ **Both the `.needs` and `.ovrnote` rows are rendered unconditionally and
  hidden when they do not apply.** Emitting them conditionally left
  `refreshGap()` with nothing to reveal — the override marker never appeared,
  and an item that *lost* its evidence later got no "needs" row either.
- **The API contract did not change.**

**Four repairs shipped with it, three of them older than this build:**

- `--sd-ok` / `--sd-warn` / `--sd-crit` gained **light twins** (`#2A732E`,
  `#7A5307`, `#B0281F`). They had none, while the light theme is the default
  landing: warn **1.84:1**, ok **2.59:1**, crit **3.35:1** on the gap card.
  `--sd-crit` was also under the floor in **dark** (4.27:1) and is now `#EB5A5F`.
  Affects seven `.pill.*` states, `.chip.lowconf`, `.gap .phcount`,
  `#loginView .err`.
- **The Desk's first screen media query** (`@media (max-width:560px)`) — it had
  only `@media print`. `header.sd-hd` wraps and `.sp` becomes a row break, so
  the buttons flow to line two at full size. *Sign out* had been off the right
  edge of a 390px phone since 668 (scrollWidth 423).
- **`#filingType`** got `max-width:100%` **and** `box-sizing:border-box` on its
  inline style — a stylesheet rule cannot beat an inline one, and max-width
  alone still overflows by the padding and border.
- **A build stamp, three ways**: the banner, a rendered chip in the header
  (`#sdBuild`, `--sd-ink2` at 7.01:1 dark / 5.85:1 light), and
  `window.SD_BUILD`. The Desk had shipped since 668 with none.

**Gate:** `gate_1055.mjs`, seven checks in Chromium against the real Desk with a
stubbed Supabase and `/api/supplement`, asserting on the **request body**. Green
on 1055, **27 named failures on the 1054 control**.

⚠ **The Desk's theme key is `cr-desk-theme`, not the CRM's `cardinalRLTheme`,
and its pre-paint head script overwrites whatever an init script set.** A rig
that sets the wrong key drives one theme twice and reports both as clear.

---

## 1056 — the chase clock (`cr-cth-script`, insurance hub)

*Desk overhaul direction C. Ships with `claim_chase.sql`, which **runs first**.*

The insurance home's **Chase List** used to show a bare day count and turn red
at a hardcoded 30 — a colour with nothing behind it, on a list sorted by raw age.

| | |
|---|---|
| `CHASE_POLICY` | the **one** place a threshold lives. `supplement filed` → first **14** days, then every **7**. `awaiting release` → **21**, then **10**. `CHASE_FALLBACK` covers an unlisted reason |
| `chaseDue(x)` | returns `{chased, limit, age, over}`, or **null** when the row has no date — a made-up zero would read as "chased today" |
| row wording | `6 days overdue` · `due in 4` · `chased 2d ago · next in 5` |
| `.stale` | now means **past the policy**, not past 30. A 40-day claim chased yesterday is no longer red; an 18-day one nobody touched is |
| sort | **by how overdue**, then by age. The reorder is the point of the build |
| `I chased them` | prompts for how, then writes `claim_notes` (the record) **and** `last_chased_at` (the state). 44px, and full-width on its own line below 560px |

⚠ **`sigOf()` carries a chase term, and it must keep it.** `build()` repaints
only when the signature changes, and the signature was counts and dollars only —
so a recorded chase repainted nothing and the row kept saying "6 days overdue"
right after you called. Anything new the chase row *shows* has to reach
`sigOf()` or it will not appear until an unrelated dollar figure moves.

⚠ **The thresholds are deliberately NOT a per-carrier average.** Measured 24 Aug:
5 claim rows, 3 orphans, 2 carriers, one `approved_at` falling on the same day as
its `first_scope_at`, zero `filed_at`. There is no history to average yet.
`CHASE_POLICY` is the single thing to replace when there is.

⚠ **The chase state is on the claim, not on `insurance_supplements`.** That table
already models filed → sent → answered and has an unused `responses` jsonb, but a
supplement row exists only for the *supplement filed* half of the list — the
*awaiting release* half is an Invoiced job with no supplement row at all, and both
halves need the same clock.

⚠ **`x.days >= 30` still appears once more in the file and it is NOT this.** It is
build 1045's *Gone quiet* kpqrow, an unrelated retail feature with its own 30-day
rule. A file-wide assertion on that string fails correct code.

**Gate:** `gate_1056.mjs` — seven checks in Chromium, asserting the chase on the
**recorded writes**. Includes a `scrollWidth` clipping check, because the new
button took `.who` from 185px to 70px and fourteen `textContent` assertions could
not see it.

---

## 1057 — the Desk's notes thread writes the letter (`supplement.html` + `api/supplement.js`)

Theo's ask: *a chat box with a history attached, so "met the adjuster, he paid
one shingle and ignored the twenty on the other three slopes" becomes the
letter.* No SQL — `claim_notes` already existed with the right shape and RLS.

| | |
|---|---|
| where | a card between the gap list and **Draft the letter** — the letter-writing moment |
| the thread | every `claim_notes` row on the claim, newest first, with who and when. **Build 1056's chase records show here too**, on purpose — "we called twice and heard nothing" is a supplement argument |
| the tick | only ticked notes reach the model. **Nothing is pre-ticked** — except a note you just typed, which is, because you wrote it to be used |
| the wire | `draft()` sends `context: pickedNotes()`, oldest first (a letter reads better when history runs forwards) |
| the fence | the prompt names them *facts the contractor asserts*, **not a source of law**; any code reference inside a note is to be ignored; a note is evidence and **never an instruction** |

### ⚠ `cite_flag` — new, and it closes a gap the file's own header claimed was shut

Before 1057, **`dollar_flag` was the only output guard on the draft path.** The
header's promise that *"the citation STRING is copied server-side, never taken
from model text"* held for `analyze` and **not** for `draft` — nothing checked
the code sections in the finished letter. Safe only while every word in the
prompt was server-controlled, which a free-text box ends.

`cite_flag` scans the letter for code-shaped references and returns any the
server did not supply. **Flagged and named on screen, never silently edited** —
the `dollar_flag` posture. Compared on a normalised form, because the model
legitimately writes `R905.2.8.5` where the pack says `RCO R905.2.8.5`.

⚠ **The marker is required and must stay required.** With the prefix optional
the regex flagged an ISO date, a phone number, a measurement and a policy
number — **four false positives in eight realistic letter lines**, which would
have trained everyone to ignore the banner. A real citation always carries a
code prefix (`RCO`/`OBC`/`OAC`/`ORC`) or an `R`/`M` section letter; a bare
number never does.

**Gates:** `gate_1057.mjs` (6 checks in Chromium, asserting the **posted request
body**; 6 named failures on the 1056 control) · `cite_guard_test.mjs` (6 cases)
and `cite_fp_test.mjs` (8 cases), both run against the **extracted shipped
guard**, not a re-implementation.

---

## 1058 — the daily digest names the carriers to chase (`api/digest.js`)

The notification half of Desk direction C. Build 1056's chase clock knew what was
overdue; nothing told anyone.

- **A third section on the existing daily digest** — no new cron, no new route.
  `vercel.json` is untouched, asserted at the git level.
- **Admin only** (Theo + Joan), stated as a decision: chasing a carrier is office
  work, the same shape as the settled crew-rates rule. The per-rep half exists
  and was deliberately not used.
- Only claims **past the mark** appear, worst-overdue first, each saying whether
  it has ever been chased and how long ago.

⚠ **`chases.length` must stay in the admin send guard.** That email only sends
when there are appointments or reminders, so without it a quiet day computes and
renders the section and then throws it away.

⚠ **`CHASE_POLICY` exists in TWO files** — here and `index.html`'s
`cr-cth-script` — because a serverless function cannot import from the app.
**`gate_1058.mjs` fails if they disagree.** Change one, change the other.

**Gate:** `gate_1058.mjs`, six checks against the **extracted shipped
functions** and production-shaped fixtures (orphan claims included). Proven RED
on a drifted tree, which is the run that matters.

---

## 1059 — the Desk reads the photographs (`supplement.html` + `api/supplement.js`)

Desk direction **B**. The Desk used to be dead until a carrier's scope arrived —
week three of a claim. **Read the photographs** builds the same gap list from the
job's own photos on day one.

⚠ **This crosses a fence, with a dated yes.** `CONTRACTOR_VISION_SUITE.md` said
*"customer photos never sent to third-party AI without an explicit yes."* Theo
gave that yes on **24 Aug 2026**, choosing Gemini over human-tags-only and the
Spark. **If it is ever withdrawn, `photos` mode is the thing to remove.**

| | |
|---|---|
| new mode | `photos` — the job's signed photo URLs, fetched server-side through the **same SSRF bound the scope already uses** |
| output | the **same `gaps` shape** `analyze` returns, so the evidence table, photo picker, notes thread and letter writer are all untouched |
| the cap | newest **20**, and it **says so**: *"Read 20 photographs, skipped 7"*. Measured first — 27.4 photos per job on average, max 45, so a silent cap would drop half a job |
| The Walk's rule | the model proposes, a person confirms. **Nothing arrives ticked** |
| altered evidence | the model is shown photographs and returns **text only**. It never alters, annotates or returns an image |

⚠ **`enforceGaps()` must keep carrying `photo_index`.** It rebuilds every item
from a **whitelist**, which is exactly right — and a whitelist drops what it does
not name. When `photo_index` was dropped, the Desk's mapping of it to a real
photograph was dead code and an item showed *"no photo"* for a photograph the
model had just described. It is carried as a **bounded number**: a string, a
negative or a fraction is refused.

⚠ **A gap arrives from the route POST-enforcement** — with an `id`, the pack's
citation, `photos:[]` and `included:false`. Any test fixture must mirror that,
not the model's raw answer; a raw-shape mock has no `id` and the renderer throws.

**Gates:** `gate_1059.mjs` (6 checks in Chromium, asserting the posted request
body and the rendered evidence) · **`enforce_test.mjs`** — nine adversarial cases
against the **extracted shipped `enforceGaps`**, including an invented citation
and a string `photo_index`.

---

## The inspection-report editor — the drawer, the re-sync, the drafter (1069–1070)

`index.html`, main block. Three things Theo asked for after a screenshot of the
editor: *"Can we find a way to make these inspection reports better? Maybe a
side drawer like the menus in the CRM? Anything else that would actually prompt
me to WANT to use these AI inspections?"*

### The More drawer (1069)

`#edSecondary` wraps the eight secondary toolbar buttons; `#edMoreBtn` opens
`#edDrawer`. **`#edSecondary` is `display:contents`**, so above 760px the
wrapper vanishes from layout and the desktop toolbar is byte-identical to what
it was — the drawer is a phone affordance only.

⚠ **Deliberately modelled on `#navMenu`** — class toggle, document-level click
closer, `stopPropagation` on the opener, and **zero writes to
`document.body.style.overflow`**. CLAUDE.md counts 13 scroll-lock writers with
no reconciler; a menu does not need to lock scroll. Asserted every build.

⚠ **The rows are a VIEW of the real buttons.** Each row delegates to `b.click()`
and they are rebuilt on every open from the buttons currently **visible**, so a
control JS has hidden (`sigBtn` on an unsignable report, `rccBtn` for a
non-admin, `sortBtn`/`draftBtn` on a non-report) never appears. Re-implementing
those handlers would be a second pipeline per concept.

### The checklist re-sync (1069)

`prefillChecklist()` filled nine Property Facts **at creation only**, as a
string transform, baking the result in. `resyncChecklist(doc, cl)` applies the
same nine to the **live document every time the editor opens** — **blanks
only**, an element still matching `/^\[[^\]]*\]$/`. That is what makes it safe
to run unasked. It reports the count into `savedFlash` rather than changing the
document silently.

⚠ **`CK_REPORT_MAP`, not `CK_FIELDS`.** `CK_FIELDS` is the *checklist's* own
required-field list, read by `openChecklist()` and `ckSave()`; shadowing it
would have broken checklist saving. Three consumers read the map and there must
never be a fourth: `prefillChecklist` (string, at creation), `resyncChecklist`
(DOM, every open) and **`ckFactsFor` (1070, the AI payload)**.

### The drafter reads the checklist, and is reachable (1070)

| | |
|---|---|
| what it sends | `{captions, section, **checklist**}` — the nine property facts, from `ckFactsFor()` |
| when it refuses | only when **both** captions and checklist are empty. Before 1070, whenever captions were empty |
| where it lives | `#draftBtn` "Draft narrative" in `#edSecondary` → a drawer row on a phone, a toolbar button on desktop |
| gated by | `window.draftGate()`, same predicate as `sortGate()` — shown only for an inspection report |

⚠ **`CK_REPORT_MAP` IS THE PRIVACY FENCE.** It holds nine PROPERTY facts and no
identity — no client name, no address, no phone, no coordinates. **A checklist
field with no entry in that map has no `get()`**, so it cannot reach a
third-party model by accident. Do not "complete" `ckFactsFor()` by spreading the
checklist object. The server whitelists and caps independently (12 entries, key
≤40, value ≤200) because a request body is not a trust boundary.

⚠ **`#draftBtn` DELEGATES to the in-document `#aiDraftBtn`.** That handler owns
the never-clobber-typed-text rule, the `data-ai-summary` marker and the error
path. Exactly **two** `/api/summarize` call sites exist, before and after 1070.

⚠ **`draftGate()` gates on the DOCUMENT, not the button.**
`wireSummaryDraftButton(doc)` runs later in `frame.onload` than the gate call,
so asking "does the button exist yet" answers no on every open.

⚠ **Adding a toolbar button has a desktop cost.** The twelfth pushes the
single-row threshold 1440px → 1512px (measured at seven widths). It already
wrapped at 1194/1280/1366. Measure before adding a thirteenth.

**Gates:** `gate_1069.mjs` (16 checks) · `gate_1070.mjs` (**20**, half of them
executing the shipped `api/summarize.js` against a stubbed transport so the
assertions are about the real prompt) · `render_report_editor.mjs` and
`render_1070.mjs` for the pictures.

### The Desk's photographs, sized and mapped (1071)

| | |
|---|---|
| what the model gets | **1600px, quality 85, `resize:'contain'`** — a Supabase Storage transform, signed per photograph |
| why not the original | measured: median 312 KB, avg 651 KB, and **46% of jobs exceeded the 6 MB budget**, so nearly half of every analysis ran on a subset |
| where it's signed | `signSmall()` in `supplement.html`, ≤20 photographs, **per photograph** |
| the fallback | a refused transform falls back to the display URL **and is counted** — a silent fallback would make the build inert and look identical to a working one |
| `photos_used` | the submitted indices the route actually read — see below |
| `photos_capped_by` | `'count'` \| `'bytes'` \| `null`, so the Desk names the real cause |

⚠️ **`createSignedUrls` (plural) has NO `transform` option** — only `download`
and `cacheNonce` — and the transform is signed **into** the token by the server,
so it cannot be appended to a URL afterwards. That is why 1071 adds a second
signing path after 1059 explicitly avoided one. **The 200-photograph display
call is untouched**, asserted.

⚠️ **`resize` must stay `'contain'`.** Supabase's default is `'cover'`, which
crops. `gate_1071.mjs` check B2 exists only for this.

⚠️ **`photo_index` maps through `photos_used`, and must keep doing so.** The
model numbers what it was shown; the Desk numbers what it sent. A mid-list skip
made those diverge — 2 of 6 findings attached the wrong photograph. **BUG_CLASSES
67.** An absent `photos_used` degrades to identity (the old behaviour), never to
nothing.

**Gates:** `check_artifact.py` (the mechanical ladder for the five artifacts
`check_build.py` does not see) · `gate_1071.mjs` — 13 checks, three of which
execute the shipped loop and the shipped mapping rather than a copy.

### Model provenance on every AI route (1072)

Every AI route returns two fields on its success path:

| field | what |
|---|---|
| `via` | the model that actually answered — `gemini-3.6-flash`, `gemini-3.5-flash` or `gpt-4o-mini` |
| `via_primary` | the model the route asked **first** |

**The pair is the point.** A client compares them and knows whether it got the
intended path or a fallback, **without hardcoding any ladder** — and the ladders
are deliberately not uniform: `detect`, `sortphotos` and `supplement` lead with
**3.6**; `caption`, `analyze` and `summarize` are pinned to **3.5**.

⚠️ **1072 changed no ladder, and nothing should until the accuracy bake-off
decides.** Reporting must not pre-empt the measurement. `gate_1072.mjs` check C
asserts every ladder is byte-identical.

⚠️ **The screens say it ONLY when `via !== via_primary`.** Build 808's rule: a
correct banner nobody needs trains people to ignore the ones they do. On the
intended path the Desk note and the report drafter's flash are unchanged.
`viaNote()` in `supplement.html` is the one place that comparison lives; the
gate executes it on match, mismatch **and** a partial diag from an older route
(which must stay silent rather than print "undefined").

**Where it shows:** the Supplement Desk's analyze note, and the inspection
report drafter's `savedFlash`. Everywhere else the field is in the response and
unread — deliberately, so the answer exists when someone asks.

**Historical reason this matters:** builds 500–501 measured Gemini 503ing about
**one call in four**. A quarter of all answers were written by the smallest
model in the stack, and nothing said so.

## The accuracy bake-off — `bakeoff.html` + `api/bakeoff.js` (1073)

**The seventh shipped artifact.** `/api/ai-status` answers *"is the AI up"*;
this answers *"is it right"*, on Cardinal's own roofs, because roofing is narrow
enough that a public benchmark would not transfer.

| | |
|---|---|
| who can use it | **admin only, enforced server-side** (`is_cardinal_admin()`), because it spends the AI keys once per model per photograph |
| candidates (@1074) | **`gemini-3.7-flash`**, `gemini-3.6-flash`, `gemini-3.5-flash`, `gpt-4o-mini`, `claude-opus-5`, **`kimi-k3`** — adding one is a line in `CANDIDATES` and nothing else |
| vendors | google · openai · anthropic · **moonshot** (OpenAI-compatible, so `askKimi` is `askOpenAI` with another base URL) |
| which env var | one `KEY_ENV` map. ⚠️ 1073 used a nested ternary whose final `else` was Anthropic — correct with three vendors, **wrong the moment a fourth exists** |
| what it sends | 1071's rendition (1600px/q85/**contain**) — the route caps at 5 MB and the largest stored photograph is 7.26 MB |
| the method | same photograph, same question, all models **concurrently**; answers **blind, shuffled, lettered**; one tap picks the best |
| where votes live | `localStorage`. **No table on purpose** — a measurement is not a business record, and no migration means it works the moment it deploys |
| its own stamp | `BK_BUILD`, and a header chip |

⚠️ **`gemini-3.1-pro` is deliberately absent from `CANDIDATES`** — probed live
26 Aug, it answers 404 *"not found for API version v1beta"* for this key.
Listing a model the key cannot call produces a column of errors that reads like
a model being bad at roofs.

⚠️ **The shuffle is PER PHOTOGRAPH.** One shuffle held across a run makes
position a tell after two photographs and the blinding becomes theatre.
`gate_1073` proves both that `shuffled()` permutes and that `step()` calls it
per shot.

⚠️ **The model name is in the response and never rendered until Reveal.** The
browser needs it to tally. The gate asserts `render()` never mentions `a.model`.

⚠️ **An unavailable model is shown, disabled, with its reason** — never hidden.
Otherwise *"we never tested Claude"* quietly becomes *"Claude did badly."*

⚠️ **The Anthropic SDK import is LAZY, and that is a correctness choice.** At
module scope, the SDK failing to resolve takes down the Google and OpenAI
columns too — turning one missing dependency into "the bake-off is broken"
instead of "one model could not be reached".

⚠️ **The results screen states what it does not prove.** Under ten judged it
calls itself a hint; above that it names the noise floor. There is no ground
truth on this project — `walk_shots` is **empty**, `project_photos` has **217
rows and 0 captions** — so this is a blind preference test, and it says so.

⚠️ **`kimi-k3` carries a `note` and the picker RENDERS it.** This repo's own
`AI_CHEATSHEET` has K3 at 2.8T parameters (17 July 2026) and calls it *"the
agent one"* — **no vision claim anywhere**. It is listed rather than assumed or
dropped, so a refused photograph reads as the caveat coming true, not as a
verdict on the model.

⚠️ **`/api/ai-status` reports `keys.anthropic.configured` and
`keys.moonshot.configured`** — **presence only**, named `configured` rather
than `ok`, because it makes no call. That is how "can we even test Claude" is
answered without guessing. Build 504's lesson: a diagnostic that overstates
what it tested is worse than none.

⚠️ **Do not pin a gate to the number of candidates.** `gate_1073`'s A4 asserted
`length === 4` and went red when 1074 added two — against the route's own
"adding one is a line and nothing else". It now parses `CANDIDATES` out of the
route and asserts the contract instead.

**Gates:** `gate_1073.mjs` — 13 checks, the route executed for auth, SSRF and
fan-out, negative-controlled against a sabotaged variant. `gate_1074.mjs` — 8
checks on the candidate list, the env-var map and the caveat rendering.
`render_1073.mjs` for the pictures.


### The inspection routes ladder (1075)

`caption.js` and `summarize.js` now use the **same** `GEMINI_MODELS` array as
`detect.js`, `sortphotos.js` and `supplement.js`:

```js
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];
```

⚠️ **What it replaced was not a ladder.** `caption.js` called
`gemini-3.5-flash` **three times** — a comment claiming *"then older model"* and
a diag key named `gemini25` show it was a real 3.5 → 2.5 ladder flattened when
the models were renumbered. `summarize.js` had no ladder at all. On a Gemini
outage inspections made three doomed calls and fell to the smallest model in the
stack, while the other three routes tried a second Gemini first.

⚠️ **A 503/429 retries the SAME model once; anything else moves on
immediately.** Retrying a 400 is retrying something that cannot succeed —
`detect.js`'s rule since 503.

⚠️ **3.7 is deliberately NOT at the front.** Which model leads is what
`/bakeoff.html` exists to answer. One line in each file once measured.

⚠️ **Test the ladder by DRIVING it, never by grepping for `GEMINI_MODELS`** —
that grep passes on code that still calls one model three times. `gate_1075.mjs`
counts calls per model against a stubbed transport.


---

## The Walk's job door (1076) — `cr-show-script` + the Job Menu

**Where it lives:** the tile is `index.html`'s Job Menu (`jt(dbIc('camera'),
'The Walk', '', 'walk')`, full-width, under the Inspections row). The entry
point is `window.CardinalShowcase.openForProject(pr)` in `cr-show-script`.

**Why it exists.** Measured on production the day it shipped: `walks` **0 rows**,
`walk_shots` **0 rows**. The Walk had one door — the *Showcase* tile on the
Sales Floor, then a third tab inside a module that opens on `showcase` — and in
~250 builds nobody had ever found it.

| | |
|---|---|
| **tile** | admin only — `(isAdminUser() ? jt(…) : '')`, **beside Checklists**, which already wrapped alone into the two-column grid. So the tile fills an existing hole and a rep's menu is byte-for-byte what it was |
| **route** | an explicit `act === 'walk'` branch in the `[data-jm]` router. **Not** the else branch — The Walk is a tab inside a full-screen view, not a pane on the client page |
| **behaviour** | opens on the walk tab · **finds** this job's walk by `project_id` · otherwise offers to start one, prefilled from the job |
| **write** | `saveWalk()` now sets `project_id` |

⚠️ **`saveWalk()` had never written `project_id`**, though the column and its
index have been in `walks_schema.sql` since 579. Every walk made through the
form was orphaned from its job. Nothing needed backfilling only because nothing
had ever been made.

⚠️ **The carried job is MODULE STATE (`pendingProject`), never a parameter.**
This module wires `b.onclick = openWalkForm` and `b.onclick = openJobPicker`
bare, and 628's comment records why: arg 0 is a **MouseEvent**. A project that
is really a MouseEvent writes a null `project_id` and looks perfectly correct.
`closeForm()` clears it; the Showcase's own *Start a walk* clears it explicitly.

⚠️ **The TILE is gated, not the handler.** `walks_schema.sql` makes insert,
update, delete and every `walk_shots`/storage write `is_cardinal_admin()`, so a
tile a rep can tap would land them on a screen the database refuses to serve —
BUG_CLASSES 16 with extra steps. `openForProject()` still degrades correctly for
a rep (the walk list, no form), as the belt to that brace. **Whether reps should
run walks is an RLS decision and Theo's**; it is one policy change plus one
`amAdmin()` relaxation.

⚠️ **`projects` has no `city` column.** One `address` string holds the lot, so
the start form splits street and city off the commas into editable fields.

**No new full-screen view, so no `hideAllViews()` or `navRestore()` entry** —
`open()` already registers `showcase`. This is a different TAB of a view that is
already wired.


---

## Document history — record it, keep it (1078–1079)

`inspection_reports` is the document pipeline for **everything**: inspection reports,
estimates, contracts and crew work orders. Until 1078 a document was one `html` column
overwritten in place, with no history, no trigger and nothing that recorded a change
after delivery.

| build | what |
|---|---|
| **1078** | a change to a **sent or signed** document writes a `doc` row into `audit_events` — who, when, which fields, and whether the content itself moved |
| **1079** | `document_versions` + `snapshot_document()` keep the copy: one at send, one at signature, and one of the old wording the first time a delivered document is edited |

**Where:** `docChangeNote`, `docSnapReason`, `docSnapshot` sit beside `db.update` in the
report-editor block. `db.update(id, fields)` is the **single chokepoint** — every write
to the table goes through it.

⚠️ **The send and the signature are `db.update` calls too.** Both builds explicitly
exclude them: without that, sending a document logs itself as tampering with what it
just sent. `gate_1078.mjs` B1/B2 and `gate_1079.mjs` B2/B3 exist for this.

⚠️ **The ORDER of the snapshot is the design.** `before_edit` is **awaited before** the
write (the copy must be what was delivered); `sent`/`signed` come **after** (the copy
carries the stamp). Firing it alongside the update races it and can copy the new html
while looking perfectly correct.

⚠️ **The browser never uploads the html.** `snapshot_document` is `security definer` and
copies the row the server already has — the documents average 628 KB and run to 6.4 MB.

⚠️ **`document_versions` has no `insert` and no `update` policy, on purpose.** Writes
happen only through the function, which does its own permission check (the same
expression as `reports_select`) before bypassing RLS. A version the browser could write
directly, or edit afterwards, would not be evidence of anything.

**Not built:** refusing the edit. Theo picked "1 and 3", not 2 — he can still fix a typo
on a signed estimate; it simply stops being invisible.

⚠️ **Drafts are not versioned** — enforced inside the function, so the browser does not
carry the rule twice.

---

## The app stopped using browser dialogs (1080, 1083) — `cr-tell-*` + `cr-ask-*`

Theo's polish item 1, in two builds. `alert()` and `confirm()` are the browser's own
grey boxes: system font, no theme, no brand, and on an installed PWA they carry the
**origin** across the top of the screen. They were the last surface in the app that
looked like a web page.

| Build | Replaced | Count | Module | API |
|---|---|---:|---|---|
| **1080** | `alert()` | **289** | `cr-tell-styles` + `cr-tell-script` | `window.crTell(message, opts)` — a toast |
| **1083** | `confirm()` | **88** | `cr-ask-styles` + `cr-ask-script` | `window.crAsk(message, opts) → Promise<boolean>` — a bottom sheet |

⚠️ **The counts are 289 and 88, not the 291 and 92 a bare regex reports.** The extra
hits are prose in comments. Both numbers came from `jslex_count.py`; this is the same
trap as 1081's `font:` shorthand and 1082's `.dbic1`, three times in one session.

### `crAsk` — how it decides what to say

**The verb is derived from the message, not passed at 88 call sites.** `leadVerb()`
reads the message's own leading word — `Delete this photo?` → the button says
**Delete**. One place decides what a message means, the `normStage()` shape. `opts.verb`
overrides it where a message doesn't lead with its verb.

**Tone is derived the same way.** A `DANGER` regex on the leading word paints the
confirm button cardinal red and puts it **above** the safe answer; `opts.tone:'plain'`
and `'danger'` force it either way.

**All four exits mean the same thing except one.** Yes resolves `true`; **Cancel,
Escape and a tap on the scrim all resolve `false`** — proved in Chromium by
`gate_1083.mjs`, because a confirm replacement that can strand somebody mid-answer is
the one failure that must not ship.

### Three things about these modules that are not obvious

⚠️ **They copy the app's existing sheet convention rather than inventing one.** The
scrim *is* the container, `display:none` → `.open{display:flex}` — the `.pu-sheet`
shape from 768. Ten module-local sheets already existed; `crAsk` is the first
**shared** one, and it looks like its neighbours on purpose.

⚠️ **Neither writes the global scroll lock.** The no-14th-writer rule, asserted by
`gate_1083.mjs`. `#crAsk` sits at **z-index 99990** — above every sheet (the highest
was 10700), below the toast stack at 99999, so a toast can still speak over a question.

⚠️ **Each falls back to the browser dialog it replaced** if its own surface cannot be
shown. That fallback is the **only executable `confirm(` left in the file**, asserted
at exactly 1 — and it is why a grep for `confirm(` does not come back clean.

### The bug the conversion nearly shipped, which no syntax check could see

`crAsk` returns a Promise, so 88 call sites became `await` and **46 functions became
`async`**. An `async` function returns a Promise, and **a Promise is always truthy**:

```js
if(confirmPay(em, true)) payRep(em, true);   // would pay the rep REGARDLESS of the answer
if(!priceOkToSend(title)) return;            // would never block again
```

Both parse perfectly. One of them moves money. Found by asking, of every function that
gained `async`, whether any caller *consumes* its return value — then propagating
`await` to those **4** sites. **Adding `async` to a function is never a local change**
— it is the same class as this file's "adding `await` to a synchronous function"
invariant, seen from the callee's side.

**The compiler was the oracle for the rest of it.** `await` outside an `async` function
is a SyntaxError, so `node --check` on all 126 inline blocks mechanically found every
site still needing conversion. Static analysis only ever *proposed* a spot — and it
proposed a wrong one: an auto-fixer matching `name(args){` as a method shorthand also
matches `if(del){`, and wrote `async if(del){` into the file. **A tool that edits code
needs its own negative control.**

---

## The Job Menu, readable and told apart (1082) — `DB_ICONS`, `.dbic1`, `.dbic2`

Theo's polish item 4. His picks, verbatim: **"B, 1, 1,1,1"**.

**15 tiles now carry 15 distinct glyphs**, asserted by comparing rendered path data.
Four new `DB_ICONS` keys — `punch` (hammer), `checklist` (ticks beside lines), `walk`
(house under a lens), `contract` (page with a pen) — retired the three collisions
(`tasks` ×3, `camera` ×2, `docs` ×2).

⚠️ **The Checklists collision was DELIBERATE and build 981 said so in a comment**
(*"DB_ICONS has no checklist key; dbIc('tasks') is the clipboard Punch Outs already
reuses"*). **That comment is now false, and was rewritten in the same edit.** A stale
comment sends the next reader hunting for a key that exists.

⚠️ **The bigger defect was the ink, and Theo hadn't asked about it.** Both glyph classes
carried `color:#23507e` — a steel blue picked for a **white** tile, where it scores
7.98:1. The tile went dark and the ink never followed. **THE RECURRING ONE, an eighth
time.** Now `var(--rbe-ink,#cfd6df)` — an existing token pair, so it flips by itself and
cannot drift.

⚠️ **TWO classes, two different floors, and a sweep of one misses the other.**

| class | what | floor | was | now |
|---|---|---:|---:|---:|
| `.dbic2` | the 15 drawn SVG icons | 3.0:1 (graphical) | 1.52:1 | **8.67:1** |
| `.dbic1` | the `$` and `%` on the money rows | **4.5:1 — it is TEXT** | 1.52:1 | **8.67:1** |

A probe written as `.jabox svg` sees only the first row and would have shipped a
half-fix; adding `.dbic1` took 16 findings to 18. It clears on every ground the glyph
can land on, including Community's `--ccm-card` (#161918 → 12.09:1).

⚠️ **`.dbic1` has TWO live rules and the 8.67:1 above is the RETAIL/COMMUNITY one.**
`body.claim-insurance .dbrow .dbic1` is more specific and owns every insurance render.
It was left alone deliberately — `--ct-red-deep` is already a declared theme pair
(`#7E1410` docket / `#FF3B30` siren) and **measures 10.53:1 on docket and 5.08:1 on
siren**, clearing the text floor on both. `.dbic1` is emitted **only** inside `.dbrow`,
at exactly two sites (`$` Payment Information, `%` Money In & Commissions), so the two
rules never contend on the same screen. *`selector_audit.py` names the insurance rule
"the winner" — that verdict ranks specificity globally and does not know the selector
is body-scoped. Read the scope, not the verdict.*

⚠️ **Twelve candidates were drawn and four were dropped**, each killed by the only test
that matters — rendered at 21px *beside the glyph it must differ from*. A big tick read
as Tasks; a camera-with-ring read as Photos; a signature squiggle vanished and read as
Estimates; a clipboard-with-`!` kept the collision it was meant to fix. *"Is it a nice
icon" is the wrong question.*

---

## Nothing is set below 11px (1081) — an app-wide floor, not a feature

**519 declarations** were lifted. 11px is the smallest size Apple's own interface uses
for a caption, and Theo works off a phone, on roofs, in daylight. The full invariant —
including the two deliberate exceptions — is in `CLAUDE.md`; the short version:

⚠️ **Sizes live in TWO declaration forms and the shorthand is the bigger half.**
`font-size:` carried 158 of the sub-floor sites; **`font:600 10.5px …` carried 361.**
The file holds 1,364 `font:` declarations against ~1,015 `font-size:` ones, so **a sweep
of the longhand alone reads the minority** — which is exactly what "315 under 12px"
was, and it was wrong. (BUG_CLASSES 70.)

Two things stay outside the floor on purpose: **`font-size:0`**, which means *there is
no text here* (a control collapsed to a pure `::after` icon), pinned at exactly two
sites; and **every `pt` size**, which is a print document (168 of them, smallest
6.8pt) and has nothing to do with a phone.

`gate_1081.mjs` holds the floor by walking **Chromium's own parsed CSSOM** rather than
the file, so neither a comment nor a shorthand nor an ungenerated print stylesheet can
move the number.

---

## The Insurance header's own chrome — `--ct-crmhead-*` (1089)

**Where the insurance header's colours come from, and why it is the odd one out.**

Every other CRM head declares a **flat, theme-independent palette** in
`body[data-crm-head="…"] .site` — retail a steel gradient, community `#047857`, production
`#181b20`, sales `#1a1310`. **Insurance alone maps itself through `--ct-head-*`**, the
`--ct-` system's header tokens, which `docket`/`siren` swap (407, deliberate — the toggle
lives in the header). So insurance has always had *two* identities, switched by
`cardinalRLTheme`.

**1089 gave it its own dark chrome without giving up that flip.** Theo picked it from a
rendered pair:

| token | siren (dark) | docket (light) |
|---|---|---|
| `--ct-crmhead-bg` | `#1a0e0d` | *undeclared* → falls back to `--ct-head-bg` (`#FFFFFF`) |
| `--ct-crmhead-kick` | `#ff8a7a` | ” → `--ct-head-kick` (`#C4180F`) |
| `--ct-crmhead-line` | `#3d1512` | ” → `--ct-head-line` |
| `--ct-crmhead-ink` | `#FFFFFF` | ” → `--ct-head-ink` |
| `--ct-crmhead-dim` | `rgba(255,255,255,.72)` | ” → `--ct-head-dim` |
| `--ct-crmhead-surface` | `#241412` | ” → `--ct-surface` |

Those are the **bottom nav's** values (`--bnbg` / `--bnbd` / `--bnac`), so the top and bottom
of an insurance screen now match. No colour was invented.

⚠️ **The docket column is empty ON PURPOSE — that is the mechanism, not an unfinished pass.**
The rule reads `var(--ct-crmhead-x, var(--ct-head-x))`, so light mode is untouched *by
construction*: there is no light value to drift. **Adding one flips light mode** and is a
decision for Theo, not a tidy-up. (Contrast with `--occ-*`, which is single-theme for a
different reason — there the surface has no light design at all.)

⚠️ **Do NOT "simplify" this by retuning `--ct-head-*` at source.** Those also paint the
Resource Library's book header — `#resourceLibraryView .ins-header / .ins-title / .ins-hbtn`.
That header reads `display:none` and looks dead, but
`body.rl-at-book #resourceLibraryView .ins-header{display:flex}` brings it back while a book
is open.

⚠️ **`--hac` is the `+` button, NOT the title.** `#brandTitle h1` declares
`color:var(--hac,…)` and another rule wins: Chromium computes the title's `color` **and**
`-webkit-text-fill-color` as `--hin`. Read it with `probe_head_ink.mjs`, which reports both
for any build × either theme, rather than trusting the declaration you can see.

**`--tgrad` is dead in all six heads** — zero `var(--tgrad)` consumers since 685 removed
gradient text. Left in place; retiring it is its own build.


---

## Production — the day sheet (1090)

Tapping a date on the Production hub opens a sheet over the page showing that day: the date, its
weather, everything booked on it, and `+ Add` / `Full calendar ›`. Dismissing it scrolls the hub to
that day and lights the date row once (`.pbflash`). Theo's options **1 and 5** of five offered.

**It is `#cr-pb-modal` in a second mode, not a second modal.** That element has been a bottom sheet
since it was built for `+ Add`; `data-mode` says which content is in it and one backdrop handler
closes whichever is showing. **No scroll lock** — the Add sheet never locked either, so the app's
13-writer count is untouched.

⚠️ **HOME PANE ONLY.** The full-calendar pane (`pbsplit` → `.pbsheet`) has shown the selected day
beside the grid since 853. Both panes emit `data-day`, so the gate lives in the handler
(`if(pane === 'home')`), not in the markup.

⚠️ **`wire()` walks two roots.** `qAll(sel)` returns the board's matches plus the sheet's while the
sheet is open, so a row in the sheet behaves like a row on the board **by construction**. Do not
copy handlers into the sheet.

⚠️ **THE MODULE'S CSS IS SCOPED `#cr-pb .x` AND THE SHEET IS OUTSIDE `#cr-pb`.** This is the trap:
23 rules in the `.pbev` / `.pbempty` / `.pbchip` / `.pbpip` families now read
`:is(#cr-pb,#cr-pb-modal) .pbX`. Before that fix the sheet's rows computed to
`rgb(239,239,239)` — a light-grey UA button on a near-black sheet — with every structural assertion
green. **Anything else you put in that sheet needs its selector extended the same way**, and only a
real render will tell you.


---

## Invoices & Accounts Receivable — the "Who Owes Me" dashboard (build 1107)

**Where:** `#cr-ar-view` + `<style id="cr-ar-styles">` + `<script id="cr-ar-script">`, appended at the end of `index.html`. Exports `window.CardinalAR` (`open`, `render`, `close`, `list`) plus globals `openAR` / `renderAR`. Opened from the **Invoices & AR** nav row (Office/Resources, admin-only) or by tapping the home **Accounts Receivable** card (`#arCard`). Registered in `hideAllViews()` + `navRestore()` (`case 'ar'`) and the nav router (`nav === 'ar'`).

**What it is:** every invoiced job that still owes, grouped by age (Current 0–14 / 15–30 / 30+), oldest first. KPI tray: Total Outstanding, Paid This Month, Overdue 30+. Each row: client, address, billed / collected / balance, a status pill, and one-tap Copy / Text / Email of the hosted pay link (`/api/share?t=<token>`). Porcelain `--est-*` system, light-only, admin-gated.

**Status is derived, not stored** (`statusFor`): from `jobFinance()` value/paid + the `collections` ledger — Paid in Full / Deposit Paid / Partially Paid / Sent / Draft. The Stripe webhook (`api/pay-webhook.js`) writes the `collections` row it reads, so status advances on its own; this is what makes staged draws (deposit → progress → final) track against one balance.

**Do NOT build a second AR view.** The old home aging chart (`renderOps`, `#arWrap`) stays as the mini-chart (4 buckets); this is the actionable worklist (3 buckets, Theo's pick). Reuses `collPaid`, `cacheCollections`, `jobFinance`, and the `shareUrlFor` `/api/share?t=` link shape. Send is pre-filled `sms:`/`mailto:` today; Twilio auto-send (already live in `api/notify.js`) is Build 3. `createInvoiceFor` minting the token + a live status header on the invoice itself is Build 2. Gate: `harness_ar1107.js` (jsdom; GREEN on 1107, RED on 1106).


---

## Invoices & Payments — the job-level block, offline recording, Company SMS (build 1108)

Extends the Invoices & AR module (`cr-ar-script`, `window.CardinalAR`). Where the AR dashboard (1107) is the admin's company-wide worklist, this is the per-job, rep-facing surface.

- **`CardinalAR.jobBlock(pr, fin)`** -> the porcelain "Invoices & Payments" card, mounted in `renderAcxOverview()` after the `.dbmoney` strip. Live status pill + Billed / Collected / Balance. Actions by state: Generate invoice (no invoice yet), or Company SMS / My phone (`sms:`) / Email + Open invoice; plus Record offline payment. Rep-visible on their assigned jobs (RLS).
- **`CardinalAR.recordPayment(pr)`** -> the offline payment modal (also on every AR row, `data-arpay`). Amount / Method (check/cash/ach) / Type (deposit/progress/final -> deposit/other/final) / Date -> one `collections` row via `sb` (RLS: admin/production, or the rep on their own job — `collections_rep_insert.sql`). Steps the derived status forward. ⚠ The LEDGER, not the worksheet's legacy `ws.paid`.
- **createInvoiceFor** mints `share_token` + `total` at creation.
- **`api/sms-link.js`** — Company SMS via the `notify.js` Twilio Messaging Service; reads `projects.phone` server-side with the caller's token.

Do NOT build a second invoice/payment surface. Status = `statusFor` (the 1107 engine). Send link = `shareUrlFor` (`/api/share?t=`). Gate: `harness_inv1108.js`. Invoice-document live header = build 1109.


---

## Invoice document: live status/balance card + payment ledger (build 1109)

**`wireInvoiceLive(doc, r)`** (main block, before `serializeFrame`) — called in the report editor's `frame.onload`. When the open doc is an invoice, injects a live layer into the iframe document, computed from `jobFinance()` + `cacheCollections` (the ledger), NOT the values baked at creation:
- **Top:** a **Current Balance Due** card above the SUMMARY table (anchored on `#estTotal`) with the live balance + status pill (`CardinalAR.status`); swaps to a **PAID IN FULL** badge (+ final payment date) when balance ≤ 0.
- **Bottom:** a **Payment History** ledger (Date, Method/Ref, Amount, Type + total).

⚠ The injected nodes are `data-cardinal-live` and `serializeFrame()` strips them on save — the stored `inspection_reports.html` stays the as-issued record; this is a view/print-time layer only. Do NOT persist it. Print rules (`@media print`, `print-color-adjust:exact`) keep the badges crisp. Gate: `harness_inv1109.js`.

## Labor Rate Schedule — Santiago's Exhibit A, editable + printable (build 1110)

The **crew** labor-rate schedule (what Cardinal pays a sub for labor), modeled on Santiago's "EXHIBIT A | LABOR RATE SCHEDULE" price list. Distinct from the `roofing`/`siding`/`windows` **estimate** catalogs (which quote a homeowner) — this is a fourth `pricing_items` template, `roofing_labor`.

- **Where:** burger menu → **Office → Labor Rate Schedule** (`data-nav="laborrates"`). **Admin only** (crew rates; `hideOpt('laborrates')` for non-admins, `window.is_admin()` in-module, `pricing_items` RLS is the authority). Module: `<style id="cr-lrs-styles">` + `<div id="cr-lrs-view">` + `<script id="cr-lrs-script">`; `window.openLRS` / `window.CardinalLRS` (`open`/`close`/`load`). Full-screen `inset:0` view registered in `hideAllViews()` + `navRestore()` (`case 'laborrates'`).
- **Look:** exhibit-styled document — navy `#1e2b4a` category bands with gold `#c9a227` titles, "SANTIAGO | LABOR RATE SCHEDULE" header (the on-screen title; Theo renamed it from "EXHIBIT A"), rates right-aligned. (On-white gold title accent is `--lrs-gold-dk:#8f6b00`, 4.92:1; the bright gold rides the navy bands at 5.79:1.)
- **Data:** reads `pricing_items` where `template='roofing_labor'`, ordered by `sort_order`, grouped by `category`. Units map to exhibit labels: `sq`→SQ, `lf`→LF, `ea`→unit, `sheet`→sheet, `ls`→a flat price (no unit suffix), `note`→a non-priced italic category note. Seeded by `pricing_roofing_labor.sql` (24 items / 5 categories, idempotent + non-clobbering).
- **Edit (admin):** Edit toggles inline inputs for rate/name/description + a unit select; `+ Add line`, `+ Add note`, `+ Add category`, delete `×`; Save/Cancel. Save diffs against the catalog — inserts new lines (blank skipped), updates edited rows, deletes removed ones.
- **Print / PDF:** `@media print` isolates `#cr-lrs-view`, hides the topbar + edit chrome, keeps the navy/gold with `print-color-adjust:exact`, `@page Letter` — a one-page Exhibit A to hand a crew.
- Gate: `harness_lrs1110.js` (jsdom; GREEN on 1110 / RED on 1109).

## Roof Pre-Install Guide — editable master + auto-email on scheduling (build 1111)

The homeowner's "Roof Installation Information & Pre-Install Guide" (what to expect on install day, weather policy, six things to do before). **Auto-emails to the client when a roof build day is booked**, autofilled from the job.

- **Module:** `cr-guide-styles` + `#cr-guide-editor` + `cr-guide-script` (`window.CardinalGuide` = open/close/send/sendFor/fill/doc/ctxFor/loadTemplate/isNonRoofOnly; `window.__apptEmailPreInstallGuide` = the auto hook). Letterhead/style shell + autofill in code; editable body in `company_templates('preinstall_roof')`.
- **Trigger:** the third helper (beside `__apptMayAdvanceStage` / `__apptNotifyProduction`) at the build-day appointment hook in `adb.create` / `adb.update`. On a `kind:'job'` appointment for a roofing job: once-guard → send, or prompt for a missing email then send. Fire-and-forget.
- **Autofill tokens** (`<span class="cr-gtok" data-tok>`): `install_date` (from `appt_date`), `rep_name` (`rptRepName`) + `rep_phone` (`cacheTeam[email].phone`), `client_name`, `property_address`. Filled at send (no token survives into the sent HTML); shown as chips in the editor.
- **Guardrails:** roofing only (skip a job explicitly tagged non-roofing via `ljTrades`; untagged proceeds) · valid client email required (missing → capture prompt writes `pr.email` via `patchProject`) · **once per job** (`client_guide_sends` PK `(project_id,kind)`) · never blocks booking · rep confirmation toast.
- **Email rail:** `/api/senddoc` (Resend, staff-gated) — the estimates path — with the filled guide as the HTML doc, client name + property line. Sends from `DIGEST_FROM` (set it to a verified Cardinal domain).
- **Editable master in Company Documents** (prepended row): **Preview** (sample autofill), **Edit** (admin → `#cr-guide-editor`, an iframe contenteditable doc + subject + Reset + Save `upsert`). Job overview has an **Email to client** button (`data-cr-guide-send`, roofing-gated) to send/re-send by hand (covers jobs scheduled before the feature shipped).
- **Data:** `preinstall_guide.sql` — `company_templates` (admin write / staff read) + `client_guide_sends` (staff read/insert). Registered in `hideAllViews()` + `navRestore()` (`case 'guideedit'`). No dark mode (client document).
- Gate: `harness_guide1111.js` (jsdom; GREEN on 1111 / RED on 1110; 32 assertions).

**1112 — three guides (Roof / Siding / Windows).** The module generalized to a `GUIDES` map keyed by slug (`preinstall_roof`/`siding`/`windows`). `CardinalGuide.slugForJob(pr)` picks by `ljTrades`: Roofing > Siding > Windows; **untagged → roof**; a trade with no guide (Gutters/Repairs/Misc) → **null (no send)**. Each guide is its own editable master in `company_templates` (seeded by `preinstall_guides_siding_windows.sql`) with its own steps, arrival window, and title; the once-guard (`client_guide_sends`) is per `(project, slug)`. Company Documents shows all matching guides via `CardinalGuide.docsRows(trade, isAdmin)` (each row carries its slug); the editor (`#cr-ge-ttl`) edits whichever guide's Edit button was tapped. Gate: `harness_guide1112.js` (GREEN on 1112 / RED on 1111; 26 assertions).

## Owner Console: drawer section + Strategy cockpit (build 1113)

⚠️ **As of build 1144 the CHROME follows the theme.** The header, the `#crBanner`
strip and the slide-out drawer were the last surfaces that ignored `rb-light` —
they run on their own per-CRM `--h*` / `--b*` tokens, not `--rbe-*`, and had no
light values at all. Each CRM now has a computed light set (ground, three ink
levels, a deepened accent), hue held. ⚠️ **The dark accents cannot be reused on
light** — retail 2.02, community 1.20, production 1.89, sales 3.37:1. Light
chrome is SIX stylesheets, not one: `--h*` tokens, the header's own `#fff
!important` inks, `cr-drawer-styles`, `cr-textsize-styles`, `cr-menu-styles`'s
Admin row, and `#crBanner`. Gate: `gate_1144.mjs` (4 CRMs × 2 themes).

⚠️ **As of build 1137 the console opens on a HUB, not a single scroll.** Seven cards
(Today · On the horizon · Renewals · Reminders · The Ledger · The Vault · Strategy),
each with a live figure; tap one to open that area alone; a back bar returns to the hub.
One table — `AREAS` in `cr-owner-script` — knows the areas, and `AREAS[].fn` calls the
**existing** section builders verbatim, so the areas are the same sections re-hung.
Each area is its own history entry (`navSetView('owner',{area})`), and
`open('<area>')` deep-links straight into one. Was 2,907px / 3.4 phone screens with
every list empty; the hub is 1,376px. Gate: `gate_1137.mjs`.

The Owner Console (`cr-owner` / `CardinalOwner`, build 895, admin-only, cream "Daily Brief" surface) now has **its own "Owner" drawer section** (`makeSec('cr-nav-sec-owner','Owner')`, in `addAdminSection`, inserted before Admin) and a new **Strategy** section (`strategyHTML()` in `render()`):
- An editable **Business Plan** (`owner_biz_plan`) — the recurring-revenue play (Cardinal Care membership + retail financing) — and an editable **Market & Competitors** summary (`owner_competitors`), both stored in `company_templates` (seeded by `owner_strategy_seed.sql`), loaded in `loadAll()`'s isolated try/catch. Admin **Edit** → textarea → **Save** upserts; non-admins read-only.
- A **9-tile KPI scoreboard** (`KPIS` / `kpiHTML()`) — members/MRR, renewal rate, close rate, avg job value, AR aging, lead-source ROI, crew utilization, claims-per-member, reviews captured.
- Companion deliverable: a standalone light-mode **Strategy Brief** artifact (recurring-revenue plan + a sourced 13-competitor Miami Valley analysis + KPIs). Light mode only. Gate: `harness_owner1113.js`.

## Header title + Cardinal Pipeline cards (build 1114)

**The retail header reads "Retail".** `cr-hd2-script` keeps one map — `TITLES = { retail:'Retail', insurance:'Insurance', community:'Community', production:'Production', sales:'Sales Floor' }` — and `skin()` writes it as `textContent`. **`TITLES_HTML` no longer exists.** It was added at 435 solely to paint the retail slogan in two tones (markup, so `.hq`/`.hg`/`.hr` could differ), and it, its consumer branch, those three ink rules, the retail-only `American Typewriter` face and **1065's `@media (max-width:437px)` hide** are all gone. That hide is why the change matters beyond wording: the slogan needed 247px and a 390px phone header gives 150px, so **retail was the one portal whose header name went blank on a phone**. Retail now inherits the same 20px `#brandTitle h1` rule as the other four.

⚠ Don't re-add a per-CRM HTML title. The remaining guard compares `textContent` against a **plain string**, which settles; an `innerHTML` compare against source markup is the 567 `paintChip` shape that never matched and repainted every frame.

**The pipeline cards print letters** (`#pipeRow`, `renderPipeline()` in the main block):

| card | `key` | prints (`short`) | `aria-label` (from `label`) |
|---|---|---|---|
| Leads | `Lead` | **L** | Leads |
| Prospects | `Prospect` | **P** | Prospects |
| Approved | `Approved` | **A** | Approved |
| Completed | `Completed` | **C** | Completed |
| Invoiced | `Invoiced` | **I** | Invoiced |
| Closed | `Closed` | **Closed** | Closed |
| On Hold | `OnHold` | **On Hold** | On hold |

- `short` is the printed label; **`label` is still the one full name per stage** and computes the sphere glyph and the accessible name — one vocabulary with a short form, not two stage-name sets. Closed and On Hold keep words (C is Completed's; a lone O reads as nothing).
- **`Closed` is a bucket as of 1114**, and **`PIPE_SKIP` is now just `{ insurance:{ 'OnHold':1 } }`** — retail's On Hold skip is gone. The skip is an *empty-column* rule and it had stopped being true: measured on production, one retail job sits at `OnHold` and one at `Closed`, neither of which the dashboard could show. Insurance still skips On Hold (a claim doesn't wait on a grant).
- `data-stg` still carries the raw stage key, so the click-to-filter into `openLeadsView()` is unchanged. `.pipe-closed`'s gradient already existed in the stylesheet.
- In **dark retail** the sphere flattens to a 3px top edge (`cr-nvl-styles`, `font-size:0`), so `.plabel` is the only text on the card — which is what the letters are for. In light/other CRMs the sphere shows the same letter above it.
- ⚠ **At ≤900px the row is a horizontal SCROLLER again** (`overflow-x:auto`, `.pipebtn{min-width:64px}`, spans `max-width:100%`). Seven cards cannot fit 340px at a legible size: at 390px each card is 47px and "Closed"/"On Hold" measure 51/57px — and they **overlap rather than ellipsize**, because `align-items:center` sizes a label to its own max-content and `overflow:hidden` on a max-content box never fires. 957's `overscroll-behavior-x:auto` reset is kept (a 900px tablet still fits seven, and containment on a non-scrolling box breaks the page swipe). Desktop is untouched — 1194px fits all seven at 106px each.
- ⚠ **The overlap predates this build.** Measured on 1113 at 390px: "Prospects" 76px in a 67px card, "Completed" 77px in 67px. Five cards were already colliding on a phone.
- Gates: `harness_pipe1114.js` (jsdom; runs the shipped bucket/render/header code; GREEN on 1114 / RED on 1113; 28 assertions + a coverage floor) and **`gate_1114.mjs`** (real Chromium, 390 + 1194, both themes; 58 checks; RED on 1113 without crashing).

## The drawer's bottom bar + always-collapsed sections (build 1115)

**`[data-cr-footer]` is a bar, not a paragraph.** It holds the version stamp and the sign-out icon, side by side (`.cr-drawer-foot`, flex, `margin-left:auto` on the button).

⚠ **The version must stay a DIRECT text node inside it.** Four readers parse this element and one of them is a gate: `currentBuild()` (What's New), `buildTag()` (error reports), `railVersion()` (the rail footer), and `check_build.py`'s `app_stamp()`, which anchors on `data-cr-footer…>` followed immediately by `v2026-`. `addPaletteHint()` also finds the footer by testing `/^v2026-/` against its `textContent`. **Wrapping the version in a `<span>` breaks the build gate.**

⚠ **The em-dash build summary is gone for good** (Theo, 1115). `check_build.py`'s 1070 summary gate would have gone permanently inert, so it now gates the **CHANGELOG entry for the stamped build** (must exist, ≥40 chars of `s:` prose) instead. Don't reinstate the footer prose to "fix" it.

**Sign out** is `#signOutBtn` still — same id, same listener, same `showMain()`/`showLogin()` toggling — restyled to a 44×44 icon button (`.cr-df-out`) using `CardinalIcons`' **`lock`**, the same glyph the desktop rail's `.lnav-out` uses. One concept, one glyph.

**Sections are collapsed every time the drawer opens**, not just the first time:
- The open set lives **in memory** (`secOpen` in `cr-drawer-script`) and is emptied on the **closed→open edge** in `sync()` — not unconditionally, or a mutation would snap shut a section under the finger that just opened it.
- ⚠ **The drawer no longer touches `cardinal.lnav.sections`.** That key is the desktop rail's alone now (its folds and its "Daily and Sell open" default are unchanged). 930's shared-store design is deliberately over.
- ⚠ **954's `openInsuranceSection()` no longer reaches the drawer** — it still opens the section on the rail. On the phone, "everything starts collapsed" outranks it. This is the instruction, not an oversight.
- Gates: `harness_drawer1115.js` (jsdom, drives the shipped module open→expand→close→open; GREEN 36 / RED on 1114) and `gate_1115.mjs` (real Chromium at 390px with the drawer open; GREEN 21 / RED 10 on 1114).

## Labor Rate Schedule — crew list, then one crew's sheet (build 1123)

**Office menu → Labor Rate Schedule, admin only.** Opens on **your crews**, grouped by trade, each row saying whether that crew has rates yet. Tap one for their sheet.

**Where the numbers live — this is the thing to know before touching it:**

> `pricing_items` (`template='roofing_labor'`) = **the line items**, shared · **`crew_rates`** = **what a given crew is paid**

`crew_rates` is not new — build **548** created it and the Crews module (`cr-crew-script` → Labor Rates tab) has always written it. 1123 pointed this screen at the same store rather than inventing a second one. **Both surfaces read and write the same rows.**

- **Trade rule:** `CATALOG_TRADES = ['Roofing']`. Roofing crews get the shared catalog lines; siding, windows, gutters and repairs **start empty** and grow their own lines via **+ Add line** (a `crew_rates` row with `custom_name`/`custom_unit`). Theo's pick, 28 Aug.
- ⚠ **Editing here never touches the catalog.** No write path to `pricing_items` exists in the module, and the harness asserts it. Renaming a shared line is the **Pricing Catalog**'s job.
- ⚠ **"not set" is a real state, rendered as readable text.** Do NOT make it fall back to `pricing_items.rate` — that is Santiago's number and paying it to another crew is a real-money bug.
- ⚠ **Catalog rows with `unit='note'` are prose.** They render as a note with no rate field and **no `data-key`**, so a save cannot read them as a blank rate.
- ⚠ **Dark on screen, LIGHT on paper.** `@media print` restores the white one-page exhibit and hides the crew list. Add a ground or an ink up top → add its light twin in the print block.
- **SQL:** `crew_rates_santiago_seed.sql` — **applied**. Seeded Santiago's 23 rates off the catalog (his numbers were always the catalog's `rate`), and added `crew_rates_one_per_item`, a partial unique index on `(crew_id, pricing_item_id)`.
- Gates: `harness_lrs1123.js` (jsdom, drives the shipped module; GREEN 45 / RED on 1122) and `gate_1123.mjs` (real Chromium, both screens; GREEN 25 / RED 12 on 1122).


## Deep links in team alerts (build 1125)

`notifyTeam(to, subject, bodyHtml, url)` — the 4th argument is a **relative** deep
link the app's own hash router understands (`#p/<id>/<tab>`, `#leads`, `#board`,
`#clients` …, parsed by `__tryRestoreFromHash` since 613). Optional, defaults to
`'/'`, so all 21 call sites are unaffected until each is given one.

- **`punchLink(pid)`** is the one place that knows a punch-out's address
  (`#p/<id>/punch`). All six punch-out notifications use it. Add a seventh
  notification about a punch-out → use this, do not spell the link again.
- `/api/notify` puts the link **in the SMS text** (an SMS has no hyperlink) and in
  the push payload (`sw.js`'s `notificationclick` navigates to it).
- ⚠ **It accepts only a same-site relative path/hash and builds the absolute URL
  itself from the request host.** Do not "simplify" this by letting the caller
  send an absolute URL — the string is texted to a phone.
- ⚠ The link is appended **after** the 320-char trim, so a long title can never
  truncate it.
- Gates: `harness_deeplink1125.js` (drives the shipped route, reads the real
  Twilio body) and `gate_1125.mjs` (Chromium: the address actually lands).

## Automatic payment reminders (build 1156, 30 Aug 2026)

Retail clients with a sent, unpaid invoice get a friendly text from the company number — 3 days after the invoice goes out, then weekly, at most 4 — carrying the balance and the secure pay link. The approved copy, verbatim: *"Hi {first}, it's Cardinal Roofing & Renovations — a friendly reminder that your invoice has a balance of {$X}. Review and pay securely (bank transfer or card) here: {link}. Questions? Just call or text us back."*

- `api/remind.js`, the fifth cron (`vercel.json`, 15:10 UTC daily), fail-closed on `CRON_SECRET`; `?dry=1` = eligibility report, nothing texted.
- **Never texted:** insurance and Community jobs (the payer/occupant split — settled), muted jobs, paid jobs, anything with a payment in the last 3 days or **a Stripe payment still processing** (the 1151 ACH settlement gap — Stripe is asked first, and a Stripe error skips rather than texts), no-phone / no-token rows.
- STOP (Twilio 21610) auto-mutes the job. Every attempt logs to `payment_reminders` (service-role write; admin read).
- Invoices & AR rows show *"Reminded ×N · last <date>"* and a **Mute / Turn on** toggle (`data-armute`) writing `projects.reminders_muted` — read directly, not from `cacheProjects`, whose loader selects explicit columns.
- A check recorded offline stops reminders like any payment — the cron reads the collections ledger, not the payment channel.
