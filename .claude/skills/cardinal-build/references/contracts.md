# Contract PDFs — workflow, doctrine, settled decisions

*From the build-334 contracts session (HANDOFF). The generator scripts live in `scripts/pdf/` — they were previously lost on every container reset; the skill is now their permanent home.*

## 1. The package structure

Every trade contract is: **Agreement (2 letter pages) → Terms & Conditions → Notice of Cancellation ×2**. Masters live in the repo at `docs/` (e.g. `docs/Cardinal_Roofing_Contract.pdf`); the app's Company Documents rows link there. Trades: Roofing (Theo's own doc, re-paginated), Gutters (built from scratch, print + 95-field fillable), Siding and Windows (masters from July 20, *"Digital roofing contract formatting"* chat — will need the same re-pagination).

## 2. The re-pagination problem (it will happen again)

Supplied contract PDFs arrive with a **single enormous first page** — 18–22 in tall. On letter that shrinks to ~50–60% or loses the bottom third. Any new trade PDF Theo supplies will almost certainly have it. The fix (`scripts/pdf/split_roof.py` — adjust `SEAM` per document):

1. Scan for **full-width blank bands** (no chars/rects/lines/curves/images crossing that y). Cut only there.
2. If resulting bands still exceed 756 pt, scale **all bands by one common ratio** so pages look identical (roofing needed 93.3%).
3. Merge each band onto a blank letter page: `merge_transformed_page` + `Transformation().scale(s).translate(tx, ty)`.
4. White-mask the spill above/below the band. Content outside the MediaBox is clipped by printers, but mask anyway. (This is why split output legitimately contains off-page words — `verify_pdf.py --allow-offpage`.)
5. **Strip `/Annots`** — `merge_transformed_page` copies annotations, which then render at wrong positions.
6. Verify by counting words **within page bounds** (`0 <= top <= 792`) — `extract_text()` also returns off-page text and will lie.

## 3. Gutter agreement — decisions already made (do NOT re-litigate)

- **ShurFlo** (US Aluminum) is the gutter protection they sell. Styles: **Flat**, **X** (ventilation), **Step-Down** (goes over an *existing* spike-and-ferrule gutter; Quick-Screw/Speed-Screw hangers). Finishes mill/black/white/copper; sizes 5"/6". Printed selling points: panels sit in the gutter, not under the shingles (no roof-warranty void); 25-yr transferable manufacturer warranty.
- **They do not install spikes and ferrules** — hidden hangers only, a Yes/No.
- **No linear-feet fields anywhere** (removed on purpose; downspouts keep colour + qty only). **No underground drain.** Removal & Disposal is three Yes/No pairs. Wood replacement priced **per board**.
- **No stroked/faux-bold text** — stroking muddied the Cardinal red. Helvetica-Bold at larger size is the only emphasis. (`verify_pdf.py` proves `'2 Tr'` absent.)
- Uses the **generic** 5-yr T&C, *not* the Owens Corning version — OC tiers cover roofing systems, not gutters.
- **One layout, two outputs**: `gutter.py build(path,'fill')` emits AcroForm fields, `build(path,'print')` emits ruled lines. **Never maintain two layouts.**

## 4. Legal content — handle carefully

The Notice of Cancellation pages reproduce the form prescribed by **Ohio Revised Code § 1345.23(B)(2)** (transcribed from codes.ohio.gov). The statute requires: completed form, **in duplicate**, captioned "notice of cancellation", attached, **easily detachable**, **ten-point bold-face type**. (B)(3): the *seller* fills in name, address/email, transaction date, and cancel-by date **before** furnishing — hence the pre-printed seller block and two blank date rules.

**Nobody in this loop is a lawyer.** The wording is accurate to the statute as published; whether the layout satisfies Cardinal's obligations is for Theo's attorney. **Do not silently reword these pages.** ASCII only — bullets encode badly in Helvetica.

## 5. Inputs a fresh session needs

- `tc.pdf` — the generic 5-yr T&C (`Cardinal_Terms_and_Conditions_2.pdf`, re-uploaded by Theo)
- `logos/lg-000.png` (OC Preferred Contractor), `lg-001` (BBB), `lg-002` (Cardinal) — re-extract from the roofing fillable: `pdfimages -png -f 1 -l 1 src.pdf logos/lg`

## 6. Workflow

```bash
cd /home/claude/pdfwork && cp <skill>/scripts/pdf/*.py .
python3 notice.py                          # ORC notice ×2 → notice.pdf
python3 gutter.py                          # both agreement bodies (needs logos/)
python3 assemble.py gutter_print_body.pdf Cardinal_Gutter_Contract.pdf   # needs tc.pdf
python3 verify_pdf.py Cardinal_Gutter_Contract.pdf --print-master
python3 verify_pdf.py Cardinal_Gutter_Contract_Fillable.pdf --fillable 95
# split output instead: verify_pdf.py OUT.pdf --right-margin 15 --bottom-margin 15 --print-master --allow-offpage
```

**Claude cannot see the render — say so.** `verify_pdf.py` proves overlap/margins/rules/fields/stroking; pixels are Theo's eyes. On GitHub mobile, `docs/` is created by typing the path `docs/<file>` in the create-file screen.
