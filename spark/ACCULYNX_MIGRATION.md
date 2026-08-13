# Moving the AccuLynx client base into Cardinal

*Written 11 Aug 2026. Scripts: `acculynx_probe.py` → `fetch_acculynx.py` →
`push_acculynx.py`, all in this folder, all standard-library Python 3.*

**What this is for.** One re-runnable migration of every real AccuLynx client
— records, and (where the API allows) their documents and photographs — into
the Cardinal app's own tables, in the exact shapes the app already writes.
Zero app changes ride with this: an imported client is indistinguishable from
one entered by hand, except that its `lead.source` says `AccuLynx import`.

**Your job stops at the gates.** Each step below produces a file or a number
that gets LOOKED AT before the next step runs. Skipping a gate is how 500
wrong clients happen at once.

## The credentials fence — read this before anything

- **`ACCULYNX_API_KEY`** — used by the probe and the fetch ONLY. Neither ever
  talks to Supabase.
- **`CARDINAL_EMAIL` / `CARDINAL_PASSWORD`** — an admin login (theo@ or
  joan@), used by the push ONLY. It never sees the AccuLynx key.
- Environment variables only. Never in a file, never committed, **never
  pasted into a chat** — this project has already leaked two keys that way.
- **Never a service-role key.** The push signs in as a real admin through the
  public anon key, the same way `push_studio_tags.py` does. The service-role
  key never leaves Vercel's env vars.
- **Run it from a machine Theo controls** — his desktop or the Spark — so
  both credentials live only in that terminal session and are gone when it
  closes. That is the point of the desktop-first path below, and it is
  Theo's decision of 11 Aug. The cloud alternative is an appendix, and it
  costs something real: see the warning there before choosing it.

Generating the AccuLynx key (needs a Company/Location Administrator):
your name (top right) → **Account Settings** → **Add-On Features and
Integrations** → **API Keys** → **View API Keys in AppConnections** →
**Manage Connection** → **New** → name it (e.g. `cardinal-migration`) →
pick a Lead Source → **Create Key** → **Copy**. If the menu is missing, API
access may not be on the plan — that is exactly what the probe reports.

## Settled decisions — do not re-litigate (Theo, 11 Aug)

1. **Every imported client lands in `retail`.** The insurance data still
   comes along inside `checklist.lead.insurance`; sorting to insurance /
   community happens AFTER the import, from that data, as reviewed SQL (the
   session drives it over the database connection, or the in-app bulk-assign
   tool for stragglers).
2. **Dead and Cancelled jobs stay behind.** The fetch's default milestones
   are `lead,prospect,approved,completed,invoiced,closed`. Adding them later
   is one `--milestones` flag on a re-run — the import is idempotent.
3. **A name+address match against an existing Cardinal client makes no new
   row** — the AccuLynx files attach to the existing record instead. Every
   match is listed in `collisions.csv` by the dry run first.

## Getting the scripts onto the machine (no git required)

If you already have a checkout, `git pull` and skip this. If you don't —
Cardinal is normally deployed through the GitHub web UI, so you may not —
download the four files straight from GitHub into one folder:

`acculynx_probe.py`, `fetch_acculynx.py`, `push_acculynx.py` and this
runbook, from `Cardinal-1986/cardinal-inspections` → `spark/` → open each →
**Raw** → save. (The two `test_*.py` files are the offline harnesses; they
are not needed to run a migration.) Or use **Code → Download ZIP** on the
repo and keep the `spark/` folder out of it.

Check Python is there — 3.8 or newer, no packages to install:

```bash
python3 --version        # macOS/Linux
py --version             # Windows, if python3 is not recognised
```

On Windows substitute `py` for `python3` in every command below, and use
`set VAR=value` instead of `export VAR='value'`.

## Where this stands (13 Aug 2026)

**Gates 1 and 2 are DONE. Gate 3 has been run in a substitute form. Nothing
has been written to Cardinal.**

| Gate | State |
|---|---|
| 1 · probe | ✅ run — key works, 166 jobs in scope, **files NO-GO** |
| 2 · fetch | ✅ run — all 166 records on local disk, 0 failures |
| 3 · dry run | ⚠️ run via the Supabase connector, **not** via the admin login — see below |
| 4 · pilot (5) | ⛔ blocked — needs a working `CARDINAL_PASSWORD` |
| 5 · real run | ⛔ blocked — same |

⛔ **`CARDINAL_PASSWORD` is stale.** Supabase auth answers
`400 invalid_credentials`. `CARDINAL_EMAIL` is correct
(`theo@cardinalrenovations.net`) and neither variable has stray whitespace or
quotes. **Refresh that password and gates 3–5 run as written.**

Because the push's dry run needs the token for exactly two read-only queries
(`projects` and `team_profiles`), those were replayed over the session's
Supabase connector into the **shipped** `dry_run()`, with every write path
stubbed to raise. That validates the transform against real data. **It is not
a substitute for gate 3** — re-run the real command once the password works.

**Dry-run result (all 166 records, after the five fixes below):**
164 new clients · **2 collisions** · 0 unmappable · 0 warnings · PO 1044–1207.
Stages: Lead 3 · Prospect 80 · Approved 40 · Completed 8 · Invoiced 12 ·
Closed 21. Reps: nick 42 · theo 39 · jerry 35 · joey 29 · jacob 18 · curtis 3.
7 jobs carry insurance data for the later sort.

⚠️ **Two decisions waiting on Theo:**
1. The two collisions are real (Karrie Johnson, 804 E Center St; Dan Thompson,
   2825 Arden Ave) — both already exist in Cardinal. Default is attach, not
   duplicate.
2. **Two AccuLynx test records** would import as clients: `test test` (Lead)
   and `Team Test` (Closed), both at 5735 Webster Street. Say if they should
   be skipped.

## What the live account actually answered (13 Aug 2026)

Gates 1 and 2 have now been RUN against Cardinal's real AccuLynx account. The
findings below are measured, not predicted — they replace the guesses the
scripts were originally written against, and five of them were bugs.

- **Files: NO-GO, confirmed.** All six candidate read routes
  (`/documents`, `/photos`, `/photos-videos`, `/files`, `/attachments`,
  `/media`) return **404 on every job**. This matches AccuLynx's public docs.
  Records migrate; documents and photographs need the fallback below.
- **166 jobs in scope** (lead 3 · prospect 81 · approved 41 · completed 8 ·
  invoiced 12 · closed 21), plus 35 cancelled and 36 dead deliberately left
  behind. The default `/jobs` listing returns 201 — it includes cancelled and
  excludes dead.
- **All 8 AccuLynx users are on Cardinal's roster**, so no imported client
  falls back to the admin for a missing rep.
- **`pageStartIndex` is the pagination parameter, and it is a RECORD offset.**
  ⚠️ AccuLynx **silently ignores an unknown query parameter** — it answers
  `200` and returns page one. The scripts originally sent `recordStartIndex`,
  which does not exist, so the fetch could never advance past the first page.
  `recordStartIndex`, `startIndex`, `page` and `offset` are all ignored.
- **`pageSize` is capped at 25**, and the cap is inconsistent per endpoint:
  `/jobs` and `/custom-fields` refuse 26 with an explicit
  `400 "Page Size must not be greater than 25."`, while `/contacts`,
  `/milestone-history` and `/representatives` allow more. 25 is the one value
  every route accepts.
- **Refs come back unexpanded, and this bites twice.** Contacts need
  `?includes=emailAddress,phoneNumber` (the scripts already did this). But
  `/jobs/{id}/representatives` returns its `user` as a bare `{id,_link}` with
  no email and no name — so the rep must be resolved against `/users` (one
  call, 8 users). Unresolved, every client imports assigned to the admin.
- **The site address is `locationAddress`**, on both the listing object and
  the job detail, with `street1` and `state` as an object carrying
  `abbreviation`. It is **not** `address` or `jobSiteAddress`. All 166 jobs
  have one.

## The gates, in order

```bash
cd <the folder with the scripts>
export ACCULYNX_API_KEY='...'

# 1 · the probe — one minute, read-only, writes acculynx_probe_report.md
python3 acculynx_probe.py
```

**Gate:** read the report (it contains no secrets — safe to hand to the
session). It answers: does the key work at all; how many jobs sit in each
milestone; do the AccuLynx user emails match Cardinal's roster; and the big
one — **did any file read route answer**, because AccuLynx's public docs show
upload-only file endpoints. No file route ≠ no migration: records proceed
regardless, files fall back (see "If files are unreachable").

```bash
# 2 · the fetch — records (and files, if a route answered) to local disk
python3 fetch_acculynx.py --dest ./acculynx_export
```

Resumable: `jobs.jsonl` is the record; re-run the same command after any
interruption and it carries on. `--limit 5` first if you want a look.

```bash
# 3 · the dry run — the review files, nothing written to Cardinal
export CARDINAL_EMAIL='theo@cardinalrenovations.net'
export CARDINAL_PASSWORD='...'
python3 push_acculynx.py --src ./acculynx_export --dry-run
```

**Gate — Theo reads two files** (they open in Excel):
- `acculynx_review.csv` — every incoming client: name, address, stage, the
  PO it gets, which rep it lands on, whether it carries insurance data,
  photo/doc counts and megabytes, and any warnings.
- `collisions.csv` — every AccuLynx job matching an existing Cardinal
  client. **Wrong matches get fixed HERE**, before anything writes.
Sanity checks: total count ≈ what AccuLynx says; stage spread sane;
"reps not on roster" list acceptable; total MB acceptable (that is the
Supabase storage cost).

```bash
# 4 · the pilot — five real clients
python3 push_acculynx.py --src ./acculynx_export --limit 5
```

**Gate — look at all five in the app**: they show in the client directory
(Retail), a profile shows phones / emails / address / PO / stage, the photo
gallery renders, a PDF opens from Job Documents, and the client list is not
buried under them (dates come from AccuLynx, not from today). The session
verifies the rows over the database connection at the same time — say when
the pilot has run.

```bash
# 5 · the real run — off-hours, and nobody creating leads in the app
python3 push_acculynx.py --src ./acculynx_export
```

The push prints its **batch stamp** at the start — keep it. Resumable the
same way as the fetch: re-run the same command (add `--batch <STAMP>` to
keep one stamp across resumes); pushed jobs are skipped, a half-finished
client is completed rather than duplicated.

**After:** the session reconciles counts over the database connection
(imported + skipped + collisions = AccuLynx's number, every checklist still
parses), then runs the retail→insurance/community sort with Theo, one
reviewed step at a time.

## Rollback

```bash
python3 push_acculynx.py --src ./acculynx_export --rollback <STAMP>
```

Reads the batch's own ledger (`push_ledger_*.jsonl`, written as the push
ran) for the exact ids of everything it created — including files attached
to pre-existing clients — prints the counts, and asks you to type `DELETE`.
If the ledger is lost, `--no-ledger` falls back to finding whole imported
clients by the stamp inside their checklist (attached files can't be found
that way — that is what the ledger is for).

## What NOT to do

- **No service-role key, anywhere, ever.** The anon key + admin sign-in is
  the whole design.
- **Don't run two pushes at once**, and don't run the real push while the
  team is creating leads — PO numbers are computed as live-max-plus-one at
  start and collide if the app is allocating them at the same time.
- **Don't hand-edit `jobs.jsonl`** — it is both the data and the resume
  record.
- **Don't expect videos or Word/Excel files to land.** Cardinal's storage
  bucket accepts images and PDF only; everything else is listed in
  `skipped_files.jsonl` instead of imported. PDFs over 8 MB are also held
  back (a 6.4 MB document has already broken the app's document viewer
  once) — they stay in the export folder for manual handling.
- **Don't "fix" a client that imported oddly by re-typing its checklist by
  hand** — tell the session; the checklist column is fragile (one malformed
  row breaks the whole client list for everyone).

## Files AND notes are unreachable — one gap, one decision (13 Aug)

⚠️ **This section used to recommend "a browser-automation pass against the
AccuLynx web UI". That is now RULED OUT — see the settled decision below.
Do not propose it again.**

**Both are confirmed NO-GO, and they are the same problem.** AccuLynx's API
is upload-and-audit, not read:

- **Files:** all six candidate read routes 404 on every job.
- **Notes:** measured **806 job messages across 156 of the 166 jobs (94%)**,
  and none of the text is reachable. Twelve endpoint spellings were tried
  (`/notes`, `/messages`, `/comments`, `/job-messages`, `/conversations`,
  `/posts`, top-level collections filtered by `jobId`, …) — all 404. There is
  no v1 or v3, and no swagger/OpenAPI spec is served.
- **`/jobs/{id}/history` DOES answer** — 6,191 actions across the 166 jobs —
  but it records only *that* a note happened (`"Job Message Added"`, with a
  date and an author). **Never the words.** It is an audit trail, not content.
- `custom_fields` is a dead end too: one field (`Policy Number`) on all 166
  rows, **zero of them with a value**.

⚠️ **`lead.notes` is therefore empty on all 166 imported clients.** `map_job()`
reads `detail.description` / `detail.notes`; neither key exists on this
tenant. Unlike the address bug, fixing the mapping would not help — there is
nothing to map from. The dead lookup is left in place as a fallback for other
tenants.

### ✅ SETTLED (Theo, 13 Aug): front door only — no scraping, no automation

Theo read the terms and ruled it out, and he is right. Standard SaaS
agreements restrict automated bulk extraction, bypassing what the reporting
UI exposes, and unthrottled request loops. **Rate-limiting a scraper does not
move it out of that category.**

**The stronger argument is practical: an automated extraction that trips
AccuLynx's security flags gets the account LOCKED — and the 806 messages
exist nowhere else.** That would destroy the data the exercise is trying to
rescue, mid-migration, with no recourse but their support queue.

### The permitted routes, in order

1. **An offboarding data-export request.** Not "can I have a CSV" — *"We are
   migrating off AccuLynx; I need a complete export of my company's data,
   including job messages and job files."* Vendors expect this at contract end.
2. **Ask for written permission** to extract programmatically. The restriction
   is contractual, so the counterparty can waive it — and often will for a
   departing customer. A yes makes the fetcher legitimate; a no costs nothing.
   **If permission is granted, build it properly: their documented rate limit,
   a pace that cannot trip a flag, and resumable.**
3. **Ask whether message/file read access exists on another API tier.** The v2
   key we have genuinely has no such routes; their team knows if a higher tier
   does.
4. **AccuLynx's own Reports/CSV exports.** Anything the UI offers as an export
   button is designed for extraction, so using it is sanctioned by definition.

### The manual fallback is smaller than it looks

Scoped by stage, so nobody copies 806 messages by hand:

| milestone | jobs | messages | avg |
|---|---:|---:|---:|
| Prospect | 81 | 317 | 3.9 |
| Approved | 41 | **249** | 6.1 |
| Closed | 21 | 108 | 5.1 |
| Invoiced | 12 | 75 | 6.2 |
| Completed | 8 | 54 | 6.8 |
| Lead | 3 | 3 | 1.0 |

Live work (Approved + Completed + Invoiced) is **61 jobs / 378 messages**;
everything else is 105 jobs / 428 messages, most of it prospects that never
became work. **The realistic manual scope is the 41 Approved jobs — 249
messages, an afternoon.** A person reading their own screen is fully
permitted.

### ⛔ Do not cancel the AccuLynx subscription until this is settled

The 806 messages and every file exist only inside AccuLynx. The records
migration does not touch them; when the account goes, they go. Same trap the
docs already record for CompanyCam.

The push can attach late-arriving files any time — it is idempotent.

## Resumability

Ctrl-C costs nothing, at any step. The fetch resumes from `jobs.jsonl`, the
push from `jobs.jsonl.pushed.json`, and every storage path is deterministic
(`projects/<id>/acx-<fileId>.<ext>`, upsert on) so a repeated write is a
no-op, not a duplicate.

## Appendix — running it from a cloud session instead (last resort)

The scripts are machine-portable: the Spark, a desktop and a cloud session
run identical commands. **But read this before choosing the cloud.**

⚠️ **A cloud environment is not a secrets store, and the product says so.**
Its own dialog carries the warning: *"Anyone who uses the environment can
read the values, and cloud environments have no dedicated secrets store, so
don't add API keys or other credentials."* Personal environments are scoped
to one account, so the practical exposure is small — but `CARDINAL_PASSWORD`
is a live admin login, not a burnable token. **That is why the desktop path
above is the documented default.** If you use the cloud anyway: use a
PERSONAL environment (never an organization-shared one), and afterwards
delete the AccuLynx key in AppConnections, clear both variables, and change
the Cardinal password.

Where the settings actually live — **there is no Environments page and no
direct URL.** On [claude.ai/code](https://claude.ai/code), tap the **cloud
icon showing the current environment's name, in the row above the message
box**. From that menu: **Add cloud environment**, or hover an existing one
and tap the **gear**. One dialog holds the name, network access,
environment variables and the setup script.

- **Network access:** switch from **Trusted** to **Custom**, then one domain
  per line in **Allowed domains** — `api.acculynx.com` and
  `yipslubcptjoarblzbpl.supabase.co` — and tick **"Also include default list
  of common package managers"** to keep the defaults.
- **Environment variables:** `.env` format, subject to the warning above.

Then start a **fresh** session in that environment (a running session keeps
the configuration it was provisioned with) and ask it to run the gates
above. Same scripts, same order, same stops.

## Handoff

When the probe report exists, hand it back with:

```
Probe done — report attached. Counts and the file verdict inside.
```

and the session takes it from there, gate by gate.
