# Cardinal Resource App — Session Summary

**July 26, 2026 · builds 298 → 308 · workflow rebuilt, chrome unified, community finished, one lockdown, one bug hunt**

---

## What shipped

**A new build workflow.** The splice pipeline is gone; every build is direct surgery on the shipped file with exact-match asserts, atomic writes, and gates that grew teeth over the day: whole-string assertions, structural visibility proofs, faithful harness replicas of base structures, lifecycle tests for adopted elements, a dupe-API check, and a staged-on-green rule. Three of those gate rules exist because their absence shipped a bug earlier the same day.

**One header, everywhere.** Four controls — burger, a centered gradient title that names the screen, small search, small ＋ — over a banner holding a gold home button and either the clock or the client's PO and name. Five skins from one variable system; retail wears black and gold with a gradient hairline. The phoenix headers on Cardinal Truth, Insurance Clients and the Resource Library are retired, those views tucked under the shared chrome at z-60 so every menu and sheet opens on top of them — which is what "the dropdown won't open" and "the plus opens behind the page" actually were. The switcher and the health shield live in the bottom bar on every screen.

**Community, front to back in Frost.** The home: Bids with live due-date countdowns (the `bid_due_at` gap closed itself — the field was already in the New Bid form), Partners grouped by the app's own vocabulary, Clients by stage; totals admin-only, sales see their own pipeline labeled as such, production sees work without money. The client page: a real takeover with Thread and Bid, plus a Job Menu that mirrors the base's live tiles and passes taps to the base's delegated handler, plus the actual Leaflet map and the actual Google Reviews card — adopted, not copied, with a stash-and-return lifecycle proven across mount, re-render and exit.

**Retail went dark iron.** Ground `#202329`, and every red line, cap, border and chip turned gold through one mechanism: 157 stylesheet literals converted to `var(--red)` with the variable remapped per-CRM. The layer-vs-commit decision is written down as a tripwire rather than a vibe.

**The lockdown.** Estimates and punch items are scoped to project visibility through the proven projects RLS; the line-item catalog was correctly exempted after the pre-flight guard stopped a wrong assumption cold; the punch view answers as the caller; an anonymous probe of the live API returns zero rows on every sensitive table.

**The bug hunt.** An 830-id phantom audit, duplicate-id triage (iframe-scoped, safe), orphan-handler scan, and a runtime walk of every menu option and API. One live bug: two modules overwrote `CardinalEstimates`, silently killing nine AI-estimate buttons — the exact duplicate-API class the retired lint used to catch. Fixed with merges; the check is now permanent.

## What cost the most

**My own patch tooling, twice.** Literal `\1` backreferences fed to a plain-splice helper destroyed five skin rules while a fragment-level gate passed on the wreckage; and a test harness seeded with tiles I invented validated a proxy against elements that never existed. Both are now doctrine: whole-string assertions, and harnesses that replicate the real builder. The honest pattern of the day: every regression I shipped was caught by Theo's screenshots, root-caused in the file rather than theorised, and came back with a gate that can't miss it again.

**Legacy paint with conditions.** The mint header only appeared with a client open (`body.claim-community header.site`); the phantom ＋ was a compact-mode `::after` from an old layout; the cream strip was the site footer sitting in document flow. None were new code — all were old rules meeting new chrome.

## Open

OpenAI quota, Resend domain, Gemini key rotation, repo junk, PDF masters, PITR, the $10M test value, the scheduled-$0 rollup, claim-type stamping on new leads, community analytics/feed/calendar, retail print styles before any dark-theme commit — and a Self Check walk on device, because ten green machine batteries still can't see a pixel.

**Post-close addendum (309–313):** the login flash root-caused to the old landing's static markup and silenced with a stamp-gated hide (markup retained for its boot writers); Truth and Community corrected to their real theme colors on the landing and switcher with the Landing card finally getting rules of its own; Self Check's stale Claims section remapped to the live chrome after the on-device audit came back green everywhere else; dark canvases behind Community and Claims ended the white rubber-band; the AccuLynx import pop-up joined the retail dark-iron language with white, black-lettered option cards; titles scaled to carry the bar; and the in-app What's New now tells users the story of all fifteen builds.

**Final addendum (314–323):** the resurrected AI Estimates surface exposed an unfinished manual-estimate stub, now wired to a client picker; both remaining flashes died at their true roots (the orphaned restore veil finally has a job; community clients pre-take before loading); the estimate editor learned to hydrate from a bare project id, stopped swaying, and scrolls clear of the nav; the client head card's mystery height was 170px of padding reserved for permanently hidden buttons — deleted at source after one blind patch made it worse; and the title saga ended with a preview and a user-picked fixed 34px after three imperceptible nudges wasted four builds. The day closed with a diagnosis: the late-session bug trickle was the retail override layer meeting unpainted corners, the tripwire is effectively fired, and **next session opens with retail-B**. The roadmap after: community tab-tiles fix, the $0 scheduling rollup, claim-type stamping, community analytics/feed, then cleanup.

**Second wind (324–332).** The day didn't end at 323; it turned into the longest stretch of the session. Two buried-control bugs surfaced from real use: the **photo Attach bar** had been sitting under the bottom nav since the nav existed, and the **community tab tiles** opened behind the Frost takeover — the latter fixed with suspend-and-return and a "back to bid view" pill, closing the roadmap's #1 gap. Then features: **ABC Supply**, built end-to-end against their published API (proxy, token cache, catalog search, branch pricing, the $0-means-call-them case) and blocked only on ABC's own auth accepting the credentials; **Community Analytics**, the one thing on the community list that genuinely didn't exist, placed as a tools tile rather than a fourth tab; **Activity and Calendar** wired to the surfaces that already existed instead of rebuilt. Finally the correctness pass: the **$0 rollup** (money now reads accepted estimate totals through the single `bidAmt` chokepoint), **claim-type stamping** from the active portal, and eight dead handlers deleted.

The most valuable failure of the night was mine: build 330's first attempt **staged a stale file containing none of the fix while its gate reported green**, because the check happened to match an unrelated query. That produced two permanent rules — assert the marker in the artifact you just wrote, and negative-control every gate against the previous build before believing a pass. Both 330 and 331 shipped with a demonstrated failing control.

*Written at build 332, sometime after 1am.*
