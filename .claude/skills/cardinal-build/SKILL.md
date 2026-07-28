---
name: cardinal-build
description: Build workflow for the Cardinal Resource App (Cardinal Roofing & Renovations' single-file CRM/PWA — index.html, app.cardinalroster.com, repo Cardinal-1986/cardinal-inspections, Supabase backend). Use this skill for ANY work on the Cardinal app — features, bug fixes, theming/CSS, SQL/RLS migrations, /api functions, audits, or builds — even casual requests like "fix the header", "the estimates are broken", or "make that gold". If the conversation involves patching Cardinal's index.html or shipping a build to Theo, this skill is mandatory. It enforces the direct-surgery patch workflow, exact-match asserts, atomic writes, the build gates (syntax, dupe-API, negative controls, jsdom harness), and staging/deploy conventions.
---

# Cardinal Build Workflow

Direct surgery on a ~2.2 MB single-file PWA (85 inline script blocks, ~84 named modules, ~70 `window.Cardinal*` exports at build 334), shipped to a roofing company that runs its business on it. No build pipeline, no module folder, no pristine base. Every build patches the shipped file, proves itself through gates, and stages one uniquely-named artifact that Theo uploads from his phone.

## Step 0 — Load project state (always, before anything)

The skill is the procedure. The **project doc set is the state** — read what the task needs:

| File | Holds | Read when |
|---|---|---|
| `START_HERE.md` | The app, workflow, gates, doctrine, current build | Always, first |
| `FEATURES.md` | Every feature and where it lives | Before building anything |
| `OPEN_ITEMS.md` | Live to-do, blockers, **settled decisions — don't re-litigate** | Picking up work |
| `BUG_CLASSES.md` | Failure modes already paid for | Before debugging, before shipping |
| `cardinal_build_log.md` | One line per build | Tracing when/why something changed |
| `HANDOFF.md` (when present) | Session-state bridge | It says so itself — read it first |

**In this repo the doc set lives in `.claude/docs/`.** Read it there; the root `CLAUDE.md` summarises it.

**When these project files are in context, they are authoritative and supersede this skill's bundled references** (which are snapshots at build 334). If they're absent, ask Theo or fetch from the repo. Do not proceed from memory alone — build numbers, open items, and settled decisions change every session.

## The prime doctrine: things that look missing are usually buried

**Three separate "missing features" were fully built and merely unreachable** — a dead handler stub (manual estimates, 314), a working Attach bar under the bottom nav's z-index (325), and a complete punch module mounting to anchors hidden on every profile (333). This is now the single most likely explanation when something appears absent.

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

**Patch or replace? When there's a choice, say so before starting, with an honest cost on each.** Replacement is right when a module's job changed wholesale (preserve the `window.Cardinal*` API surface so callers survive). Deletion at source beats out-specificity — when a rule is wrong, delete it. Sanctioned patching: one-or-two-property geometry fixes, and beating an inline `z-index` with `!important` (the one correct `!important`). **Retail-B is COMMITTED** — before touching anything retail, read `references/retail_b/SPEC.md` (the committed build plan; the interactive spec `estimates_final.html` sits beside it). The specs are the source of truth: build them, do not re-design them.

Use `scripts/patch_lib.py` (import it; don't re-implement):

```python
import sys; sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
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
- **Bump the build label every build** — search `v2026-`.
- New `window.Cardinal*` export → `Object.assign(window.X || {}, {...})`, never plain assignment.
- Borrowing live base DOM → the **adoption / suspend-and-return / re-anchor** patterns in `references/gates.md`.
- Visual changes get **previewed** (standalone mock of the real bar/card, labeled options) before shipping; approved sizes ship as fixed values, never viewport math. Timid increments read as ignored requests.

## Step 3 — Gates (every build, in order)

Mechanical gates first:

```bash
python3 .claude/skills/cardinal-build/scripts/check_build.py index_v334.html \
    --prev index_v333.html \
    --marker 'the-string-your-fix-added'
```

Covers: per-block `node --check` on **all** inline scripts (module scripts included), tag balance, CSS brace balance, **duplicate `<style id=>` detection** (a second block with the same id shadows nothing and confuses every future grep), the **dupe-API check**, build-label bump vs prev, **marker present in the artifact you wrote**, and the **negative control** (marker absent from prev — a green gate proves nothing until it has been seen to fail; a stale file once staged green).

Then the functional gate: a **jsdom harness** exercising the changed surface with structural proofs. Full recipe in `references/gates.md` — read it before writing any harness. The laws in brief:
- Whole-string assertions, never fragments.
- The harness must replicate the **real** builder's markup and delegation (a harness seeded from your own assumption validates fiction — three times now).
- Structural proofs (`matches()`, parentage, counts) — programmatic clicks succeed on hidden elements.
- Navigate the way the app navigates; views created at `show()` time don't exist before it.
- **Lock your mocks** — the app's async boot can null `window.supa` after the mock is set (`Object.defineProperty(w,'supa',{value:mock,writable:false})`).
- **Print honest labels** — the printed PASS/FAIL and the failure counter must read the same boolean.
- Keep gate scripts beside the modules, not in `/tmp` — module resolution follows the script's directory and a missing `jsdom` crash reads like a test failure.
- jsdom proves *does this work*, never *does this look right*. Pixels are Menu → 🩺 Self Check on the phone plus Theo's eyes — say so instead of pretending.

**Stage to `/mnt/user-data/outputs/` only on green. Never stage on red, never hand over with a failing check.**

## Step 4 — Stage and hand off

- **In a cloud session, ship by branch + PR** — commit the patched `index.html`, push, and open a PR summarising what changed and what it cost. Theo merges; Vercel deploys from `main`. The old "stage a uniquely-named artifact to outputs for manual upload" step is only the fallback when there is no repo write path.
- SQL ships as separate `.sql` files. **Deploy order: SQL first, then index.html.**
- Remind Theo: fully close and reopen the PWA **twice** after deploy — the service worker serves stale builds.
- On ship: add the feature row to `FEATURES.md`, one line to the build log, strike the OPEN_ITEMS entry. Terse report: what shipped, what it cost, what's still broken.

## Contract PDFs

Contract work (trade agreements, T&C, ORC 1345.23 cancellation notices) has its own doctrine and its own generator scripts, bundled in `scripts/pdf/` so they survive container resets: `notice.py` (statutory notice ×2), `gutter.py` (one layout → fillable AND print outputs), `split_roof.py` (re-paginating Theo's oversized supplied PDFs — they arrive 18–22 in tall and will again), `assemble.py`, and `verify_pdf.py` (the provable §6e checks: word overlap, margins-within-page-bounds, no rule through a baseline, field counts, no stroked text). Read `references/contracts.md` before any contract task — it carries the re-pagination doctrine, the settled gutter decisions (do not re-litigate), and the legal-content rule: **never silently reword the statutory cancellation pages; nobody in this loop is a lawyer.** PDFs cannot be visually verified from here — run `verify_pdf.py`, then say plainly that Theo is the final visual gate.

## Known bug classes

Before debugging, and after writing: the project's `BUG_CLASSES.md` if in context, else `references/bug_classes.md` (snapshot at 334). Headline classes: buried-not-missing, silent async failures, z-index stranding vs `#pwaNav` (9990), dead layout serving hidden elements, legacy `body.claim-*` themes, MutationObserver loops, money outside the `bidAmt()` chokepoint, defaults-become-data, and test data that lies convincingly — confirm the data before debugging the code.

## Working with Theo

Mobile-only, GitHub web UI deploys, short direct messages. **Never state an inferred fact as fact — reproduce before theorising**; screenshots have root-caused more bugs on this project than reasoning has. One thing at a time, verified. Offer patch-vs-replace with real costs. No flattery, no lecturing; honest pushback welcome. Theo works very late by habit — match the pace he sets, mention it once honestly, then get out of the way.
