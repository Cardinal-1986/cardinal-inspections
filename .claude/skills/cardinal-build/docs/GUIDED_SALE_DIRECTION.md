# Guided Sale — Product Direction (Theo, 1 Sep 2026)

*The standing record of Theo's Slice-1 authorization and the north star he set for
everything after it. The audit is `GUIDED_SALE_AUDIT_2026-09.md`; this file is what
was DECIDED on top of it. Sections marked **FUTURE** are specification, not backlog —
do not build them without his go, and do not let today's architecture close their door.*

---

## THE OVER-THE-SHOULDER TEST (Theo, 1 Sep 2026 — governs ALL homeowner copy and UX)

**The homeowner-facing experience must never feel like a sales funnel, scripted close,
qualification flow, or digital sales trainer.** The hierarchy is: INFORMATIONAL /
EDUCATIONAL / PRESENTATIONAL first · CONSULTATIVE second · SALES MECHANICS mostly
invisible underneath. The homeowner should feel *"Cardinal is helping me understand my
home and make a good decision"* — never *"Cardinal is walking me through a sales
process."* The center of gravity is **their home → what we found → how the system
works → why it matters → possible solutions → design/visualization → clear options →
decision** — not question → commitment → pitch → close. The 10-step sales intelligence
stays, private to the rep, invisible to the homeowner.

**The test:** if a homeowner looked over the rep's shoulder, would this feel like an
elegant consultation/presentation about their home — or like sales software? It must
be the former. Concretely banned from homeowner surfaces: process narration ("this
shapes the visit", cost sequencing talk), form-UX narration (tap-by-tap instructions),
qualification rationale ("this changes what we recommend"), persuasion glosses,
artificial commitments, closing language. Discovery stays conversational, lightweight,
visual, fast — the Welcome is the title page of a consultation about THEIR home
(address as the headline, "Prepared for…"), not the opening of a pitch.
`gate_1192`'s process/persuasion floor holds this mechanically (1193); extend the
floor when new copy classes appear — a check, not a paragraph.

## Decided for Slice 1 (shipped: 1191 behavior + 1192 visual language + 1193 tone)

1. **The prototype's BEHAVIOR is source of truth; its Blackout skin is not.** The
   production homeowner language is warm, architectural, residential, photography-led:
   warm whites, soft neutrals, restrained cardinal red, exceptional type, generous
   whitespace, subtle depth, restrained motion. Dark scenes are allowed *selectively*
   when they strengthen a moment — never as the universal ground. **Rep-facing UI may
   stay darker/utilitarian: HOMEOWNER = premium presentation environment, REP =
   private working environment.** Neither becomes conventional dashboard UI.
   (1192 implements this as `#cr-appt.gs-lit` — the light canvas on discovery, resume
   and the shield; the picker, quick-create and the rail stay dark.)
2. **Discovery is a conversation, not a form.** Welcome establishes "this is your
   Cardinal appointment," with the customer's name and context. Why Now / Priorities /
   Home Plans are large tactile choices a homeowner can physically tap.
3. **Persistence (his §4):** `checklist.guided.*` is the **v1 storage location**, not
   the permanent semantic home. Why-now, priorities and horizon describe this
   *appointment/opportunity* as much as the customer. `guided.v = 1` marks the shape
   so a later `guided_sessions` (or per-appointment) store can find and migrate it.
   Same-iPad resume is sufficient; **do not create `guided_sessions` yet.**
4. **Quick-create:** the existing chokepoint, connected only. The offline-create
   deferral stays settled — no placeholder IDs, no second create mechanism.
5. **Empty content (his §6):** auto-skip unavailable homeowner-facing chapters; the
   rep sees them dimmed; the homeowner never sees an empty room or internal copy.
6. **Price (his §7):** no dollar figure before the intentional Price/Options stage.
   Monthly-payment framing may appear at Price but must not obscure the project price.

## Decided at Slice-1 approval (Theo, 1 Sep 2026 — post-1193)

- **Slice 1 behavior and architecture: APPROVED.**
- **Do NOT propagate the light language into later chapters yet.** The warm-light →
  dark crossover is an **intentional presentation transition**, not a defect:
  **warm/light** = conversation, discovery, homeowner participation, their goals and
  home; **dark/focus** = inspection evidence, immersive/cinematic presentation, the
  moments where the room should visually quiet down. Later work may make the
  Plans → Roof shift *composed* (e.g. a deliberate "Let's look at your roof" beat)
  rather than incidental — that larger transition is NOT Slice-1 work.
- **Welcome's type-only treatment is an accepted engineering state, not the final
  bar** — production Welcome eventually carries strong premium imagery / customer-home
  context.
- **Auto-skip is confirmed correct. Never manufacture placeholder Showcase/Walk
  content merely to keep chapters visible.**

## Decided direction (build later, on his go)

7. **Good/Better/Best (his §8):** eventually a proper interactive homeowner-facing
   selector; the selected tier is persisted; the contract remains the contractual
   acceptance. The PDF sheet is never the primary interactive selector.
8. **Ghost/Standard comparison (his §9): pre-signature only.** After yes, comparative
   selling stops — the tone turns from "why choose this" to "here is the project we
   are about to deliver."
9. **Ventilation recommendation (his §10):** inspection evidence → system-derived
   recommendation → **REP CONFIRMS** → homeowner sees recommendation + explainable
   reason. A person owns the recommendation, always.
10. **Owens Corning (his §11):** never block on OC artwork; text-only status until
    official art + approval + the disclaimer decision. Never recreate or crop marks.
11. **What Happens Next (his §12):** no operational promise goes homeowner-facing
    until the real Cardinal process/order is approved; no Certificate of Completion
    until the capability actually exists.
12. **Pop-Up Roof (his §13):** an OPTIONAL specialist experience a rep chooses for
    the right customer — never auto-shown, never the visual basis for mandatory
    Guided Sale education. Its content is reference material; its storybook language
    must not constrain the production experience.

## FUTURE — Understand Your Roof: the 3D north star (his §§14–32)

**One ultra-realistic interactive 3D residential property** — not cartoons, cards,
game UI or SVG slideshows. Photorealistic architectural/product visualization for a
kitchen-table iPad. The same digital property transforms (rather than slide-switching)
to teach: the roof system, ventilation, storm/hail, collateral inspection, shingle
condition mechanisms, and inspection-evidence storytelling.

- **One property** (his §15): house, full roof assembly, attic, siding, windows/
  screens, gutters/downspouts, flashing, penetrations, vents, A/C, driveway, vehicle,
  landscaping, believable environment.
- **Teaching spine (his §16): CAUSE → CONSEQUENCE → CORRECTION → YOUR HOME.**
  Simulation teaches the mechanism; **actual Cardinal photos/video/measurements and
  rep-confirmed findings establish what was observed.** The SIMULATION vs EVIDENCE
  line must be unmistakable — photorealism is never presented as their property.
- **Camera grammar (his §17):** HOMEOWNER VIEW (where on the property) → PHYSICS VIEW
  (macro/cutaway mechanism) → INSPECTION VIEW (the inspector's viewpoint) → YOUR HOME
  (their evidence). Rhythm: MOVE → SETTLE → REVEAL → EXPLAIN. Art-directed viewpoints
  (hero exterior, roof overview, eave, soffit intake, attic wide, ridge exhaust,
  valley, chimney/wall flashing, penetration, deck, exploded assembly).
- **Transitions (his §18):** never snap between major viewpoints; Quick ~0.5–0.8s /
  Guided ~1.3–2s / Cinematic ~2.5–4s. Quality from geometry, materials, lighting,
  composition, easing, timing, sound — not heavy blur.
- **Hailstorm (his §§19–21):** daylight → storm builds → short intense hail with
  per-surface sound signatures → the storm ends → light returns over the wet property
  ("chaos → quiet → inspection"; possible line: *"The storm is gone. The evidence
  remains."*). A human figure only if it meets the photorealistic bar — otherwise omit.
- **Ground-first inspection (his §§22–24):** collateral before roof — vehicle, siding,
  screens, A/C, downspouts, gutters, soft metals, vegetation. Teach patterns and
  corroboration, never that one observation proves roof damage. Physically connect
  ground → roof (e.g. camera travels a downspout up over the eave).
- **Hail micro-sequence (his §25):** follow one stone, time slows near impact, macro
  at the shingle plane, credible material response, arc to top-down inspection view,
  then transition to actual homeowner evidence. No exaggerated explosions.
- **Aging / thermal / blistering (his §§26–29):** brittle-shingle education names
  multiple contributors (never "ventilation causes brittleness"); thermal cycling via
  time compression; blister buildup slow, rupture fast, settle on localized granule
  loss; then the comparison lesson — hail vs blister vs aging vs mechanical look
  similar and need professional evaluation. Simulation is education, not diagnosis;
  actual evidence is required before saying *their* roof is brittle.
- **Ventilation experience (his §30):** the same property's attic cutaway — intake/
  exhaust/balanced/mixed/short-circuit, plus heat, moisture, condensation, wood
  deterioration risk, microbial-growth conditions, insulation/air-sealing, ice-dam
  contributors, thermal stress. Claims stay technically defensible.
- **What's Under Your Shingles (his §31):** the roof itself peels/reveals/explodes/
  rebuilds on the photorealistic property; per component: what it is → what it does →
  what happens when it fails/is absent → how Cardinal handles it.
- **What Happens After You Say Yes (his §32):** 3D only where it helps; favor real
  Cardinal photography/video; after agreement, stop selling.

## FUTURE — the 3D technical spike (his §§33–34), AFTER Slice 1 approval

Evaluate Three.js / WebGL–WebGPU, optimized GLTF/GLB, PBR, HDR lighting, LOD,
compression, GPU particles, restrained post; **primary target iPad Safari** —
performance, memory, battery, thermal. Evaluate a **hybrid strategy** (pre-rendered
cinematic scenes + realtime inspection) rather than deciding from theory.
**Engine work ≠ asset work:** final quality needs professionally modeled GLB,
PBR materials, HDR environments and real Cardinal media; placeholder geometry is for
spikes only, never the final standard.

## The standing review bar (his §§35–37)

Every slice: real-Chromium inspection at iPad landscape with screenshots; functional
proof including the **real interruption drive** (answer → advance → reload/reopen →
Resume → exact answers, exact position); gates that can go red against the
predecessor; standing regression + sentinel coverage; then STOP and report — files,
persistence semantics, resume, quick-create online/offline, boundary changes, gate +
control + sentinel results, screenshots, compromises, and anything that should change
before the visual language propagates further.
