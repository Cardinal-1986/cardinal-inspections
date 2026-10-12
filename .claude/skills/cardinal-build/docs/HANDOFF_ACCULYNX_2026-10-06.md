# AccuLynx migration — handoff to a desktop session

*Written 6 Oct 2026 from a cloud session. Everything below was measured against
Cardinal's live AccuLynx account that day, not recalled.*

**Read this with `spark/ACCULYNX_MIGRATION.md`** — that is the runbook and it
holds the gate sequence, the credentials fence and the click-paths. This file is
the state: what is true now, what is still parked, and what a desktop session
should actually do.

## Why a desktop session

A cloud session can run the probe, the fetch and the dry run, but it cannot do
three things, and all three matter here:

| Blocked in the cloud | Why | On your PC |
|---|---|---|
| `pip install openpyxl` (or anything) | the environment's network policy denies `pypi.org` with a 403 | works |
| open an `.xlsx` to check it renders | LibreOffice in the container cannot load even a trivial CSV | you have Excel |
| hold the admin password safely | a cloud environment has no secrets store, and `CARDINAL_PASSWORD` is a live admin login | it never leaves the machine |

That last one is Theo's own decision of 11 Aug and it is why gate 3 was run from
his Windows desktop in August rather than from a cloud session.

## Where the migration actually stands

**Gates 1 and 2 are done and were re-run on 6 Oct. Gate 3 passed on 13 Aug from
Theo's desktop. Gates 4 and 5 have never run. Nothing has ever been written to
Cardinal.**

The account as of 6 Oct 2026 — 238 jobs total:

| Stage | Jobs |
|---|---:|
| Lead | 11 |
| Prospect | 83 |
| Approved | 53 |
| Completed | 8 |
| Invoiced | 13 |
| Closed | 24 |
| Cancelled | 46 |
| **In migration scope** | **192** |

In August it was 166 in scope, so **26 live jobs have been added since**. The
August dry run reported `164 new · 2 collisions · 0 unmappable · PO 1044–1207`;
those numbers are now stale by roughly 26 rows and the PO ceiling will have
moved, so **the dry run has to be re-read, not assumed**.

### ⚠ "Dead" is not a stage on this tenant — the old counts double-counted

AccuLynx's `milestones=dead` and `milestones=cancelled` filters return the
**identical 45 job ids**, and all 45 carry `currentMilestone: "Cancelled"`.
Earlier notes in this doc set record "cancelled 35 + dead 35" as if they were
two piles of jobs. They were one pile of 35, counted twice.

**So exclude on the milestone, not on the filter.** One job (Kate Sandford,
created 8 May) is `Cancelled` with a dead reason but appears in *neither*
filter, because it is unassigned and both filters skip unassigned jobs. Filtering
by milestone catches it; filtering by endpoint does not. That is the difference
between 46 and 45.

### What cannot be migrated, and is settled

- **Files, documents and photos: NO-GO.** Every candidate read route 404s on
  every job, re-confirmed 6 Oct. AccuLynx's public API is upload-only.
- **Notes: also NO-GO.** 806 job messages across 156 of the jobs. Twelve
  endpoint spellings all 404; `/jobs/{id}/history` records *that* a note
  happened but never its text.
- ⛔ **Settled by Theo (13 Aug): front door only.** No scraping, no
  browser-automation pass. The runbook previously *recommended* that pass; that
  text is corrected. **Do not propose it again.** The permitted routes, in
  order: an offboarding data-export request · asking AccuLynx for written
  permission · asking whether another API tier exposes message/file reads ·
  AccuLynx's own Reports/CSV exports.
- ⛔ **Do not cancel the AccuLynx subscription until this is settled.** The 806
  messages and every document die with the account — the same trap already
  recorded for CompanyCam.

### Five faults already found and fixed — do not rediscover them

All five are fixed on `main`. They are listed so a desktop session does not
spend a night re-finding them:

1. `/jobs` pages by **`pageStartIndex`**, not `recordStartIndex`. An unknown
   query parameter is **ignored, not refused** — the wrong name answers HTTP 200
   with page one, forever.
2. `pageSize` has a **hard cap of 25** on `/jobs`, and the cap is per-endpoint.
3. The site address is at **`job.locationAddress`**; reading `address` gave all
   166 clients a blank address — which also silently disabled duplicate
   detection, making the first dry run's "0 collisions" an artifact.
4. `/jobs/{id}/representatives` returns `user` as an unexpanded `{id,_link}`
   ref with no email, so **every client landed on the admin**.
5. That fallback was **silent**, because the "rep not on roster" warning keyed
   off a display name that was also empty on an unresolved ref.

**Both offline harnesses were green through all five**, because their fixtures
were invented rather than observed. That is `BUG_CLASSES.md` 44 and 45.

Verified again on the 6 Oct pull: **0 blank addresses in 238 records**, and reps
resolve across all six people — theo 63 · jacob 45 · joey 40 · nick 39 ·
jerry 37 · curtis 9, with **5 jobs carrying no rep at all** on the AccuLynx side
(those will land on the admin, correctly).

## Two decisions still parked — these block gate 4

Nothing should be pushed until Theo answers both:

1. **Two real collisions** — jobs already in Cardinal. Default is **attach the
   AccuLynx data to the existing record, not create a duplicate**:
   - Karrie Johnson, 804 E Center St
   - Dan Thompson, 2825 Arden Ave
2. **Two AccuLynx test records** that would otherwise import as clients —
   `test test` and `Team Test`, both at 5735 Webster Street. The first also
   carries Theo's own email address.

Re-confirm both against a fresh dry run; the collision set may have grown with
the 26 new jobs.

## Settled decisions — do not re-litigate

From 11 Aug, and still binding:

- **Everything imports as `retail`.** The insurance data rides along inside
  `checklist.lead.insurance` and the sort to insurance/community happens
  *afterwards*, as reviewed SQL (Phase C). Only **8 of 238** jobs carry
  insurance data, so that sort is small.
- **Cancelled jobs stay behind.** Adding them later is one `--milestones` flag;
  the import is idempotent.
- **A name + street-number match against an existing Cardinal client attaches
  to that record** rather than creating a second one.
- **No service-role key, ever.** The push signs in as a real admin through the
  public anon key.

## What to do, in order

```bash
cd <your clone of cardinal-inspections>
git pull
python3 --version                 # 3.8+; on Windows use `py`
```

The three scripts are standard-library Python — nothing to install:

```bash
# 1 · the fetch — needs the AccuLynx key ONLY, never a Cardinal credential
export ACCULYNX_API_KEY='...'
python3 spark/fetch_acculynx.py --dest ./acculynx_export
```

~15 minutes for 238 jobs. **Resumable** — Ctrl-C costs nothing, re-run the same
command and it carries on from `jobs.jsonl`.

```bash
# 2 · the dry run — needs the Cardinal login ONLY, never the AccuLynx key
export CARDINAL_EMAIL='theo@cardinalrenovations.net'
export CARDINAL_PASSWORD='...'
python3 spark/push_acculynx.py --src ./acculynx_export --dry-run
```

**Gate — read both files before anything else runs:** `acculynx_review.csv`
(every incoming client, its PO, its rep, warnings) and `collisions.csv`. Wrong
matches get fixed *here*. Check the total is ~192, the stage spread matches the
table above, and the two test records are visible.

```bash
# 3 · the pilot — five real clients, then LOOK at all five in the app
python3 spark/push_acculynx.py --src ./acculynx_export --limit 5

# 4 · the real run — off-hours, with nobody creating leads in the app
python3 spark/push_acculynx.py --src ./acculynx_export
```

**Keep the batch stamp it prints.** Rollback is
`--rollback <STAMP>`, which reads the batch's own write ledger and asks you to
type `DELETE`.

⚠️ **Do not run the real push while the team is creating leads.** PO numbers are
computed as live-max-plus-one at start and collide if the app is allocating them
at the same time.

**After the records land:** reconcile the counts (imported + skipped +
collisions = AccuLynx's number, every checklist still parses), then run the
retail→insurance/community sort with Theo, one reviewed step at a time.

## The spreadsheet

`spark/acculynx_sheet.py` turns a fetched `jobs.jsonl` into a two-tab workbook —
one row per job on **Clients**, live `COUNTIF` totals on **Summary**:

```bash
python3 spark/acculynx_sheet.py ./acculynx_export/jobs.jsonl acculynx_clients.xlsx
```

It also writes a `.csv` beside it. It uses `spark/minixlsx.py`, a small
standard-library `.xlsx` writer, **so it needs no packages at all** — written
that way because the cloud container has no `openpyxl` and cannot reach PyPI.
On your PC it works the same; there is nothing to install either way.

It reads its fields through `push_acculynx.py`'s **own** extractors, so the
sheet shows exactly what an import would produce. A second extractor would be
free to disagree with the importer, and that divergence is what produced three
of the five faults above.

⚠️ The workbook written on 6 Oct was **never opened by a renderer** — the cloud
container's LibreOffice is broken. It was verified structurally and every formula
carries a pre-computed value, so the numbers are right with or without
recalculation, but **the first person to open it in Excel is the real check.**

## One thing worth deciding separately

**179 of the 238 jobs have no email address in AccuLynx, and 32 have no phone.**
Street addresses are complete (238 of 238). That is the source data, not the
export — the import cannot invent contact details, and the standing rule applies:
**never write an unverified email address.** It means a quarter of the imported
client base will arrive contactable by email and the rest will not.
