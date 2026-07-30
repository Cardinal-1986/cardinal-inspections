# Theming — the rb-light system and the rules around colour

*Snapshot at build 427. Live version: `CLAUDE.md` "The three CRMs" + FEATURES.md.*

## "The gold palette was retired" is only three-quarters true

**Do not over-apply it.** PR #8 migrated **542** values (`#d4a017`→`#c8202e` cardinal red, `#f5d061`→`#e35c63`, `#8a5a00`→`#8f1620`, plus rgba twins). It did **not** remove gold.

*Verified at 427:* the three migrated values are at **zero occurrences**, and the survivors are exactly **`#c9a227` ×17** (the retail CRM badge) **+ `#b8860b` ×10** (the fallback colour under 10 gradient-clipped text rules) — **27 gold hex values, all correct where they are.** The brass Client Directory also uses gold for chips and active icons.

**Token *names* survived their value change** — `--ins-gold` is now `#c8202e`. So **grep the value, not the word "gold."** Before "finishing the migration", check whether the gold you found is the badge, the brass directory, or a gradient fallback.

## Colour changes are rarely local

Of **253** blue/cyan rules in the file, only **4** carried a community selector — the rest are ungated. **A find-and-replace on a hex value is an app-wide restyle in disguise.** Gate first, then restyle.

**`crmNow()` computes the active CRM; `skin()` publishes it to `body.dataset.crm`.** `window.CardinalHeader.crm` is `crmNow` and recomputes on call — use it when you need the value *before* `skin()` has run. Everything else reads the DOM mirror (`document.body.dataset.crm || 'retail'`, 6 sites), and **CSS must gate on the attribute**: `body[data-crm="community"]`.

**The surviving occurrences of an edited value are the proof the other CRMs were untouched — assert on them.**

## Community theming

**57** `--ccm-*` token declarations, dark by default at `:root` with a `[data-theme="rb-light"]` override. `body.cr-cc-open` is toggled in **exactly one place** (the client page's `takeOver()`), which makes it a safe community-only gate.

## The system (retail rb-light)

**A second theme for Retail only** (builds 374–388), layered on the committed dark base. **Dark stays the default.** Claims and Community are untouched and not planned.

- **Switch:** the moon/sun button, bottom-right — the repurposed dead build-186 dark-mode button. Sets `data-theme="rb-light"` on `<html>`.
- **API:** `window.CardinalRBTheme { toggle, isLight, setLight }`, persisted in `localStorage` under `cardinal.theme.rb`.
- **Visible only when `body.dataset.crm === 'retail'`.**
- **Mechanism: tokens, not an override layer.** `--rbe-*` defined once in `:root` and again under `:root[data-theme="rb-light"]`. One variable swap drives both themes. Retail-B was torn out at 21 override rules — **do not reintroduce that pattern.**
- **Palette is red/black**, not gold: `--rbe-acc:#c8202e`, `--rbe-accdk:#6b0f18`, `--rbe-acclt:#d4424c`, ground `#f7f7f7`, panels `#fafafa`.
- **`--bg` is the global page ground** (386) — retail iron `#202329` in dark, `#f7f7f7` in light. Pages whose content doesn't fill the viewport (Photo Activity, empty states) show it directly. Every other page only *looked* right because its cards covered it.

**Covered:** Estimates · All Leads & Jobs · Home (pipeline circles, Work Schedule, AR, Recent Leads, Today, Punch strip, Client Projects cards, activity strip + feed) · Photo Activity · Team + Production calendars.

**Not covered:** client profile (Keeper) · standalone Punch page · Production board · Reports · Contacts/Client Directory · Sales Floor · everything in Claims and Community.

## Colours that stay FIXED in both themes — semantic, not decorative

**Do not "finish the job" by tokenizing these.** More than one build was spent re-learning this:

- Milestone/pipeline circle colours (L·P·A·C·I) and the white letters/digits on them
- Status spines and stage accents (`--sc`, `--stgc`, `--rcn`, `--pc`)
- The **lavender PO** on client cards (a deliberate distinguishing choice)
- Urgency red, priority colours, CRM badge colours (retail gold / insurance teal / community blue)
- The AR chart's amber bars, the Activity Count orange figures
- The lit favourite star
- Photo captions (`.phn`) — they sit on the **photo**, not the page
- The chrome-bar blacks (`--cr-black` in the estimates mount) — white text sits on them

**The header chrome is independent.** `body .site{--hbg/--hln/--hac/--tgrad}` is per-CRM and does **not** follow the page theme. Dark chrome framing a light page is intended.

## Before "fixing" a light element on a dark ground — ask three questions

Three items flagged mid-session as "never got the dark treatment" were all wrong:

1. **Is it hidden?** `.dashcard` — the "hardcoded white ribbon" — has been hidden by `#mainView .dashcard{display:none}` since 352. Dead markup, kept on purpose because deleting markup with boot listeners has broken the app before.
2. **Is it chrome with its own system?** `#cr-hd2-ribbon`, the clock/date bar, belongs to the header chrome and its per-CRM tokens. It stayed correct in every screenshot all night.
3. **Is it deliberate contrast?** The calendars are a **paper-on-iron** design. Cream cells on the dark ground is *why* they read correctly in dark mode. Tokenizing would have destroyed a working design.

Only after all three is it a gap.

## When an override beats a token (the one sanctioned exception)

The rule is tokens everywhere. **The exception is when dark and light need genuinely different designs, not the same design in two palettes.**

**Two sanctioned exceptions, both because dark and light needed genuinely *different designs* rather than one design in two palettes:**

1. **The calendars (387)** — scoped `:root[data-theme="rb-light"] .teamcal ...`, dark original byte-for-byte intact. Theo picked **Option C, red-tinted paper**, from a three-option preview. `.teamcal` covers both the Team and Production calendars.
2. **The brass Client Directory (391)** — same discipline, same reason.

Retail-B was torn out at 21 override rules; that is the failure mode these two are measured against.

**This is not licence to reach for overrides generally.**

## Verification

**jsdom cannot verify tokenized colour at all** — see `gates.md`, "What the gates can and cannot see." Assert on the CSS text, negative-control against the previous build, and say plainly that Theo's eyes are the gate. Every colour claim in 374–388 rests on his screenshots, not the tooling.

Also, before patching any colour rule, run `scripts/selector_audit.py` — `.acthead` had four definitions and the winner was 39,000 lines from the two you'd find first.
