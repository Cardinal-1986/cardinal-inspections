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
