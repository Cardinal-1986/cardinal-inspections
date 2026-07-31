# Cardinal Resource App — read this first

Single-file PWA (`index.html`) for **Cardinal Roofing & Renovations, LLC**, Dayton OH.
Live at **app.cardinalroster.com** · Vercel deploys on merge to `main` · Supabase backend (DB, storage, auth, RLS) · serverless functions in `/api/` (ESM — `api/package.json` has `"type":"module"`, handlers are `export default async function handler`).

The file you want is lowercase **`index.html`** at the repo root. **100** inline `<script>` blocks, **101** `<style>` blocks, **3** external CDN scripts, **0** module scripts. No build step, no bundler, no framework, no test runner.

Owner: **Theo Dorion** · theo@cardinalrenovations.net

*Last verified against `origin/main @ d62244c`, 30 Jul 2026, stamped **build 451**. Every number in this file was re-measured against that commit.*

**Size, stated once so nobody re-derives it wrong:** **2,657,248 bytes on disk (2.66 MB)** — but **2,641,309 characters**, because the file is UTF-8 with multi-byte content. `check_build.py` prints the *character* count and labels it "bytes". `wc -c` prints the byte count. They will never agree; neither is broken.

---

## Read the doc set before doing anything

| File | Read when |
|---|---|
| `.claude/skills/cardinal-build/docs/START_HERE.md` | Always, first — app, workflow, gates, doctrine |
| `.claude/skills/cardinal-build/docs/FEATURES.md` | **Before building anything** — every feature and where it lives |
| `.claude/skills/cardinal-build/docs/OPEN_ITEMS.md` | Picking up work — live to-do, blockers, **settled decisions (don't re-litigate)** |
| `.claude/skills/cardinal-build/docs/BUG_CLASSES.md` | Before debugging, and before shipping |
| `.claude/skills/cardinal-build/docs/cardinal_build_log.md` | Tracing when/why something changed |
| `.claude/skills/cardinal-build/docs/HANDOFF.md` | Session-state bridge from the previous session |

The build workflow lives in `.claude/skills/cardinal-build/SKILL.md`. It triggers on any Cardinal work — features, bug fixes, theming, SQL, `/api`, audits.

### ⚠ The doc set stops at build 427. The app is at 451.

Every file above was written for the **29 July** session and is stamped `origin/main @ 202e6f3`, build 427. **Builds 428–451 are not in any of them** — not in `cardinal_build_log.md`, not in `FEATURES.md`, not in `OPEN_ITEMS.md`. `START_HERE.md` still says "Current build: 427".

**For 428–451, the only record is the `CHANGELOG` array in `<script id="cr-cl-script">` inside `index.html`.** It is current, complete and in the app's user-facing voice. Read it before you assume a feature is missing. A summary of what it says is in "What happened in 428–451" below.

**For session state — open items, settled decisions, handoffs — the `docs/` folder is authoritative over the skill's `references/` folder.** `references/app_map.md` remains a 388-era terrain map that itself defers to `FEATURES.md`. Do not proceed from memory — build numbers, open items and settled decisions change every session. **Check their dates against the current build before trusting them**; docs written a session ago describe a different app.

---

## The prime doctrine

**Things that look missing are usually buried.** Six "missing features" on this project were fully built and merely unreachable or plain-looking — a dead handler stub, an Attach bar under the bottom nav's z-index, a punch module mounting to hidden anchors, an entire Team page in the burger menu, a `styleMounts()` inline style beating every CSS rule, and two separate Estimates screens.

Before building: grep `FEATURES.md`, then grep the in-app `CHANGELOG` (it covers what `FEATURES.md` doesn't), then grep `index.html` for the feature name **and its mount anchor**. Ask "does this *element* still exist?" — not "does this code exist?" Extend, don't add. One pipeline per concept.

**Corollary: grep for the convention before inventing a mechanism.** The app already had `IC_SKIP` (per-CRM stage hiding) and `LEGACY_STAGE` (stage aliases). `PIPE_SKIP` was added by copying `IC_SKIP`'s shape. A new mechanism beside an existing one is a bug with a delay on it.

**Corollary: a name is not a contract.** `renderTeamPage()` lives in the **Resource Library** module (`cr-lib-script`) and renders the filed-material page. All 7 occurrences in the file are the Library's; the Team Directory does not use that name. Grep the block, not the identifier.

---

## What happened in 428–451 — the undocumented span

Reconstructed from the in-app `CHANGELOG` (147 entries, builds 166–451) and verified against the file. Build **450 is a gap**; gaps are normal here.

| Builds | Theme |
|---|---|
| **428** | **Fixed `currentBuild()`** — the What's New box had been reading a build number out of a stylesheet comment. This is the `data-cr-footer` fix the build log recommended. See "The build label" below. |
| **429** | Page background reads the `--bg` token instead of a hardcoded copy; light mode no longer shows dark overscroll |
| **430–436** | **Retail restyled to near-black with a steel accent** — deeper ground, darker cards, brushed-steel header, steel divider lines and card top edges (was red), white section headings, "Single source of truth" header text, ridge-cap bevel/shadow on cards. **Claims and Community were explicitly left untouched.** |
| **437–441** | Community readability — Due/Stage/Work/Bill-to enlarged and white, readable bid card, pencil beside Homeowner opening the bid form, desktop column width capped, **bid form went dark** (it had been a deliberately light cream card) |
| **442–447, 451** | **The Resource Library and its AI librarian** — a new top-level feature. See its own section below. |
| **448–449** | **Fallback-colour repair.** Insurance home and client list rendered see-through with the retail page ghosting behind them — *a background token was being stripped by another module within a second of load*. 448 fixed Cardinal Truth; 449 applied the same fallbacks to seven more claim screens (chat, appointments, documents, tasks, photos, payments). |
| **451** | Library and Manage NACHI no longer land on top of each other in the installed app; both stack with the TOC and the new light/dark toggle; clipped placeholder in client notes |

**448–449 is the single most important lesson in this span**, and it is a live confirmation of the fallback invariant below: a bare `var(--token)` is not merely fragile in theory — on this app another module really does strip a declaration within a second of load, and every surface referencing it bare goes transparent. That is why `var(--ccm-card,#161918)` has a literal in it.

---

## How builds work here

No build pipeline, no module folder, no pristine base. **All work is direct surgery on the shipped `index.html`.**

- **Every edit is exact-match**: `assert src.count(old) == 1` before replacing. A failed assert aborts before the write.
- **Anchors must match real whitespace** — print `repr()` of the real text first (`patch_lib.context`). Never guess a line break. `.cr-pcard.community` is one line; assuming otherwise silently matched nothing.
- **Verify anchors sequentially, applying each edit forward.** Anchor B may only be unique *after* edit A lands.
- **Prove scope two ways.** Re-applying the edits to a fresh copy must reproduce the file byte-for-byte; and replacing each changed region with a sentinel in both old and new must compare equal. **Walk regions in file order** or you get a false failure.
- `patch_lib.sub()` is literal splicing — it does **not** expand regex backreferences. Use `re.sub` for backrefs.
- **Recon regexes need bounds.** `[^{}]` can't cross a brace; unbounded `[\s\S]*` on a 2.6 MB file backtracks until timeout.
- **`</body>` now appears 10 times**, not 9 — contract templates and generated print/share documents carry their own, and the Resource Library added one more emitter. **Anchor with `rfind()`**, which still lands on the real document close at char 2,641,293.
- New `window.Cardinal*` export → `Object.assign(window.X || {}, {...})`, never plain assignment. There are **82** distinct `window.Cardinal*` names.
- **Grep the whole file for every occurrence of a selector before patching it.** `.acthead` had three definitions; the winner was ~39,000 lines after the two found first.

Helpers: `.claude/skills/cardinal-build/scripts/patch_lib.py` (atomic temp-then-rename writes) and `check_build.py` (the mechanical gate ladder). Also `jslex_count.py` (the lexer — see below), `contrast.py`, `selector_audit.py`.

---

## Counting things in this file — read before you assert a number

Most wrong claims on this project came from a count, not from reasoning. A bare regex over 2.6 MB is **not** evidence.

**Comments and strings lie in both directions.** Patch scripts document the values they change, so a naive count finds the value in its own explanatory comment. But naive comment-*stripping* is worse: `/*` inside a string literal is not a comment, and stripping on that basis deletes real code.

Worked example — counting the global scroll lock:

| Method | Answer |
|---|---|
| Bare regex | 14 modules — one was text inside a code comment |
| Strip `/* … */` first | 10 modules — ate real calls from three modules |
| **JS lexer (strings/templates/comments as states)** | **13 — correct** |

Both shortcuts were wrong, in opposite directions. **Use the lexer** — `scripts/jslex_count.py`, which reports CODE / strings / comments / regex-literal hits separately and tells you what a bare regex would have said.

**Scope the assertion to the function, not the file.** The single most repeated error here. `await signedPhotoMap(...)` appears twice — `publish()` and `openPreview()` — so asserting `1` file-wide fails a correct patch. Extract the function by brace-matching, then assert against that slice. Same trap with `LABEL`: a file-wide regex finds the *insurance* map (`'Lead':'Claim Filed'`) when you meant community (`'Lead':'Bid Requested'`).

**Prefer self-computing assertions** over hardcoded numbers, which are usually read off an already-patched tree:

```python
assert count(patched, VALUE) == count(orig, VALUE) - 1   # "exactly one changed"
```

**Print what your extractor captured** before asserting on it. An extractor that swallowed 2,271 characters returned empty counts, and empty looks like a legitimate zero.

**When a count contradicts you, suspect the regex.** A pattern using `[^;\n]*` cannot see an expression split across lines — that nearly produced a false "locks scroll and never releases" bug report against correct code.

**Watch for foreign namespaces inside your pattern.** A sweep for same-origin `/api/` routes returns `/api/staticmap` and `/api/js` — both are `maps.googleapis.com/maps/api/...`, not Cardinal routes. Two of three hits were false. Bound the pattern to the origin you mean.

### Current measurements (re-verified at build 451)

| Thing | Value | How it was measured |
|---|---:|---|
| Inline `<script>` blocks | 100 | `<script>` tags without `src=` |
| `<script>` tags total / external CDN | 103 / 3 | supabase-js@2, chart.js@4.4.3, papaparse@5.4.1 |
| `<style>` blocks / with an `id` | 101 / 95 | |
| `id`'d script+style blocks | 192 | the module surface |
| `window.Cardinal*` exports | 82 | distinct names |
| Modules writing the global scroll lock | **13** | lexer, CODE hits only |
| Scroll-lock writes | 15 locks · 18 bare releases · 1 conditional restore | 34 assignments + 1 comparison = 35 CODE hits |
| `normStage()` copies | 6 | 1 whitelist + 5 delegates |
| `.single()` / `.maybeSingle()` | **43 / 4** | `.maybeSingle()` was 0 at build 427 |
| `--ccm-*` declarations / refs | 64 / 132 (56 with fallback) | |
| `--rbe-*` declarations / refs | 154 / 601 (31 with fallback) | |
| `--lb-*` declarations / refs | 22 / 48 (38 with fallback) | Resource Library |
| `var()` refs total / with a literal fallback | 3,001 / 325 | **89% are bare** — see 448–449 |
| Surviving legacy gold hexes | **27** | `#c9a227` ×17 + `#b8860b` ×10 |
| `#c8202e` (cardinal red) | 264 | |
| `</body>` | 10 | |

---

## Gates — run every build, in order

```bash
python3 .claude/skills/cardinal-build/scripts/check_build.py index.html \
    --prev <previous> --marker '<the string your fix added>'
```

Covers per-block `node --check` on all inline scripts, tag balance, CSS brace balance, duplicate `<style id=>` detection, the dupe-API check, build-label bump, marker present in the artifact you wrote, and the **negative control**.

**It is green on `d62244c` right now** (exit 0), reporting: 100 inline scripts parse · 103/103 script tags · 101/101 style tags · CSS braces balanced · no duplicate style ids · no double-assigned `window.Cardinal*` · app stamp `v2026-07-30 build 451` · 20 version strings, 5 distinct builds. Start from green; if your first run is red, you broke it.

Then a **jsdom functional harness** on the changed surface. Recipe in `references/gates.md`. Where practical, go further: extract the *shipped* function text and execute it against real data shapes — not a re-implementation.

**Never commit on red. Never hand over with a failing check.**

### CI also gates this — `.github/workflows/check.yml`

Runs on every push to `main` and every PR. It is not a copy of `check_build.py`; it catches deploy-time failures that only Vercel would otherwise surface:

- **API filenames must contain no spaces** — Vercel rejects the *entire* build, at deploy time, not commit time.
- **No `module.exports` in `api/*.js`** — `api/package.json` sets `"type":"module"`; one CommonJS file makes *every* function fail with `FUNCTION_INVOCATION_FAILED`.
- `index.html` exists, is ≥1 MB, and ends with `</html>` (catches a truncated upload).
- Every inline script parses; CSS braces, `<div>` and `<script>` tags balance.
- `sw.js` and every `api/*.js` parse; `manifest.json` / `package.json` / `vercel.json` / `api/package.json` are valid JSON.
- **VAPID public keys match** between `index.html` and `api/notify.js`, or push silently fails.

Two of those steps carry `FIXED —` comments explaining that they used to check one file and pass while everything else was broken. Do not narrow them again.

### What the gates cannot see

**jsdom does not resolve `var()` inside `background` / `border` shorthands** — it returns `rgba(0,0,0,0)`. A gate can verify **structure** (element exists, class applied, attribute set) and **directly-read custom properties** via `getPropertyValue()`, but **cannot verify that a tokenized colour actually renders**.

For colour work: assert on the **CSS text**, run the negative control against the previous build, and **say plainly that Theo's eyes are the gate.** Do not report a green jsdom run as proof a colour is right.

**Contrast is arithmetic, not judgment — compute it** (`scripts/contrast.py`). Stage and CRM colours are chosen for a dark ground and collapse as text on a light one: the stage set reads 1.96–4.37:1 on white and the spine neons 1.17–2.36:1, against a 4.5:1 floor for body text. Two shipped builds carried unreadable chips before anyone noticed. When a surface goes light, compute the ratio for **every colour that carries text** and use the `STAGE_INK` / `colorLight` twins. Bars, spines and dots keep the bright originals — a glowing 3px rule is not text.

**Test against production data shapes, not convenient fixtures.** A photo-signing change was verified against `{path, url}` fixtures and shipped completely inert, because **zero** photo objects in the real database have `path` or `storage_path`. The code was correct and did nothing. Query the real shape first — the Supabase connector answers this directly.

**When a gate goes red, first ask whether the test or the app is wrong.** Roughly half of all reds on this project were the test's fault. Fix the test when the test is wrong; never bend the artifact to satisfy a bad assertion — the label gate compared dates, so two builds in one day read as un-bumped, and the first response was to change the date rather than the gate.

---

## Invariants — breaking these corrupts data silently

**`normStage()` is a whitelist.** Six copies; five delegate to the one in the main block.

```js
return STAGES.indexOf(s) !== -1 ? s : 'Lead';
```

Anything unrecognised **becomes `'Lead'`** with no error. Therefore: **`STAGES` must contain a stage value before any row is given it.** Ship the whitelist entry in its own commit, before the writer. Reversed, every affected job silently renders as a brand-new lead. Same rule for `LEGACY_STAGE`, `IC_SKIP`, `PIPE_SKIP`.

Current whitelist, verified in the file:

```js
['Lead','Prospect','OnHold','Approved','Scheduled','Completed','Invoiced','Closed','Lost']
```

**Never mutate `estimates.photos` objects.** `saveEstimate()` persists them verbatim; writing a signed (expiring) URL into that array corrupts the record permanently. Sign for **display only**.

**Community bills one party for work on another's house.** Payer, occupant and contact are three roles and routinely three different entities. Bids email the **funding partner**, not the homeowner. Any code touching "the client" in Community must say which one. 2 of 12 community jobs have no homeowner recorded at all.

**Palette tokens need literal fallbacks** when referenced from outside the stylesheet that declares them: `var(--ccm-card,#161918)`, never bare. **Builds 448–449 are the proof this is not theoretical** — a background token really was being stripped by another module within a second of load, and eight screens rendered see-through with the retail page ghosting behind them. **89% of the 3,001 `var()` references in this file are still bare.** When you touch a surface, add the literal.

**Adding `await` to a synchronous function is never a local change.** It opens a window in which the user can leave. List every side effect after the `await` and revalidate the precondition — a signed-URL round-trip inserted before a scroll lock froze the page with no overlay to dismiss.

**One global scroll lock, 13 modules, no reconciler.** `document.body.style.overflow` is written by 13 independent modules (15 locks, 18 bare releases, 1 conditional restore — all individually balanced). It leaks on any early return or throw between lock and release. This class has recurred three times. Do not add a 14th writer without checking `BUG_CLASSES.md`. Block 1 carries a deliberate self-heal (`if(... === 'hidden') ... = ''`) — that comparison is the one non-assignment hit in the count, and it is not a bug.

---

## The build label — there are 20 of them, and only one is the app version

**Two separators, and a regex that assumes one will miss the other.** Module banner comments use a middot (`v2026-07-22 · build 148`); footers and the app stamp use a space (`v2026-07-30 build 451`). Counting only the space form finds 9 of 20 strings and misses build 148 entirely.

`re.finditer(r"v(2026-\d\d-\d\d)\s*(?:·|)\s*build\s+(\d+)")` is the honest count:
**20 strings · 5 distinct builds (95, 146, 148, 404, 451).**

| Label | Count | Where | Meaning |
|---|---:|---|---|
| `v2026-07-30 build 451` | 1 | nav menu `<div data-cr-footer>`, char ~209,569 | **the app version — the only one in rendered markup, and the only one to bump** |
| `v2026-07-28 build 404` | 1 | `.cr-c-footer` | claims pane |
| `v2026-08-04 build 95` | 2 | `.cr-c-footer` + banner | Claims module (date is in the future; do not "fix" without asking) |
| `v2026-07-22 build 146` | 12 | `.cr-a-footer` / `.cr-k-footer` + banners | analytics / Keeper / portals / adjuster / coach |
| `v2026-07-22 build 148` | 4 | banner comments | estimates + pricing modules |

**The app stamp is the only version string in rendered markup**, and it is the only one followed by `&#8212;` plus a plain-English summary of the build. Everything else lives in a footer template or a `/* ... */` banner comment. A gate that compares the *set* of all labels can be fooled — bumping any plugin footer passes while the app stamp stays stale. **`check_build.py` now anchors on the app stamp** (`app_stamp()` prefers the `data-cr-footer` anchor, falls back to the em-dash form) and requires the build number to *strictly increase*. Negative-controlled across 7 scenarios.

**Bump the app label every build**, and add a `CHANGELOG` entry in `<script id="cr-cl-script">`. Build numbers are **ordering, not inventory** — 234, 241 and 299 are each reused for unrelated work, and there are gaps (450 is one). Never renumber history; 82 source comments cite build numbers.

### ✅ All three build-machinery defects are fixed — do not re-report them

`cardinal_build_log.md` §2 documents three live defects. **All three were resolved at build 428 and are verified fixed on `d62244c`.** The doc has not been updated to say so; this section is the correction.

- `data-cr-footer` **now exists in the markup**, exactly once, on the app-stamp `<div>`. `.menu-footer` still appears zero times — the selector lists in both consumers are `'[data-cr-footer], .menu-footer'` and `'.menu-footer, [data-cr-footer]'`, and because `querySelector` resolves in *document order* rather than selector order, both land on the stamp regardless.
- **`currentBuild()` returns 451**, not 406. It no longer falls through to scanning `body.textContent` and matching a `(build 406)` string inside CSS source. What's New works again.
- **`buildTag()` returns `build 451`**, so error reports carry a build number.
- **`CHANGELOG` is current at 451**, not stale at 342. 147 entries, 166 → 451.

One attribute, three silent failures, all closed. If you find yourself about to "fix" any of these, re-measure first.

---

## The Resource Library (builds 442–447, 451) — the newest feature, absent from `FEATURES.md`

A reference-material library with an AI assistant. Nothing in the doc set mentions it.

- **Front end:** `<style id="cr-lib-styles">` + `<script id="cr-lib-script">` (~28 KB), the last block in the file. Mounts into **`#resourceLibraryView` only**, as a fixed overlay. Exports `window.CardinalLibrary` via `Object.assign` (`open`, `reload`).
- **Back end:** `api/librarian.js`. Gemini-backed, same `GEMINI_API_KEY` and the same signed-in-session gate as `organize.js` / `caption.js` / `analyze.js`. Retry ladder is flash → 1.2s pause → flash, because the free tier 503s under load.
- **Scope is fenced, in both the module banner and the API header** — but the fence MOVED at build 471 and the old wording is no longer true. The Library files *reference* material: building code, roofing, siding, windows, gutters, manufacturer specs. It still has **no knowledge of clients, inspections, job paperwork or Company Documents, and must not be pointed at them.** That part is a stated design constraint, not an oversight.
- **The one exception, added 471 on Theo's explicit instruction after the constraint was put in front of him:** the librarian may ask for **photographs** from Cardinal's own CompanyCam account by emitting a `~~photos` block. **The model never receives photo data** — not the image, not the caption, not the project. It writes a search; `index.html` runs it through `api/companycam.js`, which is admin-only and refuses anything flagged `internal`. Do not widen this to client records on your own initiative; do not narrow it back either.
- **Its own token namespace, `--lb-*`** — 22 declarations, 48 references, **38 of them with literal fallbacks**. This is the best-behaved palette in the app; copy its habit, not the other 89%.
- **`lbRich()` is the renderer, and its ordering is load-bearing.** It **escapes first, then promotes** a small marker set on the already-escaped string — tables, headings, bullets, numbered lists, bold. By the time any promotion rule runs, every `<` is already `&lt;`, so nothing the API returns can open a tag. It deliberately supports **no links, no images, no raw HTML**. If you extend it, keep escape-then-promote in that order and keep the set small.
- Related but separate: **Manage NACHI** (`cr-nachi-*` blocks). Build 451 fixed the two landing on top of each other in the installed app.

---

## Theming — three CRMs, and two different light/dark mechanisms

**Retail** · **Cardinal Claims** (Aurora teal) · **Community** (green `--ccm-*`, dark by default). Plus Production, Sales Floor, Punch & Repairs, Photo Activity and the Team Directory, which are CRM-independent.

**Retail is no longer "iron, red/black/grey."** Builds 430–436 took it to **near-black with a brushed-steel accent**: deeper ground, darker cards, steel header, steel divider lines and steel card top edges (previously red), white section headings, a ridge-cap bevel and cut shadow on cards, and the header line "Single source of truth". The thicker card top edge stays red. Claims and Community were deliberately untouched by that pass.

**`crmNow()` computes the active CRM; `skin()` publishes it to `body.dataset.crm`.** `window.CardinalHeader.crm` is `crmNow` and recomputes on call — use it when you need the value before `skin()` has run. Everything else reads the DOM mirror (`document.body.dataset.crm || 'retail'`, 6 sites), and **CSS must gate on the attribute** (`body[data-crm="community"]`).

### Two theme mechanisms. Do not confuse them.

| Mechanism | Attribute | Storage | Scope |
|---|---|---|---|
| **App theme** | `data-theme="rb-light"` on `:root` | — | Retail light theme, `--rbe-*` tokens. 122 `data-theme` refs, 127 `rb-light` refs. |
| **Landing/login theme** | `data-mode="light"` on `documentElement` | `localStorage['cr-mode']` | **The landing page only.** All 17 `html[data-mode="light"]` selector groups target `#landingView` or a `.cr-lr-*` element — zero exceptions, measured. |

The `data-mode` toggle is the first script in `<head>` — it resolves before first paint (stored choice wins, else the OS preference), exposes `crFlip()`, delegates clicks from `[data-cr-theme]`, and **rewrites `<meta name=theme-color>`** because the manifest pins `#170f11` and an installed PWA otherwise keeps a black status bar above a paper-white page. **It is not an app-wide dark mode.** Do not wire app surfaces to it without a decision from Theo.

**Retail light theme (`rb-light`)** is driven by `--rbe-*` tokens in `:root` and `:root[data-theme="rb-light"]`. **Tokens, never an override layer** — retail-B was torn out at 21 override rules. **Three sanctioned exceptions** (the previous version of this file said two), each because dark and light needed genuinely *different designs* rather than one design in two palettes: the **calendars** (387), the **brass Client Directory** (391), and the **Production board** (393). In all three the dark original is untouched byte-for-byte and the light rules are scoped under `:root[data-theme="rb-light"]`.

**Community theming:** 64 `--ccm-*` token declarations (was 57), dark default at `:root` with a `[data-theme="rb-light"]` override. `body.cr-cc-open` is toggled in exactly one place (the client page's `takeOver()`), which makes it a safe community-only gate.

**"The gold palette was retired" is only three-quarters true — do not over-apply it.** PR #8 migrated **542** values (`#d4a017`→`#c8202e` cardinal red, `#f5d061`→`#e35c63`, `#8a5a00`→`#8f1620`, plus rgba twins) — all three source values are now at **zero** occurrences. It did **not** remove gold: **27 gold hex values remain and are correct where they are** — the **retail CRM badge** is `#c9a227` (17 occurrences), and `#b8860b` (10) is the fallback colour under the gradient-clipped text rules. Token *names* also survived their value change (`--ins-gold` is now `#c8202e`), so **grep the value, not the word "gold."** Before "finishing the migration", check whether the gold you found is the badge or a gradient fallback.

**Colour changes are rarely local.** Of 253 blue/cyan rules, only **4** carried a community selector — the rest are ungated, so a find-and-replace on a hex value is an app-wide restyle in disguise. Gate first, then restyle. **The surviving occurrences of an edited value are the proof the other CRMs were untouched — assert on them** (`scripts/selector_audit.py`).

**Semantic colours stay fixed in both themes** — milestone/pipeline circles, status spines, urgency red, CRM badge colours, the lavender PO, the lit favourite star, photo captions, the chrome blacks. Sales Floor is its own case: **red is the objection, navy is your answer** — colour carries meaning there, so don't spend either on decoration. The full list is in `FEATURES.md` and `OPEN_ITEMS.md` §6. **Do not "finish the job" by tokenizing these.** More than one build was spent re-learning it.

**Before "fixing" a light element on a dark ground, ask whether it is (a) hidden, (b) chrome with its own token system, or (c) deliberate contrast.** Only then is it a gap. Three standing false alarms — `.dashcard` (dead markup, hidden since 352), `#cr-hd2-ribbon` (header chrome, own `--hbg`/`--hln`/`--hac`/`--tgrad` system), and the calendars (deliberate paper-on-iron) — are recorded in `HANDOFF.md`. **Do not re-flag them.**

---

## Repo layout — and what is public

Everything in this repo is served publicly at `app.cardinalroster.com` **unless listed in `.vercelignore`**.

| Path | What |
|---|---|
| `index.html` | the app |
| `api/*.js` | 20 serverless functions (ESM) |
| `sw.js` | service worker — push + offline shell |
| `manifest.json`, `icon-*.png`, `apple-touch-icon.png` | PWA assets |
| `docs/*.pdf` | 3 contract PDFs — **referenced 6× by the app as print masters, deliberately public** |
| `bulk_assign.html` | referenced 2×, deliberately public |
| `vercel.json` | one cron: `/api/digest` daily at 11:00 UTC |
| `package.json` (root) + `api/package.json` | Node 22.x; `@supabase/supabase-js`, `web-push`. **Only `api/package.json` sets `"type":"module"`.** |

`.vercelignore` excludes `.claude/`, `CLAUDE.md`, `.github/` and ten orphaned scratch `.html` pages. Its header comment explains the reasoning and records that each entry was verified returning HTTP 200 to an anonymous visitor before being added. **Keep that discipline: if you add a file to the root, decide whether it ships.**

### ✅ The dead public files are gone — all four, do not re-report them

Earlier revisions of this file listed three things shipping publicly that should not.
**All are now removed**, on Theo's say-so, and the deployable tree went **12.56 MB → 8.42 MB**.

| Removed | Was | Why it was safe |
|---|---:|---|
| `api/index.html` | 2.23 MB | a **complete copy of the app stamped build 329**. Zero references anywhere — not in `index.html`, not in `vercel.json` (which holds only the digest cron), not in `check.yml` |
| `IMG_1510.png` | 1.65 MB | zero references, byte-identical to `cardinal-landing.PNG` |
| `TeamCalendar_Watermark_Mock.png` | 178 KB | zero references. Not previously flagged; found by sweeping every root image against what actually cites it |
| `librarian.js` (root) | 9 KB | older duplicate of `api/librarian.js`. Removed at build 453 |

**One correction to the old note, which mattered.** It listed `IMG_1510.png` and
`cardinal-landing.PNG` together as interchangeable duplicates. They are byte-identical, but
**`cardinal-landing.PNG` is live** — it is the `onerror` fallback behind
`cardinal-transparent.png` on the landing page:

```html
<img src="/cardinal-transparent.png" … onerror="this.src='/cardinal-landing.PNG'">
```

Deleting the wrong one of the pair breaks the first thing anyone sees. **Only the orphan
went.** Every other root image is referenced and earns its place — checked one by one against
`index.html`, `sw.js` and `manifest.json`, not eyeballed.

**One route is referenced but missing: `/api/config`.** `loadConfig()` in the Google Maps module fetches it; there is no `api/config.js`. It **degrades cleanly** — the `.catch` sets `API_KEY = ''`, `loadMaps()` then throws `'no google maps key configured'` and nothing crashes — but **Google Maps address autocomplete is silently off**. Verify against production before treating this as a bug; the route may be provided by Vercel configuration outside the repo.

---

## Shipping (cloud sessions)

Work on a branch, push, open a PR with a plain summary of what changed and what it cost. **Theo reviews and merges; Vercel deploys from `main`.**

- **SQL ships as separate `.sql` files, and runs BEFORE the `index.html` change.** Say so explicitly in the PR.
- On ship: add the feature row to `FEATURES.md`, one line to `cardinal_build_log.md`, strike the `OPEN_ITEMS.md` entry — in the same PR. **The 428–451 span is what skipping this looks like:** 24 builds of real work with no record outside the in-app changelog.
- Take a fresh `git hash-object` before pushing, to confirm what you push is what you verified.

### The service worker no longer serves stale builds — but keep the advice

The standing instruction has been "close and reopen the PWA twice." **The mechanism changed.** `sw.js` is now **network-first for navigations** and says so in its header: a fresh deploy is picked up on the very next load. Supabase and `/api/*` are never cached. So the old *cause* is gone.

What remains true:

- **Static assets are cache-first with no revalidation**, and `CACHE = 'cardinal-shell-v1'` **has never been bumped** despite its own comment saying "bump CACHE on each deploy." Change an icon, the manifest or any static asset and users keep the old one until that string changes. **If your build touches a static asset, bump the cache name.**
- An installed PWA can hold the old document in memory across a soft close.

So: still tell Theo to fully close and reopen twice — it costs nothing and covers the second case — but **do not diagnose a stale `index.html` as a service-worker cache problem.** It isn't one any more. Twice, that misdiagnosis masqueraded as "the fix didn't work."

---

## Permissions

```
Admin       theo@, joan@              everything, including all money
Production  curtis@, scottie@         all clients; no stats strips or partner money
Sales       nick@, joey@, jacob@      only what they created or are assigned (RLS)
```

`project_assigned_rep()` takes `p.checklist`, **not** `p.id`. `is_cardinal_admin()` is security-definer to avoid RLS recursion. Theo + Joan are hardcoded admin fallbacks in SQL and API.

Client name column is **`name`**. Money has one chokepoint: `bidAmt()`. `stage_since` must be written on creation. **`.single()` throws on zero rows — there are 43 of them against only 4 `.maybeSingle()`** (that was 0 at build 427, so the migration has started); use `.maybeSingle()` wherever absence is legal.

---

## Working with Theo

- **Never state an inferred fact as fact. Reproduce before theorising** — screenshots have root-caused more bugs on this project than reasoning has.
- **Check the repo before claiming anything about its state.** Whether a build is live, whether a file was uploaded, what a doc actually says — all of it is one `curl` or one API call away. Note that `raw.githubusercontent.com` serves stale copies for minutes after a commit; when it disagrees with you, re-check against the commit SHA or the API. Getting this wrong repeatedly is what "walking in circles" feels like from the other side.
- **Check whether a file exists before creating it.** This document already existed and nearly got overwritten.
- **Audit before building.** Assume the feature exists and is buried.
- **Terse, honest reporting.** What shipped, what it cost, what's still broken. No flattery. **Report your own regressions plainly and name them as yours.**
- **Report false positives as false positives.** Chasing a non-bug and presenting it as a finding costs trust. Four "bugs" here were an idempotent double-lock, a `JSON.parse(JSON.stringify(x))` deep copy, an internal literal in a selector, and `renderTeamPage` inside the Library module (it is defined there — 7 occurrences, all local).
- **Offer patch-vs-replace with real costs** when there's a choice. The tell that a replace is due: a module capped at a phone width with no media queries, or an override layer past its tripwire (retail hit 21 rules). **Deletion at source beats out-specificity.**
- **Preview visual changes** before shipping — labelled options, dark and light, desktop and mobile, then build the pick. **Verify the preview matches production**: a palette once shipped to every preview and never to the app. Mock previews must be driven by the same toggle they demo — `@media (max-width)` keys off the browser window, not the preview frame.
- He answers in short numbered picks ("2 and 1", "3"). Give numbered options.
- **Domain detail from him is load-bearing.** "Some of these could last 2 years depending on the grant" is why the `OnHold` stage exists. Habitat for Humanity of Greater Dayton does most of the community volume and appears in an annual joint TV commercial — **Habitat sorts first in every partner list.** Owens Corning throughout, not GAF.
- **Never write an unverified email address into `community_partners`.** A bid sent to a guessed address is a lost bid. Ask.
- **One build at a time**, verified before the next starts.
- Theo works from a phone, deploys through the GitHub web UI, and works very late. Match the pace he sets and get out of the way.

---

## Secrets

Never put credentials in `index.html`, in a commit, or in a chat message. They go in Vercel env vars or GitHub secrets only. A Gemini key and a GitHub PAT have both been exposed in chat on this project — assume that mistake is easy to repeat and refuse to repeat it.

Note that `api/*.js` files carry **hardcoded fallbacks for the Supabase URL and the publishable anon key**. Those two are designed to be public and are safe. **Nothing else is.** Service-role keys, `GEMINI_API_KEY` and VAPID private keys must stay in env vars — and remember that anything at the repo root is served publicly unless `.vercelignore` says otherwise.
