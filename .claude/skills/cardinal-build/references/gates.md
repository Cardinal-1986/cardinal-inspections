# Gates — the full doctrine

*Snapshot at build 427. If the project's `START_HERE.md` is in context, its gate ladder is the live version.*

The mechanical gates live in `scripts/check_build.py`. This file covers what a script can't do: the jsdom harness, harness fidelity, the adoption-family lifecycle patterns, and the retail tripwire. Every rule here exists because its absence shipped a real bug.

## The gate ladder (per build, in order)

1. **`node --check`** on all inline script blocks, extracted individually — including module scripts and blocks tagged with `id=`; a bare `/<script>/` regex misses them. → `check_build.py`
2. **Tag balance** and **CSS brace balance** on touched style blocks; **no duplicate `<style id=>`** — a second block with the same id shadows nothing and confuses every future grep; append to the existing block instead. → `check_build.py`
3. **Whole-string assertions** — assert entire rules and structures, never fragments. A fragment check passed while the rule around it was destroyed by literal `\1` backrefs (302→303).
4. **jsdom functional harness** (recipe below) with **structural proofs** — never programmatic clicks alone, which succeed on hidden elements.
5. **Harness fidelity** (below) — replicate the real builder or validate fiction.
6. **Dupe-API check**: no `window.Cardinal*` plainly assigned twice; merges use `Object.assign(window.X || {}, {...})`. → `check_build.py`
7. **Negative control before belief**: run the same gate against the *previous* build and confirm it **fails** there. Build 330's first attempt staged a stale file containing none of the fix while the gate reported green — it matched an unrelated query elsewhere. → `--prev --marker` for marker gates; run harnesses against the prior build manually.
8. **Assert on the artifact you just wrote** — the marker must be in the output file, not merely "the patch script ran". → `patch_lib.assert_in` / `--marker`
9. **Lock your mocks.** The app's async boot can null `window.supa` after the mock is installed. `Object.defineProperty(w, 'supa', { value: mock, writable: false })`.
10. **Print honest labels.** A harness once printed "PASS" on every line from a mangled ternary while the failure counter was correct. The print and the counter must read the same boolean — and **stage on the exit code** (`if [ $NEW -eq 0 ] && [ $PREV -eq 0 ]`), never on eyeballing output.
11. **Watchdog every harness.** A hung jsdom boot looks identical to a slow one; a 30s timeout printing `GATE TIMEOUT` saves the round.
12. **Re-bind mocks after boot.** The app nulls `sb` when `TEAM` is false at parse time — a mock installed in `beforeParse` is gone by the time a handler runs. `w.sb = w.__mockChain` after boot.
13. **Spies must target what the code actually calls.** The legacy history router calls captured originals, not `window.showHome`; a spy on the global saw nothing and "proved" a bug fixed that was never tested. **Observe the DOM result instead.**
14. **Re-query after a re-render.** Holding a node reference across a render and asserting on it reports a false failure — the node was replaced, not broken.
15. **Assertion windows must fit the rule.** `src.split(sel)[1][:900]` missed a declaration 1,000 chars into a long variable block and reported a false failure. Slice to the closing brace.

## What the gates can and cannot see (the 388 limitation)

**jsdom does not resolve `var()` inside `background` / `border` shorthands. It returns `rgba(0,0,0,0)`.**

Proven with a control test at 388: a plain-hex rule from the same stylesheet applied correctly, while every `var()`-based rule in that same block read transparent — **including code Theo had already confirmed working on his phone.** So:

- `getPropertyValue('--x')` **works** — reading a custom property directly is honest.
- Computed `backgroundColor` derived from a `var()` **does not work** — it reads transparent no matter what.
- A functional gate can verify **structure** (element exists, class applied, attribute set, JS API behaves) and **directly-read custom properties**. It **cannot verify that a tokenized colour actually renders.**

**For colour work: assert on the CSS text, run the negative control against the previous build, and say plainly that Theo's eyes are the gate. Never report a green jsdom run as proof a colour is right.** Most colour verification is screenshots, not tooling — say so up front, not after being asked.

## Count the rules that actually win — before patching any selector

Build 388's most expensive bug: `.acthead` had **four** definitions — two adjacent near the top (both patched, both dead) and the real winner **~39,000 lines later** in `cr-hd2-styles`. Source-order reasoning over the two rules you find first ships a silent no-op; only a functional gate caught it.

**Run the audit tool before touching any selector:**

```bash
python3 <skill>/scripts/selector_audit.py index.html '.acthead'
python3 <skill>/scripts/selector_audit.py index.html '#punchView' --prop background
```

It reports every definition with line number, enclosing `<style id>`, any `@media` wrapper, and a verdict naming the winner plus the live-but-losing rules. Print-only rules are excluded from the screen cascade. **Inline styles still beat everything it reports** — grep the JS for `.style.` on the element (build 378: `styleMounts()` force-set `background:'#fff'` inline, on a timer, beating every CSS rule regardless of specificity; the fix was deleting one line).

## Counting: enumerate the variants before you count

The build labels are the canonical case. Two independent sessions audited them and reported 9/4 and 6-distinct; **both were low, because there are two separator forms** — a space (`v2026-07-29 build 427`, ×9) and a middot U+00B7 (`v2026-07-22 · build 148`, ×11). Honest total: **20 strings, 5 builds.** Build 148 was invisible to every earlier list because it only ever appears in the middot form.

The lesson generalises past this file: **before counting anything, ask what the other form looks like** — separators, whitespace, HTML entity vs literal character, quote style, single vs double. Enumerate the variants, then count, then classify with a lexer. `scripts/jslex_count.py` handles the code/string/comment axis; it cannot guess a variant you never searched for.

Corollary worth keeping: the separator here correlates *perfectly* with location — all 11 middots are HTML banner comments; the 9 space forms are 8 JS footer-template strings plus the single rendered app stamp. **A pattern in the noise is often a structural fact.**

## Contrast is arithmetic, not judgment — compute it

Stage and CRM colours are chosen for a dark ground and **collapse as text on a light one**. Two shipped builds carried unreadable chips before anyone noticed. When a surface goes light, compute the ratio for **every colour that carries text**:

```bash
python3 <skill>/scripts/contrast.py --scan index.html --js-map STAGE_INK --on '#ffffff'
python3 <skill>/scripts/contrast.py '#c9a227' --on '#ffffff' '#202329'
```

Verified at 427: the bright CRM badge `#c9a227` reads **2.42:1 on white** against a 4.5:1 body-text floor, while every `STAGE_INK` light-ground twin clears at **5.27–8.43:1**. That is what the `STAGE_INK` / `colorLight` twins are *for* — use them on light grounds. **Bars, spines and dots keep the bright originals: a glowing 3px rule is not text.**

## Test against production data shapes, not convenient fixtures

A photo-signing change was verified against `{path, url}` fixtures and **shipped completely inert**, because **zero** photo objects in the real database have `path` or `storage_path`. The code was correct and did nothing. **Query the real shape first**, then build the fixture from what you found.

## When a gate goes red: test or app?

**Roughly half of all red gates across the 335–373 run were the test's fault, not the app's.** Before "fixing" anything, ask which is wrong. Real examples: assertions on behaviour deliberately changed (card tap, scheduled items, the photo requirement), a regex missing a trailing semicolon, an em-dash assumed illegal in a filename, a spy on a function the code never calls, and a marker string that already existed in the previous build. **Fix the gate when the gate is wrong; never fix the app to satisfy an old assumption.** The clearest case: the label gate compared *dates*, so two builds shipped in one day read as un-bumped — and the first instinct was to change the date in the artifact rather than fix the gate. Never bend the artifact to satisfy a bad assertion. (Build 428 deliberately shipped on 427's date to exercise this exact case.)

**For pure-CSS changes, jsdom cannot help** — build 359 shipped a selector that hid the community tab buttons and every structural proof passed, because the elements existed; they were just `display:none`. Assert on the **CSS text** and let Theo's eyes be the gate.

Also: **keep gate scripts beside the modules** — Node resolves `require('jsdom')` from the script's directory; a gate written to `/tmp` crashes on module resolution and the crash reads like a test failure.

**Stage only on green** (`&&`-chain the gates into the copy). Never stage on red, never hand over with a failing check.

## The jsdom harness recipe

Boot the real file, mock the world, exercise the changed surface, prove structure.

```js
const { JSDOM } = require('jsdom');
const html = require('fs').readFileSync(process.argv[2] || 'index_new.html', 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'https://app.cardinalroster.com/',
  beforeParse(window) {
    // jsdom has no layout — everything reports offsetParent null ("hidden")
    Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
      get() { return this.parentNode; }
    });
    // chainable Supabase mock — every method returns itself, awaits to {data,error}
    const chain = new Proxy(function(){}, {
      get: (t, p) => p === 'then' ? (res) => res({ data: [], error: null }) : () => chain,
      apply: () => chain,
    });
    // LOCK the mock — async boot can null it after installation
    Object.defineProperty(window, 'supa', { value: chain, writable: false });
    window.sb = chain;
    window.cacheProjects = [/* realistic objects incl. checklist */];
    window.currentUser = { email: 'theo@cardinalrenovations.net', role: 'admin' };
  }
});
// Filter jsdom "Not implemented" noise (canvas, scrollTo, matchMedia) —
// log it, never fail on it. Fail on REAL errors only.
```

Rules:
- **Structural proofs, not clicks.** `.click()` succeeds on hidden elements. Prove visibility and wiring with `el.matches()`, parentage, node counts, computed class/attribute state.
- **Navigate the way the app navigates.** Dynamic views are created by their builders at `show()` time — `getElementById` before that returns null and the test writes to nothing (`communityHubView` case). Call the real entry points.
- **jsdom completes route hops synchronously** — flash/paint-order bugs need the route frozen mid-flight to prove either edge (build 315).
- jsdom proves *does this work*, never *does this look right*. Misalignment is Menu → 🩺 Self Check plus Theo's eyes. Say so.

## Harness fidelity

**A harness seeded from your own assumption validates fiction — three times now:** a preview-era tab-hide bug re-typed into the shipped module; `.jabox` tiles that never existed (the real structure is the `.jatile` grid inside `#jaGrid` with **one delegated** listener); and a `communityHubView` element set on `null` because the hub creates it at `show()` time.

Before writing a harness touching base structures:
1. Grep the shipped file for the **real** builder function.
2. Copy its actual markup and its actual event wiring (direct vs delegated).
3. A theming class is not the element. Verify selectors against the builder, not a screenshot's suggestion.

Two laws added by the 428 verification:

4. **Validate the stub by reproducing the documented bug first.** Run the extracted shipped function against the *unpatched* build and confirm it produces the known-wrong answer (`currentBuild() → 406`) before trusting any result on the patched file. A stub that can't reproduce the bug isn't modelling the environment — it's modelling your assumption. This is the negative-control principle applied to the harness itself.
5. **Model the DOM APIs honestly — `textContent` includes `<style>` and `<script>` text.** An earlier analysis of this exact code was wrong because a hand-rolled simulation stripped them. If the stub's `textContent` is cleaner than the browser's, every conclusion downstream is fiction.

## The adoption family (borrowing live base DOM)

**Adoption** (Location map, Reviews card): `mount.innerHTML =` destroys adopted children.
- On adopt: record `originalParent` + `nextSibling`.
- **Release home before every wipe and on every exit path** — including observer-driven exits like a `check()` teardown; that path is the one that gets missed (it was missed; the gate caught it).
- Dispatch a window `resize` after adopting a Leaflet map.
- The gate must prove the full lifecycle: **adopt → survive a re-render as a single instance → return home intact on unmount.**

**Suspend-and-return** (build 326): when a borrowed surface hands control back to the base temporarily — release adopted nodes, drop the takeover, hide your own mount, raise a floating return pill. **Anchor suspension to the captured project id, never a `loadedFor` variable** — `loadedFor` resets and the observer un-suspends instantly.

**Re-anchor** (build 333): modules mounting into the base profile must check whether their mount is inside `#cr-cc`, compare to `body.cr-cc-open`, and relocate when they disagree — the punch box does this.

**Duplicate observers**: two modules relocating the same node fight forever. Ownership guards plus a dedupe pass; re-entrancy guards, content signatures, and rAF debouncing for self-triggering loops.

## Retail-B — shipped (335–341)

**Done.** Dark iron is committed at the base; verified at 373 that `body[data-crm="retail"]` occurs **0 times** — the 21-rule override layer is deleted, and a light-on-paper print override ships beside the other `@media print` blocks (15 now). `references/retail_b/` is the historical + regression record.

**The transferable lesson:** an override layer is a debt with a tripwire, and the whole late-session bug trickle before 335 (invisible subnotes, white panels, white overscroll, light popups) was one bug — that layer meeting unpainted corners a screen at a time. Same shape as the community home rebuild (359): a module capped at `max-width:680px` with zero `@media`. **A module capped at phone width with no media queries, or an override layer past its tripwire, is a rebuild — not a patch.**

## Preview doctrine for visual changes

Timid increments read as ignored requests (three title bumps of 4–6px; the user asked five times). For anything judged by eye:
1. Standalone mock of the **real** bar/card/section.
2. **The mock must be driven by the same toggle it demos.** `@media (max-width)` keys off the browser window, not the preview frame — a Desktop/Mobile toggle needs its own `body[data-w="mobile"]` rules duplicated alongside the media query, or the toggle shows the desktop layout crammed into phone width and the preview lies.
3. 2–4 labeled options.
4. Ship the pick as a **fixed value**, not viewport math. User-approved fixed values (see OPEN_ITEMS "Settled") are never converted back.
