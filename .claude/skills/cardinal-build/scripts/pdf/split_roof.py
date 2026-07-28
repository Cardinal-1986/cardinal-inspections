"""Re-paginate a supplied contract PDF whose first page is one enormous sheet
(18-22 in tall) into letter pages. Verbatim from HANDOFF §6b (build 334).
Doctrine: cut ONLY at full-width blank bands; one common scale for all bands;
strip /Annots after merge; verify words WITHIN page bounds (extract_text lies).
Adjust SEAM per source document — scan for blank bands first (contracts.md §2)."""
from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

LW, LH = letter
MARGIN = 16.0
SEAM = 815.0                       # 20pt full-width gap: after spec columns, before NOTES/WARRANTY boxes

src = PdfReader('new_roof.pdf')
p1 = src.pages[0]
H = float(p1.mediabox.height)

bands = [(0.0, SEAM), (SEAM, H)]                       # top-down coordinates
heights = [b - a for a, b in bands]
scale = min(1.0, (LH - 2 * MARGIN) / max(heights))      # one scale for both pages
print(f'page 1 is {H:.0f}pt tall -> bands {heights[0]:.0f} + {heights[1]:.0f}, common scale {scale*100:.1f}%')

def mask(top_y, bot_y):
    """White cover above/below the visible band."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.setFillColorRGB(1, 1, 1)
    if top_y < LH: c.rect(0, top_y, LW, LH - top_y, stroke=0, fill=1)
    if bot_y > 0:  c.rect(0, 0, LW, bot_y, stroke=0, fill=1)
    c.save(); buf.seek(0)
    return PdfReader(buf).pages[0]

w = PdfWriter()
for t0, t1 in bands:
    y_top = H - t0                       # band edges in PDF (bottom-up) space
    y_bot = H - t1
    tx = (LW - LW * scale) / 2.0
    ty = (LH - MARGIN) - scale * y_top
    page = w.add_blank_page(LW, LH)
    page.merge_transformed_page(p1, Transformation().scale(scale).translate(tx, ty))
    band_top_on_page = scale * y_top + ty
    band_bot_on_page = scale * y_bot + ty
    page.merge_page(mask(band_top_on_page + 2, band_bot_on_page - 2))
    print(f'  band {t0:.0f}-{t1:.0f} -> letter y {band_bot_on_page:.0f}..{band_top_on_page:.0f}')

for p in src.pages[1:]:                  # T&C + both cancellation notices, already letter
    w.add_page(p)

w.add_metadata({
    '/Title': 'Cardinal Roofing & Renovations - Construction Agreement (Print Master)',
    '/Author': 'Cardinal Roofing & Renovations, LLC',
    '/Subject': 'Construction Agreement, Terms and Conditions, and duplicate Notice of Cancellation (ORC 1345.23)',
})
with open('Cardinal_Roofing_Contract.pdf', 'wb') as fh:
    w.write(fh)
print('written: Cardinal_Roofing_Contract.pdf')
