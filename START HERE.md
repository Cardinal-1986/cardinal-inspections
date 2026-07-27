# Cardinal Resource App — Start Here

**Read this before doing anything.**

**Current build: 332 · July 27, 2026 · ~2.21 MB · 85 inline script blocks**

---

## What this is

A single-file web app (`index.html`) for **Cardinal Roofing & Renovations, LLC** — Dayton, Ohio. Team CRM, inspections, estimates, contracts, photos, production, claims. Deployed on Vercel from GitHub (Cardinal-1986/cardinal-inspections) to app.cardinalroster.com, installable as a PWA. Supabase backend.

**Owner:** Theo Dorion · theo@cardinalrenovations.net

| Role | People |
|---|---|
| Admin | theo@, joan@ |
| Production | curtis@, scottie@ |
| Sales | nick@, joey@, jacob@ |

Admins + production see all clients; sales see only what they created or are assigned (database-enforced). **Totals are admin-only** — production sees rows for scheduling but no stats strips or partner money (presentation-gated); sales see their own numbers computed from the only rows RLS gives them.

---

## How builds work now (changed this session — the splice pipeline is gone)

There is no `splice.py`, no module folder, no pristine base. **All work is direct surgery on the shipped built file.**

```
/home/claude/app/index_v{N}.html      ← lineage, one file per build
        ↓  python patch script
/home/claude/app/index_v{N+1}.html    ← atomic temp-file-then-rename
        ↓  gates (below)
/mnt/user-data/outputs/cardinal_v{N+1}_index.html   ← unique filename, Theo uploads as index.html
```

Rules that are non-negotiable:
- **Every edit is exact-match** with `assert src.count(old) == 1` (or an explicit expected count). A failed assert aborts before the write — the previous build is never corrupted. This fired repeatedly today and saved the build every time.
- **The patch helper is literal string splicing. It does NOT expand regex backreferences.** Passing `\1` into it wrote literal `\1` into the CSS and destroyed five skin rules (build 302). Use `re.sub` for backrefs or reconstruct strings whole.
- **Bump the build label every build** — search `v2026-` to find the string. "The build shows 297" cost a debugging round.
- **Unique output filename every build** (`cardinal_v308_index.html`) — mobile browsers serve cached downloads on repeated names.
- **Deploy order: SQL first, then index.html.** After deploy, fully close and reopen the PWA twice — the service worker serves stale builds.

**Gates run on every build, in order:**
1. `node --check` on all 83 inline script blocks (extracted individually)
2. Tag balance (`<script>/<style>` pairs) and CSS brace balance on any touched style block
3. **Whole-string assertions** — gates must assert entire rules/structures, never fragments. A fragment check passed while the rule around it was destroyed (build 302→303).
4. jsdom functional harness: boot the file, mock `cacheProjects`/`currentUser`/chainable `sb`, shim `offsetParent` (`Object.defineProperty(HTMLElement.prototype,'offsetParent',{get(){return this.parentNode}})` — jsdom has no layout), filter jsdom "Not implemented" noise (canvas, scrollTo) without failing on it, then exercise the changed surface with **structural proofs** (`matches()`, parentage, counts) — never programmatic clicks alone, which succeed on hidden elements.
5. **Harnesses must replicate the real structure.** A harness seeded from the author's assumption validated pure fiction twice today (`jabox` vs the real `.jatile` grid). Read the real builder, copy its markup and its delegation, then test.
6. **Dupe-API check** (new after build 308): no `window.Cardinal*` may be plainly assigned twice. Grep `window\.(Cardinal\w+)\s*=` — any name appearing more than once must use `Object.assign(window.X || {}, {...})`.
7. **Negative control before belief** (new, build 330): a gate that has never failed proves nothing. Run the same gate against the *previous* build and confirm it fails there before trusting a pass. Build 330's first attempt staged a stale file containing none of the fix while the gate reported green — it was matching an unrelated query elsewhere in the app.
8. **Assert on the artifact you just wrote.** Check the marker string is in the output file, not just that the patch script "ran".
9. Stage to outputs **only on green**.

**jsdom's limit is unchanged: it proves *does this work*, never *does this look right*.** Misalignment testing is Menu → 🩺 Self Check on the phone plus Theo's eyes. Say so instead of pretending.

---

## Patch vs replace — the doctrine, plus today's ledger

The rule stands: **when there's a choice, say so before starting, with an honest cost on each.** Today's audit against it:

- **True replacements (clean):** Frost community home (old module deleted wholesale, API surface preserved), header script v3, insurance chrome (cr-ih stubbed with exports intact, phoenix headers retired, views repositioned under the one header).
- **Deletions at source (clean):** 12 legacy `body.claim-* header.site` theme rules, 6 title tints, phantom-plus rules, old button sizing rules. Deleted, not out-specificity'd.
- **Sanctioned patches:** beating inline `z-index:155` with `!important` (the one case where it's correct), one-or-two-property geometry fixes.
- **The community client page** hides the base profile to show its own — normally a replace-trigger, but it sits in the written exception: the base profile is the shared surface of all three CRMs, and forking it means maintaining two copies of the most complex screen. So it **borrows the engine** (see "Adoption pattern" below). The cost: mirror-coupling breaks when base internals change (`jatile` rename class of failure), and the job-menu retry masks that failure as "loading". Known trade.

### NEXT SESSION STARTS WITH RETAIL-B (decided July 26, end of day)

The override layer crossed ~10 rules and the entire late-session bug trickle (invisible subnotes, invisible headings, white panels, white overscroll, light popup) was the layer meeting unpainted corners one screenshot at a time. The look is settled: black + gold, dark iron. Next build session: commit the dark theme at the base, delete the override layer, add the **light-on-paper print override**, full previewed pass. This kills the seam bug class permanently.

### The retail tripwire (decided, written down)

Retail's dark-iron theme is currently an **override layer** (~8 rules in the hd2 style block restyling the light base). Decision: **stay on A (layering)** while the design iterates. **Commit at source (B)** when ANY of: the layer needs its first `!important` · it exceeds ~15 rules · Theo declares the retail look final. B costs 2–3 builds against the app's biggest blast radius and **must include a light-on-paper print override** — print styles assume light, and dark-iron invoices to customers are not acceptable.

---

## One header, everywhere

`cr-hd2` owns all chrome. Bar: ☰ (38px) · centered gradient title naming the screen (**Retail / Claims / Community / Production / Sales Floor**, per-CRM `--tgrad`, clamp(21px,6vw,26px), absolutely centered with `pointer-events:none`) · search (34px) · ＋ (34px). Ribbon below: **gold home button** (38px, SVG house, gold outline, aligned to the burger) at far left; clock on CRM homes; lavender `PO:` + client name when a client is open (`body.projopen` toggles `#qClock`/`#cbCtx`).

Skins live as custom properties on `.site` per `body[data-crm]`, set by `skin()` from `crmNow()`. **Retail chrome is black + gold**: `--hbg:#1a1215`, gold gradient `border-image` divider under the bar, gold ribbon edge. Community is Frost (`#0e1a29`, ice-blue), insurance Aurora teal.

The bottom bar (`#pwaNav`) hosts the portal switcher chip, the **health-badge shield** (`cr-ahc-badge`, relocated), back/forward. The chip no longer defers to Cardinal Truth (guard removed) — it lives in the bottom bar on every screen.

**Retired:** `cr-ih` (the phoenix insurance header — script stubbed, `CardinalInsHeader` export preserved as no-op), `cr-home-btn` (hidden; ribbon home owns the job), all `body.claim-*` header themes. Insurance views (`cardinalTruthView`, `insClientsView`, `resourceLibraryView`) sit at `top:var(--headh) !important; z-index:60 !important` — they no longer need stacking supremacy, so menus (95), sheets (150), and the nav (9990) all clear them. Their in-view headers are hidden; navigation runs through the global chrome, in-page tiles, and the bottom-bar history arrows. Cardinal Truth's old header quick-actions (New Claim / Adjuster note / Supplement) went with its bar — those actions live on client profiles; restore as a global + menu section if missed.

**Retail surface:** page ground `#202329` (dark iron), `--red`/`--red-dk` remapped to gold under `body[data-crm="retail"]` — **157 literal reds in stylesheets were converted to `var(--red)`** (the 5 variable definitions protected), so every line, cap, border and chip follows one mechanism. **JS-painted reds (chart colors) remain red by design** — convert individually on request. Card borders gold; hero quote, `.acthead`, and `#projectView .projsec` headings render gradient-gold; `section.history` stays a white card.

---

## Community CRM at build 308

**Home** (`cr-ch2`, Frost): three tabs — Bids (due ladder with live countdowns, Then-blocks, tools), Partners (grouped by the app's real vocabulary `nonprofit / property_manager / general_contractor` via a two-column-only read of `community_partners`, collapsible cards), Clients (grouped by stage). Strip is admin-total / sales-own ("Your pipeline — your bids only") / hidden for production; partner money and row amounts hidden for production. Masthead removed — title and clock live in the chrome. `footer.site` hidden while the view is open (it sat in document flow above the body-appended view — that was the cream strip).

**Client page** (`cr-cc`, Frost): a **real takeover** — `#projectView.cr-cc-own>*:not(#cr-cc){display:none !important}`, dark ground, `body.cr-cc-open` hides the footer. Thread/Bid tabs, then:
- **Job Menu**: mirrors the base `.jatile` grid in `#jaGrid` (labels with icons, `.jn` counts, zero-dim) — taps call `tile.click()`, which bubbles to the base's **delegated** listener on `#jaGrid`. Retries up to 12×450ms while the base builds.
- **Location** and **Reviews**: the base's live map accordion (`#dbMap`'s `.acxsec`) and `.rvsec` card are **adopted** — moved, not copied.

### The adoption pattern (use this whenever borrowing live base elements)

`mount.innerHTML =` destroys adopted children. So: record original parent + nextSibling on adopt; **release home before every wipe and on every exit path** — including the observer-driven `check()` exit, which is easy to miss (it was missed; the gate caught it). Dispatch a window `resize` after adopting a Leaflet map. The gate must prove the full lifecycle: adopt → survive re-render as a single instance → return home intact on unmount.

`bid_due_at` is captured in the New Bid form and proven to flow into the due-ladder countdowns. The New Bid modal sits at z-10500 (above the nav), scrolls contained, and its grid cells carry `min-width:0` so the date input can't shove into Assign To.

---

## Permissions (as run, v3 migration)

- `estimates` and `punch_items`: SELECT policies recreated — `is_full_access() OR exists(projects pr where pr.id = X.project_id)` (transitive through the proven projects RLS).
- `estimate_line_items` is **exempt on purpose**: it is the shared pricing catalog (no estimate linkage exists); everyone authenticated reads the price book, admins write. Scoping it would break the estimate editor for sales.
- `punch_open_counts` is `security_invoker = true`.
- Anonymous probe against the live API returns **zero rows** on estimates, line items, punch, projects, partners.
- Partner contacts remain admin-held in the database. The home's meta fetch reads only `name,partner_type` so confidential contact fields never enter sales browser memory.

---

## Bug classes that recur — today's additions

- **Splice helpers don't expand backreferences.** `\1` written literally into CSS killed five skin rules while a fragment-level gate "passed" on the wreckage. Whole-string assertions only.
- **A harness seeded from your own assumption validates fiction.** Twice: preview tab-hide bug re-typed into the shipped module (programmatic clicks pass on hidden buttons), and `jabox` tiles that never existed. Replicate the real builder; prove visibility structurally.
- **Overwriting `window.Cardinal*` silently kills the loser's callers.** Two modules each assigned `CardinalEstimates`; nine AI-estimate call sites hit undefined. Merge with `Object.assign(window.X || {}, {...})`. Gate check added.
- **Legacy per-claim themes fire only with a client open** — correct home + wrong client page is the signature. Grep `body.claim-` before trusting any chrome fix.
- **Inline z-index supremacy strands overlays.** Views pinned at inline z-155 put menus (95) and sheets (150) behind the page. If a view sits below the header spatially, it doesn't need stacking supremacy — lower it.
- **Dead layout serving hidden elements.** `.projinfo h2` reserved 170px of padding for buttons another rule hides with `!important` — invisible until the layout around it changed, then every name wrapped. When an element is retired, retire the space that was reserved for it.
- **A green gate proves nothing until it has been seen to fail.** Build 330 staged a file with none of the fix in it; the gate passed on an unrelated query. Negative-control every gate against the prior build.
- **Dynamic elements aren't in the markup.** `communityHubView` is created by `CardinalCommunityHub.show()`, so a harness that sets `getElementById('communityHubView').style` is writing to null and testing nothing. Navigate the way the app navigates.
- **Timid visual increments read as ignored requests.** Three title bumps of 4–6px each; the user asked five times. For approved sizes: preview options in a real mock, ship the pick as a fixed value.
- **`getElementById` on duplicated ids**: safe when the reads are `doc.`/`contentDocument.` scoped to the isolated contract iframes (restoreVeil, estTotal) — fragile everywhere else. The shared-template id pattern (`estTotal` ×6 etc.) works one-live-at-a-time; don't add main-document reads against those names.
- Earlier classes still apply: never guess a function/selector name; verify with a good pattern; hide the base in CSS not JS; don't mount inside `#tab-overview`; re-entrancy guards need content signatures.

---

## Open items

**Blocking:**
- OpenAI quota exceeded (429) — Coach fallback down until credit added
- Resend sender domain unverified — daily digest 403s; verify `cardinalrenovations.net` DNS then swap the from-address in `digest.js`

**Verify on device (build 308):**
- Menu → 🩺 Self Check on Retail, Claims, Community home, community client — the machine battery cannot see pixels
- AI-estimate buttons (open / openAI / openOne) actually open again after the merge fix
- Estimate editor end to end on device: hydrated client + address (316), no sway (316), scrolls clear (318)
- Client head card one-line name + aligned cover (320)

**Admin-only (Theo — these are the real blockers now):**
- **ABC Supply 401**: app registered ("Cardinal Resource App"), credentials in Vercel, `api/abc.js` deployed and reachable, but ABC's auth server rejects the client-credentials pair on **both** sandbox and production. Next: clean re-paste of both values via the portal's clipboard icons (check they aren't swapped), redeploy; if it persists, email **apisupport@abcsupply.com** — freshly created apps may need enablement. Also grab Ship-To / Bill-To numbers from an invoice, myABCsupply, or the branch.
- OpenAI credit (Coach fallback 429s) · Resend domain DNS (digest 403s) · Gemini key rotation + billing · repo junk deletion (`api/api/`, `api/index.html`, `api/vercel.json`) · contract PDF masters → `docs/`
- **$10,000,000 test value**: it is *database data*, not code (zero occurrences in the file) — edit or delete that client's bid amount in the app.

**Housekeeping:**
- ~~$0 scheduling rollup~~ — fixed at 330
- ~~Claim-type stamping~~ — fixed at 331 (**existing** typeless clients are NOT backfilled; a backfill would have to guess and could mislabel — separate decision)
- Rotate the Gemini key; attach billing (free tier 503s)
- Delete repo junk: `api/api/`, `api/index.html`, `api/vercel.json`
- Contract PDF masters upload to `docs/`
- Confirm Supabase point-in-time recovery is on
- Confirm "Est. 2023" on the landing
- Community activity feed is **team-wide**; a community-only filter is an optional enhancement
- Old landing markup: never paints (309) but still in the file for its boot writers — delete both together on a slow day
- Retail print styles: **required inside retail-B** — dark invoices to customers are not acceptable
- Header title is a **fixed 34px by user approval** (preview A, build 322) — do not convert back to viewport math

---

## ABC Supply integration (build 327) — where it stands

`api/abc.js` is a serverless proxy using **Client Credentials for Individuals and Businesses**. Env: `ABC_CLIENT_ID`, `ABC_CLIENT_SECRET`, `ABC_ENV` (`sandbox`|`production`), optional `ABC_API_BASE` if the portal's host differs from the assumed `sandbox.api.partners.abcsupply.com` / `api.partners.abcsupply.com` (**the one value never verified from outside**). Tokens live 30 min, cached 25. In-app: burger → 🧱 ABC Supply.

Business-model facts that shape the code: **Ship-To** = pricing and ordering account; **Bill-To** = frequents/recents/invoices; branches set their own prices and offerings, so availability should be checked before pricing; a **$0 price is a valid response** meaning the branch prices manually. Orders must be validated in their sandbox with ABC's API support before production.

Phase 2 when credentials work: tune response-shape mappings against real sandbox data, put "+ ABC Supply" inside the estimate editor line items, then ordering + webhooks to the production board. A "Find my accounts" button via Search Accounts would remove the manual Ship-To/Bill-To entry.

## Working with Theo

Unchanged and reaffirmed: never state an inferred fact as fact; terse honest reporting; reproduce before theorising (screenshots root-caused four bugs today that theory got wrong); one thing at a time, verified; offer patch-vs-replace with real costs; preview before shipping visual changes; mobile-first; bump the label; remind about the service worker. New: **when a gate fails, fix the gate or the app — never stage on red, never hand over with a failing check.** The staged-on-green pattern (`if [ $? -eq 0 ]`) is now standard.

---

## Companion documents

| File | What it is |
|---|---|
| `FEATURES.md` | Every feature and where it lives — read before building |
| `cardinal_build_log.md` | One line per build (298–308 appended) |
| `cardinal_session_summary.md` | Narrative of the July 26 session |

*Written at build 308, refreshed at 332. Update the build number and open items when things change.*
