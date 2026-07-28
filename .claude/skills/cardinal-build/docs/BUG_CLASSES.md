# Cardinal Resource App — Bug Classes

**Failure modes already paid for. Every entry cost at least one build.**
*Read before debugging; skim before shipping. Current at build 388.*

---

## A. Things that look missing are usually buried

**Four "missing features" on this project were fully built and merely unreachable or plain-looking.** This is now the single most likely explanation when something appears absent.

| Symptom | Real cause | Build |
|---|---|---|
| "New Manual Estimate does nothing" | Handler was a developer stub pointing at a deleted duplicate | 314 |
| "Nowhere to attach photos to an estimate" | A working Attach bar buried under `#pwaNav` (z-9990) | 325 |
| "Punch items go nowhere on the client profile" | A complete punch module mounting to insurance-era anchors hidden on every profile | 333 |
| "Make a team directory" | **A team page already existed** in the burger menu with edit, phone and photos wired to `team_profiles` | 373 |
| "Dark mode isn't there on AI Estimates" | `styleMounts()` force-set `background:'#fff'` **inline, on a timer** — inline styles beat every CSS rule regardless of specificity | 378 |
| "The Estimates page doesn't have the new design" | Two separate Estimates screens; the menu item named **Estimates** opened a legacy table, while the redesign sat behind **AI Estimates** | 379 |

**Procedure:** before building, grep for the feature name *and* its mount anchor. Ask "does this element still exist?" — not "does this code exist?"

---

## B. Testing and gates

- **A green gate proves nothing until it has been seen to fail.** Negative-control every gate against the previous build; for bug fixes, **reproduce the bug on the old build first** (367 did; the fix was believable because of it).
- **jsdom proves *does this work*, never *does this look right*.** Build 359 shipped a selector that hid the community tab buttons and every structural proof passed — the elements existed, they were just `display:none`. For pure-CSS changes, assert on the **CSS text** and let Theo's eyes be the gate.
- **Roughly half of all red gates are the test's fault, not the app's.** Before "fixing" anything, ask which is wrong. Seen this session: assertions on behaviour we deliberately changed (card tap, scheduled items, the photo requirement), a regex missing a trailing semicolon, an em-dash assumed illegal in filenames, and a marker string that already existed in the previous build.
- **Spies must target what the code actually calls.** The legacy history router calls captured originals, not `window.showHome` — a spy on the global saw nothing and "proved" a bug fixed that wasn't tested. **Observe the DOM result instead.**
- **Re-bind mocks after boot.** The app nulls `sb` when `TEAM` is false at parse time, so a mock installed in `beforeParse` is gone by the time a handler runs. Set `w.sb = w.__mockChain` after boot.
- **Re-query after a re-render.** Holding a node reference across a render and asserting on it reports a false failure — the node was replaced, not broken.
- **Stage on the exit code**, never on eyeballing the output. `if [ $NEW -eq 0 ] && [ $PREV -eq 0 ]`.
- **Watchdog every harness.** A hung jsdom boot looks identical to a slow one; a 30s timeout that prints `GATE TIMEOUT` saves the round.
- Keep gate scripts beside the modules — module resolution follows the script's directory.

---

## B2. What the gates can and cannot see (learned the hard way, 388)

- **jsdom does not resolve `var()` inside `background` / `border` shorthands.** It returns `rgba(0,0,0,0)`. A control test proves it: a plain-hex rule from the same stylesheet applies correctly, while every `var()`-based one in that same block reads transparent — **including code already confirmed working on a real phone.** So a functional gate can verify *structure* (element exists, class applied, attribute set) and *directly-read* custom properties via `getPropertyValue()`, but **cannot verify that a tokenized colour actually renders.** For colour work: assert on the CSS text, run the negative control, and say plainly that Theo's eyes are the gate. Do not report a green jsdom run as proof the colour is right.
- **`getPropertyValue('--x')` works; computed `backgroundColor` from a `var()` does not.** This is why the `--bg` and calendar gates passed honestly and the `.actbox` gate could not.
- **Count the rules that actually win, not the ones you found first.** `.acthead` had **three** definitions — two adjacent (both patched, both dead) and the real winner ~39,000 lines later in `cr-est-fix-styles` (build 352). Source-order reasoning over two rules shipped a silent no-op; only the functional gate caught it. **Grep the whole file for every occurrence of a selector before patching it.**

## B3. Not every light-coloured thing is an unswept gap

Three items flagged as "never got the dark treatment" turned out to be nothing:
- **`.dashcard`** (the "hardcoded white ribbon") — hidden by `#mainView .dashcard{display:none}` since 352. Dead markup, kept on purpose because deleting markup with boot listeners has broken the app before.
- **The visible clock/date ribbon** (`#cr-hd2-ribbon`) — part of the **header chrome**, which has its own per-CRM token system (`--hbg`/`--hac`/`--tgrad`) independent of the page theme. Dark chrome framing a light page is the design, not a gap.
- **The calendars** — a deliberate **paper-on-iron** design. Cream cells on the dark ground is *why* they read correctly in dark mode. Tokenizing would have destroyed a working design.

**Before "fixing" a light element on a dark ground, ask whether it is (a) hidden, (b) chrome with its own system, or (c) deliberate contrast.** Only then is it a gap.

## B4. When an override beats a token

Tonight's rule was tokens everywhere — one variable, both themes. **The exception is when dark and light need genuinely different designs, not the same design in two palettes.** The calendars (387) are the only case: scoped `:root[data-theme="rb-light"] .teamcal ...` overrides, leaving the dark original byte-for-byte intact. Tokenizing there would have been the wrong tool. This is not licence to reach for overrides generally — retail-B was torn out at 21 rules for exactly that reason.

## C. Patching mechanics

- **Splice helpers don't expand backreferences.** Use `re.sub` for backrefs; whole-string assertions otherwise.
- **Anchors must match real whitespace.** Print `repr()` first.
- **Recon regexes need bounds.** `[^{}]` can't cross a brace; unbounded `[\s\S]*` on a 2 MB file backtracks until timeout.
- **Assertion windows must fit the rule.** `src.split(sel)[1][:900]` missed a declaration 1,000 chars into a long variable block and reported a false failure. Slice to the closing brace instead.
- **Count assignments, not mentions.** `window.CardinalCommunityHub` appears 29 times and is *assigned* once; asserting on the raw count fails for no reason.
- **`</body>` appears 9 times** — contract templates carry their own. Use `rfind()`.
- **Overwriting `window.Cardinal*` silently kills the loser's callers.** Merge with `Object.assign(window.X || {}, {...})`.
- **Verify div nesting after structural edits.** A patch that moved panels left one pane `+1` div and another `−3`; the browser swallowed whole sections while every syntax check passed. Count `<div>` vs `</div>` per region, or rebuild the file clean.

---

## D. Layout and CSS

- **An attribute selector matches every element carrying it.** `#cr-ch2 [data-pane]{display:none}` hid the panes *and the tab buttons*, because tabs carry `data-pane` too. Scope to the structure: `#cr-ch2 > div[data-pane]`.
- **Style the element that holds the children, not its wrapper.** The gallery rule targeted `#historyMount` when the cards live in `.projgrid` inside it — it made the wrapper a flex item and changed nothing visible (357 → 365).
- **`@media` keys off the browser viewport, not a preview frame.** A mock with a Desktop/Mobile toggle needs `body[data-w="mobile"]` rules duplicated alongside the media query, or the toggle shows the desktop layout crammed into phone width.
- **A modal's `body{overflow:hidden}` outlives the modal.** Navigating away without closing it leaves the whole app unscrollable. `hideAllViews()` releases it (364).
- **Translucent warm tints over cool grounds compute to grey; light gradient stops over light cards compute to nothing.** The calendar watermarks read pale yellow until the stops were deepened — and the real fix was making the card dark, not the art brighter.
- **When a theme flips, flip the text with it.** Dark-brown labels and near-black counters survived the light→dark move and simply vanished (362, 371). Sweep every child colour, not just the container.
- **Dead layout serving hidden elements.** When an element is retired, retire the space reserved for it.
- **Anything `position:fixed` near the bottom must clear `#pwaNav` (z-9990).**
- **Duplicate style-block ids** shadow nothing and confuse every future grep — append to the existing block.
- **A module capped at a phone width with no media queries is a rebuild, not a patch.** Community home was `max-width:680px` with zero `@media` — that *is* the desktop empty-space complaint.

---

## E. Runtime and lifecycle

- **Two systems listening to the same event will fight, and the later one wins.** Two history routers both handled `popstate`; the modern one restored the right view and the legacy one immediately called `showHome()`. Guard by ownership: `if(e.state && e.state.app === 'cardinal-nav') return;`
- **Read-after-write across modules is a race.** The CRM chip re-read `body[data-crm]` right after routing, before the header had updated it, so it snapped back and the switch looked dead until a second click. **Set the state you own first, then route.**
- **Resolve-or-hide must run after everything has parsed.** The banner hid Photos because it checked for the opener before that module loaded — defer to `DOMContentLoaded`.
- **Observers for one small job are usually the wrong tool.** A MutationObserver watching the whole body to toggle one button became a cheap on-open check instead.
- **Adopted nodes die on `innerHTML =`.** Record parent + nextSibling; release home before every wipe **and on every exit path**.
- **Suspension must be anchored to a captured id**, not a variable that resets.
- **Silent async failures**: an undefined function inside an `async` function throws a `ReferenceError` that `try/catch` around the call site never sees.
- **Deleting markup can break boot listeners.** Legacy static rows had unguarded listeners attached at startup; removing them would have crashed the app. Hide them instead and say why.
- **New full-screen views need registering in `hideAllViews()` *and* a history restore case.**

---

## F. Data and money

- **Money must have one chokepoint.** Fix money in `bidAmt()`, never per-block.
- **One pipeline per concept.** Punch has exactly one data layer (`CardinalPunch`); bids have one form; documents have one download helper. A second is always a bug.
- **Columns that don't exist yet must fail loudly and partially.** The punch writer retries without `scheduled_at` / `photos` and tells the user what couldn't be stored, rather than losing the whole save.
- **Defaults that mean "unknown" become permanent data.** Defaults should follow context.
- **Stage labels are render-time only.** Never write a translated label back to the stored value.
- **Name-matching is not a data model.** Community partner colours match on name, so a rename or a new partner reads neutral. Store the attribute on the record.
- **An empty list and a failed read look identical to the user.** Both showed "No client projects yet," which read as data loss. Distinguish them.
- **Test data lies convincingly.** Confirm the data before debugging the code.

---

## G. Earlier classes, still true

- Never guess a function or selector name — verify against the file.
- Hide the base in CSS, not JS.
- Don't mount inside `#tab-overview`.
- Don't duplicate an existing feature.
- `stage_since` must be written on creation.
- `project_assigned_rep()` takes `p.checklist`, not `p.id`.
- Modal CSS scoped to mount points must not be appended to `document.body` (white screens).
- Unicode: raw surrogate escapes mid-write can zero out a file. Use HTML entities and atomic writes.
- CI regexes matching `<script>` miss module scripts tagged with `id=`.
