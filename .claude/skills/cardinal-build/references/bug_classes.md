# Recurring bug classes — signatures and fixes

*Snapshot at build 427. If the project's `BUG_CLASSES.md` is in context, read that instead — it's the live version.*

Every entry cost at least one build. Scan before debugging; skim before shipping.

## A. Things that look missing are usually buried

**Four "missing features" were fully built and merely unreachable or plain-looking:**

| Symptom | Real cause | Build |
|---|---|---|
| "New Manual Estimate does nothing" | Handler was a dev stub pointing at a deleted duplicate | 314 |
| "Nowhere to attach photos to an estimate" | A working Attach bar buried under `#pwaNav` (z-9990) | 325 |
| "Punch items go nowhere on the client profile" | A complete punch module mounting to insurance-era anchors hidden on every profile | 333 |
| "Make a team directory" | **A team page already existed** in the burger menu with edit, phone and photos wired to `team_profiles` | 373 |
| "Dark mode isn't there on AI Estimates" | `styleMounts()` force-set `background:'#fff'` **inline, on a timer** — inline beats every CSS rule regardless of specificity. Fix was deleting one line | 378 |
| "The Estimates page doesn't have the new design" | **Two separate Estimates screens.** The menu item named *Estimates* opened a legacy table; the redesign sat behind *AI Estimates* | 379 |

**Procedure: grep for the feature name AND its mount anchor. Ask "does this element still exist?" — not "does this code exist?"**

## B. Testing and gates

- A green gate proves nothing until it has been seen to fail. Negative-control against the previous build; **for bug fixes, reproduce the bug on the old build first** (367 did; the fix was believable because of it).
- **jsdom proves *does this work*, never *does this look right*.** Build 359 shipped a selector that hid the community tab buttons and every structural proof passed — the elements existed, they were just `display:none`.
- **And it is narrower than that: jsdom does not resolve `var()` inside `background`/`border` shorthands** — it returns `rgba(0,0,0,0)`. A control test at 388 proved it: a plain-hex rule from the same stylesheet applied while every `var()`-based rule in that block read transparent, **including code already confirmed working on a real phone.** `getPropertyValue('--x')` works; computed `backgroundColor` from a `var()` does not. **A gate cannot verify that a tokenized colour renders.** For colour work: assert on the CSS text, negative-control, and say plainly that Theo's eyes are the gate.
- **A single-form regex undercounts silently.** Version strings use **two** separators (space ×9, middot U+00B7 ×11 — 20 total, 5 builds); two separate audits reported low numbers and **build 148 was invisible to both** because it only appears in the middot form. Enumerate variants before counting.
- **A gate comparing a set cannot tell you *which* member changed.** The label gate passes when only a plugin footer was bumped and the app stamp was not — see `references/invariants.md` for the truth table. Fix owned by a parallel session; do not edit `check_build.py` for it.
- **Grep the whole file for every occurrence of a selector before patching it, and count with a lexer.** Bare regexes over 2.5 MB produced most of the wrong claims on this project — comments and strings lie in both directions. Use `scripts/jslex_count.py` (code/string/comment states) and `scripts/selector_audit.py`. **Scope assertions to the function, not the file**, and prefer self-computing assertions over hardcoded counts.
- **Count the rules that actually win, not the ones you found first.** `.acthead` had **four** definitions — two adjacent (both patched, both dead) and the real winner ~39,000 lines later in `cr-hd2-styles`. Source-order reasoning over two rules shipped a silent no-op. **Run `scripts/selector_audit.py` before patching any selector.**
- **Roughly half of all red gates are the test's fault, not the app's.** Before "fixing" anything, ask which is wrong. Seen: assertions on behaviour deliberately changed, a regex missing a trailing semicolon, an em-dash assumed illegal in filenames, a marker string that already existed in the previous build.
- **Spies must target what the code actually calls** — the legacy router calls captured originals, not `window.showHome`. Observe the DOM result instead.
- **Re-bind mocks after boot** — the app nulls `sb` when `TEAM` is false at parse time. **Lock mocks** against the async boot nulling `supa`.
- **Re-query after a re-render** — a held node reference reports a false failure; it was replaced, not broken.
- **Stage on the exit code**, never on eyeballing. **Watchdog every harness** — a hung boot looks like a slow one.
- A harness seeded from your own assumption validates fiction (`.jabox` that never existed vs the real `.jatile` grid; `communityHubView` null because the hub creates it at `show()`).
- Keep gate scripts beside the modules — module resolution follows the script's directory.

## C. Patching mechanics

- Splice helpers don't expand backreferences — literal `\1` destroyed five CSS rules. Whole-string assertions; `re.sub` for backrefs.
- Anchors must match real whitespace — print `repr()` first.
- Recon regexes need bounds — `[^{}]` can't cross a brace; unbounded `[\s\S]*` on 2 MB backtracks until timeout.
- **Assertion windows must fit the rule.** `src.split(sel)[1][:900]` missed a declaration 1,000 chars into a long variable block and reported a false failure. Slice to the closing brace.
- **Count assignments, not mentions.** `window.CardinalCommunityHub` appears 29 times and is *assigned* once — asserting on the raw count fails for no reason.
- **Document-level anchors are never unique** — `</body>` occurs 9× (contract templates carry their own). Use `rfind()`.
- Overwriting `window.Cardinal*` silently kills the loser's callers. Merge with `Object.assign(window.X || {}, {...})`.
- **Verify div nesting after structural edits.** A patch that moved panels left one pane `+1` div and another `−3`; the browser swallowed whole sections while every syntax check passed. Count `<div>` vs `</div>` per region, or rebuild the file clean.
- Raw surrogate escapes mid-write can zero out a file — HTML entities and atomic writes.
- CI regexes matching bare `<script>` miss module scripts tagged with `id=`.

## D. Layout and CSS

- **An attribute selector matches every element carrying it.** `#cr-ch2 [data-pane]{display:none}` hid the panes *and the tab buttons*, because tabs carry `data-pane` too. Scope to the structure: `#cr-ch2 > div[data-pane]`.
- **Style the element that holds the children, not its wrapper.** The gallery rule targeted `#historyMount` when the cards live in `.projgrid` inside it — it made the wrapper a flex item and changed nothing visible (357 → 365).
- **`@media` keys off the browser viewport, not a preview frame.** A mock with a Desktop/Mobile toggle needs `body[data-w="mobile"]` rules duplicated alongside the media query, or the toggle lies.
- **A modal's `body{overflow:hidden}` outlives the modal.** Navigating away without closing it leaves the whole app unscrollable — `hideAllViews()` releases it (364).
- **Translucent warm tints over cool grounds compute to grey; light gradient stops over light cards compute to nothing.** The calendar watermarks read pale until the stops deepened — and the real fix was making the **card dark**, not the art brighter.
- **When a theme flips, flip the text with it.** Dark-brown labels and near-black counters survived the light→dark move and simply vanished (362, 371). Sweep every child colour, not just the container.
- **Inline styles beat every CSS rule regardless of specificity.** `styleMounts()` force-set `background:'#fff'` inline on a timer; no stylesheet could win (378). When CSS "doesn't apply", grep the JS for `.style.` on that element **before** writing a stronger rule.
- **The global page ground is its own surface.** `--bg` was never theme-aware; every page only looked right because its cards covered the viewport. Pages that don't fill it (Photo Activity, empty states) expose it (386).
- **Style the element the value is actually on.** `.pcount` renders **below** the coloured circle, on the card — not inside it. It must theme; the letter inside the circle must not (381).
- **Not every light-coloured thing on a dark ground is a gap.** Ask: is it (a) hidden (`.dashcard`, `display:none` since 352), (b) chrome with its own token system (`#cr-hd2-ribbon`), or (c) deliberate contrast (the paper-on-iron calendars)? Only then is it a gap. Three false alarms in one session.
- **Semantic colours must not be tokenized** — milestone circles, status spines, urgency red, CRM badges, the lavender PO, photo captions, chrome blacks. Full list in `references/theming.md`. More than one build was spent re-learning this.
- **When an override beats a token:** only when dark and light need *genuinely different designs*, not one design in two palettes. The calendars (387) are the single sanctioned case. Not licence to reach for overrides generally.
- **Dead layout serving hidden elements** — when an element is retired, retire the space reserved for it.
- **Anything `position:fixed` near the bottom must clear `#pwaNav` (z-9990).** Inline z-index supremacy strands overlays; if a view sits below the header spatially, lower it rather than out-stacking.
- **Duplicate `<style id=>` blocks** shadow nothing and confuse every future grep — append to the existing block. (Mechanically caught by `check_build.py`.)
- **A module capped at a phone width with no media queries is a rebuild, not a patch.** Community home was `max-width:680px` with zero `@media` — that *was* the desktop empty-space complaint.
- Modal CSS scoped to mount points must not be appended to `document.body` (white screens). Hide the base in CSS, not JS.

## E. Runtime and lifecycle

- **Two systems listening to the same event will fight, and the later one wins.** Two history routers both handled `popstate`; the modern one restored the right view and the legacy one immediately called `showHome()`. Guard by ownership: `if(e.state && e.state.app === 'cardinal-nav') return;` (367)
- **Read-after-write across modules is a race.** The CRM chip re-read `body[data-crm]` right after routing, before the header updated it, so the switch looked dead until a second click. **Set the state you own first, then route.** (369)
- **Resolve-or-hide must run after everything has parsed.** The banner hid Photos because it checked for the opener before that module loaded — defer to `DOMContentLoaded`.
- **Observers for one small job are usually the wrong tool.** A MutationObserver watching the whole body to toggle one button became a cheap on-open check instead.
- **Adopted nodes die on `innerHTML =`** — record parent + nextSibling; release home before every wipe and on every exit path.
- **Suspension anchors to a captured id**, not a variable that resets.
- **Silent async failures**: an undefined function inside an `async` function throws a `ReferenceError` the surrounding `try/catch` never sees.
- **Deleting markup can break boot listeners.** Legacy static rows had unguarded listeners attached at startup; removing them would have crashed the app. **Hide them instead and say why.**
- **New full-screen views need registering in `hideAllViews()` *and* a history restore case.**
- `getElementById` on duplicated ids is safe only for reads scoped to the contract iframes (`restoreVeil`, `estTotal`).
- Never guess a function or selector name — verify against the file, every time.

## F. Invariants — silent corruption

Full list with verified figures in `references/invariants.md`. The headline: **`normStage()` is a whitelist that silently returns `'Lead'`** for anything unrecognised, so `STAGES` must contain a value **before** any row is given it — ship the whitelist in its own commit, before the writer, or every affected job renders as a brand-new lead with no error. Also: never mutate `estimates.photos` (signing corrupts the record permanently); **43 `.single()` / zero `.maybeSingle()`**; **one scroll lock, 13 modules, no reconciler — do not add a 14th writer** (recurred three times); adding `await` to a sync function is never local; palette tokens need literal fallbacks.

## G. Data and money

- **Money must have one chokepoint.** Fix money in `bidAmt()`, never per-block.
- **One pipeline per concept.** Punch has exactly one data layer (`CardinalPunch`); bids have one form; documents have one download helper. **A second is always a bug.**
- **Columns that don't exist yet must fail loudly and partially.** The punch writer retries without `scheduled_at` / `photos` and tells the user what couldn't be stored, rather than losing the whole save.
- **Defaults that mean "unknown" become permanent data** — defaults follow context (`CardinalHeader.crm()`).
- **A bad write becomes a persistent gate.** `currentBuild()` returned 406 once; the watermark stored it; `406 > 406 = false` disabled What's New **for everyone, forever**, with no error anywhere. When a computed value feeds a monotonic comparison (watermarks, `lastSeen`, high-score gates), a single wrong write silently latches. Fixed by 428's `data-cr-footer`.
- **Stale fallback content is worse than no content.** With `CHANGELOG` capped at 342, the modal's `slice(0,5)` fallback permanently showed retired-palette copy as if current. A fallback that can serve outdated truth needs a date or a version check, or it should say nothing.
- **Stage labels are render-time only** — never write a translated label back to the stored value.
- **Name-matching is not a data model.** Community partner colours match on name, so a rename or a new partner reads neutral. Store the attribute on the record.
- **An empty list and a failed read look identical to the user.** Both showed "No client projects yet," which read as data loss. Distinguish them.
- **Test data lies convincingly.** Confirm the data before debugging the code. Some values live only in the database — no code change can fix them.

## App conventions that bite

- Duplicate features are the top recurring failure. FEATURES.md first; extend, don't add. **Bids ARE estimates.** Activity and Calendar are the existing surfaces. **No fourth community tab** — Bids / Partners / Clients are the three nouns of the work.
- `nextPo()` owns PO numbers at `checklist.po`. `stage_since` written on creation. Client name column is **`name`**.
- `project_assigned_rep()` takes `p.checklist`, not `p.id`. `is_cardinal_admin()` is security-definer. **`estimate_line_items` stays unscoped** — it's the shared price book.
- Share / email / sign / print → `window.db.create(...)` → `inspection_reports`. Downloads go through `CardinalDownload` and save as **standalone `.html`, not true PDF** — a real `/api/pdf` endpoint is still unbuilt.
- **Header title is 40px, solid `var(--hac)`** (373) — supersedes the fixed-34px decision from 322. **Client cards carry no cover photo** (370); `cover_image` still feeds the client profile header, a different feature.
- **No auto-archive on estimates** — accepted estimates stay in their lane.
- Live back buttons — do not "clean": `galBackBtn`, `commsBackBtn`, `apBackBtn`, `icBackBtn`, `jdBackBtn`, `payBackBtn`, `rlBackBtn`, `tskBackBtn`.
- Owens Corning (Preferred Contractor), not GAF. Duration = Class 3; FLEX/STORM = Class 4; both qualify for the policy discount. Standard warranty 5-yr; OC upgraded 10-yr/transferable. Habitat for Humanity of Greater Dayton: logo use permitted.

## Deploy

- SQL first, then index.html. Close and reopen the PWA **twice** (service worker).
- Unique output filename every build; **retire the superseded file from outputs** so only one candidate is ever visible.
- Bump `v2026-` every build.
