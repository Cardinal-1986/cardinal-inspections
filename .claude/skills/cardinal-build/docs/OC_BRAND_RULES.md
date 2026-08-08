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

⚠️ **Preferred Contractor / Platinum Preferred Contractor lockups are separate
artwork with their own rules, and with those the "Proud Installer" line is NOT
needed.** Their "ARC" and type are always white, and which version to use
depends on how dark the background is. **Ask Theo which status Cardinal holds
before choosing an asset.**

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

## If a mark ever lands in `index.html`

- Reference it like every other root asset: `src="/oc-logo.svg"`. Root files
  ship publicly — that is correct for a logo, and **say so in `.vercelignore`**,
  whose convention is that every entry records a decision either way.
- **Add a gate assertion that no `filter:`, `opacity` shift or recolouring is
  applied to the mark.** That is the rule most easily broken later by a
  well-meant "make it match the theme" change — and 623 is a theme that would
  invite exactly that.
- Do **not** tint the roundel pink to match the palette. It is red or black.
