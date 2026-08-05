# The Spark's orientation — read this before doing anything

*Written 5 Aug 2026, for Hermes. Lives in the repo on purpose: see "One copy" at the bottom.*

You run on Theo's Spark DGX box. This session — Claude Code — runs on the repo. Neither of us
can see the other's machine, and everything either of us knows about the other's side arrives by
Theo relaying it. That is the single biggest source of error in this collaboration, and most of
this file exists to close specific gaps that have already cost real time.

---

## What Cardinal is

**Cardinal Roofing & Renovations, LLC** — Dayton, Ohio. Roofing, siding, windows, gutters. Three
lines of business: retail, insurance claims, and community/non-profit work (Habitat for Humanity of
Greater Dayton does most of that volume). Owner **Theo Dorion**. Six other staff.

**The app** is one file — `index.html`, ~3.3 MB, a single-file PWA at **app.cardinalroster.com**.
No build step, no framework, no bundler. Supabase behind it (Postgres + RLS + Storage + auth),
26 serverless functions in `/api/`, deployed by Vercel on merge to `main`.

**It is the company's actual operating system.** Clients, jobs, estimates, contracts, inspections,
photographs, crews, payments, commissions. When something breaks there, someone's job stops.

---

## The boundary — what's yours, what's mine

| | Spark (you) | Repo (me) |
|---|---|---|
| Owns | the hardware, the photo archive, the models, GPU work | `index.html`, `/api/`, the SQL, the docs |
| Writes | `studio_tags.jsonl`, YOLO weights, local scripts | app code, schema migrations |
| Cannot see | the repo working tree, the database | your filesystem, your processes, your GPU |

**Exactly one thing crosses the boundary**, and it is one-directional:

```
your tagging  →  studio_tags.jsonl  →  push_studio_tags.py  →  Supabase (studio_photos + storage)
```

That script is in this folder and is the only Spark-side thing that touches the network. Read
`STUDIO_TAGGING.md` — your job genuinely stops at one local file.

**When you and I disagree about the state of something, the database or the repo settles it, not
reasoning.** Ask the destination. See "Verifying" below.

---

## ⚠ Five things that have already been assumed wrongly

Each of these cost time on 5 Aug. They are not hypotheticals.

**1. The app does not load a YOLO model. At all.**
Zero references to `best.pt`, `hail_v3`, `hail_v4`, or any `.pt` anywhere in the repo — checked
across `.js`, `.html`, `.json`, `.py`. There is no production model path, no loader, no promotion
step on my side. Your models are a **Spark-local research and preview tool**. Promoting one is
entirely your call and needs nothing from the repo.

**2. `/api/detect` is Gemini, and `best.pt` must never go behind it.**
Settled, not up for revisiting. The ladder is gemini-3.6-flash → gemini-3.5-flash → gpt-4o-mini.

**3. The pipeline is DISTILLATION. Gemini is the teacher, YOLO the student.**
So **mAP measures agreement with Gemini, not correctness.** "v4 agrees with the teacher more" is
true; "v4 is more correct" is an assumption the numbers do not support. The ceiling is the
teacher's labelling quality. Keep saying so when quoting a number.

**4. Schema is applied by me, from `.sql` files in the repo root.**
Do not report a `.sql` file as "pending" without checking. As of 5 Aug 05:20 UTC these are
applied: `studio_photos`, `studio_objects_rls`, `crews_section_schema`, `crews_storage_policies`,
`showcase_pairs`, `workmanship_pairs`, `walks_schema`, `studio_findings`,
`studio_findings_admin_gate_null_fix`, `studio_media`, `studio_private_objects_rls`.

⚠ **Do not check `supabase_migrations.schema_migrations` alone — it under-reports.** Some SQL was
run by hand through the dashboard and never recorded there. `estimates_update_policy.sql` is the
live example: it is genuinely applied (`est_update` reads
`is_full_access() OR created_by = my_email()`, confirmed 5 Aug) and it is **absent from that
table**. The migrations list gives false negatives. **Ask the object, not the ledger** — query the
policy, the column, or the table you actually care about.

**5. Nothing on disk records a training split unless something wrote it there.**
Three separate v4-vs-v3 evaluations were void for three different provenance reasons. The full
write-up is `BUG_CLASSES.md §14` in the repo. The short version: **assert
`val ∩ train == ∅` before trusting any mAP**, and a fixed seed is not sufficient — reproducing a
split needs the seed *and* a byte-exact corpus.

---

## Verifying — ask the destination, never the process

A process can be extremely busy accomplishing nothing. On 5 Aug the CompanyCam push ran for
47 minutes after its token died, reporting itself healthy the whole time, because the loop caught
every 401 and carried on. It was "running, resumable." It was landing nothing.

```sql
-- is the push actually working?
select count(*) as landed, max(pushed_at) as last_write,
       count(*) filter (where pushed_at > now() - interval '5 minutes') as last_5min
  from studio_photos;
```

If the count is climbing, it works. If the process is alive and the count is not moving, it does
not. `ps` cannot tell you which.

**Long runs outlive their credentials.** A Supabase token lives one hour — measured, not assumed
(02:05 → 03:06 UTC on one token). `push_studio_tags.py` in this folder now reads the token's own
`exp` claim, refreshes at 80% of its real life, re-auths on failure, and **stops with a non-zero
exit after 25 consecutive failures** rather than grinding. Two details worth carrying:

- **Supabase reports an expired token differently per service.** PostgREST answers **401**;
  Storage answers **400** wrapping a `"statusCode":"403"` with `"exp" claim timestamp check
  failed`. `upload_storage()` runs first, so the 400 is what a long run actually hits. A check for
  401 alone is inert.
- **Refresh on time, not on a photo count.** "Every 200 photographs" is ~32 sign-ins an hour at
  full rate, which is at GoTrue's rate limit for password grants, and a rate-limited sign-in used
  to kill the run outright.

---

## Settled decisions — do not re-litigate

Theo has ruled on these. Reopening them costs his time, which is the scarcest thing here.

- **Crew rates and crew payments are admin-only.** *"Crew rates is not needed by productions, I
  write the checks."* A work order generated by Curtis or Scottie having no labour lines is
  **correct, not a bug**, and must never be worded as a failure.
- **Photo GPS may be stored, admin-gated in-app only** — never public. `safePhoto()` in
  `api/companycam.js` still strips coordinates for anything public-facing. SEO uses city/area.
- **The Resource Library's librarian sees reference material only** — building code, roofing,
  siding, windows, gutters, manufacturer specs. No clients, no inspections, no job paperwork. The
  one exception, added on Theo's explicit instruction: it may request **photographs** from
  CompanyCam by emitting a `~~photos` block, and **the model never receives photo data** — it
  writes a search, the app runs it. Do not widen this. Do not narrow it either.
- **Never write an unverified email address** into `community_partners` or `commissions`. A bid
  sent to a guessed address is a lost bid. Ask.

---

## The private room — the one thing with a hard gate

Theo is building a personal photo library beside the work one: family, vacations, his son. It
lives in `studio_private` / `studio_private_events` and at `photos/private/<owner_email>/…`.

**It is owner-scoped, not admin-scoped.** `is_cardinal_admin()` is true for theo@ **and** joan@,
which is right for job photographs and wrong for a man's family. Both the table and the storage
policy check `owner_email = my_email()`. Verified 5 Aug: joan@, an admin, cannot read it.

**⚠ Nothing personal uploads until one live test passes.** Sign in as a non-admin account, request
a private object by its exact path, confirm a 4xx. The policy predicates are verified; the HTTP
path — signed URLs, the storage API's own checks — is not. **A policy that reads correctly and a
request that is actually refused are two different facts.**

**Face grouping, if it ever runs, runs on the Spark and stays there.** What crosses is the name
Theo typed — `people text[]`. Never an embedding, never a descriptor, never a bounding box of a
child's face. Those are biometric data and they do not belong in a hosted database.

---

## ⚠ This folder on the Spark is a COPY, and copies drift

`spark/` on the Spark box is **manually maintained — not a git worktree.** `git rev-parse` there
finds no repository. Everything in this directory therefore exists twice: once in the repo, where
it is edited, and once on the Spark, where it runs. Those two go out of step by default, silently,
every time anything here changes.

**This has already produced a wrong report.** On 5 Aug, `first_pass.py` was checked for on the
Spark's disk, not found, and reported as *"the repo expects a script that does not exist."* It had
been in the repo since PR #123 — 412 lines, merged hours earlier — sitting in the same directory of
the same commit as the `ORIENTATION.md` that had just been read. Nothing was unwritten; the box was
behind.

**The rule: the disk is a cache of the repo, not a record of it.** When they disagree, the repo
wins, and the answer is *sync*, never *"it doesn't exist."* Same class as reading a `val/` directory
and reporting a training split (§14 in `BUG_CLASSES.md`) — both are asking a stale artifact to
testify about its source.

### ⚠ And do not sync from `raw.githubusercontent.com`

It **serves stale copies for minutes after a commit** — `CLAUDE.md` states this outright. A fetch
from raw shortly after a merge can hand back the *pre-merge* file and look like it worked, which is
the worst possible failure here: a sync that reports success and changes nothing. That is exactly
the shape of every other bug this project logged on 5 Aug.

**Sync one of these two ways instead:**

```bash
# BEST — make it a real clone once, then `git pull` genuinely is the answer
git clone --filter=blob:none --sparse https://github.com/Cardinal-1986/cardinal-inspections.git
cd cardinal-inspections && git sparse-checkout set spark

# OR pin to a commit SHA so a stale CDN cannot answer for it
curl -H 'Accept: application/vnd.github.raw' \
  https://api.github.com/repos/Cardinal-1986/cardinal-inspections/contents/spark/first_pass.py?ref=<SHA>
```

**Then verify the sync landed rather than assuming it did** — check for something you know is in the
new version:

```bash
grep -c -- '--sources' spark/push_studio_tags.py    # 0 = you have the pre-guard copy
```

## Two libraries, and they must not mix

There are now **two** photo libraries in play on the Spark, and everything written before 5 Aug
only knew about the first.

| | CompanyCam archive | Theo's personal library |
|---|---|---|
| What | ~60,500 job photographs | ~20,000 phone + iPad, years deep |
| Lands in | `studio_photos` — **`is_cardinal_admin()`, so joan@ reads it too** | `studio_private` — owner-scoped, joan@ has no route |
| Bytes at | `photos/studio/…` | `photos/private/<owner_email>/…` |
| Pusher | `push_studio_tags.py` | **does not exist yet — deliberately** |
| Doc | `STUDIO_TAGGING.md` | this section, and `first_pass.py`'s own docstring |

⚠ **`push_studio_tags.py` writes to `studio_photos` unconditionally.** `STUDIO_TAGGING.md` (3 Aug)
says `source` may be `"companycam"` or `"phone"` — written before the private room existed, so the
documented path would take a family library straight into a table another admin can read. Nothing
downstream distinguishes *a job photo I took on my phone* from *my son*.

That is now closed in code rather than in prose: `--sources` defaults to `companycam`, anything
else is **held back and reported out loud**, and pushing another source requires naming it. The
default cannot leak by accident. **Do not name a personal library there.** When the private pusher
is written it will target `studio_private` and `photos/private/…`, and it is not written yet.

### The First Pass — step one, and it moves nothing

`first_pass.py` in this folder. **Read its docstring; it explains itself and this section will not
repeat it.** What matters here is where it sits:

```
1. photographs reachable on the Spark        ← a cable, not code. Not done.
2. pip3 install --user pillow-heif           ← iPhones shoot HEIC; without it
                                               you get no date, no GPS, no device
3. python3 first_pass.py <dir>               ← READ-ONLY. Reports. Moves nothing.
4. Theo reads the report                     ← ← ← the gate. Nothing proceeds without it.
5. re-check the triage design against it     ← every number in that design is
                                               currently invented
6. build                                     ← studio.html, two rooms
```

**Step 5 is not optional and is the whole reason step 3 exists.** The triage plan says things like
"about 300 decisions" and "roughly fifty to one" — those are *guesses made in a chat window*. On
5 Aug this project spent an evening on three model evaluations that were all void because numbers
were trusted without checking where they came from (`BUG_CLASSES.md` §14). Do not let a design get
built on invented counts when a read-only script can produce real ones in an afternoon.

**Nothing personal uploads until the live 4xx test in the private-room section passes.** The First
Pass never uploads anything, so it is safe to run before that test — and it is the only step that
is.

## Secrets

Never in a commit, never in a chat message, never in a file that gets committed. Environment
variables only. A Gemini key and a GitHub PAT have both been exposed in chat on this project —
assume that mistake is easy to repeat and refuse to repeat it.

The Supabase **URL** and **publishable anon key** are designed to be public and are already
hardcoded in `api/*.js`. Those two are fine. Service-role keys, `GEMINI_API_KEY` and VAPID private
keys are not, and must never sit on the Spark.

---

## Working with Theo

- **Never state an inferred fact as fact.** Reproduce before theorising. Screenshots and queries
  have root-caused more bugs here than reasoning has.
- **Terse, honest reporting.** What shipped, what it cost, what is still broken. Report your own
  regressions plainly and name them as yours. No flattery.
- **Report false positives as false positives.** Chasing a non-bug and presenting it as a finding
  costs trust.
- He answers in **short numbered picks** ("2 and 1", "3"). Give numbered options.
- He works from a phone, deploys through the GitHub web UI, and works very late.
- **Domain detail from him is load-bearing.** *"Some of these could last 2 years depending on the
  grant"* is why the `OnHold` stage exists. Habitat sorts first in every partner list. Owens
  Corning throughout, not GAF.

---

## One copy

This file is in the repo, not in `~/.hermes/skills/`, and that is deliberate.

On 5 Aug a `model-eval-discipline` skill was auto-created in the Spark's local skills directory. It
restated a rule that already lived in the repo's `BUG_CLASSES.md` §14 — and by the time anyone
looked, it had **already drifted**, still describing a split as "unseeded" after the repo entry had
been corrected to say otherwise. It was deleted.

**A second copy of a rule, in a place the repo cannot see, is a bug with a delay on it.** If you
want a local note, make it one line pointing here. And prefer a check that *runs* over a rule
someone has to remember — `prepare_yolo.py` asserting `val ∩ train == ∅` beats any amount of prose
about splits.

**Authoritative sources, in order:**

| For | Read |
|---|---|
| what shipped in the app | the `CHANGELOG` array in `index.html` — outranks every doc |
| bug classes and hard-won lessons | `.claude/skills/cardinal-build/docs/BUG_CLASSES.md` |
| session state, open items, what's applied | `.claude/skills/cardinal-build/docs/HANDOFF.md` |
| the app's own conventions | `CLAUDE.md` at the repo root |
| getting photographs onto the Spark | `spark/README.md` |
| the tagging job itself | `spark/STUDIO_TAGGING.md` |

When a doc and the `CHANGELOG` disagree about whether something exists, the `CHANGELOG` wins.
