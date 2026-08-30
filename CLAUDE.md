# Cardinal Resource App — read this first

Single-file PWA (`index.html`) for **Cardinal Roofing & Renovations, LLC**, Dayton OH.
Live at **app.cardinalroster.com** · Vercel deploys on merge to `main` · Supabase backend (DB, storage, auth, RLS) · serverless functions in `/api/` (ESM — `api/package.json` has `"type":"module"`, handlers are `export default async function handler`).

### ⚠ FIRST, THE THING THAT CHANGED MOST: **a build number is no longer `index.html`'s**

**The app is at build 836. `index.html` is at build 808 — and that is correct, not stale.**
Builds **809–836 shipped entirely outside `index.html`**: in `visualizer/index.html` (its own
stamp, `v2026-08-15 build 826`) and in `spark/visualizer_worker.py` (its own `WORKER_BUILD`,
currently **`wb-2026-08-16.17`**). Verified against `git log -- index.html`, whose newest commit
is 808.

Three consequences, and every one of them has already cost somebody time:

- **`check_build.py` takes ONE artifact and gates only that artifact.** Green on `index.html`
  says nothing about the Visualizer, Studio or the book. Parse their inline scripts separately.
- **The app stamp in `index.html` is not "the current build" any more** — it is the current build
  *of index.html*. `scripts/next_build.py` asks the remote for the safe next number across all of
  them; it is still the only correct way to pick one.
- **Some builds carry TWO version stamps** — an app/visualizer build number *and* a
  `wb-YYYY-MM-DD.N` worker build. The build log writes them as `Build 827 / wb-2026-08-15.9`.
  When a Visualizer bug is reported, the first question is *which pair ran it*; that is what
  `achieved._worker` (build 829) exists to answer.

---

The repo now ships **five HTML artifacts plus a second application**, not one:

| Artifact | What | Read before touching |
|---|---|---|
| `index.html` | the app — and the **Vision hub** front door when the hostname starts with `showroom.` or `?vision=1` | this whole file |
| `popup.html` | **The Pop-Up Roof**, the client-facing book behind the `presentation.*` rewrites in `vercel.json` | `ROOF_JOURNEY_BRIEF.md` |
| `studio.html` | **Cardinal Studio**, the standalone admin curation browser | "Cardinal Studio" below |
| `supplement.html` | **The Supplement Desk** (668, **now at build 1055**) — the Studio pattern again: public file, own Supabase sign-in, `is_cardinal_admin()`, and `api/supplement.js` enforcing admin server-side. **It carries its own stamp now** — a header chip and `window.SD_BUILD`; before 1055 it had none, so "which Desk code ran" was unanswerable | build log 667–673 and **1055**; `CR_SUPPLEMENT_DESK_AUDIT_2026-08.md` |
| `ai-field-manual.html` | the 17-part manual the Resource Library iframes | `.vercelignore`'s header |
| **`visualizer/index.html`** | **The Exterior Visualizer — a SEPARATE APPLICATION** (807+). No CRM code in it at all. Laid out as a folder so it can become the root of its own Vercel project | **"The Exterior Visualizer" below, and `HANDOFF.md`** |

For app work the file you want is still lowercase **`index.html`** at the repo root. **113** inline
`<script>` blocks, **135** `<style>` blocks, **3** external CDN scripts, **0** module scripts. No
build step, no bundler, no framework, no test runner.

Owner: **Theo Dorion** · theo@cardinalrenovations.net

*Figures below carry the build they were measured at. Rows marked **@808** were re-measured **16 Aug 2026** on the shipped tree by `scripts/measure_counts.py` — the same script that was validated against the build-573 tree (`aeac5e5`) and reproduced this document's recorded 573 column exactly. Anything still carrying an older stamp is flagged in place; it is kept rather than deleted so nobody "corrects" a right number, but do not quote it as current without re-measuring.*

*Across 627 → 808 the file grew by seven inline scripts and seventeen style blocks. Inline scripts 106 → **113**, style blocks 118 → **135**, `window.Cardinal*` 90 → **94**, `</body>` 11 → **12**. That growth is the insurance/supplement arc (637–673), the emoji-to-drawn-icon sweep (676–699), the Community port to the black card (705–), the Production rebuild (766–772) and the client-profile rebuild (788–804). **The Visualizer added none of it — it is a different file.** If you are quoting a number from a revision of this document older than 557, it is wrong.*

**Size, stated once so nobody re-derives it wrong (@808):** **4,467,167 bytes on disk (4.26 MiB / 4.47 MB)** — but **4,442,369 characters**, because the file is UTF-8 with multi-byte content. `check_build.py` prints the *character* count and labels it "bytes". `wc -c` prints the byte count. They will never agree; neither is broken. The file grew ~814 KB across 628–808 (and ~151 KB across 595–627, ~177 KB across 574–594, ~42 KB across 558–573, ~464 KB across 483–557).

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
| **`spark/VISUALIZER_SETUP.md`** | **Before any Visualizer or Spark-worker work** — the ComfyUI graphs, the `cardinal-visualizer` systemd unit, and which Python it runs from |
| `spark/ORIENTATION.md`, `spark/ACCULYNX_MIGRATION.md`, `spark/RECOVERY_602.md` | Spark-side history — the AccuLynx pull and the 602 taxonomy remap |
| `.claude/skills/cardinal-build/docs/CR_AUDIT_2026-08.md` (+ `_COMMUNITY_`, `CR_E2E_WORKFLOW_VALIDATION_2026-08.md`) | Picking up audit follow-ups — the CR-AUD / CR-COM item ids the build log cites by number |
| `.claude/skills/cardinal-build/docs/ABC_SETUP.md` | ABC Supply / Suppliers work (688, 774) |
| `.claude/skills/cardinal-build/docs/OC_BRAND_RULES.md` | **Before putting any Owens Corning or Pink Panther mark on a screen** — the approval gate is Theo's to pass, and the Panther IS available to contractors (a claim to the contrary shipped at 615–623 and was wrong) |

The build workflow lives in `.claude/skills/cardinal-build/SKILL.md`. It triggers on any Cardinal work — features, bug fixes, theming, SQL, `/api`, audits.

### ⚠ The doc set lags the app — check the gap before trusting a number

*The one thing that has never changed: **`cardinal_build_log.md` has no entry for roughly 468–542**, because much of that span was built through a different tool that never read this folder.*

**As of 16 Aug 2026 the app is at build 836** — `index.html` at **808**, `visualizer/index.html` at **826**, the Spark worker at **`wb-2026-08-16.17`**. Current state:

| File | Worked forward to | Trust it? |
|---|---|---|
| `cardinal_build_log.md` | **836** | ✅ **the one doc that has never fallen behind.** Entries written as each build shipped, 543 onward. 1.2 MB now — grep it, don't read it |
| `HANDOFF.md` | **14–15 Aug session (813–826)** | ✅ **START HERE for session state.** Its newest section is the Visualizer surface-picker verdict and the A/B/C fork — read it before touching the Visualizer |
| `FEATURES.md` | **~824 in content**; header stamp older — the newest section at the bottom outranks it | ✅ 318 KB. The Visualizer overlay/solo tables are at the very end |
| `OPEN_ITEMS.md` | **~15 Aug** in its newest layer; **the file is explicitly layered and each layer carries its own date** — its own header says so | ✅ for the newest layer (the OC colour catalog, done 15 Aug). ⚠️ the long middle is still 573-era |
| `BUG_CLASSES.md` | **~836** — 152 KB, and the class numbers are now in the **40s** (37 = a negative control that CRASHES instead of reporting red; 47 = `achieved` drift measured inside the mask) | ✅ classes 12–13 at 573, 14 at 595, 15–16 at 630/632, 27–28 at 683, and the 30s–40s across the Visualizer arc |
| `OC_BRAND_RULES.md` | **8 Aug** | ✅ read it before any OC or Pink Panther mark |
| `CONTRACTOR_VISION_SUITE.md` | **572** | ✅ an audit, not a status page — its fences are still the fences |
| `START_HERE.md` | 467 | ⚠️ historical — it now says itself to read `CLAUDE.md` first |

**The span with no narrative record anywhere in the doc set is still roughly 468–542, and that is now the ONLY gap.** Everything from 543 to 836 is in `cardinal_build_log.md`.

⚠️ **CORRECTION 26 Aug 2026 — that span is NOT lost, and the branch holding it was one
`git push --delete` from gone.** `main` carries **74** commits, because every PR is
squash-merged. The branch **`claude/ai-can-build-584` carries 787**, and 468–542 is among
them — 536 the left-nav rebuild, 539 literal-yellow Landing, 540 the money circle, 541 the
contracts tab, 542 the roofing Construction Agreement, 544–545 the obsidian tiles, 547–554
the Crews arc. **It is the commit-by-commit lineage of builds ~1–584 and it exists nowhere
else.**

**Every signal about that branch points the wrong way.** `git merge-base origin/main
7a1d904` returns **empty** — no common ancestor, because main's history was rewritten
beneath it — so it is unmergeable by construction, and its name reads like abandoned
feature work. Both readings say "delete me". **It exists to be read, not landed.** I
recommended deleting it, was wrong, and found out only by checking what was on it first.

⚠️ **`aeac5e5` lives on that branch and is NOT reachable from `main`** — verified with
`git merge-base --is-ancestor aeac5e5 origin/main`, which returns false. That is the tree
this file cites four times and `scripts/measure_counts.py` names in its own header as its
negative control. **A sweep of every SHA cited in the doc set found ~75 that are not
ancestors of main.** Most survive through GitHub's permanent `refs/pull/N/head` refs — but
that is GitHub's retention policy doing the work, not anything in this repo.

✅ **FIXED 26 Aug — two preservation branches exist on the remote**, so the objects no
longer hang off a single ref: **`history/pre-squash-584`** (`7a1d904`, the 787-commit
lineage) and **`history/build-573-baseline`** (`aeac5e5`, `measure_counts.py`'s control,
readable with `git show history/build-573-baseline:index.html`). `claude/ai-can-build-584`
is now redundant and safe to delete.

⚠️ **Tags were the obvious answer and are BLOCKED — and the shape of the block matters.**
Established with a control, not assumed: an annotated tag push is 403, a lightweight tag
push is 403, **a branch push at the identical sha succeeds**, and deleting any ref is 403.
So the restriction is `refs/tags/*` plus deletion — not the objects, not write access. *The
two tag failures alone read as "no write permission"; only the branch control showed
otherwise.* ⚠️ **Git prints `Everything up-to-date` after the 403 on both refused
operations** — a phrase that reads like success. Use `--verbose` and check the exit code.
The tag commands, for a shell with Theo's own credentials, are in `OPEN_ITEMS.md`.

⚠️ **The build log's heading levels are inconsistent and a header grep will lie to you.** 543–684 and 827–836 use `## Build NNN`; **685–826 mostly use `## build NNN` (lowercase), a `### NNN —` sub-head, or a bold `**NNN**` bullet inside a span write-up** (766–772, 809–818 and the Community port are all written as spans). A grep for `^## Build` finds 684 then jumps to 827 and reads like 142 missing builds. They are all there. **Grep case-insensitively, and for the number rather than the word.**

**Every doc states the build it was worked forward to.** That stamp stays true forever; the table above says whether it is still current. This file has twice been found making a *stale claim about staleness* — asserting `START_HERE.md` said 427 when it said 467, then calling the whole set two sessions behind after most of it had been updated. **Re-check the table before repeating any claim in it, including this one.**

**✅ CORRECTION (9 Aug, build 639) — the in-app `CHANGELOG` was NOT rebuilt, and nothing was retired to git history.** Every revision of this file until now said the array in `<script id="cr-cl-script">` was "replaced wholesale at 574", that the old record "now exists only in git history", and that it holds "48 entries, builds 574–627". **All three are wrong.** Measured on the working tree:

- There is **ONE** `CHANGELOG` array. **Re-measured @808: 503 entries spanning 166–808** — **228** in the current shape (`{ b, d, t, s }` — build, date, title, long summary, **574–808**) and **275** in the original shape (`{ build, note }`, **166–600**), **interleaved in one descending list**. (365 / 90 / 275 at 670; 335 / 60 / 275 at 639. **Only the new shape has ever grown — the old-shape 275 has not moved since build 600.**) The block is now **246,281 characters**, which is why the fixed-window bug below mattered.
- ⚠️ **Six build numbers exist in BOTH shapes: 574, 575, 576, 577, 578, 584.** This is the parallel-branch collision this file describes in prose, now measured — the AI Field Manual lineage and the Vision suite lineage each wrote an entry under the same number. **A "duplicate changelog entry" in that range is history, not a bug. Do not de-duplicate it.**
- **574 ADDED a shape beside the old one; it replaced nothing.** The old shape kept receiving entries until **build 600**, twenty-six builds after it was supposedly retired.
- The renderer normalises both **on purpose** — `function entryBuild(e){ return e.build != null ? e.build : e.b; }` and `if(e.note != null) return e.note;`. Two shapes is the design, not drift.

So **the full 166–808 record is in the working file.** You do not need `git show aeac5e5:index.html` to read builds 428–542 — grep `index.html`. ⚠️ **But the `CHANGELOG` stops at 808 for the same reason the app stamp does** — 809–836 shipped in `visualizer/index.html` and `spark/`, which have no changelog array. For those builds `cardinal_build_log.md` is the only record, which reverses this file's usual "the CHANGELOG outranks the docs" rule. **The CHANGELOG outranks the docs only for builds that touched `index.html`.** (That SHA is still the last build-573 tree and is still correct for *measuring* 573: 104 inline scripts, 114 style blocks, 87 `window.Cardinal*`, 81% bare `var()`.) A summary of 428–451 is in the section below.

⚠️ **This error cost a build number, and it is now FIXED.** `next_build.py`'s entry regex matched the **old** shape only, so it counted an identical 275 on every branch, no branch ever looked like it added a build, every branch was skipped by the `if new or bad or edited` guard, and **branch-collision detection was dead from 574 until 9 Aug** — which is how two PRs both shipped a "build 638". It now parses **both** shapes (`ENTRY_OLD` + `ENTRY_NEW`) and folds each branch's **stamp** into the highest-seen number even when its entries parse to nothing, so the safe-number answer no longer depends on one assumption about a changelog shape that has already changed once. `--self-test` covers the dual-shape parse and **fails against the old regex**, so it is not an inert assertion. Proof it works: run against the live remote it surfaces the real 638 clash (`claude/production-handoff-taxonomy-g3fg09`) that the broken version reported as "No collisions".

⚠️ **`measure_counts.py` carried the SAME bug in its `CHANGELOG` row until build 670 — the script this file tells you to trust.** Two faults, both of them traps named elsewhere in this document: it read a fixed `s[i:i+60000]` window over a block that is now **137,284** characters (less than half the array), and it matched only the **new** `{ b:N,` shape. So it reported **82 entries spanning 585–670** — wrong count, wrong low end — and listed **599 and 600 as gaps**, which are not gaps at all but old-shape entries. *A false gap reads as lost history.* Now bounded by the block's own `</script>` and parsing both shapes; **negative-controlled against `aeac5e5`**, where it correctly reports 264 old-shape / 0 new-shape / 166–573, which is what makes the "the new shape arrived at 574" claim above measured rather than asserted.

**For session state — open items, settled decisions, handoffs — the `docs/` folder is authoritative over the skill's `references/` folder.** **And for *what shipped* since 574, the `CHANGELOG` in `index.html` outranks both** — it is the only record that survives work done outside `.claude/`, because it lives inside the file every tool has to edit. When a doc and the `CHANGELOG` disagree about whether something exists, the `CHANGELOG` wins — and it wins for **every** span back to 166, because nothing was retired out of it (see the correction above). `references/app_map.md` remains a 388-era terrain map that itself defers to `FEATURES.md`. Do not proceed from memory — build numbers, open items and settled decisions change every session. **Check their dates against the current build before trusting them**; docs written a session ago describe a different app.

---

## The prime doctrine

**Things that look missing are usually buried.** Six "missing features" on this project were fully built and merely unreachable or plain-looking — a dead handler stub, an Attach bar under the bottom nav's z-index, a punch module mounting to hidden anchors, an entire Team page in the burger menu, a `styleMounts()` inline style beating every CSS rule, and two separate Estimates screens.

**⚠ `#tab-overview`'s hide rule is the single worst offender, and it has claimed FIVE cards.** `#tab-overview > *:not(…){display:none !important;}` hides every direct child not on its allow-list. Victims: the job menu (607, found at 609), the **Scope of Loss card** (639) and — the whole insurance group — **`insCard`, `insDocsCard`, `insItelCard` (641)**. The last three each set `mount.style.display='block'` at runtime **and it never worked**: an `!important` stylesheet declaration outranks a **normal** inline style. iTel shipped at 406 into a container Keeper retired at **348**, so it had never rendered once.

**✅ All five are now ON the allow-list — verified in the shipped file @808:**

```css
#tab-overview > *:not(#acxMount):not(#cr-pp-mount):not(#solCard)
               :not(#insCard):not(#insDocsCard):not(#insItelCard){display:none !important;}
```

**The rule is still the trap; those five are simply no longer its victims.** Do not "fix" them again. **Before adding anything to that container, extend the allow-list in the same edit — and never conclude a card is dead because its renderer "sets display".** Prove it with `render_inscards.js`; jsdom cannot see this and neither can reading the code.

Before building: grep `FEATURES.md`, then grep the in-app `CHANGELOG` (it covers what `FEATURES.md` doesn't), then grep `index.html` for the feature name **and its mount anchor**. Ask "does this *element* still exist?" — not "does this code exist?" Extend, don't add. One pipeline per concept.

**Corollary: grep for the convention before inventing a mechanism.** The app already had `IC_SKIP` (per-CRM stage hiding) and `LEGACY_STAGE` (stage aliases). `PIPE_SKIP` was added by copying `IC_SKIP`'s shape. A new mechanism beside an existing one is a bug with a delay on it.

**Corollary: a name is not a contract.** `renderTeamPage()` lives in the **Resource Library** module (`cr-lib-script`) and renders the filed-material page. All 7 occurrences in the file are the Library's; the Team Directory does not use that name. Grep the block, not the identifier.

---

## ⚠ THE RECURRING ONE: light ink on the dark ground — read before any colour work

**This is the single most repeated defect on this project.** Theo has reported
it, in his own words, at 448–449, 487, 527, 557, 573, 630 and **681**. Every
time it is the same shape and every time it looks like a new bug.

**The shape.** The app's default theme is **dark** (`--bg:#09090C`). Large parts
of it were authored years earlier against a **white** page. Any rule still
carrying a light-mode ink renders somewhere between hard and impossible to read,
and *nothing in the build gates can see it* — the CSS parses, the braces
balance, the marker is present, the negative control is clean, and the screen is
unreadable.

**Why it survives so long: the partial theming pass.** Build 527 tokenised the
Schedule Board's *cards* — seven selectors, each with a computed replacement ink
— and never touched the heading above them. Thirteen of fourteen elements were
right, so the page reads as "done" and the one wrong element reads as a
stylistic choice. **A partial pass is more dangerous than none, because it
removes the tell.** `.viewhead` then sat at **1.10:1** for 54 builds.

**And check the blast radius before you celebrate.** `.viewhead` is an app-wide
class with **15** users. One un-themed base rule was failing on fifteen pages.
Ask who else uses the class *before* deciding the fix is small.

### The drill, every time

1. **Compute, don't look.** `scripts/contrast.py`, or a render. Floors: **4.5:1**
   body text, **3.0:1** large text. Theo's word for a failure is "can't read
   this" — your word for it must be a number.
2. **Prefer an existing token PAIR to a computed literal.** 527 chose `#f08a90`
   by arithmetic: correct for dark, then applied unconditionally, so it broke
   *light* at 2.30:1. `--rbe-head` (`#ffffff` / `#161616`) flips by itself and
   cannot drift. Scoping by CRM is **not** scoping by theme.
3. **Measure BOTH themes.** Half of these bugs are a dark fix that broke light.
4. **Render the real thing.** See the two rig traps below — a bad instrument
   will hand you a confident, wrong number.

### ⚠ Two traps in the MEASURING RIG itself (both cost a build)

- **Concatenating the `<style>` blocks is not "the app's CSS."** Several of the
  122 are generated **print/report stylesheets living inside template strings**,
  setting `:root{--ink:#1b1b1b}` and `body{}` for an 11pt document. Glue them
  together and a contract template restyles the app: the rig reported the page
  ground as **cream in every render** and scored an invisible heading at
  **17.61:1**. **Load the real document in Chromium and let the browser decide
  what is a stylesheet.**
- **`background-color` is not the background.** Cards here paint
  `linear-gradient`s, which are background-*images*, so an ancestor walk reading
  only `backgroundColor` sails past the card and reports the page behind it.
  Collect every ground an ancestor actually paints — colour **and every gradient
  stop** — and score against the **worst**. The naive version hid a real
  light-mode failure completely.

> **When a measurement disagrees with Theo's screenshot, the measurement is what
> you fix first.**

### ✅ SETTLED, 10 Aug (Theo, verbatim): *"I don't need to have gradient colors anywhere."*

**✅ GRADIENT TEXT IS GONE — all of it, at build 685. Do not re-introduce it,
and do not "find" it again from a text regex.** Gradient calls **274 → 237**;
clip-to-text declarations **38 → 0**.

⚠️ **The recorded count of 38 was one too many, and the extra is this file's own
counting trap.** The 38th hit is **PROSE** — a comment in `cr-nvl-styles`
explaining an earlier fix, whose `-webkit-text-fill-color` and `:transparent`
sit on either side of a newline, so any `\s*` pattern matches it. The honest
figure was **37**: 36 stylesheet rules + 1 inline `style=` attribute, confirmed
by walking **Chromium's own parsed rules**, which is the only instrument that
cannot be fooled by a comment.

**The instrument is `scripts/render_gradtext.js`** — it walks
`document.styleSheets`, scores every formerly-clipped element against its
composited ground in both themes, and **goes RED (90 failures) on the 684
artifact**, so it is a gate that has been seen to fail.

⚠️ **Two traps inside that harness, both of which produced a confident wrong
answer before the negative control caught them:**
- **In modern Chromium every `CSSStyleRule` exposes an empty `.cssRules`** for
  CSS nesting. The obvious `if (r.cssRules) { walk(r.cssRules); continue; }`
  therefore **skips every style rule without examining it** and reports a clean
  zero. Examine the rule, *then* descend.
- **Within one element the background-image composites over that element's own
  `background-color`, not the ancestor's.** Getting that wrong reads a dark
  card's semi-transparent wash as near-white and fails a passing ink at 1.05:1.
  This is trap 3 above, applied at the wrong level.

**The replacement rule, if you ever need it again** (it is what 685 used, and
it means no colour was invented): identical stops → that colour · an approved
precedent → it · else the rule's own declared `color:` fallback if it clears
its floor · else the best-contrast stop from that rule's own gradient · else a
theme-flipping token pair. 685 landed 37 sites with **zero floor failures**.

⚠️ **Removing gradient text can UNMASK an inline light-era ink.** The login
tagline carried `style="…color:#7a4a3e…"`; the stylesheet's transparent fill
had been hiding it, and with the gradient gone it painted 2.43:1 on the dark
card. Scan the affected elements for an inline `color` before declaring a
gradient-text removal finished.

The **~165 genuine background gradients are a separate, more visual call** and
want a preview before they go. **58 of them have two identical stops** — already
flat, pure overhead. **14** are gradient borders.

---

## What happened in 428–451 — the undocumented span

Reconstructed from the in-app `CHANGELOG` as it stood then (147 entries, builds 166–451) and verified against the file. **Those entries are still in `index.html`** — grep the `{ build:N, note:'…' }` shape in `cr-cl-script`; the "retired at 574" claim this file used to carry was wrong (see the correction above). Build **450 is a gap**; gaps are normal here.

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
- **`</body>` now appears 12 times** (@808), not 10 and not 11 — contract templates and generated print/share documents carry their own, and several are prose inside install-instruction comments, not markup at all. **Anchor with `rfind()`**, which still lands on the real document close.
- New `window.Cardinal*` export → `Object.assign(window.X || {}, {...})`, never plain assignment. There are **94** distinct `window.Cardinal*` names (@808).
- **`function money(` is defined ELEVEN times** — one per module, with three different signatures. A file-wide `count == 1` assertion on it is meaningless. Build 556 changed only the `cr-crew-script` one (to `money(n, cents)`) by slicing the block first and asserting the other ten survived. Same class as the `.single()` and `LABEL` traps below.
- **Grep the whole file for every occurrence of a selector before patching it.** `.acthead` had three definitions; the winner was ~39,000 lines after the two found first.

Helpers: `.claude/skills/cardinal-build/scripts/patch_lib.py` (atomic temp-then-rename writes) and `check_build.py` (the mechanical gate ladder). Also `jslex_count.py` (the lexer — see below), `next_build.py` (**asks the remote which build number is safe** — run it before the first patch and again before opening a PR; see the build-label section. ✅ **Repaired 9 Aug**: it now parses both changelog shapes and counts every pushed branch's stamp, so the per-branch stamp sweep it used to need is no longer a workaround you have to remember. `--self-test` guards the regression), `measure_counts.py` (re-derives every number in the table below), `contrast.py`, `selector_audit.py`, `token_pairs.py`, and the harnesses — `harness_showcase.js` (124), `harness_walk.js` (152), `harness_detect.js` (39), `harness_vision.js` (23), `harness_colors.js` (110), `harness_occhead.js` (42), `harness_ourroofs.js` (58), `harness_tray.js` (57), `harness_studiobin.js` (28), `harness_partners.js` (42), `harness_location.js` (24), `harness_claimguard.js` (15), **`render_inscards.js` (9 — a CHROMIUM render, not jsdom: it is the only thing that can prove an `!important` rule beating a renderer's inline `display`)**, plus `render_showcase.js`, `render_dbaddr.js`, `render_solcard.js` and `audit_viewports.js`. **Every one takes an optional path argument so it can be pointed at the previous build as a negative control** — a harness that has never been run red proves nothing.

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

**Scope the assertion to the function, not the file.** The single most repeated error here. `await signedPhotoMap(...)` appears twice — `publish()` and `openPreview()` — so asserting `1` file-wide fails a correct patch. Extract the function by brace-matching, then assert against that slice. Same trap with `LABEL`, and **it is worse than this file used to say**: there are **three** `var LABEL` maps, and the **two community ones are byte-identical** — so an anchor that reads correctly still matches twice. A file-wide regex also finds the *insurance* map (`'Lead':'Claim Filed'`) when you meant community (`'Lead':'Bid Requested'`). **634 hit this**: the assertion was correctly scoped to the `cr-cc` block and said 1, but `pl.sub()` splices **file-wide** and found 2. **Scoping the assertion is not enough if the substitution is global** — anchor on something unique in the whole file, or slice, patch and re-join the block.

### ⚠ Two assertion faults that struck repeatedly across 827–836 — both fail CORRECT code

**1. An assertion pinned to PUNCTUATION.** `'if selections.get("_points"):'` stopped matching the
moment the dispatch legitimately became `... or selections.get("_box"):`, and
`"masks = exclusive(masks)"` broke when the call started returning a tuple. **Three of my own
assertions failed correct code in one build.** Assert the **contract over a region** — that the
dispatch routes this key to that worker — never the spelling of one line.

**2. A test that silently LOSES a check and stays green.** `test_stale_worker` generated its checks
from the mode keys it found in the page; when `selections: { _points: … }` became
`queueTapJob({ _points: … })` the regex stopped matching, coverage fell **15 → 14**, and nothing
went red. *A smaller number nobody reads.* **Any test that derives its own check count needs a
FLOOR** — assert the minimum set you know must exist, so shrinking coverage is a failure.

**A related one, the same family: a check that CANNOT fail.** Build 816's burst test passed at
**zero jobs from six clicks**, because the duplicate guard short-circuited before the lock was ever
reached. And two of `gate_807.mjs`'s assertions passed **vacuously** — one read `innerText` from
inside a closed `<details>` (always `""`), the other used `\b` in a plain regex literal, where it is
an escaped backslash and not a word boundary, so it could never match anything. **A check that
cannot fail is worse than no check.**

**Prefer self-computing assertions** over hardcoded numbers, which are usually read off an already-patched tree:

```python
assert count(patched, VALUE) == count(orig, VALUE) - 1   # "exactly one changed"
```

**Print what your extractor captured** before asserting on it. An extractor that swallowed 2,271 characters returned empty counts, and empty looks like a legitimate zero.

**When a count contradicts you, suspect the regex.** A pattern using `[^;\n]*` cannot see an expression split across lines — that nearly produced a false "locks scroll and never releases" bug report against correct code.

**Watch for foreign namespaces inside your pattern.** A sweep for same-origin `/api/` routes returns `/api/staticmap` and `/api/js` — both are `maps.googleapis.com/maps/api/...`, not Cardinal routes. Two of three hits were false. Bound the pattern to the origin you mean.

### Current measurements — the **@808** column is 16 Aug 2026

**Declaration counts are SITES, not distinct names, and the two differ by ~2× because every token is declared once per theme.** An earlier revision of this file quoted 64 `--ccm-*` and 154 `--rbe-*` — those were sites. Count distinct names and you get 32 and 77, which looks like tokens were deleted. Nothing was deleted. Both are given below so nobody "corrects" the right number.

**Re-measured by `scripts/measure_counts.py`, which was validated before it was trusted:** run against the build-573 tree (`git show aeac5e5:index.html`) it reproduces this document's recorded 573 column exactly — 104 / 114 / 87 / 641 `--rbe-*` refs / 81% bare. So where a number below differs from the retired @627 column, the app moved; the pattern did not. **Re-run it rather than re-deriving these by hand** — it prints every row below, splits SITES from DISTINCT, routes the scroll lock through the lexer, and shows what a naive count would have said.

⚠️ **The rows below describe `index.html` ONLY.** They do not count `visualizer/index.html`,
`studio.html`, `supplement.html` or `popup.html`, all of which have their own inline scripts,
styles and palettes. Point the script at those files separately; do not add their numbers to these.

| Thing | Value | Measured | How it was measured |
|---|---:|---|---|
| Inline `<script>` blocks | **113** | **@808** | `<script>` tags without `src=` — was 106 @627 |
| `<script>` tags total / external CDN | **116** / 3 | **@808** | supabase-js@2, chart.js@4.4.3, papaparse@5.4.1 — unchanged since 482 |
| `<style>` blocks | **135** | **@808** | was 118 @627. Seventeen added across 628–808 — most of them the drawn-icon sweep and the client-profile rebuild |
| `<style>` blocks with an `id` | **127** | **@808** | was 111 @627 |
| `window.Cardinal*` exports | **94** | **@808** | distinct names — was 90 @627 |
| **`.observe(document.body …)`** | **45 real / 46 hits** | **@808** | **⚠ THE COUNTING METHOD THIS FILE USED TO RECOMMEND IS WRONG — see the correction below the table.** 46 bare hits; **1 is prose** (a comment in the main block that says "~50"); the other **45 are real calls**, across **44 identified `<script id=>` blocks plus one un-id'd block** |
| Modules writing the global scroll lock | **13** | **@808** | lexer, CODE hits only — **35 CODE sites, 0 in strings, 0 in comments** (a bare regex says 37). **The no-14th-writer rule has now held across 234 builds**, 574 → 808, through the Supplement Desk, the Production rebuild and the whole client-profile rebuild |
| `normStage()` copies | 6 | **@808** | 1 whitelist + 5 delegates — unchanged, and the whitelist is still the nine stages quoted in the invariants section |
| `.single()` / `.maybeSingle()` | **55 / 6** | **@808** | was 45 / 6 @627. **`.throwOnError(` is still 0**, which is why `.single()` never throws here. The ten new sites arrived with the supplement/scope/commissions arc. **There is no migration backlog** — see the invariants section |
| `--ccm-*` decl sites / distinct / refs | 64 / 32 / **162** | **@808** | sites and distinct names unchanged since 557; refs 137 → 162 as Community ported to the black card (705–) |
| `--rbe-*` decl sites / distinct / refs | **167 / 76 / 739** | **@808** | refs 694 → 739. **Sites went DOWN by two and distinct by one** — that is the light-mode repair work retiring a token, not tokens going missing |
| `--lb-*` decl sites / distinct / refs | 22 / 11 / **87** | **@808** | Resource Library, 77 of 87 refs carry a literal — unchanged since 451 |
| `--crw-*` decl sites / refs | **0 / 95** | **@808** | Crews (547+). **Declared nowhere; all 95 refs are `var(--crw-x,#literal)`.** The fallbacks *are* the palette. Deliberate, and immune to the 448–449 class by construction |
| **`--sh-*` decl sites / refs / with fallback** | **1 / 180 / 180** | **@808** | the Showcase (574+). **All 180 references carry a literal fallback.** ⚠️ A broad `var\(\s*--sh-` says **182** — the two extra are the module's own banner prose describing the pattern as `var(--sh-*,#literal)`. The comment-pollution trap, in the one direction that flatters you |
| **`--occ-*` sites / distinct / refs** | **14 / 12 / 150** | **@808** | OC Colors (615+). Twelve names; **14 sites now, so two are declared twice** — check before assuming a light twin was added. Single-theme Blackout by design. Do not wire it to `rb-light` |
| `--cr-*` decl sites / distinct / refs | **177 / 21 / 603** | **@808** | **Five modules share one identical palette** — coach, pricing, claims, adjusters (all themed at 573) and **`cr-bpa-script`, which is not**. See the theming section |
| `var()` refs total / with a fallback | **4,167 / 1,457** | **@808** | **65% are bare** (1,248 of the 1,457 fallbacks are a hex). **Still improving: 73% @627, 77% @594, 81% @573, 88% @482.** See 448–449 |
| Surviving legacy gold hexes | **27** | **@808** | `#c9a227` ×22 + `#b8860b` ×**5** — was 33 @627. **The `#b8860b` drop from 11 to 5 is build 685 removing gradient-clipped text**, whose fallback colour it was. The three dead values (`#d4a017`, `#f5d061`, `#8a5a00`) are still at **0**, asserted |
| `#c8202e` (cardinal red) | **352** | **@808** | was 341 @627, 327 @594, 270 @573 |
| `</body>` | **12** | **@808** | **not 10 and not 11.** Several are prose inside install-instruction comments or generated print documents, not real markup. `rfind()` still lands on the real document close |
| `api/*.js` serverless functions | **29** | **@808** | was 26 @627. Net +3 across a lot of churn: `abc.js`, `commissions-digest.js`, `hover.js`, `sol.js`, `supplement.js`, `ai-status.js` and `companycam-status.js` arrived; **`design.js` was deleted at 807 and came back at 822** as the Visualizer's second engine |
| `*.sql` at the repo root | **62** | **@808** | was 32 @627 — thirty migrations in 180 builds. All applied by hand; `.vercelignore` blanket-excludes them so none is ever served |
| `.html` at the repo root | **17** | **@808** | was 16 — `supplement.html` (668). **10 excluded as scratch, 7 ship on purpose.** `visualizer/index.html` is NOT among them; it is a folder, deliberately |

### ⚠ CORRECTION @808 — the observer count, and the pattern this file told you to use

Every revision since 684 has said to count body observers with `\)\s*\.observe\(document\.body`,
"to skip the comments that quote the pattern." **That pattern undercounts, and it undercounts in
two independent ways.** Measured four ways on the shipped file:

| method | answer | why it is wrong |
|---:|---:|---|
| `grep -oE '\)\s*\.observe\(document\.body'` | **40** | **`grep` is LINE-BASED.** `\s` never matches a newline, so every observer whose `)` sits on the previous line is invisible. Six of them do |
| Python, same pattern, `re.S` | **42** | fixes the newline, still wrong — see below |
| bare `\.observe\(document\.body` | **46** | includes 1 comment |
| **read what each hit is** | **45 real + 1 prose** | ✅ the honest answer |

**The three the chained pattern misses are not comments — they are real observers held in a
variable.** `observer.observe(document.body …)`, `bodyObs.observe(…)` and one `mo.observe(…)`.
The pattern assumes every observer is constructed and observed in one chained expression. Most
are; three are not, and those three are as awake as the other 42.

**So the pattern was excluding real code to avoid a comment — and there is only ONE comment.**
Count bare, then read the handful of hits and drop the prose. That is what
`measure_counts.py` now does, and it is cheap: 46 hits is a screenful.

*This is the file's own rule — "print what your extractor captured" — biting the file itself. A
pattern chosen to exclude noise excluded signal, and because the wrong number was **smaller** it
read as reassuring progress (46 → 42) rather than as a defect.*

**The `--lb-*` row is a correction to a correction, and it is instructive.** The previous revision said *"the 22 recorded at 451 does not reproduce — `--lb-[a-z-]+\s*:` finds 14."* **22 reproduces exactly.** That regex has no `0-9` in its class, so it silently dropped `--lb-ink2`, `--lb-line2`, `--lb-surface2` and `--lb-surface3`. The file's own rule — *when a count contradicts you, suspect the regex* — caught a wrong "correction" that had been sitting here as fact.

**The `--sh-*` row is the same lesson from the other side.** The narrow pattern `var\(\s*--sh-[\w-]+` finds 180; the broad `var\(\s*--sh-` finds 182. The two extra are the module banner's own prose — `every colour is var(--sh-*,#literal)` — and `*` is not a word character, so the narrow pattern skipped them by luck rather than by design. **Both counts are defensible and one is right.** Print what you captured.

---

## Gates — run every build, in order

```bash
python3 .claude/skills/cardinal-build/scripts/check_build.py index.html \
    --prev <previous> --marker '<the string your fix added>'
```

Covers per-block `node --check` on all inline scripts, tag balance, CSS brace balance, duplicate `<style id=>` detection, the dupe-API check, build-label bump, marker present in the artifact you wrote, and the **negative control**.

**It is green on build 808 right now** (exit 0, re-run 16 Aug 2026), reporting: 113 inline scripts parse · 116/116 script tags · **135/135** style tags · CSS braces balanced · no duplicate style ids · no double-assigned `window.Cardinal*` · app stamp `v2026-08-14 build 808` · 38 version strings, 19 distinct builds. Start from green; if your first run is red, you broke it.

⚠️ **`check_build.py` sees ONE artifact, and there are now six.** It does not see `studio.html`, `popup.html`, `supplement.html`, `ai-field-manual.html` or **`visualizer/index.html`**. When you touch any of them, parse their inline scripts separately (`node --check` on each block). This is the convention, not a courtesy — and it matters more now than at 627, because **builds 809–836 never touched the file `check_build.py` gates.**

**Build 1055 is a worked example of this: it is `supplement.html` ONLY.** `index.html` stayed at 1054 and `check_build.py` had nothing to say about the build. Its two inline scripts, tag balance, CSS braces and duplicate style ids were parsed separately — and each of those five artifacts now needs its own stamp bumped, because none of them is the one `check_build.py` gates.

### The gate inventory has outgrown a list — the convention is what to learn

`scripts/` now holds ~90 gates and harnesses. Naming tells you what a file is:

| Prefix | What it is | Runs in |
|---|---|---|
| `check_build.py` | the mechanical ladder, every build | — |
| `gate_NNN.mjs` | **the per-build gate, named for the build that added it** (721 → 823) | Playwright / Chromium |
| `harness_NNN.js` / `harness_<name>.js` | functional assertions on a surface | jsdom |
| `render_<name>.js` | **a real Chromium render** — the only thing that settles a colour, an `!important`, or whether a control is wired | Chromium |
| `gate_tint.py`, `gate_graphs.py`, `spark/test_*.py` | **the Spark worker's gates** — pure Python, no browser | Python |
| **`gate_stack.mjs`** | **the ACCUMULATION gate — standing, not per-build.** Flags a rule this build ADDED that wins a property on a real element while the PRE-EXISTING rule it beat is still in the file. That is the moment a build out-specified instead of editing, and it is why 148 style blocks only ever grow. `--selftest` proves it fires and stays quiet; exempt a deliberate override with `--cr-stack:"reason"` on the winner (**two** dashes — one is dropped at parse time) | Chromium |
| **`gate_types.py`, `gate_dupes.py`, `gate_a11y.mjs`** | **the three RATCHETED standing gates — a baseline per code / name / rule, which may fall but never grow.** `gate_types` is tsc's TS2304 over the CONCATENATED blocks with a globals list generated from the file's own `window.X=` assignments — **it is this repo's cross-block `no-undef`, so do not build a second one**. `gate_dupes` watches a name gaining a definition. `gate_a11y` is axe-core over the sentinel's own state walk: names, roles, labels, structure — **contrast is deliberately OFF there**, because the sentinel's INK owns it and two instruments answering one question in different numbers is how a real failure gets argued about. Existing debt is baselined so it blocks nothing; a NEW violation is red the build it lands. ⚠️ **Run them EVERY build** — run at merge time on a twelve-build arc, every finding becomes archaeology (30 Aug) | tsc / Python / Chromium |
| `drive_lifecycle.mjs`, `e2e_drive.mjs` | the full E2E lifecycle drive (773) against a recording mock | Chromium |

**Do not read the whole folder.** Find the newest `gate_*` touching your surface, run it, and copy its shape. **Every one takes an optional path argument so it can be pointed at the previous build as a negative control** — a harness that has never been run red proves nothing.

⚠️ **`BUG_CLASSES` class 37 — "a negative control that CRASHES instead of reporting red" — struck FIVE times in one session and is still striking.** The shape is always the same: the control tree lacks a symbol or a selector the new gate names, so the run dies with `AttributeError` / `undefined.match` / a 30s Playwright timeout **before printing a line**, and a crash reads as "not green" rather than as "proved nothing". Two standing fixes: read every new symbol through `getattr(mod, 'X', default)` on the Python side, and wrap interactions in a `tryClick(sel, why)` that records a failure and carries on. **And `git fetch` before building a control tree** — build 833's first control silently ran against a stale `origin/main` two builds old and reported the previous run's numbers.

Then a **jsdom functional harness** on the changed surface. Recipe in `references/gates.md`. Where practical, go further: extract the *shipped* function text and execute it against real data shapes — not a re-implementation.

**Never commit on red. Never hand over with a failing check.**

### ✅ SETTLED 27 Aug 2026 (Theo) — when the sentinel HOLDS a merge, and when it does not

**Run `sentinel.js` on every build that touches a screen. Hold the merge for it only when
the build is ABOUT colour, theme or layout.** Everything else — wiring, notifications, an
`/api` route, a doc fix — merges on the other gates when they are green, and anything the
sentinel finds is carried into the next build.

He asked what it had actually caught before deciding. **Four real catches in ~156 builds
(933 → 1089), and all four were colour/theme/layout builds:** 939 (my own 3.09:1 label,
caught before it shipped, on the readability build), 959 (a layout rule that never won on
any of the 30 elements it matched — every purpose-built assertion stayed green), 1064 (the
photo editor's tool bar at 3.27:1, a screen used on a roof at midday), 1066 (the album's
client name at 1.07:1 in light). That is the whole basis for the rule: it earns its
15-minute hold exactly where it has ever paid.

⚠️ **"Do not block" is NOT "do not run" and NOT "do not report."** Full write-up, with the
costs that were put to him before he chose — a 1-in-40 signal rate on full sweeps, four of
its own checks having been wrong, and its structural blindness to loading states and to
anything one click past where its walk stops — is in the skill's Gate 0 section.

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

⚠️ **`openEditor` is defined FIVE times** (22931, 33672, 35742, 42822, 44272 @808 — **line numbers
drift every build, and these five moved 3,500–4,900 lines between 627 and 808**; grep, don't trust
them. The count of five has held).
The one `CardinalEstimates` exports is the **last**, and it takes `(project, existing)`. A name is
not a contract.

**Both newer full-screen views are registered — do not re-flag either as a nav trap.** Re-verified
@627 by brace-matching `hideAllViews()` (7,145 chars) rather than reading the first screenful:
`cr-show` (574), **`cr-occ` (615)**, `crewsView`, `cr-est-view`, `cr-sf`, `cr-pb` and the
`CardinalEstimates` close are all in it. ⚠️ A 4,000-character window over that function finds only
three of them and reads like four missing registrations — **brace-match it, or you will file four
false bugs.**

⚠️ **`cr-des` is NO LONGER one of them, and its absence is correct.** Build 807 deleted the old
in-app Exterior Designer whole and unpicked **all five** of its wirings: the `hideAllViews()` entry,
the `navRestore()` case, the `__crNav` wrap, `BLACKOUT`, and the hub handler. **That five-site list
is the checklist for retiring any full-screen view** — a view removed from `hideAllViews()` alone
leaves four dangling references. The Visualizer that replaced it is **not in `index.html` at all**,
so it needs no registration and must not be given one.

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

**45 `document.body` observers across 45 blocks — do not add a 46th without written cause.** Each module watches the body to know when its mount appeared or navigation happened; that is how a no-framework app coordinates, and an idle observer costs nothing. **The count is a risk multiplier, not a cost**: a runaway repaint (567/569 were 388 writes/sec) wakes ALL of them, every frame. Before adding one, ask: can an existing module's observer host the check? Is a plain event enough? **An observer that REWRITES the DOM from inside its wake is the dangerous kind** (metallicize was one; removed at 682) — never add that kind at all.

**The census @808, re-derived by mapping each hit to its enclosing `<script id=>`** — 44 named blocks plus one un-id'd, one call each:

> cr-adj · cr-ahc · cr-banner · cr-bpa · cr-bulk · cr-cc · cr-cct · cr-ch2 · cr-ci · cr-claims-fx · cr-comstage · cr-cpartners · cr-csv · cr-ctfx · cr-e2c · cr-eaf · cr-epub · cr-ess · cr-est · cr-est-fix · cr-gmap · cr-hd2 · cr-health · cr-home-cleanup · **cr-hub-bridge** · cr-insstage · cr-lac · **cr-lg** · cr-lnav · cr-lr · cr-nbid · cr-pb · **cr-perf** · cr-pnc · cr-po · cr-portal · cr-pp · cr-recents · cr-rf · cr-sc · cr-search · cr-sf · cr-sp · cr-wtd · *(one un-id'd block)*

**What moved since the @684 list, and why the number barely did.** Gone: `metallicize` (682), `cr-cprop` and `cr-comclient` (709, retired with their cream surfaces), `cr-home-btn` and `cr-pme` (757, when the header's own gold home made both floating buttons redundant — cr-home-btn's was a `subtree:true` observer, the expensive kind), and `cr-sc-script`'s second call. Arrived: **`cr-hub-bridge`, `cr-lg` and `cr-perf`**. **A flat count concealed five removals and three additions.** Diff the census, not the total.

⚠️ **Do NOT count these with `\)\s*\.observe\(document\.body`, which this file recommended until now** — in `grep` it answers 40 and in Python 42, and both drop real observers held in a variable. Count bare and read the hits; the correction and its four-way measurement are under the measurements table.

**One global scroll lock, 13 modules, no reconciler.** `document.body.style.overflow` is written by 13 independent modules (**13 modules / 35 CODE sites re-verified with the lexer @808**, 0 in strings, 0 in comments; a bare regex says 37). It leaks on any early return or throw between lock and release. This class has recurred three times. Do not add a 14th writer without checking `BUG_CLASSES.md` — **the no-14th-writer rule has now held across 234 builds, 574 → 808**: the 108 KB Showcase (574), OC Colors (615), the Studio tray (627), the Supplement Desk (667–673), the Production rebuild (766–772) and the whole client-profile rebuild (788–804) each added **zero**. One extra CODE site appeared without a new module, which is the healthy direction. Block 1 carries a deliberate self-heal (`if(... === 'hidden') ... = ''`) — that comparison is a non-assignment hit in the count, and it is not a bug.

**Nothing is set below 11px — a floor, established at build 1081 across 519 declarations.**
The app had type as small as **6.5px**; 11px is the smallest size Apple's own interface uses
for a caption, and Theo works off a phone, on roofs, in daylight. ⚠️ **Sizes live in TWO
declaration forms and the shorthand is the bigger half** — `font-size:` carried 158 of the
sub-floor sites, **`font:600 10.5px …` carried 361**, and this file holds 1,364 `font:`
declarations against ~1,015 `font-size:` ones. **A sweep of the longhand alone reads the
minority.** (BUG_CLASSES 70.) Two things are deliberately outside the floor and must stay
outside it: **`font-size:0`**, which means *there is no text here* — a control collapsed to a
pure `::after` icon, a pipeline sphere flattened to a bar — pinned at exactly two sites; and
**every `pt` size**, which is a print document (168 of them, smallest 6.8pt) and has nothing
to do with a phone. `gate_1081.mjs` holds the floor, and it holds it by walking **Chromium's
own parsed CSSOM** rather than the file, so neither a comment nor a shorthand nor an
ungenerated print stylesheet can move the number.

---

## The build label — there are 38 of them, and only one is the app version

**Two separators, and a regex that assumes one will miss the other.** Module banner comments use a middot (`v2026-07-22 · build 148`); footers and the app stamp use a space (`v2026-08-14 build 808`). Counting only the space form misses every middot banner.

`re.finditer(r"v(2026-\d\d-\d\d)\s*(?:·|)\s*build\s+(\d+)")` is the honest count, and it has grown a lot:
**38 strings · 19 distinct builds (95, 146, 148, 404, 574, 620, 623, 650, 719, 752, 756, 767, 768, 795, 797, 799, 800, 804, 808)** @808 — was 24 / 8 at 627. **Eleven new frozen banner stamps in 180 builds.** Only the app stamp moves; every other one is a module banner that froze at that module's last restyle. **The growth is expected and is not drift** — but it means a gate comparing the *set* of labels is now comparing 38 things, 37 of which never change.

| Label | Count | Where | Meaning |
|---|---:|---|---|
| `v2026-08-14 build 808` | 1 | nav menu `<div data-cr-footer>` | **the app version — the only one in rendered markup, and the only one to bump** |
| 650, 719, 752, 756, 767, 768, 795, 797, 799, 800, 804 | 1–2 each | module banners + `.cr-*-footer` templates | frozen at each module's last restyle — **do not bump these** |
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
- **`currentBuild()` returns the live build (808 as of this writing)**, not 406. It no longer falls through to scanning `body.textContent` and matching a `(build 406)` string inside CSS source. What's New works again — and 684 reopened it for the whole team, not just admins.
- **`buildTag()` returns the live `build NNN`**, so error reports carry a build number.
- **`CHANGELOG` is current through 808** and holds the full 166–808 record in two interleaved shapes. ⚠️ **The line that used to sit here — "the array was rebuilt at 574 and older entries live in git history" — was wrong and is corrected in full above.** Its gaps (450, 581–583) are normal, not defects.

One attribute, three silent failures, all closed. If you find yourself about to "fix" any of these, re-measure first.

---

## The Resource Library (builds 442–447, 451) — now documented in `FEATURES.md` too

A reference-material library with an AI assistant. Nothing in the doc set mentions it.

- **Front end:** `<style id="cr-lib-styles">` + `<script id="cr-lib-script">` (~28 KB), the last block in the file. Mounts into **`#resourceLibraryView` only**, as a fixed overlay. Exports `window.CardinalLibrary` via `Object.assign` (`open`, `reload`).
- **Back end:** `api/librarian.js`. ⚠️ **NO LONGER GEMINI — it moved to Claude at build 806** and calls **`claude-opus-5`** through `@anthropic-ai/sdk`. Same signed-in-session gate as before. **`ANTHROPIC_API_KEY` must be set in Vercel env**; `GEMINI_API_KEY` stays, because four other routes still need it, and `OPENAI_API_KEY` is **no longer read by this route**.
  - **The reason was never cost** — it was priced first, on the 21 questions the crew has actually asked, by running the *shipped* handler against a stubbed transport: ≈5,803 chars in / 2,221 out, **≈$1/month**. What the switch bought is reliability: the free Gemini tier **503'd about one call in four** and took 6–14s when it answered, which is why a four-rung fallback ladder had grown behind it. The ladder is gone.
  - **The answer shape is now ENFORCED** by `output_config.format` rather than requested in prose, which retired the ```-strip — a latent corruption bug, since any answer whose `body` legitimately contained a fence was mangled before `JSON.parse` saw it.
  - **Every prompt fix from 466/471/508/510/512 is byte-identical and asserted.** The transport changed; the prompt did not.
  - ⚠️ **One narrowing, on a path with zero traffic:** Gemini took any mime type; Claude reads PDFs and photographs, so anything else now gets a 400. Measured before shipping — all 32 `library_items` rows are `kind='note'`.
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

**✅ Re-audited 16 Aug and the table is still complete — those are the only three DB writes in the file.** ⚠️ **A grep for `.delete(` in `studio.html` says FIVE.** Three of them are `Map.delete()` / `Set.delete()` on the in-memory `TRAY` and `PICKED` collections, and one is a *comment* explaining that the API deliberately mirrors `Set`. **One is the real PostgREST delete.** Read them; a raw count reads as four unrecorded writes.

**Studio reads five tables, and two of them are newer than this section:** `photos`, `studio_photos`, `studio_tray`, and **`studio_private` / `studio_private_events`** (the private lens, `studio_private_objects_rls.sql`). Both private tables are **read-only from the browser** — no write site exists for either.

### The DGX Spark — `spark/`, Theo's own hardware, excluded from deploy

Offline tooling, never fetched by the app: `fetch_companycam.py` (**archive the actual photo bytes** — the Supabase mirror is metadata only; stop paying CompanyCam and every CDN link in it dies), `hail_review.py`, `strip_exif.py`, and `push_studio_tags.py` (joins the Spark-side tagger's `studio_tags.jsonl` against the manifest and upserts `studio_photos`). `STUDIO_TAGGING.md` is written to be handed to the Spark-side agent as-is. The standing rule from `DGX_SPARK_ILLUSTRATIONS.md`: **generate on the Spark, review by eye, upload through paths that already exist — no new endpoint, no live dependency.**

**Since 807 the folder is also a live system, and the rule survives intact — by construction.**
`visualizer_worker.py` runs as the **`cardinal-visualizer` systemd unit on `spark-3c4a`** and
**polls `design_jobs` outbound only** — no tunnel, no inbound port, no service key in any browser.
Nothing in any shipped artifact fetches the Spark; the Visualizer writes a row and reads it back,
so **a job sitting at `queued` because the Spark is off is correct behaviour, not a fault** (808
exists to *say* so). Operational notes:

- It runs from **`/home/cardinal2023/ComfyUI/venv/bin/python3`**, not `/usr/bin/python3` — system
  Python is missing the deps. `spark/VISUALIZER_SETUP.md` is the setup record.
- Restart and read: `sudo systemctl restart cardinal-visualizer && journalctl -u cardinal-visualizer -f`.
  **The startup line carries `WORKER_BUILD`** — that is how you learn which code is running.
- The ComfyUI graphs are checked-in JSON (`points_api.json`, `segment_api.json`,
  `regions_api.json`, `inpaint_api.json`). ⚠️ **A node is found by `_meta.title`, never by id** —
  ComfyUI renumbers on edit, which is why the sampler is titled `CARDINAL_SAMPLER` and
  `gate_graphs.py` asserts on the title.
- **13 `spark/test_*.py` files are its gates**, pure Python, no browser. ⚠️ **`test_points` calls
  `run_points_job` directly and so has never exercised the ROUTE** — a mode key that never reaches
  the dispatch is refused by the very worker that handles it, with every gate green. **Test the
  route, not just the function.**

### The Pop-Up Roof — `popup.html` (594 put its link on the landing screen)

A sixteen-spread interactive pop-up book of how a roof gets built, client-facing, served at **presentation.cardinalroster.com** and **presentation.cardinalrenovations.com** (`vercel.json` host rewrites → `/popup.html`). The preserve-3d pop is proven on Theo's real iPad. Settled decisions, recorded in `HANDOFF.md` and not to be re-litigated: **it is an install book, not an insurance book** (storm damage, the adjuster and the tailgate Number were deleted on Theo's verbatim instruction); the house is THE T; Onyx is the OLD roof and Duration BROWNWOOD goes on; "tarps, not tractor"; the bird ends every spread at `translateX(0)`. Source material is the three `ROOF_JOURNEY_*.md` docs. The ambient sound bed was redesigned 4 Aug and is **unverified by ear** — Theo's ears are that gate.

---

## Builds 595–636 — the span this file had no narrative for

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
| **628–629** | The tray splits into **bins** (showcase / workmanship, then colours + a `trade` facet) and the Hall of Fame gains the picker it never had — see below | `studio.html` + `cr-show-script` |
| **630** | The colour photo grid, fixed in six places at once from one iPad session: **multi-select, the 10 MB refusal, delete, full screen + swipe, the caption, the scroll** | `cr-occ-*` |
| **631** | **Optimise** — repair in place what 630 could only fix on the way up. ⚠️ It re-encoded the ORIGINAL, which a drone photo already is; that is why it only managed "39.9 down to 29mb". Superseded by 633 | `cr-occ-script` |
| **632** | **The Studio Archive button had never been wired** — `setupMode()` returned inside its `isShowroomHost()` branch before any listener attached, so three controls were drawn and dead and `archived_at` was NULL on all 60,503 rows. Plus **bin several sites** | `studio.html` |
| **636** | **One location card, the Google one.** A client profile carried TWO maps on different stacks — a Google static block injected by `maybeInsertProfileMap()`, and the Location card's **Leaflet + Nominatim + Esri** map, which is the one that said "Could not pin this address". ⚠️ The card could not simply be deleted: it holds the only address text and the only `#acxEdit2` pencil, and **Community has no Google card** — `adoptLocation()` MOVES this node. `qiLoadLeaflet()` survives for a second Leaflet map elsewhere | main block + `cr-gmap-script` + `cr-keeper2-script` |
| **635** | **The prospects mask bypass.** `prospects()` always masked, so the LIST was never leaking — but Edit rendered unconditionally and its handler calls `getRaw()`, the unmasked lookup. One tap opened the real record. Button hidden + CONFIDENTIAL chip + **`openEditor` refuses to unmask for a non-privileged caller**, which is the actual fence | `cr-cpartners-script` |
| **634** | **Two defects in one screenshot**: Community Partners threw for every non-admin (a masked row renders no buttons and they were wired unconditionally — the throw killed that row *and every row after it*), and client error reports were rendering as job-thread notes (`THREAD_SKIP`) | `cr-cpartners-script` + `cr-cc-script` |
| **633** | **`THUMB` (640px)** — the colour grid tile is 269.5 CSS px and was being handed the 1400px `DISP` copy. Optimise now writes only the missing thumbnail, from the display copy, and never touches the original. See below | `cr-show-script` + `cr-occ-*` |

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

### 633 — one rendition cannot serve two surfaces

`cr-show-script` declares **three** renditions together: `FULL` 3840px/q0.92 (the lightbox and the Showcase pinch), `DISP` 1400px/q0.82 (the Showcase compare card, 612 CSS px) and **`THUMB` 640px/q0.80 (the Colors grid tile)**. The tile is **269.5 CSS px — measured in Chromium at Theo's 1194px iPad width**, and it had been loading `DISP`: 4.8× the pixels it can show, at a measured 663 kB average across 63 photographs.

⚠️ **The fallback order is load-bearing, not defensive.** Three eras of photograph share that grid — pre-630 (original only), 630–632 (original + `-d`), 633+ (original + `-t`) — so it signs all three paths in ONE round trip and takes `-t → -d → original`. Remove the fallback and every existing photograph vanishes.

**Optimise changed job at 633, and 631's version was my error.** 631 re-encoded the original to 3840px, which a drone photo already is — a re-encode, not a resize, and the source of *"39.9 down to 29mb"*. 633 targets the missing **thumbnail**, re-encodes **from the display copy** (663 kB fetched per photo instead of 3.5 MB) and **never touches the original**, so a failed run costs nothing. The toast reports what the page will load next time.

**The white boxes were `--occ-card:#FFFFFF` showing through a lazy load**, not a fault. `#cr-occ .occ-ours img` now carries the dark ground. Confirmed in Chromium — 632 computes `rgba(0,0,0,0)` over a white figure, 633 computes `rgb(35,31,32)`. **A render answered this; 347 assertions could not.**

Two hardenings shipped with it: **`shrinkOne(file, name)` is the single place that checks the image toolchain** (`window.CardinalShowcase` appears exactly once in the module, asserted), and **`signMany()` keys by the path the API answered for, not by array position** — latent since 630, and 633 is the build that would have triggered it by asking for a third path absent on every photo.

---

## Builds 637–836 — the insurance loop, the icon sweep, two rebuilds, and a second application

*Written 16 Aug 2026. `cardinal_build_log.md` has an entry for every build here — this is the
orientation map, not the record. Two hundred builds in eight days. Nothing below is new work.*

**The arcs, in order. Read the row before you grep for a feature — most of these ended somewhere
different from where they started.**

| Builds | Arc | Where |
|---|---|---|
| **637–649** | **The insurance loop closes.** A claim with nothing in it stops being a claim (638); the Scope of Loss card was hidden by CSS all along (639); insurance documents move under Documents (644); the info lives on the claim and **only** there (645); the **claim bridge** turns a read scope into a tracked number (646–649) | claims + `cr-ins*` |
| **642** | ⚠️ **`/api/notify` was PUBLIC and sending everything twice.** Security fix — treat any new `/api` route as public until you have read its gate | `api/notify.js` |
| **650–652** | **Money in, commissions out** — `commissions` wired end to end, Finance as a source, Theo's weekly owed email (`api/commissions-digest.js`, a **second Vercel cron**, Fridays 11:00 UTC) | money |
| **653–666** | **The CR Audit's menu, worked down by item id** (CR-AUD-003/004/007/009…), then the **scope reader** made honest: a failed read says *which* failure (661), the retry cannot eat the diagnosis (662), history is never lost (665) | audit follow-ups |
| **667–673** | **The Supplement Desk** — `supplement.html`, the fifth shipped artifact. Studio's pattern again: public file, own sign-in, `is_cardinal_admin()`, `api/supplement.js` enforcing admin server-side. 671 is *"the Desk, made honest: nine repairs before the next feature"* | `supplement.html` |
| **670** | **Code authority** — building-official letters kept by jurisdiction (`code_letters.sql`) | insurance |
| **674–675** | A **Hover report** fills the measurements (`api/hover.js`); Insurance Clients leads the hub | |
| **676–678** | **The app stops opening on a screen of scattered emoji**, opens from the phone instead of downloading itself, and the retired welcome screen stops flashing up | landing / PWA |
| **681, 686–699** | **The emoji sweep — emoji replaced by DRAWN icons**, 28 nav rows at 686 alone, then Tools, client-page headings, page headings. **682 removed `metallicize`**, the DOM-rewriting observer | app-wide |
| **685** | **Gradient text is gone — 37 sites, one solid colour each.** See the settled-decision section above | app-wide |
| **689, 693–694** | Calendar titles were **1.06:1**; client cards go obsidian; **Sales Floor gets a light theme** and the light/dark switch comes back | theming |
| **700–712** | **Community ports to the black card** — Theo's option (a), picked 11 Aug. Phased: payments door (705), Partner & Property (706), then the cream surfaces retired with their observers (709) | `cr-cc-*` |
| **766–773** | **Production, rebuilt.** Cardinal Steel; landing = boxes + mini calendar + day agenda; full-screen five-week calendar one tap deeper; the **punch-out CARD** with trade templates, note-gated steps, five photo slots and a messenger. **No money anywhere on Production** — settled. Then **773, the full E2E lifecycle drive** (`drive_lifecycle.mjs`) | production + `punch_steps.sql` |
| **774–789** | **ABC Supply becomes Suppliers** (688) and you can build an estimate straight from its catalog (774); **CompanyCam photographs into the client Photo Album** (777–778); the contract that was unusable at a client's house (781); deposits that add up (785) | estimates / contracts |
| **788–804** | **The client profile, rebuilt — phone-first.** Cover photo retired, the card becomes a band, Overview stops alternating slabs, Location goes edge to edge and back, Job Details laid out like the AccuLynx card, Payments card retired, the portal switcher moves into the burger menu, the search bar folds into a header lens. ⚠️ **Most of these are deliberately phone-scoped; 799 deliberately is not.** Check the media query before assuming a change is global | client profile |
| **805** | ⚠️ **The showroom door was rendering the CRM behind it.** Fixed — **and the build is the evidence that a hostname check inside one big file cannot deliver separation.** It stops the CRM being *shown*, not being *downloaded*. This is the whole argument for 807 | landing |
| **806** | **The librarian moves off Gemini onto `claude-opus-5`** — see the Resource Library section | `api/librarian.js` |
| **807–836** | **The Exterior Visualizer** — see its own section below | `visualizer/` + `spark/` |

### ⚠ The Exterior Visualizer (807–836) — a SEPARATE APPLICATION, and the newest thing here

**Read `HANDOFF.md`'s newest section and `spark/VISUALIZER_SETUP.md` before touching any of it.**
Theo: *"I want to completely redo the entire Ai Exterior designer."* The old in-app designer
(`cr-des`) **went out whole at 807** — both blocks cut, `api/design.js` deleted, all five wirings
unpicked (`hideAllViews()`, the `navRestore()` case, the `__crNav` wrap, `BLACKOUT`, the hub
handler), **35,420 characters removed**. `api/design.js` came back at **822** as the Visualizer's
second engine; the deletion and the return are different things and both were deliberate.

**It is `visualizer/index.html`, not a screen in the app, and 805 is the reason.** There is **no
CRM code in that file at all** — asserted with `index.html` as the control, where all 7 markers
trip. It is a **folder** so it can become the root of its own Vercel project; until then the main
project serves it at `/visualizer/`, which is what makes it testable today.

**Three screens, and the split IS the settled decision "pre-render before the appointment":**

| Screen | What | The rule it encodes |
|---|---|---|
| **PREP** | at the office — pick the house, pick the combinations, queue them | the Spark renders while nobody is waiting |
| **REVIEW** | a person looks at every render before a customer does | **`approved` starts false and only this screen sets it true** — The Walk's rule |
| **PRESENT** | at the kitchen table — approved renders only, so a tap is instant | **If you find yourself adding a Generate button to PRESENT, you are undoing the decision** |

**The seam is `design_jobs`.** The browser writes a row and reads it back. It **never** talks to
ComfyUI, never holds a service key, and does not care whether the Spark is switched on.
`spark/visualizer_worker.py` is the other half and **polls outbound only** — no tunnel, no inbound
port. That is how the standing "the Spark is never a live dependency" rule survives a feature that
obviously depends on the Spark: a queued job sitting at `queued` is **correct**, not a fault.

**Its own sign-in key.** `storageKey: 'cr-viz-auth'`, because Studio and the CRM both use the
supabase-js default and would fight over one session on a shared origin. ⚠️ **That fixes the new
app only — Studio is untouched**, so "Studio keeps logging in" is still open.

**Standing fences, all asserted:**
- **AI-generated images are PRESENTATION ONLY.** They never reach project photos, inspection
  reports, claims, supplements or CompanyCam. An altered photograph of a real roof is an insurance
  problem — the same rule The Walk runs on. Own table, own storage prefix.
- **Roofing is Owens Corning, from `oc_colors`. Everything else is a real brand from `materials`,
  whose `category` CHECK constraint deliberately excludes roofing** so the two catalogs can never
  disagree about a shingle.
- **The GPS fence is asserted at three sites** — schema, worker, front end.
- **EXIF is stripped in the browser, before upload** (canvas re-encode at q0.97), gated on real
  bytes containing an APP1 segment and a literal `GPS`.

**What the 827–836 run actually is: a segmentation problem, and it is not finished.** The arc is
worth reading in the build log because almost every build in it fixed the *previous* build's fix.
The short version:

- **Region picking by area-ranked automask FAILED and the approach was wrong, not mistuned.** SAM 2's
  automatic generator is class-agnostic; ranking by area **actively selects against the building**,
  because trees, lawn and driveway are large and uniform while the house is cut up by its own
  shadow. Tested on a real house: regions covering tree canopies, the lawn and both cars.
- **827 replaced it with point-prompted SAM 2** (tap the surface), **832 with a dragged box**, and
  **835 with SAM 2's native `bboxes` prompt** — because points can only ever say *include this* and
  **nothing in a point prompt says "and nothing past here"**. A dragged 42×70px box returned a
  559×310 mask.
- ⚠️ **`points_api.json` is `segmentor:"single_image"` and `regions_api.json` is
  `automaskgenerator`. They disagree ON PURPOSE** — asserted in both directions by `test_points.py`.
- **834 turned off the corner negatives and made quality a NUMBER.** `pct` cannot tell a solid wall
  from confetti over the same area; **`fill` — what share of its own bounding box a mask lights —
  can**. >70% is a surface, <40% is fragmented. ⚠️ **I had read a mask getting SMALLER as a mask
  getting BETTER** and reported it to Theo as a win.
- **836: `exclusive()` could erase a surface entirely** and report `done` with no error — siding is
  last in `DETAIL_WINS` and is subtracted by everything. It now returns a report naming
  `eaten_by`, and `skip_reason()` gained `erased`.
- **Recolour, not regenerate, is the product** — `tint()` is a luminance-preserving recolour of the
  masked region toward the selection's own hex at `denoise 0.82`. ⚠️ **Both halves are required:**
  tinting at `denoise 1` is thrown away, and lowering denoise without tinting just preserves the
  original colour. Diffusion (`RENDER_MODE=restyle`) is opt-in, for material changes only.

⚠️ **Three green results in a row are not a test if they all sit on the easy side of the
distribution.** The colour path was broken from the start and three consecutive renders agreed with
the swatch **by luck**, because Onyx Black and Black Sable are near-black — simultaneously the
commonest shingle in the training data and a strongly-weighted word. A muted sage green was the
first colour that could ever have exposed it.

⚠️ **"Which code rendered this job?" cost three rounds in one night.** A curl-copied file, a stale
checkout and a leftover foreground worker all look identical from outside — a `done` row and a
wrong picture. **`WORKER_BUILD` is now stamped into `achieved._worker` on every job,
unconditionally**, and announced in the startup line. `achieved._prompt` (835) records which prompt
shape actually ran. **Provenance is a query now, never an argument.**

**Known-open, stated plainly:** no stale-claim recovery (a job claimed by a worker that dies stays
`running` forever); **184 unreferenced files (60 MB)** under `photos/visualizer/` with
`spark/sweep_visualizer.py` merged but never run — ⚠️ **the figure carried here for months was
"~60 files (~20 MB)" and is wrong by 3x**, measured 26 Aug against `storage.objects` joined to
`design_jobs`; **DECIDED 26 Aug: do not sweep**, 60 MB is not worth 184 irreversible deletes on a
never-validated script — revisit past ~500 MB; the gutter mask still wants a
`CARDINAL_MASK_GUTTERS` chain built by eye on the Spark; **830's `"rain gutter . downspout"` prompt
is REVERTED as triage at 836**, not overruled.

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
| **`supplement.html`** | **The Supplement Desk (668, at build 1055) — deliberately ships.** Studio's pattern: public file, own Supabase sign-in, `is_cardinal_admin()`, and `api/supplement.js` enforcing admin **server-side**. ⚠ **Its theme key is `cr-desk-theme`, not the CRM's** — and its pre-paint head script overwrites whatever an init script set, so a rig using the wrong key silently drives ONE theme twice |
| **`visualizer/index.html`** | **The Exterior Visualizer (807) — deliberately ships, and is a FOLDER on purpose** so it can become the root of its own Vercel project. No CRM code in it. Own sign-in (`cr-viz-auth`), every table RLS'd. Carries the publishable anon key and no other secret — **checked by `gate_807.mjs`, not assumed** |
| `ai-field-manual.html` | **deliberately ships** — the Library iframes it (562); noindex; the decision and its audit are recorded in `.vercelignore` |
| `drivewaytest.html` | The Driveway Test — **deliberately public and standalone**: no login, no Supabase, no SQL, no token. Handed over at the kerb, reachable at `/drivewaytest.html` on any domain serving this repo |
| `api/*.js` | **29** serverless functions (ESM) |
| `sw.js` | service worker — push + offline shell |
| `manifest.json`, `icon-*.png`, `apple-touch-icon.png` | PWA assets |
| **`README.md`** | **the ten-minute orientation (26 Aug 2026) — artifacts, env var NAMES, deploy shape, the gate ladder, known gaps. Excluded from the deploy; GitHub still renders it.** This file stays the authority; the README defers to it |
| **`MIGRATIONS.md`** | **the migration manifest — GENERATED by `scripts/migration_manifest.py`, gated by CI. 84 files, 12 destructive, 21 named by no doc. ⚠ Count migrations THERE, not in the row below — this table has been wrong about them before** |
| `robots.txt` | `Disallow: /` — an internal tool; nothing should index |
| `docs/*.pdf` | 3 contract PDFs — **referenced 6× by the app as print masters, deliberately public** |
| `bulk_assign.html` | referenced 2×, deliberately public |
| `*.sql` (**62** at root) | migrations, **all applied by hand**; `.vercelignore` blanket-excludes them so none is ever served |
| `brand/` | the Word letterhead template (7 Aug) — **excluded**, internal |
| `spark/` | **excluded** — Theo's own hardware. Now also holds `visualizer_worker.py`, the ComfyUI graph JSONs (`points_api.json`, `segment_api.json`, `regions_api.json`, `inpaint_api.json`) and **13 `test_*.py` gates** |
| `vercel.json` | **FOUR crons** (this line said TWO until 1062, and had said it since the third arrived) — `/api/digest` daily 11:00 UTC, **`/api/commissions-digest` Fridays 11:00 UTC**, `/api/companycam-sync` daily 03:00 UTC, and **`/api/requeue-stale` hourly at :20** (1062 — it gives `requeue_stale_design_jobs()` its first caller; the function had been defined, granted and documented since the Visualizer shipped and never once run). ⚠️ **Count them in the file, not here** — this row has now been wrong twice. Plus the two `presentation.*` host rewrites → `/popup.html`, **and a `functions` block raising `maxDuration` to 60s on 13 AI/long-running routes**. A new slow route needs an entry here or it times out at the default |
| `package.json` (root) + `api/package.json` | Node 22.x; `@supabase/supabase-js`, `web-push`, **`@anthropic-ai/sdk`** (806). **Only `api/package.json` sets `"type":"module"`.** |

`.vercelignore` excludes `.claude/`, `CLAUDE.md`, `.github/`, **`AI_CHEATSHEET.md`**, **`spark/`**, **`brand/`**, **`*.sql`** (a blanket rule — migrations are run by hand against Supabase and must never be served) and ten orphaned scratch `.html` pages. Its header comments explain each reasoning and record that entries were verified returning HTTP 200 to an anonymous visitor before being added. **Keep that discipline: if you add a file to the root, decide whether it ships — and say so in `.vercelignore` either way.** It has held: `supplement.html` and `visualizer/` each got a written paragraph when they were added.

**Verified 16 Aug 2026 at build 808/836:** **17** `.html` files at the root — 10 excluded as scratch, and **7 that ship on purpose** (`index`, `popup`, `studio`, `supplement`, `ai-field-manual`, `drivewaytest`, `bulk_assign`), plus `visualizer/index.html` in its folder. **62 `*.sql`** files, all applied by hand and all excluded by the blanket rule.

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

**✅ `/api/config` EXISTS — do not re-report it as missing.** An earlier revision of this file said `loadConfig()` fetched a route with no `api/config.js` behind it, and that Google Maps autocomplete was therefore silently off. `api/config.js` is present in the repo. Verified 1 Aug 2026 at build 557 and re-counted 16 Aug — there are **29** functions in `api/` @808, not 20 and not 26.

⚠️ **`api/design.js` was DELETED at 807 and RESTORED at 822.** Both were deliberate: 807 removed the old in-app designer whole, and 822 brought the route back as the Visualizer's **second engine** (a Gemini path beside the Spark's FLUX/recolour path). If you find it in a diff, check which side of 822 you are on before calling it a mistake.

⚠️ **`/api/notify` was PUBLIC until build 642**, and was sending everything twice. **Read a route's own gate before assuming it has one** — the hardcoded Supabase URL and anon key in `api/*.js` are safe by design and are *not* an auth check.

---

## Shipping (cloud sessions)

Work on a branch, push, open a PR with a plain summary of what changed and what it cost. **Theo reviews and merges; Vercel deploys from `main`.**

- **SQL ships as separate `.sql` files, and runs BEFORE the `index.html` change.** Say so explicitly in the PR. (`.vercelignore` now blanket-excludes `*.sql`, so a committed migration is never served.)
- **Pick the build number with `scripts/next_build.py`** — it asks the remote. Two sessions colliding on numbers has happened twice (504–506, then the whole 574 span). **It is more necessary now, not less**: a build can land in `index.html`, in `visualizer/index.html` or in the Spark worker, and only the remote knows what the other lineages took.
- **State BOTH stamps when the work touches the Visualizer** — the build number and the `wb-YYYY-MM-DD.N` worker build. The build log's `Build 827 / wb-2026-08-15.9` is the format.
- On ship: add the feature row to `FEATURES.md`, one line to `cardinal_build_log.md`, strike the `OPEN_ITEMS.md` entry — in the same PR. **The 428–451 span is what skipping this looks like:** 24 builds of real work with no record outside the in-app changelog. **The discipline has held from 543 to 836** — do not be the session that breaks it.
- **PRs are squash-merged.** One build per PR is the norm; a span of related builds in one PR happens (809–818) and the build log writes it up as a span.
- Take a fresh `git hash-object` before pushing, to confirm what you push is what you verified.
- ⚠ **Before merging ANY PR, run `python3 scripts/gate_ship.py <pr-number>`.** It is four
  checks, and each one has already cost a round: the branch carries no commit whose patch
  is **already on main** (a squash-merged predecessor re-applied — BUG_CLASSES 49); a
  successful `check` run exists **for the PR's own head sha** rather than one inherited
  from an earlier commit on the same branch (BUG_CLASSES 48); `mergeable_state` is `clean`;
  and the app stamp is above main's. `--selftest` proves it can fail.
  **"No CI run at all" is usually a CONFLICT, not an Actions outage** — a `pull_request`
  run is built against the merge ref, which cannot exist while the PR is `dirty`. Read
  `mergeable_state` before you go looking at the billing page.
- ⚠ **After a merged PR, restart the branch from the REMOTE default branch** —
  `git fetch origin main && git checkout -B <branch> origin/main`. A bare
  `git checkout -B <branch>` re-points it at the current HEAD, which after a squash merge
  still holds the *pre-squash* commit; the branch then ships the last build a second time
  with the content looking perfectly correct. That is BUG_CLASSES 49 and it happened at 840.
- ⚠️ **`git fetch` before building a negative-control tree.** A stale `origin/main` silently controls against the wrong build and reports the previous run's numbers — build 833 lost a round to exactly this.

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

### ✅ `.single()` does **not** throw here, and there is no backlog — audited at build 474, re-counted at 808

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
failure. Current counts at **808**: **55 `.single()` · 6 `.maybeSingle()`**, and **`.throwOnError(` is
still 0** — re-measured 16 Aug, which is the only reason the paragraph above is still true.

⚠️ **Ten `.single()` sites were added between 627 and 808** (the supplement, scope-reader,
commissions and punch arcs) and **they have NOT been individually re-read since the 474 audit.**
The audit's conclusion — every site guards, zero raw dereferences — is verified through 627 and
**asserted, not measured, past it.** The invariant that makes it safe is unchanged and *is*
measured: `.throwOnError(` is 0, so `.single()` still cannot throw here, and the only hazard is
`const { data } = await ….single()` followed by `data.foo`. **If you touch one of the newer sites,
read it; do not open a migration.** Converting the other 45 is churn with real regression risk and
no correctness gain.

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
- ⚠️ **"Can you please audit this project and make this work as intended instead of doing experiments."** — Theo, 15 Aug, and it was fair. The Visualizer arc spent whole builds fixing the previous build's fix, and **two of three consecutive builds fixed my own errors rather than moving forward**. When a feature needs three screenshots to converge, **stop and build the instrument** — `fill` (834), `_worker` (829), `_prompt` (835) and `exclusive()`'s report (836) each ended a round-trip that Theo's eyes had been paying for.
- ⚠️ **Scope creep reads as not listening.** The 14–15 Aug ask was *recolour siding by wall*; the session's second half went to plane detection, a harder problem nobody asked about. **Bring options before building** — his stated preference all session.
- **A correct state with no explanation is its own defect.** Build 808 exists because 807 shipped a grey `queued` chip that was perfectly accurate and told nobody the render machine had never connected. Say *why*, and say nothing at all when there is nothing wrong yet — crying wolf trains people to ignore the banner.
- Theo works from a phone **and** a desktop with an ultrawide — the doc set once recorded him as mobile-only, and that error hid a desktop-width contrast bug (487). He deploys through the GitHub web UI and works very late. Match the pace he sets and get out of the way.

---

## Secrets

Never put credentials in `index.html`, in a commit, or in a chat message. They go in Vercel env vars or GitHub secrets only. A Gemini key and a GitHub PAT have both been exposed in chat on this project — assume that mistake is easy to repeat and refuse to repeat it.

Note that `api/*.js` files carry **hardcoded fallbacks for the Supabase URL and the publishable anon key**. Those two are designed to be public and are safe. **Nothing else is.** Service-role keys, `GEMINI_API_KEY` and VAPID private keys must stay in env vars

⚠️ **That last clause was ASPIRATIONAL until build 1084 — `api/notify.js` carried a VAPID private key as a literal fallback, and with the env var unset it was what actually signed production pushes.** It is deleted; the route now returns `reason:'no_vapid_private'` rather than signing with `''`. **Do not reintroduce a secret fallback for any key.** A fallback is not resilience — it guarantees the value is in the repo, and it hides its own absence, so nobody learns the env var was never set. Asserted: zero 43-char base64url literals remain in that file.

⚠️ **A PUBLIC key cannot be delivered by an env var here, and setting one is a silent no-op.** There is **no build step** — no Next.js/React/Vite/webpack, `scripts` is empty, `vercel.json` has no `buildCommand` — so `index.html` ships byte-for-byte as committed and `NEXT_PUBLIC_*` (a Next.js build-time substitution) does nothing. The browser gets `VAPID_PUBLIC` only because it is literally in the file, twice. Private half → env var; public half → committed — and remember that anything at the repo root is served publicly unless `.vercelignore` says otherwise.
