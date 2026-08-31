# Showroom staging — status, data access, results, cutover

*31 Aug 2026. `index.html` (Cardinal) is byte-identical at build **1185**. No CRM call site,
hostname behaviour, DNS or production deployment was touched.*

## 1. ✅ DEPLOYED — the staging URL

**https://cardinal-showroom.vercel.app**
branch alias: `https://cardinal-showroom-git-main-theodorion1986-8546s-projects.vercel.app`

⚠️ **Precisely: that is the Showroom project's own PRODUCTION domain**, because `main` is its
production branch — it is not a PR preview. It is staging in the sense that matters: it is **not**
`showroom.cardinalroster.com`, and **no DNS was touched.**

**Repository:** `Cardinal-1986/cardinal-showroom`, `main` at **`9b771a5`**.

### Hash verification — the deployed bytes, not just a 200

Fetched from the live site and hashed against the local tree, because "it returns 200" is not
evidence that what is serving is what was gated:

| file | deployed | local | |
|---|---|---|---|
| `index.html` | `adff0a09e61c11c5` | `adff0a09e61c11c5` | ✅ |
| `showcase.js` | `d52d272efd6be661` | `d52d272efd6be661` | ✅ |
| `showcase.css` | `67aa2502a4f1a9c8` | `67aa2502a4f1a9c8` | ✅ |
| `colors.js` | `f7e706d1b4d9e4e4` | `f7e706d1b4d9e4e4` | ✅ |
| `colors.css` | `c4d1bb3572e4a80f` | `c4d1bb3572e4a80f` | ✅ |
| `showroom-images.js` | `ac7cab8e517717b9` | `ac7cab8e517717b9` | ✅ |

Every one matches the manifest gated on PR #584. Serving `<title>Cardinal Showroom</title>` and
`cr-showroom-auth`.

**`.vercelignore` holds:** `.claude/…/module_source.cjs`, `README.md` and
`.github/workflows/check.yml` all return **404**. The gates and the doc set are not served.

**`/api/detect` returns 500, not 404** — the function deployed and runs; it fails only for the
missing key. See §6.

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
`/api/detect` answering 500 rather than 404 — see §1.

**Not verified, and I cannot verify it here:** an end-to-end sign-in, and the rendered page.
I have no staff credentials; the supabase CDN is unreachable from this sandbox, and Chromium's
tunnel to `cardinal-showroom.vercel.app` resets here (curl reaches it, the browser does not). So
the sign-in screen is unverified *visually* — **the first real sign-in is Theo's to do**, using
the checklist in §6.

## 5. Cutover checklist

- [x] **Theo:** create empty `Cardinal-1986/cardinal-showroom` — done
- [x] Grant the Claude GitHub App access to that repo — done; it was the last blocker
- [x] Push the verified tree as the repo root — done, `main` at `9b771a5`, hashes checked live
- [x] Vercel project linked and deployed — **https://cardinal-showroom.vercel.app**
- [ ] ⚠ **Set `GEMINI_API_KEY` in the Showroom project** (The Walk only); nowhere else, never in
      the repo. **This is the one outstanding configuration step** — `/api/detect` currently
      returns 500 for exactly this reason
- [ ] Delete `.claude/showroom-staging/` from Cardinal once the repo is the single source
- [ ] **Theo signs in on staging** — the first real auth test
- [ ] Open `#/project/eb81f3f4-…`; confirm the pack and photos load
- [ ] Open Showcase and OC Colors; confirm both present
- [ ] Drop `harness_vision` from the Showroom set (CRM-only) and re-scope `gate_983`, `gate_1076`,
      `harness_showcase`, `harness_colors` to the Showroom's own surfaces — baseline what remains
- [ ] Fix `harness_walk`'s shell DOM gap and the pre-existing `crAsk` drift
- [ ] Showroom CI green on its own repo
- [ ] **Only then:** the `isVisionHost` retirement (matrix), then the repoint, then `cr-show-*`
      and `cr-occ-*` removal — each its own build, in that order

## 6. Remaining, and the sign-in test checklist

**One configuration step outstanding: `GEMINI_API_KEY` on the Showroom Vercel project.** It is
needed only by The Walk's `/api/detect`; everything else runs without it. It must be set in the
Vercel dashboard and **never committed** — the standing rule, and the one this repo already has a
CI check for. ⚠️ **Expect The Walk's detection to fail loudly until it is set**, and that is the
correct behaviour rather than a fault.

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
