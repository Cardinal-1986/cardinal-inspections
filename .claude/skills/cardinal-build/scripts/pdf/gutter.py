"""Cardinal gutter Construction Agreement — one layout, two outputs.
Verbatim from HANDOFF §6c (build 334). NEVER maintain two layouts.

MODE 'fill'  -> AcroForm fields (grey boxes, fillable on screen)
MODE 'print' -> ruled writing lines, flattened, nothing fillable

Inputs: logos/lg-000.png (OC Preferred Contractor), lg-001 (BBB), lg-002 (Cardinal).
Re-extract from the roofing fillable if absent:
    pdfimages -png -f 1 -l 1 src.pdf logos/lg
Decisions baked in (do NOT re-litigate — references/contracts.md §3):
ShurFlo Flat/X/Step-Down only; hidden hangers Yes/No; no linear-feet fields;
no underground drain; wood priced per board; no stroked/faux-bold text;
generic 5-yr T&C, not the Owens Corning version."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.colors import Color

LW, LH = letter
M = 42.0
W = LW - 2 * M
RED = Color(0.788, 0.129, 0.176)
GREY = Color(0.956863, 0.956863, 0.956863)
DARK = Color(0.1, 0.1, 0.1)
MUTED = Color(0.42, 0.42, 0.42)
COL_L, COL_R = 42.0, 315.0
COLW = 255.0

LOGO_OC = 'logos/lg-000.png'
LOGO_BBB = 'logos/lg-001.png'
LOGO_CARD = 'logos/lg-002.png'


class Doc:
    def __init__(self, path, mode):
        self.c = canvas.Canvas(path, pagesize=letter)
        self.mode = mode
        self.c.setTitle('Cardinal Roofing & Renovations - Gutter Construction Agreement')
        self.c.setAuthor('Cardinal Roofing & Renovations, LLC')

    # ---------- primitives ----------
    def rule(self, x1, y, x2, w=0.7):
        self.c.setStrokeColor(MUTED); self.c.setLineWidth(w); self.c.line(x1, y, x2, y)

    def heavy(self, x, y, txt, size, color, weight=0.3):
        """Plain Helvetica-Bold. No stroke - stroking muddied the reds."""
        self.c.setFillColor(color)
        self.c.setFont('Helvetica-Bold', size)
        self.c.drawString(x, y, txt)

    def label(self, x, y, txt, size=6.6, strong=False):
        if strong:
            self.heavy(x, y, txt.upper(), size + 0.8, Color(0.13, 0.13, 0.13), 0.22)
            return
        self.c.setFillColor(Color(0.35, 0.35, 0.35))
        self.c.setFont('Helvetica-Bold', size)
        self.c.drawString(x, y, txt.upper())

    def text(self, x, y, txt, size=8.2, bold=False, color=DARK):
        self.c.setFillColor(color)
        self.c.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
        self.c.drawString(x, y, txt)

    def field(self, name, x, y, w, h=13.0):
        """Text field: fillable widget or a printed writing line."""
        if self.mode == 'fill':
            self.c.acroForm.textfield(
                name=name, x=x, y=y, width=w, height=h,
                borderWidth=0, fillColor=GREY, textColor=DARK,
                fontSize=9, forceBorder=False)
        else:
            self.rule(x, y + 1.0, x + w)

    def check(self, name, x, y, size=8.5):
        if self.mode == 'fill':
            self.c.acroForm.checkbox(
                name=name, x=x, y=y, size=size, borderWidth=0.8,
                borderColor=Color(0.25, 0.25, 0.25), fillColor=Color(1, 1, 1),
                buttonStyle='check', checked=False)
        else:
            self.c.setStrokeColor(Color(0.25, 0.25, 0.25)); self.c.setLineWidth(0.8)
            self.c.rect(x, y, size, size, stroke=1, fill=0)

    def cbox(self, name, x, y, txt, size=8.2):
        """Checkbox followed by its caption; returns x after the caption."""
        self.check(name, x, y - 1.0)
        self.text(x + 12.5, y, txt, size)
        return x + 12.5 + self.c.stringWidth(txt, 'Helvetica', size)

    def bar(self, y, txt):
        self.c.setFillColor(RED); self.c.rect(M, y - 4.5, W, 16.5, stroke=0, fill=1)
        self.c.setFillColor(Color(1, 1, 1)); self.c.setFont('Helvetica-Bold', 8.6)
        self.c.drawString(M + 7, y, txt.upper())
        return y - 20

    def num(self, x, y, txt):
        self.heavy(x, y, txt.upper(), 8.3, RED, 0.32)
        self.c.setStrokeColor(Color(0.86, 0.80, 0.80)); self.c.setLineWidth(0.5)
        self.c.line(x, y - 3.5, x + COLW, y - 3.5)
        return y - 13

    def para(self, x, y, txt, w, size=6.9, leading=8.4):
        st = ParagraphStyle('p', fontName='Helvetica', fontSize=size, leading=leading,
                            alignment=TA_LEFT, textColor=Color(0.3, 0.3, 0.3))
        p = Paragraph(txt, st)
        _, h = p.wrap(w, LH)
        p.drawOn(self.c, x, y - h)
        return y - h - 4

    # ---------- pages ----------
    def header(self):
        c = self.c
        c.drawImage(LOGO_OC, M, LH - 70, width=100.4, height=28, mask='auto')
        c.drawImage(LOGO_BBB, M, LH - 98.4, width=58, height=22.4, mask='auto')
        c.drawImage(LOGO_CARD, 252, LH - 99.6, width=108, height=59.6, mask='auto')
        c.setFillColor(DARK); c.setFont('Helvetica-Bold', 10)
        c.drawRightString(LW - M, LH - 52, 'Cardinal Roofing & Renovations, LLC')
        c.setFont('Helvetica', 6.8); c.setFillColor(Color(0.35, 0.35, 0.35))
        for i, ln in enumerate(['5735 Webster Street', 'Dayton, OH 45414',
                                'Office: 937.576.6753', 'Admin@cardinalrenovations.net',
                                'www.Cardinalrenovations.net']):
            c.drawRightString(LW - M, LH - 62 - i * 8, ln)
        y = LH - 106
        c.setStrokeColor(Color(0.75, 0.75, 0.75)); c.setLineWidth(0.6)
        c.line(M, y, LW - M, y)
        c.setFillColor(DARK); c.setFont('Helvetica-Bold', 10.5)
        c.drawCentredString(LW / 2, y - 14, 'GUTTER  CONSTRUCTION  AGREEMENT')
        self.label(LW - M - 130, y - 14, 'DATE', strong=True)
        self.field('agreement_date', LW - M - 100, y - 17, 100, 12)
        c.setStrokeColor(Color(0.75, 0.75, 0.75)); c.setLineWidth(0.6)
        c.line(M, y - 24, LW - M, y - 24)
        return y - 38

    def page1(self):
        c = self.c
        y = self.header()

        # ---- customer information ----
        y = self.bar(y, 'Customer information')
        rows = [('BUYER', 'buyer', 'CO-BUYER', 'co_buyer'),
                ('EMAIL', 'email', 'PHONE NUMBER', 'phone'),
                ('STREET', 'street', 'CITY', 'city')]
        for l1, n1, l2, n2 in rows:
            self.label(COL_L, y, l1, strong=True); self.label(COL_R, y, l2, strong=True)
            self.field(n1, COL_L, y - 16, 255); self.field(n2, COL_R, y - 16, 255)
            y -= 29
        self.label(COL_L, y, 'STATE', strong=True); self.label(COL_L + 165, y, 'ZIP', strong=True)
        self.label(COL_R, y, 'PRIMARY RESIDENCE', strong=True)
        self.field('state', COL_L, y - 16, 150)
        self.field('zip', COL_L + 165, y - 16, 90)
        x = self.cbox('primary_yes', COL_R, y - 13, 'Yes')
        self.cbox('primary_no', x + 22, y - 13, 'No')
        y -= 30
        y = self.para(M, y, 'Buyer(s) hereby jointly and severally agrees to purchase the products and/or services of '
                            'Cardinal Roofing &amp; Renovations, LLC ("Contractor") as listed herein, in accordance with the '
                            'terms and conditions described in this Agreement, the accompanying Terms and Conditions form, '
                            'and any accompanying specification sheet(s).', W)
        y -= 8

        # ---- project specifications ----
        y = self.bar(y, 'Project specifications')
        top = y
        yl = y

        yl = self.num(COL_L, yl, '1.  Removal & Disposal')
        for lab, key in [('A. Remove existing gutters', 'rm_gutter'),
                         ('B. Remove existing downspouts', 'rm_ds'),
                         ('C. Haul away & dispose debris', 'haul')]:
            self.text(COL_L, yl, lab)
            x = self.cbox(f'{key}_yes', COL_L + 145, yl, 'Yes')
            self.cbox(f'{key}_no', x + 14, yl, 'No')
            yl -= 15
        yl -= 3

        yl = self.num(COL_L, yl, '2.  Gutter Profile & Size')
        x = self.cbox('prof_k', COL_L, yl, 'A. K-Style')
        x = self.cbox('prof_half', x + 16, yl, 'B. Half-Round')
        self.cbox('prof_box', x + 16, yl, 'C. Box'); yl -= 15
        x = self.cbox('size_5', COL_L, yl, '5 in.')
        x = self.cbox('size_6', x + 16, yl, '6 in.')
        self.cbox('size_7', x + 16, yl, '7 in.'); yl -= 18

        yl = self.num(COL_L, yl, '3.  Gutter Material')
        x = self.cbox('mat_027', COL_L, yl, 'A. Aluminum .027')
        self.cbox('mat_032', x + 16, yl, 'B. Aluminum .032'); yl -= 15
        x = self.cbox('mat_steel', COL_L, yl, 'C. Steel')
        x = self.cbox('mat_copper', x + 16, yl, 'D. Copper')
        self.cbox('mat_other', x + 16, yl, 'E. Other'); yl -= 18

        yl = self.num(COL_L, yl, '4.  Gutter Color')
        self.text(COL_L, yl, 'Color'); self.field('gutter_color', COL_L + 30, yl - 3, 225, 11); yl -= 18

        yl = self.num(COL_L, yl, '5.  Hangers')
        self.text(COL_L, yl, 'Hidden hangers')
        x = self.cbox('hang_yes', COL_L + 145, yl, 'Yes')
        self.cbox('hang_no', x + 14, yl, 'No'); yl -= 18

        yl = self.num(COL_L, yl, '6.  Miters & Seams')
        x = self.cbox('mit_strip', COL_L, yl, 'A. Strip miters')
        self.cbox('mit_box', x + 16, yl, 'B. Box miters'); yl -= 15
        x = self.cbox('mit_hand', COL_L, yl, 'C. Hand-mitered')
        self.cbox('mit_seal', x + 16, yl, 'D. Sealed'); yl -= 18

        yl = self.num(COL_L, yl, '7.  Downspouts')
        x = self.cbox('ds_2x3', COL_L, yl, 'A. 2x3')
        x = self.cbox('ds_3x4', x + 16, yl, 'B. 3x4')
        self.cbox('ds_round', x + 16, yl, 'C. Round'); yl -= 15
        self.text(COL_L, yl, 'Color'); self.field('ds_color', COL_L + 30, yl - 3, 130, 11)
        self.text(COL_L + 166, yl, 'Qty'); self.field('ds_qty', COL_L + 186, yl - 3, 69, 11); yl -= 18

        yl = self.num(COL_L, yl, '8.  Downspout Discharge')
        x = self.cbox('dis_splash', COL_L, yl, 'A. Splash blocks')
        self.cbox('dis_ext', x + 16, yl, 'B. Extensions'); yl -= 15
        self.cbox('dis_tie', COL_L, yl, 'C. Tie to existing'); yl -= 20

        nb = 74
        self.c.setStrokeColor(Color(0.85, 0.85, 0.85)); self.c.setLineWidth(0.7)
        self.c.setFillColor(Color(0.995, 0.995, 0.995))
        self.c.rect(COL_L, yl - nb, COLW, nb, stroke=1, fill=1)
        self.heavy(COL_L + 8, yl - 12, 'NOTES', 7.6, RED, 0.3)
        ny = yl - 28
        for i in range(3):
            self.field(f'spec_note{i+1}', COL_L + 8, ny, COLW - 16, 11)
            ny -= 16
        yl -= nb + 6

        # ---- right column ----
        yr = top
        yr = self.num(COL_R, yr, '9.  Gutter Protection  -  ShurFlo')
        x = self.cbox('gp_flat', COL_R, yr, 'A. ShurFlo Flat')
        self.cbox('gp_x', x + 16, yr, 'B. ShurFlo X (ventilation)'); yr -= 15
        x = self.cbox('gp_step', COL_R, yr, 'C. ShurFlo Step-Down')
        self.text(x + 8, yr, '(Quick-Screw hangers)', 7); yr -= 15
        self.text(COL_R, yr, 'Finish', 7.6, bold=True)
        x = self.cbox('gp_mill', COL_R + 34, yr, 'Mill', 7.8)
        x = self.cbox('gp_black', x + 12, yr, 'Black', 7.8)
        x = self.cbox('gp_white', x + 12, yr, 'White', 7.8)
        self.cbox('gp_copper', x + 12, yr, 'Copper', 7.8); yr -= 15
        x = self.cbox('gp_5', COL_R, yr, '5 in.')
        self.cbox('gp_6', x + 14, yr, '6 in.'); yr -= 14
        yr = self.para(COL_R, yr, 'Panels install into the gutter, not under the roof shingles, and do not void the roof '
                                  'warranty. Carries a 25-year transferable manufacturer warranty from US Aluminum.',
                       COLW, 6.4, 7.6)
        yr -= 4
        x = self.cbox('gp_none', COL_R, yr, 'No gutter protection on this job', 7.8); yr -= 18

        yr = self.num(COL_R, yr, '10.  Fascia & Soffit')
        x = self.cbox('fa_wrap', COL_R, yr, 'A. Fascia wrap')
        self.text(x + 16, yr, 'Color'); self.field('fa_color', x + 46, yr - 3, 94, 11); yr -= 15
        self.cbox('fa_board', COL_R, yr, 'B. Replace fascia board'); yr -= 15
        self.cbox('fa_soffit', COL_R, yr, 'C. Soffit repair / replace'); yr -= 18

        yr = self.num(COL_R, yr, '11.  Wood Replacement')
        self.text(COL_R, yr, 'Inspect fascia and replace rotted wood as needed', 7.6); yr -= 14
        self.text(COL_R, yr, 'Rate  $'); self.field('wood_rate', COL_R + 34, yr - 3, 70, 11)
        self.text(COL_R + 110, yr, 'per board  (billed as an extra)', 7.6); yr -= 18

        yr = self.num(COL_R, yr, '12.  Extra Structure')
        x = self.cbox('ex_garage', COL_R, yr, 'A. Garage')
        x = self.cbox('ex_shed', x + 16, yr, 'B. Shed')
        self.cbox('ex_barn', x + 16, yr, 'C. Barn'); yr -= 15
        x = self.cbox('ex_porch', COL_R, yr, 'D. Porch / patio cover'); yr -= 18

        yr = self.num(COL_R, yr, '13.  Access & Height')
        self.text(COL_R, yr, 'Stories'); self.field('stories', COL_R + 34, yr - 3, 46, 11)
        x = self.cbox('steep', COL_R + 92, yr, 'Steep / limited access')
        yr -= 16
        yr = self.para(COL_R, yr, 'Not responsible for pre-existing fascia rot or damage concealed behind '
                                  'existing gutters, or for re-attachment of satellite dishes and wiring.', COLW, 6.4, 7.6)
        yr -= 4

        # warranty box
        bh = 62
        self.c.setStrokeColor(Color(0.85, 0.85, 0.85)); self.c.setLineWidth(0.7)
        self.c.setFillColor(Color(0.985, 0.985, 0.985))
        self.c.rect(COL_R, yr - bh, COLW, bh, stroke=1, fill=1)
        self.text(COL_R + 8, yr - 13, 'WARRANTY', 7.6, bold=True, color=RED)
        x = self.cbox('war_std', COL_R + 8, yr - 28, 'Standard', 7.8)
        self.text(COL_R + 22, yr - 36, '5-Yr Cardinal workmanship', 6.4, color=MUTED)
        x = self.cbox('war_up', COL_R + 8, yr - 48, 'Upgraded', 7.8)
        self.text(COL_R + 22, yr - 56, '10-Yr Cardinal workmanship', 6.4, color=MUTED)
        yr -= bh + 6

        self.c.showPage()

    def page2(self):
        c = self.c
        # slim header
        c.drawImage(LOGO_CARD, M, LH - 76, width=86, height=47.5, mask='auto')
        c.setFillColor(DARK); c.setFont('Helvetica-Bold', 9)
        c.drawRightString(LW - M, LH - 46, 'Cardinal Roofing & Renovations, LLC')
        c.setFont('Helvetica', 7); c.setFillColor(Color(0.35, 0.35, 0.35))
        c.drawRightString(LW - M, LH - 56, '5735 Webster Street, Dayton, OH 45414   -   937.576.6753')
        c.setFont('Helvetica-Bold', 8)
        c.setFillColor(DARK)
        c.drawRightString(LW - M, LH - 68, 'GUTTER CONSTRUCTION AGREEMENT   -   page 2 of 2')
        y = LH - 88
        c.setStrokeColor(Color(0.75, 0.75, 0.75)); c.setLineWidth(0.6); c.line(M, y, LW - M, y)
        y -= 22

        # HOA
        y = self.bar(y, 'HOA / Authorization')
        self.text(COL_L, y, 'HOA Approval Required:', bold=True)
        x = self.cbox('hoa_yes', COL_L + 120, y, 'Yes')
        self.cbox('hoa_no', x + 22, y, 'No')
        self.label(COL_R + 180, y, 'INITIALS')
        self.field('hoa_initials', COL_R + 218, y - 3, 37, 11)
        y -= 14
        self.text(COL_L, y, 'Buyer to obtain required authorization from HOA and authorities.', 7, color=MUTED)
        y -= 22

        # timeline
        y = self.bar(y, 'Project timeline')
        self.text(COL_L, y, 'The anticipated start date is')
        self.field('start_weeks', COL_L + 128, y - 3, 52, 11)
        self.text(COL_L + 186, y, 'weeks from the date on which all HOA permissions, permits, and')
        y -= 16
        self.text(COL_L, y, 'other contingencies necessary to complete the project are obtained, and the anticipated')
        y -= 16
        self.text(COL_L, y, 'completion date is')
        self.field('finish_weeks', COL_L + 84, y - 3, 52, 11)
        self.text(COL_L + 142, y, 'weeks from the actual start date.')
        y -= 24

        # notes + insurance
        y = self.bar(y, 'Notes & insurance claim')
        self.label(COL_L, y, 'NOTES'); self.label(COL_R, y, 'INSURANCE CO.')
        self.field('notes1', COL_L, y - 15, 255); self.field('ins_co', COL_R, y - 15, 255)
        self.field('notes2', COL_L, y - 30, 255)
        self.label(COL_R, y - 25, 'CLAIM #')
        self.field('claim_no', COL_R, y - 40, 255)
        y -= 46

        ib = 34
        self.c.setStrokeColor(Color(0.85, 0.85, 0.85)); self.c.setLineWidth(0.7)
        self.c.setFillColor(Color(0.995, 0.995, 0.995))
        self.c.rect(M, y - ib, W, ib, stroke=1, fill=1)
        self.para(M + 8, y - 4, 'Buyer(s) acknowledges that Contractor is due any and all monies received from any '
                                'insurance company pursuant to an insurance claim, including overhead and profit, '
                                'approved cost increases, and approved claim supplements.', W - 120, 6.9, 8.4)
        self.label(LW - M - 106, y - 12, 'INITIALS')
        self.field('ins_initials', LW - M - 66, y - 15, 58, 11)
        y -= ib + 8

        y = self.para(M, y, 'Buyer(s) hereby acknowledges that Buyer(s) has read this Agreement and the accompanying '
                            'Terms and Conditions, understands the terms of this Agreement, has received a completed, '
                            'signed, and dated copy of this Agreement on the date first written above, and was orally '
                            'advised of his/her right to cancel this transaction.', W)
        y -= 6

        # payment + right to cancel
        ytop = y
        y = self.bar(y, 'Payment structure')
        pay = [('CONTRACT PRICE', 'contract_price'), ('DOWN PAYMENT', 'down_payment'),
               ('BALANCE DUE ON COMPLETION', 'balance_due'), ('TOTAL COST', 'total_cost')]
        yy = y
        for lab, name in pay:
            self.text(COL_L, yy, '$', bold=True)
            self.field(name, COL_L + 10, yy - 3, 110, 12)
            self.label(COL_L + 130, yy, lab, 7)
            yy -= 20
        self.text(COL_L, yy, 'Cash on Completion  or  Financed:', 7, color=MUTED); yy -= 16
        self.text(COL_L, yy, '$', bold=True)
        self.field('fin_monthly', COL_L + 10, yy - 3, 80, 12)
        self.label(COL_L + 98, yy, 'PER MONTH FOR', 7)
        self.field('fin_months', COL_L + 168, yy - 3, 40, 12)
        self.label(COL_L + 214, yy, 'MONTHS', 7)

        # right to cancel box
        bx, bw, bh = COL_R, COLW, 96
        self.c.setStrokeColor(RED); self.c.setLineWidth(0.8)
        self.c.setFillColor(Color(0.996, 0.976, 0.976))
        self.c.rect(bx, y - bh + 12, bw, bh, stroke=1, fill=1)
        self.text(bx + 8, y, 'RIGHT TO CANCEL', 8, bold=True, color=RED)
        self.para(bx + 8, y - 6, 'You, the buyer, may cancel this transaction at any time prior to midnight of the '
                                 'third business day after the date of this transaction. See the attached notice of '
                                 'cancellation form for an explanation of this right.', bw - 16, 7, 8.6)
        self.label(bx + 8, y - 60, 'INITIALS')
        self.field('cancel_initials', bx + 50, y - 63, 80, 11)
        y = min(yy, y - bh + 12) - 24

        # signatures
        y = self.bar(y, 'Signatures')
        cols = [(COL_L, 'Cardinal Roofing & Renovations, LLC', 'co'),
                (COL_L + 186, 'Buyer', 'buyer'),
                (COL_L + 372, 'Co-Buyer', 'cobuyer')]
        for x, title, key in cols:
            self.text(x, y, title, 8, bold=True)
        y -= 20
        for lab, suffix in [('PRINTED NAME', 'print'), ('SIGNATURE', 'sign'), ('DATE', 'date')]:
            for x, _, key in cols:
                wdt = 100 if lab == 'DATE' else 156
                self.field(f'{key}_{suffix}', x, y, wdt, 13)
                self.label(x, y - 11, lab)
            y -= 30

        self.text(M, 44, 'Cardinal Roofing & Renovations, LLC is an independent contractor and is not an affiliate of '
                         'Owens Corning Roofing and Asphalt, LLC or its affiliated companies.', 6.2, color=MUTED)
        self.text(M, 35, 'Cardinal Roofing & Renovations, LLC  -  Gutter Construction Agreement', 6.2, color=MUTED)
        self.c.showPage()

    def save(self):
        self.c.save()


def build(path, mode):
    d = Doc(path, mode)
    d.page1()
    d.page2()
    d.save()
    return path


if __name__ == '__main__':
    build('gutter_fill_body.pdf', 'fill')
    build('gutter_print_body.pdf', 'print')
    print('both gutter agreement bodies built')
