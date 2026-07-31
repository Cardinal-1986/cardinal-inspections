# Hand-Off — Session Log

> **Newest session first.** The 29 July log begins below the 31 July section.

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

Design previews, all in `/agent/workspace/`:

| File | Purpose |
|---|---|
| `community_identity_v3.html` | green identity, dark + light, against red/black/grey |
| `community_green_noblue.html` | the green-and-no-blue palette Theo approved |
| `community_shipped_previews.html` | desktop + mobile, post-ship verification |
| `billed_party_previews.html` | billed-party emphasis options |
| `sortfilter_previews.html` | sort/filter/toggle, adapted to Community |
| `outcome_five_styles.html` | five outcome-form directions |
| `outcome_v2.html` | Style 4 layout with Style 2's flow — **the agreed design** |
| `cardinal_brief.html` | opening architecture brief |
| `rls_audit.html` | row-level-security audit |

`probe_dark.html` / `probe_light.html` were throwaway token-resolution probes.

---

## 7. State at hand-off

- `origin/main` = **`202e6f3`**, deployed.
- Working clone at `/agent/workspace/clone` is clean and on `origin/main`.
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
