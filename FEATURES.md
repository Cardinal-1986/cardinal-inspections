# Cardinal Resource App — Feature Inventory

**Purpose:** a map of what already exists, so nobody (human or AI) builds a second version of something that's already here. Rule: **read this before proposing any new feature.** If something related exists, extend it.

*Last updated: build 332 · July 27, 2026. The splice/module pipeline is gone — the file is patched directly; see START_HERE for the workflow.*

---

## Chrome (one header system — `cr-hd2`)

| Piece | Where | Notes |
|---|---|---|
| Bar: ☰ · gradient screen-name title · search · ＋ | `cr-hd2` styles+script | Titles: Retail / Claims / Community / Production / Sales Floor; per-CRM `--tgrad`; absolutely centered; fixed 34px (user-approved, build 322) |
| Ribbon: gold home + clock / PO+name | `cr-hd2` | `#cr-hd2-home` (38px SVG) → `goToLanding‖showHome`; `body.projopen` swaps clock→client |
| Per-CRM skins | `.site` vars per `body[data-crm]` | Retail black+gold chrome + gold gradient divider; Community Frost; Insurance Aurora |
| Bottom bar | `pnc` + relocations | Portal chip (never defers to CT anymore) · health shield `cr-ahc-badge` · history ◀ ▶ |
| Retired | — | `cr-ih` stubbed (`CardinalInsHeader` no-op export kept) · `cr-home-btn` hidden · all `body.claim-* header.site` themes deleted |
| Insurance views under the header | hd2 css | `#cardinalTruthView,#insClientsView,#resourceLibraryView{top:var(--headh)!important;z-index:60!important}`, in-view headers hidden |

`window.CardinalHeader = { build, skin, crm }`.

**Retail theme (override layer — see tripwire in START_HERE):** ground `#202329`; `body[data-crm="retail"]{--red:#d4a017;--red-dk:#8a5a00}` with **all stylesheet literal reds converted to `var(--red)`** (defs protected; JS-painted chart reds intentionally untouched); gold card borders; gradient-gold `.hero-hi`, `.acthead`, `#projectView .projsec`; `section.history` stays white.

---

## Clients & Projects

Unchanged from 297 (base directory, profile `#projectView`, create/delete, portals via `checklist.lead.claim_type`, `convert_client_type`, recent clients, global search, PO numbers via `nextPo()`, rep filter, landing). Column gotcha stands: the client name column is **`name`**.

**Base profile internals worth knowing (they're borrowed now):**
- **Job Menu** = `.jatile` divs inside `#jaGrid`, counts in `.jn` (`.zero` when 0), **one delegated click listener on `#jaGrid`** reading `data-ja` → `openCommunications` / schedule / photos / …  Not `.jabox` — that's an insurance theming class.
- **Location** = `#dbMap.dbmap` inside an `.acxsec` accordion built per project.
- **Google Reviews** = `.acxsec.rvsec`.
- Section headings = `h3.projsec`.

---

## Community CRM (Frost, builds 299–307)

| Feature | Module / API |
|---|---|
| Home — Bids · Partners · Clients tabs | `cr-ch2` — `CardinalCommunityHome{render,tab,show,hide}`, `CardinalCommunityHub{show,hide,render,isOpen}` |
| Client page — Thread/Bid + Job Menu + Location + Reviews | `cr-cc` — `CardinalCommunityJob{refresh,tab}` |
| New Bid (incl. **Bid Due Date** → `lead.bid_due_at`) | `cr-nbid` — `CardinalNewBid.open()`; modal z-10500, contained scroll |
| Partners directory (masked, GC confidential, **Type picker exists in its editor**) | `cr-cpartners` — vocabulary `nonprofit/property_manager/general_contractor` |
| Properties / Work orders | `cr-cprop` / `cr-wo` |
| **Analytics** (admin-only) | `cr-can` — `CardinalCommunityAnalytics{open,close,render}`; tools tile `data-go="analytics"` |
| **Activity / Calendar tiles** | tools tiles → the app's existing `openActivityFeed()` / `openScheduleBoard()` — no duplicate surfaces |

Home details: due ladder counts down from `bid_due_at` (proven live); strip admin-total / sales-own / hidden-for-production; partner cards group by `partner_type` via a `select('name,partner_type')` read (confidential fields never fetched); stage labels render-time only (`Lead→Bid Requested` etc.) — never translate the stored value. Masthead removed; chrome carries title+clock. `footer.site` hidden while open.

Client page details: real takeover (`.cr-cc-own` direct-child hide + dark ground + `body.cr-cc-open`); **Job Menu proxies the `.jatile` grid** (tile.click() bubbles to the delegated handler; retries while base builds); **Location and Reviews are adopted live base nodes** with a stash-and-return lifecycle released on every exit path. Bids ARE estimates — same table, same pipeline; never build a second pricing tool. **Tab tiles use suspend-and-return since 326**: anything outside `['comms','board','photos']` releases adopted nodes, drops the takeover and raises `#cr-cc-return` ("❄ Back to bid view"); suspension is keyed to the captured project id, not `loadedFor`.

---

## Insurance CRM (Cardinal Claims)

Content modules unchanged (`cardinal_truth_home`, `insurance_clients`, `sol_intake`, `supplement_panel`, `insurance_unify`, stages, claims form fixes). **Chrome changed:** the views live under the global header (title "Claims"); their own headers and `cr-ih` are retired; sub-pages reached via the in-page `.ins-card` tiles (`data-ctnav="clients" / "supplements" / "insurance-resources"`); back = bottom-bar ◀. CT's old header quick-actions (New Claim / Adjuster note / Supplement) exist on client profiles.

---

## Estimates

**New Lead stamps claim type from the active portal since 331** — `crmNow()` decides the default radio; Production/Sales leave it "unknown". Pre-331 typeless clients are not backfilled.

**Editor accepts a project id or object since 316** — `openEditor(pid)` hydrates name/address/title from `cacheProjects` itself; Price-it and the manual picker both pass ids. **Manual estimates from the global surface since 314**: burger → AI Estimates → New Manual Estimate → searchable client picker → editor.

**One merged API since build 308:** both modules now `Object.assign(window.CardinalEstimates || {}, {...})`, so ALL of `open` (list), `openAI`, `openOne`, `openEditor`, `loadForProject`, `refreshSavedList`, `close` are live regardless of load order. Never plain-assign a `window.Cardinal*` name that might exist.

Systems otherwise as documented at 297: base `+ New estimate ▾` templates with the full doc pipeline; AI Estimates; unified editor + publish + estimate→contract + stage sync. `estimate_line_items` is the **shared pricing catalog** (selected by `active/category/sort_order`, no estimate linkage) — readable by all authenticated by design.

**Document system rule stands:** anything needing share / email / signature / print goes through `window.db.create(title, html, projectName, projectId)` → `inspection_reports`.

---

## Permissions (v3 migration, run)

```
projects: full set (select/insert/update/delete) — sales own-only
estimates: est_read = is_full_access() OR project readable · est_write · est_update
punch_items: punch_read = is_full_access() OR project readable
estimate_line_items: eli_read (all authenticated — price book) · eli_admin ALL
punch_open_counts: security_invoker = true
```
Anon probe: zero rows on all sensitive tables. Presentation gating (production: no strips/partner money) lives in `cr-ch2`.

---

## ABC Supply (build 327)

`api/abc.js` proxy + `cr-abc` sheet (burger → 🧱 ABC Supply). `window.CardinalABC{open,close}`. Actions: `status`, `searchItems`, `priceItems`, `frequents`, `recents`, `templates`, `branches`, `itemAvailability`, `placeOrder`, `getOrder`. Ship-To/Bill-To/Branch persist in `localStorage['cardinal.abc']`. **A $0 price is valid** — the branch prices it manually; the UI says so rather than showing free. Blocked on credentials (401 from ABC on both environments).

## Money math (community)

`bidAmt(pr)` = `checklist.lead.bid_amount` **or** the project's estimate total from `estTot` (fetched once per project-set; accepted status preferred over newer drafts) **or** 0. This one function feeds the due ladder, "Get on the calendar", "Invoice the partner", partner awarded totals and Analytics — fix money bugs there, not per-block.

## Everything else

Photos, Inspections, Documents/contracts (isolated iframes — duplicated template ids like `restoreVeil`/`estTotal` resolve per-iframe; keep main-document reads away from those names), Production board + punch, Sales Floor + Coach, Scheduling, Admin/observability (Self Check 🩺 is the only misalignment test), QoL modules — unchanged from the 297 inventory. Eight ghost back-button handlers were deleted at 332; `galBackBtn`, `commsBackBtn`, `apBackBtn`, `icBackBtn`, `jdBackBtn`, `payBackBtn`, `rlBackBtn`, `tskBackBtn` are **live** — don't "clean" those.

---

## Before you build something new

0. **Patching or replacing?** Say so, with costs. Check the retail tripwire if touching retail paint.
1. Search this file. 2. Grep the base — and grep for the REAL structure (a theming class is not the element). 3. Extend, don't add. 4. Share/email/sign/print → `db.create()`. 5. Borrowing live base elements → the adoption pattern in START_HERE. 6. New `window.Cardinal*` export → `Object.assign` merge. 7. Add a row here when you ship.

*Maintained directly. Update on every feature build.*
