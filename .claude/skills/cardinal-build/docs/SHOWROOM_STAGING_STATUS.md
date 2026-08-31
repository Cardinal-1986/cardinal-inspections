# Showroom staging — status, data access, results, cutover

*31 Aug 2026. `index.html` (Cardinal) is byte-identical at build **1185**. No CRM call site,
hostname behaviour, DNS or production deployment was touched.*

> ⚠️ **UPDATED after Theo used it. Six defects were found on the deployed app — every one of
> them in the shell or the CI I wrote, none in the relocated modules, and none visible to any
> mechanical gate.** Three were reported by Theo from a screenshot (`bd9a907`); two more were
> found by looking at the app afterwards (`fa14733`); the sixth is that **this repo's own CI had
> never once passed** (`f61ff7c`). **§5 is the record — read it before trusting the “verified”
> language elsewhere in this document.** The relocation itself has held: the five module files
> have not changed a byte since the first push.

## 1. ✅ DEPLOYED — the staging URL

**https://cardinal-showroom.vercel.app**
branch alias: `https://cardinal-showroom-git-main-theodorion1986-8546s-projects.vercel.app`

⚠️ **Precisely: that is the Showroom project's own PRODUCTION domain**, because `main` is its
production branch — it is not a PR preview. It is staging in the sense that matters: it is **not**
`showroom.cardinalroster.com`, and **no DNS was touched.**

**Repository:** `Cardinal-1986/cardinal-showroom`, `main` at **`fa14733`**.

Six commits: `a9f9f45` the app · `9b771a5` the `maxDuration` budget · `3d9ccaa` the missing
`_staff.js` · **`bd9a907` the three broken destinations** · **`fa14733` black photographs and a
header that pushed Present off the phone** · **`f61ff7c` the secret check that failed on its own
definition**. The last three are §5.

✅ **Showroom CI is GREEN — for the first time, at `f61ff7c`.** Run 6 of 6; runs 1–5 were all red
and I had looked at none of them. See §5, defect 6.

### Hash verification — the deployed bytes, not just a 200

Fetched from the live site and hashed against the local tree, because "it returns 200" is not
evidence that what is serving is what was gated:

| file | deployed | local | |
|---|---|---|---|
| `index.html` | `3cb012a7d4092ebf` | `3cb012a7d4092ebf` | ✅ |
| `showcase.js` | `d52d272efd6be661` | `d52d272efd6be661` | ✅ |
| `showcase.css` | `67aa2502a4f1a9c8` | `67aa2502a4f1a9c8` | ✅ |
| `colors.js` | `f7e706d1b4d9e4e4` | `f7e706d1b4d9e4e4` | ✅ |
| `colors.css` | `c4d1bb3572e4a80f` | `c4d1bb3572e4a80f` | ✅ |
| `showroom-images.js` | `ac7cab8e517717b9` | `ac7cab8e517717b9` | ✅ |

Re-fetched and re-hashed at **`fa14733`**, after the §5 fixes. Serving
`<title>Cardinal Showroom</title>` and `cr-showroom-auth`.

⚠️ **`index.html` no longer matches PR #584's manifest, and that is correct** — it carries the
shell fixes made after the PR was gated (it was `adff0a09e61c11c5` at `9b771a5`). **The five
module files ARE byte-identical to the manifest** and have not moved since the first push, which
is the proof that everything found since was the shell rather than the relocation.

The two §5 fixes were confirmed **in the deployed bytes**, not merely in the commit: the live file
contains `out[list[i]] = d.signedUrl` once, contains `out[row.path]` **zero** times, and carries
both `flex-wrap:wrap` and the `max-width:560px` query.

**`.vercelignore` holds:** `.claude/…/module_source.cjs`, `README.md` and
`.github/workflows/check.yml` all return **404**. The gates and the doc set are not served.

⚠️ **CORRECTION — `/api/detect` was BROKEN, and this document said otherwise.** The first version
of this section read *"returns 500, not 404 — the function deployed and runs; it fails only for the
missing key."* **That was wrong, and it was asserted without checking.** The evidence against it
was already in the same probe: a **GET** also returned 500, when it should have been a plain 405.
A route that fails on a GET is failing before it reads any configuration.

The real cause: `detect.js` does `import { isStaff } from './_staff.js'`, and **the route was
copied into this repo without its sibling module** — `FUNCTION_INVOCATION_FAILED` at module load,
on every request. ⚠️ `node --check` cannot see this: the file parses perfectly, it simply imports
something that is not there.

`_staff.js` is not incidental. It is the staff authorization check added at build 1016, after an
audit found the AI routes trusting any confirmed Supabase session while public signup was enabled
— a self-registered outsider could burn Cardinal's paid keys. It is now in this repo verbatim.

✅ **Fixed in `3d9ccaa`**, and verified against the live deployment:

| request | before | after |
|---|---|---|
| `GET /api/detect` | `FUNCTION_INVOCATION_FAILED` 500 | **405** `{"error":"POST only"}` |
| `POST`, no auth | 500 | **401** `{"error":"Sign in required"}` |
| `POST`, bogus token | 500 | **401** `{"error":"Invalid session"}` |

⚠️ **SECOND INSTANCE OF ONE CLASS: copying a serverless route is not copying the route.** First its
`vercel.json` `maxDuration` budget, then its sibling import. A CI step now resolves every local
import in `api/`, so there is not a third.

⚠️ **Whether `GEMINI_API_KEY` is set still cannot be confirmed from outside**, and this document
must not claim it either way. The key is read only *after* the auth chain passes, so every
reachable response stops at 401 by design. It shows on the first authenticated call with a real
photograph. See §7.

### Why it did not deploy on the first push, and the real defect that fixed it

The Vercel project was linked **after** the initial push, so no webhook had ever fired and the
project sat at zero deployments. I could not trigger one through the API: the project lives in a
Vercel scope this token cannot act in — `list_deployments` answers **403, not 404**, which is how
its existence was established rather than assumed.

So the trigger had to be a push. **It was not an empty commit.** `api/detect.js` had been copied
into this project *without the configuration that makes it work*: Cardinal's own `vercel.json`
raises that route to `maxDuration: 60` because it is a Gemini vision call over a full inspection
photograph, and the Showroom had no `vercel.json` at all. Left alone it would have **timed out on
every real photograph while looking perfectly deployed** — a correct-looking deployment of a
broken route. Commit `9b771a5` adds it, and pushing it produced the first build.

⚠️ **Copying a serverless route is not copying the route.** Its `maxDuration`, and any other
`vercel.json` entry, travel with it or it is a different function.

### The two access blocks, recorded because they were not the ones expected

1. `POST /user/repos` → **403 Resource not accessible by integration.** Creating a repository is
   simply not a permission the Claude GitHub App holds. Theo created it.
2. After creation, `add_repo` attached it read-only and the first push was **refused** — the App
   was not installed *for that repository*. A new repo is not added to an existing installation
   automatically. Granting it was the last blocker.

## 2. What was built

| | |
|---|---|
| **Shell** | `index.html` — own sign-in, Prepare/Present, project pack, Project Photos, launcher |
| **Session key** | `storageKey: 'cr-showroom-auth'`, following `cr-viz-auth` (807) |
| **Modules** | Showcase and OC Colors relocated **together**, as external files |
| **Image utility** | `showroom-images.js` — **one Showroom-owned** `shrink()` + the three renditions |
| **Own API** | `api/detect.js` **copied**, not called across |
| **Launcher** | Showcase · OC Colors (native) · Studio · Visualizer (separate apps, linked) |
| **Pop-Up Roof** | **absent, deliberately** — recorded as a future pre-install experience |

**The cross-module seam is gone.** `colors.js` had `var S = window.CardinalShowcase;` for its
image toolchain — the dependency that made moving Showcase alone impossible. It now reads
`window.CardinalShowroomImages`. **Zero live `CardinalShowcase` references remain in `colors.js`**
(the single hit is my own comment, classified as prose). This is Theo's option 1 with no
temporary debt added to `cr-occ-script`.

⚠ **`/api/detect` was a runtime dependency on Cardinal that neither the spike nor the boundary
doc caught.** `showcase.js` does `fetch('/api/detect')`. Left alone it would either 404 in the
Showroom or, worse, be "fixed" by pointing at `app.cardinalroster.com` — a cross-app call, exactly
the coupling trigger 1 exists to remove. The route is copied instead. **It needs `GEMINI_API_KEY`
set in the Showroom's own Vercel project; until then The Walk's detection will fail there, loudly.
The key must never be committed.**

⚠ **The host contract is bigger than the spike implied.** The spike said "one bare global for
Showcase, two for Colors". Measured on the relocated files: `showcase.js` references **13**
`window.*` names and `colors.js` **10**. The shell answers every one. The spike counted
*undeclared identifiers*; the host surface is a different and larger thing.

## 3. Data-access matrix — measured from `pg_policies`, not assumed

| Table | Read | Write | Showroom's use |
|---|---|---|---|
| `oc_colors` | `auth.role() = 'authenticated'` — **all staff** | `is_cardinal_admin()` | OC Colors catalogue |
| `showcase_pairs` | authenticated AND (`published` OR admin) | admin only | Showcase pairs |
| `workmanship_pairs` | authenticated AND (`published` OR admin) | admin only | Hall of Fame |
| `walks` | authenticated AND (`published` OR admin) | admin only | The Walk |
| `walk_shots` | authenticated, via a published walk | admin only | The Walk |
| `projects` | `is_full_access()` OR creator OR assigned rep OR `sales_rep` | same | the opaque id lookup |
| `project_photos` | `is_full_access()` OR the project exists | same | Project Photos |
| `studio_tray` | **admin only** | admin only | not read by the Showroom |
| storage `photos` | signed URLs, display only | — | photo rendering |

✅ **No RLS migration is required, and my own boundary doc was wrong to say one was.** §3 asserted
a migration had to land "before the Showroom reads anything". The policies already admit every
authenticated staff member to the presentation tables, and `projects` already scopes per user —
so **RLS, not the page, decides what a viewer sees, today.** I asserted that without checking;
the query above is the check.

**Mutations:** every write on the presentation tables is already `is_cardinal_admin()`. A
non-admin staff account cannot alter them from staging at all. For the id hand-off I used the
**existing** `test test` project (`eb81f3f4-…`) rather than inserting anything — **no new rows
were written to production.**

**The URL carries an opaque id and nothing else.** `#/project/<uuid>`, validated against a UUID
pattern before use; no name, address, or token. The Showroom authenticates in its own right and
looks the project up itself.

## 4. Test results

**Verified in Chromium over HTTP:** `showcase.js`, `colors.js` and `showroom-images.js` all load
from their **external files**; `CardinalShowcase` and `CardinalColors` are live objects;
`CardinalShowroomImages.shrink` is a function; both mounts exist.

**`module_source` resolves all four modules as `external:`** against the Showroom artifact — the
Phase-2 seam working on a real relocated app rather than a synthetic fixture.

| gate | vs Cardinal | vs Showroom | reading |
|---|---|---|---|
| `harness_ourroofs` | 58P/0F | **58P/0F** | ✅ the gate that spans the seam — the image-utility move is sound |
| `harness_tray` | 57P/0F | **57P/0F** | ✅ |
| `harness_occhead` | 42P/0F | **42P/0F** | ✅ |
| `audit_contrast` | CLEAN | **CLEAN** | ✅ |
| `harness_colors` | 109P/1F | 108P/2F | 1 pre-existing + 1 Cardinal-scoped (`hideAllViews` text) |
| `harness_showcase` | 121P/3F | 114P/10F | **all 10 are Cardinal assertions** — Sales Floor, `navRestore`, Cardinal's CHANGELOG and app stamp |
| `gate_983` | GREEN | 3P/6F | Cardinal blocks (`cr-lib-styles`), Cardinal's inline-style and font-family baselines |
| `gate_1076` | 34P/0F | 27P/7F | Cardinal's job-menu router and admin tile |
| `harness_walk` | 50P then crash | 22P/6F then crash | pre-existing `crAsk` drift **plus** a shell DOM gap — open |
| `harness_vision` | 20P/3F | 0P/5F | **CRM-only. It should not be ported** — `showMain`, `isVisionHost`, `CardinalLanding` |

⚠ **One real regression of mine, found and fixed properly.** Moving `shrink()` out of Showcase
left `harness_showcase`'s *"downscale uses high-quality smoothing"* asserting against a module
that no longer contains the code. **The assertion was not relaxed** — `module_source` gained a
`showroom.images` descriptor, and the check now reads the module *plus its utility*. In Cardinal
that lookup returns null and the assertion is byte-identical, so **one gate serves both trees**.
Cardinal's `harness_showcase` still reports exactly its 3 baselined failures.

⚠ **And the descriptor is asserted ABSENT from Cardinal rather than skipped** — a descriptor that
silently stops being checked is a signature free to start colliding with a real module.

⚠ **A shell defect the gates caught: a dead sign-in form.** With the supabase CDN unreachable,
`window.supabase` is undefined and the next line threw — leaving a form that looks perfectly
normal and never works. Build 808's lesson exactly. It now says so on screen. **Proven, not
asserted**: the CDN is blocked in this sandbox, so the guard is what actually fires.

**Verified against the LIVE deployment** (curl, not assumed): every module file byte-identical to
the gated manifest, the correct title and `cr-showroom-auth` present, the gates and docs 404, and
`/api/detect` answering **405/401** through its auth chain rather than crashing — see §1, which
also records the module-load bug this document originally mis-attributed to the missing key.

**Not verified, and I cannot verify it here:** an end-to-end sign-in, and the rendered page.
I have no staff credentials; the supabase CDN is unreachable from this sandbox, and Chromium's
tunnel to `cardinal-showroom.vercel.app` resets here (curl reaches it, the browser does not). So
the sign-in screen is unverified *visually* — **the first real sign-in is Theo's to do**, using
the checklist in §7.

## 5. What broke after deployment — six defects, all mine, none in the modules

*Written 31 Aug 2026, after Theo opened the staging URL. **Every mechanical gate that ran was
green while the first five were live — and the sixth is that most of them were not running at
all.** Three came from one screenshot he sent; two more from looking at the app the same way
afterwards; the sixth from finally reading this repo's own CI. Recorded in full because the
pattern is the finding.*

**The pattern: the relocation was sound and the SHELL was not.** The five module files are
byte-identical to the gated manifest and have never moved. Everything below is code I wrote to
host them — a mount, a close lever, a link, a signing shim, a header row, a CI check. Ported code
arrives with its conventions; new host code arrives with none, and that is where the defects were.

| # | Symptom Theo saw | Cause | Commit |
|---|---|---|---|
| 1 | **OC Colors is a black screen** | I pre-created an empty `#cr-occ`; `ensureView()` adopts an existing element and returns before building its scaffold | `bd9a907` |
| 2 | **Showcase button doesn't work** | `hideAllViews()` wrote `display:none` onto a **class-shown** view, permanently outranking its own open path | `bd9a907` |
| 3 | **Studio 404** | I linked `studio.cardinalroster.com`, a subdomain I invented and never checked | `bd9a907` |
| 4 | **The screens still load black** | `signedPhotoMap` keyed its result by `row.path` instead of `list[i]` — the map came back empty, so no photograph resolved | `fa14733` |
| 5 | (not reported — found in a screenshot) | The header row did not wrap: at 414px **Present was pushed off-screen entirely** | `fa14733` |
| 6 | (not visible at all) | **This repo's CI had never once passed.** The secret check grepped the repo for `service_role` — and the only file containing it was the workflow that defines the grep | `f61ff7c` |

### 1 — providing a mount anchor was not neutral

`ensureView()` reads `VIEW = getElementById('cr-occ'); if (VIEW) return VIEW;` and only builds its
scaffold otherwise. An empty div that already exists is **adopted**, its scaffold never built, and
`showHub()` then dies on a missing `occTitle`. The extraction spike had measured this and said it
plainly — **both modules are self-mounting and take zero DOM anchors from outside** — and I
supplied anchors anyway, on the assumption that an extra empty div could only help. Both are gone;
the modules create their own, as they do in Cardinal.

### 2 — the close lever must match how the view is shown

Showcase is **class-shown** (`classList.add('open')`, six sites). An inline `display:none` outranks
the class rule its own open path sets, so the first close left it **permanently dead** — dead on
the second visit, not the first, which is why it reads as an intermittent fault. `CLAUDE.md`
documents this damage in those words, under *“Full-screen views must be registered in
`hideAllViews()` — and the lever must match”*, and I wrote the bug anyway. `hideAllViews()` now
calls the module's own `close()` **and confirms the class went** (a `close()` can no-op without
throwing while its view reference is still null). **OC Colors really is display-shown, so
`display:none` stays correct for it: one function, two levers, on purpose.**

### 3 — a URL I never fetched

Studio is at `app.cardinalroster.com/studio.html`, verified 200. There was no reason to guess.

### 4 — the empty map, and a comment that defended it with the wrong lesson

`createSignedUrls` is asked for a list of paths and every consumer looks its URL up **by the path
it passed in**. Cardinal's own `signedPhotoMap` therefore keys by `list[i]`. Mine keyed by
`row.path`; against a response carrying no usable `path` the map is `{}`, nothing resolves, and you
get correct chrome drawn around black rectangles — **exactly the symptom Theo described, on both
screens, after the three visible defects were fixed.**

⚠️ **Worse than the bug: I had written a comment defending the wrong key, citing build 633.** 633's
lesson — *key by the path the API answered for, never by array position* — belongs to `signMany()`
in the Showcase module, a **different function** with a different response shape. A real lesson
applied to the wrong function reads as diligence and prevents the fix. **Extend the existing
convention; do not import a rule from a neighbour that looks similar.** The shim now also returns
an empty map on an error or a non-array payload rather than throwing.

### 5 — Present unreachable on the device the app is used on

The header row had no `flex-wrap`. At 414px “Prepare” clipped mid-word, **Present was off-screen
entirely** and “Sign out” broke over two lines. Present is half the product and the Showroom is
used on a phone at a kitchen table. The bar now wraps, the mode buttons and the sign-out link no
longer break internally, the identity line ellipsises, and below 560px the wordmark takes its own
row while the spacer collapses.

### 6 — a check that failed on the file that defines it

`grep -rIl 'service_role\|SUPABASE_SERVICE' .` over the whole repository. The only file carrying
that string is `.github/workflows/check.yml` **because the grep is written in it.** The step
therefore failed on the very first push and on all five after it: **runs 1–5 all red, and I had
read none of them.** Every claim in this document about the Showroom's own gates was made under a
red tick.

**This is comment pollution wearing a green hat** — the class `CLAUDE.md` names more than any
other, in the one direction that hides itself. *Naming a thing is not carrying it:*
`process.env.SUPABASE_SERVICE_ROLE_KEY` is correct code, and a comment stating the rule is not a
leak. It is replaced by `.github/scan_secret.js`, which matches **a form prose cannot forge**: a
JWT whose **decoded** payload claims `service_role` or `supabase_admin`, and the `sb_secret_`
prefix. Nothing is matched on source text, so the scanner, its own comment and every env-var name
are clean by construction.

It runs `--selftest` as the first line of the step — **2/2: a file that only names the key passes,
a fabricated privileged key is rejected** (built at runtime from its parts, so no key literal is
committed). A scanner never seen to fail is not evidence, and this one had been red for five
commits without anyone learning a thing from it.

⚠️ **The lesson is not "fix the grep", it is "a red tick you do not read is worse than no tick".**
The checklist item *"Showroom CI green on its own repo"* sat unticked and I treated it as pending
rather than as failing. Verified by extracting all ten steps of `check.yml` and running them
locally (exit 0) before pushing; **run 6 is the first green one.**

### What this costs the rest of this document

⚠️ **§4's “verified in Chromium” was true and was not enough.** It proved the modules *load* and
export live objects. It did not open either screen, and four of defects 1–5 are one click past
where that check stopped — the fifth is only visible at a phone width. **This is the sentinel
rule from `CLAUDE.md` — a sweep of the front door reports CLEAN and means nothing by it — and the
Showroom does not yet have a sentinel setup file.** That is now on the checklist.

⚠️ **A CI step added at `bd9a907` refuses a pre-created `cr-show` or `cr-occ` element**, with a
control proving it fires on the reintroduced bug — and, since `f61ff7c`, that step actually runs.
**Defects 2, 4 and 5 still have no mechanical gate.**

**Not fixed here, because it is not this app's:** the Visualizer link is correct and `?present=1`
is the right parameter, but its Prep landing is **Cardinal's own logic** — it only switches tabs
after `loadCatalog().then(loadProjects)` resolves. That is a Cardinal build and Theo's approval.

## 6. Cutover checklist

- [x] **Theo:** create empty `Cardinal-1986/cardinal-showroom` — done
- [x] Grant the Claude GitHub App access to that repo — done; it was the last blocker
- [x] Push the verified tree as the repo root — done, `main` at `9b771a5`, hashes checked live
- [x] Vercel project linked and deployed — **https://cardinal-showroom.vercel.app**
- [x] Fix `/api/detect` — it crashed at module load for a missing sibling import, NOT the key
      (`3d9ccaa`); it now answers 405/401 correctly
- [x] **Fix the three destinations Theo reported** — black OC Colors, dead Showcase, 404 Studio
      (`bd9a907`), plus a CI step that refuses a pre-created `cr-show` / `cr-occ` element
- [x] **Fix the black photographs and the header that pushed Present off a phone** (`fa14733`),
      hash-verified in the deployed bytes — §5
- [ ] **Write a `sentinel_setup_showroom.js`** and run the sentinel on both screens at 390px.
      Four of §5's five defects live one click past where the current Chromium check stops, and
      the fifth is only visible at a phone width — that gap is why Theo found them, not the gates
- [ ] ⚠ **`GEMINI_API_KEY` on the Showroom project** (The Walk only), never in the repo.
      **Unverifiable from outside** — the key is read only after auth passes — so it is confirmed
      by the first authenticated call with a real photograph, not by probing the route
- [ ] Delete `.claude/showroom-staging/` from Cardinal once the repo is the single source
- [ ] **Theo signs in on staging** — the first real auth test, now that the destinations work
- [ ] Open `#/project/eb81f3f4-…`; confirm the pack and photos load
- [ ] Open Showcase and OC Colors; confirm both present
- [ ] Drop `harness_vision` from the Showroom set (CRM-only) and re-scope `gate_983`, `gate_1076`,
      `harness_showcase`, `harness_colors` to the Showroom's own surfaces — baseline what remains
- [ ] Fix `harness_walk`'s shell DOM gap and the pre-existing `crAsk` drift
- [x] **Showroom CI green on its own repo** — `f61ff7c`, run 6. Runs 1–5 were red on a secret
      check that matched its own definition; §5 defect 6
- [ ] **Only then:** the `isVisionHost` retirement (matrix), then the repoint, then `cr-show-*`
      and `cr-occ-*` removal — each its own build, in that order

## 7. Remaining, and the sign-in test checklist

**One configuration step outstanding: `GEMINI_API_KEY` on the Showroom Vercel project.** It is
needed only by The Walk's `/api/detect`; everything else runs without it. It must be set in the
Vercel dashboard and **never committed** — the standing rule, and the one this repo already has a
CI check for.

⚠️ **It cannot be verified by probing the route, and §1 records this document getting that wrong.**
The key is read only after the auth chain passes, so an unauthenticated probe stops at 401 whether
the key is set or not. **Step 11 below is the only real test.** Expect The Walk's detection to fail
loudly if the key is absent — that is correct behaviour, not a fault.

Walk this on the staging URL:

1. Signed out: the form renders; no CRM chrome behind it.
2. Bad password: the failure message comes from Supabase and the form stays usable.
3. Valid staff sign-in: the launcher shows Showcase and OC Colors native, Studio and the
   Visualizer as outbound links, **no Pop-Up Roof**.
4. **Session isolation:** signing in here does **not** sign you out of `app.cardinalroster.com` —
   that is `cr-showroom-auth` doing its job.
5. Reload: still signed in.
6. `#/project/eb81f3f4-2baf-41cb-86b3-847009fa8e3b` → the pack shows a name and stage; Project
   Photos load or say plainly there are none.
7. A random UUID → *"That project is not visible to this account"* — RLS refusing, not a crash.
8. A non-admin account: the catalogue still opens (all-staff read) and no write control appears.
9. Present mode: the prep-only chrome hides — **confirm it changed only what is drawn.** It is a
   display boundary, not an authentication one.
10. Sign out → back to the form; reload does not restore the session.
11. **The Walk on a real photograph** — the only check that proves `GEMINI_API_KEY` is set.
    Findings come back, or it fails loudly naming the key.
