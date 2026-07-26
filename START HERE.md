# Cardinal Resource App — Start Here

**Read this before doing anything.** It replaces `Cardinal_Project_Knowledge.pdf`, which is from build 90 and would send you down several wrong paths.

**Current build: 276 · July 24, 2026 · 2.19 MB (63% of budget) · 72 modules · 6 source patches**

---

## What this is

A single-file web app (`index.html`) for **Cardinal Roofing & Renovations, LLC** — Dayton, Ohio, roofing since 1986. Team CRM, inspections, estimates, contracts, photos, production, claims. Deployed on Vercel from GitHub, installable as a PWA.

**Owner:** Theo Dorion · theo@cardinalrenovations.net

| Role | People |
|---|---|
| Admin | theo@, joan@ |
| Production | curtis@, scottie@ |
| Sales | nick@, joey@, jacob@ |

Admins and production see all clients; sales see only what they created or are assigned.

---

## The one mistake that keeps happening

**Building something the app already has.** It happened four times in one session:

| Built | Already existed as |
|---|---|
| Manual Estimates | `+ New estimate` templates, with signature, email, share link, print |
| Photo Gallery | the Photo Album, wired into the inspection-report pipeline |
| PO numbers (`PO-YYYYMMDD-HHMM`) | `nextPo()` → `checklist.po`, sequential, searchable, used for invoice numbers |
| `stage_since` on community bids | the field seven other things compute aging from |

Every time, the tell was the same: **I grepped for a term I invented instead of asking what the base already calls it.**

The check that actually finds these isn't a search — it's a comparison. *What does the base write here, and do I write the same?* Run it before building anything that creates or updates a record:

```bash
# what the base sets on project create vs what your path sets
grep -A20 "from('projects').insert" <module> 
grep -A20 "pdb.create(" /mnt/user-data/uploads/index.html
```

Read **`FEATURES.md`** first, every time.

---

## Four more that cost real time

### Never guess a function or selector name

| Guessed | Reality | Cost |
|---|---|---|
| `#projView` | `#projectView` | Maps and PO badges never rendered, for weeks |
| `openDoc` / `editDoc` / `showDoc` | `openEditor(id)` | Publish made documents then never opened them |
| `gemini-2.0-flash-exp` | `gemini-3.5-flash` | Hours of 404s on a deprecated model |
| `CardinalCoach.practice(true)` | `true` means *Cardinal Truth*, not "the hub" | Back from the Coach landed on the wrong CRM |

All four passed every syntax check. Grep the base and confirm. For external APIs, **search the web** — training data goes stale.

**And beware verifying with a bad pattern.** `grep "var ck"` matched `var ck2 = ck(pr)` — a *usage*. I confirmed a function existed by finding the line that proved it didn't.

### The document system gives you four features free

Any HTML through `window.db.create(title, html, projectName, projectId)` gets **share link · email to client · client signature · print/PDF**. Table: `inspection_reports` (misleading name — holds all documents). Never rebuild that stack.

### Deploy has two landmines

- **No spaces in `api/` filenames.** Vercel rejects the *entire build*, at deploy time, silently. Cost two days.
- **`api/package.json` is `"type": "module"`.** One `module.exports` breaks *all* functions.

Both are now CI-checked. See "Safeguards" below.

### `write_text()` truncates before it encodes

A `UnicodeEncodeError` mid-write reduced `splice.py` itself to **zero bytes**. Use HTML entities (`&#127919;`) in the footer string, never surrogate escapes (`\uD83C\uDFAF`). The build writes atomically now, and backs itself up.

---

## Safeguards in place

**Every build runs:** lint → splice → integrity → smoke, and fails on any of them.

| Layer | Catches | File |
|---|---|---|
| **Lint** | `try{ asyncFn(); }catch` — a catch that can never fire | `/home/claude/lint.py` |
| **Integrity** | script/div balance, JS parse of all 82 blocks, size budget | in `splice.py` |
| **Smoke** | each major view actually renders, against a real DOM | `/home/claude/smoke.js` |
| **CI** | filenames with spaces, `module.exports`, truncated uploads | `.github/workflows/check.yml` |
| **Self Check** | a control that exists but can't be tapped | Menu → 🩺, `self_check.html` |

**The smoke test is the important one.** Every other check reads the source. A plain `ReferenceError` thrown inside an `async` function hid for six builds — syntactically perfect, silently dead, old layout left on screen. Only running the code found it.

**Its limit:** jsdom has no layout engine. It catches *does this work*, never *does this look right*. Stacking, spacing and colour bugs are invisible to it.

**That gap is what Self Check fills.** It runs in the real browser and asks `document.elementFromPoint` what a tap at each control's centre would actually hit — a real hit test, with real CSS applied. It would have caught both dead menu buttons in one call. Menu → 🩺 Self Check, or `CardinalSelfCheck.run()`.

Writing it took three rounds of fixing *the checker*, not the app: unscoped selectors matched hidden elements from closed views, then below-the-fold controls were called unreachable. Expect that. A checker that cries wolf gets ignored, so chase every false positive down or delete the check — as I did with a lint that produced 178 of them.

**When you add a full-screen view, add it to `CASES` in `smoke.js`.** Otherwise it isn't covered.

**Backups** written on every successful build: `/tmp/splice_backup.py`, `/tmp/index_work_backup.html`, `/tmp/minify_backup.py`, `/tmp/smoke_backup.js`. `index_work.html` is the pristine base every source patch anchors to — without it the build cannot be reconstructed.

---

## How builds work

```
/mnt/user-data/uploads/index.html   ← pristine base (never edit)
              ↓
        splice.py                    ← 6 source patches + 71 modules + minify
              ↓
/mnt/user-data/outputs/index.html    ← what ships
```

**Source patches** are exact string replacements. Each raises `SystemExit` if its anchor isn't found — a whitespace mismatch aborts the build rather than silently dropping the fix. That has already saved one build.

**Order matters.** `pwa_nav_clearance.html` splices last so its `!important` clearance wins.

**Handing files over:** always a uniquely named file — `cardinal_v271_index.html`. Mobile browsers serve cached downloads when the filename repeats; that once cost a full session while Theo sat on build 188.

---

## Architecture

**Three CRMs, one database.** Discriminator is `checklist.lead.claim_type` — `retail` | `insurance` | `community` | `unknown`.

| Surface | Accent | Ground |
|---|---|---|
| Retail | gold `#d4a017` | light |
| Insurance ("Cardinal Claims") | teal→lime gradient | `#08161a` |
| Community | green `#4a8c5a` | light |
| Sales Floor | red `#C8202E` | `#17120f` |
| Production | hi-vis `#f5a623` | `#14171b` |

**Stage labels are render-time only.** `projects.stage` stores eight canonical values — `Lead`, `Prospect`, `Approved`, `Scheduled`, `Completed`, `Invoiced`, `Closed`, `Lost`. Insurance and community rewrite the *displayed* label. **Never translate the stored value**; Schedule Board, reports, filters and notifications all read it.

Same principle covers supplements: a claim in `Approved` with `supplement_status='filed'` *renders* on the Supplement Filed node. No ninth stage.

**Fields every creation path must set:** `checklist.po` (via `nextPo()`), `checklist.stage_since`, `checklist.lead.claim_type`. Missing any of these breaks search, aging or portal routing — silently.

**Gotcha:** the client name column on `projects` is **`name`**, not `client_name`.

---

## Bug classes that recur

**Overriding base CSS is a trap past a few properties.** The insurance header kept reverting because the base styles it separately and every rule I didn't think to override kept winning. Once you're fighting more than a handful, **replace the element** instead — hide the base one and render your own. You stop guessing what you missed.

**z-index only ranks siblings within a stacking context.** `#navMenu` lives inside `header.site` (z-90); the insurance views are z-155. No value on the menu could lift it out — it had to be reparented to `<body>`. "Raise the number" and "move the element" are different fixes.

**Fixed-position bars showing outside their context.** Hit twice. If an element is `position: fixed` and toggled by a class, it *must* check its host is visible.

**A caching guard must check the cache is still valid**, not just that the input is unchanged. A signature comparison skipped rendering while our markup wasn't even on screen.

**A close function that also navigates can't be reused for a handoff.** Both new pages take `close(goHome)`.

**Replacing innerHTML orphans handlers and elements.** `showLanding()` writes to `#landName` *without null guards* before showing the view — removing it threw and the switcher's Landing option silently did nothing.

**Translucent warm tints over cool grounds go muddy.** 13% amber over `#434e5c` computes to washed grey. Use solid values.

---

## Database

Supabase. Tables: `projects`, `inspection_reports`, `project_photos`, `appointments`, `audit_events`, `team_profiles`, `insurance_claims`, `punch_items`, `community_partners`, `community_properties`, `objections`, `objection_attempts`, `objection_logs`, `estimates`, `estimate_line_items`, `estimate_templates`, `nachi_series`, `nachi_articles`.

Storage bucket `photos`, prefixes: `projects/{id}/`, `scopes/`, `punch/`, `nachi/`.

**14 SQL migrations** in outputs, all idempotent and **all run as of build 276**. Verify rather than assume:

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='<table>';
```

**Insurance data was consolidated at v244.** `insurance_claims` is authoritative; `checklist.lead.insurance` is mirrored for the old readers and can be dropped once nothing uses it.

---

## API functions

`analyze` · `caption` · `coach` · `ai-status` · `config` · `senddoc` · `share` · `clientsign` · `notify` · `digest` · `sol` · `organize` · `hover` · `summarize` · `roofr` · `ping` · `estimate-to-contract`

**`sol.js` does double duty** — `mode:'client'` reads an AccuLynx record for import, anything else reads a scope of loss. Accepts `{url}` (preferred, ~20 MB) or `{file, mime}` (legacy, ~3 MB ceiling — Vercel caps the request body at 4.5 MB and base64 inflates by a third).

**Gemini keys are `AQ.` format** — send as an `x-goog-api-key` **header**, not `?key=`.

**`/api/ai-status`** returns live health for Gemini, OpenAI and Supabase. Hit it first when AI misbehaves.

---

## Open items

**Blocking:**
- **OpenAI quota exceeded** (429) — the Coach's fallback provider is down until credit is added
- **Resend sender domain unverified** — the 11:00 digest has been 403ing since ~July 18. Verify `cardinalrenovations.net` (3 DNS records), then swap the from-address in `digest.js`

**Housekeeping:**
- Rotate the Gemini key (it appeared in a chat once)
- Verify `auth.users` emails match the hardcoded roster
- Delete repo junk: `api/api/`, `api/index.html`, `api/vercel.json`, the throwaway `cardinal-app` Vercel project
- Confirm Supabase point-in-time recovery is on — nothing currently protects the data, and bulk delete exists
- `header_two_row.html` carries 64 `!important` declarations, the heaviest override in the app. A candidate for replace-don't-patch, but it's the app-wide header — do it deliberately with a preview, never as part of a sweep

---

## Working with Theo

- **Terse, honest reporting.** He's called out overconfident claims more than once, and he's been right.
- **Mobile-first.** He tests on an iPhone; most screenshots come from a phone.
- **One thing at a time,** verified, then the next.
- Say what's broken and why, rather than describing what should happen.
- **Offer a preview before shipping anything visual.** Toggles between options work well for colour decisions — he picks quickly from a good set.
- When he reports a bug, **reproduce it before theorising.** Several times today the obvious explanation was wrong and a five-minute test found the real one.

---

## Companion documents

| File | What it is |
|---|---|
| `FEATURES.md` | Every feature and where it lives — **read before building** |
| `cardinal_build_log.md` | One line per build |
| `cardinal_session_summary.md` | Narrative of the July 24 session |
| `check.yml` | The corrected CI workflow |

---

*Written at build 276. Update the build number and open items when things change.*
