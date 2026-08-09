# CR Audit — Full-System QA, Data Audit & Feature Inventory
**9 Aug 2026 · audited at build 652 (`551295a`) · live DB `yipslubcptjoarblzbpl` (read-only — this audit changed nothing)**

Commissioned by Theo via a pasted QA spec. The spec assumed React components, `/api/v1` routes and native mobile apps; the audit maps its intent onto what Cardinal actually is — one `index.html` (~107 inline scripts, 3.77 MB), 27 `/api/*.js` functions, Supabase, installed PWA. Line numbers are 652-era and drift every build; `scripts/audit_recount.py` re-derives the artifact-side numbers so nobody has to trust prose.

**Method.** Five parallel read-only audit passes (wiring · insurance data integrity · cross-view consistency · dormant features · performance) seeded from the doc set so nothing already recorded was "re-discovered," followed by a verification pass in the main session: every headline claim was re-proven by direct grep/SQL before being marked CONFIRMED. Where two passes disagreed, the code settled it and the dispute is recorded (§ Disputes). Known false alarms (`#insEditBtn`, `.dashcard`, `#cr-hd2-ribbon`, `#acxEdit1`, the 13 scroll-lock writers, the 45-guarded-`.single()` audit) were excluded on purpose and remain non-findings.

**Live-data baseline at audit time:** 30 projects · 5 insurance_claims (2 project-linked, 3 orphans) · 0 insurance_supplements · 13 estimates (8 draft / 5 sent) · 0 contracts (both stores) · 196 project_photos (13 legacy base64) · 0 collections/commissions/draws (system live, awaiting first check).

---

## Executive summary

The app's **delegation/wiring layer is healthy** (419 data-attributes swept: one harmless orphan) and its **stage rendering has no stale copies**. The real exposure clusters in four places:

1. **Money is computed two ways and both render** — the profile's contract-conservative `jobFinance()` vs everything else's estimate-inclusive `projectValue()`, live-divergent on 4 of 30 projects today, plus an AR card that never subtracts payments.
2. **The insurance lifecycle has two unconnected supplement stores**, no scope history beyond first+latest, and its only money-carrying claim ($28,727) is currently **invisible on every insurance surface** because of a NULL checklist and an OnHold stage the rail silently drops.
3. **A handful of handlers write money rows and never look at the result** — worst: the AI-estimate "Send" button promises the client an email/SMS that **no code anywhere sends**, and the Convert-to-Contract button calls an endpoint name that **does not exist** (underscore vs hyphen).
4. **13 legacy base64 photos + 3 base64 covers** make Photo Activity an ~11.8 MB tap and add ~0.9 MB to every boot — one storage backfill fixes both.

Everything else is inventory: genuinely buried features worth wiring (a working invite endpoint, a smoke-test runner, 28 unread iTel lab rows), dead weight worth deleting, advisor-level DB hygiene, and the spec-vs-reality gap analysis for the insurance lifecycle (§ Gaps) with Theo's own three-filings supplement model as the anchor.

**Counts: 23 findings — 8 High, 9 Medium, 6 Low · plus 6 buried features · 6 gap-features sized for decision.**

---

## Findings log

Format per finding: severity · status (CONFIRMED = re-proven in the verification pass or by live SQL; LATENT = confirmed in code, no triggering data yet) · module · evidence · fix sketch. Categories follow Theo's template.

### CR-AUD-001 — Convert-to-Contract calls an endpoint that doesn't exist
**High · CONFIRMED (latent — 0 `ai_estimates` rows yet) · Functional Wiring · AI Estimates**
`index.html:23429` posts to `/api/estimate_to_contract` (underscore). The only file is `api/estimate-to-contract.js` (hyphen) — whose own header comment still reads `api/estimate_to_contract.js`, i.e. the file was renamed and the client never followed. Vercel routes functions by exact filename → the call 404s. Corroboration: `contracts` table has 0 rows. The moment a rep generates an AI estimate and taps Convert, it fails. *Fix: one path string (and the stale header comment); verify with a live POST after deploy.*

### CR-AUD-002 — "Send" toasts a client email/SMS that nothing sends, and ignores write errors
**High · CONFIRMED · Functional Wiring / Silent Success · AI Estimates (`showOutput`, ~L24211)**
Handler body: unchecked `update({status:'sent'})` → `toast('Sent — client will receive email/SMS')`. (a) An RLS refusal still toasts success. (b) Verified across all of `/api/` and `index.html`: **no code path emails or texts anyone on `'sent'`** — `api/estimate.js` only inserts drafts. A rep is told the client was contacted; nobody was. *Fix: check the returned error; then either wire a real sender or reword the toast — **which one is Theo's call**.*

### CR-AUD-003 — Job money is computed from different tables on different screens (live ×4)
**High · CONFIRMED live · Data/Workflow Conflict · Money core**
`jobFinance()` (profile Job Value/Balance Due, worksheet, invoices): signed contract **docs** + `manual_value` — deliberately contract-conservative. `projectValue()` (pipeline $, AR card, ALL reports, Approvals, LJ pane): `contracts` **table** → else max(manual, best sent-family **estimates-table** row, estimate-doc totals). A job with a sent estimate and no contract = **$X on every list, $0 on its own profile**. Live: 4 divergent projects ($36,654 Prospect · $20,525 Approved · $1,820 Invoiced · one more), and since both contract stores are empty, the fork fires for *every* estimated job today. Also "Signed revenue by rep" is a stage-proxy (`rptIsSigned` = stage ≥ Approved), overclaiming signature. *Fix options: one shared value function with an explicit precedence, or an on-screen provenance label ("from estimate — no contract yet") on each. Product call.*

### CR-AUD-004 — AR "Outstanding" never subtracts payments, and cites a source it doesn't use
**Medium-High · CONFIRMED · Data/Workflow Conflict · Home dashboard (~L10040)**
AR aging sums `projectValue(p)` for Invoiced jobs — no worksheet/payment subtraction — while the profile's Balance Due is `value − paid`. A half-paid job reads full on the dashboard, half on the profile. The card's caption says "Totals from Worksheet Invoices"; the figure is `projectValue` (estimate/contract table) — a false provenance claim on screen. *Fix: subtract paid; correct the caption.*

### CR-AUD-005 — Two supplement systems, no crosstalk
**High-latent · CONFIRMED structural (0 conflicting rows — both stores empty) · Insurance Logic Conflict**
System A: `insurance_supplements` multi-row CRUD (claims screen, statuses draft/submitted/approved/partial/denied/withdrawn) — feeds `supplement_stats()` tiles and Adjuster Directory win rates. System B: `insurance_claims.supplement_*` single slot (profile card, statuses none/filed/…) — feeds the rail, `owedOn()`, chase flags. Even the vocabularies differ (`filed` vs `submitted`). **File a supplement in one place and the other shows nothing.** `claim_money.supplements_open` — the one column bridging to System A — has zero consumers. The first real filing creates the divergence. *Fix: one store. Theo's own domain model (build log ~L10868: a supplement is THREE distinct filings — partial-denial · backend · PWI/COC) is the recorded shape to design against — "put a shape to him before touching the rail."*

### CR-AUD-006 — The only claim carrying money is invisible on every insurance surface
**High · CONFIRMED live · Insurance Logic Conflict · claim `3664a5bd…` / project `bc024ad1…`**
$28,727.17 approved RCV, two-way linked — but the project's `checklist` is NULL → `projClaimType()` returns `'unknown'` → excluded by `insuranceProjects()`, the Insurance Clients list, and the supplement card. Repair the type and it's *still* dropped from every rail bucket because the stage is **OnHold**, which `railKeyFor()` returns but no bucket exists for — while its money still feeds the summary tiles (same-screen inconsistency). *Fix: data repair (set `checklist.lead.claim_type='insurance'`) + `linkClaimToProject()` writes the type on link + treat a claim row as an insurance signal + an OnHold rail bucket.*

### CR-AUD-007 — No realtime; two devices silently overwrite each other's checklist
**High risk class · CONFIRMED by construction · Data/Workflow Conflict · core**
Zero realtime subscriptions (`.channel(`/`postgres_changes`: 0 matches). `reload()` fires only on user action. `patchProjectCk()` parses the checklist **from local cache**, merges, writes the **entire JSON** back. Two devices editing the same job = last-write-wins on: the full comms thread, payments, worksheet, tasks, contacts, manual_value, assignment, every `t_*` stage timestamp. Theo works phone + ultrawide — this is the spec's "race conditions between desktop and field" item, confirmed as real. (`stage` itself is a single-column update and mostly safe.) *Fix options, increasing cost: refetch-merge before write (compare `updated_at`, re-read on mismatch) → per-key checklist patches → realtime. First option is small and kills most of the risk.*

### CR-AUD-008 — Legacy base64 media: an 11.8 MB tap and 0.9 MB on every boot
**High (field) · CONFIRMED live-measured · Performance · photos**
(a) Photo Activity (`openPhotosView`) selects `data`: **13 of 196 rows are base64 originals summing 11,754,783 chars** (max 1.35 MB) — ~11.8 MB of JSON per tap on a phone. (b) `pdb.list` selects `cover_image`: 3 covers avg ~297 KB written as 1600px dataURLs = **~0.9 MB on every boot and each of the 53 `reload()` sites**, growing ~300 KB per future cover. (c) `renderGallery` has **no `loading="lazy"`** and loads 1600px originals into 140px tiles (~15 MB worst case). *Fix: one storage backfill (13 photos + 3 covers → `photos` bucket; the `photoDb.add` path is the recipe — the `_src`-preferring renderers already handle paths), plus a one-line `loading="lazy"`. THUMB rendition on upload is the longer-term 633-lesson fix.*

### CR-AUD-009 — Two fields are read from columns that don't exist, with a live victim
**Medium · CONFIRMED live · Insurance Logic Conflict · `cr-iu-script` (~L42918)**
`insurance_claims` has neither `coverage_type` nor `ord_law` (42 columns, schema-verified) — yet `shape()` reads both, and `unified()` **prefers the table row over the checklist whenever a claim row exists**. Project `232ff50b…` has both values in its checklist AND a claim row → profile renders Coverage Type / Ord. & Law **blank** right now. Armed second failure: `save()` includes both fields in its payload — if ever called (currently zero callers), PostgREST rejects the entire write. *Fix: fall back to checklist in `shape()`; strip the two fields from `save()` (or add the columns and backfill).*

### CR-AUD-010 — The Cardinal Truth hub destroys its own navigation cards when the rail renders
**Medium · CONFIRMED (verification pass settled a dispute — see § Disputes) · Functional Wiring · `cr-cth-script`**
`render()` sets `#cardinalTruthView .ins-body` `innerHTML` to rail/stats markup containing **no `ins-grid`, no `data-ctnav`, no cards** — wiping the static Insurance Clients / Supplement Templates buttons, the Adjuster Directory stub (so `cr-adj`'s `activateStub()` upgrade finds nothing), and the claims module's injected tracker card. The destinations stay reachable via the banner menu / nav / ⌘K, so this is lost navigation, not lost features. Also: 2 of `#ctPlusMenu`'s 3 buttons ("Adjuster note — soon", "Supplement — soon") are labeled placeholders with no handler (the third, "New Claim", is live-rewired). *Fix: render the rail into its own container beside the grid, or re-render the cards in the rail markup.*

### CR-AUD-011 — A dead control is hiding a duplicate-claim trap behind it
**Medium · CONFIRMED · Functional Wiring / Insurance Logic · `cr-xlinks-script` `forProject()` (~L27162)**
The per-client claim card never renders: it selects `client_name` from `projects` (column is `name`) → 400 → silently swallowed (class 16). Behind that dead wire: it keys claim-existence on `projects.insurance_claim_id` and its fuzzy fallback filters `project_id IS NULL` — so a claim linked the correct way is invisible and the card offers **Create** → duplicate claim (the exact trap the bridge comment documents). **Fixing the typo alone re-arms the trap — both must be fixed together** (key on `insurance_claims.project_id`). Live: 0 mismatches today.

### CR-AUD-012 — Four money-adjacent handlers never check their writes
**Medium · CONFIRMED · Functional Wiring · claims + estimates modules**
Insurance payment delete (~L26805) and supplement delete (~L26896): unchecked delete → unconditional "Deleted" toast. AI-estimate detail Discard (~L24205): unchecked (its own module's list-side `creDiscard` does it right — convention held 5 of 6). Claim modal save: checks SQL error but no try/catch → an offline tap does nothing at all. Population re-measured at 652: **85 async click handlers / 30 without try-catch / 18 DB-writing / these 4 never check the returned error** (the broader class is OPEN_ITEMS §6c). *Fix: copy each handler's in-module correct neighbour.*

### CR-AUD-013 — Estimates tile counts documents; every money figure counts the table (live ×7)
**Medium · CONFIRMED live · Data/Workflow Conflict**
The job-menu tile + `#tab-estimates` count estimate **docs** (`cacheRows`); the dashboards/list price jobs from the **`estimates` table** (a different screen's store). Live: 7 projects where the counts disagree — e.g. tile "Estimates 0" beside pane "Estimate $36,654"; the Invoiced job: tile 0, table 4. Same class as the 649 comms-count fix. *Fix: point tile+tab at the table (or show both, labeled).*

### CR-AUD-014 — Insurance stage labels: two divergences and a shared OnHold hole
**Medium · CONFIRMED · Insurance Logic Conflict · 4 label maps**
Four independent maps relabel the same stages. Divergences: **Closed** = "Archived" on the Insurance Clients list, "Closed" everywhere else; **Invoiced** = "Awaiting RCV" ×3 vs "Awaiting Depreciation / Supplements" on the rail. **OnHold is absent from all four** — and in the rail it's worse than a label (see 006). *Fix: one shared insurance label map (they already claim to mirror each other) + OnHold handling.*

### CR-AUD-015 — Whole-table star-select of `insurance_claims` at every page load
**Medium · CONFIRMED · Performance · `cr-iu-script` `load()`**
Runs at DOMContentLoaded for every user on every screen, `select('*')`, no filter/limit — the only unbounded boot-path star-select on a growth table (5 rows today). Also fires before the session resolves on fresh login (RLS returns empty until a later `refresh()`). *Fix: name the ~15 consumed columns; defer until a session exists.*

### CR-AUD-016 — The Admin Health check cries wolf five ways
**Medium · CONFIRMED (three are prior art, two new) · Dormant/Registry rot · `cr-ahc-script`**
Prior art (OPEN_ITEMS ~L453): phantom tables `payments`/`supplements` (real ones: `insurance_payments`/`insurance_supplements`), `team_profiles` probed by an `id` column it doesn't have, `audit_events` probed by wrong column names, all reported uselessly because `head:true` hides PostgREST's reason. New: the registry still monitors **`push_subscriptions`** — the table build 611 documented as never-read (superseded by `push_subs`, which is unmonitored); so the health screen green-lights a dead table and ignores the live one. *Fix: one registry-repair pass + drop `head:true` blindness (the recorded recipe).*

### CR-AUD-017 — The rail's supplement bucket and `owedOn` disagree about the same filing
**Medium-latent · CONFIRMED structural (0 filed supplements yet) · Insurance Logic Conflict**
`railKeyFor()` buckets a filed supplement only at stage Approved/Prospect; filed at any other stage the job stays in its stage bucket showing `approved_rcv` — while `owedOn()` shows `supplement_filed` **instead of** RCV for the same job, and the `owedSupp` tile adds it regardless of stage. Two screens, same job, different dollar; tile and bucket can disagree on one render. *Fix: one stage rule, stated once.*

### CR-AUD-018 — Community bid falls back to draft estimates
**Low-Medium · CONFIRMED live ×1 · Data/Workflow Conflict · `cr-ch2-script`**
`estTot`/`loadEst` has no status/archived filter and prefers accepted-then-**newest** (not max): a **draft** $6,180 estimate prices "Kitty Hawk Realty — 7036 Montague" on the community hub while every other surface shows $0. Retail's `estBest` (sent-family, non-archived, max) is the model. *Fix: apply the `SENT_EST` discipline to `loadEst`.*

### CR-AUD-019 — Inspections tile and tab exclude different document types
**Low · CONFIRMED latent (0 triggering docs) · Data/Workflow Conflict**
Tile's negation bucket doesn't exclude work orders; tab's doesn't exclude invoices. Fires the day the first crew work order or invoice doc exists on a job. The 555 comment even warns the buckets must move together. *Fix: align the two predicates.*

### CR-AUD-020 — Small wiring cleanups (bundled)
**Low · CONFIRMED · Functional Wiring**
`data-ctnav="library"`: two consumers, zero writers (dead branch). `#cr-nav-healthcheck` anchor id never created (real id `cr-nav-health`) — menu ordering drift only. `refreshMeasSummary()` renders into `#acxMeasSummary` which no longer exists — no-ops forever, superseded by the dossier tile; delete. `CardinalCommunityBid.logSubmitted` guarded-called but never assigned — bid analytics has never fired; point at `CardinalCommunityAnalytics` or delete. `CardinalEstimatesList.reload` and `CardinalPhotos.openPicker`: guarded dead hooks. Observation, not a defect: the AI-output "Save" button is a placebo (row already persisted as draft) — honest in effect.

### CR-AUD-021 — Dead weight (verified deletion candidates) and NOT-dead lookalikes
**Low · CONFIRMED · Dormant**
Delete-safe: `cr-ih-script` stub (~250 B — **but its `cr-ih-styles` is LOAD-BEARING**: all 10 class tokens style the live Truth hub; the doc set's "8 KB dead styles" claim is wrong on both counts, measured 3.4 KB and alive); `claim_notes` table (0 rows, 0 refs); `estimate_templates` table (0 rows, 0 refs); `push_subscriptions` (after CR-AUD-016's registry fix). **NOT dead, do not drop:** `claim_upgrades` (0 rows but **summed by the `claim_money` view**); `studio_events`/`studio_findings` (Spark-side future); every empty-but-wired table (collections/draws/commissions/carrier_adjusters/walks/studio_tray).

### CR-AUD-022 — Database advisor batch (Supabase linter, triaged)
**Low-Medium · CONFIRMED by advisors · Performance/Security hygiene**
Security: leaked-password protection OFF (one console toggle — recommend); 18 functions without pinned `search_path` (the 650 commission functions all pass — the backlog is pre-existing); SECURITY DEFINER functions callable via RPC — **verified not exploitable** (trigger/event-trigger types cannot execute via RPC; `is_staff`'s anon grant is deliberate and documented) — revoke-EXECUTE hygiene only. Performance: **37 RLS policies re-evaluate `auth.*()` per row** (mechanical `(select auth.email())` wrap, one migration); 30 tables with stacked permissive policies (legacy per-person + role policies both evaluated); 12 unindexed FKs (incl. `draws.project_id`, two on `insurance_claims`) — cheap batch; 58 unused indexes on tiny tables (leave alone).

### CR-AUD-023 — Minor boot weight
**Low · CONFIRMED · Performance**
`loadTeamProfiles` pulls 10 base64 portraits (~0.5 MB) every boot and on every `showMain`; NACHI tables star-selected at sign-in regardless of use (17 KB today, unbounded shape). Fine today; noted for growth. Context, recorded honestly: every app open re-downloads the whole document (~1.1 MB gzipped) **by design** — `sw.js` is network-first so deploys land instantly; the cache is an offline fallback, not a speedup. Not proposed as a change.

---

## Buried features (built and working — no entry point)

| # | What | Where | Wire-up |
|---|---|---|---|
| B1 | **Team invite endpoint** — creates a sign-in + role, admin-gated | `api/invite.js`, zero call sites | "Invite teammate" button on the Team page (admin) |
| B2 | **`CardinalWalk`** — admin smoke-test runner (drives the AI-estimate flow with pass/fail UI). Name trap: NOT the client-facing Walk | `cr-walk-script` (9.7 KB), console-only | banner ROUTES entry beside `selfcheck`, or document as console tool |
| B3 | **`CardinalUndo`** — undo-toast utility, zero users | `cr-undo-script` | call from destructive paths (client delete, punch delete, Studio bin) — or delete |
| B4 | **28 iTel lab rows nothing reads** — `itel_lab_reports` (applied 8/7, real data) while the app's iTel card reads `itel_reports` (0 rows) | `itel_register.sql` | check for the missing consumer before building anything iTel |
| B5 | Hidden doors (inventory, working as designed): `?vision=1`/`showroom.*`, `?health=dev`, banner `selfcheck`/`whatsnew`/`abc`, `/api/ping`, `/api/companycam-status`, `/api/abc` (env-gated) | — | none needed |
| B6 | `/api/clientsign` (called only from `share.js`-generated pages) and the two cron digests — **zero client call sites but alive**; recorded so nobody deletes them | — | none |

## Insurance lifecycle — spec vs reality (§ the gap analysis)

| Spec step | Verdict | Reality |
|---|---|---|
| Claim intake (carrier/policy/RCV/ACV/deductible) | ✅ EXISTS | `insurance_claims` + claims screen + checklist mirror + SoL bridge (write-once `first_scope_*`, per-scope `approved_*`, `claim_money`, `supplement_stats()`) |
| Adjuster contacts / directory | ✅ ×2 (unconnected) | derived directory (`cr-adj`) ⟂ `carrier_adjusters` roster (`cr-cadj`) |
| Adjuster MEETING scheduling, calendar sync, push | ❌ ABSENT | `appointments.kind` = job/drop/appt/team only; no `.ics`; no appointment-driven push. Claim *status* values `adjuster_pending/met` exist |
| Scope upload + AI read | ✅ EXISTS | `api/sol.js` (header fields + 4 totals). **No Xactimate/Symbility line-item parsing** — the AI reads totals, not line items |
| Scope revision history | ❌ NOT PRESERVED | first + latest survive; scope #2-of-4 unrecoverable; no history table |
| Supplements (initial + backend) | ⚠️ SPLIT | two systems, no crosstalk (CR-AUD-005). Theo's three-filings model is on file, unbuilt |
| PWI expense ledger (Unincurred→Incurred→Billed→Paid) | ❌ ABSENT | `pwi` exists only as a `collections.type` label (money IN, build 650) |
| Depreciation release workflow / COC | ❌ ABSENT | the *number* exists (payment kind "RCV (Depreciation Release)", chase aging); no request/received state, no COC doc type |
| Final carrier-facing invoice | ❌ ABSENT | `createInvoiceFor()` is retail-shaped (contract-gated, claim-blind); Invoiced stage does nothing automatic |
| Spec's proposed pipeline stages | 🚫 MUST NOT BUILD AS STAGES | `normStage()` whitelist silently coerces unknown stages to `Lead` — adopting the spec's stage names would corrupt every job. Insurance sub-status belongs in the claim tables, where it already lives |

**Gap features, sized (each needs Theo's shape before building — his own recorded instruction):** adjuster-meeting appointment kind + push (small) · scope history table (small-medium) · supplement unification per the three-filings model (medium — the prerequisite for everything below) · PWI expense ledger (medium) · COC doc type + depreciation-release states (medium) · carrier-facing final invoice fed by `claim_money` (medium).

## Insurance workflow test matrix

| # | Case | Today's expected result |
|---|---|---|
| T1 | Upload scope PDF ≤3.1 MB → review modal → apply | PASS — fields land in checklist + claim; `first_scope_*` set once |
| T2 | Upload scope >3.1 MB | PASS (storage URL path, build 643) |
| T3 | Second scope on same claim | PARTIAL — `approved_*` updates, lift computes; **scope #1's detail and #2's identity are gone** (no history) |
| T4 | Schedule adjuster meeting w/ push reminder | GAP — no adjuster appointment kind |
| T5 | File supplement from profile card → check claims screen | **FAIL by design split** — claims screen shows nothing (CR-AUD-005) |
| T6 | File supplement from claims screen → check rail/owed | **FAIL by design split** — rail/owed unmoved |
| T7 | Supplement filed at Scheduled stage → rail bucket | FAIL — bucket stage-gated (CR-AUD-017) |
| T8 | OnHold insurance job → rail | FAIL — silently dropped from buckets, money still in tiles (CR-AUD-006/014) |
| T9 | Log PWI check received | PASS (collections type `pwi`, commission auto-writes) |
| T10 | Track PWI *line item* Unincurred→Billed | GAP — no expense ledger |
| T11 | Record depreciation-release request/receipt | GAP — payment kind exists; workflow doesn't |
| T12 | Generate COC | GAP — no doc type |
| T13 | Final invoice matching insurance disbursement | GAP — retail invoice only |
| T14 | Coverage type / Ord&Law display on claim-linked project | **FAIL live** (CR-AUD-009) |
| T15 | Convert AI estimate to contract | **FAIL** — 404 endpoint (CR-AUD-001) |

## Disputes resolved in verification (recorded so the corrections stick)

1. *"Truth-hub cards are alive"* (dimension d) vs *"overwritten by the rail"* (dimension b): **b was right** — `render()` writes `host.innerHTML` with markup containing no cards (verified byte-level). d saw live dispatchers and inferred live buttons — the class-15 shape.
2. *"`cr-ih-styles` is dead weight"* (dimension e) vs *"load-bearing"* (dimension d): **d was right** — all 10 class tokens style the live hub markup. Only the script stub is deletable.
3. *"`claim_upgrades` plausibly dead"* (dimension d): **not droppable** — the `claim_money` view sums it (server-side reference invisible to a client-code grep).

## Non-findings (checked, clean — do not re-flag)

Commission "owed" definition identical in all three implementations (tab / CardinalPay / weekly digest). Stage rendering: no stale copies anywhere. Tile/list count pairs share sources except estimates (CR-AUD-013). Zero repeat-attach listener leaks (137 sites swept). Zero orphaned stylesheets (119 blocks). All 8 forever-intervals guarded. The 649 `db.list` html-exclusion holds; no other list path pulls document payloads. `data-act="sharedead"` is the release fence working as designed. The `data-go` ROUTES resolver is the model dispatcher, not a defect.

---
*Findings CSV: `CR_AUDIT_2026-08.csv` beside this file. Recount script: `scripts/audit_recount.py` — run it before quoting any number here at a later build.*
