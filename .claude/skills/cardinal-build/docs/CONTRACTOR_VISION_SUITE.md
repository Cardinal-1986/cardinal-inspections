# Contractor Vision Suite — audit & build plan

*Written 2 Aug 2026 against build 572 (`fb9257a`). Produced by a 14-agent audit pass over
`index.html`, all 25 `/api` functions, every `companycam_*.sql`, the doc set, and the **live**
Supabase schema (project `yipslubcptjoarblzbpl` — counts below are measured, not inferred).
Line numbers cited at builds 557–572; they drift every build — grep the block id, not the number.*

The "Contractor Vision Suite" pitch describes: (1) CompanyCam bulk indexing, (2) GPS/EXIF address
clustering, (3) auto phase + material tagging, (4) aligned before/after split slider, (5) 4K
super-resolution, (6) auto defect detection with drawn annotations + severity, (7) guided
inspection templates → branded PDF → client sign-off, (8) Hall of Shame comparisons, (9) tablet
presentation mode with a client privacy toggle — with heavy compute on the DGX Spark.

---

## The one-paragraph verdict

**Roughly half the suite already exists in the app.** The bulk CompanyCam index (60,485 photos,
FTS by address/job/crew), per-job photo grouping, AI sort/caption/severity/trade on report photos,
the manual annotation editor, the 12-slot guided shot list, the branded 10-section report with
print-to-PDF and client sign-off — all shipped, builds 211–557. The genuinely absent half
(slider, presentation mode, privacy toggle, Hall of Shame, phase tagging, auto defect detection,
super-resolution) is fenced less by engineering than by **settled decisions that belong to Theo**:
coordinates deliberately excluded from the mirror at three written sites, customer photos never
sent to third-party AI without an explicit yes, AI-altered photos as an insurance
altered-evidence problem, and the DGX Spark never wired into the app as a live dependency
(`DGX_SPARK_ILLUSTRATIONS.md`). The suite does **not** need a new Tauri desktop app — the
app-side remainder fits the existing PWA, and the heavy-pixel work belongs on the Spark as an
**offline** pipeline whose reviewed output is uploaded through paths that already exist.

---

## Feature-by-feature map

| # | Vision feature | Status | Where it lives / what's actually missing |
|---|---|---|---|
| 1 | CompanyCam bulk indexing "~81k photos" | ✅ **BUILT** (473–506) | `companycam_index/projects/search/caption_sample.sql` (all applied) + `api/companycam-sync.js` + `api/companycam.js` + Library panel in `cr-lib-script`. **60,485 of 61,649** photos mirrored (1,164 skipped internal/inactive — reconciles exactly); 775 photo-bearing jobs of 1,437; FTS over caption+job name+address+creator, 32 ms. Metadata only, admin-only, **manual "Build index" press — no cron, no incremental mode** (confirmed by verify pass). The **~81k figure appears nowhere in the repo** — measured account size is 61,649 (31 Jul); `api/companycam-status.js` re-measures on demand. |
| 2 | GPS/EXIF address clustering | ✅ outcome **BUILT**, mechanism **fenced** | The deliverable — every photo grouped under its street address — already works via `project_id` + denormalized `project_address` on all 60,485 rows, zero AI, zero EXIF. The EXIF/GPS *mechanism* is absent AND deliberately excluded at three written sites (`companycam_index.sql:15-18`, `companycam-sync.js:11-14`, `companycam.js safePhoto()`): "a searchable index does not need the customer's latitude and longitude." Zero EXIF parsing anywhere; device uploads are canvas-recompressed, which strips EXIF at ingest. **Recommend: build on project_address, don't reopen the fence.** |
| 3 | Auto phase + material tagging | ⚠️ **PARTIAL** | Auto **trade** (roof/siding/windows/andersen/gutters/general) + **severity** (crit/warn/ok) + report section 3-8 exist via `api/sortphotos.js` — but report-scoped, ≤24 photos/press, signed-in gate (settled). Manual Before/After sections exist in the Photo Album (`cr-pae-script`, `project_photos.section`) — **196/196 real rows currently sit at 'Inspection'; nobody assigns phases.** No `phase` key in any prompt/whitelist (verify-pass confirmed); no "In-Progress" value anywhere; no corpus-scale tagging. Corpus AI = Theo-consent decision (see below). The `sample_captions` trial (one photo per job, 50-job target, results to `ai_description` only, discardable) is the established pattern for justifying any corpus spend. |
| 4 | Aligned before/after split slider | ❌ **ABSENT** | Zero prior art — all 52 "compare" hits are sort comparators/prose; the 5 "slider" hits are a window type ("Gliding (Slider)") and prose. Green-field UI build. Alignment *compute* (homography) is Spark-side, offline; the app only displays pre-aligned pairs. |
| 5 | 4K super-resolution | ❌ **ABSENT** + ⚠️ evidence rule | Nothing; the pipeline deliberately moves the other way (3 MB fetch cap, 5 MB analyze cap, client downscale). **Altered-evidence rule** (recorded in doc set): this app runs insurance claims — an AI-enhanced photo of a real roof reaching a claim/supplement/report is an evidence problem. If built at all: Spark-side, offline, presentation-only assets, never into claims or reports. |
| 6 | Auto defect detection, drawn annotations, severity | ⚠️ **HALF** | The *drawing* half exists: `cr-ped-script` (pen/arrow/circle/text, 6 colours), reachable from job photos, report photos and CompanyCam copies (482). The *detection* half is absent: no endpoint returns coordinates/boxes/hit-counts — `analyze.js` is 2-4 free-text sentences, `sortphotos` severity is whole-photo. Hail test-square method exists only as Library reference prose. Auto-annotating **claim** photos also hits the altered-evidence concern — Cardinal-standard answer is machine-*suggested*, human-confirmed. |
| 7 | Guided templates → branded PDF → sign-off | ✅ **MOSTLY BUILT** | QI_SHOTS 12-slot guided capture (chips tick, session resumes); 10-section branded roof report + General Exterior twin; AI sort/captions/section narratives; `@page` Letter print → real vector PDF (server-side `/api/pdf` deliberately unbuilt — settled, ask before building); share link + remote client signature (`share.js`/`clientsign.js`). Real gaps: **(a)** QI shots land in the gallery, not report slots — surfacing the shot list in the editor is an acknowledged open item ("reuse QI_SHOTS, never a second list; WHERE needs Theo"); **(b)** remote sign-off anchors `SIGN_RX` on "Client Acceptance" (estimates/work orders) — inspection templates say "Client Acknowledgment", so reports only sign in person; **(c)** production-unexercised: 5 report rows, all unsent, 0 signed. |
| 8 | Hall of Shame | ❌ **ABSENT** (photo form) | Nearest prior art: the Library's Do & Don't page (prose, polarity-carrying titles) and its preference for crew-annotated CompanyCam teaching photos. Stocking a photo gallery from CompanyCam/client photos collides with the Library scope fence — needs a Theo-sanctioned exception, same class as the build-471 `~~photos` exception. |
| 9 | Presentation mode + privacy toggle | ❌ **ABSENT** | `requestFullscreen`: 0 uses; no kiosk mode, no redaction anywhere — Photo Activity prints client names on every thumbnail. Server-side privacy idioms to copy exist (`internal:true` refused in list+fetch+sync; confidential adjusters; internal notes). Any new full-screen view must follow the 558–572 conventions (register in `hideAllViews()`, history restore case, z-60 under the left nav, width gated on `body.cr-lnav-on`, close by the lever matching how it's shown) and must **not** become the 14th writer of `document.body.style.overflow`. Related open privacy item: Cloudflare CDN still served 11/26 sampled photo objects anonymously after the bucket flip. |

**Verify-pass honesty note:** 8 of 59 gap claims got an adversarial "prove it's really absent"
pass (three came back *buried, not missing* — the index, address grouping, and tag/caption
pipelines — and are folded in above). The rest are consistent across 2–4 independent auditors but
were not individually refuted; treat any "absent" above as high-confidence, not proven, until the
build's own recon grep runs.

---

## Corrections to the vision pitch

1. **Scale:** 61,649 photos measured (31 Jul 2026), not ~81k. 60,485 usable + 1,164
   internal/inactive refused. Re-measure with `/api/companycam-status` before quoting capacity.
2. **Model names are a generation stale.** "Gemini 1.5 Pro" / "Claude 3.5 Sonnet" — the app's
   settled, measured ladder is `gemini-3.6-flash → gemini-3.5-flash` (1.2 s pause, retry on
   503/429) `→ gpt-4o-mini`, copy-pasted per route on purpose. New AI features ride that ladder.
3. **No new desktop app needed.** Tauri + React + SQLite would duplicate a working PWA + Postgres.
   Features 1, 2, 7 and half of 3 and 6 are already shipped inside `index.html`. The app-side
   remainder (4, 8, 9) fits the single-file architecture as one new module.
4. **The Spark never becomes a live dependency** — settled in `DGX_SPARK_ILLUSTRATIONS.md`: a box
   in Dayton behind a tunnel cannot be a runtime dependency of a tool the crew opens from roofs.
   Offline generate/process → human review → upload through existing paths. That is *exactly the
   right shape* for OpenCV alignment and any upscaling: batch jobs producing reviewed assets.
   Bonus the pitch missed: on the Spark, **customer photos never leave the building** — which is
   what makes corpus-scale vision passes consentable at all.
5. **"$0/month" is roughly right for the app side.** The real costs are one-time decisions:
   a corpus AI pass (~60k Gemini vision calls if cloud; $0 marginal if Spark) and build time.
6. **Bulk pixel passes don't need the 3 MB one-at-a-time proxy** — the `sample_captions` action
   already fetches bytes server-side from mirror-stored CDN URLs, batched 6–8/call. That is the
   architecture any tagging/detection pass reuses. (Browser-bound bytes still go through the
   proxy — canvas taint.)

---

## Decisions that are Theo's — numbered, with recommendations

1. **Photo GPS coordinates** — reopen the no-coordinates fence?
   **Recommend NO.** Address grouping already works via `project_address`; the fence is written
   at three sites and buys real privacy. Nothing in the suite needs photo-level GPS.
2. **Corpus-scale AI tagging** (phase/material over 60k photos):
   **(a)** don't — tag lazily as photos get used · **(b)** cloud pass (Gemini) — needs your
   explicit yes, sends customer photos to a third party, ~60k calls · **(c)** Spark pass —
   photos stay in-house, $0 marginal, but you own the pipeline.
   **Recommend (c), trial-first** using the `sample_captions` pattern (50 jobs, discardable
   column, measured before committing).
3. **Hall of Shame sourcing** — a fence exception (like `~~photos` at 471) allowing *curated*
   CompanyCam/job photos as workmanship teaching pairs? Competitor bad-install photos are the
   easy half (not client property); our-standard pairs come from your own jobs.
4. **Photo enhancement** (super-res, auto-drawn annotations): allowed for **presentation-only**
   surfaces, never claims/reports/supplements? Recommend: presentation-only if at all, and
   machine-*suggested* + human-confirmed for annotations.
5. **Privacy toggle scope** — showroom mode hides client names/addresses (mask to "Project
   C-NNNN · City"). Also sharpens the open CDN-residue decision (purge/re-path/wait).
6. **Mirror auto-sync** — nightly cron so search stops going stale between manual presses?
   Needs a secret-header path on `companycam-sync.js` (admin-session gate blocks Vercel cron as
   written) and an incremental mode. Cheap, contained.
7. **Remote sign-off for inspection reports** — align the inspection templates' sign block with
   `SIGN_RX` ("Client Acceptance") so reports can be signed from the share link like estimates?

---

## Phased build plan (app side — each phase is shippable alone, one build at a time)

### Phase 1 — Showroom: presentation mode + split slider + privacy toggle
The kitchen-table deliverable, and it needs **no consent gates**. Interactive preview mock
already produced (2 Aug session — split slider, phase dock, privacy toggle, palettes: slate vs
cardinal; Theo's palette pick pending).

- New module pair `cr-show-styles`/`cr-show-script` (Crews-module conventions: `--crw-`-style
  literal-fallback tokens, `Object.assign` export, hideAllViews + history registration, z-60,
  `body.cr-lnav-on` width gating, no 14th scroll-lock writer).
- **Pairs are curated, not computed**: a `showcase_pairs` table (SQL ships first, RLS
  admin-write) holding before/after/build photo refs + title + score + trade chips. Sources:
  job photos (signed URLs, display-only) and CompanyCam photos via the existing admin proxy.
  Start with 5–10 hand-picked jobs — Theo picks winners; "top 1%" ranking automation is a later,
  optional Spark/AI pass.
- Slider is pure CSS/JS (clip-path + pointer events) over two `<img>`; aligned pairs arrive
  pre-warped from Phase 4 or hand-cropped until then.
- Privacy toggle: display-layer masking in the showroom module only (names/addresses →
  "Project C-NNNN · City"); server-side nothing changes.
- Cost: ~3–4 builds + one small SQL file.

### Phase 2 — Hall of Shame (needs decision 3)
Two-up cards (bad install vs Cardinal standard) inside the showroom module, stocked through the
Library's existing image-upload path (`ccFileBlob`) with polarity-carrying titles like the Do &
Don't page. Manual curation only — nothing files without Theo looking at it (the DGX doc's rule,
kept). Cost: ~2 builds once sourcing is decided.

### Phase 3 — Phase tagging (needs decision 2 for the auto half)
- Manual first, zero risk: surface the existing Before/After sections (Photo Album +
  `project_photos.section`) in the showroom picker so curating pairs assigns phases as a side
  effect.
- Auto later: add `phase` to the **pinned** vocabulary (`cr-sortvocab-script` +
  `api/sortphotos.js`, whitelist ships before writer, its own commit — the normStage lesson),
  values `before|progress|after`; corpus pass per decision 2, trial-first.

### Phase 4 — Spark offline pipeline (outside the app; no app changes to start)
Batch scripts on the DGX: pull pairs' bytes (CDN URLs from the mirror), OpenCV homography
alignment, optional Real-ESRGAN upscale (decision 4), optional defect-detection *suggestions*.
Output: aligned JPEG pairs reviewed by a human, uploaded through Phase 1's picker. Never a live
dependency; if it sleeps, the showroom just shows the pairs it already has. Detection outputs
(boxes/severity) land as **suggestions** in the editor for a human to accept — never auto-stamped
onto claim photos.

### Quick wins independent of the above
- **Decision 6** cron + incremental sync (1 API build).
- **Decision 7** SIGN_RX / "Client Acceptance" alignment for inspection reports (1 build).
- Shot-list surfacing in the report editor — already an open item; reuse `QI_SHOTS`, WHERE needs
  Theo.

### Not recommended / deferred
- EXIF/GPS clustering (decision 1 — redundant + fenced).
- Server-side PDF (settled: browser print-to-PDF is the answer unless unattended sending is
  needed).
- Live Spark wiring, image-content embeddings over 60k photos, any auto-enhancement touching
  claims.

---

## Constraints every phase must obey (compressed from the audit; full detail in the doc set)

One document pipeline (`inspection_reports` + title predicates); nothing new inside
`#reportFrame` (serializeFrame is a denylist); never mutate `estimates.photos` — signed URLs are
display-only; photo bytes for canvas work via `api/companycam.js`, never the CDN;
`internal:true` refused in every path, no way around the flag; CompanyCam originals never
written; vocabulary whitelists ship before writers; auth tiers settled (companycam admin-only,
sortphotos signed-in — don't re-litigate either direction); new full-screen views follow the
558–572 conventions and don't touch the scroll lock; literal `var()` fallbacks on every new
token; SQL as separate files, run **before** the index.html build; direct-surgery rules +
`check_build.py` green + app-stamp bump + CHANGELOG entry every build; Theo's eyes are the
visual gate.

*This file is a plan, not a record — when Phase 1 ships, give the feature its FEATURES.md row and
build-log line, and mark the phases here as they land.*
