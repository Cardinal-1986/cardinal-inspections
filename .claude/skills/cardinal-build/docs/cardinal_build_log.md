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
