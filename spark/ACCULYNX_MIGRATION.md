# Moving the AccuLynx client base into Cardinal

*Written 11 Aug 2026. Scripts: `acculynx_probe.py` → `fetch_acculynx.py` →
`push_acculynx.py`, all in this folder, all standard-library Python 3.*

> **Status, 13 Aug 2026 — gates 1 and 2 are DONE.** The key was generated, the
> probe ran against the live account, and the records fetch completed. What it
> found, so nobody re-derives it:
>
> - **166 jobs in scope** — lead 3 · prospect 81 · approved 41 · completed 8 ·
>   invoiced 12 · closed 21. Cancelled (35) and dead (35) stay behind, as
>   settled. The default listing holds 201; the 35 dead are the difference.
> - **🛑 Files are a NO-GO.** Every candidate read route answered 404 on three
>   separate jobs. This matches AccuLynx's public docs (upload-only). Records
>   are unaffected — see "If files are unreachable".
> - **All 8 AccuLynx users are `@cardinalrenovations.net`** and map straight
>   onto the Cardinal roster, so no job lands on `former_rep`.
> - Contact enrichment resolves properly: names, addresses, emails and phones
>   all come back as values, not `{id,_link}` refs.
> - ⚠️ **The probe caught two faults in the shipped fetch, both fatal, both now
>   fixed** — see "What the probe corrected" below. This is what the gate is
>   for; do not skip it on a re-run.
>
> **Remaining: gates 3–5 (dry run, pilot, real run), which need the Cardinal
> admin login.** Nothing has been written to Cardinal yet.

## What the probe corrected (13 Aug 2026)

Both faults would have stopped the export dead, and neither was visible to the
offline harness, because the harness's fake API had been built from the same
assumption as the code it was testing. Measured against the live account:

| Assumption as shipped | What the API actually does |
|---|---|
| `/jobs` pages by **`recordStartIndex`** | **`pageStartIndex`.** Five other candidate names — `recordStartIndex`, `startIndex`, `offset`, `page`, `pageNumber` — are **silently ignored**, answering HTTP 200 with page 1 every time. It is a record offset, as assumed. |
| `PAGE_SIZE = 100` | **25 is the ceiling on `/jobs`**, refused with HTTP 400 *"Page Size must not be greater than 25."* on the first call. `/users` and `/contacts` allow 50; sub-resources allow 200. |

A third, latent: `pageStartIndex` at or past the record count answers **416**,
not an empty page. The sweep's `count` check normally stops first, so this was
never live — but a listing without `count` would have aborted the export at the
tail of a sweep, so `get()` now treats a flagged 416 as a clean end-of-listing.

**The lesson worth keeping: an unknown query parameter is ignored, not
refused.** Getting the name wrong does not raise anything — it quietly returns
the first 25 records forever. `test_acculynx_fetch.py` §1b now models the real
contract (the cap, the ignored names, the 416) and goes red if either fault is
reintroduced.

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

## The gates, in order

```bash
cd <the folder with the scripts>
export ACCULYNX_API_KEY='...'

# 1 · the probe — one minute, read-only, writes acculynx_probe_report.md
python3 acculynx_probe.py
```

**Gate:** read the report (it contains no secrets — safe to hand to the
session). It answers: does the key work at all; how many jobs sit in each
milestone; do the AccuLynx user emails match Cardinal's roster; **which
pagination parameter and page size this account actually accepts** (§2 and
§2b — both cross-check what `fetch_acculynx.py` is configured to send, and
say "stop and fix" if they have drifted apart); and the big one — **did any
file read route answer**, because AccuLynx's public docs show upload-only file
endpoints. No file route ≠ no migration: records proceed regardless, files
fall back (see "If files are unreachable").

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

## If files are unreachable (the probe said NO-GO)

That matches AccuLynx's public documentation, and the records import is
unaffected. The options, in order of effort: pull the documents that matter
by hand for the jobs Theo names (the review CSV shows which jobs claim
files); a browser-automation pass against the AccuLynx web UI with the
admin session — a separate build, decided separately; or a data-export
request to AccuLynx. The push can attach late-arriving files any time — it
is idempotent.

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
