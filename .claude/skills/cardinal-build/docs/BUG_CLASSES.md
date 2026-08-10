# Cardinal Resource App — Bug Classes

**Failure modes already paid for. Every entry cost at least one build.**
*Read before debugging; skim before shipping. Written at build 427; **classes 12 and 13 added 2 Aug 2026 at build 573; class 14 added 4 Aug 2026 at build 595**. For anything else since 427, read the `CHANGELOG` array in `index.html` — it is the only record that survives work done outside this folder.*

---

## 12. A guard that exists, looks right, and can never once succeed (builds 567 · 569)

**The most expensive class this project has found in one session.** Two functions repainted **on
every animation frame, forever, on every screen**. Both had a guard. Neither guard could ever be
satisfied.

**12a — comparing a source string to a serialization.**

```js
if(chip.innerHTML !== html) chip.innerHTML = html;   // html is a SOURCE string
```

`meta.icon` is inline SVG. A self-closing `<path .../>` **round-trips as `<path ...></path>`**, so
the two are never equal. The author saw the hazard, wrote the guard, and wrote a comment explaining
why it mattered — and it never worked. Confirmed in Chromium: **5 of 5 guarded passes wrote; 0 of 5
after normalising the source through a detached element.**

**12b — comparing against live content another module legitimately rewrites.**

`wxPaint()` wrote the weather strip's `innerHTML` unconditionally. The icon is an **emoji**, so
`metallicize` re-wraps it in `<span class="mic">` by design — measured at 4.3 `replaceChild`/sec on
that exact element. An `innerHTML !==` guard here could never settle either, and the two would fight
forever.

**12c — the no-guard cousin, which is easy to miss.** **Assigning `textContent` emits a childList
mutation record even when the string is identical** — the old text node is removed and a new one
added regardless. 10 identical writes → 10 records; 10 guarded writes → 0. The landing `paint()` had
seven such writes.

**Cost: 388 DOM writes/sec, waking all 50 `document.body` observers every frame.** After: 3.3/sec.

### The fix depends on the neighbours, and the two builds chose OPPOSITE shapes on purpose

| | compare against | why |
|---|---|---|
| `paintChip()` (567) | the **live element**, source normalised through a detached node | so it can still repair a chip another module stomped |
| `wxPaint()` (569) | a **stored signature** of the underlying data | because `metallicize` rewrites that element by design |

**Copying either into the other's place reintroduces the bug.** Ask what else writes to the element
before choosing.

### How to find it — reading the source failed three times

Patch `appendChild` / `insertBefore` / `replaceChild` / `innerHTML` / `textContent` / `className` on
the prototypes **before the app's scripts run**, record `new Error().stack` on every write, and
**sample only past a settle window** so boot writes cannot drown the signal. The top rows name the
culprit with a line number. `loop_probe.js`, session scratchpad.

⚠️ **And beware the sandbox.** 567's probe reported the landing loop fixed. It was — *in an
environment where `api.open-meteo.com` is blocked*, so `wxCached()` always returned null and the
looping function **never executed once**. **When a sandbox cannot reach a dependency, seed its cache
and reproduce the production condition** — do not conclude from the path the sandbox happens to allow.

---

## 13. The close lever must match how the screen is shown (builds 570 · 571 · 572)

`hideAllViews()` is what every navigation calls. A `position:fixed; inset:0` view **not registered
there swaps the page underneath itself and traps the user** — the only way out is that screen's own
×. Missed for **six** screens at once.

**`BUG_CLASSES` already stated the registration rule. What it did not state is that the lever
matters:**

| shown by | screens | close with |
|---|---|---|
| **`display`** (markup, or `MOUNT.style.display`) | `crewsView`, the three `MOUNT_IDS`, `cr-coach-mount`, `cr-adjusters-mount` | `el.style.display='none'` |
| **a CLASS** (`.open`, created at runtime) | `cr-sf`, `cr-pb`, `cr-est-view` | the module's `close()`, **then confirm** |

**Writing `display:none` onto a class-shown element is permanent damage** — its own open path never
clears the inline style, so the screen is dead on the second visit.

**A module's `close()` can no-op without throwing.** It removes the class through the module's own
`view` reference, which is `null` until `ensureView()` has run — so it clears the scroll lock,
returns cleanly, and leaves the screen open. **A `catch` cannot see that.** Confirm:

```js
try{ window.CardinalEstimates.close(); }catch(_){}
if(_ev.classList.contains('open')) _ev.classList.remove('open');
```

**The other half of the convention is `navRestore()`** — registered in `hideAllViews()` but missing
from the history switch means the **back button walks straight past it**.

### The related trap: an inline write beats every rule you can write

Two modules paint `M.style.background='#fff'` in `open()`. **Tokens read dark and the page still
painted white**, and only a **rendered preview** caught it — every stylesheet gate was green.
`styleMounts()` already carries this exact fix with a comment saying so; those modules were never
included. Same family as the `styleMounts()` entry in class A.

### And a self-inflicted one worth naming

**Five gates this session tripped on comments the same patch had just written** —
`normalizeManual`, `openManualEstimate` (×2), `hideAllViews()`, `M.style.background`. A patch
documents the value it changes, so a bare-identifier count finds it in its own explanation. **Scope
assertions to the block, and assert on code *shapes* (`function foo(`, `foo(arg`) rather than bare
names.** All five aborted before any write, which is the design working — but each cost a round.

Related: `M.style.background='#fff';` is **byte-identical** in `cr-coach-script` and
`cr-bpa-script`, so a file-wide count is meaningless. Scope to the block.

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

## 14. The convention was right, and applied to five of six (build 595)

**The inverse of the prime doctrine.** *Things that look missing are usually buried* — but sometimes
the mechanism exists, is correct, is used consistently, and **one member of the set never got it**.
That reads as a mysterious one-off bug, and it is really an inventory gap.

`#projModal` — the **Add project** modal behind the `+` button — is `position:fixed; inset:0` with
**no `overflow` declaration**. Default `visible`: a fixed element that cannot scroll. Its card is
`.projform` at `margin:9vh auto 0`, no bottom margin, no height cap. On a phone the Cancel/Save row
rendered past the fold and there was nothing to drag. Theo could not save a client.

**Every sibling already had the fix:**

| overlay | z-index | `overflow` | card bottom margin |
|---|---:|---|---|
| `#ckModal` | 210 | `auto` | 4vh |
| `#gcModal` | 210 | `auto` | 6vh |
| `#leadModal` | 215 | `auto` | 10vh (`auto` shorthand) |
| `#leadFormModal` | 225 | `auto` | 6vh on its wrapper |
| `#apptModal` | 220 | `auto` | 7vh |
| **`#projModal`** | **200** | **— none —** | **— none —** |
| `#sigModal` | 230 | — none — | 0 (signature pad; different sizing rules, left alone) |

**How to find this class before a screenshot does:** when you fix a layout property on one element,
**enumerate its siblings and diff the property across all of them.** One `grep -n 'position:fixed;inset:0'`
would have surfaced the whole table above in a single pass. A convention held by 5 of 6 is not a
convention, it is five accidents.

### The half that `overflow:auto` does not fix

**A lower-z-index modal is painted over by the installed bottom nav.** `body.standalone #pwaNav` is
`z-index:9990 !important`; `#projModal` is `200`. Adding scroll alone parks the Save button
*underneath* the nav bar — visibly present, geometrically inside the viewport, and untappable.

**So a rectangle check is not proof.** `getBoundingClientRect()` said Save was on screen while the
nav sat on top of it. **Hit-test the control's own centre:**

```js
const el = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
const reachable = !!el && (el === btn || btn.contains(el));
```

On the pre-fix build that returned `pwaLib` — the nav's library button. That single check is the
difference between "the button is there" and "a thumb lands on it."

**Reuse the existing clearance constant, do not invent a gap.** `body.standalone` already declares
`padding-bottom:calc(64px + env(safe-area-inset-bottom))` for exactly this nav. 595 used `64 + 24`.
`.cd-crmbar` uses `104px + safe-area` for the same bar. Grep for the number before choosing one.

### ⚠ Headless Chromium reports every `env(safe-area-inset-*)` as 0

Theo's device is 1320×2868 @3x = **440×956 CSS px**. At a flat 440×956 in headless Chromium the form
very nearly fits and **the bug barely reproduces**. A real notched iPhone loses ~59px of status area
and ~34px of home bar, so the honest viewport is ~440×863 — and there it fails outright. **Subtract
the insets by hand when modelling a phone**, or a height-dependent bug will pass in the sandbox for
the same reason build 567's weather loop did.

### Scope the fix by id — `.projform` is shared by nine screens

The clearance went in as `#projModal .projform{...}`, never onto `.projform` itself. Id + class
out-specifies the shared rule with no `!important` and no risk to the other eight. The gate asserts
the five siblings' computed `margin-bottom` did **not** move.

---

---

# Classes added 29 July 2026

*Updated 29 July 2026 — session of 34 merged PRs, `origin/main @ 202e6f3`, app stamped build 427.*

## 1. The shared global scroll lock

**Severity: high. Has recurred three times.**

13 independent modules write the same global:

```js
document.body.style.overflow = 'hidden';   // lock
document.body.style.overflow = '';         // release
```

Measured on `202e6f3` (lexer-verified, comments and strings excluded):

| Module | Locks | Releases |
|---|---|---|
| `(main)` | 1 | 4 |
| `cr-ce-script` | 1 | 1 |
| `cr-lil-script` | 1 | 1 |
| `cr-ped-script` | 1 | 1 |
| `cr-est-script` | 2 | 2 |
| `cr-epub-script` | 1 | 1 |
| `cr-ri-script` | 1 | 1 |
| `cr-sf-script` | 1 | 2 |
| `cr-pb-script` | 1 | 2 |
| `cr-sol-script` | 1 | 1 |
| `cr-ci-script` | 1 | 1 |
| `cr-sp-script` | 1 | 1 |
| `cr-sc-script` | 2 | 1 |
| **Total** | **15** | **19** |

**Every module is balanced.** No module locks without a release path. That is
worth stating clearly, because it rules out the obvious hypothesis.

### The actual failure mode

There is **no reconciler**. The lock is a single global with no owner, no
reference count, and no reconciliation against "is any overlay actually open".
So it leaks whenever control leaves a function *between* the lock and the
release:

- an early `return` after the lock
- a thrown exception between them
- **an `await` between the user's intent and the lock** ← PR #37
- two overlays open at once; the first to close releases for both

Result: body scroll frozen with nothing on screen to dismiss. Dead until
reload. Intermittent, which is why it reads as "the scrolling is acting up"
rather than a reproducible bug.

### History

| When | What |
|---|---|
| build 214 | `hideAllViews()` gained a stale-lock release — a band-aid for this |
| PR #17 | An `overflow-y:auto !important` outranked the inline lock, so scroll chained through. Removed. |
| PR #37 | `openPreview` became `async` in #23, putting a network round-trip between tap and lock |

### The fix that would end it

A watchdog that clears the lock when no overlay is actually open. Its overlay
list **must be derived from the code**, not guessed — a missing entry would
clear the lock while a real overlay is up, which is worse than the bug. That
derivation is the whole job; the watchdog itself is trivial.

---

## 2. `await` between intent and side effect

**Severity: high. This is the class PR #37 belongs to.**

Making a function `async` inserts a window in which the world can change. Any
side effect after an `await` is acting on a **stale** precondition.

```js
// BEFORE #23 — synchronous, no window
previewEl.classList.add('open');
document.body.style.overflow = 'hidden';

// AFTER #23 — a network round-trip opened a window
var docUrls = await signedPhotoMap(...);   // user can leave during this
previewEl.classList.add('open');
document.body.style.overflow = 'hidden';   // locks a screen nobody is on
```

The fix pattern — **revalidate after the await**:

```js
function _pvStillOpen(){
  var ed = document.getElementById('cr-est-view');
  return !!(previewEl && previewEl.isConnected &&
            ed && ed.classList.contains('open'));
}
if(!_pvStillOpen()) return;
```

Pick a precondition that is genuinely load-bearing. Here the Preview button is
injected into `#cr-est-view .cr-est-head`, so "the editor is open" is a true
precondition — if it closed, the tap is stale by definition.

### Known remaining sites

| Site | Awaits | Risk |
|---|---|---|
| report `openEditor` | `db.get()` — local, milliseconds | same shape, much smaller window |
| `openCategoriesModal` | then `display='block'` | shows a modal on a possibly-gone screen |
| `showBidModal` | then `display='block'` | same |

The estimate builder's `openEditor` is **synchronous**, so the community thread
path is safe.

**Rule of thumb:** when you add `await` to a function that was synchronous, list
every side effect after it and ask what happens if the user left. Adding
`async` is never a purely local change.

---

## 3. Whitelist-silent data corruption

**Severity: high. Silent — no error, no log.**

```js
function normStage(s){
  ...
  return STAGES.indexOf(s) !== -1 ? s : 'Lead';
}
```

Six copies exist; five delegate to this one. Anything not in `STAGES`
**becomes `'Lead'`** with no warning.

So a row written with a stage the whitelist has not learned does not error — it
quietly renders as a brand-new bid request, in the wrong column, with the wrong
age, in the wrong sort position.

> **Ordering rule: `STAGES` must contain a value before any row is given it.**

PR #34 followed this deliberately: it added `OnHold` to the whitelist and
shipped **nothing that writes it**. The writer comes later, on top. That
ordering is not fussiness — reversed, it is a silent data bug across every
affected job.

The same shape applies to `LEGACY_STAGE` (stage aliases) and `IC_SKIP` /
`PIPE_SKIP` (per-CRM visibility). Whitelists and skip maps must be taught first.

---

## 4. Verification anti-patterns — *the ones that cost me the most today*

Not bugs in the app. Bugs in how I measured the app. Every one of these
produced a confident, wrong statement.

### 4a. Counting values inside your own comments

Hit roughly **eight times**. Patch scripts document the values they change, so
a naive count finds the value in its own explanatory comment and reports a
change that did not happen — or a module that does not exist.

**Live example from this hand-off.** Counting scroll-lock writes naively
returned **14 modules**. One was `cr-ch2-styles` — a `<style>` block, matching
text inside *my own PR #17 comment*:

```
   2. Harmful. An !important author declaration outranks a *normal inline*
      declaration, so it defeated the document.body.style.overflow='hidden'
```

### 4b. …but naive comment-stripping eats real code

The obvious fix is worse. A `strip()` that removes everything between `/*` and
`*/` treats `/*` **inside a string literal** as a comment start and deletes
real code after it.

**Same example, opposite error.** Stripping comments returned **10 modules** —
it had eaten genuine lock calls from `cr-pb`, `cr-sol` and `cr-ci`.

So: naive count said 14. Stripped count said 10. **Both were wrong.** The truth
is 13, and only a lexer that tracks strings, template literals and comments as
distinct states gets there. **That lexer is `scripts/jslex_count.py`** — in this repo, runnable
by any program. (An earlier `/agent/workspace/lexscan.js` was the sandbox-only original and is
not reachable; do not go looking for it.)

I had documented hazard 4b in `patch_photos1.js` earlier in the day and then
walked straight into it again.

### 4c. Counting file-wide when the claim is about one function

**The single most repeated mistake of the session.** I made it, fixed it inside
a patch script, then made it *again* in the production verifier for the same
change.

`await signedPhotoMap(...)` appears twice — `publish()` and `openPreview()`.
Asserting `1` file-wide fails a correct patch.

It bit again while writing this hand-off: I pulled `var LABEL = {...}` with a
file-wide regex and got the **insurance** map (`'Lead':'Claim Filed'`) while
documenting **community** (`'Lead':'Bid Requested'`).

**Fix:** extract the function or block first, assert against that.

Genuinely-plural counts you should *not* "fix": `days()` and `daysUntil()` both
anchoring to midnight (2 is right); both community `LABEL` maps being
byte-identical (2 is right); `CH_SORTS` and `CH_GROUPS` sharing key names.

### 4d. Reading counts off an already-patched tree

Run a patch, read a count, use it as the *pre*-patch expectation. Every
absolute number written that way was wrong.

**Fix — self-computing assertions:**

```js
["#1e2432 exactly one occurrence changed",
  n(h, /#1e2432/g), n(orig, /#1e2432/g) - 1],
```

Now the assertion is the invariant ("exactly one changed"), and cannot be
poisoned by a stale reading.

### 4e. Regexes that cannot see what they are looking for

A pattern using `[^;\n]*` cannot match an expression split across lines. I
concluded `cr-epub-script` locked scroll and **never released it** — a serious
finding — when `closePreview` releases via a two-line ternary:

```js
document.body.style.overflow =
(ed && ed.classList.contains('open')) ? 'hidden' : '';
```

My original note ("ternary release") had been right; the regex I wrote to
confirm it was wrong, and I nearly filed a false bug against my own correct
earlier analysis.

### 4f. Extractor bugs that fail quietly

- `grabVar` searching for the next `\n];` swallowed 2,271 characters into a
  later array. Every filter count came back empty — and empty looks like a
  legitimate zero.
- Whitespace **guessed** rather than read: I assumed `.cr-pcard.community`
  spanned multiple lines. It is one line. The anchor silently matched nothing.

**Always print what your extractor captured** before asserting on it.

### 4g. Walking blocks in list order instead of file order

The bytes-outside-changed proof compares regions replaced by sentinels. Walk
them in your own list order rather than file order and you get a false failure
on a correct patch — which trains you to ignore the proof.

### 4h. False positives worth running down, then reporting as such

Three findings that looked real and were not. Reporting a false positive as a
bug is its own failure:

- **`cr-sc-script`: 2 locks, 1 release.** Two *idempotent* locks in one
  function, one release in `close()`. Balanced.
- **"Unguarded `JSON.parse`".** It is `JSON.parse(JSON.stringify(x))` — the
  deep-copy idiom. Cannot throw.
- **"Unescaped `name` in a selector".** `querySelector('[data-sh="' + name +
  '"]')` where `name` is an internal literal from PR #30, not user data.

---

## 5. Ungated styling in a shared file

**Severity: medium. The reason "remove the blue" is not a small task.**

2.59 MB with 100 style blocks and no namespacing. One hex value paints
unrelated surfaces across all three CRMs. `#1e2432` paints `.cr-pcard.community`,
`.ins-header`, `#solModal`, `.cr-pp-item`, the supplement panels, and two inline
`style=` attributes.

So a find-and-replace on a colour is an app-wide restyle wearing the costume of
a small fix.

Of 253 blue/cyan rules, only **4** carried a community selector — those are the
only ones changeable without touching Retail and Insurance. Hence two rounds:

| Round | Mechanism | Effect |
|---|---|---|
| PR #35 | already community-gated selectors | 250 → 246 |
| PR #36 | `body.cr-cc-open` punch rules | 246 → **221** |

`body.cr-cc-open` is toggled in exactly one place — the community client page's
`takeOver()` — which makes it effectively community-scoped and therefore a safe
gate.

**Rule:** before changing a colour, find every selector using that value and
confirm each is gated. Gate first, then restyle. The surviving occurrences of
an edited value are the *proof* the other CRMs were untouched — assert on them.

---

## 6. Undeclared dependencies in serverless functions

**Severity: high when it happens. Completely silent.**

`@supabase/supabase-js` was imported by serverless functions but **not declared
in `package.json`**. Two functions had *never run* — they failed at cold start,
permanently, since they were written. Fixed in PR #26.

Nothing surfaced this. No build error (there is no build), no runtime error the
app noticed, no log anyone read. Worth periodically diffing every `require` /
`import` in `api/` against `dependencies`.

Related: the error-capture pipeline itself was silently discarding every
payload (`150d4df`) — so for a while the app had no way to tell anyone anything
was wrong. **Fix telemetry first;** a broken reporter hides everything else.

---

## 7. Assumed-single-party logic

**Severity: medium. Specific to Community, but pervasive there.**

Community bills a nonprofit for work on a homeowner's house. Code written for
Retail assumes payer == occupant == contact. Every place that assumption is
baked in is a bug in Community:

| PR | Symptom |
|---|---|
| #10 | Bid emailed to the **homeowner** instead of the funding partner |
| #12 | Only one party named on the job |
| #13 | Emailed bid did not say whose house it was |
| #15 | Inspection report named one party |
| #20 | General contractors unselectable; picker bypassed masking |
| #28 | No visual indication of which party is billed |

**When touching anything in Community that involves a person, ask which
person.** Payer, occupant, and contact are three roles, and in Community they
are routinely three different entities. 2 of 12 community jobs have **no**
homeowner recorded at all — which is why PR #30's filter includes a
community-only "Homeowner: Recorded / Not recorded" group.

---

## 8. Date arithmetic off by one day

**Severity: low individually. Notable because it appeared three times.**

Three separate copies of the same day-early bug, fixed in PRs #21, #30, #32.
The pattern: comparing a timestamp against `new Date()` without normalising
both sides to midnight.

The correct form, which now appears exactly 3 times:

```js
var a = new Date(); a.setHours(0, 0, 0, 0);
```

Two functions legitimately do this — `days()` and `daysUntil()`. When you fix
one copy, **grep for the others**. This codebase duplicates logic freely; a fix
applied once is usually a fix applied to one third of the problem.

---

## The "handler bound to a replaced node" class — swept, and it is MINE alone (31 July 2026)

Build 469 fixed a click delegate bound to a node replaced on every render, so the CompanyCam
buttons were inert. Having caused that, the obvious question was whether it exists elsewhere.

**It does not. The app was consistent; the outlier was me.**

### The sweep, and the false positives it produced first

**First heuristic — 34 "risky" hits, all wrong.** It flagged every listener bound to an element
whose innerHTML is reassigned. That is **the correct pattern**, not the bug: `innerHTML` on a
container does not kill a listener *on that container*, only on its descendants. Binding to a
stable container and routing with `e.target.closest(...)` is exactly what 469 was fixed *to*. The
scan flagged the fix as the defect. It also invented links that were not there —
`ljList.innerHTML` is never assigned at all; a variable-to-selector mapping produced a phantom.

**Second heuristic — the real shape.** A listener bound to a node that *markup regenerates*: an
`id` emitted from inside a `<script>` block (generated at render) rather than present in the static
body. **7 candidates**, each bound exactly once.

**All 7 are safe.** Every one binds within 3–5 lines of emitting its own markup — render-then-bind,
inside the same function, so both re-run together on every render:

| id | emitted | bound | Δ |
|---|---:|---:|---:|
| `msCancel` · `msSave` | 9822 · 9823 | 9825 · 9826 | 3 |
| `tskCloseBtn` · `tskCancelBtn` · `tskSaveBtn` | 9953 · 10027 · 10028 | 9957 · 10030 · 10031 | 3–4 |
| `solBtn` · `solFileInput` | 13600 · 13601 | 13603 · 13606 | 3–5 |

### What to actually check, if this is ever suspected again

Two patterns are correct and both appear throughout: **container delegation** (bind the stable
parent, route with `closest()`) and **render-then-bind** (emit, then attach, in one function). The
bug is only the third shape — **bound once at init, to a node something later regenerates**. Look
for a binding far in the file from the markup that creates it. Distance is the signal.

**Do not re-run the naive version.** Counting listeners against `innerHTML` targets produces 34
false positives and zero true ones.

---

## 9. A CSS rule that parses, balances, and never applies (build 481 → fixed 482)

**This class is invisible to every gate on this project except one.**

481 added a ghost button to the CompanyCam foot:

```css
.lb-ccfile button.ghost{background:transparent;border:1px solid …}
```

Every other rule in `cr-lib-styles` is scoped to `#rlLibPanel`, including:

```css
#rlLibPanel .lb-ccfile button{…background:var(--lb-accent,#C4180F);…}
```

`id + class + type` (1,0,1,1) beats `class + class + type` (0,0,2,1). The ghost rule **lost**, and
"Save to device" rendered as a **second solid red button** identical to "File selected".

**What each instrument said:**

| Check | Verdict |
|---|---|
| `check_build.py` — CSS brace balance | ✅ green |
| `check_build.py` — duplicate style ids | ✅ green |
| `node --check`, tag balance, marker, negative control | ✅ green |
| A jsdom harness | ✅ green — and it **cannot** resolve `var()` in a `background` shorthand anyway |
| **`getComputedStyle` in a real browser** | ❌ **`rgb(196, 24, 15)` — the same as the primary** |

**The rule.** When you add a CSS rule to a module in this file, **read its neighbours' selectors
first** and match their scoping. If the rule is meant to override, prove it did — in a real engine,
not in jsdom:

```js
getComputedStyle(document.querySelector('[data-cc-dl]')).backgroundColor
```

`css482_harness.js` is that gate, kept. **It proves which rule won, not that the colour is right;
Theo's eyes remain the gate for the second question.**

**How it was caught:** the *scope diff* of the next build. Walking every changed hunk showed the new
selectors were unprefixed while the surrounding ones were not. Nothing else surfaced it.

---

## 10. A sampler whose comment claims a spread it does not produce (build 478 → fixed 485)

`order by id asc` on a table whose ids sort near creation order is **not a shuffle** — it is
"oldest first" wearing a disguise. 478's caption trial did this and its own comment asserted the
opposite:

> *"A spread, not the newest 50: order by id so the sample crosses years, crews and job types
> rather than sampling one week of one roof."*

Result: 53 photographs, **1 job**, **1 crew**, **two days**, from an index spanning 2007–2026.

**Why this class is dangerous.** A bad sample does not look like a bug. It returns rows, the code
runs, the counter fills, and the output is *internally consistent* — 26 of the 53 captions
correctly described the same water-damaged ceiling. It reads as a finished experiment. The only
tell is a measurement nobody thought to take.

**The rule.** When a query claims to sample, **prove the spread before trusting the result**:

```sql
select count(*), count(distinct project_id), count(distinct creator_name),
       min(captured_at)::date, max(captured_at)::date
from <the sample>;
```

If the sample's `count(distinct <entity>)` is not close to its row count, it is not a sample.

**And when batching a sample, exclude the whole entity, not the row.** Excluding only already-
processed *rows* makes each batch re-pick the same entities and choose a different row from them —
50 photos from 6 roofs. `not exists (… where q.project_id = p.project_id and q.<field> is not null)`
is the shape that actually works.

**Related, same family:** *"Test against production data shapes, not convenient fixtures"* —
a photo-signing change verified against `{path, url}` fixtures shipped completely inert because
**zero** real photo rows carry `path`. Both are the same failure: an assumption about the data that
nobody measured.

---

## 11. The patch language's escape syntax written into the patched language (build ~468 → fixed 488)

**Every build here is a Python script writing JavaScript.** Anything that means one thing in Python
and another in JS crosses that boundary silently, and the gates do not see it.

The instance: 20 `CHANGELOG` notes carried `\U0001F4F8`. That is a valid **Python** escape for 📸.
JavaScript has no `\U` escape at all — it takes the unknown escape, drops the backslash, and yields
the literal text `U0001F4F8`. So the panel rendered:

> `U0001F4F8 CompanyCam photographs go straight into an inspection report.`

**This is the dangerous shape of the class: it parses.** `node --check` is clean, tag and brace
balance are clean, the string is a perfectly legal string. Nothing is malformed — it just says the
wrong thing. It shipped in every build from roughly 468 and nobody caught it for twenty builds,
because the only instrument that sees it is *reading the rendered text*.

**Sibling traps on the same boundary:**

| Written in Python | Python means | JavaScript means |
|---|---|---|
| `'\U0001F4F8'` | 📸 | literal `U0001F4F8` |
| `'\d'` in a patch string | invalid escape (warns) | literal `d` — a regex silently loses its class |
| `'...What's...'` | fine in a `"` string | **closes** a `'` JS string — took out a whole script block at 488 |
| `\1` via `pl.sub` | literal, not a backref | destroyed five CSS rules at build 302 |

**How to catch it:** assert on what the *engine* produces, not on the text you wrote. `gate_488.js`
extracts the shipped array, evaluates it in a real JS context, and reads the resulting strings — a
wrong escape then yields wrong characters and fails a count. A `grep` for the string you intended
would have passed on every one of the twenty broken builds.

**The scan, if you want to know whether this is live right now:**

```bash
grep -oE '\\U[0-9A-Fa-f]{8}' index.html | sort | uniq -c    # invalid in JS — must be 0
grep -coE '\\u[0-9A-Fa-f]{4}' index.html                    # valid in JS — must not change
```

Repair as **surrogate pairs** — write `\uD83D\uDCF8`, not a literal 📸 character. `\uXXXX` is valid JS,
is already this file's own convention (597 × `\u2014`), and keeps the region ASCII so no encoding
step between the patch script and the artifact can mangle it.

---

## 12. A security gate that fails OPEN on NULL (found and fixed 5 Aug 2026, same hour it shipped)

**`studio_findings.sql` shipped a SECURITY DEFINER function whose admin gate did not stop an
anonymous caller.** Two independent defects, either one sufficient. Both were in SQL I had written,
reviewed, merged and applied, with a comment above the gate explaining what it prevented.

### 12a. `IF NOT f()` when `f()` can return NULL

```sql
if not is_cardinal_admin() then           -- ✗ does not fire for anon
  raise exception 'admin-only';
end if;
```

`is_cardinal_admin()` ends `… or auth.email() in ('theo@…','joan@…')`. With no JWT, `auth.email()`
is NULL, so `NULL in (…)` is NULL and `false OR NULL` is **NULL — not false**. Measured, as role
`anon`:

```
is_cardinal_admin() -> NULL       (not false)
not is_cardinal_admin() -> NULL
```

In plpgsql **`IF NULL THEN` does not execute**, so the raise was skipped and the definer-rights
function ran for an unauthenticated caller. Proven by calling it as `anon` with an id matching no
row — it returned instead of raising.

**The fix is `not coalesce(f(), false)`.** Never negate a three-valued expression in a gate.

**⚠ The RLS policies calling the same function are FINE — do not "fix" them.** A policy predicate
evaluating to NULL filters the row *out*; NULL fails safe there. It is specifically **negation inside
an IF** that turns NULL into "allow". Same function, opposite outcome, depending only on where it is
called. That asymmetry is why this hid.

### 12b. On Supabase, `revoke … from public` does not revoke from `anon`

```sql
revoke all on function f(text) from public;      -- ✗ anon keeps EXECUTE
grant execute on function f(text) to authenticated;
```

Supabase's default privileges grant EXECUTE on new functions to `anon`, `authenticated` and
`service_role` **directly**, not through `public`. Measured immediately after applying:

```
postgres=EXECUTE, anon=EXECUTE, authenticated=EXECUTE, service_role=EXECUTE
```

`anon` must be named. And the anon key is in the shipped `index.html` by design, so "only anon" is
not a limit — it is everyone.

**How to check any definer function, in one query:**

```sql
select grantee, privilege_type from information_schema.routine_privileges
 where routine_schema='public' and routine_name='<fn>';
```

**Then prove it with the three callers, not by reading the code** — anon, a non-admin rep, and an
admin. The rep and the admin both behaved correctly the whole time; only anon was open, and no
amount of re-reading the gate would have shown that.

---

## 13. A long run that outlives its credentials — and reports success while doing nothing

**Twice in two days**, on two different scripts, same cause.

A Supabase access token lives **one hour**. `hail_review.py` and `push_studio_tags.py` both minted
one before the loop and never renewed it. The `push_studio_tags` instance is the clean measurement:

```sql
select date_trunc('minute', pushed_at), count(*) from studio_photos group by 1 order by 1;
--  first row 02:05 UTC · last row 03:06 UTC · 61 minutes · then nothing
```

6,290 of 60,503 landed — about 10% — and **the script kept running**, 401ing on every one of the
remaining ~54,000 photographs, counting each as an ordinary failure and printing nothing that looked
like an emergency. It was reported to Theo as "running, resumable." It was, technically. It was also
doing nothing at all, for 47 minutes before anyone looked.

**Three separate mistakes, and the third is the one that cost the time:**

1. **The token was never refreshed.** Fix: refresh proactively at 45 min, before anything fails.
2. **A 401 was indistinguishable from a corrupt JPEG**, because both helpers flattened
   `urllib.error.HTTPError` into a bare `RuntimeError` with the code baked into a *string*. The
   `except Exception` at the bottom then treated the one recoverable error like any other. Fix:
   an exception class that keeps `.code`, and re-auth once per item on 401.
3. **Nothing distinguished "working" from "failing every time."** A loop that catches, counts and
   continues will walk 54,000 items into a wall without raising its voice. Fix: stop after N
   consecutive failures and **exit non-zero**, so the tail of the log and the exit status disagree
   with "it's fine."

**The diagnostic that actually found it** was not the log — it was one query against the destination:

```sql
select max(pushed_at), count(*) filter (where pushed_at > now() - interval '5 minutes')
  from studio_photos;
```

**Ask the destination whether rows are still arriving. Never ask the process whether it is still
running.** A process can be extremely busy accomplishing nothing.

Regression cover: `spark/test_push_retry.py` executes the shipped `main()` against stubbed network
leaves, with a negative control that must LOSE photographs when the re-auth is disabled.

### 13a. …and the first fix was inert, because the harness invented the error shape

**The fix above shipped in #124 and did not work.** It tested `e.code == 401`. The run kept dying.

**Supabase reports an expired token differently per service:**

| service | on an expired token |
|---|---|
| PostgREST `/rest/v1` | **HTTP 401**, `{"message":"JWT expired"}` |
| Storage `/storage/v1` | **HTTP 400**, `{"statusCode":"403", … "\"exp\" claim timestamp check failed"}` |

`upload_storage()` is called **before** `upsert_row()`, so the 400 is what a long run actually hits.
The 401 never arrives. The check was correct for the endpoint it was never reached from.

**The harness passed because I wrote the fixture.** It raised a 401 — the shape I assumed — so it
confirmed my assumption instead of testing it. This is the same class as the photo-signing change
that shipped completely inert against `{path, url}` fixtures when **zero** real photo objects have
`path`: *test against production data shapes, not convenient ones.* A stub you author from memory
tests your memory.

**What found it:** the error string out of the real run. Not reasoning, not the test.

**And the loose check beat the precise one.** Hermes's independent patch matched `'403' in str(e)` —
sloppy, false-positive-prone, and it **caught the real failure** where the exact `e.code == 401` did
not. Precision aimed at the wrong target loses to imprecision aimed at the right one. The fix keeps
the precision and moves the target: match `401`/`403` by code, plus a 400 **only** when the body
carries a known expiry marker. Not `'exp' in s` — that matches "unexpected". Not `'403' in s` — a
body can say 403 for unrelated reasons. Both traps are pinned as tests.

**Refresh on the token's own `exp` claim, not on a count.** "Every 200 photographs" reads as
equivalent to a timer and is not: at ~100/min it signs in every two minutes, ~300 times over this
run, and GoTrue rate-limits password grants. Time is what expires, so time is what to count — and
the token states its own expiry, so nothing has to be guessed.

**The check that makes this real:** re-run the harness with the *old* predicate restored and confirm
it now fails. If a regression test cannot see the bug it was written for, it is decoration. This one
drops 30 landed photographs to 5 with the `#124` check reinstated.

---

## 14. A measurement whose provenance was never checked (5 Aug 2026, the v4 model)

Not a code bug. Three evaluations were run to answer one question — *is hail_v4 better than
hail_v3* — and **all three were invalid**, each for a different provenance reason. The question is
still unanswered, and the cost was an evening.

| eval | result | why it was void |
|---|---|---|
| v4 on **v4's own val** | +0.27 | v3 and v4 validated on **different photo sets**. Comparing two models on two sets measures the sets. |
| both on a **regenerated** `v3_val ∩ v4_val` | −0.025 | The split was never persisted, and **regenerating it does not reconstruct it** — see the seed note below. ~2 of the 36 "shared" photos were genuinely held out from both models. |
| v3 on **`images/val/` as it sits on disk** | +0.070 | The directory **accumulated across runs** — `train ∩ val = 441 photos`. Both `.cache` files faithfully recorded the duplicates. |

**Each fix introduced the next flaw.** Fixing the split confound created the regeneration confound;
fixing that by using on-disk artifacts created the accumulation confound.

### The three checks that would have caught all of it, in order

```bash
comm -12 <(ls images/train|sort) <(ls images/val|sort) | wc -l   # 1. MUST be 0
ls images/train|wc -l; ls images/val|wc -l                       # 2. sum ≈ corpus?
ls -l --time-style=+%F_%H:%M images/val | awk '{print $6}' | sort | uniq -c   # 3. one cluster?
```

Check 1 returned **441**. Check 3 returned **two** timestamp clusters. Either alone voids the number.

### ⚠ The timestamps disproved the story being told about them

The decisive fact was not any of the three checks — it was reading `ls -l` output against the claim:

```
runs/hail_v4/weights/best.pt      08-04 23:13     <- the model
images/val/, images/train/        08-05 00:22     <- the "val set it was tested on"
```

**The weights predate the dataset directory by 69 minutes.** A model cannot have trained on a
dataset written after it was saved. So `images/val/` is not a contaminated copy of v4's val set —
**it is not v4's val set at all**, and no artifact on disk records what was. The summary being
written at the time asserted the opposite ("v4 trained on the 00:22 dataset") in the same table that
disproved it.

**Read the mtimes before trusting any artifact that claims to be a record of a past run.** They are
free, they are not opinions, and here they overturned a conclusion that three evaluations and several
hours of compute had converged on.

### The rules that generalise

- **A split that is not persisted did not happen.** If it cannot be reconstructed, no later
  comparison against it is possible — and *regenerating* one is not reconstruction, it is a new
  split wearing the old one's name.
- **⚠ A fixed seed is NOT enough, and this entry originally got it wrong.** It first said
  `prepare_yolo.py` splits "unseeded". It does not — it carried `random.seed(42)` the whole time,
  which surfaced only when the enforcement patch removed that line. The split was deterministic and
  still unreconstructible, because **the corpus grew between runs**: the same seed drawing over a
  different-length pool assigns different photographs. Reproducing a split needs the seed **and** a
  byte-exact corpus, and the corpus is the harder half. An entry about unchecked provenance claims
  carrying an unchecked provenance claim is the joke writing itself — check the line before quoting
  it, including this one.
- **An output directory that is written with `exist_ok=True` and never purged is a union, not a
  state.** It accumulates silently and every consumer downstream inherits the contamination.
- **Say which direction a bias runs before running the test.** The one useful thing salvaged here:
  a test biased *against* the hypothesis is decisive when the hypothesis wins and merely
  inconclusive when it loses. Stating that in advance is what makes a cheap test worth running.
- **Know what the number is for.** All of this measured *agreement with the Gemini teacher*, on a
  Spark-local preview tool with **zero references anywhere in the repo** (`best.pt`, `hail_v3`,
  `hail_v4`, any `.pt` — all zero across `.js`/`.html`/`.json`/`.py`). Nothing a homeowner sees
  depended on the answer. The stakes never justified the third eval, let alone a retrain.

---

## Do-not-reflag register — imported from the Hyperagent session, verified at 472

Each of these looks like a defect and is not. Re-reporting one costs trust.

| Looks wrong | Why it is right |
|---|---|
| **`OnHold` is fully rigged and nothing writes it** — `STAGES`, `IC_SKIP`, `PIPE_SKIP`, board column, both `LABEL` maps | Deliberate whitelist-before-writer ordering. The outcome form is the writer. **Don't wire it ad hoc, don't delete it as dead code.** |
| **27 surviving gold values** | Correct: `#c9a227` ×17 (retail badge + brass directory chips), `#b8860b` ×10 (gradient text fallbacks). **Grep the value, not the word "gold".** |
| **`--ins-gold` is `#c8202e`** | The token name lies. Renaming touches every call site. Leave it. |
| **`v2026-08-04 build 95`, `146` ×12, `148` ×4, `404`** | Module-local counters and a future-dated claims label. **Only the `data-cr-footer` div is the app version.** |
| **The two community `LABEL` maps are byte-identical** | On purpose. A count of 2 is right, and **any edit must land in both.** |
| **Three copies of `setHours(0,0,0,0)`** | `days()` and `daysUntil()` both anchor to midnight. Correct, not duplication. |
| **`await signedPhotoMap(...)` appears twice** | `publish()` and `openPreview()`. **Asserting 1 file-wide fails a correct patch.** |
| **`PHOTO_DOC_URL_TTL = 315360000`** | Ten years, deliberate — documents get opened long after generation. |
| **Main block: 1 lock, 4 releases** | The extra releases are `hideAllViews` safety nets. **The asymmetry is the design, not a leak** — this refines CLAUDE.md's "all individually balanced". |
| **`cr-sc-script` two locks, one release** | Both locks idempotent, balanced. |
| **Unguarded `JSON.parse(JSON.stringify(x))`** | Deep-copy idiom; cannot throw. |
| **`querySelector('[data-sh="' + name + '"]')`** | `name` is an internal literal from the sort/filter build, not user data. |
| **The Punch panel's CSS says "claim"** | The panel is **cross-CRM**. Its vocabulary misfiled it as insurance-only for two scanners while it sat in Theo's community screenshots. **Don't scope it by its words.** |

## Silent success — a 200 that means nothing happened

**Three instances found together at build 611, all on notifications.** The class: a call path
returns success while doing nothing, so no one investigates for months.

1. **Payload key mismatch across a fetch boundary.** `notifyTeam()` sent `{to, subject, html}`;
   `/api/notify` read `{emails, title, body, url}`. `emails` was `undefined` → `[]` → the route's
   own `if(!emails.length){ res.status(200).json({ok:true, sent:0}); return; }` fired. **Seven call
   sites, `ok:true` every time.** Nothing in the app checks `sent`.
2. **Writing a table nothing reads.** `#pushEnableBtn` upserted `push_subscriptions`;
   `api/notify.js` only ever queried `push_subs`. The write succeeded, so the UI said
   *"this device now gets Cardinal alerts."*
3. **A browser API that must be reset before reuse.** `pushManager.subscribe()` throws
   `InvalidStateError` if a subscription exists with a different `applicationServerKey`. Only
   visible because it *does* throw — the one of the three that surfaced.

**How to catch it:** grep the caller's payload keys against the reader's, and the written table
against the read one. `grep -c` on each side is enough and takes seconds. Then ask what the
success path would look like if the feature were entirely disconnected — if the answer is
"identical", the assertion is missing.

**And the test-side twin:** an assertion that cannot fail is the same bug in the harness. 611's
"queried push_subs for BOTH recipients" used `cond ? realCheck : true` and so **passed against the
known-broken handler**. Always run the harness against the pre-fix artifact and read the output
line by line — an exit code of 1 does not tell you *which* assertions earned it.

---

## A harness that re-orders the code it is testing

*Added 7 Aug 2026, build 613. The negative control caught this before the build
shipped — it is a gate defect, not an app defect, and it passed a known-broken
build as fixed.*

Build 613 fixed a race between `boot()` and the history rewriter: `boot()` reads
`location.hash` after an `await`, and the rewriter — **~29,500 characters later
in the same `<script>` block** — stomps that hash while the await is pending.

The first harness extracted both pieces faithfully and then placed them in **two
separate `<script>` tags**. That single difference inverted the result:

> Between script elements the HTML parser performs a **microtask checkpoint**.
> So `boot()`'s continuation ran *before* the later script — and build **612,
> which is broken, passed as fixed**.

Inside one block there is no checkpoint, so the rewriter genuinely runs first.

**The rule:** when the bug *is* an ordering or timing interaction, the harness
must preserve the real execution context, not just the real source text.
Extracting the shipped code is necessary and **not sufficient** — where you put
it is part of the test. Verify the enclosing block before assuming two regions
are separated (`rfind('<script'`) on each, compare the offsets).

**And the meta-lesson:** the negative control is what surfaced this. A green run
against the patched file proved nothing; the red-that-should-have-been-red is
what exposed the harness. Never accept a gate that has not been seen to fail
against the previous build for the right reason — "it failed" is not enough,
check *how* it failed.

Related: the shipped alert in this same flow says "Password updated" whenever
`updateUser` returns without error, including when the new password matches the
old one. Another **silent success** (see the 612 entry) — the confirmation
dialog is not evidence the credential changed.

---

## 15. An assertion that matches your own comment about the code (8 Aug 2026, build 630)

**Cost: TEN false reds in a single session, on code that was correct every time —
and four of them landed after this entry was written.**

Every one of these went RED against a working build, and every one was the
test's fault:

| Build | The assertion | What it actually matched |
|---|---|---|
| 624 | `esc(srcD(p.after_path))` appears once | a second, legitimate site on the thumbnail |
| 626 | `text-size-adjust:100%` count | the comment containing `html{text-size-adjust:100%}` |
| 627 | no `lat`/`lon` in `toggleTray` | the comment explaining why coordinates are excluded |
| 628 | `stopPropagation` near `stu-tick` | nothing — the class moved into `paintTick()`, so the *proximity* broke while the code stayed right |
| 629 | `nextBucket` is gone | the comment `/* 629 replaced nextBucket() …` |
| 630 | `openLens` not used here | the comment *"not the Showcase's openLens"* |
| 631 | `upsert:true` appears twice | the comment *"upsert:true and the SAME path…"* |
| 631 | `contentType:'image/jpeg'` **=== 2** | nothing — 631 legitimately added two more uploads |
| 632 | `return;` **=== 2** in `setupMode` | all ELEVEN nested listener guards — the slice was the whole function |
| 632 | no `from('studio_photos')` in `bulkArchive` | neighbouring functions — the slice ran to the next landmark, not the closing brace |

⚠️ **The last two happened AFTER this class was written, in the same hour.** The
`=== 2` was hardcoded into `harness_ourroofs.js` by the build that created this
very entry. Knowing the rule is not the same as applying it: the fix is to write
assertions that *scale* (count the uploads, require each to declare its type)
rather than assertions that record today's number.

**The shape is always the same: the assertion's search space included prose.**
Comments on this project explain *what was removed and why*, so an
absence-assertion over a region containing its own rationale is guaranteed to
find the thing it is proving absent.

### The rules that fall out of it

1. **Scope an absence-assertion to CODE.** `jslex_count.py` exists for exactly
   this and settled two of the six: at 629 it reported `nextBucket` as **0 in
   CODE, 1 in comments**; at 630, `openLens` as **4 in CODE (all in
   `cr-show-script`), 1 in comments**. A bare regex said 1 and 6.
2. **Assert on syntax, not on a name.** `openLens(` with the paren is a call;
   `openLens` is also English. Same for `multiple` — the attribute
   `accept="image/*" multiple` versus the word in *"a multiple with no basis is
   a marketing number"*, which is prose about SureNail and cost a seventh red.
3. **Brace-match the function; never slice to the next landmark.** 632 lost
   two rounds to this — a slice to `function esc(` swept up neighbours that
   legitimately query the same table. Walk the braces.
4. **Never assert by proximity.** `/stu-tick[\s\S]{0,700}stopPropagation/`
   passed at 627 by luck and broke at 628 because a class name moved a thousand
   lines. Slice the function or the listener and assert inside it.
5. **Prefer self-computing counts.** 628 hardcoded `paintTick` calls `=== 4`;
   629 added a fifth caller and the correct build failed. Assert the *intent* —
   one definition, N callers — not a number read off an already-patched tree.
6. **Reword the comment as well as the test** when the identifier is the thing
   under assertion. Belt and braces; 626 and 629 both did this.

**When a gate goes red, the first question is still "is the test wrong or the
app wrong?"** On this project it has been the test roughly half the time, and
in this class it was the test **six times out of six**.


---

## 16. A control that is rendered but never wired (8 Aug 2026, build 632)

**Cost: the Archive site button did nothing from build 614 until 632, and
nobody could tell.** `archived_at` was NULL on all 60,503 rows — the feature had
never once run.

`setupMode()` in `studio.html` returned inside its `isShowroomHost()` branch,
**before any `addEventListener`**. On a `showroom.` host, three controls were
drawn and dead: Archive site, Restore site, and the lens switcher.

### Why it was invisible for so long

- **The button still renders.** `paintSiteActions()` decides visibility from
  state alone; it has no idea whether anything is listening.
- **Everything around it worked.** Site selection is wired in `renderRail()`,
  not `setupMode()`, so the rail behaved normally. The default lens is already
  `'site'`, so the dead lens switcher was never reached for.
- **It only broke on one host.** On `studio.` the same code wires correctly.
- **The write is silent when it does run.** See class 15's cousin below: an
  update matching zero rows *succeeds*, so even a wired-but-wrong version would
  have looked identical.

### The rules

1. **An early return above a wiring block disables every listener below it.**
   When a guard clause and one-time setup share a function, put the wiring
   first, or make the guard affect only what it is actually guarding.
2. **Rendering and wiring must be checked separately.** "The button is on
   screen" proves nothing about whether it does anything.
3. **A regex cannot see this.** The code exists, reads correctly, and never
   runs. The only assertion that catches it EXECUTES the function and asks the
   DOM whether a listener attached — `harness_studiobin.js` does this under both
   hostnames, and its negative control reproduces the symptom exactly.
4. **Suspect the host gate when a bug is device- or URL-shaped.** "It works for
   me but not for him" on the same build is a strong hint that a host or width
   branch is involved. Two other bugs this session (626 width-only, 625 the
   vision gate) had the same shape.
5. **When an action reports success but nothing changes, check the row count.**
   `.select('id')` and treat empty as failure — the rule `removeOurs()` and now
   `setArchived()` both follow.

## An ungated API route, and the greps that miss it (638)

`api/notify.js` shipped for months with no session check while every sibling
route had one. Three things made it invisible, and all three generalise.

1. **The client sent auth the server never read.** `notifyTeam()` fetches the
   session token and sets `Authorization: Bearer …` on every call. Reading the
   *caller* tells you nothing about whether the *route* checks it. **Grep the
   handler for `req.headers`, not the caller for `Authorization`.**
2. **A sweep for ungated routes cleared it.** `grep -L 'authorization|bearer'`
   matched notify.js's **outbound** headers — to Supabase and Resend — and
   reported it gated. Two of three hits were the wrong direction. **Bound the
   pattern to the direction you mean**; the reliable probe is every `req.`
   reference in the file, which was exactly two.
3. **A duplicate sender hid behind a swallowed catch.** A wrapper added at 527
   fired its own copy of the request with `.catch(function(){})`. Every alert
   went out twice for over a hundred builds and nothing ever surfaced it.
   **An empty catch on a network call is a defect that cannot report itself** —
   and gating a route without deleting such a duplicate just moves the silence.

**Corollary for tooling — the bug is FIXED at 641; the lesson is not.**
`next_build.py` once reported build 637 free while a pushed branch was stamped
637, because its changelog regex matched only the pre-574 `{ build:N, note:'…' }`
shape. It was worse than under-reporting: the always-empty new/bad/edited lists
made the print guard skip those branches entirely, so they never even reached
the `highest` calculation. **A checker keyed to a format the file no longer uses
does not fail — it passes everything.** 641 fixed it by reading *both* shapes and
folding each branch's stamp in independently, because one regex is a single
assumption about a shape that has already changed once. It now catches the live
collision and the historical 584 one, and `--self-test` covers the dual-shape
parse.

**The durable rule: when a tool exists to prevent one specific error, test it
against a case that should trip it.** This one passed clean for 67 builds while
blind.

## 17. One surface, two theme attributes (9 Aug 2026, build 647)

Theo, with a screenshot at 1:42am: *"Something also ruined the landing page dark
mode."* The landing was near-white with cream writing on it — **1.24:1**,
measured in Chromium — and pinkish, because `#landingView::before` lays a 13%
red radial that reads as a dark glow on black and as **pink** on white.

`CLAUDE.md` has warned for many builds that this app has **two theme
mechanisms** and that they must not be confused:

| | attribute | scope |
|---|---|---|
| app theme | `data-theme="rb-light"` on `:root` | the whole CRM, `--rbe-*`/`--bg` |
| landing theme | `data-mode="light"` on `documentElement` | **the landing page only** |

What it did not say — and what this class is — is that **a single surface can
straddle both**, and nothing catches it:

```css
#landingView{background:var(--bg,#09090c) !important}   /* APP token   */
.cr-lr{ … color:#e8ded4}                                /* landing ink */
html[data-mode="light"] .cr-lr{color:#1a1614}           /* landing ink */
```

The ground answered to `data-theme`; every ink answered to `data-mode`. Agree
and it looks fine. **Disagree — app in light, landing in dark — and the ground
flips while the inks do not.** No rule is wrong on its own; no gate fires; brace
balance, duplicate-id, `node --check` and every marker pass. The defect only
exists in the *combination*, and only two of the four combinations expose it.

**The rule: a surface must take its ground and its inks from the SAME theme
attribute.** If a token comes from the other system, it is a bug waiting for the
user to toggle something.

**How to test it: enumerate the matrix, not the happy path.** `harness647.js`
renders all four combinations in Chromium and requires ≥4.5:1 from every one.
Run against 646 it reports `1.24:1` on exactly the combination Theo hit — which
is what makes it a gate rather than a decoration. A harness that had only
checked "dark app + dark landing" would have been green through the whole bug.

⚠️ **`body{background:var(--bg)}` is correct and was left alone** — that is
build 429's overscroll fix, and `body` is app chrome. The landing view is not.
Do not "make it consistent" by pointing the landing back at `--bg`.

---

## 18. A silent allow-list that later builds do not know to extend (9 Aug 2026, build 664)

**The first successful Scope of Loss read in this app's history was applied by
Theo, field by field, and five of the columns he approved never reached the
claim.** `ord_law`, `ord_law_basis`, `ord_law_rcv`, `ord_law_acv`,
`ord_law_limit` — the entire product of builds 658 and 660 — plus
`coverage_type` from 655. The client profile had all of them. The claim row was
`NULL`.

```js
var CLAIM_COL = {                    // bridgeSolToClaim(), written at build 646
  'carrier': 'carrier', 'policy_number': 'policy_number', …   // EIGHT entries
};
Object.keys(CLAIM_COL).forEach(function(k){
  var v = applied[k];
  if (v === undefined || v === null || v === '') return;
  patch[CLAIM_COL[k]] = v;           // anything not in the map is not an error
});                                  // it is simply not copied
```

**The shape of the class:** two structures must agree, and one of them fails
*open*. The review modal's `fields` list grew four times. The writer's map is an
**allow-list**, so an unmapped key is not a crash, not a warning, not a log line
— it is silence. Three separate builds added a field to one and not the other,
and every gate stayed green through all three, because the write *succeeded*.
It just wrote less than the user approved.

**Why nothing caught it:**
- `check_build.py` sees syntax and structure, not semantics.
- The harnesses for 655, 658 and 660 asserted the field reached **the review
  modal**, **the claim edit form**, **the formatter** and **the bounded
  select** — four places, all correct. Nobody asserted it reached *the row*.
- The **checklist half kept working**, because it writes the whole object
  (`L.insurance[parts[0]] = val`). So the profile looked right, which is
  precisely the screen you check.

**The tell to look for:** a hand-maintained map, list or `switch` that
translates between two representations, where the consumer of one side is
generated from a *different* list. Grep this repo and the pattern already has
names — `STAGES`, `IC_SKIP`, `PIPE_SKIP`, `LEGACY_STAGE`, `WO_TRADES` /
`TRADES` / `MONEY_TABS`. All of those carry a written "one grows, all grow"
rule. `CLAIM_COL` did not, and it is the one that drifted.

**The fix is not "remember" — it is an assertion that fails on drift.**
`harness_664.js` extracts BOTH lists from the shipped source and requires every
modal path to have a mapping or be one of three named special cases. Run
against 663 it prints the bug as a sentence:

```
FAIL NO field in the modal is missing from the claim writer
  → orphaned: coverage_type, ord_law, ord_law_basis, ord_law_rcv, ord_law_acv, ord_law_limit
```

**That assertion would have gone red the day 655 shipped.** When you add a
translation map, add its coverage check in the same commit, and state the
coupling at BOTH ends so it is found from whichever side the next person opens.

⚠️ **The related fixture trap, hit while writing this harness.** The first
version built its fixture from the checklist row read straight out of
production — `{adjuster:{phone:…}}`. But that nesting is the **output**;
`bridgeSolToClaim` receives `applied`, keyed by the modal's **dotted paths**
(`applied['adjuster.phone']`). The harness reported a false red on correct
code. *"Test against production data shapes"* means the shape at **that**
boundary — reading a real row from the wrong end of the pipeline is still a
convenient fixture.


## 17 — Two renderers, one CSS class, two vocabularies (build 671)

`.pill` in `supplement.html` was written for `insurance_claims.supplement_status`
(filed / approved / partial / denied) and then reused by a second renderer for
`insurance_supplements.status` (submitted / draft / withdrawn / …). Three of the
second set had no rule, so every Desk filing drew the bare base pill — present,
legible, and *silently* carrying no state colour.

Nothing catches this: brace balance passes, the class is applied, jsdom sees the
attribute, and the base rule means it never looks broken enough to notice. **When
a class name comes from data, enumerate the data's whole vocabulary and check
every value has a rule.** And when two columns feed one class, say so in a
comment — the next person will otherwise "unify" them.

An audit reported this as "`.pill.filed` is a class the renderer can never
produce". That was wrong — a *different* renderer produces it. **Two vocabularies
sharing a selector is not the same defect as a dead selector**, and the fix is
opposite: complete the second set, don't delete the first.

## 18 — A claim in prose that no code makes true (build 671)

Build 670 taught the model to write, of a building-official letter, that "a copy
is enclosed". Nothing in the system ever enclosed one. Every gate was green: the
prompt was correct English, the letter rendered, the harness asserted the letter
named its exhibits.

The same build shipped its twin: the Copy button rewrote every photo token to
"[photographs attached]" with no lookup, while the print path checked and emitted
nothing. On the first real claim — zero photographs on file — the copied letter
told an insurance carrier photographs were attached.

**A document that asserts a fact about the world is code with a runtime
dependency.** When you add a sentence like this, name the function that makes it
true and assert THAT. Two fixes are available and they are not equal: weaken the
sentence, or make the claim true. 671 did the second — the appendix now prints.

Related and worth repeating: **prose in the artifact defeats a text assertion in
both directions.** 671's own harness asserted the old copy regex was gone and
found the string inside the comment explaining its removal — a correct fix
reported as broken. Scope the assertion to the call shape, not the file.


## 19 — A re-keyed assertion is a NEW assertion, and needs its own red (build 672)

`harness_668` pinned the literal copy `'Send-from-desk arrives in the next
build'`. That is a **temporary fact wearing an invariant's clothes** (§15), and
it went red the moment send shipped exactly as designed. Correct response: don't
delete it, re-key it to what Theo actually cares about — *nothing sends itself*.

**The trap is what happened next.** The re-key looked right and passed on the
real page. Mutation-testing it — a `setTimeout(function(){ sendLetter(); })`
spliced into a copy of the artifact — showed it **still passed**, because
`setTimeout\([^)]*sendLetter` cannot cross the `)` in `function(){`. A bounded
`[\s\S]{0,200}?` fixes it, and both mutants (timer-driven send; `sendLetter`
present but unwired from its click) then go red.

**Rule: when you re-key an assertion, mutation-test the new one.** Its green run
on the current tree proves nothing — the old assertion was green for four builds
too. Build the failure you claim to be catching and watch it catch it.

Second, smaller lesson from the same run: a harness whose sandbox executes
shipped code gets a **new free variable** every time the shipped function gains
a call. Stub it to a **recording sentinel**, never a no-op — a no-op silently
tolerates the wiring being deleted.


## 20 — A stale flag asserting a live fact (build 672, the 671 class repeated)

671 was an entire build about the letter not claiming things that are not true.
672 — the very next build — put this in the carrier email, unconditionally:

> **Quantities are stated; pricing is not.**

Nothing on the send path checked. `dollar_flag` is computed **once**, server-side,
on the AI's draft output, and the letter is editable for as long as the operator
wants afterwards. Type a price in and the covering note tells the carrier there
isn't one.

**The shape to recognise:** a validation computed at moment A, and a *claim about
that validation* asserted at moment B, with an editable surface in between. The
flag is not wrong — it is simply answering an older question. Nothing goes red,
because the flag did its job at the time.

**The fix is never to trust the flag at B.** Re-run the test on the artifact that
is actually leaving, and make the claim conditional on the result:

    var out = assemble();
    return { html: out, hasMoney: /\$\s*\d/.test(out) };   // tested at the exit

Then the sentence is asserted only when it is true, and the operator is told
either way. Same medicine as 671's photo tokens: a claim that can be false must
be computed where it is made.

## 21 — `S.x` read after an await is a different `S.x` (build 672)

`sendLetter()` captured `to` and the rendered packet as locals, then built the
outbound payload reading `S.claim.homeowner_name`, `S.claim.property_address`
and `S.claim.claim_number` **live** — after two awaits and a modal confirm. Open
another claim in that window and the mail goes to claim A's adjuster carrying
**claim B's homeowner, address and claim number**.

The same defect had a second head: `recordSend` targeted `S.filedId` at write
time, so a switch during the send could stamp `sent_at` onto a different claim's
filing.

**Rule: an async handler on a shared `S` must capture its whole context in
locals at entry, read only those locals afterwards, and re-check identity before
any irreversible step.**

    var claim = S.claim, filedId = S.filedId;
    ...
    if (S.claim !== claim || S.filedId !== filedId) { /* refuse */ return; }

Partial capture is the trap. Capturing `to` but not the header fields looks
careful and is worse than capturing nothing — the letter goes to the right
person under the wrong name, which is far harder to spot than an obvious
misdelivery.


## 22 — Broken only on the device the work happens on (build 673)

A 31-page Hover report opened as its cover page. The upload was perfect — the
stored file decodes to 31 pages and ends `%%EOF`. The viewer wrapped the PDF in
an `<iframe>`, and **iOS Safari renders an embedded PDF as a single
non-scrolling page.**

**Desktop Chrome scrolls that same iframe correctly.** So every developer check,
every headless render, and every gate this project owns would have called it
fine. It failed only on the phone — which is where the actual job is done.

**The tell:** a feature that works when you test it and is reported broken by
the person using it. Before doubting the report, ask *what is different about
their device*, and check the data first — here the database proved in one query
that the file was complete, which turned a vague "it returned the wrong thing"
into a one-line viewer fix.

**Two iOS rules this file has now learned three times, so stop re-learning
them:**
1. **A `data:` PDF must not be embedded.** Hand over a `blob:` URL as the
   document. Then you get the native viewer, all pages, and the share sheet.
2. **`window.open()` after an `await` is blocked.** Open the tab inside the tap
   and navigate it when the data arrives. Comments saying exactly this already
   existed at two other sites while a third violated it.

**And the harness rule that follows:** jsdom implements neither
`URL.createObjectURL` nor `Blob` faithfully, so a jsdom test of a
file-opening path proves nothing. Use Chromium when the subject IS the browser
API.


## 23 — A label that was true only because there was one writer (build 674)

554's Roofr merge stamped the measurement record:

    next.source = ours ? 'Roofr' : 'Field + Roofr';

Correct, and provably so, for as long as Roofr was the only importer: the only
other thing that could have written those numbers was a person. **Build 674 made
a second importer exist, and in that instant the else-branch became a lie** — a
Roofr-then-Hover job would report `Field + Hover`, asserting that somebody stood
on the roof. These numbers go to an insurance carrier.

**The shape to recognise:** a two-way label, a boolean, or an `else` that is
correct only because the world currently has exactly one alternative. It does
not fail when it is written. It fails when someone adds the second case — and it
fails *silently*, because the label still looks plausible.

**When you add the Nth source to something that had one, go and read what the
existing code says about "the other one".** Grep the else-branches and the
default strings, not just the logic. Then derive the label from what is actually
there (`prevSrc + ' + ' + src`) rather than from an assumption about who else
could have been involved.

**And prove it against the old code.** `harness_674` runs the offending case
through 673's merge and asserts the wrong label comes out. A fix for a latent
lie should demonstrate the lie, or you are only asserting your own new code is
self-consistent.

---

## 24 — A test that hardcodes its own session's scratchpad (build 675)

**`harness_occhead.js` and `audit_contrast.js` had not run since the day they
were written.** Both opened with:

```js
const { chromium } = require('/tmp/claude-0/…/f4548c15-…/scratchpad/node_modules/playwright-core');
```

That directory belongs to the session that wrote the file. In every later
session it does not exist, so the script dies at line 18 with
`MODULE_NOT_FOUND` — **before a single assertion runs**. `harness_occhead` is
42 assertions covering the shingle-name wrap at 5 widths × 3 styles, i.e. the
exact regression build 626 was written to prevent. That coverage was gone and
nothing said so.

**Why it survives:** the failure looks like an environment problem, not a
coverage problem. A sweep prints one line per harness; a stack trace in that
column reads as *"my machine is set up wrong"* and gets skipped, whereas
`RESULT: FAIL` gets investigated. **A harness that cannot start is more
dangerous than one that fails**, because failure is loud and absence is not.

**The rules**

1. **Never `require()` an absolute path.** Resolve through `NODE_PATH` — nine
   of the eleven Chromium scripts already do, so the correct shape was sitting
   next door.
2. **Fixtures a test needs must be committed, or the test must refuse in one
   sentence.** `audit_contrast` also wants `rows616.json` and `final/*.jpg`,
   which were never committed and cannot be reconstructed. It now prints what
   it needs, names the two harnesses that cover the surface from the shipped
   artifact, and exits 2 — instead of throwing.
3. **A sweep must distinguish "failed" from "did not run."** Exit codes alone
   do not: both are non-zero. Print the last RESULT/GREEN line per harness and
   treat a blank one as unrun.

### The neighbouring trap: a red that is the sweep's fault, not the app's

The same sweep produced **three more reds, all of them mine**, and none a defect:

| harness | why it was red | the actual rule |
|---|---|---|
| `harness_pay` | run without `TZ=America/New_York` | its **header says to**. The red assertion is the *control* proving a naive date parse misreads the day in a negative-offset zone — in UTC it cannot, by construction |
| `harness_672` | no previous `senddoc.js` as argv[5] | it **refuses to skip** its differential test silently. The refusal is the feature (§19) |
| `harness_674` | no previous `index.html`/`hover.js` | same |

**Read the failing line before believing it.** Half of all reds on this project
are the test's fault, and a growing share are the *invocation's* fault — a
harness that demands its arguments is behaving correctly, and a harness that
demands an environment says so in its own header. Check both before touching
the artifact.

---

## 25 — Markup at the top, its stylesheet at the bottom (build 676)

**The app's startup screen was fourteen scattered emoji, and it had been for as
long as the banner nav has existed.** `#crBanner`'s markup is at line 3305; the
`<style id="cr-banner-styles">` that gives it `display:flex` is at line 51368 —
roughly 48,000 lines and 3 MB later in a 3.86 MB single-file app.

A browser paints what it has parsed. Between those two points the nav rendered as
raw inline text for the **entire** download — measured at 32 seconds on 1.2 Mbps
with 4× CPU throttling, and a distinct-frame pass found only TWO painted states
in that whole window: the emoji screen, and the finished app.

**Two things make this class hard to see:**

1. **It is invisible on a fast connection.** Locally, and on wifi, the gap is a
   few milliseconds. It only becomes the user's experience on a weak signal —
   i.e. exactly where the owner works. Same shape as §22 (broken only on the
   device the work happens on), from the other direction.
2. **Unstyled emoji paint; unstyled text does not.** Emoji are colour glyphs and
   render in their own colours regardless of `color`, so an element whose labels
   are invisible for want of a colour rule still shows its icons. "No text is
   visible" is not "nothing is visible" — and a screen of pictures with no words
   reads as a crash, not as a page loading.

**The rules**

1. **Anything you add high in the document must be styled from the head, or
   hidden from the head.** Ask where the module's stylesheet sits relative to its
   markup before adding either.
2. **Hide with the cascade, not a boot flag.** `#crBanner{display:none}` in the
   head is undone by the same-specificity `#crBanner{display:flex}` later in the
   file. No script runs, nothing can strand the element hidden if boot throws,
   and there is no new mechanism beside the existing one.
3. **Reproduce first-paint bugs by serving and throttling, never by reading.**
   `filmstrip.js` turned a vague "this happens every time" into a one-line cause
   in a single frame. Reading the code would not have found it; the markup and
   the stylesheet are both individually correct.
4. **Note that build 424 had already met this exact trap** in the same element —
   its comment says flex-wrap had to move to the body block because "this rule is
   in the document head and #crBanner's base rule is in the body, so document
   order meant flex-wrap never applied." The ordering hazard was known and
   written down; nobody asked what the user sees *in between*.

---

## 26 — A stopwatch pointed at the wrong thing (build 677)

`render_launch.js` was written to prove one number: that the app opens
near-instantly on the second launch. Its first version reported a **42×
speedup** and then **passed against the previous, network-first worker** — which
re-downloads 3.86 MB on every launch and cannot be fast by construction.

Two independent faults, both producing a **green that agreed with me**:

1. **CDP network throttling does not reach a service worker.**
   `Network.emulateNetworkConditions` applies to the page's network session. A
   `fetch()` issued from inside the worker is not throttled by it. So the
   "throttled" measurement was of an unthrottled document, in both artifacts.
   **Fix: throttle the wire itself** — rate-limit the response stream in the test
   server, which every consumer shares.
2. **An un-awaited `goto()` leaves the previous document on screen.** The first
   sample ran against the page still displayed — which already had the app on it
   — and reported **4 ms** to parse 3.86 MB. **Fix: stamp the outgoing document
   and refuse any sample that still carries the stamp.** A new document cannot.

**The rules**

1. **A performance claim needs a control that is SLOW.** If your harness cannot
   produce the bad number on the artifact that has the bad behaviour, it is not
   measuring the thing you named.
2. **Know which layer your instrument applies to.** Browser-level throttling,
   CPU throttling, HTTP caching and service-worker caching are four different
   layers; an instrument at one says nothing about the others. When the subject
   IS the service worker, the instrument must sit below it.
3. **A time that is physically implausible is a bug in the clock, not a win.**
   4 ms to parse 3.86 MB should have stopped the run before it was believed.
4. **Timing harnesses need the negative control MORE than functional ones**, not
   less: a functional assertion usually fails loudly on the wrong artifact,
   whereas a mis-scoped stopwatch happily reports a plausible improvement.

---

## 27 — One class name, two meanings, and one of them inherits the other's box (build 680)

`.empty` in `index.html` means two unrelated things:

- a standalone **empty-state panel** — `<div class="empty">No estimates yet.</div>`
  — styled by an **unscoped** rule in the first `<head>` block:
  `background:var(--paper); border:2px dashed var(--line); border-radius:8px;
  padding:44px 24px; text-align:center;`. **16 legitimate users.**
- a **modifier on a field value** — `<div class="val empty">Not set</div>`,
  meaning "this field has no value". **Six surfaces.**

The six modifier surfaces each had a module rule written for them
(`#cr-claims-mount .cr-c-info-item .val.empty { color: …; font-style: italic; }`).
Those rules are *more specific* and they *win* — but they only ever declare
`color` and `font-style`. **The panel's background, 2px dashed border, 44px
padding and centred text are not contested by anything, so they simply apply.**

> **This is the part that hides it: it is not a specificity fight.** Reading the
> module rule tells you the value should be muted italic text, and it *is* muted
> italic text — inside a 113px white dashed box. Every instinct says "find the
> rule that's beating mine"; there isn't one. Nothing is beating anything.

An empty "Approved" field on the claims screen therefore rendered as a
113px-tall centred white panel with a dashed border. Theo photographed it and
asked what the very large white boxes were for.

**How to find it:** you cannot, by reading. `render_emptyclass.js` extracts every
CSS selector where the class sits on a **compound** (`.val.empty`, not `.empty`
or `#x .empty`), rebuilds that selector's ancestor chain as real elements, and
reads the computed style in Chromium. Six of sixteen came back with the global
rule's literal fingerprint.

**The fix is a rename at source, not an override.** Six CSS rules and eight
emitters moved to `novalue`; the global rule is untouched and its 16 panel users
still work — **asserted**, because "delete the shared rule" is the tempting fix
and it breaks a screen you were not looking at. `.cr-photo.empty` is a genuine
empty photo slot that *wants* the panel and leans on the global rule for its
border-width and background; it stayed.

**Rules:**

1. **A shared, unscoped utility class is a namespace.** Before using an existing
   class name as a modifier, ask what it already styles *globally* — not what the
   rule you are about to write styles.
2. **Overriding `color` does not override `padding`.** A more-specific rule only
   wins the properties it names. Two rules can both apply in full.
3. **Fix by renaming the newer meaning**, so the shared rule keeps its original
   users. Deletion at source, not out-specificity — and assert the survivors.
4. **Detect by fingerprint, not by vibe.** The first draft of the detector keyed
   on "padding ≥ 40 **or** `text-align:center`" and reported **16 of 16 broken** —
   a false red, because four surfaces centre their own text on purpose. Keyed to
   the global rule's literal `padding:44px 24px`, the real answer is six.
   *When a count contradicts you, suspect the regex — including your own.*
5. **Scan both names after the rename.** The first green run said "0 of 10"
   because the renamed selectors had dropped *out* of the detector's own scan —
   a fix that passes by hiding from its test. Scanning `.empty` **and**
   `.novalue` keeps all 16 measured and asserts the six are still seen.

### The neighbouring trap: a diagnostic rig that re-implements what it tests

`render_claimpane.js` had a hand-written copy of the module's `kv()` and probed
for a hardcoded `.val.empty`. After the rename it emitted the old class, found no
element, read `null`, and reported the bug as still present. **It agreed with its
own prose rather than with the app** — BUG_CLASSES 15, in a rig rather than an
assertion. It now lifts the real `kv()` out of the artifact and finds the value
element carrying *any* modifier without naming it.

### And the other one: "the previous build" is not always the right baseline

Three sweep reds this build were the invocation, not the app. `harness_672`,
`harness_674` and `render_inshub` all refuse to skip a differential silently
(correct, per class 24) — but each is pinned to a **specific** historical
artifact, not to "whatever shipped last". `harness_674`'s differential extracts
`roofrMerge` and executes it standalone; at 679 that is a thin wrapper over
`aerialMerge`, so it throws `aerialMerge is not defined` — a **crash**, which
reads like a regression and is not one. `render_inshub`'s control must be 674,
because 679 already carries 675's swap. **Read the usage line for the baseline.**

---

## 28 — A theming pass that fixed the cards and forgot the heading (build 681)

Build 527 tokenised the Schedule Board for dark: `.bday`, `.bhead`, `.bnone`,
`.btime`, `.bcli`, `.brow`, `.subnote` — seven selectors, each with a computed
replacement ink, and its own comment records the ratios it was repairing. It
did not touch `.viewhead`, which kept the base `#1c1416` and rendered at
**1.10:1** on the near-black ground for fifty-four builds.

**Why it survived so long:** the page *looked* themed. Thirteen of fourteen
cards were correct, so the eye reads the screen as "done" and the missing
heading as a stylistic choice. A partial theming pass is more dangerous than
none, because it removes the obvious tell.

**And the blast radius was 15×, not 1×.** `.viewhead` is app-wide. One
un-themed base rule was failing on every page that uses it.

**Rules:**

1. **When theming a screen, enumerate every text-bearing selector on it and
   tick them off.** 527 fixed what was inside the cards and never looked above
   them.
2. **Prefer an existing token pair to a computed literal.** 527 chose
   `#f08a90` by arithmetic — correct for dark, and then unconditional, so it
   broke light. `--rbe-head` flips by itself and cannot drift.
3. **A base rule with many users is a 15× fix or a 15× regression.** Check who
   else uses the class, and confirm every scoped override still out-specifies
   the base before touching it.

### The neighbouring trap: the rig that agreed with nothing

Two faults in the measuring instrument, both caught only because the numbers
contradicted a photograph:

- **Concatenating all 122 `<style>` blocks is not "the app's CSS."** Several of
  them are generated PRINT/REPORT stylesheets living inside **template
  strings**, setting `:root{--ink:#1b1b1b}` and `body{}` for an 11pt document.
  Concatenated, a contract template restyles the app: the rig reported the page
  ground as cream in *every* render and scored the invisible heading at
  **17.61:1**. **Load the real document and let the browser decide what is a
  stylesheet.**
- **`background-color` is not the background.** `.bday` paints a
  `linear-gradient` — a background-*image* — so an ancestor walk that reads only
  `backgroundColor` skips the card and reports the page behind it. Collect every
  ground an ancestor actually paints, colour **and gradient stops**, and score
  against the worst. The naive version hid a real light-mode failure.

**When a measurement disagrees with a screenshot, fix the measurement first.**


## 29 — `1fr` has an automatic minimum, and one unwrappable child blows out the grid

**Struck at 690, found at 696.** A horizontal chip row was added inside
`.ljcols{grid-template-columns:1fr}`. `1fr` means `minmax(auto,1fr)`, and that
auto minimum resolves to the item's **max-content** — every chip laid out
unwrapped, 869px of it. The track grew to fit, the results column went with it,
and job names ran off the right edge of a 393px phone instead of wrapping.

**The tell is misleading.** It looks like the cards were made bigger. They were
not touched; the column around them was.

**`overflow-x:auto` on the wide child does not prevent this.** The parent grows
to max-content rather than the child scrolling inside a clamped parent. The
scroll only engages once something above it is bounded.

**The fix is a PAIR, and this file already had it written down** for
`#crewsView .crw-wrap`: *"minmax(0,1fr) on the track and min-width:0 here are
the two halves of the same fix."* Same fix, second site.

**How to catch it:** render at 360/393/430 and compare
`document.documentElement.scrollWidth` with `clientWidth`, then list every
element wider than the viewport. ⚠️ Exclude descendants of a scrollable row —
chips scrolled out of view legitimately sit beyond the right edge, and counting
them turns a passing layout into a false red.


## 30 — a horizontal scroller with no `overscroll-behavior-x` navigates back

**Reported at 697.** Swipe a sideways-scrolling row (tab rail, chip strip,
card grid) back toward its start; the instant it reaches `scrollLeft` 0 the
remaining gesture **chains to the page**, and the browser treats that as a
back navigation. The screen exits. It reads as "the view crashed" and is
nothing of the sort — the gesture left the element.

**Fix:** `overscroll-behavior-x:contain` on every `overflow-x:auto|scroll`
element. It stops chaining only; the element scrolls exactly as before, touch
handlers are untouched, and the Y axis is unaffected.

⚠️ **`overflow:auto` sets `overflow-x` too.** A source grep for `overflow-x:`
found 24 sites; walking Chromium's parsed rules found **33**. Count with the
browser, not a regex.

⚠️ **Three things a naive scan miscounts here**, all hit in one build:
a `<style>` tag inside a JS template string (generated print CSS read as a
stylesheet); `overflow:auto` written as PROSE inside a CSS comment; and inline
`style=` attributes, which are real elements but never appear in
`document.styleSheets`.

⚠️ **No CSS reaches the iOS system edge-swipe.** A gesture starting on the very
edge of the glass is handled before the page sees it. This class covers swipes
that begin on the element.
