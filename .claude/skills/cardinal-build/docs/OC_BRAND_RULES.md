# Owens Corning & Pink Panther brand rules — read before putting either mark on a screen

*Distilled 8 Aug 2026 from `OC_MGM_Guidelines_for_Contractors.pdf`, in this
folder — Owens Corning's "The Pink Panther™ Guidelines **For Contractors,
Distributors and Dealers**" (October 2016 edition, the copy Theo holds).*
**The PDF is the source of truth. Where this file is ambiguous, open it.**

The PDF lives under `.claude/`, which `.vercelignore` excludes — a partner's
internal brand manual must never be served at a public URL. Do not move it to
the repo root or to root `docs/`, both of which ship.

---

## ⚠️ The correction this file exists to record

Builds 615–623 shipped carrying a claim of mine that is **false**:

> *"The Pink Panther is MGM's licensed character that Owens Corning pays for and
> Cardinal does not. The colour is fair game as an authorised dealer; the cat is
> not."*

**Cardinal may use the Pink Panther.** The guidelines are written *for
contractors*, and OC — which holds exclusive licensing in its product categories
— extends that use under an approval process. The character is not used on the
Colors screen today for a different and true reason: **nothing has been
submitted for approval.**

The same reading corrected a second assumption: I had planned to ask for a
**white/reversed** OC logo for the dark ground. *"Don't reverse out the logo"*
is explicitly incorrect use. Red on black is **approved** — see below.

---

## ✅ Cardinal's status — settled 8 Aug 2026, do not re-ask

**Owens Corning™ Roofing Preferred Contractor.** Theo, asked directly: *"Preferred
contractor."* Not Platinum Preferred.

**The app already knew this** — the question was answerable from the file the whole
time, which is the prime doctrine earning its keep again. Three sites in
`index.html` state it, and they agree:

| Where | What it says |
|---|---|
| Resource Library card (~5346–5352) | the OC tier ladder, and *"**Cardinal status:** Owens Corning™ Roofing Preferred Contractor"* |
| the **ROOFING ESTIMATE** template (~8657) | `<div class="est-oc">⭐ Owens Corning® Preferred Contractor</div>` in the document header |
| warranty comparison table (~9149) | Preferred Protection — 50-yr mfr · 10-yr workmanship |

**What Preferred does and does not entitle Cardinal to quote**, from that Library
card and consistent with OC's ladder: Preferred registers **System Protection** and
**Preferred Protection** (the latter adds 10-year workmanship and needs a
qualifying multi-component OC system). **Platinum Protection is Platinum
Preferred only — do not quote it.** Checked at 623: the OC Colors module
(`cr-occ-script`) names **zero** warranty tiers — it quotes only product-level
shingle warranties — so nothing there over-claims.

### Therefore: which artwork, decided by arithmetic rather than by eye

The Preferred Contractor lockup ships in **three variants**, keyed to how dark the
background is (guidelines p. 6):

| Variant | Roundel | "PREFERRED CONTRACTOR" type |
|---|---|---|
| **49% black or less** background | red | black |
| **50% black or more** background | red | **white** |
| **65% black or less** background | one-colour black | black |

The Colors screen grounds at `#231F20` = rgb(35,31,32) → **~87% black** (86.3% by
the lightest channel). That is ≥50%, and it **exceeds** the 65%-or-less ceiling on
the black-roundel variant.

➡️ **The required asset is the "50% BLACK OR MORE BACKGROUND COLOR" Preferred
Contractor lockup — red roundel, white lockup type.** On this ground the roundel
is red. Not black, not white, not pink.

✅ **This also closes the "Proud Installer" question.** Page 6, verbatim: *"Proud
Installer of Owens Corning® Products" is **not needed** when using the Preferred
Contractor logo.* The same sentence appears on p. 5 for Platinum. The relationship
line is required with the **plain OC logo**, not with a tier lockup.

⚠️ **The PDF is not a source of artwork.** Its embedded images on that sheet are
100–150 ppi and a few hundred pixels wide (the lockups measure ~302×50 and
~315×47). Cropping one would ship a blurry, proportion-drifted mark — which the
guidelines forbid outright. **The official file has to come from Theo or from OC.**

### ⚠️ Finding: the estimate already co-brands, and carries no disclaimer

`.est-oc` sits in the header of the **ROOFING ESTIMATE** print template — a
client-facing document with a signature block — as a pink (`#d40f7d`) pill reading
*"⭐ Owens Corning® Preferred Contractor"*. That is co-branded contractor material.

**`index.html` contains ZERO occurrences of "independent contractor" or "not an
affiliate".** Measured, not assumed. The required disclaimer is absent from the
whole app, and this document predates all the OC Colors work. It is **text, not
the logo**, so the "Proud Installer" rule does not bite — but the disclaimer rule
is written against *co-branding*, not against the logo specifically, so the honest
reading is that this document needs it. **Theo's call, not a session's** — it edits
a document homeowners sign.

---

## The approval gate — this blocks shipping, and it is Theo's to pass

- **All material co-branded with Owens Corning** goes to
  **LMARoofing@owenscorning.com** for review and approval.
- **Websites specifically:** send a JPEG/PDF of the layout **and the test-site
  URL**. *"Once you receive approval from Local Marketing, then you may launch
  the website."*
- **Pink Panther adds MGM review: 8 business days, plus 8 more for revisions.**
  Do not proceed to production without written confirmation. Costs of revisions
  demanded at a later stage fall on whoever skipped the earlier one.
- Local Marketing assists with meeting MGM/OC requirements and obtains MGM
  approval on your behalf.

**A session can build and stage this. A session cannot approve it.** Do not ship
a mark to `main` on the assumption approval will follow.

⚠️ **Open question, for Theo's OC contact rather than for us:** does
`app.cardinalroster.com` count as a "website" under these rules? It is an
internal tool, but the Colors screen is handed to homeowners with OC branding on
it, so the honest reading is **yes**.

**Build 623 (the pink/black/white palette) carries neither mark**, and these
rules govern the *marks*. Best read is that it needs no approval — but mention
it whenever anything else is submitted rather than seeking approval
retroactively.

---

## The Owens Corning logo

**Colour — never altered:**

| Use | Value |
|---|---|
| Primary | red **Pantone 186**, `#CE1126` (C:0 M:100 Y:81 K:4) |
| One colour | **black `#000000`** |
| Metal | silver only |

**Incorrect use, verbatim from the guidelines.** Do not: outline the logo ·
place it in a box on a coloured background · box it or ring it with a heavy line
· place it on distracting backgrounds where it is hard to see · **change the
logo colour** · alter its shape or proportions · add a drop shadow, bevel or
emboss · use a partial "arc" · **reverse it out** · let the background show
through the arc or type · add a glow.

**Staging:** clear space on all sides equal to the height of the cap **"O"** in
the logo. More is often better.

**Background:** must clearly contrast; keep it simple, avoiding heavy or
distracting patterns. Photographic backgrounds must be **light**. Page 6
approves the logo on **light, >50% grey, and BLACK** backgrounds — so red on
our `#231F20` ground is fine. The white graphic elements inside the logo must
be maintained over the background.

**Relationship wording — required whenever the OC logo appears in contractor
material:**

> **Proud Installer of Owens Corning® Products**

placed **above the OC logo** (or above/below Cardinal's own mark as an
alternative). Contractors use *Installer*; dealers and distributors use
*Supplier*.

**Required disclaimer on co-branded material:**

> Cardinal Roofing & Renovations, LLC is an independent contractor and is not an
> affiliate of Owens Corning Roofing and Asphalt, LLC or its affiliated
> companies.

Exceptions are made only for extremely small ads and apparel.

✅ **Preferred Contractor / Platinum Preferred Contractor lockups are separate
artwork with their own rules, and with those the "Proud Installer" line is NOT
needed.** Which version to use depends on how dark the background is. **Cardinal
is Preferred — settled 8 Aug 2026; the variant and the arithmetic are in the
status section above.**

The caption under all six lockups — *"'ARC' and type always WHITE"* — is about the
**inside of the roundel** (the white swoosh and the white "OWENS CORNING"
wordmark within it), not the "PREFERRED CONTRACTOR" type beside it, which is black
on two of the three variants. The ® is *"same color as logo"*.

### ⚠️ The logo and the logotype are two different assets — don't cross their rules

The **logotype** is the Company-name type treatment, used *"in limited cases, when
the Owens Corning logo cannot be used"* — pens, wearables, tiny imprint areas. Its
approved colours are **black, PMS 186, PMS Cool Gray 10, or white**, and page 5
shows white-on-black as correct usage.

So **"never reverse it out" governs the LOGO, not the logotype** — an earlier note
here risked over-applying it. Neither is licence to invent: the logotype *"is not
to be recreated or typed using a similar or different font"*, and its own
incorrect-use list is the same shape (no altered proportions, no recoloured type,
no drop shadow/bevel/glow, not on photographic backgrounds). If a mark is wanted on
the dark Colors ground, the answer is the **Preferred lockup**, not a hand-set
white wordmark.

---

## The Pink Panther, if it is ever used

**The legal line, verbatim, with the current year and its closing period, and
legible:**

```
THE PINK PANTHER™ & © 1964-2026 Metro-Goldwyn-Mayer Studios Inc. All Rights Reserved.
```

Short form only where space genuinely forbids the full one
(`THE PINK PANTHER™ & © 1964-2026 MGM.`), and `TM & © 2026 MGM.` for direct
print on merchandise or very small graphics. **Capitalisation, spacing and
punctuation must be followed exactly, including the period at the end.**

**Placement:**
- The **OC logo must be closer to, and in between**, the Panther and any non-OC
  logo or wording — including Cardinal's own, BBB, credit-card marks and
  industry certifications.
- The OC logo must be **relatively the same size** as the Panther.
- The Panther **may not be the focus** of contractor material.

**The Panther must have a purposeful relationship with the messaging rather
than being a decoration.** It does **not** speak, does not use a thought bubble
referring to contractor business, and does not touch a non-OC entity. It may
not be incorporated into a non-OC logo or touch any non-OC image, and **must
never be part of a company logo — not even alongside the OC logo.**

No layout or web page will be approved if it features **only** a competitor's
logo. (Not a risk here: the Colors screen names no competitor, and
`harness_colors.js` asserts it.)

**On a website:** the independent-contractor statement and the **full** MGM
legal line are required at the **bottom of the homepage**.

---

## The approved design, for whenever the asset arrives

Planned and approved 8 Aug 2026, blocked only on the artwork. Recorded here rather
than left in a session plan file, which does not survive.

**A foot block, not the header.** `.occ-head` (built in `cr-occ-script`'s
`VIEW.innerHTML`) is a tight sticky flex row — back button, title, and the 618 style
switcher — and staging wants clear space equal to the cap "O" on **all** sides. It
does not fit there without crowding the mark.

Append the block to `VIEW` **after** `#occHub` and `#occBody`, so it sits under
whichever screen is showing. That is the point: a rep can hand the tablet over on a
line page or a colour detail, and the disclaimer has to travel with the co-branding
instead of living only on the hub. It carries the lockup, then the
independent-contractor disclaimer verbatim. **No "Proud Installer" line** (not needed
with the lockup) and **no Panther** (nothing submitted).

**Three traps this module has already sprung, so write around them:**

- **`background-color:`, never the `background:` shorthand** — the shorthand resets
  `background-image` and wiped the hero photos at 623.
- **Write these rules UNGATED, deliberately.** 623's lesson was that *style-specific*
  rules must sit inside `@media (min-width:820px)`. This is the opposite case — the
  disclaimer must show at every width — so it belongs outside the media query. Put
  that in a comment or someone will "fix" it.
- **Every `--occ-*` reference needs a literal fallback.** `harness_colors.js` already
  asserts this across the whole stylesheet, so a bare `var()` fails the gate.

**Gates to add** to `harness_colors.js`: the lockup `<img>` exists at its root path;
**no `filter:`, `opacity`, `mix-blend-mode` or recolouring applies to it**; the
disclaimer is present **verbatim** including "LLC" and the closing period; and the
block renders on the hub, a line page and a colour detail. Then `audit_contrast.js`
at phone and both iPad widths, and look at it at the smallest size it appears.

---

## If a mark ever lands in `index.html`

- Reference it like every other root asset: `src="/oc-logo.svg"`. Root files
  ship publicly — that is correct for a logo, and **say so in `.vercelignore`**,
  whose convention is that every entry records a decision either way.
- **Add a gate assertion that no `filter:`, `opacity` shift or recolouring is
  applied to the mark.** That is the rule most easily broken later by a
  well-meant "make it match the theme" change — and 623 is a theme that would
  invite exactly that.
- Do **not** tint the roundel pink to match the palette. It is red or black.
