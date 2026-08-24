# The Supplement Desk — audit, market research, and three overhaul directions

**24 Aug 2026. Nothing built. Previews only.**

Theo: *"Also deep audit into the ai desk. It's not what I had imagined. It needs an
overhaul. Come up with some ideas on how that can happen. Deep research other ai
insurance programs such as XBuild and rooftop.ai as well as other popular services.
Do this last as I'd like some previews and ideas."*

Previews: **https://claude.ai/code/artifact/e058e446-d124-4445-877c-5d04bbc6f34a**

---

## What the Desk is

`supplement.html` (71 KB, its own sign-in, admin-only) + `api/supplement.js` (34 KB).
A four-step wizard: **1 Scope → 2 Gaps → 3 Letter → 4 File**.

**The engine is genuinely good and must survive any overhaul.** From its own header:

> The model is never allowed to cite building code from its own recall. It may only
> point at entries in PACK below, by id — and the citation STRING the caller sees is
> copied server-side from the pack, never taken from model text.

`PACK` is 22 Ohio entries (`ice_barrier`, `drip_edge`, `discontinued_shingle`,
`matching_slope`, `step_counter_flashing`, `cricket`, `kickout`, …) extracted from
Cardinal's own Supplement Templates page, and `harness_667` pins every citation to
that page so the pack cannot drift. Letters are **quantities-only** by Theo's rule; a
`$` in the output raises `dollar_flag` for a human rather than being silently edited.

**Keep both of those.** They are the hard part and they are right.

## What is wrong

| finding | evidence |
|---|---|
| **Blocked until a scope PDF is filed from another screen** | rendered on a live claim: every card reads "none yet"; `analyzeBtn` disabled |
| **Photos optional, bolted on at the letter stage** | `syncDraftBtn()` counts `included` only — it never checks evidence |
| **Runs on Gemini + gpt-4o-mini** | `GEMINI_MODELS = ['gemini-3.6-flash','gemini-3.5-flash']`, OpenAI second rung. The librarian left this exact path at **806** because the free tier 503'd ~1 call in 4 |
| **`read_response` returns 501** | *"arrives with the next build of the Desk"* — it has not |
| **Separate app, separate sign-in, no claim context** | you leave the CRM to use it |
| **Phone: header buttons overflow their own bar; a six-line essay before any control** | rendered at 390px |

## The market — what everyone else built

- **[XBuild](https://x.build/)** — estimate-first. Plain-words input (*"18 squares
  architectural, two layers tear-off, replace 4 sheets decking"*) or an
  EagleView/Hover/Roofr file → a **Xactimate-formatted** estimate with the scope
  language adjusters expect. Live pricing from **ABC Supply, SRS, QXO**. Closes with a
  texted proposal, e-sign and a Stripe deposit — ~15 minutes end to end. Roofing-only;
  reviewers note **it does not write back into a CRM**.
- **[Rooftops.ai](https://rooftops.ai/)** ($28–58/mo) — satellite measurements in ~30s,
  plus two things worth taking: **shingle ID from a photograph** (manufacturer, line,
  colour; **flags discontinued** for matching arguments) and **NWS-verified storm
  history** per address as claim documentation. Its "Roofy" assistant drafts adjuster
  correspondence.
- **Xactimate** ($150–250/mo) — writes the scope, *"does not track supplement status,
  and doesn't manage follow-up"*.
- **AccuLynx** — tracks supplements, lacks scope comparison, tracking is *"somewhat
  manual rather than automated-reminder-based"*.
- **Outsourced supplement services** — **15–25% of everything recovered**; $450–750 on
  a $3,000 supplement.

⚠ **The gap in every comparison: nobody joined the two halves.** The tools that write
the scope don't chase it; the tools that chase it can't read the scope. **Cardinal
already has the hard half.**

## The finding that should drive the design

> *"Most denials trace to documentation rather than to the legitimacy of the damage."*
> Every line item needs **a photo, a measurement, and a code citation** — and a cover
> letter naming code sections and manufacturer specs *"separates a two-week approval
> from a six-week dispute."*
> — [IA Solutions](https://www.iasolutions.claims/blog/document-roofing-job-maximum-supplement-approval)
> (licensed independent adjusters), corroborated by [BellaFSM](https://www.bellafsm.com/roofing-supplement-documentation/)

The Desk produces the citation and the quantity. **The photo is optional and nothing
checks that the quantity is supported.** That is the whole overhaul thesis.

## Three directions — halves of one Desk, not alternatives

**A · The evidence table. ✅ SHIPPED at build 1055** — Theo: *"Start the desk."*
Every gap item carries three legs — photo, measurement, citation — shown as chips, and
the Desk refuses to send an item with a hole. **Code backing ended up GRADED rather
than required**, because a trade-practice item has no citation to find and the human
decides whether it still belongs; photo and quantity are the two that block. The
refusal is enforced at `syncDraftBtn()`, `draft()` **and** `fileSupplement()` — a
button's disabled attribute is not a gate. `Include anyway` arms a blocked item and
leaves an amber marker naming what it went without. See `FEATURES.md` and the build
log for what else the build repaired on the way (no light twin for three state tokens,
a phone header that had overflowed since 668, and no build stamp at all).

**B · Start from the photographs, not the PDF.** Theo's own earlier note: *"box for ai
and use pictures to supplement the estimate with captions and an overview."* Today the
Desk is dead until a scope arrives — week three of a claim. Flip it: open on the job's
photos, AI marks, a person confirms (The Walk's rule), and the scope when it lands is
used to **subtract** what is already funded.

**C · The Desk that chases.** The half nobody in the market has, and the half the
insurance audit (1052–1054) just found missing: `chaseList()` has ages but no
thresholds, and **all 31 notification sites in the app are production** — zero on
insurance. Filed → sent → chased → answered → paid, with per-carrier pace computed
from Cardinal's own `first_scope_rcv` → `approved_rcv` history.

## Smaller pieces — all already in the repo

1. **`api/storm.js` (927)** pulls NWS hail/wind reports around a point — 355 reports
   within 60 miles of Dayton across five months. It powers Storm Data on the Sales
   Floor and **never reaches a claim**. Rooftops sells exactly this as documentation.
2. **Shingle ID + discontinued matching.** The OC catalog badges discontinued lines;
   `PACK` already carries `discontinued_shingle` and `matching_slope`. Both halves are
   in the building and nothing connects them.
3. **Move off Gemini** — build 806 already made this decision for the librarian, on
   measured grounds, for about a dollar a month.
4. **Build `read_response`** — the mode that turns a letter generator into a loop, and
   the input direction C needs to know a claim was answered.
5. **Decide whether the Desk belongs inside the app** rather than inheriting Studio's
   separate-origin shape.
6. **Plain-words input**, XBuild's shape — the letter is a text document anyway.

## Recommendation

**A first** (smallest, and documentation is what the research says decides approval),
**then C** (the market gap, and it reuses the chase/notification work already scoped),
**then B** (biggest change; better built on A's evidence model than beside it).

**Status, 24 Aug 2026:** **A is shipped (build 1055).** **C and B are not started** and
are Theo's call. C is the one I would take next — it is the market gap, and the
insurance audit already scoped the work it reuses.

⚠ The six smaller pieces above are all still unstarted.
