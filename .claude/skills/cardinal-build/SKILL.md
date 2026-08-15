---
name: cardinal-build
description: Build workflow for the Cardinal Resource App (Cardinal Roofing & Renovations' single-file CRM/PWA — index.html, app.cardinalroster.com, repo Cardinal-1986/cardinal-inspections, Supabase backend). Use this skill for ANY work on the Cardinal app — features, bug fixes, theming/CSS, SQL/RLS migrations, /api functions, audits, or builds — even casual requests like "fix the header", "the estimates are broken", or "make that gold". If the conversation involves patching Cardinal's index.html or shipping a build to Theo, this skill is mandatory. It enforces the direct-surgery patch workflow, exact-match asserts, atomic writes, the build gates (syntax, dupe-API, negative controls, jsdom harness), and staging/deploy conventions.
---

# Cardinal Build Workflow

Direct surgery on a **~2.58 MB** single-file PWA (**99 inline script blocks, 100 `<style>` blocks** at build 427; verified against `origin/main`), shipped to a roofing company that runs its business on it. No build pipeline, no module folder, no pristine base. Every build patches the shipped file, proves itself through gates, and stages one uniquely-named artifact that Theo uploads from his phone.

## Step 0 — Load project state (always, before anything)

The skill is the procedure. The **project doc set is the state** — read what the task needs:

| File | Holds | Read when |
|---|---|---|
| `START_HERE.md` | The app, workflow, gates, doctrine, current build | Always, first |
| `FEATURES.md` | Every feature and where it lives | Before building anything |
| *(fallback)* `references/app_map.md` | Bundled feature map, snapshot at 427 | When FEATURES.md isn't in context |
| `OPEN_ITEMS.md` | Live to-do, blockers, **settled decisions — don't re-litigate** | Picking up work |
| `BUG_CLASSES.md` | Failure modes already paid for | Before debugging, before shipping |
| `cardinal_build_log.md` | One line per build | Tracing when/why something changed |
| `HANDOFF.md` (when present) | Session-state bridge | It says so itself — read it first |

**The doc set lives in the repo** at `.claude/skills/cardinal-build/docs/`, with `CLAUDE.md` at the root. Fetch it rather than working from memory:

```bash
B=https://raw.githubusercontent.com/Cardinal-1986/cardinal-inspections/main
curl -s $B/CLAUDE.md
curl -s $B/.claude/skills/cardinal-build/docs/START_HERE.md
```

**When those files are in context, they are authoritative and supersede this skill's bundled references** (snapshots at 427). **Check their dates against the current build before trusting them** — docs written a session ago describe a different app. Note `raw.githubusercontent.com` serves stale copies for minutes after a commit; when it disagrees with you, re-check against the commit SHA or the API.

⚠ **The repo also contains its own copy of this skill** at `.claude/skills/cardinal-build/`. Two copies exist: the packaged one (this file, for chat sessions) and the in-repo one (for Claude Code). When updating doctrine, say which you changed — they drift.

## The prime doctrine: things that look missing are usually buried

**Six "missing features" were fully built and merely unreachable or plain-looking** — including a `styleMounts()` inline style beating every CSS rule, and an entire Team page sitting in the burger menu. The first four: — a dead handler stub (manual estimates, 314), a working Attach bar under the bottom nav's z-index (325), a complete punch module mounting to anchors hidden on every profile (333), and a **Team page that had been in the burger menu the whole time**, wired to `team_profiles` with edit, phone and photos (373 restyled it rather than adding a second directory). This is now the single most likely explanation when something appears absent.

Before building anything: grep `FEATURES.md`, then grep the app for the feature name **and for its mount anchor**. Ask "does this *element* still exist?" — not "does this code exist?" Extend, don't add. Duplicate features are the app's most expensive recurring bug class (bids ARE estimates; one punch pipeline; one feed; one calendar; one document pipeline).

## Step 1 — Get the current file

1. A fresh `index.html` Theo uploaded this session
2. `curl https://raw.githubusercontent.com/Cardinal-1986/cardinal-inspections/main/index.html`
3. The live site (service-worker stale — prefer the repo)

```
/home/claude/app/index_v{N}.html      ← one file per build, never overwritten
        ↓  python patch script using scripts/patch_lib.py
/home/claude/app/index_v{N+1}.html    ← atomic temp-then-rename
        ↓  gates (Step 3)
/mnt/user-data/outputs/cardinal_v{N+1}_index.html   ← unique name, staged ONLY on green
```

## Step 2 — Patch

**Patch or replace? When there's a choice, say so before starting, with an honest cost on each.** Replacement is right when a module's job changed wholesale — delete and rebuild, **preserving the public API surface (`window.Cardinal*`) so callers survive**. Done cleanly for retail-B, the brass client directory, the community home (359), the Keeper profile, the Badge client card.

**The tell that a replace is due:** a module capped at a phone width with no media queries (community home was `max-width:680px`, zero `@media` — that *was* the desktop empty-space complaint), or an override layer past its tripwire (retail hit 21 rules).

Deletion at source beats out-specificity — when a rule is wrong, delete it, don't stack a stronger one on top. Sanctioned patching: one-or-two-property geometry fixes, and beating an inline `z-index` with `!important`. **retail-B shipped (335–341)**; `references/retail_b/` is now a historical + regression record, not a build plan. The community client page is a **written exception** — it borrows the base profile's engine rather than forking it (adoption pattern in `references/gates.md`).

Use `scripts/patch_lib.py` (import it; don't re-implement):

```python
import sys; sys.path.insert(0, '<skill>/scripts')
import patch_lib as pl
src = pl.load('index_v333.html')
pl.context(src, 'anchor fragment')     # prints repr() of surrounding text — write anchors from THIS
src = pl.sub(src, OLD, NEW)            # asserts count==1, aborts before write on mismatch
pl.write_atomic('index_v334.html', src)
pl.assert_in('index_v334.html', NEW)   # assert on the artifact you wrote
```

Non-negotiable:
- **Every edit is exact-match** with an asserted occurrence count; a failed assert aborts before any write.
- **Anchors must match real whitespace.** Module code is newline-separated; print `repr()` of the real text (`pl.context`) before writing the patch — a space-for-newline mismatch aborts, costing a round.
- **`sub()` is literal splicing — it does NOT expand regex backreferences.** A `\1` gets written literally (destroyed five CSS rules once). Use `re.sub` for backrefs, or reconstruct strings whole.
- **Recon regexes need bounds.** `[^{}]` can't cross a brace; unbounded `[\s\S]*` on a 2 MB file backtracks until timeout. Use `[\s\S]{0,N}` or `find()` + slicing.
- **Document-level anchors are never unique** — contract iframe templates embed complete HTML documents (`</body>` ×9). Append modules with `rfind('</body>')`; build long module text in a file, never a shell heredoc.
- **Bump the build label every build** — and bump **the app stamp**, which is the only version string in rendered markup (nav menu `<div>`). There are **20 version strings and 5 distinct builds**, in **two separator forms**: 9 with a space (`v2026-07-29 build 427`) and 11 with a middot (`v2026-07-22 · build 148`). **Any regex assuming one form silently misses the other** — that is how two sessions measured 9/4 and 6-distinct and both came in low. ⚠ **The label gate currently passes when only a plugin footer moved**; confirm by eye that the app stamp specifically changed. Full reconciliation, the truth table, and the `data-cr-footer` fix: `references/invariants.md`.
- **Before counting, ask what the *other* form looks like.** The canonical case: version strings use **two** separators, so every single-form regex undercounts, and build 148 was invisible to every earlier audit because it appears only in the middot form. Enumerate the variants (separators, whitespace, entity vs literal, quote style) *then* count.
- **Count with a lexer, never a bare regex.** `python3 <skill>/scripts/jslex_count.py index.html 'needle'` classifies every hit as code / string / comment / regex and reports how many distinct modules contain a *code* hit. This exists because both shortcuts were wrong in opposite directions: counting the global scroll lock, a bare regex said 14 modules (one hit was inside a comment) and comment-stripping said 10 (it ate real calls, because `/*` inside a string literal is not a comment). The lexer says **13 — correct**, and I re-verified that at 427.
- **Scope the assertion to the function, not the file.** The single most repeated error here. `await signedPhotoMap(...)` appears twice — `publish()` and `openPreview()` — so asserting `1` file-wide fails a correct patch. Extract the function by brace-matching, then assert against that slice. Same trap with `LABEL`: a file-wide regex finds the *insurance* map when you meant community.
- **Prefer self-computing assertions** over hardcoded numbers, which are usually read off an already-patched tree: `assert count(patched, V) == count(orig, V) - 1`.
- **Print what your extractor captured** before asserting on it. An extractor that swallowed 2,271 characters returned empty counts, and empty looks like a legitimate zero.
- **Prove scope two ways.** Re-applying the edits to a fresh copy must reproduce the file byte-for-byte; and replacing each changed region with a sentinel in both old and new must compare equal. **Walk regions in file order** or you get a false failure.
- **Before patching any CSS selector, run `python3 <skill>/scripts/selector_audit.py index.html '.sel'`** — it lists every definition, the enclosing `<style id>`, any `@media` wrapper, and names the winner. `.acthead` had four; the winner was 39,000 lines below the two you'd find first (388).
- **Colour work → `references/theming.md` first.** The `rb-light` token system, the semantic colours that must NOT be tokenized, the three questions to ask before "fixing" a light element on a dark ground, and the one sanctioned override.
- New `window.Cardinal*` export → `Object.assign(window.X || {}, {...})`, never plain assignment. **Count assignments, not mentions** — `CardinalCommunityHub` appears 29 times and is assigned once.
- New full-screen views must be registered in **`hideAllViews()`** *and* given a **history restore case** (two routers coexist; see bug classes).
- Borrowing live base DOM → the **adoption / suspend-and-return / re-anchor** patterns in `references/gates.md`.
- Visual changes get **previewed** (standalone mock of the real bar/card, labeled options) before shipping; approved sizes ship as fixed values, never viewport math. Timid increments read as ignored requests.

## Step 3 — Gates (every build, in order)

### Gate 0 — the sentinel. Run it on every build that changes a screen.

**This is the standing check, and it is the only one that is not disposable.**
Everything else in this file is a per-build gate: written once, run twice, never
run again. The sentinel is the opposite — one script, every build, checking only
the classes that have **already bitten this project more than twice**.

```bash
node <skill>/scripts/sentinel.js --selftest            # prove the instrument works
node <skill>/scripts/sentinel.js <artifact> \
     --setup <skill>/scripts/sentinel_setup_visualizer.js \
     --since <the previous build's artifact> \
     --viewports 390x844,1194x834,1440x900
```

| id | what it catches | what it already cost |
|---|---|---|
| `INK` | text below the contrast floor, scored against the **composited** ground | 448, 487, 527, 557, 573, 630, 681 — **seven** times, every one reported as "can't read this" |
| `COLLAPSE` | a box materially shorter than its own image | shipped in **814, 815 and 816** before a phone screenshot caught it |
| `OVERLAP` | two siblings whose boxes intersect | 588/590, 814 |
| `OVERFLOW` | the body scrolls sideways | checked in a dozen disposable harnesses, permanently in none |
| `DEAD` | a rule that loses to something **no more specific than itself** — a source-order accident | 481, 817. Every mechanical gate was green both times |
| `OVERRIDDEN` | a rule beaten by something deliberately more specific — the cascade working, only interesting when the rule is **new** | build 481's shape |
| `UNWIRED` | a control that renders and does nothing | BUG_CLASSES 16 — Studio Archive, dead from 614 to 632 |

**Three rules about using it, each of which it has already violated once:**

1. **`--selftest` before you trust a clean run.** Two checks were incapable of
   firing when first written and both looked perfectly reasonable in the source:
   `COLLAPSE` exempted `overflow:hidden` as "a deliberate crop" and therefore
   slept through the exact build it was written for; `DEAD` descended into
   non-matching `@media` blocks and reported build 817's **fix** as the defect.
   Silence from an instrument never seen to speak is not evidence.
2. **`--since <prev>` or it dies of noise.** A checker reporting the same forty
   pre-existing findings every build is muted by the third build. `--since`
   renders the previous artifact through the identical probe and subtracts. The
   carried count is always printed; `--all` shows it. Never hide debt.
3. **A `--setup` file, or it only ever checks the login screen.** Every defect
   worth catching lives behind the sign-in, and half of them live inside a panel
   that does not exist until it is opened — so the setup file also declares
   `window.__sentinelStates`, the screens to walk through. A sweep of the landing
   page reports CLEAN and means nothing by it.

**THE RULE THAT KEEPS THIS ALIVE — and it is the whole point.** When a bug class
recurs, it does **not** get another paragraph in `BUG_CLASSES.md`. It gets a
check in `sentinel_probe.js` and a case in `sentinel_selftest.html`, or an
explicit written note saying no mechanical check is possible and why. Prose has
lost to this project 45 times. A class with neither a check nor that note is an
open wound.

### Then the mechanical gates:

```bash
python3 <skill>/scripts/check_build.py index_v334.html \
    --prev index_v333.html \
    --marker 'the-string-your-fix-added'
```

Covers: per-block `node --check` on **all** inline scripts (module scripts included), tag balance, CSS brace balance, **duplicate `<style id=>` detection**, a label gate (**known limitation — see below**) (a second block with the same id shadows nothing and confuses every future grep), the **dupe-API check**, build-label bump vs prev, **marker present in the artifact you wrote**, and the **negative control** (marker absent from prev — a green gate proves nothing until it has been seen to fail; a stale file once staged green).

Then the functional gate: a **jsdom harness** exercising the changed surface with structural proofs. Full recipe in `references/gates.md` — read it before writing any harness. The laws in brief:
- Whole-string assertions, never fragments.
- The harness must replicate the **real** builder's markup and delegation (a harness seeded from your own assumption validates fiction — three times now).
- Structural proofs (`matches()`, parentage, counts) — programmatic clicks succeed on hidden elements.
- Navigate the way the app navigates; views created at `show()` time don't exist before it.
- **Lock your mocks** — the app's async boot can null `window.supa` after the mock is set (`Object.defineProperty(w,'supa',{value:mock,writable:false})`).
- **Print honest labels** — the printed PASS/FAIL and the failure counter must read the same boolean; **stage on the exit code**, never on eyeballing output.
- **Watchdog every harness.** A hung jsdom boot looks identical to a slow one; a 30s timeout printing `GATE TIMEOUT` saves the round.
- **Re-bind mocks after boot** — the app nulls `sb` when `TEAM` is false at parse time, so a mock installed in `beforeParse` is gone by the time a handler runs. Set `w.sb = w.__mockChain` after boot.
- **Spies must target what the code actually calls** — the legacy router calls captured originals, not `window.showHome`; a spy on the global "proved" a fix that was never tested. Observe the DOM result instead.
- **Re-query after a re-render** — holding a node reference across a render reports a false failure; the node was replaced, not broken.
- Keep gate scripts beside the modules, not in `/tmp` — module resolution follows the script's directory and a missing `jsdom` crash reads like a test failure.
- jsdom proves *does this work*, never *does this look right*. Pixels are Menu → 🩺 Self Check on the phone plus Theo's eyes — say so instead of pretending.

⚠ **Label-gate status:** build 428 added `data-cr-footer` to the app stamp, and PR **#39** anchors the repo's gate on it (`app_stamp()`, em-dash heuristic as fallback) and corrects the two-separator count. **This bundled copy still has the old set-comparison limitation** — it passes when only a plugin footer moved, and its space-only regex never sees build 148. Do not fork a fix here; once #39 is merged, sync this copy from the repo's. Until then, verify the app stamp moved by eye. Details in `references/invariants.md`.

**When a gate goes red, first ask whether the test or the app is wrong.** Roughly **half** the reds across the 335–373 run were stale or mistaken assertions — behaviour deliberately changed, a regex missing a trailing semicolon, an em-dash assumed illegal in a filename, a spy on a function the code never calls, a marker that already existed in the previous build. Fix the gate when the gate is wrong; **never fix the app to satisfy an old assumption.**

**Stage to `/mnt/user-data/outputs/` only on green. Never stage on red, never hand over with a failing check.**

## Step 4 — Ship (two models — know which you are in)

**Cloud/agent session with repo write access → branch + PR.** Work on a branch, push, open a PR with a plain summary of what changed and what it cost. **Theo reviews and merges; Vercel deploys from `main`.** Take a fresh `git hash-object` before pushing, to confirm what you push is what you verified.

**Chat session (Theo on his phone) → stage a file, he uploads via the GitHub web UI.** Unique filename every build: `cardinal_v{N}_index.html` (mobile browsers serve cached downloads on repeated names). Present with the file tool, and retire the superseded file so only one candidate is visible.
- SQL ships as separate `.sql` files. **Deploy order: SQL first, then index.html.**
- Remind Theo: fully close and reopen the PWA **twice** after deploy — the service worker serves stale builds.
- On ship: add the feature row to `FEATURES.md`, one line to the build log, strike the OPEN_ITEMS entry. Terse report: what shipped, what it cost, what's still broken.
- **Secrets never go in chat.** A GitHub PAT and a Gemini key have each been pasted into a session on this project; both need revoking/rotating if not already done. Secrets go straight into Vercel/GitHub. If Theo pastes one, say so plainly and tell him to revoke it.
- **Cache discipline costs real time.** Twice in one session "the fix didn't work" was the service worker serving a stale build. Always remind about the double close-and-reopen — and before assuming a bug, verify the fix is actually present in the file that shipped.

## Contract PDFs

Contract work (trade agreements, T&C, ORC 1345.23 cancellation notices) has its own doctrine and its own generator scripts, bundled in `scripts/pdf/` so they survive container resets: `notice.py` (statutory notice ×2), `gutter.py` (one layout → fillable AND print outputs), `split_roof.py` (re-paginating Theo's oversized supplied PDFs — they arrive 18–22 in tall and will again), `assemble.py`, and `verify_pdf.py` (the provable §6e checks: word overlap, margins-within-page-bounds, no rule through a baseline, field counts, no stroked text). Read `references/contracts.md` before any contract task — it carries the re-pagination doctrine, the settled gutter decisions (do not re-litigate), and the legal-content rule: **never silently reword the statutory cancellation pages; nobody in this loop is a lawyer.** PDFs cannot be visually verified from here — run `verify_pdf.py`, then say plainly that Theo is the final visual gate.

## Invariants — read before writing

`references/invariants.md` carries the silent-corruption rules, each figure re-verified at 427: **`normStage()` is a whitelist that fails to `'Lead'`** (so `STAGES` must contain a value before any row gets it — ship the whitelist in its own commit, before the writer); never mutate `estimates.photos`; **Community bills one party for work on another's house** (payer, occupant and contact are three roles); **43 `.single()` and zero `.maybeSingle()`**; **one global scroll lock across 13 modules with no reconciler** — do not add a 14th writer; adding `await` to a sync function is never local; palette tokens need literal fallbacks.

## Known bug classes

Before debugging, and after writing: the project's `BUG_CLASSES.md` if in context, else `references/bug_classes.md` (snapshot at 427). Headline classes: buried-not-missing, silent async failures, z-index stranding vs `#pwaNav` (9990), dead layout serving hidden elements, legacy `body.claim-*` themes, MutationObserver loops, money outside the `bidAmt()` chokepoint, defaults-become-data, and test data that lies convincingly — confirm the data before debugging the code.

## Working with Theo

Mobile-only, GitHub web UI deploys, short direct messages. **Never state an inferred fact as fact — reproduce before theorising**; screenshots have root-caused more bugs on this project than reasoning has. One thing at a time, verified. Offer patch-vs-replace with real costs. No flattery, no lecturing; honest pushback welcome. Theo works very late by habit — match the pace he sets, mention it once honestly, then get out of the way.
