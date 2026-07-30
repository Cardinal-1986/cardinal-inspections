# App map — what exists, so nothing gets built twice

*Snapshot at build 388, spot-corrected at 428 (community palette, `crm()` mechanism). The project's `FEATURES.md` is the live version — read it when present. This exists so a session with no project files still knows the terrain.*

> **Palette note (428):** build 427+ retired gold for red/black/grey — 542 values migrated; the retail badge `#c9a227`, the brass directory chips and `#b8860b` gradient fallbacks survive — and re-themed **Community to green `--ccm-*`, dark by default**. Colour words below predate that; trust `references/theming.md`.

**Rule: search this before proposing any feature. If something related exists, extend it.**

## Chrome
Header `cr-hd2`: ☰ · gold home · CRM title (**40px, solid `var(--hac)`**) · 🔍 · ＋. Header search **retired** (372) — hidden in CSS, element kept so its wiring survives. **Banner nav `cr-banner`** (344–346) lives *inside* `header.site` so it scrolls with it: Home · Contacts · Leads · Photos · Track · Reports · Production ▾ · Tools ▾ · CRM switcher `#cbCrm` (desktop) · square search. **Resolve-or-hide routing** — an item hides if its opener doesn't exist, deferred to `DOMContentLoaded`. `window.CardinalHeader = { build, skin, crm }` — **`crm` is `crmNow` and recomputes on call; `skin()` publishes it to `body.dataset.crm`, the mirror everything else reads and the only thing CSS can gate on.**

## Three CRMs
**Retail** (iron `#202329` + gold, committed at source since 335) · **Cardinal Claims** (Aurora teal) · **Community** (green `--ccm-*`, dark by default — was Slate & Clay light until 427). Plus Production, Sales Floor, Punch & Repairs, Photo Activity, Team Directory — all CRM-independent.

## Clients & projects
Directory, profile `#projectView`, create/delete, portal assignment, `convert_client_type`, global search, PO via `nextPo()`/`CardinalPO`. **Name column is `name`.**

**Base profile internals — borrowed by other modules, don't rename:** Job Menu = `.jatile` divs in `#jaGrid` (one delegated listener, `data-ja`) · Location = `#dbMap.dbmap` in an `.acxsec` accordion, **above** the Job Menu, Map/Satellite pill + Directions chip (348) · Google Reviews = `.acxsec.rvsec` · headings `h3.projsec` · Punch card = `#cr-pp-mount` after `#jaGrid`.

**Keeper profile** (342·348·349): iron hero, neon stage spine, gradient PO + name, tappable phone/email on the name row, contacts in the hero (Contacts section retired), Location as a live map card, **Payments / Punch / History as opening pills** with a Cardinal-red timeline.

**Client cards are the Badge layout (370) — no cover photos.** Gold monogram, gradient name, **lavender PO**, chip row, Call/Text, milestone colour as a left rail. Desktop Client Projects gallery scrolls **horizontally**, 10 per row (365).

**Client Directory** `cliList` (brass, 341): one directory across all three CRMs, per-CRM milestone filters keyed `crm|storedStage`, admin multi-select delete, favourites. Opts out of the portal pre-filter via `renderClientDirectory.__crPortal = true`.

## Punch & Repairs (`cr-punch`, 361·366·368)
**One shared data layer: `window.CardinalPunch { rows, reload, toggle, update, openCount }` — never add a second.** Per-CRM home strips via `CardinalPunchStrip.html(crm)`; unified `#punchView` (banner → Production ▾) grouped Urgent → Open → Completed with directory-style sort/filter; **Active / Scheduled tabs**; detail sheet (tap-to-call, directions, assignee + priority dropdowns, notes, photo strip); **five photos required to close**. Table `punch_items`.

## Team Directory (`cr-team`, 373)
**Standalone light page, no CRM skin.** Burger → 👥 Team. Grouped Admin · Production · Sales. Reads/writes **`team_profiles`** (`email, name, title, phone, photo`) — the same table behind the punch assignee dropdown and activity-feed avatars. Admins add; anyone edits their own row. **This existed before 373** — 373 restyled it.

## Photo Activity (`cr-photos`, 345)
Global `#photosView` — every photo across every job, newest 200, grouped Today/Yesterday/date, client search, tap-through.

## Retail light theme (`rb-light`, 374–388)
Second theme for **Retail only**, tokens `--rbe-*` in `:root` + `:root[data-theme="rb-light"]`. `window.CardinalRBTheme { toggle, isLight, setLight }`, localStorage `cardinal.theme.rb`, moon/sun button bottom-right, visible only when `body.dataset.crm === 'retail'`. Dark is the default. **Full rules — including the semantic colours that must NOT be tokenized — in `references/theming.md`.**

## Estimates
**Entry point (379):** the burger's 💰 **Estimates** and the ⌘K palette open the redesigned page. The duplicate "⚡ AI Estimates" entry was retired; AI estimating is the red button *inside* the page. A legacy flat-table view still exists in `LIST_DEFS` but is unreachable — **don't resurrect it.**

**One merged API since 308** — `Object.assign(window.CardinalEstimates || {}, {...})`. Status lanes since 339: **Unsent → Sent → Accepted**, Status ∩ Rep ∩ Trade filters, ⚑ at 5+ days, **no caps, no auto-archive**, desktop dual-pane with live pipeline sums. `estimate_line_items` is the shared price book. Photo attach via `#cr-pae-actionbar`. **Downloads (363)** `window.CardinalDownload { html, frame, url, safe }` — standalone `.html`, **not true PDF**.

## Community CRM (Slate & Clay, rebuilt 359–364)
Tabs **Bids | Partners | Clients** (three nouns — no fourth). Bids: KPI strip, Due soon, Partners + Waiting-on-you, All bids collapsed. Every panel is a fold. **Bids are editable** (356) — `CardinalNewBid.edit(id)`. Partner colour is **name-matched, not stored** (known bug). Modules `cr-ch2` (home), `cr-cc` (client page), `cr-nbid`, `cr-cpartners`, `cr-cprop`, `cr-wo`, `cr-can`.

## Insurance CRM (Cardinal Claims)
`cr-cth` (home), `cr-ic` (clients), `cr-sol` (Scope of Loss reader, to 20 MB), `cr-sp` (supplements), `cr-iu`, `cr-insstage`, `cr-adj` (Adjuster Directory). ACV/RCV/depreciation/supplement tracking. **New insurance leads accept a Scope of Loss (358)** — saving opens the claim and runs the reader.

## Navigation & history
Two routers coexist. The modern one (`cardinal-nav`) tags states `{app:'cardinal-nav'}`; the legacy hash router **yields on those states** (367). Punch, Photos, Community hub and Estimates record history via `wrapNav`. New full-screen views register in **`hideAllViews()`** *and* get a restore case. `hideAllViews()` also **releases a stuck `body{overflow:hidden}`** (364).

## Everything else
Photos & Album (`cr-pae`, `cr-ped`, `cr-paf`), Inspections, Documents/contracts (isolated iframes), Production board (`cr-pb`), Sales Floor + Objection Coach (`cr-sf`, `cr-coach`), Scheduling, Client Portal (`cr-portal`), Cross-links (`cr-xlinks`), AccuLynx import (`cr-import`), Recents, Search, CSV, Undo, Offline, Palette, Perf, Errors, Invariants, **Self Check (`cr-sc`)**, admin health badge (`cr-ahc`), Changelog, NACHI content, Resource Library, ABC Supply (`cr-abc`).

## Permissions
```
projects:            sales own-only via created_by
estimates:           est_read = is_full_access() OR project readable · est_write · est_update
punch_items:         punch_read = is_full_access() OR project readable
estimate_line_items: eli_read (all authenticated — price book) · eli_admin ALL
team_profiles:       readable by the team; admins write anyone, users write their own row
```
Theo + Joan are hardcoded admin fallbacks in SQL and API.

## Before building anything new
0. **Patching or replacing?** Say so, with costs.
1. Search this file (and the live FEATURES.md).
2. **Grep the app for the REAL structure** — a theming class is not the element.
3. **Assume it might already exist and be buried.** Check whether its mount anchor still exists.
4. Extend, don't add. **One pipeline per concept.**
5. Share / email / sign / print → `db.create()`.
6. New `window.Cardinal*` → `Object.assign` merge.
7. **Add a row to FEATURES.md when you ship.**
