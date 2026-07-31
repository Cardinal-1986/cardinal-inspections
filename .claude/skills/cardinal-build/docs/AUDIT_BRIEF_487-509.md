# Audit brief — builds 487–509, AI Inspections

> **Hand this to a fresh cloud session.** Written 31 July 2026 by the session that
> shipped 483–486, at `main` = `5c19a8e`, app stamp **build 509**.
>
> **This is a brief, not a finding.** Everything below marked ⬜ is *unverified* — I
> ran out of context before auditing it. Nothing here says the code is wrong. It
> says these are the places a 37-agent audit already found real hazards, and
> nobody has checked whether the new builds walked into them.

## Start here

Read `OPEN_ITEMS.md §0` first — it carries the audit those hazards came from.
Then answer the four questions below **before** building anything new.

---

## The numbering diverged from the plan

`OPEN_ITEMS §0` planned 487 = AI sort, 488 = shot lists, 489 = Save PDF,
490 = General Exterior template. **That is not what shipped.** Measured:

| build | what actually shipped |
|---|---|
| 487 | documents-list contrast fix (the `td.dates{color:#333}` bug) |
| 488 | updates panel was printing raw `\uXXXX` escapes instead of emoji |
| 489 | three greys strengthened |
| 490 | *"Groundwork for sorting photographs… nothing to see on screen yet"* |
| 491–509 | ⬜ **not examined** |

So the AI sort starts at **490**, not 487, and the plan's build numbers no longer
map to anything. **Do not assume a build number means what §0 says it means.**

## What is verified present

- CompanyCam back end intact: `api/companycam.js`, `-sync.js`, `-status.js`, and
  all three `.sql` files, unchanged in shape.
- Build 486's picker fully intact: `#rccBtn`, `#rccPanel`, `cr-rcc-styles`,
  `rccFile()`, `rccGate()`, `_rccGen++` — one occurrence each.
- **`api/sortphotos.js` exists** — 25 routes, was 24. This is the AI sort route,
  under a different name than the plan's `api/report-sort.js`.
- `setAside` appears 4× in `index.html` — the tray concept exists.

## What is verified ABSENT

- `cover_candidate` — **0 occurrences.** The cover-photo field from the design is
  not there. Either it was dropped, renamed, or not built yet.
- Shot lists — no sign. `QI_SHOTS` (2×) is the pre-existing quick-inspection list.

---

## ⬜ The four questions, in priority order

Each comes from a hazard the audit **confirmed** by reading the code. They are not
speculation, and they are not a claim that the new code is broken.

**1. Does `api/sortphotos.js` invent a fourth section vocabulary?**
`api/organize.js:8–14` already defines sections as numeric **3–8** and **502s**
outside that range. `severity` exists elsewhere as `crit`/`warn`/`ok`. `trade`
overlaps `EST_TYPES` keys (`index.html:16751`). Shipping a fourth vocabulary under
a colliding name is this file's documented *"new mechanism beside an existing one"*
failure. Check what `sortphotos.js` emits and whether the client whitelists it —
the `normStage` lesson is that an unrecognised value becomes a **silent default**,
not an error.

**2. Does anything mount a second control after the summary heading?**
`wireSummaryDraftButton` (~17045) mounts with `insertAdjacentElement('afterend', …)`.
`serializeFrame` (~17717) removes it by testing **a single node**, while stripping
the `data-wired` guard unconditionally. **A second `afterend` control removes the
wrong one and compounds one copy per save/open cycle** — the report grows a button
every time it is opened. Also `EDITABLE_SELECTOR` contains
`'[data-cardinal-summary-heading] + p'`, an adjacent-sibling combinator that only
matches because `lockTemplate` runs *before* that button mounts; anything inserted
afterend earlier **silently kills contenteditable on that paragraph.**

**3. Is the `_rccGen` guard used across the new awaits?**
`closeEditor()` sets **nothing** synchronously — `srcdoc=''`, `current=null` and the
class removal all run *after* `await saveCurrent()`. Re-reading
`frame.contentDocument` therefore cannot tell you the editor is closing. Build 486
added `_rccGen`, bumped as `closeEditor`'s first synchronous statement, for exactly
this. One Gemini call per photo multiplies that window by N. **Unlisted sites that
already have this bug**: `processAssistPhoto` (~17326) and `sendAssistNote` (~17358)
write post-await with no revalidation, and `wireReanalyzeButtons`' handler (~16985)
closes over **elements**, invisible to a `frame.contentDocument` grep.

**4. Why does `lockTemplate(doc);` appear 3 times?**
Build 486 shipped **2** — the original in `frame.onload` and one added at the end of
`placePhotoInSection`. There is now a third. It may be a legitimate caller for bulk
sorting (`placePhotoInSection` re-runs `wirePhotoFrames` + `wireReanalyzeButtons`
per photo, so a bulk path *should* place all then wire once). Or it may be a
duplicate. **Establish which.**

---

## Also outstanding, unrelated to 487–509

**The librarian never draws diagrams.** Diagnosed but not fixed. The machinery is
complete and correct — `lbRich` splits on blank lines → `lbBlock` matches
`/^~~\s*(stack|flow|bars|pitch|photos)\b/` → `lbDiagram` draws SVG — and the prompt
*does* state the blank-line contract the renderer needs.

**The prompt talks itself out of it.** `api/librarian.js` ~line 150 grants one
permission then attaches seven discouragements. Two are decisive on their own:

- *"A diagram may ONLY restate something the prose already says"* — makes every
  diagram redundant by construction, so a model weighing "is this worth it" says no.
- *"If the answer is values that vary by one thing, a TABLE is better"* — routes
  most roofing answers (pitch multipliers, wind ratings, spacing, coverage) to a
  table. That is what roofing answers *are*.

**Run this test first, before touching anything:** feed the prompt's own example
(`~~stack\nAsphalt shingles\nSynthetic underlayment\n…`) through the shipped
`lbRich()` and confirm it returns SVG. That separates *"renderer broken"* from
*"model never emits"*. **Do not touch the renderer until that test says to.**

If the renderer is exonerated, rebalance the prompt: drop *"may only restate"*,
narrow the table preference to genuinely tabular data, and replace *"when it
genuinely helps"* with a positive trigger — *"when the answer describes a layered
assembly, an ordered sequence, or a slope, draw it."*

---

## Waiting on Theo — do not nag

- Five community partners with no `contact_email`: **Kitty Hawk Realty (HAS A LIVE
  JOB)**, C.G. Egli, CityWide Development, County Corp, James Construction.
  **Never guess one** — a bid to a guessed address is a lost bid.
- `GOOGLE_MAPS_API_KEY` — **referrer-restrict in Google Cloud FIRST.**
- **Build 486 has never been used on a real phone with real photographs.** That
  verification is still outstanding.

## Settled, do not re-litigate

Both in `OPEN_ITEMS §0` with reasoning: the General Exterior section list (ten
sections, confirmed verbatim), and the sort route is **signed-in, not admin-only**
— with its accepted cost recorded, that a rep's AI-drafted findings can reach a
client without Theo seeing them first.

## A correction the previous session owes

I told Theo *"a template is a section list plus a trade map — data, not code, so
General ships alongside Roof at no real cost."* **False.** There is exactly one
inspection report template (`REPORT_TEMPLATE`, ~163 KB); `GENERAL_TEMPLATE` is a
**repair estimate** and the General Checklist has **zero** file inputs. A General
Exterior report is its own build. I inferred it from my own mockup instead of
checking the app.
