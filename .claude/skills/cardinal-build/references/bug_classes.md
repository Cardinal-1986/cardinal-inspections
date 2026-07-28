# Recurring bug classes — signatures and fixes

*Snapshot at build 334. If the project's `BUG_CLASSES.md` is in context, read that instead — it's the live version.*

Every entry cost at least one build. Scan before debugging; skim before shipping.

## A. The expensive lesson: things that look missing are usually buried

Three separate "missing features" were fully built and merely unreachable:
- "New Manual Estimate does nothing" → handler was a dev stub pointing at a long-deleted duplicate (314)
- "Nowhere to attach photos" → `#cr-pae-actionbar` at `bottom:0; z-index:80` under `#pwaNav` (z-9990) — a working Attach button buried since the nav was introduced (325)
- "Punch items go nowhere" → a complete module mounting after insurance-era anchors hidden on every profile, rendering perfectly into the void (333)

**Procedure: grep for the feature name AND its mount anchor. Ask "does this element still exist?" — not "does this code exist?"**

## B. Testing and gates

- A green gate proves nothing until it has been seen to fail — a stale file with none of the fix staged green (330). Negative-control against the previous build; assert on the artifact you wrote.
- A harness seeded from your own assumption validates fiction (×3: re-typed preview bug; `.jabox` tiles that never existed vs the real `.jatile` grid; `communityHubView` set on null because the hub creates it at `show()`). Replicate the real builder; navigate the way the app navigates.
- Programmatic clicks succeed on hidden elements — prove visibility structurally.
- Mocks get overwritten by the app's async boot — lock with `Object.defineProperty(w,'supa',{value:mock,writable:false})`.
- Print honest labels — the PASS/FAIL print and the failure counter must read the same boolean.
- Module resolution follows the script's directory — a gate in `/tmp` can't `require('jsdom')` and its crash reads like a test failure.

## C. Patching mechanics

- Splice helpers don't expand backreferences — literal `\1` destroyed five CSS rules while a fragment gate passed on the wreckage. Whole-string assertions; `re.sub` for backrefs.
- Anchors must match real whitespace — print `repr()` of the real text first; a space-for-newline mismatch aborts (safely, but costs a round).
- Recon regexes need bounds — `[^{}]` can't cross a brace; unbounded `[\s\S]*` on 2 MB backtracks until timeout. Use `[\s\S]{0,N}` or `find()` + slicing.
- **Document-level anchors are never unique** — contract iframe templates embed complete HTML documents; `</body>` occurs 9×. Use `rfind()` when appending; `patch_lib.sub` will refuse the ambiguity — don't loosen the count, pick a better anchor.
- Overwriting `window.Cardinal*` silently kills the loser's callers (nine AI-estimate call sites died). Merge with `Object.assign(window.X || {}, {...})`.
- Raw surrogate escapes mid-write can zero out a file — HTML entities (`&#127919;`) and atomic writes.
- CI regexes matching bare `<script>` miss module scripts tagged with `id=` — check all inline blocks and all API files.

## D. Layout and CSS

- **Dead layout serving hidden elements**: 150–170px of padding reserved for buttons another rule hides with `!important` — invisible until surrounding layout changed, then every name wrapped. When an element is retired, retire the space reserved for it.
- **Inline z-index supremacy strands overlays**: a view at inline z-155 put menus (95) and sheets (150) behind the page. If it sits below the header spatially it doesn't need stacking supremacy — lower it. Beating an inline z-index with `!important` is the one sanctioned `!important`.
- **Anything `position:fixed` near the bottom must clear `#pwaNav` (z-9990)**: the pattern is `bottom: calc(104px + env(safe-area-inset-bottom, 0px)); z-index: 9995`.
- **Trapped in the wrong stacking context** (menu inside a z-90 header vs a z-155 view): reparent to `<body>`.
- **Legacy per-claim themes fire only with a client open** — correct home + wrong client page is the signature. Grep `body.claim-` before trusting any chrome fix.
- **Translucent warm tints over cool dark grounds compute to grey** (13% amber over `#434e5c`). Solid values on dark iron.
- **Duplicate `<style id=>` blocks** shadow nothing and confuse every future grep — append to the existing block. (Mechanically caught by `check_build.py`.)
- **Timid visual increments read as ignored requests** — preview labeled options in a real mock, ship the pick as a fixed value.
- **Retail's override layer meets unpainted corners one screen at a time** (invisible subnote, white panel, white overscroll, light popup — all the same bug). Permanent fix is retail-B, not another override — **and the layer passed its 15-rule tripwire at 21 rules (build 334)**. Inventory before deleting: OPEN_ITEMS §2 has the greps.
- Modal CSS scoped to mount points must not be appended to `document.body` (white screens). Hide the base in CSS, not JS.

## E. Runtime and lifecycle

- **Adopted nodes die on `innerHTML =`** — record parent + nextSibling; release home before every wipe and on every exit path, including the observer-driven one.
- **Suspension anchors to a captured id**, never a `loadedFor` variable that resets (the observer un-suspends instantly).
- **MutationObserver feedback loops** need re-entrancy guards, content signatures, rAF debouncing; **duplicate observers** fighting over one node need ownership guards and a dedupe pass.
- **Silent async failures**: an undefined function inside an `async` function throws a `ReferenceError` the surrounding `try/catch` never sees. Async flows use `.catch()`; smoke tests run views against a real DOM.
- **`getElementById` on duplicated ids** is safe only for reads scoped to the isolated contract iframes (`restoreVeil`, `estTotal` resolve per-iframe). Never add main-document reads against those names.
- New dashboard views register in **both** `hideAllViews()` and `openProject()`. Don't mount inside `#tab-overview`.
- Never guess a function or selector name — verify against the file, every time.

## F. Data and money

- **Money has one chokepoint**: community totals roll up through `bidAmt(pr)` (`checklist.lead.bid_amount` → accepted-preferred estimate total → 0), feeding the due ladder, calendar, invoicing, partner totals, Analytics. Fix money in the chokepoint, never per-block.
- **Defaults that mean "unknown" become permanent data**: the New Lead form always reset claim type, making every Community/Claims lead typeless. Defaults follow context (`CardinalHeader.crm()`); "unknown" only where the context genuinely doesn't say.
- **Stage labels are render-time only** — never write a translated label back to the stored value.
- **Test data lies convincingly**: "Could not pin this address" was the geocoder correctly failing on a client named `khgikuhjl`. Confirm the data before debugging the code.
- **Some values live only in the database** (the $10M test amount has zero file occurrences) — no code change can fix them; fix the row.

## App conventions that bite

- Duplicate features are the top recurring failure (manual estimates, second gallery, custom PO format, second punch surface, second pricing tool — all near-misses or misses). FEATURES.md first; extend, don't add. **Bids ARE estimates.** Activity/Calendar are the existing surfaces.
- `nextPo()` owns PO numbers at `checklist.po`. `stage_since` must be written on creation. Client name column is **`name`**.
- `project_assigned_rep()` takes `p.checklist`, not `p.id` (RLS-critical). `is_cardinal_admin()` is security-definer. `estimate_line_items` stays unscoped — it's the shared price book.
- Share / email / sign / print → `window.db.create(title, html, projectName, projectId)` → `inspection_reports`. One document pipeline.
- Live back buttons — do not "clean": `galBackBtn`, `commsBackBtn`, `apBackBtn`, `icBackBtn`, `jdBackBtn`, `payBackBtn`, `rlBackBtn`, `tskBackBtn`.
- Owens Corning (Preferred Contractor), not GAF. Duration = Class 3 impact; Duration FLEX/STORM = Class 4; both qualify for the policy discount. Standard warranty 5-yr workmanship; OC upgraded 10-yr/transferable. Habitat for Humanity of Greater Dayton: commercial partnership, logo use permitted.

## Deploy

- SQL first, then index.html. Close and reopen the PWA **twice** (service worker).
- Unique output filename every build (mobile caches repeated names). Bump `v2026-` every build — "the build still shows N−1" costs a debugging round.
