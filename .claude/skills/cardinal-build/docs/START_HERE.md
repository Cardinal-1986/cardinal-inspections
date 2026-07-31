# Cardinal Resource App — START HERE

**Read this first. Then read the doc you actually need:**

| File | What it holds | Read it when |
|---|---|---|
| **START_HERE.md** (this) | The app, the workflow, the gates, the doctrine | Always, first |
| **FEATURES.md** | Every feature and where it lives | Before building anything |
| **OPEN_ITEMS.md** | The live to-do list and blockers | Picking up work |
| **BUG_CLASSES.md** | Failure modes already paid for | Before debugging, and before shipping |
| **cardinal_build_log.md** | One line per build | Tracing when and why something changed |
| **HANDOFF.md** | Session-state bridge | It says so itself — read it early |
| **`CLAUDE.md`** (repo root) | The current, authoritative overview | **Before this file.** It is kept current; the older sections here are not |

**Measured at build 467 · 31 July 2026 · 2,772,640 bytes (2.64 MB) on disk, 2,756,681 characters · 100 inline script blocks · 103 `<script>` tags (3 external CDN) · 101 `<style>` blocks · 192 id'd script+style blocks · 82 `window.Cardinal*` exports · `</body>` ×10**

*Those figures were true at 467 and are not re-checked automatically. For anything since, read the `CHANGELOG` array in `index.html` — it is the only record that survives work done outside this folder.*

> Re-measured at 467, not carried forward. **Bytes and characters differ** because the file is
> UTF-8 with multi-byte content — `check_build.py` prints the character count and labels it
> "bytes", `wc -c` prints bytes. Neither is broken.

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

**Three CRMs in one app**, switched from the banner chips or the bottom bar: **Retail** (**near-black with a brushed-steel accent since 430–436** — it is no longer the "iron, red/black/grey" this file used to describe; the red survives on the thick card top edge, and the retail badge stays `#c9a227`), **Cardinal Claims** (Aurora teal), **Community** (green `--ccm-*`, dark by default). Plus Production, Sales Floor, Punch & Repairs, Photo Activity and the Team Directory, which are CRM-independent.

**Universal chrome (since 344–346):** the fixed header carries burger · gold home · CRM title · ＋, and directly beneath it a **banner nav** — Home · Contacts · Leads · Photos · Track · Reports · Production ▾ · Tools ▾ · CRM switcher · search. The banner lives *inside* `header.site` so it scrolls with it; `fixHeadPad()` measures the whole block and keeps content clear.

---

## 2. How builds work

No build pipeline, no module folder, no pristine base. **All work is direct surgery on the shipped file.**

> ### ⚠ The flow below replaced the upload flow — do not go looking for `/home/claude/app/`
>
> Earlier revisions of this file described patching `/home/claude/app/index_v{N}.html` and
> staging `cardinal_v{N}_index.html` into `/mnt/user-data/outputs/` for Theo to upload by hand.
> **That is gone.** Work now happens in a **git checkout of the repo**, and ships as a **pull
> request** Theo reviews and merges; Vercel deploys from `main`. Those paths do not exist, and
> a session that hunts for them wastes its first ten minutes.

```
<repo>/index.html                         ← patch it in place, on a branch
        ↓  python patch script (exact-match asserts, atomic temp-then-rename)
<repo>/index.html                         ← same file, one build older in git
        ↓  gates (section 3), then the scope proof
   git commit → push → PR → Theo merges → Vercel deploys from main
```

Keep a copy of the previous build beside the working tree (`index_<N-1>.html` in the
scratchpad) — `check_build.py --prev` and every negative control need it.

Non-negotiable:

- **Every edit is exact-match**: `assert src.count(old) == 1` before replacing. A failed assert aborts before the write, so the previous build is never corrupted.
- **Anchors must match real whitespace.** Print `repr()` of the real text before writing the patch.
- **The patch helper is literal string splicing** — it does NOT expand regex backreferences. Use `re.sub` for backrefs.
- **Recon regexes need bounds.** `[^{}]` can't cross a brace; `[\s\S]*` on a 2 MB file backtracks forever.
- **Bump the build label every build** — search `v2026-`.
- **Take a fresh `git hash-object` before pushing**, to confirm what you push is what you gated.
- **Deploy order: SQL first, then index.html.** Still close and reopen the PWA **twice** after a deploy — but **`sw.js` is network-first for navigations now**, so a stale `index.html` is no longer a service-worker cache problem. Static assets are still cache-first and `CACHE` has never been bumped: if your build touches an icon or the manifest, bump the cache name.
- **Appending a module**: `</body>` appears **10** times (contract templates, generated print/share documents and the Resource Library each carry their own). Anchor with `rfind('</body>')`.

---

## 3. The gate ladder

Run in order. **Never commit on red** — check the exit code, never the eyeball. The mechanical
ladder is one command: `scripts/check_build.py index.html --prev <previous> --marker '<string your fix added>'`.

1. **`node --check`** on all **100** inline script blocks, extracted individually.
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

*Sections 1–5 above were written at build 373 and patched forward. Keep this file about the app and the process — the to-do list lives in OPEN_ITEMS.md, the lessons in BUG_CLASSES.md.*

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

---

# Session 30–31 July 2026 — builds 428–467

*Written at build 467, `origin/main @ cc0b591`. The sections above were written at 373 and 427
and patched forward; **where this section and an older one disagree, this one is right**.*

## Where the record actually lives now

The doc set fell forty builds behind. It is caught up as follows, and **nothing is duplicated** —
go to the right file rather than trusting a summary:

| Span | Where the detail is |
|---|---|
| 428–451 | **`CLAUDE.md`**, reconstructed from the in-app `CHANGELOG`. Never had build-log entries |
| 452–467 | **`cardinal_build_log.md`**, one full entry per build |
| The Resource Library | **`FEATURES.md`** — its own section, current at 463 |
| What is still open | **`OPEN_ITEMS.md`** |

**`CLAUDE.md` at the repo root is the authoritative overview.** It is re-measured every session.
This file is the workflow and the doctrine.

## Doctrine that changed or hardened in this span

**Adding a Resource Library page takes FOUR registrations, not three** (463). Markup, the
`data-rlgoto` map, `parentOf`, **and `var TOC`** — a hand-maintained hub → page list that build
453 left behind when it replaced the hand-typed *card* list. With three of four, the page
renders, navigates, and finds its own cards, while global search returns **zero** for every term
on it. Silent half-failure; only a search assertion catches it. Table in `FEATURES.md`.

**Every negative control must FAIL, not crash.** Four separate harnesses in this session threw
a `TypeError` on the previous build instead of counting a red — a stack trace proves nothing
about whether the checks discriminate. Guard the dereference and record the failure.

**Self-computing assertions, and this is not advice — it is the most repeated mistake here.**
Eight hardcoded-count assertions fired across builds 466–467 alone. One fired on the very
construction it was written to protect; one split an argument list on commas when the labels
*contain* commas; one assumed a regex appeared once when it appears twice in its own rule; one
assumed a single `itemHtml` when **three modules define one** (pricing, punch, library). Assert
the *property* — "unchanged", "exactly one gained X", "inside this block" — not the tally.

**Plates inline their SVG. They must not use the icon sprite.** A `<use>` reference builds a
shadow tree and a document rule cannot select into it, so sprite-based figures render with no
accent at all. Found by rendering, not by reading. `figure.rl-fig`, five plates as of 465.

**A picture must not say what the words do not.** The librarian can draw (466), but the model
emits *data* in a fenced block and the app draws the SVG — the escape-then-promote contract in
`lbRich()` is never relaxed for a picture. The prompt rule that matters most is that a diagram
may only restate something the prose already says.

## Repo hygiene

**4.1 MB of dead files were removed** from the public deployment: `api/index.html` (a complete
copy of the app, build 329), `IMG_1510.png`, `TeamCalendar_Watermark_Mock.png`. Each verified
unreferenced first. **`cardinal-landing.PNG` looks like a duplicate and is not** — it is the live
`onerror` fallback on the landing page. Details and the correction are in `CLAUDE.md`.
