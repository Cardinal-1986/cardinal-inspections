"""Repair docx-js PAGE fields.

docx-js emits begin / instrText / separate / end as four children of a SINGLE
<w:r>, with no result run between separate and end. Word and LibreOffice both
regenerate the field result with default formatting, so a page number styled
8.5pt grey renders large and black.

This rewrites that run as five properly-structured runs, each carrying the
original rPr, including a result run so the styling survives regeneration.
Entry order in the zip is preserved.

The run pattern is BOUNDED with a negative lookahead so it cannot cross a
</w:r>. An earlier unbounded `.*?` inside the rPr group matched from a previous
run and duplicated its text five times.
"""
import re
import shutil
import sys
import zipfile

# one <w:r>…</w:r>, guaranteed not to span a run boundary
RUN = re.compile(r'<w:r>((?:(?!</w:r>).)*?)</w:r>', re.S)
RPR = re.compile(r'^(<w:rPr>(?:(?!</w:rPr>).)*?</w:rPr>)', re.S)
INSTR = re.compile(r'<w:instrText[^>]*>(.*?)</w:instrText>', re.S)
BEGIN = '<w:fldChar w:fldCharType="begin"/>'

captured = []


def expand(m):
    inner = m.group(1)
    if BEGIN not in inner:
        return m.group(0)
    im = INSTR.search(inner)
    if not im:
        return m.group(0)

    pm = RPR.match(inner)
    rpr = pm.group(1) if pm else ''
    instr = im.group(1).strip()
    captured.append((instr, rpr))

    run = lambda x: '<w:r>' + rpr + x + '</w:r>'
    return (
        run(BEGIN)
        + run('<w:instrText xml:space="preserve"> %s </w:instrText>' % instr)
        + run('<w:fldChar w:fldCharType="separate"/>')
        + run('<w:t>1</w:t>')   # result placeholder: renderer overwrites text, keeps rPr
        + run('<w:fldChar w:fldCharType="end"/>')
    )


def main(path):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        blobs = {n: z.read(n) for n in names}

    total = 0
    for n in names:
        if not (n.startswith('word/') and n.endswith('.xml')):
            continue
        try:
            xml = blobs[n].decode('utf-8')
        except UnicodeDecodeError:
            continue
        before = len(captured)
        new = RUN.sub(expand, xml)
        k = len(captured) - before
        if k:
            blobs[n] = new.encode('utf-8')
            total += k
            print('  %-20s %d field(s)' % (n, k))
            for instr, rpr in captured[before:]:
                print('      instr=%r' % instr)
                print('      rPr  =%s' % (rpr[:90] + ('…' if len(rpr) > 90 else '')))

    if not total:
        print('  no malformed PAGE fields found — nothing to do')
        return 0

    tmp = path + '.tmp'
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as out:
        for n in names:                       # preserve original entry order
            out.writestr(n, blobs[n])
    shutil.move(tmp, path)
    print('  rewrote %s (%d total)' % (path, total))
    return total


if __name__ == '__main__':
    main(sys.argv[1])
