# Cardinal Resource App — Open Items

*The single live list. Current at build 388 · July 27–28, 2026.*
*When something ships, strike it here and add a line to `cardinal_build_log.md`.*

---

## 1. Run this SQL (blocks two shipped features)

| File | Adds | Without it |
|---|---|---|
| **`punch_columns.sql`** | `punch_items.scheduled_at` (date), `punch_items.photos` (jsonb) | The Scheduled tab stays empty and photos can't be stored — the app says so plainly instead of failing silently, but the 5-photo close rule can never be satisfied |

Supabase → SQL Editor. Safe to run twice. **SQL first, then index.html.**

---

## 2. Blocked on someone else (Theo's action, not code)

| Item | State | What unsticks it |
|---|---|---|
| **ABC Supply 401** | App registered, credentials + `ABC_ENV` in Vercel, `api/abc.js` reachable, but ABC's auth rejects the pair on **both** sandbox and production | Clean re-paste of both values using the portal's clipboard icons, redeploy (env changes only reach a **new** deployment). If it persists, email **apisupport@abcsupply.com** |
| **ABC account numbers** | Not entered | Ship-To and Bill-To from an invoice or myABCsupply (Branch # 106 already entered) |
| **OpenAI quota (429)** | Coach fallback down | Add credit |
| **Resend sender domain** | Daily digest 403s | Verify `cardinalrenovations.net` DNS, then swap the from-address in `digest.js` |
| **Gemini key** | Exposed in an old session, still unrotated; free tier also 503s | Rotate in Google AI Studio → update `GEMINI_API_KEY` in Vercel → attach billing. **This also gates the Scope-of-Loss autofill on new leads (358)** |
| **Repo junk** | Clutter | Delete `api/api/`, `api/index.html`, `api/vercel.json` |
| **Contract PDFs** | Roofing + gutter ready; siding and windows **missing** | Create `docs/` in the repo (it doesn't exist — that's the 404), upload the three ready files. Siding/window masters were built July 20 in the *"Digital roofing contract formatting"* chat |
| **Supabase PITR** | Unconfirmed | Confirm point-in-time recovery is on |
| **$10,000,000 test value** | Database data, not code | Open that client and fix the bid amount |
| **Profile photos** | Everyone shows initials | Team → your row → pencil → photo. Feeds the activity feed, punch, community and client surfaces at once |

---

## 3. Verify on device

- Menu → 🩺 **Self Check** on Retail, Claims, Community home, community client
- **Punch (361–368):** home strips per CRM, unified page filters, detail sheet, assignee + priority dropdowns, five-photo close, Scheduled tab
- **Team Directory (373):** grouping, tap-to-call, Add teammate, a non-admin editing their own row
- **Badge client cards (370):** phone gallery and the desktop horizontal row
- **Back button (367):** Home → Leads → client → Punch, then Back four times
- **Scroll lock (364):** open a contract, leave via a banner item, confirm the next page scrolls
- **Community (359–364):** desktop width, folds, All bids, bid editing, partner colours

---

## 3b. Retail light theme — remaining surfaces

The theme works and is verified on device through build 388. Remaining, roughly in order of how much they'd be missed:

1. **Client profile page** (the Keeper profile) — the biggest surface left and the one the crew touches most. Hero, Job Menu tiles, Location map card, Payments/Punch/History pills, Cardinal-red timeline. **Check first whether any of it is deliberate-contrast rather than an unswept gap** (see BUG_CLASSES B3).
2. **Standalone Punch page** (`#punchView`) — the "See all ›" destination. Home strip is done; the page is not.
3. **Production board** · **Reports** (charts may need canvas-level colour work) · **Contacts / Client Directory** (brass — may need its own design decision like the calendars did).
4. **Sales Floor**, Objection Coach, Documents, Scheduling — lower traffic.

**Not started and not planned:** Claims and Community. The toggle is retail-scoped; nothing there is affected.

**Verify on device:** every colour claim in builds 374–388 rests on Theo's eyes, not the gates — jsdom cannot see tokenized colour (BUG_CLASSES B2).

---

## 4. Build queue (code, unblocked)

1. **Partner colour as a stored field.** Community partner colours are matched on name, so a new or renamed partner reads neutral. Add a `color` column on the partner record, set it in the Partners directory, and have every surface read it.
2. **Distinguish "no clients" from "couldn't load."** Both render the same empty state today, which is why a transient read failure looked like data loss. A failed read should say so and offer a retry.
3. **Real PDF export.** Downloads are standalone `.html`. A `/api/pdf` endpoint rendering with the ReportLab toolchain that built the contract masters would give true `.pdf`.
4. **Siding + window contract masters** — the moment those PDFs are found; both need the same letter-split as roofing.
5. **ABC phase 2** once credentials work: response-shape tuning → "+ ABC Supply" inside the estimate editor → ordering → webhooks to the production board.
6. **Old landing markup** — never paints since 309, still in the file for its boot writers. Delete markup and writers together, carefully. **Decide first whether the landing screen is coming back** — it was raised at 373 and deferred.
7. **Community activity filter** — the Activity tile opens the team-wide feed; a community-only filter is an enhancement, not a bug.
8. **Backfill for pre-331 typeless clients** — deliberately not done; a backfill has to guess.

---

## 5. Settled — don't re-litigate

- **Header title is 40px, solid `var(--hac)`** (373). This supersedes the fixed-34px decision from build 322.
- **Client cards carry no cover photo** (370). `cover_image` still feeds the client profile header — that's a different feature.
- **No auto-archive on estimates.** Accepted estimates stay in their lane.
- **No fourth community tab.** Bids / Partners / Clients are the three nouns of the work.
- **Activity and Calendar are the app's existing surfaces**, not new ones.
- **Bids are estimates** — same table, same pipeline.
- **One punch pipeline.** `CardinalPunch` is the only data layer; the profile card, board, strips and page all read it.
- **`estimate_line_items` stays unscoped** — it's the shared price book.
- **Retail light theme is tokens, never an override layer.** `--rbe-*` in `:root` + `:root[data-theme="rb-light"]`. The calendars are the single sanctioned exception (dark and light are genuinely different designs there).
- **Semantic colours stay fixed in both themes** — milestone circles, status spines, urgency red, CRM badges, the lavender PO, photo captions. The list is in FEATURES.md; don't "finish the job" by tokenizing them.
- **The header chrome doesn't follow the page theme.** Dark chrome over a light page is intended.
- **Owens Corning** (Preferred Contractor) throughout, not GAF. TruDefinition Duration is Class 3; FLEX and STORM are Class 4; both qualify for the policy discount. Standard warranty 5-year workmanship; OC upgraded tiers 10-year / transferable.
- **Habitat for Humanity of Greater Dayton** — commercial partnership, logo use permitted.
