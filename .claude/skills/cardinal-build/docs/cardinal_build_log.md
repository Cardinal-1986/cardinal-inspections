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
