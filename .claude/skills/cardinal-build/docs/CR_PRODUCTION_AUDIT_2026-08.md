# CR PRODUCTION AUDIT — 24 Aug 2026, measured at build 1035

Theo's ask, verbatim: *"Do a full end to end audit on the productions hub. All pages, every
workflow, all buttons, readability, accessability, ease of use, organization, features, every
thing about it. I'd like to get this app out soon. I need to know that people like Scottie and
Curtis can use the productions side without getting confused. Make sure everything in productions
doesnt straty into the CRM unless it was intentional. If they click into a clients profile thats
one thing, but if they hit the back button and it goes into retail crm and doesnt keep them in
productions they may get lost trying to find productions again."*

**This is an audit, not a build.** Nothing in the app changed. Every claim below was measured on
a driven Chromium rig — signed in as Curtis (production manager) and Scottie (field), dark and
light, 1194px and 390px — not read off the code. The instruments ship with this audit:
`scripts/sentinel_setup_production.js` (the permanent production walk: board home / calendar /
box list / punch card / punch list / dispatch, with a seed that exercises every box) plus the
drive + census scripts in the session scratchpad. 0 pageerrors across all 8 boots.

---

## The verdict, first

**The production hub itself is in good shape.** The board is clean on a phone, the boxes encode
the real workflow (needs-ordered catches both Approved-bare AND scheduled-without-materials, with
a "MATERIALS?" warning), the punch card is the strongest screen in the app, the manager/field
role split works exactly as designed, and login already lands Curtis and Scottie straight on the
board (854). Zero pageerrors anywhere.

**The containment Theo asked about is half-true.** The happy path holds: board → job → client
profile → back **returns to the board**. So do punch card → back and dispatch → back. But two
measured breaks do exactly what Theo fears, and both live in the history machinery, not in any
screen:

1. **Back from the board's calendar or a box list exits Production entirely** — pane changes
   push no history entry, so the phone back-gesture pops the one `production` state and lands on
   the retail home.
2. **After flipping tabs on a client profile, back gets stuck** — five presses never return to
   the board. Three different history writers interleave on that one screen.

Everything else is polish: a handful of inks under the floor (worst: the punch list's NORMAL
chip at 1.91:1 in light mode), a cluster of sub-44px tap targets (worst: dispatch's 15×15 move
handle), and the burger menu dragging 9.8 KB of changelog prose behind it.

---

## 1 · The containment truth table (the back button, measured)

Every row below was driven on the rig as Curtis and read back from the DOM + `history.state`.
The app runs **two routers**: the modern one (`{app:'cardinal-nav', view}` — `navSetView` /
`navRestore`) and the legacy hash router (`{v:'project'|'home'|…}` — `__histPush` + its own
popstate). Their interaction is the whole story.

| # | Journey | Where back lands | Verdict |
|---|---|---|---|
| T1 | Board → box → **job tap** → profile → back | **Production board** | ✅ the core path holds |
| T2 | Board → punch box → **punch card** → browser back | **Production board** | ✅ |
| T3 | Punch card's own ‹ chevron (opened with `{back:'production'}`) | **Production board** | ✅ the hint is honored |
| T4 | **Dispatch** → browser back | **Production board** | ✅ |
| T5 | Login as Curtis/Scottie | **Production board directly** (854) | ✅ the front door is production-first |
| T6 | Profile → flip to Photos → flip to Documents → back ×5 | back 1–2 walk the tabs, then **STUCK on the profile forever** | ❌ **F2** |
| T7 | Board → **full calendar** pane → browser back | **Retail home** (legacy `{v:'home'}` state) | ❌ **F1** |
| T8 | Board → **box list** pane → browser back | Exits production (in the rig: a null state — live: whatever preceded the board) | ❌ **F1** |
| T9 | Board home pane → its own **X** | Retail home — **deliberate exit**, see F3 for what's in that room | ⚠️ by design |
| T10 | **Punch & Repairs** page (menu door) → back | Home | ✅ correct — it was entered from home |

### F1 · Pane changes are invisible to the back button — HIGH

The board's three panes (home / cal / list) are one view; switching panes pushes **no history
entry**. The board's own chevron steps up one level (list→home, cal→home, home→exit) exactly as
its banner promises — but the **browser back does not**, and on a phone PWA the back *gesture*
is the browser back. From the calendar or any box list, one swipe pops the single `production`
state and Curtis is on the retail home wondering where Production went.

The profile's tab machinery already solved this exact problem for its tabs (`showTab` pushes a
state per tab, back walks them). The board panes never got the same treatment.

### F2 · The profile tab back-trap — HIGH

Measured: open a profile from the board, view two tabs, then press back five times.
Backs 1–2 correctly walk the tabs backward. Backs 3–5 **do nothing** — `history.state` stays
`{v:'project', id}` and the profile never closes. The board entry under it is unreachable.

Why: **three writers interleave on one screen.** A job tap runs the legacy wrapper
(pushes `{v:'project'}`), the modern `wrapNav` (replaces/pushes `{app:'cardinal-nav',
view:'project'}` — index.html:26848), and the profile-open path's own
`history.replaceState({v:'project'})` (index.html:25651). Tab flips then stack legacy tab
states. On the way back, the legacy popstate handler re-runs the profile opener, which
*rewrites the current entry again* — and the stack wedges. Scottie taps Photos on a client,
then backs out — trapped.

(Without tab flips the trap never arms — that is why T1 passes.)

### F3 · The exit room is the retail CRM, money included — MED

The board's X deliberately exits (fine). But it lands on the **retail home**: Cardinal Pipeline
stage counts, **Accounts Receivable with an unpaid-balance dollar figure**, Recent leads.
The permissions doctrine says production accounts get *"no stats strips or partner money"* —
and `renderHome()` has **no role gate at all**; whatever RLS returns, the money *card* renders
for Curtis. The ways back to Production from that room: the top-nav "Production ▾" dropdown
(phone + desktop) and the desktop rail row — present, but the burger menu's Production row sits
inside a collapsed section, two taps deep.

### F4 · The punch list page keeps the retail chrome — MED

`#punchView` (Punch & Repairs) is display-shown **inside** the app shell, unlike the board /
punch card / dispatch, which are full-screen overlays that cover everything. So Curtis on the
punch list has the retail nav row — **Contacts · Leads · Photos · Production ▾ · Tools** — and
(desktop) the full retail rail one tap away the whole time.

### F5 · The desktop board lives inside the full retail chrome — LOW / question

On desktop the board renders beside the left rail (Landing / Clients / Import from AccuLynx /
Leads & Jobs / Suppliers…) and under the retail top bar. For an admin that's right. For Curtis,
every rail row is a retail door. Possibly intentional (desktop = office context); worth a call.

---

## 2 · Readability (sentinel INK, floors 4.5:1 body / 3.0:1 large)

Sweep: 24 renders (6 states × 2 themes × 2 widths) as Curtis. 12 findings, all named by the
instrument, worst first:

| Ink | Where | Ratio | Sev |
|---|---|---|---|
| `.pu-tag.prio-normal` "NORMAL" amber on paper | punch list, **light** | **1.91:1** | **HIGH** — unreadable. 1034 gave `.pu-tag.supp` its light twin; the chip family's other members never got theirs |
| `.pu-tag.crm-retail` "RETAIL" | punch list, light | 3.37:1 | MED |
| `.pkvb.in` **"Check in"** white on salmon | punch card, both | 3.51:1 | MED — the primary field action |
| `.pu-st.on` "On site since…" green | punch list, light | 3.88:1 | MED |
| `.c.sun` "SUN" + weekend dates | dispatch grid, dark | 3.09:1 | MED (4.15:1 in light — still under) |
| `.pu-tag.crm-retail` | punch list, dark | 4.10:1 | LOW |
| `.cch.punch` calendar chip | board calendar, dark | 4.33:1 | LOW — boundary |
| `.cch.done` calendar chip | board calendar, light | 4.43:1 | LOW — boundary |
| `.cch.build` calendar chip | board calendar, dark | 4.50:1 | LOW — exactly at the floor |

Pattern: **the punch-list chip family has an incomplete light-mode pass** (the recurring
light-ink class, again) and **dispatch dims its weekend columns below the floor in both themes**.

## 3 · Tap targets (button census, 390px, Apple/947 floor = 44px)

The punch card passed its 947 pass and still holds it (every control ≥44px through invisible
tap-area growth). These didn't get the same pass:

| Control | Size | Sev |
|---|---|---|
| Dispatch **"Move this job"** handle | **15×15** | **MED** — the rescheduling control, on a screen built for a truck |
| Dispatch prev/next week | 26×26 | MED |
| Box list **"Mark ordered"** / **"Open job"** | 99×32 / 74×32 | MED — the daily buttons of the Needs-ordered workflow |
| Board/box/card back chevrons | 34×34 | LOW |
| Board "+ Add" / "Full calendar ›" | 49×30 / 107×30 | LOW |
| Punch list "Close this item" ✕ | 22×22 | LOW |
| Mini-calendar day cells | 48×34 | LOW — calendar grids get some latitude; the arrows are 34×34 |

## 4 · Organization / ease of use

| # | Finding | Sev |
|---|---|---|
| O1 | **Desktop board leads with a full-viewport month calendar**; the four boxes — the actual work — start at the fold. Phone is fine (compact grid, boxes one thumb-scroll away) | MED |
| O2 | **The burger menu ends in 9,785 characters of changelog prose** — the `data-cr-footer` stamp has been *prepending* each build's summary since ~1015 and now carries **21 builds** (my own recent patches followed the same convention and fed it). Every user scrolls past it | MED |
| O3 | Phone home top bar: "Single source of truth" renders truncated ("Single source of") behind the + button at 390px | LOW |
| O4 | "Production" appears 3–4× on one desktop screen (app header, board header, nav row, rail section) | LOW |
| O5 | Dispatch job-name line-clamp rule (`#cr-disp .job .t .nm{display:-webkit-box}`) is DEAD — beaten in the cascade — so long client names can overflow the card instead of clamping | LOW |
| O6 | Sentinel DEAD also lists the punch card's retired pre-947 size rules (34/36/40px) and header-chrome rules losing to later winners — dead code, no user impact; recorded so nobody re-finds them | note |

## 5 · What measured GOOD (so nobody "fixes" it)

- **The box logic is right.** Needs-ordered = Approved with nothing ordered **plus**
  scheduled-with-no-materials (Kathy May shows a "MATERIALS?" urgency chip — correct and sharp).
  Ordered reads `checklist.materials_ordered_at`. Scheduled reads **kind:'job' appointments
  only** (the seeded install date renders as "next build Aug 26"). Punch-outs counts urgent
  first. Closed repairs = this month.
- **The role split works.** Curtis (manager): assign dropdown, schedule date/time, priority,
  step editing — 28 controls on the card. Scottie (field): one read-only dispatch line
  ("Curtis · Aug 27 · 9:00 AM · Urgent"), bigger targets — 21 controls. Verified by census diff.
- **The punch card is the app's best screen.** Note-gated step ticks, the close gate that says
  what's missing ("5 photos · 3 steps left"), check-in/out, @-tag messaging, DIRECTIONS / CALL /
  OPEN JOB. Everything ≥44px.
- **Login lands production users on the board** (854) — the front door is already
  production-first.
- **Dispatch's needs-a-crew lane** correctly surfaces the scheduled-but-unassigned job.
- **0 pageerrors** across every persona × theme × width boot.
- The board's own chevron **does** go up one level, exactly as its banner says. The defect (F1)
  is only that the browser back disagrees.

## 6 · The plan — numbered for picks

Ordered by what protects Scottie and Curtis most per build. Each is one build, gated, previewed
where visual.

1. **Back stays in Production (F1).** Board pane changes push history states
   (`production/cal`, `production/list:<box>`), `navRestore` walks them — the browser back then
   matches the chevron exactly: list → home → exit. One mechanism, copied from the profile tabs.
2. **Untrap the profile back (F2).** Tab flips `replaceState` instead of stacking (one back
   leaves the profile from any tab — simplest, and matches how people think about tabs), and the
   legacy restore path stops rewriting entries it did not own. Alternative if you want back to
   keep walking tabs: single-router ownership of profile states — bigger change, say the word.
3. **The exit room (F3).** Options: **(a)** board X for production users returns to the
   **Landing** (portal picker — no money, and Production is a labeled tile there);
   **(b)** keep retail home but pin a persistent "Production" pill at the top for production
   users; **(c)** leave it, call it intentional. My pick: (a).
4. **Ink pass (R-table).** Light twins for the punch-list chip family, dispatch weekend ink to
   floor in both themes, Check-in to 4.5:1, nudge the three boundary calendar chips. All
   computed, both themes measured, sentinel re-run as the gate.
5. **Tap-target pass (H-table).** Dispatch move handle + week arrows, box-list buttons, board
   +Add/Full-calendar, close-item ✕ — the 947 invisible-growth pattern, no visual change.
6. **Footer stamp diet (O2).** `data-cr-footer` keeps the current build's line only; the
   patch convention changes to *replace* rather than prepend (check_build's stamp gate reads the
   first line and is unaffected). Menu loses 9.5 KB of scroll.
7. **Punch list joins the family (F4).** Full-screen treatment (or production-mode chrome hide)
   so Punch & Repairs stops showing the retail nav row.
8. **Desktop board fold (O1).** Boxes above (or beside) the calendar at desktop widths.
   Preview first — this one is taste.
9. **Dispatch polish (O5 + H).** Fix the dead name-clamp rule while touching the targets.

Not proposed: any change to the box logic, the punch card, the role gates, or the login landing —
they measured right.

---

*Instruments: `scripts/sentinel_setup_production.js` (permanent walk — seed covers all four
boxes, an install date, SOP steps with the note-gate, all three personas via `?as=` or
`window.__AS__`), sentinel selftest green before the sweep, drive/census scripts + full JSON +
24 renders in the session scratchpad (`prod_audit/`). Doc set: FEATURES.md §Production (766–772,
841–844, 945–959, 976–979), BUG_CLASSES 34 (nav), CLAUDE.md §Permissions.*
