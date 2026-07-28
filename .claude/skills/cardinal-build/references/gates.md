# Gates — the full doctrine

*Snapshot at build 334. If the project's `START_HERE.md` is in context, its gate ladder is the live version.*

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
10. **Print honest labels.** A harness once printed "PASS" on every line from a mangled ternary while the failure counter was correct — one wasted round of trust. The print and the counter must read the same boolean.

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

## The adoption family (borrowing live base DOM)

**Adoption** (Location map, Reviews card): `mount.innerHTML =` destroys adopted children.
- On adopt: record `originalParent` + `nextSibling`.
- **Release home before every wipe and on every exit path** — including observer-driven exits like a `check()` teardown; that path is the one that gets missed (it was missed; the gate caught it).
- Dispatch a window `resize` after adopting a Leaflet map.
- The gate must prove the full lifecycle: **adopt → survive a re-render as a single instance → return home intact on unmount.**

**Suspend-and-return** (build 326): when a borrowed surface hands control back to the base temporarily — release adopted nodes, drop the takeover, hide your own mount, raise a floating return pill. **Anchor suspension to the captured project id, never a `loadedFor` variable** — `loadedFor` resets and the observer un-suspends instantly.

**Re-anchor** (build 333): modules mounting into the base profile must check whether their mount is inside `#cr-cc`, compare to `body.cr-cc-open`, and relocate when they disagree — the punch box does this.

**Duplicate observers**: two modules relocating the same node fight forever. Ownership guards plus a dedupe pass; re-entrancy guards, content signatures, and rAF debouncing for self-triggering loops.

## Retail-B — committed

**Theo COMMITTED the full retail-B design July 27 (~7am).** The tripwire fired at 21 rules (build 334, zero `!important`); the override-layer era is over. **The committed build plan and spec live in `references/retail_b/SPEC.md`** with the interactive `estimates_final.html` beside it — open them, do not re-design. Headlines: dark base commit at source + delete the layer (inventory greps in OPEN_ITEMS §2 first — re-measure, never trust prose) + **light-on-paper print override** (non-negotiable) with the 8 nested document templates and client portal staying light; then All Leads & Jobs (Rail Left / Tri-Pane), then Estimates Status Lanes with **functional** filters and **no auto-archive (decision reversed — do not silently re-introduce)**, then the gold home button dispatching on `CardinalHeader.crm()` (never `goToLanding` — dead since 309). 5–7 builds; stage each separately as a safe resume point. Until step 1 lands, do not add retail overrides — every new one deepens the debt.

## Preview doctrine for visual changes

Timid increments read as ignored requests (three title bumps of 4–6px; the user asked five times). For anything judged by eye:
1. Standalone mock of the **real** bar/card/section.
2. 2–4 labeled options.
3. Ship the pick as a **fixed value**, not viewport math. User-approved fixed values (see OPEN_ITEMS "Settled") are never converted back.
