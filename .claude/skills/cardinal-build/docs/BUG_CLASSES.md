# Cardinal Resource App — Bug Classes

**Failure modes already paid for. Every entry cost at least one build.**
*Read before debugging; skim before shipping. Written at build 427. For anything since, read the `CHANGELOG` array in `index.html` — it is the only record that survives work done outside this folder.*

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
