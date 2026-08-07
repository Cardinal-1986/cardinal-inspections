// Cardinal Roofing and Renovations, LLC — company letterhead template.
// Logo, address, phone and email are taken from the shipped app, not invented:
//   index.html cover-logo data URI  ·  api/share.js footer  ·  api/estimate-to-contract.js
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, VerticalAlign, Header, Footer,
  PageOrientation, PageNumber,
} = require('docx');

const RED   = 'C8202E';   // cardinal red — the app's canonical brand value
const INK   = '1A1A1A';
const GREY  = '5A5A5A';
const FONT  = 'Arial';    // matches the Helvetica house style of the contract PDFs

const LOGO = fs.readFileSync(__dirname + '/cardinal_doc_logo.png');

const NAME    = 'Cardinal Roofing and Renovations, LLC';
const STREET  = '5735 Webster Street';
const CITY    = 'Dayton, OH 45414';
const PHONE   = '937.576.6753';
const EMAIL   = 'Admin@cardinalrenovations.net';
const WEB     = 'www.cardinalrenovations.net';

const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE,
                     insideHorizontal: NONE, insideVertical: NONE };

// right-hand contact stack in the letterhead
function contact(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: opts.after == null ? 12 : opts.after },
    children: [new TextRun({
      text,
      font: FONT,
      size: opts.size || 17,               // half-points → 8.5pt
      bold: !!opts.bold,
      color: opts.color || GREY,
      characterSpacing: opts.track || 0,
    })],
  });
}

// the roof-edge rule: thick cardinal red over a thin dark line.
// lineRule 'exact' clamps the line box so the two rules sit tight together —
// without it the paragraph's default leading opens a visible gap between them.
function ruleThick() {
  return new Paragraph({
    spacing: { before: 40, after: 0, line: 20, lineRule: 'exact' },
    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: RED, space: 0 } },
    children: [new TextRun({ text: '', font: FONT, size: 2 })],
  });
}
function ruleThin() {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: INK, space: 0 } },
    children: [new TextRun({ text: '', font: FONT, size: 2 })],
  });
}

const letterheadHeader = new Header({
  children: [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4300, 5060],
      borders: NO_BORDERS,
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 4300, type: WidthType.DXA },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [new ImageRun({
                type: 'png',
                data: LOGO,
                transformation: { width: 228, height: 134 },  // 1100x647 aspect held
              })],
            })],
          }),
          new TableCell({
            width: { size: 5060, type: WidthType.DXA },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [
              contact(NAME, { bold: true, color: INK, size: 19, after: 40 }),
              contact(STREET),
              contact(CITY, { after: 40 }),
              contact(PHONE),
              contact(EMAIL, { color: RED, bold: true }),
              contact(WEB, { after: 0 }),
            ],
          }),
        ],
      })],
    }),
    ruleThick(),
    ruleThin(),
  ],
});

// continuation pages: no logo, just the name and a page number
const contHeader = new Header({
  children: [
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RED, space: 4 } },
      children: [
        new TextRun({ text: NAME, font: FONT, size: 17, bold: true, color: INK }),
        new TextRun({ text: '  ·  Page ', font: FONT, size: 17, color: GREY }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 17, color: GREY }),
      ],
    }),
  ],
});

const pageFooter = new Footer({
  children: [
    new Paragraph({
      spacing: { before: 0, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RED, space: 1 } },
      children: [new TextRun({ text: '', font: FONT, size: 2 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({
        text: [NAME, STREET + ', ' + CITY, PHONE, EMAIL].join('  ·  '),
        font: FONT, size: 14, color: GREY,
      })],
    }),
  ],
});

// ---- body helpers -------------------------------------------------------
const body = (text, opts = {}) => new Paragraph({
  spacing: { before: 0, after: opts.after == null ? 200 : opts.after, line: 276 },
  children: [new TextRun({
    text, font: FONT, size: 22, color: opts.color || INK, italics: !!opts.italics,
  })],
});
const blank = (after = 0) => new Paragraph({
  spacing: { before: 0, after }, children: [new TextRun({ text: '', font: FONT, size: 22 })],
});

const doc = new Document({
  creator: 'Theodore W. Dorion',
  company: NAME,
  title: 'Cardinal Roofing and Renovations, LLC — Letterhead',
  description: 'Company letterhead template',
  sections: [{
    properties: {
      titlePage: true,                       // page 1 gets the full letterhead
      page: {
        size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
        margin: { top: 2520, bottom: 1440, left: 1440, right: 1440, header: 620, footer: 620 },
      },
    },
    headers: { first: letterheadHeader, default: contHeader },
    footers: { first: pageFooter, default: pageFooter },
    children: [
      blank(260),
      body('[Date]', { color: GREY }),
      blank(60),
      body('[Recipient Name]', { after: 0 }),
      body('[Company or Organization]', { after: 0 }),
      body('[Street Address]', { after: 0 }),
      body('[City, State  ZIP]'),
      blank(60),
      body('Dear [Name]:'),
      body('[Type your letter here. Replace this paragraph with the body of your correspondence.]',
           { color: GREY, italics: true }),
      blank(200),
      blank(200),

      // ---- closing block ----
      body('Sincerely,', { after: 0 }),
      blank(120),
      blank(120),
      blank(120),                            // room for a wet signature
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'Theodore W. Dorion', font: FONT, size: 22, bold: true, color: INK })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'Owner', font: FONT, size: 21, color: RED })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: NAME, font: FONT, size: 19, color: GREY })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(process.argv[2] || 'Cardinal_Letterhead.docx', buf);
  console.log('wrote', process.argv[2], buf.length, 'bytes');
});
