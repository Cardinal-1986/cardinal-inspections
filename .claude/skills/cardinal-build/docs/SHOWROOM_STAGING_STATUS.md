# Showroom staging — status, data access, results, cutover

*31 Aug 2026. `index.html` (Cardinal) is byte-identical at build **1185**. No CRM call site,
hostname behaviour, DNS or production deployment was touched.*

## 1. ⚠ THE ONE THING NOT DELIVERED: there is no staging URL yet

**Creating the repository is blocked.** `POST /user/repos` returns **403 Resource not accessible
by integration** — this session's GitHub App cannot create repositories, only work inside
`cardinal-inspections`.

**And I did not route around it by pasting the app into Vercel.** `deploy_to_vercel` takes the
file tree inline, which would mean re-emitting **~290 KB of `showcase.js`, `colors.js`, their
stylesheets and `api/detect.js` by hand**. I did not author that text in this session; re-typing
it is a transcription risk whose failure mode is a silently truncated file *that is already
deployed*. The house rule is to confirm what you push is what you verified, and I could not.

**Unblock — two steps, the first is Theo's and takes under a minute:**

1. Create an empty **`Cardinal-1986/cardinal-showroom`** (private, no README).
2. Then, in a session: `add_repo` → push `.claude/showroom-staging/` to it as the repo root →
   `create_git_project` against it → Vercel returns the **temporary staging URL**. No DNS.

Everything else below is built, measured and committed.

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

**Not verified, and I cannot verify it here:** an end-to-end sign-in. I have no staff credentials,
and the CDN is unreachable from this sandbox. The auth path, the RLS gating and the id resolution
are built and readable; **the first real sign-in is Theo's to do** once the staging URL exists.

## 5. Cutover checklist

- [ ] **Theo:** create empty `Cardinal-1986/cardinal-showroom`
- [ ] Push `.claude/showroom-staging/` as that repo's root; delete it from Cardinal
- [ ] `create_git_project` → record the staging URL
- [ ] Set `GEMINI_API_KEY` in the Showroom project (The Walk); nowhere else
- [ ] **Theo signs in on staging** — the first real auth test
- [ ] Open `#/project/eb81f3f4-…`; confirm the pack and photos load
- [ ] Open Showcase and OC Colors; confirm both present
- [ ] Drop `harness_vision` from the Showroom set (CRM-only) and re-scope `gate_983`, `gate_1076`,
      `harness_showcase`, `harness_colors` to the Showroom's own surfaces — baseline what remains
- [ ] Fix `harness_walk`'s shell DOM gap and the pre-existing `crAsk` drift
- [ ] Showroom CI green on its own repo
- [ ] **Only then:** the `isVisionHost` retirement (matrix), then the repoint, then `cr-show-*`
      and `cr-occ-*` removal — each its own build, in that order
