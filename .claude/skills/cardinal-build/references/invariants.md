# Invariants — breaking these corrupts data silently

*Snapshot at build 427, each figure re-verified against `index.html` on `main`.*

These are not style rules. Each one has a silent failure mode: no error, no red gate, wrong data.

## `normStage()` is a whitelist — and it fails to `'Lead'`

Six copies exist; five delegate to the one in the main block. The core is:

```js
return STAGES.indexOf(s) !== -1 ? s : 'Lead';
```

**Anything unrecognised becomes `'Lead'` with no error.** Therefore **`STAGES` must contain a stage value before any row is given it.** Ship the whitelist entry in its own commit, *before* the writer. Reversed, every affected job silently renders as a brand-new lead — and you cannot tell from the data which ones were real leads.

Same ordering rule for `LEGACY_STAGE`, `IC_SKIP`, `PIPE_SKIP`.

**Corollary — grep for the convention before inventing a mechanism.** `IC_SKIP` (per-CRM stage hiding) and `LEGACY_STAGE` (stage aliases) already existed; `PIPE_SKIP` was added by copying `IC_SKIP`'s shape. A new mechanism beside an existing one is a bug with a delay on it.

## Never mutate `estimates.photos`

`saveEstimate()` persists the array verbatim. Writing a signed (expiring) URL into it **corrupts the record permanently** — the URL dies, the reference is gone. **Sign for display only**, never in the stored object.

## Community bills one party for work on another's house

**Payer, occupant and contact are three roles and routinely three different entities.** Bids email the **funding partner**, not the homeowner. Any code touching "the client" in Community must say which one. **2 of 12 community jobs have no homeowner recorded at all** — code that assumes one will throw or silently mis-address.

Related: **never write an unverified email address into `community_partners`.** A bid sent to a guessed address is a lost bid. Ask.

## `.single()` throws on zero rows — there are 43 of them and zero `.maybeSingle()`

*Verified at 427: `.single()` = 43 code occurrences across 16 modules; `.maybeSingle()` = 0.* Use `.maybeSingle()` wherever absence is legal. Every one of the 43 is a potential thrown error on a legitimately empty result.

## One global scroll lock, 13 modules, no reconciler

*Verified at 427 with the lexer: `document.body.style.overflow` appears **35 times in real code across 13 distinct modules** (a bare regex says 36 and would have you counting a hit outside the script blocks). 15 of those are locks.*

Every lock/release pair is individually balanced, but **it leaks on any early return or throw between lock and release**, and there is no reconciler. **This class has recurred three times.** Do not add a 14th writer. `hideAllViews()` releases a stuck lock (364) — that is the existing safety net, not a licence to add more.

## Adding `await` to a synchronous function is never a local change

It opens a window in which the user can leave. **List every side effect after the `await` and revalidate the precondition.** A signed-URL round-trip inserted before a scroll lock froze the page with no overlay to dismiss.

## Palette tokens need literal fallbacks

When referenced from outside the stylesheet that declares them: `var(--ccm-card,#161918)`, **never bare**. A bare `var()` on an undeclared token computes to nothing, which looks like a missing element rather than a missing colour.

## Money and identity

- **Money has one chokepoint**: `bidAmt()`. Fix money there, never per-block.
- **Client name column is `name`.**
- **`stage_since` must be written on creation.**
- **`project_assigned_rep()` takes `p.checklist`, not `p.id`** — RLS-critical.
- `is_cardinal_admin()` is security-definer to avoid RLS recursion. Theo + Joan are hardcoded admin fallbacks in SQL *and* API.
- `estimate_line_items` stays unscoped — it is the shared price book.

## The build label: 20 version strings, 5 builds, two separators

**Two sessions measured this independently and got 9/4 and 6-distinct. Both were low. The cause is that there are two separator forms, and any regex assuming one silently misses the other.**

| Form | Example | Count |
|---|---|---:|
| space | `v2026-07-29 build 427` | 9 |
| middot (U+00B7) | `v2026-07-22 · build 148` | 11 |

**Honest count: 20 version strings, 5 distinct builds — 95, 146, 148, 404, 427.** *Re-verified against `main`; all 11 middots are U+00B7, no other bullet variant occurs.*

**Build 148 was missing from every earlier list**, because it only ever appears in the middot form (estimates + pricing module banners, ×4).

| Build | Count | Where |
|---|---:|---|
| **427** | 1 | nav menu `<div>` — **the app version, and the only version string in rendered markup** |
| 404 | 1 | `.cr-c-footer` |
| 95 | 2 | claims footer + banner (date is 6 days in the future — unexplained; **do not "fix"**) |
| 146 | 12 | analytics / Keeper / portals / adjuster / coach |
| 148 | 4 | estimates + pricing banners |

**The separator correlates exactly with the location** — verified by classifying all 20:

- **middot ×11 → HTML banner comments, every one.**
- **space ×9 → 8 JS footer-template string literals + the 1 rendered app stamp** (line 3104, in the nav menu `<div>` immediately after `#signOutBtn`).

So: **every version string except the app stamp lives in a footer template or a banner comment. That is what makes the app stamp identifiable** — it is the only one that is neither commented out nor inside a string literal. A grep-time pass can use that; **runtime code cannot**, which is the whole reason `data-cr-footer` matters.

**Build numbers are ordering, not inventory** — 234, 241 and 299 are each reused for unrelated work and there are 30 gaps. **Never renumber history**; 82 source comments cite build numbers.

## The label gate reports PASS when only a module is bumped

`scripts/check_build.py` compares `sorted(set(LABEL_RE.findall(src)))` between builds. The regex already captures the build number — its own comment records the false RED on 390/391 that prompted that fix — but **comparing the set means any label changing satisfies the gate.**

Tested against `main`:

| Scenario | Gate says | Correct |
|---|---|---|
| app stamp 427 → 428 | PASS | PASS |
| only module 146 → 147, app stamp untouched | **PASS** | **FAIL** |
| nothing bumped | FAIL | FAIL |

**The gate cannot distinguish "the version users see was bumped" from "some plugin footer changed."** I reproduced the table above against the bundled copy: PASS / **PASS** / FAIL.

**The two copies of the gate fail differently on the count, for the same root cause:**

- The repo copy emits **6** distinct labels instead of 5 — an optional `(?:\s+build\s+\d+)?` group half-matches the middot form and yields bare dates.
- The bundled copy emits **4** — its regex requires the space form (`v2026-[0-9-]+ build [0-9]+`), so it misses all 11 middot strings and **never sees build 148 at all.**

Neither is right. Whoever lands the fix should match both separators explicitly and then anchor on the app stamp rather than on the set.

⚠ **`check_build.py` is deliberately NOT being edited to fix this.** It is under edit in a parallel session, and two people rewriting one gate is how you end up with a gate nobody trusts. The finding and the proposed anchor are documented in `cardinal_build_log.md` §7 for whoever lands the fix. **Until then: when the label gate passes, confirm by eye that the app stamp specifically moved.**

## `data-cr-footer` — one attribute, three silent failures — SHIPPED in build 428

**Status: fixed in build 428** (2 edits, +211 chars: the attribute on the app stamp `<div>` + a CHANGELOG entry). At time of writing the PR is pushed (blob `8611c941`) and awaiting Theo's merge — verify with:

```bash
curl -s https://raw.githubusercontent.com/Cardinal-1986/cardinal-inspections/main/index.html | grep -c '<div data-cr-footer'
# 1 = merged; 0 = still pre-428
```

**The full mechanism, because the blast radius was bigger than "wrong number":**

- `currentBuild()` and `buildTag()` both query `'.menu-footer, [data-cr-footer]'` — neither existed in markup (all four string occurrences live in JS source). Both fell to fallbacks.
- `currentBuild()` scans `document.body.textContent.slice(0, 40000)`. **`textContent` includes `<style>` and `<script>` text**, so the first `/build\s+(\d+)/` was the CSS comment `/* iTel reports (build 406) */` at char **29,523**. The real stamp sits at char **175,706** — outside the window. It returned 406.
- **The wrong value then became a persistent gate:** with the watermark written as 406, `autoShow()`'s `cur > lastSeen` was `406 > 406 = false` — **What's New never auto-opened again, for anyone.** And with `CHANGELOG` topping out at 342, manual `show()` fell to `CHANGELOG.slice(0, 5)` — permanently displaying builds 338–342, including "Gold home button" copy describing a palette retired the same day.
- `buildTag()` returned `''`, and the error reporter appends it conditionally — **no crash report carried a build number.** This started mattering the day `150d4df` fixed the capture pipeline: reports finally flowed, unstamped.
- Third consumer: the gate — `check_build.py`'s `app_stamp()` (PR #39) prefers this attribute and only falls back to an em-dash heuristic.

Build 428 deliberately reuses 427's date — **two builds in one day is routine, and it exercises exactly what the old date-only label gate got wrong.**

Verified 10/10 by extracting the **shipped** functions and running them against a DOM stub — the stub validated first by **reproducing the documented bug on unpatched `main`** (`currentBuild() → 406`, `buildTag() → ''`) before being trusted on the patched file.
