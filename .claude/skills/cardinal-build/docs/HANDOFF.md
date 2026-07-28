# Cardinal — Session Handoff (retail light theme, builds 374–388)

**Give this to the new chat first, alongside the doc set.** The doc set (START_HERE / FEATURES / OPEN_ITEMS / BUG_CLASSES / cardinal_build_log) is current through **388** — read those for state. This file covers what they don't: what was learned, what's staged, and what to do next.

*Written ~10:30pm, July 27–28, 2026.*

---

## 1. Where the build actually is

**Live in the repo:** whatever Theo last uploaded — confirm with the footer (`v2026-`). As of writing, builds through **388** were staged and each was verified on device by Theo as it shipped.

**Staged artifacts** (`/mnt/user-data/outputs/`, one per build): `cardinal_v374_index.html` … `cardinal_v388_index.html`. Only the newest matters; the rest are lineage. **388 supersedes everything before it.**

Nothing is half-shipped. Every build passed its gates and was confirmed on Theo's phone before the next one started.

---

## 2. What was built: the retail light theme (`rb-light`)

A **second theme for Retail only**, layered on the committed dark base. Dark stays the default.

- **Switch:** the moon/sun button, bottom-right. It is the **repurposed build-186 dark-mode button** — that old overlay was dead weight after retail-B made dark the base. Now drives `data-theme="rb-light"` on `<html>`.
- **API:** `window.CardinalRBTheme { toggle, isLight, setLight }`, persisted in `localStorage` under `cardinal.theme.rb`.
- **Retail-scoped:** the button only appears when `body.dataset.crm === 'retail'`. Claims and Community are untouched and not planned.
- **Mechanism: tokens, not an override layer.** `--rbe-*` defined in `:root` and again under `:root[data-theme="rb-light"]`. Retail-B was torn out at 21 override rules; do not reintroduce that pattern.
- **Palette is red/black**, not gold: `--rbe-acc:#c8202e`, `--rbe-accdk:#6b0f18`, `--rbe-acclt:#d4424c`, ground `#f7f7f7`, panels `#fafafa`.

**Covered and verified on device:** Estimates · All Leads & Jobs · Home (pipeline circles, Work Schedule, Accounts Receivable, Recent Leads, Today, Punch strip, Client Projects cards, activity strip + feed) · Photo Activity · Team + Production calendars.

**The full fixed-colour list is in FEATURES.md.** Read it before touching anything. Milestone circles, status spines, urgency red, CRM badges, the lavender PO, photo captions and the chrome blacks are **semantic** — they must not be tokenized. More than one build was spent re-learning this.

---

## 3. The five real bugs found along the way

These are in BUG_CLASSES.md too, but they're the spine of the session:

| # | Symptom | Real cause | Build |
|---|---|---|---|
| 1 | "Dark mode isn't there on AI Estimates" | `styleMounts()` force-set `background:'#fff'` **inline, on a timer**. Inline beats every CSS rule regardless of specificity | 378 |
| 2 | "The Estimates page doesn't have the new design" | **Two separate Estimates screens.** The menu item named *Estimates* opened a legacy table; the redesign sat behind *AI Estimates* | 379 |
| 3 | Pipeline counts invisible in light mode | `.pcount` renders **below** the coloured circle, on the card — not inside it. It must theme; the letter inside the circle must not | 381 |
| 4 | Photo Activity stayed dark | `--bg`, the **global page ground**, was never theme-aware. Every other page only looked right because its cards covered the viewport | 386 |
| 5 | Activity strip patch did nothing | `.acthead` had **three** definitions. Two were patched (both dead); the winner was ~39,000 lines later in `cr-est-fix-styles` | 388 |

**#5 is the important one procedurally:** source-order reasoning over the two rules you find first will ship a silent no-op. Grep the whole file for every occurrence of a selector before patching it.

---

## 4. The gate limitation — read this before trusting any green run

**jsdom does not resolve `var()` inside `background` / `border` shorthands.** It returns `rgba(0,0,0,0)`.

Proven with a control test in build 388: a plain-hex rule from the same stylesheet applied correctly, while every `var()`-based rule in that same block read transparent — **including `.pu-empty`, code from build 384 that Theo had already confirmed working on his phone.**

What this means:

- `getPropertyValue('--x')` **works** — that's why the `--bg` (386) and calendar (387) gates were honest.
- Computed `backgroundColor` from a `var()` **does not work** — that's why the `.actbox` gate could not be made to pass.
- A functional gate can verify **structure** (element exists, class applied, attribute set, JS API behaves) and **directly-read custom properties**. It **cannot** verify that a tokenized colour renders.

**For colour work: assert on the CSS text, run the negative control against the previous build, and say plainly that Theo's eyes are the gate.** Do not report a green jsdom run as proof the colour is right. Most of this session's colour verification was Theo's screenshots, not the tooling — the reports should have said so earlier than they did.

---

## 5. Three false alarms — do not re-flag these

All three were flagged mid-session as "never got the dark treatment," and all three were wrong. This is the counterpart to the prime doctrine (*things that look missing are usually buried*): **not every light-coloured thing on a dark ground is a gap.**

- **`.dashcard`** — the "hardcoded white ribbon." Hidden by `#mainView .dashcard{display:none}` since build 352, single instance, inside `mainView`. **Dead markup**, deliberately kept because deleting markup with boot listeners has broken the app before.
- **`#cr-hd2-ribbon`** — the visible clock/date bar. Part of the **header chrome**, which has its own per-CRM token system (`--hbg` / `--hln` / `--hac` / `--tgrad`) independent of the page theme. Dark chrome framing a light page is the intended design. It stayed correct in every screenshot all night.
- **The calendars** — a deliberate **paper-on-iron** design. Cream cells on the dark ground is *why* they read correctly in dark mode. See §6.

**Ask first: is it (a) hidden, (b) chrome with its own system, or (c) deliberate contrast?** Only then is it a gap.

---

## 6. The calendars — the one sanctioned override

Build 387 is the single place this session used **scoped overrides instead of tokens**, and it was correct:

```css
:root[data-theme="rb-light"] .teamcal .minical .calgrid .day{ ... }
```

**Why:** dark and light needed *genuinely different designs*, not one design in two palettes. The dark original (cream cells, gold headers, on iron) is a real design that tokenizing would have destroyed. The dark CSS is untouched byte-for-byte.

Theo chose **Option C — red-tinted paper** from a three-option preview (A: leave as cream, B: crisp white/grey, C: red-tinted). `.teamcal` covers both the Team and Production calendars; a functional gate confirmed both, and confirmed dark mode was unaffected.

**This is not licence to reach for overrides generally.** Retail-B was torn out at 21 override rules for exactly that reason.

---

## 7. What's next, in order

**1. Client profile page (the Keeper profile) — the big one.**
Biggest surface left and the screen the crew touches most. Hero card, Job Menu tiles (`.jatile` in `#jaGrid`), Location map card, Payments / Punch / History pills, the Cardinal-red timeline.

- **Do the B3 check first** — some of it is likely deliberate contrast, not an unswept gap.
- Insurance keeps its own skin on this page; don't disturb it.
- This deserves a fresh session. It was deliberately *not* started at the end of this one.

**2. Standalone Punch page** (`#punchView`) — the "See all ›" destination. Home strip is done; the page is not.

**3. Production board · Reports · Contacts/Client Directory.** Reports may need canvas-level colour work (charts). The Client Directory is brass-themed and may need its own design decision like the calendars did — preview options rather than guessing.

**4. Sales Floor, Objection Coach, Documents, Scheduling** — lower traffic, last.

**Not planned:** Claims and Community. The toggle is retail-scoped.

---

## 8. Everything else still open (unchanged this session)

None of this was touched — see OPEN_ITEMS.md for the full list:

- **`punch_columns.sql`** still needs running (Scheduled tab + photo storage are blocked without it)
- **ABC Supply 401** · **OpenAI credit** · **Resend sender domain** · **Gemini key rotation + billing**
- **Repo junk** — delete `api/api/`, `api/index.html`, `api/vercel.json`
- **Contract PDFs** — `docs/` folder still doesn't exist in the repo; siding + window masters still missing
- **$10,000,000 test value** — database data, fix it in the app
- **Supabase PITR** unconfirmed

**Security, still outstanding and worth chasing:** a GitHub personal access token was pasted into chat this session and needs revoking if it hasn't been (GitHub → Settings → Developer settings → Personal access tokens). The old Gemini key exposure is still unrotated too. Secrets go into Vercel/GitHub directly, never into a chat message.

---

## 9. Working with Theo

Mobile only, deploys through the GitHub web UI, works very late. Terse — often a single word. Wants honest costs, no flattery, and will say "keep going" for hours if the work is landing.

**Screenshots have root-caused more bugs on this project than reasoning has, and did so repeatedly tonight.** Builds 379, 381 and 386 were all found from a screenshot, not from reading code. Ask for one before theorising.

**Cache discipline matters and cost real time tonight:** twice, a "the fix didn't work" turned out to be the service worker serving a stale build. Always remind: fully close and reopen the PWA **twice**. And before assuming a bug, verify the fix is actually present in the file that shipped.

Preview visual changes before shipping them — the three-option calendar preview took one round and got a decision immediately. One build at a time, staged separately, verified on device before the next.
