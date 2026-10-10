#!/usr/bin/env python3
"""Minimal OOXML .xlsx writer — standard library only.

Exists because this container has no openpyxl and PyPI is blocked by the
network policy (403). An .xlsx is a zip of XML parts, so the dependency is
avoidable rather than fatal. Scope is exactly what the AccuLynx sheet needs:
inline strings, numbers, formulas, a handful of named styles, column widths,
frozen panes and an autofilter.

Formulas are written WITHOUT cached values and the workbook sets
fullCalcOnLoad, so Excel/LibreOffice computes them on open. The caller still
round-trips through soffice to prove they evaluate.
"""
import zipfile

# style ids, in the order they are declared in cellXfs below
S_DEFAULT, S_HEAD, S_BODY, S_BODY_GREY, S_TITLE, S_NOTE, S_BOLD, S_PCT = range(8)


def esc(v):
    s = '' if v is None else str(v)
    s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return ''.join(c for c in s if c >= ' ' or c in '\t\n')


def colname(n):
    s = ''
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


class Cell:
    __slots__ = ('v', 's', 'f', 'num', 'cached')

    def __init__(self, v=None, s=S_DEFAULT, f=None, num=False, cached=None):
        self.v, self.s, self.f, self.num = v, s, f, num
        # Every formula also ships its Python-computed result. Without a
        # cached value a formula cell reads as empty to anything that does
        # not recalculate, and this container has no working LibreOffice to
        # recalculate with — so the number has to be right on arrival.
        self.cached = cached


class Sheet:
    def __init__(self, name):
        self.name = name
        self.rows = []          # list of list of Cell
        self.widths = {}        # 1-based col -> width
        self.freeze = None      # (cols_frozen, rows_frozen)
        self.autofilter = None  # "A1:U239"
        self.row_heights = {}   # 1-based row -> height

    def add(self, cells):
        self.rows.append(cells)

    def xml(self):
        out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
               '<worksheet xmlns="http://schemas.openxmlformats.org/'
               'spreadsheetml/2006/main">']
        if self.rows:
            out.append('<dimension ref="A1:%s%d"/>'
                       % (colname(max(len(r) for r in self.rows)), len(self.rows)))
        if self.freeze:
            x, y = self.freeze
            out.append(
                '<sheetViews><sheetView workbookViewId="0">'
                '<pane xSplit="%d" ySplit="%d" topLeftCell="%s%d" '
                'activePane="bottomRight" state="frozen"/></sheetView>'
                '</sheetViews>' % (x, y, colname(x + 1), y + 1))
        out.append('<sheetFormatPr defaultRowHeight="15"/>')
        if self.widths:
            out.append('<cols>')
            for c, w in sorted(self.widths.items()):
                out.append('<col min="%d" max="%d" width="%.2f" customWidth="1"/>'
                           % (c, c, w))
            out.append('</cols>')
        out.append('<sheetData>')
        for ri, row in enumerate(self.rows, 1):
            h = (' ht="%.2f" customHeight="1"' % self.row_heights[ri]
                 if ri in self.row_heights else '')
            out.append('<row r="%d"%s>' % (ri, h))
            for ci, cell in enumerate(row, 1):
                if cell is None:
                    continue
                ref = '%s%d' % (colname(ci), ri)
                if cell.f is not None:
                    cv = ('<v>%s</v>' % esc(cell.cached)
                          if cell.cached is not None else '')
                    out.append('<c r="%s" s="%d"><f>%s</f>%s</c>'
                               % (ref, cell.s, esc(cell.f), cv))
                elif cell.v is None or cell.v == '':
                    if cell.s != S_DEFAULT:
                        out.append('<c r="%s" s="%d"/>' % (ref, cell.s))
                elif cell.num:
                    out.append('<c r="%s" s="%d"><v>%s</v></c>'
                               % (ref, cell.s, esc(cell.v)))
                else:
                    out.append('<c r="%s" s="%d" t="inlineStr"><is><t '
                               'xml:space="preserve">%s</t></is></c>'
                               % (ref, cell.s, esc(cell.v)))
            out.append('</row>')
        out.append('</sheetData>')
        if self.autofilter:
            out.append('<autoFilter ref="%s"/>' % self.autofilter)
        out.append('</worksheet>')
        return ''.join(out)


STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
<font><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
<font><b/><sz val="14"/><name val="Arial"/></font>
<font><sz val="9"/><color rgb="FF595959"/><name val="Arial"/></font>
<font><b/><sz val="10"/><name val="Arial"/></font>
<font><sz val="10"/><color rgb="FF595959"/><name val="Arial"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF231F20"/>
<bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/>
<bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin">
<color rgb="FFD9D9D9"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
</cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1"
 applyFill="1" applyAlignment="1">
 <alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"
 applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1"
 applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"
 applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="9" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"
 applyNumberFormat="1"/>
</cellXfs>
</styleSheet>'''

CONTENT_TYPES = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                 '<Types xmlns="http://schemas.openxmlformats.org/package/'
                 '2006/content-types">'
                 '<Default Extension="rels" ContentType="application/'
                 'vnd.openxmlformats-package.relationships+xml"/>'
                 '<Default Extension="xml" ContentType="application/xml"/>'
                 '<Override PartName="/xl/workbook.xml" ContentType='
                 '"application/vnd.openxmlformats-officedocument.'
                 'spreadsheetml.sheet.main+xml"/>%s'
                 '<Override PartName="/xl/styles.xml" ContentType='
                 '"application/vnd.openxmlformats-officedocument.'
                 'spreadsheetml.styles+xml"/></Types>')

RELS = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/'
        '2006/relationships"><Relationship Id="rId1" Type="http://schemas.'
        'openxmlformats.org/officeDocument/2006/relationships/officeDocument"'
        ' Target="xl/workbook.xml"/></Relationships>')


def write(path, sheets):
    """sheets: list of Sheet, in tab order."""
    overrides = ''.join(
        '<Override PartName="/xl/worksheets/sheet%d.xml" ContentType='
        '"application/vnd.openxmlformats-officedocument.spreadsheetml.'
        'worksheet+xml"/>' % i for i in range(1, len(sheets) + 1))

    wb = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/'
          '2006/main" xmlns:r="http://schemas.openxmlformats.org/'
          'officeDocument/2006/relationships"><sheets>']
    for i, sh in enumerate(sheets, 1):
        wb.append('<sheet name="%s" sheetId="%d" r:id="rId%d"/>'
                  % (esc(sh.name), i, i))
    # fullCalcOnLoad: formulas ship without cached values, so the app must
    # compute them when the file is opened.
    wb.append('</sheets><calcPr calcId="124519" fullCalcOnLoad="1"/></workbook>')

    wbrels = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
              '<Relationships xmlns="http://schemas.openxmlformats.org/'
              'package/2006/relationships">']
    for i in range(1, len(sheets) + 1):
        wbrels.append('<Relationship Id="rId%d" Type="http://schemas.'
                      'openxmlformats.org/officeDocument/2006/relationships/'
                      'worksheet" Target="worksheets/sheet%d.xml"/>' % (i, i))
    wbrels.append('<Relationship Id="rId%d" Type="http://schemas.'
                  'openxmlformats.org/officeDocument/2006/relationships/'
                  'styles" Target="styles.xml"/></Relationships>'
                  % (len(sheets) + 1))

    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', CONTENT_TYPES % overrides)
        z.writestr('_rels/.rels', RELS)
        z.writestr('xl/workbook.xml', ''.join(wb))
        z.writestr('xl/_rels/workbook.xml.rels', ''.join(wbrels))
        z.writestr('xl/styles.xml', STYLES)
        for i, sh in enumerate(sheets, 1):
            z.writestr('xl/worksheets/sheet%d.xml' % i, sh.xml())
