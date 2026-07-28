# Cardinal Resource App — Open Items

*The single live list. Current at build 394 · July 28, 2026.*
*When something ships, strike it here and add a line to `cardinal_build_log.md`.*

> **Everything below was verified against the repo or the database on July 28, not carried
> forward from the previous list.** The prior version of this file listed four items as open
> that were already done — `punch_columns.sql`, the $10,000,000 test client, the repo junk,
> and the profile photos. Repeating a stale to-do list wastes more time than having none.
> **Check before you list.** The Supabase connector answers schema and data questions
> directly; the GitHub API answers "is this file still there."

---

## 1. SQL

**Nothing pending.** `punch_columns.sql` was run — `punch_items.scheduled_at` (date) and
`punch_items.photos` (jsonb) both exist. Verified by querying `information_schema.columns`.

The Scheduled tab and the five-photo close are live but **untested against real data**:
there are 3 punch items total and none are scheduled. That is a coverage gap, not a bug.

---

## 2. Blocked on someone else (Theo's action, not code)

| Item | State | What unsticks it |
|---|---|---|
| **ABC Supply 401** | App registered, credentials + `ABC_ENV` in Vercel, `api/abc.js` reachable, but ABC's auth rejects the pair on **both** sandbox and production | Clean re-paste of both values using the portal's clipboard icons, redeploy (env changes only reach a **new** deployment). If it persists, email **apisupport@abcsupply.com** |
| **ABC account numbers** | Not entered | Ship-To and Bill-To from an invoice or myABCsupply (Branch # 106 already entered) |
| **OpenAI quota (429)** | Coach fallback down | Add credit |
| **Resend sender domain** | Daily digest 403s | Verify `cardinalrenovations.net` DNS, then swap the from-address in `digest.js` |
| **Gemini key** | Exposed in an old session, still unrotated; free tier also 503s | Rotate in Google AI Studio → update `GEMINI_API_KEY` in Vercel → attach billing. **This also gates the Scope-of-Loss autofill on new leads (358)** |
| **GitHub PAT** | Pasted into chat in the 374–388 session | Revoke if not already done: GitHub → Settings → Developer settings → Personal access tokens |
| **Contract PDFs** | Roofing + gutter ready; siding and windows **missing** | `docs/` now exists in the repo. Siding/window masters were built July 20 in the *"Digital roofing contract formatting"* chat |
| **Supabase PITR** | Unconfirmed | Confirm point-in-time recovery is on |

### Done — do not re-list
- ~~`punch_columns.sql`~~ — run; both columns verified present
- ~~$10,000,000 test client~~ — deleted; zero rows match
- ~~Repo junk~~ — `api/api/`, `Index.html` (capital I), `cardinal_v389_index.html` and the five stale root docs are all gone
- ~~Profile photos: "everyone shows initials"~~ — 5 of 9 `team_profiles` rows have a photo
- ~~CI false positive~~ — the `module.exports` grep matched a comment in `api/invite.js`; comment reworded, CI green

---

## 3. Verify on device

- Menu → 🩺 **Self Check** on Retail, Claims, Community home, community client
- **Punch (361–368):** home strips per CRM, unified page filters, detail sheet, assignee + priority dropdowns, five-photo close, Scheduled tab
- **Back button (367):** Home → Leads → client → Punch, then Back four times
- **Scroll lock (364):** open a contract, leave via a banner item, confirm the next page scrolls
- **Community (359–364):** desktop width, folds, All bids, bid editing, partner colours

---

## 4. Retail light theme — where it actually stands

**Covered and verified on device:** Estimates · All Leads & Jobs · Home · Photo Activity ·
Team + Production calendars · **client profile (389)** · **standalone Punch page (390)** ·
**Client Directory (391–392)** · **Production board (393)**.

**Audited and needs nothing** — this was four items on the old list and three of them were wrong:
- **Objection Coach** — built light from the start, its own tint palette. Never had a dark version.
- **Team Directory** (`#e8e6e1`) and **Client Portal** (`#f7f2e7`) — light by design.
- **Reports, Photos & Album, Photo album filter, Walkthrough, Cross-links, Pricing catalog, ABC Supply, NACHI content, Adjuster Directory, BPA** — declare no ground of their own, so they inherit `--bg` and already follow the theme. This is what build 386 bought.

**Genuinely remaining:**

| Surface | Ground | Note |
|---|---|---|
| Resource Library | `#14100e` | Own warm-dark palette |
| Self Check | `#12161c` | Diagnostic tool, low traffic |
| Estimate publish | `#3a3a3a` | Small surface |
| Bulk assign | `#4a6fa5` | Blue — likely a header bar, not a ground. Look before assuming. |

**Deliberately staying dark:** the **Photo editor** (`#101010`). You judge photos against it;
a light ground changes how they read. Same reasoning as the calendars.

**Not started and not planned:** Claims and Community. The toggle is retail-scoped.

---

## 5. Build queue (code, unblocked)

1. **Partner colour as a stored field.** Community partner colours are matched on name, so a new or renamed partner reads neutral. Verified: `partners` has no `color` column. Add one, set it in the Partners directory, have every surface read it. **This is the only open database item.**
2. **Distinguish "no clients" from "couldn't load."** Both render the same empty state, which is why a transient read failure looked like data loss.
3. **Real PDF export.** Downloads are standalone `.html`. A `/api/pdf` endpoint using the ReportLab toolchain that built the contract masters would give true `.pdf`.
4. **Siding + window contract masters** — the moment those PDFs are found; both need the same letter-split as roofing.
5. **ABC phase 2** once credentials work: response-shape tuning → "+ ABC Supply" inside the estimate editor → ordering → webhooks to the production board.
6. **Old landing markup** — never paints since 309, still in the file for its boot writers. Delete markup and writers together, carefully.
7. **Community activity filter** — enhancement, not a bug.
8. **Backfill for pre-331 typeless clients** — deliberately not done; a backfill has to guess.

---

## 6. Settled — don't re-litigate

- **Header title is 40px, solid `var(--hac)`** (373). Supersedes the fixed-34px decision from 322.
- **Client cards carry no cover photo** (370). `cover_image` still feeds the client profile header.
- **No auto-archive on estimates.** Accepted estimates stay in their lane.
- **No fourth community tab.** Bids / Partners / Clients are the three nouns of the work.
- **Bids are estimates** — same table, same pipeline.
- **One punch pipeline.** `CardinalPunch` is the only data layer.
- **`estimate_line_items` stays unscoped** — it's the shared price book.
- **Retail light theme is tokens, not an override layer.** `--rbe-*` in `:root` + `:root[data-theme="rb-light"]`. **Three sanctioned exceptions**, all where dark and light needed genuinely different designs rather than one design in two palettes: the **calendars** (387), the **brass Client Directory** (391) and the **Production board** (393). In each, the dark original is untouched byte-for-byte.
- **Semantic colours stay fixed in both themes** — milestone circles, status spines, urgency red, CRM badges, the lavender PO, photo captions.
- **The header chrome doesn't follow the page theme.** Dark chrome over a light page is intended.
- **Sales Floor: red is the objection, navy is your answer** (394). Colour carries meaning there; do not spend either colour on decoration.
- **Owens Corning** (Preferred Contractor) throughout, not GAF. TruDefinition Duration is Class 3; FLEX and STORM are Class 4; both qualify for the policy discount. Standard warranty 5-year workmanship; OC upgraded tiers 10-year / transferable.
- **Habitat for Humanity of Greater Dayton** — commercial partnership, logo use permitted.
