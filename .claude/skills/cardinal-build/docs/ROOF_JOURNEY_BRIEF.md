# The client journey page — Theo's brief

*Captured 3 Aug 2026, in his own words, before any design work. This is source
material for the "how a roof gets built" client-facing page. **Domain detail from
Theo is load-bearing on this project** — CLAUDE.md says so explicitly, and the
428–451 gap is what losing it looks like. Nothing here is invented.*

## The ask, verbatim

> a separate page from the homepage on a complete presentation of how a roof gets
> built beginning to finish, all interactive. from contract signing to field
> takeoff to client communication a few days before for access, to moving things
> away from the house and checking for things like water sprinklers, etc, to
> documentation, crew arrival, trailer arrival, what to expect (Noise, nails,
> cleanup, etc) then the full roof build all interactive if possible.

> It doesnt necessarily have to use any of my real photos. It can use any design
> of your choice.

**Five directions, two of which the client actively engages with.** Settled at
four after briefly considering eight, then a fifth (the pop-up book) was asked
for by name — see "The fifth direction" below.

## What he added — the differentiators, verbatim

> Make sure your using things for Ohio code, like soft metals, flashings. Also
> decking, what to expect, Ice and water, felt vs synthetic felt, throw something
> in about people would use 3 tab instead of Hip and ridge, 3 tab instead of
> starter. Chimney counterflashing, cleanup (very important) and I personally
> check on the job, take drone photos throughout the build, before the build and
> after the build. Then I zip the photos and send to my clients. Yard signs, why
> its important and actually necessary its in the yard at the very least a day
> before start. As a joke maybe say something about so we know what roof to
> replace in different words. Also, we knock on the neighbors doors to let them
> know well be working in the neighborhood.

## Decomposed — every point, and what it means for the page

| # | Theo's point | What it is | Why it earns a place |
|---|---|---|---|
| 1 | **Ohio code — soft metals, flashings** | Valley metal, drip edge, apron/head flashing, step flashing, counterflashing | Code-compliance as a *selling* point; the cheap bid skips or reuses these |
| 2 | **Decking, what to expect** | Rotten/delaminated sheathing found at tear-off, replaced per sheet | The #1 mid-job cost surprise. Setting this expectation up front kills the angriest call of the whole job |
| 3 | **Ice and water shield** | Self-adhering ice barrier at eaves, valleys, penetrations | Ohio climate genuinely needs it. Invisible once covered — must be *shown* or the client never knows they got it |
| 4 | **Felt vs synthetic felt** | 15/30# asphalt-saturated felt vs synthetic underlayment | A real, explainable material upgrade — tears, wrinkles, absorbs water vs doesn't |
| 5 | **3-tab instead of hip and ridge** | Cutting up 3-tab shingles into ridge caps rather than buying purpose-made hip & ridge | ⭐ A shortcut a homeowner can *see* on a finished roof once told what to look for. Enormously persuasive |
| 6 | **3-tab instead of starter** | Cut 3-tab used as starter course instead of purpose-made starter strip | ⭐ Same class. Wrong adhesive location, wrong sealant line — a wind-uplift failure waiting at the most vulnerable edge |
| 7 | **Chimney counterflashing** | Cut-in/reglet counterflashing over step flashing, vs surface-caulked | The single most common leak source, and the most commonly bodged |
| 8 | **Cleanup — "very important"** | Magnet sweep, debris, dumpster removal | He flagged this himself as very important. It is the last thing the client experiences and it sets the review |
| 9 | **He personally checks the job** | The owner physically shows up | Owner-present is a differentiator most crews can't claim |
| 10 | **Drone photos before / during / after** | Aerial documentation across the build | Genuine deliverable, and the visual spine any of these designs could hang on |
| 11 | **Zips the photos, sends to the client** | The client receives the whole set | A real hand-off moment — the client *owns* documentation of their own roof |
| 12 | **Yard sign, in place ≥1 day before start** | Marketing *and* operational necessity | See below — this one has a joke attached and it's a good one |
| 13 | **Knock the neighbors' doors** | Told in advance that work is coming | "Good neighbor" — reframes the noisiest, most disruptive day as considerate |
| 14 | **Check the attic — at the beginning** | Inspecting from *underneath* at takeoff, before any commitment | ⭐ The only way to see decking condition, existing leaks, and whether the ventilation actually works. The roof surface cannot tell you any of it |
| 15 | **Ventilation — "super important"** | Balanced intake (soffit) + exhaust (ridge) | ⭐⭐ See below. This is the one that quietly **voids shingle warranties**, and almost no homeowner knows it |
| 16 | **The PM's card, handed over by the salesperson** | A second named human, with contact details, before work starts | The client is never left with only one number. Handing a *card* is a deliberate physical gesture — it says "this person is yours" |
| 17 | **The PM is on site periodically all day** | Not a drop-and-vanish crew | Answers the unspoken fear: *"will anyone in charge actually be here?"* |
| 18 | **A dedicated crew leader, on site the *whole* time, who answers questions** | Someone in charge who never leaves | ⭐ The one that actually matters at 2pm. See below — this completes a three-tier answer to *"who do I talk to right now?"* |
| 19 | **"we are insured"** | General liability + workers' compensation | ⭐ Weak as a badge, **strong as an explanation** — see below. Most homeowners have no idea what their own exposure is |
| 20 | **"preferred with oc"** | Owens Corning Roofing Preferred Contractor | Confirms an open verification item — but the *permitted wording* is still manufacturer-restricted, and Preferred ≠ Platinum. See below |

### 19 — insurance: don't print the badge, print the reason

*"Licensed and insured"* is on every roofing van in Ohio and a homeowner has
stopped reading it. The version that actually lands explains **their own
exposure**:

- If a roofer without **workers' compensation** has someone fall on your
  property, the injured worker's route to recovery can run through *the
  homeowner's* insurance. That is the risk nobody mentions, and it is the real
  reason this matters.
- **General liability** covers damage to the house itself — the thing a
  homeowner assumes is covered and often isn't.
- The checkable action: **ask any contractor for a certificate of insurance
  naming you.** A real one produces it same-day.

**⚠️ CORRECTED 3 Aug — do NOT use the compliance-vault framing here.** Theo:

> No need to put the crew part with workers comp, I have workers comp. They do to

I had proposed leaning on the `crew_docs` compliance vault (COI/W-9/licences
with expiry dates, builds 547–556) as the proof point — *"we require from our
crews what you should require from us."* **That was a clever line answering a
question nobody asked.** The actual fact is simpler and stronger:

> **Cardinal carries workers' comp. The crews carry it too. Everyone who sets
> foot on your roof is covered.**

That is a plain statement of fact, it needs no mechanism to justify it, and it
closes the homeowner's exposure completely rather than explaining a filing
system to them. **Keep the crew compliance vault out of this section entirely.**

**This also retires verification item V29** — the drafted line *"a crew with an
expired certificate doesn't go on a roof"* was flagged because a table that
*stores* expiry dates is not the same as a rule that *stops* a crew working.
That claim is no longer needed at all, so the gap it exposed simply doesn't
arise. Cut the sentence rather than trying to make it defensible.

⚠️ **Do not print policy amounts, a carrier name, or a licence number** without
Theo confirming each. "We carry general liability and workers' comp, and you can
have the certificate" needs no numbers to be strong.

### 20 — Owens Corning Preferred — ✅ SETTLED BY THEO, 3 Aug

> We are preferred not platinum, preferred is 50 years , 10 years workmanship
> transferrable and backed by oc. dont mention platinum

**This closes verification item V5 — and reframes it.** I had flagged the app as
holding two *contradictory* warranty figures. **That was wrong, and the error is
worth recording:** they are not a contradiction, they are **two tiers the client
chooses between.** The estimate template listing both was correct all along. A
second message from Theo supplied the other one:

> The other option is OC Systems warranty, 25 years, 5 years on labor
> transferrable and backed

| | **OC Systems** | **Preferred** |
|---|---|---|
| **Material** | 25 years | **50 years** |
| **Labor / workmanship** | 5 years | **10 years** |
| **Transferable** | Yes | Yes |
| **Backed** | Yes | Yes — **by Owens Corning** |

**This is a good/better structure, and it is a gift to this page.** It gives the
homeowner a real choice to make rather than a spec to accept, and a choice is
far more engaging than a claim. Both tiers are transferable and both are backed
— so the decision is honestly about *duration*, not about whether they're
protected at all. Present it as two columns, not as an upsell.

⚠️ **One loose end for Theo, minor and not blocking:** the Sales Floor script
says *"25 years on the shingle, 10 years on our workmanship"* — which pairs
Systems' 25-year material with Preferred's 10-year workmanship figure. That may
be perfectly correct (Cardinal's *own* workmanship guarantee could sit alongside
the OC-backed labor coverage and run longer), or it may be a legacy line that
drifted. Worth a glance, but it does not block this page — the page uses the
two-tier table above.

**Two of these are worth more than the numbers, and the copy must not bury
them:**

- **Transferable** — it survives a sale. That converts the roof from a repair
  into something that shows up in the resale conversation, and almost nobody
  asks about it because they don't know to.
- **Backed by OC** — a manufacturer-backed warranty does not die if the
  contractor does. That is the *entire* answer to the fear a homeowner has about
  every contractor and is too polite to say out loud. It's the strongest single
  sentence available on this whole page.

⚠️ **"dont mention platinum" is a direct instruction — follow it literally.**
No Platinum, no Platinum Protection, no comparison to a higher tier, not even to
say Cardinal isn't it. The Resource Library's existing warning stands and is now
moot: the copy simply never goes near it.

*Residual, minor:* manufacturers do restrict how designations and trademarks are
written in public marketing. The **terms** are now confirmed by the owner; only
the **exact typographic/trademark treatment** ("Owens Corning™ Roofing Preferred
Contractor" and similar) is worth a glance before publishing. That's a
copy-editing check, not an open question about the facts.

### Cleanup — ✅ ALSO SETTLED, and stronger than what was drafted

> Yes we do go back the next day and sweep again. We are huge on cleanup

The next-day return sweep was drafted as a proposed promise and flagged for
approval because nothing in the app committed to it. **The owner confirms it is
real practice.** So it prints as a commitment.

"We are huge on cleanup" should set the *tone* of that section, not just its
content — it's the last thing the client experiences and it writes the review.
The concrete, checkable version of the claim is the sequence: magnetic sweep
before the crew pulls out, dumpster gone, **and a return the following day to
sweep again**. Very few contractors come back the next day; saying it plainly is
the whole differentiator.

### The three tiers of oversight — write them as one thing, not three boasts

Points 9, 17 and 18 are not three separate claims. Together they answer a single
question a homeowner is too polite to ask out loud: **"if something looks wrong,
who do I actually talk to, and will they be here?"**

| Who | When they're there | What they're for |
|---|---|---|
| **Crew leader** | **The whole time, never leaves** | The answer to *right now*. Any question, at any moment, without waiting for a callback |
| **Project manager** | Periodically through the day | Named, carries a card the client already has (#16), the escalation if the answer isn't on the roof |
| **Theo — the owner** | Checks on the job himself | The buck stops visibly, not theoretically |

**Written as a stack, this is genuinely unusual and hard for a competitor to
match.** Written as three separate bullet points, it reads as padding. The copy
must present the ladder, and the crew leader must come **first** — being there
continuously beats being senior, from where the homeowner is standing.

### 14–15 added later the same session, verbatim

> Maybe also in the beginning the importance of checking the attic, ventilation
> is also super important

**These two belong together and belong EARLY** — they're both part of the
takeoff/inspection stage, before the contract is even signed, and they reframe
the whole page: a roof is a *system*, not a surface. Placing them at the front
also means the page opens with something the client has genuinely never
considered, rather than with paperwork.

**The attic check** reveals what no surface inspection can: decking condition
from underneath (delamination, staining, daylight through the boards), whether
soffit intake is blocked by insulation, whether a bath or kitchen fan is venting
*into the attic* instead of outside (common, and it rots the deck from below),
and the real history of any leak.

**Ventilation** is the strongest technical content on the whole page, because:
- It's **invisible** to the client and almost never explained to them.
- The failure modes are real and nameable: exhaust with no intake (pulls
  conditioned air out of the house), **mixing a ridge vent with box vents or a
  powered fan** (short-circuits — the ridge vent becomes intake for the fan
  instead of drawing from the soffits), insulation smothering the soffit vents.
- The consequences are things homeowners already fear and already have a name
  for: **ice dams** in winter, a superheated attic cooking the shingles from
  underneath in summer, moisture and mould, premature shingle failure.
- **Manufacturer warranties require adequate ventilation.** A beautiful roof
  over a dead attic can have its warranty refused. ⚠️ *Verify the exact Owens
  Corning warranty wording before stating this to a client — see the warning
  below. The principle is standard across manufacturers; the specific terms are
  what needs checking.*
- **What to look for is genuinely checkable**: are the soffit vents actually
  open, or painted shut / stuffed with insulation? Is there a ridge vent along
  the peak? Are two different exhaust types fighting each other on the same roof?

## The yard-sign joke

Theo: *"As a joke maybe say something about so we know what roof to replace in
different words."*

The sign is genuinely operational, not just marketing — a crew arriving at
6:30am on a street of similar houses needs the target unmistakable. The joke
writes itself and should be **dry, not zany** — Cardinal's voice is plain and
confident, never cutesy. Candidate lines, to pick from later:

- "It's also how we make sure we tear off the *right* roof."
- "Partly marketing. Partly so the crew doesn't re-roof your neighbour."
- "It goes up the day before for a reason: at 6:30am, every house on the street looks the same."

The third is the most honest and the least jokey-jokey — probably the best of
the three, and it lands the operational point while still being funny.

## ⚠️ Code claims — verify before shipping any of them

Ohio adopts the **Residential Code of Ohio (RCO)**, derived from the IRC.
Roof-covering requirements live around **IRC/RCO R905**, and there are real
requirements for drip edge, ice barrier, underlayment and flashing. **Do not
print a section number, a dimension, or an "Ohio code requires…" claim on a
client-facing page without verifying it against the current adopted code.**

This sandbox has no outbound internet (confirmed — the agent proxy refuses all
external hosts this session), so **no code citation in this document or any
design has been verified against the actual code text.** Theo or a session with
network access must confirm before any of it is stated to a homeowner as law.

Safer framing that needs no citation and is true regardless: *"this is how we
do it, and here's what it's for"* — show the component and its purpose, rather
than asserting a legal requirement. Sell the workmanship, not the statute.

## The fifth direction — requested by name

Settled at four, then he asked for a fifth, specified directly:

> Maybe add a 5th in kind of like a pop up cardboard book style illustration
> thats interactive and things pop, make it fun and colorful. add some humor like
> a warning of debris. […] be unique in this one

**So: five directions, two of which the client engages with.** This one is
specified more tightly than the others and should be taken literally — a
**pop-up cardboard book**: paper craft, visible fold lines and scored creases,
tabs you pull, layers that rise off the page when a spread opens.

Three things make it worth building rather than a gimmick:

1. **It licenses a full departure from Cardinal's near-black palette.** Every
   other surface in this app is dark chrome for a working CRM. This is a
   storybook handed to a homeowner — kraft board, bright inks, warm and colourful
   is *correct* here, and the departure is deliberate rather than an
   inconsistency. Note the Showcase's existing **Kraft** share-card frame
   (measured `232,220,200`) is already a sanctioned paper tone in this app.
2. **Humour is explicitly wanted** — he named the debris warning himself. A
   mock safety label on a pop-up that flings cardboard debris is exactly the
   register: dry, self-aware, never cutesy.
3. **The physical metaphor carries the roof assembly better than any other
   direction.** A roof genuinely *is* layers stacked on a deck — a pop-up book
   is layers stacked on a page. The material and the medium agree.

⚠️ **Motion honesty:** a pop-up-heavy design must respect
`prefers-reduced-motion` and still be fully readable with every animation off.
The pops are the delight, not the information.

## What NOT to do with this material

- **Don't turn it into a competitor hit-piece.** The 3-tab shortcuts are taught
  as *"here's what to look for"*, not *"the other guy is a crook."* The Resource
  Library's existing Do & Don't page is the tonal precedent.
- **Don't state code as law without verification** — see above.
- **Don't let it become a wall of text.** Twenty points is a lot; each design
  should carry the ones it can hold well and let the others go.
