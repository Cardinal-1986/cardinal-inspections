# Cardinal Resource App — Build Log

One line per build. Newest last. *Session of July 27, 2026 — builds 335–373.*

## retail-B (335–341)
- **335** · retail-B 1 · dark iron committed at the base; 21-rule override layer deleted; light-on-paper print override
- **336** · retail-B 2 · Assigned Leads & Jobs → All Leads & Jobs; 10 sorts, 7 filter categories, preview pane
- **337** · retail-B 2b · leads cards matched to the committed design; dead ranking helpers deleted at source
- **338** · retail-B 2c · shared delete path (`CardinalClientDelete.run`); community clients can be deleted
- **339** · retail-B 3 · Estimates status lanes, working filters, no caps, no auto-archive
- **340** · retail-B 4 · gold home button dispatches to the active CRM's home
- **341** · retail-B 5 · unified brass Client Directory — all three CRMs, per-CRM milestone filters, bulk delete

## Keeper profile + chrome (342–350)
- **342** · Keeper 1/3 · iron hero, neon stage spine, gradient PO + name, contacts on the name row
- **343** · What's New logged for 335–342
- **344** · universal banner nav — all CRMs, per-CRM skin, Production/Tools dropdowns, square search
- **345** · global Photo Activity page; Photos joins the banner
- **346** · banner moved inside the fixed header so it scrolls with it
- **347** · home calendar watermarks as red→gold gradient masks
- **348** · Keeper 2/3 · Location above the Job Menu as a live Map/Satellite card; Contacts retired into the hero
- **349** · Keeper 3/3 · Payments + History opening pills, Cardinal-red timeline, punch card re-dressed
- **350** · home Recent leads + Today band

## Community rebuild + fixes (351–360)
- **351** · home colour pass (superseded by 352)
- **352** · home goes iron at source — every card, calendar cell and title in the committed dark language
- **353** · CRM switcher on the banner (desktop)
- **354** · Client Projects header matched to the theme
- **355** · the ＋ follows the CRM — community's add-button takeover releases on exit
- **356** · community bids are editable — pencil opens the bid form pre-filled
- **357** · Client Projects as a desktop gallery (rule targeted the wrong element; fixed at 365)
- **358** · new insurance lead accepts a Scope of Loss; saving opens the claim and the reader autofills
- **359** · community home rebuilt (Slate & Clay) — desktop-wide, collapsible panels, partner colours, rep avatars
- **360** · community tabs restored — the pane-hiding rule was also matching the tab buttons

## Punch, history, cards (361–373)
- **361** · Punch & Repairs — per-CRM home strips + unified cross-CRM page with directory-style sort/filter
- **362** · pipeline circle labels made readable (white counts)
- **363** · Download on every document — editor and contract viewer, shared `CardinalDownload`
- **364** · community cards depth + slate-gradient edges; **global scroll-lock release on navigation**
- **365** · Client Projects scrolls sideways for real — rule retargeted to the card rows
- **366** · punch item detail sheet — customer, phone, address, rep, dates, notes, open/closed switch
- **367** · **browser Back fixed** — legacy hash router was hijacking modern nav states
- **368** · punch — Scheduled tab, assignee + priority dropdowns, 5-photo close requirement
- **369** · CRM switcher responds on the first click; banner handlers hardened; first-click audit added
- **370** · client cards go photo-free — Badge layout, lavender PO, aligned chips, call/text
- **371** · Work Schedule counters recoloured; labels white
- **372** · header title 40px in the ＋ accent; duplicate header search retired
- **373** · Team Directory rebuilt — standalone light Crew Board, grouped by role, tap-to-call, Add teammate

## Retail light theme — red/black (374–388)
*Session of July 27–28, 2026. A second theme for Retail only, on top of the committed dark base.*

- **374** · theme foundation + toggle · `.cre-*` (Estimates) tokenized; moon button repurposed from the dead build-186 dark-mode overlay to a retail-scoped `data-theme="rb-light"` switch
- **375–377** · All Leads & Jobs tokenized; AI Estimates mount background made theme-aware; `--cr-black` split into heading-text vs fixed-black chrome bars
- **378** · **the mount fix** — `styleMounts()` was force-setting `background:'#fff'` inline on a timer, beating every CSS rule. Deleted one line
- **379** · 💰 Estimates menu item repointed to the real redesigned page; duplicate "AI Estimates" entry retired
- **380–381** · pipeline circles + Work Schedule counters; **381 fixed 380's bug** — `.pcount` sits on the card, not inside the circle, so it must theme
- **382** · Accounts Receivable chart (`.arhead`/`.arcol`/`.arx`). Note: `.arrow2*` is dead CSS, never rendered
- **383** · Recent Leads rows, Today band, Client Projects header
- **384** · Punch & Repairs home strip
- **385** · Client Projects Badge cards
- **386** · **the global ground** — `--bg` (retail-B iron) was never theme-aware; every page looked fine only because cards covered it. Photo Activity exposed it
- **387** · Team + Production calendars, light mode (**Option C, red-tinted paper**). Scoped overrides, not tokens — see BUG_CLASSES
- **388** · Activity Count strip + activity feed. Boxes were hardcoded white, so this fixes dark mode too

**Pending SQL:** `punch_columns.sql` (scheduled_at, photos).
Retail light theme, continued + Sales Floor (389–394)
Session of July 28, 2026.
389 · client profile (Keeper) tokenized for rb-light — hero card, `.jabox` Job Menu tiles, jobvalrow, Location Map/Satellite tabs, Payments/Punch/History pills, Cardinal-red timeline. Stage spine, favourite star and `kpred` border left fixed (semantic)
390 · standalone Punch page (`#punchView`) — page ground moved to `var(--bg)`, header, search, sort chip, filter rail, Active/Scheduled tabs, both filter sheets and the whole item detail sheet. Priority colours, urgent spine and CRM tags left fixed
391 · Client Directory in daylight — Option C, "matte white." Second sanctioned override case after the calendars: brass is a real design ("matte black, thin lines, no gradients, no glow"), not an unswept gap. Client names became ink — the CRM colours are tuned for `#141517` and read 2.17–2.42:1 on white. CRM colour moved to the spine and tag as darkened twins (`--ccl`)
392 · stage chips readable on light. Two instances: the directory chip (introduced by 391, 1.96–4.37:1) and the home Recent Leads chip, broken since 383 — those are the neon spine colours used as text, 1.17–2.36:1. One shared `STAGE_INK` map, read only in light. Bars and spines keep the bright originals
393 · Production board in daylight. The board is CRM-independent but the toggle is retail-scoped, so a retail light user was dropped into a dark full-screen overlay — the Photo Activity gap from 386. Third sanctioned override case. Portal dots keep their CRM colours (8px dots, not text)
394 · Sales Floor re-dressed — "The card." Replaces the warm charcoal. Red is always the objection, navy is always your answer; colour carries meaning rather than decorating. True navy can't carry type on a dark ground (1.37:1), so it is used as a surface: your answer sits on a navy panel, hero and active tab are navy fills. Red as text is `#e8505c` (5.30:1) — Cardinal `#C8202E` computed 3.28:1 as type and had always failed there
Tooling changed this session:
`check_build.py` label gate compared dates, so two builds on one day read as un-bumped. Now compares build numbers. Negative-controlled: still fails a genuinely un-bumped label
Colour gates now parse the values out of the artifact instead of checking a list typed by hand. That change alone surfaced two real failures (Production board `done` text at 3.23:1, camera icon at 2.81:1) that a hand-written list had passed
CI: the `module.exports` check used `grep -l`, which matches comments. `api/invite.js` line 2 said "do NOT convert to module.exports" — the warning tripped the gate it was warning about. Comment reworded

---

# Build system, defects, and the recorded changelog — 29 July 2026

*Updated 29 July 2026 — session of 34 merged PRs, `origin/main @ 202e6f3`, app stamped build 427.*

## 1. How the build system works

The app carries its own version stamp and its own user-facing changelog. There
is no `package.json` version, no git tag, and no `APP_VERSION` constant — the
build number lives in **markup**.

### The version stamp

One `<div>` at the bottom of the burger/nav menu, at char offset ~205,000:

```html
<div style="padding:7px 14px;font:600 10.5px 'Segoe UI',Arial,sans-serif;
            color:#b6a89f;border-top:1px solid #f0e8e2;">
  v2026-07-29 build 427 &#8212; insurance home: carriers, calendar, contract value
</div>
```

Format: `v<YYYY-MM-DD> build <N> — <one-line summary>`

### The changelog

`<script id="cr-cl-script">` holds a `What's New` modal:

```js
var KEY = 'cardinal.changelog.lastSeen';        // localStorage
var CHANGELOG = [ { build:342, note:'…' }, … ]; // newest first
```

- `currentBuild()` — reads the build number off the page
- `getLastSeen()` / `setLastSeen()` — localStorage watermark
- `show()` — lists entries newer than the watermark
- `autoShow()` — 3 s after load, shows if `cur > lastSeen`
- Exposed as `window.CardinalChangelog = { show, setLastSeen, … }`

### Where else build numbers appear

**82 textual `build N` references** across the file, spanning **46 distinct
builds** from 55 to 427 — mostly code comments annotating when a block was
introduced (`/* iTel reports (build 406) — sits below Insurance Documents */`).
That convention is genuinely useful for archaeology. It also causes defect
§2.1 below.

---

## 2. Three defects in the build machinery

Found while compiling this log. All three are live on `202e6f3`. None had been
reported, because each one fails **silently**.

### 2.1 `currentBuild()` reports **406**, not 427

```js
function currentBuild(){
  var footer = document.querySelector('.menu-footer, [data-cr-footer]');
  var scan = footer ? footer.textContent
                    : document.body.textContent.slice(0, 40000);
  var m = String(scan || '').match(/build\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}
```

**Neither `.menu-footer` nor `[data-cr-footer]` exists in the markup.** Both
selectors appear in the file exactly twice each — and all four occurrences are
*inside JavaScript source*, never as an attribute on an element. The version
stamp `<div>` has no class and no data attribute.

So `querySelector` returns `null` and the function falls back to scanning the
first 40,000 characters of `document.body.textContent`.

That fallback cannot work here, for two compounding reasons:

1. **`textContent` includes `<style>` and `<script>` text.** `Element.textContent`
   concatenates every descendant text node, and the text inside style and script
   elements counts. Body `textContent` is therefore **1,884,996 characters**, and
   most of it is CSS and JS source.
2. **The only `build N` inside the 40,000-char window is a CSS comment.** At
   char 29,523:

   ```
   .insdocrow button{order:3;…} } /* iTel reports (build 406) — sits below …
   ```

The real stamp sits at textContent char **175,706** — far outside the window.

| | |
|---|---|
| `currentBuild()` returns | **406** |
| Actual build | **427** |
| Source of the 406 | a CSS comment about iTel reports |

**Knock-on effect:** `autoShow()` does
`if(lastSeen === 0){ setLastSeen(cur); return; }` then `if(cur > lastSeen) show()`.
Once the watermark is set to 406, `406 > 406` is false — so **the What's New
modal will never auto-open again**, for anyone. And because `CHANGELOG`'s newest
entry is 342, any manual `show()` finds nothing newer than the watermark and
falls through to `CHANGELOG.slice(0, 5)` — permanently showing builds 338–342.

### 2.2 No error report carries a build number

Same root cause, different function:

```js
function buildTag(){
  try{
    var f = document.querySelector('[data-cr-footer], .menu-footer');
    if(!f) return '';                    // <- always taken
    var mt = f.textContent.match(/build\s+\d+/i);
    return mt ? mt[0] : '';
  }catch(e){ return ''; }
}
```

Consumed by the error reporter:

```js
var b = buildTag();
lines.push('ua: ' + shortUA() + '  session: ' + SESSION_ID + (b ? '  ' + b : ''));
```

`b` is always `''`, so the build tag is **never appended**.

This matters more than it looks, and it matters *because of* this session:
commit `150d4df` fixed an error-capture pipeline that had been silently
discarding every payload. Reports now flow — but they arrive with **no build
number**, so a crash report cannot be tied to a version.

**Both 2.1 and 2.2 are fixed by one attribute** on the stamp `<div>`:

```html
<div data-cr-footer style="padding:7px 14px;…">v2026-07-29 build 427 — …</div>
```

Both functions already query for it. Nothing else needs to change. This is the
highest value-per-byte change available in the codebase right now.

### 2.3 `CHANGELOG` is stale by ~85 builds

| | |
|---|---|
| Newest entry in `CHANGELOG` | **342** |
| Highest build referenced in code | **427** |
| Current stamped build | **427** |
| Gap | **~85 builds, unreported to users** |

Worse than absent — some of it is now **wrong**. Nine entries describe the gold
palette, which **PR #8 retired today** in favour of red/black/grey:

| Build | Stale copy |
|---|---|
| 341 | "One Clients directory … **brass look** …" |
| 340 | "**Gold home button** now returns to whichever CRM you are in" |
| 337 | "… address line, **gold** call/text buttons" |
| 316 | (gold reference) |
| 312 | (gold reference) |
| 309 | (gold reference) |
| 304 | "Retail went dark iron — every red line and border is **gold** …" |
| 301 | "One header everywhere: … a **gold home button** in the banner …" |
| 195 | "… **gold ring** shows i…" |

Because of §2.1 the modal is pinned to showing builds **338–342** — which
includes "Gold home button" (340) and "brass look" (341). **The one thing the
modal reliably shows is copy describing a UI that no longer exists.**

---

## 3. This session is unstamped

Build 427 arrived in commit `82adf89` ("Add files via upload") at **04:53**.
Everything merged after that — **28 pull requests**, 04:55 → 21:32 — carries no
build number and no changelog entry.

`main` moved `69dfb9f` → `202e6f3`; 34 PRs merged in total, 6 of them before the
stamp was last set. See `HANDOFF.md` for the full list.

### Suggested changelog entries

Written in the app's existing voice — user-facing, plain, benefit-first, no
internal jargon. Grouped by theme rather than one-per-PR, which is how the
existing 124 entries are organised. Renumber freely; **428 is a starting point,
not a claim.**

```js
{ build:435, note:'🔄 Previewing an estimate no longer freezes scrolling if you back out while it loads' },
{ build:434, note:'🔒 Job photos now load through private signed links — the photo library is no longer publicly readable' },
{ build:433, note:'🌿 Community goes green — one accent colour across the community hub and client pages, in dark and light' },
{ build:432, note:'⏳ New "Awaiting Funding" stage for bids parked on a grant cycle — they no longer age as if overdue, and they no longer count against your win rate' },
{ build:431, note:'🔍 Sort and filter the community bid table — 7 sorts, 6 filter groups, and a direction toggle; find every bid with no homeowner recorded in one tap' },
{ build:430, note:'💵 Every community bid now shows who is being billed and whose house it is — on the job card, the emailed bid, and the inspection report' },
{ build:429, note:'📧 Community bids now email the funding partner instead of the homeowner' },
{ build:428, note:'🛠️ Community outcome buttons do what they say — Log the outcome no longer opens the estimate page' },
```

Deliberately omitted, because the changelog is user-facing and these are not
user-visible: the dependency declaration (PR #26), the telemetry pipeline fix
(`150d4df`), the API route gating, dead-code removal (PR #14), and the shadow
tokenisation (PR #31). PR #26 arguably *is* user-visible — two serverless
functions had never once run — so if you want it in, phrase it by feature name
rather than by cause.

### Suggested stamp

```
v2026-07-29 build 435 — community: green identity, two-party bids, Awaiting Funding
```

---

## 4. Recorded build history

The 124 entries in `CHANGELOG`, newest first — builds **342 → 166**. This is the
app's own record, transcribed verbatim (emoji stripped, unicode escapes
decoded). Data-quality caveats in §5.

| Build | Change |
|---:|---|
| 342 | Client profile hero re-dressed — iron card with a neon stage spine, gradient name, tap-to-call phone + email right on the name row |
| 341 | One Clients directory for all three CRMs — brass look, per-CRM milestone filters, CRM switcher bar at the bottom, admin multi-select delete |
| 340 | Gold home button now returns to whichever CRM you are in — Retail, Claims, or Frost |
| 339 | Estimates rebuilt as status lanes — Unsent → Sent → Accepted, working Status/Rep/Trade filters, ⚑ flags anything waiting 5+ days |
| 338 | One admin delete path everywhere — delete from the leads pane, and community clients can finally be deleted |
| 337 | All Leads & Jobs cards matched to the committed design — milestone rail with day counts, address line, gold call/text buttons |
| 336 | Assigned Leads & Jobs is now All Leads & Jobs — 10 sorts, 7 drill-in filter categories, map/satellite/communications preview pane |
| 335 | Retail goes dark for real — the iron base is committed at the source and paper printouts stay light |
| 322 | Screen titles locked at their approved size on every device |
| 320 | Client head card fixed — names were wrapping because of padding reserved for buttons that no longer exist. Card is tighter and the cover photo lines up with it |
| 318 | The estimate editor scrolls all the way down now — the bottom was hiding under the nav bar |
| 316 | Price it and the manual picker open the estimate editor with the client’s name and address already filled in, and the editor no longer sways sideways. PO numbers show lavender in the client list, and the list headings read in gold |
| 315 | No more flash of the old screen at login, and community clients open straight into Frost — the page takes over before it loads instead of after |
| 314 | The New Manual Estimate button works — pick a client from the searchable list and the editor opens on their job |
| 312 | Bigger screen titles up top, and the AccuLynx import pop-up matches the dark retail look — white cards, gold trim |
| 311 | No more white flash when you over-scroll Community or Claims — the page behind is dark now |
| 309 | Logging in lands straight on the hub — no flash of the old screen. Cardinal Truth and Community wear their true colors on the landing and the switcher, and the Landing card is gold |
| 308 | AI estimate buttons work again — two modules had been overwriting each other and nine buttons were silently dead |
| 307 | Community client pages: the Job Menu mirrors the real tiles — Photos, Tasks, Estimates and the rest all open from the community page, and the map and Google Reviews are pulled in live |
| 306 | Community client pages are fully Frost — dark ice-blue end to end, no more base page bleeding through |
| 304 | Retail went dark iron — every red line and border is gold, the daily quote reads in gradient gold, and the client list stays a white card |
| 301 | One header everywhere: the screen’s own name up top, a gold home button in the banner, the switcher and shield in the bottom bar. The old insurance headers are retired |
| 299 | New Community home in Frost — Bids with live due-day countdowns, Partners grouped by type, Clients by stage. Totals are admin-only |
| 299 | Sales now see only their own bids and estimates — enforced at the database, not just hidden |
| 289 | App header rebuilt — one row, Menu left, title centre, + right. Long client names truncate instead of pushing buttons off screen, and each CRM colours it properly |
| 288 | Logo removed from the top-left. Four different modules were moving it around and it took space the title needed on a phone |
| 286 | Community client page shows properly — it was rendering into a tab that hides when another is open |
| 285 | Fixed the blank client profile on community jobs |
| 283 | Community clients open on the new page rather than the old one with a panel added |
| 282 | Community buttons work on the first tap — the screens were redrawing every time anything on the page changed |
| 279 | Community client page: Thread shows the job in order with the live step first, Bid shows the priced bid |
| 278 | Community rebuilt — Bids tab leads with what’s due, Partners tab shows each relationship and what they owe |
| 277 | New Bid asks for the homeowner only, with a “no homeowner” box for churches and vacant units. Site contacts are admin-held |
| 276 | Self Check (Menu → 🩺) opens every screen and reports any button a tap can’t reach |
| 275 | New Self Check (Menu → 🩺) — opens every screen and tells you if any button can’t actually be tapped |
| 271 | Community bids now get a proper PO number and a start date, so they show an age on the Chase list and Production board |
| 270 | PO numbers fixed — the profile was showing a different number to the one in the client list and search. Clients created by import or from a scope now get one |
| 269 | The + and Menu buttons work on the claims home. Both were opening behind something |
| 268 | The claims home shows its new layout — it had been silently failing to render and falling back to the old one |
| 266 | Insurance Clients rebuilt — rows show what’s owed and how long it’s waited, sortable, and search covers carrier, claim number and adjuster |
| 265 | Claims header rebuilt: “Cardinal Claims” centred, the full app menu, and the CRM switcher |
| 263 | Cardinal Truth fills the screen on desktop, and a new Chase list shows every claim waiting on a carrier — longest wait first, red past 30 days |
| 262 | Insurance moved to a deep teal theme with gradient borders |
| 258 | Punch items now show on the client profile too. Completed ones fold away, so the job keeps a record of what was fixed and when |
| 257 | Production: tap Blocked or To invoice to filter, punch items open their job, and ticking one leaves it on screen instead of vanishing |
| 255 | Fixed the stutter when scrolling Cardinal Truth |
| 254 | Insurance client filters drop Lead and Prospect, and now read Scope Approved / Awaiting RCV / Denied instead of the raw stage names |
| 253 | Cardinal Truth recoloured — same blue-grey, a good deal lighter than before. The Awaiting Depreciation figure is green now, since that money is earned |
| 252 | Import a client by photographing an AccuLynx screen — name, address, phones, notes and the insurance block get read off it. Saves and reopens the camera for the next one |
| 251 | Backing out of the Objection Coach returns you where you opened it from |
| 250 | New Production board — every job in flight across all three CRMs with the one thing blocking it, plus a shared punch list for punch items, tickets and callbacks |
| 249 | New Sales Floor — objection of the day, 13 objections as what-they-say / what-you-say, talk tracks for the door and the table, and proof points |
| 248 | Pictures work in Resource Library articles now — they fit the column, take a caption, and open full size when tapped |
| 247 | Scope of Loss accepts files up to 20 MB — large ones upload to storage instead of going through the API |
| 245 | File and track supplements from the client profile, showing what each one added to the carrier’s scope |
| 244 | Insurance data consolidated into one place, so the profile and the dashboard stop disagreeing |
| 243 | Start a claim straight from an adjuster’s scope — upload it and the client is created from what it says |
| 242 | The CRM switcher sits between the arrows at the bottom on mobile |
| 241 | Cardinal Truth rebuilt — what carriers owe you leads, each stage shows the money sitting there, and the two stages waiting on a carrier are flagged |
| 241 | Supplements are tracked properly now: filed vs approved, and what your supplements add to the carrier’s first scope on average |
| 240 | The CRM switcher moved to the bottom bar between the arrows, where your thumb already is |
| 239 | Landing / Hub works again from the CRM switcher |
| 238 | The back and forward arrows work again in the installed app — two buttons were sitting on top of them |
| 235 | New landing page — the portals are laid like shingle courses, and a quote rotates daily so the whole crew sees the same one |
| 234 | The logo now always goes to the landing, whichever CRM you’re in. All three portal headers share one look, with only the colour changing |
| 234 | Filter the client list by who it’s assigned to — Everyone, Me, Unassigned, or any teammate |
| 233 | Select all in the client list, plus a permanent Delete for admins — for clearing out test clients |
| 232 | Estimate photos print whole instead of cropped, and line items and photos can be reordered with the arrows |
| 230 | Star any estimate photo as the cover — it prints large above the pricing. Items priced at zero print blank instead of $0.00 |
| 229 | Estimates carry the full company block top-right — address, phone, email, website |
| 228 | Qty / unit toggle on estimates — turn it off for lump-sum pricing and the client sees a description and one amount |
| 226 | Preview button on estimates — see the finished document and Print/PDF without saving. Publish now opens the document properly |
| 225 | Mailing and Billing address tucked behind a toggle on Create Lead, so the property address is the one you fill in |
| 224 | The + menu no longer runs off the edge of the screen on desktop |
| 223 | Work Type no longer offers Insurance and Retail — that’s Claim Type, right below it |
| 222 | Add or shoot photos while picking them for an estimate, instead of backing out first |
| 220 | Property maps and PO# badges now actually appear on client profiles — both had been silently failing since they shipped |
| 219 | Estimate status drives the pipeline: mark one Sent and the client moves to Bid Submitted, Accepted moves it to Awarded. No more double entry |
| 218 | To Inspection and → Report now sit in the bottom bar when you check photos, instead of scrolling out of reach |
| 217 | Photo editor — rotate sideways shots, and mark up damage with pen, arrows, circles and text. Originals are always kept |
| 216 | Check photos and Save them straight to your phone (Photos, AirDrop, Messages) or download on desktop |
| 215 | Contract button builds a contract from an estimate — line items become the scope, your deposit % replaces the 50/50 default |
| 214 | Fixed a stuck bottom bar in the Photo Album that was blocking scrolling and taps |
| 212 | Publish an estimate to get a branded document with share link, email to client, signature, and PDF |
| 211 | Photo Album rebuilt — section tabs (Inspection / Post-Inspection / Before / After / General), date grouping, who-took-it initials, AI captions, bulk move |
| 209 | New Estimate editor — pull items from the library, live totals, automatic deposit, auto-numbered EST-2026-#### |
| 208 | Line Item Library (Menu → Admin) — save your common scopes once and reuse them on every estimate |
| 207 | Retired the duplicate Manual Estimates screen — the original + New estimate templates do the same job better |
| 205 | Community Hub calendar cells line up properly again |
| 204 | Menu is narrower and scrolls to the last item; removed a duplicate Community entry |
| 203 | PO# on every client (PO-YYYYMMDD-HHMM); Community Hub refreshes instantly after saving a bid |
| 202 | Mobile menu now scrolls properly (iOS PWA fix) |
| 201 | Comprehensive fix for projects.name column references across all diagnostic modules |
| 200 | Fixed New Bid save error — was writing to wrong column name |
| 199 | Google Places address autocomplete on every form + satellite property maps on client profiles |
| 198 | Assign To dropdown on New Bid form (defaults to current user) |
| 197 | Estimate editor: hide-units + include-tax toggles + status select. New All Estimates view under Sell menu with pending/done tabs and running total |
| 196 | Manual estimates with 6 templates — Roof Replacement / Roof Repair / Siding / Windows / Gutters / Blank |
| 195 | All Clients landing card stays on the hub instead of navigating to Home; gold ring shows it's active |
| 194 | All Clients now visible to everyone (sales sees their own across all three CRMs, filtered by assignment) |
| 193 | Portal chip auto-syncs to RETAIL on Home; switcher gets Landing/Hub option (replaces admin-only All Clients) |
| 192 | NACHI content admin gains rich text editor, image upload, and one-click Import Baseline for the 12 hardcoded articles |
| 191 | NACHI content admin: add/edit/archive series + articles from the Resource Library, no code required |
| 190 | NACHI Asphalt Composition Shingles (Parts 1-4) + Accessing the Roof Part 5 |
| 189 | NACHI Roof Mastery under Mastering Roof Inspections: 1-3 Accessing A Roof (Parts 1, 3, 4) |
| 188 | Resource Library TOC: floating button (bottom-left) opens searchable modal with Insurance / Manufacturer / General hubs |
| 187 | Burger menu reorganized — renamed CRMs section (with Community), Resources section, new Admin section for theo/joan, ⌘K quick-jump hint |
| 186 | Quality-of-life pack: Dark mode, ⌘K command palette, CSV export, undo toasts, offline indicator, print stylesheets, bulk operations, this changelog |
| 185 | General Contractor partner type + confidential flag; James Construction and C.G. Egli Inc as concealed partners |
| 184 | Kitty Hawk workflow: renter contact fields on New Bid; work orders upload (admin + production only) |
| 183 | Homeowner / Site Contact fields on the New Bid form |
| 182 | Community Hub + button opens streamlined New Bid form (was full New Lead sheet) |
| 181 | Hidden the recent-clients strip on retail Home; hidden Cardinal Truth dashbanner that was floating |
| 180 | Cardinal logo two-tone green on Community view; Cardinal Truth top-left icon sized bigger |
| 179 | Community header darker green for legibility; site footer strip hidden on Hub view |
| 178 | Header rewrite v2: CSS grid layout, brand title fits, + button icon-only, utility strip on row 2 |
| 176 | Storage bucket test, duplicate lead detection, perf watchdog, E2E smoke walk, build-size gate |
| 175 | Auth roster match check: flags missing team members and unrecognized sign-ins |
| 174 | Runtime error capture + 10 admin data-invariant checks in the health badge |
| 173 | Smoke check extended to community/insurance modules; admin-only schema + env-var health badge |
| 171 | Real contract editor: full-page viewer with Print/Copy Link/Send/Sign |
| 169 | Estimates audit fixes: templates + stat cells + manual rows wired |
| 167 | Plugin mounts get a Home button (Estimates, Claims, Pricing, Coach) |
| 166 | Retail Home header cleanup: Landing chip, Dashboard word, duplicate search removed |

---

## 5. Data quality in the recorded history

**124 entries, 121 distinct build numbers, spanning 166–342.**

### Three duplicated build numbers

Each of these has two entries describing unrelated work, so the number was
reused rather than incremented:

| Build | Entry A | Entry B |
|---|---|---|
| **234** | "The logo now always goes to the landing…" | "Filter the client list by who it's assigned to…" |
| **241** | "Cardinal Truth rebuilt — what carriers owe you…" | "Supplements are tracked properly now…" |
| **299** | "New Community home in Frost — Bids with live due-day countdowns…" | "Sales now see only their own bids and estimates — enforced at the database…" |

`show()` filters on `e.build > lastSeen`, so duplicates both render — the
display is unharmed. The cost is that a build number is no longer a unique
handle for a change, which undercuts the `(build N)` comment convention used
82 times in the source.

### 30 gaps in the sequence

166 → 342 covers 177 possible numbers; 121 are present. Gaps start immediately
(167→169, 169→171, 171→173, 176→178, 205→207, 209→211 …). Some are builds that
shipped without a user-visible change — legitimate. Others are simply missing.

Given the gaps and the duplicates, treat build numbers as **ordering, not
inventory**. Do not infer "build 300 exists" from 299 and 301.

### Below 166

`CHANGELOG` starts at 166, but the source references builds **55, 95, 146 and
148**. Those predate the changelog's introduction — build **186** is the entry
that says *"…print stylesheets, bulk operations, this changelog"*, i.e. the
changelog was added at 186 and back-filled to 166. Builds 1–165 are not
recorded anywhere in the app.

---

## 6. Recommendations

Ordered by value per unit of risk.

1. **Add `data-cr-footer` to the version-stamp `<div>`.** One attribute. Fixes
   §2.1 and §2.2 together: the changelog starts reading the real build, and
   every error report starts carrying it. Zero behavioural risk — both
   consumers already query for it and both currently fail closed.
2. **Bring `CHANGELOG` current, and drop or reword the 9 gold entries.** Users
   are being shown copy that describes a retired palette. Use §3's draft.
3. **Stamp this session.** 28 PRs are unattributed to any build.
4. **Stop the fallback scan from reading source code.** Even with the attribute
   in place, the `document.body.textContent.slice(0, 40000)` fallback remains a
   trap for whoever removes that attribute later. Either drop the fallback and
   return `null`, or anchor it to the `v<date> build <N>` shape:
   ```js
   var m = String(scan || '').match(/v\d{4}-\d{2}-\d{2}\s+build\s+(\d+)/i);
   ```
   That pattern cannot match a `(build 406)` code comment.
5. **Decide where the build number should actually live.** A number embedded in
   markup, read back by scraping rendered text, is why all three defects exist.
   A single `var APP_BUILD = 427;` — rendered into the stamp *and* returned by
   `currentBuild()` — removes the entire class. There is currently no
   `APP_VERSION` or `BUILD_NO` constant anywhere in the file (verified: 0
   occurrences). This is a small refactor with an outsized payoff, and it is the
   one I would push for.
6. **Do not renumber history to close the gaps.** 82 source comments cite build
   numbers; renumbering would invalidate all of them. Leave the record as-is
   and start incrementing cleanly from here.

---

## 7. Correction — the version-string count, and a gate that can be fooled

*Added 29 July 2026, after main had already merged §1–6. Two peer sessions
independently measured the labels and got different answers; this is the reconciliation.*

### There are 20 version strings, not 9

§1 said "82 textual `build N` references … 46 distinct builds," and CLAUDE.md said
`grep -oE "v2026-[0-9-]+ build [0-9]+"` returns 9 hits / 4 distinct labels. Both were
measured with a regex that assumes a **single separator**. There are two:

| Form | Example | Count | Where |
|---|---|---:|---|
| space | `v2026-07-29 build 427` | 9 | the app stamp + footer templates |
| middot | `v2026-07-22 · build 148` | 11 | module banner comments |

Honest count: **20 strings, 5 distinct builds — 95, 146, 148, 404, 427.**
**Build 148 was missing from every earlier list**, because it only ever appears in the
middot form (estimates + pricing module banners, ×4).

| Build | Count | Where |
|---|---:|---|
| 427 | 1 | nav menu `<div>` — **the app version, and the only version string in rendered markup** |
| 404 | 1 | `.cr-c-footer` |
| 95 | 2 | claims footer + banner (date is 6 days in the future — unexplained, do not "fix") |
| 146 | 12 | analytics / Keeper / portals / adjuster / coach |
| 148 | 4 | estimates + pricing banners |

### The label gate passes when only a module is bumped

`scripts/check_build.py` compares `sorted(set(LABEL_RE.findall(src)))` between builds.
Its `LABEL_RE` already captures the build number — its own comment records the false RED
on 390/391 that prompted that — but comparing the **set** means *any* label changing
satisfies it. Tested against main's `index.html`:

| Scenario | Gate says | Correct |
|---|---|---|
| app stamp `427 → 428` | PASS | PASS |
| only module `146 → 147`, app stamp untouched | **PASS** | FAIL |
| nothing bumped | FAIL | FAIL |

So the gate cannot currently tell "the version users see was bumped" from "some plugin
footer changed." It also reports **6** distinct labels rather than 5, because its optional
`(?:\s+build\s+\d+)?` group half-matches the middot form and emits bare dates.

### Fixed — `gate_label` now anchors on the app stamp

Landed in the same PR as this note, once a peer session confirmed the repo copy was
untouched. (Note the two copies are different files: the repo's md5 is `114ff919`, the
bundled sibling's is `5cf8a41d`.)

- `ALL_LABEL_RE` matches **both separators**, so the count is 20 strings / 5 builds and
  build 148 is no longer invisible.
- `app_stamp()` returns `(date, build)` for the **one** string users see. It prefers a
  `data-cr-footer` anchor and falls back to the em-dash form — the app stamp is the only
  version string followed by `&#8212;` / `&mdash;` / a literal `—` plus a summary.
- The bump gate requires the app stamp's **build number to strictly increase**, so a
  plugin footer changing no longer satisfies it.

Negative-controlled, 7 scenarios:

| Scenario | Want | Got |
|---|---|---|
| app stamp `427 → 428` | PASS | PASS |
| only module `146 → 147` | FAIL | FAIL |
| nothing bumped | FAIL | FAIL |
| app stamp `427 → 426` (decrease) | FAIL | FAIL |
| `427 → 428` with `data-cr-footer` | PASS | PASS |
| literal `—` instead of the entity | PASS | PASS |
| `&mdash;` instead of `&#8212;` | PASS | PASS |

The literal-em-dash case was a real fragility found by probing rather than reasoning:
before hardening it reported `app stamp: NONE`. It failed **closed** (red, not green),
which is the right direction, but it was still a foot-gun.

Full ladder re-run on main's `index.html`: green, exit 0. With `--prev` pointed at an
identical file it reds on the bump gate, exit 1 — the negative control.

**The permanent fix is still `data-cr-footer`.** The em-dash fallback is a grep-time
heuristic; the attribute is an identity. That attribute now has **three** consumers:

1. `currentBuild()` — so the changelog reads 427 instead of a CSS comment's 406
2. `buildTag()` — so error reports carry a build number
3. the label gate — so "bumped" means the app version, not any footer

One attribute, three silent failures. It is still the highest value-per-byte change in
the codebase.

---

# Builds 428–452

Builds **428–451** were shipped without a log entry; the only record is the
`CHANGELOG` array in `<script id="cr-cl-script">`. Reconstructed summary lives in
`CLAUDE.md` ("What happened in 428–451"). Build **450 is a gap**.

- **452** · pipeline circle letters go near-black · measured on painted pixels at
  414 px, both retail themes: white ink read **1.95 / 2.50 / 2.50 / 2.84 / 4.16:1**
  against a 3.0:1 floor for a 21 px bold letter — 4 of 5 failed. `#fff` → `#141517`
  on `.pipebtn .pcirc` gives **9.33 / 7.28 / 7.29 / 6.41 / 4.37:1**, 0 of 5 fail.
  The five `STAGE_COLORS` fills are **untouched** — they are semantic and settled
  (`OPEN_ITEMS.md` §6); only the ink on top of them changed. Also gave `.pipe-lead`
  the ridge-cap gradient the other five received at 436 (Lead and OnHold were
  skipped; Lead is the first circle on the row).

  **`STAGE_INK` was the obvious candidate and is wrong here** — it fails 5 of 5
  (2.02–2.69:1) on the fills, because those values are tuned to sit on paper.
  Computed before shipping, not after.

### Two findings from the 452 audit, not fixed

- **The retail theme toggle leaks into Community.** `refreshVisibility()` strips
  `.show` when the CRM is not retail, but build 417 adopted the button into the
  header row and `#cr-hd2-srch #cr-dark-toggle{display:flex !important}` outranks
  both `.show` and the base `display:none`. So the gate is dead code on a 1-second
  timer, and pressing the button in Community repaints Community too, because
  `[data-theme="rb-light"]` also drives `--ccm-*`. Insurance is unaffected — it has
  an explicit hide rule. Mirroring that one rule for Community is the whole fix.
  **Verified by letting the app's own poller run and reading which rule won.**
- **`.pipe-onhold` still has no ridge-cap gradient** (`background:#047857`, flat).
  Same 436 omission as Lead; left alone because OnHold does not appear on the
  retail pipeline row.

### Method note — why the first two measurements were wrong

Both errors are recorded because the *pattern* costs more than the instances.

1. **Static CSS analysis produced 1,418 findings; painted pixels produced 13.** The
   static pass composited `rgba()` over a ground it had guessed, and flattened
   `@media print` — which is where a *third* `:root{--bg:#fff}` lives, so it took
   the print ground for the screen ground. It flagged the header
   "Single source of truth" at 2.46:1; the real painted value is **5.09:1**.
2. **The first pixel sampler read each circle's square bounding box.** For a round
   46 px disc the four corners are page background — (4−π)/4 ≈ **21%** of the box —
   so on the light ground it reported the page as the "ink" and the fix looked like
   it had not applied. Sampling a centred disc at 0.62r fixed it. **The app was
   right and the instrument was wrong** — check the instrument first.

### Library content — the six unconfirmed counties (30 Jul 2026, no build)

`library_items` row `adfe5c23` was seeded as an explicit placeholder: *"Miami,
Warren, Butler, Clark, Preble and Darke — not yet confirmed."* Each was checked
against its own official site. **All six run their own building department**;
none hand residential work back to the State. `library_counties_entry.sql`.

Two findings worth carrying:

- **Preble routes plan review to National Inspection Corporation**
  (`Plans@Natinspect.com`, 937-433-4642) — *the same private firm Xenia
  contracts with*, which the library already documents separately. Two
  jurisdictions, one phone number.
- **Butler County covers unincorporated areas only.** Hamilton, Fairfield,
  Middletown, West Chester and Oxford issue their own. This is the Greene
  County "six exceptions" trap a second time, and the entry says so.

**Darke is flagged unverified in its own body text and in its last source
chip** — the county site refused the request, so the number came from a
services directory. Do not let that quietly become fact.

No `index.html` change, so **no build number was bumped** — the app is
unchanged at 452 and bumping would have been a lie.

**`.vercelignore` gained `*.sql`.** CLAUDE.md's standing convention is that SQL
ships as separate `.sql` files, and there was no rule for them — the repo
happened to contain zero, so the first migration committed would have been
served at `app.cardinalroster.com`. Closed before it opened.

Verified by running the **shipped** `lbRich`/`lbSources` (extracted from
`index.html` by brace-matching, not re-implemented) against the row as stored:
12/12 checks — table promoted, `|---|` rule not leaked as a row, `&` escaped,
7 citation chips rather than the "No source recorded" fallback, and a negative
control proving `<img onerror>` inside a table cell is still escaped.

### 453 · the library search index comes from the cards, not from a list

**Measured at 452, all re-verified in the live DOM:** `data-rltags` carried 461 distinct
keywords across 135 cards and had **zero JS readers** — dead data. The only search was
the TOC modal, matching page titles and a **hand-typed array of card titles**. All 47
`.rl-cite` chips were unsearchable: `R905.1.2` returned *"No topics match"*. No card body
text was searchable. `deductible` appears 86 times in the file and was a tag on **zero**
cards.

`buildIndex()` now walks `#resourceLibraryView .rl-card` and captures per card: the
**element**, its `h3`, every `.rl-cite`, `data-rltags`, and a 300-char body excerpt.
Ranking is title → citation → tag → body, and **body-only hits are dropped whenever
anything matched higher** (`filterTier`) so `roof` does not return all 134 cards — it
returns 22. Cards are addressed by stored element reference, and the index is rebuilt on
every `open()` so runtime-built NACHI pages are picked up.

**The hand-typed `cards:[…]` lists are deleted** — 4,581 characters. Hub/icon/page
curation is kept because it is authored, not derivable. The replacement array was
generated from the old one programmatically and verified in node: 30 pages,
hub|icon|pid|title identical. Net **−1,611 characters**.

#### The bug this fixes, stated accurately

The array wrote three titles with a **curly apostrophe** where the markup uses a straight
one, and `scrollToCard`'s `norm()` mapped all four curly quote characters to a **double
quote** — so `it"s` could never equal `it's`. Controlled on Claim Tips: **10 of 10** titles
without an apostrophe matched; only the apostrophe ones failed.

**The first write-up of this said the cards were "unreachable". That was an
overstatement** — measured before and after, the card was always *listed*, and tapping it
always landed on the right *page*; what failed was the scroll and highlight, so a rep was
dumped at the top of a 12-card page. Affected: *"We'll only pay for the damaged slope"*,
*"It's just wear and tear"*, *The Inspector's Mindset* — two of them objection rebuttals.

#### A regression the harness caught, not the reading

`rlPageMfg` was listed **six times** in the array, each entry with its own curated card
subset. Deriving cards from the DOM made all six render the full page: 134 cards became
**204 buttons**. The six collapse to one entry, and the lost sub-navigation is replaced by
group headings derived from the **`.rl-groupsep` dividers already in the markup** (Code 3,
Tips 2, Mfg 5, Sup 5). Those old subsets were themselves stale — they listed 10 of the
page's 14 cards, so **four Manufacturer cards were in no TOC entry at all**.

#### Gates

`check_build.py` green with `--prev` at 452 and the marker negative-controlled. Functional
harness drives the **shipped** module through its real UI — opens the panel, types into the
real input, reads the rendered results: **25/25**. Re-applying the patch to a fresh copy
reproduces the file byte-for-byte (`84d6c510`).

**Negative control on the harness itself:** run against 452 it reports **12 failures** —
all four citation searches return 0 hits and the index count reads 132 vs 134. The gate has
been seen to fail.

One assertion in the patch script fired on its own explanatory comment (`scrollToCard(`
inside the comment documenting its removal) — the exact trap `CLAUDE.md` names. The
assertion was corrected to two distinctive code forms; the comment was left alone.

### API · the librarian's citations reach the browser at last (30 Jul 2026, no build)

`api/librarian.js` only. **`index.html` is untouched, so no build label was bumped** —
the app is unchanged at 453.

Build 446 shipped the whole citation chain: the `sources text[]` column, `lbSources()`,
the `.lb-cite` chips, and the `.lb-nocite` fallback reading *"No source recorded — verify
before quoting this to an adjuster."* The prompt asks Gemini for `sources` and says
plainly to return an empty array rather than invent one. The handler even sanitises the
result — coercing a bare string or null into a clean array of ≤8 short strings.

**Then both `res.status(200).json({...})` blocks enumerated their fields explicitly and
omitted `sources`.** The citations were fetched, cleaned, and dropped on the floor. Every
entry the librarian has filed since 446 has shown the uncited warning regardless of what
the model returned — and a warning that fires 100% of the time trains the crew to ignore
it, which is worse than not having one.

Two lines, one in each response builder. The rest of the chain was already correct and
verified end to end: the client reads `d.sources` at **4** sites and renders it through
`lbSources()` at **3**.

**Reported as our own regression.** The feature was announced in a build comment and has
never once run.

Also removed **`librarian.js` from the repo root** — a shorter, older duplicate of
`api/librarian.js` (9,121 vs 13,001 bytes) whose own first line is the comment
`// /api/librarian.js`. Nothing referenced `/librarian.js`; the app calls `/api/librarian`
twice. It was not in `.vercelignore`, so it was being served at
`app.cardinalroster.com/librarian.js`.

**What is still unverified:** the live Gemini round trip. Whether the model actually
returns useful citations, and how often it correctly returns an empty array, needs one
real question asked against the deployed function. Ask the librarian something
code-shaped — *"what nail count does high wind require?"* — and see whether chips appear.

### 454 · the money page, and the Coverage D error it exposed

`rlPagePolicy` held **3 cards** and the library contained **no worked money arithmetic
anywhere**. Now 13: Coverage A–D, flat vs percentage deductible, the payment order worked
twice, why a $0 first check is not a denial, recoverable depreciation, the roof payment
schedule endorsement, duties after loss, mortgagee loss-draft escrow, appraisal, and the
deductible. **+10 cards, +5 tables, `.rl-warn`'s first six production uses.**

#### Drafted, then adversarially reviewed before it came near the file

Three independent lenses — arithmetic, insurance accuracy, legal exposure — plus an
adjudicator. **30 required changes: 24 to the draft, 6 to shipped content.** The
recurring failure the review named is worth keeping: *a correct worked example generalised
into a rule.* "The carrier pays twice", "withheld depreciation is recoverable", "the
identity is the whole point" — each true of the example, false as a rule, and each one
gets corrected in front of a customer.

The single worst item was a spoken script in an `.rl-use`, in quotation marks, promising
a homeowner their out-of-pocket is the deductible — **false under a roof payment schedule
endorsement, which the library's own card describes two cards later.**

#### Six corrections to shipped cards — why this had to be one build

**Five places called Ordinance & Law "Coverage D".** On a standard ISO HO-3 **Coverage D
is Loss of Use**; Ordinance or Law is a Section I Additional Coverage, commonly capped at
10% of Coverage A. One of the five was an **`.rl-cite` chip** — the monospace chip that
exists *because reps read it aloud* — and one was **sample supplement wording a rep sends
to a carrier in writing** over Cardinal's name.

Shipping the new Coverage A–D card without these would have put two cards in one library
flatly contradicting each other, **both surfacing on a search for "coverage d"** — a
search that only started working at 453.

**The review supplied four of the five. The patch's own scope assertion caught the
fifth** — the citation chip. That assertion is the reason it did not ship.

#### `.rl-warn` had never rendered

Exactly **one** occurrence in the 2.66 MB file (the CSS rule), **zero** markup uses, and
it resolved **byte-identically** to `.rl-use` — same `--ct-act-bg` / `--ct-act-edge` /
`--ct-act-ink`. Every legal disclaimer would have rendered in the same skin as the
cheerful sales tip. Now on `--ct-warn-bg` / `--ct-warn` (both declared in each skin, with
literal fallbacks). Contrast computed, not estimated: **10.85:1** body and **8.01:1** bold.

#### Gates

`check_build.py` green, `--prev` at 453, marker negative-controlled. Functional harness
**21/21**. Re-applying to a fresh copy reproduces byte-for-byte (`d8dd0a16`).
**Negative control: 18 of 21 fail on 453**, including the Coverage D check — the errors
were real and the gate has been seen to fail.

#### Three harness bugs, all mine, all caught

1. Asserted a `::before` label that was never part of the adjudicated fix — my own dropped
   idea. Removed.
2. **`innerText` on a *rendered* container skips `display:none` children**, so the
   library-wide "no Ordinance-linked Coverage D" check was scanning only the active page
   and **passing vacuously**. `textContent` sees hidden pages; `innerText` does not.
3. `Coverage D` case-insensitive matched **"coverage doesn't"**. Missing `\b`.

### Flagged, not fixed — Theo's call

`rlPageCode` → *Roof Decking / Sheathing* tells reps "Ordinance & Law coverage often pays
for this even when standard coverage doesn't", about **rot-driven** decking replacement.
Decking replaced because it is rotten is a condition item; only a **code-driven** decking
upgrade (thickness, span, fastening) is Ordinance or Law. Correcting it needs a decision
about how the decking-supplement cards frame that distinction, so it is a follow-up build,
not a silent edit.

---

## Build 455 — the search box the stylesheet had been waiting for

`#resourceLibraryView .rl-search` shipped as **five complete CSS rules and zero elements**
— sticky, focus ring, placeholder colour, `min-height:48px` for a thumb. Nobody had ever
seen it. Until now the only way to search the library was the TOC modal, which means
leaving the page you are reading to find something on it.

**17 boxes, one per content page with 4+ cards**, mounted immediately after `.rl-pagehead`
and filtering that page in place. Hubs and thin pages get none — they are navigation, not
reading. Re-mounted on every library open, so the NACHI pages built at runtime get one too.

**No second mechanism.** It reuses the 453 index (`cardsFor` / `cardRank` — the same
citation + tag + body-text ranking the TOC modal uses) and the `.rl-hidden` class already
in the file. The only new CSS is one rule, `.rl-searchnote`.

### Two defects found while building it

- **A cross-surface dead end.** Filter a page, then use the TOC to jump to a card on that
  page that the filter is hiding: the scroll landed nowhere, on a page showing four cards.
  `scrollToCardEl()` now clears the target page's box **through the box's own input
  handler** — the same unhide path, not a second one.
- **`rlPageInsp` lost the top slot.** The NACHI module inserts its nav card at the *same*
  `head.nextSibling` position, so whichever ran last owned it — and NACHI ran last. The
  mount now re-seats the box on every pass; moving a node already in place is a no-op.
  Caught by the harness, not by reading. Exactly the "grep for every occurrence before you
  patch a selector" rule, in element form.

### A third finding that needed no fix

`#resourceLibraryView .rl-search{top:0}` already exists at char 2,441,195 inside
`cr-hd2-styles`, overriding the `top:66px` in the library's own block. It is not a
conflict: that block also hides `.ins-header` and pins the view below `--headh`, so 0 is
the correct offset once the library's own header is gone. Someone wrote the companion rule
for a box that did not exist yet. Measured sticking, not assumed: after a 900px scroll the
box pins at the top of the overlay.

### Gates

`check_build.py` green with the negative control. **28/28 in a real browser** — mount
arithmetic (17 boxes vs 17 eligible pages, computed both ways rather than hardcoded),
placement, filtering, the count note agreeing with the DOM, the empty state, clear-restore,
citation search on the code page, the cross-surface bug and its fix, and no double-mount on
re-open. **Negative control: 0 boxes on 454**, so every check below the first is dependent
on the build.

Painted contrast in both skins: input **17.75:1** docket / **16.05:1** siren; the count
note **5.30:1** / **7.75:1**. Computed from what the browser painted, not from source.

Scope proven both ways — re-applying the patch to a fresh 454 reproduces `index.html` byte
for byte, and a sentinel walk over all six regions leaves the two files identical.

### Two harness bugs, both mine

1. Measured `boxes[0]` for height while its page was inactive and reported **0px** about
   perfectly good CSS. Only `.rl-pageActive` is displayed. Activate, then measure — it is
   49px.
2. The negative control crashed on `boxes[0].closest` instead of failing cleanly. A control
   that throws is weaker evidence than one that names the missing thing.

---

## Build 456 — the one page the search could not see

Measured across all 34 library pages: every page is at least 75% indexed **except**
`rlPagePitfalls` (Do & Don't), which was **0%**. 2,721 characters over 11 cards — seven DO
and four DON'T, the field practices most worth having in a rep's hands — and none of it
came up no matter what you typed. It uses a two-column `.rl-ddcard` layout and
`buildIndex()` walked `'.rl-groupsep, .rl-card'`.

The page is good. It was just invisible.

### The trap in the obvious fix

Adding `.rl-ddcard` to the walk is one selector. Shipping only that would have been a
safety bug: `renderTOC()` prints a card's group heading **only when there is no query**
(`if(!q && h.c.group ...)`), so a DON'T surfacing from a search shows as a bare title.
**"Waive or absorb the deductible" reads as advice.**

So the polarity lives in the indexed title — `Don't — Waive or absorb the deductible` —
which is correct with or without a query and makes "do" and "don't" searchable words in
their own right. It is read from the card's own class (`.rl-docard` / `.rl-dontcard`), not
from the column head, whose `textContent` starts with an emoji entity.

Second find, from reading the CSS rather than watching it fail: the flash rule is scoped
`#resourceLibraryView .rl-card.cr-rltoc-flash`. Navigation would have applied the class to
a `.rl-ddcard` and animated nothing. The selector now names both.

The page still gets no search box of its own — it has zero `.rl-card`, so it sits under
the 4-card mount threshold from 455. That is deliberate: filtering one column of a
two-column DO/DON'T layout leaves a heading with nothing under it.

### Gates

`check_build.py` green, marker `.rl-groupsep, .rl-card, .rl-ddcard` with the negative
control. **15/15 in a real browser**, including the flash animation resolving to a real
`animation-name` and the index totalling 144 cards + 11. Scope proven both ways over four
regions.

**Negative control: 6 of 11 fail on 455** — and getting to 6 was the point. The first
version failed only 4, because the two *safety* checks passed **vacuously**: `[].every()`
is true, so "every row declares Do or Don't" passed against zero indexed rows. Both now
require a non-empty set before they can pass. A vacuous safety check is worse than no
check, and this is the second time this class has appeared on this project — build 454's
`innerText` scan had the same shape.

### A third harness bug, also mine

The index-totals check was guarded with `if (bg2)` and **silently skipped**: clicking a
result closes the TOC panel, so `bg2` was null every run. It reported 13/13 while proving
12 things.

---

## Build 457 — a search result has to say which manufacturer it is about

Found while validating a tag-editing helper, not while looking for it: the helper refused
to locate a card by `(page, title)` because **six titles are not unique within their page.**

`rlPageMfg` carries three cards called **Contractor Program & Warranty Tiers** and three
called **Do-Not-Mix Rules** — one each for Owens Corning, GAF and CertainTeed. On the page
the `.rl-groupsep` above them says which. In a search it does not, because `renderTOC()`
prints the group heading **only when there is no query** — the same line that caused the
Do & Don't problem in 456.

So typing "warranty tiers" returned three rows reading exactly the same. Cardinal runs
**Owens Corning throughout**; opening the GAF card by accident means quoting the wrong
manufacturer's fastening and do-not-mix requirements on a live roof.

`buildIndex()` now counts titles per page and qualifies **only** the ones that repeat:
`Owens Corning — Contractor Program & Warranty Tiers`. Six rows change. A title already
unique on its page is left exactly as written — asserted in the harness against
*Product Lines & SureNail* and *Ice Barrier Requirement*.

Side effect worth having: "Owens Corning" went from 2 hits to 3+ as a query.

### Gates

`check_build.py` green with the negative control. **15/15 in a real browser.** The
strongest check is the last one: click the GAF row, then walk back up the DOM from the
flashed card to its `.rl-groupsep` and assert it reads `GAF`. That proves the label matches
the card, not merely that the labels differ.

The sweep check is stated as a property rather than a case — *no two rows on any page read
identically*, computed over the whole index — so a future page with duplicate titles fails
this gate without anyone remembering to add a case.

**Negative control: 8 of 13 fail on 456**, and the failure output prints the bug verbatim:
`Contractor Program & Warranty Tiers | Contractor Program & Warranty Tiers | Contractor
Program & Warranty Tiers`.

Scope proven both ways over three regions. No markup changed at all — card count,
groupsep count, `data-rltags` count and `<h3>` count are all identical to 456.

### A counting correction, entered against myself

`FEATURES.md` said the library has **146 `.rl-card`**. That is a bare regex over 2.6 MB:
**ten of those hits are inside JS template strings.** The real numbers are **136 in
markup**, **144 in the DOM** (136 + 8 built from in-file NACHI templates), before the
database adds any. Corrected in `FEATURES.md`, which now states both and says why they
differ.

---

## Build 458 — the trade words a rep actually types

A probe of **107 realistic search terms** against the library at build 455 found **27
returning nothing** and 21 returning a single card. That list went through two adversarial
passes. **18 of the first 27 proposals were refuted**, and several refutations are worth
more than the tags that survived them.

### What the review stopped

- **`flat roof` → the commercial code cards.** OBC does not apply to a one- or two-family
  dwelling; RCO does. In Dayton a residential "flat roof" is a porch, addition or garage
  deck, usually under 2:12 — where **RCO R905.2.2 does not permit asphalt shingles at all**,
  and the card the tag would have pointed at says "double-layer underlayment and shingle
  it." Zero results sends the rep to call the office. That tag would have sent him to the
  supply house with the wrong material. **Left at zero** until a residential low-slope card
  exists.
- **`ice dam` → the Ice Barrier code card.** An ice dam is a winter phenomenon; the ice
  barrier rule is an installation requirement at re-roof. A rep who lands there and tells an
  adjuster "code requires ice barrier so my leak is covered" has conflated code compliance
  with coverage. Routed to **Attic Ventilation** — the actual cause and prevention.
- **`permit close-out` → the depreciation card.** The card mentions it once as the fourth of
  four proofs. A rank-2 tag asserts the card is *about* it, routing a public-authority
  question into a money card — and on a Dayton tear-off the corpus's own City of Dayton card
  says no permit is required at all.
- **`window wrap` → the fascia card.** Fascia wrap bills by LF along eave and rake; window
  wrap bills per opening. The correct card already answers that query and the tag would have
  sorted the wrong one above it.
- **`weatherlock` / `proarmor`.** Brand names are narrowings, not synonyms — RCO R905.1.2
  accepts a self-adhering sheet from anyone, GAF sells WeatherWatch, CertainTeed WinterGuard.
- **`ridge capping`.** Australian/NZ usage for mortar-bedded ridge tiles. Nobody in Dayton
  says it.
- **`capping`** on its own — it means trim coil wrap, ridge cap shingles *or* cap flashing
  depending on who is speaking. The disambiguated compounds shipped instead.

### Two mechanics that shaped every token, both read from the shipped source

1. **`cardRank()` is plain substring, so matching is ONE-DIRECTIONAL.** The query is searched
   inside the tag: a tag `ice damming` is found by `ice dam`, but a tag `ice dam` is **not**
   found by `ice damming`. So the longer form ships. That is why `high nailing` also answers
   `nailing` (and why a separate `nailing` token was dropped as a strict no-op), and why the
   plurals `turtle vents`, `soffit vents`, `cap flashings`, `gutter sizes`,
   `additional living expenses` are the shipped forms.
2. **`filterTier()` runs PER PAGE**, inside `allPages.forEach`. Give a card a rank-2 tag and
   every rank-3 body hit **on that page** vanishes from that query. The first skeptic claimed
   this was library-wide and was wrong; that was checked against the source, not argued.

**That mechanic bit twice, and both were caught by measurement, not by reading.**

- `cap flashing` was answered only by `rlPageSup :: Screens & Window Frames` at rank 3 — the
  same page as `Step & Counter Flashing`. Tagging Step alone would have deleted it. Screens
  is tagged `window cap flashings`, which contains `cap flashing` so it survives, and is
  honest: there the term means the aluminum head cap over a window, not chimney
  counterflashing.
- `gutters` lost `Slope / Fall` the moment `Total Eave Linear Feet` gained `5 inch gutters`.
  Fixed by tagging `Slope / Fall` with `gutter slope gutters` — its tags were
  `pitch slope grade half inch` and never said gutter at all, while its body is about
  sagging gutters holding standing water.

### Gates

`check_build.py` green with the negative control. **104/104 across five browser harnesses.**
Scope proven both ways over **22 regions**.

The real gate was a **402-query regression diff** — the 107 probe terms, the 22 new tokens,
and all 314 existing tag tokens on every page being touched — captured as full result sets
before and after so they diff card by card rather than by count. **35 queries gained, 365
unchanged, 1 lost.**

The one loss is accepted and stated: `water` drops three `rlPageCode` body hits
(*When Roof Recover is Prohibited*, *Flashings*, *Commercial Reroofing Rules*) and gains
*Ice Barrier Requirement* at tag rank. All three lost hits are incidental — "water-soaked",
"prevent water intrusion". Every genuinely water-related card survives.

**Known leftover, not fixed:** `nailing` still returns `rlPageMfg :: 📤 PDFs Pending` as a
rank-3 body hit. Evicting it needs a rank 0–2 hit on that page, and tagging a card purely to
hide a junk row is the wrong tool. It is a placeholder-card cleanup.

### A third test-was-wrong

The generic scope proof reported REGION PROOF FAILED. It spies on `patch_lib.sub`, and 20 of
this build's 22 edits go through `tag_lib.append_tokens`, which splices a located opening tag
directly — so it correctly reported changes it had not been told about. `proof_458.py` spies
on both paths. Third red on this project that was the test's fault, not the artifact's.

---

## Build 459 — the light/dark control belongs on Community, so make it deliberate

Theo's call: the retail light/dark toggle appearing on Community is **correct, not the bug
I flagged at 452.** Two things follow, and neither is cosmetic.

### It was there by accident

`refreshVisibility()` runs on a 1-second interval and sets `.show` only when the CRM is
retail. It looks like dead code because build 417's
`#cr-hd2-srch #cr-dark-toggle{display:flex !important}` outranks it — **but only once
`ensureSearchRow()` has adopted the button into the header row.** `ensureButton()` appends
it to `<body>` first, and in that window it is the bottom-right FAB, whose visibility
`.show` really does govern. So on Community the control was visible in the normal state and
hidden in the fallback one.

The gate now names both CRMs. Insurance keeps its explicit hide rule — it mounts its own
Docket/Siren control in that row and must never show both.

### Pressing it on Community is now a supported path, so Community light had to be checked

It is a real palette: 32 `--ccm-*` tokens at `:root` and 32 twins under
`[data-theme="rb-light"]`. Every text-on-surface pair was computed in both themes, with
alpha washes **composited over their real base** rather than treated as solid.

**`--ccm-dim` was the one token that could not carry text**, and it failed in *both* themes:

| | ground | card | raise |
|---|---:|---:|---:|
| light `#8a8a8a` → `#6e6e6e` | 3.08 → **4.54** | 3.45 → **5.10** | 3.24 → **4.79** |
| dark `#7d8781` → `#828c86` | 5.14 → 5.50 | 4.77 → 5.10 | **4.33** → **4.63** |

Both are the *lightest* values that clear 4.5 on every surface the token actually sits on,
so the dim-under-mute hierarchy survives (`--ccm-mute` is 5.12–5.74 light, 6.21 on raise
dark).

Chips were excluded deliberately: `--ccm-chipink` carries chip text and `--ccm-dim` never
sits on one. Forcing 4.5 on `#ececec` too would have required `#6b6b6b`, nearly
`--ccm-mute`, collapsing two tiers into one.

### Three of my own errors, all caught by instruments rather than reading

1. **I compared alpha washes as if they were solid.** `rgba(200,32,46,.16)` was read as
   `#c8202e`, which reported *red on its wash* at 2.06:1 and *wash border on wash* at
   1.00:1. Both were the instrument. Composited over the real base they are 5.87 and 7.90.
   Two false findings, in the same class as the 452 square-bounding-box error.
2. **I said `--ccm-dim` has 12 references. It has 25.** The grep matched `var(--ccm-dim`
   and missed the 13 that go through `--dim`, the alias `#cr-cc` declares
   (`--dim:var(--ccm-dim)`). Alias indirection defeats a single grep — the same shape as the
   `renderTeamPage` and `.acthead` traps.
3. **I only checked `dim on card` in dark and called dark clean at 14/14.** The harness,
   which enumerates pairs rather than trusting my list, found `dim on raise` at 4.33:1. I
   then verified the pair is real before touching it — `.cr-nbid-box input` and
   `#cr-cc .sheet .tot` both paint `var(--raise)` and both carry `--dim` text, a placeholder
   and a totals label. Pre-existing, not caused by this build, fixed because it is real.

A fourth, smaller: the first draft's changelog entry said "light mode" after the build had
grown to fix both themes, and a scope comment still read "the dark default is untouched".
Both corrected before commit — a changelog is user-facing and a stale one is a lie.

### Anchor discipline

`#8a8a8a` occurs **28 times** in this file. A find-and-replace on the value would have been
an app-wide restyle. The anchor is the token declaration, which occurs once; the patch
asserts the other 27 survive.

### Gates

`check_build.py` green with the negative control. **13/13 in a real browser**, driving the
shipped `CardinalRBTheme` and reading tokens the browser actually resolved — including the
FAB state across four CRMs and the header-row state on Community and Insurance.
**0 contrast pairs below floor in either theme**, computed from resolved values.

**Negative control on 458: 3 checks fail and 4 contrast pairs are below floor** — exactly
the three light `dim` pairs and the one dark one.

Scope proven both ways over 5 regions. The other five library harnesses still pass 104/104.

**Theo's eyes are still the gate on how it looks.** The ratios are arithmetic and they are
right; whether `#828c86` reads as "dim" next to `#9aa39e` on his phone is not something a
number settles.

---

## Build 460 — roof-to-wall, slope, and a drip-edge number that was wrong

First tranche of the thirteen measured content gaps. Every gap was re-verified against the
corpus before a word was written, and that re-verification changed the build twice.

### The most important thing in this build is a correction, not a new card

`rlPageCode :: Drip Edge` said **"Fasten at intervals not exceeding 16 inches on center."**
R905.2.8.5 says **12 inches** — *"Drip edges shall be mechanically fastened to the roof deck
at not more than 12 inches (305 mm) o.c."* Verified against the 2018 and 2021 IRC and two
adopting jurisdictions, not recalled. That is a wrong number on a card whose entire purpose
is to be quoted to an adjuster.

### Two cards I did not write, because they already existed

- **Drip edge / gutter apron.** The shipped card already carries eaves-and-rakes, the 2″
  overlap, the ¼″ and 2″ extensions and the underlayment sequencing. The only thing it
  lacked — that a gutter apron is a *different profile the code does not name* — went on as
  a warning. Extend, don't add.
- **Kickout** is genuinely absent, and the existing `Flashings — Step, Wall, Valley,
  Chimney` card does not cover it. Checked before writing rather than assumed.

### The extractor lied first

`kickout` and `kick-out` do appear in the file, and my first pass attributed them to
`Calculating from an Aerial Report` — because that is the last card on its page and my
owner-mapping let its range run to end-of-file. Every hit is actually in **Cardinal's own
gutter contract template and the estimate chips**, i.e. app code, not a library card. Fixed
the mapping before drawing a conclusion. Useful side effect: the new card matches Cardinal's
existing scope wording instead of inventing a parallel phrasing.

### Six new cards

`rlPageCode` — **Kickout & Roof-to-Wall Flashing** (R903.2.1), **Slope Decides the System**
(R905.2.2), **Powered Attic Ventilators** (R806).
`rlPageSup` — **Kickout / Roof-to-Wall Diverter**, in the Flashings group.
`rlPageInsp` — **Ice Dams**, **3-Tab vs. Architectural**.

Two points worth keeping:

- **The IRC never uses the words "kickout flashing."** The requirement is functional — *"a
  flashing shall be installed to divert the water away from where the eave of a sloped roof
  intersects a vertical sidewall."* The card teaches the rep to quote the sentence, because
  saying "code requires a kickout" and being told the word is not in the book loses the room.
- **The ice-dam card refuses the coverage argument on purpose.** R905.1.2 is an installation
  requirement at re-roof; it is not retroactive and it does not make an existing ice-dam leak
  a covered loss. The card says so, in a warning, because that conflation is the easy mistake.

### Content shipped without its key, and the harness caught it

The gutter-apron warning sits **past the 300-character body index**, and the visible
`.rl-tags` chips are display only — the searchable attribute is `data-rltags`. So the card
taught the distinction and `gutter apron` still returned nothing. Tagged.

### Gates

`check_build.py` green with the negative control. **27/27 in a real browser** — every new
card present on the right page with tags, the correction live, no duplicate Drip Edge card,
both new tables rendering as real tables, and every card reachable through the shipped
search. Scope proven both ways over 8 regions. Full suite still green: **117/117**.

### Counting, again

Three assertions in this patch were hardcoded guesses that fired: `RCO R903.2.1` (already
present twice in the file), `rl-warn`, and `gutter apron`. I fixed the last one by
instrumenting the delta and reading it instead of reasoning about it — which is what the
counting rule in `CLAUDE.md` has said all along. Prefer self-computing assertions; when one
fires, measure, do not re-guess.

---

## Build 461 — the wall, which the library had nothing on

Second tranche. The library held **thirteen siding cards and every one was about measuring
siding or reading a siding report.** Nothing on the wall as an assembly, nothing on
identifying the material, nothing on how siding damage reads.

### No new page, deliberately

The gap list allowed a new `rlPageSiding`. That means a hub nav box, a router entry and a
sprite symbol — three surfaces — for content that splits cleanly across pages that already
exist. So: the wall **code** opens a `Walls — RCO Chapter 7` group on `rlPageCode`, which
was roof-only despite being called Construction Codes; **reading damage** goes on
`rlPageInsp` beside the 3-tab card from 460; **the matching argument** joins the Matching
group on `rlPageSup`, next to the shingle version it mirrors on purpose.

### Five cards

- **Water-Resistive Barrier** (R703.2) — one layer of No. 15 felt to ASTM D226 Type 1 or
  another approved barrier, horizontal, upper over lower ≥2″, joints ≥6″, continuous to the
  top of the wall. Verified this session, not recalled.
- **Re-Siding Over What Is Already There** (R703.1) — the wall has to end up a
  weather-resistant envelope, so a layover is a decision about the openings and the
  substrate, not a price.
- **Vinyl Siding — Profile, Gauge, and Why Both Go in the File** — with the panel-back
  photo trick, because a stamped nail hem turns "discontinued" from an assertion into a fact.
- **Reading Damage on Vinyl — and the Cold-Weather Trap.**
- **Discontinued Siding Colour — Full Elevation** (OAC 3901-1-54(I)(1)(b)).

### Two judgement calls worth recording

**The vinyl cards carry no `rl-cite` at all, on purpose.** They teach how to read damage and
identify a panel. No code section says what a Dutch lap is. The library's other inspection
cards are uncited for the same reason, and inventing a section number to make a card look
authoritative is precisely the failure this whole tranche was built to avoid. The harness
asserts the absence.

**The cold-weather warning states both directions, and the harness enforces that too.** Vinyl
gets brittle below freezing, so genuine storm damage in winter can be worse than the same
stones in July — a real argument. And a crew working cold can crack a panel with a ladder or
a knee — which is *not* storm damage. A card giving only the first half would be coaching a
rep into a fraud. `...says winter damage can be worse` and `...says crew-caused damage is not
storm damage` are both gate checks.

### Gates

`check_build.py` green with the negative control. **21/21 in a real browser**, including that
the new group sorts between the roof and commercial groups, that neither vinyl card carries a
citation, and that both halves of the cold-weather warning are present. Scope proven over 5
regions. Full suite **145/145**.

`R703` occurred **zero times** in the file before this build — asserted in the patch, so the
claim that the wall code was absent is checked rather than stated.

---

## Build 462 — the last six gaps

Third and final tranche. **All thirteen measured content gaps are now closed.**

### The number I would have got wrong

The mechanic's-lien window for a **one- or two-family dwelling is 60 days** from the last
day labour or material was furnished. **Seventy-five is the commercial figure**, and 75 is
what I was about to write from memory. Verified against ORC 1311.06 before it went near a
card. On a house, fifteen days late is entirely too late — the card says it in bold and the
harness asserts both the 60 and that 75 is labelled commercial.

Also verified rather than recalled: ORC 2305.06 was shortened by **SB 13, effective 14 June
2021** — written contracts 8 years → **6**, oral 6 → **4**, with pre-amendment claims running
to the earlier of 14 June 2027 or the remaining old period.

### The distinction that matters more than either number

A **suit-limitation clause inside the policy is not the statute of limitations.** It is a
private term, usually far shorter, and it is enforceable. The card refuses to let a rep tell
a homeowner "you have six years" off the contract statute.

That conflation was named by an adversarial reviewer earlier in this session, when it
recommended *against* tagging "statute of limitations" onto the duties-after-loss card —
because the card describes a contractual clause and the tag would assert the two are the
same thing. The reviewer was right, and it said the honest fix was a card that does not
exist. **This is that card.** A refutation from three builds ago turned into content.

### Montgomery County, written as a method rather than a claim

The same review refuted tagging "Montgomery County" onto `Other Miami Valley Jurisdictions`,
because that card names Beavercreek (Greene) and Springboro (Warren) alongside Montgomery
municipalities, and Dayton, Kettering and Huber Heights each have their own card — so the
query would land on the one card that excludes them.

So the shipped card is not a jurisdiction list I have not verified. It is the rule —
municipality with its own department issues its own; townships and unincorporated land are
the county — plus the method: pull the parcel, read the taxing district, call that office.
**It explicitly tells the rep not to infer the AHJ from the card itself**, and the harness
asserts that sentence is present. `Montgomery County` occurs the same number of times after
this build as before: once, in an unrelated form placeholder.

### Six cards

`rlPageInsurance` — **Asking for a Reinspection**, **Deadlines That Actually Bite**.
`rlPageDocs` — **The Punch Walk**, **Closing the Job on Paper**.
`rlPageCode` — **County vs. Municipality — Who Actually Has Jurisdiction**.
`rlPageMfg` — **Malarkey — Certification, Warranty and the Secure Choice System**, verified
against the manufacturer's own programme, ending by telling the rep to confirm current terms
because a summary is not a certificate.

### Two harnesses went red, and both were right to

- **`rlPageDocs` grew 3 → 5 cards and crossed the 4-card threshold, so it earned a search
  box.** 17 → 18. The Do & Don't harness hardcoded 17. That is the **455 mount rule working
  as designed**, so the test now derives the expected count from the eligible pages.
- **"warranty tiers" now returns four manufacturers, not three**, because the Malarkey card
  legitimately carries that tag. The manufacturer harness asserted exactly 3. Rewritten to
  require the Big 3 present and no two rows reading alike — which is the property build 457
  actually established. A fourth manufacturer answering the query is an improvement.

Neither was an app defect. Third and fourth reds on this branch that were the test's fault.

### Gates

`check_build.py` green with the negative control. **29/29 in a real browser**, including the
60-vs-75 assertion, the suit-limitation distinction, the do-not-infer sentence and the
verify-with-Malarkey sentence. Scope proven over 6 regions. Full suite **195/195** across
nine harnesses.

---

## Build 463 — Roof Types: the library learns what a roof looks like

*30 July 2026. One page, one plate, thirteen drawings, twelve cards.*

Theo asked for a section on roof types with pictures, pointing at the kind of illustrated
roof-shape chart that turns up in a web search.

### Audited first, per the doctrine — and this one really was missing

`gambrel`, `mansard`, `saltbox`, `butterfly`, `cross gable`, `dutch gable`, `roof shape` and
`roof style`: **zero occurrences each**. All 19 hits for `gable` were *gable vents* on the
ventilation cards. The library carried thirteen siding cards and a full measurement tree and
had never named a roof form.

### What it extends rather than invents

- **`figure.rl-fig` + `Plate N`** — the existing figure convention. Plates 1–3 ship today.
  This is **Plate 4**, thirteen shapes on one grid.
- **`.fig-ink` / `.fig-acc`** — the existing figure stroke classes. Walls read ink, roof
  reads accent, exactly as Plate 1 does.
- The **455 search box** mounted itself: 12 cards and a pagehead is over the 4-card
  threshold, and boxes went 16 → 17 without a line of new code.

### The drawings are computed, not drawn

One oblique projection, defined once, walked by `pt(u,v)`. Every shape is a list of
*volumes*; each volume emits wall polygons in ink and roof polygons in accent. Two-volume
shapes (cross gable, cross hip) paint back-to-front with the front volume masking the one
behind. Bounds are asserted, so nothing silently runs off its viewBox.

### Two things caught in preview, before the file

- **The sprite draft rendered flat.** The first version put the shapes in `<symbol id="rl-r-*">`
  and used `<use>`, copying the `rl-i-*` nav icons. Every tile came out ink with no accent:
  `<use>` builds a shadow tree and `.rl-mark .rl-mark-a{stroke:…}` cannot select into it.
  Plates 1–3 never used the sprite. Rewritten to inline SVG.
- **Butterfly was a projection collision.** With the valley running front-to-back, the back
  valley point lands 2 px from the front-right eave and the right-hand plane degenerates
  into a sliver. Running the valley left-right puts the V in the visible face.

### The defect this build found in the library's own machinery

**`var TOC` in `cr-rltoc-script` is still a hand-maintained hub → page list.** Build 453
replaced the hand-typed *card* list with `buildIndex()`; the *page* list survived and nobody
noticed. Registering the new page in the markup, the `data-rlgoto` map and `parentOf` — three
of four points — produced a page that rendered, navigated, and searched correctly **from its
own box**, while the global contents search returned **zero** for `gambrel`, `mansard`,
`saltbox`, `jerkinhead`, `roof shape` and `butterfly`.

That is a silent half-failure. It was caught because the harness asserted on search results
rather than on the page existing. The four-point rule is now written up in `FEATURES.md`, and
the patch asserts `count('rlPageRoofTypes') == 4` against the measured count for `rlPageMfg`
and `rlPageCode`.

The fix shipped inside 463 rather than as a follow-up — the page was reverted and re-patched
so the build is coherent, not a broken page plus a repair.

### Deliberately no code citations

Roof form is not code-defined; no section says what a gambrel is. Where a real rule applies —
slope thresholds, R806 net free area — the cards point at the library card that already
carries it rather than restating a number this build would have to re-verify. Same discipline
as the vinyl cards at 461, and the harness asserts `.rl-cite` count is **0** on the page.

### Gates

`check_build.py` green with a negative-controlled marker. **38/38 in a real browser** —
reachable by a real click on the hub box, back lands on the General hub, 13 tiles each with
art and a label, the accent resolving to a different colour than the ink (the check that
would have caught the sprite bug), mask fill equal to its tile background in both skins, tile
label contrast 5.30:1 and 7.51:1, three-across layout with no horizontal overflow at 414 px,
and every new card findable in both search surfaces. Negative control **0/2** on 462 — and it
bails cleanly rather than throwing, because an `ERR` stack proves nothing.

Scope proven both ways over 8 regions: replay reproduces the file byte for byte, and a
sentinel walk leaves everything outside the edits identical.

**Counts, measured:** pages 34 → 35 in the DOM, cards 161 → 173, plates 3 → 4, search boxes
16 → 17. File +28,790 characters.

---

## Build 464 — the library light/dark button goes back

*30 July 2026. Reported as a freeze. It was not a freeze.*

Theo: *"Page freezes for a few seconds after hitting toggle then toggle back."*

### Measured before diagnosing

There is no freeze. Click-to-second-frame for the library skin button is **30 ms** on
desktop and **95–183 ms at 6× CPU throttle**, and the app theme button is 32 ms / 149–183 ms.
Identical on 462 and 463, so the 13 SVGs build 463 added were not the cause either — that
was the first suspicion and it was wrong.

What is broken is that **the button is one-way.** It takes you light → dark and then does
nothing, however many times you press it. Pressing a control that visibly does nothing is
what "toggle then toggle back" running into a wall feels like.

### The defect — two writers, one asymmetry

`CardinalRLTheme.apply()` sets the attributes and deliberately does **not** persist; its
sibling consumer, the inline `#rlThemeBtn` handler in `cr-dl-script`, writes
`localStorage['cardinalRLTheme']` itself before calling it.

The floating `#cr-rltheme-btn` in the library block does not:

```js
var next = currentRlTheme() === 'siren' ? 'docket' : 'siren';  // reads localStorage
if (CardinalRLTheme.apply) { apply(next); applied = true; }    // always taken
if (!applied) { localStorage.setItem('cardinalRLTheme', next); } // dead branch
```

`applied` is always true, so the write sits on a branch that never runs. `currentRlTheme()`
reads a key nothing ever wrote, returns `'docket'` every time, and `next` is `'siren'` every
time. Probed in Chromium: **localStorage stayed `null` across four presses** while body and
view stayed `siren` and the card background never came back.

**Pre-existing, not a 463 regression** — the handler is byte-identical on 462.

### The fix

Read the **applied** state off the DOM instead of off the setting nothing wrote, and persist
on both paths. That mirrors the sibling handler rather than inventing a mechanism, and it
also makes the button correct where `localStorage` throws (private mode), which the old code
could not be. `apply()` itself is untouched — this build does not move the persist contract.

Side effect worth having: the skin now survives a reload. It never did.

### Gates

`check_build.py` green with a negative-controlled marker. **9/9 in a real browser** — six
presses landing on the right skin each time, body and view never disagreeing, the card
background actually returning to its light value, the choice persisted on every press, glyph
and `aria-label` tracking state, and the skin surviving a reload. **Negative control 7 of 9
failing on 463**, which is the discrimination that matters: the old code changed the
attribute on press 1 too, so a weaker test would have passed on it.

Scope proven both ways over 3 regions.

### Still open

The report said *freeze*. I could not reproduce one at 6× CPU throttle on a desktop browser,
and the numbers above are the whole of what I can honestly claim. If it still stalls on the
phone after this, it is a different bug and I need to know which of the two controls — the
floating ◐ or the 🌙 in the header row — and roughly where in the app.

**Two theme controls are visible at once on a library page**, which is its own confusion:
`#cr-rltheme-btn` (library skin, `--ct-*`) and `#cr-dark-toggle` (retail app theme, flips
`:root[data-theme="rb-light"]`). Flagged, not changed — which controls appear where is
Theo's call.

---

## Build 465 — Plate 5: how an ice dam forms

*30 July 2026. Theo asked for pictures on the ice dam card and picked "both" — a drawing
for the mechanism, photographs for what it looks like. This is the drawing half.*

### Why a drawing is the right artifact here, not a fallback

The ice dam is not the interesting object; the heat path is. A photograph shows icicles at
an eave, which is the symptom every homeowner already describes on the phone. What a rep has
to argue is that **the cause sits inside the wall line, under the insulation** — and that is
a section, not a photograph.

### It is Plate 2's eave, drawn again

Same 340×200 viewBox, same deck line, same wall line, same `fig-*` classes. Plate 2 shows
what the code makes you put at that eave; Plate 5 shows why. The caption points across.
**No new CSS** — the plate machinery took it verbatim, and the patch asserts `fig-mask` did
not move (a single-volume section needs no occluder).

### Four drafts, and they failed the same way three times

1. Seven labels in 340×200 → five collisions.
2. **The ice polygon closed on a chord** from (118,110) to (30,140) instead of on the deck,
   so the wedge rendered *below* the roof line.
3. Still six labels, still colliding.
4. Five labels, ice re-cut as a mound rising off the eave instead of a sliver. Clean.

Every pass was rendered in Chromium in both skins and looked at. **Label crowding, not
geometry, was the real problem in three of four** — the instinct to add another label is the
thing to resist. The harness now asserts pairwise that no two `<text>` boxes intersect, so
that failure cannot come back silently.

### Gates

`check_build.py` green with a negative-controlled marker. **12/12 in a real browser** —
including that the plate landed *inside the ice dam card* rather than merely somewhere in the
file, that the accent paints and differs from ink, that all five labels exist, that **no two
label boxes overlap**, and that Plate 2 is untouched on its own card. Negative control **3 of
4 failing** on 464. Scope proven both ways over 3 regions.

**Third time this session a negative control threw instead of counting a red** — `fig` is
null on the previous build and the harness dereferenced it. Guarded, same as the other two.
This is now a standing harness rule, not an incident: *every negative control must fail, not
crash.*

### The photograph half is blocked, and here is the measurement

Queried production rather than asking:

| | |
|---|---|
| `storage.buckets` | **`library` exists, is private, and holds 0 objects** — the home for library images is already provisioned and empty |
| `photos` bucket | 225 objects, 132 MB |
| `project_photos` | 236 rows, **216 with `storage_path`** |
| captions | **0 rows have one** |
| sections | 1 |
| date range | **21–30 July 2026 — a ten-day window** |

Two consequences. Nothing is captioned or categorised, so no query can pick out "the ice dam
photo". And every photo in the system was taken in **late July** — there are no winter photos
at all, so for this card specifically Cardinal's own library has nothing usable yet.

**Doc correction:** `CLAUDE.md` says zero photo objects carry `path` or `storage_path`. That
was true when it was written; **216 of 236 rows now have `storage_path`**. The migration
happened. Do not re-derive the old lesson from the doc.

---

## Build 466 — the librarian can draw, without ever emitting markup

*30 July 2026. Theo: "Can you make the ai in the resource chat add simple diagrams to the info".*

### The constraint that shaped the whole design

`lbRich()` **escapes first, then promotes** a small marker set on the already-escaped
string, and deliberately supports no links, no images and no raw HTML. That ordering is the
only reason nothing the API returns can open a tag. Letting the model emit SVG would have
thrown it away for a picture.

**So the model emits DATA and the app draws the SVG.** Four forms:

| | |
|---|---|
| `~~stack` | a layered assembly, top layer first, one per line |
| `~~flow` | ordered steps, drawn with numbered boxes and arrows |
| `~~bars <unit>` | `Label \| number` per line |
| `~~pitch 6/12` | a slope triangle — **the app computes the multiplier** |

### Two rules hold the security line, and both are load-bearing

1. **Model text lands only in a `<text>` node, never in an attribute.** `esc()` escapes
   `&`, `<`, `>` and `"` — **but not the single quote** — so an attribute is the one place
   model text could still bite. Every `aria-label` is a fixed string chosen by the diagram
   *type*, never built from its content. The patch asserts all four `lbSvg()` call sites
   pass a string literal.
2. **Every number drawn is one we parsed and clamped.** Nothing the model wrote is
   concatenated into path data or a coordinate.

And the one number a model would plausibly get wrong — the rafter multiplier — is computed
from the pitch here rather than accepted. `~~pitch 6/12` draws **1.1180** because we did the
arithmetic.

### Degradation, and why caps are refusals rather than truncations

Malformed input returns `null`, the marker line is dropped, and the remaining lines
re-dispatch through the normal rules — so a broken diagram becomes the bullet list it
already was. It does not vanish and it does not leak `~~stack`.

Over 8 rows, a `bars` row with no number, a single-row stack, an unparseable pitch, a zero
run: **all refuse to draw** rather than drawing a partial picture. Silently dropping half a
list of requirements is the failure worth avoiding here.

### The prompt rule that matters more than the grammar

`api/librarian.js` now teaches the four forms and adds: a diagram may **only restate
something the prose already says** — never introduce a fact, number or step that is not in
the text. A picture that says something the words do not is a far worse bug than no picture.
It also keeps the existing "prefer a TABLE for values that vary by one thing", and the
"do NOT use raw HTML" line survives verbatim.

### Gates

`check_build.py` green with a negative-controlled marker; `node --check` on `api/librarian.js`.

**29/29 in a real browser, against the SHIPPED source** — the harness slices `esc()` through
`lbBlock` straight out of `index.html` and executes that, rather than re-implementing it.
Five XSS payloads (`<img onerror>`, `"><svg onload>`, `<script>`, `</text><foreignObject>`,
`<style>`) were each pushed through all four diagram kinds and through plain prose, then the
output was put through `innerHTML` exactly as the app does: **zero elements created, zero
`on*` attributes, and the payload still renders as visible literal text** rather than being
silently eaten. Entity-aware truncation is asserted too — the text is already escaped at
that point, so a naive slice can cut `&amp;` in half.

**Negative control: 15 of 29 failing on 465.** Scope proven across **both files** — the
single-file proof would have routed both writes to one temp and reported a difference that
had nothing to do with scope.

### Where I was wrong — three assertions in one build, all mine

1. `aria-label="' \+` fired on the **one legitimate construction it was written to protect**.
   Replaced with the property that actually matters: every `lbSvg()` call passes a literal.
2. The replacement split the argument list on commas — **and the labels contain commas**.
3. `assert src.count('/^#{2,4}\\s+/') == 1` — that regex appears **twice** in its own rule
   (test, then replace). Hardcoded number, again; made self-computing.

All three aborted before any write, which is the patch harness working exactly as intended.

**Fourth time this session a negative control threw instead of counting a red.** It is now a
helper (`q(el, sel, prop)`) rather than another one-line patch. Standing rule, restated:
*every negative control must fail, not crash.*

---

## Build 467 — a filed photograph looks like a photograph

*31 July 2026. Theo picked "all" on the photo routes. This is the only one that was
buildable tonight, and the audit changed what it turned out to be.*

### What was already there — the prime doctrine paid again

**The `library` Supabase bucket is wired end to end and always was.** The librarian panel
uploads into it at `lib/<timestamp>_<name>` from *two* paths — the auto-filed route and the
manual "Upload into &lt;section&gt;" button — and `openItem()` already signs a URL for 3600 s.
None of that needed building.

The gap was narrower and more annoying than "photos are not supported":

> `itemHtml()` rendered a filed image as **a row with a camera emoji**, and tapping it signed
> a URL and dumped the file in **a new browser tab**.

So an uploaded photograph was a file attachment in a list. It never illustrated anything, and
you left the app to look at it.

**Measured, not inferred:** `library_items` holds 18 rows and **every one is `kind='note'`**.
No image has ever been filed — because there was nothing to see when you did.

### What shipped

1. A filed image renders a real signed thumbnail instead of an emoji.
2. Tapping it opens the **existing** zoom viewer rather than punting to a new tab.

### Reused, not invented

- **`CardinalResourceImages`** — the zoom viewer that already serves `.rl-card` and
  `.rl-article` images. This matters for more than tidiness: its `open()` writes
  `document.body.style.overflow`, one of the **13 global scroll-lock writers**. Calling the
  existing one adds no fourteenth, and the patch asserts the count did not move.
- **`createSignedUrls` (plural)** — one round trip for the whole visible list, cached for the
  session, deduped by path. The harness asserts one call for three thumbnails and no second
  call on re-render.

### Security

The signed URL comes from Supabase, never from a model, and is assigned as a **DOM property**
(`img.src = url`) rather than concatenated into markup. The only DB text reaching an
attribute is the title in `alt=""`, and `esc()` escapes the double quote — the character that
matters there. Both a quote-laden title and a quote-laden `file_path` are asserted unable to
break out.

### Degradation

No `supa`, a rejected signing call, or a path that will not sign: the thumbnail stays blank
and the row still opens the file the old way. A photo that cannot be signed is never a broken
library page.

### Gates

`check_build.py` green with a negative-controlled marker. **26/26 in a real browser** against
the shipped `itemHtml` / `lbSignImages` sliced out of `index.html`, driven with a mocked
storage client — the only way to exercise this before anything is uploaded. Negative control
fails at the slice on 466. Scope proven both ways over 6 regions.

### Where I was wrong — the same mistake three more times

Three assertions in this build fired, **all hardcoded counts**, all against a rule this
project's own doc states plainly ("prefer self-computing assertions over hardcoded numbers"):

1. `count('function itemHtml(i){') == 1` — there are **two**; the other is in `cr-pp-script`.
   **Three modules define `itemHtml`**: pricing (`itemHtml(it)`), punch and the library. The
   anchor used the full function body so it patched the right one, but the check was wrong.
2. `count('data-lb-img') == 4` — it is **6**.
3. (466 carried three more of the same class.)

Replaced with properties rather than tallies: no `itemHtml` appeared or vanished, exactly one
gained the image branch, and that one sits inside `cr-lib-script`. **Eight hardcoded-count
assertions across builds 466–467.** Every one aborted before a write, so the artifact was
never at risk — but the pattern is mine and it is documented as a known trap.

### Still blocked

Routes 2 and 3 need files from outside the app. The only images in the system are 225 objects
in `photos`, all taken **21–30 July**; `library_items` has none. There are no winter
photographs to find.

---

## Build 468 — CompanyCam import (31 July 2026)

**The photo drought is over.** Every route to library photographs was blocked on the same fact:
there is no source material. `project_photos` holds 236 rows, **zero captioned**, all shot
21–30 July. No winter photographs exist in Supabase, so "show me an ice dam" could not be
answered from what we had. CompanyCam holds years of Cardinal's own job photos **and carries a
caption on each one** — `description`, measured against the live account, not assumed.

### `api/companycam.js` — read-only, admin-only

Lists photos, lists the tag vocabulary, fetches the bytes of one chosen photo. It never writes to
CompanyCam and offers no endpoint that could. Three refusals are the actual product:

1. **`internal: true` photos are never returned.** CompanyCam's own privacy flag — *"should not be
   used in marketing or other public materials."* Whoever took the photo made that call. Filtered
   in **both** list and fetch, so an id learned elsewhere cannot walk around the list.
2. **`fetch` takes a photo ID, never a URL.** The server re-reads the photo and picks the
   rendition itself. Taking a URL from the caller would make this an open proxy for anything the
   Vercel box can reach.
3. **The key never leaves in a response**, and is scrubbed from every error body before echoing.

It also returns only what the Library needs — no coordinates, no hash, no `company_id`. A
reference photo does not need the customer's latitude and longitude in a second system.

**The unknown date format cannot break it.** The route tries the server-side filter and, on a
422, drops the dates and filters on `captured_at` itself. Slower, never wrong, and a gap in the
spec is not a broken feature.

**Renditions prefer `web_annotation` over `web`** — the crew's marked-up copy. An ice dam with an
arrow drawn at it is teaching material in a way the raw frame is not.

### The panel — filter, then pick (Theo's call, option 3 of 3)

Narrow by tag and date, tick what is worth keeping, file it. **There is deliberately no "import
everything" button**; these are customers' houses.

**It invents no pipeline.** Imported photos go through the *same* `library` bucket upload and the
*same* `library_items` insert as the manual route, with the same column set — so they render
through build 467's thumbnail work with nothing added. `fillWhere()` was **generalised, not
cloned**, to serve the second section select: one call site existed and passes nothing, so the
default keeps it working untouched.

### Gates

`check_build.py` green with the negative control. **42 jsdom assertions** executing the shipped
slice, and **40 assertions + 6 negative controls** on the route against a mocked CompanyCam.
Replay onto a fresh 467 reproduces the file byte-for-byte (sha256 `23ff252e…`).

### Two harness defects found by the controls, both mine

1. **A control passed against a broken build.** `fillWhere` was *shimmed* in the harness instead
   of sliced from the file, so breaking the shipped one changed nothing. That assertion was
   validating fiction — exactly the trap `gates.md` warns about. Now sliced and executed.
2. **Controls crashed instead of failing.** Breaking `fillWhere` empties the section select, so
   `ccSave` bails and `uploaded[0]` is undefined — the run threw and printed no verdict at all.
   Null-safe reads added. **Standing rule, now twice-learned: a negative control must fail, not
   crash.**

---

## Build 469 — the CompanyCam button was wired to the wrong element (31 July 2026)

**My regression, shipped in 468 and live for minutes.** The button did nothing when tapped.

The five `[data-cc-*]` click delegates went onto **`v`, the library view**, because I anchored
them beside the `[data-lb-open]` delegate without checking what that listener was bound to.
`data-lb-open` is on library item rows, which render *inside the page*. The CompanyCam button is
in the **panel** — and the panel is `document.body.appendChild(p)`, a **sibling** of `v`, not a
descendant. The click never reached the handler.

The panel has had its own click listener the whole time, forty lines earlier in the same
function. That is where all five belong; every `[data-cc-*]` control lives in the panel.

### Why 42 green assertions missed it

**The harness called `ccOpen()` directly.** It proved the functions work and never proved that
anything reaches them — a fully tested feature with no route in. `gates.md` says *navigate the
way the app navigates*; I asserted on the functions instead of on the wiring, and the gate was
green on a button that did nothing.

`cc469_harness.js` never calls a cc function by name. It builds the panel from the **shipped**
builder, attaches the **shipped** listener, dispatches real `MouseEvent`s and asserts on what
gets reached. It **fails on 468** — `clicked -> []`, the click fires and reaches nothing — and
passes on 469. That is a negative control against a real shipped defect rather than a synthetic
one, which makes it the more valuable half of this build.

**The lesson generalises past this bug:** a delegate's anchor tells you nothing about its host.
Before adding to one, find its `addEventListener` and confirm the element you are targeting is
actually inside it. Proximity in the file is not containment in the DOM.

---

## Build 470 — the import panel's controls were unstyled (31 July 2026)

**Same root cause as 469, one layer up.** 469 was a delegate on the wrong element; 470 is a class
under the wrong ancestor. Both times I checked that a name existed and not **where it applied.**

Every form rule in this panel is written `#rlLibPanel .lb-form …`. My block is `.lb-cc`. So:

- `.row` had no `display:flex` → **"CancelFind photos" ran together as one string**, which is
  exactly what Theo reported
- labels had no styling → bare text
- selects had no styling → unstyled native dropdown
- the date inputs matched **nothing at all**: the rule covers `input[type=text]`, and mine are
  `input[type=date]`

**Extended, not duplicated.** Each rule gained a `.lb-cc` twin selector rather than a copied block
under a new prefix. A second block of near-identical form CSS is an override layer with a delay on
it; retail-B was torn out at 21 override rules for exactly this.

### The render caught a bug the assertions did not

With the label rule extended, **every photo caption went uppercase and letter-spaced** — because
the tiles are `<label class="lb-ccp">` elements and picked up form-label styling. The layout
harness was 15/15 green while it happened. **Screenshotting the panel is what found it**, which is
the "preview visual changes" doctrine paying for itself. Fixed with `label:not(.lb-ccp)` plus an
explicit `text-transform:none` on `.cap`/`.meta`, and the patch now asserts that no bare
`.lb-cc label` rule exists.

### The gate this build adds

`cc470_harness.js` measures **computed layout** in Chromium at a 390px viewport — `display`,
bounding boxes, the real gap between the two buttons, border radius, and that nothing exceeds the
phone width. No behavioural harness can see a CSS-scope bug; 469 was green on every existing gate
while rendering wrong.

**It fails 7/15 on 469**, including `0px gap` and 21px-tall bare-text buttons — the reported
symptom, reproduced mechanically.

**One trap worth recording:** the first run measured every box at **0px**, because `#rlLibPanel` is
`display:none` until `.on` and the harness never added it. Computed *styles* resolve on hidden
elements; *boxes* do not. Show the element before measuring it, or the numbers are fiction.

### Two self-inflicted aborts, both caught before any write

1. `assert src.count('input[type=date]') == 2` — the file **already had two**, in the estimates and
   punch styles. Replaced with a delta against `orig`. **A hardcoded count read off nothing is the
   most repeated error on this project and I made it again.**
2. A patch anchor with two leading spaces where the file has one.

---

## Build 471 — ask the librarian for photographs (31 July 2026)

**A fence moved, on Theo's explicit instruction.** `CLAUDE.md` had the librarian fenced off from
photos entirely. I put the constraint in front of him with three options; he chose the one that
lifts it. The docs moved with the code — a `CLAUDE.md` that still said *"must never be pointed at
them"* would have had the next session undo this.

**What is still fenced:** clients, inspections, job paperwork, Company Documents. What changed is
that asking to *see a roof* is now in scope.

### The model never receives a photograph

It writes a **search** — `~~photos tag=Ice Dam from=… to=…` — and nothing else. `index.html` runs
that through `api/companycam.js` **after** the answer comes back, so no image, caption or project
can reach Gemini even in principle. The route is admin-only and refuses `internal` photos, so the
chat cannot surface anything the panel would not.

### It is 466's convention, not a new one

`~~photos` joins the same regex, the same `lbBlock` dispatch, the same marker family as
`~~stack` / `~~flow` / `~~bars` / `~~pitch`. A new mechanism beside an existing one is a bug with a
delay on it.

Two adaptations were needed:

- **Async inside a synchronous renderer.** `lbRich` builds a string. So `~~photos` emits an empty
  container carrying its query in data attributes and `lbFillPhotos()` fills it once the message is
  in the DOM — the shape 467 used for signed thumbnails.
- **No junk notes.** `askQuestion` **files every answer as a library note.** "Show me ice dam
  photos" is a lookup, not reference material, so an answer containing `~~photos` renders and is
  never inserted.

### Tag names, not ids — and it fails CLOSED

A model cannot know that "Ice Dam" is tag 4471, so the route resolves names server-side. **An
unknown name returns nothing rather than everything**: a filter that failed open would answer one
misspelt word with every photograph Cardinal has ever taken.

### Two defects my own harness caught, one of which passed first

1. **An assertion containing `|| true`** — it could not fail. That is not a test, and `gates.md`'s
   "print honest labels" rule covers exactly this.
2. **Behind it, a real bug.** `tag=Ice Dam` unquoted parsed as **"Ice"**, and *the prompt's own
   example is unquoted* — so the shipped feature would have searched for the wrong tag on its most
   likely input. The parser now runs each value to the next key or end of line. The `D_greedy_lost`
   control reproduces it.

**Third hardcoded-count abort of the night** (`count('lbFillPhotos') == 3`). Replaced with property
assertions. The count is never the thing I actually mean.

---

## Build 472 — search photographs by caption, not by tag (31 July 2026)

**Theo's correction, and it reframes 471.** The tags on the account are his own and he says he has
not used them consistently — *which is exactly why he asked whether the AI could pick photos out by
description in the first place.* Tag filtering was answering a question he had not asked. `q=` is
now the primary filter and the prompt says so; `tag=` is a last resort.

**The API cannot do this.** The photo index takes eleven parameters and **none of them is a
query** — there is no text search to call. So matching happens in `api/companycam.js`, which pages
through captions with a hard cap of **8 pages / 800 photos** and stops the moment it has enough.
No rate-limit headers come back, so politeness has to be structural rather than adaptive.

**It reports how far it got.** Every search returns `scanned / pages / captioned / capped`, and the
empty state says so out loud: *"Nothing matching 'unicorn' in 800 photographs · only 96 of them
have a caption to search · stopped at 8 pages."* A search that quietly gave up after one page and
said "nothing found" would be worse than no search.

**`captioned` is the number that matters next.** If most photos carry no caption, no amount of text
matching will help, and the first real search will say so rather than leaving us to guess. That
measurement decides whether the next step is worth building — see OPEN_ITEMS.

Ranking is deliberately dumb: whole-phrase hit first, then how many query words appear. A caption
is one short line; anything cleverer would be guessing.

---

## Build 473 — a searchable index of all 61,649 CompanyCam photos (31 July 2026)

**The number changed the design.** `/api/companycam-status?include_total=true` returned
**`total_photos_in_account: 61,649`** — and closed the `include_total` unknown at the same time.

472's caption search reads at most 800 photos. Against 61,649 that is **1.3% of the account**: a
photo from last winter could never be found however it was worded, and the honest empty state
would have said *"nothing in 800 photographs"* while never getting near it.

**Paging harder is not the fix** — the v1 API has no text search at all. So the metadata is
mirrored into Postgres (`companycam_index.sql`, already applied) and searched there. One indexed
query over everything, instead of eight round trips over the most recent fraction.

### Costed from measurements, not guesses

| | |
|---|---|
| Pages to fill | **617** (61,649 ÷ 100) |
| Wall clock at the measured 707ms/page | **~7 minutes** |
| Gemini calls | **zero** |
| Per-search cost afterwards | one Postgres query |

### Resumable because it has to be

617 pages is longer than any serverless function may run, so the route does **six pages a call**
and returns a cursor; the panel loops. A closed tab, a redeploy or a timeout costs one batch, and
pressing the button again **resumes from the stored cursor** rather than restarting.

The harness proves the properties that actually matter: the loop terminates, carries the cursor
forward, sends none on the first call so the route resumes stored state, **and cannot be started
three times at once** — a runaway loop here is 617 real API calls.

### The index refuses what the route refuses

`internal: true`, non-active and unprocessed photos are never written. Otherwise the mirror would
become a way around the privacy flag. No coordinates are stored either — a searchable index does
not need the customer's latitude and longitude.

### Search switches itself

`api/companycam.js` queries the index when it has rows and falls through to the live API when it
does not, so this works before the first sync and if the table is ever emptied. The panel needed
no knowledge of which path ran; results say `indexed` rather than `searched` when they came from
Postgres.

**RLS:** admins read, and only the service role writes. There are deliberately **no**
insert/update/delete policies — absent policies deny, so no browser session can forge a row.

### Fourth and fifth hardcoded-count aborts of the night

`count('ccSyncing = false') == 2` caught the `var ccSyncing = false` declaration too, and
`count('data-cc-sync') == 2` missed the third site that disables the button. Both replaced by
naming the sites. **Five aborts in one session from the same habit** — every one caught before a
write, but the pattern is mine and it is now the most-repeated entry in this log.

---

## Build 474 — `/api/config` exists, and a failed fetch stops being permanent (31 July 2026)

**CLAUDE.md understated this one.** It recorded `/api/config` as missing with "Google Maps address
autocomplete is silently off." The route is genuinely absent — no `api/config.js`, and `vercel.json`
holds only the digest cron, no rewrite — but the blast radius is **the whole `cr-gmap-script`
module**, because every consumer short-circuits on the empty key:

| Consumer | With no key |
|---|---|
| `loadMaps()` | throws `'no google maps key configured'` — **autocomplete never attaches** |
| `staticMapUrl()` | returns `''` — **the satellite property photo is blank** |
| `insertMap()` | returns before building the block — **takes Directions and View-on-Maps with it**, though neither needs a key |

It degrades cleanly and warns only to the console, which is exactly why it survived this long.

**Not verified against production** — outbound to `app.cardinalroster.com` is blocked by this
environment's network policy. The finding is from the repo: no file, no rewrite, and Vercel serves
`/api/*` from `api/` only. A dashboard-level rewrite outside the repo would falsify it.

### The route is deliberately not behind the signed-in gate

A Maps **browser** key cannot be secret — the JS API loads by putting the key in a `<script src>`,
so any user who sees a map can read it. **HTTP referrer restriction is the control, not secrecy.**

Gating would also have hit a real trap: `loadConfig()` memoises its promise *including rejections*,
so a 401 from a pre-sign-in call would cache `API_KEY = ''` for the whole session and maps would
stay dead after signing in.

> **The key must be referrer-restricted in Google Cloud before `GOOGLE_MAPS_API_KEY` is set.**
> Unset env var → empty key → byte-identical to today's behaviour, so shipping cannot regress.

### The memoisation defect the route exposed

Harmless while the route was permanently missing; **not** harmless once it exists. One failed
fetch — cold start, deploy in flight, dropped signal — killed maps until the tab was reloaded, and
a fresh deploy is precisely when cold starts happen.

**A plain retry would have been worse.** `attachAutocomplete()` resets `crAutocomplete` to `''` on
failure, so the input retries on the next `scan()`, and `scan()` fires on DOM changes — unfloored,
that is one fetch per input per scan. The 30s floor is checked **before** the memo is rebuilt, so
while broken the retry path costs **zero** network. Harness proves it: 25 retries inside the floor,
0 requests.

### The red was the test's fault, again

`loadMaps` "still rejected" after a successful retry — because it ends by loading the real Google
script, which no sandbox can reach. The assertion was testing the network, not the fix. Corrected to
assert the observable thing: the retry **appended the script tag carrying the key**, which a
replayed rejection could never reach. Roughly half of all reds on this project are the test's fault
and this was one.

**Sixth hardcoded-count abort of the night** — `count('configPromise = null;')` also matched its own
`var` declaration. Six in one session, one root cause, every one caught before a write.

---

## Audit (no build) — the `.single()` backlog does not exist (31 July 2026)

CLAUDE.md carried this as an invariant: *"`.single()` throws on zero rows — there are 43 of them
against only 4 `.maybeSingle()`; use `.maybeSingle()` wherever absence is legal."* Read together
that is a **43-site migration backlog**. Audited it before doing the work. **Both halves are wrong.**

### Verified against the shipped client source, not from memory

| Claim | Reality |
|---|---|
| `.single()` throws on zero rows | **No.** `single()` only sets `Accept: application/vnd.pgrst.object+json`; PostgREST answers 406 / `PGRST116`, and the client does `if (error && this.shouldThrowOnError) throw` — otherwise it **returns** `{data:null, error}` |
| …so the app is at risk | **`throwOnError` appears 0 times in this repo.** `.single()` never throws here |
| 43 sites need migrating | **All 43 guard.** Zero raw dereferences |

`maybeSingle()` sets **no** Accept header — it fetches a list and enforces cardinality client-side,
so zero rows give `{data:null, error:null}` with no error to filter.

**The real hazard** is `const { data } = await ….single()` then `data.foo` — a `TypeError` when the
row is absent. Every one of the 43 guards: `if (error || !data)`, `if (!claim) return`,
`est?.project_id`, `r.data &&`, `if (claimRes.error) return null`.

### Two process notes

**A keyword heuristic flagged 5 sites as unguarded; all 5 were false positives.** They guard by
null-check rather than by the words `error`/`try`/`catch` the regex searched for. Reading them was
what turned a 5-item bug list into a 0-item one — the file's own rule about printing what the
extractor captured, applied to a different kind of extractor.

**An empirical probe was attempted first and did not work.** Installing `@supabase/supabase-js` and
querying a non-existent row returned `Host not in allowlist` — the agent proxy blocked the Supabase
host, so the result proved nothing about zero rows and was discarded rather than reported. Reading
the library's own source was the verification that actually held.

**Outcome: do not open the `.maybeSingle()` migration.** Prefer it in new code where absence is
expected — not for safety, but because `.single()` manufactures an error the caller must then tell
apart from a real failure. Counts now **43 / 5**.

---

## `sw.js` — static assets self-heal; the CDN stays frozen on purpose (31 July 2026)

**No build number: `index.html` is untouched.** Only `sw.js` changed, so nothing owed the app stamp.

CLAUDE.md makes four claims about this file. **All four check out** — network-first navigations,
Supabase and `/api/*` never cached, static assets cache-first with no revalidation, and
`CACHE = 'cardinal-shell-v1'` never bumped. No false alarm here; the file's own header said *"Bump
CACHE on each deploy"* and it has been `v1` since it was written.

**The rule was never going to hold.** Theo deploys from a phone through the GitHub web UI. A manual
cache-name edit on every deploy is not a process, it is a wish. So the fix is self-healing rather
than a louder reminder: **same-origin assets are now stale-while-revalidate** — the cached copy is
returned at exactly the speed it always was, then refreshed behind the response, so a changed icon
or `manifest.json` reaches people on the next load instead of never.

### The CDN deliberately did NOT change

`index.html` loads supabase-js@2, chart.js and papaparse from a CDN with a **floating major**.
Revalidating those would quietly move every user onto a new minor of a dependency this app has **no
test runner** to catch. Cache-first-forever is the nearest thing to a lockfile an app with no build
step gets, so cross-origin hits still return with **zero** network calls. That is now stated in the
file so the next reader does not "finish the job".

### Second test-fault red of the night

The offline-navigation assertion failed first run: the cached shell was not found. **The mock was
wrong, not the worker.** The real Cache API resolves a relative key against the worker scope, so
`caches.put('/', …)` and `caches.match('/')` both land on `ORIGIN + '/'`; a mock keyed on the raw
string missed it and made a correct fallback look broken. Normalising the mock to spec behaviour
turned it green — and the same normalisation is what makes the test meaningful at all.

12/12: passthrough for Supabase and `/api/*`, network-first navigations, offline shell fallback,
instant stale response, background refill, frozen CDN, cache miss, and an offline revalidation that
does not become an unhandled rejection.

---

## Build 475 — milestone pill legibility, option C (31 July 2026)

Theo picked C from a preview of four, drawn with the shipped CSS on the app's own grounds.

### The measurement, and the correction that came with it

The pill label is `font:800 10.5px` uppercase — **small text, so 4.5:1 applies.** Ink came from one
token, `--rbe-mpill-fg`, flipped per theme: `#15171b` dark, `#ffffff` light.

**An earlier report of "6 of 8 fail" was the light theme only** — read from one token and
generalised. Both themes fail, on different stages:

| | dark `#15171b` | light `#ffffff` |
|---|---:|---:|
| below 4.5:1 | **4 of 8** | **6 of 8** |

The two inks are near-opposites, so each covers what the other misses — **except Invoiced
(`#8E6BC1`, 4.29/4.18) and Closed (`#607D8B`, 4.10/4.37)**, mid-luminance and failing both ways.
Ink alone cannot save those two.

### What shipped

1. **Ink is chosen per stage, not per theme** — same ink in both, because the pill's ground is the
   stage colour, not the page.
2. **Two colours nudged**: Invoiced **3.5% lighter** (`#9170c3`), Closed **1.6% darker**
   (`#5e7b88`). Both near-invisible.

**16 of 16 pass**, 4.50–6.39. Gate computes this from the *shipped* `LJ_SOLID` / `LJ_INK`, so a
typo in either map goes red here rather than in Theo's hand.

### The scope trap this build had to dodge

`Invoiced:'#8E6BC1'` and `Closed:'#607D8B'` each appear **twice** — once in `LJ_SOLID` (Library
board) and once in **`STAGE_COLORS`** (CRM pipeline chips, which carry different Lead/Prospect/
Approved values). A find-and-replace on either value would have restyled the pipeline. Every anchor
is bound to the `LJ_SOLID` literal, unique because it carries `Lead:'#8a93a1'`, and the gate
**asserts both original values still appear exactly once** in `STAGE_COLORS`.

### Mechanism follows the module's own convention

The card already publishes per-stage colour as inline custom properties (`--spn`, `--slc`). Ink
joins as **`--sli`**, and `.ljmc` reads `var(--sli, var(--rbe-mpill-fg))` — unset falls back to
exactly today. The detail pill already set `background` inline, so it takes `color` the same way.
**No new mechanism beside an existing one.**

`OnHold` is in neither map and never was; it takes the literal defaults, which is correct while it
still has no writer.

### Rejected, with numbers

- **A — ink only.** Leaves Invoiced 4.29 and Closed 4.37 short.
- **B — pale tint + `STAGE_INK`.** Clears everything (4.69–7.31) but turns a solid-colour board
  pale. Theo looked at it and chose C.
- **Darken every solid.** Would have moved the green and blue 22–23%; C moves two colours by 2–4%.

---

## Build 476 — the caption search had nothing to search (31 July 2026)

**The first full sync is the most useful thing that happened all night, and it invalidated a
feature I had just built.**

| | |
|---|---:|
| Photos indexed | **60,485** |
| Skipped (internal / inactive / unprocessed) | 1,164 |
| **Reconciles to** | **61,649** exactly |
| **Carrying a caption** | **79** |
| Without | **60,406 — 99.87%** |

Not a recent habit: **10** captions in 2026, **39** in 2025, **30** in 2024, **zero** before.
Nobody has ever captioned in CompanyCam.

**So 472's caption search was built over a field this account does not fill in.** That measurement
was one query away and should have come *before* the build, not after. The index still earns its
place — but not for the reason it was built.

### What is actually populated, on all 60,485

`project_id`, `creator_name`, `captured_at` — **100%**, across **775 distinct jobs**. The index
knew which project each photo belonged to and not what that project was **called**, so a search for
"Habitat" matched nothing while every row carried the answer.

476 syncs the 775 names and searches them. **No AI, ~8 pages, one call.**

- `companycam_projects` table + `project_name` / `project_address` on the photo, denormalised so
  search stays single-table.
- The FTS index was **caption-only** — it could match at most 79 rows. It now covers caption,
  project name, project address and creator in one GIN index.
- `companycam_backfill_project_names()` stamps names in **one statement**, and only where the value
  actually differs, so a re-run after a rename is cheap rather than a 60k rewrite.
- The panel runs photos first, then projects — the backfill can only stamp rows that already exist,
  and the harness now **asserts that ordering**.

### The status line stopped leading with the caption gap

It read `60,406 with no caption`. That is a to-do list nobody can action. It now reports what makes
the index usable: how many jobs it knows, and whether every photo carries one.

**The old assertion for that line went red, and the test was what was wrong** — it was asserting
removed behaviour. Updated to the new intent rather than bent back.

### A bug the data exposed

**`annotated` is `true` for all 60,485 rows.** CompanyCam returns a `web_annotation` URI whether or
not anyone drew on the photo, so `web.type === 'web_annotation'` is always true and the flag is
meaningless. **Not fixed in this build** — filed, because it needs a different signal from the API
and no caller depends on it yet.

**Seventh hardcoded-count abort:** `count('photos_with_project_name') == 1` — it appears twice on
one line, in `typeof d.X === 'number' ? d.X : null`. Caught before the write, like the other six.

---

## Build 477 — the indexing counter counted past the number of photos that exist (31 July 2026)

Theo's screenshot read **`Indexing… 87,096 of 61,649 photos`**, still climbing.

The sync is resumable: the panel calls the route repeatedly, six pages a call, passing the cursor
back. `status` was accumulating `synced` across calls — correct — but a run that *starts over* has
no cursor and must start its counters at zero too. It didn't, so a second full run added its count
to the first.

```js
/* Only the FIRST call of a run can be fresh. */
const freshRun = !cursor;
…
synced: (freshRun ? 0 : (prev.synced || 0)) + wrote,
```

Belt and braces in the panel, because a stored counter from before this fix would still read high:

```js
var shown = (total && done > total) ? total : done;
```

**The negative control rejected `var shown =` as a marker** — four occurrences already existed in
475. The gate was right; the marker was lazy. Re-run with the whole assignment.

## Build 478 — try AI captions on 50 photographs before spending on 60,406 (31 July 2026)

The index proved only 79 of 60,485 photos carry a caption. Captioning the rest means sending
customers' job photographs to Google, which is **not a decision to make on Theo's behalf** — so this
ships the trial, not the backfill: one button, 50 photographs, `action:'sample_captions'`, and the
captions read back to him before anything is written at scale.

## Builds 479–480 — the CompanyCam panel was a dead end (31 July 2026)

Two things Theo hit immediately. The ask box was hidden whenever the CompanyCam block was open
(`.lb-acts{display:none}` with no way back), and there was no way to see a photograph larger than a
thumbnail. 479 restored the ask line and renamed "Cancel" to "← Back to chat". 480 added a corner
expand button that reuses `window.CardinalResourceImages`, with **both `preventDefault()` and
`stopPropagation()`** — the tile is a `<label>` wrapping a checkbox, so an unstopped click would
also tick the photo for filing.

## Build 481 — save ticked CompanyCam photographs to the phone (31 July 2026)

"Can you make pictures selected downloadable?" Everything needed already existed and was wired
together rather than re-invented:

| Piece | Already there since |
|---|---|
| the ticked set (`data-cc-id` + checkbox) | 468 |
| the bytes (`action:'fetch'`, base64, our origin) | 468 |
| share-sheet-then-anchors | 216, in the job gallery |

`ccPicked()` is now the one reader of the selection, called by both filing and saving, so they
cannot disagree about what is ticked. **The ticks are deliberately left set** after a device save —
saving a set and then filing the same set is a reasonable thing to want. `AbortError` from
dismissing the iOS share sheet is the user's own choice and is not reported as a failure.

## Build 482 — draw on a CompanyCam photograph (31 July 2026)

"Can you make the pictures editable?" **The editor already existed** — `cr-ped-script`: pen, arrow,
circle, text, rotate left/right, undo, clear, six colours, stroke width scaled to the image. It has
been on the job-photo caption modal's "✏️ Edit" button for a long time. It was simply unreachable
from CompanyCam, and its `save()` writes to `project_photos`, a table a CompanyCam photograph has no
row in. **Seventh "missing feature" on this project that was a mounting problem.**

Two additive changes:

1. **`open(p, opts)`.** `opts.onSave` takes the encoded blob and the editor's own two Supabase
   branches never run; `opts.extra` adds one header button. Both default absent, so `open(photo)`
   from the job modal is unchanged — proved by executing the shipped module against a recording
   Supabase stub.
2. **The bytes come through our own route.** Painting a CompanyCam CDN URL into a canvas **taints**
   it, and `canvas.toBlob()` then throws `SecurityError` — the markup would draw perfectly and fail
   only at save, which is the worst possible place to find out. `ccEdit()` fetches base64 through
   `api/companycam.js` and hands the editor a `data:` URL.

A marked-up photo goes to the Library section chosen in "Put them in", or to the phone through
481's share sheet. **The CompanyCam original is never written to** — nothing in this app holds a
CompanyCam write scope, and the editor is handed a copy.

`ccDeliver()` and `ccFileBlob()` were lifted out of `ccDownload()` and `ccSave()` so the original
and the marked-up copy take the identical path in each case.

### The lesson of this build: a rule can be present, parse, balance, and never apply

481 added `.lb-ccfile button.ghost` **unprefixed**. Every other rule in `cr-lib-styles` is scoped to
`#rlLibPanel`, and `#rlLibPanel .lb-ccfile button` (id+class+type) out-specifies a bare
`.lb-ccfile button.ghost`. Measured in a real engine, "Save to device" and "File selected" **both
computed `rgb(196,24,15)`** — two identical solid red buttons stacked.

`check_build.py` cannot see this. jsdom cannot see this. **`getComputedStyle` in a real browser
can**, and is now a standing gate (`css482_harness.js`). Caught by this build's own scope diff and
fixed before merge. Corrected beside it: `.lb-ccz`'s focus ring read `var(--lb-ac,…)` and
**`--lb-ac` is declared zero times in this file** — the token is `--lb-accent`.

**Eighth and ninth hardcoded-anchor aborts**, both caught before any write: `canvasBlob(0.9)` stopped
being unique because the `extra()` function *this same patch* added encodes the same way (re-anchored
on the line only `save()` has); and the marker `data-cc-edit` failed the negative control because
Community's `data-cc-editbid` already contains it. Attribute *selectors* match whole names, so
`[data-cc-edit]` does not collide — but the marker did, and the gate was right.

**Namespace hazard worth knowing:** `cc-` means **CompanyCam** inside `cr-lib-script` and
**Community** elsewhere in the file. Grep the block, not the prefix.

## Build 483 — the librarian sheet was cut off at the bottom of the phone (31 July 2026)

Theo: *"move the ai librarian box further up the screen so it doesnt get cut off at the bottom."*

`#rlLibPanel` is a bottom sheet — `inset:0` with `align-items:flex-end` — so `.lb-box`'s bottom edge
sits on the bottom of the layout viewport, which on an iPhone is **under the home indicator**.
`.lb-box` carried **no bottom inset at all**, so its last rows (the ask input, the note under it)
were the part being eaten.

**The panel was the exception, not a new problem.** Every other fixed overlay in this file already
reserves the inset — `.cr-ped-tools`, `.cr-est-body`, `#cr-est-picker .box-list` — and
`#cr-est-picker .box` already carries the height convention:

```css
max-height:85vh; max-height:85dvh;
```

`vh` on mobile means the viewport with browser chrome **hidden**, so a sheet sized in `vh` is taller
than what is on screen. `dvh` is correct; declaring `vh` first keeps an old engine working. Both
copied verbatim rather than invented.

Three declarations on `.lb-box`: `padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))`,
`max-height:88dvh` after the existing `88vh`, and an explicit `box-sizing:border-box`.

**Correction, so it is not miscredited:** `box-sizing` was **already** `border-box` via one of the
file's 14 wildcard resets — the harness measured 482 at `border-box` too. Explicit is belt-and-braces
so the sheet's height cannot come to depend on which reset reaches it. **It is not a fix.**

**Deliberately not done:** the sheet is not lifted into a floating card. Its corners are rounded
top-only, so a gap beneath it would show the scrim through a square bottom edge and read as a bug.

**What the harness can and cannot say.** 11/11 in a real engine at 393×852 using the *shipped* panel
markup and stylesheet, negative-controlled against 482 (which measured **0px** reserved, so the
defect reproduces). But **headless Chromium has no home indicator, so `env(safe-area-inset-bottom)`
resolves to its `0px` fallback there.** It proves the strip is reserved and that content clears it.
It cannot prove the 34px iOS inset lands. That is Theo's eyes, and the PR said so.

## Build 484 — read the job names first, not after seven minutes of photos (31 July 2026)

Theo pressed Build index and reported `60,485 photos indexed of 61,649 · 0 jobs · 0 searchable by job`.

**Measured against the live database rather than guessed:**

| | |
|---|---:|
| `companycam_photos` | 60,485 |
| …with `project_id` | 60,485 |
| distinct `project_id` | 775 |
| **`companycam_projects` rows** | **0** |
| …with `project_name` | 0 |
| backfill function | exists |

**The route was fine and the panel was fine.** The project pass only fires at the **tail** of a Build
index press, and 476 shipped after his last one. The status line was honest.

**The fix is the ORDER, not the code.** 476 put projects last with this reasoning:

> *"Projects second, and only after the photos land — the backfill stamps names onto rows that must
> already exist."*

True on a first sync. **Wrong once 60,485 rows exist**: then the names are the only thing missing,
they are ~8 pages against 617, and going last means waiting seven minutes to fix a fifteen-second
problem — seven minutes spent re-walking photos already indexed.

484 runs **names → photos → stamp**. Names first so the search works in seconds and the status line
updates before the long pass. Photos unchanged. Then a stamp, because photos *this run added* have
no name yet — the names are in the table by then, so it is one `UPDATE` and no second trip to
CompanyCam (`action:'stamp'`, admin-gated like every other action).

`stampNames()` extracted so the backfill RPC has **one** implementation with two callers. The RPC
name now appears exactly once in the route, asserted.

**Failure policy, asserted in the harness:** a failed *name* pass must **not** stop the photo index —
the photos are the expensive half and are useful alone, so it reports and carries on. A failed
*stamp* must not report the whole press as failed. A failed *photo* pass still reports, exactly as
before.

Harnesses: ordering **21/21** driving the shipped `ccSync()` and asserting the exact call sequence
(`projects, photos:start, photos:c1, stamp` — four calls, no duplicated pass), all four failure
paths and the double-press guard; route **7/7** importing the shipped handler with `fetch` stubbed.

## Build 485 — the caption trial was not a sample (31 July 2026)

478 shipped a 50-photo AI caption trial so Theo could judge the captions before spending on 60,406.
Its sampler carried this comment:

> *"A spread, not the newest 50: order by id so the sample crosses years, crews and job types rather
> than sampling one week of one roof."*

**The first real run produced the exact opposite**, measured against the live index:

| | |
|---|---:|
| photos captioned | 53 |
| **distinct jobs** | **1** |
| distinct crews | 1 |
| date range | 2023-12-19 … 2023-12-20 |
| index spans | 2007-03-29 … 2026-07-30 |

**`order by id asc` is not a shuffle.** CompanyCam ids sort near creation order, so it took the
*oldest* rows — 53 photographs of one water-damaged house over two days. It sampled precisely the
"one week of one roof" its own comment promised to avoid, and it showed: **26 of the 53** were
variants of *"water staining indicating an active roof leak"* — true of that house, silent about the
other 60,432.

**The captions themselves were good** ("hip cap shingle", "roof-to-wall transition", "sealant line",
"roof valley"). The model is not the problem. The sample was, and it was mine.

### The fix is in SQL

`companycam_caption_sample(n)` — one photo from each of n **different** jobs:

- `distinct on (project_id)` → at most one row per job;
- `not exists (… ai_description is not null)` → **a job with any caption is excluded outright.**
  This is load-bearing. Without it each six-photo batch re-picks the same handful of jobs and merely
  chooses a *different photo* from them, so 50 photos would come from 6 roofs;
- `order by md5(id)` → a **stable** pseudo-random spread. Re-running picks the SAME jobs rather than
  spending on a fresh set — the one thing 478 got right, preserved;
- newest photo per job, because later photographs show conditions rather than arrival shots.

Verified before a line of the patch was written: **50 photos · 50 jobs · 5 crews ·
2024-04-30 … 2026-07-30 · zero rows from the one already-captioned job.**

Both functions are `SECURITY DEFINER`, revoked from `anon`/`authenticated` and granted only to
`service_role` — matching `companycam_backfill_project_names`, which was already locked that way.
They bypass RLS, so a signed-in non-admin must not be able to read preview urls out of the mirror.

### Progress is counted in JOBS now

53 photos of one roof is **one** data point. Counting it as 53 is exactly how the first trial
reported itself finished while having proved nothing. `captioned` is kept as an alias of `jobs` so a
panel already on the phone cannot read `undefined` if the route deploys ahead of `index.html`.

`rpc()` extracted — all three Postgres functions go through one caller; asserted that zero
hand-rolled RPC fetches remain. Still writes `ai_description` only; the harness asserts `description`
never appears in a PATCH body.

### Three aborts on one assertion, all the same mistake

`src.count('different jobs')` failed three times, each for a different reason: the **changelog** this
patch adds says it, the **build label** this patch adds says it, and it was **already in the file**,
in a Library entry about drip edge vs apron (*"Different profiles, different jobs"*). The site
assertion beside it — `count("' different jobs' +") == 1` — was right the first time. **Name the
site; never count the phrase.** Nothing was written on any of the three runs.

## Build 486 — CompanyCam photographs into an inspection report (31 July 2026)

A 📸 button in the report editor toolbar. Search by address / job name / crew across the 60,485
indexed photographs, tick, choose a section, and they land in the report captioned with the job name.

**A 37-agent read-only audit ran first**, with every finding adversarially refuted before it was built
on. It changed the build twice and caught two things that would have shipped wrong.

### Mount in the PARENT document, not the iframe

The obvious build puts the button inside `#reportFrame`, beside the existing photo frames. **That is
the wrong build.** `serializeFrame()` is a **denylist**, and its output is what reaches the database,
the client email and the public share link. Anything living inside the iframe needs a matching
removal rule there, a matching `#printFix` selector and a `no-print` class — and **still** leaks
through `downloadFrame()`, which reads the **live** `documentElement` rather than the serialised
clone.

Mounting in the toolbar needs none of that, and `#editorView .toolbar,#editorView button{display:none}`
already hides it on print. **Asserted, not assumed:** the brace-matched `serializeFrame` and
`downloadFrame` slices contain zero `rcc`.

### `api/companycam.js` needed no change at all

It already full-text searches `description`, `project_name`, `project_address` and `creator_name`,
with an `ilike` fallback. The Library's own search box simply never sent `q`. **"Search by address"
was a parameter, not a feature.**

### Data URLs only — never a remote src

`placePhotoInSection` does `img.src = dataUrl` with **no scheme check**, and `serializeFrame`
preserves `<img>` verbatim. A signed CompanyCam or Supabase URL written there would leak through the
public share link **and 404 when it expired** — a report that silently loses its photographs weeks
after it was sent. Bytes come through `action:'fetch'` as base64.

Deliberately **not** routed through `resizeImageFile()`: it sets no `crossOrigin`, and its
`toDataURL` runs inside `img.onload`, **outside the Promise executor** — so a throw there never
rejects and the `await` hangs forever.

### A pre-existing bug, fixed here

**`lockTemplate()` had exactly one call site**, inside `frame.onload`. Any figure minted at runtime
by `addFrameToSection()` therefore carried a fresh `<span class="ph">` with no `contenteditable`,
and the body's own was removed at load — **the caption could not be typed in.** It fires immediately
in sections **1, 2, 9 and 10** (no template figrows at all) and after two photographs in most others.
`lockTemplate` is idempotent, so one call at the end of `placePhotoInSection` fixes **every** caller
at once, including the existing Assistant path.

### Guards

- **The `await` window.** `closeEditor()` sets **nothing** synchronously — `srcdoc=''`, `current=null`
  and the class removal all run *after* `await saveCurrent()`. Re-reading `frame.contentDocument`
  therefore cannot tell you the editor is closing. A generation counter (`_rccGen`) bumped as the
  **first synchronous statement** of `closeEditor` can; every await is followed by a check.
- **`addFrameToSection` never returns null** even when the heading is missing, so
  `placePhotoInSection` reports success on a row that was never inserted. The picker checks the
  heading itself rather than trusting the return value.
- **`rcc-` not `cc-`.** In this file `cc-` already means Community *and*, inside `cr-lib-script`,
  CompanyCam. A third meaning would be a bug with a delay on it.

### Two decisions taken conservatively, both reversible

- **Admin-gated**, matching `api/companycam.js`'s server-side 403. A button that fails for Curtis,
  Scottie, Nick, Joey and Jacob is worse than no button. Widening the route spends a credential and
  is Theo's call.
- **Cross-client guard, not requested.** The picker reaches all 1,437 jobs, so it can put another
  customer's house into this customer's report — and reports go out by email and public link. The
  search pre-fills with the report's property; a photograph from a different job is outlined red and
  labelled before it can be filed.

### Four harness reds, all the test's fault, each a different mistake

1. The ordering check compared against `CLOSE.indexOf('await')` — and **the comment explaining the
   bump contains the word "await."**
2. `_rccGen` was passed as a `new Function` **parameter**, which copies the number by value, so the
   stub's bump was invisible.
3. `String.prototype.lastIndexOf` called with **three** arguments (Python slice habits) — returns
   `-1`, so the "stylesheet" was the whole file from char 0 and the `.open` rule drowned in garbage.

Plus three patch aborts before that, all **one class**: counting an identifier that this patch's own
comment, or an earlier build, already used — `lockTemplate` (comment names it twice), `g !== _rccGen`
(hardcoded 6, wrote 5), and the data-URL string (build 482's `ccEdit` already builds an identical
one). **Name the site; never count the phrase.** Nothing was written on any of them.

---

## 487 — the list view's documents were dark text on the dark page

**The handed-off task was wrong, and the measurement that justified it was wrong.** HANDOFF named
the *documents list* and prescribed tokenising `td.dates{color:#333}` to `var(--muted)`. Both halves
were false, and shipping it would have been a regression sold as a fix.

**Wrong surface.** `#estDocsMount` / `#inspDocsMount` sit under `#projectView`. The rule that strips
the paper background — `#listView table.reports{background:transparent}`, added by 44310's retail
redesign — is scoped to `#listView` and never reaches them. Those tables keep
`background:var(--paper)` = `#ffffff` at every width, where `#333` measures **12.63:1**. There was
never a bug there.

**The prescribed fix inverted the contrast.** `var(--muted)` is `#5c5c5c`. On that white table,
tokenising takes **12.63:1 down to 6.69:1**. Every mechanical gate would have gone green.

**The numbers could not both be true.** HANDOFF claimed `#333` at 1.48:1 and the tokenised lines at
7.10:1. They share one table cell, so one background — and `#333` is *darker* than `#5c5c5c`. On any
dark ground `#333` is worse; on any light ground it is better. `7.10:1` is also unreachable for
`#5c5c5c` against anything: pure white caps it at 6.69:1.

**The real defect, measured.** `#listMount` *is* inside `#listView`. There the table is transparent
over `--bg:#09090C`, and every cell still carries its paper-theme colour:

| | on the dark list view |
|---|---|
| `td.dates{color:#333}` | **1.57:1** |
| `var(--muted)` = `#5c5c5c` | **2.97:1** |

The tokenised lines fail too, which is why "tokenise it" was never going to work. 44310 also gave
`#listView .reports tr` `border-radius` and `margin-bottom` — card geometry that does not apply to a
table row at all above the breakpoint. It stripped the surface and never replaced it.

**Why nobody saw it.** `table.reports tr{background:#fff}` lives inside `@media (max-width:700px)`,
so on a phone every row is a white card and the bug is invisible. The doc set recorded Theo as
mobile-only. He corrected that mid-session: desktop **and** an ultrawide, both >700px.

**The fix.** Three rules scoped to `#listView`, using the retail token pair already declared dark at
20556 and light at 20578, so `rb-light` flips with them instead of needing a second block:
`--rbe-ink` (`#cfd6df`, **13.58:1**) for cell text, `--rbe-mute` (`#9aa0a8`, **7.55:1**) for `small`
and `.ref`, and `rgba(255,255,255,.06)` for hover — because the inherited
`tr:hover td{background:#faf7f5}` would otherwise flash a near-white bar under light text.
`--rbe-mute2` (`#6d747e`) was rejected at **4.21:1**, below the floor. `.projrow` is excluded: it
sets its own light band and would have gone light-on-light.

Gates green, negative control clean. Harness 14/14 proving **scope** — that the selectors reach the
list view and provably cannot reach the documents list, which is the exact mistake avoided.
**jsdom cannot resolve `var()`, so nothing here proves colour**; the Vercel preview and Theo's eyes
are that gate.

## 488 — the updates panel was printing raw codes at people

Found by an assertion written for something else. 20 `CHANGELOG` notes carried `\U0001XXXX` escapes
— **Python syntax, not JavaScript.** JS has no `\U` escape, so it drops the backslash and the note
renders beginning `U0001F4F8` where the emoji belongs. `CHANGELOG` is rendered (33510 filters to
builds newer than `lastSeen`, else the latest five), so this is what Theo has been reading since
roughly 468 — including 486's entry, the newest one he would see.

Repaired as **surrogate pairs** (`\uD83D\uDCF8`), not literal characters: `\uXXXX` is valid JS and is
already this file's convention (597 × `\u2014`, 115 × `\u2026`), and it keeps the region ASCII so no
encoding step can mangle it. Scoped to the `CHANGELOG` array and asserted: the ~2,141 valid `\u`
escapes elsewhere are unchanged, counted before and after.

Harness parses the shipped array in a real engine and reads the resulting strings — 6/6, negative
control 4/6 against 487. Not a text assertion: a wrong escape produces wrong characters and fails.

### Two aborts, both mine, both the same class as 485–486

1. **An apostrophe in my own note.** "What's New" inside a single-quoted JS string closed it and
   took out the whole `cr-cl-script` block. Caught by `node --check`, nothing staged. The patch now
   asserts no apostrophe reaches the literal.
2. **I quoted the broken pattern inside the note meant to prove it absent** — the harness scans every
   note for that pattern and cannot tell my example from a real one. Exactly the class recorded at
   486: *counting an identifier my own text already used.* The note no longer quotes it.

## 489 — the two unpicked contrast tokens, and a third the audit missed

`OPEN_ITEMS` carried two light-theme failures computed 31 July and marked *"ready to apply on a
word."* Both re-confirmed here with `scripts/contrast.py` before touching anything:

| Token | Was | Now |
|---|---:|---:|
| `--rbe-empty-fg` light, `#8a8a8a` on `#ffffff` | **3.45:1** | `#767676` → **4.54:1** |
| `--rbe-adm-fg` light, `#8a6a4a` on `#f2e9e2` | **4.13:1** | `#826446` → **4.54:1** |
| `--rbe-empty-fg` **dark**, `#8b929c` on `#2e333b` | **4.05:1** | `#9aa0a8` → **4.82:1** |

**The third one was not in the audit.** That pass was scoped to *light theme*, so the dark half of
the same token was never computed — and it fails too. Shipping only the two listed would have
cleared one theme and left the other below the floor, while the build log said "contrast fixed."
**When a token is a dark/light pair, compute both halves; an audit scoped to one theme has not
checked the token, only half of it.**

The dark repair reuses `#9aa0a8` — the value `--rbe-mute` already carries in the dark theme —
rather than the bare-minimum `#959ba5` (4.54:1). An empty-state message *is* muted text, so this
removes a near-duplicate grey instead of adding one, and lands at 4.82:1. *Grep for a convention
before you invent one.*

`--rbe-adm-fg` dark (`#d8c9a8` on `#3a2f22`) measures **7.98:1**. Left alone, and asserted
untouched rather than merely not edited.

**This build needed no rendering and none was claimed.** Contrast is arithmetic, so the gate reads
the shipped token values back out of the artifact, pairs each foreground with the ground it actually
meets — by name, never by cartesian product — and computes. 4/4 clear the floor; negative control
against 488 fails 3 of 4, and correctly passes the one that was already fine.

## The sweep that found nothing — recorded so it is not repeated

After 487 I swept the file for the same class: a surface stripped to transparent over the dark page
with hardcoded light-theme ink left behind. It produced **27 candidates and zero real defects.**
All 27 died on inspection, and **my sweep was wrong three different ways:**

1. **Token-valued backgrounds read as "no background."** The detector matched `background:#hex`, so
   every `#cr-bulk-mount .badge` using `var(--bt)` / `var(--gt)` looked groundless. They all paint
   their own surface.
2. **`-webkit-text-fill-color` was ignored.** `#listTitle` and `.projsec` set a gradient with
   `background-clip:text` and `text-fill-color:transparent`; their `color:#c8202e` is a fallback
   that never renders. The computed ratio was meaningless.
3. **`@media print` was not excluded.** The two most convincing survivors — `#listNote` at 2.97:1
   and `#listView label` at 2.38:1, both `!important` and both apparently beating the redesign —
   live inside `<style id="cr-print-styles">@media print{…}`, where the background is forced
   `#fff`. On screen they never apply.

**That third one is the same error as the measurement 487 had to correct**: computing a ratio
against a background the text never meets. It is the defining mistake of this whole area.
**A contrast candidate is a hypothesis until you have identified what actually paints beneath it.**

The useful result is the negative: **487 was the only instance of its class.** Recorded so the next
session does not re-run this and re-derive the same 27 ghosts.

### A data fact for anyone gating the CHANGELOG

It has **185 entries**, and **builds 234, 241 and 299 each carry two of them.** A gate asserting
strictly descending build numbers reports three violations against perfectly good data — mine did.
Assert **non-increasing**, which still catches a genuinely misfiled entry. Same lesson twice in one
build: the first version of that gate also pinned `log[0].build` to a literal `488`, so it went red
the moment 489 shipped while every substantive check still passed. **Assert the property, never the
tally.**

## 490 — the AI sort route, and its vocabulary on the client BEFORE the writer

**Deliberately half a feature, in the sanctioned order.** This ships `api/sortphotos.js` and the
client-side whitelist with **no writer yet**. That is the `normStage` invariant applied as
`START_HERE` §5 states it — *"ship the whitelist entry first, in its own commit"* — and it is what
`OPEN_ITEMS` asked for: *every enum the route can emit is in the client whitelist before the writer
ships*. A value the whitelist has not learned does not error; it silently becomes something else.

**The route is signed-in, not admin-only** — settled by Theo, and the two gates guard different
things. `api/companycam.js` stays admin-only because it reaches all 1,437 jobs and can put the wrong
customer's house into a report that goes out by email and public link. This route only ever sees
photographs already in the open report and never touches CompanyCam. Spend is bounded by
`MAX_PHOTOS = 24`, which is what actually caps cost — not the gate.

### The three defects from `organize.js` / `librarian.js`, fixed rather than inherited

1. `organize.js:51` reads `process.env.GEMINI_API_KEY` **bare**. A trailing newline in the Vercel
   variable produces an opaque Google 400. Now `(… || '').trim()`, the majority idiom. Asserted both
   ways: a padded key works, a whitespace-only key reads as missing.
2. `organize.js` has **no retry**. `askGemini` is taken from `librarian.js:48–65` — **with its bug
   fixed.** That version sleeps 1200 ms *after the final attempt*, so a job already doomed still
   burns billed time before returning. It now sleeps only when another attempt will follow.
3. `librarian.js`'s `sources` sanitiser is **stranded inside a `catch` and never runs**. Not copied.

### One vocabulary, none of it invented

`section` had incompatible prior art — `organize.js` defines 3–8 and 502s outside — so this route
uses the **same numbering** rather than a fourth scheme under a colliding name. `severity` is
`severityOf()`'s `crit`/`warn`/`ok` (index.html:31212). `trade` is the `EST_TYPES` key set
(**index.html:16771** — the audit said 16751; re-measured, as the docs instruct). An unknown value
from the model is **coerced to the safe end of each scale**, never passed through.

The route also returns its own vocabulary on every 200, so a deploy skew between `index.html` and
the route is **detected** by `CardinalSortVocab.agrees()` rather than silently discarding
placements.

### `placed + setAside === submitted`, on every path

A silent drop is the failure mode — a photograph that is neither placed nor reported looks handled.
`sortOne()` never throws; every failure returns a set-aside with a reason. The handler re-checks the
arithmetic before responding and 500s loudly rather than returning a short list.

**Gates.** `node --check`, no `module.exports`, **zero imports** so `check.yml`'s missing `npm ci`
cannot hide an undeclared dependency. Route harness **24/24** against the shipped handler with
`fetch` stubbed: 401 unsigned and the model never reached, signed-in non-admin succeeds, the
invariant holds across five failure paths, a remote URL is set aside without a model call, unknown
severity and trade are coerced, 503 retried exactly once, non-retryable 400 not retried, the cap
refused before any spend. Client harness **16/16**, running the shipped block and comparing it to
the vocabulary from a live route call — including that `agrees()` actually rejects drift, so it is
not decorative.

**Negative control on a new file.** Nothing to diff against, so the bug was reintroduced: restoring
`librarian.js`'s unconditional sleep flips exactly one check to FAIL (23/24, RED). The gate
discriminates.

**LIMIT: no real Gemini call was made.** This proves the route's contract, not that the model sorts
photographs well. That needs Theo, real photographs, and the writer that does not exist yet.

## 491 — the writer: sort the photographs already in this report

Open a report, press **🧹 Sort photos**, and every photograph already in it is moved to the section
it belongs to and given a caption. Photographs the model is not confident about are left exactly
where they are rather than guessed at.

Mounted in the **parent document**, like 486 and for the same reason: `serializeFrame()` is a
denylist and its output is what reaches the database, the client email and the public share link.
Signed-in rather than admin, because this route only ever sees photographs already in the open
report — settled by Theo and recorded at 490.

### The traps, and where each is handled

**O(n²), fixed by extension not duplication.** `placePhotoInSection` re-ran `wirePhotoFrames` and
`wireReanalyzeButtons` on every call. It gains an optional fifth argument, `defer`; the bulk caller
passes `true` and wires **once** after the last photograph. Both callers that existed before 491
pass four arguments, so `defer` is `undefined` for them and their behaviour is exactly what 486
shipped — asserted, both call sites unchanged. **Negative-controlled:** the same three-photo sort
run through 490's `placePhotoInSection` wires **3** times; through 491's it wires **1**. Without
that control the assertion would have been vacuous.

**Node references captured before an `await` are not trusted.** The editor may have re-rendered
during the round trip. A marker attribute was rejected outright — `serializeFrame` would carry one
into the saved report and out to the client — so `sortApply` re-reads the live document and matches
photographs back by a fingerprint of their bytes (`length + first 64 + last 64`). `_rccGen` is
captured before the call and re-checked after, because `closeEditor()` sets nothing synchronously
and re-reading `contentDocument` cannot tell you the editor is closing.

**Section 2 is never a target.** It belongs to `wireSummaryDraftButton`, which mounts with
`insertAdjacentElement('afterend', …)`; `serializeFrame` removes it by testing a single node while
stripping the `data-wired` guard unconditionally, so a second `afterend` control removes the wrong
one and compounds one copy per save/open cycle. 490's whitelist rejects anything outside 3–8, and
the harness asserts section 2 specifically.

**The client whitelist is the authority, not the route.** Every placement goes through
`CardinalSortVocab.knows()` before it touches the document, and the batch is compared against the
vocabulary the route returns — a deploy skew between `index.html` and the route reports itself
instead of silently discarding placements.

**Data URLs only.** A non-`data:` src is never collected, so it can never be sent.

**Gates.** check_build green, stamp 490 → 491, marker present, negative control clean. Harness
**22/22** driving the shipped module against a report built from the shipped `REPORT_TEMPLATE` —
nothing reimplemented: `placePhotoInSection`, `addFrameToSection`, `findEmptyFrameInSection`,
`sectionElements`, `findSectionHeading`, `sectionName` and `rccSections` are all lifted out of
`index.html` by brace-matching. Only the three wiring functions are counting stubs, because how
often they run is the thing under test.

**A harness red that was the harness's fault, again.** Two placement assertions failed because they
keyed photographs on the last 12 characters of their data URL — all three fixtures end in the same
80 `x`s, so the base64 tails are identical and the map collapsed to one entry. The app's own
`sortFp` was already correct. Third time this session that a red was the test rather than the app;
the ratio in `START_HERE` §3 continues to hold.

**LIMIT.** jsdom proves structure, never appearance, and no real Gemini call was made by any gate.
That a sorted report *reads* well needs Theo, real photographs, and a real key.

## 492 — the General Exterior inspection report

Under **📄 Inspection Reports** there is now a second button, **+ New exterior report**, for the jobs
that are not only about the roof.

**Derived from `REPORT_TEMPLATE` at patch time, not authored.** Comparing Theo's ten sections against
the roof report's, **five are the same five** — Inspection Overview, Summary of Findings, Exterior
Elevations, Recommendations, Limitations. Only the middle five differ: Aerial Roof · Roof Surface ·
Penetrations · Chimney · Attic become **Roof · Siding & Trim · Windows & Doors · Gutters & Drainage
· Structure & Grounds**.

So this is a rename of five headings, five narratives and five contents rows — not 163 KB of new
document. Deriving guarantees what hand-authoring could not: identical `<style>` block, identical
`@page` rules, identical cover-photo hook, identical `figrow` / `fig` / `frame` / `cap` markup, and
the `data-` attributes the editor depends on.

**The derivation runs in Python and emits a static literal.** No runtime template machinery was
added. The correction recorded at 486 stands — in this app a template is *code*, not data — and
inventing a runtime derivation mechanism would have been the "new mechanism beside an existing one"
failure this project keeps paying for.

**`data-cardinal-summary-heading` was the thing to be careful with.** It sits on an `<h3>` in
section 1, and `EDITABLE_SELECTOR` reaches its paragraph with `'[data-cardinal-summary-heading] + p'`
— an adjacent-sibling combinator. Anything inserted between them silently kills contenteditable on
that paragraph. The patch asserts the `<h3>` is still immediately followed by a `<p>`, and the
harness re-checks it on the loaded document.

**One creation path, two buttons.** `createReportFrom(tpl, kindLabel, roofy)` is extracted and both
buttons call it; duplicating the handler is how this project grows a second copy of a feature.
`roofy` is **false** for the exterior report on purpose: the Roofing Inspection Checklist feeds roof
specs and has nothing to say about siding, windows or grounds, so it is neither demanded nor
injected there.

**Gates.** check_build green, stamp 491 → 492, marker present, negative control clean. Harness
**18/18** driving the shipped `rccIsReport` / `rccSections` / `placePhotoInSection` against the
derived template: ten sections in Theo's order verbatim, contents matching the headings, no
roof-only title surviving, the sort's 3–8 range landing on real sections, a photograph actually
placed into Siding & Trim with its caption written. **`REPORT_TEMPLATE` asserted byte-identical to
491** — the roof report was not touched.

**Cost, stated plainly: `index.html` grew 164 KB, from 2.83 MB to 3.00 MB.** That is the real price
of a second template in a single-file PWA, and it is paid on every cold load. Worth knowing before
a third template is ever considered.

**LIMIT.** jsdom proves structure. Whether the five new narratives read right on a real siding or
window job is Theo's eye, not a gate.

## 493 — stop telling people their clients are gone when we simply never loaded

From the unblocked build queue: *"Distinguish 'no clients' from 'couldn't load.' Both render the
same empty state, which is why a transient read failure looked like data loss."*

`cacheProjects` is initialised to `[]` and **stays `[]` when a load fails**, so `renderHome()`'s
empty state confidently rendered *"No client projects yet. Click + Add project to create your first
client profile."* — to someone who may have two hundred clients and a dropped connection.

**The distinction is not in the data.** A denied read and an empty table both arrive as `[]`; no
inspection of the array can tell them apart. What can is whether a load has **ever succeeded**, so
that is what is now tracked. `cacheLoaded` starts `false` and is set in exactly one place — inside
`reload()`, after the awaited results are assigned, never in the `catch`. All three asserted.

Three states, three different things said:

| State | What the user sees |
|---|---|
| never loaded / load failed | *Could not load your client projects.* + **nothing has been deleted** + **Try again** |
| loaded, genuinely empty | the original *No client projects yet* invitation, untouched |
| loaded, has rows | neither |

The retry is delegated at the document, so it survives every `innerHTML` replacement regardless of
which container rendered the empty state.

**Scope kept deliberately narrow.** Exactly one user-facing claim was wrong. `exportClients()`
already hedges correctly (*"No clients loaded yet"*), the filter empty-states are about filters, and
the hash-restore retry loop is not a claim. None were touched.

**Gates.** check_build green, stamp 492 → 493, marker present, negative control clean. Harness
**19/19**, evaluating the branch lifted verbatim from the shipped file under each of the three
states — and it **reproduces the bug on 492 first**, which is what makes the fix believable rather
than merely green.

### One abort and one harness red, both useful

The patch aborted on `async function reload(){` — it occurs **twice**, the global one and a scoped
one inside the punch data layer's IIFE at 46823. Nothing was written; the anchor was re-cut against
the function body, which is unique.

Then two harness checks failed for a reason worth recording: **`index.html` is CRLF in the working
tree.** Git's `autocrlf` converts on checkout. Python patching is unaffected — universal newlines in,
CRLF out, normalised back to LF on commit, which is why every scope diff has stayed clean — but a
**JavaScript** harness reads raw bytes, so a multi-line anchor containing `\n` silently matches
nothing and `indexOf` returns `-1`. Normalise with `.replace(/\r\n/g,'\n')` when reading
`index.html` from Node.

## 494 — Self Check could stop the whole app scrolling

Found by auditing scrolling after seven builds, not by a report. **This is
`BUG_CLASSES.md` §1 recurring in a new module** — the same shape PR #37 fixed for `openPreview`.

`cr-sc-script` locked body scroll **twice** and released it **once**:

```js
panel.classList.add('open');
document.body.style.overflow = 'hidden';     // lock
try { results = await collect(); }
finally {
  panel.classList.add('open');
  document.body.style.overflow = 'hidden';   // locked AGAIN, failure path included
}
```

The only release was the Close button. No `popstate`, no `hashchange`, and — confirmed against the
whole file — **no global scroll-lock reconciler exists**. So: Menu → 🩺 Self Check, then leave by the
back button, a nav link or a CRM switch without pressing Close, and `body{overflow:hidden}` survived.
Nothing scrolled until a reload.

**Two edits.** The redundant `finally` re-lock is gone — the lock is already set before the await,
and re-applying it on the failure path was how a failed run left the page stuck. And the module now
releases on `hashchange` (the app routes on the hash, so this covers ordinary navigation) and
`popstate` (the back button). `close()` is idempotent, so firing it when nothing is open costs
nothing.

The module is now **one lock, one release** — asserted on the module slice, not the file, because
the file has ~15 of each and a file-wide count would prove nothing.

**Gates.** check_build green, stamp 493 → 494, marker present, negative control clean. Harness
**10/10**, and it is behavioural rather than textual: it runs the shipped module in jsdom, opens the
panel, fires `hashchange` **without** touching Close, and reads
`document.body.style.overflow`. Against 493 the same sequence leaves it `'hidden'` — **the bug
reproduces** — and against 494 it reads `''`.

### What this does NOT fix

Only this module. `OPEN_ITEMS` §6a still stands and is still the right answer: **a global
scroll-lock reconciler**, because ~15 modules each hold their own lock and every one of them is a
chance to strand it. Two `overflow-y:auto !important` band-aids also remain, at `#navMenu` and the
community hub; PR #11 is the open experiment on one of them and needs a device test.

## 495 — my bug: the Sort photos button from 491 never appeared

**Theo found this, not a gate.** He opened the app looking for it and it was not there.

491 gated the button beside `rccGate()`:

```js
rccGate();
if(typeof window.sortGate === 'function') window.sortGate();
frame.srcdoc = r.html;      // <-- the report loads AFTER this
```

`rccGate()` survives that position because it only asks `isAdminUser()`, which does not depend on
the frame. `sortGate()` asks whether the **loaded document** is an inspection report — and at that
instant the frame still holds the previous document, or nothing. So the button stayed hidden, or
worse, reflected whatever had been open before.

*"Navigate the way the app navigates; views created at `show()` time do not exist before it"* —
`START_HERE` §3. I read that line, quoted the neighbouring one about `_rccGen` in my own 491 commit,
and then placed the call one line too early anyway.

**Fix:** one call site, inside `frame.onload`, beside `lockTemplate(doc)` where the rest of the
post-load wiring already runs.

### Why no gate caught it, which is the part worth keeping

491's harness had 22 checks and every one passed. **It proved the sort LOGIC and never proved the
MOUNTING.** It called `SortPhotos.apply()` directly with a document it had built itself, so it never
asked the question the user asks: *is the button there?*

This is the same gap as build 359, which shipped a CSS selector that hid the community tab buttons
while every structural proof passed — the elements existed, they were just never shown.
`BUG_CLASSES.md` B already says jsdom proves *does this work*, never *does this look right*. Visibility
sits exactly on that line, and it **is** testable: 495's harness loads the real `REPORT_TEMPLATE`
into a real iframe, runs the real `rccDoc` / `rccIsReport`, calls `sortGate()`, and reads
`style.display`.

**A rule that would have caught it, and is cheap:** when a build adds a control that gates on
document state, assert its `display` after a real load — not just that its handler works.

**Gates.** check_build green, stamp 494 → 495, marker present, negative control clean. Harness
**10/10**: hidden at rest, **visible after a report loads**, hidden again on a non-report document,
visible again on the next report — so it is not a one-way latch. Plus the structural proof that
there is exactly one call site, after `srcdoc`, inside `frame.onload`. **Negative-controlled twice**:
against 494's source order, and behaviourally by gating an empty frame, which is what 494 was
effectively doing.

## 496 — CompanyCam search by address or job name found nothing

**Theo reported it. Diagnosed against the live index, not reasoned about.**

The route searched each column **separately**, and `websearch_to_tsquery` **ANDs** every word. The
picker pre-fills the box with the report **title**, which carries the client name *and* the address —
but `project_name` holds only the name and `project_address` only the address, so **no single column
ever contained all the terms**:

| typed | hits |
|---|---:|
| `843 Farnam` | **738** |
| `CR226 Amber Mcdonald — 843 Farnam St, Springfield, OH 45506` | **0** |

And a lone hyphen is **negation** to `websearch_to_tsquery`: `Client - 843 Farnam` parsed to
`'client' & !'843' & 'farnam'` and actively **excluded** the address being searched for.

**The index for this already existed and was never used.** `companycam_photos_fts` is a GIN index
over the four fields **concatenated into one document**. Querying that expression is both correct
(all terms match across the combined text) and fast. Measured:

| | plan | time | rows |
|---|---|---:|---:|
| per-word `ilike` scan | parallel seq scan | 1,706 ms | 738 |
| the combined expression | **Bitmap Index Scan** | **32 ms** | **738** |

**SQL:** `companycam_search.sql`, **applied**. `SECURITY DEFINER`, revoked from `anon`/`authenticated`,
granted only to `service_role` — the same shape as `companycam_backfill_project_names`. Verified
after applying: `prosecdef=true, anon=false, service_role=true`. It strips punctuation before
parsing, which removes the hyphen-as-NOT trap.

**Third bug, and the reason this failed silently:** the `ilike` fallback only fired when the request
**errored**. A search that succeeded and returned zero rows was reported as "nothing matching" — a
confident wrong answer. It now falls back when the result is **empty** too.

**Also:** `rccSubject()` now pre-fills with the **project address** rather than the report title. The
title is a sentence; the address is what CompanyCam actually stores.

Gates: `node --check`, check_build green, harness **13/13** against the shipped handler with `fetch`
stubbed — the RPC is called, the per-column form is gone, an empty result falls back, a genuinely
empty search still returns zero, the body is read once, and it is still admin-only.

## 497 — take a photograph OUT of an inspection report

Asked for by Theo. Until now a photo could be **replaced** but never removed, so one added by mistake
had to be covered with another.

Built into `wirePhotoFrames`, where the photo controls already live, rather than as a second
mechanism. **Safe by construction:** the button sits inside `.fig .frame`, and `serializeFrame`
removes `.fig .frame button` wholesale — so it cannot reach the database, the client email or the
public share link. The print sheet already hides it too.

It asks first, and **clears the caption with the photograph** — a caption describing a photo that is
no longer there is worse than no caption. It touches nothing outside the report: not CompanyCam, not
the client photo album.

Gates: check_build green, harness **15/15** — visible only when a frame holds a photograph, removal
clears image and caption and flips the button back, declining the confirm changes nothing, and
**the real denylist rule is run over a document containing the control to prove zero survive**.

## 498 — Sort hung silently. My design error, on two axes at once

Theo: *"Sort gets greyed out, I dont see an error message, nothing sorts."*

**That symptom was diagnostic.** `sortRun`'s final `.then()` re-enables the button **unconditionally**,
so a button still greyed means the promise never settled — which rules out every error path, because
all of them settle and alert. It was not failing. **It was hanging.**

**Two causes, both mine:**

**Payload.** Report photographs are stored at 1600px/0.82 — roughly 300–800 KB each once base64'd.
The route accepted **24 in one POST**: 7–19 MB, against Vercel's **4.5 MB** body limit. I capped 490
on photo **count**, which bounds spend, and never on **bytes**.

**Time.** The route loops photographs sequentially, each up to two Gemini attempts with a 1,200 ms
pause. Twenty-four of those is minutes; a serverless function is killed long before. The browser sat
waiting on something already dead.

**Four fixes:**

1. **Shrink before sending.** 640px at 0.6 — about a tenth the bytes. The model does not need 1600px
   to tell a chimney from a soffit. **The photograph in the report is never touched**; only the copy
   sent for classification is reduced. Asserted: `sortApply` still places the original.
2. **Batch.** Four per request, sequentially. Each body is now well under a megabyte and each call
   finishes inside the function's lifetime.
3. **Progress.** The button reads *"Sorting 8/18…"*, so it is never a mystery again, and its label is
   restored afterwards.
4. **Timeout.** `AbortController` at 45 s, reported in words — *"the server did not answer within 45
   seconds"*.

### The harness caught me reintroducing the same bug one layer down

`sortShrink` waits on `img.onload` / `img.onerror`. **An image that never decodes fires neither**, and
that promise would then never resolve — the exact hang this build exists to remove, recreated inside
the fix. jsdom exposed it because it does not decode images; any browser that silently fails to
decode would do the same.

It now settles **once and unconditionally** behind a 5 s guard. I did not find this by reading the
code back — the gate found it, which is the whole argument for writing one that actually drives the
thing.

**Gates.** check_build green, stamp 497 → 498, marker present, negative control clean. Harness
**16/16** driving the shipped module: ten photographs go out in **three** batches of no more than
four, all ten accounted for, the button comes back enabled with its label, a stalled request aborts,
and 497 is confirmed to have had no batching, no shrinking and no timeout.

**Still unproven:** no gate made a real Gemini call, and jsdom has no canvas — so the shrinker's
actual output size is inferred from the arithmetic, not measured. Whether a sorted report reads well
remains Theo's eye.

## 499 — Sort was making its model calls one at a time

498 stopped the silent hang and reported honestly: *"the server did not answer within 45 seconds."*
That was the timeout doing its job — and it exposed the real cost.

`sortphotos.js` awaited each photograph **in turn**. A batch of four was four Gemini vision calls
back-to-back, several seconds each plus up to a 1,200 ms retry pause, which is what blew the 45 s
budget. Four concurrent calls take about as long as one.

`sortOne` **never throws** — asserted in its own gate since 490 — so `Promise.all` cannot reject here
and cannot lose a photograph. Results return in request order, so the
`placed + setAside === submitted` accounting is unchanged.

Measured against the shipped handler with stubbed 60 ms calls: **peak concurrency 4** (sequential
would be 1), **66 ms** for four (sequential would be 240 ms+), 4/4 accounted for. 490's route harness
still green.

## 500–501 — the AI provider ladder, finally built

Theo asked whether the Gemini key was working. **It is. The model is not.**

`/api/ai-status` against the live deployment, seven calls:

| | latency | reliability |
|---|---:|---|
| `gemini-3.5-flash` | **6–14 s** | **503 "high demand" ~1 call in 4** |
| `gpt-4o-mini` | **0.6 s** | 7/7 |

Nothing is wrong with the key, the billing or the config. `gemini-3.5-flash` is overloaded on
Google's side, and it was hitting the Library box as well as the sort.

**500** raised Sort's client timeout 45 s → 90 s. 45 s was my guess; 6–14 s per call plus a 503 retry
is what the measurement supports.

**501 — and this is the one that matters.** `ai-status.js` has always described itself as the health
check for *"the AI provider ladder (Gemini + OpenAI backup)"*. **The ladder was designed and never
built** — only `api/coach.js` ever called OpenAI. Theo asked the obvious question: *"Why doesnt
openai substitute for it?"*

Now it does. When Gemini refuses for any reason — 503, 429, empty or unusable output — the same
prompt and the same photograph go to `gpt-4o-mini`, which is multimodal. A photograph is set aside
only once **both** have failed, and the reason says so: `both models refused`.

Gemini stays first: it is what every other route uses and what the prompt was tuned against. This is
a fallback, not a switch. The response now reports `via: 'gemini' | 'openai'` per placement and
`viaGemini` / `viaOpenAI` counts, so a day where everything says `openai` reads as a Google outage
rather than a bug here.

Gates: `node --check`, no imports, check_build green, harness **10/10** — Gemini answering means
OpenAI is never called; a 503 means the photograph is still **placed** rather than set aside, with the
caption intact; both failing sets it aside and says so; and `placed + setAside === submitted` holds
on every path.

**Not done:** `librarian.js`, `organize.js`, `caption.js` and `summarize.js` all still call Gemini
alone and will still fail on a busy day. `askOpenAI` is fifteen lines and copies cleanly to each —
worth doing, and deliberately not bundled into a build about Sort.

## 502–503 — the fallback everywhere, and a model ladder above it

Theo: *"It should have been done before and not sure why it never has, please do it."* He is right.

**502.** `caption.js` has had a Gemini→OpenAI ladder for a long time; 501 gave `sortphotos.js` one.
`librarian.js`, `organize.js` and `summarize.js` never got one, so on a day like today the Library
box, the Assistant and the summary drafter simply failed.

Copied **caption.js's proven shape**, not a new one. **Deliberately not factored into a shared
module:** no route in this repo has ever imported a sibling file, `check.yml` is syntax-only so it
could not catch a bundling failure, and the blast radius would be every AI route at once. Three
copies of a small function is the lesser evil, recorded as a choice rather than an oversight.

The fallback returns **Gemini's own response shape**, so every existing call site reads it unchanged
— no caller had to learn there is a second provider. Also fixed `librarian.js`'s sleep-after-final-
failure, the same defect 490 fixed when copying it.

**503.** Theo confirmed the current line-up: **Gemini 3.6 Flash, 3.5 Flash, 3.1 Pro.** All 13 routes
were pinned to `gemini-3.5-flash` — valid, but the one measurably struggling. Now a ladder:
**3.6 → 3.5 → OpenAI**. If 3.6 is unavailable to this key the cost is one fast 404 and nothing
breaks, which is why it could be shipped without being able to test it from here.

A `503`/`429` retries the same model; a `400`/`404` moves to the next model **immediately** rather
than retrying something that will never work.

`ai-status.js` now takes `?model=` so any model can be probed by name — evidence rather than
assumption:

```
https://app.cardinalroster.com/api/ai-status?model=gemini-3.6-flash
```

Gates: every `api/*.js` parses, check_build green, harness **25/25** (updated for the intended new
behaviour: a 503 walks both models twice each, 3.6 before 3.5, a 400 tries each model once) and
**10/10** on the provider ladder.

**Still on 3.5 only:** `analyze`, `coach`, `companycam-sync`, `estimate`, `hover`, `roofr`, `sol`.
They have no fallback either. The same fifteen lines apply; not bundled here because this build was
about the routes Theo was actually hitting.

## 504–505 — every AI route has somewhere to go now

**504.** `ai-status.js` honoured `?model=` in its probe URL but reported the model name **hardcoded**
as `gemini-3.5-flash`. So asking it about 3.6 probed 3.6 and answered "3.5". **A diagnostic that
lies about what it tested is worse than none** — it is how you conclude the wrong thing with
confidence. The model is now named once and used for both the probe and the report.

**505 — and a correction I owe.** I told Theo seven routes had no fallback. **Wrong: I listed them
from memory instead of checking.** `analyze`, `coach` and `estimate` already had OpenAI paths. Only
**four** were Gemini-only: `companycam-sync`, `hover`, `roofr`, `sol` — the CompanyCam caption pass,
the Hover takeoff reader, the Roofr takeoff reader and the Scope of Loss reader. All four now have
the same ladder.

One difference that mattered: **`sol.js` speaks snake_case** (`inline_data` / `mime_type`) where the
others use camelCase. The converter handles both. Missing it would have shipped a silently
text-only fallback for the one route whose entire job is reading a document — it would have
"worked", and quietly stopped seeing the PDF.

`sol.js` also reads `.json()` **before** checking `ok`, so the fallback had to be inserted before the
body is consumed — a Response can only be read once, and the fallback returns a different object with
its own `json()`.

**Audited, not remembered — all 13 Gemini routes:** `ai-status`, `analyze`, `caption`, `coach`,
`companycam-sync`, `estimate`, `hover`, `librarian`, `organize`, `roofr`, `sol`, `sortphotos`,
`summarize`. Every one now reads **Gemini → OpenAI**, and `sortphotos`/`librarian` additionally walk
**3.6 → 3.5** first. All 26 `api/*.js` parse.

## 507 — Sort fills the Areas of Concern table

Theo: *"Yes and please do it the right way."*

The data was already there and being discarded. Every placement returns a `severity` — `crit` /
`warn` / `ok` — and `sortApply` used only the section and the caption. It maps exactly onto the
priority vocabulary the template defines in its own words: **HIGH** water intrusion or prompt action,
**MODERATE** work alongside replacement, **MONITOR** serviceable, observe.

**A summary, not a dump.** One row per **section**, not per photograph — twelve photos of one slope
is one finding, not twelve rows. The worst severity in a section wins and its caption becomes the
finding. Ordered `crit` → `warn` → `ok`, so the top of the table is what matters.

**Never overwrite a human.** A row is filled only if its Area is still the template's placeholder —
empty, or starting with `[`. Anything typed by hand survives a re-sort untouched. This is a document
that goes to a client; silently replacing someone's wording would be far worse than doing nothing.

**`.ph` is preserved on every cell written.** `EDITABLE_SELECTOR` keys `contenteditable` off that
class — strip it and the inspector can no longer edit what the AI wrote. That would have been a
quiet, nasty regression.

**The Section 2 trap, avoided by construction.** The audit warns that `wireSummaryDraftButton` owns
the paragraph by the summary heading, mounts with `insertAdjacentElement('afterend', …)`, and that
`serializeFrame` removes it by testing **a single node** — so a second `afterend` control there
compounds one copy per save/open cycle. **This adds no control anywhere.** It writes into existing
cells and adds rows only by cloning one already present, which is the template's own instruction.

Gates: check_build green, harness **21/21** against the real `REPORT_TEMPLATE` — 5 photographs over
3 sections give 3 rows; the crit caption wins its section and the warn one does not also appear;
Area is the section *name*; the `#` column renumbers; `.ph` survives on both cells; a hand-typed row
is untouched and the AI finding goes to the next free row; 30 photographs over 6 sections stay
bounded; and the `afterend` count is asserted **unchanged from 506** rather than against a made-up
number.

### An assertion of mine that fired on correct code

I first asserted the file contains exactly **one** `insertAdjacentElement('afterend'`. It contains
**seven**, across unrelated features. The patch aborted on correct work. The right assertion is the
one `START_HERE` §"Counting things" prescribes and I keep relearning: **assert the property —
"unchanged from the previous build" — never a tally read off an assumption.**

## 508 — the librarian refused to draw a concept

Theo asked it to illustrate the ice-and-water concept and got: *"That is outside the library — Job
drawings, blueprints, site plans, and shop drawings are job-specific files."*

**The right fence catching the wrong thing.** `RULES` says the library holds no job files or client
paperwork; the model reasonably extended that to blueprints and shop drawings, then swept up "draw
me how an ice dam forms" along with them.

The distinction is **whose it is, not whether it is a picture.** A site plan for 2444 Edenhill is job
paperwork. A section through an eave showing how an ice dam forms is exactly what this library is
for — and **Plates 1–5 already in it are precisely that.**

Worth recording: **the librarian has been able to draw since 466** — `~~stack`, `~~flow`, `~~bars`
and one more, emitting data that `index.html` renders as SVG. It was refusing before it ever reached
the capability. Nothing needed building; the scope note needed one carve-out.

## 509 — the Resource Library, reachable from every page

Theo: *"please add the resource library where it can be seen whatever page your at."*

It had **three entrances and all three were page-specific** — the landing page's minor links, the
Tools panel, the insurance panel. From a client profile, a report or the schedule board there was no
way to it.

`#pwaNav` is already fixed, already on every screen, already at z-index 9990 — the value the whole
app's stacking is designed around — and already holds back/forward and the CRM chip. Extending it
costs **no new mechanism, no new stacking context, and nothing new that can strand itself over a
modal**, which a fresh floating button would have risked on a project whose most expensive recurring
bug is exactly that.

Hidden when `showResourceLibrary` does not exist, matching `resolveHide()`'s existing rule that an
entrance only shows if its destination does.

### Two patch aborts, both the same mistake

Both anchors were copied from **whitespace-normalised display output** rather than printed with
`pl.context()`. Both aborted before writing, which is the helper working. `START_HERE` says print
`repr()` of the real text before writing an anchor; I did it the third time.

---

## 513–515 · 31 July 2026 · the community outcome form, and the second clock

**513 — the outcome form.** Shipped as designed in `references/outcome_v2.html` (style 4
layout, style 2 flow — the one Theo picked on 29 July). Four outcomes on the community
client page: Awarded, **Still waiting** (second, because it is the most common), Referred
onward, Not awarded. No reason field. It renders as a pane inside `#cr-cc` rather than an
overlay, so it adds no fixed positioning, nothing for `#pwaNav` to strand, and **no 14th
writer of the global body scroll lock** — that count is still 13.

Field names were all grepped first and all six were at **0 occurrences**: `funded_by`,
`referred_to`, `referred_at`, `tarped_at`, `check_back_at`, `award_cycle`. Money reuses
`checklist.bid.awarded_amount`, which already had `promptForBid()` writing it and
`.cr-bidstrip` displaying it — the corrected field list in `OPEN_ITEMS.md` §1 caught that
before it became a second, diverging number.

Two ordering decisions worth keeping:

- **Checklist patch runs before `setStage`.** `setStage` fires its own `patchProjectCk`
  without awaiting it, and `patchProjectCk` reads `pr.checklist` synchronously at call
  time. A patch started after it races `stage_since` and `t_<stage>` and can drop them.
- **`mergeCk()` touches only the keys it is given.** `saveBid()`'s strip-every-empty-value
  pass would have deleted `bid_due_at` on the nine community jobs holding it as `''`.

**514 — the second clock.** `chDueIso(pr)` returns `check_back_at` when the stage is
`OnHold` and one is set, else `bid_due_at`. It feeds `chDueBand`, the deadline comparator,
the undated partition and the All-bids Due column, plus the client page's facts strip
(**Due → Check back**). A parked row drops the red `.cc-pill.due` for the neutral chip and
reads `N d hold`. The sort/filter label became **Due / check back**, because it is no
longer only the bid deadline. A *missed* check-back still bands Overdue, on purpose.

Scoped, not blanket-replaced: `bid_due_at` is referenced 19 times, and the two sites inside
`st === 'Lead'` branches are untouched — a Lead is never OnHold.

**515 — the Bill to card had lost its fill AND its border.** Pre-existing, found by 513's
own structural gate. `#cr-cc .ct.bill` painted with `var(--goodbg)`, declared inside
`#cr-ch2` and nowhere else; in `#cr-cc` scope the value is invalid, so the whole
`background` declaration was dropped — taking the gradient border with it, exactly as that
rule's comment warns. Same class as 481, second time in six builds.

**Gates.** `check_build.py` green at each of 513, 514, 515, each against its predecessor
with its own marker and negative control. jsdom harness `oc514_harness.js` — **74/74**,
running the shipped `cr-cc-script` verbatim and the hub's `chDueIso`/`chDueBand` lifted out
by brace-matching, against real-shaped rows (`checklist` as a JSON string, `bid_due_at` as
an empty string).

**And the instrument the last session lacked: Chromium.** This environment has it, so
`css515_chromium.js` ran `getComputedStyle` over the shipped stylesheet and the shipped
renderer's own markup — **26/26 across dark and rb-light**. It is what proved 515:
`.ct.bill` computes `background-image: none` at 503 and a real gradient at 515. Two harness
reds along the way were both **the test's fault** — splitting CSS on `}` tore an `@media`
prelude and read as an unprefixed selector, and a bare `--goodbg` count found the string
inside 515's own explanatory comment.

Contrast computed rather than eyeballed: the mock's `--dim` for the small labels measures
**4.33:1 dark and 3.24:1 light** on `--raise`, under the floor, so the build uses `--mute`
(**6.21:1 / 5.39:1**). Every other text pair in the step clears 4.5:1 in both themes.
Colour *correctness* is still Theo's eyes.

**Left alone deliberately:** the check-back default is **1 yr preselected**, as the approved
mock draws it. Theo has never actually answered 3mo/6mo/1yr/2yr — it is a preselection on a
segment that is always on screen, and it is a one-token change.

---

## 516 · 31 July 2026 · the desktop left menu

Theo: *"On the Desktop can you please just put a menu over to the left side, that way the screen is
not so stretched out… all 3 CRMS, everything in the SELL section, everything in the DAILY sections."*
Four designs were drawn; he picked **2 with 4's content cap**, then asked for the remaining sections
in as well, with the headings collapsible *"as that may be alot."*

**It does not hardcode a menu, and that is the whole point.** `#navMenu` is assembled at RUNTIME by
**nine** modules — `cr-cpartners-script`, `cr-menu-script`, `cr-lil-script`, `cr-sf-script`,
`cr-pb-script`, `cr-ci-script`, `cr-ch2-script`, `cr-sc-script` and the main block. `cr-menu-script`
alone **renames `Insurance` → `CRMs` and `Office` → `Resources`**, hides `recents`, hides
`reports`/`feed`/`settings` from non-admins, and builds an admin-gated **Admin** section. A menu
copied out of the static markup would have shipped with two section names the app has not used for
builds, missing ten runtime items, and no admin gating.

So `cr-lnav-script` **mirrors the live `#navMenu`** and clicking a row **clicks the real `.navopt`**.
One dispatcher, no second copy of the routing, and every future injected item appears for free. This
is `syncJobMenu()`'s shape, which already does exactly this for the job menu — the convention
existed, so it was copied rather than reinvented.

**The stretch itself.** `.wrap` ships `max-width:none` and carries 25 elements. `body.cr-lnav-on
.wrap:not(.masthead)` caps it at 1180. Five views out-specify that with their **own** deliberate
widths and keep them — Settings 640, Communications 900, Audit 980, Activity 1500, **Schedule Board
1700** — which is correct; squeezing a 1700px calendar to 1180 would be a regression dressed as a
fix. `#bannerMount` keeps 100% through its own ID rule. After 516 **no `.wrap` is left unbounded.**

Desktop-only via one `--lnav-w` custom property (0 below 1100px, 238 above) so there is no second
copy of the breakpoint to fall out of step. Phones are byte-for-byte unchanged.

**Gates.** `check_build.py` green. New harness `lnav516_harness.js` — **32/32** — and it is a
different instrument from anything before it: it loads the **whole real `index.html`** in Chromium
off `file://`, boots all 103 script blocks with the network blocked at the route level, and drives
the actual sidebar. jsdom could not have run this: it resolves neither the media query that gates
the menu nor the `calc()` that sizes the cap.

**Three reds, all three the test's fault**, which is roughly the project's long-run average:
- asserted the cap on `.wrap[0]`, which is `#bannerMount` — the one element with a deliberate ID
  override. *Scope the assertion.*
- then asserted every `.wrap` should read 1180, which would have condemned the five views that set
  their own width. Rewrote it to the property that actually matters: **nothing is left `none`**.
- a bare `--goodbg` count found the string inside 515's own explanatory comment.

**One real defect, caught by the screenshot and not by 30 passing assertions.** `ready()` tested only
that `header.site` was visible — but on the **post-login landing** the header is still there, so the
menu mounted behind `#landingView` (fixed, `inset:0`, `z-index:150`, so it covered it — invisible,
and one stacking change from visible). Now keyed on the app's own signals: `header.site` shown,
`navWrap` shown (what `showLogin()` toggles), `#landingView` hidden. Uses `getComputedStyle`, not
`offsetParent`, because both of those elements are `position:fixed` and `offsetParent` is null for
fixed elements by spec — an `offsetParent` test would have read every one of them as hidden.

**Filed, not fixed:** **Sales Floor** and **Self Check** are appended past the last `.navsec` — after
the build stamp — so they belong to no section in the burger menu either. The sidebar buckets them
under **More** rather than dropping them. Worth giving them a real home eventually.

---

## 517 · 31 July 2026 · Theo's menu reorganisation

> *"Sales floor lives in and is the main part of Sell section. The objection coach is already in
> Sales Floor. Health check goes into admin. ABC Supply should go into admin as well"*

**Reproduced as an admin before touching anything**, which changed the answer: **Health Check was
already in Admin** — `addAdminSection()` has always put it there. What he was reading was the
signed-out screenshot from 516, and the Admin section does not exist for a non-admin at all. Told
him rather than "fixing" it.

| | |
|---|---|
| Sales Floor | now **first in Sell**. `cr-sf-script` appends it at the tail of the whole menu, past the build stamp |
| Objection Coach | **hidden** — reachable inside Sales Floor, and one route per destination |
| ABC Supply | into **Admin** |
| Health Check | already there, unchanged |
| **Community Partners** | **was listed twice** and neither of us asked about it — `cr-menu-script` puts one under CRMs and `cr-cpartners-script` appends its own. The duplicate is hidden |

Lives in `cr-menu-script` because that module already owns this exact surgery — it renames two
sections, hides items per-role, and moves reports/feed/settings into Admin. A second module doing
menu surgery beside it is the "new mechanism beside an existing one" failure.

**Two things that had to be right or it would have silently done nothing.**

`apply()` stops polling the moment it first returns true, and it returns true as soon as any
`.navopt` exists — which is long before `cr-sf-script` injects Sales Floor. So `reorg()` gets **its
own** 300 ms × 60 poll, outlasting both `cr-sf-script`'s retry and `cr-cpartners-script`'s tick, then
stops rather than leaving a timer running.

And it **hides rather than removes**: `cr-cpartners-script.ensureMenuOption()` re-adds its option
whenever `querySelector('[data-nav="community-partners"]')` finds nothing, so removing it starts a
tug of war that never settles. A hidden node satisfies that check. `hideOpt()` is this module's own
convention and 516's sidebar already skips `display:none` rows.

**ABC Supply for a rep is deliberately unchanged.** The move is conditional on the Admin section
existing, so a non-admin keeps it in Sell rather than silently losing the tool. Making it
admin-only is a permissions decision, and it is Theo's — flagged, not taken.

**Gates.** `check_build.py` green. New `reorg517_harness.js` — **14/14**, and it reads the menu the
app actually builds **in both roles**, because the Admin section only exists for one of them and a
single-role run would have proved half of it. 516's own harness re-run against the same file:
**32/32** — the left menu mirrors, so it followed the reorganisation with no changes at all, which
is the payoff of not hardcoding it.

---

## 518 · 31 July 2026 · the content cap was far too tight — my own regression from 516

Theo photographed his ultrawide: *"The proportions are off a bit please fix."* He was right, and it
was mine.

**Reproduced at his actual resolution before touching anything.** At **3440×1440** with the 238px
menu, 516's flat `max-width:1180px` left the dashboard as a **1180px island with 1011px of dead
black on each side** — objectively worse than the stretch it was meant to fix. A flat pixel cap
cannot serve a 1280 laptop and a 3440 ultrawide at the same time, and I picked the number against a
1280 frame.

Now proportional: `min(2400px, 92%)`. Measured across five widths, no overflow at any of them:

| Screen | Content | Gutter each side |
|---|---:|---:|
| 3440 | **2400** | 401 |
| 2560 | 2136 | 93 |
| 1920 | 1547 | 67 |
| 1440 | 1106 | 48 |
| 1100 | 793 | 34 |

`min()` rather than `clamp()` deliberately: a `clamp()` floor wins even when it overflows, so a
narrow window would have gained a horizontal scrollbar. With `min()` the percentage takes over on
small screens and it can never overflow.

**The harness had to change too, and the reason is the same mistake in miniature.** 516's gate
asserted the literal `'1180px'`. That tied the test to one screen size — exactly what the cap itself
got wrong. It now identifies capped elements by elimination and adds a real ratio check at 3440:
content ≥2200 with gutters <550. **33/33**, up from 32. 517's harness re-run: **14/14**.

---

## 520 · 1 August 2026 · both dashboard columns spread right

Theo, with a photo of his ultrawide: *"On desktop, can you make the left column expanded over to the
right and the right side activity column expand over to the right."*

**Measured at 3440 before changing anything**, which named both halves precisely: the content sat
**639–3039 with 401px of dead black on each side**, and `.homeside` was pinned at a flat
`flex:0 0 320px` — so the Activity rail stayed a narrow strip however much room was going spare
beside it.

Cap 2400 → **`min(2900px, 95%)`**; rail → **`clamp(320px, 22%, 460px)`**.

| Width | main (was → now) | Activity (was → now) | dead each side |
|---|---|---|---:|
| **3440** | 1988 → **2348** | 320 → **460** | 401 → **151** |
| 2560 | 1724 → 1654 | 320 → 460 | 93 → 58 |
| 1920 | 1135 → 1170 | 320 → 336 | 67 → 42 |
| 1440 | 694 → 730 | 320 → 320 | 48 → 30 |
| 1100 | 381 → 407 | 320 → 320 | 34 → 22 |

`clamp()` here where `min()` was right for the cap, and the difference is the point: the rail needs a
**floor** so a 1440 laptop cannot squeeze it thin, and a **ceiling** so it does not run away on an
ultrawide. The cap needs neither floor nor ceiling — only a ceiling and a percentage — which is why a
`clamp()` there would have introduced the overflow risk 518 avoided.

At 2560 `main` gets 70px *narrower* because the rail took 140. That is the trade he asked for, not a
regression.

Scoped to `body.cr-lnav-on`, so it only applies where the desktop menu mounts. Phones and tablets are
untouched, including the existing `@media (max-width:900px)` rule that makes the rail full width.

**Gates.** `check_build.py` green. All four harnesses re-run — **147 assertions**, no change needed
to any of them: 518's ratio check at 3440 (content ≥2200, gutters <550) still holds at 2900/151.
No horizontal overflow at any of the five widths.

---

## 521 · 1 August 2026 · the white footer and the floating CRM bar, off the desktop

Two screenshots: *"Non readable on 1st white the white footer? 2nd screen unneeded crm switcher black
bar and white footer."*

**`footer.site`** is one line of boilerplate — *"Cardinal Roofing & Renovations — Client Resources:
profiles, inspections & estimates."* — painted `background:var(--paper)`. **`--paper` is declared
exactly once, on `:root`, as `#ffffff`, and is never themed**, so that footer is a white slab across
the near-black page in *every* theme. It was already hidden for Community, for Insurance, for the
community hub and for an open community client — **Retail was the only place still showing it.**

**`.cd-crmbar`** is `position:fixed; bottom:calc(104px + env(safe-area-inset-bottom,0px))`. That
104px is clearance for **`#pwaNav`, the phone bottom bar**. A desktop has no bottom bar, so it hovers
over the content clearing nothing, and since 516 it also duplicates the CRM control in the left rail.
**The "black bar" is not a separate element** — it is this one's own
`background:rgba(16,17,19,.95)`.

Both hidden under `body.cr-lnav-on`. Verified in Chromium at 3440 and at 430: desktop `none`/`none`,
phone `block`/`flex` — unchanged.

### Two things left standing, deliberately

- **The phone still shows the white footer**, and the computed background there is
  `rgb(255,255,255)` — measured, not assumed. Theo reported it on desktop, so it is fixed on
  desktop. Fixing it properly means theming `--paper` or giving the footer its own token, which
  touches every surface that reads `--paper`. Flagged, not taken.
- **Hiding `.cd-crmbar` on desktop removes the only CRM filter on the Client Directory** — the chips
  are `All / Retail / Claims / Community`, and there is no CRM option in `cdShFilter`. He called it
  unneeded and he uses the screen daily, so it is gone as asked; the alternative (move the chips
  inline at the top of the directory instead of floating them at the bottom) is a small change if he
  wants the filter back without the bar.

**Gates.** `check_build.py` green. All four harnesses re-run — **147 assertions**, unchanged.

### Recon note

The regex `[^};]*footer\.site\s*\{\s*display:none\s*\}` **hung the file** — an unbounded negated
class over 3 MB, exactly the backtracking trap `CLAUDE.md` records. Second time this session that
warning earned its place. Bound the window or walk back with `rfind`.

---

## Build 522 — the retail cards, raised the way the home page card is

> "Make all the cards in every retail section the same style as the home page. Raised just like home."
> …then, mid-build: **"Wait I didn't mean color I meant raised cards"**

That correction is the whole entry. The first draft was a colour change and it was wrong.

### What shipped

One new block, `<style id="cr-raise-styles">`, appended before the last `</body>`. **Geometry only** —
the patch script asserts the block contains no `color:` or `background` declaration at all, and the
Chromium harness proves background and ink are byte-identical to 521 on all 38 probed elements.

`.pipecard`'s raise, minus its palette half:

```css
border-top:2px solid var(--rbe-ridge-t);
border-bottom:2px solid var(--rbe-ridge-b);
box-shadow:var(--rbe-ridge-sh),inset 0 1px 0 var(--rbe-ridge-hl);
```

**Exactly three rules in the file carried that raise before this build** — `.pipecard`, `.actcard`
and `section.history`. Everything else in retail was flat (a 1px border, no shadow) or on the older,
much weaker `--rbe-cardshadow`. That is why the client profile read flat beside the home page.

**32 selectors raised**, across client profile, client list, team, documents, reports, settings,
estimates, punch, Sales Floor and the production board.

### The shadow follows the page, the bevel follows the card

`--rbe-ridge-sh` is **left alone**: the drop shadow falls on the page, and the page is themed, so
the token is already right in both (`0 14px 30px rgba(0,0,0,.8)` dark, `0 4px 12px rgba(0,0,0,.08)`
light).

The two **edge** tokens are re-declared on the card, per ground family, because the edge sits on the
card and most retail cards are a hardcoded `#fff` in *both* themes — `.dbrow`, `.acxsec` and twenty
more never got tokenised. `#454552` over `#050507` is a highlight on the dark home card and a grey
line over a black one on a white card. **One recipe, three tunings** (light / token / dark), not
three recipes.

### The colour draft that did not ship — and why

The first version flipped the cards to the home card's gradient. It would have shipped an
**unreadable client profile**: `.ackv div` and `.acxtrs label` carry `#2b2b2b`, `.axnote` `#5c4a42`,
`.dbrow .dbgo` and `.dbic1` `#23507e` — all inherited from when those cards were white. Build 420
already recorded this exact class ("`.mrow` carries `color:#1b1b1b` from when this card was white …
the address sat at 1.4:1 on `#2e333b`"). It was caught by auditing descendant inks *before* writing
the rule, not by a gate.

### Four cascade traps, all found before shipping (BUG_CLASSES §9)

1. `cr-keeper-styles` already styles `.projinfo` / `.jobvalrow` / `.jabox` at **(1,3,1)** with
   `box-shadow:var(--rbe-cardshadow)`. A plain `body:not(…):not(…) .projinfo` is (0,3,1) and
   **loses**. Those three carry `#projectView` for specificity, not scope.
2. …and `.projinfo:hover` is **(1,4,1)**, higher again — it would have snapped back to the weak
   shadow under the cursor. It gets a companion rule.
3. `.acxsec.rvsec` is the dark red review card with a deliberate red inset highlight. Gating
   `.acxsec` at (0,3,1) would have overridden it. Hence `.acxsec:not(.rvsec)`.
4. **`#teamView .tmcard` is deliberately flattened** (`box-shadow:none;border:0;border-radius:0`) —
   the Team redesign turned `.tmcard` into a row inside a `.tmbody` container. Raising it would
   fight that design. `.tmcard` was dropped; **`.tmbody`, the actual Team card, is raised instead**,
   and only from below because `.tmband` is its top edge.

Selectors with a `:hover` shadow (`.jatile`, `.bday`) are deliberately left **ungated**, so their
(0,1,0) stays below the (0,2,0) hover rule and the lift on hover survives.

### Deliberately not touched

- **Radii.** Home is 12px, several targets are 6–10px — but `.acxsec` holds a light `.acxhead` strip
  with square corners as its first child, and rounding the parent without the child leaves the
  header poking out of the corner. The raise reads from the shadow and the bevel. Separate pass.
- **`.rptkpi`'s red top cap** and **`.setrow`'s red left edge** — semantic, fixed in both themes.
  Both asserted unchanged.
- Chips and insets the sweep flagged that are not cards: `.projcount`, `.hstat`, `.payhead`,
  `.paynet`, `.actbox`, `.ljab`, `.ljfact`, `.ljcmsg`. Dashed placeholders (`.solCard`,
  `.cdsoonpanel`) are dashed on purpose.
- Claims and Community, on every selector they skin — asserted, both CRMs, both themes.

### Gates

`check_build.py` green. `harnesses/raise522_chromium.js` — **112 assertions, 0 failed**, loading
both 521 and 522 in real Chromium and diffing computed style.

**One red was the test's fault, again.** Four assertions claimed Claims still got `.projinfo`'s
raise. Reading the matched rules showed **zero** rules matched under `claim-insurance` — Chromium
had handed back a **stale computed style** because the harness flipped the body class and read
`getComputedStyle` in the same task. `.dbmoney` beside it had already recalculated; `.projinfo` had
not. Split into separate tasks with a wait, all four pass. The file's "roughly half of all reds are
the test's fault" rule earning its place.

### Honest limit

**In `rb-light` the raise reads clearly.** On the near-black retail ground it is **subtle** — a black
drop shadow has almost nothing to cast onto a near-black page, so the `#d9d9d9` bottom lip does most
of the work. That is arithmetic, not a bug: a *white* card cannot read raised on black the way the
dark home card does, because home's lift comes from a light top edge over a darker body. Making the
retail cards look like home on the dark ground would mean giving them home's ground — which is the
colour change Theo explicitly ruled out.

---

## Build 523 — Quick Inspect and the estimate screens, made readable

> "Can you fix the quick inspect and estimates pages. Not able to read words."

**Reproduced before fixed.** `harnesses/legibility523_probe.js` renders the real
markup those modules emit — `cr-ci-script`'s own `shell()/open()/read()/review()`, the four
`<template>` blocks the estimates module clones, and the estimate editor driven through its own
exported `openEditor()/refreshSavedList()` — in real Chromium, resolves the ground each text node
is *actually* painted on, and computes the WCAG ratio. Every replacement came from
`scripts/contrast.py`. **74 failing pairs → 3**, and all three survivors are out of scope
(below).

### The probe was wrong three times first — each is a standing trap

1. **Every `--cr-*` palette is declared on its OWN mount** (`#cr-estimates-mount`,
   `#cr-pricing-mount`, `#cr-claims-mount`), not on `:root`. Cloning the templates into the page
   made every `color:var(--cr-muted)` invalid, so elements inherited body's `#1b1b1b` and **30 fake
   1.15:1 failures** appeared. Textbook "scope the assertion, then read what it captured".
2. **A gradient's painted colour is not `backgroundColor`** — that reads transparent, so a naive
   ancestor walk invents a ground. "Edit Estimate" was reported at 1.12:1; it sits on
   `.cr-est-head`'s dark gradient and is fine. Fixed by treating every gradient colour stop as a
   candidate ground and keeping the worst.
3. **Gradient-clipped text** (`-webkit-text-fill-color:transparent`) is painted *in* the gradient;
   `color` is only the no-clip fallback. Measuring it as ground put the Estimates title at 2.17:1.
4. …and `.cr-est-saved-list .head` only matches when the slot carries the class
   `injectOnProfile()` gives it. A bare div reported 1.15:1 on text that is really `#6b6b6b`.

### What was actually wrong — 26 values, all measured

| | was | now |
|---|---|---|
| `#cr-ci label` + `.req` (every field label) | `#c8202e` on `#202329` — **2.78** | `#f08a90` — 6.55 |
| `#cr-ci .busy` (the whole reading-the-screen state) | `#6b6357` — **2.66** | `#b0a89c` — 6.69 |
| `#cr-ci .found .miss` | `#a5a5a5` on `#f4f8f4` — **2.30** | `#6f6f6f` — 4.69 |
| **seven** rules of `#1a1a1a` on `#c8202e` (Save, + From Library, + Attach Photos, move-button hovers, cover chips, the dupe button) | **3.07** | `#fff` — 5.67 |
| `.cr-est-lineitem .del` | `#a89e88` on white — **2.65** | `#767066` — 4.91 |
| `.cr-est-saved-list .head` | `#6b6b6b`, untokenised — **2.95** | `var(--rbe-mute)` — 7.55 dark / 4.97 light |
| `.cr-chrome-badge` | white on `#c87a00` — **3.37** | `#1a1a1a` — 5.17 |
| `.cre-note` / `.cr-footer` | faint grey — **2.38** light | the module's own `--cr-muted` — 5.33 / 7.10 |
| `#cr-epub-btn`, `#cr-epub-preview-btn`, `#cr-e2c-btn`, `.pv-head button` | `#e35c63` — **3.97** | `#f08a90` — 5.81 |

**The four `#id` button rules were a second pass.** Publish, Preview and → Contract are injected
into `.cr-est-head` by three *other* modules and each carries an `#id` rule — **(1,0,0) beats
`.cr-est-head button` at (0,2,1)**, so fixing the class rule moved Cancel and nothing else. Only
re-running the probe against the patched file found them. Same for `#cr-ci .req`: fixing a label
without its children leaves one 2.78:1 behind.

**One self-inflicted regression, caught the same way.** The first pass flipped `.cr-tmpl-lbl` to a
flat `#e35c63` — fixing dark by breaking light (3.51:1 on the white card). No single red clears 4.5
on both `#101218` and `#ffffff`, so the value has to follow the theme: `--cr-red` stays (4.90 light)
and dark gets one scoped override.

**`#c8202e` stays.** Cardinal red is brand and semantic; what changed is the ink on it.

### Deliberately left, and why

- `#cr-est-new-btn` — `#1a1a1a` over `linear-gradient(135deg,#c8202e,#c88a0f)`. Dark ink is right on
  the gold end and 3.07:1 on the red end; white ink would fail on the gold end instead. Fixing it
  means changing the brand gradient — a design decision, not a contrast fix.
- `.cr-est-saved-row .status.*` at 3.99:1 — semantic pill family, Theo's call per OPEN_ITEMS.
- `.cre-sheet .ph button.ap` ("Apply") at 4.05:1 in `rb-light` — that is `--rbe-ok`'s light value
  `#2f8f56`, and **`--rbe-ok` has 22 references app-wide**. An app-wide token change is its own
  deliberate build, not a rider on this one.
- Pricing Catalog `span.count` at 4.29:1 — a different screen from the two named.

**Also found, not fixed:** `#1a1a1a` on `#c8202e` appears **12 more times** outside these two blocks.
Same defect, other modules. The assertion in `patch523.py` is scoped to the two blocks and proves
those 12 were left untouched.

**Gates.** `check_build.py` green. Probe 74 → 3. All five prior harnesses re-run, unchanged.

---

## Build 524 — delete an estimate, with the SQL that makes it real

> "Also can you have an option to delete estimates within the page."

### The SQL is not optional — verified against the live database

`public.estimates` has RLS on and exactly three policies: `est_read` (SELECT), `est_write` (INSERT),
`est_update` (UPDATE). **There is no DELETE policy.** Under RLS that is not an error, it is a silent
refusal: PostgREST answers with **204 and no error body**, the row survives, and the client cannot
tell it apart from success. A Delete button shipped without `estimates_delete_policy.sql` would
be a lie.

```sql
create policy est_delete on public.estimates for delete to authenticated
  using ( is_full_access() or created_by = my_email() );
```

`is_full_access()` is theo/joan/curtis/scottie. That mirrors `est_write`'s ownership rule rather
than inventing a new one; `created_by IS NULL` rows end up admin-only, the safe default.

### Hard delete, not archive — and the schema is why

- `estimates.line_items` is **jsonb on the row**, and **nothing has a foreign key to `estimates`**.
  Deleting the row is complete and leaves no orphans. (`estimate_line_items` is the shared price
  book, unrelated.)
- The `archived` column exists but is **dead**: 0 of 11 rows use it, and the app only reads it in
  `loadForProject`'s `.eq('archived', false)`. 8 of the 11 rows are drafts — which is presumably
  why Theo wants them gone rather than filed.
- A document already published from an estimate (`doc_id` / `contract_doc_id`) is **kept**. A signed
  PDF should outlive the draft it came from.

### One pipeline, two entry points

`deleteEstimate(id, opts)` does the confirm, the delete, the verification, the audit entry and the
refresh. The editor header calls it; each saved row calls it. Adding a second delete path later is
how this file grew two Estimates screens in the first place.

**`.select('id')` is load-bearing, not decoration** — it is the only way to tell a real delete from
an RLS refusal, and the harness asserts it directly.

Details worth keeping: Delete renders only when `s.id` is set (nothing to delete before the first
save); `wire()` **guards** it, unlike its unconditional neighbours which dereference
`querySelector()` immediately; the row control calls `stopPropagation()` because the row itself
opens the editor; and deleting the estimate you have open closes the editor.

**Gates.** `check_build.py` green. `harnesses/del524_harness.js` — **32 assertions, 0 failed**,
running the shipped module against a Supabase stand-in that can be told to refuse exactly the way
RLS does. All five prior harnesses re-run, unchanged.

---

## Build 525 — the landing page: raised cards, today's weather, and a quote you can read

> "Please raise all cards in the landing page as well. Also can you out today's weather at the top
> right next to cardinal. And above the quote, there is a big square section there that is unused"

**How the third sentence was read, stated so it is cheap to correct:** the landing is one narrow
column, and the only genuinely unused area is the band to the **right of the "Cardinal." wordmark**,
which sits directly above the quote — which is also exactly where the weather was asked for. Treated
as one instruction. If it meant something else, the panel moves and nothing else has to.

### First: the landing is not what the markup looks like

The inline-styled buttons under `<div id="landingView">` are a **dead fallback**.
`#landingView>*{display:none}` hides them and `cr-lr-script` overwrites the whole element with a
`.cr-lr` layout. Patching those inline styles would have changed nothing on screen. Found by
rendering the page, not by reading it — the prime doctrine, in the other direction.

### 1. Raised

Same recipe as 522 — bevel follows the card, drop shadow follows the page. `.cr-lr-roof` had a
shadow and gained the ridge edges; **`.cr-lr-pair button` had `box-shadow:none`** (measured at 524).
`.cr-lr-minor` is deliberately left flat: those are transparent ghost pills, not cards.

**Also restored, pre-existing and not caused here:** `html[data-mode="light"] .cr-lr-pair
button{border-color:#ded7cf}` is a *shorthand*, and it had been quietly eating the `--racc` accent
edge — orange Production, red Sales Floor — in light mode only. Verified against 524 before claiming
it: dark `rgb(224,118,42)`, light `rgb(222,215,207)`. Semantic colours hold in both themes.

### 2. Weather

**Open-Meteo, chosen because it needs no API key** — nothing secret enters the file. CLAUDE.md
records that a key has already been leaked on this project once; the durable fix is to pick a source
that doesn't have one.

Fetching a keyless third-party host straight from the browser is **this app's existing convention**,
not a new mechanism: `nominatim.openstreetmap.org` and `photon.komoot.io` are already called that
way for address lookup. Copied their shape — plain `fetch`, `try/catch`, `localStorage` cache
(20 min), silent `.catch()`.

Shows what decides a roofing day: condition, temperature, high/low, wind, and the rain chance (badge
only at ≥20%). On phones the high/low/wind line drops so the panel fits beside the wordmark.

**⚠️ Unverified against the live API.** The build container's egress proxy answers **403 to CONNECT**
for `api.open-meteo.com`, so the response schema could not be confirmed from here and is not being
claimed. Everything is written to degrade to nothing instead: the panel ships `hidden` and only
un-hides once a response has actually parsed into a numeric temperature.

**The wordmark overlapped the panel at phone width** — `clamp(38px,12vw,58px)` and it does not wrap,
so it ran straight under. Caught by measuring `getBoundingClientRect()` overlap, not by looking.
Now `clamp(28px,8.2vw,58px)` inside `.cr-lr-head`; measured overlap 0 at 430px.

### 3. The quote was invisible in light mode

Found while rendering for (1). **The same defect four times:** every `html[data-mode="light"]`
override targets the **parent** while the child carries its own colour, so the child never changes.

| | on `#f7f5f2` | |
|---|---:|---|
| `.cr-lr-quote p` `#f0e6da` | **1.13:1** | literally unreadable — cream on cream |
| `.cr-lr-quote cite` `#9c8b7e` | 3.01:1 | |
| `.cr-lr-minor button` `#9c8b7e` | 3.01:1 | |
| `.cr-lr-foot .pp` `#8d7f73` | 3.56:1 | |

The override sets `.cr-lr-quote{color:#5f564f}`; `.cr-lr-quote p` has its own `#f0e6da` and wins.
Identical in shape to 523's `#cr-ci label` vs `.req`, two builds apart, in a different module.

### Gates

`check_build.py` green. `harnesses/wx525_harness.js` — **56 assertions, 0 failed**, running the
shipped module against a stubbed fetch. **Eight failure paths** are asserted individually (network
refused, HTTP 500, non-JSON, empty object, schema changed, temperature as string, temperature null,
empty daily arrays) and every one must leave the four cards and the quote untouched. All six prior
harnesses re-run — **347 assertions total**, unchanged.

**A harness that "hung" did not.** Twelve `pretendToBeVisual` JSDOM instances each keep a rAF loop
alive, so node never exited, so `tail` never saw EOF and printed nothing. The run had completed.
Close the windows and `process.exit(0)`.

---

## Build 526 — the landing page, four corrections

> "Can you make the background black like the retail page i cant remember what that black is called.
> Also seperate the 4 cards a bit so they look better. Make the resource library at the bottom stand
> out a bit more along with the schedule board as they are both important"
> …then: "Also make these text raised as well — Cardinal. / Roofing & Renovations / [the weather] /
> Good evening, Theo. / Friday · July 31"

**The black is `--bg`, `#09090C`** — declared once on `:root` beside `--paper`, and used by
`body{background:var(--bg)}`. That is the retail page ground. The landing had `#14100e`, a warmer
brown-black, so the two screens never matched. Now `var(--bg,#09090c)`, with the literal fallback
448–449 requires. Measured after: `rgb(9, 9, 12)`.

**525's weather is confirmed live.** Theo quoted his own reading back — "75° Overcast, H 88° · L 63°
· 3 mph" — which is the verification the blocked egress proxy could not give from here. The
unverified-schema caveat on 525 is now closed.

### The four cards, separated

`.cr-lr-roof` was a single clipped slab — `border-radius` + `overflow:hidden` around four seamless
rows divided by a hairline and an inset seam shadow. Splitting them means the **container stops
being a card and each row becomes one**: the roof gives up its radius, clipping and shadow; every
`.cr-lr-course` takes them, in an 11px flex gap.

Two things the container was quietly doing that now have to be done per card:

1. **`overflow:hidden` was clipping the `::before` accent bar.** Without it on each card, the bar
   squares off the rounded corner.
2. **`.cr-lr-course + .cr-lr-course` is (0,2,0)** and beats a plain `.cr-lr-course` rule no matter
   how late it sits. Named explicitly rather than hoped over.

Measured after: gaps `[11, 11, 10]`, radius `12px`, `4/4` cards carry a shadow, `overflow:hidden`.

**And one stray from 525, caught by measuring rather than looking:** `html[data-mode="light"]
.cr-lr-roof{border-top:2px solid #ffffff}` survived `border:0` on specificity and drew a white line
above the first card in light mode. Now `border:0` there too.

### Library and Schedule Board promoted

They were `.cr-lr-minor` — transparent ghost pills, **which is the tier I chose for them at 525 and
exactly what he is correcting**. They move to the `.cr-lr-pair` treatment Production and Sales Floor
already have: solid ground, accent top edge, icon, title, one line of description, raised. Verified:
the pair grid now reads Production · Sales Floor · Resource Library · Schedule Board.

That leaves "All clients · N" alone in `.cr-lr-minor`, which is right — an admin shortcut, not a
destination. It only renders for `seeAll`, so the row can now be **empty**:
`.cr-lr-minor:empty{display:none}` rather than a stray 14px of margin around nothing.

### Raised type

Letterpress, and it **inverts per theme**: on the dark ground the lift is a shadow *below* the
glyph; on paper it is a highlight below with a soft shade under it. `.cr-lr-wx .ic` gets a
`drop-shadow()` filter instead — it is an emoji, not text.

**Checked before writing it:** none of the five targets carry
`-webkit-text-fill-color:transparent`. A `text-shadow` behind a transparent fill paints as a smear,
not a lift. The patch script asserts this against the file. (`.cre-h` on the Estimates screen *is*
clipped — that is the one to keep away from.)

Kept deliberately light on the 10px monospace: 523 was spent making this page readable and a heavy
shadow at that size gives it back.

### Gates

`check_build.py` green. All seven harnesses re-run — **347 assertions**, unchanged.

---

## Build 527 — the Schedule Board

> Theo, with a screenshot of it: "Can you fix this page"

Measured in Chromium, not guessed. Three things:

1. **It was the one retail surface never tokenised.** `.bday{background:#fff}` — fourteen white
   slabs down a near-black page.
2. **`.bnone` ("Nothing scheduled") was `#a89f9a` on that white — 2.6:1**, and it is the text on
   thirteen of the fourteen cards.
3. **The wrap carried an INLINE `max-width:1700px`**, which no stylesheet rule can beat, so the
   desktop cap every other page follows never applied and the column sat stranded.

### The inks had to move with the ground

The trap 523 and 525 were both spent on. On the retail card (`#2e333b`→`#262a31`) the existing inks
read:

| | | |
|---|---:|---|
| `.bhead` `#8f1620` | **1.39:1** | the date on every card |
| `.btime` `#555555` | **1.70:1** | |
| `.bcli` `#1d4f91` | **1.56:1** | the client name |

Darkening the card alone would have made this page **worse** than the white version — unreadable
rather than merely jarring. All replaced with computed values: `#f08a90`, `var(--rbe-ink)`,
`var(--rbe-acclt)`, `var(--rbe-mute)`.

`.bday` already carried 522's raise with the **light** bevel, because it was a white card then. It
isn't any more, so the bevel is retuned with it — "the bevel follows the card", as 522 established.

Gated retail-only rather than edited at source, so Claims and Community keep what they have.

### The width — and a regression the harness caught

Deleting the inline width outright dropped the board to `.wrap`'s 1180 whenever the sidebar is off
— **a tablet regression dressed as a fix**. `lnav516_harness` failed on it, correctly.

The fix is to move the width into CSS rather than delete it: `#boardView .wrap{max-width:1700px}`
keeps the no-sidebar case, and `body.cr-lnav-on #boardView .wrap{max-width:var(--lnav-cap)}`
out-specifies it when the sidebar is on — which is the case Theo photographed.

**The 516 harness was then updated, because its assertion had become stale by intent**: it encoded
"boardView keeps 1700 even with the sidebar", which was true at 516 and is deliberately no longer
true. Now four own-width views, and the board asserted as capped rather than unbounded.

### One self-inflicted red worth recording

The patch script asserts that no collapsed ink survives into the new block — and tripped on
`#8f1620` **inside its own explanatory comment**. CLAUDE.md records exactly this ("patch scripts
document the values they change, so a naive count finds the value in its own explanatory comment").
Comments are stripped before the assertion now.

### Not verified visually

The computed style is proved — card ink `#cfd6df`, heading `#f08a90`, background a gradient rather
than `#fff`. A screenshot was **not** obtained: `#landingView` is a fixed overlay and the app's own
view switching kept landing on the dashboard instead. Theo's eyes on the preview are the gate.

---

## Build 528 — the left nav loses its emoji

> Theo, shown five styles: **"Go with 2 then 5 on the light"**

Style 2 (solid glyphs) as the default, style 5 (keyline marks) in the light theme. **Both sets are
emitted on every row and CSS picks one**, so flipping the theme costs no re-render.

### Which "light" — and why it matters

The landing's ☾ toggle sets `html[data-mode="light"]`, and CLAUDE.md is explicit that it is the
**landing only** — *"not an app-wide dark mode. Do not wire app surfaces to it without a decision
from Theo."* The sidebar is an app surface, so this gates on **`:root[data-theme="rb-light"]`**, the
app's actual retail light theme. Measured first: `cr-lnav-styles` had **zero** references to either,
so there was no existing convention to follow.

### Keyed on the label, not `data-nav`

Only **19** rows carry a `data-nav`. Import from AccuLynx, Production, Sales Floor, Resource
Library, Team and Health Check are injected by other modules with their own ids and none at all.
Slugging the label covers every row however it got there. 24 mapped keys plus prefix aliases;
**zero rows fell through to the generic mark** in practice.

**The emoji is part of the label text** — the rows are scraped out of `#navMenu`, whose buttons read
`"📅 Schedule Board"`. `stripEmoji()` walks code points rather than using a character class of
literal astral characters (fragile to author, worse to read), and **never returns empty**: if
stripping would eat the whole label, the original is kept.

**`#navMenu` itself is untouched** — asserted, 21 emoji labels before and after, 24 still live in
the burger menu. One source of truth for what the menu contains; the mirror is the only thing that
changed.

### The negative control earned its keep

The first gate run went **red**: marker `function iconFor(` was already present in the previous
build. **`cr-ahc-script` (Health Check) already has a `function iconFor(status)`.** Separate IIFEs,
so no runtime conflict — but CLAUDE.md's "a name is not a contract" lesson was paid for by exactly
this shape (`renderTeamPage` living in the Library module). Renamed to **`lnavIcon()`** rather than
leaving a future grep ambiguous.

### Three harness reds, all the test's fault — but the third mattered

`lnav516_harness` compares the mirror's labels to `#navMenu`'s **verbatim**, and 528 strips the
emoji by design, so two set-equality assertions failed on a cosmetic difference. The third —
**"clicking the sidebar row fires the real `.navopt`"** — failed for the same reason: it locates the
mirror row by exact `textContent` equality, so it found nothing and asserted against `undefined`.

That one was worth chasing rather than waving through: the click-through is the *entire point* of
the mirror. Routing is by `data-sec`/`data-i` index, not by text, so stripping the display label
cannot affect it — and with the lookup fixed the real button fires (`fired: 1`). Test stale, app
correct.

### Gates

`check_build.py` green. `lnav516_harness` extended with **six** new assertions — both icon sets on
every row (18/18), no emoji surviving, style 2 showing in dark, style 5 after flipping to
`rb-light`, at most two generic fallbacks (actual: zero), and the burger menu keeping its emoji.
All seven harnesses pass — **354 assertions**.

## 530–532 — my 510–512, rebuilt on top of 528

Two sessions ran this repo at once. While I built 510–512, another built 513–528 and merged
them. Mine were never merged, so `main` was missing all three — **verified against
`origin/main`, not assumed**: the 510 prompt fix absent, all five broken emoji escapes still
present, no trace of the illustrate feature in either file.

Renumbered so the changelog reads in the order things shipped. The work is unchanged.
`api/librarian.js` was taken wholesale — `main` has not touched that file since 508, and a
diff proved its copy byte-identical to my branch's parent, so only `index.html` was patched.

**Merging the old branch could not have broken the app:** GitHub refuses a conflicting PR.
The two conflicts were the footer build stamp and the head of the `CHANGELOG` array — both
sessions writing in the same two places. No conflicting logic anywhere.

### The changelog gate was wrong three times, always in the same direction

Each version flagged something that was fine:

| rule | flagged | why it was wrong |
|---|---|---|
| codepoint ≥ 0x1F000 | **⚡** U+26A1 | emoji need not be astral |
| exactly one codepoint | **◻️** U+25FB U+FE0F | a variation selector is a legitimate second codepoint |
| any letter in the slot | build 487, *"The documents…"* | a note with no emoji is a style choice, not this bug |

The signature that is actually right: **a non-ASCII character with an ASCII letter or digit
fused onto it** — precisely what `\u1F4DA` collapses to, U+1F4D plus `A`. Nothing else.

It also **only checked the first nine notes**, so it passed a file whose five broken escapes
sat further down. A gate that cannot see the bug it was written for. It now checks every
note and prints the recent nine plus every failure: **5 on 528, 0 on 531.**

**Three wrong rules and a coverage hole, all on a gate I wrote to catch a bug I had caused
six times.** Getting the failing case right is not the hard part — not flagging the passing
cases is.

---

## Build 533 — dark ink on cardinal red (was 529; rebuilt on main at 532)

Shipped first as **529** on a branch cut from 528. While it sat in review a parallel session merged
**builds 530–532** (PR #68), so the branch was three commits stale and its 529 stamp would have gone
**backwards** against main. Re-applied on top of their work rather than merged into it — the same
recovery this project ran at 513–519, for the same reason.

**Checked before rebuilding, not assumed.** All fourteen red-ink pairings were still present on main
untouched, and every marker from 522–528 survived their merge — `cr-raise-styles`, `lnav-ic`,
`lnavIcon`, `#boardView .bnone`, `deleteEstimate`, `cr-lr-wx`, all at identical counts before and
after. Their `next_build.py` (new, and useful) said 533.

### One defect in their merge, fixed here

`main`'s app stamp read:

> `v2026-08-01 build 532 — the desktop menu down the left uses proper icons instead of emoji`

The **number** was bumped to 532; the **summary** was left as build 528's. The app stamp is the only
version string in rendered markup and the one `currentBuild()` / What's New reads, so the app was
telling Theo that 532 was the nav-icon build. Their CHANGELOG entry for 532 is correct (Library
diagrams) — only the stamp was wrong. Bumping to 533 with matching text clears it.

**Worth generalising:** when renumbering a stamp during a collision recovery, the em-dash summary
has to move with the number. `check_build.py` only asserts the number *increases*; it cannot know
whether the sentence after it still describes the build.

### The fix itself — unchanged from 529

Fourteen pairings, 3.07:1 and 3.31:1 → **5.67:1**. `#c8202e` unchanged at 239 occurrences. The
fourteenth is an inline style in a JS string on the "Create & open estimate" button, found only
because two differently-shaped counts disagreed.

### Gates

`check_build.py` green, 532 → 533. Self-computing: dark-ink-on-red **14 → 0**, `#c8202e`
**239 → 239**. Nothing of 530–532 lost, asserted by count. All seven harnesses pass — **354
assertions** — against their base rather than mine.

---

## Build 534 — the librarian's diagrams stop intermittently leaking `~~stack`

**Asked for:** *"check if the librarian is actually able to make diagrams and illustrations —
the other session went in a circle and burned a lot of money by guessing and it not being
true"* … then *"do it"*.

**Answered by measurement, not reading.** The shipped `lbRich`/`lbDiagram` were lifted out of
`index.html` verbatim and executed: **33/33** render assertions and **20/20** Chromium
assertions (both themes, real computed styles) pass on 533. **The diagram engine works** —
four forms (`~~stack` `~~flow` `~~bars` `~~pitch`), model writes data only, app builds the SVG.
6 of 26 live library entries already carry one.

**The defect was the spacing contract around it.** `lbRich` splits on blank lines only and
`lbBlock` reads `lines[0]`, so a marker only draws when it *starts its own block*. One line of
prose immediately above it turned the diagram into a paragraph **and printed the literal
`~~stack` to the reader** — the worst available degradation, because it reads as a broken app.
`api/librarian.js` spends six prompt lines asking for that spacing (510) and `drawInto()`
force-wraps it (530), but **the free-form ask path had no normalisation at all**, client or
server. The only guard was the model choosing to obey an instruction.

**Fixed in `lbRich` itself**, not at the call site — one pipeline per concept, so the ask path,
the ephemeral photo path and every stored note are covered at once. New `lbSpaceMarkers()`,
four rules, each justified by what the parser actually does:

1. blank line **before** any marker line (all four forms)
2. blank line **after** a `~~pitch` line (it reads no data lines)
3. for `~~bars`, blank line at the first following line with no `|` (`lbDiagram` returns
   `null` on such a line, killing the whole diagram)
4. a line that is exactly `~~` closes the block instead of becoming a row

**Rule 4 came from production data, not a fixture.** The live *Attic Ventilation* entry ends
its flow block with a stray `~~` fence and has been drawing **a 4th step reading "~~"**. Found
by running all 6 real entries through both renderers — the kind of thing no invented fixture
surfaces.

**Deliberately not fixed, so it is not read as an oversight:** trailing prose after `~~stack` /
`~~flow`. Those carry no signal separating a data line from a sentence, so a rule would be a
guess; their failure mode is also the mild one (an extra band, capped at 8 rows).

### Gates

`check_build.py` green, 533 → 534, marker + negative control clean. **66 new assertions, 0
failures** — 51 functional, 15 against the six live entries. The load-bearing set is section B:
**534's output is byte-identical to 533's** for every correctly-spaced input (stack, flow, bars,
pitch, tables, bullets, numbered lists, headings, bold, plain prose). Nothing about how a
diagram looks changed. The only intended difference on real data is the Attic entry, asserted
as a difference rather than waved through. Two harness assertions went stale **by intent** when
rule 4 landed and were inverted rather than relaxed.

**Illustrations were investigated and NOT built** — see OPEN_ITEMS. Both librarian models are
text-only; there is no image generation anywhere in `api/`.

---

## Build 535 — the dark retail home: navy over black, indented in

**The scheme is Theo's, not mine.** He sent a photo of a checkout form — navy panel, near-black
inset fields — and asked "what about a dark navy over a black indented in?" It is better than
the glass I had proposed, for a concrete reason: **glass needs a backdrop to blur, and this page
is a flat `#09090C`.** I was faking it with edge light. Navy over black needs no trick.

    page   #09090C            unchanged
    card   #1A2434 → #141C29  lit #33496A top edge, raised
    well   #0A0E16 / #0D1220  recessed

**Depth is "slight", also his call.** My first pass ran the inset at `rgba(0,0,0,.85) 0 2px 5px`
and he was right that it was overcooked — on his reference the shadow does almost nothing and
the *value drop* carries the recession. Final: `inset 0 1px 2px rgba(0,0,0,.5)`, a hairline at
the top lip. Three strengths were previewed (deep / slight / flat drop) before picking.

**No iron grey.** `#2e333b`, `#262a31`, `#16161B` are what this replaces — with *hue*, not with
another grey, which was the actual complaint. The patch asserts none are reintroduced, **after
stripping CSS comments** — the block documents the values it replaces and the first run tripped
on its own explanatory note, exactly as CLAUDE.md warns.

**Gated, not edited at source**, the shape 522 and 527 used. One appended block, **24 selectors,
every one asserted to start with `:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community)`.**
Light mode, Claims and Community are out of reach by construction rather than by inspection.

### The calendars — a sanctioned decision overridden on instruction

CLAUDE.md recorded paper-on-iron as deliberate and told future sessions not to re-flag it. Theo
asked for it changed directly. **CLAUDE.md is corrected in this same commit** — otherwise the
next session reverts this on the strength of the old note. Light mode keeps paper-on-iron.

His list, each item gated: no red cap (was `border-top:5px solid var(--red)`) · white month
(which required *releasing a clipped gold→red→gold gradient*, or the text stays transparent) ·
white day numbers · every small square sunk · "all jobs" off the Production Calendar so the
header sits level — **hidden, not deleted from the JS**, so the string is still computed and
restoring it is one line.

**The unreadable text, measured:** other-month days were `#cfc4ba` on cream, ≈1.6:1. Now
**5.24:1**. All 8 text pairs on the new ground clear 4.5:1; lowest is 5.24.

### The pipeline orbs

`.pcirc` is reshaped from a 52px sphere into the cell's 3px top edge. **The stage colour never
leaves JS** — the class mapping is untouched, only the geometry moved. The whole strip is the
height the circle alone used to be.

### Gates

`check_build.py` green, 534 → 535, marker + negative control clean. **22 Chromium assertions, 0
failures** — and the shape of them matters: the source rules and the new block are both in the
page, so each assertion answers *which rule won*, not *does the file contain my CSS*. That is
the 481 lesson. Two negative controls confirm the light theme and Claims are untouched.

**Not in this build, so it does not read as forgotten:** the nav-style icon set for card titles
and left-menu option A. Both agreed, both 536.

---

## Build 536 — left menu, option A: the recessed channel, both modes

Theo picked A from three depth treatments, then **"I'll do A for both dark and light modes."**

**Why A won.** Every other card in this app is *raised*. A nav carved **into** the page reads as
chrome rather than as content — which is what a nav actually is. It also organises better than
the flat version, because the section headers become banded strips instead of floating labels.
The rejected option 1 (every row its own card) made the list read as five separate objects.

### The dark twin is designed, not recoloured — this is the whole trick

A carved well is lit from above: dark on the top/left inner edge, a light catch on the
bottom/right. **In light the shadow leads. In dark the shadow is already almost the page colour
and carries nothing, so the HIGHLIGHT has to lead instead.** Recolour the light rule and you get
a bump, not a dip. Asserted: the two `box-shadow` values differ, and the dark one contains
`rgba(255,255,255,.055)` while the light one contains `inset -1px 0 0 #ffffff`.

**Dark reuses 535's palette rather than inventing a second one.** The well is the same `#0A0E16`
as the home screen's sunk rows, and the active item is a `#1A2434` navy card sitting in it — the
exact inverse of light, where the well is grey and the active item is white. One system, two
grounds.

### Gates

`check_build.py` green, 535 → 536, marker + negative control clean. **12 Chromium assertions, 0
failures**, with the source `cr-lnav-styles` and the new `cr-lnav-a-styles` both in the page so
each answers *which rule won*. All 14 selectors asserted to be theme-scoped **and** confined to
`#cr-lnav` — nothing can leak into the app.

**A harness bug worth recording:** `block()` returns the captured `<style>…</style>` *including*
its tags, and the first draft nested those inside another `<style>`. The inner `</style>` closed
the outer one and the trailing rules rendered as visible text. **The assertions still passed** —
the captured blocks are valid style elements in their own right — so only the screenshot caught
it. Structural gates would not have.

**Still to come:** the nav-style icon set for card titles. Root cause already diagnosed —
`.pipetitle` clips `linear-gradient(100deg,var(--rbe-head),var(--rbe-head))`, the same colour
twice, with `-webkit-text-fill-color:transparent`. A flat fill pretending to be a gradient whose
only real effect is stripping colour from every emoji on the home screen.

---

## Build 537 — every card title carries the nav's icons

**Theo:** *"Make all Icon styles just like the nav menu icons."* Then, on the two weak reuses,
*"sure"* — draw proper calendar icons for both calendars.

**The bug, and it was never about the emoji.** `.pipetitle` clipped
`linear-gradient(100deg,var(--rbe-head),var(--rbe-head))` — **the same colour twice** — to text with
`-webkit-text-fill-color:transparent`. A flat fill pretending to be a gradient. It renders
identically to a plain colour, and its only real effect was stripping the colour out of every emoji
in a card title, which is why they came through as blank squares. The clip is released and replaced
with `color:var(--rbe-head)`, the colour it was already painting.

**Proved by pixels, because computed style cannot see it.** A `background-clip:text` element reports
`color:var(--rbe-acc)` while painting the gradient. So: two element screenshots, mean channel colour
compared in an in-page canvas. Plain text **Δ 2.36** (unchanged), the emoji **Δ 20.27** (that was the
bug). Byte-identical PNGs were the first assertion and it **failed on correct code** — clip-to-text
antialiases through a mask, so it is a stronger claim than "the colour did not move."

**Recon changed the job twice.**

1. **`.pipetitle` is used 19 times, not 9.** Nine are the home screen; **eleven more are Graphs &
   Reports**, all still emoji. Releasing the clip changes all nineteen whether they are touched or
   not, so leaving Reports on emoji would have shipped an inconsistency this build caused. 20 icons
   placed.
2. **The I2 set uses hardcoded knockouts** — `fill="#0d0d10"`, the rail's own background, in
   `recents`, `pricingcatalog`, `salesfloor` and `estimates`. Those are black holes anywhere but the
   rail. All seven icons reused here happen to be knockout-free; that is luck, so `icon()` asserts
   it. The new icons use `fill-rule="evenodd"`, which is transparent on any ground.

**What Theo actually pointed at was Work Schedule** — *"where it says work schedule with white
square icon."* The nav's own `scheduleboard` I2 is one unbroken filled calendar slab, so reusing it
would have replaced his white square with a grey one. Card titles get a **clipboard** instead; the
nav's copy is untouched and asserted byte-identical.

**The screenshot caught what no assertion could.** Filled solid, the first `today`,
`teamcalendar` and `productioncalendar` drafts were a slab, a slab and a bucket-with-an-arrow —
all three passed every structural gate. Redrawn as one family: an evenodd frame with an open
body, so the solid weight can carry a mark and dark ends up looking like its own keyline.

**No layout mode change.** An earlier draft put `display:flex` on `.pipetitle`; that hits all
nineteen, and two hold a `<small>` that would have been broken onto its own line. Inline SVG with
`vertical-align` instead — exactly how the emoji flowed.

**Left alone deliberately:** `.acthead` and `.pu-strip .sh b` carry the *same* flat-gradient clip.
Neither contains an emoji, and `-webkit-text-fill-color` does not reach an SVG child, so the icons
added to them render through it. Asserted in Chromium rather than assumed.

**Also gone:** `<img src="/cardinal-hammer.png">`, a real 22px PNG on the Production Calendar card —
never an emoji, never broken by the clip. One fewer image request on the home screen.

**A harness bug worth recording, and it is the file's own rule earning its place.** The `.acthead`
clip rule was captured by selector — but `.hero-hi,.hero-hi *,.acthead{` is a **substring of the
print stylesheet's much longer selector list**, which comes first in the file. The harness silently
loaded the `@media print` rule and reported a `#1b1b1b` text-fill. Fixed by anchoring on a
*declaration*. Scope the assertion, then read what it captured.

`check_build.py` green (537, marker `cr-titleicon-styles`, negative-controlled).
Chromium: **18/18**. Harness at `harnesses/h537_chromium.js`.

---

## Build 538 — three left-nav labels carry their own colour

**Theo:** *"make the wording on cardinal truth red, and the community hub the emerald green just the
text on the nav bar. Also make the Landing Hub a yellow color text on the nav bar for desktop"*

**Just the text.** The rules land on `.lnav-tx`, the span holding the label — not on the row. Icons
keep the nav's muted grey; the active row keeps its card, its cardinal bar and its lift. A child's
own `color` beats the row's inherited one, so no specificity fight and no `!important`.

**The hook is `data-k`, and finding it was the whole recon.** The burger menu the rail mirrors
already carries `data-nav="cardinaltruth"` and `data-nav="landing"` — but **Community Hub is added
at runtime by `makeOpt()` with only an `id`**, so `data-nav` covers two of the three. `cr-lnav-script`
now emits `data-k`, the label's own slug, which is *the same value `lnavIcon()` already computes* for
the icon lookup. That extends an existing computation instead of standing a second mechanism beside
it, and it equals `data-nav` wherever `data-nav` exists.

**"for desktop" needed no extra scoping.** `--lnav-w` is `0px` at `:root` and only `238px` inside
`@media (min-width:1100px)` — the rail declares desktop-only in one place.

**Every colour computed, not picked**, at the 4.5:1 body-text floor, against all three grounds a
label can sit on in each theme — rail, active card, hover. The active card is in that list *because*
these labels stay coloured when their row is current.

| | dark | light |
|---|---|---|
| Cardinal Truth | `#ef6b6b` 6.42 / 5.19 / 5.86 | `#c8202e` 5.11 / 5.67 / 4.66 |
| Community Hub | `#34D399` 10.05 / 8.12 / 9.16 | `#047857` 4.94 / 5.48 / 4.51 |
| Landing | `#f0c651` 11.87 / 9.59 / 10.82 | `#8a6100` 4.99 / 5.54 / 4.55 |

**Two places the literal answer was the wrong one**, both said out loud rather than fudged:

- **Cardinal red fails in dark.** `#c8202e` is **3.40 / 2.75 / 3.11** on the rail, the active card
  and hover. Dark gets a lighter red; light gets the real cardinal red, which passes there.
- **A true yellow cannot be read on the light rail** — `#f0c651` is **1.6:1** on `#f2f3f5`. Light
  gets the darkest amber that still reads as the same colour.

Emerald is the community CRM's own value in both themes — `#34D399` is its `--lnav-crmc`, `#047857`
its `--hbg`.

**Three harness reds, all the test's fault, all worth recording:**

1. **Slugs came out as `128737655039cardinaltruth`.** The harness fed the labels as *raw source* —
   `&#128737;&#65039; Cardinal Truth` — but the rail reads `(el.textContent || '').trim()` off the
   mirrored `.navopt`, which is **decoded DOM text**. Fixed by building the real element, setting
   `innerHTML`, and reading `textContent` back the way the app does.
2. **Every colour assertion passed against an empty screenshot.** `#cr-lnav` is
   `display:none !important` until `body.cr-lnav-on` is set, and `getComputedStyle` reads hidden
   elements happily. A visibility gate now runs *before* any colour reading.
3. **The rail then rendered 1px wide** — the viewport was 620px, below the 1100px breakpoint, so
   `--lnav-w` stayed `0px`. Tested at 1220px, which is the only width this feature exists at.

`check_build.py` green (538, marker `cr-lnav-ink-styles`, negative-controlled).
Chromium: **25/25** — the shipped `stripEmoji`/`iconKey`/render statement executed against the real
menu labels, and contrast recomputed from the *rendered* colour against the *rendered* background
rather than from the numbers in the patch comment. Harness at `harnesses/h538_chromium.js`.

---

## Build 539 — Landing is literal yellow in light mode too

538 shipped light-mode Landing as amber `#8a6100`, because a true yellow cannot meet the
readability floor on a near-white rail. That was flagged **with the measurement**, Theo saw it, and
answered: *"literal yellow"*. His call, made with the number in front of him, so it ships.

**What it costs, on the record.** `#f0c651` in light: **1.47:1** on the rail, **1.63:1** on the
active card, **1.34:1** on hover — against a 4.5:1 floor. And no better yellow exists; the whole
family fails (`#ffd700` 1.26, `#f5c518` 1.47, `#e8b800` 1.68). `#f0c651` is the pick because it is
the value already used in dark, so **Landing is now one colour in both themes** instead of two.

**The contrast gate is narrowed, not deleted.** It still runs and still fails the build for the
other five values. Landing-light is a single *named* exemption, and both the patch and the harness
assert the exemption is exactly one entry wide — the harness even fails if that value ever starts
*passing*, so a stale exemption cannot sit there unnoticed. The next person to add a colour here
inherits a live gate, not a disabled one.

**A trap this patch sprang on itself:** `assert '#8a6100' not in src` failed, because the block
comment now names the amber as the *history* of why the value is what it is. The file's own
"comments lie in both directions" rule, caught by its own gate. Scoped to the comment-stripped code.

`check_build.py` green (539, marker `literal yellow, Theo's call`, negative-controlled).
Chromium: **25/25**. Harness at `harnesses/h539_chromium.js`.

---

## Build 540 — the money circle reads the table the money is actually in

**Theo:** *"The circle where it shows the money stays at 0 and should be tied to the contract or
approved estimate amount."*

**The circle was never broken — it was pointed at the wrong table.** `projectValue()` scanned
`cacheRows` (which is `inspection_reports`) for rows titled "Estimate…" and took the highest
`total`. Measured against production, not guessed:

| table | rows | with money |
|---|---:|---|
| `inspection_reports` | 22 | **0** — 3 match `isEstimateTitle` and all three total **0**; the other 19 are NULL |
| `estimates` | 12 | **9** ← the money |
| `contracts` | 0 | — |
| `manual_estimates` | 0 | — |

**Not one row in that table has ever carried money.** So the max was always 0 unless someone had
typed a manual override — and no production checklist carries `manual_value` at all. Five real
clients were showing $0 with money on the job: Kimberly Guy $36,654 · Kim Guy $36,432 ·
Dan Thompson $11,920.99 · Kitty Hawk $6,180 · Betty Mann $1,820.

**The order is Theo's own words.** A **signed contract wins outright** — not folded into the max,
because if the contract says $30k and a stale estimate says $36k the contract is the truth.
Otherwise the highest of: manual override, best **sent** estimate, legacy `inspection_reports`
total. **Drafts do not count** — `estimates` is 8 draft / 4 sent today, so Kim Guy and Kitty Hawk
stay at $0 until those are sent. That is a rule Theo can reverse with one word and the harness
asserts it explicitly so the reversal is a one-line change.

**Why `projectValue()` and nothing else.** It is the single money chokepoint for retail — **15 call
sites**: the pipeline stage circles, Leads & Jobs cards, the client directory, reports revenue,
backlog, profit margin, and the price that prefills a new contract. One fix lands in all of them.

**The two new fetches cannot break the profile.** Both carry `.catch(→[])` exactly as `adb.list()`
already does, so an RLS refusal degrades to "no contract/estimate money known" rather than taking
down `reload()` and with it the whole client profile. The lookup maps start `{}` so all 15
synchronous callers are safe before the fetch resolves — asserted.

**Also found, not fixed here:** there are **two contract pipelines**. `createContractForCurrent()`
(the `+ New contract` button in the profile) writes a `Contract — {name}` row into
`inspection_reports`; a newer `/api/estimate_to_contract` flow writes to the `contracts` table.
Both are empty in production — nobody has made a contract either way. `projectValue()` reads the
`contracts` table. **This is the duplicate-pipeline bug class and it needs a decision from Theo.**

`check_build.py` green (540, marker `indexMoney`, negative-controlled).
**Harness: 18/18, and it is the good kind** — `projectValue`, `indexMoney` and `isEstimateTitle`
are extracted from the shipped artifact by brace matching and executed against **rows pulled out of
the live database**, nulls and duplicate titles included. The one stub, `parseCkAll`, is proven
inert by an assertion that no production checklist carries `manual_value`.
Harness at `harnesses/h540_prod.js`, data at `harnesses/prod540.json`.

---

## Build 541 — contracts get their own tab

**Theo**, asked where the contracts section should live: **"2"** — its own tab.

**Nothing was missing.** The heading, the `+ New contract` button and the list were all there and all
wired — filed inside `tab-estimates`, below the estimates list, which is exactly why they read as
absent. The markup moved **verbatim** into a pane of its own; the only edit is dropping a
`margin-top:22px` that was spacing it below the estimates list and is now just a gap at the top of
a pane. `pNewContractBtn` and `contractDocsMount` keep their ids, so every existing listener still
finds its element.

**The tab strip is a `<select>`, not a row of buttons.** Navigation is `#jobMenuSel` in the header
and `showTab()` syncs it. So a new tab is exactly three things: the pane, an entry in `showTab`'s
list, and an `<option>`.

**⚠ `showTab()` has no null guard** — `document.getElementById('tab-' + t).style.display` inside a
`forEach` over a hardcoded list. **The name and the pane have to ship in the same commit**; split
them and every `showTab()` call throws, killing tab switching across the whole profile. The gate
asserts `showTab`'s list and the panes in the markup are the *same set* rather than matching a
number, and the harness carries the negative control that proves the hazard is real: 541's
`showTab` run against 540's markup throws `Cannot read properties of null (reading 'style')`.

`check_build.py` green (541, marker `id="tab-contracts"`, negative-controlled).
Chromium: **17/17** — the shipped `showTab` driven against the shipped pane ids, every tab
exercised. Harness at `harnesses/h541_chromium.js`.

**Next, and Theo has already picked it:** the roofing master agreement rendered in the tab and
autopopulated ("2" again). `docs/Cardinal_Roofing_Contract.pdf` is 5 pages, US Letter, **zero
AcroForm fields** — agreement face ×2, T&C, and the two statutory 3-Day Notice copies which must
not be reworded. Autopopulatable: date, buyer, email, phone, street/city/state/zip (stored as
separate fields on the lead), insurance carrier + claim #, and the four money lines off `projectValue()`.
Plus **existing layers, roof pitch and decking type straight from the inspection checklist**.

**Also found:** two Company Documents entries are dead links — `Cardinal_Window_Contract.pdf` and
`Cardinal_Gutter_Contract_Fillable.pdf` are in `COMPANY_DOCS` but not in the repo. They 404 today.

---

## Build 542 — the roofing Construction Agreement, in the app, autopopulated

**Theo:** *"Use the master roofing/construction agreement in the company docs and make it fillable,
whatever can be autopopulated do so"* … *"for Roofs in specific"* … and on how much of the spec grid
to reproduce: **"3"** — full fidelity, except the lines the inspection already answered.

`+ New contract` used `CONTRACT_TEMPLATE`, a generic three-section service contract that looks
nothing like the paper form Cardinal signs. It now builds the roofing **Construction Agreement** —
all 13 numbered specification sections with their lettered sub-options, warranty tiers, HOA,
timeline, insurance, payment structure and signature block.

**Two things deliberately not reproduced, and it is a legal call, not a shortcut:** the **Terms and
Conditions** (master p3) and **both 3-Day Notice of Cancellation copies** (master p4–5). Statutory
text under ORC 1345.23. Retyping it invites silent divergence between what the app prints and what
the reviewed master says, and nobody in this loop is a lawyer. The agreement **references** them the
way the paper form does and points at the master in Company Documents. Asserted in the gate.

**What autofills:** date · buyer · email · phone · **street / city / state / zip as separate boxes**
(the lead stores them as separate fields) · rep name & title · the three money lines off
`projectValue()` · and — the point of Theo's "3" — **existing layers, roof pitch and decking type
straight off the inspection checklist**, with their lettered option rows *collapsing* when known and
printing as on paper when not.

**What does not, said plainly:** `INSURANCE CO.` and `CLAIM #`. There is no client-side cache of
`insurance_claims` — it is fetched ad hoc inside async functions — and `prefillClientInfo()` is
**synchronous with many callers**. "Adding `await` to a synchronous function is never a local change"
is this project's own rule and it is not worth breaking for two fields. The gate asserts
`prefillClientInfo` stays synchronous.

**`CONTRACT_TEMPLATE` survives.** `CardinalEstimateToContract` checks for it by name and warns when
missing. This build *adds* a template; it does not delete one.

`check_build.py` green (542, marker `ROOF_AGREEMENT`, negative-controlled).
**Chromium 17/17, against real records:** the shipped `prefillClientInfo` and the shipped template,
run on **Bob DeBuilder's actual row** — the one client whose roof has been inspected, so the only
record that can prove the collapses fire — with **Dan Thompson as the control**, a real client with
no inspection whose option rows must survive. Harness `harnesses/h542_chromium.js`; the template
body lives at `scripts/roof_body.py`.

---

## Build 543 — the nav's own Schedule Board icon joins the clipboard family

**Theo:** *"yes please do"* — taking up the offer 537 left open.

537 gave 20 card titles drawn icons and **deliberately did not touch the nav's own copy**, because Theo
had signed off on that surface at 536. `I2.scheduleboard` was **one unbroken filled slab**:

```
M7 2h2v2.4h6V2h2v2.4h2A2 2 0 0 1 21 6.4V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.4a2 2 0 0 1 2-2h2z
```

A calendar outline with nothing cut out, filled with `--rbe-mute`. **That is the white square Theo
pointed at**, and it is exactly why 537 drew the cards a clipboard instead of reusing this — reusing
it would have swapped a white square for a grey one.

**This is a port, not a new drawing.** Both weights are lifted verbatim out of the card icon 537 already
shipped and Theo has already seen in production, so the nav and the cards are now **provably the same
artwork** rather than two drawings that resemble each other. The gate asserts byte-equality against the
card markup in the file, not against a copy pasted into the patch script.

**Why the solid weight stops being a slab:** the ported path carries `fill-rule="evenodd"` with an inner
rect (`M6.6 9.4h10.8v9.6H6.6z`) cutting the body open. Evenodd rather than a knockout fill is
load-bearing — 537's recon found four `I2` icons using hardcoded `fill="#0d0d10"` (the rail's own
background) which are black holes anywhere else. This icon sits in **536's recessed well**, `#0A0E16`
in dark and `#f2f3f5` in light, so a hardcoded knockout would have been visibly wrong in *both*.

`check_build.py` green. Chromium **8/8**, plus rendered before/after in both modes across rest, hover
and active — active matters because `.lnav-item.on` recolours the icon to cardinal red, which is where
a solid slab looks worst.

**⚠ The first marker was wrong and the negative control caught it.** `fill-rule="evenodd" d="M6.2 3.6h1.6`
is **already in 542** — as the card icon. Porting artwork means the geometry is not new; only its
appearance *inside the `I2`/`I5` sets* is. Marker corrected to `scheduleboard:'<path d="M9.4 1.8h5.2`.
The test was wrong, not the app — as usual.

`I2` and `I5` are 24 icons each; the gate asserts **exactly one key changed** in each, computed against
the previous file rather than hardcoded.

---

## Build 544 — retail stage chips finally have a dark variant

**Theo:** *"lets do the ratail stage chips and activity count tiles."*

Eight `.stg-*` rules carry **light pastels with no theme gate at all** — `#e8f0fb`, `#fdf3e2`,
`#ececec` and friends. Cardinal Claims has a dark-adapted set under `#insClientsView`; **retail never
got one**, so in dark mode retail chips render as pastel lozenges on a near-black card.

**The palette is Claims', reused verbatim** — one stage palette for the app rather than two that
drift apart. Contrast computed, not eyeballed: **6.40:1 at worst (Lost), 8.57:1 at best (Approved)**,
against a 4.5 floor. Chip text is 800 10px uppercase, which is *body* text, not large.

**Scoped to `.stagechip.stg-*`, never bare `.stg-*`** — and this is the load-bearing part. `.pcard`
also wears these classes, where they set `--stgc` (an accent variable), not a background. A bare rule
would paint a chip background across the whole card. `stageClass()` only ever emits them onto a
`.stagechip` span or a `.pcard`, so the two-class form hits exactly the chips. Specificity is
deliberate: base is (0,1,0), this is (0,3,0) so it wins in dark, and `#insClientsView .stagechip.stg-*`
is (1,3,0) so **Claims still wins on its own screens** — asserted in a real browser.

## Build 545 — Activity Count tiles go obsidian

**Theo:** *"Keep them orange tho and raise it, color black. Glassy/Glossy style tile"* → previewed
three treatments → **"obsidian"**.

`.actbox` was flat `var(--rbe-panel)` with a hairline. Now a radial sheen from the top-left, raised on
a real drop shadow. **The orange is untouched** — `#E8722A`, 6.47:1 on the new ground against a 3.0
floor for 22px 800 numerals.

**⚠ The label had to be pinned, and this is the bug the build nearly shipped.** `.actbox span` was
`color:var(--rbe-mute)`. That token is `#9aa0a8` in dark but **`#6b6b6b` in light** — and the tile is
black in *both* modes, so in light the label would have landed at **3.57:1**, under the floor. A
theme-independent tile needs a theme-independent label: pinned to `#9aa0a8`, 7.22:1 in both. Caught by
computing the ratio before writing the rule, not after.

Black in both modes is Theo's literal instruction, shown to him in the preview. A light twin is a
single added rule.

### Gates, and two tests that were wrong before the app was

`check_build.py` green on both. **Chromium 30/30**, with **every `<style>` block from the artifact
loaded in file order** — the 481 lesson made into a gate: that build shipped a losing rule with every
mechanical check green, and only a real engine catches it. Every assertion here is a
`getComputedStyle` read.

- **The orange assertion fired on a false positive.** `src.count('#E8722A') == 1` failed because the
  *comment explaining the value quotes the value*. This file's oldest counting trap, verbatim:
  "patch scripts document the values they change, so a naive count finds the value in its own
  explanatory comment." Rewritten to compare the `.actbox b` **rule** before and after.
- **The `.pcard` assertion blamed this build for a pre-existing condition.** It demanded the card not
  be a pastel; it is one — **and build 543 shows the identical value**. `.stg-Lead{background}` at char
  41043 outranks `.pcard{background}` at char 14262 by *file order* at equal specificity. Rewritten to
  assert this build **did not move** it, comparing 543 against 545 in-browser.

**Reported, not fixed — needs a decision:** because a bare `.stg-*` rule outranks `.pcard`'s own
gradient, a retail pipeline card takes its stage's background. Whether that is the intended
stage-tinting or a long-standing accident is Theo's call; how visible it is depends on what is painted
over the card. Not touched here.

---

## Card lift, two navigators, navy leads, obsidian (546)

- **546** · one appended `<style id="cr-nvl-styles">` + nine exact-match JS edits. Hover lift
  (option 1, 3px, `@media (hover:hover)` so a phone tap cannot latch it) on leads, estimate and
  reports cards. Lead cards navy (535's `--nv-*`). Leads rail and the new estimate jump list both in
  536's recessed-channel recipe. Estimate page and `#reportsView` pipe cards obsidian (545's
  `.actbox` recipe), hairline `#ff2740` left edge on the pipe cards. Milestone pill on 544's stage
  chips. KPI numerals colour-coded. Retail only, both modes, `#mainView` excluded.

**Three things worth carrying forward:**

- **`</body>` is at ELEVEN, not the 10 `CLAUDE.md` records** (that figure is from 451), and *three of
  the eleven are prose inside comments* — "paste this block into index.html before `</body>`". The
  count was never the invariant. Assert that `rfind()` landed on the real close instead: the 9 chars
  before it are `</style>\n` and the 16 after are `</body>\n</html>\n`.
- **An inline `style=` attribute is why the milestone pill needed a JS change.** Reusing 544's
  palette from CSS alone was impossible; `ljRenderPane()` was painting `background`/`color` inline.
  This is the `styleMounts()` trap in `CLAUDE.md` recurring on a different surface.
- **A screenshot caught a bug three green harnesses did not.** The nav header read
  `PHOTOS &AMP; TOTALS` — the label was pre-escaped `&amp;` and then run through `esc()` again.
  Every structural assertion passed because the *structure* was right. Look at the picture.

**One red that was the test's fault, recorded because half of them are.** An XSS assertion demanded
the substring `onerror=alert(1)` be absent from the escaped `mailto:` href. Escaping neutralises the
**delimiters**; the payload text survives as inert attribute content. Rewritten to assert what
actually matters — no raw `"`, `<` or `>` inside the href value, and no `<img>` opened anywhere.

---

## Build 547 — the Crews page: trade nav, profile, compliance vault, notes

Stage 1 of the crews section. The schema went live at #77; this is the first screen that reads it.

**Scope, deliberately not all six tabs.** Profile, Compliance and Notes are **fully working**. Labor
Rates, Work Orders and Payments are later builds and are **not rendered as dead tabs** — shipping four
empty tabs to look complete is how a feature reads as broken. The harness asserts exactly three tabs
ship.

**One menu entry, two menus.** `cr-lnav-script` **scrapes the live burger menu** rather than keeping a
copy ("read the LIVE menu rather than keep a copy of it"), so a single
`<button class="navopt" data-nav="crews">` in `#navMenu` appears in the burger *and* the left nav. No
second list to drift.

**Chrome is borrowed, not invented:** the trade nav is `#cr-lnav`'s banded `.lnav-sec` headers over
536's recessed well; dark cards are 545's obsidian gradient and shadow verbatim; status chips are the
stage palette 544 put into retail dark. The view is a fixed overlay like `#resourceLibraryView`, so it
needs **no surgery on `hideAllViews()`** or the view registry.

**`TRADES` mirrors the `crews_trade_ck` constraint**, in Theo's order with General Repairs last. The
patch asserts the two lists match — if one grows a value and the other does not, a crew lands in a
section that renders nowhere. Same discipline as `STAGES`/`normStage()`.

**Expiry is the whole point, so it got the hardest test.** `daysLeft()` returns **null for "no clock"**
(a W-9 never expires) which is *not* the same as zero — a caller treating null as 0 would mark every
W-9 expired. `crewState()` is worst-of-three. Verified in Chromium against realistic rows:

| crew | data | dot |
|---|---|---|
| Ramirez | all current | green |
| Delgado | GL in 21 days | amber |
| Novak | GL expired, no WC | red |
| **Halstead** | **nothing on file at all** | **red** — absence must never read as compliant |
| **Ortiz** | **two GL rows, one expired** | **green** — the newer wins |

**Upload rolls back.** If the `crew_docs` insert fails after the file lands, the object is removed from
the bucket — otherwise it is stored, billed and referenced by nothing.

**All 46 `--crw-*` references carry a literal fallback**, asserted in the patch. 448–449 are why.

`check_build.py` green (547, marker `cr-crew-script`, negative-controlled).
**Chromium 20/20**, every `<style>` block loaded in file order, assertions all `getComputedStyle` or
real DOM state. Harness `harnesses/h547_chromium.js`.

**Next:** Labor Rates (needs crews) → Work Order generator (needs rates) → Payments + Commissions.

---

## Build 548 — Labor Rates on a crew: catalog items plus custom rows

Stage 2. 547 shipped the page; this is the tab that makes `crew_rates` referencing `pricing_items`
worth having.

**The tab shows what the crew is priced on, not the whole catalog.** `pricing_items` has **34 enabled
rows across 16 categories** — rendering 34 inputs and asking Theo to fill them on a phone is a chore,
not a rate sheet. The tab lists this crew's rates grouped by category; you add a catalog item when you
need one. Custom rows group at the end. The picker offers **only items not already priced for that
crew**, asserted.

**The tab is admin-only and is HIDDEN, not empty.** `crew_rates` is `is_cardinal_admin()` in RLS —
it is what Cardinal *pays*, which with `pricing_items.rate` is the margin. Production must not see it.
A rendered-but-empty tab would turn a correct refusal into what looks like a broken screen, and worse,
imply the data is there to be had. Gated in **three** places: `tabsFor()` filters the strip,
the dispatch falls back to Compliance, and `ratesHtml()` refuses on its own. The harness runs the page
**twice — as Theo and as Curtis** — and asserts four tabs versus three.

**The spread is the point.** Every catalog-linked row shows Cardinal's rate beside the crew's and the
difference. `spread()` returns **null rather than a number** for a custom row (no catalog twin) and for
a zero catalog rate (a zero base is not a 100% margin). A negative spread — the crew charging more than
Cardinal does — is **amber, not red**: a number to look at, not an error.

**Neither new fetch can blank the directory.** `pricing_items` and `crew_rates` degrade to `[]`; only
the `crews` fetch throws. Asserted by counting `throw` sites in `load()`.

### The harness caught a real bug

`money()` produced **`$-2`** for a negative spread — the sign inside the currency symbol, which is not
how money is written anywhere. Fixed to `-$2`; the sign now goes outside. It only shows up on a crew
whose rate is *above* Cardinal's own, which is exactly the row Theo most needs to read correctly.

`check_build.py` green (548, marker `function ratesHtml`, negative-controlled).
**Chromium 13/13**, both roles, both themes. Harness `harnesses/h548_chromium.js`.

**Next:** the Work Order generator (needs these rates to fill its labor lines), then Payments +
Commissions.

---

## Build 549 — the rate columns line up, and the panel stops stretching

**Theo, with a phone screenshot:** *"Can you line up and align those sections."*

**Two faults, and the second made the first look worse.**

**1. Every category got its own `<table>`.** Five categories, five tables — and an **auto-layout table
sizes its columns to its own content**, so Unit / Ours / Theirs landed in a different place in every
block. Nothing was going to align them while they were separate tables.

**2. The panel was being stretched from inside.** Six auto-width columns forced the card wider than the
phone, so the row labels clipped on the left and the "Their rate" / "Unit" fields ran off on the right.
Those fields sit in a `.crw-grid2` whose media query collapses below 620px — **it never fired, because
a media query keys off the VIEWPORT while the layout was being stretched from within.**

**The fix is one table, not five.** Categories are full-width rows inside a single table, so alignment
is *structural* rather than coincidental. `table-layout:fixed` with an explicit `<colgroup>` pins the
widths, and the table sits in its own `overflow-x:auto` box with a `min-width` — the rates scroll
inside their own frame, the page never does.

**⚠ `min-width:0` is half the fix, and the half that is easy to miss.** A **grid item's default
`min-width` is `auto`, not 0**, so the panel track refused to shrink below the table's intrinsic width
and stretched the card anyway — which meant `.crw-rtwrap`'s `overflow-x` never engaged. `minmax(0,1fr)`
on the track plus `min-width:0` on the children are two halves of one fix. **The harness caught this:
the first run of 549 still failed both the wrapper-scrolls and form-fits assertions.**

### The negative control did NOT reproduce, and that is recorded rather than hidden

The 548 fixture's five tables happen to *agree* — each is `width:100%` of the same container, and the
identical headers give columns 2–6 identical minimums, so column 1 comes out the same. Theo's real data
diverges. Rather than claim a before/after win the fixture cannot support, the control asserts **the
defect itself**, which is provable either way: 548's tables compute `table-layout: auto`, so agreement
was a coincidence; 549's computes `fixed`, so it is a guarantee.

`check_build.py` green (549, marker `crw-rtwrap`, negative-controlled).
**Chromium 13/13 measured at 430px**, Theo's actual phone width — every column asserted to one
x-position, the view asserted not to exceed the viewport, the wrapper asserted to scroll instead.
Harness `harnesses/h549_chromium.js`.

---

## Build 550 — light mode for Crews, in the app's own light language

**Theo, with two screenshots** (the Landing and the Insurance home in light): *"Make light modes for
all sections in crew labor similar to this style and color theme. Raise everything that can be raised
with shadows."*

**Read off the screenshots rather than guessed:**

- a **warm** off-white ground (`#f7f5f5`), not the cool `#f2f3f5` the crews page had
- white cards with a **thin cardinal hairline**, not a grey one
- soft drop shadows on everything — nothing sits flat
- micro-labels in letterspaced uppercase **cardinal red**
- section headings as a **label followed by a rule** (`CHASE LIST ————`)
- the card that matters gets a red edge and a faint red bloom

**The nav inverts, and that is the interesting part.** 547 built it as a **recessed well in both
themes**, copying 536's left menu. Theo has now asked for the opposite in light, so light gets a raised
white card with the hairline and a shadow while **the well survives untouched in dark**. The twins
genuinely differ now — which is this project's own "the dark twin is designed, not recoloured", running
in the other direction for once.

**Dark is not touched.** Every one of the 25 rules is inside `:root[data-theme="rb-light"]`, and the
patch asserts it by parsing the selectors and failing on any that would reach dark. It also asserts the
dark well's `inset 3px 0 7px -3px rgba(0,0,0,.85)` still exists.

**Contrast computed before the colours went in**, not after: worst pair is the section-rule label at
**4.91:1** against a 4.5 floor; everything else runs 5.7–18:1. The red hairline is decoration, not text,
but it reads 5.67:1 against white so it is visible rather than theoretical.

`check_build.py` green (550, marker `Build 550 · light mode for Crews`, negative-controlled).
Chromium 13/13 carried forward, plus **all four tabs rendered in light** for review.
Harness `harnesses/h550_chromium.js`.

**A gate bug worth recording:** the shadow assertion used `light[light.index(sel)]` — `index()` returns
an **int**, so the slice was a single character and the check was meaningless before it failed. Rewritten
to regex out the rule body and assert `box-shadow` inside it. The test was wrong twice over: broken
*and* silently so.

---

## Build 551 — the light Crews cards actually lift off the page

**Theo, with a third screenshot:** *"I need the light theme to have this type of raised look with
shadows it pops out."*

550's light shadows were **too weak and the wrong temperature**: `rgba(31,33,36,.09)` — a cool grey I
picked, on a warm off-white ground.

**Every value here is the app's own, measured rather than invented.** `#leadsView .ljcard` renders
`rgba(40,20,10,…)` — a *warm* shadow that belongs with the warm page — and it already defines a lifted
elevation at `0 14px 28px rgba(40,20,10,.16), 0 3px 8px rgba(40,20,10,.10)`. **That is its `:hover`
state.** A phone cannot hover, so the app's own lifted look was unreachable on the device Theo works
from. 551 promotes it to rest.

Inner objects (doc rows, notes, the rate table, buttons, inputs) lift at a **smaller** amplitude so the
hierarchy survives the increase — everything getting the same shadow would flatten it again.

**A lit top edge is the other half of "raised":** `border-top:2px solid #fff` with the shadow beneath
is light-from-above. Without it a card is merely outlined.

The patch asserts **zero `rgba(31,33,36` remain** in the light block — the first attempt missed the
tabs and the inputs and its own gate caught it, aborting before the write.

**⚠ The first marker failed the negative control**, and correctly: `0 14px 28px rgba(40,20,10,.16)` was
**already in the file**, because it was lifted *from* `.ljcard:hover`. Reusing the app's values means
the value is not new — only where it appears is. Same lesson as 543's ported icon. Marker changed to
`border-top:2px solid var(--crw-lit,#fff)`.

Measured before and after in Chromium:
`rgba(31,33,36,.09) 0 6px 18px` → `rgba(40,20,10,.16) 0 14px 28px`.

`check_build.py` green (551, negative-controlled). Dark untouched — asserted, all 25 rules still
light-scoped and the dark recessed well intact.

**Still unresolved, and Theo should say:** his screenshot shows a **dark top edge** on each card. The
shipped light `.ljcard` renders `border-top: rgb(255,255,255)` — white — so that edge is not coming
from the current rule. It may be the shadow of the card above, or a build he was looking at. 551 uses a
**light** top edge, which is the correct physics for a raised card. If he wants a dark edge, say so.

---

## Build 552 — cardinal red top edge on the light Crews cards

**Theo:** *"Use red edge instead of navy."*

551 used a **white** lit edge — correct physics for a raised card (light from above, shadow beneath),
and it answered the open question from 551's note, which had flagged that the dark edge in Theo's
screenshot was not coming from any shipped rule. He wants it **red**, not navy and not white.

`border-top:2px solid #c8202e` on the panel and the nav. The edge is **decoration, not text**, so no
4.5 floor applies — but it reads **5.67:1** against the white card, past the 3.0 non-text floor, so it
is a visible edge rather than a theoretical one.

Verified in Chromium in both themes:

| | card top | nav top |
|---|---|---|
| light | `rgb(200, 32, 46)` @ 2px | `rgb(200, 32, 46)` |
| dark | `rgb(36, 36, 44)` @ 1px | `rgb(34, 48, 71)` |

Dark is untouched — asserted, and confirmed by reading the rendered border rather than the source.

`check_build.py` green (552, negative-controlled). Closes the open question from 551.

### build 553 — the right side of Crews
Theo: "How about the right side?" Measured the left nav against the right panel in
Chromium rather than guessing. The panel is TWO `.crw-card`s butted together (header
with the tabs, then the body), and three things were wrong with it:

- **Light corners were 10px against the nav's 14px.** `panelHtml()` set the radius as an
  INLINE style, which beats every rule in the stylesheet. Fixed structurally: the two
  halves get real classes (`crw-cardtop` / `crw-cardbot`) carrying exactly the geometry
  the inline styles used to, so a theme rule can reach them. Dark was never affected —
  its nav is 10px too.
- **The file input was unstyled in BOTH themes.** The base rule lists `[type=text]`,
  `[type=date]`, `select`, `textarea` and stops, so Compliance rendered a raw UA control
  (measured `border-width:0px, border-radius:0px`). Now styled, plus
  `::file-selector-button`.
- **Dark drew a white line across the middle of the panel.** `.crw-card`'s
  `0 1px 0 rgba(255,255,255,.10) inset` is a top-edge bevel, and the body half has no top
  edge. Pixel-measured at luma 53.0 against the card's own 30.2. Only the inset is
  dropped; the drop shadow and ledge are kept verbatim.

Also unified the hairline — 550 gave doc rows, notes and the rate frame a translucent-red
border, 551 changed the CARDS to grey `#e6e2df` and left the children pink.

**A false positive of mine, recorded so it does not come back.** I first diagnosed a
drop-shadow SMEAR at the seam — the top half's `0 14px 28px` landing on the body half's
face. It does not happen: the body half is a later sibling with an opaque background and
paints over that shadow. The luma profile is flat over dy 1-9 in both builds. What I had
measured was the first document row's own border, 14px down. 550's `.crw-card + .crw-card`
rule went in under the same wrong theory, aimed at the wrong card, and 551 then set it to
a value identical to `.crw-card` — a literal no-op. Deleted. No shadow is overridden in
this build except the one dark inset above. `h553_chromium.js` asserts the absence of the
smear so the wrong fix cannot be reintroduced.

Caught during the build: adding the classes let the light `.crw-card` rule (1,3,0)
out-specify the base `.crw-cardbot` (1,1,0) and put the 2px cardinal edge back — a red
line straight across the middle of the panel, 186 luma. The harness caught it before the
write; the light rule now re-zeroes `border-top`.

Gates: `check_build.py` green, negative-controlled, 552 → 553. Chromium 22/22, both themes.

### build 554 — a Roofr upload fills the measurements and the pitch
Theo: "Roofr when uploaded should be auto populating the info for pitch and measurements."

**The audit behind it.** The same roof facts had THREE homes and the import populated
the one nothing reads:
- `checklist.roofr` — written by `wireRoofrUpload`, read by nobody afterwards
- `checklist.meas` — written ONLY by the hand-typed Measurements modal
- `checklist.pitch` / `.layers` / `.decking` — written by the roof INSPECTION checklist
  (`ck_pitch`, `ck_layers`, `ck_decking`), read by the Construction Agreement via
  `collapse('pitch', _ck.pitch)`

So a job could be measured by Roofr and still show an empty Measurements panel and a
blank pitch line on its agreement.

**The change.** The merge is lifted into a named pure function `roofrMerge(all, d)` beside
`fillRoofrFields`, so the gate can execute the shipped code rather than a re-implementation.
Precedence: Roofr fills blanks and refreshes its OWN earlier numbers (a corrected re-upload
works), never overwrites a field measurement, and a mixed record reads `Field + Roofr`
rather than being relabelled. `checklist.pitch` is filled only when the inspection left it
blank. `layers`/`decking` are untouched — Roofr does not report them.

**Corrections to claims I made earlier in the session, all mine:**
- I said "nothing writes `checklist.layers/pitch/decking`". **Wrong** — the roof inspection
  checklist writes them (`ck_layers`, `ck_pitch`, `ck_decking`, and `ck_sat` for a satellite
  dish). My regex `(layers|pitch|decking)\s*:` missed it because the form reads DOM values
  into a differently-shaped object.
- I said the one project carrying them was a test row from 542. **Wrong** — it is "Alton",
  created 17 Jul, with real values (8/12, 2 Layers, 1x6 Plank / Spaced Lumber), and it is a
  *different* project from the one carrying `meas`.
- Block attribution by "nearest preceding named block" is unreliable: **unnamed script blocks
  get credited to whatever named block precedes them**, which made real code look like it
  lived in `cr-pcard-styles` (the base64 blob). Track block ENDs, not just starts.

**Stated caveat:** zero projects in production carry a `roofr` key, so no real import has
ever landed. The payload shape is taken from `api/roofr.js`'s own documented contract.
The harness runs against REAL checklist rows pulled from the database for everything else.

Gates: `check_build.py` green, negative-controlled, 553 → 554. Harness 32/32 against
production rows.

### build 555 — the crew Work Order (Production → crew)
Theo: "a work order section for each client for production to send to the crew either via
email or printed and hand given" · "This is a seperate crew workorder that Cardinal gives to
them" · "There'll be separate work orders for each trade. I can set the emails later make the
contact info editable."

**NOT the community work-order module.** `cr-wo-script` stores a file a partner sent IN to
Cardinal, is community-fenced and is untouched. Theo confirmed these are different documents
travelling in opposite directions, so the fence STAYS — do not widen it.

**Document type three.** `isWorkOrderTitle` joins `isEstimateTitle`/`isContractTitle`. The
load-bearing detail: the `insp` bucket in `renderProjectDocs` is defined by NEGATION, so the
new predicate had to be subtracted there too or every work order would file itself under
Inspections. Gate asserts `isWorkOrderTitle` is used exactly twice — select and exclude.

**Nothing is retyped.** Layers, pitch, decking + condition, satellite dish and roof type come
from the roof inspection (`ck_layers`, `ck_pitch`, `ck_decking`, `ck_deckcond`, `ck_sat`,
`ck_rooftype`); squares and lineal feet from `checklist.meas`, which 554 fills from Roofr;
labor lines from `crew_rates`; the rep from `prefillUserInfo`. Shell is `buildEstimate()`,
stored via `db.create` into `inspection_reports` so it reuses the editor and the `@page Letter`
print path.

**One per trade** — the picker groups crews by trade in the Crews page order. A roof and a
gutter run on the same job are two documents.

**No email is invented.** The crew block reads `crews.contact_*` and renders a visible blank
when absent. The gate asserts no `@` appears anywhere in the module.

**Known limitation, needs a decision from Theo:** `crew_rates` is admin-only in RLS, so a work
order generated by Curtis or Scottie comes back with no labor lines. Rather than print an empty
money table it says the rates were not readable. Either production reads `crew_rates`, or the
labor block stays admin-generated.

Gates: `check_build.py` green, negative-controlled, 554 → 555. Harness 32/32 against real
`projects` rows (Alton's inspection, the field-measured job) and real `crews`/`crew_rates` shapes.
One harness red was a fixture bug of mine — `woBody` prefers `legal_name`, so the hostile `name`
in the escaping test could never render; the assertion, not the escaping, was wrong.

### build 556 — Payments to crews, Commissions on a client. Stage 4, the last.
Theo: "payment history made to crews wired in. with history in the crew section" ·
"a commission section in the client profile paid out and a history of it" ·
"Crew rates is not needed by productions, I write the checks."

**Payments tab on a crew** — admin-only, gated the same three ways Labor Rates is (tab strip,
dispatch fallback, renderer refuses on its own), matching `crew_payments`' `is_cardinal_admin()`
RLS. `check` is the default method because Theo writes the checks. The paid-to-date total is
summed from the rows actually rendered, never a second query, so the figure cannot drift from
the list. `MONEY_TABS = ['rates','payments']` gates both together.

**Commissions tab on the client profile** — `commissions` carries the schema's one split policy:
admins do everything, a rep may SELECT `rep_email = auth.email()`. So it renders for everyone
and a rep simply sees fewer rows; only admins get the form. Fetched on tab open rather than
cached with the project, because the row set depends on who is asking. The rep address is
format-validated and lower-cased before insert — the rep's own SELECT policy matches on that
exact string, so a typo silently orphans the row.

**Work-order labor wording** — 555 printed "Labor rates are not readable from this account" when
production generated one. Theo settled that production doesn't need rates, so that describes the
design, not a fault; it read like a malfunction on a document handed to a subcontractor. Now
"Labor pricing is handled by the office."

**Defect the harness caught, in shipped code:** `money()` (from 548) rendered `$1,875.5` — it was
written for per-unit RATES where `$285` reads fine, but a payment is a check amount and needs two
decimals. Fixed with an opt-in `money(n, cents)`; rates pass nothing and are byte-identical.

**Two anchor traps hit and worth recording:**
- `rates   = (res[4].data)` is aligned with THREE spaces, not one; and the click delegation is
  indented four, not six. Print `repr()` first — both aborted before any write, as designed.
- **`function money(n){` appears NINE times in this file, one per module.** A file-wide
  `count == 1` assertion is meaningless here; the edit is scoped to the `cr-crew-script` slice
  and the patch asserts the other eight survive. This is the file's own "scope the assertion to
  the function, not the file" rule earning its place again.

Gates: `check_build.py` green, negative-controlled, 555 → 556. Chromium 14/14, both roles, both
themes — including the total read off the RENDERED cells and summed independently.

### build 557 — a light twin for the Activity Count tiles
Theo: "fix activity count tiles."

545 shipped them obsidian in BOTH modes — his pick of three gloss treatments, and what he saw in
the preview. 545's own comment left the door open: *"a light twin is one added rule if he wants
one."* He wanted one.

**The inks could not simply carry over, and the arithmetic is why.** 545 pinned both inks
*because* the tile was theme-independent. Computed, not eyeballed:

| ink | on #ffffff | on #f4f1ec cream |
|---|---:|---:|
| `#E8722A` as-is | 3.06:1 | **2.71:1 — under the 3.0 floor** |
| `#C25A18` shipped | 4.40:1 | 3.91:1 |
| `#5f6670` label | 5.80:1 | 5.15:1 |

`#C25A18` is that same orange deepened for a light ground — not a different colour. Swapping it
for cardinal red would have made the two themes read as two different components.

**Designed, not recoloured.** Dark is highlight-led (a white sheen inset riding a black radial);
in light an inset highlight is invisible against a white card, so light is shadow-led — the same
radial inverted, with a real drop shadow doing the lift the inset used to do. Same geometry, same
sheen origin at 22% -10%, asserted equal in both.

**Dark is untouched byte-for-byte** — the patch asserts the four dark rules and both pinned inks
survive unchanged. The one dark-side edit is to a COMMENT: 545 recorded `#E8722A` at 6.47:1 on the
obsidian; against the gradient's LIGHTEST stop (`#2c2d36`, the worst case that actually governs)
it is **4.47:1**. Still far over the floor — the dark tile needed no change — but the recorded
figure was wrong and would have been trusted.

**Blast radius:** `.actbox` has exactly one emitter and appears in no other markup. The "obsidian
recipe" later builds applied to four more surfaces was COPIED under their own class names, so
they are unaffected — asserted.

Gates: `check_build.py` green, negative-controlled, 556 → 557. **Chromium 16/16**, both modes from
the same file, every assertion read via `getComputedStyle` — build 481's lesson, that specificity
on paper is not proof of which rule won.

### build 558 — the left menu survives on every page but two
Theo: *"Every single page in this app should have the navigation on the left side on desktops
except for the landing page"* → asked about the document editor → *"Every page except for the
document editor."*

**The mount gate was never the problem.** `ready()` already returns true for exactly what he
described — desktop ≥1100px, signed in, header up, not the landing page. **24 of 30 views** are in
normal flow and `body.cr-lnav-on{padding-left:var(--lnav-w)}` already handled them.

**Six views are `position:fixed`, and padding on `<body>` does nothing for a fixed child** — it is
laid out against the viewport, not the padding box. Measured in Chromium, not inferred: **an
inline-style scan missed `editorView` entirely**, because its `position:fixed` comes from a
stylesheet. Only a computed-style pass over all 30 found it.

| view | z | before |
|---|---:|---|
| landingView | 150 | covers the menu — **correct**, exception 1 |
| editorView | 150 | covers the menu — **correct**, exception 2 |
| crewsView | 156 | **covered the menu outright** |
| cardinalTruthView / insClientsView / resourceLibraryView | 60 | menu visible, but **content hid beneath it** |

**Two defects, one of them mine.** (1) `#crewsView` never joined the convention a prior build
already established for the other three — `top:var(--headh)!important;z-index:60!important`, which
drops them below the menu (80) and the header (90). Crews shipped at 547 with a bare `z-index:156`.
Fixed by adding it to that selector list, **not** by inventing a second mechanism. (2) **Nothing
has ever offset a fixed view by the menu's width** — all four sat at `left:0` under 238px of menu,
content at x=72. `.wrap` is `max-width:none;padding:0 36px`, so it is genuinely full-bleed and not
centred out of harm's way. Live in production on three pages until now.

`!important` is required, not decorative — the views carry `inset:0` in an **inline style
attribute**, the `styleMounts()` trap. The neighbouring convention rule already uses it for the
same reason. **No media query**: `--lnav-w` is `0px` at `:root` and `238px` only above 1100px, so
the rule self-gates; paired with the `body.cr-lnav-on` scope the phone is unreachable.

**Three assertion traps hit while writing the gates**, each caught before any write:
- A file-wide `body.cr-lnav-on #(\w+View)` sweep also matched the **pre-existing** `#boardView`
  rule and read as a fifth target — a false failure against a correct patch.
- `'landingView' not in block` failed on **my own comment**, which names both exceptions to
  explain why they are excluded. Comments lie in both directions; assert on the selector text.
- An unbounded `[^{}]*` recon regex over 3.2 MB backtracked past the 120s timeout. Bounded it.

Gates: `check_build.py` green, negative-controlled, 557 → 558. **Chromium 14/14, running the same
assertions against 557 and 558 from one script** so every line is its own negative control —
`crewsView` NO→yes, all four content edges x=72→304, the two exceptions byte-identical, the other
24 unmoved, and all 30 unchanged at 900px.

### build 559 — Quick Inspection gets a yellow panel and stops being unreadable
Theo: *"The quick inspec page is unreadable… leave the background color black alone then box the
contents in a square with rounded corners in a deep yellow with white text make the yellow box
recessed and the boxes within it hover with a shadow."* → shown three depths → *"Anything actually
yellow yellow?"* → shown real yellows → *"Do option A but make the boxes within the yellow either
dark grey or black and make them sink into the page with White text."*

**What was actually wrong — rendered and measured, not guessed.** The page is a light-theme design
stranded on the black retail page:

| | computed | on the black page |
|---|---|---:|
| `.viewhead` | `rgb(28,20,22)` | **1.09:1 — invisible** |
| `.subnote` | `rgb(102,102,102)` | 3.42:1 |
| `.qibub` / `.qichip` / `.qibar` | white and cream slabs | glare |

The heading was the real complaint. `backgroundImage` computed to `none`, so the retail
gradient-clip rule people would expect to rescue `.viewhead` is **not** applying — a bare
`.viewhead{color:#1c1416}` wins by file order.

**White text had to move onto the cards, and arithmetic decided it.** White on `#FFD400` is
**1.43:1** — no real yellow can carry white. Dark ink on it is 12.63:1, and white on the `#14110c`
card is 18.83:1. So the panel carries dark ink and Theo's white text lives on the cards inside it.

**Every selector is scoped to `#quickInspView`** — `.btn`, `.chipbtn`, `.axbtn`, `.viewhead`,
`.subnote` and `.wrap` are app-wide classes; unscoped this would restyle every screen. Gated.

**Two traps.** (1) `.chipbtn` carries `-webkit-text-fill-color:#2c2c2c`, which **beats `color`** —
`color:#fff` alone would have left the note buttons dark-on-dark, i.e. reproduced the exact bug
being fixed. Both properties are set everywhere. Same class as `.pipetitle` stripping colour off
emoji. (2) Semantic colour preserved per CLAUDE.md: Camera red, Finish green (an inline style),
active chip red, done chip green.

**A defect only the screenshot caught.** Photos is `class="btn ghost"`, so the `.btn` red rule
swallowed it and rendered a second cardinal-red button beside Camera. **All 19 assertions passed
while that sat on screen.** Fixed with a `.btn.ghost` rule and a 20th assertion. This project's
note that *screenshots root-cause more than reasoning does* earned itself again.

**Green is Finish, and only Finish.** Theo, after seeing the render: a *done* chip was also
green, spending the one colour that means "this inspection is over" on a much smaller idea. Done
is now the same black card with its label in the panel's own yellow — **13.15:1**, unmistakably a
different state from a plain white chip, and no second green anywhere. A darker grey card was
measured first and **rejected**: every candidate came out **1.2–1.7:1 against the neutral chip**,
so "done" would have been invisible. The harness now asserts green appears nowhere in the block
and that Finish's inline green is the only one on the page.

**`#qiStartView` is deliberately untouched** — it shares the invisible-heading problem, but
wrapping a 340px map in a yellow panel is a design decision Theo has not seen. Flagged, not assumed.

Gates: `check_build.py` green, negative-controlled, 558 → 559. **Chromium 20/20** against the
*shipped* `#quickInspView` markup and real stylesheets, with 558 loaded from disk as its own control.

### build 560 — the left menu reaches the Estimates builder too
Theo: *"add the nav section desktop on the estimates page."*

**Why 558 could not have found this screen — the lesson worth keeping.** `#cr-est-view` **is not in
the markup.** `cr-est-script` creates it at runtime:

```js
function ensureView(){ if(view) return view;
  view = document.createElement('div'); view.id = 'cr-est-view';
  document.body.appendChild(view); return view; }
```

Its id is `cr-est-view`, not `...View`, so 558's static scan **and** its computed-style sweep over
`[id$="View"]` both walked straight past it. **A DOM audit that only reads the shipped HTML cannot
see a screen JavaScript appends.** It is `position:fixed;inset:0;z-index:9500` — the highest
surface in the app — so it covered the menu outright.

**Not simply a fifth selector on 558's rule**, for two reasons:

- **Gated on `body.cr-lnav-on`, not applied flat.** That class is set only once the menu has
  actually mounted, so a phone keeps the full-screen takeover at `z-index:9500`/`top:0` byte for
  byte. 558's convention rule is unconditional — right for those four, wrong for this one.
- **`.cr-est-head` is NOT hidden.** The convention hides `.ins-header` on the views it governs, but
  this bar carries the estimate number **and the Save button**; hiding it would remove the only way
  to save an estimate. It reads as a document toolbar beneath the app header.

**Two left rails on desktop, flagged not buried:** the app menu (238px) plus the estimate's own
document outline (`.cr-est-nav`, 224px, desktop-only ≥901px, its own feature). Measured: **798px of
form at 1280, 958px at 1440, 1438px at 1920.** Workable everywhere the menu appears (≥1100px).

Gates: `check_build.py` green, negative-controlled, 559 → 560. **Chromium 11/11**, creating
`#cr-est-view` the same way the app does rather than expecting it in the markup, with 559 as its
own control, at 1440 and at 820.

### build 561 — the Estimates screen the MENU opens, and the Quick Inspection start step
Theo, with a screenshot: *"the quick inspects and estimates, the estimates one does not have the nav."*

**Two of my own mistakes, both visible in that one screenshot.**

**1. 560 fixed the wrong Estimates screen.** THREE surfaces carry "estimate" in the name and I
patched the one nobody reaches from the menu:

| surface | what it is |
|---|---|
| `#cr-est-view` | the per-client BUILDER behind "+ New estimate". **560 fixed this** — real, but not the menu's |
| `#cr-estimates-mount` | **what the menu's Estimates item opens**, via `crOpenEstimates()`. This one |
| `tab-estimates` | a pane in the client profile, normal flow, always had the menu |

And a stylesheet rule alone could never have fixed it:

```js
function styleMounts(){ MOUNT_IDS.forEach(function(id){
  el.style.position='fixed'; el.style.inset='0'; el.style.zIndex='200'; ... }); }
```

Those are **inline styles written by JavaScript** onto `cr-estimates-mount`, `cr-pricing-mount`
and `cr-claims-mount`. Inline beats every stylesheet rule at any specificity — the `styleMounts()`
trap CLAUDE.md lists among its six buried-feature failures, and **the function's own comment
records it biting once before** ("the real cause of 'dark mode isn't there' on
#cr-estimates-mount"). So `!important` is mandatory here, not stylistic.

**All three mounts, not just Estimates.** Pricing Catalog and Claims sit in the same menu carrying
identical inline styles; fixing one and leaving two identical bugs beside it is how this file got
the way it is.

**2. 559 styled the wrong half of Quick Inspection.** It was scoped to `#quickInspView` — the photo
stream you reach AFTER pinning — and I explicitly flagged `#qiStartView` as left alone. **That start
step is the first thing you see**, and its title is the same `#1c1416` on `#0b0b0f` (1.09:1) that
559 existed to fix. It now shares 559's panel, so both halves of one feature match.

**The screenshot also settled that the menu works everywhere else** — plainly visible down the left
of that page. 558 and 560 are fine; this was a third surface neither could reach.

**A red that was the test's fault, recorded per the standing rule:** the shadow assertion failed
because the harness sliced `boxShadow` to 40 chars, chopping `inset` to `inse`. The rule was correct.

Gates: `check_build.py` green, negative-controlled, 560 → 561. **Chromium 12/12**, applying
styleMounts()' inline styles verbatim before testing — anything less would prove nothing — with 560
as its own control, at 1440 and 820.

## 562 — The AI Field Manual, as its own Resource Library section

Fifteen chapters on using AI in this business, reachable from a card on the Library landing below
the two hubs. **Deliberately absent from the TOC** — Theo asked for it that way, so `cr-rltoc-script`'s
TOC array is untouched and `addSection` is never called; the harness asserts the array is
byte-identical to 561.

**It loads in an iframe, and that was forced rather than preferred.** Measured against 561: the book
defines 140 classes of which 36 already exist here (`.card .chip .top .sheet .warn .good .tag .btn`
…), redefines six live custom properties including `--ink`, `--red` and `--muted`, carries bare
`body{}` and `*{}` rules, and runs its own hash router. Inlined it would have restyled the app.
`src` is set on first open only, so the 252 KB is not fetched on every boot, and never re-set — that
would throw away the reader's place.

Three of my own mistakes, all caught before the PR and all by a screenshot rather than by a passing
assertion:

1. **Invented `.rl-boxgrid-one` beside the existing `.rl-single`.** Worse, unprefixed — so it lost to
   `#resourceLibraryView .rl-boxgrid` (1,1,0) at every width above 380px, exactly as 481 lost with
   `.lb-ccfile`. Repaired by deleting mine and using the app's class, not by out-specifying.
2. **The served book had no doctype and no charset.** It is authored as an artifact *fragment* — the
   artifact host supplies the head. Served from Vercel as-is, every em-dash rendered `â€"`. Now
   generated by `scripts/wrap_book.py`, with byte-level assertions against the mojibake.
3. **`.ins-body` caps every RL page at 840px**, so the book showed its phone layout on desktop.
   `body.rl-at-book` now releases that cap, reusing the `rl-at-landing` mechanism already there.

Gates: `check_build.py` green, negative-controlled, 561 → 562. **Chromium 38/38**, extracting the RL
IIFE from `index.html` on every run — the saved copy went stale the moment `showPage()` gained a
line and reported a fixture bug as a product bug.

### build 565 — the autocomplete retry storm, and Discard on an estimate
Built on main @ 7a4a9eb (563). **564 was claimed by a concurrent session** — Theo asked me to check
for other sessions before deploying and he was right: two builds (562, 563) had landed from another
session while this one worked, and a third was mid-flight on 564.

**1. The retry storm.** Theo's console: **21,335 messages climbing to 29,873 in the seconds between
two photographs**, all `[gmap] autocomplete failed on … no google maps key configured`.

```js
catch(e){ console.warn(...); input.dataset.crAutocomplete = ''; }   // ← clears its own guard
```

`attachAutocomplete()` marks a field `'1'` on entry, but **the failure path cleared the mark**. A
`requestAnimationFrame` scanner re-attaches to any field not marked `'1'` — so with no Maps key
configured it retried **at up to 60fps, forever, on every device**. Fixed by leaving the guard set,
and logging once per page instead of per attempt. **Deliberately not a backoff ladder** —
`loadConfig()` already has one (`configFailedAt`), and a second retry mechanism beside an existing
one is the mistake this file warns about.

Measured, not reasoned: 3 fields × 40 frames → **563 logs 120 warnings with every guard cleared;
565 logs 1 with every guard set.**

**The missing key is not fixable from here** — `api/config.js` exists but returns no Maps key, so
autocomplete is dead app-wide. Vercel environment variable, Theo's side. This stops the bleeding.

**2. Discard on an estimate.** Theo could not progress or remove a stuck draft. **The mechanism
already existed and was merely unreachable** — the AI-review screen has always had
`update({status:'discarded'})`, a SOFT delete, and the lanes only match `draft` / `sent,viewed` /
`approved,converted`, so a discarded row leaves the list on its own. The control was added to the
list card and routed to the **same** update — extend, don't add. Both `ai_estimates` and
`manual_estimates` carry `status` (verified against the live database), so one handler serves both.
**Admin-only**, matching `crew_rates` / `crew_payments`.

Handler is **delegated once** (`M.dataset.creDelWired`) because the lanes re-render constantly and a
per-card listener would leak one per render, and it calls `stopPropagation()` so the click does not
also open the estimate underneath.

**Also done outside the build:** the stuck draft (`16f5deb1`, "Unknown client · EST-16F5", $21,247)
was deleted directly from the database. It was an AI-estimator test run against **Bob DeBuilder ·
921 Testing Way** with `project_id` NULL — which is exactly why nothing could progress it, since
sending and converting both need a client. The delete carried guards (`project_id is null and
sent_at is null and approved_at is null and converted_at is null`) so it could not have removed
anything real.

Gates: `check_build.py` green, negative-controlled, 563 → 565. **Chromium 5/5 behavioural** —
the shipped `attachAutocomplete` executed against a failing `loadMaps()` across 40 frames.

### build 566 — the estimates list stops asking for columns that do not exist
From Theo's console: `projects?select=id,created_at,updated_at,created_by,client_name,address,estimate
&estimate=not.is.null` → **HTTP 400**.

`projects` has **neither** `client_name` nor `estimate` — the client column is `name`, and there is
no estimate column at all. Verified against the live database. **So this query has returned 400 on
every single load since it shipped, and the manual half of the estimates list has been silently
empty the whole time.**

**Removed rather than repaired, deliberately.** Repairing means choosing a source, and the
candidates are not equivalent: `manual_estimates` is **empty (0 rows)** while `estimates` holds
**12 real rows** in a different shape than `normalizeManual()` expects. Picking one would surface
twelve estimates in a list that has never shown them — a product decision Theo has not been shown.
`normalizeManual()` is left in place for whoever wires the real source.

**STILL OPEN — the re-render cascade.** Theo's console also reports, from the app's own perf
detector:

```
Re-render loop: span#navWrap > span#crPortalChip     ~240 mutations/sec
Re-render loop: div#landingView                     ~1691 mutations/sec
```

> **⚠ CLOSED AT 567, AND MOST OF THE PARAGRAPH BELOW WAS WRONG.** Kept, struck, because the way it
> was wrong is the lesson. It is not a MutationObserver write-fight; `metallicize`,
> `rerenderChipIfNeeded` and the duplicate-id theory are all innocent. It is two `requestAnimationFrame`
> repaint loops. And it is **not** the missing-nav bug — see 567.

~~**This is the missing-nav bug.** `ready()` in cr-lnav-script gates on `navWrap` and `landingView`;
both are being hammered, so the menu tears itself down. Nothing *removes* the nav — the page never
holds still long enough for it to stay.~~

~~Root cause class identified, culprit NOT yet isolated: **14 MutationObservers, most on
`document.body` with `subtree:true`**, so any one that writes to the body wakes all the others. At
least one confirmed write-fight — `rerenderChipIfNeeded` (L~29939) forces `claimchip ct-community`
on a body-subtree observer while another maintainer sets it back. But the loop the detector names is
on `crPortalChip`, and `paintChip()` **is** correctly guarded (`if(chip.className !== cls)`), so the
actual pair is still unfound. Do not blind-patch this: walk all 14 observers first, and note
`querySelectorAll('#crPortalChip')` at L~47235 implies DUPLICATE IDs from two creators.~~

Gates: `check_build.py` green, negative-controlled, 565 → 566.

---

### build 567 — the two re-render loops, root-caused and stopped

Both loops from the 566 note, closed. Reproduced in a clean headless load of the shipped file with
no sign-in — 60/sec on the chip and 244/sec on the landing, the same loops Theo photographed at 240
and 1691.

**How they were found, after reading the source had failed twice.** Every candidate read looked
correctly guarded, so: patch `appendChild` / `insertBefore` / `replaceChild` / `innerHTML` /
`textContent` / `className` on the prototypes *before* the app's scripts run, record
`new Error().stack` on every write, and sample only past a 6-second settle so the boot burst cannot
drown the signal. The top rows named the culprits outright:

```
64.7/s  set innerHTML   | span#crPortalChip   | paintChip@27964 < tick@28108
64.7/s  set textContent | ...cr-lr-quote>p    | paint@41212 < build@41034     (x7 targets)
```

64.7/s is `requestAnimationFrame` at 60fps. **Two rAF repaint loops, not an observer write-fight.**
`scripts/`-adjacent `loop_probe.js` in the session scratchpad is the pattern; it is worth keeping.

**1. The chip — a guard that could never succeed.** `paintChip()` had the right guard *and* a
comment saying why it mattered. It silently never worked:

```js
if(chip.innerHTML !== html) chip.innerHTML = html;   // html is a SOURCE string
```

`meta.icon` is inline SVG with self-closing `<path .../>`, which the browser serializes back as
`<path ...></path>`. **A source string and its serialization are never equal**, so the guard fired
every frame. Confirmed in Chromium: 5 of 5 guarded passes wrote; 0 of 5 after normalising the source
through a detached element. The fix normalises; it deliberately still compares against the **live**
chip, because that is what lets `paintChip` repair a chip another module has stomped — a dataset
signature would have fixed the loop by throwing that away.

**2. The landing — no guard at all.** `paint()` wrote `textContent` to seven slots unconditionally.
**Assigning `textContent` emits a childList record even when the string is identical** — the old
text node is removed and a new one added regardless. Confirmed in Chromium: 10 identical writes → 10
records; 10 guarded writes → 0.

**The cost was app-wide.** **50 modules in this file call `.observe(document.body, {subtree:true})`**
— a guaranteed mutation every frame woke all 50 every frame, forever, several doing forced layout
reads inside the handler. Battery, heat, and a half-step of lag everywhere.

**❌ It is NOT the missing-nav bug, and 566's note claiming so is struck above.** The menu's gate
reads `getComputedStyle(el).display` on `header.site`, `navWrap` and `landingView`. These loops
rewrote descendant *text* and the chip's *innerHTML*; neither changes either element's `display`, so
`ready()` could not have flipped because of them. The missing-nav report needs its own reproduction.

**A counting trap, earned again.** `.observe(document.body` is 50 in code. Stripping `/* */` first
says 39 — naive comment-stripping ate eleven real calls that sit after a `/*` inside a string. The
file's own warning.

Gates: `check_build.py` green, negative-controlled, 566 → 567. **Chromium, twice:** the probe shows
388 writes/sec → 3.3 (the three clocks, once a second each, correct) and the perf detector reports
**no loops at all**; and a 566-vs-567 comparison harness requires every observable output — chip
class, chip serialized HTML, chip text, SVG count, caret, body portal class, all seven landing slots,
child counts — to be **identical**. All green. The build is invisible by design; the only way it
could be wrong is by having stopped painting something real, which is what that harness exists to
catch.

---

### build 568 — the twelve real estimates finally reach the Estimates screen

566 removed a query that could never succeed and left the list AI-only, saying the real source was a
product decision Theo had not been shown. He said wire it up. Measured against the live database
first, not assumed:

```
estimates          12 rows, 0 archived   <- real work, invisible since it shipped
manual_estimates    0 rows               <- what the list was built to read
ai_estimates        0 rows               <- what the list has actually been reading
```

**The screen has always been empty for the best possible reason: both tables it queried are empty,
and the one with the data was never queried.** Dan Thompson, Kitty Hawk Realty, Kimberly Guy, Kim
Guy, Betty Mann — totals $1,820 to $36,654, all created by theo@.

**The status vocabulary already matched, which is what made this small.** Live `estimates.status` is
exactly `draft` and `sent`; the lanes already read `['draft']` / `['sent','viewed']` /
`['approved','converted']`. Nothing mapped, nothing invented, lanes untouched. The Accepted lane is
empty until something is accepted — correct, not broken.

**The card click was a dead stub, and wiring the query alone would have shipped twelve inert cards.**

```js
else if (typeof window.openManualEstimate === 'function') window.openManualEstimate(id);
```

`window.openManualEstimate` is **defined nowhere** — one reference, no definition. Prime doctrine,
same class as the manual-estimates stub at 314. The real target already existed too:
`CardinalEstimates.openEditor(project, existing)` takes an optional second argument and rebuilds the
editor from exactly the columns `estimates` has. **Nothing new was written to make an estimate
openable.** ⚠ `openEditor` is defined **five** times (19187, 28766, 31026, 37429, 38841); the exported
one is 38841. A name is not a contract.

**Discard now uses the table's own soft delete.** 565 routed anything non-AI to `manual_estimates` —
empty, no writer. `estimates` carries `archived`, and the editor's `loadForProject()` already filters
on it, as does the new list query. One mechanism. `deleteEstimate()` remains the only hard delete.

`normalizeManual()` deleted rather than left beside `normalizeEst()` — a second normalizer for one
concept is how this file grew two of everything. `creProject()`'s `source === 'manual'` branch went
with it: an `est` row's id is an ESTIMATE id, so that branch would have looked up the wrong key and
silently found no trades.

**`total` is coerced with `Number()`.** PostgREST sends numeric as a string, and the harness proves
the raw strings really do sort wrong: `34050.00 > 2560.00 > 1820.00 > 11920.99` — the second-largest
estimate sorts last.

**⚠ What could NOT be verified from here.** Egress policy blocks `yipslubcptjoarblzbpl.supabase.co`,
so the PostgREST call was never made live (the schema and rows came through the Supabase connector, a
different path). The one untested assumption is whether the `projects` embed returns an object or an
array. `normalizeEst()` accepts **both** — one line, and an unhandled array would have rendered every
card as "Unknown client", which is precisely the silent-inert failure this project has shipped before.

**Also flagged, not changed:** `estimates` RLS has `est_update USING (true)` — any signed-in user can
update any estimate, including Discard. Pre-existing, and a permissions decision for Theo.

**Three gate-vs-own-comment collisions in one build.** `normalizeManual`, then `openManualEstimate`
twice — each time the assertion matched the explanatory comment the same patch had just written.
CLAUDE.md's "counting values inside your own comments", earned three times in an hour. All aborted
before any write, which is the design working.

Gates: `check_build.py` green, negative-controlled, 567 → 568. Harness runs the **shipped**
`normalizeEst`, `creProject` and `creLane` (extracted by brace-matching, not re-implemented) against
**real row shapes read out of the live table** — 19 assertions, all green.

---

### SQL only — `estimates_update_policy.sql` (no build number, no index.html change)

Found while wiring 568 and flagged in that PR rather than changed silently. `public.estimates` had
four policies and exactly one of them carried no ownership test:

```
est_read    SELECT   is_full_access() OR the project is readable
est_write   INSERT   (created_by = my_email() OR created_by IS NULL) AND project readable
est_delete  DELETE   is_full_access() OR created_by = my_email()
est_update  UPDATE   USING (true)  WITH CHECK (true)          <- wide open
```

**Any signed-in user could edit any estimate** — line items, total, status, archived — including
estimates they could not delete and did not create. Pre-existing since the table shipped; it survived
because nothing in the UI offered to do it until 568 started showing other people's estimates.

The new policy is **deliberately identical to `est_delete`** rather than a new rule: a user who may
delete their own estimate should be able to edit it, and nobody should be able to edit what they
cannot delete. One ownership rule for the table, not two.

`WITH CHECK` is not a copy of `USING`. USING picks which rows you may touch; WITH CHECK constrains
what the row may become. Without it a rep could edit their own estimate and set `created_by` to
somebody else in the same statement — handing the row away and locking themselves out — or move it
onto a project they cannot see. The EXISTS mirrors `est_write`'s.

Effect, simulated read-only against the 12 live rows before writing anything:

| | before | after |
|---|---:|---:|
| theo, joan, curtis, scottie | 12 | 12 |
| nick, joey, jacob | 12 | **0** |

**⚠ Known cost, stated in the file.** Three writes-back after publishing swallow their errors
(`doc_id`, `contract_doc_id`, `status:'sent'` — all `try{}catch(_){}`). A rep publishing an estimate
somebody ELSE created still gets the document, but the link back to the estimate is not written and
nothing says so. Exposure is narrow and today it is zero: all 12 rows were created by theo@, who is
full-access. `saveEstimate()` is NOT silent — `.select().single()` makes a refused update throw.

**Verification without touching production.** The expressions were type-checked against the live
table with a read-only SELECT, the effect was simulated per-user with a CROSS JOIN, and the DDL
itself was proved to run by creating it under a throwaway name — safe because permissive policies OR
together and `est_update USING (true)` was still in place, so nothing could become more restrictive —
then reading back Postgres's own parse of both expressions and dropping it. That dry run left the
table byte-identical to before.

**APPLIED 2 Aug 2026 on Theo's instruction ("1 run it in supabase"), through the Supabase connector.**
Post-apply state verified: RLS enabled, 4 policies, **0 carrying the bare literal `true`** (was 1),
12 rows intact, 0 archived. The `.sql` file is idempotent, so running it again from the Supabase SQL
editor is a no-op.

**To revert**, one statement:

```sql
drop policy if exists est_update on public.estimates;
create policy est_update on public.estimates for update to authenticated
  using (true) with check (true);
```

---

### build 569 — the landing loop, actually finished

**567 claimed both re-render loops were fixed. Only one was.** Theo's console after 568 deployed still
showed `Re-render loop detected: div#landingView ~245 mutations/sec`. The chip loop was gone from that
same console, so 567's other half landed. This is the correction.

**Why the verification said green when it wasn't — the important part.** 567 guarded the seven
unconditional `textContent` writes in `paint()`. `paint()` ends with `try{ wx(); }catch(_){ }`, and:

```js
function wx(){
  var c = wxCached();
  if(c){ wxPaint(c); return; }        // cache hit -> paints on EVERY call
  fetch('https://api.open-meteo.com/...')...
}
```

**`api.open-meteo.com` is blocked by this environment's egress policy.** With no network and empty
localStorage, `wxCached()` returned null, the fetch failed, and `wxPaint()` never executed once. The
probe measured a path that cannot run here and reported the loop gone — true only in a sandbox where
the weather does not exist. **The denial was printed in the proxy status I read that same session; I
saw `api.open-meteo.com:443` in the list and did not connect it to the module under test.**

**The method fix, which matters more than this build:** `loop_probe.js` now seeds
`localStorage['cr-wx-dayton']` with a real-shaped reading before load, reproducing the production
condition without the blocked host. With that one line the loop reproduces instantly at 64.8/sec, the
stack naming `wxPaint` directly. *When a sandbox cannot reach a dependency, seed its cache — do not
conclude from the path the sandbox happens to allow.*

**The bug:** `wxPaint()` assigned `el.innerHTML` unconditionally. Third instance of the same mistake
in one chain, after `paintChip` and `paint`'s seven slots.

**Why a stored signature here, when 567 deliberately refused one for the chip.** The probe shows it:

```
64.8/s  set innerHTML | ...cr-lr-wx        | wxPaint@40956 < wx@40973
 4.3/s  replaceChild  | ...cr-lr-wx>span.ic | metallicize@16451
```

The weather icon is an **emoji**, so `metallicize` legitimately re-wraps it in `<span class="mic">`.
An `el.innerHTML !== html` guard could therefore never succeed and the two would fight forever — the
chip's "guard that can never succeed", caused by a neighbouring module rather than SVG serialization.
A signature compares intent to intent and lets metallicize's version stand. It is the **six numbers
the markup is a pure function of**, not the markup: the identity of the reading, and small in the
attribute.

`metallicize` untouched, asserted byte-for-byte. It is not the bug.

Gates: `check_build.py` green, negative-controlled, 568 → 569. **Chromium with the cache seeded:** 568
still loops under that condition, 569 reports none; weather content byte-identical between the two;
and — the load-bearing test, because a guard that simply froze the element would pass everything else
— **changing the reading still repaints it** (78°/Overcast → 41°/Light snow, signature moving with it).

---

### build 570 — Crews, Pricing Catalog and Company Documents stop trapping you

Theo: *"The Crews page from navigation has an x and when trying to go to another page it gets stuck
and wont let you unless you hit the x. Also the company documents and pricing catalogue gets you
stuck on the page as well with no way to get out."*

**`hideAllViews()` — what every navigation calls — did not know these four exist:**

```
crewsView            position:fixed; inset:0; z-index:156      (build 547)
cr-estimates-mount   position:fixed; inset:0   (styleMounts, inline)
cr-pricing-mount     "
cr-claims-mount      "
```

It hides twenty-odd views by id; these four were never added. So navigating swapped the page
*underneath* them and left them on top — same screen, no way out but the X. `BUG_CLASSES.md` states
this rule directly (*new full-screen views need registering in `hideAllViews()`*); it was missed four
times.

**Why it got worse, and that part is mine.** Before 558/561 these overlays sat above the left nav, so
the nav was not clickable while one was open and the X was the only affordance. 558/561 lowered them
to `z-index:60` so the menu would show through — which made every menu item clickable without making
any of them close the overlay. The trap pre-existed; **I made it easy to walk into.**

Two fixes, both following what the file already does:

1. The four are registered in `hideAllViews()`, in the same shape as the twenty lines above them.
   `display` is the right lever for all four — `crewsView` ships `style="display:none"` in the markup,
   and the mounts are shown/hidden through `MOUNT.style.display` by their own modules.
2. `CardinalCrews.open()` now calls `hideAllViews()` first, like every other full-screen opener
   already does (`openCompanyDocs()`, `crOpenPricing()`, `crOpenClaims()` all do). Crews was the only
   one that did not, which is why opening it over a mount stacked two overlays.

**`#cr-est-view` is deliberately excluded**, for two independent reasons: it is Theo's document-editor
exception (a stray Pipeline tap would abandon unsaved lines), and `display` is the wrong lever anyway
— the builder is shown by a **class**, so an inline `display:none` would never be cleared by its own
open path and the screen would be dead on the second visit.

**Found, not fixed here:** the same four are missing from `navRestore()`'s switch, so the BACK BUTTON
walks past them too — the other half of the same convention. Not reported, changes the history stack,
wants its own build and its own test.

Gates: `check_build.py` green, negative-controlled, 569 → 570. **Chromium behavioural harness** — show
all four, navigate, read computed display: on 569 all four are still `block` (the bug reproduces); on
570 all four are `none`. Plus: opening Crews over an open mount stacks on 569 and clears on 570; and
`#cr-est-view` receives no inline display and keeps its `.open` class on both.

*Harness note:* the first run FAILED the builder assertions with `(absent)` — `#cr-est-view` is
created at runtime and does not exist until the builder opens (build 560's own lesson). The test was
wrong, not the app; it now creates the element the way `ensureView()` does before asserting.

---

### build 571 — the estimate builder stops trapping you, and Back stops walking past

**1. The builder traps too, and excluding it at 570 was my call.** Theo sent a screenshot of "Edit
Estimate — Betty Mann" with the left menu plainly visible and doing nothing. Both of my reasons for
leaving it out were wrong:

* *"Theo's editor exception."* That was about SHOWING the menu on the editor, not about navigation
  closing it — and 560 gave this screen the menu, so its items already look clickable. A visible menu
  that does nothing is worse than either alternative.
* *"It would silently discard unsaved work."* **False.** The builder's own Cancel is
  `data-act="close"` and calls the same `close()`; there is no confirm and the word `dirty` appears
  nowhere in the module. Navigating away is exactly what Cancel already does, one tap away.

What stayed true from 570: **display is the wrong lever** — the builder is shown by a CLASS, so an
inline `display:none` would never be cleared by its open path and the screen would be dead on the
second visit. It is closed through its own `close()`.

**A real defect the harness caught.** `close()` removes the class through the module's own `view`
reference, which is null until `ensureView()` has run. When null it clears the scroll lock and returns
**without throwing**, so a `catch` cannot see it and the screen stays open. The fix confirms the
result rather than assuming it:

```js
try{ window.CardinalEstimates.close(); }catch(_){}
if(_ev.classList.contains('open')) _ev.classList.remove('open');
```

The harness surfaced it by creating the element without the module — the test was artificial, the gap
it exposed was not.

**2. Back walked straight past all of them.** `BUG_CLASSES` states the rule in one breath: a new
full-screen view needs registering in `hideAllViews()` **and** a history restore case. 570 did the
first half; this does the second. Both existing mechanisms are reused, neither reinvented:

* `wrapNav(globalName, viewName)` for the three mount openers, which **are** globals
  (`crOpenEstimates` / `crOpenPricing` / `crOpenClaims`).
* The method-wrapping IIFE with a `__crNav` guard — copied in shape from the `CardinalCommunityHub`
  block three lines above — for `CardinalCrews.open`, a method `wrapNav` cannot reach since it reads
  `window[name]`.

`case 'estimates'` had existed for builds but **had never once fired**, because nothing ever pushed
that state. It now restores through the global opener rather than the bare module method: the global
is what runs `styleMounts()` and hides sibling mounts, so restoring through `.open()` alone would
have left the mount unstyled.

**The builder deliberately gets no history entry** — a workspace opened from a client, not a
destination. Pushing it would put "half-finished estimate" in the back stack.

Gates: `check_build.py` green, negative-controlled, 570 → 571. Push/restore symmetry asserted **as a
set** rather than by hand-listing. **Chromium:** 570 leaves the builder open after navigating (the
trap reproduces), 571 closes it by class with the scroll lock released; and opening Pricing then Crews
records `["pricing","crews"]` in `history.state` on 571 versus `[null,null]` on 570.

---

### build 572 — Sales Floor, the Objections Coach and the Production Board join the app

Theo, on four screens: *"The production page pops to a new screen without a navigation bar and will
have a lot of empty space also."* Then the coach, then the deck. Measured at 1440×900 rather than
eyeballed:

```
#cr-pb inner content   x=400  width=640   -> 400px dead on EACH side
#cr-lnav display       none
```

Three defects, one family, every one a class 558–571 already fixed elsewhere: no left nav (fixed
overlays at z-index 9500 cover it), not in `hideAllViews()`, and a 640px phone column in a 1440px
window.

**The lever has to match how each is shown — 570's lesson, twice over:**

```
#cr-sf              runtime,  shown by CLASS   (.open)
#cr-pb              runtime,  shown by CLASS   (.open)
#cr-coach-mount     markup,   shown by DISPLAY
#cr-adjusters-mount markup,   shown by DISPLAY
```

Writing display onto a class-shown element would never be cleared by its open path; removing a class
from a display-shown one does nothing. So they are closed separately, each by its own lever.
`cr-adjusters-mount` is included though Theo did not name it — same markup, same mechanism, identical
fault, and fixing one while leaving an identical bug beside it is how this file got the way it is.

**571's lesson applied:** `close()` is preferred (it releases scroll locks and resets state) but then
**confirmed**, because a module close() can no-op without throwing when its internal element
reference is not set.

**Width:** gated on `body.cr-lnav-on`, so phones keep the shipped 640px column byte-for-byte. The
board goes to 1180 and the two card/prose screens to 940 — deliberately different, because a board
earns width but a 1200px measure reads worse than 640. `.cr-k-modal` (480) is a modal, untouched.

**⚠ The harness failed first, and the failure is the lesson.** Six CSS assertions read the *old*
values — including `max-width:940px`, which contains no `var()` at all. The block was in a live
`<style>`; the fault was the test. **`cr-lnav-script`'s `sync()` runs on every body mutation and calls
`teardown()`, which REMOVES `cr-lnav-on`** whenever `ready()` is false — and `ready()` needs a
signed-in DOM the harness cannot reach. Setting the class, waiting, then measuring measured nothing:
the app had already stripped it. The class is now applied and read back in the **same synchronous
evaluate**, before a frame can pass. *Forcing a state the app actively reconciles requires measuring
inside the same tick.*

Gates: `check_build.py` green, negative-controlled, 571 → 572. **Chromium, every assertion a
`getComputedStyle` read** (build 481: a rule can parse, balance and never apply): `left 0px → 238px`,
`top 0px → 110px`, `z-index 9500 → 60` on all three; `max-width` 640→940, 760→940, 640→1180; and
navigating closes Production and the coach, which 571 did not.

---

### build 573 — the four hardcoded-light modules finally follow the theme

Theo: *"Sales floor does not have dark mode, and when im in dark mode going to sales floor starts
really bright in light mode and has no toggle."* Then the coach, then the deck.

**What it actually is.** Sales Floor's own shell (`#cr-sf`) is hardcoded **dark** (`#0d0d0e`). The
Objections Coach that opens inside it is hardcoded **white**. One dark screen handing off to a white
one — that is the "starts really bright".

And it is four modules, not one, all with an **identical** palette and zero theme awareness:

```
cr-coach-styles    #cr-coach-mount      --cr-bg:#fff       0 data-theme, 0 rb-light
cr-pricing-styles  #cr-pricing-mount    --cr-bg:#ffffff    0 data-theme, 0 rb-light
cr-claims-styles   #cr-claims-mount     --cr-bg:#ffffff    0 data-theme, 0 rb-light
cr-adj-styles      #cr-adjusters-mount  --cr-bg:#fff       0 data-theme, 0 rb-light
```

Same 18–20 tokens, four copies. **One dark palette applied to four roots**, which is the only reason
this is a sane build. Shape copied from `cr-estimates-styles`, already converted.

**Light mode ends up byte-identical to what shipped**, and the patch asserts it: every token in each
`rb-light` block must equal the pre-patch value or the build aborts. If light changed, the conversion
was wrong.

**Contrast computed, and re-verified inside the patch** — every ink against the ground (`#141619`),
the raised surface (`#1b1e22`) **and its own tint chip**. Lowest is 4.98:1 against a 4.5 floor.

**⚠ The tokens alone did nothing, and only the PREVIEW caught it.** The coach read `--cr-bg:#141619`
and still painted white:

```js
M.style.background = '#fff';      // cr-coach-script
MOUNT.style.background = '#fff';  // cr-adj-script
```

Inline writes beat every stylesheet rule at any specificity — the `styleMounts()` trap. And
`styleMounts()` **already carries the identical fix**, with a comment: *"background intentionally
left to CSS (was hardcoded #fff inline here, which beat every…)"*. These two modules were never
included. A gate on the stylesheet alone would have shipped this inert.

**The residue split, which is the whole build.** 27 hardcoded light colours sit outside the token
rules. **17 are `color:white` on a coloured ground** (primary buttons, toasts, scorecard) — semantic,
correct in both themes, all left alone. **10 are `background:#fff|white` on surfaces** — converted.
Tokenising the inks too would have turned every red button's white label into grey-on-red.

**Two found, deliberately NOT changed:**

- `--cr-muted-2` in **light** is `#a8a8a8` on white = **2.38:1, already below the floor today**. The
  dark twin is 5.40. Fixing light changes a screen Theo did not report; its own build.
- **`cr-bpa-script` is a fifth module with the same inline-white fault.** Untouched, asserted
  byte-for-byte: stripping its inline background without giving it a dark palette would leave it with
  no background at all.

**A counting trap, again.** `M.style.background='#fff';` is byte-identical in `cr-coach-script` **and**
`cr-bpa-script`, so a file-wide count is meaningless. Gates are scoped per block — the file's own rule,
earned a fifth time this session (four gates tripped on comments the same patch had just written).

Gates: `check_build.py` green, negative-controlled, 572 → 573. **Blast radius verified block-by-block:**
7 blocks changed (4 style, 2 script, 1 changelog), none added or removed, and exactly 2 line diffs
outside them — the app stamp. **Chromium:** coach dark `rgb(255,255,255)` → `rgb(20,22,25)`; coach
light unchanged at `rgb(255,255,255)`; pricing dark `rgb(20,22,25)`.

---

## Build 578 — the before/after slider follows a mouse, not just a finger

**One CSS declaration, and it was found by a gate rather than by reading.** The Chromium render
harness (`scripts/render_showcase.js`, added this session) asserted that dragging the divider moves
`--sh-split`. It went red for two runs at 49.5% and **I blamed the harness twice** — first the
`cr-lnav-on` pin interval re-running style resolution mid-gesture, then the ordering of the test
inside the file. Both theories were wrong, and the second one I acted on before checking.

Logging the pointer stream settled it in one run:

```
pointermove   861   --sh-split 52%
pointerdown   861   --sh-split 52%
pointermove   833   --sh-split 52.000002%
pointercancel   0   --sh-split 49.500002%    <- gesture killed
lostpointercapture
```

One `pointermove`, then **`pointercancel`**: Chromium starting a native drag-and-drop of the `<img>`
under the cursor, which cancels the pointer stream `wireSlider()` listens to.

`.cr-sh-cmp` has carried `touch-action:none` and `user-select:none` since 574, so **the iPad was
covered from day one and nothing covered a mouse.** On a laptop, grabbing the photograph rather than
the 38px handle moved the divider about a pixel, then a ghost copy of the picture followed the
cursor until you let go. It never showed up on Theo's phone because touch never had the fault.

Fix: `-webkit-user-drag:none` on `.cr-sh-cmp img`, in the same rule block as the two declarations
that already solve this family of problem for touch. There is no unprefixed spelling of that
property in any engine — do not add one. Scoped to the slider only; Hall of Fame photographs stay
draggable, which is how you drag one out to save it.

**Gates:** `check_build.py` green 577 → 578, marker `-webkit-user-drag:none`, negative-controlled.
`render_showcase.js` **26/26 green on 578 and red on 577 with exactly one `pointercancel`** — the
assertion counts cancels separately from "the split did not move", because a stalled split has a
dozen causes and a cancel has one. `harness_showcase.js` 105/105, `harness_detect.js` 39/39.

**Two counting notes for whoever patches next.** The label regex finds **22** version strings at
577, not the 20 CLAUDE.md records — builds 574 added two `v2026-08-02 · build 574` module banners
the doc predates. My patch asserted `== 20` off the doc and correctly aborted; the assertion is now
self-computing (`len(after) == len(before)`, exactly one moved). And `jsdom` is not installed in a
fresh container — `npm install jsdom --no-save` keeps it out of `package.json`.

---

## Build 579 — The Walk

Third tab on the Showcase. `walks_schema.sql` **applied and verified before the HTML change**
(walks 12 cols / walk_shots 13, RLS on both, 4 policies each, 3 storage policies for `walks/`).
All of it inside the existing `cr-show-*` blocks — **no twelfth full-screen view**, because
`#cr-show` is already in `hideAllViews()` and `navRestore`.

**The contract, and it lives in the schema rather than in the UI:** `walk_shots.findings` holds
**only findings a human accepted**. The model's proposals live in the browser until Save; rejected
ones are dropped, not flagged. So `reviewed_at IS NULL` means nobody has walked it, and anything in
`findings` has been seen by a person. Present mode (580) can read that with no filtering.

**Copy, don't reference — and the reason came from measuring, not reasoning.** The plan said
reference the existing `storage_path` for job photos. Then:

```
select count(*), count(storage_path) from project_photos;   -> 196, 183
```

**Thirteen rows are inline base64 `data:` URIs with no storage object at all.** Referencing would
have dropped one photo in fifteen from the picker and looked like it worked — the "correct code
that does nothing" class this project has paid for twice. Deleting a job photo also removes the
storage object, which would blank a walk weeks later in front of a client. Both sources copy;
`origin_photo_id` keeps the provenance.

**Two traps.** `/api/detect` destructures `{image, mime}` and hands `image` straight to Gemini as
`inline_data.data` — it wants **bare base64**. `/api/caption` is passed a full `data:` URL, so
copying that call verbatim fails at the model rather than at the fetch. And in `wireBoxes()`,
moving the selection on `pointerdown` **toggles classes and never repaints**: `repaint()` replaces
`innerHTML`, so the element under the finger would be destroyed and the capture lost on the first
frame — 578's lesson arriving in a different shape, one build later.

**Gates.** `check_build.py` green 578 → 579, marker `renderWalkTab`, negative-controlled.
**`harness_walk.js` — new, 67 assertions**, running the sliced shipped module; its own negative
control reports cleanly on a pre-579 artifact instead of crashing on a null deref.
`harness_showcase.js` 106, `harness_detect.js` 39, **`render_showcase.js` 36 in real Chromium** —
extended to prove a box with fractions `.25/.40/.30/.20` lands at exactly those fractions of the
rendered stage, that crit and warn resolve to *different* colours, and that the grip is hidden on
an unselected box. jsdom cannot make any of those three claims.

**Four harness reds, all mine, all the test's fault** — worth recording because the ratio holds:
- `SHOTS` was shared **by reference** across boots, so a successful save in one block stamped
  `reviewed_at` onto the fixture and two later blocks silently opened an already-reviewed shot.
  Three reds, one cause. Fixtures are deep-cloned per boot now.
- CSSOM normalises `30.000%` to `30%`; the assertion was matching the literal string the module
  wrote rather than the unit and the value.
- In `harness_showcase.js`, *"Hall of Fame never reads a client record"* sliced
  `split('function openWorkForm()')[1]` — **everything after** that function. It was sloppy from the
  start and only failed once 579 appended a tab that legitimately reads `projects`. Now bounded to
  `openWorkForm` → `removeWork`, with an assertion that the slice captured anything at all.

**`npm install X --no-save` reinstalls from `package.json` and PRUNES anything unlisted** — installing
`jsdom` that way silently removed `playwright` and the Chromium harness died with MODULE_NOT_FOUND.
Install them in one command: `npm install jsdom playwright --no-save`.

---

## Build 580 — the review screen warns before it discards work

Found by manual audit, not a gate — exactly the class of thing no assertion existed to catch
because nothing crashes and nothing renders wrong. A person just loses work silently.

**Both `Back` and `Ask again` discarded unsaved review state with no confirmation.** Concrete
scenario: reopen an already-reviewed shot, drag a box to fix its position — that edit only
lives in `review.list`, nothing is written until Save — then tap `Ask again` to see if the AI
catches anything else, or just tap `Back` thinking you're done. Either one threw the change away
silently. Same class the project already treats seriously elsewhere (scroll locks, estimate
edits); this instance just had no test written against it because nobody had thought of the
interaction yet.

**The fix is a session-local `dirty` flag, not the persisted `edited` field.** Reusing `edited`
was the first instinct and the wrong one: a previously-saved finding already carries
`edited:true` from an earlier session, so reopening it would trip the guard on a shot nobody has
touched this visit — a false positive, not a fix. `dirty` starts `false` on open and is set only
by an actual decision this session: rejecting a finding, re-classifying severity, or finishing a
drag (`stop()`, not `pointermove` — starting a drag isn't a decision, finishing one is). Asking
the AI for the first time, or reopening a shot untouched, sets nothing and asks nothing.

**Two things ruled out in the same pass, worth recording as much as the bug itself:**
- Suspected `shotBlob()` reading a job photo's `projects/…` path would fail RLS, since
  `walk_objects_read` only covers `walks/%`. Checked the real policies — a pre-existing blanket
  `photos_read` (`bucket_id = 'photos'`, no prefix) already covers it. False alarm, confirmed by
  query, not assumed.
- `walk_shots.caption` is a real column with zero references in the module — dead schema
  surface, not a bug, left as-is.

**Gates.** `check_build.py` green 579 → 580, marker `review.dirty`, negative-controlled.
`harness_walk.js` grew from 67 to **80** — the new assertions confirm the untouched-review case
asks nothing (a guard that nags every visit is worse than no guard), that cancelling the confirm
actually keeps the rejection intact rather than discarding anyway, and that `runDetect()` itself
never sets `dirty` (only the three real decision points do). **Negative-controlled against 579:
5 of the 13 new assertions correctly fail** there, confirming the harness tests the guard and
not just its own fixtures. `harness_showcase.js` 106, `harness_detect.js` 39,
`render_showcase.js` 36 — unaffected, confirming no regression on the surfaces those gates own.

### builds 562–563, 574–577 — The AI Field Manual, and the hardware chapter it kept getting wrong

Written in one long session, logged here in one entry because they are one thing.

**562** — the book (15 chapters + back matter) filed in the Resource Library as its own section,
**not in the TOC**, which Theo asked for explicitly. Served as `/ai-field-manual.html` and
iframed. That was **forced, not preferred**: 36 class collisions and 6 token collisions between
the book's stylesheet and the app's, measured before choosing.

⚠️ **The repo copy is GENERATED.** The book is authored as an artifact, and the artifact host wraps
what you write in `<!doctype><head><meta charset>`. Ship those same bytes from Vercel and the
browser guesses the encoding — every em-dash renders `â€"`. **A screenshot is the only thing that
caught it.** `scripts/wrap_book.py` now does the wrap; never hand-edit `ai-field-manual.html`.

**563** — my own regression from 562, reproduced against a real service worker before fixing.
`sw.js` cached **every** successful navigation under `'/'`, which was harmless while `/` was the
only navigable URL on the origin. **An iframe load IS a navigation**, so opening the book replaced
the offline shell with the book. Now `url.pathname === '/'` gates the write.

**574** — the hardware page was factually wrong and had been since it shipped. Apple **withdrew**
512 GB (March 2026) and 256/128 GB (May) as AI demand ate DRAM supply, so the Mac Studio line caps
at **96 GB** — and the Spark's 128 GB is now larger than any Mac Studio sold. The **MacBook Pro
M5 Max still takes 128 GB at 614 GB/s**, so the laptop outholds the desktop, which sounds like a
mistake and isn't. Also added the commands page (no fixed photos folder exists on a Spark — the
page teaches the search, not a path).

**575** — Theo: *"So no pros on the amd at all?"* The AMD cells were **balanced** — three of seven
went AMD's way — but the specs led and the verdict came last, so the impression was wrong even
though the content wasn't. **Ordering beat content.** AMD got a four-item pros run ahead of its
spec table, and a document-order assertion so it stays there.

**576** — Theo: *"This is not all about the photos, that was a small part in buying a spark a very
small part."* Correct, and mine. Both verdicts rested on the photo job when the chapter's own
"what local does well" lists six uses with **image generation first**. One harness assertion had
to be **inverted** — it *required* the narrow argument, so it would have held the mistake in place
rather than catching it.

**577** — the same 575 fix applied to Apple, plus two figures the book contradicted itself on:

- **`3.4×` reproduces from nothing in the book's own table.** 819/273 is 3.0 (M3 Ultra) and
  614/273 is 2.2 (MacBook Pro). Now quoted at both ends, like AMD's price.
- **"the only two machines that reach 128 GB" was stale the moment 575 added the AMD row** — three
  are highlighted. Mine, from 575.
- **RTX PRO 6000 Blackwell** added: 96 GB at 1,792 GB/s, which the chapter's own arithmetic puts at
  a 128B model at **16 t/s** against 2 on the Spark. It is the one thing on the page that refuses
  the capacity-or-speed trade, so the trade is now named as **a price trade, not a law of physics**.
  $13,250 + a workstation + 600 W ≈ three and a half Sparks.
- Plus what was deliberately left out, with a reason each (RTX 5090, a second Spark, Jetson, cloud).

**Two gate failures at 577 were the TEST, not the book** — the file's own rule, earned twice more:
`parseInt('1,792')` is **1**, so the arithmetic check reported "want 0 t/s" against a correct row;
and a whole-table `/512|256/` matched AMD's 256 GB/s **bandwidth** cell.

Gates: `check_build.py` green 576 → 577, negative-controlled. Book harness **303 assertions**, and
the negative control fails **12** of them against the 576 book, each naming what 577 changed.
`h562_aibook.js` 40/40. Web ↔ markdown numeric parity 20/20.

---

### build 578 — the manual reordered into four groups, and the hardware split out

Theo: *"Also reorder the chapters to what makes sense."* Plus a chapter of its own for the machines.

**Four ordering faults, not one.** Laid out end to end they were obvious: VI (local vs cloud) and
XI (the Spark) were the same subject **five chapters apart**, with IX and X — also hardware — stranded
between them; **XIII "What never to paste" is a day-one safety rule and four earlier chapters
cross-referenced *forward* to it**; IV "Building apps" came before VII "What's worth building"; and
V "Marketing" sat between the how-to-use group and the hardware group, interrupting both.

```
Using it         I talking · II prompting · III never-paste · IV agents
Choosing         V which model · VI local vs cloud · VII THE MACHINES · VIII the Spark · IX stacks
Building it      X what's worth · XI building apps · XII photo binder · XIII claims · XIV marketing
The wider world  XV Glasswing · XVI the other half of the map
```

**13 of 16 chapters changed number, moving ~150 cross-references.**

⚠️ **The trap, and it is the one this project keeps paying for.** The map contains **IX→V and
V→XIV**. A sequential find-and-replace rewrites IX to V and then rewrites *that* V to XIV, and
chapter IX silently lands on XIV. Every replacement is computed against the ORIGINAL string and
spliced in **one reverse-order pass**, so no output is ever an input.

**And I walked straight into it anyway**, in the one place numerals are authored by hand: the
sources deck was rewritten with FINAL numerals and then swept, turning my new "Chapter XIII" back
into "Chapter III". Caught by a carry-over tally — *the count of references to each new numeral must
equal the count the old numeral had* — not by reading the code. The deck is now fenced off from the
sweep.

⚠️ **The separator trap, twice.** 15 source labels use a literal `·` and 24 use `&middot;`; the
sources deck uses a literal `–` where the rest of the file uses `&#8211;`. Anchoring on one form
silently found a subset — `Chapter VI · the memory cap` reported **0 occurrences** while sitting in
the file twice. Same class as `'` vs `&apos;`.

**The split.** VI keeps the formula, the four types, mixture-of-experts, what local does and can't
do, and the verdict. VII takes every machine. **The four-types table went with VII**, which the
first cut missed — it is five machines and their tokens/sec, i.e. the formula being *run*. Caught by
asserting no machine name survives in VI; a Ryzen row was still sitting in it.

**Nothing is patched — everything is regenerated.** A chapter's number appears in seven places
(data-ch, .cnum, the .pg counter, its own folio, both neighbours' folios, the spine, the cover)
plus a comment separator. 16 × 7 is 112 chances to be off by one. One ORDER list is now the source
of truth and all of it is rebuilt from that. The class of bug that put chapter IX's "next" pointing
at itself cannot occur.

**Two live defects found by the new assertions, both pre-existing:**

- **A chapter cited itself by number** — "Chapter IX picks two Claudes" *inside chapter IX*. Nothing
  had ever checked. Reworded.
- **The opener gutter was 3.4rem and the widest numeral is 6.26rem**, so chapter VIII rendered
  **"VIIThe Spark"** — the title's T sitting on the numeral's last I. **Six chapters were already
  colliding**; the reorder added a seventh. Measured with a Range, not eyeballed, and confirmed
  present in the build-577 book before the fix.

**Two harness defects fixed, both of which had produced a false green:**

- **A bad explicit path fell through to the real book.** Five mutation tests reported 325/325 while
  the mutant files had never been written. An explicit path that does not exist now exits 2.
- **A crash threw away every result.** Assertions are buffered and printed at the end, so an
  exception mid-run showed a bare stack trace and no ✗ at all — which reads as "the harness is
  broken" rather than "the book is". Results now print on abort.

**The harness addresses chapters BY NAME now** (`go(CH.machines)`), because every `'#/9'` in it
silently meant a different chapter after the reorder — a test that opens the wrong page still passes
or fails, for reasons unrelated to what it claims to check.

Gates: `check_build.py` green 577 → 578, negative-controlled. Book harness **325**, up from 303, and
**five mutants** each produce a named failure (reference-to-nowhere, self-citation, machine left in
VI, pager miscount, TOC drift). `h562_aibook.js` 42/42. Web ↔ markdown chapter order compared
title-by-title, 16/16.

---

### build 581 — What's New was showing five blank cards, and a merge that had to be untangled

**Found while resolving a merge, not while looking for it.** Two sessions worked 2 Aug in parallel.
`origin/main` had builds **574–580** (the Showcase, the Hall of Fame, The Walk) while this branch had
its own **574–578** for the manual — a build-number collision, which CLAUDE.md says is normal here
and never to renumber.

**The real find was in the conflict.** That PR added its seven entries in a **new changelog shape**:

```js
{ b:580, d:'2026-08-02', t:'title', s:'summary' }     //  7 entries
{ build:576, note:'…' }                               // 268 entries
```

and the renderer only ever read `.build` and `.note`:

```js
CHANGELOG.filter(function(e){ return e.build > lastSeen; })   // undefined > n  -> false
'Build ' + e.build          // "Build undefined"
esc(e.note)                 // '' — esc maps null/undefined to empty
```

**Reproduced against the shipped module before anything was written** — sliced `cr-cl-script` out of
`origin/main:index.html` and served it, because it reads `localStorage` and a `setContent` document
has no origin to read it from (the first attempt died on `SecurityError`, which is its own small
lesson). Measured:

| lastSeen | before | after |
|---|---|---|
| 573 | 3 cards, newest **576** — builds 577–580 invisible | 13 cards, newest 581 |
| 576 | **5 blank cards reading "Build undefined"** | 7 cards, all with text |
| 579 | same five blank cards | 2 cards |

The empty filter fell through to `CHANGELOG.slice(0, 5)`, which is exactly the seven new-shape
entries. **Anyone who had already seen build 576 — everyone, it deployed — got five blank cards.**
Not mine; found in the merge and fixed here rather than built on top of.

**The fix reads both shapes** (`entryBuild()` / `entryNote()`) rather than rewriting 268 entries.
A new-shape entry renders as *title* — *summary*.

**And the merge itself needed sorting.** Concatenating two histories gave the box two descending runs
— 581, 580…574, then 578, 577…574 — which reads as broken. The array is now stably sorted
newest-first, so the five duplicated numbers sit adjacent, which is the honest presentation of two
sessions that both used them. Asserted as a pure permutation: same entries, same byte count.

⚠️ **My own assertion was wrong twice in this build, and both times it stopped a bad write.**
`entryBuild(` appears **3** times, not the 4 I guessed, so the patch refused to land until I counted;
and the `newest first` check failed on a list that *looked* descending — because it printed only the
first six of thirteen, and the drop was at index 8. **Print what your extractor captured.**

Gates: `check_build.py` green **580 → 581**, negative-controlled against `origin/main`. New harness
`h581_changelog.js` (25 assertions) runs the shipped module against the shipped array at eight
`lastSeen` values. Book harness 325/325, `h562_aibook.js` 42/42.

---

### build 582 — the hardware chapter answers the whole question

Seven asks in one message. 578 built the container; this fills it. **Eight new sections**, and the
one rewrite that mattered most.

| Ask | Section |
|---|---|
| *"Tech specs in its own section"* | **The spec sheet** — six machines, no conclusions drawn |
| — | **The DGX Spark, since it is the one you own** — four pros, three cons |
| *"a detailed section on apple as well"* | **Apple, in detail** — the line-up, MLX, then the withdrawals |
| *"Make the 6000 its own section… pros and cons"* | **The RTX PRO 6000, which breaks the rule** |
| *"the comparison section spark vs apple vs 6000"* | **Side by side** — one three-column table |
| *"what if I stacked 2 sparks"* | **What stacking two Sparks actually changes** |
| *"Can you partner a spark and a 5090"* | **Can you partner a Spark with a 5090?** |
| *"any references to photo use only… re-analyze"* | VI's workload list, rewritten |

**The photo rewrite was a real defect, not a tone change.** "What local does well" listed **five**
items while two verdicts leaning on it said **six**. It is now **seven** — image generation, LoRA
training, transcription, document search, reading paperwork, photo tagging, a private assistant —
and photo work says of itself that it is *one line of seven, roughly its share of why the machine
is worth owning*. Theo: *"that was a small part in buying a spark a very small part."*

**Every computed figure is derived in the patch script and self-checked against a row the book
already ships** before any of it is written:

```python
def tps(bw, B): return round(bw * 0.58 / (0.5 * B))
CHECK = [(273,171,2), (819,128,7), (614,171,4), (546,48,13), (256,171,2)]
```

so RTX PRO 6000 = 96 GB → 128B at **16 t/s**, RTX 5090 = 32 GB → 43B at **48 t/s**, two Sparks =
256 GB → 341B at **1 t/s**. If the method ever drifts the script aborts before writing.

**The two stacking answers, which are the same answer twice.** Memory adds; bandwidth does not. Two
Sparks double capacity and make the biggest model *slower* — unless it is mixture-of-experts, which
is why owners measure 27–28 t/s on a 397B model that the dense maths calls impossible. A Spark and
a 5090 cannot be joined at all in the way people mean: **the Spark is sealed and has no slot**, so
"partnering" means two computers on a network, and a token then walks through both.

**Chapter VIII already had a Two Sparks section** and it agreed with the new one — same claim, same
reasoning. It now points at VII's numbers rather than arguing the case independently. *Grep before
you write: the prime doctrine, earned again.*

⚠️ **Four of my own assertions were wrong and every one stopped a bad write.** `RTX PRO 6000`
appears 4 times, not 5 (the three-way table header omits the model word). The new sections add
**10** headings, not 8 — four of them carry a callout with its own `h3`. A whole-file check on
`Spark vs Mac Studio` fails on a *source-link title* that must not be renamed. And
`orig.index('data-ch="8"')` finds the **spine TOC entry**, not the section, so the blast-radius
check compared the file against itself from the wrong offset.

⚠️ **And two harness patterns were wrong for the same reason twice.** `textContent` hands back
**decoded** entities, so `200&nbsp;Gb/s` is `200 Gb/s` and `Max&#8209;Q` is `Max‑Q`. A
pattern written with an ordinary space or hyphen matches neither. Both failed against correct
prose. The block now normalises before matching.

Gates: `check_build.py` green 581 → 582, negative-controlled. Book harness **345** (was 325), and
**25** of them fail against the 578 book — each naming exactly what 582 added. `h562_aibook.js`
42/42, `h581_changelog.js` 25/25. Web ↔ markdown parity 33/33. Screenshots of all six new sections
at 390 px and 1280 px, light and dark.

---

## Builds 584–588 — the Vision Suite's five, in one sitting

Theo approved all five preview options ("Why not do all 5?") unified on the Blackout scheme.
Each shipped as its own build, gated before the next started; the per-build detail is in the
five commit messages (`abff82d`, `aa6afd2`, `4df8681`, `43de1ee`, `239a8cc`). What belongs here
is what future sessions need:

- **583 was deliberately skipped** — open PR #105 claims it. Gaps are normal; collisions with an
  open PR are not.
- **`walk_shots.findings` grew a `source` key** (`'ai'`|`'human'`) at 585. It is stamped in
  `runDetect()` and preserved through `saveReview()`'s rebuild (`f.source || 'ai'` defaults old
  rows). "Ask again" now filters on it: human marks survive, AI marks refresh.
- **Interactive preview practice paid twice.** The five were first built as a live artifact
  (claude.ai) Theo could touch; its pre-publish Chromium check caught the +/− buttons feeding
  the lens's double-tap detector — 578's class — before it ever reached the app.
- **Harness slice discipline, third occurrence:** "The Walk never draws onto the image" ran to
  end-of-module and went red when 587 added the share-card canvas legitimately. Bound every
  slice; assert the slice captured something.
- Chromium proofs worth keeping as patterns: pixel-reading a canvas (`getImageData` on the share
  card's mat), synthetic two-pointer `PointerEvent`s for pinch, sampling a CSS var mid-animation
  for the kiosk wipe.

---

## Build 589 — the slider's expand button works on a real tap

Found by a new four-viewport audit (`scripts/audit_viewports.js`), not the standard ladder:
build 586's ⤢ expand button sits INSIDE `.cr-sh-cmp`, and the slider's `pointerdown` calls
`cmp.setPointerCapture()`. Pointerdown targets the button, pointerup is captured by the slider —
and a browser fires **no click event** when they differ. The button did nothing on a real tap;
only a synthetic `onclick()` fired it, which is why 586's Chromium test (it clicked the
review-stage lens, never this one) passed while the feature was dead on a device. **578's class
exactly** — a control inside a gesture surface.

Fix: the slider's `pointerdown` ignores a press on `.cr-sh-exp`, mirroring the guard the Lens
already carries for its own +/− buttons. One line.

**The audit is the real deliverable here.** `audit_viewports.js` drives every Vision Suite
function at phone / iPad-portrait / iPad-landscape / desktop AND runs an overlap sweep: it
collects every visible button + slider handle + label chip and flags any pair intersecting >15%
of the smaller one. It caught this dead button and confirmed zero control overlaps at any size —
the class the eyeball missed twice (the ⤢/After collision, then this). Re-run it on any Showcase
change: `node .claude/skills/cardinal-build/scripts/audit_viewports.js` from the repo root.

Gates: `check_build` green 588→589 (marker `e.target.closest('.cr-sh-exp')`, negative-controlled),
audit **76/76 across four viewports**, and the four existing harnesses unchanged
(walk 115, showcase 123, detect 39, render 69).

---

## Build 590 — Showroom mode (2026-08-03)

A read-only front door into the Showcase, opened from the landing launcher. Same login, same
data, same module — no second app. Theo's design call, taken literally: *"with the showroom
there is no editing… everything done in the other end."*

**The read-only guarantee is one choke point plus four gates, and the honest split matters.**
`amAdmin()` is called at 14 sites across all three tabs, so `if(showroom) return false;` at the
top of it removes every add / publish / remove / share / add-photographs control at once. But
**four surfaces were never `amAdmin()`-gated at all** and the choke point does nothing for them:

| Surface | What was reachable | Gated on |
|---|---|---|
| `renderReview()` bar | Ask the AI · + Mark damage · Save what I accepted | `!showroom` |
| `wireBoxes()` | **existing boxes drag with NO arming step** — pointerdown on `[data-box]` sets `mode:'move'`, writes `f.edited` and `review.dirty` | `!showroom` |
| the findings list | per-finding **remove ✕**, editable severity **`<select>`**, resize **grip** | `!showroom` |
| `releaseBadge()` | *"Release: M. Alvarez · Nov 2025"* — a real person's name and an internal marketing-consent fact about somebody else's house | `!showroom` |

Gated on `showroom`, **not** on `amAdmin()`: sales and production keep exactly what they have
today. Changing their permissions is Theo's call, not a side effect of a presentation mode.

### Three things this build got wrong first, all worth keeping

**1 · The launcher card was added to dead markup.** `#landQuick / #landDash / #landClaims /
#landLibrary` around line 3961 look like the launcher. They are not: `cr-lr-styles` carries
`#landingView>*{display:none}` and the `cr-lr` module replaces the whole view at runtime with
`.cr-lr` and its `.cr-lr-course` rows. `getElementById('landQuick')` returns **null** in a real
browser. The card passed every mechanical gate and was never in the DOM. The live mount is the
`cr-lr` renderer's own string, and the handler is its `wire()` `data-go` switch.

**2 · The ✕ was unreachable on desktop — third time for this class.** 572 insets every
full-screen view (`top:var(--headh); left:var(--lnav-w); z-index:60`) so the menu stays
reachable. With that applied, `#cr-show` drops to z-index 60 while `header.site` is fixed at
z-index 90 and 138px tall, so `elementFromPoint` at the exit button returned **`HEADER.site`** at
1180 and 1440. **Raising the button's z-index would not have helped** — it is inside `#cr-show`'s
stacking context and cannot escape it. The fix is to remove the overlap: the showroom takes the
whole screen back (`body.cr-lnav-on #cr-show.showroom{top:0;left:0;z-index:9500}`), which is what
"nothing else reachable" means anyway. Same dead-control class as 578 and 589.

**3 · The counted zero was counting the wrong things.** `audit_viewports.js` asserted zero write
controls and passed — while the review screen still carried a remove button, a `<select>` and a
grip, because the scan only looked at `[data-act]` and those use `data-drop` / `data-sev` /
`data-grip`. **A screenshot caught what the assertion missed.** The scan now sweeps the named
write actions, a list of write-ish `data-*` attributes, and every `select` / `textarea` / `input`
by tag — name-independent. *A counted zero is only as good as the list it counts against.*

**Not a kiosk, and the PR says so.** This hides the app; it does not lock the device. A browser
back gesture still leaves, exactly as from any other full-screen view here. The hold is about a
client not wandering out, not about restraining one.

Offered at **≥820px only** — the row is hidden below that and the opener falls back to the
ordinary Showcase rather than refusing, so a phone loses nothing.

Gates: `check_build` green 589→590 (marker `if(showroom) return false;`, negative-controlled) ·
`audit_viewports` **194/194 across four viewports** (was 76) · `harness_walk` 115 ·
`harness_showcase` 123 · `harness_detect` 39 · `render_showcase` 69. No SQL, no `/api` change.

**Found, not fixed — flagged for Theo.** On the landing itself, `.cr-lr-course .tt` and `.sb` are
both `display:inline` (verified with `getComputedStyle`, not by reading CSS), so all four main
rows run their title straight into their subtitle: *"Quick InspectionWalk the roof, shoot the
photos…"*. Pre-existing, both themes, every width. Two declarations to fix; deliberately left out
of 590 rather than widening the build.

---

### build 583 — the Library's floating pills stop covering the book

Theo, with a screenshot of chapter VII half-buried: *"take all of toc, library, manage, ask file out
of the way ... whichever is easier."*

**Five controls float over whatever Resource Library page is showing**, gated on `body.viewing-rl`
alone:

```
#cr-rltoc-btn      TOC         left 24, bottom 24
#cr-nachi-mgr-btn  MANAGE      left 24, bottom 78    (admin only)
#cr-rlhome-btn     LIBRARY     left 24, bottom 133
#cr-rltheme-btn    theme       left 24, bottom 187
#rlAskBtn          ASK / FILE  bottom right
```

**None of them acts on the book.** Its Contents drawer is inside the iframe, it has no filed cards,
the librarian does not answer about it, and it already follows the app theme.

⚠️ **They cannot simply all be hidden, and measuring first is what found that.**
`#insClientsView .ins-header,#resourceLibraryView .ins-header{display:none}` hides the Library
header **everywhere** — which is *why* the pills exist at all (447: *"the old back arrow had been
hidden by the header redesign"*). A Chromium probe against the shipped view reported
`insHeader.vis:false` and `rlBackBtn 0×0`, so **`#cr-rlhome-btn` was the only way out of the book.**
Hiding all five would have trapped the reader — the 570–572 class exactly.

So: hide all five **and give the page back the real header**, which already carries a back button
wired to `parentOf` and is already styled for the Library (`#resourceLibraryView .ins-header` has a
background and border-bottom sitting unused). Specificity (1,1,1) beats the (1,1,0) that hides it,
in any order. Chrome above the frame instead of on top of it.

**⚠ The frame change I tried and reverted, because the probe caught it.** I also made
`.rl-bookframe` flex-sized to stop the pane overscrolling. It collapsed the frame to **150px of
844** — because `showLibrary()` sets `#resourceLibraryView`'s display **inline**, and inline beats
every stylesheet rule at any specificity. That is the `styleMounts()` trap, and build 573's notes
say so in as many words. Reverted; the overscroll is pre-existing and was not what was reported.

**⚠ And an assertion of mine was wrong in a way worth recording.** *"Back sits above the frame"*
failed on phone with `back.bottom=166 frame.top=0` — because `.ins-header` is `position:sticky`, so
once the pane scrolls it pins over the frame **by design**, as it does on every other Library page.
The assertion now measures at scroll-top and separately asserts the header IS sticky. A geometric
claim that only holds at one scroll position is not a claim about the layout.

Plus the counting trap, again: `s.count('100dvh')` read 2 where 1 was expected, because the comment
documenting the change contained the value it changed. Assert on `min-height:100dvh`, not the bare
string.

Gates: `check_build.py` green 582 → 583, negative-controlled. New harness
`h583_book_chrome.js` — 24 assertions at phone and desktop covering pills-hidden-on-the-book,
pills-still-work-elsewhere, header-and-back-restored, back-actually-leaves, and
`rl-at-book` cleared afterwards. Negative control against 582 fails on four visible pills, no header
and a 0×0 back button. `h562_aibook.js` 42/42, `h581_changelog.js` 25/25, book harness 345/345.
Rendered over real HTTP and screenshotted at 390 px.

---

### build 583 — the Library's pills stop covering the book, then the bar slims to just the arrow

Theo, with a screenshot of chapter VII half-buried: *"take all of toc, library, manage, ask file out
of the way."* Five floating controls sat over the book and none of them acts on it. They could not
simply be hidden — `#resourceLibraryView .ins-header{display:none}` hides the Library header
everywhere (which is WHY the pills exist, 447), so a Chromium probe showed `#cr-rlhome-btn` was the
only way out. The fix hides all five on `body.rl-at-book` AND restores the real header, whose back
button was already wired to `parentOf`. Then, on review: *"slim the app one down to just the back
arrow"* — title and Library theme toggle hidden on the book page only, tight padding; the router
still writes the title, asserted, because every other Library page shows it.

Two of my own steps were reverted/corrected by measurement: a flex-height frame collapsed to 150px
(`showLibrary()` sets display INLINE — the `styleMounts()` trap), and a "back sits above the frame"
assertion failed a correct layout because `.ins-header` is `position:sticky` and pins when scrolled
by design. Harness `h583_book_chrome.js`, 28 assertions; negative control vs 582 fails on four
visible pills, no header, 0×0 back button.

---

### build 584 — the seventeenth chapter: What AI can build, with a deck running inside it

Theo: *"make a session about the variety of things ai can build like CRMs, websites, study
materials, visuals and audio, presentation apps, etc ... built around the construction industry ...
amazing examples with a presentation within it."*

**Attribution correction, for the record:** mid-build Theo wrote *"I don't think it would be good
to present from phone with something this great"* — he later clarified that line was meant for a
DIFFERENT session (about the app's Showcase tabs, which this build deliberately does not touch).
The deck's phone-flat behavior below was built on that misread. It is KEPT on its own merits —
presenting UI was cramped at 390px (it overflowed by 9px before), and flat slides read better on
the phone Theo actually uses — but it is one CSS block and reverts on a word.

**Chapter XV closes the Building-it group.** A catalogue of eight shelves (CRM, websites,
documents, study materials, visuals, audio, decks, dashboards), each mapped onto Cardinal —
**five marked "already yours"** because they ship today (the app, work orders, The Walk, the
Library illustrations, the analytics). Three worked builds (storm-morning kit, apprentice
curriculum, one-button adjuster deck), an effort table, and the closing rule pointing back at
Chapter X's deciding question.

**The presentation is real.** Seven slides — a fictional-but-shaped hail claim: storm, evidence,
scope gap, code, the ask ($22,577, arithmetic checked in the patch), close. **On iPad/desktop it
presents** (buttons, dots, counter); **below 700px the slides lie flat as readable pages** with the
controls gone — my call, kept after the attribution correction above. Deliberately NO key handling — the book turns chapters on the
arrow keys, and the harness asserts ArrowRight still turns the BOOK while the deck keeps its place.

**Structure: 578's machinery, pointed at an insert.** XV→XVI, XVI→XVII remapped one-pass (19
sites, carry-over tallied); everything regenerated from the ORDER list; edition line to
twenty-two, three sites.

**Four defects caught by rendering, not by the gate:**

- **`font:700 12px inherit` is invalid** — CSS-wide keywords cannot appear in shorthands; the whole
  declaration drops silently. Caught before it shipped by reading the CSS, not by any parser.
- **The dots rendered as seven bordered pills** — my own `.aid-ctl button` (0,1,1) beat `.aid-dot`
  (0,1,0). The 481 lesson again: read the NEIGHBOURS' selectors, including your own.
- **Stacked slides laid out in a ROW on phones** — the stacked rule said `display:flex` without
  `flex-direction:column`, and only the `.on` slide inherited column from the base rule.
- **The control row overflowed 420px by 9px** — retired by the phone-stacking, which removes the
  row below 700px entirely.

**And one pre-existing harness rot found by the negative control:** the map chapter's assertions
still carried `XV:` labels from before the 578 reorder — meaningless then, colliding once 584 made
XV real. Relabelled to the chapters they actually test (`XVI:` Glasswing, `XVII:` map).

Gates: `check_build.py` green 583 → 584, negative-controlled. Book harness **372** (325 at the
session's start), including deck behaviour at three viewports; **28 fail against the pre-584
book**. `h562_aibook.js` 42/42 with the served count at 22. Web ↔ markdown parity 18/18, chapter
order 17/17. `AI_CHEATSHEET.md` mirrors the deck as a written-out slide list.

---

## Build 591 — promote a job to a Showcase pair (2026-08-03)

Every Vision Suite table was empty while **196 photographs sat on 12 jobs**. Making a pair meant
hand-uploading two files. Now: **From a job** → pick the job → tap the before → tap the after →
check the address. No SQL — `showcase_pairs.project_id` has existed since the original schema,
is nullable with no foreign key, and nothing ever wrote it. Now something does.

**Shared, not forked.** 579's picker takes a `mode` on `jobPick`. The regression proof is that
`harness_walk.js` §13 passes **verbatim** — if it ever needs editing to keep 591 green, the
picker got forked.

### Four traps, three of which would have shipped silently

**1 · `savePair`'s `file()` helper is byte-identical in two functions** (`savePair` and
`saveWork`). A `count == 1` assert aborts; the anchor has to extend to the next statement. The
file's own "scope the assertion to the function, not the file" rule, again.

**2 · `pending` outliving the flow — the one that would have looked like it worked.**
`closeForm()` only removes a class. After a promote, the carried Files are still in `pending`,
and `savePair`'s `file()` *prefers* `pending` — so the next hand-made pair would have **silently
uploaded the previous job's photographs**. Fixed by clearing at the **top of `openForm()`**,
which makes "openForm always starts clean" unconditional and forces `promoteToPair` to call
`openForm()` *before* setting `pending`. Asserted directly; nothing else in the suite catches it.

**3 · `b.dataset.jp` is a String.** With roles storing the index as a *value*,
`roles.before === i` is `0 === '0'` — false, and wrong on the **first tile in the grid**.
`parseInt` at the boundary.

**4 · The mode test must be `=== 'pair'`, not truthiness.** The walk button is wired
`b.onclick = openJobPicker`, so it hands arg 0 a **MouseEvent**. Any `mode ||` check flips the
walk button into pair mode. String equality leaves that call site correct, untouched.

### The address splitter, measured not assumed

`projects.address` is one free-text column and **11 of the 12 photo-bearing jobs have no comma**:

```
3710 west third Dayton Ohio 45417     3800 klepinger rd  dayton ohio46416   ← state+zip glued
948 Huron            ← no city at all      449 Harriet, Dayton, OH 45417    ← the only comma form
```

A comma split scores **1 of 12**. `splitAddr()` peels from the right instead — zip, then state,
then the last token is the city — and **declines** rather than guessing when neither is present:
**10 right, 2 correctly blank, 0 wrong**, table-driven in the harness against the real twelve.
**Never derive the city from the zip here:** half these rows carry Indiana zips (464xx) on
addresses that say Dayton, Ohio.

Whatever it guesses lands in an editable field with the **raw source string shown underneath**.
`splitAddr` keeps the record's own spacing for that line — provenance that tidies what it quotes
is not provenance.

### Two defects the screenshots caught that jsdom could not

- The promoted form still rendered **three empty "Choose File" rows** beside two photographs that
  *were* chosen — and anything attached there would have been silently ignored, since the carried
  files win. Replaced with the thumbnails it actually carried, labelled with their roles. Thumbs
  reuse the picker's already-signed URLs, so no object URL is minted and none leaks.
- Tile role labels rendered lowercase beside an uppercase slot bar. One declaration.

Also folded in: **a latent 579 crash**. `loadProjects`/`loadJobPhotos` wrote to `jobPick` after
their awaits with no null guard, and cancel nulls it deliberately *before* `closeForm()`. 591
makes it likely — the biggest job has 45 photos and signing them is a real round trip to cancel
during. Three `if(!jobPick) return;` guards, asserted with an `unhandledrejection` listener.

Gates: `check_build` green 590→591 (marker `data-act="addjob"`, negative-controlled) ·
`harness_walk` **152** (was 115) · `harness_showcase` 123 · `render_showcase` 69 ·
`audit_viewports` 194, with `'addjob'` added to its write-control list so Showroom's counted zero
stays honest.

---

## Build 592 — every control in the Showcase reaches 44px (2026-08-03)

Measured at 820px before this build: **11 of the 12 controls were under 44px.** The next/back
arrows were **30×30**, the expand 32×32, the slider handle 38 wide. The only one that passed was
590's exit ✕ at 46 — and only because it was built from a mock that specified it.

**The sweep is the deliverable, not the pixels.** `audit_viewports.js` now measures every button
and the slider handle at four viewports across Showcase / Hall of Fame / review / all three
Showroom tabs — 8 measurement points. On its **first run it found three more I had missed**:
`.cr-sh-back` at 36×36 and the dismiss `✕` at **22×20**, the latter being a *destructive* control
(remove a comparison, reject a finding) rendered smaller than anything else on screen.

Two geometry traps, both real:

- **`.cr-sh-hd` carries `margin-left:-19px`, which is exactly `-width/2`.** Widen the handle
  without moving that and the white rule at `::before{left:50%}` stops marking the `--sh-split`
  it is drawn to mark. They move together or not at all. (38→48, −19→−24.)
- **`.cr-sh-play` is a child of `.cr-sh-step`**, so it matches `.cr-sh-step button` *and*
  re-declares its own 30×30 295 lines later. Setting one leaves it at 30.

Also: the grip is now a 44px round knob that scales on grab (`.grabbing`, a transform so it
cannot cost a frame or move the divider), released on **both** pointerup and pointercancel —
a cancel is what a browser sends when it steals a gesture, and a knob left swollen after that
reads as stuck.

**One assertion of mine was over-broad and the patch correctly aborted on it:**
`'width:36px;height:36px' not in css` also matches `.cr-sh-slot img`, which is a *thumbnail*.
Scoped to the `.cr-sh-back` rule instead. Second time this session — the file's own "scope the
assertion, then read what it captured" rule.

Gates: `check_build` green 591→592 (marker `width:48px;margin-left:-24px`, negative-controlled) ·
`audit_viewports` **215** (was 194) · `harness_walk` 152 · `harness_showcase` 123 ·
`render_showcase` 69.

---

## `studio_photos` — the Studio's schema, applied (2026-08-03)

Backend curation library, decoupled from the CRM entirely — no FK into `projects`, admin-only
RLS (`is_cardinal_admin()`, same shape as `crew_rates_rw`/`crew_payments_rw`). Grew out of a
design conversation, not a build request in the usual sense — recorded here because the schema
is now live in production and two other sessions could otherwise re-derive it differently.

**The boundary that mattered: backend-only is not the same as no-address.** First pass tried to
scrub `project_address` out of the design entirely on the theory that "no CRM" meant "no
identifying data." Theo corrected this directly: *"these photos go nowhere but my backend
curation... no addresses get shown to the public."* The actual rule is about what a **client**
can see — that rule already lives in `showcase_pairs` (city-only, address never reaches
`drawCard()`, the release badge hidden in Showroom) and is untouched. `studio_photos` is never in
that path, so it carries `project_address`/`project_name` as **plain copied strings** — not a
live FK, so the table keeps working if the CRM row changes or is deleted, matching
`walks_schema.sql`'s "copy the bytes, do not reference the path" precedent. Without this, the one
workflow the table exists to serve — search an address, find that house's photos — would have
been impossible.

**Two Postgres errors, both real, both resolved by checking `pg_proc` instead of guessing:**
1. A `GENERATED ALWAYS AS` tsvector column combining tags + address + name failed:
   *"generation expression is not immutable."*
2. Rewritten as a plain functional GIN index — same failure, because functional indexes also
   require IMMUTABLE, not just non-volatile.

Checked `pg_proc.provolatile` directly rather than guess a third time: `to_tsvector(regconfig,
text)` genuinely **is** immutable once explicitly cast (`'pg_catalog.english'::regconfig`) — the
one-arg form is stable, the two-arg form isn't. The actual blocker was `array_to_string(anyarray,
text)`, which is STABLE. **Split into two purpose-built mechanisms instead of forcing one:**
`idx_studio_photos_tags` (GIN on the raw array, for exact/contains queries — tags are a
controlled vocabulary) and `idx_studio_photos_addr_search` (GIN on a tsvector of address + name
only, no array involved — free text, human-typed). Verified against a real inserted-then-deleted
row: both queries return the correct count, and the row is confirmed gone afterward.

**The id scheme reuses what's already on disk rather than inventing a second one.**
`fetch_companycam.py`'s `manifest.jsonl` already assigns an id (CompanyCam's own) per photo, with
a `path`. Hermes's tagger is instructed to drive off that file directly and echo the id through
unchanged — phone photos, which have no such file, get `"phone:" + sha256(relpath)[:16]`. The
push script (`spark/push_studio_tags.py`) joins tag rows against `manifest.jsonl` by that id — a
plain dict lookup, no hashing on the push side at all.

**`spark/push_studio_tags.py` folds in a fix `strip_exif.py` in the same folder already earned
the hard way**: `ImageOps.exif_transpose()` before resize, or a phone photo stored sideways with
an EXIF Orientation tag renders sideways in the thumbnail — `Image.open()` + `.resize()` does not
apply that tag on its own.

**What's unverified, stated plainly, same as every other `spark/` script**: no live call has been
made — no path to the Spark's filesystem, Supabase Storage with real credentials, or a real
`studio_tags.jsonl` from this sandbox. The auth flow mirrors `hail_review.py`'s `get_token()`,
which *is* proven against this account. `--limit 5` first, same standing advice as
`fetch_companycam.py`.

**`spark/STUDIO_TAGGING.md`** is the literal handoff doc — record shape, the reused 17-key
`api/detect.js` defect vocabulary, the explicit "no folder tree, tags are the folders" rule, and
the resumability convention every other script in this folder already uses.

No `index.html` change. No UI yet — deliberately: this project has a specific, expensive lesson
about building a UI against a guessed data shape (`walks_schema.sql`'s 13-of-196 inline-photo
population) rather than the real one. The Studio's browsing page waits for a real
`studio_tags.jsonl` to exist.

## `studio.html` + `studio_objects_rls.sql` (2026-08-03, same day)

Built ahead of real `studio_tags.jsonl` after all, while the Spark archive fetch was still
running — worth flagging against the note directly above, because on its face this looks like the
exact mistake it warns about. **The difference: the shape here isn't guessed, it's pinned by code
already read in full** — `push_studio_tags.py`'s own `db_row` dict, verbatim — not inferred from a
sample or assumed. `walks_schema.sql`'s photo objects were populated by upload paths nobody had
re-checked; this schema has one writer, already written, already read end to end.

**A real gap found before any of this shipped, not after:** `storage.objects`' `photos_read`
policy grants SELECT on the *entire* `photos` bucket to any authenticated user, no prefix check —
proven via `pg_policy.polroles`, not assumed from the table list. `studio_photos` itself is
`is_cardinal_admin()`-only for every operation, so the table was already correctly locked down,
but a signed-in rep who somehow knew a `studio/<id>.jpg` path could have fetched it directly
through Storage regardless — table-level privacy true, storage-level privacy false. Closed with
`studio_objects_rls.sql`: narrowed `photos_read` to exclude `studio/%`, added a dedicated
`is_cardinal_admin()`-only read policy for that prefix. Same shape `walk_objects_read` /
`workmanship_objects_read` already use for their own prefixes, just admin-only instead of
authenticated-only, matching `studio_photos`' own stricter rule. Left `photos_upload`/`photos_write`
alone — bucket-wide for any authenticated user across every prefix, a pre-existing condition this
page doesn't touch or depend on, and a bigger change than today's scope.

**Standalone, not a build.** No app-stamp bump, no `CHANGELOG` entry, no build number — `studio.html`
is not part of `index.html`'s gate ladder because it isn't part of `index.html`. Same repo, zero
shared script, zero shared nav, admin-only sign-in of its own (a different subdomain is a different
origin — the app.cardinalroster.com session does not carry over). Read-only: browse, search, look.
Retagging happens on the Spark, never in a browser.

**Verification, and its real limit.** A jsdom harness against the shipped script text (21
assertions) exercises the actual query-building/rendering code against realistic rows — including
the two documented edge cases from `STUDIO_TAGGING.md` itself (`tags:[]` as a real answer, not an
omission; a phone-sourced row with no manifest match, so `project_address` is `null`) — by mocking
`window.supabase`'s client shape rather than a live connection. A second pass in real Chromium
(same mock, via `page.addInitScript`) proves actual layout/paint, which jsdom cannot: grid,
chips, empty states, the detail overlay. **What neither can prove: a real sign-in.** No admin
credential exists in this sandbox, on purpose, and this sandbox's own egress policy separately
blocks `cdn.jsdelivr.net` (confirmed via the agent-proxy status endpoint, not assumed — a policy
403, not a code defect; the exact same CDN URL is already load-bearing in production `index.html`).
Theo signing in for real is the one step only he can do.

**Subdomain: no code change needed for the simple path.** `studio.html` at the repo root is
already reachable at `/studio.html` on any domain pointed at this Vercel project or a second one
importing the same repo, with zero rewrite config — same as `bulk_assign.html` already works
today. A bare-root URL (`studio.cardinalroster.com/` instead of `.../studio.html`) is possible
with a host-conditional rewrite in the shared `vercel.json`, but that file is shared with the main
app's deployment — untested from here, and not worth the risk for a tool only Theo uses. Left for
later if he wants it.

## Build 593 — the Vision hub, in the same index.html after all

Theo walked through both options via a live tap-through preview (a toggle switching "built into
index.html" vs. "separate file", same visuals either way, only the annotations changing) and chose
same-file for the practical reason: reusing Showroom's existing code beats standing up a second
surface for a presentation layer that doesn't need to be redesigned often. See `FEATURES.md` for
the full shape.

**One real bug, caught before shipping, not after.** First patch rendered `.cr-vh` into
`#landingView` correctly per every jsdom structural check, but a real-Chromium screenshot showed
a blank page — plain cream gradient, no tiles, nothing resembling the shipped CSS. `elementFromPoint`
at the tile coordinates (the exact technique build 590's z-index bug used) showed `.cr-vh` computed
`display:none` despite `display:flex` in its own rule. Cause: `cr-lr-styles` carries
`#landingView>*{display:none}` (ID selector) specifically to keep the dead `#landQuick`/`#landDash`
markup hidden, plus a second `#landingView:not([data-cr-portal-built])>*{display:none}` — and a bare
class selector can never beat an ID selector regardless of source order. `.cr-lr` only escapes both
via `#landingView>.cr-lr{display:block}` *and* `build()` setting `lv.dataset.crPortalBuilt='1'` on
every path. First draft grepped `crPortalBuilt`'s JS readers, found them dead (`refreshCounts()` /
`buildLanding()`, both unreachable — the file's own comment already says so), and concluded the
attribute was safe to skip. Missed the CSS attribute-selector reader entirely, which is very much
alive. Fixed with the matching `#landingView>.cr-vh{display:flex}` override and setting the same
dataset flag — mirroring `.cr-lr`'s exact pattern rather than inventing a new one.

**The lesson, stated plainly because it is this project's own recurring one:** grepping a name's
*JS* usage is not the same as grepping all of its usage. The same attribute had a second, silent
reader in a completely different language, in a completely different part of the file, and only a
real rendering engine — not a structural DOM check — could have caught the gap.

Verified: `check_build.py` green (105 scripts, 108/108 tags, 115/115 styles, app stamp 592→593,
marker + negative control). A 20-assertion jsdom harness against the shipped `cr-lr-script` text —
hostname matching including a deliberate near-miss (`my-showroom.` must not match), the `?vision=1`
override, admin-gating of the Studio tile, and proof the Presentations tile drives
`CardinalShowcase.open({showroom:true})` through `wire()`'s *existing* handler rather than a new
one. Real Chromium screenshots of both the admin and non-admin renders, plus a regression pass
proving the ordinary ten-destination launcher is completely unaffected (`app.cardinalroster.com`
still renders `.cr-lr`, never `.cr-vh`).

## `drivewaytest.html` — the Driveway Test, shipped (2026-08-03)

Theo picked **Option 5 (the pop-up book) and the Driveway Test** off the five-way preview.
The Driveway Test went first on purpose, and the reason is the whole argument for it: the
pop-up book bets **35–60 hours of illustration** on a drawing style nobody had seen. This page
bets six hours on twelve small plates in the same pen. Cheap answer first — and if the pen
lands, these plates get reused inside the book rather than thrown away.

**It is a sibling page, not a build.** No app-stamp bump, no `CHANGELOG` entry, no gate ladder —
`drivewaytest.html` is not part of `index.html`. No login, no Supabase, no SQL, no RLS, no token,
no API, no client data, no static asset. **That is why it could be built without waiting on the
delivery decision** — the app boots to a signed-in session and "text them a link" still does not
exist, but this page needs none of that.

**Six right-versus-wrong pairs**, one wiper each: cut 3-tab used as starter · cut 3-tab used as
hip and ridge · two exhaust types short-circuiting a balanced system · a missing kickout ·
one-strip-and-caulk instead of woven step flashing · drip edge stopping short of the peak. The
two starred shortcuts are here because **no other direction could structurally hold them** — a
hero cutaway cannot show the wrong version beside the right one, and the comparison *is* the
content.

Copy is lifted from `ROOF_JOURNEY_COPY.md` rather than rewritten, so the verification discipline
carries: no code section numbers, no code-mandated dimensions, no warranty terms.

**The bug the mechanical checks could not see, and it is the recurring class on this project.**
Every plate carried a caption centred at `x=150`. Both plates stack, and the wipe clips only the
top one — so at any divider position you read **the left half of one caption beside the right half
of the other**: `NOTCHES, ~~NOTCHESLT~~`, `THIN — ~~REAADSHADOWED~~`. Twelve plates drew, twelve
carried their accent stroke, all six wipers dragged, keyboard worked, zero JS errors, zero
horizontal overflow — **every assertion green on a page whose labels were illegible.** Caught by
looking at the render, not by a check. Fixed by anchoring each caption to its own side of the
split (`x=12` start / `x=288` end) and shortening each to fit half the plate.

**The pen convention**, matching the app's existing `.fig-ink` figures so the plates transfer to
the book: 1.75px structure, 1px dashed hairline for hidden geometry, round caps and joins,
`fill:none`, no gradients, no filters, inverted to white-on-near-black. **One accent stroke per
plate**, on the thing the copy tells you to look at — red when it is the fault, green when it is
the fix.

⚠️ **Contrast, computed not eyeballed:** `#c8202e` is **3.44:1 on `#0B0D0C` and fails as body
text.** Red ink on this page is `#e35c63`; the brand red is strokes and chrome only. A test
asserts zero body text renders in the failing red.

Verified in real Chromium at phone and desktop: 12 plates drawn and non-empty, all six wipers
track, arrow keys move the divider, `aria-valuenow` updates, no horizontal overflow.

**Not linked from anywhere yet** — that is an `index.html` change (the Vision hub is the obvious
front door) and it is Theo's call whether this is public-facing marketing or something a rep
hands over. Reachable directly at `/drivewaytest.html` on any domain serving this repo.

## `popup.html` — the Pop-Up Roof, spread 7 alone (2026-08-03)

**One spread of sixteen, deliberately.** The full book is 12–14 builds and 35–60 hours of
illustration; its own spec says build this spread first and look at it before anyone draws the
other fifteen, because the direction lives or dies on whether the register is right — dry and
self-aware, or cutesy. Spread 7 is the correct test: it carries the debris warning, the biggest
pop, and the joke that is also the argument.

**The debris is the whole bet.** Tap the roof, forty kraft chips fling off and land on the page,
**and they stay there.** In the full book the magnet on spread 15 sweeps up these exact chips
nine spreads later — cleanup stops being a paragraph the client skims and becomes a chore they
have to do. Theo named cleanup himself as the most important part of the job.

**Two geometry bugs, both found by looking rather than by asserting.**

1. **The pop rotated flat INTO the screen instead of standing up off it.** `rotateX(-78deg)` on
   a board whose page is the screen plane collapses it to a sliver under a face-on camera — the
   house was nearly invisible. The fix is that a pop-up only reads as rising if the page itself
   is a *receding surface*: the floor is now tilted `rotateX(58deg)`, and the pop travels
   `58deg → -20deg` (i.e. 78° off its own page). Lying flat and standing up are now both correct,
   and the maths is written into the CSS comment so the next person doesn't rediscover it.
2. **The chips fell past the page onto the background**, which kills the one gag the spread is
   built on. The floor is 118px tall rotated 58°, so it occupies only ~62px of *visual* height
   (`118 × cos 58°`) — landing chips at `height − 26` dropped them off the page entirely. They
   now land inside the foreshortened band.

Every mechanical assertion was green through both bugs: the pop transformed, the shadow
responded, forty chips existed and were visible, the roof stripped to bare deck, zero JS errors,
zero overflow. **Same class as the Driveway Test's overlapping captions earlier the same day** —
green checks on a picture that was wrong.

**The mechanism**, all five parts reading one `--open` property so they cannot desync: a fold
line visible whether the pop is up or down (that crease is the tell that this is paper); the
hinge at 78° not 90° because a piece at a true right angle reads as a wall; a strut hinged
behind, drawn in the shade tone because you are seeing its back; and the shadow as a **flat
sibling with `scaleY` foreshortening, never `filter: drop-shadow`** — drop-shadow on a 3D element
silently flattens `preserve-3d` on iOS Safari. The pop and strut are siblings in screen space
rather than nested under `preserve-3d`, which sidesteps that fragility entirely.

⚠️ **Contrast, computed:** cardinal red `#C8202E` is **4.19:1 on kraft and fails body text** —
text uses the deepened twin `#8F1620` (6.73:1), which already ships in this app. White on
`#E8722A` is 3.06:1 and fails, so the caution label is black-on-orange, which is also what real
hazard signage looks like. A test asserts no body text renders in the failing red.

**Reduced motion is a second presentation, not a switch**: the board lies flat, the debris is
already on the page, the flat-pack note appears, and every word survives. Verified as its own
run with `reducedMotion: 'reduce'`, not assumed.

**Still unverified from here:** iOS Safari. The spec flags `preserve-3d` as the direction's
biggest engineering risk and this sandbox has only Chromium. The sibling-not-nested structure was
chosen specifically to reduce that exposure, but **it must be opened on a real iPad before the
other fifteen spreads are drawn.**

---

## The pyramid becomes a hip roof, and the residue it left (2026-08-03)

Theo: *"the drip edge doesn't make sense if the house is shaped as a pyramid unless you make the
house shape different… would be nice if we could show a ridge vent as well as soffit intake.
Ventilation being important. Showing airflow. Would it be too difficult to change the shape of
the house?"*

Not difficult, and it unblocked three things at once: a pyramid has no ridge, so a ridge vent had
nowhere to live, the drip-edge story was thin, and spread 13 was promising a ridge that did not
exist. **Eave y=100 from x=34 to 266, ridge y=28 from x=104 to 196.** The two sloping edges are
still hips and still take cap shingles.

**The reshape itself was one edit in two functions — and that is exactly what made the follow-up
dangerous.** Everything that asks `roofY()` / `spanAt()` moved with the shape for free. Everything
carrying a number *derived* from the old shape stayed behind, silently, still parsing and still
rendering. Four of those, all found by rendering rather than by asserting:

1. **Every material on the roof split its lit face from its shaded one at x=150** — the pyramid's
   apex, a real facet edge where a shading break belonged. The hip roof has no facet edge there,
   so it became a seam down the middle of a continuous plane, 26 units away from the 176 the wall,
   gutter and soffit use. `SPLIT` is module scope in both files now; shingle courses, tabs, starter,
   laminate shadow, ice course, drip-edge apron, ridge vent and ridge cap all read it.
2. **The laminate shadow's inset was `SH / (72/116)`** — the pyramid's rake slope. The hip is
   `72/70`. Correct arithmetic for a roof that no longer exists, leaving ~1.5 units of gap along
   both hips on all eight courses.
3. **The felt was still a triangle running to a point at (150,28).** On this roof that line falls
   about 20 units inside the hip, so spread 10 showed a wedge of bare deck down both edges — a
   missed patch of underlayment, the opposite of what the spread says. It is a trapezoid to the
   ridge now.
4. **The ridge vent was wider and taller than the cap laid over it** — 100→200 against a ridge of
   104→196, top edge at y=22 against a cap top at 24.9. It overhung the caps at both ends and stood
   proud of them: a metal plate lying *on* the ridge, the one thing you never see on a finished
   roof. Now 104→196 and 23.5 down, so 1.4 units show above the cap. **That sliver is the raised
   line you are actually meant to see.**

Also removed: the `o.ridge` chevron, which was pyramid geometry *and* a duplicate — all four
callers pass `roof:'new'`, and that branch already draws `ridgeVent()`. And the downspout, which
ran 266→272 against a wall ending at 260 and stood six units clear of the house on all sixteen
spreads, reading as a post in the yard.

**How it was proved, and how the first two attempts failed.** Asking `elementFromPoint` whether
the fills either side of x differed was worthless twice over: shingle tabs rotate four tones so
adjacent fills differ nearly everywhere, and `elementFromPoint` is viewport-bound, so the eight
spreads below the fold reported clean without being looked at. A check that cannot fail on half
its input is not a check. Measuring a luminance step over a ±10-unit window was better but flagged
spreads 2, 10 and 11 as *inverted* — chalk circles at 176–214, a felt roll centred at 196, a
chimney at 186–206. **The chimney false positive, again**: measuring the roof and catching what is
standing on it. What worked: a narrow ±4-unit window, negative-controlled against the previous
build, so objects contaminate both and cancel.

Result — shade break present at 176 on **16/16**; the stale 150 break gone on 13/16 and the three
residuals are a figure at x=158, a replacement deck sheet starting at 154 and deck texture, all
**identical before and after** where the patch did not apply; bare deck bleeding through the felt
**before [10], after [none]**. Ridge cap is 4 rotated runs (left hip 12 pieces, right hip 12,
ridge-lit 9, ridge-shaded 3). `pw_deck` clean at phone, iPad and reduced motion.

⚠️ **Two deliberate simplifications, flagged rather than hidden.** The soffit is drawn as a band
*below* the gutter; straight-on it would be hidden behind it, and then the intake vents Theo asked
for could not be seen. And spread 13's airflow arrows travel *over* the shingles rather than under
the deck, because there is no cutaway. Both are diagram convention, both are Theo's to overrule.

---

## The front dormer and the layer stack (2026-08-03)

Theo: *"If you put a gable in the front then make it a dormer? Looks weird. Maybe do like a cutout
after the roof is done also."* Then, from nine rendered options: *"Options 2 for dormer and 4 for
layer stack. Put dormer closer to the middle of the house tho."*

**A note on the pick, recorded so nobody re-reads it later and 'corrects' it.** The layer stack was
option **A**; option 4 was the ice-shield-with-dormer view. He named the layer stack in words, so
that is what was built. He did **not** take option B, the attic section — so spread 13's airflow
arrows still travel over the shingles rather than inside the attic. That remains a known, stated
simplification, not an oversight.

**`DX = 140`** — option 2 was 124, which read as deliberately shoved to one side. Dead centre (150)
sits under the ridge vent and dead over the door and reads like a symmetry no real house has. Ten
units left of centre is the compromise; a 140/150 comparison went to Theo so a nudge costs one word.

**The dormer is not decoration, and that is why it was worth the build.** Two captions in this book
were writing cheques the drawing could not cash:

- Spread 9 has always said *"a rubber membrane at every eave and **valley**"* over a plain hip roof
  with **no valley on it**. The dormer cheeks are that valley, and the shield now climbs them.
- Spread 11 is *"The Flashing"* and had a chimney and a pipe boot. **Step flashing up a dormer cheek
  is the detail every roofer argues about** and it was absent.

**Draw order is the containment.** The dormer is emitted after the roof materials, so courses,
sheets, shield and felt all run *behind* it — which is where they physically are. No clip path, no
`overDormer()` test, nothing to keep in sync when the geometry moves again.

**Five collisions, found by rectangle intersection on the rendered DOM.** This is the check that was
wrong twice on the yard sign — first taking the wrong figure out of the list, then comparing only
x. This time both axes, on `getBBox()` read from the render, mapped through each group's own
transform, against a dormer box **identified from the render** rather than trusting `DX`:

| Spread | What collided | Moved to |
|---|---|---|
| 3 The Adjuster | figure at x=158, standing on the right cheek | x=96 |
| 6 The Delivery | flying bundles at x=109 and 124 landing **on the gable** | run is 48+i*14, ending at 104 |
| 8 The Deck | figure at x=150 — head and shoulders across the window | x=212, beside the sheet he is fitting |
| 10 The Felt | figure clipping the left edge | x=96 |
| 11 The Flashing | figure at x=150, **and** the pipe boot at 106–126 sitting on the flashing strip | figure x=64, boot moved 14 left |
| 12 The Shingles | both roofers standing in the middle of the new cutaway | x=176 and x=216 |

**The layer stack sits on spread 12 rather than becoming spread 13.** Theo said *"after the roof is
done"* and spread 12's own caption is *"one lap over the next"*, which is exactly what a section
shows. It **wants its own spread** — that is the 16-becomes-18 question, still his, still open — and
the built spread ships titled *"of 16"*, so nothing is renumbered unilaterally.

Verified: dormer present on **16/16**, **zero** collisions, shade break still at 176 on 16/16, bare
deck through the felt still **none**, `pw_deck` clean at phone / iPad / reduced-motion, both files
parse, zero page errors.

---

## The dormer, bigger — and the valley membrane it was added for (2026-08-03)

Theo: *"With there being a dormer that adds 2 valleys. Any way to make the dormer bigger and show
the ice and water at the dormer valley? Dead center wasn't what I meant. As a pop up the dormer
should be a little over to the left equal distance from both left and right hip."*

**The two halves of that sentence only look contradictory, and resolving it settles the placement
for good.** `spanAt` is symmetric about 150 at every height, so **equidistant from both hips is
x=150 and nowhere else**. It *reads* as "a little over to the left" because the house's light turns
at 176 — the lit face is 142 wide against 90 in shade, so the eye puts the centre of the house
right of where it actually is. He described one point twice. What he was rejecting was my word
"dead centre", not the position. **`DX = 150`, and this is settled — do not move it back to 140.**

**Size: 50 × 44, up from 36 × 35** — half again the area. Peak at y=40 leaves 12 units between it
and the ridge vent. Base at y=84 lands on the eave ice course at 86, deliberately: the valley
membrane and the eave membrane then read as **one continuous sheet, which is what they are**.

**The valley membrane is drawn BEFORE the dormer, and that is the whole fix.** The old version was
two 9-unit strips beside the cheeks emitted *after* the face — a detail stuck on beside the dormer
rather than a sheet the dormer sits on. It now wraps each valley, up the cheek and along under the
rake, is emitted first so the face and rake board land on top of it, and runs down to meet the eave
course. That is the real order: the membrane is roofed over, not painted beside.

**One defect, caught by rendering:** the band's outer corner was set at `peak - 4`, four units
**above** the dormer's own peak, so it stuck out past the rake as a grey horn. It dies at `peak - 1`
now, under the rake board (drawn at `peak-2` with a 2.4 stroke, so covering 36.8–39.2).

**Two more collisions from the bigger box**, found by the same rendered-DOM rectangle intersection:
spread 12's left roofer (moved 176 → 194) and **spread 14's Theo, who was standing on the dormer's
right rake** (180 → 206, up-slope and clear).

⚠️ **A stale-check warning for next time.** `pw_split2` reported the 150 shade break going from
13/16 to **0/16** and it is NOT a regression — the dormer is centred at 150, so its own gable facet
legitimately splits there and the probe band sat inside the dormer's height. Re-probed outside the
dormer (y<38 and y>88): **at176 positive on 16/16**, at150 non-positive on 14/16, and the two
positives are spreads 7 and 8, the bare-deck spreads, where the sprayed-sheet edges sit near 150.
The check was measuring the dormer, not the roof.

Verified: dormer on 16/16, **zero** collisions, shade break at 176 on 16/16, no bare deck through
the felt, `pw_deck` clean at phone / iPad / reduced-motion, `pw_shingle` unchanged
(`planeIsTrapezoid`, `ridgeVent`, `strippedByColour` all true; `offRoof` 2 is the starter strip's
two eave-line vertices, boundary-exclusive, not a defect), zero page errors.

---

## `DX = 134` — the placement, corrected, and a check with a blind spot (2026-08-03)

Theo: *"Dormer should be over to the left and similar to the house with the profile view."*

**My error, and it is worth recording because it was a reasoning failure rather than a slip.** He
had said "a little over to the left" twice. I read the accompanying phrase *"equal distance from
both left and right hip"* as a geometric spec — and it genuinely does pick x=150, because `spanAt`
is symmetric about 150 at every height — then built the clever reading over the plain one and
argued for it. **Prefer the plain reading when a plain and a clever one conflict**, especially when
the plain one has already been stated twice.

The sequence on this single number: **124** ("closer to the middle") → **140** → **150** (mine,
wrong) → **134**. If it moves again, move the constant and nothing else.

**"Similar to the house with the profile view" is read as pitch**, and matching it is right on the
merits: the gable now rises 26 over a run of 25 — **46.1° against the main roof's 45.8°**. A dormer
visibly shallower than the roof it sits on reads as a bolted-on box. The eave dropped 60 → 64 to
buy that rise without crowding the ridge vent; peak 38 still leaves 10 units of roof above it.

### The collision check had a blind spot, and it cost a real defect

The check inspected **only `g[transform*="translate"]` groups** — figures, ladders, trucks, signs.
Spread 11's **chimney and pipe boot are bare `<path>` elements**, so it never looked at them, and
the boot ended up sitting in the middle of the dormer's valley membrane: **a plumbing vent through
the ice-and-water**, which is a leak, not a detail. It reported "no collisions" throughout.

*A check that only inspects one kind of element is a check with a blind spot.* It now tests bare
paths too, filtered to prop fills (metals and masonry) so the roof, walls and covering materials
are not swept in. The boot moved to 216–236, past the chimney flashing at 214 and inside the roof
(`spanAt(80)` gives 246.6 that side).

Also re-bounded: spread 6's flying-bundle run, shortened a **second** time (`50+i*10`) — and it
cannot start below x=50 either, because `roofY(42)` is 91.8 and the bundle would sit under the
eave. Bounded at both ends now. Spread 12's layer stack narrowed to `X1=104`, since the dormer's
left edge is 109.

Verified: dormer on 16/16, zero collisions **with the widened check**, shade break at 176 on 16/16,
no bare deck through the felt, `pw_deck` clean at phone / iPad / reduced-motion, both files parse,
zero page errors.

---

## Four directives in one burst — and the shape question reopened (2026-08-03)

Theo, in order: *"lets just re do the house shape to make everything line up right, give me 5
different examples. A dormer isnt really needed depending on the roof type"* · *"during the first
few pics of tear off the roof should look weathered and worn, maybe a few shingles missing"* ·
*"since there is a chimney lets keep the chimney in the progression"* · *"maybe the cardinal bird
can move throughout the screen during the taps too"* · *"what happened to the attic picture as
well, and the take off, the gnome"*.

**Everything built this pass is shape-independent on purpose** — anchored on `roofY`/`spanAt` or
screen-space — so it survives whichever shape he picks.

**The five shapes** are at `popup_house_shapes.html` (generator beside it): 0 current reference,
1 side gable ("the rectangle — everything literally lines up"), 2 L front-gable **(recommended)**,
3 T centred-ish, 4 hip + gable wing, 5 side gable + shed porch. He is right about the dormer:
2/3/4 make it unnecessary because the valley comes with the roof. 1 and 5 have no valley — spread
9's caption would go eave-only, stated on the card rather than hidden.

**Weathered old roof:** five missing tabs on the course grid, dodging dormer/chimney/hips. First
fill was `#0B0D10` on a `#1E2227` field — **1.2:1, a gap nobody can see, the sprayed-sheet lesson
again the same day**. The reveal is weathered felt `#4A443A` now, with the course above shadowing
into the hole. The gaps live inside `#shingles`, so the tap-strip takes them with the old roof.

**The chimney is permanent** — moved into `house()` (and `houseSVG`), every state except `none`,
with its base shadow so it sits on the slope; spread 11's own copy removed (two drawings of one
chimney is the two-books failure). **This exposed a buried defect:** the dormer had been fully
covering the sprayed sheet at (114,64) on the stripped deck — a mark nobody could see on the
spread whose whole point is marking what is bad — and the chimney clipped the (194,82) X. All
three bad sheets now sit on the bottom row; spread 8 re-laid left-to-right as hole → new sheet →
two sprayed. The collision check missed it because bare paths were only added for props after the
pipe-boot episode; sprayed sheets are drawn by `house()` itself and were never candidates.

**The bird is a SLIDER.** A slider is a real pop-up mechanism — a tab riding a slot — so the bird
can hop the yard during the taps and still be honest paper. Transform-only on the same node
(`birdSame` still asserted), keyed off `beat` so stepping back walks it back, **ends the last beat
home** — the old joke survives by inversion: *"The cardinal is back where it started. As far as it
is concerned, nothing happened."* Reduced motion: instant positions. Verified in Chromium: 7
distinct positions, ends home, same node, zero errors.

**The Takeoff and The Attic** are drawn as PROPOSED · UNNUMBERED cards on the contact sheet.
Both are in Theo's brief (point 14, starred) and the copy doc (Stages 1–2); the 16-spread cut
dropped them silently. They belong between The Climb and The Adjuster, which makes the book 18 —
**the numbering stays his call**; nothing renumbered.

**The gnome: no record.** Not in the brief, the copy, the directions doc, the repo, or the
published five-directions artifact (fetched and searched). Asked Theo what it was.

Verified: 18/18 cards render (16 + 2 proposed), zero collisions, `pw_deck` clean at all three
sizes, bird slider green, shapes page 6 cards zero errors.

---

## THE T — the house shape, rebuilt, both files (2026-08-03)

Theo: *"The T but make the chimney look like a chimney with brick lines."*

**The third house this book has had in one day** — pyramid → hip → T — and the cheapest of the
three reshapes, because by now everything asks `roofY`/`spanAt` instead of carrying constants.
The main roof is a **side-gable band**: eave y=100 from x=30 to 270, **ridge y=44 across the full
width** — `roofY` is a constant, and everything that asks it lines up by construction, which is
the literal thing he asked for two messages ago. The **front cross-gable WING** (cx=140, half=38,
peak=56) replaces the dormer outright; its rakes against the main plane are the two valleys, the
ice membranes climb them, the step flashing hangs on them, and the door lives under it.

**Renamed, not aliased:** `hipCaps` → `ridgeAndRakes` (white rake boards up both gable ends, the
vent proud across the ridge, cap run over it). `ridgeVent()` is a no-op absorbed into it.
`dormer()` → `wing()`; `dormerBox`/`DRM`/`DX` retired. A name is not a contract, and a function
named for a part that no longer exists is how the next session re-learns the pyramid.

**The chimney is BRICK now** — two tones, mortar coursing with staggered head joints the way
brick is actually laid, a concrete crown, a flue, base shadow, and the same step + counter
flashing. Same footprint (182–214), which is why the T's wing was nudged left of centre in the
shapes card: they were never going to collide.

**Re-laid by hand** (everything else moved free): chalk circles and nine figures — **the T has a
figure rule: feet in the lower half of the band (y≥86), because a mid-band figure's head rises
past the ridge into the sky and reads as floating** — the spread-6 bundles (the −46° tilt was the
hip's pitch; a carried bundle tips −12°), the felt roll, spread 8's hole → new sheet → sprayed
sequence (grid origin 30), spread 13's airflow up both free zones, the takeoff tape, and the attic
section (now the opened right end of the house, deck underside + rafter ends + the beam).

**The collision detector needed three corrections, all instructive:**
1. Its wing test rejected any wall-tone path touching y>99 — but the wing's base IS the eave at
   100, so it reported the wing absent on 18/18. A detector that cannot see the thing it guards.
2. The wing's own step flashing (bare paths in prop metals) got flagged as colliders — marked
   `data-wing` in the artwork and excluded.
3. Ground figures and the tailgate estimate legitimately stand IN FRONT of the wing now that it
   reaches the eave — groups anchored at ty≥100 are foreground by definition and exempt; bare-path
   overlaps only count above y=92.

Verified: both files parse · wing on 18/18, zero collisions · shade split at 176 everywhere (the
band, the caps, the materials all read SPLIT) · bird slider 7 hops ends home, same node · chimney
survives the strip, gaps go with the old roof, 3 X marks visible · `pw_deck` clean at phone /
iPad / reduced-motion · full sheet + built spread rendered and eyeballed.

---

## The tractor, and the flowers it protects (2026-08-03)

Theo: *"What about tractor protect the flowers?"*

The self-propelled debris catcher — tracks, scissor lift, bin raised to the eave — parked over
the beds so the tear-off drops into steel instead of into the flowers. Which exposed that **the
flower beds did not exist**: popup.html's tarps beat has said *"Your flower beds have been
through enough"* since the spread was built, with nothing drawn under the tarps. Beds are in both
files now — deterministic tufts and blooms, under the exact zones the tarps cover, so the beat
finally means something.

**The bin is drawn FULL**, and that is a deliberate reconciliation with the book's central joke:
most of the roof goes into the bin (the machine's whole argument), and the forty chips that got
away are why the magnet still runs twice on spread 15. The tractor arrives inside `trailerG`, on
the trailer's own beat — same convoy, no new beat.

Two placement rounds on the sheet card, both caught by rendering: the first put the tractor left
and buried a sprayed X under the bin; the second had the bin top at 92 with the roofer's feet at
90 — **standing in the bin**. The built spread's relationship is the right one: bin top AT the
eave (98/100), roofer on the deck behind it, sweeping in.

Verified: both files parse · 18/18 clear on the collision check · bird/chimney/gaps harness green
· `pw_deck` clean · popup rendered mid-beats (trailer + tractor + tarps on) and the sheet card
rendered and eyeballed.

---

## The retail order — the running-order answer, built (2026-08-03)

Theo, in full: *"This is not for insurance, it is to show someone the install process. The storm
damage should be gone as well as the adjuster. The contract sign inside the house so new scene at
a kitchen table, then an attic inspection where you pull the ladder down hit the switch for the
lights look at the decking then hit the flashlight and look for soffit intake and see the baffles
covered these should be at the very beginning. The takeoff is checking roof components, number of
pipeboots, satellite dish, staying or going. The lawn ornaments, hidden sprinkler heads by Curtis
and his clipboard. That's next. Drone photos before during and after."*

**This closes three open questions at once:**
- **The running order** — three insurance scenes out (The Climb's chalk circles, The Adjuster,
  the tailgate Number), three retail scenes in (The Kitchen Table, The Attic, The Takeoff). Same
  slots. **The book stays sixteen — the 16-vs-18 question dissolves**, and spread 7 keeps its
  "of 16" title untouched.
- **The gnome** — a lawn ornament, inventoried on the Takeoff with its own ring, noted for
  witness protection. Drawn: red hat, white beard, blue tunic, standing in bed B.
- **The Takeoff's meaning** — not a tape measure. A component inventory: two pipe boots ringed,
  the satellite dish ringed (staying or going), sprinkler heads flagged in the lawn, the gnome —
  all by **Curtis in the lime vest with his clipboard**, matching his portrait card.

**Two interiors, a first for the book:** the Kitchen Table (contract with red signature line, pen
ON the line under the homeowner's reach — first pass had it floating in mid-air held by nobody —
mugs, window with the cardinal on the sill) and the Attic exactly as dictated: pull-down ladder
with light from the hallway, bulb ON with pull chain, deck underside and rafters, and the beam
landing on **baffles buried under insulation** with a red finding-ring — the discovery made
before anyone quoted a shingle. The cardinal got in through the one soffit bay that still
breathes, which is the spread's point wearing feathers.

**Spread 1 de-stormed** (hail dents deleted, caption rewritten). **The drone** appears before
(Takeoff), during (Shingles) and after (Walk) — same aircraft each time. The PROPOSED P1/P2
cards are retired, superseded by the real spreads 3–4.

Harness notes: the wing detector now knows spreads 2–3 are interiors (no wing by design —
reporting it absent there was noise); `birdInAll` caught the attic missing its cardinal before
any human did.

Verified: 16 cards, bird in all, zero collisions, zero page errors, opening four rendered and
eyeballed.

---

## The Pop-Up Roof — full screen, jokes only (3 Aug 2026, same evening)

✅ **iOS SAFARI PASSES.** Theo opened the spread on his iPad: *"on the ipad it looks just like
the preview."* `preserve-3d` survives, the pop stands, and the direction's largest engineering
risk is closed. **The remaining fifteen spreads are buildable.** The sibling-not-nested structure
recorded above is what carried it; keep that shape on every future spread.

**The page was then rebuilt around Theo's own direction**, given in four notes over one evening:
*"the interactive part is only half the screen"* → *"maybe can be a full screen … the right side
words separate"* → *"as we go in the picture just have the words come and go as you click
through"* → *"alot less words since ill be there describing it anyway. Just use the jokes. maybe
add some more that pop up on the actual cardboard near the bottom."*

So the picture **is** the screen, the words are **paced by taps**, and what survives on screen is
**humour only** — every informational line was cut because Theo says those out loud. Copy went
**~233 words → ~110 → jokes only**. Each joke still carries its fact underneath; that is the
trick, not a compromise.

**Three joke tabs stand up on the page itself**, on their own sticks in the foreground grass,
each popping on its own beat. The yard-sign line is Theo's own joke from the brief, nearly
verbatim. **The spread is now titled by its PHASE — "The Tear-Off"** — which becomes the spine of
all sixteen: the prep, the take-off, the tear-off, the build.

**THE PICTURE ONLY EVER MOVES FORWARD.** Layers key off a high-water mark, never the current
beat, so stepping back re-reads a joke but never un-strips the roof or un-flings the debris.
That is the book's own rule and it means there is no reverse state to get wrong.

### Five defects, every one green on every assertion, all caught by looking

1. **`.pop` was `height:var(--popH)`** — fine as px, but once the scene sized itself to the
   artwork that became **59% of a box already 59% of the scene**. The board came out 35% tall,
   the drawing scaled down to fit it, and the house sat small in a huge sky. `.strut` had already
   been fixed for exactly this; `.pop` was missed. **Percentages resolve against the parent.**
2. **The scene filled the viewport instead of the artwork**, so the board was taller than the
   300×190 drawing on it. Sized by ratio now: drawing 0.583W + floor 0.30W + sky 0.11W.
3. **The house floated mid-board** — default `xMidYMid` centred it with sky under its feet.
   `preserveAspectRatio="xMidYMax"` seats it on the fold.
4. **The joke tabs were planted on the kraft, off the page.** The floor is laid out at `--floorH`
   but `rotateX(58deg)` means it only *covers* cos(58) ≈ 53% of that — the visible grass ends
   well above the layout box. Same arithmetic left a dead band above the caption.
5. **The runhead sat on top of the progress dots** — three things competing for one 390px strip.
   The spread name moved into the top bar, which now holds the phase title and nothing else.

**One red was the test's fault, not the app's**: the caution-styling assertion ran *after* the
walk finished at beat 7, by which point caution is correctly off. Captured in the loop instead.
Roughly half the reds on this project are still the test.

Verified in real Chromium at phone, iPad and reduced-motion: 8 beats · 3 joke tabs revealing on
their own beats · 40 chips flung and persisting through a step back · shingles gone by id and by
colour · caution styling on beat 4 only · zero overflow · zero body text in the failing red ·
zero JS errors.

---

## Tarps, not a tractor — the typo corrected (2026-08-03)

Theo: *"I didn't mean tractor I meant tarps. Looks good."*

So "What about tractor protect the flowers?" was phone-typed for **tarps**, and the machine two
entries up was built off a typo. It is gone from both files — function, banner, both call sites —
and the sheet's tear-off card now shows what he actually asked for: **blue poly tarps over both
flower beds**, the same shape language as popup.html's `tarpG` beat, which had the tarps (and the
caption) all along and needed nothing added. The sheet's trailer moved to the left edge — where
the built spread parks it — so tarp A reads past its tail; the chips scatter on the lawn *below*
the beds, which is the tarps doing their job.

Everything the tractor round produced besides the machine survives on its own merits: the flower
beds exist now in both files, and the bed/tarp zones line up. The "bin drawn FULL" reconciliation
with the magnet joke is moot — the trailer is back to being the debris destination, and the forty
chips that get away still explain the magnet running twice on 15.

The quote comments in both files keep his original words and note the correction, so nobody reads
"tractor" in a shipped comment and rebuilds the machine.

Verified after the cut: sheet harness green (bird in all 16, nothing floats, 0 undefined fills) ·
collision check 16/16 clear · popup harness green (7 hops end home, chimney survives strip, 3 X
marks) · both the popup beat and the sheet card re-rendered and eyeballed — tarps visible, no
machine, nothing else moved.

---

## The book — popup.html goes multi-spread, opening four tappable (2026-08-03)

Theo picked **1: front to back**. `popup.html` is no longer "spread 7, full screen" — it now
carries a `SPREADS` registry, one spread mounted at a time, and a real page turn: the pop folds
flat, the scene swaps, and it stands back up. Tapping past a spread's last beat turns forward;
swiping back past its first beat turns back (landing on the previous spread's last beat). Only
built spreads are listed — 1, 2, 3, 4, 7 — and the top bar numbers them honestly out of 16.
`#N` in the URL opens spread N, on load or typed into an open book.

**The opening four, drawn in this file's own geometry and puppet** (the sheet's compositions,
never its `fig()` — one puppet per book): The Knock (worn roof, the truck, the rep on the step),
The Kitchen Table (full-bleed interior, contract + pen on the line, the bare-headed homeowner,
the cardinal on the sill), The Attic (**Theo's own beat script verbatim** — ladder down, switch,
decking, flashlight, baffles found buried, ringed in red; lighting is additive because beats only
ever add), The Takeoff (Curtis bare-headed in hi-vis, pipe boots + dish + gnome + sprinklers each
ringed, drone up for the before pictures). The bird's slider ends at home on **every** spread now
— the round-trip joke is the book's rule, not spread 7's. `figure()` grew `hat:false` and four
new POSE reaches (knock/table/clip/torch); `houseSVG` grew a `noCrew` flag; spread 7 calls it
exactly as before.

**What the render pass caught that green harnesses did not** — four, all real: the sheet-scale
truck stood half a man tall (0.8 → 1.15); **the "gnome has been counted" joke tab covered the
gnome** (tabs overlap the board's lawn corners on a phone — the yard inventory moved to the
centre band, into the flower beds where ornaments genuinely live); the drone read as a speck;
and on a landscape iPad **the board ran under the top bar** — `.scene` had no height bound
(invisible on 7 whose board-top is sky, glaring on the kitchen whose board-top is ceiling; now
`min(96vw, 940px, 80vh)`) — plus the desktop caption box sat on the centre joke tab, so
single-tag spreads moved their tab to the right slot.

One latent mismatch fixed while in there: `BIRD_AT`'s comment promised the bird walks back on a
back-step, but `paintScene()` only ran on forward steps. It runs on every `go()` now, so the
comment is finally true.

Verified: `pw_book.js` — 47 assertions, ALL GREEN (phases, distinct captions per beat, every
show-group on, sliders end home, interiors hide the pop-piece bird and carry exactly one
in-scene bird with no `id="bird"`, page turns land with `--open` back at 1, spread 7 still
strips to 40 persisted chips, chips hide when turning back before the tear-off, both hash
paths). `pw_bird.js` and `pw_deck.js` re-pointed at `#7` and green — spread 7 unregressed.
Rendered and eyeballed at phone and landscape iPad.

---

## Spreads 5 and 6 — The Colour and The Delivery, tappable (2026-08-03, same night)

Front-to-back continues: the book is now **1-7 with no gaps**. The Colour leans four real sample
boards against the siding — two either side of the door, tops clearing the window sills — and
rings the Onyx pick in the same inventory-ring language as the takeoff, one visual grammar. Its
last line is the true service detail: the boards stay the week. The Delivery parks the boom truck
on the driveway, reaches a boom over the gutter, and stages five bundles on the band's left free
zone (the wing owns 102-178, the chimney 182-214); the counting figure points up at the load, and
the closing caption hands off to the tear-off: "Tomorrow it gets loud."

Two reds on the re-run were the TEST's fault, not the app's — the back-swipe from spread 7 now
lands on spread 6, which did not exist when the assertion was written expecting spread 4. The
file's own rule held: when a gate goes red, first ask whether the test or the app is wrong.
Roughly half of all reds on this project are still the test.

`pw_book.js` now walks seven spreads — ALL GREEN, page errors none. Rendered and eyeballed both
at phone size; the red sample board half-tucked behind the "voted red, overruled" joke tab stays,
because a dismissed board hiding behind its own rejection reads as intended.

---

## Spreads 8-11 — the layers quartet, tappable (2026-08-03, same night)

The book runs **1 through 11 with no gaps**. `houseSVG` grew a mode string behind its boolean —
spread 7 still calls `houseSVG(true/false)` and gets identical behaviour; the layer spreads pass
`'bare'/'ice'/'felt'/'flash'`. The water layers ported from the sheet at identical coordinates,
in the order water meets them: drip edge FIRST at the eave, shield OVER it, felt starting above
and lapping down — never burying it (the sheet already carried Theo's correction on that). The
sprayed X marks belong to `'bare'` only: by the ice spread those sheets have been cut out, so
the marks are gone by construction. `wing()` carries the stage (`ice`/`flash` flags), and the
flashing spread rings its three seams — chimney, boot, valley — in the takeoff's ring grammar.
The valley ring sits at x=126, computed from `rakeX` at y=72 rather than eyeballed.

**Corrected before it shipped wrong: spread 5 now picks BROWNWOOD.** The ring sat on the
charcoal board with a caption saying Onyx Black — which is the colour of the roof coming OFF.
The book's `'new'` state has been OC Duration Brownwood on the sheet all along. Ring moved to
the brown board, caption names the product.

**The phone renders exposed a collision as old as the yard sign.** The sign (`left:78%` + fixed
84px) and the bird's slider (fixed 64px at `right:3%`) fully overlap on a 374pt phone scene —
the "measured gap" that placed the sign was wide-screen arithmetic, and fixed pixel widths eat
percentages on a phone. The sign, later in the DOM, was hiding the cardinal — including on
spread 7, where the final caption points at the bird. `.birdpop` gets `z-index:2`: the book's
protagonist stacks in front, and on wide screens nothing changes because they never overlapped.

`pw_book.js` walks eleven spreads — ALL GREEN (sign presence now asserted per spread: up from
the tear-off onward, absent before). Back-nav expectations moved with the longer book. Rendered
and eyeballed at phone size; the cardinal perched in front of its own logo sign stays.

---

## Spreads 12-16 — THE BOOK IS COMPLETE (2026-08-03, same night)

All sixteen spreads of The Pop-Up Roof are built and tappable in `popup.html`. The final five:
**The Shingles** (the `'half'` state — Brownwood courses under the felt's printed lines, with
`cutLayers(96)`'s labelled cutaway carrying the whole-roof-in-one-bite caption), **The
Ventilation** (`'new'` + the airflow arrows in two beat groups, intake tying back to the attic's
buried baffles from spread 3, no crew because the subject is the air), **The Walk** (Theo in
grey, no hat, on his own roof; the drone's after pictures; "He checks the gnome too"), **The
Sweep**, and **The Team** (the office in grey, Beto in the black lead tee, Curtis in the vest).

**The sweep is the book's flagship mechanic made literal.** Spread 7's forty chips are real DOM
elements that persisted across every page turn — and the magnet collects THOSE, not a re-scatter:
thirty-four on the first pass, the six that thought they got away on the second, each dragged to
the cart by a `--mx/--my` transform whose `!important` outranks the fling animation's forwards
fill (importance beats animations in the cascade — this is the one place that rule earns its
keep). The tally caption reuses spread 7's own `tally` machinery, so "All 40 of them" counts the
real number, and a book opened straight at `#15` with no chips ever flung just reads captions
that never name a count. Verified in Chromium: zero unswept chips at the end, the same-node
assertion holding the whole way.

`shingleArt` grew an `upTo` param for the half-done roof; `houseSVG` gained `'half'`/`'new'`
plane bases; the ladder and airflow ported from the sheet. The last page holds — tapping past
spread 16's final beat stays put.

`pw_book.js`: the full sixteen-spread walk, ALL GREEN, page errors none. The sheet's footer note
("these are scenes, not spreads") is rewritten — it stopped being true tonight.

---

## The team's real faces on spread 16 (2026-08-03, same night)

Theo: *"Can we add the faces of the team instead of the generic people."* The die-cut portrait
engine — drawn earlier this session from the real photographs and parked in `.claude/` so no
likeness went public before he said so — is now IN the book, at his explicit request. Ported
VERBATIM (the approved artwork; only the `<svg>` wrapper gained placement args), and spread 16
is the classic company photo: two staggered rows of all twelve busts in front of the finished
roof. Curtis's vest, clipboard and Clubmasters-free ginger scruff anchor the left; Beto's CREW
LEAD tee reads; the four generic faces stay generic per the settled instruction. **No names ship
in the public source** — the option-objects carry drawing parameters only; the roster mapping
stays in the private sheet. The cardinal's home slot photobombs the right end of the back row,
which is in character and stays.

**The defect the render caught this time is a CSS class, recorded for the next nested viewport:**
`.pop svg{width:100%;height:100%}` is a DESCENDANT selector, and the team spread is the first
time `#popsvg` has ever contained nested `<svg>` elements — so the rule overrode every bust's
width attribute (CSS beats presentation attributes) and all twelve rendered board-sized and
stacked into giant overlapping hair. Every DOM assertion was green: twelve svgs, right x/y,
right viewBox. `getBoundingClientRect` in the probe is what told the truth. Now `.pop > svg`,
which is byte-equivalent for everything that existed before tonight.

Verified: the full sixteen-spread walk ALL GREEN after the CSS change · twelve busts counted in
`teamG` at phone and iPad · no surnames in the public file (asserted mechanically, not eyeballed)
· rendered and eyeballed at both sizes.

---

## Theo, actually — the real cutout on The Walk (2026-08-03, same night)

Theo sent a photograph of a cardboard standee of himself — real photo, cardboard edge and foot
brace already part of the object — and asked to be put in "like this, but at scale." So spread
14's drawn Theo is now the REAL one: background floodfilled off from the borders (the tan
cardboard edge rings the whole cutout, hair included, and stops the flood — no threshold
guesswork), trimmed, scaled to 42 units (the drawn crew's exact height), and embedded as a
34 KB WebP data URI standing at the base of the ladder with a ground shadow. The one photograph
in a fully drawn book, which is the signature and the joke at once. The uploaded original stays
out of the repo; only the processed transparent cutout ships, at his explicit request.

One process miss worth recording: the first spread-14 "verification" screenshot was actually
spread 16 — a copied shot script whose URL replace silently didn't match (no assert on the
replace). The rewritten script asserts the phase title before shooting. A screenshot of the
wrong thing is worse than no screenshot, because it looks like proof.

Verified: full sixteen-spread walk ALL GREEN · the `<image>` node present in `walkG` with the
right rendered box at phone and iPad · rendered and eyeballed at both sizes.

---

## The second cutout — Theo and the super magnet on The Sweep (2026-08-04, past midnight)

Theo sent a second standee photograph — him pushing the actual Little Giant magnet sweeper,
debris speckles real on the bar — with the fact that makes the spread true: *"I always come out
the next day and sweep with a super magnet."* The drawn figure and drawn cart on spread 15 are
gone; the real cutout stands in their place, sized so the man reads the same 52 units as his
walk standee, and the caption now carries the next-day commitment in nearly his words. The
sweep acts still collect spread 7's real chips toward the bar's spot.

Processing note for the next standee: the border flood cannot reach background pockets fully
ENCLOSED by bright pixels — the magnet handle's A-frame held one (2,714 px of studio black
fenced in by the white struts). A second pass finds remaining near-pure-black components
(threshold under 22, size over 60) and clears them, reported before clearing so a dark shoe
never silently vanishes. Both cutouts now ship; both originals stay out of the repo.

Verified: full sixteen-spread walk ALL GREEN · zero unswept chips at the end · rendered and
eyeballed before and after the sweep.

---

## Two strays and real depth — Theo's two-part correction (2026-08-04, past midnight)

Theo, on the sweep spread: *"Not good, there should only be maybe one or two pieces of
confetti."* His crew hauls the debris on install day — forty chips on the next-morning lawn
told a false story about his own cleanup. And: *"did we stray away from making this look 3day
pop up style?"* He was right twice.

**The depth was genuinely missing.** `perspective` appeared ZERO times in popup.html — every
`rotateX` fold was rendering as a flat vertical squash, not a fold. Fixed per the file's own
header doctrine: perspective on each folding piece's DIRECT parent (`.scene` and `.popwrap`
1000px, `.birdpop` and `.signpop` 500px, `.tag` 400px), never `preserve-3d`, which iOS
silently flattens under overflow/filter/opacity. The mid-fold render now shows the sky
panel's creased edge swinging toward the viewer and the deck piece foreshortening with real
convergence.

**The lawn now keeps only two.** Spread 7 still flings all 40 chips (that part is true — the
tear-off is loud and messy). Past spread 7, `.strays` shows only chips 13 and 31; the other
38 leave with the crew. The sweep's first pass collects one stray, the second pass gets the
one that thought it got away — "the magnet runs twice" survives intact. The auto-tally
caption is gone; the closer now reads "Zero. The crew took the other thirty-eight before
dinner. Your lawn never knew."

Verified: full sixteen-spread walk ALL GREEN · exactly 2 strays visible at spread 15, zero
unswept at the end · mid-fold frame shot at 340ms confirms real 3D · before/after renders
eyeballed.

---

## Four field notes from Theo — nails, pink bundles, the trailer as a destination (2026-08-04)

Theo, iPad walkthrough verdict: *"Works great on iPad."* Then four fixes, ready to merge after:

- **"6 nails / shingle always when possible."** Spread 12's tag read "Four nails a shingle.
  Six in the wind rows." — now "Six nails a shingle. Every one, every time."
- **Shingle bundles are pink** — Owens Corning's own wrap colour, not the generic blue-grey
  they were drawn in. `bundlesG` (spread 6, `deliverySVG`) recoloured; the SAME hex
  (`#4A5866`) is also spread 5's colour-board swatch and was left alone — scoped the edit to
  the one `bundlesG` path, not a file-wide swap.
- **The trailer is dark grey/black**, not the original light grey — `trailerG` lives inside
  the shared `houseSVG()`, so recolouring it fixed spread 7 and spread 12 (which reveals the
  same group) in one edit, by construction.
- **"When the debris gets picked up it should show inside the trailer."** Spread 15 never
  drew a trailer at all — the magnet's collected chips converged on an arbitrary point
  (`0.55 * box.width`) and just faded there. Now `trailerG` shows alongside Theo's own
  standee at the first sweep beat, and `sweep()` targets the trailer's REAL rendered
  position (`getBoundingClientRect()` on `#trailerG`, not a hardcoded fraction) — it survives
  the 3D fold and the `preserveAspectRatio` scaling by construction, with the old formula
  kept as a fallback only.

Verified: inline script re-extracted and `node --check`ed clean · full sixteen-spread walk
ALL GREEN, unchanged from the previous round · all four spots rendered and eyeballed
(pink bundles, black trailer on both 7 and 12, the "Six nails" tag, the trailer parked
during the sweep).

---

## Sound — a proof of concept on four cues (2026-08-04)

Theo, after the merge: "is there a way to make it have sounds and music?" Answered with a
small POC rather than wiring all sixteen spreads at once, per his own "one build at a time,
verified before the next" habit.

Everything is SYNTHESIZED with the Web Audio API — no audio files, so `popup.html` stays one
self-contained page with no licensing question and no size growth. An `AudioContext` is
created lazily on the first cue, since browsers refuse to start one before a user gesture —
and every cue here already fires from a tap or a swipe, so nothing has to ask separately.

Four cues wired in this pass:
- **The page turn** (every spread) — a filtered noise whoosh, hooked into `turnTo()`.
- **The knock** (spread 1, the beat that shows `repG`) — three short percussive taps, via a
  new per-beat `sound:` property read in `go()`.
- **The tear-off** (spread 7) — a longer tearing/scraping noise burst, hooked into `shed()`.
- **The magnet find** (spread 15) — a short metallic clink, hooked into `sweep()`.

A speaker-icon mute toggle sits top-right beside the progress dots (`#soundBtn`), defaults to
on, persists the choice to `localStorage['crpop-muted']`, and calls `e.stopPropagation()` so
tapping it never also turns the page.

Verified: inline script re-extracted and `node --check`ed clean · full sixteen-spread walk
ALL GREEN, unchanged · a new harness confirms the button toggles without advancing the beat,
the mute choice survives a reload, and none of the four cues throw (knock, tear-off, sweep
clink, page-turn whoosh all exercised) · rendered and eyeballed on phone and iPad widths.

**Branch note:** PR #108 had already merged (squash), so this round restarted
`claude/contractor-vision-suite-bwq21i` from `origin/main` before committing, per the
merged-branch protocol — this is a fresh PR, not a reopen of #108.

Still open: if Theo wants this expanded to all sixteen spreads, or wants ambient background
music (a loop, with the same mute gate) rather than just discrete cues, or wants the
synthesized cues swapped for real recorded/licensed audio he supplies.

---

## Build 594 — the book gets an actual link, plus ambient music, plus a domain fix (2026-08-04)

Theo, after merge: "There's nowhere to find this book. No link at all." He was right — a full
`grep popup.html index.html` turned up ZERO references. The presentation subdomain was staged
but there was never an in-app way to reach it, which is exactly the "buried, not missing"
class this file warns about, except this time it really was missing: nobody had built the
link at all.

**Build 594 (`index.html`)** — a new landing card, `.cr-lr-book`, right under Showroom:
"The Pop-Up Roof," a plain `<a href="/popup.html" target="_blank" rel="noopener">` (same
pattern as the Studio tile — it's a static page, not an SPA view, so nothing needed wiring
through `wire()`'s `data-go` dispatch). Deliberately **not** width-gated like `.cr-lr-show` —
the book is phone-shaped and proven at 390px all session; only Showroom needs the ≥820px
floor. Rendered in isolation before trusting it in the full app (`book_card_preview.png`) —
the CSS is a straight copy of `.cr-lr-show`'s structure with the width gate removed and the
glow recoloured toward cardinal red. App stamp bumped 593→594, CHANGELOG entry added.

**`vercel.json`** — Theo also reported `presentation.cardinalrenovations.com` landing on the
retail CRM, "just like the showroom." The concrete, provable half of that: the existing
rewrite matched `host === "presentation.cardinalroster.com"` only — a different hostname
falls through to ordinary routing with no rewrite firing at all, silently. Added a second
rewrite for `presentation.cardinalrenovations.com` so whichever apex he actually bound in the
Vercel dashboard works. **The showroom half is NOT explained by this fix** — that detection
(`location.hostname.indexOf('showroom.') === 0` in `index.html`) is apex-agnostic by design,
so if `showroom.*` is failing the same way on either domain, the domain most likely isn't
bound to this Vercel project's Domains settings at all — something only Theo can check from
his dashboard, not something visible from the repo.

**`popup.html`** — Theo also asked for ambient sound. Added a continuous ambient bed: a quiet
open fifth (A2-E3-A3) on sine oscillators through a lowpass filter, slow independent detune
drift per note plus a slow filter-cutoff drift so it breathes instead of droning, starting
once on the same first gesture that creates the `AudioContext` and routed through the SAME
`master` gain node as every one-shot cue — so the existing mute toggle silences both together,
nothing new to wire. Never above .06 gain, well under the one-shot cues.

Verified: `check_build.py` GREEN against the real previous commit as `--prev` (not a
self-comparison) · `vercel.json` re-validated as JSON · sixteen-spread walk and the sound
harness both still ALL GREEN · a new stress pass (30 rapid taps with ambient and cues
overlapping, then muting mid-book) produced zero page errors · the new landing card rendered
and eyeballed in isolation before trusting it inside the full app.

Still Theo's: confirm which apex domain (`cardinalroster.com` or `cardinalrenovations.com`)
is actually added under this Vercel project's custom domains for both `presentation.` and
`showroom.` — that setting isn't visible from the repo, and the showroom failure can't be
fully diagnosed without it.

---

## Ambient sound, redesigned (2026-08-04)

Theo: "The ambient sound doesn't sound too good." No further spec — the call was mine to make.

The first version was a three-note sine chord (A2-E3-A3) with independent slow detune drift
on each note. Two likely culprits, both structural: bare sine oscillators read as thin and
synthetic (a test-tone quality, not music), and three independently-drifting pitches is
exactly the shape that can sound quietly OUT OF TUNE rather than alive — there's a chord for
the drift to clash against.

Replaced it with a texture instead of a chord: a soft filtered "room hush" — brown-ish noise
(a leaky integrator over white noise, `last = last*.97 + white*.03`, bounded by construction,
no clamping artifacts — verified numerically: 192,000 samples, peak 0.75, zero non-finite
values) through a 480Hz lowpass — plus ONE low tone (E2) for warmth. A texture has no pitch to
get wrong; a single tone can't clash with anything. Movement comes from a slow ~23-second
volume swell on the whole bed rather than pitch drift, so nothing ever wavers in a way that
could read as "off." Quieter overall too (.045 peak vs .06).

Same routing as before — through `master`, so the existing mute toggle still covers it, and
the same one-shot cues (knock, tear-off, sweep clink, page-turn whoosh) are untouched.

Verified: `node --check` clean · sixteen-spread walk and the ambient stress harness (30 taps
with the bed running, then muting mid-book) both still ALL GREEN, zero page errors · the noise
generator's amplitude bounds checked numerically in isolation. **Not independently verified by
ear** — I have no way to hear the result; this is a best-effort redesign against known failure
modes of the first attempt, not a confirmed fix. Theo's ears are still the actual gate here.

## Build 595 — Add project could not be scrolled to its Save button (2026-08-04)

Theo, with a screenshot: *"Please fix add new lead. Cant scroll to submit client."* The `+` button's
**Add project** modal (`#projModal`) filled the phone screen from Client name down to the Trades
checkboxes, and Cancel/Save were simply not reachable — no scroll, nothing to drag.

**One missing declaration, and it is the file's own convention that names it.** `#projModal` is
`position:fixed; inset:0` with **no `overflow`** — so the default `visible`, and a fixed element that
cannot scroll. Its card, `.projform`, is `margin:9vh auto 0`: no bottom margin, no height cap. When
the content is taller than the viewport it simply renders past the fold.

**It was the only one.** Every sibling overlay in the same file already had the fix — `#ckModal`,
`#gcModal`, `#leadModal`, `#leadFormModal` and `#apptModal` all carry `overflow:auto` inline, and all
give their card a bottom margin (4vh / 6vh / 7vh / 10vh). `#projModal` had been missed. This is the
buried-not-missing doctrine's inverse and now its own bug class (**§14**): the convention existed,
was correct, and had been applied to five of six.

**Second half of the bug, and the reason `overflow:auto` alone is not enough.** In the installed app
`body.standalone #pwaNav` is `z-index:9990 !important`; `#projModal` is `z-index:200`. The bottom nav
**paints over the modal**. Scrolling to the end without clearance just parks Save underneath the nav
bar — the harness proved this by hit-testing Save's own centre and getting back `pwaLib`, the nav's
library button.

Shipped:

- **inline on `#projModal`** — `overflow:auto;overscroll-behavior:contain;`. Scroll matches the five
  siblings exactly. `overscroll-behavior:contain` stops scroll chaining into the page beneath, which
  is the class PR #17 removed an `overflow-y:auto !important` band-aid for.
- **`<style id="cr-pm-scroll">`** — `#projModal .projform{margin-bottom:calc(24px + safe-area)}` and
  `body.standalone #projModal .projform{margin-bottom:calc(88px + safe-area)}`. **Scoped by id, not
  added to `.projform`**, because that class is shared by nine screens and none of the others may
  move. `88 = 64 + 24`, and the **64px is the existing `#pwaNav` clearance constant** —
  `body.standalone{padding-bottom:calc(64px + env(safe-area-inset-bottom))}` already uses it. Grepped
  for the convention rather than inventing a gap, per the corollary in `CLAUDE.md`.

App stamp 594→595, CHANGELOG entry added. **No scroll-lock writer added** — `openProjModal()` never
locked body scroll, and this fix does not make it a 14th writer.

Verified: `check_build.py` GREEN against the real 594 artifact as `--prev` (105 inline scripts,
116/116 style tags, marker present, negative control clean). Then a **real Chromium** harness, since
this is layout and jsdom cannot resolve it — **27/27 PASS on 595 against a 12-FAILURE negative
control on 594**, across three phone sizes, hit-testing Save's own centre rather than trusting its
rectangle. Desktop (1440) and iPad (820) re-measured non-standalone: card top margin, Save visibility
and horizontal scroll all byte-identical to 594. Before/after rendered and eyeballed — the 594
"scrolled to the bottom" render reproduces Theo's screenshot exactly, Trades row and no buttons.

**A counting trap worth recording, caught by the patch's own assert before any write:** an assertion
that the shared `.projform{` rule was untouched failed, because `#projModal .projform{` *contains*
that substring — my two new rules counted as edits to the rule they were written to avoid. Anchored
on `\n.projform{` instead. The file's rule — *scope the assertion, then read what it captured* —
earning its place again.

⚠ **`#sigModal` (the signature pad, z-index 230) is the one remaining fixed overlay with no
`overflow`.** Left alone deliberately: not what Theo reported, and a signature canvas has different
sizing rules than a form. Recorded here so it is found on purpose rather than by another screenshot.

## Photo Activity initials + What's New ordering (601)

- **601** · the `ROSTER` map in `cr-pae-script` gave Joan and Jerry the **same badge** — both
  `JV` — so the initials circle on every photo tile in Photo Activity could not tell them apart.
  Four of the eight entries were wrong against `team_profiles`: Joan `JV`→`JH`, Nick `NP`→`NH`,
  Joey `JC`→`JL`, Jacob `JM`→`JSH`. Jerry's `JV` was correct and is untouched.

**Two traps in a four-line data fix.**

`initials:'JV'` occurs **twice** — Joan's and Jerry's. A value-level replace retags the one entry
that was already right. Every edit was anchored on the full line *including the email key*, and
the patch asserts Jerry survived byte-for-byte and that exactly one `JV` remains.

Jacob is **`JSH`, three characters**, which is what keeps him clear of Joan Hunt — both derive
`JH` from a surname. The badge is a fixed 24px circle at `font:800 10.5px`; the harness computes
the rendered width (~20.8px) rather than assuming it fits.

**Found while filing the changelog entry, fixed in the same build:** builds **599 and 600 were
sitting at positions 15–16** of `CHANGELOG`, wedged between two 584 entries. Whoever added them
grepped `{ build:` and concluded the array stopped at 584 — 585–598 use the `{ b:, d:, t:, s: }`
shape instead. The renderer has **no sort**; `show()` filters on `entryBuild(e) > lastSeen`, so an
automatic open was unaffected, but the fallback `CHANGELOG.slice(0, 5)` — the *manual* open, once
there is nothing new — took the first five in file order and **skipped both**. Reproduced against
the 600 artifact: its `slice(0,5)` is `598,597,596,595,593`. Both entries moved to the head, 601
filed above them, entry text unchanged.

This is the **581 class recurring** (581's own note: *"two ways of writing an entry had got
mixed"*). `entryBuild`/`entryNote` normalise both shapes, so nothing rendered as
`Build undefined` this time — only the ordering broke. **Grep both `{ b:` and `{ build:` before
concluding anything about this array's contents.**


---

# Backfill — 23 builds that shipped without a log entry (560–600)

**Reconstructed 5 Aug 2026, not written at build time.** Sources: the in-app `CHANGELOG`
in `<script id="cr-cl-script">` and the commit titles on `main`. **Where an entry below
carries engineering detail, it came from `CLAUDE.md` or the code itself; where it does
not, the detail was never recorded and is not invented here.** Contemporaneous entries
(584–595, 601) carry gates, markers and negative controls. These do not. Do not read the
absence as "no gates ran" — read it as "not recorded".

The gap was found by comparing entry headers in this file against the `CHANGELOG` array:
41 builds shipped in 560–601, 18 had an entry. **Two earlier measurements of this same gap
were both wrong** — one regex counted only `**NNN**` bold rows and under-reported; a looser
one counted any three-digit mention and over-reported, including numbers written *today*
inside the 601 entry. The file's own rule earned its place twice in five minutes.

## The menu could not reach the screens that float above the app (560–561, 570–572)

- **560** · The left menu reached the Estimates builder, the one screen 558's sweep missed —
  the builder is created on the fly rather than living in the page, so the sweep never saw it.
- **561** · Two corrections: 560 had fixed the builder behind "+ New estimate", but the menu's
  *Estimates* item opens a different screen, and that was the one covering the menu. Pricing
  Catalog and Claims had the same fault. Also finished 559's Quick Inspection readability pass —
  it had done the photo stream but not the pin-the-property step you land on first.
- **570** · Crews, Pricing Catalog and Company Documents **trapped the user**: they float over
  the app, and `hideAllViews()` had never been told they exist, so navigation swapped the page
  *underneath* them. The estimate editor was left alone deliberately, so a stray tap could not
  discard an estimate mid-edit.
- **571** · Finished 570 — the estimate editor, and `navRestore()`: the back button had walked
  straight past Crews, Estimates, Pricing Catalog and Company Documents as if never opened.
- **572** · Sales Floor, the Objections Coach and the Production board opened bare — no menu, a
  narrow strip down the middle, empty space either side. Now they keep the menu, close properly
  and use the full desktop width. Phones unchanged.

⚠ **`CLAUDE.md` carries the full doctrine for this span** — which screens close by `display`
and which by a CLASS, and why writing `display:none` onto a class-shown element is permanent
damage. Read that before touching `hideAllViews()`.

## Two functions repainted every frame, forever, on every screen (567, 569)

- **567** · `paintChip()` (the header CRM chip) and the landing `paint()`. Both had guards that
  could never succeed — `paintChip()` compared an HTML **source string** against `innerHTML`,
  which is the browser's **serialization** of it, and `meta.icon` is inline SVG, so a
  self-closing `<path .../>` round-trips as `<path ...></path>`. The landing `paint()` had no
  guard at all: assigning `textContent` emits a childList mutation **even when the string is
  identical**.
- **569** · `wxPaint()`, the weather strip — 567 missed it because **the machine it was tested
  on cannot reach the weather service, so that code never ran.** It compares against a stored
  signature rather than live content, because `metallicize` legitimately re-wraps the emoji and
  a live compare would fight it forever.

**Cost: 388 DOM writes/sec waking all 50 `document.body` observers every frame. After: 3.3/sec.**
The two builds chose *opposite* guard shapes on purpose — copying either into the other's place
reintroduces the bug.

## Screens reading the wrong tables, and a retry storm (565–566, 568)

- **565** · A background job wiring address autocomplete was **retrying ~60×/second on every
  screen, forever**, because no Google Maps key was configured — tens of thousands of errors a
  minute. Now tries once and stops. Also added Discard to estimates (theo@ and joan@ only).
- **566** · The estimates list asked the server for **two columns that do not exist**, so every
  load returned an error. It had been failing quietly since the day it shipped.
- **568** · The Estimates screen showed nothing because it read **two other tables, both empty** —
  all twelve estimates had been saved the whole time. Added Drafts/Sent sorting, open-in-editor
  (which had never worked), and archive-without-delete.

## The AI Field Manual (574–577, 581–583)

- **574** · Hardware page corrected — Apple cut the Mac Studio to 96 GB. Added a Spark vs Mac vs
  AMD comparison and a plain-English "The commands" page.
- **575** · AMD given a fairer hearing — joins the memory table, section leads with what it is
  genuinely better at.
- **576** · The Spark weighed on everything it does, not just photographs; image generation and
  LoRAs lead, since diffusion is the most CUDA-locked work there is.
- **577** · Apple given the same fair hearing as AMD. Two self-contradicting figures fixed.
- **581** · **What's New was showing five blank cards reading "Build undefined"**, and the seven
  newest builds never appeared — two ways of writing an entry had got mixed and the renderer
  understood one. `entryBuild`/`entryNote` now normalise both. **This class recurred at 601** in
  a quieter form: the shapes were tolerated but the ordering was not.
- **582** · Hardware chapter answers the whole question — spec sheet, DGX Spark and Apple each
  written up, RTX PRO 6000 with its own trade-offs, three-way table, and both stacking questions.
- **583** · The Library's floating buttons (TOC, Manage, theme, Ask/File) were covering the words.
  None of them acts on the book, so they step aside while reading.

## Theming (573)

- **573** · Four screens were hardcoded white in both themes — Objections Coach, Pricing Catalog,
  Company Documents, Adjusters. Walking into the coach from the dark Sales Floor was a wall of
  white. **Nearly shipped inert:** two of those modules paint an inline `M.style.background='#fff'`
  in JS, which beats every stylesheet rule at any specificity — the tokens read `#141619` and the
  page still painted white. Only a rendered preview caught it. Every colour carrying text was
  computed for contrast rather than eyeballed. `cr-bpa-script` was left alone on purpose: it has
  no dark palette to fall back on.

## The exterior vocabulary (596) — now load-bearing for 602

- **596** · The photo inspector could only name **roof** problems, so on a siding, window or
  gutter walk it found the damage and had nowhere to file it — **nearly a third of everything it
  found came back as "Other."** Added 16 exterior classes and told the route which trade the walk
  is for before it looks.

**Read this entry before touching `DEFECTS`.** The names "came from what it had already been
calling those problems in its own words, not from a list somebody made up" — 294 flattened boxes,
clustered as *gutter 65, **soffit/fascia 57**, window 42, deck 42*. That soffit/fascia cluster is
the evidence build **602** rests on: they were **one** cluster in the data, and splitting them
into two classes is what produced the per-class-NMS duplication in v4.

## Showcase, and the team (597–600)

- **597** · The Showcase job picker was a dead end — Cancel and "Use these" sat **under the phone's
  bottom bar**, visible but untappable, with nothing below to scroll to and no outside-tap to
  dismiss. The only way out was closing the app.
- **598** · Finished 597, and surfaced the upload that had been there all along — the button said
  "Add a pair", which does not sound like an upload. Now "Upload photos", with "Upload instead" on
  the picker.
- **599** · **Jerry Vera** could sign in but was on **none of the six team lists**, so nobody could
  assign him a job and his name rendered as a bare email address. Added to the roster, both rep
  pickers, the Assign-to list and the initials map. ⚠ His `ROSTER` entry was correct; **Joan's was
  not**, and the collision that created is what 601 fixed.
- **600** · What's New auto-opened for **everyone** three seconds after load on every new build.
  Gated to theo@ at both the automatic and manual entry points.

## Defect taxonomy narrowed, 33 -> 31 (602)

- **602** · `soffit_damage` + `fascia_damage` **merged** to `soffit_fascia_damage`;
  `paint_deterioration` **removed**, its boxes reassigned to the surface they are peeling off.

**Why, and it was written down at 596 without anyone noticing.** v4's `val_batch1_pred.jpg` came
back with one rotted eave boxed three and four times, each box a different class. **NMS is
per-class** — it only suppresses overlapping boxes of the *same* class, so splitting one repair
across three names guarantees all three survive. Not tunable.

The ground truth was measured and is mostly innocent: **3 cross-class overlaps above 0.5 IoU in 454
images.** The annotations did not teach it. The *taxonomy* invited it — and `api/detect.js`'s own
596 comment already said the exterior vocabulary came from what the model called 294 flattened
boxes, clustered as *"gutter 65, **soffit/fascia 57**, window 42, deck 42."* **Soffit and fascia
were ONE cluster in the data.** Splitting them into two classes is what broke it.

`paint_deterioration` was a **condition among locations** — it stacks on every surface, which is
why it had the most boxes of the four (36). Paint failure now belongs to whichever surface carries
it, and is named in both surface descriptions so the model still has somewhere to put it.

**Every index ≤18 is unchanged** — the 17 roof classes and `other` (pinned at 16) keep their exact
numbers. The merge sits entirely in the exterior tail, so the roof half of the model is untouched
by the renumbering. `walks_trade_ck`'s six trades are unaffected; no DB change.

**Three files carry this list and all three were changed together** — `api/detect.js` DEFECTS,
`spark/hail_review.py` DEFECT_KEYS, and `spark/remap_taxonomy_602.py` NEW_NAMES. A gate asserts all
three are identical. Same rule as `STAGES`/`WO_TRADES`: one grows, all grow.

**`spark/remap_taxonomy_602.py`** migrates the label files. Two bugs were found by testing it
against a fixture rather than reasoning about it:

1. **Paint boxes parked at 24 collided with the new `window_seal_failure`.** Anyone training between
   pass one and pass two would have turned every peeling soffit into a failed window seal, silently.
   They now park on **class 99** — outside `nc`, so training hard-fails instead. Loud beats subtle.
2. **The double-apply guard never armed.** The marker file was written only when no paint boxes were
   pending, but pass one *always* leaves them pending — so the marker was never written and a second
   run shifted every index again. Caught in test: a `siding_damage` box silently became
   `soffit_fascia_damage`. The marker now means *"indices have been shifted"*, written by pass one.

⚠ **Nothing ships until the dataset is remapped and retrained.** The code and the label files must
move together or the next YOLO export is silently wrong.

---

## Build 602 — soffit and fascia are one finding again; paint_deterioration deleted (2026-08-06)

Shipped the merge. **Did not ship the reassignment** — that half of the plan was wrong and the
photographs said so.

`19 soffit_damage` + `20 fascia_damage` → `19 soffit_fascia_damage`. `24 paint_deterioration`
**deleted, boxes and all**. 33 → 31 classes; every index ≤18 untouched.

**The reassignment premise died on contact with the data.** The original design said paint is a
condition, not a location, so each box should be re-homed to the surface carrying it — soffit/fascia
or siding. A two-pass migration, a 128-row review file and an overlap-scoring suggester were built on
that binary. Theo opened the photographs: the first seven boxes were on **decking, windows, roofs and
leaks**, and three that *were* on soffit/fascia/siding **duplicated a box already annotated there**.
`paint_deterioration` had been a junk drawer. Reassigning it would have taught the model that a
leaking window is siding damage — and would have manufactured the same redundancy 602 exists to
remove. `--drop-paint` deletes instead, and the whole human gate disappears with it.

**Applied:** 1,821 → 1,693 boxes (128 deleted) · `window_seal_failure` preserved at 11 · sentinel 99
at 0 · `data.yaml` `nc: 31` · 474 `.pre602` backups.

**Retrain `hail_v5`** (yolov8n, 120 epochs, mirroring v4's args). Cross-class stacking is gone
**structurally**, not by measurement: `soffit_fascia` vs `siding` overlaps = 0, and with paint deleted
and soffit+fascia merged, NMS now sees same-class boxes. Compared **by name** (v4/v5 indices are not
comparable): precision 0.68 → **0.827**, mAP50 ~0.56 → **0.603**, **recall 0.667 → 0.617 — down**.
One merged class predicts more precisely than two split ones; it does not find more. Residual
*intra-class* overlap is threshold-sensitive (9 images at `iou=0.7`, 1 at `0.5`, 0 at `0.3`) and
there is no threshold to quote against — **nothing in this repo consumes the `.pt` yet**;
`api/detect.js` is a prompt route with no NMS at all.

**Five bugs in `remap_taxonomy_602.py`, four of them in code already called verified.** Two from
fixture testing (paint colliding with `window_seal_failure` at 24; the double-apply guard never
arming). Three from real data: `label_files()` matched only the last path component and found zero
files on a split dataset; line numbers shifted between passes and silently discarded human decisions;
and **`--drop-paint` deleted `window_seal_failure`** — on a remapped tree old 26 shifts into NEW 24,
the index paint vacated, and the drop took both. The live dry run said **139** where 128 was expected
and the extra 11 were real window boxes. **The count was the entire signal**; no test caught it.

Four negative-controlled harnesses now guard it: `test_remap_layouts` · `test_remap_lines` ·
`test_suggest_paint` · `test_drop_paint`. `spark/RECOVERY_602.md` carries the mid-flight state.

The lesson worth keeping: every one of the five was caught by **a number that did not match** — 0
files, 7 lines vs 5, 16 of 128, 139 vs 128 — and not one by a passing test. Three trace to a fixture
that did not contain the case that mattered: flat instead of split, contained instead of covers,
class 32 instead of class 24.
- **603** · **The Production board became a job dossier** — Theo picked option 3 from a five-option
  preview set. Master-detail: the job list on the left, the selected job's own page on the right,
  carrying stage, address, blocker, **a button straight through to the client profile**
  (`window.openProject`, the existing opener — extended, not rebuilt), tap-to-call where
  `projects.phone` is actually populated, and its punch items under **New / Remaining / Closed**
  tabs. Desktop shows both panes, gated on `body.cr-lnav-on` — **the same signal 572's width rule
  uses; the convention already existed, so no media query was invented.** Phone shows one pane and
  a back button. ⚠ **The three buckets are DERIVED, not stored**: `punch_items.status` is binary
  (`open` | `done`), confirmed against the live table — NEW is open and under 7 days, REMAINING is
  open and older, CLOSED is done. No column, no migration, nothing to backfill.
  ⚠ **The board also gained an off-stage tail**, and this is the part that mattered most: the job
  list now includes any project carrying punch items even when its stage is not Approved /
  Scheduled / Completed. On the live database **that is every punch item there is** — the only row
  sits on a **Prospect** — so without the tail the dossier would have shipped unable to reach a
  single real item. Found by querying the table before building, not after.
  ⚠ **Live data reality, recorded so nobody calls the empty screen a bug:** 20 projects — 15 Lead,
  4 Prospect, 1 Invoiced — and **zero in Approved, Scheduled or Completed**, so `activeJobs()`
  legitimately returns `[]` and the board's job list is empty until a job is moved. That predates
  603; the empty state now says so in words instead of just "Nothing in production right now."
  Verified: 10/10 mechanical gates with negative control · a **32-assertion jsdom harness against
  the shipped module text** (not a re-implementation) covering the off-stage tail, bucket
  derivation at real timestamps, the client wiring, tab switching, pane push/back, MINE, and the
  empty state · **18 Chromium computed-style proofs** that the desktop rule actually wins the
  specificity contest (0,3,1 over 0,3,0) and that both themes paint — the build-481 lesson.
  Scope proof: 21 hunks, **zero outside** `cr-pb-styles` / `cr-pb-script` / stamp / changelog;
  all 46 of 393's daylight rules and all 93 original dark `.cr-pb-*` rules present byte-for-byte.
- **604** · **The client-profile punch card had been `display:none` the whole time.** Theo, after
  testing 603: *"there is nothing in client profile to add the punch out. Right now, client profile
  then landing then productions then hope it lands on the most recent client."* He was right that
  nothing was there — and the code was right too. **`cr-pp-script` is complete and correct**: it
  mounts a Punch List card with an unconditional `+ Add` that calls
  `CardinalProduction.addFor(pr.id)`, reproduced working against the shipped module text.
  **The AccuLynx overview rebuild had hidden it.** `#tab-overview > *:not(#acxMount)
  {display:none !important;}` hides every direct child of the tab except the overview mount, and
  `cr-pp-script` inserts `#cr-pp-mount` as a sibling of `#jaGrid` — a direct child. So a fully
  built, fully wired card rendered correctly and invisibly on every retail and insurance profile.
  **Community was never affected**: there the card mounts inside `#cr-cc`, a different container.
  Fixed at source by naming the second legitimate child — `:not(#acxMount):not(#cr-pp-mount)` —
  rather than fighting `!important` with an override layer. **This is the prime doctrine and the
  333 bug class, again**: buried, not missing; a mount anchor that still exists but no longer
  renders. Build 333 fixed one instance of exactly this and the overview rebuild recreated it.
  Verified: **a real-engine negative control across both builds** — `#cr-pp-mount` computes
  `display:none` with a **0×0** `+ Add` at 603 and `block` with a **50×21** button at 604, while
  `#acxMount` stays visible and `#jaGrid` and the retired legacy rows stay hidden in both, proving
  the dead markup was not un-hidden along with it. jsdom cannot rule on an `!important` cascade;
  Chromium is the only witness for this class. 603's harness and CSS proof re-run green.
- **605** · **"+ Add" could not file against most of the book, and 604 is what exposed it.** Theo,
  on being told the client-profile card was back: *"But since productions is being redesigned does
  it matter?"* — checking the answer found the button did not work at all. `openAdd()` built its Job
  dropdown from **`activeJobs()` alone** (Approved / Scheduled / Completed). The live database has
  **zero** of those, so the dropdown rendered `No active jobs`, `saveAdd()` refused with
  *"Pick a job."*, and **both** the card 604 un-hid and 603's own "+ Punch item" were dead ends.
  Pre-existing — but nobody hit it while the card was invisible, which is exactly how 604 turned a
  dormant defect into a live one. **Reported as mine.**
  Now: the preset job is **always** selectable whatever its stage, plus everything `boardJobs()`
  already returns, with the stage shown beside off-stage names so it is obvious you are filing
  against a lead rather than a job in flight. Verified with a three-case repro on the live data
  shape — a Prospect carrying punch, a bare Lead (15 of 20 jobs), and an active-job control that is
  unchanged. All three now file against the right job; before, the first two were refused outright.
  **The lesson worth keeping: un-hiding something is not the same as making it work.** 604's gates
  were green and correct — they proved the card rendered, and proved nothing about the modal behind
  it. The question that found this was Theo's, not a gate's.
- **606** · **The punch card repainted 54×/sec, and its words were invisible.** Both found from one
  screenshot Theo sent of a live client profile — *"Issues with clicking the button 3 times to open.
  Also can't see the words."* Both reproduced and measured before anything was changed.
  **The three taps were a runaway repaint.** `render()` in `cr-pp-script` wrote `host.innerHTML`
  unconditionally, and **that write is itself a childList mutation inside `document.body` — which
  this module's own MutationObserver watches.** Each write scheduled the next: **~54 rewrites per
  second, forever**, destroying and rebuilding the `+ Add` button under his finger, so a press that
  began on one instance ended on another and never became a click. **The 567/569 class, in a module
  that had no guard at all** — like the landing `paint()`. Guard is the **stored-signature** shape
  (`wxPaint`'s, not `paintChip`'s): compare the markup we generated against the last markup we
  generated, never against live `innerHTML`, because the browser re-serialises and a live compare
  can never settle. **Measured: 54/sec → 1 write to settle, 0 on an unrelated DOM change**, while a
  real data change still repaints and `+ Add` fires on **one** click.
  **The invisible words were a half-finished dark conversion.** One retail rule
  (`body:not(.claim-insurance):not(.claim-community) #cr-pp-mount > div`) gives the card a dark
  ground and `color:var(--rbe-ink)` — and stops. Every child carrying an explicit colour kept the
  ink it was given for the original **white** card and beat inheritance: title **1.22:1**, meta and
  empty copy **2.38:1**. Now `var(--rbe-ink,#cfd6df)` **8.67:1** and `var(--rbe-mute,#9aa0a8)`
  **4.82:1**, computed at **both ends of the gradient** (`#2e333b` and `#262a31`) so nothing passes
  at the top and fails at the bottom. **`--rbe-mute2` `#6d747e` was REJECTED for completed rows at
  2.69 / 3.05:1** — they take the legible ink and keep the strikethrough as the "done" signal,
  because dimming is not what carries that meaning. Every token carries a literal fallback: this
  card is painted from a stylesheet other than the one declaring them, which is the 448–449 case.
  ⚠ **The cream header is deliberately untouched** — brown on cream reads fine and converting it is
  taste, not correctness. Offered to Theo as a separate choice rather than decided here.
  ⚠ **Two of my own measurements were wrong first time and are worth remembering.** `background:
  linear-gradient(...)` sets background-**image** and resets background-**color** to transparent, so
  reading `backgroundColor` returned `rgba(0,0,0,0)` and looked exactly like the 448–449 stripped-
  token bug; it was not. And a selector scan filtered to rules *naming* `cr-pp-*` missed the rule
  that actually wins, which is `#cr-pp-mount > div`. Enumerate what an element **matches**, not what
  mentions it.
- **607** · **Punch Outs moved into the job menu, and each item got a discussion thread.** Theo:
  *"move the location into job menu as Punch outs ... have it click into the punch out for the
  client. Maybe a list for the client and when you click on it, opens that specific punch out and
  add a small discussion box that you can tag other users in"* — then, asked how tagging should
  behave: *"chat box primarily. Only notify if @user."*
  **✅ SQL APPLIED to production 6 Aug 2026** (`punch_items_comments_607`) — verified: `jsonb`
  `NOT NULL DEFAULT '[]'`, 3 of 3 rows a valid array, none null, RLS untouched (four policies
  intact). **Do not re-run it as pending work.**
  **`punch_comments.sql` adds `punch_items.comments jsonb`.** Same shape as the
  project-level `ck.comments` (`{by,name,at,text,mentions}`) so one renderer and one resolver serve
  both. **No new RLS** — the column rides on `punch_items`' existing policies rather than creating a
  second place for that rule to drift.
  **Most of this was already built, which is the whole point of auditing first.** `sendChat()`
  already extracted `@name`, resolved it against `TEAM_ROSTER` by first name **or** email prefix,
  excluded the author, and pushed via `notifyTeam()` → the wrapper at 21313 → `/api/notify`. That is
  precisely the rule Theo asked for. **Extracted to ONE implementation** — `mentionNamesIn()` /
  `mentionEmailsFor()`, exported as `window.CardinalMentions` — and `sendChat` now calls it, so
  there is not a second copy of the tagging rule. Copying it would have been the duplicate-pipeline
  bug this project keeps paying for.
  **It is a real TAB, not a fixed overlay** — `#tab-punch`, driven by the existing
  `showTab()`/`#jobMenuSel`. So it needs no `hideAllViews()` / `navRestore()` registration and
  cannot strand the user the way 570–572's unregistered full-screen views did. It also **retires the
  604 fight** rather than continuing to win it: nothing mounts into `#tab-overview` any more.
  **Community deliberately keeps its inline card** — the takeover has no tab strip to move it to,
  and that path was never affected by 604/606. Verified unchanged.
  Both new surfaces carry 606's stored-signature guard; an unguarded `innerHTML` write on the tab
  would have reintroduced the runaway repaint on a second surface.
  Verified: **32-assertion harness against the shipped module text and the shipped mention helpers**,
  including the three that reach real phones — **a push goes only to the tagged person, never to the
  author even if self-tagged, and an untagged message notifies nobody** — plus tile count, list,
  detail, chip insertion, save shape, back navigation, and 0 repaints in 1.2s. Community regression
  test separate. 603/605/606 harnesses re-run green.
- **608** · **Push notifications have never worked, and the gate meant to prevent exactly that was
  blind to it.** Found while replicating `check.yml` locally because **GitHub Actions had stopped
  running on this repo entirely** (no runs at all after 07:48 UTC on 6 Aug — 606, 607 and the SQL
  commit all got zero, none queued; repo-wide, not PR-specific).
  `index.html` declared `VAPID_PUBLIC` **twice, with two different keys**, in two script blocks
  feeding two subscribe paths:
  | line | key | writes |
  |---|---|---|
  | 17566 | `BI-nCdP…` | `push_subscriptions` |
  | 21311 | `BG8JTSY…` | **`push_subs`** — the table `api/notify.js` READS |
  **Proved, not argued:** `api/notify.js`'s private key run through
  `crypto.createECDH('prime256v1')` derives to **exactly `BI-nCdP…`**. So notify.js is
  self-consistent and `BG8JTSY…` was the odd one out. A push signed with one VAPID pair against a
  subscription created with another is rejected by the push service — **so every subscription in
  `push_subs` was unreachable, silently, at both ends.**
  **The gate could never have caught it.** It used `String.match` **without `/g`**, which returns
  only the FIRST occurrence — it compared first-in-index (`BI-nCdP…`) against first-in-notify
  (`BI-nCdP…`), matched, and passed. Verified against the real shipped 607 file: **old gate PASS,
  new gate FAIL.** Now checks *every* declaration. **Do not narrow it again** — a gate that reports
  confidence it has not earned is worse than no gate, and this one's own comment says it exists so
  push cannot silently fail.
  ⚠ **Existing subscriptions cannot be repaired, only replaced** — a VAPID mismatch returns 403, not
  404/410, so `notify.js`'s auto-prune never removes them. Everyone must re-enable notifications
  once per device. The stale `push_subs` row survives until then.
  ⚠ **Still open, deliberately not touched here: `push_subs` and `push_subscriptions` are two tables
  for one concept**, one row each, both theo@. `notify.js` reads only `push_subs`, so the 17609 path
  writes somewhere nothing reads. One build at a time — but this is the duplicate-pipeline pattern
  again and it is what made the two-key split possible.
  Verified: one distinct key across both declarations, matching `notify.js` and derivable from its
  private key; gate negative-controlled against the shipped 607 artifact; 603/607 harnesses and the
  community test re-run green.
- **609** · **My regression, and it made punch UNREACHABLE.** 607 moved the punch card off the client
  overview into a job-menu entry — and put that entry in **`#jaGrid`**, the legacy grid hidden by
  `#tab-overview > *:not(#acxMount)`. **That is the exact rule build 604 existed to explain**, and I
  walked into it one build after documenting it. The card was gone and the replacement never
  rendered, so between 607 and 609 there was no way to reach punch on a retail or insurance job at
  all. Caught only because Theo screenshotted the whole client page and Punch Outs was not in the
  menu.
  **There are TWO job menus and only one renders.** `#jaGrid` / `.jatile` / `data-ja` is legacy,
  hidden, and mirrored into community by `syncJobMenu()`. The one on screen is built by
  **`renderAcxOverview()`** via `jt()` into `.jaboxrow` pairs with **`data-jm`** — ten tiles:
  comms · notifs · album · tasks · measure · estimates · docs · appts · inspections · materials.
  **If you are adding something to "the job menu", it is the `jt()` one.** The tile now sits in both:
  the `jt()` one because it renders, the `#jaGrid` one because community mirrors that.
  No new routing — `data-jm="punch"` falls through the router's `else` to `showTab('punch')`, which
  607 had already wired correctly.
  ⚠ **A second error caught before it shipped:** `punchOpenCount()` had been defined *inside*
  `renderOverview()`, so `renderAcxOverview()` could not see it and the tile would have thrown a
  **ReferenceError, taking the entire overview card down**. Hoisted to one shared definition ahead of
  both callers, verified same-`<script>`-block. It also returns `''` rather than `0` before rows
  load, and swallows a throwing module, so a punch problem can never blank the client page.
  Verified: 15-assertion harness covering tile placement in the rendering menu, router fall-through,
  single in-scope definition, and all four `punchOpenCount` behaviours executed as shipped text;
  603/607 harnesses, community test and the add-modal repro re-run green.
- **610** · **Tapping a punch out opens the punch out, and the discussion reads as a chat.** Theo,
  from the live app: *"When clicking on the punch out it still takes you to client screen. There's
  already a view profile. Instead it should take you to the clients punch out screen."* and *"Can you
  make a chat box style? Or discussion box."*
  **The deep link.** A punch row in the Production dossier called `openProject()` and landed on the
  client **Overview** — duplicating the "Open client profile" button directly above it and burying
  the item just tapped. It now lands on that client's **Punch Outs** tab with **that item open**, via
  a new `CardinalPunchProfile.openItem(pid, itemId)`. ⚠ `openProject()` is asynchronous in effect —
  it swaps the view and `check()` reloads rows on its own observer pass — so `openItem` **polls for
  that project's rows** (≤3s) rather than firing into an empty list, and an unknown id falls back to
  the list rather than a blank pane. Both proved.
  **The chat.** Full-width stacked cards became a conversation: yours right in amber, everyone
  else's left on the card ground, and a **name only where the speaker changes**, so a run of replies
  reads as one voice. `.pp-msgt` → `.pp-bub`.
  ⚠ **The negative control earned its place before any of this ran.** The first marker was
  `openItem`, which **already appeared twice at 609** — the gate refused it as proof, correctly. A
  marker that predates the build proves nothing.
  ⚠ **And I made the 604 mistake a third time in the first CSS proof**, loading only
  `cr-ppg-styles`: with no `:root` to define `--rbe-bg1`, both themes fell back to the same literal
  and "daylight" was an artifact, not a verification. Re-run against the **whole page**: daylight
  resolves theirs to white at **18.10:1** and mine to bronze at **5.92:1**; dark is 8.67 / 8.87:1.
  **Load every stylesheet or the reading is fiction.**
  Verified: 14-assertion harness (deep link, unknown-id fallback, `.mine` on the author's messages
  only, one name per speaker change, escaping, composer intact) · full-cascade Chromium proof of
  layout and contrast in both themes · 603/607/609 harnesses, community test and add-modal repro
  green. 607's harness asserted on `.pp-msgt`; **the test was stale, not the app** — rewritten to
  assert on rendered thread text so a restyle cannot fail it and a missing message still does.

---

### ⚠ Correction to the "Actions was down" claim in 608, 609 and 610 — read before repeating it

**Build 608's entry above says GitHub Actions "had stopped running on this repo entirely (no runs at
all after 07:48 UTC on 6 Aug)". That was true when it was written, around 09:00, and false within a
few hours.** It was then repeated in 609's and 610's reporting and in **610's commit message**, which
is merged and cannot be corrected — *"Actions is down repo-wide, so check.yml gated none of this"* is
permanently wrong in main's history. This note is the correction.

What actually happened, measured against `check.yml`'s run list rather than remembered:

| commit | build | on main | CI |
|---|---|---|---|
| `279fd51` | 602 | 07:10 | ✅ success |
| `dae0209` | 603–605 | 07:23 | ✅ success |
| `694b855` | **606–608** | 14:00 | ✅ **success** |
| `25bcda8` | **609** | 14:42 | ✅ **success** |
| `5fa7889` | 610 | 19:27 | ❌ **cancelled, never ran** |

So there was a real gap roughly 07:48 → 14:00 during which branch pushes got no runs. **Actions then
recovered and gated 606–608 and 609 properly.** Only **610** is genuinely ungated.

**And 610's red is not a code defect.** The job's conclusion is **`cancelled`**, not `failure`, with
`runner_id: 0` and an empty runner name — queued 19:27:20, killed 19:42:24, exactly fifteen minutes,
never assigned a runner. A second session saw its own run fail identically at the same minute on a
different branch. **`get_job_logs` returns "No failed jobs found" for it, which is the tell**: a run
whose conclusion is failure but which reports zero failed jobs did not execute. Do not go looking for
a broken assertion in 610 — there isn't one. Re-running the workflow is the fix; if it cancels again
after ~15 minutes it is runner availability or quota, not the repo.

**The lesson, which this file already teaches and I still got wrong four times running:** an outage is
an observation with a timestamp, not a standing fact. I checked once at 09:00 and then asserted
"Actions is still down" at 14:00, 15:58, 18:57 and 19:00 without re-measuring. **Re-check before
repeating any claim about live infrastructure** — the same rule this document applies to build numbers
and doc staleness applies to CI.

**Follow-up, measured 00:20 UTC — 610 IS gated, directly, and the note above needed the same
treatment it prescribes.** Actions recovered on its own.

**Run #902 attempt 2 ran build 610 itself and passed.** Re-queued 22:54, it sat about sixteen
minutes, picked up runner `1000000938` at 23:10:55 and went green at 23:11:05 — `head_sha`
**`5fa7889`**, all twelve steps (Vercel-safe filenames, ESM in `api/`, `index.html` not truncated,
every inline script parses, structural balance, `sw.js`, every API function, JSON validity, VAPID
key match). Nothing inferred: the gate checked out the exact commit.

Run **#903** (`main` @ `b7456b7`) independently confirms it, and is worth keeping because the
reasoning generalises: `b7456b7` is a descendant of `5fa7889` differing only in
`spark/ORIENTATION.md` and `spark/RECOVERY_602.md`; **`check.yml` contains zero references to
`spark`**, and `index.html` hashes identically on both
(`98c8624f89a636bbf8daabd228b0595485437e91`, still live on `main`). A green run on a descendant
gates an ancestor whenever every file the workflow reads is unchanged between them.

So **"only 610 is genuinely ungated" was true at 22:50 and false by 23:11.**

**⚠ And the first draft of this very note was wrong too — corrected before it merged.** It said
`rerun_workflow_run` on a stale run "can sit queued indefinitely" and advised preferring a fresh
push. **It cannot and you should not.** The re-run worked; it was queued, not stuck. Two reading
errors produced that claim, and both are worth knowing:

- **A run's top-level `status` lags its job.** At 23:10:59 the run list still said `queued` — the
  job had been created at 23:10:53, six seconds earlier. **Read `list_workflow_jobs`, not the run's
  `status` field**, when you need to know whether work has actually started.
- **Queue latency was 16–28 minutes that night**, on a repo where runs normally start in seconds.
  `b7456b7` pushed 22:35, ran 23:03. #902 re-queued 22:54, ran 23:10. **Neither an absent run nor a
  `queued` one is evidence of failure** — it is evidence you measured too early.

That is now **four** stale-infrastructure claims in one evening: the original outage, its repeat
across three builds, "only 610 is ungated", and this one. The pattern is always the same — a
correct observation restated later as a standing fact. **Timestamp the reading, or don't make the
claim.**

---

## `studio.html` — the Private gallery, "Atlas" (2026-08-06)

**No build number.** `studio.html` carries no version label and is not part of `index.html`'s app
stamp, which stays where build 610 left it. No SQL — `studio_private` and `studio_private_events`
were already applied, with `owner_email = my_email()` on USING *and* WITH CHECK, verified on the
live database before a line was written.

- Studio gains a `WORK / PRIVATE` switch. Work mode is **byte-for-byte unchanged** in behaviour —
  Atlas is the Private experience only, so the whole Work path carries no regression risk.
- One rail, three lenses (Time / Places / People); each accent names a lens, red is spent only on
  the Private pill. `GRID | EVENTS` is a density toggle. Light is a token twin, resolved before
  first paint.
- Private is **unreachable on `showroom.*` and under `?vision=1`** — switch hidden, mode forced
  back, and `display:none` in the markup so a script failure fails closed.
- ⚠ **Inline style beat the stylesheet again.** `showApp()`'s `appView.style.display='block'`
  outranked `#appView.priv{display:grid}`; the rail went full-width and the main column vanished.
  **The gate passed it** — `getComputedStyle` reports `grid-template-columns` on a `display:block`
  element, so a token-level assertion is not proof a layout is alive. Caught only by a rendered
  screenshot. Gate now asserts computed `display` plus real geometry.
- ⚠ **Three gate reds were the test's fault, not the app's** — a fixture miscount (Ava is in three
  rows, not two), avatar arithmetic (2+1+2=5, not 3), and a hardcoded dark accent when Playwright's
  default context is light. Fixed the assertions; the accent check now asserts the right token for
  the active theme, flips, and asserts the other.
- Verified: 45-assertion Chromium harness across 11 sections (real hostnames via route
  interception, since the whole safety rule keys off `location.hostname`) · negative control fails
  against both the pre-Atlas and the origin/main file · patch reproduces byte-for-byte · contrast
  computed for both themes.
- **Not verified against real data:** both tables are 0 rows. Fixtures match `information_schema`
  column-for-column and nothing more. Places and Events render honest empty states until the
  Spark-side pusher exists.

## 611 — notifications actually reach you (2026-08-06)

Three silent failures stacked on one feature. Found from a screenshot, not from reasoning.

- **The Enable button could never succeed on a phone that had enabled before.** A
  `PushSubscription` made with a different `applicationServerKey` makes `subscribe()` throw
  `InvalidStateError`, and every device that subscribed before **608** corrected the VAPID key
  holds exactly that. **`getSubscription` and `unsubscribe` appeared ZERO times** in `index.html`
  and `sw.js` — nothing ever cleared it. Both subscribe paths now drop the old one first.
- **The My Profile button wrote `push_subscriptions`**, which `api/notify.js` never reads, then
  said *"this device now gets Cardinal alerts."* It writes `push_subs` now. A lie is worse than
  an error.
- **`notifyTeam()` posted `{to, subject, html}` while `/api/notify` read `{emails, title, body,
  url}`.** `emails` was undefined on all **seven** call sites, so the route hit
  `if(!emails.length)` and answered `{ok:true, sent:0}` — a 200, so nothing ever surfaced. The
  payload is canonical now, and the route accepts either shape.
- **`/api/notify` now sends email as well as push**, through the same Resend account
  `api/digest.js` already proves is live. `notifyTeam`'s own comment always called itself "team
  email"; it finally is one. Best-effort — no `RESEND_API_KEY` means `mailed:0`, which is the
  old behaviour rather than a failure, and push is never blocked by it.

Verified: `check_build.py` green (105 scripts, stamp 610→611, marker `pushManager.getSubscription()`
present and **absent from prev**) · 21-assertion Node harness against the **shipped** `api/notify.js`
with `web-push` stubbed and every fetch intercepted · 19-assertion Chromium harness running the
**extracted shipped source** of both subscribe paths against a mock that reproduces the browser's
real `InvalidStateError` rule · both patches reproduce byte-for-byte.

**The negative controls are the proof.** Against 610 the route harness returns
`{"ok":true,"sent":0}` on the `notifyTeam` shape — the silent no-op, reproduced — and the client
harness emits *"Provided applicationServerKey does not match the key in the existing
subscription"*, which is Theo's screenshot verbatim.

⚠ **A vacuous assertion nearly shipped.** "queried push_subs for BOTH recipients" **passed against
the broken handler**, because a ternary returned `true` whenever the query count wasn't 1. Caught
by reading the negative-control output rather than trusting its exit code. Tightened.

**Still owed, and not a build:** every phone must press Enable once more. Two subscribe paths
remain (`enableNotifications()` and `#pushEnableBtn`); consolidating them is a follow-up, not done
here to keep the diff on a live fix small.

## 612 — the notification path stops lying (2026-08-07)

611 fixed three causes of silent notification failure. It did not fix the
**reporting**, and within an hour that cost an evening: a tagged message said
"🔔 Notified Theo Dorion", nothing arrived, and there was no way from inside the
app to learn why. Everything I could inspect from outside was sound — valid
subscription, matching emails, permissive RLS, a working `sw.js` push handler,
both phones on 611 — which left only the inside of the Vercel function, where I
cannot see.

- **`api/notify.js` discarded every send error except 404/410.** A push refused
  with **401/403** — the signature that says `VAPID_PRIVATE_KEY` no longer pairs
  with `VAPID_PUBLIC` — returned `{ok:true, sent:0}`, identical to no push at
  all. It now counts `sent / failed / gone / mailed / subs` and names the cause:
  `vapid_mismatch`, `push_rejected`, `no_subscriptions`, `subscriptions_expired`,
  `subs_query_failed`, `resend_missing`, `email_failed`, `no_recipients`.
- **A non-array Supabase response** returned `sent:0` and looked like "nobody is
  subscribed". Now `subs_query_failed`, with the database's own message.
- **`env: { vapid_from_env, resend }`** — booleans only, so the one question I
  could not answer from here ("is the key actually set in Vercel?") is answerable
  from the app. **The gate asserts neither secret ever appears in the response.**
- **`notifyTeam()` had an EMPTY `.catch()`** and returned nothing. It now resolves
  to the route's report and still never throws, so callers may ignore it.
- **Both "Notified" lines were drawn beside the send, not after it** — the chat
  thread and the punch discussion. Both now await the outcome and print it
  through one shared `notifyOutcomeText()`, red when nothing was delivered.
  One implementation, for the reason 607 gave: a second copy is the duplicate-
  pipeline bug this project keeps paying for.

Verified: `check_build.py` green (105 scripts, stamp 611→612, marker
`notifyOutcomeText` present and absent from prev) · **26-assertion** Node harness
on the shipped route covering every reason string, including that a 401 is
reported and that neither secret leaks · **12-assertion** extraction test on the
shipped `notifyOutcomeText()` proving a failure never renders the word
"Notified" · 611's own route and client harnesses both still pass · both patches
reproduce byte-for-byte.

**The negative control is the finding.** Against 611's route, a push rejected
401 returns `{"ok":true,"sent":0,"mailed":0}` — the exact silent success that
made tonight undiagnosable.

⚠ **This build diagnoses; it does not repair.** If the cause is a wrong
`VAPID_PRIVATE_KEY` in Vercel, 612 will say so in plain words and the key still
has to be fixed by hand.

---

## Build 613 — the password reset link finally works (7 Aug 2026)

`index.html` only. **No SQL.** Prompted by six failed attempts to rotate one
password on the night of 7 Aug — the app said nothing, showed nothing, and
looked healthy throughout.

**Forgot password has never worked for anyone**, and the failure was silent at
every layer. Two independent faults:

- **`boot()` read `location.hash` AFTER `await sb.auth.getSession()`.** That
  await yields, and while it is pending the rest of the document parses —
  including the history block ~29,500 chars further down **inside the same
  `<script>` block** (595207–1570820, zero script tags between), which rewrites
  any unrecognised hash to `#h`. By the time `boot()` resumed,
  `#access_token=…&type=recovery` was already gone, so the check was always
  `-1` and the "enter your NEW password" prompt could never fire.
  Same class as **448–449**: another module strips a value within a second of
  load and every late consumer sees nothing.
- **The rewriter should never have eaten it.** `type=recovery` now joins the
  skip list. `__tryRestoreFromHash` matches a fixed pattern list and ignores a
  recovery fragment, so preserving it has no navigation side effect — checked,
  not assumed.

Fix 2 alone would suffice today; fix 1 is what stops the next module that
stomps the hash from silently re-breaking it.

⚠ **The redirect half is NOT code.** The Supabase project must list
`https://app.cardinalroster.com/**` under Redirect URLs or GoTrue falls back to
the Site URL — which was still `localhost` from the dev project, so every reset
email in the app's history landed on a dead page. Theo set that on 7 Aug. The
app's own `resetPasswordForEmail(email, { redirectTo: location.origin })` was
always correct and was being overridden by the missing allow-list entry.

Verified: `check_build.py` green (105 scripts, 108/108 script tags, 117/117
style tags, stamp 612→613, marker `__bootHash` present and **absent from prev**)
· **22-assertion** Chromium harness running the **shipped** `boot()` IIFE and the
**shipped** rewriter line, both extracted by brace-matching · patch reproduces
byte-for-byte · diff is 16 lines across exactly four regions.

**The negative control found a bug in the gate, not the app** — and that is the
entry worth remembering. The first harness put `boot()` and the rewriter in two
separate `<script>` tags. Between script elements the HTML parser runs a
microtask checkpoint, so `boot()` resumed *before* the rewriter ran and **build
612 passed as fixed**. In the real file both sit in one block with no checkpoint
between them. A harness that splits them validates fiction. Recorded in
`BUG_CLASSES.md`.

---

## Build 614 — the Sites lens, and a Bin you can undo (7 Aug 2026)

`studio.html` + `.github/workflows/check.yml`. **Two SQL files, both applied
first:** `studio_archive.sql`, `studio_site_facets.sql`.

Theo: *"The 66000 photos only 20% are useful most likely. I need to be able to
delete by address tho as some were inspections I never got the bid on."*

**Two measurements shaped it, both taken before any design:**

- **The WORK library has better facet data than Private, and was running the
  lesser UI.** `project_address` 100%, `captured_at` 100%, 756 distinct sites,
  678 with 10+ photos. The tag chips it browsed by offer **three values in
  total** — `close-up` 20,836, `wide` 8,362, `aerial` 51. The Atlas rail was
  Private-only; it earns its space in Work more. `.rail2` is the layout class,
  `.priv` stays the room, and they are never both on.
- **The ask says delete; the reason is signal.** 9.57 GB costs nothing. So
  stage one archives — reversible, no confirm, because pruning 200 dead
  inspections has to feel cheap. Permanent deletion is deliberate and is **not
  in this build**. CompanyCam is still running, confirmed by Theo, so the
  originals survive regardless.

**Referential safety, checked before designing:** `studio_findings` (0 rows,
CASCADE) and `studio_events.cover_id` (0 rows, SET NULL) are the only FKs, and
`showcase_pairs` points at `showcase/` **copies** rather than studio originals.
Deleting a work photo cannot break a published before/after.

**Why an RPC.** PostgREST has no GROUP BY, so grouping in the browser meant
pulling all 60,503 rows (~5 MB) every time the rail drew.
`studio_site_facets()` returns **756**. `security invoker`, so
`is_cardinal_admin()` still applies and a non-admin gets an empty set rather
than every address Cardinal has worked. `live_photos` and `binned_photos` are
counted separately so a half-failed restore shows as a split, not as one state.

**`--stu-ink3` is below the contrast floor in both themes** — 4.01:1 dark,
3.57:1 light, against 4.5:1 for body text. Pre-existing, not introduced here.
The job-name line uses `ink2` (7.27:1 / 4.55:1). Computed, not eyeballed.

**⚠ studio.html had NO CI coverage at all.** Every step in `check.yml` names
`index.html` explicitly, so a broken Studio deployed green. Added here: inline
scripts parse, CSS/div/script balance, truncation guard.

Verified: 26-assertion Chromium gate on the **shipped** `streetOf`, `jobLine`,
`applyLens`, `buildQuery` and `setArchived`, all extracted by brace-matching ·
18-assertion **render** gate driving the real page with Supabase stubbed,
measuring geometry and both themes · patch reproduces byte-for-byte · negative
control confirms 613 has none of it.

**Three defects were caught before shipping, two of them mine and one only
visible by reading the call path:**

1. `.is('archived_at', undefined)` on the restore path — the two directions
   need different **operators** (`.is(...,null)` vs `.not(...,'is',null)`), not
   one operator with a swapped argument.
2. `paintChip()` early-returned outside Private, so Work would filter to one
   address and nothing on screen would say which.
3. **`applyMode()` is only called from `setupMode()`'s showroom branch.** The
   normal path just wires listeners. That was fine while the rail was
   Private-only — Work genuinely wanted `display:block` and no rail. With a
   Work rail, the Sites lens would not have appeared until you toggled to
   Private and back. `showApp()` now calls it explicitly.

The render gate also had a defect worth recording: its "dark" pass rendered
**light**, because Playwright's default `colorScheme` is light and Studio's
toggle seeds from the OS preference. A pass merely NAMED dark proves nothing —
it now stamps the attribute and asserts the body background actually moved.

---

## Build 614b — the false `aerial` tag, and orientation (7 Aug 2026)

`studio.html` + `studio_tag_repair.sql` (**applied**).

**Theo found a real bug by reading the UI:** *"Aerial is literally the job
Aerial and not Aerial photos."* Measured before touching anything:

| | |
|---|---:|
| photos tagged `aerial` | 51 |
| ...whose address contains "Aerial" | **51** |
| ...anywhere else | **0** |
| photos at Aerial-named streets | **51** |

Every one came from `2805 Aerial Ave, Dayton` or `2805 Aerial Dr, Kettering`.
The tag was derived from the STREET NAME and contained no aerial photography at
all, so it was **deleted rather than renamed** — there was nothing to rename it
to. `close-up` (20,836 / 715 addresses) and `wide` (8,362 / 377) were checked
the same way and ARE real: 366 sites carry both, which is classification
behaviour rather than an address artifact. Left alone.

**Orientation is a CHIP, not a lens** — a deliberate reversal of what was first
proposed. Lenses are mutually exclusive: choosing one clears `st.sel`, so an
Orientation lens would deselect the site being viewed. Chips stack, and the
useful question is *"landscape photos at 120 Cross St"*. It is also free:
`width`/`height` are set on all 60,503 rows, so `orientation` is a STORED
GENERATED column — needed because PostgREST cannot filter an expression
comparing two columns, and doing it client-side would break `.range()`.
landscape 39,650 · portrait 20,842 · square 11.

`st.orient` is deliberately NOT part of `st.tags`: that array feeds
`.contains('tags', …)`, and `'landscape'` is not in that column — mixing them
would have returned zero rows silently.

Verified: 11-assertion gate on the shipped `buildQuery` including that
orientation **stacks** with the Sites lens and the Bin rather than replacing
them, and never leaks into the tags filter · 614's own 26-assertion gate and
18-assertion render gate both still pass · reproduces byte-for-byte · negative
control confirms 614 lacks all of it.

### ⚠ The tagging vocabulary already exists — do not build a new one

Chasing *"a lot more options we could filter with"* nearly produced a fresh
vision pipeline. It is already built and shipping, just never pointed at
`studio_photos`:

- **`api/organize.js`** — 6 report sections, including **4 "Aerial Roof
  Overview (drone/overhead shots)"**, which is the genuine article the broken
  street-name tag was pretending to be.
- **`api/sortphotos.js`** — emits `section` + `caption` + `severity`
  (crit/warn/ok) + `trade` (roof/siding/windows/andersen/gutters/general) per
  photo, capped at MAX_PHOTOS = 24 per call.
- **`api/detect.js`** — a **31-key `DEFECTS` vocabulary** (hail_impact,
  wind_lifted, granule_loss, flashing_failed, … interior_water_damage) with
  located boxes and the same crit/warn/ok scale.

That is **46 filterable values already in shipping code**, against the 2 real
tags Studio has today. Roof colour is the only genuinely new field.

**Sequencing, and it is the whole cost argument:** Theo estimates ~20% of the
library is useful. Tag AFTER pruning. Analysing 60,503 photos costs five times
what analysing ~12,000 costs, and four fifths of it would be spent on photos
about to be archived.
---

## SQL — `itel_lab_reports`, a register of ITEL determinations (7 Aug 2026)

**APPLIED to production.** No build number: SQL only, no `index.html` change.
PR #144. Revert is in `itel_register.sql`.

Theo sent 36 ITEL lab report PDFs across the session — **29 distinct control
numbers, Dec 2020 to Jun 2026**, out of two Gmail accounts. Parsed from the
documents with `pypdf`, not from the subject lines, which carry only the
insured name and the claim and control numbers.

### Why a new table and not a wider `itel_reports`

`public.itel_reports` was modelled as a child of a live claim — `claim_id uuid
NOT NULL` against `insurance_claims`, which has 3 rows. Every historical report
predates all of them, so **not one of the 29 could be recorded at all.** It is
left alone as the per-claim sample tracker; a determination outlives the claim
that paid for it, so `claim_id` is nullable in the new table.

### `discontinued boolean` is the wrong column, and this is the finding

Only **12 of 22** reports in the first pass say "discontinued" at all, and those
split four ways. ITEL prints **seven distinct status sentences**, and the
sentence *is* the verdict — so it is stored verbatim beside a seven-value code:

| verdict | ITEL's words | n |
|---|---|---:|
| `no_match` | "No matches were found in our national search." | 2 |
| `unreservable` | "…a sufficient quantity of the color could not be reserved" | 2 |
| `salvage_only` | "…may be available through Discontinued Materials, Inc." | 2 |
| `similar_only` | "…however, similar matches were found" | 3 |
| `match_available` | "…matching products are available" | 5 |
| `unidentifiable` | "the exact original manufacturer…could not be determined" | 3 |
| `in_production` | "The original product is available; see Match 1" | 4 |

`RRS9991577` and `RRS10131363` both add *"there are no products on the current
market with a color that would be considered similar"* — the direct negation of
Ohio Admin. Code **3901-1-54(I)**, which asks only for a *reasonably comparable
appearance*. Those two are the strongest documents in the set and nothing in the
app knew they existed.

### ⚠ The comments can outrank the status sentence

`RRS18995984` (Dunwiddie, Jun 2026) carries the *weakest* discontinued verdict,
"matching products are available", yet its comments fire both breaks at once —
no substitute at the same warranty, **and** "the submitted sample is an English
dimension shingle. The current product available in the region of the claim is a
Metric dimension shingle." CertainTeed Landmark English 36×12 against Landmark
AR Metric is a real size break wearing a weak verdict.

So ranking on `verdict` alone files a strong case as no-argument. The breaks are
separate flags — `warranty_break`, `dimension_break`, `profile_break` — and they
are what a strong-case query sorts on. The reverse is recordable too:
`SRS17995353` has ITEL saying an extruded-vs-post-formed nail hem *"does not
affect the panel visually."* A difference the lab itself calls invisible is not
a break.

### Two things the old schema could not hold at all

- **Asbestos.** `SBS7898800` (2021) and `SBS18608459` (2026) both came back
  **POSITIVE, chrysotile 20.00%, Transite** — every fiber-cement siding sample
  ever submitted, two for two. That outweighs any matching question on the same
  job and there was nowhere to put it.
- **Who ordered it.** Through 2024 Cardinal pre-paid every test. In 2026 the
  **carrier** orders it — Erie, USAA, Grange, Allstate and Nationwide each
  appear as the ITEL customer with their own ID and adjuster, Cardinal listed
  only as vendor contact. A carrier is poorly placed to dispute a lab report it
  commissioned, so `ordered_by` / `ordered_by_name` make that filterable.
  `RRS17850254` is not Cardinal's job at all: Nationwide ordered it through
  Hancock Claims and forwarded it, already decided — in production.

### `itel_product_register` — why the view earns its place

Keyed by product. **Tamko Heritage English appears 5 times** across three
colours and two verdict classes. **OC Oakridge Pro 30** twice, ten months apart,
same match both times. And **CertainTeed Landmark AR Metric in Weathered Wood
was tested three times** — 2021, 2022, 2026 — coming back *in production* every
time, at roughly $143–167 a test.

**`security_invoker = true` on the view is load-bearing.** A view defaults to
the owner's privileges and would have read straight past the RLS below it,
handing every insured name and loss address to any caller. Caught before apply;
the security advisor reports no new warnings.

### Verified

38 columns · RLS enabled · 2 policies (`select` to authenticated so production
can read a determination to argue a supplement, `all` gated on
`is_cardinal_admin()` so they cannot change one) · 5 indexes · view runs
security-invoker and is selectable · `public.itel_reports` untouched at 0 rows ·
`get_advisors(security)` reports nothing new.

### Still open

The Same / Similar / Different tick marks in ITEL's comparison grid are drawn
inside form XObjects and are **absent from the PDF text layer** — an early pass
mistook the supplier bullet glyphs for them (5 suppliers → 5 marks, 2 → 2).
Every other field is quoted from the document. The 29 reports are parsed but
**not yet loaded**; the table is empty.

Four ITEL accounts seen: `ANDS0001` (Andrews Services), `CUST0004` (Cardinal
through 2024), `CUST0003` (Cardinal, current), plus one per carrier. A full
history pull from ITEL needs all three Cardinal-side IDs.

---

## Company letterhead — a Word template in `brand/` (7 Aug 2026)

PR #74. **Not an app build** — `index.html`, `api/` and `sw.js` are untouched, no build number was
bumped and no `CHANGELOG` entry was added. That is deliberate: build numbers are the app's ordering
record and inventing one for a document would corrupt it. Logged here anyway so that "where did
`brand/` come from?" has an answer.

`brand/Cardinal_Letterhead.docx` (editable), `Cardinal_Letterhead.pdf` (rendered),
`letterhead.js` + `fix_field.py` (the generator), `cardinal_doc_logo.png`, `README.md`.

**Nothing was typed from memory.** The logo is the `cover-logo` data URI `index.html` already embeds
in estimates and contracts (1100×647, byte-identical across both of its occurrences). The address
came from `api/estimate-to-contract.js`, the phone and email from the `api/share.js` print footer,
and the footer strip is the same string `api/share.js` prints on shared documents. **Those files
stay the source of truth** — this folder is a copy, so a phone-number change has to be made there
too.

`brand/` is in `.vercelignore`. A blank letterhead is the raw material for forged correspondence.

### `fix_field.py` is a required build step, not a nicety

docx-js writes the page-number field as `begin`/`instrText`/`separate`/`end` inside a **single**
`<w:r>` with **no result run**. Word and LibreOffice both then regenerate the field result with
default formatting, so a page number styled 8.5pt grey renders large and black. The script rewrites
it as five properly-structured runs that each carry the original `rPr`, including a result run.
Skip it and the continuation header is visibly wrong.

### The regex that ate the header — this file's own rule, re-learned

The first version of `fix_field.py` matched `<w:r>(<w:rPr>.*?</w:rPr>)?…` with `re.S`. The `.*?`
inside the optional group is **unbounded** and crossed a run boundary: it matched from the
*company-name* run, swallowed everything up to the field's `</w:rPr>`, and emitted that text five
times across the header. "Recon regexes need bounds" caught exactly as described. Fixed by bounding
the run to `((?:(?!</w:r>).)*?)` so it cannot span `</w:r>`, and by making the script **print what
it captured** (`instr='PAGE'` plus the rPr) before trusting it.

### Verified

Rendered the actual `.docx` through LibreOffice and looked at it — not inspected as XML and assumed.
A forced two-page variant proved the continuation header, which is what surfaced the field defect;
a zoomed crop confirmed the red-over-black rule sits tight enough to read as one roof edge. Schema
validation passes (`scripts/office/validate.py`, 19 paragraphs).

**Note for the next session:** LibreOffice Writer is **not installed** in the build sandbox by
default — only a partial LibreOffice, missing `libswlo.so`. Every conversion fails with
"source file could not be loaded", for `.txt` as readily as `.docx`, which reads like a corrupt
document and is not one. `apt-get update && apt-get install -y libreoffice-writer` fixes it.

### Still open

**Whether `brand/` is actually excluded from the deploy is unproven.** `curl` gets a 403 from the
egress proxy and `WebFetch` returns `EGRESS_BLOCKED` for `app.cardinalroster.com` — and both fail
**identically for the control**, `/docs/Cardinal_Roofing_Contract.pdf`, which is deliberately public
and must return 200. A probe whose control fails proves nothing in either direction. The entry uses
the same `dir/` form as `.claude/`, `spark/` and `.github/`, which are known-good on this deploy, so
the reasoning is strong — but it is reasoning. Closing it needs one request from outside the
sandbox, run **with** the control, since a bare 404 could also mean the deploy had not finished.

---

## OC Colors — the schema half (PR #148, 7 Aug 2026)

Six migrations, all applied to production **before** the merge, all idempotent. **No app change
went with them** — `index.html`, `api/` and `sw.js` untouched, no build number bumped, and `*.sql`
is vercelignored, so merging changed nothing for a user. Listed in run order:

| File | What |
|---|---|
| `oc_color_covers.sql` | `slug` (**generated always** from `name`), `cover_image_path`, `cover_credit` |
| `oc_coty_year.sql` | `coty_year` + a partial unique index — one Color of the Year winner per year |
| `oc_williamsburg_gray.sql` | the 2024 COTY, which had no catalogue row |
| `oc_peppercorn.sql` | the other missing colour |
| `oc_discontinued_fix.sql` | five colours wrongly marked `current` |
| `oc_colors_hidden.sql` | `hidden`, so a colour can exist without being offered |

Catalogue after: **31 colours · 30 on the wall · 20 sellable · COTY 2017–2026 with no gaps ·
`hex_verified` false on every row.**

### `hidden` is not `status`, and that distinction is the point

Theo, verbatim: *"But they should still have a spot. I still would like a spot for them except for
Shasta white."* So **discontinued colours keep their spot on the wall, badged** — Cardinal has been
roofing for years, and an owner with a twelve-year-old roof has to be able to find their colour,
as does a rep matching a repair. `hidden` removes the spot entirely without destroying the row, so
history and any job referencing the colour still resolve. One row is hidden: Shasta White.
**A query that filters on `status` alone puts Shasta White back on the tablet.**

### Two corrections from Theo, and the second one is the lesson

**"Please don't list Lowe's they mix batches."** `oc_williamsburg_gray.sql` had cited a big-box
stock listing as evidence the colour was still current. Shingle colour varies between production
batches, so a retailer's stock says nothing reliable about what a customer would actually receive —
citing one in a showroom context invites a mismatched roof. The citation was removed from the file
**and from the pushed commit message** (`66ec14c` → `49e6ce9`, force-with-lease), because a
reasoning left in history is a precedent the next session copies forward.

**"Those are all colors that have been discontinued"** — Amber, Harbor Blue, Quarry Gray, Shasta
White, Sierra Gray, all sitting as `current`. This is the more dangerous direction of the two
errors: a discontinued colour shown as current puts a rep in front of a customer selling something
Cardinal cannot order, and it surfaces at order time, after the pitch.

**The signal was there and was read backwards.** Those five were the *only* colours that could not
be found in any of the four Owens Corning books supplied that day. That was chased for several
rounds as a gap in the source material. It was not a gap — current marketing books do not carry
dead colours. Worth keeping as a heuristic and **not** as a rule: three discontinued colours
(Bourbon, Summer Harvest, Storm Cloud) *do* appear in the Designer books, which carry some legacy
palette. Absent from the books suggests discontinued; present in one proves nothing at all. Ask.

---

## Build 615 — the Owens Corning colour wall, on the Vision hub (7 Aug 2026)

PR #149. The front-end half: `<style id="cr-occ-styles">` + `<script id="cr-occ-script">`,
`window.CardinalColors`, full-screen `#cr-occ`.

**It enables a tile that already existed.** `visionHtml()` in `cr-lr-script` has rendered a Colors
tile since build 593 as `class="cr-vh-tile soon" aria-disabled="true"` with a "Soon" badge, and
`wire()` already had the dispatch pattern for `showroom` and `library`. This build turns the div
into a button with `data-go="colors"` and adds one case beside them — **no new surface, nothing
duplicated.** An hour was nearly spent building this as a new top-level overlay in the main app;
Theo's question — *"links back to vision? or does resources link to vision"* — is what caught it.
The prime doctrine, again: the mount point was already in the file.

Registered in all three registries a `fixed; inset:0` view needs — `hideAllViews()`, `OVERLAY_IDS`,
`PANES` — and it is **display-shown**, so `display:none` is the correct lever. Writing a class
instead would leave it covering the next screen (the 570–572 class). Palette is `--occ-*`, Blackout
like `#cr-show`, **every reference carrying a literal fallback** (the Crews/Showcase pattern), so
448–449 cannot repeat here. **Zero new global scroll-lock writers** — still 13.

**614 was already taken** by the `studio.html` work earlier the same day (`Build 614` and `614b`
above). `next_build.py` reported 614 free because it scans the app stamp, and that build never
touched `index.html`. **Known blind spot: the script cannot see builds that ship outside
`index.html`.** Stamped 615.

### Verified

`check_build.py` green and negative-controlled. **jsdom harness 27/27 against real `oc_colors` row
shapes**, not fixtures — the `hidden` filter, Shasta White absent, Storm Cloud present, the
cover-vs-swatch fallback, the unverified label, badge logic, the cover/our-roofs separation, the
`hideAllViews` close, and no 14th scroll-lock writer. **Chromium `elementFromPoint`** confirms the
tile is genuinely hit-testable at 420×74 — not the invisible-but-present render that killed the
Vision hub at 593, and clear of 592's 44px floor.

**Screenshots do not render in this sandbox** (webfonts hang), so nobody has seen it. Theo's eyes
are the gate for how it looks; the harness proves structure only.

---

## OC Colors — `cover_image_path` set on 22 covers (7 Aug 2026)

`oc_color_covers_set.sql`. Data only, applied to production. This is the statement that makes the
wall stop rendering 30 hex swatches and start rendering Owens Corning's roofs.

**The path convention is flat — `oc-colors/covers/<slug>.jpg`.** One folder, 23 files, one drag.
The original plan was `oc-colors/<slug>/cover.jpg` and was changed because uploading through the
Supabase dashboard means creating each folder by hand. ⚠️ **The README inside the cover-image zip
still names the old path**, as did PR #149's description until it was corrected — the flat one is
what is live. The filename is the row's `slug`, which is `generated always` from `name`, which is
exactly why no lookup table is needed and why JS must never recompute a slug.

**`where exists` is the safety, not decoration.** A colour only gets a path if the file is actually
in storage. A path pointing at nothing is *worse* than no path: the `<img>` fails and the card
renders empty, instead of falling back to the hex swatch with its "Approximate colour — not a
verified swatch" label. Empty tells a customer nothing; the labelled swatch at least tells the
truth. The `is distinct from` clause makes it idempotent, so it is simply re-run as more covers
land.

**Run twice, and the second run is the proof.** The first set 22 rows; 23 of 23 covers had been
sent but only 22 reached storage. Mountain Pine — `new`, therefore sellable — was the missing one,
and it was **in the zip all along** (verified rather than argued: 1400×933, 257,329 bytes, sha256
`08cc05fd…`, byte-identical to the working copy, listed in the zip's own README). It sits between
`midnight-plum` and `onyx-black`, easy to scroll past on a phone. Sent again on its own, uploaded,
and the identical statement re-run: **1 row, Mountain Pine only.** The other 22 were untouched,
`updated_at` included.

**Final state: 23 covers · 0 broken paths · 0 unclaimed files · 0 sellable colours on the swatch
fallback.** Every sellable colour renders a real Owens Corning roof photograph. The seven still on
a swatch are all discontinued, and that is the end state rather than a backlog.

Verified two ways that matter more than the row count: **zero paths with no file behind them, zero
uploaded files no row claims.** The second catches a typo'd slug — which a row count alone passes
straight through.

---

## Build 616 — Colors opens on the shingle lines, not one long wall (7 Aug 2026)

Theo, after seeing 615 on the tablet: *"can we section off what's discontinued or tab it"* — then,
asked which, he described something larger and better: *"What I had envisioned. When clicking oc
colors, 3 options. Duration, Oakridge, Discontinued. In Duration, a filter with Designer or a tab.
A description in the duration page first of what makes it better. Description in oakridge. I think
even an oc supreme section within colors. When selling I can show the differences in each where
supreme has the worst wind rating."*

So the flat wall became a **line picker**: Duration · Duration FLEX · Oakridge · Supreme ·
Discontinued. FLEX is its own page on his pick. It shares Duration's palette — his own words on the
FLEX brochure, *"The is flex but the color is the same"* — so both lines `match` the same catalogue
rows rather than duplicating data.

### The rule this build exists to hold: no spec figure that isn't sourced

Duration's and FLEX's numbers are quoted from the Owens Corning books he supplied, and each page
**names the book underneath the table**. 130 MPH, Class 3 / Class 4, Class A fire, ASTM D3161 F and
D7158 H, the 25-year StreakGuard term — all off pages 614–656 of the Duration Beauty Book and the
FLEX brochure.

**Oakridge and Supreme ship as "Coming" tiles that cannot be opened.** Owens Corning's own site is
blocked by the sandbox egress proxy, and a web search returned contractor blogs and big-box
listings — *the same weak sourcing Theo threw out on Williamsburg Gray* ("Please don't list Lowe's
they mix batches"). The figures looked right and matched what he said about Supreme, which is
exactly why they were dangerous. He is supplying the real ones.

The guard is mechanical, not a good intention: `patch616.py` asserts that **no `\d+ MPH`, `\d+ year`
or impact class appears anywhere inside the two unsourced `LINES` entries — comments included** —
and the jsdom harness re-asserts it against the rendered tiles. A wind rating read aloud to a
homeowner is close to a warranty claim.

⚠️ **One figure to handle carefully when Oakridge lands**, recorded in the module so it is not lost:
its wind rating is reported as **conditional** on OC starter plus **six** nails rather than four. If
that holds, the page has to say so. A rep quoting the higher number on a four-nail roof is stating
something false about a warranty.

### Two levels became three, so the module was rewritten rather than patched

`hub → line → colour`. The back button now steps one level at a time and only closes from the hub.
Nine interlocking edits would have risked a half-applied nav — the 570–572 class with extra steps —
so the whole `cr-occ-script` block was replaced in one asserted splice.

State is two classes on `#cr-occ`: none = hub, `.line`, `.detail`. **`.detail` sits on top of
`.line`** (a colour is always opened from a line), so the `.detail` rules carry an extra class and
**out-specify** the `.line` ones rather than relying on source order that a later edit could quietly
reverse. `:not(.line):not(.detail)` hides the grid at the hub.

### The bug a harness could not have found

The card's sub-line was a binary — `designer ? 'Designer Collection' : 'TruDefinition Duration'` —
so the **five rows carrying `product_line='other'`** (Slate Grey, Aged Cedar, Desert Tan, Summer
Harvest, Bourbon) were every one of them labelled **TruDefinition Duration**, a product claim
nobody ever recorded. Inherited from 615 and invisible there because they were scattered through
thirty cards; on the Discontinued page all five sit together. **Found by rendering the module and
looking at it**, not by any assertion. They now read "Owens Corning" and stop. `lineLabel()`.

That is the third time on this project a rendered screenshot has caught what a green gate did not —
`styleMounts()`'s inline white, `showApp()`'s inline `display:block` in studio.html, and now this.

### Verified

`check_build.py` green and negative-controlled. **jsdom 39/39** against real row shapes, walking all
three levels of the back button in both directions. **Chromium 20/20** on the CSS state machine —
including that `.detail` really does out-specify `.line`, which is the one thing the whole stylesheet
block is shaped around — plus 592's 44px floor and no horizontal overflow at 390px. Then the shipped
module was **rendered against the live `oc_colors` rows and the real cover images** at 430×932 and
looked at. Theo's eyes remain the gate for whether it sells.

**Build 614 was skipped again**: `next_build.py` still reports it free because it scans the app
stamp, and `studio.html`'s 614 never touched `index.html`. It also did not see this session's own
pushed 615. Treat its answer as a floor, not an answer.

---

## Build 617 — Oakridge and Supreme go live, from Owens Corning's own documents (7 Aug 2026)

Theo: *"You've got a lot of great info within the official pdfs but I can get more if needed"* — and
sent the **Supreme Product Data Sheet (10013324)** and the **Oakridge Brochure (10024153)**. Both are
OC publications, which is exactly the sourcing 616 held out for. Both lines come off the "Coming"
list with full spec tables, each naming its file underneath.

| | Supreme | Oakridge |
|---|---|---|
| type | three-tab strip | laminated (architectural) |
| warranty | 25-Year Limited | Limited Lifetime · 40-yr commercial |
| **wind** | **60 MPH** | **110 / 130 MPH — conditional** |
| algae | 10 yr, regional | 25 yr, requires an OC Hip & Ridge product |
| non-prorated | TRU PROtection 5 yr | TRU PROtection 10 yr |
| impact | not stated | not stated |

**Supreme's 60 against Duration's 130 is the whole pitch**, and it is now quotable rather than
remembered.

### The Oakridge wind row is not one number, and the brochure says so

> ‡‡ *110 MPH is standard with 4-nail application. 130 MPH is applicable only with 6-nail application
> and Owens Corning® Starter Shingle products application along eaves and rakes.*

**The suspicion recorded at 616 was right.** It renders as a caution styled louder than the source
line and placed *above* it, and the harness asserts both the text and the ordering. A rep quoting 130
on a four-nail roof is stating something false about a warranty. **Never collapse that row.**

### Absence is not a claim

**Neither document mentions SureNail, and neither states an impact class** (`grep -c surenail` = 0 on
both). It would have been easy — and wrong — to write "no SureNail" as a spec row: 616's own build-log
entry says absence from a book *suggests* and does not *prove*. So the tables say **"Not stated in the
product brochure"** for impact, and quote OC's own words for Oakridge's nailing — *"full double layer
in the nailing zone… greater integrity and better holding power compared to shingles with single-layer
nail zones."* That is a sourced claim about Oakridge, not an unsourced claim about what it lacks.

### The guard changed shape rather than being deleted

616 asserted *no figures in the unsourced lines*. That is satisfied by them now being sourced, so it
would have been quietly dropped. It is replaced by the invariant that survives the change: **any line
rendering a spec table must name its source**, asserted at patch time over each `LINES` entry.

### Designer is a tab

Theo: *"Also tab designer series."* A collection and a shade are different kinds of choice and should
not look like the same control, so the split moved out of the chip row into its own tab strip
(`All colours · Standard · Designer Series`) with an underline indicator, above the shade chips.

### ⚠ Three assertions failed against a correct file before this landed — all the same trap

Bare counts of `ready:false` picked up **the word inside comments explaining the flag**. `== 1` failed
where the truth was 2 (one code line, one `/* ready:false ON PURPOSE */`). This is the file's own
documented counting trap, walked into three times in one patch, and the fix each time was to scope to
the declaration — `'\n    ready:false,'`.

**One of those failures was worth having.** The final guard caught the **module header comment still
claiming both lines carry `ready:false`** — stale documentation sitting in the file every future
session reads first. A hand-waved assertion would have shipped it. The fix was the comment, not the
assertion; the *last* remaining `ready:false` is prose correctly describing what the flag does, and
that one must not be "fixed".

### Verified

`check_build.py` green, negative-controlled, stamp 616 → 617. **jsdom 51/51**, including the caution's
text, its position above the source line, that Oakridge's tile never shows 130 alone, and that Designer
is a real tab rather than a chip. **Chromium 20/20.** All five screens re-rendered against live rows
and looked at.

One stale harness assertion was corrected rather than worked around: it froze Duration's spec table at
8 rows and 617 legitimately added a 9th. An assertion pinned to an old count reads as a regression when
the thing it measures is supposed to grow.

---

## Build 618 — three presentation styles for the iPad (7 Aug 2026)

Theo: *"Can you make the iPad a presentation style. Or will it look the same as my
iPhone?"* **It looked worse.** Measured on 617 at 1194px: the hub was a 760px column
pinned left with **434px of dead black** beside it, and a line page showed **no roof at
all** until you scrolled past the entire spec table.

Two fixes were rendered and rejected — *"Show me a few other options that really pop and
is professional."* Three concepts were then rendered and he was asked to pick one. His
answer was better than the question: **"What if you could filter between 3 styles?"**

| Style | Hub | Line page |
|---|---|---|
| **Roofs** (default) | five full-bleed roof photographs | pitch + specs pinned left, colours beside |
| **Compare** | each line's wind warranty as a bar to scale | same split |
| **Feature** | three-across image cards | editorial spread, full-width hero |

Switcher in the header, choice remembered in `localStorage`, **everything above 820px**.

### The phone is untouched, and it is asserted rather than hoped

The 430×932 render is **pixel-identical across all three styles** *and* **pixel-identical
to the build-617 baseline**. That single check earned its place immediately — see below.

### The hub had 23 roof photographs available and used none of them

Now it does — but only a line's **own** colours, with a fallback that also stays inside
the line. **Oakridge and Supreme have zero catalogue rows and therefore no photograph;
borrowing a Duration roof for them would be a false product claim** (the 616 `lineLabel()`
class). Their wind rating becomes the artwork instead — and on Supreme that number is the
pitch.

`chart` drives the bars. It must not become a second source of truth beside the sourced
`specs` strings, so `patch618.py` asserts **every `chart.mph` appears inside that same
line's wind row**. Oakridge draws **110 solid plus a hatched extension to 130** with the
condition written beside it — never a flat 130.

### ⚠️ Four defects, all mine, each caught by a different gate

1. **The hero leaked onto the phone.** It was an inline `background-image`, emitted
   regardless of viewport, and nothing below 820px sizes or positions one — so a phone
   tile grew a tiled roof photograph. **No structural assertion caught this. Only the
   pixel diff against the 617 baseline did.** Now a **custom property** consumed solely
   inside the media query, so the leak is impossible by construction, plus an assertion
   that no inline `background-image` is ever emitted.
2. **The board's markup reached the phone** as unstyled divs, because `hub()` emits it
   whenever the style is `compare` and all the `.cmp-*` CSS lives in the query. Hidden in
   the base sheet instead; the query turns it on. **JS stays viewport-independent** — no
   resize listener, no second opinion about what counts as a tablet.
3. **`#cr-occ[data-style="roofs"] .occ-hub{display:grid}` beat
   `#cr-occ.line .occ-hub{display:none}`** — equal specificity, later in source order — so
   the hub painted **on top of a line page**. Scoped with `:not(.line):not(.detail)` rather
   than trusting order a later edit could reverse.
4. **The split was a grid whose pitch column spanned four rows.** A spanning item feeds
   its height back into the tracks it crosses, which pushed the first roof **1161px down an
   834px screen**; `min-content` tracks did not stop it. Rebuilt on **float**, which leaves
   normal flow for sizing and composes with `position:sticky`. Old-fashioned and correct.

### The trap that was avoided rather than hit

The two-column split grids **`#occBody`, a new wrapper — not `#cr-occ`**. `open()` writes
an inline `display:block` on `#cr-occ`, and **inline beats every stylesheet rule at any
specificity**. That is the `styleMounts()` / `showApp()` trap this repo has hit three
times. Checking the base rule *before* writing the CSS is what caught it.

### One harness bug worth recording

The Chromium harness seeded `localStorage` to pick a style. `setContent` runs on
`about:blank`, where Chromium **throws** on `localStorage` — the module catches that
correctly and keeps the default, so every page rendered in the default style and the
"three styles differ" check compared three identical screenshots. It looked like a CSS
failure and was a harness failure. It now **clicks the switcher**, which is both the real
user path and immune to the origin.

### Verified

`check_build.py` green and negative-controlled, 617 → 618. **jsdom 76/76.** **Chromium
50/50** — the two phone diffs, ≥44px on every control including the switcher, all three
nav levels in all three styles, and no horizontal overflow at 820 / 834 / 1024 / 1194px.
All three styles rendered against live rows and looked at.

---

## Build 619 — FLEX shows only the colours FLEX is made in (7 Aug 2026)

Theo sent Owens Corning's **Duration series comparison** and the **SureNail sell sheet
(10020692)**. The comparison says **DurationFLEX: "9 Colors Available Regionally"**. The
FLEX brochure's own colour section lists exactly nine:

| | |
|---|---|
| *Rich, sophisticated classic hues* | Brownwood · Driftwood · Estate Gray · Onyx Black · Teak |
| *Vibrant, dimensional combinations* | Black Sable · Sand Dune · Storm Cloud · Summer Harvest |

Two independent OC sources, same count. **The FLEX page was showing all twenty of
Duration's.**

### Where the mistake came from

616 matched FLEX to Duration's rows on the strength of Theo's *"The is flex but the color
is the same."* He meant the colour **renders** the same — a FLEX Onyx Black looks like a
Duration Onyx Black — **not** that FLEX is manufactured in all of them.

The 616 build-log entry also claimed FLEX's palette was *"Brownwood, Driftwood, Estate
Gray, Onyx Black, Teak, Black Sable"* — **six. It is nine.** That count came from a
keyword sweep of the brochure that never checked the colour section itself, which is this
file's own "print what your extractor captured" rule going unheeded.

**The cost if it had shipped:** a rep stands on the FLEX page, picks Merlot, and orders a
roof in a colour FLEX is not made in. Same class of error as selling a discontinued
colour — the thing this module exists to prevent.

`FLEX_COLOURS` is now an explicit nine-slug list mirroring the brochure. Two of the nine
are discontinued, so the sellable page shows **seven**; both still appear on the
Discontinued page. Duration is untouched and keeps its full palette, asserted at patch
time. Every slug is checked against the live catalogue, so a typo shrinks the page loudly
rather than silently.

### ⚠️ NOT changed: the 130 MPH. There is a source conflict and it is unresolved

Theo's comparison table says **"up to 160 MPH###"** for every Duration-series shingle. Our
pages say 130. **Not one of the seven Owens Corning documents on hand mentions 160:**

- Duration Beauty Book — *130-MPH Wind Resistance Limited Warranty*
- Duration FLEX brochure — *130-MPH*
- SureNail sell sheet (10020692) — *"exceptional wind resistance of a 130-MPH wind warranty"*

The `###` footnote is not in anything supplied. **"Up to" plus a footnote marker is the
same shape as Oakridge's 110/130**, which turned out to be conditional on six nails and OC
starter. Putting 160 on a tablet without its condition would be a false warranty statement
in front of a homeowner. The footnote was asked for rather than guessed. **Do not raise
this number until that text exists.**

### Oakridge needed nothing

The technical table Theo pasted matches what 617 ships line for line — Limited Lifetime,
110/130 MPH, 25-year algae, 13¼″ × 39⅜″, 5⅝″ exposure, 98.4 sq ft per square. A
confirmation, not a correction.

### A harness caught a bad edit of mine

I changed the FLEX tile's glance from *"insurance discount"* to *"a shorter colour range"*.
An existing 617 assertion failed, correctly: that **traded the insurance-discount lever —
the entire reason to sell FLEX — for a caveat.** The tile already prints the colour count
ahead of the glance, so the shorter range needs no words. Reverted.

### The phone baseline moved on purpose, and that is the interesting part

618's Chromium check asserts the phone render is pixel-identical to an approved baseline;
it is what caught the hero leaking onto the phone. 619 **legitimately** changes phone
content — FLEX's tile now reads "7 colours" — so the check went red.

**The baseline was not refreshed to make it green.** A tile-by-tile render
(`phonediff.js`) proved the difference was confined to the FLEX row and nothing else moved,
and only then was the baseline re-approved. The assertion is now named *"PHONE MATCHES THE
APPROVED BASELINE (no unintended viewport leak)"* and its failure message says to check
**which** kind of change it is before touching the file. A pixel gate that gets refreshed
on every red is not a gate.

### Verified

`check_build.py` green and negative-controlled, 618 → 619. **jsdom 83/83** — including that
no Duration-only colour can be reached from the FLEX page, that the discontinued FLEX
colours are filtered out of the sellable page but still appear on the Discontinued one, and
that Duration was not narrowed alongside it. **Chromium 50/50.**

## Build 620 — the SureNail strip, which is what sells Duration (7 Aug 2026)

Theo, on reading 619: *"Sure nail strip is what sells the duration compared to
competitors. Iko has something like it but it's on the back."*

The Duration blurb was leading with a comparison to **Oakridge** — Cardinal's own
cheaper line. That is an argument for buying up within Owens Corning, and it is not the
argument a rep is making at a kitchen table. The pitch now leads with Owens Corning's own
competitive claim: SureNail is the **first and only reinforced nailing zone ON THE FACE of
the shingle** — a wide, visible woven-fabric strip embedded where the nails actually go,
so a crew can see the target instead of guessing at it. Where the fabric overlays both
shingle layers it forms **Triple Layer Protection®**, up to a **200% wider common bond**.

The closing sentence is the one that does the work with a homeowner, and it is a warranty
point rather than a materials point: *a shingle may not be covered under warranty at all
if it is not fastened in the right place.*

### The three tested figures get their basis line, on the same rule as Oakridge

New `proof` field on `LINES`, rendered as `.occ-proof` / `.occ-pbasis` on **Duration and
FLEX only** — the two lines that have SureNail:

| | |
|---|---|
| **2×** | better nail pull-through resistance |
| **9×** | better nail blow-through resistance |
| **2×** | better delamination resistance |

**`basis` is not decoration and must not be dropped.** The sell sheet's own qualification:
*up to*, against **competing products with wide, single-layer nailing zones**, following
manufacturers' installation instructions and **nailing in the middle of the allowable
nailing zone**. A bare "9× better" on a tablet in front of a homeowner is a different
claim from the one Owens Corning tested. Same discipline as Oakridge's ‡‡ footnote, for
the same reason. `source` on both lines now names the **SureNail Sell Sheet (10020692)**
alongside the brochure, so the tested figures are attributed to the document they came
from rather than to the beauty book.

### ⚠️ IKO is deliberately NOT named — and Theo settled it the same day

Theo's own framing is a competitor comparison, and it is a good one — the observation that
IKO's equivalent strip is on the **back** of the shingle is exactly the kind of detail
that closes. It is not on the screen, and that is a decision, not an oversight.

**Asked and answered, 7 Aug:** *"As far as competition goes, doesn't need to be here
that's a whole separate thing."* The harness assertion below was written as a defensive
default while the question was open; it is now **the settled design**. No code changed —
the code was already right. ⚠️ *"A whole separate thing" is an observation, not a
request:* no competitor-comparison surface was asked for, and none should be built off
that phrase. If one is ever wanted, the sourcing is the hard part, not the screen.

`#cr-occ` is handed **to homeowners**. A claim about Owens Corning's own product carries
OC's documentation behind it; a claim about a named competitor's product is Cardinal's
claim, sourced from nothing in the folder. **`harness_colors.js` asserts no competitor name
— IKO, GAF, CertainTeed, Malarkey, TAMKO — appears anywhere in the rendered `#cr-occ`
markup**,
so adding one is a deliberate act rather than a drift. **The assertion is now permanent by
Theo's decision above, not merely a default while a question sat open.**

### Still not changed: the 130 MPH

The `###` footnote behind Owens Corning's *"up to 160 MPH"* has still not been supplied.
619's entry explains why the number does not move without it. Unchanged at 620.

### Verified

`check_build.py` green and negative-controlled, 619 → 620. **jsdom 93/93** — ten new
assertions covering the proof rows, that the basis line renders with them and cannot be
orphaned, that the basis is read *after* the claim rather than before it, that **Oakridge
and Supreme carry no proof block** (neither document mentions SureNail — absence is not a
claim), and that no competitor name appears anywhere in the rendered markup. **Chromium
50/50**, including the phone baseline. Rendered at phone width and read by eye, which is
what the copy change actually needed.

**The harness is now committed** as `scripts/harness_colors.js`, alongside
`harness_showcase.js` / `harness_walk.js` / `harness_detect.js`, and takes an optional
path argument so it can be pointed at an older tree. It is negative-controlled: run
against the build-619 artifact it goes **RED, 7 of the ten 620 assertions failing**. The
three that stay green there are the absence checks — no competitor named, no proof block
on Oakridge or Supreme — which were already true at 619 and are meant to stay true.

**The Supreme assertion was missing and was added rather than documented around.** The
harness checked Oakridge for an absent proof block but not Supreme, while the docs claimed
both. Supreme is the line where it matters most, not least: it is the cheap one, so a
borrowed SureNail figure on it would be the most profitable false claim on the screen.

## Build 621 — Duration's wind warranty goes conditional 130/160 (7 Aug 2026)

Theo forwarded an **Owens Corning Sales notice** (Sara Fagerman, Senior Area Sales Manager,
Mid-South / Cincinnati–Dayton). It closes the question 619 opened and 620 left open, and it
answers all three things that were asked for rather than just the number:

- **It is a WARRANTY figure** — *"the wind warranty on Duration® Series shingles will
  increase from 130 MPH to 160 MPH"*. So it upgrades the existing wind row; it is not a
  second row, which is what it would have had to be if 160 were a rating.
- **Effective 1 August 2026** — already live.
- **The condition:** at least **four** Owens Corning Total Protection Roofing System®
  components — Hip & Ridge, OC Underlayment (Titanium® / RhinoRoof®), Starter shingles on
  **both eaves and rakes**, and either an Ice & Water Barrier or a Ventilation product.
  Anything short of that still carries **130**.

Duration and Duration FLEX now read **130/160** on the tile, carry the full condition in an
`.occ-note2` caution under the spec table, and draw a hatched extension on the comparison
board exactly like Oakridge's.

### The two conditional lines mean OPPOSITE things, and the code now enforces it

This is the part worth remembering. Oakridge's 110/130 is a **caution** — quote the lower
number unless the roof was actually built that way. Duration's 130/160 is an **upsell** —
quote the higher only when the full system went on. Identical geometry, opposite sales
meaning. The condition text moved from a hardcoded string in the renderer onto each line's
own `chart.extNote`, and both harnesses assert Duration never prints Oakridge's six-nail
wording. Before this build there was exactly one string, and it said "6 nails and OC
starter".

### The three latent defects predicted at 620 were all real

Fixed in the same build, because shipping the number alone would have broken the board and
**two of the three fail silently**:

1. `pct()` divided by a hardcoded **130**. 160 computes to 123% inside an `overflow:hidden`
   track, so Duration would have rendered **pinned at full width** — reading as *maxed*
   rather than as *biggest*. The scale is now computed from the largest figure any line
   carries.
2. `.cmp-ext` positions at `left:pct(mph)`. At a 130 base that is `left:100%`, so the
   hatched band lands outside the track and is **clipped away entirely** — the one visual
   that marks a condition, gone, with no error anywhere. Chromium now measures that every
   extension paints at least 8px inside its own track; jsdom checks `left + width <= 100`.
3. The caption was Oakridge's condition, hardcoded. See above.

### ⚠️ What this build deliberately does NOT say

**That Cardinal installs the full Total Protection system as standard.** The screen states
the condition; whether Cardinal meets it is Theo's to say, and saying it for him would be
inventing a warranty claim in front of a homeowner. If he confirms it, the blurb can lead
with it and it is the strongest line on the page — *your warranty is 160 because of how we
build it, not 130.*

**And the source is a sales notice, not the warranty document.** The revised documents were
due on OwensCorning.com on 3 Aug 2026 and the sandbox cannot reach that site. Both `source`
strings name the notice explicitly. Replace it when the published document is in hand.

### Four gate failures, all of them the test being wrong rather than the app

Worth recording because the ratio keeps holding. The patch aborted twice before writing —
`{ key:'` occurs **zero** times in the file (entries open the brace on their own line), so
every slice ran to the end of the module and Duration's "slice" contained FLEX's wind row;
and the glance anchors were written with `·` when Duration and FLEX store a **literal**
`·` while Supreme stores the escape. The file mixes both forms. Then `'ext:' not in supreme`
failed against a correct file because Supreme has always carried `ext:null`, and a recon
regex missed it because `.` does not cross newlines. In the harness, `/130 MPH/` on the
Duration tile stopped matching once the tile correctly read `130/160 MPH`.

The one that mattered: the chart-extraction regex bounded at `{0,2600}` returned **nothing**
because 619's note grew Duration's entry to 2897 bytes — and it was caught only because the
new assertion prints what the extractor captured. An extractor that swallows everything
returns empty, and empty looks like a legitimate zero.

### The phone baseline moved for the second time, and again on evidence

Duration and FLEX legitimately read "130/160 MPH" on the phone now. A tile-by-tile diff
proved **exactly two of five** tiles changed and that Oakridge, Supreme and Discontinued
were byte-identical, and only then was the baseline re-approved — through a separate
`approve_baseline.js`, not by the harness regenerating its own expected value.

### Verified

`check_build.py` green and negative-controlled, 620 → 621. **jsdom 104/104**, negative-
controlled: **5 assertions fail against the 620 artifact**. **Chromium 53/53**, including
the geometry proof that each hatched extension actually paints inside its track — the thing
jsdom structurally cannot see and the reason defect 2 would otherwise have shipped. Board,
Duration line page and phone all rendered and read by eye.

## Build 622 — Cardinal installs the complete OC system, so the page says so (8 Aug 2026)

621 put the 160 MPH warranty on Duration and FLEX and **deliberately stopped short** of
claiming Cardinal met the condition for it, because that was Theo's statement to make and
not one to infer. Asked directly whether Cardinal installs the full Owens Corning Total
Protection Roofing System as standard: **"Yes we do."**

So the block under the spec table flips from a caution a rep must read carefully into the
strongest line on the page — *Cardinal installs the complete Owens Corning® system. That is
what qualifies this roof for the 160 MPH wind warranty rather than 130.*

### Three things keep the claim true, and all three are asserted

Removing any one of them turns an accurate statement into a false one on a screen handed to
homeowners. **Do not trim this copy.**

1. **The 130 fallback survives.** *Standard* is not *always* — a component can be
   substituted or declined on a job, and that roof carries 130. The note still says so and
   still tells the rep to confirm the specification before quoting 160.
2. **The warranty stays Owens Corning's to grant.** *Owens Corning requires … and Cardinal
   installs all four.* Cardinal installs; OC warrants. The patch asserts that neither
   "Cardinal warrants" nor "our warranty" appears anywhere in the module.
3. **The four components stay named.** They are the proof of the claim, and a homeowner
   seeing them is seeing what they are paying for.

### The same shared-string defect, one level up

621 moved the bar caption onto each line because Oakridge's second number is a **caution**
and Duration's is an **upsell**. The note's *heading* was still a single hardcoded string —
*"Read this before quoting the wind number."* — shared by both. Correct on Oakridge; on
Duration it now framed a selling point as a warning. `noteTitle` became per-line data with
the old string as the fallback, so Oakridge and anything unspecified are unchanged.

**The rule this is the second instance of: anything that reads differently on two lines
belongs on the line, not in the renderer.** Worth checking the remaining shared strings in
`cr-occ-script` before a third one is found the same way.

### Verified

`check_build.py` green and negative-controlled, 621 → 622. **jsdom 110/110**, negative-
controlled: **4 assertions fail against the 621 artifact**. **Chromium 53/53**, and the
**phone baseline did not move** — 622 touches the note block and the bar caption, neither of
which is phone-visible above the fold, so an unchanged baseline is the correct result rather
than a skipped check. Rendered and read by eye.

Two harness assertions were rewritten rather than worked around: both pinned the exact
caption string *"160 with the full OC Total Protection system"* and failed the moment 622
reworded it. They now assert the **invariant** — Duration carries its own 160 condition and
never Oakridge's nailing one — so Theo can reword the copy without breaking a gate. Pinning
marketing text in an assertion makes the copy hostage to the test.

### Left alone deliberately

The claim block still uses `.occ-note2`, the same red-edged styling as Oakridge's caution.
It reads as emphasis rather than warning in Cardinal red, and both blocks are the same kind
of content — the condition attached to the wind number. Splitting the style would create a
second thing to keep in sync for no gain. Theo can call it if he wants them distinct.

## Build 623 — OC Colors wears Owens Corning's own colours (8 Aug 2026)

Theo sent the **VentSure® RidgeProwler™ 30** flyer — one of the four Total
Protection components 621 put on the Duration page — and asked whether the
Colors screen could use its pink/white/black. Shown four renders (today, accent
only, pink masthead, the full flyer) he picked **the flyer**, and scoped it:
*"only for the Owens Corning colors part of this."* So `#cr-occ` and nothing
else. The patch asserts every rule in the stylesheet is `#cr-occ`-scoped.

**Colours are sampled from the PDF, not eyeballed:** pink **`#EC008C`** (15,520
px), rich black **`#231F20`** (126,336 px), white. OC's logo red `#E31837` also
appears in the flyer and is deliberately unused — it is close enough to
Cardinal's `#c8202e` to muddle the two brands.

**The Pink Panther is not used.** ⚠️ **The reason given here at the time was
WRONG and is corrected below** — see the 8 Aug entry. The flyer's footer
(*"THE PINK PANTHER & © 1964–2025 Metro-Goldwyn-Mayer Studios Inc."*) was read
as meaning Cardinal has no rights to the character. It does not mean that.
Theo confirmed he holds rights to OC's **logos** and sent them — a later build.

### One value cannot serve three grounds — the third instance of the same defect

`--occ-ink` and `--occ-dim` each did two jobs, because every surface used to be
dark. Turn the cards white and `--occ-dim` (`#9AA3AE`) lands at **2.55:1**.
Same shape as 621's shared bar caption and 622's shared note heading. The inks
are now **split by surface**, and the brand pink split too — it fails as small
text on the black (3.84:1) and under small white text (4.25:1):

| token | value | job | ratio |
|---|---|---|---|
| `--occ-red` | `#EC008C` | fills and large type | — |
| `--occ-pink-on-dark` | `#F55CB2` | small pink text on `#231F20` | 5.48:1 |
| `--occ-pink-deep` | `#C4007A` | ground under small white text | 5.79:1 |
| `--occ-pink-ink` | `#A6006A` | body pink on white | 7.42:1 |
| `--occ-panel-ink` | `#231F20` | text on white | 16.30:1 |
| `--occ-panel-dim` | `#55595E` | secondary on white | 7.05:1 |

The palette is **declared once** on `#cr-occ` rather than edited across 103 call
sites, and every reference keeps its old literal fallback — so if another module
ever strips these the screen degrades to the old Blackout instead of going
see-through. The 448–449 failure mode stays closed.

### `scripts/audit_contrast.js` — new, and it earned itself immediately

Walks every text node in a real engine, resolves its computed colour against
the nearest opaque ancestor background, and reports anything under its WCAG
floor (4.5 body / 3.0 for ≥18.66px or bold ≥14px). **It found 25 violations.
Eyes had found two.** Including `.occ-lname` at **1.12:1** — `#231F20` ink on a
`#171415` card — which no screenshot made obvious.

⚠️ **Its blind spot, stated so nobody over-trusts it:** it reads
`backgroundColor`, so text over a background-**image** is measured against the
colour beneath the photo. A "failure" on a photo card may be the audit's limit
rather than a defect — but it is still worth reading, because it says what the
text lands on if the image never loads. That is exactly how the real bug on the
hero tiles was found.

### Two regressions of mine, both caught by gates rather than by me

1. **`background:` instead of `background-color:`.** The shorthand resets
   `background-image`, so my dark photo-card rule **wiped the hero photograph
   off every tile**. 618's *"the Duration tile really paints a roof"* assertion
   caught it; nothing else would have.
2. **Style rules written ungated.** `data-style` is on `#cr-occ` at *every*
   width — only the 618 presentation rules are `@media (min-width:820px)`. Mine
   were not, so the iPad's dark photo-cards landed on the **phone**, putting
   `#231F20` on `#171415` at 1.12:1. Wrapped. **The phone is the surface with
   the pixel baseline; nothing style-specific may reach it.**

### White is for DATA surfaces, not photo cards

The rule the audit forced into the open: in `roofs` and `feature` a tile is a
**photograph** and its ink sits over a scrim, so those keep a dark card. The
compare board's rows, the colour grid, the proof figures and the wind note are
**data** — those are the white panels. `[data-nophoto]` tiles (Oakridge,
Supreme) are white too, since there is no photo to sit on.

### Verified

`check_build.py` green and negative-controlled, 622 → 623. **jsdom 110/110** —
structure untouched, which is the point: this is a skin. **Chromium 53/53.**
**`audit_contrast.js` CLEAN** at iPad-roofs, iPad-compare and phone. Phone
baseline re-approved: a deliberate total restyle, so the evidence is that every
rule is `#cr-occ`-scoped plus a clean audit at phone width, not a tile diff.
Board, line page and phone rendered and read by eye.


## 8 Aug 2026 — saving OC's brand rules, and correcting two things I had asserted

Theo sent **`MGM_Guidelines_for_Contractors.pdf`** and asked to save it as a
reference. Reading it corrected me twice. Both errors were stated confidently,
and one of them is written into the shipped file.

### 1. Cardinal MAY use the Pink Panther. I said it could not.

The document is titled *"The Pink Panther™ Guidelines — **For Contractors,
Distributors and Dealers**."* Owens Corning holds exclusive licensing in its
product categories and **extends the character to contractors** under an
approval process. My claim at 623 — *"the colour is fair game as an authorised
dealer; the cat is not"* — was wrong, and it shipped in `cr-occ-styles`'
banner, the 623 build-log entry, `FEATURES.md` and PR #151.

The character is still absent from the Colors screen, but for a different and
**true** reason: **nothing has been submitted for approval.**

### 2. The OC logo must NEVER be reversed to white. I was about to ask for that.

The plan for the logo build said to request the *"reversed / white variant"* for
the dark ground. *"Don't reverse out the logo"* is listed under INCORRECT USE.
Approved colours are red **PMS 186 `#CE1126`**, one-colour **black**, or silver;
and page 6 explicitly approves the logo on a **black background**, which is
exactly our `#231F20`. Asking a manufacturer for an asset their own rules forbid
would have been an expensive way to look careless.

### The thing that actually changes how the next build runs

**Any OC-co-branded material — and any use of the Panther — must be approved
before launch.** LMARoofing@owenscorning.com; websites additionally require the
layout *and a test-site URL*, with launch only after Local Marketing approves;
the Panther adds 8 business days at MGM plus 8 more for revisions.

**That gate is Theo's to pass. A session builds and stages; it does not ship a
mark on the assumption approval will follow.** Recorded so no future session
treats "we have the logo file" as "we may publish the logo".

Also required whenever the OC logo appears: **"Proud Installer of Owens Corning®
Products"** above it, the independent-contractor disclaimer, and clear space of
one cap-**"O"** height on all sides. The Preferred / Platinum Preferred lockups
are separate artwork with their own rules and do **not** need the "Proud
Installer" line — **ask Theo which status Cardinal holds** before picking an
asset.

### Saved

`docs/OC_MGM_Guidelines_for_Contractors.pdf` (the source of truth, unaltered)
and `docs/OC_BRAND_RULES.md` (the distillation, because a 2.3 MB PDF is not
greppable). Both under `.claude/`, which `.vercelignore` excludes — a partner's
internal brand manual must not be served publicly, which is also why it did not
go in root `docs/`, a directory that deliberately ships.

`CLAUDE.md`'s doc-set table now points at it.

---

## Build 624 — the Showcase got quick (8 Aug 2026)

Theo: *"Showcase is not responsive. It works but is sluggish."* Asked **which
part**, he said **the whole screen, generally** — not one gesture. That single
answer redirected the whole build, and asking was worth more than any amount of
reading: I had already measured a real defect in the drag path and would have
shipped a fix for a bug he had not reported.

### The cause: 8 MB of photograph painted into a 612px card

Production holds **1 showcase pair, 1 workmanship pair, 0 walks** — so this was
never a volume problem. Every photo is uploaded twice (`FULL {max:3840,q:0.92}`
and `DISP {max:1400,q:0.82}`), and the card grid already used `srcD()`. **Only
the compare slider and Curtain Call asked for FULL.** Real sizes, from
production storage, for the one pair on the wall:

| | before | after | total |
|---|---:|---:|---:|
| `src()` — the slider | 3,374 kB | 4,972 kB | **8,346 kB** |
| `srcD()` — already beside it | 609 kB | 846 kB | **1,455 kB** |

**And there is no quality trade, which is the part worth remembering.** The
compare card is capped at **612 CSS px at every viewport measured** — iPhone,
both iPads in both orientations, 1080p and ultrawide. At 2× Retina that is
1,224 device px. The 1,400px copy still *oversamples* it. The 3,840px copy was
being downscaled by a factor of three before anyone saw it.

**Pinching in is untouched.** `cmpexp` reads `data-path`, which still carries
the FULL path, and `openLens()` fetches that itself — the slider never held the
full copy on the Lens's behalf. That is the invariant the harness now guards.

### And one write per frame instead of one per touch report

Secondary, not what Theo noticed, but on the same screen and already measured.
`from()` did `getBoundingClientRect()` **per pointer event** and `set()` wrote
twice — and on this app every mutation wakes all 50 `document.body` observers
the other modules register. A 120-event burst dispatched **in one frame**, which
is how a 120 Hz digitizer actually delivers:

| | forced reflows | mutation records | ×50 observers |
|---|---:|---:|---:|
| 623 | 121 | 243 | 12,150 |
| 624 | **1** | **4** | **200** |

`--sh-split` ends at `79.5%` either way. Both writes now compare against a
**stored** last value, never a read-back of the DOM — 567/569's lesson.

⚠️ **Re-run that measurement the same way or it lies.** Driving the drag with
awaited `page.mouse.move()` lets a frame paint between every event, so
coalescing has nothing to coalesce and the identical fix scores only 243 → 183.
The burst test is the honest one.

⚠️ **The trap this build had to dodge:** the keyboard handler read the position
back out of the DOM (`getPropertyValue('--sh-split')` — the only such reader,
measured). With the write deferred a frame, two quick arrow presses would both
read the same stale value and the second would undo the first. It reads the
tracked variable now.

### The harness assertion that had to be reversed

`harness_showcase.js` asserted **"slider uses the FULL image"** — 577's
intent, encoded. 624 reverses it deliberately, so the test was updated rather
than the artifact bent, and the old reasoning is kept in the comment beside it.
The replacement asserts the *invariant* — the slider takes the display copy
**and still carries the FULL path so pinch has something to open** — rather
than which file it happens to request. 124/124 green; negative-controlled
against the 623 artifact, where the new assertion correctly fails.

Also caught by the patch's own asserts: `esc(srcD(p.after_path))` **already
occurred once** (the thumbnail), so an `== 1` check was the test being wrong,
not the app. Rewritten self-computing (`== SHOW.count(x) + 1`).

### Not done, deliberately

The same shape exists in the Walk review drag (`frac()`, 4 style writes per
event) and The Lens pan (`apply()` rewrites the zoom label on every pan though
the zoom never changes). **Zero walks exist and Theo did not report either.**

**This does not claim to be all of it.** If the screen still drags, the next
suspect is app-wide rather than Showcase-local: the module registers **zero**
`document.body` observers and its four `requestAnimationFrame` sites are all
bounded and `isConnected`-guarded, so the Showcase is not the 567/569 class.
Do not re-flag it as such.

---

## Build 625 — the showroom stops wearing the CRM (8 Aug 2026)

Two things Theo hit on the live site and sent photos of from his iPad. Both were
invisible to every gate in this repo, for different reasons.

### The showroom was the CRM in a different hat

`showMain()` contained **zero** references to `isVisionHost()` and turned the
whole CRM shell on regardless of hostname — site header, nav strip, Add-project
button, admin nav. Build 593 only ever swapped the **contents** of
`#landingView`, so signing in at `showroom.cardinalroster.com` handed him a
customer-facing tablet with the office painted around the presentation door.

⚠️ **`isVisionHost()` was trapped.** It lives in `cr-lr-script` and was exported
**nowhere**; `showMain()` lives in the main unnamed block and could not see it.
It is now a member of the **existing** `window.CardinalLanding` object — not a
new `window.Cardinal*`, because `check_build.py`'s dupe-API check exists to stop
a second one appearing, and "extend, don't add" is the standing rule.

The call is deliberately defensive — `window.CardinalLanding && …isVisionHost &&
…isVisionHost()` — so if the landing block has not run the answer is **false**,
which is the safe direction: a normal CRM load.

**Theo chose this (Option 1) over a separate `showroom.html` (Option 3) after
being shown both.** Option 3 is recorded in `OPEN_ITEMS.md` as a real future
project, at his explicit request — *"Option 1 but remember option 3."*

### The iPad header was Safari, not the stylesheet

The Colors line title rendered at roughly double its authored size, wrapping
"TruDefinition® Duration® FLEX®" over six lines with the ® marks orphaned.

**`text-size-adjust` appeared zero times in the entire file.** `.occ-title b` is
a `display:block` inside a flex item with `min-width:0` — the exact narrow-block
shape iOS Safari inflates. Every rule mentioning `.occ-title` was read: there is
**no `[data-style="feature"]` title rule anywhere**, and the CSS says 19px /
26px. The stylesheet was never the cause.

⚠️ **NO GATE HERE CAN SEE THIS.** Chromium does not font-boost, which is why
every render shown to Theo looked correct. **His iPad is the only verification**,
and that is stated rather than papered over.

**Scoped to `#cr-occ` deliberately.** Boosting has been active on iOS across this
whole app for years, so setting it globally on `html` would shrink text app-wide
on the one device he uses most — a large, unreviewed visual change smuggled in
under a bug fix. Widening later is one selector. **`#cr-show` probably wants the
same and is NOT included**: it was not reported and cannot be verified here.

### The gate this build is really carrying — `harness_vision.js`

New, 23 assertions, and it runs the **shipped** `showMain()` and `isVisionHost()`
text rather than a re-implementation. Every assertion is made **twice**: once with
`?vision=1`, once without.

**A gate that only ever hides is as wrong as one that only ever shows**, and
`app.cardinalroster.com` is the branch nobody would notice breaking. The negative
control against the 624 artifact proves the shape: all six vision assertions fail
there, and **every "nothing may change" assertion passes on both artifacts**.

### Two of my own tests were wrong before the app was

Both were the documented comment-pollution trap, and both aborted before any
write. `count('text-size-adjust:100%')` matched **my own explanatory comment**;
so did a tightened regex, because the comment contained `html{text-size-adjust:100%}`.
Fixed by anchoring the assertion to the declaration's newline-and-indent — and by
not writing declaration-shaped text in a comment that assertions scan.

---

## Build 626 — the shingle name fits, and the third guess was replaced by a measurement (8 Aug 2026)

**625's theory was wrong, and this entry exists so nobody re-derives it.**

625 scoped `text-size-adjust:100%` to `#cr-occ` on the theory that iOS font
boosting was inflating the Colors line title. Theo, after it: **"Fine in Roofs
and Compare, only slightly off in Feature."** That answer kills the theory —
`text-size-adjust` sits on `#cr-occ` and disables boosting for the whole subtree,
so all three styles would behave identically. It also showed 625 *helped*: the
photo was six stacked lines; "slightly off" is not.

### What three renders missed, and why

**Every previous look at this screen was at 1194px**, the one width where the
longest product name happens to fit. Measured there, all three styles were
identical — `.occ-title` 747px, the `<b>` 747×31px on one line at 26px — so the
render kept saying "fine" and I kept theorising about iOS.

**At 820px on build 625 it reproduces in plain Chromium:** 26px in a 373px box,
**2 lines, 62px tall**. The bug was never iOS-only. It was width-only, and the
harness was never narrow.

Also ruled out on the way, so nobody re-checks: **no global
`overflow-wrap`/`word-break` rule can inherit into `#cr-occ`** — all 17 in the
file are scoped to unrelated classes.

### The fix — make it impossible rather than diagnose it

1. **`font-size:clamp(19px, 2.1vw, 26px)`** in the ≥820px rule. The name shrinks
   to fit instead of breaking. At 1194px that is ~25px, visually where it already
   sat; it only gives ground when the header is genuinely tight.
2. **`word-break:keep-all`** on `.occ-title b`. CSS Text 3 applies it to all
   scripts, not just CJK, so a break can never land inside a word. The stored name
   is `'TruDefinition® Duration® FLEX®'` with **no space before the mark**, so the
   orphaned ® in the photograph could only have come from an intra-word break.

**Deliberately NOT done:** `.occ-styles` was left at `flex:0 0 auto`. Letting the
switcher shrink would squeeze the pills horizontally, and **592 pushed every
showroom control to ≥44px**. The clamp solves the fit without touching a settled
accessibility decision. 623's `font-weight:700` on the pressed pill — which does
widen the strip and take width from the title — is likewise left alone, because
it is what carries the pressed state to the 3.0 contrast floor.

### `harness_occhead.js` — the check nobody had

42 assertions across **five widths × three styles**, on the line page. It is the
gate that would have caught this the first time.

⚠️ **My first draft of it asserted the wrong thing** and failed 6 of 30 — all at
390px, where the name wraps at a **space** into two lines. That is ordinary,
long-standing, and on the one surface with a pixel baseline. **The test was
wrong, not the app.** The invariant is *"no break inside a word, at every
width"* plus *"one line where the header has room (≥820px)"*. **Do not tighten it
back to "always one line"** — that would force phone typography Theo already
approved.

Negative-controlled against the 625 artifact, where it fails 20 assertions
including the real 820px two-line wrap.

---

## Build 627 — tick photos in Studio, build the pair in the Showcase (8 Aug 2026)

Theo, looking at 218 photos for 1227 Styer Dr: *"Any way you could make
checkboxes on these photos so they can be transferred to another section to
where I could pick which photos I use for before and afters and bad vs good
installs?"* Offered four shapes, he chose the **holding tray**.

### The prime doctrine earned its keep again

**The checkbox-and-assign-roles UI he asked for already existed.** The Showcase's
pair-builder already tracks `chosen{}` (which photos are ticked) and `roles{}`
(which is before, which is after — or bad vs Cardinal-standard), and already
writes the pair. It had simply never been pointed at the archive.

So 627 adds a **tray and a source**, and the pair-builder is untouched.
`promoteToPair`, `drawJobPicker` and `takeJobPhotos` are each still defined
exactly once — harness-asserted, because a second picker was the obvious move
and would have been the wrong one.

### Measured before designing (production)

**60,503 photos · 756 sites · avg 1138×1033 · 166 kB · 0 `-d` renditions ·
0 rows with coordinates.**

The 166 kB and missing `-d` turn out not to matter, and that is worth recording:
`promoteToPair` runs picks through `jobFiles()` → `shotBlob()` → a real `File`,
and the save path puts that through `putPhoto()`, which writes **both**
renditions at proper showcase paths. A tray photo lands exactly like an uploaded
one, so **build 624's `srcD()` work is not undermined** — asserted.

### ⚠️ The fence this feature runs straight at

`studio_photos` carries **`lat` and `lon`**. All 60,503 rows are NULL today, so
the EXIF/GPS exclusion in `CONTRACTOR_VISION_SUITE.md` is holding *in practice*
— but this is the **first path from the archive toward a client-facing screen**,
which makes it exactly the seam where a `{...r}` spread would carry coordinates
across.

**`studio_tray` has no coordinate columns, and `toggleTray` names its six fields
explicitly.** Both are asserted, in the schema and at both ends of the code.
Do not "complete" the row.

### Why a table and not a Set

Theo ticks on the iPad and may build the pair on the desktop. A tray that does
not survive that is not a tray. `storage_path` is the primary key, so a double
tick upserts rather than duplicating. `studio_tray.sql` is **APPLIED and
verified** — 0 rows, RLS on, one `is_cardinal_admin()` policy, **0 coordinate
columns**.

### Corrections to the doc set

**`CLAUDE.md` says Studio "never writes". That was already untrue** before this
build — `studio.html` carries an `update()` that archives a whole site — and it
is more untrue now. Fix the sentence rather than the code.

### `harness_tray.js` — 23 assertions, negative-controlled (16 fail on 626)

⚠️ **My own comment failed my own assertion, for the third time tonight.**
`!/\blat\b|\blon\b/` over `toggleTray` matched the comment *explaining why
coordinates are excluded*. Fixed by scoping to the `upsert()` **object literal**
— the prose is not the payload. Same trap as 626's `text-size-adjust` count and
624's `esc(srcD(...))` count. **When asserting a thing is absent, assert over
code, never over a slice that contains your reasoning about it.**

---

## Build 628 — two keep buckets, and the Hall of Fame gets a picker (8 Aug 2026)

`studio.html` + `cr-show-script` + `studio_tray_bucket.sql` (**applied and
verified before the HTML change**).

**Theo, on the tray shipped at 627:** *"1 is the bin for trashing or selecting?
Is there a bin for keep for before and after a bin for damage vs how we do it
and a bin for junk?"*

Measured before answering, not guessed:

| He described | What existed | Reachable? |
|---|---|---|
| junk | the Bin — `archived_at`, per SITE via `setArchived(address, on)` | ✅ |
| before & after | `studio_tray` → pair-builder → `showcase_pairs` | ✅ |
| theirs vs ours | `workmanship_pairs` (build 576) | ❌ **upload-only** |

**The gap was precise.** `saveWork()` read both photographs from file inputs and
`openWorkForm()` rendered no picker, so the Hall of Fame **could not see the
tray at all** — a ticked bad-install photo landed in the same undifferentiated
pile as the before/afters and could only become a Showcase pair.

### The picker was reused, not duplicated

`jobPick` was already slot-driven: `slots:['before','after']` is just an array
and every consumer walks it. The second shape is that array plus a generic
completion guard. **`promoteToPair`, `drawJobPicker`, `takeJobPhotos`,
`openJobPicker`, `openWorkForm`, `savePair`, `saveWork`, `defSlot` and
`loadTrayPhotos` are each still defined exactly once** — asserted.

The old guard `keys.indexOf('before') === -1 || keys.indexOf('after') === -1`
became `jobPick.slots.some(k => k !== 'build' && …)` — the same rule the "Use
these" button already enforced, now read off the shape instead of naming one.

### ⚠ A latent bug this would have created, closed in the same build

`openWorkForm()` had **no `pending = null`**. Harmless while `saveWork` ignored
`pending` — but the moment it started preferring carried files, the next
hand-made comparison would have silently uploaded the *previous* pick's
photographs. That is exactly the failure the 591 comment on `openForm` describes.
Both forms now clear unconditionally, and two assertions cover it.

### The chip: a Chromium render caught what no assertion did

Theo picked "one chip that cycles" from rendered options. First cut drew the
amber state as a **bar** so shape would carry the state as well as colour —
and the render showed the mistake: **a bar in a checkbox is the universal
"indeterminate / excluded" mark**, so tapping green → amber read as *un-picking*
the photo. Tick now means PICKED in both; the **chip shape** carries which pile
(rounded square = Showcase, circle = Hall of Fame). Every gate was green across
that change. Only the picture showed it.

`TRAY` went `Set` → `Map` (path → bucket): `.has()`, `.size` and `.delete()` keep
their meaning, so every existing read site is correct without being touched.
One `paintTick()` serves both the grid renderer and the toggle — two copies
would drift invisibly. A failed write restores the **previous bucket**, not
merely un-ticked: a failed showcase→workmanship move must land back on showcase.

### The fence is unchanged and still asserted

`studio_tray` still has **no coordinate columns**, `toggleTray()` still names its
fields explicitly rather than spreading the archive row, and both tray reads now
filter `.eq('bucket', want)` where `want` is derived from the picker's own mode
so the two cannot disagree. `studio_tray_bucket.sql` verified against production:
bucket NOT NULL default `'showcase'`, check constraint `('showcase','workmanship')`,
admin-only policy inherited, **0 coordinate columns**, 0 rows.

### Gates

`check_build.py` green and negative-controlled · `studio.html`'s inline scripts
parsed separately (outside its scope) · **347 assertions green**: tray **48**
(negative-controlled — 24 fail against 627) · showcase 124 · vision 23 · colors
110 · occhead 42 · plus 8 functional assertions executing the *shipped*
`nextBucket`/`paintTick` in jsdom, proving the cycle repeats and that all three
states differ in class, `aria-pressed` and label.

⚠️ **A harness assertion broke for no app reason and the test was wrong.** The
627 check `/stu-tick[\s\S]{0,700}ev\.stopPropagation\(\)/` passed by string
*proximity*; 628 moved the class into `paintTick()`, so the nearest `stu-tick`
literal is now in the CSS a thousand lines away. `ev.stopPropagation()` was
still right there in the listener. Rescoped to the listener itself. Same lesson
as `harness_showcase`'s FULL-image assertion and `harness_occhead`'s
one-line-at-every-width draft: **assert on the code that must be true, never on
how close two strings happen to sit.**

### Left open deliberately

Nothing prunes the tray once a pair is built (unchanged from 627 — Theo's call),
and the reader still takes `.limit(300)` with no paging. Whether a Hall of Fame
comparison should also accept a third "during" shot, as the Showcase path does
via its optional `build` slot, was **not** assumed either way.

---

## Build 629 — arm a bin, then tap. Three bins, plus trade (8 Aug 2026)

`studio.html` + `studio_tray_bins.sql` (**applied and verified before the HTML
change**). `index.html` gets the stamp and a `CHANGELOG` entry only.

**Theo, an hour after 628 shipped two buckets: *"Extra bins"*.** Asked which:
**"Colors but also would be nice to have by trades as well."** Asked how the
control should work, given three-plus bins: **"Arm a bin, then tap."**

### ⚠ The two things he asked for are NOT the same kind of thing

This is the whole design, and getting it wrong would have been unrecoverable
without a migration:

- **COLOURS is a BUCKET** — a destination like showcase and workmanship, headed
  for `oc_color_photos`. A photo is in exactly one, because `storage_path` is
  the primary key.
- **TRADE is a FACET** — it cuts across every bucket. A before/after can be a
  siding job; a theirs-vs-ours can be gutters. As a fourth bucket it would have
  forced a roofing before/after to choose between being a before/after and being
  roofing. So: its own nullable column, orthogonal to bucket.

`trade`'s six values are the app's **existing** `TRADES` — the same list in three
places in `index.html`, the same `workmanship_pairs.trade` carries, the same
`crews_trade_ck` constrains. One vocabulary; when one grows they all grow.

### The cycle is gone, deliberately

628's chip cycled off → showcase → workmanship → off. That was right for two
bins and wrong for three: undoing a mis-tap cost one tap per remaining bin, and
a fourth bin would have cost four. **The chip is now a plain in/out toggle
against whatever bin is ARMED in a row above the grid** — one tap either way,
however many bins exist. Offered against a per-photo menu and against extending
the cycle; Theo picked this.

`tapResult()` holds the whole meaning of a tap in one place:

| mode | state | result |
|---|---|---|
| bin | not in tray | into the armed bin |
| bin | in the armed bin | out |
| bin | in a **different** bin | **moves**, keeping its trade |
| trade | not in tray | **no-op** — there is no row to write on |
| trade | already the armed trade | cleared |
| trade | otherwise | set |

The move-on-tap rule is why the chip shows the bin it is **actually** in rather
than the armed one: you can see before you tap that a photo belongs elsewhere.

### Verified by executing the shipped code, not a re-implementation

11 functional assertions drive the real `tapResult` through every state,
including the one that matters: **every reachable result is a valid row** —
bucket in the three, trade in the six or null — so the DB constraints cannot be
hit by any sequence of taps.

`harness_tray.js` is now **57 assertions**, negative-controlled (14 fail against
628). `check_build.py` green and negative-controlled; `studio.html` parsed
separately; showcase 124 · vision 23 · colors 110 · occhead 42 all still green.

### ⚠ Two assertions failed on CORRECT code, and both were the test's fault

1. **`nextBucket` "survived".** The lexer settled it: **0 in CODE, 1 in
   comments** — my own comment, `/* 629 replaced nextBucket() …`. The **fourth**
   instance this session of an assertion matching its own explanatory prose.
   Fixed by rewording the comment so it no longer contains the identifier it
   discusses, and by checking with `jslex_count.py` rather than a bare regex.
2. **`paintTick` call count `=== 4`.** 628 hardcoded it; 629 legitimately added
   a fifth call site in `repaintTicks()`. Rewritten to assert the *intent* —
   one definition, three or more callers — which is the repo's own standing rule
   about self-computing assertions over numbers read off a patched tree.

### What is NOT done, and is the next build

**The colours bin collects but has nowhere to go yet.** `oc_color_photos.color_id`
is NOT NULL and names a specific Owens Corning colour — a choice that belongs on
the Colors page where the swatches are visible, not in Studio.

⚠️ **And it cannot simply reference the archive path.** The Colors page is
visible to **all signed-in staff** ("Yes they can see colors" — Theo, settled),
while `photos/studio/*` is admin-only by storage policy. A tray photo must be
**copied** into `oc-colors/<slug>/` the way the Showcase copies through
`putPhoto()`, or the photo renders for Theo and is broken for Curtis and Nick.
That is build 630, and it was split out rather than rushed.

Also unchanged and still Theo's: nothing prunes the tray once a pair is built,
and whether a Hall of Fame comparison should take a third "during" shot.

---

## Build 630 — the colour photo grid: many at once, smaller, deletable, full screen (8 Aug 2026)

`cr-occ-script` + `cr-occ-styles`, plus one export added to `cr-show-script`.
No SQL: `oc_color_photos` already had a delete policy
(`created_by = my_email() OR is_cardinal_admin()`).

Theo, from the iPad on the Onyx Black page, six reports in one message:
multi-select missing · "Upload fails as well" · a duplicate with no way to
delete · open full screen and swipe · the white labels · "Scrolling also locks
up and has issues".

### ⚠ Two of those were ONE root cause, and it was measurable

```
storage.buckets.photos.file_size_limit = 10,485,760   (10 MB)
oc-colors/onyx-black/*  →  6 objects at 5.37–8.04 MB, 4 at ~0.30 MB
```

`upload()` sent **raw camera bytes**. Anything over 10 MB was refused outright —
that is "upload fails" — and the survivors made the grid **~40 MB to paint**,
which is an iPad locking up while scrolling. The Showcase never has this problem
because `putPhoto()` shrinks first.

**Prime doctrine again: the mechanism already existed.** `shrink()` and the
`FULL`/`DISP` rendition constants were exported from `cr-show-script` rather than
copied — a second shrinker would drift and reintroduce 624 on a new screen.
Uploads now write both renditions, always as JPEG (which also fixes HEIC off an
iPhone rendering for Theo in Safari and as a broken box for anyone on Chrome),
and the grid asks for the display twin with a **fallback to the original** —
load-bearing, because pre-630 photos have no twin and would otherwise vanish.

### The rest

- **`multiple` on the input**, with a per-file progress label and a batch that
  survives one failure. ⚠️ Paths became **uuids**: `Date.now()` collides when
  several files land in the same millisecond and `upsert:false` throws — a bug
  `multiple` would have created on its first use.
- **A delete button**, admin-gated in the UI and by RLS. The **row goes first**,
  then the storage objects: an orphaned object costs pennies, a row pointing at
  nothing is a hole in the grid. An RLS refusal is caught by **row count**, not
  by an error, per the `.single()` doctrine.
- **A lightbox** — tap to open, swipe or arrow through, Escape to close, and the
  key listener is removed on close. Its own element, deliberately **not** the
  Showcase's `openLens`, which reads showcase paths on a client-facing surface.
  Swipe requires horizontal intent (`|dx| > 45 && |dx| > |dy| * 1.6`) so a tap
  cannot step it, and both touch listeners are passive.
- **`overscroll-behavior:contain`** on the view and the lightbox. The view is
  `position:fixed` and scrolls itself, so a flick reaching either end chained
  into the page behind. Weight was the bigger half of the scroll complaint.

### The caption was a real defect, not a preference

Theo: *"make those small white labels black with pink letters"*. He was reading
a **contrast failure**. 623 set `--occ-card:#FFFFFF` ("tiles with no hero photo
are white too") and `.occ-ours figure` paints from it, so the caption has been
`--occ-dim` grey on white — **2.55:1**, which this file's own palette comment
already records — since 623.

Now `--occ-head` ground with `--occ-pink-on-dark` (**5.48:1**). ⚠️ **Not** the
brand pink `#EC008C`: that is 3.84:1 as small text and is a FILL/large-type
colour under OC's own rules. Honouring the request literally would have failed
the floor. Rendered before/after, and the first render was **discarded as
misleading** — the "before" override lost specificity and both columns showed
the new style.

### Gates

`check_build.py` green and negative-controlled, 629 → 630 · **`harness_ourroofs.js`
— 38 assertions, negative-controlled (37 fail against 629)**, including six that
execute the shipped `dispOf` and `stepShot` · colors 110 · occhead 42 · showcase
124 · tray 57 · vision 23, all still green.

⚠️ The new harness's functional section is **wrapped in try/catch on purpose**:
without it, a build lacking these functions *crashed* rather than reporting RED,
and a crash proves the file differs while a RED proves which behaviours are
missing.

### ⚠ BUG_CLASSES class 15 opened — six false reds in one session

`openLens` matched this module's own comment saying it is *not* used here. That
is the **sixth** assertion this session to match prose rather than code. Written
up as its own class with the five rules that fall out of it, because fixing it a
seventh time quietly would be the wrong response.

### Not fixed, and stated plainly

The **six oversized photos already uploaded stay oversized** — they can only be
re-encoded by re-uploading, and this container has no storage credentials (nor
should it). With delete and multi-select now present, replacing them is about
thirty seconds of Theo's time, and the grid pulls the display twin for anything
uploaded from 630 on.

---

## Build 631 — Optimise: repair in place what 630 could only fix on the way up (8 Aug 2026)

`cr-occ-script` + `cr-occ-styles`. No SQL, and deliberately no table write at all.

630 shrank every new upload but could not reach what was already there. Measured
against production at the time:

```
oc_color_photos      10 rows · 40.2 MB total · 4.02 MB average · 0 with a -d twin
```

Theo, testing: *"Also takes a very long time to load."* That is those forty
megabytes. **He was on build 627 at the time** — 628–630 were still sitting in
PR #155 — so everything in that report was already fixed and unmerged. Offered
merge-then-optimise or merge-and-replace-by-hand; he picked **"Merge, then
optimise"**, #155 was merged as `44e6811`, and this is the follow-up.

### The whole job is already-built parts

Fetch the signed URL the grid is **already signing**, hand the bytes to the
**same `shrink()`** 630 exported, upload to the **same path** with upsert. No new
mechanism, no second shrinker, no schema change.

**The safety property is that it never writes the table.** `storage_path` does
not change, so a failure mid-run leaves that photograph exactly as it was. A
re-encode that rewrote paths could strand rows and leave the grid full of holes;
this cannot produce one, and the harness asserts it by slicing the function and
checking `oc_color_photos` never appears inside it.

**Which photos need it is exact, not a guess:** a missing `-d` twin *is* the
test for "went up raw", and it costs nothing because both paths are already
signed for the grid. The button renders only when the count is non-zero, names
the count, and hides itself again afterwards.

⚠️ **It fetches to a Blob before shrinking, and that is load-bearing.**
`shrink()` does `URL.createObjectURL(file)` — a `blob:` URL, same-origin, canvas
stays clean. Pointing it at the remote `https` signed URL would **taint the
canvas and make `toBlob()` throw**. Named trap on this project; the CompanyCam
picker carries the same note ("the bytes always come through
`api/companycam.js`, never the CDN").

### ⚠ Class 15 caught me twice more, in the same hour I wrote it

**Seventh instance:** `opt.count('upsert:true') == 2` returned 3 — the third was
my own comment *"upsert:true and the SAME path…"*. Fixed by **rule 5** (reword
the prose) **and rule 2** (assert on the call form
`{ contentType:'image/jpeg', upsert:true }`).

**Eighth instance, and this one is worse:** `harness_ourroofs.js` — written an
hour earlier — asserted `contentType:'image/jpeg'` appears **exactly twice**.
631 legitimately added two more uploads and a correct build went red. That is
**rule 4**, in a harness written after the rule. Rewritten to the real
invariant: *every* `.upload(` in the module declares JPEG, counted rather than
hardcoded, so it scales with the next build instead of breaking on it.

The lesson stands sharper than when it was written: **a hardcoded count is a
time bomb, and knowing the rule is not the same as applying it.**

### Gates

`check_build.py` green and negative-controlled, 630 → 631 · **`harness_ourroofs.js`
now 46 assertions, negative-controlled — 6 fail against 630** · colors 110 ·
occhead 42 · showcase 124 · tray 57 · vision 23, all green.

**Unverifiable from here, and stated as such:** the fetch → canvas → re-upload
path cannot be exercised in this container (no browser session, no storage
credentials). The reasoning about blob-URL sameness is sound and the trap is
documented, but **Theo tapping the button is the real gate.** If it reports
failures, the first thing to check is whether the signed-URL fetch is being
refused by CORS.

---

## Build 632 — the Archive button was never wired, and binning several sites (8 Aug 2026)

`studio.html`. No SQL. `index.html` gets the stamp and a `CHANGELOG` entry only.

**Theo: *"The archive site button does not work."*** Then, on the rail:
*"Also the bin several would be nice."*

### ⚠ TWO THEORIES WERE TESTED AND BOTH WERE WRONG — do not re-chase them

- ~~The rail address does not match `project_address`.~~ **It matches exactly.**
  Every site's rail count equals what `.eq('project_address', …)` would select,
  checked against production for the twelve largest sites.
- ~~RLS refuses the update.~~ One policy, `FOR ALL`, `is_cardinal_admin()`. He
  SELECTs 60,503 rows *through that same policy*, so it evaluates true. Ordinary
  table, RLS on, **0 triggers**, `archived_at` writable and never generated.

Both were plausible and both were wrong. Recording them because the third guess
is the one that cost nothing to check and should have been first.

### The actual cause

`setupMode()` **returned inside its `isShowroomHost()` branch, before any
`addEventListener` ran.** On a `showroom.` host three controls were drawn and
dead: **Archive site, Restore site, and the lens switcher.**

Every piece of evidence agrees, and none of it required a browser:

| Evidence | Conclusion |
|---|---|
| the Work/Private toggle is **absent** from his screenshot | the showroom branch ran — hiding that toggle is what it does |
| the default lens is already `'site'` (line 620) | he reaches Sites without the dead lens button, so its deadness was invisible |
| the facet click is wired in `renderRail()`, not `setupMode()` | selecting a site still worked, which made the button look like the only broken thing |
| `paintSiteActions()` shows the button from state alone | it renders whether or not anything is listening |
| `archived_at` NULL on **all 60,503 rows**, `max(archived_at)` NULL | the click had never once reached the database |

625's intent is kept exactly — the mode is still forced and the toggle still
hidden ("hiding a button is not the same as closing the door"). Only the early
`return` is gone, and it was **protecting nothing**: Studio is admin-gated twice
over, by its own sign-in and by `is_cardinal_admin()`, so no customer can reach
those controls on any host. All the return did was disable three of Theo's tools.

### ⚠ A second, independent defect — the reason it presented as silence

`setArchived()` checked only `res.error`. **A PostgREST update matching zero rows
SUCCEEDS**, so a no-op was indistinguishable from success. It now `.select('id')`s
and reports an empty result by name — the rule `removeOurs()` in `cr-occ-script`
already follows. Fixed independently of the wiring, because the next silent
failure would otherwise be invisible the same way.

### Bin several sites

A tick beside each street in the rail, then one **Archive N sites** button.

- **Reuses `setArchived()` per address** rather than one wide
  `.in('project_address', […])`. Fewer round trips, but a second code path for
  the same act — and the per-site call has to be right regardless. `quiet`
  suppresses the per-site repaint so the bulk run paints once at the end.
- ⚠️ **The tick is a `<span role="checkbox">`, not a button.** The rail row is
  *already* a `<button>`, and a nested button is invalid markup that engines
  resolve by dropping one — it would have been silently unclickable on some.
- Ticking `stopPropagation()`s so it does not also *select* the site, which
  would reload the grid for that address mid-tick.
- The button only appears in Sites and Bin, follows the lens for direction, and
  a selection is cleared on a lens change so it cannot mean the opposite thing.

### Gates — and the one that actually matters

`check_build.py` green and negative-controlled · `studio.html` parsed separately
· **`harness_studiobin.js`, 28 assertions**, plus the six existing harnesses
(ourroofs 46 · tray 57 · showcase 124 · colors 110 · occhead 42 · vision 23).

**The static assertions are the weaker half.** This bug shipped past everything a
regex could check, because the code existed and simply never ran. So the harness
**EXECUTES the shipped `setupMode` under both hostnames** and asks the DOM
whether a listener is attached.

**The negative control reproduces Theo's symptom exactly.** Against 631:

```
studio.cardinalroster.com    Archive/Restore/lens  WIRED
showroom.cardinalroster.com  Archive/Restore/lens  NOT WIRED   ← the bug
```

Same code, different host — which is why it looked like a permissions or data
problem and was neither.

⚠️ Two of this build's own assertions failed on correct code first (class 15,
instances nine and ten): a `return;` count over the whole of `setupMode` caught
all eleven nested listener guards, and a `bulk` slice that ran to the next
landmark swept up neighbouring functions that legitimately query
`studio_photos`. Both fixed by **brace-matching the function** instead of
slicing to a marker. The jsdom stubs also threw twice until every element
`setupMode` touches was enumerated **by reading the function** rather than
guessed — a missing stub reads exactly like an app failure.

### Still not built, deliberately

**Per-photo junk.** His question also floated *"individually checking"*.
`archived_at` is already per-row so it needs **no migration** — a **Junk** chip
in the 629 arm row would do it, writing `archived_at` instead of `studio_tray`.
Left out because he answered "bin several", and because one unverified surface
at a time is the rule. Offer it once 632 is confirmed working.

---

## Build 633 — a thumbnail sized for the tile, and the white boxes go dark (8 Aug 2026)

Theo, after running 631's Optimise on the Onyx Black page: *"39.9 down to 29mb
after optimizing 9"* — and then, having reloaded it: **"Page still feels heavy,
white boxes then loads slow"**.

Three things, and only one of them was the one I had predicted.

### 1. The grid was loading an image 4.8× too big

Measured, not reasoned:

| | | |
|---|---:|---:|
| `oc-colors/onyx-black` display copies | 37 files | **23.94 MB** (663 kB avg) |
| `oc-colors/black-sable` display copies | 26 files | **17.31 MB** (682 kB avg) |
| full originals | 63 files | 224.74 MB |

And the tile, measured in Chromium at his 1194px iPad width: the grid resolves
to **four 269.5px columns**, so about 540 device pixels at 2×. It was being
handed `DISP` — 1400px, sized for the Showcase's compare card at 612 CSS px.
**One rendition was serving two surfaces that differ by nearly 5× in area.**

`THUMB = { max: 640, q: 0.80 }` joins `FULL` and `DISP` in `cr-show-script`,
declared beside them so nobody adds a fourth somewhere else. 640 rather than 800
is a deliberate trade: the iPad in the report gets 2.4 device pixels per CSS
pixel, a phone (one column, ~358 CSS px at 3×) gets about 1.8 — softer than
native, and far lighter. Tapping a tile still opens the full-resolution
original, which is where sharpness actually matters.

The grid signs **three** paths per photo in the same single round trip and falls
back `-t → -d → original`, because three eras of photograph share this screen:
pre-630 (original only), 630–632 (original + `-d`) and 633+ (original + `-t`).
That order is the feature — without it every existing photograph vanishes.

New uploads write **full + thumb**. `DISP` is deliberately no longer written
here: nothing on this screen shows a 1400px image, and a rendition no consumer
reads is upload time and storage spent on nothing.

### 2. The Optimise button was doing the wrong work — my error, named as mine

631 re-encoded the **original** to 3840px. A drone photo is already about that
size, so it was a re-encode, not a resize — which is exactly where *"39.9 down
to 29mb"* came from. I had told him to expect roughly 40 MB down to 2.4 MB.
**That prediction was wrong, and it was checkable before I made it.**

633 makes the button do the thing the page actually pays for:

- the test moved from "has no `-d`" to **"has no `-t`"**;
- it re-encodes **from the display copy** where one exists — 663 kB fetched per
  photo instead of 3.5 MB, which on an iPad over a phone connection is the
  difference between usable and not;
- it writes **only the thumbnail**. The original is never touched, so a failed
  run now costs nothing at all;
- the toast reports **what the page will load next time**, not what the stored
  originals weigh. 631's number was true and told him nothing.

⚠️ At 632 the button is correctly **hidden** — every one of those 63 photographs
already has its `-d` twin, so there was nothing left for it to do. 633 gives it
a new job and it will reappear with all 63 to process.

### 3. The white boxes had their own cause, and it is one line

623 set `--occ-card:#FFFFFF`. The `<figure>` paints from it and shows through
until the image arrives — so an ordinary lazy load **flashed white on a
near-black page** and read as something broken. The image element now carries
the dark ground itself.

Confirmed in Chromium rather than asserted: at 632 the tile image computes
`rgba(0,0,0,0)` over a `rgb(255,255,255)` figure; at 633 it computes
`rgb(35,31,32)`. The side-by-side render reproduces his description exactly — a
stack of glaring white boxes on the left, tiles that read as *loading* on the
right. **347 green assertions could not have told me that.**

### A latent bug found on the way, fixed in the build that would have triggered it

`signMany()` keyed its result **by array position**. True since 630, and it got
away with it because both requested paths usually existed. 633 asks for a third
that is absent on **every** photograph the first time it runs — so a compacted
response would have handed each photo its neighbour's picture. Silent, wrong,
and on a client-facing screen. It now keys by the path the API answered for,
falling back to position.

### One place checks the image toolchain

The first pass gave the optimiser its own copy of the
`window.CardinalShowcase` / `renditions.thumb` guard, because it wants the
thumbnail alone and composing it from `shrinkFor()` would re-encode a 3840px
copy per photo only to discard it. Two copies of an availability check is the
"second mechanism beside the first" smell this project keeps paying for.
`shrinkOne(file, name)` is now the one place; `shrinkFor` composes it, the
optimiser calls it directly. Asserted: `window.CardinalShowcase` appears
**exactly once** in the module.

### Verification

`check_build.py` green, negative-controlled. `harness_ourroofs.js` grew to
**58 assertions**, green on 633 and **27 red on 632** — every changed behaviour
named. All eight harnesses green (633 assertions across the set, which is a
coincidence worth nothing). Plus the Chromium render above, and the geometry
measured rather than read off the stylesheet.

⚠️ **Theo's eyes remain the gate**, and the honest limit is this: the *projected*
page weight is arithmetic from the pixel-area ratio, not a measurement. The
toast will report the real figure the first time he runs Optimise. What is
measured is what the page loads **today** — 23.94 MB of display copies for Onyx
Black alone.

---

## Build 634 — the Community Partners crash, and stack traces out of the job thread (8 Aug 2026)

Theo photographed job 1002 (Zulema Hall — Habitat for Humanity) with a raw
JavaScript stack trace sitting in the Thread as if it were a job note, and asked
for it to be fixed. **That screenshot is two separate defects**, and only one of
them is the thing you can see.

### A. The directory was broken for the sales reps, every time

`renderDirectory()` in `cr-cpartners-script` renders Edit/Archive behind a
condition and then wired them unconditionally:

```js
'<div class="btns">' + (p.__masked ? '' : '<button data-act="edit">…')
…
row.querySelector('[data-act="edit"]').onclick = …     // null on a masked row
```

`maskIfConfidential()` masks a partner flagged `confidential` for anyone outside
`ADMIN_EMAILS` / `PROD_EMAILS`. So theo@, joan@, curtis@ and scottie@ never saw
it, and **the sales reps were exactly the people who crashed.**

Confirmed against production rather than inferred:

| Evidence | Conclusion |
|---|---|
| **2 of 10** `community_partners` are `confidential` and un-archived | it fired every time, not in an edge case |
| the reporter is **clarkie022@gmail.com** | in neither privileged list — a rep |
| the stack names `openEditor(get(id))`, one argument | the **partners** directory, not the properties one (`openEditor(partnerId, get(id))`) |

⚠️ **The damage was bigger than one toast.** The throw is inside a `forEach`, so
it aborted the loop: the masked row **and every row after it** got no handlers
at all. Edit and Archive were dead on a list that still looked perfectly normal.
`openDirectory` is `async`, which is why it surfaced as an unhandledrejection.

**The fix already existed ten lines above.** `renderProspects()` does exactly
`var b = …; if(b) b.onclick = …`. Copied the neighbour — no new mechanism, and
nothing about what renders changed.

⚠️ **The PROPERTIES `renderDirectory` (~31469) was deliberately left unguarded.**
Its two buttons are unconditional, so a guard could not fix anything today and
would convert a future regression from a loud crash into a **silently dead
button — class 16, the worse failure.** The guard belongs in the partners
directory precisely *because* the absence there is deliberate and known. Both
halves of that are asserted, so nobody "finishes the job" later.

### B. A stack trace should never be a job note

`capture()` stamps every client error with `project_id: currentProjectId()` —
whatever job happened to be open when it fired. The Community client page loads
`audit_events` for the project with **no type filter** and renders `e.detail` as
the entry **title**, so a 412-character stack trace became a bold thread card.

The error had nothing to do with Zulema Hall; he simply had that job open when
the partner directory blew up.

Fixed at the consumer, not the source. `var THREAD_SKIP = { client_error:1 };`
shaped like `IC_SKIP` / `PIPE_SKIP`, and applied **at load**, deliberately:
`events.length` feeds `key()`, so filtering at render would let an incoming
error change the key and repaint the whole page.

- **The project stamp stays** — knowing which job was open is useful in a bug report.
- **Nothing is deleted.** The Team audit log reads the same table and *should*
  keep showing every error. No SQL in this build.
- Checked: that log is the only other consumer, so this was the only thread affected.

Of the five `client_error` rows in production, **one** carries a `project_id` —
the one he photographed. The other four are Theo's own, all `project_id` NULL
(three are the pre-630 10 MB upload refusal, already fixed).

### ⚠️ The anchor trap, caught by the tool rather than by me

The first run aborted: `var LABEL = {` matched **twice**. There are **three** in
the file and the **two community ones are byte-identical** — CLAUDE.md warns
about `LABEL` finding the *insurance* map, but the real trap is worse than the
documented one. My assertion was correctly scoped to the `cr-cc` block and said
1; `pl.sub()` splices **file-wide** and found 2.

**Scoping the assertion is not enough if the substitution is global.** Re-anchored
on `async function load(pid){` + its first line, which is unique file-wide, and
which also puts the constant beside its only consumer. Nothing was written — the
gate did its job.

### Verification

`check_build.py` green, negative-controlled. **New `harness_partners.js` — 23
assertions**, and the ones that matter **execute the shipped
`maskIfConfidential` / `list` / `get` / `renderDirectory`** under jsdom as both
an admin and a rep, then ask the DOM what actually got wired.

**The negative control reproduces his symptom exactly.** Against 633:

```
admin: renderDirectory completes without throwing   PASS
rep  : renderDirectory completes without throwing   FAIL
       → Cannot set properties of null (setting 'onclick')
```

Same code, different user — which is why it looked like a data problem and was
not. (Safari words the same throw as *"null is not an object"*.) 5 red on 633,
23 green on 634. All ten harnesses green.

It also asserts the masking still holds — that the confidential name is **not in
the DOM** for a rep — so a "fix" that simply rendered the buttons could not pass.

⚠️ **Theo's eyes are still the gate**: a rep opening Community Partners is the
real test, and I cannot sign in as one.

---

## Build 635 — the prospects mask bypass, closed (8 Aug 2026)

Theo, after 634 shipped and I flagged this as found-but-unfixed: **"Close it"**.

### ⚠️ First, a correction to what I told him

I said the Prospective Partners screen "reads around the confidentiality mask."
**Half of that was wrong**, and I should have checked before saying it:

```js
function prospects(){
  return (CACHE || []).filter(function(p){ return !!p.prospective; })
                      .map(maskIfConfidential);        // ← it DOES mask
}
```

**The list was always safe.** A confidential prospect already rendered as
"Confidential Partner" with no contact name, phone, email, address or notes. The
harness confirms it: `rep: the secret name is NOT in the list` passes on **634**
as well as 635.

### The real hole was one tap wide, and it was real

`renderProspects` rendered `<button data-act="edit">` **unconditionally** —
unlike `renderDirectory`, which has always hidden it behind `p.__masked ? '' : …`.
Its handler calls `getRaw(row.dataset.id)`, the deliberately **unmasked** lookup,
and hands the real row to `openEditor`.

So a rep saw "Confidential Partner" in the list, tapped Edit, and the form opened
pre-filled with the real name, contact, email, phone, address and notes.

Not exploitable at the time — measured 4 prospective/not-confidential and
2 confidential/not-prospective, **zero overlap**. It opened the moment anyone
ticked Confidential on a prospect, which is a checkbox an admin already has.

### Three parts, and the third is the one that fences it

1. **No Edit button on a masked prospect.** `renderDirectory`'s ternary, copied
   exactly — same shape, same module, ten lines apart. The `if(b)` guard below it
   handles the absence, and **that guard is build 634's fix earning its keep the
   very next build.**
2. **The CONFIDENTIAL chip**, so the missing button is *explained*. The directory
   already showed one; prospects did not. A control that is silently absent reads
   as broken — this project's own rule is that a correct refusal must never
   render as a failure. Same markup, so the two lists read as one feature.
3. **`openEditor` refuses to unmask for a non-privileged caller.** This is the
   fence; 1 and 2 are the UI in front of it. `getRaw()` turns an id into unmasked
   data and `openEditor` calls it on **every** id it is given, so without this the
   mask is only as strong as every present and future caller. It alerts rather
   than returning silently, because a silent return is itself a dead control.

⚠️ **Part 3 is deliberately NOT the same judgement as 634's** "do not add a
speculative guard to the properties directory". That rule is about **controls**,
where a guard hides a regression behind a dead button. This is a
**confidentiality boundary**, where a second check is the whole point — and the
class has bitten this project before: `CLAUDE.md` records that reading `CACHE`
directly once "leaked confidential partner names out of `pickPartner()`".

Admins are untouched. `isPrivileged()` is the same test the rest of the module
uses, and editing a confidential partner is exactly what it exists for.

### ⚠️ A hardcoded count failed in the same session that documented the class

The first run aborted on my own scope proof:

```python
assert NCP.count('.map(maskIfConfidential);') == 1 and NCP.count('.map(...)') == 3
```

Both numbers were guesses. The real answers are **3 and 4**. That is
BUG_CLASSES **class 15, rule 4** — *prefer counts that scale over today's number*
— and I wrote that rule three builds ago. Replaced with a self-computing
assertion: this build changes no masking, so the count must be **identical**
before and after, whatever it is. Nothing was written; the gate did its job.

### Verification

`check_build.py` green, negative-controlled. `harness_partners.js` grew
**23 → 42**, and the new section is the one that matters: it renders the real
`renderProspects`, finds the confidential row, **takes the tap**, and reads what
`openEditor` was actually handed. Asserting the button is absent would not have
been enough — that is exactly the mistake 632 taught.

**The negative control demonstrates the leak rather than arguing it.** On 634:

```
rep: having tapped it, nothing unmasked was handed over   FAIL
  → {"id":"pr-conf","name":"Ohio Valley Restoration LLC", …
```

A row labelled "Confidential GC Partner", one tap, the full record. 10 red on
634, 42 green on 635. All ten harnesses green.

It also asserts the **admin** path still works — that a privileged user taps Edit
and *is* handed the real row — so a fix that simply broke editing could not pass.

---

## Build 636 — one location card, and it is the Google one (8 Aug 2026)

Theo, from an Insurance client profile: *"in all client profiles there's 2
locations, can you get rid of the one that's not the google one."*

He was right — there were two, built on entirely different stacks:

| | what it was |
|---|---|
| `.cr-gmap-block` | a Google **static** map + Directions / View on Maps, injected into `#projectView` by `maybeInsertProfileMap()` on every `scan()` |
| the **Location** card | `#dbMap`, a **Leaflet** map geocoded through **Nominatim**, Map/Satellite tabs (satellite via **Esri**), plus the address and the pencil |

Three map providers on one screen. The Leaflet one is the one that said
*"Could not pin this address."*

### ⚠️ Why the obvious fix was wrong — and why he was asked first

Deleting the Location card was the literal request and would have broken two
things nobody would have noticed until later:

1. **It carries the only rendered address text and the only `#acxEdit2` pencil.**
   `#acxEdit1` appears solely in the click handler — it is never rendered — so
   that pencil is the address editor on this screen.
2. **Community has no Google card.** `maybeInsertProfileMap()` only runs on
   `#projectView`; the Community client page calls `adoptLocation()`, which
   **moves** the `.acxsec` containing `#dbMap` into `#cr-cc-loc`. Remove `#dbMap`
   and it finds nothing and prints *"No location on file yet."*

Offered three shapes. He picked **one card, Google map**, which is the only one
that loses nothing.

### What shipped

`dbInitMiniMap` now paints an `<img>` from `CardinalMaps.staticMapUrl()` —
no map library, no tile server, **no geocode round trip**, because Google
resolves the address inside the URL. The Map/Satellite tabs still work: they set
`maptype` and repaint through one exported setter (`window.dbSetMapType`), since
the tab handler lives in its own `cr-keeper2-script` block and cannot see that
closure. Directions, the address and the pencil are untouched.

`maybeInsertProfileMap()` is gone — definition and call. It ran on **every**
scan, and `scan()` is driven by a MutationObserver on `document.body`, one of the
fifty this file carries.

**Community gets a working map here for the first time**, because it adopts this
same node and its Leaflet copy failed identically — same geocoder.

Measured rather than asserted: **30 projects, all with an address, 17 with a
cached pin** — so the Leaflet map had failed or never been opened on 13. Two
addresses carry a doubled `, USA,` (the screenshot's 9222 Arlington is one),
which is what Nominatim choked on.

⚠️ **`qiLoadLeaflet()` is NOT removed** — it has a second caller with its own
forward *and* reverse Nominatim lookups, and there is a batch geocoder in a
`step()` loop besides. Only this screen stopped using Leaflet. The cached
`ck.geo` values are left in place too; nothing reads them now, but deleting data
to tidy up is how a rollback becomes lossy.

### ⚠️ THREE assertion failures, all mine, all class 15 — in the session that documented it

1. **`nominatim… == 0` file-wide.** Wrong, and right to fail: a second Leaflet
   map elsewhere has its own lookups. Replaced with a `drops(needle, 1)` helper
   that requires the count to fall by **exactly one**. Guessing zero would have
   demanded deleting a feature I never looked at.
2. **`maybeInsertProfileMap() == 0`.** Matched **my own replacement comments**,
   which name the function in prose. Rule 1 of the class. Fixed by asserting on
   syntax — `function maybeInsertProfileMap(` and `maybeInsertProfileMap();`.
3. **A literal script tag inside a code comment** turned the gate red at
   **110 open / 109 close**. `check_build.py` counts tags across the whole file,
   comments included. Reworded, and `src.count('<script') == orig.count('<script')`
   is now asserted so it cannot recur.

Plus one in the harness: extracting the setter with `[^;]+;` **truncated it at
the first semicolon inside its own body** — CLAUDE.md's "a pattern using `[^;]`
cannot see a whole expression", hit while writing the test for it. Extracted by
line instead.

### Verification

`check_build.py` green, negative-controlled. **New `harness_location.js` — 24
assertions**; the executed half runs the shipped `dbPaintMap` against a stubbed
`CardinalMaps` and asks the DOM what was drawn, then **switches the tab and asks
again** — a regex cannot see that a tab repaints. It also runs the no-key case
and requires the card to *say* the key is missing rather than leave an empty box,
which would read exactly like the failure this build removed.

Negative control on 635: **16 red, 8 green**, and the executed section is wrapped
so it reports clean FAILs instead of throwing. All eleven harnesses green.

⚠️ **Theo's eyes are the gate.** I cannot load a Google static map from this
sandbox, so "the image renders" is proven only as far as the correct URL being
built and painted.

---

## Storage config — PDF scopes could never upload (9 Aug 2026, no build number)

Theo: *"when trying to upload Adam Gunn's scope there was an error."*

**Not an app bug, and no build of the app could have fixed it.** The scope
uploader (`toStorageUrl`) writes to `photos` under `scopes/…` and *defaults the
content type to `application/pdf`* — it knows a carrier scope is a PDF. But the
bucket's `allowed_mime_types` was images only, so Storage refused it before it
landed. It failed on **every** PDF, at any size.

`photos` now also accepts `application/pdf`, and the cap went **10 MB → 25 MB**
(a scope with photographs in it routinely passes 10 MB). Applied to production
on his explicit yes; recorded as `photos_bucket_pdf.sql`, idempotent.

⚠️ **The same bucket takes `work_orders/…` and `nachi/…`**, both of which pass a
real filename through — so PDFs failed there too. One change covered all three.

**How it was found, which is the reusable part:** no `client_error` row existed
for it — the uploader throws a plain `Error` that nothing reports — so there was
nothing to read. Instead: list every `storage.from(...).upload(` site and its
bucket, then read the bucket's own config. The mismatch was visible in one query.

⚠️ **`scope_pdf_url` on `insurance_claims` has no writer anywhere in
`index.html`.** The scope upload does not populate it. Not touched — worth
knowing before someone assumes that column means something.

### Also found, NOT fixed, and Theo has ruled on it

The insurance stage vocabulary exists in **four copies** that have drifted:
Cardinal Truth's `RAIL` calls `Invoiced` *"Awaiting Depreciation / Supplements"*
and `Closed` *"Closed"*, while the three `LABEL` maps say *"Awaiting RCV"* and
*"Archived"*. `RAIL` also carries a **`supplement` row that is not a stage** —
synthetic, driven by supplement data, so no job can ever sit in it.

Asked him whether that was what he meant by *"the pipeline for insurance is
completely different."* **He answered: different from retail/community — i.e.
working as designed.** So the drift is recorded, not repaired. Do not "unify" the
four maps without asking; the pipeline is deliberate.

---

## Pencil audit — all 13 render AND wire (9 Aug 2026, no build)

Theo: *"Check all edit pencils and make sure they work as intended."* Reasonable
ask after **BUG_CLASSES class 16** (a control that renders but is never wired —
the Studio Archive button did nothing from 614 to 632).

**Every rendered pencil has a live handler.** Swept by glyph (`&#9998;`,
`✏`, `✎`), by class (`acxpencil`, `editpencil`), and by
`data-act="edit"` / `data-cc-edit*`, then each was traced to what it opens:

| control | opens |
|---|---|
| `#msValEdit` "Edit values" | `openMeasModal(pr)` — delegated `closest()` |
| `#acxEdit2` Location card | `openProjModal(pr)` |
| `#projEditBtn` client info | `openProjModal(currentProject)` |
| `#insEditBtn` insurance panel | `openInsuranceEditor(currentProject)`, guarded |
| `.tmib.tmed[data-edit]` team | toggles `.editing` inline — no modal, by design |
| Claim Info `[data-act=edit]` | `openNewClaimModal(c)`, guarded `if (e)` |
| partners directory | `openEditor(get(id))` — guarded at **634** |
| prospects | `openEditor` — button hidden when masked at **635** |
| properties directory | `openEditor(partnerId, get(id))` |
| `[data-cc-editbid]` bid | `showBidModal(pr)`, guarded `if(pr)` |
| homeowner `data-act="edithome"` | `CardinalNewBid.edit(pr.id)` |
| caption `[data-act=edit]` | the caption editor |
| `.lb-cce[data-cc-edit]` | `ccEdit()` — draw on a CompanyCam photo |

### ⚠️ One false alarm, reported as a false alarm

`#insEditBtn` calls `addEventListener('click', …)` on every render with **no
wired-once guard**, which looks like classic listener stacking. **It is not.**
The button lives inside the `innerHTML` string that is reassigned to `mount`
each render, so the old element is destroyed and a **fresh** button receives
exactly one listener. Correct as written — do not "fix" it with a guard.

### The one dead thing, and it is cosmetic

**`#acxEdit1` is referenced but never rendered.** The handler reads
`if(hit('#acxEdit1') || hit('#acxEdit2'))`, and nothing in the file emits an
element with that id. Harmless — it is one side of an `||` — but it makes the
Location pencil look like it has a twin somewhere. Noted at 636; left alone
rather than swept up mid-audit.

---

## Domain: what a supplement actually is at Cardinal — Theo, 9 Aug 2026

Recorded verbatim because domain detail from him is load-bearing, and because
**this changes what the Cardinal Truth rail should model.**

> *"we usually file a supplement because of a partial denial and then there's the
> backend supplement and paid when incurred filing at end of job with
> certificate of completion with photos sent for release of depreciation"*

That is **three distinct filings**, not one:

1. **The partial-denial supplement.** Filed *because the carrier approved part of
   the scope and denied part*. Happens around Scope Approved, before the build.
2. **The backend supplement.** A later one, after the first is settled.
3. **The "paid when incurred" filing at end of job** — a **certificate of
   completion** plus **photographs**, sent to release **depreciation**.

⚠️ **The rail models one of these, badly.** `RAIL` in `cr-cth-script` has a
single synthetic `supplement` row that no job can occupy, and folds everything
after the build into `Invoiced → "Awaiting Depreciation / Supplements"`. By his
description, supplements happen at **two different points** and the depreciation
release is **its own filing with its own artifacts**, not a waiting state.

He said *"Supplement filed probably should be somewhere tho"* — so the row
belongs; the question is where and how many. **Not built. Put a shape to him
before touching the rail** — this is a data-model question (does a supplement
become a row with a filed date, an amount and a decision?), not a relabelling,
and `insurance_claims` already carries `supplement_status`, `supplement_filed`,
`supplement_approved`, `supplement_filed_at`, `supplement_decided_at` and
`supplement_notes` that nothing on the rail reads.

**Do not "unify the four stage vocabularies" as a side effect of this.** He ruled
separately that the insurance pipeline differing from retail/community is by
design.

---

## Build 637 — the address on the Location card, readable in dark mode (9 Aug 2026)

Theo: *"Cannot hardly read address on card in dark mode."* He was being polite.

**Measured in Chromium, not eyeballed:**

| | ink | card | ratio |
|---|---|---|---:|
| retail **dark** | `#cfd6df` | `#ffffff` | **1.46:1** |
| retail light | `#161616` | `#ffffff` | 18.10:1 |

The floor for body text is 4.5:1.

**The cause is one declaration.** `.acxsec{background:#fff}` has **no dark twin
anywhere**, while `.dbaddr{color:var(--rbe-ink,#cfd6df)}` flips `#161616` →
`#cfd6df` with the theme. The ink was tokenised against a theme its own
background does not follow.

⚠️ **It is the only thing on that card that does this.** Every sibling —
`.acxbody`, `.ackv > span`, `.ackv > div`, `.axnote`, `.dbprim b`, `.dbrep b`,
`.dbassign`, `.acxtrs label` — pins no colour at all in the base stylesheet;
they inherit and read correctly on white. Every `--ct-*` rule that turns up in a
grep for them is scoped to `body.claim-insurance`. So the fix is genuinely local.
My first instinct was to give `.acxsec` a dark twin, which would have restyled
every retail card in dark mode off one report.

### ⚠️ A RENDER CAUGHT ME SHIPPING A REGRESSION, and then caught my test too

**First attempt:** change `.dbaddr` globally to a fixed dark ink, plus a
`body.claim-insurance … .dbaddr{color:var(--ct-ink)}` override. Chromium said
insurance went to **1.06:1** — worse than before.

**Then the second correction, which matters more than the first.** That number
was itself an artifact: **`--ct-*` is gated on `[data-rltheme="docket"|"siren"]`
— a THIRD theme attribute**, alongside `data-theme` (`--rbe-*`) and `data-mode`
(the landing page). My harness set only `data-theme`, so every `--ct-*` value it
resolved was a fallback. *The test was wrong, not the app.*

With `data-rltheme` set correctly, insurance was **fine all along**: 13.58:1 in
siren, 17.09:1 in docket. My "insurance is broken" reading and my "fix" for it
were both wrong, and only a corrected render showed it.

**So this build touches retail only** — one scoped rule, insurance and community
left on the exact declaration they had:

```css
body:not(.claim-insurance):not(.claim-community) .dbaddr{color:#1e2432}
```

Fixed rather than tokenised because the *ground* is fixed. Same call CLAUDE.md
already records for the seventeen `color:white` on a coloured ground.

**Rendered, before and after, across every theme × CRM** (`render_dbaddr.js`):

```
              BEFORE            AFTER
retail dark    1.46:1  <-- bug  15.51:1
retail light  18.10:1           15.51:1
insurance siren  13.58:1        13.58:1   (untouched)
insurance docket 17.09:1        17.09:1   (untouched)
```

### 📌 A SECOND, PRE-EXISTING PROBLEM THE RENDER FOUND — not fixed, not verified

With `body.claim-community` on `#projectView`, the address renders
**`rgb(242,244,243)` on `rgb(255,253,247)` — 1.09:1.** `body.claim-community
.acxsec:not(.rvsec)` grounds the card in cream `#fffdf7`, while
`body[data-crm="community"] .dbaddr` inks it near-white from `--ccm-ink`.

⚠️ **I am NOT claiming this is live.** In the real Community client page
`adoptLocation()` **moves** that `.acxsec` into `#cr-cc-loc`, where
`#cr-cc .cc-loc .acxsec{background:transparent !important}` sits it on a dark
ground and near-white ink is right. My harness renders the pre-adoption state.
It may be a transient flash, a real bug when adoption does not run, or nothing.

**Not touched.** I have now been wrong twice this build about a CRM I cannot
open, and the correct next step is a screenshot of a Community job in dark mode,
not a third guess. Recorded so it is not lost.

---

## Build 638 — a claim with nothing in it is not a claim (9 Aug 2026)

Theo: *"when starting the claim after profile is made, if you put no info and
just accept it will take you to this screen instead, with no way to upload
scope. And not attach to client (unknown)."*

**He reproduced how the junk got in.** `insurance_claims` holds four rows:

| created | homeowner | address | carrier | project |
|---|---|---|---|---|
| 23 Jul | `grdgdfg` | `dfgfdg` | — | null |
| 24 Jul | — | — | — | null |
| 29 Jul | — | — | — | null |
| 7 Aug | Maker Space Solutions LLC | 1630 E 5th St | State Farm | **set** |

Every field goes through `get()`, which returns null when empty, and `status`
falls back to `'filed'` — so an untouched form inserted a row of nulls and the
detail screen rendered exactly what he photographed.

### ⚠️ The "not attached" half is NOT a bug — all four entry points traced

| path | passes a project id? |
|---|---|
| `CardinalClaims.new(projectId)` — the API | yes, optional |
| `crNewClaimFromHub(projectId)` | passes it through |
| **"+ Start Claim Record"** on a client profile | **yes, `pid`** |
| **"+ NEW CLAIM"** on the claims list | **no — no client is selected there** |

The profile paths already attach, and the 7 Aug claim proves it. The list button
has nothing to attach to; that is inherent to starting from the list, not a
defect. **So "unknown, and not attached" is one root cause wearing two faces: an
empty claim created from the list.** Require identity and both symptoms go.

### The fix

Refuse to save unless the claim can be identified by **any one** of homeowner,
property, carrier, or claim number. One is enough deliberately — a claim really
does start as *"State Farm, number pending"* or *"the Gunn place, carrier
unknown"*. Demanding a particular field would be inventing process; demanding
*something* is just refusing to write a blank row.

Placed before **both** writes, so neither insert nor update can blank a claim.

### Verification

**New `harness_claimguard.js` — 15 assertions.** It lifts the guard's own source
by paren-matching and **executes it against the real payload shapes**, including
the three junk rows verbatim:

```
REFUSED: 24 Jul junk — all null          REFUSED: all blank strings
REFUSED: 29 Jul junk — all null          allowed: carrier only, number pending
allowed: 23 Jul junk — typed nonsense    allowed: claim number only
allowed: 7 Aug real — State Farm         allowed: property only, carrier unknown
```

⚠️ **23 Jul is allowed on purpose.** `grdgdfg` is nonsense, but it is nonsense a
person typed. The guard's job is to stop a BLANK row, not to judge what someone
meant — refusing it would need a rule nobody has agreed.

Negative control on 637: **10 red**, wrapped so it reports FAILs rather than
throwing. All twelve harnesses green.

⚠️ Extracting the condition by offset (`i - 4`) grabbed the `if (` and made
`new Function` throw. Paren-match it — same family as the `[^;]` trap.

### Deliberately NOT built — both belong to his insurance write-up

- **No scope upload on the claim screen.** `cr-claims-script` has **zero** file
  inputs and **zero** storage calls; there has never been one. `scope_pdf_url`
  exists on the table with **no writer anywhere** in `index.html`. That is a
  feature to design with him.
- **No forcing the list's "+ New Claim" to pick a client.** Whether a claim may
  exist before a client does is a process question and it is his.

⚠️ **The three junk rows are NOT deleted.** Offered twice, no answer. Deleting
production rows unprompted is not mine to do, and they are harmless.

---

## Build 639 — the Scope of Loss card was hidden by CSS all along (9 Aug 2026)

Theo: *"There is no way to attach a scope upload to Adam Gunn ... In the new
claim menu it says attach to existing client but since I skipped the claim
upload there is no way to upload a scope for Gunn."*

**He is exactly right, and it is one selector.**

`renderSolCard()` builds a "Scope of Loss Reader (AI)" card on every client
profile — upload control, AI extraction, and it even retitles itself "Update
from Scope of Loss" when the client already has insurance fields. It runs. It
has always run. Then this paints it out:

```css
#tab-overview > *:not(#acxMount):not(#cr-pp-mount){display:none !important;}
```

`<div id="solCard"></div>` is a **direct child** of `#tab-overview` — depth 0,
verified by walking div depth from the container, not assumed.

⚠️ **Third victim of this exact rule.** The 609 comment in this file already
describes it: *"607 added Punch Outs to #jaGrid instead — the legacy grid hidden
by #tab-overview's display:none rule, the exact trap 604 was about."* It is
BUG_CLASSES 16's sibling — not a control that was never wired, but one that is
wired, rendered, and painted out.

**And the app sends him straight at it.** The Scope of Loss modal's second
choice reads, verbatim: *"Add to an existing claim — Open the client, then use
the Scope of Loss card on their profile."* Its handler closes the modal and
opens the Insurance Clients list. So the one instruction the app gives for
adding a scope to an existing client points at a card CSS had hidden.

**Fix:** add `#solCard` to the allow-list. One selector.

⚠️ **Not a speculative unhide.** Every other direct child there is genuinely
retired — the markup says so out loud (*"retired by Keeper (build 348) but kept
in the DOM because boot-time listeners attach to them unguarded"*) and they all
carry their own inline `display:none` too. `#solCard` carries none, is written
to on every render, and is a live modal's documented destination. Asserted that
the rule still has **exactly three** exemptions, so this cannot drift into a
general unhide.

**Rendered in Chromium** (`render_solcard.js`), because `display:none !important`
out of a `:not()` list is precisely what jsdom cannot resolve:

```
              BEFORE            AFTER
solCard       none (0 height)   block (visible)
acxMount      block (visible)   block (visible)
cr-pp-mount   block (visible)   block (visible)
contactRow    none (0 height)   none (0 height)   <- legacy stays hidden
```

### The "+" menu — never built, and it says so

`#ctPlusMenu` holds three buttons: **"New Claim — soon"**, **"Adjuster note —
soon"**, **"Supplement — soon"**. No ids, no `data-act`, no handlers anywhere.
Not a regression and not class 16 — they are honestly labelled placeholders.

⚠️ **Theo's directive, recorded for when they are built:** *"Plus new should
absolutely make you pick a client first."* Do not build those buttons without
it. It also settles the open question from 638 — the claims-list "+ New Claim"
should require a client rather than creating an unattached claim.

---

## Tooling — `next_build.py` repaired (9 Aug 2026, no build number)

**Not a build. `index.html` is untouched, the app stamp stays 639.**

`next_build.py` is the script that exists specifically to stop two sessions
claiming the same build number. **It had been blind since 574**, and on 9 Aug it
told a parallel session that 637 was free while `claude/cardinal-roofing-letterhead-o5hl17`
was already stamped 637. That session took 638 — which by then was *also* mine.
Two PRs, one number.

### Why it was blind

```python
ENTRY = re.compile(r"\{ build:(\d+), note:'([^']{0,60})")   # old shape ONLY
```

Build 574 **added** the `{ b, d, t, s }` entry shape **beside** `{ build, note }`
rather than replacing it — both are live, interleaved in one `CHANGELOG` array,
and the app's renderer normalises them on purpose. So every branch parsed to an
identical 275 old-shape entries, `new`/`bad`/`edited` were always empty, and

```python
if new or bad or edited:      # <- every branch failed this, so every branch
```

skipped the branch **entirely** — it was never printed and its number never
reached `highest`. A branch that had claimed a build was *invisible*, not merely
under-counted.

### The fix, both halves

1. `ENTRY_OLD` + `ENTRY_NEW`, merged in `index_at()`.
2. `highest` now folds in **every branch's stamp**, before and independent of the
   print guard. Deliberate belt-and-braces: the entry regex is one assumption
   about a shape that has already changed once, and the stamp is what
   `check_build.py` actually gates on. If the shape changes again the safe-number
   answer stays correct while the parse goes quietly blind.

Plus a "stamped at or below main — must be re-stamped to merge" note, since a
branch behind main's stamp cannot pass the label gate.

### Proof, and one self-inflicted misstep

Run against the live remote it now surfaces the **real** clash the broken version
called "No collisions":

```
build 638 on claude/production-handoff-taxonomy-g3fg09
    main says   : A claim can no longer be saved empty
    branch says : Team alerts: one send, and only from inside the app
```

Exit 0 -> exit 1 on the same repo state. It also catches the known 584 clash.

⚠️ **My first version printed the stale-stamp warning for every branch — 55
lines, burying the two collisions that mattered.** An abandoned 427-era branch
being behind main is not news. Now only branches doing current work are listed
individually and the rest collapse to one summary line. `highest` is computed
before that filter, so the safe number never depended on the display choice.

`--self-test` gained a dual-shape parse case, **negative-controlled**: it fails
against the old single-shape regex, so it is not an assertion that matches its
own prose (BUG_CLASSES 15).

---

## 641 — the rest of the insurance cards, which 639 left behind

**Theo, after asking for a safety check on 639: "1"** — unhide the three, leave
the Scope of Loss card showing everywhere.

### 639's own comment was wrong, and that is why it was partial

It claimed *"every OTHER child here is genuinely retired legacy and carries its
own inline display:none as well."* **False.** Four children of `#tab-overview`
are LIVE, and their renderers set display at runtime:

| child | renderer | what it does |
|---|---|---|
| `insCard` | `renderInsurancePanel` | `mount.style.display='block'` |
| `insDocsCard` | `renderInsuranceDocsCard` | `mount.style.display='block'` |
| `insItelCard` | `paintInsuranceItelCard` | `mount.style.display='block'` |
| `leadCard` | `renderLeadCard` | `card.style.display='block'` |

**Not one of those assignments can work.** An `!important` stylesheet
declaration outranks a **normal** inline style — only an inline `!important`
would beat it. Confirmed in Chromium, because this is a cascade question that
neither jsdom nor reading the code can answer:

```
insCard   as-shipped none (0px)  ->  after its renderer sets 'block':  STILL none (0px)
```

iTel shipped at **406**; Keeper retired this container at **348**. They were
built into a container that was already dead and have **never once rendered**.

### The impact was not theoretical

Of **30** projects exactly **one** has `lead.claim_type = 'insurance'` — **Adam
Gunn**, the client Theo could not work. All three cards self-gate on
`projClaimType === 'insurance'`, so his profile is the only place the absence
was ever visible. *"There is no way to attach a scope upload to Adam Gunn"* was
one symptom of the whole group being invisible.

⚠️ **A wrong query nearly sent this the other way.** A first pass read
`checklist->>'claim_type'` and reported **null for every project including
Gunn**, which would have made "gate the SOL card to insurance" look like it
broke his case. `projClaimType()` reads `parseCkAll(pr).lead` — the value lives
at `checklist.lead.claim_type`. Correct path: community 14, retail 12,
**insurance 1**, unset 3. Read the accessor before trusting the query.

### Why exempting them decides nothing

Each renderer opens with the same guard:

```js
if(ct !== 'insurance'){ mount.style.display = 'none'; mount.innerHTML = ''; return; }
```

So on the 26 retail/community profiles they hide themselves. The exemption hands
control back to the renderers.

`leadCard` is **deliberately not exempt** — it is the real pre-Keeper card
`acxMount` replaced at 348. It still **runs** (that is how these four renderers
get called at all) while painting into a hidden element, exactly as the markup
comment describes. Unhiding it would put the old profile under the new one.

`renderSolCard()` keeps **no** claim-type gate, so SOL still shows on every
profile. Theo's pick; whether a scope belongs on a pre-claim profile is part of
the insurance write-up.

### Gates

`check_build.py` green, stamp **639 → 641** (640 was taken by a parallel branch —
the repaired `next_build.py` saw it, which the broken one could not).
**13 harnesses, 723 assertions**, all green.

New `render_inscards.js` — lifts the rule and the child list **out of the
artifact** so it is a real negative control: against 639 it goes **RED on
exactly the three cards** plus the exemption count.

⚠️ **It first reported a false RED on a correct build.** `#cr-pp-mount` is not
in the markup — the punch card creates it at runtime and inserts it as a sibling
of `insCard`. The harness asserted on an element that did not exist. It now
injects it the way the app does, same anchor order. Half of all reds are the
test's fault; this was one.
## Build 642 — /api/notify was public, and it was sending everything twice (9 Aug 2026)

`api/notify.js` + `index.html`. **No SQL.** Two defects in one pipeline, shipped
together because fixing either alone leaves the other silently broken.

- **The route had NO session check.** It touched `req` exactly twice —
  `req.method` and `req.body`. Every sibling gates (`organize.js`, `analyze.js`,
  `caption.js`, `librarian.js`); this one never did. Merely noisy while it was
  push-only; **611 added Resend email and passes `to: emails` straight from the
  request body**, which turned it into a relay able to send mail *from* Cardinal's
  account to any address, and to push to any team member in `push_subs`
  (`firstname@cardinalrenovations.net` — guessable). `requireSession()` copied
  from `organize.js`; it runs **before** the `web-push` import.
- **`index.html` had a second, unauthenticated sender since build 527.** A
  wrapper around `notifyTeam` fired its own request to the route with no
  `Authorization` header and `.catch(function(){})` swallowing everything, *then*
  called the real `notifyTeam` — so **every team alert went out twice**, one of
  the two unauthenticated. Deleted. One pipeline per concept.

⚠ **A correction to 611's account, found here.** 611 says `emails` was undefined
on "all seven call sites". True of the inner `notifyTeam` only — **the 527
wrapper always sent the canonical `{emails,title,body,url}`**, so well-formed
requests *were* reaching the route all along. The route has been exercised; what
it did with the push is the still-open `VAPID_PRIVATE_KEY` question, not this.

Verified: `check_build.py` green (106 scripts, stamp 641→642, marker
`Do not reintroduce a second sender` present and **absent from prev**) ·
**18-assertion** Node harness against the **shipped** handler — no token,
non-Bearer, forged token, session with no email, auth server unreachable
(**fails closed**), valid session, GET — each also asserting *nothing was sent* ·
**8-assertion** client test proving one caller remains and it carries the token ·
both negative-controlled against 636 (**12** and **3** failures).

⚠ **The harness cannot prove the 636 route would have sent.** `web-push` is not
installed here, so ungated 636 dies at the import and the three "nothing sent"
assertions pass on it too. In production the library exists and it would have
reached `push_subs` and Resend. The 401 assertions carry the proof; those three
do not discriminate.

⚠ **`scripts/next_build.py` gave the wrong answer and nearly caused a collision.**
It said 637 was free; `origin/claude/cardinal-roofing-letterhead-o5hl17` is
stamped **637** with a `{ b:637 }` entry. Cause: `ENTRY` matches the **pre-574**
changelog shape `{ build:N, note:'…' }`. `index.html` still carries **both**
arrays — 275 old-shape entries (to build 600, ~line 35314) and 35 current-shape
`{ b:… }` ones — so the regex finds an identical 275 on every branch, no branch
ever appears to add a build, and **branch collision detection has been dead since
574**. This build took 642; 638, 639 and 641 all landed on main while it was open. *(Also: CLAUDE.md says the old array "now exists only
in git history" — it does not, it is still in the file.)*