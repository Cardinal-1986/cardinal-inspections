# Cardinal Roof System — Production Readiness Matrix

*"What's Under Your Shingles?" · final truth closure and production-readiness gate · 6 Sep 2026.*
*Research and reconciliation only. No geometry, material, texture or Blender asset was created;
no production file was opened or modified; M1/H1/T6/R1/R2/P4 and House 13 were not touched.*

---

## 0 · Scope, inputs, and what this document could and could not see

**Inputs treated as Cardinal field truth (Section 1 of the brief) and as prior-gate truth (Section 2)
were taken as given.** They are not re-researched here. Where this document says CLOSED on a
manufacturer or geometry point that the brief already listed as established, that is preservation,
not a fresh finding.

**What this repository holds, and what it does not.** The prior gate documents named in the brief
(M1, H1, T6, R1, R2, P4, the House 13 condition inventory, the KV68 gate result, the ACM catalog
drawings) are **not in this repository** under those names — grep for every product SKU in the brief
(`14LTUPF200`, `14LTES300`, `17LOKV68BK`, `ADE15DS`, `AGA20DS`, `AGA20ST`, `AGA15BK`) returns
nothing, and neither do "House 13", "EasySleeve", "RhinoRoof Granulated" or "DeckDefense". They live
in the modelling workspace, not here. Consequently:

- **The House 13 condition inventory was not available.** Every House 13 applicability cell that
  depends on a roof condition is marked **HOUSE 13 APPLICABILITY — OPEN**, exactly as the brief
  instructs. Nothing condition-dependent was assumed present.
- What the repository *does* hold, and what this document reconciles against, is Cardinal's own
  record: the signed roofing agreement's 13 Project Specification rows (`scripts/roof_body.py`, the
  source of `ROOF_AGREEMENT_BODY`), the aluminium trim colour list Theo chose at build 750
  (`TRIM_COLORS`), the Roof Journey copy (`ROOF_JOURNEY_COPY.md`, stages 14–21), the Twelve Layers
  spec (`ROOF_JOURNEY_DIRECTIONS.md` #5), the Guided Sale audit's G-B section and Theo's direction
  doc, the popup's water-layer order (build log, spreads 8–11), the Resource Library's drip-edge and
  kick-out corrections (build log, the 12-inch fastening correction and the R903.2.1 wording), the
  OC Total Protection wind-warranty condition (builds 621–623), and the `oc_colors` catalog rows for
  Mountain Pine and Black Sable.
- **`index.html`, `popup.html` and the other shipped artifacts were not opened.** Everything cited
  from them comes through the build log, `FEATURES.md`, or the patch scripts that generated them.
- **Manufacturer domains are blocked by this session's egress proxy** (owenscorning.com,
  lifetimetool.com, acm-metals.com, roofingdirect.com all refused). Verification therefore came from
  search-engine summaries of manufacturer pages plus distributor data sheets and listings. Figures
  from that route are labelled **HIGH-CONFIDENCE OBSERVATION**, never FACT, unless the same figure
  is also in the brief's own closed inputs.

**Status vocabulary** (the brief's): CLOSED · CLOSED WITH CALIBRATION LATER · OPEN — INTERNAL
CARDINAL EVIDENCE · OPEN — MANUFACTURER EVIDENCE · NOT APPLICABLE · HOLD.
**Readiness vocabulary** (this document's, for the last two columns): READY NOW · READY —
CALIBRATE LATER (architecture-ready, sample calibration before the final manufacturer-faithful
pass) · HOLD — HOUSE 13 (product truth ready, House 13 use unproven) · HOLD.
**Evidence vocabulary** for every unresolved point: FACT · HIGH-CONFIDENCE OBSERVATION ·
INFERENCE · RECOMMENDATION · UNVERIFIED.

---

## 1 · Executive production-readiness verdict

**The roof system is sufficiently closed for a controlled production material/geometry pass on the
components that every Cardinal roof carries, and it is not closed for House 13 integration of any
component whose presence depends on a roof condition.** The two halves are separable, and the
brief's own applicability gate is what separates them.

- **Product identity is closed for all 23 named products/families.** Nothing in the reconciliation
  produced a contradiction that reopens Duration, Mountain Pine / Black Sable, Starter Strip Plus,
  ProEdge, RidgeProwler 30, the closed-cut valley, the 4 × 4 × 8 step flashing, Lifetime as the
  penetration family, KV68, ACM as the edge-metal family, or client-selectable edge-metal colour.
- **Geometry is closed or closable from manufacturer dimensions, manufacturer drawings, or parts
  Cardinal already owns** for everything except the kick-out (generic until a condition exists) and
  the chimney (no evidence House 13 has one).
- **Materials are architecture-ready across the board and manufacturer-calibrated nowhere.** That
  is the expected state: Duration, ProEdge, OSB, RhinoRoof Granulated, DeckDefense and the edge
  metals all want a physical sample before the final colour/roughness pass, and none of them wants
  one before modelling starts.
- **What actually blocks House 13 is one internal document: the condition inventory.** Roof form,
  guttered vs un-guttered eaves, rakes, valleys, sidewalls/headwalls, kick-out locations, the
  penetration list with sizes and pipe materials, chimney/skylights, ridge and hip lengths. Every
  remaining internal item (edge-metal profile pick, headwall profile, UPF size per stack, bath/dryer
  SKU and finish, EasySleeve need, valley liner) is answered by that inventory plus a purchasing
  lookup Cardinal can do in minutes.
- **No broad research is justified.** Three narrow manufacturer lookups remain, all calibration-
  level, all reachable from a normal browser: the current Duration instruction PDF (step-flashing
  sentence, closed-cut detail, course offsets), the RidgeProwler 30 instruction sheet (slot width,
  end treatment, NFA), and Lifetime's dimensioned sheets for the #300 UPF and the Bath/Dryer vent —
  or a tape measure on the parts Cardinal has already bought, which is faster.

**Two findings the brief did not list, both nonblocking and both worth fixing before captions are
written:** the app's own contract mapping and Library name **WeatherLock** as the ice & water product
while Cardinal's field truth is **RhinoRoof Granulated**; and the Roof Journey's Stage 15 copy
("before anything else goes down, new metal goes on the edges") is true at the eave and false at the
rake, where the drip edge goes over the underlayment. Neither changes a model; both would put a
wrong word on a caption plate.

---

## 2 · Master production-readiness matrix

Column key: **Field** = Cardinal field decision status · **Mfr** = manufacturer truth status ·
**Geom** = geometry status · **Mat** = material/finish status · **Seq** = installation-sequence
status · **Finished** = finished-state visibility · **H13** = House 13 applicability ·
**Ready** = production readiness · **Blocker** = remaining blocker.

| # | Component | Exact Cardinal product / family | Field | Mfr | Geom | Mat | Seq | Finished | H13 | Ready | Blocker |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Existing sound OSB deck | Existing OSB sheathing (generic; contract item 1B "inspect roof deck") | CLOSED | NOT APPLICABLE (existing generic material) | CLOSED (existing frozen House 13 roof planes) | CLOSED WITH CALIBRATION LATER (OSB strand face) | CLOSED (stage 0 substrate) | Fully concealed | CLOSED — every roof | READY NOW | none |
| 2 | Localized damaged OSB | Localized loss of strand cohesion (prior gate direction) | CLOSED (replace localized damage; contract concealed-conditions clause) | NOT APPLICABLE | CLOSED for an educational station (a region of one sheet); House 13 placement OPEN | CLOSED WITH CALIBRATION LATER (reference photo of real rot) | CLOSED (shown at deck stage, before edge metal) | Fully concealed (removed) | OPEN — INTERNAL (does the House 13 story include a replacement, and where) | READY — CALIBRATE LATER | narrative decision, not evidence |
| 3 | Replacement 7/16 OSB sheet | 7/16 in × 4 × 8 ft OSB, as needed | CLOSED | CLOSED (standard 48 × 96 in sheet, 7/16 in nominal — FACT) | CLOSED (sheet dimensions) | CLOSED WITH CALIBRATION LATER (fresh strand face vs weathered neighbours) | CLOSED (after tear-off, before edge metal) | Fully concealed | OPEN — INTERNAL (same as #2) | READY NOW | none |
| 4 | RhinoRoof Granulated | Owens Corning RhinoRoof® Granulated Self-Adhered Underlayment | CLOSED | CLOSED (36 in × 65 ft, 1.95 sq; granulated face; 3-in taped selvage; split release liner; ASTM D1970 pass — HIGH-CONFIDENCE, distributor data sheet) | CLOSED (36-in courses, 3-in selvage lap; eave run to ≥24 in inside the exterior wall line — R905.1.2, repo FACT) | CLOSED WITH CALIBRATION LATER (dark charcoal granule, smoother selvage) | CLOSED (eaves over eave metal; valleys; wall lines; before DeckDefense — prior gate) | Fully concealed | CLOSED — every eave; valleys/walls/penetrations per inventory | READY NOW | none (naming conflict with app copy — §8 C8) |
| 5 | DeckDefense | Owens Corning DeckDefense® High Performance Synthetic Roof Underlayment | CLOSED | CLOSED (42 in × 286 ft DD10 / 42 in × 143 ft DD05; grey sheet with bold graphic; TruTread™ textured face; preprinted nail pattern and overlap lines; polyolefin; mechanically attached; 180-day UV — HIGH-CONFIDENCE) | CLOSED (42-in courses; lap widths read from the printed lines — exact inch figure UNVERIFIED, nonblocking) | CLOSED WITH CALIBRATION LATER (current print graphic) | CLOSED (over the eave membrane, before rake metal and starter) | Fully concealed | CLOSED — every roof | READY NOW | none |
| 6 | Eave drip edge | ACM ADE family (e.g. ADE15DS), 0.019 in aluminium | CLOSED as a family; **eave drip edge applies only where an eave has no gutter** — the contract itself puts gutter apron at eaves (item 3B) | CLOSED (ACM catalog drawing — prior gate) | CLOSED from drawing; profile pick for House 13 OPEN — INTERNAL | CLOSED WITH CALIBRATION LATER (client-selectable colour; geometry separate) | CLOSED (first metal on; membrane over it) | Visible — face; flange concealed | OPEN — any un-guttered eave on House 13? | HOLD — HOUSE 13 (station READY NOW) | inventory + profile/colour pick |
| 7 | Rake drip edge | ACM ADE family, 0.019 in | CLOSED | CLOSED (drawing — prior gate) | CLOSED from drawing; profile pick OPEN — INTERNAL | CLOSED WITH CALIBRATION LATER (client-selectable colour) | CLOSED (over the underlayment at rakes, lapped over the eave metal at the corner — repo FACT via the Library card and popup order) | Visible — face | OPEN — only if House 13 has rakes (a hip roof has none) | HOLD — HOUSE 13 (station READY NOW) | inventory (roof form) + profile/colour pick |
| 8 | Gutter apron | ACM AGA family (AGA20DS, AGA20ST, AGA15BK), 0.019 in | CLOSED (contract item 3B: gutter apron at eaves) | CLOSED (drawing — prior gate) | CLOSED from drawing; which of the three codes for House 13 OPEN — INTERNAL | CLOSED WITH CALIBRATION LATER (client-selectable colour) | CLOSED (first metal at guttered eaves; membrane over it) | Visible — face above/behind the gutter; flange concealed | OPEN — every guttered eave (probable, unproven) | HOLD — HOUSE 13 (station READY NOW) | inventory + profile/colour pick |
| 9 | Starter Strip Plus | Owens Corning Starter Strip Plus Shingle | CLOSED (eaves + rakes; contract item 6B "OC Starter Plus") | CLOSED (7¾ × 39⅜ in pieces, two per perforated 15½-in shingle; 105 LF/bundle; continuous sealant at the edge; for exposures to 6 in — HIGH-CONFIDENCE) | CLOSED (piece geometry; overhang past the metal — exact figure UNVERIFIED, nonblocking) | CLOSED WITH CALIBRATION LATER (dedicated granulated starter, dark) | CLOSED (after rake metal, before the first course; eaves then rakes) | Mostly concealed (a sliver at the edge) | CLOSED — every eave and every rake present | READY NOW | none |
| 10 | Duration field shingles | Owens Corning TruDefinition® Duration® — Mountain Pine (hero), Black Sable | CLOSED | CLOSED (laminated fibreglass/asphalt/granule; SureNail® band; 5⅝-in exposure — HIGH-CONFIDENCE; instruction PDF blocked this session) | CLOSED (shingle and course geometry; offset pattern per instructions — HIGH-CONFIDENCE, verify verbatim later) | CLOSED WITH CALIBRATION LATER — **product-specific colour material per colour**; `oc_colors` holds only style-board-derived hexes for both (repo FACT), so a physical shingle is required before the final pass | CLOSED (course by course, bottom up, with per-course integrations) | Visible — dominant | CLOSED — every roof | READY — CALIBRATE LATER | physical Mountain Pine + Black Sable shingles (calibration only) |
| 11 | Closed-cut valley | Cardinal field method (closed-cut over RhinoRoof Granulated) | CLOSED (method) | CLOSED WITH CALIBRATION LATER (OC permits closed-cut; the exact cut-back and no-nail-zone figures are standard practice — HIGH-CONFIDENCE, instruction PDF blocked) | CLOSED WITH CALIBRATION LATER (cut line 2 in off the centreline — HIGH-CONFIDENCE) | NOT APPLICABLE (uses #4 and #10) | CLOSED (first plane runs across, second plane cut back) | Visible — the cut line; liner fully concealed | OPEN — only if House 13 has a valley | HOLD — HOUSE 13 (station READY NOW) | inventory; liner question (§8 C10) |
| 12 | Step flashing | 4 × 4 × 8 in pre-bent aluminium, black, from an 8 × 8 blank (ACM APSF family or equivalent stock) | CLOSED | CLOSED WITH CALIBRATION LATER (OC's own documents split 4 × 4 × 8 vs "10 in long" — §8 C1; IRC minimum 4 × 4 — FACT) | CLOSED (Cardinal field measurement) | CLOSED (functionally fixed black; mostly concealed) | CLOSED (one piece per course, over the wall-line membrane, under the cladding) | Mostly concealed (only the stair-step edge reads) | OPEN — only if House 13 has a sidewall | HOLD — HOUSE 13 (station READY NOW) | inventory |
| 13 | Headwall / apron flashing | Quality Aluminum / Gibraltar AWF and/or ACM ARTW family | CLOSED as a family; profile OPEN — INTERNAL | CLOSED for the family (ARTW drawing — prior gate) | CLOSED from drawing; selection OPEN — INTERNAL | OPEN — INTERNAL (fixed dark vs trim-matched — Cardinal practice not recorded) | CLOSED (over the top course at the headwall, under the cladding) | Partially concealed (roof leg visible, wall leg hidden) | OPEN — only if House 13 has a headwall | HOLD — HOUSE 13 | inventory + profile + finish practice |
| 14 | Kick-out flashing | Distinct diverter, where required | CLOSED (used where required) | OPEN — INTERNAL (site-formed from step stock vs a manufactured diverter — not recorded) | Generic conceptual only until a condition exists | CLOSED (functionally fixed) | CLOSED (the first piece at the bottom of a sidewall run that ends at an eave/gutter) | Visible — small | OPEN — only if House 13 has the condition | HOLD | inventory + which kick-out |
| 15 | Lifetime Ultimate Pipe Flashing | Lifetime Tool® Ultimate Pipe Flashing — #200 (ABC `14LTUPF200`), #300 | CLOSED | CLOSED (24-ga galvanized Kynar®-coated plate; sizes 1¼/1½/2/3/4 in; 2-in plate 17.96 × 13.46 in, boot 5.12 in high; flange 4 in sides / 5½ in top / 3 in bottom; silicone seal + compression collar; flat to 18/12 — HIGH-CONFIDENCE) | CLOSED WITH CALIBRATION LATER (2-in from dimensions; **#300 plate dimensions UNVERIFIED** — Cardinal owns the part) | CLOSED WITH CALIBRATION LATER (product-specific Kynar finish; colour purchased not recorded — OPEN INTERNAL, minor) | CLOSED (plate integrated in the field: lower flange over the course below, upper flange under following courses) | Partially concealed (upper flange hidden; boot, collar, lower flange visible) | OPEN — per plumbing-stack inventory (size per stack) | HOLD — HOUSE 13 (station READY NOW) | inventory + #300 measurement |
| 16 | Lifetime EasySleeve | EASYSleeve® 2 in (#ES200), 3 in (#ES300, ABC `14LTES300`) | CLOSED (adapter used with UPF, not a replacement flashing) | CLOSED (black ASA cap stock over PVC, integral nesting cap; for copper / cast iron / damaged pipe — HIGH-CONFIDENCE; ES model numbers not public in this pass, ABC item is the purchasing evidence) | CLOSED WITH CALIBRATION LATER (length and cap geometry UNVERIFIED — Cardinal owns the part) | CLOSED (product-specific black) | CLOSED (over the existing pipe before the UPF collar seats) | Visible — the black sleeve above the collar | OPEN — **only** if a House 13 stack is copper, cast iron or damaged; never a default | HOLD — HOUSE 13 (station READY NOW) | inventory (pipe material) |
| 17 | Bath/Dryer Vent — bath | Lifetime Ultimate Bath/Dryer Vent, bath configuration (screen in) | CLOSED | CLOSED (fits 3 and 4 in with adapter; 24-ga galvanized Kynar-clad cap on ASA sub-cap; rubber damper; removable snap-in stainless screen for bath only; large Kynar flashing plate — HIGH-CONFIDENCE) | CLOSED WITH CALIBRATION LATER (no dimensioned drawing reachable — measure the owned part) | CLOSED WITH CALIBRATION LATER (product-specific; colour purchased OPEN — INTERNAL) | CLOSED (as #15) | Partially concealed | OPEN — per inventory | HOLD — HOUSE 13 (station READY NOW) | inventory + SKU/finish + measurement |
| 18 | Bath/Dryer Vent — dryer | Same body, screen omitted | CLOSED | CLOSED (as #17, without screen) | as #17 | as #17 | as #17 | Partially concealed | OPEN — a roof-terminated dryer is not assumed | HOLD — HOUSE 13 | inventory |
| 19 | Lomanco KV68 kitchen vent | Lomanco Kitchen PRO™ KV68, black (ABC `17LOKV68BK`) | CLOSED | CLOSED (galvanized steel, black environmental epoxy; 6–8 in round or 3¼ × 10 in duct; pest screen; aluminium damper; integrated flange; 14 3/16 × 18¾ × 6½ in, 5.2 lb — HIGH-CONFIDENCE; **final details per the KV68 gate**) | CLOSED WITH CALIBRATION LATER (overall dimensions known; profile from the KV68 gate / owned part) | CLOSED (product-specific black) | CLOSED (as #15) | Partially concealed | OPEN — only if House 13 has a roof-terminated kitchen exhaust | HOLD — HOUSE 13 (station READY NOW) | inventory |
| 20 | RidgeProwler 30 | Owens Corning VentSure® RidgeProwler™ 30 | CLOSED | CLOSED (13⅞ in wide; 30-ft roll; injection-moulded polypropylene; 2:12–16:12; built-in end plugs; cut lines every 6 in; curved external baffles + flat side vents; NFA UNVERIFIED, nonblocking — HIGH-CONFIDENCE) | CLOSED WITH CALIBRATION LATER (cross-section height and baffle profile from the owned roll or the instruction sheet) | CLOSED (fixed black) | CLOSED (over the slot, before ProEdge) | Mostly concealed (body under cap; baffle edge shows as the low raised line) | CLOSED where the roof has a ventable ridge; OPEN if House 13 is hip-dominant | READY — CALIBRATE LATER | cross-section measurement |
| 21 | ProEdge hip cap | Owens Corning ProEdge® Hip & Ridge (contract item 11B-1 "Pro Edge") | CLOSED | CLOSED (12 × 36 in perforated into three 12 × 12 in pieces; 6-in exposure; 33.3 LF/bundle; "color-matched to coordinate" with Duration — HIGH-CONFIDENCE) | CLOSED | CLOSED WITH CALIBRATION LATER (dedicated coordinated cap material; **availability in Mountain Pine UNVERIFIED** — §8 C6) | CLOSED (hips first, starting at the eave) | Visible | OPEN — only if House 13 has hips | HOLD — HOUSE 13 (station READY NOW) | inventory + Mountain Pine SKU check |
| 22 | ProEdge ridge cap | Same product | CLOSED | CLOSED (as #21) | CLOSED | as #21 | CLOSED (after hips; start at the end opposite the prevailing wind; over RidgeProwler) | Visible | CLOSED — any roof with a ridge (pure pyramid excepted) | READY — CALIBRATE LATER | Mountain Pine SKU check |
| 23 | Ridge-slot condition | Deck slot both sides of the ridge, stopped short of the ends | CLOSED | CLOSED WITH CALIBRATION LATER (slot width per RidgeProwler instructions — figure UNVERIFIED, sheet blocked) | CLOSED WITH CALIBRATION LATER (parametric slot width) | NOT APPLICABLE | CLOSED (after the top field courses, before RidgeProwler) | Fully concealed | as #20 | READY — CALIBRATE LATER | slot-width figure |
| 24 | Chimney / counterflashing | Step flashing + cut-in counterflashing (Cardinal practice per Stage 19 copy); stock not named | OPEN — INTERNAL (stock, colour) **only if House 13 has a chimney** | NOT APPLICABLE until then | NOT APPLICABLE until then | NOT APPLICABLE until then | CLOSED in principle (step per course; counterflashing cut into the mortar joint) | Visible | OPEN — no evidence House 13 has one | HOLD | inventory |

---

## 3 · House 13 applicability matrix

Product truth is in §2. This table answers only "does House 13 need it", from the inventory that is
**not available in this repository**. The single rule applied: a component is present on House 13
only when the roof condition that calls for it is present, and the inventory is the only thing that
can say so.

| Component | Condition that makes it applicable | House 13 status | Evidence class |
|---|---|---|---|
| Sound OSB deck | any roof | **APPLICABLE** | FACT (unconditional) |
| Localized damaged OSB / replacement sheet | the House 13 narrative chooses to show a discovery | OPEN — narrative decision | RECOMMENDATION: if shown, one sheet at a "predictable place" (valley bottom, beside a penetration, under an old repair — Stage 14 copy), never scattered for effect |
| RhinoRoof Granulated — eaves | any eave | **APPLICABLE** | FACT (unconditional; Ohio ice-barrier requirement is the Library's own card) |
| RhinoRoof Granulated — valleys / wall lines / penetrations | a valley / a wall line / a penetration | OPEN | inventory |
| DeckDefense | any roof | **APPLICABLE** | FACT |
| Eave drip edge | an eave **without** a gutter | OPEN — do not assume; the contract defaults eaves to gutter apron | inventory |
| Rake drip edge | a rake (gable end, dormer cheek) | OPEN — a hip roof has none | inventory (roof form) |
| Gutter apron | an eave **with** a gutter | OPEN — probable, unproven | inventory |
| Starter Strip Plus | any eave; any rake present | **APPLICABLE** (rake leg conditional) | FACT |
| Duration field | any roof | **APPLICABLE** | FACT |
| Closed-cut valley | two planes meeting in a valley | OPEN — do not force one into a plane that has none | inventory |
| Step flashing | a roof plane dying into a vertical sidewall (dormer cheek, second storey wall, chimney side) | OPEN | inventory |
| Headwall / apron flashing | a plane stopping at a wall face | OPEN | inventory |
| Kick-out | a sidewall run terminating at an eave/gutter, or an awkward inside-miter transition | OPEN — not added for completeness | inventory |
| UPF #200 / #300 | a plumbing stack; size per stack | OPEN — near-universal but unproven; size unknown | inventory |
| EasySleeve | that stack is copper / cast iron / damaged | OPEN — never a default | inventory (pipe material) |
| Bath vent | a roof-terminated bath exhaust | OPEN | inventory |
| Dryer vent | a roof-terminated dryer exhaust | OPEN — less common than a wall termination; do not assume | inventory |
| KV68 | a roof-terminated kitchen exhaust | OPEN | inventory |
| RidgeProwler 30 + ridge slot | a ridge long enough to vent (Cardinal's own hedge: "where the roof can carry it") | OPEN — probable on a gable; doubtful on a hip-heavy roof | inventory (ridge length, roof form) |
| ProEdge hip | a hip | OPEN | inventory |
| ProEdge ridge | a ridge | **APPLICABLE** unless pyramid | FACT (near-unconditional) |
| Chimney / counterflashing | a masonry chimney | OPEN — no evidence either way | inventory |

**Teaching rule preserved:** the experience may teach a held component at an isolated educational
station; House 13's own geometry stays architecturally honest and carries only what its inventory
carries.

---

## 4 · Authoritative roof-build sequence

Reconciled from: the popup's water-layer order ("drip edge FIRST at the eave, shield OVER it, felt
starting above and lapping down — never burying it", carrying Theo's own correction), the Library's
drip-edge card (eaves-and-rakes, 2-in overlap, 12-in o.c. fastening per R905.2.8.5), the contract's
row order (1 decking · 2 deck protection · 3 drip edge/gutter apron · 4 ice & water · 5 valley ·
6 starter · 7 shingles · 8 flashing · 9 extrusions · 10 ventilation · 11 cap), the Roof Journey
stages 14–21, and the prior gates' eave/rake ordering and hips-before-ridges rules. Where the
contract's row order and the install order differ (the contract lists metal before ice & water as
one row and starter after valley), the install order below governs; the contract is a price list,
not a sequence.

**Experience grammar preserved: MOVE → SETTLE → OPEN → BUILD → EXPLAIN → RESTORE.** MOVE brings the
camera to the station; SETTLE holds; OPEN peels the finished roof back to the layer in question;
BUILD installs that layer in the order below; EXPLAIN fills the plate (what it is → what it does →
what happens when it fails or is absent → how Cardinal handles it, with the contract item number
per the Twelve Layers spec); **RESTORE closes the roof back to its finished state — and §5 is the
contract for what RESTORE must hide again.** Nothing below was reordered to make an animation easier.

### 4.1 Main sequence (every Cardinal roof)

| Step | Layer / act | Contract item | Notes |
|---|---|---|---|
| 0 | Tear-off to the bare deck | 1A | the deck is the OPEN state of the whole system |
| 1 | Deck inspection; localized replacement with 7/16 OSB where damaged | 1B | photographed before cover (Stage 14) |
| 2 | **Eave metal** — gutter apron at guttered eaves (drip edge at un-guttered eaves), fastened ≤12 in o.c. | 3B (3A) | the *only* metal that goes on before any membrane |
| 3 | **RhinoRoof Granulated** — eaves over the eave metal, up past the interior wall line; valleys (centred); wall lines where step/headwall flashing will run | 4 | self-adhered, seals its own nails; the layer "you'll never see again" |
| 4 | **DeckDefense** — field courses bottom-up, lapping over the RhinoRoof, fastened to the printed pattern | 2C | 42-in courses; laps on the printed lines |
| 5 | **Rake drip edge** — over the underlayment up every rake, lapped over the eave metal at the corner | 3A | this is why Stage 15's "before anything else" is only half true |
| 6 | **Starter Strip Plus** — eaves, then rakes, sealant to the edge, consistent overhang past the metal | 6B | becomes nearly invisible after step 7's first course |
| 7 | **Duration field** — course by course, bottom-up, SureNail nailing; the condition sub-sequences in 4.2 are woven in **as each course reaches them** | 7 | the only layer with two hero materials |
| 8 | **Ridge slot** — cut both sides of the ridge, stopped short of the ends | 10A | after the top courses, before the vent |
| 9 | **RidgeProwler 30** — over the slot, end plugs at the ends, cut on the 6-in lines | 10A-2 | body disappears under step 10 |
| 10 | **ProEdge** — hips first, each starting at the eave and working up; then the ridge, starting at the end opposite the prevailing wind; ridge cap over the vent | 11B-1 | thicker than the field it finishes — the "look at the ridge against the sky" tell |

### 4.2 Condition sub-sequences (woven into step 7 where the condition exists)

**Valley (closed-cut):** RhinoRoof centred in the valley at step 3 → DeckDefense laps into it at step 4
→ at step 7 the first plane's courses run across the valley ≥12 in past the centreline → the second
plane's courses run over them and are cut back ~2 in from the centreline, upper corners clipped, no
nails within the no-nail zone → the liner is never seen again. *(Cut-back and no-nail figures:
HIGH-CONFIDENCE standard practice; verify against the OC PDF at calibration.)* Whether a metal liner
sits under the membrane is §8 C10.

**Sidewall (step flashing + kick-out):** RhinoRoof up the wall line at step 3 → at step 7, the
**kick-out is the first piece** at the bottom of the run where it ends at an eave/gutter → one 4 × 4 × 8
step per course, its vertical leg against the wall (behind the cladding), its roof leg over the course
below and under the course above → cladding/counterflashing covers the vertical legs → the finished
tell is the stair-step edge, ~2 in per course, and nothing else.

**Headwall (apron):** courses run up to the wall → continuous apron/base flashing over the top course,
vertical leg behind the cladding → roof leg visible, wall leg hidden.

**Penetration (UPF / EasySleeve / Bath-Dryer / KV68):** courses run up to the pipe or duct → (EasySleeve
over the pipe first, only where the pipe is copper, cast iron or damaged) → the flashing plate set
into the field: lower flange **over** the course below, upper flange **under** the following courses,
side flanges lapped by the neighbouring shingles → the UPF's silicone seal and compression collar seat
on the pipe → subsequent courses cover the upper flange. Bath/Dryer and KV68 hoods follow the same
plate logic with their integrated flanges. *(The order of the RhinoRoof patch around a penetration
relative to DeckDefense is not fixed by the repo record — OPEN — MANUFACTURER EVIDENCE, minor; the
contract says ice & water "along eaves, valleys & flashings" without ordering it.)*

**Chimney (only if present):** step flashing per course on both sides as at a sidewall → counterflashing
cut into the mortar joint, stepped with the courses (Stage 19) → the masonry trade owns the crown.

### 4.3 What the sequence deliberately does not do

- It does not put rake metal on before the underlayment to match the Stage 15 sentence.
- It does not lay the valley, sidewall or penetration details as separate "phases" after the field;
  they are per-course integrations and the animation must weave them.
- It does not add a Generate-style shortcut: RESTORE is the reverse of BUILD, layer by layer.

---

## 5 · Visibility-state matrix

The contract for RESTORE. "Cardinal must not artificially leave hidden components exposed just to
prove they exist" — a component's evidence in the finished roof is its finished-state row here, and
the photograph is the product for everything concealed (Stage 16's rule).

| Component | During build | After the next layer | Completed roof |
|---|---|---|---|
| Sound OSB deck | Visible (step 0–2) | Partially concealed (step 3) | **Fully concealed** |
| Damaged OSB | Visible (step 1) | Removed | **Fully concealed** (absent) |
| Replacement 7/16 sheet | Visible | Partially concealed | **Fully concealed** |
| RhinoRoof Granulated | Visible (step 3) | Mostly concealed (DeckDefense laps it; a band shows at the eave edge until starter) | **Fully concealed** |
| DeckDefense | Visible (step 4) | Partially concealed (starter, first courses) | **Fully concealed** |
| Eave drip edge / gutter apron | Visible | Flange concealed under membrane | **Visible — face only**, above/behind the gutter |
| Rake drip edge | Visible | Flange concealed under starter | **Visible — face only** |
| Starter Strip Plus | Visible (step 6) | Mostly concealed by the first course | **Mostly concealed** — a solid, notch-free sliver at the edge (the driveway tell) |
| Duration field | Visible | — | **Visible** |
| Closed-cut valley liner | Visible (step 3) | Fully concealed by the first plane | **Fully concealed**; the cut line is what shows |
| Step flashing | Visible per course | Mostly concealed by the next course + cladding | **Mostly concealed** — the stair-step edge |
| Headwall apron | Visible | Wall leg concealed by cladding | **Partially concealed** — roof leg shows |
| Kick-out | Visible | — | **Visible** (small) |
| UPF plate | Visible | Upper flange concealed by the next courses | **Partially concealed** — boot, collar, lower flange show; upper flange gone |
| EasySleeve | Visible | — | **Visible** — the black sleeve above the collar |
| Bath/Dryer, KV68 | Visible | Upper flange concealed | **Partially concealed** — hood shows |
| Ridge slot | Visible (step 8) | Fully concealed by the vent | **Fully concealed** |
| RidgeProwler 30 | Visible (step 9) | Body concealed by cap | **Mostly concealed** — the baffle edge reads as a low, even raised line along the peak |
| ProEdge hip / ridge | Visible | — | **Visible** — visibly thicker than the field; two layers edge-on at the gable end |

---

## 6 · Geometry-readiness matrix

| Component | Geometry can be modelled from | Status | Evidence class of the source |
|---|---|---|---|
| Sound OSB deck | existing frozen Cardinal geometry (House 13 planes) | CLOSED | FACT (frozen asset, per the brief) |
| Damaged OSB | generic conceptual (a region within a sheet) | CLOSED for a station | RECOMMENDATION |
| Replacement 7/16 OSB | standard sheet dimensions | CLOSED | FACT |
| RhinoRoof Granulated | manufacturer dimensions (36 in width, 3-in selvage) | CLOSED | HIGH-CONFIDENCE OBSERVATION |
| DeckDefense | manufacturer dimensions (42 in width; printed lap lines) | CLOSED (lap inch figure UNVERIFIED) | HIGH-CONFIDENCE OBSERVATION |
| ACM ADE drip edge | manufacturer drawing | CLOSED — profile *selection* OPEN — INTERNAL | prior gate (FACT as recorded) |
| ACM AGA gutter apron | manufacturer drawing | CLOSED — selection OPEN — INTERNAL | prior gate |
| ACM APSF step flashing | Cardinal field measurement (4 × 4 × 8 from 8 × 8) + drawing | CLOSED | FACT (field) |
| Wall / headwall (AWF / ARTW) | manufacturer drawing | CLOSED for the family — selection OPEN — INTERNAL | prior gate |
| Kick-out | generic conceptual only | HOLD | — |
| Starter Strip Plus | manufacturer dimensions | CLOSED | HIGH-CONFIDENCE OBSERVATION |
| Duration | manufacturer dimensions (exposure 5⅝ in; metric shingle) | CLOSED — offset pattern verify verbatim later | HIGH-CONFIDENCE OBSERVATION |
| Closed-cut valley | standard practice figures | CLOSED WITH CALIBRATION LATER | HIGH-CONFIDENCE OBSERVATION |
| Lifetime UPF #200 | manufacturer dimensions (plate 17.96 × 13.46 in, boot 5.12 in, flange margins) | CLOSED | HIGH-CONFIDENCE OBSERVATION (distributor listing) |
| Lifetime UPF #300 | not enough evidence in this pass — **Cardinal owns the part** | CLOSED WITH CALIBRATION LATER (measure) | UNVERIFIED |
| EasySleeve | not enough evidence (length, cap) — Cardinal owns the part | CLOSED WITH CALIBRATION LATER (measure) | UNVERIFIED |
| Bath/Dryer | not enough evidence (no dimensioned drawing reachable) — Cardinal owns the part | CLOSED WITH CALIBRATION LATER (measure) | UNVERIFIED |
| Lomanco KV68 | manufacturer overall dimensions + **the KV68 gate result** | CLOSED WITH CALIBRATION LATER | HIGH-CONFIDENCE OBSERVATION |
| RidgeProwler 30 | manufacturer width/length; cross-section from the owned roll or instruction sheet | CLOSED WITH CALIBRATION LATER | HIGH-CONFIDENCE OBSERVATION |
| ProEdge | manufacturer dimensions (12 × 36 → 3 × 12 × 12; 6-in exposure) | CLOSED | HIGH-CONFIDENCE OBSERVATION |
| Ridge slot | parametric; width figure from the RidgeProwler sheet | CLOSED WITH CALIBRATION LATER | UNVERIFIED (figure) |
| Chimney | not enough evidence (no inventory) | HOLD | — |

---

## 7 · Material-readiness matrix

"Architecture-ready" means the material *system* is decided (which components share a family, which
carry their own, which finishes are selectable); "manufacturer-calibrated" means a physical sample
has driven colour and roughness. Nothing is in the second state yet, and nothing needs to be before
modelling starts.

| Component | Material architecture | Readiness | What calibration needs |
|---|---|---|---|
| Sound / replacement OSB | shared physical family (OSB strand face; "new" and "weathered" variants) | READY FOR CONTROLLED MATERIAL PROOF | an OSB offcut; a Cardinal deck photo |
| Damaged OSB | variant of the OSB family (strand cohesion loss, not ply delamination) | READY FOR CONTROLLED MATERIAL PROOF | a Cardinal rot photograph from the CompanyCam archive |
| RhinoRoof Granulated | product-specific (dark charcoal fine dense granule; smoother selvage; not U20, not smooth black) | READY FOR CONTROLLED MATERIAL PROOF | a roll offcut including the selvage |
| DeckDefense | product-specific (light grey; TruTread fine nonwoven-like surface; **current print graphic**) | READY FOR CONTROLLED MATERIAL PROOF | a roll offcut carrying the print |
| ACM edge metals (ADE / AGA / ARTW) | shared physical family (0.019 in painted aluminium) × **client-selectable finish** (the 750 trim list: White, Almond, Brown, Royal Brown, Musket Brown, Wicker, Clay, Black, Bronze, Mill finish — a starting list, Theo's own words) — **geometry and finish are separate parameters** | READY FOR PRODUCTION MATERIAL (family) / NEEDS PHYSICAL SAMPLE CALIBRATION (per colour) | one offcut per colour Cardinal actually stocks; black is not universal |
| Step flashing | fixed functional finish (black aluminium stock; mostly concealed) — **not** propagated from the edge-metal colour choice | READY FOR PRODUCTION MATERIAL | none beyond the family |
| Headwall apron | OPEN — fixed dark vs trim-matched is Cardinal practice not recorded | INSUFFICIENT EVIDENCE (finish rule only) | one sentence from Theo |
| Kick-out | fixed functional finish | READY FOR PRODUCTION MATERIAL (when a condition exists) | — |
| Starter Strip Plus | product-specific (dedicated granulated dark starter) | READY FOR CONTROLLED MATERIAL PROOF | one piece |
| Duration — Mountain Pine / Black Sable | **product-specific colour material per colour**: product-specific macro/meso colour organisation over a shared constrained micro-granule character; uniform speckle × tint is inadequate; the two colours are coordinated distributions, not one texture tinted | READY FOR CONTROLLED MATERIAL PROOF; NEEDS PHYSICAL SAMPLE CALIBRATION before the final pass | one full shingle of each (the catalog's hexes are style-board samples — repo FACT — not a material) |
| ProEdge | dedicated coordinated cap material (not the field albedo reused) | READY FOR CONTROLLED MATERIAL PROOF | one ProEdge piece in each hero colour |
| Lifetime UPF / EasySleeve / Bath-Dryer | product-specific finishes (Kynar-coated plate; black ASA sleeve; Kynar-clad cap) | READY FOR CONTROLLED MATERIAL PROOF | the owned parts |
| Lomanco KV68 | product-specific black (epoxy as shipped) | READY FOR CONTROLLED MATERIAL PROOF | the owned part; the KV68 gate |
| RidgeProwler 30 | fixed functional black polypropylene | READY FOR PRODUCTION MATERIAL | the owned roll for edge-line calibration only |

**Colour-propagation rule (preserved, made explicit):** the client's edge-metal colour applies to
the ADE/AGA faces (and, only if Cardinal practice says so, the headwall apron's roof leg). It does
**not** flow to step flashing, kick-out, the UPF plate, the vent hoods or the ridge vent, each of
which carries its own fixed or product-specific finish.

---

## 8 · Conflict register

Only unresolved or newly found contradictions are kept. Each carries the current best resolution,
its production impact, and whether it blocks.

| # | Conflict | Current best resolution | Production impact | Blocking? |
|---|---|---|---|---|
| C1 | **Duration step flashing 4 vs 5 in.** OC's own Duration documents differ *by version*: one says "minimum 4 in × 4 in × 8 in, and 2 in wider than the exposure"; another (Duration Series / Storm / Flex, and Supreme) says "10 in long and 2 in wider than the expected exposure", lapped ≥2 in. **No 5-inch figure was found in any OC Duration document reachable this session** — its origin is UNVERIFIED. The IRC minimum is 4 in high × 4 in wide (FACT). | Model **Cardinal's 4 × 4 × 8** (field truth; satisfies the code minimum and OC's 4 × 4 × 8 version; at Duration's 5⅝-in exposure the 8-in leg is 2⅜ in wider than the exposure). The manufacturer figure affects only an educational caption, never the geometry. | none on geometry; caption must not quote a single "manufacturer" number as if OC had one | NONBLOCKING |
| C2 | **Edge-metal naming / profile ambiguity.** The brief lists "eave drip edge" as a component; Cardinal's own contract puts **gutter apron at eaves (3B)** and **drip edge at rakes (3A)**. The ACM code suffixes (`15`/`20`, `DS`/`ST`/`BK`) were not decoded from any source reachable here. | Eave = gutter apron where a gutter exists; eave drip edge only at an un-guttered eave; rake = drip edge always. Code decoding comes from the ACM catalog already in the modelling workspace (prior gate); INFERENCE that `15`/`20` are face/flange dimensions and `BK` is black is recorded as inference only. | House 13 needs one profile pick per condition (§9) | NONBLOCKING for stations; part of the House 13 hold |
| C3 | **DeckDefense current vs historical specs.** Distributor listings still show a 48-in × 250-ft DD10; current OC and big-box listings are 42 in × 286 ft (DD10) / 42 in × 143 ft (DD05). | 42 in is current (HIGH-CONFIDENCE, multiple current listings); 48 in is legacy stock. Model 42-in courses and the current print. | none | NONBLOCKING |
| C4 | **Lifetime documentation age/version.** Dimensioned figures are public for the 2-in Kynar UPF only; the #300 plate, the Bath/Dryer body and the EasySleeve have no dimensioned drawing reachable; ES model numbers are not public (the ABC item `14LTES300` is the purchasing evidence); naming varies (EASYSleeve / EasySleeve). | Cardinal owns every one of these parts: a tape measure closes the geometry faster than any document. Product identity is unaffected. | measurement before modelling the #300, Bath/Dryer and sleeve | NONBLOCKING (station-level) |
| C5 | **RidgeProwler finished-edge visibility.** The brief's visibility rule says the broad body disappears under cap; OC markets a "narrow footprint / slim design / minimal visual impact"; Cardinal's own copy teaches that a ridge vent "shows as a low, even raised line" along the peak. | Both are true at once: body concealed, **baffle edge visible** as the low line. Model the cap over the body with the baffle edge proud by the product's real edge height (calibrate from the owned roll and a Cardinal install photo). | edge height calibration | NONBLOCKING |
| C6 | **ProEdge coordinated colour vs identical field blend.** OC's wording is "color-matched to coordinate" with Duration/Oakridge — a coordinated blend, not the field granule mix. **Whether ProEdge is offered in Mountain Pine (new for 2026) is UNVERIFIED.** | Dedicated coordinated cap material (preserved). Purchasing confirms the Mountain Pine cap SKU; if none exists, the contract's other OC option (DecoRidge, 11B-2) or a coordinating colour is Theo's call — not this document's. | one purchasing check before the hero-colour cap is modelled as ProEdge | NONBLOCKING (hero colour only) |
| C7 | **KV68 documentation.** Lomanco describes the black epoxy as usable "as a primer for painting"; the brief fixes the finish as product-specific black. Overall dimensions here (14 3/16 × 18¾ × 6½ in, 5.2 lb) come from the Lomanco catalog. | As-shipped black (ABC `17LOKV68BK`); **defer every technical detail to the KV68 gate result**, which this document does not duplicate. | none | NONBLOCKING |
| C8 | **NEW — ice & water product naming in Cardinal's own copy.** `api/estimate-to-contract.js` and the Library name **WeatherLock**; the field truth is **RhinoRoof Granulated**. Both are current OC self-adhered granulated barriers (WeatherLock G 36 in × 66.7 ft / 200 sq ft; RhinoRoof Granulated 36 in × 65 ft / 195 sq ft) and both qualify as the Total Protection ice & water component. | The model depicts RhinoRoof Granulated. Caption plates must not say WeatherLock. The app copy is a separate Cardinal consistency item for Theo, outside this gate. | caption discipline | NONBLOCKING |
| C9 | **NEW — Stage 15 copy vs install order.** "Before anything else goes down, new metal goes on the edges" is true at the eave and false at the rake (drip edge over the underlayment). | §4 governs; the sentence may survive as homeowner copy but the sub-sequence must show the rake metal after DeckDefense. | caption discipline | NONBLOCKING |
| C10 | **NEW — contract item 5 "Valley metal — colour" vs the closed-cut method.** A priced, coloured valley metal implies purchased metal; a closed-cut valley conceals whatever is under it. | OPEN — INTERNAL: does Cardinal lay a metal liner under the closed-cut valley (concealed, colour moot) or run the closed-cut over RhinoRoof alone? Not a reopening of the method — the method stands either way. | only if House 13 has a valley, and only for the BUILD frame | NONBLOCKING |
| C11 | **NEW — grammar spelling.** The brief's six beats (MOVE → SETTLE → OPEN → BUILD → EXPLAIN → RESTORE) vs Theo's recorded four (MOVE → SETTLE → REVEAL → EXPLAIN, `GUIDED_SALE_DIRECTION.md` §17). | The six-beat is this experience's specialisation of the four: OPEN + BUILD = REVEAL, and RESTORE closes the station. No contradiction; recorded so nobody "corrects" one to the other. | none | NONBLOCKING |
| C12 | **NEW — the audit's one-line layer order and the popup's word "felt".** `GUIDED_SALE_AUDIT_2026-09.md` G-B lists "deck → ice & water → felt → drip edge → starter …"; the popup names its underlayment state `'felt'`. Cardinal runs synthetic on every roof (Stage 17: "We run synthetic on every roof."). | The audit line is a summary, not a sequence — §4 governs (eave metal precedes ice & water; rake metal follows the underlayment). "Felt" is the book's homeowner word; the experience says DeckDefense / synthetic. | do not copy either as the sequence | NONBLOCKING |

Resolved and therefore **removed** from the register: the Duration product identity, both hero
colours, Starter Strip Plus vs cut-down starter, the EasySleeve-is-an-adapter question, the Bath vs
Dryer screen, the U20-artwork confusion, and the 48-in DeckDefense assumption (C3 closes it).

---

## 9 · Remaining internal Cardinal evidence

The shortest list. Everything below is a Cardinal fact, not a research question.

1. **The House 13 condition inventory** (this is the whole House 13 hold): roof form; each eave with
   or without a gutter; rakes; valleys; sidewalls, headwalls and any kick-out locations (including
   awkward inside-miter transitions); every penetration with type, size and pipe material; chimney or
   skylights; ridge and hip lengths and whether the ridge is ventable.
2. **Edge-metal profile and colour for House 13** — which ADE code at rakes/un-guttered eaves, which
   AGA code at guttered eaves, and the colour the House 13 client picked (or the default for a
   presentation house).
3. **Wall/headwall profile and finish rule** — AWF vs ARTW if House 13 has a headwall, and whether
   the apron's roof leg is fixed dark or trim-matched.
4. **UPF size per stack** (#200 vs #300) and **whether any stack is copper, cast iron or damaged**
   (the only case that puts an EasySleeve on House 13).
5. **Bath/dryer SKU and finish per House 13**, and the Kynar colour of the purchased UPFs.
6. **Kick-out: site-formed from step stock or a manufactured diverter** — only if a condition exists.
7. **Valley liner under the closed-cut** (C10) — only if House 13 has a valley.
8. **ProEdge in Mountain Pine** — a purchasing lookup (C6).
9. **Deck-replacement narrative** — whether House 13 shows a discovered sheet, and where.

**No internal evidence needed:** sound OSB, RhinoRoof Granulated, DeckDefense, Starter Strip Plus,
Duration identity and colours, RidgeProwler 30 product, the 4 × 4 × 8 step flashing, KV68 identity.

---

## 10 · Physical-sample / calibration list

**REQUIRED BEFORE MODELLING** (geometry the drawings do not close):

| Item | Why | Who holds it |
|---|---|---|
| Lifetime UPF #300 — plate and boot dimensions | not public in this pass | Cardinal (purchased) |
| Lifetime Bath/Dryer vent — hood, sub-cap, flange dimensions | no dimensioned drawing reachable | Cardinal (purchased) |
| EasySleeve #ES300 — length and nesting-cap geometry | not public | Cardinal (ABC `14LTES300`) |
| RidgeProwler 30 — cross-section height and baffle profile | width/length known, section not | Cardinal (roll on the truck) or the instruction sheet |
| *(only if House 13 has one)* kick-out piece as Cardinal actually forms/buys it | generic until then | Cardinal |

A dimensioned photo set (part beside a tape, four views) satisfies every row; no shipping required.

**REQUIRED ONLY BEFORE THE FINAL MANUFACTURER-FAITHFUL CALIBRATION** (geometry is closed; colour and
roughness are not):

| Item | Calibrates |
|---|---|
| One full Duration shingle, Mountain Pine; one, Black Sable | the two product-specific colour materials (the catalog hexes are style-board samples) |
| One ProEdge piece in each hero colour | the coordinated cap material |
| One Starter Strip Plus piece | starter granule and sealant band |
| RhinoRoof Granulated offcut with selvage | granule face vs smoother lap |
| DeckDefense offcut with the print | grey, TruTread texture, current graphic |
| ACM ADE / AGA offcuts in each stocked colour (black is not universal) | the client-selectable finish set |
| 7/16 OSB offcut + one Cardinal rot photograph | new sheet, weathered deck, damage variant |
| KV68 (owned) | as-shipped black epoxy — per the KV68 gate |

**Not requested:** samples of step flashing (geometry is field-measured and the finish is fixed),
ACM profiles (drawings close them), or any product whose only open point is a House 13 condition.

---

## 11 · Exact components ready for Claude now

Controlled production material/geometry integration may begin on:

- **Existing sound OSB deck** (existing frozen geometry; OSB family material)
- **Replacement 7/16 OSB sheet** (as a station; House 13 placement pending narrative)
- **RhinoRoof Granulated** (eaves unconditional; valleys/walls/penetrations follow the inventory)
- **DeckDefense** (42-in courses; current print)
- **Starter Strip Plus** (eaves unconditional; rakes follow roof form)
- **Duration field — Mountain Pine and Black Sable** as architecture-level product-specific materials
- **ProEdge ridge cap** geometry and coordinated material (hero-colour SKU check runs in parallel)
- **RidgeProwler 30 body + ridge slot** (parametric slot width; edge height calibrated later)
- **Step flashing 4 × 4 × 8** as an educational station
- **Lifetime UPF #200** as an educational station (dimensions public)
- **Lomanco KV68** as an educational station, on the KV68 gate's details
- **ACM ADE drip edge and AGA gutter apron** as educational stations from the catalog drawings, finish
  parameterised on the trim list

---

## 12 · Exact components not ready

| Component | Why not | What releases it |
|---|---|---|
| Eave drip edge on House 13 | no un-guttered eave is known to exist | inventory |
| Rake drip edge on House 13 | roof form unknown | inventory + profile/colour pick |
| Gutter apron on House 13 | profile code and colour unpicked | inventory + profile/colour pick |
| Closed-cut valley on House 13 | no valley known; liner question | inventory (+ C10) |
| Step flashing / headwall / kick-out on House 13 | no sidewall/headwall known; headwall profile and finish rule; kick-out form | inventory + §9 items 3, 6 |
| UPF #300, EasySleeve, Bath/Dryer on House 13 | penetration list, sizes, pipe material, SKUs; #300/Bath-Dryer/sleeve dimensions | inventory + §10 measurements |
| ProEdge hip on House 13 | no hip known | inventory |
| ProEdge in Mountain Pine | SKU unverified | purchasing lookup |
| Chimney / counterflashing | no evidence House 13 has one | inventory |

---

## 13 · Additional research recommendation

**No broad roof-product research is justified.** Three narrow lookups remain, all calibration-level,
none of which should hold production:

1. The **current Duration installation PDF** — the step-flashing sentence (C1), the closed-cut valley
   figures, and the course-offset pattern, verbatim.
2. The **RidgeProwler 30 installation sheet** — slot width per side, end treatment, and net free area.
3. **Lifetime's dimensioned sheets** for the #300 UPF and the Bath/Dryer vent — or skip them and
   measure the owned parts (§10).

All three manufacturer domains were egress-blocked in this session and are reachable from an ordinary
browser.

---

## 14 · Final gate recommendation

**A.** Yes — the system is sufficiently researched for a controlled production material/geometry
integration pass on the components in §11.
**B.** READY NOW: sound OSB deck, replacement 7/16 OSB, RhinoRoof Granulated, DeckDefense, Starter
Strip Plus, Duration field (both hero colours at architecture level), ProEdge ridge, RidgeProwler 30
body + slot, step flashing station, UPF #200 station, KV68 station, ADE/AGA stations.
**C.** Architecture-ready, sample-calibrated later: Duration colours, ProEdge colours, OSB faces,
RhinoRoof face, DeckDefense print, every edge-metal colour, the Lifetime finishes, KV68.
**D.** Blocking House 13 integration: the condition inventory, and through it the edge-metal
profile/colour pick, the headwall profile and finish rule, any kick-out, the penetration list with
sizes and pipe materials, the valley (and its liner), hips, and any chimney.
**E.** Research gaps: the three items in §13, all minor. Internal Cardinal gaps: §9 items 1–9, and
they are the ones that matter.
**F.** No additional broad research before production.

**GO WITH HOLDS — production may begin on closed components while specifically named components remain held**

Held components, by name: eave drip edge, rake drip edge and gutter apron *on House 13* (profile and
colour); closed-cut valley *on House 13* (and its liner); step flashing, headwall apron and kick-out
*on House 13*; UPF #300, EasySleeve, Bath/Dryer (both configurations) and KV68 *on House 13*;
ProEdge hip *on House 13*; ProEdge *in Mountain Pine* (SKU); chimney/counterflashing. Every hold
lifts on the House 13 condition inventory plus the purchasing and measurement items in §9–§10.
