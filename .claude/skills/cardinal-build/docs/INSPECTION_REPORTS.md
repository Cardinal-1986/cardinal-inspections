# Inspection & completion reports — the house style and how we make them

*Written 8 Oct 2026 (session `claude/door-estimate-pdf-3yyxqw`). These reports are made **outside
the app**, in a Claude session, from Theo's photos and notes. They are not a CRM feature.*

## The style — "Caroline / Darlene"

The reference is **`Cardinal_2408_Lakeview_Completion_Report.pdf`** (Willie Parson, 2408 Lakeview,
for Caroline Brokaw at Rebuilding Together, made 6 Oct 2026 in ReportLab on Theo's own machine).
Every report since copies it exactly:

| Element | Value |
|---|---|
| Page | **Landscape Letter** (792 × 612 pt), warm off-white `#FAF9F6`, no margins — every page is absolutely positioned |
| Header | 4×18 pt burgundy bar · **CARDINAL** (DejaVu Sans Bold 17) · "ROOFING & RENOVATIONS" · right: `5735 Webster Street · Dayton, Ohio 45414` / `Contact: Theo Dorion · (937) 305-9251` |
| Ink | near-black `#242827` · muted gray-green `#69716E` · **one accent, burgundy `#922F3D`** · rules `#D9DDD6` |
| Titles | **DejaVu Serif**, 24 pt page titles, 30 pt cover title over three lines ("Property / inspection / report") |
| Labels | small bold spaced capitals (7–8 pt, letter-spacing .06em) |
| Photos | **two per page** (344 × 258 pt) or **three** (222 × 262 pt), each with a **burgundy bold label** and a 2–4 line plain caption under it. A finding with no photo takes a photo slot as a text panel |
| Strip | above the footer: burgundy section label + "Homeowner / address / Dayton, Ohio" |
| Footer | thin rule · left "PREPARED FOR …" · right "SCOPE / DATE" · burgundy page number `01` |
| Last page | **Summary & recommendations** — findings left (ROOF / DOORS & BASEMENT / NOT INCLUDED), numbered recommendations right behind a burgundy rule |

**Theo's settled calls on the format (8 Oct 2026):**
- **No "questions she asked" page.** An early draft opened with "Our answers" to the funder's three
  questions; Theo had it removed — "Darlene style with recommendations at bottom".
- **Recommendations go last**, on the summary page, never first.
- **Out-of-scope but bad → still recommend it, labelled as outside the funded scope** (the 215
  Siebenthaler front porch: "not leaking, but in poor condition").
- **Free community work is written in the report, not the estimate** — "I still do community things
  for free, doesn't need to be on estimate" (Darlene's rear siding leak).

## How we make one (the procedure that worked)

1. **Collect** from Theo: homeowner name (confirm spelling — two names were wrong first time this
   session), address + zip, who it is *prepared for*, the photos, and his findings in a few words.
2. **Take the inspection date from the photos' own EXIF**, not from memory — and never backdate.
   This session Theo asked for "a week ago" and then "September 31st" (a day that does not exist);
   every photo carried `2026:10:07`, and the reports say **October 7, 2026**. A report whose date
   disagrees with its own photographs fails the first person who checks, and on a grant document
   that costs more than the job. If the request date matters, add a true line ("Requested Sept 22").
3. **Pick photos** — skip blurry ones and near-duplicates, and say which were skipped. Group by area:
   overview → shingles → chimney/vents/penetrations → leaks inside → attic → edge/gutters → doors →
   windows/basement → out-of-scope → summary.
4. **Captions say only what the photo shows.** Anything Theo stated (a leak, "spaced decking requires
   redeck", "sticks hold the sashes up") goes in as fact; anything only *seen* in a photo is worded
   carefully and he checks it. Never assign left/right/which-room unless he said so.
5. **Funder scope is stated twice**: in the cover paragraph and under NOT INCLUDED (e.g.
   "main roof and back roof only; not the porch or detached garage, per the funding source").
6. **Build**: `scripts/reports/build_report.py spec.json out/` (see `example_spec.json`), then print
   with Chromium: `chrome --headless --no-sandbox --no-pdf-header-footer --print-to-pdf=out/X.pdf file://…/out/report.html`.
   **Look at every page** (screenshot each `<section>` with Playwright) before sending.
7. **Shrink the photos before printing** — `node scripts/reports/shrink_photos.mjs img/ img_small/`
   (1600 px, JPEG q0.80; use 1400 / 0.72 if still big). Full-size phone/drone photos made 21–22 MB
   PDFs; shrunk, 6.0–6.6 MB with no visible loss. **This matters because of the CRM upload limit below.**
8. **Attach an estimate** if asked: `python3 -I scripts/reports/merge_pdf.py out.pdf report.pdf estimate.pdf`
   (pypdf is not installable in the cloud container; this merger handles classic-xref PDFs such as
   Chromium's and Invoice2go's). **Check the estimate agrees with the report** — Darlene's Invoice2go
   estimate #889 was dated 9/28, before the inspection, and did not price the chimney fix the report
   recommends. Flag it; do not edit Theo's estimate.

## Getting a report into the client profile — the feature ALREADY EXISTS

**Client profile → Job Menu → Files → "Upload files"** (`#docsView`, `addJobFiles()` in
`index.html`). It stores the file as a `File: <name>` row in `inspection_reports`, base64 inside the
`html` column, visible to the whole team. **Limit: 10 MB per file** (`f.size > 10*1024*1024` →
"skipped — over the 10 MB limit"). That limit, not a missing feature, is what blocked the first
upload attempt — hence step 7. **Do not build a second upload.**

A cloud session cannot upload for Theo: storage writes need a signed-in user or the service key
(held in Vercel), and a database row pointing at a file that is not there is worse than no row.

### Proposed, NOT built — waiting on Theo
- **Move Files uploads to Supabase Storage** (the private `photos` bucket already accepts
  `application/pdf` up to 25 MB, RLS-gated). Lifts the 10 MB cap and stops whole files living in
  table rows. One real build + SQL, reviewed before it ships.
- **Spark as the nightly backup copy only** — never the primary home. Theo asked "what if we stored
  them on the Spark": it would make the Spark a live dependency (settled rule, `DGX_SPARK_ILLUSTRATIONS.md`),
  need an inbound door into his machine, and leave one copy in one building. The CompanyCam archive
  pattern (`spark/fetch_companycam.py`) is the shape for a backup.

## Tools (all in `scripts/reports/`)
| File | Does |
|---|---|
| `build_report.py` | JSON spec → report HTML in the house style. Never invents a finding |
| `example_spec.json` | Every field, with placeholder data — copy it |
| `shrink_photos.mjs` | Downscale a folder of photos with Chromium's canvas (no PIL in the container) |
| `merge_pdf.py` | Append PDFs (report + estimate) without pypdf |
