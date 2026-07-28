# Cardinal Resource App — Feature Inventory

**Purpose: a map of what already exists, so nobody — human or AI — builds a second version of something that's already here.**

**Rule: read this before proposing any new feature. If something related exists, extend it.**

*Current through build 388 · July 27–28, 2026*

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

`window.CardinalHeader = { build, skin, crm }` — **`crm()` is the single source of truth for "which CRM am I in."**

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
- Urgency red, priority colours, CRM badge colours (retail gold / insurance teal / community blue)
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

## Community CRM (Slate & Clay, rebuilt 359–364)

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

## Everything else

Photos & Album (`cr-pae`, `cr-ped`, `cr-paf`), Inspections, Documents/contracts (isolated iframes), Production board (`cr-pb`), Sales Floor + Objection Coach (`cr-sf`, `cr-coach`), Scheduling, Client Portal (`cr-portal`), Cross-links (`cr-xlinks`), AccuLynx import (`cr-import`), Adjuster Directory, Recents, Search, CSV, Undo, Offline, Palette, Perf, Errors, Invariants, Self Check (`cr-sc`), Admin health badge (`cr-ahc`), Changelog (`CardinalChangelog`), NACHI content, Resource Library, ABC Supply (`cr-abc`).

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
