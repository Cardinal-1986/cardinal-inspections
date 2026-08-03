# Roof Journey — client-facing copy

*Written 3 Aug 2026 from `ROOF_JOURNEY_BRIEF.md`. This is the **content layer** — it is
design-independent and will populate whichever of the **five** directions Theo picks. All **twenty**
of his points are written in full, in the order they actually happen on a job, so the page reads as
one continuous story rather than a stack of cards.*

*Voice checked against the company's own material: the Resource Library **Do & Don't** page
(`#rlPagePitfalls`), the ventilation and powered-attic-ventilator cards, the Sales Floor `proof()`
and `talkTracks()` blocks, and the estimate/contract scope language in `index.html`. Plain, terse, no
hype, no exclamation marks, no competitor hit-piece.*

> **Structural note — the page grew from 13 points to 20, and twice that changed its shape.**
>
> **Points 14–15 (attic, ventilation)** moved the opening. They belong at the **front**, in the
> inspection stage, before any paperwork. The page now opens with a flashlight in an attic rather
> than with a contract, which is a better opening on its own merits: it starts with something the
> homeowner has never been told, and it establishes the frame everything else hangs on — **a roof is
> a system, not a surface.**
>
> **Points 16–18 (PM's card, PM on site, crew leader) are written as ONE section, not three.**
> Together with point 9 they answer a single question, and they are a *ladder* — crew leader first,
> because continuous presence beats seniority from where the homeowner is standing. As three
> separate bullets it would read as padding. As a stack it is hard to match.
>
> The result is a five-act structure across 25 stages.

---

## ⚠ Needs verification — read this before any of it ships

**Nothing below asserts a code section, a code-mandated dimension, an "Ohio law requires X," a
warranty term, a policy amount, or a carrier name.** Every material claim is written as *craft* —
"this is what we install and here is what it does." Every people-and-paperwork claim is written as a
**checkable action the reader can take**, not a badge. That framing is deliberate and it should
survive editing.

This session had **no outbound internet**, so nothing here was checked against a source. The items
below need a human before the page goes live. **V19, V27 and V29 carry the most exposure.**

### ✅ Settled by the owner, 3 Aug — do not re-open these

| # | Was | Now |
|---|---|---|
| **V4** | Owens Corning contractor status and tier | **Confirmed: Cardinal is an Owens Corning Roofing Preferred Contractor.** Written into the copy as fact. Only a copy-editing residual remains — see V30 below |
| **V5** | Two "contradictory" warranty figures in the app | **They were never contradictory. They are two tiers the client chooses between**, and the estimate template listing both was right. **OC Systems: 25-year material · 5-year labor.** **Preferred: 50-year material · 10-year workmanship.** Both transferable, both backed by Owens Corning. Written into the copy as a two-column choice at Stage 7. *(This correction was the coordinator's own error, recorded so it doesn't recur.)* |
| **V10** | Next-day return sweep, drafted as a proposed promise | **Confirmed as real practice.** It prints as a commitment. Theo: *"Yes we do go back the next day and sweep again. We are huge on cleanup."* |

> ⛔ **Standing instruction from the owner: never mention Platinum.** Not the tier, not the warranty
> name, not a comparison to a higher tier, **not even a sentence saying Cardinal isn't it.** The copy
> simply never goes near it, and the earlier caution about it is retired rather than restated. If you
> are editing this page and find yourself reaching for that word, stop.

### The high-risk three

| # | Claim | Why it needs checking |
|---|---|---|
| **V19** ⚠ | **"Shingle manufacturers require adequate attic ventilation as a condition of their warranties."** Stated as an **industry-wide principle**, with **no specific Owens Corning term, threshold, ratio or clause quoted** | The most important verification on the page. The principle is standard; the specifics are not ours to paraphrase. Confirm current OC limited-warranty language on ventilation, confirm it's fair to characterize as a condition, and confirm whether OC restricts mixing exhaust types (ridge + box, ridge + powered fan). **If any of it is ambiguous, soften to "manufacturers expect adequate ventilation and can take it into account on a claim." Do not print a stronger version than the paperwork supports.** Note this is now sharper than it was: the copy states warranty *durations* as fact, so a reader will reasonably assume the ventilation condition is equally well established |
| **V27** ⚠ | **The workers'-comp exposure claim** — that where a contractor carries no workers' comp, an injured worker's route to recovery **can** run through the homeowner's own insurance | This is a claim about **the reader's own legal exposure**, which is a different category of risk from anything else on the page. The copy uses **"can"**, never "will," and names no statute. **Have Theo's own insurance agent read that paragraph before it ships.** If the agent won't endorse it, cut the mechanism and keep only the checkable action ("ask for a certificate naming you") — that action survives on its own |
| **V29** ⚠ | **"Every crew has a compliance file — COI, W-9, licenses, each with an expiry date. When one lapses the system flags it, and a crew with an expired certificate doesn't go on a roof."** | The **feature** provably exists (`crew_docs`, the Crews compliance vault, builds 547–556). The **enforcement** is a policy commitment, not a software fact. A table that stores expiry dates is not the same as a rule that stops a crew working. Confirm with Theo that the last clause is true in practice — and if it is aspirational, change it to what actually happens |

### The rest

| # | Claim | Where it came from | Why it needs checking |
|---|---|---|---|
| **V1** | The phrase **"Residential Code of Ohio"** in the one short "About code" block | Theo's brief; library cards | Naming the code is far safer than citing it, but confirm the adopted edition and that naming it on a marketing page is wanted. **If in doubt, delete the block — nothing depends on it** |
| **V2** | **Permit responsibility** — "we check what your address requires before we start, and we tell you." The Sales Floor sheet goes further: *"We pull the permit"* | `index.html` ~42120 | Thresholds are **per-jurisdiction** (separate, dated Dayton and Kettering library cards with different rules). Confirm what Cardinal commits to in writing across the whole service area |
| **V3** | **Owens Corning product names** — `WeatherLock`, `ProArmor`, `ProEdge Hip & Ridge`, `DecoRidge`, `TruDefinition Duration`, `SureNail` | `index.html` 5336 | The copy leads with the **category** and names **no OC product in the body at all**. If a designer wants to add them, confirm current names first. The OC starter product name was never written out in the library, only as "OC starter" |
| **V30** | **Trademark and typographic treatment** of "Owens Corning™ Roofing Preferred Contractor" and of the two warranty tier names in public marketing | Manufacturer marketing guidelines | **Minor, copy-editing only — the facts are settled (see V4/V5 above).** Manufacturers do specify how designations and product names are written publicly: symbol placement, capitalization, whether a tier name may be used as a heading. One glance before publish |
| **V31** | The Sales Floor script says *"25 years on the shingle, 10 years on our workmanship"* — which pairs the Systems tier's 25-year material with the Preferred tier's 10-year workmanship number | `index.html` ~42117 | **Not blocking — the page uses the two-tier table and doesn't touch this line.** It may be perfectly correct (Cardinal's *own* workmanship guarantee could sit alongside the OC-backed labor coverage and run longer than it), or it may be a legacy line that drifted. Worth Theo's glance, and worth fixing in the app if it drifted, because a rep quoting it aloud contradicts the page |
| **V6** | Ice barrier run "from the eave up past the inside face of the exterior wall" | Standard practice; library card | Written as our practice, not as code. Confirm it's standard on every job |
| **V7** | **Synthetic underlayment on every job, not felt** | Sales Floor | Confirm universal, including low-slope sections and porch roofs |
| **V8** | "New pipe boots at every penetration" | Sales Floor; estimate line | Confirm universal |
| **V9** | "Ridge vent where the roof can carry it" | Estimate line item | Deliberately hedged, because ventilation is now a major section and over-promising there is expensive. Confirm the hedge is right |
| ~~V10~~ | ~~Magnetic sweep and the return sweep~~ | — | ✅ **Settled — see the table above.** The next-day return sweep is confirmed practice and prints as a commitment. The only residual is the *mechanics* of "twice, in two directions" on the same day, which came from the Punch Walk card and is a description of good practice rather than a Cardinal promise — leave it or cut it, either is fine |
| **V11** | **Decking unit prices signed before start**, and any discovery gets a **written change order approved before the work** | Contract template §5 Concealed Conditions | The strongest single paragraph on the page. Confirm it's standard on every contract, not just the template default |
| **V12** | **Drone flights** before / during / after, flown by the owner | Theo's brief | Confirm certification/airspace position is handled and whether the page should mention it. **The copy makes no certification claim.** Confirm the weather caveat |
| **V13** | **Photo zip** arrives as a download link, not an attachment, and doesn't expire | Theo's brief | Confirm the mechanism. If links expire, that sentence must change — it prints as a promise |
| **V14** | **The owner's name on a public page.** The copy says "the owner" and prints no name or number | Theo's brief, point 9 | Theo decides. A marked variant is at Stage 24 |
| **V15** | "Most houses in our area are a one-day job and some are two" | Inferred | Confirm against actual production data before printing a duration |
| **V16** | Three-business-day right to cancel (ORC §1345.23) | Sales Floor `proof()` | **Not used.** Flagged only so nobody adds it later — it's a legal claim |
| **V17** | Manufacturer **do-not-mix** consequence of substituting cut-up 3-tab | Library manufacturer cards | Stated **once, softly**, in each shortcut section. Program terms change. Confirm or cut — both sections land without it |
| **V18** | Spelling convention | — | Copy uses **American** spelling (color, neighbor, mold). The app's library uses British. Client-facing for Dayton should be American; confirm |
| **V20** | **Attic inspection is standard at takeoff** | Theo's brief, point 14 | Confirm it happens on every quote, not just insurance work, and confirm the access position — entering an attic before a contract exists |
| **V21** | **"A significant number of bath fans terminate in the attic"** | Library ice-dam card | The copy uses no percentage and says only that it's common and that Cardinal finds it regularly. Confirm "common" is fair. **Do not let anyone add a number to that sentence** |
| **V22** | **Cardinal installs soffit intake, baffles and ventilation corrections**, priced as separate lines | Library supplement card | Confirm Cardinal performs soffit/intake carpentry rather than subbing or declining it |
| **V23** | **"If your attic can't breathe, you'll hear it before you sign"** | Written from Theo's "super important" | A printed commitment about sales conduct. Confirm Theo wants it in writing |
| **V24** | Ventilation failure mechanics — short-circuiting, depressurization through can lights and the attic hatch, insulation smothering intake | `index.html` 4615–4626 | Lifted from Cardinal's **own** library and rewritten in plain English, so internally consistent. Worth one expert read anyway, because a lay audience will now repeat them |
| **V25** | **"Every Cardinal crew has a dedicated leader, on your property from the first shingle to the last sweep. They don't rotate off and aren't running two jobs"** | Theo, point 18 | A printed operational commitment. Confirm it holds on **every** job including two-day jobs and multi-crew days |
| **V26** | **The salesperson hands over the PM's physical business card with a direct number, before work starts**, and the PM visits the site periodically through the day | Theo, points 16–17 | Confirm it's universal and confirm a **direct** number goes on the card rather than an office line — the copy leans on "direct" |
| **V28** | **Cardinal carries general liability and workers' compensation**, and will produce a **certificate naming the client, same-day** | Theo, point 19 | Confirm both coverages are current, and confirm the **same-day** turnaround before printing it. No amounts, carrier or license number appear anywhere in the copy — deliberately |

**One rule for whoever edits this.** If a sentence starts to sound like it's stating a legal
requirement, quoting a warranty term, or printing an insurance figure, it has drifted. Rewrite it as
what Cardinal does and what the reader can check. **There is no sentence on this page that needs a
statute, a warranty clause or a policy number to be true.**

---

## How the copy is organized

Twenty points, twenty-five stages, five acts, in the order they happen on a real job.

| Point | Theo's item | Lives in |
|---|---|---|
| **14** | **Checking the attic** ⭐ | **Stage 2** |
| **15** | **Ventilation** ⭐⭐ | **Stage 3** (the why) + Stage 21 (the install) |
| **18** | **Crew leader — on site the whole time** ⭐ | **Stage 5, tier one** |
| **17** | **PM on site periodically** | **Stage 5, tier two** |
| **16** | **PM's card, handed over by the salesperson** | **Stage 5, tier two** |
| 9 | Owner checks the job | Stage 5, tier three + Stage 24 |
| **19** | **Insured** ⭐ | **Stage 6** |
| **20** | **Owens Corning Preferred** | **Stage 7** |
| 12 | Yard sign | Stage 9 |
| 13 | Neighbor door-knock | Stage 10 |
| 10 | Drone — before / during / after | Stages 11, 22, 25 |
| 2 | Decking | Stage 14 |
| 1 | Soft metals & flashings | Stages 15, 18 |
| 3 | Ice and water shield | Stage 16 |
| 4 | Felt vs synthetic | Stage 17 |
| 7 | Chimney counterflashing | Stage 19 |
| **6** | **3-tab as starter** ⭐ | **Stage 20** |
| **5** | **3-tab as hip & ridge** ⭐ | **Stage 21** |
| 8 | Cleanup | Stage 23 |
| 11 | Zipped photo handoff | Stage 25 |

Every stage carries: **Headline** · **Body** · **What to look for** (where the homeowner can
physically verify something) · **The honest part** (cost, caveat, or what we can't promise).

---

# PAGE OPENER

**Headline:** How your roof actually gets built

**Standfirst:**
Most homeowners buy a roof having never seen one go on. You get a price, a color, and two days of
noise, and then it's over and there's no way to check what's underneath. This page is the whole job
in order — from the flashlight in your attic weeks before anyone quotes a number, to the photos that
land in your inbox after the trailer's gone. Including the parts that get covered up, the two
shortcuts you can spot from your own driveway, the three people who'll be on your property, and the
one thing nearly every homeowner is missing that quietly costs them a decade of roof.

**Pull quote for the top of the page:**
> A roof is about eight products stacked in a specific order, over a space that has to breathe. You
> only ever see one of them.

---

# ACT ONE — BEFORE ANYONE QUOTES A NUMBER

*The whole first act happens before there's a contract. That's deliberate. Almost everything that
decides how long your roof lasts is decided here, and most of it is invisible from the ground.*

---

## Stage 1 — The takeoff

**Headline:** Somebody measures the roof for real

**Body:**
Before anything is priced, the roof gets measured plane by plane — pitch, squares, and then the
linear feet most estimates skip: ridge, hip, valley, eave, rake, and a count of every penetration
through the deck. That measurement is what the material order is built from. Squares of shingle is
the easy part. Feet of starter, feet of cap, feet of drip edge, and how many pipe boots is where a
roof gets under-ordered.

**What to look for:**
Ask any bidder for the linear-foot quantities, not just the squares. A bid that prices starter and
hip-and-ridge **by the foot** is a bid where somebody measured. A bid that folds them into the
shingle price is a bid where somebody guessed — and a guess that comes up short at four in the
afternoon on day one gets solved with whatever is already on the truck.

---

## Stage 2 — The attic ⭐ *(Point 14)*

**Headline:** We look at your roof from underneath

**Body:**
Every roof we quote gets inspected twice: once from on top, and once from inside the attic with a
flashlight. The second one is where the useful information is.

The shingle surface tells you what the weather has done to the roof. The underside tells you what the
roof has been doing to the house — and there is no way to get at it from a ladder. This is also the
only stage where nobody has committed to anything, which is exactly why it should happen before
you're holding a contract rather than after.

**What the attic shows that the roof surface cannot:**

- **The deck, from below.** Water staining, dark streaks running down from a nail line,
  delamination — the wood separating into layers — or actual daylight through a seam. A stain means
  water got in. Dry and hard means it got in years ago and stopped. Damp means it is still happening.
  You cannot tell any of that from the top, because from the top all three look identical: like
  shingles.
- **Whether the intake vents are doing anything.** Looking out toward the eaves from inside, you can
  see immediately whether insulation has been pushed over the top of the exterior wall and packed
  into the eave. If it has, the soffit vents are smothered from behind and the attic is not breathing,
  whatever it looks like from the driveway. This is the most common thing we find, and Stage 3 is
  entirely about why it matters.
- **Where the bathroom fan actually goes.** A bath or kitchen exhaust fan is meant to vent through
  the roof or a wall and discharge outside. A lot of them don't. The duct comes off the fan, runs a
  few feet, and simply ends in the attic. Every shower in that house then puts warm wet air directly
  against the cold underside of the roof deck, where it condenses. That rots decking from below over
  years, and the roof surface looks perfect the entire time. It's a five-minute find that explains a
  lot of January phone calls.
- **The real leak history.** Rust rings around nail points, frost on the nails in winter, one patch
  of matted or discolored insulation, a stained rafter. These record leaks the homeowner may never
  have seen, because the water never got as far as a ceiling.
- **Whether it's cooking up there.** On a warm day, an attic dramatically hotter than the outside air
  is an attic that isn't ventilating.

**What to look for — do this yourself, before you get any bids:**
You don't need us to do a version of this. Take a bright flashlight into the attic on a sunny day.

1. **Turn the flashlight off** and let your eyes adjust for a minute. Any daylight coming through the
   deck — a pinhole, a line along a seam — is a hole in your roof.
2. **Light up the underside of the deck** and look for dark patches and streaks, especially around
   the chimney, in the valleys and near any pipe. Then touch one. Damp is a live leak. Dry and hard
   is history.
3. **Look toward the eaves**, at the low edges where the roof meets the walls. You want to see gaps,
   daylight, or at least a clear path. If all you can see is insulation packed solid against the deck,
   your intake is blocked.
4. **Find where the bathroom fan duct goes.** Follow it. It should leave the attic. If it stops in the
   middle of the insulation, you've found something worth fixing regardless of who roofs your house.

Walk on the joists, never between them, and don't go up at all if the access isn't safe.

**The honest part:**
Some attics can't be entered — no access, a hatch too small, insulation deep enough that it's
genuinely unsafe, or a cathedral ceiling with no attic at all. When that's the case we'll tell you
what we could and couldn't see, rather than let you assume the inspection was complete.

And what turns up in an attic occasionally changes the conversation. If a bath fan has been venting
into that space for six years, part of that deck may already be gone. That's a much better thing to
learn standing in your hallway than standing in your driveway on tear-off day.

---

## Stage 3 — Ventilation ⭐⭐ *(Point 15)*

**Headline:** Your attic has to breathe, or the roof cooks

**Body:**
This is the part of a roof nobody explains, and it's the part that decides how long the shingles
last. It's also, on most houses, the part that's wrong.

An attic needs air moving through it continuously, all year. That takes two things working together,
not one:

- **Intake, at the bottom.** Vents in the soffits — the underside of the roof overhang — where cool
  outside air gets in.
- **Exhaust, at the top.** Usually a continuous vent running along the ridge, where hot air leaves.

Cool air enters low, runs up the underside of the deck carrying heat and moisture with it, and leaves
at the peak. Both halves are required. Exhaust with no intake isn't ventilation — it's a vacuum, and
it has to pull that air from somewhere.

### The three ways it goes wrong

**1. Exhaust with no intake.**
The most common by a distance. There's a ridge vent along the peak, and the soffit vents are blocked,
painted shut, or were never installed. The ridge vent still has to draw air from somewhere — so it
draws it out of the house, through recessed light fixtures, the attic hatch, and the gaps at the tops
of the walls. You're now paying to condition air that gets pulled into the attic and thrown away. In
winter that air carries household moisture with it, straight into the coldest space in the building.

**2. Two exhaust systems fighting each other.**
This is the counter-intuitive one, and it's the one that looks most impressive from the street. A
roof has a ridge vent along the peak **and** box vents — the small square hoods sitting on the slope
— or a powered attic fan. It looks like twice the ventilation.

It's a short circuit. Air takes the easiest path available. A fan or a box vent pulls its air from
the nearest opening, and the nearest opening is the ridge vent a few feet away, not the soffit vents
thirty feet away and down at the eaves. So the ridge vent stops being an exhaust and becomes an
**intake** — feeding air to a fan that immediately throws it straight back out. The far corners of
the attic get almost no airflow at all. The fan runs, the meter turns, and the attic barely ventilates.

It's almost always installed with good intentions, by somebody trying to fix a hot attic. Adding a
second exhaust to a system with no intake makes it worse, not better.

**3. Insulation smothering the intake.**
Blown-in insulation usually goes in years after the house was built, and the installer is paid for
depth, not airflow. It gets pushed out over the top of the exterior walls and into the eaves, packing
the soffit vents solid from behind. From the ground the vents still look wide open. From inside the
attic you can see there's nothing behind them. The fix is **baffles** — rigid channels fitted at each
rafter bay that hold the insulation back and keep an open path from the soffit up the underside of
the deck.

### What it costs you when it's wrong

These are four things people already fear, and all four are ventilation problems wearing a different
name.

- **Ice dams, in winter.** A properly ventilated attic stays close to the outside temperature, so the
  whole roof plane is uniformly cold and snow just sits on it. An unventilated attic is warm at the
  top — so snow melts on the upper roof, runs down to the overhang, which is past the wall line and
  genuinely cold, and refreezes there into a ridge of ice. Water then pools behind that dam and backs
  **up** the roof, under the shingles. **The icicles are the symptom. The cause is inside the house.**
- **Cooked shingles, in summer.** A sealed attic in a Dayton July runs far hotter than the air
  outside. Shingles are asphalt, and asphalt bakes from both sides. You get granule loss and small
  round blisters across the surface. That's premature aging, and it happens quietly, over years, on a
  roof that looks fine.
- **Moisture and mold.** Warm damp air from the house meets the cold underside of the deck and
  condenses on it. In a bad winter you can go up there and find frost on every nail point. That water
  goes into the wood, the insulation gets damp and stops insulating, and mold follows it.
- **Premature failure.** All of the above at once. This is how a thirty-year shingle becomes an
  eighteen-year roof, and the homeowner blames the shingle.

### The warranty part, which almost nobody is told

Shingle manufacturers require adequate attic ventilation as a condition of their warranties. That's
standard across the industry — it isn't a quirk of one brand.

Which means a beautiful new roof over an attic that can't breathe can have its warranty claim
refused, and the homeowner finds out at the worst possible moment: years later, when they finally
need it. On the paperwork, the roof and the attic are one system, whether or not they were treated as
one on install day.

Ventilation is also the line most often missing from a cheap bid — because it's the one line the
homeowner will never notice isn't there.

### ⭐ What to look for — the easiest audit on this page

Ten minutes, no ladder needed for most of it. Works on your house or anyone's.

**1. Stand under the overhang and look straight up.** That's the soffit. You're looking for vents —
either a continuous perforated strip running the length of it, or individual rectangular grilles every
few feet. First question: **are there any at all?** Some houses simply don't have them. Second
question: are the holes actually open, or has it been painted over enough times to seal it shut? Hold
a phone flashlight up against one. If no light passes, nothing else does either.

**2. Look along the peak from across the street.** A continuous ridge vent shows as a low, even,
slightly raised line running the full length of the ridge — you'll read it as a shadow band just under
the cap. No raised line usually means no ridge vent.

**3. Count your exhaust types. This is the one that matters.** Look at the whole roof and name every
kind of vent on it: the ridge line, small square hoods on the slope (box vents, sometimes called
turtle vents), a round domed housing (a powered fan), louvered vents in the gable end walls.
**You should be looking at one exhaust type, not two.** Ridge vent plus box vents on the same roof, or
ridge vent plus a powered fan, is the short circuit described above. If you can see two different
exhaust types up there, that attic isn't ventilating the way its owner believes it is.

**4. From inside the attic** (Stage 2): look toward the eaves. Insulation packed solid against the
deck at the edges means the intake is blocked, whatever the soffit looks like from below.

**5. On a hot afternoon, put your head up through the attic hatch.** It should be warm. If it's
brutal — the kind of heat you back out of — the air isn't moving.

**The honest part:**
Fixing ventilation isn't free and it isn't always simple. Continuous ridge vent needs enough
continuous ridge to work with, and some roof shapes — low hips, complicated peaks, a house that's
mostly valleys — don't have it. Adding soffit intake to a house that never had any is carpentry rather
than roofing, and it's a separate line. Baffles are priced per rafter bay.

We measure the attic and size the ventilation to it, rather than putting up whatever fits. And we will
tell you plainly when what you already have is working — a house with open soffits and a sound ridge
vent already has a system, and nobody should sell you a second one.

If your attic can't breathe, you'll hear it before you sign, and the fix will be a line on the estimate
rather than a surprise. A new roof over a dead attic is a new roof with a shortened life and a
compromised warranty, and there's no version of that which is good for either of us.

---

# ACT TWO — WHAT YOU'RE SIGNING, AND WHO YOU'RE HIRING

---

## Stage 4 — You sign, and the unknowns get priced

**Headline:** The contract is where surprises get handled

**Body:**
A roofing contract does two jobs. The first is obvious: it sets the scope, the shingle, the color and
the price. The second is the one that decides how the job feels — it prices the things nobody can see
yet. Rotten decking, a cracked rafter, soft fascia. Those aren't in the price, because nobody knows
they're there. What is in the contract is **what each one costs if we find it**, agreed and signed by
you before a single shingle comes off.

Everything found in Stages 2 and 3 is on it too, itemized. Ventilation corrections, intake work,
baffles, a bath fan that needs running out through the roof — priced as their own lines, so you can
see them, question them, or decline them.

**The honest part:**
Anyone can quote a roof. The number that matters is the one you'd owe if the deck turns out to be bad,
and you should have it in writing before work starts. A contract with no unit prices for concealed
conditions is a contract that defers that conversation to the worst possible moment — day one, roof
open, crew standing there.

---

## Stage 5 — Who you talk to when something looks wrong ⭐ *(Points 18, 17, 16 — and 9)*

**Headline:** Three people are responsible. One never leaves

**Body:**
Here's a question almost nobody asks out loud before signing a roofing contract, and everybody thinks
about at two o'clock on install day: **if something looks wrong, who do I actually talk to, and will
they be here?**

On a Cardinal job there are three answers, and they're deliberately different from each other.

| Who | When they're there | What they're for |
|---|---|---|
| **The crew leader** | The whole time. Never leaves the job | Anything, right now. No callback, no waiting |
| **The project manager** | On and off through the day | The escalation. You already have their card and their direct number |
| **The owner** | Checks the job himself | The buck stops somewhere visible |

### Tier one — the crew leader, and this is the one that matters

Every Cardinal crew has a dedicated leader, and they are on your property from the first shingle off
to the last pass with the magnet. They don't rotate off at lunch and they aren't running a second job
across town.

So if you walk outside at two in the afternoon with a question — why is that piece of wood being
replaced, what's that noise, can somebody move the truck, are they going to reach the back slope
today — that's who you ask, and you get the answer standing there.

**That's worth more to a homeowner than seniority.** A senior person you have to phone is a delay. A
person on your driveway is an answer.

### Tier two — the project manager, and you get their card before the day

Your salesperson hands you the project manager's business card before work starts. A physical card,
with a name and a **direct** number, given to you rather than mentioned in passing. Which means you
have a second named human before the crew ever pulls up, and you never have to route back through a
sales line to reach somebody who knows your job.

The project manager comes by the site periodically through the day. They're the escalation: the
questions the crew leader can't settle alone — a change to the scope, something found in the deck, a
decision that costs money — go to them, and they've already been to your roof twice that day.

### Tier three — the owner

Cardinal's owner checks on the job himself, flies the drone, and does the final walk before anything
is called complete. That's covered in full at Stage 24. What matters here is only this: **he's the
third tier, not the first.** If you're relying on the owner to answer a question at two in the
afternoon, the first two tiers have already failed.

### Why that order, deliberately

Most contractors sell this the other way up — owner first, because it sounds most impressive. From
where you're standing on your own driveway, that's backwards. **Continuous presence beats seniority.**
The person who never leaves is the person who can actually answer you. The other two tiers exist so
that the first one is never your only option.

**What to look for:**
Two concrete things, and you can ask any contractor for both.

1. **Before the day — do you have a name and a direct number for somebody other than the person who
   sold you the job?** If the only number you're holding is your salesperson's, you'll be routed back
   through the person whose job ended when you signed.
2. **On the day — can you tell who's in charge?** Walk out and ask the crew who the leader is. You
   should get one name and one person, immediately, without a conference. A crew that has to discuss
   the question doesn't have one.

**The honest part:**
The crew leader is on your job all day, but they aren't standing still — they're working. Asking a
question takes their hands off the roof for a minute, and that's fine, that's part of the job. But
they're not a host and shouldn't be treated as one. And the project manager is running more than one
job, which is exactly why they carry a phone and why you were given the number.

---

## Stage 6 — Insured ⭐ *(Point 19)*

**Headline:** The insurance that matters is the one protecting you

**Body:**
Every roofing van in Ohio says "licensed and insured" on the side, and nobody reads it any more.
Here's what it actually means — and the part that matters isn't about us.

**Workers' compensation.** Roofing is height work. If a contractor without workers' comp has somebody
get hurt on your property, that injured worker still needs a route to recovery, and that route **can**
run through **your** homeowner's insurance, and through you. This is the risk almost nobody raises at
the kitchen table, and it's the real reason the question matters. It isn't a badge on a truck. It's
your exposure.

**General liability.** This is the one covering damage to your house — a ladder through a window, a
bundle off the roof onto a car, water in a bedroom because a slope was left open ahead of a storm.
Most homeowners assume that's automatically somebody's responsibility. Often it isn't.

**Cardinal carries both.**

**What to look for — the checkable action:**
**Ask any contractor for a certificate of insurance naming you.** Not a photo of a card. Not a policy
number read out over the phone. A certificate, issued by their carrier or their agent, with your name
and your address on it as certificate holder.

A contractor who actually carries the coverage produces one the same day, because it's one phone call
to their agent and it costs them nothing. A contractor who doesn't will explain why they can't, and
the explanation will be interesting. Do this for every bid you take, including ours.

### We require this from our own crews

Cardinal works with subcontracted crews, and every one of them has a compliance file with us:
certificate of insurance, W-9, and trade licenses, each carrying an **expiry date**. We track those
dates, and a crew whose paperwork has lapsed doesn't go on a roof.

We built that because we aren't willing to carry somebody else's exposure — which is exactly the
position you're in when you hire a roofer. **We require from our crews what you should be requiring
from us.** So require it. Same paperwork, same standard, and no offense taken.

**The honest part:**
We aren't going to print policy limits or a carrier name on a web page. That information belongs on a
certificate issued to you, with your name on it and a date on it — not on a marketing page where it
can't be verified and where it will eventually go stale. Ask, and you'll have it.

---

## Stage 7 — Materials, and what you're actually choosing *(Point 20)*

**Headline:** You pick a color. We pick the rest, out loud

**Body:**
The color is your call, and you should see the real shingle in real daylight rather than a printed
swatch — colors read very differently on a roof plane than on a sample board. Everything else in the
stack we'll walk you through: the ice barrier, the underlayment, the starter, the cap, the metal, the
ventilation. Those aren't upgrades to be sold to you later. They are the roof.

### Cardinal runs Owens Corning, and is an Owens Corning Roofing Preferred Contractor

That's a contractor designation from the manufacturer, and what it's worth to you is specific and
limited. It means we're vetted by Owens Corning and able to register their system warranties on the
roofs we install — so the coverage on your roof is registered with the manufacturer, rather than being
a claim on our letterhead.

What it isn't: a guarantee, a discount, or a substitute for workmanship. Manufacturers run several
contractor tiers, and **we'll tell you exactly which one we hold rather than letting a badge do work
it shouldn't.**

**The honest part:**
Which warranty you actually end up with depends on the system that goes on your roof, because
manufacturer system warranties require the accessories to come from the same manufacturer — the
starter, the underlayment, the ice barrier, the cap, the ventilation. That's Stages 20 and 21 seen
from a different angle: the reason we don't cut up 3-tab for starter isn't only that it fails at the
edge, it's that a substituted accessory can drop the coverage you're paying for.

**The exact warranty you're getting gets named in writing on your estimate.** Not described in a
conversation, not implied by a badge. Named, on paper, before you sign.

---

# ACT THREE — THE WEEK BEFORE

---

## Stage 8 — The call, a few days out

**Headline:** A phone call, not a text blast

**Body:**
A few days before the start date you get a real conversation. It covers the date and the weather call,
roughly what time the crew arrives, where the trailer and the materials will sit, and anything about
the property we need to know before a loaded truck rolls onto it. It's also when you tell us the
things we'd never guess — somebody in the house works nights, a baby sleeps until eight, the side gate
sticks, the dog gets out.

**The honest part:**
Weather moves roofing dates. We'd rather call you and move it than tear a roof open ahead of a storm.
If your date shifts you'll hear it from a person, with a new date attached.

---

## Stage 9 — Your side of the prep *(Point 12 sits here)*

**Headline:** What to move before we get there

**Body:**
A tear-off is not a tidy process. Old shingles and several thousand old nails come off the roof and go
down a chute, and gravity does most of the work. We tarp the ground, the beds and the AC unit before
the first shingle moves — but tarps are protection, not armor. The list below is what actually
prevents damage.

**The prep list — the day before:**

- **Sprinkler heads and invisible fence.** Mark them, or tell us where they run. A trailer wheel or a
  dumpster corner finds a sprinkler head reliably, and an invisible-fence wire is invisible. This is
  the most common avoidable damage on a roofing job.
- **Cars out of the driveway** — the night before, not the morning of. Off the apron too.
- **Patio and beds cleared** within about ten feet of the house: furniture, grill, planters, hoses,
  solar lights, ornaments, anything glass.
- **Off the walls, inside.** A tear-off shakes the house. Take down pictures and mirrors on any wall
  under the roof being worked, and clear the top of tall shelves.
- **The attic.** If it's used for storage and it isn't floored, cover what's up there or move it. Dust
  and old insulation come down through the deck joints during tear-off.
- **Pets inside**, and ideally not in the room nearest the work. It's loud, and gates get left open by
  people carrying bundles.
- **Anything on the roof that isn't roof** — satellite dish, antenna, solar. Tell us before the day.
  Removing and re-aiming those is usually a specialist's job; it needs arranging, not improvising.
- **Kids' things** well clear until after the magnet has been over the yard.

**You don't need to be home.** Most people go to work. If you are home, watch from the ground — please
don't come up a ladder to look, and nobody from the crew needs to come inside the house.

### The yard sign *(Point 12)*

**Headline:** The sign goes up the day before

**Body:**
The sign is marketing, and we're not going to pretend otherwise. A good part of our work comes from
somebody who watched a neighbor's job go well.

It's also operational, which is why it goes up at least a day early rather than on the morning.
**At 6:30 in the morning, every house on the street looks the same.** The crew, the materials truck,
the dumpster driver and the disposal run all navigate to that sign in the half-dark. It's also how the
street finds out what the noise is going to be, before the noise starts.

**The honest part:**
If you want it gone the day we finish, say so and it's gone the day we finish. It's your yard.

---

## Stage 10 — We knock the neighbors' doors *(Point 13)*

**Headline:** We knock on your neighbors' doors first

**Body:**
Before the build, somebody from Cardinal walks the houses either side of you and the ones across,
knocks, and says three things: a roof is going on at this address, it starts on this day, and there
will be a trailer and a materials truck taking up room for a day or two.

That's the whole conversation. It takes ten minutes and it changes the day completely. A tear-off is
the loudest thing that happens on a residential street — it starts early, it carries three houses in
every direction, and it shakes windows. A neighbor who was told moves the car, takes the baby out for
the morning, closes the window on that side, and plans around it. A neighbor who wasn't told is the one
who calls the city at seven in the morning.

**The honest part:**
It's your street, not ours. We're there for two days; you live there. If nobody's home we leave a card
at the door — never in the mailbox, that box belongs to the mail carrier. And if you'd rather we
didn't knock at all, some people do, just say so.

---

## Stage 11 — Before photos, from the air *(Point 10, part one)*

**Headline:** We fly the roof before we touch it

**Body:**
The owner flies a drone over the roof before the crew arrives. Every slope, every plane, every valley,
from angles you cannot get from a ladder. That set is the record of what you had — the wear, the
damage, the previous repairs, the flashing somebody caulked eight years ago, and every vent on the roof
exactly as it sat. It's shot before anybody from Cardinal has changed anything.

**What to look for:**
Most homeowners have never seen their own roof. You will, before we start, and it's usually the first
time anyone in the house understands what they've been living under.

**The honest part:**
Weather decides. We don't fly in rain or in real wind, so occasionally the before-flight happens the
morning of instead of the week before. If a set can't be flown you'll be told — you won't be left to
notice.

---

# ACT FOUR — BUILD DAY

---

## Stage 12 — The crew and the trailer arrive

**Headline:** What the day actually sounds like

**Body:**
The crew arrives early, often not long after sunrise, because roofing is done in the cool of the
morning wherever the calendar allows. The dump trailer gets positioned first — usually on the driveway,
on protection, at a spot we agreed with you on the call. Materials go up onto the roof before anything
comes off it.

Then it gets loud. Tear-off is the loudest part of the job and it's the first part. It isn't a hum:
it's shovels, and a steady rain of debris down a chute into a steel trailer, and then compressors and
nail guns once the new roof starts going on. The house vibrates. Anything loose on a shelf will let you
know about it. Dust gets into the air on the work side, so keep those windows shut.

The crew leader from Stage 5 arrives with the crew and stays with it. If anything on this page raises a
question while it's happening, that's who to ask.

**The honest part:**
Most houses in our area are a one-day job and some are two. What adds the day is complexity, not size —
a cut-up roof with a lot of valleys, hips and dormers takes longer than a bigger, simpler gable. You'll
be given the honest number, not the optimistic one.

---

## Stage 13 — Tear-off, down to the wood

**Headline:** Everything comes off. No layovers

**Body:**
The whole roof comes off, down to the bare deck. Shingles, underlayment, old metal, old boots — all of
it. Roofing over the top of an existing layer is faster and cheaper and we don't do it: it buries
whatever is wrong with the deck, it adds weight, it runs hotter, and it makes the next roof somebody
else's expensive problem. It also means nobody ever looks at the wood.

**What to look for:**
On a finished roof, a layover shows itself at the edges. Look at the rake — the sloped edge at the gable
end — and at the eave above the gutter. A roof with two layers under it has a thick, slightly lumpy
edge, and often you can count the layers at the corner. A tear-off leaves one clean edge line.

---

## Stage 14 — The deck, and the part nobody can quote *(Point 2)*

**Headline:** We don't know what's under there until we look

**Body:**
Under your shingles is a wood deck — usually 4×8 sheets, sometimes planks on an older house. Once it's
bare, every square foot of it gets walked and checked. Most of it will be fine. What isn't is usually
in a predictable place: around the chimney, at the bottom of a valley, under an old repair, or wherever
a leak has been quietly working. Rotten, soft or delaminated sheets come off and get replaced. New
roofing fastened to bad wood doesn't hold — the nail has nothing to bite.

If Stage 2 found a bath fan venting into the attic, this is where you see what it did. Deck rot from
below tends to be a broad soft area rather than a stain, and it's often nowhere near a leak.

**The honest part — and this is the important one:**
This is the one number **nobody** can give you before the roof comes off. Any contractor who quotes a
firm decking figure up front is guessing, and the guess is either padding your price or setting up a
bad conversation on day one.

What we do instead is agree the price in advance. Your contract carries a unit price for each likely
discovery — **per 4×8 sheet of decking, per foot of plank decking, per rafter, per foot of fascia** —
signed before we start. If we find rot, you get a written change order at that agreed price, approved
by you, before we do the work. Nothing gets added to the final invoice that you didn't see coming.

**What to look for:**
**Ask for the photos.** Every bad sheet gets photographed where it lies, before anything covers it. If
your roof took eight sheets, there are eight photographs, and they're in the set we send you. A
contractor who charged for decking and has no photograph of it is asking you to take it on faith.

---

## Stage 15 — Drip edge and the metal at the edges *(Point 1, part one)*

**Headline:** The metal is what actually stops the water

**Body:**
Before anything else goes down, new metal goes on the edges. **Drip edge** runs along every eave and up
every rake — an L-shaped strip that carries water off the deck and into the gutter, instead of letting
it curl back under the edge and rot the fascia and the deck ends. It's inexpensive, it's fast, and it's
one of the first things stripped out of a cheap bid, because from the ground it looks like trim.

All the metal on your roof is new. We don't reuse it. Pulling shingles off old flashing bends it, tears
the nail holes, and destroys the way it was woven in with the old courses — you cannot get it back the
way it was, and a reused flashing is a leak with a delay on it.

**What to look for:**
Stand at the corner of the house and sight along the bottom edge of the roof, then up the rake. You're
looking for a continuous, straight line of metal, color-matched, with no gaps at the joints and no
waves. Then look at where the eave meets the rake at the corner — the two pieces should be lapped tight
and cut to meet. Sloppy corners are where an edge job shows.

**The honest part:**
New metal is a real line on the estimate — drip edge is priced by the foot around the whole perimeter,
and a house with a lot of gables has a lot of rake. Reusing the old metal is cheaper on paper. It's the
definition of a false economy.

---

## Stage 16 — Ice and water shield *(Point 3)*

**Headline:** The layer you'll never see again after day one

**Body:**
An ice-and-water barrier is a self-adhering rubberized membrane that sticks directly to the wood. It
goes at the eaves, in every valley, and around every penetration. Unlike everything else on the roof,
it **seals around the nails driven through it**.

Here's why it matters in Ohio specifically — and it connects straight back to Stage 3. In winter, snow
on the warm upper part of a roof melts, runs down to the cold overhang, and refreezes into a dam. Water
pools behind that dam and backs **up** the roof, under the shingles. Shingles are a shedding system:
brilliant at water running down, useless against water pushed up. The ice barrier is what stops that
water reaching the deck, the insulation and the ceiling below. We run it from the eave up past the
inside face of the exterior wall, so the protected zone covers living space rather than just the
overhang.

Ventilation is how you stop the dam forming. The ice barrier is what protects you the year the dam
forms anyway. You want both.

**What to look for:**
You cannot check this one on a finished roof. It's under everything, forever. Which is exactly why we
photograph it: your set has the eaves and valleys shot with the membrane down, before the underlayment
covers it. **A line item on a bid is a promise. A photograph is a product.** If someone charged you for
ice and water shield and there's no picture of it, there's nothing to check and there never will be.

**The honest part:**
Per square, it's the most expensive thing that goes down that day, and it's the one thing you will
never see again.

---

## Stage 17 — Underlayment: felt vs synthetic *(Point 4)*

**Headline:** What goes over the wood before the shingles

**Body:**
The rest of the deck gets underlayment — the layer between the wood and the shingles, and the secondary
defense if water ever gets past the shingle surface. There are two kinds, and the difference is real
rather than marketing.

**Felt** is the traditional one: paper saturated in asphalt, sold in 15- and 30-pound rolls. It works,
it's cheap, and it has two habits. It **absorbs water** — get it rained on before the shingles go down
and it swells, wrinkles, and those wrinkles telegraph up through the finished shingles as ripples that
never go away. And it **tears at the fasteners**, so a roof left dried-in overnight can lose its
underlayment to a gust.

**Synthetic** is a woven polymer sheet. It doesn't absorb water, so it doesn't wrinkle. It holds a
fastener instead of tearing away from it. It's lighter, it comes in bigger rolls with fewer seams, and
it has more grip underfoot — which matters more than it sounds, because a crew that feels secure works
more carefully.

**We run synthetic on every roof.**

**What to look for:**
This one is genuinely checkable on any finished roof, including your neighbor's. Wait for low sun —
early morning or late afternoon — and look across a big slope from the far side of the street. Long
horizontal ripples in the shingle field, evenly spaced, running the width of the roof, are almost always
wrinkled felt underneath telegraphing through. A flat plane in raking light stays flat.

**The honest part:**
Synthetic costs more per square than felt. Bigger rolls mean fewer seams and less labor, so a little of
that comes back. Not all of it.

---

## Stage 18 — Valleys, walls and penetrations *(Point 1, part two)*

**Headline:** Every place the roof stops is a place it can leak

**Body:**
Flat field shingle almost never leaks. Leaks happen where the roof runs into something else, and each of
those has its own detail:

- **Valleys** — where two slopes meet and the whole roof's water concentrates into one channel. Ice
  barrier underneath, then the valley detailed to carry that volume without letting water get under the
  shingles on either side.
- **Roof-to-wall** — where a slope dies into a wall, like the side of a dormer. This gets **step
  flashing**: individual bent pieces of metal, one per shingle course, woven in as the courses go up,
  each tucked behind the wall covering above. Not one long strip. Not caulk.
- **The kickout** — at the very bottom of a roof-to-wall run, right above the gutter, a small bent piece
  that throws water sideways into the gutter instead of letting it run down behind the siding. It's a
  five-dollar piece of metal and its absence is a vertical stripe of rot down the wall.
- **Head and apron flashing** where a slope stops at a wall face.
- **Pipe boots** — the collars around your plumbing vents. New, every one, every job. The rubber on the
  old ones cracks from UV in about ten to fifteen years, and that crack is one of the most common leaks
  in roofing. Reusing a boot to save twenty dollars is how a leak comes back into a brand new roof.

**What to look for:**
Two things, both from the ground.

**Step flashing:** find a spot where a roof slope runs up into a wall. You should see a **stair-step
pattern** of small metal pieces climbing the wall, each one disappearing behind the siding above it. If
instead you see one long continuous strip of metal laid against the face of the wall with a line of
caulk along its top edge, that is not step flashing, and the caulk is the only thing holding water out.

**Pipe boots:** the collars around the vent pipes should sit flat on the roof, look new, and have **no
caulk smeared around the base**. A ring of sealant around a boot on a new roof means something didn't
seat right.

---

## Stage 19 — The chimney *(Point 7)*

**Headline:** The chimney metal gets cut into the brick

**Body:**
A chimney needs two separate layers of metal, and the second one is where the corners get cut.

First, **step flashing** goes up both sides of the chimney, woven in course by course with the shingles,
exactly as it is at a wall. Then **counterflashing** goes over the top of it. Done correctly, a groove is
cut into the mortar joint, the metal is tucked into that groove, wedged and sealed there, and it laps
down over the top of the step flashing. Water running down the brick face lands on metal and gets carried
out over the shingles. It never reaches a seam.

The shortcut is to run the counterflashing straight up the face of the brick and hold it with a bead of
caulk. It works, right up until the caulk does what caulk does — dries out, shrinks, and pulls away from
the brick, usually within a few years. From then on water runs **behind** the metal and into the exact
seam the metal was installed to cover, and the leak shows up in a bedroom ceiling with no visible cause
on the roof.

**What to look for:**
One of the easiest checks on the whole page, and you can do it on any house on your street.

Look at where the metal meets the chimney brick. **Cut-in counterflashing follows the mortar joints** —
it steps down the chimney in a staircase matching the brick courses, and the top edge of the metal
disappears into the joint. **Surface-mounted counterflashing runs in one straight diagonal line** across
the face of the brick, cutting across the courses instead of following them, with a visible bead of caulk
along the top edge. Once you've seen the difference you can't unsee it.

**The honest part:**
Cutting counterflashing into masonry is labor, and it's a real line on the estimate. It's also worth
saying plainly: there's a limit to what any flashing can do. If the crown on top of the chimney is
cracked, or the brick is spalling and taking on water, the water is getting in **above** the flashing and
no roofer's metal will stop it. That's masonry work and it's somebody else's trade. We'll tell you that
when we see it rather than flash over it and hope.

---

## Stage 20 — The starter course ⭐ *(Point 6)*

**Headline:** The first row is the one wind finds

**Body:**
The bottom row of shingles doesn't sit on the deck. It sits on a **starter strip** — a solid strip run
along every eave and up every rake, with its adhesive line positioned **at the bottom edge**. That glue
is what bonds down the very edge of the first course of shingles. It's the only thing holding that edge,
and that edge is where wind gets its grip.

Owens Corning makes a purpose-made starter. So does every other manufacturer. It's a separate product,
priced by the foot.

### The shortcut

A 3-tab shingle can be flipped upside down, or have its tabs cut off, and used as starter. It's cheaper
per foot, it's already on the truck, and nobody has to stock or order a second product. On a big job it
saves a couple of hundred dollars and one supplier line.

### What actually goes wrong

**The glue ends up in the wrong place.** This is the whole problem, and it's specific. The factory
adhesive on a 3-tab shingle sits **partway up the shingle**, positioned for a shingle lying in the middle
of a roof, where it bonds the tab of the course above. Flip that shingle over to use as starter and the
adhesive is now several inches up the slope from the roof edge — nowhere near the bottom edge of the first
course. Cut the tabs off instead and the adhesive is usually cut away entirely, or sits too high to do
anything. Either way the bottom edge of your first course of shingles is held by **nails alone**, with
nothing sealing it down.

**Wind uplift starts at edges.** Not in the field. At eaves and rakes, where the pressure is highest and
there's a free edge to get under. An unsealed first course lifts in a gust; once it lifts, the wind has an
opening under the course above it, and blow-offs run **up** the slope from there. That's why a
storm-damaged roof so often loses a triangle of shingles starting at a corner.

**The overhang wanders.** Purpose-made starter is manufactured to a consistent dimension and set to a
consistent small overhang past the drip edge, so water leaves the roof cleanly into the gutter. Strips cut
by eye on a plank vary. Where the overhang comes up short, water runs behind the gutter and down the
fascia board.

**Cutouts.** If a 3-tab is used right-side-up as starter without the tabs removed, the slots between the
tabs are open channels straight down to the underlayment — at the eave, which is exactly where ice-dam
water backs up.

### ⭐ What to look for — from your driveway

**Stand back and sight along the very bottom edge of the roof**, the line just above the gutter. It should
read as one solid, unbroken shadow line, dead straight for the whole run.

**Look for notches.** If you can see small evenly spaced gaps or notches interrupting that line — roughly
one every foot, at perfectly regular intervals — those are the cutouts of a 3-tab shingle showing through
at the starter course. **A purpose-made starter strip is solid. It has no notches, ever.** The regular
spacing is the tell: damage is random, manufacturing is not.

**Zoom in with your phone.** It reads far more clearly on a screen than to the naked eye, and you can do it
from the sidewalk.

**Check the rake** — the sloped edge at the gable end — the same way. It should be straight and tight with
the same overhang from top to bottom. A rake edge that wanders in or out was cut by eye.

**After a windy day, look at the bottom row.** Lifted corners on the lowest course mean that edge was never
bonded to anything. And if you can safely reach the lowest corner of a porch or garage roof from the
ground, the bottom edge of that first shingle should be stuck down. If it flaps loose, nothing sealed it.

### The honest part

**This isn't a story about crooks.** Roofs were built this way for years, before dedicated starter was a
stocked product, and plenty of them are still up. That isn't the argument. The argument is that the right
product exists now, it's a small line on an estimate, and the edge it protects is the edge that fails
first.

Purpose-made starter is priced by the foot around the entire perimeter — eaves **and** rakes, which on most
houses is several hundred feet. It's a real cost and it appears as its own line on our estimate rather than
disappearing into the shingle price. Substituting it can also drop a manufacturer's system warranty back to
base shingle coverage — a second cost that only shows up years later, in writing, at the worst moment.

---

## Stage 21 — Ventilation goes in, then the ridge ⭐ *(Point 15, part two · Point 5)*

**Headline:** The ridge line tells you who did the work

**Body:**
Everything Stage 3 described gets built here. The ridge is cut open for continuous ridge vent where the
roof can carry it. Baffles go in at the rafter bays if the intake needs protecting. Soffit intake gets
opened up, added or corrected where the attic inspection called for it. Any second exhaust type fighting
the ridge — a box vent, an old powered fan — comes off, because two exhausts on one roof is the short
circuit, not a bonus.

**Then the hip and ridge cap goes on.** These are the shingles that fold over the peak and over every hip.
They take the sharpest bend on the roof and the most direct weather, and they're the last thing anyone
looks at.

**Purpose-made hip and ridge** is a different product from a field shingle: thicker, pre-shaped for the
fold, with the seal strip placed for a shingle that's bent rather than flat. Owens Corning makes it in
profiles matched to their shingle lines.

### The shortcut

A 3-tab shingle cut into three pieces makes something cap-shaped, out of a bundle already on the truck, for
a fraction of the price of dedicated cap.

### What actually goes wrong

**It cracks at the fold.** A 3-tab is a single flat layer, not designed to bend over an angle. Fold it
across a ridge — especially in cold weather, and Ohio roofs get installed in cold weather — and the mat
fractures along the crease. The crack is usually invisible on install day. It opens over the first winter,
along the highest, most exposed line on the whole roof.

**The seal lands wherever the cut leaves it.** Slice a 3-tab into thirds and the factory adhesive strip
ends up in whatever position the cut produces, not where a cap needs it. Purpose-made cap has the sealant
positioned for the fold.

**The profile doesn't match.** Modern shingles are laminated — two layers bonded together, which is where
the depth and the shadow lines come from. Cap that roof with single-layer pieces and the ridge is
**thinner than the roof it's finishing**. The colors won't match either, because the 3-tab used is a
near-match solid rather than the same multi-tone blend as the laminated field.

### ⭐ What to look for — from across the street

**Look at the ridge against the sky.** On a laminated shingle roof, a purpose-made cap reads as a
deliberate, heavy band along the peak — visibly **thicker** than the courses below it, with a real shadow
at each cap. Cut-up 3-tab reads thin and flat: the ridge almost disappears into the field. **If the peak
of the roof looks skinnier or lighter than the roof underneath it, that's your answer.**

**Then look at the very end of the ridge**, at the gable, where you're seeing the last cap edge-on. Two
visible layers of thickness is a purpose-made cap. One thin layer is a cut-up 3-tab. This is the definitive
check, and a zoomed phone photo settles it in about four seconds.

**After a hard winter**, sight along the peak for hairline cracks or small lifted corners breaking the
line. Cracks along a ridge tend to appear at even intervals, because they appear at the folds.

**While you're up there with your eyes, count the exhaust types** — Stage 3, check 3. It's the same glance.

### The honest part

**Same caveat as the starter, and it matters.** Cutting field shingle for cap was standard practice for
years — on a 3-tab roof the 3-tab **was** the matched product, and doing it that way was correct. On a
laminated roof it isn't, and the difference is visible from the street.

Purpose-made cap costs several times what a cut-up 3-tab does, per foot. It's a separate line on our
estimate, priced by the foot of ridge plus hip — so a simple gable is a short run and a hip roof with
several planes is a long one, and the price moves with it. As with starter, substituting can drop a
manufacturer's system warranty back to base coverage.

---

# ACT FIVE — AFTER

---

## Stage 22 — During photos, from the air *(Point 10, part two)*

**Headline:** Pictures of the parts that get covered

**Body:**
The second drone set is flown mid-build, and it's the one that matters most. The deck bare. The replaced
sheets in place. The ice barrier down in the valleys and at the eaves. The underlayment. The flashings in
and woven. The ridge cut open before the vent goes on. Every layer you would otherwise be taking entirely
on trust, shot from above, before the next layer covers it forever.

**What to look for:**
Compare it against your estimate, line by line. Ice and water shield at eaves and valleys — there it is.
New drip edge — there it is. Decking replacement — count the sheets. Ridge vent — there's the cut. Every
line you paid for should have a picture attached to it.

---

## Stage 23 — Cleanup *(Point 8)*

**Headline:** We leave with the nails, not just the shingles

**Body:**
Cleanup is the last thing you experience and it's the thing you'll remember. It's a defined part of the
job, not something done if there's daylight left.

A tear-off puts several thousand old nails onto your property. They come off the roof, they go down the
chute, and a percentage of them miss — into the beds, into the grass, into the driveway, into the gravel.
That's physics, not carelessness. What matters is what happens next.

**What cleanup means, specifically:**

- **Tarps go down first**, before a single shingle moves — over the beds, over the AC unit, against the
  siding, across the walkways.
- **Debris goes into the trailer as it comes off**, not into a pile on the lawn to be dealt with later. A
  pile on the grass for eight hours kills the grass.
- **Gutters get cleared** of tear-off grit and nails before we leave. That's where a large share of both
  ends up, and a gutter full of granules doesn't drain.
- **Magnetic sweep — twice, in two directions.** The full perimeter, the driveway, the walkways, the apron
  and the street edge. Twice matters: a magnet passed one way rolls over nails lying against its direction
  of travel and picks them up on the cross pass.
- **The trailer or dumpster leaves.** If it genuinely can't be pulled the same day, you'll be told when it
  goes. It does not sit in your driveway for a week.
- **A walk with you** around the outside before we're gone — gutters, siding, plantings, AC unit, driveway.

**What to look for:**
**Do your own magnet pass a week later.** A telescoping magnetic sweeper from any hardware store is about
twenty dollars, and it's the single best test of a roofing crew there is. Run it over the driveway, the
walkway and the strip of lawn along the house. If it comes up clean, the sweep was done properly.

**The honest part:**
Nobody gets every nail. Nails work their way up out of grass for weeks after a tear-off, especially after
rain, and anyone promising you a permanently clean yard is selling. What we promise is this: we sweep twice
before we leave, and **if you find nails afterward, call us and we come back and sweep again.** That isn't
a complaint being handled. That's the job.

Worth asking any contractor before you sign: when the contract says "clean-up included," does that mean the
nails, or just the shingles.

---

## Stage 24 — The owner's walk *(Point 9 — tier three of Stage 5)*

**Headline:** The owner walks your roof before we call it done

**Body:**
This is the third tier from Stage 5, and here's what it actually consists of.

Cardinal's owner is on your job. Not for eight straight hours — a crew being watched every minute isn't
working, it's performing — but at the three points where being there changes the outcome: at the start, at
the deck stage before anything gets covered, and at the end, on the roof, before the job is called complete.

The final walk is the punch list: drip edge straight and continuous, starter course right at the eaves, no
exposed fasteners, step flashing under the siding rather than caulked over it, new boots seated flat, cap
straight, ridge vent continuous and closed off at the ends, gutters clear, nothing shaken loose inside.
Anything on that list gets written down on site with a photo, while somebody is standing there — not
remembered from the truck an hour later.

**What to look for:**
Ask any contractor a simple question before you sign: **who will actually be on my property, and what are
their names.** On a Cardinal job that's a three-name answer — the crew leader who never leaves, the project
manager whose card you're holding, and the owner. Most bids can't produce one name with a number attached.

**The honest part:**
Walk it with him if you want to. Most people don't, and that's fine. But the offer is real and the list gets
gone through either way.

*(Variant if Theo's name goes on the page — see V14: replace "Cardinal's owner" with "Theo Dorion, who owns
Cardinal," and "the owner" with "he" throughout.)*

---

## Stage 25 — After photos, and the handoff *(Points 10 and 11)*

**Headline:** You get every photo we took. All of them

**Body:**
The third drone flight goes up over the finished roof — the same angles as the before set, so the two lay
side by side.

Then the whole thing gets zipped and sent to you. Not a curated six for our Instagram. **The set.** The
before aerials. The attic. The bare deck. Every replaced sheet of decking, photographed where it lay. The
ice barrier in the valleys. The underlayment. The flashings going in. The chimney. The ridge cut open. The
finished roof from four sides and from above.

**Why it's worth keeping:**
It's your documentation, and it does three jobs over the life of the roof. **When you sell**, it's proof of
what's up there and when it went on — a buyer's inspector reads a photo set very differently from a
receipt. **If a storm comes through in year six**, it's the "before" condition that every adjuster asks for
and almost no homeowner has. **And if a question ever comes up** about whether the north valley actually got
ice and water shield, the answer is a photograph, not somebody trying to remember.

**The honest part:**
It's a large set, so it arrives as a download link rather than an email attachment. Save it somewhere you'll
still be able to find it in ten years. It's worth considerably more then than it is the week we finish.

---

## Closing block

**Headline:** That's the whole job

**Body:**
Nothing on this page is proprietary. Every product named here is available to any roofer in Dayton, and
every check described here works on any roof on your street, including the one you already have. The
ventilation audit in particular takes ten minutes and costs nothing, and most people who run it find
something.

We'd rather you knew what to look for than took our word for it. A homeowner who can read a ridge line, a
starter course and a soffit vent from the driveway is a harder sell, and that suits us — we'd rather bid
against somebody who knows what the bid says.

**CTA:** Get your roof inspected · Ask for a quote · See what a photo set looks like

---

# ABOUT CODE — the one paragraph that mentions it *(see V1, V2)*

**Headline:** Where code fits into all this

**Body:**
Roofing in Ohio is governed by the state's residential code, and the local jurisdictions around Dayton each
administer permits and inspections a little differently. We check what your address requires before we
start, and we tell you what applies to your job.

But every single thing described on this page is here because it works, not because a book says so. If you
want the statute, we'll pull the section for you. Most people would rather see the photograph.

*⚠ Editor's note: this block is the only place on the page that mentions code at all, and it makes no
specific requirement claim. **If V1 or V2 comes back unresolved, delete the entire block.** Nothing else in
the copy depends on it.*

---

# REUSABLE FRAGMENTS

For nav labels, tooltips, card fronts, hover states and social pull-outs. Same voice, standalone.

**Section labels (short form):**
Measure · The attic · Ventilation · The contract · Who's here · Insured · Materials · The call · Your prep
· The sign · The neighbors · Before photos · Arrival · Tear-off · The deck · Edge metal · Ice barrier ·
Underlayment · Flashings · The chimney · Starter · Ridge · During photos · Cleanup · The walk · Your photos

**One-line card fronts:**
| Stage | One-liner |
|---|---|
| The attic | The roof surface can't tell you any of this |
| Ventilation | Your attic has to breathe, or the roof cooks |
| The contract | Where the surprises get priced, not ignored |
| Who's here | Three people. One of them never leaves |
| Insured | Ask for a certificate with your name on it |
| Materials | Vetted by the manufacturer, named on your estimate |
| The deck | Nobody can quote this before the roof comes off |
| Ice barrier | The layer you'll never see again |
| Underlayment | Felt wrinkles. Synthetic doesn't |
| Starter | The bottom edge is the one wind finds |
| Chimney | Cut into the brick, not caulked to it |
| Ridge cap | Thicker than the roof it finishes |
| Cleanup | Twice with the magnet, in two directions |
| Photos | Every one we took, not the good six |

**Pull quotes:**
> A line item on a bid is a promise. A photograph is a product.

> Exhaust with no intake isn't ventilation. It's a vacuum.

> The icicles are the symptom. The cause is inside the house.

> Two exhaust types on one roof isn't twice the ventilation. It's a short circuit.

> Continuous presence beats seniority.

> A senior person you have to phone is a delay. A person on your driveway is an answer.

> We require from our crews what you should be requiring from us.

> Wind uplift starts at the edges. Not in the middle.

> At 6:30 in the morning, every house on the street looks the same.

> Most homeowners have never seen their own roof. You'll see yours three times.

> We'd rather bid against somebody who knows what the bid says.

**The two-shortcut teaser** (homepage promo, or a card linking into the page):
> Two shortcuts you can spot from your own driveway — one at the peak of the roof, one at the very bottom
> edge. Neither needs a ladder.

**The ventilation teaser** (stronger than the shortcut teaser for cold traffic — it's a free audit, not a
sales point):
> Count the vent types on your roof. If you can see two different kinds of exhaust up there, your attic
> isn't ventilating the way you think it is. Ten minutes, no ladder.

**The oversight teaser** (for a trust module, a footer, or the quote-request page):
> Three people are responsible for your roof, and the one who never leaves is the one you'll actually
> talk to.

**Tone guardrails for anyone extending this copy:**
- Never name a competitor, a local company, or "some roofers." The subject is always the practice, never
  the person.
- Both shortcut sections carry an explicit line saying the practice was once correct. **Keep those lines.**
  They stop the page reading as an attack, and they're also true.
- **Stage 5 is a ladder, not a list.** The crew leader comes first on purpose. If someone reorders it to
  put the owner first because that sounds more impressive, the section stops working — the whole point is
  that continuous presence beats seniority from where the homeowner is standing.
- **Stage 6 prints no numbers and Stage 7 prints no warranty figure. That's deliberate, not an omission.**
  Policy limits belong on a certificate with the client's name on it; the warranty belongs on the estimate.
  Both are stronger as an offer than as a claim. See V28 and V5.
- **Keep "we'll tell you exactly which tier we hold rather than letting a badge do work it shouldn't."**
  That sentence is what prevents Preferred drifting into implying Platinum Preferred. See V4/V30.
- The ventilation section is the one most likely to attract an added statistic or a warranty quote.
  **Don't.** See V19 and V21 — the copy is deliberately specific about mechanism and deliberately vague
  about numbers.
- No exclamation marks. No "amazing," no "peace of mind," no "we treat your home like our own."
- Every claim about what Cardinal does should survive a homeowner testing it. Don't write one that can't.
