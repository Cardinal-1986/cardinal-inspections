# Manual Estimates — E2E audit, usability research, and the visual plan

**23 Aug 2026 · audited at build 1023 (`main`, e03195c) · live DB read the same day.**
Ask (Theo, verbatim): *"Do an audit on manual estimates e2e make it visually better as well as
usability deep research on functions and plan it. Also does the dark colors make sense for the
manual estimates?"*

**Nothing in `index.html` was changed by this audit.** It ships findings, instruments and a plan;
the builds are numbered options at the bottom, awaiting Theo's pick. Two instrument fixes did ship
(`scripts/sentinel.js` + `scripts/sentinel_setup_cardinal.js` — see F-11, the rig was lying about
light mode) plus a reusable populated-estimates walk (`scripts/sentinel_setup_estimates.js`).

**Method.** Read every estimates block whole (≈150 KB JS + 64 KB CSS across 16 blocks); mapped all
19 entry doors and every external `CardinalEstimates.*` call site; read the live schema, RLS and
all 18 production rows; ran the repaired sentinel over five populated estimates states × two themes
× 390/1194px; contrast is computed, not eyeballed. Real-app renders of the current state and of the
proposed fixes were captured from the same rig.

---

## 1 · What "manual estimates" actually is — the map

The feature is **six cooperating script blocks plus two satellites**, merged onto ONE global
(`window.CardinalEstimates`) from two different files' `Object.assign`:

| Block | Lines @1023 | Job |
|---|---|---|
| `cr-estimates-script` (53 KB) | 28642–29739 | **Menu → Estimates** screen: status lanes, filters, sums, the client picker behind **+ New**, and the whole AI-estimate arm |
| `cr-est-script` (45 KB) | 47047–48183 | **The editor** (`#cr-est-view`, runtime-created): line items, library/ABC/custom pickers, photos, totals, deposit, save/delete; injects "Blank estimate" + the Saved list onto the profile |
| `cr-epub-script` (21 KB) | 48187–48678 | **Publish** → white Letter document into `inspection_reports` (`EST-YYYY-NNNN — title`), doc_id write-back, Preview |
| `cr-e2c-script` (9 KB) | 48680–48869 | **→ Contract** from the estimate (scope + money prefilled via `fillContractMoney`) |
| `cr-ess-script` (8 KB) | 48871–49095 | **Stage sync**: sent→Prospect, accepted→Approved (fires the Curtis "order materials" chain via `setStage`), declined→confirm→Lost |
| `cr-lil-script` (11 KB) | 45507–45857 | **Line Item Library** — the `estimate_line_items` price book (admin CRUD, Theo+Joan) |
| `cr-eaf-script` | 38661–38841 | Repairs on the standalone screen (Templates button → client pick → profile template menu) |
| `cr-est-fix-script` | 38572–38637 | Tombstone (the 395-removed hijack) + `on-home-view` class |

**Two different products answer to the word "estimate", by design since 196/207/492 — know which
you are in:**

1. **Table estimates** (`estimates`, 18 rows): the editor's rows — line items jsonb, status
   draft/sent/accepted/declined, server-numbered (`EST-YYYY-` + a global 4-digit sequence, column
   default — no trigger), published on demand into a linked document (`doc_id`).
2. **Document-only estimates**: the profile's **＋ From a template ▾** menu (roof / siding /
   windows / Andersen / gutters / repair) writes a prefilled HTML document straight into
   `inspection_reports` via `db.create` — no `estimates` row at all. Money-wise these feed
   `jobFinance`'s doc leg **below tier 2** (997/1011); signing-wise they are ordinary documents.

Plus a **third creation door that has never been used**: the AI arm (`/api/estimate` → Gemini →
`ai_estimates`). `ai_estimates` has **0 rows ever**; the standalone screen still queries it on
every load and gives it the primary button (see F-13/U-5).

**Four price sources feed line items:** `estimate_line_items` (the LIL price book, 19 rows),
`pricing_items` (the Pricing Catalog — the AI arm's catalog), ABC Supply live pricing (774), and
prices baked into the six document templates. Nobody reconciles them; that is an observation, not
(yet) a defect.

**Entry doors (all 19, verified):** burger Estimates row + ⌘K palette + navRestore + banner
dispatch (`crOpenEstimates()`); profile tile `data-jm="estimates"` → `showTab('estimates')`
(the old `data-ja` tile family is dead since 986); profile buttons ＋ From a template ▾ /
⚡ AI Estimate / 📄 Blank estimate (injected); overview `#acxNewEst`; lead modal "Create estimate";
standalone screen's ⚡ AI / + New / Templates; lane cards → editor; Pricing Catalog Back; claims
cross-link → `openOne` (the **AI** output view — see F-9's landmine list); Community's
"Build the bid" → `openEditor(pr.id)` (bids ARE estimates); the self-check walk.

**Money, one paragraph (997 → 1012, all verified in place):** an accepted/signed table estimate is
tier 2 and beats sent (tier 1), largest inside a tier; once tier 2 exists no `Estimate…`-titled doc
competes, and a doc any estimate row points at (`estDocIds`) never counts as a second estimate; the
contract's deposit follows the same ladder; `isEstimateTitle()` strips the `EST-YYYY-NNNN — `
prefix since 1015 so published+signed estimates reach approvals. **Do not add another
estimate-valuing scan** — `FEATURES.md` already fences this.

**Sound machinery worth naming** (so the findings below land in context): the delete pipeline
(524) verifies RLS refusals via `.select('id')`; publish self-heals dangling `doc_id` (1014);
`pickEstimate`/`estProjectNow` (970) refuse to publish another client's estimate; the ess
anti-backslide guard (710) protects OnHold; offline-create is **deferred on a settled decision**
(17 Aug HANDOFF) — do not build it into any of the plan's options.

---

## 2 · Findings — functional (F) then visual (V), ranked

### F-1 🔴 Accepted and declined estimates are mis-filed on Menu → Estimates, and the money sums are wrong — LIVE today
`CRE_LANES` (28642-block, ~line 29131) still speaks the **AI arm's** status vocabulary: the
Accepted lane matches `['approved','converted']`. The editor writes **`accepted` / `declined`**
(its STATUSES list), and `creLane()` falls back to **'Unsent'** for anything it doesn't know. So:
- Production's **two accepted estimates ($14,760 + $12,550) render in "UNSENT — DRAFTS"**, labeled
  `draft · <date>`.
- The footer's **"open pipeline" total includes accepted money; "accepted" reads $0.00.**
- A declined estimate would also file under drafts, labeled draft.
- The filter rail's "Accepted" checkbox can never match a row.
At 568 the live vocabulary was only draft/sent, so this was latent; 995/997 made `accepted` real
money and it has been mis-filed since. The 565-era comments beside the code ("a discarded row falls
outside every lane and leaves the list") describe the OLD renderer — with today's fallback a
`discarded` AI row would land in Unsent too (dead in practice, 0 AI rows).
**Fix (small):** add `'accepted'` to the Accepted lane; decide `declined` (recommend: its own thin
"DECLINED" lane rather than hiding money that was quoted — Theo's pick); make `creLane()` return
null for unknown statuses and render those in a labelled overflow rather than "drafts"; the sums
follow the lanes for free. One gate: seed all four statuses, assert lane membership + both sums.

### F-2 🔴 The rig itself was lying about light mode — every prior `--themes rb-light` sweep of the CRM was a dark sweep with a light label *(FIXED this session)*
`sentinel.js` injected `document.documentElement.setAttribute('data-theme',…)` as an init script;
`documentElement` is **null** at init-script time in this Chromium, so the line **threw** (the
"PAGEERROR TypeError … reading 'setAttribute'" on every themed render) and the attribute never
landed. Doubly broken for `index.html`: the app's own `cr-rbtheme-toggle-script` **strips** a bare
`data-theme` at boot unless `localStorage['cardinal.theme.rb']==='1'`. Proof both ways: the old
shape probes `attr: null` + pageerror; the new shape probes `attr:"rb-light"`, no errors, and the
repaired run produced **six light-only findings** (V-3…V-5) the old run was structurally incapable
of seeing, with zero pageerrors. Shipped: the theme init is null-safe, runs **before** setup files,
and publishes `window.__sentinelTheme`; `sentinel_setup_cardinal.js` translates rb-light into the
app's own localStorage key. `--selftest` still green.

### F-3 🟠 `#projectView .subnote{color:#fff}` is not theme-scoped — invisible notes across the profile in light mode
The phone-first profile arc (788–804) pinned subnotes white with no `rb-light` twin. Measured:
**1.07:1** — the estimates tab's "+ 2 sent estimates from the estimate editor … totaling $X" note
is literally invisible on the light profile, and every other `#projectView` subnote goes with it.
(The neighbouring `body[data-crm="community"] #commsView .subnote{color:#fff}` is gated; this one
lost its gate.) **Fix:** token it (`var(--rbe-mute,…)`) or add the light-scoped twin. One line +
both-themes render.

### F-4 🟠 `manual_estimates` still has an any-authenticated `ALL USING(true) WITH CHECK(true)` policy — on a table with 0 rows and no reader
The screen it fed was repointed at `estimates` at 568; the table kept its wide-open write policy
(the 23 Aug audit logged it as a dropped LOW — confirmed here against `pg_policies`). `ai_estimates`
(also 0 rows) keeps its own legacy policy set, and **is still queried by every Estimates-screen
load and written by the AI arm**. No data is exposed (the table is empty; `manual_est_read` shows
nothing to nobody) — it is an open write surface and dead weight.
**Fix:** ships with the D-build decision (drop the table, or tighten to `is_cardinal_admin()` if
anything might still want it). SQL either way, run before deploy.

### F-5 🟡 The editor's own placeholder teaches a title that dodges the document classifier
`isEstimateTitle()` (1015) strips the `EST-` prefix but still requires the remainder to START with
"estimate / siding estimate / …". The title field's placeholder suggests **"Roof Replacement —
Jane Smith"** — publish that and the document files under *Inspections*, and if signed it skips
`renderApprovals` + the "needs approval" email (the money path is safe — a `doc_id`-linked doc is
exempt from the doc leg since 1011). **All 18 live rows keep the default "Estimate — Name" shape,
so nothing is misfiled today** — this is the next user away from firing. Reproduced in the audit
rig: a doc titled `EST-2026-0896 — Roof Replacement — …` filed under Inspections.
**Fix options:** (a) classify a doc as an estimate when any `estimates.doc_id` points at it (title
stops mattering for published ones — most robust, matches 1011's `estDocIds` precedent); (b) make
publish prefix titles `Estimate — `; (c) change the placeholder. Recommend a+c.

### F-6 🟡 Delete-from-editor logs and refreshes against the wrong project
`cr-est-script` line ~47582 passes `{ projectId: state.project_id }` — the property is
`state.project.id`, so it is **undefined** and `deleteEstimate` falls back to
`currentProjectId()`, which is whatever profile was last open (or null) when the editor was opened
from Menu → Estimates. Cost: the audit-log row and the saved-list refresh target the wrong job.
Two-token fix, same class as the bug 970 killed in the publish path.

### F-7 🟡 One `CardinalEstimates` global, two `close()`s — the later block's editor-close silently replaced the list's close
Both `cr-estimates-script` (list: hides the mount) and `cr-est-script` (editor: removes `.open`)
export `close` onto the same merged API; the editor's wins by load order. Nothing is broken *today*
(`hideAllViews()` closes the mount by display, not through the API), but any future caller of
`CardinalEstimates.close()` expecting the list gets the editor. Landmine — rename one
(`closeEditor`) or namespace them when next touched. Related landmine: the claims cross-link calls
`openOne(id)`, which is the **AI output** view and `.single()`-reads `ai_estimates` — pointing it
at a table-estimate id answers "Estimate not found".

### F-8 🟢 Dead wiring and tombstones (cruft, not bugs)
`cr-eaf`'s `wireStats`/`wireManualRows` target `.cr-stat`/`.cr-row` — selectors that stopped
rendering with the lanes rebuild (0 occurrences in the templates); its `wireSave`/`wireSend` only
apply to the never-used AI output view. `cr-est-fix` keeps the "isn't shipped yet" modal + an empty
`rewireNewEstimate()` on a MutationObserver tick (documented tombstone, left deliberately at 395).
`openEditor` is still defined **five times** (main/doc editor, cpartners, cprop, lil, est) — the
name trap holds; grep the block.

### The dead selectors under the obsidian (context for V-1)
`cr-est-styles`' entire cream skin for `#cr-est-view` **never wins** — `cr-nvl-styles` (546,
"obsidian estimates+reports", 20,000 lines later) overrides it unconditionally. The sentinel's DEAD
check confirms (`#cr-est-view{background:#fdfcf7}` / `{color:#2c2c2c}` / clientcard cream: never
win). ~17 KB of half-dead CSS is the standing cost; the live hazard is that anyone patching
"the editor's stylesheet" by its id patches the dead one — 960 recorded exactly this trap.

---

### V-1 🔴 The obsidian conversion missed the money — the Total reads at 1.98:1
Sentinel, both themes (the editor is obsidian in both, by 546's decision), 390 + 1194px:

| Element | Ink (source) | Ground | Measured | Floor |
|---|---|---|---:|---:|
| `.cr-est-totals .grand-val` — **the estimate Total** | `#8f1620` (`cr-est-styles`, cream-era) | `#15161c` totals card | **1.98:1** | 3.0 |
| `.deposit .amt` — **the deposit dollars** | `#8f1620` (same) | `#25171e` deposit box | **1.89:1** | 4.5 |
| The inline "Deposit" label | `#8f1620` (inline `style=` in `renderTotals()`, JS) | same | **1.89:1** | 4.5 |
| `.cr-est-nav .navhead` (desktop TOC) | `#6b7688` | `#0a0e16` | **4.20:1** | 4.5 |

`cr-nvl` restyled the totals card's ground, rule and deposit box — and never touched these three
inks, the exact partial-pass shape of 527/960 (the pass "reads as done" because thirteen of
fourteen elements moved). **The most important numbers on the screen are the least readable ones.**
Fix values (computed; no invented colours — both are this module's own): `#f08a90` (already the
header/estnum accent) = **7.5:1** on the totals card, or white = 18:1 per the obsidian-tile
convention ("a theme-independent surface needs theme-independent inks", 545/546's own banner).
Rendered previews of both options accompany this audit; Theo picks.

### V-2 🔴 Six red buttons still hover to pre-migration GOLD (`#e8ba15`), white label ≈ 1.65:1 while hovered
The gold-value retirement (PR #8) missed the hover states: `.cr-est-head button.primary:hover`,
`.add-lib:hover` (editor), `.cr-lil-head button.primary:hover`, `.cr-lil-editor .save:hover`,
`#cr-pae-actionbar .wf/.confirm:hover`, `.cr-gmap-btn:hover` — plus the red→gold **gradients** on
`#cr-est-new-btn` ("Blank estimate") and the album's AI chip (`#c88a0f` partner, hovering to
`#e8ba15,#c8202e`). Desktop-only exposure (hover), and CLAUDE.md's gold census (`#c9a227`/`#b8860b`)
never counted `#e8ba15`/`#c88a0f` — six + two sites. Fix: `#B01F21` on hover — the darken-red the
app's modal primaries already use. (The Blank-estimate gradient is also the only gradient
*background* in the family; Theo's "no gradient colors anywhere" makes it a flatten candidate in
the same pass.)

### V-3 🟠 Light mode, standalone screen: the UNSENT lane title measures 2.81:1
`--rbe-uns-col`'s light half is `#9a9a9a` on white. (Sent `#c8202e` = 5.67 ✅, Accepted `#141414`
✅ — only the Unsent half fails.) Fix: deepen to `#767676` (4.54) or `#6d747d`; dark half untouched.

### V-4 🟠 Light mode, profile tab: "Saved Estimates (n)" heading 2.95:1, "Job Value — from estimate" caption 3.7:1
The saved-list panel is pinned dark in both themes (`cr-hd2-styles`, `#202329` — deliberate,
fine) but its heading ink `#6b6b6b` was chosen for light ground → unreadable on the panel. Fix:
`#9aa0a8` (5.97 on the panel, an existing app grey). The Job-Value caption needs its light twin
deepened. Plus F-3's invisible subnote, same screen.

### V-5 🟠 The profile docs table paints money `#c8202e` on the dark row — 2.54:1 at phone width
Sentinel: `b "$14,400" rgb(200,32,46) on rgb(38,42,49)` (`docTable` output on `#tab-estimates`).
Cardinal red as INK on a dark ground fails; `#f08a90`/`#e35c63` clear it (6.6 / 4.5). Check the
class's other users before patching — `docTable` serves every document list.

### V-6 🟡 The flow still crosses four different grounds; worst in the popovers
Dark mode walk: dark list → obsidian editor (consistent) → **white `#pEstMenu` template popover
with emoji rows** (🏠🧱🪟⭐🌧🔧 — the 686–699 emoji sweep never reached this menu, the 💰/⚡/📄/📷
chips, or the epub 🖨) → grey preview chrome over the white Letter document (correct — that is
paper) → in light mode the admin Line Item Library flips cream while the editor stays obsidian.
None of it fails a floor; it reads as three eras on one flow. Options priced in the plan.

---

## 3 · Usability — what the live data says about the workflow

**U-1 · Save closes the editor, every time, behind a blocking `alert()`.** Save Draft → editor
gone; to keep working you re-open from the saved list. Publish and → Contract each click Save for
you (editor closes), then surface *another* alert mid-flow. **The live tell: 5 of the 8 draft
estimates are $0.00 duplicates** — Betty Mann ×3, Willie Parson ×2, identical titles — exactly the
residue of "typed, got closed, started again". Proposal: Save stays in the editor (button flashes
"Saved ✓", number appears in the header), a separate Done leaves, toasts replace alerts. The
satellites' save-then-poll choreography (`waitForEditorClose`) keeps working — it polls the class,
and Done still closes.

**U-2 · No unsaved-changes guard.** Cancel (and Back — the editor is properly registered in
`hideAllViews`/history) discards silently. One `confirm` when dirty.

**U-3 · Up to six header actions in a scrolling strip at 390px** (Cancel · Delete · → Contract ·
Publish · Preview · Save). `cr-hd2` made the strip scrollable (right call vs overflow), but the
primary action can sit off-screen on a phone. Proposal: Save/Publish pinned in a bottom bar on
phones; Delete into an overflow.

**U-4 · The profile's three creation doors make two different things** (template → document,
blank → table row; AI → a third, never used). The 9xx renames ("＋ From a template" / "Blank
estimate") were the right cheap fix; the deep fork stands: template estimates never appear in the
lanes screen or the estimates table, price from a fourth source, and reach money through the
legacy doc leg. Unifying (templates that prefill *table* estimates from the Line Item Library) is
the real fix and is priced as its own build — not bundled into the visual pass.

**U-5 · The standalone screen leads with the arm nobody uses.** "⚡ AI Estimate" is the primary
button; usage is 18/18 manual, `ai_estimates` 0 rows ever. "+ New" (the actual workhorse) is
secondary and doesn't say "estimate". Recommend: "+ New estimate" becomes primary, AI demotes to
secondary — or the AI door hides pending Theo's keep/retire call on the arm (its `/api/estimate`,
`ai_estimates`, `estimate-to-contract`, and the `contracts` table ride on that decision; retiring
the *door* costs one line and loses nothing that has ever been used).

**U-6 · Numbering surprise, worth one sentence in the UI:** a new estimate shows no number until
saved (server default assigns `EST-YYYY-NNNN`); the header could say "number assigned on save"
instead of an empty slot labelled `new`.

---

## 4 · "Does the dark colors make sense for the manual estimates?"

**Short answer: yes — the obsidian editor is your own pick (build 546, "obsidian estimates +
reports", from 545's Activity-tile precedent), it is the right call for a tool screen in a
dark-first app, and the printed/emailed estimate the client sees is white Letter paper regardless.
What does NOT make sense today is that the conversion was never finished: the Total sits at
1.98:1, the deposit at 1.89:1, six buttons hover to 2021-gold, and in light mode the surrounding
screens (lane titles, saved-list heading, subnote, docs-table money) fail their floors. Dark isn't
the problem — the unfinished edges are.**

Numbered, for the pick:

1. **Keep obsidian, finish it** (recommended — Build A below, one build): fix the seven computed
   failures + hovers, kill the emoji/white-popover stragglers. The editor stays black in both
   themes per 546; the flow reads intentional again. Cost: ~1 build, CSS-only + one JS inline ink.
2. **Keep obsidian dark-mode-only, restore a light editor in rb-light**: undoes 546's
   theme-independence ("obsidian is black in both modes — Theo's pick"); cost is real (a light
   twin for ~56 nvl rules, both-themes gates) and it re-opens a settled decision. Only if the
   black editor actively bothers you in light mode.
3. **Paper editor everywhere** (match the document): a full redesign of a working screen; not
   recommended — the money is in finishing, not repainting.

---

## 5 · The plan — four builds, smallest first, each gated

**Build A — "the estimate screens, finished" (visual repair; CSS + 1 inline ink).**
Grand-val/deposit inks per the rendered option Theo picks (1 = white money, 2 = `#f08a90` accent);
navhead nudge; the six `#e8ba15` hovers → `#B01F21`; flatten the two red→gold gradients;
`--rbe-uns-col` light half; Saved-Estimates heading `#9aa0a8`; `#projectView .subnote` theme fix
(F-3, one line, fixes the whole profile); docTable money ink on dark rows; drawn icons replace the
family's emoji; `#pEstMenu` popover restyled to the dark panel convention.
*Gates:* sentinel over `sentinel_setup_estimates.js` states, both themes — currently 10 INK
findings on these screens; the build is green when it reports **zero** and the previous artifact
stays red (negative control built into `--since`).

**Build B — the lanes tell the truth (F-1 + F-6).**
`CRE_LANES` learns `accepted`; `declined` gets its lane (or Theo's alternative); unknown statuses
stop impersonating drafts; pipeline/accepted sums follow; the two-token `state.project.id` fix
rides along. *Gate:* jsdom over `creLane`/`renderEst` with all four statuses seeded + both sums
asserted; control red on 1023.

**Build C — the editor keeps up with you (U-1/2/3/6).**
Save-in-place + Done, dirty guard on Cancel/Back, toasts for save/publish outcomes, phone action
bar, "number assigned on save". *Gate:* the satellites' publish/contract flows re-proven
(they poll the editor-closed class — Done still closes; `gate_970`-style id-match rerun), plus a
Chromium walk of save-edit-save.

**Build D — retire the dead weight (needs Theo's picks, SQL first).**
(1) `manual_estimates`: **drop** (recommended) or tighten to admin — either closes F-4.
(2) ~~The AI arm: keep the door, demote it, or retire the door (U-5)~~ **SUPERSEDED 23 Aug — Theo's
direction, verbatim: "Instead of ai estimates, is there a way for an option to combine the two with
pictures? So just estimates, click a box for ai and use pictures to supplement the estimate with
captions and an overview?" → Build E below is that design; the separate AI doors, screens and the
`ai_estimates`/`contracts` legacy retire once E lands.** (3) `isEstimateTitle` robustness per F-5
(doc_id-linked docs classify as estimates) + the placeholder. (4) cr-eaf dead wiring out. *SQL
ships separately, runs before deploy, per convention.*

**Build E — AI assist INSIDE the estimate (Theo's 23 Aug direction; replaces the separate AI arm).**
One estimates product. In the editor's Photos section, one AI action beside "+ Attach Photos":
tap it and (a) every attached photo **without a typed caption** gets one through the existing
`/api/caption` route — the same endpoint, spend-gate and "edit if needed, then save" posture the
Photo Album's ✨ AI Caption has used since it shipped — (b) one overview call drafts a short
scope paragraph from the photos + the line-item names, **proposed into Scope Notes** (appended for
review, never overwriting typed text), and (c) — Theo's 23 Aug add — **the same call names the best
cover photo**: when no photo carries the ☆ cover mark yet, the AI's pick gets it (the shot that
prints large above the pricing), with a toast saying so; a cover the rep already chose is NEVER
moved, and the ☆ stays tappable to override. One response shape serves all three:
`{ overview, captions[], cover_index }`. Publish then prints both exactly where they already print:
the cover large above the pricing, the captioned grid under Photo Documentation, the overview under
Scope Notes. Nothing touches `ai_estimates`; the row stays an ordinary estimate.
- **Extend, don't add:** per-photo captioning is the album's existing machinery reused on the
  estimate's own photo strip; the only genuinely new piece is a small `overview` mode on
  `api/caption` (multi-image + context → one paragraph). Reusing `api/estimate` instead was
  considered and rejected: it prices a full estimate to throw most of it away and writes an
  `ai_estimates` row.
- **No new data exposure:** these are the client-gallery photos the album already sends to the same
  AI route today; same staff gate (1016), same keys.
- **Review-before-print holds** (The Walk's rule): AI text lands in editable fields the rep
  confirms; nothing AI-written reaches the published document unseen.
- **Fill-not-overwrite is the contract:** a typed caption is never replaced; Scope Notes is
  appended, not clobbered; an existing ☆ cover is never moved (AI proposes one only where none is
  set). The gate asserts all three, against the previous build as control.
- Open picks for Theo: trigger shape (recommend a tap-to-run button — each run is a paid call, so
  it should spend visibly — over a checkbox that fires on attach); whether AI may also *suggest
  line items* from the photos (the machinery exists in `api/estimate`'s catalog prompt; default
  OFF, its own decision later); and how far the old arm's cleanup goes in the same PR (hide the
  two "⚡ AI Estimate" doors only, or also delete the AI create/output views and drop
  `ai_estimates` — SQL).
- Cost, honest: ~1 build for the editor button + caption fill + overview + states, including the
  small API mode; door-removal/SQL cleanup rides as the Build-D slice.

**Build F — the client-facing estimate document (Theo's 23 Aug ask: "make the estimate client
side look better").** The published document (`buildDocHtml`, cr-epub) is what the homeowner
prints, gets emailed, and opens from the share link. Two problems, both rendered as labelled
previews for the pick:
- **The share link has no phone layout at all.** `buildDocHtml` emits a fixed `width:8.5in` body
  and NO viewport meta, and `api/share.js`'s head-injection adds print fixes only — so a phone
  lays the page out at 980px and shrinks it to unreadable size. Verified in a true-mobile render.
- **The dress is 2021-era:** full grid borders on the meta table, a black header fill on the items
  table, the pink deposit box.
Two options rendered from the SHIPPED `buildDocHtml` output with content byte-identical (every
word of scope, payment instructions, ORC-adjacent text, photos and signature lines unchanged):
- **Option A — clean letterhead:** hairlines instead of grids, small-caps field labels, no header
  fill (2px charcoal rule), calmer payment blocks, tabular numerals, refined type scale — plus the
  viewport meta and stacked phone layout.
- **Option B — A plus a summary strip** under the letterhead: Total (red) · Deposit at signing ·
  Valid through — the numbers the homeowner looks for, first.
Implementation notes for the build: one stylesheet swap inside `buildDocHtml` (+ the strip markup
for B, values from the est row) + the viewport meta; the section-number chips (`h2.sec .num`),
`table.meta td.k`, `.deposit-box`, `.note`, `.sign` and figure classes all keep their names, so
`api/share.js`'s FIX (empty-section hiding, renumbering, print footer) keeps working — verified
against the FIX's selector list. Published documents are frozen snapshots: old docs keep the old
look until re-published (publish already self-heals onto the current builder, 1014). Preview
renders live in the audit artifact; the generator (`gen_docs.mjs` pattern — execute the shipped
builder, replace only the stylesheet) is the gate shape for the build.

**Deliberately NOT in the plan without a fresh ask:** offline estimate creation (settled, 17 Aug);
option-grouping for multi-quote clients (the Kimberly Guy pattern — two sent + three drafts on one
job — is real and interesting, but it is scope, and 997 already keeps the accepted one the number);
merging the template documents into table estimates (U-4 — priced only if wanted).

---

## Appendix — measurements that back the claims

- Blocks + line spans, the 19-door table, and the five `openEditor` definitions: session recon,
  23 Aug, against e03195c.
- DB: `estimates` 18 rows (8 draft/8 sent/2 accepted; 5 drafts at $0; all one creator; titles all
  "Estimate — …"); `manual_estimates` 0 rows; `ai_estimates` 0 rows; `estimate_line_items` 19;
  `estimate_number` column default `EST-YYYY || lpad(nextval(estimate_number_seq),4,'0')`; no
  triggers on `estimates`; policies as quoted in F-4 (pg_policies, 23 Aug).
- Contrast (computed WCAG): `#8f1620` on `#15161c` 1.98 · on `#25171e` 1.89 · `#f08a90` on those
  7.52/7.17 · white 18.05/17.21 · `#e35c63` 5.14/4.90 · white on `#e8ba15` ≈1.65 · `#9a9a9a` on
  white 2.81 · `#6b6b6b` on `#202329` 2.95 · `#9aa0a8` on `#202329` 5.97 · `#c8202e` on `#262a31`
  2.54.
- Sentinel runs: 20 renders (5 states × 2 themes × 2 viewports) before the rig fix — 5 INK,
  20 DEAD, 1 PAGEERROR-class; after the rig fix the rb-light leg alone reports 10 INK with 0
  errors. `--selftest` green before every trusted run.
- The rig: `scripts/sentinel_setup_estimates.js` (populated rows: accepted/sent/draft/declined,
  itemized + lump-sum, states `eslist`/`esteditor`/`estlibrary`/`estpreview`/`estprofile`) —
  run it as the middle `--setup` file, after `sentinel_setup_cardinal.js`.
- **Found in passing, outside this audit's scope, logged so they are not lost:** the left rail's
  "Landing" row is `#f0c651` on near-white in rb-light — **1.56:1** on every desktop screen; and
  the profile's danger-zone caption ("Permanently removes this client…") measures **2.42:1** in
  rb-light. Both belong to whatever build next touches the rail / the profile shell.
