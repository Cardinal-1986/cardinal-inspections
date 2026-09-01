# Cardinal Guided Sale — Product & Technical Audit

*1 Sep 2026 · audited on `main` at build **1190** (`e591160`) · branch `claude/cardinal-guided-sale-audit-m0hqj6` · audit only — no app changes in this PR.*

**What this is.** The pre-implementation audit for the Guided Sale workstream: the prototype
found and run, its state model measured, every capability it needs traced to what Cardinal
already ships, and a first vertical slice proposed. **Nothing was built.** Line numbers are
against the build-1190 `index.html` and drift every build — grep, don't trust them.

---

## 0. The shape of the answer, first

1. **The Guided Sale prototype is The Appointment** — `cr-appt-styles` + `cr-appt-script`
   (`index.html:86388–86969`, builds 1159–1162, ~470 lines), plus Why Cardinal
   (`cr-why-*`, build 1160). One conductor, seven steps:
   **Job → Roof → Good → Why → House → Options → Sign**, reached via the Front Door's
   `appt` door and `/?open=appt` (1187). It survived the Showroom cutover on purpose —
   build 1190's gate proves its six consumer sites still work.
2. **It was run, not just read.** The repo's own Chromium harness (`render_appt.mjs`)
   is **21/21 green on the 1190 artifact**, and a fresh read-only drive walked all seven
   steps against a data mock at iPad landscape. Measured, not assumed: **a mid-appointment
   refresh loses everything** — job, step, all of it — and lands on the CRM home. The only
   resume that exists is the URL (`?open=appt` reopens the *picker*).
3. **The prototype is an excellent conductor with zero memory and zero discovery.** It
   holds four module-scope variables (`proj`, `stepIx`, `renders`, `docs`), captures
   nothing about the homeowner, persists nothing, and personalizes nothing beyond the
   client's name on the rail. That is not a criticism — 1161 was built as a running order
   over existing screens, and it is a *good* one. Production Guided Sale = this conductor
   **+ a state spine + discovery + education + capture-at-the-table**.
4. **Most of the journey already exists as capabilities; almost none of it exists as
   content.** The Walk, Hall of Fame, Why Cardinal, Colors, approved renders, GBB options,
   financing math, share/sign, deposits, contracts, the pre-install guide — all shipped and
   wired. But the live database holds **1 walk, 1 showcase pair, 1 workmanship pair,
   10 approved-renders-table rows** total. The architecture is ready; the shelves are
   near-empty. Content curation is on the critical path and it is Theo's, not a session's.
5. **The three "Understand Your Roof" experiences are the genuinely new build** — and two
   of them already have written, Theo-reviewed design specs in this repo
   (`ROOF_JOURNEY_DIRECTIONS.md` #5 "TWELVE LAYERS", #7 "ONE DRAWING") plus a complete
   16-spread SVG install storybook (`popup.html`) whose scenes cover every topic,
   including the unphotographable ones.
6. **Recommended first slice — the brief's slice, confirmed, with one amendment.**
   Rep signs in → picks **or quick-creates** a customer → Welcome → Why Now? →
   Priorities → Home Plans → answers persist → refresh resumes → boundary holds.
   Build it by **growing `cr-appt`**, persisting customer-truth through the existing
   `patchProjectCk()` chokepoint (which inherits the 864–873 offline outbox for free)
   plus a localStorage resume hint. **No SQL in slice 1.** Details in §I.

---

## A. Prototype map — every screen and state in the current Guided Sale

**Where it lives.** One module pair in `index.html`: `<style id="cr-appt-styles">` (86388)
+ `<script id="cr-appt-script">` (86495–86969). Export: `window.CardinalAppointment
{ open, close }`. Two DOM layers: the **pane** `#cr-appt` (z 9550, a full-screen view,
registered in `hideAllViews()` with the DISPLAY lever) and the **rail** `#cr-appt-rail`
(z 9600, chrome like `#pwaNav`, deliberately NOT registered — it must survive every
delegated module open). Blackout theme, all literal fallbacks, writes no scroll lock.

**Doors in.** The Front Door panel's `appt` door (`index.html:51925`) and the deep link
`/?open=appt` (1187, handled in `cr-lr-script` at ~51998: waits out the login screen,
retries until the module parses, then calls `open()`). The Vision hub tile died with the
hub at 1190. The Showroom app does **not** link to it.

**The running order** — `STEPS` (86520), one array, seven stops:

| # | id | kind | What the homeowner sees | How |
|---|---|---|---|---|
| 1 | `pick` | pane | **"Whose house are we at?"** — search + list of the rep's own jobs (RLS-scoped, `projects` select, newest 400) | conductor's own picker |
| 2 | `roof` | module | **Their roof** — The Walk in showroom mode (confirmed damage circled, one photo at a time) | `CardinalShowcase.openForProject(proj,{showroom:true})` |
| 3 | `good` | module | **What good looks like** — Hall of Fame (a bad install beside Cardinal's) | opens Showcase then clicks its own `[data-tab="work"]` after a 380 ms defer |
| 4 | `why` | module | **Why Cardinal** — company, OC Preferred status, the 3-row warranty ladder, roof spec, ORC §1345.23 right-to-cancel stated first | `CardinalWhy.open()` |
| 5 | `house` | pane | **Their house, your materials** — approved `design_renders` for this job as a tap-to-lightbox wall; "Shingle colours →" side-door to `CardinalColors.open()` | one `createSignedUrls` round trip |
| 6 | `options` | pane | **Your options** — the job's newest published Roof Options (Good/Better/Best) sheet | `/api/share?t=<token>` in an iframe |
| 7 | `sign` | pane | **Make it official** — the job's paperwork; pick one; it opens with its own Accept & Sign | same share page; `clientsign.js` stamps + notifies |

**Rail mechanics.** ✕ end · client first name · ‹ back · seven jump chips · › next.
Steps beyond Job disabled until a job is picked; Next dead on the last stop; ≤700px the
chips give way to a `n/7` counter (eight 44 px targets don't fit at 390 px — measured at
1161/1162). Every step transition runs `closeModules()` — each module's own `close()`,
then the DISPLAY lever directly, because a module's `close()` can no-op without throwing
(the 570–572 class).

**Run evidence (this audit, read-only, mocked data — no production rows touched).**
`render_appt.mjs` 21/21 green at phone / iPad portrait / iPad landscape on the 1190
artifact. A custom drive walked pick → roof → why → house → options → sign → open-doc,
screenshotted each step, then **reloaded the page mid-appointment: pane gone, rail gone,
CRM home**. (Six `Unexpected token '<'` page errors in that drive are the rig serving HTML
to CDN script URLs — rig artifact, not product fault; the repo harness fulfils empty
bodies and reports zero page errors.)

**Defects and gaps observed in the prototype, honestly:**

1. **No persistence of any kind** (§B, §H). Refresh, Safari reclaim, or an accidental ✕
   ends the appointment. `?open=appt` re-opens the *picker*, not the visit.
2. **The Options step's subtitle over-promises.** It says *"Initial the option you want
   us to proceed with"* — but the framed GBB sheet is review-only by design (`.gbb-box`
   is a drawn 20 px square, `index.html:50494/50538`, not a control; the sheet matches
   neither `SIGN_RX` nor `SLOT_RX`, so `/api/share` injects no sign UI). The tier choice
   is verbal-only today and is **captured nowhere**.
3. **Empty steps show empty rooms.** With no walk / pairs / renders / options sheet on
   the job, the homeowner sees prep-failure copy — one of them in internal voice (The
   Walk's *"Theo hasn't put one together yet"*). With today's content (§F) that is the
   *common* case, not the edge.
4. **Delegated screens don't clear the rail.** The doc steps reserve 92 px for it; Why
   Cardinal and the Showcase don't, so the rail overlaps their last content rows (seen in
   the render — the warranty table's third row sits under the rail until scrolled).
   Cosmetic, but on the money row of the money table.
5. **Rail labels are rep shorthand in homeowner view** ("GOOD", "WHY"). Fine for the rep;
   readable across the table.
6. **Back button walks past it.** `window.navPush` does not exist (guarded no-op call at
   86952), and `navRestore()` has no `cr-appt` case — Android/browser back exits the
   whole experience. Same is true of `cr-why` and `cr-occ`.
7. **No discovery, no priorities, no education, no price-stage logic, no payment step.**
   The original option-1 sketch in `OPEN_ITEMS.md` listed *payment (Service Finance)*
   between options and sign; 1162 shipped without it. The brief's Welcome → Why Now? →
   Priorities → Home Plans → Inspect → Solve → Educate stages have no counterpart at all.

**Why Cardinal (1160) sub-map** — `cr-why-*` (86180–86387), `window.CardinalWhy
{open, close}`. Static Blackout screen: The company · Owens Corning (Preferred
Contractor, **text only — a gate asserts zero images/SVG/url() until official artwork +
OC LMA approval exist**) · the warranty ladder (Standard 25/5 · System Protection 25/10
transferable · Preferred Protection 50/10 transferable; Platinum deliberately absent) ·
what goes on the roof (6 bullets incl. balanced ventilation) · ORC §1345.23. Content is
`PANES.proof` refaced from rep voice to homeowner voice — asserted both directions by
`gate_1160.mjs` (13 facts kept, 4 coaching asides gone).

---

## B. State map — what it captures today, and where each thing should live

**Everything the prototype holds is four module-scope variables** (86510–86515):
`proj` {id,name,stage} · `stepIx` · `renders[]` (cache) · `docs[]` (cache). Nothing is
written anywhere, ever. The module makes **one** write in total — `docToken()` minting a
`share_token` onto an `inspection_reports` row when a document is first opened (reuse,
never re-mint — the 731 convention).

**Where production Guided Sale state should live** — split by *who owns the fact*, per
the brief's customer / appointment / inspection / proposal / session question. The rule:
**a fact about the customer outlives the visit; a fact about the visit dies with it.**

| Fact | Owner | Production home | Exists? |
|---|---|---|---|
| appointment / customer | customer | `projects` (62 rows; RLS `projects_select`: full-access OR created_by OR assigned OR sales_rep — `commission_system.sql:35`) | ✅ |
| the scheduled visit | appointment | `appointments` (17 rows; `id,title,appt_date,appt_time,project_id,notes,kind,created_by`; kinds appt/job/drop/team; writer `adb`, `index.html:11265`) | ✅ — but nothing links an appointment to documents/sessions; it's a date + kind + job |
| homeowner motivations ("why now") | **customer** | `projects.checklist.guided.why_now` via `patchProjectCk()` (19790) | ❌ new key, existing store |
| priorities (ranked) | customer | `checklist.guided.priorities` | ❌ new key |
| ownership horizon ("home plans") | customer | `checklist.guided.horizon` | ❌ new key |
| inspection findings the presentation uses | inspection | roofing checklist flat keys (`CK_FIELDS`/`CK_OPT`, 18629; incl. **vent types, soffit intake Y/N, baffles clear/blocked, vent condition**) → `buildChecklistFindings()` (18717); confirmed photo findings → `walk_shots.findings` | ✅ |
| recommended solution + reason | proposal | today: the estimate scope + rep's voice; nothing structured. Candidate: `checklist.guided.recommend {what, because[]}` rendering *from* findings | ❌ |
| package/system selection (GBB tier) | proposal | **captured nowhere** (§A gap 2). Belongs on the estimate: the accepted tier's `estimates.status='accepted'` → stage `Approved` (STATUS_STAGE, 51102) | ❌ capture UI |
| colour selection | proposal | contract/estimate `<select data-crsel="occ">` filled by `wireColorSelects()` from `CardinalColors.list()` (25404) — persists as a `selected` attribute in the saved doc | ✅ at doc time; ❌ at presentation time |
| ventilation recommendation | proposal | work order auto-fills vents from the inspection (`woComponents`, 22331); nothing homeowner-facing | partial |
| pricing mode/state | session | rep-held; see §E — dealer fees are admin-only (`finance_plan_fees`, RLS) and must stay off any shared surface | ✅ boundary exists |
| objections heard | session→customer | **`objection_logs` already exists** (project-tied, outcome-tied; Sales Floor "Log a real one") | ✅ reuse |
| appointment notes | session→customer | `projects.notes` (QI appends there today) or `claim_notes`-style thread; keep to existing notes | ✅ |
| presentation mode (homeowner vs rep) | session | in-memory + the boundary rules (§E); never persisted | n/a |
| progress / current step | **session** | localStorage hint now; optional `guided_sessions` later (§H) | ❌ |
| agreement/close state | proposal | `inspection_reports.signed_at` + `data-clientsigned` + stage advance to Approved (`clientsign.js:100`) + Curtis/admin emails | ✅ whole chain ships |
| handoff state | production | stage `Scheduled` via build-day appointment (`__apptMayAdvanceStage`, 11225) → **pre-install guide auto-emails** (`autoOnAppointment`, 85818) | ✅ |

**Do not create a second customer database** — confirmed unnecessary. `projects` +
`checklist` (parsed once through `parseCkAll`, written only through `patchProjectCk`,
~50 call sites, offline-outbox-aware since build 868) is the customer store, and the
guided keys are one more namespace in it. The **only** genuinely new entity production
Guided Sale might ever need is a per-visit session row, and §H argues slice 1 doesn't
need even that.

**The resumable-session precedent already in the app:** QI guided capture
(`qi_session` in localStorage, save/restore/fresh-start + a landing resume affordance,
20635–21092 and 51695). Guided Sale's resume should copy that shape, not invent one.

---

## C. Existing-capability map — the brief's journey vs. what Cardinal ships

Verdict per stage: ✅ all · 🟡 part · ❌ none. "Content" = rows actually in the live DB
(live-count caveat: `n_live_tup` estimates, read 1 Sep).

| Journey stage | Verdict | What exists (where) | What's missing |
|---|---|---|---|
| Welcome | ❌ | — | a customer-named cover screen; trivial |
| Why Now? | ❌ | Sales Floor door-knocking coaching mentions storms (rep-facing) | homeowner discovery capture |
| Priorities | ❌ | — | capture + carry-forward (§B) |
| Home Plans | ❌ | — | ownership-horizon capture |
| Inspect | 🟡 strong | The Walk (per-job, human-confirmed circles, overlay-never-burned — `walks`/`walk_shots` + `api/detect.js`, 31-defect vocabulary); roofing checklist incl. the mandatory attic block (8128–8170); `buildChecklistFindings()` severity-graded prose; QI 12-shot capture | a homeowner-facing "what we found on YOUR roof" screen that renders findings + photos without opening rep tooling; content: **1 walk exists** |
| Solve | ❌ | scope narratives in estimate templates; `def-roof-oc` assembly (48183) is the 10-line roof system | a recommendation screen with an explainable *because* tied to findings |
| Educate / Understand Your Roof | 🟡 raw material is rich | see §G — popup.html 16 SVG spreads; Library ventilation/ice-dam cards + 5 SVG plates; contract cutaway + 11 numbered rows; two written design specs | the three interactive experiences themselves |
| Install | ✅ | **The Pop-Up Roof** (`popup.html`, 16 spreads, proven on Theo's iPad, live at presentation.cardinalroster.com) | a door from Guided Sale (today it's a Sales Floor tile + landing link) |
| Proof / Why Cardinal | ✅ | `cr-why` (1160) | OC lockup pending artwork + LMA approval (open item) |
| Design | ✅ | OC Colors (`cr-occ`): 34 colours, lines with specs + 130/160 MPH warranty rule, **63 real Cardinal roofs by colour** (`oc_color_photos`) | swatch photography (`swatch_path` NULL on all rows); the Colors "our roofs" upload is currently broken (§D finding 4) |
| Visualize | ✅ | Visualizer (separate app): Prep/Present + Review dialog; `design_renders.approved` gate; the Appointment reads approved renders directly (86691) | `?project=` deep link (§D finding 5); content: 10 renders, one job's worth |
| Review | ❌ | — | a summary pane over the session's captured facts |
| Price | 🟡 strong | estimates (21) + `computeTotals`; **GBB sheet** with per-tier price + monthly payment from 39 real Service Financial plans (`GBB_PLANS`, 50352); Financing Rates screen (1153, staff-only, dealer fees admin-only); deposits: `fillContractMoney` one chokepoint, 30 % default | tier choice captured on the tablet; value-before-price sequencing enforced by the conductor (today it's just step order) |
| Close | 🟡 | objection deck (33 rows, `objections` — red=them / navy=you) + `objection_logs` field capture | structured in-appointment objection isolation UI (rep-private) |
| Agreement | ✅ | Sign step → `/api/share` + `clientsign.js` (canvas pad, buyer slot, 409 on double-sign, stage→Approved, Curtis + rep emails); contracts per trade with the ORC §1345.23 pointer to printed masters; deposits | nothing — this chain is the most production-proven part |
| What Happens Next | 🟡 content ✅, screen ❌ | **pre-install guide** (per-trade, 6 sections, auto-emails on build-day appointment — `preinstall_guide.sql` + 85606); punch templates; work-order sections; production boxes; "Closing the Job on Paper" card (5843); popup spreads 6–15 | the interactive timeline (§G-C); Certificate of Completion has **no generator** — it exists only as a checklist mention; don't promise it on a screen until it exists |

**Existing Cardinal products, disposition** (brief §5): decided per product in §D. The
headline: nothing on this list needs rebuilding; two things need small new exports
(Showcase `setTab`, Visualizer `?project=`), and one thing (Pop-Up Roof) stays a linked
specialist experience by settled decision (the Showroom launcher refused it too).

---

## D. Integration map — how Guided Sale connects to each system

**Where Guided Sale should live: in `index.html`, as the grown `cr-appt` module.** The
reasons are load-bearing, not preference: it needs the CRM's session (projects RLS,
estimates, `window.db`, `patchProjectCk`), it drives `cr-show`/`cr-occ` which build 1190
deliberately kept in Cardinal *because the Appointment and the paperwork dropdowns consume
them* (eight live consumers, `gate_1190` proves them), and the sign flow needs
`window.db.update` for token minting. The Showroom app (separate repo
`Cardinal-1986/cardinal-showroom`, cut over 31 Aug) has none of that plumbing and its own
auth (`cr-showroom-auth`). Growing `cr-appt` also respects the brief's "must not require
redesigning the entire Cardinal application" and the migration freeze.

| System | Disposition | Mechanics (verified) | Gaps to close |
|---|---|---|---|
| **Showcase / Walk / Hall of Fame** | embed (conduct) | `openForProject(pr,{showroom:true})` → Walk; `open({showroom:true})` + DOM click on `[data-tab="work"]` → HoF; `close(false)` returns control; showroom mode = one `amAdmin()` short-circuit hiding all 14 admin controls; privacy mode masks addresses | **no `setTab()` export** — the 380 ms click-defer race is the only tab driver; a one-line export removes it. Empty-state voice (§A gap 3) |
| **OC Colors** | embed (conduct) + data | `CardinalColors.open()` (hub only — no deep link to a line/colour); `list()`/`lines()` feed every paperwork dropdown (`wireColorSelects`, 25404) | no `open({line, colour})`; **the "Add our roofs" upload is dead in both trees** — `typeof S.shrink !== 'async function'` (77339) is always true, so `shrinkOne()` returns null and every upload throws "Image tools unavailable". Pre-existing bug, worth its own build |
| **Exterior Visualizer** | data behind the scenes (today) · specialist door (later) | the Appointment never opens the app — it reads `design_renders` `.eq(project_id).eq(approved,true)` directly (86691), one signed-URL round trip. Approval happens in the Visualizer's Review dialog only | **no `?project=<uuid>` deep link** — `?present=1` lands with no job selected. Needed the day the rep wants live recolour at the table; not needed for the renders wall |
| **Showroom (standalone)** | stays separate | its launcher carries Showcase/Colors natively + Studio and `app.cardinalroster.com/visualizer/?present=1` links; it does not know Guided Sale exists | optionally add a Guided Sale link later; **do not** move Guided Sale there (auth + data plumbing above) |
| **Why Cardinal** | embed (conduct) | `CardinalWhy.open()`/`close()` | rail clearance (§A gap 4); the OC mark open item rides along |
| **Appointment (calendar entity)** | contribute data | `adb.create` kind `'appt'` = sales visit; build-day `'job'` → stage Scheduled + pre-install guide auto-email | optional: stamp `guided` linkage into the calendar row's notes; not slice 1 |
| **Cardinal Studio** | behind the scenes | curation source for pairs/tray; admin-only; **Cardinal no longer links to it in-app** (1190 — its only door was the dead hub; the Showroom launcher carries it) | none for Guided Sale directly; content pipeline matters (§F) |
| **Pop-Up Roof** | specialist door, opens and returns | public page, own domain (`presentation.cardinalroster.com/popup.html` — the bare host does **not** serve it, 1189); hash-routed spreads (`#7` = tear-off) so Guided Sale can open a specific spread | add the door (a `data-ap-open` action like Colors); keep it a new-tab/return experience — settled: it's phone-shaped and its own world |
| **Estimates / GBB** | contribute data + one embedded doc | Options step frames the published GBB sheet; publishing one requires the estimate editor (`gbbOpen()` needs `CardinalEstimates.currentProject()`) — office prep, not table work | tier-choice capture (§B); note `docKind()` has no `Roof Options` branch so the sheet files under Inspections on the profile — cosmetic filing bug |
| **Share / Sign** | embed (iframe) | `/api/share?t=` sends no frame-blocking headers (verified in `api/share.js` — also means no `frame-ancestors` at all, a deliberate-or-not openness worth a decision); `clientsign.js` = the entire close chain incl. notifications and stage advance | none — **reuse, never rebuild**; the 1149 rule (sign exactly the document you're looking at) is structural in the Sign step |
| **Financing (1153)** | rep-private data | `GBB_PLANS` (39 plans, client-safe math) already prints monthly on the GBB sheet; `cr-fin` screen + `finance_plan_fees` dealer fees are staff/admin-only | a homeowner-facing "about $X/mo" element in the Price stage can reuse `gbbMonthlyPayment()`; dealer fees never cross the boundary |
| **Sales Floor** | rep-private sibling | objections deck (DB-backed), door/talk/proof panes, House Rules deck | the rep drawer (§E) should *link* to it, not copy it |
| **Pre-install guide** | contribute data | already auto-sends on build-day scheduling; manual send button on the job | §G-C renders the same content on-screen |

**Conventions any new step/screen must follow** (the two-line rule, verified at 18975 and
28076): register full-screen views in `hideAllViews()` with the lever matching how they're
shown (display vs class+`close(false)`+confirm), and give them a `navSetView`/`navRestore`
case — which the three 1160–1161 surfaces themselves currently lack (§A gap 6); fixing
that belongs in the production slice, not another guarded no-op.

---

## E. Homeowner/rep boundary — what shows across the table, what never does

**What the prototype already gets right:** homeowner-facing steps are Blackout,
CRM-free, and show only this job's material; the rail carries the client's **name and
nothing else**; showroom mode structurally hides all admin controls; The Walk shows only
human-confirmed findings; the renders wall shows only `approved=true`; the Sign step
shows exactly one document, explicitly picked; prices appear only at Options/Sign, which
sit last in `STEPS`.

**The boundary, stated as rules for production:**

| Homeowner may see | Rep-private — must never render in presentation mode |
|---|---|
| their name/address, their photos, their findings (confirmed), education, colours, approved renders, warranty ladder, their options **with prices at the Price stage only**, monthly-payment figures, their paperwork, what-happens-next | **the client list** (the Job picker shows every job the rep can see — see risk below) · Sales Floor coaching, talk tracks, objection *answers* · `objection_logs` entries · estimates editor, margins, `pricing_items` rates · **dealer fees** (`finance_plan_fees` — already admin-RLS'd; keep it that way) · the Financing Rates screen (staff-only by design, 1153) · other customers' names/photos/addresses (Showcase privacy mode exists — masked addresses) · notes, morning strip, pipeline, any CRM chrome · `claim_notes.internal` (its own rule already: never renders where a homeowner can see the screen) |

**Boundary risks found in the prototype:**

1. **One tap from homeowner to client list.** The rail's `JOB` chip is always live; a
   homeowner holding the tablet can tap it and read the rep's whole book of business.
   Production wants the picker gated behind a rep gesture once a visit is running
   (hold-to-open, like the showroom's hold-to-exit ✕ — the pattern already ships).
2. **Empty states speak internally** (*"Theo hasn't put one together yet"*, *"Jobs are
   scoped to your sign-in"*). Every string on a presentation surface needs homeowner
   voice — 1160's reface discipline, applied to error copy.
3. **Rep shorthand on the rail** ("GOOD", "WHY") is visible across the table. Harmless
   but off-bar; production labels should read as chapters ("Our Work", "Why Cardinal").
4. **Mode is implicit.** Today "homeowner mode" = which step you're on. The brief's
   rep-drawer (coaching, notes, captured answers, next actions) needs an explicit,
   fast, discreet toggle — recommend a hold-gesture drawer on the rail, never a visible
   "REP VIEW" button a homeowner can tap. The Showroom's Prepare/Present toggle is the
   *display-boundary* precedent (explicitly not a permission boundary — same rule here:
   privacy by RLS and by what's rendered, not by a CSS class).

---

## F. Visual asset inventory — have vs. need

**Curated, ready to present (live counts, 1 Sep):**

| Asset | Rows | Note |
|---|---|---|
| `oc_color_photos` — real Cardinal roofs by colour | **63** | the strongest curated set; per-colour, address-credited |
| `oc_colors` catalogue | 34 (30 on the wall, 20 sellable) | manufacturer cover images per colour (`cover_image_path`, credited) |
| `design_renders` | 10 | one job's worth of visualizations |
| `showcase_pairs` (before/after) | **1** | architecture done at 574; shelf empty |
| `workmanship_pairs` (Hall of Fame) | **1** | same |
| `walks` / `walk_shots` | **1 / 1** | The Walk has been assembled once, ever |
| popup.html SVG scenes | 16 spreads | complete, iPad-proven, covers every install topic |
| contract roof cutaway (749) | 1 | the printed master's own 11-callout section, as a data URI in `ROOF_AGREEMENT_BODY` |
| Library plates | 5 SVGs | balanced-ventilation section, ice-barrier wall-line, ice-dam formation, roof shapes, rise/run |

**The archive:** `studio_photos` **60,502** rows (mirror of `companycam_photos` 60,945) —
but tagged only `close-up`/`wide` (+orientation); **no vision pass has ever run**
(`studio_findings` = 0 rows). A ridge-vent hero shot and a shingle-bundle photo are both
just `close-up`. So the photography for tear-off, decking, flashing, ice & water,
completed homes **almost certainly exists and cannot be found** except by hand. The three
highest-leverage moves recorded in `OPEN_ITEMS` still stand: run the vision pass over the
archive, and build the "From the archive" source in the pair-builder — that converts the
60 k into a queryable library with no front-end change.

**Likely missing outright** (judged from the taxonomy + shot lists): soffit-intake
closeups, clean installed-ridge-vent heroes, tarps-and-prep photos ("crews protecting
property" — nobody photographs the prep), drone/aerial (the `aerial` tag was a
street-name artifact, deleted; drone zips go to clients and never enter the pipeline),
all video (poster frames only; bytes live on the Spark — unusable on a field iPad).

**Brand:** `cardinal-report-logo.png` (the one logo constant), the drawn popup mark.
**No OC artwork file exists in the repo**; the required lockup (red roundel / white type
for ≥50 % black grounds) must come from Theo/OC, and **everything co-branded goes through
LMARoofing@owenscorning.com before launch** (Pink Panther adds MGM review, ~8+8 business
days; the Panther IS available to contractors — `OC_BRAND_RULES.md`). The required
independent-contractor disclaimer appears **zero** times app-wide — an inherited open
item any OC-heavy education screen makes more urgent.

**Direction for §G:** the settled DGX-Spark illustration rule fits perfectly — generated
illustration for *recognition* subjects (what a failed boot looks like), drawn SVG for
*mechanism* (airflow, layers), photography where the archive can be made to yield it.
Placeholders in engineering, per the brief — but the popup scenes mean the placeholders
can already be good.

---

## G. Understand Your Roof — implementation approach

**Form: one new homeowner-facing module (`cr-uyr`), three chapters, drawn SVG + CSS
state machines — no canvas, no library, no new observers.** The popup book proves the
whole illustration language on iPad Safari already (layered `<g class="beat">` groups
toggled by class; one `--open` custom property; reduced-motion as a second presentation).
Each chapter is a full-screen Blackout view conducted by Guided Sale as a step (and
openable standalone later). Every claim renders from an existing source of truth so the
screen can never drift from the paper — the TWELVE LAYERS spec's own rule.

### G-A · How Your Attic Breathes
An interactive section of a house — soffit, attic void, ridge — with **airflow made
visible**: tap Intake → cool air enters low along the soffit; tap Exhaust → warm moist
air leaves at the ridge; the full path animates (the popup's `airIntake()`/`airExhaust()`
at popup.html:1485–1513 are the working prototype of exactly this). A **configuration
switcher** renders the vent-type combinations the inspection vocabulary already names
(ridge / box / gable / power + soffit intake): balanced ridge+soffit · box+soffit ·
hip-heavy roof (little ridge — the Library's own trap note) · gable · powered. The
**mixed-exhaust comparison** is the centrepiece: ridge + power fan side by side, the fan
visibly pulling *from the ridge six feet away* so the ridge vent becomes an intake —
demonstrating, not asserting, "don't mix exhaust." Consequences panel keeps every claim
technically defensible by lifting the Library's already-cited copy (RCO R806, the 1/150
vs 1/300 balanced rule, the worked net-free-area table at four attic sizes, the two
powered-vent failure modes, ice-dam formation = Plate 5) — `index.html:5364–5465,
6366–6398`. **Personalization seam, built in from day one:** the screen takes an optional
`{ventTypes, soffit, baffles, ventCond}` — the exact checklist fields at 8128–8170 — and
opens on *their* configuration with *their* findings phrased by the same rules that drive
`buildChecklistFindings()`. That is "here's what your house has, here's what we found,
here's why this recommendation."

### G-B · What's Under Your Shingles?
**Build the TWELVE LAYERS spec** (`ROOF_JOURNEY_DIRECTIONS.md:159` — already scored,
already risk-annotated): one architectural section, eave to ridge, with a 13-detent
COURSE RAIL — drag right and the roof builds itself in real install order (deck → ice &
water → felt → drip edge → starter → field → valley → flashing → boots → ventilation →
ridge cap); drag left and it tears off. Tap any labelled part to jump. Each detent fills
a caption plate: what it is, what it does, why it matters, how Cardinal handles it — and
the **contract item number**, because the 11 callout rows in `ROOF_AGREEMENT_BODY`
(10226–10312) are the caption set, rendered *from* the contract so drawing and paper
cannot disagree. Product names verbatim from the agreement (OC Starter Plus, Pro Edge,
Decoridge). The "correct vs shortcut" comparison uses the spec's ghost-roof mechanism —
**against Cardinal's own Standard column, not a competitor** (the spec's bold choice,
which removes the advertising exposure and makes it an honest upsell); the spec's
recorded risk (post-signature it shows the roof they didn't buy) is Theo's call — §J.
The popup's `cutLayers()` five-band cutaway and spread 12's labelled edge are the interim
placeholder while the plate is drawn. Phone fallback: three swipeable plates via one
viewBox swap — in the spec.

### G-C · What Happens After You Say Yes?
An interactive timeline — a horizontal spine of tappable stages, each opening a card with
photo/illustration, what to expect, what Cardinal is doing, what (if anything) the
homeowner does. **Every stage grounds in Cardinal's real process, none invented:**
Agreement (deposit terms from `fillContractMoney`'s own rules) → handoff to Curtis
(clientsign.js literally emails him today) → scheduling (build-day appointment) → the
pre-install guide (the 6:30–7:00 crew window, street parking, outlet, call-before-you-
step-out, kids and pets — `preinstall_guide.sql`, already client-emailed, already in
Theo's voice) → delivery (popup 6) → protection & setup (tarps — popup 7's copy) →
tear-off → **decking inspection & the written-change-order-before-any-extra-work rule**
(the contract's own concealed-conditions clause, 9946) → system install (G-B's layers,
cross-linked) → flashing/details → ventilation (G-A, cross-linked) → cleanup → **magnetic
sweep** (stated in seven shipped places; popup 15's "Nails: 0") → punch/QC (the punch
templates' own steps) → homeowner walk-around (popup 14) → documentation → warranty
registration (the "Closing the Job on Paper" card's list, 5843). **Flagged, not
invented:** Certificate of Completion has no generator today — the stage says "final
paperwork & warranty registration" until one exists; exact stage order needs Theo's
sign-off against how production actually runs (§J). Personalization: the header carries
their shingle + colour + ventilation recommendation from the session, and stage photos
prefer their job's photos when present. The deeper storybook treatment of the same
journey already exists — the timeline links spreads (`popup.html#7` etc.) rather than
re-drawing them.

**Sequencing note:** G-B first (it's specced to the detent), G-A second (the popup
airflow prototype de-risks it), G-C third (most content-assembly, least interaction
risk). Roughly 2–3 builds each at this codebase's cadence, previews to Theo before
shipping per his standing rule. None of the three requires SQL.

---

## H. Persistence & resume — the smallest robust model

**What breaks today, measured:** refresh/reopen mid-appointment = total loss (§A). What
already exists to build on: the offline-first program (builds 864–873 — Supabase read
cache in `sw.js`, `CardinalOutbox` write outbox with `patchProjectCk`/`db.update` routed
through it), the `qi_session` localStorage resume precedent, and the `?open=appt` deep
link that already survives sign-in.

**Recommended model — three layers, no new tables in slice 1:**

1. **Customer truth → the customer record.** Every discovery answer and selection writes
   `projects.checklist.guided.*` through `patchProjectCk()` the moment it's captured.
   That single choice buys: RLS inheritance (rep sees own jobs), cross-device carry
   (answers follow the customer, not the iPad), **offline capture with sync-on-signal
   for free** (868's chokepoint), and no second customer database. Keys:
   `guided: { why_now[], priorities[], horizon, recommend{}, updated_at, updated_by }`.
2. **Visit position → the device.** One localStorage key (`gs_session`, the `qi_session`
   shape): `{ projectId, projectName, stepId, startedAt }`, written on every step change,
   cleared on End. On `open()`: if a hint exists and is fresh (< 12 h), paint a resume
   card — *"Resume Kim Lawson — Priorities"* / *"Start fresh"* — exactly QI's
   `allowResume` pattern. Combined with layer 1, resume restores both *where you were*
   and *everything answered*, because answers were never only local.
3. **The URL stays the door.** `?open=appt` already reopens the conductor after any
   reload and waits out sign-in; with layer 2 it now lands on the resume card instead of
   a bare picker. (Optionally extend to `?open=appt&job=<id>` for a bookmarkable
   per-visit link — cheap, not required.)

**Explicitly deferred, with the trigger written down:** a `guided_sessions` table (one
row per visit: project_id, appointment_id, created_by, step, status, timestamps) adds
cross-*device* resume, multi-rep visibility, and visit history/analytics. Add it when one
of those is actually asked for — it's a 30-minute migration then, and skipping it now
keeps slice 1 SQL-free. **Do not** build speculative offline infrastructure beyond what
864–873 already provides (the brief's own rule; also the settled "offline CREATE is
deferred" decision — quick-created customers at the kerb need signal in slice 1, which
matches how `pdb.create` behaves everywhere else today).

Safari-reclaim reality check: iPad Safari can evict a background tab at will; layers
1+2 make that a two-tap recovery (reopen app → Resume). The PWA's network-first SW means
no stale-build weirdness on that reopen. That is the appropriate production bar; a
service-worker-level session snapshot is not.

---

## I. First vertical slice — exactly what to build first

**The brief's slice stands.** Nothing in the audit argues for a different first seam —
the conductor exists, the doors exist, the persistence chokepoints exist; discovery +
persistence is the missing spine everything later (personalization, Solve, Review, the
education chapters' "your house" seams) hangs from. One amendment: "opens **or creates**"
— creation reuses `pdb.create()` exactly as QI's new-prospect quick-add does (20883):
name + phone + address, stage Lead, nothing else. No second lead pipeline.

**Scope (one PR, ~2–3 builds at house cadence):**

1. **State spine.** A `GS` state object in `cr-appt-script`; `checklist.guided.*` writes
   through `patchProjectCk()` on every answer; `gs_session` localStorage hint on every
   step change; resume card in `open()`; End clears the hint (answers stay — they're
   customer truth).
2. **Four new pane steps at the front of `STEPS`** — Welcome (their name, their address,
   the visit's promise, one Begin control), Why Now? (tap-cards: storm damage · active
   leak · age/wear · selling soon · insurance told us · something else + free note),
   Priorities (pick-then-rank cards: lowest price · looks/curb appeal · longevity ·
   warranty · fastest schedule · financing), Home Plans (staying 10+ years · 3–10 ·
   selling within ~3 · rental/investment). Homeowner-voiced, 44 px+ targets, Blackout,
   previewed to Theo as labelled options before shipping (his standing rule for visual
   work). Existing five steps follow unchanged behind them.
3. **Quick-create** on the picker ("New customer" → name/phone/address → `pdb.create` →
   proceeds to Welcome).
4. **Boundary hardening that the slice itself makes urgent:** picker re-entry gated by
   hold-gesture once a visit is running (§E-1); empty-state and rail copy to homeowner
   voice (§E-2/3).
5. **Docs discipline:** FEATURES.md row, build-log entries, OPEN_ITEMS strike, same PR.

**Files/systems touched:** `index.html` (`cr-appt-styles`/`cr-appt-script`, plus the
`STEPS`-adjacent rail), nothing else. **No SQL. No new tables. No new observers. No new
scroll-lock writers. No API changes.**

**How it's tested** (the house pattern, every piece able to go red):

- `check_build.py` ladder + marker + negative control vs the pre-slice artifact.
- A `gate_NNNN.mjs` jsdom drive of the SHIPPED module against a mocked supa: answers on
  each discovery step produce the exact `patchProjectCk` payloads (mock records writes);
  a fresh realm with the localStorage hint + seeded checklist **resumes to the right
  step with the right answers painted**; the quick-create path calls `pdb.create` with
  Lead stage; a rep-privacy assertion — no coaching/objection/dealer-fee strings render
  on any homeowner step. Run against the previous build as a control: must go RED.
- `render_appt.mjs` extended: the four new steps at phone/iPad-portrait/iPad-landscape —
  inks computed against the composited ground, ≥44 px targets, no sideways scroll, rail
  above 9500.
- Sentinel `appt` state re-swept (colour/layout build → its result gates the merge, per
  the 27 Aug settled rule).
- `gate_types` / `gate_dupes` / `gate_stack` / `gate_a11y` every build.

**DONE means:** a rep can sign in on an iPad, pick or create a real customer, run
Welcome → Why Now? → Priorities → Home Plans into the existing five steps; kill Safari
anywhere; reopen `?open=appt`; tap Resume; land on the same step with every answer
intact; and at no point does a homeowner-visible screen carry rep-private material.
Gates green, docs updated, Theo has previewed the four screens before the ship.

**Deliberately NOT in the slice** (each its own later arc): Understand Your Roof (§G),
tier-choice capture at Price, personalization consumers (later screens *reading*
`guided.*`), the Visualizer deep link, the Showcase `setTab` export, back-button
`navRestore` cases, the rep drawer, `guided_sessions`, any content curation.

---

## J. Risks & decisions that genuinely need Theo

1. **Content is the critical path, not code.** With 1 walk / 1 pair / 1 pair / 10
   renders, the presentation steps are empty rooms on almost every job. Decide: (a) who
   stocks the Showcase/HoF/walks and when (the archive vision-pass + tray pipeline is
   the fast route), and (b) **should Guided Sale auto-skip steps that are empty for this
   job** (rep sees a dim chip, homeowner never sees an empty room)? Recommendation:
   auto-skip with rep-visible dimming.
2. **Where may prices appear, exactly?** Today: GBB sheet (three tier prices + monthly)
   at Options, totals on signed docs at Sign. Confirm that rule for production ("no
   dollar figure on any screen before Options") so the conductor can enforce it
   structurally rather than by step order — and say whether monthly-payment framing may
   lead at Price (the plans + math exist; W.A.C. footnote included).
3. **The ghost roof** (G-B): showing the Standard column beside the recommended build is
   a strong pre-signature upsell and a grievance after signature — the spec's own
   recorded risk. Pre-signature only, or a mode that renders only their circled column?
   This changes the caption copy on all twelve layers, so it precedes the build.
4. **Tier choice on the tablet.** The Options step currently can't capture the initial.
   Options: (a) a Cardinal-side "we're proceeding with Better" control (writes
   `estimates.status='accepted'` → stage Approved via the existing map) with the
   signature still landing on the contract at Sign; (b) make the GBB sheet itself
   signable (new markup + clientsign extension); (c) keep it verbal + paper. (a) is
   recommended — smallest, uses existing status machinery, keeps 1149's
   sign-what-you-see rule intact.
5. **Ventilation recommendation authority.** G-A can *derive* a recommendation from the
   checklist fields; does it, or does the rep pick from the derived shortlist with the
   reasons shown? (Recommendation: rep confirms — matches The Walk's
   person-confirms-then-client-sees doctrine.) Same question later for shingle/system.
6. **OC marks on education screens.** Text-only until official artwork + LMA approval
   (existing open item; Panther adds MGM review). Also the independent-contractor
   disclaimer (zero occurrences app-wide) — one decision covers Why Cardinal, the
   estimate `.est-oc` block, and everything §G adds.
7. **Cross-device resume.** Slice 1 resumes on the same iPad (plus answers everywhere).
   If "start on the office desktop, resume on the truck iPad" matters, say so — that's
   the `guided_sessions` trigger (§H).
8. **What Happens Next accuracy.** The G-C stage list is assembled from shipped process
   artifacts, but the *operational* order and promises (crew window, sweep timing,
   walk-around, who calls whom) need your sign-off before a homeowner sees them — and
   Certificate of Completion stays off the screen until a real one exists.

*(Not put to Theo, decided by the audit as engineering: grow `cr-appt` rather than start
a parallel module; keep Guided Sale in `index.html` rather than the Showroom app; no new
session table in slice 1; reuse `pdb.create`/`patchProjectCk`/share-sign as-is.)*

---

## Appendix — instruments, environment, and data reality

**Playwright MCP: not loaded in this environment, and diagnosed rather than rebuilt.**
This remote session's tool registry has no Playwright MCP server, and the repository
contains no `.mcp.json` (project-scope MCP config), so whatever project-scope
configuration exists on the machine where it was set up did not travel with the repo.
Per the brief's own rule, this was not turned into an infrastructure project: browser
inspection ran on **Playwright-the-library + the preinstalled Chromium** — the identical
instrument every `gate_*.mjs`/`render_*.mjs` in `scripts/` uses. (One local repair worth
recording: the gitignored `scripts/node_modules` symlink pointed at a dead scratchpad
from a previous container; re-pointed per the `.gitignore` note's own instructions —
jsdom+axe installed, global playwright linked. Nothing committed.)

**Runs performed (all read-only, all against mocks — no production data touched, no
writes):** `render_appt.mjs` on the 1190 artifact — 21/21 green, three viewports; a
custom seven-step drive with screenshots + a mid-appointment reload probe (the resume
measurement in §A); live Supabase reads limited to `information_schema` and
`list_tables` row estimates.

**Data reality (live estimates, 1 Sep):** projects 62 · estimates 21 ·
inspection_reports 29 · appointments 17 · walks 1 · walk_shots 1 · showcase_pairs 1 ·
workmanship_pairs 1 · design_renders 10 · oc_colors 34 · oc_color_photos 63 ·
objections 33 · finance_plan_fees 39 · studio_photos 60,502 · studio_findings 0 ·
companycam_photos 60,945.

**Corrections to the doc set found while auditing** (recorded here, not fixed in this
PR): the 1162 build-log line calls the GBB initial boxes "print-only" — they are plain
drawn squares present on screen (`50494/50538`); the sheet is review-only in the share
frame either way, which is the claim that mattered. `FEATURES.md`'s Appointment section
still names the retired Vision hub tile as the door — the doors are the Front Door and
`?open=appt` since 1190.
