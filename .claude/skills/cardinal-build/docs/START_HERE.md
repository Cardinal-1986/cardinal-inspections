# Cardinal Resource App — START HERE

**Read this first. Then read the doc you actually need:**

| File | What it holds | Read it when |
|---|---|---|
| **START_HERE.md** (this) | The app, the workflow, the gates, the doctrine | Always, first |
| **FEATURES.md** | Every feature and where it lives | Before building anything |
| **OPEN_ITEMS.md** | The live to-do list and blockers | Picking up work |
| **BUG_CLASSES.md** | Failure modes already paid for | Before debugging, and before shipping |
| **cardinal_build_log.md** | One line per build | Tracing when and why something changed |

**Current build: 427 · July 29, 2026 · 2.59 MB · 99 inline script blocks · 177 named modules · 74 `window.Cardinal*` exports**

---

## 1. The app

A single-file PWA (`index.html`) for **Cardinal Roofing & Renovations, LLC** — Dayton, Ohio. Team CRM, inspections, estimates, contracts, photos, production, punch lists, insurance claims, community/nonprofit bids.

**Deployed:** GitHub `Cardinal-1986/cardinal-inspections` → Vercel → `app.cardinalroster.com` · installable PWA · Supabase backend (database, storage, auth, RLS) · serverless functions in `/api/` (ESM — `api/package.json` has `"type":"module"`, handlers are `export default async function handler`).

**Owner:** Theo Dorion · theo@cardinalrenovations.net

| Role | People | Sees |
|---|---|---|
| Admin | theo@, joan@ | Everything, including all money |
| Production | curtis@, scottie@ | All clients; **no** stats strips or partner money (presentation-gated) |
| Sales | nick@, joey@, jacob@ | Only what they created or are assigned (database-enforced) |

**Three CRMs in one app**, switched from the banner chips or the bottom bar: **Retail** (iron; red/black/grey since 542 values migrated off gold, though the retail badge stays `#c9a227`), **Cardinal Claims** (Aurora teal), **Community** (green `--ccm-*`, dark by default since build 427+). Plus Production, Sales Floor, Punch & Repairs, Photo Activity and the Team Directory, which are CRM-independent.

**Universal chrome (since 344–346):** the fixed header carries burger · gold home · CRM title · ＋, and directly beneath it a **banner nav** — Home · Contacts · Leads · Photos · Track · Reports · Production ▾ · Tools ▾ · CRM switcher · search. The banner lives *inside* `header.site` so it scrolls with it; `fixHeadPad()` measures the whole block and keeps content clear.

---

## 2. How builds work

No build pipeline, no module folder, no pristine base. **All work is direct surgery on the shipped file.**

```
/home/claude/app/index_v{N}.html          ← lineage, one file per build
        ↓  python patch script (exact-match asserts, atomic temp-then-rename)
/home/claude/app/index_v{N+1}.html
        ↓  gates (section 3)
/mnt/user-data/outputs/cardinal_v{N+1}_index.html   ← Theo uploads as index.html
```

Non-negotiable:

- **Every edit is exact-match**: `assert src.count(old) == 1` before replacing. A failed assert aborts before the write, so the previous build is never corrupted.
- **Anchors must match real whitespace.** Print `repr()` of the real text before writing the patch.
- **The patch helper is literal string splicing** — it does NOT expand regex backreferences. Use `re.sub` for backrefs.
- **Recon regexes need bounds.** `[^{}]` can't cross a brace; `[\s\S]*` on a 2 MB file backtracks forever.
- **Bump the build label every build** — search `v2026-`.
- **Unique output filename every build** (`cardinal_v373_index.html`) — mobile browsers serve cached downloads on repeated names. Retire the superseded file from outputs so only one candidate is ever visible.
- **Deploy order: SQL first, then index.html.** After deploy, fully close and reopen the PWA **twice** — the service worker serves stale builds.
- **Appending a module**: `</body>` appears 9 times (contract templates carry their own). Anchor with `rfind('</body>')`.

---

## 3. The gate ladder

Run in order. **Stage to outputs only on verified green** — check the exit code, never the eyeball.

1. **`node --check`** on all 99 inline script blocks, extracted individually.
2. **Tag balance** (`<script>`/`<style>`) and CSS brace balance.
3. **Whole-string assertions** — assert entire rules and structures, never fragments.
4. **jsdom functional harness** — boot the file, mock `cacheProjects` / `currentUser` / chainable `sb` and `supa`, shim `offsetParent`, then exercise the changed surface with **structural proofs** (`matches()`, parentage, counts).
5. **Harnesses must replicate the real structure.** A harness seeded from your own assumption validates fiction.
6. **Dupe-API check**: no `window.Cardinal*` plainly assigned twice.
7. **Negative control before belief**: run the same gate against the **previous** build and confirm it *fails* there. For bug fixes, reproduce the bug on the old build first.
8. **Assert on the artifact you just wrote.**
9. **Lock your mocks** — and **re-bind `w.sb` after boot**, because the app nulls it when `TEAM` is false at parse time.
10. **Print honest labels**, and gate on `$?`.

**jsdom's limit is absolute: it proves *does this work*, never *does this look right* — and it is narrower than that.** It does **not** resolve `var()` inside `background`/`border` shorthands (returns transparent), so it cannot verify tokenized colour at all; it can only read custom properties directly via `getPropertyValue()`. For colour work, assert on CSS text, negative-control it, and say plainly that Theo's eyes are the gate (388). Build 359 shipped a CSS selector that hid the community tabs; every structural proof passed because the elements existed. Visual verification is Menu → 🩺 Self Check plus Theo's eyes.

**When a gate goes red, first ask whether the test or the app is wrong.** Roughly half the reds in the 335–373 run were stale or mistaken assertions — behaviour we deliberately changed, a missing semicolon in a regex, a spy on a function the code never calls. Fix the gate when the gate is wrong; never fix the app to satisfy an old assumption.

---

## 4. Patch vs replace

**When there's a choice, say so before starting, with an honest cost on each.**

- **True replacement** is right when a module's job changed wholesale — delete and rebuild, preserving the public API surface (`window.Cardinal*`) so callers survive. Done cleanly for: retail-B, the brass client directory, the community home (359), the Keeper profile, the Badge client card.
- **The tell that a replace is due:** a module capped at a phone width with no media queries (community home was `max-width:680px`, zero `@media`), or an override layer past its tripwire (retail hit 21 rules).
- **Deletion at source beats out-specificity.** When a rule is wrong, delete it; don't stack a stronger one on top.
- **Sanctioned patching**: one-or-two-property geometry fixes, and beating an inline `z-index` with `!important`.
- **The community client page is a written exception** — it borrows the base profile's engine rather than forking it (adoption pattern below).

### The adoption pattern (borrowing live base elements)

`mount.innerHTML =` destroys adopted children. Record original parent + nextSibling on adopt; **release home before every wipe and on every exit path**. Dispatch a window `resize` after adopting a Leaflet map. Suspend-and-return must be **anchored to the captured project id**, not a `loadedFor` variable.

---

## 5. Working with Theo

- **Never state an inferred fact as fact.** Reproduce before theorising — screenshots have root-caused more bugs on this project than reasoning has.
- **Audit before building.** Four features "built" on this project already existed: manual estimates, the photo Attach bar, the punch profile card, and the **Team page** (373). When something looks missing, first assume it exists and is buried.
- **Terse, honest reporting.** What shipped, what it cost, what's still broken. No flattery.
- **Preview visual changes before shipping.** Interactive mocks with a Desktop/Mobile switcher, then ship the pick.
- **Mock previews must be driven by the same toggle they demo.** `@media (max-width)` keys off the browser window, not the preview frame — a mobile toggle needs its own `body[data-w="mobile"]` rules or it lies.
- **Mobile-first, always.** Theo works entirely on a phone and deploys through the GitHub web UI.
- **Bump the label. Remind about the service worker.**
- **Never stage on red, never hand over with a failing check.**
- Theo works very late. Match the pace he sets and get out of the way.

---

*Doc set current at build 373. Keep this file about the app and the process — the to-do list lives in OPEN_ITEMS.md, the lessons in BUG_CLASSES.md.*

---

# Session 29 July 2026 — additions

*Updated 29 July 2026 — session of 34 merged PRs, `origin/main @ 202e6f3`, app stamped build 427.*

## Counting things in this file — read before you assert a number

Most wrong claims on this project came from a count, not from reasoning. A bare regex over 2.5 MB is **not** evidence.

**Comments and strings lie in both directions.** Patch scripts document the values they change, so a naive count finds the value in its own explanatory comment. But naive comment-*stripping* is worse: `/*` inside a string literal is not a comment, and stripping on that basis deletes real code.

Worked example — counting the global scroll lock:

| Method | Answer |
|---|---|
| Bare regex | 14 modules — one was text inside a code comment |
| Strip `/* … */` first | 10 modules — ate real calls from three modules |
| **JS lexer (strings/templates/comments as states)** | **13 — correct** |

Both shortcuts were wrong, in opposite directions. **Use a lexer.**

**Scope the assertion to the function, not the file.** The single most repeated error here. `await signedPhotoMap(...)` appears twice — `publish()` and `openPreview()` — so asserting `1` file-wide fails a correct patch. Extract the function by brace-matching, then assert against that slice. Same trap with `LABEL`: a file-wide regex finds the *insurance* map (`'Lead':'Claim Filed'`) when you meant community (`'Lead':'Bid Requested'`).

**Prefer self-computing assertions** over hardcoded numbers, which are usually read off an already-patched tree:

```python
assert count(patched, VALUE) == count(orig, VALUE) - 1   # "exactly one changed"
```

**Print what your extractor captured** before asserting on it. An extractor that swallowed 2,271 characters returned empty counts, and empty looks like a legitimate zero.

**When a count contradicts you, suspect the regex.** A pattern using `[^;\n]*` cannot see an expression split across lines — that nearly produced a false "locks scroll and never releases" bug report against correct code.

---

## 5. Invariants you must not break

**`normStage()` is a whitelist.** Six copies exist; five delegate to the one
in the main block.

```js
return STAGES.indexOf(s) !== -1 ? s : 'Lead';
```

Anything it does not recognise **silently becomes `'Lead'`**. Therefore:

> **`STAGES` must contain a stage value before any row is given that value.**

Ship the whitelist entry first, in its own commit. If you write a row with a
stage the whitelist has not learned, every affected job renders as a brand-new
bid request and you will not get an error.

**Never mutate `estimates.photos` objects.** `saveEstimate()` persists them
verbatim. Writing a signed (expiring) URL back into that array corrupts the
record permanently. Sign for *display only*.

**Community palette tokens need literal fallbacks.** `--ccm-*` are declared
in the community stylesheets. When you reference them from a block outside
those sheets, always `var(--ccm-card,#161918)` — never bare — or the surface
renders transparent if the declaration ever moves.

**Follow existing conventions instead of inventing mechanisms.** The app
already had `IC_SKIP` (per-CRM stage hiding) and `LEGACY_STAGE` (stage
aliases). `PIPE_SKIP` was added this session by copying `IC_SKIP`'s shape
rather than designing something new. Grep for a convention before you invent.

---

> The full patch-discipline checklist, the corrected two-party rules and the current open list live in `HANDOFF.md`, `FEATURES.md` and `OPEN_ITEMS.md`.
