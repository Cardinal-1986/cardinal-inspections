# Cardinal Resource App

The operations platform for **Cardinal Roofing & Renovations, LLC** (Dayton, OH).
Live at **app.cardinalroster.com**. Owner: **Theo Dorion** — theo@cardinalrenovations.net.

It is an internal tool for one company — roughly five to eight staff — not a product sold to
other contractors. Read every design decision below in that light: several things that would be
defects in a multi-tenant SaaS are deliberate here.

> **If you are an AI agent or a new developer, read [`CLAUDE.md`](CLAUDE.md) first.** It is the
> real orientation document — 60 KB of measured facts, settled decisions and traps that have
> already cost somebody a build. This README is the ten-minute version.

---

## What it is

A **no-build, single-file PWA** plus a handful of serverless functions on Supabase.

- No bundler. No framework. No transpiler. No test runner. **No build step at all.**
- `index.html` is edited directly and deployed as-is. Every change is surgery on the shipped file.
- Vercel deploys on merge to `main`. There is no staging environment.

That is a real constraint, not an oversight — it is what lets Theo ship from a phone at 1am
through the GitHub web UI. It is also why the discipline in `CLAUDE.md` is not optional.

---

## The artifacts

Nine HTML files ship. They are **separate applications that share one Supabase project**, not
routes in a single app.

| File | Bytes | What |
|---|---:|---|
| `index.html` | 5,232,847 | **The app** — CRM, claims, production, estimates, crews, inspections. Also the Vision hub front door when the hostname starts with `showroom.` |
| `visualizer/index.html` | 157,323 | **The Exterior Visualizer** — a separate application. No CRM code in it. A folder on purpose, so it can become the root of its own Vercel project |
| `ai-field-manual.html` | 329,656 | A 17-part manual the Resource Library iframes |
| `popup.html` | 269,247 | **The Pop-Up Roof** — the client-facing book behind the `presentation.*` rewrites |
| `supplement.html` | 95,496 | **The Supplement Desk** — insurance supplements, admin-only |
| `studio.html` | 86,222 | **Cardinal Studio** — the photo-curation browser, admin-only |
| `drivewaytest.html` | 29,077 | The Driveway Test — public, standalone, no login and no database |
| `bakeoff.html` | 24,890 | The AI accuracy bake-off, admin-only |
| `bulk_assign.html` | 13,865 | Bulk reassignment utility |

Plus `api/` — **33 ESM serverless functions**, `sw.js` (push + offline shell), and the PWA assets.

⚠️ **Ten more `.html` files at the root are orphaned scratch pages and are excluded from the
deploy.** See `.vercelignore`, which carries a written reason for every entry.

⚠️ **The build number in `index.html` is not "the current build."** Builds ship in any of the
artifacts; each carries its own stamp. Always pick the next number with
`python3 .claude/skills/cardinal-build/scripts/next_build.py`, which asks the remote.

---

## Getting it running

There is no `npm install && npm run dev`. There is no local dev server, because there is nothing
to serve — the app is one file that talks to hosted Supabase.

```bash
git clone git@github.com:Cardinal-1986/cardinal-inspections.git
cd cardinal-inspections
```

**To read or change the app:** edit `index.html` directly, then run the gates (below). The
patch discipline — exact-match anchors, asserted occurrence counts, byte-reproducibility — is in
`CLAUDE.md` and is not optional; a 5 MB file has no undo.

**To exercise it:** the gate harnesses boot the real artifact in Chromium against a mock
Supabase. That is the closest thing to a dev environment:

```bash
node .claude/skills/cardinal-build/scripts/sentinel.js index.html \
  --setup .claude/skills/cardinal-build/scripts/sentinel_setup_cardinal.js,\
.claude/skills/cardinal-build/scripts/e2e_mock_supa.js \
  --viewports 390x844
```

⚠️ **Both `--setup` files, seed first.** With only the first, the app never signs in and the run
sweeps the signed-out screen while reporting a full walk of the app. It now fails loudly, but the
ordering still matters.

**Serverless functions** are ESM (`api/package.json` sets `"type":"module"`). Handlers are
`export default async function handler(req, res)`. **A single `module.exports` in `api/` makes
every function fail** with `FUNCTION_INVOCATION_FAILED` — CI checks for it.

---

## Environment

**Never commit a credential, and never paste one into a chat message.** They live in Vercel
environment variables and GitHub secrets, nowhere else. Below are **names only**.

| Name | Used by |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | most routes — **both are designed to be public** and are hardcoded as fallbacks in `api/*.js`. That is safe by design and is *not* an auth check |
| `SUPABASE_SERVICE_ROLE_KEY` | 13 routes. **Never reaches a browser** |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MOONSHOT_API_KEY` | the AI routes |
| `RESEND_API_KEY`, `DIGEST_FROM`, `ADMIN_EMAIL`, `DIGEST_STALE_DAYS` | email + the digests |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (preferred) or `TWILIO_FROM` | SMS. `notify.js` sends via the Messaging Service SID when set (rides the approved A2P 10DLC campaign), else the bare `TWILIO_FROM` number |
| `VAPID_PRIVATE_KEY` (or `VAPID_PRIVATE`) | web push. Must pair with the `VAPID_PUBLIC` in `api/notify.js` **and** the copy in `index.html` — CI fails if the two public keys disagree, because push otherwise fails silently |
| `COMPANYCAM_API_KEY` | the CompanyCam index and sync |
| `ABC_CLIENT_ID`, `ABC_CLIENT_SECRET`, `ABC_API_BASE`, `ABC_ENV` | ABC Supply |
| `GOOGLE_MAPS_API_KEY`, `GOOGLE_SOLAR_KEY` | maps, satellite estimate |
| `CRON_SECRET`, `STALE_MINUTES` | the scheduled routes |

⚠️ **Known item: `api/notify.js` carries a hardcoded VAPID *private* key as a last-resort
fallback** (build 612, deliberate and commented). It is the one secret-shaped literal in the repo
— a sweep for the pattern finds no others. It should be deleted and the keypair rotated, but
deleting it **before** `VAPID_PRIVATE_KEY` is confirmed set in Vercel kills push entirely. The
route reports `vapid_from_env` as a boolean so you can check which one is live first.

---

## Database and migrations

Supabase Postgres, project `yipslubcptjoarblzbpl`. Access control is **Row Level Security**, not
application code — `is_cardinal_admin()` is security-definer to avoid RLS recursion, and
`project_assigned_rep()` takes `p.checklist`, not `p.id`.

**84 `.sql` files sit at the repo root and every one was applied by hand.** Nothing in the app or
the deploy ever runs one. `.vercelignore` blanket-excludes `*.sql` so none is ever served.

**[`MIGRATIONS.md`](MIGRATIONS.md) is the manifest** — which file shipped with which build, how
many statements, whether it is replayable, and **which twelve are destructive and must never be
replayed on live data.** It is generated, not hand-written:

```bash
python3 .claude/skills/cardinal-build/scripts/migration_manifest.py          # regenerate
python3 .claude/skills/cardinal-build/scripts/migration_manifest.py --check  # CI gate
```

⚠️ **There is no verified fresh-database bootstrap and `MIGRATIONS.md` does not claim one.** It
gives you the order to work in and the list to skip. Until a rebuild has actually been done once
and the result recorded, treat it as untested.

**Deploy order when a change needs both: SQL first, then the HTML.** `normStage()` is a whitelist
that silently turns anything unrecognised into `'Lead'`, so a stage value must exist in `STAGES`
*before* any row is given it.

---

## Permissions

```
Admin       theo@, joan@              everything, including all money
Production  curtis@, scottie@         all clients; no stats strips, no partner money
Sales       nick@, joey@, jacob@      only what they created or are assigned (RLS)
```

Theo and Joan are hardcoded admin fallbacks in SQL and in the API. A hidden button is **not** a
permission — the RLS is the fence, and the UI gate exists so a correct refusal does not render as
a broken screen.

---

## Deploying

Vercel builds from `main` on merge. `vercel.json` carries:

- **Four crons** — `/api/digest` daily 11:00 UTC, `/api/commissions-digest` Fridays 11:00 UTC,
  `/api/companycam-sync` daily 03:00 UTC, `/api/requeue-stale` hourly at :20.
- **Two host rewrites** — `presentation.cardinalroster.com` and
  `presentation.cardinalrenovations.com` → `/popup.html`.
- **A `functions` block raising `maxDuration` to 60s on 15 slow routes.** A new AI or
  long-running route needs an entry here or it times out at the default.

**Everything at the repo root is served publicly unless `.vercelignore` lists it.** If you add a
file at the root, decide whether it ships and **write the reason into `.vercelignore` either
way** — that file's header explains every existing entry, and the discipline has held.

`robots.txt` is `Disallow: /`.

### The service worker

`sw.js` is network-first for navigations and stale-while-revalidate for same-origin static
assets, so a deploy is picked up on the next load. Bumping `CACHE` is only needed to force-evict
a poisoned entry — **not** per deploy.

An installed PWA can still hold the old document in memory across a soft close, so telling Theo
to fully close and reopen twice costs nothing. **But do not diagnose a stale `index.html` as a
service-worker cache problem** — it has not been one since the 474-era change, and that
misdiagnosis has twice masqueraded as "the fix didn't work."

---

## Gates — run these, in order, every build

**Never commit on red. Never hand over with a failing check.**

```bash
# 1 · the mechanical ladder (index.html)
python3 .claude/skills/cardinal-build/scripts/check_build.py index.html \
    --prev <previous artifact> --marker '<a string your change added>'

# 1b · the same ladder for any OTHER artifact — check_build.py sees index.html only
python3 .claude/skills/cardinal-build/scripts/check_artifact.py supplement.html \
    --prev <previous> --stamp SD_BUILD --marker '<...>'

# 2 · the standing screen checker (any build that changes a screen)
node .claude/skills/cardinal-build/scripts/sentinel.js --selftest   # prove it can speak
node .claude/skills/cardinal-build/scripts/sentinel.js index.html \
    --setup <cardinal setup>,<supa mock> --since <previous artifact>

# 3 · a per-build gate, named for the build that added it
node .claude/skills/cardinal-build/scripts/gate_<N>.mjs             # green on this build
node .claude/skills/cardinal-build/scripts/gate_<N>.mjs <previous>  # RED on the previous one

# 4 · before merging ANY pull request
python3 .claude/skills/cardinal-build/scripts/gate_ship.py <pr-number>
```

**Every gate takes an optional path argument so it can be pointed at the previous build as a
negative control. A gate that has never been seen to fail proves nothing** — that is the single
most repeated lesson on this project, and it has caught checks that were structurally incapable
of failing.

`.github/workflows/check.yml` runs on every push to `main` and every PR. It is not a copy of
`check_build.py`; it catches deploy-time failures Vercel would otherwise surface — API filenames
with spaces (which reject the *entire* build), `module.exports` in `api/`, a truncated
`index.html`, unbalanced tags, invalid JSON, and mismatched VAPID public keys.

### What the gates cannot see

- **jsdom does not resolve `var()` inside shorthands.** A gate can prove structure; it cannot
  prove a colour renders. Colour work needs a real Chromium render and **Theo's eyes**.
- **Contrast is arithmetic — compute it** (`scripts/contrast.py`), and measure **both** themes.
  Light ink on the dark ground is the most repeated defect on this project.
- **A CSS rule can parse, balance, and never apply.** Only a real engine settles which rule won.
- **Test against production data shapes.** A photo-signing change once verified against invented
  fixtures shipped completely inert, because zero real rows had the field it used.

---

## The documentation set

`.claude/skills/cardinal-build/docs/` — excluded from the deploy, because known bugs and
unfinished work should not be a public document.

| File | Read when |
|---|---|
| `CLAUDE.md` (root) | **Always, first** |
| `FEATURES.md` | Before building anything — every feature and where it lives |
| `OPEN_ITEMS.md` | Picking up work — live to-do, blockers, **settled decisions** |
| `BUG_CLASSES.md` | Before debugging, and before shipping. 69 classes, each one already paid for |
| `cardinal_build_log.md` | One entry per build since 543. 1.2 MB — grep it, don't read it |
| `HANDOFF.md` | Session state from the previous session |
| `MIGRATIONS.md` (root) | Anything touching the database |

**The prime doctrine:** *things that look missing are usually buried.* Six "missing features" on
this project were fully built and merely unreachable. Before building anything, grep
`FEATURES.md`, then the in-app `CHANGELOG`, then `index.html` for the feature name **and its
mount anchor**. Ask "does this *element* still exist?" — not "does this code exist?"

**Its corollary, learned expensively:** *things that look built are sometimes unreachable, and
only the data can tell you.* The Walk had a schema, an API, RLS, a review screen and 152
assertions — and zero rows, for 250 builds, because nobody could find the door. **When you pick
up a feature, ask its table how often it is used before you read its code.**

---

## Known gaps, stated plainly

These are real and are not being hidden:

- **`index.html` is 5.2 MB in one file.** Every gate, anchor and patch script assumes that.
  Splitting it is a multi-month project with a real chance of breaking a tool a business runs on;
  it is not scheduled, and it should not be attempted casually.
- **No fresh-database bootstrap has been verified.** See `MIGRATIONS.md`.
- **21 of the 84 migrations are named by no document at all.** `MIGRATIONS.md` marks them.
- **No staging environment.** `main` is production.
- **The hardcoded VAPID private-key fallback** described above.
- **No automated end-to-end test of the full inspection → report → PDF path.** The pieces are
  gated individually; the chain is not.
