# Cardinal Resource App — read this first

Single-file PWA (`index.html`) for **Cardinal Roofing & Renovations, LLC**, Dayton OH.
Live at **app.cardinalroster.com** · Vercel deploys on merge to `main` · Supabase backend (DB, storage, auth, RLS) · serverless functions in `/api/` (ESM — `api/package.json` has `"type":"module"`, handlers are `export default async function handler`).

Since the 574–594 span the repo ships **three HTML artifacts**, not one: `index.html` (the app — which also serves the **Vision hub** front door when the hostname starts with `showroom.` or `?vision=1` is set), `popup.html` (**The Pop-Up Roof**, the client-facing book behind the `presentation.cardinalroster.com` / `presentation.cardinalrenovations.com` rewrites in `vercel.json`) and `studio.html` (**Cardinal Studio**, the standalone admin curation browser). See "Builds 574–594" and "Builds 595–630" below before touching any of them.

For app work the file you want is still lowercase **`index.html`** at the repo root. **106** inline `<script>` blocks, **118** `<style>` blocks, **3** external CDN scripts, **0** module scripts. No build step, no bundler, no framework, no test runner.

Owner: **Theo Dorion** · theo@cardinalrenovations.net

*Figures below carry the build they were measured at. Rows marked **@627** were re-measured 8 Aug 2026 on the build-627 artifact, by a script that was first validated against the build-573 tree (`aeac5e5`) and reproduced this document's recorded 573 column exactly — so the deltas below are real movement, not a regex that drifted. Anything still carrying an older stamp is flagged in place; it is kept rather than deleted so nobody "corrects" a right number, but do not quote it as current without re-measuring.*

*Across 573 → 627 the file grew by two modules and one span nobody wrote down. Inline scripts 104 → **106**, style blocks 114 → **118**, `window.Cardinal*` 87 → **90**. The named deltas are the Showcase at 574 (`cr-show-styles` / `cr-show-script` / `CardinalShowcase`) and **OC Colors at 615** (`cr-occ-styles` / `cr-occ-script` / `CardinalColors`, palette `--occ-*`); the remainder arrived in the **595–614** span, which had no narrative in this file until now — see its section below. `</body>` is still **11**, and `.observe(document.body …)` is still **50**. If you are quoting a number from a revision of this document older than 557, it is wrong.*

**Size, stated once so nobody re-derives it wrong (@627):** **3,653,330 bytes on disk (3.48 MiB / 3.65 MB)** — but **3,630,040 characters**, because the file is UTF-8 with multi-byte content. `check_build.py` prints the *character* count and labels it "bytes". `wc -c` prints the byte count. They will never agree; neither is broken. The file grew ~151 KB across 595–627 (and ~177 KB across 574–594, ~42 KB across 558–573, ~464 KB across 483–557).

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
| `.claude/skills/cardinal-build/docs/CONTRACTOR_VISION_SUITE.md` | Before touching the Showcase / Walk / Hall of Fame / Showroom — the 14-agent audit of what exists vs. what is **fenced by settled decisions** |
| `.claude/skills/cardinal-build/docs/ROOF_JOURNEY_BRIEF.md` (+ `_COPY`, `_DIRECTIONS`) | Before touching `popup.html` — Theo's verbatim brief and the book's copy |
| `.claude/skills/cardinal-build/docs/DGX_SPARK_ILLUSTRATIONS.md` | Anything DGX-Spark-adjacent — the standing rule that the Spark is never a live app dependency |
| `spark/README.md` + `spark/STUDIO_TAGGING.md` | Spark-side pipeline work — archiving photo bytes, tagging, Studio pushes |
| `.claude/skills/cardinal-build/docs/OC_BRAND_RULES.md` | **Before putting any Owens Corning or Pink Panther mark on a screen** — the approval gate is Theo's to pass, and the Panther IS available to contractors (a claim to the contrary shipped at 615–623 and was wrong) |

The build workflow lives in `.claude/skills/cardinal-build/SKILL.md`. It triggers on any Cardinal work — features, bug fixes, theming, SQL, `/api`, audits.

### ⚠ The doc set lags the app — check the gap before trusting a number

*The one thing that has never changed: **`cardinal_build_log.md` has no entry for roughly 468–542**, because much of that span was built through a different tool that never read this folder.*

**As of 8 Aug 2026 the app is at build 630.** Current state:

| File | Worked forward to | Trust it? |
|---|---|---|
| `cardinal_build_log.md` | **630** — last entry is the colour photo grid (8 Aug) | ✅ **the one doc that never fell behind.** Entries written as each build shipped, 543 onward |
| `FEATURES.md` | **628 in content**; the header stamp now says 627 and no stamp inside it outranks the section it sits in | ✅ 624–628 appended at the bottom 8 Aug |
| `OPEN_ITEMS.md` | **628** | ✅ brought forward 8 Aug — the bundle-splitting verdict, the deferred `showroom.html`, what 627 left open, and the 628 question deliberately left unanswered |
| `HANDOFF.md` | **3 Aug session** (the book; 574–593 the same day) | ⚠️ **now five days and ~34 builds behind** — nothing from 595–627 is in it. Still newest-session-first, and still the fastest read for *why* something was done. Known staleness: it records PR #108 as open; that landed on `main` long ago |
| `BUG_CLASSES.md` | **630** (class 15) | ✅ classes 12–13 at 573, 14 at 595, **15 at 630 — assertions that match their own comment, six false reds in one session**; the rest is 427-era |
| `OC_BRAND_RULES.md` | **8 Aug** | ✅ newest doc in the set — read it before any OC or Pink Panther mark |
| `CONTRACTOR_VISION_SUITE.md` | **572** | ✅ an audit, not a status page — its fences are still the fences |
| `START_HERE.md` | 467 | ⚠️ historical — it now says itself to read `CLAUDE.md` first |

**The span with no narrative record anywhere in the doc set is still roughly 468–542.** 595–627 *is* recorded — in `cardinal_build_log.md`, in the in-app `CHANGELOG`, and (since 8 Aug) in this file and `FEATURES.md`.

**Every doc states the build it was worked forward to.** That stamp stays true forever; the table above says whether it is still current. This file has twice been found making a *stale claim about staleness* — asserting `START_HERE.md` said 427 when it said 467, then calling the whole set two sessions behind after most of it had been updated. **Re-check the table before repeating any claim in it, including this one.**

**⚠ The in-app `CHANGELOG` was REBUILT at build 574 and no longer covers the old spans.** Earlier revisions of this file said the array in `<script id="cr-cl-script">` was "the only complete record" for 428–542. **That record now exists only in git history**: the array was replaced wholesale at 574 with a new entry shape (`{ b, d, t, s }` — build, date, title, long user-facing summary) and now holds **48 entries, builds 574–627** (gaps at 581–583, 599, 600 and 614, which are normal). For anything 166–573, read the old array out of a pre-574 revision — **`git show aeac5e5:index.html` is the last build-573 tree** (re-verified 8 Aug: 104 inline scripts, 114 style blocks, 87 `window.Cardinal*`, 81% bare `var()` — it is 573, not 594, and this file has cited it correctly throughout). A summary of 428–451 is in the section below.

**For session state — open items, settled decisions, handoffs — the `docs/` folder is authoritative over the skill's `references/` folder.** **And for *what shipped* since 574, the `CHANGELOG` in `index.html` outranks both** — it is the only record that survives work done outside `.claude/`, because it lives inside the file every tool has to edit. When a doc and the `CHANGELOG` disagree about whether something exists, the `CHANGELOG` wins for its span; for anything older, git history holds the retired array. `references/app_map.md` remains a 388-era terrain map that itself defers to `FEATURES.md`. Do not proceed from memory — build numbers, open items and settled decisions change every session. **Check their dates against the current build before trusting them**; docs written a session ago describe a different app.

---

## The prime doctrine

**Things that look missing are usually buried.** Six "missing features" on this project were fully built and merely unreachable or plain-looking — a dead handler stub, an Attach bar under the bottom nav's z-index, a punch module mounting to hidden anchors, an entire Team page in the burger menu, a `styleMounts()` inline style beating every CSS rule, and two separate Estimates screens.

Before building: grep `FEATURES.md`, then grep the in-app `CHANGELOG` (it covers what `FEATURES.md` doesn't), then grep `index.html` for the feature name **and its mount anchor**. Ask "does this *element* still exist?" — not "does this code exist?" Extend, don't add. One pipeline per concept.

**Corollary: grep for the convention before inventing a mechanism.** The app already had `IC_SKIP` (per-CRM stage hiding) and `LEGACY_STAGE` (stage aliases). `PIPE_SKIP` was added by copying `IC_SKIP`'s shape. A new mechanism beside an existing one is a bug with a delay on it.

**Corollary: a name is not a contract.** `renderTeamPage()` lives in the **Resource Library** module (`cr-lib-script`) and renders the filed-material page. All 7 occurrences in the file are the Library's; the Team Directory does not use that name. Grep the block, not the identifier.

---

## What happened in 428–451 — the undocumented span

Reconstructed from the in-app `CHANGELOG` as it stood then (147 entries, builds 166–451 — an array retired at 574; see above) and verified against the file. Build **450 is a gap**; gaps are normal here.

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
- **`</body>` now appears 11 times**, not 10 — contract templates and generated print/share documents carry their own, and **three of the eleven are prose inside install-instruction comments**, not markup at all. **Anchor with `rfind()`**, which still lands on the real document close.
- New `window.Cardinal*` export → `Object.assign(window.X || {}, {...})`, never plain assignment. There are **88** distinct `window.Cardinal*` names (the 88th is `CardinalShowcase`, 574).
- **`function money(` is defined ELEVEN times** — one per module, with three different signatures. A file-wide `count == 1` assertion on it is meaningless. Build 556 changed only the `cr-crew-script` one (to `money(n, cents)`) by slicing the block first and asserting the other ten survived. Same class as the `.single()` and `LABEL` traps below.
- **Grep the whole file for every occurrence of a selector before patching it.** `.acthead` had three definitions; the winner was ~39,000 lines after the two found first.

Helpers: `.claude/skills/cardinal-build/scripts/patch_lib.py` (atomic temp-then-rename writes) and `check_build.py` (the mechanical gate ladder). Also `jslex_count.py` (the lexer — see below), `next_build.py` (**asks the remote which build number is safe** — run it before the first patch and again before opening a PR; see the build-label section), `contrast.py`, `selector_audit.py`, `token_pairs.py`, and the Vision-era harnesses (`harness_showcase.js`, `harness_walk.js`, `harness_detect.js`, `render_showcase.js`, `audit_viewports.js`, and `harness_colors.js` for OC Colors — 93 assertions, takes an optional path argument so it can be pointed at an older tree).

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

### Current measurements — the **@627** column is 8 Aug 2026

**Declaration counts are SITES, not distinct names, and the two differ by ~2× because every token is declared once per theme.** An earlier revision of this file quoted 64 `--ccm-*` and 154 `--rbe-*` — those were sites. Count distinct names and you get 32 and 77, which looks like tokens were deleted. Nothing was deleted. Both are given below so nobody "corrects" the right number.

**Re-measured by `scripts/measure_counts.py`, which was validated before it was trusted:** run against the build-573 tree (`git show aeac5e5:index.html`) it reproduces this document's recorded 573 column exactly — 104 / 114 / 87 / 641 `--rbe-*` refs / 81% bare. So where a number below differs from the retired @594 column, the app moved; the pattern did not. **Re-run it rather than re-deriving these by hand** — it prints every row below, splits SITES from DISTINCT, routes the scroll lock through the lexer, and shows what a naive count would have said.

| Thing | Value | Measured | How it was measured |
|---|---:|---|---|
| Inline `<script>` blocks | **106** | **@627** | `<script>` tags without `src=` — was 105 @594; 615 added `cr-occ-script` |
| `<script>` tags total / external CDN | **109** / 3 | **@627** | supabase-js@2, chart.js@4.4.3, papaparse@5.4.1 — unchanged since 482 |
| `<style>` blocks | **118** | **@627** | was 115 @594 — `cr-occ-styles` (615), `cr-pm-scroll` (595) and one more from the 595–614 span |
| `<style>` blocks with an `id` | **111** | **@627** | was 108 @594 |
| `window.Cardinal*` exports | **90** | **@627** | distinct names — was 88 @594; the newest is `CardinalColors` (615) |
| **`.observe(document.body …)`** | **50** | **@627** | **A counting trap, and it has not moved since 594.** All 50 are real code. Stripping `/* */` first says **40** — naive comment-stripping eats ten real calls sitting after a `/*` inside a string. A guaranteed mutation each frame wakes **all 50, every frame**; see the re-render section |
| Modules writing the global scroll lock | **13** | **@627** | lexer, CODE hits only — **34 CODE sites, 0 in strings, 0 in comments** (a bare regex says 35). Unchanged since 594: the Showcase, OC Colors *and* the tray each added zero. **The no-14th-writer rule has now held across 33 builds** |
| `normStage()` copies | 6 | **@627** | 1 whitelist + 5 delegates — unchanged, and the whitelist is still the nine stages quoted in the invariants section |
| `.single()` / `.maybeSingle()` | **45 / 6** | **@627** | was 44 / 6 @594. The one new site is the `punch_items` comment update, and **it guards** (`if(r.error)`) — checked individually, not inferred. `.throwOnError(` is still **0**, which is why `.single()` never throws here. **All guard — there is no migration backlog**, see the invariants section |
| `--ccm-*` decl sites / distinct / refs | 64 / 32 / 137 | **@627** | unchanged since 557 |
| `--rbe-*` decl sites / distinct / refs | 169 / 77 / **694** | **@627** | **Sites and distinct names unchanged; refs 641 → 694.** 595–627 added no new retail tokens and wired 53 more references to the existing ones — which is the healthy direction |
| `--lb-*` decl sites / distinct / refs | 22 / 11 / **87** | **@627** | Resource Library, 77 of 87 refs carry a literal — unchanged since 451 |
| `--crw-*` decl sites / refs | **0 / 95** | **@627** | Crews (547+). **Declared nowhere; all 95 refs are `var(--crw-x,#literal)`.** The fallbacks *are* the palette. Deliberate, and immune to the 448–449 class by construction |
| **`--sh-*` decl sites / refs / with fallback** | **1 / 180 / 180** | **@627** | the Showcase (574+). **All 180 references carry a literal fallback**, re-verified. ⚠️ A broad `var\(\s*--sh-` says **182** — the two extra are the module's own banner prose describing the pattern as `var(--sh-*,#literal)`. The comment-pollution trap, in the one direction that flatters you |
| **`--occ-*` sites / distinct / refs / with fallback** | **12 / 12 / 138 / 138** | **@627** | **NEW ROW — OC Colors (615–623).** Twelve names, each declared **once** — single-theme by design, Blackout like the Showcase, not a light/dark pair someone forgot to finish. **All 138 references carry a literal fallback, 0 bare** — measured, joining Crews, the Library and the Showcase. Do not wire it to `rb-light` |
| `--cr-*` decl sites / distinct / refs | **176 / 20 / 577** | **@627** | **Five modules share one identical palette** — coach, pricing, claims, adjusters (all themed at 573) and **`cr-bpa-script`, which is not**. See the theming section |
| `var()` refs total / with a fallback | **3,750 / 998** | **@627** | **73% are bare** (888 of the 998 fallbacks are a hex). **Improving steadily: 77% @594, 81% @573, 88% @482** — the Showcase, Crews, Library and now OC Colors each pin their own. See 448–449 |
| Surviving legacy gold hexes | **33** | **@627** | `#c9a227` ×22 + `#b8860b` ×11 — was 30 @594. Still the **retail CRM badge** and the gradient-clip fallback; the three dead values (`#d4a017`, `#f5d061`, `#8a5a00`) are still at **0**, asserted |
| `#c8202e` (cardinal red) | **341** | **@627** | was 327 @594, 270 @573 |
| `</body>` | **11** | **@627** | **not 10.** Three of the eleven are prose inside install-instruction comments, not real markup. `rfind()` still lands on the real document close |
| `api/*.js` serverless functions | **26** | **@627** | unchanged since 594 — the whole 595–627 span added none. **OC Colors and the tray are pure Supabase + RLS, no new endpoint** |
| `*.sql` at the repo root | **32** | **@627** | all applied by hand; `.vercelignore` blanket-excludes them so none is ever served |

**The `--lb-*` row is a correction to a correction, and it is instructive.** The previous revision said *"the 22 recorded at 451 does not reproduce — `--lb-[a-z-]+\s*:` finds 14."* **22 reproduces exactly.** That regex has no `0-9` in its class, so it silently dropped `--lb-ink2`, `--lb-line2`, `--lb-surface2` and `--lb-surface3`. The file's own rule — *when a count contradicts you, suspect the regex* — caught a wrong "correction" that had been sitting here as fact.

**The `--sh-*` row is the same lesson from the other side.** The narrow pattern `var\(\s*--sh-[\w-]+` finds 180; the broad `var\(\s*--sh-` finds 182. The two extra are the module banner's own prose — `every colour is var(--sh-*,#literal)` — and `*` is not a word character, so the narrow pattern skipped them by luck rather than by design. **Both counts are defensible and one is right.** Print what you captured.

---

## Gates — run every build, in order

```bash
python3 .claude/skills/cardinal-build/scripts/check_build.py index.html \
    --prev <previous> --marker '<the string your fix added>'
```

Covers per-block `node --check` on all inline scripts, tag balance, CSS brace balance, duplicate `<style id=>` detection, the dupe-API check, build-label bump, marker present in the artifact you wrote, and the **negative control**.

**It is green on build 627 right now** (exit 0, re-run 8 Aug 2026), reporting: 106 inline scripts parse · 109/109 script tags · **118/118** style tags · CSS braces balanced · no duplicate style ids · no double-assigned `window.Cardinal*` · app stamp `v2026-08-08 build 627` · 24 version strings, 8 distinct builds. Start from green; if your first run is red, you broke it.

⚠️ **`check_build.py` does not see `studio.html` or `popup.html`.** It takes one artifact and the app is the one it is pointed at. When you touch Studio, parse its inline scripts separately (`node --check` on each block) — 627 did, and that is now the convention, not a courtesy.

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

**A CSS rule can parse, balance, and never apply — and only a real engine sees it.** Build 481
added `.lb-ccfile button.ghost` unprefixed into a stylesheet where every neighbour is scoped to
`#rlLibPanel`. `#rlLibPanel .lb-ccfile button` out-specifies it, so the ghost lost and the button
rendered as a second solid red one. Brace balance, duplicate-id, `node --check`, marker and negative
control were **all green**. `getComputedStyle` in Chromium said `rgb(196,24,15)`. **Read the
neighbours' selectors before adding a rule, and prove an override won in a real browser**
(`scripts/`-adjacent `css482_harness.js` in the session scratchpad is the pattern). It proves which
rule won, not that the colour is right.

**Contrast is arithmetic, not judgment — compute it** (`scripts/contrast.py`). Stage and CRM colours are chosen for a dark ground and collapse as text on a light one: the stage set reads 1.96–4.37:1 on white and the spine neons 1.17–2.36:1, against a 4.5:1 floor for body text. Two shipped builds carried unreadable chips before anyone noticed. When a surface goes light, compute the ratio for **every colour that carries text** and use the `STAGE_INK` / `colorLight` twins. Bars, spines and dots keep the bright originals — a glowing 3px rule is not text.

**Test against production data shapes, not convenient fixtures.** A photo-signing change was verified against `{path, url}` fixtures and shipped completely inert, because **zero** photo objects in the real database have `path` or `storage_path`. The code was correct and did nothing. Query the real shape first — the Supabase connector answers this directly.

**When a gate goes red, first ask whether the test or the app is wrong.** Roughly half of all reds on this project were the test's fault. Fix the test when the test is wrong; never bend the artifact to satisfy a bad assertion — the label gate compared dates, so two builds in one day read as un-bumped, and the first response was to change the date rather than the gate.

---

## Repaint loops and navigation — the 565–573 span, and the two classes it cost

### A guard can exist, look right, and never once succeed

Builds **567** and **569** each fixed a function that repainted **on every animation frame, forever,
on every screen**. Both had a guard. Neither guard could ever be satisfied:

- **`paintChip()`** compared an HTML **source string** against `chip.innerHTML`, which is the
  browser's **serialization** of it. `meta.icon` is inline SVG, and a self-closing `<path .../>`
  round-trips as `<path ...></path>`. Confirmed in Chromium: **5 of 5 guarded passes wrote.**
- **`wxPaint()`** wrote `el.innerHTML` unconditionally — and the weather icon is an **emoji**, so
  `metallicize` legitimately re-wraps it. Comparing against live content could never settle either.

**The landing `paint()` had no guard at all**, which is its own trap: **assigning `textContent`
emits a childList mutation record even when the string is identical** — the old text node is removed
and a new one added regardless. 10 identical writes → 10 records; 10 guarded writes → 0.

**Cost: 388 DOM writes/sec, waking all 50 `document.body` observers every frame.** After: 3.3/sec
(the three clocks, correctly).

**The right guard depends on the neighbours, and the two builds chose opposite shapes on purpose:**

| | compare against | why |
|---|---|---|
| `paintChip()` (567) | the **live element**, normalised through a detached node | so it can still repair a chip another module stomped |
| `wxPaint()` (569) | a **stored signature** of the reading | because `metallicize` rewrites that element by design, and a live compare would fight it forever |

Copying either one blindly into the other's place reintroduces the bug.

### Full-screen views must be registered in `hideAllViews()` — and the lever must match

`hideAllViews()` is what every navigation calls. A `position:fixed; inset:0` view that is not
registered there **swaps the page underneath itself and traps the user**. This was missed for six
screens at once (570–572).

**Critically, the close lever must match how the screen is shown:**

| shown by | screens | close with |
|---|---|---|
| **`display`** (in the markup, or `MOUNT.style.display`) | `crewsView`, the three `MOUNT_IDS`, `cr-coach-mount`, `cr-adjusters-mount` | `el.style.display='none'` |
| **a CLASS** (`.open`, created at runtime) | `cr-sf`, `cr-pb`, `cr-est-view` | the module's `close()`, then **confirm** |

Writing `display:none` onto a class-shown element is **permanent damage** — its own open path never
clears the inline style, so the screen is dead on the second visit.

**And a module's `close()` can no-op without throwing.** It removes the class through the module's
own `view` reference, which is `null` until `ensureView()` has run — so it clears the scroll lock,
returns cleanly, and leaves the screen open. A `catch` cannot see that. **Confirm the result:**

```js
try{ window.CardinalEstimates.close(); }catch(_){}
if(_ev.classList.contains('open')) _ev.classList.remove('open');
```

**The other half of the same convention is `navRestore()`** — a view registered in `hideAllViews()`
but not in the history switch is one the **back button walks straight past**. 571 wired five.
`wrapNav(globalName, viewName)` handles globals; methods need the `__crNav` IIFE pattern (copy the
`CardinalCommunityHub` block).

⚠️ **`openEditor` is defined FIVE times** (19397, 29216, 31477, 37979, 39392 @627 — line numbers
drift every build, and these five moved ~130–230 lines between 594 and 627; grep, don't trust them).
The one `CardinalEstimates` exports is the **last**, and it takes `(project, existing)`. A name is
not a contract.

**Both newer full-screen views are registered — do not re-flag either as a nav trap.** Re-verified
@627 by brace-matching `hideAllViews()` (7,145 chars) rather than reading the first screenful:
`cr-show` (574), **`cr-occ` (615)**, `crewsView`, `cr-est-view`, `cr-sf`, `cr-pb` and the
`CardinalEstimates` close are all in it. ⚠️ A 4,000-character window over that function finds only
three of them and reads like four missing registrations — **brace-match it, or you will file four
false bugs.**

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

**Palette tokens need literal fallbacks** when referenced from outside the stylesheet that declares them: `var(--ccm-card,#161918)`, never bare. **Builds 448–449 are the proof this is not theoretical** — a background token really was being stripped by another module within a second of load, and eight screens rendered see-through with the retail page ghosting behind them. **73% of the 3,750 `var()` references in this file are still bare** (998 carry a literal — improving from 77% at 594, 81% at 573 and 88% at 482, because the Crews, Library, Showcase and now OC Colors modules each pin their own). When you touch a surface, add the literal.

**Adding `await` to a synchronous function is never a local change.** It opens a window in which the user can leave. List every side effect after the `await` and revalidate the precondition — a signed-URL round-trip inserted before a scroll lock froze the page with no overlay to dismiss.

**One global scroll lock, 13 modules, no reconciler.** `document.body.style.overflow` is written by 13 independent modules (15 locks, 18 bare releases, 1 conditional restore — all individually balanced; **13 modules / 34 CODE sites re-verified with the lexer @627**, 0 in strings, 0 in comments; a bare regex says 35). It leaks on any early return or throw between lock and release. This class has recurred three times. Do not add a 14th writer without checking `BUG_CLASSES.md` — **the no-14th-writer rule has now held across 33 builds**: the 108 KB Showcase (574), OC Colors (615) and the tray (627) each added **zero**. Block 1 carries a deliberate self-heal (`if(... === 'hidden') ... = ''`) — that comparison is the one non-assignment hit in the count, and it is not a bug.

---

## The build label — there are 22 of them, and only one is the app version

**Two separators, and a regex that assumes one will miss the other.** Module banner comments use a middot (`v2026-07-22 · build 148`); footers and the app stamp use a space (`v2026-08-08 build 627`). Counting only the space form misses every middot banner.

`re.finditer(r"v(2026-\d\d-\d\d)\s*(?:·|)\s*build\s+(\d+)")` is the honest count:
**24 strings · 8 distinct builds (95, 146, 148, 404, 574, 620, 623, 627).** Re-measured at **627**: OC Colors added two more banner stamps (620, 623) that will now sit frozen like every other module banner. Only the app stamp moves.

| Label | Count | Where | Meaning |
|---|---:|---|---|
| `v2026-08-08 build 627` | 1 | nav menu `<div data-cr-footer>` | **the app version — the only one in rendered markup, and the only one to bump** |
| `v2026-08-08 build 623` | 1 | `cr-occ-styles` banner | OC Colors' stylesheet, frozen at its last restyle |
| `v2026-08-07 build 620` | 1 | `cr-occ-script` banner | OC Colors' script, frozen at the SureNail strip |
| `v2026-08-02 · build 574` | 2 | `cr-show-styles` + `cr-show-script` banners | the Showcase module |
| `v2026-07-28 build 404` | 1 | `.cr-c-footer` | claims pane |
| `v2026-08-04 build 95` | 2 | `.cr-c-footer` + banner | Claims module (written as a future date; the date has since arrived — still do not "fix" it without asking) |
| `v2026-07-22 build 146` | 12 | `.cr-a-footer` / `.cr-k-footer` + banners | analytics / Keeper / portals / adjuster / coach |
| `v2026-07-22 build 148` | 4 | banner comments | estimates + pricing modules |

**The app stamp is the only version string in rendered markup**, and it is the only one followed by `&#8212;` plus a plain-English summary of the build. Everything else lives in a footer template or a `/* ... */` banner comment. A gate that compares the *set* of all labels can be fooled — bumping any plugin footer passes while the app stamp stays stale. **`check_build.py` now anchors on the app stamp** (`app_stamp()` prefers the `data-cr-footer` anchor, falls back to the em-dash form) and requires the build number to *strictly increase*. Negative-controlled across 7 scenarios.

**Bump the app label every build**, and add a `CHANGELOG` entry in `<script id="cr-cl-script">` — since 574 the entry shape is `{ b, d, t, s }` (build, date, short title, long user-facing summary). Build numbers are **ordering, not inventory** — 234, 241 and 299 are each reused for unrelated work, there are gaps (450, 581–583), and the reuse got materially worse in the 574 span: **two parallel branches both shipped builds numbered in 574–584** (the AI Field Manual on one, the Vision suite on the other — when a doc cites a build in that range, check which lineage it means). **That is what `scripts/next_build.py` now exists to prevent: it asks the REMOTE (`main` plus pushed branches) which number is safe. Run it before the first patch of a session and again before opening a PR.** Never renumber history; source comments cite build numbers.

### ✅ All three build-machinery defects are fixed — do not re-report them

`cardinal_build_log.md` §2 documents three live defects. **All three were resolved at build 428 and are verified fixed on `d62244c`.** The doc has not been updated to say so; this section is the correction.

- `data-cr-footer` **now exists in the markup**, exactly once, on the app-stamp `<div>`. `.menu-footer` still appears zero times — the selector lists in both consumers are `'[data-cr-footer], .menu-footer'` and `'.menu-footer, [data-cr-footer]'`, and because `querySelector` resolves in *document order* rather than selector order, both land on the stamp regardless.
- **`currentBuild()` returns the live build (594 as of this writing)**, not 406. It no longer falls through to scanning `body.textContent` and matching a `(build 406)` string inside CSS source. What's New works again.
- **`buildTag()` returns the live `build NNN`**, so error reports carry a build number.
- **`CHANGELOG` is current** (entries through 594 as of this writing) — but note the array was rebuilt at 574 and now covers 574+ only; older entries live in git history. Its gaps (581–583) are normal, not defects.

One attribute, three silent failures, all closed. If you find yourself about to "fix" any of these, re-measure first.

---

## The Resource Library (builds 442–447, 451) — now documented in `FEATURES.md` too

A reference-material library with an AI assistant. Nothing in the doc set mentions it.

- **Front end:** `<style id="cr-lib-styles">` + `<script id="cr-lib-script">` (~28 KB), the last block in the file. Mounts into **`#resourceLibraryView` only**, as a fixed overlay. Exports `window.CardinalLibrary` via `Object.assign` (`open`, `reload`).
- **Back end:** `api/librarian.js`. Gemini-backed, same `GEMINI_API_KEY` and the same signed-in-session gate as `organize.js` / `caption.js` / `analyze.js`. Retry ladder is flash → 1.2s pause → flash, because the free tier 503s under load.
- **Scope is fenced, in both the module banner and the API header** — but the fence MOVED at build 471 and the old wording is no longer true. The Library files *reference* material: building code, roofing, siding, windows, gutters, manufacturer specs. It still has **no knowledge of clients, inspections, job paperwork or Company Documents, and must not be pointed at them.** That part is a stated design constraint, not an oversight.
- **The one exception, added 471 on Theo's explicit instruction after the constraint was put in front of him:** the librarian may ask for **photographs** from Cardinal's own CompanyCam account by emitting a `~~photos` block. **The model never receives photo data** — not the image, not the caption, not the project. It writes a search; `index.html` runs it through `api/companycam.js`, which is admin-only and refuses anything flagged `internal`. Do not widen this to client records on your own initiative; do not narrow it back either.
- **Its own token namespace, `--lb-*`** — 22 declaration sites (11 distinct names), 87 references, **77 of them with literal fallbacks**. Still the best-behaved palette in the app; copy its habit, not the other 82%. The Crews module (547+) goes further and declares no tokens at all — every `--crw-*` reference is `var(--crw-x,#literal)`, so the fallbacks *are* the palette.
- **`lbRich()` is the renderer, and its ordering is load-bearing.** It **escapes first, then promotes** a small marker set on the already-escaped string — tables, headings, bullets, numbered lists, bold. By the time any promotion rule runs, every `<` is already `&lt;`, so nothing the API returns can open a tag. It deliberately supports **no links, no images, no raw HTML**. If you extend it, keep escape-then-promote in that order and keep the set small.
- **The CompanyCam picker (468–482) lives in this module** and is admin-only. Its photographs can be expanded (480), saved to the device (481) and **drawn on** (482) — the pencil opens `cr-ped-script`, the photo editor that already existed for job photos, via `open(p, opts)`. **The bytes always come through `api/companycam.js`, never the CDN**: a cross-origin image taints the canvas and `toBlob()` then throws. The CompanyCam original is never written to.
- ⚠️ **`cc-` is two namespaces.** Inside `cr-lib-script` it means CompanyCam; elsewhere in this file it means Community (`data-cc-editbid`). Grep the block, not the prefix.
- Related but separate: **Manage NACHI** (`cr-nachi-*` blocks). Build 451 fixed the two landing on top of each other in the installed app.

---

## The Crews section (builds 547–557) — backfilled into `FEATURES.md` on 2 Aug 2026

Cardinal's subcontractor crews, and the money that flows to them. Four stages, all shipped, all
in `<style id="cr-crew-styles">` + `<script id="cr-crew-script">` plus a work-order generator and
a commissions tab on the client profile.

- **547 — the directory.** Crews by trade with a left nav, Profile, a Compliance vault (COI, W-9,
  licences, with expiry) and Notes. Tables: `crews`, `crew_docs`, `crew_notes`.
- **548–554 — Labor Rates**, plus the light-mode passes. Catalog items from `pricing_items` joined
  with per-crew overrides in `crew_rates`; `pricing_item_id IS NULL` means a custom row. 554 made a
  **Roofr** upload fill `checklist.meas` and the pitch.
- **555 — the crew Work Order.** Cardinal's OWN document, Production → crew, **one per trade**.
  Document type three beside `isEstimateTitle` / `isContractTitle`, stored in `inspection_reports`
  so it reuses the editor and the `@page Letter` print path. Filled from the roof inspection,
  `checklist.meas` and `crew_rates`.
- **556 — Payments and Commissions.** `crew_payments` (admin-only) and `commissions` (admins all,
  a rep reads their own).
- **557 —** the Activity Count light twin (unrelated to Crews; shipped the same session).

**The permission rule, settled by Theo and not to be re-litigated:** *"Crew rates is not needed by
productions, I write the checks."* `crew_rates` and `crew_payments` are both `is_cardinal_admin()`
in RLS. **A work order generated by Curtis or Scottie having no labor lines is CORRECT, not a
bug** — and it must not be worded as a failure. The three-way gate (tab strip filters, dispatch
falls back, renderer refuses on its own) exists so a correct refusal never renders as a broken
screen.

**⚠ "Work order" names THREE different documents on this project.** Grep the block, not the phrase.

| Which | Direction | Where | Rule |
|---|---|---|---|
| Partner / property-management → Cardinal | **inbound** | `cr-wo-script`, community-fenced | **Leave alone. Do not widen the fence.** |
| Production → crew | outbound | build 555 | the one described above |
| Sales/admin → Curtis, punch-outs | internal | `punch_items` + `cr-punch-*` blocks | **already built.** The gap is routing and notification, not software. Do not rebuild it |

**`commissions.rep_email` is matched by RLS against `auth.email()`.** A typo silently orphans the
row against nobody, so the address is format-validated and lower-cased before insert. As with
`community_partners`: **never write an unverified email address.** No crew email addresses exist
yet and nothing in the app invents one.

`WO_TRADES`, `TRADES` and `MONEY_TABS` all mirror DB constraints (`crews_trade_ck`, the RLS
policies). **One grows, all grow** — same rule as `STAGES` / `IC_SKIP` / `PIPE_SKIP`.

`crews_schema.sql` is **already applied**. Do not re-run it.

---

## Builds 574–594 — the Vision suite, the manual, the Studio, the Spark and the book

Five distinct things shipped in this span, three of them **outside** `index.html`. `CONTRACTOR_VISION_SUITE.md` is the audit that preceded the suite — read it before touching any of this. It separates what already exists from what is **fenced by settled decisions**: the EXIF/GPS exclusion stays closed (coordinates deliberately never mirrored, at three written sites), customer photos never go to third-party AI without an explicit yes from Theo, AI-altered photographs of real roofs are an insurance **altered-evidence** problem, and the DGX Spark is never a live dependency of the app.

### The Showcase / Vision suite (574–593) — `cr-show-styles` + `cr-show-script`

One new module (~108 KB, `window.CardinalShowcase`, full-screen `#cr-show` view — registered in `hideAllViews()`, so don't re-flag it). Client-facing presentation surfaces for the kitchen table:

- **The Showcase (574)** — hand-picked before/after pairs (`showcase_pairs`), aligned split slider (578, 589). Curated by Theo; deliberately **not** the 60,485-photo CompanyCam index, which is an office search tool.
- **The Hall of Fame (576)** — a bad install beside ours (`workmanship_pairs`), because a homeowner cannot tell a good roof from a bad one from the driveway.
- **The Walk (579–580)** — AI circles damage, **a person confirms, then** the client sees it; that order is Theo's and is the whole design. `walks_schema.sql` + `api/detect.js`, which returns located findings (box, severity, label) for ONE photo. **The circles are an overlay, never burned into the image** — the altered-evidence rule holding in code.
- **584–588, all in Blackout**: Spotlight (present mode), Chalk (draw live marks), The Lens (pinch into full resolution), The Release (share cards), Curtain Call (the tablet sells by itself).
- **Showroom mode (590)** — a read-only door you can hand across the table; 592 pushed every control to ≥44px.
- **The Vision hub (593)** — a dedicated front door in the SAME `index.html`: a hostname starting with `showroom.` (or `?vision=1` for testing) swaps the landing for a focused launcher — Presentations, plus Studio for admins, none of the ordinary ten-destination menu. Same sign-in underneath.

Palette is `--sh-*` — **all 180 references carry literal fallbacks** (the Crews pattern). SQL: `showcase_pairs.sql`, `walks_schema.sql`, `workmanship_pairs.sql` — **all applied** (the build log records walks "applied and verified before the HTML change"); idempotent; do not treat as pending.

### The AI Field Manual — `ai-field-manual.html` (562–563, and the manual-numbered 574–584)

A 17-part plain-language manual on working with AI, **iframed by the Resource Library since 562** and therefore **deliberately public** (noindex; `.vercelignore` documents the decision and exactly what a stranger with the URL learns). Its reference twin `AI_CHEATSHEET.md` at the repo root **does not ship** — it carries vendor pricing and internal notes. Mind the build-number collision with the Vision suite (see the build-label section).

### Cardinal Studio — `studio.html`, standalone

A backend photo-curation browser: search and browse the tagged archive when stocking a Showcase pair or a Walk. **Deliberately separate from the CRM** — Theo, verbatim: "if it was back to the beginning this would have been a completely separate app." It shares only the Supabase project. Admin-only twice over: `is_cardinal_admin()` RLS on the table, and the `photos/studio/*` storage prefix carved out of the bucket's general authenticated-read policy (`studio_photos.sql` + `studio_objects_rls.sql`, **both applied 3 Aug 2026**). It carries its own sign-in screen because it lives on its own subdomain — different origin, different localStorage, so the app session never carries over.

**✅ CORRECTION — Studio DOES write, at three sites. Do not restore the old sentence.** Every revision of this file until 8 Aug said it "reads `studio_photos` only; **never writes** (retagging happens on the Spark)." The *retagging* half is still true — tags are authored on the Spark and pushed by `push_studio_tags.py`, and nothing in the browser edits a tag. But the browser has always written, and now writes more:

| Site | What | Since |
|---|---|---|
| `studio.html` → `.update({ archived_at })` | the Bin — archive or restore a whole site | **614** |
| `studio.html` → `studio_tray` `.upsert()` / `.delete()` | the tick boxes — pick photos for the Showcase, and since **628** for the Hall of Fame too (the `bucket` column) | **627** |

All three are `is_cardinal_admin()` at the RLS layer, so the fence held even while the sentence was wrong. **`studio_tray` is the one seam between Studio and the client-facing Showcase**, and it is the reason the GPS rule below is stated at the schema, at both ends of the code, and in `harness_tray.js`.

### The DGX Spark — `spark/`, Theo's own hardware, excluded from deploy

Offline tooling, never fetched by the app: `fetch_companycam.py` (**archive the actual photo bytes** — the Supabase mirror is metadata only; stop paying CompanyCam and every CDN link in it dies), `hail_review.py`, `strip_exif.py`, and `push_studio_tags.py` (joins the Spark-side tagger's `studio_tags.jsonl` against the manifest and upserts `studio_photos`). `STUDIO_TAGGING.md` is written to be handed to the Spark-side agent as-is. The standing rule from `DGX_SPARK_ILLUSTRATIONS.md`: **generate on the Spark, review by eye, upload through paths that already exist — no new endpoint, no live dependency.**

### The Pop-Up Roof — `popup.html` (594 put its link on the landing screen)

A sixteen-spread interactive pop-up book of how a roof gets built, client-facing, served at **presentation.cardinalroster.com** and **presentation.cardinalrenovations.com** (`vercel.json` host rewrites → `/popup.html`). The preserve-3d pop is proven on Theo's real iPad. Settled decisions, recorded in `HANDOFF.md` and not to be re-litigated: **it is an install book, not an insurance book** (storm damage, the adjuster and the tailgate Number were deleted on Theo's verbatim instruction); the house is THE T; Onyx is the OLD roof and Duration BROWNWOOD goes on; "tarps, not tractor"; the bird ends every spread at `translateX(0)`. Source material is the three `ROOF_JOURNEY_*.md` docs. The ambient sound bed was redesigned 4 Aug and is **unverified by ear** — Theo's ears are that gate.

---

## Builds 595–630 — the span this file had no narrative for

*Written 8 Aug 2026. `cardinal_build_log.md` has an entry for every build here; this is the orientation map, not the record. Nothing below is new work — it is 33 builds that shipped while this document said 594.*

| Builds | What arrived | Where |
|---|---|---|
| **595–598** | Add project scrolls to its Save button again (`cr-pm-scroll`); the **exterior vocabulary** for inspections — siding, soffit, fascia, gutters, not just the roof; the Showcase job picker stops being a dead end (Escape works, the upload is findable) | main block, `cr-show-script` |
| **601–602** | Photo Activity initials name the right person; the **defect taxonomy narrowed 33 → 31** — soffit and fascia are one finding again, `paint_deterioration` deleted. 596's vocabulary is load-bearing for this | inspections |
| **603** | The **Production board is a job dossier** — documented in `FEATURES.md` | production |
| **604–610** | **Punch Outs, repaired end to end**: back on the client profile, add works on any job, readable list, + Add opens on the first tap, moved into the job menu, each item has a discussion, tapping one opens it | `cr-punch-*` |
| **608, 611–612** | **Push notifications actually arrive**, and the app **says so when one did not** — no more silent failure. VAPID keys are gated by CI; see `check.yml` | `sw.js`, `api/notify.js` |
| **613** | The **password reset link works** — it had been landing signed-out | landing |
| **614 / 614b** | Studio's **Sites lens and a Bin you can undo** (`archived_at` — the first write Studio ever made), plus the false `aerial` tag and orientation | `studio.html` |
| **615–623** | **OC Colors** — see below | `cr-occ-*` |
| **624** | The Showcase asks for the **display rendition** (`srcD()`), not the full one: 8,346 kB → 1,455 kB to paint a card that caps at 612 CSS px. `openLens()` deliberately still uses `src()`, because pinch reads `data-path` | `cr-show-script` |
| **625** | The **vision host gate** — on `showroom.*` (or `?vision=1`) the CRM chrome does not render at all. `isVisionHost()` hangs off `window.CardinalLanding`. **Option 1 of three**, Theo's pick; Option 3 (a real separate `showroom.html`) is recorded in `OPEN_ITEMS.md` with its triggers | landing / `showMain()` |
| **626** | The shingle name fits: `word-break:keep-all` + `clamp(19px,2.1vw,26px)`. **The bug was width-only, never iOS-only** — three renders said "fine" because all three were at 1194px | `cr-occ-styles` |
| **627** | **The Studio tray** — see below | `studio.html` + `cr-show-script` |

### OC Colors (615–623) — `cr-occ-styles` + `cr-occ-script`, `window.CardinalColors`

The Owens Corning shingle-line hub on the Vision hub: lines first, then colours, with OC-sourced specs, three presentation styles for the iPad, and the conditional 130/160 MPH wind warranty. Palette `--occ-*` — **12 names, each declared once, single-theme Blackout**; do not wire it to `rb-light`.

**Read `OC_BRAND_RULES.md` before putting any OC or Pink Panther mark on a screen.** Two things this file itself got wrong and had to correct: **the Pink Panther IS available to contractors** (615–623 shipped a claim to the contrary), and **"reverse out the logo" is explicitly incorrect use**. Cardinal is an OC **Preferred** contractor — that is the status the page may state.

Settled by Theo, not to be re-litigated: **"Yes they can see colors"** — all signed-in staff, not admin-only · discontinued colours **keep a badged spot** (`status` never removes one; only `hidden` does, and only Shasta White is hidden) · **"Please don't list Lowe's, they mix batches"** — never cite a big-box listing as sourcing · **"doesn't need to be here, that's a whole separate thing"** — no competitor named on a client-facing screen · the colour sheet, deferred, must have **no money fields at all**: *"No pricing on sheets it's not a quote."*

**Nine** `oc_*.sql` migrations, all applied. `harness_colors.js` is 110 assertions; `harness_occhead.js` is 42 across 5 widths × 3 styles.

### The Studio tray (627) — `studio_tray`, the one seam to a client-facing screen

Tick boxes on every archive photo in Studio collect into `studio_tray`; the Showcase's **existing** pair-builder reads the tray as a pseudo-project (`TRAY_ID = '__studio_tray__'`) alongside real jobs. **The prime doctrine earned its keep**: the checkbox-and-assign-roles UI Theo asked for already existed — `chosen{}` and `roles{}` in `cr-show-script` — and had simply never been pointed at the archive. Two seams, no second picker. `promoteToPair`, `drawJobPicker` and `takeJobPhotos` are each still defined exactly once, asserted.

⚠️ **The GPS fence runs straight through this feature.** `studio_photos` carries `lat`/`lon` (all 60,503 rows NULL today, so the `CONTRACTOR_VISION_SUITE.md` exclusion is holding *in practice*), and the tray is the first path from the archive toward a screen a customer sees. **`studio_tray` has no coordinate columns, and `toggleTray()` names its six fields explicitly rather than spreading the row.** Asserted at the schema, at both ends of the code, and by `harness_tray.js` (23 assertions). **Do not "complete" the row.**

**629 made it three bins and added a trade.** Colours joined showcase and
workmanship as a **bucket**; `trade` is a separate nullable column because it is a
**facet** — a before/after can be a siding job, and as a fourth bucket it would have
forced that photo to choose. The 628 cycling chip was replaced by an **armed** bin
(a row above the grid; tap = in/out), because a cycle costs one tap per bin to undo.
`tapResult()` is the single place a tap's meaning lives. ⚠️ **The colours bin has no
consumer yet — that is 630**, and it must COPY into `oc-colors/<slug>/` rather than
reference `photos/studio/*`, which is admin-only while Colors is all-staff.

Why a table and not a Set: Theo ticks on the iPad and may build the pair on the desktop. `storage_path` is the primary key, so a double tick upserts. `studio_tray.sql` is **applied**.

### 628 — the tray splits in two, and the Hall of Fame gets a picker

Theo: *"Is there a bin for keep for before and after, a bin for damage vs how we do it, and a bin for junk?"* **The Bin is trashing** (per SITE, reversible). Junk and before/after already worked; **"theirs vs ours" did not** — `workmanship_pairs` has existed since 576 but `saveWork()` read its photographs from file inputs and `openWorkForm()` rendered no picker, so the Hall of Fame **could not see the tray at all**.

`studio_tray.bucket` (`studio_tray_bucket.sql`, **applied**) records which pile a photo is in — NOT NULL, default `'showcase'`, constrained to `('showcase','workmanship')`. One bucket per photo, because `storage_path` is still the primary key. The Studio tick **cycles**: off → Showcase (green rounded square) → Hall of Fame (amber circle) → off, Theo's pick from rendered options.

**The picker was reused again, not rebuilt.** `jobPick` was already slot-driven — `slots:['before','after']` is just an array every consumer walks — so the second shape is `['bad','good']` plus a completion guard that reads `jobPick.slots` instead of naming before/after. All nine of the pair-builder's functions are **still defined exactly once**, asserted.

⚠️ **`openWorkForm()` had no `pending = null`**, which was harmless only because `saveWork` ignored `pending`. Making it prefer carried files would have silently uploaded the *previous* pick's photographs — the exact failure the 591 comment on `openForm` describes. Both forms now clear unconditionally.

⚠️ **A Chromium render caught what 347 green assertions could not.** The amber state first drew a **bar** so shape would carry the state alongside colour — but a bar in a checkbox is the universal *indeterminate / excluded* mark, so green → amber read as **un-picking**. The tick now means PICKED in both and the chip *shape* carries the pile. Gates prove structure; pictures catch meaning.

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

**Retail light theme (`rb-light`)** is driven by `--rbe-*` tokens in `:root` and `:root[data-theme="rb-light"]`. **Tokens, never an override layer** — retail-B was torn out at 21 override rules. **Four sanctioned exceptions** (earlier versions of this file said two, then three), each because dark and light needed genuinely *different designs* rather than one design in two palettes: the **calendars** (387 — *dark half superseded at 535, see below*), the **brass Client Directory** (391), the **Production board** (393), and the **obsidian Activity Count tiles** (545 dark / **557 light**).

**The obsidian tiles are the cleanest example of the principle, so copy their shape.** 545 shipped `.actbox` black in *both* modes — Theo's pick, and it pinned both inks rather than tokenising them precisely *because* the tile was theme-independent. 557 added the light twin he later asked for, and the inks could not simply carry over: `#E8722A` is **3.06:1 on white and 2.71:1 on the app's cream — under the 3.0 large-text floor.** The twin uses `#C25A18` (4.40:1) and `#5f6670` (5.80:1) — *the same orange deepened*, not a swap to red, because a hue change would have made the two themes read as two different components. Mechanism differs too: dark is **highlight-led** (a white sheen inset over a black radial), light is **shadow-led** (the same radial inverted, a real drop shadow doing the lift), because an inset highlight is invisible on a white card. **Same geometry, same sheen origin, opposite mechanism, computed inks.** The dark rules are untouched byte-for-byte. In all three the dark original is untouched byte-for-byte and the light rules are scoped under `:root[data-theme="rb-light"]`.

**Community theming:** 64 `--ccm-*` token declarations (was 57), dark default at `:root` with a `[data-theme="rb-light"]` override. `body.cr-cc-open` is toggled in exactly one place (the client page's `takeOver()`), which makes it a safe community-only gate.

**The Showcase / Vision surfaces (574+) are Blackout by design** — a client-facing presentation surface deliberately outside both app themes (`#cr-show.showroom` grounds at `#050607`), every `--sh-*` reference pinned with a literal fallback. Do not wire it to `rb-light`.

**OC Colors (615+) is the same call, made again** — `--occ-*`, 12 names each declared **once**, no light twin. A single declaration site per token is the tell: this is a single-theme surface, not a light/dark pair someone forgot to finish. **Do not "complete" it by adding a `rb-light` block.** Its own inks are OC's brand palette — pink `#EC008C`, rich black `#231F20`, white — and `OC_BRAND_RULES.md` governs them, not this section.

### The `--cr-*` family — FIVE modules, one identical palette, four themed at 573

Five module stylesheets declare **the same 18–20 `--cr-*` tokens with the same values**, four copies
of one palette. All were hardcoded **light** with zero theme rules until build 573:

| Module | Root | Themed at 573? |
|---|---|---|
| `cr-coach-styles` | `#cr-coach-mount` | ✅ |
| `cr-pricing-styles` | `#cr-pricing-mount` | ✅ |
| `cr-claims-styles` | `#cr-claims-mount` | ✅ |
| `cr-adj-styles` | `#cr-adjusters-mount` | ✅ |
| **`cr-bpa-script`'s styles** | — | ❌ **left deliberately** |

`cr-estimates-styles` was converted earlier and is the shape to copy: **dark values in the base rule
(the app's default theme is dark), the original light values restored under
`:root[data-theme="rb-light"]`.** 573's patch asserts light is byte-identical to what shipped — if
light changed, the conversion was wrong.

**⚠ Tokens alone are not enough, and this is where 573 nearly shipped inert.** Two of these modules
paint an **inline** background in JS:

```js
M.style.background = '#fff';       // cr-coach-script
MOUNT.style.background = '#fff';   // cr-adj-script
```

Inline beats every stylesheet rule at any specificity. The tokens read `#141619` and the page still
painted white; **only a rendered preview caught it**, not the stylesheet gate. `styleMounts()`
already carries this exact fix with a comment saying so — those two modules were simply never
included. **`cr-bpa-script` still does it**, and is untouched on purpose: it has no dark palette to
fall back on, so stripping its inline white would leave it with no background at all.

**The residue split is the whole build.** Of 27 hardcoded light colours outside the token rules,
**17 are `color:white` on a coloured ground** (primary buttons, toasts, badges) — semantic, correct
in both themes, **leave them**. Only the **10 surface backgrounds** were tokenised. Tokenising the
inks would have turned every red button's white label into grey-on-red.

**"The gold palette was retired" is only three-quarters true — do not over-apply it.** PR #8 migrated **542** values (`#d4a017`→`#c8202e` cardinal red, `#f5d061`→`#e35c63`, `#8a5a00`→`#8f1620`, plus rgba twins) — all three source values are now at **zero** occurrences. It did **not** remove gold: **28 gold hex values remain and are correct where they are** — the **retail CRM badge** is `#c9a227` (17 occurrences), and `#b8860b` (11) is the fallback colour under the gradient-clipped text rules. Token *names* also survived their value change (`--ins-gold` is now `#c8202e`), so **grep the value, not the word "gold."** Before "finishing the migration", check whether the gold you found is the badge or a gradient fallback.

**Colour changes are rarely local.** Of 253 blue/cyan rules, only **4** carried a community selector — the rest are ungated, so a find-and-replace on a hex value is an app-wide restyle in disguise. Gate first, then restyle. **The surviving occurrences of an edited value are the proof the other CRMs were untouched — assert on them** (`scripts/selector_audit.py`).

**Semantic colours stay fixed in both themes** — milestone/pipeline circles, status spines, urgency red, CRM badge colours, the lavender PO, the lit favourite star, photo captions, the chrome blacks. Sales Floor is its own case: **red is the objection, navy is your answer** — colour carries meaning there, so don't spend either on decoration. The full list is in `FEATURES.md` and `OPEN_ITEMS.md` §6. **Do not "finish the job" by tokenizing these.** More than one build was spent re-learning it.

**Before "fixing" a light element on a dark ground, ask whether it is (a) hidden, (b) chrome with its own token system, or (c) deliberate contrast.** Only then is it a gap. Two standing false alarms — `.dashcard` (dead markup, hidden since 352) and `#cr-hd2-ribbon` (header chrome, own `--hbg`/`--hln`/`--hac`/`--tgrad` system) — are recorded in `HANDOFF.md`. **Do not re-flag them.**

**The calendars used to be the third, and are NOT any more.** Paper-on-iron was sanctioned for years and this file told you not to touch it. **Theo overrode that directly at build 535** — "it doesn't need the red on top… make the numbers white, white for month also" — so in **dark retail** both calendars now carry the navy-over-black treatment: navy card, sunk day squares, white dates and month, no red cap. Light mode and the other CRMs still get paper-on-iron and are untouched. If you find yourself about to restore the cream cells in dark on the strength of the old note, **don't** — this paragraph is the correction.

---

## Repo layout — and what is public

Everything in this repo is served publicly at `app.cardinalroster.com` **unless listed in `.vercelignore`**.

| Path | What |
|---|---|
| `index.html` | the app — and the host-gated Vision hub front door (`showroom.*`) |
| `popup.html` | The Pop-Up Roof — public by design; the two `presentation.*` domains rewrite to it |
| `studio.html` | Cardinal Studio — served publicly, gated by its own Supabase sign-in plus admin-only RLS and storage policies |
| `ai-field-manual.html` | **deliberately ships** — the Library iframes it (562); noindex; the decision and its audit are recorded in `.vercelignore` |
| `drivewaytest.html` | The Driveway Test — **deliberately public and standalone**: no login, no Supabase, no SQL, no token. Handed over at the kerb, reachable at `/drivewaytest.html` on any domain serving this repo |
| `api/*.js` | 26 serverless functions (ESM) |
| `sw.js` | service worker — push + offline shell |
| `manifest.json`, `icon-*.png`, `apple-touch-icon.png` | PWA assets |
| `robots.txt` | `Disallow: /` — an internal tool; nothing should index |
| `docs/*.pdf` | 3 contract PDFs — **referenced 6× by the app as print masters, deliberately public** |
| `bulk_assign.html` | referenced 2×, deliberately public |
| `*.sql` (32 at root) | migrations, **all applied by hand**; `.vercelignore` blanket-excludes them so none is ever served |
| `brand/` | the Word letterhead template (7 Aug) — **excluded**, internal |
| `vercel.json` | the `/api/digest` cron (11:00 UTC daily) **plus the two `presentation.*` host rewrites → `/popup.html`** |
| `package.json` (root) + `api/package.json` | Node 22.x; `@supabase/supabase-js`, `web-push`. **Only `api/package.json` sets `"type":"module"`.** |

`.vercelignore` excludes `.claude/`, `CLAUDE.md`, `.github/`, **`AI_CHEATSHEET.md`**, **`spark/`**, **`brand/`**, **`*.sql`** (a blanket rule — migrations are run by hand against Supabase and must never be served) and ten orphaned scratch `.html` pages. Its header comments explain each reasoning and record that entries were verified returning HTTP 200 to an anonymous visitor before being added. **Keep that discipline: if you add a file to the root, decide whether it ships — and say so in `.vercelignore` either way.**

**Verified 8 Aug 2026 at build 627:** 16 `.html` files at the root — 10 excluded as scratch, and **6 that ship on purpose** (`index`, `popup`, `studio`, `ai-field-manual`, `drivewaytest`, `bulk_assign`). **32 `*.sql`** files, all applied by hand and all excluded by the blanket rule. `brand/` (the Word letterhead template, 7 Aug) was excluded when it was added — the discipline held.

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

**✅ `/api/config` EXISTS — do not re-report it as missing.** An earlier revision of this file said `loadConfig()` fetched a route with no `api/config.js` behind it, and that Google Maps autocomplete was therefore silently off. `api/config.js` is present in the repo. Verified 1 Aug 2026 at build 557. There are **26** functions in `api/` as of 594 (`detect.js` arrived with The Walk), not 20.

---

## Shipping (cloud sessions)

Work on a branch, push, open a PR with a plain summary of what changed and what it cost. **Theo reviews and merges; Vercel deploys from `main`.**

- **SQL ships as separate `.sql` files, and runs BEFORE the `index.html` change.** Say so explicitly in the PR. (`.vercelignore` now blanket-excludes `*.sql`, so a committed migration is never served.)
- **Pick the build number with `scripts/next_build.py`** — it asks the remote. Two sessions colliding on numbers has happened twice (504–506, then the whole 574 span).
- On ship: add the feature row to `FEATURES.md`, one line to `cardinal_build_log.md`, strike the `OPEN_ITEMS.md` entry — in the same PR. **The 428–451 span is what skipping this looks like:** 24 builds of real work with no record outside the in-app changelog.
- Take a fresh `git hash-object` before pushing, to confirm what you push is what you verified.

### The service worker no longer serves stale builds — and the CACHE chore is gone too

The standing instruction has been "close and reopen the PWA twice." **The mechanism has now changed twice.** `sw.js` is **network-first for navigations** (a fresh deploy is picked up on the very next load; Supabase and `/api/*` are never cached), and — since the 474-era PR — **same-origin static assets are stale-while-revalidate**, so they self-heal on the load after a change. Its header now says bumping `CACHE` (`cardinal-shell-v1`, still never bumped) is **only needed to force-evict a poisoned entry**, not per deploy — an earlier revision of this file ordered a bump whenever a static asset changed, and that chore is obsolete. CDN assets stay frozen deliberately: floating majors, no test runner.

What remains true: an installed PWA can hold the old document in memory across a soft close. So still tell Theo to fully close and reopen twice — it costs nothing — but **do not diagnose a stale `index.html` as a service-worker cache problem.** It isn't one any more. Twice, that misdiagnosis masqueraded as "the fix didn't work."

---

## Permissions

```
Admin       theo@, joan@              everything, including all money
Production  curtis@, scottie@         all clients; no stats strips or partner money
Sales       nick@, joey@, jacob@      only what they created or are assigned (RLS)
```

`project_assigned_rep()` takes `p.checklist`, **not** `p.id`. `is_cardinal_admin()` is security-definer to avoid RLS recursion. Theo + Joan are hardcoded admin fallbacks in SQL and API.

**`estimates` RLS was tightened on 2 Aug 2026 and the migration is APPLIED** — `estimates_update_policy.sql`, run against production and verified. `est_update` had been `USING (true) WITH CHECK (true)`: **any signed-in user could edit any estimate**, including ones they could not delete and did not create. It now matches `est_delete` exactly — `is_full_access() OR created_by = my_email()` — so one ownership rule governs the table instead of two. The `WITH CHECK` additionally prevents reassigning `created_by` or moving a row onto an invisible project. **Do not re-run it as pending work** (it is idempotent; the revert statement is in the build log).

⚠️ **Known cost, recorded so it is not mistaken for a new bug:** three writes-back after publishing swallow their errors (`doc_id`, `contract_doc_id`, `status:'sent'` — all `try{}catch(_){}`). A rep publishing an estimate **somebody else created** still gets the document, but the link back is not written and nothing says so. Exposure was zero at the time (all 12 rows are theo@'s). `saveEstimate()` is **not** silent — `.select().single()` makes a refused update throw.

Client name column is **`name`**. Money has one chokepoint: `bidAmt()`. `stage_since` must be written on creation.

### ✅ `.single()` does **not** throw here, and there is no backlog — audited at build 474, re-counted at 627

Previous revisions of this file said "**`.single()` throws on zero rows** — there are 43 of them
against only 4 `.maybeSingle()`; use `.maybeSingle()` wherever absence is legal." **Both halves are
wrong**, and together they read as 43 pending fixes. Verified against the shipped
`@supabase/postgrest-js` source, not from memory:

- **`single()` only sets a header** — `Accept: application/vnd.pgrst.object+json`. PostgREST then
  answers a non-single row count with **406 / `PGRST116`**.
- **The client throws only under `.throwOnError()`**: `if (error && this.shouldThrowOnError) throw`.
  Otherwise it *returns* `{ data: null, error: {...} }`. **`throwOnError` appears 0 times in this
  repo**, so `.single()` never throws in this app.
- `maybeSingle()` sets **no** Accept header — it fetches a list and enforces cardinality
  client-side, so zero rows give `{ data: null, error: null }` with no error to filter out.

**The real hazard is destructure-then-dereference** — `const { data } = await ….single()` followed
by `data.foo` is a `TypeError` when the row is absent. **All sites were checked individually at 474 and
every one guards** (`if (error || !data)`, `if (!claim) return`, `est?.project_id`, `r.data &&`).
**Zero raw dereferences.** Converting them is churn with real regression risk and no correctness
gain — **do not open that migration.**

A first pass using a keyword heuristic flagged 5 "unguarded" sites; reading them showed **all 5
were false positives** — they guard by null-check rather than by the words the regex looked for.
That is the file's own "scope the assertion, then read what it captured" rule earning its place.

**Still prefer `.maybeSingle()` in new code where absence is expected** — not for safety, but
because `.single()` manufactures an error object the caller then has to tell apart from a real
failure. Current counts at **627**: **45 `.single()` · 6 `.maybeSingle()`**, and **`.throwOnError(` is
still 0** — re-measured, which is the only reason the paragraph above is still true.

The one site added since the 594 count is the **`punch_items` comment update** (607-era):
`…update({ comments: list }).eq('id', it.id).select().single()` — and it **guards**, `if(r.error)`,
with a schema-cache fallback. Found by diffing the 573 tree against 627 and reading the new site,
not by trusting the delta. **Zero raw dereferences still holds at 45.** The other sites added since
the audit (the 547–557 Crews work, 568's `creOpenSaved()`) also guard.

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
- Theo works from a phone **and** a desktop with an ultrawide — the doc set once recorded him as mobile-only, and that error hid a desktop-width contrast bug (487). He deploys through the GitHub web UI and works very late. Match the pace he sets and get out of the way.

---

## Secrets

Never put credentials in `index.html`, in a commit, or in a chat message. They go in Vercel env vars or GitHub secrets only. A Gemini key and a GitHub PAT have both been exposed in chat on this project — assume that mistake is easy to repeat and refuse to repeat it.

Note that `api/*.js` files carry **hardcoded fallbacks for the Supabase URL and the publishable anon key**. Those two are designed to be public and are safe. **Nothing else is.** Service-role keys, `GEMINI_API_KEY` and VAPID private keys must stay in env vars — and remember that anything at the repo root is served publicly unless `.vercelignore` says otherwise.
