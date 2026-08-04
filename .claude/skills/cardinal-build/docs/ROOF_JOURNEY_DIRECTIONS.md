# The client journey page — the design directions

*Produced 3 Aug 2026 by a 44-agent design pass: three grounding audits (what already exists
in the codebase, the design-system constraints, the real build sequence), **ten** directions
designed from distinct lenses, each critiqued by three independent voices — a nervous
homeowner, Theo himself, and the engineer who has to build it into a 3.5 MB single-file
PWA — then cut and merged to a final set. Zero agent errors.*

**Live tap-through preview:** https://claude.ai/code/artifact/18679493-9235-4e61-a841-ee7f42c821e0

Source material: `ROOF_JOURNEY_BRIEF.md` (Theo's 20 points, verbatim) and
`ROOF_JOURNEY_COPY.md` (25 stages of client-facing copy, design-independent — it drops
into whichever direction gets picked).

**Theo picked, 3 Aug: Option 5 (the pop-up book) and the Driveway Test.**

- ✅ **The Driveway Test is BUILT and shipped** — `drivewaytest.html` at the repo root.
  Standalone, public, no login. See the build log entry.
- ⏳ **The pop-up book** is next. Its own spec says build **one spread first** (the tear-off,
  with the debris) before drawing the other fifteen — that is the go/no-go on the register.

**No `index.html` change yet.** The Driveway Test is a sibling page, so it needed none.

## ⚠️ Numbering — this doc holds EIGHT, the preview shows FIVE

The synthesis produced **eight** surviving directions. Theo asked for **four**, then added a
fifth by name (the pop-up book, designed separately — see `ROOF_JOURNEY_BRIEF.md` §"The fifth
direction"). So the preview presents a **selected five plus one cheap de-risker**, and the
numbers do not match this document. Mapping, so nobody hunts for a missing option:

| Preview | This doc | Note |
|---|---|---|
| **1** One Loud Day | #1 ONE LOUD DAY | as designed |
| **2** Snap Line ⚡ | #2 SNAP LINE | as designed |
| **3** The Flag Run ⚡ | #3 THE FLAG RUN | as designed |
| **4** One Drawing | #7 ONE DRAWING | as designed |
| **5** The Pop-Up Roof | *(not in this doc)* | designed separately, spec in the session record |
| **+** The Driveway Test | #8 THE DRIVEWAY TEST | offered as a 1-build de-risker, not as one of the five |
| — | #4 FIFTEEN WINTERS ⚡ | **designed and scored, not presented.** Third client-engaging option; held back because Theo asked for ~2, not 3. Real work, revisit if #2 or #3 is rejected |
| — | #5 TWELVE LAYERS | **not presented.** The synthesis proposes it as Act Four *inside* #7 rather than standalone |
| — | #6 EVERY LINE | **not presented.** Strong idea (the zeros are the argument), but it is a pricing page, not a journey page |

The three unpresented directions are complete specs, not sketches. They are the first place to
look if a presented one gets rejected.

---

## Scores — all ten, before the cut

Averaged across the three critics, 50 max. **Score alone did not decide the final set** —
distinctness, and what each direction structurally *cannot* hold, mattered more. The two
lowest were cut; the top two were merged because they were the same page.

| Direction (lens) | Score |
|---|---:|
| ONE LOUD DAY (soundmap) | 40.0/50 |
| SNAP LINE (tracker) | 38.7/50 |
| THE DAY (dayof) | 38.0/50 |
| THE CHALK LINE (transform) | 38.0/50 |
| SECTION — How a Roof Gets Built (story) | 37.0/50 |
| The Flag Run (prep) | 36.3/50 |
| The Section (anatomy) | 36.0/50 |
| FIFTEEN WINTERS (myths) | 36.0/50 |
| Every Line (receipt) | 36.0/50 |
| The Cutaway (dollhouse) | 35.3/50 |

---

## The final five, plus one

### 1 · ONE LOUD DAY

> 6:30am to dark on your house — what's loud, when your driveway comes back, and what to do with the dog.

**Concept.** One screen, one day. A noise line runs 6am to dusk as a filled chart: tall and jagged through tear-off, a cliff at dry-in, short bursts for the nail guns, flat by five. Drag your thumb along the sound of your own day. Four plain rows move with it — DRIVEWAY (blocked/free), NOISE (leave/notice/background), ROOF (sealed/open deck/dried in), and a fourth row that tells you what to DO right now, not just what's happening. Behind it, a line-drawn house re-roofs itself: shingles peel into the trailer, deck goes bare, two sheets mark red for rot, ice & water lands, courses climb back, the yard gets swept. Debris is conserved — everything that leaves the roof arrives in the trailer, and the magnet erases nail ticks one at a time rather than fading them. This is NOT a sales page. It goes out by text from the office the day the install date lands, to a customer who already signed.

**The bold choice.** THE TIMELINE IS THE NOISE, AND THE ANSWERS ARE INSTRUCTIONS, NOT STATUSES. Every roofing timeline graphs progress — a thing the homeowner does not experience. This graphs the thing they do. And the rows answer instead of reporting: not "DOG — NO" but "DOG — out of the house 6:30 to 11. He will not settle through tear-off. The neighbour's works better than the crate." Not "PHONE CALL — NO" but "after 11, or take it in the car." Plus a fourth: "YARD — we tarp the beds on the tear-off side before the first shingle comes off. Flag anything you'd grieve."

**What the client does.** Drags the noise line, or taps NOW. Three jump chips: LOUDEST / DRIVEWAY FREE / DONE. One button texts them the plain-text version — six sentences that survive being read in a parking lot and stuck on a refrigerator.

**Interaction.** Opens at the real clock on install day (Date.now(), not a project lookup) so the 11:40am panic open answers itself. PLAY THE DAY runs 6am to dusk in ~40 seconds for the iPad. A #d1/#d2 hash the office sets when it texts the link, so a two-day job never renders a false DRIVEWAY FREE. Pointer handling copied from wireSlider(); the scene is 8 phase-class writes across a full drag, not 800, guarded on a stored integer.

**Illustration.** Chalk-line elevation on #0B0D0C. 30-degree axonometric, two stroke weights only (2.5px structure, 1.5px detail), round caps and joins, fill:none — the shipped .fig-ink convention inverted. Zero gradients, zero filters (the whole 3.5MB file has none). Cardinal red spends on exactly one object per hour — the thing that hour is about. Red INK is #e35c63: #c8202e is 3.44:1 on this ground and fails as body text, computed not eyeballed.

**Cost.** 3 builds. (A) shell, noise line, four answer rows, jump chips — as type only, no house. Genuinely shippable and it is the whole product. (B) the house and its 8 phase states. (C) copy, the plain-text share, gates. ~55KB. No SQL, no RLS, no table. HEAR IT (Web Audio tear-off) is CUT — AudioContext appears zero times in the app, and playing tear-off noise in a customer's living room the night before is the opposite of this page's job.

**Reuses:** wireSlider() at index.html:56723 — pointer capture, the 592 pointercancel release, the 578 inner-button pass-through · cr-show-styles/cr-show-script shape wholesale: undeclared 100%-fallback token family, no scroll-lock write, Object.assign export, committed dark · proof() at index.html:42115 — approved homeowner copy. NOT talkTracks() at 42089, which is rep coaching ("the first person to speak after the ask usually loses") · hideAllViews() 14996 + navRestore() 20810 + navSetView — three registrations, and the class-shown close-and-confirm loop at ~15076 · The shared overlay geometry list at 53034 — append the id, never restate it

**⚠️ Risk.** It is most wrong on exactly the jobs that generate the angry call — the two-day job, the rain hold, twelve sheets of rot. The #d1/#d2 hash covers day count; it does not cover a mid-day reschedule, and a homeowner holding a document Cardinal gave them that says something false is worse than a homeowner who was told nothing. BLOCKING: one crew lead, one free SPL app, one morning, ten readings on a real job (driveway at 7, kitchen at tear-off, top-floor bedroom, kitchen at 2). Without those the numbers are invented and the page's central claim is soft.

---

### 2 · SNAP LINE ⚡ **CLIENT ENGAGES**

> Where your roof is right now — and every question you asked, with our answer under it.

**Concept.** A chalk line snapped down the left edge. Nails driven flush for stages done, the line held taut at the one you're in, pencil ticks for what's ahead. The current stage is fully open on load — one sentence, what happens, what we need from you, and a phone number — with no gesture required to reach it. Beside every stage runs a margin the client taps to ask a question, say "we're ready," or flag a concern. It pins to that stage forever, with Cardinal's reply underneath it in the same typeface. Six months later they scroll back and see they flagged the septic lid on the 12th and Cardinal answered on the 12th. That is the thing that survives a dispute — and no chat thread produces it.

**The bold choice.** THE STAGE ADVANCES BECAUSE A HUMAN TAPS IT, NOT BECAUSE A PHOTO UPLOADED. Deriving stage from evidence is a tracker that lies: tear-off Tuesday, photos Thursday, and the page tells the homeowner "delivering materials" while there's a dumpster in the driveway. A tracker that is wrong generates the exact phone call it was built to prevent, plus a trust problem Cardinal didn't have before. One button on the client profile; Curtis or Theo taps it; the line snaps forward 260ms with a scatter of chalk dust.

**What the client does.** Reads with zero taps. Taps the margin to ask a question or say ready. Ticks nine prep items at stage 4 — framed as a list that helps them, not a chore chart Cardinal is watching; the nail drives home when the crew confirms the walk, not when the homeowner finishes homework.

**Interaction.** THE PULL GESTURE IS CUT. It was the highest-regression-risk code in the direction, ungateable (jsdom can't see it, headless Chromium isn't reliable on it), it could brick vertical scrolling on the exact iPad Theo presents from, and its own pitch conceded the payoff was one-time. The chalk line snapping forward on advance stays — that ornament earns its keep. Everything else is scroll and a disclosure toggle.

**Illustration.** Type, a chalk line, and nails, on #0B0D0C. Nails drawn side-on, head and shank. Chalk dust is the only fill on the page: six to ten circles r0.6–1.2 at 35% opacity. Running body copy is Georgia — this is the one screen a homeowner reads rather than operates, and Cardinal's reply is set in Georgia too, not monospace. Mono carries the timestamp only. Code citations are OUT: R905.2.8.5 next to real information reads as a man showing you his certificate.

**Cost.** 3 phases, and the order is inverted from the obvious one. P1 (2 builds): journey_events table + api/track.js + the read-only tracker, type only, manual advance. Send it on three live jobs and count opens and count whether Curtis's phone gets quieter. P2 (2 builds): margin notes AND the Cardinal reply row in the SAME build, never separately — shipping a client inbox before the reply surface puts a dated, unanswered note in the homeowner's hand on a token nobody can revoke. P3 (2 builds): the ten drawings, only if P1's numbers are real. Worst case Theo is out two builds, not nine.

**Reuses:** cdStageLabel() + CD_STAGE_LABEL at 15636/15656 — per-CRM client-readable stage names, already written · stageAgo() at 13365 + checklist.stage_since — the human-time formatter the strip was designed around · ensureShareToken() 19438 + shareUrlFor() 19448 + api/share.js — the only existing pattern for showing a client something with no login · api/senddoc.js and push_subs/api/notify.js — do not build a second sender · The class-shown close-and-confirm loop at ~15076; the confirm line is load-bearing (571 proved close() can no-op without throwing)

**⚠️ Risk.** The only direction on this list with an RLS surface, and a forwarded token grants standing read access forever. api/track.js must build the payload column-by-column server-side — projects.checklist alone carries claim type, finance and rep assignment, and CD_STAGE_LABEL's insurance row would show a homeowner "Adjuster Pending" and "Denied." api/share.js has no expiry and no revoke; this needs both. Community jobs default OFF (payer, occupant and contact are three parties, and 2 of 12 have no homeowner on file).

---

### 3 · THE FLAG RUN ⚡ **CLIENT ENGAGES**

> Walk your own yard and put a flag on everything we can't see from a ladder.

**Concept.** A dark plan view of your property. Your house is a plain ink rectangle you drag, stretch and rotate in quarter turns, with FRONT/STREET on one edge and a driveway stub so the crew knows which side the street is. Then you plant flags, in four colours named by what the crew must DO rather than by what the object is: RED — do not drive, do not set (sprinkler heads and line runs, septic lid, leach field, French drain, invisible fence, low-voltage lighting). AMBER — protect (the beds under the eave, the pool, the AC condenser, the shrub you'd grieve). WHITE — I'll move it (cars, patio set, grill, trampoline, toys). BLUE — tell me first (the dog, the gate that doesn't latch, the night-shift sleeper, the neighbour's drive that isn't yours to offer).

**The bold choice.** THE MARKED MAP PRINTS AT THE TOP OF THE CREW WORK ORDER, UNDER "BEFORE YOU SET THE TRAILER" — AND IT SHIPS IN PHASE ONE. That sheet gets taped inside the trailer, and it is the only part of this that actually stops a hosta bed getting crushed. Everything else is a way of filling that sheet in. There are no checkboxes anywhere: a checkbox can't tell us where, and where is the entire value.

**What the client does.** Builds a 90-second sketch, plants flags, and — on the first BLUE flag — gets a real prompted text box, not a long-press note: "Anything the crew should know before they knock?" That's where the dog goes, and it's the answer that prevents the worst possible morning. Autosaves on every plant and SUBMIT is always live: a half-finished map is a call script for the confirmation call, so it has to be able to reach Cardinal.

**Interaction.** Three verbs and only three — ARM (tap a flag in the tray), PLANT (tap the turf; snaps to a 24px lattice so a row of sprinkler heads lands straight), PULL (drag to move, drag off the edge to remove). Coordinates are normalized fractions of the stage rect. The drag moves the captured element by style writes and never repaints — repaint replaces innerHTML, destroys the element under the finger and drops pointer capture, which is the 578 trap 585 documented.

**Illustration.** Survey ink on night turf. Stage at #101613 over #0B0D0C, a 24px lattice of 1px dots at 6% that is both the only texture and the snap grid. Flags are 22px: a 3.5px filled base dot (the base dot IS the mark), a grey wire kinking right, a four-point pennant in the category colour, and a 5x2 shadow ellipse so it stands in the turf instead of floating. Inline SVG, never emoji. The disclaimer is drawn INTO the artwork and printed on the work order: HOMEOWNER SKETCH · APPROXIMATE · CONFIRM ON SITE.

**Cost.** 4 builds, phase one. prep_maps.sql + RLS, run before the index.html change (0.5) · the interaction (2) · tray, interior panel, three view registrations (0.5) · the work-order SVG block and print CSS (1). THE 13 PLAN-VIEW ROOF FORMS ARE CUT — a whole build of new artwork standing between the homeowner and the only part that matters, on a question Cardinal already answered with a tape measure. Most homeowners can't name their roof, and a gable and a saltbox are the same line in plan anyway.

**Reuses:** Chalk's pointer code at 57495-57560 — frac(), setPointerCapture, clamp01, and the explicit no-repaint-during-drag rule. This is the hardest part of the build and it is already written and shipped · walk_shots' overlay discipline — normalized fractions, marks stored as data, never burned into the artwork · The build-555 crew Work Order generator at 17237 + WO_TRADES at 17078 — the map rides inspection_reports, the existing editor and the existing @page Letter path. No fourth document type · api/notify.js for the submit push; api/senddoc.js for anything emailed · cr-show module shape; hideAllViews/navRestore/navSetView; the shared overlay list at 53034

**⚠️ Risk.** Unassisted completion. Honest guess is well under half, and design cannot fix it. It lives or dies on WHO fills it in — a commission rep at the close is closing and leaving; Curtis or Scottie on the confirmation call two to five days out is already asking about gate codes and dogs, and is the one who eats the damage. And "you didn't flag it" must never become Cardinal's defence — that wording is a business decision, not a design one, and Theo writes it himself before this ships.

---

### 4 · FIFTEEN WINTERS ⚡ **CLIENT ENGAGES**

> Five calls. Make the call, then watch fifteen Ohio winters happen to it.

**Concept.** Five myths, printed in the words a homeowner actually uses. Two illustrated options. You call it. Then instead of correcting you with a paragraph, the page BUILDS the shortcut in a line-drawn section and runs a winter counter from 01 to 15 in about four seconds: granules go, a fastener backs out, ice forms a flat lens at the eave, one thin red line of water crawls backward under the shingle course and down the inside of the wall, a dull stain scales up on the ceiling of a drawn bedroom. Beside it, framed identically, the Cardinal detail takes the same fifteen winters and does nothing at all. Five calls, chosen where a thin bid actually cuts: shingle over the old one · one row of ice barrier at the eave · a cut field shingle used as starter · four nails against six · the missing kickout. Plus ONE call where Cardinal's honest answer is "this one doesn't matter — don't let anybody sell it to you."

**The bold choice.** CONSEQUENCE IS ANIMATED, NEVER ASSERTED — and the page names itself after the thing that actually kills roofs here rather than after itself. Ohio's Table 301.2(1) puts the whole state in an ice-forming region; a Dayton roof is not tested by rain, it is tested by freeze-thaw at the eave. Every myth is settled in the same unit: what does this detail look like after fifteen winters? The verdict for a wrong call is MOST PEOPLE SAY THAT. Never "wrong," never a red X, and no score at all in present mode — nobody wants to be graded by their contractor in front of their spouse.

**What the client does.** Five binary calls, four seconds of payoff each, and a cumulative rail showing the roof they've assembled so far. Four minutes end to end. Alone on a phone the score is on; on a rep's iPad one flag turns it off everywhere.

**Interaction.** Tap a card and it expands IN PLACE — the two options don't disappear and nothing navigates, so there is no modal stack and no back stack to manage. The winter scrubber auto-runs once so the phone user gets the payoff without hunting for a control, then becomes draggable so a rep has a handle to drag while he talks. One rAF loop over four motion primitives (water = stroke-dashoffset, ice = a filled lens scaling, stain = one blob scaling, granules = opacity fade), driven from a per-figure keyframe table — so figures two through five are content, not code.

**Illustration.** Field-notebook cutaway. Three stroke weights, 45-degree hatch only, one solid fill (a paper-coloured occluder). Materials are drawn as notation, not texture: OSB is a line with random flake ticks, ice & water is a heavy line with a bead of half-circles on the adhesive face, synthetic is a long dash, felt is a short dash that visibly wrinkles. TRUE SCALE — one SVG unit is a quarter inch, so the 24-inch run is genuinely 96 units against a genuinely drawn 18-inch overhang and you can SEE that one course doesn't reach the wall line. CODE CITATIONS ARE CUT: the copy doc's own closing rule bans printing a statute or a code-mandated dimension on a client-facing page, this environment has no internet to verify one, and R905.2.5 is a string a homeowner can't evaluate, resents, and will never repeat.

**Cost.** 4 builds — and build ONE is a single call end to end. The kickout, because that's the frame where the water goes somewhere nobody can photograph. Build the keyframe engine with it and put it in front of Theo before anything else is drawn. If the drawing lands, the other four are roughly two hours each. If it doesn't, one evening spent instead of seven. Four of the five figures start from something already drawn: the eave ice-barrier plate at 4462, the ventilation figure at 4547, ice-dam formation at 5534, the pitch triangle at 6290.

**Reuses:** The four existing Cardinal Truth plates at index.html:4462, 4547, 5534, 6290 — same pen, inverted to white on black · fig-ink / fig-acc / fig-accw / fig-hair / fig-mask at 2802-2813, re-declared under the new mount with literal fallbacks (--ct-* is only 11% fallback-covered and is exposed) · proof() at 42115 for the answers. Not talkTracks() · cr-show module shape, the three registrations, the shared overlay list, the .cr-vh-tile front door builder at 41396

**⚠️ Risk.** Being quizzed by your contractor reads as condescending the moment one word slips, and a later copy edit is exactly how MOST PEOPLE SAY THAT turns back into WRONG. Bigger: this is the only direction that teaches a homeowner what to be afraid of. It sells hardest and calms least, and if it reaches a signed customer it is twelve — now five — ways their house can fail, catalogued, with no way for them to check whether theirs did. Send it BEFORE the signature, not after.

---

### 5 · TWELVE LAYERS

> Drag one line and your roof builds itself. The faded one below it is the cheaper option on your own contract.

**Concept.** One architectural section cut through a Cardinal roof — gutter and rafter tail at the left, deck and field and a roof-to-wall in the middle, ridge at the right — white ink on near-black. One control under it: a COURSE RAIL with thirteen detents, 00 through 12, monospace and numbered. Drag right and the roof builds itself in the real install order; drag left and it tears off. The gesture is the roof. Each detent fills a caption plate beside the drawing: what the layer is, what it does, and the CONTRACT ITEM NUMBER it corresponds to, so a homeowner can verify every claim against the paper in their hand.

**The bold choice.** THE GHOST ROOF IS CARDINAL'S OWN STANDARD COLUMN, NOT "THE OTHER BID." Ninety pixels below the Cardinal section, at 45% opacity in the identical geometry, runs what Option A on the same signed agreement actually installs. Item 2 is felt against synthetic — the same hairline with a hand-authored wobble in it, so the whole argument is carried by whether one line is straight. Item 4 is standard against OC ice & water. Item 6 is a cut field shingle against a purpose-made starter with the sealant band in the right place. Six nail heads landing inside the white SureNail band against four landing outside it — countable on screen, no caption needed. Per-layer the verdict reads MATCHED / DOWNGRADED / MISSING, because a headcount like "5 of 12" is visibly contradicted by a ghost that clearly has shingles on it. Retargeting this off the competitor removes the advertising-rules exposure, removes the attorney's ten minutes, makes every claim checkable against the contract, turns the rail into an upsell Cardinal makes margin on — and stops the page promising an all-OC roof to a homeowner who circled Standard and was never quoted one.

**What the client does.** Drags the rail. Taps a labelled part in the drawing to jump to it — the section is the navigation, not just the output. One toggle: ghost on/off.

**Interaction.** State is ONE dataset attribute per detent, guarded string against string, and every reveal is CSS ([data-layer="4"] .L05{opacity:0}). No paint loop, no innerHTML rewrite, nothing added to the 50 document.body observers' workload. Tap targets are invisible 44px rects over the labelled parts — a 2px stroke is not a touch target, and jsdom will never notice if those get dropped. Phone swaps to three swipeable plates (EAVE / FIELD & WALL / RIDGE) via one setAttribute('viewBox') on a matchMedia change — same paths, zero duplicate markup.

**Illustration.** A drafting plate, not an illustration. Three stroke weights and nothing else. Hatch IS identity: OSB is a field of scattered flecks, ice & water is a solid 6px cardinal band (it should look like the most expensive thing on screen, because it's the line an adjuster strikes first), synthetic is a regular 45-degree cross-weave, felt is that same hairline wobbling in one direction, metal is the only element with no fill at all — a line that turns 90 degrees and comes back on itself. THE FIELD STACK IS GENERATED AT MOUNT, not hand-authored: twelve offset polylines emitted from one rake line and a thickness array with a seeded PRNG. Hand-authoring twelve accumulated perpendicular offsets is where the arithmetic goes wrong and where the stack visibly delaminates, which is the one failure a homeowner notices instantly. Hand-draw only the eave, ridge, kickout, boot and valley.

**Cost.** 3 builds. Module, rail, caption plates (1). Generated stack plus the hand-drawn details (1.5). Ghost variants and gates (0.5). ~35KB with the generated stack rather than 55-70 hand-authored. No SQL, no RLS, no API, no client data, no new dependency. Product names and spellings come verbatim from ROOF_AGREEMENT_BODY at 9095 — not the Library and not memory. Only "OC Starter Plus" is actually in the contract; the Library says "WeatherLock or equivalent," and the contract spells them "Pro Edge" and "Decoridge."

**Reuses:** wireSlider() at 56723 — copy the shape, it closes over its own el. Add a round-and-clamp to 13 detents, which the continuous original doesn't have, and aria-valuemin/max/text on the track · ROOF_AGREEMENT_BODY at 9095 — the 13-item Project Specifications list IS the rail; render from it so the drawing can never drift from what the client signs · fig-* conventions at 2802-2813; the eave plate at 4462 and the ventilation plate at 4547 as literal reference drawings · cr-show module shape, three registrations, shared overlay list, the .cr-vh-tile front door

**⚠️ Risk.** On a job where Standard got circled, this shows that homeowner the roof they didn't buy. That's a good upsell before signature and a grievance after it. Either gate it to pre-signature use or add a mode that renders only their circled column. Theo has to answer that before it's built, because it changes the caption copy on every one of the twelve.

---

### 6 · EVERY LINE

> Your roof, printed like a receipt — and a third of it costs you nothing.

**Concept.** One continuous paper-white receipt tape unspooling down a black screen. Monospace, tabular figures, dot leaders, section subtotals, a perforated tear edge, a barcode. Every stage of the job prints as a line, sectioned like a till roll: BEFORE WE START · TEAR-OFF & DISPOSAL · THE DECK · THE SYSTEM · LABOR · CLOSE-OUT. And roughly a third of the tape prints at $0.00 — not omitted, not folded into overhead. Printed, with the price, at zero. Attic inspection, decking checked from underneath. Pre-install call, three days out. Sprinkler head and septic lid walk. Plywood over the AC condenser. Tarps over the plantings you pointed at. Photographs of the bad wood, before it's covered. Written change order, approved before we cut. Second magnetic sweep, driveway and gravel. Warranty registration with Owens Corning.

**The bold choice.** THE MONEY IS GONE, AND THAT MAKES THE ZEROS LOUDER. No dollars, no percentages, no squares input, no subtotals, no total, no hand-authored split for Theo to own and defend forever. With every other price removed the $0.00 lines become the ONLY numbers on the tape, and a column of nothing but zeros running down a receipt is a far stronger image than sixteen percentages with nine zeros mixed in. Then ONE switch — WITHOUT IT — draws a red rule across every line a thinner scope deletes, and it strikes the free lines too. The cheap version doesn't save you money on the free things. It just stops doing them. Each struck line pairs with what leaks and when, in craft language, no section numbers.

**What the client does.** Taps a line and it unrolls in place. Flips the switch. And moves the ONE number left on the page: a deck stepper at 0 / 4 / 12 / 24 sheets of OSB, in its own row, under the sentence "This is the only line here that can move. The per-sheet price was set at signing, before anybody opened your roof." That number is already in the contract and Theo already defends it. Rot is the angriest call of the whole job and this answers it mechanically, with a control the homeowner operates themselves.

**Interaction.** Scroll is the tape feeding — the tape column is fixed width and the ground behind it moves at a different rate, pure CSS, no scroll listener. Accordion, one open at a time, rows at 56px. Strike animation is a printer pass, 40ms stagger per row, inside a no-preference block. Nothing else moves.

**Illustration.** Thermal print, 1-bit, as though the same receipt printer drew everything. Pure stroke, no fill, 45-degree hatch for shading, one paper-coloured occluder for overlapping planes. Paper is #F4F1EA with #1A1614 ink on a #0B0D0C ground, and that departure is stated in the banner or the next session "fixes" it — the Showroom is blackout because it's photographs and photographs want a dark room; this is a document, and a document is paper. It's an object in the scene, not a theme, which also means there is no light twin to build. Perforation, barcode and the rotated NOT INCLUDED stamps are CSS gradients and borders, no images.

**Cost.** 2 builds. Tape, sections, tap-to-expand (1). Strike switch, stamps, deck stepper, gates (1). ~40KB. No SQL, no RLS, no API, no client data — and, because the money came out, NO BLOCKING INPUT FROM THEO. That is the entire reason to cut it: the sixteen-percentage version couldn't start without him, couldn't stay correct without him, and couldn't be delegated.

**Reuses:** proof() at 42115 — the permit, the magnetic sweep, both warranties and which one matters, full tear-off no layovers, ice & water to the wall line, synthetic not felt, new boots. This is the tape's content, already written in Theo's voice · ROOF_AGREEMENT_BODY at 9095 — the system section renders from the contract so it cannot drift · .cr-cth-stage .amt / .amt.zero at ~44210 — the app already has a money-by-stage row with tabular monospace and a distinct zero treatment. Borrow its proportions · cr-show module shape, three registrations, shared overlay list, .cr-vh-tile front door · fig-* conventions at 2802-2813 for the small section figures inside expanded rows

**⚠️ Risk.** Sixteen rows of monospace on a phone is a wall of accordions nobody opens. The closed state — label, zero, one clause — has to carry the argument on its own, because if it doesn't sell, the open state never gets opened. Secondary: the $0.00 lines tip into sanctimony the moment the copy congratulates itself. "Second magnetic sweep — $0.00" works. "Second magnetic sweep — because we care — $0.00" doesn't. Five words per zero line, and let the zero talk.

---

### 7 · ONE DRAWING

> One drawing of a house. Five acts. Scroll, and the roof gets built on it.

**Concept.** The full journey — the page you actually asked for, and the only one of the eight that answers all twenty of your points. One hand-drawn architectural section: cut through the eave, the wall, the attic void and the ridge, plus the property around it — driveway, street, shrub bed, sprinkler head, septic lid, condenser. It is drawn ONCE and stays on screen for the whole read. Scrolling does exactly two things: moves a camera across that drawing, and lands more ink on it. Five acts, twenty-five stages, built from ROOF_JOURNEY_COPY.md exactly as it is written — Headline · Body · WHAT TO LOOK FOR · The honest part. Not ten invented chapters on an invented schema, and not twenty-five fabricated homeowner anxieties in quotation marks; "the honest part" already does that job and it's already approved.

**The bold choice.** THE PAGE NEVER SHOWS A SECOND PICTURE. Ten separate illustrations cross-faded would be far easier and completely forgettable. Committing to one continuous drawing means every act has to be spatially true to every other act — the attic you look into in Act One is the same attic the ridge vent exhausts in Act Four, in the same place at the same scale. That constraint is what makes it feel like a real object instead of a slideshow. The closing shot: the very last stroke to land on the entire page is the ridge cap. It draws in red, holds 600ms, then settles to white ink like everything else.

**What the client does.** Scrolls. Zero taps required for the whole read, which matters when an iPad is handed across a table and nobody wants to be taught an interface. Optional: tap a layer in Act Four to isolate it, and jump acts from a vertical drafting scale on the left.

**Interaction.** One IntersectionObserver for act entry (the first in this file — IO doesn't touch the document.body observer path) and one rAF-throttled scroll handler that writes exactly two things: the interpolated viewBox and one custom property. Everything else is CSS reading that property. Guarded on a stored signature, not a live compare. Under reduced motion the camera CUTS at act boundaries and every layer is simply already drawn — the story is identical, only the transitions are gone.

**Illustration.** Hand-drafted line work in negative — white ink on near-black, which is a blueprint in the literal sense, not a dark-mode conversion. Three weights and no more: 1.75px structure, 1px dashed 4-3 hairline for dimension and hidden geometry, 5px accent that only ever marks the one thing the current act is about — one red stroke on screen at a time for the entire read. DELIBERATE IMPERFECTION IS BAKED INTO THE PATH DATA: every long straight run is authored with three to five intermediate vertices offset ±0.6 units perpendicular. Not a filter — jitter written into the d attribute at authoring time, so it stays crisp at any camera zoom because it is still vector. That single decision is the difference between an architectural drawing and clip art, and it is where the authoring time actually goes.

**Cost.** 5 builds, honestly, and three of them are drawing. Do NOT author 1600x1000 of path data on spec: draw the Act Four eave plate alone, render it dark on a real phone and a real iPad, put it in front of Theo, and commit nothing else until he says yes. The prose is transcription and cutting from a document that already exists and is already voice-checked; the drawing is not. What got fixed from the first version: every stage carries a plain schedule line ("Day 1 of 1. Tear-off starts about 7. Crew gone by 3") because the page currently refuses to answer the first question anyone has; the dog, the gate, the beds under the eave and what happens if it rains mid-tear-off are ON the scroll spine rather than behind a tap; five camera stops instead of ten; and Cardinal's name and phone number sit in the footer of every act, because a page built to reduce calls with no way to call is quietly telling the reader not to.

**Reuses:** ROOF_JOURNEY_COPY.md — 1,368 lines, 25 stages, five acts, four-part cards, already through a verification pass with Theo. This is the content and it exists · proof() at 42115. Explicitly NOT talkTracks() at 42089 — that is rep coaching ("put the estimate face down," "three findings is the number") and this is the one page designed to be forwarded to a spouse · ROOF_AGREEMENT_BODY at 9095 — Act One and Act Five render from the contract so they can't drift · fig-* at 2802-2813 plus the four shipped plates at 4462, 4547, 5534, 6290 as geometry seeds · cr-show module shape wholesale; hideAllViews/navRestore/navSetView; the shared overlay list at 53034; the .cr-vh-tile front door at 41396

**⚠️ Risk.** It is the only direction that answers the whole brief and the one that bets most on a drawing nobody has seen. If the line work lands at 80% it reads as clip art on a trust page and no amount of correct copy rescues it. It is also where TWELVE LAYERS is the natural Act Four instrument — if you pick both, they are one build path, not two, and #5 should be built first as that act's centrepiece.

---

### 8 · THE DRIVEWAY TEST

> Stand at the curb and check any roof in Ohio in four minutes. Including ours.

**Concept.** The only page here that arms the homeowner instead of reassuring them. Six things you can see from the ground on a finished roof, each a right-versus-wrong pair with a wiper between them. Sight along the very bottom edge of the roof: if you see small evenly spaced notches, roughly one every foot, at perfectly regular intervals, that's a 3-tab shingle cut up and used as starter. A purpose-made starter is solid. It has no notches, ever. The regular spacing is the tell — damage is random, manufacturing is not. Zoom in with your phone. Then the same move for hip-and-ridge cut from 3-tab, for the missing kickout at the corner where a roof meets a wall, for step flashing caulked over the siding instead of woven under it, for a ridge vent sitting over painted-shut soffit intake, and for drip edge that stops short at the rake. You starred points 5 and 6 yourself and called them enormously persuasive. They are the only content in the whole brief a homeowner can physically verify, and no other direction can hold them — a hero cutaway structurally cannot show the wrong version beside the right one, because the comparison IS the content.

**The bold choice.** IT WORKS ON EVERYBODY'S ROOF, NOT CARDINAL'S. The page doesn't argue that Cardinal is better. It teaches you to look, hands you the test, and lets you walk down your own street tonight and reach your own conclusion. Every other direction says trust me and then shows you why. This one says go check, and a company that gives you the tool to audit it with is not selling you. It is also far harder for a competitor to copy than any drawing, because copying it means inviting the same inspection.

**What the client does.** Reads six short pairs and wipes each one. Then goes outside. Deliberately no state, no score, no login, no checklist, nothing collected — the action is off-screen, and that's the point. Four minutes on the page, ten minutes in the driveway.

**Interaction.** One wiper per pair, and that is the entire interaction budget. It is the shipped Showcase compare slider, unmodified in shape, with two line plates instead of two photographs. Zero new mechanisms, which on this codebase is the whole argument.

**Illustration.** The cheapest drawings in the set, and the reason this ships first. Six PAIRS at the scale the file already proves — Plate 2 at index.html:4462 is nine paths and it works. A cut 3-tab beside a solid starter is two eave profiles and a notch pattern. A kickout is a folded line and two water arrows. Step flashing woven versus caulked is four strokes each. These are 7 to 15 path figures, not 900-command scenes. Same pen as the existing plates — 1.75px, round caps and joins, fill:none, three weights, zero gradients — inverted to white on #0B0D0C. One red stroke per plate, on the thing you're being told to look at.

**Cost.** 1 build. Roughly 6 to 8 hours, of which 3 to 4 is drawing twelve small plates. ~18KB. No SQL, no RLS, no table, no token, no API, no percentages, no code citations, no client data, no static asset (so no sw.js cache bump), and no blocking input from Theo. It is the smallest real deliverable on this list by a wide margin.

**Reuses:** wireSlider() at index.html:56723 verbatim in shape — including the 592 pointercancel release and the 578 inner-button pass-through, both bug fixes somebody already paid for · ROOF_JOURNEY_COPY.md's "What to look for" sections — line 221's attic self-audit and line 331's ⭐ ten-minute ventilation audit are written, approved, and in Theo's voice. This is transcription, not authorship · Plate 2 at index.html:4462 as the literal scale and density reference; fig-ink / fig-acc / fig-hair / fig-mask at 2802-2813 · cr-show module shape: undeclared 100%-fallback token family, no scroll-lock write, Object.assign export, 44px targets, reduced-motion block, committed dark stated in the banner · hideAllViews() 14996 + navRestore() 20810 + navSetView; the shared overlay list at 53034; the .cr-vh-tile front door builder at 41396, which already solves the #landingView>*{display:none} trap

**⚠️ Risk.** It teaches a homeowner to inspect, and the first roof they will inspect is Cardinal's own finished one. That is a feature only if the work is right every time, on every crew, including the subs. Theo should answer that question out loud before a line of it gets built — if the answer is anything but a flat yes, this is the wrong direction, and knowing that costs nothing today and a great deal later.

---

## Ship first: #8

THE DRIVEWAY TEST — one build, about six hours, and it is the only thing on this list that ships this week. But the real reason is that the other seven all bet two to five sessions on hand-drawn line work nobody has seen yet, and this one bets four hours. Twelve small plates at the density the file already proves (Plate 2 at index.html:4462 is nine paths and it reads) is the go/no-go on the pen. If they land as Cardinal drawings, ONE DRAWING and TWELVE LAYERS unlock and these plates get reused inside them — so it is not a detour, it is the first asset. If they land as clip art, that is one evening spent instead of three sessions, and the answer arrives before anything is committed. It also carries the two points Theo starred himself and that no other direction can structurally hold, needs no SQL, no RLS, no token, no percentages and no decision from him to start, and it is the only page here that arms the homeowner rather than reassuring them — which is the version of honesty that costs Cardinal nothing to keep. Then build #7 ONE DRAWING as the spine, with #5 TWELVE LAYERS as its Act Four.

## What was cut, and why

CUT 1 — THE CUTAWAY (isometric dollhouse, four quarter-turn faces). Lowest scorer, and the cost is in the wrong place: four hand-authored dimetric elevations held consistent across a ten-stage state matrix is roughly 4x the drawing budget for an argument the section pages make better and cheaper. All three critics independently said reduce it to one face — and one face is #7. Its Yard face duplicates #3 THE FLAG RUN, and it structurally cannot show a right-versus-wrong pair, which is the starred content. The one genuinely original idea (the quarter turn changes whose problem you're looking at) is not worth 4x the drawing.  CUT 2 — THE CHALK LINE (one gesture, whole job morphs). Same gesture, same payload and the same schedule risk as #1, with none of the noise axis or the plain-answer rows. Its estimate was the most understated of the ten: 60-90KB of morph-coherent path data against a file whose largest-ever SVG is 6,711 bytes and whose entire 98-figure corpus is 34.9KB, with no drawing tool and every revision landing through exact-match splices. Its author said it plainly — the drawing is the project and there is no fallback — and Theo cannot art-direct that from a phone. Its two best ideas are NOT lost: debris conservation (everything that leaves the roof arrives in the trailer, driven by the same number) and the magnet erasing nail ticks one at a time are both stolen into #1.

## What was merged

MERGED — ONE LOUD DAY (soundmap) + THE DAY (dayof) into a single #1. They were the same page: install day, 6:30am to dusk, drag the hour, watch the roof come off and go back on, with a status readout that answers "can I work from home Tuesday." soundmap contributed the noise axis as the scrub track and the two-column decibel bet; dayof contributed the three status pills, the sky-and-shadow day sweep, PLAY THE DAY and the pre-6:30 "what your yard should look like" frame. Keeping both would have given Theo two picks that differ only in whether the timeline is drawn as a chart or a rail. The merge freed the slot that #8 THE DRIVEWAY TEST now occupies — which is the direction that holds the two points Theo starred hardest and that none of the original ten could carry.

---

## Open questions — Theo's to answer, not mine

- DELIVERY. The app boots to a signed-in session; the only pre-auth paths are api/share.js and api/clientsign.js. So "just text them a link" does not exist yet. Every client-facing direction here needs one of two things decided first: (a) a token route in the api/share.js pattern, or (b) an allowed pre-auth hash into index.html. Pick one — it blocks #1, #2, #3, #4, #6 and #8 equally, and it is one decision, not six.
- THE SPL MORNING. #1 ONE LOUD DAY needs one crew lead, one free phone app, one morning, ten readings on a real job — driveway at 7am, kitchen during tear-off, top-floor bedroom, kitchen at 2pm. Yes or no? If no, #1 is a nicer chart than the competition's and should be scored that way.
- #5 TWELVE LAYERS: is showing a customer who circled Standard the roof they didn't buy an upsell you want, or a grievance you don't? Answer changes the caption copy on all twelve layers, so it comes before the build.
- #8 THE DRIVEWAY TEST arms every customer to inspect Cardinal's own finished roofs with a phone camera. Flat yes, or not at all?
- #3 THE FLAG RUN: who actually fills it in — a commission rep at the kitchen table, or Curtis and Scottie on the confirmation call two to five days out? The whole adoption case rests on this and it is not a design question.
- LIABILITY WORDING on #2 and #3. "You didn't flag it" must never be Cardinal's defence. You write that sentence, not us, and it ships in the same PR.
- THE WHOLE BOOK OR ONE INSTRUMENT? #7 answers all twenty of your points and costs five builds with three of them drawing. #1, #5, #6 and #8 are single instruments at one to three builds each. Those are different asks and it's worth saying which one you actually want before anyone draws.
- CONFIRMING: talkTracks() at index.html:42089 stays rep-only, forever. More than one plan proposed shipping it to homeowners verbatim as "approved copy." It contains "then stop talking — the first person to speak after the ask usually loses" and "three findings is the number, one sounds thin, five sounds like you're padding." proof() at 42115 is the homeowner-safe half.

