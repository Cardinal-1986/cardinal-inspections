# Hand-Off — Session Log

> **Newest session first.** The 29 July log begins below the 31 July section.

---

# Session of 10 August 2026 (later) — builds 685–695

**685 through 695 all shipped, merged and verified deployed** (PRs #198–#211,
each squash-merged on green under this session's standing authorization — Theo re-confirmed the hands-off flow at the start; a NEW session
must confirm it again rather than inherit it). `main` at 695. Working tree
clean, branch synced to main, no open PRs.

| Build | What | PR |
|---|---|---|
| 685 | every gradient-clipped text site removed — 37, not the 38 on record | #198 |
| 686 | the nav is drawn, not emoji — 28 rows, `CardinalIcons` 4 → 27, `hydrate()` | #199 |
| 687 | the three icons Theo rejected off the 686 sheet, redrawn | #200 |
| 688 | ABC Supply → **Suppliers**, with ABC as a card inside | #201 |
| 689 | calendar titles were **1.06:1** (unscoped light-era ink) · client cards → obsidian · the initial/Call/Text become raised keys | #203 |
| 690 | pipeline-stage **chips** on All Leads & Jobs — surfacing a filter that already existed | #205 |
| 691 | **Assigned To** joins Milestone as a second strip — 690's stage-only code generalised to any group | #207 |
| 692 | the emoji sweep reaches four more screens — 37 sites, `CardinalIcons` 28 → 43 | #209 |
| 693 | **Sales Floor had no light theme at all** — 16 `--sf-*` tokens; the switch had been doing nothing to it | #210 |
| 694 | the light/dark switch is reachable again on Sales Floor, every full-screen view and insurance | #210 |
| 695 | the Tools dropdown is drawn — all 16 rows, `CardinalIcons` 43 → 47 | #211 |

**One thing is waiting on Theo, asked and unanswered:** the `.pcpo` lavender in
LIGHT mode. It was already failing at 1.99:1 and 689's darker card took it to
**1.79:1** — I made a known-bad number slightly worse and said so. It is a
semantic frozen colour, so the pick is his. Everything else on that card clears
its floor, though `address`/`meta` are now thin at 4.59 against 4.5.

## The through-line of this session, if you read nothing else

**Green assertions do not see meaning.** 686 was 195/195 green and shipped three
icons that were wrong — a hammer that read as a T, a hard hat that read as a
bag, and a *building* standing for "Team". Theo caught all three off a rendered
contact sheet in about a minute. 687 fixed them. **Ship an icon with a picture,
not a pass count.** Same finding as 628's amber bar and 633's white boxes.

## Corrections I owe, in my own words

- **I said 550 emoji remained. It was 562.** My census never covered
  0x2300–0x23FF (Miscellaneous Technical), so ⏰ — and the whole Reminder row —
  was invisible to it and survived the first pass. **And 533 was wrong too** —
  it missed the JS surrogate-escape form, which is 644 of 957 raw hits. The
  real figure was **643**, now **606** after 692. `scripts/emoji_census.py`
  is the instrument and it prints its exclusions rather than one bare number.
- **I shipped a harness that could not fail.** In modern Chromium every
  `CSSStyleRule` exposes an empty `.cssRules` for CSS nesting, so
  `if (r.cssRules) { walk(); continue; }` skipped every rule and reported a
  clean zero. Only the negative control — which had to say 37 and said 0 —
  caught it.
- **The same JS mistake twice in one session**: an icon's paths written as two
  adjacent string literals with no `+`. JS has no implicit concatenation. Icon
  entries in `P` are ONE string on ONE line.
- **A negative control that CRASHES is not a negative control.** 691's gate
  threw `getComputedStyle(null)` against the 690 artifact, which reads at a
  glance like the red you wanted. Guard the probe so the control *reports* —
  34 pass / 20 fail is evidence; a stack trace is an absence of evidence.
- **A placement predicate must not inspect the thing being placed.** 694's
  first `needsFloat()` spotted insurance by reading the button's own computed
  display — true only while it was still in the header row. Once it moved,
  the reason to stay out vanished and it oscillated back every second.
- **I solved one filter group out of seven and called it the answer.** 690
  shipped a stage strip; Theo's next message was "How would I filter by rep?
  Etc". The engine had SEVEN groups the whole time. Ask what else the mechanism
  covers before shipping a special case of it.

## What shipped

**685 — every gradient-clipped text site removed.** Queue item 2 of the
10 Aug list is done; item 1 (the emoji sweep) is untouched and still first in
Theo's order.

## Three things a new session must not re-derive

1. **The count is 37, not 38.** The recorded 38 includes one PROSE hit — a
   comment in `cr-nvl-styles` whose `-webkit-text-fill-color` and `:transparent`
   sit either side of a newline, so every `\s*` pattern matches it. 36
   stylesheet rules + 1 inline `style=` attribute. `CLAUDE.md` now says so.
2. **`scripts/render_gradtext.js` is the standing instrument.** It walks
   Chromium's own parsed rules, and it goes **RED with 90 failures on the 684
   artifact** — a gate that has been seen to fail. Do not re-check this surface
   with a text regex; the regex finds the comment.
3. **The replacement rule is recorded and was followed for all 37**, so no
   colour in this build is anyone's taste: identical stops → that colour · an
   approved precedent → it · else the rule's declared `color:` if it clears its
   floor · else that rule's own best gradient stop · else a theme-flipping
   token. Zero floor failures; worst 4.83:1.

## Two harness bugs worth carrying forward — both now in `CLAUDE.md`

- **Modern Chromium gives every `CSSStyleRule` an empty `.cssRules`** (CSS
  nesting). `if (r.cssRules) { walk(); continue; }` therefore skips every style
  rule and reports a clean zero. **This shipped as a false green** and only the
  negative control caught it.
- **Within one element the background-image composites over that element's own
  `background-color`**, not the ancestor's. Getting it wrong reads a dark card's
  wash as near-white — it failed a passing ink at 1.05:1.

## One regression I introduced, caught before merge

The login tagline carried an inline `color:#7a4a3e`. The stylesheet's
transparent fill had been masking it; with the gradient gone it painted 2.43:1
on the dark card. Removed at source (5.06:1). **Generalise it: removing
gradient text can unmask an inline light-era ink** — scan the affected elements
for an inline `color` before calling such a sweep done. Only 1 of the 37 had it.

## Queue

1. **The emoji sweep — 686, 692, 695. 594 remain.** Measured with
   comments excluded (module banners' box-drawing swamps a naive count) and with
   the 0x2300–0x23FF block included. Dingbats (156), arrows (154) and geometric
   marks (66) are counted SEPARATELY and are **not** part of this sweep — ✓ ✕ →
   ☐ are functional UI glyphs, not stickers. Next cleanest tranche: the card and
   hero button rows in `cr-sf` / `cr-ch2` / `cr-cth` / `cr-ci`, which already
   wrap their emoji in `<span class="i">`. The weather table in `cr-lr-script` is
   a DATA map keyed by WMO code — an icon per condition, a design task, wants
   Theo's eye first.
2. ~~gradient text~~ — **done at 685**.
3. **The insurance loop** — needs Theo, the live key and Gunn's document.
4. **VAPID rotation** — still waiting on `VAPID_PRIVATE_KEY` in Vercel.
5. **`.pcpo` lavender 1.99:1 in light** — still needs Theo's pick. Note the
   `.ljpo` PO is now settled on `#d8a94f`/`#8f1620` everywhere, which is a
   ready precedent if he wants the same treatment.

## 690–691: the filter was already there — and there are now THREE ways to set it

`ljState.sets[group]` is the one source of truth. The chip strips, the desktop
checkbox rail (`#ljRailMount`) and the funnel sheet all push/splice the SAME
arrays and all re-render through `renderLeadsView()`. **Do not give any of them
its own state.** `render_stagechips.js` asserts the sync directly — it clicks a
chip and then reads the rail's checkbox.

**691 generalised 690 rather than copying it.** 690 shipped stage-only code;
Theo's very next question was *"How would I filter by rep? Etc"* — one of seven
groups solved. So the renderer became `ljChipStrip(gkey, mountId, wrapId)` and
the handler `ljChipClick` now reads its group off the container's `data-g`.
**Adding a third strip is two lines of markup and one call** — do not write a
second handler. Theo's pick was **C, two fixed strips** (Milestone + Assigned
To); the other five groups stay behind the funnel, and Option A (one switchable
strip over all seven) was rendered, shown and NOT chosen — don't re-propose it
without a reason.

Three behaviours worth knowing before you touch it:

- **A strip hides itself when it has fewer than two values.** A solo rep is not
  a filter, it is a label. `wrap.style.display='none'` on the labelled `.ljgrp`,
  not on the mount, so the heading goes with it.
- **Only `stage` draws colour dots** (`dots = gkey === 'stage'`). Reps have no
  palette and inventing one would collide with the semantic frozen list.
- **Stage and rep COMBINE.** The gate asserts this explicitly, because the
  obvious wrong implementation — one strip replacing the other's selection —
  looks identical until you pick from both.

`render_stagechips.js` is now **54 assertions across both themes**, expectations
self-computed from the seed rather than typed in (BUG_CLASSES 15). Negative
control on 690 reports 34 pass / 20 fail, so it has been seen red.

⚠️ **`OnHold` is in `STAGES` but absent from `LJ_SOLID` / `LJ_INK` / `LJ_SPINE`.**
Everything falls back to `#8a93a1`, which is also Lead's colour, so the two dots
are identical. The strip matches the existing fallback rather than inventing a
tenth colour — the stage palette is on the semantic frozen list. Theo was told;
he has not asked for a distinct OnHold colour.

## Two couplings found this session — check them before ANY nav change

- **The desktop left nav (`cr-lnav-script`) has its OWN 26-icon set**, unrelated
  to `CardinalIcons`. Desktop and burger menu draw from different sets. Theo's
  call: **not now** — finish the emoji sweep first. Folding them into one is its
  own build and changes what his ultrawide looks like, so it wants a preview.
- **`iconKey()` derives the left-nav icon key from the button's TEXT** — it
  lowercases and strips non-alphanumerics. Renaming a nav label therefore
  silently changes which icon it looks up. 688 hit this ("ABC Supply" →
  `abcsupply` → `suppliers`) and had to move the key in both of `cr-lnav`'s maps.
- **A feature can have two doors.** `Suppliers` is reachable from the main menu
  AND from the Tools dropdown (`.cbi[data-go="abc"]`). The second is invisible
  from the menu; it was found by grepping the brick emoji.

## Notes

- `--rbe-po1` is **gone** (0 references after the sweep); `--rbe-po2` was
  retargeted to Theo's approved pick C. Five PO surfaces now share one pair.
- `.mic`'s `@supports` block is deleted — 682 handed it to this build by name.
- **`harness_677` crashes on any index.html** — it wants `sw.js`. Pre-existing,
  reproduced on 684. Not a regression; don't chase it.
- The scratchpad rig (`measure_grounds.js`, `layers.js`, `decide.py`,
  `apply_all.py`) is session-local; only `render_gradtext.js` was committed.

---

# Session of 10 August 2026 — five builds live, three settled rules, and the readability class named

**`main` carries build 684 (679–684 all shipped THIS session, all merged, all verified
deployed to production via the GitHub deployments API — this session cannot reach
app.cardinalroster.com directly, its network policy 403s the CONNECT; use the
deployments API, never curl the site). Working tree clean. NO open PRs, NO held branches.**

## What shipped, in order

| Build | What | PR |
|---|---|---|
| 679 | Supplement Desk reachable · job name stops following you · map is an anchor + incomplete-address warning · community card way out | #191 |
| 680 | Claims screen: the `.empty` two-meanings collision (SIX surfaces) · Date Filed / Date Approved labels · `approved_at` writer (had NONE, ever) · cause_of_loss from the scope · Job/Contract tabs split | #192 |
| 681 | Schedule Board readable (`.viewhead` 1.10→19.89:1, **fifteen pages**) · `CardinalIcons` born, Schedule Board is the approved sample | #193 |
| — | Docs-only: the standing readability note at the TOP of CLAUDE.md | #194 |
| 682 | `metallicize()` removed entirely (Theo: "we don't need metallic anymore") — observers 47→46 | #195 |
| 683 | Home client cards dark (the bare `.stg-*` pastel collision, loaded since 544) · `.pcnm` gradient text → solid (39 sites → 38) | #196 |
| 684 | What's New un-gated for the whole team (600's gate reversed — its staleness reason is gone) · this handoff | (this PR) |

## Theo's decisions THIS session — settled, do not re-litigate

1. **"I don't need to have gradient colors anywhere."** Measured at 681: 276 gradient
   calls, **38 gradient-clipped TEXT sites remain** (was 39; 683 removed `.pcnm`).
   No new ones, ever. Removing the rest is a queued build. Full list: grep
   `-webkit-text-fill-color:transparent`.
2. **Icons: inline SVG, approved on the Schedule Board.** `CardinalIcons.get(name)`,
   `.cri` class, `stroke:currentColor`, em-sized. Icons ONLY where the eye scans;
   emoji in prose are DELETED, not converted. Scope: app screens only — emails,
   push, letters, popup.html, drivewaytest.html, Showcase are OUT until Theo says.
   CHANGELOG keeps its emoji (history).
3. **"We don't need to use metallic anymore"** — done, removed at 682.
4. **Client cards: dark, like the rest** — done at 683.
5. **What's New: everyone again** — done at 684.
6. **"Merge and deploy when anything becomes available if practical"** — standing
   authorization given 10 Aug for this session's PRs; a NEW session should confirm
   it still stands rather than inherit it.

## The queue, in Theo's priority order

1. **The emoji sweep (approved, ready).** Inventory instrument: `metallicize()` is
   GONE (682) — do NOT look for it. Its regex survives in git history
   (`git show <682-parent>:index.html`, MIC_CLUSTER at ~L17721) if you want the
   cluster pattern. Sweep must catch BOTH literal UTF-8 AND HTML entities
   (`&#128197;` — all 15 `.viewhead` headings use entities) AND JS escapes
   (`\uD83D...`). Check each site for: lookup key, DB-persisted, regex, filename,
   CSS content: — those are data changes, not cosmetic.
2. **The 38 remaining gradient-text sites** (list via grep; the CLAUDE.md standing
   note has the count table).
3. **The insurance loop** (approved plan §C in
   /root/.claude/plans/mellow-toasting-walrus.md — but that file is SESSION-LOCAL;
   the plan's substance: `read_response` is a 501 stub at api/supplement.js:274,
   `insurance_supplements` has ZERO rows, `responses jsonb` + per-item
   `carrier:{decision,note,decided_at}` slots already exist — fill them, don't add
   a second structure. enforceDecisions() mirrors enforceGaps(): unknown id
   dropped, silence = `unaddressed` never approved, model dollar figures are
   PROPOSED and Theo confirms before write. Front half has never run against a
   real scope — prove it on Gunn's document first, with Theo + the live key.)
4. **VAPID key rotation** — waiting on Theo setting `VAPID_PRIVATE_KEY` in Vercel
   (steps in OPEN_ITEMS / the 682-era conversation; committed literal in
   api/notify.js:20-21, repo is PUBLIC). Never remove the literal before the env
   var is live.
5. `.pcpo` lavender 1.99:1 in light — semantic frozen colour, needs Theo's pick.

## What a new session must know that the older docs don't say

- **The measuring-rig traps cost three builds this session; all three are in
  BUG_CLASSES and the CLAUDE.md standing note.** Short form: (1) never
  concatenate the `<style>` blocks — print templates inside strings restyle the
  page; load the REAL document in Chromium; (2) `background-color` is not the
  background — collect gradient stops; (3) an rgba wash is not a ground —
  COMPOSITE it over what is beneath (render_pcard.js `grounds()` is the good
  copy).
- **The class-collision shape struck twice in three builds** (`.empty` at 680,
  bare `.stg-*` at 683 — both BUG_CLASSES 27). Before using any short utility
  class, ask what else wears it.
- **Three harnesses are pinned to SPECIFIC baselines**: harness_672 (671-era
  senddoc), harness_674 (build 673), render_inshub (build 674). "The previous
  build" is the wrong control — read each Usage line. harness_674 with a newer
  baseline CRASHES with `aerialMerge is not defined`; that is the wrong-baseline
  symptom, not a bug.
- **The observer census and the standing rule are in CLAUDE.md** (46 calls, 45
  modules, enumerated). No new `document.body` observer without written cause.
- **next_build.py before the first patch and before every PR.** This session it
  was right every time (679…684 sequentially). The 584 collision on
  `claude/ai-can-build-584` is still outstanding and still must not merge unstamped.

## Session hygiene notes

- Squash-merges: after one, a stacked branch must be REBASED ONTO the squashed
  main (`git rebase --onto origin/main <old-base> <branch>`); hash-compare the
  artifacts before/after to prove the tree is unchanged (680 did this, byte-identical).
- The scratchpad node_modules (jsdom + playwright-core) lives at the session
  scratchpad; a NEW session gets a fresh scratchpad and must reinstall or
  re-point NODE_PATH.
- Chromium: /opt/pw-browsers/chromium-1194/chrome-linux/chrome via playwright-core.

---

# Session of 5 August 2026 (later) — the archive landed, and a taxonomy that was fighting itself

**`main` at `5cbb888`, app stamp `build 601`, working tree clean. PR #129 merged.
PR #130 is OPEN, DRAFT and DELIBERATELY HELD — see the warning below before touching it.**

## ⚠ Read this before you do anything on the repo

**PR #130 (`claude/taxonomy-602`) must not be merged, rebased or force-pushed by a new session.**
It is code-complete and CI-green, and it is held on purpose: it renumbers the model's class
indices, and **the Spark's label files have not been remapped yet.** Merging it before Hermes runs
`spark/remap_taxonomy_602.py` and retrains makes the next YOLO export silently wrong — the code
would say index 19 is `soffit_fascia_damage` while every label file still says it is `soffit_damage`.

The session that opened it is watching it. **If you are a different session: leave that branch
alone.** Two agents pushing to the same repo is how #130 picked up a phantom conflict in the first
place (see below).

## What shipped

- **601** — the `ROSTER` initials map in `cr-pae-script` gave **Joan and Jerry the same badge**,
  both `JV`. Four of eight were wrong against `team_profiles`: Joan `JV`→`JH`, Nick `NP`→`NH`,
  Joey `JC`→`JL`, Jacob `JM`→`JSH`. **Jerry's `JV` was correct** and is untouched — 599 added him
  correctly; Joan's entry had been wrong all along and adding Jerry only made it visible.
  **Jacob is three characters on purpose**: he and Joan Hunt both reduce to `JH` from surnames, so
  `JSH` is the only reason all eight badges are now unique.
- **601 also** — builds 599 and 600 sat at positions **15–16** of `CHANGELOG`, wedged between two
  584 entries, because whoever added them grepped `{ build:` and concluded the array stopped at 584.
  **585–598 use the `{ b:, d:, t:, s: }` shape instead.** No sort in the renderer; the automatic
  open was fine (`show()` filters on `entryBuild(e) > lastSeen`) but the manual-open fallback
  `CHANGELOG.slice(0, 5)` took the first five in file order and skipped both.
  **Grep BOTH `{ b:` and `{ build:` before concluding anything about that array.**
- **Docs** — 23 builds backfilled into `cardinal_build_log.md` (560–561, 565–577, 581–583,
  596–600), marked as reconstructed from the `CHANGELOG` and commit titles. They carry no gate
  detail because none was recorded; that is stated rather than invented.

## Held, not shipped: build 602, the defect taxonomy

v4's `val_batch1_pred.jpg` came back with **one rotted eave boxed three and four times**, each box
a different class. **NMS is per-class** — it only suppresses overlapping boxes of the *same* class,
so splitting one repair across three names guarantees all three survive. Not tunable.

**The ground truth is mostly innocent** — Hermes measured **3 cross-class overlaps above 0.5 IoU
across 454 images.** The annotations did not teach it. **The taxonomy invited it, and
`api/detect.js` already said so at 596**: the exterior vocabulary came from what the model actually
called 294 flattened boxes, clustered as *"gutter 65, **soffit/fascia 57**, window 42, deck 42."*
Soffit and fascia were **one cluster in the data**; splitting them into two classes is what broke it.

```
19 soffit_damage + 20 fascia_damage  ->  19 soffit_fascia_damage
24 paint_deterioration               ->  removed   (a CONDITION among LOCATIONS)
33 -> 31 classes.  Every index <= 18 is UNCHANGED — the roof half and `other`@16 keep their numbers.
```

**Three files carry this list and all three must move together** — `api/detect.js` DEFECTS,
`spark/hail_review.py` DEFECT_KEYS, `spark/remap_taxonomy_602.py` NEW_NAMES. A gate asserts all
three identical. Same rule as `STAGES`/`WO_TRADES`. `walks_trade_ck`'s six trades are unaffected —
**no SQL.**

**Hermes' steps are in #130's body.** The one part needing a human is `paint_review.tsv`: 36 boxes,
each marked **19** (soffit/fascia) or **20** (siding). Theo chose redistribute-by-surface over
folding them wholesale.

## Two bugs the migration script had, found by testing it rather than reasoning about it

1. **Paint boxes parked at old index 24 collided with the NEW `window_seal_failure`.** Training
   between pass one and pass two would have turned every peeling soffit into a failed window seal,
   **silently**. They now park on **class 99** — outside `nc`, so training hard-fails. Loud beats subtle.
2. **The double-apply guard never armed.** The marker file was written only when no paint boxes were
   pending — but pass one *always* leaves them pending, so it was never written and a second run
   shifted every index again. Caught in the fixture: a `siding_damage` box silently became
   `soffit_fascia_damage`. The marker now means *"indices have been shifted"*, written by pass one.

## The photo archive is CLOSED

**60,503 rows in `studio_photos`, 60,503 objects under `photos/studio/`, and — the number that
matters — ZERO rows whose `storage_path` has no object behind it.** Verified by joining the two,
not by comparing totals, because two equal-but-mismatched counts look identical to a real match.

The run held **270 proactive token refreshes with no 403** across ~15 hours. One photo
(`1471231495`) failed on a transient Storage 400 and retried clean.

**`studio_findings` is empty and `photos/private/` has zero objects.** That is why the taxonomy
could change for free — **nothing stored anywhere uses the 33 class names.** `studio_photos.tags` is
shot-type only (`close-up` 20836, `wide` 8362, `aerial` 51), a different vocabulary. **That window
closes the moment findings start being written.**

## v4 is NOT promoted, and this is settled

Two independent reasons, no reason for: the numeric comparison was withdrawn as unproven (three void
evals, `BUG_CLASSES.md` §14), and the eyeball shows per-class duplication, wrong-object labels
(`wind_lifted` on a gutter, `granule_loss` over an aerial house) and a 1.0/0.3 confidence spread.
Hermes also measured **5 starved classes** (`nail_pop` **1** box, `electrical_hazard` 4,
`decking_sag` 5, `masonry_damage` 5, `window_seal_failure` 5).

⚠ **`nail_pop` having one example does not mean the class is wrong.** "Drop the class" and "label
more of them" are opposite fixes and the data cannot choose between them — that is Theo's call, and
he has not made it. **Do not delete a starved class on the strength of its count.**

## Still open

1. **The real private-room 4xx test.** Theo checked Nick's account and it could not pull private —
   but `photos/private/` is **empty**, so that refusal cannot be told apart from absence. The bucket
   being `public:false` and Nick getting no listing are both real signals; the gate is not closed.
   **The test that closes it:** one throwaway file at a known exact path, Nick requests *that path*
   directly, confirm the refusal, delete it. Do this before any personal photograph moves.
2. **Hermes' remap + retrain**, then #130.
3. **A second initials path**, separate from `ROSTER`, derives from `name` by first-two-words at
   `index.html:14691`, `:17429`, `:17456`, `:19901`. There Joan Hunt and Jacob Henderson **still
   both produce `JH`** — that path has no middle initial to work with. Different key (name, not
   email), different pipeline. Folding the two together is its own build.

## Pointers for whoever takes Production next

**`cr-prod`, `productionView` and `prodBoard` all return ZERO.** The Production Board lives in
**`<script id="cr-pb-script">`** and exports **`window.CardinalProduction`** (23 refs); reached by
`data-go="prodboard"` and `case 'production':`. Permission helper is `isProductionUser()` (8 refs).

⚠ **It is a CLASS-shown view** (`.open`, created at runtime), not a `display`-shown one. Per the
565–573 doctrine in `CLAUDE.md`: close it with the module's `close()` **and then confirm**, because
a module's `close()` can no-op without throwing when `ensureView()` has not run. **Writing
`display:none` onto it is permanent damage** — its own open path never clears an inline style, so
the screen is dead on the second visit.

Build **393** made the Production board one of the **four sanctioned** light/dark design exceptions.
Do not "fix" it into tokens. And per `CLAUDE.md`, the punch-out routing to Curtis is **already
built** (`punch_items` + `cr-punch-*`); the gap there is routing and notification, not software.

## One process note

**#130 picked up a merge conflict the moment #129 squash-merged** — the squash creates a new commit
with 601's content, so git cannot tell the 602 branch already contained it and flags both files.
Neither was a real disagreement: `index.html` resolved to the 602 branch (it is 601+602, and main's
copy hashed byte-identical to the 601 commit's), and `cardinal_build_log.md` kept **both** sides.
Expect this on any branch outstanding across a squash merge.

---

# Session of 5 August 2026 — the label pipeline is DISTILLATION, and its biggest leak

**`main` at the `/api/detect` merge (PR #114). No `index.html` change, no build bump — the app stamp
stays at 595. PR #113 (the seven decisions) also merged. Nothing uncommitted.**

This session ran alongside **Hermes**, an agent on Theo's Spark DGX box. Hermes owns the Spark, this
session owns the repo. Most of the value below came out of that exchange, not out of the repo alone.

## The thing a fresh session most needs to know

**Theo's YOLO model is trained on `/api/detect`'s output.** The pipeline is *fetch candidates →
detect → clean → retrain*, so **Gemini is the teacher and YOLO is the student** — confirmed by Hermes,
not inferred. Four consequences, all agreed and none to re-derive:

1. **mAP50 0.244 measures agreement with Gemini, not correctness.** A v3 at 0.40 means "agrees with
   the teacher more." The ceiling is the teacher's labelling quality, not YOLO's capacity.
2. **"1–3 labelled examples" means the teacher rarely emitted those classes** — not that labelling
   was incomplete. So more *volume* mostly yields more of what is already abundant. The rare classes
   need **targeted fetch** (storm-date jobs, close-up framing), which is a different plan.
3. **`via` was never captured**, so the existing 2038-record set is **not stratifiable by teacher**
   and cannot be fixed retroactively. The ladder falls through on 503/429 — three different models
   may be mixed in one training set.
4. **Never put `best.pt` behind `/api/detect`.** That is the student replacing the teacher. Valid for
   cost, latency or offline; never for accuracy.

## The biggest measured leak, and where it actually was

I proposed four mechanisms for the weak-class problem. **Three were measurably not happening.**
`dropped` was **0 on all 1274** collected photographs, and *every* drop path in `cleanFindings()`
increments that same counter — so the >12 truncation, the 0.5% size floor and the unplaceable-box
path have never once fired. A `dropped` of 0 is **positive evidence**, not missing evidence. Do not
re-litigate those three.

**The fourth is real and large.** Coercion to `'other'` does **not** increment `dropped`, and
**294 of 959 boxes (30.7%)** landed there.

**The cause is in this repo, not in the model:**

- `walks_schema.sql:53` constrains a walk's trade to
  `('roof','siding','windows','andersen','gutters','general')`
- `index.html:57402` passes that trade to `/api/detect` as the label hint
- `DEFECTS` in `api/detect.js` is **roof-only**

So the app asks *"here is a SIDING walk, find defects"* and the vocabulary cannot answer. Every
siding, window, gutter and Andersen finding necessarily lands on `'other'`. **This is structural, not
a model failing.**

## What PR #114 shipped (`api/` only)

- **`raw_defect`** — the model's own string, kept when it differs from the coerced value. Nothing
  needs recovering after this.
- **`collect:true`** — opt-in, session-gated. Lifts the *prompt's* "at most 12, most significant" to
  "every distinct defect, repeats included, up to 40". **The instruction moves, not just the
  constant** — the model self-capping is the one truncation invisible from the response.
- **`dropped_by`** — which path took them.

Reviewer path is byte-identical: `collect` defaults false, `MAX_FINDINGS` stays 12.

## Settled — do not re-litigate

- **The expanded vocabulary is DERIVED FROM THE CLUSTERS, not hand-specified** (Theo, verbatim:
  *"using the clusters"*). The 294 `'other'` findings kept their `label` and `note` free text, so what
  the teacher actually called them is readable at zero API cost. **Do not propose a class list before
  reading them** — this project already shipped one change verified against invented shapes that was
  completely inert.
- Expanding `DEFECTS` is **two sites**: `api/detect.js` `DEFECTS` and `index.html:57117` `DEF_LABEL`.
  Defects and trades are separate vocabularies; the trade family only moves if a *trade* is added.
- **`recover_other.py` must stamp provenance on every recovered label** and tune for **precision, not
  recall**. It is a *third* label generator with its own error profile — 150 confident recoveries beat
  294 with a fuzzy tail, because v3 can then be trained with and without them and compared. Without
  the stamp you are back where `via` left you.
- **Ownership:** Hermes owns the Spark copy of `spark/hail_review.py` (already patched with `via`
  capture); **this repo takes the diff** rather than writing its own. The file lives in `spark/` here,
  so divergence is the hazard.

## Flagged, NOT fixed — needs Theo

**The `/api/detect` prompt is roof-framed throughout** — *"assisting a roofing inspector"*,
*"undamaged roofs exist"*, *"do not infer damage from the age or style of the roof."* Widening
`DEFECTS` will not fully help while the prompt still tells the model it is looking at a roof.
Changing it alters live behaviour for reps, so it wants a decision, not a quiet edit.

## Corrections I owe

- I said a rep running a siding walk **today** gets every finding labelled "Other." Mechanically true,
  **but zero walks exist** — nobody has hit it. Latent, not live. I overstated the urgency.
- I proposed four drop mechanisms and three were wrong. The story was compelling; only the
  measurement caught it. **Measure before theorising** — this file's own rule, earned again.
- I described the archive's 60k tags as YOLO output. They are `studio_tagger.py` — path keywords and
  aspect ratio, **no vision model**. Composition tags (aerial/close-up/wide), not anatomy. I read the
  schema *example* in `spark/STUDIO_TAGGING.md` and took it for what runs.

## Production state, verified against the database 5 Aug

**Everything on the Vision/Studio surface is built and EMPTY.** Checked, not assumed:

| table | rows |
|---|---:|
| `walks` · `walk_shots` | **0** · **0** |
| `studio_photos` | **0** — the Spark's 60,503 tagged photos have **not** been pushed |
| `showcase_pairs` | 1 |
| `inspection_reports` | 5 |

⚠️ **The `studio_photos` row above is superseded** — the push started 02:05 UTC and **6,290 landed
before it stalled**. See "The push stalled at 10%" below. The rest of the table still holds.

`walk_shots.findings` is jsonb and joins to `walks.trade` — it is exactly the right shape to confirm
the `'other'` mechanism end to end, and it will be usable the moment anyone runs a walk.

## ✅ RESOLVED LATER THE SAME NIGHT — build 596 shipped, the leak is closed

The clusters arrived and the work landed. **This supersedes the "blocked" note that used to sit
here.**

- **The clusters answered the scope question: NO SEVENTH TRADE.** The 16 exterior classes map onto
  the six already in `walks_trade_ck`. Derived from what the teacher actually called the 294 boxes
  (gutter 65, soffit/fascia 57, window 42, deck 42), not invented.
- **Build 596 (PR #116)** — `DEFECTS` 17 → 33, the keys verbatim from `exterior_vocab.py` on the
  Spark **and in its order**, so `DEFECT_KEYS` is index-aligned with the model's classes 0-32 and
  `other` stays at index 16. `DEF_LABEL` mirrored. Prompt is now **neutral base + trade-aware**
  (`TRADE_FOCUS`), using the trade `index.html:57402` had always passed and the route never read.
- **Confirmed in production:** on the first B batch `raw_defect` is **quiet** and exterior classes
  land under their own names. The leak is closed, verified by absence.
- ⚠️ **`renderClassify()` now renders 33 chips, not 17** (`index.html:57487`). The one visible cost.
  If it feels cluttered on a phone, the walk knows its trade — lead with that trade's classes.

## ✅ SQL APPLIED to production, 5 Aug ~03:55 UTC — do NOT run these again

Theo said "Can you run sql". Both merged files were applied with `apply_migration`, so they are in
`supabase_migrations.schema_migrations` alongside `studio_photos` and `studio_objects_rls`:

| migration | what landed |
|---|---|
| `studio_findings` | `studio_findings` table · `studio_photos.damage_tags text[]` + GIN index · `studio_refresh_damage_tags()` |
| `studio_media` | `studio_photos`: `kind`, `duration_s`, `live_pair_id`, `live_is_clip`, `lat`, `lon`, `device`, `event_id` · `studio_events` · `studio_private` · `studio_private_events` |
| `studio_findings_admin_gate_null_fix` | the security fix below |

Verified after applying: all 9 columns present, all 4 tables present, **RLS enabled on all four**,
policies are `is_cardinal_admin()` on the two work tables and `owner_email = my_email()` on the two
private ones, and all **6,290 existing `studio_photos` rows survived** with `kind='photo'` and an
empty `damage_tags`.

### ⚠ My own bug, caught minutes after applying — a definer function that failed OPEN

`studio_refresh_damage_tags()` is SECURITY DEFINER with an admin gate, and **the gate did not stop an
anonymous caller.** Full write-up as **BUG_CLASSES §12**; the two-line version:

- **`is_cardinal_admin()` returns NULL, not false, for anon** (`auth.email()` is NULL → `NULL in (…)`
  → `false OR NULL` → NULL). `IF NOT NULL THEN` does not fire, so the raise was skipped.
- **`revoke … from public` left `anon` holding EXECUTE**, because Supabase grants to anon /
  authenticated / service_role *directly*, not via `public`.

Fixed with `not coalesce(is_cardinal_admin(), false)` **and** an explicit `revoke … from anon`.
Re-verified all three callers: anon → `permission denied for function`; rep `nick@` → raises
`admin-only`; admin `theo@` → allowed, so the ingest path still works. The repo `.sql` now matches
production and carries the reasoning.

**The transferable half: the RLS policies calling the same function were never affected** — a policy
predicate evaluating to NULL filters the row out, which fails safe. Only the negated `IF` inverts.
Do not "fix" the policies.

## ⚠ The push stalled at 10% — and it was still running while doing nothing

**6,290 of 60,503 (~10%). First row 02:05 UTC, last 03:06 — exactly 61 minutes — then nothing.**
Hermes reported it "running, resumable," which was true and also completely misleading.

Root cause is the **same token-expiry defect already fixed in `hail_review.py` (PR #122)**:
`push_studio_tags.py` minted one token before the loop, both HTTP helpers flattened the status code
into a string, and the loop's `except Exception` counted every 401 as an ordinary failure and carried
on. Recorded as **BUG_CLASSES §13**.

Fixed with three defences: proactive refresh at 45 min, at-most-one re-auth per photo on 401, and a
**stall-out after 25 consecutive failures with a non-zero exit** so this can never again look healthy
from the outside. `spark/test_push_retry.py` executes the shipped `main()` and carries a negative
control that must lose photographs when the re-auth is disabled.

**The diagnostic worth keeping — ask the destination, not the process:**

```sql
select max(pushed_at) as last_write,
       count(*) filter (where pushed_at > now() - interval '5 minutes') as last_5min
  from studio_photos;
```

**Next: Theo re-runs the push on the Spark.** `.pushed.json` makes it resume from 6,290; it does not
need to start over.

## Metrics lessons that cost three wrong tables — read before quoting any number

**Three per-class tables in a row were wrong**, each published to the Spark's `CLAUDE.md` as
authoritative. The pattern every time: an extraction script partially failed, the partial data got
written down as fact. Guards now in place, all three cheap:

1. **`box.maps` is per-class mAP50-95, DESPITE THE NAME.** A table of it was published labelled
   mAP50. Caught by arithmetic: the 33 values averaged 0.1792, exactly the reported mAP50-95 of
   0.179, not the mAP50 of 0.278. **Reconcile the per-class mean against the reported aggregate** —
   one line, and it catches this whole class.
2. **Unmapped classes leak the aggregate.** Five classes with **zero val instances** printed 0.179,
   the overall figure, after an `IndexError` mid-extraction. They are MISSING, not zero. A sixth
   (`granule_loss`, 0.180 with 6 val instances) was nearly marked missing too — a false "no data"
   invites re-collecting data you already have.
3. **5 of 33 classes drew zero val instances from an unstratified split.** Dataset design, not a
   metrics bug, and **B does not fix it** — you can add 40 `nail_pop` boxes and still have an
   unmeasurable class. **Stratify before v4**, and print val instances per class beside every metric.

**Roof genuinely improved and the doc said otherwise for a while.** Apples-to-apples on mAP50-95
over the same 17 roof classes: v2 **0.155** → v3 roof-17 **0.274**, +77%, on unchanged roof boxes —
so it is the 120 epochs, not data. The exterior 16 at ~0.078 **dilute** the 33-class overall down to
0.179. "The new classes averaging in lifted the number" is backwards; near-zero classes drag a mean
down. (Caveat: the val splits differ, so it is not a controlled experiment.)

**Recall is flat at ~0.277 across conf 0.05/0.10/0.25** — v3 misses ~73% of ground-truth boxes at
any threshold. Not an over-confidence problem; threshold tuning will not fix it, more data will.

## Still outstanding

1. **The `hail_review.py` diff** — `--collect`, `--candidates`, `dropped_by` and `via` capture live
   **only on the Spark**. The file is in this repo, the two copies have diverged, and nothing
   surfaces that until someone edits the repo one. Hermes owns the Spark copy; this repo takes the
   diff. **Asked three times, not yet received.**
2. **Stratify the val split before v4 trains.**

## Still owed Theo, unblocked

**The Production hub revamp** — his explicit ask, unbuilt. **Punch is already built**
(`punch_items`, `cr-punch-*`, statuses already in the data), so it is wiring, not building. He wants
**labelled previews before code**.

---

# Session of 3 August 2026 (late) — THE POP-UP ROOF: the complete sixteen-spread book

**Branch `claude/contractor-vision-suite-bwq21i`, head `da08782`, PR #108 open (draft), CI green,
nothing uncommitted.** Theo reviews and merges; every commit deployed clean to the Vercel preview.

**`popup.html` is the whole book now — all sixteen spreads, tappable, front to back.** A `SPREADS`
registry, one spread mounted at a time, a page turn that folds the pop flat and stands it back up,
`#N` hash entry, honest "Spread N of 16" numbering. The contact sheet
(`popup_spreads_preview.html`) is the storyboard; the book is the artifact. Full trail in
`cardinal_build_log.md` — eight entries tonight, from "the retail order" through "THE BOOK IS
COMPLETE."

## Settled tonight — do not re-litigate

- **The house is THE T** (Theo's pick), brick chimney with mortar lines, worn Onyx coming off,
  **Duration BROWNWOOD going on** — spread 5 rings the BROWN board. Onyx is the OLD roof.
- **This is an install book, not an insurance book** (Theo, verbatim). Storm damage, the adjuster
  and the tailgate Number are deleted; Kitchen Table, Attic, Takeoff open the book. Do not restore.
- **"Tarps, not tractor"** — the tractor was a phone typo, removed everywhere; tarps protect the beds.
- **The bird ends every spread at translateX(0)** — the round trip is the book's rule. Interiors
  (2, 3) hide the pop-piece bird and draw a `sceneBird` (no `id="bird"`).
- **Spread 15 sweeps spread 7's REAL chips** — same DOM nodes, 34 + 6. Never re-scatter.
- **The yard sign stands from 7 onward**; `.birdpop` carries `z-index:2` because on phone widths
  the sign's fixed 84px overlaps the bird's slot (wide-screen "measured gap" arithmetic).

## Awaiting Theo

1. **Walk the whole book on the real iPad** — the pop hinge is proven there for spread 7 only.
2. Caption and joke rewrites — the beat scripts are drafts in his voice, his to correct.
3. **Crew names in spread 16** (Curtis, Beto, from the sheet's own notes) — confirm they belong in
   a client-facing book.
4. How the book ships (it is `noindex` at a guessable root path — same holding pattern as
   `ai-field-manual.html`).

## Verification state

`pw_book.js` (scratchpad) walks all sixteen in real Chromium — phases, distinct captions, beat
groups, sliders home, sign presence, page turns, chips scoping, both hash paths: ALL GREEN, zero
page errors. `pw_bird.js` / `pw_deck.js` re-pointed at `#7`, green — spread 7 unregressed. Every
spread rendered at phone size and eyeballed; the render pass caught what green harnesses did not,
five separate times (truck scale, gnome under its own joke tab, speck drone, landscape-iPad height,
sign hiding the bird).

Earlier this session (same day, before the book): the Vision Suite builds 574-593, studio.html,
and the roof-journey page — all logged in `cardinal_build_log.md` and merged or in PR #106/#108.

---

# Session of 1–2 August 2026 — builds 565–573, and one applied migration

**`main` is at `35fa7c9`, app stamp build 573. Branch `claude/git-log-oneline-7b9nbd` is merged and
clean — nothing uncommitted, nothing unpushed.** Every build below is live.

**⚠ The SQL is ALREADY APPLIED.** `estimates_update_policy.sql` was run against production through
the Supabase connector on Theo's instruction and verified afterwards (RLS on, 4 policies, **0
carrying the bare literal `true`**, 12 rows intact). It is idempotent, so re-running is harmless —
but do not treat it as pending work. The one-statement revert is recorded in `cardinal_build_log.md`.

## What shipped

| | |
|---|---|
| **565** | The address-autocomplete retry storm. The `catch` cleared its own guard while a rAF scanner re-attached, so with no Maps key it retried at 60fps **forever, on every screen**. Theo photographed the console climbing 21,335 → 29,873 in seconds. Also: **Discard** on an estimate, reusing the soft delete the AI review screen already had |
| **566** | The estimates list asked `projects` for `client_name` and `estimate`. The table has **neither** — every load returned 400. Removed rather than repaired, because repairing meant choosing a source Theo had not been shown |
| **567** | **Two rAF repaint loops.** The CRM chip and the landing greeting were repainting **every animation frame, forever** |
| **568** | The Estimates screen finally shows the **12 real estimates**. It had been querying two empty tables and never the full one. Cards now open the editor — that branch was a **dead stub** |
| **569** | **567's miss** — the landing weather strip was still looping. See "the lesson", below |
| **570** | Crews / Pricing Catalog / Company Documents stopped **trapping** you — `hideAllViews()` did not know they existed |
| **571** | The estimate editor trapped you the same way. Plus the **back button**, which walked straight past five overlays |
| **572** | Sales Floor, the Objections Coach and the Production board keep the left menu and use the desktop width (they were a 640px column in a 1440px window) |
| **573** | Dark mode for the Objections Coach, Pricing Catalog, Company Documents and Adjusters — four modules built white that stayed white in every theme |
| **SQL** | `estimates_update_policy.sql` — `est_update` was `USING (true)`: **any signed-in user could edit any estimate.** Now matches `est_delete` |

## ⚠ Read before trusting any test you run here

**Three hosts are blocked by this environment's egress policy:**

```
yipslubcptjoarblzbpl.supabase.co     (the app's own database)
app.cardinalroster.com               (the live app)
api.open-meteo.com                   (the landing weather)
```

Reported, not routed around — `/root/.ccr/README.md` says do not retry policy denials.

**This is not a footnote. Build 569 exists because of it.** 567's probe reported the landing loop
fixed. It was — *in a sandbox where the weather does not exist*. `wx()` returns early unless
`wxCached()` finds a reading, so with the host blocked and localStorage empty, the looping function
**never executed once**. The denial was even printed in a proxy status I had read that same session.

**The fix that generalises:** when a sandbox cannot reach a dependency, **seed its cache** and
reproduce the production condition. `loop_probe.js` now seeds `localStorage['cr-wx-dayton']` before
load; with that one line the loop reproduced instantly at 64.8 writes/sec.

The Supabase **connector** works (different path) — that is how the schema and rows were read. Only
direct HTTP to those hosts is blocked.

## Corrections I owe, in my own words

- **I reported 567 as fixing both re-render loops. It fixed one.** Theo's console after 568 deployed
  still showed `landingView ~245 mutations/sec`. 569 is the correction.
- **I told Theo the re-render loop was the missing-nav bug. It was not.** The menu's gate reads
  `getComputedStyle(el).display` on `navWrap` and `landingView`; rewriting descendant *text* cannot
  change either. The 566 build-log note claiming so is struck in place.
- **570 deliberately excluded the estimate editor on my judgement, and Theo hit it as a trap.** Both
  my reasons were wrong: the "editor exception" was about *showing* the menu, not navigation closing
  it; and "it would discard unsaved work" is false — its own Cancel calls the same `close()`, with no
  confirm and no dirty tracking anywhere in the module.
- **558/561 made the nav traps easier to walk into.** Lowering those overlays to z-index 60 so the
  menu would show through made every menu item *clickable* without making any of them close the
  overlay. The trap pre-existed; I made it reachable.
- **`metallicize`, `rerenderChipIfNeeded` and the duplicate-`#crPortalChip` theory are all innocent.**
  I had recorded them as suspects in the 566 note. The first probe pass implicated `metallicize` only
  because it sampled the boot burst.

## The lesson this session cost the most

**Reading the source failed three times; instrumenting it worked immediately.**

Every candidate I read for the re-render loops looked correctly guarded — because they *were*, in the
sense of having a guard. So: patch `appendChild` / `insertBefore` / `replaceChild` / `innerHTML` /
`textContent` / `className` on the prototypes **before the app's scripts run**, record
`new Error().stack` on every write, and sample only **past a settle window** so boot writes cannot
drown the signal. The top rows named the culprits outright, with line numbers.

`loop_probe.js` is in the session scratchpad and is worth keeping.

Second lesson, cheaper but recurring: **five gates this session tripped on comments the same patch had
just written** (`normalizeManual`, `openManualEstimate` ×2, `hideAllViews()`, `M.style.background`).
Scope assertions to the block, and assert on code *shapes* rather than bare identifiers. All five
aborted before any write, which is the design working.

## Next — nothing is blocked on code

- **Production hub revamp** — Theo asked for it explicitly: left nav plus punch-outs grouped
  new / remaining / closed. **Punch is already built** (`punch_items`, `cr-punch-*`, statuses already
  in the data) — this is wiring, not building. **It wants labelled previews before any code**, which
  is what he and I agreed; do not guess at it.
- **`cr-bpa-script`** — the fifth module sharing the `--cr-*` palette. Left untouched at 573 on
  purpose: it writes `M.style.background='#fff'` inline and has **no dark palette to fall back on**,
  so stripping the inline white would leave it with no background at all.
- **Admin Health reports four of its own bugs as infrastructure failures.** All four are the health
  check's fault — see `OPEN_ITEMS.md`.
- **`--cr-muted-2` in light mode is 2.38:1** — below the readability floor *today*, pre-existing.

## Waiting on Theo — do not nag, do not guess

- **Google Maps key** — he set it; I could not verify (host blocked). `/api/config` should report
  `"configured": true`. If autocomplete still fails, 565 made the console legible: **one** line
  instead of 20,000. `ApiNotActivatedMapError` almost always means the **legacy** Places API is not
  enabled — the app uses `google.maps.places.Autocomplete`, the old widget.
- **Two left rails** on the estimate builder (238px app menu + 224px document outline) — flagged at
  560, never answered.
- **The 640px → 940/1180px widths at 572** were my pick, not his. A board earns width; prose does
  not. Easy to change, one number each.

## Still only Theo

Everything about money, permissions and outward-facing email remains his call. The `est_update`
tightening was **asked and answered** ("1 run it in supabase") — do not extend it further without
asking.

---

# Session of 31 July 2026 (evening) — builds 487–509

**`main` is at `f397b52`, app stamp build 503. The branch is pushed and 5 commits
ahead, unmerged.** Open a PR from `claude/487-488-listview-contrast` and merge to get
504–509 live. Nothing is uncommitted; nothing is unpushed.

## What shipped

| | |
|---|---|
| **487** | List view unreadable at desktop width (1.57:1). **Not** the documents list — the handed-off task was wrong; see the correction below |
| **488** | What's New printed raw codes — 20 notes carried **Python** escape syntax, which JavaScript does not have. `BUG_CLASSES.md` §11 |
| **489** | Two unpicked contrast tokens **plus a third the audit missed** — it had only checked light theme |
| **490** | `api/sortphotos.js` + the client whitelist, whitelist shipped **before** the writer |
| **491** | Sort photos — moves every photograph in a report to its section and captions it |
| **492** | The General Exterior report, **derived** from `REPORT_TEMPLATE` (five of its ten sections already were the roof report's) |
| **493** | The app claimed "No client projects yet" whenever a load **failed** |
| **494** | Self Check could leave the whole app unable to scroll |
| **495** | **My bug:** 491's button never appeared — gated before the frame had loaded |
| **496** | CompanyCam search found nothing by address — terms ANDed across separate columns |
| **497** | Remove a photograph from a report |
| **498** | **My bug:** Sort hung silently — 24 photos in one POST against Vercel's 4.5 MB, and no timeout |
| **499** | **My bug:** the route made its model calls one at a time |
| **500** | Sort's timeout 45s to 90s, on measured evidence |
| **501–505** | **Every** Gemini route now falls back to OpenAI — 13 of them, audited not remembered |
| **506** | Search: `2444 Edenhill Ave` returned **0** because the record says "Avenue" |
| **507** | Sort fills the Areas of Concern table |
| **508** | The librarian refused to draw concepts — right fence, wrong catch |
| **509** | Resource Library reachable from every screen |

## Read before touching the environment

**Work only under `C:\Users\kpkor\OneDrive\Desktop\cardinal-push`.** Anything written
elsewhere lands in a sandbox layer Theo's own shell cannot see — a full clone, three
builds and four commits were made at `C:\Users\kpkor\repos\` and simply did not exist
for him. Test with a marker file before building, not after.

**I cannot push and cannot merge.** The GitHub connector is read-only (`403` on
`create_branch`) and git has no credential for `git:https://github.com` — GitHub
Desktop's token is stored separately and git cannot use it. **Theo pushes; Theo
merges.** Do not spend a session working around this; it cost him an hour of his
evening.

**`index.html` is CRLF in the working tree.** Python patching is unaffected (universal
newlines in, CRLF out, normalised to LF on commit). A **JavaScript** harness reads raw
bytes, so a multi-line anchor silently matches nothing — normalise first.

**`node --check` every file in `api/` after touching any route** — `check.yml` has no
`npm ci`, so its parse step cannot catch a bad import.

**Anchors: print `repr()` of the real text before writing one.** Three aborts today
came from copying an anchor out of whitespace-normalised display output. And note that
`saveBid` is `async function` — an extractor searching for `function saveBid(` starts
after `async ` and yields code whose `await` is a syntax error.

## Corrections I owe

**The contrast measurement previously in this file was wrong.** It named the wrong
surface, and its prescription would have taken the documents list from 12.63:1 down to
6.69:1. Corrected in the 483–489 section below.

**I told Theo seven routes had no OpenAI fallback. Three already had one.** I listed
them from memory instead of checking. Audit, do not remember.

**Gemini is not misconfigured; Google's capacity is the problem.** `gemini-3.5-flash`
measured 6–14 seconds and returned 503 about one call in four all evening, while OpenAI
answered in 0.6 s. Probe any model by name:
`https://app.cardinalroster.com/api/ai-status?model=gemini-3.6-flash`

## The lesson this session cost the most

**I gated logic and never delivery.** Three separate failures — an invisible button, a
silent hang, and a dead button afterwards — all passed rigorous harnesses, because the
harnesses asked *does the function work* and never *does the control appear, does the
request fit the platform's limits, does the work fit the function's time budget.*

Before calling a feature done: **check the control renders after a real load; check the
request size against 4.5 MB; check the work against the function timeout.** Those three,
before writing the harness.

## Next

**The community outcome form** — `OPEN_ITEMS.md` §1. Designed, agreed, **not built**,
and the largest remaining item. Its last open question is now answered (**check-back
default: 1 year**), the four flows are transcribed from the comp's own labels, and every
function to reuse is located and read.

It is a **build-from-design**: `references/outcome_v2.html` is a 204 KB visual comp
containing three `data-` attributes, all theming. It cannot be lifted. Estimating it as
"wire up the mockup" will be wrong.

It ships with §2, the second clock, which is a **216-character function** once
`check_back_at` exists.

## Still only Theo

Five partner emails (Kitty Hawk **has a live job**) · `GOOGLE_MAPS_API_KEY`
(**referrer-restrict in Google Cloud first**) · **486 has still never been used on a real
phone with real photographs** · and now: press **Sort photos** on a real report and judge
whether the model's section choices are sensible. **No gate here has ever made a real
Gemini call** — every AI claim in this log is about plumbing, never about answer quality.

---

# Session of 31 July 2026 (daytime) — builds 483–489

**483–486 merged (`main` at `0047bbb`, then `e9fa331` for docs). 487–489 are committed on
`claude/487-488-listview-contrast` and NOT pushed** — see "Waiting on Theo" for why and the one
command that fixes it. PRs #49, #50, #51, #52 merged.

**This session ran from a real local clone on Theo's Windows machine** —
`C:\Users\kpkor\repos\cardinal-inspections`, outside OneDrive, because OneDrive corrupts `.git`.
The mechanical gates run there unchanged: they import only stdlib plus `patch_lib`. `jsdom` lives in
the session scratchpad, never the repo. **No Chromium**, so no computed-style harness — that is the
one instrument this machine lacks.

| | |
|---|---|
| **483** | The librarian sheet was cut off by the iPhone home bar. `padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))` + `max-height:88dvh`. Both conventions were already in this file; the panel was the exception |
| **484** | Build index reads job names **first** (names → photos → stamp). New admin-gated `action:'stamp'`. Measured cause: 60,485 photos, 775 project ids, **zero** project rows — the pass had never been reached |
| **485** | The caption trial was not a sample — 53 photos, **1 job**, two days. `companycam_caption_sample()` (SQL **applied**) returns one photo from each of N different jobs; progress counts **jobs** |
| **486** | **CompanyCam photographs into an inspection report.** Picker in the report editor toolbar. Also fixes a pre-existing bug: captions on runtime-minted figures could not be typed in |
| **487** | The **list view's** documents were dark text on the dark page — `#333` at **1.57:1**, `var(--muted)` at **2.97:1**. Scoped to `#listView` with the retail token pair. **Not the documents list, which was never broken** — see the correction below |
| **488** | The updates panel was printing `U0001F4F8` instead of 📸. 20 `CHANGELOG` notes carried **Python** `\U` escapes, which JavaScript does not have. Repaired as surrogate pairs. `BUG_CLASSES.md` §11 |
| **489** | The two unpicked contrast tokens — **and a third the audit missed**, because that pass was scoped to light theme and `--rbe-empty-fg` fails in **both**. All four pairs now clear 4.5:1 |

## ⚠ Read `OPEN_ITEMS.md §0` before touching AI Inspections

It carries a **37-agent audit** (findings adversarially refuted) covering what are now **489–492**:
which route to copy, the three defects in it *not* to carry forward, the vocabulary collision, the
Section 2 trap, and Theo's two settled decisions. **Do not re-audit those surfaces.**

## ⚠ A correction I owe, in my own words

I told Theo *"a template is a section list plus a trade map — data, not code, so General ships
alongside Roof at no real cost."* **False.** There is exactly one inspection report template
(`REPORT_TEMPLATE`, ~163 KB); `GENERAL_TEMPLATE` is a **repair estimate** and the General Checklist
has **zero** file inputs. A General Exterior report is its own build (**492**, renumbered from 490).
I inferred it from my own mockup instead of checking the app.

## ⚠ The contrast measurement I left here was WRONG. Corrected at 487 — read before trusting it

I wrote, and it is false: *"`td.dates{color:#333}` is 1.48:1 on the dark page… `td.dates small` and
`td.title .ref` use `var(--muted)` and read at 7.10:1. Every tokenised line works; every hardcoded
one fails."*

**It could not have been true.** Those colours sit in the same table cell, so they share one
background — and `#333` is *darker* than `#5c5c5c`. On any dark ground `#333` is worse; on any light
ground it is better. `7.10:1` is unreachable for `#5c5c5c` against anything: pure white caps it at
**6.69:1**.

**It also named the wrong surface.** The documents list (`#estDocsMount` / `#inspDocsMount`) sits
under `#projectView`, where `table.reports` keeps `background:var(--paper)` = `#ffffff` at every
width. `#333` measures **12.63:1** there. **Tokenising it to `var(--muted)` — my own prescription —
would have taken 12.63:1 down to 6.69:1 and shipped a regression labelled a fix**, with every
mechanical gate green.

The real failure was `#listMount` inside `#listView`, where 44310 stripped the table background:
`#333` reads **1.57:1** and `var(--muted)` **2.97:1** over `--bg:#09090C`. **Shipped as 487.**

**Theo is NOT mobile-only** — he corrected this directly: desktop *and* an ultrawide. The doc set
recorded mobile-only, and that is why this survived: `table.reports tr{background:#fff}` inside
`@media (max-width:700px)` makes every row a white card on a phone, hiding it completely.
**Check contrast at desktop width, and measure against the element's own background, not the page
ground.**

## Next

**`OPEN_ITEMS.md` §0, in this order: the AI sort → shot lists → Save PDF → General Exterior.**

**Do not put build numbers back on those.** They carried numbers twice in one session (487–490, then
489–492) and both sets were invalidated within hours, because a number is assigned at **ship time in
ship order** — a plan cannot reserve one. Every unplanned fix falsified the queue and every
cross-reference to it. §0 now names the work instead, and says so.

The AI sort is the next substantial build; everything before it this session was small repair work.
Its audit is done and must not be re-run.

## Waiting on Theo — do not nag

Five partner emails (Kitty Hawk Realty **has a live job**); `GOOGLE_MAPS_API_KEY` (**referrer-restrict
in Google Cloud first**); and **486 has never been used on a real phone with real photographs** —
that verification is still outstanding.

~~Two contrast fixes unpicked~~ — **shipped at 489**, along with the dark-theme half the audit had
missed.

**Also outstanding: 487–489 are committed locally but NOT pushed.** Git on this machine has no
credential for `git:https://github.com` (the one in Credential Manager is an API token for
`api.github.com`), and the GitHub connector here is read-only — `403 Resource not accessible by
integration` on branch creation. One interactive `git push` caches the credential and unblocks every
future session on this machine:

```
cd C:/Users/kpkor/repos/cardinal-inspections
git push -u origin claude/487-488-listview-contrast
```

**The Vercel preview on the resulting PR is the only gate that has seen 487's colour render.** jsdom
cannot resolve `var()` and this machine has no Chromium.

---

# Session of 31 July 2026 (overnight, part two) — builds 475–482

**PR #47 is MERGED** (`main` at `6420f27`, build 474). Everything below is **PR #48**, still open as
a draft on the same branch, `check` green and all three Vercel previews Ready.

## The measurement that reframed the whole session

The full sync ran: **60,485 photos indexed**, +1,164 skipped as internal/inactive, reconciling to
61,649 exactly. **79 of them carry a caption** — 0.13%, flat across every year (10 in 2026, 39 in
2025, 30 in 2024, none before).

**Build 472's caption search was built over a field this account does not use.** That measurement
should have come before the build, not after. Everything from 476 onward follows from it.

`project_id`, `creator_name` and `captured_at` **are** populated on all 60,485, across **775 jobs**.

## What shipped

| | |
|---|---|
| **475** | Milestone pill legibility, option C (Theo's pick). Ink per **stage**, not per theme; two colours nudged. 16/16 pass. Bound to `LJ_SOLID`, never `STAGE_COLORS` — the same two hexes live in both |
| **476** | Photo search reads **job names and addresses**. `companycam_projects.sql` (**applied**) + FTS over caption + name + address + creator |
| **477** | The counter read `87,096 of 61,649`. A resumable run starting with no cursor must reset its counters too |
| **478** | **Try AI captions (50)** — a trial, not the backfill |
| **479** | The ask box was hidden whenever the CompanyCam block was open; "Cancel" → "← Back to chat" |
| **480** | ⤢ Expand — reuses `CardinalResourceImages`, with **both** `preventDefault()` and `stopPropagation()` |
| **481** | ⬇ **Save to device** — share sheet then anchors, the job gallery's shape since 216 |
| **482** | ✏️ **Draw on it** — reaches `cr-ped-script`, the editor that already existed |

## ⚠ SQL is ALREADY APPLIED

`companycam_projects` + the two `companycam_photos` columns + the four-field GIN index +
`companycam_backfill_project_names()` are live on Supabase. Idempotent and additive. **Do not
re-apply or treat as pending.**

## Waiting on Theo — do not nag, do not guess

1. **Merge #48**, then press **Try AI captions (50)** and report what the captions say. I read the
   50 back to him. **The 60,406 backfill is NOT built and must not be** without an explicit yes —
   it sends customers' job photographs to a third party.
2. **Five partner emails**: Kitty Hawk Realty (live job), C.G. Egli, CityWide Development, County
   Corp, James Construction. **Never guess one.**
3. `GOOGLE_MAPS_API_KEY` — **restrict the key in Google Cloud before setting it.**
4. Two contrast fixes unpicked: `--rbe-empty-fg` `#8a8a8a`→`#767676`, `--rbe-adm-fg`
   `#8a6a4a`→`#826446`.
5. **AI-generated images** — he said "not sure yet, show me what it can do". I proposed generated
   *illustrations* rather than altered photographs, because **this app runs insurance claims** and a
   restyled photo of a real roof reaching a supplement is an altered-evidence problem for him.
   **I also cannot verify his Gemini key has image generation at all** — the key is a Vercel env
   var. Nothing built. His call.

## My regressions this session, named

- **481's ghost button never applied.** `.lb-ccfile button.ghost` went in unprefixed; every
  neighbour in `cr-lib-styles` is scoped to `#rlLibPanel`, which out-specifies it. "Save to device"
  rendered **solid red, identical to "File selected."** Every gate was green. Caught by 482's scope
  diff, proven with `getComputedStyle` in Chromium, fixed in 482 before merge. **New bug class,
  `BUG_CLASSES.md` §9.**
- Said the sync was "still running" off a 0.9-second-old timestamp; it had stopped.
- Said a counter fix was "fixed and pushed", which read as deployed when it was in an unmerged PR.

## Where the doctrine paid, again

**The markup tool already existed.** `cr-ped-script` — pen, arrow, circle, text, rotate, undo, six
colours — behind the job-photo modal's "✏️ Edit" since long before this session, and unreachable
from CompanyCam. 482 reached it; it built nothing. **Seventh time on this project.**

## Traps recorded

- **`cc-` is two namespaces.** CompanyCam inside `cr-lib-script`, Community elsewhere
  (`data-cc-editbid`). It failed a negative control as a marker. Grep the block, not the prefix.
- **Canvas tainting.** A CompanyCam CDN URL painted into a canvas makes `toBlob()` throw
  `SecurityError` — markup would draw perfectly and fail only at save. All editor bytes come through
  `api/companycam.js` as base64 and reach the canvas as a `data:` URL.
- **Two anchor aborts**, both caught before any write: `canvasBlob(0.9)` stopped being unique
  because the same patch added a second encoder; `data-cc-edit` is a prefix of `data-cc-editbid`.

## Filed, not fixed

- **`annotated` is `true` on all 60,485 rows.** CompanyCam returns a `web_annotation` URI whether or
  not anyone drew on the photo. No caller depends on it.
- The bottom-bar light/dark glitch Theo reported — **he could not reproduce it and neither could I.**

## Standing harnesses in the session scratchpad

`dl481_harness.js` (29) · `edit482_editor.js` (20, real mouse against the real canvas) ·
`edit482_panel.js` (33) · `edit482_tile.js` (14) · `css482_harness.js` (15, computed CSS in a real
engine — **the only instrument that catches a lost rule**).

---

# Session of 31 July 2026 (overnight) — builds 468–474

**Not merged.** Everything below is on `claude/claude-md-documentation-qbvt85`, open as **PR #47**,
`check` green. `origin/main` has NOT moved. Builds 468–472 were merged earlier; **473, 474 and the
`sw.js` change are still in the PR.**

## What shipped

| | |
|---|---|
| **473** | Searchable index of all **61,649** CompanyCam photos. `companycam_index.sql` + `api/companycam-sync.js` (resumable, six pages a call). `api/companycam.js` searches the index when populated, live API when not |
| **474** | `api/config.js` — the route `index.html` has always fetched and never had. Plus `loadConfig`/`loadMaps` stop caching a *failure* for the life of the tab (30s floor) |
| `sw.js` | Same-origin assets → stale-while-revalidate. **CDN stays frozen deliberately** — floating majors, no test runner |
| docs | `.single()` backlog closed as non-existent · doc headers converted to provenance · live data audit |

## ⚠ SQL is ALREADY APPLIED

`companycam_photos` + `companycam_sync` exist on Supabase — 4 indexes, RLS on, 2 read policies, no
write policies, sync row seeded. **Do not re-apply or treat as pending.** Idempotent and additive.

## Waiting on Theo — do not nag, do not guess

1. **Merge #47**, then tap **Build index** in the CompanyCam panel. The status line then reads
   `61,649 photos indexed · N with no caption`. **That N is the whole point** — it is the exact
   size of any Gemini captioning job, which has been guesswork.
2. **`GOOGLE_MAPS_API_KEY` in Vercel — referrer-restrict it in Google Cloud FIRST.** Until then
   maps stay off, exactly as today. 474 cannot regress anything.
3. **5 of 10 community partners have no `contact_email`** (Kitty Hawk Realty has a live job).
   **Never guess these** — see OPEN_ITEMS.
4. `api/coach.js` calls the **OpenAI** API; a ChatGPT subscription does not fund it. Unverified.

## 🚫 Do NOT build without asking

**The Gemini caption backfill.** It sends customers' job photos to a third party. Theo is on paid
Gemini billing (confirmed 31 Jul), so rate limits are no longer the blocker — the decision is.

## Never verified, and it matters

**No call has ever been made against real CompanyCam data from a build sandbox.** Outbound to
`app.cardinalroster.com` and `*.supabase.co` is blocked by the agent proxy. Every assertion behind
468–474 is against a mock shaped like the measured schema. The measured schema itself came from
Theo running probes.

## My regressions this session, named

**469** click delegate bound to a node replaced on every render (buttons inert) · **470** panel CSS
scoped to an ancestor the panel does not sit under (rendered unstyled) · **471** wrong filter
entirely. 468 shipped working-but-unusable and took three builds to become reachable.

## False positives — recorded so they are not re-chased

- **The `.single()` "43-site backlog"** does not exist. `single()` only sets a header; the client
  throws only under `.throwOnError()`, which appears **0 times** in this repo. All 43 guard.
- **Community bid pre-fills the homeowner's address** — cannot fire, 0 of 10 community jobs have a
  project email. Becomes live if that count is ever non-zero.
- A keyword heuristic flagged **5** unguarded `.single()` sites; reading them showed **all 5** were
  false positives.

## Process lesson, six times over

**Six patch aborts from hardcoding a count** — `count('configPromise = null;')` matches its own
`var` declaration; `count('data-cc-sync')` missed a third site. All caught before a write, none
reached the artifact. **Name the sites or assert the shape; do not count a bare string.**

**Two of two reds were the test's fault** — `loadMaps` "still rejected" because it ends by loading
the real Google script no sandbox can reach; the SW offline fallback "failed" because a mock keyed
`caches.match('/')` on the raw string when the real Cache API resolves it against the origin.

---

**Cardinal Roofing & Renovations LLC — `app.cardinalroster.com`**
Session of 29 July 2026, 02:24 → 21:45 (America/New_York).

`origin/main` moved **`69dfb9f` → `202e6f3`**.
**34 pull requests merged.** PRs #7, #11, #29 were opened and closed without
merging (see §5).

---

## 1. Everything merged, in order

Verified against `git log origin/main`. Times are commit times.

### Foundation — telemetry, auth, routing (03:29 → 04:11)

| PR | Commit | Time | What |
|---|---|---|---|
| — | `150d4df` | 03:34 | **Error capture was silently discarding everything.** The telemetry pipeline swallowed its own payloads, so the app had been reporting nothing. |
| — | `35643e6` | 04:00 | Gated the model-backed API routes; standardised on `gemini-3.5-flash`. |
| — | `a0bb53b` | 04:01 | Removed a stray ungated `api:sol` route. |
| #1 | `37d7c25` | 04:10 | Service-worker offline shell fix. |
| #2 | `6a2b955` | 04:10 | Auth state subscription fix. |
| #3 | `9331248` | 04:10 | `robots.txt`. |
| #4 | `b79d9fd` | 04:10 | Removed stray files from `public/`. |
| #5 | `ad0217c` | 04:11 | Error-reporting pipeline. |
| #6 | `0348929` | 04:11 | Gate model routes. |

### Identity — the red/black/grey theme (04:55 → 05:18)

| PR | Commit | Time | What |
|---|---|---|---|
| #8 | `e5b2d8f` | 04:55 | **Retired the gold palette for red, black and grey.** The app-wide identity change. |
| #9 | `9b1bae7` | 05:18 | Landing page: unstuck scrolling, restored header padding, added the theme icon. |

### Community — the two-party problem (09:37 → 13:26)

This is the session's main thread of work. Community jobs bill a nonprofit for
work on a homeowner's house, and the code assumed one party.

| PR | Commit | Time | What |
|---|---|---|---|
| #10 | `e5c12f3` | 09:37 | **Bids were being emailed to the homeowner instead of the funding partner.** The partner is who pays and who decides. |
| #12 | `424363d` | 10:26 | Name the homeowner served *and* the party billed. Added the `data-l` attributes that PR #28 later keyed its styling off. |
| #13 | `e4e98fa` | 10:35 | The emailed bid now says who it is for and whose house it is. |
| #14 | `65593bf` | 10:51 | Deleted two unreachable renderers from the hub. |
| #15 | `0526945` | 11:00 | The inspection report names both parties. |
| #16 | `23a2b00` | 12:02 | The hub's Tools tiles stopped claiming "Not available yet" for tools that work. |
| #17 | `cfbcada` | 12:14 | **Removed an `overflow-y:auto !important` scroll band-aid.** It outranked the inline `overflow:hidden` every modal sets, so scroll chained into the page beneath. First appearance of the scroll-lock class of bug. |
| #18 | `3c1535d` | 12:40 | A Prospective Partners page, and fixed a validity check that never ran. |
| #19 | `e5ba1ce` | 12:49 | **Publish the estimate you are editing, not the newest one.** |
| #20 | `474ed9d` | 13:18 | General contractors were unselectable, and the picker bypassed masking. |
| #21 | `c3b379e` | 13:26 | **Age open bids against the promised deadline, not our own clock.** First of three copies of a day-early date bug. |

### Photos — public bucket to signed URLs (13:52 → 15:08)

A three-step migration so the storage bucket could be flipped private without
breaking image rendering.

| PR | Commit | Time | What |
|---|---|---|---|
| #22 | `dceb1c4` | 13:52 | Step 1 of 3 — serve in-app photos through signed URLs. |
| #23 | `f2193d9` | 14:19 | Step 2 of 3 — sign photos baked into documents. **This PR was inert; see §4.** It also introduced the scroll regression fixed in #37. |
| #24 | `f6da5f3` | 14:54 | Step 3 of 3 — **derive the storage path from the URL**, which is what made #23 actually work. 215/215 paths resolved exactly. |
| #25 | `422cf2f` | 15:04 | Made the app private-bucket-safe *before* flipping the bucket: a global repaint pass plus service-key download in `api/estimate.js`. |
| #26 | `53e0595` | 15:08 | **Declared `@supabase/supabase-js` as a dependency — two serverless functions had never run.** An undeclared import; the functions failed on cold start, permanently. |

### Community identity — green, and no blue (16:54 → 19:11)

| PR | Commit | Time | What |
|---|---|---|---|
| #27 | `896fd4c` | 16:54 | **One green, zero blue, and both surfaces follow the theme.** The `--ccm-*` palette: 57 token declarations, `:root` dark default with a `[data-theme="rb-light"]` override. |
| #28 | `3a6dc79` | 18:57 | **Mark the party being billed.** Keyed off the `data-l` attributes from #12. |
| #30 | `8fac62a` | 18:59 | **Sort, filter and direction toggle on the bid table** — 7 sorts, 6 filter groups. Also fixed the `days()` day-early bug. |
| #31 | `ad5b83f` | 19:11 | Tokenised the last 7 hard-coded shadows. |

### Community workflow — outcomes and stages (19:36 → 20:34)

| PR | Commit | Time | What |
|---|---|---|---|
| #32 | `4bd71be` | 19:36 | **Routed the thread actions.** Replaced a blind dispatcher with 5 real actions. Also the third copy of the day-early date bug. |
| #33 | `f7c3b4c` | 20:19 | **Stopped asking why a community bid was lost.** Theo: a grant not funding this cycle is not a lost sale. |
| #34 | `51bd483` | 20:34 | **A real `OnHold` stage** for bids waiting on a grant cycle. 8 coordinated edits. |

### Blue removal and the scroll fix (21:15 → 21:32)

| PR | Commit | Time | What |
|---|---|---|---|
| #35 | `65f1a13` | 21:15 | Removed the blue that is genuinely community-scoped — 4 rules, including the whole-CRM navy backdrop. |
| #36 | `c9133df` | 21:22 | De-blued community analytics and the punch panel — 25 more rules via `body.cr-cc-open`. |
| #37 | `202e6f3` | 21:32 | **Stopped `openPreview` locking body scroll on a screen the user had already left.** My own regression from #23. |

---

## 2. What the numbers say now

Measured on `202e6f3`:

| Metric | Value | Note |
|---|---|---|
| Blue/cyan CSS rules reachable from Community | **221** | from 253 total; 3 gated away; 250 → 246 (#35) → 221 (#36) |
| Modules writing the global body scroll lock | **13** | 15 lock sites, 19 release sites, all balanced |
| `normStage` copies | **6** | 1 whitelist + 5 delegates |
| `.single()` calls | **43** | throws on zero rows |
| `.maybeSingle()` calls | **0** | |
| `async` onclick handlers | **36** | most without a `catch` |
| `--ccm-*` token declarations | **57** | |
| `STAGES` | `Lead, Prospect, OnHold, Approved, Scheduled, Completed, Invoiced, Closed, Lost` | |

---

## 3. The photos bucket

`storage.buckets.public` for `photos` was flipped **`true` → `false`**.

- **Origin honours it.** A cache-busted anonymous request returns
  `400 "Bucket not found"`.
- **Theo confirmed photos still render** in the app.
- **But 11 of 26 sampled objects (42%) still served from the Cloudflare edge**
  with `Cache-Control: public, max-age=31536000`. I pulled 5,417 KB
  anonymously *after* the flip. Cloudflare caches independently of the
  bucket's `public` flag, and `max-age` is one year.

**This is not fully closed.** See `OPEN_ITEMS.md` §4.

Rollback, if photos ever break:

```sql
update storage.buckets set public = true where id = 'photos';
```

---

## 4. Where I was wrong

These are all mine, all caught during the session, and all corrected. They are
recorded because the *pattern* matters more than the individual mistakes —
`BUG_CLASSES.md` §4 generalises them.

**PR #23 shipped inert.** I tested document photo-signing against `{path, url}`
fixtures. **Zero** estimate photo objects in the real database have `path` or
`storage_path`. The code was correct and did nothing. I found it by running the
shipped functions against the real object shape, and fixed it in #24 by
deriving the path from the URL. *Test against production shapes, not the
shapes you find convenient.*

**"The flip is one step away" was wrong.** I said the bucket was ready to go
private. Auditing found five more code lineages that read photos, and
`api/estimate.js` was live and would have broken. The flip needed #25 first.

**"Zero blue" covered 2 of 35 stylesheets.** Theo caught this. I had made a
confident claim from a block-level scan. A rule-level census found **250**
reachable blue rules.

**The green emphasis never shipped in #27.** Every preview I sent showed it.
Production did not have it. Theo caught it. It shipped in #28.

**I invented a "C.G. Egli Inc" row** in a preview. No community job bills a
general contractor — the real split is nonprofit 11, property manager 1, GC 0.

**Stage pills showed the wrong vocabulary.** Community renders "Bid Requested"
and "Bid Submitted", not "Lead"/"Prospect". Early previews were wrong.

**Two block-level blue classifiers misfiled the Punch List** as
insurance-only, because its CSS mentions "claim" — while it is the panel Theo
had photographed *on the community page*. Rule-level classification fixed it,
and I validated against all three of his screenshots before editing anything.

**PR #37 was my own regression from #23.** Making `openPreview` async put a
network round-trip between the tap and the scroll lock.

---

## 5. PRs opened and not merged

- **#29** — squash-rebase conflicts. Rebuilt as **#30** with a byte-identical
  blob, so nothing was lost.
- **#7, #11** — closed during the session; superseded by adjacent work. No
  content from either is missing from `main`.

---

## 6. Artifacts produced

Design previews. **`/agent/workspace/` was the Hyperagent sandbox and is not reachable from
anywhere else** — only the agreed outcome design has been recovered into this repo, at
`.claude/skills/cardinal-build/references/outcome_v2.html`. The rest are listed for the record and are **not openable**; ask Theo to re-export if one is
needed:

| File | Purpose |
|---|---|
| `community_identity_v3.html` | green identity, dark + light, against red/black/grey |
| `community_green_noblue.html` | the green-and-no-blue palette Theo approved |
| `community_shipped_previews.html` | desktop + mobile, post-ship verification |
| `billed_party_previews.html` | billed-party emphasis options |
| `sortfilter_previews.html` | sort/filter/toggle, adapted to Community |
| `outcome_five_styles.html` | five outcome-form directions |
| `outcome_v2.html` | Style 4 layout with Style 2's flow — **the agreed design** · ✅ **recovered into `references/`** |
| `cardinal_brief.html` | opening architecture brief |
| `rls_audit.html` | row-level-security audit |

`probe_dark.html` / `probe_light.html` were throwaway token-resolution probes.

---

## 7. State at hand-off

- `origin/main` = **`202e6f3`**, deployed.
- Working clone at `/agent/workspace/clone` was the sandbox's own checkout — **not a path any
  other program can use.** Ignore it.
- All 99 script blocks parse. Tag and brace balance verified.
- No known broken behaviour in Retail or Insurance — every community change
  this session was gated by `body[data-crm="community"]`, `body.cr-cc-open`,
  `IC_SKIP`, or `PIPE_SKIP`.
- `OnHold` exists in the whitelist but **nothing writes it yet**. That is
  deliberate and correct ordering; the outcome form is what will write it.

---

## Carried forward — three false alarms — do not re-flag these

All three were flagged mid-session as "never got the dark treatment," and all three were wrong. This is the counterpart to the prime doctrine (*things that look missing are usually buried*): **not every light-coloured thing on a dark ground is a gap.**

- **`.dashcard`** — the "hardcoded white ribbon." Hidden by `#mainView .dashcard{display:none}` since build 352, single instance, inside `mainView`. **Dead markup**, deliberately kept because deleting markup with boot listeners has broken the app before.
- **`#cr-hd2-ribbon`** — the visible clock/date bar. Part of the **header chrome**, which has its own per-CRM token system (`--hbg` / `--hln` / `--hac` / `--tgrad`) independent of the page theme. Dark chrome framing a light page is the intended design. It stayed correct in every screenshot all night.
- **The calendars** — a deliberate **paper-on-iron** design. Cream cells on the dark ground is *why* they read correctly in dark mode. See §6.

**Ask first: is it (a) hidden, (b) chrome with its own system, or (c) deliberate contrast?** Only then is it a gap.


*Carried forward verbatim from the 374–388 session handoff. Still binding.*

**Also carried forward:** that session's "what's next" list (client profile, standalone
Punch page, Production board, Client Directory) is **obsolete** — all four shipped at
builds 389–393. `OPEN_ITEMS.md` §4 is the current light-theme status; this session's
open list is in the "Added 29 July 2026" section of the same file.
