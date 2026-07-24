# Cardinal Resource App — Feature Inventory

**Purpose:** a map of what already exists, so nobody (human or AI) builds a second version of something that's already here.

**This has happened twice.** Manual Estimates duplicated the base app's estimate templates (~4 hrs lost, removed v207). A photo gallery duplicated the existing Photo Album (removed v211). Both times the root cause was the same: grep only finds things when you guess the right search term.

**Rule: read this before proposing any new feature.** If something related already exists, extend it — don't build alongside it.

*Last updated: build 213 · July 24, 2026*

---

## How the app is assembled

`index.html` is a single ~1.95 MB file with no build step at runtime. It's produced by `splice.py`, which takes the base app and injects ~50 modules between two anchor points, applying source patches along the way.

- **Base app** — 1.43 MB. The original single-file app. Contains most core features.
- **Modules** — ~500 KB after minification. Layered enhancements, each a self-contained `<style>` + `<script>` block.
- **Minification** — comments and blank lines stripped at splice time. Set `MINIFY = False` in `splice.py` to debug.

When adding a feature, **check the base app first.** It's older, less obvious, and contains more than you'd expect.

---

## Clients & Projects

| Feature | Where | Notes |
|---|---|---|
| Client directory | base app | Search, filter, stage pipeline |
| Client profile | base app | `#projectView`. Overview / Estimates / Contracts / Photos sections |
| Create Lead | base app | Modal, reuses `.projform` |
| Delete client | base app | Admins only. Cascades everything |
| Three CRM portals | `client_portals.html` (base) | Retail / Insurance / Community via `checklist.lead.claim_type` |
| Portal switcher chip | `client_portals.html` | `window.CardinalPortal` |
| Convert client type | `convert_client_type.html` | Move a client between CRMs |
| Recent clients | `recent_clients.html` | Quick-access list |
| Global search | `global_search.html` | Cross-entity search |
| PO numbers | `po_number.html` | `PO-YYYYMMDD-HHMM` from `created_at`. `window.CardinalPO` |

**Key gotcha:** the `projects` table column for the client's name is **`name`**, not `client_name`. This broke multiple modules in v200.

---

## Estimates

**Two systems coexist right now.** Don't add a third.

### Base app: `+ New estimate ▾` dropdown
Six HTML document templates — Roofing, Mastic siding, Replacement windows, Andersen windows, Seamless gutters, General repair. Each opens a full document editor in an isolated iframe with **client signature, email to client, share link, and print/PDF**. Anchor: `#pNewEstimateBtn`.

### Base app: AI Estimates
Insurance-side estimate generation with auto-deposit and payment schedule. Mount: `#cr-estimates-mount`.

### Modules: unified estimate system (v208–v212)

| Piece | Module | What it does |
|---|---|---|
| Line item catalog | `line_item_library.html` | Admin CRUD. Menu → Admin → 📋. `window.CardinalLineItems` |
| Estimate editor | `estimate_editor.html` | 📄 New Estimate button. Auto-totals, deposit calc. `window.CardinalEstimates` |
| Publish | `estimate_publish.html` | Generates a doc, pushes into base app doc system. `window.CardinalEstimatePublish` |
| Fixes | `estimates_new_fix.html`, `estimates_audit_fixes.html` | Patches to base app estimate flows |

**Tables:** `estimate_line_items`, `estimates`, `estimate_templates`
**Numbering:** Postgres sequence `estimate_number_seq`, format `EST-YYYY-NNNN`

---

## Documents (share / email / signature / print)

**This is the single most reusable system in the app.** Any HTML document pushed through `window.db.create(title, html, projectName, projectId)` automatically gets:

- **Share link** — `/api/share?t=TOKEN`. Clients review **and sign** from it
- **Email to client** — `/api/senddoc` via Resend. Offers a 3-day follow-up reminder
- **Client signature** — canvas signature pad, writes into the doc HTML
- **Print / PDF** — browser print with `@page size:Letter` rules

**Table:** `inspection_reports` (misleading name — holds all documents)
**Columns:** `id, title, project, project_id, status, sent_at, share_token, signed_at, html, total`

**Before building anything that needs sharing, emailing, or signing — generate HTML and hand it to this.** That's what `estimate_publish.html` does.

Contract templates live in the base app (Roofing / Siding / Window), each a 4-page package with ORC §1345.23(B)(2) 3-Day Notice copies.

`contract_editor.html` adds editing on top.

---

## Photos

**One system.** Enhanced, not duplicated.

| Feature | Where |
|---|---|
| Photo Album view | base app, `#galleryView` |
| Add photos / Take photo | base app, `#galAddBtn` / `#galCamBtn` |
| Add checked to Inspection Photos | base app, `#galInspBtn` → writes `checklist.insp_photos` |
| Transfer checked to report | base app, `#galXferBtn` |
| Inspection Photos (curated, max 30) | base app, `openGalleryMode('insp')` |
| Section tabs, date grouping, initials, AI captions, bulk move | `photo_album_enhance.html` |
| Picker mode (for estimates) | `photo_album_enhance.html` → `CardinalPhotoAlbum.openAsPicker` |

**Tables:** `project_photos` (columns: `id, project_id, data, storage_path, section, caption, created_by, created_at`)
**Storage:** `photos` bucket, path `projects/{project_id}/`
**Sections:** Inspection · Post-Inspection · Before · After · General

**Open the gallery with `window.openGalleryMode('all')`** — it hides `projectView`, sets mode, resets title, scrolls, loads. Doing it by hand leaves the profile visible underneath.

---

## Inspections

| Feature | Where |
|---|---|
| Quick Inspection | base app | Map-first (Leaflet + Nominatim), 12 shot chips, instant per-shot upload, localStorage session persistence |
| Roofing Inspection Checklist | base app | Feeds the report. Skippable since build 85 |
| Inspection reports | base app | Generated from checklist + Inspection Photos |
| AI photo analysis | base app + `/api/analyze` | Per-photo 🔍 Analyze |
| AI captions | base app + `/api/caption` | Gemini vision |

---

## Community CRM

| Feature | Module |
|---|---|
| Community Hub dashboard | `community_hub.html` — `window.CardinalCommunityHub` |
| Partners directory | `community_partners.html` — masked list, GC confidential flag |
| Properties | `community_properties.html` |
| New Bid form | `community_new_bid.html` — `window.CardinalNewBid` |
| Work orders | `community_work_orders.html` |
| Stage labels | `community_stages.html` |
| Portal theming | `community_portal_theme.html` |
| Client view | `community_client_view.html` |

**Tables:** `community_partners`, `community_properties`

---

## Insurance CRM (Cardinal Truth)

| Feature | Where |
|---|---|
| Cardinal Truth dashboard | base app |
| Stage label overlay | `insurance_stages.html` (base) — rewrites labels only, `projects.stage` unchanged |
| Claim strip (RCV/ACV/depreciation/deductible) | `insurance_stages.html` |
| Claims form fixes | `claims_form_fixes.html` |
| Truth view fixes | `cardinal_truth_fixes.html` |

**Table:** `insurance_claims`

---

## Sales tools

| Feature | Where |
|---|---|
| Objection Coach | base app + `/api/coach.js` | Deck, AI grading, leaderboard, field log. `window.CardinalCoach` |
| Resource Library TOC | `resource_library_toc.html` — `window.CardinalRLTOC` |
| NACHI Roof Mastery | `nachi_roof_mastery.html` — hardcoded baseline content |
| NACHI content admin | `nachi_content_admin.html` — DB-driven, rich text, image upload |
| Pricing Catalog | base app |
| Company Documents | base app — blank print masters |

**Tables:** `objections`, `objection_attempts`, `objection_logs`, `nachi_series`, `nachi_articles`

---

## Scheduling & calendars

| Feature | Where |
|---|---|
| Schedule Board | base app |
| Team calendar | base app — watermark `cardinal-board.png` |
| Production calendar | base app — watermark `cardinal-prod.png` |
| Appointments | base app — `appointments` table |
| Auto stage transitions | `auto_transitions.html` |

---

## Admin & observability

| Feature | Module |
|---|---|
| Health Check | `admin_health_check.html` — `window.CardinalAdminHealth` |
| Handler smoke check | `handler_smoke_check.html` — `window.CardinalHealth` |
| Runtime error capture | `runtime_error_capture.html` — `window.CardinalErrors` |
| Data invariant checks | `data_invariant_checks.html` — `window.CardinalInvariants` |
| Auth roster check | `auth_roster_check.html` — `window.CardinalRoster` |
| Extra admin checks | `admin_extra_checks.html` — dupe leads, storage |
| Perf watchdog | `perf_watchdog.html` — `window.CardinalPerf` |
| E2E smoke walk | `e2e_smoke_walk.html` — `window.CardinalWalk` |
| Activity feed | base app |
| Graphs & Reports | base app |

---

## Quality of life

| Feature | Module |
|---|---|
| Dark mode | `dark_mode.html` — `window.CardinalDark` |
| ⌘K command palette | `command_palette.html` — `window.CardinalPalette` |
| CSV export | `csv_export.html` — `window.CardinalCsv` |
| Undo toasts | `undo_toast.html` — `window.CardinalUndo` |
| Offline indicator | `offline_indicator.html` — `window.CardinalOffline` |
| Print stylesheets | `print_stylesheets.html` |
| Bulk operations | `bulk_operations.html` — `window.CardinalBulk` |
| Changelog modal | `changelog_modal.html` — `window.CardinalChangelog` |
| Google Places + maps | `google_maps_places.html` — `window.CardinalMaps` |

---

## Navigation & chrome

| Feature | Module |
|---|---|
| Two-row header | `header_two_row.html` |
| Menu sections + scroll | `menu_condense.html` |
| Menu bulletproofing | `menu_bulletproof.html` |
| Home button | `home_button_universal.html` |
| Portal view sync | `portal_view_sync.html` |
| Plugin mount/exit | `plugin_mount_exit.html` |
| Retail home cleanup | `retail_home_cleanup.html` |

---

## API functions (`api/`, ES modules only)

| File | Purpose |
|---|---|
| `analyze.js` | AI photo analysis |
| `caption.js` | AI photo captions |
| `coach.js` | Objection Coach grading — Gemini 3.5 Flash → OpenAI fallback |
| `ai-status.js` | Health diagnostic for both AI providers + Supabase |
| `config.js` | Serves Google Maps key to client |
| `senddoc.js` | Email document via Resend |
| `share.js` | Public document view + signing |
| `clientsign.js` | Signature capture |
| `notify.js` | Web-push team notifications |
| `digest.js` | Daily 11:00 cron email |
| `organize.js`, `hover.js`, `summarize.js`, `roofr.js`, `ping.js` | Misc |
| `estimate-to-contract.js` | *(had a space in the filename — broke all deploys July 22–24)* |

**CRITICAL:** `api/package.json` has `"type": "module"`. Every function must use `export default async function handler(req, res)`. One `module.exports` file breaks **all** functions with `FUNCTION_INVOCATION_FAILED`.

**Also critical:** no spaces in `api/` filenames. Vercel rejects the entire build.

---

## Roster & permissions

```
ADMIN_EMAILS = ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net']
PROD_EMAILS  = ['curtis@cardinalrenovations.net', 'scottie@cardinalrenovations.net']
SALES        = ['nick@', 'joey@', 'jacob@']
```

Admins + production see all clients. Sales see only projects they created or leads assigned to them (`checklist.lead.assigned[0]`).

Helper fns: `is_full_access()`, `my_email()`, `project_assigned_rep()`, `is_admin()`

---

## Before you build something new

1. **Search this file** for the feature area
2. **Grep the base app** for likely DOM ids and function names — it hides a lot
3. **Ask: can I extend instead of add?** Two features doing similar things is worse than one imperfect one
4. **If it needs share / email / signature / print** — generate HTML and use `db.create()`. Don't rebuild that stack
5. **Add a row here** when you ship

---

*Maintained alongside `splice.py`. Update on every feature build.*
