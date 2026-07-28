# retail-B — COMMITTED spec (July 27, ~7am)

**Theo committed the full design. This is the build plan — do not re-design, do not re-litigate.** The interactive sources of truth are `all_leads_jobs_final.html` and `estimates_final.html` (both sent to Theo / in outputs; `estimates_final.html` is bundled beside this file — open it, the filters actually work). Estimated **5–7 builds. Stage every build separately — each staged build is a safe resume point.** Gate + negative-control every step; preview on device between builds.

## The committed run, in order

### 1. Dark base commit
- Iron `#202329` becomes the **base** ground; delete the 21-rule `body[data-crm="retail"]` override layer.
- **Run the inventory greps in OPEN_ITEMS §2 FIRST — re-measure, never trust the count in prose.**
- Add the **light-on-paper print override** beside the 11 existing `@media print` blocks (dark invoices to customers are not acceptable; don't invent a new mechanism).
- The 8 nested document templates (own `<html>`) and the client portal **stay light**.

### 2. All Leads & Jobs (rename from "Assigned Leads & Jobs", subtitle "Retail only")
**Mobile — Rail Left cards:**
- Neon milestone spines w/ glow: prospect `#ffd84d`, approved `#3dff9a`, lead ice `#dbe7f7`; **plain-shadow fallback for older WebViews**.
- Red→gold gradient client name; dimmed red→gold PO (`#d0564a`→`#caa030` @ .9); rep names `#e8c23a` bold.
- Whole-card tap → profile; call/text buttons `stopPropagation`; elegant SVG phone + sms icons in a right column.
- Sort chip (blue) → sheet w/ green check, **10 sorts**. Funnel w/ count badge → two-level Filters page (Done top-left, "Filters (n)", Clear all, **7 drill-in categories**, green checks, Apply).

**Desktop — Tri-Pane:**
- Left filter rail: sort select, ☑ Select all + plain-text Clear all, Milestone/Assigned To/Trade groups w/ per-option counts + live group badges.
- Middle card column: gold ring on selected.
- Right detail pane: gradient name + stage pill on the name row → PO + address → Call/Text/Open profile → 4-fact grid → framed **Map / Satellite / Communications** tabs. Communications **un-boxes and flows free**; reads the **same source** as the client Communications tab; @mentions blue.
- **Delete client — red-tinted, ADMIN ONLY** (gate on `ADMIN_EMAILS`), behind a dashed divider at the bottom. **Shared delete path for all three CRMs** (also fixes the no-delete-for-insurance/community bug).
- **NO activity timeline in the pane.**

### 3. Estimates
- **Status Lanes in work order Unsent → Sent → Accepted**; committed card language w/ neon status spines (ice / electric blue `#6fc3ff` / neon green); ⚑ flag ≥5 days waiting.
- **Filters are functional**: Status ∩ Rep ∩ Trade multi-select; nothing checked = everything shows; **NO caps, no "Show all N"** — the filter is the volume control.
- **One STATE drives mobile and desktop** — filter on desktop, flip to mobile, still filtered.
- Desktop: dual pane w/ the identical filter rail + lanes as columns + live pipeline sums ("showing N · open $X · accepted $Y").
- Mobile: the **identical** funnel/two-level filter system as All Leads & Jobs.
- **DECISION REVERSED July 27: NO auto-archive.** Accepted estimates stay in their lane permanently. If the Accepted lane ever gets unwieldy, revisit deliberately (manual archive action vs lifecycle rule) — **do not silently re-introduce.**

### 4. Gold home button returns to the chrome
- Handler dispatches on `CardinalHeader.crm()` to the **active CRM's home** (Retail home / Claims home / Frost home) — **NOT `goToLanding`** (landing is dead since 309).
- Reuse the same destination logic as the safe floor for the desktop back-button fix later.

## Deferred by Theo, on purpose
- The **retail homescreen/dashboard redesign** — design later with previews, after the dark base is live.
- The **archive mechanism** (see the reversal above).
