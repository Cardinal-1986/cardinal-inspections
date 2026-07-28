"""ORC 1345.23(B)(2) Notice of Cancellation — two copies, letter pages.
Verbatim from the build-334 contracts session (HANDOFF §6a). Runs standalone.
Legal content: transcribed from the statute. DO NOT silently reword — see
references/contracts.md. ASCII only: bullets encode badly in Helvetica."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

LW, LH = letter
M = 42.0
W = LW - 2*M
RED = (0.788, 0.129, 0.176)
SEP = '   -   '                        # ASCII only: bullets encode badly in Helvetica

BODY = [
 "You may cancel this transaction, without any penalty or obligation, within three business days from the above date.",
 "If you cancel, any property traded in, any payments made by you under the contract or sale, and any negotiable instrument executed by you will be returned within ten business days following receipt by the seller of your cancellation notice, and any security interest arising out of the transaction will be cancelled.",
 "If you cancel, you must make available to the seller at your residence, in substantially as good condition as when received, any goods delivered to you under this contract or sale; or you may if you wish, comply with the instructions of the seller regarding the return shipment of the goods at the seller's expense and risk.",
 "If you do make the goods available to the seller and the seller does not pick them up within twenty days of the date of your notice of cancellation, you may retain or dispose of the goods without any further obligation. If you fail to make the goods available to the seller, or if you agree to return the goods to the seller and fail to do so, then you remain liable for performance of all obligations under the contract.",
]
ST = ParagraphStyle('s', fontName='Helvetica-Bold', fontSize=10, leading=12.8, alignment=TA_LEFT)

def rule(c, x1, y, x2, w=0.7, g=0.42):
    c.setStrokeColorRGB(g, g, g); c.setLineWidth(w); c.line(x1, y, x2, y)

def page(c, label):
    y = LH - 42
    c.setFont('Helvetica-Bold', 12); c.setFillColorRGB(0.1, 0.1, 0.1)
    c.drawString(M, y, 'Cardinal Roofing & Renovations, LLC')
    c.setFont('Helvetica', 8.5); c.setFillColorRGB(0.35, 0.35, 0.35)
    c.drawRightString(LW - M, y + 2, '5735 Webster Street, Dayton, OH 45414' + SEP + '937.576.6753')
    y -= 11
    c.setStrokeColorRGB(*RED); c.setLineWidth(1.4); c.line(M, y, LW - M, y)
    y -= 28

    c.setFillColorRGB(*RED); c.rect(M, y - 5, W, 21, stroke=0, fill=1)
    c.setFillColorRGB(1, 1, 1); c.setFont('Helvetica-Bold', 11.5)
    c.drawString(M + 9, y + 2, 'NOTICE OF CANCELLATION')
    c.setFont('Helvetica-Bold', 8.5)
    c.drawRightString(LW - M - 9, y + 2.5, label)
    y -= 32

    c.setFillColorRGB(0.1, 0.1, 0.1); c.setFont('Helvetica-Bold', 10)
    c.drawString(M, y, '(enter date of transaction)')
    y -= 24
    rule(c, M, y, M + 215)
    c.setFont('Helvetica', 8); c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(M, y - 10, '(Date)')
    y -= 30

    # statutory paragraphs, measured so nothing is clipped and no dead space is left
    for t in BODY:
        p = Paragraph(t, ST)
        w, h = p.wrap(W, LH)
        p.drawOn(c, M, y - h)
        y -= h + 9

    y -= 12
    c.setFillColorRGB(0.1, 0.1, 0.1); c.setFont('Helvetica-Bold', 10)
    for ln in [
        "To cancel this transaction, mail, with return receipt requested, or deliver, in person or manually, a",
        "signed and dated copy of this cancellation notice or any other written notice of cancellation, or send",
        "notice by facsimile transmission or electronic mail, to",
    ]:
        c.drawString(M, y, ln); y -= 12.8
    y -= 6

    c.setFont('Helvetica-Bold', 10)
    c.drawString(M, y, 'Cardinal Roofing & Renovations, LLC')
    c.setFont('Helvetica', 8); c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(M + 215, y, '(Name of seller)')
    y -= 16
    c.setFillColorRGB(0.1, 0.1, 0.1); c.setFont('Helvetica-Bold', 10)
    c.drawString(M, y, 'at  5735 Webster Street, Dayton, OH 45414' + SEP + 'Admin@cardinalrenovations.net')
    y -= 12
    c.setFont('Helvetica', 8); c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(M + 14, y, "(address, electronic mail address, or facsimile number of seller's place of business)")
    y -= 26
    c.setFillColorRGB(0.1, 0.1, 0.1); c.setFont('Helvetica-Bold', 10)
    c.drawString(M, y, 'not later than midnight of')
    rule(c, M + 140, y - 2, M + 340)
    c.setFont('Helvetica', 8); c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(M + 140, y - 12, '(Date)')
    y -= 34

    c.setFillColorRGB(0.1, 0.1, 0.1); c.setFont('Helvetica-Bold', 10)
    c.drawString(M, y, 'I hereby cancel this transaction.')
    y -= 42
    rule(c, M, y, M + 175); rule(c, M + 215, y, LW - M)
    c.setFont('Helvetica', 8); c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(M, y - 11, 'Date')
    c.drawString(M + 215, y - 11, "(Buyer's signature)")
    print(f'  {label[:14]:<14} content ends at y={y-11:.0f} (page bottom 0)')

    c.setFont('Helvetica', 7.5); c.setFillColorRGB(0.45, 0.45, 0.45)
    c.drawString(M, 34, 'Cardinal Roofing & Renovations, LLC - Notice of Cancellation' + SEP + 'Required by Ohio Revised Code 1345.23(B)(2)')
    c.drawRightString(LW - M, 34, label)
    c.showPage()

if __name__ == '__main__':
    c = canvas.Canvas('notice.pdf', pagesize=letter)
    page(c, "BUYER'S COPY - DETACH AND KEEP")
    page(c, "SELLER'S COPY - RETURN TO CANCEL")
    c.save()
    print('notice.pdf rebuilt')
