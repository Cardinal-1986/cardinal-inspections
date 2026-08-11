# Cardinal Resource App — Open Items

*⚠️ **This file is layered, and each layer carries its own date.** The newest material — the live
queue and the two questions standing with Theo — is the **last section**, worked **10 Aug 2026 at
build 691**; the bundle-splitting verdict and the deferred `showroom.html` sit above it at build 627
(8 Aug). The decisions section was worked **5 Aug 2026**. The
long middle of the file was last worked at build **573** · 2 Aug 2026 and knows nothing of 574–627;
everything under "Illustrations in the Resource Library" and beyond is 467–557 era. Read the date on
the section you are in, not the top of the file. For anything not covered here, read the `CHANGELOG`
array in `index.html` — it is the only record that survives work done outside this folder. **Crews
(547–556) is now documented in `FEATURES.md`**, not only in CLAUDE.md.*

---

## ✅ OC Colors — the showroom. 3 decisions SETTLED BY THEO, 7 Aug 2026

*Answered directly by Theo. **Do not re-litigate any of these.***

| # | Question | **Theo's answer** |
|---|---|---|
| 1 | Is the colour wall admin-only, like the CompanyCam picker, or can sales see it? | **"Yes they can see colors."** All signed-in staff — Nick, Joey and Jacob included |
| 2 | Does the colour sheet carry pricing? | **"No pricing on sheets it's not a quote."** |
| 3 | Should the Duration card name IKO, whose equivalent strip is on the back of the shingle? | **"As far as competition goes, doesn't need to be here that's a whole separate thing."** |

**Decision 3 closes the one question 620 left open, and it makes an existing assertion permanent.**
`harness_colors.js` already refuses IKO, GAF, CertainTeed, Malarkey and TAMKO anywhere in the
rendered `#cr-occ` markup — written as a defensive default while the question was open. It is now
**the settled design**, not a placeholder: this screen sells Owens Corning on Owens Corning's own
documented claims, and a competitor's product is a claim Cardinal would have to defend with nothing
in the folder. No code changed, because the code was already right.

⚠️ **"A whole separate thing" is an observation, not a request.** Theo did not ask for a competitor
comparison surface and nobody should build one off that phrase. If it is ever wanted it is its own
feature with its own sourcing problem — and the sourcing is the hard part, not the screen.

**Decision 2 is a structural constraint, not a preference.** A colour sheet with a number on it
becomes a quote the moment it leaves the phone — it would need approval, an audit trail and the
`bidAmt()` chokepoint, and it would stop being something a rep can send from a driveway without
asking. Keeping money off it is what makes decision 1 safe. **The colour-sheet document type must
have no money fields at all**, not merely blank ones, and it stays out of the estimate/contract
document family.

**Decision 1 needed no code.** `oc_colors`, `oc_color_photos` and `oc_color_wall` already read for
`auth.role() = 'authenticated'`. The admin gate people will remember is on `api/companycam.js`
(`role === 'admin'`), and this feature routes around it entirely: Theo's own colour folders land in
the `photos` bucket under `oc-colors/`, which `photos_read` already opens to any signed-in user.
**Do not "fix" the CompanyCam gate for this** — it is a different pipeline with a different reason.

### Shipped 7 Aug (PR #145) — the data half

`oc_colors` 29 rows (20 current · 6 discontinued · 2 new for 2026 · 1 COTY) · `oc_color_photos`
(empty) · `oc_color_wall`. Spellings corrected to OC's own: **Sierra Gray**, **Chateau Green**.

⚠️ **Those 29-row counts are superseded — see the two sections below.** PR #148 added two missing
colours and corrected five statuses; the catalogue is now **31 colours · 30 on the wall · 20
sellable**. Kept as written so the history reads straight.

⚠️ **`hex_verified` is false on all 31 and must stay false until someone samples a real swatch.**
The hex values are approximations eyeballed for the preview mock. A photograph of a roof in
afternoon sun is not the product colour, so importing Theo's folders does NOT verify them. The
table comment says it: do not show a customer an unverified swatch and call it the colour.

The mock's per-colour photo counts were invented to make the preview look alive and are
deliberately absent from the schema rather than loaded as fact.

### ✅ Shipped 7 Aug — PR #148 (schema) and builds 615–620 / PR #149 (the wall)

**PR #148**, six migrations, all applied before merge: `slug` (generated) + `cover_image_path` +
`cover_credit`; `coty_year` with a one-winner-per-year index (2017–2026, no gaps); the two missing
colours (**Williamsburg Gray**, the 2024 COTY, and **Peppercorn**); five colours corrected from
`current` to `discontinued` on Theo's word; and **`hidden`**, which is *not* `status` — discontinued
colours keep their spot on the wall badged, `hidden` removes it. One row hidden: Shasta White.

**Build 615** enabled the Colors tile that had been sitting disabled in `visionHtml()` since 593 —
no new surface. Full detail in `FEATURES.md` and `cardinal_build_log.md`. **The upload UI struck
from this list: it shipped with 615**, `is_staff()`, writing to `oc-colors/<slug>/`.

`oc_color_covers_set.sql` then set `cover_image_path` on **23 of the 30 colours on the wall** — run
twice, the second time for Mountain Pine alone. **Zero sellable colours are on the hex-swatch
fallback**; the seven that are, are all discontinued, and that is the end state, not a backlog.
**The cover work is closed.**

### Still open

- ✅ ~~Oakridge and Supreme specifications~~ — **CLOSED at build 617.** Theo supplied the Supreme
  Product Data Sheet (10013324) and the Oakridge Brochure (10024153); both lines are live with
  sourced spec tables. ⚠️ **Oakridge's wind row is 110/130 and conditional** — 130 only with six
  nails and OC starter along eaves and rakes, per the brochure's own footnote. It renders as a
  caution and the harness asserts it. **Do not collapse it to one number.**
- ✅ ~~The `###` footnote behind "up to 160 MPH."~~ — **CLOSED at build 621.** Theo supplied the
  Owens Corning Sales notice (Sara Fagerman, Mid-South) on 7 Aug. It answered all three
  questions: it is a **warranty** figure, **effective 1 Aug 2026**, conditional on **at least
  four Total Protection Roofing System® components** (Hip & Ridge, OC Underlayment, Starter on
  **both** eaves and rakes, and either Ice & Water Barrier or Ventilation). Duration and FLEX
  ship **130/160** with the condition in a caution block; anything short of the spec is still
  130. All three predicted rendering defects were real and were fixed in the same build.
  ⚠️ **Two things this deliberately does NOT do, both still open if Theo wants them:**
  1. ✅ ~~It does not claim Cardinal installs the full system as standard.~~ **CLOSED at 622.**
     Theo, asked directly: **"Yes we do."** The Duration and FLEX note now leads with it. The
     130 fallback, the OC-grants-the-warranty attribution and the four named components are
     all harness-asserted — they are what keep the claim true and must not be trimmed.
  2. The source is a **sales notice, not the warranty document**. Revised documents were due on
     OwensCorning.com 3 Aug 2026 and the sandbox cannot reach that site. Swap both `source`
     strings when the published document is in hand.

- **The photos.** Theo's 28 hand-sorted iPad folders — *Cardinal's own roofs*, `oc_color_photos`,
  still **empty**. Distinct from the covers, which are Owens Corning's photography, and the reason
  the two render in visibly separate sections. Agreed to start with the top three or four sellers
  at 5–8 shots each rather than all 28 at once.
- ⚠️ **The README inside the cover-image zip names the wrong upload path** —
  `oc-colors/<slug>/cover.jpg`. The live convention is flat: **`oc-colors/covers/<slug>.jpg`**.
- **The colour sheet is NOT a new pipeline.** `api/share.js` already serves stored document HTML
  via an unguessable token (not a signed URL, so it does not expire in an hour like photo links do),
  `api/senddoc.js` emails it, and `@page{size:Letter}` appears 7× for print-to-PDF. A colour sheet
  is another document in that pipeline. **Do not build a PDF generator.**
- **Delivery already exists and is proven.** `ccDeliver()` in `cr-lib-script` (build 482) hands
  files to `navigator.share()`, so Messages/Mail/AirDrop already work for multiple photos, with an
  anchor-download fallback and `AbortError` correctly treated as the user's choice rather than a
  failure. Point it at a colour instead of a project. **A zip was considered and rejected** — there
  is no zip library in the app (`JSZip` 0 hits; the 18 `zip` matches are postcodes and one
  `zipper`), and a zip arrives as an attachment an iPhone client must fight with, where Web Share
  delivers real images inline.
- **OC's colour copy** — normal to use as an authorised dealer, but attribute it. The catalogue's
  descriptions are paraphrased, not lifted.

---

## ✅ CLOSED at build 596 — the detect vocabulary now covers the whole exterior

*Opened 5 Aug 2026, after PR #114. **Read the 5 Aug section of `HANDOFF.md` first** — it carries the
distillation finding this depends on.*

**The defect.** `walks_schema.sql:53` allows a walk trade of
`('roof','siding','windows','andersen','gutters','general')`. `index.html:57402` passes that trade to
`/api/detect`. **`DEFECTS` in `api/detect.js` is roof-only.** So every siding, window, gutter and
Andersen finding is coerced to `'other'` — **294 of 959 collected boxes, 30.7%**, the largest measured
leak in the label pipeline.

**Latent, not live** — `walks` and `walk_shots` are both **0 rows** as of 5 Aug. Nobody has run a walk
yet. It breaks the first time someone does.

**SHIPPED at build 596 (PR #116), same night.** Theo settled the method — *"using the clusters"* —
and the clusters answered it: **no seventh trade needed.** `DEFECTS` is now 33 keys, taken verbatim
and **in order** from `exterior_vocab.py` on the Spark, so `DEFECT_KEYS` is index-aligned with the
trained model's classes 0-32 and `other` stays at index 16. The prompt is neutral + trade-aware.
Verified in production on the first collection batch: **`raw_defect` is quiet** and exterior classes
arrive under their own names.

**If `raw_defect` ever starts appearing at volume again, that is a 34th class asking to exist** —
and unlike last time you will have the model's own word for it instead of recovering it from free
text.

**When the clusters land, the change is two sites:** `DEFECTS` in `api/detect.js` and `DEF_LABEL` at
`index.html:57117`. Defects and trades are separate vocabularies — the trade family
(`showcase_pairs`, `EST_TYPES`, `api/sortphotos.js`) only moves if a *trade* is added.

**Related, flagged, needs Theo:** the `/api/detect` prompt is roof-framed throughout — *"assisting a
roofing inspector"*, *"undamaged roofs exist"*, *"do not infer damage from the age or style of the
roof."* Widening `DEFECTS` will not fully help while the prompt still says roof. Changing it alters
live behaviour for reps.

**Do NOT re-open these three** — measured 5 Aug over 1274 photographs, `dropped` was **0 on every
one**, and every drop path in `cleanFindings()` increments that counter: the >12 truncation, the 0.5%
size floor, and the unplaceable-box path have **never fired**. Three of four proposed mechanisms were
wrong. Only the coercion was real.

## 🔴 Modal z-index vs the phone bottom bar — ONE fixed, five unaudited

*Build 597, 5 Aug 2026. **Test in the INSTALLED app, never a browser tab.***

`body.standalone #pwaNav{z-index:9990 !important}` — the 104px phone bottom bar. Any centred modal
with its buttons at the bottom edge and a **lower** z-index gets its footer covered, and it reads to
the user as "scrolling is broken" because there is nothing below to scroll to.

**The rule is scoped to `body.standalone`.** In a browser tab `#pwaNav` computes to **160**, every
modal wins, and the bug is invisible. That is why it survived: it cannot be seen on a desktop.

**Fixed at 597:** `#cr-show-form` 9610 → **9996** (clears `#pwaNav` 9990 and `.cd-crmbar` 9995, stays
under the `.cd-sheet`/`.pu-sheet` tier at 9997/9998 — the existing convention, not a new mechanism).

**NOT audited, all below 9990:**

| | z-index |
|---|---:|
| `#cr-ped` (photo editor) | 9600 |
| `#cr-sp-modal` (supplements) | 9570 |
| `#cr-epub-preview` | 9550 |
| `#cr-est-picker` | 9510 |
| `#cr-lil-editor` | 9410 |

Some are full-screen views where it cannot bite. **That is a guess — nobody has measured them.**
The harness exists: set `body.standalone`, force `#pwaNav` visible, scroll the box to its end, and
`document.elementFromPoint` at the footer button's centre. It returns `DIV#pwaNav` when the bug is
present and the button when it is not. Negative-control by flipping the z-index on the same page.

**Two companions worth checking at the same time**, because they made 597 a trap rather than an
annoyance: does the modal close on **backdrop click or Escape**, and is it registered in
**`hideAllViews()`**? `#cr-show-form` had neither — `closeForm()`'s own comment claimed an "escape
path" that was never wired.

## 🟠 The Studio and the Showcase do not connect

*Diagnosed 5 Aug 2026. Verified, not inferred: **`index.html` references `studio_photos` ZERO
times**, and `studio.html` performs zero writes.*

Two photo worlds, no bridge:

- **Cardinal Studio** browses `studio_photos` — the Spark's 60,503. Own subdomain, own sign-in,
  admin-only. Deliberately read-only ("browse, search, look"; retagging happens on the Spark).
- **The Showroom** presents `showcase_pairs`, and pairs are built **only** two ways: the upload form,
  or "From a job" (`promoteToPair`, which **copies** the bytes).

**So the 60k archive cannot feed the Showroom.** Spot the perfect before shot in Studio and there is
no button — you have to find that same photograph again through the job picker. Not deliberate; the
Showcase predates Studio (3 Aug) and nobody wired them.

**The hard part is already built.** `promoteToPair` copies rather than links, which is exactly what
the privacy boundary needs: `photos/studio/*` is admin-only and Showcase pairs are shown to
homeowners, so a studio photo must be **copied** into the showcase prefix, never referenced.

Preferred shape: **a third source, "From the archive", beside "Upload photos" and "From a job"** —
keeps one screen owning pair-building and lets Studio stay honestly read-only.

**Do it AFTER the push finishes and together with the grid-transform fix.** Building a picker on a
half-loaded table with 20 MB-per-page thumbnails means judging it twice.

## 📌 v4's corpus — the filter decision, recorded so the number can be read

*Settled 5 Aug 2026, after v4 was killed at epoch 25 to avoid training on a mismatched corpus.*

**The question:** v3's 615 boxes were filtered by `build_clean_labels.py` at `conf >= 0.5`, with `other`
dropped and window-caulk `flashing_failed` dropped. B's 664 boxes were appended **unfiltered**. A
v3→v4 change would then be *more data* or *looser data*, with no way to tell which — the same
ambiguity `via` was captured to prevent, one layer down at label-assembly instead of collection.

**Measured, not assumed:**

| | |
|---|---|
| B boxes below `conf 0.5` | **0 (0.0%)** — the confidence half of the filter is a no-op |
| B boxes that are `other` | **28 (4.2%)** — the only real asymmetry |
| B after the v3-equivalent filter | **~617**, against v3's **615** |

**Decision: apply the v3 filter to B**, so the two halves match. Volume-matched at ~617 vs 615 means
any v3→v4 difference is attributable to **which photographs** (storm-scored, native rare-class
labels) rather than to how many boxes or how loose the bar was.

**The one deliberate deviation is the 28 dropped `other` boxes.** v3 dropped `other` too — they were
recovered separately into real exterior classes rather than trained as `other` — so this is
consistency, not loss.

`append_b_labels.py` applies the filter by default and logs every skip counter, and the `MARKER` in
`yolo_labels.txt` still delimits B's section, so the corpus can be trained with and without B
without re-deriving anything.

**When v4's numbers land, write them down beside this.** And remember `box.maps` is per-class
mAP50-95 despite the name, five classes had zero val instances before the split was stratified, and
the per-class mean must reconcile against the reported aggregate — three tables were wrong before
those guards existed.

## 🟠 Cardinal Studio — the grid downloads ~50× the bytes it displays

*Found 5 Aug 2026 while the first real push was running. **Invisible at 120 rows, obvious at
60,503** — which is why the push had to run before anything was built.*

`signBatch()` in `studio.html` calls `createSignedUrls` with **no transform**, `PAGE = 60`, and the
cards are `minmax(190px, 1fr)`. The stored browsing copy averages **341 KB**.

**So every page load pulls 60 × 341 KB ≈ 20.5 MB to render sixty 190-pixel thumbnails**, on every
scroll, on a phone.

- **Do NOT change the push.** 1400px is correct for the detail view — the stored size is right. It is
  the *grid's request* that is wrong.
- Supabase Storage on **Pro** (confirmed: this org is Pro) does transform-on-read. The fix is a
  transform option on the signing call **in the grid path only**, full size when a photo is opened.
- Small, well-understood, and better made against the full archive than guessed at now.

## 🟡 studio_findings.sql is in the repo and NOT applied

`studio_findings.sql` shipped at PR #119 — the join that lets the Studio search for damage rather
than only composition. **Theo runs it in Supabase; it has never been executed.** It must run before
any ingest that fills it.

Why it exists: `studio_photos.tags` comes from `studio_tagger.py`, which has **no vision model** —
`aerial`, `roof`, `siding`, `close-up`, `wide`. The damage labels live in `findings.jsonl` on the
Spark and never reach the table, so the Studio can find *"aerial shots of siding"* and cannot find
*"hail damage"*. `damage_tags` is denormalised into the same `text[]` + GIN shape the page already
filters on, so it needs **no front-end change**.

**Storage projection, measured 5 Aug:** the browsing copies land at ~341 KB each, so the full
archive is **~20.1 GB** — into a 100 GB Pro allowance. Not a blocker; worth knowing before a second
corpus is ever added.

## 🟡 The Spark corpus is not in production

`studio_photos` is **0 rows** as of 5 Aug — the 60,503 tagged photos are on the Spark and have not
been pushed. The Studio browser has nothing in it. Not a bug; the push has not run.

Also still open from 2 Aug and unchanged: **`studio_photos` has no bounding-box column** and
`spark/push_studio_tags.py` never sends one, while Theo's stated output shape is labels + **boxes** +
confidence. Fine for search, not enough for the annotation half of decision 4. Schema **and** ingest
change — cheaper before a 60k pass than after.

## ✅ Contractor Vision Suite — all 7 decisions SETTLED BY THEO, 5 Aug 2026

*Answered directly by Theo. **Do not re-litigate any of these.** The questions come from
`CONTRACTOR_VISION_SUITE.md` on `claude/contractor-vision-suite-bwq21i` (PR #98) — recorded here
because `OPEN_ITEMS.md` is where settled decisions live. **That branch has since MERGED** (PR #106,
build 593), and a parallel session shipped much of the storage half against these answers the same
night — see the build-state note under decision 2 before planning any of this work.*

| # | Question | **Theo's answer** | vs. the recommendation |
|---|---|---|---|
| 1 | Reopen the photo-GPS fence? | **YES, but ADMIN-GATED IN-APP ONLY** — never public; SEO uses city/area | ⚠️ **OVERRIDES** the recommended NO, narrowly |
| 2 | Corpus-scale AI tagging | **(c) Spark pass** — already largely DONE with **YOLO**; output is **labels + boxes + confidence** | matches, and overtaken by events |
| 3 | Hall of Shame sourcing | **Allow the exception** | (none offered — his call) |
| 4 | Photo enhancement | **"I would never alter insurance photos"** | matches |
| 5 | Privacy toggle scope | **No client names on the front end. The photo organizer is his eyes only and needs no masking** | (none offered — his call) |
| 6 | Mirror auto-sync cron | **Wait** | deferred |
| 7 | Remote sign-off for reports | **Yes — can be signed with a link** | matches |

### 1 — the GPS fence reopens, and this reverses a written constraint

The no-coordinates fence is written at **three sites** (`companycam_index.sql:15-18`,
`companycam-sync.js:11-14`, `companycam.js safePhoto()`) and every one says a searchable index does
not need the customer's latitude and longitude. **Theo has decided to reopen it for website/SEO use,
gated by permissions.** That is his call and it is now the standing position.

**"With permissions" was pinned down the same day, and it is narrower than it first sounds:**

> **ADMIN-GATED IN THE APP ONLY.** Coordinates may be stored and shown to Theo and Joan inside the
> app — organising, mapping, clustering jobs. **Nothing carrying a lat/long ever reaches a public
> page.** SEO uses the job's **city/area**, not photo coordinates.

So the *public* half of the original fence still stands. What changes is that the index may now
**carry** coordinates for admin use, where before it refused to store them at all.

**Implementation notes for whoever builds this:**
- The three fence sites (`companycam_index.sql:15-18`, `companycam-sync.js:11-14`,
  `companycam.js safePhoto()`) are **not simply deleted** — `safePhoto()` is the public-facing
  shaper and must keep stripping coordinates. The change is at *storage* and *admin read*, not at
  the public serializer.
- Same shape as the existing `internal:true` refusal, which is already enforced in list + fetch +
  sync. Copy that, do not invent a second mechanism.
- **A public page must never be able to ask for coordinates at all** — not gated, absent.

### 2 — already in flight, on Theo's own hardware

Theo: *"im in the process and tagged all photos almost with Yolo."*

**This overtakes the plan.** The doc proposed a trial-first Spark pass using the `sample_captions`
pattern to justify the spend. That justification is moot — the corpus is nearly tagged already,
**with YOLO, on the Spark, outside this repo.** YOLO appears nowhere in the codebase or the plan; it
is Theo's own pipeline.

**What this changes for the app side:** the work is no longer "run a tagging pass", it is **ingest
the tags Theo already has**.

**The output shape, confirmed by Theo 5 Aug: labels + bounding boxes + confidence, per photo.**

That is the full detection output, and it decides three things at once:
- **Search** takes the labels. **Confidence is load-bearing** — low-confidence tags must be held
  back or flagged for review, never surfaced as fact. This app runs insurance claims; a wrong
  confident-looking tag on a claim photo is worse than no tag.
- **Boxes** are exactly what the drawn-annotation half needs later (`cr-ped-script` already draws).
  Per decision 4 they arrive as **machine-suggested, human-confirmed** — never auto-stamped.
- The `phase` vocabulary (`before|progress|after`) still ships **in its own commit, before any
  writer** — the `normStage` whitelist lesson. Unrecognised values become `'Lead'`-equivalent
  silently, which is how this class corrupts data.

**⚠ Overtaken a second time — the table SHIPPED while this was being written.** A parallel session
merged `studio_photos.sql` at **PR #106 / build 593**, along with `spark/push_studio_tags.py`,
`spark/STUDIO_TAGGING.md` and `studio.html`. The warning that used to sit here — *don't design the
table from invented shapes* — was **honoured, not skipped**: it was built against a documented real
sample (`studio_tags.jsonl`, shape given in `spark/STUDIO_TAGGING.md`). What shipped:

```
id · source · spark_path · storage_path · tags text[] · confidence jsonb
project_address · project_name · captured_at · width · height · tagged_at · pushed_at
```

**But it carries labels and confidence only — there is NO bounding-box column, and
`push_studio_tags.py` never sends one.** Theo's stated output shape is labels + **boxes** +
confidence, so the boxes are dropped at ingest today. That is fine for search, which is all the
Studio browser needs. It is **not** fine for the annotation half of decision 4, which needs boxes to
offer machine-suggested / human-confirmed marks. **Adding them is a schema change AND an ingest
change — do not start the annotation work assuming the data is already there.** Confidence did
survive (`{tag: 0.0-1.0}`), so the load-bearing half above is intact.

### 4 — the altered-evidence rule is now Theo's own words

> **"I would never alter insurance photos."**

Enhancement and auto-annotation are **presentation surfaces only** — never claims, reports or
supplements. Annotations stay machine-*suggested*, human-confirmed.

### 5 — masking is a front-end concern only

Client names and addresses are hidden on **the front end** (anything a customer or the public sees).
The **photo organizer is Theo's own tool** — admin-only by construction — and deliberately needs no
masking or redaction. Do not spend effort privacy-proofing the organizer.

*(The separate CDN-residue item — 11 of 26 sampled photo objects still served anonymously after the
bucket flip — was bundled into this question in the plan doc but is NOT answered by it. It remains
open.)*

### 6 — no cron yet

Mirror auto-sync waits. Search stays manual-press. Do not build the secret-header path or the
incremental mode until he asks.

### 7 — reports get remote sign-off

Align the inspection templates' sign block with `SIGN_RX` ("Client Acceptance") so reports sign from
the share link exactly as estimates and work orders already do. Today inspection templates say
"Client Acknowledgment" — **one word apart**, which is the whole reason reports can only be signed in
person.

---

## 🔴 Open after builds 565–573 (2 Aug 2026)

### ✅ Closed this session — do not re-open

| | |
|---|---|
| Address-autocomplete retry storm (60fps, forever, every screen) | **565** |
| Estimates list returning 400 on every load | **566** |
| Two rAF repaint loops — CRM chip, landing greeting | **567** |
| The landing weather strip, still looping after 567 | **569** |
| The Estimates screen showing nothing despite 12 real rows | **568** |
| Crews / Pricing / Company Docs trapping you on the page | **570** |
| The estimate editor trapping you the same way | **571** |
| The back button walking past five full-screen overlays | **571** |
| Sales Floor / Coach / Production with no menu and a 640px column | **572** |
| Four modules hardcoded light in every theme | **573** |
| `estimates` editable by any signed-in user | **SQL, applied** |

### 🟠 `cr-bpa-script` — the fifth `--cr-*` module, deliberately left

Four of the five modules sharing the `--cr-*` palette were themed at 573. **`cr-bpa-script` was
not**, on purpose: it writes `M.style.background='#fff'` **inline**, and it has **no dark palette to
fall back on**. Stripping the inline white without first giving it the dark/`rb-light` token pair
would leave it with **no background at all**. Do the tokens first, then the inline write — same order
573 used for the other four. The dark palette is already designed and contrast-checked; copy it.

### 🟠 `--cr-muted-2` is below the contrast floor **in light mode, today**

`#a8a8a8` on `#fff` = **2.38:1** against a 4.5 floor. **Pre-existing — 573 did not introduce it**,
and 573 deliberately left the light side byte-identical rather than smuggle in a visible change Theo
had not asked for. The dark twin is 5.40:1. Fixing light is a real visible change to four screens and
wants its own build and Theo's eyes.

### 🔴 Admin Health reports four of its OWN bugs as infrastructure failures

Every one of these is the health check being wrong, not the database. Verified against the live
schema 2 Aug:

| It queries | Reality |
|---|---|
| `audit_events.created_at` | column is **`at`** |
| `audit_events.event_type` | column is **`type`** |
| `team_profiles.id` | **no `id` column** — the PK is `email`, so `checkTable`'s `.select('id')` 400s |
| `payments`, `supplements` | **the tables do not exist**, and are referenced **nowhere** in the app (0 hits) |

**Why the error message is useless:** `checkTable` uses `.select('id', { count:'exact', head:true })`.
A `head:true` response carries **no body**, so PostgREST's reason never reaches `r.error.message` —
which is why a missing *column* is reported as *"Query failed · Fix: Check RLS policies"*. Fix:
`select('*')` instead of `'id'`, and on error re-ask without `head` to get a real reason.

`payments` / `supplements` should come **out** of the `REQUIREMENTS` registry — nothing uses them, so
flagging them makes the whole screen cry wolf. 16 of the 18 registry tables do exist.

### ~~🟡 Production hub revamp — Theo asked, previews first~~ ✅ SHIPPED at 603

> *"Can we possible Revamp the productions page with a nav on the left and maybe reconstruct with
> added relevant info or have it to where its relevant with all productions related hub that also has
> all the punch outs that are new/remaining/closed?"*

**Done at build 603.** Five labelled options were previewed dark/light and phone/desktop as agreed;
Theo cut to 3 and 5, then picked **3 — the job dossier** ("Let's do 3 and wire it to actual client
also"). Shipped as master-detail with the punch buckets and a button through to the client profile.
See the 603 entry in `cardinal_build_log.md` and the Production row in `FEATURES.md`.

**One correction to what this entry claimed, worth keeping.** It said *"the statuses are already in
the data."* **They are not.** `punch_items.status` is binary — `open` | `done` — verified against the
live table. New / Remaining / Closed is **derived** (open and <7 days · open and older · done). It
still needed no migration, so the "wiring, not building" conclusion held, but for a different reason
than the one written here.

**And the screen is empty on the live database today, which is not a bug.** 20 projects — 15 Lead,
4 Prospect, 1 Invoiced — **zero in Approved / Scheduled / Completed**, so `activeJobs()` returns
`[]`. The one existing punch item sits on a **Prospect**, which is why 603 added the off-stage tail;
without it the new screen could not have reached a single real item. **Jobs have to be moved into
those three stages before the board has anything to show.** That is stage hygiene, not software.

### 🟡 Two left rails on the estimate builder — flagged at 560, never answered

On desktop the builder now carries both the app menu (238px) and its own document outline (224px).
Measured: 798px of form at 1280, 958 at 1440. Workable, but it is two rails and Theo has not said
whether he wants it.

### 🟡 572's widths were my pick, not his

`.cr-sf-wrap` and the coach's `.cr-k-app` went 640/760 → **940**; `.cr-pb-wrap` → **1180**. A board
earns width; prose does not — a 1200px measure reads worse than 640. One number each if he wants
different.

### ⛔ Blocked on Theo — Google Maps key

He set `GOOGLE_MAPS_API_KEY` in Vercel on 2 Aug. **I could not verify it** — `app.cardinalroster.com`
is blocked by this environment's egress policy. `/api/config` should report `"configured": true`.

If autocomplete still fails, 565 made the console legible (**one** warning per page load instead of
20,000). `ApiNotActivatedMapError` / `REQUEST_DENIED` almost always means the **legacy Places API**
is not enabled — the app uses `google.maps.places.Autocomplete`, the old widget, not
`PlaceAutocompleteElement`.

---


---

## 🟡 Illustrations in the Resource Library — researched at 534, NOT built, awaiting Theo

*Written 1 Aug 2026 at build 534. **Read this before re-researching any of it** — Theo's
explicit complaint was that a previous session "went in a circle and burned a lot of money by
guessing and it not being true." Every figure below was measured or fetched, and the one thing
that could not be verified is named as such.*

**What Theo wants:** diagrams AND illustrations, specifically **shaded technical illustrations**.
He raised using actual client photos, undecided.

### Settled facts — do not re-derive

- **The diagram engine works.** 33/33 render + 20/20 Chromium assertions on 533. Four forms,
  6 of 26 live entries already use one. It is not broken and never was.
- **There is no image generation in this app.** Both librarian models (`gemini-3.6-flash`,
  `gemini-3.5-flash`) are text-only; nothing in `api/` generates an image. The `MAX_IMAGE_BYTES`
  hits in `analyze.js` / `companycam.js` are image *input*.
- **Client photos already exist as a feature** — `~~photos` (build 471), real CompanyCam
  photographs, admin-only, model never receives photo data. Theo may simply not have seen it.
- **The storage half is already built.** `library` bucket + blob upload + signed URL +
  `library_items` row with `kind:'image'` — 5 call sites, `ccFileBlob()` is the pattern.
  A generated image needs **no new storage work**.
- **Cost is not a factor.** 20 entries lack a diagram; at ~$0.067/image that is **~$1.35 one
  time**, stored not regenerated.

### Vendor comparison — settled, do not re-litigate

| | Verdict |
|---|---|
| **Imagen 4** | ❌ **Deprecated, shutdown 17 Aug 2026.** Do not build on it. |
| **`gemini-3.1-flash-image`** (Nano Banana 2) | ✅ Recommended. Existing key, existing host, existing `askGemini()` ladder, ~$0.067/image. |
| **Recraft (direct or via fal)** | ❌ **Wrong tool for shaded technical.** Its advantages — SVG vector, brand style sets, text-in-image — all serve *flat* work. Its style catalogue has no technical/cutaway/schematic option, and **V4 dropped the `style` parameter entirely**. |
| **fal.ai** | ⚠️ Real merit as vendor insurance (Google just killed Imagen 4 with two weeks' notice) and Recraft V4 vector emits native SVG — but a 5th vendor and prepaid credits for ~$0.85 of savings. Revisit only if raster looks wrong beside the SVG diagrams. |

### ⛔ The one unverified thing — needs a key, cannot be closed from the sandbox

**The exact endpoint and response shape for Gemini image generation.** Sources conflict on
`:generateContent` vs a newer `/interactions` path.

An unauthenticated probe was attempted and **the negative control killed it**: a model that
cannot exist (`gemini-9.9-not-a-real-model`) returned the same 403, because auth is checked
*before* model resolution. **Those 403s prove nothing.** Without the control this would have
been reported as "all three image models confirmed" — which is precisely the failure mode Theo
is complaining about. Close it with a probe route (precedent: `api/companycam-status.js`).

Reachability from the build sandbox, measured: `generativelanguage.googleapis.com` **reachable**;
`fal.ai` and `api.openai.com` **blocked by the proxy**. Chromium bypasses the proxy entirely, so
`ai.google.dev` is unreachable by any local tool.

### 🔴 The real risk, and it is not the vendor

Generated technical illustration produces **confident, handsome, wrong detail** — layers in the
wrong order, impossible flashing, invented components. The crew uses this library to work on real
houses. Note the existing diagrams are structurally safe from this: the prompt requires a diagram
to *only restate what the prose already says*, and four data lines can be checked at a glance.
**A picture cannot be verified that way.**

If built, it must have: **(1)** Theo approves before it files — generate → preview → save or
discard; **(2)** prompted schematic, not photoreal; **(3)** illustrations sit *beside* diagrams,
never replacing one.

### ✅ ANSWERED — the DGX Spark is the recommended route, see `DGX_SPARK_ILLUSTRATIONS.md`

Theo confirmed the Spark is **up and running**, and that he has **Tailscale**. That settles it:
generate on the Spark, upload through the Library's existing image path. **No app changes, no
vendor, no key, and the unverified-endpoint blocker above stops mattering.**

Not for *serving* the app — a box in Dayton behind a tunnel is a single point of failure for a
field tool whose crew works at all hours, and the librarian's Gemini → OpenAI fallback has no
equivalent for a self-hosted box. But for *producing* illustrations it wins outright: unlimited
iteration at zero marginal cost, a LoRA for one consistent house style, and customer photos never
leaving the building.

Full setup written up in **`DGX_SPARK_ILLUSTRATIONS.md`** — Tailscale, ComfyUI on port 8188, the
`--listen 0.0.0.0` gotcha that silently breaks remote access, FLUX.1-dev, a prompt recipe, and
the standing rule that **generated illustrations must not carry labels** (text rendering is
unreliable; let the `~~stack`/`~~flow` diagrams carry the words, which are real text and already
accurate).

**Still true and still the reason to be careful:** a generated cutaway is an unverifiable claim
with a picture's authority. Nothing files without Theo looking at it. Do not automate the upload
step away without re-reading that section.

---

## 🔴 Data, not code — audited against the live database 31 July 2026

Read-only audit via the Supabase connector 31 July; the crews section below was added 1 Aug at build 557. **Two items need Theo — both are email addresses, and both carry the same do-not-guess rule.**

### Needs Theo: 5 of 10 active community partners have no `contact_email`

| Partner | Type | Jobs referencing | Contact name on file |
|---|---|---:|---|
| **Kitty Hawk Realty** | property manager | **1 — live** | yes |
| C.G. Egli Inc | general contractor | 0 | no |
| CityWide Development Corporation | nonprofit (prospective) | 0 | yes |
| County Corp | nonprofit (prospective) | 0 | yes |
| James Construction | general contractor | 0 | no |

**Kitty Hawk is the one that matters** — it has a live job, and community bids go to the *funding
partner*, not the homeowner. Sending that bid means typing the address by hand.

**Do NOT guess these.** CLAUDE.md is explicit: *"Never write an unverified email address into
`community_partners`. A bid sent to a guessed address is a lost bid. Ask."* Ask Theo, then write.

### Needs Theo: 10 of 11 crews have no `contact_email` — added 1 Aug 2026, build 557

Same rule, different table. The crew Work Order (build 555) prefills its contact block from
`crews.contact_*` and **renders a visible blank when the address is absent** — it never invents
one. Nothing anywhere in the app writes a crew email; they arrive from Theo or not at all.

**✅ Supplied by Theo and written 1 Aug 2026 — do not re-ask:**

| Crew | Legal name | Trade | Email |
|---|---|---|---|
| Alberto Campuzano Rutledge | Betos Home Improvements | Roofing | `betoshomeimprovements@gmail.com` |

*(`contact_name` on that row was `"Alberto "` with a trailing space, which would have printed that
way on a work order. Trimmed in the same statement.)*

**Still blank — ask, then write:**

| Trade | Crew | Legal name |
|---|---|---|
| Roofing | Daniel Sarceno | Sarceno Construction |
| Roofing | Diego Hernandez | Morelos Construction |
| Roofing | Felipe | Advanced Construction |
| Siding | Jamie & Robin | Pineda Siding |
| Siding | Ronaldo | — |
| Windows | Cameron Deaton | — |
| Windows | DeShawn Vaughn | — |
| Windows | Robert W Deaton | Robert W Deaton |
| Gutters | Francisco Ramirez | Jiminez Gutters |
| General Repairs | Amanda Hoskins | — |

**Do NOT guess these**, and do not derive one from a legal name — `betoshomeimprovements@gmail.com`
happens to match "Betos Home Improvements", and that coincidence is exactly the trap. It was
correct because **Theo supplied it**, not because it was inferable. A work order sent to a guessed
address is a job the crew never hears about.

No app change is needed when one arrives — 555 reads the column live, so writing the row is the
whole task. `update public.crews set contact_email = … where id = …`, one row, verified by name
**and** trade before writing.

### ✅ Invariants that HOLD — do not re-audit without cause

- **`normStage()` whitelist:** 0 of 16 projects carry a stage outside the whitelist. The silent
  everything-becomes-`Lead` corruption this file warns about **is not happening**.
- **`checklist` JSON:** 0 of 16 unparseable.
- **Partner emails already on file:** 0 malformed. Nothing guessed or typo'd has been written.

### ❌ A false positive I nearly filed, recorded so nobody re-files it

The community bid path pre-fills the recipient with `pr.email` — the *project's* address, which on
a community job is the homeowner, i.e. the one party that must never receive the bid. That reads
like a real trap.

**It cannot currently fire: 0 of 10 community jobs have a project email**, so the prompt opens
blank. The code also names the partner and says *"No contact email on file for X — add one under
Partners."* Working as designed. If project emails ever start being filled in on community jobs,
re-check this — it becomes live the moment that count is non-zero.

### Minor: one project has no `stage_since`

**Alton** (Lead, created 17 Jul). One row of 16. Cosmetic unless something sorts on stage age.

*When something ships, strike it here and add a line to `cardinal_build_log.md`.*

### ✅ Shipped 31 July — struck from this list

- **513 — the community outcome form.** §1 below, struck. Four outcomes, no reason field,
  `tarped_at` displayed. Renders as a pane, so the scroll-lock writer count stays at 13.
- **514 — the second clock.** §2 below, struck.
- **515 — the Bill to card had lost its fill and its border.** Pre-existing; `#cr-cc .ct.bill`
  referenced `--goodbg`, a `#cr-ch2` token that does not exist in that scope, so the whole
  `background` declaration was invalid and dropped. Computed `background-image` was **`none`**.
- **516 — the desktop left menu.** Theo's pick: option 2 with option 4's content cap. It
  **mirrors the live `#navMenu`** rather than copying it — nine modules inject into that menu at
  runtime and `cr-menu-script` renames two of its sections — and clicking a row clicks the real
  `.navopt`, so there is one dispatcher. Sections collapsible, state remembered. Desktop ≥1100px.
- **517 — Theo's menu reorganisation.** Sales Floor leads Sell; Objection Coach hidden (it lives
  inside Sales Floor); ABC Supply into Admin; the duplicate Community Partners hidden. Health
  Check was already in Admin. **Open, and Theo's call:** whether ABC Supply should leave the reps'
  Sell section too, and where **Self Check** belongs — it has no section and buckets under *More*.
- **518 — the content cap was far too tight**, my own regression from 516. A flat 1180px left a
  narrow island on a 3440 ultrawide with 1011px dead each side. Now `min(2400px, 92%)`.
- **519 — the dashboard mini calendar removed** (`#calCard`), on Theo's word. Hidden, not deleted:
  `getElementById('calGrid').addEventListener` has no null guard and would throw at boot.

- **487 — list-view document contrast.** NOT the documents list: that surface keeps a white
  `--paper` table and measured 12.63:1, and the prescribed 'tokenise to var(--muted)' would have
  cut it to 6.69:1. The real failure was `#listMount` under `#listView` at >700px — 1.57:1.
  Full reasoning in `cardinal_build_log.md`; the wrong measurement is corrected in `HANDOFF.md`.
- **488 — the updates panel printed raw codes.** 20 CHANGELOG notes carried Python `\U`
  escapes, invalid in JavaScript. New class: `BUG_CLASSES.md` §11.
- **489 — the two unpicked contrast tokens, plus a third the audit missed.**
  `--rbe-empty-fg` 3.45:1→4.54:1 (light) and **4.05:1→4.82:1 (dark — not in the
  original audit, which was scoped to light theme only)**; `--rbe-adm-fg` 4.13:1→4.54:1.
  Dark `--rbe-adm-fg` measured 7.98:1 and was left alone. The dark repair reuses
  `--rbe-mute`'s existing `#9aa0a8` rather than inventing a shade.


> **Everything below was verified against the repo or the database on July 28, not carried
> forward from the previous list.** The prior version of this file listed four items as open
> that were already done — `punch_columns.sql`, the $10,000,000 test client, the repo junk,
> and the profile photos. Repeating a stale to-do list wastes more time than having none.
> **Check before you list.** The Supabase connector answers schema and data questions
> directly; the GitHub API answers "is this file still there."

---

## 0. AI Inspections — the live build queue (31 July 2026)

**486–489 are shipped. The work below is not.**

> **The items below are deliberately NOT numbered, and must not be renumbered again.** They carried build numbers twice this session (487–490, then 489–492) and both were invalidated within hours, because a build number is assigned at **ship time in ship order** — a plan cannot reserve one. Every unplanned fix silently falsified the queue and every cross-reference to it. **Name the work; let the number be whatever it gets when it ships.**

The plan below came out of a 37-agent read-only audit whose findings were each adversarially
refuted. Do not re-audit these surfaces; do re-measure any number before quoting it.

### ⚠ A correction I owe, recorded so nobody repeats it

I told Theo *"a template is a section list plus a trade map — data, not code, so General ships
alongside Roof at no real cost."* **That is false in this app.** There is exactly **one** inspection
report template: `var REPORT_TEMPLATE` (index.html:7508, backtick literal, ~163 KB, closes 7939),
roof-specific, sections 1–10. `GENERAL_TEMPLATE` (8448) is `buildEstimate('REPAIR ESTIMATE', …)` —
a **repair estimate**, not an inspection report. `#gcModal`, the General Checklist, has **zero** file
inputs. Verified, not inferred.

**A General Exterior inspection report is therefore its own build**, comparable in size to the AI sort.

### ✅ SETTLED BY THEO, 31 July — do not re-litigate

**The General Exterior section list, confirmed verbatim.** Author the document to exactly these ten, in this order:

1. Inspection Overview & Property Facts
2. Summary of Findings
3. Exterior Elevations
4. Roof
5. Siding & Trim
6. Windows & Doors
7. Gutters & Drainage
8. Structure & Grounds
9. Recommendations
10. Limitations & Acknowledgment

It mirrors the roof report's shape on purpose — an adjuster recognises it. Theo's own words for why
this template matters: *"We do lots of exterior inspections."* It is also the template his archive
serves best: every trade qualifies, so nothing lands in the set-aside tray.

**The sort route is SIGNED-IN, not admin-only.** The two gates guard different things and are meant to
differ:

| Route | Gate | Why |
|---|---|---|
| `api/companycam.js` (486's picker) | **admin-only** | reaches all 1,437 jobs; can put the wrong client's house in a report that goes out by email and public link |
| the sort route | **signed in** | only ever sees photographs *already in this report*; never touches CompanyCam |

The point of the feature is to take the bottleneck off Theo and Joan, so the crew who shot the roof
can draft the report. RLS already limits Sales to work they created or are assigned. **Cap photos
per sort regardless of the gate** — that is what bounds spend, not the gate.

**Known and accepted:** signed-in means a rep's AI-drafted findings can reach a client without Theo
seeing them first. The confirm-before-send gate covers it — nothing sends until a human clears every
section — but that human is not necessarily Theo. He was told this plainly and chose signed-in.

### The AI sort (roof template only) — the next substantial build

- Copy the skeleton from **`api/organize.js`** — the only route already doing signed-in gate →
  Gemini vision → fence-strip → `JSON.parse` → validate → coerced capped scalars. Take
  `requireSession` **and its caller** (the helper is inert without it).
- **Fix three things while copying, do not carry them forward:** `organize.js:51` reads
  `process.env.GEMINI_API_KEY` **bare** (use `(… || '').trim()`, the majority idiom — a trailing
  newline in the Vercel var gives an opaque Google 400); `organize.js` has **no retry** (take
  `askGemini` from `librarian.js:48–65`, and **move the sleep** — it currently fires after the final
  failure too, burning 1200 ms of billed time); do not copy `librarian.js`'s `sources` sanitiser,
  which is **stranded inside a `catch` and never runs**.
- **⚠ Vocabulary is the biggest correctness risk.** `section` already has an **incompatible** prior
  art: `api/organize.js:8–14` defines sections as numeric **3–8** and **502s** outside that range.
  `severity` exists elsewhere as `crit`/`warn`/`ok`. `trade` overlaps `EST_TYPES` keys
  (index.html:16751). **A fourth vocabulary under a colliding name is the "new mechanism beside an
  existing one" failure.** Pin all three enums in one place and reuse `EST_TYPES` for `trade`.
- **⚠ Section 2 — feed the EXISTING button, do not add a second control.**
  `wireSummaryDraftButton` (17045) already owns that paragraph and mounts with
  `insertAdjacentElement('afterend', …)`. `serializeFrame` (17717) removes it by testing **a single
  node** while stripping the `data-wired` guard unconditionally — **a second `afterend` control
  removes the wrong one and compounds one copy per save/open cycle.** Also `EDITABLE_SELECTOR`
  contains `'[data-cardinal-summary-heading] + p'`, an adjacent-sibling combinator that only matches
  because `lockTemplate` runs before that button mounts; anything inserted afterend earlier silently
  kills contenteditable on that paragraph.
- Cover photo: reuse `.cover-photo` / `wireCoverPhoto` (17110); match its `change` handler exactly.
  The deterministic fallback (earliest wide exterior) is **pure JS**, not a second model call.
- **Unlisted `await` sites, worse than the known ones:** `processAssistPhoto` (17326) and
  `sendAssistNote` (17358) capture `frame.contentDocument` and write post-await with **no**
  revalidation, and `wireReanalyzeButtons`' handler (16985) closes over **elements**, invisible to a
  `contentDocument` grep. Use 486's `_rccGen` token.
- **O(n²):** `placePhotoInSection` re-runs `wirePhotoFrames` + `wireReanalyzeButtons` per photo. For a
  bulk sort, place all then wire once — and call `lockTemplate` once at the end if you do.
- CI note: `.github/workflows/check.yml` has **no `npm ci`**, so its "every API function parses" step
  is **syntax-only** — an undeclared dependency ships permanently dead. Diff every `import` against
  `api/package.json` by hand. Never write `module.exports` even in a comment; check.yml greps text.
- **Theo, unresolved:** whether the new route is signed-in or admin-only. Every CompanyCam-touching
  route is admin-only; every "caption the photo I just took" route is merely signed-in. Nothing in
  the repo settles it.
- Harness must assert `placed + setAside == submitted` — **a silent drop is the failure mode** — and
  that every enum the route can emit is in the client whitelist *before* the writer ships
  (`normStage` lesson).

### Shot lists · Save PDF — ⚠ BOTH ARE LARGELY ALREADY BUILT (checked 31 July)

**Prime doctrine, eighth time on this project.** Neither of these is the greenfield build the line
below implies. Read this before starting either.

**Save PDF is DONE.** `#printBtn` is already labelled **`Print / PDF`** and has been since before
the meaningful git history. It injects `#printFix` (`@page size:Letter`, the company footer,
break-inside rules), runs `compactForPrint()`, calls `frame.contentWindow.print()` and then
`restorePrintMarks()`. The browser's own Save-as-PDF destination turns that into a **real vector
PDF** — searchable, not rasterised. `FEATURES.md:141` recorded this the whole time:
*"Download sits beside Print / PDF … Files save as standalone `.html` — not true PDF; a real
`/api/pdf` endpoint is still unbuilt."*

  What is genuinely unbuilt is only the **server-side** `/api/pdf`, and per the note below that is
  justified **only if reports must go out unattended**. That is Theo's call, not an engineering one.
  **Do not build it without asking him.** The client-side story is finished.

**Shot lists mostly exist too.** `QI_SHOTS` (index.html:15297) is a working 12-entry list —
*Ground shots, Down the gutter line, Shingle layers at the edge, Current ventilation, Pipe boots &
penetrations, Chimney flashing, Wall flashing, Step flashing, Valleys, Gutters & downspouts, Decking
from attic, Damage close-ups*. `renderQiChips()` (15495) already renders it as chips that tick with
a ✓ and a running count as photographs are labelled, and clicking one sets the next shot.

  So this item is **not** "build a shot list". It is "surface the existing one somewhere else" —
  most plausibly the report editor, so an inspector can see what is still missing. **Where** is the
  open question and nothing in the repo settles it. Ask Theo before building. When it is built,
  reuse `QI_SHOTS`; do not mint a second list.


- Shot lists: **reuse `QI_SHOTS`, do not add a fifth list.** Duplication is the real risk.
- Save PDF: `downloadReport()` produces **`.html`, not PDF**. Print → Save as PDF already produces a
  proper vector PDF using the template's `@page` rules; any client-side PDF library would be
  **worse** (rasterised, unsearchable). It is a labelled one-tap route through the print path.
  A server-side `/api/pdf` is only justified if reports must go out **unattended** — Theo's call.

---

## 1. SQL

**Nothing pending.** `punch_columns.sql` was run — `punch_items.scheduled_at` (date) and
`punch_items.photos` (jsonb) both exist. Verified by querying `information_schema.columns`.

The Scheduled tab and the five-photo close are live but **untested against real data**:
there are 3 punch items total and none are scheduled. That is a coverage gap, not a bug.

---

## 2. Blocked on someone else (Theo's action, not code)

| Item | State | What unsticks it |
|---|---|---|
| **ABC Supply 401** | App registered, credentials + `ABC_ENV` in Vercel, `api/abc.js` reachable, but ABC's auth rejects the pair on **both** sandbox and production | Clean re-paste of both values using the portal's clipboard icons, redeploy (env changes only reach a **new** deployment). If it persists, email **apisupport@abcsupply.com** |
| **ABC account numbers** | Not entered | Ship-To and Bill-To from an invoice or myABCsupply (Branch # 106 already entered) |
| **OpenAI quota (429)** | Coach fallback down. Theo says he pays for ChatGPT — **verify that is API credit, not a ChatGPT subscription.** `api/coach.js` calls `api.openai.com/v1/chat/completions` with `OPENAI_API_KEY` and `gpt-4o-mini`; a ChatGPT Plus/Pro plan does **not** fund that. | Check credit at platform.openai.com → Billing, not chatgpt.com |
| **Resend sender domain** | Daily digest 403s | Verify `cardinalrenovations.net` DNS, then swap the from-address in `digest.js` |
| **Gemini key** | **Theo confirmed 31 Jul he is on paid Gemini billing — the "free tier 503s" note was stale and is retired.** Still worth confirming the key exposed in an old session was rotated. | The 503 retry ladder in `librarian.js` stays regardless (cheap insurance), but paid quota is what makes a bulk caption backfill viable at all |
| **GitHub PAT** | Pasted into chat in the 374–388 session | Revoke if not already done: GitHub → Settings → Developer settings → Personal access tokens |
| **Contract PDFs** | Roofing + gutter ready; siding and windows **missing** | `docs/` now exists in the repo. Siding/window masters were built July 20 in the *"Digital roofing contract formatting"* chat |
| **Supabase PITR** | Unconfirmed | Confirm point-in-time recovery is on |

### Done — do not re-list
- ~~`punch_columns.sql`~~ — run; both columns verified present
- ~~$10,000,000 test client~~ — deleted; zero rows match
- ~~Repo junk~~ — `api/api/`, `Index.html` (capital I), `cardinal_v389_index.html` and the five stale root docs are all gone
- ~~Profile photos: "everyone shows initials"~~ — 5 of 9 `team_profiles` rows have a photo
- ~~CI false positive~~ — the `module.exports` grep matched a comment in `api/invite.js`; comment reworded, CI green

---

## 3. Verify on device

- Menu → 🩺 **Self Check** on Retail, Claims, Community home, community client
- **Punch (361–368):** home strips per CRM, unified page filters, detail sheet, assignee + priority dropdowns, five-photo close, Scheduled tab
- **Back button (367):** Home → Leads → client → Punch, then Back four times
- **Scroll lock (364):** open a contract, leave via a banner item, confirm the next page scrolls
- **Community (359–364):** desktop width, folds, All bids, bid editing, partner colours
- **CompanyCam panel (479–482), all on the phone, in the installed app:**
  - the ask box is visible while the CompanyCam block is open, and "← Back to chat" returns to it
  - the ⤢ corner button expands a photo **without ticking it**
  - the ✏️ corner button opens the editor **without ticking it**; arrows and circles draw where the
    finger goes at the photo's real resolution
  - **"Save to device" must NOT look like a second "File selected"** — it is a bordered ghost, not
    solid red. This shipped wrong in 481 and was fixed in 482; it is the thing to eyeball first.
  - tick 3 → **⬇ Save to device** → the iOS share sheet offers Photos / Messages / AirDrop, and the
    ticks are **still set** afterwards
  - draw on one → **File it** → it appears in the chosen Library section titled `Marked up — …`
- **483/484, on the phone, in the installed app:**
  - **the library assistant's ask line must clear the home bar.** ⚠️ **No harness can settle this** —
    headless Chromium has no home indicator, so `env(safe-area-inset-bottom)` is 0 there. The gate
    proves the strip is reserved and content clears it, nothing more. **Theo's eyes only.**
  - press **Build index**: `Reading job names…` → `Matched 775 jobs — now the photos…` within
    seconds → the photo counter. Then search a street or "Habitat" **before** the photos finish.

---

## 4. Retail light theme — where it actually stands

**Covered and verified on device:** Estimates · All Leads & Jobs · Home · Photo Activity ·
Team + Production calendars · **client profile (389)** · **standalone Punch page (390)** ·
**Client Directory (391–392)** · **Production board (393)**.

**Audited and needs nothing** — this was four items on the old list and three of them were wrong:
- **Objection Coach** — built light from the start, its own tint palette. Never had a dark version.
- **Team Directory** (`#e8e6e1`) and **Client Portal** (`#f7f2e7`) — light by design.
- **Reports, Photos & Album, Photo album filter, Walkthrough, Cross-links, Pricing catalog, ABC Supply, NACHI content, Adjuster Directory, BPA** — declare no ground of their own, so they inherit `--bg` and already follow the theme. This is what build 386 bought.

**Genuinely remaining:**

| Surface | Ground | Note |
|---|---|---|
| Resource Library | `#14100e` | Own warm-dark palette |
| Self Check | `#12161c` | Diagnostic tool, low traffic |
| Estimate publish | `#3a3a3a` | Small surface |
| Bulk assign | `#4a6fa5` | Blue — likely a header bar, not a ground. Look before assuming. |

**Deliberately staying dark:** the **Photo editor** (`#101010`). You judge photos against it;
a light ground changes how they read. Same reasoning as the calendars.

**Not started and not planned:** Claims and Community. The toggle is retail-scoped.

---

## 5. Build queue (code, unblocked)

0. ~~**Does CompanyCam caption coverage make text search viable?**~~ **ANSWERED, 31 July — no.**
   The full sync indexed 60,485 photos and found **79 with a caption** (0.13%, flat across every
   year). 476 pivoted the search to job names instead: `project_id` is populated on all 60,485
   across 775 jobs, and that is what the photographs actually carry. **Do not re-open the caption
   search.**

   The Gemini follow-on is **still Theo's call and still not built.** 478 ships a **50-photo trial**
   button so he can read real captions before deciding. **Waiting on him to press it and report.**
   Do not run it over all 60,406 without an explicit yes — that sends customers' job photographs to
   a third party.

   **First trial run, 31 July — INVALID, and the reason is recorded so it is not repeated.** 53
   photos captioned, **all one job, one crew, two days** (see `BUG_CLASSES.md` §10). The captions
   were good; the sample was not. 485 rewrote it to one photo from each of 50 different jobs —
   verified at 50 photos / 50 jobs / 5 crews / Apr 2024–Jul 2026. **Waiting on Theo to press it
   again**, then I read the 49 fresh ones back. The old 53 are still in `ai_description` and can be
   binned on his word.

1. **Partner colour as a stored field.** Community partner colours are matched on name, so a new or renamed partner reads neutral. Verified: `partners` has no `color` column. Add one, set it in the Partners directory, have every surface read it. **This is the only open database item.**
2. **Distinguish "no clients" from "couldn't load."** Both render the same empty state, which is why a transient read failure looked like data loss.
3. **Real PDF export.** Downloads are standalone `.html`. A `/api/pdf` endpoint using the ReportLab toolchain that built the contract masters would give true `.pdf`.
4. **Siding + window contract masters** — the moment those PDFs are found; both need the same letter-split as roofing.
5. **ABC phase 2** once credentials work: response-shape tuning → "+ ABC Supply" inside the estimate editor → ordering → webhooks to the production board.
6. **Old landing markup** — never paints since 309, still in the file for its boot writers. Delete markup and writers together, carefully.
7. **Community activity filter** — enhancement, not a bug.
8. **Backfill for pre-331 typeless clients** — deliberately not done; a backfill has to guess.

---

## 6. Settled — don't re-litigate

- **Header title is 40px, solid `var(--hac)`** (373). Supersedes the fixed-34px decision from 322.
- **Client cards carry no cover photo** (370). `cover_image` still feeds the client profile header.
- **No auto-archive on estimates.** Accepted estimates stay in their lane.
- **No fourth community tab.** Bids / Partners / Clients are the three nouns of the work.
- **Bids are estimates** — same table, same pipeline.
- **One punch pipeline.** `CardinalPunch` is the only data layer.
- **`estimate_line_items` stays unscoped** — it's the shared price book.
- **Retail light theme is tokens, not an override layer.** `--rbe-*` in `:root` + `:root[data-theme="rb-light"]`. **Three sanctioned exceptions**, all where dark and light needed genuinely different designs rather than one design in two palettes: the **calendars** (387), the **brass Client Directory** (391) and the **Production board** (393). In each, the dark original is untouched byte-for-byte.
- **Semantic colours stay fixed in both themes** — milestone circles, status spines, urgency red, CRM badges, the lavender PO, photo captions.
- **The header chrome doesn't follow the page theme.** Dark chrome over a light page is intended.
- **Sales Floor: red is the objection, navy is your answer** (394). Colour carries meaning there; do not spend either colour on decoration.
- **Owens Corning** (Preferred Contractor) throughout, not GAF. TruDefinition Duration is Class 3; FLEX and STORM are Class 4; both qualify for the policy discount. Standard warranty 5-year workmanship; OC upgraded tiers 10-year / transferable.
- **Habitat for Humanity of Greater Dayton** — commercial partnership, logo use permitted.

---

# Added 29 July 2026

*Updated 29 July 2026 — session of 34 merged PRs, `origin/main @ 202e6f3`, app stamped build 427.*

## 1. ~~The outcome form~~ — ✅ SHIPPED at 513, do not re-open

**Built 31 July as builds 513–515**, exactly as `references/outcome_v2.html` draws it.
Full record in `FEATURES.md` §10 and `cardinal_build_log.md`. Everything below is kept
only because the *reasoning* is still worth having; none of it is outstanding.

**The one thing Theo still owes an answer on:** the check-back default. It shipped as
**1 yr preselected**, which is what the approved mock draws — a preselection on a segment
that is always on screen, not a silent default. One token to change if he wants 6 mo or 2 yr.

~~**Status:** design settled with Theo. Nothing shipped.~~ `OnHold` (PR #34) was the
foundation and 513 is what finally writes it.

Reference: `.claude/skills/cardinal-build/references/outcome_v2.html` — **Style 4 layout with Style 2's
flow**, which is what he picked ("4 with 2s flow"). *Path corrected 31 Jul; it previously cited a sandbox-only `/agent/workspace/` path no other program could open.*

### Four outcomes

1. **Awarded**
2. **Still waiting** ← *most common in practice; sits second deliberately*
3. **Referred onward**
4. **Not awarded**

### Decided, and non-negotiable

- **No reason field.** Theo, verbatim: *"Dont need the why we didn't get it."*
  A grant that did not fund this cycle is not a lost sale. PR #33 already
  suppressed the loss-reason prompt for community; do not reintroduce it here.
- **"Still waiting" writes stage `OnHold`** plus a `check_back_at` date.
- **Habitat for Humanity sorts first** in every partner list. They do most of
  Cardinal's community volume and appear in an annual joint TV commercial.

### ⚠ Design correction found during hand-off — read this first

My earlier plan was to add six new fields under `checklist.lead`, including
`awarded_amount`. **That was wrong, and would have created a duplicate.**

The app *already* stores bid amounts in `checklist.bid`:

```js
function bidOf(pr){
  try{
    var ck = window.parseCkAll ? window.parseCkAll(pr) : {};
    return ck.bid || null;
  }catch(e){ return null; }
}
```

`bid.submitted_amount` and `bid.awarded_amount` already exist, and there is
already UI that writes them — `promptForBid(pr, 'awarded')`, wired to
`[data-act="log-awd"]`, with a `.cr-bidstrip` display.

**So the outcome form must read and write `checklist.bid.awarded_amount`, not
invent `checklist.lead.awarded_amount`.** Writing a second field would silently
diverge from the bid strip already on screen.

Revised field list:

| Field | Location | New? |
|---|---|---|
| `awarded_amount` | `checklist.bid` | **exists — reuse** |
| `submitted_amount` | `checklist.bid` | **exists — reuse** |
| `funded_by` | `checklist.lead` | new |
| `referred_to` | `checklist.lead` | new |
| `tarped_at` | `checklist.lead` | new — `tarp` appears **0** times in the codebase today |
| `check_back_at` | `checklist.lead` | new — **0** occurrences today |
| `award_cycle` | `checklist.lead` | new |

Before building, grep for each remaining name. I found one collision by
checking; there may be others.

### Still open

**The check-back default — ✅ ANSWERED 31 July: 1 year.** Asked and confirmed by
Theo. The design's own chips are `3 mo · 6 mo · 1 yr · 2 yr`, so **1 yr is the
pre-selected chip** and the other three stay available per bid. Nothing else in
this item is open.

### Ground truth gathered 31 July — start here, do not re-derive it

**The reference is a visual comp, not markup.** `references/outcome_v2.html` is
204 KB and contains exactly three `data-` attributes, all theming. It shows the
agreed look; it cannot be lifted. This is a build-from-design, and estimating it
as "wire up the mockup" will be wrong.

**The four flows, read off the comp's own labels:**

| Outcome | Fields | Button |
|---|---|---|
| Awarded | Approved amount · Decided · Funded by | *Save outcome* |
| Still waiting | Check back in (chips) · Or pick a date · Grant / cycle we are waiting on | *Park it* |
| Referred onward | Now with · Handed on | *Save outcome* |
| Not awarded | Closed on | *Close it out* |

The comp annotates the waiting panel **"Stops the nagging."** — that is the
−713-day problem in three words, and the reason this item and §2 ship together.

**The functions to reuse, located and read:**

| What | Where | Note |
|---|---|---|
| `lead(pr)` | 43303 | `return (ck(pr) || {}).lead || {};` |
| `bidOf(pr)` | 29355 | reads `checklist.bid` |
| `saveBid(pr, next)` | 29361 | **`async`** — writes via `window.patchProjectCk(pr, {bid:b})`, re-renders the strip, audit-logs |
| `promptForBid(pr, kind)` | 29467 | already writes `submitted_amount` / `awarded_amount` |
| `wireActs(host, pr)` | ~29464 | wires `log-sub` / `log-awd` on `.cr-bidstrip` |
| `chDueBand(pr)` | 43419 | **216 chars** — the whole §2 fix is inside it and the Due column |

**There is no `saveLead`.** The five new `checklist.lead` fields need one, and it
should mirror `saveBid` exactly — same `patchProjectCk` path, same null-stripping,
same audit line — rather than a second write mechanism.

**Beware:** `saveBid` is declared `async function`. Any brace-matched extraction
that searches for `function saveBid(` starts *after* `async ` and yields code
whose `await` is a syntax error. That bit me twice today on other functions.

---

## 2. ~~The second clock~~ — ✅ SHIPPED at 514

`chDueIso(pr)` in `cr-ch2-script` returns `check_back_at` when the stage is `OnHold` and
one is set, else `bid_due_at`, and it feeds `chDueBand`, the deadline sort, the undated
partition and the All-bids Due column — plus the client page facts strip, which relabels
**Due → Check back**. Scoped, not blanket-replaced: the two `bid_due_at` reads inside
`st === 'Lead'` branches are untouched, because a Lead is never `OnHold`.

The reasoning below is kept for the record.

### ~~The second clock — a real bug, currently visible~~

This is the highest-value unshipped fix, and it is a consequence of item 1.

The Community hub has **one** notion of "when is this due", and it needs two.

```js
function chDueBand(pr){
  var dd = days(lead(pr).bid_due_at);      // <-- always the bid deadline
  if(dd == null) return 'No deadline set';
  if(dd < 0) return 'Overdue';
  ...
}
```

`bid_due_at` is *when our bid was due to the partner*. Once a bid is submitted
and waiting on a grant, that date is meaningless — and it goes on aging.

**A 2024 bid currently reads −713 days and sorts as most-urgent forever.**

The fix: when `normStage(pr.stage) === 'OnHold'`, both `chDueBand` and the Due
column must read **`check_back_at`**, not `bid_due_at`. `bid_due_at` is
referenced 8 times in the hub block — scope the change, do not blanket-replace.

This is coupled to item 1 because `check_back_at` does not exist until the
outcome form writes it. Ship them together, outcome form first.

---

## 3. Open bugs

### 3a. Buttons need 4–6 taps — *needs Theo, then a fix*

Theo reported this on his phone. My lead suspect is `#cr-pae-actionbar`: it is
`z-index: 9995`, `pointer-events: auto`, and `display: none` when inactive —
but the changelog for build 214 says this same bar previously blocked taps.

**What is needed:** ask Theo whether the dead taps are near the **top** or the
**bottom** of the screen. That single answer separates the action bar from a
sticky header overlay and saves a lot of guessing. Do not fix this blind.

### 3b. Unreadable text — ✅ RESOLVED BY INTERVENING WORK (re-measured 31 July)

**Both photographed failures now pass. Do not re-fix them.** Re-measured with
`scripts/contrast.py` against the values actually in the file:

| Was reported | Measured now |
|---|---:|
| mint *"Waiting on a decision"* body text — `--ccm-mute` `#9aa39e` on `--ccm-card` `#161918` | **6.83:1** |
| the same card in its `.now` state — `#d8cfc9` on `--ccm-nowfill` fallback `#321a1c` | **10.53:1** |
| `#galTitle` on the "navy" photo-album header | **16.77–17.08:1** |

**There is no navy.** Nothing paints a background behind `#galleryView` except
`body.claim-insurance #galleryView{background:var(--ct-bg,#FAF8F7)}` — near-white. PRs #35/#36
removed the whole-CRM navy backdrop on 29 July, and the `--ccm-*` palette rebuild (#27) replaced the
mint. The item was written before both.

*The tools it names, `contrast_sweep.js` and `resolve_tokens.js`, do not exist in this repo. Use
`scripts/contrast.py` for a pair and `scripts/token_pairs.py` for a sweep.*

---

### 3b-ORIGINAL (kept for provenance only — the finding above supersedes it)

Two contrast failures Theo photographed:

- The mint **"Waiting on a decision"** body text.
- **`#galTitle`** on the navy photo-album header.

Both are single-value fixes. `contrast_sweep.js` and `resolve_tokens.js` will
give you the resolved values and the WCAG ratios. Low risk, visible payoff.

### 3c. 221 blue rules still reachable from Community

Down from 250. The remainder breaks into three groups:

| Group | Count | Recommendation |
|---|---|---|
| Screens unreachable from Community in practice | ~95 | **Leave.** No user impact. |
| The global style block | 69 | **Leave for now.** Ungated — editing them changes Retail and Insurance too. Needs Theo's sign-off on a whole-app change. |
| The punch board, mostly cool greys | 28 | **Judgement call.** Cool greys read as "blue" in a screenshot but are near-neutral in place. Show Theo before touching. |

The blocker is real: those 69 are not community-scoped, so "fix the blue"
becomes "restyle the entire app". That is a product decision, not a patch.

---

## 4. The CDN cache residue — decision needed

The `photos` bucket is private and the origin enforces it, but Cloudflare had
already cached objects with `max-age=31536000` (one year). 11 of 26 sampled
objects still served anonymously *after* the flip.

Three options:

| Option | Effect | Cost |
|---|---|---|
| **Purge the Cloudflare cache** | Immediate; residue gone | Needs Cloudflare access — Theo has it, I do not |
| **Re-path the objects** | New keys, so cached URLs die | Touches 220 storage rows + 235 `projectphotos` rows; needs a migration |
| **Wait it out** | Residue expires within a year | Free; leaves old URLs live until then |

**My recommendation: purge.** It is one action, it is complete, and it costs
nothing. Re-pathing is a lot of risk for the same outcome.

Worth stating plainly: the exposure is limited to URLs someone already had.
Nothing new is being exposed. It is not urgent — but it is not closed either,
and it should not be quietly forgotten.

---

## 5. Blocked on Theo

| Item | What is needed | Why blocked |
|---|---|---|
| Partner bid emails | Real bid-submission addresses for **Habitat (937-965-7684)** and **Kitty Hawk (937-236-5447)** | I will not write an unverified address into `community_partners`. A bid sent to a guessed address is a lost bid. |
| The `photos_upload` policy | Keep, or drop and replace? | His commits are authored `theodorion1986@gmail.com`. Dropping the policy could silently kill *his own* photo upload if he signs in with that Gmail identity. Needs his call. |
| CDN residue | Purge / re-path / wait | §4 — needs Cloudflare access |
| Check-back default | 3mo / 6mo / 1yr / 2yr | §1 — I guessed 1 year |
| Tap dead-zone | Top or bottom of screen? | §3a |
| The 69 global blue rules | Restyle app-wide, or leave? | §3c — affects all three CRMs |

---

## 6. Structural work I would recommend

Not bugs. These are the things that would stop *classes* of bug. Detail in
`BUG_CLASSES.md`.

### 6a. A scroll-lock reconciler — **my top recommendation**

13 modules write one global `document.body.style.overflow`. All 15 lock sites
are balanced against 19 releases, so no module is *missing* a release — the
failure mode is an early return or a throw between lock and release, which is
exactly what PR #37 fixed.

This class has now bitten three times: build 214, PR #17, and PR #37.

A watchdog that clears the lock when no overlay is actually open would end it.
Its overlay list must be **derived from the code**, not guessed — that is why I
did not bolt it onto #37. Budget an hour for the derivation, twenty minutes for
the watchdog.

### 6b. `.maybeSingle()` where zero rows is legal

**Re-measured at 467: 43 `.single()`, and `.maybeSingle()` is now 4 — it was 0 when this was
written, so the migration has started.** `.single()` **throws** on zero rows.
Each one needs classifying: "must exist" stays, "may not exist yet" becomes
`.maybeSingle()`. Do it in small batches, not one sweep.

### 6c. Error handling on async click handlers

36 `async` onclick handlers; most have no `catch`. A rejected promise in a
click handler fails silently — the user taps, nothing happens, no error.
`ccDoAct` (PR #32) is the pattern to copy: `try` / `catch` / `alert` with the
real message.

### 6d. Consider whether this stays one file

**Re-measured at 467: 2.64 MB (2,772,640 bytes), 100 inline script blocks, 101 style
blocks**, no namespacing. Every count in this hand-off needed a lexer to be trustworthy.
That is a symptom, and it has not improved.

I am **not** recommending a rewrite — it works, it ships, and the patch
discipline holds it together. But if the app keeps growing, splitting the
community CRM into its own file with scoped CSS would remove most of the
verification burden. Worth discussing before the next large feature, not
during it.

---

# Added 31 July 2026 — builds 452–467

*`origin/main @ cc0b591`. Everything below was checked against the repo or the database in
this session, not carried forward.*

## Closed since this list was written — do not re-list

- ~~**Repo junk still shipping publicly**~~ — `api/index.html` (2.23 MB, a whole copy of the
  app at build 329), `IMG_1510.png` and `TeamCalendar_Watermark_Mock.png` are **deleted**.
  4.1 MB off the deployment; the tree went 12.56 MB → 8.42 MB. Root `librarian.js` went at 453.
  **`cardinal-landing.PNG` stays** — it looks like a duplicate but it is the live `onerror`
  fallback on the landing page.
- ~~**The library light/dark button**~~ — was one-way since it was added; fixed at 464. It also
  persists now, which it never did.
- ~~**Filed photographs were unusable**~~ — an uploaded image rendered as a row with a camera
  emoji that opened in a new browser tab. Fixed at 467: signed thumbnail in the list, opens in
  the existing zoom viewer.
- ~~**The doc set stopped at 427**~~ — `START_HERE.md`, `OPEN_ITEMS.md` and `FEATURES.md` are
  current at 467; `cardinal_build_log.md` has an entry per build for 452–467; `CLAUDE.md`
  covers 428–451.

## Still open, and honest about it

| Item | State | What unsticks it |
|---|---|---|
| **Library photographs** | The upload path works end to end as of 467, and the `library` bucket is empty | **Source material.** Every photo in the system was taken 21–30 July and **none are captioned** — there are no winter photographs to find. Send them through Ask / File, or import from CompanyCam |
| **CompanyCam import** | `COMPANYCAM_API_KEY` is set in Vercel. **The spec question is settled** — `references/companycam-api.md` now carries the read v1 `Photos → index` reference: `GET app.companycam.com/public_api/v1/photos`, cursor pagination, and server-side `start_date` / `end_date` / `tag_ids` / `project_ids` / `user_ids` filters | **Unblocked.** The probe ran against the live account 31 Jul: `description` **exists** (the caption problem is solved), the key works on **both** v1 and v2 so scopes are fine, and `uris` has **six** types — the three `_annotation` renditions are the crew's marked-up copies and are the better library figure. Left: `include`, the date format, `include_total` — **none block an importer**, dates can be filtered client-side on `captured_at`. No rate-limit headers come back, so be polite by construction |
| **`project_photos` has zero captions** | 236 rows, 216 with `storage_path`, **one** section | Independent of the library and getting worse weekly. `api/caption.js` already exists — worth checking whether it can be pointed at the backlog |
| **The librarian's diagram grammar, in the wild** | Shipped at 466 and gated hard, but the gates cannot prove the **model** uses it well — that needs a live API call the harness blocks | Ask it something with a natural shape after deploy and see whether the diagram matches the prose. A miss is a prompt line, not code |
| **The reported toggle "freeze"** | 464 fixed a one-way toggle. Blocking time measured at **30 ms**, and 95–183 ms at 6× CPU — no freeze reproduced | If it still stalls on the phone it is a **different bug**; needs to know which control and where |
| **Two theme controls on one screen** | A library page shows both the floating ◐ (library skin) and the 🌙 (whole app) | Theo's call which appears where. Flagged, not changed |

## Doc correction

`CLAUDE.md` said zero `project_photos` rows carry `path` or `storage_path`, and the lesson
built on it ("a photo-signing change shipped completely inert"). That was true when written —
**216 of 236 rows now have `storage_path`.** The lesson about testing against real data shapes
still stands; the specific number does not.

---

## 🟡 Light-theme contrast — 2 real failures, 2 false positives, computed 31 July

Arithmetic, not judgment (`scripts/contrast.py`). **Not shipped** — colour changes get previewed
and picked by Theo, per CLAUDE.md. These are ready to apply on a word.

### Real: 2 pairs below the 4.5:1 body-text floor

| Where | Now | Ratio | Proposed | Then |
|---|---|---:|---|---:|
| `.ljempty` / `.cre-empty` — empty-state text, `font:600 12.5px` | `#8a8a8a` on `#ffffff` | **3.45** | `#767676` | 4.54 |
| `.ljadm` — admin badge pill | `#8a6a4a` on `#f2e9e2` | **4.13** | `#826446` | 4.54 |

Both are the **minimum** darkening that clears the floor — same hue, 14% and 5% down. Neither is a
semantic colour, so neither is protected by the "semantic colours stay fixed" rule.

### False positives — do NOT re-file these

- **`--rbe-checkfg` on `--rbe-okbg` = 1.11.** Not a pair. `checkfg` sits on `--rbe-acc`
  (`.ljico .bdg`) and as a `::before` glyph on `.cbx:checked`; `--rbe-okbg` is paired with
  `--rbe-money`. Pairing them was **my** invention, not the app's.
- **Milestone pill, `#ffffff` on `#9a9a9a` = 2.81.** `--rbe-mpill-bg` is only the *fallback*:
  the rule is `background:var(--slc, var(--rbe-mpill-bg))`, and `--slc` is the per-stage colour set
  at runtime. **The real ground is not knowable statically** — this one needs the rendered page.

### Method notes, so this is repeatable

**Pair by name, never by cartesian product.** A first pass compared all 13 ink tokens against all
17 grounds and produced **8** "failures"; matching tokens to the grounds they actually meet cut
that to **4**, and reading the carrying selectors cut it to **2**.

**There are FOUR `rb-light` token blocks** (13 + 13 + 40 + 24 = 92 declarations across 115 selector
groups). A regex that stops at the first one finds a single token and concludes the light theme
barely exists. Build the effective map in **document order, last wins**. Same trap as `.acthead`.

**A recon regex of the form `([^\n{}]+)\{([^{}]*TOKEN[^{}]*)\}` will hang the file.** It did — 120s
timeout, exactly the backtracking CLAUDE.md warns about. Walk back from each hit to the nearest
`{` with `rfind` and bound the window instead.

---

## Settled decisions, imported from the Hyperagent session (filed 31 July)

Theo pulled these from the tool that built 428–467. **Every repo-checkable claim was
re-verified here before filing** — `OnHold` writers **0**, `check_back_at` / `funded_by` /
`referred_to` / `award_cycle` **0**, `tarped_at` **0**, `origin/main @ ec685f0`. All accurate.

### Do not revisit

- **Skill layout is canonical as of PR #41.** `retail_b` lives under `references/`; the root
  copies and the 1-byte `references/retail_b/spec.md` stub are deleted. **Do not restore them**,
  and mind the case trap — `spec.md` and `SPEC.md` are different files to git but collide on a
  case-insensitive disk.
- **Any bundled `app_map.md` saying "Community (Slate & Clay, light)" or calling `crm()` the
  single source of truth is stale.** Take the repo copy. Community is green `--ccm-*`, dark by
  default; `crmNow` recomputes and `skin()` publishes to `body.dataset.crm` — the attribute is the
  only thing CSS can gate on.

### Known broken / half-finished — deltas only

- ~~**The outcome form is still unbuilt end to end**, verified at 472.~~ **Built at 513–515,
  31 July.** All six field names were still at 0 occurrences when the build started, which is
  what let it use them without collision. `chDueBand` now reads `chDueIso()`.

  **⚠ The −713-day bid no longer exists.** Checked against the live database 31 Jul: of 10
  community jobs carrying the `bid_due_at` key, **9 hold an empty string** and exactly one holds a
  real date — `Jacob — Habitat for Humanity`, `2026-07-27`, **−4 days**. Sorting that most-urgent
  is correct behaviour, not the bug.

  **And the empty-string case degrades cleanly**, which the filed note did not say: `days('')`
  short-circuits on `if(!iso) return null`, so `chDueBand` returns **"No deadline set"** and those
  nine group there rather than landing in a bogus band. Nothing to fix in the banding today.

  Do not go hunting the −713 record. Either it was edited away since 29 July or it was never in
  this database. The *shape* of the concern — one field driving urgency, with no
  `check_back_at` — is still real and still waits on the outcome form.
- **§3c's blue count has drifted: 221 → 226 reachable, 5 gated.** New builds add blue faster than
  triage removes it. The three triage groups stand; only the number moved.
- ✅ **Broken pointer FIXED.** `/agent/workspace/outcome_v2.html` was a sandbox-only path no other
  program could open. The real design — **style 4 with style 2's flow, the one Theo picked** — now
  lives at **`.claude/skills/cardinal-build/references/outcome_v2.html`** (202 KB, 2,094 lines).
  That directory is in `.vercelignore`, so it is reachable by any program reading the repo and is
  **not** served publicly. Scanned before filing: no fetch/XHR/WebSocket, no Supabase reference, no
  key-shaped strings, one external host (Google Fonts).
- CHANGELOG's 343–427 gap was never backfilled. **Cosmetic only** since `data-cr-footer` landed —
  every stuck watermark is ≥406 so nobody is shown them. Backfill is optional, not owed.
- External, measured 29 Jul, decisions still pending: Cloudflare edge held **11 of 26** sampled
  photo objects after the bucket flip (max-age one year — purge / re-path / wait is Theo's call);
  the `photos_upload` policy question; real bid emails for **Habitat and Kitty Hawk** (the latter
  matches tonight's own database audit).

---

## 🟡 Palette accessibility — 104 declared pairs below 4.5:1 (measured, NOT shipped)

New tool: `scripts/token_pairs.py`. It scores only pairs **the app itself declares** — rules setting
a colour *and* a background in the same block — so there is no ancestry to guess at. That is the
case where static analysis is trustworthy; it is exactly what the 27-candidate sweep after 487 got
wrong by inferring grounds. `@media print` is excluded and `-webkit-text-fill-color` rules are
skipped rather than scored.

```bash
python3 .claude/skills/cardinal-build/scripts/token_pairs.py index.html
python3 .claude/skills/cardinal-build/scripts/token_pairs.py index.html --floor 3.0
```

**104 pairs below 4.5:1 · 27 below even the 3.0 large-text floor.**

### This is a palette decision, not a bug list — do not "fix" it in one build

The failures cluster, and the clusters are deliberate design:

| Cluster | Measured | Where |
|---|---:|---|
| Amber status pills, `#C87A00` on `#FBEFDA` | **2.96:1** | 7+ sites: claims, adjusters, kind-pills, pricing |
| Green status pills, `#2E7D32` on `#E7F2E7` | **4.46:1** | 7 sites: approved / completed / won / rcv |
| Faint grey empty states on near-white | 1.77–2.96:1 | `.clirow .mini`, `.wsempty`, `.cr-wo-empty`, `.cr-pal-hint`, `#navMenu .navsec`, `.axbtn.ghost` |
| Red action-bar button label, `#1a1a1a` on `#C4180F` | **2.89:1** | `.cr-cm-actionbar button` |
| Header search text, `#c8202e` on `#241c1a` | **2.95:1** | `#cr-hd2-bar #headSearch` |
| White on light teal, `#fff` on `#5eead4` | **1.48:1** | `#cr-sol .ft .go` |

The pill families are **semantic colours** — amber means awaiting, green means approved. CLAUDE.md
protects those, and the 31 July note is explicit that the two tokens fixed at 489 were fair game
*because* they were not semantic. Darkening amber and green across fourteen pills changes the
product's status vocabulary and is Theo's call, not an engineering one.

The **green cluster at 4.46:1 is 0.04 below the floor** — a rounding-level miss. Changing fourteen
pills for that is almost certainly not worth it.

**The empty-state cluster is the strongest candidate for a real build.** It is the same family as
489's `--rbe-empty-fg` (3.45→4.54) — faint grey on near-white, no semantic meaning, minimum
darkening fixes it. Six surfaces, all low-risk.

### Known false positives — do not re-file

- **`.cr-pp-item .box` at 1.00:1** (`#fff` on `#fff`). A checkbox: the colour is for a `::before`
  glyph that only renders when checked, at which point the background changes. Same shape as the
  `--rbe-checkfg` false positive already recorded above.
- **`body` at 1.15:1** (`#1b1b1b` on `#09090C`). The base declaration; every real surface overrides
  it. Not a rendered pairing.

**Nothing here is shipped.** The measurement is done and repeatable, so a future session should
**pick a cluster with Theo and ship that one**, not attempt the list.

---

## Left open by build 522 (the card raise)

1. ~~**The dark ground barely shows the raise.**~~ **He asked again — partly closed at build 546.**
   The note said "if he asks again, the audit is already done", and he did: leads went navy, the
   estimate page and `#reportsView` pipe cards went obsidian, and all three now carry a real hover
   lift. **Giving those cards a darker ground is exactly the move this item described**, taken with
   his instruction rather than unilaterally.
   **Still open for the rest of retail.** The client profile was NOT moved and the audit below still
   stands, unchanged: `.ackv div` and `.acxtrs label` carry `#2b2b2b`, `.axnote` `#5c4a42`,
   `.dbrow .dbgo` and `.dbic1` `#23507e` — every one needs a token before that ground moves, or the
   profile goes unreadable. 546 did not touch them.
   The original text, for the record: *on retail's near-black page the `rgba(0,0,0,.8)` drop shadow
   has nothing to cast onto, so the `#d9d9d9` bottom lip carries it alone. A white card cannot lift
   on black the way the dark home card does — home's lift is a light top edge over a darker body.*
2. **Radii were left alone.** Home is 12px; several raised cards are 6–10px. The blocker is `.acxsec`,
   whose first child `.acxhead` is a light strip with square corners — round the parent alone and the
   header pokes out. A radius pass means rounding both, per card. Small, separate build.
3. **Sales Floor and the production board got the raise** (`.cr-sf-today`, `.cr-sf-block`,
   `.cr-pb-job`), geometry only. They are deliberate designs with their own colour semantics and the
   Production board is one of the three sanctioned light-theme exceptions — **if Theo dislikes the
   lift there, remove those three selectors rather than retuning the block.**

---

## ✅ Bundle splitting / Vite — audited 8 Aug 2026, DO NOT RE-REPORT

An outside audit (Kimi, commissioned by Theo) recommended extracting the app into
ES modules and moving onto Vite — *"~1 week of focused work"*. Every claim was
checked against `index.html` at `ec4a406` (build 624). **The architecture
observation is fair; the numbers are not, and the headline recommendation is
aimed at the wrong target by roughly 8×.**

Recorded here because this is an obvious thing for any reader — human or model —
to propose on sight of a 3.6 MB single file, and re-deriving it costs a session.

### What was actually measured

| the audit said | measured |
|---|---|
| "~59,000 lines of inline JavaScript" | **46,009** of 60,934 total (10,063 CSS, 4,862 markup) |
| "3.5MB downloaded", "8–12s on 3G" | raw **3,645,784 B**, but **brotli q11 = 751,440 B (734 KB)**, gzip -9 = 1,097,486 B. Vercel compresses at the edge, so the wire cost is **~5× smaller than the premise** |
| Vite "splits heavy third-party deps into separate files"; "vendor chunks cache for months" | supabase-js, chart.js and papaparse are **already three separate CDN files** and already cache independently. **0** `type=module` scripts. That benefit exists today |
| Showroom is "~400KB"; extracting it alone "cuts your bundle by 30–40%" | `cr-show-script` + `cr-show-styles` = **162,539 B = 4.5%** of the file |
| "crews reverting to paper" | invented — nothing in the repo supports it |
| "8–12s → <1s on LTE" | swaps 3G for LTE mid-sentence |

⚠️ **Quote the raw and the compressed figure together, always.** Splitting them is
how the audit got to a 5× error. Same family as this repo's standing
bytes-vs-characters trap — `len(s)` on the decoded string gives **3,622,512**
where `wc -c` gives **3,645,784**, and a mid-analysis slip between the two happened
during this very audit.

### What the audit missed, and it inverts its own plan

The largest object in the file is a **single unnamed `<script>` of 976,673 bytes —
26.8% of the file on its own**, six times the Showcase it says to extract first.

```
  1. (no id, script)   976,673   26.8%      <- the shell: auth, router, nav, CRM core
  2. (no id, style)    198,709    5.5%
  3. cr-show-script    112,097    3.1%      <- the audit's "extract this first"
  4. cr-cl-script      102,940    2.8%         (the CHANGELOG)
  5. cr-lib-script      76,520    2.1%
  6. cr-estimates-script 47,530   1.3%
  top 12 blocks = 48.2%  ·  the other 212 = 40.5%  ·  median block 4,642 B
```

**That 977 KB block is the part that cannot be lazy-loaded.** Extract every named
module on the audit's list and the biggest single thing in the file still ships on
first paint. Nobody has audited what is inside it — if load time ever becomes a
real problem, that is the honest first question, not a bundler.

### The real finding, which the audit never mentions

**All three CDN scripts are render-blocking** — no `defer`, no `async` — and two
sit in `<head>`. Chart.js blocks parsing on every load of every screen and is
only needed for dashboard charts.

That is the change with a good ratio: no build step, no new files, existing gates
still apply. **It is not free** — deferring changes execution order, so every
parse-time reference to `supabase`, `Chart` and `Papa` must be found first and
sign-in verified in a real browser. Half a day, done properly. **Not yet done —
gated on a measurement (below).**

### The one thing the audit got right, and it deserves credit

**Shared mutable state, rated HIGH, with "fix this before you split anything."**
Verified: `window.currentProject` ×72, `window.currentUser` ×86,
`window.currentPhotos` ×19, and **379 bare `currentProject` references**. That is
genuine coupling and the audit found it honestly.

**Recorded as real but deliberately not chased.** It is not causing a known bug,
and refactoring 379 call sites on spec is churn on an app the crew uses daily.
If a state bug ever appears, start here.

### ✅ CLOSED — Theo, 8 Aug 2026: *"It does not feel slow."*

**That is the end of it.** The owner uses this app daily, on the phone and on an
ultrawide desktop, and reports no load problem. No further work was done and none
is planned. The audit was solving a hypothetical.

**The CDN-defer change was NOT made**, deliberately. It is a real inefficiency and
it stays available (see above) — but shipping a change to a working app that
nobody is complaining about is how regressions get introduced for nothing. **If
load time ever becomes an actual complaint, start there**, not with a bundler.

⚠️ **Do not reopen this on the strength of the file size alone.** That is exactly
what the audit did. A 3.6 MB single file *looks* alarming, compresses to ~750 KB,
and is reported as fine by the person using it.

**The sandbox cannot measure load time — confirmed twice.** The agent proxy
returns **403 to CONNECT** for `app.cardinalroster.com` *and* for the
`*.vercel.app` preview domain. Do not burn a turn retrying; ask Theo or read it
off a desktop browser's Network tab, where the transferred figure is the same.

**Do not open the Vite rewrite.** It trades a working gate ladder
(`check_build.py` parses 106 inline blocks individually, `patch_lib.py` does
exact-match surgery on one artifact, every harness slices blocks out by `id`,
CI asserts the VAPID key in hand-written `sw.js` matches `api/notify.js`) for a
re-architecture estimated at a week by an auditor who thought the file was 59,000
lines of JavaScript.
## 📌 A separate `showroom.html` — a REAL project, deliberately deferred

Theo, 8 Aug 2026, choosing between host-gating the CRM chrome and true
separation: **"Option 1 but remember option 3."** Build 625 shipped Option 1.
This is Option 3, recorded at his explicit request so it is not lost or
re-litigated from scratch.

**The idea:** a `showroom.html` carrying only the presentation surfaces — the
Vision hub, the Showcase, OC Colors, the Studio link — with **no CRM code at
all**. `showroom.cardinalroster.com` would serve it instead of `index.html`.

### For

- A customer-facing tablet **never downloads CRM code**. Build 625 hides the
  chrome; it does not remove it. There is no errant tap that shows a claim or a
  crew payment because the screens are not there.
- **Independent deploys.** A CRM change cannot break the sales tool the night
  before a pitch.
- **Here the load argument is genuinely strong** — and this is the distinction
  worth holding onto. The bundle-splitting audit (see above) was rejected because
  it targeted the 4.5% Showcase. This targets the **977 KB shell**, which is the
  actual mass and the part no lazy-load can defer.
- It matches what Theo already said about Studio: *"if it was back to the
  beginning this would have been a completely separate app."*

### Against — and this is what makes it days, not hours

- **The Showcase (162 KB) and Colors (~60 KB) live inside `index.html`.** Two
  routes, both costly:
  - **Duplicate them** → two copies, every future fix landing twice. This
    violates "one pipeline per concept", the rule that exists *because* four
    features on this project were built twice and lost. **Do not take this
    route.**
  - **Extract them to shared files** → breaks `check_build.py` (it parses inline
    blocks individually), `patch_lib.py`'s exact-match surgery, and every harness
    that slices a module out by `id`. The gate ladder would need rebuilding first.
- Auth gets a third implementation (`index.html`, `studio.html`, and this).
- `sw.js`, push/VAPID and the offline shell all assume one document; CI asserts
  the VAPID key matches `api/notify.js`.

**Why Studio was cheap and this is not:** Studio touches two tables and its
writes are trivial — an `archived_at` flag (614) and the tray upsert/delete
(627). The showroom needs the two biggest presentation modules in the file.

*(Corrected 8 Aug: this said Studio "never writes". It did, at 614, and does
more at 627. The **argument** is unaffected — Studio was cheap because its
surface is small, not because it was read-only — but the claim was false and had
propagated to four places in the doc set. See `CLAUDE.md` → Cardinal Studio.)*

### The trigger to actually do it

Not "someday" — one of these two concrete things:

1. **Wanting independent deploys**, so CRM work cannot destabilise a sales tool.
2. **Putting the tablet in the hands of someone who must never see money
   screens** — a rep, a subcontractor, a hire. Build 625's gate is a curtain,
   not a wall.

Until one of those is true, 625 gives Theo the thing he described — sign in at
showroom, get a presentation front door — at a fraction of the cost.

---

## What build 627 left open — observations, not work

*8 Aug 2026. Both are known and deliberate as shipped. Neither is a bug report;
both are here so the next session does not "discover" them and fix the wrong one.*

### 1. Nothing removes a photo from the tray once its pair is built

Verified: there is **no `studio_tray` delete anywhere in `index.html`** — the
Showcase reads the tray and never prunes it. The only way out is to untick the
photo in Studio.

**This may well be correct.** A tray is a shortlist, and a shortlist that empties
itself as you use it cannot be reviewed, re-cut, or used to build a second pair
from the same site. The alternative — auto-remove on `promoteToPair` — is one
line and would be a silent behaviour change to a feature Theo has not used yet.

⚠️ **Do not pick for him.** If the tray gets unwieldy in practice he will say so,
and the answer might be "clear tray" button, auto-remove, or an "already used"
badge — three different features. Ask before building any of them.

### 2. The tray reads `.limit(300)` with no paging

`loadTrayPhotos()` takes the 300 most recent by `added_at`. At the tray's intended
size — a shortlist of pairs worth showing a customer — this is not reachable.
It is recorded because a limit with no UI to say it was hit is exactly the "silent
cap" this project has been bitten by before: **if it ever does truncate, say so on
screen rather than quietly showing 300.**

### ✅ CLOSED at 628 — the third bucket exists now

~~There is no bucket for "damage vs how we do it".~~ **Shipped at 628.** The tick
in Studio cycles off → Showcase → Hall of Fame, `studio_tray.bucket` records
which, and the Hall of Fame gained the picker it never had. Do not re-file it.

**Still open from 627, and item 1 is still Theo's call — 628 did NOT decide it:**

### Not open, so nobody re-files them

- **The tray badge paints.** `#stuTrayCount` exists in the markup (`studio.html`),
  and `paintTrayCount()` is called on load and on every toggle. Checked.
- **The tray carries no coordinates**, by three independent mechanisms. That is a
  fence, not an omission — see `FEATURES.md` → 627.
- **A work order with no labor lines is still correct** (the 556 permission rule),
  and unrelated to any of the above.

### 📌 Build 630 — the colours bin needs its destination

629 ships a **colours** bin in Studio that collects but consumes nowhere. Two
things make this its own build rather than a footnote:

1. **`oc_color_photos.color_id` is NOT NULL.** Which Owens Corning colour a roof
   is belongs on the Colors page, where the swatches are visible — not in Studio,
   where you are looking at a photograph.
2. ⚠️ **The photo must be COPIED, not referenced.** Colors is visible to **all
   signed-in staff** (Theo, settled: *"Yes they can see colors"*), while
   `photos/studio/*` is admin-only by storage policy. A tray row pointing at an
   archive path renders for Theo and is **broken for Curtis and Nick**. Copy into
   `oc-colors/<slug>/` the way the Showcase copies through `putPhoto()`.

Do not "simplify" this by inserting the archive path directly.

### Asked at 628 and deliberately left unanswered

**Should a Hall of Fame comparison also take a third "during" shot**, the way the
Showcase path does via its optional `build` slot? The machinery is already
generic — `build` is the only slot the completion guard treats as optional, so
adding one is an array entry and a form field. Not assumed either way, because
"theirs vs ours" is a two-sided argument by construction and a third photo may
simply muddy it. **Ask before building it.**

---

## Worked forward to build 633 — 8 Aug 2026

### ✅ Closed by 633 — do not re-file

- ~~The colour grid loads too much~~ — **`THUMB` (640px) shipped.** The tile was
  measured at 269.5 CSS px and was being handed the 1400px `DISP` copy. See
  `FEATURES.md` → 633 for the fallback order, which is load-bearing.
- ~~"White boxes then loads slow"~~ — the tile image now carries the dark ground.
  It was never a fault, only `--occ-card:#FFFFFF` showing through a lazy load.
- ~~`signMany()` keys by array position~~ — keys by the returned path now. It had
  been latent since 630 and 633 is the build that would have triggered it.

### ⚠️ Still Theo's to confirm — three things, all of them one tap each

1. **Does the Archive site button work now?** (632, unmerged as of writing.) The
   check afterwards is `select count(*) from studio_photos where archived_at is
   not null` — it was **0 across 60,503 rows** before, which is how we know the
   click had never once reached the database.
2. **Does the colour page feel light now?** (633.) The Optimise button will
   **reappear** with all 63 photographs to process — that is correct, not a
   regression: at 632 it was hidden because every photo already had its `-d`
   twin, and 633 moved the test to the missing `-t`.
3. **The Feature header after 626**, still unverified by eye.

### 📌 Open, and worth stating plainly

- **The projected page weight after 633 is arithmetic, not a measurement.** What
  is measured is what the page loads *today*: 23.94 MB of display copies on Onyx
  Black, 17.31 MB on Black Sable. The toast reports the real figure the first
  time Optimise runs. Do not quote a predicted number as fact — that is exactly
  the error that produced "40 MB down to 2.4 MB" before 631.
- **Optimising 63 photographs is a real client-side job** — it fetches ~42 MB of
  display copies and re-encodes each one on his iPad. Per-photo progress is
  shown, and nothing is overwritten, so an interrupted run is safe to re-run.
  If it proves painful, the next move is a server-side pass, not a smaller batch.
- **The colours bin from 629 still has no consumer** — that is build 630's entry
  above and it is still open. The copy-not-reference rule in it is the load-bearing
  part.
- **Nothing prunes the Studio tray** once a pair is built.
- **`scripts/next_build.py` under-reports.** It reads the app stamp from
  `origin/main` only and its `ENTRY` regex still expects the **pre-574** changelog
  shape (`{ build:N, note:'…' }`), so it cannot see entries in the current
  `{ b, d, t, s }` form. At 633 it answered "632" while a pushed branch already
  carried 632. It still catches the collision it was written for; it just is not
  the whole answer. Cross-check with the per-branch stamp sweep until it is fixed.

---

## Worked forward to build 634 — 8 Aug 2026

### ✅ Closed by 634

- ~~Community Partners throws for non-privileged users~~ — the masked-row guard.
  **Was live**: 2 of 10 partners confidential, so every rep hit it every time.
- ~~Client error reports render as job-thread notes~~ — `THREAD_SKIP`.

### 📌 Found and deliberately NOT fixed — read before "finishing" it

**`renderProspects()` bypasses the mask.** It calls `getRaw(row.dataset.id)` and
always renders an Edit button, so a partner that was **both `prospective` and
`confidential`** would hand its real name and contacts to a rep.

**It is not exploitable today** — measured: 4 prospective/not-confidential,
2 confidential/not-prospective, **zero overlap**. The trigger is someone ticking
Confidential on a prospect. Left alone because it is a separate change with its
own blast radius and Theo asked for the crash. **If the overlap ever becomes
non-zero, this is a real leak** — the same query is in `cardinal_build_log.md`.

### ⚠️ Still Theo's to confirm

1. **A rep opening Community Partners** — the real test for 634; I cannot sign in as one.
2. Does **Archive site** work (632) — `select count(*) from studio_photos where archived_at is not null`.
3. Does the **colour page feel light** after running Optimise (633) — the button
   reappears with all 63 to do, which is correct.
4. The **Feature header** after 626.

---

## Worked forward to build 635 — 8 Aug 2026

### ✅ Closed by 635 — the item 634 recorded as found-but-unfixed

~~`renderProspects()` bypasses the mask~~ — closed on Theo's "Close it".
⚠️ **And the 634 note was half wrong:** `prospects()` always masked, so the list
was never leaking. Only the Edit button was, via `getRaw()`. Fixed at three
levels: the button is hidden, the CONFIDENTIAL chip explains why, and
`openEditor` refuses to unmask for a non-privileged caller.

**Do not "simplify" the third one away.** It is the fence — the hidden button is
only the UI in front of it, and `openEditor` is the single place `getRaw()` turns
an id into unmasked data.

### ⚠️ Still Theo's to confirm — unchanged from 634

1. **A rep opening Community Partners** (634) and **the prospects list** (635).
   I cannot sign in as one.
2. **Archive site** (632) — `select count(*) from studio_photos where archived_at is not null`.
3. **The colour page after Optimise** (633) — the button reappears with all 63 to do.
4. The **Feature header** after 626.

---

## Worked forward to build 636 — 8 Aug 2026

### ✅ Closed by 636

~~Two maps on every client profile~~ — one Location card, Google map.
⚠️ **Do not "tidy" the card away.** It holds the only rendered address text and
the only `#acxEdit2` pencil, and **Community adopts this exact node** — it has no
Google card of its own.
⚠️ **`qiLoadLeaflet()` and the other Nominatim callers must stay.** A second
Leaflet map elsewhere uses them; a file-wide "remove OSM" sweep would delete a
feature nobody has looked at.

### 📌 Junk claims — Theo's call, not mine

`insurance_claims` holds **4 rows, all created by theo@**. Three are test rows
from July, none attached to a project:

| created | homeowner | address | carrier |
|---|---|---|---|
| 23 Jul | `grdgdfg` | `dfgfdg` | — |
| 24 Jul | *(null)* | *(null)* | — |
| 29 Jul | *(null)* | *(null)* | — |

The fourth (7 Aug, State Farm, Maker Space Solutions, $28,727.17) is the real
one. They render as "Unknown carrier / Unknown homeowner" because the list falls
back when `carrier` and `homeowner_name` are null.

**Offered deletion; awaiting his word.** Do not delete production rows
unprompted. Two separate questions are open behind it: should the claim list
*hide* rows with no carrier and no homeowner, and should New Claim refuse to
insert an empty row in the first place. Both are real, neither was asked for.

### ⚠️ Still Theo's to confirm

1. **A rep opening Community Partners and Prospective Partners** (634, 635).
2. **The Location card** on both an Insurance and a Community job (636) — I
   cannot load a Google static map from the sandbox.
3. **Archive site** (632) · **the colour page after Optimise** (633) · the
   **Feature header** after 626.

---

# Layer: build 650 — 9 Aug 2026 (Money In & Commissions)

## ✅ SETTLED BY THEO, 9 Aug 2026 — do not re-litigate

- **"Pedro Vera" in the spec IS Jerry Vera** — same person, spec used the
  wrong first name. `jerry@cardinalrenovations.net` was already
  `role:'sales'` in `team_profiles` and already in `TEAM_ROSTER`, so he was
  already selectable as a commission rep with no code change needed. Nothing
  to fix — this closes the "same family?" question outright.
- **Kyle Mantia: leave him out.** Not a rep in this system. The roster
  staying silent on him (no `team_profiles` row, no hardcoded email) is
  correct, not a gap — do not add him speculatively.
- **Greg Clark's display name is set** (`clarkie022@gmail.com` → "Greg
  Clark" in `team_profiles`, confirmed live). He now renders by name
  everywhere `rptRepName()` is used, no longer as "clarkie022".

## ✅ The five spec open questions — ALL ANSWERED BY THEO, 9 Aug 2026

*Do not re-ask any of these; do not build the paths he declined.*

1. **Draws: linked to a project, but general advances are allowed too.**
   Theo: "Draws are linked to project. But can it be both in case of
   general?" — Yes, both. Matches what already shipped: `draws.project_id`
   is nullable. The job's Money In tab creates a job-linked draw; the
   Commissions screen's **+ New draw** creates a general one (`project_id:
   null`). No further build needed — already both.
2. **Draw requests: text/call, not in-app.** Theo: "Text/call." Reps do not
   request draws through the app; Theo logs them. Matches what shipped —
   only `isAdminUser()` can log a draw. **Do not build a rep-facing request
   flow.**
3. **No split commissions between two reps, ever.** Theo: "No split
   commissions between 2 reps." `projects.sales_rep` stays a single field;
   no `commission_splits` table. **This is decided, not deferred — do not
   build it if asked again without a new instruction from Theo.** (The
   collapsed "Manual entry…" form on the tab can still add a second
   commission row by hand for a one-off exception, same as it always could.)
4. **Weekly owed-reminder email — BUILT, build 651.** Theo: "Weekly
   reminder once email trigger." `api/commissions-digest.js` (new,
   mirrors `api/digest.js`'s Resend pattern) emails Theo and Joan every
   Friday 11:00 UTC with what each rep is owed minus outstanding draws —
   using the exact same "owed" rule (`pending`/`approved`, never
   `paid`/`void`) the Commissions screen uses, so the two can never
   disagree. Sends nothing when nothing is owed (matches `/api/digest`'s
   own convention). Cron registered in `vercel.json`.
5. **Payment method: tracked, not just date.** Already shipped at 650 — the
   Mark Paid flow on the Commissions screen has a Method select
   (check/ACH/payroll/other) alongside the date.

## ✅ Finance as a collection source — BUILT, build 651

Theo: "Add finance, we use service finance right now but will explore other
financing." `collections.source` gained `'finance'` (alongside insurance/
homeowner/other) plus a free-text `finance_company` column —
`commission_finance_source.sql`, **applied**. Free text, not an enum: one
financing company exists today and Theo has already said he'll add others,
so a `financing_companies` table for one row would be the premature
abstraction this project warns against — adding a second company later
needs no migration. The Log Collection form pre-fills "Service Finance" as
an editable default when Finance is picked (today's normal case costs zero
extra typing); the Money In table shows it as "Finance — Service Finance".

## Needs Theo — commission system (none of it blocks using the feature)

1. **Backfill check:** 26 of 30 projects got a `sales_rep` from the checklist
   assignment (joey 10 · clarkie022 8 · theo 6 · nick 2); 4 have none. All
   editable on the job's Commissions tab until the first collection locks them.
2. **Resend must actually be configured** for the new weekly email to send —
   it reuses the same `RESEND_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` env vars
   `/api/digest` already needs, so if the daily appointment digest is
   arriving, this needs nothing new.
3. **Rep-role rendering is verified by RLS + harness, not by signing in as a
   rep** — the standing sandbox limitation. First Friday run-through is the
   real gate.

---

# Layer: CR Audit — 9 Aug 2026 (docs-only; the report is the source of truth)

**`docs/CR_AUDIT_2026-08.md` supersedes this note** — 23 findings, 6 buried
features, 6 sized insurance gaps, all severity-ranked with evidence and a
per-finding fix sketch. Re-derive its numbers with
`scripts/audit_recount.py` before quoting them at a later build.

Standing corrections this audit adds to the doc set:
- `cr-ih-styles` is **load-bearing** (3.4 KB, styles the live Truth hub) —
  only the `cr-ih-script` stub is deletable. Earlier "8 KB dead styles"
  notes are wrong on both counts.
- `claim_upgrades` is empty but **summed by the `claim_money` view** — not
  droppable on a client-code grep.
- The Truth-hub rail's `render()` **does** wipe the hub's navigation cards
  (verified byte-level) — destinations survive via banner/nav/⌘K only.
- The Admin Health registry monitors `push_subscriptions`, the table build
  611 recorded as never-read — while the real `push_subs` is unmonitored.
  Same registry-repair pass as the documented phantom `payments`/
  `supplements` rows.

Awaiting Theo's picks from the fix menu (presented in chat, mirrored in the
report): the broken-wire batch · money coherence · insurance repair · the
supplement unification shape (his three-filings model) · the media backfill
· health-check truth-telling · the DB hygiene migration · gap features.

---

# Layer: build 653 — 9 Aug 2026 (five audit fixes, shipped)

## ✅ BUILT — the broken-wire batch Theo picked off the fix menu

Five items, verbatim from his list, each closing the audit finding named:

1. **CR-AUD-001** (dead Convert-to-Contract button) — fixed, hyphenated the
   endpoint path everywhere it appeared.
2. **CR-AUD-002** (false Send toast) — fixed, real send through
   `/api/senddoc`. **Also fixed as a dependency, found only by executing
   the handler for real:** the pre-existing `.cr-doc` innerHTML wipe that
   crashed `showOutput()` before Send's handler was ever wired — this one
   was not on Theo's list and was not a named audit finding; it surfaced
   while proving item 2 actually works, and had to be fixed for item 2 to
   be reachable at all. Reproduces on 652; not new in this build.
3. **CR-AUD B1** (invite endpoint, no caller) — fixed, new button beside
   "Add teammate."
4. **CR-AUD-008** (12 MB photo tap) — fixed, `loading="lazy"` +
   admin-only legacy-media migration tool.
5. **CR-AUD-006/014** (invisible $28,727 claim) — fixed, `RAIL` gained
   `OnHold`, the one live record repaired, `linkClaimToProject()` now sets
   `claim_type` going forward.
6. **CR-AUD B2/B4** (buried iTel rows and the smoke-test runner) — fixed,
   both joined the banner `ROUTES` map; a new read-only iTel Lab Results
   view exposes the 28 real rows and says plainly they're not yet linked
   to a claim.

**This closes the "broken-wire batch" line item from the CR Audit's fix
menu.** The remaining fix-menu lines — money coherence (CR-AUD-003/004/
013), insurance repair beyond the OnHold hole (CR-AUD-007/009/015/017),
the supplement unification (CR-AUD-005, Theo's three-filings model, still
unbuilt and still needs his shape first), the media backfill beyond legacy
base64 (broader than CR-AUD-008), health-check truth-telling (CR-AUD-016),
the DB hygiene migration (CR-AUD-021/022), and the sized insurance-lifecycle
gap features (§ the gap analysis in the report) — are all still open and
still need a pick from Theo. Do not build any of them speculatively; each
needs the same "which one, in what shape" answer the audit report asks for.

---

# Layer: builds 654–655 — 9 Aug 2026 (the second audit batch)

## ✅ SETTLED BY THEO, 9 Aug 2026 — three picks, do not re-litigate

1. **Job money = "One number + label"** (CR-AUD-003). One precedence
   everywhere; the profile labels an estimate-sourced value. Built at 654.
2. **Stage labels = "Closed" + "Awaiting Depreciation / Supplements"**
   (CR-AUD-014). The rail's wording wins in every insurance map; OnHold
   gains "On Hold" everywhere. Built at 655.
3. **✅ Supplement unification (CR-AUD-005): the data layer SHIPPED at
   667-668** — the Supplement Desk. Design went to Theo first (9-10 Aug,
   his picks recorded: admin-only, send-on-tap, quantities-only), built on
   his three-filings model. Rows in `insurance_supplements`, trigger mirror
   to the single-slot columns, AI gap analysis citation-locked to Cardinal's
   own templates. **Still open: build 669 (send from the desk) and 670
   (carrier-response reading + PWI/COC completion path).** CR-AUD-017 folds
   into the mirror and is closed with it.

## ✅ BUILT at 654 — money coherence (CR-AUD-003 / 004 / 013)

See the build log and FEATURES.md §654. Two deliberate number changes are
recorded there (estimate-only profiles now priced; contract+manual now
additive app-wide). `rptIsSigned` left as a stage proxy on purpose — with
zero signed contracts live, real-signature keying would zero every report.
**Revisit `rptIsSigned` once contracts actually flow.**

## ✅ CLOSED — the Adam Gunn scope read WORKS (9 Aug, builds 660–664)

It read on the first attempt after 660–663 deployed, and it read **BC-Building
Codes, $1,887.33 RCV / $1,933.72 ACV** — the figures Theo quoted off page 5, to
the cent. `O&L cap` came back *(not found)* rather than invented.

⚠ **Which build fixed it is unknown and must not be claimed.** Only the BC
vocabulary is provably 660's. Whether it parsed because of 661's retry, 662's
duration, or because Gemini was simply healthy that evening cannot be
distinguished — a successful read logs nothing.

**664 then fixed what applying it revealed**: five approved columns never
reached `insurance_claims` (`BUG_CLASSES.md` §18). Gunn's row was repaired by
hand; the SQL is in the build log.

### ✅ SETTLED at 666 (was: Theo's call)

**The review modal pre-ticks any field whose extracted value DIFFERS from what
is stored — including over human-verified data.** That is how an AI misreading
of the adjuster's phone (`636` → `663`, a digit transposition) arrived
pre-approved and was applied. The email changed in the same read and was
CORRECT, so this is one wrong field in seventeen, not an unreliable extractor.

**Theo picked "only tick empty" and it SHIPPED at build 666.** A field that
already holds a value arrives unticked even when the extraction differs; the
difference still shows, the overwrite is opt-in. Do not re-litigate toward
differs-means-ticked — the misread phone digit is the recorded reason.

## ✅ BUILT at 665 — scope history (GAP-2)

Theo's pick for the build after 664, his ordering: data-loss risk first, and
the structural floor for supplements. `scope_reads` (applied, append-only —
NO update policy, deliberate), ONE writer (`logScopeRead`, exported as
`CardinalSolUpload.logRead` for the supplement work to reuse), Settle-pane
history section, backfill seeded 2 rows. GAP-2 is CLOSED. ⚠ For CR-AUD-005:
build on `scope_reads` + `logScopeRead`; do not invent a second trail.

## (historic) The Adam Gunn scope read was not proven (661)

657–661 all touched this path and **not one of them has been shown to read
that document successfully.** What each build actually fixed:

| Build | Fixed | Proven by |
|---|---|---|
| 657 | the 6.4 MB file never reached the route (inline over Vercel's body cap) | it now reaches it — the failures since are the model's, not the transport's |
| 659 | the reply was truncated at 1024 tokens | Theo's error text stopped being cut-off JSON |
| 660 | the prompt did not know "BC — Building Codes" | not yet exercised on the document |
| 661 | the failure named no cause; JSON-mode never retried | the next failure carries its own diagnosis |

**The sandbox cannot run this.** `GEMINI_API_KEY` lives in Vercel env vars and
must stay there — there is no way to call the model from here, so the read is
Theo's to run and his screenshot is the instrument.

**662 added a row to that table**: every AI route was running on the hosting
default duration (10–15s), and 661's retry made the scope read two sequential
model calls. That is now `maxDuration: 60` plus a code guard that refuses a
retry it cannot finish. ⚠ **It is not the outstanding cause** — Theo's
screenshot carried the handler's own sentence, so the handler returned; a
timeout would have shown `HTTP 504`. It was a risk 661 created, found by
checking a claim that was otherwise wrong.

**Ruled out, so nobody re-proposes them** (each has now been suggested at least
once): OCR and layout-aware PDF parsing — `/api/sol` is multimodal, there is no
text-extraction stage to improve · "narrow the prompt off line items" — it has
never asked for line items, 24 summary fields measured · Vercel's 4.5 MB body
limit — 657 routes anything over 3.1 MB through storage · markdown fences —
stripped since before 659, with two further salvage layers since.

**Unmeasured and deliberately untouched**: the prompt is 3,852 characters and
**59% of it is ordinance & law** (2,254 chars added across 658 and 660) for one
field group out of 24. Not a proven cause of anything. Written down because
three builds pushed the same direction; know the shape before adding a fourth.

**663 finished the instrument and the building stops here.** 657 → 663 is seven
builds on a failure never once reproduced in this sandbox. **Do not ship an
eighth before a tail exists.** Pre-flight a preview with `/api/ai-status`: it
says whether `GEMINI_API_KEY` is present in *that* environment and whether
`OPENAI_API_KEY` is set at all (which decides whether 661's fallback repair is
even reachable).

**What to do with the next screenshot**: read the bracketed tail.
`in <few hundred> tok` means the document never reached the model (transport,
not prompt). `out 0 tok` with a large `in` means it ingested and declined.
`blocked X` means a safety stop. `answered in words` is the only one that is
about the prompt. **Do not start rewriting the extraction stack before that
tail says which of the four it is** — and note that OCR / layout-aware PDF
parsing is advice for a text-extraction architecture this route does not use
(see FEATURES.md §661).

## Still open from the audit after 654–655

**CR-AUD-005 is now CLOSED** — the Supplement Desk (667–670) is the one
supplement system: filings live in `insurance_supplements` rows and the claim's
slot columns are a DB trigger recomputing from them, whoever wrote. 017
(supplement bucket vs owedOn) folded into it. Still open:

CR-AUD-016 (health-check registry)
· 017 (supplement bucket vs owedOn — folds into 005's design) · 018
(community draft-estimate fallback) · 019 (inspections tile/tab predicates)
· 020 (small wiring cleanups) · 021 (dead weight deletions) · 022 (DB
advisor batch) · 023 (boot weight) · B3 (CardinalUndo) · the seven direct
checklist writers outside `patchProjectCk` (listed in 655's PR — same
last-write-wins class, follow-up candidate) · the gap features (each needs
Theo's shape).

## The Supplement Desk — what 670 left standing

**Settled, do not re-litigate.** A building-official letter is filed by
JURISDICTION, not by claim (it is reusable — that is the whole point). It is
**evidence beside an RCO citation, never a citation of its own**, because Ohio
has one statewide residential code and the local department administers it. The
jurisdiction match is a **sort hint**: it never filters the list and never ticks
a letter, because the addresses misspell their own city and a neighbouring
official is persuasive where he is not binding.

**Open, in the order they were offered:**
- **Carrier-response reading (the `read_response` mode, still 501).** Upload
  the denial → per-item approve/deny mapped onto the filed row's `items` →
  rebuttal draft → the thread lives on the row. Also the PWI/COC completion
  path (certificate + photos → depreciation release).
- **Send from the desk.** Recipient shown, one explicit tap, exhibits as
  long-lived signed URLs (the `PHOTO_DOC_URL_TTL` shape). Theo's pick was
  "send from the desk"; the Desk currently files, prints and copies.
- **A metal-over-cedar-shake substrate template** for the pack, if the Gunn
  argument recurs. `tear_off` covers it today; a dedicated card would carry the
  attic/skip-sheathing documentation list.
- **Hover → `checklist.meas`.** `/api/hover` is the SIDING order flow only;
  Roofr's numbers reach `meas`, Hover's do not. Small build if wanted.
- **The register has no browser outside the Desk.** Letters are admin-authored
  and all-staff readable by RLS, but only the Desk renders them. If production
  should carry the jurisdiction's position into the field, that is a read-only
  view in `index.html` — not started, not decided.


## After 671 — what the audit left on the table

**Answered by 671, do not re-open:** the SECURITY DEFINER proposal (rejected as
a false positive, with the test recorded in `supplement_mirror_tiebreak.sql`);
the `.pill.filed` "can never be produced" claim (overstated — two vocabularies,
both now complete).

**Three questions that genuinely need Theo, none of them blocking 672:**
1. **PWI / COC vs quantities-only.** A depreciation-release filing must carry
   the final invoice figure; the Desk's rule is quantities-only, settled three
   times. (1) pwi_coc is exempt, `dollar_flag` suppressed for that type only.
   (2) The amount rides on an attached invoice; the letter stays
   quantities-only. (3) The letter states it and `dollar_flag` still fires so a
   human confirms every time. **Recommend 3** — one rule with one visible
   exception beats two rules. The option is disabled until this is answered,
   and it needs its own build regardless: the Desk is hard-gated on a filed
   carrier scope, which is the wrong precondition for an end-of-job filing.
2. **The supplement rail will read $0 on every Desk filing.** The Desk writes
   no `amount_requested`, so the mirror computes 0 while flipping the status to
   filed. There is no honest source for a number — Gunn's `our_estimate_total`
   and `cost_incurred` are both NULL and `scope_reads.extracted` is NULL.
   (1) Show the ITEM COUNT instead of money wherever a Desk filing appears.
   (2) Add an optional amount field filled by hand. (3) Leave the $0.
   **Recommend 1** — inventing a figure to fill a rail is the confident-wrong-
   number class this project keeps removing.
3. **Who may rewrite a FILED letter?** `insurance_supplements`' update policy is
   full-access-or-own, so Curtis and Scottie — who cannot open the admin-only
   Desk — can update `letter_html` on a filed row, and the mirror fires on
   update. No shipped UI does this. (1) Leave it. (2) Freeze
   `letter_html`/`letter_subject`/`filing_type` once `sent_at` is set, leaving
   status/items free. (3) Narrow the RLS to admin-only. **Recommend 1 now, 2
   the moment a reopen-and-edit path ships.** Not 3 — it would break the
   claims-screen CRUD they legitimately use.

**Recorded, not built:** `insurance_supplements_insert` checks only
`created_by`, not that the claim is visible — a caller outside the Desk could
insert against an invisible claim and the mirror would no-op. Not reachable
from any shipped UI.

**672 SHIPPED** — send from the desk, back-compat proved differentially against
the 671 handler. **Next: 673,
the carrier response: reopen the filing, record decisions per item into
`items[].carrier` (**not** `responses` — the items COMMENT already names that
home), rebut through the existing `mode:'draft'` with an explicit
`letter_kind`. A reduced-quantity approval — the commonest adjuster move — has
nowhere to land today; 673 is the cheap moment to add `approved_qty` beside
`decision`.


## After 672

**Still open, unchanged:** the three questions above (PWI/COC vs
quantities-only; the $0 supplement rail; who may rewrite a filed letter). None
blocked 672; all three still want an answer.

**New, from building the send:**
- **Nothing verifies the letter arrived.** Resend accepting it is not the
  carrier receiving it. No bounce handling, no delivery webhook. `sent_at` means
  *we handed it to the mailer*, and the Desk says exactly that.
- **`EXHIBIT_TTL` is one year.** If a dispute outlives it the photographs in the
  carrier's copy stop resolving. One constant; the archive still re-renders.
  Revisit if a real supplement ever runs that long.
- **673 is next**: reopen the filing, record the carrier's decision per item
  into `items[].carrier` (NOT `responses` — the items COMMENT already names that
  home), and rebut through the existing `mode:'draft'` with an explicit
  `letter_kind`. Add `approved_qty` beside `decision` while the slot is being
  written for the first time — a reduced-quantity approval is the commonest
  adjuster move and today has nowhere to land.


## From the 672 adversarial review — confirmed, deliberately NOT built

- **No recovery if the page dies between send and writeback.** The retry lives
  in a closure on the Send button; a reload or a crash destroys it, and the only
  route back is to file a second supplement — which mails the carrier a second
  letter. The fix is to derive send state from the filings already fetched: let
  an unsent filing be selected to set `S.filedId`, and hard-refuse Send on any
  filing whose `sent_at` is non-null. **673 work** — it needs the filings list
  to become interactive, which 673 is doing anyway for the carrier response.
- **Nothing verifies delivery.** Resend accepting is not the carrier receiving.
  No bounce handling, no delivery webhook. `sent_at` means *handed to the
  mailer*, and the Desk says exactly that.

### Refuted findings — do NOT re-file these

- *"`renderForSend` keys signed URLs by array position, re-introducing the
  build-633 bug."* The code reading is correct; the conclusion is not.
  `createSignedUrls` is contractually 1:1 with its input, so position-keying and
  path-keying are provably equivalent **here**. 633's bug required asking for a
  path the API might not answer for.
- *"The quantities-only rule is never re-checked at the new exit."* True as
  written but mis-scoped — the defect was the mail body's *claim*, not the flag,
  and that is fixed. The flag itself is a draft-time warning by design.
- *"A legacy base64 photograph is silently excluded from the mailed letter."*
  Pre-existing at 668, and 672 is the build that added the only mitigation it
  has ever had (an unresolvable photo is no longer claimed).


## From 673 — the Hover upload files a PDF and nothing else

Uploading a Hover report under **Measurements** stores the PDF as a document.
It does **not** extract anything: `/api/hover` is called only from the siding
material-order import (`index.html:16247`), so nothing writes `checklist.meas`.

**DONE at 674.** Uploading a Hover or Roofr report under Measurements now reads
it and fills `checklist.meas`. Gunn's report is on file — **re-upload it once to
run the extraction over it**, since 674 only reads on upload and does not
backfill documents already filed. A backfill pass over existing `meas_docs`
rows is a small follow-up if more than one job needs it.


## After 674

- **674 reads on UPLOAD only.** Reports already filed (Gunn's Hover, and the
  Bob DeBuilder mockup) are not backfilled. Re-uploading is the one-job answer;
  a sweep over `meas_docs` is a small build if it is ever more than that.
- **Nothing verifies Gemini read Hover's table layout correctly.** The route is
  told to null rather than guess and the merge will not overwrite a field
  measurement, so a bad read costs a re-entry, not a wrong number on a carrier
  letter. Still: check the numbers against the report the first time.
- With measurements on the Gunn job, the Desk's quantities stop being blank —
  the remaining gaps there are **photographs (zero on that job)** and **a
  Brookville building-official letter (none filed)**.

---

## Build 680 — closed, and what it left open

**Closed.** Theo's four questions on the claims screen: the giant white boxes
(`.empty` was two classes wearing one name — **six** surfaces, not one), "Filed"
and "Approved" now say they are dates, `approved_at` has a writer for the first
time (it had **none, ever** — display-only since the module shipped), Cause of
Loss is read off the Scope of Loss, and the Job tab stopped rendering the
Contract tab.

**STILL OPEN — the horizontal pan.** Theo: *"please fix where the screen goes
left to right when scrolling. On all 3 pictures."* **Measured twice and NOT
reproduced in the claim pane:** `render_claimpane.js` reports
`scrollWidth == clientWidth` at both 390 and 430px, and the tab strip scrolls
inside its own `overflow-x:auto` as designed. So the offender is **outside that
mount** and the next attempt must instrument the whole app rather than one
screen — mount the real document, walk every element, and report anything whose
`right` exceeds `documentElement.clientWidth`. Do not re-open this by re-testing
the claim pane; that answer is already in.

**Worth a look while nearby, not yet asked for:**
- `filed_at` is **null on all 5 claims** in the database even though the form has
  always had the input. Now that the label says "Date Filed", it will be
  obvious when it is blank — see whether Theo wants it required at file time.
- The `cause_of_loss` extraction is **unverified against a real scope** — it
  needs one run through Gunn's document with the live key. Expect `hail`; the
  prompt is told to return null rather than guess, so a blank is a safe failure.
- `#cr-ce-view .ce-kv .v.novalue` still has **no emitter**. It was renamed with
  the rest so the trap cannot be walked into, not because anything uses it.

---

## Build 681 — closed, and what it sets up

**Closed.** The Schedule Board reads (heading 1.10 → 19.89:1 dark; day line
2.30 → 8.73:1 light), and the same heading fix carries all **15** `.viewhead`
pages. `CardinalIcons` exists and is proven on one screen.

**AWAITING THEO — the icon set is a sample, not a sweep.** He asked to see it
before it goes app-wide. Build 682 does not start until he has looked at the
Schedule Board.

**For 682, the inventory instrument is `metallicize()`, not a regex.** It walks
the DOM at load and wraps every emoji in `<span class="mic">`. Drive that in a
real browser across every view for a runtime census. **A source grep for
literal UTF-8 emoji will under-report badly** — all 15 `.viewhead` headings use
the HTML-entity form (`&#128197;`), and more is built at runtime.

**Scope Theo settled:** app screens only. Icons where the eye SCANS; in prose,
**delete**. Out of scope until he says otherwise: emails, push notifications,
printed letters, `popup.html`, `drivewaytest.html`, the Showcase. The CHANGELOG
keeps its emoji — historical record.

**Still queued behind this:** the insurance loop (builds 683–684 —
`read_response` is still a 501, `insurance_supplements` still has zero rows),
and the VAPID key rotation, which is waiting on Theo setting the env var.

---

## Build 683 — closed, and two notes

**Closed.** Home client cards dark in both themes (the bare `.stg-*` pastel
collision), gradient names gone from the cards (39 gradient-text sites → 38).

- **The emoji sweep is STARTED, not finished.** 686 did the nav (28 rows,
  `CardinalIcons` 4 → 27 glyphs + `hydrate()`). **533 pictographic emoji
  remain** — measured with comments excluded and with the 0x2300–0x23FF block
  included, which the first inventory missed. Dingbats (156), arrows (154) and
  geometric marks (66) are counted separately and are NOT part of this sweep:
  ✓ ✕ → ☐ are functional UI glyphs. Next largest surfaces: the card/hero button
  rows in `cr-sf` / `cr-ch2` / `cr-cth` / `cr-ci` (they already wrap their emoji
  in `<span class="i">`, so they are the cleanest remaining tranche), the
  ~~weather table in `cr-lr-script`~~ (**gone at 701 — the panel was removed**),
  the command palette's `icon:` field, and the file-type ternaries in
  `cr-lib-script`.
- **`.pcpo` lavender `#c9a2ff` reads 1.99:1 in LIGHT mode** — pre-existing;
  lavender PO is on the semantic frozen list. Needs Theo's pick of a light
  variant (the `.ljpo` precedent uses `--rbe-po1/po2` pairs).
- ~~**Remaining gradient-text sites: 38**~~ — **DONE at 685.** All removed;
  the real count was **37** (the 38th is a comment whose declaration is split
  across a newline). Chromium's parsed-rule walk now reports 0, and
  `render_gradtext.js` is the standing instrument — it goes RED on 684.

---

## Builds 685–703 — what closed, and the live queue (10 Aug 2026)

**Closed this span**, all merged and verified deployed (PRs #198–#207):
gradient text (685), the nav icons (686) and the three Theo rejected (687),
Suppliers (688), the calendar headings + obsidian client cards (689), the
pipeline-stage chips (690) and the Assigned To strip beside them (691).

**Also closed, 692–701:** the emoji sweep across four card/hero surfaces (692),
Sales Floor light mode (693), the light/dark switch put back on the screens
that lost it (694), the Tools dropdown (695), **my 690 regression on the chip
strips (696)**, the sideways-swipe escape on All Leads & Jobs (697), the 27
client-page `.projsec` headings (698), the 15 `.viewhead` page headings and the
`ICO` consolidation (699), **the lavender PO and On Hold colours (700)** and
**the weather panel removal (701)**, **the map address ink (702)** and
**the claim screen's sideways bounce (703)**.
**704** removed a Supplement Desk card that had never rendered since 668.

**⚠ The Supplement Desk's static `.ins-grid` is dead in full — 7 cards left in
place.** `render()` in `cr-cth-script` overwrites `.ins-body`, so nothing in
that grid reaches the DOM. Kept as an accidental fallback if the module ever
fails to run; its content is already stale (Adjuster Directory reads "Coming
soon" and that screen is built). **Theo's call whether the rest goes.**

**⚠ THE INSURANCE LOOP — audited 11 Aug, and it is smaller than recorded.**
The Supplement Desk is **four-fifths built**: analyze ✅ (2 `scope_reads`),
draft ✅, file ✅, send ✅ — and **`read_response` is the only 501**.
**No migration is needed to close it**: `insurance_supplements` already carries
`responses jsonb DEFAULT '[]'`, `responded_at`, `amount_approved`, and its
`status` CHECK already permits `approved` / `partial` / `denied`. The Desk's
filing list already renders an approved amount when one exists.
⚠️ **But the loop has never completed once** — against 5 claims there are
**0 supplements, 0 payments, 0 upgrades**. The front half has never been driven
to the end either, so building the reader against invented fixtures risks the
inert-code failure exactly. **What is needed from Theo: one real supplement
filed on the Gunn claim, and the carrier's reply document.**

**⚠ OPEN, measured, and put to Theo — the sideways-bounce class is app-wide.**
703 fixed the insurance claim screen. **13 other full-screen views carry the
same coercion**: `landingView`, `cr-estimates-mount`, `cr-pricing-mount`,
`payView`, `puDetail`, `tskModal`, `solModal`, `projModal`, `ckModal`,
`gcModal`, `leadModal`, `leadFormModal`, `apptModal`. Each will slide and
rubber-band whenever a child is a pixel too wide.
**This must NOT be swept blind.** Unlike 697's `overscroll-behavior-x:contain`,
which is inert where there is no overflow, `overflow-x:hidden` **clips** — so
every view needs its genuinely-wide child found and given its own scroller
first. Bug class 33 has the drill.

**Also seen while measuring, not fixed, not reported as a bug yet:** the HOME
view has small pre-existing overflows — `.wrap` +10px, `.homecols` / `.homemain`
/ `#kpPunchStrip` / `.pu-strip` / `.sh` +18px each at 393px. They are contained
by `#mainView{overflow:clip}` so nothing slides today, but they are real and
they are what class 33 needs as fuel if that clip is ever relaxed.

**The queue, in Theo's priority order:**

1. **The emoji sweep — 532 remain.** Still first. The nav went at 686, the four
   card/hero surfaces (`cr-sf` / `cr-ch2` / `cr-cth` / `cr-ci`) at 692, and the
   Tools dropdown at 695, the 27 client-page `.projsec` headings at 698 and
   the 15 `.viewhead` page headings at 699.
   The two biggest left are the rest of the static
   `(markup)` (~296) and the anonymous block-1 script (124). ⚠️ **90 distinct
   characters remain in the markup** — that is 90 glyph decisions, so it wants
   splitting into coherent menus/screens rather than one sweep.
   ✅ **SETTLED 10 Aug, Theo, verbatim: "Keep them as emoji."** Asked about the
   four condition dots (🟢🟡🟠🔴) in `ck_ventcond`. An `<option>` cannot contain
   markup, so an SVG is impossible there — the only choices were keep or
   delete, and he chose keep. **The same physics covers all 17 `<option>`
   emoji** (`ck_ventcond`, `apKind`, `apptKind`), so every one of them is
   permanently out of scope and must be left exactly as it is.
   **The exclusion lives in `scripts/emoji_census.py`, not only here**, because
   the instrument is what a later sweep actually reads to pick targets. Do not
   re-open this.
   ⚠️ **Count with `scripts/emoji_census.py`, never a grep.** The old "533"
   missed the JS `\uD83D\uDD28` surrogate-escape form, which is two thirds of
   all hits, and had no bucket for the **46 ® marks on Owens Corning names** —
   those are trademark symbols `OC_BRAND_RULES.md` requires, not stickers.
   ⚠️ **The weather table is NO LONGER a target — the whole panel went at 701**
   on Theo's instruction. Any list that still names `WX_CODES` as the next
   tranche is stale; `cr-lr-script` has no weather code in it.
   **Ship icons with a rendered contact sheet, never a pass count**: 686 was
   195/195 green and shipped three wrong glyphs.
2. ~~**gradient text**~~ — **DONE at 685**, 37 sites, zero floor failures.
3. **The insurance loop** — unchanged. `read_response` is still a 501,
   `insurance_supplements` still has zero rows. Needs Theo, the live key and
   Gunn's document.
4. **VAPID rotation** — still waiting on `VAPID_PRIVATE_KEY` in Vercel. **Do
   not remove the committed literal in `api/notify.js` before the env var is
   live; this repo is public and push breaks silently without a key match.**

**✅ Both open questions are ANSWERED and SHIPPED at 700.** Theo, verbatim:
*"Do whatever you recommend for the lavender in light mode, for the on hold
maybe make it a different color of your choice."*

- **`.pcpo` lavender** is now a token pair — `--pc-po` `#c9a2ff` dark /
  `#6d3fbf` light. It had been 1.79:1. **A pair, not a computed literal**, so it
  cannot drift the way 527's `#f08a90` did.
- **`OnHold` now has an entry in all five stage maps.** Amber on the leads list
  (`LJ_SOLID` `#c8862b`, `LJ_SPINE` `#ff9f43`), teal on the job banner
  (`STAGE_COLORS` `#0F9B8E`). **Deliberately two colours, not one** — the two
  screens use different palettes and amber was already spoken for on the banner.
  Do not "unify" them.

**Parked by Theo, with his words:** the desktop left nav (`cr-lnav-script`)
keeps its OWN 26-icon set, unrelated to `CardinalIcons` — folding them into one
is its own build and changes what his ultrawide looks like, so it wants a
preview. His call on doing it now was **"not now"**; finish the emoji sweep.

**Not chosen, do not re-propose without a reason:** Option A for the filter
strips — one switchable strip covering all seven groups. It was rendered and
shown beside Option C; he picked **C, two fixed strips** (Milestone + Assigned
To), with the other five groups staying behind the funnel.
- **Remaining gradient-text sites: 38** — next sweep targets per the settled
  no-gradients rule; list is in the CLAUDE.md standing note.

---

## The Community CRM — ✅ SETTLED 11 Aug: (a), the black card wins

Theo picked **(a)** on 11 Aug 2026: `#cr-cc` is THE Community client page; the
five hidden first-build surfaces get ported onto it, then the old build and its
~13 KB of CSS get deleted. Full audit: **`CR_COMMUNITY_AUDIT_2026-08.md`** (24
items; the phase roadmap is at its top). His weighting stands: *"This is the
most important CRM because jobs could sit for a while."*

**Phase 1 shipped at build 705** — the payments door (CR-COM-002 closed): the
black card's Job Menu ends with a Payment Information tile straight into
`openPaymentsPage()`, no suspend, no cream flash.

**Phase 2 shipped at build 706** — the Partner & Property section (CR-COM-006
closed, 001/016 partial, stale-write guard at the new call sites).

**Next, in order, each its own build with its own recon:**
- **Phase 3** — Work Orders on the black card + the `uploadFile` string-checklist
  throw (CR-COM-007).
- **Phase 4** — parity check, then DELETE the cream surfaces + CSS and retire the
  `suspendForTab` detours (CR-COM-001, 020, parts of 003).

**Still open regardless of the port:** Bid Submitted unreachable, 16 jobs at Lead
(004) · OnHold invisible to hub money (005 — the "jobs sit" case) · Job Menu
missing Documents (003) · money precedence (011/012) · partner identity (008).

**Two follow-ups surfaced by the Phase-2 recon (11 Aug), not yet scheduled:**
- `setPartnerForProject`/`setPropertyForProject` persist by whole-checklist
  read-modify-write from the captured row (`index.html` ~31261/~33611),
  bypassing `patchProjectCk`'s build-655 refetch-merge — a stale capture can
  resurrect old checklist state. Migrating them touches the cream rows too.
- The New Bid property dropdown never renders: `loadPropertiesFor` prefers two
  methods that have never existed on the export and falls to a cold cache, so
  even partners WITH properties get the free-text address input.
