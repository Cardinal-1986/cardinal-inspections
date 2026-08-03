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

Four directions, **two of which the client actively engages with**. Settled at
four after briefly considering eight.

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

**The strongest available framing, and it's true and already built:** Cardinal
*already demands exactly this of its own subcontractor crews* — `crew_docs`
holds COI, W-9 and licences **with expiry dates**, and the Crews module was
built to track them (builds 547–556). So the line writes itself: *we require
from our crews what you should require from us.* That is a claim backed by a
feature that exists, not a slogan.

⚠️ **Do not print policy amounts, a carrier name, or a licence number** without
Theo confirming each. "We carry general liability and workers' comp, and you can
have the certificate" needs no numbers to be strong.

### 20 — Owens Corning Preferred: true, but watch the wording and the tier

This **confirms verification item V4** in `ROOF_JOURNEY_COPY.md` as factually
true — Cardinal is Preferred with OC. Two things still need care:

1. **Manufacturers restrict how contractor designations may be worded** in
   public marketing, including trademark treatment. Confirm the exact permitted
   phrasing before it goes on a public page. *Being* Preferred and being allowed
   to *say it a particular way* are different questions.
2. **Preferred is not Platinum Preferred.** The Resource Library already carries
   a warning that Platinum Protection is Platinum-Preferred-only and must not be
   quoted. Whatever warranty language attaches to Preferred specifically is what
   may be used — **do not let "Preferred" drift into implying the Platinum
   tier.** This is precisely the kind of overclaim that is easy to make by
   accident and expensive to make in writing.

Still unresolved and Theo's alone: **verification item V5** — the app currently
contains *two different warranty figures* (Sales Floor says 25-year shingle;
the estimate template lists both a 25-year and a 50-year tier). They disagree.
One pair has to be chosen before either appears on a public page.

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
- **Don't let it become a wall of text.** Thirteen points is a lot; each design
  should carry the ones it can hold well and let the others go.
