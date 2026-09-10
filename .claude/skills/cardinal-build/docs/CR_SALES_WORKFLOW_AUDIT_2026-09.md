# CR Sales-Workflow Audit — 9 Sep 2026

**Walked at build 1199** (branch `claude/cardinal-roof-readiness-matrix-hwoooz`, PR #594; `main` is at 1198).
**Asked for:** *"a sitewide audit for the CRM … note any annoyances as if you were a salesperson, going
through all the workflows from lead to closed. Check for any bugs as well."*
**Persona:** Nick — a Sales-role rep (RLS-limited to his own jobs), on a 390×844 phone, with the
1194×834 iPad landscape checked where the phone raised a question.

This is a rep's walk, not a code review. Where the walk found a bug, the code was read to root-cause
it and the repro was re-run against the mock rig, so every bug below carries a captured repro.
Section 6 is the part that wants Theo: **numbered options with costs — answer by number.**

---

> ### Progress
> **A1's cheap half closed in build 1208** (option 7b): the Lead form opens on **OH** and asks for
> an address only once a **Job Category** says there is a job. ⚠ **Option 7a turned out to be
> already shipped on the Lead door** — build **782** requires a phone or an email there, with a
> tick box for the exception, and a **Lead Source** whose expander the form opens for you. §3's A1
> read the Contact door's rules and attributed them to both doors; the correction is below.
> **B6 closed in build 1207** (option 6b): the header search shows the top five matching clients
> as you type, tap to open, and Return still opens the full directory. It matches with
> `crClientHay()` — the same haystack the Clients directory uses, extracted so the two can never
> disagree; the sweep for its siblings found four near-identical copies.
> **A13 and A3 closed in build 1206** (option 14): four real sub-44px controls fixed, plus the
> document editor's own buttons, which 1204 left two pixels short. ⚠ **The audit's headline
> tap-target finding — the Dispatch grip at 15×15 — was WRONG**: its hit pad makes it 45×45, and
> the correction is in §3 and in BUG_CLASSES 89. `gate_1206` now holds the floor as a ratcheted
> standing gate over all 32 sentinel states.
> **A11 closed in build 1205** (option 10): every button on the estimate builder's toolbar is
> 44 px, and the row wraps instead of scrolling sideways. Measured on 1204: 26 px buttons, with
> “→ Contract” at right=463, Publish at 558 and Save Draft at 679 on a 390 px screen.
> ⚠ The phone header is 150 px tall as a result (52 px before) — see the note in `OPEN_ITEMS`.
> **A12 closed in build 1204** (option 13): after Publish, *Email to client · Text to sign · Share
> link* are on the toolbar itself instead of two taps deep under ⋯ More, "Mark sent" sits below them
> on the phone, and the client chip reads "‹ Back". Measured: on 1203 all three sends render 0×0
> inside a `display:none` parent; on 1204 each is 181×42 and is the top element at its own centre
> (**44px since 1206** — 42 was two pixels under the floor, and 1206's sweep is what found it).
> **B5, B6a, A2, A9 and A10 shipped in build 1203** (options 5, 6a, 8, 11, 12).
> **B4 shipped in build 1202** (options 4a and 4b): a review request is recorded when the rep says
> it went out, and the card's buttons wait until the job is Completed.
> **B3 shipped in build 1201** (option 3a): publishing now asks to *send* and offers the three real
> ways to deliver, and the estimate is marked Sent only once that document really goes out.
> **B1 and B2 shipped in build 1200** (options 1 and 2), measured before and after: an open
> profile went from 65 DOM records/sec with 360 on the punch count to 5/sec with zero, and the
> backward-chevron email is gone.
> **Still open:** the two intake doors (7a/7b/7c — a decision, not code) and the phone profile's
> band order (9).

## 0. Read this first

Six real bugs, one of them on every profile a rep opens. Everything else is friction, and most of
the friction sits on the two things a rep does most: **intake** and **getting the estimate into the
homeowner's hands.**

| # | What | Where a rep meets it | Class |
|---|---|---|---|
| **B1** | Every open client profile repaints its punch-out count **~60×/sec, forever** | any profile, phone or desktop | bug — battery, the 567/569 class |
| **B2** | Moving a job **back** to Approved re-emails Curtis, Theo and Joan "order materials" | the ‹ chevron on a Scheduled job | bug — wrong notification |
| **B3** | Publish asks "Mark it as Sent?" **before anything has been sent**, then lands the rep on a document stamped UNSENT | every estimate | bug — two "sent" states shown together |
| **B4** | Tapping "Text request" records *Review requested* **on the tap**, not on the send | the Google Reviews card, on every stage including Lead | bug — false record |
| **B5** | iPad landscape Leads & Jobs: the Job Summary panel overflows the screen by 31 px and clips its own copy | Leads on the iPad | bug — layout |
| **B6** | Header search shows nothing while you type and only acts on Return; on the phone the keyboard key reads "return", not "Search" | any screen | bug-grade friction |
| **A1** | Two intake doors with two rulebooks: **Contact** saves a lead from a name alone; **Lead** is a 1,600 px form that refuses without six fields and has no Ohio default | the + button | the biggest annoyance |
| **A12** | ✅ **FIXED — 1201 (the publish sheet) + 1204 (the toolbar).** Sending was two taps deep under "⋯ More" while the prominent button was "Mark sent", which sends nothing, and there was no labelled Close | every estimate | the second biggest |

**Verdict: the pipeline works end to end — Lead → Prospect → Approved → Scheduled, estimate → publish →
document — with no console errors, no unhandled dialogs, and writes that match the screen.** The
bugs are real but bounded: B1 is a one-line guard, B2 a one-condition guard, B5 a CSS fix. B3 and A12
are one wording-and-order build. A1 is a decision, not code.

---

## 1. Method — and what the rig can and cannot see

**Rig.** The shipped `index.html` served to Chromium (Playwright, `/opt/pw-browsers/chromium-1194`)
with `e2e_mock_supa.js` in place of Supabase (every write recorded to `window.__WRITES__`, every
`/api/*` call recorded and answered `{ok:true}`), and `sentinel_setup_cardinal.js` for the seed and
the `?as=nick` sign-in-as switch. Seed: three retail jobs — 1048 Mark Diamond (Approved, 4 punch
items), 1069 Kathy May (Scheduled), 1070 Unassigned Caller (Lead) — plus whatever the walks created.

**Six walks**, each a script in the session scratchpad (`scratchpad/walk/audit_rep_walk{,2,3,4,5,6}.mjs`,
screenshots in `out*/`, one `report.json` per walk):

| Walk | What it did |
|---|---|
| 1 | 25 screens as Nick, phone: boot, Home, drawer, Leads, profile, job menu, stage advance, checklist, estimates, library, line items, new lead, signature, appointment, Production, dispatch, punch, Sales Floor, Client Directory, Photo Activity, album, insurance clients, search, "why". Each screen probed for text under 11 px, tap targets under 44 px, horizontal overflow, and dead controls. Re-run at 1194×834 |
| 2 | full-page captures; an **independent mutation-rate probe** on an open profile; a real stage move forward and back; the estimate editor's toolbar measured |
| 3 | both intake doors (+ → Contact, + → Lead) filled and submitted; the header lens on Home and on Leads |
| 4 | header search from a **clean boot**; iPad overflow offenders on Leads; estimate → Save Draft → Publish; Lead → Prospect |
| 5 | the send path through the **real tiles**: price a line, Save Draft, Publish, answer the sheet, Close, the Documents tile |
| 6 | the document editor after Publish: its toolbar, the ⋯ More drawer, the send actions, and how a rep gets out |

**What the rig cannot see, stated plainly.**

- **No live site and no real data.** app.cardinalroster.com and Supabase reads are egress-blocked
  from this container. Everything below was measured on the shipped file with seeded data.
- **Email, SMS and push are mocked.** "Fired the notify" means the app POSTed `/api/notify`; nothing
  was delivered anywhere.
- **Retail only, dark theme only.** The insurance and community CRMs were not walked as a rep; the
  light theme is the sentinel's job and was not swept here.
- **Production and Dispatch were walked as screenshots**, not driven — no crew was moved, no work
  order dispatched.
- **Not measured:** iPad portrait, offline, the installed PWA, a real iOS keyboard (B6's "return"
  key is read from the markup, not from a device).
- **Rig artifacts, so they are not findings:** every sentinel state runner calls `hideAllViews()`
  first, so Home renders empty after any state; `showTab('docs')` (walk 4) is a legacy call that
  blanks the profile and surfaces the hidden `#woQuick` chip — walk 5 replaced it with the real tile;
  `drive_lifecycle.mjs` (build 773) is rig-rotted at S6 and was not used as evidence.

---

## 2. Confirmed bugs

### B1 — every open profile repaints the punch-out count ~60 times a second

**Seen.** Walk 2's independent probe on Mark Diamond's open profile: **65 DOM mutation records per
second**, 360 of them in six seconds on `b#dbPunchN` (the next busiest element was the theme toggle
at 12). The app's own `[Cardinal Perf]` detector printed *"Re-render loop detected:
div.ja-menu > div.jaboxrow > div.jabox > b#dbPunchN … ~60 mutations/sec sustained for 5s"* on **both**
seeded profiles — 1048 with four punch items and 1070 with none — and kept printing it from
underneath the document editor in walk 6. It is not the seed and not the item count.

**Root cause** (`cr-pp`, the punch module):

```js
function syncMenuCount(){                       // index.html ~56508
  var el = document.getElementById('dbPunchN');
  if(!el || loadedFor === null) return;
  var open = rows.filter(function(i){ return i.status !== 'done'; }).length;
  el.textContent = open;                        // ← unconditional write
  el.classList.toggle('zero', open === 0);
}
…
if(loadedFor === pr.id){ render(); syncMenuCount(); return; }   // check(), ~56917
…
new MutationObserver(scan).observe(document.body, {…});          // ~56936
```

`scan` runs on every body mutation; once the module has loaded for the current project it calls
`syncMenuCount()`; **assigning `textContent` emits a childList record even when the string is
identical** (the old text node is removed and a new one added — CLAUDE.md's 567/569 lesson, and the
exact shape the detector's hint names). The observer wakes itself. `render()` beside it is guarded by
`lastHtml`; the count is not.

**Cost.** Every one of the 46 `document.body` observers wakes ~60×/sec for as long as a profile is
open. On a phone that is battery and heat; on the ultrawide it is a warm tab. It is the class that
cost 388 writes/sec at 567.

**Fix shape.** Compare before writing, and only toggle the class on a change:

```js
var s = String(open);
if(el.textContent !== s) el.textContent = s;
if(el.classList.contains('zero') !== (open === 0)) el.classList.toggle('zero', open === 0);
```

One build. Gate: the walk-2 mutation-rate probe as `gate_NNNN.mjs` — pass under 10 records/sec on an
open profile, **red on 1199 as the negative control** (it is red today: 65).

### B2 — a backward move into Approved re-sends "APPROVED — schedule + order materials"

**Seen.** Walk 2, step 08: Mark Diamond at Scheduled, tap the **‹** chevron (`#dbStgBack`, "Back to
Approved"). Captured: `POST /api/notify` with
`emails: [curtis@, theo@, joan@]`, `title: "APPROVED — schedule + order materials: Mark Diamond"`.
Curtis is told to schedule and order materials for a job that was *already scheduled* and has just
been un-scheduled.

**Root cause** (`setStage`, ~19972):

```js
if(v === 'Approved' && prev !== 'Approved'){
  _notifyOrQueue(['curtis@cardinalrenovations.net'].concat(ADMIN_EMAILS),
    'APPROVED — schedule + order materials: ' + (pr.name || ''), …
```

The condition is "arrived at Approved from anywhere", which includes from Scheduled, Completed and
Invoiced. The back chevron commits through `_crStageCommit → setStage`, so it fires. (The 5-second
**Undo** toast does *not* — it reverts locally before the commit — so the repro is the chevron, not
Undo.) `api/clientsign.js` already got the right rule at 1007: *"only alerts on the real move"* and
never pulls a job backward.

**Fix shape.** Forward-only: `rank(prev) < rank('Approved')` (the stage `rank()` already exists in
`cr-ess`), or equivalently `prev` in `{Lead, Prospect, OnHold}`. Same guard on the Completed email
one block down. One build, can ride with B1. Gate: execute the shipped `setStage` against a stub
`_notifyOrQueue` for Prospect→Approved (fires) and Scheduled→Approved (silent); the control is 1199,
where the second case fires.

### B3 — "Mark it as Sent?" is asked before anything is sent, and the document says otherwise

**Seen** (walks 5 and 6, phone). Publish → sheet *"Estimate published. — Mark it as Sent? The
pipeline stays at Approved."* with **Continue / Cancel** → Continue → toast *"Estimate marked Sent"*,
the editor's Status select reads **Sent**, and `estimates.update {status:'sent'}` is written. Close
the estimate editor and the rep is standing in the document editor whose toolbar reads
**Status: UNSENT · Mark sent**. Nothing has been emailed, texted or shared.

**Why.** Two columns: `estimates.status` (the estimate's pipeline state, the thing the sheet writes)
and `inspection_reports.status` (the document's delivery state, which only flips when Email to
client / Text to sign / Share link actually run — build 731 fixed exactly that write). The sheet's
verb is `leadVerb('Estimate published.')` → *Continue*, so a rep reads it as "carry on", answers
yes, and has now declared a document sent that the very next screen says is not.

**Fix shape** — a wording-and-order build, not a schema change. Either (a) drop the question and
offer the three send actions on the publish sheet — *Email to client · Text to sign · Share link ·
Not now* — and let an actual send set **both** statuses, or (b) keep the question but ask it *after*
a send action, with the verb "Mark sent" and Cancel as the default. This sits inside the prior
audit's *"one Publish tap = 2–3 blocking dialogs"* item (CR_UX_AUDIT 21 Aug, money pipeline P2), which
I did not find closed in the build log.

### B4 — a review request is recorded on the tap, not on the send

**Seen** in code, confirmed by the card's own copy. `sendReviewRequest()` (~11875):

```js
if(via === 'sms' && pr.phone){
  location.href = 'sms:' + … ;                  // hands off to Messages
}
…
await patchProjectCk(pr, { review_requested_at: new Date().toISOString(), review_via: via });
auditLog('review', 'Review requested via ' + via + …);
```

The write and the audit line happen whether or not the rep sends the text. Back out of Messages and
the profile now reads *"✓ Review requested today via text"*, the audit trail says so, and the next tap
sends the *"friendly follow-up"* wording to someone who never got the first one.

**And the card is on every stage.** `renderOverview` draws the Google Reviews card unconditionally
(~12286); with a phone on file the red **Text request** button is the most saturated control on a
**Lead's** profile. A rep who has not met the homeowner is one thumb from asking for a review.

**Fix shape.** (a) Ask *"Did it send?"* on return (`visibilitychange` → `crAsk`) before recording;
or record with `review_via` and a *"sent?"* flip the rep confirms. (b) Hide the card below
Completed, or render it grey with the buttons disabled and a line saying when it unlocks. Small.

### B5 — iPad landscape Leads & Jobs overflows the viewport

**Seen.** Walk 4 at 1194×834: `aside#ljPane.ljdetail right=1225`, `div.ljsummary right=1224`
(viewport 1194). `out4/04-leads-ipad-shot.png` shows the Job Summary panel's copy cut at the right
edge ("…or open the full profile." is clipped). The page itself does not scroll sideways
(`scrollWidth` 1194), so the panel simply loses its last 31 px.

**Fix shape.** Let the aside shrink (`min-width:0; flex:1 1 0`) or drop it to a bottom sheet under
~1280 px. Small. Render at 1024 and 1194 before and after; the control is 1199.

### B6 — header search: nothing while you type, Return only, and the phone keyboard says "return"

**Seen.** Walk 4 from a clean boot, phone: tap the lens, type "Diamond" — **0 result rows** appear
(`out4/01-search-type.png`: Home unchanged under the search row). Press Return — the Clients
directory opens filtered to 1 of 3 (`out4/02-search-enter.png`). That works, but from the Leads
screen Return navigates *away* to Clients, and nothing on screen says Return is required.

**Why.** `#headSearch` is `<input type="search">` with no `<form>` and no `enterkeyhint`; its only
handler is `keydown` → `if(e.key !== 'Enter') return;` → `openClientsDirectory()` + `cliFilter`
(~23633). No `input` listener exists.

**Fix shape.** Trivial half: `enterkeyhint="search"` and a placeholder that says *"…then Return"*.
Real half: an `input` listener that renders the top five matches (name, PO, address) under the row,
tap to open, Return for the full directory. One to two builds.

---

## 3. The rep's walk, stage by stage

Numbered A-items are annoyances, not bugs. *Settled* means CLAUDE.md or the build log records
Theo's decision and I am not re-opening it.

### Lead intake — the + button

- **A1 — Two doors, two rulebooks.** + opens *Task · Contact · Lead · Reminder · Punch-out*.
  **Contact** opens "Add project" and saved a lead from a **name alone** (walk 3: project 1071
  "Contact Door" created with address, street, city, state, zip, phone and email all `null`, straight
  to LEAD). **Lead** opens a form measured at **1,603 px tall** on the phone — 15 visible fields, two
  "+ Add Another" rows, "Different mailing", "+ More detail" — and refuses with *"Required: First
  Name, Last Name, Street, City, State, Zip"*; fill the minimum and it still says *"Required:
  State"*, because State has no Ohio default. A rep at the door will learn to use Contact and never
  enter an address; a rep at the desk will fight the Lead form. **Pick one rulebook** (option 7).
  ⚠ **CORRECTION, build 1208 — this walk was wrong about the LEAD door's rules.** It requires a
  phone **or** an email since build **782** (with a tick box for the genuine exception) and a **Lead
  Source**, and when the Source is missing it opens "+ More detail", shakes the field and focuses
  it. Those are the Contact door's gaps, attributed to both. Option 7a is therefore already shipped
  *here*; what remains of it is the Contact door.
- **A2 — "Job cost (materials + labor, $) for profit reports"** is on the Contact/Add-project door,
  shown to a Sales rep. At intake nobody knows the cost, and reps do not see profit reports.
- **A3 — Lead-source chips are 38 px tall** — under the 44 px floor the rest of the app moved to.
- Good: the lead lands on the profile at LEAD with "Today" on the banner; the PO number mints.

### Working the lead — Home, search, the profile

- **A4 — Home has no "who do I call today."** Recent leads and Today are empty cards for a rep with
  three jobs. The follow-up scheduler that would fill this is built and buried — recorded as
  **CR-UX-021** in the 21 Aug audit; I found no build-log entry closing it and did not re-verify it.
- **A5 — Search** — B6.
- **A6 — The phone profile opens on money, not on the person.** First screen: *Job Value $0.00 · 0% ·
  Balance Due $0.00 · Payment Information ›*, then the client band with the name truncated to
  **"Mark Diamo…"** beside four icon buttons. The iPad layout puts the name first. A rep opening a
  Lead reads $0.00 twice before the homeowner's name.
- **A7 — Three money surfaces on one profile:** the ring + Payment Information row, the porcelain
  *Invoices & Payments* card (porcelain is **settled**, 1108), and *Money In & Commissions*. The
  porcelain is not the annoyance; the count is.
- **A8 — Google Reviews on a Lead** — B4's second half.
- **A9 — "Documents 0" beside "Estimates 1"** the moment an estimate is published. The Documents tile
  counts *uploaded files* only (`fileDocs = docs.filter(isFileDoc)`); the estimate document is
  under Estimates. Correct, and it reads like the document vanished. Call the tile **Files**, or
  count everything.
- **A10 — Seven of fourteen job-menu labels ellipsise at 390 px:** *Commu… · Notificat… · Measure… ·
  Docume… · Appoint… · Punch … · Inspecti…*. Short labels on the phone (Comms, Alerts, Measure, Docs,
  Appts, Punch, Inspect) would read whole.
- *Settled, not re-flagged:* the Scope-of-Loss card on a retail job (it is the on-ramp — the comment
  at the `#tab-overview` allow-list says so); *Convert to Insurance* on every job; drawer sections
  collapsed on every open (1115).

### The estimate

- **A11 — The editor toolbar is a horizontally scrolling strip with no scroll hint.** `.cr-est-head`
  is `overflow-x:auto`, so at 390 px **→ Contract** sits off-screen with nothing to say it is there
  (`out4/06-est-add-custom.png`: "CLOSE · PREVIEW · OPTIONS · → CO" cut at the edge). Its buttons are
  **26 px tall** (Close 72×26, Preview 88×26, Options 86×26, → Contract 117×26, Publish 85×26, Save
  Draft 111×26; the line-item adds 26–28 px) — the smallest targets a rep will hit all day, on the
  screen where money is typed.
- Good: pricing a line updates Subtotal, Total and the deposit live ($12,500 → $3,750 at 30 %);
  Save Draft writes `estimates` + an `audit_events` row and mints EST-2026-0001; Publish writes the
  `inspection_reports` document, links `doc_id` back, and logs `estimate_publish`. The obsidian
  builder is **settled**.
- **A12 — After Publish, sending is buried and leaving is unlabelled.** Publish → the B3 sheet →
  Continue → the estimate editor is *still on top* → Close → the rep lands in the document editor.
  Its phone toolbar is **Mark sent · Save · Print / PDF · ⋯ More**. The three ways to actually
  deliver it — *Email to client · Text to sign · Share link* — are inside ⋯ More, two taps deep,
  while the prominent button is "Mark sent", which sends nothing. There is **no labelled Close or
  Back**: the way out is the client-name chip (title "Back to client overview") or the logo (title
  "Save & go home"). Walk 6 looked for a Close/Back/Done button for 30 s and found none.
- *Not re-flagged:* the estimate's Total/Deposit ink on obsidian (**CR-UX-014**), the signature
  branch that can fail silently (**CR-UX-015**) — both in the 21 Aug audit.

### Approved → Scheduled → Completed

- Good: the stage chevrons move the job with a 5-second **Undo** toast, three writes (stage,
  audit, `stage_since`/`t_Stage` in the checklist) and the banner age resets to Today.
- **B2** on the backward chevron.
- *Settled:* no money anywhere on Production (766–772). The punch card, day agenda and five-week
  calendar were screenshot-walked only.
- **A13 — Tap targets under 44 px, measured in walk 1** (phone): drawer section "A" buttons 34 px;
  ~~Dispatch's "Move this job" control **15×15**~~; album chips 30 px; Production day cells 34 px;
  lead-source chips 38 px (A3). The 11 px type floor (1081) held everywhere the probe looked.
  ⚠ **CORRECTION, build 1206 — the Dispatch grip was a FALSE POSITIVE and this walk was wrong
  about it.** Its BOX is 15×15; its TARGET is 45×45, because
  `#cr-disp .job .mv::after{position:absolute;inset:-15px}` — build 1040's deliberate hit pad, with
  the arithmetic written down beside it. Walk 1 measured `getBoundingClientRect()`, which cannot
  see a pad. Four more of its findings went the same way once the hit area was measured properly
  (`.pu-box` 22×22 → 43×45, both dispatch week arrows 21×26 → 45×43). **Recorded as BUG_CLASSES 89;
  do not "fix" the grip.**

### Invoiced → Closed

- The porcelain Invoices & Payments card says *"An invoice opens once a contract is signed"* — right
  for a rep, and the 1108 send rails (Company SMS / My phone / Email) were not driven here because
  the mock cannot sign a contract.
- **B4** for the review request; the *"Flip when their review appears on Google"* switch is clear.

---

## 4. Not re-reported — known-open and settled

| Item | Where recorded | Status as I found it |
|---|---|---|
| Follow-up scheduler buried; Home has no call list | CR-UX-021 | no closing build-log entry found; not re-verified |
| Estimate Total/Deposit ink on obsidian | CR-UX-014 | 1081-era ink work touched the editor; not re-measured |
| Buyer signature can fail silently | CR-UX-015 | not exercised (mock cannot sign) |
| Publish = 2–3 blocking dialogs | CR_UX_AUDIT money-pipeline P2 | B3 is the same seam, refined |
| Assigned-To filter reads `created_by` | CR-UX-029 | build log shows `ljRepLabel` follow-through; not re-verified |
| Manual-estimates F-1 / U-1 / U-4 / U-5 | manual-estimates audit | untouched |
| No money on Production · no price before Options · empty chapters auto-skip · punch tick one-tap close · drawer sections collapsed each open (1115) · obsidian builder, no dark option · colour sheet has no money · payment reminders retail-only · Community billing rules | CLAUDE.md / build log | **settled — honoured, not re-opened** |

---

## 5. What the walk did *not* find

Worth saying so the absence is a measurement, not an omission:

- **No console errors** on any of the 60-odd steps beyond the mocked script fetch at boot, and no
  unhandled native dialogs on the rep path (the publish sheet is `crAsk`, not `confirm`).
- **No write that disagreed with the screen.** Every stage move, save, publish and lead creation
  wrote what the banner, toast or tile then showed.
- **No text under the 11 px floor** on the screens probed.
- **No horizontal page scroll** at 390 or 1194 (B5 clips inside a panel; the page does not scroll).
- **No light-ink-on-dark** on the rep path in dark mode. Light mode was not swept — that is the
  sentinel's job, and it holds the merge only for colour/layout builds (settled 27 Aug).

---

## 6. Options — pick by number

Costs are in builds and in what has to be rendered or gated. "Small" is under an hour of patching
plus its gate; every option ships with a negative control against 1199.

| # | Option | Fixes | Cost | Note |
|---|---|---|---|---|
| **1** | ✅ **SHIPPED, build 1200.** Guard `syncMenuCount()` — write the count only when it changed | B1 | trivial · 1 build · gate = mutation-rate probe, red on 1199 | **do first; it is on every profile** |
| **2** | ✅ **SHIPPED, build 1200** as `crStageIsForward()`. Forward-only Approved and Completed team emails | B2 | trivial · rides with 1 · gate executes shipped `setStage` with a stub notifier | mirrors `api/clientsign.js` 1007 |
| **3a** | ✅ **SHIPPED, build 1201.** Publish sheet became the send sheet; a real send is what marks it Sent | B3 (A12's toolbar half is still open) | small–medium · 1 build · Chromium render of the sheet, both themes | wants your wording pick |
| **3b** | Keep the question, ask it *after* a send, verb "Mark sent", Cancel default | B3 | small | the cheaper half of 3a |
| **4a** | ✅ **SHIPPED, build 1202.** Recorded only after the rep confirms it went | B4 | small | |
| **4b** | ✅ **SHIPPED, build 1202.** The card stays, its buttons wait for Completed | B4/A8 | small | can ride with 4a |
| **5** | ✅ **SHIPPED, build 1203** — measured: the grid box is 789px, the tracks asked for 878 | B5 | small · render at 1024 and 1194 | |
| **6a** | ✅ **SHIPPED, build 1203** | B6 (6b, live results, still open) | trivial | |
| **6b** | ✅ **SHIPPED, build 1207.** Top five under the row, tap to open, Return unchanged — and one shared matcher | B6/A5 | medium · 1 build · Chromium render, both themes | `crClientHay()` now serves the directory, Insurance Clients and the live search |
| **7a** | ⚠ **ALREADY SHIPPED on the LEAD door, at build 782** — the walk attributed the Contact door's rules to both. On the *Contact* door it is still open, and it would refuse a save that works today | A1 | small | **needs your yes — it takes something away** |
| **7b** | ✅ **SHIPPED, build 1208.** State opens on OH; the address is required only when a Job Category is set | A1 | small | measured on 1207: *"Required: Street, City, State, Zip"*, then *"Required: State"* |
| **7c** | One door: the Contact form with an "Add address now / later" step; the Lead form's insurance and mailing blocks become the "+ More detail" expander | A1 | medium · 1–2 builds | the real fix; 7a+7b is the patch |
| **8** | ✅ **SHIPPED, build 1203** — hidden for non-admins, the value preserved | A2 | trivial | |
| **9** | ✅ **SHIPPED, build 1209.** Name band first, money card directly under it, phone only | A6 | one line in `syncMoneyCard()` + its guard | ⚠ **This REVERSED build 797**, which Theo confirmed from preview_v3/v4 and again live. Held until he chose it on 10 Sep. `gate_797.mjs` section B was flipped in the same build, so 797's own gate can no longer argue for restoring 797's order |
| **10** | ✅ **SHIPPED, build 1205.** 44 px on every toolbar and Add button; the row wraps instead of scrolling | A11 | small · render 390 and 1194 | measured: 26 px and three buttons off the right edge on 1204 |
| **11** | ✅ **SHIPPED, build 1203** — the labels WRAP instead, so nothing is renamed | A10 | trivial | |
| **12** | ✅ **SHIPPED, build 1203** | A9 | trivial | |
| **13** | ✅ **SHIPPED, build 1204.** The three sends are primaries, "Mark sent" moved below them on the phone, and the client chip reads “‹ Back” | A12 | small · render | measured: sends 0×0 on 1203, 181×42 and one-tap on 1204 |
| **14** | ✅ **SHIPPED, build 1206** — four of the five fixed, plus one of my own from 1204; the rest baselined by `gate_1206` | A13/A3 | medium · several modules | ⚠ **the dispatch grip was a FALSE POSITIVE** — 15×15 box, 45×45 target |

**My recommendation, if you want one:** 1 + 2 in one build today (both trivial, both gated, both
real bugs); then 3a + 13 as one "send the estimate" build; then 7 as a decision before code. 5, 6a,
8, 11, 12 are five-minute patches that can ride any build.

---

## 7. For the next session

- Scripts and captures: `scratchpad/walk/audit_rep_walk{,2,3,4,5,6}.mjs` and `out*/` — the
  scratchpad is session-local, so if the walks are wanted again they need to be checked in under
  `scripts/` (the rig pattern is `sentinel_setup_cardinal.js` + `e2e_mock_supa.js`; each walk is
  ~120 lines).
- The mutation-rate probe (walk 2, step 04) is the right shape for B1's gate: six seconds of
  `MutationObserver` records on `#projectView`, grouped by target, pass under 10/sec.
- Do not reuse `showTab('docs')`; it is not a rep-reachable path.
- BUG_CLASSES: B1 is class 567/569 (unguarded `textContent` under a body observer) recurring in a
  module added after that lesson was written — worth a line there when it is fixed.
